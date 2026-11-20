// 3.4.20 Guess the Grade check: opens the app in jsdom (no browser) and plays js/gtg.js.
// - The answer is the grade the Grade tab shows for the same list imported as a deck, in the same
//   session with the same data, for every list the game can pick.
// - The game's list is never the Daily challenge's list on the same day.
// - A won game and a lost game: hints, the guess range, the saved result, the home card, the streak
//   and the share text (no grade in it), with no ad and no JS error.
//
//   node tests/gtg-check.mjs              every list (about 40, a few minutes)
//   node tests/gtg-check.mjs --quick      6 lists
//
// Card data comes from tests/grade-cards.json.gz (as in the grade check), the site's own files
// (matchups.json, builder.json...) from this folder, so it needs no network.
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
const { JSDOM, VirtualConsole } = require('jsdom');
const QUICK = process.argv.includes('--quick');
const FIXED_NOW = Date.parse('2026-11-21T15:00:00Z');

const stale = staleStamps();
if (stale.length) { console.error('Stale stamps (run node app-file.mjs --stamp): ' + stale.join(', ')); process.exit(1); }

const cache = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HERE, 'grade-cards.json.gz'))).toString('utf8'));
const CARD_HOSTS = /^https:\/\/(api\.pokemontcg\.io|api\.tcgdex\.net)\//;
// As in tests/extras-check.mjs: pokemontcg.io searches in other batches are answered from every saved card.
const byId = new Map(), byName = new Map();
for (const [k, v] of Object.entries(cache)) {
  if (!/pokemontcg\.io\/v2\/cards\?/.test(k) || v.s !== 200) continue;
  let j; try { j = JSON.parse(v.b); } catch (_) { continue; }
  for (const c of j.data || []) {
    if (!byId.has(c.id)) byId.set(c.id, c);
    if (/name%3A/.test(k) && c.set) { const a = byName.get(c.name) || []; if (!a.some(x => x.id === c.id)) a.push(c); byName.set(c.name, a); }
  }
}
function ptcgAnswer(url) {
  const q = new URL(url).searchParams.get('q');
  if (!q) return null;
  const out = [];
  for (const p of q.replace(/^\(|\)$/g, '').split(' OR ')) {
    const id = /^id:(\S+)$/.exec(p), nm = /^name:"(.+)"$/.exec(p);
    if (id) { if (byId.has(id[1])) out.push(byId.get(id[1])); }
    else if (nm) out.push(...(byName.get(nm[1]) || []));
    else return null;
  }
  return JSON.stringify({ data: out, page: 1, pageSize: out.length, count: out.length, totalCount: out.length });
}
async function fakeFetch(input, init) {
  const url = typeof input === 'string' ? input : (input && input.url) || String(input);
  if (CARD_HOSTS.test(url)) {
    const hit = cache[((init && init.method) || 'GET').toUpperCase() + ' ' + url];
    if (!hit && /pokemontcg\.io\/v2\/cards\?/.test(url)) { const b = ptcgAnswer(url); if (b) return new Response(b, { status: 200, headers: { 'content-type': 'application/json' } }); }
    return hit ? new Response(hit.b, { status: hit.s, headers: { 'content-type': hit.t } }) : new Response('', { status: 503 });
  }
  const u = new URL(url, 'https://rdydeck.com/');
  if (u.hostname === 'rdydeck.com') {
    const f = path.join(ROOT, u.pathname);
    if (/\.json$/.test(f) && fs.existsSync(f)) return new Response(fs.readFileSync(f), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response('', { status: 404 });
}

let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(String(e && e.message || e)));
vc.on('warn', (m, ...rest) => { if (/^\[guess the grade\]/.test(String(m))) errors.push(String(m) + ' ' + rest.map(String).join(' ')); });
let shared = null;
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
    w.scrollTo = () => {}; w.scrollBy = () => {}; w.Element.prototype.scrollBy = function () {};
    w.HTMLElement.prototype.scrollIntoView = function () {};
    w.HTMLCanvasElement.prototype.getContext = () => null;
    Object.defineProperty(w.navigator, 'onLine', { value: true, configurable: true });
    Object.defineProperty(w.navigator, 'share', { value: async d => { shared = d; }, configurable: true });
    try { delete w.indexedDB; } catch (_) {}
    w.requestIdleCallback = fn => setTimeout(fn, 0);
    w.innerWidth = 360;
  },
});
const w = dom.window, d = w.document;
await wait(3500);
ok(typeof w.openGtg === 'function' && typeof w.gtgGrade === 'function', 'js/gtg.js loaded');

// ── 1. Never the Daily challenge's list ──
const clash = JSON.parse(w.eval(`(() => { const out = []; const t0 = Date.UTC(2026, 10, 20);
  for (let i = 0; i < 200; i++) { const k = dailyKey(t0 + i * 864e5 + 12 * 36e5); if (gtgPick(k).name === dailyPick(k).name) out.push(k); }
  return JSON.stringify(out); })()`));
ok(!clash.length, 'Guess the Grade never plays the Daily challenge list on the same day (200 days)' + (clash.length ? ': ' + clash.join(', ') : ''));
const used = JSON.parse(w.eval(`(() => { const s = new Set(); const t0 = Date.UTC(2026, 10, 20);
  for (let i = 0; i < 200; i++) s.add(gtgPick(dailyKey(t0 + i * 864e5 + 12 * 36e5)).name); return JSON.stringify([s.size, DAILY_POOL.length]); })()`));
ok(used[0] === used[1], `every list in the pool comes up (${used[0]} of ${used[1]})`);

// ── 2. The answer is the Grade tab's grade for the same list ──
/** Imports a list as the player would and reads the settled number on its Grade tab. */
async function gradeTab(name, list) {
  w.openImportModal();
  d.getElementById('import-name').value = name;
  const t = d.getElementById('import-list'); t.value = list; t.dispatchEvent(new w.Event('input'));
  w.setImportFormat('standard');
  const before = w.eval('state.decks.length');
  await w.importDeck();
  if (w.eval('state.decks.length') === before) return null;
  // The clock is fixed in this check, so every import would get the same id (Date.now()).
  const id = 'gtgcheck' + before;
  w.eval(`state.decks[state.decks.length - 1].id = ${JSON.stringify(id)}`);
  w.openReview(id); w.showReviewTab('grade');
  for (let i = 0; i < 240; i++) {
    await wait(250);
    const el = d.querySelector('#grade-body .g-score');
    const txt = el ? el.textContent.trim() : '';
    if (/^\d+\.\d/.test(txt) && !d.querySelector('#grade-body .g71-wait')) {
      w.closeSheet(); w.showScreen('home');
      return { grade: parseFloat(txt), notFinal: !!d.querySelector('#grade-body .g71-partial') };
    }
  }
  return null;
}
const names = JSON.parse(w.eval('JSON.stringify(DAILY_POOL.map(p => p.name))'));
const pick = QUICK ? names.slice(0, 6) : names;
for (const nm of pick) {
  const key = w.eval(`(() => { const t0 = Date.UTC(2026, 10, 20); for (let i = 0; i < 200; i++) { const k = dailyKey(t0 + i * 864e5 + 12 * 36e5); if (gtgPick(k).name === ${JSON.stringify(nm)}) return k; } return ''; })()`);
  const game = await w.eval(`(async () => gtgGrade(await gtgDeck(${JSON.stringify(key)})))()`);
  const list = w.eval(`DAILY_POOL.find(p => p.name === ${JSON.stringify(nm)}).list`);
  const tab = await gradeTab(nm, list);
  ok(tab && !tab.notFinal && game === tab.grade && game >= 5, `${nm} (${key}): game answer ${game}, Grade tab ${tab ? tab.grade + (tab.notFinal ? ' (not final)' : '') : 'none'}`);
}

// ── 3. A won game ──
const today = w.eval('dailyKey()');
w.eval('delete state.gtg');
await w.openGtg();
await wait(300);
const ans = w.eval(`gtgStore().results[dailyKey()] && gtgStore().results[dailyKey()].ans`);
ok(typeof ans === 'number', `today's game opens with an answer (${today})`);
ok(d.querySelectorAll('#x-modal .gtg-list .review-card').length > 5, 'the list shows with card pictures');
ok(d.querySelectorAll('#gtg-play .gtg-try.empty').length === 4, 'four empty guesses');
ok(!d.querySelector('#x-modal .ad32, #x-modal ins.adsbygoogle, #x-modal [class*="ad32"]'), 'no ad in the game');
ok(!d.getElementById('x-modal-inner').textContent.includes(ans.toFixed(1)) || ans.toFixed(1) === '8.0', 'the answer is not on screen before the end');
const r1 = v => Math.round(v * 10) / 10;
const g1 = ans >= 9 ? r1(ans - 1) : r1(ans + 1);
w.gtgSet(g1); w.gtgGuess(); await wait(50);
const say1 = d.querySelector('#gtg-play .gtg-say').textContent;
ok(/^(Higher|Lower)\. Cold: more than 0\.5 off\.$/.test(say1), 'a guess 1.0 off says Cold: ' + say1);
const rng = d.getElementById('gtg-range');
ok(g1 > ans ? +rng.max === r1(g1 - 0.1) : +rng.min === r1(g1 + 0.1), `the slider leaves out what the hint ruled out (${rng.min} to ${rng.max})`);
const g2 = g1 > ans ? r1(ans + 0.3) : r1(ans - 0.3);
w.gtgSet(g2); w.gtgGuess(); await wait(50);
ok(/Warm: within 0\.5\.$/.test(d.querySelector('#gtg-play .gtg-say').textContent), 'a guess 0.3 off says Warm');
const g3 = g1 > ans ? r1(ans + 0.1) : r1(ans - 0.1);
w.gtgSet(g3); w.gtgGuess(); await wait(50);
ok(/Hot: within 0\.2\.$/.test(d.querySelector('#gtg-play .gtg-say').textContent), 'a guess 0.1 off says Hot');
w.gtgSet(ans); w.gtgGuess(); await wait(50);
const res = JSON.parse(w.eval('JSON.stringify(gtgStore().results[dailyKey()])'));
ok(res.done && res.won && res.g.length === 4, 'the fourth guess wins and is saved');
ok(/Got it in 4 of 4/.test(d.querySelector('#gtg-play .gtg-done-tx').textContent), 'the result says Got it in 4 of 4');
ok(/Today: got it in 4 of 4/.test(d.querySelector('#gtg-card .dc-s').textContent), 'the home card shows today\'s result');
await w.shareGtg(); await wait(50);
ok(shared && /^RdyDeck Guess the Grade #2: got it in 4 of 4\n(⬆️|⬇️)⚪ (⬆️|⬇️)🟠 (⬆️|⬇️)🔴 ✅$/.test(shared.text), 'share text: ' + JSON.stringify(shared && shared.text));
ok(shared && !shared.text.includes(ans.toFixed(1)), 'the share text gives no grade away');
ok(shared && /\?ref=guess#guess$/.test(shared.url), 'the share link opens the game: ' + (shared && shared.url));

// ── 4. A lost game on the next day, and the streak ──
w.eval(`(() => { const R = gtgStore().results, k = dailyKey(Date.now() - 864e5); R[k] = { ans: 8.1, g: [8.0], done: true, won: false, ts: 1 }; })()`);
w.renderHome(); await wait(50);
// 3.4.22: one streak for all four games sits in the section's heading; the row never shows the grade.
ok(/2 day streak/.test((d.getElementById('dg51-meta') || {}).textContent || ''), 'two days played in a row: 2 day streak in the Daily games heading');
ok(!/\d\.\d/.test(d.querySelector('#gtg-card .dc-s').textContent), 'the home row shows no grade: ' + d.querySelector('#gtg-card .dc-s').textContent);
const lost = JSON.parse(w.eval(`(() => { const k = dailyKey(Date.now() + 864e5); _gtgKey = k;
  gtgStore().results[k] = { ans: 7.0, g: [], ts: 1 };
  for (const v of [9.0, 8.0, 7.5, 6.8]) { _gtgV = v; gtgGuess(); }
  const r = gtgStore().results[k]; return JSON.stringify({ r, text: gtgShareText(r, k) }); })()`));
ok(lost.r.done && !lost.r.won && lost.r.g.length === 4, 'four misses end the game as not solved');
ok(/^RdyDeck Guess the Grade #3: not solved in 4\n⬇️⚪ ⬇️⚪ ⬇️🟠 ⬆️🔴$/.test(lost.text), 'lost share text: ' + JSON.stringify(lost.text));

ok(!errors.length, 'no JS errors' + (errors.length ? ':\n  ' + errors.slice(0, 5).join('\n  ') : ''));
console.log(fails ? `Guess the Grade check FAILED (${fails}).` : 'Guess the Grade check passed.');
process.exit(fails ? 1 : 0);
