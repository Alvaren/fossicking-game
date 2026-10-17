// Actual production renderer, isolated storage. Capture viewpoints use normal eye height.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TAS_URL||'http://127.0.0.1:5191/',out=process.env.TAS_OUT||'docs/audits/tasmania-ne/final';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try {
  const ctx=await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1});
  await ctx.addInitScript(()=>{if(sessionStorage.fixture)return;sessionStorage.fixture='1';localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,cash:500,difficulty:'realistic',camp:{shelter:'shed'}}));localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'high',res:1,warned:true}));});
  const page=await ctx.newPage(),errors=[];page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(base+'?test',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await page.locator('#travel-btn').click();await page.locator('.region-location-list [data-location="ne-tasmania"]').click();await page.locator('#region-depart').click();await page.waitForFunction(()=>window.fossickTas?.region==='ne-tasmania');
  await page.evaluate(async()=>{const f=fossickTas;if(f.world.environment)await f.world.environment.ready;f.expedition.hour=11;f.expedition.campPitched=true;f.world.atmosphere.override=0;f.save();});
  await page.locator('#tas-resume').click();
  if(process.env.TAS_HERO)await page.evaluate(()=>{fossickTas.view.scene.visible=false;});
  const baseline=await page.evaluate(()=>{const f=fossickTas;return {seed:f.model.seed,profile:{sites:f.model.sites,route:f.profile.ROUTE},heights:Array.from({length:121},(_,i)=>{const x=(i%11)*20-100,z=Math.floor(i/11)*24-120;return{x,z,h:f.model.height(x,z)}}),colliders:f.world.colliders,save:JSON.parse(localStorage.getItem('fossicking-save-v2'))};});
  await writeFile(out+'/world.json',JSON.stringify(baseline,null,2)+'\n');
  await page.addStyleTag({content:'#tas-hud,#touch,#tas-modal {visibility:hidden!important}'});
  const views=[['bend',62,-1,1.8,18],['terrace',-8,-1,3,15],['upstream',-82,1,2,18],['camp',62,-1,13,12],['track',100,-1,27,-20]];
  for(const [name,z,side,offset,ahead] of views) {
    await page.evaluate(({z,side,offset,ahead})=>{const f=fossickTas,p=f.profile,x=p.riverX(z)+side*(p.riverWidth(z)+offset);Object.assign(f.player,{x,z});const target={x:p.riverX(z+ahead),y:p.waterY(z+ahead)+.3,z:z+ahead};f.player.yaw=Math.atan2(-(target.x-x),-(target.z-z));f.player.pitch=Math.atan2(target.y-f.model.height(x,z)-1.65,Math.hypot(target.x-x,target.z-z));f.expedition.hour=11;}, {z,side,offset,ahead});
    await page.waitForTimeout(1100);await page.screenshot({path:out+'/'+name+'.jpg',quality:93});
  }
  if(process.env.TAS_HERO)for(const [name,z,offset,ahead] of [['hero-river',-35,5,20],['hero-camp',66,20,-14]]) {
    const position=await page.evaluate(({name,z,offset,ahead})=>{
      const f=fossickTas,p=f.profile,desired={x:p.riverX(z)-p.riverWidth(z)-offset,z};
      const clear=(x,z)=>f.model.depth(x,z)<.72&&f.world.colliders.every(c=>Math.hypot(c.x-x,c.z-z)>c.r+.4);
      const options=[];for(let dz=-5;dz<=5;dz+=.5)for(let dx=-5;dx<=5;dx+=.5){const x=desired.x+dx,z=desired.z+dz;if(clear(x,z))options.push({x,z,d:dx*dx+dz*dz});}options.sort((a,b)=>a.d-b.d);
      if(!options.length)throw Error('No clear hero viewpoint');const pos=options[0];Object.assign(f.player,pos);
      const target=name==='hero-camp'?{x:p.CAMP.x,y:f.model.height(p.CAMP.x,p.CAMP.z)+.8,z:p.CAMP.z}:{x:p.riverX(z+ahead),y:p.waterY(z+ahead)+.3,z:z+ahead};
      f.player.yaw=Math.atan2(-(target.x-pos.x),-(target.z-pos.z));f.player.pitch=Math.atan2(target.y-f.model.height(pos.x,pos.z)-1.65,Math.hypot(target.x-pos.x,target.z-pos.z));return pos;
    },{name,z,offset,ahead});
    await page.waitForTimeout(1400);await page.screenshot({path:out+'/'+name+'.jpg',quality:94});views.push([name,position]);
  }
  const stats=await page.evaluate(()=>({environment:fossickTas.world.environment?.stats||null,water:fossickTas.world.waterDetail?.stats||null,fog:{density:fossickTas.scene.fog.density,color:fossickTas.scene.fog.color.getHexString()},renderCounters:"Use performance.json; the normal renderer resets counts between water/world/tool passes.",geometry:fossickTas.renderer.info.memory,gl:fossickTas.renderer.getContext().getParameter(fossickTas.renderer.getContext().RENDERER)}));
  await writeFile(out+'/errors.json',JSON.stringify(errors,null,2));assert.deepEqual(errors,[]);await writeFile(out+'/checks.json',JSON.stringify({errors,stats,views,normalEyeHeight:true},null,2)+'\n');console.log('Northeast capture passed: '+out);
} finally {await browser.close();}
