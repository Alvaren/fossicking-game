import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Check the shipped mesh, not just its generator. A through-cut makes two
// individually closed pieces, so watertight edges alone would miss the defect.
const file = readFileSync(new URL('../public/models/newengland/environment.glb', import.meta.url));
assert.equal(file.readUInt32LE(0), 0x46546c67);
const jsonLength = file.readUInt32LE(12);
const gltf = JSON.parse(file.toString('utf8', 20, 20 + jsonLength));
const binary = file.subarray(28 + jsonLength);
function readAccessor(id) {
  const a = gltf.accessors[id], view = gltf.bufferViews[a.bufferView];
  const width = { SCALAR:1, VEC3:3 }[a.type];
  const size = { 5121:1, 5123:2, 5125:4, 5126:4 }[a.componentType];
  const read = { 5121:'readUInt8', 5123:'readUInt16LE', 5125:'readUInt32LE', 5126:'readFloatLE' }[a.componentType];
  assert.ok(width && size && read);
  const offset = (view.byteOffset || 0) + (a.byteOffset || 0);
  return Array.from({ length:a.count }, (_, i) => Array.from({ length:width }, (_, j) =>
    binary[read](offset + i * (view.byteStride || width * size) + j * size)));
}
const manifest = JSON.parse(readFileSync(new URL('../public/models/newengland/manifest.json', import.meta.url)));
const rocks = gltf.nodes.filter(n => /^(granite|cobble|basalt|rhyolite|slab)_\d$/.test(n.name));
assert.equal(rocks.length, 19, 'All ordinary rock variants must be present');
for (const node of rocks) {
  test(`${node.name}: one closed, connected rock without a through-cut`, () => {
    const vertices = new Map(), edges = new Map(), neighbours = [];
    let triangles = 0;
    function walk(n) {
      if (n.mesh !== undefined) for (const p of gltf.meshes[n.mesh].primitives) {
        const positions = readAccessor(p.attributes.POSITION);
        const ids = positions.map(position => {
          assert.ok(position.every(Number.isFinite));
          const key = position.map(v => Math.round(v * 1e5)).join(',');
          if (!vertices.has(key)) { vertices.set(key, vertices.size); neighbours.push(new Set()); }
          return vertices.get(key);
        });
        const index = p.indices === undefined ? positions.map((_,i) => i) : readAccessor(p.indices).flat();
        for (let i=0; i<index.length; i+=3) {
          const v = index.slice(i,i+3).map(k => ids[k]);
          assert.equal(new Set(v).size, 3, 'No degenerate triangles');
          triangles++;
          for (let j=0; j<3; j++) {
            const a=v[j], b=v[(j+1)%3], key=a<b ? `${a}:${b}` : `${b}:${a}`;
            edges.set(key, (edges.get(key)||0)+1);
            neighbours[a].add(b); neighbours[b].add(a);
          }
        }
      }
      for (const child of n.children || []) walk(gltf.nodes[child]);
    }
    walk(node);
    assert.equal(triangles, manifest.assets[node.name].triangles);
    assert.ok(triangles > 0);
    assert.ok([...edges.values()].every(count => count === 2), 'Every edge has exactly two adjoining faces');
    const visited = new Set([0]), queue=[0];
    while (queue.length) for (const v of neighbours[queue.pop()]) if (!visited.has(v)) {visited.add(v);queue.push(v);}
    assert.equal(visited.size, vertices.size, 'The rock must be one connected volume');
  });
}
