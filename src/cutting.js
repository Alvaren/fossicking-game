import { CORES, makeThundereggMesh } from './geodes.js';
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { stoneMaterial, cutGeometry, CUTS } from './materials.js';
import { agateTexture } from './minerals.js';
import { CRYSTALS, makeOpalCab } from './crystals.js';

// The gem cutter in town. Send him a rough stone and it comes back next
// morning faceted (or polished, for agate and opal). Most of the rough is
// ground away, but a well-cut stone is worth a good deal more. Now and then
// he finds a crack inside that the rough was hiding.

// What can be cut, and how.
const FACET = { sapphire: ['oval', 45, 'cushion', 35, 'round', 20], zircon: ['round', 70, 'oval', 30], garnet: ['round', 50, 'cushion', 50], spinel: ['round', 60, 'cushion', 40], topaz: ['emerald', 50, 'oval', 50] };
const CRYSTAL_CUT = { amethyst: 14, citrine: 16, 'smoky quartz': 6, 'clear quartz': 4, 'topaz crystal': 9 }; // $/ct once cut
const QUARTZ_CUTS = ['emerald', 40, 'cushion', 30, 'oval', 30];

function kind(item) {
  if (item.cut) return null;
  if (item.type === 'thunderegg') return 'saw';
  if (item.type === 'agate') return 'polish';
  if (item.type === 'opal') return CRYSTALS[item.variety]?.opal && item.variety !== 'opalised shell' ? 'cab' : null;
  if (CRYSTAL_CUT[item.variety] !== undefined) return 'crystal';
  if (FACET[item.type] && !item.lengthCm) return 'facet';
  return null;
}

export const cuttable = (item) => kind(item) !== null;

export function cutFee(item) {
  const k = kind(item);
  if (k === 'polish') return 10;
  if (k === 'saw') return 15;
  if (k === 'cab') return Math.round(20 + item.value * 0.05);
  if (k === 'crystal') return 25;
  return Math.max(15, Math.round(item.value * 0.12));
}

const GRADE_MULT = { A: 3.2, B: 2.2, C: 1.3 };

// Rough weight of a crystal from its length (quartz, about 2.65 g/cm3, 5 ct a gram).
function crystalCarats(item) {
  const L = item.lengthCm || 3, r = L * 0.17;
  return Math.PI * r * r * L * 2.65 * 5;
}

// What it might fetch cut, as a rough range for the cutter to quote.
export function cutEstimate(item) {
  const k = kind(item);
  if (k === 'polish') return [item.value * 2.2, item.value * 3];
  if (k === 'saw') return [item.value * 2, item.value * 7]; // no telling what's inside
  if (k === 'cab') return [item.value * (item.broken ? 1.8 : 1.25), item.value * (item.broken ? 2.4 : 1.6)];
  if (k === 'crystal') {
    const ct = crystalCarats(item) * 0.15 * (item.broken ? 0.7 : 1);
    const v = CRYSTAL_CUT[item.variety] * ct * ({ A: 1.6, B: 1, C: 0.6 })[item.grade || 'B'];
    return [v * 0.8, v * 1.2];
  }
  const m = GRADE_MULT[item.grade || 'B'];
  return [item.value * m * 0.8, item.value * m * 1.25];
}

function pick(list, r) {
  let t = r() * list.filter((_, i) => i % 2).reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i += 2) { t -= list[i + 1]; if (t <= 0) return list[i]; }
  return list[0];
}

const lower = { A: 'B', B: 'C', C: 'C' };

// Cut a rough stone. Returns { item, note } with the finished stone.
export function cutStone(rough, seed) {
  const r = mulberry32(seed);
  const k = kind(rough);
  const out = { ...rough, rough: { label: rough.label, ct: rough.ct, value: rough.value }, keep: !!rough.keep, specimen: false };
  let note = null;
  if (k === 'saw') {
    out.cut = 'halves';
    out.value = Math.round(rough.value * CORES[rough.core].mult * ({ A: 1.3, B: 1, C: 0.75 })[rough.grade || 'B'] * (0.85 + r() * 0.3) * 100) / 100;
    out.label = `thunderegg halves, ${rough.core} (${rough.grade}-grade)`;
    if (rough.core === 'opal-filled') note = "Kev reckons he's only seen a handful with opal inside.";
    else if (rough.core === 'crystal-lined') note = 'Hollow in the middle, lined with little quartz crystals.';
  } else if (k === 'polish') {
    out.cut = 'cabochon';
    out.value = Math.round(rough.value * (2.2 + r() * 0.8) * 100) / 100;
    out.label = `polished ${rough.variety} agate cabochon`;
  } else if (k === 'cab') {
    out.cut = 'cabochon';
    out.ct = Math.round(rough.ct * (rough.broken ? 0.35 : 0.55) * 10) / 10;
    // Opal's already priced near its cut value; polishing brings up the colour a bit more.
    out.value = Math.round(rough.value * (rough.broken ? 1.8 : 1.25) * (1 + r() * 0.3) * 100) / 100;
    out.broken = false; out.chipped = false;
    out.label = `solid ${rough.variety} cabochon, ${out.ct} ct${rough.pattern ? `, ${rough.pattern}` : ''}`;
  } else {
    let grade = rough.grade || 'B';
    const flaw = r() < 0.1;
    if (flaw) { grade = lower[grade]; note = 'He found a crack inside and had to cut around it.'; }
    if (k === 'crystal') {
      out.cut = pick(QUARTZ_CUTS, r);
      out.ct = Math.round(crystalCarats(rough) * (0.12 + r() * 0.06) * (rough.broken ? 0.7 : 1) * 100) / 100;
      out.value = Math.round(CRYSTAL_CUT[rough.variety] * out.ct * ({ A: 1.6, B: 1, C: 0.6 })[grade] * (0.85 + r() * 0.3) * 100) / 100;
      out.broken = false; out.chipped = false;
      delete out.lengthCm;
      delete out.crystal;
    } else {
      out.cut = pick(FACET[rough.type], r);
      out.ct = Math.round(rough.ct * (0.28 + r() * 0.14) * 100) / 100;
      out.value = Math.round(rough.value * GRADE_MULT[grade] * (flaw ? 0.6 : 1) * (0.8 + r() * 0.45) * 100) / 100;
    }
    out.grade = grade;
    out.label = `${rough.variety} ${k === 'crystal' ? '' : `${rough.type} `}${out.ct.toFixed(2)} ct, ${CUTS[out.cut].name} (${grade}-grade)`;
  }
  return { item: out, note };
}

// ---------- the finished stone ----------

export function makeCutMesh(item, { hq = false } = {}) {
  if (item.type === 'thunderegg') return makeThundereggMesh(item);
  const geo = cutGeometry(item.cut);
  // About 6.5 mm across a 1 ct round brilliant, scaling with the cube root of weight.
  const radius = item.type === 'agate' ? 0.012 : (6.5 * Math.cbrt(Math.max(0.05, item.ct || 1))) / 2000;
  let m;
  if (item.type === 'opal') {
    m = makeOpalCab(item, geo);
  } else if (item.type === 'agate') {
    m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: agateTexture(item.bands), roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03 }));
  } else {
    const def = CRYSTALS[item.variety];
    m = new THREE.Mesh(geo, stoneMaterial({
      type: def ? def.type : item.type, color: item.color ?? def?.color, finish: 'cut', hq, size: radius * 2,
    }));
  }
  m.scale.setScalar(radius);
  m.castShadow = true;
  if (item.cut !== 'cabochon') return m;
  // Stand a cabochon up so its polished dome faces you.
  const g = new THREE.Group();
  m.rotation.x = 1.1;
  g.add(m);
  return g;
}
