import {AUSTRALIA} from './australia-outline.js';
export const LOCATIONS = [
  {id:'new-england',name:'New England',state:'NSW',coord:[151.112,-29.780],available:true},
  {id:'tasmania-west',name:'Western Tasmania',state:'TAS',coord:[145.5,-42],available:true},
  {id:'golden-triangle',name:'Golden Triangle',state:'VIC',coord:[143.734,-36.860],available:true},
  {id:'coober-pedy',name:'Coober Pedy',state:'SA',coord:[134.755,-29.013]},
  {id:'lightning-ridge',name:'Lightning Ridge',state:'NSW',coord:[147.97,-29.43]},
  {id:'ne-tasmania',name:'Northeast Tasmania',state:'TAS',coord:[147.875,-41.130],available:true},
  {id:'wa-goldfields',name:'WA Goldfields',state:'WA',coord:[121.17,-30.95],available:true},
  {id:'qld-gemfields',name:'Central QLD Gemfields',state:'QLD',coord:[147.698,-23.419],available:true},
  {id:'agate-creek',name:'Agate Creek',state:'QLD',coord:[143.5603,-19.0045]},
  {id:'harts-range',name:'Harts Range',state:'NT',coord:[134.5,-23.0167]},
];
const point=([lon,lat])=>[(lon-112)/44*560,(-10-lat)/35*480];
export class RegionMap {
  constructor(parent,onSelect){
    this.root=document.createElement('div');this.root.className='region-map';
    const polygons=AUSTRALIA.type==='Polygon'?[AUSTRALIA.coordinates]:AUSTRALIA.coordinates;
    const outline=polygons.map(poly=>poly.map(ring=>ring.map((p,i)=>(i?'L':'M')+point(p).map(v=>v.toFixed(2)).join(',')).join(' ')+'Z').join(' ')).join(' ');
    this.root.innerHTML=`<svg viewBox="0 0 560 490" aria-label="Australia destination map" role="group"><path d="${outline}" fill="#c3ac7f" stroke="#786342" stroke-width="1.5"/>${LOCATIONS.map((l,i)=>{const[x,y]=point(l.coord);return `<g class="region-blip" data-location="${l.id}" tabindex="0" role="button" aria-label="${l.name}, ${l.available?'available':'not yet available'}"><circle cx="${x}" cy="${y}" r="14" fill="transparent"/><circle class="region-dot" cx="${x}" cy="${y}" r="7"/><text x="${x+11}" y="${y-8}">${i+1}</text></g>`;}).join('')}</svg><div class="region-location-list">${LOCATIONS.map((l,i)=>`<button data-location="${l.id}">${i+1}. ${l.name}<small>${l.state} · ${l.available?'Available':'Not yet available'}</small></button>`).join('')}</div>`;
    parent.append(this.root);
    this.root.addEventListener('click',e=>{const target=e.target.closest('[data-location]');if(target)onSelect(target.dataset.location);});
    this.root.querySelector('svg').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const target=e.target.closest('[data-location]');if(target){e.preventDefault();onSelect(target.dataset.location);}}});
  }
  select(id,current){for(const el of this.root.querySelectorAll('[data-location]')){el.classList.toggle('selected',el.dataset.location===id);el.setAttribute('aria-pressed',String(el.dataset.location===id));const l=LOCATIONS.find(l=>l.id===el.dataset.location);const small=el.querySelector('small');if(small)small.textContent=`${l.state} · ${l.id===current?'Current location':l.available?'Available':'Not yet available'}`;}}
}
