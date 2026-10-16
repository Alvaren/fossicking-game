// Multiple edits before a render accumulate; never discard an earlier dirty span.
export function dirtyGridAttributes(geometry, stride, x0, x1, z0, z1, names) {
  const first = z0*stride+x0, count = (z1-z0)*stride+x1-x0+1;
  for (const name of names) {
    const attribute = geometry.attributes[name]; if (!attribute) continue;
    attribute.addUpdateRange(first*attribute.itemSize,count*attribute.itemSize);
    attribute.needsUpdate = true;
  }
}
