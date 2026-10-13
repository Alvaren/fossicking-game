// Asset/quality transitions must leave the actual game world byte-for-byte
// unchanged. Disposable contexts only; this never touches a user's save.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true});
const report={date:'2026-10-13',cases:[]};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const snapshot=()=>{
  const f=fossick,t=f.terrain;
  const digest=a=>{let h=2166136261;for(const v of new Uint8Array(a.buffer,a.byteOffset,a.byteLength)){h^=v;h=Math.imul(h,16777619);}return h>>>0;};
  return {seed:f.state.seed,sources:t.sources,heights:digest(t.heights),orig:digest(t.orig),bedrock:digest(t.bedrock),
    sourcesMatrices:f.scene.children.filter(o=>o.isInstancedMesh&&o.userData.lodSource||['Geological scenery rocks','Granite tors'].includes(o.name)).map(o=>({name:o.name,count:o.count,matrix:digest(o.instanceMatrix.array)})),
    colliders:f.world.colliders.map(({x,z,r})=>({x,z,r})),finds:f.finds.items.map(o=>[o.id,o.x,o.z]),
    boulders:f.boulders.list.map(({id,kind,x,z,r,seed,vug})=>({id,kind,x,z,r,seed,vug})),targets:f.targets.list.map(o=>[o.id,o.x,o.z]),
    camp:f.state.camp,savedDigs:t.digSnapshot(),veins:f.field.veins};
};
try {
  for(const seed of [1,12345,798887]) {
    const context=await browser.newContext({viewport:{width:1280,height:720}});
    await context.addInitScript(seed=>{
      if(!sessionStorage.getItem('nsw-fixture')) {
        localStorage.setItem('fossicking-save-v2',JSON.stringify({seed,activeRegion:'new-england',hour:11,cash:2600,difficulty:'realistic',camp:{shelter:'shed'}}));
        localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',res:.75,shadows:'off',aa:false,gems:'simple',reflections:'static',warned:true}));
        sessionStorage.setItem('nsw-fixture','1');
      }
    },seed);
    const page=await context.newPage(),errors=[];page.setDefaultTimeout(90000);
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|too many errors/.test(m.text()))errors.push(m.text());});
    let release;const gate=new Promise(r=>release=r);
    await page.route('**/models/newengland/environment.glb',async route=>{await gate;await route.continue();});
    await page.goto('http://127.0.0.1:5191/?test',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.fossick);
    const before=hash(await page.evaluate(snapshot));release();
    await page.evaluate(()=>fossick.newEngland.ready);
    assert.equal(await page.evaluate(()=>fossick.newEngland.stats.status),'ready');
    assert.equal(hash(await page.evaluate(snapshot)),before,'Loading the art preserves terrain, sources, finds, targets, collisions and camp');
    await page.locator('#settings-btn').click();
    const quality=[];
    for(const level of ['low','medium','high','low']) {
      await page.locator('.set-row').filter({has:page.getByText('Environment detail',{exact:true})}).getByRole('button',{name:level[0].toUpperCase()+level.slice(1),exact:true}).click();
      const stats=await page.evaluate(()=>{
        const f=fossick,z=24,x=f.creek.cx(z)-f.creek.halfWidth(z)-2;
        f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);
        f.world.lod.update(1,f.player.pos,true);f.newEngland.update(1,0,f.player.pos);
        return {...f.newEngland.stats,triangles:f.world.lod.stats.drawnTriangles};
      });
      assert.equal(hash(await page.evaluate(snapshot)),before,'Live quality never changes physical/saved data');
      quality.push(stats);
    }
    assert.ok(quality[2].visible>quality[0].visible,'High retains more small scenery');
    assert.ok(quality[2].triangles>quality[0].triangles,'High retains more foliage geometry');
    if(seed===12345) {
      await page.locator('.set-row').filter({has:page.getByText('Shadows',{exact:true})}).getByRole('button',{name:'High',exact:true}).click();
      await page.locator('.set-row').filter({has:page.getByText('Water detail',{exact:true})}).getByRole('button',{name:'Full',exact:true}).click();
      await page.waitForFunction(()=>fossick.creekRendering.stats.active&&fossick.creekRendering.stats.passes===2);
      await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
      const targets=await page.evaluate(()=>fossick.creekRendering.stats);
      assert.ok(targets.width<=768&&targets.height<=768,'Water render targets stay bounded in portrait');
      await page.setViewportSize({width:1280,height:720});
    }
    await page.locator('#settings-close').click();await page.locator('#play').click();
    await page.mouse.move(640,390);
    await page.evaluate(()=>{fossick.player.yaw=0;});
    await page.waitForFunction(()=>fossick.player.grounded);
    // Work through the original kneeling/trowel handlers, preserving the patch.
    await page.keyboard.press('KeyC');
    await page.waitForFunction(()=>!!fossick.excav.active);
    const descriptor=await page.evaluate(()=>{
      const p=fossick.excav.active;
      return {name:p.mesh.material.name,surface:p.geo.attributes.aSurface.count,vertices:p.geo.attributes.position.count,cut:p.geo.attributes.aCut.count};
    });
    assert.equal(descriptor.surface,descriptor.vertices);assert.equal(descriptor.cut,descriptor.vertices);
    await page.keyboard.press('Digit2');
    await page.waitForFunction(()=>fossick.view.current==='trowel'&&fossick.view.swap>.9);
    await page.mouse.down();
    try { await page.waitForFunction(()=>Array.from(fossick.excav.active.snapshot().mm).some(v=>v>0),null,{timeout:5000}); }
    finally { await page.mouse.up(); }
    const worked=await page.evaluate(()=>Array.from(fossick.excav.active.snapshot().mm));
    assert.ok(worked.some(v=>v>0),'Real held-use trowel input removes soil');
    await page.keyboard.press('Control+s');await page.waitForTimeout(150);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')));
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>fossick.newEngland.ready);
    const restored=await page.evaluate(()=>fossick.excav.patches.map(p=>Array.from(p.snapshot().mm)));
    assert.ok(restored.some(mm=>JSON.stringify(mm)===JSON.stringify(worked)),'Worked patch survives the existing save/reload path');
    assert.equal(await page.evaluate(()=>fossick.state.cash),saved.cash);
    assert.deepEqual(errors,[]);
    report.cases.push({seed,worldHash:before,quality,patch:descriptor,errors});
    console.log(`Seed ${seed}: art and live quality preserve the world; real trowel/save/reload passed.`);
    await context.close();
  }
  for(const failure of ['missing','corrupt']) {
    const context=await browser.newContext();
    await context.addInitScript(()=>{
      localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,activeRegion:'new-england'}));
      localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',res:.75,shadows:'off',aa:false,gems:'simple',reflections:'static',warned:true}));
    });
    const page=await context.newPage();page.setDefaultTimeout(90000);
    await page.route('**/models/newengland/environment.glb',r=>failure==='missing'?r.abort():r.fulfill({status:200,contentType:'model/gltf-binary',body:'invalid environment data'}));
    await page.goto('http://127.0.0.1:5191/?test',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>fossick.newEngland.ready);
    const fallback=await page.evaluate(()=>({status:fossick.newEngland.stats.status,rocks:fossick.scene.getObjectByName('Geological scenery rocks').visible,
      tors:fossick.scene.getObjectByName('Granite tors').visible,trees:fossick.world.lod.batches.filter(b=>b.source.userData.tree).every(b=>b.near.geometry===b.source.geometry)}));
    assert.deepEqual(fallback,{status:'fallback',rocks:true,tors:true,trees:true});
    await page.locator('#play').click();await page.keyboard.press('Digit3');
    await page.waitForFunction(()=>fossick.view.current==='pan'&&fossick.view.swap>.9);
    assert.equal(await page.evaluate(()=>fossick.state.tool),'pan');
    report.cases.push({failure,fallback});console.log(`${failure} kit: original scenery and tool use retained.`);
    await context.close();
  }
} finally {await browser.close();await writeFile((process.env.NSW_AUDIT_DIR || 'docs/audits/nsw-build')+'/regression.json',JSON.stringify(report,null,2)+'\n');}
