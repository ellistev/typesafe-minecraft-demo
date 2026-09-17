const actions={
 forward:'Hold forward for 250 milliseconds. No automatic steering.',
 backward:'Hold backward for 250 milliseconds.',
 left:'Strafe left for 250 milliseconds without turning.',
 right:'Strafe right for 250 milliseconds without turning.',
 jump_forward:'Jump and hold forward for 250 milliseconds to climb a one-block rise.',
 turn_left:'Turn left by 30 degrees, without walking.',
 turn_right:'Turn right by 30 degrees, without walking.',
 aim_mine_0:'Look at miningTargets[0]. Only changes aim, never moves or mines.',
 aim_mine_1:'Look at miningTargets[1]. Only changes aim, never moves or mines.',
 aim_drop_0:'Face drops[0] before walking over it. Aim only; no movement or automatic pickup.',
 aim_drop_1:'Face drops[1] before walking over it. Aim only; no movement or automatic pickup.',
 aim_place_0:'Look at the supporting top face for placementTargets[0]. Never moves or places.',
 aim_place_1:'Look at the supporting top face for placementTargets[1]. Never moves or places.',
 equip_shears:'Select shears from inventory; does not mine.',
 equip_red_wool:'Select red wool from inventory; does not place.',
 equip_white_wool:'Select white wool from inventory; does not place.',
 mine:'Mine exactly the eligible block currently under the crosshair. No aiming, movement, or pickup path.',
 place:'Place exactly one held wool block at the eligible aimed blueprint cell. No movement.',
 inspect_flag:'Check every blueprint cell when all 338 are placed.',
 wait:'Release controls and wait 250 milliseconds.'
};

function availableActions(state) {
 if(!state.direct)return actions;
 return Object.fromEntries(Object.entries(actions).filter(([name])=>{
  const d=state.direct;
  const stage=state.task?.stage;
  if(stage==='gathering'&&(name==='place'||name==='inspect_flag'||name.startsWith('aim_place_')||name==='equip_red_wool'||name==='equip_white_wool'))return false;
  if(['building','inspect','complete'].includes(stage)&&(name==='mine'||name==='equip_shears'||name.startsWith('aim_mine_')||name.startsWith('aim_drop_')))return false;
  if(d.movementSafe?.[name]===false)return false;
  if(name==='mine'&&d.canMine===false)return false;
  if(name==='place'&&d.canPlace===false)return false;
  if(name==='inspect_flag'&&d.canInspect===false)return false;
  if(name.startsWith('equip_')&&d.heldItem===name.slice(6))return false;
  if(name==='equip_shears'&&state.task?.stage==='building')return false;
  if(name==='equip_red_wool'||name==='equip_white_wool'){
   if(state.task?.stage==='gathering')return false;
   if(state.task?.inventory?.[name.slice(6)]===0)return false;
  }
  if(name.startsWith('aim_mine_')||name.startsWith('aim_place_')){
   const mining=name.startsWith('aim_mine_'),list=mining?d.miningTargets:d.placementTargets;
   if(!list)return true;
   const target=list[Number(name.slice(-1))];if(!target)return false;
   if(!mining&&target.blockedByPlayer)return false;
   if(!mining&&target.alreadyAimed)return false;
   if(!mining&&target.visible===false&&target.distance<=4.5)return false;
   if(mining&&d.canMine&&d.crosshair?.position&&Object.keys(target.position).every(k=>target.position[k]===d.crosshair.position[k]))return false;
   if(!mining&&d.canPlace)return false;
   if(!mining&&d.aimedPlacement&&Object.keys(target.position).every(k=>target.position[k]===d.aimedPlacement.position[k]))return false;
  }
  if(!name.startsWith('aim_drop_'))return true;
  const drop=state.direct.drops?.[Number(name.slice(-1))];
  return drop && !(drop.forward>0 && Math.abs(Math.atan2(drop.right,drop.forward))<=Math.PI/18);
 }).map(([name,description])=>{
  const step={forward:[1,0],backward:[-1,0],left:[0,-1],right:[0,1],jump_forward:[1,0]}[name];
  const d=state.direct,target=d.placementTargets?.[0];
  if(state.task?.stage!=='building'||!step||!target||d.canPlace||d.placementTargets.some(t=>t.visible)||target.blockedByPlayer||!Number.isFinite(target.forward)||!Number.isFinite(target.right))return [name,description];
  const before=Math.hypot(target.forward,target.right),after=Math.hypot(target.forward-step[0],target.right-step[1]);
  return [name,{action:description,target:'direct.placementTargets[0]',currentHorizontalDistance:+before.toFixed(2),estimatedHorizontalDistanceAfterPulse:+after.toFixed(2),effect:after<before?'closer to the nearest remaining gap':'farther from the nearest remaining gap',limitation:'Estimate for a roughly one-block pulse, not a route or a prediction of collisions, momentum or visibility.'}];
 }));
}
const phaseInstructions=`Choose one useful Minecraft control action. Every movement, aim, equip, mine and placement needs your separate choice. Code supplies observations and a fixed blueprint, not navigation. Use only offered choices.

BUILDING or INSPECT stage: Gathering is finished. Inventory already covers ALL remaining cells in task.required. Do not return home, search for supplies, or wait merely because miningTargets and drops are empty. Finish direct.placementTargets. When canPlace is true, place now. When aimedPlacement exists, equip its named wool then place. Otherwise aim at a visible placement target. If none is visible, move closer until one becomes visible. A gap surrounded by wool requires standing right beside its edge, not stopping several blocks away. Strafe right for positive right and left for negative right; move forward for positive forward and backward for negative forward. Aim_place can turn toward distant targets. A negative forward distance means the target is BEHIND you: aim toward it or move backward, never continue forward away from it. BlockedByPlayer means move away to uncover the cell. AlreadyAimed but not visible means change position, not aim again. Inspect when canInspect is true.

GATHERING stage: Collect direct.drops before mining more. Their approachPosition is a block center to WALK OVER; pickup happens automatically by proximity. Aim_drop faces that point, then choose movement. If a wool block obstructs access, jump_forward or aim and mine it. Otherwise approach a miningTarget, aim, equip shears and mine one block. Do not keep aiming if canMine is true. For lumber, collect ten new logs then walk home.

Directions are relative to the player: positive forward is ahead, negative is behind; positive right is right, negative is left. Forward/backward/strafe pulses move roughly one block. Jump crosses a one-block rise. When building and no target is visible, compare the distance estimates in the movement choices. Approach placementTargets[0], the nearest remaining gap, until a placement becomes visible. A sideways step can bring you closer while forward/backward takes you farther away. Do not alternate between approaching the nearest gap and aiming at a farther gap. Estimates are approximate; observe safety and actual outcomes. Do not repeat actions that make no progress. Wait only when no useful action is available.`;
module.exports={actions,availableActions,instructions:phaseInstructions};
