// Disposable saves. Long trips are positioned directly; doorway movement,
// entrance/exit, tool input, extraction, menus and travel use the real controls.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.CP_BASE_URL||'http://127.0.0.1:5191/',high=!!process.env.CP_HIGH,offline=!!process.env.CP_OFFLINE;
const browser=await chromium.launch({headless:true});
try {for(const phone of process.env.CP_DESKTOP_ONLY?[false]:process.env.CP_TOUCH_ONLY?[true]:[false,true]) {
  const context=await browser.newContext({viewport:phone?{width:844,height:390}:{width:1360,height:900},hasTouch:phone,isMobile:phone});
  await context.addInitScript(()=>{
    if(sessionStorage.getItem('cp-fixture'))return;sessionStorage.setItem('cp-fixture','1');
    localStorage.setItem('fossicking-save-v2',JSON.stringify({seed:12345,cash:2000,gold:.2,difficulty:'realistic',up:{pan:2},camp:{shelter:'shed'},bucket:[{gold:.003}]}));
    localStorage.setItem('fossicking-settings-v1',JSON.stringify({preset:'low',res:.6,shadows:'off',aa:false,gems:'simple',reflections:'static',warned:true}));
  });
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(90000);
  page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR:',e.stack);});page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('Ignored attempt')){errors.push(m.text());console.log('CONSOLE ERROR:',m.text());}});
  const suffix=`${phone?'touch':high?'high':'desktop'}${offline?'-offline':''}`;
  const shot=n=>page.screenshot({path:`node_modules/.cache/cp-${n}-${suffix}.png`});
  const tap=s=>phone?page.locator(s).tap():page.locator(s).click();
  const action=(key,act)=>phone?tap(`#touch [data-act="${act}"]`):page.keyboard.press(key);
  const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')));
  const client=phone?await context.newCDPSession(page):null;
  async function enterPlay() {await tap('#play');if(await page.evaluate(()=>!!document.fullscreenElement))await page.evaluate(()=>document.exitFullscreen());}
  async function travel(id) {
    await action('KeyM','map');await tap('#map-travel');await tap(`.region-location-list [data-location="${id}"]`);
    assert.match(await page.locator('#region-fee').textContent(),/\$0/);
    if(high)await page.evaluate(id=>{const s=JSON.parse(localStorage.getItem('fossicking-settings-v1')),high=id==='coober-pedy';Object.assign(s,{preset:high?'high':'low',res:high?1:.6,shadows:high?'high':'off',aa:high});localStorage.setItem('fossicking-settings-v1',JSON.stringify(s));},id);
    await tap('#region-depart');await page.waitForFunction(id=>window.fossick?.region===id,id);await enterPlay();
  }
  async function position(x,z,yaw=0,pitch=0) {
    await page.evaluate(({x,z,yaw,pitch})=>{const f=fossick,m=f.mine;m.last={x,z};f.player.pos.copy(m.toWorld(f.player.pos.clone().set(x,0,z)));f.player.vel.set(0,0,0);f.player.yaw=yaw;f.player.pitch=pitch;},{x,z,yaw,pitch});
  }
  async function walk(held) {
    if(!phone){await page.keyboard[held?'down':'up']('KeyW');return;}
    if(!held){await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});return;}
    const b=await page.locator('#stick').boundingBox();await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width/2,y:b.y+4}]});
  }
  async function use(held) {
    if(!phone){await page.mouse[held?'down':'up']();return;}
    const b=await page.locator('#t-use').boundingBox();await client.send('Input.dispatchTouchEvent',{type:held?'touchStart':'touchEnd',touchPoints:held?[{x:b.x+b.width/2,y:b.y+b.height/2}]:[]});
  }
  try {
    await page.goto(origin+'?test'+(phone?'&touch':''),{waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);await enterPlay();await travel('coober-pedy');
    const home=await save();assert.equal(await page.locator('#overlay h1').textContent(),'Painted Ridge');
    assert.equal(await page.evaluate(()=>fossick.creek.dry&&!fossick.weather.water.mesh.visible&&fossick.mine.entries.length===3),true);
    assert.equal(await page.evaluate(()=>fossick.creek.boulders.length+fossick.bedload.stones.length),0);
    assert.equal(await page.evaluate(()=>fossick.mine.entries.every(e=>e.floor+e.plan.height<fossick.terrain.getHeight(e.x,e.z+15)-.5)),true);
    assert.equal(await page.evaluate(()=>fossick.field.sites.flatMap(s=>s.crystals).some(c=>c.variety==='black opal')),false);
    await action('KeyM','map');await shot('map');await tap('#map-close');
    // Interior reachability includes the actual furniture footprints.
    const unreachable=await page.evaluate(()=>{
      return fossick.mine.entries.flatMap(e=>{
        const queue=[[.5,3.5]],seen=new Set(['0,3']);
        for(let i=0;i<queue.length;i++)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const [x,z]=queue[i],nx=x+dx,nz=z+dz,key=`${Math.floor(nx)},${Math.floor(nz)}`;
          if(!seen.has(key)&&fossick.mine.canWalk(e,nx,nz)){seen.add(key);queue.push([nx,nz]);}
        }
        return e.plan.labels.filter(([,x,z])=>!queue.some(p=>Math.hypot(p[0]-x,p[1]-z)<1.8)).map(v=>e.plan.name+': '+v[0]);
      });
    });assert.deepEqual(unreachable,[]);
    for(const id of ['lantern','no4','workings']) {
      await page.evaluate(id=>{const f=fossick,e=f.mine.entries.find(e=>e.plan.id===id);f.player.pos.set(e.x,f.terrain.getHeight(e.x,e.z-14),e.z-14);f.player.vel.set(0,0,0);f.player.yaw=Math.PI;f.player.pitch=-.27;},id);
      await page.waitForTimeout(200);await shot(id+'-exterior');
      // Walk down the whole access cut with the original surface controller.
      await walk(true);await page.waitForFunction(()=>fossick.player.pos.z>fossick.mine.entries.find(e=>Math.abs(e.x-fossick.player.pos.x)<1).z-1.7);await walk(false);
      await page.evaluate(id=>{const f=fossick,e=f.mine.entries.find(e=>e.plan.id===id);f.player.pos.set(e.x,f.terrain.getHeight(e.x,e.z-1.5),e.z-1.5);f.player.vel.set(0,0,0);f.player.yaw=Math.PI;f.player.pitch=.1;},id);
      await page.waitForTimeout(150);await shot(id+'-outside');await action('KeyE','interact');await page.waitForFunction(id=>fossick.mine.inside&&fossick.mine.active.plan.id===id,id);
      await walk(true);await page.waitForFunction(()=>fossick.mine.toLocal(fossick.player.pos).z>4.5);await walk(false);
      if(id==='lantern') {
        const yaw=await page.evaluate(()=>fossick.player.yaw);
        if(phone){
          const p=await page.evaluate(()=>{for(let y=100;y<innerHeight-70;y+=20)for(let x=innerWidth*.4;x<innerWidth-100;x+=25)if(document.elementFromPoint(x,y)?.id==='touch-look'&&document.elementFromPoint(x+40,y)?.id==='touch-look')return {x,y};});assert.ok(p);
          await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,force:1}]});await page.waitForTimeout(40);
          await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+40,y:p.y,force:1}]});await page.waitForTimeout(40);
          await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        }
        else{await page.mouse.move(530,300);await page.mouse.move(580,300);}
        await page.waitForFunction(y=>fossick.player.yaw!==y,yaw,{timeout:12000});
        await page.evaluate(()=>{fossick.weather.begin('peak');fossick.weather.storm=1;});await page.waitForTimeout(150);
        assert.equal(await page.evaluate(()=>fossick.weather.rain.visible),false);await page.evaluate(()=>{fossick.weather.phase='calm';fossick.weather.storm=0;fossick.weather.next=999;});
      }
      if(id==='lantern') {
        await position(.5,7.5,Math.PI/2);await walk(true);await page.waitForFunction(()=>fossick.mine.toLocal(fossick.player.pos).x<-2.65,null,{timeout:30000});await walk(false);
        await position(-2.8,9.4,.65,-.13);await page.waitForTimeout(300);await shot('lounge');
        for(const view of [['kitchen',3.8,10.2,-.65],['bedroom',-2.8,15.2,2],['specimens',3.8,18.5,-.65]]) {await position(view[1],view[2],view[3],-.1);await page.waitForTimeout(150);await shot(view[0]);}
      } else if(id==='no4') {await position(-2.9,8.6,.65,-.12);await page.waitForTimeout(150);await shot('old-home');}
      else {
        await position(.5,15,Math.PI,-.06);await page.waitForTimeout(200);await shot('workings');
        if(phone)await tap('.slot[data-tool="hammer"]');else {await page.keyboard.press('Digit2');await page.mouse.wheel(0,-120);assert.equal(await page.evaluate(()=>fossick.state.tool),'detector');await page.keyboard.press('Digit6');}
        const face=await page.evaluate(()=>fossick.mine.faces.find(f=>f.crystal&&f.crystal.variety!=='potch'));
        assert.ok(face);await position(face.x+face.nx*1.2,face.z+face.nz*1.2,Math.atan2(face.nx,face.nz),Math.atan2(face.y-1.65,1.2));
        await action('KeyL','lamp');await page.waitForTimeout(150);await shot('seam');
        await use(true);await page.waitForFunction(id=>fossick.mine.taken.has(id),face.id);await use(false);
        assert.equal(await page.evaluate(()=>fossick.state.gems.length),1);
        // Another hold over a worked seam must not pay again.
        await use(true);await page.waitForTimeout(300);await use(false);assert.equal(await page.evaluate(()=>fossick.state.gems.length),1);
        await shot('opal-find');await action('KeyM','map');await tap('#map-close');
        const before=await save();assert.equal(before.claims['coober-pedy'].mine.interior.id,'workings');
        if(offline){await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await context.setOffline(true);}
        await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick?.mine?.inside);await enterPlay();
        assert.equal(await page.evaluate(()=>fossick.mine.active.plan.id),'workings');
        assert.equal(await page.evaluate(id=>fossick.mine.taken.has(id),face.id),true);
        assert.equal(await page.evaluate(()=>fossick.state.gems.length),1);
        console.log(`${suffix}: extraction and underground reload passed`);
      }
      await position(.5,3.5,0,0);await action('KeyE','interact');await page.waitForFunction(()=>!fossick.mine.inside);
      assert.equal(await page.evaluate(()=>Math.abs(fossick.player.pos.y-fossick.terrain.getHeight(fossick.player.pos.x,fossick.player.pos.z))<.15),true);
      console.log(`${suffix}: ${id} entered, explored and exited`);
    }
    await travel('new-england');const back=await save();for(const k of ['bucket','camp','seed'])assert.deepEqual(back[k],home[k]);assert.equal(back.cash,2000);assert.equal(back.gems.length,1);
    await travel('coober-pedy');assert.equal(await page.evaluate(()=>fossick.mine.taken.size),1);assert.equal(await page.evaluate(()=>fossick.mine.inside),false);assert.equal(await page.evaluate(()=>fossick.state.gems.length),1);
    assert.deepEqual(errors,[]);console.log(`${suffix}: dry region, three furnished interiors, door collision/input, finite opal recovery, save and $0 travel passed`);
  } catch(e) {await shot('failure');console.log(await page.evaluate(()=>({errors:window.fossick?.mine?.active?.plan.id,p:window.fossick?.player?.pos.toArray(),prompt:document.querySelector('#prompt')?.textContent})));throw e;} finally {await context.close();}
}} finally {await browser.close();}
