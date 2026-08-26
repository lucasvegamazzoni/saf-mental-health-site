/* ---------------------------------------------------------------------------
 * polls.ts — weekly poll + challenge banks with deterministic week rotation.
 * Week ids are ISO weeks ('2026-W35') so every device agrees on "this week".
 * ------------------------------------------------------------------------- */

export interface PollResult {
  option: string;
  /** Sample percentage (demo data, sums to 100 across all options). */
  percent: number;
}

export interface WeeklyPoll {
  question: string;
  options: string[];
  /** Demo-only placeholder results — not real votes. */
  sampleResults: PollResult[];
  sampleNote: string;
}

export interface Challenge {
  id: string;
  text: string;
}

export const POLL_BANK: WeeklyPoll[] = [
  {
    question: "What's been the hardest part of this week?",
    options: ['Training load', 'Sleep', 'Being away from home', 'People stuff', 'Nothing much'],
    sampleResults: [
      { option: 'Training load', percent: 28 },
      { option: 'Sleep', percent: 24 },
      { option: 'Being away from home', percent: 22 },
      { option: 'People stuff', percent: 14 },
      { option: 'Nothing much', percent: 12 },
    ],
    sampleNote: 'Sample results for demo purposes — not real responses.',
  },
];

export const CHALLENGE_BANK: Challenge[] = [
  { id: 'sleep-before-11', text: 'Sleep before 11pm twice' },
  { id: 'thank-a-buddy', text: 'Thank one buddy' },
  { id: 'drink-more-water', text: 'Drink more water' },
  { id: 'write-positive', text: 'Write one positive thing' },
  { id: 'exercise-20', text: 'Exercise for 20 minutes' },
];

/** ISO-8601 week id for a date, e.g. '2026-W35'. Weeks start Monday; week 1 holds 4 Jan. */
export function weekId(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - day); // shift to the Thursday of this week
  const year = d.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const week = Math.ceil(((d.getTime() - jan1) / 86_400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Absolute week index (year * 53 + week) so rotation is stable across year boundaries. */
function weekIndex(id: string): number {
  const m = /^(\d{4})-W(\d{2})$/.exec(id);
  if (!m) return 0;
  return Number(m[1]) * 53 + Number(m[2]);
}

/** The poll for a given week id — a deterministic rotation over POLL_BANK. */
export function pollForWeek(id: string): WeeklyPoll {
  return POLL_BANK[weekIndex(id) % POLL_BANK.length];
}

/** Five challenges for a given week id — a deterministic rotation over CHALLENGE_BANK. */
export function challengesForWeek(id: string): Challenge[] {
  const n = CHALLENGE_BANK.length;
  const count = Math.min(5, n);
  const start = weekIndex(id) % n;
  const out: Challenge[] = [];
  for (let i = 0; i < count; i++) out.push(CHALLENGE_BANK[(start + i) % n]);
  return out;
}

/** Backwards-compatible: this week's poll and challenges, resolved at module load. */
export const WEEKLY_POLL: WeeklyPoll = pollForWeek(weekId(new Date()));
export const CHALLENGES: Challenge[] = challengesForWeek(weekId(new Date()));
