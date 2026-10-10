// Isolated saves and the existing input handlers. Camera relocation only skips walks.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { makeExpedition, EXPEDITIONS } from '../src/regions.js';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.ENV_BASE_URL || 'http://127.0.0.1:5191/';
const before = !!process.env.ENV_BEFORE, high = !!process.env.ENV_HIGH;
const cases = process.env.ENV_CASES ? JSON.parse(process.env.ENV_CASES) : [
  ['new-england', false], ['golden-triangle', false], ['qld-gemfields', false],
  ['tasmania-west', false], ['ne-tasmania', false], ['new-england', true], ['ne-tasmania', true],
];
const browser = await chromium.launch({ headless: true });
try {
  for (const [region, phone] of cases) {
    const context = await browser.newContext({ viewport: phone ? { width: 844, height: 390 } : { width: 1200, height: 800 }, hasTouch: phone, isMobile: phone });
    const save = { seed: 12345, activeRegion: region };
    if (EXPEDITIONS.includes(region)) save.expeditions = { [region]: makeExpedition(save, [], region) };
    await context.addInitScript(({ save, phone, high }) => {
      localStorage.setItem('fossicking-settings-v1', JSON.stringify({ preset: high ? 'high' : 'low', res: phone ? .75 : 1, shadows: high ? 'high' : 'off', aa: high, gems: high ? 'full' : 'simple', reflections: 'static', warned: true }));
      if (!sessionStorage.getItem('environment-fixture')) {
        sessionStorage.setItem('environment-fixture', '1');
        localStorage.setItem('fossicking-save-v2', JSON.stringify(save));
      }
    }, { save, phone, high });
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(60000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const tas = EXPEDITIONS.includes(region), click = s => phone ? page.locator(s).tap() : page.locator(s).click();
    try {
      await page.goto(origin + '?test' + (phone ? '&touch' : ''), { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.fossick || window.fossickTas);
      if (process.env.ENV_OFFLINE) {
        await page.evaluate(() => navigator.serviceWorker.ready);
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForFunction(() => (window.fossick || window.fossickTas) && navigator.serviceWorker.controller);
        await context.setOffline(true); await page.reload({ waitUntil: 'networkidle' });
        await page.waitForFunction(() => window.fossick || window.fossickTas);
      }
      await click(tas ? '#tas-resume' : '#play');
      if (phone) await click(tas ? '#tas-pan' : '.slot[data-tool="hammer"]');
      else { await page.keyboard.press(tas ? 'Digit2' : 'Digit6'); await page.mouse.wheel(0, 100); }
      await page.waitForFunction(tas => tas ? fossickTas.tool === 'pan' : ['hammer', 'detector'].includes(fossick.state.tool), tas);
      const suffix = `${region}-${phone ? 'touch' : 'desktop'}-${before ? 'before' : high ? 'high' : 'after'}`;
      await page.screenshot({ path: `node_modules/.cache/env-${suffix}.png` });
      await page.evaluate(tas => {
        if (tas) {
          const f = fossickTas, p = f.profile, z = p.CAMP.z - 5, x = p.riverX(z) - p.riverWidth(z) - 1;
          f.player.x = x; f.player.z = z; f.player.yaw = -Math.PI / 2; f.player.pitch = -.24; f.expedition.hour = 11;
        } else {
          const f = fossick, z = 12, x = f.terrain.creek.cx(z) - f.terrain.creek.halfWidth(z) - 2;
          f.player.pos.set(x, f.terrain.getHeight(x, z), z); f.player.vel.set(0, 0, 0);
          f.player.yaw = -Math.PI / 2; f.player.pitch = -.25; f.daynight.hour = 11;
        }
      }, tas);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `node_modules/.cache/env-creek-${suffix}.png` });
      const info = await page.evaluate(() => {
        const f = window.fossick || window.fossickTas, materials = new Set(), environments = [];
        f.renderer.render(f.scene, f.camera || f.scene.children.find(o=>o.isCamera));
        f.scene.traverse(o => { for (const m of o.material ? [o.material].flat() : []) materials.add(m); });
        for (const m of materials) if (m.userData.environment) environments.push(m.userData.environment);
        return { environments, calls: f.renderer.info.render.calls, triangles: f.renderer.info.render.triangles,
          shaders: f.renderer.info.programs.map(p => p.diagnostics?.runnable) };
      });
      if (!before) {
        assert.ok(info.environments.includes('ground'), 'Shared blended ground is present');
        assert.ok(info.environments.includes('vegetation'), 'Shared foliage and bark are present');
        assert.ok(info.environments.includes('water'), 'Existing depth-aware water shader is shared');
        if(tas) {
          const cracks=await page.evaluate(()=>{
            const p=fossickTas.scene.getObjectByName('Catchment geology').geometry.attributes.position,edges=new Map();
            const point=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');
            for(let i=0;i<p.count;i+=3) for(const [a,b] of [[i,i+1],[i+1,i+2],[i+2,i]]) {
              const edge=[point(a),point(b)].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);
            }
            return [...edges.values()].filter(n=>n!==2).length;
          });
          assert.equal(cracks,0,'Scenery boulders have closed faces without torn seams');
        }
      }
      assert.ok(info.shaders.every(s => s !== false));
      assert.deepEqual(errors, []);
      if (!before && region === 'new-england' && !phone) {
        const dug = await page.evaluate(() => {
          const t=fossick.terrain;
          for(let i=0;i<20;i++) {
            const x=t.camp.x+18+i*.6,z=t.camp.z+20;
            if(t.dig(x,z,1,.18)) {
              const index=t.index(x,z), px=t.pos[index*3],pz=t.pos[index*3+2];
              return { snapshot:{idx:[...t.digSnapshot().idx],mm:[...t.digSnapshot().mm]},
                surface:t.surface[index*3+2], expected:t.heights[index]-t.creek.waterY(pz), x:px,z:pz };
            }
          }
        });
        assert.ok(dug, 'Diggable ground remains available');
        assert.ok(Math.abs(dug.surface-dug.expected)<.0001,'Ground detail follows the excavated height');
        await page.keyboard.press('Control+s'); await page.waitForTimeout(300);
        await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.fossick);
        const restored=await page.evaluate(()=>{const d=fossick.terrain.digSnapshot();return {idx:[...d.idx],mm:[...d.mm]};});
        assert.deepEqual(restored,dug.snapshot,'Excavation survives reload with the same saved millimetres');
        await click('#play');
        if (high) {
          for(const [hour,label] of [[6.5,'dawn'],[22,'night']]) {
            await page.evaluate(hour=>{fossick.daynight.hour=hour;},hour);await page.waitForTimeout(300);
            await page.screenshot({path:`node_modules/.cache/env-${label}-${suffix}.png`});
          }
          await page.evaluate(()=>{fossick.daynight.hour=12;Object.assign(fossick.weather,{phase:'peak',t:0,peak:1,speed:1,thunderIn:30});});
          await page.waitForTimeout(300);
          assert.ok(await page.evaluate(()=>fossick.terrain.material.userData.waterLevel.value>.9),'Wet bank material follows flood level');
          await page.screenshot({path:`node_modules/.cache/env-storm-${suffix}.png`});
        }
      }
      assert.deepEqual(errors, []);
      console.log(`${suffix}${process.env.ENV_OFFLINE ? ' offline' : ''}: renders and original tool input passed; ${JSON.stringify(info)}`);
    } catch (e) { console.log(errors); await page.screenshot({ path: 'node_modules/.cache/env-failure.png' }).catch(() => {}); throw e; }
    finally { await context.close(); }
  }
} finally { await browser.close(); }
