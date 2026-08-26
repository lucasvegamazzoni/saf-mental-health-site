/* ---------------------------------------------------------------------------
 * contacts.ts — people and lines a serviceman can reach right now. Never gated.
 *
 * Every number here was checked against an official page on the date in
 * `verifiedOn`. If you cannot verify a line, leave it out — a wrong number in
 * this file does real harm. Re-verify at least every six months.
 *
 * Deliberately NOT listed (checked 2026-08-27):
 *  - IMH Mental Health Helpline 6389-2222 — discontinued by IMH after the
 *    launch of national mindline 1771 (nhghealth.com.sg/News/
 *    imh-discontinues-its-mental-health-helpline-number).
 *  - National CARE Hotline 1800-202-6868 — ceased operations 31 Dec 2022
 *    (msf.gov.sg media room).
 * ------------------------------------------------------------------------- */

/* Emergency contacts --------------------------------------------------------- */

export interface EmergencyContact {
  label: string;
  detail: string;
  href?: string;
  /** e.g. '24/7' or 'Mon–Fri, 8am–6pm' */
  hours?: string;
  /** One plain sentence about what to expect. */
  note?: string;
  /** ISO date the details were last checked. */
  verifiedOn?: string;
  /** Where the details were verified (URL or name). */
  source?: string;
  /** Section the consumer can group under. */
  group?: ContactGroup;
}

export type ContactGroup = 'now' | 'saf' | 'peer';
export const CONTACT_GROUP_LABEL: Record<ContactGroup, string> = {
  now: 'Right now, any hour',
  saf: 'Inside the SAF',
  peer: 'Peer and community',
};

/**
 * Order matters: immediate-danger lines first, then SAF-specific, then
 * peer/community. Consumers render this list top-to-bottom.
 */
export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  /* --- Right now, any hour ------------------------------------------------ */
  {
    label: 'Samaritans of Singapore (SOS)',
    group: 'now',
    detail: '1767',
    href: 'tel:1767',
    hours: '24/7',
    note: 'If you are thinking about ending your life, call this first. Trained volunteers, no name needed.',
    verifiedOn: '2026-08-27',
    source: 'https://www.sos.org.sg/contact-us/',
  },
  {
    label: 'SOS CareText',
    group: 'now',
    detail: 'WhatsApp 9151 1767',
    href: 'https://wa.me/6591511767',
    hours: '24/7',
    note: 'Same SOS volunteers, over text — for when talking out loud is too much.',
    verifiedOn: '2026-08-27',
    source: 'https://www.sos.org.sg/contact-us/',
  },
  {
    label: 'National mindline 1771',
    group: 'now',
    detail: '1771',
    href: 'tel:1771',
    hours: '24/7',
    note: 'Singapore’s national mental health line — counsellors for stress, low mood, anything on your mind. You can stay anonymous.',
    verifiedOn: '2026-08-27',
    source:
      'https://www.moh.gov.sg/newsroom/national-mindline-1771-to-provide--round-the-clock-support-for-mental-health/',
  },
  {
    label: 'mindline 1771 on WhatsApp',
    group: 'now',
    detail: 'WhatsApp +65 6669 1771',
    href: 'https://wa.me/6566691771',
    hours: '24/7',
    note: 'Text a mindline counsellor instead of calling. Web chat is at mindline.sg too.',
    verifiedOn: '2026-08-27',
    source:
      'https://www.moh.gov.sg/newsroom/national-mindline-1771-to-provide--round-the-clock-support-for-mental-health/',
  },

  /* --- Inside the SAF ------------------------------------------------------ */
  {
    label: 'SAF Counselling Hotline',
    group: 'saf',
    detail: '1800-278-0022',
    href: 'tel:1800-278-0022',
    hours: '24/7',
    note: 'Confidential line run by the SAF Counselling Centre for anyone serving. Mobile calls to 1800 numbers may be charged.',
    verifiedOn: '2026-08-27',
    source: 'https://www.cmpb.gov.sg/life-in-ns/saf/where-to-seek-help/',
  },
  {
    label: "Your unit's paracounsellors",
    group: 'saf',
    detail: 'Trained peers in your own unit',
    note: 'They have been through the same training and know the system from the inside.',
  },
  {
    label: 'Any instructor you trust',
    group: 'saf',
    detail: 'They will listen',
    note: 'You do not need a reason or a diagnosis to start the conversation.',
  },

  /* --- Peer and community -------------------------------------------------- */
  {
    label: 'CHAT (youth, 16–30)',
    group: 'peer',
    detail: '6493 6500',
    href: 'tel:64936500',
    hours: 'Mon 9am–5pm · Tue–Sat 12pm–9pm',
    note: 'Free, confidential mental health check-in for young people at *SCAPE, Orchard. Not a crisis line.',
    verifiedOn: '2026-08-27',
    source: 'https://www.nhghealth.com.sg/imh/chat',
  },
  {
    label: 'TOUCHline',
    group: 'peer',
    detail: '1800 377 2252',
    href: 'tel:1800-377-2252',
    hours: 'Mon–Fri 9am–6pm, excl. public holidays',
    note: 'Toll-free counsellors from TOUCH Community Services. Not a crisis line.',
    verifiedOn: '2026-08-27',
    source: 'https://www.touch.org.sg/get-assistance/counselling-and-mental-wellness.html',
  },
  {
    label: '@TheOpenManProject',
    group: 'peer',
    detail: 'Instagram',
    href: 'https://www.instagram.com/theopenmanproject',
    note: 'Men talking openly about what they carry. Community, not a helpline.',
    verifiedOn: '2026-08-27',
    source: 'https://www.instagram.com/theopenmanproject',
  },
];
