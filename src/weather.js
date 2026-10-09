import * as THREE from 'three';

// Storms and floods. Every so often a storm builds upstream, the creek rises
// brown and fast, then falls again. While it's high the flood reworks the bed:
// holes in the channel fill with fresh gravel and new stones wash onto the bars.

const PHASES = {
  building: 60, // clouds, wind, distant thunder
  rising: 25,   // rain, the creek comes up
  peak: 30,
  falling: 45,
  clearing: 40,
};

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

export class Weather {
  constructor({ renderer, scene, sky, sun, hemi, creek, water, sound, onEvent }) {
    Object.assign(this, { renderer, scene, sky, sun, hemi, creek, water, sound, onEvent });
    this.exposure = renderer.toneMappingExposure;
    this.phase = 'calm';
    this.t = 0;
    this.next = 6 * 60 + Math.random() * 180; // first storm a few minutes in
    this.storm = 0;   // 0 clear .. 1 black sky and heavy rain
    this.flood = 0;   // 0 normal .. 1 thick brown floodwater
    this.peak = 0.9;
    this.flash = 0;
    this.thunderIn = 0;
    this.speed = 1;

    this.fog = scene.fog;
    this.clearFog = { color: scene.fog.color.clone(), near: scene.fog.near, far: scene.fog.far };
    this.stormFog = new THREE.Color(0x77736e);
    this.hemiSky = hemi.color.clone();
    this.hemiStorm = new THREE.Color(0x8c96a0);
    this.waterSky = water.uniforms.skyColor.value.clone();
    this.waterHorizon = water.uniforms.horizonColor.value.clone();
    this.stormSkyCol = new THREE.Color(0x6a7078);
    this.buildRain();
  }

  get active() { return this.phase !== 'calm'; }

  // Minutes until the next storm, for the gold buyer's weather gossip.
  forecast() {
    if (this.phase !== 'calm') return null;
    return Math.max(1, Math.round(this.next / 60));
  }

  trigger(fast = false) {
    if (this.phase !== 'calm') return;
    this.speed = fast ? 4 : 1;
    this.begin('building');
  }

  begin(phase) {
    this.phase = phase;
    this.t = 0;
    if (phase === 'building') this.peak = 0.75 + Math.random() * 0.35;
    this.onEvent(phase, this);
  }

  buildRain() {
    const N = 2600;
    this.rainN = N;
    const pos = new Float32Array(N * 6);
    this.drops = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      this.drops[i * 3] = (Math.random() - 0.5) * 50;
      this.drops[i * 3 + 1] = Math.random() * 25;
      this.drops[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      color: 0xb8c2cc, transparent: true, opacity: 0, depthWrite: false,
    }));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.scene.add(this.rain);
  }

  update(dt, cam) {
    const step = dt * this.speed;
    this.t += step;
    const dur = PHASES[this.phase];
    const k = dur ? Math.min(1, this.t / dur) : 0;
    let level = 0;

    switch (this.phase) {
      case 'calm':
        this.next -= dt;
        this.storm = Math.max(0, this.storm - dt * 0.02);
        if (this.next <= 0) this.begin('building');
        break;
      case 'building':
        this.storm = ease(k) * 0.65;
        if (k >= 1) this.begin('rising');
        break;
      case 'rising':
        this.storm = lerp(0.65, 1, k);
        this.flood = ease(k);
        level = this.peak * ease(k);
        if (k >= 1) this.begin('peak');
        break;
      case 'peak':
        this.storm = 1;
        this.flood = 1;
        level = this.peak;
        if (k >= 1) this.begin('falling');
        break;
      case 'falling':
        this.storm = lerp(1, 0.35, k);
        this.flood = lerp(1, 0.35, k);
        level = this.peak * (1 - ease(k));
        if (k >= 1) this.begin('clearing');
        break;
      case 'clearing':
        this.storm = lerp(0.35, 0, k);
        this.flood = lerp(0.35, 0, ease(k));
        if (k >= 1) {
          this.phase = 'calm';
          this.speed = 1;
          this.next = 9 * 60 + Math.random() * 6 * 60;
          this.onEvent('calm', this);
        }
        break;
    }
    this.creek.level = level;

    // Thunder: flash first, rumble a beat later, more often at the height of it.
    if (this.storm > 0.3) {
      this.thunderIn -= dt;
      if (this.thunderIn <= 0) {
        this.thunderIn = (6 + Math.random() * 14) / this.storm;
        const near = this.storm > 0.8 && Math.random() < 0.6;
        if (near) this.flash = 1;
        this.sound.thunder(near ? 0.9 : 0.4, near ? 0.4 + Math.random() * 0.8 : 1.5 + Math.random() * 2);
      }
    }
    this.flash = Math.max(0, this.flash - dt * 6);

    this.apply(cam, dt);
  }

  apply(cam, dt) {
    const s = this.storm;
    const u = this.sky.material.uniforms;
    u.turbidity.value = lerp(5, 14, s);
    u.rayleigh.value = lerp(1.1, 3.2, s);
    if (u.cloudCoverage) u.cloudCoverage.value = lerp(0.25, 0.97, s);
    if (u.cloudDensity) u.cloudDensity.value = lerp(0.4, 0.9, s);
    this.sun.intensity = lerp(3.4, 0.5, s);
    this.renderer.toneMappingExposure = lerp(this.exposure, this.exposure * 0.55, s) * (1 + this.flash * 0.8);
    this.hemi.intensity = lerp(1.1, 0.75, s) + this.flash * 2.5;
    this.hemi.color.copy(this.hemiSky).lerp(this.hemiStorm, s);
    this.scene.environmentIntensity = lerp(0.6, 0.22, s);
    this.fog.color.copy(this.clearFog.color).lerp(this.stormFog, s);
    this.fog.near = lerp(this.clearFog.near, 25, s);
    this.fog.far = lerp(this.clearFog.far, 230, s);
    this.water.uniforms.skyColor.value.copy(this.waterSky).lerp(this.stormSkyCol, s);
    this.water.uniforms.horizonColor.value.copy(this.waterHorizon).lerp(this.stormSkyCol, s);
    this.sound.setRain(Math.max(0, (s - 0.55) / 0.45));

    // Rain streaks around the camera.
    const rainK = Math.max(0, (s - 0.6) / 0.4);
    this.rain.visible = rainK > 0.01;
    if (!this.rain.visible) return;
    this.rain.material.opacity = rainK * 0.45;
    const p = this.rain.geometry.attributes.position.array;
    const d = this.drops;
    const fall = 16 * dt;
    for (let i = 0; i < this.rainN; i++) {
      d[i * 3 + 1] -= fall;
      if (d[i * 3 + 1] < -2) {
        d[i * 3] = (Math.random() - 0.5) * 50;
        d[i * 3 + 1] = 20 + Math.random() * 5;
        d[i * 3 + 2] = (Math.random() - 0.5) * 50;
      }
      const x = cam.x + d[i * 3], y = cam.y + d[i * 3 + 1], z = cam.z + d[i * 3 + 2];
      p[i * 6] = x; p[i * 6 + 1] = y; p[i * 6 + 2] = z;
      p[i * 6 + 3] = x + 0.06; p[i * 6 + 4] = y - 0.45; p[i * 6 + 5] = z + 0.03;
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
  }
}
