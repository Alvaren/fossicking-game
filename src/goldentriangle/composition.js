import * as THREE from 'three';
import { coverAt } from '../newengland/groundcover.js';

// Goldfield dressing follows the original reef, shallow diggings and creek.
// This stream belongs to art only; finds, deposits and tree anchors stay fixed.
export function composeGoldenTriangle({ terrain, world, mask, workingMask, rng, add, rockAnchors }) {
  const c=terrain.creek, matrix=new THREE.Matrix4();
  const disturbed=(x,z)=>terrain.workings.some(p=>Math.hypot(x-p.x,z-p.z)<p.r*1.35);
  const put=(name,x,z,scale,options={})=>{
    const radius=options.radius??scale*.45;
    if(!terrain.inside(x,z)||(options.surface?workingMask:mask).blocked(x,z,radius))return;
    const y=terrain.getHeight(x,z);
    add(name,{x,z,y,scale,radius,lift:-.025,rotation:rng()*Math.PI*2,rank:rng(),...options});
  };
  const tuft=(x,z,spread,count)=>{
    for(let k=0;k<count;k++) {
      const angle=rng()*Math.PI*2,d=Math.sqrt(rng())*spread;
      const px=x+Math.cos(angle)*d,pz=z+Math.sin(angle)*d;
      if(disturbed(px,pz)||terrain.getHeight(px,pz)<c.surfaceY(pz)+.06||rng()>1-d/spread*.7)continue;
      put('grass_'+k%3,px,pz,.38+rng()*.55,{sy:.65+rng()*.3});
    }
  };
  // Open woodland with irregular tussock and low shrub islands. Bare leaf-
  // litter corridors are intentional, especially beside the shallow workings.
  for(let i=0;i<13500;i++) {
    const x=-103+rng()*206,z=-103+rng()*206,patch=coverAt(x,z),p=c.local(x,z,{});
    if(p.d-p.w<1.4||patch<.52||disturbed(x,z)||rng()>(patch-.45)*1.35)continue;
    const h=terrain.getHeight(x,z);
    if(Math.abs(terrain.getHeight(x+.5,z)-h)>.55)continue;
    put('grass_'+i%3,x,z,.42+rng()*.6,{sy:.64+rng()*.25,rank:rng()*.8});
    if(i%15===0&&patch>.67)put('shrub_'+i%3,x+.6,z-.3,.35+rng()*.45,{radius:.55});
  }
  for(const batch of world.lod.batches.filter(b=>b.source.userData.tree))for(let i=0;i<batch.source.count;i++) {
    batch.source.getMatrixAt(i,matrix);
    if(!matrix.elements[0]&&!matrix.elements[2])continue;
    const x=matrix.elements[12],z=matrix.elements[14];
    if(i%3===0)tuft(x+1.4,z-.7,3.2,70);
    if(i%2===0)put('branch_'+i%3,x+.9,z+.65,.45+rng()*.45,{radius:.24,lift:-.045});
  }
  for(let i=0;i<700;i++) {
    const angle=rng()*Math.PI*2,d=17+rng()*12;
    const x=terrain.camp.x+Math.cos(angle)*d,z=terrain.camp.z+Math.sin(angle)*d;
    if(coverAt(x,z)>.51&&Math.abs(Math.sin(angle*2.3+.7))>.23)tuft(x,z,1.5,6);
  }
  for(let z=-98;z<102;z+=7) {
    const side=Math.sin(z*.17)>.1?1:-1,stretch=Math.sqrt(1+c.dcx(z)**2);
    const bx=c.cx(z)+side*(c.halfWidth(z)+.8)*stretch;
    tuft(bx+side*3,z,3,65);
    for(let k=0;k<70;k++) {
      const pz=z+(rng()-.5)*5,px=c.cx(pz)+side*(c.halfWidth(pz)-1.1+(rng()-.5)*2.2)*stretch;
      const depth=c.surfaceY(pz)-terrain.getHeight(px,pz);
      if(depth<-.65||depth>.85)continue;
      const scale=.08+Math.pow(rng(),1.8)*.37;
      put('cobble_'+k%6,px,pz,scale,{surface:true,sy:.62,lift:-scale*.22,radius:.12});
      if(k%6===0&&depth>-.3&&depth<.04)put('sedge_'+k%2,px+side*.4,pz,.4+rng()*.45);
    }
  }
  // Angular float spreads below the existing reef; the white material is on
  // closed chips, not planes or helper marks. Ironstone stays distinct from it.
  for(const a of rockAnchors) {
    if(a.radius<.6||a.family==='cobble')continue;
    const reef=terrain.sources.reef;
    if(Math.hypot(a.x-reef.x,a.z-reef.z)>16)continue;
    for(let k=0;k<20;k++) {
      const d=.7+rng()*6,x=a.x+Math.sign(c.cx(a.z)-a.x)*d,z=a.z+(rng()-.5)*d;
      put((k%3===0?'quartzfloat_':'slab_')+k%3,x,z,.055+rng()*.19,{surface:true,sy:.6,radius:.15,lift:-.035});
    }
  }
  for(const pit of terrain.workings)for(let k=0;k<65;k++) {
    const angle=rng()*Math.PI*2,d=Math.sqrt(rng())*pit.r*1.25;
    const x=pit.x+pit.side*pit.r*1.65+Math.cos(angle)*d,z=pit.z+Math.sin(angle)*d;
    put((k%5===0?'quartzfloat_':'slab_')+k%3,x,z,.045+rng()*.13,{surface:true,sy:.55,radius:.10,lift:-.022});
  }
}
