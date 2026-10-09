import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { goldMaterial, nuggetGeometry } from './materials.js';
import { signTexture } from './world.js';

// The old Lucky Strike: a gold mine the old-timers left on the reef. A
// timbered shaft goes down eight metres to a drive running in under the hill,
// where the quartz reef crosses it. Break ore from the reef to roast, crush and
// pan at camp; now and then there's a "show" of visible gold to pick out.
//
// Everything is built in the mine's own frame: origin at the bottom of the
// shaft, +z along the drive, y up.

const W = 1.6, WALL = 1.35, ARCH = 0.7;   // drive width, wall height, arch rise
const DEPTH = 8;                           // shaft depth
const HEADER = 2.45;                       // where the shaft's front wall starts, above the drive's mouth
const LEN = 22;                            // length of the drive
const STEP = 0.4;
const ORE_KG = 8;                          // one lump of ore, broken off the reef

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
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// The drive's cross-section: flat floor, straight walls, arched back.
const PROFILE = (() => {
  const p = [[-W / 2, 0], [-W / 6, 0], [W / 6, 0], [W / 2, 0], [W / 2, WALL / 2], [W / 2, WALL]];
  for (let i = 1; i < 6; i++) { const a = (i / 6) * Math.PI; p.push([(W / 2) * Math.cos(a), WALL + ARCH * Math.sin(a)]); }
  p.push([-W / 2, WALL], [-W / 2, WALL / 2]);
  return p;
})();

export class Mine {
  constructor(scene, terrain, seed, saved, colliders) {
    this.terrain = terrain;
    this.scene = scene;
    this.taken = new Set(saved?.taken || []);
    this.ok = this.place(seed, colliders);
    if (!this.ok) return;
    this.r = mulberry32(seed * 97 + 3);
    this.group = new THREE.Group();
    this.group.position.set(this.x, this.floor, this.z);
    this.group.rotation.y = Math.atan2(this.dir.x, this.dir.z);
    scene.add(this.group);
    this.group.updateMatrixWorld();
    // The reef: a slab of quartz cutting across the drive near its end.
    this.reef = { p: new THREE.Vector3(0, 1, LEN - 4), n: new THREE.Vector3(0.55, 0.2, 0.81).normalize(), half: 0.45 };
    this.buildDrive();
    this.buildShaft();
    this.buildTimber();
    this.buildShows();
    this.buildCollar(colliders);
    this.raycaster = new THREE.Raycaster();
    this.inside = false;
    this.climb = null;
    this.dripIn = 3;
  }

  // Somewhere just downhill of the reef outcrop, driving in toward it, with
  // plenty of rock over the drive the whole way.
  place(seed, colliders) {
    const T = this.terrain, S = T.sources.reef;
    if (!S) return false;
    const r = mulberry32(seed * 83 + 5);
    for (let k = 0; k < 160; k++) {
      const a = r() * Math.PI * 2, d = 7 + r() * 12;
      const x = S.x + Math.cos(a) * d, z = S.z + Math.sin(a) * d;
      if (Math.abs(x) > 100 || Math.abs(z) > 100) continue;
      if (T.creek.local(x, z, {}).d < 9) continue;
      if (colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 2.6)) continue;
      const h = T.getHeight(x, z);
      if (Math.abs(T.getHeight(x + 1.2, z) - T.getHeight(x - 1.2, z)) > 0.6 || Math.abs(T.getHeight(x, z + 1.2) - T.getHeight(x, z - 1.2)) > 0.6) continue;
      let dx = S.x - x, dz = S.z - z;
      const dl = Math.hypot(dx, dz);
      dx /= dl; dz /= dl;
      const floor = h - DEPTH;
      let cover = true;
      for (let s = 1.5; s <= LEN + 0.5; s += 1) {
        if (T.getHeight(x + dx * s, z + dz * s) - (floor + WALL + ARCH) < 3) { cover = false; break; }
      }
      if (!cover) continue;
      Object.assign(this, { x, z, collarY: h, floor, dir: { x: dx, z: dz } });
      return true;
    }
    return false;
  }

  toWorld(v) { return v.clone().applyMatrix4(this.group.matrixWorld); }
  toLocal(v) { return this.group.worldToLocal(v.clone()); }

  inReef(p) {
    return Math.abs(p.clone().sub(this.reef.p).dot(this.reef.n)) < this.reef.half;
  }

  buildDrive() {
    const pos = [], col = [], idx = [];
    const rock = new THREE.Color(0x5a5048), rock2 = new THREE.Color(0x6e6258), quartz = new THREE.Color(0xe6e0d4), iron = new THREE.Color(0x8a5a32);
    const c = new THREE.Color(), v = new THREE.Vector3();
    const rings = [];
    for (let s = -W / 2; s <= LEN + 1e-6; s += STEP) rings.push(s);
    const M = PROFILE.length;
    const vert = (x, y, z) => {
      // Rough rock: push in and out along the section, smooth near the shaft.
      const fade = sstep(1.2, 2.4, z) * (y > 0.02 ? 1 : 0.25);
      const ox = x, oy = y - 0.9;
      const ol = Math.hypot(ox, oy) || 1;
      const n = (noise3(x * 1.7, y * 1.7, z * 1.7, 5) - 0.5) * 0.28 + (noise3(x * 5, y * 5, z * 5, 9) - 0.5) * 0.06;
      v.set(x + (ox / ol) * n * fade, Math.max(0, y + (oy / ol) * n * fade), z);
      const tone = noise3(v.x * 3, v.y * 3, v.z * 3, 2);
      c.copy(rock).lerp(rock2, tone);
      if (this.inReef(v)) c.copy(quartz).multiplyScalar(0.8 + tone * 0.3);
      else if (Math.abs(v.clone().sub(this.reef.p).dot(this.reef.n)) < this.reef.half + 0.25) c.copy(iron).lerp(rock, 0.4); // iron-stained selvage
      pos.push(v.x, v.y, v.z);
      col.push(c.r, c.g, c.b);
      return pos.length / 3 - 1;
    };
    const grid = rings.map((s) => PROFILE.map(([x, y]) => vert(x, y, s)));
    for (let i = 0; i < rings.length - 1; i++) {
      for (let j = 0; j < M; j++) {
        const a = grid[i][j], b = grid[i][(j + 1) % M], cc = grid[i + 1][(j + 1) % M], d = grid[i + 1][j];
        // Leave the back open under the shaft.
        const roof = PROFILE[j][1] > WALL - 0.01 && PROFILE[(j + 1) % M][1] > WALL - 0.01;
        if (roof && rings[i + 1] <= W / 2 + 1e-6) continue;
        idx.push(a, b, cc, a, cc, d);
      }
    }
    // The face at the end, where they stopped: a rough fan.
    const endC = vert(0, 0.9, LEN);
    const last = grid[grid.length - 1];
    for (let j = 0; j < M; j++) idx.push(last[j], last[(j + 1) % M], endC);
    // The back wall under the shaft (up to where the shaft walls start).
    const s0 = -W / 2;
    const b0 = vert(-W / 2, 0, s0), b1 = vert(W / 2, 0, s0), b2 = vert(W / 2, WALL, s0), b3 = vert(-W / 2, WALL, s0);
    idx.push(b0, b2, b1, b0, b3, b2);
    let g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    this.driveGeo = g;
    this.driveMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide, envMapIntensity: 0 });
    this.drive = new THREE.Mesh(g, this.driveMat);
    this.drive.receiveShadow = true;
    this.group.add(this.drive);
  }

  buildShaft() {
    // Four rock walls from the top of the drive's walls up to the surface.
    const g = new THREE.BoxGeometry(W, DEPTH - WALL + 0.5, W, 4, 16, 4);
    g.deleteAttribute('uv');
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = (noise3(x * 2, y * 2, z * 2, 11) - 0.5) * 0.12;
      p.setXYZ(i, x * (1 + n), y, z * (1 + n));
    }
    g.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0x5f554c, roughness: 0.95, side: THREE.BackSide, envMapIntensity: 0 });
    const m = new THREE.Mesh(g, mat);
    m.position.set(0, WALL + (DEPTH - WALL + 0.5) / 2 - 0.25, 0);
    // No top or bottom faces: the box's caps would block the shaft.
    // ...and no front wall where the drive opens off the bottom of the shaft.
    const index = g.index.array.slice();
    const keep = [];
    const half = (DEPTH - WALL + 0.5) / 2;
    for (let t = 0; t < index.length; t += 3) {
      const tri = [index[t], index[t + 1], index[t + 2]];
      const ys = tri.map((k) => p.getY(k));
      if (ys.every((y) => Math.abs(Math.abs(y) - half) < 1e-4)) continue;
      if (tri.every((k) => p.getZ(k) > W / 2 * 0.8 && p.getY(k) + m.position.y < HEADER + 0.01)) continue;
      keep.push(...tri);
    }
    g.setIndex(keep);
    this.group.add(m);
    this.shaftMesh = m;
    // A rock header over the mouth of the drive, from its arch up to where the shaft wall resumes.
    const shape = new THREE.Shape();
    shape.moveTo(W / 2, WALL);
    for (let i = 1; i < 6; i++) { const a = (i / 6) * Math.PI; shape.lineTo((W / 2) * Math.cos(a), WALL + ARCH * Math.sin(a)); }
    shape.lineTo(-W / 2, WALL);
    shape.lineTo(-W / 2 - 0.05, HEADER + 0.05);
    shape.lineTo(W / 2 + 0.05, HEADER + 0.05);
    shape.closePath();
    const header = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: 0x5f554c, roughness: 0.95, side: THREE.DoubleSide, envMapIntensity: 0 }));
    header.position.z = W / 2;
    this.group.add(header);
    // Ladder on the back wall.
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.85, envMapIntensity: 0.2 });
    const rail = new THREE.BoxGeometry(0.06, DEPTH + 1.1, 0.06);
    for (const x of [-0.24, 0.24]) {
      const r = new THREE.Mesh(rail, wood);
      r.position.set(x, (DEPTH + 1.1) / 2, -W / 2 + 0.12);
      this.group.add(r);
    }
    const rung = new THREE.BoxGeometry(0.5, 0.04, 0.05);
    for (let y = 0.3; y < DEPTH + 1; y += 0.3) {
      const r = new THREE.Mesh(rung, wood);
      r.position.set(0, y, -W / 2 + 0.12);
      this.group.add(r);
    }
    // Timber cribbing round the shaft every metre and a bit.
    for (let y = HEADER + 0.4; y < DEPTH; y += 1.3) {
      for (const [w, d, x, z] of [[W, 0.12, 0, -W / 2 + 0.05], [W, 0.12, 0, W / 2 - 0.05], [0.12, W, -W / 2 + 0.05, 0], [0.12, W, W / 2 - 0.05, 0]]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), wood);
        b.position.set(x, y, z);
        this.group.add(b);
      }
    }
  }

  buildTimber() {
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.9, envMapIntensity: 0.1 });
    const r = this.r;
    for (let s = 1.6; s < LEN - 1; s += 1.8) {
      const tilt = (r() - 0.5) * 0.05;
      for (const x of [-0.68, 0.68]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, WALL + 0.45, 0.14), wood);
        leg.position.set(x, (WALL + 0.45) / 2, s);
        leg.rotation.z = tilt - Math.sign(x) * 0.04;
        leg.castShadow = true;
        this.group.add(leg);
      }
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 0.18), wood);
      cap.position.set(0, WALL + 0.48, s);
      cap.rotation.z = tilt + (r() < 0.15 ? 0.06 : 0); // the odd one's sagging
      cap.castShadow = true;
      this.group.add(cap);
    }
    // Rails and sleepers along the floor, and an old ore truck at the end.
    const iron = new THREE.MeshStandardMaterial({ color: 0x5a3a28, roughness: 0.6, metalness: 0.5 });
    for (const x of [-0.3, 0.3]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, LEN - 1), iron);
      rail.position.set(x, 0.06, LEN / 2);
      this.group.add(rail);
    }
    for (let s = 0.8; s < LEN; s += 0.6) {
      const sl = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.05, 0.12), wood);
      sl.position.set(0, 0.025, s);
      this.group.add(sl);
    }
    const truck = new THREE.Group();
    const tub = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.9), iron);
    tub.position.y = 0.42;
    truck.add(tub);
    for (const x of [-0.3, 0.3]) for (const z of [-0.3, 0.3]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12), iron);
      wh.rotation.z = Math.PI / 2;
      wh.position.set(x, 0.14, z);
      truck.add(wh);
    }
    truck.position.set(0, 0, LEN - 6.5);
    this.group.add(truck);
    this.truckS = LEN - 6.5;
    // A candle stub on a spike in a timber, and initials carved by someone long gone.
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.14), new THREE.MeshStandardMaterial({ map: signTexture('J.McK 1896', '#2a1a10', '#4a3524', 52), roughness: 0.9 }));
    sign.position.set(-0.6, 1.2, 1.6 + 1.8 * 3 + 0.08);
    this.group.add(sign);
  }

  // Visible gold in the reef where it crosses the walls, and spots of scheelite.
  buildShows() {
    const r = this.r;
    const p = this.driveGeo.attributes.position, n = this.driveGeo.attributes.normal;
    const cands = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (v.y < 0.35 || v.y > 1.9 || v.z < 3 || !this.inReef(v)) continue;
      cands.push(i);
    }
    this.shows = [];
    this.scheelite = [];
    // Down here there's nothing for metal to reflect, so the gold gets a warm glint of its own.
    const gold = goldMaterial('crystalline', { emissive: 0x7a5200 });
    const hitGeo = new THREE.SphereGeometry(0.1, 8, 6);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const pick = () => cands.splice(Math.floor(r() * cands.length), 1)[0];
    for (let k = 0; k < 10 && cands.length; k++) {
      const i = pick();
      const id = 700000 + k;
      const at = new THREE.Vector3().fromBufferAttribute(p, i);
      const nor = new THREE.Vector3().fromBufferAttribute(n, i);
      // The wall's normal points outward from the drive; the gold sits on the inside.
      if (nor.dot(new THREE.Vector3(-at.x, 0.9 - at.y, 0)) < 0) nor.negate();
      const grams = Math.round((0.3 + Math.pow(r(), 3) * 14) * 100) / 100;
      const show = { id, at, nor, grams, seed: Math.floor(r() * 1e6) };
      if (this.taken.has(id)) continue;
      const g = new THREE.Group();
      const flecks = 4 + Math.floor(Math.cbrt(grams) * 4);
      for (let f = 0; f < flecks; f++) {
        const m = new THREE.Mesh(nuggetGeometry(show.seed + f, { detail: 1, style: 'crystalline' }), gold);
        const s = 0.004 + r() * 0.006 + Math.cbrt(grams) * 0.002;
        m.scale.set(s, s * 0.5, s);
        m.position.set((r() - 0.5) * 0.08, (r() - 0.5) * 0.08, (r() - 0.5) * 0.08);
        g.add(m);
      }
      g.position.copy(at).addScaledVector(nor, 0.01);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nor);
      g.scale.set(1, 0.3, 1); // flattened onto the wall
      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.position.copy(at);
      hit.userData.show = show;
      show.mesh = g;
      show.hit = hit;
      this.group.add(g, hit);
      this.shows.push(show);
    }
    const sch = new THREE.MeshStandardMaterial({ color: 0xcbb98e, roughness: 0.6, emissive: 0x000000 });
    for (let k = 0; k < 7 && cands.length; k++) {
      const i = pick();
      const id = 710000 + k;
      if (this.taken.has(id)) continue;
      const at = new THREE.Vector3().fromBufferAttribute(p, i);
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), sch.clone());
      m.position.copy(at);
      m.scale.set(1, 0.6, 1);
      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.position.copy(at);
      const spot = { id, at, mesh: m, hit, scheelite: true };
      hit.userData.show = spot;
      this.group.add(m, hit);
      this.scheelite.push(spot);
    }
  }

  // Up top: the collar, a timber headframe with its wheel, and a sign.
  buildCollar(colliders) {
    const T = this.terrain;
    // Hide the ground over the shaft, and lay a ring of trodden mullock over the edges.
    const b = T.snapBlock(this.x, this.z, 5);
    this.overlay = {
      x0: b.x0, x1: b.x0 + b.size, z0: b.z0, z1: b.z0 + b.size,
      heightAt: (x, z) => T.gridHeight(x, z),
      mine: true,
    };
    T.tuckUnder(this.overlay);
    const top = DEPTH;
    // The apron: from the square shaft out to a round edge past the hidden
    // cells, following the ground: trodden mullock near the shaft fading into
    // the ground's own colour at the rim, so it doesn't show a seam.
    const outer = 2.5, inner = W / 2;
    const ring = new THREE.BufferGeometry();
    const P = [], C = [], UV = [], I = [];
    const N = 12;
    const sq = (t, rad) => {
      // A point on a square of half-size rad, going round as t goes 0..1.
      const a = t * 4, side = Math.floor(a) % 4, f = a - Math.floor(a);
      const e = -rad + f * 2 * rad;
      return [[e, -rad], [rad, e], [-e, rad], [-rad, -e]][side];
    };
    const v = new THREE.Vector3();
    const mullock = new THREE.Color(0x8a7058);
    for (let i = 0; i <= N * 4; i++) {
      const [sx, sz] = sq(i / (N * 4), inner);
      const ang = Math.atan2(sz, sx);
      for (const rad of [inner, 1.3, outer]) {
        const [x, z] = rad === inner ? [sx, sz] : [Math.cos(ang) * rad, Math.sin(ang) * rad];
        v.set(x, 0, z).applyMatrix4(this.group.matrixWorld);
        const gy = T.gridHeight(v.x, v.z) - this.floor;
        P.push(x, rad === inner ? Math.max(gy, top) - 0.05 : gy + (rad === outer ? 0.01 : 0.1), z);
        const [r0, g0, b0] = T.colorAt(v.x, v.z);
        const k = rad === outer ? 0 : rad === inner ? 1 : 0.6;
        C.push(r0 + (mullock.r - r0) * k, g0 + (mullock.g - g0) * k, b0 + (mullock.b - b0) * k);
        UV.push((v.x + 150) * 0.35, (v.z + 150) * 0.35); // same mapping as the terrain's detail texture
      }
    }
    ring.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    ring.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    for (let i = 0; i < N * 4; i++) {
      for (let k = 0; k < 2; k++) {
        const a = i * 3 + k, b2 = a + 1, c = a + 3, d = a + 4;
        I.push(a, c, b2, b2, c, d);
      }
    }
    ring.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    ring.setIndex(I);
    ring.computeVertexNormals();
    const apron = new THREE.Mesh(ring, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide, map: T.material?.map || null }));
    apron.receiveShadow = true;
    this.group.add(apron);
    // Collar timbers.
    const wood = new THREE.MeshStandardMaterial({ color: 0x6a4c30, roughness: 0.85 });
    for (const [w, d, x, z] of [[W + 0.5, 0.25, 0, -W / 2 - 0.1], [W + 0.5, 0.25, 0, W / 2 + 0.1], [0.25, W + 0.5, -W / 2 - 0.1, 0], [0.25, W + 0.5, W / 2 + 0.1, 0]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), wood);
      m.position.set(x, top + 0.1, z);
      m.castShadow = true;
      this.group.add(m);
    }
    // The headframe: two A-frames and a sheave wheel over the shaft.
    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 4.3, 0.16), wood);
        leg.position.set(x * 0.75, top + 2, z * 0.6);
        leg.rotation.set(-z * 0.15, 0, -x * 0.13);
        leg.castShadow = true;
        this.group.add(leg);
      }
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.18), wood);
    beam.position.set(0, top + 4.05, 0);
    this.group.add(beam);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 6, 20), new THREE.MeshStandardMaterial({ color: 0x4a3a30, roughness: 0.5, metalness: 0.6 }));
    wheel.position.set(0, top + 4.4, 0);
    this.group.add(wheel);
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.48), new THREE.MeshStandardMaterial({ map: signTexture('LUCKY STRIKE G.M.', '#5a2a10', '#e2d2b0', 48, 'Est. 1894 · Ladder in the shaft'), roughness: 0.9, side: THREE.DoubleSide }));
    signMesh.position.set(1.7, top + 1.1, 1.2);
    signMesh.rotation.y = Math.PI / 4;
    this.group.add(signMesh);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), wood);
    post.position.set(1.7, top + 0.5, 1.2);
    this.group.add(post);
    colliders.push({ x: this.x, z: this.z, r: 1.25 });
  }

  // ---------- being down there ----------

  // Standing at the collar, close enough to climb in?
  nearCollar(pos) {
    return this.ok && !this.inside && Math.hypot(pos.x - this.x, pos.z - this.z) < 2.3;
  }

  nearLadder(pos) {
    if (!this.inside) return false;
    const l = this.toLocal(pos);
    return l.z < 0.6;
  }

  // Keep your feet in the drive.
  clamp(pos) {
    const l = this.toLocal(pos);
    l.x = Math.max(-W / 2 + 0.38, Math.min(W / 2 - 0.38, l.x));
    l.z = Math.max(-W / 2 + 0.35, Math.min(LEN - 0.35, l.z));
    // Don't walk through the ore truck.
    if (Math.abs(l.z - this.truckS) < 0.75) l.z = l.z < this.truckS ? Math.min(l.z, this.truckS - 0.75) : Math.max(l.z, this.truckS + 0.75);
    l.y = 0;
    return this.toWorld(l);
  }

  // How far underground the camera is: 0 at the surface .. 1 down in the drive.
  under(camPos) {
    if (!this.ok || (!this.inside && !this.climb)) return 0;
    const l = this.toLocal(camPos);
    return sstep(DEPTH + 0.5, DEPTH - 3.5, l.y);
  }

  // Climbing in or out: where your eyes are on the ladder.
  ladderPose(t, down) {
    const k = down ? t : 1 - t;
    const y = (DEPTH + 1.65) * (1 - k) + 1.65 * k;
    return this.toWorld(new THREE.Vector3(0, y, -W / 2 + 0.55));
  }

  // The yaw that faces along the drive (or back at the ladder).
  driveYaw(back = false) {
    return Math.atan2(-this.dir.x, -this.dir.z) + (back ? Math.PI : 0);
  }

  // Where you come out at the top.
  exitSpot() {
    return this.toWorld(new THREE.Vector3(0, DEPTH, -2.2));
  }

  // What the hammer's on: a gold show, scheelite, the reef (ore), or bare rock.
  pick(origin, dir) {
    this.raycaster.set(origin, dir);
    this.raycaster.far = 2.2;
    const objs = [this.drive, ...this.shows.map((s) => s.hit), ...this.scheelite.map((s) => s.hit)];
    const hits = this.raycaster.intersectObjects(objs, false);
    if (!hits.length) return null;
    const wall = hits.find((h) => h.object === this.drive);
    const sh = hits.find((h) => h.object.userData.show && (!wall || h.distance < wall.distance + 0.12));
    if (sh) return { show: sh.object.userData.show };
    if (!wall) return null;
    const l = this.toLocal(wall.point);
    return { reef: this.inReef(l), point: wall.point, local: l };
  }

  // A lump of reef: richer close to a show of visible gold.
  breakOre(local) {
    let near = 0;
    for (const s of this.shows) near = Math.max(near, 1 - s.at.distanceTo(local) / 1.5);
    const gpt = (2.5 + Math.random() * 7 + Math.max(0, near) * 22) * (Math.random() < 0.08 ? 3 : 1);
    return { kg: ORE_KG, gold: Math.round(ORE_KG * gpt) / 1000, roasted: false };
  }

  takeShow(show) {
    this.group.remove(show.mesh, show.hit);
    this.shows = this.shows.filter((s) => s !== show);
    this.scheelite = this.scheelite.filter((s) => s !== show);
    this.taken.add(show.id);
  }

  // Scheelite glows under the UV torch; drips echo down the drive.
  update(dt, { uvOn, uvOrigin, uvDir, sound }) {
    if (!this.ok) return;
    for (const s of this.scheelite) {
      const w = this.toWorld(s.at);
      const to = w.sub(uvOrigin);
      const d = to.length();
      const k = uvOn && d < 4 ? Math.max(0, to.normalize().dot(uvDir) - 0.85) / 0.15 * (1 - d / 4) : 0;
      s.mesh.material.emissive.setRGB(0.55 * k, 0.75 * k, 1.0 * k);
      s.mesh.material.emissiveIntensity = 1 + k * 3;
    }
    if (this.inside) {
      this.dripIn -= dt;
      if (this.dripIn <= 0) { this.dripIn = 1.5 + Math.random() * 5; sound.drip?.(); }
    }
  }

  // Detector underground: how close the nearest show is to a point.
  signalAt(pos) {
    const l = this.toLocal(pos);
    let best = 0;
    for (const s of this.shows) best = Math.max(best, 1 - s.at.distanceTo(l) / (0.9 + Math.cbrt(s.grams) * 0.2));
    return Math.max(0, best);
  }

  snapshot() { return { taken: [...this.taken] }; }
}
