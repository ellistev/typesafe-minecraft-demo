const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Vec3}=require('vec3');
const {blueprint}=require('../src/flag.cjs');
const {resetCommands,shouldStartFresh,assertResetSite}=require('../src/flag-reset.cjs');
test('replay commands only reset demo wool, reposition the bot and replace its wool supplies',()=>{
 const commands=resetCommands({x:64,y:64,z:64},'TypeSafeExplorer',25576,'127.0.0.1');
 assert.equal(commands.length,7);
 assert.deepEqual(commands.filter(c=>c.startsWith('fill')),['fill 64 64 64 89 64 76 minecraft:air replace minecraft:red_wool','fill 64 64 64 89 64 76 minecraft:air replace minecraft:white_wool']);
 assert.deepEqual(commands.filter(c=>c.startsWith('clear')),['clear TypeSafeExplorer minecraft:red_wool','clear TypeSafeExplorer minecraft:white_wool']);
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
 const task={blueprint:blueprint({x:64,y:64,z:64})};
 const bot={blockAt:p=>({name:p.y===63?'grass_block':'red_wool',boundingBox:'block'})};
 assert.doesNotThrow(()=>assertResetSite(bot,task));
 bot.blockAt=p=>p.equals(new Vec3(64,64,64))?{name:'chest',boundingBox:'block'}:{name:'air',boundingBox:'block'};
 assert.throws(()=>assertResetSite(bot,task),/obstruction/);
 bot.blockAt=()=>null;assert.throws(()=>assertResetSite(bot,task),/obstruction/);
});
