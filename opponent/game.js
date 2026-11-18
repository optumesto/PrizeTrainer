// RdyDeck full games: two players, a whole game, on the puzzle rules engine (puzzle/engine.js).
//
// The engine plays one turn of one player. This file deals the game (shuffle, opening hands,
// mulligans, Prize cards, who goes first), passes the turn (draw, turn limits, "Knocked Out last
// turn"), and says who has to act next. It never decides anything: a controller (a person on the
// screen, or opponent/ai.js) picks every action from the list it is given.
//
// Hidden for now: nothing in the app loads this file (see opponent/README.md).
// Plain script: in a page it sets window.RdyGame; in Node, require() returns the same object.
(function (root) {
'use strict';
const E = root.RdyPuzzle && root.RdyPuzzle.internals ? root.RdyPuzzle : require('../puzzle/engine.js');
const I = E.internals;

/** A seeded random source, so a game can be played again exactly. */
function rngFrom(seed) {
  let a = seed >>> 0;
  return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
const isBasic = r => r.card.cat === 'pokemon' && r.card.stage === 'basic';

/**
 * A new game. decks: [cards0, cards1], each 60 engine cards (puzzle/engine.js cardFromApi records).
 * Player 0 is the person, player 1 the opponent, by convention only.
 * Returns a state in the 'setup' phase: each player places an Active and a Bench (setupActions).
 */
function newGame(decks, opts) {
  opts = opts || {};
  const seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 2 ** 31);
  const s = { real: true, seed, turn: 0, cur: 0, first: false, stadium: null, mods: {}, pending: null, luck: false, unread: [], ended: false,
    taken: [0, 0], koIds: [], log: [], uid: 0, mid: 0, kos: [0, 0], turns: [0, 0], phase: 'setup', mulls: [0, 0], ready: [false, false], goal: { t: 'game' } };
  // Every state of one game shares the random source (a function, so it is never saved with a game).
  s.rng = opts.rng || rngFrom(seed);
  s.players = decks.map((cards, k) => {
    const deck = shuffle(cards.map(c => ({ uid: ++s.uid, card: c })), s.rng);
    return { active: null, bench: [], hand: [], deck, discard: [], prizes: [], used: { energy: false, supporter: false, stadium: false, retreat: false }, lim: {}, koLastTurn: false };
  });
  // Opening hands: 7 cards, again until there is a Basic Pokemon. Each mulligan lets the other player draw 1 more.
  s.players.forEach((P, k) => {
    if (!P.deck.some(isBasic)) throw new Error('Deck ' + k + ' has no Basic Pokemon.');
    for (;;) { P.hand = P.deck.splice(0, 7); if (P.hand.some(isBasic)) break; P.deck = shuffle(P.deck.concat(P.hand), s.rng); s.mulls[k]++; }
  });
  s.firstPlayer = opts.first != null ? opts.first : (s.rng() < 0.5 ? 0 : 1);
  s.extraDraw = [Math.max(0, s.mulls[1] - s.mulls[0]), Math.max(0, s.mulls[0] - s.mulls[1])];
  I.log(s, (s.firstPlayer === 0 ? 'You go' : 'Your opponent goes') + ' first');
  return s;
}

/** Ways to set up: the Active is one Basic, the Bench any of the rest (the controller picks; listed per Active). */
function setupChoices(s, k) { return s.players[k].hand.filter(isBasic); }
/** Set up one player's side: active = a hand uid, bench = hand uids (Basics, up to 5). */
function setUp(s0, k, active, bench) {
  const s = I.clone(s0), P = s.players[k];
  const a = I.take(P.hand, active); if (!a || !isBasic(a)) throw new Error('The Active has to be a Basic Pokemon from the hand.');
  P.active = Object.assign(I.newMon(s, a, k), { turnIn: 0 });
  (bench || []).slice(0, 5).forEach(uid => { const x = I.take(P.hand, uid); if (x && isBasic(x)) P.bench.push(Object.assign(I.newMon(s, x, k), { turnIn: 0 })); });
  s.ready = s.ready.slice(); s.ready[k] = true;
  if (s.ready[0] && s.ready[1]) {
    s.players.forEach((Q, j) => { Q.prizes = Q.deck.splice(0, 6); const n = Math.min(s.extraDraw[j], Q.deck.length); if (n) { Q.hand.push.apply(Q.hand, Q.deck.splice(0, n)); I.log(s, (j ? 'Your opponent' : 'You') + ' drew ' + n + ' for mulligans'); } });
    s.phase = 'play';
    s.cur = s.firstPlayer;
    startTurn(s);
  }
  return s;
}

/** Start the current player's turn (in place): draw, reset the turn's limits. */
function startTurn(s) {
  const k = s.cur, P = s.players[k];
  s.turns = s.turns.slice(); s.turns[k]++; s.turn = s.turns[k]; s.first = k === s.firstPlayer; s.ended = false; s.pending = null; s.mods = {};
  P.used = { energy: false, supporter: false, stadium: false, retreat: false };
  P.koLastTurn = s.kosBy ? s.kosBy[k] > 0 : false; // your Pokemon Knocked Out during your opponent's last turn
  s.kosBy = [0, 0]; s.kos = [0, 0];
  I.log(s, '— ' + (k ? "Your opponent's" : 'Your') + ' turn ' + s.turn);
  if (!P.deck.length) { s.gameOver = 1 - k; s.ended = true; I.log(s, (k ? 'Your opponent' : 'You') + ' could not draw a card and lose'); return s; }
  P.hand.push(P.deck.shift());
  HOOKS_START.forEach(h => h(s));
  return s;
}
const HOOKS_START = [], HOOKS_END = [];

/** Who acts now, and what they can do. who = -1 when the game is over. */
function next(s) {
  if (s.gameOver != null) return { who: -1, actions: [] };
  if (s.phase === 'setup') { const k = s.ready[0] ? 1 : 0; return { who: k, setup: true, actions: [] }; }
  if (s.promote && s.promote.length) { const k = s.promote[0]; return { who: k, actions: s.players[k].bench.filter(m => m.id !== s.noPromote).map(m => ({ t: 'promote', who: k, mon: m.id })) }; }
  const who = s.pending ? (s.pending.ask && s.pending.ask.who != null ? s.pending.ask.who : s.pending.who) : s.cur;
  return { who, actions: E.legalActions(s) };
}

/** Apply one action, and pass the turn when it ends. */
function step(s0, a) {
  let s = E.apply(s0, a);
  if (s.kos) { // who lost a Pokemon this turn, for "Knocked Out during your opponent's last turn"
    s.kosBy = s.kosBy ? s.kosBy.slice() : [0, 0];
    for (let k = 0; k < 2; k++) if (s.kos[k] > (s0.kos ? s0.kos[k] : 0)) s.kosBy[k] += s.kos[k] - (s0.kos ? s0.kos[k] : 0);
  }
  (api.HOOKS_STEP || []).forEach(h => h(s0, s));
  if (s.ended && s.gameOver == null && !(s.promote && s.promote.length)) s = passTurn(s);
  return s;
}
function passTurn(s) {
  if (s.gameOver != null) return s;
  HOOKS_END.forEach(h => h(s));
  I.checkKOs(s);
  if (s.gameOver != null || (s.promote && s.promote.length)) return s;
  s.cur = 1 - s.cur;
  return startTurn(s);
}
/** step() for a promote that came after the turn had ended (a Knock Out from an attack). */
function winner(s) { return s.gameOver == null ? -1 : s.gameOver; }

const api = { HOOKS_STEP: [], newGame, setupChoices, setUp, next, step, passTurn, winner, rngFrom, shuffle, HOOKS_START, HOOKS_END, E };
root.RdyGame = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
