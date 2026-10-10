import * as THREE from 'three';
import { mulberry32 } from './noise.js';

const up = new THREE.Vector3(0, 1, 0);
let pointGeometry;
function quartzPoint() {
  if (pointGeometry) return pointGeometry;
  const positions = [];
  const ring = (i, y, r) => [Math.cos(i * Math.PI / 3) * r, y, Math.sin(i * Math.PI / 3) * r];
  const tri = (a, b, c) => positions.push(...a, ...b, ...c);
  for (let i = 0; i < 6; i++) {
    const a = ring(i, 0, .65), b = ring(i + 1, 0, .65), c = ring(i, .65, .6), d = ring(i + 1, .65, .6);
    tri(a, c, b); tri(b, c, d); tri(c, [0, 1, 0], d); tri(a, b, [0, 0, 0]);
  }
  pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  pointGeometry.computeVertexNormals();
  return pointGeometry;
}

// An actual open bowl, with a polished annular rim. No disc covers the cavity.
export function makeHollowHalves(item, { radius, colour = 0xe9eef2, bands = [0x8d969e, 0xd1d7d9, 0xf0ece3], star = false, opening = .7 } = {}) {
  const seed = item.seed || 1, random = mulberry32(seed);
  const phase = random() * Math.PI * 2;
  const outline = angle => 1 + .045 * Math.sin(angle * 3 + phase) + .028 * Math.sin(angle * 7 - phase);
  const hole = angle => opening * (star ? .87 + .13 * Math.cos(angle * 5 + phase) : 1 + .05 * Math.sin(angle * 4 + phase));
  const point = (angle, t, inner) => {
    const r = (inner ? hole(angle) : outline(angle)) * Math.cos(t);
    return [Math.cos(angle) * r, Math.sin(angle) * r * .88, -Math.sin(t) * (inner ? .55 : .79)];
  };
  const bowl = inner => {
    const positions = [], indices = [], segments = 48, rows = 12;
    for (let row = 0; row <= rows; row++) for (let i = 0; i <= segments; i++) positions.push(...point(i / segments * Math.PI * 2, row / rows * Math.PI / 2, inner));
    for (let row = 0; row < rows; row++) for (let i = 0; i < segments; i++) {
      const a = row * (segments + 1) + i, b = a + 1, c = a + segments + 1, d = c + 1;
      if (inner) indices.push(a, b, c, b, d, c); else indices.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setIndex(indices); geo.computeVertexNormals();

    return geo;
  };
  const rimGeometry = () => {
    const pos = [], colors = [], bandsCount = 9, segments = 64;
    const palettes = bands.map(c => new THREE.Color(c));
    for (let row = 0; row < bandsCount; row++) for (let i = 0; i < segments; i++) {
      const vertex = (k, band) => {
        const a = k / segments * Math.PI * 2, f = band / bandsCount;
        const r = outline(a) * (1 - f) + hole(a) * f;
        return [Math.cos(a) * r, Math.sin(a) * r * .88, 0];
      };
      const a = vertex(i, row), b = vertex(i + 1, row), c = vertex(i, row + 1), d = vertex(i + 1, row + 1);
      pos.push(...a, ...b, ...c, ...b, ...d, ...c);
      const color = row === 0 ? new THREE.Color(0x766756) : palettes[row % palettes.length];
      for (let k = 0; k < 6; k++) colors.push(color.r, color.g, color.b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals();
    return geo;
  };
  const outside = bowl(false), inside = bowl(true), rim = rimGeometry();
  const rock = new THREE.MeshStandardMaterial({ color: star ? 0x84604c : 0x817b6d, roughness: .96, side: THREE.DoubleSide });
  const lining = new THREE.MeshStandardMaterial({ color: new THREE.Color(colour).multiplyScalar(.17), roughness: .7, side: THREE.DoubleSide });
  const polish = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .23, clearcoat: .6, clearcoatRoughness: .15, side: THREE.DoubleSide });
  const crystal = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .13, ior: 1.54, clearcoat: .25, clearcoatRoughness: .12 });
  const total = item.grade === 'A' ? 90 : item.grade === 'C' ? 52 : 70;
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    const half = new THREE.Group();
    half.add(new THREE.Mesh(outside, rock), new THREE.Mesh(inside, lining), new THREE.Mesh(rim, polish));
    const points = new THREE.InstancedMesh(quartzPoint(), crystal, total);
    const pose = new THREE.Object3D(), color = new THREE.Color(colour);
    // A deterministic jittered spiral covers the bowl rather than piling up
    // crystals at its pole. Bases are on the lining, tips grow into the hollow.
    const r = mulberry32(seed + (side > 0 ? 97 : 0));
    for (let i = 0; i < total; i++) {
      const a = i * 2.39996323 + (r() - .5) * .35;
      const t = Math.asin(.06 + (i + .5) / total * .9);
      const [x, y, z] = point(a, t, true);
      pose.position.set(x, y, z + .008);
      const direction = new THREE.Vector3(-x + (r() - .5) * .18, -y + (r() - .5) * .18, -.1 - z).normalize();
      pose.quaternion.setFromUnitVectors(up, direction);
      const width = .04 + r() * .047, length = .09 + r() * .15;
      pose.scale.set(width, length, width); pose.updateMatrix();
      points.setMatrixAt(i, pose.matrix);
      points.setColorAt(i, color.clone().lerp(new THREE.Color(0xffffff), r() * .25).multiplyScalar(.68 + r() * .5));
    }
    points.instanceMatrix.needsUpdate = true; points.instanceColor.needsUpdate = true;
    points.computeBoundingBox(); points.computeBoundingSphere();
    points.name = 'Geode crystal lining';
    half.add(points);
    half.position.x = side * 1.06 * radius;
    half.rotation.y = -side * .17;
    half.scale.set(side > 0 ? -radius : radius, radius, radius);
    half.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.add(half);
  }
  group.userData.hollow = true;
  // Only release this specimen's resources; quartz point geometry is shared.
  group.userData.dispose = () => {
    for (const geometry of [outside, inside, rim]) geometry.dispose();
    for (const material of [rock, lining, polish, crystal]) material.dispose();
    group.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
  };
  return group;
}
