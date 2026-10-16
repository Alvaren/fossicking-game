import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Call only for explicitly static direct children. Keep the parent transform,
// interaction/collision records, transparent ordering and custom shaders intact.
export function batchStaticChildren(group) {
  const batches=new Map();
  for(const mesh of group.children) {
    const m=mesh.material,g=mesh.geometry;
    if(!mesh.isMesh||mesh.isInstancedMesh||mesh.isSkinnedMesh||mesh.children.length||!mesh.visible||Array.isArray(m)||
      !m||m.transparent||m.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile||m.displacementMap||
      mesh.onBeforeRender!==THREE.Object3D.prototype.onBeforeRender||Object.keys(g.morphAttributes).length||
      g.drawRange.start!==0||g.drawRange.count!==Infinity)continue;
    mesh.updateMatrix();if(mesh.matrix.determinant()<0)continue;
    const attributes=Object.entries(g.attributes).map(([k,a])=>[k,a.itemSize,a.normalized,a.array.constructor.name].join(':')).sort().join(',');
    const key=[m.uuid,mesh.castShadow,mesh.receiveShadow,mesh.renderOrder,mesh.layers.mask,attributes].join('|');
    if(!batches.has(key))batches.set(key,[]);batches.get(key).push(mesh);
  }
  let saved=0;
  for(const meshes of batches.values()) {
    if(meshes.length<2)continue;
    const pieces=meshes.map(m=>(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone()).applyMatrix4(m.matrix));
    const geometry=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());
    if(!geometry)continue;
    geometry.computeBoundingSphere();geometry.computeBoundingBox();
    const first=meshes[0],mesh=new THREE.Mesh(geometry,first.material);
    mesh.name=`${group.name||'Scenery'} static pieces`;mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;
    mesh.renderOrder=first.renderOrder;mesh.layers.mask=first.layers.mask;mesh.matrixAutoUpdate=false;
    group.remove(...meshes);group.add(mesh);saved+=meshes.length-1;
    // Source geometry may be shared elsewhere; only the merged copies are owned.
  }
  return saved;
}
