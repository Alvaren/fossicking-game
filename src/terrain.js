import * as THREE from 'three';
import { makeNoise, fbm, smoothstep, mulberry32 } from './noise.js';
import { Creek } from './creek.js';

// Diggable heightfield terrain built around the creek, with a simple geology:
// topsoil over gravel "wash" over bedrock. Heights live in a flat grid so the
// player, the shovel and the deposits all read the same surface the GPU draws.

export const SIZE = 300;
export const SEG = 560;
export const CELL = SIZE / SEG;
export const PLAY = 112; // claim boundary (half-extent)
const N = SEG + 1;
const HALF = SIZE / 2;
const MAX_DIG = 2.6;

const srgb = (v) => Math.pow(v, 2.2);

export class Terrain {
  constructor(seed) {
    this.noise = makeNoise(seed);
    this.n2 = this.noise.noise2;
    const rand = this.noise.rand;
    this.creek = new Creek(this.noise);
    this.benchSide = rand() < 0.5 ? 1 : -1;
    this.tmpL = {};
    this.worldHalf = HALF;

    // Source rocks on the valley sides. Their minerals weather out downslope
    // and get carried into the creek where their gullies come in.
    const side = rand() < 0.5 ? 1 : -1;
    this.sources = {
      reef: this.placeSource(30 + rand() * 40, side, 34 + rand() * 14),
      basalt: this.placeSource(55 + rand() * 40, -side, 36 + rand() * 14),
      rhyolite: this.placeSource(-30 + rand() * 60, rand() < 0.5 ? side : -side, 32 + rand() * 16),
    };
    // Granite country: bare pavements, tors, quartz veins, crystal pockets and vugs.
    this.sources.granite = this.placeSource(-88 + rand() * 22, rand() < 0.5 ? 1 : -1, 30 + rand() * 8);
    // Old opal workings: weathered claystone country with the old-timers'
    // mullock heaps and shafts. Somewhere clear of the other source rocks.
    // Camp sits on the flats opposite the bench at z = 0 (worked out properly below).
    const campX = this.creek.cx(0) - this.benchSide * 13.5 * Math.sqrt(1 + this.creek.dcx(0) ** 2);
    for (let k = 0; k < 40; k++) {
      const cand = this.placeSource(-95 + rand() * 190, rand() < 0.5 ? 1 : -1, 34 + rand() * 12);
      const clear = Object.values(this.sources).every((s) => Math.hypot(s.x - cand.x, s.z - cand.z) > 40)
        && Math.hypot(cand.x - campX, cand.z) > 45;
      if ((clear && Math.abs(cand.z) < 95 && Math.abs(cand.x) < 95) || k === 39) { this.sources.opal = cand; break; }
    }
    this.heaps = [];
    this.shafts = [];
    const O = this.sources.opal;
    for (let k = 0; k < 400 && this.heaps.length < 14; k++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * 18;
      const h = { x: O.x + Math.cos(a) * d, z: O.z + Math.sin(a) * d, r: 2.2 + rand() * 1.6, h: 0.9 + rand() * 0.9 };
      if (this.heaps.every((o) => Math.hypot(o.x - h.x, o.z - h.z) > o.r + h.r + 0.6)) this.heaps.push(h);
    }
    // Each heap came out of a shaft beside it.
    for (const h of this.heaps.slice(0, 6)) {
      const a = rand() * Math.PI * 2;
      this.shafts.push({ x: h.x + Math.cos(a) * (h.r + 1.8), z: h.z + Math.sin(a) * (h.r + 1.8) });
    }
    // A ledge of fossil-bearing shale on a slope, clear of everything else.
    // Its own random stream, so older claims keep their heaps and shafts where they were.
    const frand = mulberry32(seed * 59 + 31);
    for (let k = 0; k < 60; k++) {
      const cand = this.placeSource(-95 + frand() * 190, frand() < 0.5 ? 1 : -1, 26 + frand() * 14);
      const clear = Object.values(this.sources).every((s) => Math.hypot(s.x - cand.x, s.z - cand.z) > 32)
        && Math.hypot(cand.x - campX, cand.z) > 35
        && this.heaps.every((h) => Math.hypot(h.x - cand.x, h.z - cand.z) > 25)
        && this.shafts.every((h) => Math.hypot(h.x - cand.x, h.z - cand.z) > 25);
      if ((clear && Math.abs(cand.z) < 95 && Math.abs(cand.x) < 95) || k === 59) { this.sources.fossil = cand; break; }
    }
    this.overlays = [];   // hand-excavation patches that replace the ground where they sit
    this.locked = null;   // terrain vertices tucked under a patch

    // Camp on the flats opposite the old terrace, middle of the claim.
    const cz = 0;
    const cd = this.creek.dcx(cz);
    const cx = this.creek.cx(cz) - this.benchSide * 13.5 * Math.sqrt(1 + cd * cd);
    this.camp = { x: cx, z: cz, y: 0 };
    this.camp.y = this.rawHeight(cx, cz);

    this.heights = new Float32Array(N * N);
    this.bedrock = new Float32Array(N * N);
    this.topsoil = new Float32Array(N * N);
    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) {
        const x = -HALF + ix * CELL, z = -HALF + iz * CELL;
        const i = iz * N + ix;
        const h = this.baseHeight(x, z);
        this.heights[i] = h;
        const g = this.geology(x, z, h);
        this.bedrock[i] = g.bedrock;
        this.topsoil[i] = g.topsoil;
      }
    }
    this.orig = this.heights.slice();
    for (const b of this.creek.boulders) b.y = this.getHeight(b.x, b.z);
    this.mesh = this.buildMesh();
  }

  placeSource(z, side, dist) {
    const d = this.creek.dcx(z);
    const s = Math.sqrt(1 + d * d);
    // Eluvial spread is centred a little downslope of the outcrop, toward the creek.
    return {
      x: this.creek.cx(z) + side * dist * s,
      z,
      ex: this.creek.cx(z) + side * dist * 0.6 * s,
      ez: z,
      side,
      entryZ: z,
    };
  }

  // ---------- shape ----------

  // 0..1 how far into the granite country a point is.
  graniteFactor(x, z) {
    const g = this.sources.granite;
    return Math.exp(-((x - g.x) ** 2 + (z - g.z) ** 2) / (2 * 17 * 17));
  }

  // 0 = sandy decomposed-granite soil, 1 = bare rock pavement.
  pavement(x, z) {
    return smoothstep(0.0, 0.22, this.n2(x * 0.07 + 300, z * 0.07 - 50));
  }

  benchFactor(x, z, L = this.creek.local(x, z, this.tmpL)) {
    if ((L.n >= 0 ? 1 : -1) !== this.benchSide) return 0;
    const m = smoothstep(-0.1, 0.25, this.n2(z * 0.012 + 70, 3.3));
    return smoothstep(12, 16, L.d) * smoothstep(34, 27, L.d) * m;
  }

  valleyHeight(x, z, L) {
    const n2 = this.n2;
    const d = L.d;
    const hills = fbm(n2, x * 0.007 + 11, z * 0.007 - 7, 5) * 0.5 + 0.5;
    const hillAmp = 2 + 11 * smoothstep(10, 80, d);
    let rise = Math.min(d * 0.045, 3.2) * smoothstep(6, 16, d) + hills * hillAmp * smoothstep(10, 38, d);
    const b = this.benchFactor(x, z, L);
    rise += (2.6 + n2(x * 0.05, z * 0.05) * 0.15 - rise) * b;
    const gf = this.graniteFactor(x, z);
    if (gf > 0.01) rise += gf * (this.pavement(x, z) * 0.45 + fbm(n2, x * 0.04 + 9, z * 0.04, 3) * 0.8);
    return this.creek.waterY(z) + 0.95 + n2(x * 0.02 + 5, z * 0.02) * 0.2 + rise + fbm(n2, x * 0.09, z * 0.09, 3) * 0.16;
  }

  rawHeight(x, z) {
    const L = this.creek.local(x, z, this.tmpL);
    const hv = this.valleyHeight(x, z, L);
    if (L.d > 30) return hv;
    const C = this.creek;
    const hc = C.waterY(z) + C.bedRel(L.nIn / L.w, L.a, C.depth(z), L.w) + this.n2(x * 0.25, z * 0.25) * 0.05;
    return Math.min(hv, hc);
  }

  baseHeight(x, z) {
    const h = this.rawHeight(x, z);
    const dc = Math.hypot(x - this.camp.x, z - this.camp.z);
    const f = smoothstep(11, 6, dc);
    return h + (this.camp.y - h) * f + this.heapHeight(x, z);
  }

  // Height of mullock heaped up at (x, z): rounded cones of spoil.
  heapHeight(x, z) {
    if (!this.heaps) return 0;
    let best = 0;
    for (const hp of this.heaps) {
      const dx = x - hp.x, dz = z - hp.z;
      if (Math.abs(dx) > hp.r || Math.abs(dz) > hp.r) continue;
      const k = 1 - (dx * dx + dz * dz) / (hp.r * hp.r);
      if (k > 0) best = Math.max(best, hp.h * Math.pow(k, 0.75));
    }
    return best;
  }

  // 0..1 how far into the old opal workings.
  opalFactor(x, z) {
    const O = this.sources.opal;
    return O ? Math.exp(-((x - O.x) ** 2 + (z - O.z) ** 2) / (2 * 16 * 16)) : 0;
  }

  // How deep the loose material goes, and how much of it is topsoil.
  geology(x, z, h) {
    const C = this.creek;
    const L = C.local(x, z, this.tmpL);
    const q = L.nIn / L.w;
    const inCh = q >= 0 ? smoothstep(2.3, 1.5, q) : smoothstep(-1.25, -1.0, q);
    const nz = this.n2(x * 0.08 + 31, z * 0.08 - 17) * 0.5 + 0.5;
    // Channel gravel is thin over riffles (bedrock shows through), thick in pools and bars.
    const chT = Math.max(0.03, 0.1 + 0.75 * (1 - C.riffle(z)) + 0.7 * L.a * smoothstep(0, 1.2, q) + (nz - 0.5) * 0.4);
    const b = this.benchFactor(x, z, L);
    const hill = (1 - b) * smoothstep(11, 20, L.d);
    const flat = Math.max(0, 1 - b - hill);
    const offT = b * (1.6 + nz * 0.8) + hill * (0.35 + nz * 0.55) + flat * (1.3 + nz * 0.9);
    // Mullock heaps are loose spoil sitting on the old ground.
    let thick = inCh * chT + (1 - inCh) * offT + this.heapHeight(x, z);
    let topsoil = (1 - inCh) * (b * 0.5 + hill * 0.15 + flat * 0.4);
    const gf = (1 - inCh) * this.graniteFactor(x, z);
    if (gf > 0.01) {
      // Bare pavements, with pockets of rotten granite soil between them.
      const pv = this.pavement(x, z);
      thick += (pv * 0.02 + (1 - pv) * (0.5 + nz * 0.5) - thick) * gf;
      topsoil += ((1 - pv) * 0.1 - topsoil) * gf;
    }
    return { bedrock: h - thick, topsoil };
  }

  // ---------- queries ----------

  getHeight(x, z) {
    for (const o of this.overlays) {
      if (x > o.x0 && x < o.x1 && z > o.z0 && z < o.z1) return o.heightAt(x, z);
    }
    return this.gridHeight(x, z);
  }

  overlayAt(x, z) {
    return this.overlays.find((o) => x > o.x0 - 0.1 && x < o.x1 + 0.1 && z > o.z0 - 0.1 && z < o.z1 + 0.1) || null;
  }

  // A hand-excavation patch takes over a block of grid cells: hide the terrain
  // triangles there (the patch draws that ground) and lock the vertices so the
  // shovel and floods leave the seam alone. Patches are snapped to the grid.
  tuckUnder(o) {
    if (!this.locked) this.locked = new Uint8Array(N * N);
    const ix0 = Math.round((o.x0 + HALF) / CELL), ix1 = Math.round((o.x1 + HALF) / CELL);
    const iz0 = Math.round((o.z0 + HALF) / CELL), iz1 = Math.round((o.z1 + HALF) / CELL);
    const index = this.geo.index;
    for (let iz = iz0; iz < iz1; iz++) {
      for (let ix = ix0; ix < ix1; ix++) {
        const k = (iz * SEG + ix) * 6;
        for (let t = 0; t < 6; t++) index.array[k + t] = 0;
      }
    }
    index.needsUpdate = true;
    for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) this.locked[iz * N + ix] = 1;
    this.overlays.push(o);
  }

  // Grid-aligned square of n cells around (x, z).
  snapBlock(x, z, n) {
    const ix0 = Math.round((x + HALF) / CELL - n / 2), iz0 = Math.round((z + HALF) / CELL - n / 2);
    return { x0: -HALF + ix0 * CELL, z0: -HALF + iz0 * CELL, size: n * CELL };
  }

  gridHeight(x, z) {
    const fx = Math.min(Math.max((x + HALF) / CELL, 0), SEG - 1e-4);
    const fz = Math.min(Math.max((z + HALF) / CELL, 0), SEG - 1e-4);
    const ix = Math.floor(fx), iz = Math.floor(fz);
    const tx = fx - ix, tz = fz - iz;
    const i = iz * N + ix;
    const h = this.heights;
    const a = h[i] + (h[i + 1] - h[i]) * tx;
    const b = h[i + N] + (h[i + N + 1] - h[i + N]) * tx;
    return a + (b - a) * tz;
  }

  index(x, z) {
    const ix = Math.min(Math.max(Math.round((x + HALF) / CELL), 0), SEG);
    const iz = Math.min(Math.max(Math.round((z + HALF) / CELL), 0), SEG);
    return iz * N + ix;
  }

  getOrigHeight(x, z) { return this.orig[this.index(x, z)]; }

  // Bilinear sample of any per-vertex array (stride 1 or 3).
  sampleGrid(arr, x, z, stride = 1, c = 0) {
    const fx = Math.min(Math.max((x + HALF) / CELL, 0), SEG - 1e-4);
    const fz = Math.min(Math.max((z + HALF) / CELL, 0), SEG - 1e-4);
    const ix = Math.floor(fx), iz = Math.floor(fz);
    const tx = fx - ix, tz = fz - iz;
    const i = iz * N + ix;
    const v = (k) => arr[k * stride + c];
    const a = v(i) + (v(i + 1) - v(i)) * tx;
    const b = v(i + N) + (v(i + N + 1) - v(i + N)) * tx;
    return a + (b - a) * tz;
  }
  bedrockAt(x, z) { return this.sampleGrid(this.bedrock, x, z); }
  colorAt(x, z) { return [0, 1, 2].map((c) => this.sampleGrid(this.col, x, z, 3, c)); }

  geologyAt(x, z) {
    const i = this.index(x, z);
    return { orig: this.orig[i], bedrock: this.bedrock[i], topsoil: this.topsoil[i], h: this.heights[i] };
  }

  // Water depth at a point, or -1 if not in the creek.
  waterDepth(x, z) {
    const L = this.creek.local(x, z, this.tmpL);
    if (L.d > L.w + 4 + this.creek.level * 8) return -1;
    return this.creek.surfaceY(z) - this.getHeight(x, z);
  }

  inside(x, z) { return Math.abs(x) < HALF && Math.abs(z) < HALF; }

  // March a ray against the heightfield. Returns a Vector3 or null.
  raycast(origin, dir, maxDist) {
    const step = 0.04;
    const p = new THREE.Vector3();
    let prevT = 0;
    for (let t = 0; t <= maxDist; t += step) {
      p.copy(origin).addScaledVector(dir, t);
      if (p.y < this.getHeight(p.x, p.z)) {
        let lo = prevT, hi = t;
        for (let k = 0; k < 8; k++) {
          const mid = (lo + hi) / 2;
          p.copy(origin).addScaledVector(dir, mid);
          if (p.y < this.getHeight(p.x, p.z)) hi = mid; else lo = mid;
        }
        return p.copy(origin).addScaledVector(dir, hi);
      }
      prevT = t;
    }
    return null;
  }

  // Lower the ground around (x,z), never below bedrock. Returns true if anything moved.
  dig(x, z, radius, amount) {
    const ix0 = Math.max(1, Math.floor((x - radius + HALF) / CELL));
    const ix1 = Math.min(SEG - 1, Math.ceil((x + radius + HALF) / CELL));
    const iz0 = Math.max(1, Math.floor((z - radius + HALF) / CELL));
    const iz1 = Math.min(SEG - 1, Math.ceil((z + radius + HALF) / CELL));
    let changed = false;
    for (let iz = iz0; iz <= iz1; iz++) {
      for (let ix = ix0; ix <= ix1; ix++) {
        const vx = -HALF + ix * CELL, vz = -HALF + iz * CELL;
        const r = Math.hypot(vx - x, vz - z) / radius;
        if (r >= 1) continue;
        const i = iz * N + ix;
        const fall = 1 - r * r;
        if (this.locked && this.locked[i]) continue;
        const floor = Math.max(this.bedrock[i], this.orig[i] - MAX_DIG);
        const nh = Math.max(floor, this.heights[i] - amount * fall);
        if (nh < this.heights[i] - 1e-4) {
          this.heights[i] = nh;
          changed = true;
        }
      }
    }
    if (changed) this.refresh(ix0 - 1, ix1 + 1, iz0 - 1, iz1 + 1);
    return changed;
  }

  // After a flood: holes in the channel are filled with fresh gravel; holes on
  // ground the flood covered are partly silted up. Returns how many points changed.
  refillAfterFlood(peak) {
    const C = this.creek;
    const L = {};
    let ix0 = SEG, ix1 = 0, iz0 = SEG, iz1 = 0, changed = 0;
    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) {
        const i = iz * N + ix;
        const h = this.heights[i], o = this.orig[i];
        if (h > o - 1e-3) continue;
        if (this.locked && this.locked[i]) continue;
        const x = -HALF + ix * CELL, z = -HALF + iz * CELL;
        C.local(x, z, L);
        const q = L.nIn / L.w;
        const inChannel = q > -1.15 && q < 1.8;
        const flooded = C.waterY(z) + peak > o;
        if (!inChannel && !flooded) continue;
        this.heights[i] = inChannel ? o : h + (o - h) * 0.6;
        changed++;
        if (ix < ix0) ix0 = ix; if (ix > ix1) ix1 = ix;
        if (iz < iz0) iz0 = iz; if (iz > iz1) iz1 = iz;
      }
    }
    if (changed) this.refresh(ix0 - 1, ix1 + 1, iz0 - 1, iz1 + 1);
    return changed;
  }

  // ---------- saving ----------

  // Every vertex the shovel has moved, as (index, millimetres below original).
  digSnapshot() {
    const idx = [], mm = [];
    for (let i = 0; i < this.heights.length; i++) {
      if (this.locked && this.locked[i]) continue;
      const d = this.orig[i] - this.heights[i];
      if (d > 0.001) { idx.push(i); mm.push(Math.min(32767, Math.round(d * 1000))); }
    }
    return { idx: Uint32Array.from(idx), mm: Int16Array.from(mm) };
  }

  applyDigs(idx, mm) {
    for (let k = 0; k < idx.length; k++) this.heights[idx[k]] = this.orig[idx[k]] - mm[k] / 1000;
    if (idx.length) this.refresh(0, SEG, 0, SEG);
  }

  // ---------- mesh ----------

  buildMesh() {
    const count = N * N;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(count * 3);
    this.nor = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2);
    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) {
        const i = iz * N + ix;
        this.pos[i * 3] = -HALF + ix * CELL;
        this.pos[i * 3 + 2] = -HALF + iz * CELL;
        uv[i * 2] = ix * CELL * 0.35;
        uv[i * 2 + 1] = iz * CELL * 0.35;
      }
    }
    geo.setIndex(new THREE.BufferAttribute(gridIndex(SEG), 1));
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.geo = geo;
    this.refresh(0, SEG, 0, SEG);
    geo.computeBoundingSphere();
    geo.computeBoundingBox();

    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: grainTexture(),
      roughness: 0.95,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.receiveShadow = true;
    return mesh;
  }

  refresh(ix0, ix1, iz0, iz1) {
    ix0 = Math.max(0, ix0); iz0 = Math.max(0, iz0);
    ix1 = Math.min(SEG, ix1); iz1 = Math.min(SEG, iz1);
    const h = this.heights;
    for (let iz = iz0; iz <= iz1; iz++) {
      for (let ix = ix0; ix <= ix1; ix++) {
        const i = iz * N + ix;
        this.pos[i * 3 + 1] = h[i];
        const hl = h[iz * N + Math.max(ix - 1, 0)];
        const hr = h[iz * N + Math.min(ix + 1, SEG)];
        const hu = h[Math.max(iz - 1, 0) * N + ix];
        const hd = h[Math.min(iz + 1, SEG) * N + ix];
        let nx = hl - hr, ny = 2 * CELL, nz = hu - hd;
        const len = Math.hypot(nx, ny, nz);
        nx /= len; ny /= len; nz /= len;
        this.nor[i * 3] = nx; this.nor[i * 3 + 1] = ny; this.nor[i * 3 + 2] = nz;
        const c = this.surfaceColor(-HALF + ix * CELL, -HALF + iz * CELL, h[i], ny, this.orig[i], this.bedrock[i], this.topsoil[i]);
        this.col[i * 3] = c[0]; this.col[i * 3 + 1] = c[1]; this.col[i * 3 + 2] = c[2];
      }
    }
    const g = this.geo;
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
  }

  // Soil colour tells you the geology: black basalt soil, pale quartz ground,
  // pinkish rhyolite, grey creek gravel, slate where bedrock shows.
  surfaceColor(x, z, h, ny, orig, bedrock, topsoil) {
    const n2 = this.n2;
    const C = this.creek;
    const L = C.local(x, z, this.tmpL);
    const q = L.nIn / L.w;
    const wy = C.waterY(z);
    const S = this.sources;

    const t0 = n2(x * 0.03, z * 0.03) * 0.5 + 0.5;
    let r = 0.60 + 0.14 * t0, g = 0.29 + 0.17 * t0, b = 0.15 + 0.10 * t0;
    const mix = (k, cr, cg, cb) => { r += (cr - r) * k; g += (cg - g) * k; b += (cb - b) * k; };

    const dist2 = (s) => (x - s.x) ** 2 + (z - s.z) ** 2;
    mix(0.85 * Math.exp(-dist2(S.basalt) / (2 * 40 * 40)), 0.22, 0.18, 0.15);
    mix(0.6 * Math.exp(-dist2(S.reef) / (2 * 20 * 20)), 0.80, 0.70, 0.58);
    mix(0.6 * Math.exp(-dist2(S.rhyolite) / (2 * 36 * 36)), 0.74, 0.55, 0.47);
    const gf = this.graniteFactor(x, z);
    mix(gf * 0.9, 0.72, 0.62, 0.5); // pale gritty grus
    // Opal country: bleached claystone ground, and blinding white mullock heaps.
    mix(this.opalFactor(x, z) * 0.85, 0.82, 0.74, 0.64);
    mix(smoothstep(0.02, 0.2, this.heapHeight(x, z)), 0.9, 0.87, 0.8);

    const grass = smoothstep(0.05, 0.55, n2(x * 0.05 + 100, z * 0.05)) * smoothstep(L.w + 2, L.w + 8, L.d) * 0.6;
    mix(grass, 0.62, 0.56, 0.32);
    // The shale bed: dark grey ground, littered with weathered chips.
    if (S.fossil) mix(0.95 * smoothstep(15, 7, Math.sqrt(dist2(S.fossil))) * (0.85 + 0.15 * n2(x * 0.7, z * 0.7)), 0.34, 0.335, 0.33);

    // Creek gravels: pale and dry on the bars, dark where wet.
    const inCh = q >= 0 ? smoothstep(2.4, 1.4, q) : smoothstep(-1.3, -0.95, q);
    mix(inCh, 0.60, 0.56, 0.49);
    mix(smoothstep(wy + 0.12, wy - 0.05, h), 0.34, 0.31, 0.26);

    // Steep cut banks show raw soil and rock.
    mix(smoothstep(0.86, 0.68, ny), 0.50, 0.33, 0.24);

    // Bedrock bars in riffles, and anywhere you've dug down to it.
    const slate = smoothstep(0.1, 0.03, h - bedrock);
    const dug = orig - h;
    if (dug > 0.005) {
      const deeperThanSoil = smoothstep(topsoil - 0.02, topsoil + 0.08, dug);
      mix(smoothstep(0, 0.12, dug) * (1 - deeperThanSoil), 0.36, 0.19, 0.10); // dark topsoil
      mix(deeperThanSoil, 0.55, 0.52, 0.46); // grey gravel wash
    }
    // Bare rock: slate along the creek, speckled pink-grey granite in the granite country.
    mix(slate, 0.30 + 0.33 * gf, 0.32 + 0.24 * gf, 0.36 + 0.17 * gf);

    return [srgb(r), srgb(g), srgb(b)];
  }

  // Low-res terrain beyond the claim so the valley carries on to the horizon.
  buildFar() {
    const FS = 1500, FSEG = 150, FN = FSEG + 1, fc = FS / FSEG;
    const pos = new Float32Array(FN * FN * 3);
    const col = new Float32Array(FN * FN * 3);
    for (let iz = 0; iz < FN; iz++) {
      for (let ix = 0; ix < FN; ix++) {
        const x = -FS / 2 + ix * fc, z = -FS / 2 + iz * fc;
        const i = iz * FN + ix;
        const inner = Math.max(Math.abs(x), Math.abs(z));
        // Tuck it under the detailed terrain inside the claim.
        const h = this.rawHeight(x, z) - (inner < HALF - 1 ? 3 : 0);
        pos[i * 3] = x; pos[i * 3 + 1] = h; pos[i * 3 + 2] = z;
        const c = this.surfaceColor(x, z, h, 0.95, h, h - 2, 0.4);
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setIndex(new THREE.BufferAttribute(gridIndex(FSEG), 1));
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    mesh.receiveShadow = false;
    return mesh;
  }
}

function gridIndex(seg) {
  const n = seg + 1;
  const index = new Uint32Array(seg * seg * 6);
  let k = 0;
  for (let iz = 0; iz < seg; iz++) {
    for (let ix = 0; ix < seg; ix++) {
      const a = iz * n + ix, b = a + 1, c = a + n, d = c + 1;
      index[k++] = a; index[k++] = c; index[k++] = b;
      index[k++] = b; index[k++] = c; index[k++] = d;
    }
  }
  return index;
}

function grainTexture() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(s, s);
  for (let i = 0; i < s * s; i++) {
    const v = 205 + Math.random() * 50;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v * 0.98;
    img.data[i * 4 + 2] = v * 0.96;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  for (let k = 0; k < 900; k++) {
    const v = 140 + Math.random() * 115;
    ctx.fillStyle = `rgb(${v},${v * 0.95},${v * 0.9})`;
    ctx.beginPath();
    ctx.arc(Math.random() * s, Math.random() * s, 0.6 + Math.random() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
