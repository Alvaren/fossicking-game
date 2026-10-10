// Finite pocket accounting. Rendering and input do not own or re-assay gold.
import { mulberry32 } from './noise.js';
const clamp = (n,a=0,b=1) => Math.max(a,Math.min(b,n));
export const SNIPING_TOOLS = ['fan','pick','snuffer'];
export const SNIPING_LABELS = {fan:'Fan',pick:'Crevice pick',snuffer:'Snuffer'};
export const SNIPING_FORCES = {gentle:.32,steady:.56,firm:1};
export function refreshPocket(p) {
  p.remainingGold=p.cells.reduce((s,c)=>s+c.gold,0);
  p.remainingMaterial=p.cells.reduce((s,c)=>s+c.loose+c.bound,0);
  p.recoveredGold=p.cells.reduce((s,c)=>s+c.recovered,0);
  p.lostGold=p.cells.reduce((s,c)=>s+c.lost,0);
  return p;
}
export function preparePocket(site, previous = {}) {
  if(previous.version===1&&Array.isArray(previous.cells))return refreshPocket(previous);
  const rand=mulberry32(site.seed^0x51a1),material=Math.max(0,previous.remainingMaterial??site.capacity);
  const gold=Math.max(0,previous.remainingGold??site.gold);
  // Guaranteed empty cracks among promising traps; the assay is shared, not rolled again.
  const weights=Array.from({length:12},(_,i)=>i%4===1?0:.3+rand());
  const weightSum=weights.reduce((s,n)=>s+n,0);let assigned=0;
  const last=weights.findLastIndex(n=>n>0);
  const cells=weights.map((weight,i)=>{
    const mass=weight?(i===last?gold-assigned:gold*weight/weightSum):0;assigned+=mass;
    const share=material/12,bound=share*(.22+rand()*.28);
    return {id:`${site.id}:${i}`,x:(i%4-1.5)*.66+(rand()-.5)*.18,z:(Math.floor(i/4)-1)*.68+(rand()-.5)*.14,
      angle:(rand()-.5)*.8,capacity:Math.max(1e-6,site.capacity/12),
      loose:share-bound,bound,gold:mass,initialGold:mass,recovered:0,lost:0,progress:0,inspected:false};
  });
  return refreshPocket({...previous,version:1,id:site.id,initialGold:gold,initialMaterial:material,removedMaterial:0,cloud:0,cells});
}
export function ensureSniping(expedition, sites) {
  expedition.snipingPockets ||= {};
  for(const site of sites)expedition.snipingPockets[site.id]=preparePocket(site,expedition.snipingPockets[site.id]);
}
export const exposed = c => c.loose+c.bound<c.capacity*.045;
export function automaticSniping(p) {
  const c=p.cells.find(c=>!c.inspected);
  if(!c||p.cloud>.48)return {tool:'fan',target:-1,force:.32};
  return {target:p.cells.indexOf(c),tool:c.loose>c.capacity*.025?'fan':c.bound>c.capacity*.019?'pick':'snuffer',force:.32};
}
export function stepSniping(p, action, dt, difficulty = 'realistic') {
  if(!Number.isFinite(dt)||dt<=0)return {gold:0};
  dt=Math.min(dt,.1);
  p.cloud=clamp((p.cloud||0)*Math.exp(-dt*.24));
  if(!action)return {gold:0};
  const {tool,target}=action,c=p.cells[target];
  if(!c||!SNIPING_TOOLS.includes(tool))return {gold:0,reason:'Aim at a bedrock crack.'};
  const force=clamp(Number.isFinite(action.force)?action.force:.32),lossThreshold=difficulty==='prospector'?.88:.68;
  if(p.cloud>.78)return {gold:0,reason:'Let the silt settle before working the crack.'};
  let removed=0;
  if(tool==='fan') {
    removed=Math.min(c.loose,c.capacity*dt*(.15+force*.7));c.loose-=removed;
    // Forceful fanning can carry liberated fine gold out with the loose cover.
    if(difficulty!=='easy'&&force>lossThreshold&&(c.loose+c.bound)<c.capacity*.28) {
      const lost=Math.min(c.gold,c.gold*dt*(force-lossThreshold)*1.5);c.gold-=lost;c.lost+=lost;
    }
  } else if(tool==='pick') {
    if(c.loose>c.capacity*.09)return {gold:0,reason:'Fan aside the loose gravel to reach the packed crack.'};
    removed=Math.min(c.bound,c.capacity*dt*(.18+force*.5));c.bound-=removed;
  } else {
    if(!exposed(c))return {gold:0,reason:c.loose>c.capacity*.09?'Loose gravel still covers the crack.':'Work the compacted fill with the crevice pick.'};
    if(p.cloud>.55)return {gold:0,reason:'Wait until you can see the bottom clearly.'};
    c.progress=clamp(c.progress+dt*1.3);
    if(c.progress>=1&&!c.inspected){
      const recovered=c.gold;c.recovered+=recovered;c.gold=0;c.inspected=true;refreshPocket(p);
      return {gold:recovered,completed:true,cellId:c.id,reason:recovered?`Recovered ${(recovered*1000).toFixed(2)} mg.`:'No gold in this crack.'};
    }
  }
  p.removedMaterial+=removed;
  p.cloud=clamp(p.cloud+removed/c.capacity*(tool==='pick'?.25:.16)*(1+force*force*6)*(difficulty==='easy'?.6:difficulty==='prospector'?.8:1));
  refreshPocket(p);
  return {gold:0,removed,reason:tool==='fan'&&c.loose<c.capacity*.025?'Loose cover cleared. Work any packed fill with the pick.':tool==='pick'&&exposed(c)?'Inspect the cleared crack; snuff any gold you can see.':null};
}
export function workSniping(expedition, site, action, dt) {
  const p=expedition.snipingPockets?.[site.id];
  if(!p)return {gold:0};
  const result=stepSniping(p,action,dt,expedition.difficulty);
  if(result.completed){
    // Depletion and the award live in one expedition object and one storage write.
    expedition.gold=(expedition.gold||0)+result.gold;
    expedition.tests ||= [];
    expedition.tests.push({id:result.cellId,siteId:site.id,reach:site.id.replace('pool-',''),x:site.x,z:site.z,method:'sniping',gold:result.gold,finds:[]});
  }
  return result;
}
export function nearestSnipingSite(model, player) {
  const site=model.snipingPockets.find(p=>Math.abs(player.z-p.z)<7&&Math.hypot(player.x-p.x,player.z-p.z)<12);
  return site&&model.depth(player.x,player.z)<.72?site:null;
}
