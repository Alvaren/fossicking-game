// How true to life the claim is. Easy is the fun version: rich ground, a
// detector that hears a gram a metre down, and plenty of hints. Realistic uses
// real-world numbers, so what works here works on a real creek:
//  - Grades. Ordinary wash runs a fraction of a milligram of gold a shovelful
//    (well under a gram a cubic metre); a good bedrock crevice in the right
//    trap might give a few milligrams, "a few colours a pan". The traps matter
//    far more than anywhere else, so reading the creek is everything.
//  - Detecting. A VLF detector hears a 1 g nugget only 10-15 cm down, a 30 g
//    one maybe 35-40 cm; signal falls away steeply with depth, and only what's
//    near the coil's footprint answers. Mineralised ground throws up hot rocks
//    (magnetic ironstone) that sound like targets until you dig them.
//  - Floods come less often.

export const LEVELS = {
  easy: {
    label: 'Easy',
    blurb: 'Rich ground and a generous detector. The fun version.',
    gold: 1, gems: 1, contrast: 1,
    detector: { base: 0.65, perCbrt: 0.33, falloff: 1.3, footprint: 3 },
    coilMult: [1, 1.35, 1.75],
    hotRocks: 0,
    nuggetSkew: 4.5,
    storms: 1,
  },
  prospector: {
    label: 'Prospector',
    blurb: 'Leaner ground and a truer detector. Reading the creek starts to matter.',
    gold: 0.35, gems: 0.55, contrast: 1.25,
    detector: { base: 0.22, perCbrt: 0.2, falloff: 1.8, footprint: 0.6 },
    coilMult: [1, 1.25, 1.5],
    hotRocks: 25,
    nuggetSkew: 5.5,
    storms: 1.6,
  },
  realistic: {
    label: 'Realistic',
    blurb: 'Real grades and real detector depths. What works here works on a real creek.',
    gold: 0.1, gems: 0.35, contrast: 1.5,
    detector: { base: 0.04, perCbrt: 0.13, falloff: 2.4, footprint: 0.35 },
    coilMult: [1, 1.2, 1.4],
    hotRocks: 60,
    nuggetSkew: 6.5,
    storms: 2.5,
  },
};

export const ORDER = ['easy', 'prospector', 'realistic'];

// The current level, shared by every system. main.js sets it from the save.
export const difficulty = { key: 'easy', ...LEVELS.easy };

export function setDifficulty(key) {
  Object.assign(difficulty, LEVELS[key] || LEVELS.easy, { key: LEVELS[key] ? key : 'easy' });
}

// Detection range (m) for a target of this many grams of gold, with this coil level.
export function goldRange(grams, coilLevel = 0) {
  const d = difficulty.detector;
  return (d.base + d.perCbrt * Math.cbrt(grams)) * difficulty.coilMult[coilLevel];
}
