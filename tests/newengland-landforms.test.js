import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { surfaceGeometry, segmentDistance, buildLandforms } from '../src/newengland/landforms.js';

test('surface geometry follows saved slopes, respects exclusion and faces outward',()=>{
  const ground=(x,z)=>x*.25+z*.12;
  const terrain={inside:()=>true,getHeight:ground};
  const shape=surfaceGeometry(terrain,{x0:-1,z0:-1,x1:1,z1:1},.1,()=>({cover:1,height:.04,colour:[.3,.2,.1]}),(x,z)=>Math.hypot(x,z)>.3);
  const p=shape.geometry.attributes.position,n=shape.geometry.attributes.normal;
  assert.ok(p.count>0);
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),z=p.getZ(i);
    assert.ok(Math.abs(p.getY(i)-ground(x,z)-.04)<1e-6);
    assert.ok(Math.hypot(x,z)>.299);
    assert.ok(n.getY(i)>.9);
  }
  assert.equal(segmentDistance(1,1,{x:0,z:0},{x:2,z:0}),1);
  assert.equal(segmentDistance(3,0,{x:0,z:0},{x:2,z:0}),1);
});

test('rock exposures retain source data and withdraw locally after digging or equipment placement',()=>{
  let dug=false,equipment=false;
  const terrain={sources:{reef:{x:0,z:0}},orig:[],inside:(x,z)=>Math.abs(x)<10&&Math.abs(z)<10,
    getHeight:(x,z)=>dug&&x<0?-.15:0,sampleGrid:()=>0,
    creek:{cx:()=>40,halfWidth:()=>2,dcx:()=>0,waterY:()=>-2,local:()=>({d:40,w:2})}};
  const anchors=[{x:-.5,y:0,z:0,radius:1.1,height:1,family:'host',bearing:.3,mass:true},{x:1,y:0,z:0,radius:1.1,height:1,family:'host',bearing:.3,mass:true}];
  const before=JSON.stringify({anchors,sources:terrain.sources}),root=new THREE.Group();
  const mask={blocked:()=>false,dynamic:(x)=>equipment&&x>=0};
  const system=buildLandforms(root,terrain,anchors,mask);
  assert.ok(system.patches.length>0);
  system.update({x:0,z:0});
  const ys=()=>system.patches.flatMap(p=>Array.from(p.mesh.geometry.attributes.position.array).filter((_,i)=>i%3===1));
  assert.ok(ys().some(y=>y>.5),'Forms have real raised faces at existing rocks');
  const supported=system.patches.flatMap(p=>p.support);
  assert.ok(supported.some(p=>Math.abs(p.x-.25)<.2&&Math.abs(p.z)<.2),'Adjacent masses form a connected exposure');
  dug=true;system.update({x:0,z:0});
  assert.ok(ys().some(y=>y===-10000),'Worked triangles withdraw');
  assert.ok(ys().some(y=>y>.5),'Unworked rock remains');
  equipment=true;system.update({x:0,z:0});
  assert.ok(ys().every(y=>y===-10000),'Placed equipment remains clear');
  assert.equal(JSON.stringify({anchors,sources:terrain.sources}),before);
});

test('sampled rock boundaries close against ground without open cuts or tile overshoot',()=>{
  const shape=surfaceGeometry({inside:()=>true,getHeight:()=>0},{x0:-1,z0:-1,x1:1,z1:1},.14,
    (x,z)=>Math.hypot(x,z)<.9?{cover:1,height:.7,colour:[.3,.3,.3]}:null,()=>true,true);
  const p=shape.geometry.attributes.position,edges=new Map();
  const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(n=>n.toFixed(5)).join(',');
  for(let i=0;i<p.count;i+=3)for(const [a,b] of [[i,i+1],[i+1,i+2],[i+2,i]]) {
    const k=[key(a),key(b)].sort().join('|');
    const e=edges.get(k)||{count:0,a,b};e.count++;edges.set(k,e);
  }
  assert.ok(p.count>0);
  for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getX(i))<=1&&Math.abs(p.getZ(i))<=1);
  for(const e of edges.values())if(e.count===1) {
    assert.ok(p.getY(e.a)<0&&p.getY(e.b)<0,'Every exposed edge is closed down to its buried base');
  }
});
