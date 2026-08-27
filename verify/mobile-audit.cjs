const { chromium } = require('playwright');
const B = process.env.E2E_BASE || 'https://saf-checkin.web.app';
const ROUTES = ['/', '/stories', '/resources', '/resources/stress', '/me', '/account', '/privacy', '/nope'];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const vp of [{ width: 390, height: 844, tag: 'm390' }, { width: 360, height: 740, tag: 'm360' }]) {
    const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    for (const r of ROUTES) {
      const page = await ctx.newPage();
      await page.goto(B + r, { waitUntil: 'load' }); await page.waitForTimeout(2000);
      const audit = await page.evaluate(() => {
        const overflow = document.documentElement.scrollWidth - window.innerWidth;
        const wide = [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.right > window.innerWidth + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed'; }).slice(0, 6).map(el => el.tagName.toLowerCase() + '.' + [...el.classList].join('.'));
        const small = [...document.querySelectorAll('a,button,[role=button],input,[role=tab],[role=radio]')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.height < 44 || r.width < 44) && getComputedStyle(el).visibility !== 'hidden'; }).map(el => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`).slice(0, 12);
        const tiny = [...document.querySelectorAll('p,span,li,a,button,label,h1,h2,h3,small')].filter(el => el.textContent.trim() && parseFloat(getComputedStyle(el).fontSize) < 13 && el.getBoundingClientRect().width > 0).map(el => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${getComputedStyle(el).fontSize}`);
        return { overflow, wide, small, tiny: [...new Set(tiny)].slice(0, 12) };
      });
      const name = (r === '/' ? 'home' : r.replace(/\//g, '_').replace(/^_/, ''));
      await page.screenshot({ path: `verify/mob-${vp.tag}-${name}.png`, fullPage: true });
      console.log(`\n== ${vp.tag} ${r}  overflow=${audit.overflow}px`);
      if (audit.wide.length) console.log('  wide:', audit.wide.join(', '));
      if (audit.small.length) console.log('  small targets:', audit.small.join(' | '));
      if (audit.tiny.length) console.log('  tiny text:', audit.tiny.join(' | '));
      await page.close();
    }
    await ctx.close();
  }
  await b.close();
})();
