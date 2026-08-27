import { getApps, initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { firebaseConfig, recaptchaSiteKey } from './firebaseConfig';

/** True once a real Firebase project has been wired in (see firebaseConfig.ts). */
export const firebaseReady = firebaseConfig.apiKey.length > 0;

const app: FirebaseApp | null = firebaseReady
  ? (getApps()[0] ?? initializeApp(firebaseConfig))
  : null;

export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;

/* App Check (LUC-96/99) — every Firestore/Auth call carries a reCAPTCHA v3 token
 * proving it came from the real site in a real browser; the only anti-spam control
 * we have without a server. The site key is public; the *secret* key is pasted
 * only into the Firebase console (App Check → register web app → reCAPTCHA v3).
 * Local dev / Playwright: a debug token is minted per browser and printed to the
 * console — register it under App Check → Apps → Manage debug tokens. */
declare global {
  // eslint-disable-next-line no-var
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined;
}
if (app && recaptchaSiteKey && typeof window !== 'undefined') {
  const local = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  if (local || import.meta.env.DEV) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn('[app-check] not initialised', err);
  }
}
