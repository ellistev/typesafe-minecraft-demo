// Prints operator commands. Never connects to or mutates a Minecraft server.
// Only run these commands in an isolated disposable demo world: the pad is cleared.
const commands=[
 'fill 60 63 60 93 63 80 minecraft:grass_block',
 'fill 60 64 60 93 80 80 minecraft:air',
 'tp TypeSafeExplorer 61.5 64 70.5',
 'give TypeSafeExplorer minecraft:red_wool 234',
 'give TypeSafeExplorer minecraft:white_wool 104'
];
if(require.main===module)console.log(commands.join('\n'));
module.exports={commands};
