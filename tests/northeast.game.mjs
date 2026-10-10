// Disposable contexts only; real mouse/touch input plus accelerated traversal
// and completion through the same in-game movement and sieve rules.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {createPan} from '../src/panning.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true});
try{for(const phone of [false,true]){
  const context=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1280,height:860},hasTouch:phone,isMobile:phone,deviceScaleFactor:1});
  const seed={seed:12345,cash:500,gold:.2,difficulty:'realistic',up:{sieve:1},camp:{shelter:'shed'},panSession:createPan({contents:{gold:.003,picker:0,finds:[]}})};
  await context.addInitScript(value=>{if(sessionStorage.getItem('fixture'))return;sessionStorage.setItem('fixture','1');localStorage.setItem('fossicking-save-v2',JSON.stringify(value));localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',res:.6,shadows:'off',aa:false,gems:'simple',reflections:'static',warned:true}));},seed);
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
  const tap=selector=>phone?page.locator(selector).tap():page.locator(selector).click();
  const cdp=await context.newCDPSession(page);
  async function hold(selector){const b=await page.locator(selector).boundingBox();if(phone)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2,id:1}]});else{await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();}}
  const release=()=>phone?cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}):page.mouse.up();
  const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')));
  await page.goto(`http://127.0.0.1:5191/?test${phone?'&touch':''}`,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);
  await tap('#travel-btn');await tap('.region-location-list [data-location="ne-tasmania"]');assert.equal(await page.locator('#region-depart').isDisabled(),false);assert.match(await page.locator('#region-fee').textContent(),/\$0/);await page.locator('#region-pack input[value="classifier"]').check();await tap('#region-depart');
  await page.waitForFunction(()=>window.fossickTas?.region==='ne-tasmania');assert.equal(await page.locator('#tas-heading').textContent(),'Tin Fern River catchment');
  const base=await stored();assert.deepEqual(base.panSession,seed.panSession);assert.equal(base.cash,500);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`node_modules/.cache/ne-${phone?'touch':'desktop'}-map.png`});
  const map=await page.evaluate(()=>({colors:new Set(document.getElementById('tas-map').getContext('2d').getImageData(0,0,520,610).data).size,guides:fossickTas.world.siteGroups.some(g=>g.guide),path:!!fossickTas.world.path}));assert.ok(map.colors>100);assert.equal(map.guides,false);assert.equal(map.path,false);
  await tap('#tas-resume');
  const before=await page.evaluate(()=>({...fossickTas.player}));
  if(phone){const b=await page.locator('#stick').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2-40,id:1}]});}else await page.keyboard.down('KeyW');
  await page.waitForFunction(p=>Math.hypot(fossickTas.player.x-p.x,fossickTas.player.z-p.z)>.5,before);
  if(phone)await release();else await page.keyboard.up('KeyW');
  const route=await page.evaluate(()=>{const f=fossickTas,{ROUTE}=f.profile;Object.assign(f.player,ROUTE[0]);const failures=[];for(const nodes of [ROUTE,[...ROUTE].reverse()])for(const p of nodes.slice(1)){let n=0;f.keys.add('KeyW');while(Math.hypot(p.x-f.player.x,p.z-f.player.z)>.14&&n++<3500){f.player.yaw=Math.atan2(-(p.x-f.player.x),-(p.z-f.player.z));f.move(1/60);}f.keys.clear();if(n>=3500)failures.push(p);}return failures;});assert.deepEqual(route,[]);
  const site=await page.evaluate(()=>{const f=fossickTas;const s=f.model.sites.find(site=>f.profile.takeSample(structuredClone(f.expedition),site).panContents.finds.length>=2);if(!s)throw Error('Fixture needs a gem-bearing parcel');Object.assign(f.player,{x:s.x-1,z:s.z,yaw:-.85,pitch:-.18});return s;});
  await tap('#tas-scoop');await hold(phone?'#t-use':'#game');await page.waitForFunction(()=>fossickTas.expedition.bucket.length===1);await release();
  assert.equal(await page.evaluate(()=>fossickTas.expedition.bucket[0].classified),true);
  await page.screenshot({path:`node_modules/.cache/ne-${phone?'touch':'desktop'}-river.png`});
  await tap('#tas-sieve');await tap(phone?'#t-use':'#game');await tap('#sieve-load');await page.locator('#sieve-jig').scrollIntoViewIfNeeded();
  await hold('#sieve-jig');await page.waitForFunction(()=>fossickTas.expedition.sieveSession.I>.56);await release();
  await page.waitForFunction(()=>fossickTas.expedition.sieveSession.I<.3);assert.ok(await page.evaluate(()=>fossickTas.expedition.sieveSession.time)>0);
  await tap('#sieve-close');const partial=(await stored()).expeditions['ne-tasmania'].sieveSession;assert.ok(partial.time>0);assert.equal(partial.classified,true);
  await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossickTas);assert.deepEqual(await page.evaluate(()=>fossickTas.expedition.sieveSession),partial);
  await tap('#tas-resume');await tap('#tas-sieve');await tap(phone?'#t-use':'#game');
  await page.evaluate(async()=>{const {stepSieve,jigZone}=await import('/src/tasmania/sieving.js');const s=fossickTas.expedition.sieveSession;for(let i=0;i<3000&&s.strat<1;i++){const [lo,hi]=jigZone(s);stepSieve(s,s.I<(lo+hi)/2,1/60,'realistic');}if(s.strat<1)throw Error('Manual controller failed');fossickTas.sieveUI.refresh();});
  if(phone)await tap('#sieve-flip');else await page.locator('#sieve-view').click({button:'right'});await page.waitForTimeout(500);await page.screenshot({path:`node_modules/.cache/ne-${phone?'touch':'desktop'}-sieve.png`});
  const found=await page.evaluate(()=>fossickTas.expedition.sieveSession.result.finds.length);assert.ok(found>0);
  await page.locator('#sieve-collect').evaluate(b=>{b.click();b.click();});assert.equal(await page.evaluate(()=>fossickTas.expedition.gems.length),found);await page.waitForFunction(()=>fossickTas.sieveUI.view.sieveFinds.children.length===0);
  await tap('#sieve-close');
  // Reserve both an unfinished pan and a second wet-sieve parcel before travel.
  await page.evaluate(()=>{fossickTas.collectSample();fossickTas.collectSample();});
  await tap('#tas-pan');await tap(phone?'#t-use':'#game');await tap('#pan-load');await tap('#pan-close');await tap('#tas-sieve');await tap(phone?'#t-use':'#game');await tap('#sieve-load');await tap('#sieve-close');
  await tap('#tas-journal');const packed=(await stored()).expeditions['ne-tasmania'];assert.ok(packed.panSession&&packed.sieveSession);
  await tap('#tas-locations');await tap('.region-location-list [data-location="tasmania-west"]');await tap('#region-depart');await page.waitForFunction(()=>window.fossickTas?.region==='tasmania-west');assert.equal(await page.locator('#tas-heading').textContent(),'Fern River catchment');
  const banked=await stored();assert.equal(banked.gems.length,found);assert.equal(banked.cash,500);assert.deepEqual(banked.expeditions['ne-tasmania'].sieveSession,packed.sieveSession);assert.deepEqual(banked.expeditions['ne-tasmania'].panSession,packed.panSession);
  await tap('#tas-locations');await tap('.region-location-list [data-location="ne-tasmania"]');await tap('#region-depart');await page.waitForFunction(()=>window.fossickTas?.region==='ne-tasmania');
  const resumed=await page.evaluate(()=>fossickTas.expedition);assert.deepEqual(resumed.sieveSession,packed.sieveSession);assert.deepEqual(resumed.siteUse,packed.siteUse);assert.equal(resumed.gems.length,0);
  await tap('#tas-locations');await tap('.region-location-list [data-location="new-england"]');await tap('#region-depart');await page.waitForFunction(()=>window.fossick);
  const back=await stored();assert.equal(back.gems.length,found);assert.equal(new Set(back.gems.map(g=>g.uid)).size,found);assert.deepEqual(back.panSession,seed.panSession);assert.equal(back.cash,500);assert.equal(back.gold,.2);assert.deepEqual(errors,[]);
  console.log(`${phone?'Touch':'Desktop'} northeast: map, route/colliders, real movement/scoop/jig/release, sieve reload/flip/collection, direct western travel and independent pan/sieve saves passed.`);
  await context.close();
}}finally{await browser.close();}
