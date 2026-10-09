import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Terrain, PLAY } from './terrain.js';
import { buildWorld } from './world.js';
import { Targets } from './targets.js';
import { Deposits } from './deposits.js';
import { Water } from './water.js';
import { SurfaceFinds } from './finds.js';
import { processLoad, summarise, GEMS, makeGemMesh } from './minerals.js';
import { grade as gradeFind, makeNugget } from './specimens.js';
import { Inventory } from './inventory.js';
import { DayNight } from './daynight.js';
import { ClaimMap } from './map.js';
import { IS_TOUCH, TouchControls } from './touch.js';
import { Wildlife } from './wildlife.js';
import { lumpy } from './world.js';
import { mulberry32 } from './noise.js';
import { Sound } from './audio.js';
import { Viewmodel } from './tools.js';
import { Hud } from './hud.js';
import { Shop, gear, GOLD_PRICE } from './shop.js';
import { Notes } from './notes.js';
import { Weather } from './weather.js';
import { Sluice } from './sluice.js';
import { loadAssets, assets } from './assets.js';
import { CrystalField, makeCrystalMesh, crystalToGem, opalLight } from './crystals.js';
import { Excavation, KNEEL_TOOLS, materialName } from './excavation.js';
import { smoothstep } from './noise.js';
import { SAVE_KEY, readSave, storeSave, packArray, unpackArray } from './save.js';

// ---------- save ----------

let lastSaved = 0; // performance.now() of the last successful save
let resetting = false; // pegging a new claim: don't write the old ground over it

// The whole game: money and finds, plus the state of the ground, your gear and where you are.
function writeSave() {
  if (resetting) return true;
  const digs = terrain.digSnapshot();
  const data = {
    version: 3,
    savedAt: Date.now(),
    seed: state.seed, cash: state.cash, gold: state.gold, up: state.up, gems: state.gems, nuggets: state.nuggets, log: state.log,
    collected: targets.list.filter((t) => t.collected && t.id < 100000).map((t) => t.id),
    surface: finds.collectedIds(),
    crystals: field.collectedIds(),
    flood: finds.floodItems(),
    floodTargets: targets.floodSaved(),
    revealed: targets.revealedIds(),
    digs: { idx: packArray(digs.idx), mm: packArray(digs.mm) },
    patches: excav.patches.map((pt) => { const sn = pt.snapshot(); return { cx: sn.cx, cz: sn.cz, mm: packArray(sn.mm) }; }),
    crystalState: field.stateSnapshot(),
    sluice: sluice.snapshot(),
    bucket: state.bucket,
    player: { x: player.pos.x, z: player.pos.z, yaw: player.yaw, pitch: player.pitch, tool: state.tool },
    hour: daynight.hour,
    headlamp,
    findPoints: state.findPoints,
    panTests: state.panTests,
    leadTraced: state.leadTraced,
    discovered: state.discovered,
    nextStorm: weather.phase === 'calm' ? weather.next : 90,
  };
  const ok = storeSave(data);
  if (ok) lastSaved = performance.now();
  return ok;
}

// Put the world back the way it was saved.
function restoreWorld() {
  try {
    if (saved.digs) terrain.applyDigs(unpackArray(saved.digs.idx, Uint32Array), unpackArray(saved.digs.mm, Int16Array));
    field.restoreState(saved.crystalState);
    if (saved.patches) excav.restorePatches(saved.patches.map((pt) => ({ cx: pt.cx, cz: pt.cz, mm: unpackArray(pt.mm, Int16Array) })));
    targets.restoreRevealed(saved.revealed);
    sluice.restore(saved.sluice);
    if (Array.isArray(saved.bucket)) state.bucket = saved.bucket;
    if (saved.player) {
      player.pos.x = saved.player.x;
      player.pos.z = saved.player.z;
      player.pos.y = terrain.getHeight(player.pos.x, player.pos.z);
      player.yaw = saved.player.yaw;
      player.pitch = saved.player.pitch;
      if (saved.player.tool && !['sluice', 'uv'].includes(saved.player.tool)) state.tool = saved.player.tool;
    }
    if (typeof saved.nextStorm === 'number') weather.next = Math.max(60, saved.nextStorm);
  } catch (e) {
    console.warn('Could not restore everything from the save:', e);
  }
}

const saved = readSave() || { seed: Math.floor(Math.random() * 1e9), cash: 0, gold: 0 };
const state = {
  seed: saved.seed,
  cash: saved.cash || 0,
  gold: saved.gold || 0,
  up: saved.up || {},
  gems: saved.gems || [],
  nuggets: saved.nuggets || [],
  findPoints: saved.findPoints || [],
  panTests: saved.panTests || [],
  leadTraced: !!saved.leadTraced,
  discovered: saved.discovered || {},
  log: saved.log || {},
  bucket: [],
  tool: 'detector',
  remaining: 0,
};

// ---------- renderer / scene ----------

const canvas = document.getElementById('game');
// Phones get a lighter setup: no MSAA, lower resolution, smaller shadow map.
if (IS_TOUCH) document.body.classList.add('touch');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !IS_TOUCH, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_TOUCH ? 1.25 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 2500);
camera.rotation.order = 'YXZ';

const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 38), THREE.MathUtils.degToRad(215));

function makeSky(scale) {
  const sky = new Sky();
  sky.scale.setScalar(scale);
  const u = sky.material.uniforms;
  u.turbidity.value = 5;
  u.rayleigh.value = 1.1;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.8;
  u.sunPosition.value.copy(sunDir);
  if (u.cloudCoverage) u.cloudCoverage.value = 0.25;
  return sky;
}
const sky = makeSky(2000);
scene.add(sky);

const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.add(makeSky(50));
const env = pmrem.fromScene(envScene, 0.02).texture;
scene.environment = env;
scene.environmentIntensity = 0.6;
scene.fog = new THREE.Fog(0xcdbfa8, 90, 650);

const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x8a5a3a, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0dc, 3.4);
sun.castShadow = true;
sun.shadow.mapSize.set(IS_TOUCH ? 1024 : 2048, IS_TOUCH ? 1024 : 2048);
const sc = sun.shadow.camera;
sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 200;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

// Headlamp (L) and UV torch beam, both carried on your head.
scene.add(camera);
const headlampLight = new THREE.SpotLight(0xfff4e0, 0, 34, 0.5, 0.55, 1.4);
const uvLight = new THREE.SpotLight(0x7a3cff, 0, 10, 0.42, 0.4, 1.2);
for (const l of [headlampLight, uvLight]) {
  l.position.set(0, 0.05, 0);
  l.target.position.set(0, -0.05, -1);
  camera.add(l, l.target);
}
let headlamp = !!saved.headlamp;

// ---------- world ----------

const terrain = new Terrain(state.seed);
scene.add(terrain.mesh);
scene.add(terrain.buildFar());
const creek = terrain.creek;
const deposits = new Deposits(terrain);
const field = new CrystalField(scene, terrain, state.seed, new Set(saved.crystals || []));
const world = buildWorld(scene, terrain, state.seed, field.sites);
const excav = new Excavation(scene, terrain, field);
const water = new Water(scene, terrain, sunDir);
const sluice = new Sluice(scene, terrain);
const targets = new Targets(scene, terrain, deposits, state.seed, new Set(saved.collected || []));
const finds = new SurfaceFinds(scene, terrain, deposits, state.seed, new Set(saved.surface || []), world.colliders);
// Quartz float lying downslope of the crystal pockets.
finds.addItems(field.floatItems().map((f) => {
  const c = { ...f.crystal, x: 0, y: 0, z: 0, ax: 1, ay: 0.2, az: 0.3 };
  const l = Math.hypot(c.ax, c.ay, c.az);
  c.ax /= l; c.ay /= l; c.az /= l;
  return { id: f.id, x: f.x, z: f.z, gem: crystalToGem(c), rot: 0, lift: 0.006, makeMesh: () => makeCrystalMesh(c) };
}), new Set(saved.surface || []));
// Opal chips lying on the mullock heaps.
finds.addItems(field.opalSurfaceItems().map((f) => {
  const c = { ...f.crystal, x: 0, y: 0, z: 0, ax: 0.3, ay: 0.4, az: 0.9 };
  const l = Math.hypot(c.ax, c.ay, c.az);
  c.ax /= l; c.ay /= l; c.az /= l;
  return { id: f.id, x: f.x, z: f.z, gem: crystalToGem(c), rot: 0, lift: 0.004, makeMesh: () => makeCrystalMesh(c) };
}), new Set(saved.surface || []));
// Whatever the last flood left behind.
finds.addItems(saved.flood || []);
finds.floodId = Math.max(finds.floodId, ...(saved.flood || []).map((i) => i.id + 100));
targets.restoreFlood(saved.floodTargets || []);
state.remaining = targets.remainingGold();

const sound = new Sound();
const wildlife = new Wildlife(scene, terrain, sound);
// Blender-made models stream in; crystals and hand tools use them once they arrive.
loadAssets().then(() => {
  view.applyModels(assets.tools);
  view.applyGear(assets.models);
  sluice.applyModel(assets.models.sluice);
  world.applyModels(assets.models);
  wildlife.applyModel(assets.models.kangaroo);
});
const hud = new Hud();
const view = new Viewmodel(env);
view.setAspect(camera.aspect);
view.setTool(state.tool);
hud.tool(state.tool);

// Little ring that shows where the shovel will bite.
const marker = new THREE.Mesh(
  new THREE.RingGeometry(0.5, 0.6, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.5, depthWrite: false }),
);
marker.visible = false;
scene.add(marker);

// ---------- player ----------

const EYE = 1.65;
const RADIUS = 0.35;
const player = {
  pos: new THREE.Vector3(world.spawn.x, 0, world.spawn.z),
  vel: new THREE.Vector3(),
  yaw: world.spawn.yaw,
  pitch: -0.12,
  grounded: true,
  stridePhase: 0,
  lastStep: 0,
  landDip: 0,
  lookDX: 0,
  lookDY: 0,
};
player.pos.y = terrain.getHeight(player.pos.x, player.pos.z);

const keys = new Set();
let mouseHeld = false;
let playing = false;
let digCooldown = 0;
let panProgress = 0;
let sieveProgress = 0;
let feedProgress = 0;
let lastFullWarn = -10;
let lastHint = {};
let lastDig = { x: 1e9, z: 1e9, layer: null };
const scraped = new Map();
let elapsed = 0;
let signal = { signal: 0, kind: null };

const map = new ClaimMap(state, terrain, { onClose: () => lock() });
const modalOpen = () => shop.isOpen || notes.isOpen || inventory.isOpen || map.isOpen;

function toggleHeadlamp() {
  headlamp = !headlamp;
  sound.click();
  hud.toast(headlamp ? 'Headlamp on.' : 'Headlamp off.');
}

const shop = new Shop(state, {
  sound,
  onChange: () => { writeSave(); hud.stats(state, gear(state, 'bucket').cap); },
  onClose: () => lock(),
  onReset: () => {
    resetting = true;
    state.seed = Math.floor(Math.random() * 1e9);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        seed: state.seed, cash: state.cash, gold: state.gold, up: state.up, gems: state.gems, log: state.log,
      }));
    } catch { /* ignore */ }
    location.reload();
  },
});
const notes = new Notes(state, { onClose: () => lock() });
const inventory = new Inventory(state, {
  sound,
  onClose: () => lock(),
  makeMesh: inventoryMesh,
  canSell: () => nearShop(),
  onChange: () => writeSave(),
  onSell: (it) => {
    const list = it.type === 'nugget' ? state.nuggets : state.gems;
    const i = list.indexOf(it);
    if (i >= 0) list.splice(i, 1);
    state.cash += it.value;
    sound.coin();
    hud.toast(`Sold: ${it.label} for $${Math.round(it.value).toLocaleString()}.`);
    writeSave();
  },
});

let sluiceWashed = false;
const weather = new Weather({
  renderer, scene, sky, sun, hemi, creek, water, sound,
  onEvent: (phase, w) => {
    if (phase === 'building') {
      hud.toast("Storm's brewing upstream. The creek'll come up soon.");
      if (sluice.placed) hud.toast('Get your sluice out of the water!', 'junk');
    }
    if (phase === 'rising') hud.toast("Crikey, the creek's coming up! Get out of the water.", 'junk');
    if (phase === 'peak') floodReworks(w.peak);
    if (phase === 'calm') {
      hud.toast("Flood's gone down. Fresh gravel on the bars: best time to go looking for agates.", 'gold');
      if (sluiceWashed) hud.toast('Your sluice washed up on a bar downstream. Go and get it (E).');
    }
  },
});

const daynight = new DayNight({ scene, sky, sunDir, hour: typeof saved.hour === 'number' ? saved.hour : 9 });
weather.base = daynight.base;

// While the water is high and brown, the flood quietly reworks the bed.
function floodReworks(peak) {
  const rand = Math.random;
  sluiceWashed = sluice.washAway(rand);
  terrain.refillAfterFlood(peak);
  targets.addFlood(deposits, rand);
  finds.addFlood(deposits, rand);
  state.remaining = targets.remainingGold();
  scraped.clear();
}

// ---------- input ----------

const overlay = document.getElementById('overlay');
const playBtn = document.getElementById('play');

// ?test skips pointer lock so the game can be driven from automation/devtools.
const TEST = new URLSearchParams(location.search).has('test');

function lock() {
  sound.init();
  if (TEST || IS_TOUCH) {
    playing = true;
    overlay.classList.add('hidden');
    hud.show(true);
    touch?.show(IS_TOUCH);
    if (IS_TOUCH) document.documentElement.requestFullscreen?.().catch(() => {});
    return;
  }
  const p = canvas.requestPointerLock?.();
  if (p && p.catch) p.catch(() => { /* too soon after ESC; user can click again */ });
}
playBtn.addEventListener('click', lock);
canvas.addEventListener('click', () => { if (!playing && !modalOpen()) lock(); });

document.addEventListener('pointerlockchange', () => {
  playing = document.pointerLockElement === canvas;
  overlay.classList.toggle('hidden', playing || modalOpen());
  hud.show(playing || modalOpen());
  if (!playing) {
    if (!modalOpen()) { writeSave(); updateSaveStatus(); }
    mouseHeld = false;
    keys.clear();
    playBtn.textContent = 'Paused. Click to resume';
  }
});

// H: the controls card. It stays up while you play so you can glance at it.
function toggleControls(force) {
  const el = document.getElementById('controls');
  const show = force ?? el.classList.contains('hidden');
  el.classList.toggle('hidden', !show);
  el.classList.toggle('kneeling', !!kneel);
}
document.getElementById('save-btn').addEventListener('click', (e) => { e.stopPropagation(); saveNow(); });
document.getElementById('controls-btn').addEventListener('click', (e) => { e.stopPropagation(); toggleControls(true); });
updateSaveStatus();

// P: free the mouse and show the pause screen. Click to carry on.
function pause() {
  writeSave();
  updateSaveStatus();
  mouseHeld = false;
  keys.clear();
  playBtn.textContent = 'Paused. Click to resume';
  if (TEST || IS_TOUCH) {
    playing = false;
    overlay.classList.remove('hidden');
    hud.show(false);
    touch?.show(false);
    writeSave();
    updateSaveStatus();
  } else {
    document.exitPointerLock();
  }
}

function openModal(m) {
  state.forecast = weather.forecast();
  if (m === map) m.open(player, { sluice, patches: excav.patches, sources: terrain.sources, camp: terrain.camp });
  else m.open();
  touch?.show(false);
  if (TEST || IS_TOUCH) playing = false;
  else document.exitPointerLock();
}

document.addEventListener('mousemove', (e) => {
  if (!playing) return;
  player.yaw -= e.movementX * 0.0022;
  player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * 0.0022, -1.5, 1.45);
  player.lookDX += e.movementX;
  player.lookDY += e.movementY;
});
let clicked = false;
document.addEventListener('mousedown', (e) => {
  if (!playing) return;
  if (e.button === 0) { mouseHeld = true; clicked = true; }
  if (e.button === 2) rightClick();
});
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('mouseup', (e) => { if (e.button === 0) mouseHeld = false; });

const TOOLS = ['detector', 'shovel', 'pan', 'sieve', 'sluice', 'hammer', 'uv'];
const ownsUv = () => (state.up.uv || 0) > 0;
const ownsSluice = () => (state.up.sluice || 0) > 0;
function selectTool(name) {
  if (state.tool === name) return;
  if (name === 'uv' && !ownsUv()) {
    hud.toast('You need a UV torch. The buyer at camp sells them.');
    sound.denied();
    return;
  }
  if (name === 'sluice' && !ownsSluice()) {
    hud.toast('You need a sluice box. The buyer at camp sells them.');
    sound.denied();
    return;
  }
  state.tool = name;
  panProgress = 0;
  sieveProgress = 0;
  resetJig();
  view.setTool(viewTool());
  hud.tool(name);
  sound.click();
}
document.addEventListener('wheel', (e) => {
  if (!playing) return;
  if (kneel) {
    const k = KNEEL_TOOLS.indexOf(kneel.tool);
    setKneelTool(KNEEL_TOOLS[(k + (e.deltaY > 0 ? 1 : KNEEL_TOOLS.length - 1)) % KNEEL_TOOLS.length]);
    return;
  }
  const list = TOOLS.filter((t) => (t !== 'sluice' || ownsSluice()) && (t !== 'uv' || ownsUv()));
  const i = list.indexOf(state.tool);
  selectTool(list[(i + (e.deltaY > 0 ? 1 : list.length - 1)) % list.length]);
});

function saveNow() {
  if (writeSave()) { hud.toast('Game saved.'); sound.click(); }
  else hud.toast("Couldn't save: browser storage is full or blocked.", 'junk');
  updateSaveStatus();
}

function updateSaveStatus() {
  const el = document.getElementById('save-status');
  if (!el) return;
  if (!lastSaved) { el.textContent = saved.savedAt ? `Last saved ${new Date(saved.savedAt).toLocaleString()}` : 'Not saved yet'; return; }
  const mins = Math.floor((performance.now() - lastSaved) / 60000);
  el.textContent = mins < 1 ? 'Saved just now' : `Saved ${mins} min ago`;
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'F5' || (e.code === 'KeyS' && (e.ctrlKey || e.metaKey))) {
    e.preventDefault(); // keep the browser from reloading or saving the page
    saveNow();
    return;
  }
  if (e.code === 'KeyH' && !e.repeat) { toggleControls(); return; }
  if (e.code === 'KeyN' && notes.isOpen) { notes.close(); return; }
  if (e.code === 'KeyI' && inventory.isOpen) { inventory.close(); return; }
  if (e.code === 'KeyM' && map.isOpen) { map.close(); return; }
  if (e.code === 'KeyP' && playing && !e.repeat) { pause(); return; }
  if (!playing) return;
  if (kneel) {
    const k = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
    if (k >= 0) setKneelTool(KNEEL_TOOLS[k]);
    if (e.code === 'KeyC' && !e.repeat) standUp();
    if (e.code === 'KeyE' && !e.repeat) { const c = excav.pickCrystal(camera.position, camDir); if (c) extract(c); }
    if (e.code === 'KeyN' && !e.repeat) openModal(notes);
    if (e.code === 'KeyI' && !e.repeat) openModal(inventory);
    if (e.code === 'KeyL' && !e.repeat) toggleHeadlamp();
    return;
  }
  if (e.code === 'KeyC' && !e.repeat) { kneelDown(); return; }
  keys.add(e.code);
  const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7'].indexOf(e.code);
  if (e.code === 'KeyL' && !e.repeat) toggleHeadlamp();
  if (e.code === 'KeyM' && !e.repeat) { openModal(map); return; }
  if (e.code === 'KeyF' && !e.repeat) rightClick();
  if (n >= 0) selectTool(TOOLS[n]);
  if (e.code === 'KeyE' && !e.repeat) interact();
  if (e.code === 'KeyN' && !e.repeat) openModal(notes);
  if (e.code === 'KeyI' && !e.repeat) openModal(inventory);
});
document.addEventListener('keyup', (e) => keys.delete(e.code));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  view.setAspect(camera.aspect);
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- actions ----------

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function nearShop() {
  return Math.hypot(player.pos.x - world.shop.x, player.pos.z - world.shop.z) < 3.2;
}

function hint(key, text, every = 90) {
  if (elapsed - (lastHint[key] ?? -1e9) < every) return;
  lastHint[key] = elapsed;
  hud.toast(text);
}

function logFind(gem) {
  const e = state.log[gem.type] || (state.log[gem.type] = { n: 0, best: null });
  e.n++;
  if (!e.best || gem.value > e.best.value) e.best = { label: gem.label, value: gem.value };
}

function logGold(grams, nugget) {
  state.log.goldTotal = (state.log.goldTotal || 0) + grams;
  if (nugget) state.log.nuggets = (state.log.nuggets || 0) + 1;
}

// Every find comes through here: it gets graded (specimen or not), filed in
// your gear, logged, and specimens get their moment.
function addFind(item, from, at = player.pos) {
  gradeFind(item, from);
  state.findPoints.push({ x: Math.round(at.x * 10) / 10, z: Math.round(at.z * 10) / 10, t: item.type, s: item.specimen ? 1 : 0 });
  if (state.findPoints.length > 600) state.findPoints.shift();
  (item.type === 'nugget' ? state.nuggets : state.gems).push(item);
  if (item.type !== 'nugget') logFind(item);
  if (item.specimen) {
    hud.toast(`Ripper! ${cap(item.label)}. That's going in the collection.`, 'gold');
    sound.gold();
  }
  return item;
}

// Inventory viewer meshes.
const nuggetMat = new THREE.MeshStandardMaterial({ color: 0xffc23a, metalness: 1, roughness: 0.28 });
const quartzMat = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.35, metalness: 0 });
function inventoryMesh(item) {
  if (item.type === 'fine') {
    // A little glass bottle with the fine gold settled in the bottom.
    const g = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 24, 1, true),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, roughness: 0.05, thickness: 0.002, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    g.add(glass);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.008, 16), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 }));
    cap.position.y = 0.028;
    g.add(cap);
    const fill = Math.min(0.045, 0.002 + Math.cbrt(item.grams) * 0.006);
    if (item.grams > 0.0005) {
      const gold = new THREE.Mesh(new THREE.CylinderGeometry(0.0112, 0.0112, fill, 24), nuggetMat);
      gold.position.y = -0.025 + fill / 2;
      g.add(gold);
    }
    return g;
  }
  if (item.type === 'nugget') {
    const r = mulberry32(item.seed || 1);
    const g = new THREE.Group();
    const s = 0.004 * Math.cbrt(item.grams) + 0.003;
    const n = new THREE.Mesh(lumpy(new THREE.IcosahedronGeometry(1, 2), 0.35, r), nuggetMat);
    n.scale.set(s * 1.3, s * 0.75, s);
    g.add(n);
    if (item.style === 'quartz') {
      // Gold threaded through white reef quartz.
      const q = new THREE.Mesh(lumpy(new THREE.DodecahedronGeometry(1, 1), 0.3, r), quartzMat);
      q.scale.set(s * 1.8, s * 1.1, s * 1.5);
      q.position.set(s * 0.9, -s * 0.2, 0);
      g.add(q);
    } else if (item.style === 'crystalline') {
      for (let k = 0; k < 7; k++) {
        const c = new THREE.Mesh(new THREE.OctahedronGeometry(s * 0.35), nuggetMat);
        c.position.set((r() - 0.5) * s * 2, s * 0.5 + r() * s * 0.3, (r() - 0.5) * s * 1.6);
        c.rotation.set(r() * 3, r() * 3, r() * 3);
        g.add(c);
      }
    }
    return g;
  }
  if (item.crystal || ['quartz', 'feldspar', 'calcite', 'fluorite'].includes(item.type) || (item.type === 'topaz' && item.lengthCm)) {
    const c = item.crystal || { variety: item.variety, len: (item.lengthCm || 3) / 100, broken: false, damage: 0, id: 1, grade: item.grade };
    return makeCrystalMesh({ ...c, x: 0, y: 0, z: 0, ax: 0, ay: 1, az: 0 });
  }
  return makeGemMesh(item);
}

function nearestPickup() {
  const t = targets.nearest(player.pos, 2.4);
  const f = finds.nearest(player.pos, 2.4);
  if (!t) return f ? { find: f } : null;
  if (!f) return { target: t };
  const dt = Math.hypot(t.x - player.pos.x, t.z - player.pos.z);
  const df = Math.hypot(f.x - player.pos.x, f.z - player.pos.z);
  return dt <= df ? { target: t } : { find: f };
}

function interact() {
  const p = nearestPickup();
  if (p?.target) {
    const t = p.target;
    targets.collect(t);
    if (t.kind === 'gold') {
      const nug = makeNugget(t.grams, t.id + 1, GOLD_PRICE);
      if (t.quartz) {
        nug.style = 'quartz';
        nug.label = `gold-in-quartz, ${t.stone} g of stone with about ${t.grams.toFixed(1)} g of gold`;
      }
      const n = addFind(nug, t.quartz ? 'Detected in the rubble around the quartz reef' : 'Found with the detector and dug up', t);
      logGold(t.grams, true);
      state.remaining = targets.remainingGold();
      if (!n.specimen) hud.toast(t.grams >= 5 ? `Strewth! A ${t.grams.toFixed(2)} g nugget!` : `You beauty! ${t.grams.toFixed(2)} g nugget.`, 'gold');
      sound.gold();
    } else if (t.value) {
      state.cash += t.value;
      hud.toast(`${cap(t.name)}. A collector will give you $${t.value} for that.`, 'gold');
      sound.coin();
    } else {
      hud.toast(`Just ${t.name}. Bugger.`, 'junk');
      sound.junk();
    }
    writeSave();
    return;
  }
  if (p?.find) {
    finds.collect(p.find);
    addFind(p.find.gem, p.find.glowing ? 'Spotted glowing under the UV torch' : p.find.gem.type === 'agate' ? 'Spotted lying on the ground' : p.find.gem.type === 'scheelite' ? 'Picked up off the slope below the reef' : 'Spotted glinting on a gravel bar', p.find);
    if (p.find.gem.type === 'scheelite') hint('scheelite', "Scheelite. Dull by day, but it glows blue-white under UV, and it comes out of gold-bearing reefs.", 600);
    hud.toast(`Picked up: ${p.find.gem.label}`, 'gold');
    if (p.find.id >= 5000 && p.find.id < 6000) hint('float', 'Quartz float: shards shed from a crystal pocket. Follow them uphill and dig where they stop.', 300);
    if (p.find.gem.type === 'agate') hint('agate', 'Agates weather out of the pink rhyolite and wash onto the gravel bars downstream.', 300);
    sound.coin();
    writeSave();
    return;
  }
  if (sluice.placed && nearSluice() && sluice.cons) {
    const c = sluice.cleanUp();
    state.bucket.unshift(c);
    hud.toast(`Cleaned up the sluice: concentrates from ${c.loads} load${c.loads === 1 ? '' : 's'}. Pan them.`, 'gold');
    sound.coin();
    return;
  }
  if (sluice.stranded && Math.hypot(player.pos.x - sluice.stranded.x, player.pos.z - sluice.stranded.z) < 2.6) {
    sluice.recover();
    sluiceWashed = false;
    hud.toast("Got your sluice back. She'll be right. Set it again with tool 5.");
    return;
  }
  if (nearTent()) {
    if (daynight.isNight) {
      daynight.hour = 6;
      hud.toast('You crawl into the swag and kip till sunrise. Morning!');
      sound.click();
      writeSave();
    } else hud.toast("Bit early for a kip. The tent's for nights.");
    return;
  }
  if (nearShop()) openModal(shop);
}

function nearTent() {
  return Math.hypot(player.pos.x - world.tentPos.x, player.pos.z - world.tentPos.z) < 3.4;
}

function nearSluice() {
  return sluice.placed && Math.hypot(player.pos.x - sluice.spot.x, player.pos.z - sluice.spot.z) < 2.8;
}

// Which first-person model to show: with a sluice set, you're holding the shovel to feed it.
function viewTool() {
  if (kneel) return kneel.tool;
  if (state.tool === 'hammer') return 'pick';
  if (state.tool === 'uv') return 'uvtorch';
  if (state.tool === 'sluice') return sluice.placed ? 'shovel' : 'sluiceCarry';
  return state.tool;
}

function rightClick() {
  if (state.tool === 'sieve') flipSieve();
  else if (state.tool === 'sluice' && nearSluice()) {
    const c = sluice.pickUp();
    if (c) state.bucket.unshift(c);
    hud.toast(c ? 'Lifted the sluice out and cleaned it up. Concentrates are in your bucket.' : 'Lifted the sluice out.');
  }
}

// ---------- gem sieve: jig and flip ----------

const jig = { I: 0, strat: 0, lost: 0 };
function resetJig() { jig.I = 0; jig.strat = 0; jig.lost = 0; }
function jigZone() {
  const half = gear(state, 'sieve').nested ? 0.13 : 0.1;
  const c = 0.56 + 0.14 * Math.sin(elapsed * 0.55) + 0.05 * Math.sin(elapsed * 1.7);
  return [c - half, c + half];
}
function flipSieve() {
  if (!state.bucket.length || jig.strat < 0.05) {
    hud.toast('Jig it under water first, then flip.');
    return;
  }
  sound.flip();
  const strat = jig.strat;
  if (strat < 0.5) hint('flipearly', 'Flipped before it settled: the heavy stones are scattered through the pile.', 120);
  if (jig.lost > 1.5) hint('overjig', 'Jigging too hard scrambles the layers and washes the small stones through.', 120);
  finishLoad('sieve', { strat, lost: jig.lost });
  resetJig();
}

function feedSluice() {
  const sample = state.bucket.shift();
  const r = sluice.feed(sample, gearInfo().classifier);
  sound.dig();
  view.playDig();
  view.dirtOnBlade = true;
  for (const a of r.agates) {
    addFind(a, 'Picked out of the sluice oversize');
    hud.toast(`Picked out of the oversize: ${a.label}`, 'gold');
  }
  if (sluice.fill >= 1) hint('packed', "The riffles are chockers. Clean up the sluice (E) before you lose gold.", 20);
  if (r.eff < 0.4) hint('sluiceflow', `This spot isn't working well: ${sluice.status().why}. Try another run.`, 60);
}

function dig(hit) {
  if (terrain.overlayAt(hit.x, hit.z)) {
    hint('handdig', "That's a hand dig. Kneel (C) and work it with hand tools.", 8);
    return;
  }
  const amount = gear(state, 'shovel').dig;
  const before = terrain.getHeight(hit.x, hit.z);
  if (!terrain.dig(hit.x, hit.z, 0.65, amount)) {
    hud.toast('Solid bedrock. Nothing more to dig here.', 'junk');
    sound.clink();
    return;
  }
  const after = terrain.getHeight(hit.x, hit.z);
  let e = (before + after) / 2;
  if (before - after < 0.005) {
    // The middle of the hole is already on bedrock. You get a couple of
    // scrapes of the cracks; after that the shovel is just taking the walls.
    const key = terrain.index(hit.x, hit.z);
    const n = scraped.get(key) || 0;
    scraped.set(key, n + 1);
    if (n < 2) e = after + 0.01;
    else {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += terrain.getHeight(hit.x + Math.cos(k * 1.57) * 0.45, hit.z + Math.sin(k * 1.57) * 0.45);
      e = sum / 4 + amount * 0.3;
      if (n === 2) hud.toast('Bedrock scraped clean here. Work along the bottom of the hole.');
    }
  }
  const sample = deposits.sample(hit.x, hit.z, e);
  sample.x = Math.round(hit.x * 10) / 10;
  sample.z = Math.round(hit.z * 10) / 10;
  const pocket = field.pocketAt(hit.x, hit.z, e);
  if (pocket) {
    if (!pocket.warned) {
      pocket.warned = true;
      hud.toast('Red-brown pocket clay full of crystal shards: a pocket! Stop shovelling. Kneel (C) and dig it by hand.', 'gold');
    } else {
      const broke = field.shovelDamage(pocket, Math.random() < 0.5 ? 1 : 2);
      if (broke.length) { hud.toast(`Crunch. The shovel went through ${broke.length === 1 ? 'a crystal' : 'two crystals'}.`, 'junk'); sound.crack(); }
    }
  }
  sound.dig();
  if (sample.layer === 'bedrock') sound.clink();
  view.playDig();

  // Tell the player when they move through a layer boundary.
  const sameHole = Math.hypot(hit.x - lastDig.x, hit.z - lastDig.z) < 1.2;
  if (sameHole && sample.layer !== lastDig.layer) {
    if (sample.layer === 'wash') hud.toast('Through the topsoil into the wash: grey gravel.');
    if (sample.layer === 'bedrock') hud.toast('Bedrock! The heavies sit right on top of it. Scrape it clean.', 'gold');
  }
  lastDig = { x: hit.x, z: hit.z, layer: sample.layer };

  const capacity = gear(state, 'bucket').cap;
  if (state.bucket.length < capacity) {
    state.bucket.push(sample);
    view.dirtOnBlade = true;
  } else {
    view.dirtOnBlade = false;
    if (elapsed - lastFullWarn > 6) {
      hud.toast("Bucket's chockers. Take it down to the creek to pan or sieve.");
      lastFullWarn = elapsed;
    }
  }
  for (const t of targets.checkDig(hit.x, hit.z, 0.8)) {
    if (t.kind === 'gold') hud.toast('Something glinting in the dirt!', 'gold');
    else hud.toast('Something in the dirt…');
    sound.click();
  }
}

function gearInfo() {
  return {
    classifier: (state.up.classifier || 0) > 0,
    panMult: gear(state, 'pan').mult,
    nested: gear(state, 'sieve').nested,
  };
}

function finishLoad(method, opts = {}) {
  const sample = state.bucket.shift();
  const res = processLoad(sample, method, gearInfo(), Math.random, opts);
  const gold = Math.round(res.gold * 1000) / 1000;
  if (gold > 0.0005) {
    state.gold += gold;
    logGold(gold, false);
  }
  if (res.picker) {
    const pk = makeNugget(Math.round(res.picker * 100) / 100, Math.floor(Math.random() * 1e6), GOLD_PRICE);
    pk.label = `picker, ${pk.grams.toFixed(2)} g`;
    addFind(pk, method === 'pan' ? 'Picked out of the pan' : 'Picked off the sieve');
    logGold(pk.grams, false);
  }
  const from = method === 'pan' ? (sample.cons ? 'Panned from sluice concentrates' : 'Panned from creek wash') : 'Wet-sieved from creek wash';
  for (const f of res.finds) addFind(f, from);

  const parts = [];
  // Prospectors count "colours": the specks of gold left in the pan.
  let colours = 0;
  if (method === 'pan' && !sample.cons) {
    colours = Math.max(0, Math.round((res.gold * 1000) / 2.5 + (Math.random() - 0.5)));
    if (sample.x !== undefined) {
      state.panTests.push({ x: sample.x, z: sample.z, c: colours });
      if (state.panTests.length > 300) state.panTests.shift();
      checkLead();
    }
  }
  if (res.picker) parts.push(`bonza, a ${res.picker.toFixed(2)} g picker`);
  else if (colours) parts.push(`${colours} colour${colours === 1 ? '' : 's'} (${gold.toFixed(3)} g)`);
  else if (gold >= 0.001) parts.push(`${gold.toFixed(3)} g fine gold`);
  const stones = summarise(res.finds);
  if (stones) parts.push(stones);
  const notable = res.finds.filter((f) => f.type === 'sapphire' || f.type === 'topaz' || (f.type === 'agate' && f.grade === 'A'));

  if (method === 'pan') view.showPanResult(gold > 0.002);
  else view.showSieveResult(res.finds, opts.strat ?? 1);

  if (!parts.length) hud.toast(method === 'pan' ? 'Not a colour. Nothing but black sand. Bugger.' : 'Just gravel in the sieve.', 'junk');
  if (method === 'pan' && colours) hint('colours', 'Count the colours as you pan your way up the creek. Where they stop, the gold\'s source is close. Your tests go on the map (M).', 600);
  else hud.toast(cap(parts.join(', ')) + '.', 'gold');
  for (const f of notable) hud.toast(cap(f.label) + '!', 'gold');
  if (res.picker || notable.length) sound.gold(); else if (parts.length) sound.coin();

  // Teach the indicators.
  if (method === 'pan' && res.blackSand > 1.6) hint('blacksand', 'A heavy streak of black sand: heavies are concentrating here.');
  if (method === 'pan' && sample.sapphire + sample.agate > 0.25 && !gearInfo().classifier) {
    hint('classifier', 'Lots of big stones in this wash. A classifier would let you check the oversize for gems and agates.', 240);
  }
  if (method === 'sieve' && res.finds.some((f) => f.type === 'spinel' || f.type === 'zircon') && !res.finds.some((f) => f.type === 'sapphire')) {
    hint('indicator', 'Black spinel and zircon: sapphire indicators. You are in gem wash.');
  }
  if (method === 'sieve' && sample.gold > 0.02) hint('sievegold', 'Fine gold washes through sieve screens. Pan this wash for the gold.', 180);
  if (sample.layer === 'topsoil') hint('topsoil', 'That was mostly topsoil. Dig deeper: the heavies sit low in the wash.', 120);
  writeSave();
}

// ---------- kneeling and hand excavation ----------

let kneel = null;
let workTick = 0;

function kneelDown() {
  if (!player.grounded || motion.depth > 0.1) { hud.toast("You can't kneel here."); return; }
  const r = excav.kneel(player.pos.x, player.pos.z, player.yaw);
  if (!r) { hud.toast('Too close to another dig. Kneel right in front of it, or move further away.'); return; }
  player.pos.x = r.x;
  player.pos.z = r.z;
  // Kneel on the ground at the near edge of the dig.
  player.pos.y = Math.max(terrain.getHeight(r.x, r.z), r.patch.heightAt(r.x, r.z));
  player.vel.set(0, 0, 0);
  kneel = { tool: 'trowel', yaw0: player.yaw };
  player.pitch = -0.95;
  mouseHeld = false;
  view.setTool('trowel');
  hud.kneeling(true);
  touch?.setKneeling(true);
  document.getElementById('controls').classList.add('kneeling');
  hud.tool('trowel');
  hint('kneel', 'Kneeling. Trowel the soil off, brush around crystals, rock pick for rock, hands to lift crystals out. C to stand.', 600);
}

function standUp() {
  kneel = null;
  excav.stand();
  hud.kneeling(false);
  touch?.setKneeling(false);
  document.getElementById('controls').classList.remove('kneeling');
  hud.tool(state.tool);
  view.setTool(viewTool());
}

function setKneelTool(t) {
  if (!kneel || kneel.tool === t) return;
  kneel.tool = t;
  view.setTool(t);
  hud.tool(t);
  sound.click();
}

function extract(e) {
  const pct = Math.round(e.exposure * 100);
  if (e.exposure >= 0.6) {
    excav.collect(e);
    const gem = crystalToGem(e.c);
    const site = field.sites[e.c.site];
    addFind(gem, site && site.kind === 'vug' ? 'Lifted out of a vug in a quartz vein' : site && site.kind === 'heap' ? 'Noodled out of an old mullock heap' : 'Dug out of a crystal pocket', e.c);
    hud.toast(`Lifted out: ${gem.label}`, 'gold');
    if (gem.grade === 'A' && !e.c.broken) sound.gold(); else sound.coin();
    writeSave();
  } else if (Math.random() < 0.45) {
    e.c.damage = 1;
    excav.active.breakCrystal(e);
    hud.toast(`Bugger! The ${e.c.variety} snapped. It was still locked in (${pct}% clear).`, 'junk');
    sound.crack();
  } else {
    hud.toast(`Won't budge. Only ${pct}% clear: dig a bit more around it.`);
  }
}

function updateKneel(dt) {
  // Look around within reach of the dig, but don't move.
  let dy = player.yaw - kneel.yaw0;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  player.yaw = kneel.yaw0 + THREE.MathUtils.clamp(dy, -0.9, 0.9);
  player.pitch = THREE.MathUtils.clamp(player.pitch, -1.45, -0.1);
  fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  camera.position.set(player.pos.x, player.pos.y + 0.85, player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, 0);
  return { moving: false, running: false, depth: 0 };
}

function updateKneelTools(dt) {
  camera.getWorldDirection(camDir);
  const patch = excav.active;
  const tool = kneel.tool;
  const p = patch.raycast(camera.position, camDir, 2);
  excav.showCursor(p, tool);
  patch.updateExposure();
  const e = excav.pickCrystal(camera.position, camDir);
  let prompt = '';
  let working = false;
  marker.visible = false;
  hud.jig(false);
  hud.progress(0);

  if (tool === 'hands') {
    if (clicked && e) extract(e);
  } else if (mouseHeld && p) {
    const r = patch.work(tool, p, dt);
    working = true;
    workTick -= dt;
    if (r && workTick <= 0) {
      workTick = tool === 'pick' ? 0.11 : 0.14;
      const hard = r.mat === 'rock' || r.mat === 'vein';
      if (tool === 'brush') sound.brushTick();
      else sound.scrapeTick(hard);
    }
    if (r?.mat && (r.mat === 'rock' || r.mat === 'vein') && tool !== 'pick') {
      hint('toohard', `Too hard for the ${tool}. Use the rock pick (3) on rock.`, 15);
    }
    if (r?.hurt) {
      if (r.hurt.c.broken) {
        hud.toast(`Bugger! You broke a ${r.hurt.c.variety}.`, 'junk');
        sound.crack();
      } else {
        hint('careful', `Steady on! The ${tool === 'pick' ? 'pick' : 'trowel'}'s scraping a crystal. Grab the brush (1).`, 6);
      }
    }
    if (r?.opened) {
      hud.toast("You've broken into the vug!", 'gold');
      sound.crack();
    }
  }
  clicked = false;

  if (e) {
    const pct = Math.round(e.exposure * 100);
    const state2 = e.c.broken ? ' (broken)' : e.c.damage >= 0.35 ? ' (chipped)' : '';
    prompt = `${e.c.variety}${state2}: ${pct}% clear · `
      + (e.exposure >= 0.6 ? 'lift it out: hands (4) or E' : 'keep clearing around it, brush is safest');
  } else if (p) {
    const m = patch.materialAt(p);
    prompt = `${materialName(m === 'air' ? 'mud' : m)} · ${tool === 'hands' ? 'aim at a crystal' : 'hold click to dig'} · C to stand`;
  }
  hud.prompt(prompt);

  view.update(dt, {
    moving: false, running: false, stridePhase: player.stridePhase, landDip: 0,
    lookDX: player.lookDX, lookDY: player.lookDY, signal: 0, signalKind: null,
    panning: false, panProgress: 0, sieving: false, sieveProgress: 0, jig: 0, working,
  });
  player.lookDX *= Math.max(0, 1 - dt * 10);
  player.lookDY *= Math.max(0, 1 - dt * 10);
  sound.setDetector(false, 0, null);
  sound.setSluice(0);
  sound.setAmbience(dt, 0, false);
}

// ---------- update ----------

const fwd = new THREE.Vector3();
const right = new THREE.Vector3();
const wish = new THREE.Vector3();
const camDir = new THREE.Vector3();
const coil = new THREE.Vector3();
const flow = { x: 0, z: 0, speed: 0 };

function updatePlayer(dt) {
  fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  wish.set(0, 0, 0);
  if (keys.has('KeyW') || keys.has('ArrowUp')) wish.add(fwd);
  if (keys.has('KeyS') || keys.has('ArrowDown')) wish.sub(fwd);
  if (keys.has('KeyD') || keys.has('ArrowRight')) wish.add(right);
  if (keys.has('KeyA') || keys.has('ArrowLeft')) wish.sub(right);
  if (touch) { wish.addScaledVector(fwd, touch.move.y); wish.addScaledVector(right, touch.move.x); }
  const moving = wish.lengthSq() > 0;
  const running = moving && (keys.has('ShiftLeft') || keys.has('ShiftRight') || touch?.run);
  const depth = terrain.waterDepth(player.pos.x, player.pos.z);
  let speed = running ? 6.2 : 3.4;
  if (depth > 0.1) speed *= 0.55;
  if ((state.tool === 'pan' || state.tool === 'sieve') && mouseHeld) speed *= 0.3;
  // A half-pushed stick walks slower; keys are always full speed.
  if (moving) wish.multiplyScalar(speed / Math.max(1, wish.length()));

  const accel = player.grounded ? 12 : 3;
  const k = Math.min(1, dt * accel);
  player.vel.x += (wish.x - player.vel.x) * k;
  player.vel.z += (wish.z - player.vel.z) * k;

  player.pos.x += player.vel.x * dt;
  player.pos.z += player.vel.z * dt;

  // The current leans on your legs.
  if (depth > 0.5) {
    creek.velocity(player.pos.x, player.pos.z, flow);
    const push = smoothstep(1.3, 2.2, flow.speed) * smoothstep(0.5, 0.9, depth) * 0.7;
    if (push > 0) {
      player.pos.x += flow.x * push * dt;
      player.pos.z += flow.z * push * dt;
      hint('current', 'The current is dragging you. Get to the bank!', 20);
    }
  }

  for (const c of world.colliders) {
    const dx = player.pos.x - c.x, dz = player.pos.z - c.z;
    const min = c.r + RADIUS;
    const d2 = dx * dx + dz * dz;
    if (d2 < min * min && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      player.pos.x = c.x + (dx / d) * min;
      player.pos.z = c.z + (dz / d) * min;
    }
  }
  const lim = PLAY - 1;
  if (Math.abs(player.pos.x) > lim || Math.abs(player.pos.z) > lim) hint('boundary', 'Claim boundary. Your pegs mark the edge of your ground.', 30);
  player.pos.x = THREE.MathUtils.clamp(player.pos.x, -lim, lim);
  player.pos.z = THREE.MathUtils.clamp(player.pos.z, -lim, lim);

  if (player.grounded && (keys.has('Space') || touch?.jump)) {
    player.vel.y = 5.6;
    player.grounded = false;
  }
  player.vel.y -= 20 * dt;
  player.pos.y += player.vel.y * dt;
  const g = terrain.getHeight(player.pos.x, player.pos.z);
  if (player.pos.y <= g) {
    if (!player.grounded && player.vel.y < -5) player.landDip = -0.05;
    player.pos.y = g;
    player.vel.y = 0;
    player.grounded = true;
  } else if (player.grounded && player.vel.y <= 0 && player.pos.y - g < 0.35) {
    player.pos.y = g; // stick to the ground walking downhill
    player.vel.y = 0;
  } else {
    player.grounded = false;
  }
  player.landDip *= Math.max(0, 1 - dt * 8);

  const hspeed = Math.hypot(player.vel.x, player.vel.z);
  if (player.grounded && hspeed > 0.5) {
    player.stridePhase += dt * hspeed * 1.9;
    const step = Math.floor(player.stridePhase / Math.PI);
    if (step !== player.lastStep) {
      player.lastStep = step;
      sound.step(depth > 0.1);
    }
  }
  const bob = player.grounded ? Math.abs(Math.sin(player.stridePhase)) * 0.05 * Math.min(1, hspeed / 4) : 0;

  camera.position.set(player.pos.x, player.pos.y + EYE - bob + player.landDip, player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, 0);

  return { moving: hspeed > 0.5 && player.grounded, running, depth };
}

// Shared logic for the two creek tools (pan and sieve).
function washTool(dt, motion, progress, time, onDone) {
  const inWater = motion.depth > 0.15;
  const verb = state.tool === 'pan' ? 'pan' : 'sieve';
  if (!inWater) {
    return { progress: 0, active: false, prompt: state.bucket.length ? `Wade into the creek to ${verb}` : 'Dig some wash with the shovel first' };
  }
  if (!state.bucket.length && progress === 0) return { progress: 0, active: false, prompt: 'Bucket empty. Dig some wash first' };
  if (mouseHeld) {
    progress += dt / time;
    if (progress >= 1) { progress = 0; onDone(); }
    return { progress, active: true, prompt: '' };
  }
  const n = state.bucket.length;
  const what = state.bucket[0]?.cons ? 'the sluice concentrates' : `${n} load${n === 1 ? '' : 's'}`;
  return { progress, active: false, prompt: `Hold click to ${verb === 'pan' ? 'pan' : 'jig the sieve'} (${what})` };
}

function updateTools(dt, motion) {
  digCooldown -= dt;
  let prompt = '';
  marker.visible = false;
  let panning = false, sieving = false;

  camera.getWorldDirection(camDir);

  if (state.tool === 'hammer') {
    const hit = terrain.raycast(camera.position, camDir, 3.2);
    prompt = hit ? 'Click to tap the rock and listen' : 'Aim at the ground';
    if (hit && clicked && digCooldown <= 0) {
      digCooldown = 0.35;
      view.playTap();
      const g = terrain.geologyAt(hit.x, hit.z);
      if (g.orig - g.bedrock > 0.08 || terrain.overlayAt(hit.x, hit.z)) {
        sound.thud();
        hint('tapdirt', "Thud. That's just dirt, mate. Tap bare rock to listen for hollows.", 30);
      } else {
        const hollow = field.hollowness(hit.x, hit.z);
        sound.tap(hollow);
        if (hollow > 0.45) hint(`hollow${Math.round(hit.x)}${Math.round(hit.z)}`, 'That rang hollow. There is a cavity under here. Kneel (C) and open it up.', 20);
      }
    }
  }

  if (state.tool === 'detector') {
    // The coil rides about a metre ahead, swinging with the viewmodel.
    const swing = Math.sin(view.sweep) * 0.35;
    coil.set(
      player.pos.x + fwd.x * 1.0 - right.x * swing,
      0,
      player.pos.z + fwd.z * 1.0 - right.z * swing,
    );
    coil.y = terrain.getHeight(coil.x, coil.z) + 0.04;
    signal = targets.detect(coil, gear(state, 'detector').range);
    hud.meter(signal.signal, signal.kind, (state.up.disc || 0) > 0);
  } else {
    signal = { signal: 0, kind: null };
  }
  sound.setDetector(playing && state.tool === 'detector', signal.signal, signal.kind);

  if (state.tool === 'shovel') {
    const hit = terrain.raycast(camera.position, camDir, 4.0);
    if (hit) {
      marker.visible = true;
      marker.position.set(hit.x, hit.y + 0.04, hit.z);
      if (mouseHeld && digCooldown <= 0) {
        digCooldown = 0.5;
        dig(hit);
      }
    }
  }

  if (state.tool === 'pan') {
    const cons = state.bucket[0]?.cons;
    const time = gear(state, 'pan').time * (cons ? 1.5 : gearInfo().classifier ? 0.65 : 1);
    const r = washTool(dt, motion, panProgress, time, () => finishLoad('pan'));
    panProgress = r.progress; panning = r.active; prompt = r.prompt;
  }
  let showJig = false;
  if (state.tool === 'sieve') {
    if (motion.depth <= 0.15) {
      prompt = state.bucket.length ? 'Wade into the creek to sieve' : 'Dig some wash with the shovel first';
      resetJig();
    } else if (!state.bucket.length) {
      prompt = 'Bucket empty. Dig some wash first';
      resetJig();
    } else {
      showJig = true;
      // Holding drives the jig harder; let go and it eases off. Keep the needle in the green.
      jig.I = Math.min(1, Math.max(0, jig.I + (mouseHeld ? 1.25 + (Math.random() - 0.5) * 0.8 : -1.0) * dt));
      const [lo, hi] = jigZone();
      const time = gear(state, 'sieve').time;
      if (jig.I > hi) { jig.strat -= dt * 0.35 / time; jig.lost += dt; }
      else if (jig.I >= lo) jig.strat += dt / time;
      else jig.strat -= dt * 0.04;
      jig.strat = Math.min(1, Math.max(0, jig.strat));
      sieving = jig.I > 0.08;
      hud.jig(true, jig.I, lo, hi, jig.strat);
      const n = state.bucket.length;
      prompt = jig.strat >= 1 ? 'Settled! Right-click (or F) to flip it'
        : `Hold to jig: keep the needle in the green. Right-click to flip. (${n} load${n === 1 ? '' : 's'})`;
    }
    sieveProgress = jig.strat;
  }
  if (!showJig) hud.jig(false);

  let sluiceNoise = 0;
  sluice.showGhost(null);
  if (state.tool === 'sluice' && ownsSluice()) {
    if (sluice.placed) {
      const dist = Math.hypot(player.pos.x - sluice.spot.x, player.pos.z - sluice.spot.z);
      if (dist < 2.8) {
        const st = sluice.status();
        const n = state.bucket.length;
        prompt = `${st.speed.toFixed(2)} m/s, ${st.depth.toFixed(2)} m (${st.why}) · riffles ${Math.round(sluice.fill * 100)}% · `
          + (n ? `hold click to shovel in (${n})` : 'bucket empty') + (sluice.cons ? ' · E: clean up' : '') + ' · right-click: lift out';
        if (mouseHeld && n && !state.bucket[0].cons) {
          feedProgress += dt / 0.9;
          if (feedProgress >= 1) { feedProgress = 0; feedSluice(); }
        } else feedProgress = 0;
      } else prompt = `Your sluice is ${Math.round(dist)} m away`;
    } else if (sluice.stranded) {
      prompt = 'Your sluice washed downstream. Find it on a bar and press E.';
    } else {
      const hit = terrain.raycast(camera.position, camDir, 7);
      const spot = hit && sluice.evaluate(hit.x, hit.z);
      if (spot) {
        sluice.showGhost(spot);
        prompt = `${spot.speed.toFixed(2)} m/s, ${spot.depth.toFixed(2)} m deep: ${spot.why}. Click to set the sluice here.`;
        if (clicked) {
          sluice.place(spot);
          view.setTool(viewTool());
          hud.toast(spot.ok === 'good' ? 'Sluice set in a good run.' : `Sluice set, but it's ${spot.why}.`);
          sound.click();
        }
      } else prompt = 'Aim at the creek to set the sluice';
    }
  }
  if (sluice.placed) {
    const dist = Math.hypot(player.pos.x - sluice.spot.x, player.pos.z - sluice.spot.z);
    if (sluice.status().depth > 0.05) sluiceNoise = Math.max(0, 1 - dist / 9);
  }
  sound.setSluice(playing ? sluiceNoise : 0);
  view.setTool(viewTool());
  clicked = false;

  hud.progress(state.tool === 'pan' ? panProgress : 0);

  const near = nearestPickup();
  if (near?.target) prompt = `E: pick up ${near.target.kind === 'gold' ? 'the gold' : 'it'}`;
  else if (near?.find) prompt = `E: pick up the ${near.find.gem.type === 'agate' ? 'agate' : 'glinting stone'}`;
  else if (nearSluice() && sluice.cons && state.tool !== 'sluice') prompt = 'E: clean up the sluice';
  else if (sluice.stranded && Math.hypot(player.pos.x - sluice.stranded.x, player.pos.z - sluice.stranded.z) < 2.6) prompt = 'E: pick up your sluice';
  else if (nearTent() && daynight.isNight) prompt = 'E: kip in the tent till morning';
  else if (nearShop()) prompt = 'E: talk to the gold & gem buyer';
  hud.prompt(prompt);

  player.lookDX *= Math.max(0, 1 - dt * 10);
  player.lookDY *= Math.max(0, 1 - dt * 10);

  view.update(dt, {
    moving: motion.moving,
    running: motion.running,
    stridePhase: player.stridePhase,
    landDip: player.landDip,
    lookDX: player.lookDX,
    lookDY: player.lookDY,
    signal: signal.signal,
    signalKind: signal.kind,
    panning,
    panProgress,
    sieving,
    sieveProgress,
    jig: jig.I,
    dirtOnBlade: view.dirtOnBlade,
  });

  // Creek noise: louder near the water, loudest beside a riffle.
  const L = creek.local(player.pos.x, player.pos.z, {});
  const near2 = smoothstep(L.w + 14, L.w, L.d) * (0.45 + 0.8 * creek.riffle(player.pos.z));
  sound.setAmbience(dt, playing ? Math.min(1.6, near2 * (1 + weather.flood * 1.5)) : 0, panning || sieving);
}

function updateHud() {
  hud.stats(state, gear(state, 'bucket').cap);
  hud.lockSlot('sluice', !ownsSluice());
  hud.lockSlot('uv', !ownsUv());
  hud.set('clock', daynight.clockText());
  const vx = terrain.camp.x - player.pos.x, vz = terrain.camp.z - player.pos.z;
  const cross = fwd.x * vz - fwd.z * vx;
  const dot = fwd.x * vx + fwd.z * vz;
  hud.compass(Math.atan2(cross, dot), Math.hypot(vx, vz));
}

const uvDir = new THREE.Vector3();

const touch = IS_TOUCH ? new TouchControls({
  onLook: (dx, dy) => {
    if (!playing) return;
    player.yaw -= dx * 0.0022;
    player.pitch = THREE.MathUtils.clamp(player.pitch - dy * 0.0022, -1.5, 1.45);
    player.lookDX += dx;
    player.lookDY += dy;
  },
  actions: {
    interact: () => { if (!playing) return; if (kneel) { const c = excav.pickCrystal(camera.position, camDir); if (c) extract(c); } else interact(); },
    kneel: () => { if (!playing) return; if (kneel) standUp(); else kneelDown(); },
    flip: () => { if (playing) rightClick(); },
    lamp: () => toggleHeadlamp(),
    inventory: () => openModal(inventory),
    map: () => openModal(map),
    notes: () => openModal(notes),
    save: () => saveNow(),
    pause: () => pause(),
  },
}) : null;
let touchUseWas = false;

// Tool slots can be tapped (or clicked).
for (const el of document.querySelectorAll('.slot[data-tool]')) {
  el.addEventListener('click', () => {
    const t = el.dataset.tool;
    if (kneel) { if (KNEEL_TOOLS.includes(t)) setKneelTool(t); } else if (TOOLS.includes(t)) selectTool(t);
  });
}

// Tracing the lead: good colours downstream of where the reef gully comes in,
// next to nothing above it, and you've found the reef up the gully.
function checkLead() {
  if (state.leadTraced) return;
  const reef = terrain.sources.reef;
  const inCreek = (t) => { const L = creek.local(t.x, t.z, {}); return L.d < L.w + 2.5; };
  const below = state.panTests.filter((t) => inCreek(t) && t.z < reef.entryZ && t.z > reef.entryZ - 90 && t.c >= 3);
  const above = state.panTests.filter((t) => inCreek(t) && t.z > reef.entryZ + 10 && t.c <= 1);
  if (below.length >= 3 && above.length >= 1 && state.discovered.reef) {
    state.leadTraced = true;
    state.cash += 300;
    hud.toast('Fair dinkum, you\'ve traced the lead! Colours all the way up the creek, none above the gully, and the reef up top is the source.', 'gold');
    hud.toast('The buyer pays $300 for your prospecting report.', 'gold');
    sound.gold();
    writeSave();
  } else if (below.length >= 3 && !above.length) {
    hint('leadup', 'Good colours down here. Keep pan-testing upstream until they stop.', 240);
  } else if (below.length >= 3 && above.length && !state.discovered.reef) {
    hint('leadgully', 'The colours stop up the creek. Look for a gully coming in just below there and follow it up to the reef.', 240);
  }
}

// The first time you get near each source rock, it goes on the map.
const DISCOVERY = {
  reef: 'A white quartz reef. That is gold country: the creek downstream of here should carry gold.',
  basalt: 'A cap of black basalt. Sapphires, zircons and black spinel weather out of it.',
  rhyolite: 'Pink rhyolite. Agates weather out of it and wash onto the bars downstream.',
  granite: 'Granite country, with quartz veins. Look for crystal pockets and vugs here.',
  opal: 'The old opal workings. Kneel at a mullock heap and noodle for chips the old-timers missed. Stay clear of the shafts!',
};
let discoverTick = 0;
function checkDiscoveries(dt) {
  discoverTick -= dt;
  if (discoverTick > 0) return;
  discoverTick = 1;
  for (const [key, src] of Object.entries(terrain.sources)) {
    if (state.discovered[key]) continue;
    if (Math.hypot(player.pos.x - src.x, player.pos.z - src.z) < (key === 'granite' || key === 'opal' ? 24 : 26)) {
      state.discovered[key] = true;
      if (key === 'reef') setTimeout(checkLead, 100);
      hud.toast(`${DISCOVERY[key]} (Marked on your map, M.)`, 'gold');
      sound.click();
      writeSave();
    }
  }
}

let lastHour = 0;
function duskHints() {
  const h = daynight.hour;
  if (lastHour < 18.3 && h >= 18.3) {
    hud.toast(headlamp ? 'Sun going down.' : 'Getting dark. Press L for your headlamp.');
    if (ownsUv()) hud.toast('Good night for the UV torch (7) up around the reef.');
  }
  if (lastHour < 5.8 && h >= 5.8) hud.toast('Sun\'s coming up.');
  lastHour = h;
}

// ---------- loop ----------

const clock = new THREE.Clock();
let motion = { moving: false, running: false, depth: 0 };

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (touch && playing) {
    mouseHeld = touch.use;
    if (touch.use && !touchUseWas) clicked = true;
    touchUseWas = touch.use;
  }
  elapsed += dt;
  if (kneel) {
    motion = updateKneel(dt);
    updateKneelTools(dt);
  } else {
    if (playing) motion = updatePlayer(dt);
    else { motion.moving = false; camera.rotation.set(player.pitch, player.yaw, 0); }
    updateTools(dt, motion);
  }
  updateHud();
  daynight.update(playing || kneel ? dt : 0, camera.position);
  weather.daylight = daynight.daylight;
  const night = 1 - daynight.daylight;
  world.update(dt, night);
  targets.update(dt);
  const uvOn = !kneel && state.tool === 'uv' && ownsUv() && playing;
  camera.getWorldDirection(uvDir);
  finds.update(dt, camera.position, { on: uvOn, origin: camera.position, dir: uvDir, dark: night });
  headlampLight.intensity = headlamp ? 40 : 0;
  // Opal only shows its colour in good light: daylight, your headlamp, or the inventory lamp.
  opalLight.value = inventory.isOpen ? 1 : Math.max(daynight.daylight, headlamp ? 0.7 : 0.05);
  uvLight.intensity = uvOn ? 7 : 0;
  view.setLight(daynight.daylight, headlamp, uvOn);
  weather.update(dt, camera.position);
  water.uniforms.sunDir.value.copy(daynight.lightDir);
  water.uniforms.sunColor.value.copy(daynight.base.sunColor).multiplyScalar(daynight.daylight > 0.05 ? 1 : 0.35);
  checkDiscoveries(dt);
  wildlife.update(dt, {
    player: { x: player.pos.x, z: player.pos.z, speed: Math.hypot(player.vel.x, player.vel.z) },
    cam: camera.position, daylight: daynight.daylight, hour: daynight.hour, playing,
  });
  if (playing && daynight.daylight > 0.8 && daynight.hour > 9.5 && daynight.hour < 16.5) {
    hint('flies', "Bush flies. Give 'em the Aussie salute.", 900);
  }
  duskHints();
  water.update(dt, elapsed, player.pos, weather.flood);
  sluice.update(dt);

  sky.position.copy(camera.position);
  if (sky.material.uniforms.time) sky.material.uniforms.time.value = elapsed;
  sun.position.copy(player.pos).addScaledVector(daynight.lightDir, 80);
  sun.target.position.copy(player.pos);

  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  renderer.render(view.scene, view.camera);
  requestAnimationFrame(frame);
}

restoreWorld();
view.setTool(viewTool());
hud.tool(state.tool);

// Save on a timer while you play, when you pause, and when the tab is hidden or closed.
setInterval(() => { if (playing) writeSave(); }, 60000);
document.addEventListener('visibilitychange', () => { if (document.hidden) writeSave(); });
window.addEventListener('beforeunload', () => writeSave());

// Place the camera before the first frame so the title screen shows the claim.
camera.position.set(player.pos.x, player.pos.y + EYE, player.pos.z);
fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
hud.stats(state, gear(state, 'bucket').cap);
frame();

// Handy for poking at the game from the console.
window.fossick = {
  inventory, daynight, map, wildlife, weather, sluice, jig, jigZone, field, excav, kneelDown, standUp, setKneelTool, view, flood: (fast = true) => weather.trigger(fast),
  state, terrain, creek, deposits, targets, finds, player, keys, selectTool, interact, GEMS,
  setMouse: (v) => { mouseHeld = v; },
};
