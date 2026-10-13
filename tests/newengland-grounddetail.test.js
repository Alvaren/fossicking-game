import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { bankRootGeometry, newEnglandBankRoots } from '../src/newengland/bankroots.js';
import { newEnglandGroundDetail } from '../src/newengland/grounddetail.js';

test('bank roots follow sloping ground and withdraw when it is excavated', () => {
  let dug=false, reserved=false;
  const original=(x,z)=>.4+x*.12+Math.sin(z)*.05;
  const terrain={orig:[],getHeight:(x,z)=>original(x,z)-(dug&&x<2.5?.08:0),sampleGrid:(_,x,z)=>original(x,z),
    creek:{cx:()=>0,dcx:()=>0,halfWidth:()=>1,surfaceY:()=>0,local:(x)=>({d:Math.abs(x),w:1})}};
  const mask={blocked:()=>false,dynamic:()=>reserved};
  const tree=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial(),1);
  tree.userData.tree=true;tree.setMatrixAt(0,new THREE.Matrix4().makeTranslation(3,original(3,0),0));
  const before=Array.from(tree.instanceMatrix.array),root=new THREE.Group();
  const system=newEnglandBankRoots(root,terrain,{lod:{batches:[{source:tree}]}},mask,mask);
  assert.equal(system.branches.length,3);
  system.update({x:3,z:0},false);
  assert.ok(system.branches.every(b=>b.mesh.visible));
  for(const branch of system.branches) {
    assert.ok(Array.from(branch.mesh.geometry.attributes.position.array).every(Number.isFinite));
    assert.ok(branch.centres.every(p=>Math.abs(p.ground-original(p.x,p.z))<1e-8));
    const p=branch.mesh.geometry.attributes.position,n=branch.mesh.geometry.attributes.normal;
    for(let i=0;i<branch.centres.length;i++) {
      const c=branch.centres[i],v=new THREE.Vector3(p.getX(i*7)-c.x,p.getY(i*7)-c.ground+c.r*.18,p.getZ(i*7)-c.z);
      assert.ok(v.dot(new THREE.Vector3().fromBufferAttribute(n,i*7))>0,'Root faces point outward');
    }
  }
  reserved=true;system.update({x:3,z:0},false);
  assert.ok(system.branches.every(b=>!b.mesh.visible),'Placed equipment/working areas remain clear');
  reserved=false;dug=true;system.update({x:3,z:0},false);
  assert.ok(system.branches.every(b=>!b.mesh.visible),'No roots float above removed soil');
  assert.deepEqual(Array.from(tree.instanceMatrix.array),before,'Original tree anchors are untouched');
  const reloaded=newEnglandBankRoots(new THREE.Group(),terrain,{lod:{batches:[{source:tree}]}},mask,mask);
  assert.equal(reloaded.branches.length,0,'Loading worked ground does not recreate exposed floating roots');
});

test('root geometry rejects zero-length and invalid inputs', () => {
  const terrain={getHeight:()=>0};
  assert.throws(()=>bankRootGeometry(terrain,{x:0,z:0},{x:0,z:0},.05),RangeError);
  assert.throws(()=>bankRootGeometry(terrain,{x:0,z:0},{x:2,z:0},0),RangeError);
});

test('dig details follow the current cut, clear finds, and vanish when the surface is restored', () => {
  let worked=false;
  const depth=(x,z)=>worked?Math.max(0,.25*(1-Math.hypot(x,z))):0;
  const terrain={orig:[],sampleGrid:()=>0,getHeight:(x,z)=>-depth(x,z),inside:()=>true,
    creek:{waterY:()=>-2},overlayAt:(x,z)=>Math.hypot(x,z)<1.1?{crystals:[{c:{x:.2,z:.2,collected:false}}]}:null};
  const root=new THREE.Group(),system=newEnglandGroundDetail(root,terrain,{cobble_3:new THREE.IcosahedronGeometry(1,1)});
  system.update({x:0,z:0},false);
  assert.ok(root.children.every(mesh=>mesh.count===0),'Unworked ground has no excavation decorations');
  worked=true;system.update({x:0,z:0},false);
  assert.ok(root.children.some(mesh=>mesh.count>0));
  const m=new THREE.Matrix4();
  for(const mesh of root.children)for(let i=0;i<mesh.count;i++) {
    mesh.getMatrixAt(i,m);
    assert.ok(m.elements.every(Number.isFinite));
    assert.ok(Math.hypot(m.elements[12]-.2,m.elements[14]-.2)>.10,'Collectible remains exposed');
  }
  worked=false;system.update({x:0,z:0},false);
  assert.ok(root.children.every(mesh=>mesh.count===0),'Decorations do not persist above a changed surface');
});
