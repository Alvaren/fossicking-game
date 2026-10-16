import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {makeShovelModel} from '../../../src/models/shovel.js';
import {Vector3,Box3} from 'three';
import {createHash} from 'node:crypto';
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
const adjacency=Array.from({length:p.count},()=>[]);
for(const key of edges.keys()){const [x,y]=key.split(':').map(Number);adjacency[x].push(y);adjacency[y].push(x);}
const visited=new Set([0]),pending=[0];while(pending.length){for(const id of adjacency[pending.pop()])if(!visited.has(id)){visited.add(id);pending.push(id);}}
assert.equal(visited.size,p.count,'Head and socket form one connected mesh');
let triangles=0,vertices=0,bytes=0;
for(const mesh of group.children){const g=mesh.geometry;triangles+=(g.index?.count||g.attributes.position.count)/3;vertices+=g.attributes.position.count;bytes+=g.index?.array.byteLength||0;for(const attr of Object.values(g.attributes)){assert.ok(attr.array.every(Number.isFinite));bytes+=attr.array.byteLength;}}
group.updateMatrixWorld(true);
const report={triangles,vertices,geometryBytes:bytes,visibleDraws:group.children.filter(o=>o.visible).length,loadedDraws:group.children.length,blade:{connectedComponents:1,triangles:v.length/3,vertices:p.count,closedEdges:edges.size,minTriangleArea:minArea,volumeM3:volume,bounds:g.boundingBox},modelBounds:new Box3().setFromObject(group),textureBytesWithoutMipmaps:64*256*4+128*128*4,dirtInitiallyHidden:!dirt.visible};
// Hashes captured from the user-approved parts at 0c0c12e.
const approved={
  wood:{position:'602293476c9857c325dc65c6b33d88168e440009538b3933ef5c28243eb0c245',normal:'54c5cb02fda0aa7c4ce615ac83b06297adb34e39ba981f42d1880dd4c540d42d',uv:'2b3b40ce025247820508fbecae58960c2d1cd6550ec4a78e8ffa14eb136f8d37'},
  grip:{position:'18193a1545d3a5d238629c17fe0e03756b6d5339b14f75ce96d4218768f50610',normal:'655402c6942204d37c838eb4d49e7f366357172b6dfe97c8788799cdab424414',uv:'e85f4231a6c9aac1f1caf44efe2d84d6b00bab2a47f8313030b9bacff617ec03'},
  texture:'a07239f8c8a8da17c45387209997cd5915fe5b1c97c29b17de5ebef63da51a79'
};
const wood=group.getObjectByName('Handle and grip');
const digest=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
report.preserved={};
for(const key of ['position','normal','uv']) {
  assert.equal(digest(wood.geometry.attributes[key].array),approved.wood[key],'Approved wood '+key);
  report.preserved['wood_'+key]=digest(wood.geometry.attributes[key].array);
  const a=group.getObjectByName('Grip and fittings').geometry.attributes[key];
  assert.equal(digest(a.array.subarray(0,2496*a.itemSize)),approved.grip[key],'Approved grip fittings '+key);
}
assert.equal(digest(wood.material.map.image.data),approved.texture);
report.preserved.woodTexture=digest(wood.material.map.image.data);
report.preserved.gripFittingsVertices=2496;
assert.ok(triangles<8000,'Small shared viewmodel budget');
await writeFile('docs/audits/shovel-socket/geometry.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
