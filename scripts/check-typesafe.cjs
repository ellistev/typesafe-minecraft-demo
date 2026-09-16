const { decide } = require('../src/decisions.cjs');
async function main() {
  const state = require('../docs/example-state.cjs');
  const result = await decide(state,{key:process.env.TYPESAFE_API_KEY,signal:AbortSignal.timeout(15000)});
  console.log(JSON.stringify({type:'Live API smoke test with synthetic terrain (not gameplay)',choice:result.answer.choice,latencyMs:result.latencyMs,model:result.raw.model,usage:result.raw.usage}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
