// Changed multipass renderer: night/flood, off-screen water and photo re-render.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=(process.env.OPT_OUT||'docs/audits/nsw-optimisation')+'/',report=[],region=process.env.OPT_REGION||'new-england';
await mkdir(root,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
try{for(const label of (process.env.OPT_LABELS||'baseline,candidate').split(',')){
 const context=await browser.newContext({viewport:{width:1280,height:720},acceptDownloads:true}),errors=[];
 await context.addInitScript(region=>{localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,activeRegion:region,claims:region==='new-england'?{}:{[region]:{seed:12345}},hour:11,difficulty:'realistic'}));localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'high',warned:true}));},region);
 const page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID/.test(m.text()))errors.push(m.text());});
 await page.goto('http://127.0.0.1:5191/'+(label==='baseline'?'baseline/':'')+'?test',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>(fossick.regionalEnvironment||fossick.newEngland).ready);await page.locator('#play').click();
 await page.evaluate(()=>{const f=fossick,z=24,x=f.creek.cx(z)-f.creek.halfWidth(z)-3;f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);f.player.yaw=Math.atan2(-(f.creek.cx(z)-x),-14);f.player.pitch=-.15;});
 await page.waitForTimeout(1200);await page.waitForFunction(()=>fossick.creekRendering.stats.active);
 await page.evaluate(()=>{window.auditHour=11;const update=fossick.daynight.update.bind(fossick.daynight);fossick.daynight.update=(_,p)=>{fossick.daynight.hour=auditHour;update(0,p);};});
 await page.evaluate(()=>{window.auditHour=22;});await page.keyboard.press('KeyL');await page.waitForTimeout(3500);await page.screenshot({path:root+label+'-night.jpg'});
 await page.evaluate(()=>{window.auditHour=11;fossick.weather.peak=.6;fossick.weather.phase='peak';fossick.weather.t=0;});await page.waitForTimeout(3500);
 assert.ok(await page.evaluate(()=>fossick.creek.level>.5&&fossick.creekRendering.stats.active));await page.screenshot({path:root+label+'-flood.jpg'});
 await page.evaluate(()=>{fossick.weather.phase='calm';fossick.weather.storm=0;fossick.weather.flood=0;fossick.weather.next=9999;fossick.renderer.setPixelRatio(.6);});
 await page.keyboard.press('KeyK');await page.waitForFunction(()=>fossick.photo.active);const download=page.waitForEvent('download');await page.locator('#game').click({position:{x:640,y:360}});const file=await download;await file.saveAs(root+label+'-photo.jpg');assert.equal(await page.evaluate(()=>fossick.renderer.getPixelRatio()),.6);await page.keyboard.press('KeyK');await page.waitForFunction(()=>!fossick.photo.active);
 await page.evaluate(()=>{const f=fossick,x=f.terrain.camp.x+120,z=f.terrain.camp.z;f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);f.player.pitch=1.5;});await page.waitForTimeout(700);
 const state=await page.evaluate(()=>({water:{...fossick.creekRendering.stats},auto:fossick.scene.matrixWorldAutoUpdate,shaderFailures:fossick.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length}));
 assert.equal(state.auto,true);assert.equal(state.shaderFailures,0);if(label==='candidate')assert.equal(state.water.active,false);assert.deepEqual(errors,[]);report.push({label,errors,...state});console.log('Night, flood, photo and off-screen water passed:',label);await context.close();
}}finally{await browser.close();await writeFile(root+'edge-cases.json',JSON.stringify(report,null,2)+'\n');}
