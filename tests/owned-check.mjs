// Owned cards and prices check (3.0): loads the app in jsdom, opens a starter deck, marks cards as
// owned, turns on "Suggest cards I own first" and "Cheapest first", and makes sure the grade shown
// never moves and no script error is thrown. TCGdex is stubbed with made-up pricing, so the price
// lines and the list total can be checked to the cent. Card data comes from the grade check's saved
// API responses (tests/grade-cards.json.gz), so no network is needed.
//
//   node tests/owned-check.mjs
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
const { JSDOM, VirtualConsole } = require('jsdom');

let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const stale = staleStamps();
if (stale.length) { console.error('Stamps out of date (node app-file.mjs --stamp): ' + stale.join(', ')); process.exit(1); }

const cache = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HERE, 'grade-cards.json.gz'))).toString('utf8'));

// Made-up TCGdex pricing, the same shape TCGdex gives: each card id gets a fixed price from its
// letters. One id in seven has only a Cardmarket price (euros), one in seven has no pricing at all.
const hash = s => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
function fakePricing(id) {
  const h = hash(id), kind = h % 7;
  if (kind === 0) return { id };                                                  // no pricing
  if (kind === 1) return { id, pricing: { cardmarket: { updated: '2026-11-09T01:00:00.000Z', unit: 'EUR', avg: 1, low: 0.2, trend: 0.5 + (h % 50) / 100 } } };
  return { id, pricing: {
    cardmarket: { updated: '2026-11-10T01:00:00.000Z', unit: 'EUR', trend: 9.99 },
    tcgplayer: { updated: '2026-11-10T20:00:00.000Z', unit: 'USD', normal: { productId: 1, lowPrice: 0.1, midPrice: 1, highPrice: 5, marketPrice: 0.25 + (h % 400) / 100, directLowPrice: null } },
  } };
}
// 3.2.7: US dollars only. A card with only a Cardmarket (euro) price counts as no price.
const expectPrice = id => { const p = fakePricing(id).pricing; return p && p.tcgplayer ? { u: p.tcgplayer.normal.marketPrice } : null; };

let priceMode = true, priceReads = 0, maxAtOnce = 0, atOnce = 0;
async function fakeFetch(input, init) {
  const url = new URL(typeof input === 'string' ? input : (input && input.url) || String(input), 'https://rdydeck.com/');
  if (url.hostname === 'rdydeck.com') {
    const f = path.join(ROOT, url.pathname);
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return new Response(fs.readFileSync(f), { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response('', { status: 404 });
  }
  if (priceMode && url.hostname === 'api.tcgdex.net' && /^\/v2\/en\/cards\/[^/?]+$/.test(url.pathname) && !url.search) {
    // Price reads (from op30Fetch) are counted apart from card data reads.
    const mine = /op30Fetch/.test(new Error().stack || '');
    if (mine) { priceReads++; atOnce++; maxAtOnce = Math.max(maxAtOnce, atOnce); if (process.env.OC_DEBUG) console.log("     read " + url.pathname, (new Error().stack.match(/at (?:async )?(\w+)/g) || []).slice(1, 6).join(" ")); }
    await sleep(5);
    if (mine) atOnce--;
    return new Response(JSON.stringify(fakePricing(decodeURIComponent(url.pathname.split('/').pop()))), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  const hit = cache[((init && init.method) || 'GET').toUpperCase() + ' ' + url.href];
  if (hit) return new Response(hit.b, { status: hit.s, headers: { 'content-type': hit.t } });
  return new Response('', { status: /api\.(pokemontcg\.io|tcgdex\.net)/.test(url.href) ? 503 : 404 });
}

const FIXED_NOW = Date.parse('2026-11-11T12:00:00Z');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(String(e && e.message || e)));
const dom = new JSDOM(readAppHtml(), {
  url: 'https://rdydeck.com/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
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
ok(w.eval('typeof op30Cards') === 'function' && w.eval('op30PricesOn()') === true, 'owned-prices.js loaded, prices on by default');

// ── card data ──
// The saved card data holds the grade check's top lists, read in batches, so a starter deck or the
// cards an upgrade tries to add would ask for batches that were never saved. So every top list is read
// once here, and a card that cannot be read gets the data the same card has in one of those lists
// (its own set and number stay, so its price is its own printing's).
const lists = JSON.parse(fs.readFileSync(path.join(HERE, 'grade-lists.json'), 'utf8'));
const label = { pokemon: 'Pokémon', trainer: 'Trainer', energy: 'Energy' };
const listText = l => ['pokemon', 'trainer', 'energy'].map(part => {
  const rows = l.cards.filter(c => c.part === part);
  return rows.length ? label[part] + ': ' + rows.reduce((a, c) => a + c.count, 0) + '\n' + rows.map(c => [c.count, c.name, c.set, c.number].filter(Boolean).join(' ')).join('\n') : '';
}).filter(Boolean).join('\n\n');
w.__donor = new Map();
for (const l of lists) {
  await w.eval(`(async function (text) {
    const cards = parseDeckList(text);
    await enrichDeckCards(cards);
    cards.forEach(c => { if (c.resolved && c.supertype && !window.__donor.has(bldKey(c.name))) window.__donor.set(bldKey(c.name), JSON.parse(JSON.stringify(c))); });
  })`)(listText(l));
}
w.eval(`(function () {
  const real = enrichDeckCards;
  enrichDeckCards = async function (cards) {
    const r = await real.apply(this, arguments);
    let n = 0;
    (cards || []).forEach(c => {
      if (c.resolved) return;
      const d = window.__donor.get(bldKey(c.name));
      if (d) { Object.assign(c, JSON.parse(JSON.stringify(d)), { name: c.name, count: c.count, set: c.set, num: c.num, section: c.section }); n++; }
    });
    if (r && n) { r.resolved += n; r.unresolved -= n; r.pct = Math.round(100 * r.resolved / Math.max(1, r.total)); delete r.partial; }
    return r;
  };
})()`);
console.log('     card data from ' + lists.length + ' top lists (' + w.__donor.size + ' cards)');

// ── a starter deck with upgrades to order ──
// Starter decks are winning lists, so few swaps raise them. Each is tried as a player might have it:
// one copy fewer of four Trainers the list runs 3 or more of, and four more of its first Energy.
const weaken = list => {
  let cut = 0, part = '', added = false;
  return list.split('\n').map(line => {
    const h = line.match(/^(Pok\S+|Trainer|Energy):/);
    if (h) { part = h[1]; return line; }
    const m = line.match(/^(\d+) (.*)$/);
    if (!m) return line;
    if (part === 'Trainer' && +m[1] >= 3 && cut < 4) { cut++; return (+m[1] - 1) + ' ' + m[2]; }
    if (part === 'Energy' && !added) { added = true; return (+m[1] + 4) + ' ' + m[2]; }
    return line;
  }).join('\n');
};
let deck = null;
const starters = JSON.parse(w.eval('JSON.stringify(STARTER_DECKS.map(s => s.id))'));
for (const id of starters) {
  w.__weak = weaken(w.eval(`STARTER_DECKS.find(s => s.id === ${JSON.stringify(id)}).list`));
  w.eval(`STARTER_DECKS.find(s => s.id === ${JSON.stringify(id)}).list = window.__weak`);
  await w.loadStarterDeck(id);
  const dk = w.eval('state.decks[state.decks.length - 1]');
  if (!dk || dk.starter !== id) continue;
  dk.id = 'oc-' + id;   // the clock is fixed here, so every import would get the same id
  const r = await w.up75Find(dk);
  console.log(`     starter ${dk.name}: grade ${w.gradeDeck(dk).overall}, ${(r.swaps || []).length} upgrades, ${(r.more || []).length} in the pool${r.why ? ' (' + r.why + ')' : ''}`);
  if ((r.swaps || []).length && (r.more || []).length > r.swaps.length) { deck = dk; break; }
}
ok(!!deck && deck.cards.reduce((a, c) => a + c.count, 0) === 60, 'starter deck loaded: ' + (deck ? deck.name + ', ' + deck.coverage.resolved + '/' + deck.coverage.total + ' cards read' : 'none has upgrades'));
if (!deck) process.exit(1);
w.openReview(deck.id);
const gradeText = () => { const g = d.querySelector('#grade-body .g-score'); return g ? g.textContent.replace(/\s+/g, '') : ''; };
const upText = () => { const s = d.getElementById('up75-sec'); return s ? s.textContent.replace(/\s+/g, ' ').trim() : ''; };
async function settle() {
  for (let i = 0; i < 160; i++) {
    const g = gradeText();
    if (/^\d+\.\d\/10$/.test(g) && upText() && !/Checking which card swaps/.test(upText())) return;
    if (i % 10 === 9) w.renderGrade();
    await sleep(250);
  }
}
w.showReviewTab('grade');
await settle();
const G0 = gradeText();
const R0 = w.eval('gradeDeck(state.decks[state.decks.length - 1]).overall');
ok(/^\d+\.\d\/10$/.test(G0), 'grade shown: ' + G0);
const res = w.eval(`(_up75Cache.get(state.activeDeckId) || {}).res`);
ok(res && Array.isArray(res.swaps), 'upgrades found: ' + (res && res.swaps ? res.swaps.length + ' shown, ' + (res.more || []).length + ' in the pool' : upText().slice(0, 120)));
const firstRow = () => { const r = d.querySelector('#up75-sec .up75-row:not(.all) .up75-n'); return r ? r.textContent : ''; };
const before = firstRow();

// ── Cards tab: mark cards as owned ──
w.showReviewTab('cards');
const bar = () => (d.getElementById('op30-bar') || {}).textContent || '';
const distinct = new Set(deck.cards.map(c => w.op30Key(c.name))).size;
ok(new RegExp(`You own 0 of the ${distinct} different cards in this list\\.`).test(bar()), 'owned line: ' + bar().split('.')[0]);
const markBtn = d.getElementById('op30-mark');
ok(!!markBtn && /Mark cards you own/.test(markBtn.textContent), 'Mark cards you own button');
markBtn.click();
ok(d.getElementById('review-body').classList.contains('op30-marking') && /Done marking/.test(d.getElementById('op30-mark').textContent), 'marking mode on');
const tiles = () => [...d.querySelectorAll('#review-body .review-group .review-card')];
for (const i of [0, 3, 7]) tiles()[i].click();
ok(/You own 3 of/.test(bar()), 'three tiles tapped: ' + bar().split('.')[0]);
ok(d.querySelectorAll('#review-body .op30-tick').length >= 3, 'owned ticks shown: ' + d.querySelectorAll('#review-body .op30-tick').length);
tiles()[3].click();
ok(/You own 2 of/.test(bar()), 'tapping again unmarks: ' + bar().split('.')[0]);
tiles()[3].click();
const stored = JSON.parse(w.localStorage.getItem('rd_owned'));
ok(stored && stored.v === 1 && Object.keys(stored.n).length === 3, 'saved on the device under rd_owned: ' + Object.keys(stored.n).join(', '));
d.getElementById('op30-mark').click();
ok(!d.getElementById('review-body').classList.contains('op30-marking'), 'marking mode off');
tiles()[1].click();
ok(/You own 3 of/.test(bar()), 'a tap outside marking mode changes nothing');

// ── Grade tab: owned first never moves the grade ──
// Mark as owned the card a lower swap in the pool adds, so owned-first has something to move up.
const shownIn = new Set((res.swaps || []).map(s => w.op30Key(s.in)));
const lower = (res.more || []).find(s => !shownIn.has(w.op30Key(s.in)));
if (lower) w.op30Set(lower.in, '', true);
w.showReviewTab('grade');
await settle();
ok(gradeText() === G0, 'grade the same after marking cards: ' + gradeText());
const own = d.getElementById('op30-up-own');
ok(!!own && /Suggest cards I own first/.test(own.parentNode.textContent), 'Suggest cards I own first toggle shown');
own.checked = true; own.dispatchEvent(new w.Event('change', { bubbles: true }));
await sleep(50);
ok(gradeText() === G0, 'grade the same with owned first: ' + gradeText());
ok(w.eval('gradeDeck(state.decks[state.decks.length - 1]).overall') === R0, 'gradeDeck gives the same number');
if (lower) {
  ok(firstRow().includes(lower.in), `owned card first: "${firstRow()}" (was "${before}")`);
  ok(/You own/.test(d.querySelector('#up75-sec .up75-row').textContent), 'swap shows "You own"');
  // Its numbers are the ones that swap was graded with.
  const g = d.querySelector('#up75-sec .up75-row .up75-g');
  ok(!g || g.textContent.trim() === `${lower.from.toFixed(1)} to ${lower.to.toFixed(1)}`, 'owned swap keeps its own graded numbers: ' + (g ? g.textContent : 'grade unchanged, Synergy or Power only'));
} else console.log('     (no lower swap in the pool to move up)');
// The main attacker is never cut.
const keepOut = w.eval(`(() => { const R = gradeDeck(state.decks[state.decks.length - 1]); const v = R.via || {}; return [v.auto, v.main].filter(Boolean).map(m => m.name || m.key); })()`);
const outs = [...d.querySelectorAll('#up75-sec .up75-row:not(.all) .up75-n')].map(x => x.textContent);
ok(!outs.some(t => keepOut.some(k => k && new RegExp('^Swap 1 ' + String(k).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' for', 'i').test(t))), 'no swap cuts the main attacker (' + keepOut.join(', ') + ')');
own.checked = false;
const own2 = d.getElementById('op30-up-own'); own2.checked = false; own2.dispatchEvent(new w.Event('change', { bubbles: true }));
ok(firstRow() === before, 'owned first off: the usual order is back');

// ── Prices ──
w.showReviewTab('cards');
for (let i = 0; i < 80 && !/List total/.test(bar()); i++) await sleep(100);
await sleep(300);
let usd = 0, none = 0, needU = 0;
for (const c of deck.cards) {
  const id = w.td30CardId(c.set, c.num), p = id ? expectPrice(id) : null, mine = w.op30Has(c.name);
  if (!p) { none += c.count; continue; }
  usd += p.u * c.count; if (!mine) needU += p.u * c.count;
}
const money = u => '$' + u.toFixed(2);
console.log('     ' + bar());
ok(bar().includes('List total: ' + money(usd) + '.'), 'list total ' + money(usd));
ok(bar().includes('Cards you do not own: ' + money(needU) + '.'), 'still to get ' + money(needU));
ok(!none || bar().includes(none === 1 ? '1 card has no price' : none + ' cards have no price'), none + ' cards with no price are named, not counted');
ok(/TCGplayer market prices in US dollars, from TCGdex, as of \d+ \w{3} 2026\./.test(bar()), 'source line with date');
ok(!/€|Cardmarket/.test(d.getElementById('review-body').textContent), 'no euro price or Cardmarket anywhere on the Cards tab');
ok(!/\$0\.00|€0\.00/.test(d.getElementById('review-body').textContent), 'no price ever shows as 0');
ok(d.querySelectorAll('#review-body .op30-pr').length === tiles().length, 'every tile shows a price or "no price"');
ok(maxAtOnce <= 3, 'at most 3 price requests at once (' + maxAtOnce + '), ' + priceReads + ' read');
const reads = priceReads;
w.showReviewTab('grade'); w.showReviewTab('cards'); await sleep(200);
ok(priceReads === reads, 'prices are kept on the device: no new requests on the next look');
ok(!!w.localStorage.getItem('rd_prices'), 'prices saved under rd_prices');

// Upgrades: prices and cheapest first.
w.showReviewTab('grade');
await settle();
for (let i = 0; i < 40 && !d.querySelector('#up75-sec .op30-tag'); i++) await sleep(100);
ok(gradeText() === G0, 'grade the same with prices: ' + gradeText());
ok(!!d.querySelector('#up75-sec .op30-tag') || !(res.swaps || []).length, 'upgrade swaps show the price of the card they add');
const cheap = d.getElementById('op30-up-cheap');
ok(!!cheap, 'Cheapest first toggle shown');
if (cheap) {
  cheap.checked = true; cheap.dispatchEvent(new w.Event('change', { bubbles: true }));
  await sleep(50);
  const shown = [...d.querySelectorAll('#up75-sec .up75-row:not(.all)')].map(r => { const t = r.querySelector('.op30-tag:not(.own)'); const m = t && t.textContent.match(/^\$([0-9.]+)/); return m ? +m[1] : Infinity; });
  ok(shown.every((v, i) => i === 0 || shown[i - 1] <= v), 'cheapest first: ' + shown.join(', '));
  ok(gradeText() === G0, 'grade the same with cheapest first: ' + gradeText());
  const own3 = d.getElementById('op30-up-own'); own3.checked = true; own3.dispatchEvent(new w.Event('change', { bubbles: true }));
  await sleep(50);
  ok(gradeText() === G0, 'grade the same with both on: ' + gradeText());
}
ok(!/\u2014|\u2013/.test(d.getElementById('review-body').textContent + d.getElementById('grade-body').textContent.replace(/[^]*?(?=Upgrades)/, '')), 'no em or en dashes in the new text');

// ── 3.0.1: the Prices switch in Settings ──
w.showReviewTab('cards');
await sleep(100);
w.openSettings();
const prRow = d.getElementById('st301-pr');
ok(!!prRow && /Prices/.test(prRow.textContent), 'Settings has a Prices row');
ok(!!prRow && prRow.querySelector('[data-p="on"]').getAttribute('aria-pressed') === 'true', 'Prices shows On by default');
const r1 = priceReads;
prRow.querySelector('[data-p="off"]').click();
await sleep(100);
ok(w.localStorage.getItem('rd_prices_show') === 'off' && prRow.querySelector('[data-p="off"]').getAttribute('aria-pressed') === 'true', 'Off is saved as rd_prices_show = off');
w.closeSheet();
w.showReviewTab('grade'); w.showReviewTab('cards'); await sleep(200);
ok(!/List total|TCGplayer market prices|no price|\$|€/.test(bar()) && !d.querySelectorAll('#review-body .op30-pr').length, 'prices off: no price on the Cards tab');
ok(/You own \d+ of/.test(bar()), 'prices off: owned cards still show');
w.showReviewTab('grade');
await settle();
ok(gradeText() === G0, 'grade the same with prices off: ' + gradeText());
ok(!d.querySelector('#up75-sec .op30-tag:not(.own)') && !d.getElementById('op30-up-cheap') && !/TCGplayer market prices/.test(upText()), 'prices off: no price, Cheapest first or source line in Upgrades');
ok(priceReads === r1, 'prices off: no price requests');
w.openSettings();
d.querySelector('#st301-pr [data-p="on"]').click();
w.closeSheet();
ok(w.localStorage.getItem('rd_prices_show') === null && w.eval('op30PricesOn()') === true, 'On again removes the setting');
w.showReviewTab('cards'); await sleep(200);
ok(/List total/.test(bar()), 'prices on again: list total is back');

// ── 3.0.1: one suggestion, no order toggles ──
const one = w.eval(`(() => { const r = (_up75Cache.get(state.activeDeckId) || {}).res; const s = r.swaps[0]; return op30UpBar(Object.assign({}, r, { swaps: [s], more: [s] })); })()`);
ok(!/op30-up-own|op30-up-cheap/.test(one), 'one upgrade: no order toggles');
const two = w.eval(`(() => { const r = (_up75Cache.get(state.activeDeckId) || {}).res; return op30UpBar(r); })()`);
ok(/op30-up-own/.test(two), 'more than one upgrade: order toggles shown');

// ── Offline, with nothing saved: no prices, no errors ──
w.navigator.onLine = false;
w.eval('_op30P = {}');
w.localStorage.removeItem('rd_prices');
const r0 = priceReads;
w.showReviewTab('cards');
await sleep(200);
ok(priceReads === r0 && !/List total|\$|€/.test(bar()), 'offline with no saved prices: no price lines, no requests');
ok(/You own \d+ of/.test(bar()), 'owned cards still show offline');
w.navigator.onLine = true;

// ── Deck builder: tick a card as owned ──
w.openBuilder();
for (let i = 0; i < 40 && !w.eval('bldCat && bldCat.cards.length'); i++) await sleep(100);
w.eval(`bldQ = 'Boss'; bldDrawResults();`);
const tg = d.querySelector('#bld-results .op30-tg');
ok(!!tg, 'builder search rows have an owned tick');
if (tg) {
  const name = tg.dataset.n, was = w.op30Has(name);
  tg.click();
  ok(w.op30Has(name) === !was && tg.getAttribute('aria-pressed') === String(!was), 'builder tick marks ' + name);
}

ok(!errors.length, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 5).join(' | ') : ''));
console.log(fails ? `Owned check failed: ${fails} problem${fails > 1 ? 's' : ''}.` : 'Owned check passed: the grade never moved.');
process.exit(fails ? 1 : 0);
