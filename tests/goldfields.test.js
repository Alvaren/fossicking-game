import test from 'node:test';
import assert from 'node:assert/strict';
import { Terrain } from '../src/terrain.js';
import { Deposits } from '../src/deposits.js';
import { goldfieldPatches, goldfieldWeight } from '../src/goldfields.js';
import { CLAIM_PROFILES, readClaim, saveClaim } from '../src/claimregions.js';
import { travelTo } from '../src/regions.js';
import { topographyPixels } from '../src/topography.js';

class Ground extends Terrain { buildMesh() { return null; } }
const ground = new Ground(12345 ^ CLAIM_PROFILES['wa-goldfields'].salt, CLAIM_PROFILES['wa-goldfields']);

test('WA patches are deterministic, localized and separated by genuinely barren ground', () => {
  const t = ground, patches = t.goldPatches;
  assert.deepEqual(goldfieldPatches(12345 ^ t.profile.salt, t.sources.reef, t.creek), patches);
  assert.notDeepEqual(goldfieldPatches(42, t.sources.reef, t.creek), patches);
  for (const p of patches) assert.ok(goldfieldWeight(patches, p.x, p.z) > .5);
  let barren = 0, count = 0;
  for (let x = -100; x <= 100; x += 5) for (let z = -100; z <= 100; z += 5) {
    const weight = goldfieldWeight(patches, x, z);
    assert.ok(weight >= 0 && weight <= 1);
    if (weight === 0) barren++;
    count++;
  }
  assert.ok(barren / count > .85 && barren / count < .99);
  assert.equal(t.workings.length, 7);
  assert.deepEqual(Object.keys(t.sources), ['reef']);
});

test('dry WA drainage never supplies water, flow or blue map water, including a high level', () => {
  const t = ground, c = t.creek;
  for (const level of [0, 2]) {
    c.level = level;
    for (let z = -100; z <= 100; z += 10) {
      const x = c.cx(z);
      assert.ok(t.waterDepth(x, z) < 0);
      assert.ok(c.surfaceY(z) < t.geologyAt(x, z).bedrock - 10);
      assert.deepEqual(c.velocity(x, z, {x:9,z:9,speed:9}), {x:0,z:0,speed:0});
    }
  }
  c.level = 0;
  const pixels = topographyPixels({width:80,height:80,bounds:{x0:-100,x1:100,z0:-100,z1:100},heightAt:(x,z)=>t.getOrigHeight(x,z),waterAt:()=>null});
  for (let i = 0; i < pixels.length; i += 4) assert.ok(pixels[i] >= pixels[i+2], 'Dry topography has no blue water');
  assert.ok(new Set(pixels).size > 80, 'Hillshade and contours remain visible');
});

test('WA shallow wash has patch gold and heavies, no unrelated alluvial gemstones', () => {
  const t = ground, deposits = new Deposits(t);
  for (const p of t.goldPatches) {
    const g = t.geologyAt(p.x, p.z), s = deposits.sample(p.x, p.z, g.bedrock + .03, true);
    assert.ok(s.gold > 0 && s.blackSand > 0);
    assert.ok(g.orig - g.bedrock < .7);
    for (const k of ['sapphire','zircon','spinel','garnet','topaz','agate']) assert.equal(s[k], 0);
  }
  for (const [x,z] of [[-100,-100],[100,100]]) {
    const g = t.geologyAt(x,z);
    assert.equal(deposits.sample(x,z,g.bedrock+.03,true).gold, 0);
    assert.equal(deposits.nuggetWeight(x,z), 0);
  }
});

test('WA travel costs zero and preserves independent camps, digs, ute and unfinished pans', () => {
  const home = {seed:12345,cash:700,gold:.2,difficulty:'realistic',up:{pan:2},camp:{shelter:'shed'},panSession:{id:'home'},digs:{idx:[1]},ute:{x:2,z:3,h:1}};
  let root = travelTo(home, 'wa-goldfields'), wa = readClaim(root);
  assert.equal(wa.cash,700);assert.equal(wa.difficulty,'realistic');assert.equal(wa.camp.shelter,'swag');assert.equal(wa.panSession,undefined);
  Object.assign(wa,{camp:{shelter:'tent'},cash:450,gold:.23,panSession:{id:'wa'},digs:{idx:[3]},ute:{x:9,z:10,h:2},collected:[7]});
  root = saveClaim(root,wa);
  const saved = structuredClone(root.claims['wa-goldfields']);
  root = travelTo(root,'golden-triangle');
  root = saveClaim(root,{...readClaim(root),bucket:[{gold:.001}]});
  root = travelTo(root,'new-england');
  assert.deepEqual(root.camp,home.camp);assert.deepEqual(root.digs,home.digs);assert.deepEqual(root.ute,home.ute);assert.equal(root.panSession.id,'home');
  const again = readClaim(travelTo(JSON.parse(JSON.stringify(root)),'wa-goldfields'));
  for (const key of ['camp','digs','ute','panSession','collected']) assert.deepEqual(again[key],saved[key]);
  assert.equal(again.gold,.23);assert.equal(again.cash,450);
});
