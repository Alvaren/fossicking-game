import * as THREE from 'three';

// Visibility bounds only: preserve the original water mesh, shader and draw.
export function waterVisibility(mesh,columns,rows,step=32) {
  const spheres=[],box=new THREE.Box3(),point=new THREE.Vector3(),sphere=new THREE.Sphere();
  const p=mesh.geometry.attributes.position,stride=columns+1,frustum=new THREE.Frustum(),projection=new THREE.Matrix4();
  for(let row=0;row<rows;row+=step){
    box.makeEmpty();for(let r=row;r<=Math.min(rows,row+step);r++)for(let c=0;c<=columns;c++)box.expandByPoint(point.fromBufferAttribute(p,r*stride+c));
    spheres.push(box.getBoundingSphere(new THREE.Sphere()));
  }
  return camera=>{
    if(!mesh.visible)return false;
    projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projection);
    return spheres.some(bound=>frustum.intersectsSphere(sphere.copy(bound).applyMatrix4(mesh.matrixWorld)));
  };
}
