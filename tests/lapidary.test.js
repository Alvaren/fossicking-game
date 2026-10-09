import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreCamp} from '../src/camp.js';
import {startLapidary,stepLapidary,lapTarget,collectLapidary} from '../src/lapidary.js';
const rough={uid:'stone1',type:'sapphire',label:'blue sapphire 4 ct',ct:4,value:30,keep:true};
const can=i=>!i.cut,cut=i=>({item:{...i,cut:'round',ct:1.3,value:75,label:'blue sapphire 1.30 ct'}});
const make=(difficulty='realistic')=>({seed:1,camp:restoreCamp({built:{lapidary:true,generator:true,water:true},water:80,generatorFuel:2,generatorOn:true}),gems:[{...rough}],difficulty});
function finish(state,good){const c=state.camp;for(let i=0;i<30000&&!c.lapidarySession.finished;i++){const s=c.lapidarySession;stepLapidary(c,{working:true,aim:good?lapTarget(s):0,pressure:good?.4:1,water:good},1/60);}assert.ok(c.lapidarySession.finished);}
test('lapidary reserves one actual stone, prevents repeat loading and pauses without work or power',()=>{
 const s=make();assert.equal(startLapidary(s,0,can,cut),true);assert.equal(s.gems.length,0);assert.equal(startLapidary(s,0,can,cut),false);
 stepLapidary(s.camp,{working:false},.05);assert.equal(s.camp.lapidarySession.workTime,0);
 s.camp.generatorOn=false;stepLapidary(s.camp,{working:true,aim:.5,pressure:.5,water:true},.05);assert.equal(s.camp.lapidarySession.progress,0);
 assert.equal(collectLapidary(s),null);
});
test('controlled wet work preserves more finish and weight than forceful dry grinding',()=>{
 const a=make(),b=make();startLapidary(a,0,can,cut);startLapidary(b,0,can,cut);finish(a,true);finish(b,false);
 const good=collectLapidary(a),poor=collectLapidary(b);assert.ok(good.value>poor.value);assert.ok(good.ct>poor.ct);assert.ok(good.ct<=rough.ct);assert.equal(good.keep,true);
 assert.equal(collectLapidary(a),null);assert.equal(a.gems.length,1);assert.equal(a.gems[0].uid,'stone1');assert.ok(a.camp.water<80);assert.equal(b.camp.water,80);
});
test('saved work resumes without re-assaying the stone; Easy performs the same stages',()=>{
 let s=make('easy');startLapidary(s,0,can,cut);for(let i=0;i<120;i++)stepLapidary(s.camp,{working:true},1/60);
 const before=s.camp.lapidarySession.workTime;s=JSON.parse(JSON.stringify(s));assert.equal(s.camp.lapidarySession.workTime,before);
 finish(s,false);const out=collectLapidary(s);assert.ok(out.craftQuality>.95);assert.equal(out.uid,rough.uid);assert.equal(s.camp.cutsCompleted,1);
});
