import test from 'node:test';
import assert from 'node:assert/strict';
import { createPan, takePanLoad, stepPan, automaticStroke, goldLeft, lightMass, panResult, PAN_TYPES, materialFor, assayGold } from '../src/panning.js';
const contents = () => ({ gold: 0.012, picker: 0, finds: [] });
const sum = obj => Object.values(obj).reduce((a,b)=>a+b,0);
function run(s, stroke, seconds) { for(let i=0;i<seconds*60;i++) stepPan(s,typeof stroke==='function'?stroke(s):stroke,1/60); return s; }
const shake = {action:'stratify',speed:0.5,submerged:true,tilt:0,lip:'coarse'};
const careful = {action:'wash',speed:0.38,submerged:false,tilt:18,lip:'coarse'};
const aggressive = {action:'wash',speed:2.2,submerged:false,tilt:58,lip:'smooth'};
function fixture(extra={}) { return createPan({sample:{clay:0.18,blackSand:2}, contents:contents(), ...extra}); }

test('Easy demonstrates complete repeated cycles on every pan and material',()=>{
 for(const p of PAN_TYPES) for(const sample of [{clay:0.3},{cons:true},{crushed:true},{clay:0}]) {
  const s=createPan({sample,contents:contents(),panId:p.id,difficulty:'easy'});
  run(s,automaticStroke,240);
  assert.ok(s.finished,`${p.id} ${JSON.stringify(sample)} stalled: ${JSON.stringify({bed:s.bed,strat:s.strat,message:s.message})}`);
  assert.ok(s.cycles>=2 || sample.cons,'should visibly re-stratify between layers');
  assert.ok(panResult(s).gold>=0.011,'correct method should retain nearly all gold');
 }
});
test('stationary mouse and time alone cannot process a realistic pan',()=>{
 const s=fixture(); const before = structuredClone(s.bed); run(s,{...careful,speed:0},60); assert.equal(s.strat,0); assert.deepEqual(s.bed,before); assert.equal(s.finished,false);
});
test('washing disturbs stratification and aggressive work loses more fine gold',()=>{
 const a=fixture({sample:{clay:0}}), b=structuredClone(a);
 run(a,shake,8); run(b,shake,8); const strat=a.strat;
 run(a,careful,3); run(b,aggressive,3);
 assert.ok(a.strat<strat); assert.ok(goldLeft(a)>goldLeft(b));
 assert.ok(b.lostGold.fine/b.initialGold.fine>b.lostGold.coarse/b.initialGold.coarse);
});
test('breaking clay releases bound gold without changing bulk or gold',()=>{
 const s=fixture(); const bulk=sum(s.bed), gold=goldLeft(s); run(s,{action:'clay',speed:0.6,submerged:true},10);
 assert.ok(s.bed.clay<1e-9); assert.ok(sum(s.bound)<1e-9); assert.ok(Math.abs(sum(s.bed)-bulk)<1e-10); assert.equal(goldLeft(s),gold);
 const b=fixture(); run(b,aggressive,4); assert.ok(sum(b.lostGold)>0);
});
test('bulk and gold are conserved through rough washing, clay breakup and reveal',()=>{
 const s=fixture();
 for(let i=0;i<5000;i++) {
  const stroke=i<400?{action:'clay',speed:0.3,submerged:true}:i%3===0?aggressive:automaticStroke(s);
  stepPan(s,stroke,1/60);
  assert.ok(Math.abs(sum(s.bed)+sum(s.tailings)-s.initialBulk)<1e-9);
  assert.ok(Math.abs(goldLeft(s)+sum(s.lostGold)-sum(s.initialGold))<1e-10);
  assert.ok(Object.values(s.bed).every(n=>n>=0 && Number.isFinite(n)));
 }
});
test('too much load slows stratification and smooth lip is less protective',()=>{
 const a=fixture({volume:0.4,sample:{clay:0}}), b=fixture({volume:1,sample:{clay:0}});
 run(a,shake,3);run(b,shake,3);assert.ok(a.strat>b.strat);
 const c=fixture({sample:{clay:0}}), d=structuredClone(c);
 run(c,{...aggressive,lip:'coarse'},3);run(d,{...aggressive,lip:'smooth'},3); assert.ok(goldLeft(c)>goldLeft(d));
});
test('pan profiles differ; fine traps help in concentrates',()=>{
 const a=fixture({sample:{cons:true},panId:'standard'}), b=fixture({sample:{cons:true},panId:'dual'});
 run(a,shake,8); run(b,shake,8); a.bed.sand=0; b.bed.sand=0;
 run(a,{...aggressive,lip:'coarse'},2); run(b,{...aggressive,lip:'fine'},2); assert.ok(goldLeft(b)>goldLeft(a));
});
test('splitting a load assays once and conserves every find and gold',()=>{
 const bucket=[{gold:0.02,blackSand:2,clay:0.2}]; let calls=0;
 const assay=()=>{calls++;return{gold:0.02,picker:0.5,pickerAt:0.8,finds:[{item:{label:'gem'},at:0.7,survival:0.2}]};};
 const loads=[];
 while(bucket.length) loads.push(takePanLoad(bucket,{fill:0.25},assay));
 assert.equal(calls,1);assert.equal(loads.length,4);
 assert.ok(Math.abs(loads.reduce((n,s)=>n+goldLeft(s),0)-0.02)<1e-10);
 assert.equal(loads.reduce((n,s)=>n+s.picker,0),0.5); assert.equal(loads.reduce((n,s)=>n+s.finds.length,0),1);
});
test('save/reload resumes identical material and result without reroll',()=>{
 const a=fixture();run(a,automaticStroke,14);const b=JSON.parse(JSON.stringify(a));run(a,automaticStroke,180);run(b,automaticStroke,180);assert.deepEqual(panResult(a),panResult(b));
});
test('barren concentrate reveal contains no invented gold',()=>{
 const s=fixture({sample:{cons:true},contents:{gold:0,picker:0,finds:[]}});run(s,automaticStroke,180);assert.ok(s.finished);assert.equal(panResult(s).gold,0);assert.equal(panResult(s).picker,0);
});
test('reveal cannot finish a full gravel bed, dry shaking cannot stratify',()=>{
 const s=fixture();run(s,{...shake,submerged:false},20);assert.equal(s.strat,0);run(s,{action:'reveal',speed:0.3,submerged:false,tilt:8,lip:'smooth'},8);assert.equal(s.finished,false);
});
test('supported material mixes never contain negative fractions',()=>{
 for(const clay of [0,0.2,0.5,0.55]) for(const blackSand of [0,1,20]) {
  const m=materialFor({clay,blackSand});assert.ok(Object.values(m).every(v=>v>=0));assert.ok(Math.abs(sum(m)-1)<1e-9);
 }
});

test('lean grades can assay barren; zero-grade material never invents gold',()=>{
 assert.equal(assayGold(0,()=>0.5),0); assert.equal(assayGold(0.00001,()=>0.5),0);
 assert.ok(assayGold(0.02,()=>0.5)>0);
});
test('a picker can be lost even when no fine gold was present',()=>{
 const s=fixture({sample:{cons:true},contents:{gold:0,picker:0.5,finds:[]}});
 run(s,aggressive,30);run(s,automaticStroke,180);assert.ok(s.finished);assert.equal(panResult(s).picker,0);assert.equal(panResult(s).lost,0.5);
});
