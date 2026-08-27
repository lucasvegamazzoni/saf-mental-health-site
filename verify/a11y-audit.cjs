// Accessibility audit: headings, landmarks, names, tap targets, gaps, focus rings, overflow, Escape.
// Usage: node verify/a11y-audit.cjs [--signin]   (dev server on :5199)
const { chromium } = require('playwright');
const B = 'http://localhost:5199';
const SIGNIN = process.argv.includes('--signin');
const ROUTES = ['/', '/me?tab=check-in', '/me?tab=timeline', '/me?tab=challenges', '/stories', '/resources', '/resources/better-sleep', '/account?mode=create', '/account?mode=signin', '/moderate', '/trends'];

const AUDIT = `(() => {
  const out = { headings: [], issues: [] };
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(h => h.offsetParent !== null || h.closest('[hidden]') === null);
  let prev = 0;
  for (const h of hs) { const l = +h.tagName[1]; out.headings.push(l + ':' + h.textContent.trim().slice(0, 40)); if (prev && l > prev + 1) out.issues.push('heading skip ' + prev + '->' + l + ' at "' + h.textContent.trim().slice(0, 40) + '"'); prev = l; }
  const h1s = hs.filter(h => h.tagName === 'H1');
  if (h1s.length !== 1) out.issues.push('h1 count ' + h1s.length);
  if (document.querySelectorAll('main').length !== 1) out.issues.push('main count ' + document.querySelectorAll('main').length);
  if (!document.querySelector('nav')) out.issues.push('no nav');
  if (document.documentElement.scrollWidth > window.innerWidth + 1) out.issues.push('horizontal overflow ' + document.documentElement.scrollWidth + '>' + window.innerWidth);
  const sel = 'a[href],button,input,textarea,select,[role=tab],[role=radio],[tabindex]:not([tabindex="-1"])';
  const els = [...document.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden'; });
  const name = e => (e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby') && document.getElementById(e.getAttribute('aria-labelledby'))?.textContent) || (e.labels && e.labels[0]?.textContent) || e.textContent || e.getAttribute('title') || '').trim();
  const desc = e => e.tagName.toLowerCase() + '.' + [...e.classList].join('.') + '"' + name(e).slice(0, 25) + '"';
  for (const e of els) {
    if (!name(e)) out.issues.push('no name: ' + desc(e));
    const r = e.getBoundingClientRect();
    const inline = e.tagName === 'A' && e.closest('p,li,span,figcaption') && getComputedStyle(e).display === 'inline';
    if (!inline && (r.width < 44 || r.height < 44)) out.issues.push('small target ' + Math.round(r.width) + 'x' + Math.round(r.height) + ': ' + desc(e));
    if (e.tagName === 'IMG' && !e.alt) out.issues.push('img no alt');
  }
  for (const img of document.querySelectorAll('img')) if (!img.hasAttribute('alt')) out.issues.push('img missing alt: ' + img.src.slice(-30));
  // gaps between adjacent interactive siblings
  const seen = new Set();
  for (const e of els) {
    const p = e.parentElement; if (!p || seen.has(p)) continue; seen.add(p);
    const kids = [...p.children].filter(k => els.includes(k) || (k.children.length === 1 && els.includes(k.children[0]))).map(k => els.includes(k) ? k : k.children[0]);
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect();
      const dx = Math.max(a.left - b.right, b.left - a.right), dy = Math.max(a.top - b.bottom, b.top - a.bottom);
      const gap = Math.max(dx, dy);
      if (gap >= 0 && gap < 7.5) out.issues.push('gap ' + gap.toFixed(1) + 'px: ' + desc(kids[i]) + ' | ' + desc(kids[j]));
    }
  }
  return out;
})()`;

const FOCUS = `(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); return { d: e.tagName.toLowerCase() + '.' + [...e.classList].join('.') + '"' + (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 20) + '"', outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, inSheet: !!e.closest('.companion-sheet,.layout-help-card') }; })()`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  if (SIGNIN) {
    await page.goto(B + '/account?mode=signin&next=%2Fme', { waitUntil: 'load' });
    await page.fill('#account-callsign', process.env.CALL || 'verify-bot-642057');
    await page.fill('#account-password', 'verify-pass-123');
    await page.locator('.account-primary').click();
    await page.waitForURL('**/me**', { timeout: 20000 });
    await page.waitForTimeout(1500);
  }
  for (const route of ROUTES) {
    for (const w of [390, 1280]) {
      await page.setViewportSize({ width: w, height: w === 390 ? 844 : 800 });
      await page.goto(B + route, { waitUntil: 'load' });
      await page.waitForFunction(() => !document.querySelector('.layout-account.is-loading'), null, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const r = await page.evaluate(AUDIT);
      console.log(`\n=== ${route} @${w}${SIGNIN ? ' (signed in)' : ''}`);
      console.log('headings:', r.headings.join(' | '));
      for (const i of r.issues) console.log('  ! ' + i);
      if (w === 390) {
        // keyboard walk: Tab through up to 60 stops, flag missing focus ring
        const bad = new Set(); const order = [];
        for (let i = 0; i < 60; i++) {
          await page.keyboard.press('Tab');
          const f = await page.evaluate(FOCUS);
          if (!f) continue;
          order.push(f.d);
          if (!/solid/.test(f.outline) || /0px/.test(f.outline)) bad.add(f.d + ' -> ' + f.outline);
        }
        for (const b of bad) console.log('  ! no focus ring: ' + b);
        console.log('  tab order (first 12):', order.slice(0, 12).join(' > '));
      }
    }
  }
  // Overlays: companion + help card Escape + focus return
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(B + '/resources', { waitUntil: 'load' });
  console.log('\n=== overlays');
  await page.locator('.companion-launch').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  console.log('companion open:', await page.locator('.companion-sheet').count(), 'focus:', (await page.evaluate(FOCUS))?.d);
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); const f = await page.evaluate(FOCUS); if (f && !f.inSheet) console.log('  ! focus escaped companion: ' + f.d); }
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  console.log('after Escape: open=', await page.locator('.companion-sheet').count(), 'focus:', (await page.evaluate(FOCUS))?.d);
  await page.locator('.layout-help-btn').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  console.log('help open:', await page.locator('.layout-help-card').count(), 'focus:', (await page.evaluate(FOCUS))?.d);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  console.log('after Escape: open=', await page.locator('.layout-help-card').count(), 'focus:', (await page.evaluate(FOCUS))?.d);
  // Tabs arrow keys
  await page.goto(B + '/me?tab=check-in', { waitUntil: 'load' });
  await page.locator('[role=tab]').first().focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300);
  console.log('me tabs ArrowRight -> selected:', await page.locator('[role=tab][aria-selected=true]').textContent(), 'focus:', (await page.evaluate(FOCUS))?.d, 'url:', page.url().slice(-20));
  if (!SIGNIN) {
  await page.goto(B + '/account?mode=create', { waitUntil: 'load' });
  await page.locator('[role=tab]').first().focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300);
  console.log('account modes ArrowRight -> selected:', await page.locator('[role=tab][aria-selected=true]').textContent());
  }
  if (SIGNIN) {
    // Stories share flow: review step (marks, radiogroups, arrow keys)
    await page.goto(B + '/stories', { waitUntil: 'load' });
    await page.waitForFunction(() => !document.querySelector('.layout-account.is-loading'), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.fill('#stories-title', 'A11y walk with LTA Tan');
    await page.fill('#stories-draft', 'During field camp at Tekong my buddy Marcus and I were both wrecked. Sergeant Lim noticed and we talked it through over a long night. Things got better slowly after that.');
    await page.locator('.stories-share-submit').click(); await page.waitForTimeout(600);
    const rv = await page.evaluate(AUDIT);
    console.log('\n=== stories review step');
    console.log('headings:', rv.headings.slice(-3).join(' | '));
    for (const i of rv.issues.filter(i => !/layout-|me-tab/.test(i))) console.log('  ! ' + i);
    console.log('marks:', await page.locator('mark').count());
    await page.locator('[role=radiogroup]').first().locator('[role=radio]').first().focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
    console.log('theme ArrowRight -> checked:', await page.locator('[role=radiogroup]').first().locator('[role=radio][aria-checked=true]').textContent());
    await page.locator('[role=radiogroup]').nth(1).locator('[role=radio]').first().focus(); await page.keyboard.press('End'); await page.waitForTimeout(200);
    console.log('hope End -> checked:', await page.locator('[role=radiogroup]').nth(1).locator('[role=radio][aria-checked=true]').textContent());
    // Trends week chips
    await page.goto(B + '/trends?week=2026-W31', { waitUntil: 'load' }); await page.waitForTimeout(3500);
    const tr = await page.evaluate(AUDIT);
    console.log('\n=== trends W31'); console.log('headings:', tr.headings.join(' | '));
    for (const i of tr.issues.filter(i => !/layout-/.test(i))) console.log('  ! ' + i);
  }
  // check-in flow: keyboard answer -> focus lands on the next question; finish title gets focus
  await page.goto(B + '/me?tab=check-in', { waitUntil: 'load' }); await page.waitForTimeout(800);
  await page.locator('.checkin-answer').nth(2).focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  console.log('check-in after Enter -> focus:', (await page.evaluate(FOCUS))?.d, '| count:', (await page.locator('.checkin-count').textContent()).trim());
  for (let i = 0; i < 9; i++) { await page.locator('.checkin-answer').nth(2).focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(150); }
  await page.waitForTimeout(400);
  console.log('finish -> focus:', (await page.evaluate(FOCUS))?.d, '| audit:', (await page.evaluate(AUDIT)).issues.filter(i => !/layout-/.test(i)).join('; ') || 'clean');
  // reduced motion: QR tree final state
  const rm = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const p2 = await rm.newPage(); await p2.goto(B + '/', { waitUntil: 'load' }); await p2.waitForTimeout(2500);
  console.log('reduced-motion QR hint:', (await p2.locator('.qrtree__hint').textContent()).trim(), '| html scroll-behavior:', await p2.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior));
  await browser.close();
})().catch((e) => { console.error('AUDIT FAILED', e.message); process.exit(1); });
