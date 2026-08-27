/* Security check: Firestore rules, exercised against PRODUCTION with the CLIENT SDK.
 * Two throwaway 'verify-bot-*' accounts + one anonymous session try every operation the
 * rules should forbid. Every doc it creates is '[sec-test]'-prefixed and recorded in
 * verify/sec-state.json; run verify/sec-cleanup.cjs afterwards.
 *   node verify/sec-rules-probe.cjs
 * Output: PASS = rules denied as expected / allowed as designed; FAIL = a hole.
 * NOTE lines flag things that are allowed today but arguably should not be.
 */
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInAnonymously, signOut } = require('firebase/auth');
const {
  getFirestore, doc, collection, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, increment, limit,
} = require('firebase/firestore');

function webConfig() {
  const src = fs.readFileSync(path.join(__dirname, '../src/lib/firebaseConfig.ts'), 'utf8');
  const pick = (k) => (src.match(new RegExp(k + `:\\s*['"]([^'"]+)['"]`)) || [])[1];
  return { apiKey: pick('apiKey'), authDomain: pick('authDomain'), projectId: pick('projectId'), appId: pick('appId') };
}
const STATE = path.join(__dirname, 'sec-state.json');
const readState = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {});
const writeState = (patch) => fs.writeFileSync(STATE, JSON.stringify({ ...readState(), ...patch }, null, 2));

const PASS = 'verify-pass-123';
const rnd = () => Math.floor(Math.random() * 1e6);
const T = '[sec-test]';
const WEEK = 'sec-test-week';
const created = { stories: [], recognitions: [], trends: [WEEK], polls: [WEEK] };
let fails = 0;

function check(label, ok, evidence = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${evidence ? '  — ' + evidence : ''}`);
  if (!ok) { fails++; process.exitCode = 1; }
}
function note(label, evidence = '') { console.log(`NOTE  ${label}${evidence ? '  — ' + evidence : ''}`); }

/** Runs op; returns { denied, err, value }. */
async function attempt(op) {
  try { return { denied: false, value: await op() }; }
  catch (err) { return { denied: err && err.code === 'permission-denied', err }; }
}
async function expectDenied(label, op) {
  const r = await attempt(op);
  check(label, r.denied, r.denied ? 'PERMISSION_DENIED' : r.err ? `other error: ${r.err.code || r.err.message}` : 'SUCCEEDED (hole)');
  return r;
}
async function expectAllowed(label, op) {
  const r = await attempt(op);
  check(label, !r.denied && !r.err, r.err ? `error: ${r.err.code || r.err.message}` : 'ok');
  return r;
}

const story = (authorUid, extra = {}) => ({
  theme: 'Burnout', title: `${T} story ${rnd()}`, preview: 'x', body: ['para one', 'para two'], lessons: [],
  hopeScore: 3, readMins: 1, flags: [], status: 'pending', createdAt: new Date().toISOString(), ...extra, // authorUid intentionally absent since LUC-95 fix (rules reject it)
});

(async () => {
  const cfg = webConfig();
  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // Accounts -----------------------------------------------------------------
  const A = { call: 'verify-bot-' + rnd() };
  const B = { call: 'verify-bot-' + rnd() };
  let cred = await createUserWithEmailAndPassword(auth, `${A.call}@safcheckin.app`, PASS);
  A.uid = cred.user.uid;
  await setDoc(doc(db, 'users', A.uid), { callSign: A.call, marker: '🌱', createdAt: new Date().toISOString() });
  await signOut(auth);
  cred = await createUserWithEmailAndPassword(auth, `${B.call}@safcheckin.app`, PASS);
  B.uid = cred.user.uid;
  await setDoc(doc(db, 'users', B.uid), { callSign: B.call, marker: '🌱', createdAt: new Date().toISOString() });
  writeState({ probeBots: [{ callSign: A.call, uid: A.uid, pass: PASS }, { callSign: B.call, uid: B.uid, pass: PASS }] });
  console.log(`accounts: A=${A.call} (${A.uid})  B=${B.call} (${B.uid})`);

  // ---- As B (signed in) -------------------------------------------------------
  console.log('\n## As signed-in user B');
  const r1 = await expectAllowed('B creates own pending story (by design)', () => addDoc(collection(db, 'stories'), story(B.uid)));
  const bStoryId = r1.value && r1.value.id; if (bStoryId) created.stories.push(bStoryId);
  await expectDenied('B creates story with status=published', () => addDoc(collection(db, 'stories'), story(B.uid, { status: 'published' })));
  await expectDenied('B creates story with authorUid=A (impersonation via explicit field)', () => addDoc(collection(db, 'stories'), { ...story(A.uid), authorUid: A.uid }));
  await expectDenied('B creates story carrying an authorUid field (must be rejected by key allowlist)', () => addDoc(collection(db, 'stories'), { ...story(B.uid), authorUid: B.uid }));
  await expectDenied('B updates own pending story after submission', () => updateDoc(doc(db, 'stories', bStoryId), { title: `${T} edited` }));
  await expectDenied('B self-publishes own story', () => updateDoc(doc(db, 'stories', bStoryId), { status: 'published' }));
  await expectDenied('B deletes own story', () => deleteDoc(doc(db, 'stories', bStoryId)));
  await expectDenied('B reads own pending story by id', () => getDoc(doc(db, 'stories', bStoryId)));
  await expectDenied('B enumerates pending stories (query status==pending)', () => getDocs(query(collection(db, 'stories'), where('status', '==', 'pending'), limit(5))));
  await expectDenied('B enumerates rejected stories', () => getDocs(query(collection(db, 'stories'), where('status', '==', 'rejected'), limit(5))));
  await expectDenied('B lists whole stories collection (no filter)', () => getDocs(query(collection(db, 'stories'), limit(5))));
  await expectAllowed('B reads published stories (by design)', () => getDocs(query(collection(db, 'stories'), where('status', '==', 'published'), limit(5))));
  await expectDenied('B enumerates pending recognitions', () => getDocs(query(collection(db, 'recognitions'), where('status', '==', 'pending'), limit(5))));

  await expectDenied('B reads users/A profile', () => getDoc(doc(db, 'users', A.uid)));
  await expectDenied('B lists users/A/checkins', () => getDocs(collection(db, 'users', A.uid, 'checkins')));
  await expectDenied('B writes users/A/checkins/x', () => setDoc(doc(db, 'users', A.uid, 'checkins', 'sec'), { dateISO: 'x', answers: [] }));
  await expectDenied('B lists users collection', () => getDocs(query(collection(db, 'users'), limit(5))));

  await expectDenied('B writes moderators/B (self-promotion)', () => setDoc(doc(db, 'moderators', B.uid), {}));
  await expectDenied('B reads moderators/A', () => getDoc(doc(db, 'moderators', A.uid)));
  await expectDenied('B lists moderators', () => getDocs(query(collection(db, 'moderators'), limit(5))));
  await expectAllowed('B reads moderators/B (own entry, by design)', () => getDoc(doc(db, 'moderators', B.uid)));

  await expectDenied('B writes polls/{week} question doc', () => setDoc(doc(db, 'polls', WEEK), { question: T }));
  await expectAllowed('B votes polls/{week}/votes/B (by design)', () => setDoc(doc(db, 'polls', WEEK, 'votes', B.uid), { option: `${T} B`, at: new Date().toISOString() }));
  await expectDenied('B votes as A (votes/A)', () => setDoc(doc(db, 'polls', WEEK, 'votes', A.uid), { option: 'x' }));
  await expectDenied('B vote with non-string option', () => setDoc(doc(db, 'polls', WEEK, 'votes', B.uid), { option: 42 }));
  { const r = await attempt(() => setDoc(doc(db, 'polls', WEEK, 'votes', B.uid), { option: `${T} B`, junk: 'x'.repeat(50_000) }));
    if (!r.denied && !r.err) note('vote doc accepts arbitrary extra keys (50 kB junk field) — rules only check option is string'); else check('vote extra keys rejected', true); }

  // Trends
  await expectDenied('B writes trends with an extra key', () => setDoc(doc(db, 'trends', WEEK), { n: increment(1), reasons: {}, overall: {}, evil: 1 }, { merge: true }));
  { const r = await attempt(() => setDoc(doc(db, 'trends', WEEK), { n: increment(1_000_000), reasons: { [`${T} injected label visible on /trends`]: increment(999) }, overall: { 0: increment(1) } }, { merge: true }));
    check('trends: n +1,000,000 and arbitrary reason label  (should be DENIED)', r.denied, r.denied ? 'denied' : 'SUCCEEDED — counters/labels are attacker-controlled'); }
  { const r = await attempt(() => setDoc(doc(db, 'trends', WEEK), { n: 'not-a-number' }, { merge: true }));
    check('trends: n set to a string (should be DENIED)', r.denied, r.denied ? 'denied' : 'SUCCEEDED — no type check'); }

  // Sizes / shapes
  { const big = 'x'.repeat(900_000);
    const r = await attempt(() => addDoc(collection(db, 'stories'), story(B.uid, { body: [big] })));
    if (r.value) created.stories.push(r.value.id);
    check('story with 900 kB body (should be DENIED by a size cap)', r.denied, r.denied ? 'denied' : `SUCCEEDED id=${r.value && r.value.id}`); }
  { const r = await attempt(() => addDoc(collection(db, 'stories'), story(B.uid, { body: Array.from({ length: 5000 }, (_, i) => `p${i}`), flags: Array.from({ length: 5000 }, () => 'x'), hopeScore: 99, theme: 'z'.repeat(10_000), title: `${T} ` + 't'.repeat(10_000) })));
    if (r.value) created.stories.push(r.value.id);
    check('story with 5000 paras / 10 kB title / hopeScore 99 (should be DENIED)', r.denied, r.denied ? 'denied' : `SUCCEEDED id=${r.value && r.value.id}`); }
  { const r = await attempt(() => addDoc(collection(db, 'stories'), story(B.uid, { body: [123, { a: 1 }], title: 5 })));
    if (r.value) created.stories.push(r.value.id);
    check('story body with non-string elements (should be DENIED)', r.denied, r.denied ? 'denied' : `SUCCEEDED id=${r.value && r.value.id}`); }
  { const r = await attempt(() => addDoc(collection(db, 'recognitions'), { text: `${T} ` + 'r'.repeat(200_000), authorUid: B.uid, status: 'pending', flags: [], createdAt: new Date().toISOString() }));
    if (r.value) created.recognitions.push(r.value.id);
    check('recognition with 200 kB text (client caps at 120 chars; should be DENIED)', r.denied, r.denied ? 'denied' : `SUCCEEDED id=${r.value && r.value.id}`); }
  await expectDenied('recognition with status=published', () => addDoc(collection(db, 'recognitions'), { text: T, authorUid: B.uid, status: 'published', flags: [], createdAt: 'x' }));

  // Burst / rate
  { const t0 = Date.now(); let ok = 0;
    await Promise.all(Array.from({ length: 15 }, () => attempt(() => addDoc(collection(db, 'stories'), story(B.uid))).then((r) => { if (r.value) { ok++; created.stories.push(r.value.id); } })));
    note(`burst: ${ok}/15 stories accepted in ${Date.now() - t0} ms — no per-user rate limit in rules`); }

  { const r = await attempt(() => setDoc(doc(db, 'users', B.uid, 'anything', 'deep'), { blob: 'y'.repeat(500_000) }));
    note(`own users/{uid}/** tree accepts arbitrary subcollections/500 kB blobs: ${r.denied ? 'denied' : 'allowed (by design, unbounded storage)'}`); }

  // ---- As A: can A see B's vote? ---------------------------------------------
  console.log('\n## As signed-in user A (reads B\'s data)');
  await signOut(auth);
  const { signInWithEmailAndPassword } = require('firebase/auth');
  await signInWithEmailAndPassword(auth, `${A.call}@safcheckin.app`, PASS);
  { const r = await attempt(() => getDoc(doc(db, 'polls', WEEK, 'votes', B.uid)));
    check('A reads B\'s vote doc polls/{week}/votes/{B} (should be DENIED)', r.denied, r.denied ? 'denied' : `SUCCEEDED option=${JSON.stringify(r.value && r.value.data() && r.value.data().option)}`); }
  { const r = await attempt(() => getDocs(query(collection(db, 'polls', WEEK, 'votes'), limit(50))));
    check('A lists every vote in polls/{week}/votes (should be DENIED)', r.denied, r.denied ? 'denied' : `SUCCEEDED — ${r.value.size} docs, ids are voter uids`); }
  { const r = await attempt(() => getDoc(doc(db, 'trends', WEEK)));
    note(`A reads trends/${WEEK}: ${r.denied ? 'denied' : 'allowed — n=' + JSON.stringify(r.value.data() && r.value.data().n)}`); }

  // ---- Anonymous session ----------------------------------------------------
  console.log('\n## As anonymous session');
  await signOut(auth);
  const anon = await signInAnonymously(auth);
  const ANON = anon.user.uid;
  writeState({ probeAnon: ANON });
  { const r = await attempt(() => addDoc(collection(db, 'stories'), story(ANON)));
    if (r.value) created.stories.push(r.value.id);
    check('anon creates pending story (by design: account-less sharing)', !r.denied && !r.err, r.err ? String(r.err.code) : 'ok'); }
  await expectDenied('anon reads users/A', () => getDoc(doc(db, 'users', A.uid)));
  await expectDenied('anon writes moderators/anon', () => setDoc(doc(db, 'moderators', ANON), {}));
  { const r = await attempt(() => getDocs(query(collection(db, 'polls', WEEK, 'votes'), limit(50))));
    check('anon lists poll votes (should be DENIED)', r.denied, r.denied ? 'denied' : `SUCCEEDED — ${r.value.size} docs`); }
  { const r = await attempt(() => setDoc(doc(db, 'polls', WEEK, 'votes', ANON), { option: `${T} anon` }));
    check('anon casts a poll vote (should be DENIED: UI requires call sign)', r.denied, r.denied ? 'denied' : 'SUCCEEDED'); }
  { const r = await attempt(() => setDoc(doc(db, 'trends', WEEK), { n: increment(1) }, { merge: true }));
    check('anon increments trends (should be DENIED: UI only records for call-sign users)', r.denied, r.denied ? 'denied' : 'SUCCEEDED'); }
  { const r = await attempt(() => getDoc(doc(db, 'trends', WEEK)));
    check('anon reads trends (should be DENIED: /trends is gated to call-sign users in UI)', r.denied, r.denied ? 'denied' : 'SUCCEEDED'); }
  { const r = await attempt(() => addDoc(collection(db, 'recognitions'), { text: `${T} anon`, authorUid: ANON, status: 'pending', flags: [], createdAt: 'x' }));
    if (r.value) created.recognitions.push(r.value.id);
    check('anon posts a recognition (UI requires call sign; should be DENIED)', r.denied, r.denied ? 'denied' : 'SUCCEEDED'); }

  writeState({ created });
  console.log(`\ncreated for cleanup: ${created.stories.length} stories, ${created.recognitions.length} recognitions, trends/${WEEK}, polls/${WEEK}/votes/*`);
  console.log(fails ? `\n${fails} rule check(s) FAILED` : '\nall rule checks passed');
  process.exit(process.exitCode || 0);
})().catch((e) => { console.error('SEC-RULES FAILED', e); writeState({ created }); process.exit(1); });
