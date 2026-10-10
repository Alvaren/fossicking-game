import { grade } from '../specimens.js';
import { makeNoise, mulberry32 } from '../noise.js';
import { assayGold } from '../panning.js';
import { sampleCapacity } from '../regions.js';
const clamp = (n,a=0,b=1) => Math.max(a,Math.min(b,n));
const ease = n => { n=clamp(n); return n*n*(3-2*n); };
export const riverX = z => 12*Math.sin(z*.017)+4*Math.sin(z*.053);
export const waterY = z => 6-.04*z+1.7*(1+Math.tanh((-72-z)/2.5));
export const riverWidth = z => 4.6+1.0*(.5+.5*Math.sin(z*.047));
export const TRAILHEAD = {x:-62,z:112,y:32};
export const CAMP = {x:riverX(56)-11,z:56,y:waterY(56)+1.05};
export const REACHES = [
  {id:'fern-bend',name:'Fern Bend',z:55,description:'A sheltered bend with gravel bars and a riverside campsite. Compare loose bar wash with the boulder lee.'},
  {id:'slate-narrows',name:'Slate Narrows',z:-12,description:'A tighter bedrock reach. Follow the bank to the shallow ford; look for gravel held in cracks.'},
  {id:'upper-cascade',name:'Upper Cascade',z:-91,description:'Rock shelves above the falls, plunge pools below. Concentrates occupy small, distinct traps.'},
];
export const ROUTE = [TRAILHEAD,{x:-73,z:85,y:27},{x:-50,z:69,y:22},{x:-65,z:48,y:18},
  {x:-37,z:38,y:13},{x:-24,z:57,y:9},{x:-15,z:74,y:7},CAMP,
  ...[38,14].map(z=>({x:riverX(z)-7.5,z,y:waterY(z)+.65})),
  {x:riverX(14),z:14,y:waterY(14)-.18},{x:riverX(14)+7.5,z:14,y:waterY(14)+.65},
  ...[-8,-30,-47].map(z=>({x:riverX(z)+8,z,y:waterY(z)+.75})),
  {x:riverX(-47),z:-47,y:waterY(-47)-.18},{x:riverX(-47)-8,z:-47,y:waterY(-47)+.75},
  ...[-62,-80,-99].map(z=>({x:riverX(z)-9,z,y:waterY(z)+.9})),
];
export function nearestTrail(x,z,route = ROUTE) {
  let best={distance:Infinity}, heightSum=0, weightSum=0;
  for(let i=0;i<route.length-1;i++) {
    const a=route[i],b=route[i+1],dx=b.x-a.x,dz=b.z-a.z;
    const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz));
    const px=a.x+dx*t,pz=a.z+dz*t,distance=Math.hypot(x-px,z-pz);
    const height=a.y+(b.y-a.y)*t, weight=1/((distance*distance+.25)**2);
    heightSum+=height*weight; weightSum+=weight;
    if(distance<best.distance) best={distance,x:px,z:pz,y:height,index:i};
  }
  // Blend adjacent segments at bends: a nearest-segment switch must not make a step.
  best.y=heightSum/weightSum;
  return best;
}
export class Catchment {
  constructor(seed) {
    this.seed=seed;this.noise=makeNoise(seed).noise2;
    const rand=mulberry32(seed);
    this.sites=[];
    for(const reach of REACHES) for(let i=0;i<6;i++) {
      const z=reach.z+(i-2.5)*3.2,side=reach.id==='slate-narrows'?1:-1;
      const x=riverX(z)+side*(riverWidth(z)-.4);
      this.sites.push({id:`${reach.id}-${i}`,reach:reach.id,x,z,kind:i%2?'crevice':'bar',
        capacity:i%2?3:5,grade:(i%2?.003:.00035)*(0.25+rand()*1.7),seed:Math.floor(rand()*1e9)});
    }
    this.snipingPockets=REACHES.map((r,i)=>({id:`pool-${r.id}`,x:riverX(r.z-3),z:r.z-3,
      gold:.012+rand()*.04,capacity:1,method:'sniping',seed:seed+i}));
  }
  height(x,z) {
    const w=riverWidth(z),d=Math.abs(x-riverX(z));
    const ford=Math.max(Math.exp(-(((z-14)/3)**2)),Math.exp(-(((z+47)/3)**2)));
    const depth=(1.2+.65*Math.sin(z*.05)**2)*(1-ford)+.16*ford;
    const n=this.noise(x*.11,z*.11);
    let h=d<w ? waterY(z)-depth*(1-(d/w)**2)+n*.045
      : waterY(z)+.14+Math.pow(d-w,1.16)*.22+this.noise(x*.025,z*.025)*Math.min(3,(d-w)*.12);
    const trail=nearestTrail(x,z),blend=ease((10-trail.distance)/8.6);
    h+=(trail.y-h)*blend;
    const camp=Math.hypot(x-CAMP.x,z-CAMP.z),flat=ease((5-camp)/2);
    h+=(CAMP.y-h)*flat;
    const gate=Math.hypot(x-TRAILHEAD.x,z-TRAILHEAD.z),gateFlat=ease((7-gate)/3);
    return h+(TRAILHEAD.y-h)*gateFlat;
  }
  depth(x,z) { return Math.max(0,waterY(z)-this.height(x,z)); }
  current(x,z) {
    const d=this.depth(x,z);
    return d>.04 ? (.3+.3*Math.exp(-(((z+72)/5)**2))+.18*Math.sin(z*.08)**2)*clamp(d/.35) : 0;
  }
  reach(z) { return REACHES.reduce((a,b)=>Math.abs(z-a.z)<Math.abs(z-b.z)?a:b); }
  nearSite(x,z) {
    let best=null;
    for(const s of this.sites){const d=Math.hypot(x-s.x,z-s.z);if(d<2.4&&(!best||d<best.d))best={...s,d};}
    return best;
  }
}
export function takeSample(expedition,site) {
  if(!site||site.method==='sniping'||expedition.bucket.length>=sampleCapacity(expedition))return null;
  const taken=expedition.siteUse[site.id]||0;
  if(taken>=site.capacity)return null;
  const rand=mulberry32(site.seed+taken*7919);
  const gold=assayGold(site.grade*(1-taken/(site.capacity*1.25)),rand);
  const parcel={id:`${site.id}:${taken}`,sourceRegion:'tasmania-west',sourceClaim:expedition.seed,
    x:site.x,z:site.z,siteId:site.id,reach:site.reach,layer:site.kind==='crevice'?'bedrock':'wash',
    clay:site.kind==='crevice'?.12:.025,blackSand:site.kind==='crevice'?5:2,classified:expedition.loadout.includes('classifier'),
    gold,panContents:{gold,picker:0,pickerAt:0,finds:[]}};
  expedition.siteUse[site.id]=taken+1;expedition.bucket.push(parcel);
  return parcel;
}
export function recordRecovery(expedition,sample,result) {
  // PanningUI clears its session first. A session ID guards direct duplicate calls.
  expedition.collectedPans ||= [];
  if(!result.sessionId||expedition.collectedPans.includes(result.sessionId))return false;
  expedition.collectedPans.push(result.sessionId);
  expedition.gold+=result.gold+(result.picker||0);
  const recovered=(result.finds||[]).map((find,i)=>{
    const gem=structuredClone(find);gem.uid=`${sample.sourceRegion||'tasmania-west'}:${result.sessionId}:${i}`;
    const seed=[...gem.uid].reduce((hash,c)=>(hash*31+c.charCodeAt(0))>>>0,0);
    grade(gem,`${result.method==='sieve'?'Wet-sieved':'Panned'} in ${sample.sourceRegion==='ne-tasmania'?'northeast':'western'} Tasmania`,mulberry32(seed));return gem;
  });
  expedition.gems.push(...recovered);
  expedition.tests.push({siteId:sample.siteId,reach:sample.reach,x:sample.x,z:sample.z,gold:result.gold+(result.picker||0),finds:structuredClone(result.finds||[]),method:result.method||'pan',id:result.sessionId});
  return true;
}
// One movement rule is shared by keyboard/touch play and route verification.
export function walkStep(model, player, dx, dz, colliders = []) {
  const canStep = (x,z) => {
    const distance=Math.hypot(x-player.x,z-player.z);
    if(!distance)return true;
    return Math.abs(x)<130 && Math.abs(z)<150 && model.depth(x,z)<.72
      && Math.abs(model.height(x,z)-model.height(player.x,player.z))<distance*.85+.008
      && !colliders.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+.27);
  };
  if(canStep(player.x+dx,player.z+dz)){player.x+=dx;player.z+=dz;return true;}
  let moved=false;
  if(dx&&canStep(player.x+dx,player.z)){player.x+=dx;moved=true;}
  if(dz&&canStep(player.x,player.z+dz)){player.z+=dz;moved=true;}
  return moved;
}
