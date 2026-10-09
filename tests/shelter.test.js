import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { restoreCamp, storeSample, withdrawSample } from '../src/camp.js';
import { SHELTERS, shelterInfo, sampleCapacity, buyShelter, canSleep } from '../src/shelter.js';
import { CampShelter } from '../src/campshelter.js';
const state = () => ({ seed: 1, camp: restoreCamp(), cash: 2600, bucket: [], gold: 0 });

test('new camps start in a swag while legacy saves retain their tent and explicit stages survive', () => {
  assert.equal(restoreCamp().shelter,'swag');
  assert.equal(restoreCamp(undefined,{legacyShelter:true}).shelter,'tent');
  assert.equal(restoreCamp({built:{rack:true},samples:[{gold:1}]},{legacyShelter:true}).shelter,'tent');
  for(const s of SHELTERS)assert.equal(restoreCamp({shelter:s.id},{legacyShelter:true}).shelter,s.id);
  assert.equal(restoreCamp({shelter:'unknown'}).shelter,'swag');
});
test('shelters must be bought in order with exact one-time costs and no gold or skill bonus', () => {
  const s=state(); assert.equal(buyShelter(s,'shed'),false);assert.equal(s.cash,2600);
  s.cash=249;assert.equal(buyShelter(s,'tent'),false);s.cash=2600;
  assert.equal(buyShelter(s,'tent'),true);assert.equal(s.cash,2350);
  assert.equal(buyShelter(s,'tent'),false);assert.equal(buyShelter(s,'shed'),false);assert.equal(buyShelter(s,'caravan'),true);assert.equal(buyShelter(s,'shed'),true);
  assert.equal(s.cash,450);assert.equal(shelterInfo(s.camp).id,'shed');
  assert.equal(buyShelter(s,'shed'),false);assert.equal(buyShelter(s,'swag'),false);assert.equal(s.gold,0);
  assert.equal(restoreCamp(JSON.parse(JSON.stringify(s.camp))).shelter,'shed');
});
test('shelter storage grows 8 to 12 to 16 to 20 while preserving every sample and requiring the rack', () => {
  const s=state(); assert.equal(sampleCapacity(s.camp),0); s.bucket.push({id:0});assert.equal(storeSample(s),false);s.bucket=[];
  s.camp.built.rack=true;
  for(const stage of SHELTERS) {
    if(stage.id!=='swag')buyShelter(s,stage.id);
    while(s.camp.samples.length<stage.sampleSlots){s.bucket.push({id:s.camp.samples.length,panContents:{gold:.01,finds:[]}});assert.equal(storeSample(s),true);}
    s.bucket.push({id:99});assert.equal(storeSample(s),false);s.bucket=[];
    assert.equal(s.camp.samples.length,stage.sampleSlots);
  }
  assert.deepEqual(s.camp.samples.map(p=>p.id),Array.from({length:20},(_,i)=>i));
  assert.equal(withdrawSample(s,19,6),true);assert.equal(s.bucket[0].id,19);
});
test('sleep window accepts evenings and post-midnight but rejects daytime and invalid hours', () => {
  for(const hour of [19,23.9,0,2,4.99])assert.equal(canSleep(hour),true);
  for(const hour of [-1,5,6,18.99,24,NaN])assert.equal(canSleep(hour),false);
});
test('geometry, collisions and lighting switch together, including late tent-model loading', () => {
  for(const flip of [-1,1]) {
    const scene=new THREE.Scene(), camp=restoreCamp(), shared={x:99,z:99,r:1}, colliders=[shared];
    const terrain={camp:{x:0,y:0,z:0},creek:{cx:()=>flip<0?20:-20}};
    const model=new CampShelter(scene,terrain,camp,colliders);
    for(const stage of SHELTERS) {
      camp.shelter=stage.id;model.sync(camp);model.update(1);
      assert.deepEqual(Object.entries(model.stages).filter(([,g])=>g.visible).map(([id])=>id),[stage.id]);
      assert.ok(colliders.includes(shared));const count=colliders.length;model.sync(camp);assert.equal(colliders.length,count);
      assert.equal(model.light.intensity>0,stage.id!=='swag');
      const bounds=new THREE.Box3().setFromObject(model.stages[stage.id]);assert.ok(Number.isFinite(bounds.max.x));
    }
    model.applyModel(new THREE.Group());assert.equal(model.stages.tent.visible,false);assert.equal(model.stages.shed.visible,true);
    // A person with radius .28 can pass through the front doorway at local Z=0.
    for(let x=-3.5;x<1.1;x+=.1) {
      const px=model.spot.x+x*flip,pz=model.spot.z;
      assert.ok(model.ownedColliders.every(c=>Math.hypot(px-c.x,pz-c.z)>c.r+.28),`blocked at ${x}`);
    }
    model.update(0);assert.equal(model.light.intensity,0);
    assert.ok(model.near(model.spot));assert.equal(model.near({x:1000,z:1000}),false);
  }
});
