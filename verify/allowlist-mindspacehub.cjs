// One-off (2026-10-04): add mindspacehub.web.app + mindspacehub.firebaseapp.com to Firebase Auth authorized
// domains and the browser API key referrer allowlist. Run from the repo root:
//   node verify/allowlist-mindspacehub.cjs
// Uses the Firebase CLI refresh token (same as e2e-lib.oauthToken). Idempotent — re-running adds nothing twice.
const { oauthToken } = require('./e2e-lib.cjs');
const NEW_DOMAINS = ['mindspacehub.web.app', 'mindspacehub.firebaseapp.com'];
const KEY_NAME = 'projects/689226990521/locations/global/keys/a9bf622b-fe88-4479-aabb-16ec9dde89b4'; // "Browser key (auto created by Firebase)"
(async () => {
  const tok = await oauthToken();
  const h = { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' };
  // 1. Firebase Auth authorized domains
  const cfgUrl = 'https://identitytoolkit.googleapis.com/admin/v2/projects/saf-checkin/config';
  const cfg = await (await fetch(cfgUrl, { headers: h })).json();
  const domains = [...new Set([...(cfg.authorizedDomains || []), ...NEW_DOMAINS])];
  const r1 = await fetch(`${cfgUrl}?updateMask=authorizedDomains`, { method: 'PATCH', headers: h, body: JSON.stringify({ authorizedDomains: domains }) });
  const j1 = await r1.json();
  console.log('AUTH', r1.status, JSON.stringify(j1.authorizedDomains || j1));
  // 2. Browser API key HTTP referrers
  const key = await (await fetch(`https://apikeys.googleapis.com/v2/${KEY_NAME}`, { headers: h })).json();
  const refs = [...new Set([...(key.restrictions.browserKeyRestrictions.allowedReferrers || []), ...NEW_DOMAINS.map((d) => `https://${d}/*`)])];
  const restrictions = { ...key.restrictions, browserKeyRestrictions: { allowedReferrers: refs } };
  const r2 = await fetch(`https://apikeys.googleapis.com/v2/${KEY_NAME}?updateMask=restrictions`, { method: 'PATCH', headers: h, body: JSON.stringify({ restrictions }) });
  let op = await r2.json();
  console.log('KEY', r2.status, op.name || JSON.stringify(op).slice(0, 300));
  for (let i = 0; i < 10 && op.name && !op.done; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    op = await (await fetch(`https://apikeys.googleapis.com/v2/${op.name}`, { headers: h })).json();
  }
  console.log('KEY referrers now:', JSON.stringify(op.response?.restrictions?.browserKeyRestrictions?.allowedReferrers || op.error || op));
})().catch((e) => { console.error('ERR', e); process.exit(1); });
