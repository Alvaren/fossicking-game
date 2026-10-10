// Disposable browser saves only. Real input checks plus accelerated traversal
// through the same movement rule; panning completion uses the shared simulation.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {createPan} from '../src/panning.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.TASMANIA_TEST_ORIGIN||'http://127.0.0.1:5191';
const browser=await chromium.launch({headless:true});
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')));
try{
  for(const phone of process.env.TAS_TEST_TOUCH_ONLY?[true]:[false,true]){
    const context=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1280,height:860},isMobile:phone,hasTouch:phone,deviceScaleFactor:1});
    const seed={seed:12345,gold:.2,cash:3000,up:{pan:2},difficulty:phone?'realistic':'easy',camp:{shelter:'shed',built:{tub:true}},bucket:[{gold:.02,layer:'wash',clay:.2}],panSession:createPan({contents:{gold:.004,picker:0,finds:[]}})};
    await context.addInitScript(value=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');localStorage.setItem('fossicking-save-v2',JSON.stringify(value));localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',res:.6,shadows:'off',aa:false,gems:'simple',reflections:'static',warned:true}));},seed);
    const page=await context.newPage(),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
    const tap=async selector=>phone?page.locator(selector).tap():page.locator(selector).click();
    const cdp=await context.newCDPSession(page);
    async function touchStart(selector,ox=0,oy=0){const b=await page.locator(selector).boundingBox();const point={x:b.x+b.width/2+ox,y:b.y+b.height/2+oy,id:1};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});return point;}
    const touchEnd=()=>cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.goto(`${origin}/?test${phone?'&touch':''}`,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);
    await tap('#travel-btn');await page.locator('#region-travel').waitFor({state:'visible'});
    await page.locator('#region-pack input[value="classifier"]').check();assert.match(await page.locator('#region-weight').textContent(),/9.8/);
    await page.screenshot({path:`node_modules/.cache/tas-${phone?'touch':'desktop'}-departure.png`});
    await tap('#region-depart');await page.waitForFunction(()=>window.fossickTas);const homeSnapshot=await stored(page);
    assert.equal(homeSnapshot.activeRegion,'tasmania-west');assert.deepEqual(homeSnapshot.panSession,seed.panSession);
    await page.screenshot({path:`node_modules/.cache/tas-${phone?'touch':'desktop'}-journal.png`});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await tap('#tas-resume');
    // Actual keyboard / touch stick moves the first part of the descent.
    const before=await page.evaluate(()=>({...fossickTas.player}));
    if(phone)await touchStart('#stick',0,-40);else await page.keyboard.down('KeyW');
    await page.waitForFunction(p=>Math.hypot(fossickTas.player.x-p.x,fossickTas.player.z-p.z)>1.2,before);
    if(phone)await touchEnd();else await page.keyboard.up('KeyW');
    console.log(`${phone?'Touch':'Desktop'} actual movement passed.`);
    // Traverse every segment, with this generated scene's actual tree/rock colliders.
    const route=await page.evaluate(async()=>{
      const {ROUTE}=await import('/src/tasmania/model.js'),f=fossickTas;Object.assign(f.player,ROUTE[0]);const results=[];
      for(const points of [ROUTE,[...ROUTE].reverse()])for(const target of points.slice(1)){
        f.keys.add('KeyW');let count=0;
        while(Math.hypot(f.player.x-target.x,f.player.z-target.z)>.14&&count++<3500){f.player.yaw=Math.atan2(-(target.x-f.player.x),-(target.z-f.player.z));f.move(1/60);}
        f.keys.clear();results.push({target,d:Math.hypot(f.player.x-target.x,f.player.z-target.z)});
      }
      return results;
    });
    assert.ok(route.every(r=>r.d<.15),JSON.stringify(route.filter(r=>r.d>=.15)));
    console.log(`${phone?'Touch':'Desktop'} generated route/collider traversal passed, both directions.`);
    // Move to a finite crevice for the interaction and save/resume checks.
    const site=await page.evaluate(()=>{const f=fossickTas,s=f.model.sites.find(s=>s.kind==='crevice');Object.assign(f.player,{x:s.x-1,z:s.z,yaw:-.3,pitch:-.22});return s;});
    await page.waitForTimeout(300);await tap('#tas-scoop');
    if(phone)await touchStart('#t-use');else{await page.mouse.move(600,420);await page.mouse.down();}
    await page.waitForFunction(()=>fossickTas.expedition.bucket.length===1);
    if(phone)await touchEnd();else await page.mouse.up();
    const sampled=await page.evaluate(()=>structuredClone(fossickTas.expedition));assert.equal(sampled.siteUse[site.id],1);assert.equal(sampled.bucket[0].classified,true);
    await page.screenshot({path:`node_modules/.cache/tas-${phone?'touch':'desktop'}-river.png`});
    await tap('#tas-pan');await tap(phone?'#t-use':'#game');await page.locator('#panning').waitFor({state:'visible'});await tap('#pan-load');
    if(phone){
      await page.locator('.pan-mobile-actions [data-pan-action="clay"]').tap();
      await page.locator('#pan-canvas').scrollIntoViewIfNeeded();
      const b=await page.locator('#pan-canvas').boundingBox();const x=b.x+b.width*.4,y=b.y+b.height*.55;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:2}]});
      for(let i=0;i<36;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+Math.sin(i*.4)*40,y:y+Math.sin(i)*4,id:2}]});await page.waitForTimeout(40);}
      await touchEnd();
    }else await page.waitForFunction(()=>fossickTas.expedition.panSession.time>.5);
    const live=await page.evaluate(()=>structuredClone(fossickTas.expedition.panSession));assert.ok(live.time>0);if(phone)assert.ok(live.bed.clay<live.initialBed.clay);
    await tap('#pan-close');const partial=await stored(page);assert.ok(partial.expeditions['tasmania-west'].panSession);assert.equal(partial.expeditions['tasmania-west'].bucket[0].panVolume,.5);
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossickTas);
    const resumed=await page.evaluate(()=>structuredClone(fossickTas.expedition));assert.deepEqual(resumed.panSession,partial.expeditions['tasmania-west'].panSession);assert.equal(resumed.siteUse[site.id],1);
    await tap('#tas-resume');await tap('#tas-pan');await tap(phone?'#t-use':'#game');
    const expected=await page.evaluate(async()=>{const {stepPan,automaticStroke,panResult}=await import('/src/panning.js');const s=fossickTas.expedition.panSession;for(let i=0;i<20000&&!s.finished;i++)stepPan(s,automaticStroke(s),1/60);if(!s.finished)throw Error('Unfinished');fossickTas.panUI.refresh();return panResult(s).gold;});
    await page.locator('#pan-collect').evaluate(b=>{b.click();b.click();});assert.equal((await stored(page)).expeditions['tasmania-west'].gold,expected);assert.ok(expected>0);
    await tap('#pan-close');
    await page.evaluate(async()=>{const {CAMP}=await import('/src/tasmania/model.js');Object.assign(fossickTas.player,{x:CAMP.x+2,z:CAMP.z+2,yaw:.1,pitch:-.1});});
    await tap('#tas-interact');await tap('#tas-camp');await tap('#tas-sleep');assert.equal(await page.evaluate(()=>fossickTas.expedition.nights),1);
    assert.equal(await page.locator('#tas-return').isDisabled(),true);await tap('#tas-resume');await page.waitForTimeout(250);
    await page.screenshot({path:`node_modules/.cache/tas-${phone?'touch':'desktop'}-camp.png`});
    // Normal route back to the gate, using the same movement rule, not Recovery.
    const walkOut=await page.evaluate(async()=>{const {ROUTE,CAMP}=await import('/src/tasmania/model.js'),f=fossickTas;Object.assign(f.player,{x:CAMP.x,z:CAMP.z});const index=ROUTE.findIndex(p=>p.x===CAMP.x&&p.z===CAMP.z);const failures=[];for(const target of ROUTE.slice(0,index).reverse()){f.keys.add('KeyW');let n=0;while(Math.hypot(f.player.x-target.x,f.player.z-target.z)>.14&&n++<3500){f.player.yaw=Math.atan2(-(target.x-f.player.x),-(target.z-f.player.z));f.move(1/60);}f.keys.clear();if(n>=3500)failures.push(target);}return failures;});assert.deepEqual(walkOut,[]);
    await tap('#tas-interact');assert.equal(await page.locator('#tas-return').isDisabled(),false);await tap('#tas-return');await page.waitForFunction(()=>window.fossick);
    const returned=await stored(page);assert.equal(returned.activeRegion,'new-england');assert.equal(returned.gold,homeSnapshot.gold+expected);
    for(const k of ['seed','cash','camp','digs','bucket','panSession'])assert.deepEqual(returned[k],homeSnapshot[k],k);
    const e=returned.expeditions['tasmania-west'];assert.equal(e.gold,0);assert.equal(e.tests.length,1);assert.equal(e.trips,1);assert.equal(e.siteUse[site.id],1);assert.equal(e.campPitched,false);
    // The camp entry is wired as well, and a second trip keeps worked ground.
    await page.evaluate(()=>fossick.campUI.open());await tap('#camp-travel');await tap('#region-depart');await page.waitForFunction(()=>window.fossickTas);
    assert.equal(await page.evaluate(()=>fossickTas.expedition.siteUse[Object.keys(fossickTas.expedition.siteUse)[0]]),1);
    await tap('#tas-return');await page.waitForFunction(()=>window.fossick);assert.equal((await stored(page)).gold,returned.gold);
    assert.deepEqual(errors,[]);console.log(`${phone?'Touch':'Desktop'} sampling, pan input/reload/recovery, camp, home preservation and repeated travel passed.`);
    await context.close();
  }
}finally{await browser.close();}
