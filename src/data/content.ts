/* ---------------------------------------------------------------------------
 * content.ts — barrel for all static content. The real modules live beside
 * this file (checkin, stories, resources, contacts, polls); import from either.
 * Everything here is sample/demo copy. No real user data.
 * ------------------------------------------------------------------------- */

export * from './checkin';
export * from './stories';
export * from './resources';
export * from './contacts';
export * from './polls';

/* Recognition wall ---------------------------------------------------------- */

export const RECOGNITION_SEED: string[] = [
  'Thanks to my buddy for covering my duty when I was down — it did not go unnoticed.',
  'Shout-out to the person in charge of us for actually asking how we were doing this week.',
  'Appreciate the bunkmate who shared his snacks and listened after a long outfield.',
];
