import * as THREE from 'three';

// Treating reef ore at camp, the old way and the new.
//  1. Roast it: a few lumps on the campfire. Heat makes quartz brittle, and it
//     burns off the sulphides that lock fine gold away from the pan.
//  2. Crush it: in the dolly pot (an iron pot under a heavy iron "dolly" hung
//     from a springy sapling: you drive it down, the sapling lifts it again),
//     or in a little petrol hammer mill if you've bought one.
//  3. Pan the crushed ore at the creek for the fine gold.

export const ORE_BAG = 8;
const ROAST_TIME = 45;      // seconds on the fire
const MILL_TIME = 3.5;      // seconds per lump through the hammer mill

// What goes in your bucket once a lump's crushed: pans like concentrate.
export function crushedLoad(lump) {
  return { cons: true, crushed: true, roasted: lump.roasted, layer: 'crushed', gold: lump.gold, blackSand: 0.4, sizeBias: 0, loads: 1 };
}

export class OreWorks {
  constructor(scene, terrain, spots, saved) {
    this.terrain = terrain;
    this.spots = spots;
    this.roast = saved?.roast || null;          // { lumps, left }
    this.mill = saved?.mill || { queue: [], out: [], t: 0 };
    this.dolly = { active: false, crush: 0, ready: 1, slam: 0, lump: null };
    const at = (s) => new THREE.Vector3(s.x, terrain.getHeight(s.x, s.z), s.z);
    this.firePos = at(spots.fire);
    this.buildRoast(scene);
    this.dollyPos = at(spots.dolly);
    this.buildDolly(scene, spots.dolly.yaw);
    this.millPos = at(spots.mill);
    this.buildMill(scene, spots.mill.yaw);
  }

  // ---------- roasting ----------

  buildRoast(scene) {
    this.roastGroup = new THREE.Group();
    this.roastGroup.position.copy(this.firePos);
    this.lumpMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c4, roughness: 0.7, emissive: 0x000000 });
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07 + (i % 3) * 0.015, 0), this.lumpMat);
      const a = (i / 6) * Math.PI * 2;
      m.position.set(Math.cos(a) * 0.22, 0.12, Math.sin(a) * 0.22);
      m.rotation.set(i, i * 2, 0);
      this.roastGroup.add(m);
    }
    this.roastLight = new THREE.PointLight(0xff6a20, 0, 5, 1.6);
    this.roastLight.position.set(0, 0.5, 0);
    this.roastGroup.add(this.roastLight);
    scene.add(this.roastGroup);
  }

  nearFire(pos) { return Math.hypot(pos.x - this.firePos.x, pos.z - this.firePos.z) < 2; }

  // Put raw ore on (returns how many), or take roasted ore off (returns the lumps).
  startRoast(ore) {
    const raw = ore.filter((l) => !l.roasted);
    if (!raw.length || this.roast) return 0;
    for (const l of raw) ore.splice(ore.indexOf(l), 1);
    this.roast = { lumps: raw, left: ROAST_TIME };
    return raw.length;
  }

  takeRoast() {
    if (!this.roast || this.roast.left > 0) return null;
    const lumps = this.roast.lumps.map((l) => ({ ...l, roasted: true }));
    this.roast = null;
    return lumps;
  }

  // ---------- the dolly pot ----------

  buildDolly(scene, yaw) {
    const g = new THREE.Group();
    g.position.copy(this.dollyPos);
    g.rotation.y = yaw;
    const wood = new THREE.MeshStandardMaterial({ color: 0x6a4c30, roughness: 0.9 });
    const iron = new THREE.MeshStandardMaterial({ color: 0x2c2a28, roughness: 0.55, metalness: 0.7 });
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.55, 12), wood);
    stump.position.y = 0.27;
    stump.castShadow = true;
    g.add(stump);
    // The pot: a thick cast-iron bowl set into the stump.
    const prof = [];
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; prof.push(new THREE.Vector2(0.05 + Math.sin(a) * 0.18, 0.02 + (1 - Math.cos(a)) * 0.2)); }
    prof.push(new THREE.Vector2(0.25, 0.22), new THREE.Vector2(0.25, 0.25), new THREE.Vector2(0.21, 0.25));
    const pot = new THREE.Mesh(new THREE.LatheGeometry(prof, 20), iron);
    pot.material.side = THREE.DoubleSide;
    pot.position.y = 0.5;
    pot.castShadow = true;
    g.add(pot);
    // A forked post, and the springy sapling pole across it, tied down at the far end.
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.6, 7), wood);
    post.position.set(0, 0.8, -1.4);
    g.add(post);
    this.pole = new THREE.Group();
    this.pole.position.set(0, 1.6, -1.4);
    g.add(this.pole);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 3.4, 7), wood);
    pole.rotation.x = Math.PI / 2;
    pole.position.z = 0.4; // pivot sits 1.3 m from the butt end
    this.pole.add(pole);
    const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.1, 4), wood);
    tie.position.set(0, -0.55, -1.25);
    this.pole.add(tie);
    // The dolly: a heavy iron bar with a flat crushing foot, hung from the tip.
    this.dollyBar = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8), iron);
    bar.position.y = -0.375;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12), iron);
    foot.position.y = -0.75;
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), wood);
    handle.position.y = -0.3;
    this.dollyBar.add(bar, foot, handle);
    g.add(this.dollyBar);
    this.dollyGroup = g;
    scene.add(g);
    this.poseDolly(1);
  }

  // Lift 0 (foot down in the pot) .. 1 (sprung right up).
  poseDolly(lift) {
    const angle = -0.05 + lift * 0.28; // the pole bends up as the dolly rises
    this.pole.rotation.x = -angle;
    const tipZ = -1.4 + Math.cos(angle) * 1.4, tipY = 1.6 + Math.sin(angle) * 1.4;
    this.dollyBar.position.set(0, tipY - 0.05, tipZ);
  }

  nearDolly(pos) { return Math.hypot(pos.x - this.dollyPos.x, pos.z - this.dollyPos.z) < 2.2; }

  startDolly() { this.dolly.active = true; this.dolly.ready = 1; }
  stopDolly() { this.dolly.active = false; }

  // A drive of the dolly. Returns { good } or null if it wasn't ready.
  strike(ore, roasted) {
    const d = this.dolly;
    if (d.slam > 0) return null;
    const good = d.ready > 0.82;
    d.crush += good ? (roasted ? 0.22 : 0.12) : 0.03;
    d.slam = 0.12;
    d.ready = 0;
    return { good };
  }

  // ---------- the hammer mill ----------

  buildMill(scene, yaw) {
    const g = new THREE.Group();
    g.position.copy(this.millPos);
    g.rotation.y = yaw;
    const steel = new THREE.MeshStandardMaterial({ color: 0x4d5a52, roughness: 0.5, metalness: 0.6 });
    const paint = new THREE.MeshStandardMaterial({ color: 0x2e6b3a, roughness: 0.45, metalness: 0.3 });
    const red = new THREE.MeshStandardMaterial({ color: 0xb02a1a, roughness: 0.4, metalness: 0.3 });
    for (const x of [-0.35, 0.35]) for (const z of [-0.3, 0.3]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), steel);
      leg.position.set(x, 0.35, z);
      g.add(leg);
    }
    this.millBody = new THREE.Group();
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.4, 16), paint);
    housing.rotation.z = Math.PI / 2;
    housing.position.y = 0.9;
    const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.12, 0.4, 4, 1, true), steel);
    hopper.material.side = THREE.DoubleSide;
    hopper.position.y = 1.32;
    hopper.rotation.y = Math.PI / 4;
    const chute = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.5), steel);
    chute.position.set(0, 0.62, 0.42);
    chute.rotation.x = 0.5;
    this.millBody.add(housing, hopper, chute);
    g.add(this.millBody);
    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.35), red);
    engine.position.set(-0.75, 0.15, 0);
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.22), red);
    tank.position.set(-0.75, 0.36, 0);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), steel);
    belt.position.set(-0.45, 0.55, -0.22);
    belt.rotation.z = -0.9;
    g.add(engine, tank, belt);
    // A pile of crushed ore building up under the chute.
    this.fines = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.18, 12), new THREE.MeshStandardMaterial({ color: 0xbdb3a4, roughness: 1 }));
    this.fines.position.set(0, 0.09, 0.75);
    g.add(this.fines);
    this.millGroup = g;
    scene.add(g);
  }

  showMill(owned) { this.millGroup.visible = owned; }

  nearMill(pos) { return this.millGroup.visible && Math.hypot(pos.x - this.millPos.x, pos.z - this.millPos.z) < 2.2; }

  feedMill(ore) {
    const n = ore.length;
    this.mill.queue.push(...ore.splice(0));
    return n;
  }

  get milling() { return this.mill.queue.length > 0; }

  // ---------- every frame ----------

  update(dt, { sound, time }) {
    // The roast.
    if (this.roast && this.roast.left > 0) this.roast.left = Math.max(0, this.roast.left - dt);
    const on = !!this.roast;
    this.roastGroup.visible = on;
    if (on) {
      const k = this.roast.left > 0 ? 0.6 + 0.4 * Math.sin(time * 7) * Math.sin(time * 3.1) : 0.15;
      this.lumpMat.emissive.setRGB(0.9 * k, 0.35 * k, 0.08 * k);
      this.roastLight.intensity = this.roast.left > 0 ? 2 + k * 2 : 0.3;
    }
    // The dolly: the sapling lifts it back after each drive.
    const d = this.dolly;
    if (d.slam > 0) {
      d.slam -= dt;
      this.poseDolly(Math.max(0, d.slam / 0.12) * 0.3);
      if (d.slam <= 0) sound.thud();
    } else {
      d.ready = Math.min(1, d.ready + dt / (d.active ? 0.85 : 0.5));
      // A little spring overshoot as it comes up.
      this.poseDolly(d.ready + Math.sin(d.ready * Math.PI) * 0.08);
    }
    // The mill.
    const m = this.mill;
    if (m.queue.length) {
      m.t += dt;
      this.millBody.position.set((Math.random() - 0.5) * 0.008, (Math.random() - 0.5) * 0.006, 0);
      if (m.t >= MILL_TIME) {
        m.t = 0;
        m.out.push(crushedLoad(m.queue.shift()));
      }
    } else this.millBody.position.set(0, 0, 0);
    this.fines.visible = m.out.length > 0;
    this.fines.scale.setScalar(0.6 + Math.min(1.4, m.out.length * 0.15));
    sound.setMill?.(m.queue.length > 0);
  }

  snapshot() {
    return { roast: this.roast, mill: { queue: this.mill.queue, out: this.mill.out, t: 0 } };
  }
}
