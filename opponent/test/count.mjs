// 3.4.12: every card stays where the game says it is. After every move, each player's 60 cards are found exactly
// once (deck, hand, discard, Prize cards, Pokemon in play with the cards under and on them, the Stadium, the Lost
// Zone, or cards an effect holds while you choose), and never in the other player's piles.
// node opponent/test/count.mjs [games]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../game.js'); require('../effects.js'); const AI = require('../ai.js');
const C = await import('./cards.mjs');
const L = C.lists();
const N = +process.argv[2] || 400;
const I = G.internals || {};
function where(s) {
  const at = new Map(), add = (uid, k, z) => { if (!at.has(uid)) at.set(uid, []); at.get(uid).push(k + ':' + z); };
  s.players.forEach((P, k) => {
    ['deck', 'hand', 'discard', 'prizes', 'lost'].forEach(z => (P[z] || []).forEach(r => add(r.uid, k, z)));
    [P.active, ...P.bench].filter(Boolean).forEach(m => { m.stack.forEach(r => add(r.uid, k, 'stack')); m.energy.forEach(r => add(r.uid, k, 'energy')); if (m.tool) add(m.tool.uid, k, 'tool'); });
  });
  if (s.stadium) add(s.stadium.ref.uid, s.stadium.owner, 'stadium');
  const c = s.pending && s.pending.ctx; const seen = new Set(at.keys());
  if (c) for (const key in c) { const v = c[key]; (Array.isArray(v) ? v : v && v.uid ? [v] : []).forEach(r => { if (r && typeof r === 'object' && r.uid && r.card && !seen.has(r.uid)) add(r.uid, 'ctx', key); }); }
  return at;
}
function check(s) {
  const at = where(s), bad = [];
  for (let u = 1; u <= 120; u++) { const own = u <= 60 ? 0 : 1, w = at.get(u) || [];
    if (w.length !== 1) bad.push(`card ${u} found ${w.length}x ${w.join(',')}`);
    else if (!w[0].startsWith('ctx') && +w[0][0] !== own) bad.push(`card ${u} of player ${own} in ${w[0]}`); }
  return bad;
}
let bad = 0, games = 0; const kinds = new Map(), seen = {};
const WATCH = ['Archer', 'Hacking', 'Petrel', 'Deceit', "Lillie's Determination", 'Recon Directive', 'Run Away Draw', 'Lunar Cycle', 'Cursed Blast', 'Ignition Energy', 'Enriching Energy', 'Lucky Helmet'];
for (let g = 0; g < N; g++) {
  const a = L[g % L.length], b = L[(g * 7 + 3) % L.length];
  if (a.cards.length !== 60 || b.cards.length !== 60) continue;
  // Random moves (fast, and they reach odd corners); every 4th game the Easy AI plays side 1.
  const rnd = G.rngFrom(500 + g), ai = g % 4 === 0 ? new AI.Player('easy', g + 9) : null;
  const pick = (s, X) => { if (ai && X.who === 1) return ai.choose(s, 1); const atk = X.actions.filter(x => x.t === 'attack'); return atk.length && rnd() < 0.5 ? atk[Math.floor(rnd() * atk.length)] : X.actions[Math.floor(rnd() * X.actions.length)]; };
  let s = G.newGame([a.cards, b.cards], { seed: g, maxTurns: g % 2 ? 5 : 0 }); games++;
  for (const k of [0, 1]) { const ch = G.setupChoices(s, k); s = G.setUp(s, k, ch[0].uid, ch.slice(1, 1 + Math.floor(rnd() * ch.length)).map(x => x.uid)); }
  let n = 0;
  while (G.winner(s) < 0 && !s.timeUp && n < 3000) {
    const X = G.next(s); if (!X.actions.length) break;
    const a1 = pick(s, X), before = s.log.length, s1 = G.step(s, a1); n++;
    const p = check(s1);
    if (p.length) { bad++; const key = (a1.t || 'pick') + ' ' + (s.pending && s.pending.ask ? s.pending.ask.kind : '') + ' | ' + s1.log.slice(before).join(' / ').slice(0, 160);
      if (!kinds.has(key)) kinds.set(key, { n: 0, ex: p.slice(0, 3), deck: [a.name, b.name], g }); kinds.get(key).n++;
      break; }
    s = s1;
  }
  const t = s.log.join('\n'); WATCH.forEach(w => { if (t.includes(w)) seen[w] = (seen[w] || 0) + 1; });
}
console.log(`count: ${games} games, ${bad} with a card out of place`);
if (process.env.SEEN) console.log(seen);
[...kinds].slice(0, 25).forEach(([k, v]) => console.log(v.n, k, JSON.stringify(v.ex), v.deck.join(' vs '), 'g' + v.g));
if (bad) process.exitCode = 1;
