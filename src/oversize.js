import * as THREE from 'three';
import { makeGem } from './minerals.js';
import { mulberry32 } from './noise.js';

// Oversize: what the classifier screen keeps back when you shovel wash
// through it (on the bucket, or over the head of the sluice). Real fossickers
// tip it into a pile and pick through it before tossing it: it's where the
// agates and the big stones are, the ones too big to go through a sluice or
// sit in a pan. Fine gold and small gems go through the screen; this is the rest.

const MAX_PEBBLES = 70;
const MERGE = 1.6;     // a new load goes on a pile this close
const STONE_COLOURS = [0x8a8278, 0x6f6a64, 0x9b8a74, 0x5d5650, 0xa59a8a, 0x7a6658, 0xc49a86];

export class Oversize {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.piles = [];
    this.geo = new THREE.DodecahedronGeometry(1, 0);
    this.mat = new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true });
  }

  // One load's worth of oversize, tipped out at (x, z).
  // rates: expected agates and big gems in it.
  add(x, z, rates) {
    let p = this.piles.find((q) => Math.hypot(q.x - x, q.z - z) < MERGE);
    if (!p) {
      p = { x, z, loads: 0, agate: 0, big: 0, seed: Math.floor(Math.random() * 1e9) };
      p.mesh = new THREE.InstancedMesh(this.geo, this.mat, MAX_PEBBLES);
      p.mesh.count = 0;
      p.mesh.castShadow = true;
      p.mesh.receiveShadow = true;
      this.scene.add(p.mesh);
      this.piles.push(p);
    }
    p.loads++;
    p.agate += rates.agate || 0;
    p.big += rates.big || 0;
    this.draw(p);
    return p;
  }

  // The pile grows with each load: a little heap of washed stones.
  draw(p) {
    const r = mulberry32(p.seed);
    const n = Math.min(MAX_PEBBLES, 10 + p.loads * 8);
    const spread = 0.12 + Math.min(0.32, p.loads * 0.035);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), c = new THREE.Color();
    const base = this.terrain.getHeight(p.x, p.z);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * spread;
      const size = 0.016 + Math.pow(r(), 1.6) * 0.045; // 6 mm gravel up to small cobbles
      const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      const heap = (1 - d / (spread + 0.01)) * Math.min(0.2, 0.04 + p.loads * 0.018);
      v.set(x, Math.max(base, this.terrain.getHeight(x, z)) + heap + size * 0.5, z);
      q.setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3));
      s.set(size * (1 + r() * 0.5), size * (0.6 + r() * 0.3), size);
      p.mesh.setMatrixAt(i, m.compose(v, q, s));
      p.mesh.setColorAt(i, c.set(STONE_COLOURS[Math.floor(r() * STONE_COLOURS.length)]));
    }
    p.mesh.count = n;
    p.mesh.instanceMatrix.needsUpdate = true;
    if (p.mesh.instanceColor) p.mesh.instanceColor.needsUpdate = true;
  }

  snapshot() { return this.piles.map(({ x, z, loads, agate, big, seed }) => ({ x, z, loads, agate, big, seed })); }

  restore(list) {
    for (const q of list || []) {
      const p = this.add(q.x, q.z, { agate: q.agate, big: q.big });
      p.loads = q.loads;
      p.seed = q.seed;
      this.draw(p);
    }
  }

  near(pos, r = 1.7) {
    let best = null, bd = r;
    for (const p of this.piles) {
      const d = Math.hypot(p.x - pos.x, p.z - pos.z);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  // Pick through it: whatever's worth keeping, and the rest gets tossed.
  pickThrough(p, rand = Math.random) {
    const finds = [];
    const poisson = (l) => { let n = 0; for (let L = Math.exp(-l), q = rand(); q > L; q *= rand()) n++; return n; };
    for (let k = poisson(p.agate); k > 0; k--) if (rand() < 0.92) finds.push(makeGem('agate', rand));
    // Big stones: sapphires and zircons too big to go through a 1/4" screen.
    for (let k = poisson(p.big); k > 0; k--) finds.push(makeGem(rand() < 0.6 ? 'sapphire' : 'zircon', rand, 3));
    this.scene.remove(p.mesh);
    p.mesh.dispose();
    this.piles.splice(this.piles.indexOf(p), 1);
    return finds;
  }
}
