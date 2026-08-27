/* Removes everything sec-*.cjs created (reads verify/sec-state.json):
 *  - throwaway accounts: sign in with the client SDK, delete users/{uid} tree they own, deleteUser
 *  - stories/recognitions/trends/polls docs: Firestore REST with the local firebase-tools OAuth token
 *    (the client can't delete stories by design — rules deny; that is the point).
 *  - anonymous session uid: cannot be re-signed-in; its story is deleted via REST, the auth user is
 *    left for Firebase's anonymous-account auto-cleanup (or delete in console: Auth → filter anonymous).
 *   node verify/sec-cleanup.cjs
 */
const fs = require('fs');
const path = require('path');
const L = require('./e2e-lib.cjs');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, deleteUser, signOut } = require('firebase/auth');
const { getFirestore, doc, collection, getDocs, deleteDoc } = require('firebase/firestore');

function webConfig() {
  const src = fs.readFileSync(path.join(__dirname, '../src/lib/firebaseConfig.ts'), 'utf8');
  const pick = (k) => (src.match(new RegExp(k + `:\\s*['"]([^'"]+)['"]`)) || [])[1];
  return { apiKey: pick('apiKey'), authDomain: pick('authDomain'), projectId: pick('projectId'), appId: pick('appId') };
}
const STATE = path.join(__dirname, 'sec-state.json');
const FS = 'https://firestore.googleapis.com/v1/projects/saf-checkin/databases/(default)/documents';

async function restDelete(token, p) {
  const r = await fetch(`${FS}/${p}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  return r.ok;
}
async function restList(token, p) {
  const r = await fetch(`${FS}/${p}?pageSize=300`, { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json();
  return (j.documents || []).map((d) => d.name.split('/documents/')[1]);
}

(async () => {
  if (!fs.existsSync(STATE)) { console.log('nothing to clean'); return; }
  const st = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  const app = initializeApp(webConfig());
  const auth = getAuth(app);
  const db = getFirestore(app);

  const bots = [...(st.probeBots || []), ...(st.redirectBot ? [st.redirectBot] : [])];
  for (const b of bots) {
    try {
      const cred = await signInWithEmailAndPassword(auth, `${b.callSign}@safcheckin.app`, b.pass);
      const uid = cred.user.uid;
      for (const sub of ['checkins', 'anything']) {
        const snap = await getDocs(collection(db, 'users', uid, sub));
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }
      await deleteDoc(doc(db, 'users', uid));
      await deleteUser(cred.user);
      console.log('deleted account', b.callSign, uid);
    } catch (e) { console.log('account cleanup failed', b.callSign, e.code || e.message); }
    await signOut(auth).catch(() => {});
  }

  const token = await L.oauthToken();
  const c = st.created || {};
  let n = 0;
  for (const id of c.stories || []) if (await restDelete(token, `stories/${id}`)) n++;
  for (const id of c.recognitions || []) if (await restDelete(token, `recognitions/${id}`)) n++;
  for (const w of c.polls || []) {
    for (const p of await restList(token, `polls/${w}/votes`)) if (await restDelete(token, p)) n++;
    await restDelete(token, `polls/${w}`);
  }
  for (const w of c.trends || []) if (await restDelete(token, `trends/${w}`)) n++;
  // belt and braces: any '[sec-test]' story/recognition left behind
  for (const col of ['stories', 'recognitions']) {
    const field = col === 'stories' ? 'title' : 'text';
    const rows = await L.fsQuery(token, col, field, 'GREATER_THAN_OR_EQUAL', { stringValue: '[sec-test]' });
    for (const row of rows) {
      const v = row[field] && row[field].stringValue;
      if (typeof v === 'string' && v.startsWith('[sec-test]') && (await restDelete(token, `${col}/${row.id}`))) n++;
    }
  }
  console.log(`deleted ${n} docs`);
  if (st.probeAnon) console.log('anonymous auth user left for auto-cleanup:', st.probeAnon);
  fs.unlinkSync(STATE);
  process.exit(0);
})().catch((e) => { console.error('CLEANUP FAILED', e); process.exit(1); });
