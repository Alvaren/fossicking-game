import * as THREE from 'three';
import { mulberry32 } from './noise.js';

// The fossil bed: a ledge of grey Permian shale with slabs weathered off it.
// Split a slab with the rock hammer (a few taps along the bedding) and most
// are barren, but some hold Glossopteris leaves, fern fronds, insects, or a
// fish. Prise fresh slabs off the ledge when you run out.

export const FOSSILS = {
  glossopteris: { name: 'Glossopteris leaf', age: 'Permian, about 260 million years', base: 22, w: 30 },
  fern: { name: 'seed fern frond', age: 'Permian, about 260 million years', base: 30, w: 18 },
  insect: { name: 'fossil insect wing', age: 'Permian, about 255 million years', base: 140, w: 7 },
  fish: { name: 'fossil fish', age: 'Permian, about 255 million years', base: 280, w: 6 },
  wholefish: { name: 'complete articulated fish', age: 'Permian, about 255 million years', base: 900, w: 1.2 },
};

function rollContent(r) {
  if (r() < 0.56) return null;
  let t = r() * Object.values(FOSSILS).reduce((s, f) => s + f.w, 0);
  for (const [k, f] of Object.entries(FOSSILS)) { t -= f.w; if (t <= 0) return k; }
  return 'glossopteris';
}

export function makeFossil(kind, r) {
  const f = FOSSILS[kind];
  const grade = r() < 0.18 ? 'A' : r() < 0.6 ? 'B' : 'C';
  const value = Math.round(f.base * (0.6 + r() * 0.8) * ({ A: 2.2, B: 1, C: 0.45 })[grade]);
  return {
    type: 'fossil', variety: kind, grade, value, seed: Math.floor(r() * 1e6), age: f.age,
    label: `${f.name} in shale (${grade}-grade)`,
  };
}

// ---------- drawing the fossils into the stone ----------

const texCache = new Map();
export function fossilTexture(kind, seed) {
  const key = `${kind}-${seed}`;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = 256; c.height = 192;
  const ctx = c.getContext('2d');
  const r = mulberry32(seed || 1);
  // Grey shale with faint bedding and specks.
  ctx.fillStyle = '#4e4b47';
  ctx.fillRect(0, 0, 256, 192);
  for (let i = 0; i < 400; i++) {
    const v = 60 + r() * 40;
    ctx.fillStyle = `rgba(${v + 4},${v + 2},${v},0.4)`;
    ctx.fillRect(r() * 256, r() * 192, 1 + r() * 3, 1);
  }
  // Impressions show as a rusty-brown carbon film on the grey.
  ctx.strokeStyle = 'rgba(22,18,14,0.9)';
  ctx.fillStyle = 'rgba(120,82,48,0.75)';
  ctx.lineCap = 'round';
  ctx.save();
  ctx.translate(128, 96);
  ctx.rotate((r() - 0.5) * 0.8);
  if (kind === 'glossopteris') {
    // Tongue-shaped leaf, strong midrib, fine netted veins.
    ctx.beginPath();
    ctx.moveTo(-85, 0);
    ctx.bezierCurveTo(-60, -34, 50, -30, 88, 0);
    ctx.bezierCurveTo(50, 30, -60, 34, -85, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(28,24,20,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-95, 0); ctx.lineTo(86, 0); ctx.stroke();
    ctx.lineWidth = 0.7;
    for (let x = -75; x < 80; x += 5) {
      const h = 26 * Math.sin(((x + 85) / 173) * Math.PI);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + 8, -h * 0.6, x + 14, -h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + 8, h * 0.6, x + 14, h); ctx.stroke();
    }
  } else if (kind === 'fern') {
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-100, 10); ctx.quadraticCurveTo(0, -6, 100, 4); ctx.stroke();
    for (let i = 0; i < 16; i++) {
      const x = -90 + i * 12, y = 10 - i * 0.6, len = 30 - Math.abs(i - 7) * 2;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + 4, y + s * len * 0.5, 4, len * 0.5, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (kind === 'insect') {
    // A single wing with its vein pattern, the usual insect fossil.
    ctx.beginPath();
    ctx.moveTo(-80, 0);
    ctx.bezierCurveTo(-40, -36, 60, -30, 85, -4);
    ctx.bezierCurveTo(60, 22, -40, 24, -80, 0);
    ctx.fillStyle = 'rgba(130,100,70,0.45)';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.moveTo(-78, 0); ctx.quadraticCurveTo(0, -18 + i * 6, 82, -14 + i * 4); ctx.stroke();
    }
    ctx.lineWidth = 0.6;
    for (let x = -60; x < 80; x += 9) { ctx.beginPath(); ctx.moveTo(x, -20); ctx.lineTo(x + 4, 18); ctx.stroke(); }
  } else {
    // Fish: body outline, spine and ribs, fins and tail.
    const whole = kind === 'wholefish';
    ctx.beginPath();
    ctx.moveTo(-90, 0);
    ctx.bezierCurveTo(-60, -28, 50, -26, 70, -4);
    ctx.lineTo(96, -22); ctx.lineTo(90, 0); ctx.lineTo(96, 22); ctx.lineTo(70, 4);
    ctx.bezierCurveTo(50, 26, -60, 28, -90, 0);
    ctx.fillStyle = 'rgba(112,76,44,0.75)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(72, 0); ctx.stroke();
    ctx.lineWidth = 0.9;
    for (let x = -55; x < 65; x += 5) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 3, -18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 3, 18); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(-72, -4, 4, 0, Math.PI * 2); ctx.stroke(); // eye socket
    if (whole) {
      // Scales over the body and fin rays.
      ctx.lineWidth = 0.5;
      for (let x = -50; x < 60; x += 6) for (let y = -14; y < 16; y += 6) { ctx.beginPath(); ctx.arc(x, y, 3, 0.2, 2.9); ctx.stroke(); }
      for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(-10 + k * 4, -22); ctx.lineTo(-4 + k * 5, -36); ctx.stroke(); }
    } else {
      // Only part of it made it: the tail end is missing.
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#4e4b47';
      ctx.fillRect(30 + r() * 30, -40, 100, 80);
      ctx.restore();
    }
  }
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}

const shaleMat = new THREE.MeshStandardMaterial({ color: 0x524f4b, roughness: 0.92, flatShading: true, envMapIntensity: 0.35 });

// A box with ragged edges: corners knocked about, so it reads as broken rock.
function roughSlab(w, h, d, r, jag) {
  const g = new THREE.BoxGeometry(w, h, d, Math.max(1, Math.round(w * 2)), 1, Math.max(1, Math.round(d * 2)));
  const p = g.attributes.position;
  const seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, [(r() - 0.5) * jag * 2, (r() - 0.5) * jag * 0.6, (r() - 0.5) * jag * 2]);
    const o = seen.get(key);
    p.setXYZ(i, p.getX(i) + o[0], p.getY(i) + o[1], p.getZ(i) + o[2]);
  }
  g.computeVertexNormals();
  return g;
}
export function makeFossilMesh(gem) {
  const top = new THREE.MeshStandardMaterial({ map: fossilTexture(gem.variety, gem.seed), roughness: 0.95, envMapIntensity: 0.35 });
  const s = gem.variety === 'wholefish' ? 1.4 : 1;
  // Box faces: +x, -x, +y (the split face with the fossil), -y, +z, -z.
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.03, 0.15 * s), [shaleMat, shaleMat, top, shaleMat, shaleMat, shaleMat]);
  m.castShadow = true;
  return m;
}

// ---------- the bed itself ----------

export class FossilBed {
  constructor(scene, terrain, seed, split) {
    this.scene = scene;
    this.terrain = terrain;
    const src = terrain.sources.fossil;
    this.src = src;
    this.slabs = [];
    this.nextId = 500;
    if (!src) return;
    const r = mulberry32(seed * 23 + 7);
    // The ledge: layers of shale stepping back into the hill.
    const ang = Math.atan2(terrain.creek.cx(src.z) - src.x, 0) + (r() - 0.5) * 0.6; // faces roughly toward the creek
    this.ledge = new THREE.Group();
    const gy = terrain.getHeight(src.x, src.z);
    this.ledge.position.set(src.x, gy - 0.25, src.z);
    this.ledge.rotation.y = ang;
    this.ledge.rotation.z = (r() - 0.5) * 0.12; // a gentle dip to the beds
    const layerMat = [0x4f4c48, 0x5d5953, 0x56534e, 0x67625b].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }));
    for (let i = 0; i < 9; i++) {
      const L = new THREE.Mesh(roughSlab(7.4 - i * 0.45, 0.17 + r() * 0.07, 2.6 - i * 0.16, r, 0.07), layerMat[i % 4]);
      L.position.set((r() - 0.5) * 0.4, -0.15 + i * 0.18, -i * 0.13);
      L.rotation.y = (r() - 0.5) * 0.06;
      L.castShadow = true;
      L.receiveShadow = true;
      this.ledge.add(L);
    }
    // Blocks that have tumbled off the face.
    for (let i = 0; i < 5; i++) {
      const B = new THREE.Mesh(roughSlab(0.5 + r() * 0.7, 0.18 + r() * 0.2, 0.4 + r() * 0.5, r, 0.06), layerMat[i % 4]);
      B.position.set((r() - 0.5) * 6, 0.05, 1.4 + r() * 0.5);
      B.rotation.set((r() - 0.5) * 0.4, r() * 3, (r() - 0.5) * 0.4);
      B.castShadow = true;
      this.ledge.add(B);
    }
    scene.add(this.ledge);
    // Ledge-frame (lx along it, lz out from the face) to world.
    const toWorld = (lx, lz) => ({ x: src.x + lx * Math.cos(ang) + lz * Math.sin(ang), z: src.z - lx * Math.sin(ang) + lz * Math.cos(ang) });
    this.colliders = [-2.6, 0, 2.6].map((lx) => ({ ...toWorld(lx, -0.3), r: 1.45 }));
    // Loose slabs weathered off the face, lying at its foot.
    for (let i = 0; i < 26; i++) {
      const { x, z } = toWorld((r() - 0.5) * 9, 1.9 + r() * 4);
      const content = rollContent(r);
      const slab = { id: i, x, z, content, seed: Math.floor(r() * 1e6), hits: 0, rot: r() * 6.28, w: 0.35 + r() * 0.3 };
      if (split.has(i)) continue;
      this.addSlab(slab);
    }
    this.raycaster = new THREE.Raycaster();
  }

  addSlab(slab) {
    const m = new THREE.Mesh(roughSlab(slab.w, 0.06, slab.w * 0.7, mulberry32(slab.seed), 0.025), shaleMat);
    const y = this.terrain.getHeight(slab.x, slab.z);
    m.position.set(slab.x, y + 0.03, slab.z);
    m.rotation.set((Math.random() - 0.5) * 0.15, slab.rot, (Math.random() - 0.5) * 0.15);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.slab = slab;
    slab.mesh = m;
    this.scene.add(m);
    this.slabs.push(slab);
  }

  // What the hammer is pointing at: a slab, the ledge, or nothing.
  pick(origin, dir) {
    if (!this.ledge) return null;
    this.raycaster.set(origin, dir);
    this.raycaster.far = 3.2;
    const meshes = this.slabs.map((s) => s.mesh);
    const hit = this.raycaster.intersectObjects([...meshes, this.ledge], true)[0];
    if (!hit) return null;
    if (hit.object.userData.slab) return { slab: hit.object.userData.slab };
    return { ledge: true, point: hit.point };
  }

  // One tap. Returns { done, content, message }.
  tap(target, playerPos) {
    if (target.slab) {
      const s = target.slab;
      s.hits++;
      // Each tap opens the bedding a bit: the slab shifts.
      s.mesh.position.y += 0.004;
      if (s.hits < 3) return { message: s.hits === 1 ? 'Tap along the bedding to split it...' : null };
      this.scene.remove(s.mesh);
      this.slabs = this.slabs.filter((o) => o !== s);
      return { done: true, split: s };
    }
    if (target.ledge) {
      this.ledgeHits = (this.ledgeHits || 0) + 1;
      if (this.ledgeHits < 4) return { message: this.ledgeHits === 1 ? 'Working a slab loose off the ledge...' : null };
      this.ledgeHits = 0;
      const a = Math.random() * Math.PI * 2;
      const slab = {
        id: this.nextId++, x: playerPos.x + Math.cos(a) * 0.9, z: playerPos.z + Math.sin(a) * 0.9,
        content: rollContent(Math.random), seed: Math.floor(Math.random() * 1e6), hits: 0, rot: Math.random() * 6.28, w: 0.35 + Math.random() * 0.3,
      };
      this.addSlab(slab);
      return { message: 'A fresh slab comes away from the ledge.', prised: true };
    }
    return {};
  }
}
