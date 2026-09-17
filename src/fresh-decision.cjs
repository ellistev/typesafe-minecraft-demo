const {isFresh}=require('./decisions.cjs');
const {setTimeout:delay}=require('node:timers/promises');

// A rejected answer never reaches the executor. Reobserve instead of replaying it.
async function decideFresh({observe,decide,position,onDiscard,onServiceError=()=>{},signal,isActive=()=>true,now=Date.now,wait=(ms=250)=>delay(ms,undefined,{signal}),maxAttempts=3}) {
  for(let attempt=1;attempt<=maxAttempts;attempt++) {
    signal?.throwIfAborted();
    if(!isActive())return null;
    const state=observe();
    const started=now();
    let result;
    try { result=await decide(state); }
    catch(error) {
      signal?.throwIfAborted();
      if(!isActive())return null;
      const timedOut=error.name==='TimeoutError';
      if(!timedOut&&![429,500,502,503,504,529].includes(error.status))throw error;
      const retry=attempt<maxAttempts;
      const delayMs=retry?1000*2**(attempt-1):0;
      onServiceError({kind:'api-error',httpStatus:timedOut?null:error.status,errorType:timedOut?'timeout':'http',attempt,delayMs,retry});
      if(!retry)throw new Error(`${timedOut?'TypeSafe request timeout':`TypeSafe HTTP ${error.status}`} persisted after ${maxAttempts} attempts. No action executed.`);
      await wait(delayMs);
      continue;
    }
    signal?.throwIfAborted();
    if(!isActive())return null;
    const current=position();
    const elapsedMs=now()-started;
    const displacement=Math.hypot(current.x-state.position.x,current.y-state.position.y,current.z-state.position.z);
    const freshness={elapsedMs,displacement,position:current,attempt};
    if(isFresh(state.position,current,elapsedMs))return {state,result,freshness};
    onDiscard({state,...result,freshness,outcome:'Not executed: observation changed or response exceeded 5 seconds'});
    if(attempt<maxAttempts)await wait();
  }
  throw new Error('Three consecutive stale observations. No rejected action was executed; check the decision log.');
}
module.exports={decideFresh};
