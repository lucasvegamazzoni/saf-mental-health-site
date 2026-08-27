const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('https://saf-checkin.web.app/?uniform=no1', { waitUntil: 'load' }); await page.waitForTimeout(2000);
  await page.screenshot({ path: 'verify/mob-vp-home.png' });
  await page.goto('https://saf-checkin.web.app/me', { waitUntil: 'load' }); await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 500)); await page.waitForTimeout(500);
  await page.screenshot({ path: 'verify/mob-vp-me.png' });
  await b.close();
})();
