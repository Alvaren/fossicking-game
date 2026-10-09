import * as THREE from 'three';

// The metal detector, held out in the world rather than drawn over the view.
// The shaft runs from your hand down to a coil that rides a few centimetres
// above the ground, pivoting on its yoke so it stays flat to the slope, and
// swinging in a slow arc in front of you. Whatever's under the coil is what
// it hears, so you learn to swing it the way you would a real one: low, slow,
// and overlapping each sweep.

const BOX_TO_COIL = new THREE.Vector3(-0.16, -0.5, -1.05); // in the model: control box -> coil centre
const PIVOT_TO_CENTRE = new THREE.Vector3(0, -0.045, -0.03); // in the coil's frame: yoke bolt -> coil centre
const HAND_HEIGHT = 0.95;   // arm cuff at about elbow height
const RIDE = 0.05;          // coil height above the ground
const SWING = 0.5;          // half the sweep arc, radians

const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3();

// Rotation taking frame (a, roughly-up) onto frame (b, world up).
function aim(a, b, out) {
  const basis = (dir) => {
    const x = dir.clone().normalize();
    const y = UP.clone().addScaledVector(x, -UP.dot(x)).normalize();
    const z = new THREE.Vector3().crossVectors(x, y);
    return new THREE.Matrix4().makeBasis(x, y, z);
  };
  const A = basis(a), B = basis(b);
  return out.setFromRotationMatrix(B.multiply(A.transpose()));
}

export class WorldDetector {
  constructor(scene) {
    this.root = new THREE.Group();
    this.root.visible = false;
    scene.add(this.root);
    this.ready = false;
    this.sweep = 0;
    this.pin = 0;
    this.len = BOX_TO_COIL.length();
    this.coilPos = null;     // where the coil is (smoothed)
    this.sense = new THREE.Vector3();
    this.q = new THREE.Quaternion();
  }

  setModel(model, ringMat, screenMat) {
    const o = model.clone(true);
    o.traverse((c) => {
      if (!c.isMesh) return;
      c.castShadow = true;
      if (c.name.startsWith('coil_ring')) c.material = ringMat;
      if (c.name.startsWith('screen')) c.material = screenMat;
    });
    this.coil = o.getObjectByName('coil');
    this.ring = o.getObjectByName('coil_ring');
    if (!this.coil) return; // an old model without the pivoting coil
    this.root.add(o);
    this.ready = true;
  }

  // ground(x, z) -> height of whatever the coil rides over.
  // aimAt: a ground point under the crosshair (used when pinpointing), or null.
  update(dt, { pos, yaw, ground, moving, pinpoint, aimAt, visible }) {
    this.root.visible = visible && this.ready;
    if (!this.root.visible) { this.coilPos = null; return null; }
    this.pin += ((pinpoint ? 1 : 0) - this.pin) * Math.min(1, dt * 6);
    this.sweep += dt * (moving ? 1.9 : 1.3) * (1 - this.pin);
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const hand = new THREE.Vector3(pos.x + rx * 0.2 + fx * 0.2, pos.y + HAND_HEIGHT, pos.z + rz * 0.2 + fz * 0.2);

    // Where the coil wants to be: out along the swing, as far as the shaft
    // reaches down to the ground; or, pinpointing, right where you're looking.
    const a = Math.sin(this.sweep) * SWING * (1 - this.pin);
    const dx = fx * Math.cos(a) + rx * -Math.sin(a), dz = fz * Math.cos(a) + rz * -Math.sin(a);
    let target;
    if (this.pin > 0.5 && aimAt) {
      const hx = aimAt.x - hand.x, hz = aimAt.z - hand.z;
      const h = Math.hypot(hx, hz);
      const k = THREE.MathUtils.clamp(h, 0.35, this.len * 0.95) / Math.max(h, 1e-4);
      target = new THREE.Vector3(hand.x + hx * k, 0, hand.z + hz * k);
    } else {
      let d = 0.75;
      target = new THREE.Vector3();
      for (let i = 0; i < 3; i++) {
        target.set(hand.x + dx * d, 0, hand.z + dz * d);
        const drop = hand.y - (ground(target.x, target.z) + RIDE);
        d = Math.sqrt(Math.max(0.09, this.len * this.len - drop * drop));
      }
    }
    target.y = ground(target.x, target.z) + RIDE;
    if (!this.coilPos) this.coilPos = target.clone();
    else this.coilPos.lerp(target, Math.min(1, dt * 14));
    this.coilPos.y = Math.max(this.coilPos.y, ground(this.coilPos.x, this.coilPos.z) + RIDE);

    // Keep the shaft its real length: the hand rises or drops to suit.
    const hz2 = (this.coilPos.x - hand.x) ** 2 + (this.coilPos.z - hand.z) ** 2;
    hand.y = this.coilPos.y + Math.sqrt(Math.max(0.04, this.len * this.len - hz2));

    aim(BOX_TO_COIL, tmp.copy(this.coilPos).sub(hand), this.q);
    this.root.position.copy(hand);
    this.root.quaternion.copy(this.q);

    // The coil pivots on the yoke to sit flat on the ground below it.
    const e = 0.15, c = this.coilPos;
    const n = new THREE.Vector3(
      ground(c.x - e, c.z) - ground(c.x + e, c.z), 2 * e, ground(c.x, c.z - e) - ground(c.x, c.z + e),
    ).normalize();
    const local = n.applyQuaternion(this.q.clone().invert());
    this.coil.quaternion.setFromUnitVectors(UP, local);
    this.ring?.quaternion.copy(this.coil.quaternion);

    this.root.updateMatrixWorld(true);
    return this.coil.localToWorld(this.sense.copy(PIVOT_TO_CENTRE));
  }
}
