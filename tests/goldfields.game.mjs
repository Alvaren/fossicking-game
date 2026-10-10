// Disposable saves only. Positioning skips travel time; detecting, digging,
// pickup, camp purchases, pan input and travel use the original controls.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { stepPan, automaticStroke } from '../src/panning.js';
const require = createRequire(import.meta.url), {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.WA_BASE_URL || 'http://127.0.0.1:5191/';
const high = !!process.env.WA_HIGH, offline = !!process.env.WA_OFFLINE;
const browser = await chromium.launch({headless:true});
try { for (const phone of process.env.WA_DESKTOP_ONLY ? [false] : process.env.WA_TOUCH_ONLY ? [true] : [false,true]) {
  const context = await browser.newContext({viewport:phone?{width:844,height:390}:{width:1360,height:900},hasTouch:phone,isMobile:phone});
  await context.addInitScript(() => {
    if (sessionStorage.getItem('wa-fixture')) return;
    sessionStorage.setItem('wa-fixture','1');
    localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,cash:1400,gold:.2,difficulty:'realistic',up:{pan:2,sluice:2,bucket:1},camp:{shelter:'shed'},bucket:[{gold:.004}],ute:{x:19,z:8,h:1}}));
    localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',res:.6,shadows:'off',aa:false,gems:'simple',reflections:'static',warned:true}));
  });
  const page = await context.newPage(), errors=[]; page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('Ignored attempt to cancel a touchstart event'))errors.push(m.text());});
  const tap = s => phone ? page.locator(s).tap() : page.locator(s).click();
  const keyOrTap = (key,s) => phone ? tap(s) : page.keyboard.press(key);
  const suffix = `${phone?'touch':high?'high':'desktop'}${offline?'-offline':''}`;
  const shot = name => page.screenshot({path:`node_modules/.cache/wa-${name}-${suffix}.png`});
  const save = () => page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')));
  async function enter() { await tap('#play'); if(await page.evaluate(()=>!!document.fullscreenElement))await page.evaluate(()=>document.exitFullscreen()); }
  async function resize(size) {
    if(await page.evaluate(()=>!!document.fullscreenElement))await page.evaluate(()=>document.exitFullscreen());
    await page.setViewportSize(size);
  }
  async function map() {await keyOrTap('KeyM','#touch [data-act="map"]');await page.locator('#map').waitFor({state:'visible'});}
  async function depart(id) {
    await tap(`.region-location-list [data-location="${id}"]`);
    assert.match(await page.locator('#region-fee').textContent(),/\$0/);
    // High verification targets WA; warm/return to the unchanged home scene
    // on Low so software WebGL does not spend minutes compiling its trees.
    if(high)await page.evaluate(id=>{
      const high=id==='wa-goldfields',s=JSON.parse(localStorage.getItem('fossicking-settings-v1'));
      Object.assign(s,{preset:high?'high':'low',res:high?1:.6,shadows:high?'high':'off',aa:high});
      localStorage.setItem('fossicking-settings-v1',JSON.stringify(s));
    },id);
    await tap('#region-depart');await page.waitForFunction(id=>window.fossick?.region===id,id);
  }
  async function travel(id) {await map();await tap('#map-travel');await depart(id);}
  async function bench() {
    await page.evaluate(()=>{const f=fossick,p=f.campStation.spot,flip=f.creek.cx(0)>f.terrain.camp.x?-1:1;f.player.pos.set(p.x-2*flip,f.terrain.getHeight(p.x-2*flip,p.z),p.z);f.player.vel.set(0,0,0);f.player.yaw=flip>0?-Math.PI/2:Math.PI/2;f.player.pitch=-.13;});
    await keyOrTap('KeyE','#touch [data-act="interact"]');await page.locator('#camp-workbench').waitFor({state:'visible'});
  }
  const client = phone ? await context.newCDPSession(page) : null;
  async function use(held) {
    if (!phone) {await page.mouse[held?'down':'up']();return;}
    const b=await page.locator('#t-use').boundingBox();
    await client.send('Input.dispatchTouchEvent',{type:held?'touchStart':'touchEnd',touchPoints:held?[{x:b.x+b.width/2,y:b.y+b.height/2}]:[]});
  }
  try {
    await page.goto(origin+'?test'+(phone?'&touch':''),{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);
    if(offline)await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
    await enter();await travel('wa-goldfields');const home=await save();
    assert.equal(await page.locator('#overlay h1').textContent(),'Mulga Flat');await enter();
    const content=await page.evaluate(()=>{
      const f=fossick,water=f.weather.water;
      return {dry:f.creek.dry,water:water.mesh.visible,leaves:water.leaves.visible,wet:f.terrain.material.userData.waterLevel.value,
        nuggets:f.targets.list.filter(t=>t.kind==='gold'&&!t.quartz).length,quartz:f.targets.list.filter(t=>t.quartz).length,
        localized:f.targets.list.filter(t=>t.kind==='gold'&&!t.quartz).every(t=>f.deposits.nuggetWeight(t.x,t.z)>0&&f.terrain.getOrigHeight(t.x,t.z)-t.y<=.401),
        landmarks:f.landscape.landmarks.length,workings:f.terrain.workings.length,trees:f.world.lod.batches.filter(b=>b.source.userData.tree).reduce((n,b)=>n+b.source.count,0)};
    });
    assert.deepEqual(content,{dry:true,water:false,leaves:false,wet:-100,nuggets:55,quartz:9,localized:true,landmarks:2,workings:7,trees:0});
    await shot('camp');console.log(`${suffix}: WA loaded, dry world and low scrub checked`);
    // Inspect the actual red-rock landmark and old diggings.
    for(const view of ['landmark','diggings']) {
      await page.evaluate(view=>{const f=fossick,p=view==='landmark'?f.landscape.landmarks[0]:f.terrain.workings[3];f.player.pos.set(p.x,f.terrain.getHeight(p.x,p.z+9),p.z+9);f.player.vel.set(0,0,0);f.player.yaw=0;f.player.pitch=-.1;f.daynight.hour=10;},view);
      await page.waitForTimeout(250);await shot(view);
    }
    const target=await page.evaluate(()=>{const f=fossick,t=f.targets.list.filter(t=>t.kind==='gold'&&!t.quartz&&t.grams>1&&Math.hypot(t.x-f.terrain.camp.x,t.z)>20).sort((a,b)=>(f.terrain.getHeight(a.x,a.z)-a.y)-(f.terrain.getHeight(b.x,b.z)-b.y))[0];window.waTarget=t;f.player.pos.set(t.x,f.terrain.getHeight(t.x,t.z+1.2),t.z+1.2);f.player.vel.set(0,0,0);f.player.yaw=0;f.player.pitch=Math.atan2(f.terrain.getHeight(t.x,t.z)-(f.player.pos.y+1.65),1.2);return {id:t.id,x:t.x,z:t.z};});
    await page.waitForTimeout(200);
    if(!phone){await page.mouse.down({button:'right'});await page.waitForFunction(()=>parseFloat(document.getElementById('meter-fill').style.width)>10);await page.mouse.up({button:'right'});}
    await keyOrTap('Digit2','.slot[data-tool="shovel"]');await use(true);
    await page.waitForFunction(()=>fossick.state.bucket.length>0&&!!window.waTarget.mesh);await use(false);
    await keyOrTap('KeyE','#touch [data-act="interact"]');await page.waitForFunction(()=>window.waTarget.collected);
    assert.equal(await page.evaluate(()=>fossick.state.nuggets.length),1);await shot('find');console.log(`${suffix}: detector, dig and pickup checked`);
    // Dry tools must not start a water activity or accept a pump/sluice placement.
    await page.evaluate(()=>{const f=fossick,z=-20,x=f.creek.cx(z);f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);f.player.pitch=-.7;});
    for(const [tool,key] of [['pan','Digit3'],['sieve','Digit4'],['sluice','Digit5']]) {
      await keyOrTap(key,`.slot[data-tool="${tool}"]`);await use(true);await page.waitForTimeout(170);await use(false);
      assert.equal(await page.locator('#panning').isVisible(),false);assert.equal(await page.locator('#jig').isVisible(),false);
      assert.equal(await page.evaluate(()=>fossick.sluice.placed),false);
    }
    // Run through every storm phase; it must never replenish targets or flood.
    const beforeStorm=await page.evaluate(()=>fossick.targets.list.length);
    await page.evaluate(()=>{const f=fossick;for(const phase of ['building','rising','peak','falling','clearing']){f.weather.begin(phase);f.weather.update(.1,f.player.pos);if(f.weather.flood!==0||f.creek.level!==0)throw Error('Dry claim flooded');}f.weather.phase='calm';f.weather.storm=0;f.weather.next=999;});
    assert.equal(await page.evaluate(()=>fossick.targets.list.length),beforeStorm);
    await bench();await tap('#camp-build-tent');await page.getByRole('button',{name:'Build · $75',exact:true}).click();
    assert.equal(await page.evaluate(()=>fossick.state.cash),1075);
    await tap('#camp-field');await tap('#pan-load');await page.waitForFunction(()=>!!fossick.panUI.session);
    await tap('[data-pan-action="stratify"]:visible');
    const b=await page.locator('#pan-canvas').boundingBox(),x=b.x+b.width*.5,y=(Math.max(0,b.y)+Math.min(page.viewportSize().height,b.y+b.height))/2;
    if(phone){
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,radiusX:1,radiusY:1,force:1}]});
      for(let i=0;i<12;i++){await page.waitForTimeout(35);await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(i%2?70:-70),y:y+(i%3-1)*10}]});}
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }else{await page.mouse.move(x,y);await page.mouse.down();for(let i=0;i<12;i++)await page.mouse.move(x+(i%2?70:-70),y+(i%3-1)*25,{steps:4});await page.mouse.up();}
    assert.ok(await page.evaluate(()=>fossick.panUI.session.time>0));await shot('pan');await tap('#pan-close');
    await tap('#camp-close');console.log(`${suffix}: camp purchases and actual pan strokes checked`);
    await keyOrTap('Digit3','.slot[data-tool="pan"]');await use(true);await page.waitForTimeout(200);await use(false);
    assert.equal(await page.locator('#panning').isVisible(),false,'A partly worked WA pan is resumed at the tub, not on dry ground');
    // Use the existing vehicle input, then save a real changed vehicle position.
    await page.evaluate(()=>{const f=fossick,p=f.ute.local(0,2.3);f.player.pos.set(p.x,f.terrain.getHeight(p.x,p.z),p.z);f.player.vel.set(0,0,0);});
    await keyOrTap('KeyE','#touch [data-act="interact"]');await page.waitForFunction(()=>fossick.ute.driving);
    const uteStart=await page.evaluate(()=>({x:fossick.ute.x,z:fossick.ute.z}));
    if(phone){const b=await page.locator('#stick').boundingBox();await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width/2,y:b.y+4}]});}
    else await page.keyboard.down('KeyW');
    await page.waitForFunction(p=>Math.hypot(fossick.ute.x-p.x,fossick.ute.z-p.z)>.15,uteStart);
    if(phone)await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.keyboard.up('KeyW');
    await keyOrTap('KeyE','#touch [data-act="interact"]');
    await map();assert.match(await page.locator('#map .inv-head h2').textContent(),/Mulga Flat/);
    assert.ok(await page.evaluate(()=>{const data=fossick.map.base.getContext('2d').getImageData(0,0,560,560).data;return data.every((v,i)=>i%4!==0||v>=data[i+2])&&new Set(data).size>80;}));
    if(phone)await resize({width:390,height:844});await shot('map');
    await tap('#map-travel');await tap('.region-location-list [data-location="wa-goldfields"]');await shot('travel');
    const worked=await save(),wa=worked.claims['wa-goldfields'];assert.ok(wa.panSession);assert.ok(wa.digs.idx.length);
    if(offline){await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await context.setOffline(true);}
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick?.region==='wa-goldfields');console.log(`${suffix}: reloaded worked claim`);
    assert.deepEqual(await page.evaluate(()=>fossick.state.panSession),wa.panSession);
    assert.equal(await page.evaluate(id=>fossick.targets.list.find(t=>t.id===id).collected,target.id),true);
    assert.equal(await page.evaluate(()=>fossick.state.camp.shelter),'tent');
    assert.deepEqual(await page.evaluate(()=>({x:fossick.ute.x,z:fossick.ute.z,h:fossick.ute.heading})),wa.ute);
    if(phone)await resize({width:844,height:390});await enter();await bench();await tap('#camp-field');
    // Finish the same reserved sample with the production simulation after real input.
    const session=await page.evaluate(()=>fossick.panUI.session);
    for(let i=0;i<30000&&!session.finished;i++)stepPan(session,automaticStroke(session),1/60);
    assert.ok(session.finished);await page.evaluate(s=>{Object.assign(fossick.panUI.session,s);fossick.panUI.refresh();},session);
    await tap('#pan-collect');const gold=await page.evaluate(()=>fossick.state.gold);await tap('#camp-close');
    await travel('new-england');const back=await save();
    for(const k of ['seed','bucket','camp','ute'])assert.deepEqual(back[k],home[k],k);
    assert.equal(back.cash,1075);assert.equal(back.gold,gold);assert.equal(back.nuggets.length,1);
    await enter();await travel('wa-goldfields');
    assert.equal(await page.evaluate(()=>fossick.state.panSession),null);assert.equal(await page.evaluate(()=>fossick.state.gold),gold);
    assert.deepEqual(errors,[]);console.log(`${suffix}: $0 travel, dry scenery/map/storms/tools, patch targets, detector/dig/pickup, camp/tub, real pan strokes, ute movement, reload and isolated round trip passed.`);
  } catch(error) {await shot('failure');throw error;} finally {await context.close();}
} } finally {await browser.close();}
