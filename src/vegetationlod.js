import * as THREE from 'three';

// Keep the authored transforms as the source of truth. Only draw lists change.
export function foliageLOD(geometry, stride = 4) {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const keep = [], leaf = source.attributes.aFoliage;
  for (let i = 0; i < source.attributes.position.count; i += 3) {
    if (!leaf || leaf.getX(i) < .5 || Math.floor(i / 12) % stride === 0) keep.push(i, i + 1, i + 2);
  }
  const reduced = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    const values = new attribute.array.constructor(keep.length * attribute.itemSize);
    keep.forEach((index, i) => values.set(attribute.array.subarray(index * attribute.itemSize, (index + 1) * attribute.itemSize), i * attribute.itemSize));
    reduced.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize, attribute.normalized));
  }
  reduced.computeBoundingSphere();
  if (source !== geometry) source.dispose();
  return reduced;
}

export function detailBand(distance, previous, near, far) {
  if (distance > far + (previous === 2 ? -4 : 4)) return 2;
  return distance < near + (previous === 0 ? 4 : -4) ? 0 : 1;
}

export function vegetationLOD(scene, sources, low = false) {
  const matrix = new THREE.Matrix4(), color = new THREE.Color(), last = new THREE.Vector3(Infinity, 0, Infinity);
  const batches = sources.filter(s => s.count).map(source => {
    const near = new THREE.InstancedMesh(source.geometry, source.material, source.count);
    const far = new THREE.InstancedMesh(foliageLOD(source.geometry, low ? 5 : 3), source.material, source.count);
    for (const [i, mesh] of [near, far].entries()) {
      mesh.name = `${source.name} · ${i ? 'distant' : 'near'}`;
      mesh.userData.environmentOnly = true;
      mesh.customDepthMaterial = source.customDepthMaterial;
      mesh.castShadow = i === 0 && source.castShadow; mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      source.parent.add(mesh);
    }
    source.visible = false; source.userData.lodSource = true;
    return { source, near, far, bands: new Uint8Array(source.count).fill(2) };
  });
  let timer = 1;
  const stats = { near: 0, far: 0, culled: 0, fullTriangles: 0, drawnTriangles: 0 };
  return { batches, stats, update(dt, player, force = false) {
    timer += dt;
    if (!force && (timer < .3 || Math.hypot(player.x - last.x, player.z - last.z) < 2)) return;
    timer = 0; last.set(player.x, 0, player.z);
    Object.keys(stats).forEach(k => stats[k] = 0);
    for (const { source, near, far, bands } of batches) {
      let n = 0, f = 0;
      const tree = source.userData.tree || /canopy/i.test(source.name);
      const nearDistance = low ? 32 : 55, farDistance = tree ? (low ? 160 : 240) : (low ? 55 : 90);
      for (let i = 0; i < source.count; i++) {
        source.getMatrixAt(i, matrix);
        const d = Math.hypot(matrix.elements[12] - player.x, matrix.elements[14] - player.z);
        const band = bands[i] = detailBand(d, bands[i], nearDistance, farDistance);
        if (band === 2) { stats.culled++; continue; }
        const target = band === 0 ? near : far, index = band === 0 ? n++ : f++;
        target.setMatrixAt(index, matrix);
        if (source.instanceColor) { source.getColorAt(i, color); target.setColorAt(index, color); }
      }
      near.count = n; far.count = f;
      for (const mesh of [near, far]) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
      const triangles = g => (g.index?.count || g.attributes.position.count) / 3;
      stats.near += n; stats.far += f;
      stats.fullTriangles += source.count * triangles(source.geometry);
      stats.drawnTriangles += n * triangles(near.geometry) + f * triangles(far.geometry);
    }
  }};
}
