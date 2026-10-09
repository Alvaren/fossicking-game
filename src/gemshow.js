import * as THREE from 'three';
import { signTexture } from './world.js';

// The gem and mineral show. Every third day a marquee goes up at camp and
// collectors come in from all over. Put up to three collection pieces in front
// of the judges, then they go under the hammer. Ribbons lift the bidding, and
// you can always knock back a bid and keep the piece.

export const SHOW_EVERY = 3;
export const OPENS = 8, CLOSES = 17;
export const isShowDay = (day) => day % SHOW_EVERY === SHOW_EVERY - 1;
export const daysUntilShow = (day) => (SHOW_EVERY - 1 - (day % SHOW_EVERY) + SHOW_EVERY) % SHOW_EVERY;
const MAX_ENTRIES = 3;

export const PRIZES = [
  { title: 'Best in Show', short: 'Best in Show', cash: 250, colour: '#6b2a8c', mult: 1.25 },
  { title: 'Reserve Champion', short: 'Reserve Champion', cash: 100, colour: '#b0202a', mult: 1.15 },
  { title: 'Highly Commended', short: 'Highly Commended', cash: 0, colour: '#2a7a3a', mult: 1.08 },
];

const ENTRANTS = [
  'Marj Pearce, Rubyvale', 'Des Holloway, Lightning Ridge', 'Shirl and Ron Baxter', 'Old Bluey from Glen Innes',
  'Trev Kowalski, Coober Pedy', 'Mrs Dawson of Toowoomba', "Darren (Kev's cousin)", 'the Toowoomba Lapidary Club',
  'Nev from the caravan park', 'Dr Anne Whitlock', 'the Inverell Gem Club', 'Gaz and Tracey from Emmaville',
];
const THEIR_PIECES = [
  'a smoky quartz group from Kingsgate', 'a parti sapphire crystal from Rubyvale', 'a cut black opal from Lightning Ridge',
  'a polished thunderegg from Mt Hay', 'a gold nugget from Tibooburra', 'an amethyst geode from Agate Creek',
  'a Glossopteris slab from the Bowen Basin', 'a boulder opal from Winton', 'a topaz crystal from Torrington',
  'a fortification agate from Agate Creek', 'a faceted zircon from the Central Highlands', 'a fluorite group from Torrington',
];
const BIDDERS = [
  'Marj from Rubyvale', 'a dealer from Sydney', 'Des Holloway', 'the bloke in the Akubra', 'a museum buyer from Brisbane',
  'Mrs Dawson', 'a crystal shop from Byron', 'a collector on the phone from Perth', 'a jeweller from Inverell', 'Trev from Coober Pedy',
];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const money = (v) => `$${Math.round(v).toLocaleString()}`;
const pick = (list, r) => list[Math.floor(r() * list.length)];
const stepOf = (v) => (v < 100 ? 5 : v < 1000 ? 10 : v < 5000 ? 50 : 100);
function nice(v) {
  const step = stepOf(v);
  return Math.max(step, Math.round(v / step) * step);
}

// How a judge rates a piece: rarity and value, specimen quality, grade and condition, plus taste.
function judgeScore(it, r) {
  let s = Math.log10(Math.max(1, it.value)) * 10;
  if (it.specimen) s += 8;
  s += { A: 6, B: 3, C: 0 }[it.grade] ?? 2;
  if (it.chipped) s -= 4;
  if (it.broken) s -= 12;
  if (it.cut) s += 2;
  return s + r() * 7;
}

// ---------- the marquee ----------

export class ShowStall {
  constructor(scene, terrain, spot, faceTo) {
    this.group = new THREE.Group();
    this.group.position.set(spot.x, terrain.getHeight(spot.x, spot.z), spot.z);
    this.group.rotation.y = Math.atan2(faceTo.x - spot.x, faceTo.z - spot.z); // open front (+z) toward camp
    this.group.visible = false;
    scene.add(this.group);
    const g = this.group;
    const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
    const add = (geo, m, x, y, z, parent = g) => {
      const o = new THREE.Mesh(geo, m);
      o.position.set(x, y, z);
      o.castShadow = true;
      o.receiveShadow = true;
      parent.add(o);
      return o;
    };
    const W = 3.6, D = 3.0, H = 2.2;
    const canvas = mat(0xf2efe6, { side: THREE.DoubleSide });
    const wood0 = mat(0x7a5232);
    const pole = mat(0xb8bcc0, { metalness: 0.7, roughness: 0.4 });
    for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) {
      // Each pole runs down to the ground where it stands.
      const gy = terrain.getHeight(...this.worldXZ(x, z)) - this.group.position.y;
      const len = H - gy;
      add(new THREE.CylinderGeometry(0.025, 0.025, len, 6), pole, x, gy + len / 2, z);
    }
    // A square pyramid one unit across, stretched to the marquee's footprint.
    const roof = add(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1, true).rotateY(Math.PI / 4), canvas, 0, H + 0.375, 0);
    roof.scale.set(W, 0.75, D);
    // A red and white valance round the edge of the roof.
    const stripes = document.createElement('canvas');
    stripes.width = 128; stripes.height = 16;
    const sg = stripes.getContext('2d');
    for (let i = 0; i < 8; i++) { sg.fillStyle = i % 2 ? '#f2efe6' : '#b0202a'; sg.fillRect(i * 16, 0, 16, 16); }
    const stripeTex = new THREE.CanvasTexture(stripes);
    stripeTex.colorSpace = THREE.SRGBColorSpace;
    stripeTex.wrapS = THREE.RepeatWrapping;
    for (const [w, x, z, ry] of [[W, 0, D / 2, 0], [W, 0, -D / 2, 0], [D, W / 2, 0, Math.PI / 2], [D, -W / 2, 0, Math.PI / 2]]) {
      const t = stripeTex.clone();
      t.repeat.set(w / 0.9, 1);
      t.needsUpdate = true;
      const v = add(new THREE.PlaneGeometry(w, 0.22), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, side: THREE.DoubleSide }), x, H - 0.11, z);
      v.rotation.y = ry;
    }
    // Back wall of canvas, and the banner across the front.
    add(new THREE.PlaneGeometry(W, H), canvas, 0, H / 2, -D / 2);
    // The sign board stands on the front edge of the roof, up out of the way.
    const banner = add(new THREE.PlaneGeometry(2.4, 0.68), new THREE.MeshStandardMaterial({
      map: signTexture('GEM & MINERAL SHOW', '#1d3a6b', '#f4ecd8', 38), roughness: 0.9,
    }), 0, H + 0.3, D / 2 + 0.02);
    banner.castShadow = false;
    for (const x of [-1.1, 1.1]) add(new THREE.BoxGeometry(0.05, 0.75, 0.05), wood0, x, H + 0.2, D / 2 + 0.005);
    // Trestle tables with blue cloths, dealers' trays of stones, and the judges' rosettes.
    const cloth = mat(0x24427a);
    const wood = mat(0x7a5232);
    const table = (x, z, len, ry) => {
      const t = new THREE.Group();
      t.position.set(x, 0, z);
      t.rotation.y = ry;
      g.add(t);
      add(new THREE.BoxGeometry(len, 0.04, 0.7), wood, 0, 0.76, 0, t);
      add(new THREE.BoxGeometry(len + 0.04, 0.5, 0.72), cloth, 0, 0.52, 0, t);
      return t;
    };
    const back = table(0, -0.85, 2.8, 0);
    const side = table(-1.3, 0.55, 1.2, Math.PI / 2);
    const velvet = mat(0x15151c);
    const stoneColours = [0x2a4fd0, 0xd8a040, 0x8a3fb0, 0xe8e0d0, 0x40a070, 0xc03030, 0x60c8e0, 0x9a6a3a];
    for (let i = 0; i < 5; i++) {
      const tray = add(new THREE.BoxGeometry(0.4, 0.03, 0.28), velvet, -1.1 + i * 0.55, 0.795, 0.05, back);
      for (let k = 0; k < 6; k++) {
        const c = stoneColours[(i * 3 + k) % stoneColours.length];
        const st = add(new THREE.IcosahedronGeometry(0.018 + (k % 3) * 0.006, 0), new THREE.MeshStandardMaterial({ color: c, roughness: 0.15, metalness: 0.1 }),
          (k % 3 - 1) * 0.11, 0.03, (Math.floor(k / 3) - 0.5) * 0.1, tray);
        st.castShadow = false;
      }
    }
    // Glass-domed display on the judges' table, and a row of rosettes waiting.
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 20), wood, 0, 0.79, 0, side);
    add(new THREE.SphereGeometry(0.12, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 0.05 }), 0, 0.8, 0, side);
    PRIZES.forEach((p, i) => {
      const ros = rosette(p.colour);
      ros.position.set(-0.4 + i * 0.25, 0.79, 0.2);
      ros.rotation.x = -Math.PI / 2;
      side.add(ros);
    });
    // A few of the punters: dealers behind the table and collectors browsing.
    this.people = [];
    const folk = [
      [-0.8, -1.35, 0, 0x7a3a2a], [0.9, -1.35, 0, 0x3a5a7a],
      [0.6, 0.15, Math.PI + 0.3, 0xd8c8a0], [-0.2, 0.0, Math.PI - 0.4, 0x5a6a3a],
    ];
    for (const [x, z, ry, shirt] of folk) {
      const p = person(shirt);
      p.position.set(x, 0, z);
      p.rotation.y = ry;
      g.add(p);
      this.people.push({ p, phase: Math.random() * 6, ry });
    }
    this.t = 0;
  }

  worldXZ(lx, lz) {
    const a = this.group.rotation.y;
    return [this.group.position.x + lx * Math.cos(a) + lz * Math.sin(a), this.group.position.z - lx * Math.sin(a) + lz * Math.cos(a)];
  }

  setUp(on) { this.group.visible = on; }

  near(pos) {
    return this.group.visible && Math.hypot(pos.x - this.group.position.x, pos.z - this.group.position.z) < 3.4;
  }

  update(dt) {
    if (!this.group.visible) return;
    this.t += dt;
    // Shifting weight and turning to look at things.
    for (const f of this.people) {
      f.p.rotation.y = f.ry + Math.sin(this.t * 0.3 + f.phase) * 0.35;
      f.p.children[0].rotation.z = Math.sin(this.t * 0.8 + f.phase) * 0.02;
    }
  }
}

// A judge's rosette: pleated ring, centre button and two tails.
function rosette(colour) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.6, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), m);
  const button = new THREE.Mesh(new THREE.CircleGeometry(0.028, 16), new THREE.MeshStandardMaterial({ color: 0xe8d090, metalness: 0.6, roughness: 0.35 }));
  button.position.z = 0.002;
  g.add(ring, button);
  for (const s of [-1, 1]) {
    const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.09), m);
    tail.position.set(s * 0.018, -0.07, -0.001);
    tail.rotation.z = s * 0.25;
    g.add(tail);
  }
  return g;
}
export { rosette };

// A blocky bloke or sheila in an Akubra.
function person(shirt) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const m = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
  const skin = m(0xc89a78), jeans = m(0x3a4660), hat = m(0x6a4a2a);
  const part = (geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; body.add(o); return o; };
  for (const s of [-1, 1]) part(new THREE.BoxGeometry(0.14, 0.82, 0.16), jeans, s * 0.1, 0.41, 0);
  part(new THREE.BoxGeometry(0.42, 0.6, 0.24), m(shirt), 0, 1.12, 0);
  for (const s of [-1, 1]) part(new THREE.BoxGeometry(0.1, 0.56, 0.12), m(shirt), s * 0.27, 1.12, 0.02).rotation.z = s * 0.06;
  part(new THREE.SphereGeometry(0.12, 12, 8), skin, 0, 1.56, 0);
  part(new THREE.CylinderGeometry(0.22, 0.22, 0.015, 16), hat, 0, 1.65, 0);
  part(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 12), hat, 0, 1.71, 0);
  return root;
}

// ---------- the show itself (the panel at the marquee) ----------

export class GemShow {
  constructor(state, { sound, onChange, onClose, onPrize, onSale }) {
    this.state = state;
    this.sound = sound;
    this.onChange = onChange;
    this.onClose = onClose;
    this.onPrize = onPrize;
    this.onSale = onSale;
    this.isOpen = false;
    this.el = document.getElementById('gemshow');
    this.body = document.getElementById('gs-body');
    document.getElementById('gs-close').addEventListener('click', () => this.close());
    this.chosen = new Set();
  }

  collection() { return [...this.state.nuggets, ...this.state.gems].filter((i) => i.keep); }

  open() {
    this.isOpen = true;
    this.el.classList.remove('hidden');
    const s = this.state;
    if (!s.show || s.show.day !== s.day) { s.show = { day: s.day, stage: 'pick', notes: [] }; this.chosen.clear(); }
    if (s.show.stage === 'auction' && !this.lot) this.finish(); // reloaded mid-auction
    this.render();
  }

  close() {
    this.isOpen = false;
    clearTimeout(this.timer);
    // Walk off mid-auction and the rest of your lots are passed in.
    if (this.state.show?.stage === 'auction') this.finish();
    this.el.classList.add('hidden');
    this.onChange();
    this.onClose();
  }

  render() {
    const sh = this.state.show;
    this.body.innerHTML = '';
    ({ pick: () => this.renderPick(), judged: () => this.renderJudged(), auction: () => this.renderLot(), done: () => this.renderDone() })[sh.stage]();
  }

  para(html, cls = 'desc') {
    const p = document.createElement('p');
    p.className = cls;
    p.innerHTML = html;
    this.body.append(p);
    return p;
  }

  button(text, onclick, cls = '') {
    const b = document.createElement('button');
    b.textContent = text;
    if (cls) b.className = cls;
    b.onclick = onclick;
    return b;
  }

  renderPick() {
    const items = this.collection();
    this.para('"G\'day, I\'m the steward. Collectors have come in from all over. Pick up to three pieces from your collection to go in front of the judges. '
      + 'Ribbons get prize money, and then everything goes under the hammer. You don\'t have to sell: knock back any bid you don\'t like and take it home."', '');
    if (!items.length) {
      this.para('You\'ve nothing in your collection yet. Specimen-grade finds go there by themselves, or you can keep anything you like from your inventory (I). Come back next show.');
      return;
    }
    const list = document.createElement('div');
    for (const it of items.sort((a, b) => b.value - a.value)) {
      const r = document.createElement('div');
      r.className = 'item' + (this.chosen.has(it) ? ' chosen' : '');
      const info = document.createElement('div');
      const rib = (it.ribbons || []).map((x) => x.title).join(', ');
      info.innerHTML = `<div class="name">${cap(it.label)}${it.specimen ? ' <span class="h-note">specimen</span>' : ''}</div>`
        + `<div class="desc">The buyer would give ${money(it.value)}.${rib ? ` Past ribbons: ${rib}.` : ''}</div>`;
      const on = this.chosen.has(it);
      const b = this.button(on ? 'Entered' : 'Enter it', () => {
        if (on) this.chosen.delete(it);
        else if (this.chosen.size < MAX_ENTRIES) this.chosen.add(it);
        this.sound.click();
        this.render();
      }, on ? '' : 'ghost');
      b.disabled = !on && this.chosen.size >= MAX_ENTRIES;
      r.append(info, b);
      list.append(r);
    }
    this.body.append(list);
    const go = this.button(`Put ${this.chosen.size || 'them'} in front of the judges`, () => this.judge());
    go.disabled = !this.chosen.size;
    const row = document.createElement('div');
    row.className = 'gs-actions';
    row.append(go);
    this.body.append(row);
  }

  judge() {
    const s = this.state, sh = s.show, r = Math.random;
    const field = [];
    const names = [...ENTRANTS].sort(() => r() - 0.5).slice(0, 6);
    const pieces = [...THEIR_PIECES].sort(() => r() - 0.5);
    names.forEach((who, i) => field.push({ who, what: pieces[i], score: 18 + r() * 17 + (r() < 0.25 ? r() * 10 : 0) }));
    const mine = [...this.chosen];
    for (const it of mine) field.push({ who: 'You', what: it.label, score: judgeScore(it, r), item: it });
    field.sort((a, b) => b.score - a.score);
    sh.results = field.map((f, i) => ({ who: f.who, what: f.what, place: i, uid: f.item?.uid }));
    sh.lots = [];
    field.forEach((f, i) => {
      if (!f.item) return;
      const prize = PRIZES[i];
      if (prize) {
        (f.item.ribbons ||= []).push({ title: prize.title, day: s.day });
        s.cash += prize.cash;
        this.onPrize?.(prize, f.item);
      }
      sh.lots.push({ uid: f.item.uid, prize: i < PRIZES.length ? i : -1 });
    });
    sh.stage = 'judged';
    this.sound.coin();
    this.onChange();
    this.render();
  }

  renderJudged() {
    const sh = this.state.show;
    this.para('The judges have been round with their loupes. The results:', '');
    const t = document.createElement('table');
    t.className = 'gs-results';
    t.innerHTML = sh.results.map((r, i) => {
      const prize = PRIZES[i];
      return `<tr class="${r.who === 'You' ? 'you' : ''}"><td>${i + 1}</td><td>${prize ? `<span class="rib" style="background:${prize.colour}"></span>${prize.short}` : ''}</td>`
        + `<td>${r.who === 'You' ? '<b>You</b>' : r.who}: ${r.what}</td><td>${prize?.cash && r.who === 'You' ? `+${money(prize.cash)}` : ''}</td></tr>`;
    }).join('');
    this.body.append(t);
    const won = sh.lots.filter((l) => l.prize >= 0).length;
    this.para(won ? 'Ribbons get the collectors interested. Expect the bidding to go higher on those.' : 'No ribbons this time. The collectors will still have a go at them.');
    const row = document.createElement('div');
    row.className = 'gs-actions';
    row.append(this.button('On to the auction', () => { sh.stage = 'auction'; sh.lot = 0; this.startLot(); }));
    this.body.append(row);
  }

  itemFor(uid) { return this.collection().find((i) => i.uid === uid); }

  // Line up the bids for the next lot: who bids, and how high the room goes.
  startLot() {
    const sh = this.state.show;
    const lot = sh.lots[sh.lot];
    const it = lot && this.itemFor(lot.uid);
    if (!it) { this.finish(); this.render(); return; }
    const r = Math.random;
    let m = it.specimen ? 1.15 + r() * 0.55 : 0.95 + r() * 0.4;
    if (r() < 0.15) m *= 0.7; // a quiet room: nobody's biting today
    m *= lot.prize >= 0 ? PRIZES[lot.prize].mult : 1;
    m *= 1 + 0.05 * Math.min(3, (it.ribbons || []).filter((x) => x.day !== this.state.day).length); // a piece with a history
    const final = nice(it.value * m);
    const room = [...BIDDERS].sort(() => r() - 0.5).slice(0, 3 + Math.floor(r() * 2));
    const bids = [];
    // Open low, but not so low the bidding drags on for ever: a dozen-odd bids at most.
    let amt = Math.max(nice(it.value * 0.4), nice(final / 1.17 ** 11)), last = null;
    while (amt < final) {
      let who = pick(room, r);
      if (who === last) who = room[(room.indexOf(who) + 1) % room.length];
      bids.push({ who, amt });
      last = who;
      amt = Math.max(amt + stepOf(amt), nice(amt * (1.12 + r() * 0.1)));
    }
    let who = pick(room, r);
    if (who === last) who = room[(room.indexOf(who) + 1) % room.length];
    bids.push({ who, amt: Math.max(final, bids.length ? bids[bids.length - 1].amt + 5 : final) });
    this.lot = { it, bids, shown: 0, call: 0 };
    this.render();
    this.tick();
  }

  tick() {
    const L = this.lot;
    if (!this.isOpen || !L) return;
    if (L.shown < L.bids.length) {
      L.shown++;
      this.sound.bid();
      this.timer = setTimeout(() => this.tick(), 420 + Math.random() * 380);
    } else if (L.call < 2) {
      L.call++;
      this.timer = setTimeout(() => this.tick(), 950);
    } else {
      L.call = 3;
      this.sound.gavel();
    }
    this.render();
  }

  renderLot() {
    const sh = this.state.show, L = this.lot;
    if (!L) return;
    const lot = sh.lots[sh.lot];
    const prize = lot.prize >= 0 ? PRIZES[lot.prize] : null;
    this.para(`<b>Lot ${sh.lot + 1} of ${sh.lots.length}: ${cap(L.it.label)}</b>${prize ? ` <span class="rib" style="background:${prize.colour}"></span>${prize.short}` : ''}`, 'name');
    this.para(`The buyer at camp would give you ${money(L.it.value)} for it.`);
    const log = document.createElement('div');
    log.className = 'gs-bids';
    const shown = L.bids.slice(0, L.shown);
    log.innerHTML = shown.length
      ? shown.map((b, i) => `<div class="${i === shown.length - 1 ? 'top' : ''}">${money(b.amt)} <span>${b.who}</span></div>`).reverse().join('')
      : '<div>"Who\'ll start me off?"</div>';
    this.body.append(log);
    const high = shown[shown.length - 1];
    const status = ['', 'Going once…', 'Going twice…', `"All done at ${high ? money(high.amt) : ''}?"`][L.call];
    if (status) this.para(status, 'gs-call');
    const row = document.createElement('div');
    row.className = 'gs-actions';
    if (L.call < 3) {
      row.append(this.button('Hurry him up', () => { clearTimeout(this.timer); L.shown = L.bids.length; L.call = 3; this.sound.gavel(); this.render(); }, 'ghost'));
    } else {
      row.append(
        this.button(`Sell to ${high.who} for ${money(high.amt)}`, () => this.settle(true, high)),
        this.button('Knock it back, keep it', () => this.settle(false, high), 'ghost'),
      );
    }
    this.body.append(row);
  }

  settle(sell, high) {
    const s = this.state, sh = s.show, it = this.lot.it;
    if (sell) {
      const list = it.type === 'nugget' ? s.nuggets : s.gems;
      list.splice(list.indexOf(it), 1);
      s.cash += high.amt;
      this.sound.coin();
      sh.notes.push(`Sold ${it.label} to ${high.who} for ${money(high.amt)}.`);
      this.onSale?.(it, high.amt, high.who);
    } else {
      sh.notes.push(`Knocked back ${money(high.amt)} for ${it.label}. It's going home with you.`);
    }
    this.onChange();
    sh.lot++;
    this.lot = null;
    if (sh.lot >= sh.lots.length) { this.finish(); this.render(); } else this.startLot();
  }

  finish() {
    const sh = this.state.show;
    clearTimeout(this.timer);
    if (sh.lots) for (let i = sh.lot ?? 0; i < sh.lots.length; i++) {
      const it = this.itemFor(sh.lots[i].uid);
      if (it && !sh.notes.some((n) => n.includes(it.label))) sh.notes.push(`${cap(it.label)} was passed in. You kept it.`);
    }
    sh.stage = 'done';
    this.lot = null;
  }

  renderDone() {
    const sh = this.state.show;
    this.para('"That\'s the show for today. Good to see you, come back next time."', '');
    for (const n of sh.notes) this.para(n);
    if (!sh.notes.length) this.para('You had a look round the dealers\' tables.');
    this.para(`The next show's in ${SHOW_EVERY} days.`);
  }
}
