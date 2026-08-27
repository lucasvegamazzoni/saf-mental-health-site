/* Step 5: companion — sleep intent gives a reply + chip; crisis phrase → handover with tel: links. */
const L = require('./e2e-lib.cjs');
(async () => {
  const { browser, ctx } = await L.launch();
  const page = await ctx.newPage();
  L.wire(page, 'comp');
  await L.goto(page, '/');
  await page.locator('.companion-launch').click();
  await page.waitForSelector('.companion-sheet', { timeout: 10000 });
  L.check('companion sheet is a dialog with a label', (await page.locator('.companion-sheet[role="dialog"][aria-labelledby]').count()) === 1);
  await page.fill('.companion-input', "I can't sleep");
  await page.locator('.companion-send').click();
  await page.waitForFunction(() => document.querySelectorAll('.companion-msg--companion:not(.companion-msg--wait)').length >= 2, null, { timeout: 10000 });
  const replies = page.locator('.companion-msg--companion:not(.companion-msg--wait)');
  const last = replies.last();
  const text = (await last.textContent()).trim();
  const steps = await last.locator('.companion-step').allTextContents();
  L.check('sleep message → companion reply', text.length > 20, text.slice(0, 90));
  L.check('… with a next-step chip (Better sleep tips)', steps.some((s) => /sleep/i.test(s)), JSON.stringify(steps));
  L.check('chip links to /resources/better-sleep', (await last.locator('a.companion-step[href*="better-sleep"]').count()) >= 1);
  await L.shot(page, 'companion-sleep');

  await page.fill('.companion-input', 'I feel like ending it all, I do not want to wake up tomorrow');
  await page.locator('.companion-send').click();
  await page.waitForSelector('.companion-msg--handover', { timeout: 10000 });
  const hand = page.locator('.companion-msg--handover').last();
  const tels = await hand.locator('a.companion-step--tel').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  L.check('crisis phrase → handover message', (await hand.count()) === 1);
  L.check('handover carries tel: links', tels.length >= 1 && tels.every((h) => h.startsWith('tel:')), JSON.stringify(tels));
  const box = await hand.locator('a.companion-step--tel').first().boundingBox();
  L.check('tel link tap target ≥ 44px', box && box.height >= 44, `h=${box && box.height}`);
  await L.shot(page, 'companion-crisis');
  // Escape closes the sheet; emergency button still present and ungated
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  L.check('Escape closes the companion', (await page.locator('.companion-sheet').count()) === 0);
  const emergency = page.locator('.layout-help-btn');
  L.check('emergency button visible while signed out', (await emergency.count()) === 1 && (await emergency.isVisible()));
  await emergency.click();
  await page.waitForSelector('#layout-help-card', { timeout: 5000 });
  const telCount = await page.locator('#layout-help-card a[href^="tel:"]').count();
  L.check('emergency card opens signed-out with tel: links (never gated)', telCount >= 1, `tel links=${telCount}`);
  await L.shot(page, 'emergency-card');
  await browser.close();
})().catch((e) => { console.error('E2E FAILED', e); process.exit(1); });
