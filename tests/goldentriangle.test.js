import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { treeHeight } from '../src/rendering/treeheight.js';

// Read the shipped trees, including transforms and material roles, so the
// stature test exercises real foliage primitives rather than invented quads.
const readKit = path => {
  const file=readFileSync(path),length=file.readUInt32LE(12);
  assert.equal(file.readUInt32LE(0),0x46546c67);
  const gltf=JSON.parse(file.toString('utf8',20,20+length)),binary=file.subarray(28+length);
  const accessor=id=>{
    const a=gltf.accessors[id],v=gltf.bufferViews[a.bufferView],width={SCALAR:1,VEC3:3,VEC4:4}[a.type];
    const size={5121:1,5123:2,5125:4,5126:4}[a.componentType];
    const read={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[a.componentType];
    const offset=(v.byteOffset||0)+(a.byteOffset||0);
    return Array.from({length:a.count},(_,i)=>Array.from({length:width},(_,j)=>binary[read](offset+i*(v.byteStride||width*size)+j*size)));
  };
  const geometry=name=>{
    const position=[],normal=[],foliage=[];
    const walk=(node,parent=new THREE.Matrix4())=>{
      const local=node.matrix?new THREE.Matrix4().fromArray(node.matrix):new THREE.Matrix4().compose(
        new THREE.Vector3(...(node.translation||[0,0,0])),new THREE.Quaternion(...(node.rotation||[0,0,0,1])),new THREE.Vector3(...(node.scale||[1,1,1])));
      const world=parent.clone().multiply(local),normals=new THREE.Matrix3().getNormalMatrix(world);
      if(node.mesh!==undefined)for(const p of gltf.meshes[node.mesh].primitives) {
        const points=accessor(p.attributes.POSITION),ns=accessor(p.attributes.NORMAL);
        const ids=p.indices===undefined?points.map((_,i)=>i):accessor(p.indices).flat();
        const leaf=/^leaf/.test(gltf.materials[p.material].name);
        for(const i of ids) {
          position.push(...new THREE.Vector3(...points[i]).applyMatrix4(world).toArray());
          normal.push(...new THREE.Vector3(...ns[i]).applyNormalMatrix(normals).toArray());
          foliage.push(leaf?1:0);
        }
      }
      for(const i of node.children||[])walk(gltf.nodes[i],world);
    };
    const root=gltf.nodes.find(n=>n.name===name);assert.ok(root,name);walk(root);
    return new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(position,3))
      .setAttribute('normal',new THREE.Float32BufferAttribute(normal,3)).setAttribute('aFoliage',new THREE.Float32BufferAttribute(foliage,1));
  };
  return {geometry};
};
const nsw=readKit(new URL('../public/models/newengland/environment.glb',import.meta.url));
const victoria=readKit(new URL('../public/models/goldentriangle/environment.glb',import.meta.url));

test('taller NSW trees preserve root footprints and individual leaf dimensions',()=>{
  for(const [i,factor] of [1.1,2.1,1.45,2.3].entries()) {
    const g=nsw.geometry('gum_'+i),before=g.attributes.position.array.slice(),f=g.attributes.aFoliage;
    treeHeight(g,factor);const p=g.attributes.position;
    assert.ok(p.array.every(Number.isFinite));assert.ok(g.attributes.normal.array.every(Number.isFinite));
    for(let j=0;j<p.count;j++) {
      assert.equal(p.getX(j),before[j*3]);assert.equal(p.getZ(j),before[j*3+2]);
      if(before[j*3+1]<=.7&&f.getX(j)<.5)assert.equal(p.getY(j),before[j*3+1],'Root stays fixed');
      if(f.getX(j)>.5) {
        const start=j;assert.ok(j+12<=p.count);
        for(let k=0;k<12;k++) {
          assert.equal(f.getX(start+k),1,'A folded leaf is contiguous in the exported material group');
          assert.ok(Math.abs((p.getY(start+k)-p.getY(start))-(before[(start+k)*3+1]-before[start*3+1]))<.00001,'Leaf height is unchanged');
        }
        j+=11;
      }
    }
    assert.ok(g.boundingBox.max.y>Math.max(...before.filter((_,j)=>j%3===1)),'Crown height increases');
  }
});

test('shipped goldfield kit includes varied mature trees and finite rooted understorey',()=>{
  const heights=[];
  for(const name of ['gum_0','gum_1','gum_2','gum_3','shrub_0','shrub_1','shrub_2']) {
    const g=victoria.geometry(name);g.computeBoundingBox();g.computeBoundingSphere();
    assert.ok(g.attributes.position.array.every(Number.isFinite));
    assert.ok(g.attributes.normal.array.every(Number.isFinite));
    assert.ok(g.attributes.aFoliage.array.some(f=>f===1)&&g.attributes.aFoliage.array.some(f=>f===0));
    assert.ok(Math.abs(g.boundingBox.min.y)<.2,'Plant roots remain at the ground origin');
    assert.ok(g.boundingSphere.radius<20,'Optional loader accepts the kit');
    if(name.startsWith('gum'))heights.push(g.boundingBox.max.y);
  }
  assert.ok(Math.max(...heights)>17,'Mature trees reach the requested taller canopy');
  assert.ok(Math.max(...heights)/Math.min(...heights)>1.7,'The four silhouettes have substantial height variation');
});
