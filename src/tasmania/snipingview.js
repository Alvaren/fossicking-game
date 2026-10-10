import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { rockMaterial } from '../rockmaterials.js';
import { goldMaterial, nuggetGeometry } from '../materials.js';
import { findStudioEnvironment } from '../findvisuals.js';
import { automaticSniping, exposed, SNIPING_TOOLS, SNIPING_LABELS, SNIPING_FORCES, workSniping } from '../sniping.js';
import './sniping.css';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// A close-up work view on the game's renderer. The expedition controller owns
// pointer lock, look, movement, Use, wheel, pause and all touch event bindings.
export class SnipingView {
  constructor(renderer,expedition,{onSave,onExit,onRelease}) {
    Object.assign(this,{renderer,expedition,onSave,onExit,onRelease,active:false,tool:'fan',force:'gentle',target:-1,time:0,saveTimer:0});
    this.camera=new THREE.PerspectiveCamera(64,innerWidth/innerHeight,.02,30);this.camera.rotation.order='YXZ';
    this.ray=new THREE.Raycaster();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.06);this.hit=new THREE.Vector3();
    this.root=document.createElement('section');this.root.id='sniping-hud';this.root.className='hidden';
    this.root.innerHTML=`<div class="snipe-mask"></div><div class="snipe-title"><span>UNDER THE SURFACE</span><b id="snipe-place"></b><small id="snipe-visibility"></small></div><div id="snipe-readout" role="status"></div><div class="snipe-controls"><div class="snipe-force" aria-label="Stroke strength">${Object.keys(SNIPING_FORCES).map(f=>`<button data-force="${f}">${f[0].toUpperCase()+f.slice(1)}</button>`).join('')}</div><nav aria-label="Sniping tools">${SNIPING_TOOLS.map((t,i)=>`<button data-snipe-tool="${t}">${i+1} · ${SNIPING_LABELS[t]}</button>`).join('')}<button id="snipe-exit">E · Bank</button></nav></div>`;
    document.body.append(this.root);this.$=id=>this.root.querySelector('#'+id);
    for(const b of this.root.querySelectorAll('[data-snipe-tool]'))b.onclick=()=>{this.onRelease();this.select(b.dataset.snipeTool);};
    for(const b of this.root.querySelectorAll('[data-force]'))b.onclick=()=>{this.onRelease();this.force=b.dataset.force;this.refreshButtons();};
    this.$('snipe-exit').onclick=onExit;
    this.environment=findStudioEnvironment(renderer);
  }
  select(tool){if(SNIPING_TOOLS.includes(tool)){this.tool=tool;this.refreshButtons();}}
  refreshButtons(){
    for(const b of this.root.querySelectorAll('[data-snipe-tool]'))b.classList.toggle('active',b.dataset.snipeTool===this.tool);
    for(const b of this.root.querySelectorAll('[data-force]')){b.classList.toggle('active',b.dataset.force===this.force);b.disabled=this.expedition.difficulty==='easy';}
  }
  open(site){
    this.dispose();this.site=site;this.pocket=this.expedition.snipingPockets[site.id];
    this.pose={x:0,z:1.45,yaw:0,pitch:-.9};this.active=true;this.tool='fan';this.force='gentle';this.target=-1;this.message='';this.messageUntil=0;
    this.build();this.root.classList.remove('hidden');document.body.classList.add('sniping-open');
    this.$('snipe-place').textContent=site.id.replace('pool-','').split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(' ')+' · bedrock pool';
    this.refreshButtons();
  }
  close(){this.active=false;this.root.classList.add('hidden');document.body.classList.remove('sniping-open');this.onSave();}
  look(dx,dy){this.pose.yaw-=dx*.0022;this.pose.pitch=clamp(this.pose.pitch-dy*.0022,-1.52,-.25);}
  move(dt,forward,side){
    const n=Math.max(1,Math.hypot(forward,side)),f=forward/n*dt*.55,s=side/n*dt*.55,p=this.pose;
    p.x=clamp(p.x-Math.sin(p.yaw)*f+Math.cos(p.yaw)*s,-1.75,1.75);
    p.z=clamp(p.z-Math.cos(p.yaw)*f-Math.sin(p.yaw)*s,-1.35,1.7);
  }
  positionCamera(){
    this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();
    this.camera.position.set(this.pose.x,1.08,this.pose.z);this.camera.rotation.set(this.pose.pitch,this.pose.yaw,0);this.camera.updateMatrixWorld();
  }
  aim(){
    this.positionCamera();this.ray.setFromCamera(new THREE.Vector2(),this.camera);
    if(!this.ray.ray.intersectPlane(this.plane,this.hit))return -1;
    let target=-1,d=.27;
    for(let i=0;i<this.pocket.cells.length;i++){
      const c=this.pocket.cells[i],distance=Math.hypot(this.hit.x-c.x,this.hit.z-c.z);
      if(distance<d){target=i;d=distance;}
    }
    return target;
  }
  update(dt,{using=false,playing=true}={}){
    if(!this.active)return;
    this.time+=dt;this.target=this.aim();
    let action=playing&&using?{target:this.target,tool:this.tool,force:SNIPING_FORCES[this.force]}:null;
    if(action&&this.expedition.difficulty==='easy'){
      action=automaticSniping(this.pocket);
      if(action.target>=0){
        const c=this.pocket.cells[action.target];
        const desired=new THREE.Vector3(c.x,.06,c.z).sub(this.camera.position);
        const yaw=Math.atan2(-desired.x,-desired.z),pitch=Math.atan2(desired.y,Math.hypot(desired.x,desired.z));
        this.pose.yaw+=Math.atan2(Math.sin(yaw-this.pose.yaw),Math.cos(yaw-this.pose.yaw))*Math.min(1,dt*5);
        this.pose.pitch+=(pitch-this.pose.pitch)*Math.min(1,dt*5);this.positionCamera();
        // Wait until the visible tool reaches the crack; do not work off screen.
        if(this.aim()!==action.target)action=null;
        else {this.select(action.tool);this.target=action.target;}
      }else action=null;
    }
    const result=playing?workSniping(this.expedition,this.site,action,dt):{gold:0};
    if(result.completed){this.message=result.reason;this.messageUntil=this.time+3;this.onSave();}
    if(playing){this.saveTimer+=dt;if(this.saveTimer>5){this.onSave();this.saveTimer=0;}}
    const p=this.pocket,cloud=p.cloud;
    this.scene.fog.color.set(0x315e56).lerp(new THREE.Color(0x71684b),cloud);this.scene.background.copy(this.scene.fog.color);
    this.scene.fog.density=.11+cloud*1.65;this.dust.material.opacity=.06+cloud*.65;
    this.dust.position.x=Math.sin(this.time*.3)*.12;this.dust.position.z=(this.time*.035)%1;
    this.caustics.material.uniforms.time.value=this.time;this.caustics.material.uniforms.strength.value=(1-cloud)*.14;
    for(let i=0;i<p.cells.length;i++){
      const c=p.cells[i],v=this.cells[i],loose=clamp(c.loose/c.capacity,0,1),bound=clamp(c.bound/c.capacity,0,1);
      v.gravel.count=Math.ceil(loose*45);v.fill.visible=bound>.012;v.fill.scale.y=Math.max(.01,bound*2);
      v.gold.visible=exposed(c)&&c.gold>0;v.gold.scale.setScalar(c.initialGold?Math.max(.01,c.gold/c.initialGold):1);
    }
    this.animateTool(!!action&&this.target>=0,dt);
    this.$('snipe-visibility').textContent=cloud>.78?'Silted out · rest and let it clear':cloud>.5?'Cloudy water · let the silt settle':cloud>.2?'A little silt in the water':'Clear water';
    const c=p.cells[this.target],done=p.cells.filter(c=>c.inspected).length;
    let instruction=this.expedition.difficulty==='easy'?'Hold Use to watch the search, fan, pick and recovery.':'Look along the cracks · WASD / stick to shift position · hold Use to work';
    if(c)instruction=c.inspected?'This crack has been checked. Search the neighbouring bedrock.':exposed(c)?(c.gold>0?'Gold exposed · select Snuffer and hold Use.':'Cleared crack · inspect with the snuffer.'):c.loose>c.capacity*.09?'Loose gravel covers the crack · fan it gently.':'Packed crevice fill · loosen it with the pick.';
    if(result.reason&&!result.completed)instruction=result.reason;
    if(cloud>.78)instruction='Stop working and let the suspended silt settle.';
    if(done===p.cells.length)instruction='This patch has been searched. Return to the bank to explore another reach.';
    if(this.time<this.messageUntil)instruction=this.message;
    this.$('snipe-readout').textContent=`${instruction}  ·  ${(p.recoveredGold*1000).toFixed(2)} mg recovered · ${done}/${p.cells.length} cracks checked`;
  }
  animateTool(working){
    for(const [key,g] of Object.entries(this.tools))g.visible=key===this.tool;
    const g=this.tools[this.tool],stroke=working?Math.sin(this.time*(this.force==='firm'?16:8)):0;
    // Tool tips arrive at the crosshair's bedrock contact point while working.
    const local=this.camera.worldToLocal(this.hit.clone());
    const inReach=this.target>=0&&working;
    g.position.copy(inReach?local:new THREE.Vector3(.38,-.27,-.7));
    g.position.x+=inReach?(this.tool==='fan'?stroke*.1:stroke*.015):0;
    g.position.y+=inReach?.07+Math.abs(stroke)*.025:0;
    g.rotation.set(.3,0,this.tool==='fan'?stroke*.18:-.35);
  }
  build(){
    const rand=mulberry32(this.site.seed^0x7734),scene=this.scene=new THREE.Scene();
    scene.background=new THREE.Color(0x315e56);scene.fog=new THREE.FogExp2(0x315e56,.11);scene.environment=this.environment.texture;
    scene.add(this.camera,new THREE.HemisphereLight(0xbbe7d0,0x263931,2));
    const sun=new THREE.DirectionalLight(0xfff0b7,3.2);sun.position.set(-3,6,2);scene.add(sun);
    this.ownedMaterials=[];
    const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.55,...extra});this.ownedMaterials.push(m);return m;};
    const slate=rockMaterial('slate',{wet:true}),granite=rockMaterial('granite',{wet:true}),quartz=rockMaterial('quartz',{wet:true});
    const silt=mat(0x6e6244),dark=mat(0x182b26),blackSand=mat(0x253232,{roughness:.3});
    const mesh=(g,m,parent=scene)=>{const o=new THREE.Mesh(g,m);parent.add(o);return o;};
    mesh(new THREE.BoxGeometry(14,.35,14),slate).position.y=-.25;
    // Layered, rounded slate lips flank the fissures; no guide rings or target markers.
    this.cells=this.pocket.cells.map(c=>{
      const g=new THREE.Group();g.position.set(c.x,0,c.z);g.rotation.y=c.angle;scene.add(g);
      for(const side of [-1,1]){
        const rock=mesh(new THREE.IcosahedronGeometry(1,1),slate,g);
        rock.scale.set(.23+rand()*.09,.12+rand()*.02,.36+rand()*.08);rock.position.set(side*.22,-.015,0);rock.rotation.y=(rand()-.5)*.2;
      }
      const crack=mesh(new THREE.BoxGeometry(.105,.045,.53),dark,g);crack.position.y=.015;
      const fill=mesh(new THREE.IcosahedronGeometry(1,2),silt,g);fill.position.y=.055;fill.scale.set(.072,.055,.26);
      // Parent scale keeps y-only depletion independent from the fill's shape.
      const fillHolder=new THREE.Group();g.remove(fill);fillHolder.add(fill);g.add(fillHolder);
      const gravel=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),granite,45),dummy=new THREE.Object3D();g.add(gravel);
      for(let i=0;i<45;i++){
        dummy.position.set((rand()-.5)*.14,.105+rand()*.025,(rand()-.5)*.51);dummy.scale.setScalar(.016+rand()*.018);dummy.rotation.set(rand()*3,rand()*3,rand()*3);dummy.updateMatrix();gravel.setMatrixAt(i,dummy.matrix);
      }
      const gold=new THREE.Group();g.add(gold);gold.position.y=.061;
      if(c.initialGold>0)for(let i=0;i<3;i++){
        const material=goldMaterial('fine');
        const flake=mesh(nuggetGeometry(this.site.seed+i+c.id.length+Math.floor(c.x*100),{detail:1}),material,gold);
        flake.position.set((rand()-.5)*.035,.004,(rand()-.5)*.34);flake.scale.set(.018+rand()*.009,.006,.012+rand()*.009);flake.rotation.y=rand()*6.28;
      }
      // Permanent dark heavies survive fanning and can occur in barren cracks.
      const heavies=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.008,0),blackSand,14);g.add(heavies);
      for(let i=0;i<14;i++){dummy.position.set((rand()-.5)*.08,.05,(rand()-.5)*.5);dummy.scale.setScalar(1);dummy.updateMatrix();heavies.setMatrixAt(i,dummy.matrix);}
      return {gravel,fill:fillHolder,gold};
    });
    const cobbles=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),slate,100),d=new THREE.Object3D();scene.add(cobbles);
    for(let i=0;i<100;i++){
      const a=rand()*Math.PI*2,r=2.1+rand()*3;d.position.set(Math.cos(a)*r,rand()*.04,Math.sin(a)*r);
      d.scale.set(.08+rand()*.3,.04+rand()*.13,.08+rand()*.3);d.rotation.set(rand()*.1,rand()*6.28,rand()*.1);d.updateMatrix();cobbles.setMatrixAt(i,d.matrix);
    }
    // Thin quartz seams and green growth are scenery, never recovery targets.
    for(let i=0;i<4;i++){const seam=mesh(new THREE.BoxGeometry(.02,.012,5),quartz);seam.position.set(-2+i*1.3,-.06,-.5);seam.rotation.y=.4;}
    const dustGeo=new THREE.BufferGeometry(),positions=Float32Array.from({length:720},(_,i)=>i%3===1?rand()*1.3:(rand()-.5)*5);
    dustGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const dustMat=new THREE.PointsMaterial({color:0xa9aa85,size:.014,transparent:true,opacity:.1,depthWrite:false});this.ownedMaterials.push(dustMat);
    this.dust=new THREE.Points(dustGeo,dustMat);scene.add(this.dust);
    const causticMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      uniforms:{time:{value:0},strength:{value:.14}},vertexShader:'varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'varying vec2 p;uniform float time;uniform float strength;void main(){vec2 q=p*11.;float v=sin(q.x+sin(q.y+time*.7))+sin(q.y*1.3+cos(q.x-time*.5));float c=pow(max(0.,1.-abs(v)*1.6),5.);gl_FragColor=vec4(.53,.83,.65,c*strength);}'});
    this.ownedMaterials.push(causticMat);this.caustics=mesh(new THREE.PlaneGeometry(10,10),causticMat);this.caustics.rotation.x=-Math.PI/2;this.caustics.position.y=.145;
    const skin=mat(0x997355),metal=mat(0x879394,{metalness:.8,roughness:.3}),handle=mat(0x5a3725),bottle=mat(0xc6ddd4,{transparent:true,opacity:.65,roughness:.25});
    this.tools={};for(const key of SNIPING_TOOLS){const g=new THREE.Group();this.camera.add(g);this.tools[key]=g;}
    const palm=mesh(new THREE.SphereGeometry(.075,12,8),skin,this.tools.fan);palm.scale.set(1.2,.35,1);palm.position.set(.09,0,.08);
    for(let i=0;i<4;i++){const finger=mesh(new THREE.CapsuleGeometry(.016,.095,3,7),skin,this.tools.fan);finger.rotation.z=-Math.PI/2;finger.position.set(.025,0,i*.031-.01);}
    const pick=this.tools.pick;mesh(new THREE.CapsuleGeometry(.027,.17,4,8),handle,pick).position.set(.03,.16,0);
    const wire=new THREE.CatmullRomCurve3([new THREE.Vector3(.03,.24,0),new THREE.Vector3(.02,.08,0),new THREE.Vector3(0,0,0),new THREE.Vector3(-.025,-.005,0)]);
    mesh(new THREE.TubeGeometry(wire,12,.007,7,false),metal,pick);
    const snuffer=this.tools.snuffer;
    mesh(new THREE.CylinderGeometry(.055,.05,.16,14),bottle,snuffer).position.set(.035,.17,0);
    mesh(new THREE.CylinderGeometry(.027,.045,.025,12),handle,snuffer).position.set(.035,.073,0);
    const nozzle=mesh(new THREE.CylinderGeometry(.007,.004,.07,8),bottle,snuffer);nozzle.position.set(.022,.032,0);nozzle.rotation.z=-.3;
    this.positionCamera();
  }
  dispose(){
    if(!this.scene)return;
    const geometries=new Set();this.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.isInstancedMesh)o.dispose();});
    for(const g of geometries)g.dispose();for(const m of this.ownedMaterials)m.dispose();
    for(const g of Object.values(this.tools))this.camera.remove(g);this.scene.remove(this.camera);this.scene=null;
  }
}
