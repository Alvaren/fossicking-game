import test from 'node:test';
import assert from 'node:assert/strict';
import { Catchment, ROUTE, CAMP, TRAILHEAD, riverX, walkStep, takeSample, recordRecovery } from '../src/tasmania/model.js';
import { makeExpedition } from '../src/regions.js';
import { takePanLoad, automaticStroke, stepPan, panResult, materialFor } from '../src/panning.js';
const expedition=()=>makeExpedition({seed:12345,up:{},difficulty:'realistic'},['bucket','camp','classifier']);

test('catchment is deterministic and the entire foot route walks in both directions',()=>{
  for(const seed of [1,12345,468368,888888]){
    const a=new Catchment(seed),b=new Catchment(seed);assert.deepEqual(a.sites,b.sites);assert.deepEqual(a.snipingPockets,b.snipingPockets);
    assert.equal(new Set(a.sites.map(s=>s.id)).size,18);
    for(const reverse of [false,true]){
      const route=reverse?[...ROUTE].reverse():ROUTE,player={...route[0]};
      for(const target of route.slice(1)){
        for(let i=0;i<3500&&Math.hypot(player.x-target.x,player.z-target.z)>.12;i++){
          const dx=target.x-player.x,dz=target.z-player.z,d=Math.hypot(dx,dz),step=Math.min(.03,d);
          walkStep(a,player,dx/d*step,dz/d*step);
        }
        assert.ok(Math.hypot(player.x-target.x,player.z-target.z)<.13,`${seed} reverse ${reverse} stuck ${JSON.stringify(player)} to ${JSON.stringify(target)}`);
        assert.equal(a.height(target.x,target.z),b.height(target.x,target.z));
      }
    }
  }
});
test('all sampling pockets can be approached from the foot route without deep water or steep steps',()=>{
  const m=new Catchment(12345);
  for(const site of m.sites){
    // Follow the nearby bank from the closest route point to hand reach of a pocket.
    let closest=ROUTE.reduce((a,b)=>Math.hypot(a.x-site.x,a.z-site.z)<Math.hypot(b.x-site.x,b.z-site.z)?a:b);
    const p={...closest};
    for(let i=0;i<1000&&Math.hypot(p.x-site.x,p.z-site.z)>2;i++){const dx=site.x-p.x,dz=site.z-p.z,d=Math.hypot(dx,dz);walkStep(m,p,dx/d*.08,dz/d*.08);}
    assert.ok(Math.hypot(p.x-site.x,p.z-site.z)<2.4,`inaccessible ${site.id}: ${JSON.stringify(p)}`);
  }
});
test('deep water and impassable terrain block movement while a ford crosses',()=>{
  const m=new Catchment(12345);assert.ok(m.depth(riverX(-12),-12)>.72);assert.ok(m.depth(riverX(14),14)<.3);
  const p={x:riverX(-12),z:-12};assert.equal(walkStep(m,p,.1,0),false);
  const gate={...TRAILHEAD};assert.equal(walkStep(m,gate,.05,0,[{x:gate.x+.05,z:gate.z,r:.5}]),false);
  assert.ok(m.height(CAMP.x,CAMP.z)>m.height(riverX(CAMP.z),CAMP.z));
});
test('finite deterministic parcels preserve assays through reload and can be barren',()=>{
  const e=expedition(),m=new Catchment(e.seed);let barren=0,gold=0;
  for(const s of m.sites){
    for(let i=0;i<s.capacity;i++){
      const snapshot=JSON.parse(JSON.stringify(e)),p=takeSample(e,s),again=takeSample(snapshot,s);assert.deepEqual(p,again);assert.equal(p.panContents.gold,p.gold);barren+=p.gold===0;gold+=p.gold;e.bucket=[];
    }
    assert.equal(takeSample(e,s),null);
  }
  assert.ok(barren>0);assert.ok(gold>0);assert.equal(takeSample(e,m.snipingPockets[0]),null);
});
test('classifier changes pan material and recovery conserves assayed gold across split pans',()=>{
  const e=expedition(),m=new Catchment(e.seed),sample=takeSample(e,m.sites.find(s=>s.kind==='crevice'));
  assert.ok(materialFor(sample).gravel<materialFor({...sample,classified:false}).gravel);
  const initial=sample.gold;let recovered=0,lost=0;
  for(let n=1;e.bucket.length;n++){
    const session=takePanLoad(e.bucket,{fill:.5,difficulty:'realistic'},()=>{throw Error('Must not reroll');});
    for(let i=0;i<20000&&!session.finished;i++)stepPan(session,automaticStroke(session),1/60);
    assert.equal(session.finished,true);const result={...panResult(session),sessionId:'test:'+n};
    assert.equal(recordRecovery(e,session.sample,result),true);assert.equal(recordRecovery(e,session.sample,result),false);
    recovered+=result.gold;lost+=result.lost;
  }
  assert.ok(Math.abs(recovered+lost-initial)<1e-12);assert.equal(e.gold,recovered);assert.equal(e.tests.length,2);
});
