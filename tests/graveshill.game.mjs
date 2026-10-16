// Isolated saves; relocation skips walking only. Shovel, sieve and travel use actual input.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true});const report=[];
await mkdir('docs/audits/graves-hill/game',{recursive:true});
try{for(const phone of [false,true]){
 const ctx=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1280,height:720},hasTouch:phone,isMobile:phone});
 await ctx.addInitScript(phone=>{if(sessionStorage.fixture)return;sessionStorage.fixture='1';
  localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,cash:800,difficulty:phone?'easy':'realistic',up:{classifier:1,sieve:1,bucket:1},camp:{shelter:'shed'},bucket:[{gold:.002}]}));
  localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',warned:true}));
 },phone);
 const page=await ctx.newPage(),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('Ignored attempt to cancel a touchstart event'))errors.push(m.text());});
 const tap=s=>phone?page.locator(s).tap():page.locator(s).click();
 const client=phone?await ctx.newCDPSession(page):null;
 async function use(on){if(!phone)return page.mouse[on?'down':'up']();const b=await page.locator('#t-use').boundingBox();await client.send('Input.dispatchTouchEvent',{type:on?'touchStart':'touchEnd',touchPoints:on?[{x:b.x+b.width/2,y:b.y+b.height/2}]:[]});}
 async function select(tool,key){if(phone)await tap('.slot[data-tool="'+tool+'"]');else await page.keyboard.press(key);}
 async function map(){if(phone)await tap('#touch [data-act="map"]');else await page.keyboard.press('KeyM');await page.locator('#map').waitFor({state:'visible'});}
 async function travel(id){await map();await tap('#map-travel');await tap('.region-location-list [data-location="'+id+'"]');assert.match(await page.locator('#region-fee').textContent(),/\$0/);await tap('#region-depart');await page.waitForFunction(id=>window.fossick?.region===id,id);}
 const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')));
 try{
  await page.goto('http://127.0.0.1:5191/?test'+(phone?'&touch':''),{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await tap('#play');
  await travel('graves-hill');await page.evaluate(()=>fossick.regionalEnvironment.ready);assert.equal(await page.evaluate(()=>fossick.regionalEnvironment.stats.status),'ready');await tap('#play');
  assert.equal(await page.evaluate(()=>fossick.campStation.fieldTub!==null&&fossick.creek.dry&&!fossick.creekRendering),true);
  await select('shovel','Digit2');
  await page.evaluate(()=>{const f=fossick,x=12,z=54;f.player.pos.set(x,f.terrain.getHeight(x,z+1.2),z+1.2);f.player.vel.set(0,0,0);f.player.yaw=0;f.player.pitch=Math.atan2(f.terrain.getHeight(x,z)-(f.player.pos.y+1.65),1.2);});
  await page.waitForTimeout(250);await use(true);await page.waitForFunction(()=>fossick.state.bucket.length>=2);await use(false);
  assert.ok(await page.evaluate(()=>fossick.state.bucket.every(s=>s.gold===0&&s.classified)&&fossick.state.bucket.some(s=>s.sapphire>0)));
  await select('sieve','Digit4');await use(true);await page.waitForTimeout(600);await use(false);assert.equal(await page.evaluate(()=>fossick.jig.strat),0,'Dry diggings cannot wet-sieve');
  const count=await page.evaluate(()=>fossick.state.bucket.length);
  await page.evaluate(()=>{const f=fossick,t=f.campStation.fieldTub;f.player.pos.set(t.x,f.terrain.getHeight(t.x,t.z+1.7),t.z+1.7);f.player.vel.set(0,0,0);f.player.yaw=0;f.player.pitch=-.55;});
  await page.locator('#jig').waitFor({state:'visible'});
  if(phone){await use(true);await page.waitForFunction(()=>fossick.jig.strat>.35);assert.equal(await page.evaluate(()=>fossick.jig.lost),0);await use(false);}
  else{
   await use(true);await page.waitForFunction(()=>fossick.jig.lost>.15);await use(false);
   let held=false,best=0;const deadline=Date.now()+20000;
   while(Date.now()<deadline){const j=await page.evaluate(()=>({I:fossick.jig.I,strat:fossick.jig.strat,zone:fossick.jigZone()}));best=Math.max(best,j.strat);if(best>.1)break;const want=j.I<(j.zone[0]+j.zone[1])/2;if(want!==held){await use(want);held=want;}await page.waitForTimeout(50);}
   if(held)await use(false);assert.ok(best>.1,'Controlled real jig input settles wash');
  }
  await page.screenshot({path:'docs/audits/graves-hill/game/'+(phone?'touch':'desktop')+'-sieve.jpg',quality:90});
  // After validating actual jig input, accelerate finishing the same physical sample.
  await page.evaluate(()=>{fossick.jig.strat=1;});if(phone)await tap('#touch [data-act="flip"]');else await page.keyboard.press('KeyF');
  await page.waitForFunction(n=>fossick.state.bucket.length===n-1,count);
  await map();await page.screenshot({path:'docs/audits/graves-hill/game/'+(phone?'touch':'desktop')+'-map.jpg',quality:90});
  const stored=await save();assert.ok(stored.claims['graves-hill'].digs.idx.length>0);assert.equal(stored.cash,800);await tap('#map-close');
  await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick?.region==='graves-hill');assert.deepEqual(await page.evaluate(()=>fossick.state.bucket),stored.claims['graves-hill'].bucket);await tap('#play');
  await travel('qld-gemfields');assert.equal(await page.locator('#overlay h1').textContent(),'Billystone Wash');await tap('#play');await travel('graves-hill');
  assert.deepEqual(await page.evaluate(()=>fossick.state.bucket),stored.claims['graves-hill'].bucket);await tap('#play');await travel('new-england');assert.deepEqual(await page.evaluate(()=>fossick.state.bucket),[{gold:.002}]);assert.equal(await page.evaluate(()=>fossick.state.camp.shelter),'shed');
  assert.deepEqual(errors,[]);report.push({phone,checks:'actual dig/classification, dry rejection, manual over-jig and controlled settling / Easy assist, actual flip, topo, $0 travel, independent Billystone/NSW, reload',errors});console.log('Graves Hill '+(phone?'touch Easy':'desktop Realistic')+' passed');
 }catch(e){await page.screenshot({path:'node_modules/.cache/graves-failure.png'});console.log(errors,await page.evaluate(()=>({region:fossick.region,jig:fossick.jig,bucket:fossick.state.bucket.length,prompt:document.getElementById('prompt').textContent})));throw e;}finally{await ctx.close();}
}}finally{await browser.close();await writeFile('docs/audits/graves-hill/game/checks.json',JSON.stringify(report,null,2));}
