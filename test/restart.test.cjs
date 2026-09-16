const {test}=require('node:test');
const assert=require('node:assert/strict');
const {afterPreviousRun}=require('../src/restart.cjs');
test('restart waits for the prior cancelled action before resetting the world',async()=>{
 const events=[];let drain;
 const previous=new Promise(resolve=>{drain=()=>{events.push('old action drained');resolve();};});
 const restarted=afterPreviousRun(previous,()=>true,async()=>events.push('reset and start'));
 await Promise.resolve();assert.deepEqual(events,[]);
 drain();await restarted;assert.deepEqual(events,['old action drained','reset and start']);
});
test('Pause during restart prevents a new build after the old action drains',async()=>{
 let drain,allowed=true,started=false;
 const previous=new Promise(resolve=>{drain=resolve;});
 const restarted=afterPreviousRun(previous,()=>allowed,async()=>{started=true;});
 allowed=false;drain();await restarted;assert.equal(started,false);
});
