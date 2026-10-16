import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.GRAVES_URL||'http://127.0.0.1:5191/',out='docs/audits/graves-hill/'+(process.env.GRAVES_LABEL||'candidate');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
const report=[];
try{for(const mode of (process.env.GRAVES_MODES||'high').split(',')){
 const touch=mode==='touch',preset=touch?'medium':['night','rain'].includes(mode)?'high':mode;
 const context=await browser.newContext({viewport:touch?{width:844,height:390}:{width:1280,height:720},hasTouch:touch,isMobile:touch});
 await context.addInitScript(preset=>{
  localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,activeRegion:'graves-hill',hour:11,difficulty:'realistic',cash:400,claims:{'graves-hill':{seed:12345}}}));
  localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset,warned:true}));
 },preset);
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(90000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID/.test(m.text()))errors.push(m.text());});
 await page.goto(base+'?test'+(touch?'&touch':''),{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>fossick.regionalEnvironment.ready);
 await page.locator('#play').click();
 await page.evaluate(mode=>{const f=fossick,u=f.daynight.update.bind(f.daynight);f.daynight.update=(_,p)=>{f.daynight.hour=mode==='night'?21:11;u(0,p);};if(mode==='rain')f.flood();},mode);
 if(mode==='rain')await page.waitForTimeout(10000);
 const views=['night','rain'].includes(mode)?['track','tub']:mode==='high'?['track','clifford','millionaires','granite','ruby','camp','tub']:['clifford','track'];
 for(const site of views){
  const pose=await page.evaluate(site=>{
   const f=fossick;let x=-51,z=58,tx=-15,tz=43,pitch=-.1;
   if(site==='clifford'){const p=f.terrain.workings.find(p=>p.z>45);x=p.x+3;z=p.z+3;tx=p.x;tz=p.z;pitch=-.5;}
   if(site==='millionaires'){const p=f.terrain.workings.find(p=>p.z<-25);x=p.x+3;z=p.z+4;tx=p.x;tz=p.z;pitch=-.38;}
   if(site==='granite'){x=14;z=-54;tx=5;tz=-63;pitch=-.14;}
   if(site==='ruby'){x=-48;z=-18;tx=-60;tz=-26;pitch=-.22;}
   if(site==='camp'){x=-58;z=39;tx=-46;tz=28;pitch=-.12;}
   if(site==='tub'){x=-43;z=26;tx=-43;tz=24;pitch=-.5;}
   f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);f.player.yaw=Math.atan2(-(tx-x),-(tz-z));f.player.pitch=pitch;
   f.world.lod.update(1,f.player.pos,true);f.landscape.lod.update(1,f.player.pos,true);return{x,z,tx,tz,pitch};
  },site);
  await page.waitForTimeout(1800);
  await page.screenshot({path:out+'/'+mode+'-'+site+'.jpg',quality:92});
  const state=await page.evaluate(()=>({region:fossick.region,art:fossick.regionalEnvironment.stats,failures:fossick.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length,water:!!fossick.creekRendering,weather:{hour:fossick.daynight.hour,storm:fossick.weather.storm,wet:fossick.environmentWeather.wet.value},memory:fossick.renderer.info.memory}));
  assert.equal(state.failures,0);assert.equal(state.region,'graves-hill');assert.equal(state.water,false);report.push({mode,site,pose,...state});console.log(mode,site,JSON.stringify(state.art));
 }
 assert.deepEqual(errors,[]);await context.close();
}}finally{await browser.close();await writeFile(out+'/checks.json',JSON.stringify(report,null,2)+'\n');}
