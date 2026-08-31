# Security Dossier

Prepared 31 Aug 2026. Statements below are verifiable in this codebase or against the live system; where a control is pending, that is stated rather than glossed.

## 1. Design principle: data minimisation

The system's primary safeguard is that it **cannot identify its users**. No field exists, in any form or collection, for name, NRIC, email, phone, rank, unit, vocation, location or photograph. Accounts are an invented username + password. Published stories carry no author identifier. In the worst-case scenario of a complete database disclosure, the exposed data is wellbeing notes keyed to pseudonyms — there is no join back to a real person, because the joining data was never collected.

## 2. Threat model

| Threat | Mitigation | Where |
|---|---|---|
| Reading another user's check-ins | Owner-only rules on `users/{uid}/**`; anonymous sessions barred from personal data entirely | `firestore.rules` |
| De-anonymising a story author | No author field stored; client-side PII redaction + author review + human moderation before publication | rules `validStory`, `src/lib/anonymise.ts` |
| Malicious/forged writes (oversized, extra fields, forged status) | Server-side field allowlists, size caps, and `status == "pending"` on create for stories/recognitions | `firestore.rules` |
| Self-appointed moderators | `moderators/{uid}` written only via Google console/REST; client writes rejected (`allow write: if false`) | `firestore.rules` |
| Vote surveillance / enumeration | Voters read only their own vote doc; `list` denied to non-moderators | `firestore.rules` |
| Trend abuse (fake aggregates) | `trends` updates constrained to `n == n+1` increments with allow-listed reason keys | `firestore.rules` |
| Automated abuse / quota exhaustion | Firebase App Check (reCAPTCHA v3) attestation on Firestore + Auth. **Status 31 Aug 26: deployed, monitoring mode, not yet enforced** — enforcement is the stated precondition for wide promotion | `src/lib/firebase.ts` |
| Cross-site scripting / injection | React's output encoding; **enforced** Content-Security-Policy (`default-src 'self'`, no inline scripts, allowlisted connect targets); zero CSP violations in report-only trial across all routes | `firebase.json` |
| Clickjacking / impersonation-by-embedding | `X-Frame-Options: DENY` + `frame-ancestors 'none'` | `firebase.json` |
| Open-redirect via `?next=` | Return path sanitised to same-origin relative paths only | `src/pages/Account.tsx` |
| Supply-chain tampering in CI | GitHub Actions pinned to commit SHAs; job-scoped minimal permissions; deploys via a dedicated scoped service account | `.github/workflows/deploy.yml` |
| Interception in transit | TLS everywhere (Hosting + Firebase APIs); HTTP not served | platform |
| Stale service worker masking fixes | `sw.js` served `Cache-Control: no-cache`; versioned caches; Firebase/Google hosts never intercepted | `firebase.json`, `public/sw.js` |
| Shared-device exposure in camp | "Clear this device" wipes all local data; sign-out keeps nothing sensitive readable | `src/lib/store.ts` |
| Abusive usernames | Slur/profanity filter at sign-up | `src/lib/callsign-filter.ts` |

## 3. Firestore rules walkthrough (`firestore.rules`)

- **Helpers:** `signedIn()`, `notAnon()` (anonymous sessions may *only* submit stories), `isModerator()` (existence check on `moderators/{uid}`).
- **`users/{uid}/**`:** read/write only when `request.auth.uid == uid` and the session is non-anonymous. Moderators have **no** access to user trees.
- **`stories`:** public read only when `status == "published"` (moderators may read all). Create requires the full field allowlist, theme from a fixed list, length caps (title 80, preview 240, body ≤40 paragraphs ≤4000 chars each), `status == "pending"`. Update/delete: moderators only.
- **`recognitions`:** as stories, plus non-anonymous author required; 120-char cap.
- **`polls/{week}/votes/{uid}`:** create/update own doc only; `get` own; `list` moderators only.
- **`trends/{week}`:** create with `n == 1`; update only if `n == previous + 1`; keys restricted. No user identifiers in the document at all.
- **`moderators/{uid}`:** self-read only; **no client writes under any condition**.

## 4. What operators can and cannot see

Moderators see pending story text (already redacted) — never a username. No everyday interface exposes check-ins to anyone but their owner. The project owner, as with any database administrator on any platform, can technically read stored documents via the Google console — which is precisely why no identifying fields exist to read (§1). This is stated plainly rather than hidden.

## 5. Keys in the repository — deliberate, not leaked

| Value | Public by design because |
|---|---|
| Firebase web config incl. `apiKey` (`src/lib/firebaseConfig.ts`) | It only *identifies* the project; authorisation is rules + Auth. Key is HTTP-referrer-restricted. Google documents this as safe to ship. |
| reCAPTCHA v3 **site** key | The paired **secret** key lives only in the Firebase console. |

No service-account keys, tokens or secrets exist in the repository; CI secrets live in GitHub encrypted secrets.

## 6. Independent review, 27 Aug 26

A read-only review against the production system covered the common failure modes of rapidly built sites (permissive rules, author-ID leakage, missing CSP, unbounded writes, unpinned CI, open redirects). All findings were fixed and re-verified the same day; a 44-point rules probe passes. The e2e suite (`verify/e2e-*.cjs`) runs against production using `verify-bot-*` accounts and `[test]`-prefixed data, with a cleanup step.

## 7. Known limitations and residual risk

1. **App Check not yet enforced** (monitoring mode) — until enforced, a scripted client could submit well-formed pending stories at rate; they never publish, but could consume free-tier write quota.
2. **No server** means no server-side rate limiting beyond App Check and no server-side content analysis; moderation is human.
3. **Volunteer-operated**, no formal accreditation, best-effort availability on Firebase's free tier.
4. **No password recovery** (deliberate consequence of holding no contact data); a forgotten password orphans that space.
5. **Auth credentials** (username-slug + password hash) are managed by Firebase Authentication, a global Google service — not region-pinned to Singapore as the Firestore data is.
6. A formal penetration test has not been commissioned; the operators would welcome one before any official adoption.
