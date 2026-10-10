import * as THREE from 'three';
import { makeRockAtlas, ROCK_ID, ATLAS_WIDTH, ATLAS_HEIGHT } from './rocktextures.js';
export { ROCK_ID, ROCK_TYPES } from './rocktextures.js';

let atlas;
function textures() {
  if (atlas) return atlas;
  const data = makeRockAtlas();
  const texture = (pixels, srgb) => {
    const t = new THREE.DataTexture(pixels, ATLAS_WIDTH, ATLAS_HEIGHT);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true; t.needsUpdate = true;
    return t;
  };
  atlas = { colour: texture(data.colour, true), relief: texture(data.relief, false), averages: data.averages.map(rgb => new THREE.Color().setRGB(...rgb, THREE.SRGBColorSpace)) };
  return atlas;
}

// Kept on the existing instanced geometry: adding geology never changes its
// transforms, instance ordering, collider list or seeded random sequence.
export function rockKinds(geometry, count) {
  const attribute = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  geometry.setAttribute('aRockKind', attribute);
  return (i, kind) => { attribute.setX(i, ROCK_ID[kind] ?? ROCK_ID.slate); attribute.needsUpdate = true; };
}

const cache = new Map();
export function sourceRockKind(sources, x, z, fallback = 'slate') {
  let closest = .35, kind = fallback;
  for (const [source, rock, radius] of [['granite', 'granite', 32], ['rhyolite', 'rhyolite', 36], ['basalt', 'basalt', 40], ['reef', 'quartz', 24]]) {
    const s = sources[source];
    if (!s) continue;
    const weight = Math.exp(-((x - s.x) ** 2 + (z - s.z) ** 2) / (2 * radius ** 2));
    if (weight > closest) { closest = weight; kind = rock; }
  }
  return kind;
}

export function rockMaterial(kind = 'slate', { mixed = false, split = false, wet = false, flat = false } = {}) {
  const key = `${kind}:${mixed}:${split}:${wet}:${flat}`;
  if (cache.has(key)) return cache.get(key);
  const tex = textures();
  const material = new THREE.MeshStandardMaterial({ roughness: wet ? .58 : .9, flatShading: flat });
  material.name = `Rock: ${mixed ? 'mixed geology' : kind}`;
  material.userData.rock = { kind, mixed, split, wet };
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { rockColour: { value: tex.colour }, rockRelief: { value: tex.relief }, rockAverages: { value: tex.averages } });
    shader.vertexShader = shader.vertexShader.replace('void main() {', `
varying vec3 vRockPosition;
varying vec3 vRockNormal;
varying float vRockKind;
${mixed ? 'attribute float aRockKind;' : ''}
${split ? 'attribute float aFace; attribute float aCave; varying vec2 vRockFace;' : ''}
void main() {`).replace('#include <begin_vertex>', `#include <begin_vertex>
  vec3 rockScale = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
  #ifdef USE_INSTANCING
    rockScale *= vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  #endif
  rockScale = max(rockScale, vec3(0.00001));
  vRockPosition = position * rockScale;
  vRockNormal = normalize(normal / rockScale);
  vRockKind = ${mixed ? 'aRockKind' : (ROCK_ID[kind] ?? ROCK_ID.slate).toFixed(1)};
  ${split ? 'vRockFace = vec2(aFace, aCave);' : ''}`);
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `
uniform sampler2D rockColour;
uniform sampler2D rockRelief;
uniform vec3 rockAverages[6];
varying vec3 vRockPosition;
varying vec3 vRockNormal;
varying float vRockKind;
${split ? 'varying vec2 vRockFace;' : ''}
float rockHash(vec3 p) { p = fract(p * .1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
float rockNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(rockHash(i),rockHash(i+vec3(1,0,0)),f.x),mix(rockHash(i+vec3(0,1,0)),rockHash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(rockHash(i+vec3(0,0,1)),rockHash(i+vec3(1,0,1)),f.x),mix(rockHash(i+vec3(0,1,1)),rockHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
vec4 rockSample(sampler2D atlasMap, vec2 uv, float kind) {
  vec2 scale = vec2(240.0 / 1024.0, 240.0 / 512.0);
  vec2 dx = dFdx(uv) * scale, dy = dFdy(uv) * scale;
  // Cap the mip footprint at the wrapped gutter; fine detail fades out below.
  float footprint = max(length(dx * vec2(1024,512)), length(dy * vec2(1024,512)));
  float limit = min(1.0, 6.0 / max(footprint, .0001));
  vec2 tile = vec2(mod(kind, 4.0), floor(kind / 4.0)) * 256.0 + 8.0;
  return textureGrad(atlasMap, tile / vec2(1024,512) + fract(uv) * scale, dx * limit, dy * limit);
}
vec4 rockTriplanar(sampler2D atlasMap, vec3 p, vec3 weights, float kind) {
  return rockSample(atlasMap, p.yz, kind) * weights.x + rockSample(atlasMap, p.xz, kind) * weights.y + rockSample(atlasMap, p.xy, kind) * weights.z;
}
void main() {`).replace('#include <color_fragment>', `#include <color_fragment>
  vec3 rockWeights = pow(abs(normalize(vRockNormal)), vec3(6.0));
  rockWeights /= max(dot(rockWeights, vec3(1)), .0001);
  float rockKind = floor(vRockKind + .5);
  float rockPixel = max(length(dFdx(vRockPosition)), length(dFdy(vRockPosition)));
  float rockDetail = 1.0 - smoothstep(.003, .025, rockPixel);
  vec3 rockAlbedo = rockTriplanar(rockColour, vRockPosition / .32, rockWeights, rockKind).rgb;
  vec4 rockSurface = rockTriplanar(rockRelief, vRockPosition / .32, rockWeights, rockKind);
  rockAlbedo = mix(rockAverages[int(rockKind)], rockAlbedo, rockDetail);
  float rockFace = ${split ? 'smoothstep(.5, .9, vRockFace.x)' : '0.0'};
  float rockCave = ${split ? 'smoothstep(.3, .9, vRockFace.y)' : '0.0'};
  float weather = rockNoise(vRockPosition * 6.0 + vec3(7,19,31));
  float rind = (1.0-rockFace)*(1.0-rockCave);
  rockAlbedo *= .86 + weather * .25;
  // Sparse surface weathering leaves the diagnostic minerals visible.
  rockAlbedo = mix(rockAlbedo, vec3(.28,.19,.11), smoothstep(.66,.88,weather)*rind*.28);
  rockAlbedo *= mix(1.0, .43, rockCave);
  float druse = step(.94, rockHash(floor(vRockPosition * 530.0))) * rockCave * rockDetail;
  rockAlbedo = mix(rockAlbedo, vec3(.85,.84,.79), druse);
  diffuseColor.rgb = rockAlbedo * ${wet ? '.77' : '1.0'};
  float rockHeight = rockSurface.r * rockDetail * .0022;
`).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = mix(.9, rockSurface.g, rockDetail);
  roughnessFactor = mix(roughnessFactor, max(roughnessFactor, .85), rind * .45);
  roughnessFactor = mix(roughnessFactor, .2, druse);
  ${wet ? 'roughnessFactor = max(.4, roughnessFactor * .68);' : ''}
`).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  // Height derivatives perturb the actual view-space surface, so all three
  // projections work on UV-less meshes, instances and moving split halves.
  vec3 rockDx = dFdx(-vViewPosition), rockDy = dFdy(-vViewPosition);
  vec3 rockRx = cross(rockDy, normal), rockRy = cross(normal, rockDx);
  float rockDet = dot(rockDx, rockRx);
  vec3 rockGradient = sign(rockDet) * (dFdx(rockHeight)*rockRx + dFdy(rockHeight)*rockRy);
  normal = normalize(abs(rockDet)*normal - rockGradient);
`);
  };
  material.customProgramCacheKey = () => `geological-rock-v1:${key}`;
  cache.set(key, material);
  return material;
}
