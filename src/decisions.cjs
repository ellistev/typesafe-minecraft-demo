const actions = {
  harvest_nearest: 'Navigate to and mine candidates.logs[0], when more logs are needed.',
  harvest_alternative: 'Navigate to and mine candidates.logs[1], when the first target is unsuitable or recently failed.',
  pickup: 'Walk to candidates.droppedLog to collect it. Prefer collecting existing drops before mining more.',
  explore: 'Walk to candidates.exploreDestination to find more reachable trees when no log or drop is available.',
  return_home: 'Navigate back to task.home when task.collected reaches task.target.',
  wait: 'Wait when no useful available action is safe.'
};

const flagActions = {
  mine_red_wool:'Mine and collect up to eight candidates.red_wool blocks from the red supply area when red wool is still needed.',
  mine_white_wool:'Mine and collect up to eight candidates.white_wool blocks from the white supply area when white wool is still needed.',
  collect_wool:'Collect candidates.droppedWool before mining more. Available only when this observed drop exists.',
  build_red_bars:'Place up to four candidates.red_bars blocks for the red side panels.',
  build_white_field:'Place up to four candidates.white_field blocks for the white background.',
  build_maple_leaf:'Place up to four candidates.maple_leaf blocks for the red maple leaf.',
  inspect_flag:'Verify the finished flag. Choose only when candidates.canInspect is true.',
  wait:'Wait if no construction action is available.'
};
const actionsFor = state => state?.scenario==='flag'?flagActions:actions;
function requestFor(state, model = 'jev-latest') {
  return { model, state, questions: { movement: {
    type: 'choice',
    instructions: state.scenario==='flag' ? 'Choose the next gathering or construction step for the Canadian flag. First mine and collect ALL remaining materials: task.inventory must cover task.required for both colors before any building. During gathering choose a nonempty candidates.red_wool or candidates.white_wool batch, preferably the closer supply, or collect_wool for an available drop. Empty candidates are unavailable. Code restricts mining to the prepared supply areas; never mine the flag. Once all wool is in inventory, choose construction. The blueprint is supplied by code; you choose which section to build next. Prefer available nearby work and avoid recent failures. candidates contains up to four exact placements per section. An empty section is unavailable. When candidates.canInspect is true, select inspect_flag. Observed inventory and block matches are facts. Never claim success without world verification.' : 'Choose the next Minecraft action to collect 10 new logs and return home. Use task progress, observed candidates, and recent outcomes. Return home once task.collected >= task.target. Otherwise collect reachable dropped logs, or choose a reachable log to harvest; explore if neither exists. A missing or null candidate makes that action unavailable. Avoid repeating failed actions. Candidates come from loaded world blocks, not camera images. Code navigates and executes one bounded action; your choice determines which action runs. Completion is verified from inventory and position, not your confidence.',
    criteria: actionsFor(state)
  } } };
}

function validateAnswer(response, allowed = actions) {
  const answer = response?.answers?.movement;
  if (answer?.type !== 'choice' || !Object.hasOwn(allowed, answer.choice)) throw new Error('TypeSafe returned an invalid movement choice');
  if (!Number.isFinite(answer.confidence) || answer.confidence < 0 || answer.confidence > 1) throw new Error('Invalid confidence');
  const p = answer.probabilities;
  if (!p || Object.keys(p).length !== Object.keys(allowed).length || Object.keys(allowed).some(k => !Number.isFinite(p[k]) || p[k] < 0 || p[k] > 1)) throw new Error('Invalid action probabilities');
  if (Math.abs(Object.values(p).reduce((a,b) => a+b, 0) - 1) > 0.03) throw new Error('Action probabilities do not sum to one');
  return answer;
}

async function decide(state, { key, model, signal, fetchImpl = fetch }) {
  if (!key) throw new Error('TYPESAFE_API_KEY is missing. Restart using scripts/start-demo.ps1.');
  const request = requestFor(state, model);
  const started = performance.now();
  const response = await fetchImpl('https://api.typesafe.ai/v1/systemone', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(request), signal
  });
  if (!response.ok) throw new Error(`TypeSafe HTTP ${response.status}. Run paused; check credentials, balance or rate limits.`);
  const raw = await response.json();
  return { request, answer: validateAnswer(raw, actionsFor(state)), raw, latencyMs: Math.round(performance.now() - started) };
}

function isFresh(observed, current, elapsedMs) {
  return elapsedMs <= 5000 && Math.hypot(observed.x-current.x, observed.y-current.y, observed.z-current.z) < 0.8;
}
module.exports = { actions, flagActions, actionsFor, requestFor, validateAnswer, decide, isFresh };
