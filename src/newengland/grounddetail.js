import * as THREE from 'three';
import { rockMaterial, rockKinds } from '../rockmaterials.js';

// Small exposed inclusions and root ends follow the *current* worked surface.
// No new excavatable material, collision, inventory or saved state is created.
export function newEnglandGroundDetail(root, terrain, kit) {
  const geo = kit.cobble_3.clone(), setKind = rockKinds(geo, 720);
  const stones = new THREE.InstancedMesh(geo, rockMaterial('slate', { mixed:true, authored:true }), 720);
  const clod = new THREE.IcosahedronGeometry(1, 1), cp=clod.attributes.position;
  for(let i=0;i<cp.count;i++) {
    const x=cp.getX(i),y=cp.getY(i),z=cp.getZ(i);
    const r=.82+.16*Math.sin(x*5+y*3)+.09*Math.sin(z*6-y*2);
    cp.setXYZ(i,x*r,y*(.9+.12*Math.sin(x*4+z*3)),z*r);
  }
  clod.computeVertexNormals();
  const crumbs = new THREE.InstancedMesh(clod,
    new THREE.MeshStandardMaterial({ color:0x8b7150, roughness:1 }), 420);
  const roots = new THREE.InstancedMesh(new THREE.CylinderGeometry(.004, .006, 1, 5),
    new THREE.MeshStandardMaterial({ color:0x6e5940, roughness:1 }), 160);
  stones.name='NSW exposed inclusions';crumbs.name='NSW disturbed soil';roots.name='NSW exposed root ends';
  for (const mesh of [stones, crumbs, roots]) { mesh.count=0;mesh.receiveShadow=true;mesh.castShadow=true;root.add(mesh); }
  const d=new THREE.Object3D(), up=new THREE.Vector3(0,1,0), direction=new THREE.Vector3();
  const random=(x,z)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
  const cut=(x,z)=>terrain.sampleGrid(terrain.orig,x,z)-terrain.getHeight(x,z);
  return { update(player, low) {
    let ns=0,nc=0,nr=0;
    const step=low ? .24 : .16, radius=low ? 3 : 5;
    const x0=Math.floor((player.x-radius)/step),z0=Math.floor((player.z-radius)/step);
    const count=Math.ceil(radius*2/step);
    for(let j=0;j<count;j++)for(let i=0;i<count;i++) {
      const ix=x0+i,iz=z0+j,r=random(ix,iz);
      const x=(ix+.2+r*.6)*step,z=(iz+.2+random(iz,ix)*.6)*step;
      if(!terrain.inside(x,z))continue;
      const depth=cut(x,z);
      const adjacent=Math.max(cut(x+.20,z),cut(x-.20,z),cut(x,z+.20),cut(x,z-.20));
      const lip=depth<.035&&adjacent>.07;
      if((depth<.025&&!lip)||depth>1.4)continue;
      const overlay=terrain.overlayAt(x,z);
      if(overlay?.mine || overlay?.crystals?.some(e=>!e.c.collected&&Math.hypot(e.c.x-x,e.c.z-z)<.12))continue;
      const h=terrain.getHeight(x,z),edge=Math.min(cut(x+.16,z),cut(x-.16,z),cut(x,z+.16),cut(x,z-.16));
      d.position.set(x,h-.006,z);d.rotation.set(.3*r,r*6.28,.2*r);
      if(depth>.025&&r>.76&&ns<720) {
        const s=.012+r*.021;d.scale.set(s*1.2,s*.6,s);d.updateMatrix();
        stones.setMatrixAt(ns,d.matrix);setKind(ns++,'slate',terrain.creek.waterY(z));
      }
      // Sparse clusters on the retained lip, not an evenly spaced pebble ring.
      // Their lower halves remain buried in the actual ground.
      if(lip&&r>.72&&Math.sin(x*8+Math.sin(z*4))>.15&&nc<420) {
        const s=Math.min(.065,.025+adjacent*.10)*(.6+r*.4);
        d.scale.set(s*1.4,s*.65,s);d.position.y=h-s*.12;d.updateMatrix();crumbs.setMatrixAt(nc++,d.matrix);
      } else if(edge<depth*.65&&r>.75&&nc<420) {
        const s=.009+r*.022;d.scale.set(s*1.4,s*.6,s);d.position.y=h-s*.1;d.updateMatrix();crumbs.setMatrixAt(nc++,d.matrix);
      }
      // Root tips appear only just below the old organic surface at a cut lip.
      if(depth>.025&&depth<.16&&edge<.018&&r>.80&&nr<160) {
        const a=r*6.28,ex=x+Math.cos(a)*.08,ez=z+Math.sin(a)*.08,ey=terrain.getHeight(ex,ez);
        direction.set(ex-x,ey-h,ez-z);const length=direction.length();
        d.position.set((x+ex)*.5,(h+ey)*.5+.003,(z+ez)*.5);
        d.quaternion.setFromUnitVectors(up,direction.normalize());d.scale.setScalar(1);d.scale.y=length;d.updateMatrix();roots.setMatrixAt(nr++,d.matrix);
      }
    }
    for(const [mesh,n] of [[stones,ns],[crumbs,nc],[roots,nr]]) {mesh.count=n;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
    stones.geometry.attributes.aRockWater.needsUpdate=true;
  }};
}
