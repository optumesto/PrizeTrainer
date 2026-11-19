// Saved decks in Sparring (opponent/own.js). Nothing goes online.
// 1. Every meta card, read the way the app reads it (TCGEnrich, then the fields js/core.js saves), turned back
//    into an engine card by own.js, matches the card Sparring's own records hold.
// 2. Every meta list, saved that way, builds into a 60-card Sparring deck, with and without Sparring's records.
// 3. Games: saved decks against the AI (and saved against saved) finish with no crash and nothing stuck.
// node opponent/test/own.mjs [games]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('../../puzzle/engine.js'); const G = require('../game.js'); require('../effects.js');
const AI = require('../ai.js');
const O = require('../own.js');
const C = await import('./cards.mjs');
import { readFileSync } from 'node:fs';
import { saved } from './saved.mjs';
let fails = 0; const fail = m => { fails++; if (fails <= 25) console.log('FAIL', m); };

// 1. Card by card.
const L = C.lists(); const meta = new Map(); L.forEach(l => l.cards.forEach(c => meta.set(c.key, c)));
let same = 0; const diffs = new Map();
for (const [k, want] of meta) {
  const got = O.fromSaved(saved(k, 1));
  if (!got) { fail('no record for ' + k); continue; }
  const pick = r => ({ cat: r.cat, hp: r.hp, stage: r.stage, from: r.from, p: r.p, retreat: r.retreat, weak: r.weak && r.weak.type, kind: r.kind, rtext: String(r.rtext || '').replace(/\s+/g, ' ').trim(), ace: !!r.ace,
    attacks: (r.attacks || []).map(a => [a.name, a.cost.join(','), String(a.dmg).replace(/×/g, 'x'), a.text]), abil: (r.abil || []).map(a => a.join(': ')),
    types: (r.types || []).join(','), sub: (r.sub || []).filter(x => !/^(tera|ancient|future)$/.test(x)).sort().join(',') });
  const a = pick(want), b = pick(got); let ok = true;
  for (const f of Object.keys(a)) if (JSON.stringify(a[f]) !== JSON.stringify(b[f])) { ok = false; diffs.set(f, (diffs.get(f) || []).concat(k + ' ' + JSON.stringify(a[f]).slice(0, 90) + ' / ' + JSON.stringify(b[f]).slice(0, 90))); }
  if (ok) same++;
}
console.log(`Cards: ${same} of ${meta.size} read back the same from a saved deck.`);
for (const [f, l] of diffs) { console.log(`  ${f}: ${l.length} differ`); l.slice(0, 4).forEach(x => console.log('    ' + x)); }

// 2. Every meta list as a saved deck.
const savedDecks = (await import('./saved.mjs')).savedDecks();
const D = ((() => { const w = {}; new Function('window', readFileSync(new URL('../decks.js', import.meta.url), 'utf8'))(w); return w.RdyOppDecks; })());
let built = 0, plainDecks = 0; const plainCards = new Map();
const withMeta = savedDecks.map(d => O.build(d, D.cards)), alone = savedDecks.map(d => O.build(d, null));
withMeta.forEach(b => { if (b.cards && b.cards.length === 60) built++; else fail('build ' + b.name + ' ' + b.block); if (b.plain.length) fail('meta card not fully played via records: ' + b.name + ' ' + b.plain.join(', ')); });
alone.forEach(b => { if (!b.cards) return fail('build alone ' + b.name + ' ' + b.block); if (b.plain.length || b.colorless.length) plainDecks++; b.plain.concat(b.colorless).forEach(n => plainCards.set(n, (plainCards.get(n) || 0) + 1)); });
console.log(`Decks: ${built} of ${savedDecks.length} saved lists build with Sparring's records, every card fully played.`);
console.log(`Without Sparring's records (saved text only): ${alone.length - plainDecks} of ${alone.length} fully played; cards that are not: ${[...plainCards].sort((a, b) => b[1] - a[1]).slice(0, 12).map(x => x[0] + ' ' + x[1]).join(', ') || 'none'}`);
// Edge cases: wrong count, no data, no Basic, another printing.
const pk = Object.keys(D.cards).find(k => D.cards[k].cat === 'pokemon' && D.cards[k].stage === 'basic' && D.cards[k].attacks.length);
const bad1 = O.build({ name: 'x', cards: [saved(pk, 4)] }, D.cards); if (bad1.block !== 'count') fail('count block');
const bad2 = O.build({ name: 'x', cards: [{ name: 'Mystery Card', count: 4 }, saved(pk, 4), saved('Lightning Energy', 52)] }, D.cards); if (bad2.block !== 'data' || bad2.missing[0] !== 'Mystery Card') fail('data block');
const bad3 = O.build({ name: 'x', cards: [saved('Lightning Energy', 60)] }, D.cards); if (bad3.block !== 'basic') fail('basic block');
const other = Object.assign(saved(pk, 4), { attacks: [{ name: 'Made Up', cost: ['lightning'], dmg: 10, pd: '10', text: '' }] });
const b4 = O.build({ name: 'x', cards: [other, saved('Lightning Energy', 56)] }, D.cards);
if (!b4.cards || b4.cards[0].attacks[0].name !== 'Made Up') fail('another printing should use the saved text');

// 3. Games.
E.internals.setReal(true);
const N = +process.argv[2] || 40;
let crash = 0, stuck = 0, done = 0; const t0 = Date.now();
const levels = ['easy', 'contested', 'aggressive'];
for (let g = 0; g < N; g++) {
  const a = alone[g % alone.length], b = g % 2 ? alone[(g * 7 + 3) % alone.length] : { cards: D.decks[g % D.decks.length].list.flatMap(([k, n]) => Array(n).fill(D.cards[k])) };
  const seed = 1000 + g, lv = levels[g % 3];
  try {
    let s = G.newGame([a.cards, b.cards], { seed });
    const ais = [new AI.Player(lv, seed + 1), new AI.Player(levels[(g + 1) % 3], seed + 2)];
    for (const k of [0, 1]) { const p = AI.setupPick(s, k, lv, G.rngFrom(seed + 3 + k)); s = G.setUp(s, k, p.active, p.bench); }
    let n = 0;
    while (G.winner(s) < 0 && n < 4000) { const X = G.next(s); if (!X.actions.length) { n = 4000; break; } s = G.step(s, ais[X.who].choose(s, X.who)); n++; if (s.turns[0] + s.turns[1] > 60) break; }
    if (n >= 4000) { stuck++; fail('stuck ' + a.name); } else done++;
  } catch (e) { crash++; fail('crash ' + a.name + ': ' + e.message); }
}
console.log(`Games: ${done} of ${N} played out, ${crash} crashed, ${stuck} stuck (${Math.round((Date.now() - t0) / 1000)} s).`);
console.log(fails ? `${fails} problems.` : 'own: all good.');
process.exit(fails ? 1 : 0);
