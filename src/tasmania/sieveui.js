import * as THREE from 'three';
import { Viewmodel } from '../tools.js';
import { settings } from '../settings.js';
import { startSieve, stepSieve, jigZone, flipSieve, collectSieve } from './sieving.js';
export class SieveUI {
  constructor(expedition,{onSave,onClose,onCollect}) {
    this.e=expedition;this.onSave=onSave;this.onClose=onClose;this.onCollect=onCollect;
    this.isOpen=false;this.held=false;this.saveTime=0;
    this.root=document.createElement('section');this.root.id='wet-sieve';this.root.className='hidden';
    this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-labelledby','sieve-heading');
    this.root.innerHTML=`<div class="sieve-panel"><header><div><div class="tas-title">NORTHEAST TASMANIA / WET SIEVING</div><h1 id="sieve-heading">Settle the heavies</h1></div><button id="sieve-close">Put aside</button></header><div class="sieve-layout"><div><canvas id="sieve-view" tabindex="0" aria-label="Wet sieve. Hold to jig; release to ease off. Space also jigs and F flips."></canvas><div class="sieve-gauge" role="meter" aria-label="Jig intensity" aria-valuemin="0" aria-valuemax="100"><span id="sieve-zone"></span><i id="sieve-needle"></i></div><p id="sieve-status" role="status"></p></div><div><p id="sieve-kit"></p><p>Jig under water to settle dense stones below the lighter gravel. Hold to increase intensity; release to ease off. Keep the needle in the green, then flip. Excess force scrambles the layers and loses small stones.</p><label>Stratified <progress id="sieve-progress" max="1" value="0"></progress></label><p id="sieve-loss"></p><div class="tas-row"><button id="sieve-load">Load wash</button><button id="sieve-jig">Hold to jig</button><button id="sieve-flip">Flip · F</button><button id="sieve-collect" class="primary">Collect finds</button></div><div id="sieve-result" aria-live="polite"></div><p class="tas-muted">The classifier removes coarse gravel before loading. Clay and unscreened wash take longer to work. Dark heavies include spinel and cassiterite; a dark centre need not contain a sapphire. Mesh losses and settling rates are simplified game rules.</p></div></div></div>`;
    document.body.append(this.root);this.$=id=>this.root.querySelector('#'+id);
    this.$('sieve-close').onclick=()=>this.close();
    this.$('sieve-load').onclick=()=>{startSieve(this.e);this.shown=null;this.onSave();this.refresh();};
    this.$('sieve-flip').onclick=()=>this.flip();
    this.$('sieve-collect').onclick=()=>{const result=collectSieve(this.e);if(result){this.onCollect(result);this.onSave();this.refresh();}};
    for(const target of [this.$('sieve-jig'),this.$('sieve-view')]){
      target.addEventListener('pointerdown',ev=>{if(ev.button!==0)return;ev.preventDefault();target.focus();target.setPointerCapture(ev.pointerId);this.held=true;});
      for(const event of ['pointerup','pointercancel','lostpointercapture'])target.addEventListener(event,()=>{this.held=false;});
    }
    this.root.addEventListener('keydown',ev=>{
      if(ev.code==='Escape'){ev.stopPropagation();this.close();}
      if(ev.code==='Space'&&['sieve-jig','sieve-view'].includes(ev.target.id)){ev.preventDefault();this.held=true;}
      if(ev.code==='KeyF'&&!ev.repeat){ev.preventDefault();this.flip();}
      if(ev.key==='Tab'){const items=[...this.root.querySelectorAll('button,canvas')].filter(x=>!x.disabled);if(ev.shiftKey&&document.activeElement===items[0]){ev.preventDefault();items.at(-1).focus();}else if(!ev.shiftKey&&document.activeElement===items.at(-1)){ev.preventDefault();items[0].focus();}}
    });
    window.addEventListener('keyup',()=>{this.held=false;});window.addEventListener('blur',()=>{this.held=false;});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.held=false;});
  }
  setupView(){
    if(this.renderer)return;
    this.renderer=new THREE.WebGLRenderer({canvas:this.$('sieve-view'),antialias:settings.aa});this.renderer.setPixelRatio(Math.min(devicePixelRatio,settings.res));
    this.renderer.setClearColor(0x1b302a);this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.view=new Viewmodel(null);this.view.setTool('sieve');this.view.tools.sieve.userData.base.set(0,-.025,-.48);
  }
  open(){this.isOpen=true;this.held=false;this.shown=null;this.root.classList.remove('hidden');document.body.classList.add('sieving-open');this.setupView();this.refresh();this.$('sieve-close').focus();}
  close(){this.held=false;this.onSave();this.isOpen=false;this.root.classList.add('hidden');document.body.classList.remove('sieving-open');this.onClose();}
  flip(){if(flipSieve(this.e.sieveSession)){this.held=false;this.onSave();this.refresh();}}
  refresh(){
    const s=this.e.sieveSession,easy=this.e.difficulty==='easy';
    this.$('sieve-load').disabled=!!s||!this.e.bucket.length;
    this.$('sieve-load').textContent=`Load wash (${this.e.bucket.length})`;
    this.$('sieve-jig').disabled=!s||s.flipped||easy;
    this.$('sieve-flip').disabled=!s||s.flipped||s.strat<.05||easy;
    this.$('sieve-collect').disabled=!s?.flipped;
    this.$('sieve-progress').value=s?.strat||0;
    this.$('sieve-status').textContent=!s?'Load a saved parcel at the water edge.':s.flipped?'Flipped — inspect the centre and collect your finds.':easy?'Easy: demonstrating gentle jigging, settling and the flip.':s.strat>=1?'Settled. Flip now.':'Hold and release to keep a gentle jig in the green band.';
    this.$('sieve-kit').textContent=s?`${s.nested?'Nested screens':'Single coarse sieve'} · ${s.classified?'Classified wash':'Unscreened wash'} · ${Math.round((s.sample.clay||0)*100)}% clay`:'Your partly worked sieve is saved separately from your pan.';
    this.$('sieve-loss').textContent=s?.lost>0?`${s.lost.toFixed(1)} s too hard — tiny stones can pass through the mesh.`:'Avoid excessive jigging to retain small stones.';
    this.$('sieve-result').replaceChildren();
    if(s?.flipped){const heading=document.createElement('h2');heading.textContent=s.result.finds.length?`${s.result.finds.length} stones recovered`:'No gem finds in this load';this.$('sieve-result').append(heading);for(const f of s.result.finds){const row=document.createElement('p');row.textContent=f.label;this.$('sieve-result').append(row);}}
  }
  update(dt){
    if(!this.isOpen||document.hidden)return;
    const s=this.e.sieveSession,wasFlipped=s?.flipped;
    stepSieve(s,this.held,dt,this.e.difficulty);
    if(s?.flipped&&!wasFlipped)this.onSave();
    if(s?.flipped&&this.shown!==s.id){this.view.showSieveResult(s.result.finds,s.strat);this.shown=s.id;}
    if(!s?.flipped&&(this.shown||this.view.sieveResultT>0)){
      this.view.sieveFinds.clear();this.view.sieveResultT=0;this.view.flipT=-1;this.shown=null;
    }
    this.view.update(dt,{moving:false,running:false,stridePhase:0,landDip:0,lookDX:0,lookDY:0,sieving:!!s&&!s.flipped&&s.I>.08,sieveProgress:s?.strat||0,jig:s?.I||0});
    if(s?.flipped){this.view.sieveResultT=10;this.view.pebbles.visible=true;}
    const canvas=this.$('sieve-view'),w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
    if(this.width!==w||this.height!==h){this.width=w;this.height=h;this.renderer.setSize(w,h,false);this.view.setAspect(w/h);}
    this.renderer.render(this.view.scene,this.view.camera);
    const [lo,hi]=s?jigZone(s):[.46,.66];this.$('sieve-zone').style.cssText=`left:${lo*100}%;width:${(hi-lo)*100}%`;
    this.$('sieve-needle').style.left=`${(s?.I||0)*100}%`;this.root.querySelector('[role="meter"]').setAttribute('aria-valuenow',Math.round((s?.I||0)*100));
    this.refreshTime=(this.refreshTime||0)+dt;if(this.refreshTime>.2){this.refreshTime=0;this.refresh();}
    this.saveTime+=dt;if(this.saveTime>3){this.saveTime=0;this.onSave();}
  }
}
