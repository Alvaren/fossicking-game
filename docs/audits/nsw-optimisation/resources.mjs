// Resource stability and loading at production settings, with disposable saves.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const label=process.argv[2]||'candidate',base=process.env.OPT_URL||('http://127.0.0.1:5191/'+(label==='baseline'?'baseline/':''));
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist','--enable-precise-memory-info']});
const report={label,base,loads:[],cycles:[],newPrograms:[],errors:[]};
try{
  const context=await browser.newContext({viewport:{width:1280,height:720}});
  await context.addInitScript(()=>{
    if(sessionStorage.getItem('resource-fixture'))return;sessionStorage.setItem('resource-fixture','1');
    localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,activeRegion:'new-england',hour:11,difficulty:'realistic',cash:321,gold:.25,camp:{shelter:'shed'}}));
    localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'high',warned:true}));
  });
  const page=await context.newPage();page.setDefaultTimeout(90000);
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|too many errors/.test(m.text()))report.errors.push(m.text());});
  const cdp=await context.newCDPSession(page);
  for(let i=0;i<3;i++){
    const start=Date.now();if(i)await page.reload({waitUntil:'domcontentloaded'});else await page.goto(base+'?test',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>fossick.newEngland.ready);
    const readyMs=Date.now()-start;await page.waitForTimeout(1200);
    report.loads.push({kind:i===0?'cold':i===1?'cached-reload':'cached-repeat',readyMs,...await page.evaluate(()=>({
      resources:performance.getEntriesByType('resource').map(e=>({name:new URL(e.name).pathname,transfer:e.transferSize,encoded:e.encodedBodySize,decoded:e.decodedBodySize,ms:e.duration})),
      sw:!!navigator.serviceWorker.controller,renderer:{...fossick.renderer.info.memory},programs:fossick.renderer.info.programs.length,
    }))});
  }
  await page.locator('#play').click();await page.keyboard.press('Digit2');
  await page.evaluate(()=>{const f=fossick,z=24,x=f.creek.cx(z)-f.creek.halfWidth(z)-1.8;f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);f.player.yaw=Math.atan2(-(f.creek.cx(z)-x),-14);f.player.pitch=-.15;});
  await page.waitForTimeout(1000);await page.keyboard.press('KeyP');await page.locator('#settings-btn').click();
  const seenPrograms=new Set();
  for(let cycle=0;cycle<14;cycle++){
    for(const name of ['Low','Medium','High','Ultra','High']){
      await page.locator('#set-presets').getByRole('button',{name,exact:true}).click();
      await page.setViewportSize(name==='Medium'?{width:390,height:844}:{width:1280,height:720});
      await page.waitForTimeout(400);
      const v=await page.evaluate(()=>({quality:fossick.newEngland.stats.quality,water:{...fossick.creekRendering.stats},programs:fossick.renderer.info.programs.length,failures:fossick.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length}));
      assert.equal(v.failures,0);if(name==='High')assert.ok(v.water.width<=768&&v.water.height<=768);
    }
    await cdp.send('HeapProfiler.collectGarbage');await page.waitForTimeout(250);
    report.cycles.push({cycle,...await page.evaluate(()=>({heap:performance.memory.usedJSHeapSize,renderer:{...fossick.renderer.info.memory},programs:fossick.renderer.info.programs.length}))});
    const programs=await page.evaluate(()=>fossick.renderer.info.programs.map(p=>({id:p.id,name:p.name,type:p.type,cacheKey:p.cacheKey})));
    const added=programs.filter(p=>!seenPrograms.has(p.id));for(const p of programs)seenPrograms.add(p.id);
    report.newPrograms.push({cycle,added});
    console.log(label,'resource cycle',cycle,report.cycles.at(-1),'new',added.map(p=>({id:p.id,name:p.name})));
  }
  // Allow lazy shader variants to initialise, then require a five-cycle plateau.
  const stable=report.cycles.slice(-5),last=stable.at(-1),first=stable[0];
  assert.ok(stable.every(c=>c.programs===first.programs),'The final five complete preset cycles reuse the same shader set');
  assert.equal(last.renderer.textures,first.renderer.textures,'Repeated water/shadow resizing retains a bounded texture count');
  assert.equal(last.renderer.geometries,first.renderer.geometries,'Preset cycling does not accumulate geometry');
  assert.equal(last.programs,first.programs,'Preset cycling reuses compiled shader programs');
  assert.ok(last.heap<first.heap*1.15+5e6,'Post-GC heap remains bounded after warm-up');
  await page.locator('#settings-close').click();await page.locator('#play').click();await page.keyboard.press('Control+s');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')));
  await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>fossick.newEngland.ready);
  assert.equal(await page.evaluate(()=>fossick.state.cash),saved.cash);assert.equal(await page.evaluate(()=>fossick.state.gold),saved.gold);
  assert.deepEqual(report.errors,[]);
}finally{await browser.close();await writeFile('docs/audits/nsw-optimisation/'+label+'-resources.json',JSON.stringify(report,null,2)+'\n');}
