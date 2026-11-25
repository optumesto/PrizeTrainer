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
//   node tests/grade-check.mjs --results=grade-results.md
//                                          the weekly check of how well grades track tournament
//                                          results: grades every list from its cards alone and
//                                          blended with this week's matchups.json, ranks the
//                                          archetypes both ways against their results and writes
//                                          a short report. It never fails and never touches the baseline.
//   add --board=accuracy.json to also write the public scoreboard, per set (3.0), which
//                                          build-pages.mjs puts on how-grading-works.html
//   --record --record-from=<module> records from a local stand-in for the APIs
//                                          (a module exporting fakeFetch(url)) instead
//   node tests/grade-check.mjs --record-text
//                                          read the text of every legal Trainer and Special Energy
//                                          in cards.json again (from pokemon-tcg-data, or from
//                                          PT_PTCG_DIR laid out as build-cards.mjs reads it) into
//                                          tests/card-text.json. Run it when cards.json gains cards.
//
// 2.8.2: every check also makes sure RdyDeck can read every card. Each Trainer and Special Energy
// in the top lists must get a fit label and a job, and so must every legal one in cards.json (read
// from tests/card-text.json with the app's own reader). A card it can't read fails the check.
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
import { readAppHtml, staleStamps } from '../app-file.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const require = createRequire(path.join(HERE, 'package.json'));
const { JSDOM, VirtualConsole } = require('jsdom');

const args = process.argv.slice(2);
const MODE = args.includes('--record-text') ? 'text' : args.includes('--record') ? 'record' : args.includes('--update') ? 'update' : 'check';
const ONLY = (args.find(a => a.startsWith('--only=')) || '').slice(7).toLowerCase();
const VERBOSE = args.includes('--verbose');
const REPORT = (args.find(a => a.startsWith('--results=')) || '').slice(10);
const HTML = (args.find(a => a.startsWith('--html=')) || '').slice(7);   // grade another build, e.g. the live one
// 3.0: with --results, --board=<file> also writes the public scoreboard (accuracy.json).
const BOARD = (args.find(a => a.startsWith('--board=')) || '').slice(8);
// --record-from=<module>: record from a local stand-in for the card APIs (a module that
// exports fakeFetch(url)) instead of the live APIs, for example where they are blocked.
const FROM = (args.find(a => a.startsWith('--record-from=')) || '').slice(14);
const upstream = FROM ? (await import(path.resolve(FROM))).fakeFetch : null;

const LISTS = path.join(HERE, 'grade-lists.json');
const CARDS = path.join(HERE, 'grade-cards.json.gz');
const BASE = path.join(HERE, 'grade-baseline.json');
const TEXT = path.join(HERE, 'card-text.json');

// ── --record-text: the text of every legal Trainer and Special Energy ─────
if (MODE === 'text') {
  const PTCG = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master', DIR = process.env.PT_PTCG_DIR || '';
  const get = async p => {
    if (DIR) { try { return JSON.parse(fs.readFileSync(path.join(DIR, p), 'utf8')); } catch (_) { return null; } }
    await new Promise(r => setTimeout(r, 300));
    const r = await fetch(`${PTCG}/${p}`, { headers: { 'User-Agent': 'RdyDeck-tests/1.0 (+https://rdydeck.com/)' } });
    return r.ok ? r.json() : null;
  };
  const want = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, 'cards.json'), 'utf8')).cards
    .filter(c => c.k === 'T' || (c.k === 'E' && !c.be)).map(c => [c.n, c]));
  const sets = await get('sets/en.json');
  if (!Array.isArray(sets)) { console.error('Set list unreadable.'); process.exit(2); }
  const out = {};
  for (const st of sets.filter(x => /^(sv|zsv|rsv|me|svp$|sve$)/.test(x.id))) {
    const cards = await get(`cards/en/${st.id}.json`);
    for (const c of cards || []) {
      const n = String(c.name || '').replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim();
      if (!want.has(n) || out[n] || !(c.supertype === 'Trainer' || c.supertype === 'Energy')) continue;
      out[n] = { kind: c.supertype === 'Energy' ? 'energy' : ({ I: 'item', S: 'supporter', D: 'stadium', O: 'tool' })[want.get(n).tk] || 'item', supertype: c.supertype, subtypes: c.subtypes || [], rules: c.rules || [] };
    }
  }
  // 3.5.1: SVP and MEP promos that pokemon-tcg-data lacks come from TCGdex, as in build-cards.mjs.
  const TDEX = 'https://raw.githubusercontent.com/tcgdex/cards-database/master/data';
  const TSET = { SVP: 'Scarlet & Violet/SVP Black Star Promos', MEP: 'Mega Evolution/MEP Black Star Promos' };
  for (const [n, c] of want) {
    if (out[n] || !TSET[c.s] || !c.no) continue;
    const r = await fetch(`${TDEX}/${TSET[c.s].split('/').map(encodeURIComponent).join('/')}/${String(c.no).padStart(3, '0')}.ts`, { headers: { 'User-Agent': 'RdyDeck-tests/1.0 (+https://rdydeck.com/)' } }).catch(() => null);
    const src = r && r.ok ? await r.text() : '';
    const m = /effect:\s*\{[^}]*?\ben:\s*"((?:[^"\\]|\\.)*)"/.exec(src);
    if (!m) continue;
    const kind = c.k === 'E' ? 'energy' : ({ I: 'item', S: 'supporter', D: 'stadium', O: 'tool' })[c.tk] || 'item';
    const sub = { item: 'Item', supporter: 'Supporter', stadium: 'Stadium', tool: 'Pokémon Tool', energy: 'Special' }[kind];
    out[n] = { kind, supertype: c.k === 'E' ? 'Energy' : 'Trainer', subtypes: [sub], rules: [m[1].replace(/\\(.)/g, '$1')] };
  }
  const sorted = Object.fromEntries(Object.keys(out).sort().map(k => [k, out[k]]));
  fs.writeFileSync(TEXT, JSON.stringify({ note: 'Card text of every legal Trainer and Special Energy in cards.json, from pokemon-tcg-data (SVP and MEP promos it lacks from TCGdex), for the check that RdyDeck reads every card. Written by tests/grade-check.mjs --record-text.', cards: sorted }, null, 1) + '\n');
  const miss = [...want.keys()].filter(n => !out[n]);
  console.log(`Saved the text of ${Object.keys(out).length} cards to tests/card-text.json.${miss.length ? ' No text found for: ' + miss.join(', ') : ''}`);
  process.exit(0);
}

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
  // The app is index.html plus app.css and js/; readAppHtml puts them back inline, in the order the browser runs them.
  const htmlPath = HTML ? path.resolve(HTML) : path.join(ROOT, 'index.html');
  const stale = staleStamps(htmlPath);
  if (stale.length) { console.error('Problems with the files index.html links (for stamps, run node app-file.mjs --stamp): ' + stale.join(', ')); process.exit(1); }
  // 3.6.6: the language home pages copy index.html, so they must follow it (node app-file.mjs --stamp writes them).
  if (!HTML) {
    const { langPages } = await import('../lang-pages.mjs');
    const lb = langPages(true);
    if (lb.length) { console.error('Language pages: ' + lb.join(', ')); process.exit(1); }
  }
  const html = readAppHtml(htmlPath);
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
  // A list may carry "rotated": { "<card name>": "<mark>" }. That card is then read as a printing
  // with that mark which no reprint keeps legal, so the list tests the legality cap (the saved card
  // data has no card that is out of Standard, and the card APIs cannot be read offline).
  // A list may also carry "oldPrinting": { "<card name>": "<mark>" }. That card is read as an older
  // printing with a G mark, and the reprint check finds a printing with the given mark. Old art of a
  // reprinted card counts as legal, so the list must grade as legal and never show a capped number first.
  const run = w.eval(`(async function (text, name, rotated, oldPrinting) {
    const cards = parseDeckList(text);
    const deck = { id: 'gc' + Math.random().toString(36).slice(2), name, cards, history: [], format: 'standard' };
    const cov = await enrichDeckCards(deck.cards);
    deck.coverage = cov; deck.enrichVer = ENRICH_VER;
    if (typeof r29NeedsCheck === 'function' && typeof r29CheckReprints === 'function') {
      try { if (r29NeedsCheck(deck, r29Rows(deck))) await r29CheckReprints(deck); } catch (_) {}
    }
    if (rotated) {
      if (!deck.rot29 || deck.rot29.v !== ROT29.v) deck.rot29 = { v: ROT29.v, names: {} };
      for (const c of deck.cards) {
        const m = rotated[c.name];
        if (!m) continue;
        c.reg = { mark: m, status: 'out' }; delete c.byName;
        deck.rot29.names[r29Key(c.name)] = { best: m };
      }
    }
    if (oldPrinting) {
      for (const c of deck.cards) {
        if (!oldPrinting[c.name]) continue;
        c.reg = { mark: 'G', status: 'out' }; delete c.byName;
      }
      const before = r29Rows(deck).filter(r => oldPrinting[r.name]);
      if (before.some(r => r.st === 'out')) throw new Error('an old printing counted as not legal before the reprint check');
      // A fresh deck whose reprint check has not run yet: the grade waits for it rather than show a number.
      if (typeof g71Wait === 'function') {
        _r29Tried.delete(deck.id); _dataTried.add(deck.id);
        const was = mu60Tried; mu60Tried = true;
        const wt = g71Wait(deck); mu60Tried = was;
        if (wt !== 'rot') throw new Error('the grade did not wait for the reprint check: ' + (wt || 'no wait'));
      }
      if (!deck.rot29 || deck.rot29.v !== ROT29.v) deck.rot29 = { v: ROT29.v, names: {} };
      for (const c of deck.cards) if (oldPrinting[c.name]) deck.rot29.names[r29Key(c.name)] = { best: oldPrinting[c.name] };
      const after = r29Rows(deck).filter(r => oldPrinting[r.name]);
      if (!after.length || after.some(r => r.st !== 'safe')) throw new Error('an old printing with a legal reprint did not count as legal');
    }
    const R = gradeDeck(deck);
    // The same deck must grade the same twice in a row: a grade that moves on a second look is a bug.
    const again = gradeDeck(deck);
    if (again.overall !== R.overall) throw new Error('graded ' + R.overall + ' then ' + again.overall);
    // The sum under the grade must add up as written.
    if (typeof g67HowLine === 'function' && R.coh && R.via) {
      const line = g67HowLine(R, gR1(R.coh.score * 10), gR1(R.via.score * 10));
      const m = line.match(/([0-9.]+) times ([0-9.]+), divided by 10, is ([0-9]+[.][0-9])/);
      if (!m || gR1(+m[1] * +m[2] / 10) !== +m[3]) throw new Error('the sum under the grade does not add up: ' + line);
    }
    // 2.8.2: every Trainer and Special Energy must get a fit label and a job RdyDeck reads.
    const tr = R.coh && R.coh.trainers, unread = [];
    if (tr) (tr.fit || []).forEach(r => { if (!r.fit || !(r.roles || []).length) unread.push(r.name); });
    for (const c of deck.cards) {
      if (!c.ace) continue;
      const kd = c.supertype === 'Energy' ? 'energy' : String(c.ttype || 'item').toLowerCase();
      const tx = kd === 'energy' ? c.etext : c.rtext;
      if (tx && !gtRoles(tx, kd).size) unread.push(c.name + ' (ACE SPEC)');
    }
    return { R, cov, unread };
  })`);
  grading = true;
  let out;
  try { out = await run(listText(list), list.deckName, list.rotated || null, list.oldPrinting || null); } finally { grading = false; }
  const { R, cov, unread } = out;
  return {
    id: String(i + 1).padStart(3, '0'),
    deck: list.deckName, place: list.place, event: list.event,
    // 3.5.11: the grade's own main attacker pick, for the deck guide roles check below.
    deckId: list.deck, main: R.via && R.via.auto ? R.via.auto.name : null,
    grade: R.overall,
    // How much of the grade came from tournament results, and which archetype they were for.
    results: R.res ? R.res.name + ' ' + Math.round(R.res.w * 100) + '%' : undefined,
    synergy: r2(R.coh && R.coh.score * 10),
    power: r2(R.via && R.via.score * 10),
    read: cov ? cov.resolved + '/' + cov.total : '?',
    // Held at the legality cap: which cards, so a move to 4.9 explains itself.
    cap: R.rawOverall != null ? String((R.coh.flaws[0] || {}).d || '').split('.')[0] : undefined,
    unread,
  };
}

// ── weekly: how well grades track tournament results ─────────────────────
const rankOf = a => {
  const ix = a.map((v, i) => i).sort((i, j) => a[i] - a[j]), r = new Array(a.length);
  for (let i = 0; i < ix.length;) { let j = i; while (j + 1 < ix.length && a[ix[j + 1]] === a[ix[i]]) j++; for (let k = i; k <= j; k++) r[ix[k]] = (i + j) / 2; i = j + 1; }
  return r;
};
function spearman(x, y) {
  if (x.length < 4) return null;
  const a = rankOf(x), b = rankOf(y), n = a.length, ma = (n - 1) / 2;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - ma); saa += (a[i] - ma) ** 2; sbb += (b[i] - ma) ** 2; }
  return saa && sbb ? Math.round(100 * sab / Math.sqrt(saa * sbb)) / 100 : null;
}
async function resultsReport() {
  const raw = fs.readFileSync(path.join(ROOT, 'matchups.json'), 'utf8');
  const M = JSON.parse(raw);
  w.__live = raw;
  if (!w.eval('!!(mu60Data = mu60Validate(JSON.parse(window.__live)))')) { console.error('matchups.json did not load.'); return; }
  if (w.eval('typeof g76Set') === 'function') { w.__bld = fs.readFileSync(path.join(ROOT, 'builder.json'), 'utf8'); w.eval('g76Set(JSON.parse(window.__bld))'); }
  if (w.eval('typeof g88Set') === 'function') { w.__mc = fs.readFileSync(path.join(ROOT, 'meta-cards.json'), 'utf8'); w.eval('g88Set(JSON.parse(window.__mc))'); }
  w.__liveData = w.eval('mu60Data');
  const per = {};
  // Test lists (a forced rotated card, an old printing) are not real results, so they stay out.
  const real = lists.filter(l => !l.rotated && !l.oldPrinting);
  for (let i = 0; i < lists.length; i++) {
    const l = lists[i];
    if (l.rotated || l.oldPrinting) continue;
    try {
      w.eval('mu60Data = null');
      const c = await gradeList(w, l, i);
      w.eval('mu60Data = window.__liveData');
      const b = await gradeList(w, l, i);
      const k = (per[l.deckName] = per[l.deckName] || { card: [], blend: [] });
      k.card.push(c.grade); k.blend.push(b.grade);
    } catch (_) {}
  }
  const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const sum = v => Object.values(v || {}).reduce((a, r) => a.map((x, i) => x + (r[i] || 0)), [0, 0, 0, 0, 0, 0]);
  const rows = [];
  for (const d of M.decks) {
    const g = per[d.name];
    if (!g || d.id === 'other') continue;
    const r = sum(d.rec), cr = sum(d.cur && d.cur.rec);
    rows.push({ name: d.name, lists: d.lists, n: r[0] + r[1], wr: r[0] / Math.max(1, r[0] + r[1]), cn: cr[0] + cr[1], cwr: cr[0] / Math.max(1, cr[0] + cr[1]), card: med(g.card), blend: med(g.blend) });
  }
  const A = rows.filter(r => r.n >= 300), C = rows.filter(r => r.cn >= 100);
  const f = v => v == null ? 'too few' : (v > 0 ? '+' : '') + v.toFixed(2);
  const cw = A.map(r => r.wr);
  const L = [];
  L.push(`# How well grades track tournament results`, '');
  L.push(`Results from matchups.json (${M.since} to ${M.until}${M.cur ? `, newest set since ${M.cur.since}` : ''}). Lists: the ${real.length} fixed top lists in tests/grade-lists.json, so a new archetype shows up here only after the lists are refreshed. 1.00 means the grades rank archetypes exactly as their win rates do, 0 means no link.`, '');
  L.push(`- **All results (${A.length} archetypes with 300+ games):** cards alone ${f(spearman(A.map(r => r.card), cw))}, grade as shown ${f(spearman(A.map(r => r.blend), cw))}. The grade as shown uses these same results, so it is partly circular.`);
  L.push(`- **Since the newest set (${C.length} archetypes with 100+ games):** cards alone ${f(spearman(C.map(r => r.card), C.map(r => r.cwr)))}, grade as shown ${f(spearman(C.map(r => r.blend), C.map(r => r.cwr)))}.${C.length < 8 ? ' Too few archetypes to trust yet.' : ''}`);
  // Where the cards and the results disagree most: rank by card grade against rank by win rate.
  const rc = rankOf(A.map(r => r.card)), rw = rankOf(cw);
  const gap = A.map((r, i) => ({ ...r, d: (rc[i] - rw[i]) / Math.max(1, A.length - 1) })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 8);
  L.push('', '## Where the cards and the results disagree most', '');
  for (const r of gap) L.push(`- **${r.name}:** cards ${r.card.toFixed(1)}, shown ${r.blend.toFixed(1)}, wins ${(100 * r.wr).toFixed(1)}% of ${r.n.toLocaleString('en-US')} games. ${r.d > 0 ? 'The cards rate it above its results.' : 'Its results beat what the cards see.'}`);
  fs.writeFileSync(path.resolve(ROOT, REPORT), L.join('\n') + '\n');
  console.log(L.join('\n'));
  if (BOARD) writeBoard(M, rows);
}

// 3.0: the public scoreboard (accuracy.json), one row per set window: the set before the newest
// (every game before the newest set came out) and the newest set. build-pages.mjs writes it into
// how-grading-works.html and the app shows one line of it under How the grade works. Only the
// rank match, the deck count and the games are published, nothing about how the grade is tuned.
const BOARD_MIN = { older: 300, newest: 100 };   // games an archetype needs in a window to be ranked
function writeBoard(M, rows) {
  const day = s => { const d = new Date(Date.parse(s + 'T00:00:00Z') - 86400000); return d.toISOString().slice(0, 10); };
  let mcNew = null;
  try { mcNew = JSON.parse(fs.readFileSync(path.join(ROOT, 'meta-cards.json'), 'utf8')).newest || null; } catch (_) {}
  const src = (M.sources || []).find(s => s.id === 'online') || {};
  const curSince = M.cur && M.cur.since;
  const sets = [];
  const one = (name, from, to, min, games, pick) => {
    const R = rows.map(r => ({ ...r, ...pick(r) })).filter(r => r.g >= min);
    const wr = R.map(r => r.w);
    sets.push({ name, from, to, decks: R.length, games, min,
      shown: spearman(R.map(r => r.blend), wr), cards: spearman(R.map(r => r.card), wr) });
  };
  if (curSince) {
    one(M.window && M.window.from || 'Before ' + curSince, M.since, day(curSince), BOARD_MIN.older, (src.matches || 0) - (M.cur.matches || 0),
      r => { const g = r.n - r.cn, w = r.wr * r.n - r.cwr * r.cn; return { g, w: g ? w / g : 0 }; });
    one(mcNew && mcNew.since === curSince && mcNew.name || 'Newest set', curSince, M.until, BOARD_MIN.newest, M.cur.matches || 0,
      r => ({ g: r.cn, w: r.cwr }));
  } else {
    one(M.window && M.window.from || 'Since ' + M.since, M.since, M.until, BOARD_MIN.older, src.matches || 0, r => ({ g: r.n, w: r.wr }));
  }
  const out = {
    schema: 1, asOf: M.asOf,
    note: 'How closely RdyDeck grades rank decks against their Limitless online win rates, per set. Rank correlation (Spearman): 1 means the grades put the decks in exactly the order of their win rates, 0 means no link. shown is the grade the app shows (it counts these same results, so it runs high), cards is the grade from the cards alone. Written by tests/grade-check.mjs --results --board.',
    source: 'Limitless online tournaments', lists: lists.filter(l => !l.rotated && !l.oldPrinting).length,
    sets,
  };
  fs.writeFileSync(path.resolve(ROOT, BOARD), JSON.stringify(out, null, 1) + '\n');
  console.log('\nScoreboard: ' + sets.map(s => `${s.name} ${s.from} to ${s.to}: ${s.decks} decks, ${s.games} games, shown ${s.shown}, cards ${s.cards}`).join('; '));
}

// ── main ─────────────────────────────────────────────────────────────────
const lists = JSON.parse(fs.readFileSync(LISTS, 'utf8'));
const { w, errors } = await loadApp();
// 2.7.3: the names of every Trainer legal now (cards.json), as the app saves them on the device, so an
// old printing of a reprinted Trainer counts as legal before the online reprint check, and a Trainer
// with no legal printing is not legal now. Checked once here on a made-up list.
if (w.eval('typeof r273Set') === 'function') {
  w.__cj = fs.readFileSync(path.join(ROOT, 'cards.json'), 'utf8');
  if (!w.eval('r273Tried = true, r273Set(JSON.parse(window.__cj))')) { console.error('cards.json did not load as the list of legal Trainers.'); process.exit(1); }
  const st = JSON.parse(w.eval(`JSON.stringify(r29Rows({ cards: [
    { name: 'Iono', count: 4, supertype: 'Trainer', reg: { mark: 'G', status: 'out' } },
    { name: 'Ultra Ball', count: 4, supertype: 'Trainer', reg: { mark: 'G', status: 'out' } },
    { name: 'Pok\u00e9gear 3.0', count: 1, supertype: 'Trainer', reg: { mark: 'G', status: 'out' } }] }).map(r => r.st))`));
  if (st.join() !== 'out,safe,safe') { console.error('Legal Trainer list: expected out,safe,safe for Iono, Ultra Ball, Pokegear 3.0 (G printings), got ' + st.join()); process.exit(1); }
}
// The grade blends in tournament results from matchups.json (v68). The check uses a pinned copy,
// tests/grade-matchups.json, so a weekly data refresh cannot move the baseline. RESULTS=off grades
// from the cards alone.
const PINNED = path.join(HERE, 'grade-matchups.json');
if (REPORT) { await resultsReport(); process.exit(0); }
if (process.env.RESULTS !== 'off' && fs.existsSync(PINNED)) {
  w.__pinned = fs.readFileSync(PINNED, 'utf8');
  w.eval('mu60Data = mu60Validate(JSON.parse(window.__pinned));');
  if (!w.eval('!!mu60Data')) { console.error('tests/grade-matchups.json did not load.'); process.exit(2); }
} else if (w.eval('typeof mu60Data') !== 'undefined') w.eval('mu60Data = null; mu60Tried = true;');
// v76: the Trainers winning lists run (builder.json's played list), pinned the same way in
// tests/grade-played.json. RESULTS=off leaves it out too.
const PLAYED = path.join(HERE, 'grade-played.json');
if (w.eval('typeof g76Set') === 'function') {
  if (process.env.RESULTS !== 'off' && fs.existsSync(PLAYED)) {
    w.__played = fs.readFileSync(PLAYED, 'utf8');
    if (!w.eval('g76Set(JSON.parse(window.__played))')) { console.error('tests/grade-played.json did not load.'); process.exit(2); }
  } else w.eval('g76Played = null; g76Tried = true;');
}
// 2.6.8: the Energy each archetype's top lists run (from meta-cards.json), pinned the same way in
// tests/grade-builds.json. RESULTS=off leaves it out too.
const BUILDS = path.join(HERE, 'grade-builds.json');
if (w.eval('typeof g88Set') === 'function') {
  if (process.env.RESULTS !== 'off' && fs.existsSync(BUILDS)) {
    w.__builds = fs.readFileSync(BUILDS, 'utf8');
    if (!w.eval('g88Set(JSON.parse(window.__builds))')) { console.error('tests/grade-builds.json did not load.'); process.exit(2); }
  } else w.eval('g88Data = null; g88Tried = true;');
}
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

// 2.8.2: RdyDeck must read every card. Cards in the top lists, as the app read them above:
const unreadInLists = new Map();
for (const r of results) for (const n of r.unread || []) unreadInLists.set(n, (unreadInLists.get(n) || 0) + 1);
// Every legal Trainer and Special Energy, from the saved text, through the app's own reader.
const unreadLegal = [], noText = [];
if (!ONLY) {
  const legal = JSON.parse(fs.readFileSync(path.join(ROOT, 'cards.json'), 'utf8')).cards.filter(c => c.k === 'T' || (c.k === 'E' && !c.be));
  const saved = fs.existsSync(TEXT) ? JSON.parse(fs.readFileSync(TEXT, 'utf8')).cards : {};
  w.__ct = JSON.stringify(saved);
  const jobs = JSON.parse(w.eval(`(function () {
    const T = JSON.parse(window.__ct), out = {};
    for (const n of Object.keys(T)) {
      const c = T[n];
      // The text the app keeps, read the way the app reads a card from pokemontcg.io.
      const en = TCGEnrich.enrichCard({ name: n, supertype: c.supertype, subtypes: c.subtypes, rules: c.rules });
      out[n] = [...gtRoles(c.kind === 'energy' ? en.etext : en.rtext, c.kind)];
    }
    return JSON.stringify(out);
  })()`));
  for (const c of legal) {
    if (!jobs[c.n]) noText.push(c.n);
    else if (!jobs[c.n].length) unreadLegal.push(c.n);
  }
  console.log(`Read ${legal.length - noText.length} of ${legal.length} legal Trainers and Special Energy: ${unreadLegal.length} with no job RdyDeck reads.`);
}
if (unreadInLists.size) console.log(`${unreadInLists.size} cards in the top lists get no fit label or no job:\n` + [...unreadInLists].map(([n, k]) => `  ${n} (${k} list${k === 1 ? '' : 's'})`).join('\n'));
if (unreadLegal.length) console.log(`${unreadLegal.length} legal cards RdyDeck can't read (teach gtRoles in js/core.js what they do):\n  ` + unreadLegal.join(', '));
if (noText.length) console.log(`${noText.length} legal cards have no saved text (run node tests/grade-check.mjs --record-text):\n  ` + noText.join(', '));
const readFail = unreadInLists.size + unreadLegal.length + noText.length;

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

// 3.5.11: deck guide roles. The first Pokemon in a guide's key cards (deck-guides.json) must be the main
// attacker the grade picks for most of that deck's top lists, so a guide never leads with the engine
// (Ogerpon Meganium Arboliva once named Teal Mask Ogerpon ex where Arboliva ex attacks).
const roleFail = [];
if (!ONLY) {
  const guides = JSON.parse(fs.readFileSync(path.join(ROOT, 'deck-guides.json'), 'utf8')).decks;
  for (const g of guides) {
    const rs = results.filter(r => r.deckId === g.id && r.main);
    if (!rs.length) continue;
    const mons = new Set(lists.filter(l => l.deck === g.id).flatMap(l => l.cards.filter(c => c.part === 'pokemon').map(c => c.name)));
    const first = (g.keys.find(k => mons.has(k[0])) || [])[0];
    const n = {}; rs.forEach(r => { n[r.main] = (n[r.main] || 0) + 1; });
    const top = Object.keys(n).sort((x, y) => n[y] - n[x])[0];
    if (first !== top) roleFail.push(`  ${g.slug}: the guide leads with ${first || 'no Pokemon'}, the grade picks ${top} as the main attacker (${n[top]} of ${rs.length} lists)`);
  }
  if (roleFail.length) console.log('Deck guide roles check FAILED: put the main attacker first in its key cards, or fix the pick.\n' + roleFail.join('\n'));
  else console.log('Deck guide roles check passed: every guide leads with the main attacker the grade picks.');
}

if (MODE === 'check') {
  const missingBase = results.filter(r => !base.lists[r.id]).length;
  if (missingBase) console.log(`${missingBase} lists have no baseline grade yet. Run --update to set one.`);
  const fail = moved.length || broke.length || missed.size || missingBase || readFail || roleFail.length;
  if (readFail) console.log('Card read check FAILED: every card must get a label.');
  console.log(fail ? 'Grade check FAILED. If every move above is intended, run: node tests/grade-check.mjs --update' : 'Grade check passed: no grade moved.');
  process.exit(fail ? 1 : 0);
}

if (broke.length) { console.log('Baseline not written: fix the lists that failed first.'); process.exit(1); }
const next = { note: 'Written by tests/grade-check.mjs --update or --record. Each list: grade, Synergy and Power as shown, cards read.', lists: {} };
if (ONLY) Object.assign(next.lists, base.lists);
for (const r of results) next.lists[r.id] = { deck: r.deck, event: r.event, place: r.place, grade: r.grade, results: r.results, synergy: r.synergy, power: r.power, read: r.read, cap: r.cap };
fs.writeFileSync(BASE, JSON.stringify(next, null, 1) + '\n');
console.log(`Baseline written for ${results.length} lists.`);
process.exit(0);
