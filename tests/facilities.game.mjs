import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.PANNING_TEST_ORIGIN||'http://127.0.0.1:5191';
const browser=await chromium.launch({headless:true});
try{
 for(const touch of [false,true]){
  const context=await browser.newContext({viewport:touch?{width:844,height:390}:{width:1280,height:900},hasTouch:touch,isMobile:touch});
  await context.addInitScript(()=>{if(sessionStorage.getItem('facilities-fixture'))return;localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,cash:8000,gold:0,hour:21,difficulty:'realistic',gems:[{uid:'test-stone',type:'sapphire',variety:'blue',ct:4,value:30,grade:'B',label:'Blue sapphire 4 ct',keep:true}],camp:{shelter:'swag'}}));localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',res:.6,shadows:'off',aa:false,gems:'simple',reflections:'static',fps:false,warned:true}));sessionStorage.setItem('facilities-fixture','1');});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const click=async id=>touch?await page.locator(id).tap():await page.locator(id).click();
  async function enter(){await page.getByRole('button',{name:/Click to play|Tap to play/}).click();}
  async function bench(){await page.evaluate(()=>{const f=fossick,c=f.campStation;f.player.pos.x=c.spot.x-2;f.player.pos.z=c.spot.z;f.player.vel.set(0,0,0);});if(touch)await page.locator('[data-act="interact"]').tap();else await page.keyboard.press('KeyE');await page.locator('#camp-workbench').waitFor({state:'visible'});if(await page.evaluate(()=>!!document.fullscreenElement))await page.evaluate(()=>document.exitFullscreen());}
  await page.goto(`${origin}/?test${touch?'&touch':''}`,{waitUntil:'networkidle',timeout:90000});await enter();await bench();
  for(const id of ['water','generator','lights','lapidary','display','kelpie'])await click('#camp-buy-'+id);
  assert.equal(await page.evaluate(()=>fossick.state.cash),3940);
  assert.equal(await page.evaluate(()=>Object.values(fossick.campBuildings.parts).every(p=>p.visible)),true);
  await click('#camp-generator');assert.equal(await page.evaluate(()=>fossick.state.camp.generatorOn),true);
  await click('#camp-dog-pat');assert.equal(await page.evaluate(()=>fossick.state.camp.dogPats),1);
  await click('#camp-dog-mode');assert.equal(await page.evaluate(()=>fossick.state.camp.dogMode),'follow');
  // Render physical facilities and kept collection in actual world cases.
  await click('#camp-close');
  await page.evaluate(()=>{const f=fossick,p=f.campBuildings.spots.display;f.player.pos.x=p.x;f.player.pos.z=p.z-4;f.player.yaw=Math.PI;f.player.pitch=-.05;});await page.waitForTimeout(800);
  assert.ok(await page.evaluate(()=>fossick.campBuildings.cases[0].stands.length===1));
  assert.ok(await page.evaluate(()=>fossick.campBuildings.lights.every(l=>l.intensity>0)));
  assert.ok(await page.evaluate(()=>fossick.kelpie.group.visible));
  if(!touch) {
    await page.screenshot({path:'node_modules/.cache/camp-display-room.png'});
    for (const id of ['lapidary','display']) {
      await page.evaluate(id=>{const f=fossick,b=f.campBuildings,p=b.spots[id];f.player.pos.set(p.x,b.floors[id].base+.2,p.z-3.2*b.flip);f.player.yaw=b.flip>0?Math.PI:0;f.player.pitch=-.08;f.player.vel.set(0,0,0);},id);
      await page.keyboard.down('KeyW');
      try { await page.waitForFunction(id=>{const b=fossick.campBuildings;return (fossick.player.pos.z-b.spots[id].z)*b.flip>-.8;},id,{timeout:60000}); }
      finally { await page.keyboard.up('KeyW'); }
      await page.waitForTimeout(300);
      const support=await page.evaluate(id=>({y:fossick.player.pos.y,floor:fossick.campBuildings.floors[id].base+.07}),id);
      assert.ok(Math.abs(support.y-support.floor)<.12,'player stands on '+id+' floor');
      await page.screenshot({path:'node_modules/.cache/camp-room-'+id+'.png'});
    }
  }
  await bench();
  if(touch)await page.setViewportSize({width:390,height:844});
  await click('#camp-cut-start');await page.locator('#lapidary').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>fossick.state.gems.length),0);
  const canvas=page.locator('#lap-canvas');await canvas.scrollIntoViewIfNeeded();const r=await canvas.boundingBox();
  if(touch){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await page.waitForTimeout(500);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await canvas.focus();await page.keyboard.down('Space');await page.waitForTimeout(500);await page.keyboard.up('Space');}
  assert.ok(await page.evaluate(()=>fossick.state.camp.lapidarySession.workTime>0));
  const progress=await page.evaluate(()=>fossick.state.camp.lapidarySession.workTime);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>fossick.state.camp.lapidarySession.workTime),progress);
  await page.screenshot({path:`node_modules/.cache/lapidary-${touch?'touch':'desktop'}.png`});
  await click('#lap-close');await page.reload({waitUntil:'networkidle'});if(touch)await page.setViewportSize({width:844,height:390});await enter();await bench();
  assert.equal(await page.evaluate(()=>fossick.state.gems.length),0);assert.equal(await page.evaluate(()=>fossick.state.camp.lapidarySession.rough.uid),'test-stone');
  await click('#camp-cut-start');
  await page.evaluate(async()=>{const {stepLapidary,lapTarget}=await import('/src/lapidary.js');const c=fossick.state.camp;for(let i=0;i<30000&&!c.lapidarySession.finished;i++)stepLapidary(c,{working:true,aim:lapTarget(c.lapidarySession),pressure:.4,water:true},1/60);fossick.lapidaryUI.refresh();});
  await page.locator('#lap-collect').evaluate(b=>{b.click();b.click();});
  assert.equal(await page.evaluate(()=>fossick.state.gems.length),1);assert.ok(await page.evaluate(()=>fossick.state.gems[0].cut));assert.equal(await page.evaluate(()=>fossick.state.gems[0].keep),true);
  assert.equal(await page.evaluate(()=>fossick.state.camp.cutsCompleted),1);assert.equal(await page.evaluate(()=>fossick.state.camp.lapidarySession),null);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')));assert.equal(saved.gems.length,1);assert.equal(saved.camp.built.kelpie,true);assert.ok(saved.camp.water<80);
  // Any owned workshop can open camp and sleep, including after midnight.
  await click('#camp-close');
  await page.evaluate(()=>{const f=fossick,p=f.campBuildings.spots.lapidary;f.player.pos.x=p.x;f.player.pos.z=p.z;f.player.vel.set(0,0,0);f.daynight.hour=1;});
  if(touch)await page.locator('[data-act="interact"]').tap();else await page.keyboard.press('KeyE');
  await page.locator('#camp-workbench').waitFor({state:'visible'});
  const dayBefore=await page.evaluate(()=>fossick.state.day);
  await click('#camp-sleep');await page.locator('#camp-workbench').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>fossick.state.day),dayBefore+1);
  await bench();
  await click('#camp-view-collection');await page.locator('#inventory').waitFor({state:'visible'});
  assert.deepEqual(errors,[]);console.log(`${touch?'Touch':'Desktop'} full facilities: purchases, live power, displays, kelpie, real input, reserved stone, reload and exactly-once crafted result passed.`);await context.close();
 }
}finally{await browser.close();}
