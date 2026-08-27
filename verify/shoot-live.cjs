const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('https://lucasvegamazzoni.github.io/saf-mental-health-site/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'verify/live-home.png' });
  await page.goto('https://lucasvegamazzoni.github.io/saf-mental-health-site/stories', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'verify/live-stories.png' });
  await browser.close();
})();
