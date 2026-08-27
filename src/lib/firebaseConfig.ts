/**
 * Firebase web config — public by design (security lives in Firestore rules +
 * Auth), so it is safe to commit. Project: saf-checkin (asia-southeast1).
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyAzhoTtfQB9PQgDM19W9k1U2V345eYvfng',
  authDomain: 'saf-checkin.firebaseapp.com',
  projectId: 'saf-checkin',
  storageBucket: 'saf-checkin.firebasestorage.app',
  messagingSenderId: '689226990521',
  appId: '1:689226990521:web:a7a3affff92adbe6cf2c68',
};

/** reCAPTCHA v3 site key for Firebase App Check (public by design — the secret
 *  key lives only in the Firebase console). Empty string = App Check off. */
export const recaptchaSiteKey = '6LeRr5stAAAAAKbLdfuD72-vwLCnG6eFqF6zSwXC';
