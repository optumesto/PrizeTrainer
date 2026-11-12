// RdyDeck puzzle solver: does this board have a win this turn, how short is it, and how many first
// moves lead to one? Works on puzzle/engine.js states. No DOM, no globals.
//
// The search is a minimax over one turn: you pick every action; when the opponent has a choice
// (a new Active after a Knock Out), they pick the one that is worst for you. Positions reached in
// a different order are merged (engine key()), so a turn with many orderings stays small.
// A line that touches luck or an unread card never counts as a win.
(function (root) {
'use strict';
const E = root.RdyPuzzle && root.RdyPuzzle.legalActions ? root.RdyPuzzle : require('./engine.js');

const FREE = { pick: 1, promote: 1 }; // answers to a choice are part of the action that asked
function isOppChoice(s) {
  if (s.promote && s.promote.length) return s.promote[0] !== s.cur;
  return !!(s.pending && s.pending.who !== s.cur);
}

/**
 * solve(state, { maxNodes, maxMoves }) -> { win, moves, nodes, complete, line, firstMoves }
 * win: a forced win exists within maxMoves of your actions (choices inside an effect are not counted).
 * moves: the fewest actions that force the win.
 * complete: false when the node budget ran out (then win may be wrong, so the dealer drops the board).
 * firstMoves: how many different first actions lead to a forced win within maxMoves.
 * firstShort: how many different first actions lead to a forced win in the fewest actions (moves).
 *
 * Iterative deepening: try a 1-action win, then 2, and so on. Each depth is an exhaustive search, so the
 * first depth that wins is the shortest win. Positions are remembered across depths: a position known to
 * fail with r actions left also fails with fewer, and one that wins with r wins with more.
 */
function solve(s0, opts) {
  const max = (opts && opts.maxNodes) || 200000, cap = (opts && opts.maxMoves) || 8;
  const failAt = new Map(), winAt = new Map();
  let nodes = 0, capped = false;
  function can(s, r) {
    if (E.goalMet(s)) return true;
    if (s.ended || s.luck || s.unread.length || r < 0) return false;
    const k = E.key(s);
    if (winAt.has(k) && winAt.get(k) <= r) return true;
    if (failAt.has(k) && failAt.get(k) >= r) return false;
    if (++nodes > max) { capped = true; return false; }
    const opp = isOppChoice(s);
    let res = opp;
    for (const a of E.legalActions(s)) {
      if (a.t === 'end') continue; // ending the turn never wins
      const c = FREE[a.t] ? 0 : 1;
      if (c > r) continue;
      const v = can(E.apply(s, a), r - c);
      if (opp && !v) { res = false; break; }
      if (!opp && v) { res = true; break; }
    }
    if (!capped) { if (res) { if (!(winAt.get(k) <= r)) winAt.set(k, r); } else if (!(failAt.get(k) >= r)) failAt.set(k, r); }
    return res;
  }
  let moves = Infinity;
  for (let d = 0; d <= cap && !capped; d++) if (can(s0, d)) { moves = d; break; }
  const out = { win: moves < Infinity, moves: moves < Infinity ? moves : null, nodes, complete: !capped, line: [], firstMoves: 0, firstShort: 0, can };
  if (!out.complete) return out;
  for (const a of E.legalActions(s0)) if (a.t !== 'end' && can(E.apply(s0, a), cap - (FREE[a.t] ? 0 : 1))) out.firstMoves++;
  // firstShort: how many first actions start a shortest win. The dealer rates difficulty by this:
  // a 3-action win with one way to start is harder than one with several.
  if (out.win) for (const a of E.legalActions(s0)) if (a.t !== 'end' && can(E.apply(s0, a), moves - (FREE[a.t] ? 0 : 1))) out.firstShort++;
  out.nodes = nodes;
  out.complete = !capped;
  if (out.win) out.line = mainLine(s0, can, moves);
  return out;
}
/** Our line: a shortest win, with the opponent's choices filled in (the one that keeps the game going longest). */
function mainLine(s, can, r) {
  const line = [];
  for (let guard = 0; guard < 200 && !E.goalMet(s); guard++) {
    let pick = null;
    if (isOppChoice(s)) {
      let worst = -1;
      for (const a of E.legalActions(s)) { const n = E.apply(s, a); let need = 0; while (need < r && !can(n, need)) need++; if (need > worst) { worst = need; pick = a; } }
    } else pick = E.legalActions(s).find(a => a.t !== 'end' && can(E.apply(s, a), r - (FREE[a.t] ? 0 : 1)));
    if (!pick) break;
    if (!FREE[pick.t] && !isOppChoice(s)) r--;
    line.push(pick); s = E.apply(s, pick);
  }
  return line;
}
/** Does attacking right away, with no other play, already win? Then the board is too easy. */
function obviousWin(s0) {
  return E.legalActions(s0).filter(a => a.t === 'attack').some(a => E.goalMet(E.apply(s0, a)));
}

/** An action named by card key instead of uid, so a player's line can be matched to the engine's. */
function sig(s, a) {
  const kOf = uid => { for (const p of s.players) for (const z of [p.hand, p.deck, p.discard]) { const r = z.find(y => y.uid === uid); if (r) return r.card.key; }
    for (const p of s.players) for (const m of E.mons(p)) { const r = m.energy.find(y => y.uid === uid); if (r) return r.card.key; } return uid; };
  const v = a.v;
  const mapV = Array.isArray(v) ? v.map(kOf).sort() : v && typeof v === 'object' ? Object.assign({}, v, v.uid ? { uid: kOf(v.uid) } : {}) : v;
  return JSON.stringify(Object.assign({}, a, a.uid ? { uid: kOf(a.uid) } : {}, a.s2 ? { s2: kOf(a.s2) } : {}, a.pay ? { pay: a.pay.map(kOf).sort() } : {}, 'v' in a ? { v: mapV } : {}));
}
/**
 * Check a player's line. Each action must be legal when it is played; the opponent's choices are
 * made by the solver (their best defence). Any line that truly wins is accepted, not only ours.
 * -> { ok, won, at, error, state }
 */
function replay(s, actions, opts) {
  const S = solve(s, opts); // fills the memo used for the opponent's choices
  let i = 0;
  // The opponent's choice: one that leaves you no win if there is one, else the one that needs the most actions.
  const oppPick = st => { let best = null, bv = -1; for (const a of E.legalActions(st)) { const r = solve(E.apply(st, a), opts); const v = r.win ? r.moves : Infinity; if (v > bv) { bv = v; best = a; } } return best; };
  while (!E.goalMet(s) && !s.ended) {
    if (isOppChoice(s)) { s = E.apply(s, oppPick(s)); continue; }
    if (i >= actions.length) return { ok: true, won: false, at: i, state: s };
    const want = sig(s, actions[i]);
    const legal = E.legalActions(s).find(a => sig(s, a) === want);
    if (!legal) return { ok: false, won: false, at: i, error: 'Not a legal play here: ' + want, state: s };
    s = E.apply(s, legal); i++;
  }
  return { ok: true, won: E.goalMet(s), at: i, state: s, solvable: S.win };
}

const api = { solve, obviousWin, replay, sig };
root.RdyPuzzle = Object.assign(root.RdyPuzzle || {}, api);
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
