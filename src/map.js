import { topographyCanvas } from './topography.js';
import { PLAY } from './terrain.js';

// The claim map (M): a hillshaded sketch of your ground with the creek, camp
// and pegs, you, your gear and your digs, the source rocks you've found, and a
// dot wherever you've made a find, so you can see where things settle.

const $ = (id) => document.getElementById(id);
const EXTENT = PLAY + 6;
const PX = 560;

export const SOURCES = {
  reef: { label: 'Quartz reef', colour: '#f4f0e6' },
  basalt: { label: 'Basalt cap', colour: '#3a3a40' },
  rhyolite: { label: 'Rhyolite', colour: '#d98f80' },
  granite: { label: 'Granite tors', colour: '#c9a89a' },
  opal: { label: 'Old opal workings', colour: '#f6f2ea' },
  fossil: { label: 'Fossil shale', colour: '#6c7076' },
  mine: { label: 'Lucky Strike mine', colour: '#3a2a20' },
};
const DOT = {
  nugget: '#ffcf4a', fine: '#ffcf4a', sapphire: '#4f86ff', zircon: '#d9772e', topaz: '#bfe3ff', garnet: '#b0222e',
  spinel: '#222', agate: '#f0a060', opal: '#7fe0d0', fossil: '#8a8f96', scheelite: '#9fd8ff', quartz: '#c49bff', feldspar: '#e8b090', calcite: '#ffd28a', fluorite: '#8d7aff',
};

export class ClaimMap {
  constructor(state, terrain, { onClose }) {
    this.state = state;
    this.terrain = terrain;
    this.onClose = onClose;
    this.isOpen = false;
    $('map-close').addEventListener('click', () => this.close());
    this.base = null;
  }

  toPx(x, z) { return [((x + EXTENT) / (2 * EXTENT)) * PX, ((z + EXTENT) / (2 * EXTENT)) * PX]; }

  // Hillshade, contours and water, drawn once.
  buildBase() {
    this.base = topographyCanvas({
      width: PX, height: PX,
      bounds: { x0: -EXTENT, x1: EXTENT, z0: -EXTENT, z1: EXTENT },
      heightAt: (x,z) => this.terrain.getOrigHeight(x,z),
      waterAt: (x,z) => this.terrain.creek.dry ? null : this.terrain.creek.waterY(z),
    });
  }

  open(player, extras) {
    this.isOpen = true;
    $('map').classList.remove('hidden');
    if (!this.base) this.buildBase();
    this.draw(player, extras);
  }

  close() {
    this.isOpen = false;
    $('map').classList.add('hidden');
    this.onClose();
  }

  draw(player, { sluice, patches, sources, camp, flood }) {
    const cv = $('map-canvas');
    const ctx = cv.getContext('2d');
    cv.width = cv.height = PX;
    ctx.drawImage(this.base, 0, 0);
    // Claim pegs.
    const [bx0, by0] = this.toPx(-PLAY, -PLAY), [bx1, by1] = this.toPx(PLAY, PLAY);
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = 'rgba(60,40,20,0.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx0, by0, bx1 - bx0, by1 - by0);
    ctx.setLineDash([]);
    // Stones the last flood rolled: from where they were to where they fetched up.
    for (const m of flood || []) {
      const [ax, ay] = this.toPx(m.x0, m.z0), [bx, by] = this.toPx(m.x1, m.z1);
      ctx.strokeStyle = '#ff7a1a';
      ctx.fillStyle = '#ff7a1a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      // Where it fetched up, sized by the stone.
      ctx.beginPath(); ctx.arc(bx, by, 2.5 + m.r * 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 1; ctx.stroke();
    }
    // Finds, older first so recent ones sit on top.
    for (const f of this.state.findPoints) {
      const [px, py] = this.toPx(f.x, f.z);
      ctx.fillStyle = DOT[f.t] || '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (f.s) star(ctx, px, py, 6); else ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Pan tests: how many colours (specks of gold) each pan showed, where the wash was dug.
    ctx.font = 'bold 10px Segoe UI, sans-serif';
    for (const t of this.state.panTests || []) {
      const [px, py] = this.toPx(t.x, t.z);
      const txt = String(t.c);
      const w = ctx.measureText(txt).width + 6;
      ctx.fillStyle = t.c >= 6 ? '#ffcf4a' : t.c >= 2 ? '#f2e6c8' : '#cfc6b4';
      ctx.strokeStyle = '#2a1a0c';
      ctx.lineWidth = 1;
      ctx.fillRect(px - w / 2, py - 7, w, 13);
      ctx.strokeRect(px - w / 2, py - 7, w, 13);
      ctx.fillStyle = '#2a1a0c';
      ctx.fillText(txt, px - w / 2 + 3, py + 3);
    }
    // Hand digs.
    ctx.strokeStyle = '#5a3a1a';
    for (const p of patches) {
      const [px, py] = this.toPx(p.cx, p.cz);
      ctx.strokeRect(px - 3, py - 3, 6, 6);
    }
    // Sources you've been near.
    ctx.font = 'bold 12px Segoe UI, sans-serif';
    for (const [key, s] of Object.entries(sources)) {
      if (!this.state.discovered[key] && !s.known) continue;
      const [px, py] = this.toPx(s.x, s.z);
      ctx.fillStyle = s.colour || SOURCES[key]?.colour || '#b89059';
      ctx.strokeStyle = '#2a1a0c';
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      label(ctx, s.label || SOURCES[key]?.label || key, px + 10, py + 4);
    }
    // Camp.
    const [cx, cy] = this.toPx(camp.x, camp.z);
    ctx.fillStyle = '#e0703a';
    ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 7, cy + 5); ctx.lineTo(cx - 7, cy + 5); ctx.closePath(); ctx.fill();
    label(ctx, 'Camp', cx + 10, cy + 4);
    // Sluice.
    if (sluice.placed || sluice.stranded) {
      const p = sluice.placed ? sluice.spot : sluice.stranded;
      const [sx, sy] = this.toPx(p.x, p.z);
      ctx.fillStyle = '#c0c4c8';
      ctx.fillRect(sx - 4, sy - 4, 8, 8);
      label(ctx, sluice.placed ? 'Sluice' : 'Sluice (washed up)', sx + 8, sy + 4);
    }
    // You, pointing the way you're facing.
    const [px, py] = this.toPx(player.pos.x, player.pos.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-player.yaw);
    ctx.fillStyle = '#d82020';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7, 7); ctx.lineTo(0, 3); ctx.lineTo(-7, 7); ctx.closePath();
    ctx.stroke(); ctx.fill();
    ctx.restore();
    // North arrow.
    ctx.fillStyle = '#2a1a0c';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillText('N', PX - 26, 24);
    ctx.beginPath(); ctx.moveTo(PX - 21, 30); ctx.lineTo(PX - 15, 44); ctx.lineTo(PX - 27, 44); ctx.closePath(); ctx.fill();

    const counts = {};
    for (const f of this.state.findPoints) counts[f.t] = (counts[f.t] || 0) + 1;
    $('map-legend').innerHTML = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([t, n]) => `<span><i style="background:${DOT[t] || '#fff'}"></i>${t} ${n}</span>`).join('')
      + '<span><i class="star"></i>specimen</span>'
      + ((this.state.panTests || []).length ? '<span><b class="pt">4</b>pan test (colours)</span>' : '')
      + (flood?.length ? '<span><i style="background:#ff7a1a"></i>stones the last flood moved (line from where they were)</span>' : '');
  }
}

function label(ctx, text, x, y) {
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,248,236,0.9)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#2a1a0c';
  ctx.fillText(text, x, y);
}

function star(ctx, x, y, r) {
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
