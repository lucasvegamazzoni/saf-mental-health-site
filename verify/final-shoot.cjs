const { chromium } = require('playwright');
const errs = [];
async function go(page, url) {
  try { await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }); }
  catch (e) { errs.push(url + ' networkidle timeout (fell back to load)'); await page.goto(url, { waitUntil: 'load' }); }
}
(async () => {
  const routes = [['home','/'],['me-checkin','/me?tab=check-in'],['me-timeline','/me?tab=timeline'],['stories','/stories'],['resources','/resources'],['topic','/resources/better-sleep'],['account','/account?mode=create'],['trends','/trends'],['moderate','/moderate']];
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const vp of [[1280,800,'desktop'],[390,844,'mobile']]) {
    const page = await browser.newPage({ viewport: { width: vp[0], height: vp[1] } });
    for (const r of routes) {
      try {
        await go(page, 'http://localhost:5199' + r[1]);
        await page.waitForTimeout(2200);
        // The home QR tree is a GSAP ScrollTrigger pin (end +=100%/+=150%); its
        // pin spacer shows up as empty cream in full-page captures. Unpin
        // before shooting so the capture reflects the laid-out page.
        await page.evaluate(() => { const ST = window.__safScrollTrigger; if (ST) ST.getAll().forEach((t) => t.kill()); });
        await page.waitForTimeout(300);
        await page.screenshot({ path: '/Users/lucasdelavegamazzoni/Webdesign_SAF/saf-mental-health-site/verify/final-' + r[0] + '-' + vp[2] + '.png', fullPage: true });
      } catch (e) { errs.push(r[0] + ' ' + vp[2] + ': ' + e.message.split('\n')[0]); }
    }
    try {
      await go(page, 'http://localhost:5199/');
      await page.waitForTimeout(1500);
      const btn = page.locator('button', { hasText: 'Talk it through' }).first(); if (await btn.count()) { await btn.click(); await page.waitForTimeout(800); await page.screenshot({ path: '/Users/lucasdelavegamazzoni/Webdesign_SAF/saf-mental-health-site/verify/final-companion-' + vp[2] + '.png' }); } else errs.push('companion ' + vp[2] + ': button not found');
    } catch (e) { errs.push('companion ' + vp[2] + ': ' + e.message.split('\n')[0]); }
    await page.close();
  }
  await browser.close();
  console.log('ERRORS:\n' + errs.join('\n'));
})();
