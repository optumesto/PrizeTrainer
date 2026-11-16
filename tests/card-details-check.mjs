// Card details check (3.1): loads the app in jsdom, opens a top list, taps cards on the Cards tab and
// checks the sheet: attack text, Weakness, Resistance and Retreat for a Pokemon, the text and How it
// fits for a Trainer, official rulings for a card rulings.json names, the saved copy offline, that
// Mark cards you own still marks instead of opening, the labels in every language with card text kept
// English, and that the grade never moves. Card data comes from the grade check's saved API responses
// (tests/grade-cards.json.gz), so no network is needed.
//
//   node tests/card-details-check.mjs
//
// Needs jsdom: npm install --prefix tests (versions pinned in tests/package.json).

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { readAppHtml, staleStamps } from '../app-file.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const require = createRequire(path.join(HERE, 'package.json'));
const { JSDOM, VirtualConsole, ResourceLoader } = require('jsdom');
// The lazy language files (fr, de, it) load as script tags.
class Local extends ResourceLoader {
  fetch(url) {
    const u = new URL(url);
    if (u.hostname === 'rdydeck.com') { const f = path.join(ROOT, u.pathname); if (fs.existsSync(f)) return Promise.resolve(fs.readFileSync(f)); }
    return Promise.resolve(Buffer.from(''));
  }
}

let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const stale = staleStamps();
if (stale.length) { console.error('Stamps out of date (node app-file.mjs --stamp): ' + stale.join(', ')); process.exit(1); }

const cache = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HERE, 'grade-cards.json.gz'))).toString('utf8'));
let tdReads = 0;
async function fakeFetch(input, init) {
  const url = new URL(typeof input === 'string' ? input : (input && input.url) || String(input), 'https://rdydeck.com/');
  if (url.hostname === 'rdydeck.com') {
    const f = path.join(ROOT, url.pathname);
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return new Response(fs.readFileSync(f), { status: 200, headers: { 'content-type': /\.js$/.test(f) ? 'text/javascript' : 'application/json' } });
    return new Response('', { status: 404 });
  }
  if (url.hostname === 'api.tcgdex.net' && /cd31Fetch/.test(new Error().stack || '')) tdReads++;
  const hit = cache[((init && init.method) || 'GET').toUpperCase() + ' ' + url.href];
  if (hit) return new Response(hit.b, { status: hit.s, headers: { 'content-type': hit.t } });
  return new Response('', { status: /api\.(pokemontcg\.io|tcgdex\.net)/.test(url.href) ? 503 : 404 });
}

const FIXED_NOW = Date.parse('2026-11-16T12:00:00Z');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(String(e && e.message || e)));
const dom = new JSDOM(readAppHtml(), {
  url: 'https://rdydeck.com/', runScripts: 'dangerously', resources: new Local(), pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) {
    const RealDate = w.Date;
    class FixedDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(FIXED_NOW); } static now() { return FIXED_NOW; } }
    w.Date = FixedDate;
    w.fetch = fakeFetch;
    w.Response = Response; w.Request = Request; w.Headers = Headers;
    w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
    w.AbortSignal.timeout = () => new AbortController().signal;
    w.matchMedia = () => ({ matches: false, media: '', addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    w.scrollTo = () => {}; w.scrollBy = () => {};
    w.HTMLElement.prototype.scrollIntoView = function () {};
    w.HTMLCanvasElement.prototype.getContext = () => null;
    Object.defineProperty(w.navigator, 'onLine', { value: true, configurable: true, writable: true });
    try { delete w.indexedDB; } catch (_) {}
    w.requestIdleCallback = fn => setTimeout(fn, 0);
    w.addEventListener('error', e => errors.push('error: ' + (e.message || e.error)));
    w.addEventListener('unhandledrejection', e => errors.push('unhandled rejection: ' + (e.reason && e.reason.message || e.reason)));
  },
});
const w = dom.window, d = w.document;
await sleep(3500);
ok(w.eval('typeof cd31Show') === 'function', 'card-details.js loaded');

// ── a top list as a deck ──
const lists = JSON.parse(fs.readFileSync(path.join(HERE, 'grade-lists.json'), 'utf8'));
const label = { pokemon: 'Pokémon', trainer: 'Trainer', energy: 'Energy' };
const listText = l => ['pokemon', 'trainer', 'energy'].map(part => {
  const rows = l.cards.filter(c => c.part === part);
  return rows.length ? label[part] + ': ' + rows.reduce((a, c) => a + c.count, 0) + '\n' + rows.map(c => [c.count, c.name, c.set, c.number].filter(Boolean).join(' ')).join('\n') : '';
}).filter(Boolean).join('\n\n');
const pick = Number(process.env.CD_LIST || 0);
const L = lists[pick];
await w.eval(`(async function (text, name) {
  const cards = parseDeckList(text);
  const cov = await enrichDeckCards(cards);
  const deck = { id: 'cd-1', name, cards, format: 'standard', coverage: cov, enrichVer: ENRICH_VER, history: [], created: Date.now() };
  state.decks.push(deck);
})`)(listText(L), L.deckName || L.deck);
const deck = w.eval('state.decks.find(x => x.id === "cd-1")');
ok(deck && deck.coverage && deck.coverage.resolved === deck.coverage.total, `list ${pick} (${L.deckName}): ${deck.coverage.resolved}/${deck.coverage.total} cards read`);
// The saved API answers hold no TCGdex card bodies, so serve each deck card's TCGdex answer from
// the saved pokemontcg.io copy of the same card, reshaped the way TCGdex writes it.
const pk = [];
for (const [k, v] of Object.entries(cache)) if (/api\.pokemontcg\.io\/v2\/cards/.test(k) && v.s === 200) { try { pk.push(...(JSON.parse(v.b).data || [])); } catch (_) {} }
const num = x => String(x || '').replace(/^0+(?=\d)/, '');
const asTd = (p, id) => {
  const sub = p.subtypes || [];
  return {
    id, localId: String(p.number || ''), name: p.name,
    category: p.supertype === 'Pokémon' ? 'Pokemon' : p.supertype,
    hp: p.hp ? +p.hp : undefined, types: p.types, evolveFrom: p.evolvesFrom,
    stage: sub.find(x => /^(Basic|Stage 1|Stage 2)$/.test(x)) || undefined,
    abilities: (p.abilities || []).map(a => ({ type: a.type, name: a.name, effect: a.text })),
    attacks: (p.attacks || []).map(a => ({ cost: a.cost, name: a.name, effect: a.text, damage: a.damage })),
    weaknesses: p.weaknesses, resistances: p.resistances, retreat: p.convertedRetreatCost,
    trainerType: p.supertype === 'Trainer' ? sub.find(x => /Item|Supporter|Stadium|Tool/.test(x)) : undefined,
    energyType: p.supertype === 'Energy' ? sub[0] : undefined,
    effect: p.supertype === 'Pokémon' ? undefined : (p.rules || []).filter(r => !/ACE SPEC/i.test(r) && !/^You may play/.test(r)).join(' '),
    regulationMark: p.regulationMark, rarity: /ACE SPEC/.test(sub.join(' ')) ? 'ACE SPEC Rare' : p.rarity,
    set: { name: (p.set && p.set.name) || '' },
  };
};
let served = 0;
for (const c of deck.cards) {
  const id = w.eval('td30CardId')(c.set, c.num);
  const p = pk.find(x => x.name === c.name && num(x.number) === num(c.num)) || pk.find(x => x.name === c.name);
  if (!id || !p) continue;
  cache['GET https://api.tcgdex.net/v2/en/cards/' + encodeURIComponent(id)] = { s: 200, t: 'application/json', b: JSON.stringify(asTd(p, id)) };
  served++;
}
ok(served >= deck.cards.length - 3, `TCGdex answers served for ${served}/${deck.cards.length} deck lines`);
const G0 = w.eval('gradeDeck(state.decks.find(x => x.id === "cd-1")).overall');
w.openReview('cd-1');
w.showReviewTab('cards');
await sleep(300);

const tiles = () => [...d.querySelectorAll('#review-body .review-group .review-card')];
const sheet = () => d.getElementById('x-modal');
const inner = () => d.getElementById('x-modal-inner');
const open = () => sheet().classList.contains('active');
async function tap(el) { w.closeSheet(); el.click(); for (let i = 0; i < 40; i++) { await sleep(50); if (open() && !/Reading the full card text/.test(inner().textContent)) break; } await sleep(100); }
ok(tiles().length > 10 && tiles().every(t => t.getAttribute('role') === 'button' && t.tabIndex === 0), `tiles are buttons: ${tiles().length}`);

// Pokemon: the first tile in the Pokemon group.
const pTile = d.querySelector('#review-body .review-group .review-card');
const pName = pTile.querySelector('.review-card-name').textContent.trim();
await tap(pTile);
const txt = () => inner().textContent.replace(/\s+/g, ' ');
ok(open(), `tapping ${pName} opens a sheet`);
ok(d.querySelector('#x-modal-inner .cd31-name') && d.querySelector('#x-modal-inner .cd31-name').textContent.trim() === pName, 'sheet names the card');
const hpEl = d.querySelector('#x-modal-inner .cd31-v.big');
ok(hpEl && /^\d+ HP$/.test(hpEl.textContent.trim()), 'HP shown: ' + (hpEl && hpEl.textContent.trim()));
const atk = [...d.querySelectorAll('#x-modal-inner .cd31-blk')];
ok(atk.length >= 1 && atk.some(b => b.querySelector('.cd31-tx') && b.querySelector('.cd31-tx').textContent.length > 10), `attacks or Abilities with their text: ${atk.length}`);
ok(/Weakness/.test(txt()) && /Resistance/.test(txt()) && /Retreat/.test(txt()), 'Weakness, Resistance and Retreat shown');
ok(/Card text from TCGdex/.test(txt()), 'source line');
ok(tdReads >= 1, `read from TCGdex: ${tdReads}`);
const pokeSheet = txt();

// Saved: a second tap reads nothing.
const r0 = tdReads; await tap(pTile);
ok(tdReads === r0 && txt() === pokeSheet, 'second tap uses the saved copy');

// A Pokemon ex shows its Rule Box.
const exTile = tiles().find(t => / ex$/.test(t.querySelector('.review-card-name').textContent.trim()));
if (exTile) { await tap(exTile); ok(/Rule Box/.test(txt()) && /Prize cards/.test(txt()), 'Rule Box on ' + exTile.querySelector('.review-card-name').textContent.trim()); }

// Trainer: a Supporter or Item with text and How it fits this deck.
const trGroup = d.querySelector('#review-body .review-group-title.trainer');
const trTiles = trGroup ? [...trGroup.parentElement.querySelectorAll('.review-card')] : [];
ok(trTiles.length > 3, `Trainer tiles: ${trTiles.length}`);
let fits = 0, withText = 0;
for (const t of trTiles) {
  await tap(t);
  if (d.querySelector('#x-modal-inner .cd31-tx')) withText++;
  if (/How it fits this deck/.test(txt())) fits++;
}
ok(withText === trTiles.length, `every Trainer shows its text: ${withText}/${trTiles.length}`);
ok(fits >= Math.min(3, trTiles.length), `How it fits this deck on ${fits} Trainers`);

// Every tile opens with no script error, and no dash sneaks into what the sheet adds.
let dash = '';
for (const t of tiles()) { await tap(t); const h = inner().innerHTML.replace(/data-no-tr>[^<]*</g, ''); if (/[\u2013\u2014]/.test(h)) dash = t.textContent; }
ok(!dash, 'no en or em dash in the sheet labels' + (dash ? ': ' + dash : ''));

// Official rules: rulings.json is well formed, and a Supporter shows the Supporter rules with their source.
const R = JSON.parse(fs.readFileSync(path.join(ROOT, 'rulings.json'), 'utf8'));
const srcIds = new Set(R.sources.map(s => s.id));
ok(R.rulings.length >= 10 && R.rulings.every(r => r.id && r.q && r.a && srcIds.has(r.src) && r.where) && new Set(R.rulings.map(r => r.id)).size === R.rulings.length,
  `rulings.json: ${R.rulings.length} rules, each with a source and where`);
ok(R.sources.every(s => /^https:\/\/www\.pokemon\.com\//.test(s.url) && /Pokémon Company International/.test(s.publisher)), 'every source is an official Pokémon document');
ok(!/[\u2013\u2014]/.test(JSON.stringify(R)), 'no en or em dash in rulings.json');
let shownRules = '';
for (const t of trTiles) {
  await tap(t); await sleep(150);
  if (d.querySelector('#x-modal-inner .cd31-chip') && [...d.querySelectorAll('#x-modal-inner .cd31-chip')].some(x => x.textContent === 'Supporter')) { shownRules = txt(); break; }
}
ok(/Official rules/.test(shownRules) && /How many Supporters can you play in a turn/.test(shownRules) && /Pokémon TCG Rulebook/.test(shownRules) && /p\. 12/.test(shownRules), 'a Supporter shows the Supporter rules with source and page');
ok(d.querySelector('#x-modal-inner .cd31-all') && /rulings\.html#/.test(d.querySelector('#x-modal-inner .cd31-all').getAttribute('href')), 'All rules links to the rules page');

// Offline with nothing saved: what the deck stores, and a note.
w.closeSheet();
w.localStorage.removeItem('rd_cardtext'); w.eval('_cd31Store = null');
w.navigator.onLine = false;
await tap(pTile);
ok(open() && /once you open this card with a signal/.test(txt()) && d.querySelectorAll('#x-modal-inner .cd31-blk').length >= 1, 'offline: stored attacks and a note');
w.navigator.onLine = true;

// Marking mode taps mark, not open.
w.closeSheet();
d.getElementById('op30-mark').click();
tiles()[2].click(); await sleep(150);
ok(!open() && /You own 1 of/.test(d.getElementById('op30-bar').textContent), 'Mark cards you own still marks');
d.getElementById('op30-mark').click();
ok(tiles()[2].getAttribute('role') === 'button', 'tiles are buttons again after marking');

// Languages: labels translate, card text stays English.
await tap(pTile);
const en = { name: d.querySelector('#x-modal-inner .cd31-name').textContent, tx: (d.querySelector('#x-modal-inner .cd31-tx') || {}).textContent };
const want = { es: 'Debilidad', pt: 'Fraqueza', fr: 'Faiblesse', de: 'Schwäche', it: 'Debolezza' };
for (const l of Object.keys(want)) {
  w.i18nPick(l);
  for (let i = 0; i < 40 && !new RegExp(want[l]).test(txt()); i++) await sleep(100);
  await tap(pTile); await sleep(300);
  const same = d.querySelector('#x-modal-inner .cd31-name').textContent === en.name && (d.querySelector('#x-modal-inner .cd31-tx') || {}).textContent === en.tx;
  ok(new RegExp(want[l]).test(txt()) && same, `${l}: labels translated, card name and text English`);
  const engl = [...inner().querySelectorAll('.cd31-l, .cd31-chip:not(.q), .cd31-rbh, .cd31-sh, .cd31-note, .cd31-tag')].map(x => x.textContent.trim()).filter(s => !(l === 'fr' && s === 'Type')).filter(s => /^(Type|Evolves from|Weakness|Resistance|Retreat|Regulation mark|Printing|Rule Box|Ability|How it fits this deck|Official rules|All rules|Basic|Stage 1|Stage 2|Item|Supporter|Stadium|Card text from TCGdex\.)$/.test(s));
  ok(!engl.length, `${l}: no English label left` + (engl.length ? ': ' + engl.join(', ') : ''));
}
w.i18nPick('en');

const G1 = w.eval('gradeDeck(state.decks.find(x => x.id === "cd-1")).overall');
ok(G0 === G1, `grade unchanged: ${G0}`);
ok(!errors.length, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
console.log(fails ? `\nCard details check failed: ${fails} problem(s).` : '\nCard details check passed.');
process.exit(fails ? 1 : 0);
