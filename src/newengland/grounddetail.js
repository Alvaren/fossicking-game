import * as THREE from 'three';
import { rockMaterial, rockKinds } from '../rockmaterials.js';

// Disturbed material outside a real cut, biased into broad lobes rather than
// a bead ring. This is a visual rim, not additional recoverable inventory.
export function spoilRise(terrain,x,z) {
  const cut=(px,pz)=>Math.max(0,terrain.sampleGrid(terrain.orig,px,pz)-terrain.getHeight(px,pz));
  const own=cut(x,z);
  if(own>.12)return 0;
  let nearby=0;
  for(const [dx,dz] of [[.35,0],[-.35,0],[0,.35],[0,-.35],[.5,.3],[-.5,-.3],[.3,-.5],[-.3,.5]])nearby=Math.max(nearby,cut(x+dx,z+dz));
  const lobe=Math.pow(Math.max(0,Math.sin(x*2.15+z*1.13)*.65+.35),2);
  return Math.min(.14,Math.max(0,nearby-.04)*.48)*lobe*Math.pow(1-own/.12,2);
}

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
  const spoilGeo=new THREE.BufferGeometry(),capacity=40000;
  const spoilPos=new THREE.BufferAttribute(new Float32Array(capacity*3),3),spoilColour=new THREE.BufferAttribute(new Float32Array(capacity*3),3),spoilNormals=new THREE.BufferAttribute(new Float32Array(capacity*3),3);
  spoilGeo.setAttribute('position',spoilPos);spoilGeo.setAttribute('color',spoilColour);spoilGeo.setAttribute('normal',spoilNormals);spoilGeo.setDrawRange(0,0);
  const spoil=new THREE.Mesh(spoilGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));
  spoil.name='NSW disturbed rim';spoil.receiveShadow=true;spoil.castShadow=true;spoil.visible=false;spoil.frustumCulled=false;root.add(spoil);
  const d=new THREE.Object3D(), up=new THREE.Vector3(0,1,0), direction=new THREE.Vector3();
  const random=(x,z)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
  const cut=(x,z)=>terrain.sampleGrid(terrain.orig,x,z)-terrain.getHeight(x,z);
  let lastKey;
  return { update(player, low) {
    let ns=0,nc=0,nr=0;
    const step=low ? .24 : .16, radius=low ? 3 : 5;
    const x0=Math.floor((player.x-radius)/step),z0=Math.floor((player.z-radius)/step);
    const crystals=(terrain.overlays||[]).map(o=>(o.crystals||[]).map(e=>Number(!!e.c.collected)).join('')).join(';');
    const key=[x0,z0,low,terrain.revision,crystals].join(':');
    if(terrain.revision!==undefined&&key===lastKey)return;
    lastKey=key;
    const count=Math.ceil(radius*2/step);
    let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for(let j=0;j<count;j++)for(let i=0;i<count;i++) {
      const ix=x0+i,iz=z0+j,r=random(ix,iz);
      const x=(ix+.2+r*.6)*step,z=(iz+.2+random(iz,ix)*.6)*step;
      if(!terrain.inside(x,z))continue;
      const depth=cut(x,z);
      if(depth>.025){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);}
      const adjacent=Math.max(cut(x+.20,z),cut(x-.20,z),cut(x,z+.20),cut(x,z-.20));
      const lip=depth<.035&&adjacent>.07;
      if((depth<.025&&!lip)||depth>1.4)continue;
      const overlay=terrain.overlayAt(x,z);
      if(overlay?.mine || overlay?.crystals?.some(e=>!e.c.collected&&Math.hypot(e.c.x-x,e.c.z-z)<.12))continue;
      const h=terrain.getHeight(x,z),edge=Math.min(cut(x+.16,z),cut(x-.16,z),cut(x,z+.16),cut(x,z-.16));
      d.position.set(x,h-.006,z);d.rotation.set(.3*r,r*6.28,.2*r);
      if(depth>.025&&r>.76&&ns<720) {
        const s=.012+r*.021;d.scale.set(s*1.2,s*.6,s);d.updateMatrix();
        stones.setMatrixAt(ns,d.matrix);setKind(ns++,'slate',terrain.creek.waterY(z,x));
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
    let vertices=0;
    if(minX<Infinity) {
      const grid=[],spacing=low?.16:.10,startX=minX-.65,startZ=minZ-.65;
      const nx=Math.min(100,Math.ceil((maxX-minX+1.3)/spacing)),nz=Math.min(100,Math.ceil((maxZ-minZ+1.3)/spacing));
      for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++) {
        const x=startX+i*spacing,z=startZ+j*spacing,h=terrain.getHeight(x,z),o=terrain.overlayAt(x,z);
        const clear=terrain.inside(x,z)&&!o?.mine&&!o?.crystals?.some(e=>!e.c.collected&&Math.hypot(e.c.x-x,e.c.z-z)<.16);
        const rise=clear&&h>terrain.creek.waterY(z,x)+.03?spoilRise(terrain,x,z):0;
        grid.push({x,z,y:h+rise,rise,clear,normal:new THREE.Vector3(0,1,0)});
      }
      for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++) {
        const left=grid[j*(nx+1)+Math.max(0,i-1)],right=grid[j*(nx+1)+Math.min(nx,i+1)];
        const back=grid[Math.max(0,j-1)*(nx+1)+i],front=grid[Math.min(nz,j+1)*(nx+1)+i];
        grid[j*(nx+1)+i].normal.set(left.y-right.y,spacing*2,back.y-front.y).normalize();
      }
      const emit=(a,b,c)=>{
        if(vertices+3>capacity||!a.clear||!b.clear||!c.clear||Math.max(a.rise,b.rise,c.rise)<.008)return;
        for(const p of [a,b,c]) {
          const tone=.92+.04*Math.sin(p.x*7+p.z*8);
          spoilPos.setXYZ(vertices,p.x,p.y+.003,p.z);spoilNormals.setXYZ(vertices,p.normal.x,p.normal.y,p.normal.z);
          spoilColour.setXYZ(vertices,.25*tone,.162*tone,.085*tone);vertices++;
        }
      };
      for(let j=0;j<nz;j++)for(let i=0;i<nx;i++) {
        const a=grid[j*(nx+1)+i],b=grid[j*(nx+1)+i+1],c=grid[(j+1)*(nx+1)+i],d=grid[(j+1)*(nx+1)+i+1];
        emit(a,c,b);emit(b,c,d);
      }
    }
    spoilGeo.setDrawRange(0,vertices);spoil.visible=vertices>0;
    spoilPos.needsUpdate=true;spoilColour.needsUpdate=true;spoilNormals.needsUpdate=true;
  }};
}
