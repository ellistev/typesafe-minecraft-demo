const {test}=require('node:test');
const assert=require('node:assert/strict');
const {decideFresh}=require('../src/fresh-decision.cjs');
const origin={x:0,y:64,z:0};
test('overload retries back off and use fresh state without fabricating answers',async()=>{
  let calls=0;let observations=0;const waits=[];const failures=[];
  const {options,discarded}=setup({observe:()=>({position:origin,sample:++observations}),decide:async state=>{
    if(++calls<3)throw Object.assign(new Error('overloaded'),{status:529});
    return {raw:{sample:state.sample}};
  },wait:async ms=>waits.push(ms),onServiceError:r=>failures.push(r)});
  const result=await decideFresh(options);
  assert.equal(result.state.sample,3);assert.deepEqual(waits,[1000,2000]);
  assert.equal(failures.length,2);assert.equal(discarded.length,0);
});
test('persistent rate limiting stops at the bounded attempt limit',async()=>{
  let calls=0;const failures=[];
  const {options}=setup({decide:async()=>{calls++;throw Object.assign(new Error('limited'),{status:429});},onServiceError:r=>failures.push(r)});
  await assert.rejects(decideFresh(options),/429 persisted after 3 attempts/);
  assert.equal(calls,3);assert.equal(failures[2].retry,false);
});
test('credentials and invalid answers are not retried',async()=>{
  for(const status of [401,403,422,undefined]) {
    let calls=0;const {options}=setup({decide:async()=>{calls++;throw Object.assign(new Error('invalid'),{status});}});
    await assert.rejects(decideFresh(options),/invalid/);assert.equal(calls,1);
  }
});
test('Pause cancels overload recovery before another request',async()=>{
  const controller=new AbortController();let calls=0;
  const {options}=setup({signal:controller.signal,decide:async()=>{calls++;throw Object.assign(new Error('overloaded'),{status:529});},wait:async()=>controller.abort()});
  await assert.rejects(decideFresh(options),{name:'AbortError'});assert.equal(calls,1);
});
function setup(overrides={}) {
  const discarded=[];
  const options={observe:()=>({position:{...origin}}),position:()=>({...origin}),decide:async()=>({raw:{actual:true}}),onDiscard:r=>discarded.push(r),wait:async()=>{},now:()=>0,...overrides};
  return {options,discarded};
}
test('request timeout retries with fresh observations and backoff, without invented answers',async()=>{
  let calls=0,observations=0;const waits=[],failures=[];
  const {options,discarded}=setup({observe:()=>({position:origin,sample:++observations}),decide:async state=>{
    if(++calls===1){
      const timeout=AbortSignal.timeout(1);
      await require('node:timers/promises').setTimeout(5);
      timeout.throwIfAborted();
    }
    return {raw:{sample:state.sample}};
  },wait:async ms=>waits.push(ms),onServiceError:r=>failures.push(r)});
  const result=await decideFresh(options);
  assert.equal(calls,2);assert.equal(result.state.sample,2);assert.equal(result.result.raw.sample,2);
  assert.deepEqual(waits,[1000]);assert.equal(discarded.length,0);
  assert.deepEqual(failures,[{kind:'api-error',httpStatus:null,errorType:'timeout',attempt:1,delayMs:1000,retry:true}]);
});
test('timeouts and HTTP failures share a three-attempt budget',async()=>{
  let calls=0;const waits=[],failures=[];
  const {options}=setup({decide:async()=>{
    if(++calls===2)throw Object.assign(new Error('overload'),{status:529});
    throw new DOMException('timeout','TimeoutError');
  },wait:async ms=>waits.push(ms),onServiceError:r=>failures.push(r)});
  await assert.rejects(decideFresh(options),/TypeSafe request timeout persisted after 3 attempts/);
  assert.equal(calls,3);assert.deepEqual(waits,[1000,2000]);assert.equal(failures[2].retry,false);
});
test('Pause wins over request timeout and cancels timeout backoff',async()=>{
  for(const pauseDuring of ['request','backoff']){
    const controller=new AbortController();let calls=0;const failures=[];
    const {options}=setup({signal:controller.signal,decide:async()=>{
      calls++;if(pauseDuring==='request')controller.abort();
      throw new DOMException('timeout','TimeoutError');
    },wait:async()=>controller.abort(),onServiceError:r=>failures.push(r)});
    await assert.rejects(decideFresh(options),{name:'AbortError'});
    assert.equal(calls,1);assert.equal(failures.length,pauseDuring==='request'?0:1);
  }
});
test('ordinary aborts are not mistaken for request timeouts',async()=>{
  let calls=0;const {options}=setup({decide:async()=>{calls++;throw new DOMException('aborted','AbortError');}});
  await assert.rejects(decideFresh(options),{name:'AbortError'});assert.equal(calls,1);
});
test('fresh answer passes through with measured diagnostics',async()=>{
  const {options,discarded}=setup();const result=await decideFresh(options);
  assert.deepEqual(result.result.raw,{actual:true});assert.equal(result.freshness.displacement,0);assert.equal(discarded.length,0);
});
test('jump displacement discards answer and obtains a new observation and decision',async()=>{
  let calls=0;let observations=0;
  const {options,discarded}=setup({observe:()=>({position:{...origin},sample:++observations}),decide:async state=>({raw:{sample:state.sample},choice:++calls}),position:()=>({...origin,y:calls===1?65:64})});
  const result=await decideFresh(options);
  assert.equal(result.result.choice,2);assert.equal(result.state.sample,2);
  assert.equal(discarded.length,1);assert.equal(discarded[0].raw.sample,1);assert.equal(discarded[0].freshness.displacement,1);
  assert.match(discarded[0].outcome,/Not executed/);
});
test('slow answers are discarded and repeated staleness stops after three calls',async()=>{
  let ticks=0;let calls=0;
  const {options,discarded}=setup({now:()=>ticks++*6000,decide:async()=>({call:++calls})});
  await assert.rejects(decideFresh(options),/Three consecutive stale/);
  assert.equal(calls,3);assert.equal(discarded.length,3);assert.ok(discarded.every(r=>r.freshness.elapsedMs===6000));
});
test('Pause during retry wait cancels before another API call',async()=>{
  const controller=new AbortController();let calls=0;
  const {options}=setup({signal:controller.signal,position:()=>({...origin,y:65}),decide:async()=>({call:++calls}),wait:async()=>controller.abort()});
  await assert.rejects(decideFresh(options),{name:'AbortError'});assert.equal(calls,1);
});
test('run replacement while inference is pending cannot return an executable answer',async()=>{
  let active=true;
  const {options,discarded}=setup({isActive:()=>active,decide:async()=>{active=false;return {};}});
  assert.equal(await decideFresh(options),null);assert.equal(discarded.length,0);
});
