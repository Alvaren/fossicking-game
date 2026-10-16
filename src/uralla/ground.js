import { groundMaterial } from '../environmentmaterials.js';
// Reuse the NSW surface/soil atlas, wetness, excavation and normal mapping.
// Local palette follows grassy banks and pale sand in the Wooldridge photos.
export function urallaGround(options={}) {
  const mat=groundMaterial({...options,newEngland:true}),compile=mat.onBeforeCompile;
  mat.onBeforeCompile=shader=>{
    compile(shader);
    shader.fragmentShader=shader.fragmentShader
      .replace('vec3(.20,.143,.080),vec3(.36,.28,.17)','vec3(.16,.165,.095),vec3(.31,.29,.20)')
      .replace('vec3(.14,.16,.135),vec3(.28,.285,.235)','vec3(.16,.17,.135),vec3(.31,.30,.24)')
      .replace('vec3(.185,.16,.085),meadow*.6','vec3(.115,.185,.065),meadow*.85')
      .replace('diffuseColor.rgb=mix(regionGround,diffuseColor.rgb,mix(.24,1.0,vCut));','diffuseColor.rgb=mix(regionGround,diffuseColor.rgb,mix(.45,1.0,vCut));')
      .replace('float meadow=smoothstep(.40,.75,nswCover(gp))','float meadow=smoothstep(.30,.68,nswCover(gp))*clamp(vSurface.x*3.5,0.0,1.0)');
  };
  mat.customProgramCacheKey=()=>`uralla-ground-v1:${!!options.excavation}`;
  return mat;
}
