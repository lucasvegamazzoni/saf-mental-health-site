// LUC-86 StorySphere verification — run with the dev server on :5222.
const { chromium } = require('playwright');
const OUT = '/Users/lucasdelavegamazzoni/Webdesign_SAF/wt/sphere/verify/';
const URL = 'http://localhost:5222/stories';
const log = (...a) => console.log(...a);

(async () => {
  const browser = await chromium.launch();
  const results = {};

  // 1. Desktop 1280 — sphere visible above list
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const nodes = await page.locator('.sphere-node').count();
    const sphereBox = await page.locator('.sphere-stage').boundingBox();
    const listBox = await page.locator('.stories-list').boundingBox();
    results.desktop = { nodes, sphereBox, listAboveList: sphereBox && listBox && sphereBox.y < listBox.y };
    await page.screenshot({ path: OUT + 'sphere-1280.png', fullPage: false });
    await page.screenshot({ path: OUT + 'sphere-1280-full.png', fullPage: true });

    // 2. Drag: record a front node's transform, drag, check it changed and momentum continues
    const before = await page.locator('.sphere-node').first().getAttribute('style');
    const cx = sphereBox.x + sphereBox.width / 2, cy = sphereBox.y + sphereBox.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) { await page.mouse.move(cx + i * 18, cy + i * 3); await page.waitForTimeout(16); }
    await page.mouse.up();
    const afterDrag = await page.locator('.sphere-node').first().getAttribute('style');
    await page.waitForTimeout(200);
    const afterMomentum = await page.locator('.sphere-node').first().getAttribute('style');
    const expandedAfterDrag = await page.locator('.stories-card-more:not([hidden])').count();
    results.drag = { changed: before !== afterDrag, momentum: afterDrag !== afterMomentum, expandedAfterDrag };
    await page.mouse.move(10, 10);
    await page.screenshot({ path: OUT + 'sphere-after-drag.png' });

    // 3. Click-through: pick the front-most (highest z-index) node
    const target = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.sphere-node:not(.is-dim)')];
      els.sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex));
      const el = els[0];
      return { label: el.getAttribute('aria-label'), idx: [...el.parentElement.children].indexOf(el) };
    });
    const node = page.locator('.sphere-node').nth(target.idx);
    // Entering the stage pauses auto-rotate (as it does for a real pointer); then aim at the node.
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(150);
    let nb = await node.boundingBox();
    await page.mouse.move(nb.x + nb.width / 2, nb.y + nb.height / 2);
    await page.waitForTimeout(350);
    await page.screenshot({ path: OUT + 'sphere-hover.png' });
    nb = await node.boundingBox();
    await page.mouse.click(nb.x + nb.width / 2, nb.y + nb.height / 2);
    await page.waitForTimeout(1200);
    const title = target.label.replace('Open story: ', '');
    const card = page.locator('.stories-card', { has: page.locator('h2', { hasText: title }) }).first();
    const expanded = await card.locator('.stories-readmore').getAttribute('aria-expanded');
    const cardBox = await card.boundingBox();
    const focused = await page.evaluate(() => document.activeElement?.id);
    results.click = { label: target.label, expanded, cardTopInViewport: cardBox && cardBox.y >= 0 && cardBox.y < 400, focusedId: focused, scrollY: await page.evaluate(() => window.scrollY) };
    await page.screenshot({ path: OUT + 'sphere-click-through.png' });

    // 4. Keyboard: Tab from the last chip into a node, Enter
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.locator('.stories-chips .stories-chip').last().focus();
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => ({ cls: document.activeElement?.className, label: document.activeElement?.getAttribute('aria-label') }));
    await page.screenshot({ path: OUT + 'sphere-focus.png' });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1200);
    const kbTitle = (active.label || '').replace('Open story: ', '');
    const kbCard = page.locator('.stories-card', { has: page.locator('h2', { hasText: kbTitle }) }).first();
    results.keyboard = { focusedNode: active, expanded: await kbCard.locator('.stories-readmore').getAttribute('aria-expanded'), focusedAfter: await page.evaluate(() => document.activeElement?.id) };
    await page.screenshot({ path: OUT + 'sphere-keyboard-enter.png' });

    // 5. Theme filter dims nodes
    await page.goto(URL + '?theme=Burnout', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    results.filter = { dim: await page.locator('.sphere-node.is-dim').count(), lit: await page.locator('.sphere-node:not(.is-dim)').count(), tabbable: await page.locator('.sphere-node[tabindex="0"]').count() };
    await page.screenshot({ path: OUT + 'sphere-filter-burnout.png' });
    await page.close();
  }

  // 6. Reduced motion: static
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(600);
    const a = await page.locator('.sphere-node').first().getAttribute('style');
    await page.waitForTimeout(1000);
    const b = await page.locator('.sphere-node').first().getAttribute('style');
    results.reducedMotion = { static: a === b, hasTransform: /translate/.test(a || '') };
    await page.screenshot({ path: OUT + 'sphere-reduced-motion.png' });
    await ctx.close();
  }

  // 7. Mobile 390 — no sphere
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    results.mobile = { sphereInDom: await page.locator('.sphere').count(), hScroll: await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth) };
    await page.screenshot({ path: OUT + 'sphere-390.png', fullPage: false });
    await page.close();
  }

  await browser.close();
  log(JSON.stringify(results, null, 2));
})();
