// Synthetic documentation fixture, not captured gameplay.
const samples = (status, feet = 'air', head = 'air') => [1, 2, 3, 4].map(distance => ({
  distance, status, ground: 'grass_block', feet, head
}));
module.exports = {
  scenario: 'lumber',
  goal: 'Find trees, collect 10 new logs, then return to the starting position.',
  task: {home:{x:10.5,y:64,z:20.5},target:10,collected:3,homeDistance:8.1,stage:'gathering',complete:false,finished:false,elapsedSeconds:40,remainingSeconds:260},
  candidates: {logs:[{position:{x:15,y:65,z:28},name:'oak_log',distance:2.7}],droppedLog:null,exploreDestination:{x:20,y:64,z:30}},
  position: { x: 12.5, y: 64, z: 28.3 }, health: 20, food: 20, headingDegrees: 90,
  terrain: {
    forward: samples('one_block_rise', 'grass_block'),
    left: samples('clear'), right: samples('blocked', 'oak_log', 'oak_log'), behind: samples('clear')
  },
  nearbyEntities: [{ name: 'sheep', distance: 6.2 }],
  recentActions: [{ action: 'harvest_nearest', outcome: 'mined oak_log; inventory verifies collection', distanceMoved: 2.8, position: { x: 12.5, y: 64, z: 28.3 } }]
};
