import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { markFoliage, vegetationMaterial } from './vegetation.js';

// Decoration lives in a group, never in colliders or sample/find collections.
// All placement uses its own RNG and checks the caller's protected surfaces.
export function dressEnvironment(scene, { seed, height, bank, waterY, anchors, blocked, forest = false, dry = false, low = false }) {
  const rand = mulberry32(seed + 913879), group = new THREE.Group();
  group.name = 'Natural ground details'; scene.add(group);
  const dummy = new THREE.Object3D(), matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(), quaternion = new THREE.Quaternion();
  const batches = [];
  function batch(geometry, material, entries, name, depthMaterial) {
    const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
    mesh.name = name; mesh.receiveShadow = true;
    if (depthMaterial) mesh.customDepthMaterial = depthMaterial;
    entries.forEach((e, i) => {
      dummy.position.set(e.x, height(e.x,e.z)+e.lift, e.z);
      dummy.rotation.set(e.rx || 0, e.r, e.rz || 0); dummy.scale.set(...e.s); dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix); mesh.setColorAt(i,new THREE.Color(e.color));
    });
    group.add(mesh); batches.push({ mesh, entries }); return mesh;
  }
  const chips = [], litter = [], stems = [];
  const safe = (x,z) => !blocked(x,z) && bank(x,z) > .5 && height(x,z) > waterY(z)+.08;
  for (const source of anchors) {
    for (let i=0;i<source.count;i++) {
      source.getMatrixAt(i,matrix); matrix.decompose(position,quaternion,scale);
      if (scale.x < .1) continue;
      const tree = source.userData.tree, radius = tree ? .6 : Math.max(scale.x,scale.z)*.85;
      // Keep little float fragments beside boulders, not across the whole map.
      for (let k=0;k<(low?5:9);k++) {
        const angle=rand()*Math.PI*2, r=radius+rand()*(tree?1.5:.55);
        const x=position.x+Math.cos(angle)*r,z=position.z+Math.sin(angle)*r;
        if (!safe(x,z)) continue;
        if (tree) litter.push({x,z,lift:.018,r:rand()*6.28,s:[.04+rand()*.04,.5+rand(),.18+rand()*.28],color:forest?0x685d41:0x9f8869});
        else { const s=.025+rand()*.06; chips.push({x,z,lift:s*.15,r:rand()*6.28,s:[s,s*.45,s*.8],color:rand()<.3?0xb7ad90:0x756d5e}); }
      }
      // Occasional slender fallen twigs; no large new obstacle or tree collider.
      if (tree && rand()<.25) {
        const x=position.x+.8,z=position.z+.7;
        if(safe(x,z)) litter.push({x,z,lift:.025,r:rand()*6.28,s:[.03,1.2,1.4],color:0x554735});
      }
    }
  }
  // Patchy low sedges along dry bank edges, never in the water or across routes.
  const count = low ? 180 : 330;
  for (let i=0;i<count*8 && stems.length<count;i++) {
    const x=(rand()-.5)*220,z=(rand()-.5)*(forest?280:220), d=bank(x,z);
    if (d<1 || d>5 || !safe(x,z) || (dry && rand()<.6)) continue;
    const s=.25+rand()*.35;
    stems.push({x,z,lift:0,r:rand()*6.28,s:[s,s,s],color:forest?0x5b7243:dry?0x938554:0x818453});
  }
  batch(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({roughness:.93}),chips,'Boulder foot gravel');
  const strip=new THREE.BufferGeometry();
  strip.setAttribute('position',new THREE.Float32BufferAttribute([-1,0,-.5,1,0,-.5,0,.07,.1,-1,0,-.5,0,.07,.1,0,0,.5,1,0,-.5,0,0,.5,0,.07,.1],3));strip.computeVertexNormals();
  batch(strip,new THREE.MeshStandardMaterial({roughness:1,side:THREE.DoubleSide}),litter,'Fallen bark and twigs');
  const blades=[];
  for(let k=0;k<7;k++) {
    const a=k*2.399,dx=Math.cos(a),dz=Math.sin(a),h=.65+(k%3)*.12;
    blades.push(-dz*.035,0,dx*.035,dz*.035,0,-dx*.035,dx*.4,h,dz*.4);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(blades,3));geo.computeVertexNormals();markFoliage(geo,1);
  const sedge=vegetationMaterial({grass:true});
  batch(geo,sedge.material,stems,'Bank sedges',sedge.depthMaterial);
  let timer=0;
  return { group, update(dt,time,player,wind=1) {
    sedge.update(time,wind); timer+=dt;
    if(timer<.5)return;timer=0;
    // Follow dug ground near the player; hide details on a newly exposed patch.
    for(const {mesh,entries} of batches) {
      let changed=false;
      entries.forEach((e,i)=>{
        if(Math.abs(e.x-player.x)>12||Math.abs(e.z-player.z)>12)return;
        mesh.getMatrixAt(i,matrix); matrix.elements[13]=height(e.x,e.z)+e.lift;
        if(blocked(e.x,e.z)) matrix.makeScale(0,0,0);
        mesh.setMatrixAt(i,matrix);changed=true;
      });
      if(changed)mesh.instanceMatrix.needsUpdate=true;
    }
  }};
}
