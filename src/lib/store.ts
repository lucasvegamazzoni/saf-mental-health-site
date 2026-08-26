/* ---------------------------------------------------------------------------
 * store.ts — typed localStorage helpers. All keys are namespaced 'nal.'.
 * Everything stays on this device; parsing is defensive (corrupt → empty).
 * ------------------------------------------------------------------------- */

import type { CheckinScore } from '../data/content';

const NS = 'nal.';

const KEYS = {
  checkins: 'checkins',
  challenges: 'challenges',
  pollVote: 'pollVote',
  recognitions: 'recognitions',
} as const;

/* Types --------------------------------------------------------------------- */

export interface CheckinAnswer {
  qid: string;
  score: CheckinScore;
  followUps: string[];
}

export interface CheckinEntry {
  dateISO: string;
  answers: CheckinAnswer[];
}

/* Internals ------------------------------------------------------------------ */

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — fail quietly; this is a demo, nothing critical.
  }
}

function readArray<T>(key: string, isValid: (item: unknown) => item is T): T[] {
  const parsed = read<unknown>(key, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isValid);
}

function isCheckinEntry(item: unknown): item is CheckinEntry {
  if (typeof item !== 'object' || item === null) return false;
  const entry = item as Record<string, unknown>;
  return typeof entry.dateISO === 'string' && Array.isArray(entry.answers);
}

function isString(item: unknown): item is string {
  return typeof item === 'string';
}

/* Check-ins ------------------------------------------------------------------ */

/** All saved check-ins, oldest first. Corrupt or missing data → []. */
export function getCheckins(): CheckinEntry[] {
  return readArray(KEYS.checkins, isCheckinEntry);
}

/** Appends a check-in and returns the updated list. */
export function saveCheckin(entry: CheckinEntry): CheckinEntry[] {
  const next = [...getCheckins(), entry];
  write(KEYS.checkins, next);
  emitChange('checkins');
  return next;
}

/* Challenges ----------------------------------------------------------------- */

function getChallengeMap(): Record<string, boolean> {
  const parsed = read<unknown>(KEYS.challenges, {});
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
  const map: Record<string, boolean> = {};
  for (const [id, done] of Object.entries(parsed)) {
    if (typeof done === 'boolean') map[id] = done;
  }
  return map;
}

/** Whether a challenge is marked done. */
export function getChallengeDone(id: string): boolean {
  return getChallengeMap()[id] === true;
}

/** Flips a challenge's done state and returns the new state. */
export function toggleChallenge(id: string): boolean {
  const map = getChallengeMap();
  const next = !(map[id] === true);
  map[id] = next;
  write(KEYS.challenges, map);
  return next;
}

/* Weekly poll ------------------------------------------------------------------ */

/** The option this device voted for, or null if not voted. */
export function getPollVote(): string | null {
  const parsed = read<unknown>(KEYS.pollVote, null);
  return typeof parsed === 'string' ? parsed : null;
}

/** Records (or changes) this device's poll vote. */
export function votePoll(option: string): void {
  write(KEYS.pollVote, option);
}

/* Recognition wall -------------------------------------------------------------- */

/** Appreciation notes added on this device, oldest first. */
export function getRecognitions(): string[] {
  return readArray(KEYS.recognitions, isString);
}

/** Appends an appreciation note and returns the updated list. */
export function addRecognition(text: string): string[] {
  const next = [...getRecognitions(), text];
  write(KEYS.recognitions, next);
  return next;
}

/* Change events ------------------------------------------------------------------
 * Pages subscribe so they re-render when data changes (same tab or cross-tab).
 * ---------------------------------------------------------------------------- */

const CHANGE_EVENT = 'nal:change';

export function emitChange(key: string): void {
  window.dispatchEvent(new CustomEvent<string>(CHANGE_EVENT, { detail: key }));
}

/** Subscribes to store changes. Listener receives the changed key ('*' for cross-tab). */
export function onStoreChange(listener: (key: string) => void): () => void {
  const onLocal = (e: Event) => listener((e as CustomEvent<string>).detail);
  const onStorage = () => listener('*');
  window.addEventListener(CHANGE_EVENT, onLocal);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onLocal);
    window.removeEventListener('storage', onStorage);
  };
}

/** Replaces the local check-in cache (used when merging with the account copy). */
export function replaceCheckins(entries: CheckinEntry[]): void {
  const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  write(KEYS.checkins, sorted);
  emitChange('checkins');
}
