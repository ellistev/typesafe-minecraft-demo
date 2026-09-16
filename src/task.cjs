const { Vec3 } = require('vec3');
const { Movements, goals } = require('mineflayer-pathfinder');
const { point } = require('./observe.cjs');
const LOG = /^(oak|spruce|birch|jungle|acacia|dark_oak|mangrove|cherry|pale_oak)_log$/;
const OBJECTIVE = 'Find trees, collect 10 new logs, then return to the starting position.';
const logCount = bot => bot.inventory.items().filter(i => LOG.test(i.name)).reduce((n,i)=>n+i.count,0);
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
function createTask(bot, now = Date.now()) {
  return { home:point(bot.entity.position), target:10, baseline:logCount(bot), startedAt:now, lastProgressAt:now, bestCollected:0, bestHomeDistance:Infinity, visited:[], failed:{}, harvested:0 };
}
function progress(bot, task, now = Date.now()) {
  now = task.finishedAt ?? now;
  const collected = Math.max(0,logCount(bot)-task.baseline);
  const homeDistance = distance(bot.entity.position,task.home);
  if(collected>task.bestCollected || (collected>=task.target && homeDistance<task.bestHomeDistance-.5)) {
    task.lastProgressAt=now; task.bestCollected=Math.max(task.bestCollected,collected); task.bestHomeDistance=homeDistance;
  }
  const complete=collected>=task.target&&homeDistance<=2;
  return {home:task.home,target:task.target,collected,homeDistance:+homeDistance.toFixed(1),stage:complete?'complete':collected>=task.target?'returning':'gathering',complete,finished:task.finishedAt!=null,elapsedSeconds:Math.floor((now-task.startedAt)/1000),remainingSeconds:Math.max(0,Math.ceil((300000-now+task.startedAt)/1000))};
}
function stopReason(p, task, now = Date.now()) {
  if(p.complete)return 'Complete: collected 10 new logs and returned home';
  if(now-task.startedAt>=300000)return 'Stopped: five-minute limit reached';
  if(now-task.lastProgressAt>=90000)return 'Stopped: no inventory or return progress for 90 seconds';
  return null;
}
function configure(bot) {
  const moves = new Movements(bot);
  moves.canDig=true; moves.allow1by1towers=false; moves.allowParkour=false; moves.allowSprinting=false; moves.maxDropDown=2; moves.infiniteLiquidDropdownDistance=false; moves.scafoldingBlocks=[];
  // Navigation may clear foliage; only the selected harvest action can break logs.
  for(const block of bot.registry.blocksArray)if(!block.name.endsWith('_leaves'))moves.blocksCantBreak.add(block.id);
  for(const name of ['water','lava','fire','cactus','magma_block','powder_snow','campfire','sweet_berry_bush']) if(bot.registry.blocksByName[name]) moves.blocksToAvoid.add(bot.registry.blocksByName[name].id);
  bot.pathfinder.setMovements(moves); bot.pathfinder.thinkTimeout=1500; bot.pathfinder.searchRadius=32;
}
const v = p => new Vec3(p.x,p.y,p.z);
const harvestGoal = (bot,p) => new goals.GoalLookAtBlock(v(p),bot.world,{reach:4.0});
function candidates(bot, task) {
  const available = p => !task.failed[`${p.x},${p.y},${p.z}`] || Date.now()-task.failed[`${p.x},${p.y},${p.z}`]>45000;
  const reachable = goal => bot.pathfinder.getPathTo(bot.pathfinder.movements,goal,100).status==='success';
  const logs = bot.findBlocks({matching:b=>LOG.test(b.name),maxDistance:24,count:24}).filter(available)
    .filter(p=>!(Math.floor(bot.entity.position.x)===p.x&&Math.floor(bot.entity.position.z)===p.z&&p.y<bot.entity.position.y))
    .sort((a,b)=>distance(a,bot.entity.position)-distance(b,bot.entity.position));
  const targets=[];
  for(const p of logs) { if(reachable(harvestGoal(bot,p)))targets.push({position:point(p),name:bot.blockAt(p).name,distance:+distance(p,bot.entity.position).toFixed(1)}); if(targets.length===2)break; }
  const drops=Object.values(bot.entities).filter(e=>e.name==='item'&&LOG.test(e.getDroppedItem?.()?.name||'')&&distance(e.position,bot.entity.position)<24&&available(e.position.floored())).sort((a,b)=>distance(a.position,bot.entity.position)-distance(b.position,bot.entity.position));
  const drop=drops.find(e=>reachable(new goals.GoalNear(e.position.x,e.position.y,e.position.z,1)));
  let frontier=null;
  for(const p of bot.findBlocks({matching:b=>['grass_block','dirt'].includes(b.name),maxDistance:20,count:160})) {
    const feet=p.offset(0,1,0); const d=distance(feet,bot.entity.position);
    if(d<5||d>16||!available(feet)||task.visited.some(old=>distance(old,feet)<4))continue;
    if(bot.blockAt(feet)?.boundingBox!=='empty'||bot.blockAt(feet.offset(0,1,0))?.boundingBox!=='empty')continue;
    if(reachable(new goals.GoalBlock(feet.x,feet.y,feet.z))) {frontier=point(feet);break;}
  }
  return { logs:targets, droppedLog:drop?{id:drop.id,position:point(drop.position)}:null, exploreDestination:frontier };
}
function cancel(bot) { bot.pathfinder?.setGoal(null); bot.stopDigging(); bot.clearControlStates(); }
async function bounded(bot, signal, work) {
  signal.throwIfAborted();
  let rejectAbort;
  const onAbort=()=>{cancel(bot);rejectAbort(signal.reason||new Error('Cancelled'));};
  const aborted=new Promise((_,reject)=>{rejectAbort=reject;});
  signal.addEventListener('abort',onAbort,{once:true});
  try{return await Promise.race([Promise.resolve().then(()=>{signal.throwIfAborted();return work();}),aborted]);}
  finally{signal.removeEventListener('abort',onAbort);}
}
async function executeTask(bot,task,choice,seen,signal) {
  let target;
  try {
    return await bounded(bot,signal,async()=>{
      if(choice==='wait'){await new Promise(r=>setTimeout(r,1000));signal.throwIfAborted();return 'waited';}
      if(choice==='return_home') {target=task.home;await bot.pathfinder.goto(new goals.GoalNear(target.x,target.y,target.z,1));return 'reached home';}
      if(choice==='explore') {target=seen.exploreDestination;if(!target)return 'unavailable: no reachable exploration destination';await bot.pathfinder.goto(new goals.GoalBlock(target.x,target.y,target.z));task.visited.push(target);return 'explored new ground';}
      if(choice==='pickup') {target=seen.droppedLog?.position;if(!target)return 'unavailable: no reachable dropped log';await bot.pathfinder.goto(new goals.GoalNear(target.x,target.y,target.z,0));await new Promise(r=>setTimeout(r,600));return 'visited dropped log';}
      target=seen.logs[choice==='harvest_alternative'?1:0]?.position;
      if(!target)return 'unavailable: no reachable log';
      await bot.pathfinder.goto(harvestGoal(bot,target));signal.throwIfAborted();
      const block=bot.blockAt(v(target));
      if(!block||!LOG.test(block.name)||!bot.canDigBlock(block))return 'target changed or cannot be mined';
      await bot.dig(block,true);signal.throwIfAborted();task.harvested++;
      await new Promise(r=>setTimeout(r,500));return `mined ${block.name}; inventory verifies collection`;
    });
  } catch(error) {
    if(target) task.failed[`${Math.floor(target.x)},${Math.floor(target.y)},${Math.floor(target.z)}`]=Date.now();
    if(signal.aborted)throw error;
    return `action failed: ${error.message}`;
  } finally {cancel(bot);}
}
module.exports={OBJECTIVE,LOG,logCount,createTask,progress,stopReason,configure,candidates,executeTask,bounded,cancel};
