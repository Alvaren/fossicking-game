import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { SIZE, PLAY } from './terrain.js';
import { mulberry32, smoothstep } from './noise.js';

// Scenery: gum trees, rocks (coloured by the local geology), outcrops of the
// source rocks, creek boulders, spinifex, claim pegs and the camp.
// Returns colliders (circles on the ground plane), the shop spot and an update.

export function buildWorld(scene, terrain, seed, avoid = []) {
  const rand = mulberry32(seed * 31 + 5);
  const colliders = [];
  const camp = terrain.camp;
  const creek = terrain.creek;
  const S = terrain.sources;
  const half = SIZE / 2;
  const L = {};
  const chan = (x, z) => { creek.local(x, z, L); return L.d - L.w; }; // metres outside the wetted channel

  const nearCamp = (x, z, r) => Math.hypot(x - camp.x, z - camp.z) < r;
  const fossil = terrain.sources.fossil;
  const blocked = (x, z, r) => avoid.some((a) => Math.hypot(a.x - x, a.z - z) < r)
    || (fossil && Math.hypot(fossil.x - x, fossil.z - z) < r + 7); // keep the shale bed clear
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const col = new THREE.Color();

  // ---------- trees ----------
  const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
  const variants = [0, 1, 2, 3].map(() => gumTree(rand));
  const placements = variants.map(() => []);
  for (let tries = 0, n = 0; tries < 9000 && n < 400; tries++) {
    const x = (rand() * 2 - 1) * (half - 4);
    const z = (rand() * 2 - 1) * (half - 4);
    const c = chan(x, z);
    if (c < 2.5 || nearCamp(x, z, 13) || blocked(x, z, 2)) continue;
    const p = c < 12 ? 0.55 : 0.07; // river red gums crowd the banks
    if (rand() > p) continue;
    const sc = 0.75 + rand() * 0.6;
    placements[Math.floor(rand() * variants.length)].push({ x, z, s: sc, r: rand() * Math.PI * 2 });
    colliders.push({ x, z, r: 0.35 * sc });
    n++;
  }
  variants.forEach((geo, vi) => {
    const list = placements[vi];
    const inst = new THREE.InstancedMesh(geo, treeMat, list.length);
    list.forEach((t, i) => {
      q.setFromAxisAngle(up, t.r);
      m4.compose(new THREE.Vector3(t.x, terrain.getHeight(t.x, t.z) - 0.1, t.z), q, new THREE.Vector3(t.s, t.s, t.s));
      inst.setMatrixAt(i, m4);
    });
    inst.castShadow = true;
    inst.receiveShadow = true;
    scene.add(inst);
  });

  // ---------- rocks ----------
  // Float rock tells you what's upslope: white quartz from the reef, black
  // basalt from the cap, pink rhyolite with agate nodules, red ironstone elsewhere.
  const geoTint = (x, z, v) => {
    const k = (s, R) => Math.exp(-((x - s.x) ** 2 + (z - s.z) ** 2) / (2 * R * R));
    const kb = k(S.basalt, 40), kr = k(S.reef, 24), ky = k(S.rhyolite, 36);
    const roll = rand();
    if (roll < kb) return col.setRGB(0.13 + v * 0.08, 0.13 + v * 0.07, 0.14 + v * 0.07, THREE.SRGBColorSpace);
    if (roll < kb + kr) return col.setRGB(0.86 + v * 0.1, 0.82 + v * 0.08, 0.74 + v * 0.06, THREE.SRGBColorSpace);
    if (roll < kb + kr + ky) return col.setRGB(0.70 + v * 0.12, 0.48 + v * 0.1, 0.44 + v * 0.08, THREE.SRGBColorSpace);
    return col.setRGB(0.42 + v * 0.2, 0.30 + v * 0.14, 0.24 + v * 0.1, THREE.SRGBColorSpace);
  };
  const rockGeo = lumpy(new THREE.DodecahedronGeometry(1, 1), 0.28, rand);
  const rockMat = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true });
  const outcrop = [S.reef, S.basalt, S.rhyolite];
  const scatter = 520, perOutcrop = 34;
  const boulders = creek.boulders.filter((b) => terrain.inside(b.x, b.z));
  const rockCount = scatter + perOutcrop * outcrop.length + boulders.length;
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  let ri = 0;
  const putRock = (x, z, s, sink, collide) => {
    q.setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, rand() * 3));
    const y = terrain.getHeight(x, z) - s * sink;
    m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s * (0.55 + rand() * 0.4), s * (0.8 + rand() * 0.4)));
    rocks.setMatrixAt(ri, m4);
    rocks.setColorAt(ri, col);
    ri++;
    if (collide) colliders.push({ x, z, r: s * 0.85 });
  };
  for (let i = 0; i < scatter; i++) {
    let x, z;
    do {
      x = (rand() * 2 - 1) * (half - 4);
      z = (rand() * 2 - 1) * (half - 4);
    } while (nearCamp(x, z, 9) || blocked(x, z, 2));
    const inCreek = chan(x, z) < 1;
    const s = inCreek ? 0.12 + rand() * 0.4 : 0.15 + Math.pow(rand(), 2.5) * 1.5;
    if (inCreek) col.setRGB(0.45 + rand() * 0.15, 0.42 + rand() * 0.13, 0.38 + rand() * 0.12, THREE.SRGBColorSpace);
    else geoTint(x, z, rand());
    putRock(x, z, s, 0.35, s > 0.6);
  }
  outcrop.forEach((src, k) => {
    for (let i = 0; i < perOutcrop; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 9;
      const x = src.x + Math.cos(a) * r, z = src.z + Math.sin(a) * r;
      const v = rand();
      if (k === 0) col.setRGB(0.88 + v * 0.1, 0.84 + v * 0.08, 0.76 + v * 0.05, THREE.SRGBColorSpace);
      else if (k === 1) col.setRGB(0.12 + v * 0.07, 0.12 + v * 0.06, 0.13 + v * 0.06, THREE.SRGBColorSpace);
      else col.setRGB(0.72 + v * 0.1, 0.5 + v * 0.08, 0.45 + v * 0.07, THREE.SRGBColorSpace);
      const s = 0.4 + Math.pow(rand(), 1.5) * 1.6;
      putRock(x, z, s, 0.3, s > 0.7);
    }
  });
  // Creek boulders: they make the slack water the heavies settle in.
  for (const b of boulders) {
    col.setRGB(0.42 + rand() * 0.12, 0.40 + rand() * 0.1, 0.37 + rand() * 0.1, THREE.SRGBColorSpace);
    putRock(b.x, b.z, b.r * 1.15, 0.1, true);
  }
  rocks.count = ri;

  // Granite tors: rounded boulders weathered out of the granite and left stacked on the pavements.
  const G = terrain.sources.granite;
  const torGeo = lumpy(new THREE.IcosahedronGeometry(1, 2), 0.1, rand);
  const tors = new THREE.InstancedMesh(torGeo, new THREE.MeshStandardMaterial({ roughness: 0.9 }), 90);
  let ti = 0;
  for (let k = 0; k < 60 && ti < 86; k++) {
    const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * 22;
    const x = G.x + Math.cos(a) * rr, z = G.z + Math.sin(a) * rr;
    if (chan(x, z) < 3 || blocked(x, z, 3.2) || nearCamp(x, z, 12)) continue;
    const n = 1 + Math.floor(rand() * 3);
    let y = terrain.getHeight(x, z) - 0.25;
    const base = 0.7 + rand() * 0.9;
    for (let b = 0; b < n && ti < 90; b++) {
      const sc = base * (1 - b * 0.28);
      const ox = b ? (rand() - 0.5) * sc * 0.5 : 0, oz = b ? (rand() - 0.5) * sc * 0.5 : 0;
      q.setFromEuler(new THREE.Euler((rand() - 0.5) * 0.3, rand() * 6, (rand() - 0.5) * 0.3));
      m4.compose(new THREE.Vector3(x + ox, y + sc * 0.6, z + oz), q, new THREE.Vector3(sc * 1.2, sc * 0.75, sc));
      tors.setMatrixAt(ti, m4);
      const v = rand();
      col.setRGB(0.52 + v * 0.1, 0.43 + v * 0.07, 0.38 + v * 0.06, THREE.SRGBColorSpace); // warm pink-grey granite
      tors.setColorAt(ti, col);
      ti++;
      y += sc * 1.25;
    }
    colliders.push({ x, z, r: base * 1.1 });
  }
  tors.count = ti;
  tors.castShadow = true;
  tors.receiveShadow = true;
  scene.add(tors);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  scene.add(rocks);

  // ---------- spinifex tufts ----------
  const tuftGeo = spinifex(rand);
  const tuftMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
  const tuftCount = 6000;
  const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, tuftCount);
  let placed = 0;
  for (let tries = 0; tries < 60000 && placed < tuftCount; tries++) {
    const x = (rand() * 2 - 1) * (half - 3);
    const z = (rand() * 2 - 1) * (half - 3);
    if (chan(x, z) < 2 || nearCamp(x, z, 6) || (fossil && Math.hypot(fossil.x - x, fossil.z - z) < 6)) continue;
    const patch = terrain.n2(x * 0.05 + 100, z * 0.05) * 0.5 + 0.5;
    if (rand() > 0.15 + patch * 0.6) continue;
    const sc = 0.3 + rand() * 0.45;
    q.setFromAxisAngle(up, rand() * 6.28);
    m4.compose(new THREE.Vector3(x, terrain.getHeight(x, z) - 0.05, z), q, new THREE.Vector3(sc, sc * (0.7 + rand() * 0.6), sc));
    tufts.setMatrixAt(placed, m4);
    const v = rand();
    col.setRGB(0.5 + v * 0.16, 0.48 + v * 0.1, 0.22 + v * 0.06, THREE.SRGBColorSpace);
    tufts.setColorAt(placed, col);
    placed++;
  }
  tufts.count = placed;
  tufts.receiveShadow = true;
  scene.add(tufts);

  // ---------- old opal workings ----------
  // Shafts with a windlass over them, fenced off with star pickets and wire,
  // and the signs you see all over the opal fields.
  const timber = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.9 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.6, metalness: 0.5 });
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x050403 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x9a8a6a, roughness: 1 });
  const dangerTex = signTexture('DANGER  OPEN SHAFT', '#c01a10', '#fff4ea', 54);
  const dangerMat = new THREE.MeshStandardMaterial({ map: dangerTex, roughness: 0.8 });
  for (const sh of terrain.shafts || []) {
    const y = terrain.getHeight(sh.x, sh.z);
    const g = new THREE.Group();
    g.position.set(sh.x, y, sh.z);
    g.rotation.y = rand() * Math.PI;
    scene.add(g);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20).rotateX(-Math.PI / 2), holeMat);
    hole.position.y = 0.02;
    g.add(hole);
    // Timber collar around the hole.
    for (let k = 0; k < 4; k++) {
      const log = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.14), timber);
      log.position.set(Math.cos((k * Math.PI) / 2) * 0.6, 0.06, Math.sin((k * Math.PI) / 2) * 0.6);
      log.rotation.y = (k * Math.PI) / 2 + Math.PI / 2;
      log.castShadow = true;
      g.add(log);
    }
    // Windlass: two uprights, a drum with a crank, rope and a kibble (bucket).
    for (const s of [-0.75, 0.75]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.1), timber);
      post.position.set(s, 0.5, 0);
      post.castShadow = true;
      g.add(post);
    }
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.5, 12).rotateZ(Math.PI / 2), timber);
    drum.position.y = 0.95;
    drum.castShadow = true;
    g.add(drum);
    const crank = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), steel);
    crank.position.set(0.82, 0.85, 0);
    g.add(crank);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 5), ropeMat);
    rope.position.set(0.1, 0.6, 0);
    g.add(rope);
    const kibble = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.24, 12, 1, true), steel);
    kibble.position.set(0.1, 0.18, 0);
    kibble.material = steel;
    g.add(kibble);
    // Star pickets and two strands of wire.
    const ring = 1.55;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const pk = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.0, 0.035), steel);
      pk.position.set(Math.cos(a) * ring, 0.5, Math.sin(a) * ring);
      g.add(pk);
    }
    for (const wy of [0.55, 0.9]) {
      const wire = new THREE.Mesh(new THREE.TorusGeometry(ring, 0.004, 4, 32).rotateX(Math.PI / 2), steel);
      wire.position.y = wy;
      g.add(wire);
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), dangerMat);
    sign.position.set(0, 0.78, ring + 0.03);
    g.add(sign);
    const back = sign.clone();
    back.rotation.y = Math.PI;
    back.position.z = ring - 0.03;
    g.add(back);
    colliders.push({ x: sh.x, z: sh.z, r: ring + 0.2 });
  }
  if (terrain.sources.opal) {
    // Warning board at the edge of the field.
    const O = terrain.sources.opal;
    const toward = Math.atan2(camp.x - O.x, camp.z - O.z);
    const bx = O.x + Math.sin(toward) * 22, bz = O.z + Math.cos(toward) * 22;
    const by = terrain.getHeight(bx, bz);
    const board = new THREE.Group();
    board.position.set(bx, by, bz);
    board.rotation.y = toward;
    scene.add(board);
    for (const s of [-0.7, 0.7]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.0, 0.08), timber);
      post.position.set(s, 1.0, 0);
      board.add(post);
    }
    const tex = signTexture('OLD OPAL WORKINGS', '#7a2a12', '#efe4cc', 46, 'Danger: open shafts. Keep out of fenced areas.');
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.75), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
    face.position.set(0, 1.55, 0.05);
    board.add(face);
    colliders.push({ x: bx, z: bz, r: 0.9 });
  }

  // ---------- claim pegs ----------
  const pegMat = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.9 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.6 });
  const pegGeo = new THREE.BoxGeometry(0.12, 1.2, 0.12);
  const capGeo = new THREE.BoxGeometry(0.14, 0.25, 0.14);
  const pegs = [];
  for (let t = -PLAY; t <= PLAY; t += 14) {
    pegs.push([t, -PLAY], [t, PLAY], [-PLAY, t], [PLAY, t]);
  }
  for (const [x, z] of pegs) {
    if (chan(x, z) < 1.5) continue;
    const y = terrain.getHeight(x, z);
    const corner = Math.abs(x) === PLAY && Math.abs(z) === PLAY;
    const p = new THREE.Mesh(pegGeo, pegMat);
    p.position.set(x, y + 0.6, z);
    p.scale.y = corner ? 1.5 : 1;
    p.castShadow = true;
    scene.add(p);
    const c = new THREE.Mesh(capGeo, capMat);
    c.position.set(x, y + (corner ? 1.8 : 1.2), z);
    scene.add(c);
  }

  // ---------- camp ----------
  // Built facing -x; flip it if the creek is on the +x side so the buyer's table faces the water.
  const flip = creek.cx(camp.z) > camp.x ? -1 : 1;
  const toWorld = (lx, lz) => ({ x: camp.x + lx * flip, z: camp.z + lz * flip });
  const campGroup = new THREE.Group();
  campGroup.position.set(camp.x, camp.y, camp.z);
  campGroup.rotation.y = flip < 0 ? Math.PI : 0;
  scene.add(campGroup);
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
  const add = (geo, mat, x, y, z, parent = campGroup) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const collide = (lx, lz, r) => { const w = toWorld(lx, lz); colliders.push({ x: w.x, z: w.z, r }); };

  // Gold & gem buyer's table (the shop), on the creek side of camp.
  const sp = toWorld(-3, 0);
  const shop = new THREE.Vector3(sp.x, camp.y, sp.z);
  const wood = std(0x8a5a35);
  const tableG = new THREE.Group();
  tableG.position.set(-3, 0, 0);
  campGroup.add(tableG);
  add(new THREE.BoxGeometry(0.9, 0.06, 1.8), wood, 0, 0.9, 0, tableG);
  for (const [lx, lz] of [[-0.38, -0.82], [0.38, -0.82], [-0.38, 0.82], [0.38, 0.82]]) {
    add(new THREE.BoxGeometry(0.06, 0.9, 0.06), wood, lx, 0.45, lz, tableG);
  }
  const brass = std(0xc9a24a, { metalness: 0.9, roughness: 0.35 });
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), brass, 0, 1.1, 0.5, tableG);
  add(new THREE.BoxGeometry(0.02, 0.02, 0.4), brass, 0, 1.28, 0.5, tableG);
  add(new THREE.CylinderGeometry(0.09, 0.07, 0.03, 16), brass, 0, 1.2, 0.32, tableG);
  add(new THREE.CylinderGeometry(0.09, 0.07, 0.03, 16), brass, 0, 1.2, 0.68, tableG);
  // Black velvet gem tray.
  add(new THREE.BoxGeometry(0.35, 0.03, 0.25), std(0x1a1a22), 0.05, 0.945, -0.45, tableG);
  add(new THREE.BoxGeometry(0.08, 2.4, 0.08), wood, 0.5, 1.2, -1.0, tableG);
  add(new THREE.BoxGeometry(0.08, 2.4, 0.08), wood, 0.5, 1.2, 1.0, tableG);
  const sign = add(
    new THREE.PlaneGeometry(2.1, 0.6),
    new THREE.MeshStandardMaterial({ map: signTexture('GOLD & GEMS'), roughness: 0.9 }),
    0.46, 2.05, 0, tableG,
  );
  sign.rotation.y = -Math.PI / 2;
  add(new THREE.BoxGeometry(0.04, 0.64, 2.14), wood, 0.5, 2.05, 0, tableG);
  collide(-3, 0, 1.0);

  // Tent.
  const tent = add(new THREE.ConeGeometry(2.3, 2.5, 4, 1), std(0x5d6b3a, { flatShading: true }), 3.5, 1.25, 4);
  tent.rotation.y = Math.PI / 4;
  const tentDoor = add(new THREE.PlaneGeometry(0.9, 1.3), std(0x1d1a12), 1.84, 0.62, 4);
  tentDoor.rotation.y = -Math.PI / 2;
  collide(3.5, 4, 2.0);

  // Ute.
  const ute = new THREE.Group();
  ute.position.set(3.5, 0, -4.5);
  ute.rotation.y = 0.35;
  campGroup.add(ute);
  const paint = std(0xd8d2c4, { metalness: 0.3, roughness: 0.45 });
  const dark = std(0x222222, { roughness: 0.9 });
  add(new THREE.BoxGeometry(4.6, 0.55, 1.85), paint, 0, 0.85, 0, ute);
  add(new THREE.BoxGeometry(1.8, 0.75, 1.75), paint, 0.95, 1.5, 0, ute);
  add(new THREE.BoxGeometry(1.2, 0.5, 1.7), std(0x2a3a44, { metalness: 0.6, roughness: 0.15 }), 0.9, 1.55, 0, ute).scale.set(1.52, 1, 1.04);
  add(new THREE.BoxGeometry(2.3, 0.35, 1.85), paint, -1.15, 1.28, 0, ute);
  add(new THREE.BoxGeometry(2.2, 0.3, 1.7), dark, -1.15, 1.32, 0, ute);
  for (const [wx, wz] of [[1.5, 0.92], [1.5, -0.92], [-1.4, 0.92], [-1.4, -0.92]]) {
    add(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 18).rotateX(Math.PI / 2), dark, wx, 0.42, wz, ute);
  }
  for (const o of [-1.4, 0, 1.4]) collide(3.5 + Math.cos(0.35) * o, -4.5 - Math.sin(0.35) * o, 1.15);
  const uteColliders = colliders.slice(-3); // these follow the ute when you drive it

  // Campfire.
  const fire = new THREE.Group();
  fire.position.set(0.5, 0, 1.5);
  campGroup.add(fire);
  const stoneMat = std(0x6b6058, { flatShading: true });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    add(new THREE.DodecahedronGeometry(0.16, 0), stoneMat, Math.cos(a) * 0.55, 0.08, Math.sin(a) * 0.55, fire);
  }
  const logMat = std(0x3b2a1e);
  for (let i = 0; i < 3; i++) {
    const log = add(new THREE.CylinderGeometry(0.07, 0.08, 0.9, 7), logMat, 0, 0.12, 0, fire);
    log.rotation.set(Math.PI / 2 - 0.25, (i / 3) * Math.PI, 0, 'YXZ');
  }
  const embers = add(
    new THREE.ConeGeometry(0.25, 0.5, 7),
    new THREE.MeshStandardMaterial({ color: 0xff7a2a, emissive: 0xff5a10, emissiveIntensity: 2.2, transparent: true, opacity: 0.9 }),
    0, 0.3, 0, fire,
  );
  embers.castShadow = false;
  const fireLight = new THREE.PointLight(0xff8a3a, 3, 9, 1.6);
  fireLight.position.set(0, 0.7, 0);
  fire.add(fireLight);
  collide(0.5, 1.5, 0.6);

  // Start on the creek side of the buyer's table, looking at the water.
  const sw = toWorld(-6.5, 1);
  const spawn = { x: sw.x, z: sw.z, yaw: flip > 0 ? Math.PI / 2 : -Math.PI / 2 };

  let t = 0;
  function update(dt, night = 0) {
    t += dt;
    const flick = 0.75 + Math.sin(t * 13) * 0.12 + Math.sin(t * 29 + 1) * 0.1 + Math.random() * 0.06;
    // Someone keeps the fire stoked after dark.
    fireLight.intensity = 3 * flick * (1 + night * 2.5);
    fireLight.distance = 9 + night * 10;
    embers.scale.set(1, 0.85 + flick * 0.3, 1);
  }

  // Blender models for the ute and tent, once they've loaded.
  function applyModels(m) {
    if (m.ute) {
      for (const c of ute.children) c.visible = false;
      const u = m.ute.clone(true);
      // One-sided panels (so from the driver's seat you see out, not the inside
      // of the roof) and see-through tinted glass.
      u.traverse((o) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        o.material = mats.map((mt) => {
          const c = mt.clone();
          c.side = THREE.FrontSide;
          if (c.name === 'ute_glass') { c.transparent = true; c.opacity = 0.22; c.depthWrite = false; }
          return c;
        });
        if (o.material.length === 1) o.material = o.material[0];
      });
      ute.add(u);
    }
    if (m.tent) {
      tent.visible = false;
      tentDoor.visible = false;
      const t = m.tent.clone(true);
      t.position.set(3.5, 0, 4);
      campGroup.add(t);
    }
  }

  const tentPos = toWorld(3.5, 4);
  // Where the collection cabinet stands, beside the buyer's table.
  const cabinetSpot = toWorld(-2.6, -2.9);
  collide(-2.6, -2.9, 0.8);
  return { colliders, shop, spawn, tentPos, cabinetSpot, ute, uteColliders, update, applyModels };
}

// ---------- geometry helpers ----------

function colorize(geo, hex) {
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

function prep(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  return g;
}

// Ghost-gum-ish: pale trunk, a couple of branches, clumped olive canopy.
function gumTree(rand) {
  const parts = [];
  const h = 5 + rand() * 4;
  const r = 0.2 + rand() * 0.12;
  const lean = (rand() - 0.5) * 0.25;
  const bark = new THREE.Color().setRGB(0.85 + rand() * 0.1, 0.82, 0.76, THREE.SRGBColorSpace);
  const trunk = new THREE.CylinderGeometry(r * 0.55, r, h, 7, 3);
  trunk.translate(0, h / 2, 0);
  trunk.rotateZ(lean);
  parts.push(colorize(prep(trunk), bark));

  const top = new THREE.Vector3(-Math.sin(lean) * h, Math.cos(lean) * h, 0);
  const branches = 2 + Math.floor(rand() * 2);
  const crowns = [top.clone()];
  for (let i = 0; i < branches; i++) {
    const len = 1.8 + rand() * 1.8;
    const a = rand() * Math.PI * 2;
    const b = new THREE.CylinderGeometry(r * 0.25, r * 0.45, len, 5);
    b.translate(0, len / 2, 0);
    b.rotateZ(0.6 + rand() * 0.4);
    b.rotateY(a);
    const by = h * (0.5 + rand() * 0.3);
    b.translate(-Math.sin(lean) * by, Math.cos(lean) * by, 0);
    parts.push(colorize(prep(b), bark));
    const tip = new THREE.Vector3(0, len, 0)
      .applyAxisAngle(new THREE.Vector3(0, 0, 1), 0.6 + rand() * 0.4)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), a)
      .add(new THREE.Vector3(-Math.sin(lean) * by, Math.cos(lean) * by, 0));
    crowns.push(tip);
  }
  for (const c of crowns) {
    const clumps = 3 + Math.floor(rand() * 3);
    for (let k = 0; k < clumps; k++) {
      const s = 0.9 + rand() * 1.0;
      const leaf = new THREE.IcosahedronGeometry(s, 0);
      leaf.scale(1, 0.55, 1);
      leaf.translate(c.x + (rand() - 0.5) * 2.2, c.y + (rand() - 0.3) * 1.0, c.z + (rand() - 0.5) * 2.2);
      const v = rand();
      const leafCol = new THREE.Color().setRGB(0.36 + v * 0.12, 0.42 + v * 0.1, 0.27 + v * 0.06, THREE.SRGBColorSpace);
      parts.push(colorize(prep(leaf), leafCol));
    }
  }
  const geo = mergeGeometries(parts);
  geo.computeVertexNormals();
  return geo;
}

// Displace a polyhedron without tearing it apart at shared vertices.
export function lumpy(geo, amount, rand) {
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  const g = mergeVertices(geo);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.multiplyScalar(1 + (rand() - 0.5) * amount * 2);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function spinifex(rand) {
  const parts = [];
  for (let i = 0; i < 11; i++) {
    const h = 0.5 + rand() * 0.5;
    const blade = new THREE.ConeGeometry(0.035, h, 3);
    blade.translate(0, h / 2, 0);
    blade.rotateZ(0.25 + rand() * 0.6);
    blade.rotateY((i / 11) * Math.PI * 2 + rand() * 0.4);
    parts.push(prep(blade));
  }
  const base = new THREE.SphereGeometry(0.22, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2);
  base.scale(1, 0.6, 1);
  parts.push(prep(base));
  const g = mergeGeometries(parts);
  g.computeVertexNormals();
  return g;
}

function signTexture(text, ink = '#7a2a12', paper = '#e9dcc0', size = 58, sub = '') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = sub ? 226 : 146;
  const ctx = c.getContext('2d');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = ink === '#c01a10' ? ink : '#5a3a20';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
  ctx.fillStyle = ink;
  ctx.font = `bold ${size}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, sub ? 80 : c.height / 2 + 4);
  if (sub) {
    ctx.font = '26px Georgia, serif';
    ctx.fillText(sub, c.width / 2, 160);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export { smoothstep };
