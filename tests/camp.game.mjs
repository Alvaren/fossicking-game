// Disposable browser contexts only. Seed known samples; never touch player saves.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.PANNING_TEST_ORIGIN || 'http://127.0.0.1:5191';
const browser = await chromium.launch({ headless: true });
try {
  for (const touch of (process.env.CAMP_TOUCH_ONLY ? [true] : [false, true])) {
    const context = await browser.newContext({ viewport: touch ? {width:844,height:390} : {width:1280,height:900}, hasTouch:touch,isMobile:touch });
    await context.addInitScript(() => {
      if(sessionStorage.getItem('camp-fixture'))return;
      localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,cash:500,gold:0,difficulty:'realistic',bucket:[{layer:'wash',clay:0.3,gold:0.04,blackSand:2,x:10,z:20,panContents:{gold:0.04,picker:0,finds:[]}}]}));
      localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',res:0.6,shadows:'off',aa:false,gems:'simple',reflections:'static',fps:false,warned:true}));
      sessionStorage.setItem('camp-fixture','yes');
    });
    const page = await context.newPage(), errors=[];
    page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
    async function openBench() {
      await page.getByRole('button',{name:/Click to play|Tap to play/,exact:false}).click();
      await page.evaluate(()=>{const f=window.fossick,p=f.campStation.spot,flip=f.terrain.creek.cx(f.terrain.camp.z)>f.terrain.camp.x?-1:1;f.player.pos.x=p.x-2*flip;f.player.pos.z=p.z;f.player.yaw=flip>0?-Math.PI/2:Math.PI/2;f.player.pitch=-0.13;});
      if(touch) await page.locator('[data-act="interact"]').tap(); else await page.keyboard.press('KeyE');
      await page.locator('#camp-workbench').waitFor({state:'visible'});
      if (await page.evaluate(()=>!!document.fullscreenElement)) await page.evaluate(()=>document.exitFullscreen());
    }
    async function finishPan(rough = false) {
      await page.evaluate(async rough=>{
        const {stepPan,automaticStroke}=await import('/src/panning.js');const s=fossick.panUI.session;
        if(rough)for(let i=0;i<240;i++)stepPan(s,{action:'wash',speed:1.5,tilt:42,submerged:false,lip:'smooth'},1/60);
        for(let i=0;i<30000&&!s.finished;i++)stepPan(s,automaticStroke(s),1/60);
        fossick.panUI.refresh();
      },rough);
      await page.locator('#pan-collect').evaluate(b=>{b.click();b.click();});
      await page.locator('#camp-workbench').waitFor({state:'visible'});
    }
    await page.goto(`${origin}/?test${touch?'&touch':''}`,{waitUntil:'networkidle',timeout:90000});
    await openBench();
    if(touch)await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:`node_modules/.cache/camp-${touch?'touch':'desktop'}.png`,fullPage:true});
    assert.ok(await page.locator('#camp-field').isDisabled());
    await page.getByRole('button',{name:'Build · $75',exact:true}).click();
    await page.getByRole('button',{name:'Build · $120',exact:true}).click();
    await page.getByRole('button',{name:'Build · $240',exact:true}).click();
    assert.equal(await page.evaluate(()=>fossick.state.cash),65);
    assert.deepEqual(await page.evaluate(()=>Object.values(fossick.campStation.props).map(p=>p.visible)),[true,true,true]);
    await page.locator('#camp-store').click(); assert.equal(await page.evaluate(()=>fossick.state.bucket.length),0);
    await page.getByRole('button',{name:'Take parcel',exact:true}).click();
    assert.equal(await page.evaluate(()=>fossick.state.bucket[0].panContents.gold),0.04);
    // A real field pan remains untouched by practice, including save and reload.
    await page.locator('#camp-field').click();await page.locator('#pan-load').click();
    assert.ok(await page.evaluate(()=>fossick.state.panSession.captureTailings));
    await page.locator('#pan-close').click();
    const field=await page.evaluate(()=>JSON.stringify(fossick.state.panSession));
    await page.locator('#camp-recipe').selectOption('clay');
    await page.locator('#camp-start').click();
    await page.locator('[data-pan-action="clay"]:visible').first().click();
    if(!touch){await page.locator('#pan-canvas').focus();await page.keyboard.down('ArrowLeft');await page.waitForTimeout(400);await page.keyboard.up('ArrowLeft');}
    await page.locator('#pan-close').click();
    assert.equal(await page.evaluate(()=>JSON.stringify(fossick.state.panSession)),field);
    await page.reload({waitUntil:'networkidle'});
    if(touch)await page.setViewportSize({width:844,height:390});
    await openBench();
    assert.equal(await page.evaluate(()=>JSON.stringify(fossick.state.panSession)),field);
    await page.locator('#camp-resume').click();await finishPan(true);
    const practice=await page.evaluate(()=>fossick.state.camp.practice);
    assert.ok(practice.recovered<practice.total);assert.equal(await page.evaluate(()=>fossick.state.gold),0);
    await page.locator('#camp-practice-repan').click();await finishPan();
    assert.ok(await page.evaluate(()=>fossick.state.camp.practice.recovered>0));
    assert.equal(await page.evaluate(()=>fossick.state.camp.history.length),2);
    assert.equal(await page.evaluate(()=>fossick.state.gold),0);
    // Finish the original paid-dirt pan and re-pan its actual captured outflow.
    await page.locator('#camp-field').click();await finishPan(true);
    const firstGold=await page.evaluate(()=>fossick.state.gold);
    assert.ok(firstGold>0 && firstGold<0.02);
    assert.equal(await page.evaluate(()=>fossick.state.camp.tailings.length),1);
    await page.locator('#camp-tailings button').first().click();await finishPan();
    const finalGold=await page.evaluate(()=>fossick.state.gold);
    assert.ok(finalGold>firstGold && finalGold<=0.02);
    assert.equal(await page.evaluate(()=>fossick.state.camp.fieldPans),2);
    assert.equal(await page.evaluate(()=>fossick.state.panTests.length),1);
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')));
    assert.equal(stored.gold,finalGold);assert.equal(stored.cash,65);assert.equal(stored.camp.history.length,2);
    await page.locator('#camp-recipe').selectOption('clay');
    if(touch)await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:`node_modules/.cache/camp-${touch?'touch':'desktop'}-complete.png`,fullPage:true});
    assert.equal(await page.locator('#camp-history tr').count(),1);
    assert.equal(await page.evaluate(()=>document.querySelector('#camp-workbench').scrollWidth>innerWidth),false);
    await page.locator('#camp-pan').selectOption('dual');
    await page.locator('#camp-start').click(); await finishPan();
    assert.equal(await page.locator('#camp-history tr').count(),2);
    assert.equal(await page.evaluate(()=>fossick.state.gold),finalGold);
    // Borrowing another parcel can be cancelled without touching paid material.
    await page.locator('#camp-start').click(); await page.locator('#pan-close').click();
    await page.locator('#camp-return').click();
    assert.equal(await page.evaluate(()=>fossick.state.camp.practice),null);
    assert.equal(await page.evaluate(()=>fossick.state.bucket[0].panContents.gold),0.02);
    await page.locator('#camp-history').scrollIntoViewIfNeeded();
    await page.screenshot({path:`node_modules/.cache/camp-${touch?'touch':'desktop'}-comparison.png`});
    if(!touch) {
      await page.locator('#camp-close').click();await page.waitForTimeout(1500);
      await page.screenshot({path:'node_modules/.cache/camp-world.png'});
      // Load the remainder using ordinary creek input with the portable kit.
      await page.evaluate(()=>{const f=fossick;f.player.pos.x=f.creek.cx(0);f.player.pos.z=0;f.selectTool('pan');});
      await page.locator('#game').click({position:{x:500,y:350},delay:150});
      await page.locator('#pan-load').click();
      assert.ok(await page.evaluate(()=>fossick.state.panSession.captureTailings));
      assert.equal(await page.evaluate(()=>fossick.panUI.state===fossick.state),true);
    }
    assert.deepEqual(errors,[]);
    console.log(`${touch?'Touch':'Desktop'} camp: entry, purchases, storage, independent sessions, reload, practice conservation, rewards and tailings passed.`);
    await context.close();
  }
} finally {await browser.close();}
