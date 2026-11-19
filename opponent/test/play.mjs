// Plays games between controllers on meta tournament lists and measures how they play.
// node opponent/test/play.mjs <levelA> <levelB> [games] [ms]
//   levels: easy, contested, aggressive, random, hitter (attacks when it can, otherwise random)
// Each pair of lists is played twice with the decks swapped, so a stronger deck doesn't decide the result.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../game.js'); require('../effects.js');
const AI = require('../ai.js');
const SOLVER = require('../../puzzle/solver.js');
const E = G.E, I = E.internals;
const C = await import('./cards.mjs');

/** A controller for a test: AI levels, plus two simple bots to compare against. */
export function controller(level, seed, opts) {
  const rnd = G.rngFrom(seed);
  if (level === 'random' || level === 'hitter') {
    return { level, stats: { decisions: 0, ms: 0 }, choose(s, k) {
      const X = G.next(s); this.stats.decisions++;
      const atk = X.actions.filter(a => a.t === 'attack');
      if (level === 'hitter' && atk.length) return atk[Math.floor(rnd() * atk.length)];
      const non = X.actions.filter(a => a.t !== 'end');
      if (non.length && rnd() < 0.85) return non[Math.floor(rnd() * non.length)];
      return X.actions.find(a => a.t === 'end') || X.actions[Math.floor(rnd() * X.actions.length)];
    }, setup(s, k) { const B = G.shuffle(G.setupChoices(s, k).slice(), rnd); return { active: B[0].uid, bench: B.slice(1, 1 + Math.floor(rnd() * B.length)).map(x => x.uid) }; } };
  }
  // old-<level>: the AI as it was before the current changes (opponent/ai-old.tmp.js, a local copy for A/B tests).
  if (level.startsWith('old-')) { const O = require('../ai-old.tmp.js'), lv = level.slice(4), q = new O.Player(lv, seed); return { level, stats: q.stats, choose: (s, k) => q.choose(s, k, opts), setup: (s, k) => O.setupPick(s, k, lv, rnd) }; }
  const p = new AI.Player(level, seed);
  return { level, stats: p.stats, choose: (s, k) => p.choose(s, k, opts), setup: (s, k) => AI.setupPick(s, k, level, rnd) };
}

/**
 * The smart checks, on one player's turns:
 * koAvail/koTaken: turns that started with a sure Knock Out on the opponent's Active (found by the puzzle
 *   solver, with the deck face down and every coin tails) and how many of those it took (or took as many
 *   Prize cards another way).
 * winAvail/winTaken: the same for taking the last Prize cards.
 * attackAvail/attacked: turns where an attack could be paid, and how many of those it attacked in.
 * gusts/gustKO: gusts played, and how many were followed by a Knock Out that turn.
 */
function newMeter() { return { turns: 0, koAvail: 0, koTaken: 0, winAvail: 0, winTaken: 0, attackAvail: 0, attacked: 0, gusts: 0, gustKO: 0, oracleCut: 0, st2: 0, st2n: 0 }; }
function oracle(s, goal) {
  const o = I.clone(s); o.log = []; o.unread = []; o.luck = false; o.goal = goal;
  o.rng = () => 0.999; // every coin is tails, every shuffle the same: only sure lines count
  const P = o.players[o.cur];
  P.deck = P.deck.map(() => ({ uid: ++o.uid, card: E.HIDDEN })); P.prizes = P.prizes.map(() => ({ uid: ++o.uid, card: E.HIDDEN }));
  const O = o.players[1 - o.cur];
  O.hand = O.hand.map(() => ({ uid: ++o.uid, card: E.HIDDEN }));
  o.start = { oppActive: O.active && O.active.id };
  try { return SOLVER.solve(o, { maxNodes: 6000, maxMoves: 7 }); } catch (e) { return { win: false, complete: false }; }
}

export function playGame(listA, listB, ctl, seed, meter) {
  let s = G.newGame([listA.cards, listB.cards], { seed });
  for (const k of [0, 1]) { const p = ctl[k].setup(s, k); s = G.setUp(s, k, p.active, p.bench); }
  let n = 0, turnStart = null; const ctlName = ctl.map(c => c.level);
  const startTurn = () => {
    const k = s.cur, M = meter && meter[k]; if (!M) return;
    M.turns++;
    const O = s.players[1 - k];
    const t = { logAt: s.log.length, k, opp: O.active && O.active.id, oppVal: O.active ? E.prizeValue(s, O.active) : 1, myPrizes: s.players[k].prizes.length, kos: s.koIds.length, prizes: O.prizes.length, attackable: false, attacked: false, gusted: false };
    if (s.turn > 1 || !s.first) {
      const r = oracle(s, { t: 'koActive' }); if (!r.complete) M.oracleCut++;
      t.ko = !!r.win; if (t.ko) M.koAvail++;
      if (t.ko && s.players[k].prizes.length <= 3) { const w = oracle(s, { t: 'prizes' }); t.win = !!w.win; if (t.win) M.winAvail++; }
    }
    turnStart = t;
  };
  const endTurn = () => {
    const t = turnStart, M = t && meter && meter[t.k]; if (!M) return;
    // A sure KO counts as taken when the Active went down, or the turn took at least as many Prize cards some other way (a better gust target).
    const took = s.koIds.slice(t.kos).includes(t.opp) || (t.myPrizes - s.players[t.k].prizes.length) >= t.oppVal;
    if (t.ko && took) M.koTaken++;
    if (t.ko && !took && process.env.MISS) console.log('MISSED KO', ctlName[t.k], 'seat', t.k, 'turn', s.turns.join('/'), '\n  ' + s.log.slice(t.logAt).join('\n  '));
    if (t.win && G.winner(s) === t.k) M.winTaken++;
    if (t.attackable) M.attackAvail++;
    if (t.attackable && !t.attacked && process.env.MISSA && /contested|aggressive/.test(ctlName[t.k])) console.log('NO ATTACK', ctlName[t.k], 'turn', s.turns.join('/'), '\n  ' + s.log.slice(t.logAt).join('\n  '));
    if (t.attackable && t.attacked) M.attacked++;
    if (t.gusted) { M.gusts++; if (s.koIds.length > t.kos) M.gustKO++; }
    // Setup: Stage 2 Pokemon in play at the end of its own turn 4 (decks that run Stage 2s).
    const Pk = s.players[t.k];
    if (s.turns[t.k] === 4 && Pk.deck.concat(Pk.hand, Pk.discard, Pk.prizes).concat(E.mons(Pk).flatMap(m => m.stack)).some(x => x.card.stage === 'stage2')) {
      M.st2n++; M.st2 += E.mons(Pk).filter(m => E.topOf(m).card.stage === 'stage2').length; }
    turnStart = null;
  };
  let lastTurn = null;
  while (G.winner(s) < 0 && n < 3000) {
    const key = s.cur + ':' + s.turns.join(',');
    if (key !== lastTurn) { if (lastTurn) endTurn(); lastTurn = key; startTurn(); }
    const X = G.next(s);
    if (!X.actions.length) break;
    const a = ctl[X.who].choose(s, X.who);
    if (turnStart && X.who === s.cur) {
      if (X.actions.some(b => b.t === 'attack')) turnStart.attackable = true;
      if (a.t === 'attack') turnStart.attacked = true;
      if (a.t === 'trainer') { const x = s.players[s.cur].hand.find(y => y.uid === a.uid); const st = x && E.readTrainer(x).steps; if (st && st.some(z => z.t === 'gust')) turnStart.gusted = true; }
    }
    const before = s; s = G.step(s, a); n++;
    if (process.env.CHECK) for (const P of s.players) for (const z of ['hand', 'deck', 'discard', 'prizes']) if (P[z].some(x => !x || !x.card)) {
      console.log('EMPTY CARD in', z, 'after', JSON.stringify(a), '\n  ' + s.log.slice(-8).join('\n  ')); process.exit(1); }
  }
  endTurn();
  return { winner: G.winner(s), turns: s.turns.slice(), prizesLeft: s.players.map(p => p.prizes.length), deckOut: s.log.some(l => /deck|can't draw/i.test(l) && /lose|lost/i.test(l)), actions: n };
}

if (import.meta.url === new URL('file://' + require('node:path').resolve(process.argv[1])).href) {
  const [A = 'aggressive', B = 'random', nArg = '20', msArg] = process.argv.slice(2);
  const N = +nArg, opts = msArg ? { ms: +msArg } : undefined;
  const L = C.lists().filter(l => l.place != null ? l.place <= 64 : true);
  const meter = [newMeter(), newMeter()]; // per level, not per seat
  const res = { [A]: 0, [B]: 0, draw: 0 }, dec = { [A]: { d: 0, ms: 0 }, [B]: { d: 0, ms: 0 } };
  let turns = 0, deckOuts = 0, t0 = Date.now();
  for (let g = 0; g < N; g++) {
    const pair = Math.floor(g / 2), la = L[(pair * 13) % L.length], lb = L[(pair * 29 + 7) % L.length];
    const swap = g % 2 === 1;
    const lv = swap ? [B, A] : [A, B];
    const ctl = [controller(lv[0], 100 + g, opts), controller(lv[1], 200 + g, opts)];
    const m2 = swap ? [meter[1], meter[0]] : meter;
    const r = playGame(swap ? lb : la, swap ? la : lb, ctl, 5000 + g, m2);
    if (r.winner < 0) res.draw++; else res[lv[r.winner]]++;
    turns += r.turns[0] + r.turns[1]; if (r.deckOut) deckOuts++;
    ctl.forEach((c, k) => { dec[lv[k]].d += c.stats.decisions; dec[lv[k]].ms += c.stats.ms || 0; });
    if (process.env.V) console.log(g, lv.join(' v '), '→', r.winner < 0 ? 'draw' : lv[r.winner], r.turns, r.prizesLeft);
  }
  const pct = (a, b) => b ? Math.round(100 * a / b) + '% (' + a + '/' + b + ')' : '-';
  console.log(`${A} vs ${B}: ${N} games, ${Math.round((Date.now() - t0) / 1000)} s`);
  console.log(`wins: ${A} ${res[A]}, ${B} ${res[B]}, unfinished ${res.draw}. Avg turns ${(turns / N).toFixed(1)}. Deck-outs ${deckOuts}.`);
  [[A, meter[0]], [B, meter[1]]].forEach(([lv, M]) => {
    console.log(`${lv}: KO taken when sure ${pct(M.koTaken, M.koAvail)}, game-winning KO taken ${pct(M.winTaken, M.winAvail)}, attacked when able ${pct(M.attacked, M.attackAvail)}, gust then KO ${pct(M.gustKO, M.gusts)}, Stage 2s by turn 4 ${M.st2n ? (M.st2 / M.st2n).toFixed(2) + ' (' + M.st2n + ' games)' : '-'}, ms/decision ${dec[lv].d ? (dec[lv].ms / dec[lv].d).toFixed(1) : '-'}${M.oracleCut ? ', oracle cut ' + M.oracleCut : ''}`);
  });
}
