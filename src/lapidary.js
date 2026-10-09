import { powered } from './campfacilities.js';
const clamp = (x,lo=0,hi=1) => Math.max(lo,Math.min(hi,x));
export const CUT_STAGES = ['Shape','Refine','Polish'];
export const lapTarget = s => .5 + Math.sin(s.workTime * (s.stage === 2 ? .8 : 1.1) + s.stage * 1.7) * .32;
export function startLapidary(state,index,cuttable,cutStone) {
  const c=state.camp,rough=state.gems[index];
  if(!c.built.lapidary||!powered(c)||c.water<=0||c.lapidarySession||!Number.isInteger(index)||!rough||!cuttable(rough))return false;
  // Reserve the actual stone before working, so it cannot be sold or cut twice.
  const seed=((rough.seed||state.seed||1)+(c.cutsCompleted||0)*7919)>>>0;
  const result=cutStone(rough,seed);
  c.lapidarySession={version:1,rough:state.gems.splice(index,1)[0],candidate:result.item,stage:0,progress:0,workTime:0,damage:0,heat:0,finished:false,water:true,pressure:.45,aim:.5,difficulty:state.difficulty};
  return true;
}
export function stepLapidary(c,input,dt) {
  const s=c.lapidarySession;
  if(!s||s.finished||!Number.isFinite(dt)||dt<=0)return;
  dt=Math.min(dt,.05);
  s.heat=Math.max(0,s.heat-dt*.05);
  if(!input.working||!powered(c))return;
  const easy=s.difficulty==='easy';
  const pressure=easy?.42:clamp(input.pressure,.1,1);
  const wet=(easy||input.water)&&c.water>0;
  if(wet)c.water=Math.max(0,c.water-dt*.015);
  s.workTime+=dt;
  const target=lapTarget(s),aim=easy?target:clamp(input.aim);
  const error=Math.abs(aim-target);
  s.heat=clamp(s.heat+dt*(wet?pressure*.025-.05:pressure*.35));
  const stress=Math.max(0,pressure-.6)+Math.max(0,s.heat-.45);
  s.damage=clamp(s.damage+dt*(Math.max(0,error-.08)*pressure*.045+stress*.035)*(s.difficulty==='prospector'?.55:1));
  s.progress+=dt*pressure*(s.stage===2?.12:.16)*(1-Math.min(.65,error));
  s.aim=aim;s.pressure=pressure;s.water=wet;
  if(s.progress>=1){s.stage++;s.progress=0;if(s.stage===CUT_STAGES.length){s.finished=true;s.stage=CUT_STAGES.length-1;s.progress=1;}}
}
export function collectLapidary(state) {
  const s=state.camp.lapidarySession;
  if(!s?.finished)return null;
  const quality=clamp(1-s.damage,.15,1);
  const item={...s.candidate,craftQuality:quality,crafted:true};
  item.value=Math.round(item.value*(.2+.8*quality)*100)/100;
  if(Number.isFinite(item.ct))item.ct=Math.max(.01,Math.round(item.ct*(.65+.35*quality)*100)/100);
  if(Number.isFinite(item.ct))item.label=item.label.replace(/\d+(?:\.\d+)? ct/,`${item.ct.toFixed(2)} ct`);
  item.label=`${item.label} · ${quality>=.9?'carefully finished':quality>=.65?'hand finished':'uneven finish'}`;
  state.camp.lapidarySession=null;
  state.gems.push(item);state.camp.cutsCompleted=(state.camp.cutsCompleted||0)+1;
  return item;
}
