import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from './noise.js';
import { leafSpray, markFoliage, vegetationMaterial } from './vegetation.js';
import { rockMaterial } from './rockmaterials.js';
import { vegetationLOD } from './vegetationlod.js';

const profiles = {
  'new-england': { leaf:0x718154, bark:0xb7ae96, rock:'granite', names:['Split gum bend','Granite shoulder'], forms:['roots','tor'], z:[28,-56] },
  'golden-triangle': { leaf:0x6c7148, bark:0x534236, rock:'ironstone', names:['Broken ironbark','Old timber stack'], forms:['snag','timber'], z:[32,-42] },
  'qld-gemfields': { leaf:0x8b9367, bark:0x8a7760, rock:'basalt', names:['Dry wash sentinel','Basalt steps'], forms:['snag','steps'], z:[-32,53] },
  'tasmania-west': { leaf:0x4b7254, bark:0x706b50, rock:'slate', names:['Root buttress','Fallen forest giant'], forms:['roots','fallen'], z:[32,-67], forest:true },
  'ne-tasmania': { leaf:0x668365, bark:0x978f72, rock:'granite', names:['Granite crown','Split forest gum'], forms:['tor','roots'], z:[28,-58], forest:true },
};

// Merge each landmark by material. These are scenery, never finds or site markers.
function sculpture(form, palette, seed) {
  const rand=mulberry32(seed), wood=[], stones=[], leaves=[];
  function pole(a,b,r,tip=r*.65) {
    a=new THREE.Vector3(...a);b=new THREE.Vector3(...b);
    const delta=b.clone().sub(a),geo=new THREE.CylinderGeometry(tip,r,delta.length(),7);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));
    geo.translate(...a.add(b).multiplyScalar(.5).toArray());wood.push(geo);
  }
  function crown(x,y,z,s) { const geo=leafSpray(seed+Math.floor(y*92),100,palette.forest);geo.scale(s,s*1.6,s);geo.translate(x,y,z);leaves.push(geo); }
  if(form==='roots'||form==='snag') {
    const h=form==='roots'?8.5:6.8;
    pole([0,-.45,0],[.4,h*.6,.2],.48,.28);
    pole([.4,h*.6,.2],[-1.9,h,-.3],.28,.035);
    pole([.4,h*.6,.2],[2.2,h*.83,.9],.24,.02);
    pole([.2,3,.1],[-1.4,4.8,1.2],.17,.015);
    for(let i=0;i<7;i++) {
      const a=i*6.28/7,dx=Math.cos(a),dz=Math.sin(a),length=1.5+rand();
      pole([0,.65,0],[dx*.65,.12,dz*.65],.23,.13);
      pole([dx*.65,.12,dz*.65],[dx*length,-.17,dz*length],.13,.025);
    }
    if(form==='roots') {crown(-1.9,h,-.3,2.5);crown(2.2,h*.83,.9,2.2);}
  } else if(form==='fallen'||form==='timber') {
    const count=form==='timber'?4:1;
    for(let i=0;i<count;i++) {
      const z=i*.47-.6,y=.32+(i%2)*.13;
      pole([-3,y,z],[3.5,y+.3,z+.65],form==='fallen'?.43:.22,form==='fallen'?.28:.18);
    }
    if(form==='fallen') {
      pole([-.6,.55,.1],[-1.7,1.5,1.6],.14,.015);
      for(let i=0;i<7;i++) {const a=i*6.28/7;pole([-3,.45,-.6],[-3.3,.7+Math.sin(a)*1.15,-.6+Math.cos(a)*1.25],.12,.02);}
    }
  } else {
    for(let i=0;i<5;i++) {
      const geo=form==='steps'?new THREE.CylinderGeometry(1,.98,1,6):new THREE.IcosahedronGeometry(1,1);
      const s=1.1+(i%2)*.4;
      geo.scale(s,form==='steps'?.8+i*.24:1.4,s*.85);
      geo.rotateY(i*.8);
      geo.translate((i%3-1)*1.35,form==='steps'?.15:Math.floor(i/3)*1.6+.1,Math.floor(i/3)*.7);
      stones.push(geo);
    }
  }
  const group=new THREE.Group();
  const bark=vegetationMaterial({color:palette.bark,forest:palette.forest});
  const canopy=vegetationMaterial({color:palette.leaf,forest:palette.forest});
  for(const [parts,surface,foliage] of [[wood,bark,0],[leaves,canopy,1],[stones,{material:rockMaterial(palette.rock)},null]]) {
    if(!parts.length)continue;
    const geometries=parts.map(g=>{g=g.index?g.toNonIndexed():g;g.deleteAttribute('uv');if(foliage!==null)markFoliage(g,foliage);return g;});
    const geometry=mergeGeometries(geometries),mesh=new THREE.Mesh(geometry,surface.material);
    mesh.castShadow=true;mesh.receiveShadow=true;mesh.customDepthMaterial=surface.depthMaterial;
    group.add(mesh);geometries.forEach(g=>g.dispose());
  }
  return {group,update(t,wind){bark.update(t,wind);canopy.update(t,wind);}};
}

export function buildLandscape(scene,{region,seed,height,placementHeight=height,bank,riverX,riverWidth,blocked,colliders,obstacles=colliders,low=false}) {
  const profile=profiles[region]||profiles['new-england'],rand=mulberry32(seed+341907);
  const group=new THREE.Group();group.name='Regional landscape';scene.add(group);
  const landmarks=[],surfaces=[];
  const safe=(x,z,r=0)=>{
    for(let i=0;i<9;i++) {
      const a=i*6.28/8,rr=i===8?0:r,px=x+Math.cos(a)*rr,pz=z+Math.sin(a)*rr;
      if(blocked(px,pz)||bank(px,pz)<1.5||Math.abs(placementHeight(px,pz)-placementHeight(x,z))>2.5)return false;
    }
    return true;
  };
  for(let i=0;i<2;i++) {
    let spot;
    for(let k=0;k<600;k++) {
      const z=profile.z[i]+(k%25-12)*1.8,side=k%2?1:-1,x=riverX(z)+side*(riverWidth(z)+8+Math.floor(k/25)*1.3);
      if(safe(x,z,4)&&!obstacles.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+3)) {spot={x,z};break;}
    }
    if(!spot)continue;
    const art=sculpture(profile.forms[i],profile,seed+i*91);
    art.group.name=profile.names[i];art.group.position.set(spot.x,height(spot.x,spot.z),spot.z);art.group.rotation.y=rand()*6.28;group.add(art.group);surfaces.push(art);
    // Sink the lowest root/rock vertices into the real hillside. Terrain and
    // its diggable layers remain untouched, with no floating root ends.
    art.group.updateMatrixWorld(true);
    const point=new THREE.Vector3();
    for(const mesh of art.group.children) {
      const p=mesh.geometry.attributes.position;
      for(let v=0;v<p.count;v++)if(p.getY(v)<.7) {
        point.fromBufferAttribute(p,v).applyMatrix4(art.group.matrixWorld);
        const follow=Math.min(1,Math.max(0,(.7-p.getY(v))/.7));
        p.setY(v,p.getY(v)+(height(point.x,point.z)-art.group.position.y)*follow);
      }
      mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
    }
    const long=['fallen','timber'].includes(profile.forms[i]),stone=['tor','steps'].includes(profile.forms[i]);
    const records=[];
    for(const offset of long?[-2.6,-1.3,0,1.3,2.6]:[0]) {
      const a=art.group.rotation.y,c={x:spot.x+Math.cos(a)*offset,z:spot.z-Math.sin(a)*offset,r:long?.6:stone?2.7:.6};
      colliders.push(c);records.push(c);
    }
    landmarks.push({...spot,name:profile.names[i],form:profile.forms[i],colliders:records});
  }
  // Saplings and shrubs add age/shape variety without advancing any world RNG.
  const leaf=vegetationMaterial({color:profile.leaf,forest:profile.forest}),bark=vegetationMaterial({color:profile.bark,forest:profile.forest});
  const entries=[],limit=low?100:200;
  for(let i=0;i<limit*20&&entries.length<limit;i++) {
    const x=(rand()-.5)*(profile.forest?180:216),z=(rand()-.5)*(profile.forest?280:216);
    if(!safe(x,z,1)||landmarks.some(l=>Math.hypot(x-l.x,z-l.z)<5))continue;
    entries.push({x,z,s:.45+rand()*.85,tall:entries.length%3===0,r:rand()*6.28});
  }
  const stemGeo=markFoliage(new THREE.CylinderGeometry(.012,.045,1,5).translate(0,.5,0),0);
  const leaves=leafSpray(seed+71,low?48:90,profile.forest);
  const shrubs=new THREE.InstancedMesh(leaves,leaf.material,entries.length*3),stems=new THREE.InstancedMesh(stemGeo,bark.material,entries.length);
  shrubs.name=`${region} understory`;stems.name='Young stems';shrubs.customDepthMaterial=leaf.depthMaterial;stems.customDepthMaterial=bark.depthMaterial;
  const dummy=new THREE.Object3D();
  entries.forEach((p,i)=>{
    const y=height(p.x,p.z),h=p.tall?2.6*p.s:.7*p.s;
    dummy.position.set(p.x,y,p.z);dummy.rotation.set(0,p.r,p.tall?.1:0);dummy.scale.set(p.s,h,p.s);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);
    for(let k=0;k<3;k++) {
      const a=p.r+k*2.4,r=p.tall?.36:.28;
      dummy.position.set(p.x+Math.cos(a)*r,y+h*(.62+k*.12),p.z+Math.sin(a)*r);dummy.rotation.set(0,a,.2);dummy.scale.set(p.s,p.s*(p.tall?1.4:.8),p.s);dummy.updateMatrix();shrubs.setMatrixAt(i*3+k,dummy.matrix);
    }
  });
  group.add(stems,shrubs);shrubs.receiveShadow=true;
  const lod=vegetationLOD(scene,[shrubs,stems],low);
  return {group,landmarks,lod,update(dt,time,player,wind=1) {
    leaf.update(time,wind);bark.update(time,wind);surfaces.forEach(s=>s.update(time,wind));lod.update(dt,player);
  }};
}
