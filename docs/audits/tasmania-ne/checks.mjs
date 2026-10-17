// Production resilience and visual conditions. All storage is disposable.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='docs/audits/tasmania-ne',report=[],browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
const baseline=JSON.parse(await readFile(out+'/before/world.json','utf8'));
await mkdir(out+'/conditions',{recursive:true});
async function boot({preset='high',touch=false,failure=''}={}) {
  const context=await browser.newContext({viewport:touch?{width:844,height:390}:{width:1280,height:720},isMobile:touch,hasTouch:touch,serviceWorkers:failure?'block':'allow'});
  await context.addInitScript(({preset,save})=>{if(sessionStorage.seeded)return;sessionStorage.seeded='1';localStorage.setItem('fossicking-save-v2',JSON.stringify(save));localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset,res:1,warned:true}));},{preset,save:baseline.save});
  if(failure)await context.route('**/models/tasmania-ne/environment.glb',r=>r.fulfill({status:failure==='missing'?404:200,contentType:'model/gltf-binary',body:'unavailable'}));
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&(!failure||!m.text().includes('404')))errors.push(m.text());});
  await page.goto('http://127.0.0.1:5191/?test'+(touch?'&touch':''),{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossickTas?.region==='ne-tasmania');await page.evaluate(()=>fossickTas.world.environment.ready);
  return {context,page,errors};
}
try {
  for(const failure of ['', 'missing','corrupt']) {
    const {context,page,errors}=await boot({failure});
    assert.equal(await page.evaluate(()=>fossickTas.world.environment.stats.status),failure?'fallback':'ready');
    const snapshot=()=>page.evaluate(()=>{const f=fossickTas;return {sites:f.model.sites,route:f.profile.ROUTE,heights:Array.from({length:121},(_,i)=>{const x=i%11*20-100,z=Math.floor(i/11)*24-120;return{x,z,h:f.model.height(x,z)}})};});
    const world=await snapshot();assert.deepEqual(world,{sites:baseline.profile.sites,route:baseline.profile.route,heights:baseline.heights});
    if(failure)assert.deepEqual(await page.evaluate(()=>fossickTas.world.colliders),baseline.colliders,'Fallback retains original solid world');
    if(!failure) {
      await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>navigator.serviceWorker.controller&&window.fossickTas);await page.evaluate(()=>fossickTas.world.environment.ready);
      await context.setOffline(true);await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossickTas);await page.evaluate(()=>fossickTas.world.environment.ready);
      assert.equal(await page.evaluate(()=>fossickTas.world.environment.stats.status),'ready');assert.deepEqual(await snapshot(),world);
    }
    await page.locator('#tas-resume').click();await page.keyboard.press('Digit2');assert.equal(await page.evaluate(()=>fossickTas.tool),'scoop');
    const start=await page.evaluate(()=>({...fossickTas.player}));await page.keyboard.down('KeyW');await page.waitForFunction(p=>Math.hypot(fossickTas.player.x-p.x,fossickTas.player.z-p.z)>.1,start);await page.keyboard.up('KeyW');
    await page.keyboard.press('KeyM');assert.equal(await page.locator('#tas-resume').isVisible(),true);
    assert.deepEqual(errors,[]);report.push({case:failure||'cached authored scenery offline reload',worldPreserved:true,movementAndJournal:true,errors});await context.close();console.log('Resilience:',failure||'offline');
  }
  for(const config of [{name:'low',preset:'low',hour:11,rain:0},{name:'rain',preset:'high',hour:13,rain:1},{name:'night',preset:'high',hour:22,rain:0},{name:'touch',preset:'medium',touch:true,hour:11,rain:0}]) {
    const {context,page,errors}=await boot(config);await page.locator('#tas-resume').click();
    await page.evaluate(({hour,rain})=>{const f=fossickTas,p=f.profile,z=-8,x=p.riverX(z)-p.riverWidth(z)-3;Object.assign(f.player,{x,z,yaw:Math.atan2(-(p.riverX(z+15)-x),-15),pitch:-.11});f.expedition.hour=hour;f.world.atmosphere.override=rain;},config);
    await page.waitForTimeout(1800);const stats=await page.evaluate(()=>({environment:{...fossickTas.world.environment.stats},water:{...fossickTas.world.waterDetail.stats},hour:fossickTas.expedition.hour}));
    assert.equal(stats.environment.status,'ready');assert.equal(stats.water.active,config.preset==='high');
    if(config.touch)assert.equal(await page.locator('#touch').isVisible(),true);else await page.addStyleTag({content:'#tas-hud {visibility:hidden}'});
    await page.screenshot({path:out+'/conditions/'+config.name+'.jpg',quality:91});assert.deepEqual(errors,[]);report.push({case:config.name,stats,errors});await context.close();console.log('Conditions:',config.name);
  }
} finally {await browser.close();await writeFile(out+'/resilience-conditions.json',JSON.stringify(report,null,2)+'\n');}
