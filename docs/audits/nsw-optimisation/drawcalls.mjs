import {gzipSync} from 'node:zlib';
import {createRequire} from 'node:module';import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
const report=[];
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}});page.setDefaultTimeout(90000);
 await page.addInitScript(()=>{localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,activeRegion:'new-england',hour:11,camp:{shelter:'shed',built:{rack:true,kit:true,tub:true,water:true,generator:true,lights:true,lapidary:true,display:true,kelpie:true},water:80,generatorFuel:2,generatorOn:true}}));localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'high',warned:true}));});
 await page.goto('http://127.0.0.1:5191/?test',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>fossick.newEngland.ready);await page.locator('#play').click();
 for(const site of ['creek','camp','woodland']){
  await page.evaluate(site=>{const f=fossick;let z=24,x=f.creek.cx(z)-f.creek.halfWidth(z)-1.8,tx=f.creek.cx(z),tz=z+14;if(site==='camp'){x=f.terrain.camp.x+12;z=f.terrain.camp.z+12;tx=f.terrain.camp.x;tz=f.terrain.camp.z;}if(site==='woodland'){x=f.terrain.camp.x+20;z=22;tx=x+14;tz=z+20;}f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.yaw=Math.atan2(-(tx-x),-(tz-z));f.player.pitch=-.15;f.daynight.hour=11;},site);
  await page.waitForTimeout(1500);
  const calls=await page.evaluate(()=>new Promise(resolve=>{
    const r=fossick.renderer,original=requestAnimationFrame.bind(window),draw=r.renderBufferDirect.bind(r);let armed=false,rows=[];
    r.renderBufferDirect=(camera,scene,g,m,o,group)=>{
      if(armed&&g.drawRange.count!==0){const parents=[];for(let p=o;p&&p!==scene;p=p.parent)parents.unshift((p.name||p.type)+'#'+p.id);rows.push({path:parents.join('/'),name:o.name,material:m.name||m.type,environment:m.userData.environment,shadow:camera.isOrthographicCamera,triangles:(g.index?.count||g.attributes.position.count)/3*(o.count??1)});}
      return draw(camera,scene,g,m,o,group);
    };
    window.requestAnimationFrame=callback=>original(t=>{armed=true;callback(t);armed=false;r.renderBufferDirect=draw;window.requestAnimationFrame=original;resolve(rows);});
  }));
  report.push({site,calls});const counts={};for(const c of calls){const key=c.path.split('/').slice(0,2).join('/');counts[key]=(counts[key]||0)+1;}console.log(site,Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,30));
 }
}finally{await browser.close();await writeFile('docs/audits/nsw-optimisation/draw-calls.json.gz',gzipSync(JSON.stringify(report)));}
