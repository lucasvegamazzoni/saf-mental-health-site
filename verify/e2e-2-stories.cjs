/* Step 2: story pipeline — anonymise → submit → moderate (approve / flagged reject) → public listing. */
const L = require('./e2e-lib.cjs');
const CLEAN_TITLE = '[test] Getting through the first field camp ' + L.rnd();
const CLEAN_BODY = `During BMT my buddy SGT Tan from 3 SIR at Tekong told me that the first field camp is the hardest one. I remember lying awake in the shellscrape counting the hours. What helped was breaking the night into small chunks and talking to the guy next to me. By the end of the week I was surprised how much easier it felt, and I still use that trick today.`;
const FLAG_TITLE = '[test] A heavier week ' + L.rnd();
const FLAG_BODY = `There was a stretch during my second month when I was hurting myself just to feel something at night. I did not tell anyone for a long time. Eventually I spoke to the medical officer and things slowly started to shift. I am writing this because I wish someone had told me it was okay to ask earlier.`;

async function shareStory(page, title, body, themeIndex) {
  await L.goto(page, '/stories');
  await page.fill('#stories-title', title);
  await page.fill('#stories-draft', body);
  await page.locator('.stories-share-submit').click();
  await page.waitForSelector('.stories-review', { timeout: 10000 });
  const status = (await page.locator('.stories-share-prompt[role="status"]').textContent()).trim();
  const marks = await page.locator('.stories-review mark').allTextContents();
  const reviewText = (await page.locator('.stories-review').textContent()).trim();
  await page.locator('.stories-pick[aria-label="Theme"] [role="radio"]').nth(themeIndex).click();
  const theme = (await page.locator('.stories-pick[aria-label="Theme"] [role="radio"]').nth(themeIndex).textContent()).trim();
  await page.locator('.stories-hope-chip').nth(3).click();
  const btn = page.locator('.stories-share-submit');
  await btn.click();
  // loading state: button disabled while pending
  const disabledDuring = await btn.isDisabled().catch(() => false);
  await page.waitForSelector('.stories-sent', { timeout: 15000 });
  const sent = (await page.locator('.stories-sent').textContent()).trim();
  return { status, marks, reviewText, theme, sent, disabledDuring, care: await page.locator('.stories-care').count() };
}

(async () => {
  const st = L.readState();
  if (!st.mod) throw new Error('run e2e-1-moderator.cjs first');
  const BOT = 'verify-bot-' + L.rnd();
  const { browser, ctx } = await L.launch();
  const page = await ctx.newPage();
  L.wire(page, 'bot');
  const botUid = await L.signUp(page, BOT, '/stories');
  console.log('BOT', BOT, botUid);

  // --- clean story with identifying details
  const a = await shareStory(page, CLEAN_TITLE, CLEAN_BODY, 1);
  L.check('review step reports replacements', /removed \d+ details?/.test(a.status), a.status);
  L.check('review text has no rank/unit/place', !/SGT Tan|3 SIR|Tekong/.test(a.reviewText), 'marks=' + JSON.stringify(a.marks));
  L.check('submit → sent confirmation (no fake success: doc must exist)', a.sent.includes('Sent to a moderator'));
  L.check('submit button disabled while pending', a.disabledDuring);
  await L.shot(page, 'story-sent');

  // --- flagged story
  const b = await shareStory(page, FLAG_TITLE, FLAG_BODY, 0);
  L.check('flagged story → sent + care block with contacts', b.sent.includes('Sent to a moderator') && b.care === 1, `care blocks=${b.care}`);
  await L.shot(page, 'story-flagged-sent');

  // Firestore truth: both pending, flags correct
  const token = await L.oauthToken();
  const pending = await L.fsQuery(token, 'stories', 'authorUid', 'EQUAL', { stringValue: botUid });
  const clean = pending.find((d) => d.title.stringValue === CLEAN_TITLE);
  const flagged = pending.find((d) => d.title.stringValue === FLAG_TITLE);
  L.check('clean story doc pending, flag-free', clean && clean.status.stringValue === 'pending' && !(clean.flags.arrayValue.values || []).length, clean && JSON.stringify(clean.flags));
  L.check('flagged story doc pending with self-harm flag', flagged && flagged.status.stringValue === 'pending' && JSON.stringify(flagged.flags).includes('self-harm'), flagged && JSON.stringify(flagged.flags));
  L.check('stored body contains no real name/unit/place', clean && !/SGT Tan|3 SIR|Tekong/.test(JSON.stringify(clean.body)));

  // --- public: not visible while pending
  const pub = await ctx.newPage();
  await L.goto(pub, '/stories');
  L.check('pending story NOT on public /stories', !(await pub.content()).includes(CLEAN_TITLE));

  // --- moderator
  const mctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const m = await mctx.newPage();
  L.wire(m, 'mod');
  await L.signIn(m, st.mod.callSign, '/moderate');
  await m.waitForSelector('.sq-card', { timeout: 15000 });
  const titles = await m.locator('.sq-card .sq-title').allTextContents();
  const cleanCard = m.locator('.sq-card', { hasText: CLEAN_TITLE });
  const flagCard = m.locator('.sq-card', { hasText: FLAG_TITLE });
  L.check('clean story in queue, no flags', (await cleanCard.count()) === 1 && (await cleanCard.locator('.sq-flag').count()) === 0);
  L.check('flagged story in queue, marked', (await flagCard.count()) === 1 && (await flagCard.locator('.sq-flag').allTextContents()).join().includes('self-harm'));
  const flaggedIdx = titles.findIndex((t) => t.includes(FLAG_TITLE));
  const cleanIdx = titles.findIndex((t) => t.includes(CLEAN_TITLE));
  const firstUnflagged = await Promise.all(titles.map((_, i) => m.locator('.sq-card').nth(i).locator('.sq-flag').count())).then((c) => c.findIndex((n) => n === 0));
  L.check('flagged stories sort before unflagged', flaggedIdx < cleanIdx && flaggedIdx < firstUnflagged, `flaggedIdx=${flaggedIdx} cleanIdx=${cleanIdx} firstUnflagged=${firstUnflagged} total=${titles.length}`);
  L.check('queue never shows a call sign / uid', !(await m.content()).includes(BOT) && !(await m.content()).includes(botUid));
  await L.shot(m, 'moderate-queue');

  await cleanCard.locator('.sq-approve').click();
  await cleanCard.waitFor({ state: 'detached', timeout: 15000 });
  await flagCard.locator('.sq-reject').click();
  await flagCard.waitFor({ state: 'detached', timeout: 15000 });
  await m.waitForTimeout(1500);
  const after = await L.fsQuery(token, 'stories', 'authorUid', 'EQUAL', { stringValue: botUid });
  L.check('approve → published in Firestore', after.find((d) => d.title.stringValue === CLEAN_TITLE).status.stringValue === 'published');
  L.check('reject → rejected in Firestore', after.find((d) => d.title.stringValue === FLAG_TITLE).status.stringValue === 'rejected');

  // --- public listing shows the published one with its theme; rejected never
  await L.goto(pub, '/stories');
  const card = pub.locator('.stories-card', { hasText: CLEAN_TITLE });
  await card.first().waitFor({ timeout: 15000 }).catch(() => {}); // Firestore list resolves after first paint
  L.check('published story on /stories', (await card.count()) === 1, `count=${await card.count()}`);
  L.check('… with its theme tag', (await card.locator('.stories-tag').textContent()).includes(a.theme.replace(/^\S+\s/, '')), `theme="${a.theme}"`);
  L.check('rejected story NOT on /stories', !(await pub.content()).includes(FLAG_TITLE));
  await L.goto(pub, '/stories?theme=' + encodeURIComponent(a.theme.replace(/^\S+\s/, '')));
  const filtered = pub.locator('.stories-card', { hasText: CLEAN_TITLE });
  await filtered.first().waitFor({ timeout: 15000 }).catch(() => {}); // same Firestore settle as above
  L.check('theme filter (URL) keeps the story', (await filtered.count()) === 1, `count=${await filtered.count()}`);
  await L.shot(pub, 'stories-published');

  L.writeState({ bot1: { callSign: BOT, uid: botUid }, stories: { clean: clean.id, flagged: flagged.id } });
  await browser.close();
})().catch((e) => { console.error('E2E FAILED', e); process.exit(1); });
