/* ---------------------------------------------------------------------------
 * checkin.ts — check-in questions and the 3-point scale.
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
