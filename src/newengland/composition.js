import * as THREE from 'three';
import { coverAt } from './groundcover.js';

// Render-only groups fitted to the saved ground. Larger stones stay within
// existing solid footprints; new connecting shelves are low surface dressing.
export function composeNewEngland({ terrain, world, mask, workingMask, rng, add, rockAnchors }) {
  const c = terrain.creek, m = new THREE.Matrix4();
  const put = (name, x, z, scale, options = {}) => {
    const y = terrain.getHeight(x, z), r = options.radius ?? scale * .45;
    if (!terrain.inside(x, z) || (options.surface ? workingMask : mask).blocked(x, z, r)) return;
    add(name, { x, z, y, scale, lift: options.lift ?? -.025, radius: r,
      rotation: options.rotation ?? rng() * Math.PI * 2, rank: options.rank ?? rng(), ...options });
  };
  // Each patch has a centre, a quiet edge and several overlapping clumps.
  // Moisture and parent rocks determine location rather than uniform scatter.
  const clump = (x, z, radius, wet, count) => {
    for (let k = 0; k < count; k++) {
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * radius;
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      const h = terrain.getHeight(px, pz), depth = c.surfaceY(pz,px) - h;
      if (depth > .07) continue;
      const edge = 1 - r / radius;
      if (rng() > .2 + edge * .8) continue;
      const family = wet && depth > -.35 ? 'sedge' : 'grass';
      put(`${family}_${k % (family === 'sedge' ? 2 : 3)}`, px, pz, .4 + rng() * .5);
    }
  };
  // Broad, irregular woodland islands share their pattern with the soil.
  // Retain open corridors and the full camp reserve; never carpet work sites.
  for(let i=0;i<14500;i++) {
    const x=-103+rng()*206,z=-103+rng()*206,patch=coverAt(x,z);
    const p=c.local(x,z,{}),margin=p.d-p.w;
    if(margin<1.3||patch<.52||rng()>(patch-.42)*1.6)continue;
    const height=terrain.getHeight(x,z);
    if(Math.abs(terrain.getHeight(x+.5,z)-height)>.6)continue;
    put(`grass_${i%3}`,x,z,.58+rng()*.55,{sy:.7+rng()*.3,rank:rng()*.8});
    if(i%11===0&&patch>.7)put(`shrub_${i%3}`,x+.5,z-.4,.38+rng()*.35,{radius:.5});
  }
  // A graduated woodland edge around the beaten camp ground, not a ring of
  // identical plants. The same clearance covers the largest shelter/facilities.
  for(let i=0;i<850;i++) {
    const a=rng()*Math.PI*2,r=17+rng()*11;
    const x=terrain.camp.x+Math.cos(a)*r,z=terrain.camp.z+Math.sin(a)*r;
    if(coverAt(x,z)<.48||Math.abs(Math.sin(a*2.3+.7))<.22)continue;
    clump(x,z,1.2+rng()*1.6,false,7);
  }
  // Reaches alternate open sampling margins with cobble pockets and sedges.
  for (let reach = -96; reach < 103; reach += 7) {
    const side = Math.sin(reach * .17) > 0 ? 1 : -1;
    const z = reach + rng() * 3, w = c.halfWidth(z), stretch = Math.sqrt(1 + c.dcx(z) ** 2);
    const bank = c.point(z,side*(w+.7));
    clump(bank.x + side * .5, bank.z + 1, 2.6, true, 90);
    clump(bank.x + side * 4.5, bank.z - 2, 3.4, false, 85);
    // Rounded stones form local bed/bar groups; most of the creek remains open.
    for (let k = 0; k < 45; k++) {
      const station = z + (rng() - .5) * 5.0;
      const n=side*(c.halfWidth(station)-.6+(rng()-.5)*2.3);
      const p=c.course?c.point(station,n):{x:c.cx(station)+n*stretch,z:station},px=p.x,pz=p.z;
      const h = terrain.getHeight(px, pz), depth = c.waterY(pz,px) - h;
      if (depth > .8 || depth < -.6) continue;
      const scale = .11 + Math.pow(rng(), 1.4) * .42;
      put(`cobble_${k % 6}`, px, pz, scale, { lift: -.08, sy: .62, rank: .15 + rng() * .5 });
    }
  }
  for(let i=0;i<3400;i++) {
    const station=-102+rng()*204,width=c.halfWidth(station),side=rng()<.5?-1:1;
    const {x,z}=c.point(station,side*(width+rng()*1.8-2.5));
    const h=terrain.getHeight(x,z),depth=c.waterY(z,x)-h;
    if(depth<-.6||depth>.9)continue;
    const scale=.08+Math.pow(rng(),2)*.30;
    put(`cobble_${i%6}`,x,z,scale,{surface:true,lift:-scale*.2,sy:.65,radius:.1});
  }
  // Loose float follows the existing source rocks without adding flat shelves.
  // It disappears if excavated, leaving the real soil/vein available to tools.
  for (let i = 0; i < rockAnchors.length; i++) {
    const a = rockAnchors[i];
    if (a.radius < .6 || a.family === 'cobble') continue;
    const atSource = Object.values(terrain.sources).some(s => Math.hypot(a.x - s.x, a.z - s.z) < 14);
    if (!atSource) continue;
    const family = ['host', 'granite', 'basalt', 'rhyolite'].includes(a.family) ? a.family : 'slab';
    // Small angular float follows the downslope direction towards the creek.
    const direction = Math.sign(c.cx(a.z) - a.x);
    for (let k = 0; k < 14; k++) {
      const distance = .8 + rng() * 5, px = a.x + direction * distance, pz = a.z + (rng() - .5) * distance;
      put(`${family === 'host' ? 'quartzfloat' : family}_${k % (family === 'granite' ? 4 : 3)}`,
        px, pz, .05 + rng() * .16, { surface: true, sy: .55, radius: .15, lift: -.025 });
    }
    if (i % 3 === 0) clump(a.x + 1.4, a.z - 1, 2.1, false, 55);
  }
  // Tree-associated litter/understorey, leaving trunks and paths clear.
  for (const batch of world.lod.batches.filter(b => b.source.userData.tree)) {
    for (let i = 0; i < batch.source.count; i++) {
      batch.source.getMatrixAt(i, m);
      const x = m.elements[12], z = m.elements[14];
      if (!m.elements[0] && !m.elements[2]) continue;
      if (i % 3 === 0) clump(x + 1.3, z - .8, 3.5, false, 95);
      if (i % 3 === 0) {
        put(`branch_${i % 3}`, x + .9, z + .5, .45 + rng() * .4, { radius: .25, lift: -.05 });
      }
    }
  }
}
