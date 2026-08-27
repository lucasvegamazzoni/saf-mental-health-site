const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  for (const vp of [[1280, 800, 'desktop'], [390, 844, 'mobile']]) {
    const page = await browser.newPage({ viewport: { width: vp[0], height: vp[1] } });
    // stories with first story expanded
    await page.goto('http://localhost:5173/stories', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('.stories-readmore').first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'verify/stories-expanded-' + vp[2] + '.png', fullPage: true });
    // account signed-out
    await page.goto('http://localhost:5173/account', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'verify/account-' + vp[2] + '.png', fullPage: true });
    await page.close();
  }
  // signed-in state + nav chip (desktop only)
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:5173/account', { waitUntil: 'networkidle' });
  await page.fill('.account-input', 'QuietTiger');
  await page.locator('.account-avatar-btn').nth(3).click();
  await page.locator('.account-primary').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'verify/account-signedin-desktop.png', fullPage: true });
  await page.close();
  await browser.close();
})();
