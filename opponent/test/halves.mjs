// Two-half cards (Delta Reign's Legendary Stadiums): played only with both halves in hand, as one Stadium,
// and discarded together. Printed on each half: "You cannot play this card by itself. You must combine
// 2 different Legendary Pyroduct from your hand to play as 1 Stadium card."
// node opponent/test/halves.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.window = globalThis;
require('../../puzzle/text.js');
const E = require('../../puzzle/engine.js'); globalThis.RdyPuzzle = E;
const G = require('../game.js');
require('../effects.js');
require('../decks.js');
const Own = require('../own.js');
const D = globalThis.RdyOppDecks, I = E.internals;
let pass = 0, fail = 0;
const ok = (c, w) => { if (c) pass++; else { fail++; console.log('FAIL ' + w); } };
const names = ['Legendary Pyroduct', 'Legendary Summit', 'Legendary Trench'];
const stadAct = (s, nm, why) => E.legalActions(s, { why }).filter(a => a.t === 'stadium' && s.players[s.cur].hand.find(y => y.uid === a.uid).card.name === nm);

// Every tournament deck with a Legendary Stadium deals its copies as equal halves, and their pictures differ.
const deck = D.decks.find(d => d.list.some(([k]) => k === 'Legendary Pyroduct'));
ok(deck, 'a tournament deck runs Legendary Pyroduct');
const cards = []; deck.list.forEach(([k, n]) => { for (let i = 0; i < n; i++) cards.push(D.cards[k]); });
const split = I.splitHalves(cards).filter(c => c.name === 'Legendary Pyroduct');
ok(split.filter(c => c.half === 'L').length === 2 && split.filter(c => c.half === 'R').length === 2, 'four copies deal as 2 left and 2 right halves');
ok(split.find(c => c.half === 'R').num === '95' && /me6-95\//.test(split.find(c => c.half === 'R').img), 'the right half is DLR 95, with its own picture');
ok(split.find(c => c.half === 'L').num === '94' && /me6-94\//.test(split.find(c => c.half === 'L').img), 'the left half is DLR 94');

// A game state with a chosen hand.
function game(hand) {
  let s = G.newGame([cards, cards], { seed: 7, first: 0 });
  const P = s.players[0], halves = s.players.map(Q => Q.deck.concat(Q.hand, Q.prizes));
  const all = P.deck.concat(P.hand); P.hand = []; P.deck = all;
  hand.forEach(h => { const i = P.deck.findIndex(x => x.card.name === h[0] && (!h[1] || I.halfOf(x) === h[1])); P.hand.push(P.deck.splice(i, 1)[0]); });
  const b = P.deck.findIndex(x => x.card.cat === 'pokemon' && x.card.stage === 'basic'); P.hand.push(P.deck.splice(b, 1)[0]);
  const Q = s.players[1], qb = Q.hand.find(x => x.card.cat === 'pokemon' && x.card.stage === 'basic') || Q.deck.find(x => x.card.cat === 'pokemon' && x.card.stage === 'basic');
  if (!Q.hand.includes(qb)) { Q.deck.splice(Q.deck.indexOf(qb), 1); Q.hand.push(qb); }
  s = G.setUp(s, 1, qb.uid, []);
  s = G.setUp(s, 0, P.hand[P.hand.length - 1].uid, []);
  return s;
}
// One half alone: not offered, with the reason.
let s = game([['Legendary Pyroduct', 'L']]);
ok(stadAct(s, 'Legendary Pyroduct').length === 0, 'one half alone is not playable');
const off = stadAct(s, 'Legendary Pyroduct', true);
ok(off.length === 1 && off[0].why === 'Needs both halves in hand.', 'one half alone says it needs both halves');
s = game([['Legendary Pyroduct', 'R'], ['Legendary Pyroduct', 'R']]);
ok(stadAct(s, 'Legendary Pyroduct').length === 0, 'two right halves are not playable');
s = game([['Legendary Pyroduct', 'L'], ['Legendary Pyroduct', 'L']]);
ok(stadAct(s, 'Legendary Pyroduct').length === 0, 'two left halves are not playable');
// Both halves: one action, and both go into play as one Stadium.
s = game([['Legendary Pyroduct', 'L'], ['Legendary Pyroduct', 'R']]);
const acts = stadAct(s, 'Legendary Pyroduct');
ok(acts.length === 1, 'both halves give one Play action');
const n0 = s.players[0].hand.length;
s = E.apply(s, acts[0]);
ok(s.stadium && s.stadium.pair && I.halfOf(s.stadium.ref) === 'L' && I.halfOf(s.stadium.pair) === 'R', 'both halves are in play as one Stadium');
ok(s.players[0].hand.length === n0 - 2, 'both halves left the hand');
ok(!s.players[0].hand.some(x => x.card.name === 'Legendary Pyroduct'), 'no half left in hand');
ok(s.log.some(l => /Played Legendary Pyroduct/.test(l.s || l)), 'the log says Played Legendary Pyroduct');
// Discarded together.
const d0 = s.players[0].discard.length; I.discardStadium(s);
ok(!s.stadium && s.players[0].discard.length === d0 + 2, 'both halves go to the discard pile together');
// The other two Legendary Stadiums, from their real records (same rule).
for (const nm of names.slice(1)) {
  const left = I.HALVES[nm.toLowerCase()];
  ok(left === (nm === 'Legendary Summit' ? 96 : 98), nm + ' halves are DLR ' + left + ' and ' + (left + 1));
  const rec = { key: nm, name: nm, cat: 'trainer', sub: ['stadium'], kind: 'stadium', rtext: '', num: String(left) };
  const two = I.splitHalves([rec, rec]);
  ok(two[0].half === 'L' && two[1].half === 'R' && two[1].num === String(left + 1), nm + ' deals as a left and a right half');
}
// A puzzle board names halves by print (me6-94, me6-95).
ok(I.halfOf({ card: { name: 'Legendary Pyroduct', key: 'me6-95' } }) === 'R' && I.halfOf({ card: { name: 'Legendary Pyroduct', key: 'me6-94' } }) === 'L', 'puzzle prints read as halves');
// A saved deck keeps its own halves by number: 2 of DLR 94 and 1 of DLR 95.
const saved = { id: 'h', name: 'Halves', cards: deck.list.map(([k, n]) => ({ name: k, count: n, set: (D.cards[k] || {}).set, num: (D.cards[k] || {}).num, cat: D.cards[k].cat })) };
const py = saved.cards.findIndex(c => c.name === 'Legendary Pyroduct');
saved.cards.splice(py, 1, { name: 'Legendary Pyroduct', count: 3, set: 'DLR', num: '94' }, { name: 'Legendary Pyroduct', count: 1, set: 'DLR', num: '95' });
const built = Own.build(saved, D.cards);
const bp = (built.cards || []).filter(c => c.name === 'Legendary Pyroduct');
ok(bp.filter(c => c.half === 'L').length === 3 && bp.filter(c => c.half === 'R').length === 1, 'a saved deck keeps 3 left halves and 1 right half (' + built.block + ')');
// Transformation Tome (Crimson Rift 83): "You must play 2 Transformation Tome cards at once. (This effect works
// one time for 2 cards.)" Any 2 copies, played together, for one effect.
{
  const TT = require('../../tests/card-text.json').cards['Transformation Tome'];
  const tome = E.cardFromApi({ name: 'Transformation Tome', supertype: 'Trainer', subtypes: ['Item'], rules: TT.rules });
  ok(/^you must play 2 transformation tome cards at once/i.test(tome.rtext), 'the card text says 2 at once');
  const tc = cards.slice(); for (let i = 0; i < 4; i++) tc[tc.length - 1 - i] = tome;
  const tGame = n => {
    let t = G.newGame([tc, tc], { seed: 5, first: 0 });
    const P = t.players[0], all = P.deck.concat(P.hand); P.hand = []; P.deck = all;
    for (let i = 0; i < n; i++) { const k = P.deck.findIndex(x => x.card.name === 'Transformation Tome'); P.hand.push(P.deck.splice(k, 1)[0]); }
    const b = P.deck.findIndex(x => x.card.cat === 'pokemon' && x.card.stage === 'basic'); P.hand.push(P.deck.splice(b, 1)[0]);
    const Q = t.players[1], qb = Q.hand.concat(Q.deck).find(x => x.card.cat === 'pokemon' && x.card.stage === 'basic');
    if (!Q.hand.includes(qb)) { Q.deck.splice(Q.deck.indexOf(qb), 1); Q.hand.push(qb); }
    t = G.setUp(t, 1, qb.uid, []); return G.setUp(t, 0, P.hand[P.hand.length - 1].uid, []);
  };
  const tAct = (t, why) => E.legalActions(t, { why }).filter(a => a.t === 'trainer' && t.players[0].hand.find(y => y.uid === a.uid).card.name === 'Transformation Tome');
  let t = tGame(1);
  ok(tAct(t, false).length === 0, 'one Transformation Tome cannot be played');
  ok(tAct(t, true).some(a => a.why === 'Needs 2 copies in hand.'), 'one Tome shows Needs 2 copies in hand.');
  let threw = ''; try { E.apply(t, { t: 'trainer', uid: t.players[0].hand.find(x => x.card.name === 'Transformation Tome').uid }); } catch (e) { threw = e.message; }
  ok(threw === 'Needs 2 copies in hand.', 'playing one Tome anyway is refused');
  ok(t.players[0].hand.filter(x => x.card.name === 'Transformation Tome').length === 1, 'the refused Tome stays in hand');
  t = tGame(2);
  ok(tAct(t, false).length >= 1, 'two Transformation Tome can be played');
  const h0 = t.players[0].hand.length, d0t = t.players[0].discard.length;
  const r = E.apply(t, tAct(t, false)[0]); t = r.state || r;
  ok(t.players[0].hand.length === h0 - 2 && !t.players[0].hand.some(x => x.card.name === 'Transformation Tome'), 'both Tomes leave the hand');
  ok(t.players[0].discard.filter(x => x.card.name === 'Transformation Tome').length >= 1 && t.players[0].discard.length >= d0t + 1, 'the second Tome goes to the discard pile');
  ok(t.log.some(l => /Played 2 Transformation Tome/.test(l.s || l)), 'the log says Played 2 Transformation Tome');
  t = tGame(3);
  const a3 = tAct(t, false); const r3 = E.apply(t, a3[0]); const t3 = r3.state || r3;
  ok(t3.players[0].hand.filter(x => x.card.name === 'Transformation Tome').length === 1, 'with 3 in hand, a play uses 2 and leaves 1');
}
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
