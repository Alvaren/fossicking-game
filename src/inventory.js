import { CUTS } from './materials.js';
import { FOSSILS } from './fossils.js';
import * as THREE from 'three';
import { findStudioEnvironment } from './findvisuals.js';
import { GOLD_PRICE } from './shop.js';

// The inventory: everything you're carrying, plus the collection you're
// keeping. Pick a piece to turn it over in the viewer and read its details.

const $ = (id) => document.getElementById(id);

const TYPE_NAMES = {
  nugget: 'Nugget', sapphire: 'Sapphire', zircon: 'Zircon', topaz: 'Topaz', garnet: 'Garnet', spinel: 'Black spinel',
  agate: 'Agate', opal: 'Opal', fossil: 'Fossil', thunderegg: 'Thunderegg', scheelite: 'Scheelite', quartz: 'Quartz', feldspar: 'Feldspar', calcite: 'Calcite', fluorite: 'Fluorite',
};

export class Inventory {
  constructor(state, { onClose, makeMesh, canSell, onSell, onChange, sound }) {
    Object.assign(this, { state, onClose, makeMesh, canSell, onSell, onChange, sound });
    this.isOpen = false;
    this.tab = 'gold';
    this.selected = null;
    this.confirmSell = null;
    $('inv-close').addEventListener('click', () => this.close());
    for (const b of document.querySelectorAll('.inv-tab')) {
      b.addEventListener('click', () => { this.tab = b.dataset.tab; this.selected = null; this.render(); });
    }
    this.initViewer();
  }

  setTab(tab) {
    this.tab = tab;
    this.selected = null;
    if (this.isOpen) this.render();
  }

  // ---------- viewer ----------

  initViewer() {
    const canvas = $('inv-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.scene = new THREE.Scene();
    this.environmentTarget = findStudioEnvironment(this.renderer);
    this.scene.environment = this.environmentTarget.texture;
    const key = new THREE.DirectionalLight(0xfff2e0, 1.7);
    key.position.set(1, 2, 1.5);
    const rim = new THREE.DirectionalLight(0xd5e9ff, 1.1);
    rim.position.set(-2, 1, -1);
    this.scene.add(key, rim, new THREE.HemisphereLight(0xffffff, 0x39312a, 0.4));
    // The backdrop: dark and neutral at the edges with a soft glow straight
    // behind the stone, like holding it up to the light. See-through stones
    // only show what's behind them, so this is what makes them glow.
    // Worked out per pixel: the view is only ~15 degrees wide, too fine for vertex colours.
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { dark: { value: new THREE.Color(0x111d24) }, glow: { value: new THREE.Color(0x859292) } },
      vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 dark, glow;
varying vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  vec3 c = mix(dark, glow, pow(smoothstep(0.962, 1.0, -dir.z), 2.0) * 0.65);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`,
    })));
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.001, 50);
    this.holder = new THREE.Group();
    this.scene.add(this.holder);
    this.spin = { x: 0.35, y: 0, auto: true, dragging: false };
    canvas.addEventListener('pointerdown', (e) => { this.spin.dragging = true; this.spin.auto = false; this.spin.px = e.clientX; this.spin.py = e.clientY; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.spin.dragging) return;
      this.spin.y += (e.clientX - this.spin.px) * 0.01;
      this.spin.x = Math.max(-1.4, Math.min(1.4, this.spin.x + (e.clientY - this.spin.py) * 0.01));
      this.spin.px = e.clientX; this.spin.py = e.clientY;
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      canvas.addEventListener(event, () => { this.spin.dragging = false; });
    }
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom = Math.max(0.5, Math.min(2.5, (this.zoom || 1) * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
  }

  show(item) {
    this.holder.clear();
    if (!item) return;
    const mesh = this.makeMesh(item);
    // Centre it and frame it, whatever size it is.
    const box = new THREE.Box3().setFromObject(mesh);
    const c = box.getCenter(new THREE.Vector3());
    mesh.position.sub(c);
    const r = box.getSize(new THREE.Vector3()).length() / 2 || 0.01;
    this.radius = r;
    this.zoom = 1;
    this.holder.add(mesh);
    this.spin.auto = true;
  }

  tick = () => {
    if (!this.isOpen) return;
    const canvas = this.renderer.domElement;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w && h && (canvas.width !== Math.round(w * this.renderer.getPixelRatio()) || canvas.height !== Math.round(h * this.renderer.getPixelRatio()))) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    if (this.spin.auto) this.spin.y += 0.006;
    this.holder.rotation.set(this.spin.x, this.spin.y, 0, 'XYZ');
    const halfFov = Math.atan(Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * Math.min(1, this.camera.aspect));
    const d = (this.radius || 0.05) / Math.sin(halfFov) * 1.04 * (this.zoom || 1);
    this.camera.position.set(0, 0, d);
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.tick);
  };

  // ---------- panel ----------

  open() {
    this.isOpen = true;
    this.confirmSell = null;
    $('inventory').classList.remove('hidden');
    this.render();
    requestAnimationFrame(this.tick);
  }

  close() {
    this.isOpen = false;
    $('inventory').classList.add('hidden');
    this.onClose();
  }

  items() {
    const s = this.state;
    const all = [...s.nuggets, ...s.gems];
    if (this.tab === 'collection') return all.filter((i) => i.keep);
    if (this.tab === 'gold') return s.nuggets.filter((i) => !i.keep);
    return s.gems.filter((i) => !i.keep);
  }

  render() {
    const s = this.state;
    for (const b of document.querySelectorAll('.inv-tab')) b.classList.toggle('active', b.dataset.tab === this.tab);
    const nugG = s.nuggets.reduce((t, n) => t + n.grams, 0);
    const kept = [...s.nuggets, ...s.gems].filter((i) => i.keep);
    $('inv-summary').textContent =
      `${(s.gold + nugG).toFixed(2)} g of gold · ${s.gems.length} stones · ${kept.length} in your collection`;

    const list = $('inv-list');
    list.innerHTML = '';
    const items = this.items();
    if (this.tab === 'gold') list.append(this.row({ type: 'fine', label: `Fine gold in the bottle, ${s.gold.toFixed(3)} g`, value: s.gold * GOLD_PRICE }, 'Fine gold'));
    if (!items.length && this.tab !== 'gold') {
      const empty = document.createElement('p');
      empty.className = 'inv-empty';
      empty.textContent = this.tab === 'collection'
        ? 'Nothing kept yet. Specimen-grade finds land here, and you can keep anything else you fancy.'
        : 'No stones yet. Get sieving, mate.';
      list.append(empty);
    }
    // Best first.
    for (const it of [...items].sort((a, b) => b.value - a.value)) list.append(this.row(it));
    if (!this.selected) this.selected = this.tab === 'gold' ? { type: 'fine' } : items[0] || null;
    this.detail();
  }

  row(it, title) {
    const el = document.createElement('button');
    el.className = 'inv-row' + (this.isSelected(it) ? ' active' : '');
    const swatch = it.type === 'fine' || it.type === 'nugget' ? '#e8b830'
      : it.color != null ? `#${new THREE.Color(it.color).getHexString()}` : it.bands ? `#${new THREE.Color(it.bands[0]).getHexString()}` : '#aaa';
    el.innerHTML = `<span class="swatch" style="background:${swatch}"></span>`
      + `<span class="inv-name">${title || cap(it.label)}${it.specimen ? ' <b class="spec">SPECIMEN</b>' : ''}</span>`
      + `<span class="inv-val">$${Math.round(it.value).toLocaleString()}</span>`;
    el.onclick = () => { this.selected = it.type === 'fine' ? { type: 'fine' } : it; this.confirmSell = null; this.render(); };
    return el;
  }

  isSelected(it) {
    if (!this.selected) return false;
    if (it.type === 'fine') return this.selected.type === 'fine';
    return this.selected === it;
  }

  detail() {
    const it = this.selected;
    const info = $('inv-info');
    const actions = $('inv-actions');
    actions.innerHTML = '';
    if (!it) { info.innerHTML = ''; this.show(null); return; }
    if (it.type === 'fine') {
      const g = this.state.gold;
      this.show({ type: 'fine', grams: g });
      info.innerHTML = `<h3>Fine gold</h3><p>${g.toFixed(3)} g of flour gold and flakes from the pan and the sluice, in a glass bottle.</p>`
        + `<p class="inv-meta">Worth about $${Math.round(g * GOLD_PRICE).toLocaleString()} at $${GOLD_PRICE} a gram.</p>`;
      return;
    }
    this.show(it);
    const lines = [];
    lines.push(`<h3>${cap(it.label)}</h3>`);
    if (it.specimen) lines.push(it.type === 'fossil'
      ? '<p class="spec-note">Museum grade. Fossils this good are rare, and collectors and museums pay well for them.</p>'
      : '<p class="spec-note">Specimen grade. A collector\'s piece: worth a lot more whole than melted down or sold by the carat.</p>');
    const facts = [];
    facts.push(['Type', TYPE_NAMES[it.type] || it.type]);
    if (it.variety && it.type !== 'nugget') facts.push(['Variety', it.type === 'fossil' ? cap(FOSSILS[it.variety]?.name || it.variety) : it.variety]);
    if (it.grams && it.type === 'nugget') facts.push(['Weight', `${it.grams.toFixed(2)} g`]);
    if (it.grams && (it.type === 'agate' || it.type === 'scheelite' || it.type === 'thunderegg')) facts.push(['Weight', `${it.grams} g`]);
    if (it.type === 'thunderegg') facts.push(['Inside', it.cut ? it.core : 'No telling till it is sawn open. Kev in town has a saw.']);
    if (it.fluor) facts.push(['Under UV', it.type === 'scheelite' ? 'glows bright blue-white' : it.type === 'opal' ? 'glows a soft green-white' : 'glows green']);
    if (it.ct) facts.push(['Size', `${it.ct.toFixed(2)} ct`]);
    if (it.type === 'opal' && it.variety !== 'potch') facts.push(['Play of colour', `${it.pattern}, brightness ${it.bright}/5`]);
    if (it.lengthCm) facts.push(['Length', `${it.lengthCm.toFixed(1)} cm`]);
    if (it.grade) facts.push(['Grade', it.grade]);
    facts.push(['Condition', it.broken ? 'broken' : it.chipped ? 'chipped' : 'good']);
    if (it.cut) facts.push(['Cut', CUTS[it.cut]?.name || it.cut]);
    if (it.rough) facts.push(['Rough', `${cap(it.rough.label)}, $${Math.round(it.rough.value)}`]);
    if (it.age) facts.push(['Age', it.age]);
    if (it.from) facts.push(['Found', it.from]);
    if (it.ribbons?.length) facts.push(['Ribbons', it.ribbons.map((r) => `${r.title} (day ${r.day + 1})`).join(', ')]);
    if (it.foundAt) facts.push(['When', new Date(it.foundAt).toLocaleString()]);
    facts.push(['Value', `$${Math.round(it.value).toLocaleString()}`]);
    lines.push(`<table>${facts.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`);
    info.innerHTML = lines.join('');

    const keep = document.createElement('button');
    keep.className = 'ghost';
    keep.textContent = it.keep ? 'Take out of the collection' : 'Keep in the collection';
    keep.onclick = () => {
      if (it.keep && it.specimen && this.confirmSell !== `unkeep:${it.uid}`) {
        this.confirmSell = `unkeep:${it.uid}`;
        this.render();
        return;
      }
      it.keep = !it.keep;
      this.confirmSell = null;
      this.onChange();
      this.render();
    };
    actions.append(keep);
    if (this.canSell()) {
      const sell = document.createElement('button');
      const warn = it.specimen && this.confirmSell !== `sell:${it.uid}`;
      sell.textContent = warn ? `Sell for $${Math.round(it.value).toLocaleString()}…` : `Sell for $${Math.round(it.value).toLocaleString()}`;
      sell.onclick = () => {
        if (warn) { this.confirmSell = `sell:${it.uid}`; this.render(); return; }
        this.onSell(it);
        this.selected = null;
        this.confirmSell = null;
        this.render();
      };
      actions.append(sell);
    } else {
      const note = document.createElement('span');
      note.className = 'inv-meta';
      note.textContent = 'Sell at the buyer\'s table at camp.';
      actions.append(note);
    }
    if (this.confirmSell === `sell:${it.uid}`) {
      const w = document.createElement('p');
      w.className = 'spec-warn';
      w.textContent = 'Fair warning: this is specimen grade. Once it\'s sold it\'s gone. Click Sell again if you\'re sure.';
      actions.append(w);
    }
    if (this.confirmSell === `unkeep:${it.uid}`) {
      const w = document.createElement('p');
      w.className = 'spec-warn';
      w.textContent = 'It\'s a specimen. Taking it out of the collection means "sell all" at the buyer will flog it. Click again if you\'re sure.';
      actions.append(w);
    }
  }
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
