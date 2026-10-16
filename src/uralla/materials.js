import { rockMaterial } from '../rockmaterials.js';
import { newEnglandLight } from '../newengland/lighting.js';
const cache=new Map();
export function urallaRock(kind,options) {
  const key=kind+JSON.stringify(options);
  if(cache.has(key))return cache.get(key);
  const source=rockMaterial(kind,options),mat=source.clone(),compile=source.onBeforeCompile;
  mat.onBeforeCompile=shader=>{
    compile(shader);
    shader.fragmentShader=shader.fragmentShader
      .replace('vec3(1.35)),.24);','vec3(1.35)),.68);')
      .replaceAll('vRockPosition / .32','vRockPosition / .45')
      .replace('float rockHeight = rockSurface.r * rockDetail * .0007;','float rockHeight = rockSurface.r * rockDetail * .0012;');
  };
  mat.customProgramCacheKey=()=>`uralla-granite-v1:${key}`;cache.set(key,mat);return mat;
}
export function urallaLight(clock) {
  newEnglandLight(clock);
  clock.base.hemi*=1-.16*clock.daylight;
  clock.base.env*=1-.12*clock.daylight;
}
