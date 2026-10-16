import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {makeShovelModel} from '../../../src/models/shovel.js';
import {Vector3,Box3} from 'three';
const {group,dirt}=makeShovelModel(),g=group.getObjectByName('Pressed steel blade').geometry,p=g.attributes.position,v=g.index.array;
const edges=new Map(),a=new Vector3(),b=new Vector3(),c=new Vector3();let minArea=Infinity,volume=0;
for(let i=0;i<v.length;i+=3){
  const ids=Array.from(v.slice(i,i+3));a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);
  volume+=a.dot(b.clone().cross(c))/6;
  const area=b.clone().sub(a).cross(c.clone().sub(a)).length()/2;assert.ok(Number.isFinite(area)&&area>1e-10);minArea=Math.min(minArea,area);
  for(let e=0;e<3;e++){const x=ids[e],y=ids[(e+1)%3],key=Math.min(x,y)+':'+Math.max(x,y),entry=edges.get(key)||{count:0,winding:0};entry.count++;entry.winding+=x<y?1:-1;edges.set(key,entry);}
}
for(const e of edges.values()){assert.equal(e.count,2,'Closed blade');assert.equal(e.winding,0,'Consistent outward winding');}
assert.ok(volume>0,'Positive enclosed blade volume');
let triangles=0,vertices=0,bytes=0;
for(const mesh of group.children){const g=mesh.geometry;triangles+=(g.index?.count||g.attributes.position.count)/3;vertices+=g.attributes.position.count;bytes+=g.index?.array.byteLength||0;for(const attr of Object.values(g.attributes)){assert.ok(attr.array.every(Number.isFinite));bytes+=attr.array.byteLength;}}
group.updateMatrixWorld(true);
const report={triangles,vertices,geometryBytes:bytes,visibleDraws:group.children.filter(o=>o.visible).length,loadedDraws:group.children.length,blade:{triangles:v.length/3,vertices:p.count,closedEdges:edges.size,minTriangleArea:minArea,volumeM3:volume,bounds:g.boundingBox},modelBounds:new Box3().setFromObject(group),textureBytesWithoutMipmaps:64*256*4+128*128*4,dirtInitiallyHidden:!dirt.visible};
await writeFile('docs/audits/shovel/geometry.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
