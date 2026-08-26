/* ---------------------------------------------------------------------------
 * companion.ts — the guided companion's brain.
 *
 * Honest by design: this is NOT an AI. It matches keyword groups to a handful of
 * warm, pre-written replies and points to the right corner of the site. The
 * `CompanionProvider` interface exists so a real model can slot in later
 * without touching the UI. Nothing here touches storage or the network.
 * ------------------------------------------------------------------------- */

import { EMERGENCY_CONTACTS } from '../data/contacts';

export type Role = 'user' | 'companion';

export interface Message {
  id: string;
  role: Role;
  text: string;
  /** Present on companion messages: 1–3 places to go next. */
  steps?: NextStep[];
  /** True when the message is the crisis handover — rendered with emphasis. */
  handover?: boolean;
}

export interface NextStep {
  label: string;
  /** In-app path (`/resources/better-sleep`) or a `tel:` / `https:` href. */
  to: string;
}

export interface Reply {
  text: string;
  steps: NextStep[];
  handover?: boolean;
}

export interface CompanionProvider {
  /** Human-readable name, shown in the header so nobody mistakes it for an AI. */
  readonly name: string;
  reply(history: Message[], input: string): Promise<Reply>;
}

/* Quick-start chips ----------------------------------------------------------- */

export const QUICK_STARTS: string[] = [
  "I'm feeling overwhelmed",
  "I can't sleep",
  "I'm worried about my friend",
  "My section doesn't like me",
];

/* Shared next steps ----------------------------------------------------------- */

const CHECK_IN: NextStep = { label: 'Do a quick check-in', to: '/me?tab=check-in' };
const HELP_LINES: NextStep = { label: 'People you can call', to: '#help' };

/** The 24-hour lines, pulled straight from EMERGENCY_CONTACTS (tel: links only). */
export function crisisSteps(): NextStep[] {
  return EMERGENCY_CONTACTS.filter((c) => c.href?.startsWith('tel:')).map((c) => ({
    label: `${c.label} · ${c.detail}`,
    to: c.href as string,
  }));
}

/* Intents ------------------------------------------------------------------- */

interface Intent {
  id: string;
  keywords: RegExp[];
  reply: string;
  steps: NextStep[];
}

const RISK_PATTERNS: RegExp[] = [
  /\bsuicid/i,
  /\bkill(ing)?\s+(my|him|her|them|some|him)self\b/i,
  /\bkill\s+myself\b/i,
  /\bend(ing)?\s+(it|my life|everything)\b/i,
  /\bdon'?t\s+want\s+to\s+(be\s+alive|live|wake up|exist)\b/i,
  /\bbetter\s+off\s+(dead|without me)\b/i,
  /\bself[-\s]?harm/i,
  /\bhurt(ing)?\s+(my|him|her|them|your)self\b/i,
  /\bcut(ting)?\s+myself\b/i,
  /\bhurt(ing)?\s+(someone|somebody|him|her|them|people|my (buddy|sergeant|officer|section))\b/i,
  /\bwant\s+to\s+die\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
];

export function detectRisk(input: string): boolean {
  return RISK_PATTERNS.some((re) => re.test(input));
}

const INTENTS: Intent[] = [
  {
    id: 'overwhelmed',
    keywords: [/overwhelm/i, /\bstress/i, /too much/i, /can'?t cope/i, /pressure/i, /drowning/i, /burn(t|ed)? out/i, /burnout/i],
    reply:
      "That sounds like a lot to carry at once. Feeling overwhelmed is your body saying the load is heavy — not that you are weak. Let's find one small thing to put down first.",
    steps: [
      { label: 'Stress & pressure tips', to: '/resources/stress-management' },
      { label: 'Stories about burnout', to: '/stories?theme=Burnout' },
      CHECK_IN,
    ],
  },
  {
    id: 'sleep',
    keywords: [/sleep/i, /insomnia/i, /awake/i, /tired at night/i, /can'?t rest/i, /nightmare/i],
    reply:
      "Lying awake makes everything feel bigger. Your body will catch up — it usually takes a few steady nights, not one perfect one. There are some gentle, practical things that help most people.",
    steps: [
      { label: 'Better sleep tips', to: '/resources/better-sleep' },
      { label: 'Recovery after training', to: '/resources/physical-recovery' },
      CHECK_IN,
    ],
  },
  {
    id: 'friend',
    keywords: [/friend/i, /buddy/i, /bunk ?mate/i, /section mate/i, /worried about (him|her|them|someone)/i, /my (mate|pal)/i],
    reply:
      "Noticing that someone is not okay is already the biggest step. You don't have to fix it for them — just stay close, ask plainly how they are, and don't keep it all on your own shoulders. If you think they are in danger, the lines below answer any hour.",
    steps: [
      { label: 'Supporting each other', to: '/resources/relationships' },
      HELP_LINES,
      { label: 'Stories about friendship', to: '/stories?theme=Friendship' },
    ],
  },
  {
    id: 'section',
    keywords: [/section/i, /platoon/i, /don'?t like me/i, /left out/i, /excluded/i, /nobody talks/i, /outcast/i, /bully/i, /ostraci/i],
    reply:
      "Feeling on the outside of your own section is exhausting, especially when you are around them all day. It often has more to do with the group's habits than with you. A quiet word with one person you can stand is usually the best first move.",
    steps: [
      { label: 'Getting on with people', to: '/resources/relationships' },
      { label: 'Stories about feeling alone', to: '/stories?theme=Feeling%20Alone' },
      CHECK_IN,
    ],
  },
  {
    id: 'home',
    keywords: [/miss(ing)? home/i, /homesick/i, /miss my (mum|mom|dad|family|parents|girlfriend|boyfriend|partner)/i, /want to go home/i, /book out/i],
    reply:
      "Missing home is a sign you have good things waiting for you, not a weakness. The ache is usually sharpest in the first weeks and around bunk time. Keeping one small ritual from home — a call, a song, a photo — helps more than it sounds.",
    steps: [
      { label: 'Stories about missing home', to: '/stories?theme=Missing%20Home' },
      { label: 'Staying connected', to: '/resources/relationships' },
      CHECK_IN,
    ],
  },
  {
    id: 'failed',
    keywords: [/fail/i, /screw(ed)? up/i, /messed up/i, /didn'?t pass/i, /ippt/i, /out of course/i, /oo?c\b/i, /not good enough/i, /useless/i],
    reply:
      "Failing at something you worked for stings, and it is okay to sit with that for a bit. One result is not the whole story of you. Plenty of people here have stumbled on the same step and still got where they were going.",
    steps: [
      { label: 'Stories about bouncing back', to: '/stories?theme=Overcoming%20Failure' },
      { label: 'Keeping your head steady', to: '/resources/mental-health' },
      CHECK_IN,
    ],
  },
  {
    id: 'angry',
    keywords: [/angry/i, /anger/i, /furious/i, /rage/i, /pissed/i, /frustrat/i, /want to punch/i, /losing my temper/i],
    reply:
      "Anger usually shows up when something feels unfair or out of your hands — and a lot of things here are. The feeling is fair; what matters is where it goes. Getting it out of your body first (a walk, a hard set, a rant to someone safe) makes the next step clearer.",
    steps: [
      { label: 'Cooling down under pressure', to: '/resources/stress-management' },
      { label: 'Stories about leadership', to: '/stories?theme=Leadership' },
      CHECK_IN,
    ],
  },
  {
    id: 'numb',
    keywords: [/numb/i, /feel nothing/i, /don'?t feel anything/i, /empty/i, /flat/i, /don'?t care anymore/i, /going through the motions/i],
    reply:
      "Feeling nothing can be harder to explain than feeling too much. It is often the mind's way of switching off when it has been on for too long. It deserves attention, not a shrug — a short check-in each day can help you notice when it starts to lift.",
    steps: [
      { label: 'Looking after your mind', to: '/resources/mental-health' },
      CHECK_IN,
      HELP_LINES,
    ],
  },
  {
    id: 'tired',
    keywords: [/tired/i, /exhausted/i, /no energy/i, /drained/i, /knackered/i, /shag\b/i, /worn out/i, /fatigue/i],
    reply:
      "Bone-tired is a real thing after weeks of early mornings and outfield. Your body is asking for recovery, not more grit. Food, water and a couple of early nights do more than any pep talk.",
    steps: [
      { label: 'Recovery after training', to: '/resources/physical-recovery' },
      { label: 'Better sleep tips', to: '/resources/better-sleep' },
      { label: 'Stories about field camp', to: '/stories?theme=Field%20Camp' },
    ],
  },
  {
    id: 'lonely',
    keywords: [/lonely/i, /alone/i, /no one (to talk|understands|gets)/i, /nobody (to talk|understands|gets)/i, /isolated/i, /on my own/i],
    reply:
      "Feeling alone in a bunk full of people is more common than anyone admits out loud. It doesn't mean something is wrong with you. Reading how others got through it can make the room feel a little less far away.",
    steps: [
      { label: 'Stories about feeling alone', to: '/stories?theme=Feeling%20Alone' },
      { label: 'Building connection', to: '/resources/relationships' },
      HELP_LINES,
    ],
  },
  {
    id: 'unknown',
    keywords: [/don'?t know/i, /not sure/i, /dunno/i, /no idea/i, /can'?t explain/i, /just (feel|feeling)/i, /something('?s| is) off/i],
    reply:
      "You don't need the right words to start. 'Something is off' is enough. A quick check-in gives you three simple questions and no pressure — sometimes that's how the feeling gets a name.",
    steps: [CHECK_IN, { label: 'Read how others put it', to: '/stories' }, HELP_LINES],
  },
];

const FALLBACK: Reply = {
  text:
    "Thanks for saying it out loud — even to a page. I'm a simple guide, so I might not catch everything, but I can point you somewhere useful. Try one of these, or tell me a bit more in plain words.",
  steps: [
    { label: 'Browse the resources', to: '/resources' },
    CHECK_IN,
    HELP_LINES,
  ],
};

const HANDOVER_INTRO =
  "I'm glad you told me. What you just said matters, and it is bigger than anything a guided page should hold on its own. Please talk to a real person right now — these lines answer 24 hours a day, and you don't need to give a name.";
const HANDOVER_OUTRO = 'You can also press the button in the corner any time.';

/** Detect the best-matching intent; exported for tests and future providers. */
export function detectIntent(input: string): string {
  const best = INTENTS.map((i) => ({ id: i.id, hits: i.keywords.filter((re) => re.test(input)).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)[0];
  return best?.id ?? 'fallback';
}

export class GuidedProvider implements CompanionProvider {
  readonly name = 'Guided companion';

  async reply(_history: Message[], input: string): Promise<Reply> {
    if (detectRisk(input)) {
      return {
        text: `${HANDOVER_INTRO}\n\n${HANDOVER_OUTRO}`,
        steps: crisisSteps(),
        handover: true,
      };
    }
    const id = detectIntent(input);
    const intent = INTENTS.find((i) => i.id === id);
    if (!intent) return FALLBACK;
    return { text: intent.reply, steps: intent.steps.slice(0, 3) };
  }
}

export const GREETING =
  "Hi. I'm a guided companion — a set of gentle prompts, not an AI. Nothing you type here is stored anywhere. Tell me what's going on, or pick one below.";
