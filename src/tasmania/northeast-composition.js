import { mulberry32 } from '../noise.js';

// Independent art seed: never advance the sampling/legacy-world random stream.
export function northeastComposition(model,profile,colliders=[]) {
  const {riverX,riverWidth,waterY,nearestTrail,CAMP,TRAILHEAD}=profile;
  const rand=mulberry32(model.seed+420511),stones=[],plants=[],wood=[];
  const bank=(x,z)=>Math.abs(x-riverX(z))-riverWidth(z);
  const workClear=(x,z,r=0)=>nearestTrail(x,z).distance>1.7+r
    && Math.hypot(x-CAMP.x,z-CAMP.z)>5.5+r
    && Math.hypot(x-TRAILHEAD.x,z-TRAILHEAD.z)>7.5+r
    && model.sites.every(s=>Math.hypot(x-s.x,z-s.z)>2.4+r);
  // Rock shoulders frame the three working reaches. The west-bank path and
  // every sampling edge stay open. One record drives geometry and collision.
  for(const centre of [-108,-79,-48,-14,24,61,94,126])for(const side of [-1,1])for(let i=0;i<5;i++) {
    const z=centre+(rand()-.5)*13,r=1.05+rand()*1.65;
    const x=riverX(z)+side*(riverWidth(z)+r*.3+(rand()-.5)*3);
    if(!workClear(x,z,r)||colliders.some(c=>Math.hypot(x-c.x,z-c.z)<r+c.r+.3)||stones.some(c=>Math.hypot(x-c.x,z-c.z)<r+c.r+.1))continue;
    stones.push({x,z,y:model.height(x,z)-.12,r,sy:.48+rand()*.28,rotation:rand()*6.28,name:'granite_'+(i%4),water:waterY(z)});
  }
  // Connected low shelves on the opposite working bank, with occasional
  // narrower runs. Adjacent stones overlap, keeping the exposed mass coherent.
  for(const centre of [-86,-22,48,102])for(let i=0;i<4;i++) {
    const z=centre+(i-1.5)*3.8,r=2.5+rand()*1.1,x=riverX(z)+riverWidth(z)+.2+(i%2)*1.1;
    if(!workClear(x,z,r)||colliders.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+.4))continue;
    stones.push({x,z,y:model.height(x,z)-.1,r,sy:.32+rand()*.12,rotation:.15+rand()*.4,name:'granite_'+(i%4),water:waterY(z)});
  }
  for(let i=0;i<15500;i++) {
    const z=rand()*290-145,x=riverX(z)+(rand()-.5)*116,b=bank(x,z),h=model.height(x,z),t=nearestTrail(x,z).distance;
    const patch=.5+.25*Math.sin(x*.39+Math.sin(z*.11))+.25*Math.sin(z*.27-x*.14);
    if(!workClear(x,z,.18)||stones.some(s=>Math.hypot(x-s.x,z-s.z)<s.r+.2))continue;
    const rotation=rand()*6.28,rank=rand();
    if(b>2&&b<48&&rand()<patch*.75) {
      const tree= i%15===0&&b>3&&t>3.2,shrub=i%11===0&&b>4;
      const name=tree?'treefern_'+(i%3):shrub?'understory_'+(i%3):'fern_'+(i%3);
      plants.push({name,x,z,y:h-.035,scale:tree?.7+rand()*.45:shrub?.55+rand()*.5:.9+rand()*.65,rotation,rank});
    } else if(b>-.6&&b<3&&rank<.7)plants.push({name:'sedge_'+(i%2),x,z,y:h-.04,scale:.65+rand()*.65,rotation,rank});
    if(b<5&&b>-riverWidth(z)*.85&&i%2===0) {
      if(model.sites.some(s=>Math.hypot(x-s.x,z-s.z)<1.1))continue;
      plants.push({name:(i%5===0?'basalt_':'cobble_')+(i%5===0?i%3:i%6),x,z,y:h+.015,scale:.07+rand()*.18,sy:.5+rand()*.4,rotation,rank});
    }
    if(i%53===0&&b>1.8&&b<20&&t>2.5)wood.push({name:'branch_'+(i%3),x,z,y:h+.035,scale:.5+rand()*.6,rotation,rank});
  }
  return {stones,plants,wood};
}

// An existing save can be standing where newly added art has a solid body.
// Only then choose the closest free route point. All progress stays untouched.
export function clearNewScenery(player,model,profile,added,colliders) {
  if(!added.some(c=>Math.hypot(player.x-c.x,player.z-c.z)<c.r+.3))return false;
  const points=[];
  for(let i=1;i<profile.ROUTE.length;i++) {
    const a=profile.ROUTE[i-1],b=profile.ROUTE[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));
    for(let k=0;k<=n;k++){const t=k/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      if(model.depth(x,z)<.72&&colliders.every(c=>Math.hypot(x-c.x,z-c.z)>c.r+.4))points.push({x,z});}
  }
  points.sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z));
  if(!points.length)return false;Object.assign(player,points[0]);return true;
}
