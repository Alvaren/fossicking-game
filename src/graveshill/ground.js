import * as THREE from 'three';
import { ROAD } from './locality.js';
import { groundMaterial } from '../environmentmaterials.js';

// Retain locality geology/track colours on the real heightfield. Reuse fine
// aggregate, soil horizons, rainfall response and cut-face shading from NSW.
export function gravesGround({excavation=false,waterLevel={value:-100}}={}) {
  const m=groundMaterial({newEngland:true,excavation,waterLevel}),compile=m.onBeforeCompile;
  m.name='Graves Hill wash and red dirt';
  m.onBeforeCompile=shader=>{
    compile(shader);
    shader.uniforms.gravesRoad={value:ROAD.slice(1).map((p,i)=>new THREE.Vector4(...ROAD[i],...p))};
    shader.fragmentShader=shader.fragmentShader.replace('void main() {', 'uniform vec4 gravesRoad[6];\nvoid main() {');
    shader.fragmentShader=shader.fragmentShader.replace(/diffuseColor.rgb=mix\(regionGround,diffuseColor.rgb,[^;]*;/,
      `float trackDistance=10000.0;
      for(int i=0;i<6;i++) {vec4 r=gravesRoad[i];vec2 d=r.zw-r.xy;float t=clamp(dot(gp-r.xy,d)/dot(d,d),0.0,1.0);trackDistance=min(trackDistance,length(gp-r.xy-d*t));}
      float rut=1.0-smoothstep(.10,.34,abs(trackDistance-.84));
      float shoulder=smoothstep(1.5,3.2,trackDistance);
      diffuseColor.rgb*=.82+.30*soilNoise(gp*.27)+.10*soilNoise(gp*2.7);
      diffuseColor.rgb*=1.0-rut*.22;
      groundColour=mix(soil,gravel,clamp(stone+shoulder*.18,0.0,1.0));
      groundColour=mix(vec3(.68),groundColour,(.25+shoulder*.23)*detail);
      `).replace('groundColour=mix(vec3(.68),groundColour,.22+meadow*.18);','groundColour=mix(vec3(.68),groundColour,.42+meadow*.18);');
  };
  m.customProgramCacheKey=()=>`graves-hill-ground-v2:${excavation}`;
  return m;
}
