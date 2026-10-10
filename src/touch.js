// Touch controls for phones and tablets: a move stick on the left, drag
// anywhere else to look, and big buttons for the actions. The game reads
// `move`, `run`, `use` and `jump` each frame; one-shot buttons call back.

export const IS_TOUCH = new URLSearchParams(location.search).has('touch')
  || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);

export class TouchControls {
  constructor({ onLook, actions }) {
    this.onLook = onLook;
    this.actions = actions;
    this.move = { x: 0, y: 0 };
    this.run = false;
    this.use = false;
    this.usePressed = false;
    this.jump = false;
    this.stickId = null;
    this.lookId = null;
    this.root = document.getElementById('touch');
    this.stick = document.getElementById('stick');
    this.knob = document.getElementById('stick-knob');
    this.bind();
  }

  show(v) { this.root.classList.toggle('hidden', !v); if (!v) this.usePressed = false; }

  // Keep a quick tap until the game reads it, even if it ends between frames.
  consumeUsePress() { const pressed = this.usePressed; this.usePressed = false; return pressed; }

  // Show the right button labels for standing or kneeling.
  setKneeling(k) { this.root.classList.toggle('kneeling', k); }

  bind() {
    const canvasLayer = document.getElementById('touch-look');
    // Move stick.
    this.stick.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.stickId = t.identifier;
      const r = this.stick.getBoundingClientRect();
      this.cx = r.left + r.width / 2;
      this.cy = r.top + r.height / 2;
      this.radius = r.width / 2;
      this.moveStick(t);
    }, { passive: false });
    // Look: drag anywhere that isn't a control.
    canvasLayer.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.lookId !== null) return;
      const t = e.changedTouches[0];
      this.lookId = t.identifier;
      this.lx = t.clientX;
      this.ly = t.clientY;
    }, { passive: false });
    window.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.stickId) this.moveStick(t);
        if (t.identifier === this.lookId) {
          // Phones need a bit more turn per pixel than a mouse.
          this.onLook((t.clientX - this.lx) * 1.6, (t.clientY - this.ly) * 1.6);
          this.lx = t.clientX;
          this.ly = t.clientY;
        }
      }
    }, { passive: true });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.stickId) {
          this.stickId = null;
          this.move.x = 0; this.move.y = 0; this.run = false;
          this.knob.style.transform = '';
        }
        if (t.identifier === this.lookId) this.lookId = null;
      }
    };
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);

    // Hold buttons.
    const hold = (id, key) => {
      const el = document.getElementById(id);
      el.addEventListener('touchstart', (e) => { e.preventDefault(); this[key] = true; if (key === 'use') this.usePressed = true; el.classList.add('down'); }, { passive: false });
      const up = (e) => { e.preventDefault(); this[key] = false; el.classList.remove('down'); };
      el.addEventListener('touchend', up, { passive: false });
      el.addEventListener('touchcancel', up, { passive: false });
    };
    hold('t-use', 'use');
    hold('t-jump', 'jump');
    // Tap buttons.
    for (const el of this.root.querySelectorAll('[data-act]')) {
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        el.classList.add('down');
        this.actions[el.dataset.act]?.();
      }, { passive: false });
      el.addEventListener('touchend', () => el.classList.remove('down'));
    }
  }

  moveStick(t) {
    let dx = t.clientX - this.cx, dy = t.clientY - this.cy;
    const d = Math.hypot(dx, dy);
    const max = this.radius;
    if (d > max) { dx *= max / d; dy *= max / d; }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    this.move.x = dx / max;
    this.move.y = -dy / max; // up is forward
    this.run = d > max * 0.92; // push right to the edge to run
  }
}
