import * as THREE from 'three';
import { mulberry32 } from './noise.js';

export const environmentWeather = { time: { value: 0 }, wet: { value: 0 }, rain: { value: 0 } };
export function updateEnvironmentWeather(dt, rain) {
  environmentWeather.time.value += dt;
  environmentWeather.rain.value = rain;
  const wet = environmentWeather.wet;
  wet.value = Math.max(0, Math.min(1, wet.value + dt * (rain > .05 ? rain * .07 : -.006)));
}
export function surfaceUnderfoot({ depth = 0, rock = false, gravel = 0, organic = 0, wet = 0 } = {}) {
  if (depth > .025) return 'water';
  if (rock) return 'rock';
  if (gravel > .52) return 'gravel';
  if (organic > .28) return 'litter';
  return wet > .4 ? 'mud' : 'soil';
}
export function showerAt(time) {
  const phase = time % 420;
  return phase < 180 || phase > 265 ? 0 : Math.min(1, (phase - 180) / 20, (265 - phase) / 25) * .75;
}

// Bounded pools shared by boot steps and raindrop impacts. No interaction markers.
export class SurfaceEffects {
  constructor(scene, { height, waterY, bank, low = false, seed = 1, rainStreaks = false }) {
    Object.assign(this, { height, waterY, bank });
    this.rand = mulberry32(seed + 68201); this.clock = 0; this.rainCarry = 0;
    this.stats = { steps: 0, splashes: 0, rainImpacts: 0, lastSurface: null };
    const count = low ? 72 : 144;
    this.rings = Array.from({ length: count }, () => ({ life: 0 })); this.cursor = 0;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gradient = g.createRadialGradient(32,32,18,32,32,31);
    gradient.addColorStop(0,'rgba(225,240,237,0)'); gradient.addColorStop(.6,'rgba(225,240,237,.65)'); gradient.addColorStop(1,'rgba(225,240,237,0)');
    g.fillStyle = gradient; g.fillRect(0,0,64,64);
    const texture = new THREE.CanvasTexture(c);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: .4, depthWrite: false, side: THREE.DoubleSide });
    material.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace('void main() {','attribute float aFade; varying float vFade; void main() { vFade=aFade;');
      shader.fragmentShader = shader.fragmentShader.replace('void main() {','varying float vFade; void main() {').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= vFade;');
    };
    const geometry = new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
    this.fade = new THREE.InstancedBufferAttribute(new Float32Array(count),1); geometry.setAttribute('aFade',this.fade);
    this.mesh = new THREE.InstancedMesh(geometry,material,count); this.mesh.name = 'Water footfalls and rain impacts'; this.mesh.frustumCulled = false; this.mesh.count = 0; scene.add(this.mesh);
    this.dummy = new THREE.Object3D();
    this.drops = Array.from({length:64},()=>({life:0})); this.dropCursor = 0;
    const dropGeo = new THREE.BufferGeometry(); dropGeo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(64*3),3));
    this.splash = new THREE.Points(dropGeo,new THREE.PointsMaterial({color:0xc2d9d4,size:.035,transparent:true,opacity:.65,depthWrite:false}));
    this.splash.name = 'Boot droplets'; this.splash.frustumCulled = false; scene.add(this.splash);
    if (rainStreaks) {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array((low?180:360)*6),3));
      this.rainMesh = new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xc1d1ce,transparent:true,opacity:0,depthWrite:false}));
      this.rainMesh.name='Passing forest shower'; this.rainMesh.frustumCulled=false; scene.add(this.rainMesh);
    }
  }
  impact(x,z,boot=false) {
    if (this.bank(x,z) > 0 || this.height(x,z) >= this.waterY(z) - .015) return;
    const r = this.rings[this.cursor++ % this.rings.length];
    Object.assign(r,{x,z,life:boot?1.05:.6,total:boot?1.05:.6,size:boot?.65:.18});
    if (boot) {
      this.stats.splashes++;
      for(let i=0;i<6;i++) Object.assign(this.drops[this.dropCursor++%64],{x,y:this.waterY(z)+.03,z,vx:(this.rand()-.5)*.5,vz:(this.rand()-.5)*.5,vy:.65+this.rand()*.4,life:.35});
    } else this.stats.rainImpacts++;
  }
  step(x,z,surface) {
    this.stats.steps++; this.stats.lastSurface=surface;
    if(surface==='water') this.impact(x,z,true);
  }
  update(dt,player,rain=0,active=true) {
    this.clock+=dt; this.mesh.visible=this.splash.visible=active;
    this.rainCarry = active ? this.rainCarry+dt*rain*(this.rings.length*.8) : 0;
    while(this.rainCarry>=1) {
      this.rainCarry--;
      this.impact(player.x+(this.rand()-.5)*26,player.z+(this.rand()-.5)*26);
    }
    let n=0;
    for(const r of this.rings) {
      r.life=Math.max(0,r.life-dt);if(!r.life)continue;
      const age=1-r.life/r.total,s=.03+age*r.size;
      this.dummy.position.set(r.x,this.waterY(r.z)+.018,r.z);this.dummy.scale.set(s,1,s);this.dummy.updateMatrix();
      this.mesh.setMatrixAt(n,this.dummy.matrix);this.fade.setX(n++,Math.sin(Math.PI*age)*(r.size>.2?1:.5));
    }
    this.mesh.count=n;this.mesh.instanceMatrix.needsUpdate=true;this.fade.needsUpdate=true;
    const pos=this.splash.geometry.attributes.position;let d=0;
    for(const drop of this.drops) {
      drop.life-=dt;if(drop.life<=0)continue;
      drop.vy-=dt*4;drop.x+=drop.vx*dt;drop.y+=drop.vy*dt;drop.z+=drop.vz*dt;
      pos.setXYZ(d++,drop.x,drop.y,drop.z);
    }
    this.splash.geometry.setDrawRange(0,d);pos.needsUpdate=true;
    if(this.rainMesh) {
      this.rainMesh.visible=active&&rain>.01;this.rainMesh.material.opacity=rain*.3;
      if(this.rainMesh.visible) {
        const p=this.rainMesh.geometry.attributes.position;
        for(let i=0;i<p.count;i+=2) {
          const x=player.x+Math.sin(i*91.7)*15,z=player.z+Math.cos(i*27.3)*15;
          const y=this.height(player.x,player.z)+((i*.71-this.clock*13)%16+16)%16;
          p.setXYZ(i,x,y,z);p.setXYZ(i+1,x+.08,y-.5,z+.03);
        }
        p.needsUpdate=true;
      }
    }
  }
}
