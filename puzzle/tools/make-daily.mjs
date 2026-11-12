#!/usr/bin/env node
// Builds puzzle/daily.json: a pack of "find the out" puzzles dealt from the top tournament lists
// in tests/grade-lists.json. Each board is solved before it is kept, so every puzzle has a
// forced win this turn that needs no luck and uses only cards the engine fully reads.
//
//   node puzzle/tools/make-daily.mjs --cards <dir> [--n 120] [--seed 1] [--out puzzle/daily.json]
//   node puzzle/tools/make-daily.mjs --cards <dir> --repair [--keep 4]   (fix a live pack, keep played days)
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
// Difficulty: 0 easy, 1 medium, 2 hard. A 3-action win with one way to start is medium; with
// several ways to start it is easy. Rated by firstShort (first actions that start a shortest win).
const level = p => p.moves >= 4 ? 2 : (p.moves <= 2 || (p.moves === 3 && p.firstShort > 1)) ? 0 : 1;
// Puzzle 0 is Monday Nov 9 2026 (PUZZLE_EPOCH in index.html): easy Mon and Tue, medium Wed to Fri, hard at the weekend.
const SHAPE = [0, 0, 1, 1, 1, 2, 2];
// Solve a board and say why it can't be a puzzle, or null when it can.
function judge(s) {
  const rc = E.readCheck(s); if (rc.length) return { why: 'unread', rc };
  if (S.obviousWin(s)) return { why: 'obvious' };
  const r = S.solve(s, { maxNodes: 30000, maxMoves: 6 });
  if (!r.complete) return { why: 'budget' }; if (!r.win) return { why: 'no out' }; if (r.moves < 2) return { why: 'one move' };
  // Too easy: a two-action win with several ways to start, or Energy then attack.
  if (r.moves === 2 && (r.firstMoves > 1 || r.line.filter(a => !/^(pick|promote)$/.test(a.t)).map(a => a.t).join() === 'energy,attack')) return { why: 'too easy' };
  return { r };
}
// The answer, in words, for the "Show the answer" button.
function answerOf(s, r) {
  let st = s; const answer = [];
  for (const a of r.line) { const before = st.log.length; st = E.apply(st, a); answer.push(...st.log.slice(before)); }
  return answer;
}
const sigOf = pz => JSON.stringify([pz.me.active.c, pz.me.hand.slice().sort(), pz.opp.active.c, pz.opp.bench.map(b => b.c).sort()]);

// --repair: keep the pack in OUT, leave the first --keep days (already played) exactly as they are,
// re-check every later board with the current engine, and deal new boards only where one no longer
// works or where a difficulty level is short for the week's shape.
const REPAIR = process.argv.includes('--repair'), KEEP = REPAIR ? +arg('keep', 4) : 0;
const old = REPAIR ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
if (old) for (const k of Object.keys(old.cards)) CARD[k] = old.cards[k];
const fixed = old ? old.puzzles.slice(0, KEEP) : [];
const survivors = [], dropped = [];
if (old) old.puzzles.slice(KEEP).forEach((pz, j) => {
  const i = j + KEEP;
  let s; try { s = E.fromPuzzle(Object.assign({ cards: CARD }, pz)); } catch (e) { dropped.push([i, 'error']); return; }
  const J = judge(s);
  if (!J.r) { dropped.push([i, J.why]); return; }
  const was = pz.moves;
  Object.assign(pz, { moves: J.r.moves, firstMoves: J.r.firstMoves, firstShort: J.r.firstShort, answer: answerOf(s, J.r) });
  survivors.push(Object.assign(pz, { _was: i, _moved: was !== pz.moves }));
});
const slots = N - KEEP;
const target = [0, 0, 0]; for (let i = KEEP; i < N; i++) target[SHAPE[i % 7]]++;
const have = [0, 0, 0]; survivors.forEach(p => have[level(p)]++);
if (old) console.log('Kept ' + KEEP + ' played days. Re-checked ' + (old.puzzles.length - KEEP) + ': ' + survivors.length + ' still work, ' + dropped.length + ' do not (' + dropped.map(d => d[0] + ' ' + d[1]).join(', ') + '). Levels ' + have.join('/') + ', week needs ' + target.join('/'));

const kept = [], seenBoards = new Set(fixed.concat(survivors).map(sigOf));
const count = have.slice();
const done = () => REPAIR ? count.every((c, L) => c >= target[L]) : kept.length >= slots;
let tries = 0; const why = {}; const no = k => { why[k] = (why[k] || 0) + 1; };
const started = Date.now();
while (!done() && tries < slots * 400) {
  tries++;
  const A = pick(decks), B = pick(decks);
  const pz = deal(A, B); if (!pz) { no('deal'); continue; }
  let s;
  try { s = E.fromPuzzle(Object.assign({ cards: CARD }, pz)); } catch (e) { continue; }
  const J = judge(s); if (!J.r) { no(J.why); (J.rc || []).forEach(x => no('  ' + x)); continue; }
  const r = J.r, L = level(r);
  if (REPAIR && count[L] >= target[L]) { no('level full'); continue; }
  // Variety: no one family of decks (first word of its name) gets more than a fifth of the pack.
  const fam = A.name.split(' ')[0];
  if (fixed.concat(survivors, kept).filter(p => p.from.mine.split(' ')[0] === fam).length >= Math.ceil(N / 5)) { no('family cap'); continue; }
  const sig = sigOf(pz);
  if (seenBoards.has(sig)) continue; seenBoards.add(sig);
  kept.push(Object.assign(pz, { from: { mine: A.name, theirs: B.name, event: A.event, place: A.place, date: A.date },
    moves: r.moves, firstMoves: r.firstMoves, firstShort: r.firstShort, answer: answerOf(s, r) }));
  count[L]++;
  if (kept.length % 10 === 0) console.log(kept.length + ' new after ' + tries + ' boards, ' + Math.round((Date.now() - started) / 1000) + 's');
}
// Each level keeps what the week needs. Boards that still work come first, so a repair changes as few days as it can.
const byLevel = [[], [], []];
for (const L of [0, 1, 2]) {
  const pool = shuffle(survivors.filter(p => level(p) === L)).concat(shuffle(kept.filter(p => level(p) === L)));
  byLevel[L] = pool;
}
let spare = byLevel.reduce((n, q) => n + q.length, 0) - slots;
for (const L of [0, 2, 1]) while (spare > 0 && byLevel[L].length > target[L]) { const p = byLevel[L].pop(); if (p._was != null) dropped.push([p._was, 'level surplus']); spare--; }
// Order the unplayed days by the week's shape. When a level runs out, take the nearest one,
// and never a hard board on Monday or Tuesday while an easier one is left.
const NEAR = [[0, 1, 2], [1, 0, 2], [2, 1, 0]];
const weekShape = fixed.slice();
for (let i = KEEP; weekShape.length < N; i++) {
  const q = NEAR[SHAPE[i % 7]].map(L => byLevel[L]).find(x => x.length);
  if (!q) break;
  weekShape.push(q.shift());
}
if (old) {
  const moved = weekShape.filter((p, i) => p._was != null && p._was !== i).length;
  const fresh = weekShape.filter(p => p._was == null).length - KEEP;
  console.log('Repair: ' + fresh + ' new boards, ' + moved + ' boards moved to another day, ' + weekShape.filter(p => p._moved).length + ' with a new shortest line. Replaced: ' + dropped.map(d => d[0] + ' (' + d[1] + ')').join(', '));
  const bad = []; weekShape.forEach((p, i) => { if (i >= KEEP && SHAPE[i % 7] === 0 && level(p) === 2) bad.push(i); });
  if (bad.length) console.log('Warning: hard boards on Mon or Tue at ' + bad.join(', '));
}
weekShape.forEach(p => { delete p._was; delete p._moved; });
// Only the cards these puzzles use, trimmed to what the engine and the screen read.
const used = new Set();
const walk = v => { if (typeof v === 'string' && CARD[v]) used.add(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
weekShape.forEach(p => { walk(p.me); walk(p.opp); });
const cards = {}; [...used].sort().forEach(k => { cards[k] = CARD[k]; });
writeFileSync(OUT, JSON.stringify({ schema: 1, made: new Date().toISOString().slice(0, 10), cards, puzzles: weekShape }));
if (process.argv.includes('--why')) console.log(Object.entries(why).sort((a, b) => b[1] - a[1]).slice(0, 40).map(x => x[1] + ' ' + x[0]).join('\n'));
console.log('Wrote ' + weekShape.length + ' puzzles (' + Object.keys(cards).length + ' cards) to ' + OUT + ' from ' + tries + ' boards');
