const { chromium } = require('playwright');
const B = 'http://localhost:5199';
const PASS = 'verify-pass-123';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 160)); if (/App Check debug token/i.test(m.text())) console.log('DEBUG-TOKEN LINE:', m.text().slice(0, 200)); });

  // spinner motion: Home poll spinner may be flag-off; use /account loading? Use a standalone check on Trends? Simplest: inject spinner page state via /account before auth resolves is racy — instead evaluate computed transform over time on any .spinner
  await page.goto(B + '/account?mode=create', { waitUntil: 'load' });
  await page.fill('#account-callsign', 'verify-bot-del-' + Date.now().toString(36));
  const cs = await page.inputValue('#account-callsign');
  await page.fill('#account-password', PASS);
  await page.locator('.account-primary').click();
  // capture spinner rotation while pending
  const t1 = await page.evaluate(() => { const s = document.querySelector('.spinner'); return s ? getComputedStyle(s).transform : null; });
  await page.waitForTimeout(400);
  const t2 = await page.evaluate(() => { const s = document.querySelector('.spinner'); return s ? getComputedStyle(s).transform : null; });
  console.log('spinner transform samples:', t1, '->', t2, 'moved:', t1 !== t2);
  await page.waitForURL((u) => !u.pathname.startsWith('/account'), { timeout: 25000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'verify/luc97-me-timeline.png', fullPage: true });

  // clear this device
  await page.locator('text=Clear this device').click();
  await page.locator('text=Yes, clear this device').click();
  await page.waitForTimeout(300);
  console.log('cleared status:', await page.locator('.me-clear-body').innerText());
  console.log('nal keys left:', await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('nal.'))));
  await page.screenshot({ path: 'verify/luc97-me-cleared.png', fullPage: true });

  // privacy + footer
  await page.goto(B + '/privacy', { waitUntil: 'load' });
  await page.waitForTimeout(500);
  console.log('privacy title:', await page.title(), '| h2s:', await page.locator('.privacy-card h2').count());
  console.log('footer:', (await page.locator('.layout-footer-meta').innerText()).replace(/\n/g, ' '));
  await page.screenshot({ path: 'verify/luc97-privacy-mobile.png', fullPage: true });

  // delete my space
  await page.goto(B + '/account', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.locator('.account-danger-link').click();
  await page.screenshot({ path: 'verify/luc97-delete-form.png', fullPage: true });
  await page.fill('#account-delete-password', 'wrong-pass');
  await page.locator('.account-danger-btn').click();
  await page.waitForTimeout(2500);
  console.log('wrong pw error:', await page.locator('.account-error').innerText().catch(() => 'NONE'));
  await page.fill('#account-delete-password', PASS);
  await page.locator('.account-danger-btn').click();
  await page.waitForSelector('text=Gone, as asked.', { timeout: 20000 });
  await page.screenshot({ path: 'verify/luc97-deleted.png', fullPage: true });
  // sign-in should now fail
  await page.goto(B + '/account?mode=signin', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.fill('#account-callsign', cs);
  await page.fill('#account-password', PASS);
  await page.locator('.account-primary').click();
  await page.waitForTimeout(3000);
  console.log('re-signin after delete ->', await page.locator('.account-error').innerText().catch(() => 'NO ERROR (bad)'));

  // uniform coin flip
  const seen = new Set();
  for (let i = 0; i < 8; i++) { await page.goto(B + '/', { waitUntil: 'load' }); seen.add(await page.getAttribute('.hero__officer', 'src')); }
  console.log('uniforms seen over 8 loads:', [...seen]);
  await page.goto(B + '/?uniform=no4', { waitUntil: 'load' }); console.log('forced no4:', await page.getAttribute('.hero__officer', 'src'));
  await page.goto(B + '/?uniform=no1', { waitUntil: 'load' }); console.log('forced no1:', await page.getAttribute('.hero__officer', 'src'));
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
