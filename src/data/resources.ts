/* ---------------------------------------------------------------------------
 * resources.ts — wellbeing resource topics and tips.
 *
 * Guidance only — never diagnosis or treatment advice. Every `source` and
 * `links` URL was fetched and returned 200 on 2026-08-27 (LUC-69).
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

/* Shared sources ---------------------------------------------------------- */

const SRC = {
  nhsBreathing: {
    label: 'NHS — Breathing exercises for stress',
    url: 'https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/',
  },
  nhsStress: {
    label: 'NHS — 10 stress busters',
    url: 'https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/tips-to-reduce-stress/',
  },
  nhsSleep: {
    label: 'NHS Every Mind Matters — How to fall asleep faster and sleep better',
    url: 'https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/how-to-fall-asleep-faster-and-sleep-better/',
  },
  sfNapping: {
    label: 'Sleep Foundation — Napping',
    url: 'https://www.sleepfoundation.org/sleep-hygiene/napping',
  },
  sfShift: {
    label: 'Sleep Foundation — Tips for shift workers',
    url: 'https://www.sleepfoundation.org/shift-work-disorder/tips',
  },
  sfHygiene: {
    label: 'Sleep Foundation — Sleep hygiene',
    url: 'https://www.sleepfoundation.org/sleep-hygiene',
  },
  nhsWater: {
    label: 'NHS — Water, drinks and hydration',
    url: 'https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/water-drinks-nutrition/',
  },
  nhsStretch: {
    label: 'NHS — How to stretch after exercising',
    url: 'https://www.nhs.uk/live-well/exercise/how-to-stretch-after-exercising/',
  },
  nhsExercise: {
    label: 'NHS — Exercise',
    url: 'https://www.nhs.uk/live-well/exercise/',
  },
  nhsLoneliness: {
    label: 'NHS Every Mind Matters — Loneliness',
    url: 'https://www.nhs.uk/every-mind-matters/lifes-challenges/loneliness/',
  },
  nhsFiveSteps: {
    label: 'NHS — 5 steps to mental wellbeing',
    url: 'https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/five-steps-to-mental-wellbeing/',
  },
  mindline: {
    label: 'mindline.sg — free mental health resources in Singapore',
    url: 'https://mindline.sg/',
  },
  mindsg: {
    label: 'HealthHub MindSG — Caring for ourselves',
    url: 'https://www.healthhub.sg/programmes/mindsg/caring-for-ourselves',
  },
} as const satisfies Record<string, ResourceLink>;

export const RESOURCE_TOPICS: ResourceTopic[] = [
  {
    slug: 'stress-management',
    title: 'Stress Management',
    emoji: '🧘',
    blurb: 'Ways to steady yourself when the week piles up.',
    tips: [
      {
        title: 'Shrink the week into today',
        body: 'A confinement week or a packed training cycle feels heavier when you look at the whole thing at once. Each night, write down the two or three things that actually matter tomorrow — the inspection, the range, the admin you keep putting off — and let the rest wait. Feeling like you have some control over your day is one of the biggest levers on stress, and a short list gives you that back.',
        source: SRC.nhsStress,
      },
      {
        title: 'Five-count breathing',
        body: 'Breathe in gently through your nose while counting slowly to five, then let it flow out through your mouth for another five. You will not always reach five at first, and that is fine. Do it for a few minutes on the bunk, in the tonner, or waiting for the next serial — nobody around you will notice, and it works better the more regularly you use it.',
        source: SRC.nhsBreathing,
      },
      {
        title: 'Move, even a little',
        body: 'Exercise will not make the stress disappear, but it takes the edge off the emotional intensity and clears your head enough to deal with things calmly. That does not have to be an extra PT session. A slow walk around the parade square after dinner, or stretching on the floor of the bunk, counts.',
        source: SRC.nhsStress,
      },
      {
        title: 'Ground yourself in the moment',
        body: 'When your thoughts start racing — before a mission brief, during a long night duty — name five things you can see, four you can hear, and three you can feel against your skin. It sounds too simple, but it gently pulls your attention out of the spiral and back into the room you are actually in.',
      },
      {
        title: 'Say it to someone',
        body: 'Sitting alone with a problem makes it grow. Tell a buddy, a section mate you trust, or a counsellor what is on your mind; you do not need a polished explanation, just a start. If you would rather not talk to anyone in camp yet, mindline.sg has a 24-hour chat and the national mindline number 1771, free and confidential.',
        source: SRC.mindline,
      },
    ],
    links: [SRC.nhsStress, SRC.nhsBreathing, SRC.mindline],
  },
  {
    slug: 'better-sleep',
    title: 'Better Sleep',
    emoji: '🌙',
    blurb: 'Small habits that add up to real rest.',
    tips: [
      {
        title: 'Protect a regular sleep time',
        body: 'Your body learns when to feel sleepy from the times you go to bed and wake up. In camp the wake-up is fixed for you, so use that: try to keep lights-out at roughly the same time too, and do not swing wildly on book-out weekends. A late Saturday is fine — a completely reversed weekend makes Sunday night and Monday morning much harder.',
        source: SRC.nhsSleep,
      },
      {
        title: 'Phone down before lights-out',
        body: 'Scrolling in the bunk is the most natural thing in the world after a long day, but the blue light from screens makes it harder to fall asleep. Give yourself a buffer before lights-out — even twenty minutes — for something calmer: a few pages of a book, a quiet chat, some slow breathing, or just lying there with your eyes shut.',
        source: SRC.nhsSleep,
      },
      {
        title: 'Nap short, nap early',
        body: 'A twenty to thirty minute nap is long enough to leave you refreshed without dropping into deep sleep, which is what makes longer naps feel groggy. Before a night duty, a short nap in the afternoon can carry you through. Avoid long naps in the late afternoon or evening if you have a normal night ahead — they steal from the sleep you need later.',
        source: SRC.sfNapping,
      },
      {
        title: 'Sleeping in daylight after night duty',
        body: 'Going to bed at eight in the morning is genuinely hard, so make the bunk as dark and quiet as you can: an eye mask and earplugs do more than you would expect, and switching your phone to silent stops the notifications that break your sleep. Some people prefer a split — a couple of hours after coming off duty, then a longer sleep before the next shift. Try both and keep what works.',
        source: SRC.sfShift,
      },
      {
        title: 'Recovering after field camp',
        body: 'After outfield, your body has real sleep debt to repay. Aim for two or three consecutive early nights rather than one heroic fourteen-hour sleep, eat proper meals, and drink through the day. Go easy on caffeine and big late dinners in those first nights back — both make it harder to fall asleep just when you need it most.',
        source: SRC.nhsSleep,
      },
    ],
    links: [SRC.nhsSleep, SRC.sfNapping, SRC.sfShift],
  },
  {
    slug: 'physical-recovery',
    title: 'Physical Recovery',
    emoji: '💪',
    blurb: 'Help your body bounce back from hard training.',
    tips: [
      {
        title: 'Drink through the day, not in one go',
        body: 'Your pee should be a clear pale yellow — that is the simplest check. In our heat, and on days with route march, PT or outfield, you need more than the usual six to eight cups, so top up steadily from your water bottle rather than chugging a litre at the water point. Water replaces what you sweat out better than anything else.',
        source: SRC.nhsWater,
      },
      {
        title: 'Eat after the hard stuff',
        body: 'Muscles rebuild from what you feed them. After a heavy session or a long march, get a proper meal with carbohydrates and some protein in the next hour or so — cookhouse rice and chicken does the job. Skipping meals to save time on a busy day is one of the quietest ways to feel wrecked by Thursday.',
      },
      {
        title: 'Five minutes of stretching',
        body: 'A short cool-down routine after activity helps your heart rate come down and keeps you loose for tomorrow. Hold each stretch for fifteen to twenty seconds — hamstrings, calves, thighs, glutes — and keep it gentle. Stretching should feel like release, not pain; if something hurts sharply, ease off.',
        source: SRC.nhsStretch,
      },
      {
        title: 'Hard days need easy days',
        body: 'When you are pushing for IPPT, the temptation is to run every evening. Your body actually gets fitter during rest, so alternate a hard run with a lighter day — a walk, a swim, some mobility work — and treat sleep as part of the programme rather than something you squeeze in. You will progress faster and pick up fewer niggles.',
        source: SRC.nhsExercise,
      },
      {
        title: 'Treat niggles as information',
        body: 'A sore knee that gets worse each run, a foot that hurts to stand on after a march — these are signals, not tests of toughness. Flag it early to your buddy and your commander and get it looked at at the medical centre. A few days of care almost always beats months of rehab, and your section would rather have you back whole.',
      },
    ],
    links: [SRC.nhsWater, SRC.nhsStretch, SRC.nhsExercise],
  },
  {
    slug: 'mental-health',
    title: 'Mental Health',
    emoji: '🌱',
    blurb: 'Understanding the tough patches — and getting through them.',
    tips: [
      {
        title: 'Nerves before big events',
        body: 'Feeling wound up before a live range, a field exercise, or your first night duty is normal, and it usually settles once you get moving. Slow breathing helps in the moment. If the worry hangs around for weeks, keeps you awake, or gets in the way of daily things, that is a good reason to talk to someone — and a strong move, not a weak one.',
        source: SRC.nhsBreathing,
      },
      {
        title: 'Running on empty',
        body: 'Constant exhaustion, going numb about things you used to care about, and feeling like nothing you do makes a difference — those are signs to slow down, not to push harder. Build small pockets of genuine rest into the week, protect your sleep, and tell one person how you are actually doing. Burnout shrinks when it stops being a secret.',
      },
      {
        title: 'Lonely in a full bunk',
        body: 'You can feel alone in a room of twelve people, and lots of servicemen do at some point — it is nothing to be embarrassed about, and it passes. Regular small chats help more than you would expect: sit with someone at dinner, message a friend outside, ask a bunkmate a real question. Just talking to someone can shift the feeling.',
        source: SRC.nhsLoneliness,
      },
      {
        title: 'Motivation follows action',
        body: 'On the flat weeks, waiting to feel motivated before you start rarely works. Start absurdly small — two minutes of the task, one lap, one message — and let momentum do the rest. Learning a small new thing, even a skill for camp life, also gives you a sense of purpose that low weeks tend to strip away.',
        source: SRC.nhsFiveSteps,
      },
      {
        title: 'Know where help is',
        body: 'You do not need to be in crisis to reach out. mindline.sg is a free first stop with a 24-hour chat, self-check tools, and an anonymous peer forum; the national mindline number is 1771. Inside camp, your unit has counsellors and a medical centre you can approach. And if you or someone near you is in danger right now, use the emergency button at the top of this site.',
        source: SRC.mindline,
      },
    ],
    links: [SRC.mindline, SRC.mindsg, SRC.nhsLoneliness],
  },
  {
    slug: 'relationships',
    title: 'Relationships',
    emoji: '🤝',
    blurb: 'Staying close to the people who matter.',
    tips: [
      {
        title: 'Friends outside camp',
        body: 'Friendships survive NS on small, regular touches — a message, a meme, a short call on the bus back — not on the long catch-ups you keep postponing. When you do book out, try to see one person face to face rather than only texting. Good relationships build a sense of belonging that carries you through the weeks inside.',
        source: SRC.nhsFiveSteps,
      },
      {
        title: 'Keeping home close',
        body: 'Family worry more when they hear nothing. A quick call on the way back to camp, or a message to say you are in and fine, keeps home feeling close even if the news is boring. If a confinement week or exercise means you will go quiet, tell them beforehand so silence does not read as something wrong.',
      },
      {
        title: 'Your section',
        body: 'You do not have to be best friends with everyone in your section. Trust is built in small acts: sharing a snack, helping someone with kit before inspection, covering a task when a mate is struggling. Those things add up faster than any big gesture, and they are what you will remember about each other later.',
      },
      {
        title: 'Friction in the bunk',
        body: 'Living on top of each other guarantees friction. Raise it early and privately, and talk about the specific thing — the noise at lights-out, the shared area left messy — rather than the person. Most conflict shrinks fast once both sides feel heard, and it is much easier to fix in week two than after it has hardened into sides.',
      },
      {
        title: 'Ask, do not hint',
        body: 'Say what you actually need instead of hoping people guess. That goes for your section, your buddy, and the people at home — "can you keep it down after eleven" beats sighing loudly every night. If you are the one being asked, listening properly and checking you understood is half the work.',
      },
    ],
    links: [SRC.nhsFiveSteps, SRC.nhsLoneliness, SRC.mindline],
  },
];
