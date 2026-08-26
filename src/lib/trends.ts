/* ---------------------------------------------------------------------------
 * trends.ts — anonymous weekly aggregates (LUC-78).
 *
 * A finished check-in adds ONE tally to trends/{week}: the overall mood bucket
 * and each follow-up reason chosen. No uid, no per-question scores, no
 * timestamps — the document is counts only, so nothing can be traced back.
 * ------------------------------------------------------------------------- */

import { weekId } from '../data/polls';
import { getTrend, recordTrend } from './db';
import type { CheckinAnswer } from './store';

/** Minimum check-ins before a week is shown — below this someone could be picked out. */
export const MIN_GROUP = 10;

export type OverallScore = 0 | 1 | 2;

export interface TrendSummary {
  n: number;
  reasons: Record<string, number>;
  /** Counts for Tough / Okay / Good. */
  overall: [number, number, number];
}

/** Distinct follow-up reasons across all answers, in first-seen order. */
export function reasonsFromAnswers(answers: CheckinAnswer[]): string[] {
  const seen = new Set<string>();
  for (const a of answers) for (const r of a.followUps) seen.add(r.trim());
  seen.delete('');
  return [...seen];
}

/** The 'overall' answer if present, else the rounded mean of every score (Okay when empty). */
export function overallFromAnswers(answers: CheckinAnswer[]): OverallScore {
  const direct = answers.find((a) => a.qid === 'overall');
  if (direct) return direct.score;
  if (answers.length === 0) return 1;
  const mean = answers.reduce((s, a) => s + a.score, 0) / answers.length;
  return Math.min(2, Math.max(0, Math.round(mean))) as OverallScore;
}

/** Fire-and-forget tally for a finished check-in. Never throws. */
export async function recordTrendForCheckin(answers: CheckinAnswer[]): Promise<void> {
  try {
    await recordTrend(weekId(new Date()), reasonsFromAnswers(answers), overallFromAnswers(answers));
  } catch {
    /* Aggregates are best-effort — the check-in itself is already saved. */
  }
}

export function readTrend(id: string): Promise<TrendSummary | null> {
  return getTrend(id);
}

/** This week plus the `back` weeks before it, newest first. */
export function recentWeekIds(back: number, now = new Date()): string[] {
  const ids: string[] = [];
  for (let k = 0; k <= back; k++) {
    ids.push(weekId(new Date(now.getTime() - k * 7 * 86_400_000)));
  }
  return ids;
}
