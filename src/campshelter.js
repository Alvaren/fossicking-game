import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { shelterInfo } from './shelter.js';

// Metres, Y up, entry facing local -X, matching the existing tent GLB.
// All four stages have local geometry, including when model loading fails.
export class CampShelter {
  constructor(scene, terrain, camp, colliders) {
    this.flip = terrain.creek.cx(terrain.camp.z) > terrain.camp.x ? -1 : 1;
    this.spot = { x: terrain.camp.x + 3.5 * this.flip, z: terrain.camp.z + 4 * this.flip };
    this.group = new THREE.Group();
    this.group.name = 'camp-shelter';
    this.group.position.set(this.spot.x, terrain.camp.y, this.spot.z);
    this.group.rotation.y = this.flip < 0 ? Math.PI : 0;
    scene.add(this.group);
    this.colliders = colliders; this.ownedColliders = [];
    const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
    this.materials = {
      canvas: mat(0x626c45, { side: THREE.DoubleSide }), bed: mat(0x344d43), pillow: mat(0xbbb08c),
      wood: mat(0x73573c), frame: mat(0x3d4544, { metalness: 0.35 }), rope: mat(0xb8a983),
      tin: mat(0x93a3a0, { metalness: 0.55, roughness: 0.62, side: THREE.DoubleSide }), roof: mat(0x835b41, { metalness: 0.45, side: THREE.DoubleSide }),
      glow: mat(0xf2ca7f, { emissive: 0xffbd54, emissiveIntensity: 0.65 }), ground: mat(0x68624a),
    };
    this.stages = {};
    for (const id of ['swag', 'tent', 'caravan', 'shed']) { const g = new THREE.Group(); g.name = `shelter-${id}`; this.stages[id] = g; this.group.add(g); }
    this.buildSwag(this.stages.swag);
    this.tentFallback = new THREE.Group(); this.stages.tent.add(this.tentFallback);
    this.buildTent(this.tentFallback);
    this.buildCaravan(this.stages.caravan);
    this.buildShed(this.stages.shed);
    // Merge static pieces by material to keep the detailed camp cheap on phones.
    for (const g of [this.stages.swag, this.tentFallback, this.stages.caravan, this.stages.shed]) this.batch(g);
    this.light = new THREE.PointLight(0xffcb8a, 0, 7, 2);
    this.light.position.set(-1.4, 1.65, 0); this.group.add(this.light);
    this.sync(camp);
  }
  mesh(g, geo, material, x, y, z) {
    const m = new THREE.Mesh(geo, this.materials[material]); m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  }
  box(g, w, h, d, x, y, z, material = 'wood') { return this.mesh(g, new THREE.BoxGeometry(w, h, d), material, x, y, z); }
  pole(g, a, b, r = 0.025, material = 'frame') {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
    const m = this.mesh(g, new THREE.CylinderGeometry(r, r, delta.length(), 8), material, 0, 0, 0);
    m.position.copy(start.add(end).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return m;
  }
  face(g, points, material) {
    const vertices = [];
    for (let i = 1; i < points.length - 1; i++) vertices.push(...points[0], ...points[i], ...points[i + 1]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.computeVertexNormals();
    return this.mesh(g, geo, material, 0, 0, 0);
  }
  bed(g, y = 0.12, z = 0, raised = false) {
    if (raised) { this.box(g, 1.9, 0.09, 0.8, 0.1, y - 0.12, z, 'frame'); for (const x of [-0.7, 0.9]) for (const dz of [-0.31,0.31]) this.box(g, 0.05, y - 0.12, 0.05, x, (y - 0.12) / 2, z + dz, 'frame'); }
    this.box(g, 1.85, 0.17, 0.74, 0.1, y, z, 'bed');
    this.box(g, 0.34, 0.09, 0.57, -0.56, y + 0.12, z, 'pillow');
    this.box(g, 1.12, 0.04, 0.76, 0.39, y + 0.105, z, 'canvas');
  }
  lantern(g, x, y, z) {
    this.mesh(g, new THREE.CylinderGeometry(0.07,0.085,0.17,10), 'glow', x,y,z);
    for (const dy of [-0.115,0.115]) this.mesh(g,new THREE.CylinderGeometry(0.095,0.095,0.045,10),'frame',x,y+dy,z);
    this.pole(g,[x,y+0.12,z],[x,y+0.27,z],0.018);
  }
  buildSwag(g) {
    this.box(g, 2.2, 0.025, 1.06, 0.05, 0.025, 0, 'ground'); this.bed(g);
    // Low arched canvas hood at the head, leaving the bedroll visible.
    for (const x of [-0.79,-0.23]) {
      const points = Array.from({length:17},(_,i)=>new THREE.Vector3(x,0.17+Math.sin(i/16*Math.PI)*0.46,Math.cos(i/16*Math.PI)*0.43));
      this.mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,0.015,5,false),'frame',0,0,0);
    }
    for(let i=0;i<16;i++) { const a=i/16*Math.PI,b=(i+1)/16*Math.PI; this.face(g,[[-.79,.17+Math.sin(a)*.46,Math.cos(a)*.43],[-.23,.17+Math.sin(a)*.46,Math.cos(a)*.43],[-.23,.17+Math.sin(b)*.46,Math.cos(b)*.43],[-.79,.17+Math.sin(b)*.46,Math.cos(b)*.43]],'canvas'); }
    const roll=this.mesh(g,new THREE.CylinderGeometry(.16,.16,.75,16),'canvas',.98,.18,0);roll.rotation.x=Math.PI/2;
    this.box(g,.36,.31,.3,.6,.17,.76,'wood');
  }
  buildTent(g) {
    this.box(g,2.6,.025,2.1,0,.02,0,'ground'); this.bed(g,.17,.36);
    for(const side of [-1,1]) {
      this.face(g,[[-1.3,.35,side*1.05],[1.3,.35,side*1.05],[1.3,1.8,0],[-1.3,1.8,0]],'canvas');
      this.box(g,2.6,.35,.025,0,.175,side*1.05,'canvas');
      this.face(g,[[-1.3,0,side*1.05],[-1.3,.35,side*1.05],[-1.3,1.8,0],[-1.3,1.2,side*.3],[-1.3,0,side*.3]],'canvas');
      for(const x of [-1.3,1.3]) this.pole(g,[x,.35,side*1.05],[x,.03,side*1.55],.009,'rope');
    }
    this.face(g,[[1.3,0,-1.05],[1.3,0,1.05],[1.3,.35,1.05],[1.3,1.8,0],[1.3,.35,-1.05]],'canvas');
    this.pole(g,[-1.35,0,0],[-1.35,1.9,0],.025,'wood'); this.pole(g,[1.35,0,0],[1.35,1.9,0],.025,'wood');
    this.pole(g,[-1.35,1.84,0],[1.35,1.84,0],.025,'wood');
    this.pole(g,[-1.35,1.9,0],[-2.25,.05,0],.007,'rope');
    this.lantern(g,-1.46,1.42,.22);
  }
  sheet(g,w,h,x,y,z,material='tin') {
    const geo=new THREE.PlaneGeometry(w,h,Math.ceil(w/.04),1),p=geo.attributes.position;
    for(let i=0;i<p.count;i++)p.setZ(i,Math.sin((p.getX(i)+w/2)*Math.PI*2/.16)*.018);
    geo.computeVertexNormals(); return this.mesh(g,geo,material,x,y,z);
  }
  buildCaravan(g) {
    this.box(g,3.7,.16,2.35,0,.48,0,'frame');
    this.box(g,3.65,1.75,2.3,0,1.44,0,'tin');
    this.box(g,3.83,.16,2.4,0,2.38,0,'pillow');
    for(const z of [-1.16,1.16]) {
      this.box(g,3.65,.28,.025,0,.88,z,'canvas');
      for(const x of [-1.08,1.02]) {this.box(g,.86,.64,.04,x,1.71,z,'frame');this.box(g,.75,.53,.05,x,1.71,z*1.006,'bed');}
    }
    for(const x of [-1.845,1.845]) { this.box(g,.04,.58,1.5,x,1.7,0,'frame');this.box(g,.05,.46,1.38,x*1.004,1.7,0,'bed'); }
    this.box(g,.06,1.54,.69,-1.86,1.25,0,'pillow');this.box(g,.07,.05,.06,-1.91,1.25,-.22,'frame');
    this.box(g,.48,.18,.78,-2.05,.3,0,'frame');
    for(const z of [-1.2,1.2]) {const wheel=this.mesh(g,new THREE.CylinderGeometry(.34,.34,.18,20),'frame',.4,.34,z);wheel.rotation.x=Math.PI/2;const hub=this.mesh(g,new THREE.CylinderGeometry(.15,.15,.2,16),'tin',.4,.34,z);hub.rotation.x=Math.PI/2;}
    for(const z of [-.6,.6])this.pole(g,[1.8,.42,z],[2.65,.42,0],.045,'frame');
    this.pole(g,[2.65,.08,0],[2.65,.48,0],.035,'frame');
    this.lantern(g,-1.96,1.9,-.58);
  }
  buildShed(g) {
    this.box(g,3.65,.12,3.25,0,.03,0,'ground');
    for(const z of [-1.6,1.6])this.sheet(g,3.6,2.2,0,1.16,z);
    this.sheet(g,3.2,2.2,1.8,1.16,0).rotation.y=Math.PI/2;
    // Open doorway; the interior and bunk remain reachable.
    for(const z of [-1.12,1.12])this.sheet(g,.96,2.2,-1.8,1.16,z).rotation.y=Math.PI/2;
    this.sheet(g,1.28,.35,-1.8,2.08,0).rotation.y=Math.PI/2;
    for(const x of [-1.8,1.8]) {
      this.face(g,[[x,2.26,-1.6],[x,2.71,0],[x,2.26,1.6]],'tin');
      for(const z of [-1.6,1.6])this.box(g,.08,2.24,.08,x,1.13,z,'frame');
    }
    for(const z of [-.67,.67])this.box(g,.1,1.95,.09,-1.83,1.01,z,'wood');
    this.box(g,.1,.1,1.43,-1.83,1.97,0,'wood');
    const angle=Math.atan2(.45,1.8);
    for(const side of [-1,1]) { const roof=this.sheet(g,4.0,Math.hypot(1.8,.45),0,2.515,side*.9,'roof');roof.rotation.x=-Math.PI/2+side*angle; }
    this.pole(g,[-2,2.77,0],[2,2.77,0],.04,'roof');
    // Shallow verandah extends towards the camp, away from the wash bench.
    for(let i=0;i<8;i++)this.box(g,.105,.07,3.25,-1.86-i*.12,.08,0,'wood');
    const awning=this.sheet(g,3.5,1.17,-2.36,2.06,0,'roof'); awning.rotation.set(0,0,0); awning.rotation.x=-Math.PI/2;awning.rotation.z=Math.PI/2;
    for(const z of [-1.5,1.5])this.box(g,.075,2.05,.075,-2.82,1.055,z,'wood');
    this.bed(g,.48,1.06,true);
    this.box(g,1.7,.08,.57,.35,.82,-1.12,'wood');
    for(const x of [-.35,1.05])this.box(g,.08,.78,.48,x,.42,-1.12,'wood');
    for(let i=0;i<4;i++)this.box(g,.27,.19,.3,-.18+i*.34,.96,-1.12,'canvas');
    this.lantern(g,-1.86,1.68,-.85);
    this.box(g,.55,.4,.45,1.26,.27,-.34,'wood');
  }
  batch(g) {
    const groups = new Map(); g.updateMatrixWorld(true);
    for(const child of [...g.children]) {
      if(!child.isMesh)continue;
      const geo=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();
      geo.deleteAttribute('uv'); geo.applyMatrix4(child.matrix);
      if(!groups.has(child.material))groups.set(child.material,[]);
      groups.get(child.material).push(geo);g.remove(child);child.geometry.dispose();
    }
    for(const [material,geos] of groups) { const geo=mergeGeometries(geos); const m=new THREE.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;g.add(m);for(const piece of geos)piece.dispose(); }
  }
  applyModel(model) {
    if(!model || this.tentModel)return;
    this.tentModel=model.clone(true);this.stages.tent.add(this.tentModel);this.tentFallback.visible=false;
    // Lighting is a shelter feature even when the old GLB supplies the canvas.
    const lamp=new THREE.Group();this.lantern(lamp,-1.46,1.42,.22);this.batch(lamp);this.stages.tent.add(lamp);
  }
  sync(camp) {
    const id=shelterInfo(camp).id;
    for(const [key,g] of Object.entries(this.stages))g.visible=key===id;
    if(this.current===id)return;
    this.current=id;
    for(const c of this.ownedColliders) { const i=this.colliders.indexOf(c);if(i>=0)this.colliders.splice(i,1); }
    this.ownedColliders=[];
    const add=(x,z,r)=>{const c={x:this.spot.x+x*this.flip,z:this.spot.z+z*this.flip,r};this.colliders.push(c);this.ownedColliders.push(c);};
    if(id==='swag') {add(-.45,0,.42);add(.45,0,.42);}
    else if(id==='tent') {add(-.55,0,.85);add(.55,0,.85);}
    else if(id==='caravan') {for(const x of [-1.15,0,1.15])add(x,0,.95);add(2.25,0,.3);}
    else {
      for(let x=-1.8;x<=1.81;x+=.4)for(const z of [-1.6,1.6])add(x,z,.22);
      for(let z=-1.2;z<=1.21;z+=.4)add(1.8,z,.22);
      for(const z of [-1.2,1.2])add(-1.8,z,.22);
      for(const z of [-1.5,1.5])add(-2.82,z,.09);
      // Furnishings keep the walking aisle clear while avoiding clipping the bunk.
      for(const x of [-.5,.3,1.1])add(x,1.06,.36);
    }
  }
  update(night) { this.light.intensity=this.current==='swag'?0:Math.max(0,night-.2)*(this.current==='shed'?5:2.5); }
  near(pos) { return Math.hypot(pos.x-this.spot.x,pos.z-this.spot.z)<3.5; }
}
