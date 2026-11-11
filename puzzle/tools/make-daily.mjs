#!/usr/bin/env node
// Builds puzzle/daily.json: a pack of "find the out" puzzles dealt from the top tournament lists
// in tests/grade-lists.json. Each board is solved before it is kept, so every puzzle has a
// forced win this turn that needs no luck and uses only cards the engine fully reads.
//
//   node puzzle/tools/make-daily.mjs --cards <dir> [--n 120] [--seed 1] [--out puzzle/daily.json]
//
// <dir> holds pokemon-tcg-data files: sets.json (sets/en.json) and one <set id>.json per set
// (cards/en/<set id>.json), from github.com/PokemonTCG/pokemon-tcg-data. The app never reads them.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const E = require('../engine.js');
const S = require('../solver.js');
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const DIR = arg('cards');
if (!DIR) { console.error('Usage: node puzzle/tools/make-daily.mjs --cards <pokemon-tcg-data dir> [--n 120] [--seed 1]'); process.exit(2); }
const N = +arg('n', 120), OUT = arg('out', join(root, 'puzzle', 'daily.json'));
let seed = +arg('seed', 1) >>> 0;
const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const between = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

/* ---------- Card records ---------- */
const sets = JSON.parse(readFileSync(join(DIR, 'sets.json'), 'utf8'));
const codeToSet = {}; sets.forEach(s => { if (s.ptcgoCode) codeToSet[s.ptcgoCode] = s.id; });
codeToSet.SVP = 'svp';
const byId = {}, byName = {};
for (const s of sets) {
  const f = join(DIR, s.id + '.json');
  if (!existsSync(f)) continue;
  for (const c of JSON.parse(readFileSync(f, 'utf8'))) { byId[c.id] = c; (byName[c.name] = byName[c.name] || []).push(c); }
}
function record(e) {
  const sid = codeToSet[e.set];
  if (sid && byId[sid + '-' + e.number]) return byId[sid + '-' + e.number];
  const en = String(e.name).match(/^(?:Basic )?(Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal) Energy$/i);
  if (en) return byId['sve-' + (['grass', 'fire', 'water', 'lightning', 'psychic', 'fighting', 'darkness', 'metal'].indexOf(en[1].toLowerCase()) + 1)] || null;
  const same = byName[e.name];
  return same ? same[same.length - 1] : null;
}

/* ---------- Decks ---------- */
const lists = JSON.parse(readFileSync(join(root, 'tests', 'grade-lists.json'), 'utf8'));
const CARD = {}; // key -> engine card
function engineCard(r, recs) {
  if (CARD[r.id]) return CARD[r.id];
  const c = E.cardFromApi(r, { base: n => { const s1 = recs.find(x => x.name === n); return s1 ? s1.evolvesFrom : null; } });
  return (CARD[r.id] = c);
}
const decks = [];
for (const L of lists) {
  const recs = [], cards = [];
  let ok = true;
  for (const e of L.cards) { const r = record(e); if (!r) { ok = false; break; } recs.push(r); for (let i = 0; i < e.count; i++) cards.push(r); }
  if (!ok || cards.length !== 60) continue;
  decks.push({ name: L.deckName, event: L.event, place: L.place, date: L.date, recs, keys: cards.map(r => engineCard(r, recs).key) });
}
console.log(decks.length + ' of ' + lists.length + ' lists have full card data');

/* ---------- Dealing a board ---------- */
const C = k => CARD[k];
const isPoke = k => C(k).cat === 'pokemon';
const basicE = k => C(k).cat === 'energy' && !C(k).rtext && /energy$/i.test(C(k).name);
const probe = E.fromPuzzle({ cards: CARD, me: { deck: 0 }, opp: { deck: 0 } });
const reads = (k, mine) => E.cardProblems(probe, { card: C(k) }, mine).length === 0;
function stackFor(pool, k) {
  const out = [k]; let cur = C(k);
  while (cur.from) { const i = pool.findIndex(x => isPoke(x) && C(x).name === cur.from); if (i < 0) return null; out.unshift(pool[i]); cur = C(pool[i]); }
  return out;
}
function takeStack(pool, stack) { for (const k of stack) { const i = pool.indexOf(k); if (i < 0) return false; pool.splice(i, 1); } return true; }

function deal(A, B) {
  const pool = A.keys.slice();
  // Your Active: a Pokémon with an attack the engine reads, fully evolved from cards in the list.
  const attackers = [...new Set(pool.filter(k => isPoke(k) && reads(k, true) && (C(k).attacks || []).some(a => { const R = E.readAttack(a); return R && (R.base > 0 || R.per); })))];
  if (!attackers.length) return null;
  const ak = pick(attackers), aStack = stackFor(pool, ak);
  if (!aStack || !takeStack(pool, aStack)) return null;
  const energies = pool.filter(basicE);
  if (!energies.length) return null;
  const atk = (C(ak).attacks || []).filter(a => E.readAttack(a)).sort((x, y) => y.cost.length - x.cost.length)[0];
  const need = (atk.cost || []).length, give = Math.max(0, need - between(0, 1));
  const aEnergy = [];
  for (const t of atk.cost) { if (aEnergy.length >= give) break; const i = pool.findIndex(k => basicE(k) && (t === 'colorless' || E.T.gfEType({ card: C(k) }) === t)); if (i >= 0) aEnergy.push(pool.splice(i, 1)[0]); }
  const me = { active: { c: aStack[aStack.length - 1], under: aStack.slice(0, -1), energy: aEnergy, turnIn: 1 }, bench: [] };
  // Your Bench: 1 to 3 more Pokémon from the list, each with its evolution line.
  for (let n = between(1, 3), tries = 0; me.bench.length < n && tries < 20; tries++) {
    const k = pick(pool.filter(isPoke)); if (!k || !reads(k, true)) continue;
    const st = stackFor(pool, k); if (!st || !takeStack(pool, st)) continue;
    const en = []; for (let e = between(0, 2); e > 0; e--) { const i = pool.findIndex(basicE); if (i >= 0) en.push(pool.splice(i, 1)[0]); }
    me.bench.push({ c: st[st.length - 1], under: st.slice(0, -1), energy: en, turnIn: 1 });
  }
  // Hand: 3 to 5 cards the engine reads. Discard: a few used Trainers. Prizes: 1 to 3 left, face down.
  const handPool = shuffle(pool.filter(k => reads(k, true) && !(C(k).cat === 'energy' && !basicE(k))));
  me.hand = [];
  for (const k of handPool) { if (me.hand.length >= between(3, 5)) break; const i = pool.indexOf(k); if (i >= 0) { me.hand.push(pool.splice(i, 1)[0]); } }
  me.discard = [];
  for (let n = between(3, 8); n > 0; n--) { const i = pool.findIndex(k => C(k).cat === 'trainer'); if (i < 0) break; me.discard.push(pool.splice(i, 1)[0]); }
  const prizesLeft = between(1, 3);
  // The deck: a card counts as known only for copies that can't be among your Prizes.
  const left = {}; pool.forEach(k => left[k] = (left[k] || 0) + 1);
  me.deck = [];
  for (const k of Object.keys(left)) { const sure = Math.max(0, left[k] - prizesLeft); for (let i = 0; i < left[k]; i++) me.deck.push(i < sure && reads(k, true) ? k : '?'); }
  me.deck = me.deck.slice(0, pool.length - prizesLeft);
  me.prizes = prizesLeft;
  // The opponent: Active and 1 to 3 Benched Pokémon from their list, some already damaged.
  const op = B.keys.slice(), opp = { bench: [], hand: between(3, 7), deck: between(12, 30), prizes: between(1, 6) };
  const oppMon = () => {
    for (let t = 0; t < 20; t++) {
      const k = pick(op.filter(isPoke)), st = k && stackFor(op, k); if (!st || !reads(k, false) || !takeStack(op, st)) continue;
      const hp = C(k).hp || 0, dmg = rnd() < 0.6 ? 10 * between(1, Math.max(1, hp / 10 - 2)) : 0;
      const m = { c: st[st.length - 1], under: st.slice(0, -1), dmg, turnIn: 1 };
      const tools = op.filter(x => C(x).kind === 'tool' && reads(x, false));
      if (tools.length && rnd() < 0.25) { const tk = pick(tools); op.splice(op.indexOf(tk), 1); m.tool = tk; }
      return m;
    }
    return null;
  };
  opp.active = oppMon(); if (!opp.active) return null;
  for (let n = between(1, 3); n > 0; n--) { const m = oppMon(); if (m) opp.bench.push(m); }
  return { turn: 5, first: rnd() < 0.5, goal: { t: 'prizes' }, me, opp };
}

/* ---------- Keep only boards with a real out ---------- */
const kept = [], seenBoards = new Set();
let tries = 0; const why = {}; const no = k => { why[k] = (why[k] || 0) + 1; };
const started = Date.now();
while (kept.length < N && tries < N * 400) {
  tries++;
  const A = pick(decks), B = pick(decks);
  const pz = deal(A, B); if (!pz) { no('deal'); continue; }
  let s;
  try { s = E.fromPuzzle(Object.assign({ cards: CARD }, pz)); } catch (e) { continue; }
  const rc = E.readCheck(s); if (rc.length) { no('unread'); rc.forEach(x => no('  ' + x)); continue; }
  if (S.obviousWin(s)) { no('obvious'); continue; }
  const r = S.solve(s, { maxNodes: 30000, maxMoves: 6 });
  if (!r.complete) { no('budget'); continue; } if (!r.win) { no('no out'); continue; } if (r.moves < 2) { no('one move'); continue; }
  // Too easy: a two-action win with several ways to start, or Energy then attack.
  if (r.moves === 2 && (r.firstMoves > 1 || r.line.filter(a => !/^(pick|promote)$/.test(a.t)).map(a => a.t).join() === 'energy,attack')) { no('too easy'); continue; }
  // Variety: no one family of decks (first word of its name) gets more than a fifth of the pack.
  const fam = A.name.split(' ')[0];
  if (kept.filter(p => p.from.mine.split(' ')[0] === fam).length >= Math.ceil(N / 5)) { no('family cap'); continue; }
  const sig = JSON.stringify([pz.me.active.c, pz.me.hand.slice().sort(), pz.opp.active.c, pz.opp.bench.map(b => b.c).sort()]);
  if (seenBoards.has(sig)) continue; seenBoards.add(sig);
  // The answer, in words, for the "Show the answer" button.
  let st = s; const answer = [];
  for (const a of r.line) { const before = st.log.length; st = E.apply(st, a); answer.push(...st.log.slice(before)); }
  kept.push(Object.assign(pz, { from: { mine: A.name, theirs: B.name, event: A.event, place: A.place, date: A.date },
    moves: r.moves, firstMoves: r.firstMoves, answer }));
  if (kept.length % 10 === 0) console.log(kept.length + ' kept after ' + tries + ' boards, ' + Math.round((Date.now() - started) / 1000) + 's');
}
// Order: easier puzzles early in the week, harder at the weekend, but never two from the same pair of decks in a row.
kept.sort((a, b) => a.moves - b.moves || b.firstMoves - a.firstMoves);
const weekShape = [];
const easy = p => p.moves <= 2 || (p.moves === 3 && p.firstMoves > 1);
const byLevel = [kept.filter(easy), kept.filter(p => !easy(p) && p.moves === 3), kept.filter(p => p.moves >= 4)].map(shuffle);
for (let i = 0; weekShape.length < kept.length; i++) {
  const want = [0, 0, 1, 1, 1, 2, 2][i % 7];
  const q = byLevel[want].length ? byLevel[want] : byLevel.find(x => x.length);
  weekShape.push(q.shift());
}
// Only the cards these puzzles use, trimmed to what the engine and the screen read.
const used = new Set();
const walk = v => { if (typeof v === 'string' && CARD[v]) used.add(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
weekShape.forEach(p => { walk(p.me); walk(p.opp); });
const cards = {}; [...used].sort().forEach(k => { cards[k] = CARD[k]; });
writeFileSync(OUT, JSON.stringify({ schema: 1, made: new Date().toISOString().slice(0, 10), cards, puzzles: weekShape }));
if (process.argv.includes('--why')) console.log(Object.entries(why).sort((a, b) => b[1] - a[1]).slice(0, 40).map(x => x[1] + ' ' + x[0]).join('\n'));
console.log('Wrote ' + weekShape.length + ' puzzles (' + Object.keys(cards).length + ' cards) to ' + OUT + ' from ' + tries + ' boards');
