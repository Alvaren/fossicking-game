import { composeNewEngland } from '../newengland/composition.js';
import { routeDistance } from './locality.js';

// Same NSW meadow/ground/camp composition, with reserve path clearance and
// local reed beds. No new blocking decoration; solid boulders belong to World.
export function composeUralla(context) {
  const {terrain,mask,workingMask,rng,add}=context,c=terrain.creek;
  const clear=base=>({...base,blocked:(x,z,r=0)=>routeDistance(x,z,c)<1.3+r||base.blocked(x,z,r)});
  const safeMask=clear(mask),safeWork=clear(workingMask);
  composeNewEngland({...context,mask:safeMask,workingMask:safeWork});
  // Denser tuft islands occupy the moist shoulders of the boulder reaches.
  // Keep the original bank path and open sampling edges between each island.
  for(let i=0;i<2200;i++) {
    const station=c.course.min+rng()*(c.course.max-c.course.min),side=rng()<.5?-1:1;
    const {x,z}=c.point(station,side*(c.halfWidth(station)+1+rng()*8));
    const y=terrain.getHeight(x,z);
    if(y<c.surfaceY(z,x)+.06||safeMask.blocked(x,z,.25))continue;
    if(Math.sin(z*.35+Math.cos(x*.7))<-.15)continue;
    add(`grass_${i%3}`,{x,z,y,scale:.65+rng()*.55,sy:.7+rng()*.3,lift:-.03,radius:.25,rotation:rng()*6.28,rank:rng()*.8});
    if(i%17===0)add(`shrub_${i%3}`,{x:x+.4,z:z-.2,y,scale:.45+rng()*.3,lift:-.04,radius:.3,rotation:rng()*6.28,rank:rng()*.7});
  }
  for(let i=0;i<3100;i++) {
    const pool=terrain.sources.reedPool,centre=c.station(pool.x,pool.z);
    const station=centre-27+rng()*52,side=i%6===0?-1:1;
    const margin=-.4+rng()*2.1,{x,z}=c.point(station,side*(c.halfWidth(station)+margin));
    const y=terrain.getHeight(x,z),depth=c.surfaceY(z,x)-y;
    if(depth>.14||depth<-.7||safeMask.blocked(x,z,.2))continue;
    const patch=.5+.5*Math.sin(z*.24+Math.sin(x));if(rng()>patch)continue;
    add(`sedge_${i%2}`,{x,z,y,scale:.7+rng()*.65,sy:1.7+rng()*.6,sx:.7,sz:.7,lift:-.04,radius:.18,rotation:rng()*6.28,rank:rng()*.7});
  }
}
