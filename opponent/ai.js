// RdyDeck opponent AI: one engine, three levels.
//
//   Easy       only places cards: Pokemon onto the Bench, Evolutions, Energy, Tools and its own search and
//              draw cards. It never attacks and never touches your side of the board.
//   Contested  plays to win and messes with you: it attacks, gusts and plays disruption, but it looks only
//              a few moves ahead and makes the odd loose choice, like a decent club player.
//   Aggressive the best line it can find: it searches its whole turn (every order of plays, every choice
//              inside a card), scores where each line leaves both players, and plays the best one.
//
// Fair play: the AI never looks at hidden cards. Before it plans, it reshuffles its own deck with its
// Prize cards (it doesn't know which are which) and deals your hand from your hand, deck and Prizes put
// together, so it knows only how many cards you hold. When a draw or search shows it a card it didn't
// plan for, it plans again from what it actually has.
//
// Plain script: in a page it sets window.RdyAI; in Node, require() returns the same object.
// Hidden for now: nothing in the app loads this file (see opponent/README.md).
(function (root) {
'use strict';
const E = root.RdyPuzzle && root.RdyPuzzle.internals ? root.RdyPuzzle : require('../puzzle/engine.js');
const G = root.RdyGame || require('./game.js');
if (!root.RdyEffects) require('./effects.js');
const I = E.internals, T = E.T, mons = E.mons, topOf = E.topOf;

const LEVELS = {
  easy: { name: 'Easy' },
  contested: { name: 'Contested', width: 4, depth: 16, ms: 150, noise: 90 },
  aggressive: { name: 'Aggressive', width: 14, depth: 40, ms: 700, noise: 0 },
};

/* ---------------- What the AI may know ---------------- */

/** A copy of the game as player k can see it: hidden cards dealt again at random, a private random source. */
function view(s0, k, rnd) {
  const s = I.clone(s0);
  s.log = []; s.rng = rnd; s.unread = [];
  const P = s.players[k], O = s.players[1 - k];
  // While k is searching or looking through the deck, k can see what is in it (not its order).
  const ask = s.pending && s.pending.ask, open = !!ask && /^(search|look)$/.test(ask.kind) && (ask.who != null ? ask.who : s.pending.who != null ? s.pending.who : s.cur) === k;
  // The same goes for a card effect that offers cards from k's deck by name (its offer is already on the table).
  const offered = ask && ask.kind === 'hook' && (ask.choices || []).some(u => typeof u === 'number' && P.deck.some(y => y.uid === u));
  if (open || offered) G.shuffle(P.deck, rnd);
  else { const mine = G.shuffle(P.deck.concat(P.prizes), rnd); P.deck = mine.slice(0, P.deck.length); P.prizes = mine.slice(P.deck.length); }
  // A revealed hand (Eri, Xerosic's Machinations) stays as it is while k picks from it.
  const seen = ask && ask.kind === 'hook' && (ask.choices || []).some(u => typeof u === 'number' && O.hand.some(y => y.uid === u));
  const theirs = G.shuffle((seen ? [] : O.hand).concat(O.deck, O.prizes), rnd);
  if (seen) { O.deck = theirs.slice(0, O.deck.length); O.prizes = theirs.slice(O.deck.length); return s; }
  O.hand = theirs.slice(0, O.hand.length); O.deck = theirs.slice(O.hand.length, O.hand.length + O.deck.length); O.prizes = theirs.slice(O.hand.length + O.deck.length);
  return s;
}
/** What player k can tell apart: the board, k's own hand, counts of everything hidden, the choice in front of them. */
function sig(s, k) {
  const r = x => x.card.key;
  const m = q => q ? [r(topOf(q)), q.stack.length, q.energy.map(r).sort().join('+'), q.tool ? r(q.tool) : '', q.dmg, q.cond || '', q.poison ? 'p' : '', q.burn ? 'b' : ''].join('/') : '-';
  const side = (P, j) => [m(P.active), P.bench.map(m).join(';'), j === k ? P.hand.map(r).sort().join(',') : P.hand.length, P.deck.length, P.prizes.length, P.discard.length, JSON.stringify(P.used)].join('|');
  const p = s.pending;
  return [side(s.players[0], 0), side(s.players[1], 1), s.cur, s.stadium ? r(s.stadium.ref) : '', s.promote ? s.promote.join(',') : '',
    p ? [p.i, p.ask && JSON.stringify(p.ask), p.ctx && p.ctx.looked ? p.ctx.looked.map(r).sort().join(',') : ''].join(':') : ''].join('#');
}

/* ---------------- Reading the board ---------------- */

const ANY = { uid: -1, card: { key: 'any-energy', name: 'Energy', cat: 'energy', sub: [], types: [], rtext: 'As long as this card is attached to a Pokémon, it provides every type of Energy but provides only 1 Energy at a time.' } };
const hpLeft = (s, m) => E.maxHp(s, m) - m.dmg;
const pv = (s, m) => Math.max(1, E.prizeValue(s, m));
const stage = m => { const st = topOf(m).card.stage; return st === 'stage2' ? 2 : st === 'stage1' ? 1 : 0; };

/**
 * The most damage attacker (owned by player k) can do to target as the Active Pokemon, if it attacks:
 * now (extra 0) or after one more Energy (extra 1). 0 when no attack can be paid or read.
 */
function bestHit(s, att, k, target, extra) {
  const s2 = Object.assign({}, s, { cur: k, mods: s.cur === k ? s.mods : {} });
  const top = topOf(att);
  let best = 0;
  for (const a of top.card.attacks || []) {
    let R; try { R = E.readAttack(a); } catch (e) { R = null; }
    if (!R) continue;
    let cost = a.cost || [];
    try { for (const h of E.HOOKS.cost) cost = h(s2, att, a, cost); } catch (e) { /* keep the printed cost */ }
    const ok = E.costMet(att.energy, cost) || (extra && E.costMet(att.energy.concat([ANY]), cost));
    if (!ok) continue;
    let d = 0; try { d = E.damageTo(s2, att, R, target, true); } catch (e) { d = 0; }
    if (d > best) best = d;
  }
  return best;
}
const canAct = m => !(m.cond === 'asleep' || m.cond === 'paralyzed');

/**
 * How good the board is for player k, in points: a Prize card is 1000.
 * Read at the end of k's turn (or anywhere inside it): what k has, what k threatens next turn, and what
 * the other player threatens on their turn, which comes first.
 */
function value(s, k) {
  const w = G.winner(s);
  if (w === k) return 1e7; if (w === 1 - k) return -1e7;
  const P = s.players[k], O = s.players[1 - k];
  let v = 1000 * ((6 - P.prizes.length) - (6 - O.prizes.length));
  v += side(s, k) - 0.75 * side(s, 1 - k);
  const myTurn = s.cur === k;
  // Their next attack (it comes before mine when my turn has ended).
  if (P.active && O.active) {
    let worst = 0;
    const hitMine = (att, p) => {
      const d = bestHit(s, att, 1 - k, P.active, true), h = hpLeft(s, P.active);
      if (d >= h) worst = Math.max(worst, p * (P.bench.length ? 650 * pv(s, P.active) : 4e5));
      else worst = Math.max(worst, p * 160 * pv(s, P.active) * d / Math.max(10, h));
    };
    hitMine(O.active, canAct(O.active) ? 0.9 : 0.25);
    O.bench.forEach(b => hitMine(b, 0.4));
    // A gust and a Knock Out on my Bench (Boss's Orders is in nearly every list).
    let g = 0;
    P.bench.forEach(b => { if (canAct(O.active) && bestHit(s, O.active, 1 - k, b, true) >= hpLeft(s, b)) g = Math.max(g, 0.45 * 650 * pv(s, b)); });
    v -= Math.max(worst, g) * (myTurn ? 0.8 : 1);
  }
  // My next attack.
  if (P.active && O.active) {
    let best = 0;
    const hitTheirs = (att, p, t) => {
      const d = bestHit(s, att, k, t, true), h = hpLeft(s, t);
      best = Math.max(best, d >= h ? p * 600 * pv(s, t) : p * 150 * pv(s, t) * d / Math.max(10, h));
    };
    hitTheirs(P.active, 0.75, O.active);
    P.bench.forEach(b => hitTheirs(b, 0.45, O.active));
    O.bench.forEach(t => hitTheirs(P.active, 0.3, t));
    v += best;
  }
  return v;
}
/** How many more Energy (of the right types) an attack still needs on m. */
function missing(s, m, k, a) {
  let cost = a.cost || [];
  try { const s2 = Object.assign({}, s, { cur: k }); for (const h of E.HOOKS.cost) cost = h(s2, m, a, cost); } catch (e) { /* printed cost */ }
  for (let n = 0; n <= cost.length; n++) if (E.costMet(n ? m.energy.concat(Array(n).fill(ANY)) : m.energy, cost)) return { n, of: cost.length };
  return { n: cost.length, of: cost.length };
}
/** Energy on m, worth more when it pays for a strong attack with the right types. */
function energyScore(s, m, k) {
  let best = 0, used = 0;
  for (const a of topOf(m).card.attacks || []) {
    const r = missing(s, m, k, a), dmg = parseInt(a.dmg, 10) || (a.text ? 40 : 0);
    const sc = (r.of - r.n) * 26 * (0.6 + Math.min(dmg, 300) / 300) + (r.n === 0 && r.of > 0 ? 25 : 0);
    if (sc > best) { best = sc; used = r.of - r.n; }
  }
  return best + 6 * Math.max(0, m.energy.length - used);
}
/** What one side has: Pokemon, Energy on them, cards in hand, a deck that won't run out. */
function side(s, k) {
  const P = s.players[k];
  let v = 0;
  for (const m of mons(P)) {
    let x = 70 + 55 * stage(m) + energyScore(s, m, k) + (m.tool ? 18 : 0);
    x *= 0.55 + 0.45 * Math.max(0, hpLeft(s, m)) / Math.max(10, E.maxHp(s, m));
    v += x;
  }
  if (P.active) {
    if (P.active.cond === 'asleep' || P.active.cond === 'paralyzed') v -= 70;
    if (P.active.cond === 'confused') v -= 40;
    if (P.active.poison) v -= 30; if (P.active.burn) v -= 30;
  }
  const h = P.hand.length;
  v += 16 * Math.min(h, 7) + 4 * Math.max(0, h - 7);
  if (P.deck.length === 0) v -= 3e5; else if (P.deck.length < 5) v -= 120 * (5 - P.deck.length);
  if (s.stadium && s.stadium.owner === k) v += 15;
  return v;
}

/* ---------------- Choosing ---------------- */

// Steps that reach the other player's side, which Easy never plays.
const TOUCHES = /gust|opp|both|toolOff|eri|blowtorch|mill|snipe|spread|itemLock|cond|pushOut|perCounter|raid|countersActive/;
function touchesOpp(s, a, k) {
  const P = s.players[k];
  let steps = null;
  if (a.t === 'trainer') { const x = P.hand.find(y => y.uid === a.uid); steps = x && E.readTrainer(x).steps; }
  else if (a.t === 'ability' || a.t === 'handAbility') {
    const m = a.t === 'ability' ? I.findMon(s, a.mon) && I.findMon(s, a.mon).m : null;
    const ref = m ? topOf(m) : P.hand.find(y => y.uid === a.uid);
    const A = ref && E.readAbilities(ref)[a.i]; steps = A && A.steps;
  }
  return !!(steps && steps.some(st => TOUCHES.test(st.t)));
}

/** Easy: puts cards down, never attacks, never touches your side. */
function chooseEasy(s, k, X, rnd) {
  const acts = X.actions;
  if (acts[0] && (acts[0].t === 'pick' || acts[0].t === 'promote')) return acts[Math.floor(rnd() * acts.length)];
  const ok = acts.filter(a => ['bench', 'evolve', 'candy', 'energy', 'tool'].includes(a.t) ||
    ((a.t === 'trainer' || a.t === 'ability' || a.t === 'handAbility') && !touchesOpp(s, a, k)));
  const end = acts.find(a => a.t === 'end');
  if (!ok.length || (rnd() < 0.08 && end)) return end || acts[0];
  // Pokemon first, then Energy, then the rest, with a little shuffle so it isn't the same game every time.
  const rank = a => ({ bench: 0, evolve: 1, candy: 1, energy: 2, tool: 3 }[a.t] ?? 4) + rnd() * 1.5;
  return ok.slice().sort((a, b) => rank(a) - rank(b))[0];
}

/** Settle choices the other player makes inside my turn (a new Active, a discard): the best for them. */
function answerFor(s, j) {
  const X = G.next(s);
  if (X.actions.length === 1) return X.actions[0];
  let best = X.actions[0], bv = -Infinity;
  for (const a of X.actions.slice(0, 12)) { let v; try { v = value(G.step(s, a), j); } catch (e) { continue; } if (v > bv) { bv = v; best = a; } }
  return best;
}
function settle(s, k, budget) {
  let n = 0;
  while (G.winner(s) < 0 && n++ < 20) {
    const X = G.next(s);
    if (X.who === k || X.who < 0 || !X.actions.length || s.cur !== k) break;
    s = G.step(s, answerFor(s, X.who));
    if (budget) budget.nodes++;
  }
  return s;
}

/**
 * Plan the rest of player k's turn: a beam search over orders of play and choices inside cards, scored by
 * value() where each line ends. Returns { line: [actions], score, nodes, states: [sig after each action] }.
 */
function plan(s0, k, L, rnd, opts) {
  const t0 = Date.now(), budget = { nodes: 0 }, ms = (opts && opts.ms) || L.ms, maxNodes = (opts && opts.maxNodes) || 1e9;
  const root = view(s0, k, rnd);
  let beam = [{ s: root, line: [], sigs: [] }], best = null;
  const seen = new Set([sig(root, k)]);
  const out = () => Date.now() - t0 > ms || budget.nodes > maxNodes;
  const finish = node => {
    const sc = value(node.s, k) + (L.noise ? (rnd() - 0.5) * 2 * L.noise : 0);
    if (!best || sc > best.score) best = { line: node.line, sigs: node.sigs, score: sc };
  };
  const endNow = node => { // close an open line by ending the turn
    const end = G.next(node.s).actions.find(a => a.t === 'end');
    if (!end || node.s.cur !== k) return;
    try { const s2 = G.step(node.s, end); finish({ s: s2, line: node.line.concat([end]), sigs: node.sigs.concat([sig(s2, k)]) }); } catch (e) { /* skip */ }
  };
  for (let depth = 0; depth < L.depth && beam.length; depth++) {
    const width = depth === 0 ? 1e9 : L.width; // every first move gets looked at
    const next = [];
    for (const node of beam) {
      const X = G.next(node.s);
      if (G.winner(node.s) >= 0 || node.s.cur !== k || X.who !== k || !X.actions.length) { finish(node); continue; }
      for (const a of X.actions) {
        let s2;
        try { s2 = settle(G.step(node.s, a), k, budget); } catch (e) { continue; }
        budget.nodes++;
        const key = sig(s2, k);
        if (seen.has(key)) continue; seen.add(key);
        const child = { s: s2, line: node.line.concat([a]), sigs: node.sigs.concat([key]) };
        if (G.winner(s2) >= 0 || s2.cur !== k || G.next(s2).who !== k) { finish(child); continue; }
        child.score = value(s2, k);
        next.push(child);
      }
      if (out()) break;
    }
    next.sort((a, b) => b.score - a.score);
    beam = next.slice(0, width);
    if (out()) break;
  }
  beam.forEach(endNow); // lines still open when depth or time ran out
  return { line: best ? best.line : [], sigs: best ? best.sigs : [], score: best ? best.score : 0, nodes: budget.nodes, ms: Date.now() - t0 };
}

/**
 * An opponent controller. new Player(level, seed). Call choose(state, k) whenever G.next(state).who === k.
 * It keeps its plan between calls and plans again when the game shows it something new.
 */
function Player(level, seed) {
  this.level = LEVELS[level] ? level : 'aggressive';
  this.L = LEVELS[this.level];
  this.rnd = G.rngFrom(seed != null ? seed : Math.floor(Math.random() * 2 ** 31));
  this.cache = null;
  this.stats = { decisions: 0, plans: 0, ms: 0, nodes: 0 };
}
Player.prototype.choose = function (s, k, opts) {
  const X = G.next(s);
  this.stats.decisions++;
  if (!X.actions.length) return null;
  if (X.actions.length === 1) return X.actions[0];
  if (this.level === 'easy') return chooseEasy(s, k, X, this.rnd);
  // A choice in the other player's turn (a new Active after a Knock Out, a discard): score each one.
  if (s.cur !== k) { const t0 = Date.now(); const a = answerFor(s, k); this.stats.ms += Date.now() - t0; return a; }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const c = this.cache;
  if (c && c.line.length && c.at === sig(s, k)) {
    const real = X.actions.find(b => same(c.line[0], b));
    if (real) { this.cache = { line: c.line.slice(1), at: c.sigs[0], sigs: c.sigs.slice(1) }; return real; }
  }
  const P = plan(s, k, this.L, this.rnd, opts);
  this.stats.plans++; this.stats.ms += P.ms; this.stats.nodes += P.nodes;
  const first = P.line[0] && X.actions.find(b => same(P.line[0], b));
  // Keep the rest of the line while the board looks the way the plan expected after each step.
  this.cache = first ? { line: P.line.slice(1), at: P.sigs[0], sigs: P.sigs.slice(1) } : null;
  return first || this.greedy(s, k, X);
};

/** One step ahead, on what k can see: for a choice the plan didn't foresee. */
Player.prototype.greedy = function (s, k, X) {
  const v = view(s, k, this.rnd);
  let best = null, bv = -Infinity;
  for (const a of X.actions) { let x; try { x = value(settle(G.step(v, a), k), k); } catch (e) { continue; } if (x > bv) { bv = x; best = a; } }
  return best || X.actions.find(b => b.t === 'end') || X.actions[0];
};

/** Opening setup for player k: the Active and Bench. */
function setupPick(s, k, level, rnd) {
  rnd = rnd || Math.random;
  const B = G.setupChoices(s, k);
  if (level === 'easy') { const sh = G.shuffle(B.slice(), rnd); return { active: sh[0].uid, bench: sh.slice(1, 1 + Math.floor(rnd() * sh.length)).map(x => x.uid) }; }
  // Start with something that is cheap to lose and easy to move: low Prize value, low Retreat Cost, decent HP.
  // Keep Pokemon whose job is to sit on the Bench (Abilities) out of the Active Spot.
  const score = x => {
    const c = x.card; let v = (c.hp || 60) / 10 - 12 * (c.retreat || 0) - (T.gfIsEx(x) ? 45 : 0);
    if (E.readAbilities(x).length) v -= 15;
    if ((c.attacks || []).some(a => (a.cost || []).length <= 1 && a.dmg)) v += 8;
    return v + rnd();
  };
  const sorted = B.slice().sort((a, b) => score(b) - score(a));
  return { active: sorted[0].uid, bench: sorted.slice(1, 6).map(x => x.uid) };
}

const api = { LEVELS, Player, setupPick, value, plan, view, sig, bestHit, touchesOpp };
root.RdyAI = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
