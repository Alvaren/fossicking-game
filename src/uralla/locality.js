import { smoothstep, mulberry32 } from '../noise.js';
import { pathDistance } from '../paths.js';

// Reference-led, compressed reserve. Names below describe game reaches;
// they are not claimed to be official Wooldridge feature names.
export const ACCESS = [[-120,67],[-80,45],[-49,21],[-28,0]];
export function riverPath(c) {
  const points=[];
  for(let z=-102;z<=105;z+=9)points.push([c.cx(z)-(c.halfWidth(z)+5)*Math.sqrt(1+c.dcx(z)**2),z]);
  return points;
}
export function routeDistance(x,z,c) {
  return Math.min(pathDistance(x,z,ACCESS),pathDistance(x,z,c.reservePath),pathDistance(x,z,[[-28,0],[c.cx(0)-c.halfWidth(0)-5,0]]));
}
export function reserveSites(c) {
  return {
    boulderReach:{x:c.cx(53),z:53,label:'Boulder Reach',known:true,colour:'#b3afa2'},
    reedPool:{x:c.cx(-27),z:-27,label:'Reed Pool',known:true,colour:'#648a83'},
    sandyShallows:{x:c.cx(4)-c.halfWidth(4),z:4,label:'Sandy Shallows',known:true,colour:'#bcad8a'},
  };
}
export function reserveBoulders(c,seed) {
  const rand=mulberry32(seed+40193),stones=[];
  // Large channel-edge blocks cluster into reaches, leaving a winding water
  // slot and the west-bank footpath clear. Same records drive wakes/colliders.
  for(const [start,end] of [[31,83],[-91,-60]]) {
    for(let z=start;z<end;z+=5.7+rand()*2) {
      for(const side of [-1,1]) {
        const pz=z+(rand()-.5)*2.3,r=1.65+rand()*1.65;
        const w=c.halfWidth(pz),stretch=Math.sqrt(1+c.dcx(pz)**2);
        const x=c.cx(pz)+side*(w+.15-r*.34)*stretch;
        stones.push({x,z:pz,r,bearing:.3+rand()*.7,sy:.68+rand()*.25});
        if(rand()<.45)stones.push({x:x+side*(r+1.2),z:pz+2.7,r:.75+rand()*.7,bearing:rand(),sy:.7});
      }
    }
  }
  for(const z of [44,63,77])stones.push({x:c.cx(z)+.6*Math.sin(z),z,r:1.35+rand()*.55,bearing:.4+rand()*.4,sy:.8});
  // Sparse emergent stones keep the broad pool recognisable as open water.
  for(const [z,side] of [[-38,1],[-17,1],[10,-1],[21,1],[96,-1]]) {
    const r=.65+rand()*.8;stones.push({x:c.cx(z)+side*c.halfWidth(z)*.8,z,r,bearing:rand(),sy:.75});
  }
  return stones;
}
export function reserveHeight(x,z,n2,c) {
  const L=c.local(x,z,{}),bank=L.d-L.w;
  const broad=1.0+Math.min(13,Math.max(0,bank)*.13)+3.4*(n2(x*.009+7,z*.009)+.5)*smoothstep(10,75,bank);
  const terrace=c.waterY(z)+broad+n2(x*.035,z*.035)*.3+n2(x*.13,z*.13)*.065;
  const channel=c.waterY(z)+c.bedRel(L.nIn/L.w,L.a,c.depth(z),L.w)+n2(x*.23,z*.23)*.045;
  return Math.min(terrace,channel)-.04*(1-smoothstep(.4,1.5,routeDistance(x,z,c)));
}
export function reserveColour(x,z,h,orig,topsoil,n2,c) {
  const L=c.local(x,z,{}),bank=L.d-L.w,t=n2(x*.08,z*.08)*.035;
  const trail=1-smoothstep(.8,2.1,routeDistance(x,z,c));
  const sand=(1-smoothstep(1,6,bank))*.85;
  let rgb=[.48+t,.46+t,.35+t];
  const mix=(b,k)=>rgb=rgb.map((v,i)=>v+(b[i]-v)*k);
  mix([.70,.65,.53],Math.max(trail*.8,sand));
  mix([.36,.35,.29],1-smoothstep(c.waterY(z)-.15,c.waterY(z)+.12,h));
  const dug=Math.max(0,orig-h);
  if(dug>.005)mix(dug>topsoil?[.57,.54,.46]:[.32,.27,.20],smoothstep(.005,.09,dug));
  return rgb.map(v=>Math.pow(v,2.2));
}
