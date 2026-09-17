const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Vec3}=require('vec3');
const direct=require('../src/direct-control.cjs');
const {requestFor}=require('../src/decisions.cjs');
function bot(){return {entity:{position:new Vec3(.5,64,.5),yaw:0,pitch:0},blockAt:p=>({name:p.y<64?'stone':'air',boundingBox:p.y<64?'block':'empty'}),setControlState:()=>{},clearControlStates:()=>{},stopDigging:()=>{},pathfinder:{setGoal:()=>{},goto:()=>{throw new Error('Pathfinding forbidden');}},look:async()=>{},lookAt:async()=>{},inventory:{items:()=>[]}};}
test('direct payload exposes movement and single interactions, never batch choices',()=>{
 const r=requestFor({controlMode:'direct',scenario:'flag'});assert.ok(r.questions.movement.criteria.forward);assert.ok(r.questions.movement.criteria.mine);assert.equal(r.questions.movement.criteria.mine_red_wool,undefined);
});
test('relative right agrees with Minecraft strafe direction at every cardinal heading',()=>{
 const b=bot();b.entity.position=new Vec3(0,64,0);
 for(const [yaw,right,forward] of [[0,[1,0],[0,-1]],[Math.PI/2,[0,-1],[-1,0]],[Math.PI,[-1,0],[0,1]],[-Math.PI/2,[0,1],[1,0]]]){
  b.entity.yaw=yaw;
  assert.equal(direct.relative(b,{x:right[0],y:64,z:right[1]}).right,1);
  assert.equal(direct.relative(b,{x:-right[0],y:64,z:-right[1]}).right,-1);
  assert.equal(direct.relative(b,{x:forward[0],y:64,z:forward[1]}).forward,1);
 }
});

test('occluded build choices expose step distances for the observed seven-gap loop',()=>{
 const state={controlMode:'direct',task:{stage:'building'},direct:{placementTargets:[{forward:-.58,right:-2.4,visible:false},{forward:5.99,right:0,visible:false}],movementSafe:{forward:true,backward:true,left:true,right:true},canPlace:false}};
 const choices=requestFor(state).questions.movement.criteria;
 assert.equal(choices.left.currentHorizontalDistance,2.47);
 assert.equal(choices.left.estimatedHorizontalDistanceAfterPulse,1.52);
 assert.equal(choices.right.estimatedHorizontalDistanceAfterPulse,3.45);
 assert.equal(choices.forward.estimatedHorizontalDistanceAfterPulse,2.87);
 assert.equal(choices.backward.estimatedHorizontalDistanceAfterPulse,2.44);
 assert.match(choices.left.effect,/closer/);assert.match(choices.right.effect,/farther/);
 assert.ok(choices.forward);assert.ok(choices.right);
 state.direct.movementSafe.left=false;assert.equal(requestFor(state).questions.movement.criteria.left,undefined);
 state.task.stage='gathering';assert.equal(typeof requestFor(state).questions.movement.criteria.right,'string');
 state.task.stage='building';state.direct.placementTargets[0].visible=true;
 assert.equal(typeof requestFor(state).questions.movement.criteria.right,'string');
 state.direct.placementTargets[0].visible=false;state.direct.placementTargets[0].blockedByPlayer=true;
 assert.equal(typeof requestFor(state).questions.movement.criteria.right,'string');
});

test('a movement decision holds one control briefly and releases it without pathfinding',async()=>{
 const b=bot(),calls=[];b.setControlState=(k,v)=>calls.push([k,v]);let cleared=false;b.clearControlStates=()=>cleared=true;
 assert.match(await direct.execute(b,{},'forward',{},new AbortController().signal),/movement pulse/);assert.deepEqual(calls,[['forward',true]]);assert.ok(cleared);
});
test('unsafe movement is vetoed and cancellation clears controls',async()=>{
 const b=bot();b.blockAt=()=>null;b.setControlState=()=>{throw new Error('Must not move');};assert.match(await direct.execute(b,{},'forward',{},new AbortController().signal),/veto/);
 const c=bot(),controller=new AbortController();let cleared=false;c.setControlState=()=>controller.abort();c.clearControlStates=()=>cleared=true;await assert.rejects(direct.execute(c,{},'forward',{},controller.signal));assert.ok(cleared);
});
test('aim and equipment changes perform no mining, placement, or walking',async()=>{
 const b=bot();let aimed=0;b.lookAt=async()=>aimed++;b.dig=b.placeBlock=b.setControlState=()=>{throw new Error('Unexpected action');};
 assert.match(await direct.execute(b,{},'aim_mine_0',{miningTargets:[{position:{x:2,y:64,z:2}}]},new AbortController().signal),/aimed only/);assert.equal(aimed,1);
});
test('pinned viewer bundle has a single animation bridge',()=>{const source=require('../src/viewer-bundle.cjs').viewerBundle();assert.equal(source.split('demo-viewer-ready').length,2);});

test('two nearby occluded placement targets cannot cause alternating aim decisions',()=>{
 const targets=[{position:{x:72,y:64,z:70},distance:2.67,visible:false,alreadyAimed:true},{position:{x:69,y:64,z:67},distance:2.71,visible:false,alreadyAimed:false}];
 const state={controlMode:'direct',task:{stage:'building'},direct:{placementTargets:targets,canPlace:false,movementSafe:{forward:true,jump_forward:true}}};
 let choices=requestFor(state).questions.movement.criteria;
 assert.equal(choices.aim_place_0,undefined);assert.equal(choices.aim_place_1,undefined);assert.ok(choices.forward);assert.ok(choices.jump_forward);
 targets[1].distance=12;choices=requestFor(state).questions.movement.criteria;assert.ok(choices.aim_place_1);
 targets[1].distance=2.7;targets[1].visible=true;assert.ok(requestFor(state).questions.movement.criteria.aim_place_1);
});

test('gathering and building expose disjoint interaction choices even with stale candidates',()=>{
 const cell={position:{x:1,y:64,z:2},name:'red_wool'};
 const state={controlMode:'direct',task:{stage:'gathering'},direct:{miningTargets:[cell],placementTargets:[cell],drops:[{forward:-2,right:0}],canMine:true,canPlace:true,canInspect:true}};
 let choices=requestFor(state).questions.movement.criteria;
 assert.ok(choices.mine);assert.ok(choices.equip_shears);
 for(const key of ['place','aim_place_0','equip_red_wool','equip_white_wool','inspect_flag'])assert.equal(choices[key],undefined);
 state.task.stage='building';choices=requestFor(state).questions.movement.criteria;
 assert.ok(choices.place);assert.ok(choices.equip_red_wool);
 for(const key of ['mine','aim_mine_0','aim_drop_0','equip_shears'])assert.equal(choices[key],undefined);
});

test('placement visibility distinguishes support from intervening wool and removes repeated aim',()=>{
 const b=bot(),cell={position:{x:0,y:64,z:-2}};
 b.world={raycast:()=>({position:new Vec3(0,64,-1)})};assert.equal(direct.placementSight(b,cell).visible,false);
 b.world.raycast=()=>({position:new Vec3(0,63,-2)});assert.equal(direct.placementSight(b,cell).visible,true);
 const delta=new Vec3(.5,64.01,-1.5).minus(b.entity.position.offset(0,1.62,0));b.entity.yaw=Math.atan2(-delta.x,-delta.z);b.entity.pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));
 const sight=direct.placementSight(b,cell);assert.equal(sight.alreadyAimed,true);
 const choices=requestFor({controlMode:'direct',direct:{placementTargets:[{...cell,...sight}],canPlace:false}}).questions.movement.criteria;
 assert.equal(choices.aim_place_0,undefined);assert.ok(choices.forward);
});

test('placement visibility casts the full eye-to-support distance with a unit direction',()=>{
 const b=bot(),cell={position:{x:0,y:64,z:-2}};
 const distance=new Vec3(.5,64.01,-1.5).distanceTo(b.entity.position.offset(0,1.62,0));
 let calls=0;
 b.world={raycast:(eye,direction,range)=>{
  calls++;assert.ok(Math.abs(direction.norm()-1)<1e-10);
  assert.equal(range,4.5);
  return range>=distance?{position:new Vec3(0,63,-2)}:null;
 }};
 assert.equal(direct.placementSight(b,cell).visible,true);assert.equal(calls,1);
 cell.position.z=-8;assert.equal(direct.placementSight(b,cell).visible,false);assert.equal(calls,1);
});

test('crosshair and aiming share eye height, including zero yaw and pitch',()=>{
 const b=bot();b.entity.height=1.8;b.entity.eyeHeight=1.62;
 b.blockAtCursor=()=>{throw Error('Full-height cursor must not be used');};
 let seen;b.world={raycast:(origin,direction,range)=>{seen={origin,direction,range};return {name:'quartz_block'};}};
 assert.equal(direct.crosshair(b).name,'quartz_block');
 assert.equal(seen.origin.y,65.62);assert.equal(seen.range,4.5);
 assert.ok(seen.direction.equals(new Vec3(0,0,-1)));
 b.entity.eyeHeight=1.27;b.entity.pitch=-.5;b.entity.yaw=1;
 direct.crosshair(b);assert.equal(seen.origin.y,65.27);assert.ok(Math.abs(seen.direction.norm()-1)<1e-10);
});

test('visibility predicts rounded aim at a wool edge rather than the ideal clear ray',()=>{
 const {RaycastIterator}=require('prismarine-world').iterators;
 const b=bot();b.entity.position=new Vec3(78.56771324394555,65,65.81422416348049);
 b.entity.eyeHeight=1.62;b.entity.yaw=-.6178465552059542;b.entity.pitch=-1.0183995652754823;
 const cell={position:{x:79,y:64,z:64}};
 b.world={raycast:(origin,direction,range)=>{
  const iter=new RaycastIterator(origin,direction,range);
  const hits=[new Vec3(79,64,65),new Vec3(79,63,64)].map(position=>({position,hit:iter.intersect([[0,0,0,1,1,1]],position)})).filter(x=>x.hit);
  hits.sort((a,c)=>a.hit.pos.distanceTo(origin)-c.hit.pos.distanceTo(origin));return hits[0]||null;
 }};
 const eye=b.entity.position.offset(0,1.62,0),ideal=new Vec3(79.5,64.01,64.5).minus(eye).unit();
 assert.ok(b.world.raycast(eye,ideal,4.5).position.equals(new Vec3(79,63,64)));
 assert.equal(direct.placementSight(b,cell).visible,false);
 assert.ok(direct.crosshair(b).position.equals(new Vec3(79,64,65)));
});

test('valid placement aim is retained while model selects the required equipment',()=>{
 const cell={position:{x:1,y:64,z:2},name:'white_wool'};
 const choices=requestFor({controlMode:'direct',task:{stage:'building',inventory:{red_wool:0,white_wool:1}},direct:{heldItem:'shears',aimedPlacement:cell,placementTargets:[cell],canPlace:false}}).questions.movement.criteria;
 assert.equal(choices.aim_place_0,undefined);assert.equal(choices.place,undefined);assert.equal(choices.equip_shears,undefined);assert.equal(choices.equip_red_wool,undefined);assert.ok(choices.equip_white_wool);
});

test('placement rejects body-corner overlap but allows placing below a standing player',()=>{
 const b=bot(),cell={position:{x:81,y:64,z:68}};
 b.entity.position=new Vec3(80.74,64,67.84);assert.equal(direct.overlapsPlayer(b,cell),true);
 b.entity.position=new Vec3(80.69,64,67.84);assert.equal(direct.overlapsPlayer(b,cell),false);
 b.entity.position=new Vec3(81.5,65,68.5);assert.equal(direct.overlapsPlayer(b,cell),false);
 const choices=requestFor({controlMode:'direct',direct:{placementTargets:[{...cell,blockedByPlayer:true}],canPlace:false}}).questions.movement.criteria;
 assert.equal(choices.place,undefined);assert.equal(choices.aim_place_0,undefined);assert.ok(choices.backward);
});

test('walking down one block is safe but deeper holes and lava are not',()=>{
 const b=bot();b.entity.position.y=65;
 b.blockAt=p=>({name:p.y===63?'stone':'air',boundingBox:p.y===63?'block':'empty'});
 assert.equal(direct.movementSafe(b,'forward'),true);
 b.blockAt=p=>({name:p.y===62?'stone':'air',boundingBox:p.y===62?'block':'empty'});
 assert.equal(direct.movementSafe(b,'forward'),false);
 b.blockAt=p=>({name:p.y===63?'lava':'air',boundingBox:p.y===63?'block':'empty'});
 assert.equal(direct.movementSafe(b,'forward'),false);
});
test('backward action uses the actual Mineflayer back control',async()=>{
 const b=bot(),calls=[];b.setControlState=(key)=>calls.push(key);
 await direct.execute(b,{},'backward',{},new AbortController().signal);
 assert.deepEqual(calls,['back']);
});

test('aligned and absent drop aims are excluded while model movement choices remain',()=>{
 const state={controlMode:'direct',direct:{drops:[{forward:2.3,right:0}],movementSafe:{forward:false,jump_forward:true}}};
 const choices=requestFor(state).questions.movement.criteria;
 assert.equal(choices.aim_drop_0,undefined);assert.equal(choices.aim_drop_1,undefined);
 assert.ok(choices.jump_forward);assert.ok(choices.mine);assert.ok(choices.left);
 state.direct.drops[0]={forward:-2,right:0};assert.ok(requestFor(state).questions.movement.criteria.aim_drop_0);
 state.direct.drops[0]={forward:2,right:1};assert.ok(requestFor(state).questions.movement.criteria.aim_drop_0);
});


test('drop aim faces a live item without walking and rejects vanished drops',async()=>{
 const b=bot(),position=new Vec3(2,64,2),seen={drops:[{position,name:'oak_log'}]};let aimed;
 b.findBlocks=()=>[];b.entities={1:{name:'item',position,getDroppedItem:()=>({name:'oak_log'})}};
 b.lookAt=async p=>aimed=p;b.setControlState=b.dig=b.equip=()=>{throw new Error('Hidden action forbidden');};
 assert.match(await direct.execute(b,{scenario:'lumber'},'aim_drop_0',seen,new AbortController().signal),/faced drop approach point only/);
 assert.ok(aimed.equals(position.offset(.5,.2,.5)));
 b.entities={};aimed=null;
 assert.match(await direct.execute(b,{scenario:'lumber'},'aim_drop_0',seen,new AbortController().signal),/drop changed/);assert.equal(aimed,null);
});
test('flag observations omit drops whose color is already fully stocked',()=>{
 const b=bot(),flag=require('../src/flag.cjs'),task=flag.createTask(b);
 b.blockAtCursor=()=>null;b.inventory.items=()=>[{name:'red_wool',count:234}];
 b.entities={1:{name:'item',position:new Vec3(task.origin.x,task.origin.y,task.origin.z-10),getDroppedItem:()=>({name:'red_wool'})},2:{name:'item',position:new Vec3(task.origin.x+20,task.origin.y,task.origin.z-10),getDroppedItem:()=>({name:'white_wool'})}};
 assert.deepEqual(direct.observeDirect(b,task).drops.map(d=>d.name),['white_wool']);
});
test('mining breaks one aimed supply block without aim, equip or navigation helpers',async()=>{
 const b=bot(),origin={x:64,y:64,z:64},target=new Vec3(64,64,45),task={scenario:'flag',origin,home:origin,blueprint:require('../src/flag.cjs').blueprint(origin),startedAt:Date.now(),lastProgressAt:Date.now(),best:0,failed:{},mined:{red_wool:0,white_wool:0}};
 let broken=false,digs=0;b.entities={};b.blockAt=p=>({position:p,name:!broken&&p.equals(target)?'red_wool':p.y===63?'stone':'air',boundingBox:p.y===63?'block':'empty'});
 b.blockAtCursor=()=>b.blockAt(target);b.canDigBlock=()=>true;b.lookAt=b.equip=()=>{throw new Error('Automatic helper forbidden');};
 b.dig=async(block,look)=>{assert.equal(look,'ignore');digs++;broken=true;};
 assert.match(await direct.execute(b,task,'mine',{},new AbortController().signal),/mined one/);assert.equal(digs,1);assert.equal(task.mined.red_wool,1);
});
test('single placement preserves the model-selected aim and equipped item',async()=>{
 const b=bot(),origin={x:0,y:64,z:-2},task={scenario:'flag',origin,home:origin,blueprint:require('../src/flag.cjs').blueprint(origin),startedAt:Date.now(),lastProgressAt:Date.now(),best:0,failed:{},mined:{red_wool:0,white_wool:0}},target=new Vec3(0,64,-2);
 b.entities={};b.inventory.items=()=>[{name:'red_wool',count:234},{name:'white_wool',count:104}];b.heldItem={name:'red_wool'};
 let placed=0;b.blockAt=p=>({position:p,name:placed&&p.equals(target)?'red_wool':p.y===63?'stone':'air',boundingBox:p.y===63?'block':'empty'});b.blockAtCursor=()=>b.blockAt(target.offset(0,-1,0));
 b.lookAt=b.equip=b.placeBlock=()=>{throw new Error('Automatic helper forbidden');};b._placeBlockWithOptions=async(reference,face,options)=>{assert.equal(options.forceLook,'ignore');assert.ok(reference.position.plus(face).equals(target));placed++;};
 assert.match(await direct.execute(b,task,'place',{},new AbortController().signal),/placed and verified one/);assert.equal(placed,1);
});
