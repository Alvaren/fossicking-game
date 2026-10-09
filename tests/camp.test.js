import test from 'node:test';
import assert from 'node:assert/strict';
import { createPan, stepPan, automaticStroke, panResult, goldLeft } from '../src/panning.js';
import { restoreCamp, startPractice, collectPractice, repanPractice, tailingsPan, techniqueReport, buyCampUpgrade, storeSample, withdrawSample, collectFieldPan, takeFieldTailings } from '../src/camp.js';
const sum = x => Object.values(x).reduce((a,b)=>a+b,0);
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-10, `${a} != ${b}`);
function finish(s) { for(let i=0;i<30000&&!s.finished;i++) stepPan(s,automaticStroke(s),1/60); assert.ok(s.finished); return s; }
function rough(s, seconds=4) { for(let i=0;i<seconds*60;i++)stepPan(s,{action:'wash',speed:1.5,tilt:42,submerged:false,lip:'smooth'},1/60); return s; }
const state = () => ({seed:12345,camp:restoreCamp(),cash:500,gold:0,up:{},bucket:[]});

test('old saves receive independent camp defaults', () => {
  const a=restoreCamp(), b=restoreCamp(); a.samples.push({gold:1});
  assert.equal(b.samples.length,0); assert.equal(a.practice,null);
  const saved=JSON.parse(JSON.stringify(a)); assert.deepEqual(restoreCamp(saved),a);
});
test('identical practice parcels have the same assay and mass in all borrowed pans', () => {
  for(const id of ['standard','deep','dual']) {
    const c=restoreCamp(); const p=startPractice(c,{panId:id,recipeId:'clay',volume:0.5});
    close(goldLeft(p.panSession),0.05); close(sum(p.panSession.bed),0.5); close(p.panSession.bed.clay,0.15);
    assert.equal(startPractice(c),null);
  }
});
test('practice, repeated tailings passes and reload conserve borrowed gold without paying the player', () => {
  const s=state(); startPractice(s.camp,{recipeId:'clay'});
  for(let pass=0;pass<4;pass++) {
    const pan=s.camp.practice.panSession; finish(rough(pan,pass===0?4:0));
    collectPractice(s.camp,pan); assert.equal(collectPractice(s.camp,pan),null);
    const p=s.camp.practice; close(p.recovered+goldLeft(p.tailings)+p.tailings.picker,p.total);
    assert.equal(s.gold,0); assert.equal(s.cash,500);
    s.camp=restoreCamp(JSON.parse(JSON.stringify(s.camp)));
    repanPractice(s.camp,'dual'); assert.equal(repanPractice(s.camp,'standard'),null);
  }
  assert.deepEqual(s.camp.history.map(r=>r.pass),[1,2,3,4]);
});
test('tailings retain real fine/coarse gold, bound clay, gems and pickers', () => {
  const pan=createPan({contents:{gold:0.05,picker:0.3,finds:[{item:{id:'gem'},survival:0.95}]},sample:{clay:0.3,blackSand:5},volume:1});
  finish(rough(pan,12)); const result=panResult(pan), tail=tailingsPan(pan);
  close(goldLeft(tail),sum(pan.lostGold)); close(tail.gold.fine,pan.lostGold.fine);
  close(sum(pan.bed)+sum(tail.bed),pan.initialBulk);
  close(result.gold+result.picker+goldLeft(tail)+tail.picker,0.35);
  assert.equal(result.finds.length+tail.finds.length,1);
  for(const k of ['fine','coarse']) close(tail.bound[k],pan.boundOut[k]);
  assert.equal(tail.sample.repan,true);
});
test('technique feedback records observable mistakes and never labels barren ground a failed recovery', () => {
  const pan=finish(rough(createPan({contents:{gold:0.05,picker:0,finds:[]},sample:{clay:0.3},volume:1})));
  const report=techniqueReport(pan);
  assert.equal(report.tips.length,4); assert.ok(report.fineLost>report.coarseLost);
  const barren=finish(createPan({})); assert.equal(techniqueReport(barren).recovery,null);
});
test('camp projects spend money once, enforce prerequisites and never add retention bonuses', () => {
  const s=state(); assert.equal(buyCampUpgrade(s,'kit'),false);
  assert.equal(buyCampUpgrade(s,'tub'),true); assert.equal(buyCampUpgrade(s,'tub'),false);
  assert.equal(buyCampUpgrade(s,'kit'),true); assert.equal(buyCampUpgrade(s,'rack'),true);
  assert.equal(s.cash,65); assert.equal(s.gold,0); assert.deepEqual(s.up,{});
  assert.equal(buyCampUpgrade(s,'unknown'),false);
  const poor=state(); poor.cash=74; assert.equal(buyCampUpgrade(poor,'tub'),false);
});
test('sample rack moves whole partial parcels and observes both capacities', () => {
  const s=state(); const parcel={panVolume:0.32,panContents:{gold:0.02,finds:[{item:{id:42},at:0.1}]},x:44,z:3};
  s.bucket.push(parcel); assert.equal(storeSample(s),false); buyCampUpgrade(s,'rack');
  assert.equal(storeSample(s),true); assert.equal(s.camp.samples[0],parcel); assert.equal(parcel.sourceClaim,12345); assert.equal(s.bucket.length,0);
  assert.equal(withdrawSample(s,0,0),false); assert.equal(withdrawSample(s,0,6),true); assert.equal(s.bucket[0],parcel);
  for(let i=0;i<8;i++){s.bucket.push({gold:i});storeSample(s);}
  assert.equal(storeSample(s),false); assert.equal(s.camp.samples.length,8);
  assert.equal(withdrawSample(s,-1,6),false);
});
test('field tailings are caught only when equipped and consumed once without overwriting a live pan', () => {
  const s=state(); buyCampUpgrade(s,'tub');
  const pan=finish(rough(createPan({contents:{gold:0.04,picker:0,finds:[]}})));
  assert.equal(collectFieldPan(s,pan),true); assert.equal(s.camp.tailings.length,0);
  const captured=finish(rough(createPan({contents:{gold:0.04,picker:0,finds:[]}})));
  captured.captureTailings=true; collectFieldPan(s,captured); assert.equal(collectFieldPan(s,captured),false);
  assert.equal(s.camp.tailings.length,1); const id=s.camp.tailings[0].id;
  s.panSession={active:true}; assert.equal(takeFieldTailings(s,id),false);
  s.panSession=null; assert.equal(takeFieldTailings(s,id,'dual'),true);
  assert.equal(s.panSession.panId,'standard'); assert.equal(takeFieldTailings(s,id),false);
  assert.equal(s.camp.tailings.length,0); close(goldLeft(s.panSession),sum(captured.lostGold));
});


test('Realistic practice badges survive the rolling comparison history', () => {
  const c=restoreCamp(); startPractice(c,{recipeId:'heavies',panId:'dual',volume:0.25});
  collectPractice(c,finish(c.practice.panSession)); assert.equal(c.mastery.heavies,true);
  for(let i=0;i<40;i++) {startPractice(c,{recipeId:'gravel',difficulty:'easy'});collectPractice(c,finish(c.practice.panSession));}
  assert.equal(c.history.length,36); assert.equal(c.mastery.heavies,true); assert.equal(c.mastery.gravel,undefined);
  assert.equal(restoreCamp(JSON.parse(JSON.stringify(c))).mastery.heavies,true);
});
