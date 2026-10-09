import * as THREE from 'three';
import { lumpy } from './world.js';
import { mulberry32 } from './noise.js';

// Bedload: the cobbles and small boulders a flood rolls along the bed.
//
// A stone moves when the flow drags on the bed harder than the stone's weight
// can hold it (the Shields criterion):
//     bed shear stress     tau  = rho * g * h * S      (depth-slope product)
//     critical stress      tauC = 0.045 * (rhoS - rho) * g * D
// so the biggest stone a flood can shift is D = tau / (0.045 * (rhoS - rho) * g).
// At flood stage the step between pools and riffles drowns out and the water
// slope evens out, so the deep pools and the outsides of bends scour while the
// shallow riffles, the point bars and the slack water behind big boulders are
// where moving stones stop. Once one stops against a bigger stone it's wedged
// and takes more to move again. Stones that roll into new spots make new slack
// water behind them, so after a flood the traps (and where the heavies drop)
// have shifted.
//
// The big boulders (over a metre) are lag: no flood this creek gets moves them.

const RHO = 1000, RHO_S = 2650, G = 9.81, THETA_C = 0.045;
export const shieldsD = (tau) => tau / (THETA_C * (RHO_S - RHO) * G);

export class Bedload {
  constructor(scene, terrain, seed) {
    this.terrain = terrain;
    this.creek = terrain.creek;
    const C = this.creek;
    const r = mulberry32(seed * 53 + 11);
    this.stones = [];
    for (let z = 130; z > -130; z -= 2.2 + r() * 3.5) {
      const w = C.halfWidth(z), d = C.dcx(z);
      const n = (r() * 2 - 1) * 0.95 * w;
      const x = C.cx(z) + n * Math.sqrt(1 + d * d);
      const s = {
        x, z, r: 0.06 + Math.pow(r(), 1.7) * 0.2,
        sx: 0.8 + r() * 0.4, sy: 0.55 + r() * 0.35, rx: r() * 3, ry: r() * 3, roll: 0, ax: 1, az: 0,
        tint: 0.36 + r() * 0.16, warm: r() * 0.05,
      };
      if (terrain.inside(x, z)) this.stones.push(s);
    }
    const geo = lumpy(new THREE.DodecahedronGeometry(1, 1), 0.22, r);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), this.stones.length);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    const col = new THREE.Color();
    this.stones.forEach((s, i) => this.mesh.setColorAt(i, col.setRGB(s.tint + s.warm, s.tint, s.tint - 0.03, THREE.SRGBColorSpace)));
    scene.add(this.mesh);
    this.active = false;
    this.lastFlood = null;
    this.tmp = {};
    this.tmpL = {};
    this.knock = 0;
    this.draw();
  }

  // They join the creek's boulders, so their slack water counts. (Done after
  // the claim is laid out, so where the nuggets were put doesn't change.)
  joinCreek() {
    for (const s of this.stones) this.creek.boulders.push(s);
  }

  draw() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const roll = new THREE.Quaternion();
    this.stones.forEach((s, i) => {
      const R = s.r * 1.15;
      q.setFromEuler(e.set(s.rx, s.ry, 0));
      roll.setFromAxisAngle(v.set(s.az, 0, -s.ax), s.roll);
      q.premultiply(roll);
      m.compose(v.set(s.x, this.terrain.getHeight(s.x, s.z) - R * s.sy * 0.25, s.z), q, sc.set(R * s.sx, R * s.sy, R));
      this.mesh.setMatrixAt(i, m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  // The flood's grip on the bed at a point, and the stone that it can just move there.
  stress(x, z) {
    const C = this.creek, lv = C.level;
    const h = C.surfaceY(z) - this.terrain.getHeight(x, z);
    if (h <= 0) return { tau: 0, h };
    const S = THREE.MathUtils.lerp(C.slope(z), C.G, Math.min(1, lv / 0.8));
    const v = C.velocity(x, z, this.tmp);
    const mean = C.baseSpeed(z) * (1 + 1.6 * lv) * 0.75 || 1;
    const local = Math.min(1.6, v.speed / mean); // slack behind boulders and over bars, faster in the thalweg
    return { tau: RHO * G * h * S * local * local, h, v };
  }

  update(dt, listener, sound) {
    const lv = this.creek.level;
    if (lv < 0.15) {
      if (this.active) this.finish();
      return;
    }
    if (!this.active) { this.active = true; this.moves = new Map(); }
    let moved = false;
    for (const s of this.stones) {
      const D = 2 * s.r;
      // The drag comes from the water arriving at the stone, not the slack behind it.
      const L = this.creek.local(s.x, s.z, this.tmpL);
      const st = this.stress(s.x - L.tx * s.r * 1.8, s.z - L.tz * s.r * 1.8);
      if (st.h < D * 0.6) { s.moving = false; continue; } // not covered: stranded on the bar
      const tauC = THETA_C * (RHO_S - RHO) * G * D * (s.wedged ? 1.35 : 1);
      const ratio = st.tau / tauC;
      // Once rolling a stone keeps going until the drag falls off a bit below what started it.
      if (ratio < (s.moving ? 0.85 : 1)) { s.moving = false; continue; }
      const v = st.v;
      if (!v || v.speed < 1e-3) continue;
      const speed = Math.min(1.4, 0.35 * Math.pow(ratio - 0.8, 1.2) + 0.08);
      // Helical flow in a bend: near the bed the water spirals toward the inside
      // (the bed shear turns inward by about atan(11 h / R)), which sweeps
      // bedload onto the point bar. That's how point bars are built.
      const k = this.creek.curvature(s.z);
      const turn = Math.atan(Math.min(0.75, 11 * st.h * Math.abs(k)));
      const sign = k >= 0 ? 1 : -1;
      const ix = -L.tz * sign, iz = L.tx * sign; // toward the inside of the bend
      let dx = (v.x / v.speed) * Math.cos(turn) + ix * Math.sin(turn);
      let dz = (v.z / v.speed) * Math.cos(turn) + iz * Math.sin(turn);
      const dl = Math.hypot(dx, dz) || 1;
      dx /= dl; dz /= dl;
      const nx = s.x + dx * speed * dt, nz = s.z + dz * speed * dt;
      // Fetch up against a stone at least as big: it stops on that stone's upstream face, wedged.
      let blocked = false;
      for (const o of this.creek.boulders) {
        if (o === s || o.r < s.r * 0.8 || Math.abs(o.z - nz) > 2) continue;
        if (Math.hypot(o.x - nx, o.z - nz) < (o.r + s.r) * 0.95) { blocked = true; break; }
      }
      if (blocked || !this.terrain.inside(nx, nz)) { s.moving = false; s.wedged = true; continue; }
      if (!this.moves.has(s)) this.moves.set(s, { x0: s.x, z0: s.z });
      s.x = nx; s.z = nz;
      s.moving = true;
      s.wedged = false;
      s.roll += (speed * dt) / s.r;
      s.ax = dx; s.az = dz;
      moved = true;
      // Underwater knocking: you can hear a flood moving the bed.
      if (listener && sound) {
        const d = Math.hypot(listener.x - s.x, listener.z - s.z);
        this.knock -= dt;
        if (d < 18 && this.knock <= 0 && Math.random() < 0.15) {
          this.knock = 0.08 + Math.random() * 0.25;
          sound.burst?.({ freq: 180 + Math.random() * 160, dur: 0.07, gain: 0.25 * (1 - d / 18) * Math.min(1, s.r * 6) });
        }
      }
    }
    if (moved) this.draw();
  }

  finish() {
    this.active = false;
    const list = [];
    for (const [s, m] of this.moves) {
      const dist = Math.hypot(s.x - m.x0, s.z - m.z0);
      if (dist > 0.3) list.push({ x0: m.x0, z0: m.z0, x1: s.x, z1: s.z, r: s.r });
    }
    this.lastFlood = list.length ? list : null;
    this.onSettled?.(list);
  }

  snapshot() {
    return {
      pos: this.stones.map((s) => [Math.round(s.x * 100) / 100, Math.round(s.z * 100) / 100, s.wedged ? 1 : 0]),
      last: this.lastFlood,
    };
  }

  restore(saved) {
    if (!saved?.pos || saved.pos.length !== this.stones.length) return;
    saved.pos.forEach(([x, z, w], i) => { const s = this.stones[i]; s.x = x; s.z = z; s.wedged = !!w; });
    this.lastFlood = saved.last || null;
    this.draw();
  }
}
