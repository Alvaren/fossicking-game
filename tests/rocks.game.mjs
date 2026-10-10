// Disposable saves; retain the original input handlers. Teleporting only skips
// the walk to the outcrop. Gallery uses the actual scenery mesh/material code.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { makeExpedition, EXPEDITIONS } from '../src/regions.js';
const require = createRequire(import.meta.url), { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.ROCK_BASE_URL || 'http://127.0.0.1:5191/';
const modes = process.env.ROCK_CASES ? JSON.parse(process.env.ROCK_CASES) : [
  ['new-england', false], ['golden-triangle', false], ['qld-gemfields', false],
  ['tasmania-west', false], ['ne-tasmania', false], ['new-england', true], ['ne-tasmania', true],
];
const browser = await chromium.launch({ headless: true });
try {
  for (const [region, phone] of modes) {
    const context = await browser.newContext({ viewport: phone ? { width: 844, height: 390 } : { width: 1200, height: 800 }, hasTouch: phone, isMobile: phone });
    const save = { seed: 12345, activeRegion: region };
    if (EXPEDITIONS.includes(region)) save.expeditions = { [region]: makeExpedition(save, [], region) };
    await context.addInitScript(({ save, high, phone }) => {
      localStorage.setItem('fossicking-settings-v1', JSON.stringify({ preset: high ? 'high' : 'low', res: phone ? .75 : 1, shadows: high ? 'high' : 'off', aa: high, gems: high ? 'full' : 'simple', reflections: 'static', warned: true }));
      if (!sessionStorage.getItem('rocks-fixture')) {
        sessionStorage.setItem('rocks-fixture', '1');
        localStorage.setItem('fossicking-save-v2', JSON.stringify(save));
      }
    }, { save, high: !!process.env.ROCK_HIGH, phone });
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(60000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const click = s => phone ? page.locator(s).tap() : page.locator(s).click();
    try {
      await page.goto(origin + '?test' + (phone ? '&touch' : ''), { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.fossick || window.fossickTas);
      const savedCobbles = await page.evaluate(() => window.fossick?.bedload.snapshot() || null);
      if (process.env.ROCK_OFFLINE) {
        await page.evaluate(() => navigator.serviceWorker.ready);
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForFunction(() => (window.fossick || window.fossickTas) && navigator.serviceWorker.controller);
        await context.setOffline(true); await page.reload({ waitUntil: 'networkidle' });
        await page.waitForFunction(() => window.fossick || window.fossickTas);
        assert.deepEqual(await page.evaluate(() => window.fossick?.bedload.snapshot() || null), savedCobbles, 'Existing centimetre-rounded cobble saves survive offline reload');
      }
      const tas = region.includes('tasmania');
      const materialInfo = await page.evaluate(() => {
        const f = window.fossick || window.fossickTas, info = [];
        f.scene.traverse(o => { if (o.material?.userData.rock) info.push({ ...o.material.userData.rock, name: o.name, count: o.count, kinds: o.geometry.attributes.aRockKind ? [...new Set(o.geometry.attributes.aRockKind.array)].sort() : [] }); });
        return info;
      });
      assert.ok(materialInfo.length > 0, 'Geological materials are loaded');
      if (!tas) assert.ok(materialInfo.some(m => m.name === 'Creek bedload rocks' && m.wet));
      if (region === 'new-england') {
        assert.deepEqual(materialInfo.find(m => m.name === 'Geological scenery rocks').kinds, [0, 1, 2, 3, 4, 5]);
        // Leaves animate; movable cobbles have a rounded save format (above).
        const layout = await page.evaluate(() => ({ instances: fossick.scene.children.filter(o => o.isInstancedMesh && o.geometry.type !== 'PlaneGeometry' && o !== fossick.bedload.mesh).map(o => ({ count: o.count, matrices: Array.from(o.instanceMatrix.array) })), boulders: fossick.boulders.list.map(({ id, kind, x, z, r, yaw, seed, vug }) => ({ id, kind, x, z, r, yaw, seed, vug })), finds: fossick.finds.items.map(o => [o.id, o.x, o.z]) }));
        const layoutHash = createHash('sha256').update(JSON.stringify(layout)).digest('hex');
        if (layoutHash !== '66480178c1dd58ac0820151a23f824f6d69a5ce8e48ac8b46f39180971e9236a') await writeFile('node_modules/.cache/rocks-layout-current.json', JSON.stringify(layout));
        assert.equal(layoutHash, '66480178c1dd58ac0820151a23f824f6d69a5ce8e48ac8b46f39180971e9236a', 'World layout and find identities match deployed 1028e21');
      }
      await click(tas ? '#tas-resume' : '#play');
      if (tas && phone) {
        await click('#tas-pan');
        assert.equal(await page.evaluate(() => fossickTas.tool), 'pan');
      } else if (tas) {
        await page.keyboard.press('Digit2'); await page.mouse.wheel(0, 100);
        await page.waitForFunction(() => fossickTas.tool === 'pan'); await page.keyboard.press('Digit2');
      } else if (phone) {
        await click('.slot[data-tool="hammer"]');
      } else {
        await page.keyboard.press('Digit6');
        await page.waitForFunction(() => fossick.state.tool === 'hammer');
        await page.mouse.wheel(0, 100);
        await page.waitForFunction(() => fossick.state.tool === 'detector'); // unowned UV torch is skipped
        await page.keyboard.press('Digit6');
      }
      if (region === 'new-england') {
        await page.evaluate(() => {
          const f = fossick, b = f.boulders.list.find(b => b.kind === 'granite');
          const x = b.x, z = b.z + 2.3;
          f.player.pos.set(x, f.terrain.getHeight(x, z), z); f.player.vel.set(0, 0, 0);
          f.player.yaw = 0; f.player.pitch = Math.atan2(b.group.position.y - (f.player.pos.y + 1.65), 2.3); f.daynight.hour = 11;
        });
        await page.waitForTimeout(300);
        await page.screenshot({ path: `node_modules/.cache/rocks-granite-${phone ? 'touch' : 'after'}.png` });
        // Exercise both fresh split faces and crystal cavity shader masks.
        await page.evaluate(() => {
          const f = fossick, b = f.boulders.list.find(b => b.kind === 'granite' && b.vug);
          b.split = true; b.t = 1; f.boulders.pose(b); f.boulders.showCrystals(b);
          const z = b.z + 2.3; f.player.pos.set(b.x, f.terrain.getHeight(b.x, z), z); f.player.vel.set(0, 0, 0);
          f.player.pitch = Math.atan2(b.group.position.y - (f.player.pos.y + 1.65), 2.3);
        });
        await page.waitForTimeout(250);
        await page.screenshot({ path: `node_modules/.cache/rocks-split-${phone ? 'touch' : 'desktop'}.png` });
      } else await page.screenshot({ path: `node_modules/.cache/rocks-${region}-${phone ? 'touch' : 'desktop'}.png` });
      // These custom shaders must link successfully, including low/touch paths.
      assert.deepEqual(errors, []);
      const shaders = await page.evaluate(() => (window.fossick || window.fossickTas).renderer.info.programs.map(p => p.diagnostics?.runnable));
      assert.ok(shaders.every(runnable => runnable !== false));
      if (region === 'new-england' && !phone && origin.includes('127.0.0.1') && !process.env.ROCK_OFFLINE && !process.env.ROCK_HIGH) {
        const images = await page.evaluate(async () => {
          const { rockMaterial, ROCK_TYPES } = await import('/src/rockmaterials.js');
          const f = fossick, renderer = new f.renderer.constructor({ antialias: true }); renderer.setSize(600, 480);
          renderer.toneMapping = f.renderer.toneMapping; renderer.toneMappingExposure = 1;
          const scene = new f.scene.constructor(); scene.background = f.scene.fog.color.clone().setHex(0x283239);
          for (const light of f.scene.children.filter(o => o.isDirectionalLight || o.isHemisphereLight)) { const l = light.clone(); l.castShadow = false; l.intensity = l.isDirectionalLight ? 2.8 : 1.1; if (l.isDirectionalLight) l.position.set(3, 5, 4); scene.add(l); }
          const camera = f.scene.children.find(o => o.isCamera).clone(); camera.fov = 35; camera.aspect = 600 / 480; camera.position.set(0, .2, 1.1); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
          const geo = f.scene.getObjectByName('Granite tors').geometry, Mesh = f.boulders.list[0].halves[0].mesh.constructor;
          const mesh = new Mesh(geo); mesh.scale.set(.26, .21, .24); scene.add(mesh);
          const images = [];
          for (const type of ROCK_TYPES) { mesh.material = rockMaterial(type); renderer.render(scene, camera); images.push({ type, image: renderer.domElement.toDataURL() }); }
          renderer.dispose(); return images;
        });
        await page.close();
        const gallery = await context.newPage(); await gallery.setViewportSize({ width: 1200, height: 720 });
        await gallery.setContent(`<body style="margin:0;background:#141d20;color:#efdfbd;font:20px system-ui;display:grid;grid-template-columns:repeat(3,1fr)">${images.map(i => `<div style="text-align:center;padding:8px"><img style="width:384px;height:300px;object-fit:cover" src="${i.image}"><div>${i.type}</div></div>`).join('')}</body>`);
        await gallery.waitForFunction(() => [...document.images].every(i => i.complete));
        await gallery.screenshot({ path: 'node_modules/.cache/rock-materials-gallery.png', fullPage: true });
      }
      assert.deepEqual(errors, []);
      console.log(`${region} ${phone ? 'touch' : 'desktop'}${process.env.ROCK_OFFLINE ? ' offline' : ''}${process.env.ROCK_HIGH ? ' high shadows/full gems' : ''}: rock materials, rendering and original tool input passed without errors.`);
    } catch (e) { console.log('Browser errors:', errors); if (!page.isClosed()) await page.screenshot({ path: 'node_modules/.cache/rocks-failure.png' }); throw e; }
    finally { await context.close(); }
  }
} finally { await browser.close(); }
