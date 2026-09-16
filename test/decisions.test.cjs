const { test } = require('node:test');
const assert = require('node:assert/strict');
const { actions,requestFor,validateAnswer,decide,isFresh } = require('../src/decisions.cjs');
const { inspect } = require('../src/observe.cjs');
const { Vec3 } = require('vec3');
const valid = () => ({answers:{movement:{type:'choice',choice:'harvest_nearest',confidence:.9,probabilities:Object.fromEntries(Object.keys(actions).map(k=>[k,k==='harvest_nearest'?1:0]))}}});
test('captured input is the exact sent JSON body and excludes authentication',async()=>{
 let sent;
 const result=await decide({goal:'collect logs',position:{x:1,y:64,z:2}},{key:'private-test-secret',fetchImpl:async(url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>valid()};}});
 assert.deepEqual(result.request,sent);assert.equal(JSON.stringify(result.request).includes('private-test-secret'),false);assert.equal(Object.hasOwn(result.request,'headers'),false);
});
test('request supplies observed state and bounded actions',()=>{const state={goal:'explore'};const r=requestFor(state);assert.equal(r.state,state);assert.equal(r.model,'jev-latest');assert.deepEqual(r.questions.movement.criteria,actions);});
test('invalid or unrecognized API responses cannot become control inputs',()=>{assert.equal(validateAnswer(valid()).choice,'harvest_nearest');for(const bad of [null,{answers:{}},{answers:{movement:{...valid().answers.movement,choice:'destroy_world'}}}])assert.throws(()=>validateAnswer(bad));const bad=valid();bad.answers.movement.probabilities.harvest_nearest=2;assert.throws(()=>validateAnswer(bad));});
test('stale decisions and moved observations are rejected',()=>{assert.ok(isFresh({x:0,y:1,z:0},{x:0,y:1,z:0},100));assert.equal(isFresh({x:0,y:1,z:0},{x:2,y:1,z:0},100),false);assert.equal(isFresh({x:0,y:1,z:0},{x:0,y:1,z:0},6000),false);});
test('API transport sends authentication only to the TypeSafe endpoint',async()=>{let called=false;const r=await decide({goal:'explore'},{key:'test-key',fetchImpl:async(url,options)=>{called=true;assert.equal(url,'https://api.typesafe.ai/v1/systemone');assert.equal(options.headers.Authorization,'Bearer test-key');assert.equal(JSON.parse(options.body).questions.movement.type,'choice');return{ok:true,json:async()=>valid()};}});assert.ok(called);assert.equal(r.answer.choice,'harvest_nearest');});
test('missing key and API failures fail closed',async()=>{await assert.rejects(decide({},{}),/missing/);await assert.rejects(decide({},{key:'test',fetchImpl:async()=>({ok:false,status:429})}),/429/);});
test('terrain distinguishes a floor, rise, wall, water, cliff and unloaded block',()=>{
 const air={name:'air',boundingBox:'empty'},stone={name:'stone',boundingBox:'block'};
 function probe(blocks){return inspect({entity:{position:new Vec3(.5,1,.5)},blockAt:p=>blocks[p.y]},0,1);}
 assert.equal(probe([stone,air,air,air]).status,'clear');
 assert.equal(probe([stone,stone,air,air]).status,'one_block_rise');
 assert.equal(probe([stone,stone,stone,air]).status,'blocked');
 assert.equal(probe([stone,{name:'water',boundingBox:'empty'},air,air]).status,'hazard');
 assert.equal(probe([air,air,air,air]).status,'drop_or_no_floor');
 assert.equal(probe([stone,null,air,air]).status,'unknown');
});
