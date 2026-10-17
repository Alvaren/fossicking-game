import * as THREE from 'three';
import { loadEnvironmentKit, loadNewEnglandKit } from '../assets.js';
import { vegetationLOD, foliageLOD } from '../vegetationlod.js';
import { indexExact } from '../rendering/exactindex.js';
import { rockKinds } from '../rockmaterials.js';
import { northeastComposition } from './northeast-composition.js';
import { northeastRock, northeastFoliage } from './northeast-materials.js';

// A render-only recipe around the existing expedition world. Gameplay, route,
// tools and the original random stream do not depend on optional downloads.
export function buildNortheastEnvironment(scene,model,world,profile,settings) {
  const root=new THREE.Group();root.name='Northeast authored forest';scene.add(root);
  const stats={status:'loading',assets:0,trees:0,plants:0,rocks:0,visible:0};
  const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),dummy=new THREE.Object3D();
  const foliage=northeastFoliage(),groundFoliage=northeastFoliage(true),batches=[],treeSources=[];
  const low=settings.environment==='low',medium=settings.environment==='medium';
  const composition=northeastComposition(model,profile,world.colliders);
  const additions=[];let kit,lod,timer=1;
  function geometry(name,leaf=false) {
    const g=kit[name].clone();
    const reduced=leaf?foliageLOD(g,low?5:medium?3:1):g;
    if(reduced!==g)g.dispose();
    return indexExact(reduced);
  }
  function instances(name,entries,{plant=false,tree=false,solid=false}={}) {
    if(!entries.length)return;
    const isRock=/^(granite|cobble|basalt)_/.test(name),geo=geometry(name,plant||tree);
    const surface=tree?foliage:groundFoliage;
    const mesh=new THREE.InstancedMesh(geo,isRock?northeastRock(name.startsWith('basalt')?'basalt':'granite'):surface.material,entries.length);
    const kinds=isRock?rockKinds(geo,entries.length):null;
    mesh.name='NE '+name;mesh.receiveShadow=true;mesh.castShadow=tree||solid;mesh.userData.environmentOnly=true;
    if(!isRock)mesh.customDepthMaterial=surface.depthMaterial;
    entries.forEach((e,i)=>{
      dummy.position.set(e.x,e.y,e.z);dummy.rotation.set(0,e.rotation,0);dummy.scale.set(e.scale,e.scale*(e.sy??1),e.scale);
      if(e.matrix)dummy.matrix.copy(e.matrix);else dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
      kinds?.(i,name.startsWith('basalt')?'basalt':'granite',profile.waterY(e.z));
    });
    mesh.computeBoundingSphere();root.add(mesh);
    if(tree){mesh.userData.tree=true;treeSources.push(mesh);stats.trees+=entries.length;}
    else batches.push({mesh,entries,solid,kinds,drawn:[]});
    return mesh;
  }
  function grouped(entries,options) {
    const groups=new Map();for(const e of entries){if(!groups.has(e.name))groups.set(e.name,[]);groups.get(e.name).push(e);}
    for(const [name,items] of groups)instances(name,items,options);
  }
  const ready=Promise.all([loadNewEnglandKit(),loadEnvironmentKit('models/tasmania-ne/environment.glb',{fern:3,treefern:3,understory:3}),loadEnvironmentKit('models/uralla/environment.glb',{granite:4,cobble:6})]).then(([shared,local,granite])=>{
    if(!shared||!local||!granite){for(const k of [shared,local,granite])if(k)Object.values(k).forEach(g=>g.dispose());stats.status='fallback';return;}
    for(const name of Object.keys(granite))shared[name]?.dispose();
    kit={...shared,...local,...granite};stats.assets=Object.keys(kit).length;
    // Rooted authored gums replace both pieces of each original cylinder/spray.
    const trees=[];
    for(let i=0;i<world.trunks.count;i++) {
      world.trunks.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
      const name='gum_'+(i%4),bounds=kit[name].boundingBox,h=scale.y*(1.15+(i%7)/13),width=scale.x;
      trees.push({name,x:position.x,z:position.z,y:model.height(position.x,position.z)-.05,scale:width*1.13,sy:h/(bounds.max.y*width*1.13),rotation:i*2.399,rank:0});
    }
    grouped(trees,{tree:true});
    // Keep exact old rock centres/rotation/footprints; match replacement bounds
    // to each source scale so its original collider continues to describe it.
    const rocks=[];
    for(let i=0;i<world.rocks.count;i++) {
      world.rocks.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
      const basalt=world.rocks.geometry.attributes.aRockKind.getX(i)===2;
      const name=basalt?'basalt_'+(i%3):'granite_'+(i%4),b=kit[name].boundingBox;
      dummy.position.copy(position);dummy.quaternion.copy(rotation);
      dummy.scale.set(scale.x*2.02/(b.max.x-b.min.x),scale.y*1.9/(b.max.y-b.min.y),scale.z*2.02/(b.max.z-b.min.z));dummy.updateMatrix();
      rocks.push({name,x:position.x,z:position.z,y:position.y,matrix:dummy.matrix.clone(),scale:1,rotation:0,rank:0});
    }
    grouped(rocks,{solid:true});
    const shelves=composition.stones.map(e=>({...e,scale:e.r,rank:0}));
    grouped(shelves,{solid:true});
    const water=world.water.geometry,wp=water.attributes.position,foam=water.attributes.aFoam,speed=water.attributes.aSpeed;
    for(let i=0;i<wp.count;i++)for(const e of shelves) {
      const dx=wp.getX(i)-e.x,dz=wp.getZ(i)-e.z,d=Math.hypot(dx,dz);
      if(d>e.r*2.6)continue;
      const contact=Math.exp(-((d-e.r*.88)**2)/.48),wake=Math.exp(-dx*dx/(e.r*e.r*.4)-Math.max(0,dz)**2/(e.r*e.r*4));
      foam.setX(i,Math.max(foam.getX(i),contact*.62));speed.setX(i,speed.getX(i)*(1-.24*wake));
    }
    foam.needsUpdate=true;speed.needsUpdate=true;
    for(const e of shelves){const collider={x:e.x,z:e.z,r:e.r*.94};world.colliders.push(collider);additions.push(collider);}
    grouped([...composition.plants,...composition.wood],{plant:true});
    // Root geometry conforms to the actual ground, including slopes, instead
    // of hovering as a flat decoration. Reuse the existing NSW root prototypes.
    for(let i=0;i<trees.length;i+=11) {
      const t=trees[i],bank=Math.abs(t.x-profile.riverX(t.z))-profile.riverWidth(t.z);
      if(bank<1.8||bank>12||profile.nearestTrail(t.x,t.z).distance<2.8||model.sites.some(s=>Math.hypot(s.x-t.x,s.z-t.z)<3))continue;
      const geo=kit['root_'+(i%2)].clone(),p=geo.attributes.position,a=t.rotation;
      for(let j=0;j<p.count;j++) {
        const x=p.getX(j)*Math.cos(a)+p.getZ(j)*Math.sin(a)+t.x,z=-p.getX(j)*Math.sin(a)+p.getZ(j)*Math.cos(a)+t.z;
        p.setXYZ(j,x,model.height(x,z)+p.getY(j)+.012,z);
      }
      geo.computeVertexNormals();const mesh=new THREE.Mesh(indexExact(geo),foliage.material);mesh.customDepthMaterial=foliage.depthMaterial;mesh.receiveShadow=true;mesh.castShadow=true;root.add(mesh);
    }
    const poleMat=new THREE.MeshStandardMaterial({color:0x887d66,roughness:.95});
    const ropeMat=new THREE.MeshStandardMaterial({color:0xa79c7e,roughness:1});
    const pole=(a,b,r,material)=>{
      const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av),g=new THREE.CylinderGeometry(r,r,d.length(),5);
      const m=new THREE.Mesh(g,material);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.castShadow=true;world.camp.add(m);
    };
    for(const z of [-1,1]){pole([0,-.04,z],[0,1.33,z],.025,poleMat);pole([0,1.3,z],[0,.06,z*2.1],.008,ropeMat);pole([0,-.04,z*2.1],[0,.18,z*2.1],.025,poleMat);}
    for(const x of [-1.3,1.3])for(const z of [-1,1])pole([x,.04,z],[x*1.25,.02,z*1.24],.008,ropeMat);
    stats.rocks=rocks.length+shelves.length;stats.plants=composition.plants.length+composition.wood.length;
    lod=vegetationLOD(root,treeSources,low);
    for(const o of [world.trunks,world.crowns,world.ferns,world.fernTrunks,world.rocks])o.visible=false;
    for(const batch of world.lod.batches)for(const o of [batch.near,batch.far])o.visible=false;
    // Replace the legacy black understorey sprays at their existing anchors.
    const stems=world.landscape.lod.batches.find(b=>b.source.name==='Young stems');
    if(stems) {
      const shrubs=[];
      for(let i=0;i<stems.source.count;i++){stems.source.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);shrubs.push({name:'understory_'+(i%3),x:position.x,z:position.z,y:model.height(position.x,position.z)-.025,scale:.6+scale.x*.4,rotation:i*2.399,rank:.1});}
      grouped(shrubs,{plant:true});
      for(const batch of world.landscape.lod.batches)for(const o of [batch.near,batch.far])o.visible=false;
    }
    // Site marks remain the actual gravel, without the old dark circular decal.
    for(const s of world.siteGroups){s.pocket.visible=false;}
    stats.status='ready';
  }).catch(error=>{
    // Atomic visual fallback: the original world remains available if the
    // optional kit or a render recipe fails during setup.
    root.visible=false;
    for(const o of [world.trunks,world.rocks,world.fernTrunks])o.visible=true;
    for(const batch of [...world.lod.batches,...world.landscape.lod.batches])for(const o of [batch.near,batch.far])o.visible=true;
    for(const c of additions){const i=world.colliders.indexOf(c);if(i!==-1)world.colliders.splice(i,1);}
    additions.length=0;
    for(const s of world.siteGroups)s.pocket.visible=true;
    stats.status='fallback';console.warn('Northeast environment unavailable; retaining original scenery.',error);
  });
  return {root,stats,ready,composition,additions,update(dt,time,player,wind=1) {
    if(stats.status!=='ready')return;
    foliage.update(time,wind);groundFoliage.update(time,wind);lod.update(dt,player);timer+=dt;
    if(timer<.35)return;timer=0;stats.visible=0;
    for(const batch of batches) {
      const {mesh,entries,solid,kinds,drawn}=batch;let n=0,dirty=false;
      const distance=solid?240:low?26:medium?45:70,density=solid?1:low?.42:medium?.7:1;
      for(const e of entries) {
        if(e.rank>density||(e.x-player.x)**2+(e.z-player.z)**2>distance*distance)continue;
        if(drawn[n]!==e){
          if(!e.transform){
            if(e.matrix)e.transform=e.matrix;
            else {
              dummy.position.set(e.x,e.y,e.z);dummy.rotation.set(0,e.rotation,0);dummy.scale.set(e.scale,e.scale*(e.sy??1),e.scale);dummy.updateMatrix();e.transform=dummy.matrix.clone();
            }
          }
          mesh.setMatrixAt(n,e.transform);kinds?.(n,mesh.name.includes('basalt')?'basalt':'granite',profile.waterY(e.z));dirty=true;
        }
        drawn[n++]=e;
      }
      dirty ||= mesh.count!==n;drawn.length=n;mesh.count=n;
      if(dirty){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}stats.visible+=n;
    }
  }};
}
