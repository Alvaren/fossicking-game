import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {travelTo} from '../src/regions.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true});
const origin=process.env.SNIPE_URL||'http://127.0.0.1:5191/';
await mkdir('node_modules/.cache',{recursive:true});
try{for(const mode of (process.env.SNIPE_CASES||'desktop,touch,portrait').split(',')){
  const touch=mode!=='desktop',context=await browser.newContext({viewport:mode==='portrait'?{width:390,height:844}:touch?{width:844,height:390}:{width:1280,height:860},isMobile:touch,hasTouch:touch});
  const seed=travelTo({seed:12345,cash:0,gold:.1,up:{},difficulty:'realistic'},'tasmania-west',['bucket']);
  await context.addInitScript(value=>{
    if(!localStorage.getItem('fossicking-save-v2'))localStorage.setItem('fossicking-save-v2',JSON.stringify(value));
    localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',res:.8,shadows:'off',aa:false,gems:'simple',reflections:'static',warned:true}));
  },seed);
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(origin+(touch?'?test&touch':''),{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossickTas);
  if(process.env.SNIPE_OFFLINE){
    // Cache the home scene too, as on a player's departure from home; it is a
    // separate lazy chunk and has not been visited by this direct-region fixture.
    await page.locator('#tas-return').click();await page.waitForFunction(()=>window.fossick);await page.waitForLoadState('networkidle');
    await page.locator('#travel-btn').click();await page.locator('#region-depart').click();await page.waitForFunction(()=>window.fossickTas);await page.waitForLoadState('networkidle');
    await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload({waitUntil:'networkidle'});
    await page.waitForFunction(()=>navigator.serviceWorker.controller&&window.fossickTas);
    await context.setOffline(true);await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossickTas);
  }
  const click=async selector=>touch?page.locator(selector).tap():page.locator(selector).click();
  await click('#tas-sniping-kit');assert.ok(await page.evaluate(()=>fossickTas.expedition.loadout.includes('sniping')));
  await click('#tas-resume');if(!touch)await page.waitForFunction(()=>document.pointerLockElement===document.getElementById('game'));
  // Use the existing bank route for a reproducible starting position; normal walking remains untouched.
  await page.evaluate(()=>{const f=fossickTas,r=f.profile.ROUTE,p=f.model.snipingPockets[0];
    outer:for(let i=1;i<r.length;i++)for(let j=0;j<=100;j++){
      const x=r[i-1].x+(r[i].x-r[i-1].x)*j/100,z=r[i-1].z+(r[i].z-r[i-1].z)*j/100;
      if(Math.abs(z-p.z)<5&&Math.hypot(x-p.x,z-p.z)<11&&f.model.depth(x,z)<.72){Object.assign(f.player,{x,z});break outer;}
    }
  });
  const bank=await page.evaluate(()=>({...fossickTas.player}));
  if(touch){await click('#tas-mask');await click('#t-use');}else{await page.keyboard.press('Digit4');await page.keyboard.press('KeyE');}
  await page.waitForFunction(()=>fossickTas.sniping?.active);
  assert.ok(await page.locator('#sniping-hud').isVisible());
  if(!touch){
    const yaw=await page.evaluate(()=>fossickTas.sniping.pose.yaw);await page.mouse.move(5,4);await page.mouse.move(25,14);
    await page.waitForFunction(y=>fossickTas.sniping.pose.yaw!==y,yaw);
    await page.keyboard.down('KeyW');await page.mouse.wheel(0,120);await page.waitForFunction(()=>fossickTas.sniping.tool==='pick');
    assert.ok(await page.evaluate(()=>fossickTas.keys.has('KeyW')));await page.keyboard.up('KeyW');
    await page.keyboard.press('Digit3');assert.equal(await page.evaluate(()=>fossickTas.sniping.tool),'snuffer');
    await page.keyboard.press('KeyF');assert.equal(await page.evaluate(()=>fossickTas.sniping.force),'steady');
    await page.keyboard.press('KeyF');await page.keyboard.press('KeyF');
  }else{
    const cdp=await context.newCDPSession(page),box=await page.locator('#touch-look').boundingBox();
    const x=box.x+box.width*.55,y=box.y+box.height*.45;
    const yaw=await page.evaluate(()=>fossickTas.sniping.pose.yaw);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+25,y:y+12,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForFunction(v=>fossickTas.sniping.pose.yaw!==v,yaw);await cdp.detach();
    await click('[data-force="steady"]');assert.equal(await page.evaluate(()=>fossickTas.sniping.force),'steady');await click('[data-force="gentle"]');
  }
  async function aim(index){await page.evaluate(index=>{const s=fossickTas.sniping,c=s.pocket.cells[index];s.pose={x:c.x,z:c.z+.8,yaw:0,pitch:Math.atan2(.06-1.08,.8)};},index);await page.waitForFunction(i=>fossickTas.sniping.target===i,index);}
  async function select(tool){if(touch)await click(`[data-snipe-tool="${tool}"]`);else await page.keyboard.press({fan:'Digit1',pick:'Digit2',snuffer:'Digit3'}[tool]);}
  let session;
  async function hold(){
    if(!touch){await page.mouse.down();return;}
    session=await context.newCDPSession(page);const b=await page.locator('#t-use').boundingBox();
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2,id:4}]});
  }
  async function release(){if(!touch){await page.mouse.up();return;}await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();session=null;}
  await aim(0);await select('fan');await hold();
  await page.waitForFunction(()=>{const c=fossickTas.sniping.pocket.cells[0];return c.loose<c.capacity*.025;});await release();
  const afterFan=await page.evaluate(()=>fossickTas.sniping.pocket.cells[0].loose);await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>fossickTas.sniping.pocket.cells[0].loose),afterFan,'Release stops excavation');
  await select('pick');await hold();await page.waitForFunction(()=>{const c=fossickTas.sniping.pocket.cells[0];return c.loose+c.bound<c.capacity*.04;});await release();
  await page.screenshot({path:`node_modules/.cache/sniping-${mode}-gold.png`});
  await select('snuffer');await hold();await page.waitForFunction(()=>fossickTas.sniping.pocket.cells[0].inspected);await release();
  let awarded=await page.evaluate(()=>fossickTas.expedition.gold);assert.ok(awarded>0);
  await hold();await page.waitForTimeout(1000);await release();assert.equal(await page.evaluate(()=>fossickTas.expedition.gold),awarded);
  if(!touch&&process.env.SNIPE_EXTRAS){
    await page.evaluate(()=>{fossickTas.expedition.difficulty='easy';});await hold();
    await page.waitForFunction(()=>fossickTas.sniping.pocket.cells.filter(c=>c.inspected).length>1);await release();
    const automatic=await page.evaluate(()=>{
      const s=fossickTas.sniping,stages=new Set();
      for(let i=0;i<20000&&s.pocket.cells.some(c=>!c.inspected);i++){s.update(.05,{using:true,playing:true});stages.add(s.tool);}
      return {stages:[...stages],done:s.pocket.cells.filter(c=>c.inspected).length,gold:s.pocket.recoveredGold,assay:s.pocket.initialGold};
    });
    assert.equal(automatic.done,12);assert.ok(Math.abs(automatic.gold-automatic.assay)<1e-12);assert.deepEqual(automatic.stages.sort(),['fan','pick','snuffer']);
    awarded=await page.evaluate(()=>fossickTas.expedition.gold);
    await page.screenshot({path:'node_modules/.cache/sniping-easy-complete.png'});
    await page.evaluate(()=>{fossickTas.expedition.difficulty='realistic';});
    console.log('Easy: actual held demonstration recovered a crack; accelerated rendered work view completed every finite crack through fan, pick and snuffer.');
  }
  if(!touch){
    await aim(2);await select('fan');await page.keyboard.down('KeyW');await hold();await page.keyboard.press('KeyP');await release();await page.keyboard.up('KeyW');
    await page.waitForFunction(()=>!document.pointerLockElement);assert.deepEqual(await page.evaluate(()=>[...fossickTas.keys]),[]);
    const paused=await page.evaluate(()=>JSON.stringify(fossickTas.sniping.pocket));await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>JSON.stringify(fossickTas.sniping.pocket)),paused);
    await click('#tas-resume');await page.waitForFunction(()=>document.pointerLockElement===document.getElementById('game'));
    await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>fossickTas.sniping.pocket.cells[2].loose),JSON.parse(paused).cells[2].loose);
    await page.keyboard.press('KeyE');
  }else await click('#snipe-exit');
  assert.equal(await page.evaluate(()=>fossickTas.sniping.active),false);
  const back=await page.evaluate(()=>({...fossickTas.player}));assert.deepEqual(back,bank,'Sniping returns to the unchanged bank anchor');
  if(touch)await click('#t-use');else await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>fossickTas.sniping.active);await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>fossickTas.expedition.gold),awarded,'Reopening a pocket does not recover it again');
  if(touch)await click('#snipe-exit');else await page.keyboard.press('KeyE');
  await page.evaluate(()=>fossickTas.save());await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossickTas);
  assert.equal(await page.evaluate(()=>fossickTas.expedition.gold),awarded);
  assert.equal(await page.evaluate(()=>fossickTas.expedition.snipingPockets[fossickTas.model.snipingPockets[0].id].cells[0].inspected),true);
  assert.match(await page.locator('#tas-results').textContent(),/Sniping/);
  // Recovering to the trailhead is an existing explicit player command. Bank through normal travel UI.
  await click('#tas-recover');await click('#tas-return');await page.waitForFunction(()=>window.fossick);
  assert.ok(Math.abs(await page.evaluate(()=>fossick.state.gold)-(.1+awarded))<1e-12);
  assert.deepEqual(errors,[]);console.log(`${mode}: sniping search/look, shared tool controls, real held Use/release, visible gold, recovery once, pause, bank anchor, reload and travel banking passed.`);
  await context.close();
}}finally{await browser.close();}
