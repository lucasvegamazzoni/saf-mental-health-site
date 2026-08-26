/**
 * Firebase web config — public by design (security lives in Firestore rules +
 * Auth), so it is safe to commit. Filled in when the project is provisioned;
 * while `apiKey` is empty the app runs fully on-device and sign-in is disabled.
 */
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};
