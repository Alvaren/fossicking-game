// Everything is synthesised with WebAudio; there are no sound files.

export class Sound {
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
      this.creek.filter.frequency.setTargetAtTime(900 + Math.random() * 1400, t, 0.05);
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

  step(inWater) {
    if (inWater) this.burst({ freq: 1600, type: 'bandpass', dur: 0.18, gain: 0.25, q: 0.7 });
    else this.burst({ freq: 1100 + Math.random() * 500, type: 'bandpass', dur: 0.07, gain: 0.12, q: 1.2 });
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

  denied() { this.tone(220, 0.15, 0.1, 'sawtooth', 0, 0.8); }
}
