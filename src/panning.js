// Educational model, not calibrated fluid dynamics. Bulk is in arbitrary load
// units, gold in grams. Contents are assayed once; technique can only lose them.
export const PAN_TYPES = [
  { id: 'standard', name: 'Standard riffled pan', capacity: 1, coarse: 0.9, fine: 0.35, settle: 1, color: '#286759', detail: 'Coarse riffles hold the gravel bed. Use the smooth lip gently for the final reveal.' },
  { id: 'deep', name: 'Deep-riffle pan', capacity: 1.4, coarse: 1.25, fine: 0.25, settle: 0.8, color: '#344d79', detail: 'Larger loads and strong coarse traps; deep pockets take longer to stratify and clean out.' },
  { id: 'dual', name: 'Dual-riffle finishing pan', capacity: 0.85, coarse: 0.8, fine: 1.25, settle: 1.15, color: '#365f43', detail: 'Smaller capacity with fine finishing riffles. Overloading still buries the traps.' },
];
export const panType = (id) => PAN_TYPES.find(p => p.id === id) || PAN_TYPES[0];
const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const sum = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);
export const lightMass = (s) => s.bed.gravel + s.bed.sand + s.bed.silt + s.bed.clay;
export const goldLeft = (s) => s.gold.fine + s.gold.coarse;
export const readyToReveal = (s) => lightMass(s) <= s.initialBulk * 0.025 && s.bed.clay < s.initialBulk * 0.008;

// Expected grades become discrete colours once per bucket parcel. Without this,
// every positive expected grade would guarantee gold, even in nearly barren soil.
// 0.25 mg is a gameplay particle unit, not a claim about natural grain sizes.
export function assayGold(expected, rand = Math.random) {
  const mean = Math.max(0, expected) / 0.00025;
  if (mean === 0) return 0;
  if (mean > 30) return Math.max(0, Math.round(mean + Math.sqrt(mean) * (rand() + rand() + rand() - 1.5) * 2)) * 0.00025;
  const limit = Math.exp(-mean);
  let count = 0, product = 1;
  do { count++; product *= rand(); } while (product > limit);
  return (count - 1) * 0.00025;
}

export function materialFor(sample) {
  if (sample.crushed) return { gravel: 0.04, sand: 0.52, silt: 0.24, heavies: 0.2, clay: 0 };
  if (sample.cons) return { gravel: 0.02, sand: 0.18, silt: 0.05, heavies: 0.75, clay: 0 };
  // Explicit clay overrides the legacy-save fallback. Site variation is assigned
  // when digging; old loads use their layer instead of rerolling each opening.
  const clay = clamp(sample.clay ?? (sample.layer === 'topsoil' ? 0.3 : sample.layer === 'bedrock' ? 0.18 : 0.08), 0, 0.55);
  const heavy = clamp((sample.blackSand || 0) * 0.035, 0.015, 0.22);
  const gravel = Math.min(sample.classified ? 0.08 : 0.35, 0.9 - clay - heavy);
  return { gravel, sand: 1 - clay - heavy - gravel - 0.08, silt: 0.08, heavies: heavy, clay };
}

// Reserve part of the front bucket load. The remainder retains the same assay
// and discrete finds, so taking small pans or reopening never rerolls a find.
export function takePanLoad(bucket, { panId = 'standard', fill = 0.5, difficulty = 'realistic' }, assay) {
  const source = bucket[0];
  if (!source) return null;
  const volume = source.panVolume ?? (source.cons ? 0.45 : 1);
  const amount = Math.min(volume, panType(panId).capacity * clamp(fill, 0.2, 1.2));
  const fraction = amount / volume;
  source.panContents ||= assay(source);
  const contents = source.panContents;
  const selected = { gold: contents.gold * fraction, picker: 0, finds: [] };
  contents.gold -= selected.gold;
  if (contents.picker && contents.pickerAt < fraction) {
    selected.picker = contents.picker;
    contents.picker = 0;
  } else if (contents.picker) contents.pickerAt = (contents.pickerAt - fraction) / (1 - fraction);
  const keep = [];
  for (const entry of contents.finds) {
    if (entry.at < fraction) selected.finds.push(entry);
    else keep.push({ ...entry, at: (entry.at - fraction) / (1 - fraction) });
  }
  contents.finds = keep;
  const sample = { ...source };
  delete sample.panContents;
  sample.gold = selected.gold;
  if (fraction >= 1 - 1e-9) bucket.shift();
  else {
    source.panVolume = volume - amount;
    // Preserve rates for existing sluice/sieve systems if the remainder is used there.
    for (const key of ['gold', 'sapphire', 'zircon', 'spinel', 'garnet', 'topaz', 'agate', 'blackSand', 'loads']) {
      if (Number.isFinite(source[key])) source[key] *= 1 - fraction;
    }
  }
  if (fraction < 1 - 1e-9) source.gold = contents.gold;
  const mix = source.panMix || materialFor(sample);
  if (fraction < 1 - 1e-9) source.panMix = mix;
  return createPan({ sample, contents: selected, panId, difficulty, volume: amount, mix });
}

export function createPan({ sample = {}, contents = { gold: 0, picker: 0, finds: [] }, panId = 'standard', difficulty = 'realistic', volume = 0.5, mix = materialFor(sample) }) {
  const bed = Object.fromEntries(Object.entries(mix).map(([k, v]) => [k, v * volume]));
  const gold = { fine: Math.max(0, contents.gold) * 0.78, coarse: Math.max(0, contents.gold) * 0.22 };
  return {
    version: 1, sample, panId, difficulty, volume, initialBulk: sum(bed), bed,
    initialBed: { ...bed }, tailings: { gravel: 0, sand: 0, silt: 0, clay: 0, heavies: 0 },
    gold, initialGold: { ...gold }, lostGold: { fine: 0, coarse: 0 },
    bound: { fine: gold.fine * mix.clay, coarse: gold.coarse * mix.clay },
    finds: contents.finds, picker: contents.picker || 0, pickerRetention: 1,
    strat: 0, reveal: 0, cycles: 0, wasWashing: false, finished: false,
    mode: 'stratify', lip: 'coarse', tilt: 18, submerged: true,
    lastAction: 'rest', lastLoss: 0, time: 0, message: 'Submerge and loosen the bed before washing.',
  };
}

function loseGold(s, kind, amount) {
  const loss = Math.min(s.gold[kind], Math.max(0, amount));
  s.gold[kind] -= loss;
  s.lostGold[kind] += loss;
  s.lastLoss += loss;
}

export function automaticStroke(s) {
  if (s.bed.clay > s.initialBulk * 0.003) return { action: 'clay', speed: 0.55, submerged: true, tilt: 0, lip: 'coarse' };
  if (s.strat < (s.wasWashing ? 0.6 : 0.94)) return { action: 'stratify', speed: 0.5, submerged: true, tilt: 0, lip: 'coarse' };
  if (readyToReveal(s)) return { action: 'reveal', speed: 0.32, submerged: false, tilt: 8, lip: 'smooth' };
  return { action: 'wash', speed: 0.38, submerged: false, tilt: 18, lip: lightMass(s) < s.initialBulk * 0.16 && panType(s.panId).fine > 1 ? 'fine' : 'coarse' };
}

// Called with a fixed 1/60 s timestep by the UI. speed is pan-widths of
// hand travel per second, capped to avoid a teleporting pointer exploding it.
export function stepPan(s, input, dt) {
  if (s.finished || !Number.isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, 0.05);
  const speed = clamp(Number(input.speed) || 0, 0, 2.5);
  const action = input.action;
  const pan = panType(s.panId);
  s.lastLoss = 0;
  s.technique ||= { aggressive: 0, unsettled: 0, boundLoss: 0 };
  s.boundOut ||= { fine: 0, coarse: 0 };
  s.time += dt;
  s.lastAction = speed > 0.015 ? action : 'rest';
  if (speed <= 0.015) return;
  const tilt = clamp(Number(input.tilt) || 0, 0, 65);
  s.tilt = tilt; s.lip = input.lip || 'coarse'; s.submerged = !!input.submerged;
  const overload = Math.max(0, s.volume / pan.capacity - 0.55);
  const assistance = s.difficulty === 'prospector' ? 0.55 : 1;
  const effort = Math.min(speed, 0.8);
  if (action === 'clay') {
    if (!s.submerged) { s.message = 'Submerge the pan: dry clay clumps hold on to gold.'; return; }
    const before = s.bed.clay;
    const broken = Math.min(before, dt * effort * s.initialBulk * 0.3);
    s.bed.clay -= broken;
    s.bed.silt += broken;
    for (const k of ['fine', 'coarse']) s.bound[k] *= before > 0 ? 1 - broken / before : 0;
    s.strat = Math.max(0, s.strat - dt * effort * 0.08);
    s.message = before > s.initialBulk * 0.01 ? 'Rub the submerged clumps apart; the cloudy water is released clay.' : 'Clay is dispersed. Shake to settle the heavies.';
    return;
  }
  if (action === 'stratify') {
    s.wasWashing = false;
    if (!s.submerged || tilt > 15) { s.message = 'Level and submerge the pan so the whole bed can move.'; return; }
    const clayPenalty = 1 - clamp(s.bed.clay / s.initialBulk * 2);
    const good = speed < 1.1 ? effort : -speed * 0.4;
    s.strat = clamp(s.strat + dt * good * pan.settle * 0.42 * clayPenalty / (1 + overload * 3));
    s.message = speed >= 1.1 ? 'That shaking is remixing the bed. Shorter, gentler strokes.' : s.bed.clay > s.initialBulk * 0.04 ? 'Clay is still binding the gravel. Rub it apart under water.' : s.strat > 0.86 ? 'Heavies settled. Lift to the waterline and wash a thin layer.' : 'Light gravel rises as gold works down through the bed.';
    return;
  }
  if (action !== 'wash' && action !== 'reveal') return;
  if (s.submerged || tilt < 3) { s.message = 'Lift to the waterline and tip the working lip slightly forward.'; return; }
  if (speed > 0.65 || tilt > 26) s.technique.aggressive += dt;
  if (s.strat < 0.7) s.technique.unsettled += dt;
  const beforeLight = lightMass(s);
  const trapping = s.lip === 'smooth' ? 0.03 : s.lip === 'fine' ? pan.fine : pan.coarse;
  const packed = overload * 0.65 + (beforeLight / s.initialBulk > 0.45 && s.lip === 'fine' ? 0.3 : 0);
  const danger = Math.max(0, speed - 0.65) * 1.7 + Math.max(0, tilt - 26) / 17
    + Math.max(0, 0.7 - s.strat) * 1.8 + packed;
  const risk = danger * assistance;
  const flow = dt * speed * clamp(tilt / 18, 0.15, 3);
  // Clay clods can roll out with the wash, carrying their still-bound gold.
  const clayOut = Math.min(s.bed.clay, flow * s.initialBulk * (0.025 + danger * 0.16));
  if (s.bed.clay > 0) {
    for (const k of ['fine', 'coarse']) {
      const carried = s.bound[k] * clayOut / s.bed.clay;
      s.bound[k] -= carried;
      s.boundOut[k] += carried;
      s.technique.boundLoss += carried;
      loseGold(s, k, carried);
    }
  }
  s.bed.clay -= clayOut; s.tailings.clay += clayOut;
  let budget = flow * s.initialBulk * (action === 'reveal' ? 0.07 : 0.3);
  for (const k of ['gravel', 'sand', 'silt']) {
    const removed = Math.min(s.bed[k], budget);
    s.bed[k] -= removed; s.tailings[k] += removed; budget -= removed;
  }
  const finesStage = beforeLight < s.initialBulk * 0.15;
  const untrapped = finesStage && s.lip === 'coarse' ? 0.4 : 0;
  const heavyOut = Math.min(s.bed.heavies, flow * (s.initialBulk * 0.006 + s.bed.heavies * risk * 0.2) / (1 + trapping));
  s.bed.heavies -= heavyOut; s.tailings.heavies += heavyOut;
  for (const k of ['fine', 'coarse']) {
    const mobility = k === 'fine' ? 1 : 0.25;
    const free = Math.max(0, s.gold[k] - s.bound[k]);
    const rate = risk * (0.28 + untrapped) * mobility / (1 + trapping * 2);
    loseGold(s, k, free * Math.min(1, flow * rate));
  }
  s.pickerRetention = (s.pickerRetention ?? 1) * (1 - Math.min(1, flow * risk * 0.07 / (1 + trapping * 2)));
  const removed = beforeLight - lightMass(s);
  if (action === 'wash') {
    if (!s.wasWashing) s.cycles++;
    s.wasWashing = true;
    s.strat = clamp(s.strat - removed / s.initialBulk * 1.9 - flow * risk * 0.07);
  }
  if (action === 'reveal') {
    if (!readyToReveal(s)) s.message = 'Still too much light material. Wash down to concentrates first.';
    else if (s.lip !== 'smooth') s.message = 'Turn to the smooth lip to fan out the black sand for inspection.';
    else if (speed <= 0.6 && tilt <= 18) {
      s.reveal = clamp(s.reveal + dt * speed * 0.7);
      s.message = 'Roll a shallow film of water back across the black sand.';
      if (s.reveal >= 1) { s.finished = true; s.message = goldLeft(s) + s.picker > 0 ? 'The final colours. Collect your recovery when ready.' : 'No gold in this pan. Black sand alone does not guarantee gold.'; }
    } else s.message = 'Slow down and lower the tilt for the final reveal. Fine gold can still escape.';
  } else s.message = s.lastLoss > 0 ? 'Material is escaping with gold. Ease off, level the pan and re-stratify.' : s.strat < 0.65 ? 'Top layer removed. Submerge and re-stratify before the next wash.' : readyToReveal(s) ? 'Down to heavy concentrates. Use the smooth lip for a gentle reveal.' : 'A thin layer washes over the riffles; the settled bed stays behind.';
}

export function panResult(s) {
  if (!s.finished) return null;
  const coarseRetention = s.pickerRetention ?? (s.initialGold.coarse > 0 ? s.gold.coarse / s.initialGold.coarse : 1);
  const heavyRetention = s.initialBed.heavies > 0 ? s.bed.heavies / s.initialBed.heavies : 1;
  return {
    gold: goldLeft(s), picker: coarseRetention >= 0.5 ? s.picker : 0,
    finds: s.finds.filter(f => (f.survival ?? 0.4) < heavyRetention).map(f => f.item),
    blackSand: s.bed.heavies, lost: sum(s.lostGold) + (coarseRetention < 0.5 ? s.picker : 0),
  };
}
