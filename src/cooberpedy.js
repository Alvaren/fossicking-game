import { mulberry32, smoothstep } from './noise.js';

export const DUGOUT_SITES=[{x:-55,z:-48},{x:52,z:-15},{x:-15,z:55}];
export const DUGOUT_DEPTH=4.8;
export const cooberBaseHeight=(x,z,n2)=>4+n2(x*.014,z*.014)*.65+n2(x*.046+31,z*.046)*.12;
export function cooberHeight(x,z,n2) {
  let h=cooberBaseHeight(x,z,n2);
  for(const site of DUGOUT_SITES) {
    const dx=x-site.x,dz=z-site.z;
    // A descending access cut in the existing ground, never a hill built over
    // a room. The occupied rooms begin behind the buried end of this trench.
    const sides=1-smoothstep(1.9,2.75,Math.abs(dx));
    const ramp=smoothstep(-13,-1,dz)*(1-smoothstep(2.1,2.85,dz));
    const floor=cooberBaseHeight(site.x,site.z,n2)-DUGOUT_DEPTH;
    h+=(floor-h)*sides*ramp;
  }
  return h;
}
export function dugoutReserved(x,z,r=0) {
  return DUGOUT_SITES.some(s=>Math.abs(x-s.x)<17+r&&z>s.z-17-r&&z<s.z+34+r);
}

// Metre-grid floor plans. Rooms join through real openings in their shared
// boundary; rendering and collision consume the same occupied cells.
const plans = [
  { id:'lantern', name:'Lantern House', kind:'home', height:3.1,
    rooms:[[-1,2,3,21],[-8,-2,4,11],[-2,-1,6,9],[3,9,4,11],[2,3,6,9],[-8,-2,14,21],[-2,-1,16,19],[3,8,14,20],[2,3,16,19]],
    labels:[['Lounge',-4.5,7.5],['Kitchen',6,7.5],['Bedroom',-5,17],['Specimen room',5.5,17]],
    props:[['sofa',-6.8,7,0],['table',-4.3,7,0],['rug',-4.8,7,0],['kitchen',7.9,7.4,0],['table',5.2,8.5,0],['bed',-6.3,18,0],['shelf',-3,20,0],['display',6.9,17,0]],
    lamps:[[-5,2.7,7],[6,2.7,7],[-5,2.7,17],[5.5,2.7,17],[.5,2.65,3],[.5,2.65,12],[.5,2.65,20]] },
  { id:'no4', name:'Old No. 4 dugout', kind:'home', height:2.8,
    rooms:[[-1,2,3,17],[-6,-2,4,10],[-2,-1,6,8],[3,8,5,12],[2,3,7,9],[-5,3,16,22]],
    labels:[['Old kitchen',-4,7],['Sleeping alcove',5,8],['Storeroom',-1,19]],
    props:[['table',-4.4,7,0],['stove',-5.3,4.9,0],['bed',6.3,9,0],['shelf',-3.8,20,0],['crates',1.4,20,0]],
    lamps:[[.5,2.4,3],[-4,2.4,7],[5,2.4,8],[-1,2.4,19],[.5,2.4,12]] },
  { id:'workings', name:'Colour Rise workings', kind:'mine', height:2.65,
    rooms:[[-1,2,3,28],[-11,-1,9,12],[-15,-10,7,15],[2,12,18,21],[11,16,16,25],[-4,5,27,33]],
    labels:[['West gallery',-12,11],['East gallery',13,21],['Opal face',.5,30]],
    props:[['crates',-13.5,8,0],['barrow',14.4,17.3,0],['tools',-2.8,30,0]],
    lamps:[[.5,2.3,3],[.5,2.3,10],[.5,2.3,19],[.5,2.3,27],[-8,2.3,10.5],[10,2.3,19.5],[.5,2.3,31]] },
];
export const DUGOUTS = plans.map(plan => {
  const cells = new Set();
  for (const [x0,x1,z0,z1] of plan.rooms) for(let x=x0;x<x1;x++) for(let z=z0;z<z1;z++) cells.add(`${x},${z}`);
  const edges=[];
  for(const cell of cells) {
    const [x,z]=cell.split(',').map(Number);
    if(!cells.has(`${x-1},${z}`))edges.push({x,z,dx:0,dz:1,nx:1,nz:0});
    if(!cells.has(`${x+1},${z}`))edges.push({x:x+1,z:z+1,dx:0,dz:-1,nx:-1,nz:0});
    if(!cells.has(`${x},${z-1}`))edges.push({x:x+1,z,dx:-1,dz:0,nx:0,nz:1});
    if(!cells.has(`${x},${z+1}`))edges.push({x,z:z+1,dx:1,dz:0,nx:0,nz:-1});
  }
  return {...plan,cells,edges};
});

export function walkable(plan,x,z,r=.28,obstacles=[]) {
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  // Check the whole circular footprint against every touched solid grid cell.
  for(let ix=Math.floor(x-r);ix<=Math.floor(x+r);ix++)for(let iz=Math.floor(z-r);iz<=Math.floor(z+r);iz++) {
    if(plan.cells.has(`${ix},${iz}`))continue;
    const dx=x-Math.max(ix,Math.min(ix+1,x)),dz=z-Math.max(iz,Math.min(iz+1,z));
    if(dx*dx+dz*dz<r*r+1e-8)return false;
  }
  return !obstacles.some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r);
}
export function moveInDugout(plan,from,to,obstacles=[]) {
  let {x,z}=from;
  if(!walkable(plan,x,z,.28,obstacles)) {x=.5;z=3.5;}
  const dx=to.x-x,dz=to.z-z,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));
  if(!Number.isFinite(steps)||steps>1000)return {x,z};
  for(let i=0;i<steps;i++) {
    if(walkable(plan,x+dx/steps,z,.28,obstacles))x+=dx/steps;
    if(walkable(plan,x,z+dz/steps,.28,obstacles))z+=dz/steps;
  }
  return {x,z};
}

const faces=[[-14.96,10,1,0],[-14.96,13,1,0],[-12.5,14.96,0,-1],[-10.8,7.04,0,1],
  [15.96,19,-1,0],[15.96,23,-1,0],[13,24.96,0,-1],[11.04,23,1,0],[-2,32.96,0,-1],[1,32.96,0,-1],[4.96,30,-1,0],[3,27.04,0,1]];
export function opalFaces(seed) {
  const r=mulberry32(seed*149+71);
  return faces.map(([x,z,nx,nz],i)=>{
    const chance=r(),variety=chance<.2?null:chance<.57?'potch':chance<.83?'milky opal':chance<.98?'crystal opal':'opalised shell';
    return {id:820000+i,x,y:1.15+(r()-.5)*.35,z,nx,nz,
      crystal:variety?{id:820000+i,variety,len:.018+r()*.025,damage:0,broken:false,bright:1+Math.floor(r()*5),pattern:'pinfire',patternMult:1,ax:0,ay:1,az:0}:null};
  });
}

export function restoreOpalWork(saved,faces) {
  const ids=new Set(faces.map(f=>f.id));
  return new Set((Array.isArray(saved?.taken)?saved.taken:[]).filter(id=>ids.has(id)));
}
export function takeOpalFace(face,taken) {
  if(!face||taken.has(face.id))return null;
  taken.add(face.id);
  return {crystal:face.crystal?{...face.crystal}:null};
}
