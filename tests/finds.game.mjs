// Real mesh factories and inventory renderer; all saves belong to disposable
// browser contexts. No player storage is read or cleared.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.FIND_BASE_URL || 'http://127.0.0.1:5191/';
const browser = await chromium.launch({ headless: true });
const fixtures = [
  { type: 'sapphire', variety: 'blue', ct: 2.4, color: 0x2f5fb8 },
  { type: 'sapphire', variety: 'parti', ct: 3.7, color: 0x4f8a6a },
  { type: 'zircon', variety: 'honey', ct: 3.1, color: 0xc0802a },
  { type: 'spinel', variety: 'black', ct: 4.2, color: 0x121212 },
  { type: 'garnet', variety: 'almandine', ct: 3.8, color: 0x6a0f16 },
  { type: 'topaz', variety: 'pale blue', ct: 7.4, color: 0xb8d8ec },
  { type: 'scheelite', variety: 'honey', grams: 15, color: 0xd9c08a },
  { type: 'agate', variety: 'banded', grams: 72, bands: [0x8a5a3a, 0xe8dcc8, 0xb08060] },
  { type: 'nugget', grams: 6.2, seed: 734 },
  { type: 'nugget', style: 'crystalline', grams: 6.2, seed: 984 },
  ...['potch', 'milky opal', 'crystal opal', 'black opal'].map((variety, i) => ({
    type: 'opal', variety, crystal: { variety, len: .025, id: 84 + i, bright: 4, pattern: ['pinfire', 'flash', 'broad flash', 'harlequin'][i] },
  })),
  ...['amethyst', 'clear quartz', 'smoky quartz', 'fluorite'].map(variety => ({
    type: variety === 'fluorite' ? 'fluorite' : 'quartz', variety, lengthCm: 4, crystal: { variety, len: .04, id: 78 },
  })),
  ...['round', 'oval', 'emerald', 'cushion'].map(cut => ({ type: 'sapphire', variety: 'blue', ct: 2.4, color: 0x2f5fb8, cut })),
  { type: 'opal', variety: 'black opal', ct: 4, cut: 'cabochon', crystal: { id: 22, bright: 4, pattern: 'broad flash' } },
  { type: 'agate', variety: 'banded', grams: 72, cut: 'cabochon', bands: [0x8a5a3a, 0xe8dcc8, 0xb08060] },
].map(it => ({ grade: 'A', value: 50, label: it.variety || it.type, ...it }));
try {
  for (const mode of (process.env.FIND_MODES || 'desktop-hq,touch-simple,fallback').split(',')) {
    const phone = mode === 'touch-simple';
    const context = await browser.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1360, height: 900 }, hasTouch: phone, isMobile: phone });
    await context.addInitScript(({ phone, fixtures }) => {
      localStorage.setItem('fossicking-settings-v1', JSON.stringify({ preset: 'low', res: .6, shadows: 'off', aa: false, gems: phone ? 'simple' : 'inventory', reflections: 'static', warned: true }));
      localStorage.setItem('fossicking-save-v2', JSON.stringify({ seed: 12345, cash: 800, gold: .2, gems: fixtures.filter(it => it.type !== 'nugget'), nuggets: fixtures.filter(it => it.type === 'nugget') }));
    }, { phone, fixtures });
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(60000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !(mode === 'fallback' && m.text().includes('net::ERR_FAILED'))) errors.push(m.text()); });
    if (mode === 'fallback') await page.route('**/models/finds.glb', route => route.abort());
    try {
      await page.goto(base + '?test' + (phone ? '&touch' : ''), { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.fossick);
      if (phone) await page.locator('#play').tap(); else await page.locator('#play').click();
      if (phone) await page.locator('#touch [data-act="inventory"]').tap(); else await page.keyboard.press('KeyI');
      await page.locator('#inventory').waitFor({ state: 'visible' });
      const report = await page.evaluate(async ({ fixtures, phone }) => {
        const inv = fossick.inventory, snapshots = [], before = JSON.stringify(fossick.state);
        const frames = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        for (const it of fixtures) {
          const saved = JSON.stringify(it);
          inv.show(it); inv.spin.auto = false; inv.spin.x = .48; inv.spin.y = .65;
          await frames();
          const model = inv.holder.children[0], meshes = [];
          model.traverse(o => {
            if (!o.isMesh) return;
            const p = o.geometry.attributes.position;
            if (!Array.from(p.array).every(Number.isFinite)) throw Error('Non-finite geometry: ' + it.type);
            meshes.push({ name: o.geometry.name, vertices: p.count, triangles: (o.geometry.index?.count || p.count) / 3, transmission: o.material.transmission || 0 });
          });
          if (saved !== JSON.stringify(it)) throw Error('Rendering changed the find');
          if (!Number.isFinite(inv.radius) || inv.radius <= 0) throw Error('Invalid framing');
          if (phone && ['sapphire', 'zircon', 'topaz'].includes(it.type) && meshes.some(m => m.transmission > 0)) throw Error('Low mode enabled transmission');
          snapshots.push({ type: it.type, meshes, radius: inv.radius });
        }
        return { snapshots, untouched: before === JSON.stringify(fossick.state) };
      }, { fixtures, phone });
      assert.equal(report.untouched, true);
      assert.equal(report.snapshots.length, fixtures.length);
      assert.equal(report.snapshots[0].meshes[0].name.startsWith('sapphire_'), mode !== 'fallback');
      if (mode !== 'fallback') {
        const ground = await page.evaluate(() => fossick.finds.items.filter(it => !it.makeMesh && it.mesh && ['sapphire', 'spinel', 'zircon', 'scheelite'].includes(it.gem.type)).map(it => ({ type: it.gem.type, model: it.mesh.children[0].geometry.name })));
        assert.ok(ground.length > 0);
        assert.ok(ground.every(it => it.model.startsWith(it.type + '_')), 'Ground finds must receive streamed models');
      }
      assert.ok(report.snapshots.every(row => row.meshes.length > 0));
      assert.ok(report.snapshots.filter(row => ['sapphire', 'zircon', 'spinel', 'garnet', 'topaz', 'scheelite'].includes(row.type)).every(row => row.meshes.every(m => m.triangles < 1600)));
      // Actual mouse/touch dragging in the same player-facing canvas.
      await page.evaluate(it => {
        const inv = fossick.inventory;
        inv.tab = 'stones'; inv.selected = inv.state.gems.find(g => g.type === it.type && g.variety === it.variety);
        inv.render(); inv.spin.auto = false;
      }, fixtures[1]);
      const box = await page.locator('#inv-canvas').boundingBox(), x = box.x + box.width / 2, y = box.y + box.height / 2;
      const oldSpin = await page.evaluate(() => fossick.inventory.spin.y);
      if (phone) {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 60, y: y + 12 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 90, y + 20, { steps: 5 }); await page.mouse.up();
        await page.mouse.wheel(0, 100); await page.waitForTimeout(100);
        assert.ok(await page.evaluate(() => fossick.inventory.zoom > 1));
      }
      assert.ok(Math.abs(await page.evaluate(() => fossick.inventory.spin.y) - oldSpin) > .2);
      assert.equal(await page.evaluate(() => fossick.inventory.spin.dragging), false);
      await page.screenshot({ path: `node_modules/.cache/finds-${mode}.png` });
      if (phone) {
        await page.evaluate(async () => { if (document.fullscreenElement) await document.exitFullscreen(); });
        await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(150);
        assert.ok(await page.evaluate(() => { const i = fossick.inventory, c = i.renderer.domElement; return Math.abs(i.camera.aspect - c.clientWidth / c.clientHeight) < .01; }));
        await page.screenshot({ path: 'node_modules/.cache/finds-touch-landscape.png' });
      }
      if (!process.env.FIND_BASE_URL && mode !== 'fallback') {
        const models = await page.evaluate(async () => {
          const { assets, loadAssets } = await import('/src/assets.js');
          await loadAssets();
          const { findSeed, roughFindGeometry } = await import('/src/findvisuals.js');
          const saved = { type: 'sapphire', variety: 'blue', ct: 2.4, grade: 'B', color: 0x2f5fb8 };
          if (findSeed(saved) !== findSeed(JSON.parse(JSON.stringify(saved)))) throw Error('Unstable visual identity');
          if (roughFindGeometry(saved) !== roughFindGeometry({ ...saved, keep: true, value: 900 })) throw Error('Collection changes shape');
          return Object.entries(assets.finds || {}).map(([name, g]) => {
            g.computeBoundingBox(); return { name, min: g.boundingBox.min.toArray(), max: g.boundingBox.max.toArray(), triangles: (g.index?.count || g.attributes.position.count) / 3 };
          });
        });
        assert.equal(models.length, 21);
        for (const m of models) {
          assert.ok(m.triangles < 800, m.name);
          assert.ok(m.min.every((n, i) => Number.isFinite(n) && n < 0 && m.max[i] > 0 && m.max[i] - n < 1.8), m.name);
        }
      }
      assert.deepEqual(errors, []);
      console.log(`${mode}: ${fixtures.length} rough/cut/gold/crystal renders, finite geometry, saved finds unchanged, rotation/framing, no shader or page errors.`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
