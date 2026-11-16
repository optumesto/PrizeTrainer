// Creator kit check (3.1): loads the app in jsdom, grades a top list, opens Share grade and its
// Creator kit, then opens the OBS link (?overlay=1) and the embed link in a fresh page and checks that
// the card shows the same grade, carries the RdyDeck name, shows nothing else, loads no ad and saves
// no deck. Card data comes from the grade check's saved API responses, so no network is needed.
//
//   node tests/creator-kit-check.mjs
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
const asked = [];
async function fakeFetch(input, init) {
  const url = new URL(typeof input === 'string' ? input : (input && input.url) || String(input), 'https://rdydeck.com/');
  asked.push(url.href);
  if (url.hostname === 'rdydeck.com') {
    const f = path.join(ROOT, url.pathname);
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return new Response(fs.readFileSync(f), { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response('', { status: 404 });
  }
  const hit = cache[((init && init.method) || 'GET').toUpperCase() + ' ' + url.href];
  if (hit) return new Response(hit.b, { status: hit.s, headers: { 'content-type': hit.t } });
  return new Response('', { status: /api\.(pokemontcg\.io|tcgdex\.net)/.test(url.href) ? 503 : 404 });
}

const FIXED_NOW = Date.parse('2026-11-16T12:00:00Z');
const errors = [];
function makeDom(url, saved) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(String(e && e.message || e)));
  return new JSDOM(readAppHtml(), {
    url, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
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
      for (const [k, v] of Object.entries(saved || {})) w.localStorage.setItem(k, v);
      w.addEventListener('error', e => errors.push('error: ' + (e.message || e.error)));
      w.addEventListener('unhandledrejection', e => errors.push('unhandled rejection: ' + (e.reason && e.reason.message || e.reason)));
    },
  });
}

// ── the app: a top list as a deck, Share grade, Creator kit ──
const dom = makeDom('https://rdydeck.com/');
const w = dom.window, d = w.document;
await sleep(3500);
ok(w.eval('typeof ck31Open') === 'function', 'creator-kit.js loaded');
const lists = JSON.parse(fs.readFileSync(path.join(HERE, 'grade-lists.json'), 'utf8'));
const label = { pokemon: 'Pokémon', trainer: 'Trainer', energy: 'Energy' };
const listText = l => ['pokemon', 'trainer', 'energy'].map(part => {
  const rows = l.cards.filter(c => c.part === part);
  return rows.length ? label[part] + ': ' + rows.reduce((a, c) => a + c.count, 0) + '\n' + rows.map(c => [c.count, c.name, c.set, c.number].filter(Boolean).join(' ')).join('\n') : '';
}).filter(Boolean).join('\n\n');
const L = lists[Number(process.env.CK_LIST || 0)];
await w.eval(`(async function (text, name) {
  const cards = parseDeckList(text);
  const cov = await enrichDeckCards(cards);
  state.decks.push({ id: 'ck-1', name, cards, format: 'standard', coverage: cov, enrichVer: ENRICH_VER, history: [], created: Date.now() });
})`)(listText(L), L.deckName || L.deck);
w.openReview('ck-1');
await sleep(300);
const G = w.eval('(g29Grade(state.decks.find(x => x.id === "ck-1")) || gradeDeck(state.decks.find(x => x.id === "ck-1"))).overall');
await w.v45ShareGrade(); await sleep(300);
ok(!!d.getElementById('ck31-btn'), 'Share grade has a Creator kit button');
d.getElementById('ck31-btn').click(); await sleep(400);
const codes = [...d.querySelectorAll('#x-modal-inner .ck31-code')].map(x => x.textContent);
ok(codes.length === 3, `Creator kit shows 3 things to copy: ${codes.length}`);
const [obs, iframe, line] = codes;
ok(/^https:\/\/rdydeck\.com\/\?overlay=1#deck=1[A-Za-z0-9_-]+/.test(obs), 'OBS link opens the app with ?overlay=1 and the deck');
ok(/^<iframe src="https:\/\/rdydeck\.com\/\?overlay=1&embed=1#deck=/.test(iframe) && /title="RdyDeck grade"/.test(iframe), 'embed code is an iframe of the embed card');
ok(line.includes(G.toFixed(1) + ' out of 10 on RdyDeck: https://rdydeck.com/?ref=grade#deck=') && /&g=1/.test(line), 'video line has the grade and the grade link');
ok(!/[\u2013\u2014]/.test(d.getElementById('x-modal-inner').innerHTML), 'no en or em dash in the kit');
const saved = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); saved[k] = w.localStorage.getItem(k); }
const nDecks = w.eval('state.decks.length');

// ── the OBS card in a fresh page, with this browser's saved data ──
async function card(url) {
  asked.length = 0;
  const o = makeDom(url, saved), ow = o.window, od = ow.document;
  for (let i = 0; i < 150; i++) { await sleep(100); if (od.querySelector('#ck31 .ck31-g')) break; }
  return { o, ow, od };
}
{
  const { ow, od } = await card(obs);
  ok(od.documentElement.classList.contains('ck31-ov'), 'overlay mode is on');
  const g = od.querySelector('#ck31 .ck31-g');
  ok(g && g.textContent === G.toFixed(1), `card shows the same grade as the app: ${g && g.textContent} vs ${G.toFixed(1)}`);
  ok(/RdyDeck/.test(od.querySelector('#ck31 .ck31-brand').textContent), 'card carries the RdyDeck name');
  ok(od.querySelector('#ck31 .ck31-name').textContent === (L.deckName || L.deck), 'card names the deck');
  ok(!od.querySelector('#ck31 a'), 'OBS card is not a link');
  const shown = [...od.body.children].filter(e => e.id !== 'ck31' && e.tagName !== 'SCRIPT' && ow.getComputedStyle(e).display !== 'none');
  ok(!shown.length, 'nothing but the card shows' + (shown.length ? ': ' + shown.map(e => e.id || e.className || e.tagName).join(', ') : ''));
  ok(!asked.some(u => /googlesyndication|doubleclick/.test(u)) && !od.querySelector('script[src*="googlesyndication"], ins.adsbygoogle'), 'no ad loads');
  ok(ow.eval('state.decks.length') === nDecks && !ow.eval('state.decks.some(x => x.id === "ck31-card")'), 'no deck saved');
  ok(!od.querySelector('#import-modal.active, #x-modal.active'), 'the deck link does not open Import');
  ok(/#deck=/.test(ow.location.hash), 'the link keeps its deck');
  ow.close();
}
{
  const { ow, od } = await card(iframe.match(/src="([^"]+)"/)[1].replace(/&amp;/g, '&'));
  const a = od.querySelector('#ck31 a.ck31-card');
  ok(a && /\?ref=grade#deck=1[^&]+&g=1/.test(a.getAttribute('href')) && a.getAttribute('target') === '_blank', 'embed card links to the full grade in a new tab');
  ok(od.querySelector('#ck31 .ck31-g') && od.querySelector('#ck31 .ck31-g').textContent === G.toFixed(1), 'embed shows the same grade');
  ow.close();
}
{
  const { ow, od } = await card('https://rdydeck.com/?overlay=1');
  ok(/needs a deck link/.test(od.getElementById('ck31').textContent), 'no deck: a plain note');
  ow.close();
}
ok(!errors.length, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
console.log(fails ? `\nCreator kit check failed: ${fails} problem(s).` : '\nCreator kit check passed.');
process.exit(fails ? 1 : 0);
