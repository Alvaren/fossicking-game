import { PAN_TYPES, panType, materialFor, takePanLoad, stepPan, automaticStroke, lightMass, goldLeft, readyToReveal, panResult } from './panning.js';

const pct = n => `${Math.round(n * 100)}%`;
const weight = g => g > 0 && g < 0.00001 ? '<0.01 mg' : g < 0.01 ? `${(g * 1000).toFixed(2)} mg` : `${g.toFixed(3)} g`;
const fract = n => n - Math.floor(n);
const noise = n => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);

export class PanningUI {
  constructor(state, { assay, onSave, onCollect, onClose }) {
    this.state = state;
    this.assay = assay;
    this.onSave = onSave;
    this.onCollect = onCollect;
    this.onClose = onClose;
    this.isOpen = false;
    this.speed = 0;
    this.pointer = null;
    this.clock = 0;
    this.accumulator = 0;
    this.saveClock = 0;
    this.auto = true;
    this.root = document.createElement('section');
    this.root.id = 'panning';
    this.root.className = 'hidden';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-labelledby', 'pan-title');
    this.root.innerHTML = `
      <div class="pan-shell">
        <header class="pan-header"><div><span class="pan-eyebrow">CREEKSIDE · GOLD RECOVERY</span><h1 id="pan-title">One layer at a time.</h1></div><button id="pan-close" aria-label="Put the pan aside and save">Put aside <span>Esc</span></button></header>
        <div class="pan-layout">
          <div class="pan-view">
            <div class="pan-view-top"><span id="pan-name"></span><span id="pan-stage" class="pan-badge">LOAD YOUR PAN</span></div>
            <canvas id="pan-canvas" width="680" height="560" tabindex="0" aria-label="Pan surface. Drag to work the pan, or focus here and hold arrow keys. Shift increases force."></canvas>
            <div class="pan-mobile-actions" role="group" aria-label="Quick pan actions"><button data-pan-action="clay">Break clay</button><button data-pan-action="stratify">Stratify</button><button data-pan-action="wash">Wash</button><button data-pan-action="reveal">Reveal</button></div>
            <div class="pan-gesture" id="pan-gesture">A smaller load gives the bed room to move.</div>
            <div class="pan-speed"><span>STROKE</span><div><i id="pan-speed-bar"></i></div><strong id="pan-speed-label">Still</strong></div>
            <div class="pan-legend"><span><i class="gravel"></i>Light gravel</span><span><i class="heavy"></i>Heavies / black sand</span><span><i class="clay"></i>Clay clumps</span></div>
          </div>
          <div class="pan-workbench">
            <div id="pan-loading">
              <span class="pan-eyebrow">01 / PREPARE</span><h2>Leave room to stratify.</h2>
              <label class="pan-label" for="pan-type">Your pans</label><select id="pan-type"></select><p id="pan-description" class="pan-muted"></p>
              <div class="pan-label"><label for="pan-fill">Pan fill</label><output id="pan-fill-label">50%</output></div>
              <input id="pan-fill" type="range" min="20" max="120" value="50" step="5"><div class="pan-scale"><span>Light load</span><span>Half full</span><span>Heaped</span></div>
              <p id="pan-load-note"></p><div class="pan-source"><span class="pan-eyebrow">NEXT IN YOUR BUCKET</span><p id="pan-source"></p></div>
              <button id="pan-load" class="pan-primary">Load the pan</button><p id="pan-difficulty" class="pan-muted"></p>
            </div>
            <div id="pan-working" class="hidden">
              <div class="pan-step-heading"><span class="pan-eyebrow" id="pan-method-label">YOUR TECHNIQUE</span><button id="pan-auto" class="hidden">Pause demonstration</button></div>
              <div class="pan-actions" role="group" aria-label="Panning action">
                <button data-pan-action="clay"><span>1</span>Break clay</button><button data-pan-action="stratify"><span>2</span>Stratify</button>
                <button data-pan-action="wash"><span>3</span>Wash a layer</button><button data-pan-action="reveal"><span>4</span>Reveal</button>
              </div>
              <p id="pan-instruction" class="pan-instruction"></p>
              <div class="pan-adjustments">
                <label class="pan-label" for="pan-lip">Working edge</label><select id="pan-lip"><option value="coarse">Coarse riffles</option><option value="fine">Fine riffles</option><option value="smooth">Smooth finishing lip</option></select>
                <div class="pan-label"><label for="pan-tilt">Forward tilt</label><output id="pan-tilt-label">0°</output></div><input id="pan-tilt" type="range" min="0" max="60" value="0">
                <button id="pan-water" aria-pressed="true">Submerged · bed covered</button>
              </div>
              <div class="pan-meters">
                <label>Bed stratification <output id="pan-strat-label"></output><meter id="pan-strat" min="0" max="1"></meter></label>
                <label>Clay still bound <output id="pan-clay-label"></output><meter id="pan-clay" min="0" max="1"></meter></label>
                <label>Light material left <output id="pan-light-label"></output><meter id="pan-light" min="0" max="1"></meter></label>
              </div>
              <p id="pan-feedback" class="pan-feedback" role="status"></p>
              <p class="pan-muted">Heavies are dense minerals, not necessarily gold. Your pan keeps its contents when put aside.</p>
            </div>
            <div id="pan-result" class="hidden" aria-live="polite"><span class="pan-eyebrow">THE REVEAL</span><h2 id="pan-result-title"></h2><p id="pan-result-detail"></p><div id="pan-result-finds"></div><button id="pan-collect" class="pan-primary">Bottle gold & keep finds</button></div>
          </div>
        </div>
        <footer class="pan-footer"><span>STRATIFY → WASH A THIN LAYER → REPEAT → REVEAL</span><span id="pan-cycle"></span></footer>
      </div>`;
    document.body.append(this.root);
    this.$ = id => this.root.querySelector(`#${id}`);
    this.canvas = this.$('pan-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.$('pan-close').onclick = () => this.close();
    this.$('pan-type').onchange = () => this.loadingInfo();
    this.$('pan-fill').oninput = () => this.loadingInfo();
    this.$('pan-load').onclick = () => this.load();
    this.$('pan-collect').onclick = () => this.collect();
    this.$('pan-auto').onclick = () => { this.auto = !this.auto; this.$('pan-auto').textContent = this.auto ? 'Pause demonstration' : 'Continue demonstration'; };
    for (const b of this.root.querySelectorAll('[data-pan-action]')) b.onclick = () => this.choose(b.dataset.panAction);
    this.$('pan-lip').onchange = e => { if (this.session) this.session.lip = e.target.value; };
    this.$('pan-tilt').oninput = e => { if (this.session) this.session.tilt = Number(e.target.value); };
    this.$('pan-water').onclick = () => { if (this.session) this.session.submerged = !this.session.submerged; };
    this.canvas.addEventListener('pointerdown', e => {
      if (this.pointer !== null) return;
      this.canvas.setPointerCapture(e.pointerId);
      this.canvas.focus({ preventScroll: true });
      this.pointer = e.pointerId;
      this.lastX = e.clientX; this.lastY = e.clientY; this.lastT = e.timeStamp;
    });
    this.canvas.addEventListener('pointermove', e => {
      if (e.pointerId !== this.pointer) return;
      const rect = this.canvas.getBoundingClientRect();
      const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
      const seconds = Math.max(0.008, (e.timeStamp - this.lastT) / 1000);
      this.speed = Math.min(2.5, Math.hypot(dx, dy) / (Math.min(rect.width, rect.height) * seconds));
      this.offsetX = Math.max(-1, Math.min(1, (e.clientX - rect.left) / rect.width * 2 - 1));
      this.offsetY = Math.max(-1, Math.min(1, (e.clientY - rect.top) / rect.height * 2 - 1));
      this.lastX = e.clientX; this.lastY = e.clientY; this.lastT = e.timeStamp;
    });
    const release = () => { this.pointer = null; this.speed = 0; };
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) this.canvas.addEventListener(event, release);
    window.addEventListener('blur', () => { release(); this.keyStroke = false; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { release(); this.keyStroke = false; } });
    this.root.addEventListener('keydown', e => {
      if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); this.close(); return; }
      if (e.code === 'Tab') {
        const focusable = [...this.root.querySelectorAll('button,select,input,canvas')].filter(el => !el.disabled && el.getClientRects().length);
        const first = focusable[0], last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      if (e.target === this.canvas && e.code.startsWith('Arrow')) { e.preventDefault(); this.keyStroke = true; this.keySpeed = e.shiftKey ? 1.7 : 0.45; }
    });
    window.addEventListener('keyup', e => { if (e.code.startsWith('Arrow')) this.keyStroke = false; });
  }

  get session() { return this.state.panSession; }

  open() {
    this.isOpen = true;
    this.auto = true;
    this.speed = 0;
    this.keyStroke = false;
    this.$('pan-auto').textContent = 'Pause demonstration';
    this.root.classList.remove('hidden');
    document.body.classList.add('panning-open');
    this.$('pan-type').innerHTML = PAN_TYPES.slice(0, Math.min(2, this.state.up.pan || 0) + 1).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    this.$('pan-fill').disabled = this.state.difficulty === 'easy';
    if (this.state.difficulty === 'easy') this.$('pan-fill').value = 50;
    this.loadingInfo();
    this.refresh();
    this.$('pan-close').focus({ preventScroll: true });
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.pointer = null; this.speed = 0; this.keyStroke = false;
    this.root.classList.add('hidden');
    document.body.classList.remove('panning-open');
    this.onSave();
    this.onClose();
  }

  loadingInfo() {
    const p = panType(this.$('pan-type').value);
    const sample = this.state.bucket[0];
    const requested = Number(this.$('pan-fill').value) / 100;
    const available = sample ? sample.panVolume ?? (sample.cons ? 0.45 : 1) : 0;
    const actual = Math.min(available, p.capacity * requested) / p.capacity;
    this.$('pan-fill-label').textContent = `${pct(actual)} full`;
    this.$('pan-description').textContent = p.detail;
    this.$('pan-load-note').textContent = actual > 0.6 ? 'Crowded bed: slower settling and buried riffles. Wash carefully or take less.' : 'Around half full is a useful starting point. Use less for clay or fine concentrates.';
    const mix = sample ? materialFor(sample) : null;
    this.$('pan-source').textContent = !sample ? 'Bucket empty. Dig some wash or clean up your sluice.' : `${sample.crushed ? 'Crushed reef ore' : sample.cons ? 'Sluice concentrates' : sample.classified ? 'Classified creek wash' : 'Unclassified gravel'} · ${mix.clay > 0.15 ? 'clay-bound' : mix.clay > 0 ? 'some clay' : 'no clay'}${sample.panVolume ? ' · partly used load' : ''}. Unloaded material stays in the bucket.`;
    this.$('pan-load').disabled = !sample;
    this.$('pan-difficulty').textContent = this.state.difficulty === 'easy' ? 'Easy: watch the full method performed for you, including re-stratifying and the final reveal.' : this.state.difficulty === 'prospector' ? 'Prospector: you control the technique with more forgiving losses.' : 'Realistic: your strokes, load and working edge determine what stays in the pan.';
    if (!this.session) this.$('pan-name').textContent = p.name;
  }

  load() {
    if (this.session || !this.state.bucket.length) return;
    this.state.panSession = takePanLoad(this.state.bucket, { panId: this.$('pan-type').value, fill: Number(this.$('pan-fill').value) / 100, difficulty: this.state.difficulty }, this.assay);
    this.choose(this.session.bed.clay > this.session.initialBulk * 0.03 ? 'clay' : 'stratify');
    this.onSave();
    this.refresh();
    this.canvas.focus({ preventScroll: true });
  }

  choose(action) {
    const s = this.session;
    if (!s || s.finished || (s.difficulty === 'easy' && s.time > 0)) return;
    s.mode = action;
    s.submerged = action === 'clay' || action === 'stratify';
    s.tilt = s.submerged ? 0 : action === 'reveal' ? 8 : 18;
    if (action === 'reveal') s.lip = 'smooth';
    else if (action === 'wash') s.lip = 'coarse';
    this.speed = 0;
  }

  collect() {
    const s = this.session;
    const result = s && panResult(s);
    if (!result) return;
    // Clear before crediting: double clicks cannot award the same contents twice.
    this.state.panSession = null;
    this.onCollect(s.sample, result);
    this.onSave();
    this.loadingInfo();
    this.refresh();
  }

  update(dt) {
    if (!this.isOpen || document.hidden) return;
    this.clock += dt;
    const s = this.session;
    if (s && !s.finished) {
      const easy = s.difficulty === 'easy';
      this.speed *= Math.exp(-dt * 10);
      this.accumulator += Math.min(dt, 0.05);
      while (this.accumulator >= 1 / 60) {
        const input = easy ? (this.auto ? automaticStroke(s) : { speed: 0 }) : { action: s.mode, speed: this.keyStroke ? this.keySpeed : this.speed, lip: s.lip, tilt: s.tilt, submerged: s.submerged };
        stepPan(s, input, 1 / 60);
        if (easy && this.auto) { s.mode = input.action; this.displaySpeed = input.speed; }
        else this.displaySpeed = this.keyStroke ? this.keySpeed : this.speed;
        this.accumulator -= 1 / 60;
      }
      this.saveClock += dt;
      if (this.saveClock > 5 || s.finished) { this.saveClock = 0; this.onSave(); }
    }
    this.refresh();
    this.draw();
  }

  refresh() {
    const s = this.session;
    this.$('pan-loading').classList.toggle('hidden', !!s);
    this.$('pan-working').classList.toggle('hidden', !s || s.finished);
    this.$('pan-result').classList.toggle('hidden', !s?.finished);
    this.root.querySelector('.pan-mobile-actions').classList.toggle('hidden', !s || s.finished);
    if (!s) { this.$('pan-stage').textContent = 'LOAD YOUR PAN'; this.$('pan-cycle').textContent = ''; return; }
    const easy = s.difficulty === 'easy';
    this.$('pan-name').textContent = panType(s.panId).name;
    this.$('pan-stage').textContent = s.finished ? 'THE REVEAL' : readyToReveal(s) ? 'HEAVY CONCENTRATES' : 'WORKING THE WASH';
    this.$('pan-cycle').textContent = `${s.cycles} wash ${s.cycles === 1 ? 'cycle' : 'cycles'} · ${s.difficulty}`;
    this.$('pan-method-label').textContent = easy ? 'EASY · WATCH THE METHOD' : 'YOUR TECHNIQUE';
    this.$('pan-auto').classList.toggle('hidden', !easy);
    for (const b of this.root.querySelectorAll('[data-pan-action]')) { b.classList.toggle('active', s.mode === b.dataset.panAction); b.disabled = easy; b.setAttribute('aria-pressed', s.mode === b.dataset.panAction); }
    const directions = {
      clay: 'Rub circles over the pan to break submerged clay clumps. Gold trapped in clay can leave with the clumps.',
      stratify: 'Drag short side-to-side strokes or circles. Keep the pan level and submerged; frantic movement remixes the layers.',
      wash: 'Drag slow forward-and-back strokes to dip the lip. Speed and tilt control how much comes off. Re-stratify between layers.',
      reveal: 'Use slow circles and a shallow tilt over the smooth lip. Fan the black sand back to expose the colours.',
    };
    this.$('pan-instruction').textContent = directions[s.mode];
    this.$('pan-gesture').textContent = s.finished ? 'Gold stays visible until you collect it.' : easy ? `${this.auto ? 'Demonstrating' : 'Paused'}: ${s.mode === 'clay' ? 'breaking clay' : s.mode}` : 'Drag directly on the pan · gentle strokes keep the gold down';
    this.$('pan-lip').value = s.lip;
    this.$('pan-lip').querySelector('[value="fine"]').disabled = s.panId !== 'dual';
    this.$('pan-tilt').value = s.tilt;
    this.$('pan-tilt-label').textContent = `${Math.round(s.tilt)}°`;
    this.$('pan-water').textContent = s.submerged ? 'Submerged · bed covered' : 'At waterline · washing lip';
    this.$('pan-water').setAttribute('aria-pressed', s.submerged);
    for (const id of ['pan-lip', 'pan-tilt', 'pan-water']) this.$(id).disabled = easy;
    for (const [id, value] of [['strat', s.strat], ['clay', s.bed.clay / s.initialBulk], ['light', lightMass(s) / s.initialBulk]]) {
      this.$(`pan-${id}`).value = value;
      this.$(`pan-${id}-label`).textContent = pct(value);
    }
    const speed = s.finished ? 0 : this.displaySpeed || 0;
    this.$('pan-speed-bar').style.width = `${Math.min(100, speed / 1.6 * 100)}%`;
    this.$('pan-speed-bar').style.background = speed > 0.8 ? '#ed946a' : '#9cc8aa';
    this.$('pan-speed-label').textContent = speed < 0.03 ? 'Still' : speed > 0.8 ? 'Aggressive' : 'Controlled';
    if (this.$('pan-feedback').textContent !== s.message) this.$('pan-feedback').textContent = s.message;
    if (s.finished) {
      const result = panResult(s);
      this.$('pan-result-title').textContent = result.gold + result.picker > 0 ? `${weight(result.gold + result.picker)} recovered` : 'Not a colour this time.';
      this.$('pan-result-detail').textContent = `${result.lost > 0.000001 ? `${weight(result.lost)} washed out. ` : 'No gold lost during washing. '}${result.gold + result.picker === 0 ? 'A heavy black-sand streak can still be barren.' : 'Your gold is separated from the black sand and ready for the bottle.'}`;
      const finds = this.$('pan-result-finds');
      const labels = result.finds.map(f => f.label).join(' · ');
      finds.textContent = result.picker ? `Picker: ${weight(result.picker)}${labels ? ` · ${labels}` : ''}` : labels;
      this.$('pan-collect').textContent = result.gold + result.picker > 0 || result.finds.length ? 'Bottle gold & keep finds' : 'Finish this pan';
    }
  }

  draw() {
    const c = this.ctx, s = this.session;
    const pan = panType(s?.panId || this.$('pan-type').value);
    const W = 680, H = 560;
    c.clearRect(0, 0, W, H);
    const t = this.clock, moving = s && !s.finished && s.lastAction !== 'rest';
    const strength = moving ? Math.min(1, this.displaySpeed || 0) : 0;
    const manual = s?.difficulty !== 'easy' && !this.keyStroke;
    const ox = (manual ? this.offsetX || 0 : Math.sin(t * 7)) * strength * 18;
    const oy = (manual ? this.offsetY || 0 : Math.cos(t * 6)) * strength * 12;
    c.save(); c.translate(W / 2 + ox, 278 + oy);
    const tilt = s?.tilt || 0;
    c.scale(1, 0.82 - tilt / 250);
    // Rim, sloping sides, floor: all pan profiles have a distinct working edge.
    c.shadowColor = '#0009'; c.shadowBlur = 35; c.shadowOffsetY = 18;
    c.beginPath(); c.arc(0, 0, 242, 0, Math.PI * 2); c.fillStyle = pan.color; c.fill();
    c.shadowBlur = 0; c.shadowOffsetY = 0;
    const wall = c.createRadialGradient(-30, -40, 65, 0, 0, 240);
    wall.addColorStop(0, '#0b2623'); wall.addColorStop(0.65, pan.color); wall.addColorStop(0.96, '#739487'); wall.addColorStop(1, pan.color);
    c.fillStyle = wall; c.beginPath(); c.arc(0, 0, 232, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#b8d2bc55'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 238, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#17392f'; c.beginPath(); c.arc(0, 0, 154, 0, Math.PI * 2); c.fill();
    const smooth = s?.lip === 'smooth', fine = s?.lip === 'fine';
    c.save(); c.rotate(smooth ? Math.PI : fine ? Math.PI / 2 : 0);
    for (let i = 0; i < 4; i++) {
      c.lineWidth = pan.id === 'deep' ? 12 : 8;
      c.strokeStyle = '#071c19aa'; c.beginPath(); c.arc(0, 0, 169 + i * 17, -2.35, -0.79); c.stroke();
      c.lineWidth = 3; c.strokeStyle = '#91b5a080'; c.stroke();
    }
    if (pan.id === 'dual') for (let i = 0; i < 8; i++) {
      c.lineWidth = 3; c.strokeStyle = '#98b3a57a'; c.beginPath(); c.arc(0, 0, 160 + i * 9, 2.35, 3.93); c.stroke();
    }
    c.restore();
    const source = this.state.bucket[0];
    const previewVolume = source ? Math.min(source.panVolume ?? (source.cons ? 0.45 : 1), pan.capacity * Number(this.$('pan-fill').value) / 100) : 0;
    const volume = s?.volume ?? previewVolume;
    const bed = s?.bed || Object.fromEntries(Object.entries(materialFor(source || {})).map(([k, v]) => [k, v * previewVolume]));
    const initial = s?.initialBulk || previewVolume;
    const fullness = Math.min(2.2, volume / pan.capacity / 0.5);
    const spreadScale = Math.min(1.23, Math.max(0.6, Math.sqrt(fullness)));
    const colours = { gravel: ['#a09278', '#6c6a5b', '#c3ae8a'], sand: ['#9d8258', '#b39a70'], silt: ['#ad9772'], heavies: ['#171d20', '#333d42', '#5e5a4b'], clay: ['#a5714d', '#825334'] };
    // Density sorting is visible: heavy grains gather low, the light bed thins.
    for (const kind of ['heavies', 'silt', 'sand', 'gravel', 'clay']) {
      const count = Math.ceil(Math.min(1.5, bed[kind] / Math.max(initial, 0.01)) * (kind === 'sand' || kind === 'heavies' ? 400 : 230) * fullness);
      for (let i = 0; i < count; i++) {
        const n = i + kind.length * 141, a = noise(n) * Math.PI * 2;
        const spread = kind === 'heavies' ? 130 - (s?.strat || 0) * 85 : 150;
        const radius = Math.sqrt(noise(n + 37)) * spread * spreadScale;
        let x = Math.cos(a) * radius, y = Math.sin(a) * radius;
        if (kind === 'heavies') { x -= (s?.reveal || 0) * 65; y += (s?.strat || 0) * 42; }
        const shake = strength * (kind === 'heavies' ? 2 : 7);
        x += Math.sin(t * 9 + n) * shake; y += Math.cos(t * 7 + n) * shake;
        const size = kind === 'gravel' ? 5 + noise(n + 7) * 8 : kind === 'clay' ? 9 + noise(n + 7) * 12 : 1.3 + noise(n + 7) * 2.5;
        c.fillStyle = colours[kind][i % colours[kind].length];
        c.beginPath(); c.ellipse(x, y, size, size * 0.7, a, 0, Math.PI * 2); c.fill();
      }
    }
    // Never invent gold in a barren pan. Fine flecks are enlarged for legibility.
    if (s && (readyToReveal(s) || s.finished)) {
      const g = goldLeft(s) + (panResult(s)?.picker || 0);
      const count = g > 0 ? Math.min(65, Math.max(1, Math.ceil(g * 6000))) : 0;
      for (let i = 0; i < count; i++) {
        const x = 20 + noise(i + 333) * 85 * s.reveal, y = 45 + noise(i + 431) * 40;
        c.fillStyle = i % 3 ? '#eac35d' : '#fff0a4';
        c.beginPath(); c.ellipse(x, y, 1.8 + noise(i + 34) * 2.4, 1.4, noise(i) * 4, 0, Math.PI * 2); c.fill();
      }
    }
    // Water film, clay cloud and outgoing wash animate with the actual action.
    c.fillStyle = s?.submerged ? '#75a4af25' : '#75a4af12';
    c.beginPath(); c.arc(0, 0, s?.submerged ? 225 : 158, 0, Math.PI * 2); c.fill();
    if (s?.mode === 'clay' && strength) { c.fillStyle = '#b9976b33'; c.beginPath(); c.ellipse(0, 20, 150, 110, 0, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = '#cadfdd44'; c.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(0, 0, 145 + Math.sin(t * 2 + i) * 8 + i * 20, 138 + i * 15, 0, 0.2 + i, 1.2 + i); c.stroke(); }
    if (s && (s.mode === 'wash' || s.mode === 'reveal') && strength && !s.submerged) {
      for (let i = 0; i < 25; i++) {
        const travel = fract(t * strength * 1.4 + noise(i + 45));
        c.fillStyle = i < 4 && s.lastLoss > 0 ? '#f6cd5e' : '#a6b8ac77';
        c.fillRect((noise(i + 71) - 0.5) * 110, -130 - travel * 150, 3, 7);
      }
    }
    c.restore();
    c.textAlign = 'center'; c.font = '600 12px Segoe UI'; c.fillStyle = '#b3c9bb';
    c.fillText(s?.lip === 'smooth' ? 'SMOOTH FINISHING LIP' : s?.lip === 'fine' ? 'FINE RIFFLES' : 'COARSE RIFFLES · WORKING EDGE', W / 2, 32);
    c.fillStyle = '#91a89d'; c.font = '12px Segoe UI';
    c.fillText(s?.submerged ? 'SUBMERGED' : s ? 'AT THE WATERLINE' : 'READY TO LOAD', W / 2, 515);
  }
}
