// Everything is synthesised with WebAudio; there are no sound files.

export class Sound {
  constructor(region = 'new-england') {
    this.forest = region.includes('tasmania');
    this.dry = region === 'qld-gemfields' || region === 'wa-goldfields' || region === 'coober-pedy';
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(ctx.destination);

    const len = ctx.sampleRate * 5;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // Detector: a clean sine for non-ferrous, a filtered square growl for iron.
    this.goldOsc = ctx.createOscillator();
    this.goldOsc.type = 'sine';
    this.goldGain = ctx.createGain();
    this.goldGain.gain.value = 0;
    this.goldOsc.connect(this.goldGain).connect(this.master);
    this.goldOsc.start();

    this.ironOsc = ctx.createOscillator();
    this.ironOsc.type = 'square';
    const ironLp = ctx.createBiquadFilter();
    ironLp.type = 'lowpass';
    ironLp.frequency.value = 700;
    this.ironGain = ctx.createGain();
    this.ironGain.gain.value = 0;
    this.ironOsc.connect(ironLp).connect(this.ironGain).connect(this.master);
    this.ironOsc.start();

    // Threshold hum: the faint drone a VLF detector makes with nothing under it.
    this.humOsc = ctx.createOscillator();
    this.humOsc.frequency.value = 330;
    this.humGain = ctx.createGain();
    this.humGain.gain.value = 0;
    this.humOsc.connect(this.humGain).connect(this.master);
    this.humOsc.start();

    this.wind = this.loop(320, 'lowpass', 0.035, 0.6);
    this.rustle = this.loop(this.forest ? 1900 : 1300, 'bandpass', 0, .5);
    this.creek = this.loop(1400, 'bandpass', 0, 0.9);
    this.swish = this.loop(700, 'bandpass', 0, 1.2);
    this.rain = this.loop(4200, 'highpass', 0, 0.4);
    this.rainLow = this.loop(900, 'lowpass', 0, 0.5);
    this.sluiceLoop = this.loop(1800, 'bandpass', 0, 0.8);
    this.babble = 0;
  }

  loop(freq, type, gain, q) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(this.master);
    src.start(0, Math.random() * 2);
    return { filter: f, gain: g };
  }

  get ready() { return !!this.ctx; }

  setEnvironment(dt, { active = true, sheltered = false, storm = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, gain = active && !sheltered ? 1 : 0;
    const breeze = .75 + .18 * Math.sin(t * .43) + .07 * Math.sin(t * 1.13);
    this.wind.gain.gain.setTargetAtTime(gain * (this.forest ? .016 : this.dry ? .043 : .029) * breeze * (1 + storm), t, .8);
    this.rustle.gain.gain.setTargetAtTime(gain * (this.forest ? .022 : .011) * breeze * (1 + storm * .8), t, .6);
  }

  setDetector(on, signal, kind) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const iron = kind === 'iron';
    const s = on ? signal : 0;
    this.humGain.gain.setTargetAtTime(on ? 0.012 : 0, t, 0.05);
    this.goldGain.gain.setTargetAtTime(!iron ? s * 0.22 : 0, t, 0.03);
    this.ironGain.gain.setTargetAtTime(iron ? s * 0.12 : 0, t, 0.03);
    this.goldOsc.frequency.setTargetAtTime(480 + s * 700, t, 0.03);
    this.ironOsc.frequency.setTargetAtTime(110 + s * 80, t, 0.03);
  }

  setAmbience(dt, creekCloseness, panning) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.babble -= dt;
    if (this.babble <= 0) {
      this.babble = 0.08 + Math.random() * 0.1;
      this.creek.filter.frequency.setTargetAtTime((this.forest ? 680 : 900) + Math.random() * (this.forest ? 1000 : 1400), t, 0.05);
    }
    this.creek.gain.gain.setTargetAtTime(creekCloseness * 0.09, t, 0.2);
    this.swish.gain.gain.setTargetAtTime(panning ? 0.16 + Math.sin(t * 8) * 0.06 : 0, t, 0.08);
    this.swish.filter.frequency.setTargetAtTime(500 + Math.sin(t * 7.5) * 250, t, 0.05);
  }

  setRain(k) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.rain.gain.gain.setTargetAtTime(k * 0.2, t, 0.5);
    this.rainLow.gain.gain.setTargetAtTime(k * 0.12, t, 0.5);
  }

  // Water rushing through the sluice when you're standing next to it.
  // A drip somewhere down the drive, with a little echo.
  drip() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const [delay, g] of [[0, 0.06], [0.16, 0.02], [0.33, 0.008]]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      const f = 1400 + Math.random() * 500;
      o.frequency.setValueAtTime(f, t + delay);
      o.frequency.exponentialRampToValueAtTime(f * 0.45, t + delay + 0.07);
      const gn = ctx.createGain();
      gn.gain.setValueAtTime(0, t + delay);
      gn.gain.linearRampToValueAtTime(g, t + delay + 0.004);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.09);
      o.connect(gn).connect(this.master);
      o.start(t + delay);
      o.stop(t + delay + 0.1);
    }
  }

  // The petrol hammer mill: a two-stroke buzz and rock rattling through.
  // The highbanker's little four-stroke pump: a putter, with the spray hissing.
  setPump(level) {
    if (!this.ctx) return;
    if (!this.pump) {
      if (!level) return;
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = 38;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420;
      const g = ctx.createGain();
      g.gain.value = 0;
      o.connect(lp).connect(g).connect(this.master);
      o.start();
      this.pump = { o, g, spray: this.loop(3000, 'highpass', 0, 0.5) };
    }
    const t = this.ctx.currentTime;
    this.pump.g.gain.setTargetAtTime(level * 0.035, t, 0.4);
    this.pump.spray.gain.gain.setTargetAtTime(level * 0.03, t, 0.4);
    this.pump.o.frequency.setTargetAtTime(level ? 36 + Math.random() * 4 : 20, t, 0.1);
  }

  setMill(on) {
    if (!this.ctx) return;
    if (!this.mill) {
      if (!on) return;
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 52;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      const g = ctx.createGain();
      g.gain.value = 0;
      o.connect(lp).connect(g).connect(this.master);
      o.start();
      this.mill = { o, g, rattle: this.loop(2200, 'bandpass', 0, 0.9) };
    }
    const t = this.ctx.currentTime;
    this.mill.g.gain.setTargetAtTime(on ? 0.05 : 0, t, 0.3);
    this.mill.rattle.gain.gain.setTargetAtTime(on ? 0.05 + Math.random() * 0.03 : 0, t, 0.05);
    this.mill.o.frequency.setTargetAtTime(on ? 50 + Math.random() * 6 : 30, t, 0.1);
  }

  setSluice(k) {
    if (!this.ctx) return;
    this.sluiceLoop.gain.gain.setTargetAtTime(k * 0.12, this.ctx.currentTime, 0.2);
  }

  thunder(vol, delay) {
    if (!this.ctx) return;
    if (vol > 0.7) this.burst({ freq: 2500, type: 'highpass', dur: 0.25, gain: 0.35 * vol, delay });
    this.burst({ freq: 160, type: 'lowpass', dur: 2.8 + Math.random() * 1.5, gain: 0.9 * vol, delay: delay + 0.05 });
    this.burst({ freq: 320, type: 'lowpass', dur: 1.6, gain: 0.4 * vol, delay: delay + 0.3 + Math.random() * 0.4 });
  }

  // ---------- wildlife ----------

  panner(pan) {
    const p = this.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(this.master);
    return p;
  }

  // One voiced syllable: a buzzy source through a formant filter, with a pitch glide.
  syllable(out, t, f0, f1, dur, gain, formant = 1600, type = 'sawtooth') {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = formant;
    bp.Q.value = 4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(bp).connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // Laughing kookaburra: chuckles that build into the full "koo-koo-kaa-kaa" and die away.
  kookaburra(pan = 0) {
    if (!this.ctx) return;
    const out = this.panner(pan);
    let t = this.ctx.currentTime + 0.05;
    const n = 22;
    for (let i = 0; i < n; i++) {
      const k = Math.sin((i / n) * Math.PI); // crescendo then fade
      const hi = i > 6 && i < 17 && i % 2 === 0;
      const f = hi ? 900 + k * 500 : 520 + k * 300;
      this.syllable(out, t, f, f * (hi ? 1.25 : 0.85), hi ? 0.11 : 0.08, 0.05 + k * 0.12, hi ? 1900 : 1300);
      t += hi ? 0.13 : 0.09 + Math.random() * 0.03;
    }
  }

  // Galah: a harsh, scratchy two-note screech.
  galah(vol, pan = 0) {
    if (!this.ctx) return;
    const out = this.panner(pan);
    const t = this.ctx.currentTime;
    this.syllable(out, t, 2300, 1500, 0.18, 0.06 * vol, 2600);
    this.syllable(out, t + 0.16, 2000, 1400, 0.14, 0.05 * vol, 2400);
    this.burst({ freq: 3000, type: 'bandpass', dur: 0.12, gain: 0.04 * vol, q: 2 });
  }

  // Field cricket: a quick trill of three pulses up high.
  cricket(vol, pan = 0) {
    if (!this.ctx) return;
    const out = this.panner(pan);
    const t = this.ctx.currentTime;
    const f = 4300 + Math.random() * 500;
    for (let i = 0; i < 3; i++) this.syllable(out, t + i * 0.045, f, f, 0.03, 0.025 * vol, f, 'sine');
  }

  // A willy-willy: a rushing, swirling roar that swells as it comes close.
  // vol 0..1 by distance, close 0..1 when it's nearly on top of you.
  setWhirl(vol, close) {
    if (!this.ctx) return;
    if (!this.whirl) {
      if (vol <= 0) return;
      this.whirl = { low: this.loop(260, 'bandpass', 0, 0.8), hiss: this.loop(1800, 'bandpass', 0, 1.2) };
    }
    const t = this.ctx.currentTime, w = this.whirl;
    const swirl = 0.75 + 0.25 * Math.sin(t * 5.3) * Math.sin(t * 1.7);
    w.low.gain.gain.setTargetAtTime(vol * 0.12 * swirl, t, 0.2);
    w.low.filter.frequency.setTargetAtTime(200 + 160 * swirl + close * 200, t, 0.15);
    w.hiss.gain.gain.setTargetAtTime((vol * 0.02 + close * 0.08) * swirl, t, 0.2);
  }

  // Bush flies: no constant drone, just the odd fly zipping past one ear and
  // out the other. k (0..1) is how pestered you are; called every frame.
  setFlies(k) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.nextFly === undefined) this.nextFly = now + 4;
    if (k < 0.1 || now < this.nextFly) return;
    this.nextFly = now + 10 + Math.random() * 20;
    this.flyBy(Math.min(1, k));
  }

  flyBy(k) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dur = 0.7 + Math.random() * 0.8;
    // Wingbeat around 190-230 Hz, softened so it's a hum, not a rasp.
    const o = ctx.createOscillator();
    o.type = 'triangle';
    const f = 190 + Math.random() * 40;
    o.frequency.setValueAtTime(f * 0.94, t);
    o.frequency.linearRampToValueAtTime(f * 1.08, t + dur * 0.45); // a touch of doppler as it passes
    o.frequency.linearRampToValueAtTime(f * 0.9, t + dur);
    const wob = ctx.createOscillator();
    wob.frequency.value = 9 + Math.random() * 5;
    const wg = ctx.createGain();
    wg.gain.value = 6;
    wob.connect(wg).connect(o.frequency);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    const g = ctx.createGain();
    const peak = 0.006 + 0.008 * k;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    // Sweep from one ear to the other.
    const pan = ctx.createStereoPanner();
    const side = Math.random() < 0.5 ? -1 : 1;
    pan.pan.setValueAtTime(-0.9 * side, t);
    pan.pan.linearRampToValueAtTime(0.9 * side, t + dur);
    o.connect(lp).connect(g).connect(pan).connect(this.master);
    o.start(t); wob.start(t);
    o.stop(t + dur + 0.05); wob.stop(t + dur + 0.05);
  }

  // The ute's engine: a lumpy diesel note that rises with revs, plus gravel under the tyres.
  setEngine(on, rpm, throttle) {
    if (!this.ctx) return;
    if (!this.engine) {
      const ctx = this.ctx;
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      const sub = ctx.createOscillator(); sub.type = 'square';
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 3;
      const g = ctx.createGain(); g.gain.value = 0;
      const sg = ctx.createGain(); sg.gain.value = 0.5;
      o.connect(lp); sub.connect(sg).connect(lp); lp.connect(g).connect(this.master);
      o.start(); sub.start();
      this.engine = { o, sub, lp, g, gravel: this.loop(900, 'bandpass', 0, 0.7) };
    }
    const e = this.engine, t = this.ctx.currentTime;
    const f = 34 + rpm * 70 + throttle * 12;
    e.o.frequency.setTargetAtTime(f, t, 0.1);
    e.sub.frequency.setTargetAtTime(f / 2, t, 0.1);
    e.lp.frequency.setTargetAtTime(300 + throttle * 500 + rpm * 300, t, 0.1);
    e.g.gain.setTargetAtTime(on ? 0.05 + throttle * 0.05 : 0, t, 0.15);
    e.gravel.gain.gain.setTargetAtTime(on ? rpm * 0.08 : 0, t, 0.2);
  }

  // Hammer on rock: solid rock rings bright, a cavity behind it goes dull and hollow.
  tap(hollow) {
    if (hollow > 0.45) {
      this.tone(330 - hollow * 90, 0.35, 0.22, 'triangle', 0, 0.85);
      this.tone(190, 0.4, 0.12, 'sine', 0.01, 0.8);
      this.burst({ freq: 600, dur: 0.12, gain: 0.25 });
    } else {
      this.tone(2300, 0.12, 0.1, 'triangle');
      this.tone(3400, 0.08, 0.05, 'sine');
      this.burst({ freq: 4000, type: 'highpass', dur: 0.04, gain: 0.18 });
    }
  }

  thud() { this.burst({ freq: 300, dur: 0.12, gain: 0.3 }); }

  brushTick() { this.burst({ freq: 3200, type: 'bandpass', dur: 0.09, gain: 0.05, q: 0.8 }); }

  scrapeTick(rock) {
    this.burst({ freq: rock ? 2600 : 1100, type: 'bandpass', dur: 0.1, gain: rock ? 0.14 : 0.1, q: 2 });
    if (rock) this.tone(1900 + Math.random() * 600, 0.06, 0.04, 'triangle');
  }

  crack() {
    this.burst({ freq: 2500, type: 'highpass', dur: 0.06, gain: 0.3 });
    this.tone(1400, 0.1, 0.08, 'square', 0, 0.5);
  }

  // Sieve slapped over onto the mat.
  flip() {
    this.burst({ freq: 700, type: 'bandpass', dur: 0.2, gain: 0.5, q: 0.8 });
    this.burst({ freq: 250, dur: 0.25, gain: 0.4, delay: 0.04 });
  }

  burst({ freq = 400, type = 'lowpass', dur = 0.2, gain = 0.4, q = 1, delay = 0 }) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * Math.max(0, 4.9 - dur), dur + 0.05);
  }

  tone(freq, dur, gain = 0.2, type = 'sine', delay = 0, slide = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  dig() {
    this.burst({ freq: 900, dur: 0.12, gain: 0.5, q: 0.8 });
    this.burst({ freq: 260, dur: 0.3, gain: 0.6, delay: 0.05 });
    this.tone(90, 0.18, 0.3, 'sine', 0.02, 0.5);
  }

  step(surface = 'soil') {
    if (surface === true) surface = 'water'; // Existing callers remain compatible.
    const profiles = {
      water: [1600,.18,.23,.7], gravel: [2300,.1,.13,1.1],
      litter: [3400,.16,.1,.6], rock: [780,.045,.14,2.2],
      mud: [420,.15,.14,.7], soil: [1100,.07,.12,1.2],
    };
    const [freq,dur,gain,q] = profiles[surface] || profiles.soil;
    this.burst({freq:freq*(.92+Math.random()*.16),type:'bandpass',dur,gain,q});
    if(surface==='gravel')this.burst({freq:3700,dur:.04,gain:.045,q:1.5,delay:.035});
    if(surface==='rock'||surface==='mud')this.tone(surface==='rock'?160:85,.065,.045,'sine');
  }

  gold() {
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.5, 0.12, 'triangle', i * 0.08));
  }

  junk() {
    this.tone(180, 0.25, 0.2, 'square', 0, 0.6);
  }

  coin() {
    this.tone(1320, 0.12, 0.12, 'triangle');
    this.tone(1760, 0.3, 0.12, 'triangle', 0.09);
  }

  // Steel on bedrock.
  clink() {
    this.tone(2100, 0.18, 0.08, 'triangle');
    this.tone(3170, 0.12, 0.05, 'sine', 0.005);
    this.burst({ freq: 3500, type: 'highpass', dur: 0.05, gain: 0.15 });
  }

  click() { this.tone(660, 0.06, 0.06, 'square'); }

  // A film camera: the shutter's snick and the wind-on.
  shutter() {
    this.burst({ freq: 4200, type: 'highpass', dur: 0.03, gain: 0.25 });
    this.burst({ freq: 1800, type: 'bandpass', dur: 0.05, gain: 0.18, q: 2, delay: 0.045 });
    this.burst({ freq: 2600, type: 'bandpass', dur: 0.16, gain: 0.05, q: 3, delay: 0.16 });
  }

  // The auctioneer's gavel on the table.
  gavel() {
    this.burst({ freq: 900, dur: 0.08, gain: 0.45 });
    this.tone(320, 0.12, 0.1, 'triangle');
  }

  // A paddle going up: a soft tick.
  bid() { this.tone(980, 0.05, 0.04, 'sine'); }

  denied() { this.tone(220, 0.15, 0.1, 'sawtooth', 0, 0.8); }
}
