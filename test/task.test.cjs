const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Vec3}=require('vec3');
const {createTask,progress,stopReason,bounded,executeTask}=require('../src/task.cjs');
function fake(){return {entity:{position:new Vec3(0,64,0)},inventory:{items:()=>[{name:'oak_log',count:4},{name:'oak_planks',count:64}]}};}
test('success requires ten NEW inventory logs and a three-dimensional return home',()=>{
 const bot=fake(),task=createTask(bot,1000);
 assert.equal(progress(bot,task,1000).collected,0);
 bot.inventory.items=()=>[{name:'birch_log',count:14}];bot.entity.position.x=8;
 assert.equal(progress(bot,task,2000).complete,false);
 bot.entity.position.x=0;bot.entity.position.y=70;assert.equal(progress(bot,task,2000).complete,false);
 bot.entity.position.y=64;assert.equal(progress(bot,task,2000).complete,true);
 assert.match(stopReason(progress(bot,task,2000),task,2000),/Complete/);
});
test('run time and lack of inventory progress stop an incomplete task',()=>{
 const bot=fake(),task=createTask(bot,0);
 assert.match(stopReason(progress(bot,task,90001),task,90001),/no inventory/);
 assert.match(stopReason(progress(bot,task,300001),task,300001),/five-minute/);
});
test('completed task duration remains fixed after stopping',()=>{
 const bot=fake(),task=createTask(bot,0);task.finishedAt=42000;
 const p=progress(bot,task,99000);assert.equal(p.elapsedSeconds,42);assert.equal(p.finished,true);
});
test('cancellation releases movement, pathfinding and digging',async()=>{
 const calls=[];const bot={pathfinder:{setGoal:g=>calls.push(g)},stopDigging:()=>calls.push('dig'),clearControlStates:()=>calls.push('keys')};
 const controller=new AbortController();const pending=bounded(bot,controller.signal,()=>new Promise(()=>{}));controller.abort();
 await assert.rejects(pending);assert.deepEqual(calls,[null,'dig','keys']);
 let ran=false;await assert.rejects(bounded(bot,controller.signal,()=>{ran=true;}));assert.equal(ran,false);
});
test('missing candidates do not silently execute a replacement action',async()=>{
 const bot=fake();let moves=0;bot.pathfinder={setGoal:()=>{},goto:()=>{moves++;}};bot.stopDigging=()=>{};bot.clearControlStates=()=>{};
 const task=createTask(bot);const result=await executeTask(bot,task,'harvest_nearest',{logs:[]},new AbortController().signal);
 assert.match(result,/unavailable/);assert.equal(moves,0);
});
test('action deadline aborts navigation and releases controls',async()=>{
 const bot=fake();let stopped=false;bot.pathfinder={setGoal:()=>{stopped=true;},goto:()=>new Promise(()=>{})};bot.stopDigging=()=>{};bot.clearControlStates=()=>{};
 const keepAlive=setTimeout(()=>{},1000);
 try{await assert.rejects(executeTask(bot,createTask(bot),'return_home',{},AbortSignal.timeout(10)));assert.equal(stopped,true);}
 finally{clearTimeout(keepAlive);}
});
