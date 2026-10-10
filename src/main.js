import { createPointerLock, bindToolWheel, TOOL_ORDER as TOOLS, toolForKey } from './controls.js';
import { TRAVEL_FEE } from './regions.js';
import * as THREE from 'three';
import { RegionUI } from './regionui.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { Terrain, PLAY } from './terrain.js';
import { buildWorld } from './world.js';
import { Targets } from './targets.js';
import { Deposits } from './deposits.js';
import { Water } from './water.js';
import { SurfaceFinds } from './finds.js';
import { processLoad, summarise, GEMS, makeGemMesh, makeGem } from './minerals.js';
import { grade as gradeFind, makeNugget } from './specimens.js';
import { Inventory } from './inventory.js';
import { DayNight } from './daynight.js';
import { ClaimMap } from './map.js';
import { IS_TOUCH, TouchControls } from './touch.js';
import { Wildlife } from './wildlife.js';
import { Ute } from './vehicle.js';
import { rollOrders } from './orders.js';
import { cutStone, makeCutMesh, cuttable } from './cutting.js';
import { MILESTONES, findMilestones } from './milestones.js';
import { DustDevils } from './dustdevil.js';
import { Boulders } from './boulders.js';
import { Mine } from './mine.js';
import { OreWorks, ORE_BAG, crushedLoad } from './orework.js';
import { Cabinet } from './cabinet.js';
import { FossilBed, makeFossil, makeFossilMesh, FOSSILS } from './fossils.js';
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
import { settings, gemsRealistic } from './settings.js';
import { makeEnvironment, goldMaterial, nuggetGeometry } from './materials.js';
import { SettingsPanel } from './settingsui.js';
import { PhotoMode } from './photo.js';
import { WorldDetector } from './worlddetector.js';
import { Oversize } from './oversize.js';
import { Bedload } from './bedload.js';
import { restoreCamp, collectPractice, collectFieldPan } from './camp.js';
import { CampUI } from './campui.js';
import { CampStation } from './campstation.js';
import { CampShelter } from './campshelter.js';
import { CampBuildings } from './campbuildings.js';
import { Kelpie } from './kelpie.js';
import { stepFacilities } from './campfacilities.js';
import { startLapidary } from './lapidary.js';
import { LapidaryUI } from './lapidaryui.js';
import { shelterInfo, canSleep } from './shelter.js';
import { PanningUI } from './panningui.js';
import { rollPanContents } from './minerals.js';
import { FUEL_PER_LOAD } from './sluice.js';
import { difficulty, setDifficulty, LEVELS, ORDER } from './difficulty.js';
import { GemShow, ShowStall, isShowDay, daysUntilShow, OPENS, CLOSES } from './gemshow.js';
import { SOURCES as PLACE_NAMES } from './map.js';

// ---------- save ----------

let lastSaved = 0; // performance.now() of the last successful save
let resetting = false; // pegging a new claim: don't write the old ground over it

// The whole game: money and finds, plus the state of the ground, your gear and where you are.
function writeSave() {
  if (resetting) return true;
  const digs = terrain.digSnapshot();
  const data = {
    version: 3,
    activeRegion: 'new-england', expeditions: saved.expeditions || {},
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
    oversize: oversize.snapshot(),
    bedload: bedload.snapshot(),
    bucket: state.bucket,
    panSession: state.panSession,
    camp: state.camp,
    player: (() => {
      const pp = mine.inside || mine.climb ? mine.exitSpot() : player.pos;
      return { x: pp.x, z: pp.z, yaw: player.yaw, pitch: player.pitch, tool: state.tool };
    })(),
    ute: ute.snapshot(),
    hour: daynight.hour,
    headlamp,
    findPoints: state.findPoints,
    slabsSplit: state.slabsSplit,
    day: state.day,
    orders: state.orders,
    milestones: state.milestones,
    cutting: state.cutting,
    fuel: state.fuel,
    difficulty: state.difficulty,
    show: state.show,
    photos: state.photos,
    boulders: boulders.snapshot(),
    mine: mine.snapshot(),
    works: works.snapshot(),
    ore: state.ore,
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

const existingSave = readSave();
const saved = existingSave || { seed: Math.floor(Math.random() * 1e9), cash: 0, gold: 0 };
setDifficulty(saved.difficulty || 'easy'); // before the claim is built: it sets the grades and the detector
const state = {
  seed: saved.seed,
  cash: saved.cash || 0,
  gold: saved.gold || 0,
  up: saved.up || {},
  gems: saved.gems || [],
  nuggets: saved.nuggets || [],
  findPoints: saved.findPoints || [],
  slabsSplit: saved.slabsSplit || [],
  day: saved.day || 0,
  orders: saved.orders || null,
  milestones: saved.milestones || {},
  cutting: saved.cutting || [],
  fuel: saved.fuel || 0,
  difficulty: difficulty.key,
  show: saved.show || null,
  photos: saved.photos || 0,
  ore: saved.ore || [],
  panTests: saved.panTests || [],
  leadTraced: !!saved.leadTraced,
  discovered: saved.discovered || {},
  log: saved.log || {},
  bucket: [],
  camp: restoreCamp(saved.camp, { legacyShelter: !!existingSave }),
  panSession: saved.panSession?.version === 1 ? saved.panSession : null,
  tool: 'detector',
  remaining: 0,
};

// ---------- renderer / scene ----------

const canvas = document.getElementById('game');
// Phones get a lighter setup: no MSAA, lower resolution, smaller shadow map.
if (IS_TOUCH) document.body.classList.add('touch');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: settings.aa, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.res));
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

// What gold, water and gems reflect: the real sky, the ground and the gum line,
// refreshed as the sun moves (how often depends on the Reflections setting).
const envMaker = makeEnvironment(renderer, sky);
let env = envMaker.update(1);
scene.environment = env;
scene.environmentIntensity = 0.6;
scene.fog = new THREE.Fog(0xcdbfa8, 90, 650);

const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x8a5a3a, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0dc, 3.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
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
const campStation = new CampStation(scene, terrain, state.camp, world.colliders);
const campShelter = new CampShelter(scene, terrain, state.camp, world.colliders);
const mine = new Mine(scene, terrain, state.seed, saved.mine, world.colliders);
if (mine.ok) terrain.sources.mine = { x: mine.x, z: mine.z };
const works = new OreWorks(scene, terrain, world.oreSpots, saved.works);
const boulders = new Boulders(scene, terrain, state.seed, saved.boulders, world.colliders);
const excav = new Excavation(scene, terrain, field);
const water = new Water(scene, terrain, sunDir);
const sluice = new Sluice(scene, terrain);
const oversize = new Oversize(scene, terrain);
oversize.restore(saved.oversize);
const targets = new Targets(scene, terrain, deposits, state.seed, new Set(saved.collected || []));
const finds = new SurfaceFinds(scene, terrain, deposits, state.seed, new Set(saved.surface || []), world.colliders);
// Cobbles and small boulders a flood can roll. They join the creek's boulders
// (and their slack water) only now, after the claim's been laid out.
const bedload = new Bedload(scene, terrain, state.seed);
bedload.restore(saved.bedload);
bedload.joinCreek();
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
const devils = new DustDevils(scene, terrain, sound);
// The gem show's marquee, put up at camp on show days.
const stall = new ShowStall(scene, terrain, world.showSpot, terrain.camp);
stall.setUp(isShowDay(state.day));
const cabSpot = world.cabinetSpot;
const cabinet = new Cabinet(scene, { x: cabSpot.x, y: terrain.getHeight(cabSpot.x, cabSpot.z), z: cabSpot.z }, terrain.camp,
  (it) => inventoryMesh(it, gemsRealistic('world')));
const campBuildings = new CampBuildings(scene, terrain, state.camp, world.colliders, it => inventoryMesh(it, gemsRealistic('world')));
const kelpie = new Kelpie(scene, terrain, world.colliders, (x,z) => campBuildings.groundHeight(x,z,state.camp));
const fossils = new FossilBed(scene, terrain, state.seed, new Set(state.slabsSplit));
if (fossils.colliders) world.colliders.push(...fossils.colliders);
const ute = new Ute(scene, terrain, world.ute, world.colliders, world.uteColliders, sound);
if (saved.ute) ute.placeAt(saved.ute.x, saved.ute.z, saved.ute.h);
let driving = false;
// The detector is held out in the world, its coil riding just above the ground.
const worldDet = new WorldDetector(scene);
let detShown = false;
let rightHeld = false, touchPin = false;
// Blender-made models stream in; crystals and hand tools use them once they arrive.
loadAssets().then(() => {
  view.applyModels(assets.tools);
  view.applyGear(assets.models);
  if (assets.models.detector) worldDet.setModel(assets.models.detector, view.coilRingMat, view.detScreen.material);
  sluice.applyModel(assets.models.sluice);
  world.applyModels(assets.models);
  campShelter.applyModel(assets.models.tent);
  wildlife.applyModel(assets.models.kangaroo);
});
const hud = new Hud();
const view = new Viewmodel(env);
const settingsPanel = new SettingsPanel({ onApply: () => applyGraphics(), beforeReload: () => writeSave() });
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
const modalOpen = () => regionUI.isOpen || panUI.isOpen || campUI.isOpen || lapidaryUI.isOpen || shop.isOpen || notes.isOpen || inventory.isOpen || map.isOpen || gemshow.isOpen;

function toggleHeadlamp() {
  headlamp = !headlamp;
  sound.click();
  hud.toast(headlamp ? 'Headlamp on.' : 'Headlamp off.');
}

if (!state.orders) state.orders = rollOrders(state.seed, state.day);

// Tick off a milestone (once).
function award(key) {
  if (state.milestones[key]) return;
  const m = MILESTONES.find((o) => o.key === key);
  if (!m) return;
  state.milestones[key] = Date.now();
  hud.toast(`Milestone: ${m.title}. ${m.desc}`, 'gold');
}

// An older save: quietly tick off what's already been done, rather than a flood of toasts.
if (!saved.milestones) for (const m of MILESTONES) if (m.check?.(state, terrain.sources)) state.milestones[m.key] = Date.now();

let milestoneTick = 0;
function checkMilestones(dt) {
  milestoneTick -= dt;
  if (milestoneTick > 0) return;
  milestoneTick = 1;
  for (const m of MILESTONES) if (m.check && !state.milestones[m.key] && m.check(state, terrain.sources)) award(m.key);
}

// A new day: the buyer has fresh orders.
function newDay() {
  state.day++;
  state.orders = rollOrders(state.seed, state.day);
  setTimeout(() => hud.toast("The buyer's got new orders in. Have a look at camp."), 2500);
  stall.setUp(isShowDay(state.day));
  if (isShowDay(state.day)) setTimeout(() => hud.toast(`The gem show's on at camp today, ${OPENS} till ${CLOSES - 12}. Bring your best collection pieces.`, 'gold'), 6500);
  else if (daysUntilShow(state.day) === 1) setTimeout(() => hud.toast("Radio says there's a gem and mineral show at camp tomorrow. Collectors coming in from all over."), 6500);
  // Stones back from the cutter.
  if (state.cutting.length) {
    const back = state.cutting.splice(0);
    for (const c of back) {
      const { item, note } = cutStone(c.item, c.seed);
      state.gems.push(item);
      if (item.type === 'thunderegg') award('thunderegg');
      setTimeout(() => hud.toast(`Back from the cutter: ${item.label}, worth $${Math.round(item.value).toLocaleString()}.${note ? ` ${note}` : ''}`, 'gold'), 4500);
    }
    award('cut');
  }
}

const shop = new Shop(state, {
  sound,
  onOrder: (o, item, pay) => { award('order'); hud.toast(`Handed over ${item.label}. $${pay.toLocaleString()}, cash in hand.`, 'gold'); },
  onChange: () => { writeSave(); hud.stats(state, gear(state, 'bucket').cap); },
  onClose: () => lock(),
  onReset: () => {
    resetting = true;
    state.seed = Math.floor(Math.random() * 1e9);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        seed: state.seed, cash: state.cash, gold: state.gold, up: state.up, gems: state.gems, nuggets: state.nuggets, log: state.log,
        camp: state.camp, activeRegion: 'new-england', expeditions: saved.expeditions || {},
        milestones: state.milestones, day: state.day, cutting: state.cutting, difficulty: state.difficulty,
      }));
    } catch { /* ignore */ }
    location.reload();
  },
});
const notes = new Notes(state, { onClose: () => lock() });
const panUI = new PanningUI(state, {
  assay: sample => rollPanContents(sample),
  onSave: () => writeSave(),
  onLoad: (session, context) => { session.captureTailings = !context.practice && (!!state.camp.built.kit || !!context.camp); },
  onCollect: (sample, result, session, context) => {
    if (context.practice) collectPractice(state.camp, session);
    else { collectFieldPan(state, session); finishLoad('pan', { sample, result }); }
    if (context.camp) panUI.close();
  },
  onClose: () => {
    mouseHeld = false; keys.clear(); if (touch) touch.use = false;
    if (panUI.context.camp) campUI.open(); else lock();
  },
});
const campUI = new CampUI(state, {
  onClose: () => lock(),
  onChange: () => { campStation.sync(state.camp); campShelter.sync(state.camp); campBuildings.sync(state.camp); writeSave(); hud.stats(state, gear(state, 'bucket').cap); },
  capacity: () => gear(state, 'bucket').cap,
  canSleep: () => canSleep(daynight.hour),
  onSleep: () => sleepAtCamp(),
  cuttable,
  onPat: () => kelpie.pat(state.camp),
  onCollection: () => { campUI.hide(); openModal(inventory); inventory.setTab('collection'); },
  onLapidary: index => {
    if (state.camp.lapidarySession || startLapidary(state, index, cuttable, cutStone)) { campUI.hide(); lapidaryUI.open(); writeSave(); }
  },
  onPan: context => { mouseHeld = false; keys.clear(); if (touch) touch.use = false; panUI.open(context); },
});
let travelFromCamp = false;
let travelFromMap = false;
const regionUI = new RegionUI({
  onSave: () => writeSave(),
  onClose: () => {
    if (travelFromMap) openModal(map);
    else if (travelFromCamp) campUI.open();
    else { overlay.classList.remove('hidden'); hud.show(false); }
  },
});
regionUI.onDepart = () => { resetting = true; };
function openTravel(fromCamp = false, fromMap = false) {
  travelFromMap = fromMap;
  if (fromMap) { map.isOpen = false; document.getElementById('map').classList.add('hidden'); }
  travelFromCamp = fromCamp; mouseHeld = false; keys.clear(); if (touch) touch.use = false;
  if (fromCamp) campUI.hide();
  overlay.classList.add('hidden'); openModal(regionUI);
}
const travelButton = document.createElement('button');
travelButton.id = 'travel-btn'; travelButton.textContent = 'Expeditions · Tasmania';
travelButton.onclick = () => openTravel();
document.querySelector('.pause-row').prepend(travelButton);
const mapTravel = document.createElement('button');
mapTravel.id = 'map-travel'; mapTravel.textContent = `Locations & travel · ${TRAVEL_FEE}`;
mapTravel.onclick = () => openTravel(false,true);
document.querySelector('#map .shop-footer').prepend(mapTravel);
const campTravel = document.createElement('button');
campTravel.id = 'camp-travel'; campTravel.textContent = 'Plan an expedition · Western Tasmania';
campTravel.onclick = () => openTravel(true);
campUI.root.querySelector('.camp-shelter').after(campTravel);
const lapidaryUI = new LapidaryUI(state, { onSave: () => writeSave(), onClose: () => campUI.open() });
const gemshow = new GemShow(state, {
  sound,
  onChange: () => { writeSave(); hud.stats(state, gear(state, 'bucket').cap); },
  onClose: () => lock(),
  onPrize: (prize, item) => {
    if (prize.title === 'Best in Show') award('bestshow');
    hud.toast(`${prize.title}: ${item.label}!${prize.cash ? ` $${prize.cash} prize money.` : ''}`, 'gold');
  },
  onSale: (item, amt, who) => { award('auction'); hud.toast(`Sold to ${who}: ${item.label}, $${amt.toLocaleString()}.`, 'gold'); },
});
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
    if (phase === 'rising') hud.toast(w.peak > 1.3 ? "Crikey, that's a big one coming down! Get well away from the water." : "Crikey, the creek's coming up! Get out of the water.", 'junk');
    if (phase === 'peak') hint('bedload', 'Listen: that knocking is the bed moving. Stones roll where the flood drags hardest and stop where it slackens.', 1200);
    if (phase === 'peak') floodReworks(w.peak);
    if (phase === 'calm') {
      hud.toast("Flood's gone down. Fresh gravel on the bars: best time to go looking for agates.", 'gold');
      if (sluiceWashed) hud.toast('Your sluice washed up on a bar downstream. Go and get it (E).');
    }
  },
});

bedload.onSettled = (list) => {
  if (!list.length) return;
  const biggest = Math.round(Math.max(...list.map((m) => m.r * 2)) * 100);
  setTimeout(() => hud.toast(`The flood rolled ${list.length} stone${list.length === 1 ? '' : 's'} along the bed, the biggest about ${biggest} cm across. They fetched up where it slackened: on riffles and bars, and against the big boulders. New slack water, new traps. The map (M) shows where they went.`, 'gold'), 5000);
};

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

const pointer = createPointerLock(canvas, { test: TEST, touch: IS_TOUCH, onChange: active => {
  playing = active;
  if (!playing) exitPhoto();
  overlay.classList.toggle('hidden', playing || modalOpen());
  hud.show(playing || modalOpen());
  touch?.show(playing && IS_TOUCH);
  if (!playing) {
    if (!modalOpen()) { writeSave(); updateSaveStatus(); }
    mouseHeld = false; rightHeld = false; keys.clear();
    if (touch) { touch.use = false; touch.move.x = 0; touch.move.y = 0; touch.run = false; }
    playBtn.textContent = 'Paused. Click to resume';
  }
} });
function lock() { sound.init(); pointer.resume(); }
playBtn.addEventListener('click', lock);
canvas.addEventListener('click', () => { if (!playing && !modalOpen()) lock(); });

// Difficulty, on the title and pause screen. Changing it restarts on the same claim.
function renderDifficulty() {
  const segs = document.getElementById('diff-segs');
  if (!segs) return;
  segs.innerHTML = '';
  for (const key of ORDER) {
    const b = document.createElement('button');
    b.className = 'seg' + (difficulty.key === key ? ' on' : '');
    b.textContent = LEVELS[key].label;
    b.onclick = (e) => {
      e.stopPropagation();
      if (key === difficulty.key) return;
      if (!confirm(`Switch to ${LEVELS[key].label}? ${LEVELS[key].blurb}\n\nThe game restarts on the same claim and keeps your progress.`)) return;
      state.difficulty = key;
      writeSave();
      location.reload();
    };
    segs.append(b);
  }
  document.getElementById('diff-blurb').textContent = LEVELS[difficulty.key].blurb;
}
renderDifficulty();

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
  pointer.pause();
}

function openModal(m) {
  state.forecast = weather.forecast();
  if (m === map) m.open(player, { sluice, patches: excav.patches, sources: terrain.sources, camp: terrain.camp, flood: bedload.lastFlood });
  else m.open();
  touch?.show(false);
  pointer.pause();
}

document.addEventListener('mousemove', (e) => {
  if (!playing) return;
  if (photo.active) { photo.look(e.movementX, e.movementY); return; }
  if (driving) { ute.look(e.movementX, e.movementY); return; }
  player.yaw -= e.movementX * 0.0022;
  player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * 0.0022, -1.5, 1.45);
  player.lookDX += e.movementX;
  player.lookDY += e.movementY;
});
let clicked = false;
let splitHold = 0, prise = 0, drillTick = 0, workProgress = 0;
canvas.addEventListener('mousedown', (e) => {
  if (!playing) return;
  if (photo.active) { if (e.button === 0) photo.snap(); return; }
  if (e.button === 0) { mouseHeld = true; clicked = true; }
  if (e.button === 2) { rightHeld = true; rightClick(); }
});
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('mouseup', (e) => { if (e.button === 0) mouseHeld = false; if (e.button === 2) rightHeld = false; });

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
bindToolWheel({
  isPlaying: () => playing,
  special: e => { if (photo.active) { photo.zoom(e.deltaY); return true; } return driving; },
  items: () => kneel ? KNEEL_TOOLS : TOOLS.filter(t => (t !== 'sluice' || ownsSluice()) && (t !== 'uv' || ownsUv())),
  current: () => kneel ? kneel.tool : state.tool,
  select: name => kneel ? setKneelTool(name) : selectTool(name),
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
  if (regionUI.isOpen) return;
  if (e.code === 'F5' || (e.code === 'KeyS' && (e.ctrlKey || e.metaKey))) {
    e.preventDefault(); // keep the browser from reloading or saving the page
    saveNow();
    return;
  }
  if (photo.active) {
    if ((e.code === 'KeyK' || e.code === 'Escape') && !e.repeat) { exitPhoto(); return; }
    if (e.repeat || !photo.key(e.code)) keys.add(e.code);
    return;
  }
  if (e.code === 'KeyH' && !e.repeat) { toggleControls(); return; }
  if (e.code === 'KeyN' && notes.isOpen) { notes.close(); return; }
  if (e.code === 'KeyI' && inventory.isOpen) { inventory.close(); return; }
  if (e.code === 'KeyM' && map.isOpen) { map.close(); return; }
  if (e.code === 'KeyP' && playing && !e.repeat) { pause(); return; }
  if (!playing) return;
  if (e.code === 'KeyK' && !e.repeat) { enterPhoto(); return; }
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
  const tool = toolForKey(e.code);
  if (e.code === 'KeyL' && !e.repeat) toggleHeadlamp();
  if (e.code === 'KeyM' && !e.repeat) { openModal(map); return; }
  if (e.code === 'KeyF' && !e.repeat) rightClick();
  if (tool) selectTool(tool);
  if (e.code === 'KeyE' && !e.repeat) interact();
  if (e.code === 'KeyN' && !e.repeat) openModal(notes);
  if (e.code === 'KeyI' && !e.repeat) openModal(inventory);
});
document.addEventListener('keyup', (e) => keys.delete(e.code));

// Graphics settings that can change on the fly.
const fpsEl = document.getElementById('fps');
function applyGraphics() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.res));
  renderer.setSize(window.innerWidth, window.innerHeight);
  const size = { low: 1024, high: 2048, ultra: 4096 }[settings.shadows];
  sun.castShadow = !!size;
  if (size && sun.shadow.mapSize.x !== size) {
    sun.shadow.mapSize.set(size, size);
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
  }
  fpsEl.classList.toggle('hidden', !settings.fps);
  envTimer = 0;
  envHour = -99;
}

let envTimer = 0, envHour = -99;
function updateReflections(dt) {
  envTimer -= dt;
  const mode = settings.reflections;
  const dh = Math.abs(daynight.hour - envHour);
  if (mode === 'static' ? (dh < 1 || dh > 23) : envTimer > 0) return;
  envTimer = mode === 'live' ? 1.5 : 8;
  envHour = daynight.hour;
  env = envMaker.update(daynight.daylight);
  scene.environment = env;
  view.scene.environment = env;
}

let fpsFrames = 0, fpsTime = 0;
function countFps(raw) {
  if (!settings.fps) return;
  fpsFrames++;
  fpsTime += raw;
  if (fpsTime >= 0.5) {
    fpsEl.textContent = `${Math.round(fpsFrames / fpsTime)} fps`;
    fpsFrames = 0;
    fpsTime = 0;
  }
}

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
  for (const k of findMilestones(item)) award(k);
  return item;
}

// Inventory viewer meshes.
const quartzMat = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.35, metalness: 0 });
function inventoryMesh(item, hq = gemsRealistic('inventory')) {
  if (item.cut) return makeCutMesh(item, { hq });
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
      const gold = new THREE.Mesh(new THREE.CylinderGeometry(0.0112, 0.0112, fill, 24), goldMaterial('fine'));
      gold.position.y = -0.025 + fill / 2;
      g.add(gold);
    }
    return g;
  }
  if (item.type === 'nugget') {
    const r = mulberry32(item.seed || 1);
    const g = new THREE.Group();
    const s = 0.004 * Math.cbrt(item.grams) + 0.003;
    const style = item.style === 'quartz' || item.style === 'crystalline' ? 'crystalline' : 'waterworn';
    const n = new THREE.Mesh(nuggetGeometry(item.seed || 1, { detail: 4, style }), goldMaterial(style));
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
        const c = new THREE.Mesh(new THREE.OctahedronGeometry(s * 0.35), goldMaterial('crystalline'));
        c.position.set((r() - 0.5) * s * 2, s * 0.5 + r() * s * 0.3, (r() - 0.5) * s * 1.6);
        c.rotation.set(r() * 3, r() * 3, r() * 3);
        g.add(c);
      }
    }
    return g;
  }
  if (item.type === 'fossil') {
    // Stand the slab up so the split face, with the fossil on it, faces you.
    const g = new THREE.Group();
    const m = makeFossilMesh(item);
    m.rotation.x = 1.15;
    g.add(m);
    return g;
  }
  if (item.crystal || ['quartz', 'feldspar', 'calcite', 'fluorite'].includes(item.type) || (item.type === 'topaz' && item.lengthCm)) {
    const c = item.crystal || { variety: item.variety, len: (item.lengthCm || 3) / 100, broken: false, damage: 0, id: 1, grade: item.grade };
    return makeCrystalMesh({ ...c, x: 0, y: 0, z: 0, ax: 0, ay: 1, az: 0 }, { hq });
  }
  return makeGemMesh(item, { hq });
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

function enterUte() {
  driving = true;
  award('drove');
  document.body.classList.add('driving');
  ute.enter();
  mouseHeld = false;
  hud.prompt('');
  hint('drive', "W/S throttle and reverse, A/D steer, Space brake, mouse to look about, E to hop out. Mind the creek.", 600);
  sound.click();
}

function exitUte() {
  const p = ute.exitSpot();
  ute.exit();
  driving = false;
  document.body.classList.remove('driving');
  player.pos.set(p.x, terrain.getHeight(p.x, p.z), p.z);
  player.vel.set(0, 0, 0);
  player.yaw = ute.facingYaw();
  player.pitch = ute.lookPitch;
  sound.click();
  writeSave();
}

function interact() {
  if (driving) { exitUte(); return; }
  if (mine.climb) return;
  if (works.dolly.active) { works.stopDolly(); hud.toast('Leaving the dolly pot for now.'); return; }
  if (mine.inside) {
    if (mine.nearLadder(player.pos)) startClimb(false);
    return;
  }
  if (campStation.near(player.pos) || campBuildings.near(player.pos, state.camp)) { openModal(campUI); return; }
  if (kelpie.near(player.pos)) { kelpie.pat(state.camp); hud.toast('Your kelpie wags its tail.'); writeSave(); return; }
  if (mine.nearCollar(player.pos)) { startClimb(true); return; }
  if (works.nearMill(player.pos)) { useMill(); return; }
  if (works.nearDolly(player.pos) && (state.ore.length || works.dolly.crush > 0)) {
    works.startDolly();
    hint('dolly', 'Drive the dolly down when the sapling has sprung it right up. Pound a lump to grit, then pan it at the creek.', 600);
    return;
  }
  if (works.nearFire(player.pos) && useFire()) return;
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
    } else if (t.kind === 'hot') {
      hud.toast("A hot rock: a lump of magnetic ironstone. It sang like gold. Bugger.", 'junk');
      hint('hotrock', 'Hot rocks are the curse of mineralised ground. Real detectorists ground-balance and learn the sound: a hot rock often answers on one swing direction and not the other, and reads the same at any coil height.', 600);
      sound.junk();
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
  const pile = oversize.near(player.pos);
  if (pile && !(nearSluice() && sluice.cons && Math.hypot(pile.x - player.pos.x, pile.z - player.pos.z) > 1)) {
    const got = oversize.pickThrough(pile);
    for (const g of got) addFind(g, 'Picked out of the classifier oversize');
    hud.toast(got.length ? `Picked through the oversize: ${summarise(got)}. Tossed the rest.` : `Picked through ${pile.loads} load${pile.loads === 1 ? '' : 's'} of oversize. Nothing in it but gravel.`, got.length ? 'gold' : '');
    sound.click();
    writeSave();
    return;
  }
  if (sluice.placed && nearSluice() && sluice.cons) {
    const c = sluice.cleanUp();
    state.bucket.unshift(c);
    award('sluice');
    hud.toast(`Cleaned up the ${sluice.kind === 'highbanker' ? 'highbanker' : 'sluice'}: concentrates from ${c.loads} load${c.loads === 1 ? '' : 's'}. Pan them.`, 'gold');
    sound.coin();
    return;
  }
  if (sluice.stranded && Math.hypot(player.pos.x - sluice.stranded.x, player.pos.z - sluice.stranded.z) < 2.6) {
    sluice.recover();
    sluiceWashed = false;
    hud.toast("Got your sluice back. She'll be right. Set it again with tool 5.");
    return;
  }
  if (ute.near(player.pos)) { enterUte(); return; }
  if (cabinet.near(player.pos)) { openModal(inventory); inventory.setTab?.('collection'); return; }
  if (stall.near(player.pos)) {
    if (daynight.hour >= OPENS && daynight.hour < CLOSES) { openModal(gemshow); return; }
    hud.toast(daynight.hour < OPENS ? `The show opens at ${OPENS}. The dealers are still unpacking.` : "They've packed up for the day. Next show's in a few days.");
    return;
  }
  if (nearTent()) { openModal(campUI); campUI.focusShelter(); return; }
  if (nearShop()) openModal(shop);
}

function nearTent() { return campShelter.near(player.pos); }

function sleepAtCamp() {
  if (!canSleep(daynight.hour) || (!nearTent() && !campStation.near(player.pos) && !campBuildings.near(player.pos, state.camp))) return false;
  // Days turn over at dawn, including when sleeping after midnight. Set the
  // dawn tracker as well so the next world frame cannot advance the day again.
  newDay(); daynight.hour = 6; lastHour = 6;
  hud.toast(`You settle into your ${shelterInfo(state.camp).short.toLowerCase()} and wake at sunrise. Morning!`);
  sound.click(); writeSave(); campUI.close();
  return true;
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
  if (state.tool === 'detector' && !kneel && !driving) {
    hint('pinpoint', 'Pinpointing: the sweep stops and the coil goes where you look. Move it slowly over the spot; the target is right under the loudest point.', 600);
    return;
  }
  if (state.tool === 'sieve') flipSieve();
  else if (state.tool === 'sluice' && nearSluice()) {
    const c = sluice.pickUp();
    if (c) state.bucket.unshift(c);
    const what = sluice.kind === 'highbanker' ? 'Packed up the highbanker' : 'Lifted the sluice out';
    hud.toast(c ? `${what} and cleaned it up. Concentrates are in your bucket.` : `${what}.`);
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

const ownsClassifier = () => (state.up.classifier || 0) > 0;

// A point to one side of you (or of something facing yaw), where a pile can go.
function beside(p, d, yaw = player.yaw) {
  return { x: p.x + Math.cos(yaw) * d, z: p.z - Math.sin(yaw) * d };
}

// The classifier screen: fines (gold, small gems) through into the bucket or the
// sluice; the oversize (agates, big stones, gravel) onto a pile to pick through.
function classify(sample, at) {
  const rates = { agate: sample.agate, big: sample.sapphire * 0.12 + sample.zircon * 0.06 };
  sample.agate = 0;
  sample.sapphire *= 0.88;
  sample.zircon *= 0.94;
  sample.classified = true;
  const first = !oversize.piles.length;
  oversize.add(at.x, at.z, rates);
  if (first) hint('oversize', 'The classifier keeps the stones back: they go on a pile beside you. Pick through it (E) for agates and big stones before you move on.', 900);
}

function feedSluice() {
  const sample = state.bucket.shift();
  if (!feedBox(sample, false)) state.bucket.unshift(sample);
}

// One load into the sluice or highbanker. Screened at the head if there's a
// screen there: the highbanker's grizzly always, a classifier over a sluice if you have one.
function feedBox(sample, direct) {
  const hb = sluice.kind === 'highbanker';
  if (hb && state.fuel < FUEL_PER_LOAD - 1e-6) {
    hud.toast("The pump's out of petrol. The buyer at camp sells jerry cans.", 'junk');
    sound.denied();
    return false;
  }
  if (hb) state.fuel = Math.max(0, state.fuel - FUEL_PER_LOAD);
  let classified = !!sample.classified;
  if (!classified && (hb || ownsClassifier())) {
    const h = sluice.head;
    classify(sample, beside(h, 0.75, sluice.model.rotation.y));
    classified = true;
  }
  const r = sluice.feed(sample, classified);
  sound.dig();
  view.playDig();
  view.dirtOnBlade = !direct;
  if (!classified) hint('unclassified', 'Unscreened wash: the stones roll over the riffles, stir the bed up and pack them fast, and agates go straight out the tail. A classifier ($150 at camp) screens it first.', 300);
  if (sluice.fill >= 1) hint('packed', `The riffles are chockers. Clean up the ${hb ? 'highbanker' : 'sluice'} (E) before you lose gold.`, 20);
  if (r.eff < 0.4) hint('sluiceflow', `This spot isn't working well: ${sluice.status().why}. Try another run.`, 60);
  return true;
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
  if (sluice.placed && Math.hypot(player.pos.x - sluice.head.x, player.pos.z - sluice.head.z) < 2.6) {
    // Digging right beside the sluice or highbanker: the shovelful goes straight in at the head.
    feedBox(sample, true);
  } else if (state.bucket.length < capacity) {
    if (ownsClassifier()) classify(sample, beside(player.pos, 0.7));
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
  const sample = opts.sample || state.bucket.shift();
  if (!sample) return;
  const res = opts.result || processLoad(sample, method, gearInfo(), Math.random, opts);
  // Preserve sub-milligram colours from the panning model instead of rounding
  // away genuine recovery on Realistic. Sieve behaviour remains unchanged.
  const gold = opts.result ? res.gold : Math.round(res.gold * 1000) / 1000;
  if (gold > 0) {
    state.gold += gold;
    logGold(gold, false);
  }
  if (res.picker) {
    const pk = makeNugget(Math.round(res.picker * 100) / 100, Math.floor(Math.random() * 1e6), GOLD_PRICE);
    pk.label = `picker, ${pk.grams.toFixed(2)} g`;
    addFind(pk, method === 'pan' ? 'Picked out of the pan' : 'Picked off the sieve');
    logGold(pk.grams, false);
  }
  const from = method === 'pan' ? (sample.crushed ? 'Panned from crushed reef ore' : sample.cons ? 'Panned from sluice concentrates' : 'Panned from creek wash') : 'Wet-sieved from creek wash';
  if (sample.crushed && gold > 0.001) {
    award('reefgold');
    if (!sample.roasted) hint('roastmore', 'Raw ore holds onto its gold. Roast it on the campfire before you crush it and the pan gets a lot more.', 300);
  }
  for (const f of res.finds) addFind(f, from);

  const parts = [];
  // Prospectors count "colours": the specks of gold left in the pan.
  let colours = 0;
  if (method === 'pan' && !sample.cons && !sample.repan && (sample.sourceClaim === undefined || sample.sourceClaim === state.seed)) {
    colours = Math.max(0, Math.round((res.gold * 1000) / 2.5 + (Math.random() - 0.5)));
    if (sample.x !== undefined) {
      state.panTests.push({ x: sample.x, z: sample.z, c: colours });
      if (state.panTests.length > 300) state.panTests.shift();
      checkLead();
    }
  }
  if (res.picker) parts.push(`bonza, a ${res.picker.toFixed(2)} g picker`);
  else if (colours) parts.push(`${colours} colour${colours === 1 ? '' : 's'} (${gold.toFixed(3)} g)`);
  else if (gold > 0) parts.push(gold < 0.01 ? `${(gold * 1000).toFixed(2)} mg fine gold` : `${gold.toFixed(3)} g fine gold`);
  const stones = summarise(res.finds);
  if (stones) parts.push(stones);
  const notable = res.finds.filter((f) => f.type === 'sapphire' || f.type === 'topaz' || (f.type === 'agate' && f.grade === 'A'));

  if (method === 'pan') view.showPanResult(gold > 0.002);
  else view.showSieveResult(res.finds, opts.strat ?? 1);

  if (!parts.length) hud.toast(method === 'pan' ? 'Not a colour. Nothing but black sand. Bugger.' : 'Just gravel in the sieve.', 'junk');
  if (method === 'pan' && colours) hint('colours', 'Count the colours as you pan your way up the creek. Where they stop, the gold\'s source is close. Your tests go on the map (M).', 600);
  else if (parts.length) hud.toast(cap(parts.join(', ')) + '.', 'gold');
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

// ---------- hard-rock gold: the mine and the ore works ----------

function startClimb(down) {
  mine.climb = { down, t: 0, clank: 0 };
  mouseHeld = false;
  if (down) {
    award('underground');
    if (!headlamp) hint('minedark', "It's black as down there. Press L for your headlamp.", 120);
  }
  sound.click();
}

function updateClimb(dt) {
  const c = mine.climb;
  c.t = Math.min(1, c.t + dt / 3.2);
  c.clank -= dt;
  if (c.clank <= 0) { c.clank = 0.42; sound.tap(0.4); }
  camera.position.copy(mine.ladderPose(c.t, c.down));
  // Facing the ladder on the way, then turning round at the bottom (or top).
  player.yaw = mine.driveYaw(true);
  player.pitch = c.down ? -0.25 + c.t * 0.25 : 0.25 - c.t * 0.25;
  camera.rotation.set(player.pitch, player.yaw, 0);
  hud.prompt(c.down ? 'Climbing down...' : 'Climbing up...');
  hud.progress(0);
  sound.setDetector(false, 0, null);
  marker.visible = false;
  if (c.t >= 1) {
    if (c.down) {
      mine.inside = true;
      const start = mine.clamp(mine.ladderPose(1, true));
      player.pos.copy(start);
      player.yaw = mine.driveYaw();
    } else {
      mine.inside = false;
      const out = mine.exitSpot();
      player.pos.set(out.x, terrain.getHeight(out.x, out.z), out.z);
      player.yaw = mine.driveYaw();
    }
    player.vel.set(0, 0, 0);
    player.pitch = 0;
    mine.climb = null;
    writeSave();
  }
  return { moving: false, running: false, depth: 0 };
}

// Walking about in the drive.
let mineWork = 0;
function updateUnderground(dt) {
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
  if (moving) wish.multiplyScalar((running ? 3.6 : 2.4) / Math.max(1, wish.length()));
  const k = Math.min(1, dt * 12);
  player.vel.x += (wish.x - player.vel.x) * k;
  player.vel.z += (wish.z - player.vel.z) * k;
  const next = mine.clamp(new THREE.Vector3(player.pos.x + player.vel.x * dt, player.pos.y, player.pos.z + player.vel.z * dt));
  player.pos.copy(next);
  const hspeed = Math.hypot(player.vel.x, player.vel.z);
  if (hspeed > 0.5) {
    player.stridePhase += dt * hspeed * 1.9;
    const step = Math.floor(player.stridePhase / Math.PI);
    if (step !== player.lastStep) { player.lastStep = step; sound.step(false); }
  }
  const bob = Math.abs(Math.sin(player.stridePhase)) * 0.04 * Math.min(1, hspeed / 3);
  camera.position.set(player.pos.x, player.pos.y + EYE - bob, player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, 0);
  return { moving: hspeed > 0.5, running, depth: 0 };
}

// Tools in the mine: the hammer breaks ore and picks out shows; the detector
// finds them; the UV torch lights up scheelite. Nothing else is much use.
function updateMineTools(dt) {
  digCooldown -= dt;
  camera.getWorldDirection(camDir);
  marker.visible = false;
  let prompt = '';
  let progress = 0;
  if (state.tool === 'hammer') {
    const t = mine.pick(camera.position, camDir);
    if (!t || !mouseHeld) mineWork = Math.max(0, mineWork - dt * 2);
    if (t?.show) {
      prompt = t.show.scheelite ? 'Hold click to chip out the scheelite' : 'Visible gold! Hold click to break out the specimen';
      if (mouseHeld) {
        mineWork += dt / 1.5;
        if (Math.floor(mineWork * 5) !== Math.floor((mineWork - dt / 1.5) * 5)) { view.playTap(); sound.tap(0); }
        if (mineWork >= 1) {
          mineWork = 0;
          mine.takeShow(t.show);
          if (t.show.scheelite) {
            const g = makeGem('scheelite', Math.random);
            addFind(g, 'Chipped out of the reef in the Lucky Strike');
            hud.toast(`${cap(g.label)}, out of the reef.`, 'gold');
          } else {
            const n = makeNugget(t.show.grams, t.show.seed, GOLD_PRICE);
            n.style = 'quartz';
            n.value = Math.round(n.value * 1.4 * 100) / 100; // gold in quartz: collectors pay well for it
            n.label = `gold in quartz, ${t.show.grams.toFixed(2)} g`;
            addFind(n, 'Broken out of the reef in the Lucky Strike');
            if (!n.specimen) hud.toast(`Gold in quartz! ${t.show.grams.toFixed(2)} g of it.`, 'gold');
            sound.gold();
          }
          sound.crack();
          writeSave();
        }
      }
      progress = mineWork;
    } else if (t?.reef) {
      const full = state.ore.length >= ORE_BAG;
      prompt = full ? `Ore bag's full (${ORE_BAG}). Take it up to camp: roast it on the fire, then crush it.` : `Quartz reef · hold click to break out ore (${state.ore.length}/${ORE_BAG})`;
      if (mouseHeld && !full) {
        mineWork += dt / 1.6;
        if (Math.floor(mineWork * 4) !== Math.floor((mineWork - dt / 1.6) * 4)) { view.playTap(); sound.tap(0.15); }
        if (mineWork >= 1) {
          mineWork = 0;
          state.ore.push(mine.breakOre(t.local));
          sound.crack();
          hint('ore', 'A lump of reef ore. The gold in it is too fine to see: roast it on the campfire, crush it in the dolly pot, then pan it.', 600);
          if (state.ore.length === ORE_BAG) hud.toast('Ore bag full. Time to head up and treat it.');
        }
      }
      progress = mineWork;
    } else if (t) {
      prompt = 'Country rock. The gold is in the white quartz reef';
      if (clicked && digCooldown <= 0) { digCooldown = 0.35; view.playTap(); sound.thud(); }
    } else prompt = '';
  } else if (state.tool === 'detector') {
    const coil = camera.position.clone().addScaledVector(camDir, 0.9);
    const sig = mine.signalAt(coil);
    hud.meter(sig, sig > 0 ? 'gold' : null, (state.up.disc || 0) > 0);
    sound.setDetector(playing, sig, sig > 0 ? 'gold' : null);
    prompt = sig > 0.2 ? 'Something in the walls here' : '';
  } else if (state.tool === 'uv') {
    prompt = ownsUv() ? '' : 'No UV torch yet';
  } else {
    prompt = 'Not much use for that down here. The hammer (6) is what you want';
  }
  if (state.tool !== 'detector') sound.setDetector(false, 0, null);
  if (mine.nearLadder(player.pos)) prompt = prompt ? `${prompt} · E: climb out` : 'E: climb the ladder out';
  view.setTool(viewTool());
  clicked = false;
  hud.progress(progress);
  hud.prompt(prompt);
}

// The campfire: roast raw ore, or take the roasted ore off.
function useFire() {
  const done = works.takeRoast();
  if (done) {
    state.ore.push(...done);
    hud.toast(`Roasted ore off the fire: ${done.length} lump${done.length === 1 ? '' : 's'}, cracked and brittle. Crush it in the dolly pot.`, 'gold');
    sound.coin();
    writeSave();
    return true;
  }
  if (works.roast) {
    hud.toast(`Still roasting. About ${Math.ceil(works.roast.left)} seconds to go.`);
    return true;
  }
  const n = works.startRoast(state.ore);
  if (n) {
    hud.toast(`${n} lump${n === 1 ? '' : 's'} of ore on the fire to roast. Give it a bit.`);
    hint('roast', 'Roasting makes quartz brittle and burns off the sulphides that lock up fine gold. Crush it once it is done.', 600);
    sound.click();
    writeSave();
    return true;
  }
  return false;
}

// The hammer mill: shovel crushed ore out, or feed it more.
function useMill() {
  const cap = gear(state, 'bucket').cap;
  const m = works.mill;
  if (m.out.length) {
    let n = 0;
    while (m.out.length && state.bucket.length < cap) { state.bucket.push(m.out.shift()); n++; }
    hud.toast(n ? `Shovelled ${n} load${n === 1 ? '' : 's'} of crushed ore into your bucket. Pan it at the creek.` : "Bucket's full. Go and pan what you've got.");
    sound.click();
    writeSave();
    return;
  }
  if (state.ore.length) {
    const n = works.feedMill(state.ore);
    hud.toast(`Fed ${n} lump${n === 1 ? '' : 's'} into the hammer mill.`);
    writeSave();
    return;
  }
  hud.toast(works.milling ? 'Still crushing...' : 'Nothing to crush. Break some ore in the Lucky Strike first.');
}

// The dolly pot: pound a lump at a time into grit.
function updateDollyPot() {
  const d = works.dolly;
  if (!works.nearDolly(player.pos)) { works.stopDolly(); return null; }
  const lump = state.ore[0];
  if (!lump && d.crush <= 0) { works.stopDolly(); hud.toast('No more ore to crush.'); return null; }
  if (clicked && lump) {
    const r = works.strike(state.ore, lump.roasted);
    if (r && !r.good) hint('dollytime', 'Too soon. Wait till the sapling has lifted the dolly right up, then drive it down.', 40);
  }
  if (d.crush >= 1 && lump) {
    const cap = gear(state, 'bucket').cap;
    if (state.bucket.length >= cap) {
      works.stopDolly();
      hud.toast("Bucket's full of crushed ore. Go and pan it.");
      return null;
    }
    state.bucket.push(crushedLoad(state.ore.shift()));
    d.crush = 0;
    sound.coin();
    hud.toast(state.ore.length ? `Crushed to grit. ${state.ore.length} lump${state.ore.length === 1 ? '' : 's'} to go.` : 'Crushed to grit. That is the lot: pan it at the creek.');
    writeSave();
  }
  return `Dolly pot · drive it down when it springs right up${lump && !lump.roasted ? ' (raw ore: roast it first and it crushes faster)' : ''} · E to stop`;
}

// ---------- driving ----------

function updateDriving(dt) {
  let throttle = 0, steer = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) throttle += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) throttle -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) steer += 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) steer -= 1;
  if (touch) { throttle += touch.move.y; steer -= touch.move.x; }
  const brake = keys.has('Space') || !!touch?.jump;
  const msg = ute.update(dt, THREE.MathUtils.clamp(throttle, -1, 1), THREE.MathUtils.clamp(steer, -1, 1), brake);
  if (msg) hint(`ute-${msg}`, msg, 6);
  ute.cameraPose(camera);
  player.pos.set(ute.x, terrain.getHeight(ute.x, ute.z), ute.z);
  player.yaw = ute.facingYaw();
  fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  hud.prompt(`${ute.kmh} km/h · E to hop out · Space to brake`);
  marker.visible = false;
  sound.setDetector(false, 0, null);
  sound.setAmbience(dt, 0, false);
  hud.jig(false);
  hud.progress(0);
  return { moving: false, running: false, depth: 0 };
}

// ---------- kneeling and hand excavation ----------

let kneel = null;
let workTick = 0;

function kneelDown() {
  if (driving || mine.inside || mine.climb) return;
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
  const g = campBuildings.groundHeight(player.pos.x, player.pos.z, state.camp);
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

function updateTools(dt, motion) {
  if (works.dolly.active) {
    const msg = updateDollyPot();
    if (msg) {
      marker.visible = false;
      sound.setDetector(false, 0, null);
      view.setTool(viewTool());
      clicked = false;
      hud.progress(works.dolly.crush);
      hud.prompt(msg);
      return;
    }
  }
  digCooldown -= dt;
  workProgress = 0;
  let prompt = '';
  marker.visible = false;
  let panning = false, sieving = false;

  camera.getWorldDirection(camDir);

  const bTarget = state.tool === 'hammer' ? boulders.pick(camera.position, camDir) : null;
  const fossilTarget = state.tool === 'hammer' && !bTarget ? fossils.pick(camera.position, camDir) : null;
  if (!bTarget || !mouseHeld) { splitHold = 0; }
  if (!bTarget?.crystal || !mouseHeld) prise = Math.max(0, prise - dt * 2);
  if (bTarget?.crystal) {
    // Work a crystal loose from the cavity wall.
    prompt = 'Hold click to work the crystal free';
    if (mouseHeld) {
      prise += dt / 1.2;
      if (Math.floor(prise * 6) !== Math.floor((prise - dt / 1.2) * 6)) sound.scrapeTick?.();
      if (prise >= 1) {
        prise = 0;
        const c = boulders.take(bTarget.crystal);
        if (Math.random() < 0.1) { c.broken = true; c.damage = 1; }
        const gem = crystalToGem(c);
        addFind(gem, 'Prised out of a vug in a split boulder', player.pos);
        if (!gem.specimen) hud.toast(c.broken ? `Snapped it. ${cap(gem.label)}.` : `Got it out clean: ${gem.label}.`, c.broken ? 'junk' : 'gold');
        sound.crack();
        writeSave();
      }
    }
    workProgress = prise;
  } else if (bTarget?.boulder) {
    const b = bTarget.boulder;
    const kit = (state.up.feathers || 0) > 0;
    if (b.split) {
      const left = b.halves.reduce((n, h) => n + h.crystals.length, 0);
      prompt = !b.vug ? 'Solid granite all the way through.' : left ? 'Aim at a crystal to prise it out' : 'Cleaned out. Nothing left in this one.';
    } else {
      prompt = kit ? 'Click to tap and listen · hold to drill and split it' : 'Click to tap and listen';
      if (clicked && digCooldown <= 0) {
        digCooldown = 0.35;
        view.playTap();
        const hollow = boulders.hollowness(b, bTarget.point);
        sound.tap(hollow);
        if (hollow > 0.45) hint(`bhollow${b.id}`, kit ? 'That one rang hollow. Hold click to drill and split it.' : "That one rang hollow. Something's inside. Get a plug-and-feathers kit at camp to split it.", 30);
        else hint('bsolid', 'Rings solid there. Tap round the boulder: a hollow spot sounds dull.', 60);
      }
      if (mouseHeld && kit) {
        splitHold += dt;
        if (splitHold > 0.35) {
          const r = boulders.work(b, dt);
          workProgress = b.progress;
          if (r === 'drill') {
            prompt = 'Drilling a line of holes...';
            drillTick -= dt;
            if (drillTick <= 0) { drillTick = 0.11; sound.scrapeTick?.(); }
          } else if (r === 'wedge' || r === 'wedging') {
            prompt = 'Driving in the wedges...';
            if (r === 'wedge') { view.playTap(); sound.tap(0); }
          } else if (r === 'split') {
            sound.crack();
            sound.thud();
            workProgress = 0;
            if (b.vug) {
              hud.toast(b.kind === 'quartz' ? 'Crack! It splits open on a vug lined with quartz crystals!' : 'Crack! It falls open: a vug full of crystals!', 'gold');
              award('boulder');
            } else hud.toast('Crack! Solid all the way through. Bugger.', 'junk');
            writeSave();
          }
        }
      }
    }
  } else if (fossilTarget) {
    prompt = fossilTarget.slab ? 'Click to split the slab along its bedding' : 'Click to prise a slab off the ledge';
    if (clicked && digCooldown <= 0) {
      digCooldown = 0.3;
      view.playTap();
      sound.tap(0);
      const r = fossils.tap(fossilTarget, player.pos);
      if (r.message) hud.toast(r.message);
      if (r.done) {
        const sl = r.split;
        if (sl.id < 500) state.slabsSplit.push(sl.id);
        sound.crack();
        if (sl.content) {
          const fz = makeFossil(sl.content, mulberry32(sl.seed));
          addFind(fz, 'Split out of a slab of Permian shale', sl);
          if (!fz.specimen) hud.toast(sl.content === 'fish' ? 'Strewth, a fossil fish!' : `A ${FOSSILS[sl.content].name}!`, 'gold');
          sound.gold();
        } else hud.toast('Nothing in this one. Have a crack at another.', 'junk');
        writeSave();
      }
    }
  } else if (state.tool === 'hammer') {
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
    const pin = rightHeld || keys.has('KeyF') || touchPin;
    const sense = worldDet.ready ? worldDet.update(dt, {
      pos: player.pos, yaw: player.yaw, ground: (x, z) => terrain.getHeight(x, z), moving: motion.moving,
      pinpoint: pin, aimAt: pin ? terrain.raycast(camera.position, camDir, 3) : null, visible: true,
    }) : null;
    detShown = !!sense;
    if (sense) coil.copy(sense);
    else {
      // No model yet: the coil rides about a metre ahead, swinging with the viewmodel.
      const swing = Math.sin(view.sweep) * 0.35;
      coil.set(player.pos.x + fwd.x * 1.0 - right.x * swing, 0, player.pos.z + fwd.z * 1.0 - right.z * swing);
      coil.y = terrain.getHeight(coil.x, coil.z) + 0.04;
    }
    signal = targets.detect(coil, state.up.detector || 0, pin);
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
    panProgress = 0;
    const available = state.panSession || state.bucket.length;
    prompt = !available ? 'Dig some wash or clean up the sluice first'
      : motion.depth <= 0.15 && !state.panSession ? 'Wade into the creek to load your pan'
        : state.panSession ? 'Click / Use: return to your partly worked pan' : 'Click / Use: load and work your gold pan';
    if (playing && (clicked || mouseHeld) && available && (motion.depth > 0.15 || state.panSession)) {
      mouseHeld = false; clicked = false; keys.clear();
      if (touch) { touch.use = false; touch.move.x = 0; touch.move.y = 0; }
      openModal(panUI);
      return;
    }
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
  if ((state.up.sluice || 0) >= 2 && sluice.kind !== 'highbanker') {
    if (sluice.placed) hint('hbswap', 'Lift your sluice out (right-click with tool 5) and you can set up the highbanker instead.', 120);
    else if (sluice.setKind('highbanker')) {
      document.querySelector('.slot[data-tool="sluice"]').innerHTML = '<kbd>5</kbd>Highbanker';
      view.setTool(viewTool());
    }
  }
  if (state.tool === 'sluice' && ownsSluice()) {
    if (sluice.placed) {
      const dist = Math.hypot(player.pos.x - sluice.spot.x, player.pos.z - sluice.spot.z);
      if (dist < 2.8) {
        const st = sluice.status();
        const n = state.bucket.length;
        const head = sluice.kind === 'highbanker'
          ? `Highbanker · petrol ${state.fuel.toFixed(1)} L · `
          : `${st.speed.toFixed(2)} m/s, ${st.depth.toFixed(2)} m (${st.why}) · `;
        prompt = `${head}riffles ${Math.round(sluice.fill * 100)}% · `
          + (n ? `hold click to shovel in your bucket (${n})` : 'or dig right beside it with the shovel (2)') + (sluice.cons ? ' · E: clean up' : '')
          + ` · right-click: ${sluice.kind === 'highbanker' ? 'pack up' : 'lift out'}`;
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
      const hb = sluice.kind === 'highbanker';
      if (spot) {
        sluice.showGhost(spot);
        prompt = hb
          ? (spot.ok === 'bad' ? `Can't set up here: ${spot.why}.` : `Bank, ${spot.why}. Click to set up the highbanker here.`)
          : `${spot.speed.toFixed(2)} m/s, ${spot.depth.toFixed(2)} m deep: ${spot.why}. Click to set the sluice here.`;
        if (clicked && !(hb && spot.ok === 'bad')) {
          sluice.place(spot);
          view.setTool(viewTool());
          hud.toast(hb ? 'Highbanker set up: pump at the water, hose to the spray bar. Shovel your wash into the hopper.' : spot.ok === 'good' ? 'Sluice set in a good run.' : `Sluice set, but it's ${spot.why}.`);
          sound.click();
        }
      } else prompt = sluice.kind === 'highbanker' ? 'Aim at the bank near the creek to set up the highbanker' : 'Aim at the creek to set the sluice';
    }
  }
  if (sluice.placed) {
    const dist = Math.hypot(player.pos.x - sluice.spot.x, player.pos.z - sluice.spot.z);
    if (sluice.status().depth > 0.05) sluiceNoise = Math.max(0, 1 - dist / 9);
  }
  sound.setSluice(playing && sluice.kind !== 'highbanker' ? sluiceNoise : 0);
  const pumpNear = sluice.placed && sluice.kind === 'highbanker' && sluice.running > 0
    ? Math.max(0, 1 - Math.hypot(player.pos.x - sluice.pump.position.x, player.pos.z - sluice.pump.position.z) / 30) : 0;
  sound.setPump?.(playing ? pumpNear : 0);
  view.setTool(viewTool());
  clicked = false;

  hud.progress(state.tool === 'pan' ? panProgress : workProgress);

  const near = nearestPickup();
  if (campBuildings.near(player.pos, state.camp)) prompt = 'E: camp facilities · supplies, stonework & collection';
  else if (kelpie.near(player.pos)) prompt = 'E: pat your kelpie';
  else if (campStation.near(player.pos)) prompt = 'E: wash bench · practise, recover tailings & build camp';
  else if (near?.target) prompt = `E: pick up ${near.target.kind === 'gold' ? 'the gold' : 'it'}`;
  else if (near?.find) prompt = `E: pick up the ${near.find.gem.type === 'agate' ? 'agate' : near.find.gem.type === 'thunderegg' ? 'thunderegg' : 'glinting stone'}`;
  else if (nearSluice() && sluice.cons && state.tool !== 'sluice') prompt = 'E: clean up the sluice';
  else if (sluice.stranded && Math.hypot(player.pos.x - sluice.stranded.x, player.pos.z - sluice.stranded.z) < 2.6) prompt = 'E: pick up your sluice';
  else if (oversize.near(player.pos)) { const pl = oversize.near(player.pos); prompt = `Classifier oversize (${pl.loads} load${pl.loads === 1 ? '' : 's'}) · E: pick through it`; }
  else if (ute.near(player.pos)) prompt = 'E: hop in the ute';
  else if (cabinet.near(player.pos)) prompt = 'Your collection cabinet · E to look through it';
  else if (stall.near(player.pos)) prompt = daynight.hour >= OPENS && daynight.hour < CLOSES
    ? (state.show?.day === state.day && state.show.stage === 'done' ? 'Gem & Mineral Show · E: see how you went' : 'Gem & Mineral Show · E: talk to the steward')
    : 'Gem & Mineral Show (closed)';
  else if (mine.nearCollar(player.pos)) prompt = 'The Lucky Strike shaft · E: climb down the ladder';
  else if (works.nearMill(player.pos)) prompt = works.mill.out.length ? `Hammer mill · E: shovel out the crushed ore (${works.mill.out.length})` : works.milling ? `Hammer mill crushing... (${works.mill.queue.length} to go)` : state.ore.length ? `Hammer mill · E: feed it your ore (${state.ore.length})` : 'Hammer mill';
  else if (works.nearDolly(player.pos)) prompt = state.ore.length ? `Dolly pot · E: crush your ore (${state.ore.length} lump${state.ore.length === 1 ? '' : 's'})` : 'Dolly pot: for crushing reef ore';
  else if (works.nearFire(player.pos) && (works.roast || state.ore.some((l) => !l.roasted))) prompt = works.roast ? (works.roast.left > 0 ? `Ore roasting on the fire... ${Math.ceil(works.roast.left)} s` : 'E: take the roasted ore off the fire') : `E: put your raw ore on the fire to roast (${state.ore.filter((l) => !l.roasted).length})`;
  else if (nearTent()) prompt = `E: your ${shelterInfo(state.camp).short.toLowerCase()} · ${daynight.isNight ? 'sleep or improve camp' : 'improve camp'}`;
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
    if (photo.active) { photo.look(dx, dy); return; }
    if (driving) { ute.look(dx, dy); return; }
    player.yaw -= dx * 0.0022;
    player.pitch = THREE.MathUtils.clamp(player.pitch - dy * 0.0022, -1.5, 1.45);
    player.lookDX += dx;
    player.lookDY += dy;
  },
  actions: {
    interact: () => { if (!playing) return; if (kneel) { const c = excav.pickCrystal(camera.position, camDir); if (c) extract(c); } else interact(); },
    kneel: () => { if (!playing || driving) return; if (kneel) standUp(); else kneelDown(); },
    flip: () => {
      if (!playing) return;
      if (state.tool === 'detector') { touchPin = !touchPin; hud.toast(touchPin ? 'Pinpointing: the coil goes where you look. Tap Flip again to sweep.' : 'Back to sweeping.'); return; }
      rightClick();
    },
    lamp: () => toggleHeadlamp(),
    photo: () => enterPhoto(),
    photoSnap: () => photo.snap(),
    photoUp: () => { photo.pos.y += 0.6; },
    photoDown: () => { photo.pos.y -= 0.6; },
    photoZoomIn: () => photo.zoom(-1),
    photoZoomOut: () => photo.zoom(1),
    photoFilter: () => photo.key('KeyF'),
    photoExit: () => exitPhoto(),
    inventory: () => openModal(inventory),
    map: () => openModal(map),
    notes: () => openModal(notes),
    save: () => saveNow(),
    pause: () => pause(),
  },
}) : null;

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
  mine: 'The old Lucky Strike gold mine. There is a ladder down the shaft: take your headlamp (L) and rock hammer (6).',
  opal: 'The old opal workings. Kneel at a mullock heap and noodle for chips the old-timers missed. Stay clear of the shafts!',
  fossil: 'A ledge of grey shale. Split the slabs with the rock hammer (6): some hold fossil leaves, insects, even fish.',
};
let discoverTick = 0;
function checkDiscoveries(dt) {
  discoverTick -= dt;
  if (discoverTick > 0) return;
  discoverTick = 1;
  if (!mine.inside && boulders.list.some((b) => !b.split && Math.hypot(b.x - player.pos.x, b.z - player.pos.z) < 5)) {
    hint('boulders', 'Loose boulders here. Some hide a vug: tap round them with the rock hammer (6) and listen for a dull, hollow spot.', 3600);
  }
  for (const [key, src] of Object.entries(terrain.sources)) {
    if (state.discovered[key]) continue;
    if (Math.hypot(player.pos.x - src.x, player.pos.z - src.z) < (key === 'mine' ? 12 : key === 'fossil' ? 14 : key === 'granite' || key === 'opal' ? 24 : 26)) {
      state.discovered[key] = true;
      if (key === 'reef') setTimeout(checkLead, 100);
      hud.toast(`${DISCOVERY[key]} (Marked on your map, M.)`, 'gold');
      sound.click();
      writeSave();
    }
  }
}

let lastHour = null;
function duskHints() {
  const h = daynight.hour;
  if (lastHour === null) lastHour = h; // not on the first frame after loading
  if (lastHour < 18.3 && h >= 18.3) {
    hud.toast(headlamp ? 'Sun going down.' : 'Getting dark. Press L for your headlamp.');
    if (ownsUv()) hud.toast('Good night for the UV torch (7) up around the reef.');
  }
  if (lastHour < 5.8 && h >= 5.8) { newDay(); hud.toast('Sun\'s coming up.'); }
  lastHour = h;
}

// ---------- photo mode ----------

// Where a photo was taken, for the date stamp.
function placeName() {
  if (mine.inside || mine.climb) return 'Lucky Strike mine';
  const p = camera.position;
  if (Math.hypot(p.x - terrain.camp.x, p.z - terrain.camp.z) < 14) return 'Camp';
  let best = null, bd = 32;
  for (const [key, src] of Object.entries(terrain.sources)) {
    const d = Math.hypot(p.x - src.x, p.z - src.z);
    if (d < bd && state.discovered[key] && PLACE_NAMES[key]) { bd = d; best = PLACE_NAMES[key].label; }
  }
  return best || (Math.abs(p.x - creek.cx(p.z)) < creek.halfWidth(p.z) + 1.5 ? 'The creek' : 'The claim');
}

const photo = new PhotoMode({
  camera, renderer, terrain, sound,
  caption: () => `${placeName()} · DAY ${state.day + 1} · ${daynight.clockText().toUpperCase()}`,
  onSnap: () => { state.photos++; award('photo'); },
});
let photoHadControls = false;

function enterPhoto() {
  if (!playing || photo.active) return;
  mouseHeld = false;
  keys.clear();
  const ctl = document.getElementById('controls');
  photoHadControls = !ctl.classList.contains('hidden');
  ctl.classList.add('hidden');
  photo.enter({ still: mine.inside || !!mine.climb });
  hud.show(false);
  touch?.root.classList.add('photo');
  touch?.root.classList.toggle('still', photo.still);
  sound.click();
}

function exitPhoto() {
  if (!photo.active) return;
  photo.exit();
  keys.clear();
  hud.show(playing || modalOpen());
  if (photoHadControls) toggleControls(true);
  touch?.root.classList.remove('photo', 'still');
}

// ---------- loop ----------

const clock = new THREE.Clock();
let motion = { moving: false, running: false, depth: 0 };

function frame() {
  const raw = clock.getDelta();
  const dt = Math.min(raw, 0.05);
  countFps(raw);
  // The pan is a close-up workstation. Keep the last world frame behind it
  // rather than rendering the whole claim on every mobile finger stroke.
  if (playing || panUI.isOpen || lapidaryUI.isOpen) stepFacilities(state.camp, dt);
  if (panUI.isOpen || campUI.isOpen || lapidaryUI.isOpen) {
    if (lapidaryUI.isOpen) lapidaryUI.update(dt);
    if (panUI.isOpen) panUI.update(dt);
    sound.setDetector(false, 0, null);
    sound.setSluice(0);
    sound.setPump?.(0);
    sound.setAmbience(dt, 0.25, panUI.isOpen && !!panUI.session && panUI.session.lastAction !== 'rest' && !panUI.session.finished);
    requestAnimationFrame(frame);
    return;
  }
  if (touch && playing) {
    mouseHeld = touch.use;
    if (touch.consumeUsePress()) clicked = true;
  }
  elapsed += dt;
  const detWas = detShown;
  detShown = false;
  if (photo.active) {
    photo.update(dt, keys, touch);
    motion.moving = false;
  } else if (mine.climb) {
    motion = updateClimb(dt);
  } else if (mine.inside) {
    if (playing) motion = updateUnderground(dt);
    else camera.rotation.set(player.pitch, player.yaw, 0);
    updateMineTools(dt);
  } else if (driving) {
    motion = updateDriving(dt);
  } else if (kneel) {
    ute.update(dt, 0, 0, false);
    motion = updateKneel(dt);
    updateKneelTools(dt);
  } else {
    ute.update(dt, 0, 0, false);
    if (playing) motion = updatePlayer(dt);
    else { motion.moving = false; camera.rotation.set(player.pitch, player.yaw, 0); }
    updateTools(dt, motion);
  }
  if (photo.active) detShown = detWas;
  else if (!detShown) worldDet.update(dt, { visible: false });
  view.externalDetector = detShown;
  updateHud();
  daynight.update((playing || kneel) && !photo.active ? dt : 0, camera.position);
  weather.daylight = daynight.daylight;
  const night = 1 - daynight.daylight;
  world.update(dt, night);
  campShelter.update(night);
  campBuildings.update(dt, state, player.pos, night);
  kelpie.update(dt, state, player.pos, driving || mine.inside || !!mine.climb);
  targets.update(dt);
  const uvOn = !kneel && state.tool === 'uv' && ownsUv() && playing;
  camera.getWorldDirection(uvDir);
  finds.update(dt, camera.position, { on: uvOn, origin: camera.position, dir: uvDir, dark: night });
  // In the close walls of the drive the lamp needs far less punch than out in the bush.
  headlampLight.intensity = headlamp ? 40 * (1 - mine.under(camera.position) * 0.8) : 0;
  // Opal only shows its colour in good light: daylight, your headlamp, or the inventory lamp.
  opalLight.value = inventory.isOpen ? 1 : Math.max(daynight.daylight, headlamp ? 0.7 : 0.05);
  uvLight.intensity = uvOn ? 7 : 0;
  const under = mine.under(camera.position);
  view.setLight(daynight.daylight * (1 - under), headlamp, uvOn);
  weather.update(dt, camera.position);
  bedload.update(dt, player.pos, sound);
  if (under > 0) {
    // Underground: the daylight doesn't reach. Just your lamp (and a glimmer down the shaft).
    sun.intensity *= 1 - under;
    hemi.intensity *= 1 - under * 0.985;
    scene.environmentIntensity *= 1 - under * 0.98;
  }
  mine.update(dt, { uvOn, uvOrigin: camera.position, uvDir, sound });
  works.update(dt, { sound, time: elapsed });
  works.showMill((state.up.crusher || 0) > 0);
  water.uniforms.sunDir.value.copy(daynight.lightDir);
  water.uniforms.sunColor.value.copy(daynight.base.sunColor).multiplyScalar(daynight.daylight > 0.05 ? 1 : 0.35);
  checkDiscoveries(dt);
  checkMilestones(dt);
  const willy = devils.update(dt, { hour: daynight.hour, storm: weather.storm, player: player.pos, active: playing });
  if (willy === 'spawned') hint('willy', 'Willy-willy! A dust devil spinning up out on the flat. Hang onto your hat.', 900);
  if (willy === 'hit') hud.toast(driving ? 'A willy-willy goes right over the ute. Dust everywhere.' : 'Strewth! A willy-willy went right over ya. Eyes full of dust.');
  wildlife.update(dt, {
    player: { x: player.pos.x, z: player.pos.z, speed: Math.hypot(player.vel.x, player.vel.z) },
    cam: camera.position, daylight: daynight.daylight, hour: daynight.hour, playing,
  });
  if (playing && !driving && daynight.daylight > 0.8 && daynight.hour > 9.5 && daynight.hour < 16.5) {
    if (wildlife.flyVisit > 0) hint('flies', "Bush flies. Give 'em the Aussie salute.", 900);
  }
  duskHints();
  water.update(dt, elapsed, player.pos, weather.flood);
  sluice.update(dt);

  updateReflections(dt);
  excav.updateLOD?.(camera.position);
  boulders.update(dt, camera.position);
  cabinet.update(dt, player.pos, [...state.nuggets, ...state.gems].filter((i) => i.keep));
  stall.update(dt);
  sky.position.copy(camera.position);
  if (sky.material.uniforms.time) sky.material.uniforms.time.value = elapsed;
  sun.position.copy(player.pos).addScaledVector(daynight.lightDir, 80);
  sun.target.position.copy(player.pos);

  renderer.clear();
  renderer.render(scene, camera);
  if (photo.active) photo.capture(() => { renderer.clear(); renderer.render(scene, camera); });
  renderer.clearDepth();
  if (!driving && !photo.active) renderer.render(view.scene, view.camera);
  requestAnimationFrame(frame);
}

restoreWorld();
if (sluice.kind === 'highbanker') document.querySelector('.slot[data-tool="sluice"]').innerHTML = '<kbd>5</kbd>Highbanker';
applyGraphics();
view.setTool(viewTool());
hud.tool(state.tool);

// Save on a timer while you play, when you pause, and when the tab is hidden or closed.
setInterval(() => { if (playing || panUI.isOpen || campUI.isOpen || lapidaryUI.isOpen) writeSave(); }, 60000);
document.addEventListener('visibilitychange', () => { if (document.hidden) writeSave(); });
window.addEventListener('beforeunload', () => writeSave());

// Place the camera before the first frame so the title screen shows the claim.
camera.position.set(player.pos.x, player.pos.y + EYE, player.pos.z);
fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
hud.stats(state, gear(state, 'bucket').cap);
frame();

// Offline support for the published game (home-screen app with no signal).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* offline mode just won't be available */ });
}

// Handy for poking at the game from the console.
window.fossick = {
  regionUI, campUI, campStation, campShelter, campBuildings, kelpie, lapidaryUI, sleepAtCamp, panUI,
  inventory, daynight, map, wildlife, worldDet, oversize, bedload, photo, enterPhoto, exitPhoto, gemshow, stall, fossils, devils, boulders, cabinet, mine, works, award, newDay, shop, scene, renderer, ute, enterUte, exitUte, weather, sluice, jig, jigZone, field, excav, kneelDown, standUp, setKneelTool, view, flood: (fast = true) => weather.trigger(fast),
  state, terrain, creek, deposits, targets, finds, player, keys, selectTool, interact, GEMS,
  setMouse: (v) => { mouseHeld = v; if (v) clicked = true; },
};
