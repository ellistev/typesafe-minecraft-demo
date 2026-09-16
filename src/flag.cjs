const {Vec3}=require('vec3');
const {goals}=require('mineflayer-pathfinder');
const {bounded,cancel}=require('./task.cjs');
const {point}=require('./observe.cjs');
const resources=require('./flag-resources.cjs');
const BUDGET_MS=1500000;
// A symmetric, deliberately pixelated maple leaf, surrounded by a white field.
const LEAF=[
 '......##......',
 '.....####.....',
 '...#.####.#...',
 '...########...',
 '.#.########.#.',
 '.############.',
 '..##########..',
 '...########...',
 '..##########..',
 '.....####.....',
 '......##......',
 '......##......',
 '..............'
];
const WIDTH=26,HEIGHT=13;
const OBJECTIVE='Mine and collect 234 red and 104 white wool from the supply areas, then build and inspect a Canadian flag.';
function blueprint(origin){return LEAF.flatMap((row,z)=>Array.from({length:WIDTH},(_,x)=>{
 const side=x<6||x>=20,leaf=!side&&row[x-6]==='#';
 return {position:{x:origin.x+x,y:origin.y,z:origin.z+z},name:side||leaf?'red_wool':'white_wool',section:side?'red_bars':leaf?'maple_leaf':'white_field'};
}));}
const vec=p=>new Vec3(p.x,p.y,p.z);
function createTask(bot,now=Date.now()){
 const home=point(bot.entity.position);
 const values=process.env.FLAG_ORIGIN?.split(',').map(Number);
 if(values&&(values.length!==3||values.some(n=>!Number.isInteger(n))))throw new Error('FLAG_ORIGIN must be three integer coordinates: x,y,z');
 const origin=values?{x:values[0],y:values[1],z:values[2]}:{x:Math.floor(home.x)+3,y:Math.floor(home.y),z:Math.floor(home.z)-6};
 return {scenario:'flag',home,origin,blueprint:blueprint(origin),startedAt:now,lastProgressAt:now,best:0,bestSupplies:0,mined:{red_wool:0,white_wool:0},inspected:false,failed:{}};
}
function inventory(bot){return Object.fromEntries(['red_wool','white_wool'].map(name=>[name,bot.inventory.items().filter(i=>i.name===name).reduce((n,i)=>n+i.count,0)]));}
function inspectBlueprint(bot,task){
 const correct=[],missing=[],blocked=[],unknown=[];
 for(const cell of task.blueprint){const b=bot.blockAt(vec(cell.position));
   if(!b)unknown.push(cell);
   else if(b.name===cell.name)correct.push(cell);
   else if(b.name==='air'&&bot.blockAt(vec(cell.position).offset(0,-1,0))?.boundingBox==='block')missing.push(cell);
   else blocked.push(cell);
 }
 return {correct,missing,blocked,unknown};
}
function progress(bot,task,now=Date.now()){
 now=task.finishedAt??now;const scan=inspectBlueprint(bot,task);
 if(scan.correct.length>task.best){task.best=scan.correct.length;task.lastProgressAt=now;}
 const required={red_wool:0,white_wool:0};for(const c of [...scan.missing,...scan.blocked,...scan.unknown])required[c.name]++;
 const sections=Object.fromEntries(['red_bars','white_field','maple_leaf'].map(section=>[section,{placed:scan.correct.filter(c=>c.section===section).length,total:task.blueprint.filter(c=>c.section===section).length}]));
 const items=inventory(bot),supplies=scan.correct.length+items.red_wool+items.white_wool;
 if(supplies>(task.bestSupplies||0)){task.bestSupplies=supplies;task.lastProgressAt=now;}
 const needsMaterials=Object.entries(required).some(([name,n])=>items[name]<n);
 const complete=scan.correct.length===task.blueprint.length&&task.inspected;
 return {scenario:'flag',origin:task.origin,home:task.home,target:task.blueprint.length,collected:scan.correct.length,unit:'blocks',stage:complete?'complete':scan.correct.length===task.blueprint.length?'inspect':needsMaterials?'gathering':'building',complete,finished:task.finishedAt!=null,blocked:scan.blocked.length,unloaded:scan.unknown.length,inventory:items,required,needsMaterials,mined:task.mined||{red_wool:0,white_wool:0},supplyRemaining:resources.scan(bot,task),sections,elapsedSeconds:Math.floor((now-task.startedAt)/1000),remainingSeconds:Math.max(0,Math.ceil((BUDGET_MS-now+task.startedAt)/1000))};
}
function stopReason(p,task,now=Date.now()){
 if(p.complete)return 'Complete: Canadian flag built and verified';
 if(p.blocked||p.unloaded)return `Stopped: build site has ${p.blocked} obstructed and ${p.unloaded} unloaded cells. Clear a flat 26 x 13 site before starting.`;
 if(now-task.startedAt>=BUDGET_MS)return 'Stopped: twenty-five-minute flag limit reached';
 if(now-task.lastProgressAt>=90000)return 'Stopped: no gathering or construction progress for 90 seconds';
 return null;
}
function candidates(bot,task){
 const scan=inspectBlueprint(bot,task),items=inventory(bot),p=bot.entity.position;
 const required={red_wool:0,white_wool:0};for(const c of scan.missing)required[c.name]++;
 const gathering=Object.entries(required).some(([name,n])=>items[name]<n);
 const batches={};
 for(const section of ['red_bars','white_field','maple_leaf']){
   batches[section]=(gathering?[]:scan.missing).filter(c=>c.section===section&&items[c.name]>0&&(!task.failed[JSON.stringify(c.position)]||Date.now()-task.failed[JSON.stringify(c.position)]>30000))
    .sort((a,b)=>vec(a.position).distanceTo(p)-vec(b.position).distanceTo(p)).slice(0,4);
 }
 return {...batches,...resources.candidates(bot,task,required),canInspect:scan.correct.length===task.blueprint.length};
}
async function executeTask(bot,task,choice,seen,signal){
 let active;
 try{return await bounded(bot,signal,async()=>{
   if(choice==='wait'){await new Promise(r=>setTimeout(r,1000));return 'waited';}
   if(choice==='inspect_flag'){
     if(inspectBlueprint(bot,task).correct.length!==task.blueprint.length)return 'unavailable: blueprint is incomplete';
     task.inspected=true;return 'Verified all 338 blueprint blocks against the live world';
   }
   if(['mine_red_wool','mine_white_wool','collect_wool'].includes(choice))return resources.execute(bot,task,choice,seen,progress(bot,task).required,signal,()=>progress(bot,task));
   if(progress(bot,task).needsMaterials)return 'unavailable: gather all remaining wool before construction';
   const section={build_red_bars:'red_bars',build_white_field:'white_field',build_maple_leaf:'maple_leaf'}[choice];
   const cells=seen[section];if(!cells?.length)return 'unavailable: no candidate blocks in this section';
   let placed=0;
   for(const cell of cells){
     signal.throwIfAborted();active=cell;
     const pos=vec(cell.position);
     if(bot.blockAt(pos)?.name===cell.name)continue;
     if(bot.blockAt(pos)?.name!=='air')throw new Error('Target is obstructed; no blocks were removed');
     await bot.pathfinder.goto(new goals.GoalPlaceBlock(pos,bot.world,{range:4,faces:[new Vec3(0,-1,0)]}));
     signal.throwIfAborted();
     const item=bot.inventory.items().find(i=>i.name===cell.name);
     if(!item)throw new Error(`Missing ${cell.name}`);
     await bot.equip(item,'hand');signal.throwIfAborted();
     const reference=bot.blockAt(pos.offset(0,-1,0));
     if(bot.blockAt(pos)?.name!=='air'||reference?.boundingBox!=='block')throw new Error('Placement site changed');
     await bot.placeBlock(reference,new Vec3(0,1,0));signal.throwIfAborted();
     if(bot.blockAt(pos)?.name!==cell.name)throw new Error('Server did not confirm the expected block');
     placed++;progress(bot,task);
   }
   return `Placed and verified ${placed} ${section.replaceAll('_',' ')} blocks`;
 });}catch(error){if(active)task.failed[JSON.stringify(active.position)]=Date.now();if(signal.aborted)throw error;return `action failed: ${error.message}`;}
 finally{cancel(bot);}
}
module.exports={BUDGET_MS,OBJECTIVE,WIDTH,HEIGHT,LEAF,blueprint,createTask,progress,stopReason,candidates,executeTask,inspectBlueprint};
