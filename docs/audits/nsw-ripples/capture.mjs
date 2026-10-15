// Isolated saves and fixed seed/hour/camera/water time for ripple comparisons.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const label=process.argv[2]||'after',base=process.env.RIPPLE_URL||'http://127.0.0.1:5191/';
const out='docs/audits/nsw-ripples/'+label;await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
const report={base,label,seed:12345,sourceSha256:createHash('sha256').update(await readFile('src/newengland/water.js')).digest('hex'),cases:[]};
try {
  for(const mode of (process.env.RIPPLE_MODES||'high,low,touch').split(',')) {
    const touch=mode==='touch',preset=touch?'medium':mode;
    const context=await browser.newContext({viewport:touch?{width:844,height:390}:{width:1280,height:720},deviceScaleFactor:1,hasTouch:touch,isMobile:touch});
    await context.addInitScript(preset=>{
      if(!localStorage.getItem('ripple-fixture')) {
        localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,activeRegion:'new-england',hour:11,difficulty:'realistic',camp:{shelter:'swag'}}));
        localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset,warned:true}));
        localStorage.setItem('ripple-fixture','1');
      }
    },preset);
    const page=await context.newPage(),errors=[];page.setDefaultTimeout(60000);
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|too many errors/.test(m.text()))errors.push(m.text());});
    await page.goto(base+'?test'+(touch?'&touch':''),{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>fossick.newEngland.ready);
    await (touch?page.locator('#play').tap():page.locator('#play').click());
    if(touch)await page.locator('.slot[data-tool="shovel"]').tap();else await page.keyboard.press('Digit2');
    await page.evaluate(()=>{
      const f=fossick;
      f.scene.traverse(o=>{if(o.material?.userData.environment==='water')window.rippleSurface=o;});
      const original=f.daynight.update.bind(f.daynight);f.daynight.update=(_,p)=>{f.daynight.hour=11;original(0,p);};
    });
    const t0=await page.evaluate(()=>rippleSurface.material.uniforms.time.value);await page.waitForTimeout(500);
    assert.ok(await page.evaluate(t=>rippleSurface.material.uniforms.time.value>t,t0),'Original water clock advances');
    await page.evaluate(()=>{window.rippleTime=20;rippleSurface.onBeforeRender=()=>{rippleSurface.material.uniforms.time.value=rippleTime;};});
    const shots=[];
    for(const view of (process.env.RIPPLE_VIEWS||'upstream,rocks,bed').split(',')) {
      const pose=await page.evaluate(view=>{
        const f=fossick,c=f.creek,t=f.terrain;let z=24,x=c.cx(z)-c.halfWidth(z)-1.8,tx=c.cx(z),tz=z+14,pitch=-.15;
        if(view==='rocks') {const b=[...c.boulders].sort((a,b)=>Math.abs(a.z-20)-Math.abs(b.z-20))[0];z=b.z-3.5;x=c.cx(z)-c.halfWidth(z)-.5;tx=b.x;tz=b.z;pitch=-.3;}
        if(view==='bed') {z=12;x=c.cx(z)-c.halfWidth(z)-.6;tx=c.cx(z)+3;tz=z-3;pitch=-.75;}
        f.player.pos.set(x,t.getHeight(x,z),z);f.player.vel.set(0,0,0);f.player.yaw=Math.atan2(-(tx-x),-(tz-z));f.player.pitch=pitch;
        return {x,z,tx,tz,pitch};
      },view);
      await page.waitForTimeout(2400);await page.waitForFunction(()=>document.querySelector('#toasts').children.length===0);
      await page.evaluate(()=>{window.rippleTime=20;});await page.waitForTimeout(100);
      await page.screenshot({path:out+'/'+mode+'-'+view+'.jpg',quality:90});
      const evidence=await page.evaluate(()=>({clock:rippleSurface.material.uniforms.time.value,reflection:fossick.creekRendering.stats,shaderFailures:fossick.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length,tool:fossick.state.tool}));
      assert.equal(evidence.shaderFailures,0);assert.equal(evidence.tool,'shovel');
      if(view==='rocks') {await page.evaluate(()=>{window.rippleTime=20.5;});await page.waitForTimeout(100);await page.screenshot({path:out+'/'+mode+'-'+view+'-next.jpg',quality:90});}
      if(view==='rocks'&&mode==='high'&&label!=='before') {
        const video=await page.evaluate(async()=>{
          rippleSurface.onBeforeRender=()=>{};
          const stream=document.getElementById('game').captureStream(30),chunks=[];
          const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:3500000});
          const done=new Promise(resolve=>{recorder.onstop=resolve;});
          recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.start();
          await new Promise(resolve=>setTimeout(resolve,6500));recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());
          const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let binary='';
          for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
          rippleSurface.onBeforeRender=()=>{rippleSurface.material.uniforms.time.value=rippleTime;};
          return btoa(binary);
        });
        await writeFile(out+'/flow.webm',Buffer.from(video,'base64'));
      }
      shots.push({view,pose,...evidence});console.log(label,mode,view);
    }
    if(label!=='before') {
      // Exercise both water paths live through their existing menu, then save/reload.
      await page.keyboard.press('KeyP');await page.locator('#settings-btn').click();
      const row=page.locator('.set-row').filter({has:page.getByText('Water detail',{exact:true})});
      for(const choice of ['Simple','Full','Simple']) {
        await row.getByRole('button',{name:choice,exact:true}).click();
        await page.waitForFunction(full=>fossick.creekRendering.stats.active===full,choice==='Full');
      }
      await page.locator('#settings-close').click();
      await (touch?page.locator('#play').tap():page.locator('#play').click());
      if(touch)await page.locator('.slot[data-tool="pan"]').tap();else {await page.mouse.wheel(0,120);await page.waitForFunction(()=>fossick.state.tool==='pan');await page.keyboard.press('Digit2');}
      await page.keyboard.press('Control+s');
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')));
      await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>fossick.newEngland.ready);
      assert.equal(await page.evaluate(()=>fossick.state.cash),saved.cash);
      assert.equal(await page.evaluate(()=>fossick.region),'new-england');
    }
    assert.deepEqual(errors,[]);report.cases.push({mode,shots,errors});await context.close();
  }
} finally {await browser.close();await writeFile(out+'/checks.json',JSON.stringify(report,null,2)+'\n');}
