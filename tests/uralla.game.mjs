// Isolated fixtures. Relocation skips walking only; travel, digging, pan and
// sieve actions are driven through the original desktop/touch handlers.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.URALLA_URL||'http://127.0.0.1:5191/';
const out=process.env.URALLA_TEST_OUT||'docs/audits/uralla/game';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),report=[];
try{for(const phone of [false,true]){
  const ctx=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1280,height:720},hasTouch:phone,isMobile:phone});
  await ctx.addInitScript(phone=>{if(sessionStorage.fixture)return;sessionStorage.fixture='1';
    localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,cash:800,difficulty:phone?'easy':'realistic',up:{classifier:1,sieve:1,bucket:1,pan:2,sluice:2},camp:{shelter:'shed'},bucket:[{gold:.002}]}));
    localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',warned:true}));
  },phone);
  const page=await ctx.newPage(),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
  const tap=s=>phone?page.locator(s).tap():page.locator(s).click();
  const client=phone?await ctx.newCDPSession(page):null;
  async function use(on){if(!phone)return page.mouse[on?'down':'up']();const b=await page.locator('#t-use').boundingBox();await client.send('Input.dispatchTouchEvent',{type:on?'touchStart':'touchEnd',touchPoints:on?[{x:b.x+b.width/2,y:b.y+b.height/2}]:[]});}
  async function select(tool,key){if(phone)await tap('.slot[data-tool="'+tool+'"]');else await page.keyboard.press(key);}
  async function map(){if(phone)await tap('#touch [data-act="map"]');else await page.keyboard.press('KeyM');await page.locator('#map').waitFor({state:'visible'});}
  async function travel(id){await map();await tap('#map-travel');await tap('.region-location-list [data-location="'+id+'"]');assert.match(await page.locator('#region-fee').textContent(),/\$0/);await tap('#region-depart');await page.waitForFunction(id=>window.fossick?.region===id,id);}
  const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')));
  const place=()=>page.evaluate(()=>{const f=fossick,c=f.creek,z=4,x=c.cx(z)-c.halfWidth(z)*.85;f.player.pos.set(x,f.terrain.getHeight(x,z+1.3),z+1.3);f.player.vel.set(0,0,0);f.player.yaw=0;f.player.pitch=-.85;});
  try{
    await page.goto(base+'?test'+(phone?'&touch':''),{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await tap('#play');
    await travel('uralla');await page.evaluate(()=>fossick.regionalEnvironment.ready);assert.equal(await page.evaluate(()=>fossick.regionalEnvironment.stats.status),'ready');await tap('#play');
    if(!phone){
      const rock=await page.evaluate(()=>{const f=fossick,b=f.creek.boulders[0],r=f.world.colliders.find(c=>c.x===b.x&&c.z===b.z).r;
        const x=b.x-r-3,z=b.z;f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);f.player.yaw=-Math.PI/2;f.player.pitch=-.1;return{x:b.x,z:b.z,r,startX:x};});
      await page.keyboard.down('KeyW');await page.waitForTimeout(1600);await page.keyboard.up('KeyW');
      const pos=await page.evaluate(()=>({x:fossick.player.pos.x,z:fossick.player.pos.z}));
      assert.ok(pos.x-rock.startX>.3,'Actual movement approaches the boulder');
      assert.ok(Math.hypot(pos.x-rock.x,pos.z-rock.z)>=rock.r-.05,'The giant boulder stops the original player controller');
    }
    assert.ok(await page.evaluate(()=>{const rocks=fossick.regionalEnvironment.root.children.filter(o=>/^Uralla (granite|cobble)_/.test(o.name));return rocks.length>=4&&rocks.every(o=>Array.from(o.geometry.attributes.aAuthoredRockKind.array).every(v=>v===0));}),'Actual loaded boulders use the granite surface');
    assert.equal(await page.evaluate(()=>fossick.sluice.kind),'sluice','Powered upgrade stays owned but is not used in the reserve');
    assert.equal(await page.evaluate(()=>fossick.state.up.sluice),2);assert.equal(await page.evaluate(()=>fossick.targets.list.some(t=>t.kind==='gold')),false);
    await select('shovel','Digit2');await place();await page.waitForTimeout(400);await use(true);await page.waitForFunction(()=>fossick.state.bucket.length>=3);await use(false);
    assert.ok(await page.evaluate(()=>fossick.state.bucket.every(s=>s.classified)&&fossick.state.bucket.some(s=>s.gold>0)));
    await page.evaluate(()=>{const f=fossick,z=4,x=f.creek.cx(z);f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);});await select('pan','Digit3');await page.waitForTimeout(400);await use(true);await page.waitForTimeout(150);await use(false);await page.locator('#panning').waitFor({state:'visible'});await tap('#pan-load');
    if(phone){await page.waitForFunction(()=>fossick.state.panSession.time>2);assert.ok(await page.evaluate(()=>fossick.state.panSession.time>2));await tap('#pan-auto');}
    else {
      const box=await page.locator('#pan-canvas').boundingBox();
      await page.mouse.move(box.x+box.width*.4,box.y+box.height*.5);await page.mouse.down();
      for(let i=0;i<16;i++){await page.mouse.move(box.x+box.width*(i%2?.56:.44),box.y+box.height*.5,{steps:3});await page.waitForTimeout(100);}
      await page.mouse.up();assert.ok(await page.evaluate(()=>fossick.state.panSession.time>1));
    }
    await page.screenshot({path:out+'/'+(phone?'touch':'desktop')+'-pan.jpg',quality:90});await tap('#pan-close');
    const partial=(await stored()).claims.uralla.panSession;assert.ok(partial?.time>1);
    await map();await page.screenshot({path:out+'/'+(phone?'touch':'desktop')+'-map.jpg',quality:90});await tap('#map-close');
    const before=await stored();assert.ok(before.claims.uralla.digs.idx.length>0);
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick?.region==='uralla');
    assert.deepEqual(await page.evaluate(()=>fossick.state.panSession),partial);await tap('#play');
    await page.evaluate(()=>{const f=fossick,z=4,x=f.creek.cx(z);f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);});await select('sieve','Digit4');await page.locator('#jig').waitFor({state:'visible'});await use(true);await page.waitForTimeout(700);await use(false);
    assert.ok(await page.evaluate(()=>fossick.jig.I>0),'Actual Use agitates the original wet sieve');
    // Finish the existing sample after testing input, to exercise original collection.
    await page.evaluate(()=>{fossick.jig.strat=1;});const count=await page.evaluate(()=>fossick.state.bucket.length);
    if(phone)await tap('#touch [data-act="flip"]');else await page.keyboard.press('KeyF');
    await page.waitForFunction(n=>fossick.state.bucket.length===n-1,count);
    await travel('new-england');assert.equal(await page.evaluate(()=>fossick.state.camp.shelter),'shed');assert.deepEqual(await page.evaluate(()=>fossick.state.bucket),[{gold:.002}]);
    await tap('#play');await travel('uralla');assert.deepEqual(await page.evaluate(()=>fossick.state.panSession),partial);assert.equal((await stored()).cash,800);
    assert.deepEqual(errors,[]);report.push({phone,checks:'$0 travel, desktop boulder collision, actual dig/classify, real mouse pan / Easy animation, partial pan persistence, actual wet sieve jig/flip, topo, old NSW save, upgraded gear retained',errors});console.log('Uralla '+(phone?'touch':'desktop')+' gameplay passed');
  }catch(e){await page.screenshot({path:out+'/failure-'+(phone?'touch':'desktop')+'.png'});console.log(errors,await page.evaluate(()=>({region:fossick.region,prompt:document.getElementById('prompt').textContent,bucket:fossick.state.bucket,jig:fossick.jig})));throw e;}finally{await ctx.close();}
}}finally{await browser.close();await writeFile(out+'/checks.json',JSON.stringify(report,null,2));}
