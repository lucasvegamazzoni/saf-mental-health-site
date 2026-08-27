/* Step 1: create a moderator account via the UI, allowlist it via Firestore REST, assert the Moderate nav link. */
const L = require('./e2e-lib.cjs');
(async () => {
  const CALL = 'verify-mod-' + L.rnd();
  const { browser, ctx } = await L.launch({ width: 1280, height: 900 });
  const page = await ctx.newPage();
  L.wire(page, 'mod');
  const uid = await L.signUp(page, CALL, '/');
  if (!uid) throw new Error('uid not readable — refusing to write moderators/null');
  L.check('moderator account created + uid read from auth persistence (localStorage or IndexedDB)', Boolean(uid), `${CALL} uid=${uid}`);
  L.check('Moderate link hidden before allowlisting', (await page.locator('a.layout-link', { hasText: 'Moderate' }).count()) === 0);

  const token = await L.oauthToken();
  await L.fsPatch(token, `moderators/${uid}`, {
    role: { stringValue: 'moderator' },
    createdAt: { stringValue: '2026-08-27' },
  });
  const doc = await L.fsGet(token, `moderators/${uid}`);
  L.check('moderators/{uid} doc exists', Boolean(doc && doc.fields), JSON.stringify(doc && doc.fields));

  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const link = page.locator('a.layout-link', { hasText: 'Moderate' });
  const t0 = Date.now(); let appeared = true;
  await link.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { appeared = false; });
  L.check('Moderate nav link appears after reload', appeared, `after ${Date.now() - t0} ms (+2.5 s settle)`);
  await link.first().click();
  await page.waitForTimeout(2000);
  L.check('/moderate shows review queue', (await page.locator('h1').textContent()).includes('Review queue'));
  await L.shot(page, 'moderator-nav');
  L.writeState({ mod: { callSign: CALL, uid } });
  console.log('MODERATOR', CALL, uid);
  await browser.close();
})().catch((e) => { console.error('E2E FAILED', e); process.exit(1); });
