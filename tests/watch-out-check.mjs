// Watch out for check (hidden box on the Grade tab, js/v83-watch-out.js): grades the top lists in
// tests/grade-lists.json with the app's own code, as tests/grade-check.mjs does, and with this week's
// matchups.json reads the box for each one. It
//   - fails when the box throws or draws a line with nothing behind it (no cards and no decks),
//   - fails when a Mega Lucario ex list is not warned about its Psychic Weakness,
//   - fails when an Alakazam list (Powerful Hand) is not warned about hand disruption,
//   - fails when the box changes a grade (the grade is read before and after it is drawn),
//   - fails when the box shows while it is switched off.
//
//   node tests/watch-out-check.mjs           the check, with one line per list
//   - fails when a text of the box shows in English in Spanish, Portuguese, French, German or Italian
//     (card and deck names, numbers and the parts marked data-no-tr stay as they are),
//
//   node tests/watch-out-check.mjs --html=<file>   also writes every list's box to <file> as JSON
//
// Needs jsdom: npm install --prefix tests.
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
const HTML_OUT = (process.argv.find(a => a.startsWith('--html=')) || '').slice(7);

let fails = 0;
const ok = (c, m) => { if (!c) { console.log('FAIL ' + m); fails++; } };

const stale = staleStamps();
if (stale.length) { console.error('Stale stamps (run node app-file.mjs --stamp): ' + stale.join(', ')); process.exit(1); }
const cache = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HERE, 'grade-cards.json.gz'))).toString('utf8'));
const MATCHUPS = fs.readFileSync(path.join(ROOT, 'matchups.json'), 'utf8');
async function fakeFetch(input, init) {
  const url = typeof input === 'string' ? input : (input && input.url) || String(input);
  if (/matchups\.json/.test(url)) return new Response(MATCHUPS, { status: 200, headers: { 'content-type': 'application/json' } });
  const hit = cache[((init && init.method) || 'GET').toUpperCase() + ' ' + url];
  return hit ? new Response(hit.b, { status: hit.s, headers: { 'content-type': hit.t } }) : new Response('', { status: 503 });
}

const FIXED_NOW = Date.parse('2026-11-18T12:00:00Z');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(String(e && e.message || e)));
// The language files are loaded the way the app loads them, from js/.
class Local extends ResourceLoader {
  fetch(url) {
    const u = new URL(url);
    if (u.hostname === 'rdydeck.com' && /^\/js\/i18n-\w+\.js$/.test(u.pathname)) return Promise.resolve(fs.readFileSync(path.join(ROOT, u.pathname)));
    return Promise.resolve(Buffer.from(''));
  }
}
const dom = new JSDOM(readAppHtml(path.join(ROOT, 'index.html')), {
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
    w.scrollTo = () => {};
    w.HTMLElement.prototype.scrollIntoView = function () {};
    w.HTMLCanvasElement.prototype.getContext = () => null;
    Object.defineProperty(w.navigator, 'onLine', { value: true, configurable: true });
    try { delete w.indexedDB; } catch (_) {}
    w.requestIdleCallback = fn => setTimeout(fn, 0);
  },
});
const w = dom.window;
await new Promise(r => setTimeout(r, 3500));
w.eval(`mu60Data = mu60Validate(${MATCHUPS});`);
ok(w.eval('typeof wo83Lines') === 'function', 'js/v83-watch-out.js is not loaded');
ok(w.eval('WO83_ON') === false, 'WO83_ON must stay false until it is switched on');
ok(w.eval('wo83On()') === false, 'the box shows while switched off');

const lists = JSON.parse(fs.readFileSync(path.join(HERE, 'grade-lists.json'), 'utf8'));
const listText = list => ['pokemon', 'trainer', 'energy'].map(part => {
  const rows = list.cards.filter(c => c.part === part);
  return rows.length ? ({ pokemon: 'Pokémon', trainer: 'Trainer', energy: 'Energy' })[part] + ': ' + rows.reduce((a, c) => a + c.count, 0) + '\n'
    + rows.map(c => [c.count, c.name, c.set, c.number].filter(Boolean).join(' ')).join('\n') : '';
}).filter(Boolean).join('\n\n');

const run = w.eval(`(async function (text, name) {
  const cards = parseDeckList(text);
  const deck = { id: 'wo' + Math.random().toString(36).slice(2), name, cards, history: [], format: 'standard' };
  deck.coverage = await enrichDeckCards(deck.cards); deck.enrichVer = ENRICH_VER;
  const before = gradeDeck(deck).overall;
  const R = g29Grade(deck);
  const arch = wo83Arch(deck, mu60Data);
  const lines = wo83Lines(deck, R, mu60Data, arch);
  const html = wo83Section(deck);
  const after = gradeDeck(deck).overall;
  const me = R.via && R.via.main && deck.cards.find(c => String(c.name).toLowerCase() === R.via.main.key);
  return { before, after, main: R.via && R.via.main ? R.via.main.name : null, weak: me ? me.weak : null, arch: arch ? arch.name : null,
    lines: lines.map(l => ({ id: l.id, sev: Math.round(l.sev * 1000) / 1000, head: l.head, cards: l.cards.map(c => c[0]), decks: l.decks.slice(0, 3).map(x => x.d.name) })), html };
})`);

const seen = new Map(), out = [];
for (const list of lists) {
  if (seen.has(list.deck) && seen.get(list.deck) >= 2) continue;   // two lists per deck is enough
  seen.set(list.deck, (seen.get(list.deck) || 0) + 1);
  let r;
  try { r = await run(listText(list), list.deckName); } catch (e) { ok(false, `${list.deckName}: ${e.message}`); continue; }
  ok(r.before === r.after, `${list.deckName}: grade moved from ${r.before} to ${r.after}`);
  r.lines.forEach(l => ok(l.cards.length || l.decks.length, `${list.deckName}: line ${l.id} has nothing behind it`));
  if (/lucario/i.test(list.deck) && r.weak === 'psychic') ok(r.lines.some(l => l.id === 'weak'), `${list.deckName}: no Psychic Weakness line`);
  if (/alakazam/i.test(list.deck)) ok(r.lines.some(l => l.id === 'hand'), `${list.deckName}: no hand disruption line`);
  console.log(`${list.deckName} (${list.place}, ${list.event.slice(0, 24)}) main ${r.main || 'none'}, weak ${r.weak || 'none'}, as ${r.arch || 'none'}`);
  r.lines.forEach(l => console.log(`   ${l.sev.toFixed(3)} ${l.head}: ${l.cards.join(', ')}${l.cards.length && l.decks.length ? ' | ' : ''}${l.decks.join(', ')}`));
  out.push({ name: list.deckName, html: r.html });
}
// Every box drawn once, then read in each language.
const box = w.document.createElement('div');
box.id = 'wo83-test';
box.innerHTML = out.map(o => o.html).join('');
w.document.body.appendChild(box);
const texts = () => {
  const r = [];
  const walk = n => {
    if (n.nodeType === 1 && n.hasAttribute('data-no-tr')) return;
    if (n.nodeType === 1 && n.getAttribute('aria-label')) r.push({ n, a: 'aria-label', v: n.getAttribute('aria-label') });
    if (n.nodeType === 3) {
      const v = n.nodeValue.replace(/\s+/g, ' ').trim();
      const cell = n.parentNode && n.parentNode.getAttribute && n.parentNode.getAttribute('role') === 'cell' && !n.parentNode.previousElementSibling;
      if (v && !cell && /[a-z]{3}/i.test(v) && v !== 'None') r.push({ n, v });
    }
    n.childNodes.forEach(walk);
  };
  walk(box);
  return r;
};
const en = texts().map(x => x.v);
// Words that are the same in the other language (German says Matches too, as the app's Against the meta table does).
const SAME = { de: ['Matches'] };
for (const l of ['es', 'pt', 'fr', 'de', 'it']) {
  w.rdI18n.set(l, false);
  for (let i = 0; i < 40 && w.document.documentElement.lang.slice(0, 2) !== l; i++) await new Promise(r => setTimeout(r, 100));
  await new Promise(r => setTimeout(r, 300));
  const left = new Set();
  texts().forEach((x, i) => { const now = x.a ? x.n.getAttribute(x.a) : x.n.nodeValue.replace(/\s+/g, ' ').trim(); if (now === en[i] && !(SAME[l] || []).includes(now)) left.add(now); });
  ok(!left.size, `${l}: still English: ${[...left].slice(0, 6).join(' | ')}`);
  if (process.argv.includes('--show')) console.log(l + ': ' + [...new Set(texts().map(x => x.a ? x.n.getAttribute(x.a) : x.n.nodeValue.trim()))].join(' | '));
}
w.rdI18n.set('en', false);
ok(!errors.length, 'JS errors: ' + errors.slice(0, 3).join(' | '));
if (HTML_OUT) fs.writeFileSync(HTML_OUT, JSON.stringify(out));
console.log(fails ? `${fails} failed` : 'Watch out for: all checks passed');
process.exit(fails ? 1 : 0);
