import * as THREE from 'three';

// Photo mode: the HUD and your tools go away, time stands still, and the
// camera comes loose so you can float about and frame a shot. Snapping saves
// a picture to your device.

export const FILTERS = [
  { name: 'Natural', css: 'none' },
  { name: 'Warm arvo', css: 'sepia(0.22) saturate(1.2) contrast(1.05) brightness(1.04)' },
  { name: 'Postcard', css: 'saturate(1.45) contrast(1.12)' },
  { name: 'Faded film', css: 'contrast(0.88) saturate(0.72) brightness(1.08) sepia(0.14)', vignette: 0.35 },
  { name: 'Black & white', css: 'grayscale(1) contrast(1.18)', vignette: 0.3 },
  { name: 'Old-timer', css: 'sepia(0.85) contrast(1.06) brightness(0.96)', vignette: 0.55 },
];

const RANGE = 20;      // how far the camera can wander from where you were standing
const MIN_FOV = 12, MAX_FOV = 95;
const $ = (id) => document.getElementById(id);

// 35 mm-equivalent focal length for a vertical field of view (a full frame is 24 mm tall).
const focal = (fov) => Math.round(12 / Math.tan(THREE.MathUtils.degToRad(fov) / 2));

export class PhotoMode {
  constructor({ camera, renderer, terrain, sound, caption, onSnap }) {
    this.camera = camera;
    this.renderer = renderer;
    this.terrain = terrain;
    this.sound = sound;
    this.caption = caption; // () => text for the corner of the photo
    this.onSnap = onSnap;
    this.active = false;
    this.pos = new THREE.Vector3();
    this.anchor = new THREE.Vector3();
    this.filter = 0;
    this.grid = false;
    this.stamp = true;
    this.help = true;
    this.pending = false;
    this.el = $('photo');
    this.applyFilter();
  }

  // Start from wherever the camera is now. `still` keeps the camera from flying
  // about (down the mine, where the walls are close).
  enter({ still = false } = {}) {
    const c = this.camera;
    this.active = true;
    this.still = still;
    this.saved = { pos: c.position.clone(), rot: c.rotation.clone(), fov: c.fov };
    this.pos.copy(c.position);
    this.anchor.copy(c.position);
    this.yaw = c.rotation.y;
    this.pitch = c.rotation.x;
    this.roll = 0;
    this.fov = c.fov;
    this.el.classList.remove('hidden');
    this.el.classList.toggle('still', still);
    this.applyFilter();
    this.render();
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    const c = this.camera;
    c.position.copy(this.saved.pos);
    c.rotation.copy(this.saved.rot);
    c.fov = this.saved.fov;
    c.updateProjectionMatrix();
    this.renderer.domElement.style.filter = '';
    this.el.classList.add('hidden');
  }

  look(dx, dy) {
    // Slower when zoomed in, like a long lens.
    const k = 0.0022 * (this.fov / 70);
    this.yaw -= dx * k;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * k, -1.55, 1.55);
  }

  zoom(dir) {
    this.fov = THREE.MathUtils.clamp(this.fov * (dir > 0 ? 1.08 : 1 / 1.08), MIN_FOV, MAX_FOV);
    this.render();
  }

  key(code) {
    if (code === 'KeyF') { this.filter = (this.filter + 1) % FILTERS.length; this.applyFilter(); this.sound?.click(); }
    else if (code === 'KeyG') this.grid = !this.grid;
    else if (code === 'KeyT') this.stamp = !this.stamp;
    else if (code === 'KeyH') this.help = !this.help;
    else if (code === 'KeyR') { this.roll = 0; this.fov = this.saved.fov; }
    else if (code === 'Equal' || code === 'NumpadAdd') this.zoom(-1);
    else if (code === 'Minus' || code === 'NumpadSubtract') this.zoom(1);
    else return false;
    this.render();
    return true;
  }

  // keys: the set of held key codes; touch: the touch controls (move stick), if any.
  update(dt, keys, touch) {
    const c = this.camera;
    if (!this.still) {
      const fast = keys.has('ShiftLeft') || keys.has('ShiftRight') || touch?.run;
      const speed = (fast ? 7 : 2.5) * dt;
      const f = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
      const r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      let mf = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
      let mr = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
      let mu = (keys.has('Space') || keys.has('KeyE') ? 1 : 0) - (keys.has('KeyC') || keys.has('KeyQ') ? 1 : 0);
      if (touch) { mf += touch.move.y; mr += touch.move.x; mu += this.touchLift || 0; }
      this.pos.addScaledVector(f, mf * speed).addScaledVector(r, mr * speed);
      this.pos.y += mu * speed;
      // Stay within reach of where you were, and above the ground.
      const off = this.pos.clone().sub(this.anchor);
      if (off.length() > RANGE) this.pos.copy(this.anchor).addScaledVector(off.normalize(), RANGE);
      const ground = this.terrain.getHeight(this.pos.x, this.pos.z) + 0.12;
      if (this.pos.y < ground) this.pos.y = ground;
    }
    if (keys.has('BracketLeft')) this.roll += dt * 0.6;
    if (keys.has('BracketRight')) this.roll -= dt * 0.6;
    c.position.copy(this.pos);
    c.rotation.set(this.pitch, this.yaw, this.roll, 'YXZ');
    if (c.fov !== this.fov) { c.fov = this.fov; c.updateProjectionMatrix(); }
  }

  applyFilter() {
    if (!this.active) return;
    const f = FILTERS[this.filter];
    this.renderer.domElement.style.filter = f.css === 'none' ? '' : f.css;
    $('photo-vignette').style.opacity = f.vignette || 0;
  }

  render() {
    if (!this.el) return;
    this.el.classList.toggle('grid', this.grid);
    this.el.classList.toggle('nohelp', !this.help);
    $('photo-status').textContent = `${FILTERS[this.filter].name} · ${focal(this.fov)} mm${this.roll ? ` · tilted ${Math.round(THREE.MathUtils.radToDeg(-this.roll))}°` : ''}${this.stamp ? ' · date stamp' : ''}`;
  }

  snap() { if (this.active) this.pending = true; }

  // Called straight after the scene is drawn, while the picture is still in the
  // canvas. Draws it again at a crisper resolution if the screen's running low.
  capture(drawScene) {
    if (!this.pending) return;
    this.pending = false;
    const r = this.renderer;
    const was = r.getPixelRatio();
    const want = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    if (want > was + 0.01) {
      r.setPixelRatio(want);
      drawScene();
    }
    const src = r.domElement;
    const out = document.createElement('canvas');
    out.width = src.width;
    out.height = src.height;
    const g = out.getContext('2d');
    const f = FILTERS[this.filter];
    if (f.css !== 'none') g.filter = f.css;
    g.drawImage(src, 0, 0);
    g.filter = 'none';
    if (want > was + 0.01) r.setPixelRatio(was);
    const W = out.width, H = out.height;
    if (f.vignette) {
      const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) / 2);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, `rgba(0,0,0,${f.vignette})`);
      g.fillStyle = v;
      g.fillRect(0, 0, W, H);
    }
    if (this.stamp) {
      const text = this.caption();
      const size = Math.round(H * 0.028);
      g.font = `600 ${size}px ui-monospace, Consolas, monospace`;
      g.textAlign = 'right';
      g.textBaseline = 'bottom';
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillText(text, W - size * 1.2 + 2, H - size * 0.9 + 2);
      g.fillStyle = 'rgba(255,170,60,0.92)'; // the orange of an old camera's date stamp
      g.fillText(text, W - size * 1.2, H - size * 0.9);
    }
    this.flash();
    this.sound?.shutter?.();
    out.toBlob((blob) => blob && this.save(blob), 'image/jpeg', 0.92);
  }

  flash() {
    const fl = $('photo-flash');
    fl.classList.remove('go');
    void fl.offsetWidth; // restart the animation
    fl.classList.add('go');
  }

  async save(blob) {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const name = `fossicking-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.jpg`;
    // Phones: the share sheet has "Save image". Computers: a normal download.
    const file = typeof File === 'function' ? new File([blob], name, { type: 'image/jpeg' }) : null;
    if (file && matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); this.onSnap?.(true); return; } catch { /* cancelled: fall back to a download */ }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    this.onSnap?.(false);
  }
}
