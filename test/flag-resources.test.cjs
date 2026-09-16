const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Vec3}=require('vec3');
const flag=require('../src/flag.cjs');
const resources=require('../src/flag-resources.cjs');
function fixture(){
 const origin={x:64,y:64,z:64},world=new Map(),items={red_wool:0,white_wool:0};
 for(const c of resources.banks(origin))world.set(JSON.stringify(c.position),c.name);
 const task={origin,blueprint:flag.blueprint(origin),home:{x:61.5,y:64,z:70.5},startedAt:Date.now(),lastProgressAt:Date.now(),best:0,failed:{},mined:{red_wool:0,white_wool:0}};
 const bot={entity:{position:new Vec3(61.5,64,70.5)},entities:{},world:{},inventory:{items:()=>Object.entries(items).map(([name,count])=>({name,count}))},
 blockAt:p=>({position:p,name:world.get(JSON.stringify({x:p.x,y:p.y,z:p.z}))||(p.y===63?'stone':'air'),boundingBox:p.y===63?'block':'empty'}),
 pathfinder:{goto:async()=>{},setGoal:()=>{}},stopDigging:()=>{},clearControlStates:()=>{},canDigBlock:()=>true,unequip:async()=>{},equip:async()=>{},
 dig:async b=>{world.delete(JSON.stringify({x:b.position.x,y:b.position.y,z:b.position.z}));items[b.name]++;},placeBlock:async()=>{throw new Error('Must not build yet');}};
 return {bot,task,world,items};
}
test('supply areas contain exact materials and never overlap the flag',()=>{
 const {task}=fixture(),cells=resources.banks(task.origin),flagCells=new Set(task.blueprint.map(c=>JSON.stringify(c.position)));
 assert.equal(cells.filter(c=>c.name==='red_wool').length,234);assert.equal(cells.filter(c=>c.name==='white_wool').length,104);
 assert.ok(cells.every(c=>!flagCells.has(JSON.stringify(c.position))));
});
test('mining collects inventory and construction remains gated until both colors are ready',async()=>{
 const {bot,task,items}=fixture(),signal=new AbortController().signal;
 assert.equal(flag.progress(bot,task).stage,'gathering');
 assert.match(await flag.executeTask(bot,task,'mine_red_wool',flag.candidates(bot,task),signal),/Mined and collected 8/);
 assert.equal(items.red_wool,8);assert.equal(task.mined.red_wool,8);assert.equal(flag.candidates(bot,task).red_bars.length,0);
 assert.match(await flag.executeTask(bot,task,'build_red_bars',{red_bars:task.blueprint.slice(0,4)},signal),/gather all/);
 items.red_wool=234;items.white_wool=104;assert.equal(flag.progress(bot,task).stage,'building');assert.equal(flag.candidates(bot,task).red_bars.length,4);
});
test('forged mining targets and replaced blocks are not dug',async()=>{
 const {bot,task,world}=fixture(),signal=new AbortController().signal;let digs=0;bot.dig=async()=>{digs++;};
 assert.match(await flag.executeTask(bot,task,'mine_red_wool',{red_wool:[task.blueprint[0]]},signal),/outside/);
 const seen=flag.candidates(bot,task);world.set(JSON.stringify(seen.red_wool[0].position),'chest');
 assert.match(await flag.executeTask(bot,task,'mine_red_wool',seen,signal),/changed/);assert.equal(digs,0);
});
test('cancellation after equipping prevents mining',async()=>{
 const {bot,task}=fixture(),controller=new AbortController();let digs=0;
 bot.unequip=async()=>controller.abort();bot.dig=async()=>{digs++;};
 await assert.rejects(flag.executeTask(bot,task,'mine_red_wool',flag.candidates(bot,task),controller.signal));assert.equal(digs,0);
});
test('broken blocks without inventory pickup do not unlock building',async()=>{
 const {bot,task,world}=fixture(),controller=new AbortController();
 bot.dig=async b=>{world.delete(JSON.stringify({x:b.position.x,y:b.position.y,z:b.position.z}));};
 bot.pathfinder.goto=async goal=>{if(goal.constructor.name==='GoalNear')controller.abort();};
 await assert.rejects(flag.executeTask(bot,task,'mine_red_wool',flag.candidates(bot,task),controller.signal));
 assert.equal(flag.progress(bot,task).inventory.red_wool,0);assert.equal(flag.progress(bot,task).stage,'gathering');
});
test('gathering progress refreshes the watchdog and stops mining a color once enough is owned',async()=>{
 const {bot,task,items}=fixture();task.lastProgressAt=1;items.red_wool=233;
 const seen=flag.candidates(bot,task);assert.equal(seen.red_wool.length,1);
 await flag.executeTask(bot,task,'mine_red_wool',seen,new AbortController().signal);
 assert.equal(items.red_wool,234);assert.equal(flag.candidates(bot,task).red_wool.length,0);assert.ok(task.lastProgressAt>1);
});
