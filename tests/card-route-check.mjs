// 3.5.7 card route check: a network that blocks the card databases (a school filter), in jsdom.
// - Both card databases blocked, rdydeck.com's /api/cards/ relay answering: Guess the Grade opens with the same
//   answer as on an open network, and the rest of the visit goes through rdydeck.com.
// - Relay not there yet (404) and the databases blocked: the toast says the game could not read every card
//   (not "needs a connection"), and once the network is open again, Try again opens the game in the same visit.
// - Offline: the toast says it needs a connection.
//
//   node tests/card-route-check.mjs
//
// (Header of tests/gtg-check.mjs follows: same card data cache and fake fetch.)
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
const FIXED_NOW = Date.parse('2026-11-24T15:00:00Z');

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
// NET: 'open' (everything answers), 'blocked' (the card databases fail as a network error; the relay answers),
// 'blocked-norelay' (the databases fail and rdydeck.com has no relay yet: 404).
let NET = 'open';
let REAL_TIMEOUTS = false;
const log = [];
const RELAY = [['/api/cards/tcgdex/', 'https://api.tcgdex.net/v2/'], ['/api/cards/ptcg/', 'https://api.pokemontcg.io/v2/']];
async function fakeFetch(input, init) {
  let url = typeof input === 'string' ? input : (input && input.url) || String(input);
  const rel = RELAY.find(([a]) => url.startsWith(a) || url.startsWith('https://rdydeck.com' + a));
  if (rel) {
    log.push('relay');
    if (NET === 'blocked-norelay') return new Response('<!doctype html><title>404</title>', { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
    url = rel[1] + url.slice(url.indexOf(rel[0]) + rel[0].length);
  } else if (CARD_HOSTS.test(url)) {
    log.push('direct');
    if (NET === 'blockpage') return new Response('<html><body>Blocked by your school</body></html>', { status: 200, headers: { 'content-type': 'text/html' } });
    // A school network that lets the request hang: no answer until the request's own timeout ends it.
    if (NET === 'hang') return new Promise((_, rej) => { const sg = init && init.signal; if (sg) sg.addEventListener('abort', () => rej(new DOMException('The operation timed out.', 'TimeoutError'))); });
    if (NET !== 'open') throw new TypeError('Failed to fetch');
  }
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
    // Request timeouts never end, except in the hang check, where they run in real time.
    w.AbortSignal.timeout = ms => REAL_TIMEOUTS ? AbortSignal.timeout(ms) : new AbortController().signal;
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
w.__fakeFetch = fakeFetch;
const ROUTE_SRC = fs.readFileSync(path.join(ROOT, 'js/card-route.js'), 'utf8');
await wait(3500);
ok(typeof w.openGtg === 'function' && typeof w.gtgGrade === 'function', 'js/gtg.js loaded');


const toast = () => d.getElementById('toast').textContent;
const fresh = () => w.eval(`cardRoute._forget && cardRoute._forget(); delete state.gtg; for (const k in _gtgDecks) delete _gtgDecks[k]; _dataTried.clear(); _td31DownUntil = 0; try { sessionStorage.removeItem('cardRoute'); localStorage.removeItem('ptcgDownUntil'); } catch (_) {} 0`);
const open = async () => { d.getElementById('toast').textContent = ''; w.closeSheet(); d.getElementById('x-modal-inner').innerHTML = ''; await w.openGtg(); await wait(300); return { toast: toast(), sheet: d.getElementById('x-modal').classList.contains('active') && !!d.querySelector('#x-modal .gtg-list'), ans: w.eval('(gtgStore().results[dailyKey()] || {}).ans') }; };
ok(typeof w.cardRoute === 'object', 'js/card-route.js loaded');
console.log('today: Guess the Grade #' + w.eval('gtgNumber()') + ', ' + w.eval('gtgPick(dailyKey()).name'));

// Open network: the answer to compare with.
fresh(); NET = 'open'; log.length = 0;
const base = await open();
ok(base.sheet && typeof base.ans === 'number', `open network: the game opens (answer ${base.ans})`);
ok(!log.includes('relay'), 'open network: nothing goes through rdydeck.com');
w.closeSheet();

// Blocked, relay up.
fresh(); NET = 'blocked'; log.length = 0;
const viaRelay = await open();
ok(viaRelay.sheet && viaRelay.ans === base.ans, `card databases blocked, relay up: the game opens with the same answer (${viaRelay.ans})`);
ok(log.includes('relay') && w.eval('cardRoute.viaHome()'), 'the reads went through rdydeck.com and the rest of the visit goes there');
log.length = 0; await w.fetch('https://api.tcgdex.net/v2/en/cards/sv06-130');
ok(log.join() === 'relay', 'after the relay worked, the next read goes straight to rdydeck.com: ' + log.join());
w.closeSheet();

// A filter that answers with its own block page in place of the card database.
fresh(); NET = 'blockpage'; log.length = 0;
const viaPage = await open();
ok(viaPage.sheet && viaPage.ans === base.ans, `a filter block page in place of the card data: the game opens through rdydeck.com (${viaPage.ans})`);
w.closeSheet();

// Blocked, no relay yet (the Worker not deployed).
fresh(); NET = 'blocked-norelay'; log.length = 0;
const norelay = await open();
ok(!norelay.sheet, 'blocked with no relay: the game does not open');
ok(/could not read every card in today's list/.test(norelay.toast), 'the toast says it could not read every card: ' + norelay.toast);
ok(/School or work wifi can block card data/.test(norelay.toast), 'the toast says school or work wifi can block card data');
ok(!/needs a connection/.test(norelay.toast), 'the toast does not say it needs a connection while online');
ok(!w.eval('cardRoute.viaHome()'), 'a 404 from rdydeck.com keeps reading direct');
NET = 'open'; await wait(3100);
const retry = await open();
ok(retry.sheet && retry.ans === base.ans, `network open again: Try again opens the game in the same visit (${retry.ans})`);
w.closeSheet();

// 3.5.11: a network that lets card database requests hang (school wifi), with real 10 second request timeouts.
fresh(); NET = 'hang'; REAL_TIMEOUTS = true; log.length = 0;
let t0 = Date.now();
const viaHang = await open();
const hangMs = Date.now() - t0 - 300;
ok(viaHang.sheet && viaHang.ans === base.ans, `card databases hang, relay up: the game opens with the same answer (${viaHang.ans})`);
ok(hangMs < 6000, `and opens in ${(hangMs / 1000).toFixed(1)} s, not after the 10 second timeouts`);
ok(w.eval('cardRoute.viaHome()'), 'the rest of the visit goes through rdydeck.com');
await wait(10500);   // the hung requests time out in the background
ok(w.eval('cardRoute.onDevice()'), 'once the hung requests time out, this device remembers to go through rdydeck.com');
w.closeSheet();

// A later visit on the same device: straight to rdydeck.com, no wait.
const reload = () => w.eval(`window.fetch = window.__fakeFetch; try { sessionStorage.removeItem('cardRoute'); } catch (_) {} delete state.gtg; for (const k in _gtgDecks) delete _gtgDecks[k]; _dataTried.clear(); 0`) || w.eval(ROUTE_SRC);
reload(); log.length = 0; t0 = Date.now();
const later = await open();
ok(later.sheet && later.ans === base.ans && !log.includes('direct'), `a later visit on this device: straight through rdydeck.com, no card database request (${log.length} reads, ${((Date.now() - t0 - 300) / 1000).toFixed(1)} s)`);
w.closeSheet();
// A card database that is down answers through rdydeck.com with its own error: that is the answer, no second wait.
log.length = 0;
const down = await w.fetch('https://api.pokemontcg.io/v2/cards/zzz-999');
ok(down.status >= 500 && log.join() === 'relay', `the card database's own error through rdydeck.com is not asked again straight (${down.status}, ${log.join()})`);
REAL_TIMEOUTS = false;

// An open network for a slow answer only: the visit is sped up, the device is not marked.
fresh(); NET = 'open'; log.length = 0;
ok(!w.eval('cardRoute.onDevice()') && !w.eval('cardRoute.viaHome()'), 'forgetting clears the device memory');

// Offline.
fresh(); NET = 'open';
Object.defineProperty(w.navigator, 'onLine', { value: false, configurable: true });
await wait(3100);
const off = await open();
ok(!off.sheet && /needs a connection/.test(off.toast), 'offline: the toast says it needs a connection: ' + off.toast);
Object.defineProperty(w.navigator, 'onLine', { value: true, configurable: true });


ok(!errors.length, 'no JS errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
if (fails) { console.log(fails + ' failed'); process.exit(1); }
console.log('Card route check passed.');
process.exit(0);
