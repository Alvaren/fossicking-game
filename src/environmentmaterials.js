import * as THREE from 'three';
import { environmentWeather } from './environmentmotion.js';
import { mulberry32 } from './noise.js';

let atlas;
// One shared local atlas: soil, gravel, leaf litter and moss. Each tile has
// wrapped gutters; textures are authored once and travel/offline need no files.
function groundAtlas() {
  if (atlas) return atlas;
  const tile = 256, gutter = 8, inner = tile - gutter * 2;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const out = canvas.getContext('2d'), rand = mulberry32(82961);
  for (let kind = 0; kind < 4; kind++) {
    const c = document.createElement('canvas'); c.width = c.height = inner;
    const g = c.getContext('2d'), pixels = g.createImageData(inner, inner);
    const base = [[211, 205, 190], [182, 178, 162], [166, 147, 113], [144, 158, 114]][kind];
    for (let i = 0; i < inner * inner; i++) {
      const v = (rand() - .5) * (kind === 3 ? 45 : 35);
      for (let j = 0; j < 3; j++) pixels.data[i * 4 + j] = base[j] + v;
      pixels.data[i * 4 + 3] = 255;
    }
    g.putImageData(pixels, 0, 0);
    for (let i = 0; i < (kind === 1 ? 500 : kind === 2 ? 190 : 750); i++) {
      const x = rand() * inner, y = rand() * inner, angle = rand() * Math.PI;
      const length = kind === 2 ? 4 + rand() * 13 : kind === 1 ? 1 + rand() * 5 : .3 + rand() * 1.5;
      const width = length * (kind === 2 ? .13 : .55), light = 80 + rand() * 130;
      for (const ox of [-inner, 0, inner]) for (const oy of [-inner, 0, inner]) {
        g.save(); g.translate(x + ox, y + oy); g.rotate(angle);
        g.fillStyle = kind === 3 ? `rgb(${light * .66},${light * .83},${light * .45})` : `rgb(${light},${light * .93},${light * .8})`;
        g.beginPath(); g.ellipse(0, 0, length, width, 0, 0, Math.PI * 2); g.fill();
        if (kind === 1 || kind === 2) {
          g.strokeStyle = 'rgba(40,33,23,.3)'; g.lineWidth = .65; g.stroke();
          g.strokeStyle = 'rgba(255,244,213,.4)'; g.beginPath(); g.moveTo(-length * .6, -.3); g.lineTo(length * .6, -.3); g.stroke();
        }
        g.restore();
      }
    }
    const x = (kind % 2) * tile, y = Math.floor(kind / 2) * tile;
    out.save(); out.beginPath(); out.rect(x, y, tile, tile); out.clip();
    for (const ox of [-inner, 0, inner]) for (const oy of [-inner, 0, inner]) out.drawImage(c, x + gutter + ox, y + gutter + oy);
    out.restore();
  }
  atlas = new THREE.CanvasTexture(canvas); atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 4;
  return atlas;
}

export function groundMaterial({ forest = false, dampness = 0 } = {}) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96 });
  material.name = forest ? 'Damp forest floor' : 'Blended claim ground';
  material.userData.environment = 'ground';
  const waterLevel = { value: 0 };
  material.userData.waterLevel = waterLevel;
  material.onBeforeCompile = shader => {
    shader.uniforms.groundAtlas = { value: groundAtlas() };
    shader.uniforms.groundWaterLevel = waterLevel;
    shader.uniforms.groundWet = environmentWeather.wet;
    shader.vertexShader = shader.vertexShader.replace('void main() {', `
attribute vec3 aSurface;
varying vec3 vGround;
varying vec3 vSurface;
varying float vGroundUp;
void main() {`).replace('#include <begin_vertex>', `#include <begin_vertex>
vGround = position; vSurface = aSurface; vGroundUp = normal.y;`);
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `
uniform sampler2D groundAtlas;
uniform float groundWaterLevel;
uniform float groundWet;
varying vec3 vGround;
varying vec3 vSurface;
varying float vGroundUp;
vec3 groundTile(vec2 uv, vec2 tile) {
  vec2 dx = dFdx(uv)*.46875, dy = dFdy(uv)*.46875;
  float footprint = max(length(dx),length(dy))*512.0;
  float limit = min(1.0,6.0/max(footprint,.001));
  // Canvas textures are flipped vertically on upload.
  vec2 st = (tile*256.0+8.0+fract(uv)*240.0)/512.0;
  return textureGrad(groundAtlas, st, dx*limit, dy*limit).rgb;
}
void main() {`).replace('#include <color_fragment>', `#include <color_fragment>
  vec2 gp = vGround.xz;
  float wetness = max(groundWet,max(${dampness.toFixed(2)},1.0-smoothstep(0.0,.55,vSurface.z-groundWaterLevel)));
  vec3 soil = groundTile(gp/1.6, vec2(0,1));
  vec3 gravel = groundTile(gp/1.6, vec2(1,1));
  vec3 litter = groundTile(gp/1.6, vec2(0,0));
  vec3 moss = groundTile(gp/1.6, vec2(1,0));
  float ecoPatch = .5+.25*sin(gp.x*.61+sin(gp.y*.37))+.25*sin(gp.y*.83+gp.x*.21);
  float flatGround = smoothstep(.95,.999,vGroundUp);
  float puddle = smoothstep(.55,.95,groundWet)*flatGround*smoothstep(.68,.83,ecoPatch)*(1.0-smoothstep(.1,.8,vSurface.x));
  float stone = smoothstep(.1,.85,vSurface.y+ecoPatch*.25);
  float organic = vSurface.x*smoothstep(.2,.8,ecoPatch)*(1.0-stone);
  vec3 groundColour = mix(soil,gravel,stone);
  groundColour = mix(groundColour,litter,organic*${forest ? '.8' : '.65'});
  groundColour = mix(groundColour,moss,organic*wetness*${forest ? '.7' : '.18'});
  float groundPixel = max(length(dFdx(gp)),length(dFdy(gp)));
  float detail = 1.0-smoothstep(.025,.2,groundPixel);
  groundColour = mix(vec3(.65),groundColour,detail);
  diffuseColor.rgb *= groundColour*1.38;
  diffuseColor.rgb *= 1.0-wetness*.14;
  diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.13,.17,.16),puddle*.35);
  float groundHeight = dot(groundColour,vec3(.3,.5,.2))*.013*detail;
`).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(.96,.68,wetness);
roughnessFactor = mix(roughnessFactor,.24,puddle);
`).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
vec3 gdx=dFdx(-vViewPosition), gdy=dFdy(-vViewPosition);
vec3 grx=cross(gdy,normal), gry=cross(normal,gdx);
float gd=dot(gdx,grx);
normal=normalize(abs(gd)*normal-sign(gd)*(dFdx(groundHeight)*grx+dFdy(groundHeight)*gry)*(1.0-puddle*.97));
`);
  };
  material.customProgramCacheKey = () => `ground-layers-v2:${forest}:${dampness}`;
  return material;
}
