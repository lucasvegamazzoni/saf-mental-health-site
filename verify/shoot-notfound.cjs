/* LUC-88 — 404 page verification. Run: node verify/shoot-notfound.cjs (dev server on :5223). */
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, 'shots-notfound');
const BASE = 'http://localhost:5223';

(async () => {
  const browser = await chromium.launch();
  const shots = [];
  const problems = [];

  for (const width of [390, 1280]) {
    for (const reduced of [false, true]) {
      const ctx = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 800 },
        reducedMotion: reduced ? 'reduce' : 'no-preference',
      });
      const page = await ctx.newPage();
      const tag = `${width}${reduced ? '-reduced' : ''}`;
      await page.goto(`${BASE}/this-does-not-exist`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.nf-page');
      await page.waitForTimeout(100);
      let f = path.join(OUT, `404-${tag}-t0.1.png`);
      await page.screenshot({ path: f, fullPage: false });
      shots.push(f);
      if (!reduced) {
        await page.waitForTimeout(1900);
        f = path.join(OUT, `404-${tag}-t2.png`);
        await page.screenshot({ path: f, fullPage: false });
        shots.push(f);
      }
      // sanity
      const title = await page.title();
      if (title !== 'Page not found — SAF Check-in') problems.push(`${tag}: title = ${title}`);
      const h1 = await page.locator('h1').count();
      if (h1 !== 1) problems.push(`${tag}: ${h1} h1s`);
      const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
      if (scrollW > width) problems.push(`${tag}: horizontal overflow ${scrollW}`);
      // settled state check for reduced motion: everything visible
      const ops = await page.$$eval('.nf-four, .nf-title, .nf-actions', (els) =>
        els.map((e) => getComputedStyle(e).opacity),
      );
      if (reduced && ops.some((o) => Number(o) < 0.6)) problems.push(`${tag}: reduced-motion not settled ${ops}`);
      // buttons >= 44px
      const sizes = await page.$$eval('.nf-primary, .nf-secondary, .nf-explain-toggle', (els) =>
        els.map((e) => [e.textContent.trim(), e.getBoundingClientRect().height]),
      );
      for (const [t, h] of sizes) if (h < 44) problems.push(`${tag}: "${t}" only ${h}px tall`);
      // emergency button must not overlap actions
      const overlap = await page.evaluate(() => {
        const help = document.querySelector('.layout-help-btn').getBoundingClientRect();
        return [...document.querySelectorAll('.nf-primary, .nf-secondary, .nf-explain-toggle')].some((el) => {
          const r = el.getBoundingClientRect();
          return r.left < help.right && r.right > help.left && r.top < help.bottom && r.bottom > help.top;
        });
      });
      if (overlap) problems.push(`${tag}: emergency button overlaps an action`);
      await ctx.close();
    }
  }

  // Tab order + toggle + hover wiggle at 1280
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/this-does-not-exist`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.nf-page');
    await page.waitForTimeout(1500);
    const seen = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const a = document.activeElement;
        return `${a.tagName.toLowerCase()}.${a.className.split(' ')[0]}:${(a.textContent || '').trim().slice(0, 24)}`;
      });
      seen.push(info);
      if (info.startsWith('button.nf-explain-toggle')) {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
        const expanded = await page.getAttribute('.nf-explain-toggle', 'aria-expanded');
        const text = await page.locator('.nf-explain-text').textContent().catch(() => null);
        if (expanded !== 'true' || !text) problems.push('toggle did not reveal explanation');
        const f = path.join(OUT, '404-1280-focus-explain.png');
        await page.screenshot({ path: f });
        shots.push(f);
        break;
      }
    }
    console.log('Tab order:', seen.join(' -> '));
    const nf = seen.filter((s) => s.includes('.nf-'));
    if (nf.length < 3) problems.push(`tab order missed page buttons: ${seen}`);
    // hover the cloud → wiggle animation on .cloud
    const box = await page.locator('.nf-cloud-float').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(80);
    const anim = await page.$eval('.nf-cloud .cloud', (e) => getComputedStyle(e).animationName);
    if (anim !== 'nf-wiggle') problems.push(`hover wiggle not applied (${anim})`);
    // eyes follow the mouse
    await page.mouse.move(50, 50);
    await page.waitForTimeout(150);
    const pupil = await page.$eval('.cloud-pupil', (e) => e.style.transform);
    if (!/translate\(-/.test(pupil)) problems.push(`pupils not tracking (${pupil})`);
    await ctx.close();
  }

  // /account still renders the cloud
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.cloud', { timeout: 15000 });
    const eyes = await page.locator('.cloud-eye').count();
    if (eyes !== 2) problems.push(`/account: ${eyes} eyes`);
    await page.focus('#account-password').catch(() => problems.push('/account: no password field'));
    await page.waitForTimeout(250);
    const closed = await page.locator('.cloud-eye.is-closed').count();
    if (closed !== 2) problems.push(`/account: eyes not closed on password focus (${closed})`);
    const f = path.join(OUT, 'account-1280-cloud.png');
    await page.screenshot({ path: f });
    shots.push(f);
    await ctx.close();
  }

  await browser.close();
  console.log('Screenshots:\n' + shots.join('\n'));
  console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'All checks passed.');
  process.exit(problems.length ? 1 : 0);
})();
