// Disposable browser saves. Positioning skips long walks; digging, jig input,
// flips, partial pan input and travel use the original player controls.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createPan} from '../src/panning.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true});
try {for(const phone of process.env.MAINLAND_TOUCH_ONLY?[true]:[false,true]) {
  const context=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1360,height:900},hasTouch:phone,isMobile:phone});
  await context.addInitScript(pan=>{
    if(sessionStorage.getItem('fixture'))return;sessionStorage.setItem('fixture','1');
    localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,cash:800,gold:.2,difficulty:'easy',up:{classifier:1,pan:2,sieve:1,bucket:1},camp:{shelter:'shed'},bucket:[{gold:.006,clay:.1,blackSand:2}],panSession:pan}));
    localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',res:.6,shadows:'off',aa:false,gems:'simple',reflections:'static',warned:true}));
  },createPan({contents:{gold:.0001,picker:0,finds:[]}}));
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(60000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('Ignored attempt to cancel a touchstart event'))errors.push(m.text());});
  const tap=selector=>phone?page.locator(selector).tap():page.locator(selector).click();
  const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')));
  const enter=()=>tap('#play');
  async function map(){if(phone)await tap('#touch [data-act="map"]');else await page.keyboard.press('KeyM');await page.locator('#map').waitFor({state:'visible'});}
  async function depart(region){await tap('.region-location-list [data-location="'+region+'"]');assert.match(await page.locator('#region-fee').textContent(),/\$0/);assert.equal(await page.locator('#region-depart').isDisabled(),false);await tap('#region-depart');await page.waitForFunction(id=>window.fossick?.region===id||window.fossickTas?.region===id,region);}
  async function travel(region){await map();await tap('#map-travel');await depart(region);}
  const client=phone?await context.newCDPSession(page):null;
  async function use(held){if(!phone){await page.mouse[held?'down':'up']();return;}
    const box=await page.locator('#t-use').boundingBox();await client.send('Input.dispatchTouchEvent',{type:held?'touchStart':'touchEnd',touchPoints:held?[{x:box.x+box.width/2,y:box.y+box.height/2}]:[]});}
  async function select(tool,key){if(phone)await tap('.slot[data-tool="'+tool+'"]');else await page.keyboard.press(key);}
  async function aim(x,z){await page.evaluate(({x,z})=>{const f=fossick,p=f.player.pos;p.set(x,f.terrain.getHeight(x,z+1.2),z+1.2);f.player.vel.set(0,0,0);f.player.yaw=0;f.player.pitch=Math.atan2(f.terrain.getHeight(x,z)-(p.y+1.65),1.2);},{x,z});await page.waitForTimeout(160);}
  try {
    await page.goto('http://127.0.0.1:5191/?test'+(phone?'&touch':''),{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await enter();
    await map();await tap('#map-travel');await depart('golden-triangle');const original=await save();
    assert.equal(await page.locator('#overlay h1').textContent(),'Ironbark Gully');await enter();
    const target=await page.evaluate(()=>{const f=fossick;const t=f.targets.list.filter(t=>t.kind==='gold'&&!t.quartz&&Math.hypot(t.x-f.terrain.camp.x,t.z)>20).sort((a,b)=>(f.terrain.getHeight(a.x,a.z)-a.y)-(f.terrain.getHeight(b.x,b.z)-b.y))[0];window.testTarget=t;return {x:t.x,z:t.z,id:t.id};});
    await aim(target.x,target.z);
    if(!phone){await page.mouse.down({button:'right'});await page.waitForFunction(()=>parseFloat(document.getElementById('meter-fill').style.width)>10);await page.mouse.up({button:'right'});}
    await select('shovel','Digit2');await use(true);await page.waitForFunction(()=>fossick.state.bucket.length>0);await page.waitForFunction(()=>!!window.testTarget.mesh);await use(false);
    if(phone)await tap('#touch [data-act="interact"]');else await page.keyboard.press('KeyE');
    await page.waitForFunction(()=>window.testTarget.collected);assert.equal(await page.evaluate(()=>fossick.state.nuggets.length),1);
    await page.screenshot({path:`node_modules/.cache/mainland-gold-${phone?'touch':'desktop'}.png`});
    // Enter the existing pan with an actual dug parcel and save partly worked material.
    await page.evaluate(()=>{const f=fossick,z=-20;f.player.pos.set(f.creek.cx(z),f.terrain.getHeight(f.creek.cx(z),z),z);f.player.vel.set(0,0,0);});
    await select('pan','Digit3');await use(true);await use(false);await page.locator('#panning').waitFor({state:'visible'});await tap('#pan-load');await page.waitForFunction(()=>fossick.state.panSession?.bed);await page.waitForTimeout(400);await tap('#pan-close');
    await map();assert.match(await page.locator('#map .inv-head h2').textContent(),/Ironbark/);
    assert.ok(await page.evaluate(()=>new Set(document.getElementById('map-canvas').getContext('2d').getImageData(0,0,560,560).data).size)>100);
    await page.screenshot({path:`node_modules/.cache/mainland-map-gold-${phone?'touch':'desktop'}.png`});await tap('#map-travel');
    await page.screenshot({path:`node_modules/.cache/mainland-travel-${phone?'touch':'desktop'}.png`});const goldSave=await save();assert.ok(goldSave.claims['golden-triangle'].panSession);await depart('qld-gemfields');
    assert.equal(await page.locator('#overlay h1').textContent(),'Billystone Wash');await enter();
    assert.equal(await page.evaluate(()=>fossick.targets.list.some(t=>t.kind==='gold')),false);
    const spot=await page.evaluate(()=>{const f=fossick,s=f.terrain.sources.basalt;return {x:s.ex,z:s.ez};});await aim(spot.x,spot.z);
    await use(true);await page.waitForFunction(()=>fossick.state.bucket.length>=4);await use(false);
    assert.ok(await page.evaluate(()=>fossick.state.bucket.every(s=>s.clay>=.22&&s.gold===0&&s.classified)));
    assert.ok(await page.evaluate(()=>fossick.state.bucket.some(s=>s.sapphire>0)));
    await page.evaluate(()=>{const f=fossick,z=10;f.player.pos.set(f.creek.cx(z),f.terrain.getHeight(f.creek.cx(z),z),z);f.player.vel.set(0,0,0);});
    await select('sieve','Digit4');await page.locator('#jig').waitFor({state:'visible'});
    // Follow the real needle with mouse/touch hold-release events.
    let held=false;
    for(let i=0;i<100;i++){
      const j=await page.evaluate(()=>({I:fossick.jig.I,zone:fossick.jigZone(),strat:fossick.jig.strat}));if(j.strat>.015)break;
      const want=j.I<(j.zone[0]+j.zone[1])/2;if(want!==held){await use(want);held=want;}await page.waitForTimeout(70);
    }
    if(held)await use(false);assert.ok(await page.evaluate(()=>fossick.jig.strat>.005),'Real jig input must settle material');
    // Accelerate the remaining settling after testing input; keep the actual assay and flip path.
    await page.evaluate(()=>{fossick.jig.strat=1;});const count=await page.evaluate(()=>fossick.state.bucket.length);
    if(phone)await tap('#touch [data-act="flip"]');else await page.mouse.click(600,400,{button:'right'});
    await page.waitForFunction(n=>fossick.state.bucket.length===n-1,count);
    await page.screenshot({path:`node_modules/.cache/mainland-gem-${phone?'touch':'desktop'}.png`});
    await map();assert.match(await page.locator('#map .inv-head h2').textContent(),/Billystone/);await page.screenshot({path:`node_modules/.cache/mainland-map-gem-${phone?'touch':'desktop'}.png`});await tap('#map-close');
    if(phone)await tap('#touch [data-act="save"]');else await page.keyboard.press('Control+s');
    const qldSave=await save();assert.ok(qldSave.claims['qld-gemfields'].bucket.length<count);assert.ok(qldSave.claims['qld-gemfields'].digs.idx.length>0);
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick?.region==='qld-gemfields');assert.deepEqual(await page.evaluate(()=>fossick.state.bucket),qldSave.claims['qld-gemfields'].bucket);await enter();
    // Direct travel through both established Tasmanian destinations.
    await travel('tasmania-west');await tap('#tas-locations');await depart('ne-tasmania');await tap('#tas-locations');await depart('golden-triangle');
    assert.deepEqual(await page.evaluate(()=>fossick.state.panSession),goldSave.claims['golden-triangle'].panSession);
    assert.equal(await page.evaluate(id=>fossick.targets.list.find(t=>t.id===id).collected,target.id),true);await enter();await travel('new-england');
    const back=await save();for(const key of ['seed','digs','bucket','panSession','camp'])assert.deepEqual(back[key],original[key],key);
    assert.equal(back.cash,800);assert.equal(back.nuggets.length,1);assert.equal(back.claims['qld-gemfields'].bucket.length,qldSave.claims['qld-gemfields'].bucket.length);
    assert.deepEqual(errors,[]);console.log(`${phone?'Touch':'Desktop'}: $0 five-location travel, original digging/detection, nugget collection, partial pan, classified sapphire wash, real jig input/flip, maps, reload and independent saves passed.`);
  } catch(e){await page.screenshot({path:`node_modules/.cache/mainland-failure-${phone?'touch':'desktop'}.png`});console.log('Browser errors:',errors);console.log(await page.evaluate(()=>({region:window.fossick?.region,tool:window.fossick?.state.tool,prompt:document.getElementById('prompt')?.textContent,jig:window.fossick?.jig,bucket:window.fossick?.state.bucket.length})));throw e;}
  finally{await context.close();}
}}finally{await browser.close();}
