import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { makeExpedition, EXPEDITIONS } from '../src/regions.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LAND_BASE_URL||'http://127.0.0.1:5191/';
const high=!!process.env.LAND_HIGH;
const cases=process.env.LAND_CASES?JSON.parse(process.env.LAND_CASES):[['new-england',false],['golden-triangle',false],['qld-gemfields',false],['tasmania-west',false],['ne-tasmania',false],['new-england',true],['ne-tasmania',true]];
const browser=await chromium.launch({headless:true});
try {for(const [region,phone] of cases) {
  const context=await browser.newContext({viewport:phone?{width:844,height:390}:{width:1200,height:800},hasTouch:phone,isMobile:phone});
  const save={seed:12345,activeRegion:region},tas=EXPEDITIONS.includes(region);
  if(tas)save.expeditions={[region]:makeExpedition(save,['camp'],region)};
  await context.addInitScript(({save,high})=>{
    if(!sessionStorage.getItem('landscape-fixture')) {sessionStorage.setItem('landscape-fixture','1');localStorage.setItem('fossicking-save-v2',JSON.stringify(save));}
    localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:high?'high':'low',res:1,shadows:high?'high':'off',aa:high,gems:'simple',reflections:'static',warned:true}));
  },{save,high});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const click=selector=>phone?page.locator(selector).tap():page.locator(selector).click();
  const suffix=`${region}-${phone?'touch':high?'high':'desktop'}`;
  try {
    await page.goto(origin+'?test'+(phone?'&touch':''),{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick||window.fossickTas);
    await click(tas?'#tas-resume':'#play');
    await page.waitForTimeout(350);
    const landmarks=await page.evaluate(()=>{const f=window.fossick||fossickTas;return (f.landscape||f.world.landscape).landmarks;});
    assert.equal(landmarks.length,2,`${region} has both authored landmarks`);
    const protection=await page.evaluate(()=>{
      const f=window.fossick||fossickTas,l=f.landscape||f.world.landscape;
      return l.landmarks.every(p=>p.colliders.every(c=>window.fossick
        ? f.finds.items.every(s=>Math.hypot(s.x-c.x,s.z-c.z)>c.r+.4)&&f.field.sites.every(s=>Math.hypot(s.x-c.x,s.z-c.z)>c.r+1)
        : f.profile.nearestTrail(c.x,c.z).distance>c.r+1.5&&f.model.sites.every(s=>Math.hypot(s.x-c.x,s.z-c.z)>c.r+1)));
    });
    assert.ok(protection,'Landmarks leave paths and prospecting sites accessible');
    // Camera near the first landmark, facing its trunk/rock shape.
    await page.evaluate(()=>{
      const f=window.fossick||fossickTas,p=(f.landscape||f.world.landscape).landmarks[0],x=p.x,z=p.z+9;
      if(window.fossick){f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);f.daynight.hour=11;}
      else {Object.assign(f.player,{x,z});f.expedition.hour=11;}
      f.player.yaw=0;f.player.pitch=.03;
    });
    await page.waitForTimeout(400);await page.screenshot({path:`node_modules/.cache/landmark-${suffix}.png`});
    const budget=await page.evaluate(()=>{
      const f=window.fossick||fossickTas,lod=f.world.lod;
      return {trees:{...lod.stats},undergrowth:{...(f.landscape||f.world.landscape).lod.stats}};
    });
    assert.ok(budget.trees.drawnTriangles<budget.trees.fullTriangles*.65,'Distant tree detail reduces submitted geometry');
    // Locate a shallow, obstacle-free line in the existing river and walk it.
    const found=await page.evaluate(()=>{
      const f=window.fossick||fossickTas,tas=!window.fossick;
      const height=(x,z)=>tas?f.model.height(x,z):f.terrain.getHeight(x,z),depth=(x,z)=>tas?f.model.depth(x,z):f.terrain.waterDepth(x,z);
      for(let z=-45;z<50;z+=2)for(let x=-25;x<25;x+=.4) {
        if(depth(x,z)<.08||depth(x,z)>.35)continue;
        if(f.world.colliders.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+1))continue;
        if([0,1,2,3].some(d=>depth(x,z-d)<.04||depth(x,z-d)>.5||Math.abs(height(x,z-d)-height(x,z))>.3||f.world.colliders.some(c=>Math.hypot(x-c.x,z-d-c.z)<c.r+.6)))continue;
        if(tas)Object.assign(f.player,{x,z});else {f.player.pos.set(x,height(x,z),z);f.player.vel.set(0,0,0);}
        f.player.yaw=0;f.player.pitch=-.55;return true;
      }
      return false;
    });
    assert.ok(found,'Shallow walk fixture exists');
    const steps=()=>page.evaluate(()=>{const f=window.fossick||fossickTas;return {...(f.surfaceEffects||f.world.effects).stats};});
    const before=await steps();
    if(phone) {
      const box=await page.locator('#stick').boundingBox(),cdp=await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height*.15,id:1}]});
      await page.waitForFunction(n=>{const f=window.fossick||fossickTas;return (f.surfaceEffects||f.world.effects).stats.splashes>n;},before.splashes);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
    } else {
      await page.keyboard.down('KeyW');
      await page.waitForFunction(n=>{const f=window.fossick||fossickTas;return (f.surfaceEffects||f.world.effects).stats.splashes>n;},before.splashes);
      await page.keyboard.up('KeyW');
    }
    await page.screenshot({path:`node_modules/.cache/footfalls-${suffix}.png`});
    await page.waitForTimeout(600);const stopped=await steps();await page.waitForTimeout(500);
    assert.equal((await steps()).steps,stopped.steps,'Standing still makes no footsteps');
    // Existing mainland storm, cosmetic forest shower: accelerate only the wait.
    await page.evaluate(()=>{
      const f=window.fossick||fossickTas;
      if(window.fossick){Object.assign(f.weather,{phase:'peak',t:0,peak:.25,speed:1,thunderIn:300});f.environmentWeather.wet.value=1;}
      else {f.world.atmosphere.override=.9;}
    });
    await page.waitForFunction(n=>{const f=window.fossick||fossickTas;return (f.surfaceEffects||f.world.effects).stats.rainImpacts>n;},stopped.rainImpacts);
    await page.screenshot({path:`node_modules/.cache/rain-${suffix}.png`});
    await page.keyboard.press('KeyP');await page.waitForTimeout(100);const paused=await steps();await page.waitForTimeout(400);
    assert.equal((await steps()).steps,paused.steps);assert.equal((await steps()).splashes,paused.splashes);
    if(tas) {
      assert.equal(await page.evaluate(()=>fossickTas.world.campKit.visible),false);
      await page.evaluate(()=>{fossickTas.expedition.campPitched=true;});
      await page.waitForFunction(()=>fossickTas.world.campKit.visible);
    }
    await click(tas?'#tas-resume':'#play');
    await page.evaluate(()=>{
      const f=window.fossick||fossickTas,tas=!window.fossick,c=tas?f.profile.CAMP:f.terrain.camp,x=c.x-5,z=c.z+8;
      if(tas){Object.assign(f.player,{x,z});f.world.atmosphere.override=0;}
      else {f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);f.weather.phase='calm';f.weather.storm=0;}
      f.player.yaw=Math.atan2(x-c.x,z-c.z);f.player.pitch=-.16;
    });
    await page.waitForTimeout(300);await page.screenshot({path:`node_modules/.cache/camp-life-${suffix}.png`});
    await page.keyboard.press('Control+s');await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick||window.fossickTas);
    assert.deepEqual(await page.evaluate(()=>{const f=window.fossick||fossickTas;return (f.landscape||f.world.landscape).landmarks;}),landmarks,'Landmarks persist at identical positions across reload');
    assert.deepEqual(errors,[]);console.log(`${suffix}: landmarks, protection, walking/stop/pause, rain, camp and reload passed; ${JSON.stringify(budget)}`);
  }catch(e){console.log(errors);await page.screenshot({path:'node_modules/.cache/landscape-failure.png'}).catch(()=>{});throw e;}
  finally {await context.close();}
}}finally{await browser.close();}
