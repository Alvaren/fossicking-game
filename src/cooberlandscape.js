import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from './noise.js';

// Surface context for the opal field. Spoil cones are excavated material,
// confined to the distant workings; houses never get a mound built over them.
export function buildCooberLandscape(scene,terrain,seed,colliders) {
  const r=mulberry32(seed+82117),group=new THREE.Group();group.name='Opal-field equipment and distant mullock';scene.add(group);
  const geo=new THREE.ConeGeometry(1,1,9,3),p=geo.attributes.position;
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),z=p.getZ(i),h=p.getY(i);
    p.setXYZ(i,x*(1+.1*Math.sin(z*7+h*5)),h,z*(1+.1*Math.cos(x*5+h*3)));
  }
  geo.computeVertexNormals();
  const heaps=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({roughness:1}),180),dummy=new THREE.Object3D();
  heaps.name='Distant white mullock';
  for(let i=0;i<180;i++) {
    const a=r()*Math.PI*2,dist=155+r()*270,x=Math.cos(a)*dist,z=Math.sin(a)*dist;
    const h=1.2+r()*3.6,rad=1.5+r()*3.4;
    dummy.position.set(x,terrain.rawHeight(x,z)+h/2-.12,z);dummy.scale.set(rad,h,rad*(.7+r()*.5));dummy.rotation.set(0,r()*6.28,0);dummy.updateMatrix();heaps.setMatrixAt(i,dummy.matrix);
    heaps.setColorAt(i,new THREE.Color().setRGB(.72+r()*.14,.65+r()*.14,.51+r()*.15));
  }
  heaps.receiveShadow=true;group.add(heaps);
  // A stationary blower beside the existing shaft/spoil area: truck chassis,
  // cyclone receiver, suction pipe and engine. No new driving mechanics.
  const machine=new THREE.Group(),o=terrain.sources.opal,x=o.x-21,z=o.z-8;
  machine.position.set(x,terrain.getHeight(x,z),z);machine.rotation.y=.45;group.add(machine);
  const parts=new Map();
  function add(geometry,color) {
    if(!parts.has(color))parts.set(color,[]);parts.get(color).push(geometry);
  }
  function box(x,y,z,w,h,d,color){add(new THREE.BoxGeometry(w,h,d).translate(x,y,z),color);}
  function pipe(a,b,rad,color){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const g=new THREE.CylinderGeometry(rad,rad,delta.length(),10);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());add(g,color);}
  box(0,.7,0,1.9,.2,4.7,0x575650);box(0,1.12,1.15,1.95,.13,2.1,0xb3aca0);
  box(0,1.32,-1.5,1.8,1.12,1.3,0xaaa997);box(0,1.87,-1.4,1.65,.6,1.2,0x96978b);
  box(0,1.92,-2.02,1.35,.42,.03,0x334749);box(0,1.08,-2.19,1.9,.18,.13,0x696b61);
  for(const xx of [-.98,.98])for(const zz of [-1.4,1.5]) {
    const wheel=new THREE.CylinderGeometry(.44,.44,.25,14).rotateZ(Math.PI/2).translate(xx,.44,zz);add(wheel,0x363633);
    add(new THREE.CylinderGeometry(.21,.21,.27,10).rotateZ(Math.PI/2).translate(xx,.44,zz),0x858980);
  }
  box(-.52,1.45,1.2,.62,.55,.9,0x857952);
  for(const xx of [-.7,.7])pipe([xx,1,1],[xx,4.6,1],.075,0x797a72);
  add(new THREE.CylinderGeometry(.63,.63,1.45,16).translate(0,4.75,1),0xc6c2b3);
  add(new THREE.CylinderGeometry(.63,.16,.8,16).translate(0,3.63,1),0xaba89a);
  pipe([0,5.48,1],[1.3,5.48,1],.21,0xc1b8a2);pipe([1.3,5.48,1],[2,2,1],.21,0xc1b8a2);
  pipe([0,3.2,1],[0,2.8,2.4],.16,0x8d8e80);
  for(const [color,geometries] of parts) {
    const mat=new THREE.MeshStandardMaterial({color,roughness:.8,metalness:.18});
    const mesh=new THREE.Mesh(mergeGeometries(geometries.map(g=>g.toNonIndexed())),mat);mesh.castShadow=true;mesh.receiveShadow=true;machine.add(mesh);
    geometries.forEach(g=>g.dispose());
  }
  colliders.push({x,z,r:3});
  return group;
}
