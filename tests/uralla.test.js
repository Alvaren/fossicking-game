import test from 'node:test';
import assert from 'node:assert/strict';
import { Terrain } from '../src/terrain.js';
import { Deposits } from '../src/deposits.js';
import { CLAIM_PROFILES, readClaim, saveClaim } from '../src/claimregions.js';
import { travelTo } from '../src/regions.js';
import { routeDistance } from '../src/uralla/locality.js';
class Ground extends Terrain { buildMesh(){return null;} }
const profile=CLAIM_PROFILES.uralla;
test('Uralla has distinct open pools, massive granite reaches and accessible shallow wash',()=>{
  const t=new Ground(12345,profile),c=t.creek;
  assert.equal(c.dry,false);assert.ok(c.halfWidth(-27)>c.halfWidth(53)*1.6);
  assert.ok(t.waterDepth(c.cx(-27),-27)>.65);
  assert.ok(c.boulders.filter(b=>b.r>2).length>=14);
  assert.deepEqual(Object.keys(t.sources),['boulderReach','reedPool','sandyShallows']);
  assert.equal(t.heaps.length,0);assert.equal(t.workings.length,0);assert.equal(profile.crystalPockets,false);
  let accessible=0;
  for(let z=-95;z<102;z+=2){
    const x=c.cx(z)-c.halfWidth(z)*.88,depth=t.waterDepth(x,z);
    if(depth>.03&&depth<.5&&!c.boulders.some(b=>Math.hypot(x-b.x,z-b.z)<b.r*1.2+.4))accessible++;
  }
  assert.ok(accessible>15,'Several banks offer real shallow tool access');
  for(const b of c.boulders)assert.ok(routeDistance(b.x,b.z,c)>b.r*1.15*1.1+.4,'Large rocks leave the walking route clear');
});
test('Uralla fine gold follows shared hydraulic traps and depth, without a fabricated reef or large-nugget source',()=>{
  const t=new Ground(12345,profile),d=new Deposits(t),c=t.creek;
  const b=c.boulders.find(b=>b.r>2),z=b.z-b.r*1.8,x=b.x,g=t.geologyAt(x,z);
  const deep=d.sample(x,z,g.bedrock+.02,true),top=d.sample(x,z,g.orig-.005,true);
  assert.ok(deep.gold>0&&deep.gold>top.gold*2);assert.ok(deep.blackSand>0);
  assert.ok(deep.garnet>0&&deep.sapphire>0);
  for(const kind of ['agate','spinel','zircon','topaz'])assert.equal(deep[kind],0);
  const land=t.geologyAt(-93,77);assert.equal(d.sample(-93,77,land.bedrock+.02,true).gold,0);
  assert.equal(t.sources.reef,undefined);assert.equal(profile.poweredSluice,false);
});
test('Uralla terrain and boulder groups are deterministic; older destinations keep their independent saves',()=>{
  for(const seed of [1,12345,798887]){
    const a=new Ground(seed,profile),b=new Ground(seed,profile);assert.deepEqual(a.orig,b.orig);assert.deepEqual(a.creek.boulders,b.creek.boulders);
    for(let z=-100;z<=100;z+=25)for(let x=-100;x<=100;x+=25){const g=a.geologyAt(x,z);assert.ok(Number.isFinite(g.bedrock)&&g.orig>=g.bedrock);}
  }
  const home={seed:12345,cash:38,camp:{shelter:'shed'},bucket:[{gold:.003}],panSession:{id:'old'},digs:{idx:[4],mm:[13]}};
  let root=travelTo(home,'uralla');const fresh=readClaim(root);assert.equal(fresh.panSession,undefined);assert.equal(fresh.camp.shelter,'swag');
  const parcel={gold:.001,x:10,z:5};root=saveClaim(root,{...fresh,bucket:[parcel],panSession:{id:'uralla'},digs:{idx:[8],mm:[24]}});
  const old=readClaim(travelTo(root,'new-england'));for(const key of ['camp','bucket','panSession','digs'])assert.deepEqual(old[key],home[key]);
  assert.equal(old.cash,38);assert.deepEqual(readClaim(travelTo({...root,activeRegion:'new-england'},'uralla')).bucket,[parcel]);
});
