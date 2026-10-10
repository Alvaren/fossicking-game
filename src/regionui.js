import { readSave, storeSave } from './save.js';
import { depart, PACK_ITEMS, packWeight, PACK_LIMIT_KG, TASMANIA } from './regions.js';
import './region.css';
export class RegionUI {
  constructor({onSave,onClose}) {
    this.onSave=onSave;this.onClose=onClose;this.isOpen=false;
    this.root=document.createElement('section');this.root.id='region-travel';this.root.className='hidden';
    this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-labelledby','region-heading');
    this.root.innerHTML=`<div class="region-panel"><header><div><span class="region-kicker">AUSTRALIA / FIRST EXPEDITION</span><h1 id="region-heading">Western Tasmania</h1></div><button id="region-close">Back</button></header><h2>Fern River catchment</h2><p>A fictional gold river inspired by Tasmania's western wilderness. Hike down through rainforest, sample three river reaches and carry your recovery home. Your home claim and camp stay here.</p><div class="region-route"><span>Trailhead</span><span>Fern Bend</span><span>Slate Narrows</span><span>Upper Cascade</span></div><h3>Pack for a walk in</h3><p>Pan, hand scoop, lamp, pack, food and water: 4.2 kg. Heavy camp equipment and the ute stay at home.</p><div id="region-pack"></div><p id="region-weight" aria-live="polite"></p><p id="region-resume"></p><p class="region-note">Pan ownership and difficulty carry across. This first expedition uses hand sampling and panning; underwater sniping comes later. Northeast Tasmania's sapphire country is a separate future area.</p><p id="region-error" role="status"></p><button id="region-depart" class="region-primary">Travel to the trailhead</button></div>`;
    document.body.append(this.root);
    for(const item of PACK_ITEMS){const label=document.createElement('label');label.className='region-item';label.innerHTML=`<input type="checkbox" value="${item.id}" ${item.id!=='classifier'?'checked':''}><span><b>${item.name} · ${item.kg.toFixed(1)} kg</b><br>${item.detail}</span>`;this.root.querySelector('#region-pack').append(label);}
    this.root.addEventListener('change',()=>this.refresh());
    this.root.querySelector('#region-close').onclick=()=>this.close();
    this.root.querySelector('#region-depart').onclick=()=>this.travel();
    this.root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();this.close();}if(e.key==='Tab'){const controls=[...this.root.querySelectorAll('button,input')].filter(x=>!x.disabled);if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===controls.at(-1)){e.preventDefault();controls[0].focus();}}});
  }
  get selection(){return [...this.root.querySelectorAll('input:checked')].map(i=>i.value);}
  refresh(){const kg=packWeight(this.selection);this.root.querySelector('#region-weight').textContent=`Pack ${kg.toFixed(1)} / ${PACK_LIMIT_KG} kg before collecting wash`;this.root.querySelector('#region-depart').disabled=kg>PACK_LIMIT_KG;const old=readSave()?.expeditions?.[TASMANIA];this.root.querySelector('#region-resume').textContent=old?`Previous visits: ${old.trips}. Worked pockets and unfinished pans are preserved.`:'Your first visit starts a persistent catchment. Worked pockets stay worked.';}
  open(){this.isOpen=true;this.root.classList.remove('hidden');document.body.classList.add('region-open');this.refresh();this.root.querySelector('#region-close').focus();}
  close(){this.isOpen=false;this.root.classList.add('hidden');document.body.classList.remove('region-open');this.onClose();}
  travel(){
    if(!this.onSave()){this.root.querySelector('#region-error').textContent='Could not save your home claim. Free browser storage before travelling.';return;}
    const next=depart(readSave(),this.selection);
    if(!next){this.root.querySelector('#region-error').textContent='Check the pack limit. Keep the sample bucket if your previous trip still contains more than one parcel.';return;}
    if(!storeSave(next)){this.root.querySelector('#region-error').textContent='Could not save the expedition. You are still at home.';return;}
    // Caller suppresses its unload save only after the transition was persisted.
    this.onDepart?.();location.reload();
  }
}
