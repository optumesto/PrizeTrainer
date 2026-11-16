// Card text for RdyDeck's card guide pages (cards/*.html), written to .github/card-pages.json.
// build-pages.mjs reads that file and builds one page per card. Run this before build-pages.mjs
// when the meta changes (a release, or new decks in meta-cards.json).
//
// Which cards: every card in at least half of the top lists of a deck with a guide
// (deck-guides.json) or of one of the 20 most played decks (meta-cards.json). Basic Energy is
// left out. Each card uses its most played print.
//
// Source: pokemon-tcg-data (github.com/PokemonTCG/pokemon-tcg-data), the same card data
// build-cards.mjs reads: one set list and one file per set, about 20 requests.
//
// Usage: node card-pages-data.mjs
//   PT_PTCG_DIR=dir reads <dir>/sets.json and <dir>/cards/<id>.json from disk instead.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, '.github/card-pages.json');
const PTCG = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master';
const DIR = process.env.PT_PTCG_DIR || '';
const UA = 'RdyDeck-cards/1.0 (+https://rdydeck.com/)';
const read = f => JSON.parse(readFileSync(path.join(ROOT, f), 'utf8'));
const BASIC = /^(Basic )?(Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal) Energy$/;
const MIN_SHARE = 0.5, TOP_DECKS = 20;

async function getJSON(p, disk) {
  if (DIR) { try { return JSON.parse(readFileSync(path.join(DIR, disk), 'utf8')); } catch (_) { return null; } }
  await new Promise(r => setTimeout(r, 300));
  const r = await fetch(`${PTCG}/${p}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
  return r.ok ? r.json() : null;
}

export const slugOf = name => String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’.]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const mc = read('meta-cards.json'), guides = read('deck-guides.json');
const keep = new Set([...guides.decks.map(g => g.id), ...mc.decks.slice().sort((a, b) => b.lists - a.lists).slice(0, TOP_DECKS).map(d => d.id)]);
const want = new Map();   // name -> Map(print -> weight)
for (const d of mc.decks) {
  for (const c of d.cards) {
    const [name, set, no, , , , share] = c;
    if (BASIC.test(name)) continue;
    if (keep.has(d.id) && share >= MIN_SHARE && !want.has(name)) want.set(name, new Map());
  }
}
for (const d of mc.decks) for (const [name, set, no, , , , share] of d.cards) {
  if (!want.has(name)) continue;
  const k = set + ' ' + no, m = want.get(name);
  m.set(k, (m.get(k) || 0) + share * d.lists);
}

const sets = await getJSON('sets/en.json', 'sets.json');
if (!Array.isArray(sets)) throw new Error('no set list');
const byCode = Object.fromEntries(sets.filter(s => s.ptcgoCode).map(s => [s.ptcgoCode, s]));
const setCards = {};
async function cardAt(code, no) {
  const s = byCode[code];
  if (!s) return null;
  if (!(s.id in setCards)) setCards[s.id] = await getJSON(`cards/en/${s.id}.json`, `cards/${s.id}.json`) || [];
  const c = setCards[s.id].find(x => String(x.number) === String(no));
  return c ? { c, s } : null;
}

const out = [], missing = [];
for (const [name, prints] of [...want].sort((a, b) => a[0].localeCompare(b[0]))) {
  let hit = null;
  for (const [k] of [...prints].sort((a, b) => b[1] - a[1])) {
    const [code, no] = k.split(' ');
    hit = await cardAt(code, no);
    if (hit && hit.c.name === name) break;
    hit = null;
  }
  if (!hit) { missing.push(name); continue; }
  const { c, s } = hit;
  out.push({
    name, slug: slugOf(name), set: s.ptcgoCode, setName: s.name, no: c.number, released: s.releaseDate,
    supertype: c.supertype, subtypes: c.subtypes || [], mark: c.regulationMark || '',
    hp: c.hp ? +c.hp : undefined, types: c.types, evolvesFrom: c.evolvesFrom,
    abilities: (c.abilities || []).map(a => ({ name: a.name, type: a.type, text: a.text })),
    attacks: (c.attacks || []).map(a => ({ name: a.name, cost: a.cost || [], damage: a.damage || '', text: a.text || '' })),
    weak: (c.weaknesses || []).map(w => w.type + ' ' + w.value), resist: (c.resistances || []).map(w => w.type + ' ' + w.value),
    retreat: c.convertedRetreatCost || 0,
    // Some files repeat a rule box line without its label ("Tera: ..." and the same text alone): keep the labeled one.
    rules: [...new Set(c.rules || [])].filter((r, i, a) => !a.some((x, j) => j !== i && x.length > r.length && x.endsWith(': ' + r))),
  });
}
writeFileSync(OUT, JSON.stringify({ schema: 1, note: 'Card text for the card guide pages, from pokemon-tcg-data. Written by card-pages-data.mjs; read by build-pages.mjs.', asOf: mc.asOf, cards: out }, null, 1) + '\n');
console.log(`${out.length} cards written to .github/card-pages.json` + (missing.length ? `; no text found for ${missing.join(', ')}` : ''));
