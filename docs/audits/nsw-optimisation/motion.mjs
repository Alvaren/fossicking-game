// Ordinary mouse-lock and keyboard movement; relocation only chooses the start.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const label=process.argv[2]||'candidate',base=process.env.OPT_URL||('http://127.0.0.1:5191/'+(label==='baseline'?'baseline/':''));
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
const report={label,base,errors:[]};
try{
  const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
  await context.addInitScript(()=>{
    localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,activeRegion:'new-england',hour:11,difficulty:'realistic'}));
    localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'high',warned:true}));
  });
  const page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>fossick.newEngland.ready);await page.locator('#play').click();
  await page.waitForFunction(()=>document.pointerLockElement===document.getElementById('game'));await page.keyboard.press('Digit2');
  await page.evaluate(()=>{const f=fossick,z=24,x=f.creek.cx(z)-f.creek.halfWidth(z)-1.8;f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);f.player.yaw=Math.PI;f.player.pitch=-.15;});
  await page.waitForTimeout(1800);report.start=await page.evaluate(()=>fossick.player.pos.toArray());
  await page.evaluate(()=>{
    window.motionChunks=[];window.motionStream=document.getElementById('game').captureStream(30);
    window.motionRecorder=new MediaRecorder(motionStream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:3500000});
    motionRecorder.ondataavailable=e=>{if(e.data.size)motionChunks.push(e.data);};motionRecorder.start();
  });
  await page.keyboard.down('KeyW');await page.waitForTimeout(4500);await page.keyboard.up('KeyW');
  for(const dx of [120,240,360,480]){await page.mouse.move(640+dx,360,{steps:12});await page.waitForTimeout(450);}
  await page.mouse.wheel(0,120);await page.waitForFunction(()=>fossick.state.tool==='pan');await page.mouse.wheel(0,-120);await page.waitForFunction(()=>fossick.state.tool==='shovel');
  await page.keyboard.down('KeyS');await page.waitForTimeout(2500);await page.keyboard.up('KeyS');
  for(const x of [900,700,500,300]){await page.mouse.move(x,360,{steps:12});await page.waitForTimeout(450);}
  await page.waitForTimeout(1000);
  report.end=await page.evaluate(()=>fossick.player.pos.toArray());assert.ok(Math.hypot(report.end[0]-report.start[0],report.end[2]-report.start[2])>.25,'Normal walking moved the player');
  const encoded=await page.evaluate(async()=>{
    const done=new Promise(resolve=>{motionRecorder.onstop=resolve;});motionRecorder.stop();await done;motionStream.getTracks().forEach(t=>t.stop());
    const bytes=new Uint8Array(await new Blob(motionChunks).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);
  });
  await writeFile('docs/audits/nsw-optimisation/'+label+'-walk.webm',Buffer.from(encoded,'base64'));assert.deepEqual(report.errors,[]);
}finally{await browser.close();await writeFile('docs/audits/nsw-optimisation/'+label+'-walk.json',JSON.stringify(report,null,2)+'\n');}
