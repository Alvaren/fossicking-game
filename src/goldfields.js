import { mulberry32 } from './noise.js';

// Compact, irregular residual/colluvial patches. No invisible global gold
// background: searching outside these patches can genuinely be unproductive.
// Separate RNG leaves every established destination's placement unchanged.
export function goldfieldPatches(seed, reef, creek) {
  const rand = mulberry32(seed * 113 + 41);
  const clamp = v => Math.max(-92, Math.min(92, v));
  return [
    { x: reef.ex, z: reef.ez, rx: 19, rz: 24 },
    { x: creek.cx(reef.entryZ - 30) + reef.side * 6, z: reef.entryZ - 30, rx: 11, rz: 22 },
    { x: reef.ex + reef.side * 24, z: reef.ez - 59, rx: 15, rz: 18 },
  ].map(p => ({ ...p, x: clamp(p.x + (rand() - .5) * 8), z: clamp(p.z + (rand() - .5) * 8), phase: rand() * Math.PI * 2 }));
}

export function goldfieldWeight(patches, x, z) {
  let weight = 0;
  for (const p of patches) {
    const dx = (x - p.x) / p.rx, dz = (z - p.z) / p.rz;
    const angle = Math.atan2(dz, dx);
    const edge = 1 + .14 * Math.sin(angle * 3 + p.phase) + .08 * Math.sin(angle * 5 - p.phase);
    const radius = Math.hypot(dx, dz) / edge;
    if (radius < 1) weight = Math.max(weight, (1 - radius) ** 1.4 * (.6 + .4 * Math.sin(x * .19 + z * .13 + p.phase) ** 2));
  }
  return weight;
}
