// Shelter prices and storage capacities are progression choices, not skill bonuses.
export const SHELTERS = [
  { id: 'swag', name: 'Roll-out swag', short: 'Swag', cost: 0, sampleSlots: 8, detail: 'A canvas bedroll under the stars. Sleep until sunrise and build from here.' },
  { id: 'tent', name: 'Canvas tent', short: 'Tent', cost: 250, sampleSlots: 12, detail: 'A proper canvas roof, a camp lantern and room for 12 parcels with a sample rack.' },
  { id: 'caravan', name: 'Touring caravan', short: 'Caravan', cost: 700, sampleSlots: 16, detail: 'A weatherproof home with windows, a step, storage lockers and 16 sample slots with a rack.' },
  { id: 'shed', name: 'Prospector’s shed', short: 'Shed', cost: 1200, sampleSlots: 20, detail: 'A corrugated-iron home base: walk-in bunk room, covered verandah, lighting and 20 sample slots with a rack.' },
];
export const shelterInfo = camp => SHELTERS.find(s => s.id === camp.shelter) || SHELTERS[0];
export const sampleCapacity = camp => camp.built.rack ? shelterInfo(camp).sampleSlots : 0;
export const canSleep = hour => Number.isFinite(hour) && hour >= 0 && hour < 24 && (hour >= 19 || hour < 5);
export function restoreShelter(id, legacy = false) {
  return SHELTERS.some(s => s.id === id) ? id : legacy ? 'tent' : 'swag';
}
export function buyShelter(state, id) {
  const current = SHELTERS.indexOf(shelterInfo(state.camp));
  const next = SHELTERS[current + 1];
  if (!next || next.id !== id || !Number.isFinite(state.cash) || state.cash < next.cost) return false;
  state.cash -= next.cost;
  state.camp.shelter = next.id;
  return true;
}
