/* Step 6: SITE_BASE=/ production build served by `vite preview --port 5198`: manifest 200, SW registered, offline reload renders the shell. */
const { chromium } = require('playwright');
const { spawn, execSync } = require('child_process');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const P = 'http://localhost:5198';
function check(label, ok, ev = '') { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ev ? '  — ' + ev : ''}`); if (!ok) process.exitCode = 1; }
(async () => {
  execSync('npm run build', { cwd: ROOT, env: { ...process.env, SITE_BASE: '/' }, stdio: 'pipe' });
  const srv = spawn('npx', ['vite', 'preview', '--port', '5198', '--strictPort'], { cwd: ROOT, env: { ...process.env, SITE_BASE: '/' }, stdio: 'pipe' });
  try {
    for (let i = 0; i < 40; i++) { try { if ((await fetch(P + '/')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 300)); }
    const man = await fetch(P + '/manifest.webmanifest');
    const manJson = await man.json().catch(() => null);
    check('manifest.webmanifest → 200', man.status === 200, `status=${man.status} name=${manJson && manJson.name} start_url=${manJson && manJson.start_url}`);
    check('sw.js → 200', (await fetch(P + '/sw.js')).status === 200);
    check('index.html links the manifest', (await (await fetch(P + '/')).text()).includes('manifest.webmanifest'));

    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
    await page.goto(P + '/resources', { waitUntil: 'load' });
    const swState = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      await new Promise((r) => setTimeout(r, 1500));
      return { scope: reg.scope, active: Boolean(reg.active), url: reg.active && reg.active.scriptURL, caches: await caches.keys() };
    });
    check('service worker registered + active', swState.active && swState.url.endsWith('/sw.js'), JSON.stringify(swState));
    check('shell cache populated', swState.caches.some((c) => c.startsWith('saf-checkin-v1')), swState.caches.join(','));
    await page.goto(P + '/', { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    await ctx.setOffline(true);
    await page.reload({ waitUntil: 'load' }).catch((e) => console.log('offline reload error', e.message));
    await page.waitForTimeout(2000);
    const h1 = await page.locator('h1').first().textContent().catch(() => null);
    const nav = await page.locator('nav.layout-links').count();
    check('offline reload renders the shell (h1 + nav)', Boolean(h1) && nav === 1, `h1="${(h1 || '').trim().slice(0, 60)}"`);
    await page.goto(P + '/stories', { waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(1500);
    check('offline deep link renders shell', (await page.locator('h1').count()) >= 1, (await page.locator('h1').first().textContent().catch(() => '')).trim());
    check('emergency button present offline', (await page.locator('.layout-help-btn').count()) === 1);
    await page.screenshot({ path: path.join(__dirname, 'final-pwa-offline.png'), fullPage: true });
    await ctx.setOffline(false);
    await browser.close();
  } finally {
    srv.kill('SIGTERM');
  }
})().catch((e) => { console.error('E2E FAILED', e); process.exit(1); });
