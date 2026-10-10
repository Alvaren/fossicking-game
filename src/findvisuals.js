import * as THREE from 'three';
import { assets } from './assets.js';

// Visual identity only: never advance an assay RNG or add fields to a save.
export function findSeed(item) {
  const text = [item.type, item.variety, item.ct, item.grams, item.grade, item.crystal?.id ?? item.id ?? item.seed].join('|');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}

export function roughFindGeometry(item) {
  return assets.finds?.[`${item.type}_${findSeed(item) % 3}`] || null;
}

// Surface detail stays on the object as it turns. Low graphics uses the same
// small shader with no transmission, volume or additional render passes.
export function finishRoughStone(mat, item) {
  const seed = (findSeed(item) % 997) / 97;
  const parti = item.type === 'sapphire' && item.variety === 'parti';
  const pale = item.variety === 'colourless' || item.type === 'topaz';
  const secondary = new THREE.Color(parti ? 0xc6a744 : (item.color ?? 0xffffff)).lerp(new THREE.Color(0xffffff), parti ? 0 : .16);
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, {
      uFindSeed: { value: seed }, uFindSecondary: { value: secondary }, uFindParti: { value: parti ? 1 : 0 },
      uFindCloud: { value: item.grade === 'C' ? .25 : item.grade === 'B' ? .14 : .07 },
    });
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', 'varying vec3 vFindPos;\nvarying float vFindScale;\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFindPos = position;\nvFindScale = length(modelMatrix[0].xyz);');
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', `
varying vec3 vFindPos;
varying float vFindScale;
uniform float uFindSeed, uFindParti, uFindCloud;
uniform vec3 uFindSecondary;
float fHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float fNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(fHash(i), fHash(i+vec3(1,0,0)),f.x),mix(fHash(i+vec3(0,1,0)),fHash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(fHash(i+vec3(0,0,1)),fHash(i+vec3(1,0,1)),f.x),mix(fHash(i+vec3(0,1,1)),fHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
void main() {`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  float fCloud = fNoise(vFindPos * 7.0 + uFindSeed);
  float fZone = smoothstep(-0.22, 0.24, vFindPos.x + vFindPos.y * 0.45 + sin(uFindSeed) * 0.12);
  diffuseColor.rgb *= 0.83 + 0.24 * fCloud;
  diffuseColor.rgb = mix(diffuseColor.rgb, uFindSecondary, fZone * uFindParti * 0.8);
  float fVeil = smoothstep(0.52, 0.8, fCloud) * uFindCloud;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55, 0.57, 0.52), fVeil);
  float fSpeck = smoothstep(0.83, 0.96, fNoise(vFindPos * 43.0 + uFindSeed));
  diffuseColor.rgb *= 1.0 - fSpeck * 0.35;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = clamp(roughnessFactor + (fCloud - 0.5) * 0.2 + fVeil * 0.3, 0.09, 0.75);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  float fh = fNoise(vFindPos * 64.0 + uFindSeed) * vFindScale * 0.0006;
  vec3 fdx = dFdx(-vViewPosition), fdy = dFdy(-vViewPosition);
  vec3 fr1 = cross(fdy, normal), fr2 = cross(normal, fdx);
  float fdet = dot(fdx, fr1);
  normal = normalize(abs(fdet) * normal - sign(fdet) * (dFdx(fh) * fr1 + dFdy(fh) * fr2));`);
    if (mat.transmission > 0) {
      sh.fragmentShader = sh.fragmentShader.replace('#include <transmission_fragment>', `#include <transmission_fragment>
  // Colour zoning also tints transmitted light, otherwise full transmission
  // erases the difference between a parti sapphire's blue/green and gold zones.
  totalDiffuse = mix(totalDiffuse, totalDiffuse * mix(vec3(1.0), uFindSecondary * 1.8, fZone * 0.6), uFindParti);
  totalDiffuse = mix(totalDiffuse, diffuseColor.rgb * 0.4, fVeil * 0.35);`);
    }
  };
  mat.customProgramCacheKey = () => `rough-find-v1-${mat.transmission > 0 ? 1 : 0}`;
  mat.roughness = pale ? .22 : item.type === 'scheelite' ? .45 : .26;
  if (mat.emissive) mat.emissive.multiplyScalar(.3);
  return mat;
}

// A handful of studio softboxes, baked once into a tiny PMREM. The dark gaps
// between them give both metal and crystal facets contrast as the find turns.
export function findStudioEnvironment(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(.07, .08, .09);
  const card = (x, y, z, w, h, colour, intensity) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
      color: new THREE.Color(colour).multiplyScalar(intensity), side: THREE.DoubleSide,
    }));
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };
  card(-2.5, 3, 3, 3, 4, 0xfff4e3, 5);
  card(3, 1, 1, 1, 3.5, 0xe4f2ff, 3.5);
  card(0, 3, -2, 3, 1.5, 0xffffff, 4);
  card(-3, -.5, -1, 1, 3, 0xcddfff, 2);
  const pm = new THREE.PMREMGenerator(renderer);
  const target = pm.fromScene(scene, .035);
  scene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  pm.dispose();
  return target;
}
