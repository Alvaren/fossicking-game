// Matched production views. Test-only clocks freeze shader animation for comparison.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const label=process.argv[2]||'candidate',base=process.env.OPT_URL||('http://127.0.0.1:5191/'+(label==='baseline'?'baseline/':''));
const out='docs/audits/nsw-optimisation/'+label+'-visual';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
const modes=(process.env.OPT_MODES||'high,low,ultra,touch').split(',');
const report={label,base,cases:[]};
try{report.cases=JSON.parse(await readFile(out+'/checks.json','utf8')).cases.filter(c=>!modes.includes(c.mode));}catch{}
try{for(const mode of modes){
  const touch=mode==='touch',preset=touch?'medium':mode;
  const context=await browser.newContext({viewport:touch?{width:844,height:390}:{width:1280,height:720},deviceScaleFactor:1,hasTouch:touch,isMobile:touch});
  await context.addInitScript(preset=>{
    let rng=23981;Math.random=()=>{rng=(Math.imul(rng,1664525)+1013904223)|0;return (rng>>>0)/4294967296;};
    localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,activeRegion:'new-england',hour:11,difficulty:'realistic',cash:400,gold:.1,camp:{shelter:'shed',built:{rack:true,kit:true,tub:true,water:true,generator:true,lights:true,lapidary:true,display:true,kelpie:true},water:80,generatorFuel:2,generatorOn:true}}));
    localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset,warned:true}));
  },preset);
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|too many errors/.test(m.text()))errors.push(m.text());});
  await page.goto(base+'?test'+(touch?'&touch':''),{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>fossick.newEngland.ready);
  await (touch?page.locator('#play').tap():page.locator('#play').click());
  if(touch)await page.locator('.slot[data-tool="shovel"]').tap();else await page.keyboard.press('Digit2');
  await page.evaluate(()=>{
    const f=fossick,r=f.renderer,original=f.daynight.update.bind(f.daynight),render=r.render.bind(r);
    f.daynight.update=(_,p)=>{f.daynight.hour=11;original(0,p);};
    const materials=new Set();f.scene.traverse(o=>{for(const m of [o.material,o.customDepthMaterial].flat().filter(Boolean))materials.add(m);});
    r.render=(scene,camera)=>{
      for(const m of materials){const u=m.uniforms||r.properties.get(m).uniforms;if(u?.ecoTime)u.ecoTime.value=20;if(u?.time)u.time.value=window.motionTime??20;}
      return render(scene,camera);
    };
    window.digPoint={x:f.terrain.camp.x+22,z:f.terrain.camp.z+20};
    for(let i=0;i<6;i++)f.terrain.dig(digPoint.x,digPoint.z,1.1,.18);
  });
  const views=mode==='high'?['creek','bank','woodland','reef','granite','camp','dig','downstream']:['creek','reef','dig'];
  const shots=[];
  for(const site of views){
    const pose=await page.evaluate(site=>{
      const f=fossick;let z=24,x=f.creek.cx(z)-f.creek.halfWidth(z)-1.8,tx=f.creek.cx(z),tz=z+14,pitch=-.15;
      if(site==='bank'){z=12;x=f.creek.cx(z)-f.creek.halfWidth(z)-.6;tx=f.creek.cx(z)+3;tz=z-3;pitch=-.65;}
      if(site==='woodland'){x=f.terrain.camp.x+20;z=22;tx=x+14;tz=z+20;pitch=-.08;}
      if(site==='reef'||site==='granite'){const s=f.terrain.sources[site];x=s.x+7;z=s.z+8;tx=s.x;tz=s.z;pitch=-.16;}
      if(site==='camp'){x=f.terrain.camp.x+12;z=f.terrain.camp.z+12;tx=f.terrain.camp.x;tz=f.terrain.camp.z;pitch=-.12;}
      if(site==='dig'){x=digPoint.x+1.8;z=digPoint.z+1.8;tx=digPoint.x;tz=digPoint.z;pitch=-.65;}
      if(site==='downstream'){z=-18;x=f.creek.cx(z)+f.creek.halfWidth(z)+2;tx=f.creek.cx(z);tz=z-14;}
      f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);f.player.yaw=Math.atan2(-(tx-x),-(tz-z));f.player.pitch=pitch;f.world.lod.update(1,f.player.pos,true);f.landscape.lod.update(1,f.player.pos,true);
      return {x,z,tx,tz,pitch};
    },site);
    await page.waitForTimeout(1500);await page.waitForFunction(()=>document.querySelector('#toasts').children.length===0);
    await page.screenshot({path:out+'/'+mode+'-'+site+'.jpg',quality:94});
    const state=await page.evaluate(()=>({water:{...fossick.creekRendering.stats},renderer:{...fossick.renderer.info.memory},programs:fossick.renderer.info.programs.length,failures:fossick.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length,tool:fossick.state.tool}));
    assert.equal(state.failures,0);assert.equal(state.tool,'shovel');shots.push({site,pose,...state});console.log(label,mode,site);
    if(site==='creek'&&mode==='high'){
      await page.evaluate(()=>{window.motionTime=20.5;});await page.waitForTimeout(100);await page.screenshot({path:out+'/high-creek-next.jpg',quality:94});await page.evaluate(()=>{window.motionTime=20;});
    }
  }
  assert.deepEqual(errors,[]);report.cases.push({mode,shots,errors});await context.close();
}}finally{await browser.close();await writeFile(out+'/checks.json',JSON.stringify(report,null,2)+'\n');}
