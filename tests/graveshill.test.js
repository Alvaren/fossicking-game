import test from 'node:test';
import assert from 'node:assert/strict';
import {Terrain} from '../src/terrain.js';
import {Deposits} from '../src/deposits.js';
import {CLAIM_PROFILES,readClaim,saveClaim} from '../src/claimregions.js';
import {travelTo} from '../src/regions.js';
import {ROAD,RUBY,SITES,pathDistance,localityRock} from '../src/graveshill/locality.js';
class Ground extends Terrain {buildMesh(){return null;}}
const profile=CLAIM_PROFILES['graves-hill'];
test('Graves Hill has shallow local wash, dry boundary drainage, clear track and no invented reef',()=>{
 const t=new Ground(12345,profile),d=new Deposits(t);
 assert.equal(t.creek.dry,true);assert.deepEqual(t.camp,{x:-48,z:29,y:t.rawHeight(-48,29)});
 assert.deepEqual(Object.keys(t.sources),Object.keys(SITES));assert.equal(profile.crystalPockets,false);
 for(const [id,min,max] of [['clifford',.3,.42],['millionaires',.2,.3]]) {
  const p=SITES[id],g=t.geologyAt(p.x,p.z);assert.ok(g.orig-g.bedrock>min&&g.orig-g.bedrock<max);
  const top=d.sample(p.x,p.z,g.orig-.01,true),base=d.sample(p.x,p.z,g.bedrock+.025,true);
  assert.ok(base.sapphire>top.sapphire*5);assert.ok(base.zircon>0&&base.spinel>0);
  for(const k of ['gold','topaz','garnet','agate'])assert.equal(base[k],0,k);
 }
 const barren=t.geologyAt(-95,92),g=t.geologyAt(12,54);
 assert.ok(d.sample(-95,92,barren.bedrock+.025,true).sapphire<d.sample(12,54,g.bedrock+.025,true).sapphire*.05);
 for(const pit of t.workings){assert.ok(pathDistance(pit.x,pit.z,ROAD)>=4);assert.ok(pit.depth<.7);}
 for(const [x,z] of RUBY.filter(([x,z])=>Math.abs(x)<105&&Math.abs(z)<105))assert.ok(Number.isFinite(t.getHeight(x,z))&&t.waterDepth(x,z)<=0);
 const east=t.geologyAt(83,-17);assert.ok(east.orig-east.bedrock>1);
 const p=t.workings.find(p=>p.z>45),floor=t.geologyAt(p.x,p.z);
 assert.ok(floor.orig-floor.bedrock<.30,'Old shallow holes have already removed much of the cover');
 assert.equal(localityRock(5,-63,.5),'granite');assert.equal(localityRock(12,54,.5),'sandstone');
});
test('Graves Hill world and workings are deterministic across seeds without altering legacy terrain',()=>{
 for(const seed of [12345,67890,314159]){
  const a=new Ground(seed,profile),b=new Ground(seed,profile);assert.deepEqual(a.orig,b.orig);assert.deepEqual(a.bedrock,b.bedrock);assert.deepEqual(a.workings,b.workings);
  for(let z=-100;z<100;z+=20)for(let x=-100;x<100;x+=20){const g=a.geologyAt(x,z);assert.ok(Number.isFinite(g.bedrock)&&g.orig>=g.bedrock);}
 }
});
test('Visiting Graves Hill preserves Billystone and NSW partial samples, camps and excavations',()=>{
 const home={seed:12345,cash:90,difficulty:'realistic',bucket:[{gold:.01}],panSession:{id:'NSW'},camp:{shelter:'shed'},digs:{idx:[1],mm:[9]}};
 let root=travelTo(home,'qld-gemfields'),old=readClaim(root);Object.assign(old,{bucket:[{sapphire:2}],panSession:{id:'QLD'},camp:{shelter:'tent'},digs:{idx:[7],mm:[19]}});root=saveClaim(root,old);
 const before=structuredClone(root.claims['qld-gemfields']);root=travelTo(root,'graves-hill');const fresh=readClaim(root);
 assert.equal(fresh.camp.built.tub,true);assert.equal(fresh.camp.shelter,'swag');assert.equal(fresh.panSession,undefined);assert.notEqual(fresh.seed,old.seed);
 fresh.camp.shelter='tent';root=saveClaim(root,{...fresh,bucket:[{sapphire:1}]});
 assert.deepEqual(root.claims['qld-gemfields'],before);assert.equal(profile.starterCamp.shelter,'swag');
 const back=readClaim(travelTo(root,'new-england'));for(const k of ['bucket','panSession','camp','digs'])assert.deepEqual(back[k],home[k]);assert.equal(back.cash,90);
});
