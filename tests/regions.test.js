import test from 'node:test';
import assert from 'node:assert/strict';
import { TASMANIA, depart, returnHome, saveExpedition, packWeight, PACK_LIMIT_KG, sampleCapacity, carriedWeight } from '../src/regions.js';
const home=()=>({seed:12345,cash:138,gold:.2,up:{pan:2},difficulty:'realistic',camp:{shelter:'shed',samples:[{gold:.2}],built:{tub:true}},digs:{idx:'preserved',mm:'preserved'},bucket:[{gold:.8}],panSession:{gold:{fine:.2}},player:{x:9,z:4},nuggets:[{grams:.3}],gems:[{id:'home-gem'}]});

test('old saves depart and round trip without changing the home claim, camp or pan',()=>{
  const h=home(),copy=structuredClone(h),away=depart(h,['bucket','camp']);
  assert.equal(away.activeRegion,TASMANIA);assert.deepEqual(h,copy);
  const e=away.expeditions[TASMANIA];e.siteUse.test=3;e.bucket.push({panVolume:.5,panContents:{gold:.002}});e.panSession={bed:{clay:.1},expeditionId:'saved-pan'};e.player={x:5,z:10};e.visited=['fern-bend'];e.campPitched=true;
  const saved=JSON.parse(JSON.stringify(saveExpedition(away,e))),back=returnHome(saved);
  for(const key of Object.keys(h))assert.deepEqual(back[key],h[key],key);
  assert.equal(back.activeRegion,'new-england');assert.equal(back.expeditions[TASMANIA].siteUse.test,3);
  assert.equal(back.expeditions[TASMANIA].campPitched,false);
  const again=depart(back,['bucket','camp']).expeditions[TASMANIA];
  assert.deepEqual(again.bucket,e.bucket);assert.deepEqual(again.panSession,e.panSession);assert.deepEqual(again.visited,e.visited);assert.equal(again.player,null);
});
test('return transfers a haul exactly once and does not mutate the previous snapshot',()=>{
  const away=depart(home(),[]),e=away.expeditions[TASMANIA];e.gold=.031;e.gems=[{id:'new'}];e.nuggets=[{grams:.002}];
  const back=returnHome(away);assert.equal(back.gold,.231);assert.equal(back.gems.length,2);assert.equal(back.log.goldTotal,.033);assert.equal(back.nuggets.length,2);assert.equal(e.gold,.031);
  assert.equal(returnHome(back),null);assert.equal(back.expeditions[TASMANIA].gold,0);assert.equal(back.expeditions[TASMANIA].totalRecovered,.033);
  const second=returnHome(depart(back,[]));assert.equal(second.gold,back.gold);assert.deepEqual(second.gems,back.gems);assert.deepEqual(second.nuggets,back.nuggets);
});
test('kit controls capacity and pack mass; taking smaller kit never discards stored wash',()=>{
  assert.ok(packWeight(['bucket','camp','classifier'])<=PACK_LIMIT_KG);assert.equal(packWeight(['bucket','bucket','ute']),5.2);
  const away=depart(home(),['bucket']),e=away.expeditions[TASMANIA];assert.equal(sampleCapacity(e),4);
  e.bucket=[{panVolume:1},{panVolume:.5}];e.panSession={bed:{gravel:.3,sand:.2}};assert.equal(carriedWeight(e),8.2);
  const back=returnHome(away);assert.equal(depart(back,[]),null);assert.equal(depart(away,['bucket']),null);
  assert.equal(sampleCapacity(depart(home(),[]).expeditions[TASMANIA]),1);
});

test('travel fee is explicitly zero now, while the transaction supports a later configured price',async()=>{
  const {TRAVEL_FEE,payTravelFee}=await import('../src/regions.js');
  assert.equal(TRAVEL_FEE,0);const h=home();assert.equal(payTravelFee(h).cash,h.cash);
  assert.equal(payTravelFee(h,50).cash,h.cash-50);assert.equal(h.cash,138);
  assert.equal(payTravelFee(h,139),null);assert.equal(payTravelFee(h,-1),null);
  const away=depart(h,[]);assert.equal(away.cash,h.cash);assert.equal(returnHome(away).cash,h.cash);
});
