import test from 'node:test';
import assert from 'node:assert/strict';
import {topographyPixels} from '../src/topography.js';
const make=heightAt=>topographyPixels({width:8,height:8,bounds:{x0:0,x1:8,z0:0,z1:8},heightAt,waterAt:()=>null});
const pixel=(p,x,z)=>Array.from(p.slice((z*8+x)*4,(z*8+x)*4+4));
test('local maps always distinguish a 2 metre contour crossing from the same unbroken slope',()=>{
  const crossing=make(x=>1.6+x*.1),plain=make(x=>.6+x*.1);
  // Each has the same slope and shade, but only the first crosses the 2 m contour.
  const line=pixel(crossing,3,3),reference=pixel(plain,3,3);
  assert.ok(reference[0]-line[0]>25);assert.equal(line[3],255);
  assert.ok(pixel(crossing,2,3)[0]>line[0]);
});
test('original water treatment and north-west hillshading remain present without a toggle',()=>{
  const options={width:8,height:8,bounds:{x0:0,x1:8,z0:0,z1:8},heightAt:()=>-1,waterAt:()=>0};
  assert.deepEqual(pixel(topographyPixels(options),4,4),[96,140,160,255]);
  const east=make(x=>x*.05),west=make(x=>.4-x*.05);
  assert.ok(pixel(west,4,4)[0]>pixel(east,4,4)[0]);
});
