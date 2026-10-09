import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32, smoothstep } from './noise.js';
import { assets } from './assets.js';

// Crystal pockets and vugs in the granite country.
//  - Weathered pockets: pegmatite pockets that have rotted to red-brown pocket
//    clay in the decomposed granite. Loose smoky and clear quartz, feldspar,
//    the odd citrine or topaz. Quartz float washes downslope from them.
//  - Vugs: open cavities in quartz veins under a lid of solid rock, half full
//    of mud, lined with amethyst, clear quartz, calcite and fluorite growing
//    inward. Iron staining shows on the rock above, and it rings hollow.

export const CRYSTALS = {
  'smoky quartz': { type: 'quartz', color: 0x5a4636, opacity: 0.82, perCm: 4, shape: 'point' },
  'clear quartz': { type: 'quartz', color: 0xf0f5f8, opacity: 0.45, perCm: 3, shape: 'point' },
  'milky quartz': { type: 'quartz', color: 0xeeeae2, opacity: 1, perCm: 0.5, shape: 'point' },
  citrine: { type: 'quartz', color: 0xe09a2a, opacity: 0.75, perCm: 15, shape: 'point' },
  amethyst: { type: 'quartz', color: 0x7a3fa8, opacity: 0.8, perCm: 8, shape: 'point', zoned: true },
  microcline: { type: 'feldspar', color: 0xd9a58a, opacity: 1, perCm: 2, shape: 'block' },
  amazonite: { type: 'feldspar', color: 0x5fb8a6, opacity: 1, perCm: 10, shape: 'block' },
  'topaz crystal': { type: 'topaz', color: 0xd8e8f0, opacity: 0.6, perCm: 25, shape: 'prism4' },
  calcite: { type: 'calcite', color: 0xe8c88a, opacity: 0.72, perCm: 2, shape: 'rhomb' },
  fluorite: { type: 'fluorite', color: 0x8a5ac8, opacity: 0.7, perCm: 6, shape: 'cube' },
};

const POCKET_MIX = [
  ['smoky quartz', 40], ['clear quartz', 24], ['milky quartz', 12], ['citrine', 4],
  ['microcline', 12], ['amazonite', 3], ['topaz crystal', 4],
];
const VUG_MIX = [['amethyst', 45], ['clear quartz', 30], ['calcite', 12], ['fluorite', 6], ['smoky quartz', 7]];

const pickW = (list, r) => {
  let t = r() * list.reduce((s, x) => s + x[1], 0);
  for (const [k, w] of list) { t -= w; if (t <= 0) return k; }
  return list[0][0];
};

// ---------- crystal geometry (unit size: base at y=0, tip at y=1, radius 1) ----------

const unitGeo = {};
function crystalGeometry(shape) {
  if (unitGeo[shape]) return unitGeo[shape];
  let g;
  if (shape === 'point') {
    // Hexagonal prism with a six-sided termination: the classic quartz point.
    const prism = new THREE.CylinderGeometry(1, 1, 0.74, 6).translate(0, 0.37, 0);
    const tip = new THREE.ConeGeometry(1, 0.26, 6).translate(0, 0.87, 0);
    g = mergeGeometries([prism.toNonIndexed(), tip.toNonIndexed()]);
  } else if (shape === 'prism4') {
    const prism = new THREE.CylinderGeometry(1, 1, 0.8, 4).translate(0, 0.4, 0);
    const tip = new THREE.ConeGeometry(1, 0.2, 4).translate(0, 0.9, 0);
    g = mergeGeometries([prism.toNonIndexed(), tip.toNonIndexed()]);
  } else if (shape === 'block') {
    g = new THREE.BoxGeometry(1.6, 1, 1.2).translate(0, 0.5, 0).toNonIndexed();
  } else if (shape === 'rhomb') {
    g = new THREE.BoxGeometry(1.2, 1, 1.2).translate(0, 0.5, 0).toNonIndexed();
    const m = new THREE.Matrix4().makeShear(0.35, 0, 0.35, 0, 0, 0);
    g.applyMatrix4(m);
  } else {
    g = new THREE.BoxGeometry(1.4, 1, 1.4).translate(0, 0.5, 0).toNonIndexed();
  }
  g.computeVertexNormals();
  unitGeo[shape] = g;
  return g;
}

// Blender meshes for each habit; quartz gets one of four real-world habits per crystal.
const QUARTZ_HABITS = ['quartz_point', 'quartz_offset', 'quartz_chisel', 'quartz_tessin'];
function modelGeometry(c, shape) {
  const m = assets.crystals;
  if (!m) return null;
  if (shape === 'point') {
    const h = Math.abs(Math.floor((c.id ?? Math.round(c.len * 1e4)) * 2654435761) % QUARTZ_HABITS.length);
    // Amethyst and smoky quartz in these pockets are rarely the long Tessin habit.
    return m[QUARTZ_HABITS[h === 3 && c.variety !== 'clear quartz' ? 0 : h]] || null;
  }
  return m[{ prism4: 'topaz', block: 'feldspar', rhomb: 'calcite', cube: 'fluorite' }[shape]] || null;
}

export function makeCrystalMesh(c) {
  const def = CRYSTALS[c.variety];
  const col = new THREE.Color(def.color);
  const mat = new THREE.MeshStandardMaterial({
    color: col,
    roughness: c.broken ? 0.6 : 0.08,
    metalness: 0.05,
    transparent: def.opacity < 1,
    opacity: def.opacity,
    emissive: col.clone().multiplyScalar(0.12),
  });
  if (def.zoned) {
    // Amethyst colour concentrates toward the tips.
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvZone = position.y;')
        .replace('void main() {', 'varying float vZone;\nvoid main() {');
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying float vZone;\nvoid main() {')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(vec3(0.92, 0.9, 0.95), diffuseColor.rgb, smoothstep(0.2, 0.85, vZone));');
    };
  }
  const model = modelGeometry(c, def.shape);
  const m = new THREE.Mesh(model || crystalGeometry(def.shape), mat);
  // Blender blocks are already in proportion, so they scale more evenly.
  const r = c.len * (def.shape === 'point' ? 0.17 : def.shape === 'prism4' ? 0.2 : model ? 0.7 : 0.45);
  m.scale.set(r, c.broken ? c.len * 0.55 : c.len, r);
  m.position.set(c.x, c.y, c.z);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(c.ax, c.ay, c.az));
  m.castShadow = true;
  m.userData.crystal = c;
  return m;
}

// The find you put in your bag.
export function crystalToGem(c) {
  const def = CRYSTALS[c.variety];
  const grades = ['A', 'B', 'C'];
  let gi = grades.indexOf(c.grade);
  if (c.damage >= 0.35 && !c.broken) gi = Math.min(2, gi + 1);
  const grade = grades[gi];
  const cm = c.len * 100;
  let value = def.perCm * Math.pow(cm, 1.4) * ({ A: 3, B: 1, C: 0.3 })[grade];
  if (c.broken) value *= 0.08;
  else if (c.damage >= 0.35) value *= 0.4;
  const state = c.broken ? ', broken' : c.damage >= 0.35 ? ', chipped' : '';
  return {
    type: def.type,
    variety: c.variety,
    lengthCm: Math.round(cm * 10) / 10,
    grade,
    value: Math.round(value * 100) / 100,
    color: def.color,
    broken: !!c.broken,
    chipped: !c.broken && c.damage >= 0.35,
    // Enough to rebuild the crystal in the inventory viewer.
    crystal: { variety: c.variety, len: c.len, broken: !!c.broken, damage: c.damage, id: c.id, grade: c.grade },
    label: `${c.variety} ${cm.toFixed(1)} cm (${grade}-grade${state})`,
  };
}

// ---------- the field ----------

export class CrystalField {
  constructor(scene, terrain, seed, collected) {
    this.terrain = terrain;
    this.scene = scene;
    const rand = mulberry32(seed * 41 + 17);
    this.rand = rand;
    const g = terrain.sources.granite;
    this.center = g;

    // Quartz veins: straight-ish lines across the granite.
    this.veins = [];
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI;
      const ox = g.x + (rand() - 0.5) * 18, oz = g.z + (rand() - 0.5) * 18;
      this.veins.push({ ox, oz, dx: Math.cos(a), dz: Math.sin(a), len: 14 + rand() * 12, width: 0.12 + rand() * 0.12 });
    }

    this.sites = [];
    const cover = (x, z) => { const gg = terrain.geologyAt(x, z); return gg.orig - gg.bedrock; };
    const onVein = () => {
      const v = this.veins[Math.floor(rand() * this.veins.length)];
      const t = (rand() - 0.5) * v.len;
      return [v.ox + v.dx * t, v.oz + v.dz * t, v];
    };
    // Vugs: in veins, under bare rock.
    for (let tries = 0; tries < 2000 && this.sites.filter((s) => s.kind === 'vug').length < 6; tries++) {
      const [x, z] = onVein();
      if (terrain.graniteFactor(x, z) < 0.3 || cover(x, z) > 0.08) continue;
      if (this.sites.some((s) => Math.hypot(s.x - x, s.z - z) < 3)) continue;
      // A flat lens of a cavity along the vein, under a thin rock lid.
      const r = 0.26 + rand() * 0.14;
      const lid = 0.04 + rand() * 0.06;
      const top = terrain.getOrigHeight(x, z);
      this.sites.push({
        id: this.sites.length, kind: 'vug', x, z, r,
        rx: r, ry: r * 0.42, rz: r * 0.85, rot: rand() * Math.PI,
        cy: top - lid - r * 0.42, mud: 0.15 + rand() * 0.2, lid,
      });
    }
    // Pockets: in the rotten granite between pavements, near the veins.
    for (let tries = 0; tries < 3000 && this.sites.filter((s) => s.kind === 'pocket').length < 7; tries++) {
      const [vx, vz] = onVein();
      const x = vx + (rand() - 0.5) * 5, z = vz + (rand() - 0.5) * 5;
      if (terrain.graniteFactor(x, z) < 0.25) continue;
      const r = 0.24 + rand() * 0.18;
      const topDepth = 0.15 + rand() * 0.18;
      if (cover(x, z) < topDepth + r * 1.2 + 0.05) continue;
      if (this.sites.some((s) => Math.hypot(s.x - x, s.z - z) < 3)) continue;
      const top = terrain.getOrigHeight(x, z);
      this.sites.push({
        id: this.sites.length, kind: 'pocket', x, z, r,
        rx: r, ry: r * 0.55, rz: r * 0.8, rot: rand() * Math.PI,
        cy: top - topDepth - r * 0.55, topDepth,
      });
    }
    for (const s of this.sites) {
      s.crystals = this.growCrystals(s, mulberry32(seed * 7 + s.id * 131));
      for (const c of s.crystals) if (collected.has(c.id)) c.collected = true;
    }
    this.buildDecals();
  }

  // Inside a site's ellipsoid? Returns 0 (centre) .. 1 (surface), or >1 outside.
  ellip(s, x, y, z) {
    const dx = x - s.x, dz = z - s.z;
    const c = Math.cos(s.rot), sn = Math.sin(s.rot);
    const u = dx * c + dz * sn, w = -dx * sn + dz * c;
    return (u / s.rx) ** 2 + ((y - s.cy) / s.ry) ** 2 + (w / s.rz) ** 2;
  }

  // Top of the mud in a vug (a flat level).
  mudTop(s) { return s.cy - s.ry + s.mud * 2 * s.ry; }

  // Floor of a vug's cavity directly below (x,z), or null if outside it.
  vugFloor(s, x, z) {
    const dx = x - s.x, dz = z - s.z;
    const c = Math.cos(s.rot), sn = Math.sin(s.rot);
    const u = dx * c + dz * sn, w = -dx * sn + dz * c;
    const k = 1 - (u / s.rx) ** 2 - (w / s.rz) ** 2;
    if (k <= 0) return null;
    return Math.max(this.mudTop(s), s.cy - s.ry * Math.sqrt(k));
  }

  veinDist(x, z) {
    let best = 1e9;
    for (const v of this.veins) {
      const px = x - v.ox, pz = z - v.oz;
      const t = Math.max(-v.len / 2, Math.min(v.len / 2, px * v.dx + pz * v.dz));
      const d = Math.hypot(px - v.dx * t, pz - v.dz * t) - v.width / 2;
      if (d < best) best = d;
    }
    return best;
  }

  growCrystals(s, r) {
    const list = [];
    const n = s.kind === 'pocket' ? 7 + Math.floor(r() * 8) : 10 + Math.floor(r() * 12);
    for (let i = 0; i < n; i++) {
      const variety = pickW(s.kind === 'pocket' ? POCKET_MIX : VUG_MIX, r);
      const grade = r() < 0.15 ? 'A' : r() < 0.53 ? 'B' : 'C';
      let x, y, z, ax, ay, az, len;
      if (s.kind === 'pocket') {
        // Loose in the clay, lying every which way.
        let tries = 0;
        do {
          x = s.x + (r() * 2 - 1) * s.rx * 0.8;
          z = s.z + (r() * 2 - 1) * s.rz * 0.8;
          y = s.cy + (r() * 2 - 1) * s.ry * 0.7;
        } while (this.ellip(s, x, y, z) > 0.6 && ++tries < 20);
        const a = r() * Math.PI * 2, tilt = 0.3 + r() * 1.0;
        ax = Math.cos(a) * Math.sin(tilt); az = Math.sin(a) * Math.sin(tilt); ay = Math.cos(tilt) * (r() < 0.5 ? 1 : -1);
        len = 0.03 + Math.pow(r(), 2) * 0.13;
      } else {
        // Rooted on the floor and lower walls, growing in toward the middle.
        const a = r() * Math.PI * 2, el = -0.5 - r() * 1.0;
        const ux = Math.cos(a) * Math.cos(el), uy = Math.sin(el), uz = Math.sin(a) * Math.cos(el);
        const c = Math.cos(s.rot), sn = Math.sin(s.rot);
        const lx = ux * s.rx * 0.95, lz = uz * s.rz * 0.95;
        x = s.x + lx * c - lz * sn;
        z = s.z + lx * sn + lz * c;
        y = s.cy + uy * s.ry * 0.95;
        const tx = s.x - x, ty = s.cy + s.ry * 0.3 - y, tz = s.z - z;
        const tl = Math.hypot(tx, ty, tz);
        ax = tx / tl + (r() - 0.5) * 0.5; ay = ty / tl + (r() - 0.5) * 0.3; az = tz / tl + (r() - 0.5) * 0.5;
        len = 0.02 + Math.pow(r(), 2) * 0.08;
      }
      const al = Math.hypot(ax, ay, az);
      list.push({
        id: s.id * 100 + i, site: s.id, variety, grade, x, y, z,
        ax: ax / al, ay: ay / al, az: az / al, len, damage: 0, broken: false,
      });
    }
    return list;
  }

  sitesNear(x, z, radius) {
    return this.sites.filter((s) => Math.hypot(s.x - x, s.z - z) < radius + s.r);
  }

  // Tap the rock with a hammer: 0 = solid, 1 = right over a cavity.
  hollowness(x, z) {
    let best = 0;
    for (const s of this.sites) {
      if (s.kind !== 'vug' || s.opened) continue;
      const d = Math.hypot(x - s.x, z - s.z);
      best = Math.max(best, Math.exp(-((d / (s.r + 0.25)) ** 2)) * (s.lid < 0.12 ? 1 : 0.75));
    }
    return best;
  }

  // Has a shovel at elevation e hit pocket clay?
  pocketAt(x, z, e) {
    for (const s of this.sites) {
      if (s.kind !== 'pocket') continue;
      if (this.ellip(s, x, Math.min(e, s.cy), z) < 1.15 && e < s.cy + s.ry + 0.08) return s;
    }
    return null;
  }

  // A shovel through a pocket crunches crystals.
  shovelDamage(s, n) {
    const live = s.crystals.filter((c) => !c.collected && !c.broken);
    const hit = [];
    for (let k = 0; k < n && live.length; k++) {
      const c = live.splice(Math.floor(this.rand() * live.length), 1)[0];
      c.broken = true;
      c.damage = 1;
      hit.push(c);
    }
    return hit;
  }

  // Quartz float: broken crystal shards downslope of each pocket.
  floatItems() {
    const out = [];
    const r = mulberry32(991);
    for (const s of this.sites) {
      if (s.kind !== 'pocket') continue;
      // Downslope = direction the ground falls away fastest.
      const T = this.terrain;
      const gx = T.getOrigHeight(s.x + 1, s.z) - T.getOrigHeight(s.x - 1, s.z);
      const gz = T.getOrigHeight(s.x, s.z + 1) - T.getOrigHeight(s.x, s.z - 1);
      const gl = Math.hypot(gx, gz) || 1;
      for (let k = 0; k < 5; k++) {
        const t = 0.8 + r() * 7;
        const x = s.x - (gx / gl) * t + (r() - 0.5) * 1.5;
        const z = s.z - (gz / gl) * t + (r() - 0.5) * 1.5;
        const v = r() < 0.6 ? 'smoky quartz' : r() < 0.6 ? 'clear quartz' : 'milky quartz';
        out.push({ id: 5000 + s.id * 10 + k, x, z, crystal: { variety: v, grade: 'C', len: 0.015 + r() * 0.02, damage: 1, broken: true } });
      }
    }
    return out;
  }

  // White vein lines on the bare rock, and rusty staining over the vugs.
  buildDecals() {
    const T = this.terrain;
    const pos = [], idx = [];
    for (const v of this.veins) {
      const px = -v.dz, pz = v.dx;
      let prev = null;
      for (let t = -v.len / 2; t <= v.len / 2; t += 0.35) {
        const x = v.ox + v.dx * t, z = v.oz + v.dz * t;
        const g = T.geologyAt(x, z);
        const rock = g.orig - g.bedrock < 0.06;
        if (!rock) { prev = null; continue; }
        const w = v.width / 2;
        const a = [x + px * w, T.getHeight(x + px * w, z + pz * w) + 0.02, z + pz * w];
        const b = [x - px * w, T.getHeight(x - px * w, z - pz * w) + 0.02, z - pz * w];
        const base = pos.length / 3;
        pos.push(...a, ...b);
        if (prev !== null) idx.push(prev, prev + 1, base, prev + 1, base + 1, base);
        prev = base;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    this.veinMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: 0xebe6dc, roughness: 0.5, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2,
    }));
    this.veinMesh.receiveShadow = true;
    this.stains = [];
    this.scene.add(this.veinMesh);

    const stain = new THREE.MeshStandardMaterial({
      color: 0x9a5426, roughness: 1, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3,
    });
    const r = mulberry32(77);
    for (const s of this.sites) {
      if (s.kind !== 'vug') continue;
      for (let k = 0; k < 3; k++) {
        const m = new THREE.Mesh(new THREE.CircleGeometry(0.1 + r() * 0.18, 12).rotateX(-Math.PI / 2), stain);
        const x = s.x + (r() - 0.5) * s.r * 1.6, z = s.z + (r() - 0.5) * s.r * 1.6;
        m.position.set(x, T.getHeight(x, z) + 0.022, z);
        m.scale.set(1 + r(), 1, 0.6 + r() * 0.6);
        m.rotation.y = r() * 3;
        this.scene.add(m);
        this.stains.push(m);
      }
    }
  }

  // A hand dig draws its own vein and staining, so tuck the decals away there.
  hideDecalsIn(x0, x1, z0, z1) {
    const inside = (x, z) => x > x0 - 0.05 && x < x1 + 0.05 && z > z0 - 0.05 && z < z1 + 0.05;
    const pos = this.veinMesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) if (inside(pos.getX(i), pos.getZ(i))) pos.setY(i, pos.getY(i) - 2);
    pos.needsUpdate = true;
    for (const m of this.stains) if (inside(m.position.x, m.position.z)) m.visible = false;
  }

  // Damage on crystals still in the ground, and what you've found out about each site.
  stateSnapshot() {
    const crystals = [];
    for (const s of this.sites) for (const c of s.crystals) {
      if (!c.collected && (c.damage > 0 || c.broken)) crystals.push([c.id, Math.round(c.damage * 100) / 100, c.broken ? 1 : 0]);
    }
    const sites = this.sites.filter((s) => s.opened || s.warned).map((s) => [s.id, s.opened ? 1 : 0, s.warned ? 1 : 0]);
    return { crystals, sites };
  }

  restoreState(st) {
    if (!st) return;
    const byId = new Map();
    for (const s of this.sites) for (const c of s.crystals) byId.set(c.id, c);
    for (const [id, damage, broken] of st.crystals || []) {
      const c = byId.get(id);
      if (c) { c.damage = damage; c.broken = !!broken; }
    }
    for (const [id, opened, warned] of st.sites || []) {
      const s = this.sites[id];
      if (s) { s.opened = !!opened; s.warned = !!warned; }
    }
  }

  collectedIds() {
    return this.sites.flatMap((s) => s.crystals.filter((c) => c.collected).map((c) => c.id));
  }
}

export { smoothstep };
