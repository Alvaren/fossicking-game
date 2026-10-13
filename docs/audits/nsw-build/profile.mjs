// Physical desktop GPU evidence. Run with no other graphics tests running.
// The camera-route benchmark is explicitly separate from the real-input clip.
import {createRequire} from 'node:module';
import {writeFile,rename,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=resolve('docs/audits/nsw-build');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist','--enable-precise-memory-info']});
const report={date:'2026-10-13',method:'1920×1080 Chromium/D3D11, High, real desktop GPU. Ten-minute scripted camera route; first 15 seconds warm-up excluded. Separate clip uses normal pointer lock and keyboard/mouse input. Desktop headless results are not phone results.'};
const quantile=(list,p)=>{const a=[...list].sort((a,b)=>a-b);return a[Math.min(a.length-1,Math.floor(a.length*p))];};
async function open(video=false) {
  const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,...(video?{recordVideo:{dir:output,size:{width:1280,height:720}}}:{})});
  await context.addInitScript(()=>{
    localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,activeRegion:'new-england',hour:11,difficulty:'realistic'}));
    localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'high',res:1.5,shadows:'high',aa:true,gems:'full',reflections:'live',environment:'high',water:'scene',warned:true}));
    window.lockDelivered=false;document.addEventListener('pointerlockchange',()=>{lockDelivered=document.pointerLockElement?.id==='game';});
  });
  const page=await context.newPage();page.setDefaultTimeout(90000);const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|too many errors/.test(m.text()))errors.push(m.text());});
  await page.goto('http://127.0.0.1:5191/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>fossick.newEngland.ready);
  await page.locator('#play').click();await page.waitForFunction(()=>window.lockDelivered);
  await page.keyboard.press('Digit2');
  await page.evaluate(()=>{const f=fossick,z=6,x=f.creek.cx(z)-f.creek.halfWidth(z)-2;f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);f.player.yaw=Math.PI;f.player.pitch=-.17;});
  return {context,page,errors};
}
try {
  if(!process.env.NSW_PROFILE_ONLY) {
    const {context,page,errors}=await open(true),path=[];
    for(const [key,ms] of [['KeyW',6500],['KeyA',8000],['',3500],['KeyS',6500],['KeyD',8000],['',4000],['KeyW',6500]]) {
      if(key)await page.keyboard.down(key);
      await page.waitForTimeout(ms);
      if(key)await page.keyboard.up(key);
      if(!key){await page.mouse.move(940,520);await page.mouse.move(1110,545,{steps:25});}
      path.push(await page.evaluate(()=>{const f=fossick,p=f.player.pos,l=f.creek.local(p.x,p.z,{});return {x:p.x,z:p.z,yaw:f.player.yaw,tool:f.state.tool,bankOffset:l.nIn,halfWidth:l.w};}));
    }
    await page.screenshot({path:output+'/high-1080-walk.jpg',type:'jpeg',quality:90});
    const video=page.video();await context.close();const videoPath=await video.path();
    if(!resolve(videoPath).startsWith(output))throw new Error('Video escaped evidence directory');
    await rename(videoPath,output+'/walkthrough.webm');report.walk={inputSeconds:43,method:'One initial placement, then original normal-URL pointer lock, held WASD and mouse events. Video also contains loading/title time. No photo filters.',path,errors};
    console.log('Ordinary-input clip complete.');
  }
  const {context,page,errors}=await open();
  report.hardware=await page.evaluate(()=>{const gl=fossick.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {gpu:gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),browser:navigator.userAgent,cores:navigator.hardwareConcurrency,viewport:[innerWidth,innerHeight],buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight]};});
  await page.evaluate(()=>{
    const f=fossick,r=f.renderer,gl=r.getContext(),timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const original=requestAnimationFrame.bind(window),start=performance.now(),pending=[];
    let last=0,n=0;
    window.nswProfile={frames:[],gpu:[],memory:[],start};
    window.requestAnimationFrame=callback=>original(timestamp=>{
      if(callback.name!=='frame'){callback(timestamp);return;}
      const age=(performance.now()-start)/1000,z=14+11*Math.sin(age*.065),x=f.creek.cx(z)-f.creek.halfWidth(z)-2.2;
      f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);f.player.yaw=Math.PI-.5*Math.sin(age*.11);f.player.pitch=-.22;f.daynight.hour=11;
      r.info.autoReset=false;r.info.reset();
      for(let i=pending.length-1;i>=0;i--) {
        const q=pending[i];
        if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)) {
          if(!gl.getParameter(timer.GPU_DISJOINT_EXT))nswProfile.gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);
          gl.deleteQuery(q);pending.splice(i,1);
        }
      }
      let q;if(timer&&n%30===0&&pending.length<8&&age>15){q=gl.createQuery();gl.beginQuery(timer.TIME_ELAPSED_EXT,q);}
      const before=performance.now();callback(timestamp);const cpu=performance.now()-before;
      if(q){gl.endQuery(timer.TIME_ELAPSED_EXT);pending.push(q);}
      if(age>15&&last)nswProfile.frames.push({dt:timestamp-last,cpu,calls:r.info.render.calls,triangles:r.info.render.triangles});
      if(n++%600===0)nswProfile.memory.push({age,heap:performance.memory?.usedJSHeapSize,geometries:r.info.memory.geometries,textures:r.info.memory.textures});
      last=timestamp;
    });
  });
  const seconds=Number(process.env.NSW_PROFILE_SECONDS||615);
  for(let elapsed=0;elapsed<seconds;elapsed+=30){await page.waitForTimeout(Math.min(30,seconds-elapsed)*1000);console.log(`Desktop profile ${Math.min(elapsed+30,seconds)}/${seconds}s`);}
  const data=await page.evaluate(()=>nswProfile),frames=data.frames;
  report.profile={warmupSeconds:15,measuredSeconds:seconds-15,frames:frames.length,
    frameMs:{median:quantile(frames.map(f=>f.dt),.5),p95:quantile(frames.map(f=>f.dt),.95)},
    cpuMs:{median:quantile(frames.map(f=>f.cpu),.5),p95:quantile(frames.map(f=>f.cpu),.95)},
    gpuMs:data.gpu.length?{median:quantile(data.gpu,.5),p95:quantile(data.gpu,.95),samples:data.gpu.length}:null,
    fullFrame:{medianCalls:quantile(frames.map(f=>f.calls),.5),medianTriangles:quantile(frames.map(f=>f.triangles),.5)},memory:data.memory,errors};
  await context.close();
}finally{await browser.close();await writeFile(output+'/performance.json',JSON.stringify(report,null,2)+'\n');}
