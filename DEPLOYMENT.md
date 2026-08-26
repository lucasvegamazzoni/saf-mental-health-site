# SAF Check-in — Deployment structure

```
                 push to main
                      │
              ┌───────▼────────┐
              │  GitHub Actions │  .github/workflows/deploy.yml
              │   job: check    │  npm ci · oxlint · build
              └──┬──────────┬───┘
                 │          │
   ┌─────────────▼──┐   ┌───▼──────────────────────┐
   │ Firebase Hosting│   │ GitHub Pages (mirror)     │
   │ saf-checkin.    │   │ lucasvegamazzoni.github.io│
   │ web.app         │   │ /saf-mental-health-site/  │
   │ SITE_BASE=/     │   │ SITE_BASE=/saf-mental-…/  │
   │ SPA rewrites →  │   │ 404.html trick →          │
   │ deep links 200  │   │ deep links render, 404 st.│
   └────────┬────────┘   └───────────────────────────┘
            │
   ┌────────▼────────────────────────────────┐
   │ Firebase project `saf-checkin`          │
   │  Auth (email/password ← call sign slug) │
   │  Firestore asia-southeast1              │
   │  firestore.rules (deployed by CI + CLI) │
   └─────────────────────────────────────────┘
```

## URLs
- **Canonical / share this:** https://saf-checkin.web.app (also `saf-checkin.firebaseapp.com`)
- Mirror (kept for old links + the first QR prints): https://lucasvegamazzoni.github.io/saf-mental-health-site/
- Repo: https://github.com/lucasvegamazzoni/saf-mental-health-site
- Firebase console: https://console.firebase.google.com/project/saf-checkin

## Environments
| | Where | Base path | Backend |
|---|---|---|---|
| Local dev | `npm run dev` → http://localhost:5173 | `/` | **production Firebase** (no emulator yet) |
| Canonical | Firebase Hosting `live` channel | `/` | production |
| Mirror | GitHub Pages | `/saf-mental-health-site/` | production |

`SITE_BASE` (build-time env) sets Vite's `base`; it defaults to the Pages subpath so a plain `npm run build` still works for Pages, and CI passes `/` for Firebase.

## Secrets
- `FIREBASE_SERVICE_ACCOUNT_SAF_CHECKIN` (GitHub repo secret) — service account `github-deploy@saf-checkin.iam.gserviceaccount.com` with `firebasehosting.admin`, `run.viewer`, `serviceusage.apiKeysViewer`, `firebaseauth.viewer`. Rotate from the Google Cloud console → IAM → Service accounts → keys.
- The Firebase **web** config in `src/lib/firebaseConfig.ts` is public by design (not a secret).

## Manual operations (need `npx firebase login` once)
```bash
npx firebase deploy --only firestore:rules      # rules only
npx firebase deploy --only hosting              # ad-hoc hosting deploy from a local build
npx firebase hosting:channel:deploy preview-x   # temporary preview URL
```

## Data model (Firestore)
```
users/{uid}                     { callSign, marker, createdAt }
users/{uid}/checkins/{dateISO}  { dateISO, answers[] }
stories/{id}                    { status: pending|published|rejected, theme, title, preview, body[], lessons[], hopeScore, readMins, authorUid, flags[], createdAt }
polls/{weekId}                  { question, options[] }  · votes/{uid}  { option }
recognitions/{id}               { text, status, createdAt }
trends/{weekId}                 { counts: { reason: n }, n }   ← anonymous aggregates only
moderators/{uid}                { }                            ← allowlist read by rules
```
Rules: owner-only on `users/**`; `stories`/`recognitions` create-by-signed-in with `status: pending`, public read only when `published`, update/delete only by moderators; `polls/*/votes/{uid}` owner-only; `trends` increments allowed for signed-in users, no reads of per-user data.

## Verification
- `verify/e2e-signup.cjs` — signed-out check-in → sign-up → sync → new device
- `verify/shoot*.cjs` — route screenshots (desktop + mobile), QR decode test
- CI `check` job = build + lint gate before either deploy
