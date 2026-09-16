const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const net=require('node:net');
const path=require('node:path');
test('scenario API switches both ways, resets displayed state and rejects unavailable tasks',async t=>{
 const reservation=net.createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 const child=spawn(process.execPath,['src/server.cjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),TYPESAFE_API_KEY:''},windowsHide:true,stdio:['ignore','pipe','pipe']});
 t.after(()=>{child.kill();});
 await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw new Error('Test server exited before listening');}),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Test server startup timed out')),10000);timer.unref();})]);
 const post=async body=>{const response=await fetch(`http://127.0.0.1:${port}/api/scenario`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};};
 const flag=await post({scenario:'flag'});assert.equal(flag.status,200);assert.equal(flag.body.scenario,'flag');assert.ok(flag.body.actionLabels.build_maple_leaf);assert.equal(flag.body.latest,null);assert.equal(flag.body.count,0);
 const lumber=await post({scenario:'lumber'});assert.equal(lumber.status,200);assert.ok(lumber.body.actionLabels.harvest_nearest);assert.equal(lumber.body.task,null);
 assert.equal((await post({scenario:'cabin'})).status,400);assert.equal((await post({scenario:'missing'})).status,400);
 const unchanged=await (await fetch(`http://127.0.0.1:${port}/api/state`)).json();assert.equal(unchanged.scenario,'lumber');assert.equal(unchanged.keyConfigured,false);
});
