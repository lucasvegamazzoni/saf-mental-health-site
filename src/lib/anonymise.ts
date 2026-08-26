/* ---------------------------------------------------------------------------
 * anonymise.ts — deterministic, client-side removal of details that could
 * identify someone in a story: ranks + names, honorific + name, units and
 * formations, camp names, NRIC-like tokens, phones, emails, @handles and
 * very specific dates. Everything is swapped for a neutral bracketed
 * placeholder such as "[a sergeant]" or "[camp]".
 *
 * The `Anonymiser` interface is intentionally tiny so an LLM-backed adapter
 * can drop in later (`apply(text) → { text, changes }`) without touching the
 * review screen.
 * ------------------------------------------------------------------------- */

export interface AnonymiseChange {
  /** What the rule matched, verbatim. */
  from: string;
  /** The neutral placeholder it became. */
  to: string;
  /** Which rule fired — handy for the review screen and for tests. */
  kind:
    | 'rank-name'
    | 'honorific-name'
    | 'unit'
    | 'camp'
    | 'nric'
    | 'phone'
    | 'email'
    | 'handle'
    | 'date';
  /** Character offset of the placeholder in the *output* text. */
  index: number;
}

export interface AnonymiseResult {
  text: string;
  changes: AnonymiseChange[];
}

export interface Anonymiser {
  apply(text: string): AnonymiseResult;
}

/* Vocab -------------------------------------------------------------------- */

/** Rank abbreviation / word → neutral noun. Longest keys first when matching. */
const RANKS: Array<[pattern: string, noun: string]> = [
  // Commissioned
  ['LG|MG|BG|COL|LTC|MAJ|CPT|LTA|2LT|OCT', 'an officer'],
  ['General|Colonel|Lieutenant[- ]Colonel|Major|Captain|Lieutenant|Second Lieutenant|Officer Cadet', 'an officer'],
  // Warrant officers
  ['CWO|SWO|MWO|1WO|2WO|3WO|WO', 'a warrant officer'],
  ['Warrant Officer|Encik', 'a warrant officer'],
  // Specialists
  ['MSG|SSG|1SG|2SG|3SG|SGT', 'a sergeant'],
  ['Master Sergeant|Staff Sergeant|First Sergeant|Second Sergeant|Third Sergeant|Sergeant', 'a sergeant'],
  ['CPL|LCP|CFC', 'a corporal'],
  ['Corporal|Lance Corporal|Corporal First Class', 'a corporal'],
  ['PTE|REC|PFC', 'a soldier'],
  ['Private|Recruit', 'a soldier'],
  // Common role-words that are often followed by a name
  ['OC|CO|CSM|RSM|PC|PS|S1|S3|S4|2IC', 'my commander'],
  ['Sir|Ma\'am|Sarge|Sergeant Major|Encik|Cikgu', 'my commander'],
];

const HONORIFICS = 'Mr|Mrs|Ms|Mdm|Madam|Miss|Dr|Doctor|Uncle|Auntie|Aunty|Bro|Brother|Encik|Cik|Puan|Tuan';

const FORMATION_ABBR =
  'SIR|SAR|SCE|SAB|SMB|SIG|SIGS|SIB|DIV|BDE|SCS|SAI|SMI|SBS|SLB|SLR|SME|SSR|SAMB|SADA|GDS|SCG|CDO|BN|COY|PLT|SAFVC|RSAF|RSN|SOF';
const FORMATION_WORD =
  'Guards|Signals|Signal|Infantry|Armour|Armoured|Artillery|Commando|Commandos|Engineers|Engineer|Medical|Transport|Maintenance|Supply|Military Police|Battalion|Brigade|Division|Regiment|Squadron|Company|Coy|Platoon|Section|Wing|Flight|Detachment|Det|Troop';

const SUBUNIT_NAMES =
  'Alpha|Bravo|Charlie|Delta|Echo|Foxtrot|Golf|Hotel|India|Juliet|Kilo|Lima|Mike|November|Oscar|Papa|Quebec|Romeo|Sierra|Tango|Uniform|Victor|Whiskey|X-?ray|Yankee|Zulu|Support|Headquarters|HQ|Mortar|Recce|Pioneer|Scout|Sniper|Anti-?Tank';

const CAMPS =
  'Tekong|Pulau Tekong|Pasir Laba|Kranji|Nee Soon|Amoy Quee|Jurong|Bedok|Selarang|Sungei Gedong|Hendon|Khatib|Mandai|Stagmont|Maju|Keat Hong|Gombak|Clementi|Dieppe|Seletar|Changi|Paya Lebar|Tengah|Sembawang|Tuas|Lim Chu Kang|Murai|Marsiling|Rocky Hill|Ladang|Safti|SAFTI|Pasir Ris|Loyang|Kaki Bukit|Ama Keng|Bukit Gombak|Depot Road|Pulau Sudong|Pulau Senang|Brunei|Temburong|Taiwan|Shoalwater Bay|Rockhampton|Waiouru|Lyppard';

/** A "name" = 1–3 Capitalised words (allows "Tan Wei Ming", "Muhammad Al-Amin", "O'Neil", "s/o"). */
const NAME = "(?:[A-Z][a-zA-Z'\\-]+(?:\\s+(?:s/o|d/o|bin|binte|bte|b\\.|a/l|a/p)\\s+)?){1,3}";

/** Words that look like names but are not — never swallow these after a rank. */
const STOP_AFTER_RANK = new Set([
  'I',
  'And',
  'The',
  'But',
  'Then',
  'When',
  'Who',
  'Said',
  'Was',
  'Told',
  'Asked',
  'Came',
  'Went',
  'Also',
  'Just',
  'Even',
  'Later',
  'Today',
  'Yesterday',
  'Tomorrow',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
  'NS',
  'BMT',
  'SAF',
  'OCS',
  'SCS',
  'IPPT',
  'SOC',
  'ORD',
  'POP',
]);

/* Rules -------------------------------------------------------------------- */

interface Rule {
  kind: AnonymiseChange['kind'];
  re: RegExp;
  /** Return null to skip this match (e.g. false positive). */
  to: (m: RegExpExecArray) => string | null;
}

const trimName = (s: string) => s.trim().split(/\s+/)[0];

const RULES: Rule[] = [
  // Emails, handles, phones, NRIC, dates — high-precision tokens first.
  {
    kind: 'email',
    re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    to: () => '[an email]',
  },
  {
    kind: 'handle',
    re: /(^|[^\w@])@[A-Za-z0-9_.]{2,30}\b/g,
    to: (m) => `${m[1]}[a handle]`,
  },
  {
    kind: 'nric',
    re: /\b[STFGM]\d{7}[A-Z]\b/gi,
    to: () => '[an ID number]',
  },
  {
    kind: 'phone',
    re: /(?:\+65[\s-]?)?\b[3689]\d{3}[\s-]?\d{4}\b/g,
    to: () => '[a phone number]',
  },
  {
    kind: 'date',
    // dd/mm/yyyy, dd-mm-yy, dd.mm.yyyy, "3 March 2025", "March 3, 2025"
    re: /\b(?:\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})\b/gi,
    to: () => '[a date]',
  },

  // Rank + name — one rule per rank family so the placeholder reads naturally.
  ...RANKS.map<Rule>(([pattern, noun]) => ({
    kind: 'rank-name',
    re: new RegExp(`\\b(?:${pattern})\\.?\\s+(${NAME})`, 'g'),
    to: (m) => (STOP_AFTER_RANK.has(trimName(m[1])) ? null : `[${noun}]`),
  })),

  // Honorific + name ("Mr Lim", "Mdm Siti", "Encik Rahman").
  {
    kind: 'honorific-name',
    re: new RegExp(`\\b(?:${HONORIFICS})\\.?\\s+(${NAME})`, 'g'),
    to: (m) => (STOP_AFTER_RANK.has(trimName(m[1])) ? null : '[someone]'),
  },

  // Units & formations.
  {
    kind: 'unit',
    // "3 SIR", "2SIR", "40 SAR", "30 SCE", "9 Div", "3rd Guards", "1 Guards", "3 Sig Bn"
    re: new RegExp(
      `\\b\\d{1,3}(?:st|nd|rd|th)?\\s?(?:${FORMATION_ABBR}|${FORMATION_WORD})\\b(?:\\s?(?:${FORMATION_ABBR}|${FORMATION_WORD})\\b)?`,
      'gi',
    ),
    to: () => '[my unit]',
  },
  {
    kind: 'unit',
    // "Bravo Company", "Charlie Coy", "Alpha Platoon", "HQ Coy", "Support Company"
    re: new RegExp(`\\b(?:${SUBUNIT_NAMES})\\s+(?:${FORMATION_WORD})\\b`, 'gi'),
    to: () => '[my unit]',
  },
  {
    kind: 'unit',
    // "Platoon 3", "Section 2", "Coy B", "Company C", "Plt 2", "Sec 4"
    re: new RegExp(
      `\\b(?:Platoon|Plt|Section|Sec|Company|Coy|Battalion|Bn|Brigade|Bde|Division|Div|Squadron|Sqn|Wing|Flight|Troop)\\s?(?:[A-Z]|\\d{1,3})\\b(?![\\w-])`,
      'g',
    ),
    to: () => '[my unit]',
  },
  {
    kind: 'unit',
    // Named battalions / formations written out: "the Guards", "Commandos", "Armour"
    re: /\b(?:the\s+)?(?:Guards|Commandos|Armour|Naval Diving Unit|NDU|Special Operations Force|SOF)\b/g,
    to: () => '[my unit]',
  },

  // Camps and training areas.
  {
    kind: 'camp',
    re: new RegExp(`\\b(?:${CAMPS})(?:\\s+(?:Camp|Base|Airbase|Air Base|Naval Base|Island|Training Area|FIBUA|Live Firing Area|LFA|Range))?\\b`, 'g'),
    to: () => '[camp]',
  },
  {
    kind: 'camp',
    // "X Camp" for any capitalised word we didn't list.
    re: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Camp|Airbase|Air Base|Naval Base)\b/g,
    to: () => '[camp]',
  },
];

/* Engine ------------------------------------------------------------------- */

/**
 * Apply one rule to `text`. Placeholders from earlier rules are protected
 * because they never match a later rule (they are lower-case and bracketed).
 */
function applyRule(text: string, rule: Rule, changes: AnonymiseChange[]): string {
  let out = '';
  let last = 0;
  rule.re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = rule.re.exec(text)) !== null) {
    const replacement = rule.to(m);
    if (replacement === null) continue;
    const before = text.slice(last, m.index);
    out += before;
    const from = m[0];
    // The handle rule keeps a leading char in group 1 — make the change record clean.
    const keep = rule.kind === 'handle' ? m[1] : '';
    const placeholder = replacement.slice(keep.length);
    out += keep;
    changes.push({ from: from.slice(keep.length), to: placeholder, kind: rule.kind, index: out.length });
    out += placeholder;
    last = m.index + from.length;
    if (m[0].length === 0) rule.re.lastIndex++;
  }
  return out + text.slice(last);
}

/** The built-in rules-based anonymiser. */
export const ruleAnonymiser: Anonymiser = {
  apply(text: string): AnonymiseResult {
    const changes: AnonymiseChange[] = [];
    let current = text;
    for (const rule of RULES) current = applyRule(current, rule, changes);

    // Offsets recorded mid-pipeline shift as later rules rewrite the text, so
    // recompute them from the final text: walk placeholders in reading order
    // and pair each with the first unclaimed change that produced that token.
    const unclaimed = [...changes];
    const ordered: AnonymiseChange[] = [];
    const re = /\[[^\]]+\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(current)) !== null) {
      const ph = m[0];
      const i = unclaimed.findIndex((c) => c.to === ph);
      if (i === -1) continue; // user-typed brackets, not ours
      const [change] = unclaimed.splice(i, 1);
      ordered.push({ ...change, index: m.index });
    }
    return { text: current, changes: ordered };
  },
};

/** Convenience: anonymise with the default (rules) anonymiser. */
export function anonymise(text: string): AnonymiseResult {
  return ruleAnonymiser.apply(text);
}

/**
 * Split anonymised text into segments for the review screen: plain runs and
 * highlighted placeholder runs, in order.
 */
export function segments(
  result: AnonymiseResult,
): Array<{ text: string; change?: AnonymiseChange }> {
  const out: Array<{ text: string; change?: AnonymiseChange }> = [];
  let pos = 0;
  for (const c of result.changes) {
    if (c.index > pos) out.push({ text: result.text.slice(pos, c.index) });
    out.push({ text: c.to, change: c });
    pos = c.index + c.to.length;
  }
  if (pos < result.text.length) out.push({ text: result.text.slice(pos) });
  return out;
}
