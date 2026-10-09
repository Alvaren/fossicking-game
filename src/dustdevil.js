import * as THREE from 'three';

// Willy-willies: dust devils that spin up over hot dry ground on still summer
// afternoons, wander across the claim for half a minute and die away. Harmless
// enough, but you'll want to shut your eyes if one comes through.

const COUNT = 700;

// A soft round puff, so the dust doesn't look like confetti.
function puffTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class DustDevils {
  constructor(scene, terrain, sound) {
    this.scene = scene;
    this.terrain = terrain;
    this.sound = sound;
    this.next = 40 + Math.random() * 80;
    this.devil = null;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(COUNT * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.col = new Float32Array(COUNT * 4);
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 4));
    // Each particle: height up the column (0..1), angle, speed of spin, and size of its orbit.
    this.p = Array.from({ length: COUNT }, () => ({ h: Math.random(), a: Math.random() * Math.PI * 2, w: 2.5 + Math.random() * 3, o: 0.6 + Math.random() * 0.8 }));
    this.mat = new THREE.PointsMaterial({
      map: puffTexture(), size: 1.1, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true, vertexColors: true,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    scene.add(this.points);
  }

  // Hot, dry and still: early-to-mid afternoon in clear weather.
  spawn(player) {
    const T = this.terrain;
    for (let k = 0; k < 20; k++) {
      const a = Math.random() * Math.PI * 2, d = 35 + Math.random() * 40;
      const x = player.x + Math.cos(a) * d, z = player.z + Math.sin(a) * d;
      if (Math.abs(x) > 105 || Math.abs(z) > 105) continue;
      if (T.waterDepth(x, z) > 0 || T.creek.local(x, z, {}).d < 8) continue;
      // Drift roughly across your path, so you get a good look at it.
      const toward = Math.atan2(player.z - z, player.x - x) + (Math.random() - 0.5) * 1.4;
      const sp = 1.6 + Math.random() * 1.8;
      this.devil = {
        x, z, vx: Math.cos(toward) * sp, vz: Math.sin(toward) * sp,
        age: 0, life: 22 + Math.random() * 22, height: 14 + Math.random() * 12, r: 1.4 + Math.random() * 1.2, hit: false,
      };
      this.points.visible = true;
      return;
    }
  }

  update(dt, { hour, storm, player, active }) {
    const hot = hour > 11.5 && hour < 16.5 && storm < 0.05;
    if (!this.devil) {
      this.sound.setWhirl?.(0, 0);
      if (!active || !hot) return null;
      this.next -= dt;
      if (this.next <= 0) {
        this.next = 70 + Math.random() * 120;
        this.spawn(player);
      }
      return null;
    }
    const D = this.devil;
    D.age += dt;
    // Wanders as it goes, and dies if it hits water or rain.
    const wob = Math.sin(D.age * 0.7) * 0.6;
    D.x += (D.vx + -D.vz * wob * 0.3) * dt;
    D.z += (D.vz + D.vx * wob * 0.3) * dt;
    if (this.terrain.waterDepth(D.x, D.z) > 0.05 || storm > 0.1) D.life = Math.min(D.life, D.age + 2);
    const fade = Math.min(1, D.age / 4, (D.life - D.age) / 4);
    if (fade <= 0) {
      this.devil = null;
      this.points.visible = false;
      return null;
    }
    const gy = this.terrain.getHeight(D.x, D.z);
    for (let i = 0; i < COUNT; i++) {
      const q = this.p[i];
      q.h += dt * (0.08 + q.o * 0.05);
      if (q.h > 1) { q.h -= 1; q.a = Math.random() * Math.PI * 2; }
      // Thick with dust low down, thinning out up the column.
      const k = i * 4, shade = 0.75 + 0.25 * q.o;
      this.col[k] = 0.80 * shade; this.col[k + 1] = 0.64 * shade; this.col[k + 2] = 0.48 * shade;
      this.col[k + 3] = Math.pow(1 - q.h, 1.6) * Math.min(1, q.h * 12);
      // A funnel: tight at the ground, wide and thin at the top, leaning with the drift.
      const rad = D.r * q.o * (0.35 + q.h * 1.6) * (1 + 0.2 * Math.sin(D.age * 3 + i));
      q.a += dt * q.w * (1.3 - q.h * 0.6);
      const lean = q.h * q.h * 3;
      this.pos[i * 3] = D.x + Math.cos(q.a) * rad + D.vx * lean * 0.4;
      this.pos[i * 3 + 1] = gy + q.h * D.height * (0.8 + 0.2 * fade);
      this.pos[i * 3 + 2] = D.z + Math.sin(q.a) * rad + D.vz * lean * 0.4;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    this.mat.opacity = 0.62 * fade;
    const dist = Math.hypot(player.x - D.x, player.z - D.z);
    this.sound.setWhirl?.(fade * Math.max(0, 1 - dist / 45), Math.max(0, 1 - dist / 12));
    if (!D.hit && dist < D.r * 1.6) { D.hit = true; return 'hit'; }
    return D.age < dt * 1.5 ? 'spawned' : null;
  }

  get near() { return this.devil; }
}
