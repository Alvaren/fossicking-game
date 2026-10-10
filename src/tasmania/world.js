import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import * as western from './model.js';
import { rockMaterial, rockKinds } from '../rockmaterials.js';
const material = (color,extra={}) => new THREE.MeshStandardMaterial({color,roughness:.94,...extra});
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));

function fernGeometry() {
  const vertices=[];
  for(let f=0;f<9;f++) {
    const a=f*Math.PI*2/9,dx=Math.cos(a),dz=Math.sin(a);
    for(let j=1;j<10;j++) {
      const t=j/10,px=dx*t,pz=dz*t,y=Math.sin(t*Math.PI)*.42;
      const length=(1-t)*.3+.035;
      for(const side of [-1,1]) {
        const tx=px-dz*length*side-dx*.11,tz=pz+dx*length*side-dz*.11;
        vertices.push(px,y,pz,tx,y-.055,tz,px+dx*.1,y-.01,pz+dz*.1);
      }
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g;
}
function labelTexture(title,subtitle='') {
  const c=document.createElement('canvas');c.width=512;c.height=160;
  const g=c.getContext('2d');g.fillStyle='#b8ab80';g.fillRect(0,0,512,160);g.fillStyle='#24382d';g.textAlign='center';g.font='bold 38px Georgia';g.fillText(title,256,67);g.font='23px system-ui';g.fillText(subtitle,256,118);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function buildCatchment(scene,model,expedition,low=false,profile=western) {
  const {riverX,riverWidth,waterY,TRAILHEAD,CAMP,nearestTrail,northeast}=profile;
  const colliders=[],rand=mulberry32(model.seed+813),dummy=new THREE.Object3D();
  const groundGeo=new THREE.PlaneGeometry(300,340,180,204);groundGeo.rotateX(-Math.PI/2);
  const pos=groundGeo.attributes.position,colors=new Float32Array(pos.count*3),color=new THREE.Color();
  for(let i=0;i<pos.count;i++) {
    const x=pos.getX(i),z=pos.getZ(i),y=model.height(x,z);pos.setY(i,y);
    const d=Math.abs(x-riverX(z)),trail=nearestTrail(x,z).distance;
    const tint=model.noise(x*.15,z*.15)*.07;
    if(d<riverWidth(z)+.5)color.setRGB((northeast?.39:.23)+tint,(northeast?.35:.27)+tint,(northeast?.28:.25)+tint);
    else if(trail<1.5)color.setRGB(.28+tint,.26+tint,.19+tint);
    else color.setRGB(.15+tint,.22+tint,.13+tint);
    colors.set([color.r,color.g,color.b],i*3);
  }
  groundGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));groundGeo.computeVertexNormals();
  const ground=new THREE.Mesh(groundGeo,material(0xffffff,{vertexColors:true}));ground.receiveShadow=true;scene.add(ground);

  const waterGeo=new THREE.PlaneGeometry(1,1,16,360),wp=waterGeo.attributes.position;
  for(let i=0;i<wp.count;i++) {
    const t=wp.getY(i)+.5,z=(t-.5)*340,q=wp.getX(i)*2;
    wp.setXYZ(i,riverX(z)+q*(riverWidth(z)+.08),waterY(z),z);
  }
  waterGeo.computeVertexNormals();
  const waterMat=new THREE.MeshPhysicalMaterial({color:northeast?0x686444:0x426d67,roughness:.27,metalness:.12,transparent:true,opacity:.52,side:THREE.DoubleSide,depthWrite:false});
  const water=new THREE.Mesh(waterGeo,waterMat);scene.add(water);
  // Broken whitewater follows the steeper rock step above the plunge pool.
  const cascadeRand=mulberry32(model.seed+645),cascadeVertices=[];
  for(let ribbon=0;ribbon<(northeast?0:36);ribbon++) {
    const q=(cascadeRand()-.5)*1.8, width=.02+cascadeRand()*.04;
    for(let step=0;step<24;step++) {
      const a=-78+step*.48+cascadeRand()*.45,b=a+.14+cascadeRand()*.65;
      const xz=z=>riverX(z)+(q+Math.sin(z*1.6+ribbon)*.015)*riverWidth(z);
      const ax=xz(a),bx=xz(b),ay=waterY(a)+.045,by=waterY(b)+.045;
      cascadeVertices.push(ax-width,ay,a,ax+width,ay,a,bx+width,by,b,ax-width,ay,a,bx+width,by,b,bx-width,by,b);
    }
  }
  const cascadeGeo=new THREE.BufferGeometry();cascadeGeo.setAttribute('position',new THREE.Float32BufferAttribute(cascadeVertices,3));
  const cascade=new THREE.Mesh(cascadeGeo,new THREE.MeshBasicMaterial({color:0xe0efdd,transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide}));scene.add(cascade);
  const rippleGeo=new THREE.PlaneGeometry(.4,1.2);rippleGeo.rotateX(-Math.PI/2);
  const foam=new THREE.InstancedMesh(rippleGeo,new THREE.MeshBasicMaterial({color:0xd9eee5,transparent:true,opacity:.34,depthWrite:false,side:THREE.DoubleSide}),low?110:230);
  const ripples=[];
  for(let i=0;i<foam.count;i++)ripples.push({z:rand()*300-150,q:(rand()-.5)*1.7,s:.4+rand()});
  scene.add(foam);

  const trunkGeo=new THREE.CylinderGeometry(.13,.3,1,7),bark=material(0x56584a);
  const leafGeo=new THREE.IcosahedronGeometry(1,1),leaves=material(0xffffff);
  const treeCount=northeast?(low?430:850):(low?720:1400),trunks=new THREE.InstancedMesh(trunkGeo,bark,treeCount),crowns=new THREE.InstancedMesh(leafGeo,leaves,treeCount*3);
  let placed=0;
  while(placed<treeCount) {
    const x=rand()*250-125,z=rand()*300-150;
    if(Math.abs(x-riverX(z))<riverWidth(z)+2.5||nearestTrail(x,z).distance<2.5||Math.hypot(x-CAMP.x,z-CAMP.z)<6||Math.hypot(x-TRAILHEAD.x,z-TRAILHEAD.z)<7)continue;
    const y=model.height(x,z),h=9+rand()*10,s=.7+rand()*.8;
    dummy.position.set(x,y+h/2,z);dummy.rotation.set((rand()-.5)*.06,rand()*6.28,(rand()-.5)*.07);dummy.scale.set(s,h,s);dummy.updateMatrix();trunks.setMatrixAt(placed,dummy.matrix);
    for(let k=0;k<3;k++){dummy.position.set(x+(rand()-.5)*3,y+h-1+k*1.2,z+(rand()-.5)*3);dummy.rotation.set(rand(),rand()*6.28,rand());dummy.scale.set(4.4*s,2.8*s,4.7*s);dummy.updateMatrix();crowns.setMatrixAt(placed*3+k,dummy.matrix);crowns.setColorAt(placed*3+k,new THREE.Color().setHSL(.32+rand()*.08,.22,.15+rand()*.07));}
    colliders.push({x,z,r:.3*s});placed++;
  }
  scene.add(trunks,crowns);trunks.castShadow=true;crowns.castShadow=!low;

  const fernMat=material(0x4f7644,{side:THREE.DoubleSide}),fernGeo=fernGeometry();
  const fernCount=northeast?(low?500:900):(low?1000:1800),ferns=new THREE.InstancedMesh(fernGeo,fernMat,fernCount),fernTrunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.13,.22,1,7),material(0x493d2c),Math.floor(fernCount/4));
  let ft=0;
  for(let i=0;i<fernCount;i++) {
    let x,z;
    do{x=rand()*170-85;z=rand()*290-145;}while(Math.abs(x-riverX(z))<riverWidth(z)+1||nearestTrail(x,z).distance<1.8||Math.hypot(x-CAMP.x,z-CAMP.z)<5);
    const tree=i%4===0,h=tree?1.4+rand()*1.6:0,scale=tree?2+rand():.95+rand()*.9,y=model.height(x,z);
    if(tree){dummy.position.set(x,y+h/2,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,h,1);dummy.updateMatrix();fernTrunks.setMatrixAt(ft++,dummy.matrix);}
    dummy.position.set(x,y+h,z);dummy.rotation.set(0,rand()*6.28,0);dummy.scale.setScalar(scale);dummy.updateMatrix();ferns.setMatrixAt(i,dummy.matrix);
  }
  fernTrunks.count=ft;scene.add(ferns,fernTrunks);
  const rockGeo=new THREE.IcosahedronGeometry(1,1),rp=rockGeo.attributes.position;
  for(let i=0;i<rp.count;i++){const s=.83+rand()*.3;rp.setXYZ(i,rp.getX(i)*s,rp.getY(i)*s,rp.getZ(i)*s);}rockGeo.computeVertexNormals();
  const rocks=new THREE.InstancedMesh(rockGeo,rockMaterial('slate',{mixed:true}),190);
  rocks.name='Catchment geology';
  const setRockKind=rockKinds(rockGeo,190);
  for(let i=0;i<190;i++) {
    let x,z,s;
    do{z=rand()*280-140;x=riverX(z)+(rand()-.5)*65;s=.5+rand()*1.8;}while(nearestTrail(x,z).distance<s+1.6||Math.hypot(x-CAMP.x,z-CAMP.z)<5||model.sites.some(p=>Math.hypot(x-p.x,z-p.z)<s+2));
    dummy.position.set(x,model.height(x,z)+s*.2,z);dummy.rotation.set(rand(),rand()*6.28,rand()*.3);dummy.scale.set(s,s*.55,s*.85);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);rocks.setColorAt(i,new THREE.Color().setHSL(northeast?.09:.22,northeast?.07:.10+rand()*.15,northeast?(i%4?.46:.19):.22+rand()*.12));colliders.push({x,z,r:s*.8});
    setRockKind(i,northeast?(z<-55?(i%4?'basalt':'granite'):(i%4?'granite':'basalt')):'slate');
  }
  scene.add(rocks);
  for(let i=0;i<12;i++) {
    const z=rand()*240-120,x=riverX(z)+(i%2?1:-1)*(riverWidth(z)+4+rand()*10);
    if(nearestTrail(x,z).distance<6)continue;
    const log=new THREE.Mesh(new THREE.CylinderGeometry(.3,.45,6+rand()*3,9),material(0x464130));log.position.set(x,model.height(x,z)+.3,z);log.rotation.set(Math.PI/2,0,rand()*2);scene.add(log);
  }

  const siteGroups=[];
  for(const s of model.sites) {
    const group=new THREE.Group();group.position.set(s.x,model.height(s.x,s.z)+.04,s.z);scene.add(group);
    const pocket=new THREE.Mesh(new THREE.CircleGeometry(s.kind==='bar'?.75:.55,12),material(s.kind==='bar'?0x8d8a70:0x232b28));pocket.rotation.x=-Math.PI/2;group.add(pocket);
    if(northeast){
      // Natural mixed gravel, not the western slate cracks or a target outline.
      const gravel=new THREE.Group();group.add(gravel);
      for(let k=0;k<12;k++){const stone=new THREE.Mesh(rockGeo,rockMaterial(k%4?'granite':'basalt',{wet:true}));const angle=rand()*6.28,r=rand()*.85;stone.position.set(Math.cos(angle)*r,.015,Math.sin(angle)*r);stone.scale.set(.09+rand()*.12,.04+rand()*.06,.08+rand()*.14);gravel.add(stone);}
    }else for(let k=0;k<3;k++){const slab=new THREE.Mesh(new THREE.BoxGeometry(.18,.09,1.5),rockMaterial('slate',{wet:true}));slab.position.set((k-1)*.37,.03,0);slab.rotation.y=.4;group.add(slab);}
    siteGroups.push({s,group,pocket});
  }
  for(const p of model.snipingPockets) {
    const slab=new THREE.Mesh(new THREE.BoxGeometry(1.6,.13,.8),rockMaterial('slate',{wet:true}));slab.position.set(p.x,model.height(p.x,p.z)+.07,p.z);scene.add(slab);
    const crack=new THREE.Mesh(new THREE.BoxGeometry(1.3,.02,.055),material(0x111c19));crack.position.copy(slab.position);crack.position.y+=.08;scene.add(crack);
  }
  function sign(point,title,subtitle) {
    const g=new THREE.Group();g.position.set(point.x,model.height(point.x,point.z),point.z);
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.06,.07,1.8,6),material(0x594c37));post.position.y=.9;g.add(post);
    const face=new THREE.Mesh(new THREE.BoxGeometry(2.4,.75,.09),material(0xa99c76));face.position.y=1.7;g.add(face);
    const text=new THREE.Mesh(new THREE.PlaneGeometry(2.35,.73),new THREE.MeshBasicMaterial({map:labelTexture(title,subtitle)}));text.position.set(0,1.7,.051);g.add(text);scene.add(g);return g;
  }
  sign({x:TRAILHEAD.x+3,z:TRAILHEAD.z-2},northeast?'TIN FERN RIVER':'FERN RIVER',northeast?'River access · carry hand tools':'Foot track · carry your gear');
  sign({x:CAMP.x-3,z:CAMP.z-2},northeast?'GRANITE BEND':'FERN BEND','Light camp · return via track');
  if(northeast){
    const road=new THREE.Mesh(new THREE.PlaneGeometry(32,8,24,4).rotateX(-Math.PI/2),material(0x8b826c));
    const rp=road.geometry.attributes.position;for(let i=0;i<rp.count;i++){const x=TRAILHEAD.x+rp.getX(i),z=TRAILHEAD.z+rp.getZ(i);rp.setXYZ(i,x,model.height(x,z)+.035,z);}road.geometry.computeVertexNormals();road.receiveShadow=true;scene.add(road);
  }
  const camp=new THREE.Group();camp.position.set(CAMP.x,CAMP.y,CAMP.z);scene.add(camp);
  const canvas=material(0x697456,{side:THREE.DoubleSide});
  const roofGeo=new THREE.BufferGeometry();roofGeo.setAttribute('position',new THREE.Float32BufferAttribute([-1.3,0,-1,0,1.3,-1,0,1.3,1,-1.3,0,-1,0,1.3,1,-1.3,0,1,0,1.3,-1,1.3,0,-1,1.3,0,1,0,1.3,-1,1.3,0,1,0,1.3,1],3));roofGeo.computeVertexNormals();camp.add(new THREE.Mesh(roofGeo,canvas));
  const bed=new THREE.Mesh(new THREE.BoxGeometry(.8,.14,1.75),material(0x314d43));bed.position.y=.1;camp.add(bed);
  const cloud=new THREE.Mesh(new THREE.CircleGeometry(2,28),new THREE.MeshBasicMaterial({color:0x958b69,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));cloud.rotation.x=-Math.PI/2;scene.add(cloud);
  return {ground,water,camp,colliders,siteGroups,cloud,
    disturb(site){cloud.position.set(site.x,waterY(site.z)+.025,site.z);cloud.material.opacity=.55;},
    update(dt,time,state){
      camp.visible=state.campPitched;
      for(const p of siteGroups){const empty=(state.siteUse[p.s.id]||0)>=p.s.capacity;p.pocket.material.color.setHex(empty?0x343e38:p.s.kind==='bar'?0x8d8a70:0x232b28);}
      waterMat.opacity=.5+Math.sin(time*.3)*.015;cascade.material.opacity=.45+Math.sin(time*3)*.07;
      ripples.forEach((r,i)=>{const z=((r.z+time*.55+170)%340)-170;dummy.position.set(riverX(z)+r.q*riverWidth(z),waterY(z)+.025,z);dummy.rotation.set(0,Math.sin(z*.03)*.2,0);dummy.scale.set(r.s,1,r.s);dummy.updateMatrix();foam.setMatrixAt(i,dummy.matrix);});foam.instanceMatrix.needsUpdate=true;
      cloud.material.opacity=Math.max(0,cloud.material.opacity-dt*.023);cloud.position.z+=dt*.16;
    }};
}
