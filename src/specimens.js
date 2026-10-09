// Specimen grade: the exceptional pieces collectors pay over the odds for, and
// that you'd normally keep. Each kind of find has its own idea of exceptional.

export const SPECIMEN_PREMIUM = 3;
export const NUGGET_PREMIUM = 1.15; // nuggets sell a little over the price of fine gold

function isSpecimen(item, r) {
  const A = item.grade === 'A';
  switch (item.type) {
    case 'nugget':
      if (item.grams >= 15) return r() < 0.5;
      if (item.grams >= 5) return r() < 0.12;
      return r() < 0.03;
    case 'sapphire':
      return A && (item.ct >= 1.5 || (item.variety === 'parti' && r() < 0.5));
    case 'zircon':
    case 'topaz':
      return A && item.ct >= 2;
    case 'garnet':
      return A && item.ct >= 1 && r() < 0.3;
    case 'spinel':
      return false;
    case 'scheelite':
      return A && item.grams >= 20;
    case 'agate':
      return A && (item.variety === 'fortification' || item.grams >= 200);
    case 'quartz':
    case 'feldspar':
    case 'calcite':
    case 'fluorite': {
      if (item.broken || item.chipped || !A) return false;
      const rare = ['citrine', 'amazonite', 'topaz crystal'].includes(item.variety);
      return rare || item.lengthCm >= 7 || (item.variety === 'amethyst' && item.lengthCm >= 5);
    }
    default:
      return false;
  }
}

// Mark a fresh find as specimen grade (or not). Specimens go straight into the
// collection, which the buyer's "sell all" leaves alone.
export function grade(item, from, r = Math.random) {
  item.from = from;
  item.foundAt = Date.now();
  item.uid = item.uid || `${Date.now().toString(36)}${Math.floor(r() * 1e6).toString(36)}`;
  if (isSpecimen(item, r)) {
    item.specimen = true;
    item.keep = true;
    item.value = Math.round(item.value * SPECIMEN_PREMIUM * 100) / 100;
    if (item.type === 'nugget') item.style = r() < 0.5 ? 'quartz' : 'crystalline';
    item.label = `${specimenName(item)}`;
  }
  return item;
}

function specimenName(item) {
  if (item.type === 'nugget') {
    return item.style === 'quartz'
      ? `gold-in-quartz specimen, ${item.grams.toFixed(2)} g`
      : `crystalline gold nugget, ${item.grams.toFixed(2)} g`;
  }
  return item.label; // the SPECIMEN badge says the rest
}

export function makeNugget(grams, seed, goldPrice) {
  return {
    type: 'nugget',
    grams,
    seed,
    grade: grams >= 5 ? 'A' : 'B',
    value: Math.round(grams * goldPrice * NUGGET_PREMIUM * 100) / 100,
    label: `gold nugget, ${grams.toFixed(2)} g`,
  };
}
