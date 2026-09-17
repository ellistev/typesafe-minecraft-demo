/* global THREE */
window.addEventListener('demo-viewer-ready',({detail:{viewer,socket}})=>{
 let state={},lastPosition=null,walkingUntil=0,swingUntil=0;
 const textures=new Map();
 function texture(name,kind){const key=kind+'/'+name;if(!textures.has(key)){const t=new THREE.TextureLoader().load('textures/1.16.4/'+key+'.png');t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;textures.set(key,t);}return textures.get(key);}
 socket.on('avatar-state',data=>{
  const now=performance.now();
  if(lastPosition&&Math.hypot(data.pos.x-lastPosition.x,data.pos.z-lastPosition.z)>.005)walkingUntil=now+150;
  if(data.digging||data.swing)swingUntil=now+250;
  state=data;lastPosition=data.pos;
 });
 function animate(){
  requestAnimationFrame(animate);
  const mesh=viewer.entities.entities['controlled-player'];if(!mesh)return;
  const now=performance.now(),walk=now<walkingUntil?Math.sin(now*.012)*.55:0;
  mesh.traverse(part=>{
   if(!part.isSkinnedMesh)return;
   const bones=part.skeleton.bones;if(bones.length<15)return;
   if(!part.userData.rigReady){
    // The stock static mesh stores absolute pivots on parented bones. Convert
    // them to local pivots before animating, otherwise limbs orbit away.
    const pivots=bones.map(b=>b.position.clone());
    bones.forEach((b,i)=>{const parent=bones.indexOf(b.parent);if(parent>=0)b.position.copy(pivots[i]).sub(pivots[parent]);});
    part.updateMatrixWorld(true);part.bind(new THREE.Skeleton(bones));part.userData.rigReady=true;
   }
   // Bone order is the pinned viewer's player geometry: head, arms, legs.
   bones[3].rotation.x=-Math.max(-1,Math.min(1,state.pitch||0));
   bones[6].rotation.x=walk;bones[9].rotation.x=now<swingUntil?-1.1+Math.sin(now*.028)*.65:-walk;
   bones[12].rotation.x=-walk;bones[14].rotation.x=walk;
   const hand=bones[11],item=['shears','red_wool','white_wool'].includes(state.heldItem)?state.heldItem:null;
   if(part.userData.heldItem!==item){
    const old=part.userData.tool;if(old){hand.remove(old);old.geometry.dispose();old.material.dispose();}
    part.userData.heldItem=item;part.userData.tool=null;
    if(item){
     const shears=item==='shears',geometry=shears?new THREE.PlaneGeometry(10,10):new THREE.BoxGeometry(5,5,5);
     const material=new THREE.MeshLambertMaterial({map:texture(item,shears?'items':'blocks'),transparent:shears,alphaTest:.1,side:THREE.DoubleSide});
     const tool=new THREE.Mesh(geometry,material);tool.position.set(0,-1,-3);tool.rotation.z=-Math.PI/4;hand.add(tool);part.userData.tool=tool;
    }
   }
  });
 }
 animate();
});
