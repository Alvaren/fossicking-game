import * as THREE from 'three';
import { GEM_ORDER, makeGem } from './minerals.js';

// A sluice box set in the creek. Water runs through it, you shovel wash in at
// the head, heavies drop behind the riffles and the rest is flushed out the
// tail. Real rules:
//  - It needs the right current: too slow and the riffles pack with sand,
//    too fast and the gold is scoured back out. Around 0.6-1.3 m/s is good.
//  - It needs enough water to run through it, but not so much it's drowned.
//  - The riffles fill up. Clean up regularly and pan the concentrates.
//  - Big stones (agates) go straight over the riffles and out the tail unless
//    you classify the wash first and check the oversize.

const CAPACITY = 14; // loads before the riffles are packed

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
    this.model = makeSluiceModel();
    this.model.rotation.order = 'YXZ';
    this.model.visible = false;
    this.waterTex = stripeTexture();
    this.waterTex.repeat.set(1, 3);
    const sheet = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 1.55).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: this.waterTex, transparent: true, opacity: 0.85, roughness: 0.1, depthWrite: false }),
    );
    sheet.position.y = 0.065;
    this.model.add(sheet);
    scene.add(this.model);

    this.ghost = makeSluiceModel();
    this.ghost.rotation.order = 'YXZ';
    this.ghostMat = new THREE.MeshBasicMaterial({ color: 0x66ff88, transparent: true, opacity: 0.4, depthWrite: false });
    this.ghost.traverse((o) => { if (o.isMesh) { o.material = this.ghostMat; o.castShadow = false; } });
    this.ghost.visible = false;
    scene.add(this.ghost);

    this.placed = false;
    this.loads = 0;
    this.cons = null;
    this.flow = { x: 0, z: 0, speed: 0 };
  }

  // Swap the boxy trough for the Blender model (placed sluice and placement ghost).
  applyModel(model) {
    if (!model) return;
    for (const [group, ghost] of [[this.model, false], [this.ghost, true]]) {
      group.traverse((c) => { if (c.isMesh && c.userData.static) c.visible = false; });
      const o = model.clone(true);
      if (ghost) o.traverse((c) => { if (c.isMesh) { c.material = this.ghostMat; c.castShadow = false; } });
      group.add(o);
    }
  }

  // How good a spot is for a sluice. Returns null if it isn't in the creek.
  evaluate(x, z) {
    const depth = this.terrain.waterDepth(x, z);
    if (depth < 0) return null;
    const f = this.creek.velocity(x, z, {});
    return { x, z, depth, speed: f.speed, dir: Math.atan2(f.x, f.z), ...sluiceEfficiency(f.speed, depth) };
  }

  pose(obj, x, z, dir) {
    // Point the tail downstream; if the water isn't moving use the creek's direction.
    let yaw = dir;
    if (!Number.isFinite(yaw) || this.creek.velocity(x, z, {}).speed < 0.01) {
      const L = this.creek.local(x, z, {});
      yaw = Math.atan2(L.tx, L.tz);
    }
    obj.position.set(x, this.terrain.getHeight(x, z) + 0.03, z);
    obj.rotation.set(0.08, yaw, 0); // about an inch drop per foot toward the tail
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
  }

  // Current working condition (the flood changes it).
  status() {
    if (!this.placed) return null;
    return this.evaluate(this.spot.x, this.spot.z) || { ...this.spot, depth: 0, speed: 0, ...sluiceEfficiency(0, 0) };
  }

  get fill() { return this.loads / CAPACITY; }

  // Shovel one load in. Agates go out the tail unless you checked the oversize.
  feed(sample, classifier, rand = Math.random) {
    const st = this.status();
    const packed = Math.max(0, Math.min(1, (this.fill - 0.6) / 0.6));
    const eff = st.eff * (1 - 0.65 * packed);
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
    this.loads++;
    const agates = [];
    if (classifier) {
      let n = 0;
      for (let L = Math.exp(-sample.agate), p = rand(); p > L; p *= rand()) n++;
      for (let k = 0; k < n; k++) if (rand() < 0.9) agates.push(makeGem('agate', rand));
    }
    return { eff, agates };
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
    return c;
  }

  // The flood takes it. It fetches up on a bar somewhere downstream, empty.
  washAway(rand = Math.random) {
    if (!this.placed) return false;
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
      placed: this.placed,
      spot: this.placed ? { x: this.spot.x, z: this.spot.z, dir: this.spot.dir } : null,
      loads: this.loads,
      cons: this.cons,
      stranded: this.stranded || null,
    };
  }

  restore(s) {
    if (!s) return;
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
      this.waterTex.offset.y += dt * Math.max(0.2, st.speed) * 1.8;
      this.model.children[this.model.children.length - 1].visible = st.depth > 0.05;
    }
  }
}
