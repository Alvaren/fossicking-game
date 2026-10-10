import { sieveRecovery } from '../sieverecovery.js';
import { recordRecovery } from './model.js';
const clamp=n=>Math.max(0,Math.min(1,n));
export function startSieve(e) {
  if(e.sieveSession)return e.sieveSession;
  if(!e.bucket.length)return null;
  e.nextSieveId=(e.nextSieveId||0)+1;
  const sample=e.bucket.shift();
  e.sieveSession={id:`${e.seed}:sieve:${e.nextSieveId}`,sample,I:0,strat:0,lost:0,time:0,flipped:false,
    nested:(e.up?.sieve||0)>0,classified:!!sample.classified,result:null};
  return e.sieveSession;
}
export function jigZone(s) {
  const half=s.nested?.13:.1,c=.56+.14*Math.sin(s.time*.55)+.05*Math.sin(s.time*1.7);
  return [c-half,c+half];
}
export function stepSieve(s,held,dt,difficulty='realistic') {
  if(!s||s.flipped)return;
  dt=Math.max(0,Math.min(.05,dt));s.time+=dt;
  const [lo,hi]=jigZone(s);
  // Easy demonstrates the same gentle movement, settling and flip. Manual uses
  // the original hold/release intensity control and overshoot penalties.
  s.I=difficulty==='easy'?(lo+hi)/2:clamp(s.I+(held?1.25:-1)*dt);
  const seconds=(s.nested?2.4:3.6)*(s.classified?1:1.45)*(1+(s.sample.clay||0)*3);
  if(s.I>hi){s.strat-=dt*.35/seconds;s.lost+=dt;}
  else if(s.I>=lo)s.strat+=dt/seconds;
  else s.strat-=dt*.04;
  s.strat=clamp(s.strat);
  if(difficulty==='easy'&&s.strat>=1)flipSieve(s);
}
export function flipSieve(s) {
  if(!s||s.flipped||s.strat<.05)return false;
  const c=s.sample.panContents;
  // Survival thresholds were fixed when this exact parcel was scooped. A saved
  // unfinished sieve or pan remainder can never generate a fresh set of stones.
  const finds=c.finds.filter(f=>f.survival<sieveRecovery(f.item,s.nested,s.strat,s.lost)).map(f=>structuredClone(f.item));
  s.result={gold:0,picker:0,finds,method:'sieve',sessionId:s.id};s.flipped=true;return true;
}
export function collectSieve(e) {
  const s=e.sieveSession;if(!s?.flipped)return null;
  const result=s.result;
  if(!recordRecovery(e,s.sample,result))return null;
  e.sieveSession=null;return result;
}
