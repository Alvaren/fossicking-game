import * as THREE from 'three';
import { mulberry32 } from './noise.js';

// The good-looking materials: gold that reads as gold, and stones that bend
// light. All built on three's physical materials with a few small shader
// tweaks, so they stay light enough for the browser.

// ---------- shared shader bits ----------

const NOISE_GLSL = `
float mHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float mNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(mHash(i), mHash(i + vec3(1, 0, 0)), f.x), mix(mHash(i + vec3(0, 1, 0)), mHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(mHash(i + vec3(0, 0, 1)), mHash(i + vec3(1, 0, 1)), f.x), mix(mHash(i + vec3(0, 1, 1)), mHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float mFbm(vec3 p) { return mNoise(p) * 0.55 + mNoise(p * 2.03 + 7.1) * 0.3 + mNoise(p * 4.1 + 3.3) * 0.15; }
`;

// Bump the shading normal by a height worked out in the shader (no texture
// or UVs needed): the screen-space trick three uses for bump maps. The height
// is in world units (a fraction of the object's size), so the bump looks the
// same on a 5 mm flake as on a big nugget.
const BUMP_GLSL = (height, scale) => `{
  float bh = (${height}) * (${scale}) * vObjScale;
  vec3 dpdx = dFdx(-vViewPosition), dpdy = dFdy(-vViewPosition);
  vec3 r1 = cross(dpdy, normal), r2 = cross(normal, dpdx);
  float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (dFdx(bh) * r1 + dFdy(bh) * r2);
  normal = normalize(abs(det) * normal - grad);
}`;

// Object-space position (and normal) for the procedural detail, so it sticks
// to the stone however it's turned.
function objectSpaceVaryings(sh) {
  sh.vertexShader = sh.vertexShader
    .replace('void main() {', 'attribute float cavity;\nvarying float vCavity;\nvarying vec3 vObjPos;\nvarying vec3 vObjN;\nvarying float vObjScale;\nvoid main() {')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;\nvObjN = normal;\nvCavity = cavity;\nvObjScale = length((modelMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);');
  sh.fragmentShader = sh.fragmentShader
    .replace('void main() {', `varying float vCavity;\nvarying vec3 vObjPos;\nvarying vec3 vObjN;\nvarying float vObjScale;\n${NOISE_GLSL}\nvoid main() {`);
}

// ---------- gold ----------

// Gold's measured reflectance, straight into the linear working colour.
// (Pushed a touch warmer than the lab figure: the tone mapping washes it out.)
const GOLD = new THREE.Color().setRGB(1.0, 0.66, 0.2, THREE.LinearSRGBColorSpace);

const GOLD_STYLES = {
  // Creek nuggets: tumbled to a satin sheen, polished on the high points, clay in the hollows.
  waterworn: { roughness: 0.34, polish: 1, dirt: 0.9, bump: 0.5, freq: 3 },
  // Reef gold and crystalline specimens: crisp and bright, little wear.
  crystalline: { roughness: 0.17, polish: 0.4, dirt: 0.45, bump: 0.2, freq: 6 },
  // Flakes and fines: lots of tiny glittering facets.
  fine: { roughness: 0.24, polish: 0.8, dirt: 0, bump: 1.1, freq: 16 },
};

const goldCache = {};
export function goldMaterial(style = 'waterworn', { emissive = 0 } = {}) {
  const key = `${style}-${emissive}`;
  if (goldCache[key]) return goldCache[key];
  const st = GOLD_STYLES[style];
  const mat = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: st.roughness, emissive: new THREE.Color(emissive) });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, {
      uPolish: { value: st.polish }, uDirt: { value: st.dirt }, uBump: { value: st.bump }, uFreq: { value: st.freq },
    });
    objectSpaceVaryings(sh);
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', 'uniform float uPolish, uDirt, uBump, uFreq;\nvoid main() {')
      .replace('#include <color_fragment>', `#include <color_fragment>
  float gH = mFbm(vObjPos * uFreq);
  // Iron-stained clay packed into the hollows.
  float gDirt = clamp(smoothstep(0.2, 0.75, vCavity + (gH - 0.5) * 0.6) * uDirt, 0.0, 1.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.13, 0.06, 0.025), gDirt);`)
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness;
  roughnessFactor *= mix(1.0, 0.35, uPolish * smoothstep(0.52, 0.78, gH) * (1.0 - gDirt)); // rubbed bright on the high spots
  roughnessFactor = mix(roughnessFactor, 0.95, gDirt);
  roughnessFactor = clamp(roughnessFactor + (mNoise(vObjPos * uFreq * 7.0) - 0.5) * 0.14, 0.05, 1.0);`)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n  metalnessFactor *= 1.0 - gDirt;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  ${BUMP_GLSL('mFbm(vObjPos * uFreq * 2.6)', 'uBump * 0.03')}`);
  };
  mat.customProgramCacheKey = () => 'gold-v1';
  goldCache[key] = mat;
  return mat;
}

// How hollow each vertex sits relative to its neighbours (0 proud .. 1 deep
// hollow), for dirt in the crevices. Needs an indexed geometry with normals.
export function addCavity(geo) {
  if (!geo.index) return geo;
  const p = geo.attributes.position, n = geo.attributes.normal, idx = geo.index.array, N = p.count;
  const sum = new Float32Array(N * 3), cnt = new Uint16Array(N);
  let edge = 0, edges = 0;
  for (let t = 0; t < idx.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = idx[t + e], b = idx[t + (e + 1) % 3];
      for (const [i, j] of [[a, b], [b, a]]) {
        sum[i * 3] += p.getX(j); sum[i * 3 + 1] += p.getY(j); sum[i * 3 + 2] += p.getZ(j);
        cnt[i]++;
      }
      edge += Math.hypot(p.getX(a) - p.getX(b), p.getY(a) - p.getY(b), p.getZ(a) - p.getZ(b));
      edges++;
    }
  }
  edge /= edges || 1;
  const cav = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    if (!cnt[i]) continue;
    const dx = sum[i * 3] / cnt[i] - p.getX(i), dy = sum[i * 3 + 1] / cnt[i] - p.getY(i), dz = sum[i * 3 + 2] / cnt[i] - p.getZ(i);
    const d = (dx * n.getX(i) + dy * n.getY(i) + dz * n.getZ(i)) / edge; // neighbours above you: you're in a hollow
    cav[i] = THREE.MathUtils.clamp(0.35 + d * 3, 0, 1);
  }
  geo.setAttribute('cavity', new THREE.BufferAttribute(cav, 1));
  return geo;
}

// ---------- the sky the shiny things reflect ----------

// A small scene of what's around you: the real sky (sun and all), red-brown
// ground below and a line of gums on the horizon. Rendered into a reflection
// map now and then as the sun moves.
export function makeEnvironment(renderer, skyMesh) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(skyMesh.geometry, skyMesh.material);
  envSky.scale.setScalar(60);
  envScene.add(envSky);
  // A warm haze over the sky: in reflections the raw blue turns gold greenish,
  // where real sun-and-haze light keeps it warm.
  const hazeMat = new THREE.MeshBasicMaterial({ color: 0xfff1dc, side: THREE.BackSide, transparent: true, opacity: 0.55, depthWrite: false });
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(44, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2 + 0.05), hazeMat));
  const groundMat = new THREE.MeshBasicMaterial({ color: 0x6a3f28, side: THREE.BackSide });
  const ground =new THREE.Mesh(new THREE.SphereGeometry(40, 32, 8, 0, Math.PI * 2, Math.PI / 2 - 0.03, Math.PI / 2 + 0.03), groundMat);
  envScene.add(ground);
  // Gum-tree silhouettes around the horizon.
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 64;
  const g = c.getContext('2d');
  const r = mulberry32(31);
  g.fillStyle = '#fff';
  for (let x = 0; x < 1024; x += 6 + r() * 14) {
    const h = 14 + r() * 44, w = 10 + r() * 36;
    g.beginPath();
    g.ellipse(x, 64 - h * 0.7, w, h * 0.45, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillRect(0, 52, 1024, 12);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  const treeMat = new THREE.MeshBasicMaterial({ color: 0x2c3326, alphaMap: tex, transparent: true, side: THREE.BackSide, depthWrite: false });
  const trees = new THREE.Mesh(new THREE.CylinderGeometry(38, 38, 7, 48, 1, true), treeMat);
  trees.position.y = 2;
  envScene.add(trees);

  let rt = null;
  const soil = new THREE.Color(0x7a4a30), bush = new THREE.Color(0x3a4530);
  return {
    // daylight 0..1 dims the ground and trees along with the sky.
    update(daylight) {
      const k = 0.03 + 0.55 * daylight;
      groundMat.color.copy(soil).multiplyScalar(k);
      hazeMat.color.setHex(0xfff1dc).multiplyScalar(0.02 + 0.85 * daylight);
      treeMat.color.copy(bush).multiplyScalar(k * 0.8);
      const next = pmrem.fromScene(envScene, 0.015, 0.1, 100, { size: 128 });
      rt?.dispose();
      rt = next;
      return rt.texture;
    },
  };
}

// ---------- stones ----------

// Refractive index and how much each splits light into colours (fire).
// Zircon has the most fire of anything you'll find in a creek.
export const OPTICS = {
  sapphire: { ior: 1.77, fire: 0.35 },
  zircon: { ior: 1.95, fire: 0.85 },
  spinel: { ior: 1.72, fire: 0.4, opaque: true },
  garnet: { ior: 1.79, fire: 0.5, deep: true },
  topaz: { ior: 1.62, fire: 0.3 },
  quartz: { ior: 1.54, fire: 0.25 },
  fluorite: { ior: 1.43, fire: 0.1 },
  calcite: { ior: 1.6, fire: 0.35 },
  scheelite: { ior: 1.92, fire: 0.7 },
  feldspar: { ior: 1.52, fire: 0, opaque: true },
};

// A stone's material.
//   finish: 'rough' (waterworn, frosted skin), 'crystal' (natural faces),
//           'cut' (faceted and polished)
//   hq: see-through and light-bending (costs an extra render pass)
//   size: rough size in metres, so the colour depth suits the stone
//   world: out on the ground rather than in the inventory's lightbox. A fully
//           see-through stone only shows the dirt behind it, so out there it's
//           part refraction, part sunlit body colour, which reads truer.
export function stoneMaterial({ type, color, finish, hq, size = 0.01, opacity = 0.9, broken = false, world = false }) {
  const op = OPTICS[type] || OPTICS.quartz;
  const col = new THREE.Color(color);
  const smooth = finish === 'cut' ? 0 : finish === 'crystal' ? (broken ? 0.4 : 0.035) : 0.42;
  if (op.opaque || opacity >= 1) {
    // Black spinel and feldspar: glassy on the outside, no light gets through.
    return new THREE.MeshPhysicalMaterial({
      color: col, roughness: finish === 'cut' ? 0.02 : smooth + 0.1, metalness: 0, ior: op.ior, specularIntensity: 1,
      clearcoat: finish === 'cut' ? 1 : 0, clearcoatRoughness: 0.02,
    });
  }
  if (!hq) {
    // The cheap version: tinted, a bit see-through, with a glint.
    return new THREE.MeshPhysicalMaterial({
      color: col, roughness: smooth + 0.04, metalness: 0, ior: op.ior, specularIntensity: 1,
      transparent: true, opacity: finish === 'rough' ? Math.min(0.94, opacity + 0.04) : opacity,
      emissive: col.clone().multiplyScalar(finish === 'rough' ? 0.2 : 0.1),
    });
  }
  // The real thing: light goes in, bends, picks up colour the further it travels.
  // thickness is in the mesh's own units (three scales it by the object's size);
  // attenuation is in metres, against the stone's real size.
  const thickLocal = finish === 'cut' ? 1.3 : finish === 'crystal' ? 1.5 : 0.9;
  const tint = col.clone().lerp(new THREE.Color(1, 1, 1), op.deep ? 0.1 : finish === 'rough' ? 0.15 : 0.35);
  return new THREE.MeshPhysicalMaterial({
    color: tint,
    metalness: 0,
    roughness: finish === 'rough' ? 0.32 : smooth,
    transmission: world ? 0.6 : 1,
    ior: op.ior,
    dispersion: finish === 'rough' ? 0 : op.fire,
    thickness: thickLocal,
    attenuationColor: col,
    // How far light travels before it's taken on the stone's full colour.
    attenuationDistance: size * (op.deep ? 0.35 : finish === 'rough' ? 0.7 : finish === 'crystal' ? 2.4 : 0.8) * (world ? 2.5 : 1),
    specularIntensity: 1,
    envMapIntensity: finish === 'cut' ? 1.6 : 1.2,
    emissive: col.clone().multiplyScalar((finish === 'rough' ? 0.1 : 0.03) + (world ? 0.08 : 0)),
  });
}

// ---------- waterworn pebbles ----------

// Round off a convex crystal shape the way a creek does: faces stay, edges and
// corners wear back. Each direction from the centre finds the crystal's
// surface with a soft minimum over its faces, so the edges come out rounded.
const roundCache = {};
export function roundedHabit(key, habitGeo, roundness, seed = 1) {
  if (roundCache[key]) return roundCache[key];
  const src = habitGeo.index ? habitGeo.toNonIndexed() : habitGeo;
  const p = src.attributes.position;
  const planes = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nrm = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    nrm.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
    const d = nrm.dot(a);
    if (d < 0) { nrm.negate(); }
    const dd = Math.abs(d);
    if (dd < 1e-4 || !Number.isFinite(nrm.x)) continue;
    if (!planes.some((q) => q.n.dot(nrm) > 0.999 && Math.abs(q.d - dd) < 1e-3)) planes.push({ n: nrm.clone(), d: dd });
  }
  const k = 0.02 + roundness * 0.16;
  const g = mergeVerts(new THREE.IcosahedronGeometry(1, 3)); // welded, so it shades smooth
  const gp = g.attributes.position;
  const r = mulberry32(seed);
  const v = new THREE.Vector3();
  const jitter = new Map();
  for (let i = 0; i < gp.count; i++) {
    v.fromBufferAttribute(gp, i).normalize();
    let s = 0;
    for (const q of planes) {
      const cos = q.n.dot(v);
      if (cos > 1e-3) s += Math.exp(-(q.d / cos) / k);
    }
    let rad = s > 0 ? -k * Math.log(s) : 0.5;
    // A little unevenness, the same at shared vertices so there are no cracks.
    const key2 = `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
    if (!jitter.has(key2)) jitter.set(key2, 1 + (r() - 0.5) * 0.06);
    rad *= jitter.get(key2);
    gp.setXYZ(i, v.x * rad, v.y * rad, v.z * rad);
  }
  g.computeVertexNormals();
  roundCache[key] = g;
  return g;
}

// ---------- cut stones ----------

// Build a faceted stone from rings of vertices (girdle shape given by fn),
// lofted ring to ring, with a flat table on top and a culet point below.
function facetGeometry(rings, shape) {
  const ringPts = rings.map((ring) => {
    const pts = [];
    for (let k = 0; k < ring.n; k++) {
      const t = ((k + (ring.rot || 0)) / ring.n) * Math.PI * 2;
      const s = shape(t);
      pts.push({ t: (k + (ring.rot || 0)) / ring.n, v: new THREE.Vector3(s.x * ring.r, ring.y, s.z * ring.r) });
    }
    return pts;
  });
  const tris = [];
  // Table: a fan from the middle of the top ring.
  const top = ringPts[0];
  const tc = new THREE.Vector3(0, rings[0].y, 0);
  for (let k = 0; k < top.length; k++) tris.push([tc, top[k].v, top[(k + 1) % top.length].v]);
  // Loft each ring to the next, walking round both by angle.
  for (let i = 0; i < ringPts.length - 1; i++) {
    const A = ringPts[i], B = ringPts[i + 1];
    const angA = (j) => A[j % A.length].t + Math.floor(j / A.length);
    const angB = (j) => B[j % B.length].t + Math.floor(j / B.length);
    // Start both walks at roughly the same angle.
    let ia = 0, ib = 0;
    while (angB(ib + 1) <= angA(0) + 1e-6) ib++;
    const endA = A.length, endB = ib + B.length;
    while (ia < endA || ib < endB) {
      const va = A[ia % A.length].v, vb = B[ib % B.length].v;
      const na = angA(ia + 1), nb = angB(ib + 1);
      if (ib >= endB || (ia < endA && na < nb - 1e-6)) { tris.push([va, vb, A[(ia + 1) % A.length].v]); ia++; }
      else if (ia >= endA || nb < na - 1e-6) { tris.push([va, vb, B[(ib + 1) % B.length].v]); ib++; }
      else { // level: a quad
        tris.push([va, vb, B[(ib + 1) % B.length].v]);
        tris.push([va, B[(ib + 1) % B.length].v, A[(ia + 1) % A.length].v]);
        ia++; ib++;
      }
    }
  }
  // Culet.
  const last = ringPts[ringPts.length - 1];
  const cul = new THREE.Vector3(0, rings[rings.length - 1].culet, 0);
  for (let k = 0; k < last.length; k++) tris.push([last[k].v, last[(k + 1) % last.length].v, cul]);
  // Flat facets, wound outwards (every cut is convex about its centre).
  const pos = new Float32Array(tris.length * 9);
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), cen = new THREE.Vector3();
  tris.forEach((t, i) => {
    let [a, b, c] = t;
    e1.subVectors(b, a); e2.subVectors(c, a);
    cen.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    if (e1.cross(e2).dot(cen) < 0) [b, c] = [c, b];
    pos.set([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z], i * 9);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

const superellipse = (p, ax = 1, az = 1) => (t) => {
  const c = Math.cos(t), s = Math.sin(t);
  const r = Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(s), p), -1 / p);
  return { x: c * r * ax, z: s * r * az };
};

export const CUTS = {
  round: { name: 'round brilliant', shape: superellipse(2) },
  oval: { name: 'oval', shape: superellipse(2, 1.3, 1) },
  cushion: { name: 'cushion', shape: superellipse(3.2, 1.08, 1) },
  emerald: { name: 'emerald cut', shape: superellipse(9, 1.35, 1), step: true },
  cabochon: { name: 'cabochon', shape: superellipse(2, 1.25, 1), cab: true },
  halves: { name: 'sawn in half and polished' },
};

const cutCache = {};
export function cutGeometry(cut) {
  if (cutCache[cut]) return cutCache[cut];
  const def = CUTS[cut];
  let g;
  if (def.cab) {
    // A smooth polished dome on a flat back.
    const prof = [new THREE.Vector2(0, -0.08), new THREE.Vector2(0.98, -0.08), new THREE.Vector2(1, 0)];
    for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI / 2; prof.push(new THREE.Vector2(Math.cos(a), Math.sin(a) * 0.5)); }
    g = new THREE.LatheGeometry(prof, 40);
    const p = g.attributes.position;
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      p.setX(i, p.getX(i) * 1.25);
      uv[i * 2] = 0.5 + p.getX(i) * 0.38; uv[i * 2 + 1] = 0.5 + p.getZ(i) * 0.45;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeVertexNormals();
  } else if (def.step) {
    // Step cut: concentric rows of long flat facets, like stairs.
    g = facetGeometry([
      { n: 16, r: 0.62, y: 0.26 }, { n: 16, r: 0.82, y: 0.16 }, { n: 16, r: 1, y: 0.03 }, { n: 16, r: 1, y: -0.03 },
      { n: 16, r: 0.74, y: -0.26 }, { n: 16, r: 0.42, y: -0.48, culet: -0.62 },
    ], def.shape);
  } else {
    // Brilliant: table, star and kite facets on the crown, a long pavilion to a point.
    g = facetGeometry([
      { n: 8, r: 0.56, y: 0.32 }, { n: 8, r: 0.8, y: 0.19, rot: 0.5 }, { n: 16, r: 1, y: 0.025 }, { n: 16, r: 1, y: -0.025 },
      { n: 8, r: 0.52, y: -0.46, rot: 0.5, culet: -0.86 },
    ], def.shape);
  }
  cutCache[cut] = g;
  return g;
}

// ---------- nugget shapes ----------

// Smooth 3D value noise for shaping lumps on the CPU.
function vnoise3(x, y, z, seed) {
  const h = (i, j, k) => {
    let n = (i * 374761393 + j * 668265263 + k * 1274126177 + seed * 69069) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
    l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w);
}

// A nugget: a smooth, flattened lump. Waterworn ones are rounded off;
// crystalline/reef gold is hackly, with sharp little ridges.
export function nuggetGeometry(seed, { detail = 3, style = 'waterworn' } = {}) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  const m = mergeVerts(g);
  const p = m.attributes.position;
  const v = new THREE.Vector3();
  const sharp = style !== 'waterworn';
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let r = 1 + (vnoise3(v.x * 1.2 + 3, v.y * 1.2, v.z * 1.2, seed) - 0.5) * 0.7
      + (vnoise3(v.x * 3, v.y * 3, v.z * 3 + 5, seed + 1) - 0.5) * 0.28;
    if (sharp) r += Math.abs(vnoise3(v.x * 6, v.y * 6 + 2, v.z * 6, seed + 2) - 0.5) * 0.35;
    p.setXYZ(i, v.x * r, v.y * r, v.z * r);
  }
  m.computeVertexNormals();
  return addCavity(m);
}

function mergeVerts(g) {
  // Weld the icosphere's duplicate vertices so the lump stays in one piece.
  const p = g.attributes.position;
  const map = new Map(), verts = [], index = [];
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(5)},${p.getY(i).toFixed(5)},${p.getZ(i).toFixed(5)}`;
    let j = map.get(key);
    if (j === undefined) { j = verts.length / 3; map.set(key, j); verts.push(p.getX(i), p.getY(i), p.getZ(i)); }
    index.push(j);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  out.setIndex(index);
  return out;
}
