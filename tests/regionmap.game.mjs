// Actual map UI, isolated saves. Geographic dots must not be displaced to
// make neighbouring destinations easier to select; labels provide that space.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.MAP_URL||'http://127.0.0.1:5191/',out=process.env.MAP_OUT||'docs/audits/uralla-map/local';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),report=[];
try{for(const phone of [false,true]){
  const ctx=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1280,height:900},hasTouch:phone,isMobile:phone});
  await ctx.addInitScript(()=>{if(sessionStorage.fixture)return;sessionStorage.fixture='1';
    localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,cash:123,gold:.2,camp:{shelter:'shed'},bucket:[{gold:.002}]}));
    localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',warned:true}));
  });
  const page=await ctx.newPage(),errors=[];page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
  const tap=s=>phone?page.locator(s).tap():page.locator(s).click();
  const pin=id=>'.region-map svg [data-location="'+id+'"]';
  async function open(){if(phone)await tap('#touch [data-act="map"]');else await page.keyboard.press('KeyM');await tap('#map-travel');}
  async function dot(id){
    const p=await page.locator(pin(id)+' .region-dot').evaluate(el=>{const p=new DOMPoint(+el.getAttribute('cx'),+el.getAttribute('cy')).matrixTransform(el.getScreenCTM());return{x:p.x,y:p.y};});
    if(phone)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
    assert.equal(await page.locator(pin(id)).getAttribute('aria-pressed'),'true','Clicked geographic dot selects '+id);
  }
  await page.goto(base+'?test'+(phone?'&touch':''),{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await tap('#play');await open();
  const centres=[];
  for(const [id,lon,lat] of [['uralla',151.47018071493963,-30.628017300823377],['graves-hill',147.684,-23.486]]) {
    const position=await page.locator(pin(id)+' .region-dot').evaluate(el=>({x:+el.getAttribute('cx'),y:+el.getAttribute('cy')}));
    // Independently invert the map projection to geographic degrees.
    assert.ok(Math.abs(position.x/560*44+112-lon)<1e-9);
    assert.ok(Math.abs(-10-position.y/480*35-lat)<1e-9);
    centres.push({id,lon,lat,...position});
  }
  await dot('uralla');await dot('new-england');await dot('uralla');
  await tap(pin('graves-hill')+' text');assert.match(await page.locator('#region-name').textContent(),/Graves Hill/);
  await tap(pin('qld-gemfields')+' text');assert.match(await page.locator('#region-name').textContent(),/Billystone/);
  if(!phone){await page.locator(pin('graves-hill')).focus();await page.keyboard.press('Enter');assert.match(await page.locator('#region-name').textContent(),/Graves Hill/);assert.equal(await page.evaluate(()=>document.activeElement.dataset.location),'graves-hill');}
  await tap('.region-location-list [data-location="lightning-ridge"]');assert.equal(await page.locator('#region-depart').isDisabled(),true);
  await tap('.region-location-list [data-location="uralla"]');assert.match(await page.locator('#region-fee').textContent(),/\$0/);
  await page.locator('.region-map').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+(phone?'touch':'desktop')+'-travel.jpg',quality:92});
  await tap('#region-close');await page.locator('#map').waitFor({state:'visible'});await tap('#map-travel');await tap('.region-location-list [data-location="uralla"]');await tap('#region-depart');
  await page.waitForFunction(()=>window.fossick?.region==='uralla');assert.equal(await page.evaluate(()=>fossick.state.cash),123);await tap('#play');await open();
  await tap('.region-location-list [data-location="new-england"]');await tap('#region-depart');await page.waitForFunction(()=>window.fossick?.region==='new-england');
  const home=await page.evaluate(()=>({cash:fossick.state.cash,gold:fossick.state.gold,camp:fossick.state.camp.shelter,bucket:fossick.state.bucket}));
  assert.deepEqual(home,{cash:123,gold:.2,camp:'shed',bucket:[{gold:.002}]});assert.deepEqual(errors,[]);
  report.push({phone,centres,checks:'Exact geographic pin centres; adjacent mouse/touch dots; separated number labels; desktop keyboard focus; unavailable/cancel; $0 Uralla round trip and retained home progress',errors});
  console.log((phone?'Touch':'Desktop')+': map pin positions, close selection, round trip and save passed');await ctx.close();
}}finally{await browser.close();await writeFile(out+'/checks.json',JSON.stringify(report,null,2)+'\n');}
