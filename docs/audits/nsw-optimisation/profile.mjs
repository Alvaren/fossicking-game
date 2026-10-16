// Production benchmark: isolated populated legacy fixture; fixed high-quality route.
// Run one GPU workload at a time. Duration excludes 20s warm-up; defaults 3 x 10min.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const label=process.argv[2]||'baseline',diagnostic=process.env.OPT_DIAG==='1';
const region=process.env.OPT_REGION||'new-england';
const root=(process.env.OPT_OUT||'docs/audits/nsw-optimisation')+'/'+label;await mkdir(root,{recursive:true});
const url=process.env.OPT_URL||('http://127.0.0.1:5191/'+(label.startsWith('baseline')?'baseline/':''));
const seconds=Number(process.env.OPT_SECONDS||600),runs=Number(process.env.OPT_RUNS||3),disable=process.env.OPT_DISABLE||'',passGpu=process.env.OPT_PASS_GPU==='1';
const q=(a,p)=>{a=[...a].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(a.length*p))];};
const distribution=a=>({median:q(a,.5),p95:q(a,.95),p99:q(a,.99)});
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist','--enable-precise-memory-info']});
try{for(let run=1;run<=runs;run++){
  const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  await context.addInitScript(region=>{
    let rng=23981;Math.random=()=>{rng=(Math.imul(rng,1664525)+1013904223)|0;return (rng>>>0)/4294967296;};
    const camp={shelter:'shed',built:{rack:true,kit:true,tub:true,water:true,generator:true,lights:true,lapidary:true,display:true,kelpie:true},water:80,generatorFuel:2,generatorOn:true};
    localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,activeRegion:region,hour:11,difficulty:'realistic',cash:400,gold:.1,camp,claims:region==='new-england'?{}:{[region]:{seed:12345,camp}}}));
    localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'high',res:1.5,shadows:'high',aa:true,gems:'full',reflections:'live',environment:'high',water:'scene',warned:true}));
  },region);
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|too many errors/.test(m.text()))errors.push(m.text());});
  const start=Date.now();await page.goto(url+'?test',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>(fossick.regionalEnvironment||fossick.newEngland)?.ready);
  if(disable)await page.evaluate(disable=>{
    const f=fossick;
    if(disable.split(',').includes('instances'))for(const lod of [f.world.lod,f.landscape.lod])for(const b of lod.batches){
      if(!b.spatial)continue;
      const parent=b.spatial[0].root.parent;parent.add(b.near,b.far);
      b.sync=()=>{};for(const s of b.spatial)s.root.visible=false;
    }
    if(disable.split(',').includes('grids'))for(const root of [f.terrain.mesh,...f.scene.children.filter(o=>o.geometry?.userData.grid)]){
      root.geometry.setDrawRange(0,Infinity);for(const child of root.children)child.visible=false;
    }
    if(disable.split(',').includes('transforms'))Object.defineProperty(f.scene,'matrixWorldAutoUpdate',{get:()=>true,set:()=>{}});
    if(disable.split(',').includes('caches')){const update=f.newEngland.update.bind(f.newEngland);f.newEngland.update=(...args)=>{f.terrain.revision++;return update(...args);};}
  },disable);
  const loadMs=Date.now()-start;await page.locator('#play').click();await page.keyboard.press('Digit2');
  const hardware=await page.evaluate(()=>{const gl=fossick.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return {gpu:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),browser:navigator.userAgent,cores:navigator.hardwareConcurrency,foliage:[...new Set([...fossick.world.lod.batches,...fossick.landscape.lod.batches].flatMap(b=>[b.near.geometry,b.far.geometry]))].filter(g=>g.userData.exactIndex).map(g=>({name:g.name,...g.userData.exactIndex,bytes:Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(g.index?.array.byteLength||0),beforeBytes:g.userData.exactIndex.before*Object.values(g.attributes).reduce((n,a)=>n+a.itemSize*a.array.BYTES_PER_ELEMENT,0)})),viewport:[innerWidth,innerHeight],buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight]};});
  await page.evaluate(({diagnostic,seconds,passGpu})=>{
    const f=fossick,r=f.renderer,gl=r.getContext(),timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const original=requestAnimationFrame.bind(window),start=performance.now(),pending=[];let last=0,n=0;
    const graves=f.terrain.profile.id==='graves-hill';
    const sites=f.terrain.profile.id==='uralla'?['creek','bank','woodland','boulderReach','reedPool','camp','dig','downstream']:graves?['track','clifford','woodland','millionaires','granite','camp','dig','ruby']:['creek','bank','woodland','reef',f.terrain.profile.id==='golden-triangle'?'workings':'granite','camp','dig','downstream'];
    window.opt={frames:[],gpu:[],memory:[],callbacks:{},costs:{},renders:[],start,sites,hasGpuTimer:!!timer};
    const dx=f.terrain.camp.x+22,dz=f.terrain.camp.z+20;
    for(let i=0;i<6;i++)f.terrain.dig(dx,dz,1.1,.18);
    if(diagnostic) {
      for(const name of ['world','landscape','newEngland','campShelter','campBuildings','kelpie','targets','finds','weather','bedload','mine','works','devils','wildlife','sluice','boulders','cabinet','stall','excav','daynight']) {
        const o=f[name],key=name==='excav'?'updateLOD':'update';if(!o?.[key])continue;
        const fn=o[key].bind(o);o[key]=(...args)=>{const t=performance.now();const value=fn(...args);(opt.costs[name]??=[]).push(performance.now()-t);return value;};
      }
      const fn=r.render.bind(r),counts={};let frameWater=0,lastFrame=-1;
      r.render=(...args)=>{
        const target=r.getRenderTarget(),t=performance.now(),isWorld=args[0]===f.scene;
        if(lastFrame!==n){lastFrame=n;frameWater=0;}
        const pass=isWorld?(target?(frameWater++===0?'water-reflection':'water-refraction'):'main-world'):'tools-or-environment';
        const count=counts[pass]=(counts[pass]||0)+1;
        let query;if(passGpu&&timer&&count%30===0&&pending.length<16&&(t-start)>20000){query=gl.createQuery();gl.beginQuery(timer.TIME_ELAPSED_EXT,query);}
        const value=fn(...args);
        if(query){gl.endQuery(timer.TIME_ELAPSED_EXT);pending.push({q:query,site:opt.site,pass});}
        opt.renders.push({ms:performance.now()-t,pass,target:target?target.width+'x'+target.height:'screen',calls:r.info.render.calls,triangles:r.info.render.triangles});return value;
      };
      const shadow=r.shadowMap.render.bind(r.shadowMap);r.shadowMap.render=(...args)=>{const t=performance.now(),v=shadow(...args);(opt.costs.shadowSubmission??=[]).push(performance.now()-t);return v;};
    }
    window.requestAnimationFrame=callback=>original(timestamp=>{
      const age=(performance.now()-start)/1000,at=Math.max(0,age-20),segment=age<20?Math.min(7,Math.floor(age/2.5)):Math.min(7,Math.floor(at/(seconds/8))),site=sites[segment],phase=at/(seconds/8)%1;
      opt.site=site;
      opt.callbacks[callback.name]=(opt.callbacks[callback.name]||0)+1;
      let z=24,x=f.creek.cx(z)-f.creek.halfWidth(z)-1.8,tx=f.creek.cx(z),tz=z+14,pitch=-.15;
      if(site==='bank'){z=12;x=f.creek.cx(z)-f.creek.halfWidth(z)-.6;tx=f.creek.cx(z)+3;tz=z-3;pitch=-.65;}
      if(site==='woodland'){x=f.terrain.camp.x+20;z=22;tx=x+14;tz=z+20;pitch=-.08;}
      if(['reef','granite','boulderReach','reedPool'].includes(site)){const s=f.terrain.sources[site];x=s.x+7;z=s.z+8;tx=s.x;tz=s.z;pitch=-.16;}
      if(site==='workings'){const s=f.terrain.workings[3];x=s.x+5;z=s.z+6;tx=s.x;tz=s.z;pitch=-.48;}
      if(site==='camp'){x=f.terrain.camp.x+12;z=f.terrain.camp.z+12;tx=f.terrain.camp.x;tz=f.terrain.camp.z;pitch=-.12;}
      if(site==='dig'){x=dx+1.8;z=dz+1.8;tx=dx;tz=dz;pitch=-.65;}
      if(site==='downstream'){z=-18;x=f.creek.cx(z)+f.creek.halfWidth(z)+2;tx=f.creek.cx(z);tz=z-14;}
      if(site==='track'){x=-51;z=58;tx=-15;tz=43;pitch=-.1;}
      if(site==='clifford'||site==='millionaires'){const p=f.terrain.workings.find(p=>site==='clifford'?p.z>45:p.z<-25);x=p.x+3;z=p.z+4;tx=p.x;tz=p.z;pitch=-.4;}
      if(site==='ruby'){x=-48;z=-18;tx=-60;tz=-26;pitch=-.22;}
      if(f.creek.course&&['creek','bank','downstream'].includes(site)) {
        const c=f.creek,s=site==='downstream'?-95:site==='bank'?-30:85;
        const eye=c.point(s,-c.halfWidth(s)-(site==='bank'?.6:2)),target=c.point(s+(site==='creek'?14:-10));
        x=eye.x;z=eye.z;tx=target.x;tz=target.z;
      }
      const wobble=Math.sin(phase*Math.PI*2);x+=wobble*.5;
      f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);f.player.yaw=Math.atan2(-(tx-x),-(tz-z))+wobble*.12;f.player.pitch=pitch;f.daynight.hour=11;
      r.info.autoReset=false;r.info.reset();
      for(let i=pending.length-1;i>=0;i--){const {q,site,pass}=pending[i];if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){if(!gl.getParameter(timer.GPU_DISJOINT_EXT))opt.gpu.push({ms:gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6,site,pass});gl.deleteQuery(q);pending.splice(i,1);}}
      let query;if(!passGpu&&timer&&n%30===0&&pending.length<8&&age>20){query=gl.createQuery();gl.beginQuery(timer.TIME_ELAPSED_EXT,query);}
      const before=performance.now();callback(timestamp);const cpu=performance.now()-before;
      if(query){gl.endQuery(timer.TIME_ELAPSED_EXT);pending.push({q:query,site});}
      if(age>20&&last)opt.frames.push({dt:timestamp-last,cpu,calls:r.info.render.calls,triangles:r.info.render.triangles,site});
      if(n++%600===0)opt.memory.push({age,heap:performance.memory?.usedJSHeapSize,geometries:r.info.memory.geometries,textures:r.info.memory.textures,programs:r.info.programs.length});
      last=timestamp;
    });
  },{diagnostic,seconds,passGpu});
  let cdp;if(diagnostic){cdp=await context.newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.start');}
  for(let elapsed=0;elapsed<seconds+20;elapsed+=30){await page.waitForTimeout(Math.min(30,seconds+20-elapsed)*1000);console.log(label,run,'profile',Math.min(elapsed+30,seconds+20)+'/'+(seconds+20)+'s');}
  if(diagnostic){const profile=await cdp.send('Profiler.stop');await writeFile(root+'/cpu-'+run+'.cpuprofile.gz',gzipSync(JSON.stringify(profile)));}
  const data=await page.evaluate(()=>opt);assert.deepEqual(errors,[]);
  const summarise=frames=>({frames:frames.length,frameMs:distribution(frames.map(f=>f.dt)),cpuMs:distribution(frames.map(f=>f.cpu)),calls:distribution(frames.map(f=>f.calls)),triangles:distribution(frames.map(f=>f.triangles)),over33ms:frames.filter(f=>f.dt>33.5).length,over50ms:frames.filter(f=>f.dt>50).length});
  const result={label,run,url,region,seed:12345,diagnostic,disable,passGpu,measuredSeconds:seconds,warmupSeconds:20,loadMs,hardware,callbacks:data.callbacks,...summarise(data.frames),gpuMs:data.gpu.length?distribution(data.gpu.map(g=>g.ms)):null,gpuSamples:data.gpu.length,memory:data.memory,errors,sites:{}};
  for(const site of data.sites){const frames=data.frames.filter(f=>f.site===site),gpu=data.gpu.filter(f=>f.site===site);result.sites[site]={...summarise(frames),gpuMs:distribution(gpu.map(g=>g.ms))};}
  if(passGpu){result.passGpu={};for(const pass of new Set(data.gpu.map(g=>g.pass)))result.passGpu[pass]=distribution(data.gpu.filter(g=>g.pass===pass).map(g=>g.ms));}
  if(diagnostic){result.updateCosts=Object.entries(data.costs).map(([name,values])=>({name,total:values.reduce((a,b)=>a+b,0),samples:values.length,...distribution(values)})).sort((a,b)=>b.total-a.total);result.renderCosts=Object.fromEntries([...new Set(data.renders.map(r=>r.pass))].map(pass=>{const a=data.renders.filter(r=>r.pass===pass);return [pass,{samples:a.length,total:a.reduce((n,r)=>n+r.ms,0),...distribution(a.map(r=>r.ms))}];}));await writeFile(root+'/render-costs-'+run+'.json.gz',gzipSync(JSON.stringify(data.renders)));}
  await writeFile(root+'/run-'+run+'.json',JSON.stringify(result,null,2)+'\n');await writeFile(root+'/samples-'+run+'.json.gz',gzipSync(JSON.stringify({frames:data.frames,gpu:data.gpu})));
  console.log(JSON.stringify({label,run,frame:result.frameMs,cpu:result.cpuMs,gpu:result.gpuMs,calls:result.calls,triangles:result.triangles,updateCosts:result.updateCosts}));
  await context.close();
}}finally{await browser.close();}
