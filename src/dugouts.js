import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { cooberMaterial } from './coobermaterials.js';
import { buildCooberLandscape } from './cooberlandscape.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from './noise.js';
import { signTexture } from './world.js';
import { makeCrystalMesh, crystalToGem } from './crystals.js';
import { DUGOUTS, DUGOUT_SITES, DUGOUT_DEPTH, cooberBaseHeight, walkable, moveInDugout, opalFaces, restoreOpalWork, takeOpalFace } from './cooberpedy.js';

// Mine-compatible content: the original updateUnderground, input bindings,
// tool model, pause/map and collection path remain the player controller.
export class Dugouts {
  constructor(scene,terrain,seed,saved,colliders) {
    this.scene=scene;this.terrain=terrain;this.ok=true;this.inside=false;this.climb=null;this.portal=true;
    this.faces=opalFaces(seed);this.taken=restoreOpalWork(saved,this.faces);this.work=0;this.workId=null;
    this.raycaster=new THREE.Raycaster();this.r=mulberry32(seed*53+91);
    this.materials={};
    this.rock=cooberMaterial({interior:true});
    this.floorMat=cooberMaterial({floor:true});
    this.entries=DUGOUTS.map((plan,i)=>this.buildEntry(plan,i,colliders));
    this.active=this.entries[0];this.x=this.active.x;this.z=this.active.z;
    for(const entry of this.entries)this.buildInterior(entry);
    buildCooberLandscape(scene,terrain,seed,colliders);
    this.pendingRestore=saved?.interior;
  }
  material(color,roughness=.85,metalness=0) {
    const key=`${color}/${roughness}/${metalness}`;
    return this.materials[key]??=new THREE.MeshStandardMaterial({color,roughness,metalness,envMapIntensity:.15});
  }
  box(group,x,y,z,w,h,d,color,rotation=0) {
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof color==='number'?this.material(color):color);
    m.position.set(x,y,z);m.rotation.y=rotation;m.castShadow=true;m.receiveShadow=true;group.add(m);return m;
  }
  pole(group,a,b,r,color) {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),10),this.material(color));
    mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    mesh.castShadow=true;group.add(mesh);return mesh;
  }
  sign(group,text,x,y,z,w=1.8,h=.38,rotation=0) {
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:signTexture(text,'#e7d2a4','#303b39',42),roughness:1,emissive:0x18110a,side:THREE.DoubleSide}));
    m.position.set(x,y,z);m.rotation.y=rotation;group.add(m);return m;
  }
  buildEntry(plan,index,colliders) {
    const T=this.terrain,spot=DUGOUT_SITES[index];
    const y=cooberBaseHeight(spot.x,spot.z,T.n2)-DUGOUT_DEPTH,entry={...spot,y,plan,floor:y,obstacles:[],lights:[]};
    const facade=new THREE.Group();facade.name=plan.name+' rock-cut entrance';facade.position.set(spot.x,y,spot.z);this.scene.add(facade);entry.facade=facade;
    // The home is below the original plain. A shallow access trench descends
    // to this door; only vents and the address sign project above ground.
    const trim=plan.id==='lantern'?0xded7c8:0x777a74;
    this.box(facade,0,1.35,1.93,3.65,2.7,.2,0x8d7863);
    this.box(facade,0,1.23,1.78,1.12,2.46,.12,plan.kind==='home'?0x496963:0x383e3c);
    for(const x of [-.62,.62])this.box(facade,x,1.3,1.65,.10,2.6,.13,trim);
    this.box(facade,0,2.61,1.65,1.35,.10,.13,trim);
    this.box(facade,.4,1.1,1.66,.045,.23,.04,0xbeb9a8);
    if(plan.kind==='home')for(const x of [-1.25,1.25]) {
      this.box(facade,x,1.7,1.74,.62,.82,.10,trim);
      this.box(facade,x,1.7,1.67,.48,.68,.02,0x283a3d);
      this.box(facade,x,1.7,1.65,.025,.68,.02,trim);
    }
    this.box(facade,0,-.05,-.2,3.6,.13,3.8,0xc1b29a);
    for(let i=0;i<24;i++) {
      const shade=this.box(facade,-1.78+i*.155,2.9+(i%2)*.022,-.15,.16,.045,3.3,0xa0a29b);shade.rotation.x=.07;
    }
    for(const x of [-1.8,1.8])this.box(facade,x,1.37,-1.77,.06,2.75,.06,0x81847c);
    this.sign(facade,plan.name,0,2.38,1.59,2.8,.27,Math.PI);
    // A handrail follows the cut; both sides remain clear of the walking line.
    for(const x of [-2.85,2.85]) {
      let previous;
      for(const z of [-12,-9,-6,-3,0]) {
        const ground=T.getHeight(spot.x+x,spot.z+z)-y;
        const top=new THREE.Vector3(x,ground+1,z);
        this.pole(facade,[x,ground-.08,z],top.toArray(),.035,0x817e72);
        if(previous)this.pole(facade,previous.toArray(),top.toArray(),.027,0x817e72);
        previous=top;
      }
    }
    const signY=T.getHeight(spot.x+3.5,spot.z-12)-y;
    this.pole(facade,[3.5,signY,-12],[3.5,signY+1.7,-12],.045,0x66655e);
    this.sign(facade,plan.name,3.5,signY+1.45,-12,2.5,.38,Math.PI);
    for(const [i,[x,z]] of [[-3.2,8],[3,18]].entries()) {
      const roof=T.getHeight(spot.x+x,spot.z+z)-y,top=roof+1.15+i*.4;
      this.pole(facade,[x,roof-.1,z],[x,top,z],.12,0xb8b6aa);
      const cap=new THREE.Mesh(new THREE.ConeGeometry(.23,.16,12),this.material(0x777b76,.5,.35));
      cap.position.set(x,top+.14,z);facade.add(cap);
      this.pole(facade,[x,top-.1,z],[x,top+.12,z],.055,0x777b76);
    }
    colliders.push({x:spot.x,z:spot.z+2.05,r:1.58});
    T.sources[plan.id]={x:spot.x,z:spot.z,label:plan.name,colour:'#b89059',known:true};
    return entry;
  }
  buildInterior(entry) {
    const {plan}=entry,g=new THREE.Group();g.name=plan.name;g.position.set(entry.x,entry.floor,entry.z);g.visible=false;this.scene.add(g);entry.group=g;
    const floors=[],roofs=[],walls=[];
    for(const cell of plan.cells) {
      const [x,z]=cell.split(',').map(Number);
      floors.push(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2).translate(x+.5,0,z+.5));
      const roof=new THREE.PlaneGeometry(1,1,4,4).rotateX(Math.PI/2),p=roof.attributes.position;
      for(let i=0;i<p.count;i++) {const px=p.getX(i)+x+.5,pz=p.getZ(i)+z+.5;
        let distance=2;
        for(const e of plan.edges) {
          const t=Math.max(0,Math.min(1,(px-e.x)*e.dx+(pz-e.z)*e.dz));
          distance=Math.min(distance,Math.hypot(px-e.x-e.dx*t,pz-e.z-e.dz*t));
        }
        const shoulder=.48*(1-Math.sin(Math.min(1,distance/.8)*Math.PI/2));
        p.setXYZ(i,px,plan.height-shoulder+Math.sin(px*1.7+pz*.7)*.045,pz);}
      roof.computeVertexNormals();roofs.push(roof);
    }
    for(const e of plan.edges) {
      const wall=new THREE.PlaneGeometry(1,plan.height+.18,4,12),p=wall.attributes.position;
      for(let i=0;i<p.count;i++) {
        const s=p.getX(i)+.5,y=p.getY(i)+plan.height/2,x=e.x+e.dx*(s*1.06-.03),z=e.z+e.dz*(s*1.06-.03);
        // Overlap corners and floor/roof; roughness must never open sky cracks.
        const rough=(Math.sin(x*9.2+z*8.3+y*6.8)*.018+Math.sin(y*22+x*3)*.007)*Math.sin(s*Math.PI);
        const shoulder=.24*Math.pow(Math.max(0,(y-plan.height+.75)/.75),2);
        p.setXYZ(i,x+e.nx*(rough+shoulder),y,z+e.nz*(rough+shoulder));
      }
      wall.computeVertexNormals();walls.push(wall);
    }
    for(const [parts,mat] of [[floors,this.floorMat],[roofs,this.rock],[walls,this.rock]]) {
      const mesh=new THREE.Mesh(mergeGeometries(parts),mat);mesh.receiveShadow=true;g.add(mesh);parts.forEach(p=>p.dispose());
      if(parts===walls)entry.walls=mesh;
    }
    for(const prop of plan.props)this.furnish(entry,...prop);
    for(const [x,y,z] of plan.lamps) {
      this.pole(g,[x,y+.35,z],[x,y,z],.018,0x524d44);
      const shade=new THREE.Mesh(new THREE.ConeGeometry(.23,.22,16,1,true),this.material(0xe6d4ae));shade.position.set(x,y,z);g.add(shade);
      const bulb=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),new THREE.MeshBasicMaterial({color:0xffefd1}));bulb.position.set(x,y-.05,z);g.add(bulb);
      const light=new THREE.PointLight(0xffe6c4,plan.kind==='mine'?5:8,plan.kind==='mine'?8:11,1.5);light.position.set(x,y-.3,z);g.add(light);entry.lights.push(light);
    }
    // Local fill cannot escape to the surface; it is enabled only in this interior.
    const fill=new THREE.HemisphereLight(0xeee3d1,0x8c715c,plan.kind==='mine'?.35:.75);g.add(fill);
    this.sign(g,'EXIT · surface',.5,2.1,3.025,1.5,.32);
    this.box(g,.5,1.25,2.94,2,2.5,.12,0x45524d);
    if(plan.kind==='mine') {
      this.sign(g,'West gallery  ←   →  East gallery',.5,2.25,8,2.25,.25,Math.PI);
      this.sign(g,'Follow the pale seams along the clay band',.5,2.25,24,2.5,.25,Math.PI);
      for(let z=4;z<28;z+=5) {
        for(const x of [-.85,1.85])this.box(g,x,1.2,z,.13,2.4,.14,0x655039);
        this.box(g,.5,2.43,z,2.9,.15,.16,0x655039);
      }
      this.buildFaces(entry);
    } else {
      // Carved, rounded door heads distinguish domestic rooms from mine drives.
      for(const [x0,x1,z0,z1] of plan.rooms.filter(r=>r[1]-r[0]===1)) {
        const span=z1-z0,shape=new THREE.Shape();shape.moveTo(-span/2,2.35);
        for(let i=0;i<=16;i++){const t=i/16;shape.lineTo(-span/2+t*span,2.35+Math.sin(t*Math.PI)*.48);}
        shape.lineTo(span/2,plan.height+.1);shape.lineTo(-span/2,plan.height+.1);shape.closePath();
        const arch=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:x1-x0+.08,bevelEnabled:false}),this.rock);
        arch.rotation.y=Math.PI/2;arch.position.set(x0-.04,0,(z0+z1)/2);g.add(arch);
      }
      this.sign(g,plan.id==='lantern'?'LANTERN HOUSE · 1974':'No. 4 · underground home',.5,2.4,3,2.3,.28,Math.PI);
    }
    g.updateMatrixWorld(true);
  }
  furnish(entry,kind,x,z,rotation) {
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;entry.group.add(g);
    const box=(a,b,c,w,h,d,color)=>this.box(g,a,b,c,w,h,d,color);
    const soft=(a,b,c,w,h,d,color)=>{
      const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(.075,h/3,w/3,d/3)),this.material(color));
      m.position.set(a,b,c);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
    };
    let w=1,d=1;
    if(kind==='rug') {
      box(0,.008,0,3.9,.012,3.7,0x734536);
      for(const dx of [-1.75,1.75])box(dx,.016,0,.12,.008,3.55,0xc6a45f);return;
    }
    if(kind==='sofa') {
      w=1.05;d=2.6;soft(0,.35,0,1.05,.6,2.6,0x537477);soft(-.43,.8,0,.22,.9,2.6,0x537477);
      for(const zz of [-1.18,1.18])soft(0,.72,zz,1.05,.3,.24,0x719094);
      for(const zz of [-.65,0,.65])soft(.1,.69,zz,.74,.14,.59,0x849b99);
    } else if(kind==='bed') {
      w=1.65;d=2.4;box(0,.25,0,1.65,.4,2.4,0x66503a);box(0,.52,0,1.57,.2,2.3,0xd3bb91);
      box(0,.67,.3,1.57,.12,1.55,entry.plan.id==='lantern'?0x4c7177:0x8e7258);
      soft(0,.69,-.82,1.22,.22,.42,0xe7d8b9);box(0,.8,-1.22,1.75,1.3,.12,0x66503a);
    } else if(kind==='kitchen') {
      w=1.05;d=4;box(0,.48,-.5,1.05,.9,3,0x5e7874);box(0,.97,-.5,1.15,.12,3.1,0xdbd4bb);
      box(0,1.03,-.9,.68,.02,.8,0x5c6666);box(.3,1.16,-.9,.035,.28,.035,0xb5b5ab);
      for(const zz of [-1.5,-.5,.5])box(-.54,.68,zz,.025,.04,.24,0xc9b995);
      soft(0,1,1.5,1.05,1.95,.95,0xdfd8c5);
      box(-.54,1.5,1.5,.025,.025,.91,0xa1a093);
      for(const yy of [1.1,1.68])box(-.56,yy,1.2,.06,.24,.035,0x8b8d82);
      box(-.56,1.1,-1.6,.15,.22,.15,0xb07142);
    } else if(kind==='display'||kind==='shelf') {
      w=.75;d=2.65;
      for(const zz of [-1.3,1.3])box(0,1,zz,.75,2,.09,0x715236);
      for(const y of [.15,.75,1.35,1.95]) {
        box(0,y,0,.75,.07,2.65,0x97744e);
        if(y<1.9)for(let i=0;i<4;i++) {
          const zz=-.95+i*.63;
          if(kind==='display') {
            const specimen=makeCrystalMesh({variety:i%2?'milky opal':'crystal opal',len:.085,id:830000+i+Math.floor(y*100),bright:4,pattern:'pinfire',ax:0,ay:1,az:0});
            specimen.position.set(-.15,y+.07,zz);g.add(specimen);box(-.15,y+.04,zz,.3,.05,.34,0x353d37);
          } else box(0,y+.23,zz,.4,.36,.38,i%2?0x9b7957:0x6c7c79);
        }
      }
    } else if(kind==='stove') {
      w=.85;d=.9;box(0,.48,0,.85,.85,.9,0x494940);box(0,1.65,.2,.15,1.55,.15,0x46443e);box(-.44,.5,0,.02,.4,.5,0x242721);
    } else if(kind==='barrow') {
      w=.8;d=1.8;box(0,.6,0,.8,.5,1.1,0x85735b);
      for(const xx of [-.3,.3])box(xx,.45,.65,.06,.06,1.5,0x746145);
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,.14,12),this.material(0x333734));wheel.rotation.z=Math.PI/2;wheel.position.set(0,.28,-.6);g.add(wheel);
    } else if(kind==='tools') {
      w=.65;d=1;for(const xx of [-.18,.18]) {box(xx,.7,0,.04,1.4,.04,0xa67f4f);box(xx,1.38,0,.38,.08,.1,0x62645a);}
    } else if(kind==='crates') {
      w=1.2;d=1.4;box(0,.4,0,1.2,.8,1.4,0x8b6f4e);box(.15,1.02,.1,.9,.44,1,0x756047);
      for(const xx of [-.45,.45])box(xx,.42,-.71,.09,.75,.025,0xb08b60);
    } else {
      w=1.5;d=1.35;box(0,.8,0,1.5,.09,1.35,0x997448);
      for(const xx of [-.6,.6])for(const zz of [-.5,.5])box(xx,.38,zz,.09,.76,.09,0x66513a);
      const mug=new THREE.Mesh(new THREE.CylinderGeometry(.075,.065,.15,12),this.material(0xaec0b8));mug.position.set(.35,.92,.2);g.add(mug);
      const handle=new THREE.Mesh(new THREE.TorusGeometry(.045,.012,6,12),this.material(0xaec0b8));handle.position.set(.435,.93,.2);g.add(handle);
      box(-.35,.88,-.2,.4,.06,.3,0xc5b388);
    }
    entry.obstacles.push({x,z,w,d});
  }
  buildFaces(entry) {
    entry.faceMeshes=[];
    const hitMaterial=new THREE.MeshBasicMaterial({visible:false});
    for(const face of this.faces) {
      const g=new THREE.Group();g.position.set(face.x,face.y,face.z);g.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(face.nx,0,face.nz));
      const r=mulberry32(face.id),worked=this.taken.has(face.id);
      for(let i=0;i<8;i++) {
        const seam=this.box(g,(i-3.5)*.09,(r()-.5)*.025,0,.11,.012+r()*.019,.025,worked?0x715b45:0xdad4b4);seam.rotation.z=(r()-.5)*.18;
      }
      if(!worked&&face.crystal&&face.crystal.variety!=='potch') {
        const chip=makeCrystalMesh({...face.crystal,len:.04});chip.position.set(.09,0,.025);g.add(chip);
      }
      const hit=new THREE.Mesh(new THREE.BoxGeometry(.9,.38,.1),hitMaterial);hit.userData.face=face;g.add(hit);entry.group.add(g);entry.faceMeshes.push(hit);face.mesh=g;
    }
  }
  nearCollar(pos) {
    if(this.inside)return false;
    const entry=this.entries.find(e=>Math.hypot(pos.x-e.x,pos.z-(e.z-1.5))<2.9&&Math.abs(pos.y-e.floor)<1.2);
    if(entry)this.active=entry;
    return !!entry;
  }
  nearLadder(pos) {const p=this.toLocal(pos);return this.inside&&p.z<4.3&&p.x>-.5&&p.x<1.5;}
  exitSpot() {return new THREE.Vector3(this.active.x,this.active.y,this.active.z-3.4);}
  toLocal(p) {return p.clone().sub(new THREE.Vector3(this.active.x,this.active.floor,this.active.z));}
  toWorld(p) {return p.clone().add(new THREE.Vector3(this.active.x,this.active.floor,this.active.z));}
  enter(player) {
    this.inside=true;this.active.group.visible=true;this.last={x:.5,z:3.5};
    player.pos.copy(this.toWorld(new THREE.Vector3(.5,0,3.5)));player.yaw=Math.PI;player.pitch=-.08;player.vel.set(0,0,0);this.work=0;
  }
  leave(player) {
    this.active.group.visible=false;this.inside=false;player.pos.copy(this.exitSpot());player.pos.y=this.terrain.getHeight(player.pos.x,player.pos.z);player.yaw=0;player.pitch=-.08;player.vel.set(0,0,0);this.work=0;
  }
  restore(player) {
    const p=this.pendingRestore,entry=this.entries.find(e=>e.plan.id===p?.id);
    if(!entry||!walkable(entry.plan,p.x,p.z,.28,entry.obstacles))return;
    this.active=entry;this.enter(player);this.last={x:p.x,z:p.z};player.pos.copy(this.toWorld(new THREE.Vector3(p.x,0,p.z)));
    if(Number.isFinite(p.yaw))player.yaw=p.yaw;if(Number.isFinite(p.pitch))player.pitch=Math.max(-1.45,Math.min(1.45,p.pitch));
  }
  clamp(pos) {
    const p=this.toLocal(pos),next=moveInDugout(this.active.plan,this.last,p,this.active.obstacles);this.last=next;
    return this.toWorld(new THREE.Vector3(next.x,0,next.z));
  }
  under() {return this.inside?1:0;}
  signalAt() {return 0;}
  canWalk(entry,x,z) {return walkable(entry.plan,x,z,.28,entry.obstacles);}
  update() {}
  snapshot(player) {
    const p=player&&this.toLocal(player.pos);
    return {taken:[...this.taken],interior:this.inside&&p?{id:this.active.plan.id,x:p.x,z:p.z,yaw:player.yaw,pitch:player.pitch}:null};
  }
  workFace({origin,dir,tool,held,dt,easy}) {
    let prompt=this.active.plan.kind==='home'?this.active.plan.name:'Look for thin pale seams along the clay band. Use the hammer (6).';
    let result=null,tapped=false;
    if(this.active.plan.kind==='mine') {
      this.active.group.updateMatrixWorld(true);this.raycaster.set(origin,dir);this.raycaster.far=2.4;
      const hits=this.raycaster.intersectObjects([this.active.walls,...this.active.faceMeshes],false);
      const wall=hits.find(h=>h.object===this.active.walls),hit=hits.find(h=>h.object.userData.face&&(!wall||h.distance<=wall.distance+.12)),face=hit?.object.userData.face;
      if(!face||this.workId!==face.id||!held||tool!=='hammer')this.work=0;
      this.workId=face?.id??null;
      if(face) {
        if(this.taken.has(face.id))prompt='Worked seam · search further along the face';
        else {
          prompt=tool==='hammer'?'Pale seam · hold Use to chip out a small sample':'Pale seam · select Hammer (6) to take a sample';
          if(held&&tool==='hammer') {
            const previous=this.work;this.work+=dt/(easy?1.1:2.1);tapped=Math.floor(previous*6)!==Math.floor(this.work*6);
            if(this.work>=1) {
              result=takeOpalFace(face,this.taken);this.work=0;
              face.mesh.children.forEach(m=>{if(m!==hit.object)m.visible=false;});
              const hollow=this.box(face.mesh,0,0,-.018,.72,.12,.022,0x735b40);hollow.castShadow=false;
              if(result?.crystal)result.gem=crystalToGem(result.crystal);
            }
          }
        }
      } else if(tool==='detector')prompt='Opal does not give a metal detector signal. Inspect the walls with your lamp.';
    }
    return {prompt,progress:this.work,result,tapped};
  }
}
