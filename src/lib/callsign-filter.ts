/* ---------------------------------------------------------------------------
 * callsign-filter.ts — keeps slurs, profanity and derogatory terms out of
 * call signs (LUC-94). Deliberately conservative: a call sign is public-ish
 * (moderators see it, and the person sees it every day), so we'd rather
 * reject a borderline name than let a slur through.
 *
 * Matching: the candidate is lower-cased, leetspeak-normalised and stripped
 * of separators, then checked (a) for substring hits on the hard list and
 * (b) for whole-token hits on the profanity list. The word lists are data —
 * extend them, don't sprinkle checks elsewhere.
 * ------------------------------------------------------------------------- */

const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i', '|': 'i', '+': 't',
};

/** Slurs and hate terms — matched as substrings after normalisation. */
const HARD_BLOCK = [
  // racial / ethnic slurs (incl. common obfuscations)
  'nigger', 'nigga', 'niga', 'chink', 'chingchong', 'gook', 'kike', 'spic', 'wetback', 'paki', 'raghead', 'towelhead',
  'coon', 'darkie', 'sandnigger', 'apu', 'keling', 'kelinga', 'bangla', 'ahneh', 'ahnehneh', 'mat rep', 'matrep', 'tiong',
  'cina babi', 'cinababi', 'melayu bodoh', 'angmohkia',
  // sexuality / gender slurs
  'faggot', 'fagot', 'fag', 'dyke', 'tranny', 'shemale', 'ahgua', 'ah gua', 'ahkua', 'bapok', 'pondan',
  // disability slurs
  'retard', 'retarded', 'spastic', 'spaz', 'mongoloid',
  // sexual violence / extremist
  'rapist', 'rape', 'pedo', 'paedo', 'nazi', 'hitler', 'kkk', 'jihad', 'isis',
  // Hokkien / Singlish sexual slurs
  'cheebye', 'chibai', 'chee bye', 'cb', 'kanina', 'kani', 'knn', 'kannina', 'lanjiao', 'lan jiao', 'lj', 'jibai',
  'puki', 'pukimak', 'kimak', 'butoh', 'chao chee bye',
];

/** Profanity — matched as whole tokens (so "assassin" or "bassoon" pass). */
const PROFANITY = [
  'fuck', 'fucker', 'fucking', 'fucked', 'motherfucker', 'shit', 'shite', 'bullshit', 'cunt', 'bitch', 'bitches',
  'asshole', 'arsehole', 'ass', 'arse', 'dick', 'dickhead', 'cock', 'prick', 'pussy', 'twat', 'wanker', 'whore', 'slut',
  'bastard', 'damn', 'piss', 'crap', 'cum', 'jizz', 'tits', 'boobs', 'penis', 'vagina', 'porn', 'sex', 'hentai',
  'suicide', 'kys', 'killyourself', 'kill', 'die', 'murder', 'terrorist', 'bomb',
  'sibei', 'sial', 'sia', 'walao', 'bodoh', 'gila', 'babi', 'anjing', 'hantu', 'chao', 'lampa', 'lanpa', 'kukubird', 'kuku',
];

function normalise(raw: string): string {
  return raw
    .toLowerCase()
    .split('')
    .map((ch) => LEET[ch] ?? ch)
    .join('')
    .normalize('NFKD')
    .replace(/[^a-z]/g, '');
}

function tokens(raw: string): string[] {
  return raw
    .toLowerCase()
    .split('')
    .map((ch) => LEET[ch] ?? ch)
    .join('')
    .normalize('NFKD')
    .split(/[^a-z]+/)
    .filter(Boolean);
}

export interface CallSignVerdict {
  ok: boolean;
  /** Friendly reason for the form; never echoes the matched term. */
  reason?: string;
}

/** Returns ok=false when the call sign contains a slur, hate term or profanity. */
export function checkCallSign(raw: string): CallSignVerdict {
  const flat = normalise(raw);
  if (!flat) return { ok: true };

  for (const term of HARD_BLOCK) {
    const t = term.replace(/[^a-z]/g, '');
    if (t.length >= 4 && flat.includes(t)) {
      return { ok: false, reason: "That call sign isn't allowed here — pick something you'd be glad to see every day." };
    }
  }

  const words = tokens(raw);
  const flatSet = new Set([flat, ...words]);
  for (const term of [...HARD_BLOCK, ...PROFANITY]) {
    const t = term.replace(/[^a-z]/g, '');
    if (flatSet.has(t)) {
      return { ok: false, reason: "That call sign isn't allowed here — pick something you'd be glad to see every day." };
    }
  }

  // Catch short hard terms hidden in camelCase joins, e.g. "QuietCB" → "quietcb"
  for (const term of HARD_BLOCK) {
    const t = term.replace(/[^a-z]/g, '');
    if (t.length < 4 && words.includes(t)) {
      return { ok: false, reason: "That call sign isn't allowed here — pick something you'd be glad to see every day." };
    }
  }

  return { ok: true };
}
