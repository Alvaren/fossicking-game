import { PAN_TYPES, goldLeft, panType } from './panning.js';
import { RECIPES, CAMP_UPGRADES, buyCampUpgrade, storeSample, withdrawSample, startPractice, repanPractice, takeFieldTailings, mg, campLevel } from './camp.js';
import './camp.css';

export class CampUI {
  constructor(state, { onClose, onChange, onPan, capacity }) {
    this.state = state; this.onClose = onClose; this.onChange = onChange; this.onPan = onPan; this.capacity = capacity;
    this.isOpen = false;
    this.root = document.createElement('section');
    this.root.id = 'camp-workbench'; this.root.className = 'hidden';
    this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true'); this.root.setAttribute('aria-labelledby', 'camp-title');
    this.root.innerHTML = `<div class="camp-shell">
      <header class="camp-heading"><div><span class="camp-kicker">AT THE CLAIM · LEARN / RECOVER / BUILD</span><h1 id="camp-title">The wash bench</h1><p id="camp-level"></p></div><button id="camp-close">Back to camp <span>Esc</span></button></header>
      <div class="camp-grid"><section class="camp-card camp-practice"><span class="camp-kicker">01 / PRACTISE THE METHOD</span><h2>A known parcel. Your technique.</h2><p>Borrow any pan and work a measured parcel of training wash. Gold is returned to the bench, never your bottle.</p>
        <div class="camp-fields"><label>Material<select id="camp-recipe">${RECIPES.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}</select></label><label>Borrow a pan<select id="camp-pan">${PAN_TYPES.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select></label><label>Parcel size<select id="camp-volume"><option value="0.25">Small · 0.25 load</option><option value="0.5" selected>Medium · 0.50 load</option><option value="1">Large · 1.00 load</option></select></label><label>Technique<select id="camp-mode"><option value="realistic">Realistic · manual</option><option value="prospector">Prospector · forgiving</option><option value="easy">Easy · demonstration</option></select></label></div>
        <p id="camp-recipe-note" class="camp-note"></p><button id="camp-start" class="camp-primary">Start a practice parcel</button><button id="camp-resume" class="hidden">Resume practice pan</button><button id="camp-return" class="hidden">Return unfinished practice parcel</button><div id="camp-practice-result"></div><button id="camp-practice-repan" class="hidden">Re-pan practice tailings</button>
      </section><section class="camp-card"><span class="camp-kicker">02 / RECOVER YOUR FINDS</span><h2>Your wash, safely caught.</h2><p>Build a recovery tub to work bucket material here. A portable kit catches outflow from new pans at the creek.</p><button id="camp-field" class="camp-primary">Pan your bucket at camp</button><p id="camp-field-note" class="camp-note"></p><div id="camp-tailings"></div></section>
      <section class="camp-card"><span class="camp-kicker">03 / BUILD YOUR CAMP</span><h2>Put your finds to work.</h2><p id="camp-money"></p><div id="camp-upgrades"></div></section>
      <section class="camp-card"><span class="camp-kicker">04 / KEEP YOUR SAMPLES</span><h2>Bring the right wash.</h2><p>Parcels keep their source, clay and remaining contents. Stored material stays with you when moving claims.</p><button id="camp-store">Store front bucket parcel</button><p id="camp-storage-note" class="camp-note"></p><div id="camp-samples"></div></section></div>
      <section class="camp-card camp-comparison"><span class="camp-kicker">YOUR PRACTICE NOTEBOOK</span><h2>Compare like with like.</h2><p>Choose a material, parcel size and technique above to compare first passes. Pan fill differs because capacities differ. Easy demonstrations are recorded separately.</p><p id="camp-mastery"></p><div class="camp-table-wrap"><table><thead><tr><th>Pan</th><th>Fill</th><th>Recovered</th><th>Recovery</th><th>Cycles</th></tr></thead><tbody id="camp-history"></tbody></table></div><p id="camp-history-empty"></p></section><p id="camp-status" role="status"></p>
    </div>`;
    document.body.append(this.root);
    this.$ = id => this.root.querySelector(`#${id}`);
    this.$('camp-close').onclick = () => this.close();
    this.$('camp-mode').value = state.difficulty;
    for (const id of ['camp-recipe', 'camp-pan', 'camp-volume', 'camp-mode']) this.$(id).onchange = () => this.refresh();
    this.$('camp-start').onclick = () => {
      const p = startPractice(state.camp, { recipeId: this.$('camp-recipe').value, panId: this.$('camp-pan').value, volume: Number(this.$('camp-volume').value), difficulty: this.$('camp-mode').value });
      if (p) { this.onChange(); this.pan({ state: p, practice: true, camp: true }); }
    };
    this.$('camp-return').onclick = () => { state.camp.practice = null; this.change(true, 'Borrowed parcel returned. Your field pan and recorded results are unchanged.'); };
    this.$('camp-resume').onclick = () => this.pan({ state: state.camp.practice, practice: true, camp: true });
    this.$('camp-practice-repan').onclick = () => {
      const p = repanPractice(state.camp, this.$('camp-pan').value);
      if (p) { this.onChange(); this.pan({ state: p, practice: true, camp: true }); }
    };
    this.$('camp-field').onclick = () => { if (state.camp.built.tub) this.pan({ camp: true }); };
    this.$('camp-store').onclick = () => this.change(storeSample(state), 'Parcel stored with its original contents.');
    this.root.addEventListener('keydown', e => {
      if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); this.close(); }
      if (e.code === 'Tab') {
        const list = [...this.root.querySelectorAll('button,select')].filter(b => !b.disabled && b.getClientRects().length);
        if (e.shiftKey && document.activeElement === list[0]) { e.preventDefault(); list.at(-1).focus(); }
        else if (!e.shiftKey && document.activeElement === list.at(-1)) { e.preventDefault(); list[0].focus(); }
      }
    });
  }
  open() { this.isOpen = true; this.root.classList.remove('hidden'); document.body.classList.add('camp-open'); this.refresh(); this.$('camp-close').focus({ preventScroll: true }); }
  hide() { this.isOpen = false; this.root.classList.add('hidden'); document.body.classList.remove('camp-open'); }
  close() { this.hide(); this.onChange(); this.onClose(); }
  pan(context) { this.hide(); this.onPan(context); }
  change(ok, message) { this.$('camp-status').textContent = ok ? message : 'That action is unavailable. Check space, funds and the current pan.'; if (ok) this.onChange(); this.refresh(); }
  entry(parent, text, label, disabled, action) {
    const row = document.createElement('div'); row.className = 'camp-entry';
    const p = document.createElement('p'); p.textContent = text;
    const b = document.createElement('button'); b.textContent = label; b.disabled = disabled; b.onclick = action;
    row.append(p, b); parent.append(row);
  }
  refresh() {
    const s = this.state, c = s.camp, p = c.practice;
    const recipe = RECIPES.find(r => r.id === this.$('camp-recipe').value);
    const volume = Number(this.$('camp-volume').value), pan = panType(this.$('camp-pan').value), mode = this.$('camp-mode').value;
    this.$('camp-level').textContent = `${campLevel(c)} · ${c.fieldPans} field pans collected · ${mg(c.recovered)} recovered at the pan`;
    this.$('camp-recipe-note').textContent = `${recipe.hint} Known gold: ${mg(volume * 0.1)} · ${Math.round(volume / pan.capacity * 100)}% of this pan. Starting a new parcel replaces the previous practice tailings.`;
    this.$('camp-start').disabled = !!p?.panSession;
    this.$('camp-resume').classList.toggle('hidden', !p?.panSession);
    this.$('camp-return').classList.toggle('hidden', !p?.panSession);
    this.$('camp-practice-repan').classList.toggle('hidden', !p?.tailings || !!p.panSession);
    this.$('camp-practice-result').textContent = !p ? '' : `${RECIPES.find(r => r.id === p.recipeId)?.name || 'Practice'}: ${mg(p.recovered)} of ${mg(p.total)} returned after ${p.passes} passes.${p.tailings ? ` ${mg(goldLeft(p.tailings) + p.tailings.picker)} remains in caught tailings.` : p.panSession ? ' A pan is waiting on the bench.' : ''}`;
    this.$('camp-field').disabled = !c.built.tub || (!s.bucket.length && !s.panSession);
    this.$('camp-field').textContent = s.panSession ? 'Resume your field pan' : 'Pan your bucket at camp';
    this.$('camp-field-note').textContent = !c.built.tub ? 'Next project: recovery tub · $75. Sell your finds to the buyer to fund it.' : `${s.bucket.length} bucket parcels · ${c.tailings.length} caught tailings parcels. Tailings capture starts when a new pan is loaded; an existing creek pan keeps its original capture setup.`;
    const tail = this.$('camp-tailings'); tail.replaceChildren();
    for (const t of c.tailings) this.entry(tail, `Caught tailings #${t.id} · ${mg(goldLeft(t.session) + t.session.picker)} gold · ${t.session.volume.toFixed(2)} load`, 'Re-pan', !!s.panSession || !c.built.tub, () => {
      if (takeFieldTailings(s, t.id)) { this.onChange(); this.pan({ camp: true }); }
    });
    this.$('camp-money').textContent = `$${s.cash.toFixed(0)} available · purchases add facilities; gold retention still depends on technique.`;
    const upgrades = this.$('camp-upgrades'); upgrades.replaceChildren();
    for (const u of CAMP_UPGRADES) this.entry(upgrades, `${u.name} · $${u.cost}. ${u.detail}${u.requires && !c.built[u.requires] ? ' Requires the recovery tub.' : ''}`, c.built[u.id] ? 'Built' : `Build · $${u.cost}`, !!c.built[u.id] || s.cash < u.cost || !!(u.requires && !c.built[u.requires]), () => this.change(buyCampUpgrade(s, u.id), `${u.name} is ready to use.`));
    this.$('camp-store').disabled = !c.built.rack || !s.bucket.length || c.samples.length >= 8;
    this.$('camp-storage-note').textContent = c.built.rack ? `${c.samples.length}/8 rack slots · ${s.bucket.length}/${this.capacity()} bucket slots` : 'Build the sample rack to store parcels.';
    const samples = this.$('camp-samples'); samples.replaceChildren();
    c.samples.forEach((sample, i) => this.entry(samples, `Sample ${i + 1} · ${sample.crushed ? 'crushed ore' : sample.cons ? 'concentrates' : sample.layer || 'creek wash'} · ${(sample.panVolume ?? (sample.cons ? 0.45 : 1)).toFixed(2)} load${Number.isFinite(sample.x) && Number.isFinite(sample.z) ? ` · source ${Math.round(sample.x)}, ${Math.round(sample.z)}${sample.sourceClaim !== undefined && sample.sourceClaim !== s.seed ? ' (previous claim)' : ''}` : ''}`, 'Take parcel', s.bucket.length >= this.capacity(), () => this.change(withdrawSample(s, i, this.capacity()), 'Parcel returned to your bucket.')));
    const history = this.$('camp-history'); history.replaceChildren();
    const rows = c.history.filter(r => r.pass === 1 && r.recipeId === recipe.id && r.volume === volume && r.difficulty === mode).slice(-12).reverse();
    for (const r of rows) {
      const tr = document.createElement('tr');
      for (const text of [panType(r.panId).name, `${Math.round(r.volume / panType(r.panId).capacity * 100)}%`, mg(r.recovered), `${(r.recovery * 100).toFixed(1)}%`, r.cycles]) { const td = document.createElement('td'); td.textContent = text; tr.append(td); }
      history.append(tr);
    }
    this.$('camp-history-empty').textContent = rows.length ? '' : 'No matching first passes yet. Work the same recipe and parcel size with another pan to compare.';
    const mastered = RECIPES.filter(recipe => c.mastery[recipe.id]);
    this.$('camp-mastery').textContent = `Technique challenge: recover at least 95% on a first pass in Realistic · ${mastered.length}/3 materials recorded${mastered.length ? ` (${mastered.map(r => r.name).join(', ')})` : ''}.`;
  }
}
