import test from 'node:test';
import assert from 'node:assert/strict';
import { makeGem, GEMS } from '../src/minerals.js';
import { makeGeode, GEODE_CORES, makeGeodeMesh, makeThunderegg } from '../src/geodes.js';
import { cutStone, cuttable, cutFee } from '../src/cutting.js';
import { mulberry32 } from '../src/noise.js';
import { startLapidary, stepLapidary, collectLapidary } from '../src/lapidary.js';

const clone = value => JSON.parse(JSON.stringify(value));
test('ten agate varieties are obtainable without advancing extra assay randomness', () => {
  assert.equal(GEMS.agate.varieties.length, 10);
  const found = new Set();
  for (let seed = 0; seed < 500; seed++) {
    const a = mulberry32(seed), b = mulberry32(seed);
    const gem = makeGem('agate', a);
    b(); b(); b(); // existing variety, grade and weight draws
    assert.equal(a(), b());
    assert.ok(gem.grams > 0 && Number.isFinite(gem.value));
    found.add(gem.variety);
  }
  assert.equal(found.size, 10);
});
test('geode contents are seeded once and do not leak through the unopened label', () => {
  const found = new Set();
  for (let seed = 0; seed < 100; seed++) {
    const a = makeGeode(mulberry32(seed)), b = makeGeode(mulberry32(seed));
    assert.deepEqual(a, b);
    assert.equal(a.variety, undefined);
    assert.equal(a.label.includes(a.core), false);
    assert.equal(a.type, 'geode'); found.add(a.core);
  }
  assert.deepEqual([...found].sort(), Object.keys(GEODE_CORES).sort());
});
test('the existing cutter reveals the saved geode and preserves the paired specimen', () => {
  for (const core of Object.keys(GEODE_CORES)) {
    const rough = { ...makeGeode(mulberry32(78)), core, keep: true, uid: 'kept-geode' }, original = clone(rough);
    assert.equal(cuttable(rough), true); assert.equal(cutFee(rough), 15);
    const a = cutStone(rough, 91).item, b = cutStone(clone(rough), 91).item;
    assert.deepEqual(a, b); assert.deepEqual(rough, original);
    assert.equal(a.core, rough.core); assert.equal(a.seed, rough.seed); assert.equal(a.grams, rough.grams);
    assert.equal(a.keep, true); assert.equal(a.uid, rough.uid); assert.equal(a.cut, 'halves');
    assert.ok(a.label.includes(core)); assert.equal(cuttable(a), false);
    assert.ok(Number.isFinite(a.value) && a.value > 0);
  }
});
test('legacy thundereggs and agates still use their saved contents and palettes', () => {
  const egg = makeThunderegg(mulberry32(28));
  const cut = cutStone(clone(egg), 9).item;
  assert.equal(cut.type, 'thunderegg'); assert.equal(cut.core, egg.core);
  const agate = { type: 'agate', variety: 'moss', bands: [0x5a7a4a, 0xd8dcd0], grams: 60, grade: 'B', value: 11, label: 'moss agate, 60 g' };
  assert.deepEqual(cutStone(agate, 9).item.bands, agate.bands);
  assert.equal(cutStone(agate, 9).item.grams, agate.grams);
});
test('camp lapidary resumes the reserved geode and awards it exactly once', () => {
  const rough = makeGeode(mulberry32(101));
  let state = { seed: 99, difficulty: 'easy', gems: [rough], camp: { built: { lapidary: true, generator: true }, generatorOn: true, generatorFuel: 2, water: 80, cutsCompleted: 0 } };
  assert.equal(startLapidary(state, 0, cuttable, cutStone), true);
  assert.equal(state.gems.length, 0);
  assert.equal(startLapidary(state, 0, cuttable, cutStone), false);
  for (let i = 0; i < 150; i++) stepLapidary(state.camp, { working: true }, .05);
  state = clone(state);
  assert.equal(state.camp.lapidarySession.candidate.core, rough.core);
  for (let i = 0; i < 2000 && !state.camp.lapidarySession.finished; i++) stepLapidary(state.camp, { working: true }, .05);
  const result = collectLapidary(state);
  assert.equal(result.type, 'geode'); assert.equal(result.core, rough.core); assert.equal(result.cut, 'halves');
  assert.equal(state.gems.length, 1); assert.equal(collectLapidary(state), null);
});
test('opened geodes contain finite three-dimensional crystal linings within a mesh budget', () => {
  for (const core of Object.keys(GEODE_CORES)) {
    const rough = { ...makeGeode(mulberry32(12)), core, grade: 'A' };
    const closed = makeGeodeMesh(rough), open = makeGeodeMesh({ ...rough, cut: 'halves' });
    assert.equal(closed.isMesh, true); assert.equal(open.userData.hollow, true);
    assert.equal(open.children.length, 2);
    let points = 0, triangles = 0;
    open.traverse(o => {
      if (!o.isMesh) return;
      assert.ok(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));
      assert.ok(Array.from(o.geometry.attributes.normal.array).every(Number.isFinite));
      triangles += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
      if (o.isInstancedMesh) { points += o.count; assert.ok(Array.from(o.instanceMatrix.array).every(Number.isFinite)); }
    });
    assert.equal(points, 180); assert.ok(triangles < 12000);
  }
});
