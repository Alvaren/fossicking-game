// Run from the repository root with its isolated Codex preview on 5191.
// PLAYWRIGHT_MODULE may name an installed Playwright package; no dependency added.
// Only disposable browser contexts are written. This never reads the user's save.
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = fileURLToPath(new URL(process.env.CAPTURE_SUBDIR ? './'+process.env.CAPTURE_SUBDIR+'/' : './', import.meta.url));
const seed=Number(process.env.CAPTURE_SEED || 12345);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: process.env.NSW_SOFTWARE ? [] : ['--use-angle=d3d11','--ignore-gpu-blocklist'] });
const supplement = !!process.env.AUDIT_SUPPLEMENT;
const report = supplement ? JSON.parse(await readFile(output + 'build.json', 'utf8')) : { codeBaseline: '6ba554e8ad64776f9ce9bd4e6e64720e28621620', seed,
  method: 'Disposable Chromium contexts; direct camera relocation at normal player eye height. Explicit world render counters include renderer passes, exclude held-tool overlay. Not device FPS or a playthrough.', cases: [] };
try {
  for (const mode of supplement ? ['high'] : (process.env.CAPTURE_MODES || 'high').split(',')) {
    const phone = mode.startsWith('touch'), preset = phone ? 'medium' : mode;
    const viewport = phone ? { width: 844, height: 390 } : { width: 1280, height: 720 };
    const context = await browser.newContext({ viewport, hasTouch: phone, isMobile: phone, deviceScaleFactor: 1 });
    await context.addInitScript(({ preset, seed }) => {
      const presets = {
        high: { res: 1.5, shadows: 'high', aa: true, gems: 'full', reflections: 'live' },
        low: { res: .75, shadows: 'off', aa: false, gems: 'simple', reflections: 'static' },
        medium: { res: 1, shadows: 'low', aa: false, gems: 'inventory', reflections: 'slow' },
      };
      localStorage.setItem('fossicking-settings-v1', JSON.stringify({ preset, ...presets[preset], warned: true }));
      localStorage.setItem('fossicking-save-v2', JSON.stringify({ seed, activeRegion: 'new-england', hour: 11, difficulty: 'realistic' }));
    }, { preset, seed });
    const page = await context.newPage(), errors = [], warnings = [];
    page.setDefaultTimeout(60000);
    page.on('pageerror', e => {errors.push(e.message); console.error(e.message);});
    page.on('console', m => { if (m.type() === 'error' || /GL_INVALID|too many errors/.test(m.text())) {errors.push(m.text());console.error(m.text());} if (m.type() === 'warning' && !warnings.includes(m.text())) warnings.push(m.text()); });
    await page.goto(`http://127.0.0.1:5191/?test${phone ? '&touch' : ''}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.fossick);
    await page.evaluate(() => fossick.newEngland?.ready);
    await (phone ? page.locator('#play').tap() : page.locator('#play').click());
    if (phone) await page.locator('.slot[data-tool="shovel"]').tap();
    else await page.keyboard.press('Digit2');
    const selectedTool = await page.evaluate(() => fossick.state.tool);
    const views = supplement ? ['mine', 'dig', 'night', 'map'] : mode === 'high' ? (process.env.CAPTURE_VIEWS || 'creek,bank,reef,granite').split(',') : ['creek', 'granite'];
    const shots = [];
    for (const view of views) {
      const pose = await page.evaluate(view => {
        const f = fossick, t = f.terrain, c = f.creek;
        f.daynight.hour = view === 'night' ? 22 : view === 'dawn' ? 6.5 : 11;
        if (view === 'storm') Object.assign(f.weather, { phase: 'peak', t: 0, peak: 1, speed: 1, thunderIn: 30 });
        let x, z, tx, tz, pitch = -.2;
        if (['upstream','downstream','reverse','kneel','elevated'].includes(view)) {
          z=view==='downstream'?4:24; x=c.cx(z)+(view==='reverse'?1:-1)*(c.halfWidth(z)+1.8);
          tx=c.cx(z);tz=z+(view==='downstream'?-14:14);pitch=view==='kneel'?-.65:view==='elevated'?-.7:-.15;
        } else if (view === 'camp') { x = t.camp.x + 7; z = t.camp.z + 7; tx = t.camp.x; tz = t.camp.z; pitch = -.12; }
        else if (view === 'dig') {
          tx = t.camp.x + 18; tz = t.camp.z + 20;
          for (let i = 0; i < 6; i++) t.dig(tx, tz, 1.1, .18);
          x = tx + 1.8; z = tz + 1.8; pitch = -.65;
        }
        else if (['creek', 'bank', 'dawn', 'storm', 'night', 'map'].includes(view)) {
          z = 12; x = c.cx(z) - c.halfWidth(z) - (view === 'bank' ? .6 : 2);
          tx = c.cx(z) + 3; tz = z - 3; pitch = view === 'bank' ? -.75 : -.25;
        } else {
          const s = t.sources[view]; x = s.x + 7; z = s.z + 8; tx = s.x; tz = s.z; pitch = -.16;
        }
        f.player.pos.set(x, t.getHeight(x, z), z); f.player.vel.set(0, 0, 0);
        f.player.yaw = Math.atan2(-(tx - x), -(tz - z)); f.player.pitch = pitch;
        if(view==='kneel')f.kneelDown();
        if(view==='elevated'){f.player.pos.y+=7;}
        return { x, z, target: { x: tx, z: tz }, yaw: f.player.yaw, pitch, hour: f.daynight.hour };
      }, view);
      if (view === 'map') await page.keyboard.press('KeyM');
      if (view === 'night') await page.keyboard.press('KeyL');
      await page.waitForTimeout(3500);
      await page.waitForFunction(()=>document.querySelector('#toasts').children.length===0,null,{timeout:20000});
      await page.evaluate(hour=>{fossick.daynight.hour=hour;},pose.hour);
      await page.waitForTimeout(100);
      const evidence = await page.evaluate(() => {
        const f = fossick, r = f.renderer, camera = f.photo.camera;
        r.clear(); r.render(f.scene, camera);
        const info = { calls: r.info.render.calls, triangles: r.info.render.triangles, geometries: r.info.memory.geometries, textures: r.info.memory.textures, programs: r.info.programs.length };
        const gl = r.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
        return { ...info, camera: { position: camera.position.toArray(), rotation: camera.rotation.toArray(), fov: camera.fov },
          drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight], gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
          terrainTriangles: f.terrain.mesh.geometry.index.count / 3,
          shaderFailures: r.info.programs.filter(p => p.diagnostics?.runnable === false).length,
          lod: { world: f.world.lod?.stats, landscape: f.landscape.lod?.stats } };
      });
      const file = `${mode}-${view}.jpg`;
      await page.screenshot({ path: output + file, type: 'jpeg', quality: 88 });
      shots.push({ view, file, pose, ...evidence });
      console.log(mode, view, evidence.calls, evidence.triangles);
      if (view === 'map') await page.keyboard.press('KeyM');
      if (view === 'night') await page.keyboard.press('KeyL');
      if (view === 'kneel') await page.evaluate(()=>fossick.standUp());
    }
    const world = await page.evaluate(() => ({ environment: fossick.newEngland?.stats, camp: fossick.terrain.camp, sources: fossick.terrain.sources,
      landmarks: fossick.landscape.landmarks.map(({ name, x, z }) => ({ name, x, z })),
      modelAssets: performance.getEntriesByType('resource').filter(r => r.name.endsWith('.glb')).map(r => ({ url: new URL(r.name).pathname, decodedBytes: r.decodedBodySize })),
    }));
    report.cases.push({ mode: supplement ? 'high-supplement' : mode, viewport, deviceScaleFactor: 1, selectedTool, world, shots, errors, warnings });
    await context.close();
    await writeFile(output + 'build.json', JSON.stringify(report, null, 2) + '\n');
  }
} finally { await browser.close(); }
if (report.cases.some(c => c.errors.length || c.shots.some(s => s.shaderFailures))) process.exitCode = 1;
