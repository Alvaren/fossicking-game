// The built game on an ephemeral loopback port; independent browser storage.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createRequire } from 'node:module';
const root = resolve('dist');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\/$/, '/index.html'));
    if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const require = createRequire(import.meta.url), { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true });
const gem = { type: 'sapphire', variety: 'parti', ct: 3.7, color: 0x4f8a6a, grade: 'A', value: 80, label: 'parti sapphire 3.70 ct (A-grade)' };
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(gem => {
    localStorage.setItem('fossicking-settings-v1', JSON.stringify({ preset: 'low', res: .6, shadows: 'off', aa: false, gems: 'full', reflections: 'static', warned: true }));
    if (!localStorage.getItem('fossicking-save-v2')) localStorage.setItem('fossicking-save-v2', JSON.stringify({ seed: 12345, gems: [gem] }));
  }, gem);
  const page = await context.newPage(), errors = [];
  page.setDefaultTimeout(60000);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/?test`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.fossick);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.fossick && navigator.serviceWorker.controller);
  await page.waitForFunction(() => fossick.finds.items.some(it => it.mesh?.children[0]?.geometry?.name?.startsWith('sapphire_')));
  await page.locator('#play').click();
  await page.keyboard.press('Digit4');
  await page.waitForFunction(() => fossick.view.current === 'sieve' && !fossick.view.pending);
  const sieve = await page.evaluate(gem => {
    const v = fossick.view;
    v.showSieveResult([gem, { ...gem, type: 'zircon', variety: 'honey', color: 0xc0802a }, { ...gem, type: 'garnet', color: 0x6a0f16 }]);
    v.sieveResultT = 30;
    return v.sieveFinds.children.map(m => ({ name: m.geometry.name, transmission: m.material.transmission }));
  }, gem);
  assert.deepEqual(sieve.map(m => m.name.split('_')[0]), ['sapphire', 'zircon', 'garnet']);
  assert.ok(sieve.every(m => m.transmission === .6));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'node_modules/.cache/finds-sieve.png' });
  const response = await page.evaluate(async () => (await caches.match(new URL('models/finds.glb', location.href))).status);
  assert.equal(response, 200);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.fossick && fossick.finds.items.some(it => it.mesh?.children[0]?.geometry?.name?.startsWith('sapphire_')));
  await page.locator('#play').click(); await page.keyboard.press('KeyI');
  await page.evaluate(() => fossick.inventory.setTab('stones'));
  await page.waitForTimeout(200);
  assert.match(await page.evaluate(() => fossick.inventory.holder.children[0].geometry.name), /^sapphire_/);
  assert.deepEqual(await page.evaluate(() => fossick.state.gems[0]), gem);
  await page.screenshot({ path: 'node_modules/.cache/finds-offline.png' });
  assert.deepEqual(errors, []);
  console.log('Production full-quality sieve shaders, streamed ground finds, cached GLB and offline inventory reload passed.');
} finally { await browser.close(); await new Promise(r => server.close(r)); }
