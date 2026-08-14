/* ---------------------------------------------------------------------------
 * content.ts — all static content for the "You're Not Alone" demo site.
 * Front-end only; everything here is sample/demo copy. No real user data.
 * ------------------------------------------------------------------------- */

/* Check-in ---------------------------------------------------------------- */

export type CheckinScore = 0 | 1 | 2;

export interface ScalePoint {
  score: CheckinScore;
  emoji: string;
  label: string;
}

/** The default 3-point answer scale for every check-in question. */
export const CHECKIN_SCALE: ScalePoint[] = [
  { score: 0, emoji: '😞', label: 'Not really' },
  { score: 1, emoji: '😐', label: 'Somewhat' },
  { score: 2, emoji: '😊', label: 'Yes' },
];

export interface CheckinFollowUp {
  prompt: string;
  options: string[];
}

export interface CheckinQuestion {
  id: string;
  text: string;
  /** Override for the three scale labels (score 0, 1, 2). Falls back to CHECKIN_SCALE labels. */
  scaleLabels?: [string, string, string];
  followUp?: CheckinFollowUp;
}

export const CHECKIN_QUESTIONS: CheckinQuestion[] = [
  {
    id: 'mood',
    text: 'Have you been feeling happy lately?',
    followUp: {
      prompt: "What's been affecting your mood?",
      options: ['Work/training', 'Family', 'Relationships', 'Missing home', 'Feeling lonely', 'Other'],
    },
  },
  {
    id: 'energy',
    text: 'Have you had enough energy lately?',
    followUp: {
      prompt: "What's been draining your energy?",
      options: ['Sleep', 'Physical training', 'Illness', 'Nutrition', 'Feeling mentally drained'],
    },
  },
  {
    id: 'sleep',
    text: 'Have you been sleeping well?',
    followUp: {
      prompt: "What's been affecting your sleep?",
      options: ['Trouble falling asleep', 'Waking up during the night', 'Too little sleep', 'Night duties', 'Stress'],
    },
  },
  {
    id: 'stress',
    text: 'Have you been feeling stressed recently?',
    followUp: {
      prompt: "What's been the main source of stress?",
      options: ['Workload', 'Upcoming exercises', 'Performance expectations', 'Personal issues', 'Unsure why'],
    },
  },
  {
    id: 'support',
    text: 'Have you felt supported by the people around you?',
    followUp: {
      prompt: 'Who have you been able to talk to?',
      options: ['Friends', 'Section mates', 'Commanders', 'Family', "I haven't talked to anyone"],
    },
  },
  {
    id: 'meals',
    text: 'Have you been eating regularly?',
    followUp: {
      prompt: "What's been getting in the way of meals?",
      options: ['No appetite', 'Busy schedule', 'Food quality', 'Skipping meals', 'Diet/health reasons'],
    },
  },
  {
    id: 'downtime',
    text: 'Have you been able to relax or enjoy yourself this week?',
    followUp: {
      prompt: "What's been getting in the way of downtime?",
      options: ['No time', 'Too tired', 'Confined in camp', 'Not in the mood', 'Other'],
    },
  },
  {
    id: 'confidence',
    text: "Have you felt confident handling this week's challenges?",
    followUp: {
      prompt: "What's been making things feel harder?",
      options: ['Work feels overwhelming', 'Unsure what to do', 'Lack of confidence', 'Need more guidance'],
    },
  },
  {
    id: 'connection',
    text: 'Have you felt connected to your section or platoon?',
    followUp: {
      prompt: "What's been making it hard to connect?",
      options: ["Don't fit in", 'Conflict with others', 'Rarely interact', 'Prefer to keep to myself'],
    },
  },
  {
    id: 'overall',
    text: 'Overall, how has this week been for you?',
    scaleLabels: ['Tough', 'Okay', 'Good'],
  },
];

/* Resources --------------------------------------------------------------- */

export interface ResourceTip {
  title: string;
  body: string;
}

export interface ResourceLink {
  label: string;
  url: string;
}

export interface ResourceTopic {
  slug: string;
  title: string;
  emoji: string;
  blurb: string;
  tips: ResourceTip[];
  links: ResourceLink[];
}

export const RESOURCE_TOPICS: ResourceTopic[] = [
  {
    slug: 'stress-management',
    title: 'Stress Management',
    emoji: '🧘',
    blurb: 'Ways to steady yourself when the week piles up.',
    tips: [
      {
        title: 'Managing workload',
        body: 'Break big tasks into small, concrete steps and knock them out one at a time. Ticking off even a small item gives your brain a sense of progress and control.',
      },
      {
        title: 'Breathing exercises',
        body: 'Try box breathing: inhale for 4, hold for 4, exhale for 4, hold for 4. A few slow rounds lowers your heart rate and tells your body it is safe to relax.',
      },
      {
        title: 'Grounding techniques',
        body: 'When your mind races, name five things you can see, four you can hear, and three you can touch. It gently pulls your attention back to the present moment.',
      },
      {
        title: 'Journaling',
        body: 'Spend two minutes writing down whatever is on your mind — no structure needed. Getting worries onto paper often makes them feel smaller and more manageable.',
      },
      {
        title: 'Time management',
        body: 'Plan tomorrow before you sleep: pick your top three priorities. Knowing what matters most makes a busy day feel far less chaotic.',
      },
    ],
    links: [],
  },
  {
    slug: 'better-sleep',
    title: 'Better Sleep',
    emoji: '🌙',
    blurb: 'Small habits that add up to real rest.',
    tips: [
      {
        title: 'Sleep routines',
        body: 'Try to sleep and wake at roughly the same times, even on weekends. Your body clock rewards consistency with deeper, easier sleep.',
      },
      {
        title: 'Wind-down habits',
        body: 'Give yourself twenty or thirty minutes of low-key time before lights out — stretch, read, or chat quietly. It signals to your brain that the day is done.',
      },
      {
        title: 'Blue light',
        body: 'Screens close to bedtime keep your brain alert. Park the phone a little earlier, or at least dim it and switch to something calm.',
      },
      {
        title: 'Naps',
        body: 'Short naps of fifteen to twenty minutes can recharge you without grogginess. Avoid long naps late in the day so they do not steal your night sleep.',
      },
      {
        title: 'Recovery after field camp',
        body: 'After outfield, aim for two or three consecutive early nights to pay back sleep debt. Hydrate, eat properly, and let your routine reset gently.',
      },
    ],
    links: [],
  },
  {
    slug: 'physical-recovery',
    title: 'Physical Recovery',
    emoji: '💪',
    blurb: 'Help your body bounce back from hard training.',
    tips: [
      {
        title: 'Nutrition',
        body: 'Eat something with carbohydrates and protein within an hour or so of hard training. Regular, balanced meals are the quiet engine behind recovery.',
      },
      {
        title: 'Hydration',
        body: 'Sip water steadily through the day rather than chugging it all at once. In this heat, even mild dehydration drains energy and focus.',
      },
      {
        title: 'Muscle recovery',
        body: 'Muscles rebuild during rest, not during training. Alternate hard days with lighter ones and treat sleep as part of the programme.',
      },
      {
        title: 'Stretching',
        body: 'A few minutes of gentle stretching after activity keeps you loose and helps you unwind. Slow and relaxed beats deep and painful.',
      },
      {
        title: 'Injury prevention',
        body: 'Niggles are information — do not push through sharp or worsening pain. Flag it early; a few days of care beats months of rehab.',
      },
    ],
    links: [],
  },
  {
    slug: 'mental-health',
    title: 'Mental Health',
    emoji: '🌱',
    blurb: 'Understanding the tough patches — and getting through them.',
    tips: [
      {
        title: 'Anxiety',
        body: 'Feeling anxious before big events is normal and usually fades once you start. If worry lingers for weeks or disrupts daily life, talking to someone is a strong move, not a weak one.',
      },
      {
        title: 'Burnout',
        body: 'Constant exhaustion, cynicism, and feeling ineffective are signs to slow down, not push harder. Build small pockets of genuine rest into your week and tell someone how you are doing.',
      },
      {
        title: 'Loneliness',
        body: 'Feeling alone in a crowded bunk is more common than anyone admits. One honest conversation with one person is often enough to start shifting it.',
      },
      {
        title: 'Motivation',
        body: 'Motivation follows action more often than it leads it. Start ridiculously small — two minutes of the task — and let momentum do the rest.',
      },
      {
        title: 'Building resilience',
        body: 'Resilience is not toughness; it is habits — sleep, mates you can talk to, and perspective. It grows every time you get through a hard week and notice that you did.',
      },
    ],
    links: [],
  },
  {
    slug: 'relationships',
    title: 'Relationships',
    emoji: '🤝',
    blurb: 'Staying close to the people who matter.',
    tips: [
      {
        title: 'Friends',
        body: 'Friendships survive NS on small, regular touches — a message, a meme, a short call. You do not need hours; you need consistency.',
      },
      {
        title: 'Family',
        body: 'Keep family in the loop even when the news feels boring. A quick call on the way back to camp keeps home feeling close.',
      },
      {
        title: 'Section mates',
        body: 'You do not have to be best friends with everyone. Small acts — sharing food, helping with kit — build trust faster than big gestures.',
      },
      {
        title: 'Conflict management',
        body: 'Address friction early and privately, focusing on the specific behaviour rather than the person. Most conflict shrinks quickly once both sides feel heard.',
      },
      {
        title: 'Communication',
        body: 'Say what you actually need instead of hoping people guess. Clear and kind beats hint-dropping every time.',
      },
    ],
    links: [],
  },
];

/* Stories ----------------------------------------------------------------- */

export interface StoryTheme {
  emoji: string;
  label: string;
}

export const STORY_THEMES: StoryTheme[] = [
  { emoji: '🏕', label: 'Field Camp' },
  { emoji: '😓', label: 'Burnout' },
  { emoji: '🏠', label: 'Missing Home' },
  { emoji: '💬', label: 'Leadership' },
  { emoji: '🤝', label: 'Friendship' },
  { emoji: '❤️', label: 'Family' },
  { emoji: '😔', label: 'Feeling Alone' },
  { emoji: '💪', label: 'Overcoming Failure' },
  { emoji: '🎖', label: 'National Service' },
  { emoji: '🏃', label: 'Fitness' },
  { emoji: '📚', label: 'Studies' },
];

export interface Story {
  id: string;
  title: string;
  /** Matches a STORY_THEMES label. */
  theme: string;
  preview: string;
  /** Short paragraphs; all explicitly sample/demo copy. */
  body: string[];
  lessons: string[];
  /** 1 (heavy) to 5 (hopeful). */
  hopeScore: 1 | 2 | 3 | 4 | 5;
  readMins: number;
}

export const SEED_STORIES: Story[] = [
  {
    id: 'sample-only-one',
    title: 'Sample story — I Thought I Was the Only One',
    theme: 'Feeling Alone',
    preview:
      'A sample story showing how an anonymous experience of feeling isolated in camp would appear here.',
    body: [
      'This is sample demo copy, not a real account. In the live version, an anonymous serviceman might describe how everyone around him seemed to be coping fine while he felt completely out of place.',
      'The sample story would go on to describe the small turning point — one honest conversation with a bunkmate — and the surprise of hearing "same here" back.',
      'It would close on a hopeful, realistic note: things did not change overnight, but knowing he was not the only one made the weeks feel lighter.',
    ],
    lessons: [
      'Feeling out of place is far more common than it looks.',
      'One honest conversation can change how heavy a week feels.',
      'You never know who else quietly feels the same.',
    ],
    hopeScore: 4,
    readMins: 2,
  },
  {
    id: 'sample-heavy-week',
    title: 'Sample story — The Week Everything Felt Heavy',
    theme: 'Burnout',
    preview:
      'A sample story showing how an anonymous experience of running on empty during a packed training block would appear here.',
    body: [
      'This is sample demo copy, not a real account. Here, an anonymous contributor might describe a stretch of back-to-back duties and exercises where sleep shrank and motivation went with it.',
      'The sample would describe recognising the warning signs — snapping at friends, dreading small tasks — and finally telling a commander that he was struggling.',
      'It would end with what actually helped: a slightly adjusted schedule, a proper night of sleep, and the realisation that saying something early is not a failure.',
    ],
    lessons: [
      'Burnout builds quietly — noticing the signs early matters.',
      'Asking for an adjustment is a skill, not a weakness.',
      'Rest is part of performing, not a break from it.',
      'Commanders can only help with what they know about.',
    ],
    hopeScore: 3,
    readMins: 3,
  },
  {
    id: 'sample-call-home',
    title: 'Sample story — A Call Home Changed My Week',
    theme: 'Missing Home',
    preview:
      'A sample story showing how an anonymous experience of homesickness during a long stretch in camp would appear here.',
    body: [
      'This is sample demo copy, not a real account. A contributor might describe the first long confinement, when the distance from family suddenly felt much bigger than the map suggested.',
      'The sample would describe the simple fix that helped most: a standing ten-minute call home every other evening, boring updates and all.',
      'It would close by noting that missing home never fully went away — but it stopped being something carried alone.',
    ],
    lessons: [
      'Homesickness is normal, even for people who seem fine.',
      'Small, regular contact beats rare, long catch-ups.',
      'Routines make the distance feel smaller.',
    ],
    hopeScore: 5,
    readMins: 2,
  },
];

/* Weekly poll -------------------------------------------------------------- */

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

export const WEEKLY_POLL: WeeklyPoll = {
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
};

/* Challenges ---------------------------------------------------------------- */

export interface Challenge {
  id: string;
  text: string;
}

export const CHALLENGES: Challenge[] = [
  { id: 'sleep-before-11', text: 'Sleep before 11pm twice' },
  { id: 'thank-a-buddy', text: 'Thank one buddy' },
  { id: 'drink-more-water', text: 'Drink more water' },
  { id: 'write-positive', text: 'Write one positive thing' },
  { id: 'exercise-20', text: 'Exercise for 20 minutes' },
];

/* Recognition wall ---------------------------------------------------------- */

export const RECOGNITION_SEED: string[] = [
  'Thanks to my buddy for covering my duty when I was down — it did not go unnoticed.',
  'Shout-out to my section commander for actually asking how we were doing this week.',
  'Appreciate the bunkmate who shared his snacks and listened after a long outfield.',
];

/* Emergency contacts --------------------------------------------------------- */

export interface EmergencyContact {
  label: string;
  detail: string;
  href?: string;
}

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    label: '@TheOpenManProject',
    detail: 'Instagram',
    href: 'https://www.instagram.com/theopenmanproject',
  },
  {
    label: 'SAF Counselling Centre',
    detail: '1800-278-0022',
    href: 'tel:1800-278-0022',
  },
  {
    label: "Your unit's paracounsellors",
    detail: 'Trained peers in your own unit',
  },
  {
    label: 'Any instructor you trust',
    detail: 'They will listen',
  },
];
