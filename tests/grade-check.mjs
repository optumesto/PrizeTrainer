// Grade check: grades the 128 top lists in tests/grade-lists.json with the
// app's own code from index.html and compares them with tests/grade-baseline.json.
// Run it before every release. Any grade that moves fails the check, so a fix
// can't shift grades without anyone noticing.
//
//   node tests/grade-check.mjs            check (offline, from the saved card data)
//   node tests/grade-check.mjs --update   accept the grades the code gives now
//   node tests/grade-check.mjs --record   read the card data again from the card
//                                          APIs, then rewrite the baseline
//   add --only=<text> to run only lists whose deck or event names contain it
//   add --html=<file> to grade another build (say the live index.html) against the baseline
//   --record --record-from=<module> records from a local stand-in for the APIs
//                                          (a module exporting fakeFetch(url)) instead
//
// The card data the app reads (pokemontcg.io, TCGdex) is saved in
// tests/grade-cards.json.gz, so a check gives the same answer every time and
// needs no network. Record again only on purpose, for example after the APIs
// add a new set the lists use; a record can move grades by itself.
//
// Needs jsdom: npm install --prefix tests (versions pinned in tests/package.json).

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const require = createRequire(path.join(HERE, 'package.json'));
const { JSDOM, VirtualConsole } = require('jsdom');

const args = process.argv.slice(2);
const MODE = args.includes('--record') ? 'record' : args.includes('--update') ? 'update' : 'check';
const ONLY = (args.find(a => a.startsWith('--only=')) || '').slice(7).toLowerCase();
const VERBOSE = args.includes('--verbose');
const HTML = (args.find(a => a.startsWith('--html=')) || '').slice(7);   // grade another build, e.g. the live one
// --record-from=<module>: record from a local stand-in for the card APIs (a module that
// exports fakeFetch(url)) instead of the live APIs, for example where they are blocked.
const FROM = (args.find(a => a.startsWith('--record-from=')) || '').slice(14);
const upstream = FROM ? (await import(path.resolve(FROM))).fakeFetch : null;

const LISTS = path.join(HERE, 'grade-lists.json');
const CARDS = path.join(HERE, 'grade-cards.json.gz');
const BASE = path.join(HERE, 'grade-baseline.json');

// ── saved API responses ──────────────────────────────────────────────────
let cache = {};
if (fs.existsSync(CARDS)) cache = JSON.parse(zlib.gunzipSync(fs.readFileSync(CARDS)).toString('utf8'));
else if (MODE !== 'record') {
  console.error('No saved card data (tests/grade-cards.json.gz). Run with --record where the card APIs can be reached.');
  process.exit(2);
}
const CARD_HOSTS = /^https:\/\/(api\.pokemontcg\.io|api\.tcgdex\.net)\//;
let grading = false;            // only requests made while a list is graded must be saved
const missed = new Set();

function keyOf(url, init) {
  return ((init && init.method) || 'GET').toUpperCase() + ' ' + String(url);
}

async function fakeFetch(input, init) {
  const url = typeof input === 'string' ? input : (input && input.url) || String(input);
  const key = keyOf(url, init);
  if (!CARD_HOSTS.test(url)) return new Response('', { status: 404 });   // ads, data refresh, images
  if (MODE === 'record') {
    if (!cache[key]) {
      let r = null, body = '', tries = 0;
      for (;;) {
        // A gentle pace: pokemontcg.io allows about 30 requests a minute without a key.
        if (!upstream) await new Promise(res => setTimeout(res, /pokemontcg/.test(url) && !process.env.PTCG_API_KEY ? 2100 : 150));
        if (upstream) {
          r = await upstream(url); body = await r.text();
          r = { status: r.status, headers: { get: () => 'application/json' } };
          break;
        }
        try {
          const headers = Object.assign({}, init && init.headers);
          if (/pokemontcg/.test(url) && process.env.PTCG_API_KEY) headers['X-Api-Key'] = process.env.PTCG_API_KEY;
          r = await fetch(url, { method: (init && init.method) || 'GET', headers });
          body = await r.text();
        } catch (e) { r = null; }
        if (r && r.status !== 429 && r.status < 500) break;
        if (++tries > 6) break;
        await new Promise(res => setTimeout(res, 10000 * tries));
      }
      if (!r) return new Response('', { status: 503 });
      cache[key] = { s: r.status, t: r.headers.get('content-type') || 'application/json', b: body };
    }
  }
  const hit = cache[key];
  if (!hit) {
    if (grading) missed.add(key);
    return new Response('', { status: 503, statusText: 'Not in saved card data' });
  }
  return new Response(hit.b, { status: hit.s, headers: { 'content-type': hit.t } });
}

// ── load the app ─────────────────────────────────────────────────────────
// A fixed clock, so nothing that reads today's date moves a grade.
const FIXED_NOW = Date.parse('2026-11-11T12:00:00Z');

async function loadApp() {
  const html = fs.readFileSync(HTML ? path.resolve(HTML) : path.join(ROOT, 'index.html'), 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(String(e && e.message || e)));
  if (VERBOSE) vc.sendTo(console, { omitJSDOMErrors: true });
  const dom = new JSDOM(html, {
    url: 'https://rdydeck.com/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      const RealDate = w.Date;
      class FixedDate extends RealDate {
        constructor(...a) { if (a.length) super(...a); else super(FIXED_NOW); }
        static now() { return FIXED_NOW; }
      }
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
      // No IndexedDB here, so saved state stays in memory for the run.
      try { delete w.indexedDB; } catch (_) {}
      w.requestIdleCallback = fn => setTimeout(fn, 0);
    },
  });
  await new Promise(r => setTimeout(r, 3500));   // let start-up timers settle
  return { dom, w: dom.window, errors };
}

// ── grade one list the way the app does ─────────────────────────────────
function listText(list) {
  const label = { pokemon: 'Pokémon', trainer: 'Trainer', energy: 'Energy' };
  return ['pokemon', 'trainer', 'energy'].map(part => {
    const rows = list.cards.filter(c => c.part === part);
    if (!rows.length) return '';
    return label[part] + ': ' + rows.reduce((a, c) => a + c.count, 0) + '\n' +
      rows.map(c => [c.count, c.name, c.set, c.number].filter(Boolean).join(' ')).join('\n');
  }).filter(Boolean).join('\n\n');
}

const r2 = x => (typeof x === 'number' && isFinite(x) ? Math.round(x * 100) / 100 : null);

async function gradeList(w, list, i) {
  const run = w.eval(`(async function (text, name) {
    const cards = parseDeckList(text);
    const deck = { id: 'gc' + Math.random().toString(36).slice(2), name, cards, history: [], format: 'standard' };
    const cov = await enrichDeckCards(deck.cards);
    deck.coverage = cov; deck.enrichVer = ENRICH_VER;
    if (typeof r29NeedsCheck === 'function' && typeof r29CheckReprints === 'function') {
      try { if (r29NeedsCheck(deck, r29Rows(deck))) await r29CheckReprints(deck); } catch (_) {}
    }
    const R = gradeDeck(deck);
    return { R, cov };
  })`);
  grading = true;
  let out;
  try { out = await run(listText(list), list.deckName); } finally { grading = false; }
  const { R, cov } = out;
  return {
    id: String(i + 1).padStart(3, '0'),
    deck: list.deckName, place: list.place, event: list.event,
    grade: R.overall,
    synergy: r2(R.coh && R.coh.score * 10),
    power: r2(R.via && R.via.score * 10),
    read: cov ? cov.resolved + '/' + cov.total : '?',
    // Held at the legality cap: which cards, so a move to 4.9 explains itself.
    cap: R.rawOverall != null ? String((R.coh.flaws[0] || {}).d || '').split('.')[0] : undefined,
  };
}

// ── main ─────────────────────────────────────────────────────────────────
const lists = JSON.parse(fs.readFileSync(LISTS, 'utf8'));
const { w, errors } = await loadApp();
for (const fn of ['parseDeckList', 'enrichDeckCards', 'gradeDeck']) {
  if (w.eval('typeof ' + fn) !== 'function') {
    console.error(`The app did not load: ${fn} is missing.\n` + errors.slice(0, 5).join('\n'));
    process.exit(2);
  }
}

const results = [];
for (let i = 0; i < lists.length; i++) {
  const l = lists[i];
  if (ONLY && !(l.deckName + ' ' + l.event).toLowerCase().includes(ONLY)) continue;
  try { results.push(await gradeList(w, l, i)); }
  catch (e) { results.push({ id: String(i + 1).padStart(3, '0'), deck: l.deckName, error: String(e && e.message || e) }); }
  if (MODE === 'record' && (i + 1) % 16 === 0) console.log(`read ${i + 1} of ${lists.length}`);
}

if (MODE === 'record') {
  fs.writeFileSync(CARDS, zlib.gzipSync(JSON.stringify(cache), { level: 9 }));
  console.log(`Saved ${Object.keys(cache).length} card data responses to tests/grade-cards.json.gz`);
}

const base = fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, 'utf8')) : { lists: {} };
const fmt = r => r.error ? 'error' : `${r.grade.toFixed(1)} (Synergy ${r.synergy}, Power ${r.power}, read ${r.read}${r.cap ? ', not legal: ' + r.cap : ''})`;
const moved = [], broke = results.filter(r => r.error);
for (const r of results) {
  const b = base.lists[r.id];
  if (!b || r.error) continue;
  if (b.grade !== r.grade || b.synergy !== r.synergy || b.power !== r.power || b.read !== r.read) moved.push({ r, b });
}
const grades = results.filter(r => !r.error).map(r => r.grade).sort((a, b) => a - b);
const median = grades.length ? grades[Math.floor(grades.length / 2)] : null;
console.log(`Graded ${results.length} lists. Median ${median}, lowest ${grades[0]}, highest ${grades[grades.length - 1]}.`);
if (broke.length) console.log(`${broke.length} lists failed to grade:\n` + broke.map(r => `  ${r.id} ${r.deck}: ${r.error}`).join('\n'));
if (missed.size) console.log(`${missed.size} card data requests are not in the saved data (the code asks for something new; run --record on purpose):\n` +
  [...missed].slice(0, 10).map(k => '  ' + k).join('\n'));
if (moved.length) {
  console.log(`${moved.length} lists moved:`);
  for (const { r, b } of moved) console.log(`  ${r.id} ${r.deck} (${r.event}, ${r.place}): ${fmt(b)} -> ${fmt(r)}`);
}

if (MODE === 'check') {
  const missingBase = results.filter(r => !base.lists[r.id]).length;
  if (missingBase) console.log(`${missingBase} lists have no baseline grade yet. Run --update to set one.`);
  const fail = moved.length || broke.length || missed.size || missingBase;
  console.log(fail ? 'Grade check FAILED. If every move above is intended, run: node tests/grade-check.mjs --update' : 'Grade check passed: no grade moved.');
  process.exit(fail ? 1 : 0);
}

if (broke.length) { console.log('Baseline not written: fix the lists that failed first.'); process.exit(1); }
const next = { note: 'Written by tests/grade-check.mjs --update or --record. Each list: grade, Synergy and Power as shown, cards read.', lists: {} };
if (ONLY) Object.assign(next.lists, base.lists);
for (const r of results) next.lists[r.id] = { deck: r.deck, event: r.event, place: r.place, grade: r.grade, synergy: r.synergy, power: r.power, read: r.read, cap: r.cap };
fs.writeFileSync(BASE, JSON.stringify(next, null, 1) + '\n');
console.log(`Baseline written for ${results.length} lists.`);
process.exit(0);
