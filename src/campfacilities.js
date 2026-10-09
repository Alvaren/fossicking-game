export const FACILITIES = [
  { id: 'water', name: 'Water tank', cost: 350, requires: [], detail: 'An 80 L camp supply with a tap for wet lapidary work. Includes the first fill.' },
  { id: 'generator', name: 'Generator', cost: 650, requires: [], detail: 'Power your workshop and camp lights. Start or stop it to manage fuel; includes 2 L.' },
  { id: 'lights', name: 'Camp lights', cost: 180, requires: ['generator'], detail: 'Two warm floodlights for the work area after dark. Requires a running generator.' },
  { id: 'lapidary', name: 'Lapidary shed', cost: 1800, requires: ['water','generator'], detail: 'Shape, refine and polish your own rough stones using water and powered equipment.' },
  { id: 'display', name: 'Display room', cost: 900, requires: [], detail: 'A walk-in collection room with three cases showing up to 45 of your kept specimens.' },
  { id: 'kelpie', name: 'Kelpie companion', cost: 180, requires: [], detail: 'A camp companion. Pat your kelpie, ask it to follow, or let it settle back at camp.' },
];
export function restoreFacilities(c) {
  c.water = Math.max(0, Math.min(80, Number(c.water) || 0));
  c.generatorFuel = Math.max(0, Math.min(10, Number(c.generatorFuel) || 0));
  c.generatorOn = !!c.generatorOn; c.lightsOn = c.lightsOn !== false;
  c.dogMode = c.dogMode === 'follow' ? 'follow' : 'stay';
  c.dogPats = Math.max(0, Number(c.dogPats) || 0);
  c.lapidarySession ||= null;
  return c;
}
export function buyFacility(state,id) {
  const f=FACILITIES.find(f=>f.id===id),c=state.camp;
  if(!f||c.built[id]||state.cash<f.cost||f.requires.some(k=>!c.built[k]))return false;
  state.cash-=f.cost;c.built[id]=true;
  if(id==='water')c.water=80;
  if(id==='generator')c.generatorFuel=2;
  return true;
}
export const powered = c => !!c.built.generator && c.generatorOn && c.generatorFuel>0;
export function toggleGenerator(c) {
  if(!c.built.generator||(!c.generatorOn&&c.generatorFuel<=0))return false;
  c.generatorOn=!c.generatorOn;return true;
}
export function resupply(state,kind) {
  const c=state.camp;
  const supplies={water:{key:'water',cost:8,amount:40,limit:80},fuel:{key:'generatorFuel',cost:12,amount:2,limit:10}};
  const supply=supplies[kind];
  if(!supply||!c.built[kind==='water'?'water':'generator']||c[supply.key]>=supply.limit)return false;
  const amount=Math.min(supply.amount,supply.limit-c[supply.key]);
  const cost=supply.cost*amount/supply.amount;if(state.cash<cost)return false;
  state.cash-=cost;c[supply.key]+=amount;return true;
}
export function stepFacilities(c,dt) {
  if(!powered(c)||!Number.isFinite(dt)||dt<=0)return;
  c.generatorFuel=Math.max(0,c.generatorFuel-Math.min(dt,.1)*.0008);
  if(c.generatorFuel===0)c.generatorOn=false;
}
