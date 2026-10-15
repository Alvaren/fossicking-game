import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

// Local tangent reflection, bounded by the error against the real creek profile.
// Refraction samples the actual opaque scene/depth; neither changes hydrology.
export function newEnglandWater(water, creek, settings) {
  const u=water.uniforms;
  const reflector=new Reflector(new THREE.PlaneGeometry(1,1),{textureWidth:640,textureHeight:360,multisample:0,clipBias:.001});
  const transmission=new THREE.WebGLRenderTarget(640,360,{type:THREE.HalfFloatType});
  transmission.depthTexture=new THREE.DepthTexture(640,360);
  const normal=new THREE.Vector3(),inverse=new THREE.Matrix4(),size=new THREE.Vector2();
  const stats={active:false,width:0,height:0,passes:0};
  let disposed=false,primed=false;
  Object.assign(u,{
    sceneWater:{value:0},waterReflection:{value:reflector.getRenderTarget().texture},waterTransmission:{value:transmission.texture},
    waterSceneDepth:{value:transmission.depthTexture},waterTextureMatrix:{value:new THREE.Matrix4()},
    waterViewport:{value:new THREE.Vector2(1,1)},waterPlane:{value:new THREE.Vector3()},
    waterCameraRange:{value:new THREE.Vector2(.1,1000)},
  });
  // Keep the original drifting instances and velocity state. Only their
  // rectangular silhouettes are replaced by a gently folded leaf.
  const leaf = new THREE.BufferGeometry();
  leaf.setAttribute('position',new THREE.Float32BufferAttribute([
    -.075,0,0, -.035,.002,-.014, .025,.002,-.010, .078,0,0,
    .022,.002,.013, -.033,.002,.016, 0,.007,0,
  ],3));
  leaf.setIndex([0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0,6]);
  leaf.computeVertexNormals();leaf.computeBoundingSphere();
  const oldLeaf=water.leaves.geometry;water.leaves.geometry=leaf;oldLeaf.dispose();
  const material=water.mesh.material;
  // Keep moving facets readable at walking height, with extra chop in the
  // existing fast/shallow and boulder foam field. Refraction stays restrained
  // independently so stronger reflection ripples do not obscure small finds.
  material.fragmentShader=material.fragmentShader.replace('uniform float time;',`
uniform float sceneWater;
uniform sampler2D waterReflection;
uniform sampler2D waterTransmission;
uniform sampler2D waterSceneDepth;
uniform mat4 waterTextureMatrix;
uniform vec2 waterViewport;
uniform vec3 waterPlane;
uniform vec2 waterCameraRange;
float waterViewDistance(float d) {
  float near=waterCameraRange.x,far=waterCameraRange.y;
  return near*far/(far-d*(far-near));
}
float foamHash(vec2 p) {return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float foamNoise(vec2 p) {
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(foamHash(i),foamHash(i+vec2(1,0)),f.x),mix(foamHash(i+vec2(0,1)),foamHash(i+vec2(1,1)),f.x),f.y);
}
uniform float time;`).replace('float chop = 0.09 + spd * 0.3 + vFoam * .09;','float chop = 0.055 + min(spd,1.5) * 0.12 + vFoam * .09;')
    .replace('float depth = vDepth + level;',`float depth=vDepth+level;
  if(sceneWater>.5) {
    vec2 screen=gl_FragCoord.xy/waterViewport;
    float bed=texture2D(waterSceneDepth,screen).x;
    // Measured separation from the visible bed gives shore contacts at the
    // actual terrain/stone surface instead of the coarse flow grid.
    float gap=max(0.0,waterViewDistance(bed)-waterViewDistance(gl_FragCoord.z));
    float vertical=abs(normalize(cameraPosition-vWorld).y);
    depth=min(depth,max(0.0,gap*vertical));
  }`)
    .replace('flowSample(vUv, 0.55,', 'flowSample(vUv, 0.28,')
    .replace('flowSample(vUv * vec2(1.0, 0.6) + 3.1, 0.31,', 'flowSample(vUv * vec2(1.0, 0.8) + 3.1, 0.17,')
    .replace('n1.xy += fine.xy * .12;', 'n1.xy += fine.xy * .09;')
    .replace('220.0);','180.0);')
    .replace('float deep = smoothstep', 'fres *= mix(.45,1.0,smoothstep(.18,1.1,depth));\n  float deep = smoothstep')
    .replace('float spec = pow',`
  if(sceneWater>.5) {
    vec4 projected=waterTextureMatrix*vec4(vWorld,1.0);
    vec2 uv=projected.xy/projected.w+N.xz*.055;
    float edge=smoothstep(0.0,.06,min(min(uv.x,uv.y),min(1.0-uv.x,1.0-uv.y)));
    float planeY=waterPlane.y+waterPlane.z*(vWorld.z-waterPlane.x);
    float profileMatch=1.0-smoothstep(.035,.13,abs(vWorld.y+level-planeY));
    float localReach=1.0-smoothstep(16.0,32.0,abs(vWorld.z-waterPlane.x));
    vec2 texel=1.5/waterViewport;
    vec3 sceneReflection=(texture2D(waterReflection,clamp(uv+texel,0.0,1.0)).rgb
      +texture2D(waterReflection,clamp(uv-texel,0.0,1.0)).rgb)*.5;
    refl=mix(refl,sceneReflection,edge*profileMatch*localReach*.9);
  }
  float spec = pow`)
    .replace('alpha = max(alpha, fres * 0.9);',`alpha = max(alpha, fres * 0.9);
  if(sceneWater>.5) {
    vec2 screen=gl_FragCoord.xy/waterViewport;
    vec2 offset=N.xz*.009*min(depth,.65);
    vec2 uv=clamp(screen+offset,.001,.999);
    // Avoid pulling the above-water bank/foreground into the submerged image.
    if(texture2D(waterSceneDepth,uv).x<gl_FragCoord.z-.00001)uv=screen;
    vec3 below=texture2D(waterTransmission,uv).rgb;
    float absorb=mix(.015,.28,deep)+flood*.60;
    body=mix(below,body,clamp(absorb,0.0,.96));
    col=mix(body,refl,fres*(1.0-.7*flood))+sunColor*spec*.75*(1.0-flood);
    alpha=1.0;
  }`);
  material.fragmentShader=material.fragmentShader
    .replace('float fn = flowSample(vUv * 1.7, 0.9, spd * 1.3, time * 0.5).x;',
      `vec2 foamP=vUv-vec2(0,time*spd*.5);
      float fn=foamNoise(foamP*vec2(5.0,2.6))*.62
        +foamNoise(foamP*vec2(13.0,8.0))*.28+foamNoise(foamP*31.0)*.10;`)
    .replace('smoothstep(0.48, 0.78, fn + fv * 0.25)', 'smoothstep(.62,.82,fn+fv*.10)')
    .replace('float fv = min(1.0, vFoam + flood * 0.45);',
      'float fv = min(1.0, vFoam * smoothstep(.12,.32,depth) * .58 + flood * .45);')
    .replace('float alpha = mix(mix(0.14, 0.84, deep)', 'float alpha = mix(mix(0.10, 0.75, deep)');
  material.needsUpdate=true;
  return {stats,capture(renderer,scene,camera,underground=0) {
    // The first ordinary render allocates the light's comparison-depth texture.
    // Reflector disables shadow updates; invoking it before that render would
    // bind a colour fallback to sampler2DShadow on WebGL implementations.
    if(!primed||scene.children.some(o=>o.isDirectionalLight&&o.castShadow&&!o.shadow.map)) {
      primed=true;u.sceneWater.value=0;return;
    }
    const active=!disposed&&settings.water==='scene'&&underground<.1&&camera.position.y>creek.surfaceY(camera.position.z)+.05;
    stats.active=active;u.sceneWater.value=active ? 1 : 0;stats.passes=0;
    if(!active)return;
    renderer.getDrawingBufferSize(size);u.waterViewport.value.copy(size);
    const scale=Math.min(1,1280/size.x,1280/size.y)*.6;
    const w=Math.max(256,Math.round(size.x*scale)),h=Math.max(144,Math.round(size.y*scale));
    if(w!==stats.width||h!==stats.height) {transmission.setSize(w,h);reflector.getRenderTarget().setSize(w,h);stats.width=w;stats.height=h;}
    u.waterCameraRange.value.set(camera.near,camera.far);
    const z=camera.position.z,wy=creek.surfaceY(z),slope=creek.slope(z);
    reflector.position.set(creek.cx(z),wy,z);normal.set(0,1,-slope).normalize();
    reflector.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);reflector.updateMatrixWorld(true);
    u.waterPlane.value.set(z,wy,slope);
    const target=renderer.getRenderTarget(),shadows=renderer.shadowMap.autoUpdate;
    const visible=water.mesh.visible,leaves=water.leaves.visible;
    water.mesh.visible=false;water.leaves.visible=false;
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    try {
      reflector.onBeforeRender(renderer,scene,camera);
      inverse.copy(reflector.matrixWorld).invert();
      u.waterTextureMatrix.value.copy(reflector.material.uniforms.textureMatrix.value).multiply(inverse);
      renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(transmission);renderer.clear();renderer.render(scene,camera);
      stats.passes=2;
    } finally {
      renderer.setRenderTarget(target);renderer.shadowMap.autoUpdate=shadows;
      water.mesh.visible=visible;water.leaves.visible=leaves;
    }
  },dispose() {
    disposed=true;u.sceneWater.value=0;reflector.geometry.dispose();reflector.dispose();transmission.dispose();
  }};
}
