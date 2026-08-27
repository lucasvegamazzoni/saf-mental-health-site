const { chromium } = require('playwright');
const B = 'http://localhost:5199';
(async () => {
  const browser = await chromium.launch();
  for (const [w, h, tag] of [[1280, 800, 'desktop'], [390, 844, 'mobile']]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('pageerror', (e) => console.log('PAGEERROR', tag, e.message));
    await page.goto(B + '/account?mode=create', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `verify/acct-create-${tag}.png`, fullPage: true });
    await page.focus('#account-password');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `verify/acct-eyes-closed-${tag}.png` });
    await page.goto(B + '/me', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `verify/me-tabs-${tag}.png`, fullPage: true });
    await page.goto(B + '/me?tab=timeline', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `verify/me-timeline-${tag}.png`, fullPage: true });
    await page.goto(B + '/stories', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `verify/stories-gate-${tag}.png`, fullPage: true });
    await page.goto(B + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `verify/home-v3-${tag}.png`, fullPage: true });
    await page.close();
  }
  await browser.close();
  console.log('done');
})();
