const { chromium } = require('playwright');
(async () => {
  const routes = [['home','/'],['checkin','/check-in'],['stories','/stories'],['resources','/resources'],['topic','/resources/better-sleep'],['me','/me']];
  const browser = await chromium.launch();
  for (const vp of [[1280,800,'desktop'],[390,844,'mobile']]) {
    const page = await browser.newPage({ viewport: { width: vp[0], height: vp[1] } });
    for (const r of routes) {
      await page.goto('http://localhost:5199' + r[1], { waitUntil: 'networkidle' });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: '/Users/lucasdelavegamazzoni/Webdesign_SAF/saf-mental-health-site/verify/' + r[0] + '-' + vp[2] + '.png', fullPage: true });
    }
    await page.close();
  }
  await browser.close();
})();
