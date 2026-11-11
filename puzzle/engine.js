// RdyDeck rules core: a headless Pokemon TCG turn engine for puzzle mode (and, later, Goldfish).
//
// No DOM, no globals. A board (state) goes in, legal actions come out, an action is applied and
// a new state comes back; the old state is never changed. Card text is read by puzzle/text.js,
// which is Goldfish's own reader copied word for word, so both read cards the same way.
//
// Accuracy rule: anything the engine cannot read is never guessed. An unread card or effect
// marks the state `unread`, and a line that touches luck (a draw, a coin, a look at the top of
// the deck, a face-down Prize) marks it `luck`. The solver counts neither as a win, and the
// puzzle dealer throws away boards with unread cards that could matter.
//
// Plain script: in a page it sets window.RdyPuzzle; in Node, require() returns the same object.
(function (root) {
'use strict';

const makeText = root.RdyPuzzleText || (typeof require === 'function' ? require('./text.js') : null);

/* ---------------- Cards ----------------
 * A puzzle card is a plain object (see ARCHITECTURE "Card record"):
 * { key, name, cat: 'pokemon'|'trainer'|'energy', kind: 'item'|'supporter'|'tool'|'stadium'|null,
 *   sub: ['basic','ex',...], types: ['fire'], hp, stage: 'basic'|'stage1'|'stage2', from,
 *   p: Prize value, weak: { type, x } | null, res: { type, n } | null, retreat,
 *   attacks: [{ name, cost: ['fire','colorless'], dmg: '120' | '30+' | '50x' | '', text }],
 *   abil: [[name, text]], rtext: Trainer or Special Energy text, ace }
 * In zones a card sits in a ref { uid, card }. Refs are never changed, only moved.
 */
const HIDDEN = Object.freeze({ key: '?', name: 'Face-down card', cat: 'hidden', sub: [], types: [] });

// What Goldfish's reader asks of a card, answered for puzzle cards. The cache is kept off JSON.
function cardInfo(c) {
  if (!Object.prototype.hasOwnProperty.call(c, '_pi')) {
    Object.defineProperty(c, '_pi', { enumerable: false, value: {
      rtext: c.rtext || '', abil: (c.abil || []).map(a => ({ name: a[0], text: a[1] })),
      sub: (c.sub || []).map(s => String(s).toLowerCase()), types: (c.types || []).map(s => String(s).toLowerCase()),
      known: true, tx: true,
    } });
  }
  return c._pi;
}
const T = makeText({
  cardCategory: c => (c && c.cat) || 'trainer',
  gfInfo: cardInfo,
  gfKind: x => x.card.kind || 'item',
  cn23: s => String(s || ''),
});

function norm(s) { return T.gfNorm(s).toLowerCase(); }
function isPokemon(x) { return x.card.cat === 'pokemon'; }
function isEx(x) { return T.gfIsEx(x); }
function topOf(m) { return m.stack[m.stack.length - 1]; }
function monName(m) { return topOf(m).card.name; }

/* ---------------- State ----------------
 * state = { turn, cur: 0|1, first: bool, players: [me, opp], stadium: { ref, owner } | null,
 *           mods: { exBoost, exvBoost }, pending, luck, unread: [], ended, result, taken: [0,0],
 *           koIds: [], log: [], uid, mid }
 * player = { active, bench, hand, deck, discard, prizes, used: { energy, supporter, stadium, retreat },
 *            lim: {}, koLastTurn }
 * mon = { id, stack: [refs], energy: [refs], tool: ref|null, dmg, turnIn, evoTurn, ab: {}, trig, benchTurn, evoTurnHand, cantAttack }
 * `turn` is the current player's own turn number (1 = their first turn), as in Goldfish.
 */
function cloneMon(m) { return m && Object.assign({}, m, { stack: m.stack.slice(), energy: m.energy.slice(), ab: Object.assign({}, m.ab) }); }
function clonePlayer(p) {
  return Object.assign({}, p, { active: cloneMon(p.active), bench: p.bench.map(cloneMon), hand: p.hand.slice(), deck: p.deck.slice(),
    discard: p.discard.slice(), prizes: p.prizes.slice(), used: Object.assign({}, p.used), lim: Object.assign({}, p.lim) });
}
function clone(s) {
  return Object.assign({}, s, { players: s.players.map(clonePlayer), mods: Object.assign({}, s.mods), taken: s.taken.slice(), koIds: s.koIds.slice(),
    unread: s.unread.slice(), log: s.log.slice(), pending: s.pending ? clonePending(s.pending) : null });
}
function clonePending(P) { return Object.assign({}, P, { ctx: Object.assign({}, P.ctx), picked: P.picked ? P.picked.slice() : P.picked, stack: P.stack ? P.stack.map(clonePending) : P.stack }); }

const me = s => s.players[s.cur];
const foe = s => s.players[1 - s.cur];
function mons(p) { return [p.active].concat(p.bench).filter(Boolean); }
function findMon(s, id) { for (let k = 0; k < 2; k++) { const m = mons(s.players[k]).find(z => z.id === id); if (m) return { m, owner: k }; } return null; }
function log(s, t) { s.log.push(t); }
function take(arr, uid) { const i = arr.findIndex(x => x.uid === uid); return i < 0 ? null : arr.splice(i, 1)[0]; }
function newMon(s, ref, owner) { return { id: ++s.mid, stack: [ref], energy: [], tool: null, dmg: 0, turnIn: s.turn, evoTurn: -1, ab: {}, owner }; }
function markUnread(s, what) { if (!s.unread.includes(what)) s.unread.push(what); }

/* ---------------- Reading effects ----------------
 * Own-side sentences go to Goldfish's gfParseBody. Sentences that touch the opponent are read here,
 * because Goldfish skips them (it has no opponent). Any opponent sentence not on this list makes
 * the card unread, so nothing that could change a puzzle is silently dropped.
 */
const OPPISH = /opponent|during this turn, attacks used by|retreat cost|special condition/;
function readOpp(s) {
  let m;
  if (/^switch in 1 of your opponent's benched pokemon to the active spot$/.test(s)) return { t: 'gust' };
  if ((m = s.match(/^during this turn, attacks used by your pokemon do (\d+) more damage to your opponent's active pokemon ex( and active pokemon v)?$/))) return { t: 'boost', n: +m[1], v: !!m[2] };
  if ((m = s.match(/^(?:you may )?put (\d+) damage counters? on 1 of your opponent's pokemon$/))) return { t: 'counters', n: +m[1] };
  if ((m = s.match(/^(?:you may )?move up to (\d+) damage counters? from 1 of your pokemon to 1 of your opponent's pokemon$/))) return { t: 'moveCounters', n: +m[1] };
  return null;
}
function readBody(sents) {
  const steps = [];
  let chunk = [];
  const flush = () => {
    if (!chunk.length) return true;
    if (chunk.some(s => OPPISH.test(s))) return false;
    const b = T.gfParseBody(chunk); chunk = [];
    if (!b) return false;
    steps.push.apply(steps, b.steps);
    return true;
  };
  for (let i = 0; i < sents.length; i++) {
    const s = sents[i]; let m;
    if ((m = s.match(/^choose 1: • (.+)$/))) {
      if (!flush()) return null;
      const opts = [m[1]];
      while (/^• /.test(sents[i + 1] || '')) opts.push(sents[++i].slice(2));
      const read = opts.map(o => ({ label: o, steps: readBody([o]) }));
      if (read.some(o => !o.steps)) return null;
      steps.push({ t: 'choose', opts: read });
      continue;
    }
    const o = readOpp(s);
    if (o) { if (!flush()) return null; steps.push(o); continue; }
    chunk.push(s);
  }
  return flush() ? steps : null;
}

const _trainer = new Map();
/** A Trainer's rules: Goldfish's cost and "only if" reading, with steps that include the opponent. */
function readTrainer(ref) {
  const c = ref.card;
  if (_trainer.has(c)) return _trainer.get(c);
  const P = Object.assign({}, T.gfTrainerPlay(ref) || { steps: null });
  const kind = c.kind;
  if (P.passive) { P.steps = []; }
  else if (c.rtext) {
    const sents = T.gfSentences(kind === 'stadium' ? T.gfStadiumText(c.rtext) : c.rtext).filter(s =>
      !/^you can use this card only if /.test(s) && !/^if you go first, you may use this card during your first turn$/.test(s) &&
      !/^you can use this card only during your first turn$/.test(s) && !/^you can't use this card during your first turn/.test(s))
      .map(s => kind === 'stadium' ? s.replace(/^once during your turn, you may /, '') : s);
    P.steps = readBody(sents);
  }
  _trainer.set(c, P);
  return P;
}

const _abil = new Map();
/** A Pokemon's Abilities: Goldfish's reading of when and how often, with steps that include the opponent. */
function readAbilities(ref) {
  const c = ref.card;
  if (_abil.has(c)) return _abil.get(c);
  const out = T.gfAbilities(ref).map(A0 => {
    const A = Object.assign({}, A0);
    if (A.when !== 'passive') {
      // Same trimming as gfAbilities in index.html, then read with the opponent included.
      const body = T.gfSentences(A.text).filter(s => !/you can't use more than 1 /.test(s) && !/you must discard a card from your hand in order to use this ability/.test(s) && !/^.*you may use this ability$/.test(s))
        .map(s => s.replace(/^(?:once|as often as you like) during your (first )?turn, /, '').replace(T.GF_PRE, '').replace(/^(?:once during your (first )?turn, )/, '').replace(/^you may /, '')
          .replace(/^if you use this ability, your turn ends$/, 'your turn ends'));
      A.steps = readBody(body);
    }
    delete A.why; // Goldfish's reasons speak of Goldfish; the engine checks the board itself.
    A.koLast = /if any of your pokemon were knocked out during your opponent's last turn/.test(norm(A.text));
    return A;
  });
  _abil.set(c, out);
  return out;
}

/* Passive text the engine applies. Anything passive that matches none of these (and is not on the
 * "no effect this turn" list) is unread. Each entry: a test on the normalized text. */
const PASSIVE = {
  hpPlus: /^the pokemon this card is attached to gets \+(\d+) hp$/,
  retreatFree: /(?:have|has) no retreat cost/,
  retreatLess: /the retreat cost of the pokemon this card is attached to is ((?:colorless|\{c\}|\s)+) less/,
  pearl: /^if the lillie's pokemon this card is attached to is knocked out by damage from an attack from your opponent's pokemon, that player takes 1 fewer prize card$/,
  pyroduct: /evolution pokemon in play .*have no abilities/,
  gravity: /^each stage 2 pokemon in play .*gets -(\d+) hp$/,
  jamming: /^pokemon tools attached to each pokemon .*have no effect$/,
  thorns: /as long as this pokemon is in the active spot, pokemon with a rule box in play .*have no abilities, except for future pokemon/,
  flutter: /as long as this pokemon is in the active spot, your opponent's active pokemon has no abilities, except for midnight fluttering/,
  crustle: /^prevent all damage done to this pokemon by attacks from your opponent's pokemon ex$/,
  shaymin: /^prevent all damage done to your benched pokemon that don't have a rule box by attacks from your opponent's pokemon$/,
  fairyZone: /^the weakness of each of your opponent's (\w+) pokemon in play is now (\w+)/,
  battleCage: /prevent all damage counters from being placed on benched pokemon .*by effects of attacks and abilities from the opponent's pokemon/,
};
// Passive text that cannot change what happens on your turn before you attack.
const NO_EFFECT_NOW = [
  /draw 2 cards$/,                                           // Lucky Helmet: on your opponent's attack
  /recovers from all special conditions and can't be affected by any special conditions/, // Festival Grounds (Dipplin aside)
  /^once during each player's turn/,                          // read as a once-a-turn Stadium instead
];
function passiveKnown(text) {
  const t = T.gfSentences(text).join('. ');
  if (!t) return true;
  return Object.values(PASSIVE).some(r => r.test(t)) || NO_EFFECT_NOW.some(r => r.test(t));
}
function ptext(ref) { return ref ? T.gfSentences(ref.card.rtext || '').join('. ') : ''; }
function abilTexts(m) { return readAbilities(topOf(m)).map(a => ({ name: a.name, t: T.gfSentences(a.text).join('. ') })); }

/* ---------------- Board rules ---------------- */
function toolOn(s, m) { if (!m.tool) return null; if (s.stadium && PASSIVE.jamming.test(ptext(s.stadium.ref))) return null; return m.tool; }
function abilOff(s, m, owner) {
  const top = topOf(m);
  if (s.stadium && PASSIVE.pyroduct.test(ptext(s.stadium.ref)) && T.gfIsEvo(top)) return s.stadium.ref.card.name + ' is in play, so Evolution Pokémon have no Abilities.';
  for (let k = 0; k < 2; k++) {
    const act = s.players[k].active;
    if (!act || act === m) continue;
    const A = abilTexts(act);
    if (A.some(a => PASSIVE.thorns.test(a.t)) && T.gfRuleBox(top) && !T.gfSubs(top).includes('future')) return monName(act) + ' is Active, so Pokémon with a Rule Box have no Abilities.';
    if (k !== owner && m === s.players[owner].active && A.some(a => PASSIVE.flutter.test(a.t))) return monName(act) + ' is Active, so your Active Pokémon has no Abilities.';
  }
  return '';
}
function maxHp(s, m) {
  let hp = topOf(m).card.hp || 0;
  const tool = toolOn(s, m); let r;
  if (tool && (r = ptext(tool).match(PASSIVE.hpPlus))) hp += +r[1];
  if (s.stadium && (r = ptext(s.stadium.ref).match(PASSIVE.gravity)) && topOf(m).card.stage === 'stage2') hp -= +r[1];
  return hp;
}
function prizeValue(s, m) {
  let p = topOf(m).card.p || 1;
  const tool = toolOn(s, m);
  if (tool && PASSIVE.pearl.test(ptext(tool)) && /^lillie's /i.test(monName(m))) p -= 1;
  return Math.max(0, p);
}
function benchMax(s, p) {
  if (s.stadium && /can have up to (\d+) pokemon on their bench/.test(ptext(s.stadium.ref)) && mons(p).some(m => T.gfSubs(topOf(m)).includes('tera'))) return +ptext(s.stadium.ref).match(/up to (\d+)/)[1];
  return 5;
}
function canEvolve(s, m) { return s.turn >= 2 && m.turnIn < s.turn && m.evoTurn !== s.turn; }
/** The Energy types a card provides, or null when the engine cannot read it (most Special Energy). */
function provides(ref) { const t = T.gfEType(ref); return t ? [t] : null; }
/** Can these Energy pay this cost? Basic Energy only; anything else makes the answer unknown (null). */
function costMet(energy, cost) {
  const pool = [];
  for (const e of energy) { const p = provides(e); if (!p) return null; pool.push(p[0]); }
  for (const c of cost) {
    if (c === 'colorless') continue;
    const i = pool.indexOf(c); if (i < 0) return false; pool.splice(i, 1);
  }
  return pool.length >= cost.filter(c => c === 'colorless').length;
}
function retreatCost(s, m, owner) {
  const top = topOf(m), base = top.card.retreat;
  if (base == null) return null;
  const P = s.players[owner];
  const texts = [];
  if (s.stadium) texts.push(ptext(s.stadium.ref));
  mons(P).forEach(z => { if (!abilOff(s, z, owner)) abilTexts(z).forEach(a => texts.push(a.t)); });
  if (texts.some(x => /your basic pokemon in play have no retreat cost/.test(x)) && T.gfIsBasic(top)) return 0;
  let n = base;
  const tool = toolOn(s, m);
  if (tool) { const tt = ptext(tool);
    if (/the pokemon this card is attached to has no retreat cost/.test(tt)) return 0;
    const r = tt.match(PASSIVE.retreatLess); if (r) n -= (r[1].match(/colorless|\{c\}/g) || []).length; }
  if (!abilOff(s, m, owner)) abilTexts(m).forEach(a => { if (/this pokemon has no retreat cost/.test(a.t)) n = 0; });
  return Math.max(0, n);
}

/** Why an "only if" condition is not met now, '' when it is, or a reason when it cannot be read. */
function needWhy(s, need, selfUid) {
  if (!need) return '';
  const P = me(s), O = foe(s);
  let m;
  if (/^any of your pokemon were knocked out during your opponent's last turn$/.test(need)) return P.koLastTurn ? '' : 'None of your Pokémon were Knocked Out last turn.';
  if ((m = need.match(/^your opponent has (exactly )?(\d+)( or fewer)? prize cards remaining$/))) { const k = +m[2], n = O.prizes.length;
    return (m[3] ? n <= k : n === k) ? '' : `Needs your opponent at ${k} Prize card${k !== 1 ? 's' : ''}${m[3] ? ' or fewer' : ''}.`; }
  if ((m = need.match(/^you have (exactly )?(\d+)( or fewer)? prize cards remaining$/))) { const k = +m[2], n = P.prizes.length;
    return (m[3] ? n <= k : n === k) ? '' : `Needs you at ${k} Prize card${k !== 1 ? 's' : ''}${m[3] ? ' or fewer' : ''}.`; }
  if (/^you have more prize cards remaining than your opponent$/.test(need)) return P.prizes.length > O.prizes.length ? '' : 'Needs you behind on Prizes.';
  if (/^you have any tera pokemon in play$/.test(need)) return mons(P).some(z => T.gfSubs(topOf(z)).includes('tera')) ? '' : 'Needs a Tera Pokémon in play.';
  if ((m = need.match(/^your active pokemon has (\d+) or more energy attached(?: to it)?$/))) return P.active && P.active.energy.length >= +m[1] ? '' : `Needs ${m[1]} or more Energy on your Active Pokémon${P.active ? ', which has ' + P.active.energy.length : ''}.`;
  if (/^your active pokemon has (?:any )?energy attached(?: to it)?$/.test(need)) return P.active && P.active.energy.length ? '' : 'Needs Energy on your Active Pokémon.';
  if (/^(?:there is a|a) stadium (?:is )?in play$/.test(need)) return s.stadium ? '' : 'Needs a Stadium in play.';
  if ((m = need.match(/^you have (\d+) or more cards in your discard pile$/))) return P.discard.length >= +m[1] ? '' : `Needs ${m[1]} or more cards in your discard pile, and you have ${P.discard.length}.`;
  if ((m = need.match(/^you have (\d+) or fewer cards in your hand(?:, not counting this card| other than this card)?$/))) return P.hand.length - 1 <= +m[1] ? '' : `Needs ${m[1]} or fewer other cards in your hand.`;
  if ((m = need.match(/^you have (\d+) or more cards in your hand(?:, not counting this card| other than this card)?$/))) return P.hand.length - 1 >= +m[1] ? '' : `Needs ${m[1]} or more other cards in your hand.`;
  if ((m = need.match(/^you have (?:any |a |an )?(.+?) pokemon in play$/))) { const w = m[1].replace(/^any /, '');
    return mons(P).some(z => { const t = topOf(z); return T.gfKey(t).includes(w) || T.gfSubs(t).includes(w) || T.gfTypes(t).includes(w); }) ? '' : 'Needs ' + w + ' Pokémon in play.'; }
  if ((m = need.match(/^your bench has (\d+) or more pokemon$|^you have (\d+) or more benched pokemon$/))) { const k = +(m[1] || m[2]); return P.bench.length >= k ? '' : `Needs ${k} or more Benched Pokémon.`; }
  return '?';
}
/** Targets a Trainer's effect needs on the board (port of Goldfish's gfTargetWhy, plus gusts). */
function targetWhy(s, ref, steps) {
  const P = me(s), O = foe(s);
  const t = T.gfSentences(ref.card.rtext || '').join('. ');
  let m;
  if ((m = t.match(/your active pokemon that has (\d+) or more energy attached/))) { if (!P.active || P.active.energy.length < +m[1]) return `Needs ${m[1]} or more Energy on your Active Pokémon.`; }
  else if ((m = t.match(/(?:1 of )?your (benched )?pokemon that (?:has|have) (\d+) or more energy attached/))) { const pool = m[1] ? P.bench : mons(P);
    if (!pool.some(z => z.energy.length >= +m[2])) return `Needs a ${m[1] ? 'Benched ' : ''}Pokémon with ${m[2]} or more Energy.`; }
  if (/^(?:switch your active pokemon with 1 of your benched pokemon|switch in 1 of your benched pokemon to the active spot)/.test(t) && !P.bench.length) return 'Needs a Benched Pokémon to switch in.';
  if (/^(?:attach|move) .* (?:from|to) 1 of your benched pokemon/.test(t) && !P.bench.length) return 'Needs a Benched Pokémon.';
  if (/^search your deck/.test(t) && !P.deck.length) return 'Your deck is empty.';
  if (steps && steps[0] && steps[0].t === 'gust' && !O.bench.length) return "Your opponent has no Benched Pokémon.";
  return '';
}
function aceBlocked(s) {
  return mons(foe(s)).some(m => toolOn(s, m) && !abilOff(s, m, 1 - s.cur) && abilTexts(m).some(a => /if this pokemon has a pokemon tool attached, your opponent can't play any ace spec cards from their hand/.test(a.t)));
}
function abilWhy(s, m, A, handRef) {
  const P = me(s);
  if (A.when === 'passive') return 'Always on.';
  if (!A.steps) return '';
  if (m) { const off = abilOff(s, m, s.cur); if (off) return off; }
  if (A.koLast && !P.koLastTurn) return 'None of your Pokémon were Knocked Out last turn.';
  if (A.first && s.turn !== 1) return 'Only during your first turn.';
  if (A.when === 'bench' && !(m && m.trig && m.benchTurn === s.turn)) return 'Only right after you play it from your hand onto your Bench.';
  if (A.when === 'evolve' && !(m && m.trig && m.evoTurnHand === s.turn)) return 'Only right after you evolve into it from your hand.';
  if (A.active && m && P.active !== m) return 'Only while it is in the Active Spot.';
  if (A.benchOnly && m && P.active === m) return 'Only while it is on your Bench.';
  const used = A.many ? false : m ? m.ab[A.name] === s.turn : P.lim['hand:' + A.name + ':' + handRef.uid] === s.turn;
  if (used) return 'Already used this turn.';
  if (A.limit && P.lim[A.limit] === s.turn) return 'Only 1 ' + A.name + ' a turn.';
  if (A.limitHas && Object.keys(P.lim).some(k => k.startsWith('has:') && k.includes(A.limitHas.toLowerCase()) && P.lim[k] === s.turn)) return 'Only 1 of those a turn.';
  if (A.tera && !mons(P).some(z => T.gfSubs(topOf(z)).includes('tera'))) return 'Needs a Tera Pokémon in play.';
  if (A.mega && !mons(P).some(z => T.gfIsMega(topOf(z)) && isEx(topOf(z)) && (A.mega === 'any' || T.gfTypes(topOf(z)).includes(A.mega)))) return 'Needs a Mega Evolution Pokémon ex in play.';
  if (A.energy && m && !m.energy.some(e => T.gfEType(e) === A.energy)) return 'Needs ' + A.energy + ' Energy attached.';
  if (A.cost && P.hand.filter(y => !handRef || y.uid !== handRef.uid).length < A.cost) return 'Needs a card in hand to discard.';
  if (A.when === 'hand' && A.steps.some(x => x.t === 'benchSelf') && P.bench.length >= benchMax(s, P)) return 'Your Bench is full.';
  return '';
}

/* ---------------- Attacks ---------------- */
const _atk = new Map();
/** Read an attack: base damage, what adds to it, and what else it does. Null when any part is unread. */
function readAttack(a) {
  const k = a.name + '|' + a.dmg + '|' + a.text;
  if (_atk.has(k)) return _atk.get(k);
  const raw = String(a.dmg || '').replace(/×/g, 'x').trim();
  const mm = raw.match(/^(\d*)\s*([+x-]?)$/);
  let R = null;
  if (mm) {
    R = { base: mm[1] ? +mm[1] : 0, op: mm[2] || '', per: null, noWR: false, noFx: false, exPlus: 0, bench: null, edisc: null, luck: false };
    for (const s of T.gfSentences(a.text || '')) {
      let m;
      if ((m = s.match(/^this attack does (\d+) (more )?damage for each (?:(\w+) )?energy attached to (this pokemon|all of your pokemon)$/))) { R.per = { n: +m[1], what: 'energy', type: m[3] || '', where: m[4] }; continue; }
      if ((m = s.match(/^this attack does (\d+) (more )?damage for each of your benched pokemon$/))) { R.per = { n: +m[1], what: 'bench' }; continue; }
      if ((m = s.match(/^this attack does (\d+) (more )?damage for each damage counter on your opponent's active pokemon$/))) { R.per = { n: +m[1], what: 'oppCounters' }; continue; }
      if ((m = s.match(/^if your opponent's active pokemon is a pokemon ex, this attack does (\d+) more damage$/))) { R.exPlus = +m[1]; continue; }
      if (/^this attack's damage isn't affected by weakness or resistance$/.test(s)) { R.noWR = true; continue; }
      if (/^this attack's damage isn't affected by weakness or resistance, or by any effects on your opponent's active pokemon$/.test(s)) { R.noWR = true; R.noFx = true; continue; }
      if (/^this attack's damage isn't affected by any effects on your opponent's active pokemon$/.test(s)) { R.noFx = true; continue; }
      if ((m = s.match(/^this attack also does (\d+) damage to (1|each|2) of your opponent's benched pokemon$/))) { R.bench = { n: +m[1], who: m[2] }; continue; }
      if ((m = s.match(/^(?:you may )?discard (all|an?|\d+) (?:(\w+) )?energy (?:cards? )?from this pokemon$/))) { R.edisc = { n: m[1] === 'all' ? 99 : /^an?$/.test(m[1]) ? 1 : +m[1], type: m[2] || '' }; continue; }
      // Things that only matter on later turns, or only to your own hand after the attack ends the turn.
      if (/^during your (?:opponent's )?next turn, /.test(s) || /^heal \d+ damage from this pokemon$/.test(s) || /^draw (a|\d+) cards?$/.test(s)) continue;
      if (/^flip (a|\d+) coins?/.test(s) || /^if heads|^if tails|^for each heads/.test(s)) { R.luck = true; continue; }
      R = null; break;
    }
    if (R && R.op && !R.per && R.op !== '-') R = R.luck ? R : null; // "30+" or "50x" with no reading of what it counts
  }
  _atk.set(k, R);
  return R;
}
function attackWhy(s, m, a) {
  const P = me(s);
  if (s.turn === 1 && s.first) return 'No attacking on the first turn of the game.';
  if (m.cantAttack) return monName(m) + " can't attack this turn.";
  const ok = costMet(m.energy, a.cost || []);
  if (ok === false) return 'Not enough Energy.';
  return '';
}
function weakApplies(s, att, def) {
  const w = def.card.weak; if (!w) return null;
  let type = w.type;
  // Lillie's Clefairy ex: the attacker's side changes the defender's Weakness.
  mons(me(s)).forEach(z => { if (abilOff(s, z, s.cur)) return; abilTexts(z).forEach(a => { const r = a.t.match(PASSIVE.fairyZone); if (r && T.gfTypes(def).includes(r[1])) type = r[2]; }); });
  return T.gfTypes(att).includes(type) ? w : null;
}
function damageTo(s, att, R, target, isActive) {
  const A = topOf(att), D = topOf(target), owner = 1 - s.cur;
  let d = R.base;
  if (R.per) {
    let n = 0;
    if (R.per.what === 'energy') { const pool = R.per.where === 'this pokemon' ? att.energy : mons(me(s)).reduce((a, z) => a.concat(z.energy), []); n = pool.filter(e => !R.per.type || T.gfEType(e) === R.per.type).length; }
    else if (R.per.what === 'bench') n = me(s).bench.length;
    else if (R.per.what === 'oppCounters') n = foe(s).active ? foe(s).active.dmg / 10 : 0;
    d = (R.op === 'x' ? 0 : d) + R.per.n * n;
  }
  if (isActive) {
    if (R.exPlus && isEx(D)) d += R.exPlus;
    if (d > 0 && isEx(D)) d += s.mods.exBoost || 0;
    if (d > 0 && (isEx(D) || T.gfSubs(D).includes('v'))) d += s.mods.exvBoost || 0;
    if (d > 0 && !R.noWR) { const w = weakApplies(s, A, D); if (w) d = w.plus ? d + w.plus : d * (w.x || 2); const r = D.card.res; if (r && T.gfTypes(A).includes(r.type)) d -= r.n; }
  }
  d = Math.max(0, d);
  // Damage prevention on the defending side.
  if (!(isActive && R.noFx) && !abilOff(s, target, owner)) {
    const A2 = abilTexts(target);
    if (isEx(A) && A2.some(a => PASSIVE.crustle.test(a.t))) d = 0;
  }
  if (!isActive) {
    if (T.gfSubs(D).includes('tera') && isEx(D)) d = 0; // Tera Pokemon ex rule: no damage from attacks while Benched
    if (!T.gfRuleBox(D) && mons(s.players[owner]).some(z => !abilOff(s, z, owner) && abilTexts(z).some(a => PASSIVE.shaymin.test(a.t)))) d = 0;
  }
  return d;
}

/* ---------------- Knock Outs and Prizes ---------------- */
function checkKOs(s) {
  for (const k of [1 - s.cur, s.cur]) {
    const P = s.players[k];
    for (const m of mons(P)) {
      if (m.dmg < maxHp(s, m)) continue;
      const wasActive = P.active === m;
      if (wasActive) P.active = null; else P.bench = P.bench.filter(z => z !== m);
      m.stack.concat(m.energy, m.tool ? [m.tool] : []).forEach(y => P.discard.push(y));
      const n = prizeValue(s, m), taker = s.players[1 - k];
      const got = taker.prizes.splice(0, Math.min(n, taker.prizes.length));
      // Prizes are taken face down: what you take is luck, so it goes to your hand unusable.
      got.forEach(() => taker.hand.push({ uid: ++s.uid, card: HIDDEN }));
      s.taken[1 - k] += got.length;
      if (k !== s.cur) s.koIds.push(m.id);
      log(s, `${monName(m)} is Knocked Out (${got.length} Prize card${got.length !== 1 ? 's' : ''} taken)`);
      if (wasActive && P.bench.length) s.promote = (s.promote || []).concat(k);
    }
  }
  return s;
}
function winner(s) {
  for (const k of [s.cur, 1 - s.cur]) {
    const O = s.players[1 - k];
    if (s.players[k].prizes.length === 0 && s.taken[k] > 0) return k;
    if (!mons(O).length) return k;
  }
  return -1;
}

/* ---------------- Running effects ----------------
 * An effect runs step by step. When a step needs a choice, the state gets `pending`:
 * { who: 0|1, ask: { kind, ... }, steps, i, ctx, src } and legalActions() lists the answers.
 */
function startRun(s, steps, ctx) {
  s.pending = { who: s.cur, steps, i: 0, ctx: Object.assign({ drew: 0, attached: 0, switched: false, heads: null }, ctx), ask: null };
  return go(s);
}
function finishRun(s) {
  const R = s.pending; s.pending = null;
  if (R.ctx.card) me(s).discard.push(R.ctx.card);
  if (R.ctx.endTurn) endTurn(s, 'Your turn ends');
  return s;
}
function ask(s, kind, data) { s.pending.ask = Object.assign({ kind }, data); return s; }
function drawN(s, P, n) {
  if (n > 0 && P.deck.length) s.luck = true;
  for (let i = 0; i < n && P.deck.length; i++) P.hand.push(P.deck.shift());
  return n;
}
function go(s) {
  const R = s.pending; if (!R) return s;
  if (!R.steps) { markUnread(s, R.ctx.name); return finishRun(s); }
  const P = me(s), O = foe(s);
  while (R.i < R.steps.length) {
    if (s.promote && s.promote.length) return s; // wait for a new Active
    const st = R.steps[R.i], c = R.ctx;
    if ((st.ifHeads && !c.heads) || (st.ifAttached && !c.attached) || (st.ifDrew && !c.drew) || (st.ifSwitched && !c.switched)) { R.i++; continue; }
    if (R.ask && R.ask.step === R.i) return s;
    switch (st.t) {
      case 'draw': { let n = st.alt && st.alt.prizes != null && P.prizes.length === st.alt.prizes ? st.alt.n : st.n; c.drew += drawN(s, P, n); break; }
      case 'drawTo': c.drew += drawN(s, P, Math.max(0, st.n - P.hand.length)); break;
      case 'drawPrizes': c.drew += drawN(s, P, P.prizes.length); break;
      case 'discardHand': P.hand.splice(0).forEach(y => P.discard.push(y)); break;
      case 'shuffleHand': case 'bottomHand': P.deck = P.deck.concat(P.hand.splice(0)); break;
      case 'coin': s.luck = true; c.heads = true; break;
      case 'endTurn': c.endTurn = true; break;
      case 'look': s.luck = true; break; // the top of the deck is unknown in a puzzle
      case 'koSelf': { const f = findMon(s, c.mon); if (f) { f.m.dmg = 99999; checkKOs(s); } break; }
      case 'selfShuffle': { const f = findMon(s, c.mon); if (!f) break; const m = f.m;
        if (P.active === m) { P.active = null; if (P.bench.length) s.promote = [s.cur]; } else P.bench = P.bench.filter(z => z !== m);
        P.deck = P.deck.concat(m.stack, m.energy, m.tool ? [m.tool] : []); break; }
      case 'benchSelf': { const x = take(P.hand, c.handUid); if (!x) break; if (P.bench.length >= benchMax(s, P)) { P.hand.push(x); break; }
        P.bench.push(newMon(s, x, s.cur)); break; }
      case 'boost': if (st.v) s.mods.exvBoost = (s.mods.exvBoost || 0) + st.n; else s.mods.exBoost = (s.mods.exBoost || 0) + st.n; break;
      case 'discardStadium': if (s.stadium) return ask(s, 'yesno', { step: R.i, q: 'Discard ' + s.stadium.ref.card.name + '?' }); break;
      case 'choose': return ask(s, 'option', { step: R.i });
      case 'switchSelf': { const f = findMon(s, c.mon); if (!f || !P.active || P.active === f.m) break; return ask(s, 'yesno', { step: R.i }); }
      case 'switch': if (!P.active || !P.bench.length) break; return ask(s, 'benchMon', { step: R.i });
      case 'gust': if (!O.active || !O.bench.length) break; return ask(s, 'oppBench', { step: R.i });
      case 'counters': return ask(s, 'oppMon', { step: R.i });
      case 'moveCounters': if (!mons(P).some(z => z.dmg > 0)) break; return ask(s, 'moveCounters', { step: R.i });
      case 'moveEnergy': if (mons(P).length < 2 || !mons(P).some(z => z.energy.some(e => T.gfEType(e)))) break; return ask(s, 'moveEnergy', { step: R.i });
      case 'moveToSelf': { const f = findMon(s, c.mon); if (!f || !mons(P).some(z => z !== f.m && z.energy.length)) break; return ask(s, 'moveToSelf', { step: R.i }); }
      case 'pickUp': if (!mons(P).some(z => !st.basic || T.gfIsBasic(topOf(z)))) break; return ask(s, 'pickUp', { step: R.i });
      case 'attach': c.left = st.n; c.target = null; c.done = []; if (!attachChoices(s).length) break; return ask(s, 'attach', { step: R.i });
      case 'cost': if (P.hand.filter(y => T.gfFit(y, st.F || { any: true })).length < st.n) { R.i = R.steps.length; continue; } return ask(s, 'cost', { step: R.i });
      case 'search': return ask(s, 'search', { step: R.i });
      case 'recover': return ask(s, 'recover', { step: R.i });
      case 'topFromHand': if (!P.hand.length) break; return ask(s, 'topFromHand', { step: R.i });
      default: markUnread(s, c.name + ' (' + st.t + ')');
    }
    R.i++;
  }
  return finishRun(s);
}
function stepNow(s) { const R = s.pending; return R.steps[R.ask.step]; }
function attachChoices(s) {
  const R = s.pending, st = R.steps[R.i] || stepNow(s), c = R.ctx, P = me(s);
  if (c.left <= 0) return [];
  const src = st.from === 'discard' ? P.discard : P.hand;
  const en = src.filter(y => T.gfEType(y) && (!st.etype || T.gfEType(y) === st.etype));
  let targets = st.to === 'self' ? mons(P).filter(m => m.id === c.mon) : st.to === 'bench' ? P.bench : mons(P);
  if (st.owner) targets = targets.filter(m => T.gfKey(topOf(m)).startsWith(st.owner));
  if (st.mtype) targets = targets.filter(m => T.gfTypes(topOf(m)).includes(st.mtype));
  if (st.mstage) targets = targets.filter(m => st.mstage === 'evolution' ? T.gfIsEvo(topOf(m)) : topOf(m).card.stage === st.mstage);
  if (c.target) targets = targets.filter(m => m.id === c.target);
  if (st.each) targets = targets.filter(m => !c.done.includes(m.id));
  const out = [], seen = new Set();
  en.forEach(y => targets.forEach(m => { const k = y.card.key + '>' + m.id; if (seen.has(k)) return; seen.add(k); out.push({ uid: y.uid, mon: m.id }); }));
  return out;
}
/** Every way to pick cards for a spec, one pick per group of identical cards (same card key). */
function picksFor(pool, spec, maxN, exact) {
  const groups = new Map();
  pool.forEach(y => { const k = y.card.key; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(y); });
  const G = [...groups.values()].filter(g => T.gfSpecFits(spec, g[0]) || (spec.alts.some(a => a.some(x => x.F.any))));
  const out = [];
  const rec = (gi, picks) => {
    if (gi === G.length) {
      if (exact != null ? picks.length === exact : true) if (T.gfSlotsOk(spec, picks)) out.push(picks.map(y => y.uid));
      return;
    }
    for (let k = 0; k <= G[gi].length && picks.length + k <= maxN; k++) rec(gi + 1, picks.concat(G[gi].slice(0, k)));
  };
  rec(0, []);
  return out;
}

/* ---------------- Legal actions ---------------- */
/**
 * Every action the player to act can take now. Each action is a plain object; pass it to apply().
 * While an effect waits on a choice, only the answers to that choice are listed.
 * `why` is filled in only with opts.why (for the UI): then actions that cannot be taken are listed too, with the reason.
 */
function legalActions(s, opts) {
  if (s.ended) return [];
  if (s.promote && s.promote.length) {
    const k = s.promote[0];
    return s.players[k].bench.map(m => ({ t: 'promote', who: k, mon: m.id }));
  }
  if (s.pending) return answers(s);
  const P = me(s), O = foe(s), out = [], wantWhy = opts && opts.why;
  const add = (a, why) => { if (!why) out.push(a); else if (wantWhy) out.push(Object.assign(a, { why })); };
  const ms = mons(P), room = P.bench.length < benchMax(s, P);
  const seen = new Set();
  for (const x of P.hand) {
    const c = x.card;
    if (seen.has(c)) continue; seen.add(c); // identical cards give identical actions
    if (c.cat === 'pokemon') {
      if (T.gfIsBasic(x)) add({ t: 'bench', uid: x.uid }, room ? '' : 'Your Bench is full.');
      else if (T.gfIsEvo(x)) {
        const from = String(c.from || '').toLowerCase();
        ms.filter(m => T.gfKey(topOf(m)) === from).forEach(m => add({ t: 'evolve', uid: x.uid, mon: m.id }, canEvolve(s, m) ? '' : 'It cannot evolve this turn.'));
      }
      readAbilities(x).forEach((A, i) => { if (A.when === 'hand') add({ t: 'handAbility', uid: x.uid, i }, abilWhy(s, null, A, x)); });
    } else if (c.cat === 'energy') {
      ms.forEach(m => add({ t: 'energy', uid: x.uid, mon: m.id }, P.used.energy ? 'You already attached an Energy this turn.' : ''));
    } else if (c.cat === 'trainer') {
      if (c.ace && aceBlocked(s)) { add({ t: 'trainer', uid: x.uid }, "Your opponent's Pokémon stops ACE SPEC cards."); continue; }
      if (c.kind === 'tool') { ms.forEach(m => add({ t: 'tool', uid: x.uid, mon: m.id }, m.tool ? 'It already has a Tool.' : '')); continue; }
      if (c.kind === 'stadium') { add({ t: 'stadium', uid: x.uid }, P.used.stadium ? 'One Stadium a turn.' : s.stadium && s.stadium.ref.card.name === c.name ? 'That Stadium is already in play.' : ''); continue; }
      if (/^rare candy$/i.test(c.name)) {
        P.hand.filter(y => y.card.stage === 'stage2').forEach(s2 => {
          // The Basic behind a Stage 2: the puzzle card table records it as `base` (as the grader does).
          ms.filter(m => m.stack.length === 1 && T.gfKey(topOf(m)) === String(s2.card.base || '').toLowerCase())
            .forEach(m => add({ t: 'candy', uid: x.uid, s2: s2.uid, mon: m.id }, canEvolve(s, m) ? '' : 'It cannot evolve this turn.'));
        });
        continue;
      }
      const TP = readTrainer(x), sup = c.kind === 'supporter';
      let why = '';
      if (sup && P.used.supporter) why = 'You already played a Supporter this turn.';
      else if (sup && s.turn === 1 && s.first && !TP.firstOK) why = 'No Supporter on the first turn of the game.';
      else if (TP.firstOnly && s.turn !== 1) why = 'Only during your first turn.';
      else if (TP.noFirst && s.turn === 1) why = 'Not during your first turn.';
      else if (TP.need) { why = needWhy(s, TP.need, x.uid); if (why === '?') { markUnread(s, c.name); why = 'The engine cannot read its condition.'; } }
      if (!why && TP.cost && P.hand.filter(y => y.uid !== x.uid && T.gfFit(y, TP.cost.F)).length < TP.cost.n) why = 'Needs cards in hand to discard.';
      if (!why) why = targetWhy(s, x, TP.steps);
      add({ t: 'trainer', uid: x.uid }, why);
    }
  }
  // Stadium in play, once a turn.
  if (s.stadium) { const TP = readTrainer(s.stadium.ref); if (TP.once) add({ t: 'stadiumUse' }, P.lim.stadiumUse === s.turn ? 'Already used this turn.' : ''); }
  ms.forEach(m => readAbilities(topOf(m)).forEach((A, i) => { if (A.when !== 'passive') add({ t: 'ability', mon: m.id, i }, abilWhy(s, m, A)); }));
  if (P.active && P.bench.length) {
    const cost = retreatCost(s, P.active, s.cur);
    const why = P.used.retreat ? 'You already retreated this turn.' : cost == null ? 'Retreat Cost unknown.' : P.active.energy.length < cost ? 'Not enough Energy to retreat.' : '';
    if (why) add({ t: 'retreat' }, why);
    else payOptions(P.active.energy, cost).forEach(pay => P.bench.forEach(m => out.push({ t: 'retreat', mon: m.id, pay })));
  }
  if (P.active) topOf(P.active).card.attacks.forEach((a, i) => add({ t: 'attack', i }, attackWhy(s, P.active, a)));
  out.push({ t: 'end' });
  return out;
}
/** Which Energy to discard for a cost of n: one option per mix of Energy cards. */
function payOptions(energy, n) {
  if (!n) return [[]];
  const groups = new Map(); energy.forEach(e => { const k = e.card.key; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); });
  const G = [...groups.values()], out = [];
  const rec = (gi, picks) => { if (picks.length === n) { out.push(picks.map(e => e.uid)); return; } if (gi === G.length) return;
    for (let k = Math.min(G[gi].length, n - picks.length); k >= 0; k--) rec(gi + 1, picks.concat(G[gi].slice(0, k))); };
  rec(0, []);
  return out;
}
function answers(s) {
  const R = s.pending, A = R.ask, st = R.steps[A.step], P = me(s), O = foe(s), c = R.ctx, out = [];
  const pick = v => out.push({ t: 'pick', v });
  switch (A.kind) {
    case 'yesno': pick(true); pick(false); break;
    case 'option': st.opts.forEach((o, k) => pick(k)); break;
    case 'benchMon': P.bench.forEach(m => pick(m.id)); break;
    case 'oppBench': O.bench.forEach(m => pick(m.id)); break;
    case 'oppMon': mons(O).forEach(m => pick(m.id)); break;
    case 'moveCounters': mons(P).filter(z => z.dmg > 0).forEach(a => { for (let n = Math.min(st.n, a.dmg / 10); n >= 1; n--) mons(O).forEach(b => pick({ from: a.id, n, to: b.id })); }); break;
    case 'moveEnergy': mons(P).forEach(a => { const seen = new Set(); a.energy.filter(e => T.gfEType(e)).forEach(e => { if (seen.has(e.card.key)) return; seen.add(e.card.key);
      mons(P).filter(b => b !== a).forEach(b => pick({ from: a.id, uid: e.uid, to: b.id })); }); }); break;
    case 'moveToSelf': mons(P).filter(a => a.id !== c.mon).forEach(a => { const seen = new Set(); a.energy.forEach(e => { if (seen.has(e.card.key)) return; seen.add(e.card.key); pick({ from: a.id, uid: e.uid }); }); }); pick(null); break;
    case 'pickUp': mons(P).filter(z => !st.basic || T.gfIsBasic(topOf(z))).forEach(m => pick(m.id)); break;
    case 'attach': attachChoices(s).forEach(pick); pick(null); break;
    case 'cost': picksFor(P.hand.filter(y => y.uid !== (c.card && c.card.uid) && T.gfFit(y, st.F || { any: true })), { alts: [[{ n: st.n, F: st.F || { any: true } }]] }, st.n, st.n).forEach(pick); break;
    case 'search': {
      const max = Math.min(T.gfMaxOf(st.spec), st.dest === 'bench' ? benchMax(s, P) - P.bench.length : 99);
      picksFor(P.deck.filter(y => y.card.cat !== 'hidden'), st.spec, max).forEach(pick); // a face-down card can't be counted on
      break;
    }
    case 'recover': picksFor(P.discard.filter(y => y.card.cat !== 'hidden'), st.spec, T.gfMaxOf(st.spec)).forEach(pick); break;
    case 'topFromHand': { const seen = new Set(); P.hand.forEach(y => { if (seen.has(y.card)) return; seen.add(y.card); pick(y.uid); }); break; }
    case 'splitAttach': mons(P).forEach(m => pick(m.id)); break;
  }
  return out;
}

/* ---------------- Applying actions ---------------- */
function apply(s0, a) {
  const s = clone(s0), P = me(s);
  switch (a.t) {
    case 'promote': { const Q = s.players[a.who]; const i = Q.bench.findIndex(m => m.id === a.mon); Q.active = Q.bench.splice(i, 1)[0]; s.promote.shift(); log(s, monName(Q.active) + ' is now Active'); return s.pending ? go(s) : s; }
    case 'pick': return answer(s, a.v);
    case 'bench': { const x = take(P.hand, a.uid); const m = newMon(s, x, s.cur); m.trig = true; m.benchTurn = s.turn; P.bench.push(m); benchRuins(s, m); log(s, 'Benched ' + x.card.name); return checkKOs(s); }
    case 'evolve': { const x = take(P.hand, a.uid), m = findMon(s, a.mon).m; m.stack.push(x); m.evoTurn = s.turn; m.trig = true; m.evoTurnHand = s.turn; log(s, 'Evolved into ' + x.card.name); return s; }
    case 'candy': { const cd = take(P.hand, a.uid), s2 = take(P.hand, a.s2), m = findMon(s, a.mon).m; m.stack.push(s2); m.evoTurn = s.turn; m.trig = true; m.evoTurnHand = s.turn; P.discard.push(cd); log(s, 'Rare Candy: ' + s2.card.name); return s; }
    case 'energy': { const x = take(P.hand, a.uid), m = findMon(s, a.mon).m; m.energy.push(x); P.used.energy = true; log(s, 'Attached ' + x.card.name + ' to ' + monName(m)); return s; }
    case 'tool': { const x = take(P.hand, a.uid), m = findMon(s, a.mon).m; m.tool = x; if (!passiveKnown(x.card.rtext)) markUnread(s, x.card.name); log(s, 'Attached ' + x.card.name + ' to ' + monName(m)); return s; }
    case 'stadium': { const x = take(P.hand, a.uid); if (s.stadium) s.players[s.stadium.owner].discard.push(s.stadium.ref); s.stadium = { ref: x, owner: s.cur }; P.used.stadium = true;
      const TP = readTrainer(x); if (!TP.once && !passiveKnown(x.card.rtext)) markUnread(s, x.card.name); log(s, 'Played ' + x.card.name); return checkKOs(s); }
    case 'stadiumUse': { P.lim.stadiumUse = s.turn; const TP = readTrainer(s.stadium.ref); return startRun(s, TP.steps, { name: s.stadium.ref.card.name }); }
    case 'trainer': {
      const x = take(P.hand, a.uid), TP = readTrainer(x);
      if (x.card.kind === 'supporter') P.used.supporter = true;
      log(s, 'Played ' + x.card.name);
      const steps = TP.cost ? [{ t: 'cost', n: TP.cost.n, F: TP.cost.F }].concat(TP.steps || []) : TP.steps;
      return startRun(s, TP.steps ? steps : null, { name: x.card.name, card: x });
    }
    case 'ability': case 'handAbility': {
      let m = null, x = null;
      if (a.t === 'ability') m = findMon(s, a.mon).m; else x = P.hand.find(y => y.uid === a.uid);
      const A = readAbilities(m ? topOf(m) : x)[a.i];
      if (m) m.ab[A.name] = s.turn; else P.lim['hand:' + A.name + ':' + x.uid] = s.turn;
      if (A.limit) P.lim[A.limit] = s.turn;
      if (A.limitHas) P.lim['has:' + A.name.toLowerCase()] = s.turn;
      log(s, 'Used ' + A.name);
      const steps = A.steps ? (A.cost ? [{ t: 'cost', n: A.cost, F: { any: true } }] : []).concat(A.steps) : null;
      return startRun(s, steps, { name: A.name, mon: m && m.id, handUid: x && x.uid });
    }
    case 'retreat': {
      const old = P.active; a.pay.forEach(uid => P.discard.push(take(old.energy, uid)));
      const i = P.bench.findIndex(m => m.id === a.mon); P.active = P.bench[i]; P.bench[i] = old; P.used.retreat = true;
      log(s, 'Retreated ' + monName(old) + (monName(old) === monName(P.active) ? ' for the other ' : ' for ') + monName(P.active)); return s;
    }
    case 'attack': return attack(s, a.i);
    case 'end': return endTurn(s, 'Ended the turn');
  }
  throw new Error('Unknown action ' + a.t);
}
function benchRuins(s, m) {
  if (!s.stadium) return;
  const t = ptext(s.stadium.ref), r = t.match(/^whenever any player puts a basic non-(\w+) pokemon onto their bench during their turn, place (\d+) damage counters on that pokemon$/);
  if (r && T.gfIsBasic(topOf(m)) && !T.gfTypes(topOf(m)).includes(r[1])) m.dmg += 10 * +r[2];
}
function answer(s, v) {
  const R = s.pending, A = R.ask, st = R.steps[A.step], P = me(s), O = foe(s), c = R.ctx;
  R.ask = null;
  const next = () => { R.i = A.step + 1; return go(s); };
  switch (A.kind) {
    case 'yesno':
      if (st.t === 'discardStadium' && v) { s.players[s.stadium.owner].discard.push(s.stadium.ref); s.stadium = null; }
      if (st.t === 'switchSelf' && v) { const m = findMon(s, c.mon).m, i = P.bench.indexOf(m); P.bench[i] = P.active; P.active = m; c.switched = true; }
      return next();
    case 'option': { const rest = R.steps.slice(A.step + 1); R.steps = R.steps.slice(0, A.step).concat(st.opts[v].steps || [], rest); R.i = A.step; return go(s); }
    case 'benchMon': { const i = P.bench.findIndex(m => m.id === v); const m = P.bench[i]; P.bench[i] = P.active; P.active = m; c.switched = true; log(s, monName(m) + ' is now Active'); return next(); }
    case 'oppBench': { const i = O.bench.findIndex(m => m.id === v); const m = O.bench[i]; O.bench[i] = O.active; O.active = m; c.gusted = true; log(s, 'Switched in ' + monName(m)); return next(); }
    case 'oppMon': {
      const f = findMon(s, v), m = f.m, isBench = O.active !== m;
      const cage = s.stadium && PASSIVE.battleCage.test(ptext(s.stadium.ref));
      if (!(isBench && cage)) m.dmg += 10 * st.n;
      log(s, `Put ${st.n} damage counters on ${monName(m)}`); checkKOs(s); return next();
    }
    case 'moveCounters': {
      const a = findMon(s, v.from).m, b = findMon(s, v.to).m;
      const cage = s.stadium && PASSIVE.battleCage.test(ptext(s.stadium.ref));
      a.dmg -= 10 * v.n; if (!(O.active !== b && cage)) b.dmg += 10 * v.n;
      log(s, `Moved ${v.n} damage counters from ${monName(a)} to ${monName(b)}`); checkKOs(s); return next();
    }
    case 'moveEnergy': { const a = findMon(s, v.from).m, b = findMon(s, v.to).m, x = take(a.energy, v.uid); b.energy.push(x); log(s, `Moved ${x.card.name} from ${monName(a)} to ${monName(b)}`); return next(); }
    case 'moveToSelf': { if (v == null) return next(); const a = findMon(s, v.from).m, b = findMon(s, c.mon).m, x = take(a.energy, v.uid); b.energy.push(x); log(s, `Moved ${x.card.name} from ${monName(a)} to ${monName(b)}`); R.ask = null; return ask(s, 'moveToSelf', { step: A.step }); }
    case 'pickUp': { const m = findMon(s, v).m; log(s, 'Put ' + monName(m) + ' back into your hand'); if (P.active === m) { P.active = null; if (P.bench.length) s.promote = [s.cur]; } else P.bench = P.bench.filter(z => z !== m);
      P.hand.push.apply(P.hand, m.stack); (st.keep ? P.hand : P.discard).push.apply(st.keep ? P.hand : P.discard, m.energy.concat(m.tool ? [m.tool] : [])); return next(); }
    case 'attach': {
      if (v == null) return next();
      const src = st.from === 'discard' ? P.discard : P.hand, x = take(src, v.uid), m = findMon(s, v.mon).m;
      m.energy.push(x); log(s, 'Attached ' + x.card.name + ' to ' + monName(m)); c.attached++; c.left--; if (st.each) c.done = c.done.concat(m.id); else c.target = m.id;
      R.i = A.step; if (c.left > 0 && attachChoices(s).length) return ask(s, 'attach', { step: A.step });
      return next();
    }
    case 'cost': { const got = v.map(uid => take(P.hand, uid)); got.forEach(x => P.discard.push(x)); if (got.length) log(s, 'Discarded ' + got.map(x => x.card.name).join(', ')); return next(); }
    case 'search': {
      const got = v.map(uid => take(P.deck, uid));
      if (st.dest === 'bench') got.forEach(x => { const m = newMon(s, x, s.cur); m.trig = true; m.benchTurn = s.turn; P.bench.push(m); benchRuins(s, m); });
      else if (st.dest === 'top') { s.luck = true; P.deck = got.concat(P.deck); }
      else if (st.split && got.length === 2) { P.hand.push(got[0]); c.splitRef = got[1]; R.i = A.step; return ask(s, 'splitAttach', { step: A.step }); }
      else got.forEach(x => P.hand.push(x));
      log(s, got.length ? 'Searched for ' + got.map(x => x.card.name).join(', ') : 'Searched and took nothing');
      checkKOs(s); return next();
    }
    case 'splitAttach': { const m = findMon(s, v).m; m.energy.push(c.splitRef); log(s, 'Attached ' + c.splitRef.card.name + ' to ' + monName(m)); c.splitRef = null; return next(); }
    case 'recover': { const got = v.map(uid => take(P.discard, uid)); if (st.dest === 'deck') P.deck = P.deck.concat(got); else got.forEach(x => P.hand.push(x));
      log(s, got.length ? 'Took back ' + got.map(x => x.card.name).join(', ') + (st.dest === 'deck' ? ' into your deck' : '') : 'Took back nothing'); return next(); }
    case 'topFromHand': { const x = take(P.hand, v); P.deck.unshift(x); log(s, 'Put ' + x.card.name + ' on top of your deck'); return next(); }
  }
  throw new Error('Unknown choice ' + A.kind);
}
function attack(s, i) {
  const P = me(s), O = foe(s), att = P.active, a = topOf(att).card.attacks[i];
  const R = readAttack(a);
  log(s, monName(att) + ' used ' + a.name);
  if (!R) { markUnread(s, monName(att) + ': ' + a.name); return endTurn(s); }
  if (R.luck) s.luck = true;
  if (O.active) O.active.dmg += damageTo(s, att, R, O.active, true);
  if (R.bench && R.bench.who === 'each') O.bench.forEach(m => { m.dmg += damageTo(s, att, { base: R.bench.n }, m, false); });
  else if (R.bench) { s.pendingBench = R.bench; }
  if (R.edisc) { const k = att.energy.filter(e => !R.edisc.type || T.gfEType(e) === R.edisc.type).slice(0, R.edisc.n); k.forEach(e => { take(att.energy, e.uid); P.discard.push(e); }); }
  checkKOs(s);
  if (s.pendingBench) { markUnread(s, a.name + ' (Bench damage to a chosen Pokémon)'); s.pendingBench = null; }
  return endTurn(s);
}
function endTurn(s, why) { s.ended = true; s.pending = null; if (why) log(s, why); return s; }

/* ---------------- Card records ---------------- */
const BOILER = /^(you may play (only 1|any number of)|you may attach any number of pok[e\u00e9]mon tools|attach a pok[e\u00e9]mon tool to 1 of your pok[e\u00e9]mon that doesn|ace spec:|you can't have more than 1 ace spec)/i;
/**
 * A puzzle card from a pokemontcg.io card record (the source the app already reads).
 * opts.base(stage1Name) names the Basic behind a Stage 2 (the grader's td66Bases does the same).
 */
function cardFromApi(c, opts) {
  const sup = String(c.supertype || '').toLowerCase();
  const cat = /^pok/.test(sup) ? 'pokemon' : sup === 'trainer' ? 'trainer' : 'energy';
  const sub = (c.subtypes || []).map(x => String(x).toLowerCase());
  const rules = (c.rules || []).map(r => String(r).trim());
  const out = { key: c.id || c.name, name: c.name, cat, sub, types: (c.types || []).map(t => t.toLowerCase()) };
  if (c.images && c.images.small) out.img = c.images.small;
  if (cat === 'pokemon') {
    const st = sub.includes('stage 2') ? 'stage2' : sub.includes('stage 1') ? 'stage1' : 'basic';
    const all = [...rules.join(' ').toLowerCase().matchAll(/takes?\s+(\d+)\s+prize/g)].map(x => +x[1]);
    Object.assign(out, {
      hp: +c.hp || 0, stage: st, from: c.evolvesFrom || null,
      p: all.length ? Math.max.apply(null, all) : sub.some(x => x === 'mega' || x === 'vmax' || x === 'vstar') ? 3 : sub.some(x => x === 'ex' || x === 'v') ? 2 : 1,
      retreat: c.convertedRetreatCost != null ? +c.convertedRetreatCost : (c.retreatCost || []).length,
      weak: (w => !w ? null : /^[x\u00d7]\d+$/i.test(w.value) ? { type: w.type.toLowerCase(), x: +w.value.slice(1) } : { type: w.type.toLowerCase(), plus: +String(w.value).replace(/[^\d]/g, '') })((c.weaknesses || [])[0]),
      res: (r => r ? { type: r.type.toLowerCase(), n: Math.abs(parseInt(r.value, 10)) } : null)((c.resistances || [])[0]),
      attacks: (c.attacks || []).map(a => ({ name: a.name, cost: (a.cost || []).map(x => x.toLowerCase()).filter(x => x !== 'free'), dmg: a.damage || '', text: a.text || '' })),
      abil: (c.abilities || []).map(a => [a.name, a.text]),
    });
    if (st === 'stage2' && opts && opts.base) out.base = opts.base(c.evolvesFrom);
  } else if (cat === 'trainer') {
    out.kind = sub.includes('supporter') ? 'supporter' : sub.includes('stadium') ? 'stadium' : sub.some(x => /tool/.test(x)) ? 'tool' : 'item';
    out.rtext = rules.filter(r => !BOILER.test(r.replace(/[\u2018\u2019]/g, "'"))).join(' ').replace(/\s+/g, ' ').trim();
    out.ace = sub.includes('ace spec');
  } else {
    out.rtext = sub.includes('special') ? rules.join(' ') : '';
  }
  return out;
}

/* ---------------- Puzzles ---------------- */
/**
 * Build a state from a puzzle record (see ARCHITECTURE "Puzzle format").
 * Cards are listed once in `cards` and named by key everywhere else.
 */
function fromPuzzle(pz) {
  const s = { turn: pz.turn || 3, cur: 0, first: !!pz.first, stadium: null, mods: {}, pending: null, luck: false, unread: [], ended: false,
    taken: [0, 0], koIds: [], log: [], uid: 0, mid: 0, goal: pz.goal || { t: 'prizes' } };
  const card = k => { const c = pz.cards[k]; if (!c) throw new Error('Puzzle names a card not in its card table: ' + k); if (!c.key) c.key = k; return c; };
  const ref = k => ({ uid: ++s.uid, card: k === '?' ? HIDDEN : card(k) });
  const hidden = n => Array.from({ length: n || 0 }, () => ({ uid: ++s.uid, card: HIDDEN }));
  const mon = (d, owner) => {
    const m = { id: ++s.mid, stack: (d.under || []).concat(d.c).map(ref), energy: (d.energy || []).map(ref), tool: d.tool ? ref(d.tool) : null,
      dmg: d.dmg || 0, turnIn: d.turnIn != null ? d.turnIn : 0, evoTurn: d.evolvedThisTurn ? s.turn : -1, ab: {}, owner, cantAttack: !!d.cantAttack };
    return m;
  };
  const side = (d, owner) => ({
    active: d.active ? mon(d.active, owner) : null, bench: (d.bench || []).map(b => mon(b, owner)),
    hand: Array.isArray(d.hand) ? d.hand.map(ref) : hidden(d.hand), deck: Array.isArray(d.deck) ? d.deck.map(ref) : hidden(d.deck),
    discard: (d.discard || []).map(ref), prizes: Array.isArray(d.prizes) ? d.prizes.map(ref) : hidden(d.prizes),
    used: { energy: false, supporter: false, stadium: false, retreat: false }, lim: {}, koLastTurn: !!d.koLastTurn,
  });
  s.players = [side(pz.me, 0), side(pz.opp, 1)];
  if (pz.stadium) s.stadium = { ref: ref(pz.stadium.c), owner: pz.stadium.owner === 'opp' ? 1 : 0 };
  s.start = { oppActive: s.players[1].active && s.players[1].active.id };
  return s;
}
/** Has the puzzle's goal been met? */
function goalMet(s) {
  const g = s.goal || { t: 'prizes' };
  if (s.luck || s.unread.length) return false;
  if (g.t === 'prizes') return winner(s) === 0;
  if (g.t === 'koActive') return s.koIds.includes(s.start.oppActive);
  if (g.t === 'take') return s.taken[0] >= g.n;
  return false;
}
/**
 * Cards that could matter this turn but do not fully read. A board with any of these is not published.
 * Your side: everything you could play or use. The opponent's side: only what acts during your turn
 * (Abilities, Tools, Weakness, Resistance), since they don't attack this turn.
 */
function readCheck(s) {
  const P = me(s), O = foe(s), bad = new Set();
  const check = (ref, mine) => cardProblems(s, ref, mine).forEach(x => bad.add(x));
  // Only the top card of a Pokémon in play acts; the cards under it don't.
  const inPlay = (side, mine) => mons(side).forEach(m => { [topOf(m)].concat(m.energy, m.tool ? [m.tool] : []).forEach(r => check(r, mine)); });
  inPlay(P, true); inPlay(O, false);
  P.hand.concat(P.deck, P.discard).forEach(r => check(r, true));
  if (s.stadium) check(s.stadium.ref, true);
  return [...bad];
}
/** What about one card the engine can't read (empty when it reads fully). mine: it is on your side. */
function cardProblems(s, ref, mine) {
  const c = ref.card, bad = [];
  if (c.cat === 'hidden') return bad;
  if (c.cat === 'trainer') {
    if (c.kind === 'tool' || (c.kind === 'stadium' && !readTrainer(ref).once)) { if (!passiveKnown(c.rtext)) bad.push(c.name); }
    else if (mine && !/^rare candy$/i.test(c.name)) { const TP = readTrainer(ref); if (!TP.steps || (TP.need && needWhy(s, TP.need) === '?')) bad.push(c.name); }
  } else if (c.cat === 'energy') { if (!provides(ref)) bad.push(c.name); }
  else if (c.cat === 'pokemon') {
    readAbilities(ref).forEach(A => { if (A.when === 'passive' ? !passiveKnown(A.text) : mine && !A.steps) bad.push(c.name + ': ' + A.name); });
    if (mine) (c.attacks || []).forEach(a => { if (!readAttack(a)) bad.push(c.name + ': ' + a.name); });
    if (mine && c.retreat == null) bad.push(c.name + ': Retreat Cost');
    if (!mine && c.weak && c.weak.x == null && c.weak.plus == null) bad.push(c.name + ': Weakness amount');
    if (!mine && c.resUnknown) bad.push(c.name + ': Resistance');
  }
  return bad;
}
/** A short, order-free fingerprint of a state, so the solver can skip positions it has seen. */
function key(s) {
  const k = r => r.card.key;
  const ms = q => k(topOf(q)) + '/' + q.stack.length + '/' + q.energy.map(k).sort().join('+') + '/' + (q.tool ? k(q.tool) : '') + '/' + q.dmg + '/' +
    (canEvolve(s, q) ? 'e' : '') + (q.trig && (q.benchTurn === s.turn || q.evoTurnHand === s.turn) ? 't' : '') + '/' + Object.keys(q.ab).filter(n => q.ab[n] === s.turn).sort().join(',');
  const side = p => [p.active ? ms(p.active) : '-', p.bench.map(ms).sort().join(';'), p.hand.map(k).sort().join(','), p.deck.length, p.discard.map(k).sort().join(','),
    p.prizes.length, JSON.stringify(p.used), JSON.stringify(p.lim)].join('|');
  const pend = s.pending ? JSON.stringify([s.pending.i, s.pending.ask, s.pending.steps && s.pending.steps.map(x => x.t), s.pending.ctx.left, s.pending.ctx.target, s.pending.ctx.attached, s.pending.ctx.done, s.pending.ctx.mon, s.pending.ctx.name, s.pending.ctx.switched, s.pending.ctx.splitRef && s.pending.ctx.splitRef.card.key]) : '';
  return [side(s.players[0]), side(s.players[1]), s.stadium ? k(s.stadium.ref) + s.stadium.owner : '', JSON.stringify(s.mods), s.taken.join(','), s.koIds.length, pend,
    s.promote ? s.promote.join(',') : '', s.ended ? 'E' : ''].join('#');
}

const api = { needWhy, targetWhy, abilWhy, cardProblems, HIDDEN, cardFromApi, legalActions, apply, fromPuzzle, goalMet, readCheck, key, winner, readAttack, readTrainer, readAbilities, retreatCost, costMet, damageTo, maxHp, prizeValue, mons, topOf, T };
root.RdyPuzzle = Object.assign(root.RdyPuzzle || {}, api);
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
