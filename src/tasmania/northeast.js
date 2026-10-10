import { makeNoise, mulberry32 } from '../noise.js';
import { sampleCapacity } from '../regions.js';
import { walkStep, recordRecovery, nearestTrail as trailDistance } from './model.js';
export { walkStep, recordRecovery };
export const northeast = true;
export const riverX = z => 13*Math.sin(z*.019)+3*Math.sin(z*.048);
export const riverWidth = z => 7+1.6*Math.sin(z*.023)**2;
export const waterY = z => 4-z*.012;
export const TRAILHEAD = {x:-43,z:112,y:8.2};
export const CAMP = {x:riverX(62)-riverWidth(62)-10,z:62,y:waterY(62)+1.25};
export const REACHES = [
  {id:'granite-bend',name:'Granite Bend',z:62,description:'Rounded granite gravel on an inside bend. Classify the coarse wash, then compare the loose bar with the darker basal wash.'},
  {id:'tin-terrace',name:'Tin Terrace',z:-8,description:'A low terrace above the river. Dense black spinel and cassiterite occur in the wash; a heavy concentrate is not a guarantee of sapphire.'},
  {id:'basalt-run',name:'Basalt Run',z:-82,description:'Dark basalt cobbles mixed into the river gravel. Look for small sapphires and zircon among the heavies after settling and flipping the sieve.'},
];
const bank = z => ({x:riverX(z)-riverWidth(z)-4,z,y:waterY(z)+.6});
export const ROUTE = [TRAILHEAD,{x:-40,z:94,y:6.4},{x:-29,z:77,y:5.2},CAMP,
  ...[55,35,15,-5,-25,-45,-65,-85,-103].map(bank)];
export const nearestTrail = (x,z) => trailDistance(x,z,ROUTE);
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>{n=clamp(n);return n*n*(3-2*n);};
export class Catchment {
  constructor(seed) {
    this.seed=seed;this.noise=makeNoise(seed).noise2;this.snipingPockets=[];this.sites=[];
    const rand=mulberry32(seed);
    for(const reach of REACHES)for(let i=0;i<6;i++){
      const z=reach.z+(i-2.5)*3.4,basal=i%2===1;
      this.sites.push({id:`${reach.id}-${i}`,reach:reach.id,x:riverX(z)-riverWidth(z)-.6,z,
        kind:basal?'basal':'bar',capacity:basal?3:5,seed:Math.floor(rand()*1e9),
        richness:(basal?1.2:.45)*(.3+rand()*1.3),clay:basal?.18:.025});
    }
  }
  height(x,z) {
    const d=Math.abs(x-riverX(z)),w=riverWidth(z),n=this.noise(x*.035,z*.035);
    let h=d<w?waterY(z)-1.15*(1-(d/w)**2):waterY(z)+.18+(d-w)*.095+Math.max(0,d-w-20)*.04+n*Math.min(1.1,(d-w)*.06);
    const trail=nearestTrail(x,z),t=ease((6-trail.distance)/4.7);h+=(trail.y-h)*t;
    for(const [p,r] of [[CAMP,5],[TRAILHEAD,8]])h+=(p.y-h)*ease((r-Math.hypot(x-p.x,z-p.z))/3);
    return h;
  }
  depth(x,z){return Math.abs(x-riverX(z))<riverWidth(z)?Math.max(0,waterY(z)-this.height(x,z)):0;}
  current(x,z){return this.depth(x,z)>.04?.25:0;}
  reach(z){return REACHES.reduce((a,b)=>Math.abs(z-a.z)<Math.abs(z-b.z)?a:b);}
  nearSite(x,z){let best=null;for(const s of this.sites){const d=Math.hypot(x-s.x,z-s.z);if(d<2.4&&(!best||d<best.d))best={...s,d};}return best;}
}
// The injected assay is the game's existing gem generator, seeded once per parcel.
// Keeping it out of the terrain model makes depletion and route tests DOM-free.
export function takeSample(expedition,site,assay) {
  if(!site||expedition.bucket.length>=sampleCapacity(expedition))return null;
  const taken=expedition.siteUse[site.id]||0;if(taken>=site.capacity)return null;
  const rand=mulberry32(site.seed+taken*7919),rich=site.richness*(1-taken/(site.capacity*1.3));
  const sample={id:`${site.id}:${taken}`,sourceRegion:'ne-tasmania',sourceClaim:expedition.seed,
    x:site.x,z:site.z,siteId:site.id,reach:site.reach,layer:'wash',clay:site.clay,
    blackSand:site.kind==='basal'?6:2,gold:0,sapphire:rich*.65,zircon:rich*1.5,spinel:rich*2.3,topaz:rich*.08,
    classified:expedition.loadout.includes('classifier'),sizeBias:.65};
  sample.panContents=assay(sample,rand);
  expedition.siteUse[site.id]=taken+1;expedition.bucket.push(sample);return sample;
}
