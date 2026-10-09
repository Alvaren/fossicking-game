import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreCamp} from '../src/camp.js';
import {FACILITIES,buyFacility,powered,toggleGenerator,resupply,stepFacilities} from '../src/campfacilities.js';
const make=()=>({camp:restoreCamp(),cash:10000,gold:0});
test('all documented facilities have one-time purchases and meaningful prerequisites',()=>{
 const s=make();assert.equal(buyFacility(s,'lapidary'),false);assert.equal(buyFacility(s,'lights'),false);
 for(const f of FACILITIES){const cash=s.cash;assert.equal(buyFacility(s,f.id),true);assert.equal(s.cash,cash-f.cost);assert.equal(buyFacility(s,f.id),false);}
 assert.equal(s.camp.water,80);assert.equal(s.camp.generatorFuel,2);assert.equal(s.gold,0);
});
test('generator consumes fuel only when running and stops at empty',()=>{
 const s=make();buyFacility(s,'generator');assert.equal(powered(s.camp),false);stepFacilities(s.camp,.05);assert.equal(s.camp.generatorFuel,2);
 toggleGenerator(s.camp);stepFacilities(s.camp,.05);assert.ok(s.camp.generatorFuel<2);assert.equal(powered(s.camp),true);
 s.camp.generatorFuel=.00001;stepFacilities(s.camp,.1);assert.equal(s.camp.generatorFuel,0);assert.equal(powered(s.camp),false);assert.equal(toggleGenerator(s.camp),false);
});
test('water and fuel deliveries cap the tanks and charge only the delivered amount',()=>{
 const s=make();assert.equal(resupply(s,'water'),false);buyFacility(s,'water');buyFacility(s,'generator');
 s.camp.water=79;s.cash=1;assert.equal(resupply(s,'water'),true);assert.equal(s.camp.water,80);assert.ok(Math.abs(s.cash-.8)<1e-10);assert.equal(resupply(s,'water'),false);
 s.camp.generatorFuel=9.5;s.cash=3;assert.equal(resupply(s,'fuel'),true);assert.equal(s.cash,0);assert.equal(s.camp.generatorFuel,10);
});
