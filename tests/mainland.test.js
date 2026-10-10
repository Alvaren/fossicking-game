import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {CLAIM_PROFILES, readClaim, saveClaim} from '../src/claimregions.js';
import {travelTo, TASMANIA, NORTHEAST} from '../src/regions.js';
import {Terrain} from '../src/terrain.js';
import {Deposits} from '../src/deposits.js';
const serialize = value => JSON.parse(JSON.stringify(value));
const home = () => ({seed:12345,cash:150,gold:.2,up:{classifier:1,pan:2},difficulty:'easy',gems:[{uid:'home'}],nuggets:[],camp:{shelter:'shed'},digs:{idx:'home',mm:'ground'},bucket:[{gold:.003}],panSession:{id:'home-pan'},player:{x:1,z:2}});

test('mainland travel preserves independent ground, camp and in-progress material, with one shared wallet',()=>{
  const h=home(),original=serialize(h);let root=travelTo(h,'golden-triangle');
  const gold=readClaim(root);assert.notEqual(gold.seed,h.seed);assert.equal(gold.camp.shelter,'swag');assert.equal(gold.panSession,undefined);
  assert.deepEqual(gold.up,h.up);assert.equal(gold.cash,150);
  Object.assign(gold,{cash:95,gold:.25,digs:{idx:'gold',mm:'worked'},bucket:[{gold:.01}],panSession:{id:'gold-pan'},player:{x:8,z:9},camp:{shelter:'tent'}});
  root=saveClaim(root,gold);const goldSeed=gold.seed;const goldWorld=serialize(root.claims['golden-triangle']);
  root=travelTo(serialize(root),'qld-gemfields');const qld=readClaim(root);
  assert.notEqual(qld.seed,goldSeed);assert.equal(qld.gold,.25);assert.equal(qld.cash,95);assert.equal(qld.panSession,undefined);
  Object.assign(qld,{cash:87,gems:[...qld.gems,{uid:'qld-sapphire'}],bucket:[{sapphire:1}],player:{x:-5,z:20}});
  root=saveClaim(root,qld);assert.deepEqual(root.claims['golden-triangle'],goldWorld);
  const back=readClaim(travelTo(serialize(root),'new-england'));
  for(const key of ['seed','digs','bucket','panSession','player','camp'])assert.deepEqual(back[key],h[key],key);
  assert.equal(back.cash,87);assert.equal(back.gold,.25);assert.equal(back.gems.length,2);
  const again=readClaim(travelTo(back,'golden-triangle'));
  assert.equal(again.seed,goldSeed);assert.equal(again.panSession.id,'gold-pan');assert.deepEqual(again.digs,gold.digs);assert.equal(again.gems.length,2);assert.equal(again.cash,87);
  assert.deepEqual(h,original,'Transactions must not mutate the caller snapshot');
});

test('Tasmanian banking and direct mainland travel credit finds once and preserve all unfinished work',()=>{
  let root=travelTo(home(),'golden-triangle'),gold=readClaim(root);gold.panSession={id:'gold-pan'};root=saveClaim(root,gold);
  root=travelTo(root,TASMANIA,['bucket']);root.expeditions[TASMANIA].gold=.01;root.expeditions[TASMANIA].siteUse.crack=2;
  root=travelTo(root,'qld-gemfields');assert.ok(Math.abs(readClaim(root).gold-.21)<1e-12);
  root=saveClaim(root,{...readClaim(root),bucket:[{sapphire:2}]});
  root=travelTo(root,NORTHEAST,['bucket']);root.expeditions[NORTHEAST].gems=[{type:'sapphire',uid:'tas',value:8,label:'sapphire'}];root.expeditions[NORTHEAST].sieveSession={id:'tas-sieve'};
  root=travelTo(root,'golden-triangle');assert.equal(readClaim(root).panSession.id,'gold-pan');assert.equal(root.gems.length,2);
  root=travelTo(root,TASMANIA,['bucket']);root=travelTo(root,'qld-gemfields');
  assert.ok(Math.abs(root.gold-.21)<1e-12);assert.equal(root.gems.length,2);assert.equal(root.cash,150);
  assert.equal(root.panSession.id,'home-pan');assert.equal(root.expeditions[NORTHEAST].sieveSession.id,'tas-sieve');assert.equal(root.expeditions[TASMANIA].siteUse.crack,2);
  assert.deepEqual(readClaim(root).bucket,[{sapphire:2}]);
});

test('pegging a new claim replaces only the current world and difficulty follows travel without moving ground',()=>{
  let root=travelTo(home(),'golden-triangle');root=saveClaim(root,{...readClaim(root),digs:{idx:'worked'},panSession:{id:'old'}});
  root=travelTo(root,'qld-gemfields');root=saveClaim(root,{...readClaim(root),digs:{idx:'qld'},difficulty:'realistic'});
  root=travelTo(root,'golden-triangle');const before=serialize(root);assert.equal(readClaim(root).difficulty,'realistic');
  root=saveClaim(root,{...readClaim(root),seed:98765,digs:undefined,panSession:undefined});root=serialize(root);
  assert.equal(root.seed,12345);assert.deepEqual(root.digs,home().digs);assert.deepEqual(root.claims['qld-gemfields'],before.claims['qld-gemfields']);
  assert.equal(readClaim(root).seed,98765);assert.equal(readClaim(root).panSession,undefined);assert.equal(readClaim(root).digs,undefined);
  assert.equal(travelTo(root,'lightning-ridge'),null);assert.equal(travelTo(root,'golden-triangle'),null);
});

// Geometry arrays without a renderer: generation/geology are the production methods.
class Ground extends Terrain {buildMesh(){return null;}}
const hash = array => createHash('sha256').update(new Uint8Array(array.buffer)).digest('hex');
test('New England terrain and buried layers match the pre-region generator byte for byte',()=>{
  const t=new Ground(12345,CLAIM_PROFILES['new-england']);
  // Captured from e5c35c8 before adding region parameters.
  assert.equal(hash(t.orig),'c67fbe653bcf9fa8b09e17452364fae023fa2a61a76d48062081d3acb68ed786');
  assert.equal(hash(t.bedrock),'6dea46bb4df7a3df0059fee8e36e23f13436b14d163abce9c064f3f78c3fbc8c');
  assert.equal(hash(t.topsoil),'c5afddccabbfba0e4bce5f092a7ed45f31f731af1538e526b44ae296142ba71a');
});

test('regional wash follows its source and basal concentration; unrelated minerals are absent',()=>{
  const tGold=new Ground(12345,CLAIM_PROFILES['golden-triangle']),tGem=new Ground(12345,CLAIM_PROFILES['qld-gemfields']);
  assert.deepEqual(Object.keys(tGold.sources),['reef']);assert.deepEqual(Object.keys(tGem.sources),['basalt']);
  for(const t of [tGold,tGem]){
    assert.equal(t.heaps.length,0);assert.equal(t.shafts.length,0);assert.equal(t.graniteFactor(0,0),0);
    const dep=new Deposits(t),src=Object.values(t.sources)[0],geo=t.geologyAt(src.ex,src.ez);
    const top=dep.sample(src.ex,src.ez,geo.orig-.03,true),base=dep.sample(src.ex,src.ez,geo.bedrock+.04,true);
    assert.ok(base.clay>0);assert.ok(base.blackSand>0);
    const mineral=t===tGold?'gold':'sapphire';assert.ok(base[mineral]>top[mineral]);assert.ok(base[mineral]>0);
    for(let z=-100;z<=100;z+=20){for(const x of [t.creek.cx(z),-70,70]){
      const g=t.geologyAt(x,z),s=dep.sample(x,z,g.bedrock+.03,true);
      for(const [key,mult] of Object.entries(t.profile.minerals))if(mult===0)assert.equal(s[key],0,key);
      assert.ok(Object.entries(s).every(([k,v])=>k==='layer'||Number.isFinite(v)));
    }}
  }
  assert.ok(tGem.creek.halfWidth(0)>tGold.creek.halfWidth(0));assert.notEqual(hash(tGold.orig),hash(tGem.orig));
  assert.equal(tGold.workings.length,7);assert.equal(tGem.workings.length,0);
});
