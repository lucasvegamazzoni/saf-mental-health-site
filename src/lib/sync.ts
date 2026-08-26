/* ---------------------------------------------------------------------------
 * sync.ts — keeps the on-device check-in cache and the account copy in step.
 * Local storage stays the source the UI reads from; Firestore is the backup
 * that follows the call sign across devices. Doc id = dateISO, so pushing the
 * same entry twice is harmless.
 * ------------------------------------------------------------------------- */

import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getCheckins, replaceCheckins, saveCheckin } from './store';
import type { CheckinEntry } from './store';

function checkinsRef(uid: string) {
  if (!db) throw new Error('Firestore is not configured');
  return collection(db, 'users', uid, 'checkins');
}

/** Firestore doc ids can't contain '/', and ISO dates never do — used verbatim. */
const idFor = (entry: CheckinEntry) => entry.dateISO;

/** Uploads every local check-in that the account copy may be missing. */
export async function pushLocalCheckins(uid: string): Promise<void> {
  const local = getCheckins();
  await Promise.all(
    local.map((entry) => setDoc(doc(checkinsRef(uid), idFor(entry)), entry, { merge: true })),
  );
}

/** Downloads the account copy and merges it into the local cache. */
export async function pullRemoteCheckins(uid: string): Promise<void> {
  const snapshot = await getDocs(checkinsRef(uid));
  const remote: CheckinEntry[] = [];
  snapshot.forEach((d) => {
    const data = d.data() as Partial<CheckinEntry>;
    if (typeof data.dateISO === 'string' && Array.isArray(data.answers)) {
      remote.push({ dateISO: data.dateISO, answers: data.answers });
    }
  });
  const byDate = new Map<string, CheckinEntry>();
  for (const entry of [...getCheckins(), ...remote]) byDate.set(entry.dateISO, entry);
  replaceCheckins([...byDate.values()]);
}

/** Two-way sync run right after sign-in / sign-up. Errors are swallowed —
 *  the local copy is always intact, so a failed sync just retries next visit. */
export async function syncCheckins(uid: string): Promise<void> {
  try {
    await pushLocalCheckins(uid);
    await pullRemoteCheckins(uid);
  } catch (err) {
    console.warn('[sync] check-in sync failed; local copy kept', err);
  }
}

/** Saves a check-in locally and, when signed in, to the account too. */
export async function saveCheckinEverywhere(entry: CheckinEntry, uid: string | null): Promise<void> {
  saveCheckin(entry);
  if (!uid || !db) return;
  try {
    await setDoc(doc(checkinsRef(uid), idFor(entry)), entry, { merge: true });
  } catch (err) {
    console.warn('[sync] could not upload check-in; kept locally', err);
  }
}
