const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { syncDocs, ROOT } = require('./sync-docs.cjs');
const digest = value => createHash('sha256').update(value).digest('hex');
// Explicit public inputs only. Never scan .env, memory, transcripts or game data.
const roots = ['src', 'public', 'scripts', 'test', 'docs', '.github'];
const files = ['package.json','package-lock.json','.gitignore','.env.example','AGENTS.md','CONTRIBUTING.md','SECURITY.md','.codex/hooks.json','.codex/config.toml'];

function snapshot(root) {
  const result = {};
  function visit(relative) {
    const file = path.join(root,relative);
    if (!fs.existsSync(file)) return;
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) return;
    if (stat.isDirectory()) for (const name of fs.readdirSync(file).sort()) visit(path.join(relative,name));
    else if(stat.isFile()) result[relative.replaceAll('\\','/')] = digest(fs.readFileSync(file));
  }
  for (const name of [...roots,...files]) visit(name);
  return result;
}
function changelogHash(root) {
  const file = path.join(root,'CHANGELOG.md');
  return fs.existsSync(file) ? digest(fs.readFileSync(file)) : null;
}
function handle(event, root = ROOT) {
  if (!['UserPromptSubmit','Stop'].includes(event.hook_event_name) || !event.session_id) return {};
  const relative = path.relative(root,path.resolve(event.cwd || root));
  if(relative === '..' || relative.startsWith('..'+path.sep) || path.isAbsolute(relative)) return {};
  const dir = path.join(root,'runtime/doc-hooks');
  fs.mkdirSync(dir,{recursive:true});
  const file = path.join(dir,digest(event.session_id)+'.json');
  const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file,'utf8')) : null;
  if(event.hook_event_name === 'UserPromptSubmit') {
    // Preserve the original baseline during an automatic Stop continuation.
    if(!previous?.pending) fs.writeFileSync(file,JSON.stringify({files:snapshot(root),changelog:changelogHash(root)}));
    return {};
  }
  const generated = syncDocs(root);
  const current = snapshot(root);
  const changed = previous && Object.keys({...previous.files,...current}).some(k=>previous.files[k] !== current[k]);
  const missingReview = changed && previous.changelog === changelogHash(root);
  if(missingReview && !event.stop_hook_active && !previous.pending) {
    fs.writeFileSync(file,JSON.stringify({...previous,pending:true}));
    return {decision:'block',reason:'Project work changed. Before finishing, follow AGENTS.md: review/update README.md and affected docs, add a CHANGELOG.md entry describing the change and actual validation (or note README prose was reviewed and remains accurate), and run npm test plus npm run docs:check. The generated README payload has already been synchronized. Do not claim unverified gameplay or perform unrelated work.'};
  }
  // Replace only our own bookkeeping, without deleting unrelated local files.
  fs.writeFileSync(file,JSON.stringify({files:current,changelog:changelogHash(root)}));
  if(missingReview) return {systemMessage:'Documentation reminder remains unresolved after one continuation. Review README and CHANGELOG before treating the work as complete.'};
  return generated.changed ? {systemMessage:'Updated the README TypeSafe payload from source.'} : {};
}
async function main() {
  let input='';
  for await (const chunk of process.stdin) input+=chunk;
  try { process.stdout.write(JSON.stringify(handle(JSON.parse(input)))); }
  catch(error) { process.stdout.write(JSON.stringify({systemMessage:`Documentation hook failed: ${error.message}. Run npm run docs:sync and review docs manually.`})); process.exitCode=1; }
}
if(require.main === module) main();
module.exports = { handle, snapshot, main };
