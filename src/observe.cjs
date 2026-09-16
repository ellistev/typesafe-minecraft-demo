const { Vec3 } = require('vec3');
const hazards = new Set(['lava', 'water', 'fire', 'cactus', 'magma_block', 'powder_snow', 'sweet_berry_bush', 'campfire']);
const point = p => ({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) });

function inspect(bot, yaw, distance) {
  const p = bot.entity.position;
  const x = p.x - Math.sin(yaw) * distance;
  const z = p.z - Math.cos(yaw) * distance;
  const y = Math.floor(p.y + 0.05);
  const blocks = [-1, 0, 1, 2].map(d => bot.blockAt(new Vec3(Math.floor(x), y+d, Math.floor(z))));
  if (blocks.some(b => !b)) return { distance, status: 'unknown' };
  const [ground, feet, head, above] = blocks;
  const solid = b => b.boundingBox === 'block';
  let status = 'clear';
  if (blocks.some(b => hazards.has(b.name))) status = 'hazard';
  else if (solid(head) || (solid(feet) && solid(above))) status = 'blocked';
  else if (solid(feet)) status = 'one_block_rise';
  else if (!solid(ground)) status = 'drop_or_no_floor';
  return { distance, status, ground: ground.name, feet: feet.name, head: head.name };
}

function observe(bot, goal, history) {
  const yaw = bot.entity.yaw;
  return {
    goal, position: point(bot.entity.position), health: bot.health, food: bot.food,
    headingDegrees: Math.round(yaw * 180 / Math.PI),
    terrain: Object.fromEntries([['forward',0],['left',Math.PI/3],['right',-Math.PI/3],['behind',Math.PI]].map(([name,offset]) =>
      [name, [1,2,3,4].map(d => inspect(bot,yaw+offset,d))])),
    nearbyEntities: Object.values(bot.entities).filter(e => e !== bot.entity && e.position.distanceTo(bot.entity.position) < 12).slice(0,8).map(e => ({ name:e.name || 'player', distance:+e.position.distanceTo(bot.entity.position).toFixed(1) })),
    recentActions: history.slice(-8)
  };
}
module.exports = { observe, point, inspect };
