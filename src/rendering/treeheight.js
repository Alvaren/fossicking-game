// Alter authored tree stature without moving roots, widening trunks, or
// stretching the individual four-triangle leaves used by the shared kit.
export function treeHeight(geometry, factor) {
  if (factor === 1) return geometry;
  const p = geometry.attributes.position, n = geometry.attributes.normal;
  const f = geometry.attributes.aFoliage;
  const height = y => y <= .7 ? y : .7 + (y - .7) * factor;
  for (let i = 0; i < p.count;) {
    if (f.getX(i) > .5) {
      const count = Math.min(12, p.count - i);
      let centre = 0;
      for (let k = 0; k < count; k++) centre += p.getY(i+k) / count;
      const shift = height(centre) - centre;
      for (let k = 0; k < count; k++) p.setY(i+k, p.getY(i+k) + shift);
      i += count;
    } else {
      const y = p.getY(i), ny = n.getY(i) / (y <= .7 ? 1 : factor);
      const length = Math.hypot(n.getX(i), ny, n.getZ(i));
      p.setY(i, height(y));
      n.setXYZ(i, n.getX(i)/length, ny/length, n.getZ(i)/length);
      i++;
    }
  }
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
