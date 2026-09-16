const fs=require('node:fs');
const path=require('node:path');
const {Vec3}=require('vec3');
const {setTimeout:delay}=require('node:timers/promises');
const flag=require('./flag.cjs');
// Opt-in adapter for the isolated local demo. Never accepts commands from HTTP/model output.
function resetCommands(origin,username,port,host){
 if(port!==25576||!['127.0.0.1','localhost'].includes(host)||origin.x!==64||origin.y!==64||origin.z!==64||username!=='TypeSafeExplorer')throw new Error('Automatic reset is restricted to the configured isolated flag demo.');
 return [
  'tp TypeSafeExplorer 61.5 64 70.5',
  'fill 64 64 64 89 64 76 minecraft:air replace minecraft:red_wool',
  'fill 64 64 64 89 64 76 minecraft:air replace minecraft:white_wool',
  'clear TypeSafeExplorer minecraft:red_wool',
  'clear TypeSafeExplorer minecraft:white_wool',
  'give TypeSafeExplorer minecraft:red_wool 234',
  'give TypeSafeExplorer minecraft:white_wool 104'
 ];
}
function shouldStartFresh(task,p,budgetMs,now=Date.now()){return !task||task.finishedAt!=null||p?.complete||now-task.startedAt>=budgetMs;}
function assertResetSite(bot,task){
 for(const cell of task.blueprint){const p=new Vec3(cell.position.x,cell.position.y,cell.position.z),b=bot.blockAt(p);
  if(!b||!['air','red_wool','white_wool'].includes(b.name)||bot.blockAt(p.offset(0,-1,0))?.boundingBox!=='block')throw new Error('Reset stopped: the flag site contains an obstruction or missing support.');
 }
}
async function resetFlag(bot,task,{port,host,enabled=process.env.FLAG_DEMO_RESET==='1',commandFile=path.resolve(__dirname,'../runtime/server-command.txt')}={}){
 if(!enabled){if(flag.progress(bot,task).collected===338)throw new Error('Flag replay requires the isolated demo reset adapter (FLAG_DEMO_RESET=1).');return;}
 const commands=resetCommands(task.origin,bot.username,port,host);
 assertResetSite(bot,task);
 // Exclusive creation avoids overwriting an operator command already waiting for the wrapper.
 fs.writeFileSync(commandFile,commands.join('\n')+'\n',{flag:'wx'});
 const deadline=Date.now()+10000;
 while(Date.now()<deadline){
  await delay(200);
  const p=flag.progress(bot,task);
  if(!fs.existsSync(commandFile)&&p.collected===0&&p.blocked===0&&p.unloaded===0&&p.inventory.red_wool===234&&p.inventory.white_wool===104&&bot.entity.position.distanceTo(new Vec3(61.5,64,70.5))<.5)return;
 }
 if(fs.existsSync(commandFile)&&fs.readFileSync(commandFile,'utf8')===commands.join('\n')+'\n')fs.unlinkSync(commandFile);
 throw new Error('Flag reset was not confirmed within 10 seconds. Check the local demo server wrapper.');
}
module.exports={resetCommands,shouldStartFresh,assertResetSite,resetFlag};
