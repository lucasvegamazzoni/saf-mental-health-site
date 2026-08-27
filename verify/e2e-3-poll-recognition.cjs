/* Step 3: poll votes from two bots reflect in the bars; recognition submit → moderate → home wall. */
const L = require('./e2e-lib.cjs');
const NOTE = '[test] Shout-out to the buddy who shared his last wet wipes ' + L.rnd();

async function voteAs(browser, callSign, optionIdx, tag) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  L.wire(page, tag);
  const uid = await L.signUp(page, callSign, '/');
  await page.waitForSelector('.home-pulse-option', { timeout: 15000 });
  const opt = page.locator('.home-pulse-option').nth(optionIdx);
  const label = (await opt.textContent()).trim();
  await opt.click();
  await page.waitForSelector('.home-pulse-bars', { timeout: 15000 });
  await page.waitForTimeout(500);
  const rows = await page.locator('.home-pulse-row').evaluateAll((els) => els.map((e) => ({
    label: e.querySelector('.home-pulse-row-label').textContent.trim(),
    pct: e.querySelector('.home-pulse-row-pct').textContent.trim(),
    width: e.querySelector('.home-pulse-fill').style.width,
    mine: e.classList.contains('is-mine'),
  })));
  const n = (await page.locator('.home-pulse-n').textContent()).trim();
  return { ctx, page, uid, label, rows, n };
}

(async () => {
  const st = L.readState();
  if (!st.mod) throw new Error('run e2e-1-moderator.cjs first');
  const { browser } = await L.launch();
  const token = await L.oauthToken();
  const A = 'verify-bot-' + L.rnd(), Bn = 'verify-bot-' + L.rnd();

  const a = await voteAs(browser, A, 1, 'botA');
  L.check('bot A vote → bars render with "your pick"', a.rows.some((r) => r.mine && r.label.includes(a.label)), JSON.stringify(a.rows));
  const nA = Number(a.n.match(/\d+/)[0]);
  const b = await voteAs(browser, Bn, 1, 'botB');
  const nB = Number(b.n.match(/\d+/)[0]);
  L.check('bot B vote → count grew by exactly 1', nB === nA + 1, `${a.n} → ${b.n}`);
  const mineRow = b.rows.find((r) => r.mine);
  L.check('bar percent matches count (mine row pct == width)', mineRow && mineRow.pct === mineRow.width.replace(/\s/g, ''), JSON.stringify(mineRow));
  L.check('at least 2 votes counted this week', nB >= 2, b.n);
  await L.shot(b.page, 'poll-bars');
  // aria-pressed + tap target size on option buttons
  await b.page.locator('.home-pulse-change').first().click();
  await b.page.waitForSelector('.home-pulse-option');
  const box = await b.page.locator('.home-pulse-option').first().boundingBox();
  L.check('poll option tap target ≥ 44px', box && box.height >= 44, `h=${box && box.height}`);
  L.check('poll options carry aria-pressed', (await b.page.locator('.home-pulse-option[aria-pressed="true"]').count()) === 1);

  // --- recognition
  await b.page.locator('.home-pulse-option').nth(1).click();
  await b.page.fill('#home-wall-input', NOTE);
  const submitBtn = b.page.locator('.home-wall-submit');
  await submitBtn.click();
  await b.page.waitForSelector('.home-wall-sent', { timeout: 15000 });
  L.check('recognition → sent state', (await b.page.locator('.home-wall-sent-title').textContent()).includes('moderator'));
  const recs = await L.fsQuery(token, 'recognitions', 'authorUid', 'EQUAL', { stringValue: b.uid });
  const rec = recs.find((r) => r.text.stringValue === NOTE);
  L.check('recognition doc pending in Firestore', rec && rec.status.stringValue === 'pending');
  await L.shot(b.page, 'recognition-sent');

  const mctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const m = await mctx.newPage();
  L.wire(m, 'mod');
  await L.signIn(m, st.mod.callSign, '/moderate');
  const item = m.locator('.rq-item', { hasText: NOTE });
  await item.waitFor({ timeout: 15000 });
  L.check('recognition in moderation queue, no uid/call sign', !(await m.content()).includes(Bn) && !(await m.content()).includes(b.uid));
  await item.locator('.rq-btn-primary').click();
  await item.waitFor({ state: 'detached', timeout: 15000 });
  await m.waitForTimeout(1200);
  const rec2 = (await L.fsQuery(token, 'recognitions', 'authorUid', 'EQUAL', { stringValue: b.uid })).find((r) => r.text.stringValue === NOTE);
  L.check('approve → published', rec2 && rec2.status.stringValue === 'published');

  const pub = await (await browser.newContext()).newPage();
  await L.goto(pub, '/');
  await pub.waitForSelector('.home-wall-card', { timeout: 15000 });
  const card = pub.locator('.home-wall-card', { hasText: NOTE });
  L.check('published recognition on home wall (signed-out visitor)', (await card.count()) === 1);
  L.check('… not tagged Illustrative', (await card.locator('.home-wall-tag').count()) === 0);
  await L.shot(pub, 'home-wall');

  L.writeState({ botA: { callSign: A, uid: a.uid }, botB: { callSign: Bn, uid: b.uid }, recognition: rec && rec.id });
  await browser.close();
})().catch((e) => { console.error('E2E FAILED', e); process.exit(1); });
