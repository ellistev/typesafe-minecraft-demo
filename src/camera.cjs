const {Vec3}=require('vec3');
// Camera packets affect only the renderer, never the player's position or controls.
function cameraPacket(bot,mode,task){
 const p=bot.entity.position,yaw=bot.entity.yaw;
 if(mode==='overview'&&task)return {pos:{x:task.origin.x+13,y:task.origin.y+38,z:task.origin.z+28},yaw:0,pitch:-Math.atan2(38,32)};
 if(mode!=='third')return {pos:p,yaw,pitch:bot.entity.pitch};
 const target=p.offset(0,1.2,0),offset=new Vec3(Math.sin(yaw)*5-Math.cos(yaw)*2.5,3,Math.cos(yaw)*5+Math.sin(yaw)*2.5);
 // Pull the camera in when a solid or unloaded block obstructs the sight line.
 let fraction=1;
 for(let t=.08;t<=1;t+=.04){const b=bot.blockAt(target.plus(offset.scaled(t)).floored());if(!b||b.boundingBox==='block'){fraction=Math.max(.04,t-.08);break;}}
 const eye=target.plus(offset.scaled(fraction));
 return {pos:{x:eye.x,y:eye.y-1.6,z:eye.z},yaw:yaw-Math.atan2(2.5,5),pitch:-Math.atan2(3,Math.hypot(5,2.5))};
}
function avatarPacket(bot,mode){return mode==='player'?{id:'controlled-player',delete:true}:{id:'controlled-player',name:'player',pos:bot.entity.position,yaw:bot.entity.yaw||1e-8,width:.6,height:1.8};}
module.exports={cameraPacket,avatarPacket};
