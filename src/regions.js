// Region transitions keep the complete home world intact. All functions are
// pure with respect to browser storage; callers save a successful transaction.
export const TASMANIA = 'tasmania-west';
export const NORTHEAST = 'ne-tasmania';
export const EXPEDITIONS = [TASMANIA,NORTHEAST];
export const TRAVEL_FEE = 0;
export function payTravelFee(home, fee = TRAVEL_FEE) {
  const cash=home?.cash??0;
  if(!home||!Number.isFinite(fee)||fee<0||!Number.isFinite(cash)||cash<fee)return null;
  return {...home,cash:cash-fee};
}
export const PACK_ITEMS = [
  { id: 'classifier', name: 'Hand classifier', kg: 1.2, detail: 'Removes oversize before the wash goes into the pan.' },
  { id: 'bucket', name: 'Sample bucket', kg: 1, detail: 'Carry four wash parcels instead of one.' },
  { id: 'camp', name: 'Overnight kit', kg: 3.4, detail: 'Pitch a small shelter at the river campsite and sleep until morning.' },
];
export const BASE_PACK_KG = 4.2; // pack, pan, scoop, lamp, food and water: game weights
export const PACK_LIMIT_KG = 10;
export const packWeight = items => BASE_PACK_KG + PACK_ITEMS.filter(i => items.includes(i.id)).reduce((s,i) => s+i.kg,0);
export const sampleCapacity = e => e.loadout.includes('bucket') ? 4 : 1;
export const carriedWeight = e => packWeight(e.loadout) + e.bucket.reduce((s,p) => s+(p.panVolume ?? 1)*1.5,0) + Object.values(e.panSession?.bed || {}).reduce((s,n)=>s+n,0)*1.5 + (e.sieveSession?.sample?(e.sieveSession.sample.panVolume??1)*1.5:0);
export function makeExpedition(home, loadout, region = TASMANIA) {
  const selected = PACK_ITEMS.filter(i => loadout.includes(i.id)).map(i => i.id);
  if (packWeight(selected)>PACK_LIMIT_KG) return null;
  return { version: 1, region, seed: (home.seed ^ (region===NORTHEAST?0x4e715:0x715a9)) >>> 0, loadout: selected,
    difficulty: home.difficulty || 'easy', up: {...home.up}, siteUse: {}, visited: [],
    bucket: [], panSession: null, sieveSession: null, gold: 0, gems: [], nuggets: [], tests: [],
    hour: 9, nights: 0, campPitched: false, player: null, trips: 0, totalRecovered: 0 };
}
// Validate the destination before banking a haul or charging. One atomic save,
// including direct expedition-to-expedition travel, prevents partial transfers.
export function travelTo(home, destination, loadout = [], fee = TRAVEL_FEE) {
  const current=home?.activeRegion||'new-england';
  if(!home||current===destination||(!EXPEDITIONS.includes(destination)&&destination!=='new-england'))return null;
  let expedition;
  if(EXPEDITIONS.includes(destination)) {
    const fresh=makeExpedition(home,loadout,destination),prior=home.expeditions?.[destination];
    if(!fresh)return null;
    expedition=prior?{...structuredClone(prior),region:destination,loadout:fresh.loadout,difficulty:fresh.difficulty,up:fresh.up}:fresh;
    if(expedition.bucket.length>sampleCapacity(expedition))return null;
  }
  let next=payTravelFee(home,fee);
  if(!next)return null;
  next.expeditions={...home.expeditions};
  if(EXPEDITIONS.includes(current)) {
    if(!home.expeditions?.[current])return null;
    const e=structuredClone(home.expeditions[current]);
    const recovered=e.gold+e.nuggets.reduce((s,n)=>s+n.grams,0);
    next.gold=(home.gold||0)+e.gold;
    next.gems=[...(home.gems||[]),...e.gems];
    next.nuggets=[...(home.nuggets||[]),...e.nuggets];
    if(recovered>0)next.log={...home.log,goldTotal:(home.log?.goldTotal||0)+recovered};
    if(e.gems.length){
      next.log={...next.log};
      for(const gem of e.gems){if(!gem.type)continue;const entry=next.log[gem.type]||{n:0,best:null};next.log[gem.type]={n:entry.n+1,best:!entry.best||gem.value>entry.best.value?{label:gem.label,value:gem.value}:entry.best};}
    }
    e.totalRecovered=(e.totalRecovered||0)+recovered;e.trips=(e.trips||0)+1;
    e.gold=0;e.gems=[];e.nuggets=[];e.player=null;e.campPitched=false;
    next.expeditions[current]=e;
  }
  if(expedition)next.expeditions[destination]=expedition;
  next.activeRegion=destination;
  return next;
}
export const depart = (home,loadout) => travelTo(home,TASMANIA,loadout);
export const returnHome = home => EXPEDITIONS.includes(home?.activeRegion)?travelTo(home,'new-england'):null;
export function saveExpedition(home, expedition, region = expedition.region || TASMANIA) {
  return {...home,activeRegion:region,expeditions:{...home.expeditions,[region]:structuredClone(expedition)}};
}
