const { chromium } = require('playwright');
const B = 'http://localhost:5199';
const CALL = 'verify-bot-' + Math.floor(Math.random() * 1e6);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.log('CONSOLE', m.type(), m.text().slice(0, 160)); });
  // 1. do a check-in while signed out (local only)
  await page.goto(B + '/me', { waitUntil: 'networkidle' });
  for (let i = 0; i < 10; i++) { await page.locator('.checkin-answer').nth(2).click(); await page.waitForTimeout(150); }
  await page.waitForTimeout(500);
  console.log('finish CTA:', (await page.locator('.checkin-finish-links a').first().textContent()).trim());
  // 2. sign up
  await page.goto(B + '/account?mode=create&next=' + encodeURIComponent('/me?tab=timeline'), { waitUntil: 'networkidle' });
  await page.fill('#account-callsign', CALL);
  await page.locator('.account-avatar-btn').nth(3).click();
  await page.fill('#account-password', 'verify-pass-123');
  await page.locator('.account-primary').click();
  await page.waitForURL('**/me?tab=timeline', { timeout: 20000 });
  await page.waitForTimeout(2500);
  console.log('after signup url:', page.url());
  console.log('nav chip:', (await page.locator('.layout-account').textContent()).trim());
  console.log('timeline chips:', await page.locator('.me-chip').count());
  await page.screenshot({ path: 'verify/e2e-signedin-timeline.png', fullPage: true });
  // 3. sign out, sign back in on a fresh context (new "device") → check-in should come back from Firestore
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx2.newPage();
  await p2.goto(B + '/account?mode=signin&next=' + encodeURIComponent('/me?tab=timeline'), { waitUntil: 'networkidle' });
  await p2.fill('#account-callsign', CALL);
  await p2.fill('#account-password', 'verify-pass-123');
  await p2.locator('.account-primary').click();
  await p2.waitForURL('**/me?tab=timeline', { timeout: 20000 });
  await p2.waitForTimeout(3500);
  console.log('new device timeline chips (expect 1):', await p2.locator('.me-chip').count());
  await p2.screenshot({ path: 'verify/e2e-newdevice-timeline.png', fullPage: true });
  console.log('TEST ACCOUNT:', CALL);
  await browser.close();
})().catch((e) => { console.error('E2E FAILED', e.message); process.exit(1); });
