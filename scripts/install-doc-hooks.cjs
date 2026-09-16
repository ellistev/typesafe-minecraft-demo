// Creates only project-local hook configuration. It never grants hook trust.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const bootstrap = "const f=require('node:fs'),p=require('node:path');let d=process.cwd();for(;;){const j=p.join(d,'package.json');if(f.existsSync(j)&&JSON.parse(f.readFileSync(j,'utf8')).name==='typesafe-minecraft-demo'){require(p.join(d,'scripts/docs-hook.cjs')).main();break;}const n=p.dirname(d);if(n===d){process.stdout.write('{}');break;}d=n;}";
const command = `node -e "${bootstrap}"`;
const handler = {type:'command',command,timeout:15,statusMessage:'Keeping project documentation current'};
const config = {description:'Local README payload synchronization and documentation completion reminder.',hooks:{UserPromptSubmit:[{hooks:[handler]}],Stop:[{hooks:[handler]}]}};
function install() {
  const dir=path.join(root,'.codex');fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'hooks.json');
  if(fs.existsSync(file) && fs.readFileSync(file,'utf8')!==JSON.stringify(config,null,2)+'\n') throw new Error('Existing hook configuration differs; review and merge instead of overwriting.');
  fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n');
  const toml=path.join(dir,'config.toml');
  if(!fs.existsSync(toml))fs.writeFileSync(toml,'# Project-local hooks are defined in hooks.json. No global settings are changed.\n');
  console.log('Project hooks written. Review/trust their definitions in Codex /hooks before use.');
}
if(require.main===module)install();
module.exports = {config};
