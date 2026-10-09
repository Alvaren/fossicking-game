import * as THREE from 'three';
import { PLAY } from './terrain.js';
import { smoothstep } from './noise.js';

// Wildlife: a mob of red kangaroos grazing and hopping about (and bolting if
// you get too close), galahs screeching across the sky, bush flies round your
// head on hot days, a kookaburra at dawn and crickets at night.

const ROOS = 7;

export class Wildlife {
  constructor(scene, terrain, sound) {
    this.scene = scene;
    this.terrain = terrain;
    this.sound = sound;
    this.roos = [];
    this.flock = null;
    this.flockIn = 40 + Math.random() * 60;
    this.kookaIn = 5;
    this.cricketIn = 1;
    this.lastHour = null;
    this.buildFlies();
  }

  // The kangaroo model arrives from Blender after load.
  applyModel(model) {
    if (!model || this.roos.length) return;
    const C = this.terrain.creek;
    // Roos like the flats and slopes away from camp.
    const home = { x: C.cx(-40) + 30, z: -40 };
    for (let i = 0; i < ROOS; i++) {
      const g = model.clone(true);
      g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const s = 0.8 + Math.random() * 0.35; // joeys, does and a big old buck
      g.scale.setScalar(s);
      const r = {
        mesh: g, s,
        x: home.x + (Math.random() - 0.5) * 30, z: home.z + (Math.random() - 0.5) * 30,
        heading: Math.random() * 6.28, state: 'graze', t: Math.random() * 8,
        tx: 0, tz: 0, phase: 0, speed: 0,
      };
      this.place(r);
      this.scene.add(g);
      this.roos.push(r);
    }
  }

  place(r) {
    const y = this.terrain.getHeight(r.x, r.z);
    r.mesh.position.set(r.x, y, r.z);
  }

  pickTarget(r, away) {
    const lim = PLAY - 8;
    let x, z, tries = 0;
    do {
      const a = away ? Math.atan2(r.z - away.z, r.x - away.x) + (Math.random() - 0.5) * 0.9 : Math.random() * 6.28;
      const d = away ? 25 + Math.random() * 20 : 8 + Math.random() * 22;
      x = r.x + Math.cos(a) * d;
      z = r.z + Math.sin(a) * d;
      tries++;
      // Stay out of the creek and on the claim.
    } while (tries < 10 && (Math.abs(x) > lim || Math.abs(z) > lim || this.terrain.waterDepth(x, z) > -0.05));
    r.tx = THREE.MathUtils.clamp(x, -lim, lim);
    r.tz = THREE.MathUtils.clamp(z, -lim, lim);
  }

  buildFlies() {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(8, 8, 3, 0, 7); ctx.fill();
    const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false, transparent: true });
    this.flies = [];
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Sprite(mat);
      sp.scale.setScalar(0.012);
      sp.visible = false;
      sp.userData = { a: Math.random() * 6, b: Math.random() * 6, f: 2 + Math.random() * 3 };
      this.scene.add(sp);
      this.flies.push(sp);
    }
  }

  buildFlock(cam) {
    const group = new THREE.Group();
    const pink = new THREE.MeshStandardMaterial({ color: 0xe0607e, roughness: 0.8 });
    const grey = new THREE.MeshStandardMaterial({ color: 0x9a9aa2, roughness: 0.8 });
    const birds = [];
    for (let i = 0; i < 12; i++) {
      const b = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6).scale(1, 0.8, 1.9), pink);
      b.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), pink);
      head.position.set(0, 0.03, -0.18);
      b.add(head);
      const wings = [];
      for (const s of [1, -1]) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.01, 0.14).translate(s * 0.17, 0, 0), grey);
        b.add(w);
        wings.push(w);
      }
      b.userData = { wings, off: new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 6), ph: Math.random() * 6 };
      group.add(b);
      birds.push(b);
    }
    // Fly a straight line across the sky, passing near the player.
    const a = Math.random() * 6.28;
    const from = new THREE.Vector3(cam.x + Math.cos(a) * 140, 0, cam.z + Math.sin(a) * 140);
    const to = new THREE.Vector3(cam.x - Math.cos(a) * 140 + (Math.random() - 0.5) * 40, 0, cam.z - Math.sin(a) * 140);
    const alt = 14 + Math.random() * 14;
    this.scene.add(group);
    this.flock = { group, birds, from, to, t: 0, alt, len: from.distanceTo(to), screech: 0 };
  }

  update(dt, { player, cam, daylight, hour, playing }) {
    // ---------- kangaroos ----------
    for (const r of this.roos) {
      const dp = Math.hypot(player.x - r.x, player.z - r.z);
      if (dp < 11 && r.state !== 'flee') {
        r.state = 'flee';
        this.pickTarget(r, player);
      }
      r.t -= dt;
      if (r.state === 'graze') {
        // Head down, munching, the odd look around.
        const look = Math.sin(r.t * 0.7) > 0.85;
        r.mesh.rotation.set(look ? 0 : -0.75, r.heading, 0, 'YXZ'); // negative x tips the head forward and down
        r.mesh.position.y = this.terrain.getHeight(r.x, r.z);
        if (r.t <= 0) { r.state = 'hop'; this.pickTarget(r); }
      } else {
        // Hopping: long bounds, body tipped forward, tail out behind.
        const dx = r.tx - r.x, dz = r.tz - r.z;
        const d = Math.hypot(dx, dz);
        const want = r.state === 'flee' ? 9 : 4.5;
        r.speed += (want - r.speed) * Math.min(1, dt * 3);
        const target = Math.atan2(-dx, -dz);
        let dh = target - r.heading;
        dh = Math.atan2(Math.sin(dh), Math.cos(dh));
        r.heading += dh * Math.min(1, dt * 5);
        r.x -= Math.sin(r.heading) * r.speed * dt;
        r.z -= Math.cos(r.heading) * r.speed * dt;
        r.phase += dt * (r.speed / 2.2 + 1.2) * Math.PI;
        const hop = Math.abs(Math.sin(r.phase));
        r.mesh.position.set(r.x, this.terrain.getHeight(r.x, r.z) + hop * 0.55 * r.s, r.z);
        r.mesh.rotation.set(-0.55 + hop * 0.15, r.heading, 0, 'YXZ');
        if (d < 1.5) { r.state = 'graze'; r.speed = 0; r.t = 6 + Math.random() * 16; }
      }
    }

    // ---------- galahs ----------
    this.flockIn -= dt;
    if (!this.flock && this.flockIn <= 0 && daylight > 0.4 && playing) this.buildFlock(cam);
    if (this.flock) {
      const f = this.flock;
      f.t += (12 * dt) / f.len;
      const p = new THREE.Vector3().lerpVectors(f.from, f.to, f.t);
      const dir = new THREE.Vector3().subVectors(f.to, f.from).normalize();
      for (const b of f.birds) {
        const u = b.userData;
        // Galahs wheel and tumble a bit as they go.
        b.position.copy(p).add(u.off).add(new THREE.Vector3(Math.sin(f.t * 30 + u.ph) * 1.5, Math.sin(f.t * 22 + u.ph) * 0.8, 0));
        b.position.y += f.alt + this.terrain.getHeight(p.x, p.z);
        b.lookAt(b.position.clone().add(dir));
        b.rotateY(Math.PI);
        const flap = Math.sin(performance.now() / 1000 * 14 + u.ph) * 0.8;
        u.wings[0].rotation.z = flap;
        u.wings[1].rotation.z = -flap;
      }
      const dist = Math.hypot(p.x - cam.x, p.z - cam.z);
      f.screech -= dt;
      if (f.screech <= 0 && dist < 90) {
        f.screech = 0.25 + Math.random() * 0.9;
        this.sound.galah(Math.max(0.05, 1 - dist / 90), Math.sign(p.x - cam.x) * 0.6);
      }
      if (f.t >= 1) {
        this.scene.remove(f.group);
        this.flock = null;
        this.flockIn = 70 + Math.random() * 110;
      }
    }

    // ---------- bush flies (hot days, when you're standing about) ----------
    const hot = daylight > 0.8 && hour > 9.5 && hour < 16.5;
    const still = player.speed < 1.5;
    let nearest = 9;
    for (const fl of this.flies) {
      fl.visible = hot && playing;
      if (!fl.visible) continue;
      const u = fl.userData;
      const t = performance.now() / 1000;
      const rad = still ? 0.35 : 0.9;
      fl.position.set(
        cam.x + Math.sin(t * u.f + u.a) * rad,
        cam.y - 0.1 + Math.sin(t * u.f * 1.3 + u.b) * 0.2,
        cam.z + Math.cos(t * u.f * 0.9 + u.a) * rad,
      );
      nearest = Math.min(nearest, fl.position.distanceTo(cam));
    }
    this.sound.setFlies(hot && playing ? smoothstep(0.9, 0.25, nearest) * (still ? 1 : 0.4) : 0);

    // ---------- dawn chorus and night crickets ----------
    if (this.lastHour !== null && this.lastHour < 5.9 && hour >= 5.9) this.kookaIn = 1;
    this.lastHour = hour;
    this.kookaIn -= dt;
    if (this.kookaIn <= 0 && playing) {
      const dawnish = hour > 5.8 && hour < 8.5;
      if (dawnish || Math.random() < 0.25) this.sound.kookaburra((Math.random() - 0.5) * 1.4);
      this.kookaIn = dawnish ? 25 + Math.random() * 40 : 120 + Math.random() * 200;
    }
    this.cricketIn -= dt;
    if (daylight < 0.25 && playing && this.cricketIn <= 0) {
      this.cricketIn = 0.4 + Math.random() * 1.6;
      this.sound.cricket(0.4 + Math.random() * 0.6, (Math.random() - 0.5) * 1.6);
    }
  }
}
