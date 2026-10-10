import { goldMaterial, nuggetGeometry } from './materials.js';
import * as THREE from 'three';
import { mulberry32, smoothstep } from './noise.js';
import { PLAY } from './terrain.js';
import { lumpy } from './world.js';
import { difficulty, goldRange } from './difficulty.js';

// Buried things the detector can hear: gold nuggets and a lot of junk.
// "kind" drives the detector tone: iron grunts low, everything else sings high.

const JUNK = [
  { name: 'a rusty nail', kind: 'iron', strength: 0.8, weight: 5 },
  { name: 'a bottle cap', kind: 'iron', strength: 0.7, weight: 4 },
  { name: 'an old horseshoe', kind: 'iron', strength: 1.4, weight: 2 },
  { name: 'a flattened tin can', kind: 'iron', strength: 1.5, weight: 3 },
  { name: 'a .303 shell casing', kind: 'brass', strength: 0.85, weight: 3 },
  { name: 'a 1932 penny', kind: 'coin', strength: 0.9, weight: 1, value: 25 },
];

const NUGGETS = 55;
const JUNK_COUNT = 70;

export class Targets {
  constructor(scene, terrain, deposits, seed, collected) {
    this.scene = scene;
    this.terrain = terrain;
    this.list = [];
    this.revealed = [];
    const rand = mulberry32(seed * 17 + 3);
    const half = PLAY - 4;
    const rnd = () => [(rand() * 2 - 1) * half, (rand() * 2 - 1) * half];
    const nearCamp = (x, z) => Math.hypot(x - terrain.camp.x, z - terrain.camp.z) < 9;

    // Nuggets follow the same rules as fine gold: on bedrock in the creek's
    // traps, and in the eluvial spread below the reef.
    const ws = [];
    for (let k = 0; k < 2500; k++) { const [x, z] = rnd(); ws.push(deposits.nuggetWeight(x, z)); }
    ws.sort((a, b) => a - b);
    const ref = ws[Math.floor(ws.length * 0.97)] || 1;
    for (let i = 0, tries = 0; i < (terrain.sources.reef ? NUGGETS : 0) && tries < 200000; tries++) {
      const [x, z] = rnd();
      if (nearCamp(x, z)) continue;
      if (rand() > deposits.nuggetWeight(x, z) / ref) continue;
      const g = terrain.geologyAt(x, z);
      // Most nuggets are small; the harder the level, the more true that is.
      const grams = Math.round((0.3 + Math.pow(rand(), difficulty.nuggetSkew) * 48) * 100) / 100;
      this.list.push({
        id: i, kind: 'gold', name: 'gold', grams, x, z,
        // Creek gold sits down on bedrock; eluvial gold on the slopes below the
        // reef is still in the soil, within reach of a detector.
        y: (() => { const u = rand(); return deposits.zones(x, z).hill > 0.4 ? g.orig - (0.03 + u * 0.35) : Math.max(g.bedrock + u * 0.15, g.orig - 1.4); })(),
        range: 0.65 + 0.33 * Math.cbrt(grams),
      });
      i++;
    }
    const totalW = JUNK.reduce((s, j) => s + j.weight, 0);
    for (let i = 0; i < JUNK_COUNT; i++) {
      // Junk ends up where people camped and walked: everywhere, more near the creek.
      let x, z;
      do { [x, z] = rnd(); } while (nearCamp(x, z) || rand() > 0.3 + 0.7 * smoothstep(30, 3, terrain.creek.local(x, z).d));
      let pick = rand() * totalW, j = JUNK[0];
      for (const c of JUNK) { pick -= c.weight; if (pick <= 0) { j = c; break; } }
      const depth = 0.08 + rand() * 0.45;
      this.list.push({
        id: NUGGETS + i, kind: j.kind, name: j.name, value: j.value || 0, x, z, strength: j.strength,
        y: terrain.getOrigHeight(x, z) - depth,
        range: 0.55 + 0.6 * j.strength,
      });
    }
    // Gold-in-quartz: pieces of reef quartz with gold through them, lying in the
    // shallow rubble around the outcrop. The gold is spread through the stone,
    // so they answer the detector more softly than a solid nugget of the same weight.
    const reef = terrain.sources.reef;
    for (let i = 0; reef && i < 9; i++) {
      const a = rand() * Math.PI * 2, d = 2 + Math.sqrt(rand()) * 13;
      const x = reef.x + Math.cos(a) * d, z = reef.z + Math.sin(a) * d;
      const goldG = Math.round((2 + Math.pow(rand(), 2.2) * 40) * 100) / 100;
      this.list.push({
        id: NUGGETS + JUNK_COUNT + i, kind: 'gold', quartz: true, name: 'gold in quartz',
        grams: goldG, stone: Math.round(goldG * (3 + rand() * 6)), x, z,
        y: terrain.getOrigHeight(x, z) - (0.08 + rand() * 0.35),
        range: (0.65 + 0.33 * Math.cbrt(goldG)) * 0.75,
      });
    }
    // Hot rocks: lumps of magnetic ironstone in mineralised ground. They sing
    // like a target until you dig one. (Not on Easy.) Their own random stream,
    // so everything else on the claim stays put whatever the level.
    const hr = mulberry32(seed * 31 + 7);
    for (let i = 0, tries = 0; i < difficulty.hotRocks && tries < 5000; tries++) {
      let x, z;
      const src = hr() < 0.55 ? terrain.sources.basalt : terrain.sources.reef;
      if (hr() < 0.6 && src) { const a = hr() * Math.PI * 2, d = 4 + hr() * 32; x = src.x + Math.cos(a) * d; z = src.z + Math.sin(a) * d; }
      else [x, z] = [(hr() * 2 - 1) * half, (hr() * 2 - 1) * half];
      if (Math.abs(x) > half || Math.abs(z) > half || nearCamp(x, z)) continue;
      this.list.push({
        id: 50000 + i, kind: 'hot', name: 'a hot rock (magnetic ironstone)', strength: 0.6 + hr() * 1.1, x, z,
        y: terrain.getOrigHeight(x, z) - (0.02 + hr() * 0.25),
      });
      i++;
    }
    for (const t of this.list) t.collected = collected.has(t.id);

    this.goldMat = goldMaterial('waterworn');
    this.reefGoldMat = goldMaterial('crystalline');
    this.rustMat = new THREE.MeshStandardMaterial({ color: 0x6b3a1f, roughness: 0.9, metalness: 0.2 });
    this.ironstoneMat = new THREE.MeshStandardMaterial({ color: 0x4a2418, roughness: 0.75, metalness: 0.35, flatShading: true });
    this.brassMat = new THREE.MeshStandardMaterial({ color: 0xc8a050, metalness: 0.9, roughness: 0.35 });
    this.copperMat = new THREE.MeshStandardMaterial({ color: 0x9a5a32, metalness: 0.85, roughness: 0.4 });
    this.glowTex = glowTexture();
    this.time = 0;
  }

  // A flood rolls the bed over and leaves a few new things within reach of a
  // detector: small nuggets on bedrock in the channel, and fresh junk.
  addFlood(deposits, rand) {
    const C = this.terrain.creek;
    const L = {};
    let id = Math.max(100000, ...this.list.map((t) => t.id + 1));
    let added = 0;
    for (let tries = 0; tries < 4000 && added < 4; tries++) {
      const x = (rand() * 2 - 1) * (PLAY - 4), z = (rand() * 2 - 1) * (PLAY - 4);
      C.local(x, z, L);
      if (L.d > L.w + 1.5) continue;
      if (rand() > deposits.nuggetWeight(x, z) * 8) continue;
      const g = this.terrain.geologyAt(x, z);
      const grams = Math.round((0.3 + Math.pow(rand(), 4) * 12) * 100) / 100;
      this.list.push({ id: id++, kind: 'gold', name: 'gold', grams, x, z, y: g.bedrock + rand() * 0.1, range: 0.65 + 0.33 * Math.cbrt(grams) });
      added++;
    }
    for (let k = 0; k < 4; k++) {
      let x, z;
      do { x = (rand() * 2 - 1) * (PLAY - 4); z = (rand() * 2 - 1) * (PLAY - 4); C.local(x, z, L); } while (L.d > L.w + 3);
      const j = JUNK[Math.floor(rand() * 4)];
      this.list.push({ id: id++, kind: j.kind, name: j.name, value: 0, x, z, strength: j.strength, y: this.terrain.getHeight(x, z) - 0.1 - rand() * 0.2, range: 0.55 + 0.6 * j.strength });
    }
    return added;
  }

  revealedIds() { return this.revealed.map((t) => t.id); }

  restoreRevealed(ids) {
    const set = new Set(ids || []);
    for (const t of this.list) if (set.has(t.id) && !t.collected && !t.mesh) this.reveal(t);
  }

  // Flood targets aren't part of the seeded world, so they're saved and restored.
  floodSaved() {
    return this.list.filter((t) => t.id >= 100000 && !t.collected)
      .map(({ id, kind, name, grams, value, x, y, z, range, strength }) => ({ id, kind, name, grams, value, x, y, z, range, strength }));
  }

  restoreFlood(list) {
    for (const t of list) this.list.push({ ...t, collected: false });
  }

  // Strongest response at the coil position. Returns { signal 0..1, kind }.
  // How far away (m) the coil can hear this target, on the current level.
  rangeOf(t) {
    if (t.kind === 'gold') return goldRange(t.grams) * (t.quartz ? 0.75 : 1); // gold spread through quartz answers softly
    const d = difficulty.detector;
    return d.base + d.perCbrt * 1.6 * (t.strength ?? 1);
  }

  // coilLevel: which coil you own. Pinpointing narrows the field to right under the coil's centre.
  detect(coil, coilLevel = 0, pinpoint = false) {
    const D = difficulty.detector;
    const foot = D.footprint * (pinpoint ? 0.6 : 1);
    const fall = D.falloff + (pinpoint ? 0.8 : 0);
    const mult = difficulty.coilMult[coilLevel] ?? 1;
    let best = 0, kind = null;
    for (const t of this.list) {
      if (t.collected || t.mesh) continue;
      const dx = t.x - coil.x, dz = t.z - coil.z;
      if (Math.abs(dx) > 3 || Math.abs(dz) > 3) continue;
      const dy = t.y - coil.y;
      // The coil's field is a cone under it, widening with depth.
      if (Math.hypot(dx, dz) > foot + Math.abs(dy) * 0.5 + 0.15) continue;
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const s = 1 - r / (this.rangeOf(t) * mult);
      if (s > best) { best = s; kind = t.kind; }
    }
    return { signal: best > 0 ? Math.pow(best, fall) : 0, kind };
  }

  // After a dig, anything the hole has reached pops into view.
  checkDig(x, z, radius) {
    const found = [];
    for (const t of this.list) {
      if (t.collected || t.mesh) continue;
      if (Math.hypot(t.x - x, t.z - z) > radius) continue;
      const surface = this.terrain.getHeight(t.x, t.z);
      if (surface <= t.y + 0.12) {
        this.reveal(t);
        found.push(t);
      }
    }
    return found;
  }

  reveal(t) {
    const group = new THREE.Group();
    let mesh;
    const r = mulberry32(t.id + 1);
    if (t.kind === 'gold' && t.quartz) {
      // A lump of white reef quartz with gold showing through.
      const s = 0.03 + 0.012 * Math.cbrt(t.stone);
      mesh = new THREE.Group();
      const q = new THREE.Mesh(lumpy(new THREE.DodecahedronGeometry(1, 1), 0.3, r), new THREE.MeshStandardMaterial({ color: 0xf0ece2, roughness: 0.45 }));
      q.scale.set(s * 1.3, s * 0.8, s);
      mesh.add(q);
      for (let k = 0; k < 6; k++) {
        const g = new THREE.Mesh(nuggetGeometry(t.id * 7 + k, { detail: 1, style: 'crystalline' }), this.reefGoldMat);
        g.scale.setScalar(s * (0.18 + r() * 0.22));
        g.position.set((r() - 0.5) * s * 1.8, (r() - 0.2) * s * 0.9, (r() - 0.5) * s * 1.4);
        mesh.add(g);
      }
    } else if (t.kind === 'gold') {
      const s = 0.035 + 0.022 * Math.cbrt(t.grams);
      mesh = new THREE.Mesh(nuggetGeometry(t.id + 1, { detail: 3 }), this.goldMat);
      mesh.scale.set(s * 1.3, s * 0.7, s);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.glowTex, color: 0xffd36a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      glow.scale.setScalar(0.5);
      group.add(glow);
      group.userData.glow = glow;
    } else if (t.kind === 'hot') {
      mesh = new THREE.Mesh(lumpy(new THREE.DodecahedronGeometry(1, 1), 0.35, r), this.ironstoneMat);
      mesh.scale.set(0.05, 0.035, 0.045).multiplyScalar(0.8 + t.strength * 0.4);
    } else if (t.name.includes('horseshoe')) {
      mesh = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 14, Math.PI * 1.4), this.rustMat);
      mesh.rotation.x = Math.PI / 2;
    } else if (t.name.includes('tin')) {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), this.rustMat);
      mesh.scale.set(1, 1, 0.4);
    } else if (t.kind === 'brass') {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.07, 8), this.brassMat);
      mesh.rotation.z = Math.PI / 2;
    } else if (t.kind === 'coin') {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.003, 16), this.copperMat);
    } else if (t.name.includes('cap')) {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.006, 12), this.rustMat);
    } else {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 5), this.rustMat);
      mesh.rotation.z = Math.PI / 2;
    }
    mesh.castShadow = true;
    group.add(mesh);
    group.rotation.y = r() * Math.PI * 2;
    group.position.set(t.x, this.terrain.getHeight(t.x, t.z) + 0.03, t.z);
    this.scene.add(group);
    t.mesh = group;
    this.revealed.push(t);
  }

  // Closest revealed item the player could reach.
  nearest(pos, maxDist) {
    let best = null, bd = maxDist;
    for (const t of this.revealed) {
      const d = Math.hypot(t.x - pos.x, t.z - pos.z);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  collect(t) {
    this.scene.remove(t.mesh);
    t.mesh = null;
    t.collected = true;
    this.revealed = this.revealed.filter((r) => r !== t);
  }

  remainingGold() {
    return this.list.filter((t) => t.kind === 'gold' && !t.collected).length;
  }

  update(dt) {
    this.time += dt;
    for (const t of this.revealed) {
      // Keep sitting on the ground if the hole is dug deeper underneath.
      t.mesh.position.y = this.terrain.getHeight(t.x, t.z) + 0.03;
      const g = t.mesh.userData.glow;
      if (g) {
        const p = 0.5 + 0.5 * Math.sin(this.time * 4 + t.id);
        g.material.opacity = 0.35 + p * 0.5;
        g.scale.setScalar(0.35 + p * 0.25);
      }
    }
  }
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,240,180,1)');
  g.addColorStop(0.25, 'rgba(255,210,90,0.6)');
  g.addColorStop(1, 'rgba(255,200,60,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
