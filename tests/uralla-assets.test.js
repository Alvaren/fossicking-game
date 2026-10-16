import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Uralla granite and cobbles export material roles understood by the shared loader',()=>{
  const bytes=readFileSync(new URL('../public/models/uralla/environment.glb',import.meta.url));
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));
  assert.equal(gltf.meshes.length,10);
  for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){
    const name=gltf.materials[primitive.material].name;
    assert.equal(name.split('_')[0],'granite',`${mesh.name}: ${name} would fall back to slate in the loader`);
  }
});
