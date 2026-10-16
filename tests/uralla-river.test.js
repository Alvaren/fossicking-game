import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Object3D } from 'three';
import { Sluice } from '../src/sluice.js';
import { reserveHeight, riverPath, campPath, routeDistance } from '../src/uralla/locality.js';
import { Terrain } from '../src/terrain.js';
import { Creek } from '../src/creek.js';
import { makeNoise } from '../src/noise.js';
import { CLAIM_PROFILES } from '../src/claimregions.js';
import { Deposits } from '../src/deposits.js';
import { URALLA_COURSE, URALLA_CAMP } from '../src/uralla/course.js';
import { migrateUrallaSave } from '../src/uralla/save.js';
class Ground extends Terrain { buildMesh(){} }
const profile=CLAIM_PROFILES.uralla;
const creek=()=>new Creek(makeNoise(12345),profile.creek);

test('mapped course retains the official hooked footprint and north-up uniform scale',()=>{
  const evidence=JSON.parse(readFileSync(new URL('../docs/audits/uralla-river/source.json',import.meta.url)));
  const points=evidence.features.flatMap((f,i)=>f.geometry.paths[0].slice(i?1:0)),c=creek();
  for(let i=0;i<evidence.selectedVertices.length;i++) {
    const [lon,lat]=points[evidence.selectedVertices[i]],x=(lon-151.47205)*111320*Math.cos(-30.6288*Math.PI/180)*.48,z=-(lat+30.6288)*111320*.48;
    assert.ok(Math.hypot(URALLA_COURSE[i][0]-x,URALLA_COURSE[i][1]-z)<.00002);
    assert.ok(c.local(x,z,{}).d<.08,'Smoothing retains the selected geographic control');
  }
  const s=c.course.samples;
  assert.ok(s.some((p,i)=>i&&p.z<s[i-1].z),'The returning bend has a southbound segment while going upstream');
  assert.ok(Math.max(...s.map(p=>p.x))-Math.min(...s.map(p=>p.x))>100);
});

test('current follows the returning course downhill, including where it reverses map-z direction',()=>{
  const c=creek();c.boulders=[];let southbound=0;
  for(let s=c.course.min+2;s<c.course.max-2;s+=2) {
    const p=c.point(s),down=c.point(s-1),v=c.velocity(p.x,p.z,{});
    assert.ok(v.x*(down.x-p.x)+v.z*(down.z-p.z)>0);
    assert.ok(c.surfaceY(down.z,down.x)<c.surfaceY(p.z,p.x));
    if(v.z>0)southbound++;
    assert.ok(Math.abs(c.local(p.x,p.z,{}).s-s)<.03);
  }
  assert.ok(southbound>8,'The hook must not be flattened to a north-only current');
});

test('wider pools slow the flow; narrower shallow runs accelerate it without extra discharge',()=>{
  const c=creek(),wide=new Creek(makeNoise(12345),{...profile.creek,course:URALLA_COURSE.map(p=>[p[0],p[1],p[2]*1.5,p[3]])});
  for(let s=-130;s<=130;s+=10)assert.ok(Math.abs(wide.baseSpeed(s)*1.5-c.baseSpeed(s))<1e-10);
  const pool=c.station(URALLA_COURSE[3][0],URALLA_COURSE[3][1]),run=c.station(URALLA_COURSE[14][0],URALLA_COURSE[14][1]);
  assert.ok(c.baseSpeed(run)>c.baseSpeed(pool)*2.5);
});

test('real bend geometry puts the shallow bar and heavier wash inside, with deeper outside scour',()=>{
  const t=new Ground(12345,profile),c=t.creek,d=new Deposits(t);c.boulders=[];
  let checked=0;
  for(let s=-130;s<130;s+=4) {
    if(c.bend(s)<.55)continue;
    const sign=Math.sign(c.curvature(s)),inside=c.point(s,sign*c.halfWidth(s)*.7),outside=c.point(s,-sign*c.halfWidth(s)*.7);
    if(Math.abs(c.station(inside.x,inside.z)-s)>.1||Math.abs(c.station(outside.x,outside.z)-s)>.1)continue;
    assert.ok(t.getHeight(inside.x,inside.z)>t.getHeight(outside.x,outside.z)+.1);
    const a=t.geologyAt(inside.x,inside.z),b=t.geologyAt(outside.x,outside.z);
    assert.ok(d.sample(inside.x,inside.z,a.bedrock+.02,true).gold>d.sample(outside.x,outside.z,b.bedrock+.02,true).gold);
    checked++;
  }
  assert.ok(checked>15);
  for(let i=1;i<c.reservePath.length;i++) {
    const a=c.reservePath[i-1],b=c.reservePath[i];
    for(let j=0;j<=4;j++) {
      const x=a[0]+(b[0]-a[0])*j/4,z=a[1]+(b[1]-a[1])*j/4;
      assert.ok(t.waterDepth(x,z)<.05,'Continuous bank route stays above water');
    }
    assert.ok(Math.abs(t.getHeight(...a)-t.getHeight(...b))/Math.hypot(a[0]-b[0],a[1]-b[1])<.65);
  }
});

test('the same visible boulder records create downstream slack water on the mapped course',()=>{
  const t=new Ground(12345,profile),c=t.creek;let found=0;
  for(const b of [...c.boulders]) {
    const l=c.local(b.x,b.z,{}),x=b.x+l.tx*b.r*1.5,z=b.z+l.tz*b.r*1.5;
    c.boulders=[];const clear=c.velocity(x,z,{}).speed;c.boulders=[b];
    if(clear>.03&&c.wakeAt(x,z)>.25){assert.ok(c.velocity(x,z,{}).speed<clear*.8);found++;}
  }
  assert.ok(found>5);
});

test('old Uralla saves retain worked ground, partial recovery and camp assets; migration happens once',()=>{
  const old={activeRegion:'uralla',seed:12345,cash:28,gold:.01,camp:{shelter:'shed',built:{tub:true}},digs:{idx:'AQ==',mm:'Ag=='},patches:[{cx:9,cz:8,mm:'Aw=='}],bucket:[{gold:.003}],panSession:{time:8,bed:{gold:.001}},collected:[9],surface:[3],player:{x:8,z:10,tool:'shovel'},ute:{x:-35,z:6,h:1},sluice:{placed:true,spot:{x:10,z:30,dir:2},loads:3,cons:{gold:.004}}};
  const copy=structuredClone(old),next=migrateUrallaSave(old);
  assert.deepEqual(old,copy);
  for(const k of ['cash','gold','seed','camp','digs','patches','bucket','panSession','collected','surface'])assert.deepEqual(next[k],old[k]);
  assert.equal(next.sluice.loads,3);assert.deepEqual(next.sluice.cons,old.sluice.cons);
  assert.ok(Math.hypot(next.player.x-URALLA_CAMP.x,next.player.z-URALLA_CAMP.z)<8);
  assert.deepEqual(next.layoutMigration.player,old.player);assert.equal(next.layoutVersion,2);
  assert.equal(migrateUrallaSave(next),next);
  assert.equal(migrateUrallaSave({...old,activeRegion:'new-england'}).layoutVersion,undefined);
});


test('surrounding terraces do not form artificial ridges between returning river arms',()=>{
  const c=creek(),n2=makeNoise(12345).noise2;
  c.reservePath=riverPath(c);c.reserveCampPath=campPath(c);
  const h=(x,z)=>reserveHeight(x,z,n2,c);let checked=0;
  for(let z=-90;z<90;z+=2)for(let x=-90;x<90;x+=2) {
    const l=c.local(x,z,{});
    if(l.d-l.w<9||routeDistance(x,z,c)<3)continue;
    const centre=h(x,z),curvature=Math.abs(h(x+.5,z)+h(x-.5,z)-2*centre)+Math.abs(h(x,z+.5)+h(x,z-.5)-2*centre);
    assert.ok(curvature<.06,'Gentle off-channel ground must not inherit nearest-reach seams');checked++;
  }
  assert.ok(checked>2000);
});

test('flood-stranded sluices move downstream along the hook and land beyond its bank',()=>{
  const c=creek();
  for(const station of [-100,-70,-30,20,80,130]) {
    const sluice=Object.create(Sluice.prototype);
    Object.assign(sluice,{creek:c,terrain:{getHeight:()=>0},placed:true,kind:'sluice',spot:c.point(station),loads:2,cons:{gold:.001},model:new Object3D()});
    assert.equal(sluice.washAway(()=>.5),true);
    const p=sluice.stranded,L=c.local(p.x,p.z,{});
    assert.ok(L.s<station-20,'Stranding follows river distance, including the reversed map direction');
    assert.ok(L.d>L.w,'Flooded gear fetches up beyond the bank');
    assert.equal(sluice.placed,false);assert.equal(sluice.loads,0);assert.equal(sluice.cons,null);
  }
});
