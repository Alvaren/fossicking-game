import { createPointerLock, bindToolWheel, toolForKey } from '../controls.js';
import { Viewmodel } from '../tools.js';
import { loadAssets, assets } from '../assets.js';
import { RegionUI } from '../regionui.js';
import { topographyCanvas } from '../topography.js';
import * as THREE from 'three';
import { readSave, storeSave } from '../save.js';
import { TASMANIA, NORTHEAST, TRAVEL_FEE, saveExpedition, returnHome, carriedWeight, sampleCapacity } from '../regions.js';
import * as western from './model.js';
import * as eastern from './northeast-content.js';
import { SieveUI } from './sieveui.js';
import { buildCatchment } from './world.js';
import { PanningUI } from '../panningui.js';
import { IS_TOUCH, TouchControls } from '../touch.js';
import { Sound } from '../audio.js';
import { settings } from '../settings.js';
import './style.css';

export function startTasmania(region = TASMANIA) {
  const northeast=region===NORTHEAST,profile=northeast?eastern:western;
  const {Catchment,CAMP,TRAILHEAD,REACHES,ROUTE,riverX,riverWidth,waterY,takeSample,recordRecovery,walkStep}=profile;
  const riverName=northeast?'Tin Fern River':'Fern River',campName=northeast?'Granite Bend':'Fern Bend';
  const home=readSave(), expedition=structuredClone(home.expeditions[region]);
  const model=new Catchment(expedition.seed), test=new URLSearchParams(location.search).has('test');
  expedition.snipingPockets ||= Object.fromEntries(model.snipingPockets.map(p=>[p.id,{remainingGold:p.gold,remainingMaterial:p.capacity}]));
  const canvas=document.getElementById('game'), touchRoot=document.getElementById('touch');
  document.body.replaceChildren(canvas,touchRoot);
  document.body.classList.add('tasmania');document.body.classList.toggle('touch',IS_TOUCH);
  const hud=document.createElement('div');hud.id='tas-hud';
  hud.innerHTML=`<div class="tas-top"><div class="tas-readout"><div class="tas-title">${northeast?'NORTHEAST TASMANIA / TIN FERN RIVER':'WESTERN TASMANIA / FERN RIVER'}</div><b id="tas-place">Trailhead</b><div id="tas-time"></div></div><div class="tas-readout tas-info"><b id="tas-haul"></b><div id="tas-pack"></div></div></div><div class="tas-cross"></div><div id="tas-prompt"></div><div id="tas-message" class="hidden" role="status"></div><progress id="tas-work" max="1.5" value="0" class="hidden"></progress><nav class="tas-actions" aria-label="Expedition tools"><button id="tas-scoop" class="active">2 · Scoop</button><button id="tas-pan">3 · Pan</button>${northeast?'<button id="tas-sieve">4 · Sieve</button>':''}<button id="tas-interact">E · Interact</button><button id="tas-journal">Journal</button></nav>`;
  document.body.append(hud);
  const modal=document.createElement('section');modal.id='tas-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','tas-heading');
  modal.innerHTML=`<div class="tas-panel"><header><div><div class="tas-title">FIELD JOURNAL / ${northeast?'ROADSIDE RIVER ACCESS':'FOOT ACCESS ONLY'}</div><h1 id="tas-heading">${riverName} catchment</h1></div><button id="tas-resume" class="primary">Enter the catchment</button></header><p>${northeast?'Walk in from the roadside track to Granite Bend, then follow the western bank through Tin Terrace to Basalt Run. Compare small samples of the alluvial wash: classify, wet-sieve and inspect the heavies.':'Carry your gear down to Fern Bend, then follow the river upstream through Slate Narrows to Upper Cascade. Cross at the two shallow fords. Sample small traps, compare your pans and carry your recovery back to the trailhead.'}</p><div class="tas-layout"><div><canvas id="tas-map" class="tas-map" width="520" height="610" role="img" aria-label="Catchment map with route, reaches, campsite and current position"></canvas><p class="tas-muted">North is up. Contours mark 2-metre changes in height.</p></div><div><div id="tas-journal-summary" class="tas-summary"></div><div class="tas-row"><button id="tas-camp">Pitch overnight shelter</button><button id="tas-sleep">Sleep until morning</button></div><p id="tas-camp-note" class="tas-muted"></p><h2>Read the river</h2><div id="tas-reaches"></div><h2>Work a small sample</h2><p>${northeast?'Compare pale loose bar gravel with darker wash at the base of the alluvium. Sapphire, zircon and spinel can occur together; occasional topaz occurs too. Black sands can include cassiterite.':'Gravel held behind a boulder or in a bedrock crack can differ from the loose bar beside it.'} Take a modest scoop and compare results. Heavies are dense minerals; black sand does not guarantee gold. Some parcels are barren.</p><p>${northeast?'The classifier screens out coarse gravel. Wet-sieve the retained wash: gentle jigging settles the heavies, then flip to inspect the centre. Holding too hard loses small stones through the screen. Clay-bound and unscreened wash take longer. Easy demonstrates the technique; Realistic leaves the jig and flip to you. The pan remains available for comparing techniques.':"The classifier removes oversize before loading. Clay-bound material needs breaking apart. Use the pan’s riffles: stratify, wash a thin layer, settle again, then reveal. Easy demonstrates this; Realistic leaves technique and losses to you."}</p><div id="tas-results"></div></div></div><div class="tas-summary"><b>Controls</b><p id="tas-controls"></p><p>Deep pools and steep faces block walking. A heavier pack slows your pace. ${northeast?'The track begins beside the road; this river visit is on foot.':'There is no ute here.'} Bring your finds home when you finish. Your camp and unfinished work will be there when you return.</p></div><div class="tas-row"><button id="tas-locations">Locations & travel · $${TRAVEL_FEE}</button><button id="tas-save">Save expedition</button><button id="tas-return" class="primary">Return home with finds</button><button id="tas-recover">Stuck? Recover to trailhead</button></div><p id="tas-return-note" class="tas-muted"></p><p id="tas-journal-status" role="status"></p></div>`;
  document.body.append(modal);
  const $=id=>document.getElementById(id), sound=new Sound(region);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x8caaa0);scene.fog=new THREE.FogExp2(0x8caaa0,northeast?.0085:.011);
  const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.08,400);camera.rotation.order='YXZ';scene.add(camera);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:settings.aa});renderer.setPixelRatio(Math.min(devicePixelRatio,settings.res));renderer.setSize(innerWidth,innerHeight);
  renderer.autoClear=false;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
  const low=settings.shadows==='off', hemi=new THREE.HemisphereLight(0xc3e0da,0x34432e,2.4);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xe0e6c4,2.1);sun.position.set(-45,80,25);scene.add(sun);
  renderer.shadowMap.enabled=!low;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  sun.castShadow=!low;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-90,right:90,top:110,bottom:-110,near:1,far:200});sun.shadow.bias=-.001;
  const lamp=new THREE.PointLight(0xffe4b3,0,20,1.5);camera.add(lamp);lamp.position.set(0,.1,.1);
  const world=buildCatchment(scene,model,expedition,low,profile);
  const player={x:TRAILHEAD.x,z:TRAILHEAD.z,yaw:.39,pitch:-.14,...expedition.player};
  let playing=false,leaving=false,held=false,tool='scoop',work=0,messageUntil=0,previous=performance.now(),elapsed=0,lampOn=false;
  const keys=new Set();let touch;
  const distance=p=>Math.hypot(player.x-p.x,player.z-p.z);
  const atWater=()=>Math.abs(player.x-riverX(player.z))<riverWidth(player.z)+3 && model.depth(player.x,player.z)<.72;
  const atCamp=()=>distance(CAMP)<5;
  const atGate=()=>distance(TRAILHEAD)<7;
  function notify(text){$('tas-message').textContent=text;$('tas-message').classList.remove('hidden');messageUntil=performance.now()+6500;$('tas-journal-status').textContent=text;}
  function save(){
    if(leaving)return true;
    expedition.player={...player};
    const ok=storeSave(saveExpedition(readSave()||home,expedition,region));
    if(!ok)notify('Storage is full or unavailable. Your last saved expedition is still there; free storage before leaving.');
    return ok;
  }
  function release(){held=false;keys.clear();work=0;if(touch){touch.use=false;touch.move.x=0;touch.move.y=0;touch.run=false;touch.stickId=null;touch.lookId=null;touch.knob.style.transform='';}}
  const pointer=createPointerLock(canvas,{test,touch:IS_TOUCH,onChange:active=>{
    playing=active;release();touch?.show(active&&IS_TOUCH);
    if(active){modal.classList.add('hidden');document.body.classList.remove('tas-modal-open');$('tas-resume').textContent='Back to the river';}
    else if(!panUI.isOpen&&!sieveUI?.isOpen&&!regionUI.isOpen&&modal.classList.contains('hidden'))openJournal();
  }});
  function resume(){sound.init();release();pointer.resume();}
  const panUI=new PanningUI(expedition,{
    assay:sample=>sample.panContents,
    onSave:save,
    onLoad:session=>{expedition.nextPanId=(expedition.nextPanId||0)+1;session.expeditionId=`${expedition.seed}:pan:${expedition.nextPanId}`;},
    onCollect:(sample,result,session)=>{recordRecovery(expedition,sample,{...result,sessionId:session.expeditionId});notify(`Recovered ${(result.gold*1000).toFixed(2)} mg and ${result.finds?.length||0} stones. The result is in your field journal.`);},
    onClose:resume,
  });
  const sieveUI=northeast?new SieveUI(expedition,{onSave:save,onClose:resume,onCollect:result=>notify(result.finds.length?`Collected ${result.finds.length} stones. Recorded in your journal.`:'No gem finds in this load. Compare another sample.')}):null;
  function openSieve(){
    if(!atWater()){notify('Work at the shallow water edge to wet-sieve your wash.');return;}
    release();sieveUI.open();touch?.show(false);pointer.pause();
  }
  const regionUI=new RegionUI({onSave:save,onClose:()=>openJournal()});
  regionUI.onDepart=()=>{leaving=true;};
  $('tas-locations').onclick=()=>{modal.classList.add('hidden');regionUI.open();};
  function openPan(){
    if(!atWater()){notify('Work at the shallow water edge to pan your wash.');return;}
    release();panUI.open();touch?.show(false);pointer.pause();
  }
  const availableTools=northeast?['scoop','pan','sieve']:['scoop','pan'];
  function selectTool(value){
    if(!availableTools.includes(value)||value===tool)return;
    tool=value;held=false;work=0;if(touch){touch.use=false;touch.consumeUsePress();}
    $('tas-scoop').classList.toggle('active',tool==='scoop');$('tas-pan').classList.toggle('active',tool==='pan');$('tas-sieve')?.classList.toggle('active',tool==='sieve');
    view.setTool(tool==='scoop'?'shovel':tool);sound.click();
  }
  bindToolWheel({isPlaying:()=>playing,items:()=>availableTools,current:()=>tool,select:selectTool});

  function interact(){
    if(atGate()){openJournal();return;}
    if(atCamp()){openJournal();$('tas-camp').focus();return;}
    if(tool==='pan'){openPan();return;}
    if(tool==='sieve'){openSieve();return;}
    const s=model.nearSite(player.x,player.z);
    notify(s?`${s.kind==='crevice'?'Bedrock crevice':s.kind==='basal'?'Basal gem wash':'Gravel bar'}: hold Use or left click to take a small parcel.`:northeast?'Follow the western bank. Your journal maps the three gem-wash reaches.':'Follow the banks. The journal records the three reaches and shallow fords.');
  }
  function collectSample(){
    const site=model.nearSite(player.x,player.z),sample=takeSample(expedition,site);
    if(sample){sound.dig();world.disturb(site);save();notify(`${site.kind==='crevice'?'Crevice':site.kind==='basal'?'Basal wash':'Bar'} sample packed. ${expedition.bucket.length}/${sampleCapacity(expedition)} parcels. ${northeast?'Select Sieve or Pan at the water edge.':'Select Pan at the water edge.'}`);}
    else notify(!site?'Move close to a gravel pocket or bedrock crack.':expedition.bucket.length>=sampleCapacity(expedition)?'Your pack is full of wash. Pan a parcel before sampling more.':'This pocket is worked out. Compare another trap.');
    return sample;
  }
  function openJournal(){
    if(panUI.isOpen||sieveUI?.isOpen)return;
    release();modal.classList.remove('hidden');document.body.classList.add('tas-modal-open');touch?.show(false);pointer.pause();save();refreshJournal();$('tas-resume').focus();
  }
  function refreshJournal(){
    $('tas-journal-summary').innerHTML=`<b>${carriedWeight(expedition).toFixed(1)} kg carried · ${expedition.bucket.length}/${sampleCapacity(expedition)} parcels</b><br>Recovered this trip: ${(expedition.gold*1000).toFixed(2)} mg · ${expedition.gems.length} stones<br>${expedition.difficulty==='easy'?'Easy · demonstrated technique':expedition.difficulty==='realistic'?'Realistic · manual technique':'Prospector · forgiving manual technique'}<br>${expedition.nights} overnight stops · ${expedition.trips} completed trips${expedition.panSession?'<br>Unfinished expedition pan saved':''}${expedition.sieveSession?'<br>Unfinished wet sieve saved':''}`;
    const kit=expedition.loadout.includes('camp');
    $('tas-camp').disabled=!kit||!atCamp()||expedition.campPitched;$('tas-sleep').disabled=!kit||!atCamp()||!expedition.campPitched;
    $('tas-camp-note').textContent=!kit?'Pack an overnight kit at home to camp here.':!atCamp()?`The sheltered camping terrace is at ${campName}.`:expedition.campPitched?'Shelter pitched. Sleep until 07:00.':'Pitch your small shelter on this terrace.';
    $('tas-reaches').innerHTML=REACHES.map(r=>`<div class="tas-summary"><b>${r.name} ${expedition.visited.includes(r.id)?'· visited':'· unexplored'}</b><br>${r.description}</div>`).join('');
    $('tas-results').innerHTML='<h2>Your sample results</h2>'+(expedition.tests.length?expedition.tests.slice(-8).reverse().map(p=>`<div class="tas-summary">${REACHES.find(r=>r.id===p.reach)?.name||'River'} · ${p.method==='sieve'?'Wet sieve':'Pan'} · ${(p.gold*1000).toFixed(2)} mg · ${p.finds?.length||0} stones${p.finds?.length?'<br>'+p.finds.map(f=>f.label).join('; '):''}</div>`).join(''):'<p class="tas-muted">No samples completed yet. Keep the source of each parcel in mind.</p>');
    $('tas-controls').textContent=IS_TOUCH?'Left stick: walk; drag the open view: look. Select Scoop and hold Use near a pocket. Select Pan and tap Use at the water edge. Tap Interact at camp or the trailhead.':'WASD: walk · mouse: look · Shift: quick pace · 2: scoop · 3: pan · mouse wheel: tools · left click: use · E: interact · M/N/I/P or Esc: journal · L: lamp';
    if(northeast)$('tas-controls').textContent+=IS_TOUCH?' Select Sieve and tap Use at the water edge; hold and release Jig, then tap Flip to inspect.':' · 4: sieve · hold/release to jig · F: flip';
    $('tas-return').disabled=!atGate();$('tas-return-note').textContent=atGate()?'Take your finds home. Your unfinished samples will be waiting here for your next visit.':'Walk back to the trailhead to return home. If you get stuck, Recover to trailhead brings you back with your pack.';
    drawMap();
  }
  let mapBase;
  function drawMap(){
    const g=$('tas-map').getContext('2d'),mx=x=>(x+90)/145*520,my=z=>(z+115)/255*610;
    mapBase ||= topographyCanvas({width:520,height:610,bounds:{x0:-90,x1:55,z0:-115,z1:140},heightAt:(x,z)=>model.height(x,z),waterAt:(x,z)=>Math.abs(x-riverX(z))<=riverWidth(z)?waterY(z):null});
    g.drawImage(mapBase,0,0);
    g.setLineDash([5,5]);g.strokeStyle='#6b5034';g.lineWidth=2;g.beginPath();ROUTE.forEach(p=>g.lineTo(mx(p.x),my(p.z)));g.stroke();g.setLineDash([]);
    g.font='bold 16px system-ui';
    for(const r of REACHES){const x=mx(riverX(r.z)),y=my(r.z);g.fillStyle='#2a1a0c';g.beginPath();g.arc(x,y,5,0,6.29);g.fill();g.fillText(r.name,x+14,y-6);}
    g.fillStyle='#2a1a0c';g.fillText('Trailhead',mx(TRAILHEAD.x)-20,my(TRAILHEAD.z)-15);g.fillText('Camp',mx(CAMP.x)-59,my(CAMP.z)+7);
    g.fillStyle='#2a1a0c';g.font='12px system-ui';for(const z of (northeast?[]:[14,-47]))g.fillText('Shallow ford',mx(riverX(z))+17,my(z)+4);
    g.fillStyle='#c82921';g.beginPath();g.arc(mx(player.x),my(player.z),6,0,6.29);g.fill();g.strokeStyle='#1b3127';g.lineWidth=2;g.stroke();g.fillText('You',mx(player.x)+10,my(player.z)+20);
    g.fillStyle='#2a1a0c';g.fillText('N ↑',22,30);
  }
  function pitchCamp(){if(atCamp()&&expedition.loadout.includes('camp')){expedition.campPitched=true;save();refreshJournal();}}
  function sleep(){if(atCamp()&&expedition.campPitched&&expedition.loadout.includes('camp')){expedition.hour=7;expedition.nights++;save();refreshJournal();notify(`Morning at ${campName}. The worked ground stays worked.`);}}
  function travelHome(){
    if(!atGate()||!save())return;
    const next=returnHome(readSave());
    if(next&&storeSave(next)){leaving=true;location.reload();}else notify('Could not save the return trip. Your haul is still in this expedition.');
  }
  $('tas-resume').onclick=resume;$('tas-scoop').onclick=()=>selectTool('scoop');$('tas-pan').onclick=()=>selectTool('pan');$('tas-interact').onclick=interact;$('tas-journal').onclick=openJournal;
  if(northeast)$('tas-sieve').onclick=()=>selectTool('sieve');
  $('tas-camp').onclick=pitchCamp;$('tas-sleep').onclick=sleep;$('tas-save').onclick=()=>{if(save())notify('Expedition saved on this browser.');};$('tas-return').onclick=travelHome;
  $('tas-recover').onclick=()=>{Object.assign(player,TRAILHEAD,{yaw:.39,pitch:-.14});save();refreshJournal();notify('Back at the trailhead with your pack.');};
  function look(dx,dy){if(playing){player.yaw-=dx*.0022;player.pitch=THREE.MathUtils.clamp(player.pitch-dy*.0022,-1.5,1.45);}}
  touch=new TouchControls({onLook:look,actions:{inventory:openJournal,map:openJournal,notes:openJournal,pause:openJournal,save:()=>{if(save())notify('Expedition saved.');},lamp:()=>{lampOn=!lampOn;},interact}});
  $('t-use').textContent='Use';
  if(IS_TOUCH){$('tas-scoop').textContent='Scoop';$('tas-pan').textContent='Pan';$('tas-interact').textContent='Interact';if(northeast)$('tas-sieve').textContent='Sieve';}
  document.addEventListener('mousemove',e=>look(e.movementX,e.movementY));
  canvas.addEventListener('mousedown',e=>{if(e.button===0&&playing){held=true;if(tool==='pan')openPan();if(tool==='sieve')openSieve();}});
  canvas.addEventListener('click',()=>{if(!playing&&modal.classList.contains('hidden')&&!panUI.isOpen&&!sieveUI?.isOpen&&!regionUI.isOpen)resume();});
  window.addEventListener('mouseup',()=>{held=false;work=0;});
  document.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('keydown',e=>{
    if(e.code==='F5'||((e.ctrlKey||e.metaKey)&&e.code==='KeyS')){e.preventDefault();save();return;}
    if(panUI.isOpen||sieveUI?.isOpen||regionUI.isOpen)return;
    if(['Escape','KeyP'].includes(e.code)&&!e.repeat){e.preventDefault();if(playing)openJournal();return;}
    if(['KeyM','KeyN','KeyI'].includes(e.code)&&!e.repeat){e.preventDefault();if(playing)openJournal();else resume();return;}
    if(!playing)return;
    keys.add(e.code);if(e.code==='KeyE'&&!e.repeat)interact();const selected=toolForKey(e.code);if(selected)selectTool(selected==='shovel'?'scoop':selected);if(e.code==='KeyL'&&!e.repeat)lampOn=!lampOn;
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));
  modal.addEventListener('keydown',e=>{if(e.code==='Tab'){const items=[...modal.querySelectorAll('button')].filter(b=>!b.disabled);if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus();}}});
  window.addEventListener('blur',()=>{release();if(playing)openJournal();});document.addEventListener('visibilitychange',()=>{if(document.hidden){release();if(playing)openJournal();save();}});window.addEventListener('beforeunload',save);
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);view.setAspect(innerWidth/innerHeight);});
  const view=new Viewmodel(null);view.setTool('shovel');view.setAspect(innerWidth/innerHeight);
  loadAssets().then(()=>view.applyGear(assets.models));
  function move(dt){
    const forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+(touch?.move.y||0),side=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+(touch?.move.x||0);
    const length=Math.max(1,Math.hypot(forward,side)),speed=(keys.has('ShiftLeft')||touch?.run?3.3:2.4)*Math.max(.58,1-(carriedWeight(expedition)-4.2)*.028),f=forward/length*speed*dt,s=side/length*speed*dt;
    return walkStep(model,player,-Math.sin(player.yaw)*f+Math.cos(player.yaw)*s,-Math.cos(player.yaw)*f-Math.sin(player.yaw)*s,world.colliders);
  }
  function frame(now){
    requestAnimationFrame(frame);const dt=Math.min(.05,(now-previous)/1000);previous=now;elapsed+=dt;
    panUI.update(dt);sieveUI?.update(dt);
    if(playing){
      move(dt);expedition.hour=(expedition.hour+dt*.018)%24;
      const reach=model.reach(player.z);if(Math.abs(player.z-reach.z)<22&&Math.abs(player.x-riverX(player.z))<18&&!expedition.visited.includes(reach.id)){expedition.visited.push(reach.id);save();notify(`Reached ${reach.name}. Your journal now records this reach.`);}
      if((held||touch.use)&&tool==='scoop'){work+=dt;if(work>=1.5){collectSample();work=0;held=false;touch.use=false;}}else work=0;
      const use=touch.consumeUsePress()||touch.use;
      if(use&&tool==='pan')openPan();if(use&&tool==='sieve')openSieve();
    }
    const daylight=Math.max(.12,Math.sin((expedition.hour-6)/12*Math.PI));hemi.intensity=.35+daylight*1.35;sun.intensity=daylight*1.6;lamp.intensity=lampOn?5:0;
    camera.position.set(player.x,model.height(player.x,player.z)+1.65,player.z);camera.rotation.set(player.pitch,player.yaw,0);
    view.setLight(daylight,lampOn,false);
    view.update(dt,{moving:playing&&(keys.has('KeyW')||keys.has('KeyS')||keys.has('KeyA')||keys.has('KeyD')||!!touch?.move.x||!!touch?.move.y),running:keys.has('ShiftLeft')||!!touch?.run,stridePhase:elapsed*7,landDip:0,lookDX:0,lookDY:0,panProgress:0,panning:false,sieving:false,sieveProgress:0,jig:0,dirtOnBlade:work>0});
    if(work>0&&view.digT<0)view.playDig();
    scene.background.setHex(0x8caaa0).multiplyScalar(.09+daylight*.91);scene.fog.color.copy(scene.background);
    world.update(playing?dt:0,elapsed,expedition,player);sound.setAmbience(dt,playing?Math.max(0,1-Math.abs(player.x-riverX(player.z))/45):0,panUI.isOpen);
    sound.setEnvironment(dt,{active:playing||panUI.isOpen||!!sieveUI?.isOpen});
    const site=model.nearSite(player.x,player.z);
    $('tas-place').textContent=atGate()?'Trailhead':Math.abs(player.x-riverX(player.z))>24?(northeast?'Forest track':'Rainforest descent'):model.reach(player.z).name;
    $('tas-time').textContent=`${String(Math.floor(expedition.hour)).padStart(2,'0')}:${String(Math.floor(expedition.hour%1*60)).padStart(2,'0')} · ${expedition.difficulty}`;
    $('tas-haul').textContent=`${(expedition.gold*1000).toFixed(2)} mg · ${expedition.gems.length} stones`;$('tas-pack').textContent=`${carriedWeight(expedition).toFixed(1)} kg · ${expedition.bucket.length}/${sampleCapacity(expedition)} parcels`;
    $('tas-work').classList.toggle('hidden',!work);$('tas-work').value=work;
    $('tas-prompt').textContent=atGate()?'E / Interact · trailhead and return home':atCamp()?`E / Interact · ${campName} campsite`:tool==='pan'?'Use at the shallow water edge · pan your saved wash':tool==='sieve'?'Use at the shallow water edge · wet-sieve your saved wash':site?`${site.kind==='crevice'?'Bedrock crack':site.kind==='basal'?'Basal gem wash':'Gravel bar'} · ${Math.max(0,site.capacity-(expedition.siteUse[site.id]||0))} small parcels left · hold Use to sample`:'Follow the river banks · scoop small traps · open Journal for the route';
    if(now>messageUntil)$('tas-message').classList.add('hidden');
    renderer.clear();renderer.render(scene,camera);
    if(playing){renderer.clearDepth();renderer.render(view.scene,view.camera);}
  }
  setInterval(save,30000);openJournal();requestAnimationFrame(frame);
  // Same objects and movement rule as play, exposed for reproducible disposable-save checks.
  window.fossickTas={get playing(){return playing;},get tool(){return tool;},view,region,profile,sieveUI,regionUI,expedition,model,world,player,panUI,save,openJournal,resume,interact,collectSample,move,touch,keys,renderer,camera,scene};
}
