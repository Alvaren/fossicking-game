// Same rAF CPU and disjoint GPU timing method as the NSW optimisation audit.
// A 120-second High walk/view sweep follows a 20-second shader/LOD warm-up.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),out='docs/audits/tasmania-ne';
const save=JSON.parse(await readFile(out+'/before/world.json','utf8')).save;
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist','--enable-precise-memory-info']});
try {
  const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  await context.addInitScript(save=>{localStorage.setItem('fossicking-save-v2',JSON.stringify(save));localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'high',res:1,warned:true}));},save);
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:5191/?test',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossickTas);await page.evaluate(()=>fossickTas.world.environment.ready);await page.locator('#tas-resume').click();
  const hardware=await page.evaluate(()=>{const gl=fossickTas.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),browser:navigator.userAgent,cores:navigator.hardwareConcurrency,viewport:[innerWidth,innerHeight],buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight]};});
  await page.evaluate(()=>{
    const f=fossickTas,r=f.renderer,gl=r.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),raf=requestAnimationFrame.bind(window),start=performance.now(),pending=[];
    let last=0,n=0;window.profile={frames:[],gpu:[],memory:[],timer:!!ext};
    const views=[['bend',62,-1,1.8,18],['terrace',-8,-1,3,15],['upstream',-82,-1,2,18],['camp',62,-1,18,12],['track',100,-1,27,-20],['forest',-30,-1,25,-4]];
    window.requestAnimationFrame=callback=>raf(timestamp=>{
      const age=(performance.now()-start)/1000,at=Math.max(0,age-20),segment=age<20?Math.floor(age/3.34):Math.min(5,Math.floor(at/20)),[site,z,side,offset,ahead]=views[segment];
      const p=f.profile,x=p.riverX(z)+side*(p.riverWidth(z)+offset),wobble=Math.sin(at*.2);
      Object.assign(f.player,{x:x+wobble*.3,z,yaw:Math.atan2(-(p.riverX(z+ahead)-x),-ahead)+wobble*.1,pitch:site==='forest'?-.03:-.12});f.expedition.hour=11;f.world.atmosphere.override=0;
      r.info.autoReset=false;r.info.reset();
      for(let i=pending.length-1;i>=0;i--){const {q,site}=pending[i];if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){if(!gl.getParameter(ext.GPU_DISJOINT_EXT))profile.gpu.push({site,ms:gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6});gl.deleteQuery(q);pending.splice(i,1);}}
      let query;if(ext&&n%30===0&&pending.length<8&&age>20){query=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,query);}
      const before=performance.now();callback(timestamp);const cpu=performance.now()-before;
      if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push({q:query,site});}
      if(age>20&&last)profile.frames.push({site,dt:timestamp-last,cpu,calls:r.info.render.calls,triangles:r.info.render.triangles});
      if(n++%600===0)profile.memory.push({age,heap:performance.memory?.usedJSHeapSize,geometries:r.info.memory.geometries,textures:r.info.memory.textures});last=timestamp;
    });
  });
  for(let t=0;t<140;t+=20){await page.waitForTimeout(20000);console.log('Profile '+(t+20)+'/140 seconds');}
  const data=await page.evaluate(()=>profile);assert.deepEqual(errors,[]);
  const distribution=a=>{a.sort((x,y)=>x-y);return Object.fromEntries([['median',.5],['p95',.95],['p99',.99]].map(([key,p])=>[key,a[Math.floor((a.length-1)*p)]]));};
  const metrics=a=>({frames:a.length,frameMs:distribution(a.map(f=>f.dt)),cpuSubmissionMs:distribution(a.map(f=>f.cpu)),drawCalls:distribution(a.map(f=>f.calls)),trianglesAcrossAllPasses:distribution(a.map(f=>f.triangles)),over33ms:a.filter(f=>f.dt>33.5).length});
  const result={hardware,warmupSeconds:20,measuredSeconds:120,preset:'High',...metrics(data.frames),gpuMs:distribution(data.gpu.map(g=>g.ms)),gpuSamples:data.gpu.length,memory:data.memory,errors,sites:{}};
  for(const site of new Set(data.frames.map(f=>f.site)))result.sites[site]={...metrics(data.frames.filter(f=>f.site===site)),gpuMs:distribution(data.gpu.filter(g=>g.site===site).map(g=>g.ms))};
  await writeFile(out+'/performance.json',JSON.stringify(result,null,2)+'\n');await writeFile(out+'/performance-samples.json.gz',gzipSync(JSON.stringify(data)));console.log(JSON.stringify({frame:result.frameMs,cpu:result.cpuSubmissionMs,gpu:result.gpuMs,drawCalls:result.drawCalls}));
} finally {await browser.close();}
