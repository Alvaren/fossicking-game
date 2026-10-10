import * as THREE from 'three';
import { mulberry32 } from './noise.js';

// Four repeatable pattern variants per palette. A saved stone keeps its pattern
// after polishing; no generation or cutting RNG is consumed by the renderer.
const textures = new Map();
const hex = c => `#${c.toString(16).padStart(6, '0')}`;
export function agateTexture(bands = [0x8a5a3a, 0xe8dcc8, 0xb08060], variety = 'banded', seed = 1) {
  const variant = Math.abs(Math.floor(seed || 1)) % 4;
  const key = `${variety}:${bands.join(',')}:${variant}`;
  if (textures.has(key)) return textures.get(key);
  const size = 256, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(size, size);
  const random = mulberry32(variant * 7919 + bands[0]);
  const palette = bands.map(c => [(c >> 16) & 255, (c >> 8) & 255, c & 255]);
  const plain = ['moss', 'dendritic', 'plume', 'chalcedony', 'carnelian', 'brecciated'].includes(variety);
  const centres = Array.from({ length: variety === 'brecciated' ? 26 : variety === 'eye' ? 5 : 1 }, () => ({ x: random(), y: random() }));
  const phase = variant * .7;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = x / size, ny = y / size;
    const px = (nx - .46) / 1.13, py = ny - .52;
    const angle = Math.atan2(py, px), radius = Math.hypot(px, py);
    const wave = .1 * Math.sin(angle * 3 + phase) + .035 * Math.sin(angle * 7);
    let depth = radius * (1 + wave) + .01 * Math.sin(px * 22 + py * 14 + phase);
    if (variety === 'fortification') depth = Math.max(Math.abs(px) * .92, Math.abs(py)) * (1 + wave * .3);
    if (variety === 'waterline') depth = ny * .58 + .005 * Math.sin(nx * 15 + phase);
    if (variety === 'eye') depth = Math.min(...centres.map(c => Math.hypot((nx - c.x) * .85, ny - c.y)));
    let rgb;
    const cloud = .5 + .25 * Math.sin(nx * 17 + Math.sin(ny * 11 + phase)) + .2 * Math.cos(ny * 19 + nx * 5);
    if (variety === 'brecciated') {
      let near = Infinity, next = Infinity, fragment = 0;
      for (let k = 0; k < centres.length; k++) {
        const d = Math.hypot(nx - centres[k].x, ny - centres[k].y);
        if (d < near) { next = near; near = d; fragment = k; } else if (d < next) next = d;
      }
      const colour = palette[fragment % Math.max(1, palette.length - 1)];
      const cement = Math.max(0, 1 - (next - near) / .014);
      rgb = colour.map((n, i) => n * (1 - cement) * (.85 + cloud * .2) + palette[palette.length - 1][i] * cement);
    } else if (plain) {
      const base = ['moss', 'dendritic', 'plume'].includes(variety) ? palette[palette.length - 1] : palette[0];
      const second = palette[Math.min(1, palette.length - 1)];
      const mix = ['moss', 'dendritic', 'plume'].includes(variety) ? .08 : cloud * .65;
      rgb = base.map((n, i) => n * (1 - mix) + second[i] * mix);
    } else {
      const band = depth * (variety === 'eye' ? 45 : 32), whole = Math.floor(band), f = band - whole;
      const colour = palette[((whole % palette.length) + palette.length) % palette.length];
      const edge = f < .075 ? .72 : .9 + .1 * Math.pow(Math.sin(f * Math.PI), .4);
      rgb = colour.map(n => n * edge);
    }
    const i = (y * size + x) * 4, grain = .965 + random() * .035;
    for (let k = 0; k < 3; k++) pixels.data[i + k] = rgb[k] * grain;
    pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  // These are mineral inclusions, not green concentric agate bands.
  const branch = (x, y, angle, length, width, level, colour) => {
    ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.lineCap = 'round';
    const ex = x + Math.cos(angle) * length, ey = y + Math.sin(angle) * length;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo((x + ex) / 2 + (random() - .5) * 10, (y + ey) / 2, ex, ey); ctx.stroke();
    if (level <= 0) return;
    for (const side of [-1, 1]) branch(ex, ey, angle + side * (.3 + random() * .45), length * (.58 + random() * .12), width * .6, level - 1, colour);
  };
  if (['moss', 'dendritic'].includes(variety)) {
    for (let i = 0; i < (variety === 'moss' ? 38 : 18); i++) {
      const x = random() * size, y = random() * size;
      branch(x, y, random() * Math.PI * 2, 14 + random() * 25, variety === 'moss' ? 2.7 : 1.6, variety === 'moss' ? 3 : 4, hex(bands[i % Math.max(1, bands.length - 1)]));
    }
  } else if (variety === 'plume') {
    for (let i = 0; i < 11; i++) {
      const x = random() * size, y = 70 + random() * 210, height = 55 + random() * 95;
      const bend = (random() - .5) * 35, width = 18 + random() * 17;
      ctx.strokeStyle = hex(bands[i % Math.max(1, bands.length - 1)]); ctx.lineCap = 'round';
      for (let j = 0; j < 46; j++) {
        const t = j / 46, spread = Math.sin(t * Math.PI) * width * (.75 + random() * .3);
        const cx = x + Math.sin(t * 2) * bend, cy = y - t * height;
        ctx.globalAlpha = .35 + t * .5; ctx.lineWidth = 1 + random() * 2;
        for (const side of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(cx, cy);
          ctx.quadraticCurveTo(cx + side * spread * .7, cy - 3, cx + side * spread, cy - 12 - t * 6); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textures.set(key, texture);
  return texture;
}
