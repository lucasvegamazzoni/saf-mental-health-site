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
  {
    question: 'How many nights this week did you get more than six hours of sleep?',
    options: ['None', 'One or two', 'Three or four', 'Five or six', 'Every night'],
    sampleResults: [
      { option: 'None', percent: 9 },
      { option: 'One or two', percent: 26 },
      { option: 'Three or four', percent: 34 },
      { option: 'Five or six', percent: 21 },
      { option: 'Every night', percent: 10 },
    ],
    sampleNote: 'Sample results for demo purposes — not real responses.',
  },
  {
    question: 'How often did you miss home this week?',
    options: ['Barely', 'A few quiet moments', 'Most evenings', 'Almost all the time', 'Hard to say'],
    sampleResults: [
      { option: 'Barely', percent: 14 },
      { option: 'A few quiet moments', percent: 33 },
      { option: 'Most evenings', percent: 29 },
      { option: 'Almost all the time', percent: 16 },
      { option: 'Hard to say', percent: 8 },
    ],
    sampleNote: 'Sample results for demo purposes — not real responses.',
  },
  {
    question: 'Where do you stand with the people in your section right now?',
    options: ['Solid, got my people', 'Mostly fine', 'Keeping to myself', 'Some friction', 'New here, still finding my feet'],
    sampleResults: [
      { option: 'Solid, got my people', percent: 31 },
      { option: 'Mostly fine', percent: 36 },
      { option: 'Keeping to myself', percent: 15 },
      { option: 'Some friction', percent: 10 },
      { option: 'New here, still finding my feet', percent: 8 },
    ],
    sampleNote: 'Sample results for demo purposes — not real responses.',
  },
  {
    question: 'What helped you most during the last field exercise or outfield?',
    options: ['Buddies cracking jokes', 'Counting down the days', 'Small comforts (snacks, wet wipes)', 'Focusing on the task', 'Honestly, nothing helped'],
    sampleResults: [
      { option: 'Buddies cracking jokes', percent: 34 },
      { option: 'Counting down the days', percent: 22 },
      { option: 'Small comforts (snacks, wet wipes)', percent: 18 },
      { option: 'Focusing on the task', percent: 17 },
      { option: 'Honestly, nothing helped', percent: 9 },
    ],
    sampleNote: 'Sample results for demo purposes — not real responses.',
  },
  {
    question: 'What did your last book-out actually look like?',
    options: ['Slept most of it', 'Family time', 'Friends and food', 'Errands and admin', 'Barely felt like a break'],
    sampleResults: [
      { option: 'Slept most of it', percent: 27 },
      { option: 'Family time', percent: 25 },
      { option: 'Friends and food', percent: 22 },
      { option: 'Errands and admin', percent: 11 },
      { option: 'Barely felt like a break', percent: 15 },
    ],
    sampleNote: 'Sample results for demo purposes — not real responses.',
  },
  {
    question: 'If you are studying or sitting exams while serving, how is it going?',
    options: ['Managing okay', 'Behind but coping', 'Really stretched', 'Put it on hold for now', 'Not studying this year'],
    sampleResults: [
      { option: 'Managing okay', percent: 22 },
      { option: 'Behind but coping', percent: 27 },
      { option: 'Really stretched', percent: 19 },
      { option: 'Put it on hold for now', percent: 12 },
      { option: 'Not studying this year', percent: 20 },
    ],
    sampleNote: 'Sample results for demo purposes — not real responses.',
  },
  {
    question: "How would you describe your commanders' style this week?",
    options: ['Firm but fair', 'Mostly encouraging', 'Distant', 'Unpredictable', 'Depends on the day'],
    sampleResults: [
      { option: 'Firm but fair', percent: 30 },
      { option: 'Mostly encouraging', percent: 24 },
      { option: 'Distant', percent: 15 },
      { option: 'Unpredictable', percent: 12 },
      { option: 'Depends on the day', percent: 19 },
    ],
    sampleNote: 'Sample results for demo purposes — not real responses.',
  },
  {
    question: 'How has the cookhouse food been treating you?',
    options: ['Actually not bad', 'Fine, I eat to live', 'Living off the canteen', 'Skipping meals sometimes', 'Craving home food badly'],
    sampleResults: [
      { option: 'Actually not bad', percent: 18 },
      { option: 'Fine, I eat to live', percent: 32 },
      { option: 'Living off the canteen', percent: 20 },
      { option: 'Skipping meals sometimes', percent: 9 },
      { option: 'Craving home food badly', percent: 21 },
    ],
    sampleNote: 'Sample results for demo purposes — not real responses.',
  },
  {
    question: 'What is keeping you going right now?',
    options: ['Counting to ORD', 'My buddies', 'Family and partner', 'Wanting to do well', 'Not sure, just pushing through'],
    sampleResults: [
      { option: 'Counting to ORD', percent: 29 },
      { option: 'My buddies', percent: 24 },
      { option: 'Family and partner', percent: 19 },
      { option: 'Wanting to do well', percent: 13 },
      { option: 'Not sure, just pushing through', percent: 15 },
    ],
    sampleNote: 'Sample results for demo purposes — not real responses.',
  },
  {
    question: 'How connected did you feel to family and friends outside camp this week?',
    options: ['Very, talked most days', 'Enough', 'Less than I wanted', 'Barely, hard to find time', 'Prefer to switch off in camp'],
    sampleResults: [
      { option: 'Very, talked most days', percent: 24 },
      { option: 'Enough', percent: 33 },
      { option: 'Less than I wanted', percent: 22 },
      { option: 'Barely, hard to find time', percent: 13 },
      { option: 'Prefer to switch off in camp', percent: 8 },
    ],
    sampleNote: 'Sample results for demo purposes — not real responses.',
  },
  {
    question: 'When you think about life after ORD, what comes up?',
    options: ['Excited and ready', 'Mostly looking forward', 'Mixed feelings', 'Anxious about what is next', 'Too far away to think about'],
    sampleResults: [
      { option: 'Excited and ready', percent: 21 },
      { option: 'Mostly looking forward', percent: 28 },
      { option: 'Mixed feelings', percent: 25 },
      { option: 'Anxious about what is next', percent: 14 },
      { option: 'Too far away to think about', percent: 12 },
    ],
    sampleNote: 'Sample results for demo purposes — not real responses.',
  },
];

export const CHALLENGE_BANK: Challenge[] = [
  { id: 'sleep-before-11', text: 'Sleep before 11pm on two nights' },
  { id: 'thank-a-buddy', text: 'Say thank you to one buddy, out loud' },
  { id: 'drink-more-water', text: 'Finish your water bottle before lunch, three days running' },
  { id: 'write-positive', text: 'Write down one thing that went okay today' },
  { id: 'exercise-20', text: 'Move for 20 minutes outside of PT' },
  { id: 'phone-down-lights-out', text: 'Put the phone face-down 15 minutes before lights out' },
  { id: 'call-home', text: 'Call or voice-note someone at home, even for two minutes' },
  { id: 'stretch-morning', text: 'Stretch for five minutes after waking up' },
  { id: 'tidy-bunk', text: 'Square away your bunk and locker before the day gets going' },
  { id: 'one-task-focus', text: 'Do one task start to finish without checking your phone' },
  { id: 'three-good-things', text: 'List three small good things before you sleep' },
  { id: 'check-on-someone', text: 'Ask one person how they are really doing, and wait for the answer' },
  { id: 'walk-after-dinner', text: 'Take a slow ten-minute walk after dinner' },
  { id: 'eat-a-fruit', text: 'Eat a piece of fruit with one meal each day' },
  { id: 'deep-breaths', text: 'Take five slow breaths before something you are dreading' },
  { id: 'help-without-asked', text: 'Help with a chore before anyone asks' },
  { id: 'no-caffeine-late', text: 'Skip caffeine after 4pm for three days' },
  { id: 'learn-about-bunkmate', text: 'Learn one thing about a bunkmate you did not know' },
  { id: 'plan-tomorrow', text: "Write tomorrow's three must-dos before lights out" },
  { id: 'kind-to-self', text: 'Say one kind thing to yourself when you slip up' },
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

/* ---------------------------------------------------------------------------
 * Rotation guarantees (asserted by verify/polls-rotation.cjs):
 *  1. weekId is deterministic: same calendar day gives the same id.
 *  2. 12 consecutive weeks visit all 12 polls exactly once (no repeats).
 *  3. 20 consecutive weeks start a challenge window at every one of the 20
 *     challenges, and no week's 5 challenges contain a duplicate.
 *  4. Consecutive weeks never share a poll; challenge windows slide by one.
 *  5. Year boundary: 2027-01-03 is '2026-W53' and rotation continues from it.
 *  6. Every poll's sampleResults sum to 100 and mirror its 5 options in order.
 * ------------------------------------------------------------------------- */
