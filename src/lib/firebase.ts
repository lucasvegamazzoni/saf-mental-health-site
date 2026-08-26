import { getApps, initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

/** True once a real Firebase project has been wired in (see firebaseConfig.ts). */
export const firebaseReady = firebaseConfig.apiKey.length > 0;

const app: FirebaseApp | null = firebaseReady
  ? (getApps()[0] ?? initializeApp(firebaseConfig))
  : null;

export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;
