// What a full game reads beyond a one-turn puzzle: both players' hands, healing, Special
// Conditions, coins, spread damage, sniping, and the Special Energy and Stadiums the meta plays.
// Registered on the engine's HOOKS, so they apply only to full-game states (state.real).
//
// Chosen by how often the cards show up in the tournament lists RdyDeck grades against
// (tests/grade-lists.json); opponent/test/coverage.mjs lists what is still not read.
(function (root) {
'use strict';
const E = root.RdyPuzzle && root.RdyPuzzle.internals ? root.RdyPuzzle : require('../puzzle/engine.js');
const G = root.RdyGame || require('./game.js');
const H = E.HOOKS, I = E.internals, T = E.T;
const mons = E.mons, topOf = E.topOf, nm = m => topOf(m).card.name;
const oppOf = s => s.players[1 - s.cur];

/* ---------- Sentences in Trainers and Abilities ---------- */
const SENT = [
  [/^each player shuffles their hand into their deck$/, () => ({ t: 'bothShuffle' })],
  [/^(?:then, )?you draw (\d+) cards?, and your opponent draws (\d+) cards?$/, m => ({ t: 'bothDraw', me: +m[1], opp: +m[2] })],
  [/^each player shuffles their hand into their deck and draws (\d+) cards$/, m => ({ t: 'bothShuffleDraw', n: +m[1] })],
  [/^each player shuffles their hand and puts it on the bottom of their deck$/, () => ({ t: 'bothBottom' })],
  [/^if either player put any cards on the bottom of their deck in this way, each player draws a card for each of their remaining prize cards$/, () => ({ t: 'bothDrawPrizes' })],
  [/^your opponent shuffles their hand and puts it on the bottom of their deck$/, () => ({ t: 'oppBottom' })],
  [/^if they put any cards on the bottom of their deck in this way, they draw (\d+) cards$/, m => ({ t: 'oppDrawIf', n: +m[1] })],
  [/^if heads, discard an energy from 1 of your opponent's pokemon$/, () => ({ t: 'oppEnergyOff', ifHeads: true })],
  [/^discard an energy from (?:1 of )?your opponent's (active )?pokemon$/, m => ({ t: 'oppEnergyOff', active: !!m[1] })],
  [/^your opponent discards cards from their hand until they have (\d+) cards in their hand$/, m => ({ t: 'oppDiscardTo', n: +m[1] })],
  [/^choose up to (\d+) pokemon tools attached to pokemon(?: \(yours or your opponent's\))? and discard them$/, m => ({ t: 'toolOff', n: +m[1] })],
  // Other healing is read by the app's own reader (puzzle/text.js); this one keeps its Energy condition.
  [/^heal (\d+) damage from your active pokemon that has (\d+) or more energy attached$/, m => ({ t: 'heal', n: +m[1], who: 'active', minE: +m[2] })],
  [/^during this turn, attacks used by your (\w+) pokemon do (\d+) more damage to your opponent's active pokemon$/, m => ({ t: 'typeBoost', type: m[1], n: +m[2] })],
];
// prevSent: the sentence read just before this one (readBody reads a card's sentences in order).
let prevSent = '', lastLook = null;
H.opp.push(s => { const prev = prevSent; prevSent = s; for (const [re, f] of SENT) { const m = s.match(re); if (m) { const r = f(m, prev); if (r) return r; } } return null; });

/* ---------- Attacks ---------- */
function calcOf(R) {
  if (R._c) return R; R._c = true; R.adds = []; R.gates = [];
  R.calc = (s, att, t, isA, d) => {
    if (R.gates.some(g => !g(s, att))) return 0;
    return R.adds.length ? R.adds.reduce((a, g) => a + g(s, att, t, isA), R.op === 'x' ? 0 : R.base) : d;
  };
  return R;
}
function addCalc(R, f) { calcOf(R).adds.push(f); }
function gate(R, f) { calcOf(R).gates.push(f); }
// Coins an attack flips are flipped once, before its damage (R.pre). Before that (the AI's estimates) the expected heads count.
function heads(s, R) { return s.atkHeads != null ? s.atkHeads : R.untilTails ? 1 : (R.flips || 1) / 2; }
function rollPre(R) {
  R.pre = s => {
    let h = 0;
    if (R.untilTails) { while (s.rng() < 0.5 && h < 30) h++; }
    else for (let i = 0; i < (R.flips || 1); i++) if (s.rng() < 0.5) h++;
    s.atkHeads = h; I.log(s, h + ' heads');
  };
}
const nEnergy = (m, type) => m.energy.reduce((a, e) => { const p = E.internals ? (T.gfEType(e) ? [T.gfEType(e)] : null) : null; return a + (!type || (p && p[0] === type) ? 1 : 0); }, 0);
const ATK = [
  [/^this attack does (\d+) damage to 1 of your opponent's pokemon$/, m => ({ t: 'snipe', n: +m[1], k: 1 })],
  [/^this attack does (\d+) damage to (\d+) of your opponent's pokemon$/, m => ({ t: 'snipe', n: +m[1], k: +m[2], noWR: true })],
  [/^this attack does (\d+) damage to 1 of your opponent's benched pokemon$/, m => ({ t: 'snipe', n: +m[1], k: 1, bench: true })],
  [/^this attack's damage isn't affected by weakness or resistance, or by any effects on those pokemon$/, () => true],
  [/^\(?don't apply weakness and resistance for benched pokemon\)?$/, () => true],
  [/^put this pokemon and all attached cards into your hand$/, () => ({ t: 'selfToHand' })],
  [/^flip a coin until you get tails$/, (m, R) => { R.untilTails = true; rollPre(R); return true; }],
  [/^flip (\d+) coins$/, (m, R) => { R.flips = +m[1]; rollPre(R); return true; }],
  [/^flip a coin$/, (m, R) => { R.flips = 1; rollPre(R); return { t: 'headsFromPre' }; }],
  [/^this attack does (\d+) (?:more )?damage for each heads$/, (m, R) => { addCalc(R, s => +m[1] * heads(s, R)); return true; }],
  [/^if heads, this attack does (\d+) more damage$/, (m, R) => { addCalc(R, s => +m[1] * Math.min(1, heads(s, R))); return true; }],
  [/^if tails, this attack does nothing$/, (m, R) => { gate(R, s => heads(s, R) > 0); return true; }],
  [/^(?:if heads, )?your opponent's active pokemon is now (asleep|burned|confused|paralyzed|poisoned)(?: and (asleep|burned|confused|paralyzed|poisoned))?$/,
    (m, R, s) => ({ t: 'cond', c: [m[1], m[2]].filter(Boolean), ifHeads: /^if heads/.test(s) })],
  [/^this attack does (\d+) more damage for each benched pokemon(?: \(both yours and your opponent's\))?$/, (m, R) => { addCalc(R, s => +m[1] * (s.players[0].bench.length + s.players[1].bench.length)); return true; }],
  [/^this attack does (\d+) more damage for each energy attached to both active pokemon$/, (m, R) => { addCalc(R, s => +m[1] * s.players.reduce((a, p) => a + (p.active ? p.active.energy.length : 0), 0)); return true; }],
  [/^this attack does (\d+) (?:more )?damage for each of your opponent's pokemon ex in play$/, (m, R) => { addCalc(R, s => +m[1] * mons(oppOf(s)).filter(z => T.gfIsEx(topOf(z))).length); return true; }],
  [/^this attack does (\d+) (?:more )?damage for each (\w+) energy and each (\w+) energy attached to all of your pokemon$/, (m, R) => {
    addCalc(R, s => +m[1] * mons(s.players[s.cur]).reduce((a, z) => a + z.energy.filter(e => [m[2], m[3]].includes(T.gfEType(e))).length, 0)); return true; }],
  [/^this attack does (\d+) (?:more )?damage for each card in your opponent's hand$/, (m, R) => { addCalc(R, s => +m[1] * oppOf(s).hand.length); return true; }],
  [/^this attack does (\d+) (?:more )?damage for each prize card your opponent has taken$/, (m, R) => { addCalc(R, s => +m[1] * (6 - oppOf(s).prizes.length)); return true; }],
  [/^this attack does (\d+) (?:more )?damage for each damage counter on this pokemon$/, (m, R) => { addCalc(R, (s, att) => +m[1] * att.dmg / 10); return true; }],
  [/^if any of your pokemon were knocked out by damage from an attack during your opponent's last turn, this attack does (\d+) more damage$/, (m, R) => { addCalc(R, s => s.players[s.cur].koLastTurn ? +m[1] : 0); return true; }],
  [/^(?:you may )?search your deck for up to (\d+) cards and put them into your hand$/, m => ({ t: 'search', spec: { alts: [[{ n: +m[1], F: { any: true } }]] }, dest: 'hand' })],
  [/^(?:you may )?search your deck for (.+?), reveal (?:it|them), and put (?:it|them) into your hand$/, m => { const spec = T.gfThings(m[1]); return spec ? { t: 'search', spec, dest: 'hand' } : null; }],
  [/^shuffle your deck$/, () => true],
  [/^switch this pokemon with 1 of your benched pokemon$/, () => ({ t: 'switch' })],
  [/^you may switch this pokemon with 1 of your benched pokemon$/, () => ({ t: 'switchOpt' })],
  [/^put (\d+) damage counters on your opponent's (benched )?pokemon in any way you like$/, m => ({ t: 'spread', n: +m[1], bench: !!m[2] })],
  [/^heal (\d+) damage from each of your pokemon$/, m => ({ t: 'healAll', n: +m[1] })],
  [/^heal (\d+) damage from this pokemon$/, m => ({ t: 'healSelf', n: +m[1] })],
  [/^move an energy from this pokemon to 1 of your benched pokemon$/, () => ({ t: 'energyToBench' })],
  [/^put up to (\d+) (.+?) from your discard pile onto your bench$/, m => ({ t: 'reviveBench', n: +m[1], name: m[2] })],
  [/^put an energy attached to this pokemon into your hand$/, () => ({ t: 'energyToHand' })],
  [/^discard your hand and draw (\d+) cards$/, m => ({ t: 'discardDraw', n: +m[1] })],
  [/^(?:you may )?draw (a|\d+) cards?$/, m => ({ t: 'draw', n: m[1] === 'a' ? 1 : +m[1] })],
  [/^switch out your opponent's active pokemon to the bench$/, () => ({ t: 'pushOut' })],
  [/^switch in 1 of your opponent's benched pokemon to the active spot$/, () => ({ t: 'gust' })],
  [/^during your opponent's next turn, they can't play any item cards from their hand$/, () => ({ t: 'itemLock' })],
  [/^you may discard (\d+) (\w+) energy from this pokemon and have this attack do (\d+) more damage$/, (m, R) => { R.calc = (s, a, t, i, d) => d; return { t: 'optBoost', n: +m[1], type: m[2], more: +m[3] }; }],
  [/^you may discard any amount of basic energy from your pokemon$/, (m, R) => { R._bolt = { t: 'bolt', per: 0 }; R.calc = () => 0; return R._bolt; }],
  [/^this attack does (\d+) damage for each card you discarded in this way$/, (m, R) => { if (!R._bolt) return null; R._bolt.per = +m[1]; return true; }],
  [/^place (\d+) damage counters on your opponent's active pokemon for each card in your hand$/, m => ({ t: 'countersActive', per: +m[1] })],
  [/^you may shuffle (\d+) energy attached to this pokemon into your deck$/, m => ({ t: 'pump', n: +m[1] })],
  [/^if you do, this attack also does (\d+) damage to 1 of your opponent's benched pokemon$/, m => ({ t: 'snipe', n: +m[1], k: 1, bench: true, ifPumped: true })],
];
H.atk.push((s, R, a) => { for (const [re, f] of ATK) { const m = s.match(re); if (m) { const r = f(m, R, s, a); if (r) return r; } } return null; });

/* ---------- Steps ---------- */
const self = (s, c) => { const f = I.findMon(s, c.mon); return f && f.m; };
function hit(s, att, target, n, noWR) {
  const isA = s.players.some(p => p.active === target);
  const d = E.damageTo(s, att, { base: n, noWR: noWR || !isA }, target, isA && !noWR);
  target.dmg += d;
  I.log(s, I.hitLine(d, target, !isA));
}
// Draws from card effects log what was drawn (card names for you, a count for your opponent).
function drawFor(s, P, n) { if (n <= 0) return; const got = []; for (let i = 0; i < n && P.deck.length; i++) { const x = P.deck.shift(); P.hand.push(x); got.push(x); } I.logDraw(s, s.players.indexOf(P), got); }
// "Did 60 more damage": an attack's extra damage added after its main hit (discarding Energy for more).
function moreLine(s, d, m) { if (d > 0) I.log(s, d + ' more damage to ' + nm(m)); }
function setCond(m, c, s, owner) {
  if (c === 'poisoned') m.poison = 1; else if (c === 'burned') m.burn = 1;
  else { m.cond = c; if (c === 'paralyzed') m.paraUntil = s.turns[owner] + 1; }
  I.log(s, nm(m) + ' is now ' + c[0].toUpperCase() + c.slice(1));
}
const S = H.step;
S.noop = { run() {} };
S.headsFromPre = { run(s, st, c) { c.heads = (s.atkHeads || 0) > 0; } };
S.bothShuffle = { run(s, st, c, P, O) { [P, O].forEach(Q => { Q.deck = Q.deck.concat(Q.hand.splice(0)); I.reshuffle(s, Q); }); I.log(s, 'Each player shuffled their hand into their deck'); } };
S.bothDraw = { run(s, st, c, P, O) { drawFor(s, P, st.me); drawFor(s, O, st.opp); c.drew += st.me; } };
S.bothShuffleDraw = { run(s, st, c, P, O) { S.bothShuffle.run(s, st, c, P, O); drawFor(s, P, st.n); drawFor(s, O, st.n); c.drew += st.n; } };
S.bothBottom = { run(s, st, c, P, O) { c.bottomed = P.hand.length + O.hand.length > 0; [P, O].forEach(Q => { const h = Q.hand.splice(0); I.reshuffle(s, { deck: h }); Q.deck = Q.deck.concat(h); }); } };
S.bothDrawPrizes = { run(s, st, c, P, O) { if (!c.bottomed) return; drawFor(s, P, P.prizes.length); drawFor(s, O, O.prizes.length); } };
S.oppBottom = { run(s, st, c, P, O) { c.oppBottomed = O.hand.length > 0; const h = O.hand.splice(0); I.reshuffle(s, { deck: h }); O.deck = O.deck.concat(h); I.log(s, "Your opponent's hand went to the bottom of the deck"); } };
S.oppDrawIf = { run(s, st, c, P, O) { if (c.oppBottomed) drawFor(s, O, st.n); } };
S.oppEnergyOff = {
  run(s, st, c, P, O) { const out = []; (st.active ? [O.active] : mons(O)).filter(Boolean).forEach(m => { const seen = new Set(); m.energy.forEach(e => { if (seen.has(e.card.key)) return; seen.add(e.card.key); out.push({ mon: m.id, uid: e.uid }); }); }); return out; },
  answer(s, st, c, v, P, O) { const m = I.findMon(s, v.mon).m, x = I.take(m.energy, v.uid); O.discard.push(x); I.log(s, 'Discarded ' + x.card.name + ' from ' + nm(m)); },
};
S.oppDiscardTo = {
  run(s, st, c, P, O) { if (O.hand.length <= st.n) return; const seen = new Set(), out = []; O.hand.forEach(y => { if (seen.has(y.card)) return; seen.add(y.card); out.push(y.uid); }); return { choices: out, who: 1 - s.cur }; },
  answer(s, st, c, v, P, O) { const x = I.take(O.hand, v); O.discard.push(x); I.log(s, 'Your opponent discarded ' + x.card.name); return S.oppDiscardTo.run(s, st, c, P, O); },
};
S.toolOff = {
  run(s, st, c) { if ((c.tools || 0) >= st.n) return; const out = []; s.players.forEach(Q => mons(Q).forEach(m => { if (m.tool) out.push(m.id); })); return out.length ? out.concat([null]) : null; },
  answer(s, st, c, v) { if (v == null) return; const f = I.findMon(s, v); s.players[f.owner].discard.push(f.m.tool); I.log(s, 'Discarded ' + f.m.tool.card.name); f.m.tool = null; c.tools = (c.tools || 0) + 1; return S.toolOff.run(s, st, c); },
};
// Healing. Steps come from the app's own reader (puzzle/text.js: who is self, target, active, one,
// bench, each or mega, with all and per) or from the patterns above (who any, active with minE).
function healAmt(st, P, m) {
  let n = st.all ? m.dmg : st.n;
  if (st.per) n += st.per.n * P.discard.filter(y => y.card.name.toLowerCase() === st.per.name.toLowerCase()).length;
  return Math.min(m.dmg, n);
}
function healOne(s, st, c, P, m) { const h = healAmt(st, P, m); if (h <= 0) return; m.dmg -= h; c.healed = m.id; I.log(s, 'Healed ' + h + ' from ' + nm(m)); }
S.heal = {
  run(s, st, c, P) {
    if (st.who === 'each') { mons(P).forEach(m => healOne(s, st, c, P, m)); return; }
    if (st.who === 'self' || st.who === 'target' || st.who === 'active') {
      const m = st.who === 'self' ? self(s, c) : st.who === 'active' ? P.active : (c.target != null && (I.findMon(s, c.target) || {}).m);
      if (m && m.energy.length >= (st.minE || 0)) healOne(s, st, c, P, m); return;
    }
    const pool = st.who === 'bench' ? P.bench : st.who === 'mega' ? mons(P).filter(m => T.gfIsMega(topOf(m)) && T.gfIsEx(topOf(m))) : mons(P);
    return pool.filter(m => m && m.dmg > 0 && m.energy.length >= (st.minE || 0)).map(m => m.id);
  },
  answer(s, st, c, v, P) { healOne(s, st, c, P, I.findMon(s, v).m); },
};
S.healTarget = { run(s, st, c) { const f = c.target != null && I.findMon(s, c.target); if (f) f.m.dmg = Math.max(0, f.m.dmg - st.n); } };
S.wally = {
  run(s, st, c, P) { return mons(P).filter(m => m.dmg > 0 && T.gfIsMega(topOf(m)) && T.gfIsEx(topOf(m))).map(m => m.id); },
  answer(s, st, c, v, P) { const m = I.findMon(s, v).m; m.dmg = 0; P.hand.push.apply(P.hand, m.energy.splice(0)); I.log(s, 'Healed all damage from ' + nm(m)); },
};
S.typeBoost = { run(s, st) { s.mods.typeBoost = { type: st.type, n: st.n }; } };
H.dmg.push((s, att, target, isA, d) => { const b = s.mods.typeBoost; return b && isA && d > 0 && T.gfTypes(topOf(att)).includes(b.type) ? d + b.n : d; });
S.snipe = {
  run(s, st, c, P, O) { if (st.ifPumped && !c.pumped) return; const done = c.sniped || []; if (done.length >= st.k) return; const pool = (st.bench ? O.bench : mons(O)).filter(m => !done.includes(m.id)); return pool.map(m => m.id); },
  answer(s, st, c, v) { const att = self(s, c), t = I.findMon(s, v).m; if (att) hit(s, att, t, st.n, st.noWR); c.sniped = (c.sniped || []).concat(v); const more = S.snipe.run(s, st, c, s.players[s.cur], oppOf(s)); if (!more || !more.length) c.sniped = null; return more; },
};
S.selfToHand = { run(s, st, c, P) { const m = self(s, c); if (!m) return; if (P.active === m) { P.active = null; if (P.bench.length) s.promote = (s.promote || []).concat(s.cur); } else P.bench = P.bench.filter(z => z !== m);
  P.hand.push.apply(P.hand, m.stack.concat(m.energy, m.tool ? [m.tool] : [])); I.log(s, nm(m) + ' went back to the hand'); } };
S.cond = { run(s, st, c, P, O) { if (st.ifHeads && !c.heads) return; if (O.active) st.c.forEach(x => setCond(O.active, x, s, 1 - s.cur)); } };
S.switchOpt = { run(s, st, c, P) { return P.bench.length ? P.bench.map(m => m.id).concat([null]) : null; },
  answer(s, st, c, v, P) { if (v == null) return; const i = P.bench.findIndex(m => m.id === v); const m = P.bench[i]; P.bench[i] = P.active; P.active = m; I.log(s, nm(m) + ' is now Active'); } };
S.spread = {
  run(s, st, c, P, O) { const left = st.n - (c.placed || 0); if (left <= 0) { c.placed = 0; return; } const pool = st.bench ? O.bench : mons(O); if (!pool.length) return;
    const out = []; pool.forEach(m => { const toKo = Math.ceil((E.maxHp(s, m) - m.dmg) / 10); new Set([1, left, Math.min(left, toKo)]).forEach(n => { if (n >= 1 && n <= left) out.push({ mon: m.id, n }); }); }); return out; },
  answer(s, st, c, v, P, O) { const m = I.findMon(s, v.mon).m; m.dmg += 10 * v.n; c.placed = (c.placed || 0) + v.n; I.log(s, 'Put ' + v.n + ' damage counters on ' + nm(m)); return S.spread.run(s, st, c, P, O); },
};
S.healAll = { run(s, st, c, P) { mons(P).forEach(m => { m.dmg = Math.max(0, m.dmg - st.n); }); } };
S.healSelf = { run(s, st, c) { const m = self(s, c); if (m) m.dmg = Math.max(0, m.dmg - st.n); } };
S.energyToBench = { run(s, st, c, P) { const m = self(s, c); if (!m || !m.energy.length || !P.bench.length) return; return P.bench.map(b => b.id); },
  answer(s, st, c, v) { const m = self(s, c), b = I.findMon(s, v).m; b.energy.push(m.energy.shift()); } };
S.reviveBench = { run(s, st, c, P) { const left = st.n - (c.revived || 0); if (left <= 0 || P.bench.length >= I.benchMax(s, P)) return; return P.discard.some(y => y.card.name.toLowerCase() === st.name.toLowerCase()) ? [true, false] : null; },
  answer(s, st, c, v, P) { if (!v) return; const i = P.discard.findIndex(y => y.card.name.toLowerCase() === st.name.toLowerCase()); const m = I.newMon(s, P.discard.splice(i, 1)[0], s.cur); P.bench.push(m); c.revived = (c.revived || 0) + 1; return S.reviveBench.run(s, st, c, P); } };
S.energyToHand = { run(s, st, c, P) {
  if (st.ifHealed) { const f = c.healed != null && I.findMon(s, c.healed); if (f && f.m.energy.length) { P.hand.push.apply(P.hand, f.m.energy.splice(0)); I.log(s, 'Put the Energy from ' + nm(f.m) + ' into the hand'); } return; }
  const m = self(s, c); if (m && m.energy.length) P.hand.push(m.energy.shift()); } };
S.discardDraw = { run(s, st, c, P) { P.hand.splice(0).forEach(y => P.discard.push(y)); drawFor(s, P, st.n); } };
S.pushOut = { run(s, st, c, P, O) { if (!O.active || !O.bench.length) return; const old = O.active; O.active = null; O.bench.push(old); s.noPromote = old.id; s.promote = (s.promote || []).concat(1 - s.cur); } };
S.itemLock = { run(s, st, c, P, O) { O.lim.itemLock = s.turns[1 - s.cur] + 1; } };
S.optBoost = { run(s, st, c) { const m = self(s, c); return m && m.energy.filter(e => T.gfEType(e) === st.type).length >= st.n ? [true, false] : null; },
  answer(s, st, c, v, P, O) { if (!v) return; const m = self(s, c); let k = 0; m.energy = m.energy.filter(e => { if (k < st.n && T.gfEType(e) === st.type) { k++; P.discard.push(e); return false; } return true; });
    if (O.active) { const a = E.damageTo(s, m, { base: st.more * 2 }, O.active, true) - E.damageTo(s, m, { base: st.more }, O.active, true); O.active.dmg += a; moreLine(s, a, O.active); } } };
S.bolt = { run(s, st, c, P) { const n = mons(P).reduce((a, z) => a + z.energy.filter(e => T.gfEType(e)).length, 0); return Array.from({ length: n + 1 }, (_, i) => i); },
  answer(s, st, c, v, P, O) { let left = v; const order = P.bench.concat([P.active]).filter(Boolean);
    for (const m of order) m.energy = m.energy.filter(e => { if (left > 0 && T.gfEType(e)) { left--; P.discard.push(e); return false; } return true; });
    const att = self(s, c); if (att && O.active && v) { const d = E.damageTo(s, att, { base: st.per * v }, O.active, true); O.active.dmg += d; I.log(s, I.hitLine(d, O.active)); } } };
S.countersActive = { run(s, st, c, P, O) { if (O.active && P.hand.length) { O.active.dmg += 10 * st.per * P.hand.length; I.log(s, 'Put ' + st.per * P.hand.length + ' damage counters on ' + nm(O.active)); } } };
S.pump = { run(s, st, c) { const m = self(s, c); return m && m.energy.length >= st.n && s.players[s.cur].bench && oppOf(s).bench.length ? [true, false] : null; },
  answer(s, st, c, v, P) { if (!v) return; const m = self(s, c); P.deck = P.deck.concat(m.energy.splice(0, st.n)); I.reshuffle(s, P); c.pumped = true; } };

/* ---------- Rules on the board ---------- */
// Item lock (Budew), Asleep and Paralyzed, Confused.
H.trainerWhy.push((s, x) => x.card.kind === 'item' && s.players[s.cur].lim.itemLock === s.turn ? "Your opponent's attack stops Item cards this turn." : '');
H.attackWhy.push((s, m) => m.cond === 'asleep' ? nm(m) + ' is Asleep.' : m.cond === 'paralyzed' ? nm(m) + ' is Paralyzed.' : '');
H.retreatWhy.push((s, m) => m.cond === 'asleep' ? nm(m) + ' is Asleep.' : m.cond === 'paralyzed' ? nm(m) + ' is Paralyzed.' : '');
H.preAttack.push((s, att) => {
  if (att.cond !== 'confused') return;
  const h = s.rng() < 0.5; I.log(s, 'Confused: ' + (h ? 'heads' : 'tails'));
  if (!h) { att.dmg += 30; I.log(s, 'The attack failed, and ' + nm(att) + ' took 3 damage counters'); return 'fail'; }
});
// Team Rocket's Watchtower: Colorless Pokemon have no Abilities.
H.abilOff.push((s, m) => s.stadium && /^colorless pokemon in play have no abilities$/.test(I.ptext(s.stadium.ref)) && T.gfTypes(topOf(m)).includes('colorless') ? s.stadium.ref.card.name + ' is in play, so Colorless Pokémon have no Abilities.' : '');
// Special Energy that says what it provides.
H.provides.push(ref => {
  const t = I.ptext(ref);
  if (/provides every type of energy but provides only 1 energy at a time/.test(t)) return ['any'];
  const m = t.match(/it provides (\w+?) energy/);
  return m && /^(grass|fire|water|lightning|psychic|fighting|darkness|metal|colorless|dragon)$/.test(m[1]) ? [m[1]] : null;
});
// Telepathic Psychic Energy: on attaching to a Psychic Pokemon, 2 Basic Psychic Pokemon onto the Bench.
H.onEnergy.push((s, x, m) => /when you attach this card from your hand to a psychic pokemon, search your deck for up to 2 basic psychic pokemon and put them onto your bench/.test(I.ptext(x)) && T.gfTypes(topOf(m)).includes('psychic')
  ? [{ t: 'search', spec: T.gfThings('up to 2 basic psychic pokemon'), dest: 'bench' }] : null);

/* ---------- Between turns ---------- */
G.HOOKS_END.push(s => {
  s.atkHeads = null;
  const k = s.cur, P = s.players[k];
  // Ignition Energy and the like: discarded at the end of your turn.
  mons(P).forEach(m => { m.energy = m.energy.filter(e => { if (/discard it at the end of your turn/.test(I.ptext(e))) { P.discard.push(e); return false; } return true; }); });
  // Pokemon Checkup, both Active Pokemon.
  s.players.forEach((Q, j) => {
    const m = Q.active; if (!m) return;
    if (m.poison) { m.dmg += 10; I.log(s, nm(m) + ' took 1 damage counter from Poison'); }
    if (m.burn) { m.dmg += 20; I.log(s, nm(m) + ' took 2 damage counters from Burn'); if (s.rng() < 0.5) { m.burn = 0; I.log(s, nm(m) + ' is no longer Burned'); } }
    if (m.cond === 'asleep' && s.rng() < 0.5) { m.cond = null; I.log(s, nm(m) + ' woke up'); }
    if (m.cond === 'paralyzed' && j === k && s.turns[k] >= (m.paraUntil || 0)) { m.cond = null; I.log(s, nm(m) + ' is no longer Paralyzed'); }
  });
});
/** Special Conditions end when a Pokemon goes to the Bench or evolves (called by game.step). */
function clearConds(s0, s) {
  s.players.forEach((P, k) => {
    P.bench.forEach(m => { if (m.cond || m.poison || m.burn) { m.cond = null; m.poison = 0; m.burn = 0; } });
    const a = P.active, b = s0.players[k].active;
    if (a && b && a.id === b.id && a.stack.length > b.stack.length) { a.cond = null; a.poison = 0; a.burn = 0; }
  });
}
G.HOOKS_STEP = G.HOOKS_STEP || [];
G.HOOKS_STEP.push(clearConds);
/* ---------- Second batch: by how often the rest show up in the meta lists ---------- */
const abilOn = (s, m, k, re) => !I.abilOff(s, m, k) && I.abilTexts(m).some(a => re.test(a.t));
const anyOn = (s, k, re) => mons(s.players[k]).filter(m => abilOn(s, m, k, re));
const ownerOf = (s, m) => s.players.findIndex(P => mons(P).includes(m));
const isName = (m, re) => re.test(nm(m).toLowerCase());
SENT.push(
  [/^switch 1 of your benched (\w+) pokemon, except any (.+?), with your active pokemon$/, m => ({ t: 'benchSwap', type: m[1], not: m[2] })],
  [/^if you do, the new active pokemon is now poisoned$/, () => ({ t: 'poisonActive' })],
  [/^discard up to (\d+) pokemon that don't have a rule box from your hand, and draw (\d+) cards for each card you discarded in this way$/, m => ({ t: 'gwynn', n: +m[1], per: +m[2] })],
  [/^(?:if this pokemon is in the active spot, )?(?:you may )?shuffle it and all attached cards into your deck$/, () => ({ t: 'selfToDeck' })],
  [/^if you have (\w+) in play, (?:you may )?discard a basic (\w+) energy card from your hand in order to use this ability$/, m => ({ t: 'needDiscard', mon: m[1], type: m[2] })],
  [/^move up to (\d+) energy from your benched pokemon to your active pokemon$/, m => ({ t: 'toActive', n: +m[1] })],
  [/^search your deck for up to (\d+) in any combination of (\w+) and (\w+) cards, reveal them, and put them into your hand$/, m => ({ t: 'kinds', n: +m[1], kinds: [m[2], m[3]] })],
  [/^your opponent reveals their hand, and you discard up to (\d+) (\w+) cards you find there$/, m => ({ t: 'eri', n: +m[1], kind: m[2] })],
  [/^discard a pokemon tool or special energy card from 1 of your opponent's pokemon, or discard a stadium in play$/, () => ({ t: 'blowtorch' })],
  [/^look at the top (\d+) cards of your deck and attach any number of basic (\w+) energy cards you find there to your pokemon in any way you like$/, m => ({ t: 'topAttach', n: +m[1], type: m[2] })],
);
ATK.push(
  [/^this pokemon also does (\d+) damage to itself$/, m => ({ t: 'selfDmg', n: +m[1] })],
  [/^if there is no stadium in play, this attack does nothing$/, (m, R) => { gate(R, s => !!s.stadium); return true; }],
  [/^if you don't have (.+?) on your bench, this attack does nothing$/, (m, R) => { gate(R, s => s.players[s.cur].bench.some(z => nm(z).toLowerCase() === m[1])); return true; }],
  [/^this attack's damage isn't affected by (?:weakness|resistance)(?: or (?:weakness|resistance))?$/, (m, R) => { R.noWR = true; return true; }],
  [/^if this pokemon has (any|\d+ or more) damage counters on it, this attack does (\d+) more damage$/, (m, R) => { const k = m[1] === 'any' ? 1 : parseInt(m[1]); addCalc(R, (s, att) => att.dmg / 10 >= k ? +m[2] : 0); return true; }],
  [/^this attack does (\d+) more damage for each energy attached to your opponent's active pokemon$/, (m, R) => { addCalc(R, s => +m[1] * (oppOf(s).active ? oppOf(s).active.energy.length : 0)); return true; }],
  [/^if you have the same number of cards in your hand as your opponent, this attack does (\d+) more damage$/, (m, R) => { addCalc(R, s => s.players[s.cur].hand.length === oppOf(s).hand.length ? +m[1] : 0); return true; }],
  [/^this attack does (\d+) damage for each damage counter on all of your benched (.+?) pokemon$/, (m, R) => { addCalc(R, s => +m[1] * s.players[s.cur].bench.filter(z => nm(z).toLowerCase().startsWith(m[2])).reduce((a, z) => a + z.dmg / 10, 0)); return true; }],
  [/^this attack does (\d+) damage for each (\w+) card that has "(.+?)" in its name in your discard pile$/, (m, R) => { addCalc(R, s => +m[1] * s.players[s.cur].discard.filter(y => y.card.kind === m[2] && y.card.name.toLowerCase().includes(m[3])).length); return true; }],
  [/^if this pokemon has any (.+?) attached, this attack does (\d+) more damage$/, (m, R) => { addCalc(R, (s, att) => att.energy.some(e => e.card.name.toLowerCase() === m[1]) ? +m[2] : 0); return true; }],
  [/^this attack does (\d+) damage to 1 of your opponent's pokemon for each damage counter on that pokemon$/, m => ({ t: 'perCounter', n: +m[1] })],
  [/^(?:you may )?search your deck for up to (\d+) basic pokemon and put them onto your bench$/, m => ({ t: 'search', spec: T.gfThings('up to ' + m[1] + ' basic pokemon'), dest: 'bench' })],
  [/^you may draw cards until you have (\d+) cards in your hand$/, m => ({ t: 'drawTo', n: +m[1] })],
  [/^discard the top (\d+) cards of your opponent's deck$/, m => ({ t: 'mill', n: +m[1] })],
  [/^put a pokemon from your discard pile into your hand$/, () => ({ t: 'pokeBack' })],
  [/^discard all energy from this pokemon, and this attack does (\d+) damage to 1 of your opponent's benched pokemon ex$/, m => ({ t: 'raid', n: +m[1], discard: true })],
  [/^shuffle all energy attached to this pokemon into your deck, and this attack does (\d+) damage to 1 of your opponent's pokemon$/, m => ({ t: 'raid', n: +m[1], shuffle: true, any: true })],
  [/^attach up to (\d+) basic (\w+) energy cards from your discard pile to your benched pokemon in any way you like$/, m => ({ t: 'discardAttach', n: +m[1], type: m[2] })],
);
const pickBench = (P, f) => P.bench.filter(f).map(m => m.id);
S.benchSwap = { run(s, st, c, P) { const o = pickBench(P, m => T.gfTypes(topOf(m)).includes(st.type) && nm(m).toLowerCase() !== st.not); return o.length ? o.concat([null]) : null; },
  answer(s, st, c, v, P) { if (v == null) return; const i = P.bench.findIndex(m => m.id === v), m = P.bench[i]; P.bench[i] = P.active; P.active = m; c.swapped = true; I.log(s, nm(m) + ' is now Active'); } };
S.poisonActive = { run(s, st, c, P) { if (c.swapped && P.active) setCond(P.active, 'poisoned', s, s.cur); } };
S.gwynn = {
  run(s, st, c, P) { if ((c.tossed || 0) >= st.n) return S.gwynn.draw(s, st, c, P); const seen = new Set(), o = [];
    P.hand.forEach(y => { if (y.card.cat === 'pokemon' && !T.gfIsEx(y) && !/ ex$| v$| vstar$| vmax$/i.test(y.card.name) && !seen.has(y.card)) { seen.add(y.card); o.push(y.uid); } });
    return o.length ? o.concat([null]) : S.gwynn.draw(s, st, c, P); },
  draw(s, st, c, P) { drawFor(s, P, st.per * (c.tossed || 0)); c.tossed = 0; },
  answer(s, st, c, v, P) { if (v == null) return S.gwynn.draw(s, st, c, P); P.discard.push(I.take(P.hand, v)); c.tossed = (c.tossed || 0) + 1; return S.gwynn.run(s, st, c, P); },
};
S.selfToDeck = { run(s, st, c, P) { const m = c.mon != null && I.findMon(s, c.mon) ? I.findMon(s, c.mon).m : null; if (!m || P.active !== m) return;
  P.active = null; P.deck = P.deck.concat(m.stack, m.energy, m.tool ? [m.tool] : []); I.reshuffle(s, P); if (P.bench.length) s.promote = (s.promote || []).concat(s.cur); I.log(s, nm(m) + ' was shuffled into the deck'); } };
S.needDiscard = { run(s, st, c, P) { const ok = mons(P).some(m => nm(m).toLowerCase() === st.mon) && P.hand.find(y => T.gfEType(y) === st.type);
  if (!ok) { c.stop = true; s.pending && (s.pending.i = 1e9); return; } P.discard.push(I.take(P.hand, ok.uid)); } };
S.toActive = { run(s, st, c, P) { if ((c.moved || 0) >= st.n || !P.active) return; const o = []; P.bench.forEach(m => m.energy.forEach(e => o.push({ mon: m.id, uid: e.uid }))); return o.length ? o.concat([null]) : null; },
  answer(s, st, c, v, P) { if (v == null) return; const m = I.findMon(s, v.mon).m; P.active.energy.push(I.take(m.energy, v.uid)); c.moved = (c.moved || 0) + 1; return S.toActive.run(s, st, c, P); } };
S.kinds = { run(s, st, c, P) { if ((c.found || 0) >= st.n) { I.reshuffle(s, P); return; } const seen = new Set(), o = [];
    P.deck.forEach(y => { if (st.kinds.includes(y.card.kind) && !seen.has(y.card)) { seen.add(y.card); o.push(y.uid); } }); if (!o.length) { I.reshuffle(s, P); return; } return o.concat([null]); },
  answer(s, st, c, v, P) { if (v == null) { I.reshuffle(s, P); return; } P.hand.push(I.take(P.deck, v)); c.found = (c.found || 0) + 1; return S.kinds.run(s, st, c, P); } };
S.eri = { run(s, st, c, P, O) { if ((c.eri || 0) >= st.n) return; const seen = new Set(), o = []; O.hand.forEach(y => { if (y.card.kind === st.kind && !seen.has(y.card)) { seen.add(y.card); o.push(y.uid); } }); return o.length ? o.concat([null]) : null; },
  answer(s, st, c, v, P, O) { if (v == null) return; const x = I.take(O.hand, v); O.discard.push(x); I.log(s, 'Discarded ' + x.card.name + " from your opponent's hand"); c.eri = (c.eri || 0) + 1; return S.eri.run(s, st, c, P, O); } };
S.blowtorch = { run(s, st, c, P, O) { const o = []; mons(O).forEach(m => { if (m.tool) o.push({ mon: m.id, tool: true }); m.energy.forEach(e => { if (!T.gfEType(e)) o.push({ mon: m.id, uid: e.uid }); }); }); if (s.stadium) o.push({ stadium: true }); return o; },
  answer(s, st, c, v, P, O) { if (v.stadium) { s.players[s.stadium.owner].discard.push(s.stadium.ref); s.stadium = null; return; } const m = I.findMon(s, v.mon).m;
    if (v.tool) { O.discard.push(m.tool); m.tool = null; } else O.discard.push(I.take(m.energy, v.uid)); } };
S.topAttach = { run(s, st, c, P) { if (!c.top) { c.top = P.deck.splice(0, st.n); } const i = c.top.findIndex(y => T.gfEType(y) === st.type);
    if (i < 0 || !mons(P).length) { P.deck = P.deck.concat(c.top); c.top = null; return; } return mons(P).map(m => m.id).concat([null]); },
  answer(s, st, c, v, P) { const i = c.top.findIndex(y => T.gfEType(y) === st.type), x = c.top.splice(i, 1)[0]; if (v == null) { P.deck = P.deck.concat(c.top, [x]); c.top = null; return; }
    I.findMon(s, v).m.energy.push(x); return S.topAttach.run(s, st, c, P); } };
S.selfDmg = { run(s, st, c) { const m = st.who === 'target' ? (c.target != null && (I.findMon(s, c.target) || {}).m) : self(s, c); if (m) m.dmg += st.d != null ? st.d : st.n; } };
// Move up to n damage counters from 1 of your Pokemon to 1 of your opponent's (Munkidori's Adrena-Brain).
S.moveOff = {
  run(s, st, c, P, O) { if (c.moved) return; const out = []; mons(P).filter(m => m.dmg > 0).forEach(f => { const most = Math.min(st.n, f.dmg / 10);
    mons(O).forEach(t => { const toKo = Math.ceil((E.maxHp(s, t) - t.dmg) / 10); new Set([1, most, Math.min(most, toKo)]).forEach(n => { if (n >= 1 && n <= most) out.push({ from: f.id, to: t.id, n }); }); }); });
    return out.length ? out.concat([null]) : null; },
  answer(s, st, c, v) { c.moved = true; if (v == null) return; const f = I.findMon(s, v.from).m, t = I.findMon(s, v.to).m; f.dmg -= 10 * v.n; t.dmg += 10 * v.n; I.log(s, 'Moved ' + v.n + ' damage counters from ' + nm(f) + ' to ' + nm(t)); },
};
S.perCounter = { run(s, st, c, P, O) { return mons(O).filter(m => m.dmg > 0).map(m => m.id); },
  answer(s, st, c, v) { const att = self(s, c), t = I.findMon(s, v).m; if (att) hit(s, att, t, st.n * t.dmg / 10, true); } };
S.drawTo = { run(s, st, c, P) { drawFor(s, P, Math.max(0, st.n - P.hand.length)); } };
S.mill = { run(s, st, c, P, O) { O.discard.push.apply(O.discard, O.deck.splice(0, st.n)); } };
S.pokeBack = { run(s, st, c, P) { const seen = new Set(), o = []; P.discard.forEach(y => { if (y.card.cat === 'pokemon' && !seen.has(y.card)) { seen.add(y.card); o.push(y.uid); } }); return o; },
  answer(s, st, c, v, P) { P.hand.push(I.take(P.discard, v)); } };
S.raid = { run(s, st, c, P, O) { const m = self(s, c); if (m) { if (st.discard) P.discard.push.apply(P.discard, m.energy.splice(0)); if (st.shuffle) { P.deck = P.deck.concat(m.energy.splice(0)); I.reshuffle(s, P); } }
    return (st.any ? mons(O) : O.bench.filter(z => T.gfIsEx(topOf(z)))).map(z => z.id); },
  answer(s, st, c, v) { const att = self(s, c), t = I.findMon(s, v).m; if (att) hit(s, att, t, st.n, !s.players.some(p => p.active === t)); } };
S.discardAttach = { run(s, st, c, P) { if ((c.att || 0) >= st.n || !P.bench.length || !P.discard.some(y => T.gfEType(y) === st.type)) return; return P.bench.map(m => m.id).concat([null]); },
  answer(s, st, c, v, P) { if (v == null) return; const y = P.discard.find(z => T.gfEType(z) === st.type); I.findMon(s, v).m.energy.push(I.take(P.discard, y.uid)); c.att = (c.att || 0) + 1; return S.discardAttach.run(s, st, c, P); } };

// Passive text the full game now applies.
H.passive.push(
  /^whenever any player puts a basic non-darkness pokemon onto their bench during their turn, place 2 damage counters on that pokemon$/,
  /^each player who has any tera pokemon in play can have up to \d+ pokemon on their bench/,
  /^attacks used by the poisoned pokemon this card is attached to do \d+ more damage to your opponent's active pokemon$/,
  /^if the pokemon this card is attached to doesn't have a rule box, the attacks it uses do \d+ more damage to your opponent's active pokemon ex$/,
  /^attacks used by your future pokemon, except any iron crown ex, do \d+ more damage to your opponent's active pokemon$/,
  /^each basic grass energy attached to all of your pokemon provides grassgrass energy/,
  /^blood moon used by this pokemon costs colorless less for each prize card your opponent has taken$/,
  /^if this pokemon has a pokemon tool attached, your opponent can't play any ace spec cards from their hand$/,
  /^pokemon in play lose any ability that requires the pokemon using it to knock out itself$/,
  /^colorless pokemon in play have no abilities$/,
);
H.dmgPre.push((s, att, t, isA, d) => {
  if (!isA || d <= 0) return d;
  const k = s.cur, tool = I.toolOn(s, att), tt = tool ? I.ptext(tool) : '';
  let m;
  if ((m = tt.match(/^attacks used by the poisoned pokemon this card is attached to do (\d+) more damage/)) && att.poison) d += +m[1];
  if ((m = tt.match(/^if the pokemon this card is attached to doesn't have a rule box, the attacks it uses do (\d+) more damage to your opponent's active pokemon ex$/)) && !T.gfIsEx(topOf(att)) && T.gfIsEx(topOf(t))) d += +m[1];
  if (T.gfSubs(topOf(att)).includes('future') && !isName(att, /^iron crown ex$/)) d += 20 * anyOn(s, k, /^attacks used by your future pokemon, except any iron crown ex, do 20 more damage/).length;
  return d;
});
H.cost.push((s, m, a, cost) => {
  const k = ownerOf(s, m); if (k < 0) return cost;
  cost = cost.slice();
  if (a.name === 'Blood Moon' && abilOn(s, m, k, /^blood moon used by this pokemon costs colorless less/)) { let n = 6 - s.players[1 - k].prizes.length; while (n-- > 0) { const i = cost.indexOf('colorless'); if (i < 0) break; cost.splice(i, 1); } }
  if (anyOn(s, k, /^each basic grass energy attached to all of your pokemon provides grassgrass energy/).length) {
    let n = m.energy.filter(e => T.gfEType(e) === 'grass').length;
    for (const want of ['grass', 'colorless']) while (n > 0) { const i = cost.indexOf(want); if (i < 0) break; cost.splice(i, 1); n--; }
  }
  return cost;
});
H.trainerWhy.push((s, x) => T.gfSubs(x).includes('ace spec') && mons(oppOf(s)).some(m => m.tool && abilOn(s, m, 1 - s.cur, /your opponent can't play any ace spec cards/)) ? "Your opponent's Genesect stops ACE SPEC cards." : '');
let inDamp = false;
H.abilOff.push((s, m) => {
  if (inDamp || !I.abilTexts(m).some(a => /knock out this pokemon|this pokemon is knocked out/.test(a.t))) return '';
  inDamp = true;
  try { for (let k = 0; k < 2; k++) if (mons(s.players[k]).some(z => z !== m && abilOn(s, z, k, /lose any ability that requires the pokemon using it to knock out itself/))) return 'Psyduck’s Damp stops this Ability.'; }
  finally { inDamp = false; }
  return '';
});
// Risky Ruins is applied by the engine itself (benchRuins).

/* ---------- Third batch (5turn): the rest of the meta lists ---------- */
const lc = x => String(x || '').toLowerCase();
const nameOf = ref => lc(ref.card.name);
const isTR = ref => /^team rocket's /.test(nameOf(ref));
const typesOf = m => T.gfTypes(topOf(m));
const isTera = m => T.gfSubs(topOf(m)).includes('tera');
const rule = m => T.gfRuleBox(topOf(m));
const stTurn = (s, k) => s.turns[k]; // a player's own turn count
const sneakers = P => P.discard.filter(y => y.card.cat === 'pokemon' && (y.card.abil || []).some(a => a[0] === "Hide 'n' Sneak")).length;
const hopsKO = (s, k, re) => (s.koLog || []).some(e => e.k === k && e.by === 1 - k && e.t === stTurn(s, 1 - k) && (!re || re.test(e.name)));
const energyType = (e, type) => { const p = E.internals && T.gfEType(e) ? [T.gfEType(e)] : null; return p ? p[0] === type : false; };
const special = e => !T.gfEType(e);

// Effects of attacks (and of Abilities, for Hide 'n' Sneak) that a Pokemon is protected from. Damage is not an effect.
function shielded(s, m, byAbility) {
  const k = ownerOf(s, m); if (k < 0 || k === s.cur) return false;
  if (abilOn(s, m, k, /^prevent all effects of your opponent's pokemon's attacks and abilities done to this pokemon/)) return true;
  if (byAbility) return false;
  if (abilOn(s, m, k, /^prevent all effects of attacks used by your opponent's pokemon done to this pokemon/)) return true;
  if (T.gfIsBasic(topOf(m)) && isTR(topOf(m)) && anyOn(s, k, /^prevent all effects of attacks used by your opponent's pokemon done to your basic team rocket's pokemon/).length) return true;
  if (s.players[k].active !== m && anyOn(s, k, /^prevent all damage from and effects of attacks from your opponent's pokemon done to your benched pokemon/).length) return true;
  const att = s.players[s.cur].active;
  if (m.acerola === stTurn(s, s.cur) && att && T.gfIsEx(topOf(att))) return true;
  return false;
}
const inAttack = s => s.mods.atkMon != null && !s.pending ? true : !!(s.pending && s.pending.ctx && s.pending.ctx.endTurn);

/* Sentences in Trainers and Abilities */
SENT.unshift(
  // Damage counters from Abilities and Trainers, here so the protections above apply.
  [/^(?:you may )?put (\d+) damage counters? on 1 of your opponent's pokemon$/, m => ({ t: 'countersOn', n: +m[1] })],
  [/^(?:you may )?move up to (\d+) damage counters? from 1 of your pokemon to 1 of your opponent's pokemon$/, m => ({ t: 'moveOff', n: +m[1] })],
);
SENT.push(
  [/^shuffle the other cards and put them on the bottom of your deck$/, (m, prev) => /^look at the top \d+ cards of your deck and attach any number of basic/.test(prev) ? { t: 'noop' } : null],
  [/^you can use this card only when it is the last card in your hand$/, () => ({ t: 'noop' })],
  [/^during this turn, if your opponent's active pokemon is knocked out by damage from an attack used by your tera pokemon, take 1 more prize card$/, () => ({ t: 'mod', k: 'briar' })],
  [/^during this turn, attacks used by your pokemon that don't have a rule box do (\d+) more damage to your opponent's active pokemon$/, m => ({ t: 'mod', k: 'gladion', v: +m[1] })],
  [/^switch your active team rocket's pokemon with 1 of your benched team rocket's pokemon$/, () => ({ t: 'trSwap' })],
  [/^if you do, switch in 1 of your opponent's benched pokemon to the active spot$/, () => ({ t: 'gust', ifSwitched: true })],
  [/^if heads, switch in 1 of your opponent's benched pokemon to the active spot$/, () => ({ t: 'gust', ifHeads: true })],
  [/^choose up to (\d+) of your (\w+) pokemon$/, m => ({ t: 'pickMine', n: +m[1], type: m[2] })],
  [/^for each of those pokemon, search your deck for a basic (\w+) energy card and attach it to that pokemon$/, m => ({ t: 'janine', type: m[1] })],
  [/^if you attached energy to your active pokemon in this way, it is now poisoned$/, () => ({ t: 'janinePoison' })],
  [/^search your deck for a basic (\w+) energy card and attach it to 1 of your benched (\w+) pokemon$/, m => ({ t: 'searchAttach', type: m[1], to: 'bench', toType: m[2] })],
  [/^if you attached energy to a pokemon in this way, place (\d+) damage counters on that pokemon$/, m => ({ t: 'selfDmg', d: 10 * +m[1], who: 'target', ifAttached: true })],
  [/^if your active pokemon has the festival lead ability, (?:you may )?search your deck for a card and put it into your hand$/, () => ({ t: 'groove' })],
  [/^(?:once during (?:each player's|your) turn, )?(?:(?:that player|you) may )?search (?:their|your) deck for a stage 1 pokemon that evolves from 1 of their basic pokemon and put it onto that pokemon to evolve it$/, () => ({ t: 'grandTree' })],
  [/^if that pokemon was evolved in this way, (?:that player )?may search (?:their|your) deck for a stage 2 pokemon that evolves from that pokemon and put it onto that pokemon to evolve it$/, () => ({ t: 'grandTree2' })],
  [/^that player shuffles their deck$/, () => ({ t: 'noop' })],
  [/^(?:once during (?:each player's|your) turn, )?(?:(?:that player|you) may )?switch their active (\w+) pokemon with 1 of their benched (\w+) pokemon$/, m => ({ t: 'typeSwap', type: m[1] })],
  [/^switch your active pokemon with 1 of your benched pokemon$/, () => ({ t: 'swapOut' })],
  [/^if you do, move an energy from the pokemon you moved to your bench to the new active pokemon$/, () => ({ t: 'zinnia' })],
  [/^if you moved a pokemon ex to your bench in this way, heal (\d+) damage from that pokemon$/, m => ({ t: 'az', n: +m[1] })],
  [/^discard a pokemon tool and a special energy from 1 of your opponent's pokemon$/, () => ({ t: 'ruffian' })],
  [/^discard a special energy from (1 of )?your opponent's (active )?pokemon$/, m => ({ t: 'hammer', active: !!m[2] })],
  [/^count your prize cards, shuffle them, and put them on the bottom of your deck$/, () => ({ t: 'ticket' })],
  [/^take that many cards from the top of your deck and put them face down as your prize cards$/, () => ({ t: 'noop' })],
  [/^choose 1 of your pokemon in play$/, () => ({ t: 'pickOne' })],
  [/^during your opponent's next turn, prevent all damage from and effects of attacks done to that pokemon by your opponent's pokemon ex$/, () => ({ t: 'acerola' })],
  [/^discard your hand and search your deck for (.+), reveal them, and put them into your hand$/, m => { const spec = T.gfThings(m[1]); return spec ? { t: 'larry', spec } : null; }],
  [/^devolve 1 of your evolved (\w+) pokemon by putting any number of evolution cards on it into your hand$/, m => ({ t: 'devolve', type: m[1] })],
  [/^draw a card for each of your opponent's benched pokemon$/, () => ({ t: 'drawOppBench' })],
  [/^reveal the top (\d+) cards of your opponent's deck$/, m => ({ t: 'flute', n: +m[1] })],
  [/^you may choose any number of basic pokemon you find there and put those pokemon onto their bench$/, () => ({ t: 'noop' })],
  [/^your opponent shuffles the other cards back into their deck$/, () => ({ t: 'noop' })],
  // Naveen: the draw is read first (Goldfish), so the discard comes after it and draws back up to 5.
  [/^before drawing cards, you may discard any number of cards from your hand$/, () => ({ t: 'naveen', n: 5 })],
  [/^attach up to (\d+) basic (\w+) energy cards from your discard pile to your (\w+) pokemon in any way you like$/, m => ({ t: 'discardAttach', n: +m[1], type: m[2], toType: m[3], any: true })],
  [/^search your deck for up to (\d+) basic (\w+) energy cards and attach them to your (.+?) pokemon in any way you like$/, m => ({ t: 'punkUp', n: +m[1], type: m[2], who: m[3] })],
  [/^search your deck for (an? .+? card), reveal it, and put it into your hand$/, m => { const spec = T.gfThings(m[1]); if (spec) return null; const w = m[1].replace(/^an? /, '').replace(/ card$/, ''); return { t: 'byName', name: w }; }],
  [/^attach a basic (\w+) energy card from your hand to 1 of your (\w+) pokemon$/, m => ({ t: 'handAttach', type: m[1], toType: m[2] })],
  // Comfey: the look is Goldfish's; the card not taken stays out of the game (the Lost Zone), read here as the discard pile.
  [/^(?:you may )?look at the top (\d+) cards of your deck and put 1 of them into your hand$/, m => (lastLook = { t: 'comfey', n: +m[1], rest: 'bottom' })],
  [/^put the other cards? (in the lost zone|on the bottom of your deck)$/, (m, prev) => { if (!lastLook || !/look at the top \d+ cards of your deck and put 1 of them into your hand$/.test(prev)) return null; lastLook.rest = /lost/.test(m[1]) ? 'lost' : 'bottom'; return { t: 'noop' }; }],
  [/^move a basic (\w+) energy from 1 of your pokemon to another of your pokemon$/, m => ({ t: 'moveType', type: m[1] })],
  [/^search your deck for a card that has no abilities and evolves from 1 of your pokemon, and put it onto that pokemon to evolve it$/, () => ({ t: 'salvatore' })],
  [/^you can use this card on a pokemon you put down when you were setting up to play or on a pokemon that was put into play this turn$/, () => ({ t: 'noop' })],
  [/^search your deck for a basic (\w+) energy card and a basic (\w+) energy card, reveal them, and put them into your hand$/, m => ({ t: 'search', spec: T.gfThings('a basic ' + m[1] + ' energy card and a basic ' + m[2] + ' energy card') || { alts: [[{ n: 1, F: { cat: 'energy', basic: true, type: m[1] } }, { n: 1, F: { cat: 'energy', basic: true, type: m[2] } }]] }, dest: 'hand' })],
);

/* Attacks */
const hereEnergy = (m, type) => m.energy.filter(e => !type || T.gfEType(e) === type).length;
ATK.unshift(
  [/^heal (\d+) damage from 1 of your pokemon$/, m => ({ t: 'heal', n: +m[1], who: 'one' })],
  [/^this pokemon recovers from all special conditions$/, () => ({ t: 'recover' })],
  [/^(?:you may )?search your deck for a card and put it into your hand$/, () => ({ t: 'search', spec: { alts: [[{ n: 1, F: { any: true } }]] }, dest: 'hand' })],
  [/^if this pokemon moved from your bench to the active spot this turn, this attack does (\d+) more damage$/, (m, R) => { addCalc(R, (s, att) => s.startAct && s.startAct[s.cur] !== att.id ? +m[1] : 0); return true; }],
  [/^if this pokemon has at least (\d+) extra energy attached ?,? this attack does (\d+) more damage$/, (m, R, s, a) => { addCalc(R, (st, att) => att.energy.length >= (a.cost || []).length + +m[1] ? +m[2] : 0); return true; }],
  [/^if any of your (?:(.+?)'s )?pokemon were knocked out by damage from an attack during your opponent's last turn, this attack does (\d+) more damage(, and your opponent's active pokemon is now paralyzed)?$/, (m, R) => {
    const re = m[1] ? new RegExp('^' + m[1] + "'s ") : null; addCalc(R, s => (re ? hopsKO(s, s.cur, re) : s.players[s.cur].koLastTurn) ? +m[2] : 0);
    return m[3] ? { t: 'cond', c: ['paralyzed'], ifKO: m[1] || true } : true; }],
  [/^your opponent reveals their hand, and you choose a card you find there and put it on the bottom of their deck$/, () => ({ t: 'handPick', to: 'bottom' })],
  [/^your opponent reveals their hand, and you discard a card you find there$/, () => ({ t: 'handPick', to: 'discard' })],
  [/^your opponent reveals their hand$/, () => true],
  [/^if 1 of your pokemon used (.+?) during your last turn, this attack can't be used$/, (m, R) => { R.notTwice = true; return true; }],
  [/^during your opponent's next turn, prevent all damage from attacks done to this pokemon$/, () => ({ t: 'guard', all: true })],
  [/^during your opponent's next turn, this pokemon takes (\d+) less damage from attacks$/, m => ({ t: 'guard', n: +m[1] })],
  [/^if you go second, you can't use this attack during your first turn$/, (m, R) => { R.notFirstSecond = true; return true; }],
  [/^if you go first, you can use this attack during your first turn$/, (m, R) => { R.firstOK = true; return true; }],
  [/^search your deck for an? (?:(basic )?(\w+) )?energy card and attach it to (this pokemon|1 of your benched pokemon)$/, m => ({ t: 'searchAttach', type: m[2] && m[2] !== 'energy' ? m[2] : '', basic: !!m[1], to: m[3] === 'this pokemon' ? 'self' : 'bench' })],
  [/^if this pokemon has any (\w+) energy attach(?:ed|es), this attack does (\d+) more damage$/, (m, R) => { addCalc(R, (s, att) => hereEnergy(att, m[1]) ? +m[2] : 0); return true; }],
  [/^you may discard up to (\d+) basic energy from your benched pokemon$/, (m, R) => { R._bolt = { t: 'bolt', per: 0, max: +m[1], bench: true }; R.calc = () => 0; return R._bolt; }],
  [/^this attack does (\d+) more damage for each card you discarded in this way$/, (m, R) => { if (!R._bolt) return null; R._bolt.per = +m[1]; R.calc = (s, a, t, i, d) => R.base; return true; }],
  [/^discard any amount of (\w+) energy from among your pokemon, and this attack does (\d+) damage for each card you discarded in this way$/, (m, R) => { R.calc = () => 0; return { t: 'bolt', per: +m[2], type: m[1] }; }],
  [/^discard up to (\d+) energy cards? from this pokemon, and this attack does (\d+) damage for each card you discarded in this way$/, (m, R) => { R.calc = () => 0; return { t: 'bolt', per: +m[2], max: +m[1], self: true, any: true }; }],
  [/^discard (\d+) energy from this pokemon, and this attack does (\d+) damage to 1 of your opponent's pokemon$/, m => ({ t: 'raid', n: +m[2], discardN: +m[1], any: true })],
  [/^you may discard all energy from this pokemon and have this attack do (\d+) more damage$/, (m, R) => { R.calc = (s, a, t, i, d) => R.base; return { t: 'optBoost', all: true, more: +m[1] }; }],
  [/^this attack does (\d+) damage for each energy attached to all of your opponent's pokemon$/, (m, R) => { addCalc(R, s => +m[1] * mons(oppOf(s)).reduce((a, z) => a + z.energy.length, 0)); return true; }],
  [/^this attack does (\d+) more damage for each colorless in your opponent's active pokemon's retreat cost$/, (m, R) => { addCalc(R, s => { const O = oppOf(s); return O.active ? +m[1] * (E.retreatCost(s, O.active, 1 - s.cur) || 0) : 0; }); return true; }],
  [/^this attack does (\d+) more damage for each (.+?) card in your discard pile$/, (m, R) => { addCalc(R, s => +m[1] * s.players[s.cur].discard.filter(y => nameOf(y) === m[2]).length); return true; }],
  [/^if your opponent doesn't have exactly (\d+) or (\d+) prize cards remaining, this attack does nothing$/, (m, R) => { gate(R, s => [+m[1], +m[2]].includes(oppOf(s).prizes.length)); return true; }],
  [/^if your opponent's active pokemon has exactly (\d+) damage counters on it, that pokemon is knocked out$/, m => ({ t: 'exactKO', n: +m[1] })],
  [/^if your opponent's pokemon is knocked out by damage from this attack, take (\d+) more prize cards?$/, (m, R) => { R.prizePlus = +m[1]; return true; }],
  [/^shuffle your hand into your deck$/, () => ({ t: 'handToDeck' })],
  [/^discard a special energy from your opponent's active pokemon$/, () => ({ t: 'hammer', active: true })],
  [/^move an energy from 1 of your opponent's pokemon to another of their pokemon$/, () => ({ t: 'oppMoveE' })],
  [/^(?:you may )?search your deck for up to (\d+) (.+?) and put them onto your bench$/, m => ({ t: 'benchByName', n: +m[1], name: m[2] })],
  [/^search your deck for a card that evolves from this pokemon and put it onto this pokemon to evolve it$/, () => ({ t: 'ascend' })],
  [/^discard a card from your hand$/, () => ({ t: 'tossOwn' })],
  [/^if you do, your opponent discards a card from their hand$/, () => ({ t: 'oppToss' })],
  [/^you may discard any number of (\w+) cards that have "(.+?)" in their name from your hand, and this attack does (\d+) damage for each card you discarded in this way$/, (m, R) => { R.calc = () => 0; return { t: 'feathers', kind: m[1], name: m[2], per: +m[3] }; }],
  [/^choose 1 of your opponent's active pokemon's attacks$/, () => ({ t: 'torment' })],
  [/^choose 1 of your opponent's pokemon (\d+) times$/, m => ({ t: 'salvo', k: +m[1], n: 0 })],
  [/^for each time you chose a pokemon, do (\d+) damage to it$/, (m, R) => { const z = (R.fx || []).find(x => x.t === 'salvo'); if (!z) return null; z.n = +m[1]; return true; }],
  [/^this damage isn't affected by weakness or resistance$/, () => true],
  [/^place (\d+) damage counters? on your opponent's active pokemon$/, m => ({ t: 'countersActive', flat: +m[1] })],
  [/^if you have (\d+) or more pokemon that have the hide 'n' sneak ability in your discard pile, place (\d+) damage counters on each of your opponent's pokemon$/, m => ({ t: 'matcha', k: +m[1], n: +m[2] })],
  [/^if you have (\d+) or more pokemon that have the hide 'n' sneak ability in your discard pile, this attack does (\d+) more damage$/, (m, R) => { addCalc(R, s => sneakers(s.players[s.cur]) >= +m[1] ? +m[2] : 0); return true; }],
  [/^if you have (\d+) or more pokemon that have the hide 'n' sneak ability in your discard pile, choose (\d+) of your opponent's pokemon and quadruple the number of damage counters on each of them$/, m => ({ t: 'quad', k: +m[1], n: +m[2] })],
  [/^choose 1 of your benched (.+?)'s pokemon's attacks and use it as this attack$/, m => ({ t: 'copy', from: 'bench', name: m[1] })],
  [/^discard the top card of your deck, and if that card is a pokemon that doesn't have a rule box, choose 1 of its attacks and use it as this attack$/, () => ({ t: 'copy', from: 'top' })],
  [/^choose 1 of your opponent's active (\w+) pokemon's attacks and use it as this attack$/, m => ({ t: 'copy', from: 'opp', sub: m[1] })],
);
// countersActive also reads a flat number of counters (Poltchageist's Furtive Drop).
S.countersActive = { run(s, st, c, P, O) { if (!O.active || shielded(s, O.active)) return; O.active.dmg += 10 * (st.flat != null ? st.flat : st.per * P.hand.length); } };

/* Steps */
const ids = a => a.map(m => m.id);
const may = o => o.length ? o.concat([null]) : null;
function attachFromDeck(s, P, m, F) { const y = P.deck.find(z => T.gfFit(z, F)); if (!y) return false; m.energy.push(I.take(P.deck, y.uid)); I.log(s, 'Attached ' + y.card.name + ' to ' + nm(m)); return true; }
const basicE = type => ({ cat: 'energy', basic: true, type: type || '' });
S.mod = { run(s, st) { s.mods[st.k] = st.v != null ? st.v : true; } };
S.recover = { run(s, st, c) { const m = self(s, c); if (m) { m.cond = null; m.poison = 0; m.burn = 0; } } };
S.trSwap = { run(s, st, c, P) { if (!P.active || !isTR(topOf(P.active))) return; return pickBench(P, m => isTR(topOf(m))); },
  answer(s, st, c, v, P) { const i = P.bench.findIndex(m => m.id === v), m = P.bench[i]; P.bench[i] = P.active; P.active = m; c.switched = true; I.log(s, nm(m) + ' is now Active'); } };
S.swapOut = { run(s, st, c, P) { return P.active && P.bench.length ? ids(P.bench) : null; },
  answer(s, st, c, v, P) { const i = P.bench.findIndex(m => m.id === v), m = P.bench[i]; c.out = P.active.id; P.bench[i] = P.active; P.active = m; c.switched = true; I.log(s, nm(m) + ' is now Active'); } };
S.zinnia = { run(s, st, c, P) { const f = c.out != null && I.findMon(s, c.out); if (!f || !f.m.energy.length || !P.active) return; P.active.energy.push(f.m.energy.shift()); } };
S.az = { run(s, st, c, P) { const f = c.out != null && I.findMon(s, c.out); if (f && T.gfIsEx(topOf(f.m))) f.m.dmg = Math.max(0, f.m.dmg - st.n); } };
S.typeSwap = { run(s, st, c, P) { if (!P.active || !typesOf(P.active).includes(st.type)) return; return may(pickBench(P, m => typesOf(m).includes(st.type))); },
  answer(s, st, c, v, P) { if (v == null) return; const i = P.bench.findIndex(m => m.id === v), m = P.bench[i]; P.bench[i] = P.active; P.active = m; I.log(s, nm(m) + ' is now Active'); } };
S.pickMine = { run(s, st, c, P) { if ((c.picked || []).length >= st.n) return; return may(mons(P).filter(m => typesOf(m).includes(st.type) && !(c.picked || []).includes(m.id)).map(m => m.id)); },
  answer(s, st, c, v, P) { if (v == null) return; c.picked = (c.picked || []).concat(v); return S.pickMine.run(s, st, c, P); } };
S.janine = { run(s, st, c, P) { (c.picked || []).forEach(id => { const f = I.findMon(s, id); if (f && attachFromDeck(s, P, f.m, basicE(st.type)) && P.active === f.m) c.toActive = true; }); I.reshuffle(s, P); } };
S.janinePoison = { run(s, st, c, P) { if (c.toActive && P.active) setCond(P.active, 'poisoned', s, s.cur); } };
S.searchAttach = { run(s, st, c, P) {
    const F = Object.assign({ cat: 'energy' }, st.type ? { type: st.type } : {}, st.basic || st.toType ? { basic: true } : {});
    if (!P.deck.some(y => y.card.cat === 'energy' && T.gfFit(y, F))) { I.reshuffle(s, P); return; }
    if (st.to === 'self') { const m = self(s, c); if (m) { attachFromDeck(s, P, m, F); c.attached++; c.target = m.id; } I.reshuffle(s, P); return; }
    const o = P.bench.filter(m => !st.toType || typesOf(m).includes(st.toType)).map(m => m.id); if (!o.length) { I.reshuffle(s, P); return; } return o; },
  answer(s, st, c, v, P) { const F = Object.assign({ cat: 'energy' }, st.type ? { type: st.type } : {}, st.basic || st.toType ? { basic: true } : {}); const m = I.findMon(s, v).m;
    if (attachFromDeck(s, P, m, F)) { c.attached++; c.target = m.id; } I.reshuffle(s, P); } };
S.groove = { run(s, st, c, P) { if (!P.active || !abilOn(s, P.active, s.cur, /^if festival grounds is in play, this pokemon may use an attack it has twice/)) return;
    const seen = new Set(), o = []; P.deck.forEach(y => { if (!seen.has(y.card)) { seen.add(y.card); o.push(y.uid); } }); return o; },
  answer(s, st, c, v, P) { P.hand.push(I.take(P.deck, v)); I.reshuffle(s, P); } };
function evoChoices(s, P, test) { const o = []; mons(P).forEach(m => { const seen = new Set(); P.deck.forEach(y => { if (y.card.cat !== 'pokemon' || seen.has(y.card) || lc(y.card.from) !== T.gfKey(topOf(m)) || !test(m, y)) return; seen.add(y.card); o.push({ mon: m.id, uid: y.uid }); }); }); return o; }
function evolveWith(s, P, v) { const m = I.findMon(s, v.mon).m, y = I.take(P.deck, v.uid); m.stack.push(y); m.evoTurn = s.turn; I.log(s, 'Evolved into ' + y.card.name); return m; }
S.grandTree = { run(s, st, c, P) { return may(evoChoices(s, P, (m, y) => m.stack.length === 1 && y.card.stage === 'stage1' && m.turnIn < s.turn && s.turn >= 2)); },
  answer(s, st, c, v, P) { if (v == null) { I.reshuffle(s, P); return; } c.tree = evolveWith(s, P, v).id; } };
S.grandTree2 = { run(s, st, c, P) { if (c.tree == null) return; return may(evoChoices(s, P, (m, y) => m.id === c.tree && y.card.stage === 'stage2')); },
  answer(s, st, c, v, P) { if (v != null) evolveWith(s, P, v); I.reshuffle(s, P); } };
S.salvatore = { run(s, st, c, P) { return evoChoices(s, P, (m, y) => !(y.card.abil || []).length && m.evoTurn !== s.turn); },
  answer(s, st, c, v, P) { evolveWith(s, P, v); I.reshuffle(s, P); } };
S.ascend = { run(s, st, c, P) { return evoChoices(s, P, m => m.id === c.mon); }, answer(s, st, c, v, P) { evolveWith(s, P, v); I.reshuffle(s, P); } };
S.ruffian = { run(s, st, c, P, O) { return mons(O).filter(m => !shielded(s, m) && (m.tool || m.energy.some(special))).map(m => m.id); },
  answer(s, st, c, v, P, O) { const m = I.findMon(s, v).m; if (m.tool) { O.discard.push(m.tool); m.tool = null; } const e = m.energy.find(special); if (e) O.discard.push(I.take(m.energy, e.uid)); I.log(s, 'Discarded from ' + nm(m)); } };
S.hammer = { run(s, st, c, P, O) { const o = []; (st.active ? [O.active] : mons(O)).filter(m => m && !shielded(s, m)).forEach(m => { const e = m.energy.find(special); if (e) o.push({ mon: m.id, uid: e.uid }); }); return o; },
  answer(s, st, c, v, P, O) { const m = I.findMon(s, v.mon).m, x = I.take(m.energy, v.uid); O.discard.push(x); I.log(s, 'Discarded ' + x.card.name + ' from ' + nm(m)); } };
S.ticket = { run(s, st, c, P) { const n = P.prizes.length; const old = P.prizes.splice(0); I.reshuffle(s, { deck: old }); P.deck = P.deck.concat(old); P.prizes = P.deck.splice(0, n); } };
S.pickOne = { run(s, st, c, P) { return ids(mons(P)); }, answer(s, st, c, v) { c.one = v; } };
S.acerola = { run(s, st, c) { const f = c.one != null && I.findMon(s, c.one); if (f) f.m.acerola = stTurn(s, 1 - s.cur) + 1; } };
S.larry = { run(s, st, c, P) { P.discard.push.apply(P.discard, P.hand.splice(0)); st.spec.alts[0].forEach(q => { for (let i = 0; i < q.n; i++) { const y = P.deck.find(z => T.gfFit(z, q.F)); if (y) P.hand.push(I.take(P.deck, y.uid)); } }); I.reshuffle(s, P); } };
S.devolve = { run(s, st, c, P) { return mons(P).filter(m => m.stack.length > 1 && typesOf(m).includes(st.type)).map(m => m.id); },
  answer(s, st, c, v, P) { const m = I.findMon(s, v).m; while (m.stack.length > 1) P.hand.push(m.stack.pop()); m.evoTurn = s.turn; I.log(s, nm(m) + ' was devolved'); } };
S.drawOppBench = { run(s, st, c, P, O) { drawFor(s, P, O.bench.length); } };
S.flute = { run(s, st, c, P, O) { const top = O.deck.splice(0, st.n), room = () => O.bench.length < I.benchMax(s, O);
    top.filter(y => y.card.cat === 'pokemon' && y.card.stage === 'basic').forEach(y => { if (!room()) return; top.splice(top.indexOf(y), 1); O.bench.push(I.newMon(s, y, 1 - s.cur)); I.log(s, 'Put ' + y.card.name + " on your opponent's Bench"); });
    O.deck = O.deck.concat(top); I.reshuffle(s, O); } };
S.naveen = { run(s, st, c, P) { if (c.tossDone) return; const seen = new Set(), o = []; P.hand.forEach(y => { if (!seen.has(y.card)) { seen.add(y.card); o.push(y.uid); } }); return may(o); },
  answer(s, st, c, v, P) { if (v == null) { c.tossDone = true; return; } P.discard.push(I.take(P.hand, v)); return S.naveen.run(s, st, c, P); } };
const naveenAfter = S.naveen.run;
S.naveen.run = (s, st, c, P) => { const r = naveenAfter(s, st, c, P); if (!r) drawFor(s, P, Math.max(0, st.n - P.hand.length)); return r; };
S.discardAttach.run = (s, st, c, P) => { if ((c.att || 0) >= st.n || !P.discard.some(y => T.gfEType(y) === st.type)) return; const to = (st.any ? mons(P) : P.bench).filter(m => !st.toType || typesOf(m).includes(st.toType)); return to.length ? may(ids(to)) : null; };
S.punkUp = { run(s, st, c, P) { if ((c.att || 0) >= st.n || !P.deck.some(y => T.gfEType(y) === st.type)) { I.reshuffle(s, P); return; }
    const to = mons(P).filter(m => nmL(m).startsWith(st.who + "'s ") || (st.who === 'marnie' && /^marnie's /.test(nmL(m)))); return to.length ? may(ids(to)) : (I.reshuffle(s, P), null); },
  answer(s, st, c, v, P) { if (v == null) { I.reshuffle(s, P); return; } attachFromDeck(s, P, I.findMon(s, v).m, basicE(st.type)); c.att = (c.att || 0) + 1; return S.punkUp.run(s, st, c, P); } };
const nmL = m => lc(nm(m));
S.byName = { run(s, st, c, P) { const y = P.deck.find(z => nameOf(z) === st.name || nameOf(z).startsWith(st.name)); if (y) P.hand.push(I.take(P.deck, y.uid)); I.reshuffle(s, P); } };
S.handAttach = { run(s, st, c, P) { if (!P.hand.some(y => T.gfEType(y) === st.type)) return; return mons(P).filter(m => typesOf(m).includes(st.toType)).map(m => m.id); },
  answer(s, st, c, v, P) { const y = P.hand.find(z => T.gfEType(z) === st.type); I.findMon(s, v).m.energy.push(I.take(P.hand, y.uid)); } };
// Look at the top cards and put 1 into your hand; the rest go to the bottom of the deck, or out of the game (the Lost Zone).
S.comfey = { run(s, st, c, P) { c.top = P.deck.splice(0, st.n); if (!c.top.length) return; return c.top.map(y => y.uid); },
  answer(s, st, c, v, P) { P.hand.push(I.take(c.top, v)); if (st.rest === 'bottom') P.deck = P.deck.concat(c.top); else P.lost = (P.lost || []).concat(c.top); c.top = null; } };
S.moveType = { run(s, st, c, P) { const o = []; mons(P).forEach(a => { const e = a.energy.find(x => T.gfEType(x) === st.type); if (e) mons(P).filter(b => b !== a).forEach(b => o.push({ from: a.id, uid: e.uid, to: b.id })); }); return o; },
  answer(s, st, c, v) { const a = I.findMon(s, v.from).m, b = I.findMon(s, v.to).m; b.energy.push(I.take(a.energy, v.uid)); I.log(s, 'Moved Energy from ' + nm(a) + ' to ' + nm(b)); } };
S.countersOn = { run(s, st, c, P, O) { return mons(O).filter(m => !shielded(s, m, true)).map(m => m.id); },
  answer(s, st, c, v) { const m = I.findMon(s, v).m; m.dmg += 10 * st.n; I.log(s, 'Put ' + st.n + ' damage counters on ' + nm(m)); } };
const moveOffRun = S.moveOff.run;
S.moveOff.run = (s, st, c, P, O) => { if (s.players.some((Q, k) => anyOn(s, k, /^damage counters on each pokemon can't be moved to other pokemon/).length)) return; const r = moveOffRun(s, st, c, P, O); return r && r.filter(v => v == null || !shielded(s, I.findMon(s, v.to).m, true)); };
const condRun = S.cond.run;
S.cond.run = (s, st, c, P, O) => { if (st.ifKO && !(st.ifKO === true ? P.koLastTurn : hopsKO(s, s.cur, new RegExp('^' + st.ifKO + "'s ")))) return; if (O.active && shielded(s, O.active)) return; return condRun(s, st, c, P, O); };
S.handPick = { run(s, st, c, P, O) { const seen = new Set(), o = []; O.hand.forEach(y => { if (!seen.has(y.card)) { seen.add(y.card); o.push(y.uid); } }); return o; },
  answer(s, st, c, v, P, O) { const x = I.take(O.hand, v); if (st.to === 'bottom') O.deck.push(x); else O.discard.push(x); I.log(s, (st.to === 'bottom' ? 'Put ' : 'Discarded ') + x.card.name + " from your opponent's hand" + (st.to === 'bottom' ? " on the bottom of your opponent's deck" : '')); } };
S.guard = { run(s, st, c) { const m = self(s, c); if (m) m.guard = { t: stTurn(s, 1 - s.cur) + 1, all: !!st.all, n: st.n || 0 }; } };
S.exactKO = { run(s, st, c, P, O) { if (O.active && O.active.dmg === 10 * st.n && !shielded(s, O.active)) { O.active.dmg = E.maxHp(s, O.active); I.log(s, nm(O.active) + ' is Knocked Out by the effect'); } } };
S.handToDeck = { run(s, st, c, P) { P.deck = P.deck.concat(P.hand.splice(0)); I.reshuffle(s, P); } };
S.oppMoveE = { run(s, st, c, P, O) { const o = []; mons(O).filter(m => !shielded(s, m)).forEach(a => { const seen = new Set(); a.energy.forEach(e => { if (seen.has(e.card.key)) return; seen.add(e.card.key); mons(O).filter(b => b !== a).forEach(b => o.push({ from: a.id, uid: e.uid, to: b.id })); }); }); return o; },
  answer(s, st, c, v) { const a = I.findMon(s, v.from).m, b = I.findMon(s, v.to).m; b.energy.push(I.take(a.energy, v.uid)); I.log(s, "Moved an Energy on your opponent's side"); } };
S.benchByName = { run(s, st, c, P) { const want = lc(st.name).replace(/s$/, ''); let k = 0;
    while (k < st.n && P.bench.length < I.benchMax(s, P)) { const y = P.deck.find(z => nameOf(z) === want || nameOf(z) === lc(st.name)); if (!y) break; P.bench.push(I.newMon(s, I.take(P.deck, y.uid), s.cur)); k++; } I.reshuffle(s, P); } };
S.tossOwn = { run(s, st, c, P) { const seen = new Set(), o = []; P.hand.forEach(y => { if (!seen.has(y.card)) { seen.add(y.card); o.push(y.uid); } }); return o; },
  answer(s, st, c, v, P) { P.discard.push(I.take(P.hand, v)); c.tossed = 1; } };
S.oppToss = { run(s, st, c, P, O) { if (!c.tossed || !O.hand.length) return; const seen = new Set(), o = []; O.hand.forEach(y => { if (!seen.has(y.card)) { seen.add(y.card); o.push(y.uid); } }); return { choices: o, who: 1 - s.cur }; },
  answer(s, st, c, v, P, O) { O.discard.push(I.take(O.hand, v)); } };
S.feathers = { run(s, st, c, P) { const o = P.hand.filter(y => y.card.kind === st.kind && nameOf(y).includes(st.name)); return Array.from({ length: o.length + 1 }, (_, i) => i); },
  answer(s, st, c, v, P, O) { for (let i = 0; i < v; i++) { const y = P.hand.find(z => z.card.kind === st.kind && nameOf(z).includes(st.name)); P.discard.push(I.take(P.hand, y.uid)); }
    const att = self(s, c); if (att && O.active && v) hit(s, att, O.active, st.per * v); } };
S.torment = { run(s, st, c, P, O) { return O.active && !shielded(s, O.active) ? topOf(O.active).card.attacks.map(a => a.name) : null; },
  answer(s, st, c, v, P, O) { O.active.torment = { name: v, t: stTurn(s, 1 - s.cur) + 1 }; I.log(s, nm(O.active) + " can't use " + v + ' next turn'); } };
S.salvo = { run(s, st, c, P, O) { if ((c.salvo || 0) >= st.k) return; return ids(mons(O)); },
  answer(s, st, c, v, P, O) { const att = self(s, c); if (att) hit(s, att, I.findMon(s, v).m, st.n, true); c.salvo = (c.salvo || 0) + 1; return S.salvo.run(s, st, c, P, O); } };
S.matcha = { run(s, st, c, P, O) { if (sneakers(P) < st.k) return; mons(O).filter(m => !shielded(s, m)).forEach(m => { m.dmg += 10 * st.n; }); } };
S.quad = { run(s, st, c, P, O) { if (sneakers(P) < st.k || (c.quad || 0) >= st.n) return; return mons(O).filter(m => m.dmg > 0 && !shielded(s, m) && !(c.quadDone || []).includes(m.id)).map(m => m.id); },
  answer(s, st, c, v, P, O) { const m = I.findMon(s, v).m; m.dmg *= 4; c.quad = (c.quad || 0) + 1; c.quadDone = (c.quadDone || []).concat(v); return S.quad.run(s, st, c, P, O); } };
// Using another card's attack: its damage now, then its effects (its Energy cost is not paid again).
function copyChoices(s, st, c, P, O) {
  if (st.from === 'bench') return P.bench.filter(m => nmL(m).startsWith(st.name + "'s ")).reduce((o, m) => o.concat(topOf(m).card.attacks.map((a, i) => ({ mon: m.id, i }))), []);
  if (st.from === 'opp') return O.active && T.gfSubs(topOf(O.active)).includes(st.sub) ? topOf(O.active).card.attacks.map((a, i) => ({ opp: O.active.id, i })) : [];
  if (c.topCard == null) { const y = P.deck.shift(); if (!y) return []; P.discard.push(y); c.topCard = y.uid; I.log(s, 'Discarded ' + y.card.name + ' from the top of the deck');
    if (y.card.cat !== 'pokemon' || /ex$/i.test(y.card.name) || T.gfRuleBox(y)) return []; }
  const y = P.discard.find(z => z.uid === c.topCard); return y && y.card.cat === 'pokemon' && !T.gfRuleBox(y) ? y.card.attacks.map((a, i) => ({ top: y.uid, i })) : [];
}
S.copy = { run(s, st, c, P, O) { if (c.copied) return; const o = copyChoices(s, st, c, P, O); return o.length ? o : null; },
  answer(s, st, c, v, P, O) { c.copied = true;
    const src = v.mon != null ? topOf(I.findMon(s, v.mon).m) : v.opp != null ? topOf(I.findMon(s, v.opp).m) : P.discard.find(z => z.uid === v.top);
    const a = src.card.attacks[v.i], R = E.readAttack(a), att = self(s, c); I.log(s, 'Used ' + a.name);
    if (!R || !att) return; if (R.pre) R.pre(s, att);
    if (O.active) { const d = E.damageTo(s, att, R, O.active, true); O.active.dmg += d; I.log(s, I.hitLine(d, O.active)); }
    if (R.bench && R.bench.who === 'each') O.bench.forEach(m => { const d = E.damageTo(s, att, { base: R.bench.n }, m, false); m.dmg += d; I.log(s, I.hitLine(d, m, true)); });
    if (R.fx && R.fx.length) { const Rn = s.pending; Rn.steps = Rn.steps.slice(0, Rn.i + 1).concat(R.fx, Rn.steps.slice(Rn.i + 1)); } } };
const raidRun = S.raid.run;
S.raid = Object.assign({}, S.raid, { run(s, st, c, P, O) { const m = self(s, c); if (m && st.discardN && !c.paid) { c.paid = true; P.discard.push.apply(P.discard, m.energy.splice(0, st.discardN)); } return raidRun(s, st, c, P, O); } });
// optBoost with "all": discard every Energy from this Pokemon for the extra damage.
const optRun = S.optBoost.run, optAns = S.optBoost.answer;
S.optBoost = { run(s, st, c, P, O) { if (!st.all) return optRun(s, st, c, P, O); const m = self(s, c); return m && m.energy.length ? [true, false] : null; },
  answer(s, st, c, v, P, O) { if (!st.all) return optAns(s, st, c, v, P, O); if (!v) return; const m = self(s, c); P.discard.push.apply(P.discard, m.energy.splice(0));
    if (O.active) { const a = E.damageTo(s, m, { base: st.more * 2 }, O.active, true) - E.damageTo(s, m, { base: st.more }, O.active, true); O.active.dmg += a; moreLine(s, a, O.active); } } };
// Bolt: discard Energy for damage, from the Bench only, of one type, from this Pokemon only, or up to a number.
S.bolt = { run(s, st, c, P) { const pool = st.self ? [self(s, c)].filter(Boolean) : st.bench ? P.bench : mons(P);
    const n = pool.reduce((a, z) => a + z.energy.filter(e => st.any ? true : st.type ? T.gfEType(e) === st.type : T.gfEType(e)).length, 0); return Array.from({ length: Math.min(n, st.max || 99) + 1 }, (_, i) => i); },
  answer(s, st, c, v, P, O) { let left = v; const pool = st.self ? [self(s, c)].filter(Boolean) : st.bench ? P.bench.slice() : P.bench.concat([P.active]).filter(Boolean);
    for (const m of pool) m.energy = m.energy.filter(e => { if (left > 0 && (st.any || (st.type ? T.gfEType(e) === st.type : T.gfEType(e)))) { left--; P.discard.push(e); return false; } return true; });
    const att = self(s, c); if (att && O.active && v) { const d = E.damageTo(s, att, { base: st.per * v }, O.active, true); O.active.dmg += d; I.log(s, I.hitLine(d, O.active)); } } };

/* Rules on the board */
H.passive.push(
  /^each player's grass pokemon can evolve into grass pokemon during the turn they play those pokemon, except during their first turn$/,
  /^search your deck for a basic \w+ energy card and a basic \w+ energy card, reveal them, and put them into your hand/, // Adventure Lantern: read as "when you attach this card"
  /^this pokemon can use the attacks of any of your benched pokemon$/,
  /^each of your evolved pokemon can use any attack from its previous evolutions$/,
  /^if festival grounds is in play, this pokemon may use an attack it has twice/,
  /^if your opponent has any cards in their discard pile that have "(\w+)" in the name, this pokemon can use the (\w+) attack for colorless$/,
  /^prevent all effects of attacks used by your opponent's pokemon done to your basic team rocket's pokemon$/,
  /^prevent all effects of your opponent's pokemon's attacks and abilities done to this pokemon$/,
  /^prevent all effects of attacks used by your opponent's pokemon done to this pokemon$/,
  /^prevent all damage from and effects of attacks from your opponent's pokemon done to your benched pokemon$/,
  /^as long as this pokemon is in the active spot, put (\d+) more damage counters on your opponent's poisoned pokemon during pokemon checkup$/,
  /^attacks used by your (\w+)'s pokemon do (\d+) more damage to your opponent's active pokemon/,
  /^the (\w+)'s pokemon this card is attached to gets \+(\d+) hp$/,
  /^if the pokemon this card is attached to is in the active spot and is damaged by an attack from your opponent's pokemon/,
  /^during pokemon checkup, put 1 damage counter on each pokemon that has an ability/,
  /^metal pokemon take (\d+) less damage from attacks from the opponent's pokemon$/,
  /^damage counters on each pokemon can't be moved to other pokemon$/,
  /^this pokemon can evolve into any pokemon ex that evolves from (\w+) if you play it from your hand onto this pokemon$/,
  /^if the pokemon this card is attached to is damaged by an attack from your opponent's (\w+) pokemon, it takes (\d+) less damage/,
  /^attacks used by the (\w+)'s pokemon this card is attached to cost colorless less and do (\d+) more damage/,
  /^attacks used by (\w+)'s pokemon do (\d+) more damage to the opponent's active pokemon$/,
  /^if this pokemon has any (\w+) energy attached, it gets \+(\d+) hp, and the attacks it uses do (\d+) more damage/,
  /^if this pokemon is in the active spot and is knocked out by damage from an attack from your opponent's pokemon, put (\d+) damage counters on the attacking pokemon$/,
  /^your opponent's active pokemon's retreat cost is colorless more$/,
  /^this pokemon can't use attacks unless you have (\d+) or more cards in your hand$/,
  /^this pokemon takes (\d+) less damage from attacks$/,
  /^attacks used by each tera pokemon in play cost colorless more$/,
);
// Team Rocket's Energy: 2 Energy, each Psychic or Darkness, on a Team Rocket's Pokemon only.
H.provides.push(ref => /provides 2 in any combination of psychic energy and darkness energy/.test(I.ptext(ref)) ? ['psychic|darkness', 'psychic|darkness'] : null);
H.onEnergy.push((s, x, m) => { if (!/can only be attached to a team rocket's pokemon/.test(I.ptext(x)) || isTR(topOf(m))) return null; const P = s.players[s.cur]; P.discard.push(I.take(m.energy, x.uid)); I.log(s, x.card.name + ' was discarded'); return null; });
// Adventure Lantern: when attached, the two Energy into the hand.
H.onEnergy.length; // (Tools have no attach hook in the engine; see G.HOOKS_STEP below.)
G.HOOKS_STEP.push((s0, s) => { const P = s.players[s.cur], P0 = s0.players[s.cur];
  mons(P).forEach(m => { if (!m.tool || !/^search your deck for a basic (\w+) energy card and a basic (\w+) energy card/.test(I.ptext(m.tool))) return;
    const m0 = mons(P0).find(z => z.id === m.id); if (m0 && m0.tool && m0.tool.uid === m.tool.uid) return;
    const r = I.ptext(m.tool).match(/a basic (\w+) energy card and a basic (\w+) energy card/); [r[1], r[2]].forEach(t => { const y = P.deck.find(z => T.gfEType(z) === t); if (y) P.hand.push(I.take(P.deck, y.uid)); }); I.reshuffle(s, P); }); });
G.HOOKS_START.push(s => { s.startAct = s.players.map(P => P.active && P.active.id); });

const trName = (m, w) => nmL(m).startsWith(w + "'s ");
H.dmgPre.push((s, att, t, isA, d) => {
  if (!isA || d <= 0) return d;
  const k = s.cur, tool = I.toolOn(s, att), tt = tool ? I.ptext(tool) : ''; let r;
  mons(s.players[k]).forEach(z => { if (I.abilOff(s, z, k)) return; I.abilTexts(z).forEach(a => { const q = a.t.match(/^attacks used by your (\w+)'s pokemon do (\d+) more damage to your opponent's active pokemon/); if (q && !/doesn't stack/.test(a.t) && trName(att, q[1])) d += +q[2]; }); });
  ['hop'].forEach(w => { if (trName(att, w) && anyOn(s, k, /^attacks used by your hop's pokemon do 30 more damage to your opponent's active pokemon.*doesn't stack/).length) d += 30; });
  if ((r = tt.match(/^attacks used by the (\w+)'s pokemon this card is attached to cost colorless less and do (\d+) more damage/)) && trName(att, r[1])) d += +r[2];
  if (s.stadium && (r = I.ptext(s.stadium.ref).match(/^attacks used by (\w+)'s pokemon do (\d+) more damage to the opponent's active pokemon$/)) && trName(att, r[1])) d += +r[2];
  if (abilOn(s, att, k, /^if this pokemon has any darkness energy attached, it gets \+100 hp, and the attacks it uses do 100 more damage/) && hereEnergy(att, 'darkness')) d += 100;
  if (s.mods.gladion && !rule(att)) d += s.mods.gladion;
  return d;
});
H.dmg.push((s, att, t, isA, d) => {
  if (d <= 0) return d;
  const k = 1 - s.cur, tool = I.toolOn(s, t), tt = tool ? I.ptext(tool) : ''; let r;
  if (!isA && s.players[k].bench.includes(t) && anyOn(s, k, /^prevent all damage from and effects of attacks from your opponent's pokemon done to your benched pokemon/).length) return 0;
  if (t.guard && t.guard.t === stTurn(s, s.cur)) { if (t.guard.all) return 0; d -= t.guard.n; }
  if (t.acerola === stTurn(s, s.cur) && T.gfIsEx(topOf(att))) return 0;
  if (s.stadium && (r = I.ptext(s.stadium.ref).match(/^metal pokemon take (\d+) less damage from attacks from the opponent's pokemon$/)) && typesOf(t).includes('metal')) d -= +r[1];
  if (t.ironDef === stTurn(s, s.cur) && typesOf(t).includes('metal')) d -= 30;
  if ((r = tt.match(/^if the pokemon this card is attached to is damaged by an attack from your opponent's (\w+) pokemon, it takes (\d+) less damage/)) && typesOf(att).includes(r[1])) d -= +r[2];
  if (abilOn(s, t, k, /^this pokemon takes (\d+) less damage from attacks$/)) d -= +I.abilTexts(t).map(a => a.t.match(/^this pokemon takes (\d+) less damage from attacks$/)).find(Boolean)[1];
  return Math.max(0, d);
});
// Iron Defender: during your opponent's next turn, your Metal Pokemon take 30 less.
SENT.push([/^during your opponent's next turn, all of your metal pokemon take (\d+) less damage from attacks from your opponent's pokemon$/, () => ({ t: 'ironDef' })]);
S.ironDef = { run(s, st, c, P) { s.players[s.cur].ironDef = stTurn(s, 1 - s.cur) + 1; mons(P).forEach(m => { m.ironDef = s.players[s.cur].ironDef; }); } };
H.hp.push((s, m, hp) => {
  const tool = I.toolOn(s, m), tt = tool ? I.ptext(tool) : ''; let r;
  if ((r = tt.match(/^the (\w+)'s pokemon this card is attached to gets \+(\d+) hp$/)) && trName(m, r[1])) hp += +r[2];
  const k = ownerOf(s, m);
  if (k >= 0 && abilOn(s, m, k, /^if this pokemon has any darkness energy attached, it gets \+100 hp/) && hereEnergy(m, 'darkness')) hp += 100;
  return hp;
});
H.cost.push((s, m, a, cost) => {
  const k = ownerOf(s, m); if (k < 0) return cost;
  const tool = I.toolOn(s, m), tt = tool ? I.ptext(tool) : ''; let r;
  const pb = I.abilTexts(m).map(x => !I.abilOff(s, m, k) && x.t.match(/^if your opponent has any cards in their discard pile that have "(\w+)" in the name, this pokemon can use the (\w+) attack for colorless$/)).find(Boolean);
  if (pb && lc(a.name) === pb[2] && s.players[1 - k].discard.some(y => nameOf(y).includes(pb[1]))) return ['colorless'];
  if ((r = tt.match(/^attacks used by the (\w+)'s pokemon this card is attached to cost colorless less/)) && trName(m, r[1])) { const i = cost.lastIndexOf('colorless'); if (i >= 0) { cost = cost.slice(); cost.splice(i, 1); } }
  if (s.stadium && /^attacks used by each tera pokemon in play cost colorless more$/.test(I.ptext(s.stadium.ref)) && isTera(m)) cost = cost.concat(['colorless']);
  return cost;
});
H.trainerWhy.push((s, x) => /^you can use this card only when it is the last card in your hand/.test(I.ptext(x)) && s.players[s.cur].hand.length !== 1 ? 'It has to be the last card in your hand.' : '');
H.attackWhy.push((s, m, a) => {
  const k = s.cur, R = E.readAttack(a) || {};
  const g = I.abilTexts(m).map(x => !I.abilOff(s, m, k) && x.t.match(/^this pokemon can't use attacks unless you have (\d+) or more cards in your hand$/)).find(Boolean);
  if (g && s.players[k].hand.length < +g[1]) return 'Needs ' + g[1] + ' or more cards in your hand.';
  if (R.notFirstSecond && s.turn === 1 && !s.first) return "Can't be used on your first turn when you go second.";
  if (R.notTwice && s.players[k].lastAtk && s.players[k].lastAtk.name === a.name && s.players[k].lastAtk.t === s.turn - 1) return 'It was used last turn.';
  if (m.torment && m.torment.name === a.name && m.torment.t === stTurn(s, k)) return "Your opponent's attack stops this attack this turn.";
  return '';
});
H.preAttack.push((s, att, a) => { const P = s.players[s.cur], O = oppOf(s); P.lastAtk = { name: a.name, t: s.turn }; s.mods.atkMon = att.id; s.mods.atkTarget = O.active && O.active.id; s.mods.prizePlus = (E.readAttack(a) || {}).prizePlus || 0; });
H.retreat.push((s, m, k, n) => s.players[k].active === m && anyOn(s, 1 - k, /^your opponent's active pokemon's retreat cost is colorless more$/).length ? n + anyOn(s, 1 - k, /^your opponent's active pokemon's retreat cost is colorless more$/).length : n);
H.prize.push((s, m, p) => {
  if (m.id !== s.mods.atkTarget || ownerOf(s, m) === s.cur) return p;
  const att = s.players[s.cur].active; if (!att || att.id !== s.mods.atkMon) return p;
  if (s.mods.briar && isTera(att)) p += 1;
  return p + (s.mods.prizePlus || 0);
});
H.ko.push((s, m, k, wasActive) => {
  s.koLog = (s.koLog || []).slice(-11).concat({ k, by: s.cur, t: stTurn(s, s.cur), name: nmL(m) });
  if (k === s.cur || !wasActive || s.mods.atkMon == null) return;
  const r = I.abilTexts(m).map(x => x.t.match(/^if this pokemon is in the active spot and is knocked out by damage from an attack from your opponent's pokemon, put (\d+) damage counters on the attacking pokemon$/)).find(Boolean);
  const att = s.players[s.cur].active; if (r && att && att.id === s.mods.atkMon) { att.dmg += 10 * +r[1]; I.log(s, nm(att) + ' took ' + r[1] + ' damage counters'); }
});
H.need.push((s, need) => {
  let m;
  if ((m = need.match(/^any of your (.+?)'s pokemon were knocked out during your opponent's last turn$/))) return hopsKO(s, s.cur, new RegExp('^' + m[1] + "'s ")) ? '' : 'None of your ' + m[1].replace(/\b\w/g, c => c.toUpperCase()) + "'s Pokémon were Knocked Out last turn.";
  if (/^(?:when )?it is the last card in your hand$/.test(need)) return s.players[s.cur].hand.length === 1 ? '' : 'It has to be the last card in your hand.';
  return null;
});
H.evoNow.push((s, m, x) => !!s.stadium && /^each player's grass pokemon can evolve into grass pokemon during the turn they play those pokemon/.test(I.ptext(s.stadium.ref))
  && typesOf(m).includes('grass') && (x.card.types || []).includes('grass') && m.evoTurn !== s.turn - 1000);
H.evoFrom.push((s, m, x) => { const k = ownerOf(s, m); const r = I.abilTexts(m).map(a => !I.abilOff(s, m, k) && a.t.match(/^this pokemon can evolve into any pokemon ex that evolves from (\w+) if you play it/)).find(Boolean);
  return !!r && lc(x.card.from) === r[1] && /ex$/i.test(x.card.name); });
H.attacks.push((s, m) => {
  const k = ownerOf(s, m), out = [];
  if (abilOn(s, m, k, /^this pokemon can use the attacks of any of your benched pokemon$/)) s.players[k].bench.forEach(b => topOf(b).card.attacks.forEach((a, i) => out.push({ a, i, via: { mon: b.id } })));
  if (m.stack.length > 1 && anyOn(s, k, /^each of your evolved pokemon can use any attack from its previous evolutions$/).length) m.stack.slice(0, -1).forEach((y, j) => (y.card.attacks || []).forEach((a, i) => out.push({ a, i, via: { stack: j } })));
  return out;
});
H.twice.push((s, att) => !!s.stadium && /^festival grounds$/i.test(s.stadium.ref.card.name) && abilOn(s, att, s.cur, /^if festival grounds is in play, this pokemon may use an attack it has twice/));
H.hit.push((s, att, t, d) => {
  if (d <= 0) return; const k = 1 - s.cur, tool = I.toolOn(s, t), tt = tool ? I.ptext(tool) : '', P = s.players[s.cur]; let r;
  if ((r = tt.match(/^if the pokemon this card is attached to is damaged by an attack from your opponent's (\w+) pokemon, it takes \d+ less damage/)) && typesOf(att).includes(r[1]) && /discard this card/.test(tt)) { s.players[k].discard.push(t.tool); t.tool = null; }
  if (/^if the pokemon this card is attached to is in the active spot and is damaged by an attack from your opponent's pokemon/.test(tt) && att.energy.length && P.bench.length) {
    const to = P.bench.slice().sort((a, b) => a.energy.length - b.energy.length)[0]; to.energy.push(att.energy.shift()); I.log(s, 'Handheld Fan moved an Energy to ' + nm(to)); }
});
// Pokemon Checkup: Pecharunt's Toxic Subjugation, Froslass's Freezing Shroud.
G.HOOKS_END.push(s => {
  s.players.forEach((Q, j) => { const m = Q.active; if (!m || !m.poison) return; const o = s.players[1 - j].active;
    if (o && abilOn(s, o, 1 - j, /^as long as this pokemon is in the active spot, put 5 more damage counters on your opponent's poisoned pokemon/)) { m.dmg += 50; I.log(s, nm(m) + ' took 5 more damage counters from Poison'); } });
  const fro = [0, 1].reduce((a, k) => a + anyOn(s, k, /^during pokemon checkup, put 1 damage counter on each pokemon that has an ability/).length, 0);
  if (fro) s.players.forEach((Q, j) => mons(Q).forEach(m => { if (!/^froslass/.test(nmL(m)) && I.abilTexts(m).length && !shielded(s, m, true)) m.dmg += 10 * fro; }));
});


const api = { clearConds };
root.RdyEffects = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
