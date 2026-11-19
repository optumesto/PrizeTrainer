// Watch out for (hidden): the meta facts the Grade tab's "Watch out for" box reads.
// For each meta deck in meta-cards.json: which types its damage attackers are (Weakness is applied to
// damage only, so attacks and Abilities that put damage counters do not count), and which of its usual
// Pokemon damage the Bench. For a few cards that hit a plan (hand disruption, Item lock, Ability lock,
// Tool lock, Psyduck's Damp): what share of all top lists run them, and which decks run them most.
// Card text comes from pokemon-tcg-data, the same source build-cards.mjs reads, matched by set and number.
// The result is written into js/v83-watch-out.js between the WO83_DATA markers.
//
//   node watch-out-data.mjs                 reads pokemon-tcg-data from GitHub (about 30 requests)
//   PT_PTCG_DIR=dir node watch-out-data.mjs  reads a local copy (sets/en.json, cards/en/<set>.json)
import { readFile, writeFile } from 'node:fs/promises';

const PTCG = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master';
const DIR = process.env.PT_PTCG_DIR || '';
const UA = 'RdyDeck-watch-out/1.0 (+https://rdydeck.com/)';
const OUT = 'js/v83-watch-out.js';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let calls = 0;
async function getJSON(path) {
  if (DIR) { try { return JSON.parse(await readFile(`${DIR}/${path}`, 'utf8')); } catch (_) { return null; } }
  if (++calls > 60) throw new Error('request budget used up');
  await sleep(300);
  const r = await fetch(`${PTCG}/${path}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) return null;
  return r.json();
}

const TYPE = { Grass: 'G', Fire: 'R', Water: 'W', Lightning: 'L', Psychic: 'P', Fighting: 'F', Darkness: 'D', Metal: 'M', Fairy: 'Y', Dragon: 'N', Colorless: 'C' };
// The cards the box warns about. part P or T as in meta-cards.json.
const THREATS = {
  hand: ['Judge', 'Unfair Stamp', "Xerosic's Machinations"],
  item: ['Budew'],
  tower: ["Team Rocket's Watchtower"],
  tool: ['Jamming Tower', 'Tool Scrapper'],
  damp: ['Psyduck'],
};
const MIN_SHARE = 0.5;   // a Pokemon at least half of a deck's top lists run
const MIN_COPIES = 1.5;  // and on average at least this many copies across all its top lists

const mc = JSON.parse(await readFile('meta-cards.json', 'utf8'));
const sets = await getJSON('sets/en.json');
if (!Array.isArray(sets)) { console.log('Set list unreadable, nothing written.'); process.exit(0); }
const code = s => s.id === 'svp' ? 'SVP' : String(s.ptcgoCode || (s.id === 'sve' ? 'SVE' : '')).toUpperCase();
const wanted = sets.filter(s => /^(sv|zsv|rsv|me|svp$|sve$)/.test(s.id));
const byPrint = new Map(), byName = new Map();
for (const s of wanted) {
  const cards = await getJSON(`cards/en/${s.id}.json`);
  if (!Array.isArray(cards)) continue;
  for (const c of cards) {
    byPrint.set(code(s) + ' ' + String(c.number).replace(/^0+(?=\d)/, ''), c);
    if (c.attacks || c.abilities || c.rules) byName.set(c.name, c);
  }
}
const find = (n, set, no) => byPrint.get(set + ' ' + String(no).replace(/^0+(?=\d)/, '')) || byName.get(n) || null;

/** What a Pokemon does to the opponent: damage by type, damage counters, Bench damage. */
function reads(c) {
  let dmg = 0, counters = false, bench = false;
  for (const a of c.attacks || []) {
    const t = a.text || '';
    let d = parseInt(a.damage, 10) || 0;
    if (/[×x]$/.test(a.damage || '')) d *= 3;   // "30×": a few times over
    if (/\+$/.test(a.damage || '')) d += 60;     // "20+": usually more
    dmg = Math.max(dmg, d);
    if (/damage counters? on (?:1 of )?your opponent's/i.test(t)) counters = true;
    if (/(?:damage|damage counters?) (?:to|on) (?:1 of |2 of |each of |any of )?your opponent's Benched Pok[eé]mon/i.test(t)
      || /your opponent's Benched Pok[eé]mon in any way you like/i.test(t)
      || /Weakness and Resistance for Benched Pok[eé]mon/i.test(t)) bench = true;
  }
  return { dmg, counters, bench, types: (c.types || []).map(t => TYPE[t] || '').filter(Boolean) };
}

const decks = {};
const notRead = new Set();
for (const d of mc.decks) {
  const w = {}; let all = 0; const spread = [];
  for (const c of d.cards) {
    if (c[3] !== 'P' || c[6] < MIN_SHARE) continue;
    const copies = c[5] * c[6];
    if (copies < MIN_COPIES) continue;
    const card = find(c[0], c[1], c[2]);
    if (!card) { notRead.add(c[0]); continue; }
    const r = reads(card);
    if (r.bench) spread.push(c[0]);
    if (r.dmg >= 100) {
      const v = copies * r.dmg;
      all += v;
      for (const t of r.types) w[t] = (w[t] || 0) + v / r.types.length;
    } else if (r.counters) all += copies * 150;   // damage counters: no Weakness, but part of the plan
  }
  const t = {};
  for (const k in w) { const f = Math.round(w[k] / all * 100) / 100; if (f >= 0.2) t[k] = f; }
  decks[d.id] = { t, ...(spread.length ? { sp: [...new Set(spread)] } : {}) };
}

// Card shares: of all top lists, how many run each card; and the decks that run it most.
const tops = mc.decks.reduce((a, d) => a + d.lists, 0) || 1;
const cards = {};
for (const group of Object.values(THREATS)) for (const name of group) {
  let n = 0; const by = [];
  for (const d of mc.decks) {
    const c = d.cards.find(x => x[0] === name);
    if (!c) continue;
    n += d.lists * c[6];
    if (c[6] >= 0.25) by.push([d.id, Math.round(c[6] * 100) / 100]);
  }
  cards[name] = { s: Math.round(n / tops * 1000) / 1000, d: by.sort((a, b) => b[1] - a[1]).slice(0, 12) };
}

const data = { asOf: mc.asOf, decks, cards };
const src = await readFile(OUT, 'utf8');
const A = '/* WO83_DATA_START */', B = '/* WO83_DATA_END */';
const i = src.indexOf(A), j = src.indexOf(B);
if (i < 0 || j < i) throw new Error('WO83_DATA markers missing in ' + OUT);
const body = '\nconst WO83_DATA = ' + JSON.stringify(data)
  .replace(/,"(?=[a-z0-9-]+":\{"t")/g, ',\n  "').replace(/\{"asOf"/, '{\n  "asOf"') + ';\n';
await writeFile(OUT, src.slice(0, i + A.length) + body + src.slice(j));
console.log(`${Object.keys(decks).length} decks, ${Object.keys(cards).length} cards written to ${OUT}.`);
if (notRead.size) console.log('Not read: ' + [...notRead].join(', '));
