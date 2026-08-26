/* ---------------------------------------------------------------------------
 * db.ts — typed Firestore helpers for the shared collections (see
 * DEPLOYMENT.md → Data model). Every function throws a plain Error when the
 * backend is not wired (firebaseReady === false) so callers can show an honest
 * "not available yet" state instead of a fake success.
 *
 *   stories/{id}                 StoryDoc      (moderated)
 *   recognitions/{id}            RecognitionDoc (moderated)
 *   polls/{weekId}/votes/{uid}   { option, at }
 *   trends/{weekId}              { n, reasons{}, overall{} }  ← anonymous aggregates only
 *   moderators/{uid}             {}                            ← allowlist
 * ------------------------------------------------------------------------- */

import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  increment,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { DocumentData, Firestore, QueryDocumentSnapshot } from 'firebase/firestore';
import { db, firebaseReady } from './firebase';
import { useSession } from './auth';

export { firebaseReady };

const NOT_READY = 'The shared space is not switched on yet — nothing was sent.';

function requireDb(): Firestore {
  if (!db) throw new Error(NOT_READY);
  return db;
}

const nowISO = () => new Date().toISOString();

/* Stories ---------------------------------------------------------------- */

export type StoryStatus = 'pending' | 'published' | 'rejected';

export interface StoryDoc {
  id: string;
  status: StoryStatus;
  /** Matches a STORY_THEMES label. */
  theme: string;
  title: string;
  preview: string;
  body: string[];
  lessons: string[];
  hopeScore: 1 | 2 | 3 | 4 | 5;
  readMins: number;
  /** Never rendered on public surfaces. */
  authorUid: string;
  /** Auto-moderation flags (e.g. 'possible-name', 'crisis-language'). Empty = clean. */
  flags: string[];
  createdAt: string;
  reviewedAt?: string;
}

const asArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

function toStory(snap: QueryDocumentSnapshot<DocumentData>): StoryDoc {
  const d = snap.data();
  const hope = Number(d.hopeScore);
  return {
    id: snap.id,
    status: (d.status as StoryStatus) ?? 'pending',
    theme: String(d.theme ?? ''),
    title: String(d.title ?? ''),
    preview: String(d.preview ?? ''),
    body: asArray(d.body),
    lessons: asArray(d.lessons),
    hopeScore: (hope >= 1 && hope <= 5 ? hope : 3) as StoryDoc['hopeScore'],
    readMins: Number(d.readMins ?? 1),
    authorUid: String(d.authorUid ?? ''),
    flags: asArray(d.flags),
    createdAt: String(d.createdAt ?? ''),
    ...(typeof d.reviewedAt === 'string' ? { reviewedAt: d.reviewedAt } : {}),
  };
}

/** Writes a story with status 'pending'. Resolves to the new document id. */
export async function submitStory(
  input: Omit<StoryDoc, 'id' | 'status' | 'createdAt' | 'reviewedAt'>,
): Promise<string> {
  const ref = await addDoc(collection(requireDb(), 'stories'), {
    ...input,
    status: 'pending',
    createdAt: nowISO(),
  });
  return ref.id;
}

/** Published stories, newest first. */
export async function listPublishedStories(): Promise<StoryDoc[]> {
  const snap = await getDocs(
    query(collection(requireDb(), 'stories'), where('status', '==', 'published')),
  );
  return snap.docs.map(toStory).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Pending stories for the moderation queue: flagged first, then oldest first. */
export async function listPendingStories(): Promise<StoryDoc[]> {
  const snap = await getDocs(
    query(collection(requireDb(), 'stories'), where('status', '==', 'pending')),
  );
  return snap.docs.map(toStory).sort((a, b) => {
    const fa = a.flags.length > 0 ? 0 : 1;
    const fb = b.flags.length > 0 ? 0 : 1;
    return fa - fb || a.createdAt.localeCompare(b.createdAt);
  });
}

export async function setStoryStatus(id: string, status: StoryStatus): Promise<void> {
  await updateDoc(doc(requireDb(), 'stories', id), { status, reviewedAt: nowISO() });
}

/* Recognitions ------------------------------------------------------------ */

export interface RecognitionDoc {
  id: string;
  text: string;
  status: StoryStatus;
  /** Never rendered on public surfaces. */
  authorUid: string;
  createdAt: string;
}

function toRecognition(snap: QueryDocumentSnapshot<DocumentData>): RecognitionDoc {
  const d = snap.data();
  return {
    id: snap.id,
    text: String(d.text ?? ''),
    status: (d.status as StoryStatus) ?? 'pending',
    authorUid: String(d.authorUid ?? ''),
    createdAt: String(d.createdAt ?? ''),
  };
}

/** Writes a recognition with status 'pending'. Resolves to the new document id. */
export async function submitRecognition(text: string, authorUid: string): Promise<string> {
  const ref = await addDoc(collection(requireDb(), 'recognitions'), {
    text,
    authorUid,
    status: 'pending',
    flags: [],
    createdAt: nowISO(),
  });
  return ref.id;
}

/** Published recognitions, newest first. */
export async function listPublishedRecognitions(): Promise<RecognitionDoc[]> {
  const snap = await getDocs(
    query(collection(requireDb(), 'recognitions'), where('status', '==', 'published')),
  );
  return snap.docs.map(toRecognition).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Pending recognitions, oldest first. */
export async function listPendingRecognitions(): Promise<RecognitionDoc[]> {
  const snap = await getDocs(
    query(collection(requireDb(), 'recognitions'), where('status', '==', 'pending')),
  );
  return snap.docs.map(toRecognition).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function setRecognitionStatus(id: string, status: StoryStatus): Promise<void> {
  await updateDoc(doc(requireDb(), 'recognitions', id), { status, reviewedAt: nowISO() });
}

/* Polls ------------------------------------------------------------------- */

/** polls/{weekId}/votes/{uid} = { option, at }. Re-voting overwrites. */
export async function votePoll(weekId: string, uid: string, option: string): Promise<void> {
  await setDoc(doc(requireDb(), 'polls', weekId, 'votes', uid), { option, at: nowISO() });
}

export async function myPollVote(weekId: string, uid: string): Promise<string | null> {
  const snap = await getDoc(doc(requireDb(), 'polls', weekId, 'votes', uid));
  const option = snap.data()?.option;
  return typeof option === 'string' ? option : null;
}

/** Vote counts per option via getCountFromServer (no per-user data is read). */
export async function pollCounts(
  weekId: string,
  options: string[],
): Promise<Record<string, number>> {
  const votes = collection(requireDb(), 'polls', weekId, 'votes');
  const counts = await Promise.all(
    options.map(async (option) => {
      const agg = await getCountFromServer(query(votes, where('option', '==', option)));
      return [option, agg.data().count] as const;
    }),
  );
  return Object.fromEntries(counts);
}

/* Trends (anonymous aggregates) ------------------------------------------- */

const OVERALL_KEYS = ['0', '1', '2'] as const;

/**
 * trends/{weekId}: n +1, reasons[r] +1, overall[overall] +1.
 * Fire-and-forget after a local check-in. Carries NO uid, ever.
 */
export async function recordTrend(
  weekId: string,
  reasons: string[],
  overall: 0 | 1 | 2,
): Promise<void> {
  const patch: Record<string, unknown> = {
    n: increment(1),
    overall: { [String(overall)]: increment(1) },
  };
  if (reasons.length > 0) {
    patch.reasons = Object.fromEntries(reasons.map((r) => [r, increment(1)]));
  }
  await setDoc(doc(requireDb(), 'trends', weekId), patch, { merge: true });
}

export async function getTrend(
  weekId: string,
): Promise<{ n: number; reasons: Record<string, number>; overall: [number, number, number] } | null> {
  const snap = await getDoc(doc(requireDb(), 'trends', weekId));
  if (!snap.exists()) return null;
  const d = snap.data();
  const reasonsRaw = (d.reasons ?? {}) as Record<string, unknown>;
  const reasons: Record<string, number> = {};
  for (const [k, v] of Object.entries(reasonsRaw)) if (typeof v === 'number') reasons[k] = v;
  const overallRaw = (d.overall ?? {}) as Record<string, unknown>;
  const overall = OVERALL_KEYS.map((k) =>
    typeof overallRaw[k] === 'number' ? (overallRaw[k] as number) : 0,
  ) as [number, number, number];
  return { n: typeof d.n === 'number' ? d.n : 0, reasons, overall };
}

/* Moderators -------------------------------------------------------------- */

const moderatorCache = new Map<string, Promise<boolean>>();

/** True iff moderators/{uid} exists. Cached per uid for the page lifetime. */
export function isModerator(uid: string): Promise<boolean> {
  if (!db) return Promise.resolve(false);
  let cached = moderatorCache.get(uid);
  if (!cached) {
    cached = getDoc(doc(db, 'moderators', uid))
      .then((snap) => snap.exists())
      .catch(() => false);
    moderatorCache.set(uid, cached);
  }
  return cached;
}

/** React hook: true iff signed in AND moderators/{uid} exists. False while resolving. */
export function useIsModerator(): boolean {
  const session = useSession();
  const uid = session.status === 'in' ? session.session.uid : null;
  const [mod, setMod] = useState(false);
  useEffect(() => {
    let live = true;
    if (!uid) {
      setMod(false);
      return;
    }
    void isModerator(uid).then((ok) => {
      if (live) setMod(ok);
    });
    return () => {
      live = false;
    };
  }, [uid]);
  return uid ? mod : false;
}
