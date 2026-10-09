// Full game, disposable saves. No player browser storage is modified.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin=process.env.PANNING_TEST_ORIGIN || 'http://127.0.0.1:5191';
const browser=await chromium.launch({headless:true});
try {
  for(const touch of [false,true]) {
    const context=await browser.newContext({viewport:touch?{width:844,height:390}:{width:1280,height:900},hasTouch:touch,isMobile:touch});
    await context.addInitScript(()=>{
      if(sessionStorage.getItem('shelter-fixture'))return;
      localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,cash:2600,gold:0,day:3,hour:9,camp:{shelter:'swag',built:{rack:true}},bucket:[{gold:.04,layer:'wash'}]}));
      localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',res:.6,shadows:'off',aa:false,gems:'simple',reflections:'static',fps:false,warned:true}));
      sessionStorage.setItem('shelter-fixture','yes');
    });
    const page=await context.newPage(),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
    async function enter(){await page.getByRole('button',{name:/Click to play|Tap to play/}).click();}
    async function openShelter(){
      await page.evaluate(()=>{const f=fossick,c=f.campShelter;f.player.pos.x=c.spot.x-2.7*c.flip;f.player.pos.z=c.spot.z;f.player.yaw=c.flip>0?-Math.PI/2:Math.PI/2;f.player.pitch=-.1;f.player.vel.set(0,0,0);});
      if(touch)await page.locator('[data-act="interact"]').tap();else await page.keyboard.press('KeyE');
      await page.locator('#camp-workbench').waitFor({state:'visible'});
      if(await page.evaluate(()=>!!document.fullscreenElement))await page.evaluate(()=>document.exitFullscreen());
    }
    async function worldShot(id){
      await page.locator('#camp-close').click();
      await page.evaluate(()=>{const f=fossick,c=f.campShelter;f.player.pos.x=c.spot.x-5*c.flip;f.player.pos.z=c.spot.z-2*c.flip;f.player.yaw=Math.atan2(-5*c.flip,-2*c.flip);f.player.pitch=-.1;});
      await page.waitForTimeout(1000);await page.screenshot({path:`node_modules/.cache/shelter-${id}.png`});
      await openShelter();
    }
    await page.goto(`${origin}/?test${touch?'&touch':''}`,{waitUntil:'networkidle',timeout:90000});await enter();await openShelter();
    assert.equal(await page.evaluate(()=>fossick.campShelter.current),'swag');
    assert.ok(await page.locator('#camp-build-shed').isDisabled());assert.ok(await page.locator('#camp-sleep').isDisabled());
    if(!touch)await worldShot('swag');else await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:`node_modules/.cache/shelter-${touch?'touch':'desktop'}-upgrades.png`});
    await page.locator('#camp-build-tent').click();assert.equal(await page.evaluate(()=>fossick.state.cash),2350);
    assert.equal(await page.evaluate(()=>fossick.campShelter.current),'tent');
    assert.match(await page.locator('#camp-storage-note').textContent(),/0\/12/);
    if(!touch)await worldShot('tent');
    await page.locator('#camp-build-caravan').click();
    assert.equal(await page.evaluate(()=>fossick.campShelter.current),'caravan');
    if(!touch)await worldShot('caravan');
    await page.locator('#camp-build-shed').click();assert.equal(await page.evaluate(()=>fossick.state.cash),450);
    assert.equal(await page.evaluate(()=>fossick.campShelter.current),'shed');assert.match(await page.locator('#camp-storage-note').textContent(),/0\/20/);
    if(!touch) {
      await worldShot('shed');await page.locator('#camp-close').click();
      await page.evaluate(()=>{const f=fossick,c=f.campShelter;f.player.pos.x=c.spot.x-3.4*c.flip;f.player.pos.z=c.spot.z;f.player.yaw=c.flip>0?-Math.PI/2:Math.PI/2;f.player.vel.set(0,0,0);});
      await page.keyboard.down('KeyW');try {await page.waitForFunction(()=>{const c=fossick.campShelter;return (fossick.player.pos.x-c.spot.x)*c.flip> -1.65;},{timeout:12000});}finally{await page.keyboard.up('KeyW');}
      const inside=await page.evaluate(()=>{const c=fossick.campShelter;return (fossick.player.pos.x-c.spot.x)*c.flip;});
      assert.ok(inside>-1.7&&inside<1.8,`Shed doorway blocked at ${inside}`);
      await page.evaluate(()=>{fossick.daynight.hour=22;});await page.waitForTimeout(400);
      assert.ok(await page.evaluate(()=>fossick.campShelter.light.intensity>0));
      await page.screenshot({path:'node_modules/.cache/shelter-shed-interior-night.png'});
      await openShelter();
    }
    // Save/reload preserves the structure and cash; no old tent can reappear.
    await page.reload({waitUntil:'networkidle'});if(touch)await page.setViewportSize({width:844,height:390});
    await enter();await openShelter();
    assert.equal(await page.evaluate(()=>fossick.campShelter.current),'shed');assert.equal(await page.evaluate(()=>fossick.state.cash),450);
    assert.equal(await page.evaluate(()=>fossick.campShelter.stages.tent.visible),false);
    assert.ok(await page.locator('#camp-build-shed').isDisabled());
    // Sleep after midnight advances one dawn and does not double-count next frame.
    await page.evaluate(()=>{fossick.daynight.hour=2;fossick.campUI.refresh();});
    await page.locator('#camp-sleep').click();await page.waitForTimeout(400);
    assert.equal(await page.evaluate(()=>fossick.state.day),4);assert.ok(await page.evaluate(()=>fossick.daynight.hour>=6&&fossick.daynight.hour<6.1));
    await openShelter();assert.ok(await page.locator('#camp-sleep').isDisabled());
    assert.equal(await page.evaluate(()=>fossick.sleepAtCamp()),false);assert.equal(await page.evaluate(()=>fossick.state.day),4);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')).camp.shelter),'shed');
    if(touch)await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.querySelector('#camp-workbench').scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);console.log(`${touch?'Touch':'Desktop'} shelter progression, cash, capacity, model switching, reload and exactly-once dawn passed.`);
    await context.close();
  }
}finally{await browser.close();}
