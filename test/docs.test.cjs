const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {START,END,replacePayload,syncDocs}=require('../scripts/sync-docs.cjs');
const {handle,snapshot}=require('../scripts/docs-hook.cjs');
const {config}=require('../scripts/install-doc-hooks.cjs');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'typesafe-docs-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const dir of ['src','docs'])fs.mkdirSync(path.join(root,dir));
 fs.copyFileSync(path.join(__dirname,'../src/decisions.cjs'),path.join(root,'src/decisions.cjs'));
 fs.copyFileSync(path.join(__dirname,'../docs/example-state.cjs'),path.join(root,'docs/example-state.cjs'));
 fs.copyFileSync(path.join(__dirname,'../docs/example-flag-state.cjs'),path.join(root,'docs/example-flag-state.cjs'));
 fs.writeFileSync(path.join(root,'README.md'),`Intro\n${START}\n${END}\nEnd\n`);
 fs.writeFileSync(path.join(root,'CHANGELOG.md'),'# Changes\n');
 syncDocs(root);return root;
}
const event=(root,hook,extra={})=>({session_id:'test-session',cwd:root,hook_event_name:hook,...extra});
test('README regeneration is idempotent and preserves surrounding prose',t=>{const root=fixture(t);assert.equal(syncDocs(root).changed,false);const file=path.join(root,'README.md');const content=fs.readFileSync(file,'utf8');assert.ok(content.startsWith('Intro\n'));assert.ok(content.endsWith('End\n'));fs.writeFileSync(file,content.replace('"jev-latest"','"stale-model"'));assert.equal(syncDocs(root,true).changed,true);assert.ok(fs.readFileSync(file,'utf8').includes('stale-model'));assert.equal(syncDocs(root).changed,true);assert.equal(syncDocs(root,true).changed,false);});
test('missing or duplicate generation markers fail instead of overwriting prose',()=>{assert.throws(()=>replacePayload('no markers','x'));assert.throws(()=>replacePayload(`${START}${START}${END}`,'x'));});
test('read-only turns do not request documentation churn',t=>{const root=fixture(t);handle(event(root,'UserPromptSubmit'),root);assert.deepEqual(handle(event(root,'Stop'),root),{});});
test('changed source without changelog requests one continuation and does not loop',t=>{const root=fixture(t);handle(event(root,'UserPromptSubmit'),root);fs.writeFileSync(path.join(root,'src/new.cjs'),'module.exports = 1;');assert.equal(handle(event(root,'Stop'),root).decision,'block');handle(event(root,'UserPromptSubmit'),root);const second=handle(event(root,'Stop',{stop_hook_active:true}),root);assert.equal(second.decision,undefined);assert.match(second.systemMessage,/unresolved/);});
test('changelog completion satisfies the hook',t=>{const root=fixture(t);handle(event(root,'UserPromptSubmit'),root);fs.writeFileSync(path.join(root,'src/new.cjs'),'// changed');fs.appendFileSync(path.join(root,'CHANGELOG.md'),'Implemented change; tests passed; README reviewed.\n');assert.deepEqual(handle(event(root,'Stop'),root),{});});
test('private files are excluded and other workspaces are ignored',t=>{const root=fixture(t);const before=snapshot(root);fs.writeFileSync(path.join(root,'.env'),'PRIVATE=test');fs.mkdirSync(path.join(root,'memory'));fs.writeFileSync(path.join(root,'memory/note.md'),'private');assert.deepEqual(snapshot(root),before);assert.deepEqual(handle(event(path.dirname(root),'Stop'),root),{});});
test('hook subprocess speaks JSON and bootstraps from a project subdirectory',()=>{const handler=config.hooks.Stop[0].hooks[0];const bootstrap=handler.command.slice('node -e "'.length,-1);const r=spawnSync(process.execPath,['-e',bootstrap],{cwd:path.join(__dirname,'../src'),input:JSON.stringify({hook_event_name:'Unrelated',session_id:'test'}),encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout),{});});
