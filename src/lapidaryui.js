import { CUT_STAGES, lapTarget, stepLapidary, collectLapidary } from './lapidary.js';
import { powered } from './campfacilities.js';
import './lapidary.css';
export class LapidaryUI {
  constructor(state,{onSave,onClose}) {
    this.state=state;this.onSave=onSave;this.onClose=onClose;this.isOpen=false;this.working=false;this.saveClock=0;
    this.root=document.createElement('section');this.root.id='lapidary';this.root.className='hidden';this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-labelledby','lap-title');
    this.root.innerHTML=`<div class="lap-shell"><header><div><span class="camp-kicker">YOUR LAPIDARY SHED</span><h1 id="lap-title">Bring out the stone.</h1></div><button id="lap-close">Put aside · Esc</button></header><p id="lap-stone"></p><canvas id="lap-canvas" width="760" height="360" tabindex="0" aria-label="Hold and drag left and right to keep the stone on the moving guide. Arrow keys aim; hold Space to work."></canvas><p id="lap-status" role="status"></p><div class="lap-controls"><label>Pressure<input id="lap-pressure" type="range" min="10" max="100" value="45"></label><button id="lap-water">Cooling water on</button><button id="lap-demo">Start demonstration</button></div><progress id="lap-progress" max="1" value="0"></progress><p id="lap-meters"></p><p>Hold on the work surface and follow the gold guide. Use light pressure and cooling water; heat and poor alignment damage the finish. Keyboard: arrows to aim, hold Space to work.</p><p class="lap-small">A simplified shaping and polishing exercise. Finish quality reflects your alignment, pressure and cooling; individual facet layouts are abstracted.</p><button id="lap-collect" class="hidden">Keep finished stone</button></div>`;
    document.body.append(this.root);this.$=id=>this.root.querySelector('#'+id);this.canvas=this.$('lap-canvas');this.ctx=this.canvas.getContext('2d');
    this.$('lap-close').onclick=()=>this.close();
    this.$('lap-collect').onclick=()=>{if(collectLapidary(state)){this.onSave();this.close();}};
    this.$('lap-demo').onclick=()=>{this.working=!this.working;this.refresh();};
    this.$('lap-water').onclick=()=>{const s=state.camp.lapidarySession;if(s)s.water=!s.water;this.refresh();};
    this.$('lap-pressure').oninput=e=>{const s=state.camp.lapidarySession;if(s)s.pressure=Number(e.target.value)/100;};
    const aim=e=>{const r=this.canvas.getBoundingClientRect();const s=state.camp.lapidarySession;if(s)s.aim=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));};
    this.canvas.onpointerdown=e=>{this.canvas.setPointerCapture(e.pointerId);this.canvas.focus();this.working=true;aim(e);};
    this.canvas.onpointermove=e=>{if(this.working)aim(e);};
    for(const event of ['pointerup','pointercancel','lostpointercapture'])this.canvas.addEventListener(event,()=>this.working=false);
    this.root.addEventListener('keydown',e=>{
      if(e.code==='Escape'){e.preventDefault();e.stopPropagation();this.close();return;}
      if(e.target===this.canvas&&['ArrowLeft','ArrowRight','Space'].includes(e.code)){e.preventDefault();const s=state.camp.lapidarySession;if(!s)return;if(e.code==='Space')this.working=true;else s.aim=Math.max(0,Math.min(1,s.aim+(e.code==='ArrowLeft'?-.025:.025)));}
      if(e.code==='Tab'){const a=[...this.root.querySelectorAll('button,input,canvas')].filter(el=>!el.disabled&&el.getClientRects().length);if(e.shiftKey&&document.activeElement===a[0]){e.preventDefault();a.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===a.at(-1)){e.preventDefault();a[0].focus();}}
    });
    window.addEventListener('keyup',e=>{if(e.code==='Space')this.working=false;});window.addEventListener('blur',()=>this.working=false);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.working=false;});
  }
  open(){if(!this.state.camp.lapidarySession)return;this.isOpen=true;this.working=false;this.root.classList.remove('hidden');document.body.classList.add('lapidary-open');this.refresh();this.$('lap-close').focus();}
  close(){this.isOpen=false;this.working=false;this.root.classList.add('hidden');document.body.classList.remove('lapidary-open');this.onSave();this.onClose();}
  update(dt){if(!this.isOpen||document.hidden)return;const c=this.state.camp,s=c.lapidarySession;if(!s)return;stepLapidary(c,{working:this.working,aim:s.aim,pressure:s.pressure,water:s.water},dt);this.saveClock+=dt;if(this.saveClock>5){this.saveClock=0;this.onSave();}this.refresh();}
  refresh(){
    const c=this.state.camp,s=c.lapidarySession;if(!s)return;const easy=s.difficulty==='easy';
    this.$('lap-stone').textContent=s.rough.label;this.$('lap-pressure').value=s.pressure*100;this.$('lap-pressure').disabled=easy||s.finished;this.$('lap-water').disabled=easy||s.finished;this.$('lap-water').textContent=s.water?'Cooling water on':'Cooling water off';
    this.$('lap-demo').classList.toggle('hidden',!easy||s.finished);this.$('lap-demo').textContent=this.working?'Pause demonstration':'Start demonstration';
    this.$('lap-status').textContent=s.finished?`Finished · ${Math.round(Math.max(.15,1-s.damage)*100)}% finish quality. Collect the stone when ready.`:!powered(c)?'Power is off. Put aside and start or refuel the generator.':c.water<=0?'Water tank empty. Put aside to refill, or dry work will build heat.':`${CUT_STAGES[s.stage]} · ${easy?'watch the guide':'follow the moving gold guide'}`;
    this.$('lap-progress').value=(s.stage+s.progress)/3;this.$('lap-meters').textContent=`Heat ${Math.round(s.heat*100)}% · Finish damage ${Math.round(s.damage*100)}% · Water ${c.water.toFixed(1)} L · Fuel ${c.generatorFuel.toFixed(2)} L`;
    this.$('lap-collect').classList.toggle('hidden',!s.finished);
    const g=this.ctx;g.clearRect(0,0,760,360);g.fillStyle='#102c2a';g.fillRect(0,0,760,360);
    g.strokeStyle='#628879';g.lineWidth=20;g.beginPath();g.arc(380,155,110,0,Math.PI*2);g.stroke();
    g.save();g.translate(380,155);g.rotate(s.workTime*.2);g.fillStyle=s.stage===2?'#9bc4c7':'#708e9a';g.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=70-(s.stage+s.progress)*7;i?g.lineTo(Math.cos(a)*r,Math.sin(a)*r):g.moveTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();g.strokeStyle='#d0e5cf';g.lineWidth=2;g.stroke();g.restore();
    const tx=40+lapTarget(s)*680,px=40+s.aim*680;g.fillStyle='#395646';g.fillRect(40,293,680,14);g.fillStyle='#d5be72';g.fillRect(tx-27,278,54,44);g.fillStyle='#f6eee0';g.beginPath();g.arc(px,300,10,0,7);g.fill();
    g.fillStyle='#b8cbbd';g.font='14px system-ui';g.textAlign='center';g.fillText('KEEP THE WHITE MARKER ON THE GOLD GUIDE',380,340);
  }
}
