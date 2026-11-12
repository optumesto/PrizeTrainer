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
// Safety: a run that reads fewer cards than last week's file by more than a tenth keeps last
// week's file, and the file is only written when something changed.
//
// Usage: node build-cards.mjs [cards.json] [data.json]
//   PT_PTCG_DIR=dir reads <dir>/sets/en.json and <dir>/cards/en/<id>.json from disk instead.
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
const clean = (s, max) => String(s == null ? '' : s).replace(/[<>`\u0000-\u001f]/g, ' ').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().slice(0, max || 80);

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
let read = 0;
for (const s of wanted) {
  // Promos read PR-SV in this data; deck lists and the app write SVP.
  const code = s.id === 'svp' ? 'SVP' : String(s.ptcgoCode || (s.id === 'sve' ? 'SVE' : '')).toUpperCase();
  if (!/^[A-Z0-9]{2,5}$/.test(code)) continue;
  const cards = await getJSON(`cards/en/${s.id}.json`);
  if (!Array.isArray(cards)) continue;
  read++;
  for (const c of cards) {
    const sup = c.supertype === 'Pokémon' ? 'P' : c.supertype === 'Trainer' ? 'T' : c.supertype === 'Energy' ? 'E' : '';
    if (!sup) continue;
    const subs = c.subtypes || [];
    const basicE = sup === 'E' && (subs.includes('Basic') || s.id === 'sve') && /energy$/i.test(c.name) && !/special/i.test(c.name);
    if (!basicE && !legalMark(c.regulationMark)) continue;
    if (!/^[A-Za-z0-9]{1,8}$/.test(String(c.number || ''))) continue;
    const name = clean(c.name, 60);
    // A Trainer or Energy is one card per name. A Pokemon with the same name, HP, Abilities and
    // attacks is a reprint (small wording fixes between prints are not a new card).
    const text = sup === 'P' ? JSON.stringify([c.hp || '', (c.abilities || []).map(a => a.name), (c.attacks || []).map(a => a.name + '|' + (a.damage || ''))]) : '';
    const key = name.toLowerCase() + '|' + text;
    const print = { set: code, num: String(c.number), rar: rank(c.rarity), date: s.releaseDate || '', promo: s.id === 'svp' };
    const g = groups.get(key);
    if (g) { g.prints.push(print); continue; }
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
      e.tk = subs.includes('Supporter') ? 'S' : subs.includes('Stadium') ? 'D' : subs.includes('Pokémon Tool') ? 'O' : 'I';
      if (subs.includes('ACE SPEC')) e.ace = 1;
    } else {
      if (basicE) e.be = 1;
      else if (subs.includes('ACE SPEC')) e.ace = 1;
    }
    groups.set(key, { e, prints: [print] });
  }
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

if (old && Array.isArray(old.cards) && out.length < old.cards.length * 0.9) {
  console.log(`Read ${out.length} cards from ${read} sets, under last week's ${old.cards.length}. Kept last copy.`);
  process.exit(0);
}
const file = {
  schema: 1,
  asOf: new Date().toISOString().slice(0, 10),
  firstLegal: first,
  note: 'Standard legal cards for the RdyDeck deck builder, one per card (reprints count once), built weekly by build-cards.mjs from pokemon-tcg-data. Keys: n name, s set, no number, k P/T/E, st stage, ty types, hp, ef evolves from, need Energy types the main attack (most Energy, then most typed Energy, then most damage) asks for, na that attack, w Ability and attack names, tk Trainer kind (I Item, S Supporter, D Stadium, O Tool), ace ACE SPEC, be Basic Energy, pr prints.',
  cards: out,
};
const same = old && JSON.stringify({ ...old, asOf: null }) === JSON.stringify({ ...file, asOf: null });
if (same) { console.log(`cards.json: ${out.length} cards, nothing changed.`); process.exit(0); }
await writeFile(OUT, JSON.stringify(file).replace(/\},\{/g, '},\n{') + '\n');
console.log(`cards.json: ${out.length} cards from ${read} sets (first legal mark ${first}).`);
