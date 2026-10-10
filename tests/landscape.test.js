import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { surfaceUnderfoot, showerAt, environmentWeather, updateEnvironmentWeather } from '../src/environmentmotion.js';
import { leafSpray, markFoliage } from '../src/vegetation.js';
import { foliageLOD, detailBand, vegetationLOD } from '../src/vegetationlod.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

test('footfalls follow exposed surfaces and water takes precedence',()=>{
  assert.equal(surfaceUnderfoot({depth:.08,rock:true,gravel:1}),'water');
  assert.equal(surfaceUnderfoot({rock:true,wet:1}),'rock');
  assert.equal(surfaceUnderfoot({gravel:.8,wet:1}),'gravel');
  assert.equal(surfaceUnderfoot({organic:.6}),'litter');
  assert.equal(surfaceUnderfoot({wet:.8}),'mud');
  assert.equal(surfaceUnderfoot(),'soil');
});
test('showers build and clear, wet surfaces dry gradually and pause freezes them',()=>{
  assert.equal(showerAt(170),0);assert.equal(showerAt(300),0);
  assert.ok(showerAt(190)>0&&showerAt(190)<showerAt(210));
  environmentWeather.wet.value=0;updateEnvironmentWeather(15,1);
  assert.equal(environmentWeather.wet.value,1);
  updateEnvironmentWeather(0,0);assert.equal(environmentWeather.wet.value,1);
  updateEnvironmentWeather(30,0);assert.ok(environmentWeather.wet.value>.7&&environmentWeather.wet.value<1);
  updateEnvironmentWeather(200,0);assert.equal(environmentWeather.wet.value,0);
});
test('distant foliage removes leaves while retaining every trunk triangle and source geometry',()=>{
  const wood=markFoliage(new THREE.CylinderGeometry(.1,.2,3,5).toNonIndexed(),0);wood.deleteAttribute('uv');
  const full=mergeGeometries([wood,leafSpray(7,80)]),before=full.attributes.position.array.slice(),far=foliageLOD(full,4);
  assert.deepEqual(full.attributes.position.array,before);
  assert.ok(far.attributes.position.count<full.attributes.position.count*.5);
  assert.equal([...far.attributes.aFoliage.array].filter(v=>v===0).length,wood.attributes.position.count);
  assert.ok([...far.attributes.position.array].every(Number.isFinite));
});
test('LOD draw lists cover visible instances once, retain source transforms, and have hysteresis',()=>{
  const scene=new THREE.Scene(),source=new THREE.InstancedMesh(leafSpray(1,12),new THREE.MeshBasicMaterial(),3);
  source.userData.tree=true;scene.add(source);
  [0,90,260].forEach((x,i)=>source.setMatrixAt(i,new THREE.Matrix4().makeTranslation(x,0,0)));
  const before=source.instanceMatrix.array.slice(),lod=vegetationLOD(scene,[source],true);
  lod.update(1,{x:0,z:0},true);
  assert.deepEqual([lod.stats.near,lod.stats.far,lod.stats.culled],[1,1,1]);
  assert.deepEqual(source.instanceMatrix.array,before);assert.equal(source.count,3);
  assert.ok(lod.stats.drawnTriangles<lod.stats.fullTriangles);
  lod.update(1,{x:90,z:0},true);assert.equal(lod.stats.near,1);assert.equal(lod.stats.far,1);
  assert.equal(detailBand(34,0,32,160),0);assert.equal(detailBand(30,1,32,160),1);
});
