const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {START,END,replacePayload,syncDocs}=require('../scripts/sync-docs.cjs');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'typesafe-docs-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const dir of ['src','docs'])fs.mkdirSync(path.join(root,dir));
 fs.copyFileSync(path.join(__dirname,'../src/decisions.cjs'),path.join(root,'src/decisions.cjs'));
 fs.copyFileSync(path.join(__dirname,'../src/direct-actions.cjs'),path.join(root,'src/direct-actions.cjs'));
 fs.copyFileSync(path.join(__dirname,'../docs/example-state.cjs'),path.join(root,'docs/example-state.cjs'));
 fs.copyFileSync(path.join(__dirname,'../docs/example-flag-state.cjs'),path.join(root,'docs/example-flag-state.cjs'));
 fs.writeFileSync(path.join(root,'README.md'),`Intro\n${START}\n${END}\nEnd\n`);
 fs.writeFileSync(path.join(root,'CHANGELOG.md'),'# Changes\n');
 syncDocs(root);return root;
}
test('README regeneration is idempotent and preserves surrounding prose',t=>{const root=fixture(t);assert.equal(syncDocs(root).changed,false);const file=path.join(root,'README.md');const content=fs.readFileSync(file,'utf8');assert.ok(content.startsWith('Intro\n'));assert.ok(content.endsWith('End\n'));fs.writeFileSync(file,content.replace('"jev-latest"','"stale-model"'));assert.equal(syncDocs(root,true).changed,true);assert.ok(fs.readFileSync(file,'utf8').includes('stale-model'));assert.equal(syncDocs(root).changed,true);assert.equal(syncDocs(root,true).changed,false);});
test('missing or duplicate generation markers fail instead of overwriting prose',()=>{assert.throws(()=>replacePayload('no markers','x'));assert.throws(()=>replacePayload(`${START}${START}${END}`,'x'));});
