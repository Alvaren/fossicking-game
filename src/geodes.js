import { makeHollowHalves } from './geodevisuals.js';
import * as THREE from 'three';
import { mulberry32 } from './noise.js';

// Thundereggs: knobbly nodules that weather out of the rhyolite. Ugly brown
// lumps on the outside, but saw one in half and there's a star of agate in the
// middle (or a hollow full of crystals, or very rarely, opal). You can't tell
// what's inside till it's cut.

export const CORES = {
  'blue agate': { w: 38, mult: 3, bands: ['#8fa3b8', '#dfe5ec', '#6b7f96', '#f2f4f6', '#a9b8c8'] },
  'banded agate': { w: 30, mult: 3.2, bands: ['#c9a27a', '#f2e6d6', '#9a6a4a', '#ead9c4', '#b8865c'] },
  'crystal-lined': { w: 18, mult: 4, hollow: true },
  'red jasper': { w: 10, mult: 2.2, solid: '#8e3526' },
  'opal-filled': { w: 4, mult: 7, opal: true },
};

// A geode is a hollow lined with crystals; thundereggs retain their own
// rhyolite matrix and may be completely filled. Contents are chosen once.
export const GEODE_CORES = {
  'quartz-lined': { w: 52, mult: 3.2, colour: 0xe5eaf0, bands: [0x85919b, 0xd4dadb, 0xf1ede4] },
  'amethyst-lined': { w: 20, mult: 5.5, colour: 0x9465c3, bands: [0x74718e, 0xc0b7ce, 0xe7e1ec] },
  'agate and quartz': { w: 28, mult: 4.2, colour: 0xe9e7df, bands: [0x8c5e41, 0xe1c7a0, 0xb38160, 0xf1e7d1], opening: .56 },
};
export const noduleCore = it => it.type === 'geode'
  ? (GEODE_CORES[it.core] || GEODE_CORES['quartz-lined'])
  : (CORES[it.core] || CORES['blue agate']);

export function makeGeode(random) {
  let pick = random() * 100, core = 'quartz-lined';
  for (const [name, def] of Object.entries(GEODE_CORES)) { pick -= def.w; if (pick <= 0) { core = name; break; } }
  const grams = Math.round(110 + Math.pow(random(), 2) * 650);
  const roll = random(), grade = roll < .2 ? 'A' : roll < .65 ? 'B' : 'C';
  return { type: 'geode', core, grams, grade, seed: Math.floor(random() * 1e6),
    value: Math.round((9 + grams * .025) * ({ A: 1.4, B: 1, C: .75 })[grade] * 100) / 100,
    label: `unopened geode, ${grams} g` };
}

export function makeThunderegg(r) {
  let t = r() * Object.values(CORES).reduce((s, c) => s + c.w, 0);
  let core = 'blue agate';
  for (const [k, c] of Object.entries(CORES)) { t -= c.w; if (t <= 0) { core = k; break; } }
  const grams = Math.round(90 + Math.pow(r(), 2) * 900);
  const grade = r() < 0.2 ? 'A' : r() < 0.6 ? 'B' : 'C';
  return {
    type: 'thunderegg', core, grams, grade, seed: Math.floor(r() * 1e6),
    value: Math.round((8 + grams * 0.022) * ({ A: 1.4, B: 1, C: 0.75 })[grade] * 100) / 100,
    label: `thunderegg, ${grams} g`,
  };
}

// About the size of a cricket ball to a rockmelon.
export const thundereggRadius = (it) => Math.cbrt((it.grams / 2.5) * 0.239) / 100;

// ---------- the look ----------

const knobblyCache = new Map();
function knobbly(seed) {
  if (knobblyCache.has(seed)) return knobblyCache.get(seed);
  const g = new THREE.IcosahedronGeometry(1, 3);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  // Thundereggs are lumpy with ridges, from the gas-bubble shapes they grew in.
  const r = mulberry32(seed);
  const bumps = Array.from({ length: 9 }, () => new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize());
  const shared = new Map();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const key = `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
    if (!shared.has(key)) {
      let rad = 0.9;
      for (const b of bumps) rad += Math.pow(Math.max(0, v.dot(b)), 6) * 0.22;
      rad += (r() - 0.5) * 0.05;
      shared.set(key, rad);
    }
    const rad = shared.get(key);
    p.setXYZ(i, v.x * rad, v.y * rad * 0.9, v.z * rad);
  }
  g.computeVertexNormals();
  knobblyCache.set(seed, g);
  return g;
}

const rindMat = new THREE.MeshStandardMaterial({ color: 0x8a5a44, roughness: 0.97, flatShading: true });

// The sawn face: rhyolite matrix with the star in the middle.
const faceCache = new Map();
function faceTexture(it) {
  const key = `${it.seed}-${it.core}`;
  if (faceCache.has(key)) return faceCache.get(key);
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const r = mulberry32(it.seed || 1);
  const core = CORES[it.core] || CORES['blue agate'];
  g.fillStyle = '#9a6450';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) {
    const v = 110 + r() * 60;
    g.fillStyle = `rgba(${v + 30},${v - 10},${v - 30},0.35)`;
    g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2);
  }
  // A darker rind round the edge.
  const rg = g.createRadialGradient(S / 2, S / 2, S * 0.36, S / 2, S / 2, S * 0.5);
  rg.addColorStop(0, 'rgba(60,30,20,0)');
  rg.addColorStop(1, 'rgba(60,30,20,0.75)');
  g.fillStyle = rg;
  g.fillRect(0, 0, S, S);
  // The star: four to six irregular points.
  const pts = 4 + Math.floor(r() * 3), rot = r() * 6.28;
  const radii = Array.from({ length: pts * 2 }, (_, i) => (i % 2 ? 0.16 + r() * 0.06 : 0.28 + r() * 0.12) * S);
  const star = (scale) => {
    g.beginPath();
    for (let i = 0; i <= pts * 2; i++) {
      const a = rot + (i / (pts * 2)) * Math.PI * 2, rr = radii[i % (pts * 2)] * scale;
      const x = S / 2 + Math.cos(a) * rr, y = S / 2 + Math.sin(a) * rr;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
  };
  if (core.bands) {
    // Agate laid down in bands from the walls inward.
    for (let k = 0; k < 14; k++) {
      star(1 - k / 15);
      g.fillStyle = core.bands[k % core.bands.length];
      g.fill();
    }
  } else if (core.hollow) {
    star(1);
    g.fillStyle = '#e8e4dc';
    g.fill();
    star(0.72);
    g.fillStyle = '#3a2a22';
    g.fill();
    // Little quartz points growing in off the walls.
    g.fillStyle = 'rgba(245,245,240,0.9)';
    for (let i = 0; i < 70; i++) {
      const a = r() * 6.28, d = (0.55 + r() * 0.2) * radii[(Math.floor((a - rot) / (Math.PI / pts)) % (pts * 2) + pts * 2) % (pts * 2)] ;
      const x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(a) * 9 + Math.sin(a) * 3, y - Math.sin(a) * 9 - Math.cos(a) * 3); g.lineTo(x - Math.cos(a) * 9 - Math.sin(a) * 3, y - Math.sin(a) * 9 + Math.cos(a) * 3); g.fill();
    }
  } else if (core.opal) {
    star(1);
    g.fillStyle = '#e8e4dc';
    g.fill();
    star(0.85);
    g.fillStyle = '#2a4a5e';
    g.fill();
    for (let i = 0; i < 160; i++) {
      const a = r() * 6.28, d = r() * radii[0] * 0.7;
      g.fillStyle = `hsla(${Math.floor(r() * 360)},90%,60%,0.75)`;
      g.fillRect(S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d, 3 + r() * 5, 2 + r() * 4);
    }
  } else {
    star(1);
    g.fillStyle = '#e0d4c4';
    g.fill();
    star(0.88);
    g.fillStyle = core.solid;
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  faceCache.set(key, tex);
  return tex;
}

export function makeThundereggMesh(it) {
  const rad = thundereggRadius(it);
  if (!it.cut) {
    const m = new THREE.Mesh(knobbly(it.seed || 1), rindMat);
    m.scale.setScalar(rad);
    m.castShadow = true;
    return m;
  }
  if (noduleCore(it).hollow) return makeHollowHalves(it, { radius: rad, star: true });
  // Sawn and polished: the two halves side by side, faces to you.
  const g = new THREE.Group();
  const faceMat = new THREE.MeshPhysicalMaterial({ map: faceTexture(it), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 });
  const dome = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const face = new THREE.CircleGeometry(1, 40);
  for (const side of [-1, 1]) {
    const half = new THREE.Group();
    const d = new THREE.Mesh(dome, rindMat);
    d.rotation.x = -Math.PI / 2; // dome bulging away from you
    d.position.z = -0.001;
    const f = new THREE.Mesh(face, faceMat);
    if (side > 0) f.scale.x = -1; // the other half is the mirror image
    half.add(d, f);
    d.scale.set(1, 1, 0.9);
    half.position.x = side * 1.08;
    half.rotation.y = -side * 0.18;
    half.scale.setScalar(rad);
    half.position.multiplyScalar(rad);
    g.add(half);
  }
  return g;
}

const geodeRind = new THREE.MeshStandardMaterial({ color: 0x867d6d, roughness: .95 });
export function makeGeodeMesh(it) {
  const rad = thundereggRadius(it);
  if (it.cut) return makeHollowHalves(it, { radius: rad, ...noduleCore(it) });
  const mesh = new THREE.Mesh(knobbly(it.seed || 1), geodeRind);
  mesh.scale.setScalar(rad); mesh.castShadow = true;
  return mesh;
}
