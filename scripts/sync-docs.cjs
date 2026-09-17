const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const START = '<!-- typesafe-payload:start -->';
const END = '<!-- typesafe-payload:end -->';

function renderPayload(root = ROOT) {
  const { requestFor } = require(path.join(root, 'src/decisions.cjs'));
  const asDirect = original => {
    const {candidates,...state}=original;
    return {...state,recentActions:[],controlMode:'direct',direct:{miningTargets:[{name:state.scenario==='flag'?'red_wool':'oak_log',position:{x:15,y:64,z:28},distance:3,forward:3,right:0}],placementTargets:[],drops:[],heldItem:null,crosshair:null,canMine:false,canPlace:false,canInspect:false,movementSafe:{forward:true,backward:true,left:true,right:true,jump_forward:true}}};
  };
  const state = asDirect(require(path.join(root, 'docs/example-state.cjs')));
  const flagState = asDirect(require(path.join(root, 'docs/example-flag-state.cjs')));
  return '**Lumber Run (synthetic)**\n\n```json\n' + JSON.stringify(requestFor(state), null, 2) + '\n```\n\n**Canadian Flag (synthetic)**\n\n```json\n' + JSON.stringify(requestFor(flagState),null,2) + '\n```';
}
function replacePayload(readme, payload) {
  const start = readme.indexOf(START), end = readme.indexOf(END);
  if (start < 0 || end <= start || readme.indexOf(START, start + START.length) >= 0 || readme.indexOf(END, end + END.length) >= 0) {
    throw new Error('README must contain exactly one ordered pair of TypeSafe payload markers.');
  }
  return readme.slice(0, start + START.length) + '\n\n' + payload + '\n\n' + readme.slice(end);
}
function syncDocs(root = ROOT, check = false) {
  const file = path.join(root, 'README.md');
  const before = fs.readFileSync(file, 'utf8');
  const after = replacePayload(before, renderPayload(root));
  const changed = before !== after;
  if (changed && !check) fs.writeFileSync(file, after);
  return { changed };
}
if (require.main === module) {
  try {
    const check = process.argv.includes('--check');
    const { changed } = syncDocs(ROOT, check);
    if (check && changed) { console.error('README payload is stale. Run npm run docs:sync.'); process.exitCode = 1; }
    else console.log(changed ? 'Updated README payload from source.' : 'README payload matches source.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { ROOT, START, END, renderPayload, replacePayload, syncDocs };
