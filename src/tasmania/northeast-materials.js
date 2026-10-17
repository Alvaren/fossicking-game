import { groundMaterial } from '../environmentmaterials.js';
import { rockMaterial } from '../rockmaterials.js';
import { vegetationMaterial } from '../vegetation.js';

// Regional treatments extend the shared shaders; atlas, wetness and lighting
// remain identical to the established game rendering contracts.
export function northeastGround() {
  const m=groundMaterial({forest:true,dampness:.7}),compile=m.onBeforeCompile;
  m.onBeforeCompile=s=>{
    compile(s);
    s.fragmentShader=s.fragmentShader.replace('diffuseColor.rgb *= groundColour*1.38;',`
      float nePatch=soilNoise(gp*.19)+soilNoise(gp*.61)*.35;
      float humus=vSurface.x*(1.0-stone);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.085,.19,.075),humus*.45);
      diffuseColor.rgb*=mix(.84,1.10,smoothstep(.20,1.15,nePatch));
      diffuseColor.rgb*=mix(vec3(.70),groundColour,.38)*1.38;
    `).replace(".013*detail;", ".006*detail;");
  };
  m.customProgramCacheKey=()=> 'northeast-ground-rainforest-v2';return m;
}
const rocks=new Map();
export function northeastRock(kind='granite',mixed=true) {
  const key=kind+mixed;if(rocks.has(key))return rocks.get(key);
  const source=rockMaterial(kind,{mixed,authored:true}),m=source.clone(),compile=source.onBeforeCompile;
  m.onBeforeCompile=s=>{
    compile(s);
    s.fragmentShader=s.fragmentShader.replace('vec3(1.35)),.24);','vec3(1.35)),.55);')
      .replaceAll('vRockPosition / .32','vRockPosition / .48')
      .replace('#include <roughnessmap_fragment>',`
      float neRind=rockNoise(vRockWorld*.75+vec3(13.0));
      float speck=rockNoise(vRockWorld*15.0);
      float dry= smoothstep(vRockWater+.08,vRockWater+.65,vRockWorld.y);
      float neLichen=smoothstep(.60,.73,neRind+speck*.12)*smoothstep(.12,.80,vRockUp.y)*dry;
      float moss=smoothstep(.34,.65,neRind)*smoothstep(-.55,.55,vRockUp.y)*smoothstep(vRockWater-.03,vRockWater+.2,vRockWorld.y);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.34,.36,.24),neLichen*.42);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.075,.155,.045),moss*.72);
      #include <roughnessmap_fragment>`);
  };
  m.customProgramCacheKey=()=> 'northeast-rock-rainforest-v2:'+key;rocks.set(key,m);return m;
}
export function northeastFoliage(grass=false) {
  const surface=vegetationMaterial({vertexColors:true,forest:true,grass}),m=surface.material,compile=m.onBeforeCompile;
  m.onBeforeCompile=s=>{
    compile(s);
    s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nif(vFoliage>.5)normal*=gl_FrontFacing ? 1.0 : -1.0;')
      .replace('diffuseColor.rgb *= mix(barkTint,vec3(.88+.22*ecoPatch),vFoliage);','diffuseColor.rgb *= mix(mix(vec3(.86,.85,.78),barkTint,.32),vec3(.97+.08*ecoPatch),vFoliage);');
  };
  m.customProgramCacheKey=()=> 'northeast-foliage-v1:'+grass;
  return surface;
}
