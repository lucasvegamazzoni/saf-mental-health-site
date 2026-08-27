/* Shared helpers for verify/e2e-*.cjs. Production Firebase: all accounts are
 * 'verify-bot-*' / 'verify-mod-*', all content is '[test]'-prefixed. */
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const B = process.env.E2E_BASE || 'http://localhost:5199';
const PASS = 'verify-pass-123';
const STATE = path.join(__dirname, 'e2e-state.json');

const readState = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {});
const writeState = (patch) => fs.writeFileSync(STATE, JSON.stringify({ ...readState(), ...patch }, null, 2));

async function goto(page, p) {
  await page.goto(B + p, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
}

async function launch(viewport = { width: 390, height: 844 }) {
  const browser = await chromium.launch();
  return { browser, ctx: await browser.newContext({ viewport }) };
}

function wire(page, tag = '') {
  page.on('pageerror', (e) => console.log('PAGEERROR', tag, e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('CONSOLE', tag, m.text().slice(0, 200));
  });
}

async function signUp(page, callSign, next = '/') {
  await page.goto(B + '/account?mode=create&next=' + encodeURIComponent(next), { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.fill('#account-callsign', callSign);
  await page.fill('#account-password', PASS);
  await page.locator('.account-primary').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/account'), { timeout: 25000 });
  await page.waitForTimeout(1500);
  return uidFromStorage(page);
}

async function signIn(page, callSign, next = '/') {
  await page.goto(B + '/account?mode=signin&next=' + encodeURIComponent(next), { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.fill('#account-callsign', callSign);
  await page.fill('#account-password', PASS);
  await page.locator('.account-primary').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/account'), { timeout: 25000 });
  await page.waitForTimeout(1500);
  return uidFromStorage(page);
}

async function uidFromStorage(page) {
  // Firebase Auth persists to localStorage (key 'firebase:authUser:*') or, in newer SDKs, IndexedDB 'firebaseLocalStorageDb'.
  return page.evaluate(async () => {
    const k = Object.keys(localStorage).find((k) => k.startsWith('firebase:authUser:'));
    if (k) return JSON.parse(localStorage.getItem(k)).uid;
    return new Promise((resolve) => {
      const req = indexedDB.open('firebaseLocalStorageDb');
      req.onerror = () => resolve(null);
      req.onsuccess = () => {
        try {
          const tx = req.result.transaction('firebaseLocalStorage', 'readonly');
          const all = tx.objectStore('firebaseLocalStorage').getAll();
          all.onsuccess = () => {
            const row = all.result.find((r) => String(r.fbase_key || '').startsWith('firebase:authUser:'));
            resolve(row && row.value ? row.value.uid : null);
          };
          all.onerror = () => resolve(null);
        } catch { resolve(null); }
      };
    });
  });
}

async function oauthToken() {
  const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/configstore/firebase-tools.json'), 'utf8'));
  const body = new URLSearchParams({
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
    refresh_token: cfg.tokens.refresh_token,
    grant_type: 'refresh_token',
  });
  const j = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body }).then((r) => r.json());
  if (!j.access_token) throw new Error('no oauth token: ' + JSON.stringify(j));
  return j.access_token;
}

const FS = 'https://firestore.googleapis.com/v1/projects/saf-checkin/databases/(default)/documents';
async function fsPatch(token, docPath, fields) {
  const r = await fetch(`${FS}/${docPath}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('firestore patch failed: ' + JSON.stringify(j));
  return j;
}
async function fsGet(token, docPath) {
  const r = await fetch(`${FS}/${docPath}`, { headers: { Authorization: `Bearer ${token}` } });
  return r.status === 404 ? null : r.json();
}
async function fsQuery(token, collection, field, op, value) {
  const r = await fetch(`${FS}:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: { fieldFilter: { field: { fieldPath: field }, op, value } },
      },
    }),
  });
  const rows = await r.json();
  return rows.filter((x) => x.document).map((x) => ({ id: x.document.name.split('/').pop(), ...x.document.fields }));
}

const rnd = () => Math.floor(Math.random() * 1e6);
const shot = (page, name) => page.screenshot({ path: path.join(__dirname, `final-${name}.png`), fullPage: true });

function check(label, ok, evidence = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${evidence ? '  — ' + evidence : ''}`);
  if (!ok) process.exitCode = 1;
  return ok;
}

module.exports = { goto, B, PASS, launch, wire, signUp, signIn, uidFromStorage, oauthToken, fsPatch, fsGet, fsQuery, rnd, shot, check, readState, writeState };
