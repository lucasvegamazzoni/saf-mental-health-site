const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:5199/stories', { waitUntil: 'load' }); await page.waitForTimeout(1500);
  console.log('hope on cards:', await page.locator('.stories-hope').count(), '| hope chips in form:', await page.locator('.stories-hope-chip').count());
  const stage = page.locator('.sphere-stage, .sphere').first();
  const box = await stage.boundingBox(); console.log('sphere box', !!box);
  const first = page.locator('.sphere button').first();
  const t = async () => first.evaluate((el) => el.style.transform);
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  // drag straight up a long way, in steps, recording transforms
  await page.mouse.move(cx, cy); await page.mouse.down();
  const samples = [];
  for (let i = 0; i < 12; i++) { await page.mouse.move(cx, cy - 60 * (i + 1), { steps: 4 }); samples.push(await t()); }
  await page.mouse.up();
  const distinct = new Set(samples).size;
  console.log('distinct transforms across 12 upward drag steps (12 = never locks):', distinct);
  await page.screenshot({ path: 'verify/luc100-stories.png' });
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})();
