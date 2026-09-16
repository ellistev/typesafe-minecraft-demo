// Prints operator commands for a disposable demo world. Does not connect to a server.
const {resetCommands}=require('../src/flag-reset.cjs');
const commands=[
 'fill 60 63 41 95 63 80 minecraft:grass_block',
 'fill 60 64 41 95 80 80 minecraft:air',
 'fill 63 63 63 90 63 77 minecraft:polished_andesite',
 'fill 64 63 64 89 63 76 minecraft:smooth_quartz',
 'fill 63 63 44 82 63 58 minecraft:polished_andesite',
 'fill 83 63 44 92 63 58 minecraft:polished_andesite',
 ...resetCommands({x:64,y:64,z:64},'TypeSafeExplorer',25576,'127.0.0.1')
];
if(require.main===module)console.log(commands.join('\n'));
module.exports={commands};
