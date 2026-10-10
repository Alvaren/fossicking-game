// Region transitions keep the complete home world intact. All functions are
// pure with respect to browser storage; callers save a successful transaction.
export const TASMANIA = 'tasmania-west';
export const PACK_ITEMS = [
  { id: 'classifier', name: 'Hand classifier', kg: 1.2, detail: 'Removes oversize before the wash goes into the pan.' },
  { id: 'bucket', name: 'Sample bucket', kg: 1, detail: 'Carry four wash parcels instead of one.' },
  { id: 'camp', name: 'Overnight kit', kg: 3.4, detail: 'Pitch a small shelter at Fern Bend and sleep until morning.' },
];
export const BASE_PACK_KG = 4.2; // pack, pan, scoop, lamp, food and water: game weights
export const PACK_LIMIT_KG = 10;
export const packWeight = items => BASE_PACK_KG + PACK_ITEMS.filter(i => items.includes(i.id)).reduce((s,i) => s+i.kg,0);
export const sampleCapacity = e => e.loadout.includes('bucket') ? 4 : 1;
export const carriedWeight = e => packWeight(e.loadout) + e.bucket.reduce((s,p) => s+(p.panVolume ?? 1)*1.5,0) + Object.values(e.panSession?.bed || {}).reduce((s,n)=>s+n,0)*1.5;
export function makeExpedition(home, loadout) {
  const selected = PACK_ITEMS.filter(i => loadout.includes(i.id)).map(i => i.id);
  if (packWeight(selected)>PACK_LIMIT_KG) return null;
  return { version: 1, seed: (home.seed ^ 0x715a9) >>> 0, loadout: selected,
    difficulty: home.difficulty || 'easy', up: {...home.up}, siteUse: {}, visited: [],
    bucket: [], panSession: null, gold: 0, gems: [], nuggets: [], tests: [],
    hour: 9, nights: 0, campPitched: false, player: null, trips: 0, totalRecovered: 0 };
}
export function depart(home, loadout) {
  if (!home || home.activeRegion===TASMANIA) return null;
  const prior = home.expeditions?.[TASMANIA];
  const fresh = makeExpedition(home,loadout);
  if (!fresh) return null;
  const expedition = prior ? {...structuredClone(prior),loadout:fresh.loadout,difficulty:fresh.difficulty,up:fresh.up} : fresh;
  // Material already in a pack is never silently discarded by changing kits.
  if (expedition.bucket.length>sampleCapacity(expedition)) return null;
  return {...home,activeRegion:TASMANIA,expeditions:{...home.expeditions,[TASMANIA]:expedition}};
}
export function saveExpedition(home, expedition) {
  return {...home,activeRegion:TASMANIA,expeditions:{...home.expeditions,[TASMANIA]:structuredClone(expedition)}};
}
export function returnHome(home) {
  if (home.activeRegion!==TASMANIA) return null;
  const e = structuredClone(home.expeditions[TASMANIA]);
  const recovered = e.gold+e.nuggets.reduce((s,n)=>s+n.grams,0);
  const next = {...home,activeRegion:'new-england',gold:(home.gold||0)+e.gold,
    gems:[...(home.gems||[]),...e.gems],nuggets:[...(home.nuggets||[]),...e.nuggets]};
  if (recovered>0) next.log={...home.log,goldTotal:(home.log?.goldTotal||0)+recovered};
  e.totalRecovered += recovered; e.trips++; e.gold=0; e.gems=[]; e.nuggets=[]; e.player=null; e.campPitched=false;
  next.expeditions={...home.expeditions,[TASMANIA]:e};
  return next;
}
