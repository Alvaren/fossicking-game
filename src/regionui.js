import { readSave, storeSave } from './save.js';
import { travelTo, EXPEDITIONS, NORTHEAST, PACK_ITEMS, packWeight, PACK_LIMIT_KG, TASMANIA, TRAVEL_FEE } from './regions.js';
import { RegionMap, LOCATIONS } from './regionmap.js';
import './region.css';
export class RegionUI {
  constructor({onSave,onClose}) {
    this.onSave=onSave;this.onClose=onClose;this.isOpen=false;this.destination=TASMANIA;
    this.root=document.createElement('section');this.root.id='region-travel';this.root.className='hidden';
    this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-labelledby','region-heading');
    this.root.innerHTML=`<div class="region-panel"><header><div><span class="region-kicker">MAP / LOCATIONS & TRAVEL</span><h1 id="region-heading">Australia</h1></div><button id="region-close">Back to map</button></header><div id="region-destinations"></div><section id="region-details"><h2 id="region-name"></h2><p id="region-description"></p><div id="region-loadout"><h3>Pack for a walk in</h3><p>Hand tools, lamp, pack, food and water: 4.2 kg. Choose equipment for the river.</p><div id="region-pack"></div><p id="region-weight" aria-live="polite"></p><p id="region-resume"></p></div><p id="region-fee"></p><p id="region-error" role="status"></p><button id="region-depart" class="region-primary"></button></section></div>`;
    document.body.append(this.root);this.$=id=>this.root.querySelector('#'+id);
    this.map=new RegionMap(this.$('region-destinations'),id=>{this.destination=id;this.refresh();});
    for(const item of PACK_ITEMS){const label=document.createElement('label');label.className='region-item';label.innerHTML=`<input type="checkbox" value="${item.id}" ${item.id!=='classifier'?'checked':''}><span><b>${item.name} · ${item.kg.toFixed(1)} kg</b><br>${item.detail}</span>`;this.$('region-pack').append(label);}
    this.root.addEventListener('change',()=>this.refresh());this.$('region-close').onclick=()=>this.close();this.$('region-depart').onclick=()=>this.travel();
    this.root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();this.close();}if(e.key==='Tab'){const controls=[...this.root.querySelectorAll('button,input,[tabindex="0"]')].filter(x=>!x.disabled&&x.getClientRects().length);if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===controls.at(-1)){e.preventDefault();controls[0].focus();}}});
  }
  get selection(){return [...this.root.querySelectorAll('input:checked')].map(i=>i.value);}
  refresh(){
    const save=readSave(),current=save?.activeRegion||'new-england',l=LOCATIONS.find(l=>l.id===this.destination),kg=packWeight(this.selection),old=save?.expeditions?.[this.destination];
    this.map.select(l.id,current);this.$('region-name').textContent=l.name;
    this.$('region-description').textContent=!l.available?'Travel to this destination is not yet available.':l.id===NORTHEAST?'Tin Fern River: sapphire, zircon and spinel wash. Walk in from the roadside track, classify gravel and wet-sieve the heavies.':l.id===TASMANIA?'Fern River catchment: steep forest tracks, gravel bars and bedrock cracks. Carry your pan down to the river and compare small samples.':'Return to your home claim and camp with your finds. Unfinished river samples will be waiting at their location when you visit again.';
    this.$('region-loadout').classList.toggle('hidden',!EXPEDITIONS.includes(l.id)||current===l.id);
    this.$('region-weight').textContent=`Pack ${kg.toFixed(1)} / ${PACK_LIMIT_KG} kg before collecting wash`;
    this.$('region-resume').textContent=old?`Previous visits: ${old.trips}. Your unfinished samples are waiting for you.`:'Worked pockets stay worked between visits.';
    this.$('region-fee').textContent=`Travel fee: $${TRAVEL_FEE}`;
    this.$('region-depart').textContent=current===l.id?'You are here':!l.available?'Not yet available':`Travel to ${l.name} · $${TRAVEL_FEE}`;
    this.$('region-depart').disabled=!l.available||l.id===current||(EXPEDITIONS.includes(l.id)&&kg>PACK_LIMIT_KG);
    this.$('region-error').textContent='';
  }
  open(){this.destination=EXPEDITIONS.includes(readSave()?.activeRegion)?'new-england':TASMANIA;this.isOpen=true;this.root.classList.remove('hidden');document.body.classList.add('region-open');this.refresh();this.$('region-close').focus();}
  close(){this.isOpen=false;this.root.classList.add('hidden');document.body.classList.remove('region-open');this.onClose();}
  travel(){
    if(this.$('region-depart').disabled)return;
    if(!this.onSave()){this.$('region-error').textContent='Could not save your current location. Free browser storage before travelling.';return;}
    const saved=readSave(),next=travelTo(saved,this.destination,this.selection);
    if(!next){this.$('region-error').textContent='Check your travel funds and pack. Keep the sample bucket if your previous trip still contains more than one parcel.';return;}
    if(!storeSave(next)){this.$('region-error').textContent='Could not save the trip. You are still at your current location.';return;}
    this.onDepart?.();location.reload();
  }
}
