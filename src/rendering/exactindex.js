import * as THREE from 'three';

// Reuse only byte-identical vertices, across every attribute. No rounding,
// quantisation, triangle reordering, normal smoothing or silhouette change.
export function indexExact(geometry) {
  if(geometry.index)return geometry;
  const attributes=Object.entries(geometry.attributes),count=geometry.attributes.position.count;
  if(attributes.some(([,a])=>a.isInterleavedBufferAttribute||a.isInstancedBufferAttribute||a.count!==count))throw new TypeError('Expected plain per-vertex attributes');
  const words=attributes.map(([,a])=>{
    const Type=a.array.BYTES_PER_ELEMENT===4?Uint32Array:Uint8Array;
    return {data:new Type(a.array.buffer,a.array.byteOffset,a.array.byteLength/Type.BYTES_PER_ELEMENT),stride:a.itemSize*a.array.BYTES_PER_ELEMENT/Type.BYTES_PER_ELEMENT};
  });
  const map=new Map(),unique=[],indices=new Uint32Array(count);
  for(let i=0;i<count;i++) {
    let key='';for(const {data,stride} of words)for(let k=0;k<stride;k++)key+=data[i*stride+k]+',';
    let index=map.get(key);
    if(index===undefined){index=unique.length;map.set(key,index);unique.push(i);}
    indices[i]=index;
  }
  if(unique.length===count)return geometry;
  for(const [name,a] of attributes) {
    const values=new a.array.constructor(unique.length*a.itemSize);
    unique.forEach((i,n)=>values.set(a.array.subarray(i*a.itemSize,(i+1)*a.itemSize),n*a.itemSize));
    geometry.setAttribute(name,new THREE.BufferAttribute(values,a.itemSize,a.normalized).setUsage(a.usage));
  }
  geometry.setIndex(new THREE.BufferAttribute(unique.length<=65536?new Uint16Array(indices):indices,1));
  geometry.userData.exactIndex={before:count,after:unique.length};
  return geometry;
}
