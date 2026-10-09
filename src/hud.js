// Thin wrapper over the DOM HUD.

const $ = (id) => document.getElementById(id);

export class Hud {
  constructor() {
    this.el = {
      hud: $('hud'), cash: $('cash'), gold: $('gold'), gems: $('gems'), bucket: $('bucket'),
      meter: $('meter'), meterFill: $('meter-fill'), disc: $('disc'),
      prompt: $('prompt'), toasts: $('toasts'),
      progress: $('progress'), progressFill: $('progress-fill'),
      arrow: $('camp-arrow'), campDist: $('camp-dist'),
      jig: $('jig'), jigZone: $('jig-zone'), jigNeedle: $('jig-needle'), jigState: $('jig-state'),
      stratFill: $('strat-fill'), stratPct: $('strat-pct'),
    };
    this.slots = [...document.querySelectorAll('.slot')];
    this.last = {};
  }

  show(v) { this.el.hud.classList.toggle('hidden', !v); }

  set(key, text) {
    if (this.last[key] === text) return;
    this.last[key] = text;
    this.el[key].textContent = text;
  }

  stats(state, cap) {
    this.set('cash', `$${Math.floor(state.cash).toLocaleString()}`);
    this.set('gold', `${(state.gold + state.nuggets.reduce((t, n) => t + n.grams, 0)).toFixed(2)} g`);
    this.set('gems', `${state.gems.length}`);
    this.set('bucket', `${state.bucket.length} / ${cap}`);
  }

  // Swap between the standing toolbar and the kneeling hand-tool bar.
  kneeling(on) {
    document.getElementById('toolbar').classList.toggle('hidden', on);
    document.getElementById('kneelbar').classList.toggle('hidden', !on);
  }

  tool(name) {
    for (const s of this.slots) s.classList.toggle('active', s.dataset.tool === name);
    this.el.meter.classList.toggle('hidden', name !== 'detector');
  }

  meter(signal, kind, showId) {
    this.el.meterFill.style.width = `${Math.round(signal * 100)}%`;
    const iron = kind === 'iron';
    this.el.meterFill.style.background = iron ? 'var(--iron)' : 'var(--gold)';
    let id = '';
    if (showId && signal > 0.08) id = iron ? 'FERROUS' : 'NON-FERROUS';
    this.set('disc', id);
    this.el.disc.style.color = iron ? 'var(--iron)' : 'var(--gold)';
  }

  // Jig meter: needle = how hard you're jigging, green = the right rhythm.
  jig(show, intensity = 0, lo = 0, hi = 0, strat = 0) {
    this.el.jig.classList.toggle('hidden', !show);
    if (!show) return;
    this.el.jigZone.style.left = `${lo * 100}%`;
    this.el.jigZone.style.width = `${(hi - lo) * 100}%`;
    this.el.jigNeedle.style.left = `${intensity * 100}%`;
    this.el.stratFill.style.width = `${Math.round(strat * 100)}%`;
    this.set('stratPct', `${Math.round(strat * 100)}%`);
    const state = intensity > hi ? 'too hard' : intensity >= lo ? 'good' : intensity > 0.05 ? 'too soft' : '';
    this.set('jigState', state.toUpperCase());
    this.el.jigState.className = state === 'good' ? 'good' : state === 'too hard' ? 'over' : '';
  }

  lockSlot(name, locked) {
    for (const s of this.slots) if (s.dataset.tool === name) s.classList.toggle('locked', locked);
  }

  prompt(text) { this.set('prompt', text || ''); }

  progress(p) {
    this.el.progress.classList.toggle('hidden', p <= 0);
    this.el.progressFill.style.width = `${Math.round(p * 100)}%`;
  }

  compass(angle, dist) {
    this.el.arrow.style.transform = `rotate(${angle}rad)`;
    this.set('campDist', `${Math.round(dist)} m`);
  }

  toast(text, cls = '') {
    const t = document.createElement('div');
    t.className = `toast ${cls}`;
    t.textContent = text;
    this.el.toasts.appendChild(t);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
    setTimeout(() => t.remove(), 3300);
  }
}
