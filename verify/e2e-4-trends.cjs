/* Step 4: a signed-in check-in adds to trends/{week}; /trends renders (min-group notice or bars) without errors. */
const L = require('./e2e-lib.cjs');
(async () => {
  const st = L.readState();
  const { browser, ctx } = await L.launch();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  const BOT = 'verify-bot-' + L.rnd();
  const uid = await L.signUp(page, BOT, '/check-in');
  await page.waitForSelector('.checkin-answer', { timeout: 15000 });
  // Answer every question "Tough" (score 0) so follow-up reasons open; pick the first reason each time.
  for (let i = 0; i < 12 && (await page.locator('.checkin-answer').count()) > 0; i++) {
    await page.locator('.checkin-answer').nth(0).click();
    await page.waitForTimeout(250);
    const chips = page.locator('.checkin-chips button');
    if (await chips.count()) {
      await chips.nth(0).click();
      await page.waitForTimeout(150);
      const cont = page.locator('.checkin-followup button', { hasText: /continue|next|done/i });
      if (await cont.count()) await cont.first().click();
    }
    await page.waitForTimeout(300);
  }
  await page.waitForSelector('.checkin-finish', { timeout: 15000 });
  await page.waitForTimeout(2000);
  await L.shot(page, 'checkin-finish');

  const token = await L.oauthToken();
  // week id: same algorithm as src/data/polls.ts weekId (read the doc list and pick the one the app wrote)
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/saf-checkin/databases/(default)/documents/trends?pageSize=50`, { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json());
  const docs = (r.documents || []).map((d) => ({ id: d.name.split('/').pop(), n: Number(d.fields.n && d.fields.n.integerValue), fields: d.fields }));
  const latest = docs.sort((a, b) => b.id.localeCompare(a.id))[0];
  L.check('trend doc exists with n ≥ 1', latest && latest.n >= 1, JSON.stringify(docs.map((d) => [d.id, d.n])));
  L.check('trend doc carries only n / reasons / overall (no uid)', latest && Object.keys(latest.fields).every((k) => ['n', 'reasons', 'overall'].includes(k)), latest && Object.keys(latest.fields).join(','));

  await L.goto(page, '/trends');
  await page.waitForSelector('.trends-page', { timeout: 15000 });
  await page.waitForTimeout(2500);
  const notice = await page.locator('.trends-card[role="status"]').count();
  const bars = await page.locator('.trends-panel').count();
  const err = await page.locator('.trends-card[role="alert"]').count();
  L.check('/trends renders min-group notice or bars', (notice + bars) >= 1 && err === 0, `notice=${notice} bars=${bars} alert=${err} n=${latest && latest.n}`);
  L.check('no page/console errors on /trends', errors.length === 0, errors.join(' | '));
  L.check('trends page has one h1', (await page.locator('h1').count()) === 1);
  await L.shot(page, 'trends');
  L.writeState({ botT: { callSign: BOT, uid }, trendWeek: latest && latest.id, trendN: latest && latest.n });
  await browser.close();
})().catch((e) => { console.error('E2E FAILED', e); process.exit(1); });
