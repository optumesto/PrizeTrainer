// Makes test screenshots for photo deck import: real deck lists laid out the way deck apps show
// them (a grid of whole cards with a count on each), on dark and light screens, phone, tablet and
// PC sizes, PNG and JPEG. The card pictures come from pokemontcg.io's scans, not from the
// Limitless images the index is built from, so a match has to survive a different picture of the
// same card. These stand in until real Pokemon TCG Live screenshots are added to tests/photo-import/real/.
//
// Usage: node tests/photo-import/make-shots.mjs <out dir>   (needs sharp; reads data.json and builder.json)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const OUT = process.argv[2] || 'shots';
await mkdir(OUT, { recursive: true });
const UA = 'RdyDeck-tests/1.0 (+https://rdydeck.com/)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
// PT_CARD_DIR=dir: offline run, card pictures from <dir>/<set>_<num>.png and decks from <dir>/decks.json.
const LOCAL = process.env.PT_CARD_DIR || '';
const data = JSON.parse(await readFile('data.json', 'utf8'));
const builder = JSON.parse(await readFile('builder.json', 'utf8'));
const sets = LOCAL ? [] : await (await fetch('https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/sets/en.json')).json();
const idOf = {};
for (const s of sets) { const c = s.id === 'svp' ? 'SVP' : String(s.ptcgoCode || (s.id === 'sve' ? 'SVE' : '')).toUpperCase(); if (c && !idOf[c]) idOf[c] = s.id; }

function parseList(t) {
  const out = [];
  for (const l of String(t).split('\n')) {
    const m = l.trim().match(/^(\d+) (.+) ([A-Z][A-Z0-9]{1,4}) ([A-Za-z0-9]{1,6})$/);
    if (m) out.push({ count: +m[1], name: m[2], set: m[3], num: m[4] });
  }
  return out;
}
const decks = LOCAL ? JSON.parse(await readFile(`${LOCAL}/decks.json`, 'utf8')) : data.starters.map(s => ({ id: s.id, cards: parseList(s.list) }));
if (!LOCAL) for (const d of builder.decks.slice(0, 6)) {
  const cards = d.cards.filter(c => c[4] > 0).map(c => ({ count: c[4], name: c[0], set: c[1], num: c[2] }));
  if (cards.length >= 8) decks.push({ id: 'b-' + d.id, cards });
}

const cache = new Map();
async function cardPng(c) {
  const key = c.set + '|' + c.num;
  if (cache.has(key)) return cache.get(key);
  if (LOCAL) { try { cache.set(key, { buf: await readFile(`${LOCAL}/${c.set}_${c.num}.png`), src: 'local' }); } catch (_) { cache.set(key, null); } return cache.get(key); }
  const n = String(c.num).replace(/^0+(\d)/, '$1'), pad = n.padStart(3, '0');
  const urls = [];
  if (idOf[c.set]) urls.push(`https://images.pokemontcg.io/${idOf[c.set]}/${n}_hires.png`, `https://images.pokemontcg.io/${idOf[c.set]}/${n}.png`);
  urls.push(`https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/${c.set}/${c.set}_${pad}_R_EN.png`);
  for (const u of urls) {
    try {
      await sleep(80);
      const r = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      cache.set(key, { buf, src: u.includes('pokemontcg') ? 'ptcgio' : 'limitless' });
      return cache.get(key);
    } catch (_) {}
  }
  cache.set(key, null);
  return null;
}

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
// Each layout: screen size, columns, gap, background, and where and how the count sits.
const LAYOUTS = [
  { id: 'phone-dark', W: 1080, H: 2340, cols: 4, gap: 0.05, bg: ['#0f1630', '#1d2652'], badge: 'circle-bottom', dark: true },
  { id: 'phone-light', W: 1080, H: 2340, cols: 4, gap: 0.06, bg: ['#eef1f6', '#e2e7f0'], badge: 'pill-corner', dark: false },
  { id: 'pc-dark', W: 1920, H: 1080, cols: 10, gap: 0.06, bg: ['#151a2e', '#151a2e'], badge: 'circle-top', dark: true, top: 90 },
  { id: 'tablet-tight', W: 2000, H: 1200, cols: 8, gap: 0.012, bg: ['#20263f', '#2b3357'], badge: 'circle-bottom', dark: true },
  { id: 'phone-small', W: 720, H: 1560, cols: 5, gap: 0.04, bg: ['#0f1630', '#1d2652'], badge: 'x-below', dark: true },
];

function badgeSvg(L, n, cw, ch) {
  const s = Math.round(cw * 0.26), f = Math.round(s * 0.62);
  if (L.badge === 'circle-bottom') return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${s / 2 - 1}" fill="#0b0f1e" stroke="#ffffff" stroke-width="${Math.max(1, s * 0.06)}"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-family="DejaVu Sans" font-weight="bold" font-size="${f}" fill="#fff">${n}</text></svg>`, dx: (cw - s) / 2, dy: ch - s * 0.6 };
  if (L.badge === 'circle-top') return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${s / 2 - 1}" fill="#e3350d"/><text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" font-family="Liberation Sans" font-weight="bold" font-size="${f}" fill="#fff">${n}</text></svg>`, dx: -s * 0.2, dy: -s * 0.2 };
  if (L.badge === 'pill-corner') { const w = Math.round(s * 1.4); return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${s}"><rect x="1" y="1" width="${w - 2}" height="${s - 2}" rx="${s / 2}" fill="#ffffff" stroke="#9aa3b5"/><text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" font-family="DejaVu Sans" font-weight="bold" font-size="${f}" fill="#1b2033">x${n}</text></svg>`, dx: cw - w - cw * 0.04, dy: ch - s - cw * 0.04 }; }
  // x-below: plain text under the card
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${s}"><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Liberation Sans" font-weight="bold" font-size="${f}" fill="#e8ecff">x${n}</text></svg>`, dx: 0, dy: ch + 2 };
}

async function shot(L, deck, fmt) {
  const top = L.top || Math.round(L.H * 0.08);
  const usable = L.W * 0.96;
  const cw = Math.floor(usable / (L.cols + (L.cols - 1) * L.gap)), ch = Math.round(cw * 88 / 63);
  const gx = Math.round(cw * L.gap), rowGap = L.badge === 'x-below' ? Math.round(cw * 0.32) : Math.round(cw * Math.max(0.06, L.gap) + (L.badge === 'circle-bottom' ? cw * 0.14 : 0));
  const x0 = Math.round((L.W - (L.cols * cw + (L.cols - 1) * gx)) / 2);
  const layers = [];
  const truth = [];
  // header text, like a deck screen's title and section names
  const svgText = (t, x, y, sz) => ({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${L.W}" height="${Math.round(sz * 1.6)}"><text x="${x}" y="${sz * 1.1}" font-family="DejaVu Sans" font-weight="bold" font-size="${sz}" fill="${L.dark ? '#e8ecff' : '#1b2033'}">${esc(t)}</text></svg>`), left: 0, top: Math.round(y) });
  layers.push(svgText(`${deck.id}  60 cards`, x0, top * 0.3, Math.round(L.W * 0.03)));
  let i = 0, y = top;
  for (const c of deck.cards) {
    const img = await cardPng(c);
    if (!img) continue;
    const col = i % L.cols;
    if (i && !col) y += ch + rowGap;
    if (y + ch > L.H - 10) break;
    const x = x0 + col * (cw + gx);
    const card = await sharp(img.buf).resize(cw, ch, { fit: 'fill' }).png().toBuffer();
    layers.push({ input: card, left: x, top: y });
    const b = badgeSvg(L, c.count, cw, ch);
    layers.push({ input: Buffer.from(b.svg), left: Math.round(x + b.dx), top: Math.round(y + b.dy) });
    truth.push({ name: c.name, set: c.set, num: c.num, count: c.count, src: img.src, box: { x, y, w: cw, h: ch } });
    i++;
  }
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${L.W}" height="${L.H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L.bg[0]}"/><stop offset="1" stop-color="${L.bg[1]}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
  let img = sharp(bg).composite(layers);
  const name = `${deck.id}--${L.id}.${fmt}`;
  img = fmt === 'jpg' ? img.jpeg({ quality: 74 }) : img.png();
  await writeFile(`${OUT}/${name}`, await img.toBuffer());
  return { file: name, layout: L.id, deck: deck.id, cards: truth };
}

const all = [];
let k = 0;
for (const d of decks) {
  for (const L of LAYOUTS) {
    const fmt = (k++ % 2) ? 'jpg' : 'png';
    all.push(await shot(L, d, fmt));
  }
  console.log(`${d.id}: ${LAYOUTS.length} shots`);
}
await writeFile(`${OUT}/truth.json`, JSON.stringify(all, null, 1));
console.log(`${all.length} screenshots, ${[...cache.values()].filter(v => v && v.src === 'ptcgio').length} cards from pokemontcg.io scans, ${[...cache.values()].filter(v => v && v.src === 'limitless').length} from Limitless.`);
