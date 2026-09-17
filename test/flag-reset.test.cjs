const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Vec3}=require('vec3');
const {blueprint}=require('../src/flag.cjs');
const {banks}=require('../src/flag-resources.cjs');
const {resetCommands,shouldStartFresh,assertResetSite}=require('../src/flag-reset.cjs');
test('build-only test grants exact materials and empties the prepared supply beds',()=>{
 const args=[{x:64,y:64,z:64},'TypeSafeExplorer',25576,'127.0.0.1'];
 const commands=resetCommands(...args,true);
 assert.deepEqual(commands.filter(c=>/^give .*wool/.test(c)),['give TypeSafeExplorer minecraft:red_wool 234','give TypeSafeExplorer minecraft:white_wool 104']);
 assert.ok(commands.includes('fill 64 64 45 81 64 57 minecraft:air replace minecraft:red_wool'));
 assert.equal(resetCommands(...args).some(c=>/^give .*wool/.test(c)),false);
 assert.throws(()=>resetCommands(args[0],args[1],25575,args[3],true));
});
test('replay refills world wool supplies and never gives building wool',()=>{
 const commands=resetCommands({x:64,y:64,z:64},'TypeSafeExplorer',25576,'127.0.0.1');
 assert.equal(commands.some(c=>/^give .*wool/.test(c)),false);assert.ok(commands.includes('give TypeSafeExplorer minecraft:shears 2'));
 assert.deepEqual(commands.filter(c=>c.startsWith('fill')&&c.includes('minecraft:air replace')),['fill 64 64 64 89 64 76 minecraft:air replace minecraft:red_wool','fill 64 64 64 89 64 76 minecraft:air replace minecraft:white_wool']);
 assert.deepEqual(commands.filter(c=>c.startsWith('clear')&&c.includes('wool')),['clear TypeSafeExplorer minecraft:red_wool','clear TypeSafeExplorer minecraft:white_wool']);
 for(const args of [[{x:65,y:64,z:64},'TypeSafeExplorer',25576,'127.0.0.1'],[{x:64,y:64,z:64},'OtherPlayer',25576,'127.0.0.1'],[{x:64,y:64,z:64},'TypeSafeExplorer',25575,'127.0.0.1'],[{x:64,y:64,z:64},'TypeSafeExplorer',25576,'example.com']])assert.throws(()=>resetCommands(...args));
});
test('completed, expired and fresh starts reset; a paused unfinished task resumes',()=>{
 assert.equal(shouldStartFresh(null,null,900000,1000),true);
 assert.equal(shouldStartFresh({startedAt:0},{complete:false},900000,1000),false);
 assert.equal(shouldStartFresh({startedAt:0},{complete:true},900000,1000),true);
 assert.equal(shouldStartFresh({startedAt:0,finishedAt:900},{complete:false},900000,1000),true);
 assert.equal(shouldStartFresh({startedAt:0},{complete:false},900000,900001),true);
});
test('reset refuses unexpected blocks and missing supports before queuing commands',()=>{
 const task={origin:{x:64,y:64,z:64},blueprint:blueprint({x:64,y:64,z:64})};
 const bot={blockAt:p=>({name:p.y===63?'grass_block':'air',boundingBox:'block'})};
 assert.doesNotThrow(()=>assertResetSite(bot,task));
 bot.blockAt=p=>p.equals(new Vec3(64,64,64))?{name:'chest',boundingBox:'block'}:{name:'air',boundingBox:'block'};
 assert.throws(()=>assertResetSite(bot,task),/obstruction/);
 bot.blockAt=()=>null;assert.throws(()=>assertResetSite(bot,task),/obstruction/);
});

test('reset refuses obstructions in the supply beds as well as the flag',()=>{
 const task={origin:{x:64,y:64,z:64},blueprint:blueprint({x:64,y:64,z:64})};
 const target=banks(task.origin).find(c=>c.name==='white_wool').position;
 const bot={blockAt:p=>({name:p.y===63?'stone':p.x===target.x&&p.z===target.z?'chest':'air',boundingBox:'block'})};
 assert.throws(()=>assertResetSite(bot,task),/obstruction/);
});
