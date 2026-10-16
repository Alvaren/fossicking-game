// Compare untouched destinations to the pre-correction published build, then
// carry a real old Uralla save through the local geometry change and reload.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { createPan } from '../src/panning.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const oldURL=process.env.URALLA_BASELINE||'https://alvaren.github.io/fossicking-game/',nextURL='http://127.0.0.1:5191/';
const out='docs/audits/uralla-river';await mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true}),report={worlds:[],migration:null};
const load=async(url,save)=>{
 const context=await browser.newContext({viewport:{width:1280,height:720},serviceWorkers:'block'});
 await context.addInitScript(save=>{if(sessionStorage.fixture)return;sessionStorage.fixture='1';localStorage.setItem('fossicking-save-v2',JSON.stringify(save));localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',warned:true}));},save);
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'?test',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>fossick.regionalEnvironment.ready);return{context,page,errors};
};
const snapshot=()=>{
 const f=fossick,t=f.terrain;
 const hash=a=>{let h=2166136261;for(const n of new Uint8Array(a.buffer,a.byteOffset,a.byteLength)){h^=n;h=Math.imul(h,16777619);}return h>>>0;};
 return{orig:hash(t.orig),bedrock:hash(t.bedrock),topsoil:hash(t.topsoil),sources:t.sources,colliders:f.world.colliders,
 rocks:hash(f.scene.getObjectByName('Geological scenery rocks').instanceMatrix.array),bedload:f.bedload.snapshot(),targets:f.targets.list.map(p=>[p.id,p.x,p.z]),finds:f.finds.items.map(p=>[p.id,p.x,p.z]),camp:t.camp};
};
try {
 for(const region of ['new-england','golden-triangle']) {
  const fixture={seed:12345,activeRegion:region,claims:region==='new-england'?{}:{[region]:{seed:12345}}};
  const old=await load(oldURL,fixture),a=await old.page.evaluate(snapshot);assert.deepEqual(old.errors,[]);await old.context.close();
  const next=await load(nextURL,fixture),b=await next.page.evaluate(snapshot);assert.deepEqual(next.errors,[]);await next.context.close();
  assert.deepEqual(b,a,'Original terrain, geology, sources, rocks, collisions, mobile bedload and find placement must remain identical');
  report.worlds.push({region,identical:true,orig:a.orig,bedrock:a.bedrock,rocks:a.rocks});console.log(region,'matches published pre-correction world');
 }
 const pan=createPan({contents:{gold:.003,picker:0,finds:[]}});pan.time=23;pan.strat=.6;
 const old=await load(oldURL,{seed:12345,activeRegion:'uralla',cash:800,gold:.12,up:{pan:2,sluice:1},camp:{shelter:'caravan'},bucket:[{gold:.002}],claims:{uralla:{seed:12345,camp:{shelter:'shed',built:{tub:true,rack:true}},panSession:pan,bucket:[{gold:.004,classified:true}]}}});
 await old.page.locator('#play').click();
 await old.page.evaluate(()=>{const f=fossick;f.terrain.dig(-31,31,1.1,.22);const p={x:f.creek.cx(4),z:4};f.sluice.place(f.sluice.evaluate(p.x,p.z));f.sluice.loads=2;f.sluice.cons={gold:.001,blackSand:.3};});
 await old.page.keyboard.press('Control+s');const saved=await old.page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')));assert.ok(saved.claims.uralla.digs.idx.length);assert.deepEqual(old.errors,[]);await old.context.close();
 await writeFile(out+'/legacy-save.json',JSON.stringify(saved));
 const next=await load(nextURL,saved);
 const restored=await next.page.evaluate(()=>({camp:fossick.state.camp,pan:fossick.state.panSession,bucket:fossick.state.bucket,cash:fossick.state.cash,gold:fossick.state.gold,sluice:fossick.sluice.snapshot(),player:{x:fossick.player.pos.x,z:fossick.player.pos.z},course:!!fossick.creek.course}));
 const prior=saved.claims.uralla;assert.equal(restored.course,true);
 for(const key of ['camp','bucket'])assert.deepEqual(restored[key],prior[key]);assert.deepEqual(restored.pan,prior.panSession);
 assert.equal(restored.cash,saved.cash);assert.equal(restored.gold,saved.gold);assert.deepEqual(restored.sluice.cons,prior.sluice.cons);assert.equal(restored.sluice.loads,2);
 await next.page.locator('#play').click();await next.page.keyboard.press('Control+s');
 const migrated=await next.page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')));
 assert.deepEqual(migrated.claims.uralla.digs,prior.digs);assert.equal(migrated.claims.uralla.layoutVersion,2);assert.deepEqual(migrated.camp,saved.camp);assert.deepEqual(migrated.bucket,saved.bucket);
 await next.page.evaluate(()=>{const f=fossick,x=f.terrain.camp.x-11,z=f.terrain.camp.z+10;f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);});
 await next.page.keyboard.press('Control+s');const pos=await next.page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')).claims.uralla.player);
 await next.page.reload({waitUntil:'networkidle'});await next.page.waitForFunction(()=>window.fossick);
 const reloaded=await next.page.evaluate(()=>({x:fossick.player.pos.x,z:fossick.player.pos.z}));assert.equal(reloaded.x,pos.x);assert.equal(reloaded.z,pos.z);assert.deepEqual(next.errors,[]);
 report.migration={packedDigsUnchanged:true,panAndBucketUnchanged:true,sluiceConcentrateUnchanged:true,campAndFundsUnchanged:true,inactiveHomeUnchanged:true,safeInitialPlayer:restored.player,reloadDoesNotReposition:true,errors:next.errors};
 await next.context.close();console.log('Actual pre-correction Uralla save migrated with ground/material/camp intact, then reloaded without relocating again');
} finally {await browser.close();await writeFile(out+'/regression-migration.json',JSON.stringify(report,null,2)+'\n');}
