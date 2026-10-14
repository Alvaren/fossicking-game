import * as THREE from 'three';
import { environmentWeather } from './environmentmotion.js';
import { mulberry32 } from './noise.js';
import { coverShader } from './newengland/groundcover.js';

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

export function groundMaterial({ forest = false, dampness = 0, newEngland = false, excavation = false, waterLevel = { value:0 } } = {}) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96 });
  material.name = forest ? 'Damp forest floor' : 'Blended claim ground';
  material.userData.environment = 'ground';
  material.userData.waterLevel = waterLevel;
  if(newEngland)material.userData.nswCamp={value:new THREE.Vector2(10000,10000)};
  material.onBeforeCompile = shader => {
    shader.uniforms.groundAtlas = { value: groundAtlas() };
    shader.uniforms.groundWaterLevel = waterLevel;
    shader.uniforms.groundWet = environmentWeather.wet;
    if(newEngland)shader.uniforms.nswCamp=material.userData.nswCamp;
    shader.vertexShader = shader.vertexShader.replace('void main() {', `
attribute vec3 aSurface;
varying vec3 vGround;
varying vec3 vSurface;
varying float vGroundUp;
${excavation ? 'attribute float aCut; varying float vCut; attribute vec3 aSoil; varying vec3 vSoil;' : ''}
void main() {`).replace('#include <begin_vertex>', `#include <begin_vertex>
vGround = position; vSurface = aSurface; vGroundUp = normal.y;
${excavation ? 'vCut=aCut;vSoil=aSoil;' : ''}`);
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `
uniform sampler2D groundAtlas;
uniform float groundWaterLevel;
uniform float groundWet;
${newEngland ? 'uniform vec2 nswCamp;'+coverShader : ''}
varying vec3 vGround;
varying vec3 vSurface;
varying float vGroundUp;
${excavation ? 'varying float vCut; varying vec3 vSoil;' : ''}
vec3 groundTile(vec2 uv, vec2 tile) {
  vec2 dx = dFdx(uv)*.46875, dy = dFdy(uv)*.46875;
  float footprint = max(length(dx),length(dy))*512.0;
  float limit = min(1.0,6.0/max(footprint,.001));
  // Canvas textures are flipped vertically on upload.
  vec2 st = (tile*256.0+8.0+fract(uv)*240.0)/512.0;
  return textureGrad(groundAtlas, st, dx*limit, dy*limit).rgb;
}
float soilHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float soilNoise(vec2 p) {
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(soilHash(i),soilHash(i+vec2(1,0)),f.x),mix(soilHash(i+vec2(0,1)),soilHash(i+vec2(1,1)),f.x),f.y);
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
  ${newEngland ? `
  float macro=soilNoise(gp*.12)+soilNoise(gp*.43)*.35;
  vec3 grus=mix(vec3(.20,.143,.080),vec3(.36,.28,.17),smoothstep(.30,1.0,macro));
  vec3 wash=mix(vec3(.14,.16,.135),vec3(.28,.285,.235),smoothstep(.25,1.08,macro));
  float creekbed=1.0-smoothstep(.03,.8,vSurface.z-groundWaterLevel);
  vec3 regionGround=mix(grus,wash,creekbed*.9);
  float meadow=smoothstep(.40,.75,nswCover(gp))*(1.0-creekbed);
  regionGround=mix(regionGround,vec3(.185,.16,.085),meadow*.6);
  float campGround=1.0-smoothstep(8.0,17.0,length((gp-nswCamp)*vec2(.88,1.12))+soilNoise(gp*.6)*1.8);
  regionGround=mix(regionGround,vec3(.32,.245,.16),campGround*.72);
  float litterPatch=organic*smoothstep(.25,.7,soilNoise(gp*.28+13.0));
  regionGround=mix(regionGround,vec3(.135,.117,.076),litterPatch*.65);
  // Retain a little of the original geological colour information.
  diffuseColor.rgb=mix(regionGround,diffuseColor.rgb,${excavation ? 'mix(.24,1.0,vCut)' : '.24'});
  // The old gravel tile remains for other regions. Here fine aggregate is
  // subordinate to actual embedded stones and metre-scale material patches.
  groundColour=mix(vec3(.68),groundColour,.22+meadow*.18);
  float face=1.0-smoothstep(.70,.96,vGroundUp);
  float strata=soilNoise(vec2(gp.x*.7+gp.y*.5,vGround.y*9.0));
  diffuseColor.rgb*=1.0-face*(.04+.16*strata);
  ${excavation ? `
  float exposed=smoothstep(.008,.055,vSoil.x);
  float soilFace=exposed*smoothstep(.02,.08,vSoil.z);
  float horizon=smoothstep(vSoil.y-.025,vSoil.y+.025,vSoil.x+soilNoise(gp*5.0)*.015);
  float grain=soilNoise(gp*37.0+vSoil.x*19.0);
  float layer=sin(vSoil.x*62.0+soilNoise(gp*3.0)*1.8)*.035;
  diffuseColor.rgb*=1.0-exposed*.05-soilFace*(.10+.12*(1.0-horizon)-layer);
  groundColour=mix(groundColour,groundColour*(.85+grain*.3),soilFace*detail);
  ` : ''}
  ` : ''}
  diffuseColor.rgb *= groundColour*1.38;
  diffuseColor.rgb *= 1.0-wetness*.14;
  diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.13,.17,.16),puddle*.35);
  float groundHeight = dot(groundColour,vec3(.3,.5,.2))*${newEngland ? '.005' : '.013'}*detail;
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
  material.customProgramCacheKey = () => `ground-layers-v4:${forest}:${dampness}:${newEngland}:${excavation}`;
  return material;
}
