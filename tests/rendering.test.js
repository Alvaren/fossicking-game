import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {dirtyGridAttributes} from '../src/rendering/dirtygrid.js';
import {waterVisibility} from '../src/rendering/waterbounds.js';
import {batchStaticChildren} from '../src/rendering/staticbatch.js';
import {withSceneTransforms} from '../src/rendering/frame.js';

function grid(columns=7,rows=5) {
  const g=new THREE.PlaneGeometry(columns,rows,columns,rows).rotateX(-Math.PI/2);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,Math.sin(i*.6)*.2);
  g.computeVertexNormals();g.computeBoundingSphere();
  return new THREE.Mesh(g,new THREE.MeshBasicMaterial());
}
test('dirty ranges accumulate multiple edits and include all intervening grid rows',()=>{
  const g=grid().geometry,version=g.attributes.position.version;
  dirtyGridAttributes(g,8,2,4,1,3,['position','normal']);
  dirtyGridAttributes(g,8,0,1,4,4,['position','normal']);
  assert.deepEqual(g.attributes.position.updateRanges,[{start:30,count:57},{start:96,count:6}]);
  assert.equal(g.attributes.position.version,version+2);
  assert.equal(g.attributes.uv.version,0);
});
test('water visibility follows the current camera and translated parent, including flood height',()=>{
  const mesh=grid(),visibleFrom=waterVisibility(mesh,7,5,2),camera=new THREE.PerspectiveCamera(50,1,.1,100);
  mesh.position.set(0,5,-10);mesh.updateMatrixWorld();camera.position.set(0,8,0);camera.lookAt(0,5,-10);camera.updateMatrixWorld();
  assert.equal(visibleFrom(camera),true);
  camera.lookAt(0,8,10);camera.updateMatrixWorld();assert.equal(visibleFrom(camera),false);
  mesh.visible=false;camera.lookAt(0,5,-10);camera.updateMatrixWorld();assert.equal(visibleFrom(camera),false);
});
test('static batching preserves every vertex, UV, material and shadow setting',()=>{
  const root=new THREE.Group(),material=new THREE.MeshStandardMaterial(),vertices=[];
  for(let i=0;i<5;i++) {
    const m=new THREE.Mesh(new THREE.BoxGeometry(1+i,.5,2),material);m.position.set(i*2,i*.1,-i);m.rotation.y=i*.2;
    m.castShadow=true;m.receiveShadow=true;root.add(m);m.updateMatrix();
    const g=m.geometry.toNonIndexed().applyMatrix4(m.matrix);
    vertices.push(...g.attributes.position.array);
  }
  assert.equal(batchStaticChildren(root),4);assert.equal(root.children.length,1);
  const m=root.children[0];assert.equal(m.material,material);assert.equal(m.castShadow,true);assert.equal(m.receiveShadow,true);
  assert.deepEqual(Array.from(m.geometry.attributes.position.array),vertices);assert.equal(m.geometry.attributes.uv.count,m.geometry.attributes.position.count);
  assert.equal(batchStaticChildren(root),0,'A second pass does not rebuild an already merged group');
});
test('static batching leaves transparent parts, custom shaders, child groups and different shadow modes independent',()=>{
  const root=new THREE.Group(),mat=new THREE.MeshStandardMaterial(),glass=new THREE.MeshStandardMaterial({transparent:true});
  const custom=mat.clone();custom.onBeforeCompile=()=>{};
  const add=(material,shadow)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(),material);m.castShadow=shadow;root.add(m);return m;};
  const transparent=[add(glass,true),add(glass,true)],shader=[add(custom,true),add(custom,true)];
  const child=new THREE.Group();root.add(child);
  for(const shadow of [true,false])for(let i=0;i<2;i++)add(mat,shadow);
  assert.equal(batchStaticChildren(root),2);
  for(const m of [...transparent,...shader,child])assert.ok(root.children.includes(m));
  assert.equal(root.children.filter(m=>m.material===mat).length,2);
  assert.equal(root.children.filter(m=>m.material===mat&&m.castShadow).length,1);
});
test('world matrices update once for all frame passes and auto-update is restored even on failure',()=>{
  const scene=new THREE.Scene(),group=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry()),camera=new THREE.PerspectiveCamera();scene.add(group);group.add(mesh);
  let updates=0;const fn=mesh.updateMatrixWorld.bind(mesh);mesh.updateMatrixWorld=force=>{updates++;return fn(force);};
  group.position.set(1,2,3);mesh.position.set(4,5,6);
  withSceneTransforms(scene,camera,()=>{
    assert.equal(scene.matrixWorldAutoUpdate,false);assert.deepEqual(new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld).toArray(),[5,7,9]);
    for(let i=0;i<3;i++)if(scene.matrixWorldAutoUpdate)scene.updateMatrixWorld();
  });
  assert.equal(updates,1);assert.equal(scene.matrixWorldAutoUpdate,true);
  mesh.position.x=8;
  assert.throws(()=>withSceneTransforms(scene,camera,()=>{assert.equal(mesh.matrixWorld.elements[12],9);throw Error('render failed');}),/render failed/);
  assert.equal(scene.matrixWorldAutoUpdate,true);assert.equal(updates,2);
});
