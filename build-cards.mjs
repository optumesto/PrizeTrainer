// Builds cards.json for RdyDeck's deck builder: every card that is legal in Standard now, one
// entry per card (reprints with the same name and text count once), with a set code and number
// that match a real print. Run weekly by .github/workflows/refresh-data.yml.
//
// Source: pokemon-tcg-data (github.com/PokemonTCG/pokemon-tcg-data), the same card data the app
// reads through pokemontcg.io. One set list, then one file per Scarlet and Violet or Mega
// Evolution set: about 35 requests to raw.githubusercontent.com a week.
//
// What counts as legal: a regulation mark at or after rotation.firstLegal in data.json, plus the
// Basic Energy cards (they have no mark and never rotate). Cards in data.json's newest sets that
// pokemon-tcg-data does not have yet (promos, a set out this week) are added by the app from the
// meta lists in builder.json, so a missing card still shows with its own set and number.
//
// 3.5: pokemon-tcg-data has no MEP promos and lags on new SVP promos, so those two promo sets are
// also read card by card from TCGdex's card database (github.com/tcgdex/cards-database), about 200
// small files a week. Its files are TypeScript; they are read as data by a small parser, never run.
// Every card in the meta lists (meta-cards.json) is then checked against the result, and any card
// still missing is printed as a warning and kept in the file's "missing" list.
//
// Safety: a run that reads fewer cards than last week's file by more than a tenth keeps last
// week's file, and the file is only written when something changed.
//
// Usage: node build-cards.mjs [cards.json] [data.json]
//   PT_PTCG_DIR=dir reads <dir>/sets/en.json and <dir>/cards/en/<id>.json from disk instead.
//   PT_TCGDEX_DIR=dir reads the promo files from a local copy of the TCGdex cards database.
//   PT_META=file sets the meta lists to check against (default meta-cards.json beside cards.json).
import { readFile, writeFile } from 'node:fs/promises';

const OUT = process.argv[2] || 'cards.json';
const DATA = process.argv[3] || 'data.json';
const PTCG = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master';
const DIR = process.env.PT_PTCG_DIR || '';
const UA = 'RdyDeck-cards/1.0 (+https://rdydeck.com/)';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let calls = 0;
async function getJSON(path) {
  if (DIR) { try { return JSON.parse(await readFile(`${DIR}/${path}`, 'utf8')); } catch (_) { return null; } }
  if (++calls > 60) throw new Error('request budget used up');
  if (!process.env.PT_NO_PAUSE) await sleep(300);
  const r = await fetch(`${PTCG}/${path}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
  if (r.status === 429) throw new Error('rate limited, stopping');
  if (!r.ok) return null;
  return r.json();
}

const MARKS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const TYPE = { Grass: 'G', Fire: 'R', Water: 'W', Lightning: 'L', Psychic: 'P', Fighting: 'F', Darkness: 'D', Metal: 'M', Fairy: 'Y', Dragon: 'N', Colorless: 'C' };
// Lower is the print to show: the plain one first, so the number matches the card most people own.
const RARITY = ['Common', 'Uncommon', 'Rare', 'Double Rare', 'Rare Holo', 'Promo', 'ACE SPEC Rare', 'Ultra Rare', 'Illustration Rare', 'Shiny Rare', 'Special Illustration Rare', 'Shiny Ultra Rare', 'Hyper Rare', 'Mega Hyper Rare'];
const rank = r => { const i = RARITY.indexOf(r || ''); return i < 0 ? 9 : i; };
const clean = (s, max) => String(s == null ? '' : s).replace(/[<>`\u0000-\u001f]/g, ' ').replace(/[–—]/g, '-').replace(/\s+/g, ' ').replace(/ ([\u2640\u2642])/g, '$1').trim().slice(0, max || 80);   // 2.5.5: "Nidoran ♀" and "Nidoran♀" are one name
// 2.5.5: pokemon-tcg-data mistakes, checked against Limitless and TCGdex on 13 Nov 2026.
// The app's own FIX37 table in index.html carries the same fixes for the grader.
const DATA_FIX = {
  'zsv10pt5-80': { number: '80' },                                   // Antique Cover Fossil is listed as BLK 60, which is Escavalier
  'rsv10pt5-50': { evolvesFrom: 'Antique Plume Fossil' }, 'rsv10pt5-131': { evolvesFrom: 'Antique Plume Fossil' },   // Archen: "Antiuqe"
  'me55-96': { evolvesFrom: 'Zorua' },                               // Zoroark: nothing to evolve from
  'me5-115': { subtypes: ['Stage 2', 'MEGA', 'ex'] },               // Mega Chandelure ex: no stage
  'me5-42': { subtypes: ['Basic'] },                                 // Mankey: no stage
  'me6-132': { subtypes: ['Special'] }, 'me6-133': { subtypes: ['Special'] }, 'me6-134': { subtypes: ['Special'] },   // Delta Reign Special Energy: no subtype
};

const data = JSON.parse(await readFile(DATA, 'utf8'));
const first = String((data.rotation && data.rotation.firstLegal) || 'H').toUpperCase();
const legalMark = m => !!m && MARKS.indexOf(String(m).toUpperCase()) >= MARKS.indexOf(first);

let old = null;
try { old = JSON.parse(await readFile(OUT, 'utf8')); } catch (_) {}

const sets = await getJSON('sets/en.json');
if (!Array.isArray(sets)) { console.log('Set list unreadable, kept last copy.'); process.exit(0); }
// Scarlet and Violet onward: sv*, zsv/rsv (Black Bolt, White Flare), me*, svp, sve.
const wanted = sets.filter(s => /^(sv|zsv|rsv|me|svp$|sve$)/.test(s.id));

const groups = new Map();
// 3.3.6: printings that play exactly the same, for De-bling. A Trainer or Energy is one card per name
// (the game's own rule: cards with the same name are the same card, newest text applies). A Pokemon
// needs the whole game text to match: HP, types, stage and the other subtypes, evolves from, every
// Ability and attack with its cost, damage and text, weakness, resistance and retreat. Case, spaces and
// punctuation are set aside, so a wording fix between prints still matches, and so are the rule-box
// reminder lines some prints leave out (ex and Mega rules, which the subtypes already carry).
const plays = new Map();
const flat = v => String(v == null ? '' : v).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const REMIND = /^(pokemonexrule|megaevolutionexrule|tera)/;
function playKey(c, sup) {
  if (sup !== 'P') return flat(c.name) + '#' + sup;
  return [flat(c.name), sup, flat(c.hp), (c.types || []).map(flat).join(','), (c.subtypes || []).map(flat).sort().join(','), flat(c.evolvesFrom),
    (c.abilities || []).map(a => flat(a.type) + ':' + flat(a.name) + ':' + flat(a.text)).join('|'),
    (c.attacks || []).map(a => (a.cost || []).map(flat).join(',') + ':' + flat(a.name) + ':' + flat(a.damage) + ':' + flat(a.text)).join('|'),
    (c.weaknesses || []).map(w => flat(w.type) + flat(w.value)).join(','), (c.resistances || []).map(w => flat(w.type) + flat(w.value)).join(','),
    String((c.retreatCost || []).length), (c.rules || []).map(flat).filter(r => r && !REMIND.test(r)).join('|')].join('#');
}
let read = 0;
const PROMO = new Set(['SVP', 'MEP']);
const maxNum = {};   // highest number read per set code, so the TCGdex pass starts after it
function addCard(c, s, code) {
  {
    const sup = c.supertype === 'Pokémon' ? 'P' : c.supertype === 'Trainer' ? 'T' : c.supertype === 'Energy' ? 'E' : '';
    if (!sup) return;
    const subs = c.subtypes || [];
    const basicE = sup === 'E' && (subs.includes('Basic') || s.id === 'sve') && /energy$/i.test(c.name) && !/special/i.test(c.name);
    if (/^[A-Za-z0-9]{1,8}$/.test(String(c.number || ''))) {
      // 3.3.6: every printing, legal or not, with its whole game text, for De-bling (prints.json).
      const pk = playKey(c, sup);
      const g = plays.get(pk) || plays.set(pk, { n: clean(c.name, 60), k: sup, p: [], o: [] }).get(pk);
      const print = { set: code, num: String(c.number), rar: rank(c.rarity), date: s.releaseDate || '', promo: PROMO.has(code), mark: String(c.regulationMark || '').toUpperCase().slice(0, 1) };
      (basicE || legalMark(c.regulationMark) ? g.p : g.o).push(print);
    }
    if (!basicE && !legalMark(c.regulationMark)) return;
    if (!/^[A-Za-z0-9]{1,8}$/.test(String(c.number || ''))) return;
    const name = clean(c.name, 60);
    // A Trainer or Energy is one card per name. A Pokemon with the same name, HP, Abilities and
    // attacks is a reprint (small wording fixes between prints are not a new card).
    const text = sup === 'P' ? JSON.stringify([c.hp || '', (c.abilities || []).map(a => a.name), (c.attacks || []).map(a => a.name + '|' + (a.damage || ''))]) : '';
    const key = name.toLowerCase() + '|' + text;
    const print = { set: code, num: String(c.number), rar: rank(c.rarity), date: s.releaseDate || '', promo: PROMO.has(code) };
    const g = groups.get(key);
    if (g) { g.prints.push(print); return; }
    const e = { n: name, k: sup };
    if (sup === 'P') {
      e.st = subs.includes('Stage 2') ? 2 : subs.includes('Stage 1') ? 1 : 0;
      if (subs.includes('ex')) e.ex = 1;
      if (subs.includes('MEGA')) e.mega = 1;
      if (subs.includes('Tera')) e.tera = 1;
      if (/^radiant /i.test(name)) e.rad = 1;
      e.ty = (c.types || []).map(t => TYPE[t] || '').join('');
      e.hp = parseInt(c.hp, 10) || 0;
      if (c.evolvesFrom) e.ef = clean(c.evolvesFrom, 60);
      // The main attack: the one that costs the most Energy, then the one that asks for the most
      // typed Energy, then the one with the most printed damage, then the later one. Its name and the Energy types its cost asks for, Colorless left
      // out, so the builder can check the list's Energy. Reading only the last attack missed a main
      // first attack and warned from a Colorless filler.
      const dmg = a => parseInt(String(a.damage || '').replace(/[^0-9]/g, ''), 10) || 0;
      const cost = a => (a.cost || []).filter(t => t !== 'Free').length;
      const typed = a => (a.cost || []).filter(t => t !== 'Colorless' && t !== 'Free').length;
      const rank = a => [cost(a), typed(a), dmg(a)];
      const better = (a, b) => { const x = rank(a), y = rank(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return true; };
      const last = (c.attacks || []).reduce((b, a) => (!b || better(a, b) ? a : b), null);
      if (last) {
        const need = [...new Set((last.cost || []).filter(t => t !== 'Colorless' && TYPE[t]).map(t => TYPE[t]))].join('');
        if (need) { e.need = need; e.na = clean(last.name, 30); }
      }
      const words = [...(c.abilities || []).map(a => a.name), ...(c.attacks || []).map(a => a.name)].map(w => clean(w, 30));
      if (words.length) e.w = words.join(', ').slice(0, 90);
    } else if (sup === 'T') {
      // 2.5.5: a "Tool" whose text never attaches it is an Item (Adventure Lantern is listed as a Tool).
      const tool = subs.includes('Pokémon Tool') && !((c.rules || []).join(' ').trim() && !/\battach/i.test((c.rules || []).join(' ')));
      e.tk = subs.includes('Supporter') ? 'S' : subs.includes('Stadium') ? 'D' : tool ? 'O' : 'I';
      if (subs.includes('ACE SPEC')) e.ace = 1;
    } else {
      if (basicE) e.be = 1;
      else if (subs.includes('ACE SPEC')) e.ace = 1;
    }
    groups.set(key, { e, prints: [print] });
  }
}
for (const s of wanted) {
  // Promos read PR-SV in this data; deck lists and the app write SVP.
  const code = s.id === 'svp' ? 'SVP' : String(s.ptcgoCode || (s.id === 'sve' ? 'SVE' : '')).toUpperCase();
  if (!/^[A-Z0-9]{2,5}$/.test(code)) continue;
  const cards = await getJSON(`cards/en/${s.id}.json`);
  if (!Array.isArray(cards)) continue;
  read++;
  for (const c0 of cards) {
    const n = parseInt(c0.number, 10);
    if (n > (maxNum[code] || 0)) maxNum[code] = n;
    addCard(DATA_FIX[c0.id] ? Object.assign({}, c0, DATA_FIX[c0.id]) : c0, s, code);
  }
}

// 3.5: promos pokemon-tcg-data does not have, read from TCGdex's card database one file at a time.
// A set's files are numbered 001, 002 and so on; reading stops after 5 numbers in a row with no file.
const TCGDEX = 'https://raw.githubusercontent.com/tcgdex/cards-database/master/data';
const TDIR = process.env.PT_TCGDEX_DIR || '';
const TPROMO = [
  { code: 'SVP', id: 'svp', dir: 'Scarlet & Violet/SVP Black Star Promos', date: '2023/03/31' },
  { code: 'MEP', id: 'mep', dir: 'Mega Evolution/MEP Black Star Promos', date: '2025/09/26' },
];
let tcalls = 0;
async function getTS(path) {
  if (TDIR) { try { return await readFile(`${TDIR}/${path}`, 'utf8'); } catch (_) { return null; } }
  if (++tcalls > 400) throw new Error('TCGdex request budget used up');
  if (!process.env.PT_NO_PAUSE) await sleep(100);
  const r = await fetch(`${TCGDEX}/${path.split('/').map(encodeURIComponent).join('/')}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
  if (r.status === 429) throw new Error('rate limited, stopping');
  return r.ok ? r.text() : null;
}
// Reads the card object in a TCGdex .ts file as plain data: objects, arrays, quoted strings (joined
// with +), numbers, true, false and null. Anything else (a function call, a template string) makes
// the card unreadable and it is skipped, so nothing in the file ever runs.
function tsCard(src) {
  const at = src.indexOf('const card'); if (at < 0) return null;
  let i = src.indexOf('{', at); if (i < 0) return null;
  const ws = () => { for (;;) { while (/\s/.test(src[i] || '')) i++; if (src.startsWith('//', i)) { while (i < src.length && src[i] !== '\n') i++; } else if (src.startsWith('/*', i)) { const j = src.indexOf('*/', i + 2); i = j < 0 ? src.length : j + 2; } else return; } };
  const str = () => { const q = src[i++]; let o = ''; while (i < src.length && src[i] !== q) { if (src[i] === '\\') { const n = src[++i]; o += n === 'n' ? '\n' : n === 't' ? '\t' : n === 'u' ? String.fromCharCode(parseInt(src.slice(i + 1, i + 5), 16)) : n; if (n === 'u') i += 4; i++; } else o += src[i++]; } if (src[i] !== q) throw 0; i++; return o; };
  const val = () => {
    ws(); const ch = src[i];
    if (ch === '{') { i++; const o = {}; for (;;) { ws(); if (src[i] === '}') { i++; return o; } let k; if (src[i] === '"' || src[i] === "'") k = str(); else { const m = /^[A-Za-z_$][\w$-]*/.exec(src.slice(i)); if (!m) throw 0; k = m[0]; i += k.length; } ws(); if (src[i] === ',' || src[i] === '}') { o[k] = undefined; if (src[i] === ',') i++; continue; } if (src[i] !== ':') throw 0; i++; o[k] = val(); ws(); if (src[i] === ',') i++; } }
    if (ch === '[') { i++; const a = []; for (;;) { ws(); if (src[i] === ']') { i++; return a; } a.push(val()); ws(); if (src[i] === ',') i++; } }
    if (ch === '"' || ch === "'") { let o = str(); for (;;) { ws(); if (src[i] !== '+') return o; i++; ws(); if (src[i] !== '"' && src[i] !== "'") throw 0; o += str(); } }
    const m = /^(-?\d+(?:\.\d+)?|true|false|null|[A-Za-z_$][\w$]*)/.exec(src.slice(i)); if (!m) throw 0; i += m[0].length;
    if (/^-?\d/.test(m[0])) return Number(m[0]); if (m[0] === 'true') return true; if (m[0] === 'false') return false; if (m[0] === 'null') return null;
    ws(); if (src[i] === '(' || src[i] === '`') throw 0; return undefined;   // a bare name (set: Set) carries no card data
  };
  try { return val(); } catch (_) { return null; }
}
const en = v => (v && typeof v === 'object' ? v.en : v) || '';
const STAGE = { Basic: 'Basic', Stage1: 'Stage 1', Stage2: 'Stage 2', 'Stage 1': 'Stage 1', 'Stage 2': 'Stage 2' };
const TKIND = { Supporter: 'Supporter', Item: 'Item', Tool: 'Pokémon Tool', Stadium: 'Stadium' };
// The same shape pokemon-tcg-data uses, so the card goes through addCard like any other.
function fromTCGdex(t, num) {
  const cat = t.category, name = en(t.name);
  if (!name || !/^(Pokemon|Trainer|Energy)$/.test(cat)) return null;
  const subtypes = [];
  if (cat === 'Pokemon') {
    if (STAGE[t.stage]) subtypes.push(STAGE[t.stage]);
    if (/^mega /i.test(name)) subtypes.push('MEGA');
    if (String(t.suffix || '').toLowerCase() === 'ex' || / ex$/.test(name)) subtypes.push('ex');
    if (t.suffix === 'Tera' || /\btera\b/i.test(JSON.stringify(t.attributes || ''))) subtypes.push('Tera');
  } else if (cat === 'Trainer') { if (TKIND[t.trainerType]) subtypes.push(TKIND[t.trainerType]); }
  else subtypes.push(t.energyType === 'Normal' ? 'Basic' : 'Special');
  if (/ace\s*spec/i.test(String(t.rarity || '')) || t.trainerType === 'ACE SPEC') subtypes.push('ACE SPEC');
  const rulesText = cat === 'Pokemon' ? '' : en(t.effect);
  return {
    id: '', name, number: String(num), rarity: t.rarity === 'None' ? '' : (t.rarity || 'Promo'), regulationMark: t.regulationMark || '',
    supertype: cat === 'Pokemon' ? 'Pokémon' : cat, subtypes, hp: t.hp != null ? String(t.hp) : undefined, types: t.types || [],
    evolvesFrom: en(t.evolveFrom) || undefined,
    abilities: (t.abilities || []).map(a => ({ type: a.type || 'Ability', name: en(a.name), text: en(a.effect) })),
    attacks: (t.attacks || []).map(a => ({ cost: a.cost || [], name: en(a.name), damage: a.damage != null ? String(a.damage) : '', text: en(a.effect) })),
    weaknesses: (t.weaknesses || []).map(w => ({ type: w.type, value: String(w.value || '').replace('×', '×') })),
    resistances: (t.resistances || []).map(w => ({ type: w.type, value: String(w.value || '') })),
    retreatCost: Array.from({ length: +t.retreat || 0 }, () => 'Colorless'),
    rules: rulesText ? [rulesText] : [],
  };
}
let tread = 0, tadded = 0;
for (const p of TPROMO) {
  let n = p.code === 'SVP' ? (maxNum.SVP || 0) + 1 : 1, miss = 0, got = 0;
  const before = groups.size;
  while (miss < 5 && n < 1000) {
    let src = null;
    for (const f of [String(n).padStart(3, '0'), String(n)]) { src = await getTS(`${p.dir}/${f}.ts`); if (src) break; }
    if (!src) { miss++; n++; continue; }
    miss = 0; got++;
    const t = tsCard(src), c = t && fromTCGdex(t, n);
    if (c) addCard(c, { id: p.id, releaseDate: p.date }, p.code);
    n++;
  }
  if (got) tread++;
  tadded += groups.size - before;
  console.log(`TCGdex ${p.code}: ${got} files read, ${groups.size - before} new cards.`);
}

const out = [];
for (const { e, prints } of groups.values()) {
  // The print to show: not a promo if there is another, the plainest rarity, then the newest set.
  prints.sort((a, b) => (a.promo - b.promo) || (a.rar - b.rar) || (b.date > a.date ? 1 : b.date < a.date ? -1 : 0) || (parseInt(a.num, 10) - parseInt(b.num, 10)));
  e.s = prints[0].set; e.no = prints[0].num;
  if (prints.length > 1) e.pr = prints.length;
  out.push(e);
}
out.sort((a, b) => a.n.localeCompare(b.n) || (a.s + a.no).localeCompare(b.s + b.no));

// 3.5: every card the meta decks run must be in the file. Any that is not is a gap in the card data,
// printed as a GitHub warning so the weekly run flags it, and kept in the file's "missing" list.
const missing = [];
{
  const META = process.env.PT_META || OUT.replace(/cards\.json$/, 'meta-cards.json');
  let meta = null;
  try { meta = JSON.parse(await readFile(META, 'utf8')); } catch (_) {}
  if (meta && Array.isArray(meta.decks)) {
    const key = n => flat(clean(n, 60)).replace(/^basic(?=\w+energy$)/, '');
    const have = new Set(out.map(e => key(e.n)));
    const seen = new Set();
    for (const d of meta.decks) for (const c of d.cards || []) {
      if (!Array.isArray(c) || typeof c[0] !== 'string' || typeof c[1] !== 'string' || typeof c[2] !== 'string') continue;
      const k = key(c[0]); if (have.has(k) || seen.has(k)) continue;
      seen.add(k); missing.push(`${clean(c[0], 60)} ${clean(c[1], 6)} ${clean(c[2], 8)}`);
    }
    if (missing.length) console.log(`::warning::${missing.length} meta cards missing from cards.json: ${missing.join('; ')}`);
    else console.log('Every card in the meta lists is in cards.json.');
  } else console.log('No meta lists to check cards.json against.');
}

if (old && Array.isArray(old.cards) && out.length < old.cards.length * 0.9) {
  console.log(`Read ${out.length} cards from ${read} sets, under last week's ${old.cards.length}. Kept last copy.`);
  process.exit(0);
}
const file = {
  schema: 1,
  asOf: new Date().toISOString().slice(0, 10),
  firstLegal: first,
  note: 'Standard legal cards for the RdyDeck deck builder, one per card (reprints count once), built weekly by build-cards.mjs from pokemon-tcg-data, with SVP and MEP promos from TCGdex. Keys: n name, s set, no number, k P/T/E, st stage, ty types, hp, ef evolves from, need Energy types the main attack (most Energy, then most typed Energy, then most damage) asks for, na that attack, w Ability and attack names, tk Trainer kind (I Item, S Supporter, D Stadium, O Tool), ace ACE SPEC, be Basic Energy, pr prints.',
  cards: out,
};
if (missing.length) file.missing = missing;
// 3.3.6: prints.json, for De-bling. One row per card with more than one printing that plays the same:
// p the Standard legal printings (the ones De-bling may swap to), plainest first; o older printings of
// the same card (a deck may run one; De-bling never swaps to it); m the marks of p, in order.
{
  const POUT = process.env.PT_PRINTS_OUT || OUT.replace(/cards\.json$/, 'prints.json');
  const ord = (a, b) => (a.promo - b.promo) || (a.rar - b.rar) || (b.date > a.date ? 1 : b.date < a.date ? -1 : 0) || (parseInt(a.num, 10) - parseInt(b.num, 10));
  const id = x => x.set + ' ' + x.num;
  const rows = [];
  for (const g of plays.values()) {
    const pm = new Map(g.p.sort(ord).map(x => [id(x), x]));
    const p = [...pm.keys()];
    const o = [...new Set(g.o.sort(ord).map(id))].filter(x => !p.includes(x));
    if (!p.length || p.length + o.length < 2) continue;
    const r = { n: g.n, k: g.k, p };
    const m = [...pm.values()].map(x => /^[A-Z]$/.test(x.mark) ? x.mark : '-').join('');
    if (/[A-Z]/.test(m)) r.m = m;
    if (o.length) r.o = o;
    rows.push(r);
  }
  rows.sort((a, b) => a.n.localeCompare(b.n) || a.p[0].localeCompare(b.p[0]));
  let pold = null;
  try { pold = JSON.parse(await readFile(POUT, 'utf8')); } catch (_) {}
  if (pold && Array.isArray(pold.rows) && rows.length < pold.rows.length * 0.9) console.log(`prints.json: ${rows.length} rows, under last week's ${pold.rows.length}. Kept last copy.`);
  else {
    const pf = { schema: 1, asOf: new Date().toISOString().slice(0, 10), firstLegal: first,
      note: 'Printings that play exactly the same, for RdyDeck\'s De-bling, built weekly by build-cards.mjs from pokemon-tcg-data. Keys: n name, k P/T/E, p Standard legal printings (set and number, plainest first), m their regulation marks in the same order (- for none), o older printings of the same card.',
      rows };
    if (pold && JSON.stringify({ ...pold, asOf: null }) === JSON.stringify({ ...pf, asOf: null })) console.log(`prints.json: ${rows.length} rows, nothing changed.`);
    else { await writeFile(POUT, JSON.stringify(pf).replace(/\},\{/g, '},\n{') + '\n'); console.log(`prints.json: ${rows.length} rows.`); }
  }
}
const same = old && JSON.stringify({ ...old, asOf: null }) === JSON.stringify({ ...file, asOf: null });
if (same) { console.log(`cards.json: ${out.length} cards, nothing changed.`); process.exit(0); }
await writeFile(OUT, JSON.stringify(file).replace(/\},\{/g, '},\n{') + '\n');
console.log(`cards.json: ${out.length} cards from ${read} sets and ${tread} TCGdex promo sets (first legal mark ${first}).`);
