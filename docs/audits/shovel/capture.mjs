import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const label=process.argv[2]||'after',base=process.env.SHOVEL_URL||'http://127.0.0.1:5191/';
const out=(process.env.SHOVEL_OUT||'docs/audits/shovel')+'/'+label;await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
const report={label,base,cases:[]};
try {for(const mode of (process.env.SHOVEL_MODES||'high,touch,portrait,low').split(',')) {
  const touch=['touch','portrait'].includes(mode),preset=touch?'medium':mode;
  const viewport=mode==='portrait'?{width:390,height:844}:touch?{width:844,height:390}:{width:1280,height:720};
  const context=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:touch,isMobile:touch});
  await context.addInitScript(preset=>{
    if(sessionStorage.getItem('shovel-fixture'))return;sessionStorage.setItem('shovel-fixture','1');
    localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,activeRegion:'new-england',hour:11,difficulty:'realistic',camp:{shelter:'swag'}}));
    localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset,warned:true}));
  },preset);
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(60000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID/.test(m.text()))errors.push(m.text());});
  await page.goto(base+'?test'+(touch?'&touch':''),{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>fossick.newEngland.ready);
  await (touch?page.locator('#play').tap():page.locator('#play').click());
  if(touch)await page.locator('.slot[data-tool="shovel"]').tap();else await page.keyboard.press('Digit2');
  await page.evaluate(()=>{
    const f=fossick,z=24,x=f.creek.cx(z)-f.creek.halfWidth(z)-1.8;
    f.player.pos.set(x,f.terrain.getHeight(x,z),z);f.player.vel.set(0,0,0);
    f.player.yaw=Math.atan2(-(f.creek.cx(z)-x),-14);f.player.pitch=-.15;
    const update=f.daynight.update.bind(f.daynight);f.daynight.update=(_,p)=>{f.daynight.hour=11;update(0,p);};
  });
  await page.waitForTimeout(2200);await page.screenshot({path:out+'/'+mode+'-held.jpg',quality:94});
  const model=await page.evaluate(()=>{
    const v=fossick.view,g=v.shovelG;
    return {tool:v.current,parts:g.children.filter(o=>o.isMesh).map(o=>({name:o.name,triangles:(o.geometry.index?.count||o.geometry.attributes.position.count)/3,visible:o.visible})),shaderFailures:fossick.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length};
  });
  assert.equal(model.tool,'shovel');assert.equal(model.shaderFailures,0);
  if(label!=='before') {
    // Genuine Use input drives the original digging/recovery animation.
    await page.evaluate(()=>{
      const f=fossick,x=f.terrain.camp.x+22,z=f.terrain.camp.z+18,p=f.player.pos;
      p.set(x,f.terrain.getHeight(x,z+1.2),z+1.2);f.player.vel.set(0,0,0);f.player.yaw=0;
      f.player.pitch=Math.atan2(f.terrain.getHeight(x,z)-(p.y+1.65),1.2);
      window.loadedFrames=0;window.movingFrames=0;
      const update=f.view.update.bind(f.view);f.view.update=(dt,s)=>{update(dt,s);if(f.view.shovelDirt.visible)loadedFrames++;if(f.view.digT>0)movingFrames++;};
    });
    await page.waitForTimeout(300);
    let client;
    if(touch) {
      client=await context.newCDPSession(page);const b=await page.locator('#t-use').boundingBox();
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
    } else await page.mouse.down();
    await page.waitForFunction(()=>fossick.state.bucket.length>0&&loadedFrames>0&&movingFrames>0);
    if(touch)await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();
    model.dig=await page.evaluate(()=>({parcels:fossick.state.bucket.length,loadedFrames,movingFrames}));
    await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>fossick.view.shovelDirt.visible),false);
    await page.keyboard.press('Control+s');const parcels=await page.evaluate(()=>fossick.state.bucket.length);
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await page.evaluate(()=>fossick.newEngland.ready);
    assert.equal(await page.evaluate(()=>fossick.state.bucket.length),parcels);
    await (touch?page.locator('#play').tap():page.locator('#play').click());
    if(touch)await page.locator('.slot[data-tool="shovel"]').tap();else await page.keyboard.press('Digit2');
    await page.waitForTimeout(700);
  }
  if(mode==='high') {
    // Isolated inspection of the actual runtime model and PBR materials.
    await page.evaluate(()=>{
      const f=fossick,v=f.view,scene=new v.scene.constructor(),camera=new v.camera.constructor(35,1280/720,.01,10);
      scene.background=new v.vmSun.color.constructor(0x263239);scene.environment=v.scene.environment;scene.environmentIntensity=.65;
      scene.add(v.vmHemi.clone(),v.vmSun.clone());const tool=v.shovelG.clone(true);tool.position.set(0,0,0);tool.rotation.set(0,0,0);scene.add(tool);
      camera.position.set(.6,.85,.48);camera.lookAt(-.05,-.2,-.52);camera.updateMatrixWorld(true);
      const render=f.renderer.render.bind(f.renderer);f.renderer.render=()=>render(scene,camera);
      window.shovelStudio={scene,camera,tool,render};
      document.querySelectorAll('body > :not(canvas):not(script)').forEach(e=>e.style.visibility='hidden');
    });
    await page.waitForTimeout(250);await page.locator('#game').screenshot({path:out+'/model.jpg',quality:96});
    await page.evaluate(()=>{shovelStudio.camera.position.set(.21,.06,-.46);shovelStudio.camera.lookAt(-.134,-.45,-1.06);shovelStudio.camera.updateMatrixWorld(true);});
    await page.waitForTimeout(250);await page.locator('#game').screenshot({path:out+'/head.jpg',quality:96});
    if(process.env.SHOVEL_VIEWS==='socket') {
      // Additional neutral studio views make the connection visible from both
      // faces and in profile. This changes inspection lights, never game lights.
      await page.evaluate(()=>{
        const {scene}=shovelStudio,v=fossick.view;
        scene.add(new v.vmHemi.constructor(0xffffff,0xb6bdc4,1.5));
        const key=v.vmSun.clone();key.intensity=3;key.position.set(1,1,-.2);key.target.position.set(-.13,-.43,-1.03);scene.add(key,key.target);
        const fill=v.vmSun.clone();fill.intensity=2;fill.position.set(-1,-1.8,-1.1);fill.target.position.set(-.13,-.43,-1.03);scene.add(fill,fill.target);
      });
      for(const [name,position,target] of [
        ['junction',[.17,.01,-.48],[-.13,-.43,-1.04]],
        ['profile',[.55,-.43,-1.03],[-.13,-.43,-1.03]],
        ['back',[.05,-1.3,-1.07],[-.13,-.43,-1.03]],
        ['front',[-.04,.25,-1.0],[-.13,-.43,-1.03]],
      ]) {
        await page.evaluate(({position,target})=>{const c=shovelStudio.camera;c.position.set(...position);c.lookAt(...target);c.updateMatrixWorld(true);},{position,target});
        await page.waitForTimeout(180);await page.locator('#game').screenshot({path:out+'/'+name+'.jpg',quality:96});
      }
      await page.evaluate(()=>{const c=shovelStudio.camera;c.position.set(.21,.06,-.46);c.lookAt(-.134,-.45,-1.06);c.updateMatrixWorld(true);});
    }
    if(label!=='before') {
      await page.evaluate(()=>{shovelStudio.tool.getObjectByName('Shovel load').visible=true;});
      await page.waitForTimeout(250);await page.locator('#game').screenshot({path:out+'/head-loaded.jpg',quality:96});
    }
  }
  assert.deepEqual(errors,[]);report.cases.push({mode,model,errors});await context.close();console.log(label,mode,'passed');
}} finally {await browser.close();await writeFile(out+'/checks.json',JSON.stringify(report,null,2)+'\n');}
