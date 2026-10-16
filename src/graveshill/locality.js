import { coverAt } from '../newengland/groundcover.js';
import { smoothstep, mulberry32 } from '../noise.js';

// Compressed relationships from the official Graves Hill map, north = -Z.
// A dry-season visit, not surveyed coordinates or a prediction of creek flow.
export const ROAD = [[-125,87],[-74,65],[-38,51],[8,40],[48,12],[82,-12],[126,-27]];
export const RUBY = [[-130,61],[-106,27],[-91,-9],[-73,-25],[-42,-24],[-18,-61],[19,-55],[43,-83],[78,-77],[115,-94],[146,-109]];
export const SITES = {
  clifford:{x:12,z:54,label:'Mount Clifford diggings',known:true,colour:'#9c6845'},
  millionaires:{x:25,z:-36,label:'Millionaires Hill',known:true,colour:'#81503a'},
  granite:{x:5,z:-63,label:'Granite outcrop',known:true,colour:'#b5a992'},
  graves:{x:93,z:-43,label:'Graves Hill',known:true,colour:'#92754a'},
};
export function pathDistance(x,z,path) {
  let best=Infinity;
  for(let i=1;i<path.length;i++) {
    const [ax,az]=path[i-1],[bx,bz]=path[i],dx=bx-ax,dz=bz-az;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
    best=Math.min(best,Math.hypot(x-ax-dx*t,z-az-dz*t));
  }
  return best;
}
const mound=(x,z,cx,cz,rx,rz)=>Math.exp(-(((x-cx)/rx)**2+((z-cz)/rz)**2));
export function localityHeight(x,z,n2) {
  const hills=2.5*mound(x,z,12,56,52,44)+3.2*mound(x,z,33,-33,38,31)+6.4*mound(x,z,99,-47,38,45);
  const horizon=10*mound(x,z,-170,-220,95,100)+7*mound(x,z,240,-180,150,100);
  const texture=n2(x*.027+8,z*.027)*.24+n2(x*.11,z*.11)*.055;
  const creek=pathDistance(x,z,RUBY),track=pathDistance(x,z,ROAD);
  const channel=.8*Math.exp(-((creek/3.8)**2))+.18*Math.exp(-((creek/8)**2));
  const rut=.08*Math.exp(-(((track-.84)/.24)**2));
  return 2+hills+horizon+texture-channel-rut;
}
export function washWeight(x,z) {
  return Math.min(1, .8*mound(x,z,12,54,31,28)+.7*mound(x,z,25,-36,30,21)+.5*mound(x,z,83,-17,17,29));
}
export function localityGeology(x,z,h,n2) {
  const north=mound(x,z,25,-36,27,22),gr=mound(x,z,5,-63,9,10);
  const eastern=mound(x,z,83,-17,16,28);
  const thickness=(.35-.10*north+1.25*eastern+(n2(x*.08,z*.08)+1)*.025)*(1-gr*.91);
  return {bedrock:h-thickness,topsoil:Math.min(thickness,.045+(n2(x*.11+9,z*.11)+1)*.018)};
}
export function localityWorkings(seed) {
  const r=mulberry32(seed+81951),pits=[];
  for(const [cx,cz,count,depth] of [[12,54,17,.34],[25,-36,12,.24],[82,-12,6,.65]]) {
    for(let i=0;i<count;i++) {
      const a=r()*Math.PI*2,d=4+Math.sqrt(r())*19,x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d;
      if(pathDistance(x,z,ROAD)<4||Math.hypot(x-5,z+63)<13)continue;
      pits.push({x,z,r:1.1+r()*1.3,depth:depth*(.7+r()*.3),side:r()<.5?-1:1});
    }
  }
  return pits;
}
export function localityRock(x,z,v) {
  if(Math.hypot(x-5,z+63)<14)return 'granite';
  return v<.18?'quartz':'sandstone';
}
export function localityColour(x,z,h,orig,topsoil,n2,workings=[]) {
  const north=mound(x,z,25,-36,25,21),track=1-smoothstep(1.5,2.5,pathDistance(x,z,ROAD));
  const gr=mound(x,z,5,-63,14,14),noise=n2(x*.09,z*.09)*.045;
  let c=[.48-.10*north+noise,.32-.08*north+noise,.20-.03*north+noise];
  const mix=(b,k)=>c=c.map((v,i)=>v+(b[i]-v)*k);
  const cover=smoothstep(.32,.78,coverAt(x,z));
  mix([.41,.40,.25],cover*.48*(1-track));
  mix([.66,.39,.23],track*.9);
  mix([.60,.54,.43],gr*.7);
  mix([.49,.40,.30],(1-smoothstep(2,6,pathDistance(x,z,RUBY)))*.7);
  for(const p of workings) {
    const d=Math.hypot(x-p.x,z-p.z)/p.r,spoil=Math.hypot(x-p.x-p.side*p.r*1.65,z-p.z)/p.r;
    const worked=1-smoothstep(.65,1.3,Math.min(d,spoil));
    if(worked>0)mix(d<.85?[.39,.29,.20]:[.62,.47,.32],worked*.85);
  }
  const dug=Math.max(0,(orig||h)-h);
  if(dug>.005)mix(dug>topsoil?[.49,.36,.24]:[.31,.21,.14],smoothstep(.005,.09,dug));
  return c.map(v=>Math.pow(v,2.2));
}
