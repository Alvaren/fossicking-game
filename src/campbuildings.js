import * as THREE from 'three';
import { Cabinet } from './cabinet.js';
import { powered } from './campfacilities.js';
import { signTexture } from './world.js';
export class CampBuildings {
  constructor(scene,terrain,camp,colliders,makeMesh) {
    this.terrain=terrain;this.scene=scene;this.colliders=colliders;this.parts={};this.records=[];
    this.flip=terrain.creek.cx(terrain.camp.z)>terrain.camp.x?-1:1;
    const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
    this.m={wood:material(0x72583c),metal:material(0x8eaaa6,{metalness:.4}),green:material(0x385d44),roof:material(0x826247),glass:material(0x9ac2c8,{transparent:true,opacity:.35}),dark:material(0x282e2c)};
    this.spots={};
    for(const [id,x,z]of [['water',8,-2],['generator',8,-4.3],['lights',0,0],['lapidary',9,7],['display',0,10]]) {
      const spot={x:terrain.camp.x+x*this.flip,z:terrain.camp.z+z*this.flip};this.spots[id]=spot;
      const g=new THREE.Group();g.name='camp-'+id;g.position.set(spot.x,terrain.getHeight(spot.x,spot.z),spot.z);g.rotation.y=this.flip<0?Math.PI:0;scene.add(g);this.parts[id]=g;
    }
    const tank=this.parts.water;
    this.box(tank,1.7,.15,1.7,0,.075,0,'wood');this.cylinder(tank,.74,.74,1.5,0,.91,0,'metal');
    for(let i=0;i<12;i++)this.cylinder(tank,.755,.755,.025,0,.22+i*.12,0,'green');
    this.cylinder(tank,.77,.77,.05,0,1.69,0,'green');this.box(tank,.3,.045,.045,-.83,.36,0,'metal');
    const gen=this.parts.generator;this.box(gen,.95,.6,.6,0,.42,0,'green');this.box(gen,.37,.41,.63,.23,.43,0,'dark');
    for(const x of [-.52,.52])for(const z of [-.34,.34])this.box(gen,.045,.85,.045,x,.45,z,'metal');this.box(gen,1.1,.05,.74,0,.88,0,'metal');
    // Level foundations sit above the highest terrain under each room.
    // Keep terrain/geology unchanged and support walking on the deck and ramp.
    this.floors = {};
    for (const id of ['lapidary', 'display']) {
      const g = this.parts[id], p = this.spots[id], heights = [];
      for (let x = -2.1; x <= 2.1; x += .3) for (let z = -1.7; z <= 1.7; z += .3) heights.push(terrain.getHeight(p.x + x * this.flip, p.z + z * this.flip));
      const base = Math.max(...heights) + .04, bottom = Math.min(...heights) - .12;
      g.position.y = base;
      this.box(g,4.1,base-bottom,3.3,0,-(base-bottom)/2,0,'wood');
      const low = terrain.getHeight(p.x,p.z-3*this.flip)-base+.04;
      const ramp = this.box(g,1.15,.08,Math.hypot(1.4,.07-low),0,(low+.07)/2-.04,-2.3,'wood');
      ramp.rotation.x = -Math.atan2(.07-low,1.4);
      this.floors[id] = {base,low};
    }
    this.buildRoom(this.parts.lapidary,'LAPIDARY',false);this.buildRoom(this.parts.display,'COLLECTION',true);
    const workshop=this.parts.lapidary;
    this.box(workshop,2.4,.1,.8,0,.88,.82,'wood');for(const x of [-1,1])this.box(workshop,.09,.85,.6,x,.44,.82,'wood');
    for(const x of [-.68,.68]){this.box(workshop,.65,.35,.6,x,1.1,.82,'green');const wheel=this.cylinder(workshop,.24,.24,.12,x,1.35,.82,'metal');wheel.rotation.x=Math.PI/2;}
    this.box(workshop,.65,.12,.6,0,.96,-.68,'metal');
    this.cases=[];
    const displaySpot=this.spots.display;
    for(const x of [-1.25,0,1.25]) {
      const spot={x:displaySpot.x+x*this.flip,z:displaySpot.z+1.1*this.flip,y:this.parts.display.position.y};
      const cabinet=new Cabinet(scene,spot,{x:displaySpot.x,z:displaySpot.z-3*this.flip},makeMesh);
      this.cases.push(cabinet);
    }
    this.lights=[];
    for(const [x,z]of [[-1,-2],[4,2]]) {
      const g=this.parts.lights;this.box(g,.065,3.1,.065,x,1.55,z,'metal');this.box(g,.65,.16,.2,x,3.1,z,'dark');
      const light=new THREE.PointLight(0xffe2ac,0,13,2);light.position.set(x,2.9,z);g.add(light);this.lights.push(light);
    }
    this.sync(camp);
  }
  box(g,w,h,d,x,y,z,mat='wood'){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.m[mat]);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
  cylinder(g,r1,r2,h,x,y,z,mat){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,20),this.m[mat]);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;}
  buildRoom(g,title,windows){
    this.box(g,4.1,.1,3.3,0,.02,0,'wood');this.box(g,4,2.4,.08,0,1.22,1.6,'metal');
    for(const x of [-2,2])this.box(g,.08,2.4,3.2,x,1.22,0,windows?'glass':'metal');
    for(const x of [-1.35,1.35])this.box(g,1.3,2.4,.08,x,1.22,-1.6,'metal');this.box(g,1.4,.38,.08,0,2.24,-1.6,'metal');
    this.box(g,4.4,.12,3.65,0,2.51,0,'roof');
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.65,.34),new THREE.MeshBasicMaterial({map:signTexture(title,'#253c2b','#dbcba0',48)}));sign.position.set(0,2.25,-1.66);sign.rotation.y=Math.PI;g.add(sign);
  }
  sync(camp){
    for(const [id,g]of Object.entries(this.parts))g.visible=!!camp.built[id];
    for(const c of this.cases)c.group.visible=!!camp.built.display;
    for(const id of ['water','generator','lapidary','display']) {
      if(!camp.built[id]||this.records.some(r=>r.id===id))continue;
      const p=this.spots[id],add=(x,z,r)=>{const c={x:p.x+x*this.flip,z:p.z+z*this.flip,r};this.colliders.push(c);this.records.push({id,c});};
      if(id==='water'||id==='generator')add(0,0,id==='water'?.8:.65);
      else {for(let x=-2;x<=2.01;x+=.4)add(x,1.6,.23);for(let z=-1.6;z<=1.61;z+=.4)for(const x of [-2,2])add(x,z,.23);for(const x of [-1.6,-1.2,1.2,1.6])add(x,-1.6,.23);}
    }
  }
  groundHeight(x,z,camp) {
    let height = this.terrain.getHeight(x,z);
    for (const [id,floor] of Object.entries(this.floors)) {
      if (!camp.built[id]) continue;
      const p = this.spots[id], lx = (x-p.x)*this.flip, lz = (z-p.z)*this.flip;
      if (Math.abs(lx)<2.05 && Math.abs(lz)<1.65) height=Math.max(height,floor.base+.07);
      else if (Math.abs(lx)<.575 && lz>=-3 && lz<=-1.6) height=Math.max(height,floor.base+floor.low+(lz+3)/1.4*(.07-floor.low));
    }
    return height;
  }
  near(pos,camp){for(const id of ['lapidary','display','water','generator'])if(camp.built[id]&&Math.hypot(pos.x-this.spots[id].x,pos.z-this.spots[id].z)<3)return id;return null;}
  update(dt,state,player,night){
    const c=state.camp,on=powered(c);for(const l of this.lights)l.intensity=c.built.lights&&c.lightsOn&&on?Math.max(.15,night)*9:0;
    if(c.built.display){const kept=[...state.nuggets,...state.gems].filter(i=>i.keep);this.cases.forEach((cab,i)=>cab.update(dt,player,kept.slice(i*15,(i+1)*15)));}
    if(c.built.generator)this.parts.generator.rotation.z=on?Math.sin(performance.now()*.055)*.006:0;
  }
}
