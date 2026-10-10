import * as THREE from 'three';
import { smoothstep } from './noise.js';

// Day and night. A day is 20 minutes: the sun rises in the east, crosses the
// northern sky (we're in Australia) and sets in the west; then stars, a moon
// and moonlight. Every frame this works out the clear-sky lighting, and the
// weather darkens it further when a storm comes through.

export const SECONDS_PER_HOUR = 50;
const SUNRISE = 5.5, SUNSET = 18.5;
const MAX_ELEVATION = THREE.MathUtils.degToRad(62);

const C = (hex) => new THREE.Color(hex);
const DAY = {
  hemiSky: C(0xcfe0ff), hemiGround: C(0x8a5a3a), fog: C(0xcdbfa8),
  waterSky: C(0x9cc4ec), waterHorizon: C(0xe6ecee), sun: C(0xfff0dc),
};
const DUSK = { fog: C(0xd59a6a), waterHorizon: C(0xf2a874), sun: C(0xffa25a), hemiSky: C(0xf0b48a) };
const NIGHT = {
  hemiSky: C(0x34446c), hemiGround: C(0x1a1410), fog: C(0x0c1120),
  waterSky: C(0x0b1222), waterHorizon: C(0x18213a), moon: C(0x9fb4ff),
};

export class DayNight {
  constructor({ scene, sky, sunDir, hour = 9 }) {
    this.scene = scene;
    this.sky = sky;
    this.sunDir = sunDir; // shared: the sky, the water and the shadow light all read it
    this.hour = hour;
    this.lightDir = new THREE.Vector3();
    this.base = {
      sun: 3.4, sunColor: new THREE.Color(), hemi: 1.1, hemiColor: new THREE.Color(), hemiGround: new THREE.Color(),
      env: 0.6, fog: new THREE.Color(), fogNear: 90, fogFar: 650,
      waterSky: new THREE.Color(), waterHorizon: new THREE.Color(), exposure: 0.62,
    };
    this.buildStars();
    this.buildMoon();
    this.update(0);
  }

  buildStars() {
    const N = 1800;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // Upper hemisphere mostly, a few near the horizon.
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2;
      const y = Math.abs(u) * 0.98 + 0.02;
      const r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(a) * r * 1800, y * 1800, Math.sin(a) * r * 1800], i * 3);
      const b = 0.5 + Math.random() * 0.5, warm = Math.random();
      col.set([b, b * (0.9 + warm * 0.1), b * (0.85 + (1 - warm) * 0.15)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({
      size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false,
    }));
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);
  }

  buildMoon() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
    g.addColorStop(0, 'rgba(250,250,240,1)');
    g.addColorStop(0.32, 'rgba(240,240,230,1)');
    g.addColorStop(0.36, 'rgba(200,210,255,0.35)');
    g.addColorStop(1, 'rgba(160,180,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    // A few maria.
    ctx.fillStyle = 'rgba(180,180,170,0.5)';
    for (const [x, y, r] of [[54, 56, 7], [72, 66, 9], [60, 76, 5]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false }));
    this.moon.scale.setScalar(180);
    this.scene.add(this.moon);
  }

  // 0 at night, 1 in full day.
  get daylight() { return this._daylight; }
  get isNight() { return this.hour >= 19 || this.hour < 5; }

  clockText() {
    const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60);
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  }

  update(dt, camPos) {
    // Nights pass about twice as fast as days.
    const fast = this.sunDir.y < -0.12 ? 1.9 : 1;
    this.hour = (this.hour + (dt * fast) / SECONDS_PER_HOUR) % 24;
    const a = ((this.hour - SUNRISE) / (SUNSET - SUNRISE)) * Math.PI; // 0 at sunrise, PI at sunset
    // East is +x, north is -z.
    this.sunDir.set(Math.cos(a), Math.sin(a) * Math.sin(MAX_ELEVATION), -Math.sin(a) * Math.cos(MAX_ELEVATION)).normalize();
    const y = this.sunDir.y;
    const day = smoothstep(-0.1, 0.18, y);
    const dusk = smoothstep(-0.16, 0.0, y) * (1 - smoothstep(0.02, 0.32, y));
    this._daylight = day;
    const night = 1 - day;
    const b = this.base;

    // The moon rides roughly opposite the sun.
    const moonDir = new THREE.Vector3(-this.sunDir.x, Math.max(0.25, -this.sunDir.y), -this.sunDir.z * 0.4 - 0.3).normalize();

    if (y > -0.04) {
      this.lightDir.copy(this.sunDir);
      b.sun = 3.0 * smoothstep(-0.04, 0.22, y);
      b.sunColor.copy(DAY.sun).lerp(DUSK.sun, dusk);
    } else {
      this.lightDir.copy(moonDir);
      b.sun = 0.4 * smoothstep(-0.04, -0.2, y);
      b.sunColor.copy(NIGHT.moon);
    }
    b.hemi = 0.1 + 1.2 * day;
    b.hemiColor.copy(NIGHT.hemiSky).lerp(DAY.hemiSky, day).lerp(DUSK.hemiSky, dusk * 0.5);
    b.hemiGround.copy(NIGHT.hemiGround).lerp(DAY.hemiGround, day);
    b.env = 0.03 + 0.57 * day;
    b.fog.copy(NIGHT.fog).lerp(DAY.fog, day).lerp(DUSK.fog, dusk * 0.7);
    b.fogNear = 30 + 30 * day;
    b.fogFar = 300 + 240 * day;
    b.waterSky.copy(NIGHT.waterSky).lerp(DAY.waterSky, day);
    b.waterHorizon.copy(NIGHT.waterHorizon).lerp(DAY.waterHorizon, day).lerp(DUSK.waterHorizon, dusk * 0.8);
    // Open the eye up a little at night so moonlit ground is still readable.
    b.exposure = 0.62 + 0.3 * night;

    this.sky.material.uniforms.sunPosition.value.copy(this.sunDir);
    this.stars.material.opacity = smoothstep(0.35, 0.95, night);
    if (camPos) {
      this.stars.position.copy(camPos);
      this.moon.position.copy(camPos).addScaledVector(moonDir, 1700);
    }
    this.moon.material.opacity = smoothstep(0.4, 0.9, night);
  }
}
