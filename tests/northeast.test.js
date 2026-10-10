import test from 'node:test';
import assert from 'node:assert/strict';
import { Catchment, ROUTE, TRAILHEAD, takeSample, walkStep, riverX, riverWidth } from '../src/tasmania/northeast.js';
import { TASMANIA, NORTHEAST, travelTo, returnHome, saveExpedition, makeExpedition } from '../src/regions.js';
import { startSieve, stepSieve, flipSieve, collectSieve } from '../src/tasmania/sieving.js';
import { sieveRecovery } from '../src/sieverecovery.js';
const home=()=>({seed:12345,cash:150,gold:.2,gems:[],nuggets:[],up:{sieve:1},panSession:{id:'home-pan'},camp:{shelter:'shed'}});
const contents=()=>({gold:0,picker:0,finds:[{item:{type:'sapphire',ct:.2,value:14,grade:'B',label:'sapphire'},survival:.7,at:.1},{item:{type:'zircon',ct:1,value:1,grade:'C',label:'zircon'},survival:.4,at:.4}]});
const assay=(sample,r)=>({...contents(),marker:r()});
const ready=(classified=true)=>{const e=makeExpedition(home(),['bucket',...(classified?['classifier']:[])],NORTHEAST);takeSample(e,new Catchment(e.seed).sites[1],assay);return e;};
test('northeast route and every sampling bank are walkable, while deep water blocks walking',()=>{
  for(const seed of [1,12345,888888]){
    const m=new Catchment(seed),p={...TRAILHEAD};
    for(const nodes of [ROUTE,[...ROUTE].reverse()])for(const target of nodes.slice(1)){
      let n=0;while(Math.hypot(p.x-target.x,p.z-target.z)>.06&&n++<4000){const d=Math.hypot(p.x-target.x,p.z-target.z);walkStep(m,p,(target.x-p.x)/d*.06,(target.z-p.z)/d*.06);}
      assert.ok(n<4000,`route ${seed}: ${JSON.stringify(target)}`);
    }
    for(const site of m.sites){const p={x:riverX(site.z)-riverWidth(site.z)-4,z:site.z};let n=0;while(Math.hypot(p.x-site.x,p.z-site.z)>.06&&n++<250){walkStep(m,p,.04,0);}assert.ok(n<250,site.id);assert.ok(m.depth(p.x,p.z)<.72);}
    const deep={x:riverX(0)-1,z:0};assert.equal(walkStep(m,deep,.1,0),false);
  }
});
test('finite seeded wash survives serialization; a classifier never rerolls its gem contents',()=>{
  const a=ready(),b=ready(false);assert.deepEqual(a.bucket[0].panContents,b.bucket[0].panContents);assert.equal(a.bucket[0].classified,true);assert.equal(b.bucket[0].classified,false);
  const m=new Catchment(a.seed),site=m.sites[1];a.bucket=[];
  takeSample(a,site,assay);const saved=structuredClone(a);takeSample(a,site,assay);takeSample(saved,site,assay);
  assert.deepEqual(a,saved);a.bucket=[];assert.equal(takeSample(a,site,assay),null);assert.equal(a.siteUse[site.id],site.capacity);
});
test('Easy shows settling and flips; classification reduces work but does not multiply finds',()=>{
  const a=ready(),b=ready(false),sa=startSieve(a),sb=startSieve(b);let n=0;
  while(!sa.flipped&&n++<2000)stepSieve(sa,false,1/60,'easy');
  const easySteps=n;n=0;while(!sb.flipped&&n++<2000)stepSieve(sb,false,1/60,'easy');
  assert.ok(sa.flipped&&sb.flipped);assert.ok(n>easySteps);assert.equal(sa.strat,1);assert.equal(sa.lost,0);assert.deepEqual(sa.result.finds,sb.result.finds);
});
test('manual over-jigging loses tiny gems; early flips scatter heavies and cannot be rerolled',()=>{
  const gentle=startSieve(ready()),rough=structuredClone(gentle);gentle.strat=1;rough.strat=1;rough.lost=4;
  assert.ok(flipSieve(gentle));assert.ok(flipSieve(rough));assert.ok(gentle.result.finds.length>rough.result.finds.length);assert.equal(flipSieve(gentle),false);
  const early=startSieve(ready());assert.equal(flipSieve(early),false);early.strat=.1;flipSieve(early);assert.ok(early.result.finds.length<gentle.result.finds.length);
  const held=startSieve(ready());for(let i=0;i<240;i++)stepSieve(held,true,1/60);assert.ok(held.lost>1);assert.ok(held.strat<1);
  assert.ok(sieveRecovery({type:'sapphire',ct:.1},true,1)>sieveRecovery({type:'sapphire',ct:.1},false,1));
});
test('saved sieve reserves its own parcel alongside a pan and collection is exactly once',()=>{
  const e=ready();e.panSession={id:'unfinished-pan'};const s=startSieve(e);assert.equal(e.bucket.length,0);stepSieve(s,true,.05);
  const copy=JSON.parse(JSON.stringify(e));assert.deepEqual(startSieve(copy),s);copy.sieveSession.strat=1;flipSieve(copy.sieveSession);
  const saved=JSON.parse(JSON.stringify(copy));const result=collectSieve(saved);assert.equal(result.finds.length,2);assert.equal(saved.gems.length,2);assert.ok(saved.gems.every(f=>f.uid&&f.from));
  assert.equal(collectSieve(saved),null);assert.deepEqual(saved.panSession,e.panSession);
});
test('direct travel banks once, charges once, preserves both expedition work and home pan',()=>{
  const h=home(),west=travelTo(h,TASMANIA,['bucket']);west.expeditions[TASMANIA].gold=.01;west.expeditions[TASMANIA].siteUse.crack=2;
  const ne=travelTo(west,NORTHEAST,['bucket'],20);assert.equal(ne.cash,130);assert.ok(Math.abs(ne.gold-.21)<1e-12);assert.equal(west.gold,.2);
  const e=ne.expeditions[NORTHEAST];e.siteUse.bar=3;e.sieveSession={id:'partial'};e.gems=[{type:'sapphire',label:'sapphire',value:5,uid:'unique'}];
  const backWest=travelTo(saveExpedition(ne,e),TASMANIA,['bucket']);assert.equal(backWest.gems.length,1);assert.equal(backWest.log.sapphire.n,1);assert.equal(backWest.expeditions[TASMANIA].siteUse.crack,2);
  const backNE=travelTo(backWest,NORTHEAST,['bucket']);assert.equal(backNE.gems.length,1);assert.equal(backNE.expeditions[NORTHEAST].sieveSession.id,'partial');assert.equal(backNE.expeditions[NORTHEAST].siteUse.bar,3);
  assert.deepEqual(returnHome(backNE).panSession,h.panSession);assert.equal(travelTo(backNE,NORTHEAST,[]),null);
  assert.equal(travelTo(backNE,'lightning-ridge',[]),null);assert.equal(travelTo(backNE,TASMANIA,[],151),null);
});

