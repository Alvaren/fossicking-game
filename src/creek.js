import { smoothstep } from './noise.js';

// The creek: plan shape, long profile (pools and riffles), cross-section and
// a velocity field. Water flows toward -z. Everything here is analytic so the
// terrain, the water surface, the deposits and the drifting leaves all agree.

const TAU = Math.PI * 2;

export class Creek {
  constructor(noise, profile = {}) {
    this.profile = profile;
    this.dry = !!profile.dry;
    const r = noise.rand;
    this.n2 = noise.noise2;
    this.phase = r() * 100;
    this.lam1 = 46 + r() * 18; // pool-riffle spacing, roughly 5-7 channel widths
    this.lam2 = 21 + r() * 8;
    this.ph1 = r() * TAU;
    this.ph2 = r() * TAU;
    this.G = profile.slope ?? 0.009; // mean water-surface gradient
    this.tmp = {};
    this.level = 0; // flood rise above normal water level, metres

    // Boulders in the channel. Each throws a slack-water wake downstream.
    this.boulders = [];
    for (let z = 135; z > -135; z -= 8 + r() * 13) {
      const w = this.halfWidth(z);
      const n = (r() * 2 - 1) * 0.65 * w;
      const d = this.dcx(z);
      this.boulders.push({
        x: this.cx(z) + n * Math.sqrt(1 + d * d),
        z,
        r: 0.35 + r() * 0.5,
      });
    }
  }

  // ---------- plan shape ----------
  cx(z) {
    const p = this.phase;
    return (26 * Math.sin(z * 0.013 + p) + 9 * Math.sin(z * 0.034 + p * 1.7)) * (this.profile.meander ?? 1);
  }
  dcx(z) {
    const p = this.phase;
    return (26 * 0.013 * Math.cos(z * 0.013 + p) + 9 * 0.034 * Math.cos(z * 0.034 + p * 1.7)) * (this.profile.meander ?? 1);
  }
  ddcx(z) {
    const p = this.phase;
    return (-26 * 0.013 * 0.013 * Math.sin(z * 0.013 + p) - 9 * 0.034 * 0.034 * Math.sin(z * 0.034 + p * 1.7)) * (this.profile.meander ?? 1);
  }
  curvature(z) {
    const d = this.dcx(z);
    return this.ddcx(z) / Math.pow(1 + d * d, 1.5);
  }
  // 0 = straight reach, 1 = tight bend.
  bend(z) {
    return Math.min(1, Math.abs(this.curvature(z)) * 70);
  }

  // ---------- long profile ----------
  slope(z) {
    return this.G * (1 + 0.65 * Math.sin(TAU * z / this.lam1 + this.ph1) + 0.3 * Math.sin(TAU * z / this.lam2 + this.ph2));
  }
  waterY(z) {
    const { G, lam1, lam2, ph1, ph2 } = this;
    return G * (z - 0.65 * lam1 / TAU * Math.cos(TAU * z / lam1 + ph1) - 0.3 * lam2 / TAU * Math.cos(TAU * z / lam2 + ph2));
  }
  // The actual water surface right now, including any flood.
  // Keep the nominal drainage profile for terrain/deposition, while active
  // water and wet-material shading stay below the entire diggable dry bed.
  get waterOffset() { return this.dry ? -100 : this.level; }
  surfaceY(z) { return this.waterY(z) + this.waterOffset; }
  // 0 = pool (deep, flat, slow), 1 = riffle (steep, shallow, fast).
  riffle(z) {
    return smoothstep(1.15, 1.7, this.slope(z) / this.G);
  }
  halfWidth(z) { return (2.7 + 1.3 * this.riffle(z)) * (this.profile.width ?? 1); }
  depth(z) { return (0.95 - 0.6 * this.riffle(z)) * (this.profile.depth ?? 1); }
  baseSpeed(z) { return 0.22 + 1.05 * this.riffle(z); }
  // Where the current slows going downstream (riffle running into a pool).
  decel(z) {
    return Math.min(1, Math.max(0, (this.baseSpeed(z + 4) - this.baseSpeed(z)) / 0.45));
  }

  // ---------- cross-section ----------
  // n: signed distance from the centreline (+x side positive).
  // nIn: same, but positive toward the inside of the bend.
  local(x, z, o = this.tmp) {
    const d = this.dcx(z);
    const inv = 1 / Math.sqrt(1 + d * d);
    const n = (x - this.cx(z)) * inv;
    const k = this.curvature(z);
    o.n = n;
    o.nIn = k >= 0 ? n : -n;
    o.d = Math.abs(n);
    o.w = this.halfWidth(z);
    o.a = Math.min(1, Math.abs(k) * 70);
    o.tx = -d * inv; // unit vector pointing downstream
    o.tz = -inv;
    return o;
  }

  // Bed elevation relative to the water surface. qIn = nIn / halfWidth.
  // Thalweg and cut bank on the outside of bends, point bar on the inside.
  bedRel(qIn, a, D, w) {
    const sh = 0.3 * a;
    const prof = (q) => -D * (1 + 0.5 * a) * (1 - ((q + sh) / (1 + sh)) ** 2) + a * 0.45 * smoothstep(0, 1, q);
    if (qIn > 1) return prof(1) + (qIn - 1) * w * (0.5 - 0.38 * a); // gentle bar slope
    if (qIn < -1) return prof(-1) + (-1 - qIn) * w * (0.5 + 0.9 * a); // steep cut bank
    return prof(qIn);
  }

  // ---------- flow ----------
  velocity(x, z, out) {
    const L = this.local(x, z, {});
    const q = L.nIn / L.w;
    out.x = 0; out.z = 0; out.speed = 0;
    if (this.dry) return out;
    const lv = this.level;
    if (q > 1.6 + lv * 5 || q < -1.1 - lv) return out;
    const bed = this.bedRel(q, L.a, this.depth(z), L.w);
    if (bed > lv - 0.03) return out; // dry bar
    const sh = 0.3 * L.a;
    const t = (q + sh) / (1 + sh);
    let u = this.baseSpeed(z) * (0.2 + 0.8 * Math.max(0, 1 - t * t));
    // In flood the whole channel runs hard, bars included.
    if (lv > 0) u = Math.max(u, this.baseSpeed(z) * 0.5) * (1 + 1.6 * lv) * Math.min(1, (lv - bed) / 0.3 + 0.3);
    let dx = L.tx, dz = L.tz;
    const px = -L.tz, pz = L.tx;
    for (const b of this.boulders) {
      const rx = x - b.x, rz = z - b.z;
      if (Math.abs(rz) > 8 || Math.abs(rx) > 8) continue;
      const s = rx * L.tx + rz * L.tz;   // downstream of the boulder
      const lat = rx * px + rz * pz;
      const R = b.r;
      const wake = Math.exp(-((lat / (1.1 * R)) ** 2)) * (s > 0 ? Math.exp(-s / (4.5 * R)) : Math.exp(s / (0.7 * R)));
      const side = 0.35 * Math.exp(-(((Math.abs(lat) - 1.5 * R) / (0.7 * R)) ** 2)) * Math.exp(-Math.abs(s) / (2.5 * R));
      u *= Math.max(0, 1 - 0.9 * wake + side);
      if (s < 0) {
        const push = 0.6 * Math.exp(-((lat / (1.4 * R)) ** 2)) * Math.exp(s / (1.2 * R)) * (lat >= 0 ? 1 : -1);
        dx += px * push;
        dz += pz * push;
      }
    }
    const l = Math.hypot(dx, dz) || 1;
    out.x = (dx / l) * u;
    out.z = (dz / l) * u;
    out.speed = u;
    return out;
  }

  // 0..1 slack water in the lee of a boulder.
  wakeAt(x, z) {
    const L = this.local(x, z, {});
    let best = 0;
    for (const b of this.boulders) {
      const rx = x - b.x, rz = z - b.z;
      if (Math.abs(rz) > 8 || Math.abs(rx) > 8) continue;
      const s = rx * L.tx + rz * L.tz;
      if (s < 0) continue;
      const lat = rx * -L.tz + rz * L.tx;
      const w = Math.exp(-((lat / (1.2 * b.r)) ** 2)) * Math.exp(-s / (4.5 * b.r));
      if (w > best) best = w;
    }
    return best;
  }
}
