import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from './noise.js';
import { makeCrystalMesh, crystalLOD } from './crystals.js';
import { gemsRealistic } from './settings.js';
import { rockMaterial } from './rockmaterials.js';

// Loose boulders that can hide a vug. Granite boulders weathered out of the
// granite country sometimes carry a crystal-lined cavity (smoky and clear
// quartz, feldspar, now and then topaz); white reef-quartz boulders up by the
// reef can be hollow with clear quartz and amethyst inside. Tap one with the
// rock hammer and listen: a hollow one rings dull. Then split it the old way
// with plug and feathers: drill a line of holes, drive the wedges in, and it
// cracks open along the line.

const GRANITE_MIX = [['smoky quartz', 40], ['clear quartz', 26], ['microcline', 16], ['amazonite', 5], ['topaz crystal', 5], ['fluorite', 8]];
const QUARTZ_MIX = [['clear quartz', 50], ['amethyst', 30], ['milky quartz', 12], ['citrine', 8]];
const pickW = (list, r) => {
  let t = r() * list.reduce((s, x) => s + x[1], 0);
  for (const [k, w] of list) { t -= w; if (t <= 0) return k; }
  return list[0][0];
};

const SPLIT_TIME = 6;   // seconds of drilling and wedging
const DRILL_PART = 0.6; // the first 60% is drilling the holes

function noise3(x, y, z, seed) {
  const h = (i, j, k) => {
    let n = (i * 374761393 + j * 668265263 + k * 1274126177 + seed * 69069) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = x - xi, v = y - yi, w = z - zi;
  const s = (t) => t * t * (3 - 2 * t);
  const l = (a, b, t) => a + (b - a) * s(t);
  return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
    l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w);
}

// One half of a boulder (side +1: x >= 0). Everything past the split plane is
// pressed flat onto it, so the two halves meet in a clean fresh face; a vug is
// a dish sunk into both faces.
function halfGeometry(b, side) {
  let g = new THREE.IcosahedronGeometry(1, 4);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const faceA = new Float32Array(p.count), caveA = new Float32Array(p.count);
  const rind = b.kind === 'quartz' ? new THREE.Color(0xd9d2c4) : new THREE.Color(0x8c7466);
  const fresh = b.kind === 'quartz' ? new THREE.Color(0xe6e2da) : new THREE.Color(0x9a8a80);
  const cave = b.kind === 'quartz' ? new THREE.Color(0xb8a68c) : new THREE.Color(0x6a4a32);
  const c = new THREE.Color();
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = noise3(v.x * 1.6 + 5, v.y * 1.6, v.z * 1.6, b.seed) - 0.5;
    const r = 1 + n * 0.32 + (noise3(v.x * 4, v.y * 4, v.z * 4 + 9, b.seed) - 0.5) * 0.08;
    let x = v.x * r * b.r * 1.1, y = v.y * r * b.r * 0.78, z = v.z * r * b.r;
    const speck = noise3(v.x * 22, v.y * 22, v.z * 22, b.seed + 3);
    c.copy(rind).multiplyScalar(0.85 + speck * 0.3);
    if (x * side < 0) {
      // Past the split: onto the face. (Right at the rim it keeps the weathered
      // colour, so the closed boulder shows no seam.)
      if (-x * side > b.r * 0.12) { c.copy(fresh).multiplyScalar(0.9 + speck * 0.2); faceA[i] = 1; }
      x = 0;
      if (b.vug) {
        const d = Math.hypot(y - b.vug.y, z - b.vug.z) / b.vug.rad;
        if (d < 1) {
          x = side * b.vug.depth * (1 - d * d); // the cavity, sunk into this half
          c.copy(cave).multiplyScalar(0.7 + speck * 0.5);
          faceA[i] = 0;
          caveA[i] = 1;
        }
      }
    }
    p.setXYZ(i, x, y, z);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aFace', new THREE.BufferAttribute(faceA, 1));
  g.setAttribute('aCave', new THREE.BufferAttribute(caveA, 1));
  g.computeVertexNormals();
  return g;
}

// Shared geological surfaces retain the fresh-face/cavity vertex masks.
const boulderMaterial = kind => rockMaterial(kind, { split: true });

export class Boulders {
  constructor(scene, terrain, seed, saved, colliders) {
    this.scene = scene;
    this.terrain = terrain;
    this.list = [];
    const split = new Set(saved?.split || []);
    this.taken = new Set(saved?.taken || []);
    const r = mulberry32(seed * 71 + 13);
    const S = terrain.sources;
    const clear = (x, z, rad) => terrain.creek.local(x, z, {}).d > 6 && Math.abs(x) < 106 && Math.abs(z) < 106
      && !colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + rad + 0.6)
      && !this.list.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + rad + 1.5)
      && terrain.heapHeight(x, z) < 0.01;
    const place = (src, n, spread, kind, vugChance) => {
      for (let k = 0, made = 0; k < 200 && made < n; k++) {
        const a = r() * Math.PI * 2, d = 4 + Math.sqrt(r()) * spread;
        const x = src.x + Math.cos(a) * d, z = src.z + Math.sin(a) * d;
        const rad = kind === 'quartz' ? 0.35 + r() * 0.3 : 0.45 + r() * 0.4;
        const hasVug = r() < vugChance;
        const b = {
          id: this.list.length, kind, x, z, r: rad, yaw: r() * Math.PI * 2, seed: Math.floor(r() * 1e6),
          vug: hasVug ? { y: (r() - 0.5) * rad * 0.3, z: (r() - 0.5) * rad * 0.4, rad: rad * (0.38 + r() * 0.2), depth: rad * (0.22 + r() * 0.12) } : null,
          split: false, progress: 0, t: 1,
        };
        if (!clear(x, z, rad)) continue;
        this.list.push(b);
        made++;
      }
    };
    if (S.granite) place(S.granite, 12, 24, 'granite', 0.45);
    if (S.reef) place(S.reef, 5, 12, 'quartz', terrain.profile?.sources ? 0 : 0.55);
    for (const b of this.list) {
      this.build(b);
      colliders.push({ x: b.x, z: b.z, r: b.r * 0.95 });
      if (split.has(b.id)) { b.split = true; b.t = 1; this.pose(b); this.showCrystals(b); }
    }
    this.raycaster = new THREE.Raycaster();
  }

  build(b) {
    const g = new THREE.Group();
    g.position.set(b.x, this.terrain.getHeight(b.x, b.z) + b.r * 0.55, b.z);
    g.rotation.y = b.yaw;
    const mat = boulderMaterial(b.kind);
    b.halves = [1, -1].map((side) => {
      // Each half tips outward over its outer bottom edge and rolls onto its
      // rounded back, so that's where it hinges.
      const pivot = new THREE.Object3D();
      pivot.position.set(side * b.r, -b.r * 0.62, 0);
      const mesh = new THREE.Mesh(halfGeometry(b, side), mat);
      mesh.position.set(-side * b.r, b.r * 0.62, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.boulder = b;
      pivot.add(mesh);
      g.add(pivot);
      return { side, pivot, mesh, crystals: [] };
    });
    if (b.vug) this.growCrystals(b);
    b.group = g;
    this.scene.add(g);
  }

  // Crystals rooted on the cavity walls of each half, pointing into the hollow.
  growCrystals(b) {
    const r = mulberry32(b.seed + 7);
    const mix = b.kind === 'quartz' ? QUARTZ_MIX : GRANITE_MIX;
    const V = b.vug;
    for (const h of b.halves) {
      const n = 5 + Math.floor(r() * 7);
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.75;
        const y = V.y + Math.cos(a) * d * V.rad, z = V.z + Math.sin(a) * d * V.rad;
        const x = h.side * V.depth * (1 - d * d) * 0.95;
        // Mostly straight out of the wall, leaning in toward the middle.
        let ax = -h.side, ay = (V.y - y) * 2 + (r() - 0.5) * 0.6, az = (V.z - z) * 2 + (r() - 0.5) * 0.6;
        const al = Math.hypot(ax, ay, az);
        ax /= al; ay /= al; az /= al;
        const id = 900000 + b.id * 100 + (h.side > 0 ? 0 : 50) + i;
        if (this.taken.has(id)) continue;
        const c = {
          id, variety: pickW(mix, r), grade: r() < 0.18 ? 'A' : r() < 0.6 ? 'B' : 'C',
          len: Math.min(V.depth * 1.5, 0.025 + Math.pow(r(), 1.6) * 0.07), damage: 0, broken: false,
          x: x + h.mesh.position.x, y: y + h.mesh.position.y, z, ax, ay, az,
        };
        const m = makeCrystalMesh(c);
        m.visible = false; // sealed in until it's split
        m.userData.crystal = c;
        m.userData.half = h;
        h.mesh.parent.add(m); // on the pivot, beside the half, so it moves with it
        h.crystals.push(m);
      }
    }
  }

  showCrystals(b) {
    for (const h of b.halves) for (const m of h.crystals) m.visible = true;
  }

  // Lay the halves open (t 0 closed .. 1 fully open).
  pose(b) {
    const k = b.split ? b.t : 0;
    const e = 1 - Math.pow(1 - k, 3);
    for (const h of b.halves) {
      h.pivot.rotation.z = -h.side * e * 1.3;
      h.pivot.position.y = -b.r * 0.62 - e * b.r * 0.1;
    }
  }

  // What the hammer's pointing at: a crystal in an opened vug, or a boulder.
  pick(origin, dir, far = 2.6) {
    this.raycaster.set(origin, dir);
    this.raycaster.far = far;
    const objs = [];
    for (const b of this.list) {
      if (Math.hypot(b.x - origin.x, b.z - origin.z) > far + b.r + 1) continue;
      for (const h of b.halves) {
        objs.push(h.mesh);
        for (const m of h.crystals) if (m.visible) objs.push(m);
      }
    }
    const hits = this.raycaster.intersectObjects(objs, false);
    const hit = hits[0];
    if (!hit) return null;
    // A crystal just behind the rock you're pointing at still counts: they're small.
    const cr = hits.find((h) => h.object.userData.crystal && h.distance < hit.distance + 0.04);
    if (cr) return { crystal: cr.object, boulder: null, point: cr.point };
    // Or one right beside where you're pointing on the cavity wall.
    const b = hit.object.userData.boulder;
    if (b?.split) {
      let best = null, bd = 0.09;
      const mid = new THREE.Vector3();
      for (const h of b.halves) for (const m of h.crystals) {
        const c = m.userData.crystal;
        mid.set(c.ax, c.ay, c.az).multiplyScalar(c.len * 0.5).add(m.position);
        m.parent.localToWorld(mid);
        const d = mid.distanceTo(hit.point);
        if (d < bd) { bd = d; best = m; }
      }
      if (best) return { crystal: best, boulder: null, point: hit.point };
    }
    return { boulder: hit.object.userData.boulder, point: hit.point };
  }

  // A tap with the hammer: 0 solid .. 1 right over the hollow.
  hollowness(b, point) {
    if (!b.vug || b.split) return 0;
    const local = b.group.worldToLocal(point.clone());
    const d = Math.hypot(local.x, local.y - b.vug.y, local.z - b.vug.z);
    return Math.max(0.1, Math.min(1, 1.25 - d / (b.r * 1.1)));
  }

  // Keep drilling and wedging. Returns 'drill', 'wedge', 'split' or null.
  work(b, dt) {
    if (b.split) return null;
    const before = b.progress;
    b.progress = Math.min(1, b.progress + dt / SPLIT_TIME);
    if (b.progress >= 1) {
      b.split = true;
      b.t = 0;
      if (b.vug) this.showCrystals(b);
      return 'split';
    }
    if (b.progress < DRILL_PART) return 'drill';
    // A tap on the wedges every so often; tell the caller when one lands.
    const step = (1 - DRILL_PART) / 7;
    const n = (p) => Math.floor((p - DRILL_PART) / step);
    return before < DRILL_PART || n(b.progress) !== n(before) ? 'wedge' : 'wedging';
  }

  take(mesh) {
    const c = mesh.userData.crystal, h = mesh.userData.half;
    h.crystals = h.crystals.filter((m) => m !== mesh);
    mesh.parent.remove(mesh);
    this.taken.add(c.id);
    return c;
  }

  update(dt, camPos) {
    const allow = gemsRealistic('world');
    for (const b of this.list) {
      if (b.split && b.t < 1) { b.t = Math.min(1, b.t + dt / 0.7); this.pose(b); }
      if (!b.split || !b.vug) continue;
      const near = Math.hypot(b.x - camPos.x, b.z - camPos.z) < 3;
      for (const h of b.halves) for (const m of h.crystals) crystalLOD(m, allow && near);
    }
  }

  snapshot() {
    return { split: this.list.filter((b) => b.split).map((b) => b.id), taken: [...this.taken] };
  }
}
