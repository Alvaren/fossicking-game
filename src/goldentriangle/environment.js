import * as THREE from 'three';
import { loadEnvironmentKit, loadNewEnglandKit } from '../assets.js';
import { buildRegionalEnvironment } from '../rendering/regionalenvironment.js';
import { buildLandforms } from '../newengland/landforms.js';
import { newEnglandLight } from '../newengland/lighting.js';
import { ROCK_ID } from '../rockmaterials.js';
import { composeGoldenTriangle } from './composition.js';

async function loadKit() {
  const [shared,regional]=await Promise.all([
    loadNewEnglandKit(),loadEnvironmentKit('models/goldentriangle/environment.glb',{gum:4,shrub:3}),
  ]);
  if(!shared||!regional) {
    for(const kit of [shared,regional])if(kit)Object.values(kit).forEach(g=>g.dispose());
    return null;
  }
  for(const [name,geometry] of Object.entries(regional)){shared[name]?.dispose();shared[name]=geometry;}
  return shared;
}

function prepareKit(kit) {
  const ironstone=new THREE.Color(0x77624c);
  for(const [name,g] of Object.entries(kit)) {
    if(!name.startsWith('slab_'))continue;
    const colours=g.attributes.color,kind=g.attributes.aAuthoredRockKind;
    for(let i=0;i<colours.count;i++){colours.setXYZ(i,ironstone.r,ironstone.g,ironstone.b);kind.setX(i,ROCK_ID.ironstone);}
  }
}

function rockGeometry(geometry,type) {
  if(type!=='ironstone')return;
  // A stream-worn ironstone still retains its rusty material when borrowing a
  // rounded shared cobble silhouette. Authored vertex roles drive this shader.
  const colour=new THREE.Color(0x8c5e40),colours=geometry.attributes.color,kind=geometry.attributes.aAuthoredRockKind;
  for(let i=0;i<colours.count;i++){colours.setXYZ(i,colour.r,colour.g,colour.b);kind.setX(i,ROCK_ID.ironstone);}
}

function foliage(material,grass) {
  if(grass)return;
  const compile=material.onBeforeCompile;
  material.onBeforeCompile=shader=>{
    compile(shader);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float ridges=barkNoise(vec2((vBark.x+vBark.z)*90.0,vBark.y*2.0));
      float barkRelief=(1.0-vFoliage)*.012*ridges;
      vec3 bx=dFdx(-vViewPosition),by=dFdy(-vViewPosition);
      vec3 brx=cross(by,normal),bry=cross(normal,bx);
      float bd=dot(bx,brx);
      normal=normalize(abs(bd)*normal-sign(bd)*(dFdx(barkRelief)*brx+dFdy(barkRelief)*bry));
    `);
  };
  material.customProgramCacheKey=()=> 'goldfield-furrowed-bark-v1';
}

// Colour the existing gully and workings through the terrain shader. Separate
// thin soil sheets can intersect a coarser terrain triangle at their edges.
function landforms(root,terrain,anchors,mask) {
  return buildLandforms(root,terrain,anchors,mask,{banks:false});
}

export function buildGoldenTriangleEnvironment(scene,context) {
  return buildRegionalEnvironment(scene,context,{label:'Golden Triangle',prefix:'Goldfield',artSeed:914713,loadKit,prepareKit,rockGeometry,foliage,landforms,compose:composeGoldenTriangle});
}

const haze=new THREE.Color(0xc9c5b7);
export function goldenTriangleLight(daynight) {
  newEnglandLight(daynight);
  daynight.base.fog.lerp(haze,daynight.daylight*.2);
}
