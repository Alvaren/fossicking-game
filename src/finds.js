import { roughFindGeometry } from './findvisuals.js';
import { makeThunderegg, makeGeode } from './geodes.js';
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { PLAY } from './terrain.js';
import { makeGem, makeGemMesh, gemSize } from './minerals.js';

// Things lying on the surface that you can spot and pick up: agates weathered
// out on the slopes below the rhyolite and washed onto gravel bars, and now and
// then a gem glinting on a bar (fossickers call this "specking").

const AGATES = 50;
const SPECKS = 10;

export class SurfaceFinds {
  constructor(scene, terrain, deposits, seed, collected, colliders = []) {
    this.scene = scene;
    this.terrain = terrain;
    this.items = [];
    this.colliders = colliders;
    this.glowTex = glowTexture();
    const rand = mulberry32(seed * 13 + 9);
    this.place(rand, terrain.sources.rhyolite ? AGATES : 0, (x, z) => deposits.surfaceAgateWeight(x, z), () => makeGem('agate', rand), 0);
    this.place(rand, terrain.sources.basalt ? SPECKS : 0, (x, z) => deposits.surfaceGemWeight(x, z),
      () => makeGem(rand() < 0.55 ? 'zircon' : rand() < 0.7 ? 'sapphire' : 'spinel', rand, 1.2), 1000);
    // Scheelite weathered out of the reef, lying about on the slopes below it.
    // Added after the others so the seeded finds above don't change.
    this.place(rand, terrain.profile?.sources ? 0 : 24, (x, z) => deposits.eluvial(x, z, terrain.sources.reef, 22), () => makeGem('scheelite', rand), 2000);
    // Thundereggs weathered out of the rhyolite (from their own seed, so nothing above moves).
    const tr = mulberry32(seed * 29 + 41);
    this.place(tr, terrain.sources.rhyolite ? 16 : 0, (x, z) => deposits.eluvial(x, z, terrain.sources.rhyolite, 30), () => makeThunderegg(tr), 3000);
    // Geodes use an independent stream and IDs below the crystal float range.
    const gr = mulberry32(seed * 47 + 83);
    this.place(gr, terrain.sources.rhyolite ? 12 : 0, (x, z) => deposits.eluvial(x, z, terrain.sources.rhyolite, 34), () => makeGeode(gr), 4000);
    for (const it of this.items) {
      if (collected.has(it.id)) it.collected = true;
      else this.spawn(it, rand);
    }
    this.time = 0;
    this.floodId = 100000; // flood finds aren't saved, so they get ids well clear of the seeded ones
  }

  place(rand, count, weightFn, makeFn, idBase) {
    if (!count) return [];
    const half = PLAY - 3;
    const ws = [];
    for (let k = 0; k < 1500; k++) ws.push(weightFn((rand() * 2 - 1) * half, (rand() * 2 - 1) * half));
    ws.sort((a, b) => a - b);
    const ref = ws[Math.floor(ws.length * 0.98)] || 1;
    const added = [];
    for (let i = 0, tries = 0; i < count && tries < 120000; tries++) {
      const x = (rand() * 2 - 1) * half, z = (rand() * 2 - 1) * half;
      if (rand() > weightFn(x, z) / ref) continue;
      if (this.colliders.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + 0.4)) continue; // not under a boulder
      const it = { id: idBase + i, x, z, gem: makeFn(), rot: rand() * 6.28 };
      this.items.push(it);
      added.push(it);
      i++;
    }
    return added;
  }

  spawn(it, rand) {
    const g = new THREE.Group();
    let m;
    if (it.makeMesh) {
      m = it.makeMesh();
      m.position.set(0, 0, 0);
      m.scale.multiplyScalar(1.6);
    } else {
      m = makeGemMesh(it.gem);
      // Surface finds are a bit bigger than life so you can actually spot them.
      m.scale.multiplyScalar(it.gem.type === 'agate' ? 2 : ['thunderegg', 'geode'].includes(it.gem.type) ? 1.3 : 2.4);
      m.rotation.set(rand() * 3, it.rot, rand() * 3);
    }
    it.lift = it.lift ?? gemSize(it.gem) * 0.5;
    g.add(m);
    m.traverse((c) => { if (c.isMesh && !it.mat) it.mat = c.material; });
    if (it.mat && it.gem.fluor) {
      it.mat = it.mat.clone(); // its own material, so it can glow on its own
      m.traverse((c) => { if (c.isMesh) c.material = it.mat; });
      it.baseEmissive = it.mat.emissive.clone();
    }
    const glint = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      color: it.gem.type === 'agate' ? 0xffe0c0 : 0xffffff,
    }));
    glint.scale.setScalar(0.2);
    g.add(glint);
    g.userData.glint = glint;
    g.position.set(it.x, this.terrain.getHeight(it.x, it.z) + it.lift, it.z);
    this.scene.add(g);
    it.mesh = g;
  }

  // Surface finds are spawned before the asset stream finishes. Replace just
  // their geometry; placement, pickup identity, UV glow and materials survive.
  applyModels() {
    for (const it of this.items) {
      if (it.makeMesh) continue;
      const mesh = it.mesh?.children[0], model = roughFindGeometry(it.gem);
      if (!mesh?.isMesh || !model || mesh.geometry === model) continue;
      mesh.geometry = model;
      mesh.scale.multiplyScalar(1 / (mesh.userData.fallbackScale || 1));
      mesh.userData.fallbackScale = 1;
    }
  }

  // Extra items placed by other systems (quartz float, saved flood finds).
  addItems(list, collected = new Set()) {
    const r = Math.random;
    for (const it of list) {
      this.items.push(it);
      if (collected.has(it.id)) it.collected = true;
      else this.spawn(it, r);
    }
  }

  // Flood finds aren't part of the seeded world, so they're saved separately.
  floodItems() {
    return this.items.filter((i) => i.id >= 100000 && !i.collected).map(({ id, x, z, gem, rot }) => ({ id, x, z, gem, rot }));
  }

  // A flood strips the bars and leaves fresh stones lying on the new gravel.
  addFlood(deposits, rand) {
    const agates = this.place(rand, this.terrain.sources.rhyolite ? 14 : 0, (x, z) => deposits.barWeight(x, z, 'agate'), () => makeGem('agate', rand), this.floodId);
    this.floodId += 100;
    const gems = this.place(rand, this.terrain.sources.basalt ? 5 : 0, (x, z) => deposits.barWeight(x, z, 'gem'),
      () => makeGem(rand() < 0.55 ? 'zircon' : rand() < 0.7 ? 'sapphire' : 'spinel', rand, 1.2), this.floodId);
    this.floodId += 100;
    for (const it of [...agates, ...gems]) this.spawn(it, rand);
    return agates.length + gems.length;
  }

  nearest(pos, maxDist) {
    let best = null, bd = maxDist;
    for (const it of this.items) {
      if (it.collected) continue;
      const d = Math.hypot(it.x - pos.x, it.z - pos.z);
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }

  collect(it) {
    it.collected = true;
    this.scene.remove(it.mesh);
    it.mesh = null;
  }

  collectedIds() { return this.items.filter((i) => i.collected && i.id < 100000).map((i) => i.id); }

  // uv: { on, origin, dir, dark } from the UV torch. Things that fluoresce
  // light up inside its beam; you only really see it in the dark.
  update(dt, camPos, uv) {
    this.time += dt;
    const cosBeam = Math.cos(0.42);
    const tmp = this._v || (this._v = new THREE.Vector3());
    for (const it of this.items) {
      if (!it.mesh) continue;
      // Settle into holes dug underneath.
      it.mesh.position.y = this.terrain.getHeight(it.x, it.z) + it.lift;
      // A brief sun-glint now and then, stronger close up, the way wet stones catch the light.
      const g = it.mesh.userData.glint;
      const d = Math.hypot(camPos.x - it.x, camPos.z - it.z);
      const flash = Math.max(0, Math.sin(this.time * 1.7 + it.id * 2.3)) ** 12;
      let glow = 0;
      if (uv?.on && it.gem.fluor) {
        tmp.set(it.x, it.mesh.position.y, it.z).sub(uv.origin);
        const dist = tmp.length();
        if (dist < 9 && tmp.normalize().dot(uv.dir) > cosBeam) glow = (1 - dist / 9) ** 0.5;
      }
      if (it.gem.fluor) {
        const k = glow * (0.15 + 0.85 * (uv?.dark ?? 0));
        it.mat.emissive.copy(it.baseEmissive).lerp(new THREE.Color(it.gem.fluor), Math.min(1, k * 1.5));
        it.mat.emissiveIntensity = 1 + k * 3;
        it.glowing = k > 0.3;
      }
      if (it.glowing) {
        g.material.color.set(it.gem.fluor);
        g.material.opacity = 0.9;
        g.scale.setScalar(0.35 + Math.sin(this.time * 6 + it.id) * 0.05);
      } else {
        g.material.color.set(it.gem.type === 'agate' ? 0xffe0c0 : 0xffffff);
        g.material.opacity = it.gem.type === 'scheelite' ? 0 : (0.15 + flash * 0.85) * Math.min(1, 14 / (d + 1));
        g.scale.setScalar(0.1 + flash * 0.25);
      }
    }
  }
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,250,230,0.6)');
  g.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(32, 4); ctx.lineTo(32, 60); ctx.moveTo(4, 32); ctx.lineTo(60, 32); ctx.stroke();
  return new THREE.CanvasTexture(c);
}
