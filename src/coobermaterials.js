import * as THREE from 'three';

// Continuous world-scale grain and cutter sweeps. No per-wall tiles, forest
// litter or river gravel; these materials are confined to the opal district.
export function cooberMaterial({ ground = false, interior = false, floor = false } = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color: ground ? 0xffffff : floor ? 0xbda38b : 0xf4dec4,
    vertexColors: ground, roughness: .94, side: THREE.DoubleSide, envMapIntensity: .12,
  });
  mat.name = ground ? 'Stony opal-field ground' : floor ? 'Worn dugout floor' : 'Excavated sandstone';
  mat.userData.waterLevel = {value:0};
  mat.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('void main() {', 'varying vec3 vOpalRock;\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOpalRock = position;');
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `
varying vec3 vOpalRock;
float opalHash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float opalNoise(vec3 p) {
  vec3 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(opalHash(i),opalHash(i+vec3(1,0,0)),f.x),
    mix(opalHash(i+vec3(0,1,0)),opalHash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(opalHash(i+vec3(0,0,1)),opalHash(i+vec3(1,0,1)),f.x),
    mix(opalHash(i+vec3(0,1,1)),opalHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
void main() {`).replace('#include <color_fragment>', `#include <color_fragment>
  vec3 rp=vOpalRock;
  float pixels=max(length(dFdx(rp)),length(dFdy(rp)));
  float fine=1.0-smoothstep(.008,.08,pixels);
  float cloud=opalNoise(rp*1.8);
  float grain=opalHash(floor(rp*190.0));
  float lamina=sin(rp.y*8.0+cloud*1.8+sin(rp.x*.37+rp.z*.29));
  ${ground ? `
  float stone=step(.945,opalHash(floor(rp*19.0)))*fine;
  diffuseColor.rgb*=.91+cloud*.15+(grain-.5)*.075*fine-stone*.2;
  float rockHeight=(cloud*.014+grain*.00035*fine);
  ` : `
  float marks=sin((rp.x+rp.z)*39.0+sin(rp.y*2.8)*2.3);
  float cut=smoothstep(.74,.97,marks)*fine;
  float blush=smoothstep(.45,.84,cloud)*(.35+.65*smoothstep(-.8,.8,lamina));
  diffuseColor.rgb*=mix(vec3(1.07,1.05,1.0),vec3(.91,.76,.65),blush*.48);
  diffuseColor.rgb*=1.0+(grain-.5)*.065*fine-cut*${interior ? '.035' : '.018'};
  float rockHeight=cloud*.018+lamina*.003+grain*.00035*fine-cut*${interior ? '.002' : '.001'};
  `}
`).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  vec3 rx=dFdx(-vViewPosition),ry=dFdy(-vViewPosition);
  vec3 sx=cross(ry,normal),sy=cross(normal,rx);float det=dot(rx,sx);
  normal=normalize(abs(det)*normal-sign(det)*(dFdx(rockHeight)*sx+dFdy(rockHeight)*sy));
`);
  };
  mat.customProgramCacheKey = () => `coober-rock-v1:${ground}:${interior}:${floor}`;
  return mat;
}
