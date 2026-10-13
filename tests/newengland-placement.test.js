import test from 'node:test';
import assert from 'node:assert/strict';
import { placementMask } from '../src/newengland/placement.js';

test('decoration clearance catches footprints across spatial-cell boundaries', () => {
  const mask=placementMask({camp:{x:90,z:90},circles:[{x:7.8,z:0,r:1}]});
  assert.equal(mask.blocked(8.9,0,.2),true);
  assert.equal(mask.blocked(9.1,0,.2),false);
  assert.equal(mask.blocked(7.8,0),true);
  assert.equal(mask.blocked(90,74,.1),true);
  assert.equal(mask.blocked(107,0,2),true);
});

test('new excavations and moved equipment are excluded without rebuilding scenery', () => {
  const digs=[],equipment=[];
  const mask=placementMask({camp:{x:90,z:90},overlays:()=>digs,equipment:()=>equipment});
  assert.equal(mask.blocked(0,0,.3),false);
  digs.push({x0:-1,x1:1,z0:-1,z1:1});
  assert.equal(mask.dynamic(1.1,0,.2),true);
  assert.equal(mask.dynamic(1.3,0,.2),false);
  equipment.push({x:4,z:0,r:2.5});
  assert.equal(mask.dynamic(6,0,.2),true);
  equipment[0].x=20;
  assert.equal(mask.dynamic(6,0,.2),false);
});
