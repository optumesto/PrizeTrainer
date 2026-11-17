
/* ==== BEGIN tcg-enrich.js ==== */
/* ============================================================
   tcg-enrich.js
   Shared card enrichment layer for PrizeTrainer and MetaForge.

   Three jobs:
     1. FETCH   targeted card lookup by id (not by set), with select
     2. PARSE   turn the API's string fields into typed values
     3. INFER   derive provides/requires tags from rules+ability+attack text

   No DOM, no globals, no dependencies. Works in browser and node.

   Design rule: every derived value carries a confidence marker.
   A grader that silently guesses is worse than one that says
   "I could not read this card."
   ============================================================ */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TCGEnrich = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
'use strict';

/* ============================================================
   1. SET CODE MAPPING
   Limitless deck lists use PTCGO codes ("OBF 125").
   pokemontcg.io ids are "{setId}-{number}" ("sv3-125").
   ============================================================ */

const SET_MAP = {
  // Scarlet & Violet
  SVI:'sv1', PAL:'sv2', OBF:'sv3', MEW:'sv3pt5', PAR:'sv4', PAF:'sv4pt5', PRF:'sv4pt5',
  TEF:'sv5', TWM:'sv6', SFA:'sv6pt5', SCR:'sv7', SSP:'sv8', PRE:'sv8pt5', JTG:'sv9',
  SVE:'sve', SVP:'svp', DRI:'sv10', BLK:'zsv10pt5', WHT:'rsv10pt5',
  // Mega Evolution (codes the map does not know yet are asked of the API)
  MEG:'me1', PFL:'me2', ASC:'me2pt5', POR:'me3', CRI:'me4', PBL:'me5', '30C':'me55',
  // Sword & Shield
  SSH:'swsh1', RCL:'swsh2', DAA:'swsh3', VIV:'swsh4', SHF:'swsh45', BST:'swsh5',
  CRE:'swsh6', EVS:'swsh7', FST:'swsh8', BRS:'swsh9', ASR:'swsh10', LOR:'swsh11',
  PGO:'swsh10pt5', SIL:'swsh12', CRZ:'swsh12pt5', CPA:'swsh35', SWP:'swshp', CEL:'cel25',
  // Sun & Moon
  SUM:'sm1', GRI:'sm2', BUS:'sm3', CIN:'sm4', UPR:'sm5', FLI:'sm6', CES:'sm7',
  LOT:'sm8', TEU:'sm9', UNB:'sm10', UNM:'sm11', CEC:'sm12', COS:'sm12',
  SLG:'sm35', DRM:'sm75', HIF:'sm115', DET:'det1', SMP:'smp',
  // XY
  XY:'xy1', FLF:'xy2', FFI:'xy3', PHF:'xy4', PRC:'xy5', ROS:'xy6',
  AOR:'xy7', BKT:'xy8', BKP:'xy9', FCO:'xy10', STS:'xy11', EVO:'xy12',
  GEN:'g1', XYP:'xyp',
  // Black & White
  BLW:'bw1', EPO:'bw2', NVI:'bw3', NXD:'bw4', DEX:'bw5', DRX:'bw6',
  BCR:'bw7', PLS:'bw8', PLF:'bw9', PLB:'bw10', LTR:'bw11', BWP:'bwp', DRV:'dv1',
  // HeartGold / SoulSilver
  HS:'hgss1', UL:'hgss2', UD:'hgss3', TM:'hgss4', CL:'col1', HSP:'hsp',
};

/** Set codes learned from the API at run time (codes newer than SET_MAP). */
const LEARNED_SETS = {};
try {
  if (typeof localStorage !== 'undefined') {
    Object.assign(LEARNED_SETS, JSON.parse(localStorage.getItem('ptcgSetCodes') || '{}'));
  }
} catch (_) {}

/** Build a pokemontcg.io card id from a Limitless set code + number. */
function toCardId(setCode, num) {
  const code = String(setCode || '').toUpperCase();
  const pid = SET_MAP[code] || LEARNED_SETS[code];
  if (!pid || !num) return null;
  // Strip leading zeros but keep alphanumeric suffixes ("H1", "125a", "TG05")
  const clean = String(num).replace(/^0+(?=\d)/, '');
  return pid + '-' + clean;
}

/* ============================================================
   2. FIELD PARSERS
   The API returns strings where the engine expects numbers.
   Naive comparison bugs here produce confident wrong grades:
   in JS, "90" > "140" is true.
   ============================================================ */

/** HP arrives as a string ("140"). Returns a number, or 0 if unreadable. */
function parseHP(hp) {
  if (typeof hp === 'number') return hp;
  const n = parseInt(String(hp || '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Damage arrives as a string with modifiers:
 *   "150"  flat
 *   ""     no damage (effect-only attack)
 *   "30+"  base 30, conditional bonus described in text
 *   "70-"  base 70, conditional reduction (70 is the ceiling)
 *   "30x"  base 30 multiplied by a count (coins, energy, benched pokemon)
 *
 * Returns { raw, base, kind, bonus, cap, mult, min, typical, max, confidence }.
 *
 * `typical` is what a grader should score on. `max` is the ceiling for
 * "can this one-shot" questions. `confidence` says how much to trust it.
 */
function parseDamage(raw, text) {
  const s = String(raw == null ? '' : raw).trim();
  const t = String(text || '');
  const out = {
    raw: s, base: 0, kind: 'none', bonus: 0, cap: null, mult: null,
    min: 0, typical: 0, max: 0, confidence: 'high'
  };
  if (!s) {
    // No printed number, but the text may still hit the opponent's Pokemon:
    // "Put 2 damage counters on your opponent's Active Pokemon for each card
    // in your hand", "This attack does 100 damage to 1 of your opponent's
    // Pokemon". Counted as damage; spread to the Bench alone is not.
    const tl = t.toLowerCase().replace(/[\u2019\u2018]/g, "'");
    // v54: also "each of", "2 of" and "3 of your opponent's Pokemon", which can
    // include the Active, and "the new Active Pokemon" after a gust.
    const tgt = "(?:your opponent's active pok[e\u00e9]mon|(?:each of |)(?:\\d+|one|each) of your opponent's pok[e\u00e9]mon(?: ex)?|the new active pok[e\u00e9]mon)";
    const cm = tl.match(new RegExp("(?:put|place) (\\d+) damage counters? on " + tgt + "([^.]*)"))
      || tl.match(new RegExp("(?:put|place) (\\d+) damage counters? on your opponent's pok[e\u00e9]mon in any way you like()"))
      || tl.match(new RegExp("choose \\d+ of your opponent's pok[e\u00e9]mon and put (\\d+) damage counters? on each of them()"));
    const dm = tl.match(new RegExp("does (\\d+) damage to " + tgt));
    // "Choose 1 of your opponent's Pokemon 6 times ... do 20 damage to it."
    const tm = tl.match(/choose 1 of your opponent's pok[e\u00e9]mon (\d+) times[^.]*\.[^.]*?do (\d+) damage to it/);
    // "For each of your opponent's Pokemon, flip a coin. If heads, this attack does 150 damage to that Pokemon."
    const fm = tl.match(/for each of your opponent's pok[e\u00e9]mon, flip a coin\. if heads, this attack does (\d+) damage to that pok/);
    if (fm) { const v = parseInt(fm[1], 10);
      out.base = v; out.kind = 'flat'; out.min = 0; out.typical = Math.round(v / 2); out.max = v; out.confidence = 'medium'; out.flip = 1; return out; }
    const n = cm ? parseInt(cm[1], 10) * 10 : dm ? parseInt(dm[1], 10) : tm ? parseInt(tm[1], 10) * parseInt(tm[2], 10) : 0;
    if (!n) return out; // effect-only attack
    out.base = n;
    if (cm && /for each/.test(cm[2])) {
      // Scales with something we cannot see. A hand is usually around 7.
      const hand = /for each card in your hand/.test(cm[2]);
      out.kind = 'times'; out.mult = null; out.base = 0;
      out.typical = n * (hand ? 7 : 3); out.max = n * (hand ? 10 : 5);
      out.min = 0; out.confidence = 'low';
      return out;
    }
    if (/\bif you have \d+ or more [^.,]+ in your discard pile/.test(tl)) {
      // Only once the discard pile condition is met, so treated as a bonus on 0.
      out.kind = 'plus'; out.base = 0; out.bonus = n;
      out.min = 0; out.typical = out.max = n; out.confidence = 'medium';
      return out;
    }
    out.kind = 'flat'; out.min = out.typical = out.max = n; out.confidence = 'medium';
    return out;
  }

  const m = s.match(/^(\d+)\s*([+\-x×*]?)$/i);
  if (!m) {
    // Unrecognised shape. Salvage leading digits, flag it.
    const n = parseInt(s.replace(/\D/g, ''), 10);
    out.base = Number.isFinite(n) ? n : 0;
    out.min = out.typical = out.max = out.base;
    out.confidence = 'low';
    return out;
  }

  out.base = parseInt(m[1], 10);
  let sym = m[2], upM = null;

  /* ---- Read the text first. The damage suffix is NOT reliable.
     Live example (hgss4-1 Aggron): damage is "40" with no "+", but the
     text reads "does 40 damage plus 40 more damage". Trusting the suffix
     alone understates every attack printed that way. ---- */
  const capM   = t.match(/can'?t\s+add\s+more\s+than\s+(\d+)\s+damage/i);
  // v54: "have this attack do 150 more damage" and "You may do 120 more damage" read the same way.
  // A bonus for the attacker's next turn ("During your next turn, attacks used by this
  // Pokemon do 120 more damage") is not part of this attack.
  const tNow = t.replace(/during your next turn, attacks used by this pok[e\u00e9]mon do \d+ more damage[^.]*\./ig, '');
  const fixedM = tNow.match(/(?:plus|does|do)\s+(\d+)\s+more\s+damage(?!\s+for\s+each)/i);
  const eachM  = tNow.match(/(?:plus|does|do)\s+(\d+)\s+more\s+damage\s+for\s+each/i);
  const minusM = t.match(/minus\s+(\d+)\s+damage\s+for\s+each/i);
  const coinsM = t.match(/flip\s+(\d+)\s+coins?/i);
  const tailsM = /flip a coin until you get tails/i.test(t);
  const oneCoin = /flip a coin\.\s*if heads/i.test(t);
  const tailsNothing = /flip a coin\.\s*if tails, this attack does nothing/i.test(t);
  if (capM) out.cap = parseInt(capM[1], 10);

  // Promote a bare number to "plus" or "minus" when the text says so.
  if (!sym) {
    if (fixedM || eachM) sym = '+';
    else if (minusM) sym = '-';
  }

  if (!sym) {
    out.kind = 'flat';
    out.min = out.typical = out.max = out.base;
    if (tailsNothing) { out.min = 0; out.typical = Math.round(out.base / 2); out.confidence = 'medium'; out.flip = 1; }
    return out;
  }

  if (sym === '-') {
    // Reduces under some condition, so base is the ceiling.
    out.kind = 'minus';
    out.max = out.base;
    out.typical = out.base;
    out.min = 0;
    out.confidence = 'medium';
    return out;
  }

  if (sym === 'x' || sym === '×' || sym === '*') {
    out.kind = 'times';
    if (tailsM) {
      // Heads before the first tails average one.
      out.mult = null; out.typical = out.base; out.max = out.base * 3; out.min = 0;
      out.confidence = 'medium'; out.flip = 'tails';
    } else if (coinsM) {
      out.flip = parseInt(coinsM[1], 10);
      out.mult = parseInt(coinsM[1], 10);
      out.max = out.base * out.mult;
      out.typical = Math.round(out.base * out.mult / 2); // expected heads
      out.min = 0;
      out.confidence = 'medium';
    } else if (/flip a coin for each [^.]*energy attached to this pok[e\u00e9]mon/i.test(t)) {
      // v54: a coin for each Energy on it. 3 Energy is the estimate, so 1.5 heads.
      out.mult = null; out.typical = Math.round(out.base * 1.5); out.max = out.base * 3; out.min = 0;
      out.confidence = 'medium'; out.flip = 'energy';
    } else if ((upM = t.match(/discard up to (\d+)\b([^.]*)\.?\s*this attack does \d+ (?:more )?damage for each card you discarded/i))) {
      // v54: "Discard up to 2 Energy ... for each card you discarded": the card caps it.
      // v56: the period between the two sentences is crossed. When it discards from this
      // Pokemon alone and the cap is over 3 (Ethan's Magcargo, 5), 3 attached is the estimate.
      out.mult = parseInt(upM[1], 10); out.max = out.base * out.mult; out.min = 0;
      const self = /from this pok[e\u00e9]mon/i.test(upM[2]) && out.mult > 3;
      out.typical = out.base * (self ? 3 : out.mult);
      out.confidence = self ? 'medium' : 'high';
    } else if (/discard any number of [^.]*? from your hand,? and this attack does \d+ damage for each card you discarded/i.test(t)) {
      // v60: "You may discard any number of Supporter cards that have Team Rocket in their name from
      // your hand" (Team Rocket's Honchkrow's Rocket Feathers): 3 from hand is the estimate, 5 the ceiling.
      out.mult = null; out.typical = out.base * 3; out.max = out.base * 5; out.min = 0;
      out.confidence = 'low';
    } else if ((upM = t.match(/put up to (\d+) damage counters? on this pok[e\u00e9]mon\.?\s*this attack does \d+ damage for each damage counter you placed/i))) {
      // v56: Walking Wake's Undulating Slice: it places up to 9 on itself, so the cap is the hit.
      out.mult = parseInt(upM[1], 10); out.typical = out.max = out.base * out.mult; out.min = 0;
      out.confidence = 'medium';
    } else {
      // Multiplier depends on board state we cannot see (energy, bench count).
      // v54: a full board is 6 Pokemon in play, 5 on the Bench. Anything else
      // gets a modest 2x typical, 4x ceiling. The confidence stays low.
      const inPlay = /for each of your pok[e\u00e9]mon in play\./i.test(t), bench = /for each of your benched pok[e\u00e9]mon\./i.test(t);
      out.mult = null;
      out.typical = out.base * (inPlay ? 5 : bench ? 4 : 2);
      out.max = out.base * (inPlay ? 6 : bench ? 5 : 4);
      out.min = 0;
      out.confidence = 'low';
    }
    return out;
  }

  // "+" : base plus a conditional bonus described in the text.
  out.kind = 'plus';
  out.min = out.base;

  if (fixedM) {
    out.bonus = parseInt(fixedM[1], 10);
    // v62: what the bonus waits on, when the text says ("If this Pokemon moved from your Bench to the Active Spot this turn").
    if (!oneCoin) { const nd = need62(tNow); if (nd) out.need = Object.assign(nd, { base: out.base, bonus: out.bonus }); }
    out.max = out.base + out.bonus;
    out.typical = out.base + out.bonus; // these conditions are usually achievable
    out.confidence = 'high';
    if (oneCoin) { out.typical = out.base + Math.round(out.bonus / 2); out.confidence = 'medium'; out.flip = 1; }
  } else if (eachM) {
    const per = parseInt(eachM[1], 10);
    out.bonus = per;
    if (tailsM) {
      // Heads before the first tails average one.
      out.typical = out.base + per; out.max = out.base + per * 3;
      out.confidence = 'medium'; out.flip = 'tails';
    } else if (coinsM) {
      const nC = parseInt(coinsM[1], 10);
      out.typical = out.base + Math.round(per * nC / 2); out.max = out.base + per * nC;
      out.confidence = 'medium'; out.flip = nC;
    } else if ((upM = t.match(/discard the top (\d+ cards?|card) of (your|each player's) deck[^.]*?(?:\.\s*|, and )this attack does \d+ more damage for each/i))) {
      // v56: a mill attack. About a third of what comes off the top counts; the grade
      // works it out from the list itself (mill56).
      const n = /^\d+/.test(upM[1]) ? parseInt(upM[1], 10) : 1, k = upM[2] === 'your' ? n : n * 2;
      out.max = out.base + per * k; out.typical = out.base + Math.round(per * k * 0.35 / 10) * 10;
      out.confidence = 'low';
    } else if ((upM = t.match(/discard up to (\d+) [^.]*?[.,]?\s*(?:and )?this attack does \d+ more damage for each card you discarded/i))) {
      // v55: "You may discard up to 2 Energy from your Benched Pokemon. This attack does
      // 60 more damage for each card you discarded" (Team Rocket's Mewtwo ex): the card caps it.
      out.max = out.typical = out.base + per * parseInt(upM[1], 10);
      out.confidence = 'high';
      // v56: 4 Energy from your hand every turn is a lot to ask (Mega Clefable ex), so 3 is the estimate.
      if (/from your hand/i.test(upM[0]) && parseInt(upM[1], 10) > 3) { out.typical = out.base + per * 3; out.confidence = 'medium'; }
    } else if (out.cap != null) {
      out.max = out.base + out.cap;
      out.typical = out.base + Math.round(out.cap / 2);
      out.confidence = 'medium';
    } else if ((upM = t.match(/for each (?:of your |of your opponent'?s |)benched pok[e\u00e9]mon( \(both yours and your opponent'?s\))?(?=\s*[.(])/i))) {
      // v60: counts a whole Bench, so the estimate is a normal Bench of 4, not 3. Both Benches
      // (Toucannon's Feather Rondo) are 4 each. Only some Benched Pokemon ("that has any Fire
      // Energy attached") stays at 3. The confidence stays low.
      const [ty, mx] = upM[1] ? [8, 10] : [4, 5];
      out.typical = out.base + per * ty; out.max = out.base + per * mx;
      out.confidence = 'low';
    } else {
      // Unbounded scaling. Assume 3 stacks typical, 5 for the ceiling.
      out.max = out.base + per * 5;
      out.typical = out.base + per * 3;
      out.confidence = 'low';
    }
  } else {
    // "+" suffix with no readable bonus in the text.
    out.max = out.cap != null ? out.base + out.cap : Math.round(out.base * 1.5);
    out.typical = out.base;
    out.confidence = 'low';
  }
  return out;
}

/** Energy cost array to lowercase type names. */
function parseCost(cost) {
  return (cost || []).map(c => String(c).toLowerCase()).filter(c => c && c !== 'free');
}

/** Stage from subtypes. Returns 'basic' | 'stage1' | 'stage2' | null. */
function parseStage(subtypes) {
  const st = (subtypes || []).map(s => s.toLowerCase());
  if (st.includes('stage 2')) return 'stage2';
  if (st.includes('stage 1')) return 'stage1';
  if (st.includes('basic')) return 'basic';
  return null;
}

/**
 * Prizes the opponent takes when this Pokemon is knocked out.
 * Derived from subtypes, since the API has no prize field.
 */
function parsePrizeValue(subtypes, rules) {
  const st = (subtypes || []).map(s => s.toLowerCase());
  const ruleText = (rules || []).join(' ').toLowerCase();
  // Rules text is authoritative when present ("your opponent takes 3 Prize cards")
  // v37: a Mega ex prints the ex rule (2) and the Mega rule (3); the larger one applies.
  const all = [...ruleText.matchAll(/takes?\s+(\d+)\s+prize/g)].map(x => parseInt(x[1], 10));
  if (all.length) return Math.max(...all);
  if (st.some(s => s === 'mega' || s === 'vmax' || s === 'vstar' || s === 'tag team')) return 3;
  if (st.some(s => s === 'ex' || s === 'v' || s === 'gx' || s === 'v-union')) return 2;
  return 1;
}

/**
 * Regulation mark handling.
 * Many older cards have NO regulationMark field at all. That is not the
 * same as "unknown" and not the same as "legal", so we distinguish:
 *   { mark: 'H', status: 'marked' }     card carries a mark
 *   { mark: null, status: 'premark' }   pre-dates the mark system, so rotated
 *   { mark: null, status: 'unknown' }   we could not resolve the card at all
 */
function parseRegulation(card, resolved) {
  if (!resolved) return { mark: null, status: 'unknown' };
  if (card.regulationMark) return { mark: card.regulationMark, status: 'marked' };
  return { mark: null, status: 'premark' };
}

/** True for basic energy cards, which are exempt from the 4-copy rule. */
function isBasicEnergy(card) {
  if (!card) return false;
  const sup = String(card.supertype || '').toLowerCase();
  const st = (card.subtypes || []).map(s => s.toLowerCase());
  return sup === 'energy' && st.includes('basic');
}

/** True for ACE SPEC cards, which are limited to 1 per deck. */
function isAceSpec(card) {
  const st = (card.subtypes || []).map(s => s.toLowerCase());
  if (st.includes('ace spec')) return true;
  return (card.rules || []).some(r => /ace spec/i.test(r));
}

/* ============================================================
   3. PROVIDES INFERENCE
   Semantic tags derived from rules[], abilities[].text, attacks[].text.
   Each rule is written to avoid the obvious false positive.
   ============================================================ */

/**
 * v60: one reader for what a Pokemon's Ability or attack does, from its printed text.
 * Used for the grade's role tags (at card read, with attack text) and for the plan's
 * phrases (at grade time, from the stored Ability text). Each sentence is matched on
 * its own, so a card from a new set grades from its words, not from a hand fix.
 * Returns { tags, say, need, cost }: tags the grade counts, plain phrases, and what
 * the effect needs first. Only what the text says is read; nothing is guessed.
 */
const GE_TY = 'grass|fire|water|lightning|psychic|fighting|darkness|metal|dragon|colorless|fairy';
function geCap(s) { return String(s || '').replace(/(^|[\s(])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/'S\b/g, "'s"); }
function geNum(w) { return /^an?$/.test(w) ? 1 : /^up to /.test(w) ? +w.slice(6) : /any number|all/.test(w) ? 99 : +w || 1; }
function geCnt(n, one, many) { return n === 1 ? (/^[aeiou]/i.test(one) ? 'an ' : 'a ') + one : (n >= 99 ? 'any number of ' : n + ' ') + many; }
/** "a Basic Metal Energy card" -> "Basic Metal Energy"; "an Ethan's Adventure card" -> "Ethan's Adventure". */
function geWhat(p) {
  p = String(p || '').replace(/^(?:up to \d+|any number of|an?|\d+|1 of each)\s+/, '').replace(/\s+cards?$/, '').replace(/\bpokemon\b/g, 'Pokemon').trim();
  return geCap(p).replace(/\bEx\b/g, 'ex').replace(/\bAnd\b/g, 'and').replace(/\bOr\b/g, 'or').replace(/\bOf\b/g, 'of').replace(/\bWith\b/g, 'with').replace(/\bHp\b/g, 'HP').replace(/\bThat\b/g, 'that');
}
const GE_LOW = new Set(['a','an','or','and','of','each','up','to','with','in','its','name','that','has','have','their','for','your','any','number','the','from','less','more','or','on','its','1','2','3','4','5','6']);
/** Card words with their capitals back: "an ethan's adventure card" -> "an Ethan's Adventure". */
function geTitle(w) {
  // v60: "a card" alone is any card (Pecharunt's Final Chain), not "a".
  if (/^(?:a|any) cards?$/.test(String(w || '').trim())) return 'any card';
  if (/^(?:up to )?\d+ cards?$/.test(String(w || '').trim())) return String(w).trim().replace(/^((?:up to )?1) cards$/, '$1 card');
  return String(w || '').replace(/ cards?\b/g, '').split(' ').map(x => GE_LOW.has(x) || /^\d+$/.test(x) ? x : x === 'pokemon' ? 'Pokemon' : x === 'ex' ? 'ex' : x === 'hp' ? 'HP' : x.replace(/^("?)([a-z])/, (q, a, c) => a + c.toUpperCase())).join(' ');
}
function geEffects(text) {
  const out = { tags: [], say: [], need: '', cost: '' };
  const t0 = String(text || '').replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[éÉ]/g, 'e').replace(/×/g, 'x')
    .toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t0) return out;
  const tags = new Set(), say = [];
  const S = t0.split(/\.(?:\s+|$)/).map(s => s.trim()).filter(Boolean);
  let m;
  // What it needs first, and what it costs.
  if ((m = t0.match(/if you have (?:any )?([a-z' -]+?) in play/))) out.need = `needs ${geWhat(m[1])} in play`;
  else if ((m = t0.match(new RegExp('if this pokemon has any (' + GE_TY + ') energy attached')))) out.need = `needs ${geCap(m[1])} Energy attached to it`;
  else if (/^if this pokemon is in the active spot and is damaged by an attack/.test(t0)) out.need = 'only when it is damaged while Active';
  else if (/(?:if|as long as) this pokemon is in the active spot/.test(t0)) out.need = 'only while it is Active';
  else if (/if any of your pokemon were knocked out during your opponent's last turn/.test(t0)) out.need = 'only after one of your Pokemon was Knocked Out';
  else if (/^if this pokemon is knocked out/.test(t0)) out.need = 'only when it is Knocked Out';
  else if (/^if this pokemon has a pokemon tool attached/.test(t0)) out.need = 'needs a Pokemon Tool attached to it';
  if ((m = t0.match(/discard (an?|\d+) ((?:basic )?(?:[a-z]+ )?(?:energy|cards?))(?: cards?)? from (your hand|this pokemon) in order to/)) ||
      (m = t0.match(/you must discard (an?|\d+) ((?:basic )?(?:[a-z]+ )?(?:energy|cards?))(?: cards?)? from (your hand|this pokemon)/)))
    out.cost = `discards ${geCnt(geNum(m[1]), geWhat(m[2]).replace(/^Cards?$/, 'card'), geWhat(m[2]).replace(/^Cards?$/, 'cards'))} from ${m[3] === 'this pokemon' ? 'itself' : 'your hand'}`;
  const many = /as often as you like/.test(t0);
  S.forEach(s => {
    const s0 = s;
    s = s.replace(/^(?:once during your (?:first )?turn|as often as you like during your turn|during your turn),?\s*/, '').replace(/^(?:(?:if|when|whenever|for each) [^,]+, (?:you may use this ability(?:, )?)?)+/, '').replace(/^(?:then,? |and )/, '').replace(/^you may /, '');
    // v62: "your opponent can't play any ACE SPEC cards" is a lock, read below (Genesect's ACE Nullifier).
    if (/^(?:your opponent|each player|they)\b/.test(s) && !/your opponent's (?:active|benched)/.test(s.slice(0, 40)) && !/can't play any (?:item|ace spec)/.test(s)) {
      if (/(?:shuffles?|discards?|reveals?|puts?) (?:their|his or her) hand|discards? (?:a |an |\d+ |up to \d+ )?cards? from (?:their|his or her) hand/.test(s)) { tags.add('hand_disruption'); say.push("disrupts your opponent's hand"); }
      return;
    }
    // Draw.
    if ((m = s.match(/^draw (a|an|\d+) cards?\b/)) || (m = s.match(/(?:^|, )(?:you may )?draw (a|an|\d+) cards?$/))) { tags.add('draw'); say.push(`draws ${geCnt(geNum(m[1]), 'card', 'cards')}`); return; }
    if ((m = s.match(/^(?:you may )?discard your hand and draw (\d+) cards/))) { tags.add('draw'); say.push(`discards your hand and draws ${m[1]} cards`); return; }
    if (/(?:have|has) your opponent shuffle (?:their|his or her) hand|discard (?:a |\d+ )?(?:random )?cards? from your opponent's hand/.test(s)) { tags.add('hand_disruption'); say.push("disrupts your opponent's hand"); return; }
    if ((m = s.match(/draw cards until you have (\d+) cards in your hand/))) { tags.add('draw'); say.push(`draws until you have ${m[1]} cards in hand`); return; }
    if ((m = s.match(/^look at the top (\d+) cards of your deck,? and put (?:up to )?(\d+|a card|1) of them into your hand/))) { tags.add('draw'); say.push(`looks at the top ${m[1]} cards of your deck and puts ${m[2] === 'a card' ? 1 : m[2]} into your hand`); return; }
    // Energy onto your Pokemon.
    if ((m = s.match(/^look at the top (\d+) cards of your deck,? and attach (.+?) you find there to (this pokemon|your [a-z' ]*pokemon|1 of your [a-z' ]*pokemon)/))) {
      tags.add('energy_accel'); say.push(`attaches ${/any number/.test(m[2]) ? 'any number of ' + geWhat(m[2].replace(/^any number of /, '')).replace(/ Energy$/, ' Energy') : geCnt(geNum(m[2].split(' ')[0]), geWhat(m[2]), geWhat(m[2]))} from the top ${m[1]} cards of your deck to ${m[3] === 'this pokemon' ? 'itself' : 'your Pokemon'}`); return; }
    // v62: the list may name more than one Energy ("a Basic Psychic Energy card, a Basic Metal Energy card, or 1 of each", Steven's Metagross ex's X-Boot).
    if ((m = s.match(/search your deck for (.+?energy[^.]*?)(?:,? reveal (?:it|them))?,? and attach (?:it|them) to (.+)$/))) {
      tags.add('energy_accel'); say.push(`searches your deck for ${geTitle(m[1])} and attaches ${/\b(?:them|1 of each|up to|\d+ basic)\b/.test(m[1] + ' ' + s) ? 'them' : 'it'} to ${/this pokemon/.test(m[2]) ? 'itself' : 'your Pokemon'}`); return; }
    if ((m = s.match(new RegExp('^attach (an?|\\d+|up to \\d+) (basic )?(?:(' + GE_TY + ') )?energy cards? from your (hand|discard pile|deck) to (this pokemon|1 of your (?:benched )?(.*?)pokemon|your (?:[a-z\\u0027 ]+ )?pokemon(?: in any way you like)?)')))) {
      tags.add('energy_accel');
      const n = geNum(m[1]), what = (m[2] ? 'Basic ' : '') + (m[3] ? geCap(m[3]) + ' ' : '') + 'Energy';
      const to = m[5] === 'this pokemon' ? 'itself' : m[6] ? `${/^[aeiou]/.test(m[6]) ? 'an' : 'a'} ${geWhat(m[6] + 'pokemon')}` : 'your Pokemon';
      say.push(`attaches ${/^up to/.test(m[1]) ? m[1] + ' ' + what : geCnt(n, what, what)} from your ${m[4]} to ${to}${many ? ', as often as you like' : ''}`); return; }
    if (/^attach [^.]*energy[^.]* to /.test(s) && !/opponent/.test(s)) { tags.add('energy_accel'); say.push('attaches extra Energy'); return; }
    // Search.
    if (/search your deck for (?:a card|[^,]+?) that evolves from .+ and put it onto/.test(s) || /search your deck for an? [a-z' ]+ and put it onto this [a-z' ]+ to evolve it/.test(s)) { tags.add('search_pokemon'); say.push('evolves a Pokemon straight from your deck'); return; }
    if (/^search your deck for a card,? shuffle your deck,? then put that card on top/.test(s)) { tags.add('search_card'); say.push('puts any card from your deck on top of it'); return; }
    if ((m = s.match(/^search your deck for (a pokemon tool[^,]*?)(?:,? reveal it)?,? and attach it to this pokemon/))) { tags.add('search_trainer'); say.push('searches your deck for a Pokemon Tool and attaches it to itself'); return; }
    if ((m = s.match(/^search your deck for (.+?)(?:,? reveal (?:it|them))?,? and put (?:it|them|1 of them) (into your hand|onto your bench)/))) {
      const w = m[1];
      const tag = /energy/.test(w) && !/pokemon/.test(w) ? 'search_energy' : /pokemon/.test(w) || m[2] === 'onto your bench' ? 'search_pokemon' : /supporter/.test(w) ? 'search_supporter' : /\bitem\b/.test(w) ? 'search_item' : /tool|stadium|trainer/.test(w) ? 'search_trainer' : /^(?:a|an|\d+|up to \d+) cards?$/.test(w) ? 'search_card' : 'search_trainer';
      tags.add(tag); if (/\bbasic pokemon\b|\bbasic [a-z]+ pokemon\b/.test(w)) tags.add('search_basic');
      say.push(`searches your deck for ${geTitle(w)}${tag === 'search_trainer' && !/item|supporter|tool|stadium|trainer/.test(w) ? (geNum(w.split(' ').slice(0, /^up to /.test(w) ? 3 : 1).join(' ')) === 1 ? ' card' : ' cards') : ''}${m[2] === 'onto your bench' ? ' for your Bench' : ''}`); return; }
    // Damage counters and damage to the Bench.
    if ((m = s.match(/move (up to )?(\d+|any number of) damage counters? from (?:1 of )?your pokemon to (?:1 of )?your opponent's pokemon/))) {
      tags.add('move_counters'); say.push(`moves ${m[1] ? 'up to ' : ''}${m[2]} damage counters from your Pokemon to your opponent's`); return; }
    if (/move (?:up to \d+ |any number of |\d+ )?damage counters?/.test(s)) { tags.add('move_counters'); say.push('moves damage counters'); return; }
    if ((m = s.match(/(?:choose (\d+) of your opponent's (?:benched )?pokemon and )?(?:put|place) (\d+) damage counters? on (?:each of them|1 of your opponent's (benched )?pokemon|each of your opponent's (benched )?pokemon|your opponent's (benched )?pokemon in any way you like)/))) {
      const n = +m[2], dc = n === 1 ? 'damage counter' : 'damage counters';
      if (m[1] || /each of your opponent|in any way you like/.test(s)) { tags.add('spread_counters'); say.push(m[1] ? `puts ${n} ${dc} on each of ${m[1]} of your opponent's Pokemon` : /in any way/.test(s) ? `puts ${n} ${dc} on your opponent's ${m[5] ? 'Benched ' : ''}Pokemon in any way you like` : `puts ${n} ${dc} on each of your opponent's ${m[4] ? 'Benched ' : ''}Pokemon`); }
      else { tags.add('snipe'); say.push(`puts ${n} ${dc} on 1 of your opponent's ${m[3] ? 'Benched ' : ''}Pokemon`); }
      return; }
    if ((m = s.match(/does (\d+) damage to (1|2|3|each|each of 2|\d+) of your opponent's (benched )?pokemon/)) || (m = s.match(/does (\d+) damage to (each) of your opponent's (benched )?pokemon/)) || (/for each of your opponent's pokemon, flip/.test(t0) && (m = s.match(/does (\d+) damage to (that) pokemon/)))) {
      const bn = m[3] ? 'Benched ' : '', also = /also does/.test(s) ? 'also does' : 'does';
      if (m[2] === '1') { tags.add('snipe'); say.push(also === 'does' ? `can hit any 1 of your opponent's ${bn ? 'Benched ' : ''}Pokemon for ${m[1]}${bn ? '' : ', Benched ones too'}` : `also does ${m[1]} damage to 1 of your opponent's ${bn}Pokemon`); }
      else if (m[2] === 'that') { tags.add('spread_counters'); say.push(`flips a coin for each of your opponent's Pokemon and does ${m[1]} to each one that comes up heads`); }
      else { tags.add('spread_counters'); say.push(also === 'does' ? `hits ${m[2]} of your opponent's ${bn}Pokemon for ${m[1]}${/^each$/.test(m[2]) ? '' : ' each'}` : `also does ${m[1]} damage to ${m[2]} of your opponent's ${bn}Pokemon`); }
      return; }
    if ((m = s.match(/(?:put|place) (\d+) damage counters? on each pokemon (?:that has an ability|in play)/))) { tags.add('spread_counters'); say.push(`puts ${geCnt(+m[1], 'damage counter', 'damage counters')} on each Pokemon ${/ability/.test(s) ? 'with an Ability' : 'in play'}${/checkup/.test(s) ? ' every Pokemon Checkup' : ''}`); return; }
    // Moving Pokemon.
    if (/switch (?:in )?(?:1 of )?your opponent's benched pokemon (?:with (?:their|his or her) active pokemon|to the active spot)/.test(s)) { tags.add('gust'); say.push("pulls 1 of your opponent's Benched Pokemon into the Active Spot"); return; }
    if ((m = s.match(/switch (?:1 of )?your benched ([a-z' ]*?)pokemon(?:, except any [^,]+,)? with your active pokemon/)) || (m = s.match(/switch your active pokemon with 1 of your benched ([a-z' ]*?)pokemon/))) {
      tags.add('switch_own'); say.push(`switches ${m[1] ? (/^[aeiou]/.test(m[1]) ? 'an ' : 'a ') + 'Benched ' + geWhat(m[1] + 'pokemon') : 'in a Benched Pokemon'} ${m[1] ? 'into the Active Spot' : ''}`.trim()); return; }
    if (/switch (?:it|this pokemon) with your active pokemon/.test(s)) { tags.add('switch_own'); say.push('switches itself into the Active Spot'); return; }
    if (/switch this pokemon with 1 of your benched pokemon/.test(s)) { tags.add('switch_own'); say.push('switches itself out to your Bench'); return; }
    if (/have no retreat cost|has no retreat cost/.test(s) && /your/.test(s)) { tags.add('switch_own'); return; }
    if (/^move (?:an?|any amount of|all|\d+) (?:basic )?(?:[a-z]+ )?energy from (?:1 of )?your benched pokemon to your active pokemon/.test(s)) { tags.add('energy_move'); say.push('moves Energy from your Bench to your Active Pokemon'); return; }
    // Always-on extra HP and damage cuts for your own Pokemon (Ludicolo's Vibrant Dance, Aurorus's
    // Tundra Wall). Said in the plan only, with no tag, so no grade moves.
    if ((m = s.match(/^(?:all of |each of )?your ((?:basic |[a-z]+ )?)pokemon(?: in play)? gets? \+(\d+) hp$/))) {
      say.push(`gives ${m[1] ? 'each of your ' + geWhat(m[1] + 'pokemon') : 'each of your Pokemon'} in play ${m[2]} more HP`); return; }
    if ((m = s.match(new RegExp("^(?:all of |each of )?your ((?:basic |" + GE_TY + " )?)pokemon(?: in play)?(?: that ha(?:s|ve) any (" + GE_TY + ") energy attached)? takes? (\\d+) less damage from attacks from your opponent's pokemon$")))) {
      say.push(`makes each of your ${m[1] ? geWhat(m[1] + 'pokemon') : 'Pokemon'}${m[2] ? ` with ${geCap(m[2])} Energy attached` : ''} take ${m[3]} less damage from your opponent's attacks`); return; }
    // Damage boosts and locks.
    if ((m = s.match(/attacks used by your (.+?)(?:, except [^,]+,)? do (\d+) more damage/))) { tags.add('damage_boost'); say.push(`your ${geWhat(m[1])} do ${m[2]} more damage`); return; }
    // v62: "both yours and your opponent's" sits in parentheses, which are dropped, so "in play" counts too (Iron Thorns ex's Initialization).
    if (/ha(?:s|ve) no abilities/.test(s) && /opponent|in play/.test(s)) { tags.add('ability_lock');
      say.push(/rule box/.test(s) ? 'turns off the Abilities of every Pokemon with a Rule Box on both sides' : /opponent/.test(s) ? "turns off your opponent's Abilities" : 'turns off Abilities for both players'); return; }
    if (/(?:opponent|they) can't play any (?:item|ace spec)/.test(s)) { tags.add('item_lock'); say.push(/ace spec/.test(s) ? 'stops your opponent playing ACE SPEC cards' : 'stops your opponent playing Items'); return; }
    if ((m = s.match(/discard (?:an?|\d+|all) energy from (?:your opponent's active pokemon|1 of your opponent's pokemon)/))) { tags.add('energy_denial'); say.push("discards Energy from your opponent's Pokemon"); return; }
    if ((m = s.match(/^heal (\d+|all) damage from (?:each of )?your pokemon|^heal (\d+|all) damage from 1 of your pokemon/))) { tags.add('heal'); return; }
  });
  out.tags = [...tags]; out.say = [...new Set(say)];
  return out;
}

/** Collect every piece of effect text on a card into one lowercase blob. */
function effectText(card) {
  const parts = [];
  (card.rules || []).forEach(r => parts.push(r));
  (card.abilities || []).forEach(a => parts.push(a.text || ''));
  (card.attacks || []).forEach(a => parts.push(a.text || ''));
  return parts.join(' \n ').toLowerCase();
}

/** Text from rules + abilities only (excludes attacks). */
function staticText(card) {
  const parts = [];
  (card.rules || []).forEach(r => parts.push(r));
  (card.abilities || []).forEach(a => parts.push(a.text || ''));
  return parts.join(' \n ').toLowerCase();
}

const PROVIDES_RULES = [
  {
    tag: 'draw',
    // v55: cards your opponent draws (Special Red Card's "they draw 3 cards") are not yours.
    // "Look at the top 8 cards of your deck and put up to 3 of them into your hand" (Hassel) is.
    test: (all0) => { const all = all0.replace(/\b(?:your\s+opponent|they)\s+draws?\s+\d+\s+cards?/g, '');
      return /\bdraw\s+\d+\s+cards?/.test(all) ||
      /\bdraw\s+cards?\s+until/.test(all) ||
      /\bdraws?\s+that\s+many\s+cards?/.test(all) ||
      /\bdraw\s+a\s+card/.test(all) ||
      /look\s+at\s+the\s+top\s+\d+\s+cards\s+of\s+your\s+deck\s+and\s+put\s+(?:up\s+to\s+)?\d+\s+of\s+them\s+into\s+your\s+hand/.test(all); },
    // A one-off "Draw a card." attack is not a draw engine.
    weak: (all, card) =>
      !/\bdraw\s+\d+\s+cards?|\bdraw\s+cards?\s+until|\bdraws?\s+that\s+many/.test(staticText(card)) &&
      /\bdraw\s+a\s+card\b/.test(all),
  },
  {
    tag: 'search_basic',
    // v55: also "for a Basic Fighting Energy card or a Basic Fighting Pokemon" (Fighting Gong).
    // 2.6.8: also a Stadium's "search their deck" (Lumiose City, Artazon) and owner names
    // ("Basic Team Rocket's Pokemon", "Basic Hop's Pokemon"); not a Basic named after another Pokemon (Grand Tree).
    test: (all) => /search\s+(?:your|their)\s+deck\s+for(?:(?!pok[eé]mon)[^.]){0,50}\bbasic\s+(?:(?!energy\b)[\w'’]+\s+){0,3}pok[eé]mon/.test(all),
  },
  {
    tag: 'search_pokemon',
    // v55: up to 60 letters, but not an Energy search that attaches to a Pokemon (Mega Gardevoir ex's Overflowing Wishes).
    // v65: "a Pokemon Tool card" is not a Pokemon (Secret Box).
    // 2.6.8: also a Stadium's "search their deck" (Spikemuth Gym) and "look at the bottom 7 cards of your deck.
    // You may reveal a Pokemon you find there" (Dusk Ball, Bug Catching Set).
    test: (all) => /search\s+your\s+deck\s+for(?:(?!energy|pok[eé]mon\s+tool)[^.]){0,60}pok[eé]mon(?!\s+tool)/.test(all) ||
      /search\s+their\s+deck\s+for(?:(?!energy|pok[eé]mon\s+tool|evolves)[^.]){0,60}pok[eé]mon(?!\s+(?:tool|that\s+evolves))/.test(all) ||
      /look\s+at\s+the\s+(?:top|bottom)\s+\d+\s+cards\s+of\s+your\s+deck\.\s*you\s+may\s+reveal(?:(?!energy\s+card|supporter|\bitem|trainer)[^.]){0,60}?pok[eé]mon(?!\s+tool)[^.]{0,60}you\s+find\s+there/.test(all),
  },
  {
    tag: 'gust',
    // Pulling the opponent's benched Pokemon into the active spot.
    test: (all) =>
      /switch(?:\s+in)?\s+(?:1|one)?\s*of\s+your\s+opponent'?s?\s+benched\s+pok[eé]mon/.test(all) ||
      /switch\s+(?:1|one)\s+of\s+your\s+opponent'?s?\s+benched\s+pok[eé]mon\s+with\s+(?:their|his\s+or\s+her)\s+active/.test(all),
  },
  {
    tag: 'hand_disruption',
    test: (all) =>
      /(?:your\s+)?opponent\s+shuffles?\s+(?:their|his\s+or\s+her)\s+hand/.test(all) ||
      /each\s+player\s+shuffles?\s+(?:their|his\s+or\s+her)\s+hand/.test(all) ||
      /discard\s+(?:a|\d+)\s+cards?\s+from\s+your\s+opponent'?s?\s+hand/.test(all) ||
      /your\s+opponent\s+reveals?\s+(?:their|his\s+or\s+her)\s+hand/.test(all) ||
      // v55: "Your opponent discards cards from their hand until they have 3" (Xerosic's Machinations).
      /your\s+opponent\s+discards?\s+cards?\s+from\s+(?:their|his\s+or\s+her)\s+hand/.test(all),
  },
  {
    tag: 'energy_accel',
    // Attaching energy from somewhere other than hand, or extra attachments.
    // Excludes the normal once-per-turn attachment from hand.
    test: (all) =>
      /attach[^.]{0,60}energy[^.]{0,40}from\s+your\s+(?:deck|discard\s+pile)/.test(all) ||
      /attach\s+as\s+many[^.]{0,40}energy/.test(all) ||
      /doesn'?t\s+use\s+up\s+your\s+(?:1\s+)?energy\s+(?:card\s+)?attachment/.test(all) ||
      /attach\s+\d+\s+basic\s+energy[^.]{0,40}from\s+your\s+deck/.test(all) ||
      // 2.6.8: "search your deck for a Basic Darkness Energy card and attach it" (Janine's Secret Art, Geeta)
      // and "look at the top 5 cards of your deck and attach ... Energy cards you find there" (Electric Generator).
      /search\s+your\s+deck\s+for[^.]{0,60}energy[^.]{0,40}\band\s+attach\s+(?:it|them)\b/.test(all) ||
      /look\s+at\s+the\s+top\s+\d+\s+cards\s+of\s+your\s+deck\s+and\s+attach[^.]{0,80}energy[^.]{0,30}you\s+find\s+there/.test(all),
  },
  {
    tag: 'spread_counters',
    test: (all) =>
      /damage\s+to\s+each\s+of\s+your\s+opponent'?s?\s+pok[eé]mon/.test(all) ||
      /put\s+\d+\s+damage\s+counters?\s+on\s+each\s+of\s+your\s+opponent'?s?\s+pok[eé]mon/.test(all) ||
      /damage\s+to\s+each\s+of\s+your\s+opponent'?s?\s+benched\s+pok[eé]mon/.test(all) ||
      (/opponent'?s?\s+benched\s+pok[eé]mon/.test(all) && /damage\s+to\s+each\s+of/.test(all)),
  },
  {
    // v60: cards that set what you draw or turn over next (Ciphermaniac's Codebreaking puts
    // 2 cards it found on top of the deck, Academy at Night puts a card from hand there).
    // A copy attack off the top of the deck (Slowking's Seek Inspiration) counts on these.
    tag: 'top_set',
    test: (all) =>
      /search\s+your\s+deck\s+for[^.]{0,60}?[,.]\s*(?:then,?\s+)?shuffle[^.]{0,40}then\s+put\s+(?:those|th(?:e|at))\s+cards?\s+on\s+top/.test(all) ||
      /put\s+(?:a|1|up\s+to\s+\d+)\s+cards?\s+from\s+(?:their|your)\s+hand\s+on\s+top\s+of\s+(?:their|your)\s+deck/.test(all),
  },
  {
    tag: 'move_counters',
    test: (all) =>
      /move\s+\d*\s*damage\s+counters?/.test(all) ||
      /move\s+(?:any\s+number\s+of\s+)?damage\s+counters?/.test(all),
  },
  {
    tag: 'damage_boost',
    // Tools and stadiums that add damage to attacks generally.
    test: (all, card) => {
      const st = staticText(card);
      return /attacks?[^.]{0,50}do\s+\d+\s+more\s+damage/.test(st) ||
             /does\s+\d+\s+more\s+damage[^.]{0,40}opponent'?s?\s+active/.test(st);
    },
  },
  {
    tag: 'evolution_access',
    // Rare Candy and its equivalents: skip the Stage 1 step.
    test: (all) =>
      /evolve\s+it\s+into\s+a\s+stage\s+2/.test(all) ||
      /choose\s+\d+\s+of\s+your\s+basic\s+pok[eé]mon[^.]{0,80}stage\s+2/.test(all) ||
      // v55: Grand Tree: a Stage 1, then a Stage 2, from the deck in the same turn.
      /search\s+(?:their|your)\s+deck\s+for\s+a\s+stage\s+2\s+pok[eé]mon\s+that\s+evolves\s+from\s+that\s+pok[eé]mon/.test(all),
  },
  {
    tag: 'recovery',
    test: (all) =>
      /put\s+(?:a|\d+|up\s+to\s+\d+)[^.]{0,90}from\s+your\s+discard\s+pile\s+into\s+your\s+hand/.test(all) ||
      /shuffle[^.]{0,60}from\s+your\s+discard\s+pile\s+into\s+your\s+deck/.test(all),
  },
  {
    tag: 'switch_own',
    test: (all) =>
      /switch\s+(?:your|this)[^.]{0,40}active\s+pok[eé]mon\s+with\s+(?:1|one)\s+of\s+your\s+benched/.test(all) ||
      /switch\s+this\s+pok[eé]mon\s+with\s+(?:1|one)\s+of\s+your\s+benched/.test(all) ||
      // v55: a Tool that cuts Retreat Cost by 2 or more (Air Balloon) is a way out of the Active Spot.
      /retreat\s+cost\s+of\s+the\s+pok[eé]mon\s+this\s+card\s+is\s+attached\s+to\s+is\s+(?:colorless){2,}\s+less/.test(all),
  },
];

/**
 * Derive provides tags. Returns { tags: [...], weak: [...], confidence }.
 * `weak` lists tags that matched only via a marginal signal, so a caller
 * can choose to discount them rather than treat them as a real engine.
 */
function inferProvides(card) {
  const all = effectText(card);
  const tags = [];
  const weak = [];
  if (!all) return { tags, weak, confidence: 'none' };

  PROVIDES_RULES.forEach(rule => {
    let matched = false;
    try { matched = !!rule.test(all, card); } catch (e) { matched = false; }
    if (!matched) return;
    tags.push(rule.tag);
    if (rule.weak) {
      let isWeak = false;
      try { isWeak = !!rule.weak(all, card); } catch (e) { isWeak = false; }
      if (isWeak) weak.push(rule.tag);
    }
  });

  // v60: what each Ability and attack does, read sentence by sentence (geEffects).
  // Draw from an attack stays with the rule above, which knows a one-off draw is weak.
  (card.abilities || []).forEach(x => geEffects(x.text).tags.forEach(t => tags.push(t)));
  (card.attacks || []).forEach(x => geEffects(x.text).tags.filter(t => t !== 'draw').forEach(t => tags.push(t)));
  // search_basic implies search_pokemon; keep both but dedupe.
  // v59: the comment said so but the code never added it (Fighting Gong read as Basic search only).
  if (tags.includes('search_basic')) tags.push('search_pokemon');
  const uniq = [...new Set(tags)];
  return { tags: uniq, weak, confidence: uniq.length ? 'inferred' : 'none' };
}

/**
 * Derive requires tags. Two of the three kinds are structural, not semantic:
 *   energy:<type>       from attack costs
 *   evolution_access    from being a Stage 2
 * The third kind (partner:<card>) cannot be inferred and must come from
 * the override map.
 */
function inferRequires(card) {
  const reqs = [];
  const types = new Set();
  (card.attacks || []).forEach(a => {
    parseCost(a.cost).forEach(ty => {
      if (ty && ty !== 'colorless') types.add(ty);
    });
  });
  types.forEach(ty => reqs.push('energy:' + ty));
  if (parseStage(card.subtypes) === 'stage2') reqs.push('evolution_access');
  return reqs;
}

/* ============================================================
   4. OVERRIDE MAP
   Inference gets most cards right. This corrects the rest and
   supplies partner links, which are not inferable from text.

   Keys are lowercase card names. Any field present here wins over
   the inferred value. `addProvides` appends instead of replacing.
   ============================================================ */

const OVERRIDES = {
  // Partner relationships: card does nothing without X in play.
  // (Add entries as you hit them; this is the one genuinely manual list.)
  // "dusknoir":       { requires: ['partner:dusclops'] },

  // Inference corrections.
  'rare candy':       { provides: ['evolution_access'] },
  "professor's research": { provides: ['draw'] },
  "boss's orders":    { provides: ['gust'] },
  'iono':             { provides: ['draw', 'hand_disruption'] },
  'arven':            { provides: ['search_item'] },
  'ultra ball':       { provides: ['search_pokemon'] },
  'nest ball':        { provides: ['search_basic', 'search_pokemon'] },
  'buddy-buddy poffin': { provides: ['search_basic', 'search_pokemon'] },
  'earthen vessel':   { provides: ['energy_accel'] },
  'night stretcher':  { provides: ['recovery'] },
  'super rod':        { provides: ['recovery'] },
  'counter catcher':  { provides: ['gust'] },
  'switch':           { provides: ['switch_own'] },
  'energy switch':    { provides: [] },   // moves energy, does not accelerate
  'energy search':    { provides: [] },   // fetches basic energy, not accel
  "lillie's determination": { provides: ['draw'] },
  'carmine':          { provides: ['draw'] },
  'judge':            { provides: ['draw', 'hand_disruption'] },
  'dawn':             { provides: ['search_pokemon'] },
  'hilda':            { provides: ['search_pokemon'] },
  'poke pad':         { provides: ['search_pokemon'] },
  'precious trolley': { provides: ['search_basic', 'search_pokemon'] },
  "brock's scouting": { provides: ['search_basic', 'search_pokemon'] },
  "team rocket's petrel": { provides: ['search_item'] },
  'crispin':          { provides: ['energy_accel'] },
  'energy retrieval': { provides: ['recovery'] },
  "lana's aid":       { provides: ['recovery'] },
  'pokemon catcher':  { provides: ['gust'] },
  'prime catcher':    { provides: ['gust', 'switch_own'] },
};

/** Look up an override by card name, case and punctuation tolerant. */
function findOverride(name) {
  if (!name) return null;
  const k = String(name).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019\u2018]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return OVERRIDES[k] || null;
}

/* ============================================================
   5. ENRICHMENT
   Turn one raw API card into the shape the grader consumes.
   ============================================================ */

/**
 * The condition on a damage bonus that needs cards in the discard pile,
 * read from the attack text: "If you have 4 or more Pokemon that have the
 * Hide 'n' Sneak Ability in your discard pile". Returns
 * { n, what, ability, kind } or null when the bonus has no such condition.
 */
function damageCondition(text) {
  const m = String(text || '').match(/if you have (\d+) or more ([^.,]+?) in your discard pile/i);
  if (!m) return null;
  const what = m[2].trim();
  const ab = what.match(/that have (?:the )?(.+?) abilit(?:y|ies)/i);
  return {
    n: parseInt(m[1], 10),
    what: what.replace(/\bAbility\b/g, 'ability'),
    ability: ab ? ab[1].trim() : null,
    kind: /energy/i.test(what) ? 'energy' : /pok[eé]mon/i.test(what) ? 'pokemon' : /supporter|item|trainer/i.test(what) ? 'trainer' : 'card',
  };
}

/**
 * v62: the condition on a fixed damage bonus, read from the attack text. Gives { k } and
 * what it names, or null when the text names none of these:
 *   moved    "If this Pokemon moved from your Bench to the Active Spot this turn" (Mega Lopunny ex)
 *   selfdmg  "If this Pokemon has any damage counters on it" (Mega Sharpedo ex)
 *   oppdmg   "If your opponent's Active Pokemon already has any damage counters on it" (Mega Golisopod ex)
 *   deck     "If there are 3 or fewer cards in your deck" (Rabsca)
 *   xenergy  "If this Pokemon has at least 2 extra Energy attached" (Mega Excadrill ex)
 *   stadium  "If you have a Stadium in play" (Dhelmise)
 *   btype    "If you have any Metal Pokemon on your Bench" (Dhelmise)
 *   bnames   "If Beldum and Metang are on your Bench" (Metagross)
 */
function need62(text) {
  const t = String(text || '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\u00e9/g, 'e').toLowerCase();
  let m;
  if (/moved from your bench to the active spot this turn/.test(t)) return { k: 'moved' };
  if (/if this pokemon has (?:any|\d+ or more) damage counters on it/.test(t)) return { k: 'selfdmg' };
  // v62: a comeback bonus (Koraidon ex's Orichalcum Fang) works only after you lost a Pokemon.
  if (/if any of your pokemon were knocked out[^.]*during your opponent's last turn/.test(t)) return { k: 'ko' };
  if ((m = t.match(/if this pokemon has any ([a-z' ]+?) energy attached/))) return { k: 'energy', what: m[1] };
  if ((m = t.match(/if you played a supporter card that has "([^"]+)" in its name/))) return { k: 'supname', name: m[1] };
  if ((m = t.match(/if you have (\d+) or more pokemon that have the ([a-z0-9' -]+?) ability in your discard pile/))) return { k: 'discab', n: +m[1], abil: m[2] };
  if (/if your opponent's active pokemon (?:already )?has (?:any )?damage counters on it/.test(t)) return { k: 'oppdmg' };
  if ((m = t.match(/if there are (\d+) or fewer cards in your deck/))) return { k: 'deck', n: +m[1] };
  // v62: only before you take a prize (Steelix's Welcoming Tail), on the turn it evolves (Magnezone's Upper Spark),
  // or with enough Energy of a type in play (Raikou's Electro Fall).
  if (/if you have exactly 6 prize cards remaining/.test(t)) return { k: 'prize6' };
  if (/^during your next turn, this pokemon's [^.]*? attack does \d+ more damage/.test(t)) return { k: 'next' };
  if ((m = t.match(/if this pokemon evolved from ([a-z' -]+?) during this turn/))) return { k: 'evolved', from: m[1] };
  if ((m = t.match(/if you have at least (\d+) ([a-z]+) energy in play/))) return { k: 'inplay', n: +m[1], type: m[2] };
  if ((m = t.match(/has at least (\d+) extra energy attached/))) return { k: 'xenergy', n: +m[1] };
  if (/if you have a stadium in play|if a stadium is in play/.test(t)) return { k: 'stadium' };
  if ((m = t.match(/if you have any (\w+) pokemon on your bench/))) return { k: 'btype', type: m[1] };
  if ((m = t.match(/if ([a-z][a-z' -]*?(?:,? and [a-z][a-z' -]*?)?) (?:is|are) (?:both )?on your bench/))) return { k: 'bnames', names: m[1].split(/,? and |, /).map(x => x.trim()).filter(Boolean) };
  return null;
}

// v37: card fixes. Each one was checked against the printed card (Limitless, pokemon-tcg-data).
// data.json can add more under cardFixes, written by the weekly card check.
// Keys are card ids from either source: pokemontcg.io (sv5-140) or TCGdex (sv05-140).
const FIX37 = {
  // pokemontcg.io lists these as H; the printed cards carry G (Limitless).
  'sv5-22': { mark: 'G' }, 'sv5-140': { mark: 'G' }, 'sv5-149': { mark: 'G' },
  'sv6-161': { mark: 'G' }, 'sv6-226': { mark: 'G' }, 'sv8-252': { mark: 'G' },
  // TCGdex lists Azurill's Bouncy-Bounce Charge as an Ability; it is a 0 cost attack.
  'me06-080': { abToAtk: 'Bouncy-Bounce Charge' }, 'me06-115': { abToAtk: 'Bouncy-Bounce Charge' },
  // TCGdex lists these Delta Reign and 30th Celebration cards as Basic with nothing to evolve from.
  'me06-011': { stage: 'Stage1', from: 'Wimpod' }, 'me06-118': { stage: 'Stage1', from: 'Wimpod' }, 'me06-135': { stage: 'Stage1', from: 'Wimpod' },
  'me06-047': { stage: 'Stage1', from: 'Golett' }, 'me06-122': { stage: 'Stage1', from: 'Golett' }, 'me06-137': { stage: 'Stage1', from: 'Golett' },
  'me06-069': { stage: 'Stage1', from: 'Inkay' }, 'me06-123': { stage: 'Stage1', from: 'Inkay' },
  'me06-067': { stage: 'Stage1', from: 'Zorua' }, 'me06-014': { stage: 'Stage2', from: 'Floragato' },
  'me06-088': { stage: 'Stage2', from: 'Fletchinder' }, 'me06-124': { stage: 'Stage2', from: 'Fletchinder' },
  '30th-021': { stage: 'Stage2', from: 'Frogadier' }, '30th-148': { stage: 'Stage2', from: 'Frogadier' },
  '30th-070': { stage: 'Stage1', from: 'Eevee' }, '30th-071': { stage: 'Stage1', from: 'Eevee' },
  '30th-092': { stage: 'Stage1', from: 'Eevee' }, '30th-153': { stage: 'Stage1', from: 'Eevee' },
  '30th-090': { stage: 'Stage2', from: 'Haunter' }, '30th-154': { stage: 'Stage2', from: 'Haunter' },
  '30th-109': { stage: 'Stage2', from: 'Shelgon' }, '30th-156': { stage: 'Stage2', from: 'Shelgon' },
  // TCGdex leaves out what these Delta Reign Pokemon evolve from.
  'me06-003': { from: 'Surskit' }, 'me06-104': { from: 'Surskit' }, 'me06-005': { from: 'Cacnea' }, 'me06-007': { from: 'Combee' },
  'me06-013': { from: 'Sprigatito' }, 'me06-016': { from: 'Smoliv' }, 'me06-017': { from: 'Dolliv' }, 'me06-019': { from: 'Growlithe' },
  'me06-021': { from: 'Magmar' }, 'me06-107': { from: 'Magmar' }, 'me06-028': { from: 'Frillish' }, 'me06-031': { from: 'Electabuzz' },
  'me06-108': { from: 'Electabuzz' }, 'me06-032': { from: 'Eevee' }, 'me06-038': { from: 'Pawmi' }, 'me06-039': { from: 'Pawmo' },
  'me06-041': { from: 'Wattrel' }, 'me06-044': { from: 'Drowzee' }, 'me06-050': { from: 'Sandshrew' }, 'me06-052': { from: 'Onix' },
  'me06-056': { from: 'Nidoran\u2640' }, 'me06-057': { from: 'Nidorina' }, 'me06-059': { from: 'Spinarak' }, 'me06-062': { from: 'Carvanha' },
  'me06-065': { from: 'Purrloin' }, 'me06-074': { from: 'Jangmo-o' }, 'me06-075': { from: 'Hakamo-o' }, 'me06-082': { from: 'Swablu' },
  'me06-116': { from: 'Swablu' }, 'me06-087': { from: 'Fletchling' },
  // 2.5.5: pokemontcg.io gaps and typos, checked against Limitless.
  'me5-115': { stage: 'Stage2' },                                  // Mega Chandelure ex: no stage listed
  'me55-96': { from: 'Zorua' },                                    // Zoroark: nothing to evolve from
  'rsv10pt5-50': { from: 'Antique Plume Fossil' }, 'rsv10pt5-131': { from: 'Antique Plume Fossil' },   // Archen: "Antiuqe"
  // 2.5.5: TCGdex gaps, filled from pokemon-tcg-data on 13 Nov 2026 (what each Pokemon evolves from,
  // and the text of Trainers and Special Energy that TCGdex leaves blank).
  '30th-002': { from: 'Exeggcute' },
  '30th-007': { from: 'Cherubi' },
  '30th-008': { from: 'Spewpa' },
  '30th-010': { from: 'Vulpix' },
  '30th-059': { from: 'Toxel' },
  '30th-060': { from: 'Toxel' },
  '30th-068': { from: 'Marill' },
  '30th-069': { from: 'Eevee' },
  '30th-075': { from: 'Lampent' },
  '30th-079': { from: 'Cosmog' },
  '30th-080': { from: 'Cosmoem' },
  '30th-083': { from: 'Riolu' },
  '30th-084': { from: 'Palpitoad' },
  '30th-085': { from: 'Rockruff' },
  '30th-088': { from: 'Nidoran\u2640' },
  '30th-091': { from: 'Eevee' },
  '30th-096': { from: 'Zorua' },
  '30th-098': { from: 'Deino' },
  '30th-099': { from: 'Zweilous' },
  '30th-104': { from: 'Ferroseed' },
  '30th-105': { from: 'Cosmoem' },
  '30th-108': { from: 'Gimmighoul' },
  '30th-111': { from: 'Jangmo-o' },
  '30th-112': { from: 'Hakamo-o' },
  '30th-123': { from: 'Hisuian Zorua' },
  '30th-125': { from: 'Tandemaus' },
  '30th-128': { text: 'You can use this card only if you discard 2 other cards from your hand. Search your deck for a Pok\u00e9mon, reveal it, and put it into your hand. Then, shuffle your deck.' },
  '30th-129': { from: 'Exeggcute' },
  '30th-134': { from: 'Toxel' },
  '30th-137': { from: 'Lampent' },
  '30th-138': { from: 'Rockruff' },
  '30th-142': { from: 'Gimmighoul' },
  '30th-143': { from: 'Hakamo-o' },
  '30th-146': { from: 'Tandemaus' },
  'me06-089': { text: 'Search your deck for up to 3 in any combination of Supporter and Stadium cards, reveal them, and put them into your hand. Then, shuffle your deck.' },
  'me06-090': { text: 'Search your deck for a Basic Fire Energy card and a Basic Lightning Energy card, reveal them, and put them into your hand. Then, shuffle your deck.' },
  'me06-091': { text: 'If the Pok\u00e9mon this card is attached to isn\'t a Mega Evolution Pok\u00e9mon ex, it takes 60 less damage from attacks from your opponent\'s Mega Evolution Pok\u00e9mon ex (after applying Weakness and Resistance).' },
  'me06-092': { text: 'Draw 2 cards. If your opponent has 3 or fewer Prize cards remaining, draw 2 more cards.' },
  'me06-093': { text: 'Heal 50 damage from each Pok\u00e9mon (both yours and your opponent\'s).' },
  'me06-094': { text: 'Evolution Pok\u00e9mon in play (both yours and your opponent\'s) have no Abilities.' },
  'me06-095': { text: 'Evolution Pok\u00e9mon in play (both yours and your opponent\'s) have no Abilities.' },
  'me06-096': { text: 'Whenever a Colorless Pok\u00e9mon (yours or your opponent\'s) is Knocked Out by damage from an attack from the opponent\'s Pok\u00e9mon, that player takes 1 fewer Prize card.' },
  'me06-097': { text: 'Whenever a Colorless Pok\u00e9mon (yours or your opponent\'s) is Knocked Out by damage from an attack from the opponent\'s Pok\u00e9mon, that player takes 1 fewer Prize card.' },
  'me06-098': { text: 'Whenever a Pok\u00e9mon (yours or your opponent\'s) is healed, double the amount of damage healed.' },
  'me06-099': { text: 'Whenever a Pok\u00e9mon (yours or your opponent\'s) is healed, double the amount of damage healed.' },
  'me06-100': { text: 'The Pok\u00e9mon this card is attached to can use the attack on this card. (You still need the necessary Energy to use this attack.) Mega Evolution ex Rule: When your Mega Evolution Pok\u00e9mon ex is Knocked Out, your opponent takes 3 Prize cards.' },
  'me06-101': { text: 'Heal 30 damage from your Active Pok\u00e9mon. For each Tasty Rice Ball card (not including this card) in your discard pile, heal 30 more damage.' },
  'me06-102': { text: 'Draw 2 cards. If you drew any cards in this way, and if a Stadium that has "Legendary" in its name is in play, put this Tate & Liza\'s Training into your hand instead of the discard pile.' },
  'me06-103': { text: 'Switch your Active Pok\u00e9mon with 1 of your Benched Pok\u00e9mon. If you do, move an Energy from the Pok\u00e9mon you moved to your Bench to the new Active Pok\u00e9mon.' },
  'me06-125': { text: 'Search your deck for up to 3 in any combination of Supporter and Stadium cards, reveal them, and put them into your hand. Then, shuffle your deck.' },
  'me06-126': { text: 'Search your deck for a Basic Fire Energy card and a Basic Lightning Energy card, reveal them, and put them into your hand. Then, shuffle your deck.' },
  'me06-127': { text: 'If the Pok\u00e9mon this card is attached to isn\'t a Mega Evolution Pok\u00e9mon ex, it takes 60 less damage from attacks from your opponent\'s Mega Evolution Pok\u00e9mon ex (after applying Weakness and Resistance).' },
  'me06-128': { text: 'Draw 2 cards. If your opponent has 3 or fewer Prize cards remaining, draw 2 more cards.' },
  'me06-129': { text: 'Flip a coin. If heads, switch in 1 of your opponent\'s Benched Pok\u00e9mon to the Active Spot.' },
  'me06-130': { text: 'Draw 2 cards. If you drew any cards in this way, and if a Stadium that has "Legendary" in its name is in play, put this Tate & Liza\'s Training into your hand instead of the discard pile.' },
  'me06-131': { text: 'Switch your Active Pok\u00e9mon with 1 of your Benched Pok\u00e9mon. If you do, move an Energy from the Pok\u00e9mon you moved to your Bench to the new Active Pok\u00e9mon.' },
  'me06-132': { text: 'As long as this card is attached to a Pok\u00e9mon, it provides Water Energy. The Water Pok\u00e9mon this card is attached to recovers from all Special Conditions and can\'t be affected by any Special Conditions.' },
  'me06-133': { text: 'As long as this card is attached to a Pok\u00e9mon, it provides Grass Energy. The Grass Pok\u00e9mon this card is attached to gets +20 HP.' },
  'me06-134': { text: 'As long as this card is attached to a Pok\u00e9mon, it provides Fire Energy. If this card is discarded by an effect of an attack used by the Fire Pok\u00e9mon this card is attached to, put this card into your hand after attack damage and effects.' },
  'me06-139': { text: 'Search your deck for up to 3 in any combination of Supporter and Stadium cards, reveal them, and put them into your hand. Then, shuffle your deck.' },
  'me06-140': { text: 'Switch your Active Pok\u00e9mon with 1 of your Benched Pok\u00e9mon. If you do, move an Energy from the Pok\u00e9mon you moved to your Bench to the new Active Pok\u00e9mon.' },
};
// Whole sets where TCGdex has no regulation mark yet: the mark every card in the set carries.
const FIX37_SET_MARKS = { 'me06': 'J' };

function fix37Get(id) {
  if (typeof id !== 'string' || !id) return null;
  const live = typeof DATA30 !== 'undefined' && DATA30 && DATA30.cardFixes;
  return (live && live[id]) || FIX37[id] || null;
}
function fix37SetMark(id) {
  const set = String(id || '').split('-')[0];
  const live = typeof DATA30 !== 'undefined' && DATA30 && DATA30.setMarks;
  return (live && live[set]) || FIX37_SET_MARKS[set] || null;
}
/**
 * A card (pokemontcg.io, or TCGdex in that shape) with any checked fix applied.
 * 2.5.5: also the card source slips that would change what the grader reads, from either source:
 * a Pokemon with no stage and nothing to evolve from is Basic, a fixed stage or evolves-from name
 * is used, the female and male signs sit next to the name ("Nidoran\u2640", as every Pokemon that
 * evolves from it spells it), and a card listed as a Pokemon Tool whose text never attaches it
 * (pokemontcg.io lists Adventure Lantern so) is an Item.
 */
function fix37Card(c) {
  if (!c || typeof c !== 'object') return c;
  const f = fix37Get(c.id);
  let o = c;
  const put = (k, v) => { if (o === c) o = Object.assign({}, c); o[k] = v; };
  if (f && f.mark) put('regulationMark', f.mark);
  const sub = Array.isArray(c.subtypes) ? c.subtypes : [];
  const STAGE = /^(basic|stage ?[12])$/i;
  const sign = v => typeof v === 'string' ? v.replace(/\s+([\u2640\u2642])/g, '$1') : v;
  if (/^pok[e\u00e9]mon$/i.test(String(c.supertype || ''))) {
    if (f && f.stage) put('subtypes', [String(f.stage).replace(/^stage ?(\d)$/i, 'Stage $1')].concat(sub.filter(x => !STAGE.test(x))));
    else if (!sub.some(x => STAGE.test(x)) && !c.evolvesFrom) put('subtypes', ['Basic'].concat(sub));
    if (f && f.from) put('evolvesFrom', f.from);
    if (sign(o.evolvesFrom) !== o.evolvesFrom) put('evolvesFrom', sign(o.evolvesFrom));
    if (sign(o.name) !== o.name) put('name', sign(o.name));
  } else if (/^energy$/i.test(String(c.supertype || ''))) {
    // 2.5.5: Delta Reign's Special Energy come with no subtype, so they were left out of Trainer and Energy grading.
    if (!sub.some(x => /^(basic|special)$/i.test(x)))
      put('subtypes', [/^(basic )?(grass|fire|water|lightning|psychic|fighting|darkness|metal|fairy) energy$/i.test(String(c.name || '').trim()) ? 'Basic' : 'Special'].concat(sub));
  } else if (/^trainer$/i.test(String(c.supertype || ''))) {
    const txt = (Array.isArray(c.rules) ? c.rules : []).join(' ');
    if (sub.includes('Pok\u00e9mon Tool') && txt.trim() && !/\battach/i.test(txt)) put('subtypes', sub.map(x => x === 'Pok\u00e9mon Tool' ? 'Item' : x));
  }
  return o;
}
/** A raw TCGdex card with checked fixes applied, or null when the record is known to be wrong. */
function fix37Td(t) {
  if (!t || typeof t !== 'object') return t;
  const f = fix37Get(t.id);
  if (f && f.bad) return null;
  const sm = !t.regulationMark ? fix37SetMark(t.id) : null;
  if (!f && !sm) return t;
  const o = Object.assign({}, t);
  if (sm) o.regulationMark = sm;
  if (f) {
    if (f.mark) o.regulationMark = f.mark;
    if (f.stage) o.stage = f.stage;
    if (f.from && !t.evolveFrom) o.evolveFrom = f.from;
    if (f.text && !t.effect) o.effect = f.text;   // 2.5.5: Trainer or Special Energy text TCGdex leaves out
    if (f.abToAtk && Array.isArray(t.abilities)) {
      const ab = t.abilities.find(a => a && a.name === f.abToAtk);
      if (ab) {
        o.abilities = t.abilities.filter(a => a !== ab);
        o.attacks = [{ name: ab.name, cost: [], effect: ab.effect }].concat(Array.isArray(t.attacks) ? t.attacks : []);
      }
    }
  }
  return o;
}
/** "Choose 1 of your Benched N's Pokemon's attacks and use it as this attack": the name start it copies from. */
/**
 * 3.2.5: a card that puts Pokemon from your discard pile straight onto your Bench (Kingdra ex's
 * King's Order, Salamence ex's Booming Call, Rabsca's Revival Blessing, Duskull's Come and Get You).
 * A Pokemon it can bring back reaches the board without evolving, so its Basic and Stage 1 need not
 * be in the list. Read from its text: "Put up to 3 Water Pokemon from your discard pile onto your
 * Bench" gives { n: 3, type: 'water' }. Also stage ('basic', 'stage1', 'stage2', 'evolution'),
 * name (a Pokemon named in place of a kind), hp (a cap on HP) and not (names it leaves out).
 * Returns null when the text puts nothing from the discard pile onto your own Bench, or when it
 * names a kind this reader does not know, so an unread card never counts as a way into play.
 */
function revive115(text) {
  const t = String(text || '').replace(/[\u2018\u2019]/g, "'").replace(/pok[e\u00e9]mon/gi, 'pokemon').replace(/\s+/g, ' ');
  // 3.2.7: a Pokemon that puts itself onto your Bench from your discard pile (Gengar's Netherworld Gate,
  // Empoleon's Emergency Surfacing) needs no Basic either, once something puts it in the discard pile.
  if (/if this pokemon is in your discard pile[^.]*?,? you may put (?:it|this pokemon) onto your bench/i.test(t)) return { n: 1, type: null, stage: null, hp: null, not: [], self: true };
  // 3.2.7: older wordings too, for Expanded: "in order to put", a choice ("Choose 1: Put ..."), "Put 1 Basic
  // Pokemon card", "Put 3 in any combination of ...", "any number of", and "Search your discard pile for a
  // Pokemon ... and put it onto your Bench".
  const lead = "(?:^|[.!,:•] |in order to )(?:you may )?put (up to \\d+|\\d+ in any combination of|any number of|an?|\\d+) ";
  const cnt = s => /^an?$/i.test(s) ? 1 : /any number/i.test(s) ? 99 : parseInt(s.replace(/up to /i, ''), 10);
  let m = t.match(new RegExp(lead + "(.*?) from your discard pile onto your bench", 'i'));
  if (!m) {
    const sr = t.match(/search your discard pile for (up to \d+|an?|\d+) (.*?)(?:,? show (?:it|them) to your opponent,?)? and put (?:it|them) onto your bench/i);
    if (sr) m = [sr[0], sr[1], sr[2]];
  }
  if (!m) return null;
  const n = cnt(m[1]);
  let q = ' ' + m[2].toLowerCase() + ' ';
  // A name in place of a kind: "Put up to 3 Duskull from your discard pile onto your Bench".
  if (!/\bpokemon\b/.test(q)) {
    const nm = q.trim();
    return nm && /^[a-z0-9' -]+$/.test(nm) && !/\b(?:cards?|energy|trainers?|items?|supporters?|tools?|stadiums?)\b/.test(nm)
      ? { n, type: null, stage: null, hp: null, not: [], name: nm } : null;
  }
  const not = [], notKind = [];
  q = q.replace(/\((?:except|excluding) ([^)]*)\)/g, (x, w) => {
    w.split(/,? or |, | and /).map(y => y.trim().replace(/^an? /, '')).filter(Boolean).forEach(y => {
      const k = y.match(/^(baby|lv\.?x|legend|break) pokemon$|^pokemon (lv\.?x)$/);
      if (k) notKind.push((k[1] || k[2]).replace('.', '')); else not.push(y); });
    return ' '; });
  let hp = null; q = q.replace(/ with (\d+) hp or less/, (x, h) => { hp = parseInt(h, 10); return ' '; });
  let noRule = false; q = q.replace(/ that (?:don't|doesn't|do not|does not) have a rule box/, () => { noRule = true; return ' '; });
  let from = null; q = q.replace(/ that evolves? from ([a-z0-9' -]+?)(?= |$)(?: fossil)?/, (x, f) => { from = (f + (/fossil/.test(x) ? ' fossil' : '')).trim(); return ' '; });
  q = q.replace(/\bpokemon cards?\b/g, 'pokemon');
  const alts = [];
  for (let a of q.split(/ (?:or|and) /)) {
    a = ' ' + a.trim().replace(/^an? /, '') + ' ';
    if (!/\bpokemon\b/.test(a)) return null;
    let type = null, stage = null, kind = null;
    a = a.replace(/\bpokemon-(gx|ex)\b/, (x, k) => { kind = k; return 'pokemon'; });
    const TY = a.match(/\b(grass|fire|water|lightning|psychic|fighting|darkness|metal|dragon|fairy|colorless)\b/);
    if (TY) { type = TY[1]; a = a.replace(TY[0], ' '); }
    const ST = a.match(/\b(basic|stage 1|stage 2|evolution)\b/);
    if (ST) { stage = ST[1].replace(' ', ''); a = a.replace(ST[0], ' '); }
    const KD = a.match(/\b(rapid strike|single strike|fusion strike|baby)\b/);
    if (KD) { kind = KD[1]; a = a.replace(KD[0], ' '); }
    // A kind this reader does not know (a Pokemon "that has an Ability", a Tera Pokemon) is left unread.
    if (a.replace(/\bpokemon\b/, '').replace(/\s+/g, '')) return null;
    alts.push({ type, stage, kind });
  }
  if (!alts.length) return null;
  const r = { n, type: alts.length === 1 ? alts[0].type : null, stage: alts.length === 1 ? alts[0].stage : null, hp, not };
  if (alts.length > 1 || alts[0].kind) r.alts = alts;
  if (noRule) r.noRule = true;
  if (from) r.from = from;
  if (notKind.length) r.notKind = notKind;
  return r;
}
/**
 * 3.2.7: does this text put cards from your own hand or deck into your discard pile? 'deck' when you
 * pick them from your deck (Brilliant Blender), 'mill' for the top of your deck, 'hand' for a cost or
 * an effect that discards from your hand (Ultra Ball, Earthen Vessel's "another card", Professor's
 * Research). null otherwise, and for a discard that is your opponent's to make.
 */
function outlet115(text) {
  const t = String(text || '').replace(/[\u2018\u2019]/g, "'").replace(/pok[e\u00e9]mon/gi, 'pokemon').replace(/\s+/g, ' ');
  let k = null;
  for (const s of t.split(/(?<=[.!?])\s+/)) {
    if (/search your deck for (?:up to )?\d+ cards? and discard (?:them|it)/i.test(s)) return 'deck';
    if (/discard the top (?:\d+ cards|card) of your deck|look at the top \d+ cards of your deck and discard|discard the other cards/i.test(s)) { k = k || 'mill'; continue; }
    // "Your opponent discards a card from their hand" is not yours to use.
    if (/\bopponent\b/i.test(s) && /their hand/i.test(s)) continue;
    if (/discard (?:\d+ |a |an |another |up to \d+ |any number of )?(?:other )?(?:cards?|pokemon)\b[^.]{0,30} from (?:your|their) hand|discard your hand|discard all (?:the )?cards (?:from|in) your hand/i.test(s)) k = 'hand';
  }
  return k;
}
function copy37(text) {
  const m = String(text || '').replace(/[‘’]/g, "'")
    .match(/choose 1 of your benched (.*?)pok[eé]mon'?s? attacks and use it as this attack/i);
  if (m) return { pre: m[1].trim() };
  // Slowking's Seek Inspiration: a random Pokemon without a Rule Box from the top of the deck.
  if (/discard the top card of your deck, and if that card is a pok[eé]mon that doesn'?t have a rule box, choose 1 of its attacks and use it as this attack/i
    .test(String(text || '').replace(/[\u2018\u2019]/g, "'"))) return { pre: '', mill: true };
  return null;
}
/**
 * v53: an attack whose damage counts Energy in play, read from its text:
 * "50 damage for each Fire Energy and each Lightning Energy attached to all
 * of your Pokemon" gives { per:50, base:0, types:['fire','lightning'], scope:'all' }.
 * types is empty when any Energy counts. scope: all (all of your Pokemon),
 * self (this Pokemon) or both (both Active Pokemon). The numbers are the
 * card's own; how many Energy are in play is the board's.
 */
function escale53(text, damage) {
  const t = String(text || '').replace(/[\u2018\u2019]/g, "'").replace(/pok[e\u00e9]mon/gi, 'pokemon');
  const m = t.match(/does (\d+) (more )?damage for each ((?:(?:basic )?\w+ )?energy(?:,? and (?:each )?(?:(?:basic )?\w+ )?energy)*) attached to (all of your pokemon|this pokemon|both active pokemon)/i);
  if (!m) {
    // v54: "Discard any amount of Fire Energy from among your Pokemon, and this attack
    // does 90 damage for each card you discarded in this way" counts the same board,
    // once: every Energy discarded from your Pokemon adds the printed number.
    const d = t.match(/discard any amount of ((?:basic )?(?:\w+ )?energy) from (?:among )?your pokemon[^.]*?(?:\.\s*this attack|, and this attack) does (\d+) damage for each card you discarded/i);
    if (!d) return null;
    const ty = (d[1].match(/(?:basic )?(\w+) energy/i) || [])[1];
    const types = ty && ['grass','fire','water','lightning','psychic','fighting','darkness','metal','dragon','fairy'].includes(ty.toLowerCase()) ? [ty.toLowerCase()] : [];
    return { per: parseInt(d[2], 10), base: 0, types, scope: 'all', discard: true };
  }
  const types = [...m[3].matchAll(/(?:basic )?(\w+) energy/gi)].map(x => x[1].toLowerCase())
    .filter(x => ['grass','fire','water','lightning','psychic','fighting','darkness','metal','dragon','fairy','colorless'].includes(x));
  const base = m[2] ? (parseInt(String(damage || ''), 10) || 0) : 0;
  const scope = /^all/i.test(m[4]) ? 'all' : /^this/i.test(m[4]) ? 'self' : 'both';
  return { per: parseInt(m[1], 10), base, types, scope };
}
/** "Each Basic Grass Energy attached to all of your Pokemon provides GrassGrass Energy" gives 'grass'. */
function edouble53(text) {
  const m = String(text || '').match(/each basic (\w+) energy attached to all of your pok[e\u00e9]mon provides (\w+) energy/i);
  return m && m[2].toLowerCase() === (m[1] + m[1]).toLowerCase() ? m[1].toLowerCase() : undefined;
}
/**
 * v54: an Ability that puts damage counters on 1 of your opponent's Pokemon each turn
 * (Dusknoir's Cursed Blast: 13, then Dusknoir is Knocked Out). Gives { n: damage,
 * selfKO, active } from the card text, or undefined.
 */
function abDmg54(text) {
  const t = String(text || '').replace(/[\u2018\u2019]/g, "'");
  // v62: the counters may come one sentence after the cost ("discard a Basic Water Energy card ... in order to use this Ability. Place 6 damage counters").
  const m = t.match(/once during your turn,[^.]*?(?:\.\s*)?(?:put|place) (\d+) damage counters on 1 of your opponent's pok[e\u00e9]mon/i);
  if (!m) return undefined;
  return { n: parseInt(m[1], 10) * 10, selfKO: /this pok[e\u00e9]mon is knocked out/i.test(t) || undefined,
    active: /if this pok[e\u00e9]mon is in the active spot/i.test(t) || undefined };
}
/**
 * v55: damage that counts cards in your discard pile, read from its text: "This attack does
 * 60 more damage for each Ethan's Adventure card in your discard pile" gives
 * { per:60, base:40, what:"Ethan's Adventure", kind:'name' }. kind: energy, pokemon,
 * supporter, item, trainer or name. The numbers are the card's own; how many cards are in
 * the pile is the game's.
 */
const T55 = ['grass','fire','water','lightning','psychic','fighting','darkness','metal','dragon','fairy'];
function pile55(text, damage) {
  const t = String(text || '').replace(/[\u2018\u2019]/g, "'");
  if (/if you have \d+ or more/i.test(t)) return undefined;
  // v56: also "does 20 damage for each Basic Water Energy card in your discard pile" (Kyogre), with no base.
  const m = t.match(/does (\d+) (more )?damage for each (.+?) in your discard pile/i);
  if (!m) return undefined;
  // Dartrix: "for each Pokemon in your discard pile that has the United Wings attack".
  const at = t.slice(m.index + m[0].length).match(/^ that has the (.+?) attack/i);
  const sp = at ? { atk: at[1] } : /^(ancient|future) cards?$/i.test(m[3]) ? null : spec56(m[3]);
  if (!sp) return undefined;
  return Object.assign({ per: parseInt(m[1], 10), base: m[2] ? (parseInt(String(damage || ''), 10) || 0) : 0 }, sp);
}
/**
 * v56: the cards an attack counts, from a phrase in its text ("Basic Water Energy card",
 * "Supporter card that has "Team Rocket" in its name", "Ethan's Adventure card").
 * Gives { kind, ... } for g56Match, or undefined when the app cannot count it from a list.
 */
function spec56(w) {
  w = String(w || '').trim().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');
  let e = w.match(/^(basic )?(?:(\w+) )?energy(?: cards?)?$/i);
  if (e && (!e[2] || T55.includes(e[2].toLowerCase()))) return { kind: 'energy', basic: !!e[1] || undefined, type: e[2] ? e[2].toLowerCase() : undefined };
  if (/^pok[e\u00e9]mon(?: cards?)?$/i.test(w)) return { kind: 'pokemon' };
  e = w.match(/^(supporter|item|trainer) cards?(?: that ha(?:s|ve) "(.+?)" in (?:its|their) names?)?$/i);
  if (e) return { kind: e[1].toLowerCase(), has: e[2] ? e[2].toLowerCase() : undefined };
  e = w.match(/^(.+?'s) pok[e\u00e9]mon$/i);
  if (e) return { kind: 'pre', pre: e[1].toLowerCase() + ' ' };
  e = w.match(/^(.+?) cards?$/i);
  if (e && !/\b(?:pok[e\u00e9]mon|energy|that|with|of)\b/i.test(e[1])) return { kind: 'name', what: e[1].trim() };
  return undefined;
}
/**
 * v56: an attack that counts some of your Pokemon in play or on your Bench, read from its
 * text: "for each of your Beedrill and Beedrill ex in play", "for each of your Erika's
 * Pokemon in play", "for each of your Benched Charjabug", "for each Stage 2 Pokemon on your
 * Bench", "for each of your Pokemon in play that has the Round attack".
 */
function group56(text, damage) {
  const t = String(text || '').replace(/[\u2018\u2019]/g, "'").replace(/pok[e\u00e9]mon/gi, 'pokemon');
  const m = t.match(/does (\d+) (more )?damage for each (?:of your (benched )?(.+?)(?: in play)?(?: that has the (.+?) attack)?|(stage 1|stage 2|basic|evolution) pokemon on your bench)\./i);
  if (!m) return undefined;
  const per = parseInt(m[1], 10), base = m[2] ? (parseInt(String(damage || ''), 10) || 0) : 0;
  const bench = !!m[3] || !!m[6];
  if (m[6]) return { per, base, bench, stage: m[6].toLowerCase() };
  let w = (m[4] || '').trim();
  if (m[5]) return /^pokemon$/i.test(w) ? { per, base, bench, atk: m[5].trim() } : undefined;
  if (!/ in play$/i.test(t.match(/for each of your [^.]*/i)[0]) && !bench) return undefined;
  const st = w.match(/^(stage 1|stage 2|basic|evolution) pokemon$/i);
  if (st) return { per, base, bench, stage: st[1].toLowerCase() };
  const pre = w.match(/^(.+?'s) pokemon$/i);
  if (pre) return { per, base, bench, pre: pre[1].toLowerCase() + ' ' };
  if (/pokemon|energy|prize|card|damage/i.test(w)) return undefined;
  return { per, base, bench, names: w.split(/,? and |, /i).map(x => x.trim().toLowerCase()).filter(Boolean) };
}
/**
 * v56: an attack that discards the top cards of your deck and counts what comes off
 * ("Discard the top 6 cards of your deck, and this attack does 100 damage for each Basic
 * Water Energy card that you discarded"). The list says how many of those it holds, so the
 * grade counts the average.
 */
/**
 * v63: what a card does to stop the opponent playing, read from one piece of card text
 * (an attack, an Ability or a Trainer's rules). Returns a list of pieces:
 *   k: item, supporter, stadium, tool (cards they cannot play), ability (Abilities turned off),
 *      attack (cannot attack), retreat, mill (top of their deck), energy (Energy off their Pokemon),
 *      hand (their hand cut or reset), wall (damage to your Pokemon prevented), heal.
 *   when: active (while this Pokemon is Active), bench (while on your Bench), always,
 *      next (for their next turn, after an attack or a card), once (first turn only), now (one time).
 *   sc: what an Ability lock or a wall covers. n: cards milled, damage healed. flip: a coin decides it.
 */
function ctl63(text) {
  const t = String(text || '').replace(/[‘’ʼ]/g, "'").replace(/[éÉ]/g, 'e').toLowerCase()
    .replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  const out = [], flip = /flip a coin|if heads/.test(t);
  const when = /during your first turn|only if you go second/.test(t) ? 'once'
    : /as long as this pokemon is in the active spot/.test(t) ? 'active'
    : /as long as this pokemon is on your bench/.test(t) ? 'bench'
    : /during (?:your opponent's|their) next turn/.test(t) ? 'next' : 'always';
  const opp = /(?:your opponent|they) can't play any ([a-z ,]+?)(?: from (?:their|his or her) hand|$|\.)/.exec(t);
  if (opp) { const w = opp[1];
    if (/\bitem\b/.test(w)) out.push({ k: 'item', when, flip });
    if (/supporter/.test(w)) out.push({ k: 'supporter', when, flip });
    if (/stadium/.test(w)) out.push({ k: 'stadium', when, flip });
    if (/pokemon tool/.test(w)) out.push({ k: 'tool', when, flip }); }
  // Abilities turned off for the opponent, or for both players (Initialization, Legendary Pyroduct).
  let m = t.match(/([a-z' ]*?)(?: in play)? ha(?:s|ve) no abilities/);
  if (m && !/^\s*this pokemon\s*$/.test(m[1]) && /opponent|in play|pokemon/.test(m[0])) {
    const w = m[1];
    const sc = /rule box/.test(w) ? 'rulebox' : /evolution/.test(w) ? 'evolution' : /colorless/.test(w) ? 'colorless'
      : /basic/.test(w) ? 'basic' : /active/.test(w) ? 'active' : /this pokemon/.test(w) ? null : 'all';
    if (sc) out.push({ k: 'ability', sc, when, flip }); }
  if (/(?:defending pokemon|that pokemon|your opponent's active pokemon) can't attack|pokemon that have \d+ or (?:less|fewer) energy attached can't attack/.test(t))
    out.push({ k: 'attack', sc: /or (?:less|fewer) energy/.test(t) ? 'low' : 'all', n: +((t.match(/have (\d+) or (?:less|fewer) energy attached can't attack/) || [])[1] || 0) || undefined, when: when === 'always' ? 'next' : when, flip });
  if (/(?:defending pokemon|that pokemon) can't retreat/.test(t)) out.push({ k: 'retreat', when: when === 'always' ? 'next' : when, flip });
  if ((m = t.match(/discard the top (\d+|a|an) cards? of (?:your opponent's|their) deck/))) {
    const n = /^an?$/.test(m[1]) ? 1 : +m[1];
    out.push({ k: 'mill', n, when: 'now', flip: flip || /for each heads/.test(t), cond: /^if /.test(t) || /if you played/.test(t) }); }
  if ((m = t.match(/discard (an?|\d+|all) (special )?energy from (?:1 of )?your opponent's (?:active )?pokemon/)))
    out.push({ k: 'energy', n: /^an?$/.test(m[1]) ? 1 : m[1] === 'all' ? 2 : +m[1], special: !!m[2], when: 'now', flip });
  if (/each player shuffles their hand into their deck and draws \d|your opponent discards cards from their hand until|you discard up to \d+ (?:item )?cards you find there|your opponent shuffles their hand into their deck|each player shuffles their hand into their deck|each player shuffles their hand and puts it on the bottom of their deck/.test(t))
    out.push({ k: 'hand', when: 'now', flip });
  // Damage to your own Pokemon prevented. sc says from what.
  if (/prevent all damage/.test(t) && !/your opponent's (?:active|benched) pokemon/.test(t.split('prevent all damage')[0].slice(-40))) {
    const tail = t.slice(t.indexOf('prevent all damage'));
    const sc = /pokemon that don't have a rule box[^.]*by attacks from (?:the|your) opponent's pokemon ex/.test(tail) ? 'nonrule'
      : /by attacks from your opponent's basic pokemon ex/.test(tail) ? 'basicex'
      : /by attacks from your opponent's pokemon ex/.test(tail) ? 'ex'
      : /pokemon that have an ability/.test(tail) ? 'ability'
      : /that have \d+ or (?:less|fewer) energy attached/.test(tail) ? 'low'
      : /if that damage is \d+ or more/.test(tail) ? 'big'
      : /damage counters from being placed on benched pokemon/.test(tail) ? 'bench'
      : /benched pokemon/.test(tail) ? 'bench'
      : /from attacks from basic pokemon|by attacks from basic pokemon/.test(tail) ? 'basic'
      : /by attacks/.test(tail) ? 'all' : null;
    const team = /each of your pokemon|pokemon that don't have a rule box|your benched pokemon|benched pokemon/.test(tail);
    if (sc && !(sc === 'all' && when === 'bench')) out.push({ k: 'wall', sc, team, when, flip, n: +((tail.match(/(\d+) or (?:more|less|fewer)/) || [])[1] || 0) || undefined }); }
  if ((m = t.match(/^heal (\d+|all) damage from|[.,] heal (\d+|all) damage from|^(?:once during your turn, )?(?:you may )?heal (\d+|all) damage from/)))
    { const v = m[1] || m[2] || m[3]; out.push({ k: 'heal', n: v === 'all' ? 200 : +v, when: /once during your turn/.test(t) ? 'always' : 'now', flip }); }
  return out;
}

function mill56(text, damage) {
  const t = String(text || '').replace(/[\u2018\u2019]/g, "'");
  const m = t.match(/discard the top (\d+ cards?|card) of (your|each player's) deck[^.]*?(?:\.\s*|, and )this attack does (\d+) (more )?damage for each (.+?) (?:that )?(?:you )?discarded in this way/i);
  if (!m) return undefined;
  const sp = spec56(m[5]);
  if (!sp) return undefined;
  return Object.assign({ n: m[1] === 'card' ? 1 : parseInt(m[1], 10), both: /each/i.test(m[2]) || undefined, per: parseInt(m[3], 10),
    base: m[4] ? (parseInt(String(damage || ''), 10) || 0) : 0, label: m[5].trim() }, sp);
}
/** v55: "Attacks used by your Cynthia's Pokemon do 30 more damage to your opponent's Active Pokemon" (Cynthia's Roserade). */
function aboost55(text) {
  const t = String(text || '').replace(/[\u2018\u2019]/g, "'");
  const m = t.match(/^attacks used by your (.*?)pok[e\u00e9]mon do (\d+) more damage to your opponent's active pok[e\u00e9]mon/i);
  if (!m) return undefined;
  const pre = m[1].toLowerCase();
  const ty = pre.trim();
  return { n: parseInt(m[2], 10), pre: ty && !T55.includes(ty) ? pre : '', type: T55.includes(ty) ? ty : undefined,
    one: /doesn't stack|can't use more than 1|only 1 .* ability/i.test(t) || undefined };
}
/** v55: "This Pokemon can't attack unless you have 4 or more Team Rocket's Pokemon in play" (Team Rocket's Mewtwo ex). */
function gate55(text) {
  const m = String(text || '').replace(/[\u2018\u2019]/g, "'").match(/can't attack unless you have (\d+) or more (.*?)pok[e\u00e9]mon in play/i);
  return m ? { n: parseInt(m[1], 10), pre: m[2].toLowerCase() } : undefined;
}
// These sit inside the card layer's closure; the TCGdex reader outside it needs them too.
/**
 * v60: an attack whose effect is a Knock Out of the opponent's Active Pokemon, read from the text.
 * how: 'always' (Roaring Moon ex's Frenzied Gouging), 'flip' with the chance from the coins
 * (Iono's Electrode, Spiritomb), 'counters' when it needs exactly N damage counters already on it
 * (Mega Absol ex's Terminal Period), 'discard' when it needs N cards discarded from hand (Hydrapple).
 * basic: only a Basic Pokemon. Returns null for anything else.
 */
function kox60(text) {
  const t = String(text || '').toLowerCase().replace(/[\u2019\u2018]/g, "'").replace(/pok\u00e9mon/g, 'pokemon');
  if (!/(?:your opponent's active (?:basic )?pokemon|that pokemon) is knocked out|knock out your opponent's active/.test(t)) return null;
  if (/if (?:the defending|your opponent's active) pokemon is knocked out by damage/.test(t)) return null;
  const basic = /active basic pokemon/.test(t);
  let m;
  if ((m = t.match(/has exactly (\d+) damage counters? on it/))) return { how: 'counters', n: +m[1], basic };
  if ((m = t.match(/^discard (\d+) ([^.]*?) from your hand,? and knock out/))) return { how: 'discard', n: +m[1], what: m[2], basic };
  if ((m = t.match(/flip (\d+) coins\. if (?:both|all) of them are heads/))) return { how: 'flip', p: Math.pow(0.5, +m[1]), basic };
  if (/flip a coin\. if heads,[^.]*knock(?:ed)? out/.test(t)) return { how: 'flip', p: 0.5, basic };
  if (/^knock out your opponent's active pokemon/.test(t)) return { how: 'always', basic };
  return null;
}
if (typeof globalThis !== 'undefined') Object.assign(globalThis, { kox60, geEffects, FIX37, fix37Get, fix37Td, fix37Card, copy37, escale53, edouble53, abDmg54, pile55, aboost55, gate55, spec56, group56, mill56 });

const RT_BOILER57 = /^(you may play (only 1|any number of)|you may attach any number of pok[e\u00e9]mon tools|attach a pok[e\u00e9]mon tool to 1 of your pok[e\u00e9]mon that doesn|ace spec:|you can't have more than 1 ace spec)/i;
/** v67: card text with Energy symbols spelled out ("{D} Energy" to "Darkness Energy"), from any source. */
function sym67Card(c) {
  if (!c || typeof c !== 'object') return c;
  const S = { g: 'Grass', r: 'Fire', w: 'Water', l: 'Lightning', p: 'Psychic', f: 'Fighting', d: 'Darkness', m: 'Metal', y: 'Fairy', n: 'Dragon', c: 'Colorless' };
  const w = v => typeof v === 'string' ? v.replace(/\{([a-z])\}/gi, (m, ch) => S[ch.toLowerCase()] || m) : v;
  return Object.assign({}, c, {
    attacks: Array.isArray(c.attacks) ? c.attacks.map(a => a && typeof a === 'object' ? Object.assign({}, a, { text: w(a.text) }) : a) : c.attacks,
    abilities: Array.isArray(c.abilities) ? c.abilities.map(a => a && typeof a === 'object' ? Object.assign({}, a, { text: w(a.text) }) : a) : c.abilities,
    rules: Array.isArray(c.rules) ? c.rules.map(w) : c.rules,
  });
}

function enrichCard(apiCard, opts) {
  const o = opts || {};
  const card = sym67Card(fix37Card(apiCard)) || {};
  const resolved = !!apiCard;
  const name = card.name || o.fallbackName || '';

  const inferred = inferProvides(card);
  const override = findOverride(name);

  let provides = inferred.tags;
  if (override && Array.isArray(override.provides)) provides = override.provides.slice();
  if (override && Array.isArray(override.addProvides)) {
    provides = [...new Set(provides.concat(override.addProvides))];
  }

  let requires = inferRequires(card);
  if (override && Array.isArray(override.requires)) {
    requires = [...new Set(requires.concat(override.requires))];
  }

  const attacks = (card.attacks || []).map(a => {
    const dmg = parseDamage(a.damage, a.text);
    const cond = damageCondition(a.text || '');
    return {
      name: a.name || '',
      cost: parseCost(a.cost),
      text: a.text || '',
      damage: dmg,
      // Convenience scalars for callers that just want a number.
      dmg: dmg.typical,
      dmgMax: dmg.max,
      // A bonus that waits on cards piling up in the discard pile is not
      // there early, so early damage is the base until the condition is met.
      cond: dmg.kind === 'plus' && cond ? cond : null,
      early: dmg.kind === 'plus' && cond ? dmg.base : dmg.typical,
      flip: dmg.flip || null,
      copy: copy37(a.text),
      // 3.2.5: Pokemon it puts onto your Bench from your discard pile (Kingdra ex's King's Order).
      rev: revive115(a.text),
      // 3.2.7: an attack that discards from your hand or deck (Salamence ex's Dragon Pulse) fills the discard pile.
      disc: outlet115(a.text),
      // v60: what the attack does besides damage, in plain words (Phantom Dive's damage counters on the Bench).
      fx: (fx => fx.length ? fx.slice(0, 2) : null)(geEffects(a.text).say),
      // v60: an attack that Knocks Out the opponent's Active Pokemon outright (Mega Absol ex's Terminal Period).
      kox: kox60(a.text),
      // v61: damage that counts the cards in your hand (Alakazam's Powerful Hand) grows with the list's draw Abilities.
      hand: /for each card in your hand/i.test(a.text || '') || null,
      // v62: the condition on a fixed damage bonus (Gale Thrust's 170 more only on a turn it moves up from the Bench).
      need: dmg.need || null,
      // v54: an attack that locks itself (or all attacks) for the attacker's next turn. A coin flip or an optional bonus is left out.
      lock: /flip a coin|if you do/i.test(a.text || '') ? null
        : new RegExp("during your next turn, this pok[e\\u00e9]mon can[\u2019']t use " + String(a.name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.', 'i').test(a.text || '') ? 'self'
        : /during your next turn, this pok[e\u00e9]mon can[\u2019']t (?:attack|use attacks)/i.test(a.text || '') ? 'all' : null,
      escale: escale53(a.text, a.damage),
      pile: pile55(a.text, a.damage),
      group: group56(a.text, a.damage),
      mill: mill56(a.text, a.damage),
      // v63: what the attack does to stop the opponent playing (Daunting Gaze is an Ability; Cracking Stomp's mill is this).
      ctl: (x => x.length ? x : null)(ctl63(a.text)),
      // v54: Energy the attack discards from the attacker itself (Metagross's Metallic Hammer, Pikachu ex's Topaz Bolt).
      edisc: (() => { const m = (a.text || '').match(/(you may )?discard (all|an?|\d+) ((?:basic )?(?:grass|fire|water|lightning|psychic|fighting|darkness|metal) )?energy (?:cards? )?from this pok[e\u00e9]mon(?:[^.]*?(\d+) more damage)?/i);
        return m ? { n: m[2].toLowerCase() === 'all' ? 'all' : /^an?$/i.test(m[2]) ? 1 : +m[2], type: m[3] ? m[3].trim().toLowerCase() : '', opt: !!m[1], more: m[4] ? +m[4] : 0 } : null; })(),
    };
  });
  const abilities = (card.abilities || []).map(x => ({
    name: x.name || '',
    protect: /prevent all (?:damage|effects)/i.test(x.text || ''),
    pkind: /prevent all damage/i.test(x.text || '') ? 'damage' : /prevent all effects/i.test(x.text || '') ? 'effects' : undefined,
    bench: /if this pok[e\u00e9]mon is in your hand[\s\S]*?put this pok[e\u00e9]mon onto your bench/i.test(x.text || '') || undefined,
    edouble: edouble53(x.text),
    cdmg: abDmg54(x.text),
    boost: aboost55(x.text),
    // v62: its own attacks do more with one type of Energy attached (Okidogi's Adrena-Power).
    sboost: (m => m ? { n: +m[2], type: m[1].toLowerCase(), hp: +((String(x.text || '').match(/gets \+(\d+) hp/i) || [])[1] || 0) || undefined } : undefined)(String(x.text || '').match(/if this pok[e\u00e9]mon has any (grass|fire|water|lightning|psychic|fighting|darkness|metal) energy attached[^.]*?the attacks it uses do (\d+) more damage to your opponent's active/i)),
    gate: gate55(x.text),
    // v54: damage it prevents only from Pokemon ex (Crustle's Mysterious Rock Inn).
    pex: /prevent all damage done to this pok[e\u00e9]mon by attacks from your opponent's pok[e\u00e9]mon ex/i.test(x.text || '') || undefined,
    // v54: an Ability that attaches one type of Basic Energy from your hand (Teal Mask Ogerpon ex's Teal Dance).
    // v54: a "put this onto your Bench" Ability that needs a Mega Evolution Pokemon ex in play (Talonflame ex's Excited Dive).
    bmega: (m => m ? (m[1] || 'any').toLowerCase() : undefined)((x.text || '').match(/put this pok[e\u00e9]mon onto your bench/i) && (x.text || '').match(/if you have any (?:(grass|fire|water|lightning|psychic|fighting|darkness|metal|dragon|colorless) )?mega evolution pok[e\u00e9]mon ex in play/i)),
    aneed: ((x.text || '').match(/attach (?:a|an|up to \d+|\d+) basic (grass|fire|water|lightning|psychic|fighting|darkness|metal) energy cards? from your hand/i) || [])[1]?.toLowerCase(),
    // 3.2.8: an Ability that only works while this Pokemon has some Energy attached (Munkidori's Adrena-Brain needs Darkness).
    ahas: (m => m ? (m[1] || 'any').toLowerCase() : undefined)((x.text || '').match(/^\s*(?:once during your turn, )?if this pok[e\u00e9]mon has any (?:(grass|fire|water|lightning|psychic|fighting|darkness|metal) )?energy attached/i)),
  }));

  const supertype = String(card.supertype || '').toLowerCase();
  const t = supertype === 'pokémon' || supertype === 'pokemon' ? 'pkmn'
          : supertype === 'trainer' ? 'trainer'
          : supertype === 'energy'  ? 'energy' : null;

  return {
    key: name.toLowerCase(),
    name,
    id: card.id || null,
    resolved,
    t,
    supertype: card.supertype || null,
    subtypes: card.subtypes || [],
    hp: parseHP(card.hp),
    types: (card.types || []).map(s => s.toLowerCase()),
    weak: (card.weaknesses || []).map(w => String(w.type).toLowerCase())[0] || null,
    // v67: the printed Retreat Cost, for retreating in Goldfish.
    retreat: t === 'pkmn' && card.convertedRetreatCost != null && isFinite(+card.convertedRetreatCost) ? +card.convertedRetreatCost : (t === 'pkmn' && Array.isArray(card.retreatCost) ? card.retreatCost.length : null),
    stage: parseStage(card.subtypes),
    from: card.evolvesFrom || null,
    p: t === 'pkmn' ? parsePrizeValue(card.subtypes, card.rules) : 0,
    basic: isBasicEnergy(card),
    ace: isAceSpec(card),
    reg: parseRegulation(card, resolved),
    attacks,
    abilities,
    // v58: the printed text Goldfish plays from. Ability text, and Trainer rules
    // without the lines every Item or Tool repeats.
    atext: (card.abilities || []).filter(x => x && x.text).map(x => [x.name || '', String(x.text)]),
    rtext: t === 'trainer' ? (card.rules || []).map(r => String(r).trim()).filter(r => !RT_BOILER57.test(r.replace(/[\u2018\u2019]/g, "'"))).join(' ').replace(/\s+/g, ' ').trim() : '',
    // v65: a Special Energy's own text, so the grade can tell whether it has anything to work on.
    etext: t === 'energy' && !isBasicEnergy(card) ? (card.rules || []).map(r => String(r).trim()).join(' ').replace(/\s+/g, ' ').trim() : '',
    provides,
    requires,
    // Provenance, so a grader can report how much of its input it trusted.
    source: override ? 'override' : (inferred.tags.length ? 'inferred' : 'structural'),
    weakTags: inferred.weak,
  };
}

/* ============================================================
   6. TARGETED FETCH
   Fetch only the cards in the deck, not whole sets.
   Measured: ~667 bytes per card with select, vs ~2166 unfiltered.
   A 25-unique-card deck is ~16 KB instead of ~800 KB.
   ============================================================ */

const SELECT_FIELDS = [
  'id','name','supertype','subtypes','hp','types','attacks','abilities',
  'rules','weaknesses','regulationMark','evolvesFrom','number','convertedRetreatCost'
].join(',');

const API_BASE = 'https://api.pokemontcg.io/v2/cards';

/**
 * Fetch enriched card data for a parsed deck list.
 *
 * `entries` is [{ name, set, num }, ...]. Returns a Map keyed by
 * lowercase name. Unresolvable cards get a stub with resolved=false
 * so the caller can report coverage rather than silently guessing.
 *
 * opts: { fetchImpl, batchSize, timeoutMs, apiKey }
 */
const SET_API = 'https://api.pokemontcg.io/v2/sets';
const ENERGY_SYMBOLS = { g:'Grass', r:'Fire', w:'Water', l:'Lightning', p:'Psychic',
  f:'Fighting', d:'Darkness', m:'Metal', y:'Fairy', n:'Dragon', c:'Colorless' };

/** A deck list name as the card database spells it ("Basic {W} Energy" to "Basic Water Energy"). */
function apiName(name) {
  return String(name || '')
    .replace(/\{([a-z])\}/gi, (_, ch) => ENERGY_SYMBOLS[ch.toLowerCase()] || ch)
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ').trim();
}

/** Loose name key: case, accents, apostrophes and spacing ignored. */
function nameKey(name) {
  return apiName(name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Names to try for a card. Basic energy is "Water Energy" in older sets. */
function nameVariants(name) {
  const a = apiName(name);
  const out = [a];
  const m = a.match(/^basic (\w+) energy$/i);
  if (m) out.push(m[1] + ' Energy');
  return out;
}

/** True when an API card is the card the list names. */
function sameCard(listName, apiCardName) {
  const k = nameKey(apiCardName);
  return nameVariants(listName).some(v => nameKey(v) === k);
}

/**
 * Fetch enriched card data for a parsed deck list.
 *
 * `entries` is [{ name, set, num }, ...]. Returns a Map keyed by
 * lowercase name. Three passes:
 *   1. set codes the map does not know are looked up on the API's set list
 *   2. cards by set and number, kept only when the name matches the list
 *      (a wrong set code otherwise reads a different card silently)
 *   3. anything still missing by exact name, newest printing first
 * Unresolvable cards get a stub with resolved=false so the caller can
 * report coverage rather than silently guessing.
 *
 * opts: { fetchImpl, batchSize, timeoutMs, apiKey }
 */
async function fetchDeckCards(entries, opts) {
  const o = opts || {};
  const doFetch = o.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  const batchSize = o.batchSize || 12;
  const timeoutMs = o.timeoutMs || 10000;
  const out = new Map();
  const list = (entries || []).filter(e => e && e.name);

  const makeInit = () => {
    // Guard the identifier itself, not just the method. On browsers where
    // AbortSignal is undefined (Safari < 16, older Chrome), reading
    // AbortSignal.timeout throws a ReferenceError.
    const init = {};
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
      init.signal = AbortSignal.timeout(timeoutMs);
    }
    if (o.apiKey) init.headers = { 'X-Api-Key': o.apiKey };
    return init;
  };
  // One retry: the card API often answers 429 or 5xx under load.
  // A request that still fails marks the read as partial, so a caller can
  // keep what it read before instead of wiping it.
  let failed = false;
  const getJSON = async (url) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await doFetch(url, makeInit());
        if (resp.ok) return await resp.json();
        if (resp.status !== 429 && resp.status < 500) return null;
      } catch (_) {}
      if (attempt === 0) await new Promise(r => setTimeout(r, 1200));
    }
    failed = true;
    return null;
  };

  if (doFetch) {
    // Pass 1: set codes newer than SET_MAP.
    const unknown = [...new Set(list.map(e => String(e.set || '').toUpperCase()))]
      .filter(c => c && !SET_MAP[c] && !LEARNED_SETS[c]);
    if (unknown.length) {
      const q = unknown.map(c => 'ptcgoCode:"' + c.replace(/"/g, '') + '"').join(' OR ');
      const json = await getJSON(SET_API + '?q=' + encodeURIComponent(q) +
                                 '&select=id,ptcgoCode&orderBy=releaseDate');
      let learned = false;
      ((json && json.data) || []).forEach(s => {
        const k = String(s.ptcgoCode || '').toUpperCase();
        if (k && !LEARNED_SETS[k]) { LEARNED_SETS[k] = s.id; learned = true; }
      });
      if (learned) {
        try { localStorage.setItem('ptcgSetCodes', JSON.stringify(LEARNED_SETS)); } catch (_) {}
      }
    }

    // Pass 2: by card id.
    const byId = new Map();
    list.forEach(e => {
      const id = toCardId(e.set, e.num);
      if (!id) return;
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push(e.name);
    });
    const ids = [...byId.keys()];
    const idBatches = [];
    for (let i = 0; i < ids.length; i += batchSize) idBatches.push(ids.slice(i, i + batchSize));
    await Promise.all(idBatches.map(async (batch) => {
      const q = batch.map(id => 'id:' + id).join(' OR ');
      const json = await getJSON(API_BASE + '?q=' + encodeURIComponent(q) +
                                 '&select=' + SELECT_FIELDS + '&pageSize=' + batch.length);
      ((json && json.data) || []).forEach(apiCard => {
        const names = byId.get(apiCard.id) || [];
        names.forEach(n => {
          if (!sameCard(n, apiCard.name)) return;
          out.set(String(n).toLowerCase(), enrichCard(apiCard));
        });
      });
    }));

    // Pass 3: by name, for anything the id pass did not settle.
    const seen = new Set();
    const missing = list.filter(e => {
      const k = String(e.name).toLowerCase();
      if (out.has(k) || seen.has(k)) return false;
      seen.add(k);
      return true;
    }).map(e => e.name);
    const NB = 6;
    const nameBatches = [];
    for (let i = 0; i < missing.length; i += NB) nameBatches.push(missing.slice(i, i + NB));
    await Promise.all(nameBatches.map(async (batch) => {
      const terms = [];
      batch.forEach(n => nameVariants(n).forEach(v => terms.push('name:"' + v.replace(/"/g, '') + '"')));
      const json = await getJSON(API_BASE + '?q=' + encodeURIComponent('(' + terms.join(' OR ') + ')') +
                                 '&select=' + SELECT_FIELDS + ',set&orderBy=-set.releaseDate&pageSize=250');
      const found = (json && json.data) || [];
      batch.forEach(n => {
        // Newest printing first. Prefer a "Basic X Energy" over plain "X Energy".
        let hit = null;
        for (const v of nameVariants(n)) {
          hit = found.find(c => nameKey(c.name) === nameKey(v));
          if (hit) break;
        }
        if (hit) {
          const e = enrichCard(hit);
          e.matchedBy = 'name';
          out.set(String(n).toLowerCase(), e);
        }
      });
    }));
  }

  // Stub anything still missing, so coverage is visible.
  list.forEach(e => {
    const k = String(e.name).toLowerCase();
    if (!out.has(k)) out.set(k, enrichCard(null, { fallbackName: e.name }));
  });

  out.partial = failed || !doFetch;
  return out;
}

/** How much of the deck the engine could actually read. */
function coverage(cardMap) {
  let total = 0, resolved = 0, overridden = 0, inferred = 0;
  const missing = [];
  cardMap.forEach(c => {
    total++;
    if (c.resolved) resolved++;
    // v59: name the cards not found, so a misspelled line can be fixed. Basic Energy is always known.
    else if (c.name && !/^(?:basic\s+)?(?:\{\w\}|grass|fire|water|lightning|psychic|fighting|darkness|metal)\s+energy\b/i.test(c.name)) missing.push(c.name);
    if (c.source === 'override') overridden++;
    else if (c.source === 'inferred') inferred++;
  });
  return {
    total, resolved, overridden, inferred,
    unresolved: total - resolved,
    pct: total ? Math.round(resolved / total * 100) : 0,
    missing: missing.slice(0, 6),
  };
}

return {
  SET_MAP, LEARNED_SETS, OVERRIDES, SELECT_FIELDS,
  toCardId, apiName, nameKey, sameCard,
  parseHP, parseDamage, parseCost, parseStage, parsePrizeValue,
  parseRegulation, isBasicEnergy, isAceSpec,
  effectText, staticText, inferProvides, inferRequires,
  findOverride, enrichCard, fetchDeckCards, coverage, ctl63, revive115, outlet115,
};
});

/* ==== END tcg-enrich.js ==== */
