/* Step 7: as the moderator, reject every '[test]' story/recognition (pending via the UI queue, published via the
 * client SDK signed in as the moderator — the queue only lists pending items) and assert nothing test-like is public. */
const L = require('./e2e-lib.cjs');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, query, where, getDocs, updateDoc, doc } = require('firebase/firestore');
const path = require('path');
const fs = require('fs');

function webConfig() {
  const src = fs.readFileSync(path.join(__dirname, '../src/lib/firebaseConfig.ts'), 'utf8');
  const pick = (k) => (src.match(new RegExp(k + `:\\s*['"]([^'"]+)['"]`)) || [])[1];
  return { apiKey: pick('apiKey'), authDomain: pick('authDomain'), projectId: pick('projectId'), appId: pick('appId') };
}
const isTest = (s) => typeof s === 'string' && s.startsWith('[test]');

(async () => {
  const st = L.readState();
  if (!st.mod) throw new Error('run e2e-1-moderator.cjs first');
  const { browser } = await L.launch({ width: 1280, height: 900 });
  const mctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const m = await mctx.newPage();
  L.wire(m, 'mod');
  await L.signIn(m, st.mod.callSign, '/moderate');
  await m.waitForSelector('.sq-count', { timeout: 15000 });
  await m.waitForFunction(() => /waiting|Nothing waiting/.test(document.body.textContent), null, { timeout: 15000 });
  // pending [test] stories → Reject through the UI
  let rejectedUi = 0;
  for (;;) {
    const card = m.locator('.sq-card').filter({ has: m.locator('.sq-title', { hasText: '[test]' }) }).first();
    if (!(await card.count())) break;
    await card.locator('.sq-reject').click();
    await card.waitFor({ state: 'detached', timeout: 15000 });
    rejectedUi++;
  }
  let rejectedRecUi = 0;
  for (;;) {
    const item = m.locator('.rq-item', { hasText: '[test]' }).first();
    if (!(await item.count())) break;
    await item.locator('.rq-btn-secondary').click();
    await item.waitFor({ state: 'detached', timeout: 15000 });
    rejectedRecUi++;
  }
  console.log(`queue: rejected ${rejectedUi} pending [test] stories, ${rejectedRecUi} pending [test] recognitions via UI`);
  const leftover = (await m.locator('.sq-title').allTextContents()).concat(await m.locator('.rq-text').allTextContents());
  console.log('non-test items left in queue (untouched):', JSON.stringify(leftover));
  await L.shot(m, 'cleanup-queue');

  // published [test] items → rejected with the client SDK as the moderator (exercises the moderator update rule)
  const app = initializeApp(webConfig());
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, `${st.mod.callSign}@safcheckin.app`, L.PASS);
  const db = getFirestore(app);
  const now = new Date().toISOString();
  let rejectedSdk = 0;
  for (const [col, field] of [['stories', 'title'], ['recognitions', 'text']]) {
    for (const status of ['published', 'pending']) {
      const snap = await getDocs(query(collection(db, col), where('status', '==', status)));
      for (const d of snap.docs) {
        if (isTest(d.data()[field])) {
          await updateDoc(doc(db, col, d.id), { status: 'rejected', reviewedAt: now });
          rejectedSdk++;
        }
      }
    }
  }
  console.log(`sdk (as moderator): rejected ${rejectedSdk} remaining [test] items`);

  // admin-side truth: no [test] item is anything but rejected
  const token = await L.oauthToken();
  const bad = [];
  for (const [col, field] of [['stories', 'title'], ['recognitions', 'text']]) {
    for (const status of ['published', 'pending']) {
      for (const d of await L.fsQuery(token, col, 'status', 'EQUAL', { stringValue: status })) {
        if (isTest(d[field] && d[field].stringValue)) bad.push(`${col}/${d.id}:${status}`);
      }
    }
  }
  L.check('no [test] story/recognition is pending or published', bad.length === 0, bad.join(','));

  // public surfaces: signed-out and signed-in visitors must not see anything test-like
  const pub = await (await browser.newContext()).newPage();
  await L.goto(pub, '/stories');
  await pub.waitForFunction(() => !document.querySelector('.stories-loading'), null, { timeout: 15000 }).catch(() => {});
  const storiesHtml = await pub.content();
  L.check('/stories (signed out) shows no [test] story', !storiesHtml.includes('[test]'));
  await L.goto(pub, '/');
  await pub.waitForSelector('.home-wall-card, .home-wall-note', { timeout: 15000 }).catch(() => {});
  L.check('/ recognition wall (signed out) shows no [test] note', !(await pub.content()).includes('[test]'));
  const bot = await (await browser.newContext()).newPage();
  await L.signIn(bot, st.bot1.callSign, '/stories');
  await bot.waitForFunction(() => !document.querySelector('.stories-loading'), null, { timeout: 15000 }).catch(() => {});
  L.check('/stories (signed in as author) shows no rejected [test] story', !(await bot.content()).includes('[test]'));
  await L.shot(pub, 'cleanup-stories-public');
  await browser.close();
  process.exit(process.exitCode || 0); // the client SDK keeps a socket open
})().catch((e) => { console.error('E2E FAILED', e); process.exit(1); });
