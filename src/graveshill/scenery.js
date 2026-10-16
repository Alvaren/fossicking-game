import { pathDistance, ROAD, RUBY, washWeight } from './locality.js';
import { coverAt } from '../newengland/groundcover.js';

export function composeGravesHill({terrain,mask,workingMask,rng,add}) {
  const pits=terrain.workings;
  const bare=(x,z)=>pathDistance(x,z,ROAD)<2.25||pits.some(p=>Math.hypot(x-p.x,z-p.z)<p.r*1.35);
  const put=(name,x,z,scale,options={})=>{
    const radius=options.radius??scale*.4;
    if(!terrain.inside(x,z)||(options.surface?workingMask:mask).blocked(x,z,radius))return;
    add(name,{x,z,y:terrain.getHeight(x,z),scale,radius,lift:-.025,rotation:rng()*Math.PI*2,rank:rng(),...options});
  };
  // Ground cover seen between open trees, with real bare tracks and diggings.
  for(let i=0;i<38000;i++) {
    const x=-111+rng()*222,z=-111+rng()*222,patch=coverAt(x,z),channel=pathDistance(x,z,RUBY);
    if(bare(x,z)||channel<2.4||rng()> .20+patch*.65)continue;
    put('grass_'+i%3,x,z,.32+rng()*.46,{sy:.52+rng()*.40});
    if(i%110===0&&patch>.65)put('shrub_'+i%3,x,z,.32+rng()*.42,{radius:.45});
  }
  // Billy cobbles and angular silicified stones are mixed into the wash, not
  // arranged into a reef. Low scatter leaves small recoverable finds readable.
  for(let i=0;i<5300;i++) {
    const x=-110+rng()*220,z=-110+rng()*220,track=pathDistance(x,z,ROAD);
    if(track<1.6||rng()>.14+washWeight(x,z)*.7)continue;
    const scale=.045+Math.pow(rng(),2)*.22;
    put((i%7===0?'quartzfloat_':'cobble_')+i%(i%7===0?3:6),x,z,scale,{surface:true,sy:.72,radius:.11,lift:-scale*.24});
  }
  // Separate coarse rejects and finer grit beside each shallow worked patch.
  for(const pit of pits) {
    for(let k=0;k<45;k++) {
      const a=rng()*Math.PI*2,r=Math.sqrt(rng())*pit.r*.75;
      const x=pit.x+pit.side*pit.r*1.65+Math.cos(a)*r,z=pit.z+Math.sin(a)*r;
      const s=.055+rng()*.19;
      put((k%6===0?'quartzfloat_':'cobble_')+k%(k%6===0?3:6),x,z,s,{surface:true,sy:.72,radius:.10,lift:-s*.15});
    }
    for(let k=0;k<32;k++) {
      const a=rng()*6.28,r=Math.sqrt(rng())*pit.r*.6;
      put('slab_'+k%3,pit.x-pit.side*pit.r*1.2+Math.cos(a)*r,pit.z+.8+Math.sin(a)*r,.025+rng()*.035,{surface:true,sy:.4,radius:.06});
    }
  }
  for(let i=0;i<300;i++) {
    const x=-105+rng()*210,z=-105+rng()*210;
    if(!bare(x,z)&&coverAt(x,z)>.52)put('branch_'+i%3,x,z,.25+rng()*.55,{radius:.16,lift:-.04});
  }
  // The dry Ruby Creek bed has sand and small lag gravel; no reeds or foam.
  for(let i=0;i<2400;i++) {
    const x=-110+rng()*220,z=-110+rng()*220;
    if(pathDistance(x,z,RUBY)>4)continue;
    put('cobble_'+i%6,x,z,.06+rng()*.21,{surface:true,sy:.64,radius:.13,lift:-.04});
  }
}
