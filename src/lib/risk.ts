/* ---------------------------------------------------------------------------
 * risk.ts — quiet keyword screen that tags a story for moderators so the
 * heaviest ones are read first. It is a triage aid only: the flags are never
 * shown to the writer as a judgement, and a clean result never means "safe".
 *
 * Phrasing includes Singlish / NS slang because that is how people actually
 * write here. Keep every pattern lower-case; input is lower-cased and
 * whitespace-collapsed before matching.
 * ------------------------------------------------------------------------- */

export type RiskFlag = 'self-harm' | 'suicide' | 'violence' | 'abuse' | 'substance';

export const RISK_FLAGS: RiskFlag[] = ['suicide', 'self-harm', 'violence', 'abuse', 'substance'];

/** Human wording for the moderation queue chips. */
export const RISK_LABEL: Record<RiskFlag, string> = {
  suicide: 'Mentions suicide',
  'self-harm': 'Mentions self-harm',
  violence: 'Mentions violence',
  abuse: 'Mentions abuse or bullying',
  substance: 'Mentions substances',
};

const PATTERNS: Record<RiskFlag, RegExp[]> = {
  suicide: [
    /\bsuicid(?:e|al)\b/,
    /\bkill(?:ing)? myself\b/,
    /\bend(?:ing)? (?:it all|my life|everything)\b/,
    /\btake my (?:own )?life\b/,
    /\bdon'?t want to (?:be alive|live|wake up|exist)\b/,
    /\b(?:better|easier) (?:off )?(?:if i (?:was|were|wasn'?t)|without me)\b/,
    /\bwish(?:ed)? i (?:was|were) dead\b/,
    /\b(?:sleep|go to sleep|close my eyes) and (?:not|never) wake up\b/,
    /\b(?:not|never|don'?t|didn'?t) (?:want(?:ed|ing)? to|wanna) wake up\b/,
    /\bdisappear(?:ing)? (?:for good|forever|completely)\b/,
    /\bsian until want(?:ed)? to die\b/,
    /\bwant(?:ed)? to die\b/,
    /\b(?:rather|wanna|want to) (?:just )?die\b/,
    /\bno (?:reason|point) (?:to|in) (?:living|going on|carry(?:ing)? on)\b/,
    /\bjump(?:ing)? (?:off|down|from) (?:the )?(?:block|building|bunk|hdb|flat|mrt)\b/,
    /\bgo(?:ing)? mrt track\b/,
    /\b(?:overdose|od)\b/,
    /\bhang(?:ing)? myself\b/,
    /\bsia(?:m|n) ?(?:this )?world\b/,
    /\bcannot (?:take|tahan) (?:it )?(?:any ?more|already|liao)\b.*\b(?:die|dead|end)\b/,
    /\bsuicide watch\b/,
    /\bgoodbye (?:everyone|world|all)\b/,
    /\bfinal (?:note|message|goodbye)\b/,
  ],
  'self-harm': [
    /\bself[- ]?harm/,
    /\bcut(?:ting)? (?:myself|my (?:arm|wrist|wrists|thigh|leg|skin))\b/,
    /\bcutting\b/,
    /\bburn(?:ing)? myself\b/,
    /\bhurt(?:ing)? myself\b/,
    /\bpunch(?:ing)? (?:the )?wall(?:s)? (?:until|till)\b/,
    /\bscratch(?:ing)? myself\b/,
    /\bmy (?:scars|cuts|blade|razor)\b/,
    /\bpenknife\b.*\b(?:arm|wrist|myself)\b/,
    /\bstarv(?:e|ing) myself\b/,
    /\bnot eating (?:on purpose|anymore|at all)\b/,
    /\bpurg(?:e|ing)\b/,
  ],
  violence: [
    /\b(?:want|wanted|going|gonna|wanna) to (?:hurt|hit|whack|hantam|kill|stab|shoot) (?:him|her|them|someone|somebody|my|the)\b/,
    /\b(?:hurt|hit|whack|hantam|beat|beat up|bash|stab|shoot|kill) (?:him|her|them|someone|somebody)\b/,
    /\bkill (?:him|her|them|everyone|everybody)\b/,
    /\bwhack(?:ed|ing)? (?:him|her|them|me|each other|one another)\b/,
    /\bhantam(?:ed)?\b/,
    /\bpunch(?:ed|ing)? (?:him|her|them|me|my (?:buddy|bunkmate|friend|sergeant|commander))\b/,
    /\bgot (?:beaten|beat|whacked|bashed|punched) (?:up)?\b/,
    /\b(?:fist ?fight|fight(?:ing)? (?:broke|break) out)\b/,
    /\bweapon\b.*\b(?:on|against|at) (?:him|her|them|someone|myself)\b/,
    /\b(?:sar|rifle|gun|bayonet|knife|parang)\b.*\b(?:on|against|at|point(?:ed|ing)?)\b.*\b(?:him|her|them|someone|myself|me)\b/,
    /\bblood ?bath\b/,
    /\bmake (?:him|her|them) pay\b/,
    /\brevenge\b/,
    /\bthreaten(?:ed|ing)? (?:me|him|her|them|to)\b/,
  ],
  abuse: [
    /\babus(?:e|ed|ing|ive)\b/,
    /\bbull(?:y|ied|ying|ies)\b/,
    /\bharass(?:ed|ing|ment)?\b/,
    /\bhaz(?:e|ed|ing)\b/,
    /\bragging\b/,
    /\bmolest(?:ed|ing|er)?\b/,
    /\bsexual(?:ly)? (?:assault|harass|abuse|touch)/,
    /\btouch(?:ed|ing)? me (?:inappropriately|without|down there|in the)\b/,
    /\brap(?:e|ed|ing)\b/,
    /\bforced? me to\b/,
    /\bmade me (?:strip|undress|kneel|eat|drink)\b/,
    /\b(?:tekan|tekan(?:ed|ing)|tekan session|arrow(?:ed)? until|sabo(?:ed|tage)?)\b/,
    /\b(?:humiliat|degrad)(?:e|ed|ing|ion)\b/,
    /\b(?:scold|screamed|shouted|yelled) (?:at me )?(?:every ?day|non[- ]?stop|until i cried)\b/,
    /\bsingled? (?:me )?out\b/,
    /\bthreaten(?:ed|s)? (?:to )?(?:charge|dr|extra|confine)\b/,
    /\b(?:slap|slapped|kick|kicked|choke|choked|strangle|strangled) (?:me|him|her)\b/,
    /\bat home\b.*\b(?:hits?|beats?|hurts?) (?:me|us|my mum|my mother|my dad)\b/,
    /\bmy (?:father|dad|mother|mum|stepdad|stepmum|boyfriend|girlfriend) (?:hits?|beats?|hurts?|slaps?)\b/,
  ],
  substance: [
    /\b(?:drugs?|weed|ganja|cannabis|marijuana|meth|ice|heroin|cocaine|coke|ecstasy|mdma|molly|ketamine|k-?hole|lsd|acid tabs?|shrooms|xanax|benzos?|valium|codeine|lean|k ?pods?)\b/,
    /\bvap(?:e|ing|es)\b/,
    /\bget(?:ting)? high\b/,
    /\bstoned\b/,
    /\b(?:drunk|drinking) (?:every|all|too|to (?:forget|cope|sleep|numb))\b/,
    /\b(?:drink|drank|drinking) (?:until|till) (?:i )?(?:black|pass|vomit|puke|cannot)\b/,
    /\bblack(?:ed)? out\b.*\b(?:drink|drank|alcohol|beer|vodka|whisky|whiskey|soju)\b/,
    /\b(?:alcohol|beer|vodka|whisky|whiskey|soju|liquor)\b.*\b(?:every ?day|every night|to cope|to numb|to sleep|too much)\b/,
    /\balcoholic\b/,
    /\bsleeping pills?\b.*\b(?:too many|handful|whole|extra|more than)\b/,
    /\bpills?\b.*\b(?:to (?:forget|numb|escape)|too many|handful)\b/,
    /\bpanadol\b.*\b(?:whole|box|strip|many|handful)\b/,
    /\bpuff(?:ing)?\b.*\b(?:weed|joint|blunt)\b/,
    /\bjoint\b.*\b(?:smok|roll|light)\w*\b/,
    /\bcup ?chai\b/,
    /\bsniff(?:ing)? (?:glue|thinner|petrol|gas)\b/,
    /\bcough syrup\b.*\b(?:high|bottles?|to cope)\b/,
  ],
};

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Screen a story and return the risk flags it trips, in priority order
 * (suicide first). Empty array = nothing matched — not a safety guarantee.
 */
export function flagRisks(text: string): string[] {
  const t = normalise(text);
  if (!t) return [];
  const out: string[] = [];
  for (const flag of RISK_FLAGS) {
    if (PATTERNS[flag].some((re) => re.test(t))) out.push(flag);
  }
  return out;
}

/** True when the story should surface the emergency contacts to the writer. */
export function needsCareNow(flags: readonly string[]): boolean {
  return flags.includes('suicide') || flags.includes('self-harm');
}

/** Wording for a moderation chip; unknown flags fall back to the raw key. */
export function riskLabel(flag: string): string {
  return (RISK_LABEL as Record<string, string>)[flag] ?? flag;
}
