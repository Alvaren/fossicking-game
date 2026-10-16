import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),root='docs/audits/nsw-optimisation/';
const browser=await chromium.launch({headless:true,args:['--disable-gpu']});
try{for(const label of ['baseline','candidate']){
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.setContent('<video muted></video><canvas width="1280" height="720"></canvas>');
 await page.evaluate(async data=>{const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));window.video=document.querySelector('video');const ready=new Promise(r=>video.onloadeddata=r);video.src=URL.createObjectURL(new Blob([bytes],{type:'video/webm'}));await ready;},(await readFile(root+label+'-walk.webm')).toString('base64'));
 for(const t of [0.5,2,4,6,8,10,12]){
  const b64=await page.evaluate(async t=>{const seek=new Promise(r=>video.onseeked=r);video.currentTime=t;await seek;const canvas=document.querySelector('canvas');canvas.getContext('2d').drawImage(video,0,0);return canvas.toDataURL('image/jpeg',.92).split(',')[1];},t);
  await writeFile(root+label+'-walk-'+String(t).replace('.','_')+'.jpg',Buffer.from(b64,'base64'));
 }
 await page.close();console.log('Decoded movement samples',label);
}}finally{await browser.close();}
