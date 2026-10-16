// Scene transforms cannot change between the synchronous views of one frame.
// Update once, then restore automatic behaviour even when a render throws.
export function withSceneTransforms(scene, camera, render) {
  scene.updateMatrixWorld(); camera.updateMatrixWorld();
  const automatic = scene.matrixWorldAutoUpdate;
  scene.matrixWorldAutoUpdate = false;
  try { return render(); }
  finally { scene.matrixWorldAutoUpdate = automatic; }
}
