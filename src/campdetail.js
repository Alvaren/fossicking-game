import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Small, batched belongings fit outside shelter doors and existing work areas.
export function dressCamp(scene,{camp,height,flip=1,forest=false}) {
  const group=new THREE.Group();group.name='Camp belongings';scene.add(group);
  const parts={wood:[],cloth:[],leather:[],rope:[]};
  const point=(x,y,z)=>[camp.x+x*flip,height(camp.x+x*flip,camp.z+z*flip)+y,camp.z+z*flip];
  function box(kind,size,x,y,z) { const g=new THREE.BoxGeometry(...size);g.translate(...point(x,y,z));parts[kind].push(g); }
  function pole(kind,a,b,r) {
    const start=new THREE.Vector3(...point(...a)),end=new THREE.Vector3(...point(...b)),d=end.clone().sub(start);
    const g=new THREE.CylinderGeometry(r,r,d.length(),7);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());parts[kind].push(g);
  }
  if(!forest) {
    for(let i=0;i<9;i++) {const x=2.5+(i%3)*.17,y=.1+Math.floor(i/3)*.14;pole('wood',[x,y,1.1],[x,y,2],.08);}
    // A short rack behind the shelter, clear of all four stages and their door.
    for(const x of [2.2,4.5])pole('wood',[x,0,6.7],[x,1.6,6.7],.035);
    pole('rope',[2.2,1.5,6.7],[4.5,1.5,6.7],.009);
    box('cloth',[.5,.65,.025],2.8,1.12,6.7);box('cloth',[.42,.8,.035],3.7,1.05,6.7);
  } else {
    box('cloth',[.42,.52,.23],1.5,.26,.65);
    pole('rope',[1.3,.54,.65],[1.7,.54,.65],.018);
  }
  const bx=forest?1.45:2.4,bz=forest?-.65:5.4;
  for(const dx of [-.12,.12]) {
    box('leather',[.15,.11,.32],bx+dx,.065,bz);
    box('leather',[.15,.23,.17],bx+dx,.18,bz+.065);
  }
  const colors={wood:0x6c5139,cloth:0x727d64,leather:0x44372b,rope:0xb7a57a};
  for(const [kind,geos] of Object.entries(parts))if(geos.length) {
    const mesh=new THREE.Mesh(mergeGeometries(geos),new THREE.MeshStandardMaterial({color:colors[kind],roughness:.92}));
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);geos.forEach(g=>g.dispose());
  }
  // Narrow irregular worn ribbons follow the heightfield instead of flattening it.
  const vertices=[];
  const routes=forest?[[[-1.8,-1.5],[0,-2]]]:[[[-5,0],[.2,1]],[[.2,1],[2.1,4]],[[.2,1],[-.8,3.2]]];
  for(const [a,b] of routes)for(let i=0;i<16;i++) {
    const p=t=>{const x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,w=(.18+.07*Math.sin(t*19))*(Math.sin(t*Math.PI)*.65+.35);return [-1,1].map(s=>point(x+s*w,.017,z));};
    const u=p(i/16),v=p((i+1)/16);vertices.push(...u[0],...u[1],...v[0],...u[1],...v[1],...v[0]);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
  const path=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:forest?0x756948:0x8d7b59,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide,roughness:1}));path.receiveShadow=true;group.add(path);
  return group;
}

export function campSmoke(scene,origin,low=false) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const g=canvas.getContext('2d'),gradient=g.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'rgba(190,187,177,.6)');gradient.addColorStop(.45,'rgba(180,179,170,.2)');gradient.addColorStop(1,'rgba(180,179,170,0)');g.fillStyle=gradient;g.fillRect(0,0,64,64);
  const material=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,opacity:.2,depthWrite:false,color:0xb7b9af});
  const group=new THREE.Group();group.name='Campfire smoke';scene.add(group);
  const count=low?7:12;
  for(let i=0;i<count;i++){const sprite=new THREE.Sprite(material.clone());group.add(sprite);}
  return {group,update(time,wind=1,night=0) {
    group.children.forEach((p,i)=>{
      const age=((time*.22+i/count)%1),s=.25+age*1.5;
      p.position.set(origin.x+age*age*wind*.8+Math.sin(time*.7+i)*age*.12,origin.y+.65+age*3.2,origin.z+age*age*wind*.35);
      p.scale.set(s,s,1);p.material.opacity=Math.sin(age*Math.PI)*.17*(1-night*.7);p.material.rotation=Math.sin(i+time*.08)*.4;
    });
  }};
}
