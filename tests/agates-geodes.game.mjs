// Exercise the existing player flow. Walking/day waiting is skipped; pickups,
// collection, cutter fees/queues and save/reload use the real game actions.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { GEMS } from '../src/minerals.js';
import { makeGeode, GEODE_CORES } from '../src/geodes.js';
import { mulberry32 } from '../src/noise.js';
const require = createRequire(import.meta.url), { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.AGATE_BASE_URL || 'http://127.0.0.1:5191/';
const geode = makeGeode(mulberry32(845));
const fixtures = [
  ...GEMS.agate.varieties.map(def => ({ type: 'agate', variety: def.v, bands: def.bands, grams: 84, grade: 'A', label: `${def.v} agate`, value: 25 })),
  { ...geode, label: 'Unopened geode' },
  ...Object.keys(GEODE_CORES).map(core => ({ ...geode, core, grade: 'A', cut: 'halves', label: core + ' geode' })),
  { type: 'thunderegg', core: 'crystal-lined', grams: 240, seed: 734, grade: 'A', cut: 'halves', label: 'Crystal-lined thunderegg', value: 50 },
  { type: 'agate', variety: 'plume', bands: GEMS.agate.varieties.find(v => v.v === 'plume').bands, grams: 84, grade: 'A', cut: 'cabochon', label: 'Polished plume agate', value: 80 },
];
const browser = await chromium.launch({ headless: true });
try {
  for (const mode of (process.env.AGATE_MODES || 'desktop,touch').split(',')) {
    const phone = mode === 'touch';
    const context = await browser.newContext({ viewport: phone ? { width: 844, height: 390 } : { width: 1360, height: 900 }, hasTouch: phone, isMobile: phone });
    await context.addInitScript(phone => {
      localStorage.setItem('fossicking-settings-v1', JSON.stringify({ preset: 'low', res: .6, shadows: 'off', aa: false, gems: phone ? 'simple' : 'inventory', reflections: 'static', warned: true }));
      if (sessionStorage.getItem('agate-fixture')) return;
      sessionStorage.setItem('agate-fixture', '1');
      localStorage.setItem('fossicking-save-v2', JSON.stringify({ seed: 12345, cash: 600, difficulty: 'easy' }));
    }, phone);
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(60000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('dialog', dialog => dialog.accept());
    const click = selector => phone ? page.locator(selector).tap() : page.locator(selector).click();
    const interact = () => phone ? click('#touch [data-act="interact"]') : page.keyboard.press('KeyE');
    const enter = () => click('#play');
    try {
      await page.goto(origin + '?test' + (phone ? '&touch' : ''), { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.fossick);
      if (process.env.AGATE_OFFLINE) {
        await page.evaluate(() => navigator.serviceWorker.ready);
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForFunction(() => window.fossick && navigator.serviceWorker.controller);
        await context.setOffline(true);
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForFunction(() => window.fossick);
      }
      const ground = await page.evaluate(() => ({
        legacy: fossick.finds.items.filter(it => it.id < 4000 || it.id >= 5000).map(it => [it.id, it.x.toFixed(6), it.z.toFixed(6), it.rot ?? null, it.gem.grams ?? it.gem.ct ?? null]),
        ids: fossick.finds.items.map(it => it.id), geodes: fossick.finds.items.filter(it => it.gem.type === 'geode').map(it => it.id),
      }));
      // Recorded against deployed 6618fdf with this same seed: existing items stay put.
      assert.equal(createHash('sha256').update(JSON.stringify(ground.legacy)).digest('hex'), 'f101bfa488c6d92ed8f23f4e172d8ff5e70cd609a7bf6f6214a77d0b944d2098');
      assert.equal(ground.geodes.length, 12); assert.equal(new Set(ground.ids).size, ground.ids.length);
      await enter();
      const target = await page.evaluate(() => {
        const f = fossick, it = f.finds.items.find(it => it.gem.type === 'geode');
        f.player.pos.set(it.x + .1, f.terrain.getHeight(it.x + .1, it.z + .2), it.z + .2); f.player.vel.set(0, 0, 0);
        return { id: it.id, core: it.gem.core, seed: it.gem.seed, grams: it.gem.grams };
      });
      await interact(); await page.waitForFunction(() => fossick.state.gems.some(it => it.type === 'geode'));
      assert.equal(await page.evaluate(id => fossick.finds.items.find(it => it.id === id).collected, target.id), true);
      if (phone) await click('#touch [data-act="inventory"]'); else await page.keyboard.press('KeyI');
      await click('.inv-tab[data-tab="stones"]');
      const inside = await page.locator('#inv-info').textContent(); assert.match(inside, /Hidden until sawn/); assert.equal(inside.includes(target.core), false);
      await page.getByRole('button', { name: 'Keep in the collection', exact: true }).click();
      await click('#inv-close');
      await page.evaluate(() => {
        const f = fossick, camp = f.terrain.camp, flip = f.creek.cx(camp.z) > camp.x ? -1 : 1;
        const x = camp.x - 3 * flip, z = camp.z + 1;
        f.player.pos.set(x, f.terrain.getHeight(x, z), z); f.player.vel.set(0, 0, 0);
      });
      await interact(); await page.locator('#shop').waitFor({ state: 'visible' });
      await click('#shop-cutter .item button');
      assert.equal(await page.evaluate(() => fossick.state.cash), 585);
      assert.equal(await page.evaluate(() => fossick.state.cutting.length), 1);
      assert.equal(await page.evaluate(() => fossick.state.gems.length), 0);
      await page.reload({ waitUntil: 'networkidle' }); await page.waitForFunction(() => window.fossick);
      assert.equal(await page.evaluate(() => fossick.state.cutting[0].item.core), target.core);
      assert.equal(await page.evaluate(id => fossick.finds.items.find(it => it.id === id).collected, target.id), true);
      await page.evaluate(() => fossick.newDay());
      const result = await page.evaluate(() => fossick.state.gems[0]);
      assert.equal(result.type, 'geode'); assert.equal(result.cut, 'halves'); assert.equal(result.core, target.core);
      assert.equal(result.seed, target.seed); assert.equal(result.grams, target.grams); assert.equal(result.keep, true);
      await page.evaluate(() => fossick.newDay()); assert.equal(await page.evaluate(() => fossick.state.gems.length), 1);
      await enter();
      if (phone) await click('#touch [data-act="inventory"]'); else await page.keyboard.press('KeyI');
      await click('.inv-tab[data-tab="collection"]');
      await page.waitForFunction(() => fossick.inventory.holder.children[0]?.userData.hollow);
      await page.screenshot({ path: `node_modules/.cache/geode-reveal-${mode}.png` });
      // Actual drag/touch on the opened specimen, with no alternate controller.
      const canvas = page.locator('#inv-canvas'); await canvas.scrollIntoViewIfNeeded();
      await page.evaluate(() => { fossick.inventory.spin.auto = false; });
      const beforeSpin = await page.evaluate(() => fossick.inventory.spin.y), box = await canvas.boundingBox();
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      if (phone) {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 55, y: y + 12 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 55, y + 12, { steps: 4 }); await page.mouse.up(); }
      assert.ok(Math.abs(await page.evaluate(() => fossick.inventory.spin.y) - beforeSpin) > .2);
      const shots = await page.evaluate(async fixtures => {
        const inv = fossick.inventory, shots = [];
        for (const item of fixtures) {
          inv.show(item); inv.spin.auto = false; inv.spin.x = .12; inv.spin.y = .15;
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          inv.renderer.render(inv.scene, inv.camera);
          shots.push({ name: item.label, image: inv.renderer.domElement.toDataURL() });
        }
        return shots;
      }, fixtures);
      if (phone) {
        await page.evaluate(async () => { if (document.fullscreenElement) await document.exitFullscreen(); });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => { fossick.inventory.selected = fossick.state.gems[0]; fossick.inventory.render(); });
        await page.locator('#inv-canvas').scrollIntoViewIfNeeded();
        await page.screenshot({ path: 'node_modules/.cache/geode-reveal-portrait.png' });
      }
      assert.deepEqual(errors, []);
      console.log(`${mode}${process.env.AGATE_OFFLINE ? ' (offline production build)' : ''}: legacy ground unchanged; 12 geodes, real pickup, hidden core, $15 sawing, queue reload, one returned specimen, collection and rotation; 16 new/legacy specimen renders without errors.`);
      if (!phone) {
        await page.close();
        const gallery = await context.newPage(); await gallery.setViewportSize({ width: 1200, height: 1240 });
        await gallery.setContent(`<html><body style="margin:0;background:#121a19;color:#dfdfcf;font:16px sans-serif;display:grid;grid-template-columns:repeat(4,1fr)">${shots.map(s => `<div style="text-align:center;padding:8px"><img style="width:280px;height:270px;object-fit:cover" src="${s.image}"><div>${s.name}</div></div>`).join('')}</body></html>`);
        await gallery.waitForFunction(() => [...document.images].every(i => i.complete));
        await gallery.screenshot({ path: 'node_modules/.cache/agates-geodes-gallery.png', fullPage: true });
      }
    } catch (error) {
      if (!page.isClosed()) { await page.screenshot({ path: `node_modules/.cache/geode-failure-${mode}.png` }); console.log('Page errors:', errors); }
      throw error;
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
