import { loadEnvironmentKit, loadNewEnglandKit } from '../assets.js';
import { buildRegionalEnvironment } from '../rendering/regionalenvironment.js';
import { urallaRock } from './materials.js';
import { composeUralla } from './scenery.js';
async function loadKit() {
  const [shared,local]=await Promise.all([loadNewEnglandKit(),loadEnvironmentKit('models/uralla/environment.glb',{granite:4,cobble:6})]);
  if(!shared||!local){for(const kit of [shared,local])if(kit)Object.values(kit).forEach(g=>g.dispose());return null;}
  for(const [name,g] of Object.entries(local)){shared[name]?.dispose();shared[name]=g;}
  return shared;
}
export function buildUrallaEnvironment(scene,context) {
  return buildRegionalEnvironment(scene,context,{label:'Uralla',prefix:'Uralla',artSeed:57441,loadKit,
    foliage:(material,grass)=>{material.color.setHex(grass?0xc3d1a5:0xf1f3e4);},
    treeHeights:{gum_0:1.15,gum_1:2.05,gum_2:1.5,gum_3:2.25},
    rockSurface:urallaRock,
    rockFamily:({radius})=>radius>1?'granite':'cobble',
    landforms:()=>({patches:[],update(){}}),compose:composeUralla});
}
