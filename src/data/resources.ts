/* ---------------------------------------------------------------------------
 * resources.ts — wellbeing resource topics and tips.
 * ------------------------------------------------------------------------- */

/* Resources --------------------------------------------------------------- */

export interface ResourceTip {
  title: string;
  body: string;
  /** Optional citation shown beneath the tip. */
  source?: { label: string; url: string };
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
