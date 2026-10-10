// Serve the built output on a temporary loopback port. No player server/storage is touched.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const root=resolve('dist'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.glb':'model/gltf-binary'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/index.html'));if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}const body=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:1000,height:800}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
  await context.addInitScript(()=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,cash:800,gold:.1,difficulty:'easy'}));localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',res:.6,shadows:'off',aa:false,warned:true}));});
  await page.goto(`http://127.0.0.1:${server.address().port}/?test`,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>navigator.serviceWorker.controller&&window.fossick);
  await context.setOffline(true);await page.locator('#travel-btn').click();await page.locator('#region-depart').click();await page.waitForFunction(()=>window.fossickTas);
  assert.equal(await page.locator('#tas-heading').textContent(),'Fern River catchment');await page.locator('#tas-resume').click();
  await page.keyboard.down('KeyW');await page.waitForFunction(()=>fossickTas.player.z<111.5);await page.keyboard.up('KeyW');
  await page.locator('#tas-journal').click();await page.locator('#tas-return').click();await page.waitForFunction(()=>window.fossick);
  assert.equal(await page.evaluate(()=>fossick.state.gold),.1);
  await page.locator('#travel-btn').click();await page.locator('.region-location-list [data-location="ne-tasmania"]').click();await page.locator('#region-depart').click();await page.waitForFunction(()=>window.fossickTas?.region==='ne-tasmania');
  assert.equal(await page.locator('#tas-heading').textContent(),'Tin Fern River catchment');await page.locator('#tas-resume').click();
  await page.evaluate(()=>{const f=fossickTas,s=f.model.sites[1];Object.assign(f.player,{x:s.x-1,z:s.z});f.collectSample();f.expedition.difficulty='easy';});
  await page.locator('#tas-sieve').click();await page.locator('#sieve-load').click();await page.waitForFunction(()=>fossickTas.expedition.sieveSession.flipped);
  await page.locator('#sieve-collect').click();await page.locator('#sieve-close').click();await page.locator('#tas-journal').click();await page.locator('#tas-locations').click();await page.locator('#region-depart').click();await page.waitForFunction(()=>window.fossick);
  assert.equal(await page.evaluate(()=>fossick.state.gold),.1);assert.deepEqual(errors,[]);
  console.log('Production offline western movement, northeast rendered Easy sieve/collection, and return to cached home passed.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
