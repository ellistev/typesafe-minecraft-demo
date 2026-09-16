const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Vec3}=require('vec3');
const flag=require('../src/flag.cjs');
const {scenarioFor}=require('../src/scenarios.cjs');
const {requestFor,validateAnswer,flagActions}=require('../src/decisions.cjs');
function fixture(){
 const world=new Map();const origin={x:0,y:64,z:0};
 const task={scenario:'flag',origin,home:{x:-2,y:64,z:0},blueprint:flag.blueprint(origin),startedAt:0,lastProgressAt:0,best:0,inspected:false,failed:{}};
 const bot={entity:{position:new Vec3(-2,64,0)},inventory:{items:()=>[{name:'red_wool',count:234},{name:'white_wool',count:104}]},world:{},
  blockAt:p=>({position:p,name:world.get(p.toString())||(p.y===63?'grass_block':'air'),boundingBox:p.y===63?'block':'empty',shapes:p.y===63?[[0,0,0,1,1,1]]:[]}),
  pathfinder:{goto:async()=>{},setGoal:()=>{}},clearControlStates:()=>{},stopDigging:()=>{},equip:async item=>{bot.held=item;},
  placeBlock:async(ref,face)=>{world.set(ref.position.plus(face).toString(),bot.held.name);}};
 bot.world.getBlock=bot.blockAt;
 return {bot,task,world};
}
test('flag blueprint has 338 unique cells, symmetrical leaf and two red side panels',()=>{
 const cells=flag.blueprint({x:0,y:64,z:0});assert.equal(cells.length,338);assert.equal(new Set(cells.map(c=>JSON.stringify(c.position))).size,338);
 for(const row of flag.LEAF){assert.equal(row.length,14);assert.equal(row,row.split('').reverse().join(''));}
 assert.equal(cells.filter(c=>c.section==='red_bars').length,156);
 assert.equal(cells.filter(c=>c.name==='red_wool').length,234);
 assert.equal(cells.filter(c=>c.name==='white_wool').length,104);
});
test('flag completion requires all correct live blocks and explicit inspection',async()=>{
 const {bot,task,world}=fixture();for(const c of task.blueprint)world.set(new Vec3(c.position.x,c.position.y,c.position.z).toString(),c.name);
 assert.equal(flag.progress(bot,task,1000).complete,false);
 await flag.executeTask(bot,task,'inspect_flag',{},new AbortController().signal);
 assert.equal(flag.progress(bot,task,1000).complete,true);
 world.set(new Vec3(0,64,0).toString(),'white_wool');assert.equal(flag.progress(bot,task,1000).complete,false);
});
test('missing supplies enter gathering; obstructed cells stop before building',()=>{
 const {bot,task,world}=fixture();bot.inventory.items=()=>[];
 assert.equal(flag.stopReason(flag.progress(bot,task,1),task,1),null);assert.equal(flag.progress(bot,task,1).stage,'gathering');assert.equal(flag.candidates(bot,task).red_bars.length,0);
 world.set(new Vec3(0,64,0).toString(),'stone');assert.match(flag.stopReason(flag.progress(bot,task,1),task,1),/obstructed/);
});
test('placement verifies server-confirmed colors and never exceeds the chosen batch',async()=>{
 const {bot,task}=fixture(),seen=flag.candidates(bot,task);
 const outcome=await flag.executeTask(bot,task,'build_red_bars',seen,new AbortController().signal);
 assert.match(outcome,/verified 4/);assert.equal(flag.progress(bot,task,1).collected,4);
 bot.placeBlock=async()=>{};
 assert.match(await flag.executeTask(bot,task,'build_white_field',flag.candidates(bot,task),new AbortController().signal),/did not confirm/);
});
test('abort during equipment change prevents placement',async()=>{
 const {bot,task}=fixture();const controller=new AbortController();let placed=false;
 bot.equip=async()=>controller.abort();bot.placeBlock=async()=>{placed=true;};
 await assert.rejects(flag.executeTask(bot,task,'build_red_bars',flag.candidates(bot,task),controller.signal));assert.equal(placed,false);
});
test('flag choices are scoped to flag requests and unavailable scenarios fail closed',()=>{
 const r=requestFor({scenario:'flag'});assert.deepEqual(r.questions.movement.criteria,flagActions);
 const response={answers:{movement:{type:'choice',choice:'build_maple_leaf',confidence:1,probabilities:Object.fromEntries(Object.keys(flagActions).map(k=>[k,k==='build_maple_leaf'?1:0]))}}};
 assert.equal(validateAnswer(response,flagActions).choice,'build_maple_leaf');assert.throws(()=>validateAnswer(response));
 assert.throws(()=>scenarioFor('cabin'));assert.throws(()=>scenarioFor('unknown'));
});
