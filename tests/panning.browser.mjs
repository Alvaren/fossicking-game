// Run with a locally available Playwright installation (no runtime dependency).
// PLAYWRIGHT_MODULE may point at a bundled package directory.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.PANNING_TEST_ORIGIN || 'http://127.0.0.1:5191';
const browser = await chromium.launch({ headless: true });
try {
  for (const touch of [false, true]) {
    const context = await browser.newContext({ viewport: touch ? { width: 390, height: 844 } : { width: 1365, height: 960 }, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/panning-fixture', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/style.css"><script type="module">
      import {PanningUI} from '/src/panningui.js';
      import {automaticStroke,stepPan} from '/src/panning.js';
      const state={up:{pan:2},difficulty:'realistic',bucket:[{clay:0.25,blackSand:2,gold:0.02}],panSession:null};
      let collected=0,grams=0,saved=null;
      const ui=new PanningUI(state,{assay:()=>({gold:.02,picker:0,pickerAt:0,finds:[]}),onSave:()=>{saved=JSON.parse(JSON.stringify(state))},onCollect:(_,r)=>{collected++;grams+=r.gold},onClose:()=>{}});
      ui.open(); let before=performance.now();
      function frame(now){ui.update(Math.min(.05,(now-before)/1000));before=now;requestAnimationFrame(frame)}requestAnimationFrame(frame);
      window.fixture={state,ui,finish:()=>{for(let i=0;i<20000&&!state.panSession.finished;i++)stepPan(state.panSession,automaticStroke(state.panSession),1/60)},get collected(){return collected},get grams(){return grams},get saved(){return saved}};
    </script>` })) ;
    await page.goto(`${origin}/panning-fixture`);
    await page.locator('#pan-load').click();
    const clayBefore = await page.evaluate(() => fixture.state.panSession.bed.clay);
    const canvas = page.locator('#pan-canvas');
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const cdp = touch ? await context.newCDPSession(page) : null;
    if (touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    else { await page.mouse.move(x, y); await page.mouse.down(); }
    for (let i = 0; i < 50; i++) {
      const px = x + Math.sin(i / 6) * 30, py = y + Math.cos(i / 6) * 20;
      if (touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: px, y: py }] });
      else await page.mouse.move(px, py);
      await page.waitForTimeout(35);
    }
    if (touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    else await page.mouse.up();
    const clayAfter = await page.evaluate(() => fixture.state.panSession.bed.clay);
    assert.ok(clayAfter < clayBefore, `${touch ? 'touch' : 'mouse'} strokes must break clay`);
    await page.locator('[data-pan-action="stratify"]:visible').first().click();
    // Releasing a pointer must not keep working in the background.
    const stratBefore = await page.evaluate(() => fixture.state.panSession.strat);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => fixture.state.panSession.strat), stratBefore);
    await page.locator('#pan-close').click();
    assert.ok(await page.evaluate(() => fixture.saved.panSession.bed.clay === fixture.state.panSession.bed.clay));
    await page.evaluate(() => fixture.ui.open());
    await page.evaluate(() => fixture.finish());
    await page.locator('#pan-result').waitFor({ state: 'visible' });
    const recovered = await page.evaluate(() => fixture.state.panSession.gold.fine + fixture.state.panSession.gold.coarse);
    await page.screenshot({ path: `node_modules/.cache/panning-${touch ? 'touch' : 'desktop'}-reveal.png`, fullPage: true });
    await page.locator('#pan-collect').evaluate(b => { b.click(); b.click(); });
    assert.equal(await page.evaluate(() => fixture.collected), 1);
    assert.equal(await page.evaluate(() => fixture.grams), recovered);
    assert.equal(await page.evaluate(() => fixture.state.bucket[0].panVolume), 0.5);
    assert.equal(await page.evaluate(() => fixture.state.panSession), null);
    assert.deepEqual(errors, []);
    // Easy uses the same animation and simulation without a held pointer.
    await page.evaluate(() => { fixture.state.difficulty='easy';fixture.ui.close();fixture.ui.open();fixture.ui.load();for(let i=0;i<2400;i++)fixture.ui.update(1/60); });
    assert.ok(await page.evaluate(() => fixture.state.panSession.finished));
    console.log(`${touch ? 'Touch' : 'Mouse'}: input, release, persistence, reveal, exactly-once collection, Easy demonstration passed.`);
    await context.close();
  }
} finally { await browser.close(); }
