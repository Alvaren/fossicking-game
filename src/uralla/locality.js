import { smoothstep, mulberry32 } from '../noise.js';
import { pathDistance } from '../paths.js';
import { URALLA_COURSE, URALLA_CAMP, URALLA_ACCESS } from './course.js';

export const ACCESS = URALLA_ACCESS;
const stationAt = (c,index) => c.station(URALLA_COURSE[index][0],URALLA_COURSE[index][1]);
export function riverPath(c) {
  const points=[];
  for(let s=c.course.min+7;s<c.course.max-5;s+=3) {
    const p=c.point(s,-c.halfWidth(s)-5.8);
    // Keep the west/inside path on dry ground where the bend returns nearby.
    if(Math.abs(p.x)<108&&Math.abs(p.z)<108)points.push([p.x,p.z]);
  }
  return points;
}
export function campPath(c) {
  const s=c.station(URALLA_CAMP.x,URALLA_CAMP.z),p=c.point(s,-c.halfWidth(s)-5.8);
  return [[URALLA_CAMP.x,URALLA_CAMP.z],[-12,69],[p.x,p.z]];
}
export function routeDistance(x,z,c) {
  return Math.min(pathDistance(x,z,ACCESS),pathDistance(x,z,c.reservePath),pathDistance(x,z,c.reserveCampPath));
}
export function reserveSites(c) {
  const b=stationAt(c,15),p=stationAt(c,3),s=stationAt(c,10);
  const sandy=c.point(s,Math.sign(c.curvature(s))*c.halfWidth(s)*.7);
  return {
    boulderReach:{...c.point(b),label:'Boulder Reach',known:true,colour:'#b3afa2'},
    reedPool:{...c.point(p),label:'Reed Pool',known:true,colour:'#648a83'},
    sandyShallows:{...sandy,label:'Sandy Shallows',known:true,colour:'#bcad8a'},
  };
}
export function reserveBoulders(c,seed) {
  const rand=mulberry32(seed+40193),stones=[];
  // Irregular clusters at the photographed/aerial rocky transitions. The
  // broad hooked bar and longer pool remain open. Individual stones are art
  // interpretation; these are the exact records used by World and flow.
  for(const [index,count,side] of [[0,9,1],[5,8,1],[6,7,-1],[13,7,-1],[14,9,1],[15,9,-1],[18,7,1]]) {
    const centre=stationAt(c,index);
    for(let i=0,tries=0;i<count&&tries<80;tries++) {
      const s=centre+(rand()-.5)*15,r=1.5+rand()*1.7;
      const n=(rand()<.72?side:-side)*(c.halfWidth(s)+.5-r*.38)+ (rand()-.5)*2.5;
      const p=c.point(s,n);
      if(Math.abs(p.x)>105||Math.abs(p.z)>105||routeDistance(p.x,p.z,c)<r*1.265+.6||
        stones.some(b=>Math.hypot(b.x-p.x,b.z-p.z)<(b.r+r)*.93))continue;
      stones.push({x:p.x,z:p.z,r,bearing:rand()*Math.PI,sy:.65+rand()*.3});i++;
    }
  }
  for(const index of [1,4,8,11,16]) {
    const s=stationAt(c,index),p=c.point(s,c.halfWidth(s)*.8);
    stones.push({x:p.x,z:p.z,r:.65+rand()*.6,bearing:rand()*3,sy:.7});
  }
  return stones;
}
export function reserveHeight(x,z,n2,c) {
  const L=c.local(x,z,{}),bank=L.d-L.w;
  // Surrounding relief is continuous in world space. Even distance to the
  // nearest reach has a cusp between two arms of a hooked bend: using it for
  // terrace height creates artificial radial ridges on the topographic map.
  const broad=2.6+1.8*n2(x*.009+7,z*.009);
  const terrace=.0045*z+broad+n2(x*.035,z*.035)*.3+n2(x*.13,z*.13)*.065;
  const water=c.waterY(L.s);
  const channel=water+c.bedRel(L.nIn/L.w,L.a,c.depth(L.s),L.w)+n2(x*.23,z*.23)*.045;
  const blend=smoothstep(2,7,bank),height=Math.min(terrace,channel)*(1-blend)+terrace*blend;
  return height-.04*(1-smoothstep(.4,1.5,routeDistance(x,z,c)));
}
export function reserveColour(x,z,h,orig,topsoil,n2,c) {
  const L=c.local(x,z,{}),bank=L.d-L.w,t=n2(x*.08,z*.08)*.035;
  const trail=1-smoothstep(.8,2.1,routeDistance(x,z,c));
  const sand=(1-smoothstep(1,6,bank))*.85;
  let rgb=[.48+t,.46+t,.35+t];
  const mix=(b,k)=>rgb=rgb.map((v,i)=>v+(b[i]-v)*k);
  mix([.70,.65,.53],Math.max(trail*.8,sand));
  mix([.36,.35,.29],1-smoothstep(c.waterY(L.s)-.15,c.waterY(L.s)+.12,h));
  const dug=Math.max(0,orig-h);
  if(dug>.005)mix(dug>topsoil?[.57,.54,.46]:[.32,.27,.20],smoothstep(.005,.09,dug));
  return rgb.map(v=>Math.pow(v,2.2));
}
