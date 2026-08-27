const { chromium } = require('playwright');
const fs = require('fs');
const { PNG } = require('pngjs');
const jsQR = require('jsqr');
const OUT = '/Users/lucasdelavegamazzoni/Webdesign_SAF/saf-mental-health-site/verify/';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [w, h, name] of [[1280, 800, 'desktop'], [390, 844, 'mobile']]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
    await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.qrtree__canvas');
    await page.waitForTimeout(1500);
    const top = await page.evaluate(() => {
      const st = document.querySelector('.pin-spacer') || document.querySelector('.qrtree');
      return st.getBoundingClientRect().top + window.scrollY;
    });
    for (const [p, label] of [[0, 'tree'], [0.5, 'mid'], [1, 'qr']]) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top + p * h * 1.5);
      await page.waitForTimeout(2200);
      const path = `${OUT}qrtree-${label}-${name}.png`;
      await page.screenshot({ path });
      if (p === 1) {
        const stage = await page.$('.qrtree__stage');
        const buf = await stage.screenshot();
        const png = PNG.sync.read(buf);
        const res = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
        console.log(name, 'decoded:', res ? res.data : 'FAILED');
        const hint = await page.textContent('.qrtree__hint');
        console.log(name, 'hint:', hint);
      }
    }
    await page.close();
  }
  await browser.close();
})();
