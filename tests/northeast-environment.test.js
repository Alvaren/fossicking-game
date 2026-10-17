import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as profile from '../src/tasmania/northeast.js';
import {northeastComposition,clearNewScenery} from '../src/tasmania/northeast-composition.js';
const before=JSON.parse(readFileSync(new URL('../docs/audits/tasmania-ne/before/world.json',import.meta.url)));
test('existing northeast terrain, route and sampling records remain exactly unchanged',()=>{
  const m=new profile.Catchment(before.seed);assert.deepEqual(m.sites,before.profile.sites);assert.deepEqual(profile.ROUTE,before.profile.route);
  for(const p of before.heights)assert.equal(m.height(p.x,p.z),p.h);
});
test('new scenery is deterministic and leaves original paths, camp and all sampling edges clear',()=>{
  for(const seed of [12345,91872,303]) {
    const m=new profile.Catchment(seed),a=northeastComposition(m,profile,before.colliders),b=northeastComposition(m,profile,before.colliders);assert.deepEqual(a,b);assert.ok(a.stones.length>15);assert.ok(a.plants.length>1000);
    for(const s of a.stones){assert.ok(profile.nearestTrail(s.x,s.z).distance>s.r+1.7);assert.ok(m.sites.every(p=>Math.hypot(p.x-s.x,p.z-s.z)>s.r+2.4));assert.ok(Math.hypot(s.x-profile.CAMP.x,s.z-profile.CAMP.z)>s.r+5.5);}
  }
});
test('an old saved position is changed only when a new solid rock occupies it',()=>{
  const m=new profile.Catchment(before.seed),art=northeastComposition(m,profile,before.colliders),added=art.stones.map(s=>({x:s.x,z:s.z,r:s.r*.94})),colliders=[...before.colliders,...added];
  const free={...profile.TRAILHEAD,yaw:.4,pitch:-.1},copy={...free};assert.equal(clearNewScenery(free,m,profile,added,colliders),false);assert.deepEqual(free,copy);
  const old={x:added[0].x,z:added[0].z,yaw:.4,pitch:-.1};assert.equal(clearNewScenery(old,m,profile,added,colliders),true);assert.equal(old.yaw,.4);assert.equal(old.pitch,-.1);assert.ok(colliders.every(c=>Math.hypot(old.x-c.x,old.z-c.z)>c.r+.3));
});
