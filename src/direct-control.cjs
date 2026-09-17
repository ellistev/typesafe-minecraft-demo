const {Vec3}=require('vec3');
const {setTimeout:delay}=require('node:timers/promises');
const {inspect,point}=require('./observe.cjs');
const {bounded,cancel,LOG}=require('./task.cjs');
const flag=require('./flag.cjs');
const resources=require('./flag-resources.cjs');
const {actions,instructions}=require('./direct-actions.cjs');
const vec=p=>new Vec3(p.x,p.y,p.z);
function relative(bot,p){const d=vec(p).minus(bot.entity.position),y=bot.entity.yaw;return {distance:+d.norm().toFixed(2),forward:+(-Math.sin(y)*d.x-Math.cos(y)*d.z).toFixed(2),right:+(Math.cos(y)*d.x-Math.sin(y)*d.z).toFixed(2)};}
function movementSafe(bot,choice){const offsets={forward:0,jump_forward:0,backward:Math.PI,left:Math.PI/2,right:-Math.PI/2};if(!(choice in offsets))return false;return [.35,.7,1.1].every(d=>{const s=inspect(bot,bot.entity.yaw+offsets[choice],d).status;return s==='clear'||s==='one_block_descent'||(choice==='jump_forward'&&s==='one_block_rise');});}
function targets(bot,task){
 if(task.scenario==='flag'){
  const p=flag.progress(bot,task),r=resources.candidates(bot,task,p.required),scan=flag.inspectBlueprint(bot,task);
  return {mining:[...r.red_wool,...r.white_wool],placing:p.needsMaterials?[]:scan.missing,drops:resources.drops(bot,task).filter(e=>p.inventory[e.getDroppedItem().name]<p.required[e.getDroppedItem().name]).map(e=>({position:point(e.position),name:e.getDroppedItem().name})),canInspect:scan.correct.length===338};
 }
 const mining=bot.findBlocks({matching:b=>LOG.test(b.name),maxDistance:24,count:24}).filter(p=>!(p.y<bot.entity.position.y&&p.x===Math.floor(bot.entity.position.x)&&p.z===Math.floor(bot.entity.position.z))).map(p=>({position:point(p),name:bot.blockAt(p).name}));
 return {mining,placing:[],drops:Object.values(bot.entities).filter(e=>e.name==='item'&&LOG.test(e.getDroppedItem?.()?.name||'')).map(e=>({position:point(e.position),name:e.getDroppedItem().name})),canInspect:false};
}
const same=(a,b)=>a&&b&&a.x===b.x&&a.y===b.y&&a.z===b.z;
function crosshair(bot){
 if(!bot.world?.raycast)return bot.blockAtCursor(4.5);
 const {position,yaw,pitch}=bot.entity,cos=Math.cos(pitch);
 return bot.world.raycast(position.offset(0,bot.entity.eyeHeight||1.62,0),new Vec3(-Math.sin(yaw)*cos,Math.sin(pitch),-Math.cos(yaw)*cos),4.5);
}
function placementAim(cell){return vec(cell.position).offset(.5,.01,.5);}
function placementSight(bot,cell){
 const eye=bot.entity.position.offset(0,bot.entity.eyeHeight||1.62,0),delta=placementAim(cell).minus(eye);
 const yaw=Math.atan2(-delta.x,-delta.z),pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));
 const alreadyAimed=Math.abs(Math.atan2(Math.sin(yaw-bot.entity.yaw),Math.cos(yaw-bot.entity.yaw)))<.02&&Math.abs(pitch-bot.entity.pitch)<.02;
 // Match Mineflayer look() mouse-sensitivity rounding before testing visibility.
 const step=-.15*Math.PI/180;
 const actualYaw=bot.entity.yaw+Math.round((yaw-bot.entity.yaw)/step)*step;
 const actualPitch=bot.entity.pitch+Math.round((pitch-bot.entity.pitch)/step)*step;
 const cos=Math.cos(actualPitch),direction=new Vec3(-Math.sin(actualYaw)*cos,Math.sin(actualPitch),-Math.cos(actualYaw)*cos);
 const distance=delta.norm();
 const hit=distance<=4.5&&bot.world?.raycast?bot.world.raycast(eye,direction,4.5):null;
 return {alreadyAimed,visible:!!hit&&same(hit.position,vec(cell.position).offset(0,-1,0))};
}
function overlapsPlayer(bot,cell){const p=bot.entity.position,c=cell.position;return p.x+.3>c.x&&p.x-.3<c.x+1&&p.z+.3>c.z&&p.z-.3<c.z+1&&p.y<c.y+1&&p.y+1.8>c.y;}
function aimedPlacement(bot,cells){const hit=crosshair(bot);if(!hit)return null;return cells.find(c=>same(hit.position,vec(c.position).offset(0,-1,0))&&!overlapsPlayer(bot,c))||null;}
function observeDirect(bot,task){
 const all=targets(bot,task),sort=a=>a.map(c=>({...c,...relative(bot,c.approachPosition||c.position)})).sort((a,b)=>a.distance-b.distance).slice(0,2);
 all.drops=all.drops.map(c=>({...c,approachPosition:{x:Math.floor(c.position.x)+.5,y:c.position.y,z:Math.floor(c.position.z)+.5}}));
 const openPlacements=all.placing.filter(c=>!overlapsPlayer(bot,c));
 const candidates=(openPlacements.length?openPlacements:all.placing).map(c=>({...c,...placementSight(bot,c),blockedByPlayer:overlapsPlayer(bot,c),approachPosition:{x:c.position.x+.5,y:c.position.y,z:c.position.z+.5}}));
 const visible=candidates.filter(c=>c.visible);
 const placementTargets=sort(visible.length?visible:candidates);
 const hit=crosshair(bot),mine=hit&&all.mining.find(c=>same(c.position,hit.position)&&c.name===hit.name),place=aimedPlacement(bot,all.placing);
 return {miningTargets:sort(all.mining),placementTargets,aimedPlacement:place?{position:place.position,name:place.name}:null,drops:sort(all.drops),home:relative(bot,task.home),heldItem:bot.heldItem?.name||null,crosshair:hit?{position:point(hit.position),name:hit.name}:null,canMine:!!mine,canPlace:!!place&&bot.heldItem?.name===place.name,canInspect:all.canInspect,movementSafe:Object.fromEntries(['forward','backward','left','right','jump_forward'].map(k=>[k,movementSafe(bot,k)]))};
}
async function execute(bot,task,choice,seen,signal){
 try{return await bounded(bot,signal,async()=>{
  signal.throwIfAborted();
  if(['forward','backward','left','right','jump_forward'].includes(choice)){
   if(!movementSafe(bot,choice))return 'veto: movement is obstructed, hazardous or unloaded';
   const control=choice==='jump_forward'?'forward':choice==='backward'?'back':choice;bot.setControlState(control,true);if(choice==='jump_forward')bot.setControlState('jump',true);
   for(let i=0;i<5;i++){await delay(50,undefined,{signal});if(!movementSafe(bot,choice))break;}
   return 'executed one movement pulse';
  }
  if(choice==='turn_left'||choice==='turn_right'){await bot.look(bot.entity.yaw+(choice==='turn_left'?1:-1)*Math.PI/6,bot.entity.pitch,true);signal.throwIfAborted();return 'turned 30 degrees';}
  if(choice.startsWith('aim_')){
   if(choice.startsWith('aim_drop_')){
    const cell=seen.drops?.[Number(choice.slice(-1))];
    if(!cell)return 'unavailable: no drop target';
    const live=targets(bot,task).drops.find(d=>d.name===cell.name&&vec(d.position).distanceTo(vec(cell.position))<1);
    if(!live)return 'unavailable: drop changed';
    const approach=new Vec3(Math.floor(live.position.x)+.5,live.position.y,Math.floor(live.position.z)+.5);
    await bot.lookAt(approach.offset(0,.2,0),true);signal.throwIfAborted();return 'faced drop approach point only; choose movement to collect';
   }
   const mining=choice.startsWith('aim_mine'),cell=(mining?seen.miningTargets:seen.placementTargets)[Number(choice.slice(-1))];
   if(!cell)return 'unavailable: no target';
   await bot.lookAt(mining?vec(cell.position).offset(.5,.5,.5):placementAim(cell),true);signal.throwIfAborted();return 'aimed only; no movement or interaction';
  }
  if(choice.startsWith('equip_')){const name=choice.slice(6),item=bot.inventory.items().find(i=>i.name===name);if(!item)return 'unavailable: item absent';await bot.equip(item,'hand');signal.throwIfAborted();return 'equipped '+name;}
  if(choice==='mine'){
   const all=targets(bot,task),hit=crosshair(bot);
   if(!hit||!all.mining.some(c=>same(c.position,hit.position)&&c.name===hit.name)||!bot.canDigBlock(hit))return 'unavailable: crosshair is not an eligible mining target';
   await bot.dig(hit,'ignore');signal.throwIfAborted();
   if(bot.blockAt(hit.position)?.name===hit.name)return 'mining not confirmed';
   if(task.scenario==='flag')task.mined[hit.name]++;
   return 'mined one '+hit.name+'; walk over its drop to collect';
  }
  if(choice==='place'){
   const cell=aimedPlacement(bot,targets(bot,task).placing);
   if(!cell||bot.heldItem?.name!==cell.name)return 'unavailable: aim or held wool does not match an eligible blueprint cell';
   const reference=bot.blockAt(vec(cell.position).offset(0,-1,0));
   if(reference?.boundingBox!=='block'||bot.blockAt(vec(cell.position))?.name!=='air')return 'unavailable: placement changed';
   await bot._placeBlockWithOptions(reference,new Vec3(0,1,0),{forceLook:'ignore',swingArm:'right'});signal.throwIfAborted();
   return bot.blockAt(vec(cell.position))?.name===cell.name?'placed and verified one '+cell.name:'placement not confirmed';
  }
  if(choice==='inspect_flag'){if(task.scenario!=='flag'||!targets(bot,task).canInspect)return 'unavailable: flag incomplete';task.inspected=true;return 'verified all 338 flag cells';}
  if(choice==='wait'){await delay(250,undefined,{signal});return 'waited';}
  throw new Error('Unknown direct action');
 });}catch(error){if(signal.aborted)throw error;return 'action failed: '+error.message;}finally{cancel(bot);}
}
module.exports={actions,instructions,observeDirect,execute,movementSafe,relative,overlapsPlayer,placementSight,crosshair};
