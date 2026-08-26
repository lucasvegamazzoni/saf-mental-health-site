/* ---------------------------------------------------------------------------
 * stories.ts — story themes + seeded sample stories (illustrative only).
 * ------------------------------------------------------------------------- */

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
  /** True for the seeded sample stories — shown with a "sample" label, never as real accounts. */
  illustrative?: boolean;
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
    illustrative: true,
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
    illustrative: true,
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
    illustrative: true,
  },
];
