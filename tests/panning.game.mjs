// Full-game entry, save/resume and reward integration using disposable saves.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { Creek } from '../src/creek.js';
import { makeNoise } from '../src/noise.js';
import { createPan, automaticStroke, stepPan, panResult } from '../src/panning.js';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.PANNING_TEST_ORIGIN || 'http://127.0.0.1:5191';
const creek = new Creek(makeNoise(12345));
const sample = { gold: 0.02, blackSand: 2, clay: 0.2, layer: 'wash', x: creek.cx(0), z: 0 };
const base = { seed: 12345, gold: 0, cash: 0, difficulty: 'realistic', up: { pan: 2 }, player: { x: creek.cx(0), z: 0, yaw: 0, pitch: -0.12, tool: 'pan' } };
const browser = await chromium.launch({ headless: true });
try {
  async function start(save) {
    const context = await browser.newContext({ viewport: { width: 1100, height: 850 } });
    await context.addInitScript(value => {
      if (sessionStorage.getItem('fixture-initialized')) return;
      localStorage.setItem('fossicking-save-v2', JSON.stringify(value));
      localStorage.setItem('fossicking-settings-v1', JSON.stringify({ preset:'low',res:0.6,shadows:'off',aa:false,gems:'simple',reflections:'static',fps:false,warned:true }));
      sessionStorage.setItem('fixture-initialized', 'yes');
    }, save);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror',e=>errors.push(e.message));
    async function enter() {
      await page.getByRole('button',{name:'Click to play',exact:true}).click();
      await page.locator('#game').click({position:{x:500,y:350},delay:150});
      await page.locator('#panning').waitFor({state:'visible'});
    }
    await page.goto(`${origin}/?test`,{waitUntil:'networkidle'});
    await enter();
    return {context,page,errors,enter};
  }
  const first = await start({...base,bucket:[sample]});
  await first.page.locator('#pan-load').click();
  await first.page.locator('#pan-canvas').focus();
  await first.page.keyboard.down('ArrowLeft');await first.page.waitForTimeout(800);await first.page.keyboard.up('ArrowLeft');
  await first.page.locator('#pan-close').click();
  const stored = await first.page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')));
  assert.equal(stored.bucket[0].panVolume,0.5);
  assert.ok(stored.panSession.bed.clay<0.1);
  const clay = stored.panSession.bed.clay;
  await first.page.reload({waitUntil:'networkidle'});
  await first.enter();
  await first.page.locator('#pan-working').waitFor({state:'visible'});
  await first.page.locator('#pan-close').click();
  const resumed = await first.page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')));
  assert.equal(resumed.panSession.bed.clay,clay);
  assert.deepEqual(first.errors,[]);
  await first.context.close();
  console.log('Full game: creek entry, partial bucket load and reload persistence passed.');

  const session = createPan({sample,contents:{gold:0.0004,picker:0,finds:[]},difficulty:'realistic'});
  for(let i=0;i<12000&&!session.finished;i++)stepPan(session,automaticStroke(session),1/60);
  assert.ok(session.finished);
  const expected = panResult(session).gold;
  const second = await start({...base,bucket:[],panSession:session});
  await second.page.locator('#pan-result').waitFor({state:'visible'});
  await second.page.locator('#pan-collect').evaluate(b=>{b.click();b.click();});
  const result = await second.page.evaluate(()=>JSON.parse(localStorage.getItem('fossicking-save-v2')));
  assert.equal(result.panSession,null);
  assert.equal(result.gold,expected);
  assert.equal(result.log.goldTotal,expected);
  assert.equal(result.bucket.length,0);
  assert.deepEqual(second.errors,[]);
  await second.context.close();
  console.log('Full game: sub-milligram reward credited and saved exactly once, with no extra bucket consumption.');
} finally {await browser.close();}
