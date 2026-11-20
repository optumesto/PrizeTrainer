// Sparring test report fixes (Nov 19, 3.4.6 report): one small board per finding, checked by its outcome.
// node opponent/test/report.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../game.js'); require('../effects.js');
const AI = require('../ai.js');
const E = G.E, I = E.internals;
const C = await import('./cards.mjs');
let pass = 0, fail = 0;
const ok = (cond, what) => { if (cond) pass++; else { fail++; console.log('FAIL ' + what); } };
E.internals.setReal(true);

const filler = Array.from({ length: 60 }, () => C.card('Psychic Energy'));
/** A board: each side { active: [name, energy names, dmg], bench: [...], hand: [names], deck: [names], discard: [names] }. */
function board(sides, opts = {}) {
  let s = G.newGame([filler.slice(0, 50).concat(Array(10).fill(C.card('Shuppet'))), filler.slice(0, 50).concat(Array(10).fill(C.card('Shuppet')))], { seed: 3, first: 0 });
  s.phase = 'play'; s.cur = opts.cur || 0; s.turns = [opts.turn || 3, opts.turn || 3]; s.turn = opts.turn || 3; s.first = true; s.mods = {};
  const ref = n => ({ uid: ++s.uid, card: C.card(n) || (() => { throw new Error('No card ' + n); })() });
  const mon = (k, x) => { const [n, en, dmg] = Array.isArray(x) ? x : [x]; const m = I.newMon(s, ref(n), k); m.turnIn = 0; (en || []).forEach(e => m.energy.push(ref(e))); m.dmg = dmg || 0; return m; };
  sides.forEach((d, k) => { const P = s.players[k]; P.hand = []; P.deck = (d.deck || []).map(ref).concat(Array.from({ length: 10 }, () => ref('Psychic Energy'))); P.discard = (d.discard || []).map(ref); P.prizes = Array.from({ length: d.prizes || 6 }, () => ref('Psychic Energy'));
    P.active = d.active ? mon(k, d.active) : null; P.bench = (d.bench || []).map(x => mon(k, x)); (d.hand || []).forEach(n => P.hand.push(ref(n))); });
  if (opts.stadium) s.stadium = { ref: ref(opts.stadium), owner: 0 };
  return s;
}
const acts = s => G.next(s).actions;
const why = s => E.legalActions(s, { why: true });
function play(s, a, pick) { s = G.step(s, a); let n = 0; while ((s.pending || (s.promote && s.promote.length)) && n++ < 30) { const X = acts(s); if (!X.length) break; s = G.step(s, pick ? pick(X, s) || X[0] : X[0]); } return s; }
const handName = (s, uid) => { const r = s.players[s.cur].hand.find(y => y.uid === uid); return r && r.card.name; };
const handPlay = (s, name, t) => acts(s).find(a => (!t || a.t === t) && a.uid != null && handName(s, a.uid) === name);
const monOf = (s, k, name) => E.mons(s.players[k]).find(m => E.topOf(m).card.name === name);
const attackNamed = (s, name) => acts(s).find(a => a.t === 'attack' && E.topOf(s.players[s.cur].active).card.attacks[a.i] && E.topOf(s.players[s.cur].active).card.attacks[a.i].name === name);
const count = s => s.players.map((P, k) => (s.stadium && s.stadium.owner === k ? 1 : 0) + P.hand.length + P.deck.length + P.discard.length + P.prizes.length + E.mons(P).reduce((n, m) => n + m.stack.length + m.energy.length + (m.tool ? 1 : 0), 0)) ;
export { board, acts, why, play, handPlay, monOf, attackNamed, count, ok };

// H4a: a benched Dunsparce that evolves into Dudunsparce stays on the Bench with its Energy.
{ let s = board([{ active: ['Dreepy'], bench: [['Dunsparce', ['Darkness Energy']], 'Drakloak'], hand: ['Dudunsparce'] }, { active: 'Shuppet' }]);
  const n0 = count(s); s = play(s, handPlay(s, 'Dudunsparce', 'evolve'));
  const d = monOf(s, 0, 'Dudunsparce'); ok(d && d.energy.length === 1 && s.players[0].bench.length === 2, 'H4a Dudunsparce stays on the Bench with its Energy');
  ok(count(s)[0] === n0[0], 'H4a no card lost'); }
// H4b: playing Risky Ruins keeps Unfair Stamp in the hand.
{ let s = board([{ active: ['Dreepy'], hand: ['Risky Ruins', 'Unfair Stamp', 'Ultra Ball'] }, { active: 'Shuppet' }]);
  const n0 = count(s); s = play(s, handPlay(s, 'Risky Ruins', 'stadium'));
  ok(s.players[0].hand.some(y => y.card.name === 'Unfair Stamp') && s.players[0].hand.length === 2, 'H4b Unfair Stamp stays in the hand');
  ok(count(s)[0] === n0[0], 'H4b no card lost'); }
// H6: Phantom Dive does 200 to the Active and puts 6 damage counters on the Bench.
{ let s = board([{ active: ['Dragapult ex', ['Fire Energy', 'Psychic Energy']] }, { active: ['Mega Kangaskhan ex', [], 270], bench: ['Talonflame ex'] }]);
  s = play(s, attackNamed(s, 'Phantom Dive'));
  const k = s.players[1]; ok(!monOf(s, 1, 'Mega Kangaskhan ex') || monOf(s, 1, 'Mega Kangaskhan ex').dmg >= 300, 'H6 Phantom Dive Knocks Out the Active');
  ok(E.mons(k).reduce((n, m) => n + (E.topOf(m).card.name === 'Talonflame ex' ? m.dmg : 0), 0) === 60, 'H6 6 counters on the Bench'); }
// H8: a Pokemon benched this turn can't evolve, even with another of the same name in play from an earlier turn.
{ let s = board([{ active: ['Shuppet'], hand: ['Chikorita', 'Bayleef'] }, { active: 'Shuppet' }]);
  s = play(s, handPlay(s, 'Chikorita', 'bench'));
  ok(!acts(s).some(a => a.t === 'evolve'), 'H8 no evolve on a Pokemon benched this turn'); }
// H5: Rare Candy only on a Basic that has not evolved and was not put in play this turn.
{ let s = board([{ active: ['Abra'], hand: ['Kadabra', 'Rare Candy', 'Alakazam'] }, { active: 'Shuppet' }]);
  s = play(s, handPlay(s, 'Kadabra', 'evolve'));
  ok(!acts(s).some(a => a.t === 'candy'), 'H5 no Rare Candy on a Kadabra that evolved this turn'); }
// H7: retreat costs.
{ const s = board([{ active: ['Slowpoke'], bench: ['Shuppet'] }, { active: 'Shuppet' }]);
  ok(!acts(s).some(a => a.t === 'retreat'), 'H7 Slowpoke with no Energy cannot retreat'); }
{ const s = board([{ active: ['Slowpoke'], bench: ['Latias ex'] }, { active: 'Shuppet' }]);
  ok(acts(s).some(a => a.t === 'retreat' && !a.pay.length), 'H7 Latias ex Skyliner: a Basic has no Retreat Cost'); }

// Effects that would do nothing are not offered (M1, M3, M4, M5, L1), and do their job when they can.
const offered = (s, name, t) => !!handPlay(s, name, t);
const abilOf = (s, name) => acts(s).find(a => a.t === 'ability' && E.topOf(I.findMon(s, a.mon).m).card.name === name);
{ const s = board([{ active: ['Slowpoke'], bench: ['Munkidori'], hand: ['Wondrous Patch'] }, { active: 'Shuppet' }]);
  ok(!offered(s, 'Wondrous Patch'), 'M1 Wondrous Patch not offered with no Psychic Energy in the discard pile');
  ok(why(s).some(w => w.why === 'No Basic Psychic Energy in your discard pile.'), 'M1 says why'); }
{ let s = board([{ active: ['Slowpoke'], bench: ['Latias ex'], hand: ['Wondrous Patch'], discard: ['Psychic Energy'] }, { active: 'Shuppet' }]);
  s = play(s, handPlay(s, 'Wondrous Patch')); ok(monOf(s, 0, 'Latias ex').energy.length === 1, 'M1 Wondrous Patch attaches when it can'); }
{ const s = board([{ active: ['Dragapult ex'], hand: ["Rosa's Encouragement"] }, { active: 'Shuppet' }]); s.players[1].prizes.pop();
  ok(!offered(s, "Rosa's Encouragement"), 'M3 Rosa not offered with no Energy in the discard pile'); }
{ let s = board([{ active: ['Dragapult ex'], hand: ["Rosa's Encouragement"], discard: ['Fire Energy', 'Psychic Energy'] }, { active: 'Shuppet' }]); s.players[1].prizes.pop();
  s = play(s, handPlay(s, "Rosa's Encouragement")); ok(s.players[0].active.energy.length === 2, 'M3 Rosa attaches 2 Energy to a Stage 2'); }
{ const s = board([{ active: ['Teal Mask Ogerpon ex'], hand: ['Ultra Ball'] }, { active: 'Shuppet' }]);
  ok(!abilOf(s, 'Teal Mask Ogerpon ex'), 'M4 Teal Dance not offered with no Grass Energy in hand'); }
{ let s = board([{ active: ['Teal Mask Ogerpon ex'], hand: ['Grass Energy'] }, { active: 'Shuppet' }]); const d0 = s.players[0].deck.length;
  s = play(s, abilOf(s, 'Teal Mask Ogerpon ex')); ok(s.players[0].active.energy.length === 1 && s.players[0].deck.length === d0 - 1 && s.players[0].hand.length === 1, 'M4 Teal Dance attaches and draws 1'); }
{ const s = board([{ active: ["Ethan's Ho-Oh ex"], bench: ['Munkidori'], hand: ['Fire Energy'] }, { active: 'Shuppet' }]);
  ok(!abilOf(s, "Ethan's Ho-Oh ex"), "M5 Golden Flame not offered with no Benched Ethan's Pokemon"); }
{ let s = board([{ active: ["Ethan's Ho-Oh ex"], bench: ["Ethan's Typhlosion"], hand: ['Fire Energy', 'Fire Energy'] }, { active: 'Shuppet' }]);
  s = play(s, abilOf(s, "Ethan's Ho-Oh ex")); ok(monOf(s, 0, "Ethan's Typhlosion").energy.length === 2, 'M5 Golden Flame attaches 2 Fire Energy'); }
{ const s = board([{ active: ['Slowpoke'], hand: ['Night Stretcher'] }, { active: 'Shuppet' }]);
  ok(!offered(s, 'Night Stretcher'), 'L1 Night Stretcher not offered with an empty discard pile'); }
// M11: Excited Dive is for a Talonflame ex in the hand, never one already in play.
{ let s = board([{ active: ['Mega Kangaskhan ex'], hand: ['Talonflame ex'] }, { active: 'Shuppet' }]);
  s = play(s, acts(s).find(a => a.t === 'handAbility'));
  ok(monOf(s, 0, 'Talonflame ex') && !abilOf(s, 'Talonflame ex') && !acts(s).some(a => a.t === 'handAbility'), 'M11 Excited Dive gone once used');
  ok(s.log.includes('Put Talonflame ex on your Bench'), 'M11 the log says where it went'); }
// M2: Rapid Vernier says whether it switched.
{ let s = board([{ active: ['Mega Kangaskhan ex'], hand: ['Iron Leaves ex'] }, { active: 'Shuppet' }]);
  s = play(s, handPlay(s, 'Iron Leaves ex', 'bench')); const a = abilOf(s, 'Iron Leaves ex');
  const y = play(s, a, X => X.find(x => x.v === true)), n = play(s, a, X => X.find(x => x.v === false));
  ok(y.players[0].active && E.topOf(y.players[0].active).card.name === 'Iron Leaves ex' && y.log.includes('Iron Leaves ex is now Active'), 'M2 Rapid Vernier switches and says so');
  ok(n.log.includes('Chose not to switch'), 'M2 Rapid Vernier says when it did not switch'); }
// M8 / L7: the log names damage with its reasons, cards drawn, and where searched cards went.
{ let s = board([{ active: ['Munkidori', ['Psychic Energy', 'Psychic Energy']] }, { active: ["N's Zorua"] }]);
  s = play(s, attackNamed(s, 'Mind Bend')); ok(s.log.some(l => /^60 damage to N's Zorua$/.test(l)), 'M8 Mind Bend logs 60 damage: ' + s.log.slice(-4).join(' / ')); }
{ let s = board([{ active: ["Lillie's Clefairy ex", ['Psychic Energy', 'Psychic Energy']], bench: ['Shuppet', 'Shuppet'] }, { active: ["Cynthia's Gible"], bench: ['Shuppet', 'Shuppet', 'Shuppet'] }]);
  const a = acts(s).find(x => x.t === 'attack' && E.topOf(s.players[0].active).card.attacks[x.i].name === 'Full Moon Rondo');
  if (a) { s = play(s, a); ok(s.log.some(l => /^\d+ damage to Cynthia's Gible \(base 20, plus 100 from the attack's text/.test(l)), 'L7 Full Moon Rondo gives its breakdown: ' + s.log.slice(-4).join(' / ')); }
  else ok(false, 'L7 Full Moon Rondo offered'); }
{ let s = board([{ active: ['Mega Kangaskhan ex'] }, { active: 'Shuppet' }]);
  s = play(s, abilOf(s, 'Mega Kangaskhan ex')); ok(s.log.includes('You drew 2 Psychic Energy'), 'M8 Run Errand names the cards drawn'); }
{ let s = board([{ active: ['Shuppet'], hand: ['Ultra Ball', 'Psychic Energy', 'Psychic Energy'], deck: ['Dreepy'] }, { active: 'Shuppet' }]);
  s = play(s, handPlay(s, 'Ultra Ball'), X => X.find(x => Array.isArray(x.v) && x.v.length) || X[0]);
  ok(s.log.some(l => / into your hand$/.test(l) && /^Searched for /.test(l)) || s.log.includes('Searched and took nothing'), 'M8 a search says where the cards went: ' + s.log.slice(-3).join(' / ')); }
// M8: the opponent's lines read from your side.
{ let s = board([{ active: ['Mega Kangaskhan ex'] }, { active: 'Shuppet' }], { cur: 1 });
  s.players[1].active = null; s.players[1].active = I.newMon(s, { uid: ++s.uid, card: C.card('Mega Kangaskhan ex') }, 1); s.players[1].active.turnIn = 0;
  s = play(s, abilOf(s, 'Mega Kangaskhan ex')); ok(s.log.includes('Your opponent drew 2 cards') && !s.log.some(l => /Psychic Energy/.test(l)), 'M8 the opponent draw shows a count only: ' + s.log.slice(-2).join(' / ')); }
// H1 / H2: five turns each, and a verdict on Prize cards.
{ let s = G.newGame([C.lists()[0].cards, C.lists()[1].cards], { seed: 9, maxTurns: 5 });
  for (const k of [0, 1]) { const B = G.setupChoices(s, k); s = G.setUp(s, k, B[0].uid, []); }
  let n = 0; while (!s.timeUp && G.winner(s) < 0 && n++ < 2000) { const X = G.next(s); if (!X.actions.length) break; s = G.step(s, X.actions.find(a => a.t === 'end') || X.actions[0]); }
  ok(s.timeUp && s.turns[0] === 5 && s.turns[1] === 5, 'H1 the game stops after 5 turns each: ' + s.turns);
  const R = G.result(s); ok(R && R.by === 'prizes' && R.winner === -1, 'H2 no Prize cards taken is a draw'); }

// 3.4.18 log: with two Pokémon of one name on a side, the log says which one, by its spot.
{ let s = board([{ active: ['Dreepy'], bench: ['Dreepy', 'Drakloak'], hand: ['Psychic Energy'] }, { active: ['Shuppet', [], 0], bench: ['Shuppet'] }]);
  const twin = s.players[0].bench[0], e = acts(s).find(a => a.t === 'energy' && a.mon === twin.id);
  s = play(s, e); ok(s.log.includes('Attached Psychic Energy to Dreepy (Bench 1)'), '3.4.18 Energy to a twin names its spot: ' + s.log.slice(-1));
  ok(I.logName(s, s.players[0].active) === 'Dreepy (Active)' && I.logName(s, monOf(s, 0, 'Drakloak')) === 'Drakloak', '3.4.18 Active twin is tagged, a single name is not');
  ok(I.hitLine(30, s.players[1].active, false, s) === '30 damage to Shuppet (Active)' && I.hitLine(10, s.players[1].bench[0], true, s) === '10 damage to Shuppet (Bench 1)', '3.4.18 damage lines name the spot');
  s.players[1].bench[0].dmg = 999; I.checkKOs(s); ok(s.log.some(l => /^Shuppet \(Bench 1\) is Knocked Out/.test(l)), '3.4.18 the Knock Out line names the spot: ' + s.log.slice(-2).join(' / ')); }

if (!process.env.NOEXIT) console.log(`report: ${pass} passed, ${fail} failed`);
if (!process.env.NOEXIT) process.exit(fail ? 1 : 0);
