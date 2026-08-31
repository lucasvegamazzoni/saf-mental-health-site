# SAF Check-in — Auditor's Guide

**Package prepared:** 31 Aug 2026 · **System:** https://saf-checkin.web.app · **Repo:** github.com/lucasvegamazzoni/saf-mental-health-site (public)

This package contains the complete source code of the SAF Check-in wellbeing platform and the documentation needed to audit it end to end. Start here, then read `ARCHITECTURE.md` (how it works) and `SECURITY.md` (threat model, controls, known limitations).

## 1. Package integrity

`MANIFEST.sha256` at the package root lists a SHA-256 checksum for every file. Verify with:

```bash
shasum -a 256 -c MANIFEST.sha256
```

The package is produced by `git archive` from the public repository, so it can also be diffed against GitHub at the commit named in `COMMIT.txt` — nothing here is private or modified for the audit.

## 2. Scope: what this system is and is not

- A **voluntary, anonymous** wellbeing website for servicemen: weekly self check-in, moderated anonymous stories, self-help resources, verified helplines.
- Run by volunteers. **Not** a MINDEF/SAF system; holds **no classified information**; used on personal devices.
- Client-only architecture: there is **no application server**. The browser talks directly to Google Firebase (Auth + Firestore). All server-side enforcement lives in `firestore.rules` and Firebase platform controls.

## 3. How to build and run it

```bash
npm install          # Node 20+; package-lock.json is the dependency record
npm run build        # TypeScript compile + Vite build → dist/ (also copies 404.html)
npm run lint         # oxlint
npm run dev          # local dev server on :5173
```

The build is what CI deploys, byte-for-byte: see `.github/workflows/deploy.yml`.

## 4. Key files for review, in suggested order

| File | Why it matters |
|---|---|
| `firestore.rules` | **The security boundary.** Every read/write permission, field allowlist and size cap. ~140 lines, commented. |
| `src/lib/auth.ts` | Pseudonymous account model: username → slug email, no PII fields exist. |
| `src/lib/db.ts` | Every Firestore read/write the client performs, typed. |
| `src/lib/anonymise.ts` | Client-side redaction of names/ranks/units/places before story submission. |
| `src/lib/risk.ts` | Risk-flagging of story content for moderator prioritisation. |
| `src/lib/firebase.ts` + `firebaseConfig.ts` | Initialisation, App Check; explains which keys are public by design. |
| `firebase.json` | Hosting headers: CSP, X-Frame-Options, Permissions-Policy, cache rules. |
| `.github/workflows/deploy.yml` | Deploy pipeline: SHA-pinned actions, job-scoped permissions. |
| `public/sw.js` | Service worker; never intercepts Firebase/Google API traffic. |
| `verify/*.cjs` | Playwright end-to-end and rules-probe suite run against production. |

## 5. Verifying live claims independently (no credentials needed)

```bash
# Security headers, incl. enforced CSP:
curl -sI https://saf-checkin.web.app/ | grep -iE 'content-security|frame|referrer|permissions'
# robots + sitemap:
curl -s https://saf-checkin.web.app/robots.txt
# Firestore rules enforcement (expect PERMISSION_DENIED reading another's data):
#   see verify/e2e-*.cjs for the full probe suite (needs a throwaway account).
```

Claims requiring project access (data region `asia-southeast1`, App Check status, Auth configuration) can be demonstrated by the operators live in the Firebase console on request.

## 6. Contact

Operators: see the contact line in the site footer (`src/data/site.ts`). Security findings are welcome and will be acted on; there is no bug-bounty programme, but the 27 Aug 26 independent review's findings were all fixed same-day (see `SECURITY.md` §6).
