import * as THREE from 'three';
import { GEM_ORDER } from './minerals.js';

// A sluice box set in the creek. Water runs through it, you shovel wash in at
// the head, heavies drop behind the riffles and the rest is flushed out the
// tail. Real rules:
//  - It needs the right current: too slow and the riffles pack with sand,
//    too fast and the gold is scoured back out. Around 0.6-1.3 m/s is good.
//  - It needs enough water to run through it, but not so much it's drowned.
//  - The riffles fill up. Clean up regularly and pan the concentrates.
//  - Big stones (agates) go straight over the riffles and out the tail unless
//    you classify the wash first and check the oversize.

// A highbanker is a sluice up on the bank with its own water: a petrol pump
// draws from the creek and sprays it through a hopper with a grizzly (bar
// screen) on top. You shovel wash straight into the hopper. It doesn't need a
// good run of current, just to be within reach of the water, and the longer
// riffle tray holds more before it needs cleaning up.

const CAPACITY = { sluice: 14, highbanker: 24 }; // loads before the riffles are packed
export const PUMP_REACH = 9;  // m of intake hose to the water
export const PUMP_LIFT = 3.2; // m the pump will lift water up the bank
export const FUEL_PER_LOAD = 0.1; // litres

export function sluiceEfficiency(speed, depth) {
  if (depth < 0.08) return { eff: 0.05, ok: 'bad', why: 'not enough water to run through it' };
  if (depth > 0.6) return { eff: 0.2, ok: 'bad', why: 'too deep, the box is drowned' };
  const eff = 0.12 + 0.76 * Math.exp(-(((speed - 0.9) / 0.35) ** 2));
  if (speed < 0.45) return { eff, ok: 'bad', why: 'too slow, the riffles will pack with sand' };
  if (speed > 1.45) return { eff, ok: 'bad', why: 'too fast, it will scour the gold out' };
  if (speed < 0.6) return { eff, ok: 'fair', why: 'a bit slow' };
  if (speed > 1.25) return { eff, ok: 'fair', why: 'a bit fast' };
  return { eff, ok: 'good', why: 'good flow' };
}

// Trough along local z: head (upstream) at -z, tail at +z.
export function makeSluiceModel(scale = 1) {
  const g = new THREE.Group();
  const alu = new THREE.MeshStandardMaterial({ color: 0xa9adb0, metalness: 0.7, roughness: 0.4 });
  const mat = new THREE.MeshStandardMaterial({ color: 0x2d4a32, roughness: 0.95 });
  const add = (geo, m, x, y, z) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    o.userData.static = true; // the trough itself; a Blender model can replace these
    g.add(o);
    return o;
  };
  add(new THREE.BoxGeometry(0.34, 0.02, 1.6), alu, 0, 0, 0);
  add(new THREE.BoxGeometry(0.02, 0.15, 1.6), alu, -0.17, 0.075, 0);
  add(new THREE.BoxGeometry(0.02, 0.15, 1.6), alu, 0.17, 0.075, 0);
  // Flared head to catch the water.
  const flareL = add(new THREE.BoxGeometry(0.02, 0.15, 0.35), alu, -0.25, 0.075, -0.92);
  flareL.rotation.y = -0.5;
  const flareR = add(new THREE.BoxGeometry(0.02, 0.15, 0.35), alu, 0.25, 0.075, -0.92);
  flareR.rotation.y = 0.5;
  add(new THREE.BoxGeometry(0.3, 0.012, 1.35), mat, 0, 0.016, 0.08);
  const riffles = [], cons = [];
  const consMat = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 1 });
  for (let i = 0; i < 9; i++) {
    const z = -0.52 + i * 0.15;
    const r = add(new THREE.BoxGeometry(0.3, 0.035, 0.014), alu, 0, 0.035, z);
    r.rotation.x = -0.45;
    riffles.push(r);
    // Black sand and gravel building up in the lee of each riffle.
    const c = add(new THREE.BoxGeometry(0.28, 0.03, 0.09), consMat, 0, 0.022, z + 0.055);
    c.userData.static = false;
    c.scale.y = 0.01;
    cons.push(c);
  }
  g.userData.cons = cons;
  g.scale.setScalar(scale);
  return g;
}

// The highbanker in the same frame as the sluice (head at -z): the riffle tray
// up on legs, a hopper with grizzly bars over the head, and the spray bar.
export function makeHighbankerModel() {
  const g = new THREE.Group();
  const alu = new THREE.MeshStandardMaterial({ color: 0xa9adb0, metalness: 0.7, roughness: 0.4 });
  const add = (geo, m, x, y, z, parent = g) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  // The tray: a sluice, a touch longer, tilted toward the tail.
  const tray = makeSluiceModel();
  tray.scale.set(1.1, 1, 1.15);
  tray.position.set(0, 0.62, 0.15);
  tray.rotation.x = 0.1;
  g.add(tray);
  g.userData.cons = tray.userData.cons;
  g.userData.tray = tray;
  // Legs: tall at the head, short at the tail.
  for (const [x, z, h] of [[-0.2, -0.75, 0.9], [0.2, -0.75, 0.9], [-0.2, 0.95, 0.5], [0.2, 0.95, 0.5]]) {
    add(new THREE.BoxGeometry(0.035, h, 0.035), alu, x, h / 2, z);
  }
  // Hopper box over the head, open at the bottom into the tray.
  const hz = -0.95, hy = 1.0;
  add(new THREE.BoxGeometry(0.6, 0.3, 0.02), alu, 0, hy, hz - 0.25);
  add(new THREE.BoxGeometry(0.6, 0.3, 0.02), alu, 0, hy, hz + 0.25);
  add(new THREE.BoxGeometry(0.02, 0.3, 0.5), alu, -0.3, hy, hz);
  add(new THREE.BoxGeometry(0.02, 0.3, 0.5), alu, 0.3, hy, hz);
  // Grizzly bars across the top: anything bigger than the gaps rolls off.
  for (let i = 0; i < 7; i++) add(new THREE.CylinderGeometry(0.008, 0.008, 0.58, 6).rotateZ(Math.PI / 2), alu, 0, hy + 0.16, hz - 0.21 + i * 0.07);
  // Spray bar along the back of the hopper.
  const blue = new THREE.MeshStandardMaterial({ color: 0x2a5a9a, roughness: 0.5 });
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.56, 10).rotateZ(Math.PI / 2), blue, 0, hy + 0.2, hz - 0.27);
  return g;
}

// A little petrol pump that sits at the water's edge.
export function makePumpModel() {
  const g = new THREE.Group();
  const add = (geo, color, x, y, z, extra = {}) => {
    const o = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra }));
    o.position.set(x, y, z);
    o.castShadow = true;
    g.add(o);
    return o;
  };
  add(new THREE.BoxGeometry(0.36, 0.04, 0.3), 0x2a2a2a, 0, 0.02, 0);          // frame
  add(new THREE.BoxGeometry(0.2, 0.18, 0.2), 0xb02018, -0.05, 0.14, 0);       // engine
  add(new THREE.BoxGeometry(0.18, 0.08, 0.14), 0xc8c0b0, -0.05, 0.27, 0);     // fuel tank
  add(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 14).rotateZ(Math.PI / 2), 0x5a5a5a, 0.12, 0.12, 0, { metalness: 0.6 }); // pump volute
  return g;
}

function stripeTexture() {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(160,190,180,0.25)';
  ctx.fillRect(0, 0, 32, 128);
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.4})`;
    ctx.fillRect(Math.random() * 32, Math.random() * 128, 1 + Math.random() * 2, 6 + Math.random() * 18);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export class Sluice {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.creek = terrain.creek;
    this.kind = 'sluice';
    this.waterTex = stripeTexture();
    this.waterTex.repeat.set(1, 3);
    this.ghostMat = new THREE.MeshBasicMaterial({ color: 0x66ff88, transparent: true, opacity: 0.4, depthWrite: false });
    this.build();
    // The highbanker's pump and hoses, at the water's edge.
    this.pump = makePumpModel();
    this.pump.visible = false;
    scene.add(this.pump);
    this.hoseMat = new THREE.MeshStandardMaterial({ color: 0x1d3a6a, roughness: 0.6 });
    this.hoses = [];

    this.placed = false;
    this.loads = 0;
    this.cons = null;
    this.running = 0; // highbanker: seconds of pumping left since the last load
    this.flow = { x: 0, z: 0, speed: 0 };
  }

  // (Re)build the placed model and the placement ghost for the current kind.
  build() {
    for (const o of [this.model, this.ghost]) if (o) this.scene.remove(o);
    const hb = this.kind === 'highbanker';
    this.model = hb ? makeHighbankerModel() : makeSluiceModel();
    this.model.rotation.order = 'YXZ';
    this.model.visible = false;
    this.sheet = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 1.55).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: this.waterTex, transparent: true, opacity: 0.85, roughness: 0.1, depthWrite: false }),
    );
    this.sheet.position.y = 0.065;
    (hb ? this.model.userData.tray : this.model).add(this.sheet);
    this.scene.add(this.model);
    this.ghost = hb ? makeHighbankerModel() : makeSluiceModel();
    this.ghost.rotation.order = 'YXZ';
    this.ghost.traverse((o) => { if (o.isMesh) { o.material = this.ghostMat; o.castShadow = false; } });
    this.ghost.visible = false;
    this.scene.add(this.ghost);
    if (this.blenderModel && !hb) this.applyModel(this.blenderModel);
  }

  // Upgrading: the sluice becomes a highbanker (once it's out of the water).
  setKind(kind) {
    if (kind === this.kind || this.placed) return false;
    this.kind = kind;
    this.stranded = null;
    this.build();
    return true;
  }

  // Swap the boxy trough for the Blender model (placed sluice and placement ghost).
  applyModel(model) {
    if (!model) return;
    this.blenderModel = model;
    if (this.kind !== 'sluice') return;
    for (const [group, ghost] of [[this.model, false], [this.ghost, true]]) {
      group.traverse((c) => { if (c.isMesh && c.userData.static) c.visible = false; });
      const o = model.clone(true);
      if (ghost) o.traverse((c) => { if (c.isMesh) { c.material = this.ghostMat; c.castShadow = false; } });
      group.add(o);
    }
  }

  // How good a spot is. A sluice needs to be in a good run of the creek;
  // a highbanker needs dry, fairly level bank within reach of the water.
  evaluate(x, z) {
    if (this.kind === 'highbanker') return this.evaluateBank(x, z);
    const depth = this.terrain.waterDepth(x, z);
    if (depth < 0) return null;
    const f = this.creek.velocity(x, z, {});
    return { x, z, depth, speed: f.speed, dir: Math.atan2(f.x, f.z), ...sluiceEfficiency(f.speed, depth) };
  }

  // Nearest water, walking straight toward the creek's centreline.
  waterEdge(x, z) {
    const L = this.creek.local(x, z, {});
    const toward = L.n > 0 ? -1 : 1;
    const nx = -L.tz * toward, nz = L.tx * toward; // across the creek, toward the water
    for (let d = 0; d <= PUMP_REACH + 0.01; d += 0.25) {
      const px = x + nx * d, pz = z + nz * d;
      if (this.terrain.waterDepth(px, pz) > 0.12) return { x: px, z: pz, d };
    }
    return null;
  }

  evaluateBank(x, z) {
    const L = this.creek.local(x, z, {});
    const dir = Math.atan2(L.tx, L.tz);
    const base = { x, z, dir, depth: 0.1, speed: 0.9 };
    if (this.terrain.waterDepth(x, z) > -0.05) return { ...base, eff: 0.1, ok: 'bad', why: 'in the water: a highbanker goes up on the bank' };
    const e = 0.5;
    const slope = Math.hypot(this.terrain.getHeight(x + e, z) - this.terrain.getHeight(x - e, z), this.terrain.getHeight(x, z + e) - this.terrain.getHeight(x, z - e)) / (2 * e);
    if (slope > 0.35) return { ...base, eff: 0.1, ok: 'bad', why: 'too steep to stand it up' };
    const edge = this.waterEdge(x, z);
    if (!edge) return { ...base, eff: 0.1, ok: 'bad', why: `too far from the water (the intake hose is ${PUMP_REACH} m)` };
    const lift = this.terrain.getHeight(x, z) + 1 - this.creek.surfaceY(edge.z);
    if (lift > PUMP_LIFT) return { ...base, eff: 0.1, ok: 'bad', why: 'too high above the water for the pump' };
    return { ...base, edge, lift, eff: 0.86, ok: edge.d < PUMP_REACH * 0.7 ? 'good' : 'fair', why: `${edge.d.toFixed(1)} m to the water, ${Math.max(0, lift).toFixed(1)} m lift` };
  }

  pose(obj, x, z, dir) {
    // Point the tail downstream; if the water isn't moving use the creek's direction.
    let yaw = dir;
    if (!Number.isFinite(yaw) || this.creek.velocity(x, z, {}).speed < 0.01) {
      const L = this.creek.local(x, z, {});
      yaw = Math.atan2(L.tx, L.tz);
    }
    obj.position.set(x, this.terrain.getHeight(x, z) + (this.kind === 'highbanker' ? 0 : 0.03), z);
    obj.rotation.set(this.kind === 'highbanker' ? 0 : 0.08, yaw, 0); // about an inch drop per foot toward the tail
  }

  showGhost(spot) {
    if (!spot) { this.ghost.visible = false; return; }
    this.ghost.visible = true;
    this.pose(this.ghost, spot.x, spot.z, spot.dir);
    this.ghostMat.color.set(spot.ok === 'good' ? 0x66ff88 : spot.ok === 'fair' ? 0xffd25a : 0xff6650);
  }

  place(spot) {
    this.placed = true;
    this.spot = spot;
    this.model.visible = true;
    this.pose(this.model, spot.x, spot.z, spot.dir);
    this.ghost.visible = false;
    if (this.kind === 'highbanker') this.layHoses();
  }

  // Pump at the water's edge, intake hose into the creek, delivery hose up to the spray bar.
  layHoses() {
    for (const h of this.hoses) this.scene.remove(h);
    this.hoses = [];
    const edge = this.spot.edge || this.waterEdge(this.spot.x, this.spot.z);
    if (!edge) { this.pump.visible = false; return; }
    const T = this.terrain;
    // Sit the pump just back from the edge, on dry ground.
    const bx = this.spot.x - edge.x, bz = this.spot.z - edge.z, bl = Math.hypot(bx, bz) || 1;
    const px = edge.x + (bx / bl) * Math.min(1, bl * 0.5), pz = edge.z + (bz / bl) * Math.min(1, bl * 0.5);
    this.pump.position.set(px, T.getHeight(px, pz), pz);
    this.pump.rotation.y = Math.atan2(bx, bz);
    this.pump.visible = true;
    const hose = (pts, r) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, r, 6), this.hoseMat);
      m.castShadow = true;
      this.scene.add(m);
      this.hoses.push(m);
    };
    const wx = edge.x - (bx / bl) * 0.5, wz = edge.z - (bz / bl) * 0.5;
    hose([
      new THREE.Vector3(px, T.getHeight(px, pz) + 0.12, pz),
      new THREE.Vector3((px + wx) / 2, T.getHeight((px + wx) / 2, (pz + wz) / 2) + 0.04, (pz + wz) / 2),
      new THREE.Vector3(wx, T.getHeight(wx, wz) - 0.05, wz),
    ], 0.022);
    // Up to the spray bar over the hopper (head end, -z in the model).
    const head = new THREE.Vector3(0, 1.2, -1.25).applyEuler(this.model.rotation).add(this.model.position);
    const pts = [new THREE.Vector3(px, T.getHeight(px, pz) + 0.14, pz)];
    for (let i = 1; i < 4; i++) {
      const t = i / 4, x = px + (head.x - px) * t, z = pz + (head.z - pz) * t;
      pts.push(new THREE.Vector3(x, T.getHeight(x, z) + 0.04 + (i === 3 ? 0.4 : 0), z));
    }
    pts.push(head);
    hose(pts, 0.018);
  }

  // Current working condition (the flood changes it).
  status() {
    if (!this.placed) return null;
    if (this.kind === 'highbanker') return { ...this.spot, eff: this.spot.eff, speed: 0.9, depth: 0.1 };
    return this.evaluate(this.spot.x, this.spot.z) || { ...this.spot, depth: 0, speed: 0, ...sluiceEfficiency(0, 0) };
  }

  get capacity() { return CAPACITY[this.kind]; }
  get fill() { return this.loads / this.capacity; }

  // Where you shovel in: the head of the sluice, or the highbanker's hopper.
  get head() {
    const p = new THREE.Vector3(0, 0, this.kind === 'highbanker' ? -0.95 : -0.85).applyEuler(this.model.rotation).add(this.model.position);
    return p;
  }

  // Shovel one load in.
  //  - classified: the load went through a screen (on the bucket, the grizzly on
  //    the hopper, or a classifier over the sluice head). Stones ride over the
  //    riffles otherwise, stirring up the bed and packing the riffles faster.
  //  - Agates and big stones go out the tail of an unclassified sluice.
  feed(sample, classified) {
    const st = this.status();
    const packed = Math.max(0, Math.min(1, (this.fill - 0.6) / 0.6));
    const eff = st.eff * (1 - 0.65 * packed) * (classified ? 1 : 0.85);
    if (!this.cons) {
      this.cons = { cons: true, layer: 'cons', gold: 0, blackSand: 0, sizeBias: 0, loads: 0 };
      for (const t of GEM_ORDER) this.cons[t] = 0;
    }
    const c = this.cons;
    c.gold += sample.gold * eff;
    for (const t of GEM_ORDER) if (t !== 'agate') c[t] += sample[t] * eff * 0.9;
    c.blackSand += sample.blackSand * eff;
    c.sizeBias += sample.sizeBias;
    c.loads++;
    this.loads += classified ? 1 : 1.6;
    if (this.kind === 'highbanker') this.running = 8;
    return { eff };
  }

  cleanUp() {
    const c = this.cons;
    if (!c) return null;
    c.sizeBias /= c.loads;
    this.cons = null;
    this.loads = 0;
    return c;
  }

  pickUp() {
    const c = this.cleanUp();
    this.placed = false;
    this.model.visible = false;
    this.pump.visible = false;
    for (const h of this.hoses) this.scene.remove(h);
    this.hoses = [];
    return c;
  }

  // The flood takes it. It fetches up on a bar somewhere downstream, empty.
  // A highbanker up on the bank is only taken if the water reaches it.
  washAway(rand = Math.random) {
    if (!this.placed) return false;
    if (this.kind === 'highbanker') {
      if (this.terrain.waterDepth(this.spot.x, this.spot.z) < 0.15) return false;
      this.pump.visible = false;
      for (const h of this.hoses) this.scene.remove(h);
      this.hoses = [];
    }
    this.cons = null;
    this.loads = 0;
    const C = this.creek;
    let z = this.spot.z - 25 - rand() * 30;
    if (z < -100) z = this.spot.z + 15;
    const L = C.local(this.spot.x, z, {});
    const d = C.dcx(z);
    const side = L.nIn >= 0 ? 1 : -1;
    const x = C.cx(z) + (C.curvature(z) >= 0 ? 1 : -1) * side * (L.w + 1.2) * Math.sqrt(1 + d * d);
    this.placed = false;
    this.stranded = { x, z };
    this.model.visible = true;
    this.model.position.set(x, this.terrain.getHeight(x, z) + 0.05, z);
    this.model.rotation.set(0.3, rand() * 6.28, 0.5);
    return true;
  }

  // Collect a stranded sluice so you can set it again.
  recover() {
    this.stranded = null;
    this.model.visible = false;
  }

  snapshot() {
    return {
      kind: this.kind,
      placed: this.placed,
      spot: this.placed ? { x: this.spot.x, z: this.spot.z, dir: this.spot.dir } : null,
      loads: this.loads,
      cons: this.cons,
      stranded: this.stranded || null,
    };
  }

  restore(s) {
    if (!s) return;
    if (s.kind && s.kind !== this.kind) this.setKind(s.kind);
    if (s.placed && s.spot) {
      const spot = this.evaluate(s.spot.x, s.spot.z) || { ...s.spot, depth: 0, speed: 0, ok: 'bad', eff: 0.1, why: '' };
      this.place({ ...spot, dir: s.spot.dir });
      this.loads = s.loads || 0;
      this.cons = s.cons || null;
    } else if (s.stranded) {
      this.stranded = s.stranded;
      this.model.visible = true;
      this.model.rotation.set(0.3, 1.2, 0.5);
      this.model.position.set(s.stranded.x, this.terrain.getHeight(s.stranded.x, s.stranded.z) + 0.05, s.stranded.z);
    }
  }

  update(dt) {
    const cons = this.model.userData.cons;
    for (let i = 0; i < cons.length; i++) {
      // Fill from the head down, like the real thing.
      const f = Math.max(0, Math.min(1, this.fill * 1.4 - i * 0.06));
      cons[i].scale.y = 0.01 + f;
    }
    if (this.placed) {
      const st = this.status();
      this.running = Math.max(0, this.running - dt);
      this.waterTex.offset.y += dt * Math.max(0.2, st.speed) * 1.8;
      this.sheet.visible = this.kind === 'highbanker' ? this.running > 0 : st.depth > 0.05;
    }
  }
}
