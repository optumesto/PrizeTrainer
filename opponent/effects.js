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
  [/^heal (\d+) damage from 1 of your pokemon(?:, and it recovers from all special conditions)?$/, m => ({ t: 'heal', n: +m[1], who: 'any' })],
  [/^heal (\d+) damage from your active pokemon(?: that has (\d+) or more energy attached)?$/, m => ({ t: 'heal', n: +m[1], who: 'active', minE: +(m[2] || 0) })],
  [/^heal all damage from 1 of your mega evolution pokemon ex$/, () => ({ t: 'wally' })],
  [/^if you healed any damage in this way, put all energy attached to that pokemon into your hand$/, () => ({ t: 'noop' })],
  [/^if you attached energy to a pokemon in this way, heal (\d+) damage from that pokemon$/, m => ({ t: 'healTarget', n: +m[1], ifAttached: true })],
  [/^during this turn, attacks used by your (\w+) pokemon do (\d+) more damage to your opponent's active pokemon$/, m => ({ t: 'typeBoost', type: m[1], n: +m[2] })],
];
H.opp.push(s => { for (const [re, f] of SENT) { const m = s.match(re); if (m) return f(m); } return null; });

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
H.atk.push((s, R, a) => { for (const [re, f] of ATK) { const m = s.match(re); if (m) { const r = f(m, R, s); if (r) return r; } } return null; });

/* ---------- Steps ---------- */
const self = (s, c) => { const f = I.findMon(s, c.mon); return f && f.m; };
function hit(s, att, target, n, noWR) {
  const isA = s.players.some(p => p.active === target);
  const d = E.damageTo(s, att, { base: n, noWR: noWR || !isA }, target, isA && !noWR);
  target.dmg += d;
  I.log(s, d + ' damage to ' + nm(target));
}
function drawFor(s, P, n) { for (let i = 0; i < n && P.deck.length; i++) P.hand.push(P.deck.shift()); }
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
S.oppBottom = { run(s, st, c, P, O) { c.oppBottomed = O.hand.length > 0; const h = O.hand.splice(0); I.reshuffle(s, { deck: h }); O.deck = O.deck.concat(h); I.log(s, 'Opponent put their hand on the bottom of their deck'); } };
S.oppDrawIf = { run(s, st, c, P, O) { if (c.oppBottomed) drawFor(s, O, st.n); } };
S.oppEnergyOff = {
  run(s, st, c, P, O) { const out = []; (st.active ? [O.active] : mons(O)).filter(Boolean).forEach(m => { const seen = new Set(); m.energy.forEach(e => { if (seen.has(e.card.key)) return; seen.add(e.card.key); out.push({ mon: m.id, uid: e.uid }); }); }); return out; },
  answer(s, st, c, v, P, O) { const m = I.findMon(s, v.mon).m, x = I.take(m.energy, v.uid); O.discard.push(x); I.log(s, 'Discarded ' + x.card.name + ' from ' + nm(m)); },
};
S.oppDiscardTo = {
  run(s, st, c, P, O) { if (O.hand.length <= st.n) return; const seen = new Set(), out = []; O.hand.forEach(y => { if (seen.has(y.card)) return; seen.add(y.card); out.push(y.uid); }); return { choices: out, who: 1 - s.cur }; },
  answer(s, st, c, v, P, O) { const x = I.take(O.hand, v); O.discard.push(x); I.log(s, 'Opponent discarded ' + x.card.name); return S.oppDiscardTo.run(s, st, c, P, O); },
};
S.toolOff = {
  run(s, st, c) { if ((c.tools || 0) >= st.n) return; const out = []; s.players.forEach(Q => mons(Q).forEach(m => { if (m.tool) out.push(m.id); })); return out.length ? out.concat([null]) : null; },
  answer(s, st, c, v) { if (v == null) return; const f = I.findMon(s, v); s.players[f.owner].discard.push(f.m.tool); I.log(s, 'Discarded ' + f.m.tool.card.name); f.m.tool = null; c.tools = (c.tools || 0) + 1; return S.toolOff.run(s, st, c); },
};
S.heal = {
  run(s, st, c, P) { const pool = (st.who === 'active' ? [P.active] : mons(P)).filter(m => m && m.dmg > 0 && m.energy.length >= (st.minE || 0)); return pool.map(m => m.id); },
  answer(s, st, c, v) { const m = I.findMon(s, v).m; const h = Math.min(m.dmg, st.n); m.dmg -= h; m.cond = null; m.poison = 0; m.burn = 0; I.log(s, 'Healed ' + h + ' from ' + nm(m)); },
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
S.energyToHand = { run(s, st, c, P) { const m = self(s, c); if (m && m.energy.length) P.hand.push(m.energy.shift()); } };
S.discardDraw = { run(s, st, c, P) { P.hand.splice(0).forEach(y => P.discard.push(y)); drawFor(s, P, st.n); } };
S.pushOut = { run(s, st, c, P, O) { if (!O.active || !O.bench.length) return; const old = O.active; O.active = null; O.bench.push(old); s.noPromote = old.id; s.promote = (s.promote || []).concat(1 - s.cur); } };
S.itemLock = { run(s, st, c, P, O) { O.lim.itemLock = s.turns[1 - s.cur] + 1; } };
S.optBoost = { run(s, st, c) { const m = self(s, c); return m && m.energy.filter(e => T.gfEType(e) === st.type).length >= st.n ? [true, false] : null; },
  answer(s, st, c, v, P, O) { if (!v) return; const m = self(s, c); let k = 0; m.energy = m.energy.filter(e => { if (k < st.n && T.gfEType(e) === st.type) { k++; P.discard.push(e); return false; } return true; });
    if (O.active) { const a = E.damageTo(s, m, { base: st.more * 2 }, O.active, true) - E.damageTo(s, m, { base: st.more }, O.active, true); O.active.dmg += a; } } };
S.bolt = { run(s, st, c, P) { const n = mons(P).reduce((a, z) => a + z.energy.filter(e => T.gfEType(e)).length, 0); return Array.from({ length: n + 1 }, (_, i) => i); },
  answer(s, st, c, v, P, O) { let left = v; const order = P.bench.concat([P.active]).filter(Boolean);
    for (const m of order) m.energy = m.energy.filter(e => { if (left > 0 && T.gfEType(e)) { left--; P.discard.push(e); return false; } return true; });
    const att = self(s, c); if (att && O.active && v) { const d = E.damageTo(s, att, { base: st.per * v }, O.active, true); O.active.dmg += d; I.log(s, d + ' damage to ' + nm(O.active)); } } };
S.countersActive = { run(s, st, c, P, O) { if (O.active) O.active.dmg += 10 * st.per * P.hand.length; } };
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
S.selfDmg = { run(s, st, c) { const m = self(s, c); if (m) m.dmg += st.n; } };
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

const api = { clearConds };
root.RdyEffects = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
