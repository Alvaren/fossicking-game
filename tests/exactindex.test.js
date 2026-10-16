import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {indexExact} from '../src/rendering/exactindex.js';

test('exact indexing preserves every expanded attribute byte and original triangle order',()=>{
  const g=new THREE.BoxGeometry().toNonIndexed(),count=g.attributes.position.count;
  const colour=new Float32Array(count*3);for(let i=0;i<count;i++)colour.set([i<6?.2:.4,.5,.6],i*3);g.setAttribute('color',new THREE.BufferAttribute(colour,3));
  const before=Object.fromEntries(Object.entries(g.attributes).map(([name,a])=>[name,Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength)]));
  indexExact(g);assert.ok(g.index);assert.ok(g.attributes.position.count<count);assert.equal(g.index.count,count);
  const expanded=g.toNonIndexed();for(const [name,a] of Object.entries(expanded.attributes))assert.deepEqual(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength),before[name]);
  const index=g.index;assert.equal(indexExact(g).index,index,'Already indexed geometry is left alone');
});
test('coincident vertices with different normals, colours or signed zero remain separate',()=>{
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,0,0,0,0,0,-0,0,0,0,0,0],3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute([0,1,0,0,1,0,0,-1,0,0,1,0,0,1,0],3));
  g.setAttribute('color',new THREE.Uint8BufferAttribute([1,2,3,1,2,3,1,2,3,1,2,3,2,2,3],3,true));
  indexExact(g);assert.equal(g.attributes.position.count,4);assert.deepEqual(Array.from(g.index.array),[0,0,1,2,3]);assert.equal(g.attributes.color.normalized,true);
});
