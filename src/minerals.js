import { roughFindGeometry, finishRoughStone } from './findvisuals.js';
import { sieveRecovery } from './sieverecovery.js';
import { assayGold } from './panning.js';
import { makeThundereggMesh, thundereggRadius } from './geodes.js';
import { stoneMaterial, roundedHabit } from './materials.js';
import { makeCutMesh } from './cutting.js';
import * as THREE from 'three';
import { lumpy } from './world.js';
import { mulberry32 } from './noise.js';

// Gem and agate definitions, how a load of wash turns into finds, and the
// little meshes used to show them.

const pick = (list, rand) => {
  const total = list.reduce((s, v) => s + v.w, 0);
  let r = rand() * total;
  for (const v of list) { r -= v.w; if (r <= 0) return v; }
  return list[0];
};

const GRADES = [
  { g: 'A', w: 10, m: 4 },
  { g: 'B', w: 35, m: 1 },
  { g: 'C', w: 55, m: 0.15 },
];

export const GEMS = {
  sapphire: {
    name: 'Sapphire', plural: 'sapphires', sg: 4.0, perCt: 70,
    size: (r) => 0.15 + Math.pow(r(), 2.6) * 3.5,
    varieties: [
      { v: 'inky blue', c: 0x1d2f6b, w: 45, m: 1 },
      { v: 'blue', c: 0x2f5fb8, w: 20, m: 1.6 },
      { v: 'green', c: 0x3f7a5a, w: 15, m: 0.8 },
      { v: 'yellow', c: 0xd9b23a, w: 10, m: 1.5 },
      { v: 'parti', c: 0x4f8a6a, w: 10, m: 2.2 },
    ],
  },
  zircon: {
    name: 'Zircon', plural: 'zircons', sg: 4.7, perCt: 14,
    size: (r) => 0.1 + Math.pow(r(), 2.4) * 2.5,
    varieties: [
      { v: 'red-brown', c: 0x8a3a1e, w: 50, m: 1 },
      { v: 'honey', c: 0xc0802a, w: 30, m: 1.2 },
      { v: 'colourless', c: 0xe8e4dc, w: 10, m: 1.5 },
      { v: 'pink', c: 0xd07a80, w: 10, m: 1.4 },
    ],
  },
  spinel: {
    name: 'Black spinel', plural: 'black spinels', sg: 3.8, perCt: 0.6,
    size: (r) => 0.1 + Math.pow(r(), 2) * 2.5,
    varieties: [{ v: 'black', c: 0x121212, w: 1, m: 1 }],
  },
  garnet: {
    name: 'Garnet', plural: 'garnets', sg: 4.0, perCt: 4,
    size: (r) => 0.05 + Math.pow(r(), 2.5) * 1.3,
    varieties: [{ v: 'almandine', c: 0x6a0f16, w: 1, m: 1 }],
  },
  topaz: {
    name: 'Topaz', plural: 'topaz', sg: 3.5, perCt: 20,
    size: (r) => 0.4 + Math.pow(r(), 2.5) * 7,
    varieties: [
      { v: 'colourless', c: 0xeef2f4, w: 60, m: 1 },
      { v: 'pale blue', c: 0xb8d8ec, w: 40, m: 1.6 },
    ],
  },
  agate: {
    name: 'Agate', plural: 'agates', sg: 2.6,
    varieties: [
      { v: 'chalcedony', bands: [0x8e9aa8, 0xc9d0d8], w: 35, m: 1 },
      { v: 'banded', bands: [0x8a5a3a, 0xe8dcc8, 0xb08060], w: 30, m: 2.5 },
      { v: 'carnelian', bands: [0xc0461e, 0xe88a4a], w: 20, m: 3 },
      { v: 'fortification', bands: [0x6a3a2a, 0xf0e8dc, 0x9a6a4a, 0xe0d0c0], w: 10, m: 7 },
      { v: 'moss', bands: [0x5a7a4a, 0xd8dcd0], w: 5, m: 4 },
    ],
  },
};

export const GEM_ORDER = ['sapphire', 'zircon', 'topaz', 'garnet', 'spinel', 'agate'];

// Scheelite (calcium tungstate, SG 6): a dull, heavy, cream-coloured stone by
// day, but under shortwave UV it glows bright blue-white. It often keeps
// company with gold in quartz reefs, so prospectors hunt it at night.
GEMS.scheelite = {
  name: 'Scheelite', plural: 'scheelite', sg: 6.0,
  varieties: [{ v: 'honey', c: 0xd9c08a, w: 6, m: 1 }, { v: 'white', c: 0xe6e1d4, w: 4, m: 0.9 }],
};
export const FLUOR = { scheelite: 0x9fd8ff, agate: 0x8dff6a, calcite: 0xff6a8a, fluorite: 0x7a8dff };

// Crystals dug from pockets and vugs (topaz is shared with the alluvial list).
GEMS.quartz = { name: 'Quartz', plural: 'quartz crystals' };
GEMS.feldspar = { name: 'Feldspar', plural: 'feldspar crystals' };
GEMS.calcite = { name: 'Calcite', plural: 'calcite crystals' };
GEMS.fluorite = { name: 'Fluorite', plural: 'fluorite crystals' };
GEMS.opal = { name: 'Opal', plural: 'opals' };
GEMS.fossil = { name: 'Fossil', plural: 'fossils' };
GEMS.thunderegg = { name: 'Thunderegg', plural: 'thundereggs' };
export const CRYSTAL_ORDER = ['opal', 'fossil', 'thunderegg', 'quartz', 'feldspar', 'calcite', 'fluorite', 'scheelite'];

export function makeGem(type, rand, sizeBias = 1) {
  const def = GEMS[type];
  const variety = pick(def.varieties, rand);
  const grade = pick(GRADES, rand);
  if (type === 'scheelite') {
    const grams = Math.round(3 + Math.pow(rand(), 2) * 45);
    const value = Math.round(variety.m * grams * 1.6 * (grade.g === 'A' ? 3 : grade.g === 'B' ? 1 : 0.4));
    return {
      type, grams, grade: grade.g, variety: variety.v, color: variety.c, value, fluor: FLUOR.scheelite,
      label: `${variety.v} scheelite, ${grams} g (${grade.g}-grade)`,
    };
  }
  if (type === 'agate') {
    const grams = Math.round(15 + Math.pow(rand(), 2) * 350);
    const value = Math.round(variety.m * (2 + grams / 25) * (grade.g === 'A' ? 3 : grade.g === 'B' ? 1 : 0.4));
    // Plenty of chalcedony glows green under UV (traces of uranium). Decided
    // from the stone itself so seeded finds stay the same.
    const glows = (variety.v === 'chalcedony' || variety.v === 'moss') && grams % 3 !== 0;
    return {
      type, grams, grade: grade.g, variety: variety.v, bands: variety.bands, value,
      ...(glows ? { fluor: FLUOR.agate } : {}),
      label: `${variety.v} agate, ${grams} g`,
    };
  }
  const ct = Math.round(def.size(rand) * sizeBias * 100) / 100;
  const value = Math.round(def.perCt * variety.m * Math.pow(ct, 1.25) * grade.m * 100) / 100;
  return {
    type, ct, grade: grade.g, variety: variety.v, color: variety.c, value,
    label: type === 'spinel' || type === 'garnet'
      ? `${def.name.toLowerCase()} ${ct.toFixed(2)} ct`
      : `${variety.v} ${def.name.toLowerCase()} ${ct.toFixed(2)} ct (${grade.g}-grade)`,
  };
}

function poisson(lambda, rand) {
  if (lambda <= 0) return 0;
  if (lambda > 30) return Math.round(lambda + Math.sqrt(lambda) * (rand() + rand() + rand() - 1.5) * 2);
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rand(); } while (p > L);
  return k - 1;
}

// How well each method catches each kind of find.
function recovery(method, gear, gem, opts, cons) {
  if (method === 'pan') {
    // Sluice concentrates are fine and heavy: the stones are easy to see.
    if (cons) return gem.type === 'agate' ? 0 : 0.9;
    if (gem.type === 'agate') return gear.classifier ? 0.92 : 0.3; // big stones get tossed unless you check the oversize
    if (gem.ct < 0.6) return gear.classifier ? 0.6 : 0.5;
    return gear.classifier ? 0.9 : 0.3;
  }
  return sieveRecovery(gem,gear.nested,opts.strat,opts.lost);
}

// Assay a panning parcel once, before splitting it between pans. The assay
// describes what is present; pan upgrades never multiply its gold content.
export function rollPanContents(sample, rand = Math.random) {
  const oreRelease = sample.crushed ? (sample.roasted ? 0.9 : 0.55) : 1;
  const gold = assayGold(Math.max(0, sample.gold || 0) * (sample.cons ? 0.8 + rand() * 0.4 : 0.4 + rand() * 1.2) * oreRelease, rand);
  const picker = rand() < Math.min(0.5, (sample.gold || 0) * (sample.cons ? 0.3 : 0.6)) ? 0.2 + rand() * 0.8 : 0;
  const finds = [];
  for (const type of GEM_ORDER) {
    const count = poisson(sample[type] || 0, rand);
    for (let i = 0; i < count; i++) finds.push({ item: makeGem(type, rand, sample.sizeBias || 1), at: rand(), survival: rand() });
  }
  return { gold, picker, pickerAt: rand(), finds };
}

// Turn one load into actual finds.
// opts (sieve only): strat 0..1 how well it was jigged, lost = seconds over-jigged.
export function processLoad(sample, method, gear, rand = Math.random, opts = {}) {
  // A bucket remainder already assayed for panning must not roll new finds.
  if (sample.panContents) {
    const c = sample.panContents;
    return { gold: c.gold * (method === 'pan' ? 0.95 : 0.12), picker: c.picker,
      finds: c.finds.filter(f => rand() < recovery(method, gear, f.item, opts, !!sample.cons)).map(f => f.item), blackSand: sample.blackSand };
  }
  const out = { gold: 0, picker: 0, finds: [], blackSand: sample.blackSand };
  const cons = !!sample.cons;
  // Crushed reef ore: roasting frees the gold the sulphides were holding on to.
  const goldRec = sample.crushed ? (method === 'pan' ? (sample.roasted ? 0.9 : 0.55) : 0.08)
    : method === 'pan'
      ? (cons ? 0.95 : (gear.classifier ? 0.9 : 0.74) * gear.panMult)
      : 0.12; // fine gold washes through sieve screens
  out.gold = sample.gold * Math.min(0.98, goldRec) * (cons ? 0.8 + rand() * 0.4 : 0.4 + rand() * 1.2);
  // Occasionally a picker: a bit of gold big enough to pick out with fingers.
  if (rand() < Math.min(0.5, sample.gold * (cons ? 0.3 : 0.6))) {
    const p = 0.2 + rand() * 0.8;
    if (rand() < (method === 'pan' ? 0.95 : 0.9)) out.picker = p;
  }
  for (const type of GEM_ORDER) {
    const n = poisson(sample[type], rand);
    for (let k = 0; k < n; k++) {
      const g = makeGem(type, rand, sample.sizeBias);
      if (rand() < recovery(method, gear, g, opts, cons)) out.finds.push(g);
    }
  }
  return out;
}

export function summarise(finds) {
  const counts = {};
  for (const f of finds) counts[f.type] = (counts[f.type] || 0) + 1;
  return GEM_ORDER.filter((t) => counts[t])
    .map((t) => `${counts[t]} ${counts[t] === 1 ? GEMS[t].name.toLowerCase() : GEMS[t].plural}`)
    .join(', ');
}

// ---------- meshes ----------

const agateTextures = new Map();
export function agateTexture(bands) {
  const key = bands.join(',');
  if (agateTextures.has(key)) return agateTextures.get(key);
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d'), pixels = ctx.createImageData(s, s);
  const colours = bands.map(hex => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]);
  // Continuous nested contours: neighbouring bands share their folds, like
  // successive layers of chalcedony, instead of independently jagged rings.
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const px = (x / s - .47) / 1.15, py = y / s - .54;
    const a = Math.atan2(py, px), r = Math.hypot(px, py);
    const depth = r * (1 + .12 * Math.sin(a * 3) + .035 * Math.sin(a * 7)) + .009 * Math.sin(px * 30 + py * 12);
    const band = depth * 32, whole = Math.floor(band), f = band - whole;
    const col = colours[((whole % colours.length) + colours.length) % colours.length];
    const fine = .84 + .16 * Math.pow(Math.sin(f * Math.PI), .3);
    const line = f < .09 ? .78 : fine;
    const i = (y * s + x) * 4;
    for (let k = 0; k < 3; k++) pixels.data[i + k] = col[k] * line;
    pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  agateTextures.set(key, tex);
  return tex;
}

const geoCache = {};
function gemGeometry(type) {
  if (geoCache[type]) return geoCache[type];
  let g;
  if (type === 'sapphire') g = new THREE.CylinderGeometry(0.42, 0.5, 1, 6); // corundum: hexagonal barrel
  else if (type === 'zircon') g = new THREE.OctahedronGeometry(0.6).scale(1, 1.5, 1);
  else if (type === 'spinel') g = new THREE.OctahedronGeometry(0.6);
  else if (type === 'garnet') g = new THREE.DodecahedronGeometry(0.6, 0);
  else if (type === 'topaz') g = new THREE.CylinderGeometry(0.4, 0.45, 1.2, 4);
  else if (type === 'scheelite') g = lumpy(new THREE.OctahedronGeometry(0.8, 1).scale(1, 1.25, 1), 0.2, mulberry32(11));
  else {
    // Agate nodule. Project the bands from above so it looks like a sliced, waterworn nodule.
    g = new THREE.SphereGeometry(1, 24, 16);
    const positions = g.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const r = 1 + .065 * Math.sin(x * 4 + y * 2) * Math.cos(z * 3 - y) + .035 * Math.sin(z * 7 + x);
      positions.setXYZ(i, x * r, y * r, z * r);
    }
    g.computeVertexNormals();
    const p = g.attributes.position;
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      uv[i * 2] = 0.5 + p.getX(i) * 0.45;
      uv[i * 2 + 1] = 0.5 + p.getZ(i) * 0.45;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  geoCache[type] = g;
  return g;
}

// Creek stones are waterworn: the crystal shape is still there, but the edges
// and corners are rubbed round. Topaz, being softer and tumbled further, more so.
const ROUNDNESS = { sapphire: 0.45, zircon: 0.5, spinel: 0.4, garnet: 0.45, topaz: 0.8 };
function pebbleGeometry(type) {
  return roundedHabit(`pebble-${type}`, gemGeometry(type), ROUNDNESS[type], type.length * 13);
}

// World-space size in metres, exaggerated a little so finds are visible.
export function gemSize(gem) {
  if (gem.type === 'thunderegg') return thundereggRadius(gem) * 2;
  if (gem.type === 'agate') return Math.cbrt(gem.grams / 2.6) * 0.012;
  if (gem.type === 'scheelite') return Math.cbrt(gem.grams / 6) * 0.014;
  return 0.006 * Math.cbrt(gem.ct) * 2.2;
}

export function makeGemMesh(gem, { hq = false, world = false } = {}) {
  if (gem.cut) return makeCutMesh(gem, { hq });
  if (gem.type === 'thunderegg') return makeThundereggMesh(gem);
  let mat;
  if (gem.type === 'scheelite') {
    mat = new THREE.MeshStandardMaterial({ color: gem.color, roughness: 0.55 }); // dull and greasy by day
  } else if (gem.type === 'agate') {
    mat = new THREE.MeshStandardMaterial({ map: agateTexture(gem.bands), roughness: 0.35 });
  } else {
    mat = stoneMaterial({ type: gem.type, color: gem.color, finish: 'rough', hq, size: gemSize(gem), world });
  }
  const pebble = ROUNDNESS[gem.type] !== undefined;
  if (gem.type !== 'agate') finishRoughStone(mat, gem);
  const model = roughFindGeometry(gem);
  const m = new THREE.Mesh(model || (pebble ? pebbleGeometry(gem.type) : gemGeometry(gem.type)), mat);
  const s = gemSize(gem);
  m.scale.set(s, gem.type === 'agate' ? s * 0.7 : s, s);
  m.userData.fallbackScale = pebble && !model ? 1.15 : 1;
  if (pebble && !model) m.scale.multiplyScalar(1.15); // rounding takes a bit off the size
  m.castShadow = true;
  return m;
}
