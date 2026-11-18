#!/usr/bin/env node
// Gives the face-down cards in your puzzle deck their real faces, so a search finds what the
// list really has left. A puzzle deals your deck from a real 60-card list; cards it can't vouch for
// (copies that could be among your Prizes) are face down ('?'). This deals your Prizes from those
// cards and records what each other face-down card really is as me.deckFaces, one entry per '?'
// slot, in order. The solver and the dealer still treat those cards as unknown, so the shortest
// win a pack records does not change; the app uses them when you search your deck.
//
//   node puzzle/tools/fill-decks.mjs --cards <dir> [--pack puzzle/daily.json]
//
// <dir> is the same pokemon-tcg-data folder make-daily.mjs reads. Safe to run again: the faces
// come from a seed per board, so the same pack gets the same faces.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const E = require('../engine.js');
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const DIR = arg('cards'), PACK = arg('pack', join(root, 'puzzle', 'daily.json'));
if (!DIR) { console.error('Usage: node puzzle/tools/fill-decks.mjs --cards <pokemon-tcg-data dir> [--pack puzzle/daily.json]'); process.exit(2); }

// Card records: the same lookup make-daily.mjs uses.
const sets = JSON.parse(readFileSync(join(DIR, 'sets.json'), 'utf8'));
const codeToSet = { SVP: 'svp' }; sets.forEach(s => { if (s.ptcgoCode && !codeToSet[s.ptcgoCode]) codeToSet[s.ptcgoCode] = s.id; });
const byId = {}, byName = {};
for (const s of sets) { const f = join(DIR, s.id + '.json'); if (!existsSync(f)) continue; for (const c of JSON.parse(readFileSync(f, 'utf8'))) { byId[c.id] = c; (byName[c.name] = byName[c.name] || []).push(c); } }
function record(e) {
  const sid = codeToSet[e.set];
  if (sid && byId[sid + '-' + e.number]) return byId[sid + '-' + e.number];
  const en = String(e.name).match(/^(?:Basic )?(Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal) Energy$/i);
  if (en) return byId['sve-' + (['grass', 'fire', 'water', 'lightning', 'psychic', 'fighting', 'darkness', 'metal'].indexOf(en[1].toLowerCase()) + 1)] || null;
  const same = byName[e.name];
  return same ? same[same.length - 1] : null;
}

const pack = JSON.parse(readFileSync(PACK, 'utf8'));
const lists = JSON.parse(readFileSync(join(root, 'tests', 'grade-lists.json'), 'utf8'));
let added = 0, done = 0;
const bad = [];
pack.puzzles.forEach((pz, n) => {
  const me = pz.me, f = pz.from;
  const L = lists.find(l => l.deckName === f.mine && l.event === f.event && l.place === f.place && l.date === f.date);
  if (!L) { bad.push(n + ': list not found'); return; }
  const recs = L.cards.map(record);
  if (recs.some(r => !r)) { bad.push(n + ': card data missing'); return; }
  const pool = [];
  L.cards.forEach((e, i) => {
    const r = recs[i];
    if (!pack.cards[r.id]) { pack.cards[r.id] = E.cardFromApi(r, { base: nm => { const s1 = recs.find(x => x.name === nm); return s1 ? s1.evolvesFrom : null; } }); added++; }
    for (let k = 0; k < e.count; k++) pool.push(r.id);
  });
  const take = k => { const i = pool.indexOf(k); if (i < 0) return false; pool.splice(i, 1); return true; };
  const shown = [];
  const mon = m => { if (m) shown.push(...(m.under || []), m.c, ...(m.energy || []), ...(m.tool ? [m.tool] : [])); };
  mon(me.active); (me.bench || []).forEach(mon);
  shown.push(...(me.hand || []), ...(me.discard || []), ...(me.deck || []).filter(k => k !== '?'));
  const miss = shown.filter(k => !take(k));
  const slots = me.deck.filter(k => k === '?').length;
  if (miss.length || pool.length !== slots + me.prizes) { bad.push(n + ': list does not match the board (' + miss.join(',') + ' ' + pool.length + ' vs ' + (slots + me.prizes) + ')'); return; }
  // The same faces every run: a small seeded shuffle per board.
  let seed = (n + 1) * 2654435761 >>> 0;
  const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  me.deckFaces = pool.slice(me.prizes);
  done++;
});
writeFileSync(PACK, JSON.stringify(pack));
console.log('Filled ' + done + ' of ' + pack.puzzles.length + ' decks, added ' + added + ' cards to the card table.' + (bad.length ? '\nNot filled:\n' + bad.join('\n') : ''));
