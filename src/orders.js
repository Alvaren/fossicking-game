import { mulberry32 } from './noise.js';

// Buyer's orders. Each morning the buyer at camp has a couple of special
// requests from his contacts. Hand over something that fits and they pay
// over the odds for it. Collection pieces are never offered up.

export const ORDERS = {
  blueSapph: {
    who: 'A jeweller in Inverell', want: 'a blue sapphire, any size',
    match: (g) => g.type === 'sapphire' && (g.variety === 'blue' || g.variety === 'inky blue'), bonus: 0.6, min: 25,
  },
  parti: {
    who: 'A gem cutter in Glen Innes', want: 'a parti sapphire of half a carat or more',
    match: (g) => g.type === 'sapphire' && g.variety === 'parti' && g.ct >= 0.5, bonus: 1, min: 80,
  },
  zircon: {
    who: 'A bloke in Tamworth', want: 'a zircon for his missus. Pink or honey if you can',
    match: (g) => g.type === 'zircon' && g.variety !== 'red-brown', bonus: 0.8, min: 30,
  },
  agate: {
    who: 'The lapidary club', want: 'a banded, carnelian or fortification agate to cut',
    match: (g) => g.type === 'agate' && ['banded', 'carnelian', 'fortification'].includes(g.variety), bonus: 0.7, min: 20,
  },
  amethyst: {
    who: 'A rock shop on the coast', want: 'an amethyst point 3 cm or longer, not broken',
    match: (g) => g.variety === 'amethyst' && g.lengthCm >= 3 && !g.broken, bonus: 0.8, min: 30,
  },
  smoky: {
    who: 'A crystal shop in Byron', want: 'a smoky quartz point with no chips',
    match: (g) => g.variety === 'smoky quartz' && !g.broken && !g.chipped, bonus: 1.2, min: 20,
  },
  topaz: {
    who: 'A mineral dealer from Sydney', want: 'any topaz, waterworn or crystal',
    match: (g) => g.type === 'topaz' && !g.broken, bonus: 0.6, min: 40,
  },
  scheelite: {
    who: 'A collector of fluorescent minerals', want: 'scheelite, the one that glows blue under UV',
    match: (g) => g.type === 'scheelite', bonus: 1, min: 40,
  },
  nugget: {
    who: 'A tourist after a souvenir', want: 'a gold nugget of a gram or more',
    match: (g) => g.type === 'nugget' && g.grams >= 1, bonus: 0.4, min: 40,
  },
  opal: {
    who: 'An opal buyer from Lightning Ridge', want: 'crystal or black opal with decent colour',
    match: (g) => (g.variety === 'crystal opal' || g.variety === 'black opal') && (g.grade === 'A' || g.grade === 'B') && !g.broken, bonus: 0.5, min: 60,
  },
  leaf: {
    who: 'The uni geology department', want: 'a Glossopteris leaf for a teaching collection',
    match: (g) => g.type === 'fossil' && g.variety === 'glossopteris', bonus: 1.5, min: 40,
  },
  fish: {
    who: 'The Australian Museum', want: 'a fossil fish, even a partial one',
    match: (g) => g.type === 'fossil' && (g.variety === 'fish' || g.variety === 'wholefish'), bonus: 1, min: 200,
  },
};

const KEYS = Object.keys(ORDERS);

export function rollOrders(seed, day) {
  const r = mulberry32(seed * 977 + day * 131 + 5);
  const pool = [...KEYS];
  const list = [];
  while (list.length < 2 && pool.length) {
    const k = pool.splice(Math.floor(r() * pool.length), 1)[0];
    list.push({ key: k, filled: false });
  }
  return list;
}

export function orderPay(order, item) {
  const o = ORDERS[order.key];
  return Math.round(item.value + Math.max(o.min, item.value * o.bonus));
}

// The best thing you've got for an order (the one it'd pay most for).
export function bestFor(order, items) {
  const o = ORDERS[order.key];
  let best = null;
  for (const it of items) if (!it.keep && o.match(it) && (!best || it.value > best.value)) best = it;
  return best;
}
