# Architecture

## 1. System overview

SAF Check-in is a single-page web application (SPA). There is **no application server**: the browser loads static files from Firebase Hosting and communicates directly with two Google Firebase services — Authentication (sign-in) and Cloud Firestore (database, region `asia-southeast1`, Singapore). All authorisation is enforced by Firestore Security Rules executing on Google's servers; the client is treated as untrusted.

```
Browser (React SPA, untrusted)
   │  HTTPS/TLS
   ├── Firebase Hosting        static files, security headers (firebase.json)
   ├── Firebase Auth           email/password provider; usernames slugged to
   │                           <slug>@safcheckin.app (no mail is ever sent)
   ├── Cloud Firestore         all data; every op checked by firestore.rules
   └── Firebase App Check      reCAPTCHA v3 attestation on Firestore/Auth calls
```

## 2. Stack

React 19 + TypeScript, Vite, react-router 7. GSAP/Lenis (hero animation), Three.js (QR tree, story sphere). Firebase JS SDK v12. Playwright for testing. Full dependency record: `package.json` / `package-lock.json`.

## 3. Repository map

```
index.html                 entry; meta/SEO; loads src/main.tsx
src/
  App.tsx                  routes: / /check-in /stories /resources[/:topic]
                           /me /account /moderate /trends /privacy + 404
  components/              Hero, QrTree, StorySphere, Spinner, CloudFace,
                           Layout (nav/footer/emergency card), moderation/
  pages/                   one file per route
  lib/
    firebase.ts            SDK init + App Check
    firebaseConfig.ts      public web config (see SECURITY.md §5)
    auth.ts                account model, sign-up/in/out, deleteMySpace
    db.ts                  every Firestore operation, typed
    sync.ts                local↔cloud check-in merge (doc id = date, idempotent)
    anonymise.ts           client-side PII redaction for stories
    risk.ts                risk-flag extraction for moderation queue
    callsign-filter.ts     username slur/profanity filter
    store.ts               localStorage layer (nal.* keys) + clearDevice
    flags.ts               feature flags (v1 ships "Must" set only)
    pwa.ts                 service-worker registration + install prompt
  data/                    check-in questions, stories, resources, verified
                           helplines (with verifiedOn dates), poll/challenge banks
firestore.rules            the authorisation boundary (see SECURITY.md §3)
firebase.json              hosting config: SPA rewrite, headers, caching
public/sw.js               hand-written service worker (offline shell)
.github/workflows/deploy.yml  CI: build → deploy Hosting + rules; Pages mirror
verify/                    Playwright e2e + audit scripts (run against production
                           with verify-bot-* accounts and [test]-prefixed data)
```

## 4. Data model (Firestore)

| Collection | Document | Contains | Notes |
|---|---|---|---|
| `users/{uid}` | profile | `callSign`, `marker` (emoji), `createdAt` | No PII fields exist |
| `users/{uid}/checkins/{dateISO}` | one check-in | emoji scores + follow-up reason keys | Owner-only by rules |
| `stories/{id}` | a story | status, theme, title, preview, body, lessons, flags, createdAt | **No author field of any kind** |
| `recognitions/{id}` | appreciation note | text, status, flags, createdAt | Feature flag off in v1 |
| `polls/{week}/votes/{uid}` | one vote | option, timestamp | Votes not listable by clients |
| `trends/{week}` | anonymous counters | `n`, reason counts, overall tallies | +1 increments only; no per-user data |
| `moderators/{uid}` | allowlist marker | — | Written only via Google console/REST, never by clients |

## 5. Key flows

**Check-in.** Answers save to `localStorage` (`nal.*`). Signed-in users also get a cloud copy (`users/{uid}/checkins`, doc id = date, so re-sync is idempotent). Signed-out check-ins sync up on first sign-in. No account is ever required to check in.

**Story submission.** Text → `anonymise.ts` strips names/ranks/units/places/dates → author reviews the cleaned version → `risk.ts` computes moderation flags → written as `status: "pending"` (the only status rules allow a client to create). A signed-out author gets a throwaway anonymous Auth session; **no author identifier is stored on the document either way**. Moderators approve/reject in `/moderate`; only `status: "published"` documents are publicly readable.

**Accounts.** Username + password only. Firebase Auth requires an email-shaped identifier, so the username is slugged to `<slug>@safcheckin.app`; no mail is ever sent, and there is deliberately no password reset. `deleteMySpace` re-authenticates, deletes all check-ins (batched), the profile, and the Auth user, then wipes the device.

**Deployment.** Push to `main` → GitHub Actions builds and deploys Hosting + Firestore rules with a scoped service account. A GitHub Pages mirror is built with `SITE_BASE` and carries `noindex`.

## 6. Honest-labelling note

The "anonymiser" is deterministic client-side code and the (flag-disabled) companion is rule-based — both are labelled as such in the UI. Nothing is presented to users as AI. There are no Cloud Functions and no third-party analytics or trackers anywhere in the codebase.
