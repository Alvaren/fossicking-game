import * as THREE from 'three';
import { loadNewEnglandKit } from '../assets.js';
import { mulberry32 } from '../noise.js';
import { vegetationMaterial } from '../vegetation.js';
import { foliageLOD } from '../vegetationlod.js';
import { rockMaterial, rockKinds, ROCK_ID } from '../rockmaterials.js';
import { placementMask } from './placement.js';

// One regional rendering recipe, layered over the original game world.
// Never consume the world RNG or modify physical/saved source objects.
export function buildNewEnglandEnvironment(scene, { seed, terrain, world, field, finds, targets, boulders, equipment, settings }) {
  const root = new THREE.Group(); root.name = 'New England environment'; scene.add(root);
  const c = terrain.creek, rng = mulberry32(seed + 731947), dummy = new THREE.Object3D(), matrix = new THREE.Matrix4();
  const circles = [
    ...world.colliders.map(o => ({ x:o.x,z:o.z,r:o.r+.35 })),
    ...field.sites.map(o => ({ x:o.x,z:o.z,r:3.5 })),
    ...finds.items.map(o => ({ x:o.x,z:o.z,r:.65 })),
    ...targets.list.map(o => ({ x:o.x,z:o.z,r:1 })),
    ...boulders.list.map(o => ({ x:o.x,z:o.z,r:o.r+.4 })),
  ];
  if (terrain.sources.mine) circles.push({ ...terrain.sources.mine,r:5 });
  let activeEquipment=equipment();
  const mask = placementMask({ camp:terrain.camp,circles,overlays:()=>terrain.overlays,equipment:()=>activeEquipment });
  const plants = vegetationMaterial({ vertexColors:true,grass:true });
  const bark = vegetationMaterial({ vertexColors:true });
  bark.material.roughness=1; bark.material.envMapIntensity=.35;
  const compileBark=bark.material.onBeforeCompile;
  bark.material.onBeforeCompile=shader=>{
    compileBark(shader);
    // Thin leaves share their crown lighting on both sides, while bark keeps
    // ordinary face normals. This is a restrained leaf-transmission surrogate.
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',
      '#include <normal_fragment_begin>\nif(vFoliage>.5)normal*=gl_FrontFacing ? 1.0 : -1.0;');
  };
  bark.material.customProgramCacheKey=()=> 'nsw-foliage-v1';
  const batches = [], treeBatches = [], grassBatches=[], stats = { status:'loading', assets:0, dressing:0, visible:0, quality:settings.environment || 'high' };
  let kit, elapsed=0, timer=1;
  const geometryCache = new Map();
  function plantGeometry(name, stride=1) {
    const key=`${name}:${stride}`;
    if (!geometryCache.has(key)) {
      const g=stride===1 ? kit[name] : foliageLOD(kit[name],stride);
      if(stride>1) {
        // Preserve projected crown coverage when removing small leaves at distance.
        const p=g.attributes.position,f=g.attributes.aFoliage;
        const spread=Math.min(1.9,Math.sqrt(stride));
        for(let i=0;i<p.count;) {
          if(f.getX(i)<.5){i+=3;continue;}
          const count=Math.min(12,p.count-i);
          const centre=new THREE.Vector3();
          for(let k=0;k<count;k++)centre.add(new THREE.Vector3().fromBufferAttribute(p,i+k));
          centre.multiplyScalar(1/count);
          for(let k=0;k<count;k++) {const v=new THREE.Vector3().fromBufferAttribute(p,i+k).sub(centre).multiplyScalar(spread).add(centre);p.setXYZ(i+k,v.x,v.y,v.z);}
          i+=count;
        }
        g.computeBoundingSphere();
      }
      geometryCache.set(key,g);
    }
    return geometryCache.get(key);
  }
  function quality() {
    stats.quality=settings.environment || 'high';
    const low=stats.quality==='low',medium=stats.quality==='medium';
    for (const { batch,name } of treeBatches) {
      batch.near.geometry=plantGeometry(name,low ? 4 : medium ? 2 : 1);
      batch.far.geometry=plantGeometry(name,low ? 10 : medium ? 6 : 4);
      batch.near.computeBoundingSphere();batch.far.computeBoundingSphere();
    }
    for(const batch of grassBatches) {
      batch.near.geometry=plantGeometry('grass_0',low ? 3 : 1);
      batch.far.geometry=plantGeometry('grass_0',low ? 5 : 3);
      batch.near.computeBoundingSphere();batch.far.computeBoundingSphere();
    }
    timer=1;
  }
  function replaceRocks(source, granite=false) {
    if (!source?.count) return;
    const groups=new Map(), pos=new THREE.Vector3();
    for(let i=0;i<source.count;i++) {
      source.getMatrixAt(i,matrix);pos.setFromMatrixPosition(matrix);
      const type=granite ? 'granite' : Object.keys(ROCK_ID).find(k=>ROCK_ID[k]===source.geometry.attributes.aRockKind.getX(i)) || 'slab';
      const reef=terrain.sources.reef;
      const atReef=type==='quartz' && reef && Math.hypot(pos.x-reef.x,pos.z-reef.z)<12;
      const bank=c.local(pos.x,pos.z,{});
      const family=granite ? 'granite' : atReef ? 'host' : bank.d<bank.w+1.5 ? 'cobble' : ['basalt','rhyolite','granite'].includes(type) ? type : 'slab';
      const variants={host:4,cobble:6,granite:4,basalt:3,rhyolite:3,slab:3}[family];
      const name=`${family}_${i%variants}`,key=`${name}:${type}`;
      if(!groups.has(key))groups.set(key,{name,type,entries:[]});
      groups.get(key).entries.push({matrix:matrix.clone(),water:c.waterY(pos.z)});
    }
    for(const {name,type,entries} of groups.values()) {
      const g=kit[name].clone(),setKind=rockKinds(g,entries.length);
      const material=rockMaterial(type,{mixed:true,authored:true});
      const mesh=new THREE.InstancedMesh(g,material,entries.length);
      mesh.name=`NSW ${name} ${type}`;mesh.castShadow=true;mesh.receiveShadow=true;
      entries.forEach((e,i)=>{mesh.setMatrixAt(i,e.matrix);setKind(i,type,e.water);});
      mesh.computeBoundingSphere();root.add(mesh);
    }
    source.visible=false;source.userData.replacedByNewEngland=true;
  }
  const add=(name,entry)=>{
    let batch=batches.find(b=>b.name===name);
    if(!batch){batch={name,entries:[]};batches.push(batch);}
    batch.entries.push(entry);
  };
  function dressing() {
    activeEquipment=equipment();
    // Creek scene first. These forms remain below knee height and never collide.
    // Wider rollout is deliberately gated on the first scene's visual review.
    for(let i=0;i<7200;i++) {
      const z=-5+rng()*39,side=rng()<.5 ? -1 : 1;
      const distance=-1.7+rng()*13;
      const x=c.cx(z)+side*(c.halfWidth(z)+distance)*Math.sqrt(1+c.dcx(z)**2);
      const h=terrain.getHeight(x,z),water=c.waterY(z),l=c.local(x,z,{}),bank=l.d-l.w;
      const patch=.5+.25*Math.sin(x*.55+Math.sin(z*.21))+.25*Math.sin(z*.72+x*.23);
      if(mask.blocked(x,z,.15) || h<water-.75 || terrain.getHeight(x+.35,z)-h>.8)continue;
      let name,scale,lift=0,radius=.25;
      if(bank<.9) {
        if(i%3===0) {name=`cobble_${i%6}`;scale=.09+rng()*.3;lift=-scale*.4;radius=scale;}
        else if(h>water-.03&&rng()<patch*.45){name=`sedge_${i%2}`;scale=.45+rng()*.55;lift=-.04;}
        else continue;
      } else if(bank>3&&i%19===0&&patch>.48) {
        name=`shrub_${i%3}`;scale=.6+rng()*.75;lift=-.06;radius=.6;
      } else {
        if(rng()>patch*.63)continue;
        name=`grass_${i%3}`;scale=.32+rng()*.45;lift=-.035;
      }
      if(mask.blocked(x,z,radius))continue;
      add(name,{x,z,y:h,lift,scale,rotation:rng()*Math.PI*2,radius,rank:rng()});
    }
    // Selected roots and litter beside existing trunks, no lattice over digs.
    for(const batch of world.lod.batches.filter(b=>b.source.userData.tree))for(let i=0;i<batch.source.count;i++) {
      batch.source.getMatrixAt(i,matrix);const x=matrix.elements[12],z=matrix.elements[14];
      if(z<0||z>28||Math.abs(x-c.cx(z))>14)continue;
      const angle=rng()*Math.PI*2,rx=x+Math.cos(angle)*.7,rz=z+Math.sin(angle)*.7;
      if(mask.blocked(rx,rz,.25))continue;
      add(`branch_${i%3}`,{x:rx,z:rz,y:terrain.getHeight(rx,rz),lift:-.05,scale:.5,rotation:angle,radius:.4,rank:0});
    }
    for(const batch of batches) {
      const stone=batch.name.startsWith('cobble'),wood=batch.name.startsWith('branch');
      const g=kit[batch.name].clone();
      const material=stone ? rockMaterial('slate',{mixed:true,authored:true}) : wood ? bark.material : plants.material;
      if(stone) { const setKind=rockKinds(g,batch.entries.length);batch.entries.forEach((e,i)=>setKind(i,'slate',c.waterY(e.z))); }
      batch.mesh=new THREE.InstancedMesh(g,material,batch.entries.length);
      batch.mesh.name=`NSW creek ${batch.name}`;
      batch.mesh.receiveShadow=true;batch.mesh.castShadow=stone||wood||batch.name.startsWith('shrub');
      if(!stone)batch.mesh.customDepthMaterial=wood ? bark.depthMaterial : plants.depthMaterial;
      root.add(batch.mesh);stats.dressing+=batch.entries.length;
    }
  }
  const ready=loadNewEnglandKit().then(result=>{
    if(!result){stats.status='fallback';return;}
    kit=result;stats.assets=Object.keys(kit).length;
    for(const batch of world.lod.batches) {
      const match=/^Gum trees (\d)$/.exec(batch.source.name);
      if(!match) {
        if(!batch.source.name&&batch.source.count>1000) {
          grassBatches.push(batch);
          for(const mesh of [batch.near,batch.far]){mesh.material=plants.material;mesh.customDepthMaterial=plants.depthMaterial;}
        }
        continue;
      }
      const name=`gum_${match[1]}`;
      for(const mesh of [batch.near,batch.far]) {mesh.material=bark.material;mesh.customDepthMaterial=bark.depthMaterial;}
      treeBatches.push({batch,name});
    }
    replaceRocks(scene.getObjectByName('Geological scenery rocks'));
    replaceRocks(scene.getObjectByName('Granite tors'),true);
    dressing();quality();stats.status='ready';
  });
  return {root,stats,ready,mask,quality,update(dt,time,player,wind=1) {
    elapsed=time;plants.update(elapsed,wind);bark.update(elapsed,wind);timer+=dt;
    for(const batch of grassBatches)for(const mesh of [batch.near,batch.far])if(mesh.instanceColor) {
      mesh.instanceColor.array.fill(1);mesh.instanceColor.needsUpdate=true;
    }
    if(!kit||timer<.4)return;
    timer=0;stats.visible=0;activeEquipment=equipment();
    const low=stats.quality==='low',medium=stats.quality==='medium';
    const distance=low ? 28 : medium ? 48 : 80,density=low ? .4 : medium ? .7 : 1;
    for(const {entries,mesh,name} of batches) {
      let n=0;
      for(const e of entries) {
        if(e.rank>density||Math.hypot(e.x-player.x,e.z-player.z)>distance)continue;
        const near=Math.hypot(e.x-player.x,e.z-player.z)<14;
        if(near&&(mask.dynamic(e.x,e.z,e.radius)||Math.abs(terrain.getHeight(e.x,e.z)-e.y)>.09))continue;
        dummy.position.set(e.x,e.y+e.lift,e.z);dummy.rotation.set(0,e.rotation,0);dummy.scale.setScalar(e.scale);dummy.updateMatrix();
        mesh.setMatrixAt(n,dummy.matrix);
        if(name.startsWith('cobble'))mesh.geometry.attributes.aRockWater.setX(n,c.waterY(e.z));
        n++;
      }
      mesh.count=n;mesh.instanceMatrix.needsUpdate=true;
      if(mesh.geometry.attributes.aRockWater)mesh.geometry.attributes.aRockWater.needsUpdate=true;
      mesh.computeBoundingSphere();stats.visible+=n;
    }
  }};
}
