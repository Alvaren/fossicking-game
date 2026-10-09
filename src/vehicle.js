import * as THREE from 'three';
import { PLAY } from './terrain.js';

// The ute. Hop in at camp and drive anywhere on the claim. Simple bicycle-model
// steering, sits on the ground through its four wheels (so it pitches and
// rolls over the bumps), won't climb anything too steep, and won't drive into
// water deep enough to drown the engine. Right-hand drive, of course.

const WHEELBASE = 2.9;
const TRACK = 1.84;
const MAX_FWD = 13;   // m/s, about 47 km/h: it's rough country
const MAX_REV = 4;
const DRIVER_EYE = new THREE.Vector3(0.18, 1.64, 0.42);

export class Ute {
  constructor(scene, terrain, group, colliders, ownColliders, sound) {
    Object.assign(this, { scene, terrain, group, colliders, ownColliders, sound });
    this.speed = 0;
    this.lookYaw = 0;
    this.lookPitch = -0.08;
    this.driving = false;
    this.q = new THREE.Quaternion();
    this.tmp = new THREE.Vector3();
    // Take it out of the camp group so it can go places.
    scene.attach(group);
    group.rotation.order = 'YXZ';
    const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(group.quaternion);
    this.heading = Math.atan2(-fwd.z, fwd.x);
    this.x = group.position.x;
    this.z = group.position.z;
    this.settle();
  }

  placeAt(x, z, heading) {
    this.x = x; this.z = z; this.heading = heading;
    this.speed = 0;
    this.settle();
  }

  // World position of a point given in the ute's frame (x forward, z right).
  local(lx, lz) {
    const c = Math.cos(this.heading), s = Math.sin(this.heading);
    return { x: this.x + lx * c + lz * s, z: this.z - lx * s + lz * c };
  }

  // Sit it on the ground through its wheels.
  settle() {
    const T = this.terrain;
    const h = (lx, lz) => { const p = this.local(lx, lz); return T.getHeight(p.x, p.z); };
    const fl = h(WHEELBASE / 2, -TRACK / 2), fr = h(WHEELBASE / 2, TRACK / 2);
    const rl = h(-WHEELBASE / 2, -TRACK / 2), rr = h(-WHEELBASE / 2, TRACK / 2);
    this.pitch = Math.atan2((fl + fr) / 2 - (rl + rr) / 2, WHEELBASE);
    this.roll = Math.atan2((fl + rl) / 2 - (fr + rr) / 2, TRACK);
    const y = (fl + fr + rl + rr) / 4;
    this.group.position.set(this.x, y, this.z);
    // Heading about Y, then pitch about the ute's own Z, then roll about its X.
    this.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.heading);
    this.q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.pitch));
    this.q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.roll));
    this.group.quaternion.copy(this.q);
    // Its collision circles follow it about.
    [-1.4, 0, 1.4].forEach((o, i) => {
      const p = this.local(o, 0);
      this.ownColliders[i].x = p.x;
      this.ownColliders[i].z = p.z;
    });
  }

  near(pos, r = 3.2) {
    return Math.hypot(pos.x - this.x, pos.z - this.z) < r;
  }

  enter() {
    this.driving = true;
    this.lookYaw = 0;
    this.lookPitch = -0.08;
  }

  // Where you step out: beside the driver's door.
  exitSpot() {
    for (const side of [1.7, -1.7, 0]) {
      const p = this.local(side === 0 ? -3.2 : 0.3, side);
      if (!this.colliders.some((c) => !this.ownColliders.includes(c) && Math.hypot(c.x - p.x, c.z - p.z) < c.r + 0.4)) return p;
    }
    return this.local(0.3, 1.7);
  }

  exit() {
    this.driving = false;
    this.speed = 0;
  }

  look(dx, dy) {
    this.lookYaw = THREE.MathUtils.clamp(this.lookYaw - dx * 0.0022, -1.9, 1.9);
    this.lookPitch = THREE.MathUtils.clamp(this.lookPitch - dy * 0.0022, -0.7, 0.5);
  }

  // throttle and steer in -1..1. Returns a message if something stopped you.
  update(dt, throttle, steer, brake) {
    let msg = null;
    if (this.driving) {
      // Engine and brakes.
      if (brake) this.speed *= Math.max(0, 1 - dt * 4);
      else if (throttle > 0) this.speed += (this.speed < 0 ? 9 : 4.5) * throttle * dt;
      else if (throttle < 0) this.speed += (this.speed > 0 ? -9 : -3) * -throttle * dt;
      // Uphill drags, downhill runs on.
      this.speed -= Math.sin(this.pitch) * 9.8 * 0.35 * dt;
      this.speed *= Math.max(0, 1 - dt * (throttle === 0 ? 0.9 : 0.25));
      this.speed = THREE.MathUtils.clamp(this.speed, -MAX_REV, MAX_FWD);
      if (Math.abs(this.speed) < 0.05 && throttle === 0) this.speed = 0;
      // Bicycle-model steering; it turns tighter at walking pace.
      const steerAngle = steer * (0.55 - Math.min(0.3, Math.abs(this.speed) * 0.02));
      this.heading += (this.speed / WHEELBASE) * Math.tan(steerAngle) * dt;
    } else {
      this.speed *= Math.max(0, 1 - dt * 3);
    }

    if (this.speed !== 0) {
      const ox = this.x, oz = this.z;
      this.x += Math.cos(this.heading) * this.speed * dt;
      this.z -= Math.sin(this.heading) * this.speed * dt;
      const lim = PLAY - 3;
      this.x = THREE.MathUtils.clamp(this.x, -lim, lim);
      this.z = THREE.MathUtils.clamp(this.z, -lim, lim);
      // What's ahead: deep water, too steep, or something solid.
      const nose = this.local(Math.sign(this.speed) * 2.4, 0);
      const deep = this.terrain.waterDepth(nose.x, nose.z) > 0.65;
      const T = this.terrain;
      const climb = (T.getHeight(nose.x, nose.z) - T.getHeight(this.x, this.z)) / 2.4;
      const steep = climb > 0.75;
      let hit = false;
      for (const c of this.colliders) {
        if (this.ownColliders.includes(c)) continue;
        for (const o of [-1.6, 0, 1.6]) {
          const p = this.local(o, 0);
          if (Math.hypot(c.x - p.x, c.z - p.z) < c.r + 0.95) { hit = true; break; }
        }
        if (hit) break;
      }
      if (deep || steep || hit) {
        this.x = ox; this.z = oz;
        if (Math.abs(this.speed) > 3 && hit) this.sound.thud?.();
        this.speed = 0;
        msg = deep ? "Too deep. You'll drown the engine." : steep ? "Too steep for the old ute." : null;
      }
    }
    this.settle();
    this.sound.setEngine?.(this.driving, Math.abs(this.speed) / MAX_FWD, Math.abs(throttle));
    return msg;
  }

  // Driver's-eye camera, looking wherever you've turned your head.
  cameraPose(camera) {
    camera.position.copy(DRIVER_EYE).applyMatrix4(this.group.matrixWorld);
    const look = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.lookPitch, -Math.PI / 2 + this.lookYaw, 0, 'YXZ'));
    camera.quaternion.copy(this.group.quaternion).multiply(look);
  }

  // Which way you're facing when you get out.
  facingYaw() {
    return this.heading - Math.PI / 2 + this.lookYaw;
  }

  get kmh() { return Math.round(Math.abs(this.speed) * 3.6); }

  snapshot() { return { x: this.x, z: this.z, h: this.heading }; }
}
