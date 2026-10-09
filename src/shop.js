// Gear upgrades and the gold buyer's table.

export const GOLD_PRICE = 95; // dollars per gram

export const UPGRADES = {
  detector: {
    title: 'Detector coil',
    levels: [
      { label: 'Stock 8" coil', range: 1 },
      { label: '11" double-D coil', range: 1.35, cost: 350, desc: 'Hears targets about a third deeper.' },
      { label: '14" mono coil', range: 1.75, cost: 1400, desc: 'Finds the deep ones the old-timers missed.' },
    ],
  },
  disc: {
    title: 'Target ID',
    levels: [
      { label: 'Ears only' },
      { label: 'Target ID screen', cost: 250, desc: 'Shows FERROUS / NON-FERROUS on the signal meter.' },
    ],
  },
  shovel: {
    title: 'Digging',
    levels: [
      { label: 'Garden shovel', dig: 0.16 },
      { label: 'Pick and long-handled shovel', dig: 0.27, cost: 220, desc: 'Each swing goes much deeper.' },
    ],
  },
  bucket: {
    title: 'Bucket',
    levels: [
      { label: '10 L bucket', cap: 6 },
      { label: '20 L bucket', cap: 10, cost: 120, desc: 'Carry 10 loads of paydirt.' },
      { label: 'Wheelbarrow', cap: 16, cost: 500, desc: 'Carry 16 loads of paydirt.' },
    ],
  },
  pan: {
    title: 'Gold pan',
    levels: [
      { label: 'Plastic pan', time: 4, mult: 1 },
      { label: 'Riffled pan', time: 2.8, mult: 1.3, cost: 180, desc: 'Faster, and keeps more fine gold.' },
      { label: 'Pro pan', time: 1.8, mult: 1.6, cost: 800, desc: 'Fastest panning, best recovery.' },
    ],
  },
  classifier: {
    title: 'Classifier',
    levels: [
      { label: 'None' },
      {
        label: '1/4" classifier screen', cost: 150,
        desc: 'Screens off the big stones before you pan: faster, more gold, and you check the oversize for agates and big gems.',
      },
    ],
  },
  sluice: {
    title: 'Sluice box',
    levels: [
      { label: 'None' },
      {
        label: '1.6 m aluminium sluice', cost: 450,
        desc: 'Set it in a fast run and shovel wash straight in. Runs a load a second; clean up and pan the concentrates.',
      },
    ],
  },
  sieve: {
    title: 'Gem sieve',
    levels: [
      { label: 'Single coarse sieve', time: 3.6, nested: false },
      { label: 'Nested sieve set (3 screens)', time: 2.4, nested: true, cost: 320, desc: 'Faster jigging, and the fine screen keeps the small stones.' },
    ],
  },
};

export const gear = (state, key) => UPGRADES[key].levels[state.up[key] || 0];

const $ = (id) => document.getElementById(id);

export class Shop {
  constructor(state, { onChange, onClose, onReset, sound }) {
    this.state = state;
    this.onChange = onChange;
    this.onClose = onClose;
    this.onReset = onReset;
    this.sound = sound;
    this.isOpen = false;
    $('shop-close').addEventListener('click', () => this.close());
    $('shop-reset').addEventListener('click', () => {
      if (confirm('Peg a new claim? You keep your cash, gold and gear, but get fresh ground.')) this.onReset();
    });
  }

  open() {
    this.isOpen = true;
    $('shop').classList.remove('hidden');
    this.render();
  }

  close() {
    this.isOpen = false;
    $('shop').classList.add('hidden');
    this.onClose();
  }

  render() {
    const s = this.state;
    const nuggets = s.nuggets.filter((n) => !n.keep);
    const nugValue = nuggets.reduce((t, n) => t + n.value, 0);
    const nugGrams = nuggets.reduce((t, n) => t + n.grams, 0);
    const value = Math.floor(s.gold * GOLD_PRICE + nugValue);
    const kept = [...s.nuggets, ...s.gems].filter((i) => i.keep).length;
    $('shop-blurb').textContent =
      `"G'day. Gold's $${GOLD_PRICE} a gram, nuggets a bit better. Stones I'll grade and pay on the piece. `
      + `Reckon there's ${s.remaining} decent nuggets still in the ground on this claim. `
      + `${s.forecast ? `Radio says a storm's due this arvo, about ${s.forecast} minutes off. Creek'll come up, so don't leave your sluice in.` : 'Weather looks crook upstream.'}"`;

    const sell = $('shop-sell');
    sell.innerHTML = '';
    const row = (title, desc, label, disabled, onclick) => {
      const r = document.createElement('div');
      r.className = 'item';
      const info = document.createElement('div');
      info.innerHTML = `<div class="name">${title}</div><div class="desc">${desc}</div>`;
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.disabled = disabled;
      btn.onclick = () => { onclick(); this.sound.coin(); this.onChange(); this.render(); };
      r.append(info, btn);
      sell.append(r);
    };
    row(
      `${(s.gold + nugGrams).toFixed(2)} g of gold`,
      `${s.gold.toFixed(2)} g fine gold${nuggets.length ? ` and ${nuggets.length} nugget${nuggets.length === 1 ? '' : 's'}` : ''}. Worth $${value.toLocaleString()}`,
      'Sell gold',
      value < 1,
      () => {
        s.cash += value;
        s.gold = 0;
        for (let i = s.nuggets.length - 1; i >= 0; i--) if (!s.nuggets[i].keep) s.nuggets.splice(i, 1);
      },
    );
    const stones = s.gems.filter((g) => !g.keep);
    const gemValue = Math.floor(stones.reduce((t, g) => t + g.value, 0));
    const best = stones.reduce((b, g) => (!b || g.value > b.value ? g : b), null);
    row(
      `${stones.length} stones`,
      stones.length ? `Worth $${gemValue.toLocaleString()}. Best: ${best.label} ($${Math.round(best.value)})` : 'Nothing to grade yet.',
      'Sell stones',
      !stones.length,
      () => { s.cash += gemValue; for (let i = s.gems.length - 1; i >= 0; i--) if (!s.gems[i].keep) s.gems.splice(i, 1); },
    );
    if (kept) {
      const note = document.createElement('p');
      note.className = 'desc';
      note.textContent = `${kept} piece${kept === 1 ? '' : 's'} in your collection aren't for sale. If you really want to part with one, sell it from your inventory (I).`;
      sell.append(note);
    }

    const items = $('shop-items');
    items.innerHTML = '';
    for (const [key, u] of Object.entries(UPGRADES)) {
      const lvl = s.up[key] || 0;
      const next = u.levels[lvl + 1];
      const row = document.createElement('div');
      row.className = 'item';
      const left = document.createElement('div');
      left.innerHTML = `<div class="name">${u.title}: ${u.levels[lvl].label}</div>`
        + `<div class="desc">${next ? `Next: ${next.label}. ${next.desc}` : 'Best there is.'}</div>`;
      const b = document.createElement('button');
      if (next) {
        b.textContent = `$${next.cost.toLocaleString()}`;
        b.disabled = s.cash < next.cost;
        b.onclick = () => {
          if (s.cash < next.cost) return;
          s.cash -= next.cost;
          s.up[key] = lvl + 1;
          this.sound.coin();
          this.onChange();
          this.render();
        };
      } else {
        b.textContent = 'Owned';
        b.disabled = true;
      }
      row.append(left, b);
      items.append(row);
    }
  }
}
