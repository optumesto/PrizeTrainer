// 3.4.27 Rare Pull art check: opens the app in jsdom (no browser) and plays js/rare-pull.js.
// Every answer shows the printing the top lists run (set and number from meta-cards.json), not the
// first card of that name: each fit of every prompt, a pick that does not fit, the end row, the best
// pull and the home art. Needs jsdom: npm install --prefix tests.
//
//   node tests/rare-pull-art-check.mjs

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
vc.on('warn', (m, ...rest) => { if (/^\[daily look\]/.test(String(m))) errors.push(String(m) + ' ' + rest.map(String).join(' ')); });
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
ok(typeof w.rpLoadData === 'function' && typeof w.dgRpCard === 'function', 'Rare Pull and the daily look loaded');
await w.rpLoadData();
const rpKey = w.eval('rpKey');
const mc = JSON.parse(fs.readFileSync(path.join(ROOT, 'meta-cards.json'), 'utf8'));
// the printing each deck's top lists run, by card name
const rows = new Map();
mc.decks.forEach(dk => dk.cards.forEach(r => rows.set(dk.id + '|' + rpKey(r[0]), r[1] + ' ' + r[2])));
const printOf = src => { const m = /tpci\/([A-Z0-9]+)\/\1_0*(\d+[a-z]?)_R_EN/.exec(src || ''); return m ? m[1] + ' ' + m[2] : ''; };
const shown = () => { const im = d.querySelector('#rp-body .dgf-stage img'); return im ? printOf(im.getAttribute('src')) : ''; };

// ── 1. Every fit of every prompt in the pool: the art is the printing its top lists run ──
const pool = JSON.parse(w.eval('JSON.stringify(rpData.pool.map(q => ({ scope: q.scope, deck: q.deck, cat: q.cat, fits: q.fits.map(f => ({ k: f.k, n: f.n, s: f.s })) })))'));
let checked = 0, wrong = [];
w.eval(`rpG = { key: dailyKey(), n: 1, prompts: [], i: 0, picks: [], over: false, first: false }; rpScreenOn(true);`);
for (let qi = 0; qi < pool.length; qi++) {
  const q = pool[qi];
  for (const f of q.fits) {
    w.eval(`rpG.prompts = [rpData.pool[${qi}]]; rpG.i = 0; rpG.picks = []; rpG.over = false; rpG.hits = [${JSON.stringify({ k: f.k, n: f.n })}]; rpPick(0);`);
    const got = shown();
    const want = q.scope === '*' ? JSON.parse(w.eval(`JSON.stringify(rpData.art ? rpData.art.get(${JSON.stringify(f.k)}) : { s: "?", no: "?" })`)) : null;
    const exp = q.scope === '*' ? want.s + ' ' + want.no : rows.get(q.scope + '|' + f.k);
    checked++;
    if (got !== exp.replace(/ 0+(\d)/, ' $1')) wrong.push(`${q.deck || 'every deck'} / ${q.cat}: ${f.n} shows ${got || 'nothing'}, lists run ${exp}`);
  }
}
ok(!wrong.length, `every fit in all ${pool.length} prompts shows the printing its top lists run (${checked} picks)` + (wrong.length ? '\n  ' + wrong.slice(0, 10).join('\n  ') : ''));

// ── 2. The reported case: Shaymin for Dhelmise is Shaymin DRI 10, not DLR 8 ──
const dq = pool.findIndex(q => q.deck === 'Dhelmise' && q.fits.some(f => f.k === 'shaymin'));
ok(dq >= 0, 'a Dhelmise prompt has Shaymin as a fit');
if (dq >= 0) {
  w.eval(`rpG.prompts = [rpData.pool[${dq}]]; rpG.i = 0; rpG.picks = []; rpG.hits = [{ k: 'shaymin', n: 'Shaymin' }]; rpPick(0);`);
  ok(shown() === 'DRI 10', 'Dhelmise, Shaymin shows Shaymin DRI 10 (was DLR 8): ' + shown());
}

// ── 3. A pick that does not fit shows the printing most top lists run ──
const nq = pool.findIndex(q => q.cat === 'supporter' && !q.fits.some(f => f.k === 'shaymin'));
w.eval(`rpG.prompts = [rpData.pool[${nq}]]; rpG.i = 0; rpG.picks = []; rpG.hits = [{ k: 'shaymin', n: 'Shaymin' }]; rpPick(0);`);
ok(shown() === 'DRI 10', 'Shaymin named where it does not fit still shows DRI 10: ' + shown());

// ── 4. A full day: the end row, the best pull and the home art use the same printings ──
w.eval(`state.rarePull = { results: {} }; rpStart();`);
const day = JSON.parse(w.eval('JSON.stringify(rpG.prompts.map(q => ({ scope: q.scope, f: q.fits[q.fits.length - 1] })))'));
for (let i = 0; i < day.length; i++) {
  w.eval(`rpG.hits = [${JSON.stringify({ k: day[i].f.k, n: day[i].f.n })}]; rpPick(0); ${i < day.length - 1 ? 'rpNext()' : 'rpEnd()'};`);
}
const minis = [...d.querySelectorAll('#rp-body .dgf-mini img')].map(im => printOf(im.getAttribute('src')));
const exp4 = JSON.parse(w.eval('JSON.stringify(rpG.picks.map(p => p.p ? p.p.s + " " + p.p.no.replace(/^0+(\\d)/, "$1") : ""))'));
ok(minis.length === 7 && minis.every((m, i) => m === exp4[i]), 'end row shows each pick\'s printing: ' + minis.join(', '));
const best = d.querySelector('#rp-body .dgf-best img');
const r = JSON.parse(w.eval('JSON.stringify(rpStore().results[dailyKey()])'));
ok(best && r.bp && printOf(best.getAttribute('src')) === r.bp.replace(/ 0+(\d)/, ' $1'), 'best pull tile and saved best pull match: ' + (r && r.bp));
w.eval('rpQuit()'); await wait(200);
const home = d.querySelector('#rp-card .dgh-art img');
ok(home && printOf(home.getAttribute('src')) === r.bp.replace(/ 0+(\d)/, ' $1'), 'home art shows the best pull\'s printing');
ok(!errors.length, 'no JS errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
console.log(fails ? `${fails} failed` : 'Rare Pull art check passed.');
process.exit(fails ? 1 : 0);
