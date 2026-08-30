const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1200, height: 630 } })).newPage();
  await page.goto('http://localhost:5199/?uniform=no1', { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  await page.addStyleTag({ content: '.layout-nav,.layout-help,.hero__overlay{display:none!important}' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'public/og.png' });
  await b.close();
})();
