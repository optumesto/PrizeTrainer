// Builds art-index.json and art-index.bin for photo deck import (js/photo-import.js): a small
// fingerprint of the picture of every print of every Standard legal card, so a deck screenshot
// can be matched card by card on the player's own device. 120 bytes a print.
//
// Card list: pokemon-tcg-data (the same source and the same legal rule as build-cards.mjs), every
// print, not one per card, since a screenshot shows whichever print the player owns.
// Pictures: the official card images on the Limitless CDN (the same images Pokemon TCG Live
// shows), then pokemontcg.io's if Limitless has none. Prints already in the index are kept, so a
// weekly run only reads new prints.
//
// Usage: node build-art-index.mjs [art-index.json] [art-index.bin] [data.json]
// Needs sharp (npm i sharp) to read PNG and JPEG files.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const PS = require('./js/photo-scan.js');
const sharp = require('sharp');

const OUT = process.argv[2] || 'art-index.json';
const BIN = process.argv[3] || 'art-index.bin';
const DATA = process.argv[4] || 'data.json';
const PTCG = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master';
const UA = 'RdyDeck-art-index/1.0 (+https://rdydeck.com/)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MARKS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const clean = (s, max) => String(s == null ? '' : s).replace(/[<>`\u0000-\u001f]/g, ' ').replace(/[–—]/g, '-').replace(/\s+/g, ' ').replace(/ ([\u2640\u2642])/g, '$1').trim().slice(0, max || 80);
// The same fixes build-cards.mjs makes to pokemon-tcg-data, where they touch a name or number.
const DATA_FIX = { 'zsv10pt5-80': { number: '80' } };

async function getJSON(path) {
  await sleep(250);
  const r = await fetch(`${PTCG}/${path}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) return null;
  return r.json();
}
async function getImage(urls) {
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      if (info.width < 100 || info.height < 140) continue;
      return { px: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), W: info.width, H: info.height, url: u };
    } catch (_) {}
  }
  return null;
}

/** The card itself inside a picture: scans can have a thin margin; TCG Live shows the card edge to edge. */
function cardBox(img) {
  const { W, H } = img;
  // Most images are the card exactly; fit the card's shape centred if the picture is a little off.
  const ar = W / H;
  if (Math.abs(ar - PS.CARD_AR) < 0.02) return { x: 0, y: 0, w: W, h: H };
  if (ar > PS.CARD_AR) { const w = H * PS.CARD_AR; return { x: (W - w) / 2, y: 0, w, h: H }; }
  const h = W / PS.CARD_AR; return { x: 0, y: (H - h) / 2, w: W, h };
}

const data = JSON.parse(await readFile(DATA, 'utf8'));
const first = String((data.rotation && data.rotation.firstLegal) || 'H').toUpperCase();
const legalMark = m => !!m && MARKS.indexOf(String(m).toUpperCase()) >= MARKS.indexOf(first);

let old = null;
try {
  const meta = JSON.parse(await readFile(OUT, 'utf8'));
  const bin = await readFile(BIN);
  if (meta.feat === PS.FEAT && bin.length >= meta.prints.length * PS.FEAT) old = { meta, bin };
} catch (_) {}
const kept = new Map();
if (old) old.meta.prints.forEach((p, i) => kept.set(p[1] + '|' + p[2], { name: old.meta.names[p[0]], f: old.bin.subarray(i * PS.FEAT, (i + 1) * PS.FEAT) }));

const sets = await getJSON('sets/en.json');
if (!Array.isArray(sets)) { console.log('Set list unreadable, kept last copy.'); process.exit(0); }
const wanted = sets.filter(s => /^(sv|zsv|rsv|me|svp$|sve$)/.test(s.id));
const prints = [], every = [];
for (const s of wanted) {
  const code = s.id === 'svp' ? 'SVP' : String(s.ptcgoCode || (s.id === 'sve' ? 'SVE' : '')).toUpperCase();
  if (!/^[A-Z0-9]{2,5}$/.test(code)) continue;
  const cards = await getJSON(`cards/en/${s.id}.json`);
  if (!Array.isArray(cards)) continue;
  for (const c0 of cards) {
    const c = DATA_FIX[c0.id] ? Object.assign({}, c0, DATA_FIX[c0.id]) : c0;
    const sup = c.supertype === 'Pokémon' ? 'P' : c.supertype === 'Trainer' ? 'T' : c.supertype === 'Energy' ? 'E' : '';
    if (!sup) continue;
    const basicE = sup === 'E' && ((c.subtypes || []).includes('Basic') || s.id === 'sve') && /energy$/i.test(c.name) && !/special/i.test(c.name);
    const num = String(c.number || '');
    if (!/^[A-Za-z0-9]{1,8}$/.test(num)) continue;
    every.push({ name: clean(c.name, 60), set: code, num, small: c.images && c.images.small, legal: basicE || legalMark(c.regulationMark) });
  }
}
// An older print still counts when a reprint of the same card is legal now (the app's own rule), and
// players keep their older art in Pokémon TCG Live, so every print of a card name that is legal now
// is matched, not only the newest ones.
const legalNames = new Set(every.filter(p => p.legal).map(p => p.name));
for (const p of every) if (legalNames.has(p.name)) { delete p.legal; prints.push(p); }
// Prints from data.json's newest sets that pokemon-tcg-data does not have yet are read from the
// deck lists the app already knows (builder.json), so a card out this week still matches.
try {
  const b = JSON.parse(await readFile('builder.json', 'utf8'));
  const have = new Set(prints.map(p => p.set + '|' + p.num));
  for (const d of b.decks || []) for (const c of d.cards || []) {
    const [name, set, num] = c;
    if (typeof name === 'string' && /^[A-Z][A-Z0-9]{1,4}$/.test(set || '') && /^[A-Za-z0-9]{1,6}$/.test(num || '') && !have.has(set + '|' + num)) {
      have.add(set + '|' + num); prints.push({ name: clean(name, 60), set, num });
    }
  }
} catch (_) {}

const pad = n => String(n).replace(/^0+(\d)/, '$1').padStart(3, '0');
const urlsFor = p => {
  const base = `https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/${p.set}/${p.set}`;
  const n = String(p.num).replace(/^0+(\d)/, '$1');
  const u = [`${base}_${pad(n)}_R_EN_XS.png`, `${base}_${pad(n)}_R_EN.png`, `${base}_${n}_R_EN_XS.png`];
  if (p.small) u.push(p.small);
  return u;
};

let fetched = 0, missing = 0;
const out = [];
const todo = prints.filter(p => !kept.has(p.set + '|' + p.num));
console.log(`${prints.length} prints, ${prints.length - todo.length} kept, ${todo.length} to read.`);
for (let k = 0; k < todo.length; k += 6) {
  await Promise.all(todo.slice(k, k + 6).map(async p => {
    const img = await getImage(urlsFor(p));
    if (!img) { missing++; return; }
    fetched++;
    kept.set(p.set + '|' + p.num, { name: p.name, f: PS.feat(img.px, img.W, img.H, cardBox(img)) });
  }));
  await sleep(150);
  if (k % 300 === 0) console.log(`  ${k} of ${todo.length}`);
}
for (const p of prints) { const e = kept.get(p.set + '|' + p.num); if (e) out.push({ name: e.name || p.name, set: p.set, num: p.num, f: e.f }); }
if (old && out.length < old.meta.prints.length * 0.9) { console.log(`Only ${out.length} prints, under the last ${old.meta.prints.length}. Kept last copy.`); process.exit(0); }
out.sort((a, b) => a.name.localeCompare(b.name) || a.set.localeCompare(b.set) || a.num.localeCompare(b.num, 'en', { numeric: true }));
const names = [...new Set(out.map(p => p.name))];
const ni = new Map(names.map((n, i) => [n, i]));
const meta = {
  v: 1, asOf: new Date().toISOString().slice(0, 10), feat: PS.FEAT, firstLegal: first,
  note: 'Photo deck import: one fingerprint (120 bytes in art-index.bin, in this order) of the picture of every print of every Standard legal card. Built by build-art-index.mjs. prints: [name index, set, number].',
  names, prints: out.map(p => [ni.get(p.name), p.set, p.num]),
};
const bin = Buffer.alloc(out.length * PS.FEAT);
out.forEach((p, i) => bin.set(p.f, i * PS.FEAT));
await writeFile(OUT, JSON.stringify(meta) + '\n');
await writeFile(BIN, bin);
console.log(`art-index: ${out.length} prints of ${names.length} cards (${fetched} read now, ${missing} with no picture).`);
