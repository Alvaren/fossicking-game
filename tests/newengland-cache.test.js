import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {newEnglandGroundDetail} from '../src/newengland/grounddetail.js';

// Compare the cached system to one recomputed on every update, through real
// surface changes, collected finds, walking and quality transitions.
test('cached cut detail equals full recomputation after every invalidating change',()=>{
  let worked=false,queries=0;
  const crystal={x:.2,z:.2,collected:false},overlay={crystals:[{c:crystal}]};
  const terrain={revision:0,overlays:[overlay],orig:[],sampleGrid:()=>0,inside:()=>true,
    getHeight:(x,z)=>{queries++;return worked?-Math.max(0,.25*(1-Math.hypot(x,z))):0;},
    creek:{waterY:()=>-2},overlayAt:(x,z)=>Math.hypot(x,z)<1.1?overlay:null};
  const uncached={...terrain,revision:undefined},a=new THREE.Group(),b=new THREE.Group(),kit={cobble_3:new THREE.IcosahedronGeometry(1,1)};
  const cached=newEnglandGroundDetail(a,terrain,kit),full=newEnglandGroundDetail(b,uncached,kit);
  const snapshot=root=>root.children.map(m=>({name:m.name,visible:m.visible,count:m.count,
    matrices:m.instanceMatrix?Array.from(m.instanceMatrix.array.slice(0,m.count*16)):null,
    position:m.isInstancedMesh?null:Array.from(m.geometry.attributes.position.array.slice(0,m.geometry.drawRange.count*3))}));
  const compare=(p={x:0,z:0},low=false)=>{cached.update(p,low);full.update(p,low);assert.deepEqual(snapshot(a),snapshot(b));};
  compare();queries=0;cached.update({x:0,z:0},false);assert.equal(queries,0,'Unchanged cut performs no ground sampling');
  worked=true;terrain.revision++;compare();assert.ok(a.children.some(m=>m.count>0));
  queries=0;cached.update({x:0,z:0},false);assert.equal(queries,0);
  crystal.collected=true;compare();compare({x:.3,z:.4});compare({x:.3,z:.4},true);
  worked=false;terrain.revision++;compare();assert.ok(a.children.every(m=>m.isInstancedMesh?m.count===0:!m.visible));
});
