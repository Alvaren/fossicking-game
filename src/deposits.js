import { smoothstep } from './noise.js';
import { difficulty } from './difficulty.js';
import { goldfieldWeight } from './goldfields.js';

// Where the gold, gems and agates are, following placer rules:
//  - Supply: minerals weather out of a source rock and are carried downstream.
//    Heavy minerals travel least (gold), gems further, light tough agates furthest.
//  - Traps: heavies drop where the current slows: the head of inside-bend point
//    bars, the lee of boulders, where a riffle runs into a pool, and in bedrock
//    cracks. The fast water on the outside of bends scours the bed clean.
//  - Depth: heavies sink through the gravel to a paystreak on bedrock.
//    Topsoil is lean. Agates sit through the gravel and as a lag on the surface.
//  - Off the creek: eluvial/colluvial spreads on the slopes below each source,
//    and old channel gravels under the flats and the high terrace (bench).

export class Deposits {
  constructor(terrain) {
    this.terrain = terrain;
    this.creek = terrain.creek;
    this.S = terrain.sources;
    this.L = {};
  }

  supply(z, src, L, bg) {
    if (!src) return 0;
    const up = src.entryZ - z; // how far downstream of the source gully we are
    return bg + (up > 0 ? Math.exp(-up / L) : Math.exp(up / 6));
  }

  eluvial(x, z, src, R) {
    if (!src) return 0;
    return Math.exp(-((x - src.ex) ** 2 + (z - src.ez) ** 2) / (2 * R * R));
  }

  zones(x, z) {
    const C = this.creek;
    const L = C.local(x, z, this.L);
    const q = L.nIn / L.w;
    const inCh = q >= 0 ? smoothstep(2.3, 1.5, q) : smoothstep(-1.25, -1.0, q);
    const bench = (1 - inCh) * this.terrain.benchFactor(x, z, L);
    const hill = (1 - inCh) * (1 - bench) * smoothstep(12, 22, L.d);
    const flat = Math.max(0, 1 - inCh - bench - hill);
    return { L, q, inCh, bench, hill, flat };
  }

  // Expected contents of one shovelful taken at elevation e.
  // base: ignore the difficulty level (used to place nuggets, so they stay put whatever the level).
  sample(x, z, e, base = false) {
    const C = this.creek, S = this.S;
    const geo = this.terrain.geologyAt(x, z);
    const { L, q, inCh, bench, hill, flat } = this.zones(x, z);
    const habove = Math.max(0, e - geo.bedrock);
    const below = geo.orig - e;
    const layer = habove < 0.06 ? 'bedrock' : below < geo.topsoil ? 'topsoil' : 'wash';

    const supGold = this.supply(z, S.reef, 260, 0.03); // next to nothing above the reef gully
    const supGem = this.supply(z, S.basalt, 650, 0.03);
    const supAgate = this.supply(z, S.rhyolite, 2500, 0.05);
    const eGold = this.eluvial(x, z, S.reef, 26);
    const eGem = this.eluvial(x, z, S.basalt, 34);
    const eAgate = this.eluvial(x, z, S.rhyolite, 42);

    // Hydraulic traps in the channel.
    const bar = C.bend(z + 6) * smoothstep(-0.1, 0.5, q) * smoothstep(2.3, 1.0, q); // bar head
    const wake = C.wakeAt(x, z);
    const decel = C.decel(z);
    const scour = q < -0.3 ? 1 - 0.65 * L.a : 1;
    const crevice = layer === 'bedrock' ? 0.7 + 1.2 * C.riffle(z) : 0;
    let trapHeavy = (0.3 + 1.1 * bar + 1.4 * wake + 0.9 * decel + crevice) * scour;
    // On harder levels the traps matter more: real gold is very patchy.
    const c = base ? 1 : difficulty.contrast;
    if (c !== 1) trapHeavy = 1.2 * Math.pow(trapHeavy / 1.2, c);
    const trapLight = 0.5 + 1.0 * C.bend(z) * smoothstep(0, 0.8, q) * smoothstep(2.4, 1.2, q) + 0.3 * wake;

    const onRock = layer === 'bedrock' ? 1.6 : 1;
    const heavyZone = inCh * trapHeavy + flat * 0.5 * onRock + bench * 1.1 * onRock;

    // Heavies concentrate toward bedrock; agates don't care much.
    const vGold = 0.2 + 2.3 * Math.exp(-habove / 0.22);
    const vGem = 0.3 + 1.9 * Math.exp(-habove / 0.32);
    const lean = layer === 'topsoil' ? 0.08 : 1;

    const gold = (heavyZone * supGold + hill * 0.75 * eGold * 2.2 + (flat + bench) * 0.3 * eGold) * vGold * lean;
    const gem = (heavyZone * supGem + hill * 0.75 * eGem * 1.6 + (flat + bench) * 0.6 * eGem) * vGem * lean;
    const garnet = (heavyZone * 0.8 + hill * 0.2) * vGem * lean;
    const topaz = heavyZone * (0.3 + 0.7 * smoothstep(-100, 140, z)) * vGem * lean;
    const agateLag = below < 0.2 ? 0.6 : 0;
    const agate = (inCh * trapLight * supAgate + flat * 0.5 * supAgate + bench * 0.7 * supAgate + hill * eAgate * 1.8)
      * (1 + agateLag) * (layer === 'topsoil' ? (hill > 0.5 ? 0.8 : 0.3) : 1);

    const gk = base ? 1 : difficulty.gold, mk = base ? 1 : difficulty.gems;
    const minerals = this.terrain.profile?.minerals || {};
    return {
      layer,
      // Game-scale clay fraction: weathered topsoil/bench wash binds more than
      // clean channel gravel. The value travels with the sample into the pan.
      clay: Math.min(0.5, (layer === 'topsoil' ? 0.28 : layer === 'bedrock' ? 0.14 : 0.04) + bench * 0.18 + flat * 0.08 + (this.terrain.profile?.clay || 0)),
      gold: (0.03 * gold * gk) * (minerals.gold ?? 1) * (this.terrain.goldPatches ? goldfieldWeight(this.terrain.goldPatches, x, z) * 3 : 1), // grams of fine gold per load
      sapphire: (0.16 * gem * mk) * (minerals.sapphire ?? 1),
      zircon: (0.28 * gem * mk) * (minerals.zircon ?? 1),
      spinel: (0.55 * gem * mk) * (minerals.spinel ?? 1),
      garnet: (0.35 * garnet * mk) * (minerals.garnet ?? 1),
      topaz: (0.03 * topaz * mk) * (minerals.topaz ?? 1),
      agate: (0.35 * agate) * (minerals.agate ?? 1),
      blackSand: heavyZone * vGem * lean + hill * 0.3,
      sizeBias: 1 + 0.8 * eGem,
    };
  }

  // Likelihood of a detectable nugget sitting near bedrock here.
  nuggetWeight(x, z) {
    if (this.terrain.goldPatches) return goldfieldWeight(this.terrain.goldPatches, x, z);
    const g = this.terrain.geologyAt(x, z);
    const s = this.sample(x, z, g.bedrock + 0.04, true);
    const cover = g.orig - g.bedrock;
    return s.gold * (cover < 1.3 ? 1 : 0.1);
  }

  // Agates lying on the surface: slopes below the rhyolite, and dry gravel bars.
  surfaceAgateWeight(x, z) {
    const C = this.creek;
    const { L, q, inCh, hill, flat } = this.zones(x, z);
    const h = this.terrain.getHeight(x, z);
    const wy = C.waterY(z);
    const exposedBar = inCh * smoothstep(wy - 0.15, wy + 0.05, h) * smoothstep(-0.2, 0.6, q);
    const supAgate = this.supply(z, this.S.rhyolite, 2500, 0.05);
    void L;
    return exposedBar * supAgate * 1.2 + (hill + flat * 0.4) * this.eluvial(x, z, this.S.rhyolite, 42);
  }

  // Exposed gravel bars only, weighted by what the creek carries there.
  barWeight(x, z, kind) {
    const { q, inCh } = this.zones(x, z);
    const h = this.terrain.getHeight(x, z);
    const wy = this.creek.waterY(z);
    const bar = inCh * smoothstep(wy - 0.15, wy + 0.05, h) * smoothstep(-0.2, 0.6, q);
    const sup = kind === 'agate' ? this.supply(z, this.S.rhyolite, 2500, 0.05) : this.supply(z, this.S.basalt, 650, 0.03);
    return bar * sup;
  }

  // Gems you might spot glinting on a bar ("specking").
  surfaceGemWeight(x, z) {
    const C = this.creek;
    const { q, inCh } = this.zones(x, z);
    const h = this.terrain.getHeight(x, z);
    const wy = C.waterY(z);
    const exposedBar = inCh * smoothstep(wy - 0.1, wy + 0.05, h) * smoothstep(0, 0.6, q);
    return exposedBar * this.supply(z, this.S.basalt, 650, 0.03) + 0.4 * this.eluvial(x, z, this.S.basalt, 34);
  }
}
