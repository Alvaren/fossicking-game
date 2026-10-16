import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.URALLA_URL||'http://127.0.0.1:5191/',out='docs/audits/uralla/'+(process.env.URALLA_LABEL||'candidate');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
const report=[];
try{for(const mode of (process.env.URALLA_MODES||'high').split(',')){
 const touch=mode==='touch',preset=touch?'medium':['night','rain'].includes(mode)?'high':mode;
 const context=await browser.newContext({viewport:touch?{width:844,height:390}:(process.env.URALLA_HERO==='1'&&mode==='high'?{width:1920,height:1080}:{width:1280,height:720}),hasTouch:touch,isMobile:touch});
 await context.addInitScript(preset=>{
  localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,activeRegion:'uralla',hour:11,difficulty:'realistic',cash:400,claims:{'uralla':{seed:12345}}}));
  localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset,warned:true}));
 },preset);
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(90000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID/.test(m.text()))errors.push(m.text());});
 await page.goto(base+'?test'+(touch?'&touch':''),{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>fossick.regionalEnvironment.ready);
 await page.locator('#play').click();
 await page.evaluate(mode=>{const f=fossick,u=f.daynight.update.bind(f.daynight);f.daynight.update=(_,p)=>{f.daynight.hour=mode==='night'?21:11;u(0,p);};if(mode==='rain')f.flood();},mode);
 if(mode==='rain')await page.waitForTimeout(30000);
 const views=process.env.URALLA_VIEWS?process.env.URALLA_VIEWS.split(','):['night','rain'].includes(mode)?['boulders','pool']:['boulders','pool','shallows','camp'];
 for(const site of views){
  const pose=await page.evaluate(site=>{
   const f=fossick,c=f.creek;let x=c.cx(50)-12,z=42,tx=c.cx(53)+2,tz=53,pitch=-.18;
   if(site==='boulder-water'){x=c.cx(38);z=38;tx=c.cx(56);tz=56;pitch=-.08;}
   if(site==='pool'){x=c.cx(-27)-c.halfWidth(-27)-1.1;z=-34;tx=c.cx(-23)+4;tz=-23;pitch=-.12;}
   if(site==='shallows'){x=c.cx(3)-c.halfWidth(3)-.7;z=3;tx=c.cx(10);tz=10;pitch=-.2;}
   if(site==='camp'){x=-42;z=15;tx=-26;tz=-2;pitch=-.06;}
   f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);f.player.yaw=Math.atan2(-(tx-x),-(tz-z));f.player.pitch=pitch;
   f.world.lod.update(1,f.player.pos,true);f.landscape.lod.update(1,f.player.pos,true);return{x,z,tx,tz,pitch};
  },site);
  await page.waitForTimeout(1800);
  await page.screenshot({path:out+'/'+mode+'-'+site+'.jpg',quality:92});
  if(mode==='high'&&process.env.URALLA_HERO==='1') {
    await page.evaluate(site=>{const f=fossick;f.enterPhoto();f.photo.help=false;f.photo.grid=false;f.photo.stamp=false;f.photo.filter=0;if(site==='boulder-water'){f.photo.pos.y+=2.4;f.photo.pitch=-.20;}f.photo.applyFilter();f.photo.render();},site);
    await page.waitForTimeout(800);
    const pending=page.waitForEvent('download');await page.evaluate(()=>fossick.photo.snap());
    const download=await pending;await download.saveAs(out+'/hero-'+site+'.jpg');
    await page.evaluate(()=>fossick.exitPhoto());
  }
  const state=await page.evaluate(()=>({region:fossick.region,art:fossick.regionalEnvironment.stats,graniteRoles:[...new Set(fossick.regionalEnvironment.root.children.filter(o=>/^Uralla (granite|cobble)_/.test(o.name)).flatMap(o=>Array.from(o.geometry.attributes.aAuthoredRockKind.array)))],failures:fossick.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length,water:!!fossick.creekRendering,weather:{hour:fossick.daynight.hour,storm:fossick.weather.storm,wet:fossick.environmentWeather.wet.value},memory:fossick.renderer.info.memory}));
  assert.deepEqual(state.graniteRoles,[0]);assert.equal(state.failures,0);assert.equal(state.region,'uralla');assert.equal(state.water,true);report.push({mode,site,pose,photoLift:site==='boulder-water'?2.4:0,...state});console.log(mode,site,JSON.stringify(state.art));
 }
 assert.deepEqual(errors,[]);await context.close();
}}finally{await browser.close();await writeFile(out+'/checks.json',JSON.stringify(report,null,2)+'\n');}
