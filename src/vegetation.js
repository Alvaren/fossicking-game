import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { environmentWeather } from './environmentmotion.js';

// Broad irregular sprays made from tapered leaves, not spherical canopy solids.
// Local RNG is independent of all placement, prospecting and save seeds.
export function leafSpray(seed = 1, count = 56, broad = false) {
  const rand = mulberry32(seed), pos = [], nor = [], foliage = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2, radius = Math.sqrt(rand());
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    const y = (rand() - .5) * .75 + (1 - radius) * .2;
    const length = (broad ? .12 : .16) + rand() * .16, width = length * (broad ? .52 : .26);
    const direction = angle + (rand() - .5) * 1.8;
    const dx = Math.cos(direction), dz = Math.sin(direction);
    const p=(along,side,dy)=>[x+dx*length*along-dz*width*side,y+dy,z+dz*length*along+dx*width*side];
    const points = [p(-1,0,.04),p(-.4,1,.07),p(.4,.7,.03),p(1,0,-.09),p(.4,-.7,.015),p(-.4,-1,.02)];
    for (const tri of [[0,1,5],[1,2,5],[2,4,5],[2,3,4]]) {
      a.fromArray(points[tri[0]]); b.fromArray(points[tri[1]]); c.fromArray(points[tri[2]]);
      const n = new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).normalize();
      for (const k of tri) { pos.push(...points[k]); nor.push(n.x,n.y,n.z); foliage.push(1); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('aFoliage', new THREE.Float32BufferAttribute(foliage, 1));
  return geo;
}

export function markFoliage(geo, amount) {
  geo.setAttribute('aFoliage', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count).fill(amount), 1));
  return geo;
}

export function vegetationMaterial({ color = 0xffffff, vertexColors = false, forest = false, grass = false } = {}) {
  const time = { value: 0 }, strength = { value: 1 };
  const material = new THREE.MeshStandardMaterial({ color, vertexColors, roughness: .92, side: THREE.DoubleSide });
  material.userData.environment = 'vegetation';
  const vertex = shader => {
    Object.assign(shader.uniforms, { ecoTime: time, ecoWind: strength, ecoWet: environmentWeather.wet });
    shader.vertexShader = shader.vertexShader.replace('void main() {', `
uniform float ecoTime; uniform float ecoWind;
attribute float aFoliage;
varying float vFoliage;
varying vec3 vBark;
void main() {`).replace('#include <begin_vertex>', `#include <begin_vertex>
vec3 ecoOrigin = vec3(0);
vec3 ecoScale = vec3(1);
#ifdef USE_INSTANCING
ecoOrigin = instanceMatrix[3].xyz;
ecoScale = vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
#endif
vFoliage = aFoliage; vBark = position*ecoScale;
float flex = aFoliage*${grass ? 'clamp(position.y,0.0,1.0)' : '1.0'};
float gust = .65+.55*pow(.5+.5*sin(ecoTime*.65-ecoOrigin.x*.045-ecoOrigin.z*.025),3.0);
float breeze = gust*(sin(ecoTime*1.3+ecoOrigin.x*.13+ecoOrigin.z*.17)+.35*sin(ecoTime*2.7+position.y*2.0));
transformed.x += flex*breeze*ecoWind*.045;
transformed.z += flex*sin(ecoTime*.9+ecoOrigin.z*.11)*ecoWind*.025;
`);
  };
  material.onBeforeCompile = shader => {
    vertex(shader);
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `
uniform float ecoWet;
varying float vFoliage; varying vec3 vBark;
float barkHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float barkNoise(vec2 p) {
vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
return mix(mix(barkHash(i),barkHash(i+vec2(1,0)),f.x),mix(barkHash(i+vec2(0,1)),barkHash(i+vec2(1,1)),f.x),f.y);
}
void main() {`).replace('#include <color_fragment>', `#include <color_fragment>
float ecoPatch = barkNoise(vec2(vBark.x+vBark.z,vBark.y*.32)*7.0);
float grain = barkNoise(vec2((vBark.x+vBark.z)*110.0,vBark.y*4.0));
vec3 barkTint = mix(vec3(.43,.38,.31),vec3(1.0,.96,.83),smoothstep(.28,.65,ecoPatch));
barkTint *= .88+.22*grain;
${forest ? 'barkTint = mix(barkTint,vec3(.35,.43,.24),smoothstep(.68,.84,ecoPatch)*.45);' : ''}
diffuseColor.rgb *= mix(barkTint,vec3(.88+.22*ecoPatch),vFoliage);
diffuseColor.rgb *= 1.0-ecoWet*mix(.23,.07,vFoliage);
`).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor,.55,ecoWet*(1.0-vFoliage*.4));
`);
  };
  // The shadow pass uses the same displacement, so leaves do not slide away
  // from their shadows. Wind is small enough to retain collision silhouettes.
  const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  depthMaterial.onBeforeCompile = vertex;
  material.customProgramCacheKey = () => `vegetation-v2:${forest}:${grass}`;
  depthMaterial.customProgramCacheKey = () => `vegetation-depth-v1:${grass}`;
  return { material, depthMaterial, update(t, wind = 1) { time.value = t; strength.value = wind; } };
}
