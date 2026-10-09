import { createPan, panResult, panType } from './panning.js';

export const RECIPES = [
  { id: 'gravel', name: 'Clean creek gravel', hint: 'Settle the bed; wash a thin layer and repeat.', mix: { gravel: 0.4, sand: 0.47, silt: 0.08, clay: 0, heavies: 0.05 } },
  { id: 'clay', name: 'Clay-bound wash', hint: 'Break submerged clumps before settling the heavies.', mix: { gravel: 0.25, sand: 0.3, silt: 0.05, clay: 0.3, heavies: 0.1 } },
  { id: 'heavies', name: 'Black-sand concentrate', hint: 'Use a small load and a gentle finishing edge.', mix: { gravel: 0.02, sand: 0.18, silt: 0.05, clay: 0, heavies: 0.75 } },
];
export const CAMP_UPGRADES = [
  { id: 'tub', name: 'Recovery tub', cost: 75, detail: 'Pan your own wash at camp. Catch the entire outflow for another pass.' },
  { id: 'rack', name: 'Sample rack', cost: 120, detail: 'Store eight bucket parcels, keeping their source and partly used contents.' },
  { id: 'kit', name: 'Portable tailings kit', cost: 240, requires: 'tub', detail: 'Catch outflow from new creek pans too. Rework it at the camp tub.' },
];
const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
export const mg = g => `${(g * 1000).toFixed(2)} mg`;
export const campLevel = c => ['Swag camp', 'Working camp', 'Established camp', 'Equipped prospecting camp'][CAMP_UPGRADES.filter(u => c.built[u.id]).length];
export function restoreCamp(saved) {
  return { version: 1, built: {}, mastery: {}, samples: [], tailings: [], history: [], fieldPans: 0, recovered: 0, nextId: 1,
    ...saved, practice: saved?.practice || null };
}
export function buyCampUpgrade(state, id) {
  const u = CAMP_UPGRADES.find(u => u.id === id), c = state.camp;
  if (!u || c.built[id] || state.cash < u.cost || (u.requires && !c.built[u.requires])) return false;
  state.cash -= u.cost; c.built[id] = true;
  return true;
}
export function storeSample(state) {
  if (!state.camp.built.rack || state.camp.samples.length >= 8 || !state.bucket.length) return false;
  const sample = state.bucket.shift();
  sample.sourceClaim ??= state.seed;
  state.camp.samples.push(sample);
  return true;
}
export function withdrawSample(state, index, capacity) {
  if (!Number.isInteger(index) || index < 0 || index >= state.camp.samples.length || state.bucket.length >= capacity) return false;
  state.bucket.push(state.camp.samples.splice(index, 1)[0]);
  return true;
}
export function startPractice(camp, { recipeId = 'gravel', panId = 'standard', volume = 0.5, difficulty = 'realistic' } = {}) {
  // An unfinished or uncollected pan cannot be replaced by another parcel.
  if (camp.practice?.panSession) return null;
  const recipe = RECIPES.find(r => r.id === recipeId) || RECIPES[0];
  volume = [0.25, 0.5, 1].includes(volume) ? volume : 0.5;
  difficulty = ['easy', 'prospector', 'realistic'].includes(difficulty) ? difficulty : 'realistic';
  const total = volume * 0.1; // borrowed, visible assay; never added to player inventory
  const session = createPan({ contents: { gold: total, picker: 0, finds: [] }, mix: recipe.mix, volume, panId: panType(panId).id, difficulty });
  session.mode = session.bed.clay > session.initialBulk * 0.03 ? 'clay' : 'stratify';
  session.tilt = 0;
  camp.practice = { recipeId: recipe.id, originalVolume: volume, total, recovered: 0, passes: 0, tailings: null,
    bucket: [], up: { pan: 2 }, difficulty, panSession: session };
  return camp.practice;
}

// Move the actual outflow into a new pan. No assay, random roll, or new gold.
// Fine/coarse proportions and clay-bound gold survive reprocessing unchanged.
export function tailingsPan(s, panId = s.panId) {
  const result = panResult(s);
  if (!result) return null;
  const volume = sum(s.tailings);
  if (volume <= 1e-12) return null;
  const heavyRetention = s.initialBed.heavies > 0 ? s.bed.heavies / s.initialBed.heavies : 1;
  const t = createPan({ sample: { ...s.sample, repan: true }, panId, difficulty: s.difficulty, volume,
    mix: Object.fromEntries(Object.entries(s.tailings).map(([k, v]) => [k, v / volume])),
    contents: { gold: sum(s.lostGold), picker: s.picker - result.picker,
      finds: s.finds.filter(f => (f.survival ?? 0.4) >= heavyRetention).map(f => ({ ...f })) } });
  t.mode = t.bed.clay > t.initialBulk * 0.03 ? 'clay' : 'stratify';
  t.tilt = 0;
  t.gold = { ...s.lostGold }; t.initialGold = { ...s.lostGold };
  t.bound = { fine: Math.min(t.gold.fine, s.boundOut?.fine || 0), coarse: Math.min(t.gold.coarse, s.boundOut?.coarse || 0) };
  return t;
}
export function techniqueReport(s) {
  const result = panResult(s);
  if (!result) return null;
  const total = sum(s.initialGold) + s.picker;
  const d = s.technique || {};
  const tips = [];
  if (s.volume / panType(s.panId).capacity > 0.6) tips.push('Take a smaller load: a crowded bed settles slowly and buries the riffles.');
  if ((d.boundLoss || 0) > total * 0.01) tips.push('Break the clay under water before washing; clumps carried gold out.');
  if ((d.unsettled || 0) > 0.5) tips.push('Re-submerge and stratify between layers; you washed while the bed was unsettled.');
  if ((d.aggressive || 0) > 0.3) tips.push('Reduce stroke speed or forward tilt; forceful washing increases losses.');
  if (!tips.length) tips.push('Controlled layers kept the bed settled. Compare another pan on the same parcel size.');
  return { total, recovered: result.gold + result.picker, lost: result.lost, recovery: total > 0 ? (result.gold + result.picker) / total : null,
    fineRecovered: s.gold.fine, fineLost: s.lostGold.fine, coarseRecovered: s.gold.coarse + result.picker,
    coarseLost: s.lostGold.coarse + s.picker - result.picker, tips, cycles: s.cycles, seconds: s.time };
}
export function collectPractice(camp, s) {
  const p = camp.practice, report = techniqueReport(s);
  if (!p || !report || s.campCollected) return null;
  s.campCollected = true;
  p.panSession = null;
  p.recovered += report.recovered; p.passes++;
  p.tailings = tailingsPan(s);
  const row = { ...report, recipeId: p.recipeId, volume: p.originalVolume, panId: s.panId, difficulty: s.difficulty, pass: p.passes };
  if (row.pass === 1 && row.difficulty === 'realistic' && row.recovery >= 0.95) camp.mastery[p.recipeId] = true;
  camp.history.push(row);
  if (camp.history.length > 36) camp.history.shift();
  return row;
}
export function repanPractice(camp, panId) {
  const p = camp.practice;
  if (!p || p.panSession || !p.tailings) return null;
  p.panSession = p.tailings; p.tailings = null;
  p.panSession.panId = panType(panId).id;
  return p;
}
export function collectFieldPan(state, s) {
  if (!s.finished || s.campCollected) return false;
  s.campCollected = true;
  const c = state.camp, result = panResult(s);
  c.fieldPans++; c.recovered += result.gold + result.picker;
  if (s.captureTailings) {
    const session = tailingsPan(s);
    if (session) c.tailings.push({ id: c.nextId++, session });
  }
  return true;
}
export function takeFieldTailings(state, id, panId) {
  const c = state.camp, index = c.tailings.findIndex(t => t.id === id);
  if (!c.built.tub || state.panSession || index < 0) return false;
  state.panSession = c.tailings.splice(index, 1)[0].session;
  const owned = ['standard', 'deep', 'dual'].slice(0, Math.min(2, state.up.pan || 0) + 1);
  state.panSession.panId = owned.includes(panId) ? panId : owned.at(-1);
  state.panSession.captureTailings = true;
  return true;
}
