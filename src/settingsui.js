import { settings, PRESETS, OPTIONS, saveSettings, matchingPreset, firstRun } from './settings.js';
import { IS_TOUCH } from './touch.js';

// The Settings screen (from the pause screen), and a one-off heads-up for
// phone players.

const $ = (id) => document.getElementById(id);
const PRESET_NAMES = { low: 'Low', medium: 'Medium', high: 'High', ultra: 'Ultra' };

export class SettingsPanel {
  constructor({ onApply, beforeReload }) {
    this.onApply = onApply;
    this.beforeReload = beforeReload;
    this.startAA = settings.aa;
    this.isOpen = false;
    $('settings-btn').addEventListener('click', (e) => { e.stopPropagation(); this.open(); });
    $('settings-close').addEventListener('click', () => this.close());
    // Phones: say so up front, once.
    if (IS_TOUCH && !settings.warned) {
      $('phone-warn').classList.remove('hidden');
      $('phone-ok').addEventListener('click', (e) => {
        e.stopPropagation();
        settings.warned = true;
        saveSettings();
        $('phone-warn').classList.add('hidden');
      });
      $('phone-settings').addEventListener('click', (e) => { e.stopPropagation(); this.open(); });
    }
    if (firstRun) saveSettings();
  }

  open() {
    this.isOpen = true;
    $('settings').classList.remove('hidden');
    this.render();
  }

  close() {
    this.isOpen = false;
    $('settings').classList.add('hidden');
    if (settings.aa !== this.startAA) {
      // Antialiasing is fixed when the game starts, so restart to apply it.
      this.beforeReload?.();
      location.reload();
    }
  }

  set(key, value) {
    settings[key] = value;
    settings.preset = matchingPreset();
    saveSettings();
    this.onApply();
    this.render();
  }

  usePreset(name) {
    Object.assign(settings, PRESETS[name]);
    settings.preset = name;
    saveSettings();
    this.onApply();
    this.render();
  }

  render() {
    const cur = matchingPreset();
    const pr = $('set-presets');
    pr.innerHTML = '';
    for (const [name, label] of Object.entries(PRESET_NAMES)) {
      const b = document.createElement('button');
      b.className = 'seg' + (cur === name ? ' on' : '');
      b.textContent = label;
      b.onclick = () => this.usePreset(name);
      pr.append(b);
    }
    if (cur === 'custom') {
      const c = document.createElement('span');
      c.className = 'h-note';
      c.textContent = 'Custom';
      pr.append(c);
    }
    const rows = $('set-rows');
    rows.innerHTML = '';
    for (const [key, opt] of Object.entries(OPTIONS)) {
      const row = document.createElement('div');
      row.className = 'set-row';
      row.innerHTML = `<div><div class="name">${opt.label}</div><div class="desc">${opt.note}</div></div>`;
      const segs = document.createElement('div');
      segs.className = 'segs';
      for (const [value, label] of opt.choices) {
        const b = document.createElement('button');
        b.className = 'seg' + (settings[key] === value ? ' on' : '');
        b.textContent = label;
        b.onclick = () => this.set(key, value);
        segs.append(b);
      }
      row.append(segs);
      rows.append(row);
    }
    $('set-note').textContent = settings.aa !== this.startAA
      ? 'Smooth edges changed: the game will restart when you close this (your progress is saved).'
      : IS_TOUCH ? "On a phone, Low or Medium keeps it cool and saves battery." : '';
  }
}
