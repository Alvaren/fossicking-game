import * as THREE from 'three';
import { makeCrystalMesh } from './crystals.js';
import { CELL } from './terrain.js';

// Kneeling hand-excavation. Where you kneel, a small high-detail patch of
// ground (1.4 m square, 1.25 cm cells) takes over from the terrain. You work
// it down with hand tools; the material at each point comes from the geology
// and from any pocket or vug that sits there.

const SIZE = 3 * CELL; // exactly three terrain cells, so the edges line up with the grid
const CELLS = 128;
const NV = CELLS + 1;
const STEP = SIZE / CELLS;
const MAX_DEPTH = 0.6;
const BORDER = 3; // cells at the edge you can't dig, so the skirt stays tidy

export const KNEEL_TOOLS = ['brush', 'trowel', 'pick', 'hands'];

const TOOL = {
  brush: { radius: 0.035, dmg: 0, rate: { soil: 0.07, grus: 0.04, clay: 0.06, mud: 0.16 } },
  trowel: { radius: 0.055, dmg: 0.9, rate: { soil: 0.38, grus: 0.2, clay: 0.3, mud: 0.45 } },
  pick: { radius: 0.04, dmg: 1.8, rate: { soil: 0.45, grus: 0.35, clay: 0.32, mud: 0.32, rock: 0.12, vein: 0.08 } },
  hands: { radius: 0, dmg: 0, rate: {} },
};

const COLORS = {
  soil: [0.62, 0.48, 0.36],
  grus: [0.76, 0.64, 0.5],
  clay: [0.62, 0.3, 0.16],
  mud: [0.3, 0.22, 0.16],
  rock: [0.62, 0.52, 0.47],
  vein: [0.9, 0.88, 0.84],
};
const NAMES = { soil: 'soil', grus: 'rotten granite', clay: 'pocket clay', mud: 'vug mud', rock: 'granite', vein: 'quartz vein' };

const srgb = (v) => Math.pow(v, 2.2);

export class Patch {
  constructor(scene, terrain, field, cx, cz) {
    this.terrain = terrain;
    this.field = field;
    const b = terrain.snapBlock(cx, cz, 3);
    this.x0 = b.x0; this.x1 = b.x0 + SIZE;
    this.z0 = b.z0; this.z1 = b.z0 + SIZE;
    this.cx = (this.x0 + this.x1) / 2; this.cz = (this.z0 + this.z1) / 2;
    this.sites = field ? field.sitesNear(cx, cz, SIZE * 0.75) : [];

    this.h = new Float32Array(NV * NV);
    this.floor = new Float32Array(NV * NV);
    this.bed = new Float32Array(NV * NV);
    this.top = new Float32Array(NV * NV);
    this.topCol = new Float32Array(NV * NV * 3);
    let minTop = Infinity;
    for (let j = 0; j < NV; j++) {
      for (let i = 0; i < NV; i++) {
        const x = this.x0 + i * STEP, z = this.z0 + j * STEP;
        const k = j * NV + i;
        const h = terrain.gridHeight(x, z);
        this.h[k] = h;
        this.top[k] = h;
        this.bed[k] = terrain.bedrockAt(x, z);
        const tc = terrain.colorAt(x, z); // undug ground keeps the terrain's own colour
        this.topCol[k * 3] = tc[0]; this.topCol[k * 3 + 1] = tc[1]; this.topCol[k * 3 + 2] = tc[2];
        this.floor[k] = h - MAX_DEPTH;
        minTop = Math.min(minTop, h);
      }
    }
    this.group = new THREE.Group();
    scene.add(this.group);
    this.buildMesh(minTop);
    this.crystals = [];
    for (const s of this.sites) {
      for (const c of s.crystals) {
        if (c.collected) continue;
        if (c.x < this.x0 + 0.05 || c.x > this.x1 - 0.05 || c.z < this.z0 + 0.05 || c.z > this.z1 - 0.05) continue;
        const mesh = makeCrystalMesh(c);
        this.group.add(mesh);
        this.crystals.push({ c, mesh, exposure: 0 });
      }
    }
    this.support = new Float32Array(NV * NV);
    this.computeSupport();
    terrain.tuckUnder(this);
    if (field) field.hideDecalsIn(this.x0, this.x1, this.z0, this.z1);
  }

  // Crystals are held by the ground around them: you can't dig out from under
  // one until it's lifted. Each cell gets the lowest point of any crystal over it.
  computeSupport() {
    this.support.fill(-Infinity);
    for (const e of this.crystals) {
      const c = e.c;
      if (c.collected) continue;
      const len = c.broken ? c.len * 0.55 : c.len;
      const low = Math.min(c.y, c.y + c.ay * len) - 0.004;
      const rad = len * 0.2 + 0.006;
      const ex = c.x + c.ax * len, ez = c.z + c.az * len;
      const i0 = Math.max(0, Math.floor((Math.min(c.x, ex) - rad - this.x0) / STEP));
      const i1 = Math.min(CELLS, Math.ceil((Math.max(c.x, ex) + rad - this.x0) / STEP));
      const j0 = Math.max(0, Math.floor((Math.min(c.z, ez) - rad - this.z0) / STEP));
      const j1 = Math.min(CELLS, Math.ceil((Math.max(c.z, ez) + rad - this.z0) / STEP));
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const x = this.x0 + i * STEP, z = this.z0 + j * STEP;
          // Distance from the cell to the crystal's footprint on the ground.
          const dx = ex - c.x, dz = ez - c.z;
          const L2 = dx * dx + dz * dz || 1e-9;
          const t = Math.max(0, Math.min(1, ((x - c.x) * dx + (z - c.z) * dz) / L2));
          if (Math.hypot(x - c.x - dx * t, z - c.z - dz * t) > rad) continue;
          const k = j * NV + i;
          if (low > this.support[k]) this.support[k] = low;
        }
      }
    }
  }

  // What's at (x, y, z)?
  material(x, y, z) {
    for (const s of this.sites) {
      const e = this.field.ellip(s, x, y, z);
      if (e < 1) {
        if (s.kind === 'pocket') return 'clay';
        return y < this.field.mudTop(s) ? 'mud' : 'air';
      }
    }
    const bed = this.bedAt(x, z);
    if (y > bed) {
      const topH = this.topAt(x, z);
      return topH - y < 0.12 ? 'soil' : 'grus';
    }
    if (this.field && this.field.veinDist(x, z) < 0) return 'vein';
    return 'rock';
  }

  index(x, z) {
    const i = Math.min(CELLS, Math.max(0, Math.round((x - this.x0) / STEP)));
    const j = Math.min(CELLS, Math.max(0, Math.round((z - this.z0) / STEP)));
    return j * NV + i;
  }
  bedAt(x, z) { return this.bed[this.index(x, z)]; }
  topAt(x, z) { return this.top[this.index(x, z)]; }

  heightAt(x, z) {
    const fx = Math.min(Math.max((x - this.x0) / STEP, 0), CELLS - 1e-4);
    const fz = Math.min(Math.max((z - this.z0) / STEP, 0), CELLS - 1e-4);
    const i = Math.floor(fx), j = Math.floor(fz);
    const tx = fx - i, tz = fz - j;
    const k = j * NV + i;
    const h = this.h;
    const a = h[k] + (h[k + 1] - h[k]) * tx;
    const b = h[k + NV] + (h[k + NV + 1] - h[k + NV]) * tx;
    return a + (b - a) * tz;
  }

  contains(x, z) { return x > this.x0 && x < this.x1 && z > this.z0 && z < this.z1; }

  raycast(origin, dir, maxDist) {
    const p = new THREE.Vector3();
    let prev = 0;
    for (let t = 0; t < maxDist; t += 0.006) {
      p.copy(origin).addScaledVector(dir, t);
      if (!this.contains(p.x, p.z)) { prev = t; continue; }
      if (p.y < this.heightAt(p.x, p.z)) {
        let lo = prev, hi = t;
        for (let k = 0; k < 6; k++) {
          const mid = (lo + hi) / 2;
          p.copy(origin).addScaledVector(dir, mid);
          if (this.contains(p.x, p.z) && p.y < this.heightAt(p.x, p.z)) hi = mid; else lo = mid;
        }
        return p.copy(origin).addScaledVector(dir, hi);
      }
      prev = t;
    }
    return null;
  }

  // Work the ground at p with a tool for dt seconds.
  work(tool, p, dt) {
    const T = TOOL[tool];
    if (!T.radius) return null;
    const R = T.radius;
    const i0 = Math.max(BORDER, Math.floor((p.x - R - this.x0) / STEP));
    const i1 = Math.min(CELLS - BORDER, Math.ceil((p.x + R - this.x0) / STEP));
    const j0 = Math.max(BORDER, Math.floor((p.z - R - this.z0) / STEP));
    const j1 = Math.min(CELLS - BORDER, Math.ceil((p.z + R - this.z0) / STEP));
    let mat = null, moved = false, opened = null;
    const struck = this.heightAt(p.x, p.z); // the surface the tool actually hits
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const x = this.x0 + i * STEP, z = this.z0 + j * STEP;
        const d = Math.hypot(x - p.x, z - p.z) / R;
        if (d >= 1) continue;
        const k = j * NV + i;
        const y = this.h[k];
        let m = this.material(x, y - 0.002, z);
        if (m === 'air') { opened = this.dropToFloor(k, x, z) || opened; moved = true; continue; }
        if (!mat || d < 0.3) mat = m;
        const rate = T.rate[m] || 0;
        if (!rate) continue;
        const ny = Math.max(this.floor[k], this.support[k], y - rate * dt * (1 - d * d));
        if (ny < y) {
          this.h[k] = ny;
          moved = true;
          if (this.material(x, ny - 0.002, z) === 'air') opened = this.dropToFloor(k, x, z) || opened;
        }
      }
    }
    if (opened && !opened.opened) opened.opened = true; else opened = null;
    if (moved) this.refresh(i0 - 1, i1 + 1, j0 - 1, j1 + 1);

    // Steel on crystal.
    let hurt = null;
    if (T.dmg) {
      const surf = new THREE.Vector3(p.x, struck, p.z);
      for (const e of this.crystals) {
        if (e.c.collected || e.c.broken) continue;
        if (distToCrystal(surf, e.c) < e.c.len * 0.2 + R * 0.7) {
          e.c.damage += T.dmg * dt;
          hurt = e;
          if (e.c.damage >= 1) this.breakCrystal(e);
        }
      }
    }
    return { mat, opened, hurt };
  }

  // Broke through into a cavity: the surface falls to the mud or the floor.
  // Returns the vug that was opened.
  dropToFloor(k, x, z) {
    let best = null, site = null;
    for (const s of this.sites) {
      if (s.kind !== 'vug') continue;
      const f = this.field.vugFloor(s, x, z);
      if (f !== null && (best === null || f < best)) { best = f; site = s; }
    }
    if (best !== null) this.h[k] = Math.max(this.floor[k], this.support[k], Math.min(this.h[k], best));
    return site;
  }

  breakCrystal(e) {
    e.c.broken = true;
    const old = e.mesh;
    e.mesh = makeCrystalMesh(e.c);
    this.group.remove(old);
    this.group.add(e.mesh);
  }

  // How much of each crystal is clear of the ground.
  updateExposure() {
    for (const e of this.crystals) {
      if (e.c.collected) continue;
      const c = e.c;
      const len = c.broken ? c.len * 0.55 : c.len;
      let out = 0;
      for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        const x = c.x + c.ax * len * t, y = c.y + c.ay * len * t, z = c.z + c.az * len * t;
        if (y > this.heightAt(x, z) - c.len * 0.04) out++;
      }
      e.exposure = out / 5;
    }
  }

  materialAt(p) { return this.material(p.x, this.heightAt(p.x, p.z) - 0.002, p.z); }

  // How far each cell has been dug, in millimetres.
  snapshot() {
    const mm = new Int16Array(NV * NV);
    for (let k = 0; k < mm.length; k++) mm[k] = Math.round((this.top[k] - this.h[k]) * 1000);
    return { cx: this.cx, cz: this.cz, mm };
  }

  restore(mm) {
    for (let k = 0; k < mm.length; k++) this.h[k] = this.top[k] - mm[k] / 1000;
    this.refresh(0, CELLS, 0, CELLS);
  }

  // ---------- mesh ----------

  buildMesh(minTop) {
    const pos = new Float32Array(NV * NV * 3);
    const col = new Float32Array(NV * NV * 3);
    const uv = new Float32Array(NV * NV * 2);
    const HALF_WORLD = this.terrain.worldHalf;
    const idx = [];
    for (let j = 0; j < NV; j++) {
      for (let i = 0; i < NV; i++) {
        const k = j * NV + i;
        pos[k * 3] = this.x0 + i * STEP;
        pos[k * 3 + 2] = this.z0 + j * STEP;
        // Same texture mapping as the terrain so the grain lines up across the seam.
        uv[k * 2] = (pos[k * 3] + HALF_WORLD) * 0.35;
        uv[k * 2 + 1] = (pos[k * 3 + 2] + HALF_WORLD) * 0.35;
      }
    }
    for (let j = 0; j < CELLS; j++) {
      for (let i = 0; i < CELLS; i++) {
        const a = j * NV + i, b = a + 1, c = a + NV, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    this.geo = geo;
    this.pos = pos; this.col = col;
    this.refresh(0, CELLS, 0, CELLS);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, map: this.terrain.material.map }));
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
    this.group.add(this.mesh);

    // Skirt hangs down from the edges so you never see under the patch.
    const sk = [], si = [];
    const edge = [];
    for (let i = 0; i < NV; i++) edge.push([i, 0]);
    for (let j = 1; j < NV; j++) edge.push([CELLS, j]);
    for (let i = CELLS - 1; i >= 0; i--) edge.push([i, CELLS]);
    for (let j = CELLS - 1; j > 0; j--) edge.push([0, j]);
    edge.push([0, 0]);
    edge.forEach(([i, j], n) => {
      const k = j * NV + i;
      const x = this.x0 + i * STEP, z = this.z0 + j * STEP;
      sk.push(x, this.h[k], z, x, minTop - MAX_DEPTH - 0.1, z);
      if (n > 0) { const b = n * 2; si.push(b - 2, b - 1, b, b - 1, b + 1, b); }
    });
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sk, 3));
    sg.setIndex(si);
    sg.computeVertexNormals();
    const skirt = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: 0x6a5240, roughness: 1, side: THREE.DoubleSide }));
    this.group.add(skirt);
  }

  refresh(i0, i1, j0, j1) {
    i0 = Math.max(0, i0); j0 = Math.max(0, j0);
    i1 = Math.min(CELLS, i1); j1 = Math.min(CELLS, j1);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = j * NV + i;
        const x = this.x0 + i * STEP, z = this.z0 + j * STEP;
        const y = this.h[k];
        this.pos[k * 3 + 1] = y;
        const bareVein = this.field && this.bed[k] > y - 0.03 && this.field.veinDist(x, z) < 0;
        if (this.top[k] - y < 0.003 && !bareVein) {
          this.col[k * 3] = this.topCol[k * 3];
          this.col[k * 3 + 1] = this.topCol[k * 3 + 1];
          this.col[k * 3 + 2] = this.topCol[k * 3 + 2];
          continue;
        }
        let m = bareVein && this.top[k] - y < 0.003 ? 'vein' : this.material(x, y - 0.002, z);
        if (m === 'air') m = 'mud';
        const c = COLORS[m];
        // A little grain so it doesn't look like plastic.
        const n = 0.9 + 0.2 * hash(i, j);
        const dug = Math.min(1, (this.top[k] - y) * 6);
        const wet = m === 'clay' || m === 'mud' ? 0.85 : 1 - dug * 0.08;
        this.col[k * 3] = srgb(c[0] * n * wet);
        this.col[k * 3 + 1] = srgb(c[1] * n * wet);
        this.col[k * 3 + 2] = srgb(c[2] * n * wet);
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.computeVertexNormals();
  }
}

function hash(i, j) {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _ab = new THREE.Vector3(), _ap = new THREE.Vector3();
function distToCrystal(p, c) {
  _a.set(c.x, c.y, c.z);
  _b.set(c.x + c.ax * c.len, c.y + c.ay * c.len, c.z + c.az * c.len);
  _ab.subVectors(_b, _a);
  _ap.subVectors(p, _a);
  const t = Math.max(0, Math.min(1, _ap.dot(_ab) / _ab.lengthSq()));
  return _ap.sub(_ab.multiplyScalar(t)).length();
}

export const materialName = (m) => NAMES[m] || m;

// Manages kneeling: which patch you're at, and the hand-tool work.
export class Excavation {
  constructor(scene, terrain, field) {
    this.scene = scene;
    this.terrain = terrain;
    this.field = field;
    this.patches = [];
    this.active = null;
    this.raycaster = new THREE.Raycaster();
    this.cursor = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.7, depthTest: false }),
    );
    this.cursor.renderOrder = 5;
    this.cursor.visible = false;
    scene.add(this.cursor);
  }

  // Kneel in front of (x,z) looking along yaw. Snaps to a nearby pocket or vug.
  kneel(x, z, yaw) {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    let cx = x + fx * 0.75, cz = z + fz * 0.75;
    const site = this.field.sites.find((s) => Math.hypot(s.x - cx, s.z - cz) < 1.0);
    if (site) { cx = site.x; cz = site.z; }
    let patch = this.patches.find((p) => Math.hypot(p.cx - cx, p.cz - cz) < 0.7);
    if (!patch) {
      // Don't overlap an existing patch.
      if (this.patches.some((p) => Math.abs(p.cx - cx) < SIZE && Math.abs(p.cz - cz) < SIZE)) return null;
      patch = new Patch(this.scene, this.terrain, this.field, cx, cz);
      this.patches.push(patch);
    }
    this.active = patch;
    return { patch, x: patch.cx - fx * 1.0, z: patch.cz - fz * 1.0, site };
  }

  restorePatches(list) {
    for (const { cx, cz, mm } of list) {
      const p = new Patch(this.scene, this.terrain, this.field, cx, cz);
      p.restore(mm);
      this.patches.push(p);
    }
  }

  stand() {
    this.active = null;
    this.cursor.visible = false;
  }

  // The crystal under the crosshair, if any.
  pickCrystal(origin, dir) {
    if (!this.active) return null;
    this.raycaster.set(origin, dir);
    this.raycaster.far = 1.8;
    const meshes = this.active.crystals.filter((e) => !e.c.collected).map((e) => e.mesh);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    if (!hit) return null;
    return this.active.crystals.find((e) => e.mesh === hit.object);
  }

  collect(e) {
    e.c.collected = true;
    this.active.group.remove(e.mesh);
    this.active.computeSupport();
  }

  showCursor(p, tool) {
    const R = TOOL[tool].radius;
    this.cursor.visible = !!p && R > 0;
    if (!this.cursor.visible) return;
    this.cursor.position.set(p.x, p.y + 0.004, p.z);
    this.cursor.scale.setScalar(R);
  }
}
