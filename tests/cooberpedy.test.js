import test from 'node:test';
import assert from 'node:assert/strict';
import { DUGOUTS, DUGOUT_SITES, DUGOUT_DEPTH, cooberHeight, cooberBaseHeight, walkable, moveInDugout, opalFaces, restoreOpalWork, takeOpalFace } from '../src/cooberpedy.js';
import { Terrain } from '../src/terrain.js';
import { CLAIM_PROFILES } from '../src/claimregions.js';
import { readClaim, saveClaim } from '../src/claimregions.js';
import { travelTo } from '../src/regions.js';
import { crystalToGem } from '../src/crystals.js';
import { cuttable, cutStone } from '../src/cutting.js';

test('Coober Pedy has no inherited river cut, channel colours or river boulders; rock covers every room',()=>{
  for(const seed of [1,12345,798887]) {
    const t=new Terrain(seed,CLAIM_PROFILES['coober-pedy']);assert.equal(t.creek.boulders.length,0);
    for(let z=-105;z<105;z+=7)for(const d of [-10,0,10]) {
      const x=t.creek.cx(z)+d;
      assert.equal(t.rawHeight(x,z),cooberHeight(x,z,t.n2));
      const c=t.surfaceColor(x,z,t.rawHeight(x,z),1,4,3,.1);
      assert.ok(c[0]>c[1]&&c[1]>c[2]);
    }
    for(const [i,plan] of DUGOUTS.entries()) {
      const e=DUGOUT_SITES[i],floor=cooberBaseHeight(e.x,e.z,t.n2)-DUGOUT_DEPTH;
      assert.ok(t.rawHeight(e.x,e.z-1)<floor+.05,'Entrance descends below ground');
      assert.ok(t.rawHeight(e.x+12,e.z+15)<floor+DUGOUT_DEPTH+1,'No artificial hill over the home');
      for(const cell of plan.cells) {
        const [x,z]=cell.split(',').map(Number);
        assert.ok(t.rawHeight(e.x+x+.5,e.z+z+.5)>floor+plan.height+.5,`${plan.name} ${cell} must be buried`);
      }
    }
    // Low, gently rolling ground across the old creek's position, away from ridges.
    for(const z of [-95,-80,10,25]) {
      const x=t.creek.cx(z),middle=t.rawHeight(x,z),shoulders=(t.rawHeight(x-3,z)+t.rawHeight(x+3,z))/2;
      assert.ok(Math.abs(middle-shoulders)<.1,'No carved channel');
    }
  }
});

test('all dugout rooms and galleries connect to the exit through player-width openings',()=>{
  for(const plan of DUGOUTS) {
    const seen=new Set(['0,3']),queue=[[0,3]];
    for(let n=0;n<queue.length;n++)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const [x,z]=queue[n],key=`${x+dx},${z+dz}`;
      if(!seen.has(key)&&walkable(plan,x+dx+.5,z+dz+.5)){seen.add(key);queue.push([x+dx,z+dz]);}
    }
    assert.equal(seen.size,plan.cells.size,plan.name);
    for(const [,x,z] of plan.labels)assert.ok(seen.has(`${Math.floor(x)},${Math.floor(z)}`));
    assert.ok(plan.height>2.6);
  }
});

test('underground movement slides along walls and cannot cross solid rock or furniture',()=>{
  const p=DUGOUTS[0];
  let pos=moveInDugout(p,{x:.5,z:3.5},{x:-10,z:3.5});
  assert.ok(pos.x>=-.72&&pos.x<0);
  pos=moveInDugout(p,{x:.5,z:3.5},{x:.5,z:-10});assert.ok(pos.z>=3.28);
  pos=moveInDugout(p,{x:.5,z:5},{x:.5,z:10},[{x:.5,z:8,w:1,d:1}]);assert.ok(pos.z<7.23);
  // The lounge doorway is open; the neighbouring wall is solid.
  pos=moveInDugout(p,{x:.5,z:7.5},{x:-4,z:7.5});assert.ok(pos.x<-3.9);
  pos=moveInDugout(p,{x:.5,z:5},{x:-4,z:5});assert.ok(pos.x>=-.72);
});

test('opal seams have stable finite assays, barren ground and region-appropriate varieties',()=>{
  const kinds=new Set();
  for(let seed=0;seed<100;seed++) {
    const faces=opalFaces(seed);assert.deepEqual(faces,opalFaces(seed));
    const taken=restoreOpalWork({taken:[999]},faces);assert.equal(taken.size,0);
    for(const face of faces) {
      assert.ok(walkable(DUGOUTS[2],face.x+face.nx*.6,face.z+face.nz*.6));
      const result=takeOpalFace(face,taken);kinds.add(result.crystal?.variety||'barren');
      assert.equal(takeOpalFace(face,taken),null);
      assert.equal(takeOpalFace(face,restoreOpalWork({taken:[...taken]},faces)),null);
      if(result.crystal) {
        const gem=crystalToGem(result.crystal);assert.ok(Number.isFinite(gem.value));assert.equal(gem.type,'opal');
        if(cuttable(gem))assert.equal(cutStone(gem,seed).item.type,'opal');
      }
    }
  }
  assert.deepEqual([...kinds].sort(),['barren','crystal opal','milky opal','opalised shell','potch']);
});

test('Coober Pedy travel preserves underground location and depletion without copying the home camp',()=>{
  const home={seed:12345,cash:120,gems:[],gold:.2,camp:{shelter:'shed'},mine:{taken:[700001]},bucket:[{gold:.01}]};
  let root=travelTo(home,'coober-pedy'),local=readClaim(root);
  assert.equal(local.camp.shelter,'swag');assert.equal(root.cash,120);
  local.mine={taken:[820001],interior:{id:'workings',x:.5,z:19,yaw:3,pitch:0}};
  local.gems=[{uid:'cp-opal',type:'opal'}];root=saveClaim(root,local);
  root=travelTo(root,'new-england');assert.deepEqual(readClaim(root).mine,home.mine);assert.deepEqual(readClaim(root).bucket,home.bucket);
  root=travelTo(root,'coober-pedy');assert.deepEqual(readClaim(root).mine,local.mine);assert.equal(readClaim(root).gems.length,1);
});
