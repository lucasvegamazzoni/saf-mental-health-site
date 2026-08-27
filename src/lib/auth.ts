/* ---------------------------------------------------------------------------
 * auth.ts — pseudonymous accounts: a username + password, never a name,
 * email, rank or unit. Firebase Auth needs an email-shaped identifier, so the
 * username is slugged into `<slug>@safcheckin.app`; nothing is ever sent to it.
 * ------------------------------------------------------------------------- */

import { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { clearDevice } from './store';
import { auth, db, firebaseReady } from './firebase';
import { checkCallSign } from './callsign-filter';
import { syncCheckins } from './sync';

export { firebaseReady };

export interface Session {
  uid: string;
  callSign: string;
  marker: string;
  sinceISO: string;
}

export type SessionState =
  | { status: 'loading' }
  | { status: 'out' }
  | { status: 'in'; session: Session };

export const CALL_SIGN_MIN = 3;
export const CALL_SIGN_MAX = 20;
export const PASSWORD_MIN = 6;
export const DEFAULT_MARKER = '🌱';

const EMAIL_DOMAIN = 'safcheckin.app';

/** Lower-cased, [a-z0-9-] only — the stable identity behind a username. */
export function callSignSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const toEmail = (slug: string) => `${slug}@${EMAIL_DOMAIN}`;

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const FRIENDLY: Record<string, string> = {
  'auth/email-already-in-use': 'That username is already taken — try another.',
  'auth/invalid-credential': "Username and password don't match.",
  'auth/user-not-found': "Username and password don't match.",
  'auth/wrong-password': "Username and password don't match.",
  'auth/weak-password': `Password needs at least ${PASSWORD_MIN} characters.`,
  'auth/too-many-requests': 'Too many tries — give it a minute and try again.',
  'auth/network-request-failed': 'No connection right now. Your check-ins are safe on this device.',
  'backend/missing': 'Accounts are being switched on — check back soon.',
};

function friendly(err: unknown): AuthError {
  if (err instanceof AuthError) return err;
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : 'unknown';
  return new AuthError(code, FRIENDLY[code] ?? 'Something went wrong — please try again.');
}

function validate(callSign: string, password: string): string {
  const slug = callSignSlug(callSign);
  if (slug.length < CALL_SIGN_MIN) {
    throw new AuthError('form/call-sign', `Username needs at least ${CALL_SIGN_MIN} letters or numbers.`);
  }
  if (callSign.trim().length > CALL_SIGN_MAX) {
    throw new AuthError('form/call-sign', `Username can be at most ${CALL_SIGN_MAX} characters.`);
  }
  const verdict = checkCallSign(callSign);
  if (!verdict.ok) {
    throw new AuthError('form/call-sign', verdict.reason ?? 'That username is not allowed here.');
  }
  if (password.length < PASSWORD_MIN) {
    throw new AuthError('form/password', `Password needs at least ${PASSWORD_MIN} characters.`);
  }
  return slug;
}

function requireBackend() {
  if (!auth || !db) throw new AuthError('backend/missing', FRIENDLY['backend/missing']);
  return { auth, db };
}

/* Session store ---------------------------------------------------------------- */

let state: SessionState = firebaseReady ? { status: 'loading' } : { status: 'out' };
const listeners = new Set<(s: SessionState) => void>();
let started = false;

function setState(next: SessionState) {
  state = next;
  listeners.forEach((l) => l(state));
}

async function sessionFor(user: User): Promise<Session> {
  const fallback: Session = {
    uid: user.uid,
    callSign: user.displayName ?? 'Serviceman',
    marker: DEFAULT_MARKER,
    sinceISO: user.metadata.creationTime
      ? new Date(user.metadata.creationTime).toISOString()
      : new Date().toISOString(),
  };
  if (!db) return fallback;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    const data = snap.data() as Partial<Session> & { createdAt?: string } | undefined;
    return {
      uid: user.uid,
      callSign: typeof data?.callSign === 'string' ? data.callSign : fallback.callSign,
      marker: typeof data?.marker === 'string' ? data.marker : fallback.marker,
      sinceISO: typeof data?.createdAt === 'string' ? data.createdAt : fallback.sinceISO,
    };
  } catch {
    return fallback;
  }
}

function start() {
  if (started || !auth) return;
  started = true;
  onAuthStateChanged(auth, async (user) => {
    if (!user || user.isAnonymous) {
      // Anonymous sessions exist only to let someone share a story without a username;
      // they are never shown as "signed in" and never sync personal data.
      setState({ status: 'out' });
      return;
    }
    const session = await sessionFor(user);
    setState({ status: 'in', session });
    void syncCheckins(user.uid);
  });
}

/** React hook: the current account state, live. */
export function useSession(): SessionState {
  const [current, setCurrent] = useState<SessionState>(state);
  useEffect(() => {
    start();
    listeners.add(setCurrent);
    setCurrent(state);
    return () => {
      listeners.delete(setCurrent);
    };
  }, []);
  return current;
}

/** Current uid without subscribing (for one-off saves). */
export function currentUid(): string | null {
  return state.status === 'in' ? state.session.uid : null;
}

/* Actions ---------------------------------------------------------------------- */

export async function signUp(callSign: string, marker: string, password: string): Promise<void> {
  const { auth: a, db: d } = requireBackend();
  const slug = validate(callSign, password);
  try {
    const cred = await createUserWithEmailAndPassword(a, toEmail(slug), password);
    await updateProfile(cred.user, { displayName: callSign.trim() });
    await setDoc(doc(d, 'users', cred.user.uid), {
      callSign: callSign.trim(),
      marker,
      createdAt: new Date().toISOString(),
    });
    // The auth listener may have fired before the profile doc existed — refresh it.
    setState({ status: 'in', session: await sessionFor(cred.user) });
  } catch (err) {
    throw friendly(err);
  }
}

export async function signIn(callSign: string, password: string): Promise<void> {
  const { auth: a } = requireBackend();
  const slug = validate(callSign, password);
  try {
    await signInWithEmailAndPassword(a, toEmail(slug), password);
  } catch (err) {
    throw friendly(err);
  }
}

export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

/**
 * Returns a uid usable for account-less actions (sharing a story without a call
 * sign). Reuses the current user if one exists; otherwise signs in anonymously.
 * Anonymous users are never treated as "signed in" by useSession().
 */
export async function ensureAnonymousUid(): Promise<string> {
  const { auth: a } = requireBackend();
  if (a.currentUser) return a.currentUser.uid;
  try {
    const cred = await signInAnonymously(a);
    return cred.user.uid;
  } catch (err) {
    throw friendly(err);
  }
}

/**
 * "Delete my space" (LUC-97): removes the account copy of every check-in, the
 * users/{uid} profile and the Auth user itself, then wipes this device's cache.
 * Firebase requires a recent sign-in for deletion, so the password is re-checked
 * first. Published stories are untouched — they never carried an author id.
 */
export async function deleteMySpace(password: string): Promise<void> {
  const { auth: a, db: d } = requireBackend();
  const user = a.currentUser;
  if (!user || user.isAnonymous || !user.email) throw new AuthError('no-user', 'You are not signed in.');
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    const snap = await getDocs(collection(d, 'users', user.uid, 'checkins'));
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(d);
      docs.slice(i, i + 400).forEach((c) => batch.delete(c.ref));
      await batch.commit();
    }
    await deleteDoc(doc(d, 'users', user.uid));
    await deleteUser(user);
    clearDevice();
  } catch (err) {
    throw friendly(err);
  }
}
