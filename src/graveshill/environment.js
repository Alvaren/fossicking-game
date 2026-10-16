import { loadEnvironmentKit, loadNewEnglandKit } from '../assets.js';
import { buildRegionalEnvironment } from '../rendering/regionalenvironment.js';
import { newEnglandLight } from '../newengland/lighting.js';
import { ROCK_ID } from '../rockmaterials.js';
import { composeGravesHill } from './scenery.js';

async function loadKit() {
  const kits=await Promise.all([loadNewEnglandKit(),loadEnvironmentKit('models/graveshill/environment.glb',{gum:4,shrub:3,slab:3,cobble:6})]);
  if(kits.some(k=>!k)){for(const kit of kits)if(kit)Object.values(kit).forEach(g=>g.dispose());return null;}
  const [shared,local]=kits;
  for(const [name,g] of Object.entries(local)){shared[name]?.dispose();shared[name]=g;}
  for(const [name,g] of Object.entries(shared))if(/^(slab|cobble)_/.test(name)) {
    const kind=g.attributes.aAuthoredRockKind;
    for(let i=0;i<kind.count;i++)kind.setX(i,ROCK_ID.sandstone);
  }
  return shared;
}
function rockGeometry(g,type) {
  if(type!=='quartz')return;
  const colours=g.attributes.color,kind=g.attributes.aAuthoredRockKind;
  for(let i=0;i<colours.count;i++){colours.setXYZ(i,.61,.58,.48);kind.setX(i,ROCK_ID.quartz);}
}
export function buildGravesHillEnvironment(scene,context) {
  return buildRegionalEnvironment(scene,context,{label:'Graves Hill',prefix:'Graves Hill',artSeed:61749,loadKit,rockGeometry,
    bankRoots:false,landforms:()=>({patches:[],update(){}}),compose:composeGravesHill});
}
export function gravesHillLight(daynight) { newEnglandLight(daynight); }
