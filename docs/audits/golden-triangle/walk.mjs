// Player-height movement and canopy evidence; separate from timed profiling.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root='docs/audits/golden-triangle/movement';await mkdir(root,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
const report=[];
try{for(const region of ['new-england','golden-triangle']) {
  const context=await browser.newContext({viewport:{width:1280,height:720}});
  await context.addInitScript(region=>{
    localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,activeRegion:region,claims:region==='new-england'?{}:{[region]:{seed:12345}},hour:11}));
    localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'high',warned:true}));
  },region);
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID/.test(m.text()))errors.push(m.text());});
  await page.goto('http://127.0.0.1:5191/?test',{waitUntil:'networkidle'});await page.evaluate(()=>fossick.regionalEnvironment.ready);await page.locator('#play').click();await page.keyboard.press('Digit3');
  const stats=await page.evaluate(()=>{
    const f=fossick,z=14,x=f.creek.cx(z)-f.creek.halfWidth(z)-5;
    f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);f.player.yaw=0;f.player.pitch=.12;
    const heights=[];
    for(const b of f.world.lod.batches.filter(b=>b.source.userData.tree)) {
      b.near.geometry.computeBoundingBox();const height=b.near.geometry.boundingBox.max.y-b.near.geometry.boundingBox.min.y;
      for(let i=0;i<b.source.count;i++) {
        const a=b.source.instanceMatrix.array,k=i*16;
        const scale=Math.hypot(a[k+4],a[k+5],a[k+6]);if(scale>0)heights.push(height*scale);
      }
    }
    heights.sort((a,b)=>a-b);
    const stream=document.getElementById('game').captureStream(30),chunks=[];
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:2800000});
    window.recording={stream,chunks,recorder};recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.start();
    return {start:[x,z],trees:heights.length,heightMetres:{min:heights[0],median:heights[Math.floor(heights.length*.5)],max:heights.at(-1)}};
  });
  await page.keyboard.down('KeyW');
  for(let i=0;i<4;i++){await page.waitForTimeout(1700);await page.screenshot({path:root+'/'+region+'-'+i+'.jpg',quality:90});}
  await page.keyboard.up('KeyW');
  const result=await page.evaluate(async()=>{
    const {recorder,chunks,stream}=recording,done=new Promise(r=>recorder.onstop=r);recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());
    const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let binary='';
    for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
    return {video:btoa(binary),end:[fossick.player.pos.x,fossick.player.pos.z],shaderFailures:fossick.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length};
  });
  const distance=Math.hypot(result.end[0]-stats.start[0],result.end[1]-stats.start[1]);assert.ok(distance>2,'Walking through the upgraded scene uses the original controller');
  assert.equal(result.shaderFailures,0);assert.deepEqual(errors,[]);
  await writeFile(root+'/'+region+'.webm',Buffer.from(result.video,'base64'));
  report.push({region,...stats,end:result.end,distance,errors});console.log(region,JSON.stringify(report.at(-1)));await context.close();
}}finally{await browser.close();await writeFile(root+'/checks.json',JSON.stringify(report,null,2)+'\n');}
