const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Vec3}=require('vec3');
const {cameraPacket,avatarPacket}=require('../src/camera.cjs');
const bot=()=>({entity:{position:new Vec3(10,64,20),yaw:0,pitch:.2},blockAt:()=>({boundingBox:'empty'})});
test('third-person camera follows behind the player without mutating its position',()=>{
 const b=bot(),before=b.entity.position.clone(),p=cameraPacket(b,'third');
 assert.equal(p.pos.z,25);assert.ok(p.pos.y>64);assert.ok(p.pitch<0);assert.ok(b.entity.position.equals(before));
 b.entity.yaw=Math.PI/2;assert.ok(cameraPacket(b,'third').pos.x>before.x);
 assert.equal(avatarPacket(b,'third').name,'player');assert.equal(avatarPacket(b,'player').delete,true);
});
test('camera pulls in at solid or unloaded terrain and preserves first-person view',()=>{
 const b=bot();b.blockAt=p=>p.z>=22?{boundingBox:'block'}:{boundingBox:'empty'};
 assert.ok(cameraPacket(b,'third').pos.z<22);
 b.blockAt=()=>null;assert.ok(cameraPacket(b,'third').pos.z<21);
 assert.deepEqual(cameraPacket(b,'player'),{pos:b.entity.position,yaw:0,pitch:.2});
 assert.equal(cameraPacket(b,'overview',{origin:{x:64,y:64,z:64}}).pos.x,77);
});
