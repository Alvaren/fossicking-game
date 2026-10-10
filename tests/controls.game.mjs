// Real desktop pointer lock: no ?test bypass. Every location uses a disposable save.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {createPan} from '../src/panning.js';
import {travelTo} from '../src/regions.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true});
try{for(const region of process.env.CONTROLS_TOUCH_ONLY?[]:['new-england','golden-triangle','qld-gemfields','wa-goldfields','tasmania-west','ne-tasmania']){
  const home=['new-england','golden-triangle','qld-gemfields','wa-goldfields'].includes(region),context=await browser.newContext({viewport:{width:1280,height:860}});
  const base={seed:12345,cash:500,gold:.2,difficulty:'realistic',up:{pan:2,sieve:1},camp:{shelter:'tent'}};
  const seed=region==='new-england'?base:travelTo(base,region,['bucket','classifier']);
  await context.addInitScript(value=>{
    localStorage.setItem('fossicking-save-v2',JSON.stringify(value));
    localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',res:.6,shadows:'off',aa:false,gems:'simple',reflections:'static',warned:true}));
  },seed);
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5191/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.fossick||window.fossickTas);
  const resume=home?'#play':'#tas-resume';
  const locked=()=>page.waitForFunction(()=>document.pointerLockElement===document.getElementById('game'));
  const unlocked=()=>page.waitForFunction(()=>!document.pointerLockElement);
  const state=()=>page.evaluate(()=>{const f=window.fossick||window.fossickTas;return {tool:window.fossick?f.state.tool:f.tool,yaw:f.player.yaw,keys:[...f.keys]};});
  async function tool(expected){await page.waitForFunction(t=>(window.fossick?.state.tool||window.fossickTas?.tool)===t,expected);}
  await page.locator(resume).click();await locked();
  const yaw=(await state()).yaw;await page.mouse.move(710,400);await page.mouse.move(750,420);
  await page.waitForFunction(y=>(window.fossick||window.fossickTas).player.yaw!==y,yaw);
  await page.keyboard.press('Digit2');await tool(home?'shovel':'scoop');
  await page.keyboard.down('KeyW');await page.mouse.wheel(0,120);await tool('pan');
  assert.ok((await state()).keys.includes('KeyW'),'Switching tools must preserve walking');await page.keyboard.up('KeyW');
  await page.waitForFunction(()=>{const v=(window.fossick||window.fossickTas).view;return v.current==='pan'&&v.tools.pan.visible&&v.swap>.9;});
  assert.equal(await page.locator('#panning').isVisible(),false,'Selecting a pan does not use it');
  await page.screenshot({path:`node_modules/.cache/controls-${region}-pan.png`});
  await page.mouse.wheel(0,-120);await tool(home?'shovel':'scoop');
  await page.keyboard.press('Digit3');await tool('pan');
  if(region!=='tasmania-west'){
    await page.keyboard.press('Digit4');await tool('sieve');
    await page.mouse.wheel(0,-120);await tool('pan');
  }else{
    await page.mouse.wheel(0,120);await tool('scoop'); // only carried tools; wraps
    await page.mouse.wheel(0,-120);await tool('pan');
  }
  // A menu releases lock; moving/scrolling it must not move the camera or change tools.
  await page.keyboard.down('KeyW');await page.keyboard.press('KeyM');await unlocked();await page.keyboard.up('KeyW');
  const paused=await state();assert.deepEqual(paused.keys,[]);
  await page.mouse.move(1050,500);await page.mouse.wheel(0,240);await page.waitForTimeout(150);
  const after=await state();assert.equal(after.yaw,paused.yaw);assert.equal(after.tool,paused.tool);
  await page.locator(home?'#map-close':'#tas-resume').click();await locked();
  await page.keyboard.press('KeyP');await unlocked();await page.locator(resume).click();await locked();
  // Genuine browser unlock event, including the path used by the native Escape gesture.
  await page.evaluate(()=>document.exitPointerLock());await unlocked();
  await page.locator(resume).waitFor({state:'visible'});
  // Rejected browser requests must leave a usable pause screen and a stationary camera.
  await page.evaluate(()=>{const c=document.getElementById('game');window.restoreLock=c.requestPointerLock;c.requestPointerLock=()=>Promise.reject(new Error('Test denial'));});
  await page.locator(resume).click();await page.waitForTimeout(150);await unlocked();
  assert.equal(await page.locator(resume).isVisible(),true);
  const failed=(await state()).yaw;await page.mouse.move(700,400);assert.equal((await state()).yaw,failed);
  await page.evaluate(()=>{document.getElementById('game').requestPointerLock=window.restoreLock;});
  await page.locator(resume).click();await locked();
  if(!home){
    await page.evaluate(()=>{const f=fossickTas,s=f.model.sites.find(s=>s.kind==='crevice')||f.model.sites[1];Object.assign(f.player,{x:s.x-1,z:s.z});});
    await page.keyboard.press('Digit3');await page.mouse.click(600,400);await page.locator('#panning').waitFor({state:'visible'});await unlocked();
    await page.locator('#pan-close').click();await locked();
    if(region==='ne-tasmania'){
      await page.keyboard.press('Digit4');await page.mouse.click(600,400);await page.locator('#wet-sieve').waitFor({state:'visible'});await unlocked();
      await page.locator('#sieve-close').click();await locked();
    }
    await page.keyboard.press('Escape');await unlocked();assert.equal(await page.locator('#tas-modal').isVisible(),true);
  }
  assert.deepEqual(errors,[]);console.log(`${region}: actual pointer lock, mouse look, wheel/number keys, shared held tools, walking while switching, menu isolation, pause/resume, rejection recovery and tool close passed.`);
  await context.close();
}
  // Real touch events on the original toolbar and Use button. A partly worked
  // pan allows entry away from water without moving or changing a player save.
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(session=>{
    localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,cash:100,difficulty:'realistic',panSession:session}));
    localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',res:.6,shadows:'off',aa:false,gems:'simple',reflections:'static',warned:true}));
  },createPan({contents:{gold:.003,picker:0,finds:[]}}));
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5191/?test&touch',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);
  await page.locator('#play').tap();await page.locator('.slot[data-tool="pan"]').tap();
  assert.equal(await page.evaluate(()=>fossick.state.tool),'pan');
  assert.equal(await page.locator('#panning').isVisible(),false,'A toolbar tap must select without also using the tool');
  await page.locator('#t-use').tap();await page.locator('#panning').waitFor({state:'visible'});
  await page.locator('#pan-close').tap();await page.waitForTimeout(200);
  assert.equal(await page.locator('#panning').isVisible(),false,'The previous tap must not reopen the pan');
  await page.locator('#touch [data-act="map"]').tap();await page.locator('#map').waitFor({state:'visible'});
  await page.locator('#map-close').tap();await page.locator('#t-use').tap();await page.locator('#panning').waitFor({state:'visible'});
  assert.deepEqual(errors,[]);console.log('Original touch: toolbar selection, brief Use taps, pan/menu close and no stale input passed.');
  await context.close();
}finally{await browser.close();}
