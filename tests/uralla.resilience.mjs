import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true}),report=[];
try{for(const failure of ['', 'missing','corrupt']){
 const ctx=await browser.newContext({viewport:{width:1100,height:720},serviceWorkers:failure?'block':'allow'});
 await ctx.addInitScript(()=>{if(sessionStorage.fixture)return;sessionStorage.fixture='1';localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,activeRegion:'uralla',difficulty:'realistic',claims:{'uralla':{seed:12345}}}));localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'high',warned:true}));});
 if(failure)await ctx.route('**/models/uralla/environment.glb',r=>r.fulfill({status:failure==='missing'?404:200,contentType:'model/gltf-binary',body:'unavailable'}));
 const page=await ctx.newPage(),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5191/?test',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>fossick.regionalEnvironment.ready);
 assert.equal(await page.evaluate(()=>fossick.regionalEnvironment.stats.status),failure?'fallback':'ready');
 const snapshot=()=>page.evaluate(()=>{const f=fossick;return{ground:Array.from(f.terrain.orig),colliders:f.world.colliders,rocks:f.boulders.list.map(({x,y,z,r})=>({x,y,z,r})),targets:f.targets.list.map(({id,x,y,z})=>({id,x,y,z})),finds:f.finds.items.map(({id,x,y,z})=>({id,x,y,z})),workings:f.terrain.workings};});
 const world=await snapshot();if(!failure)globalThis.baseline=world;else assert.deepEqual(world,globalThis.baseline,'Missing art must preserve simulation and colliders');
 await page.locator('#play').click();await page.keyboard.press('Digit2');assert.equal(await page.evaluate(()=>fossick.state.tool),'shovel');
 if(!failure){
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>navigator.serviceWorker.controller&&window.fossick);await page.evaluate(()=>fossick.regionalEnvironment.ready);
  await page.waitForTimeout(800);await ctx.setOffline(true);await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>fossick.regionalEnvironment.ready);assert.equal(await page.evaluate(()=>fossick.regionalEnvironment.stats.status),'ready');
  assert.deepEqual(await snapshot(),world);await page.locator('#play').click();await page.keyboard.press('KeyM');await page.locator('#map').waitFor({state:'visible'});
 }
 assert.deepEqual(errors,[]);report.push({failure:failure||'offline cached reload',unchangedWorld:true,errors});console.log('Uralla resilience:',failure||'offline');await ctx.close();
}}finally{await browser.close();await writeFile(process.env.URALLA_RESILIENCE_OUT||'docs/audits/uralla/resilience.json',JSON.stringify(report,null,2));}
