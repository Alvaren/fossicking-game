import * as THREE from 'three';
import { treeHeight } from './treeheight.js';
import { indexExact } from './exactindex.js';
import { loadNewEnglandKit } from '../assets.js';
import { mulberry32 } from '../noise.js';
import { vegetationMaterial } from '../vegetation.js';
import { foliageLOD } from '../vegetationlod.js';
import { rockMaterial, rockKinds, ROCK_ID } from '../rockmaterials.js';
import { placementMask } from '../newengland/placement.js';
import { composeNewEngland } from '../newengland/composition.js';
import { newEnglandGroundDetail } from '../newengland/grounddetail.js';
import { newEnglandBankRoots } from '../newengland/bankroots.js';
import { buildLandforms } from '../newengland/landforms.js';

// One regional rendering recipe, layered over the original game world.
// Never consume the world RNG or modify physical/saved source objects.
export function buildRegionalEnvironment(scene, { seed, terrain, world, landscape, field, finds, targets, boulders, equipment, settings }, recipe = {}) {
  const label=recipe.label||'New England',prefix=recipe.prefix||'NSW';
  const root = new THREE.Group(); root.name = label+' environment'; scene.add(root);
  const c = terrain.creek, rng = mulberry32(seed + (recipe.artSeed||731947)), dummy = new THREE.Object3D(), matrix = new THREE.Matrix4();
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
  const workingMask = placementMask({ camp:terrain.camp,circles:circles.slice(world.colliders.length),overlays:()=>terrain.overlays,equipment:()=>activeEquipment });
  const rockAnchors=[];
  const plants = vegetationMaterial({ vertexColors:true,grass:true });
  plants.material.color.set(0xaaa274);
  const bark = vegetationMaterial({ vertexColors:true });
  bark.material.roughness=1; bark.material.envMapIntensity=.35;
  for (const surface of [bark, plants]) {
    const compile = surface.material.onBeforeCompile;
    surface.material.onBeforeCompile = shader => {
      compile(shader);
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>',
        '#include <normal_fragment_begin>\nif(vFoliage>.5)normal*=gl_FrontFacing ? 1.0 : -1.0;')
        .replace('diffuseColor.rgb *= mix(barkTint,vec3(.88+.22*ecoPatch),vFoliage);',
          'diffuseColor.rgb *= mix(mix(vec3(.85,.81,.72),barkTint,.3),vec3(.94+.10*ecoPatch),vFoliage);');
    };
    surface.material.customProgramCacheKey = () => `nsw-foliage-v2:${surface===plants}`;
    recipe.foliage?.(surface.material,surface===plants);
  }
  const batches = [], treeBatches = [], grassBatches=[], stats = { status:'loading', assets:0, dressing:0, visible:0, quality:settings.environment || 'high' };
  let kit, groundDetail, bankRoots, landforms, elapsed=0, timer=1;
  const geometryCache = new Map(),normal=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  function plantGeometry(name, stride=1) {
    const key=`${name}:${stride}`;
    if (!geometryCache.has(key)) {
      const g=stride===1 ? kit[name].clone() : foliageLOD(kit[name],stride);
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
      treeHeight(g,recipe.treeHeights?.[name]||1);
      geometryCache.set(key,indexExact(g));
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
      batch.source.userData.neutralInstanceColor=true;
      for(const mesh of [batch.near,batch.far])if(mesh.instanceColor){mesh.instanceColor.array.fill(1);mesh.instanceColor.needsUpdate=true;}
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
      const transform=matrix.clone(), scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
      transform.decompose(pos,rotation,scale);
      // Geological joints share a local direction. Source transforms stay intact.
      const bearing=reef ? Math.atan2(reef.x-c.cx(reef.z),8) : .4;
      if(atReef) {
        scale.y*=1.15;
        rotation.setFromEuler(new THREE.Euler(.08*Math.sin(i*2.3),bearing,.10*Math.cos(i)));
        transform.compose(pos,rotation,scale);
      }
      if(granite) {scale.y*=1.16;transform.compose(pos,rotation,scale);}
      const radius=Math.max(scale.x,scale.z),site=terrain.sources[family==='host'?'reef':family];
      const mass=['host','basalt','rhyolite'].includes(family)&&site&&Math.hypot(pos.x-site.x,pos.z-site.z)<12&&radius>.65&&!workingMask.blocked(pos.x,pos.z,radius*.75);
      rockAnchors.push({x:pos.x,y:pos.y,z:pos.z,radius,height:scale.y,family,bearing,mass});
      // Keep every solid model paired with its original collider. Connecting
      // surfaces can withdraw near a dig; that must not reveal invisible rock.
      groups.get(key).entries.push({matrix:transform,water:c.waterY(pos.z)});
    }
    for(const {name,type,entries} of groups.values()) {
      if(!entries.length)continue;
      const g=kit[name].clone(),setKind=rockKinds(g,entries.length);
      recipe.rockGeometry?.(g,type);
      const material=rockMaterial(type,{mixed:true,authored:true,flat:granite});
      const mesh=new THREE.InstancedMesh(g,material,entries.length);
      mesh.name=`${prefix} ${name} ${type}`;mesh.castShadow=true;mesh.receiveShadow=true;
      entries.forEach((e,i)=>{mesh.setMatrixAt(i,e.matrix);setKind(i,type,e.water);});
      mesh.computeBoundingSphere();root.add(mesh);
      stats.solidRocks=(stats.solidRocks||0)+entries.length;
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
    (recipe.compose||composeNewEngland)({terrain,world,mask,workingMask,rng,add,rockAnchors});
    for(const batch of batches) {
      const stone=/^(cobble|host|granite|basalt|rhyolite|slab|quartzfloat)_/.test(batch.name),wood=/^(branch|root)_/.test(batch.name);
      batch.stone=stone;
      const float=batch.name.startsWith('quartzfloat_');
      const g=kit[float?batch.name.replace('quartzfloat_','slab_'):batch.name].clone();
      if(float) {
        // Small quartz float uses closed angular chips, not the whole detailed
        // outcrop scaled down to a few pixels. Keep the existing kit contract.
        const color=new THREE.Color(0xc6c1ac),colours=g.attributes.color,kind=g.attributes.aAuthoredRockKind;
        for(let i=0;i<colours.count;i++) {colours.setXYZ(i,color.r,color.g,color.b);kind.setX(i,ROCK_ID.quartz);}
      }
      const material=stone ? rockMaterial('slate',{mixed:true,authored:true}) : wood ? bark.material : plants.material;
      if(stone) { const setKind=rockKinds(g,batch.entries.length);batch.entries.forEach((e,i)=>setKind(i,'slate',c.waterY(e.z))); }
      batch.mesh=new THREE.InstancedMesh(g,material,batch.entries.length);
      batch.mesh.name=`${prefix} scenery ${batch.name}`;
      batch.mesh.receiveShadow=true;batch.mesh.castShadow=stone||wood||batch.name.startsWith('shrub');
      if(!stone)batch.mesh.customDepthMaterial=wood ? bark.depthMaterial : plants.depthMaterial;
      root.add(batch.mesh);stats.dressing+=batch.entries.length;
    }
  }
  const ready=(recipe.loadKit||loadNewEnglandKit)().then(result=>{
    if(!result){stats.status='fallback';return;}
    kit=result;recipe.prepareKit?.(kit);stats.assets=Object.keys(kit).length;
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
    // Replace the original black card sprays at the same understory anchors.
    const stems=landscape.lod.batches.find(b=>b.source.name==='Young stems');
    const leaves=landscape.lod.batches.find(b=>b.source.name===terrain.profile.id+' understory');
    if(stems && leaves) {
      leaves.near.visible=false;leaves.far.visible=false;
      const name='shrub_1';
      for(const mesh of [stems.near,stems.far]) {mesh.material=bark.material;mesh.customDepthMaterial=bark.depthMaterial;mesh.castShadow=true;}
      treeBatches.push({batch:stems,name});
    }
    const bankSedges=scene.getObjectByName('Bank sedges');
    if(bankSedges) {
      bankSedges.geometry=plantGeometry('sedge_0');bankSedges.material=plants.material;
      bankSedges.instanceColor=null;bankSedges.customDepthMaterial=plants.depthMaterial;
    }
    // The two existing landmarks retain their shapes and obstacle footprints.
    // Their legacy leaf cards need the same light-scattering treatment.
    landscape.group.traverse(mesh=>{
      if(!mesh.isMesh || mesh.isInstancedMesh || !mesh.geometry.attributes.aFoliage)return;
      const mat=mesh.material,compile=mat.onBeforeCompile;
      mat.onBeforeCompile=shader=>{
        compile(shader);
        shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',
          '#include <normal_fragment_begin>\nif(vFoliage>.5)normal=normalize(mix(normal,normalize((viewMatrix*vec4(.1,1.0,.1,0.0)).xyz),.8));');
      };
      mat.customProgramCacheKey=()=> 'nsw-landmark-foliage-v2';mat.needsUpdate=true;
    });
    replaceRocks(scene.getObjectByName('Geological scenery rocks'));
    replaceRocks(scene.getObjectByName('Granite tors'),true);
    landforms=(recipe.landforms||buildLandforms)(root,terrain,rockAnchors,workingMask);
    stats.landformPatches=landforms.patches.length;
    terrain.material.userData.nswCamp?.value.set(terrain.camp.x,terrain.camp.z);
    dressing();groundDetail=newEnglandGroundDetail(root,terrain,kit);
    bankRoots=newEnglandBankRoots(root,terrain,world,mask,workingMask);
    stats.bankRoots=bankRoots.branches.length;quality();
    stats.status='ready';
  });
  return {root,stats,ready,mask,quality,update(dt,time,player,wind=1) {
    elapsed=time;plants.update(elapsed,wind);bark.update(elapsed,wind);timer+=dt;
    if(!kit||timer<.4)return;
    timer=0;stats.visible=0;activeEquipment=equipment();
    const low=stats.quality==='low',medium=stats.quality==='medium';
    groundDetail.update(player,low);
    const revision=String(terrain.revision)+':'+activeEquipment.map(e=>[e.x,e.z,e.r].join(',')).join(';');
    bankRoots.update(player,low,revision);
    landforms.update(player,revision);
    const distance=low ? 28 : medium ? 48 : 80,density=low ? .4 : medium ? .7 : 1;
    for(const batch of batches) {
      const {entries,mesh,stone}=batch,last=batch.drawn??=[];
      let n=0,dirty=false;
      for(const e of entries) {
        if(e.rank>density||(e.x-player.x)**2+(e.z-player.z)**2>distance*distance)continue;
        if(e.revision!==revision) {
          if(Math.abs(terrain.getHeight(e.x,e.z)-e.y)>.065)e.removed=true;
          e.blocked=mask.dynamic(e.x,e.z,e.radius);e.revision=revision;
        }
        if(e.removed||e.blocked)continue;
        const changed=e.transformRevision!==terrain.revision;
        if(changed) {
          dummy.position.set(e.x,e.y+e.lift,e.z);dummy.rotation.set(0,e.rotation,0);
          if(e.surface || stone) {
            normal.set(terrain.getHeight(e.x-.25,e.z)-terrain.getHeight(e.x+.25,e.z),.5,
              terrain.getHeight(e.x,e.z-.25)-terrain.getHeight(e.x,e.z+.25));
            dummy.quaternion.setFromUnitVectors(up,normal.normalize());dummy.rotateY(e.rotation);
          }
          dummy.scale.set(e.scale*(e.sx??1),e.scale*(e.sy??1),e.scale*(e.sz??1));dummy.updateMatrix();
          (e.transform??=new THREE.Matrix4()).copy(dummy.matrix);e.transformRevision=terrain.revision;
        }
        if(changed||last[n]!==e) {
          mesh.setMatrixAt(n,e.transform);
          if(stone)mesh.geometry.attributes.aRockWater.setX(n,c.waterY(e.z));
          dirty=true;
        }
        last[n++]=e;
      }
      dirty ||= mesh.count!==n;last.length=n;mesh.count=n;
      if(dirty) {
        mesh.instanceMatrix.needsUpdate=true;
        if(mesh.geometry.attributes.aRockWater)mesh.geometry.attributes.aRockWater.needsUpdate=true;
        mesh.computeBoundingSphere();
      }
      stats.visible+=n;
    }
  }};
}
