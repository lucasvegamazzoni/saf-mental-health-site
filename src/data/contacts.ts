/* ---------------------------------------------------------------------------
 * contacts.ts — people and lines a serviceman can reach right now. Never gated.
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
