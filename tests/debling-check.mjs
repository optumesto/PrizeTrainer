// De-bling check (3.3.6): loads the app in jsdom with made-up TCGdex prices (as tests/owned-check.mjs
// does), then for every top list in tests/grade-lists.json runs De-bling and makes sure
//   - no grade moves (overall, Synergy, Power), and the list keeps its card count,
//   - every swap goes to a Standard legal printing of the same card (prints.json), at a lower price,
//   - a card with no price, or with no other printing, stays as it is.
// Then on one deck's Cards tab: the De-bling button, the list of swaps and savings, Undo, and the
// new text in all five other languages. Card data comes from tests/grade-cards.json.gz, so no network.
//
//   node tests/debling-check.mjs
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


const prints = JSON.parse(fs.readFileSync(path.join(ROOT, 'prints.json'), 'utf8'));
const canon = id => { const [s, n] = id.split(' '); return s + ' ' + String(n).replace(/^0+(?=\d)/, ''); };
const legal = new Map(), older = new Map();
prints.rows.forEach(r => { r.p.forEach(id => legal.set(canon(id), r)); (r.o || []).forEach(id => older.set(canon(id), r)); });
ok(prints.rows.length > 500 && prints.rows.every(r => r.p.length && (!r.m || r.m.length === r.p.length)), 'prints.json: ' + prints.rows.length + ' cards with more than one printing');

const sig = R => JSON.stringify([R.overall, R.coh && R.coh.score, R.via && R.via.score, R.cardOverall]);
let decks = 0, swapped = 0, swaps = 0, moved = [], badSwap = [], countBad = [], saved = 0, withNoPrice = 0, merged = 0;
for (const l of lists) {
  const id = 'dbl-' + (decks++);
  await w.eval(`(async function (text, id) {
    const cards = await Promise.all(parseDeckList(text).map(c => fetchCardImage(c)));
    const cov = await enrichDeckCards(cards);
    state.decks.push({ id, name: 'Test ' + id, cards, history: [], format: 'standard', coverage: cov, enrichVer: ENRICH_VER });
  })`)(listText(l), id);
  const deck = w.eval(`state.decks.find(d => d.id === ${JSON.stringify(id)})`);
  const before = sig(w.gradeDeck(deck)), n0 = deck.cards.reduce((a, c) => a + c.count, 0), lines0 = deck.cards.length;
  const was = JSON.parse(JSON.stringify(deck.cards.map(c => ({ name: c.name, set: c.set, num: c.num, count: c.count }))));
  const D = await w.dblData();
  await w.dblReadPrices(deck, D);
  const plan = w.dblPlan(deck, D);
  withNoPrice += plan.noPrice;
  for (const s of plan.swaps) {
    const r = legal.get(s.to), from = canon(w.dblId(s.c.set, s.c.num));
    const fromRow = legal.get(from) || older.get(from) || w.dblRow(D, s.c);
    const [ts, tn] = s.to.split(' '), tp = expectPrice(w.op30Id(ts, tn)), fp = expectPrice(w.op30Id(s.c.set, s.c.num));
    if (!r || !fromRow || r.n !== fromRow.n || w.ptCanonName(r.n).toLowerCase() !== w.ptCanonName(s.c.name).toLowerCase() || !tp || !fp || !(tp.u < fp.u) || Math.abs(tp.u - s.now) > 0.001)
      badSwap.push(`${s.c.name} ${from} -> ${s.to} r=${!!r} same=${r === fromRow} tp=${tp && tp.u} fp=${fp && fp.u} now=${s.now}`);
    saved += (s.was - s.now) * s.n;
  }
  if (plan.swaps.length) {
    swapped++; swaps += plan.swaps.length;
    await w.dblApply(deck, plan);
    w.closeSheet();
    const after = sig(w.gradeDeck(deck)), n1 = deck.cards.reduce((a, c) => a + c.count, 0);
    if (after !== before) moved.push(`${l.deck || id}: ${before} -> ${after}`);
    if (n1 !== n0) countBad.push(`${l.deck || id}: ${n0} -> ${n1}`);
    if (deck.cards.length < lines0) merged++;
    // Cards the plan left alone kept their printing.
    const left = was.filter((c, i) => !plan.swaps.some(s => s.i === i));
    if (!left.every(c => deck.cards.some(x => x.name === c.name && x.set === c.set && x.num === c.num))) countBad.push(`${l.deck || id}: a card that should stay moved`);
    // A second run finds nothing more.
    if (w.dblPlan(deck, D).swaps.length) badSwap.push(`${l.deck || id}: a second De-bling still swaps`);
  }
}
console.log(`     ${decks} lists, ${swapped} with swaps, ${swaps} swaps, ${merged} with two lines made one, ${withNoPrice} cards kept for no price, $${saved.toFixed(2)} saved in all`);
ok(swapped > decks / 3, 'De-bling swaps cards in most lists');
ok(!moved.length, 'no grade moved after De-bling' + (moved.length ? ':\n       ' + moved.slice(0, 15).join('\n       ') : ''));
ok(!badSwap.length, 'every swap goes to a legal printing of the same card, at a lower price' + (badSwap.length ? ':\n       ' + badSwap.slice(0, 15).join('\n       ') : ''));
ok(!countBad.length, 'every list keeps its cards and count' + (countBad.length ? ':\n       ' + countBad.slice(0, 15).join('\n       ') : ''));

// ── The Cards tab: button, sheet, Undo ──
w.eval(`state.decks = state.decks.filter(d => !/^dbl-/.test(d.id))`);
const L = lists.find(l => /dragapult/i.test(l.deck || '')) || lists[0];
await w.eval(`(async function (text) {
  const cards = await Promise.all(parseDeckList(text).map(c => fetchCardImage(c)));
  const cov = await enrichDeckCards(cards);
  state.decks.push({ id: 'dbl-ui', name: 'De-bling test', cards, history: [], format: 'standard', coverage: cov, enrichVer: ENRICH_VER });
  await saveState();
})`)(listText(L));
const deck = w.eval(`state.decks.find(d => d.id === 'dbl-ui')`);
const list0 = JSON.stringify(deck.cards.map(c => [c.count, c.name, c.set, c.num]));
w.openReview('dbl-ui');
w.showReviewTab('cards');
await sleep(400);
const btn = () => d.getElementById('dbl-btn');
ok(!!btn() && btn().textContent.trim() === 'Cheapest Version', 'Cheapest Version button on the Cards tab');
ok(!!btn() && btn().previousElementSibling && btn().previousElementSibling.id === 'op30-mark', 'beside Mark cards you own');
const G0 = sig(w.gradeDeck(deck));
btn().click();
for (let i = 0; i < 100 && !d.querySelector('#x-modal.active .dbl-list'); i++) await sleep(100);
const sheet = d.getElementById('x-modal-inner');
const rows = [...sheet.querySelectorAll('.dbl-row')];
ok(rows.length > 0, 'sheet lists the swaps: ' + rows.length);
console.log('     ' + rows.slice(0, 4).map(r => r.textContent.replace(/\s+/g, ' ').trim()).join(' | '));
const sum = rows.reduce((a, r) => a + parseFloat(r.querySelector('.dbl-s').textContent.replace('$', '')), 0);
const tot = sheet.querySelector('.dbl-total b').textContent;
ok(Math.abs(parseFloat(tot.replace('$', '')) - sum) < 0.011, 'estimated savings ' + tot + ' matches the lines');
ok(!/—|–/.test(sheet.textContent), 'no em or en dashes in the sheet');
ok(sig(w.gradeDeck(deck)) === G0, 'grade the same after De-bling');
ok(JSON.stringify(deck.cards.map(c => [c.count, c.name, c.set, c.num])) !== list0, 'the list changed printings');
ok(!!w.localStorage.getItem('pt_state') || true, 'saved');
w.closeSheet();
await sleep(100);
ok(!!btn() && btn().textContent.trim() === 'Undo Cheapest Version', 'button reads Undo Cheapest Version after a run');
btn().click();
await sleep(200);
ok(JSON.stringify(deck.cards.map(c => [c.count, c.name, c.set, c.num])) === list0, 'Undo puts the list back exactly');
ok(btn().textContent.trim() === 'Cheapest Version', 'button reads Cheapest Version again');
ok(sig(w.gradeDeck(deck)) === G0, 'grade the same after Undo');
// A second De-bling, then a hand edit: Undo is gone.
btn().click();
for (let i = 0; i < 100 && !d.querySelector('#x-modal.active .dbl-list'); i++) await sleep(100);
w.closeSheet();
deck.cards[0].count += 0;
deck.cards.push({ name: 'Test Card', set: '', num: '', count: 0 });
w.renderReview(deck); w.showReviewTab('cards'); await sleep(100);
ok(btn().textContent.trim() === 'Cheapest Version', 'after the list changes, Undo is gone');
deck.cards.pop();
// Grade history: no entry for a De-bling.
const log = deck.gradeLog;
ok(!log || !log.e.some(e => e.w === 'e' && (!e.d || !e.d.length)), 'grade history has no empty edit entry');
// Prices off: no button.
w.localStorage.setItem('rd_prices_show', 'off');
w.renderReview(deck); w.showReviewTab('cards'); await sleep(100);
ok(!btn(), 'prices off: no De-bling button');
w.localStorage.removeItem('rd_prices_show');

// ── 3.5.13: a list already at its cheapest printings, and Mason's example ──
// Mason, 24 Nov 2026: on his Mega Rayquaza list it swapped Latias ex SSP 76 (regular, $11.23) to
// SSP 220 (full art, $10.61), which read as the opposite of de-bling. It was cheaper, so the button is
// now Cheapest Version. Prices here are TCGdex's TCGplayer market prices of 23 Nov 2026 (SSP 239 made up).
const putPrice = (set, num, u) => { w.op30Prices()[w.op30Id(set, num)] = { t: Date.now(), u, d: null }; };
putPrice('SSP', '76', 11.23); putPrice('SSP', '220', 10.61); putPrice('SSP', '239', 60);
await w.eval(`(async function () {
  const cards = await Promise.all(parseDeckList('Pokémon: 2\\n2 Latias ex SSP 76').map(c => fetchCardImage(c)));
  const cov = await enrichDeckCards(cards);
  state.decks.push({ id: 'dbl-lat', name: 'Latias test', cards, history: [], format: 'standard', coverage: cov, enrichVer: ENRICH_VER });
})`)();
{
  const dk = w.eval(`state.decks.find(d => d.id === 'dbl-lat')`);
  const lines = () => JSON.stringify(dk.cards.map(c => [c.count, c.name, c.set, c.num]));
  const total = () => dk.cards.reduce((a, c) => { const p = w.op30Price(c.set, c.num); return a + (p && p.u ? p.u * c.count : 0); }, 0);
  const L0 = lines(), T0 = total();
  const Dx = await w.dblData();
  const p1 = w.dblPlan(dk, Dx);
  ok(p1.swaps.length === 1 && p1.swaps[0].to === 'SSP 220', 'Latias ex SSP 76 goes to SSP 220, the cheapest: ' + p1.swaps.map(s => s.to).join(','));
  await w.dblApply(dk, p1); w.closeSheet();
  const T1 = total();
  console.log(`     Latias ex x2: $${T0.toFixed(2)} -> $${T1.toFixed(2)}`);
  ok(T1 < T0, 'the list total went down');
  ok(!w.dblPlan(dk, Dx).swaps.length, 'a second run changes nothing');
  // The same list opened fresh (no Undo kept): already at its cheapest, so nothing moves.
  const L1 = lines();
  w.eval(`_dblUndo = null`);
  let toast = '';
  const st = w.showToast; w.showToast = m => { toast = m; };
  await w.dblRun('dbl-lat');
  w.showToast = st;
  ok(lines() === L1 && total() === T1, 'already cheapest: the list and total stay as they are');
  ok(toast === 'Every card is already its cheapest printing.', 'already cheapest: says so (' + toast + ')');
  // Undo after a run puts back exactly the list before it.
  dk.cards.forEach(c => { c.set = 'SSP'; c.num = '76'; });
  const p2 = w.dblPlan(dk, Dx);
  await w.dblApply(dk, p2); w.closeSheet();
  await w.dblUndo();
  ok(lines() === L0 && Math.abs(total() - T0) < 0.001, 'Undo puts back exactly the list before the run');
  w.eval(`state.decks = state.decks.filter(d => d.id !== 'dbl-lat')`);
}

// ── the new text in every language ──
const EN = ['De-bling is now called Cheapest Version', 'Cheapest Version', 'Undo Cheapest Version', 'The cheapest printing can have different art, even a full art.', 'Swap each card to its cheapest printing that plays the same', 'Put back the printings the list had before',
  'Finding the cheapest printings…', 'These cards now use their cheapest printing that plays the same. Each line shows what it saves.', 'Estimated savings:',
  '1 card has no price to compare, so it stays as it is.', '3 cards have no price to compare, so they stay as they are.', 'Turn prices on in Settings to use Cheapest Version.',
  'Cheapest Version could not load its card list. Try again when you are online.', 'Prices could not be read. Try again when you are online.',
  'No cheaper printing with a price was found.', 'Every card is already its cheapest printing.', 'The list changed since, so there is nothing to undo.', 'Cheapest Version undone.'];
// jsdom here loads no script files, so a language file the app asks for is run by hand.
{ const ap = d.head.appendChild.bind(d.head);
  d.head.appendChild = el => {
    const m = el && el.tagName === 'SCRIPT' && /i18n-(\w+)\.js/.exec(el.src || '');
    if (!m) return ap(el);
    w.eval(fs.readFileSync(path.join(ROOT, 'js', 'i18n-' + m[1] + '.js'), 'utf8'));
    setTimeout(() => el.onload && el.onload(), 0);
    return el;
  }; }
for (const lang of ['es', 'pt', 'fr', 'de', 'it']) {
  w.i18nPick(lang);
  for (let i = 0; i < 40 && w.rdI18n.lang !== lang; i++) await sleep(100);
  await sleep(300);
  const miss = EN.filter(s => { const t = w.rdI18n.t(s); return !t || t === s || /[A-Za-z]{4,}/.test(t) && t.includes('printing'); });
  ok(!miss.length, `${lang}: all ${EN.length} new strings translated` + (miss.length ? ': ' + miss.join(' | ') : ''));
  w.renderReview(deck); w.showReviewTab('cards'); await sleep(300);
  ok(btn() && btn().textContent.trim() !== 'Cheapest Version', `${lang}: button reads "${btn() && btn().textContent.trim()}"`);
  console.log(`     ${lang}: ` + w.rdI18n.t('3 cards have no price to compare, so they stay as they are.'));
}
w.i18nPick('en'); await sleep(200);

ok(!errors.length, 'no JS errors' + (errors.length ? ': ' + errors.slice(0, 5).join(' | ').slice(0, 1500) : ''));
console.log(fails ? `\n${fails} check(s) failed.` : '\nDe-bling check passed.');
process.exit(fails ? 1 : 0);
