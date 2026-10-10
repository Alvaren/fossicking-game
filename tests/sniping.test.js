import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePocket,ensureSniping,stepSniping,automaticSniping,workSniping,exposed,nearestSnipingSite} from '../src/sniping.js';
import {Catchment,ROUTE} from '../src/tasmania/model.js';
import {makeExpedition,saveExpedition,returnHome,depart,packWeight} from '../src/regions.js';
const site={id:'pool-fern-bend',seed:719,x:1,z:52,gold:.036,capacity:1};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-11,`${a} != ${b}`);
function clear(p, index, difficulty='realistic') {
  for(let i=0;i<5000&&!p.cells[index].inspected;i++){
    const c=p.cells[index],tool=c.loose>c.capacity*.025?'fan':c.bound>c.capacity*.019?'pick':'snuffer';
    stepSniping(p,p.cloud>.5?null:{target:index,tool,force:.32},.05,difficulty);
  }
}
test('old pocket balances migrate deterministically without replenishing material or gold',()=>{
  const p=preparePocket(site,{remainingGold:.004,remainingMaterial:.3}),copy=preparePocket(site,{remainingGold:.004,remainingMaterial:.3});
  assert.deepEqual(p,copy);close(p.remainingGold,.004);close(p.remainingMaterial,.3);
  assert.equal(p.cells.filter(c=>c.gold===0).length,3);
  const empty=preparePocket(site,{remainingGold:0,remainingMaterial:0});close(empty.remainingGold,0);close(empty.remainingMaterial,0);
  assert.deepEqual(preparePocket(site,JSON.parse(JSON.stringify(p))),p);
});
test('cover, compacted fill and visibility must be worked in sequence',()=>{
  const p=preparePocket(site),c=p.cells[0];
  stepSniping(p,{target:0,tool:'snuffer',force:1},.1);assert.equal(c.progress,0);
  const bound=c.bound;stepSniping(p,{target:0,tool:'pick',force:1},.1);assert.equal(c.bound,bound);
  clear(p,0);assert.equal(c.inspected,true);close(c.recovered,c.initialGold);assert.equal(exposed(c),true);
  const frozen=JSON.parse(JSON.stringify(p.cells[2]));p.cloud=1;
  stepSniping(p,{target:2,tool:'fan',force:1},.1);assert.deepEqual(p.cells[2],frozen);
  const cloud=p.cloud;for(let i=0;i<100;i++)stepSniping(p,null,.1);assert.ok(p.cloud<cloud*.15);
});
test('firm fanning clouds water and loses exposed gold while gentle work conserves it',()=>{
  const firm=preparePocket(site),gentle=preparePocket(site);
  for(const p of [firm,gentle]){p.cells[0].loose=0;p.cells[0].bound=0;refreshForTest(p);}
  for(let i=0;i<30;i++){stepSniping(firm,{target:0,tool:'fan',force:1},.05);stepSniping(gentle,{target:0,tool:'fan',force:.32},.05);}
  assert.ok(firm.lostGold>0);close(gentle.lostGold,0);
  close(firm.remainingGold+firm.recoveredGold+firm.lostGold,firm.initialGold);
  const a=preparePocket(site),b=preparePocket(site);
  for(let i=0;i<15;i++){stepSniping(a,{target:0,tool:'fan',force:1},.05);stepSniping(b,{target:0,tool:'fan',force:.32},.05);}
  assert.ok(a.cloud>b.cloud*2);
});
function refreshForTest(p){p.removedMaterial=p.initialMaterial-p.cells.reduce((s,c)=>s+c.loose+c.bound,0);}
test('Easy demonstrates the whole finite pocket, including barren cracks, without changing its assay',()=>{
  const p=preparePocket(site);
  for(let i=0;i<20000&&p.cells.some(c=>!c.inspected);i++)stepSniping(p,automaticSniping(p),.05,'easy');
  assert.ok(p.cells.every(c=>c.inspected));close(p.recoveredGold,site.gold);close(p.lostGold,0);
  close(p.remainingMaterial+p.removedMaterial,p.initialMaterial);
});
test('manual modes, reload and direct travel preserve work and bank each crevice exactly once',()=>{
  let home={seed:12345,gold:.1,cash:0,up:{},difficulty:'realistic'};
  let e=makeExpedition(home,['bucket','sniping']);ensureSniping(e,[site]);
  let completed=0;
  for(let i=0;i<20000&&e.snipingPockets[site.id].cells.some(c=>!c.inspected);i++){
    const p=e.snipingPockets[site.id],a=automaticSniping(p);
    const result=workSniping(e,site,a,.05);completed+=!!result.completed;
    if(i===80){e=JSON.parse(JSON.stringify(e));ensureSniping(e,[site]);e.difficulty='prospector';}
  }
  assert.equal(completed,12);assert.equal(e.tests.length,12);close(e.gold,site.gold);
  const p=e.snipingPockets[site.id];for(let i=0;i<50;i++)workSniping(e,site,{tool:'snuffer',target:0,force:.32},.05);
  assert.equal(e.tests.length,12);close(e.gold,site.gold);close(p.remainingGold,0);
  home=returnHome(saveExpedition(home,e));close(home.gold,.136);
  home=depart(home,['sniping']);ensureSniping(home.expeditions['tasmania-west'],[site]);
  close(home.expeditions['tasmania-west'].snipingPockets[site.id].remainingGold,0);
  home=returnHome(home);close(home.gold,.136);
});
test('all three pools are inspectable from existing route banks; deep water remains blocked',()=>{
  for(const seed of [1,12345,888888]){
    const m=new Catchment(seed);
    for(const p of m.snipingPockets){
      const banks=ROUTE.slice(1).flatMap((b,i)=>Array.from({length:50},(_,j)=>({x:ROUTE[i].x+(b.x-ROUTE[i].x)*j/50,z:ROUTE[i].z+(b.z-ROUTE[i].z)*j/50})));
      const bank=banks.find(r=>nearestSnipingSite(m,r)?.id===p.id);
      assert.ok(bank,`No route access for ${p.id}`);
      assert.equal(nearestSnipingSite(m,p),null);
    }
  }
});
test('sniping kit is counted in the existing pack allowance',()=>{
  close(packWeight(['sniping']),5.3);
  assert.ok(makeExpedition({seed:1},['bucket','camp','sniping']));
  assert.equal(makeExpedition({seed:1},['bucket','camp','classifier','sniping']),null);
});
