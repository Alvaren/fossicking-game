import * as THREE from 'three';
import { mulberry32, smoothstep } from './noise.js';
import { rockWaterLevel } from './rockmaterials.js';

// Running water: a ribbon that follows the creek's real long profile, with a
// flow-mapped surface whose speed, foam and clarity come from the velocity
// field and the water depth. Leaves drift on the current so you can read it.

const vert = /* glsl */`
attribute float aSpeed;
attribute float aDepth;
attribute float aFoam;
varying vec2 vUv;
varying float vSpeed;
varying float vDepth;
varying float vFoam;
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vSpeed = aSpeed;
  vDepth = aDepth;
  vFoam = aFoam;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const frag = /* glsl */`
uniform float time;
uniform sampler2D nmap;
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform vec3 skyColor;
uniform vec3 horizonColor;
uniform vec3 shallowColor;
uniform vec3 deepColor;
uniform vec3 turbidColor;
uniform float level;
uniform float flood;
uniform float lightLevel;
varying vec2 vUv;
varying float vSpeed;
varying float vDepth;
varying float vFoam;
varying vec3 vWorld;
#include <fog_pars_fragment>

// Two-phase flow map: the pattern slides downstream at the local speed and
// resets while faded out, so it never smears.
vec3 flowSample(vec2 uv, float scale, float speed, float t) {
  float ph0 = fract(t);
  float ph1 = fract(t + 0.5);
  float w0 = 1.0 - abs(1.0 - 2.0 * ph0);
  vec2 off0 = vec2(0.0, speed * ph0 * 3.0);
  vec2 off1 = vec2(0.37, speed * ph1 * 3.0 + 0.21);
  vec3 a = texture2D(nmap, (uv - off0) * scale).xyz;
  vec3 b = texture2D(nmap, (uv - off1) * scale).xyz;
  return mix(b, a, w0);
}

void main() {
  // Depth is stored relative to normal water level; a flood lifts it everywhere.
  float depth = vDepth + level;
  float spd = vSpeed * (1.0 + 1.6 * level) + flood * 0.7;
  vec3 n1 = flowSample(vUv, 0.55, spd, time * 0.33) * 2.0 - 1.0;
  vec3 n2 = flowSample(vUv * vec2(1.0, 0.6) + 3.1, 0.31, spd * 0.8, time * 0.21 + 0.4) * 2.0 - 1.0;
  float chop = 0.09 + spd * 0.3 + vFoam * .09;
  vec3 fine = flowSample(vUv, 2.1, spd, time*.4).xyz * 2.0 - 1.0;
  n1.xy += fine.xy * .12;
  vec3 N = normalize(vec3((n1.x + n2.x * 0.35) * chop, 1.0, (n1.y + n2.y * 0.35) * chop));

  vec3 V = normalize(cameraPosition - vWorld);
  vec3 R = reflect(-V, N);
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 refl = mix(horizonColor, skyColor, smoothstep(0.0, 0.5, R.y));
  float spec = pow(max(dot(R, sunDir), 0.0), 220.0);

  float deep = smoothstep(0.05, 1.1, depth);
  vec3 body = mix(shallowColor, deepColor, deep);
  body = mix(body, turbidColor, flood * 0.9); // floodwater runs thick and brown
  body *= lightLevel;
  // Muddy floodwater barely mirrors the sky.
  vec3 col = mix(body, refl, fres * (1.0 - 0.7 * flood)) + sunColor * spec * 2.5 * (1.0 - flood);
  float alpha = mix(mix(0.14, 0.84, deep), mix(0.62, 0.97, deep), flood);
  alpha = max(alpha, fres * 0.9);

  // Foam and white water on fast, shallow runs and around boulders.
  float fn = flowSample(vUv * 1.7, 0.9, spd * 1.3, time * 0.5).x;
  float fv = min(1.0, vFoam + flood * 0.45);
  float foam = fv * smoothstep(0.48, 0.78, fn + fv * 0.25);
  vec3 foamCol = mix(vec3(0.86, 0.88, 0.86), turbidColor * 1.6, flood * 0.6);
  foamCol *= lightLevel;
  col = mix(col, foamCol, foam * 0.85);
  alpha = max(alpha, foam * 0.9);

  // Soft shoreline.
  alpha *= smoothstep(0.0, 0.07, depth);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

// Both the claim and foot-access rivers use this depth/flow/foam shader. Their
// existing terrain and river profiles remain responsible for physical data.
export function riverWaterMaterial(sunDir = new THREE.Vector3(-.45,.8,.25).normalize()) {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    time: {value:0}, nmap: {value:rippleTexture()}, sunDir: {value:sunDir.clone()},
    sunColor: {value:new THREE.Color(0xfff0d8)}, skyColor: {value:new THREE.Color(0x9cc4ec)},
    horizonColor: {value:new THREE.Color(0xe6ecee)}, shallowColor: {value:new THREE.Color(0xa8a078)},
    deepColor: {value:new THREE.Color(0x56664a)}, turbidColor: {value:new THREE.Color(0x7a5434)},
    level: {value:0}, flood: {value:0}, lightLevel: {value:1},
  }]);
  const material = new THREE.ShaderMaterial({ vertexShader:vert, fragmentShader:frag, uniforms, transparent:true, depthWrite:false, fog:true });
  material.userData.environment = 'water';
  return { material, uniforms };
}

let foamTexture;
export function foamRibbonTexture() {
  if (foamTexture) return foamTexture;
  const c=document.createElement('canvas');c.width=32;c.height=128;
  const g=c.getContext('2d');
  for(let i=0;i<8;i++) {
    const x=8+(i%3)*7,y=8+i*14;
    const gradient=g.createRadialGradient(x,y,0,x,y,9);
    gradient.addColorStop(0,'rgba(255,255,255,.8)');gradient.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=gradient;g.fillRect(x-9,y-9,18,18);
  }
  foamTexture=new THREE.CanvasTexture(c);return foamTexture;
}

export class Water {
  constructor(scene, terrain, sunDir) {
    this.terrain = terrain;
    this.creek = terrain.creek;
    const C = this.creek;

    const ROWS_FROM = 700, ROWS_TO = -700, STEP = 1.5, M = 34;
    const rows = Math.floor((ROWS_FROM - ROWS_TO) / STEP) + 1;
    const count = rows * (M + 1);
    const pos = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2);
    const speed = new Float32Array(count);
    const depth = new Float32Array(count);
    const foam = new Float32Array(count);
    const vel = { x: 0, z: 0, speed: 0 };
    let s = 0;
    for (let r = 0; r < rows; r++) {
      const z = ROWS_FROM - r * STEP;
      const d = C.dcx(z);
      const stretch = Math.sqrt(1 + d * d);
      if (r > 0) s += STEP * stretch;
      const w = C.halfWidth(z) + 9.5; // wide enough to spill over the bars in flood
      const wy = C.waterY(z);
      for (let k = 0; k <= M; k++) {
        const n = -w + (2 * w * k) / M;
        const x = C.cx(z) + n * stretch; // rows run along constant z, like the terrain
        const i = r * (M + 1) + k;
        pos[i * 3] = x; pos[i * 3 + 1] = wy; pos[i * 3 + 2] = z;
        uv[i * 2] = n; uv[i * 2 + 1] = s;
        C.velocity(x, z, vel);
        const bed = terrain.inside(x, z) ? terrain.getHeight(x, z) : terrain.rawHeight(x, z);
        const dep = wy - bed; // signed: negative where the bank is dry at normal level
        speed[i] = vel.speed;
        depth[i] = Math.max(-3, Math.min(2, dep));
        let f = Math.min(1, Math.max(0, (vel.speed - 0.7) * 1.6)) * smoothstep(0.6, 0.12, dep);
        for (const b of C.boulders) {
          const dist = Math.hypot(x - b.x, z - b.z);
          if (dist < b.r * 3) f = Math.max(f, Math.exp(-((dist - b.r) ** 2) / 0.25) * 0.9);
        }
        foam[i] = f;
      }
    }
    const index = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let k = 0; k < M; k++) {
        const a = r * (M + 1) + k, b = a + 1, c = a + M + 1, d2 = c + 1;
        // Rows run toward -z, so wind the other way to face up.
        index.push(a, b, c, b, d2, c);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setIndex(index);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    geo.setAttribute('aDepth', new THREE.BufferAttribute(depth, 1));
    geo.setAttribute('aFoam', new THREE.BufferAttribute(foam, 1));
    geo.computeBoundingSphere();

    const surface = riverWaterMaterial(sunDir);
    this.uniforms = surface.uniforms;
    const mat = surface.material;
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);

    this.buildLeaves(scene);
    this.mesh.visible = this.leaves.visible = !this.creek.dry;
  }

  buildLeaves(scene) {
    const COUNT = 90;
    const geo = new THREE.PlaneGeometry(0.11, 0.06).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide });
    this.leaves = new THREE.InstancedMesh(geo, mat, COUNT);
    this.leafState = [];
    const r = mulberry32(5);
    const c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      this.leafState.push({ x: 0, z: 0, rot: r() * 6.28, spin: (r() - 0.5) * 0.6, alive: false });
      const v = r();
      c.setRGB(0.45 + v * 0.3, 0.38 + v * 0.15, 0.2, THREE.SRGBColorSpace);
      this.leaves.setColorAt(i, c);
    }
    this.leaves.frustumCulled = false;
    scene.add(this.leaves);
    this.m4 = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.up = new THREE.Vector3(0, 1, 0);
    this.v = { x: 0, z: 0, speed: 0 };
  }

  spawnLeaf(L, px, pz, upstreamOnly) {
    const C = this.creek;
    for (let k = 0; k < 6; k++) {
      const z = upstreamOnly ? pz + 8 + Math.random() * 40 : pz + (Math.random() * 2 - 1) * 40;
      const w = C.halfWidth(z);
      const n = (Math.random() * 2 - 1) * 0.85 * w;
      const d = C.dcx(z);
      const x = C.cx(z) + n * Math.sqrt(1 + d * d);
      if (this.terrain.waterDepth(x, z) > 0.08) {
        L.x = x; L.z = z; L.alive = true; L.stuck = 0;
        return;
      }
    }
    L.alive = false;
  }

  update(dt, time, player, flood = 0) {
    this.uniforms.time.value = time;
    this.uniforms.level.value = this.creek.level;
    rockWaterLevel.value = this.creek.waterOffset;
    this.terrain.material.userData.waterLevel.value = this.creek.waterOffset;
    if (this.creek.dry) return;
    this.uniforms.flood.value = flood;
    this.mesh.position.y = this.creek.level;
    const C = this.creek;
    const v = this.v;
    for (let i = 0; i < this.leafState.length; i++) {
      const L = this.leafState[i];
      if (!L.alive) this.spawnLeaf(L, player.x, player.z, false);
      else {
        C.velocity(L.x, L.z, v);
        // A little turbulence so leaves don't move in lockstep.
        L.x += (v.x + (Math.random() - 0.5) * 0.15 * v.speed) * dt;
        L.z += (v.z + (Math.random() - 0.5) * 0.15 * v.speed) * dt;
        L.rot += L.spin * dt * (0.3 + v.speed * 2);
        L.stuck = v.speed < 0.02 ? L.stuck + dt : 0;
        const far = Math.abs(L.z - player.z) > 48 || Math.abs(L.x - player.x) > 48;
        if (far || L.stuck > 25 || this.terrain.waterDepth(L.x, L.z) < 0.02) this.spawnLeaf(L, player.x, player.z, true);
      }
      this.q.setFromAxisAngle(this.up, L.rot);
      this.m4.compose(
        new THREE.Vector3(L.x, L.alive ? C.surfaceY(L.z) + 0.012 : -999, L.z),
        this.q,
        new THREE.Vector3(1, 1, 1),
      );
      this.leaves.setMatrixAt(i, this.m4);
    }
    this.leaves.instanceMatrix.needsUpdate = true;
  }
}

// Tileable ripple normal map from a sum of integer-frequency waves.
function rippleTexture() {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(s, s);
  const waves = [];
  const r = mulberry32(99);
  for (let k = 0; k < 22; k++) {
    // Mostly higher frequencies so the pattern doesn't read as a grid.
    const a = Math.floor(r() * 15) - 7, b = Math.floor(r() * 15) - 7 || 3;
    waves.push({ a, b, p: r() * 6.28, amp: (0.4 + r()) / Math.sqrt(a * a + b * b) });
  }
  const tau = Math.PI * 2;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const u = x / s, v = y / s;
      let dx = 0, dy = 0;
      for (const w of waves) {
        const cph = Math.cos(tau * (w.a * u + w.b * v) + w.p) * w.amp;
        dx += cph * w.a;
        dy += cph * w.b;
      }
      const nx = -dx * 0.12, ny = -dy * 0.12, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      const i = (y * s + x) * 4;
      img.data[i] = (nx / l * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz / l * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}
