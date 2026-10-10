// Authored, tileable mineral surfaces. Independent of every world/save RNG.
// Two small shared atlases: sRGB colour, then linear height + roughness.
export const ROCK_TYPES = ['granite', 'rhyolite', 'basalt', 'quartz', 'ironstone', 'slate'];
export const ROCK_ID = Object.fromEntries(ROCK_TYPES.map((name, i) => [name, i]));
export const TILE = 256, BORDER = 8, INNER = TILE - BORDER * 2;
export const ATLAS_WIDTH = TILE * 4, ATLAS_HEIGHT = TILE * 2;
const clamp = n => Math.max(0, Math.min(1, n));
const mix = (a, b, t) => a + (b - a) * t;
const blend = (a, b, t) => a.map((v, i) => mix(v, b[i], clamp(t)));
const mod = (n, period) => (n % period + period) % period;
function hash(x, y, seed) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967296;
}
function noise(x, y, period, seed) {
  x *= period; y *= period;
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const h = (a, b) => hash(mod(a, period), mod(b, period), seed);
  return mix(mix(h(ix, iy), h(ix + 1, iy), u), mix(h(ix, iy + 1), h(ix + 1, iy + 1), u), v);
}
function cell(x, y, count, seed) {
  x *= count; y *= count;
  const ix = Math.floor(x), iy = Math.floor(y);
  let near = 10, next = 10, mineral = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = ix + i, cy = iy + j, a = mod(cx, count), b = mod(cy, count);
    const dx = cx + .15 + hash(a, b, seed) * .7 - x, dy = cy + .15 + hash(a, b, seed + 91) * .7 - y;
    const d = Math.hypot(dx, dy);
    if (d < near) { next = near; near = d; mineral = hash(a, b, seed + 203); } else next = Math.min(next, d);
  }
  return { distance: near, edge: next - near, mineral };
}

function surface(type, u, v) {
  const grain = noise(u, v, 96, 731), cloud = noise(u, v, 5, 144) * .6 + noise(u, v, 13, 54) * .4;
  let colour, height = .45, rough = .9;
  if (type === 'granite') {
    const c = cell(u + noise(u, v, 9, 17) * .006, v, 36, 56);
    // Interlocking grains rather than a uniform black-and-white spray.
    colour = c.mineral < .14 ? [39, 40, 37] : c.mineral < .43 ? [177, 139, 124] : c.mineral < .68 ? [128, 136, 136] : [211, 204, 187];
    colour = colour.map(n => n * (.8 + grain * .28 + cloud * .12));
    const boundary = 1 - clamp(c.edge * 24);
    colour = colour.map(n => n * (1 - boundary * .14));
    height = .39 + c.mineral * .22 + grain * .13 - boundary * .12;
    rough = c.mineral < .14 ? .5 : c.mineral < .68 && c.mineral >= .43 ? .48 : .83;
  } else if (type === 'rhyolite') {
    const flow = Math.sin((v * 15 + noise(u, v, 3, 123) * 1.1 + Math.sin(u * Math.PI * 4) * .22) * Math.PI * 2);
    colour = blend([147, 106, 100], [177, 138, 124], flow * .2 + cloud * .55);
    const c = cell(u, v, 39, 873), crystal = c.mineral > .8 ? clamp((.22 - c.distance) * 24) : 0;
    colour = blend(colour, [210, 197, 180], crystal);
    colour = colour.map(n => n * (.92 + grain * .16));
    height = .45 + flow * .075 + grain * .12 + crystal * .08;
    rough = .86 - crystal * .18;
  } else if (type === 'basalt') {
    colour = blend([47, 49, 49], [72, 73, 67], cloud);
    const c = cell(u, v, 30, 283), pit = c.mineral > .85 ? clamp((.2 - c.distance) * 15) : 0;
    colour = blend(colour.map(n => n * (.89 + grain * .22)), [27, 29, 28], pit * .8);
    height = .47 + grain * .11 - pit * .31; rough = .88 + pit * .08;
  } else if (type === 'quartz') {
    const fractures = cell(u + noise(u, v, 5, 29) * .025, v, 8, 936);
    const seam = (1 - clamp(fractures.edge * 65)) * (.2 + cloud * .5);
    colour = blend([174, 178, 172], [226, 224, 208], cloud);
    colour = blend(colour, [153, 111, 67], seam);
    height = .5 + noise(u, v, 24, 371) * .16 - seam * .2;
    rough = .49 + cloud * .19 + seam * .22;
  } else if (type === 'ironstone') {
    const c = cell(u, v, 13, 982), crack = 1 - clamp(c.edge * 29);
    colour = blend([95, 48, 29], [166, 94, 43], cloud);
    colour = blend(colour, [57, 40, 29], crack * .55);
    colour = colour.map(n => n * (.84 + grain * .28));
    height = .37 + cloud * .25 + grain * .13 - crack * .17; rough = .95;
  } else {
    const layers = v * 38 + noise(u, v, 4, 331) * .45;
    const crease = Math.pow(.5 + Math.sin(layers * Math.PI * 2) * .5, 8);
    colour = blend([65, 73, 72], [104, 112, 107], cloud);
    colour = colour.map(n => n * (1 - crease * .2) * (.94 + grain * .12));
    height = .48 + cloud * .08 - crease * .14; rough = .8 + crease * .13;
  }
  return { colour, height, rough };
}

export function makeRockAtlas() {
  const colour = new Uint8Array(ATLAS_WIDTH * ATLAS_HEIGHT * 4), relief = new Uint8Array(colour.length), averages = [];
  for (const [index, type] of ROCK_TYPES.entries()) {
    const tileColour = new Uint8Array(INNER * INNER * 4), tileRelief = new Uint8Array(tileColour.length), sum = [0, 0, 0];
    for (let y = 0; y < INNER; y++) for (let x = 0; x < INNER; x++) {
      const p = surface(type, x / INNER, y / INNER), k = (y * INNER + x) * 4;
      for (let c = 0; c < 3; c++) { tileColour[k + c] = Math.round(Math.max(0, Math.min(255, p.colour[c]))); sum[c] += tileColour[k + c]; }
      tileColour[k + 3] = 255;
      tileRelief[k] = Math.round(clamp(p.height) * 255); tileRelief[k + 1] = Math.round(clamp(p.rough) * 255); tileRelief[k + 3] = 255;
    }
    averages.push(sum.map(n => n / (INNER * INNER * 255)));
    const ox = index % 4 * TILE, oy = Math.floor(index / 4) * TILE;
    // Wrapped gutters prevent neighbouring geology leaking into filtered edges.
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const src = (mod(y - BORDER, INNER) * INNER + mod(x - BORDER, INNER)) * 4;
      const dst = ((oy + y) * ATLAS_WIDTH + ox + x) * 4;
      colour.set(tileColour.subarray(src, src + 4), dst); relief.set(tileRelief.subarray(src, src + 4), dst);
    }
  }
  return { colour, relief, averages };
}
