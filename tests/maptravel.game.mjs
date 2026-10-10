import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true});
try{for(const phone of [false,true]){
  const context=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1280,height:860},hasTouch:phone,isMobile:phone});
  await context.addInitScript(()=>{if(sessionStorage.getItem('fixture'))return;sessionStorage.setItem('fixture','1');localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,cash:123,gold:.2,difficulty:'easy'}));localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',res:.6,shadows:'off',aa:false,warned:true}));});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
  const tap=selector=>phone?page.locator(selector).tap():page.locator(selector).click();
  await page.goto(`http://127.0.0.1:5191/?test${phone?'&touch':''}`,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await tap('#play');
  if(phone)await tap('#touch [data-act="map"]');else await page.keyboard.press('KeyM');
  await page.locator('#map').waitFor({state:'visible'});await page.screenshot({path:`node_modules/.cache/map-${phone?'touch':'desktop'}-home.png`});
  assert.match(await page.locator('#map-travel').textContent(),/\$0/);await tap('#map-travel');assert.match(await page.locator('#region-fee').textContent(),/\$0/);
  await tap('.region-location-list [data-location="coober-pedy"]');assert.equal(await page.locator('#region-depart').isDisabled(),true);
  await tap('.region-location-list [data-location="tasmania-west"]');await page.screenshot({path:`node_modules/.cache/map-${phone?'touch':'desktop'}-destinations.png`});
  await tap('#region-close');await page.locator('#map').waitFor({state:'visible'});await tap('#map-travel');await tap('#region-depart');await page.waitForFunction(()=>window.fossickTas);
  const result=await page.evaluate(()=>({cash:JSON.parse(localStorage.getItem('fossicking-save-v2')).cash,path:!!fossickTas.world.path,guides:fossickTas.world.siteGroups.some(g=>!!g.guide),mapColors:new Set(Array.from(document.getElementById('tas-map').getContext('2d').getImageData(0,0,520,610).data).filter((_,i)=>i%4===0)).size}));
  assert.equal(result.cash,123);assert.equal(result.path,false);assert.equal(result.guides,false);assert.ok(result.mapColors>100);
  await page.screenshot({path:`node_modules/.cache/map-${phone?'touch':'desktop'}-tasmania.png`});
  await tap('#tas-locations');await tap('#region-depart');await page.waitForFunction(()=>window.fossick);assert.equal(await page.evaluate(()=>fossick.state.cash),123);assert.equal(await page.evaluate(()=>fossick.state.gold),.2);
  assert.deepEqual(errors,[]);console.log(`${phone?'Touch':'Desktop'}: local map entry, destination selection/cancel, $0 round trip, topography and absent world guides passed.`);await context.close();
}}finally{await browser.close();}
