const {Vec3}=require('vec3');
const {goals}=require('mineflayer-pathfinder');
const {setTimeout:delay}=require('node:timers/promises');
const names=['red_wool','white_wool'];
const vec=p=>new Vec3(p.x,p.y,p.z);
function banks(origin){return [{name:'red_wool',x:origin.x,z:origin.z-19,width:18,depth:13},{name:'white_wool',x:origin.x+20,z:origin.z-19,width:8,depth:13}].flatMap(b=>Array.from({length:b.width*b.depth},(_,i)=>({name:b.name,position:{x:b.x+i%b.width,y:origin.y,z:b.z+Math.floor(i/b.width)}})));}
function inventory(bot){return Object.fromEntries(names.map(name=>[name,bot.inventory.items().filter(i=>i.name===name).reduce((n,i)=>n+i.count,0)]));}
function inside(task,p){return p.x>=task.origin.x-1&&p.x<=task.origin.x+29&&p.z>=task.origin.z-20&&p.z<=task.origin.z-5&&p.y>=task.origin.y-1&&p.y<=task.origin.y+3;}
function drops(bot,task){return Object.values(bot.entities||{}).filter(e=>e.name==='item'&&names.includes(e.getDroppedItem?.()?.name)&&inside(task,e.position));}
function scan(bot,task){const cells=banks(task.origin);return Object.fromEntries(names.map(name=>[name,cells.filter(c=>c.name===name&&bot.blockAt(vec(c.position))?.name===name).length]));}
function candidates(bot,task,required){
 const items=inventory(bot),p=bot.entity.position,result={};
 for(const name of names){const needed=Math.max(0,required[name]-items[name]);
  result[name]=banks(task.origin).filter(c=>c.name===name&&bot.blockAt(vec(c.position))?.name===name&&(!task.failed[JSON.stringify(c.position)]||Date.now()-task.failed[JSON.stringify(c.position)]>30000))
   .sort((a,b)=>vec(a.position).distanceTo(p)-vec(b.position).distanceTo(p)).slice(0,Math.min(8,needed));
 }
 const drop=drops(bot,task).filter(e=>items[e.getDroppedItem().name]<required[e.getDroppedItem().name]).sort((a,b)=>a.position.distanceTo(p)-b.position.distanceTo(p))[0];
 return {...result,droppedWool:drop?{id:drop.id,name:drop.getDroppedItem().name,position:{x:drop.position.x,y:drop.position.y,z:drop.position.z}}:null};
}
async function collect(bot,position,name,before,signal){
 signal.throwIfAborted();
 await bot.pathfinder.goto(new goals.GoalNear(position.x,position.y,position.z,0));
 signal.throwIfAborted();
 const deadline=Date.now()+2500;
 while(inventory(bot)[name]<=before&&Date.now()<deadline)await delay(100,undefined,{signal});
 signal.throwIfAborted();
 if(inventory(bot)[name]<=before)throw new Error('Wool drop was not collected into inventory');
}
async function execute(bot,task,choice,seen,required,signal,onProgress){
 const name={mine_red_wool:'red_wool',mine_white_wool:'white_wool'}[choice];
 if(choice==='collect_wool'){
  const observed=seen.droppedWool,e=bot.entities?.[observed?.id];
  if(!e||!drops(bot,task).includes(e)||e.getDroppedItem().name!==observed.name)return 'unavailable: wool drop changed';
  const before=inventory(bot)[observed.name];
  await collect(bot,e.position,observed.name,before,signal);onProgress();return 'Collected dropped '+observed.name+'; inventory verified';
 }
 const cells=seen[name];if(!cells?.length)return 'unavailable: no wool mining candidates';
 let mined=0;const allowed=banks(task.origin);
 for(const cell of cells.slice(0,8)){
  signal.throwIfAborted();if(inventory(bot)[name]>=required[name])break;
  if(cell.name!==name||!allowed.some(c=>c.name===name&&vec(c.position).equals(vec(cell.position))))throw new Error('Mining target is outside its wool supply area');
  const pos=vec(cell.position);
  try{
   await bot.pathfinder.goto(new goals.GoalLookAtBlock(pos,bot.world,{reach:4}));signal.throwIfAborted();
   const shears=bot.inventory.items().find(i=>i.name==='shears');
   if(shears)await bot.equip(shears,'hand');else await bot.unequip('hand');
   signal.throwIfAborted();const block=bot.blockAt(pos);
   if(block?.name!==name||!bot.canDigBlock(block))throw new Error('Wool mining target changed or is unreachable');
   const before=inventory(bot)[name];await bot.dig(block,true);signal.throwIfAborted();
   if(bot.blockAt(pos)?.name===name)throw new Error('Server did not confirm wool mining');
   task.mined??={red_wool:0,white_wool:0};task.mined[name]++;mined++;
   await collect(bot,pos.offset(.5,0,.5),name,before,signal);onProgress();
  }catch(error){task.failed[JSON.stringify(cell.position)]=Date.now();throw error;}
 }
 return `Mined and collected ${mined} ${name} blocks; inventory verified`;
}
module.exports={banks,inventory,scan,candidates,execute,drops};
