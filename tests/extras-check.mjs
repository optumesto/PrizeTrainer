// 3.0 extras check: opens the app in jsdom (no browser) and walks the 3.0 extras in js/v80-extras.js:
// a starter deck's Grade tab (accuracy line, the field line under Against the meta, both win rates
// labeled), the What's next sheet from Settings and Help, the share sheet, and grade history with
// a saved event record. It fails on any JS error, and when the grade shown differs from the grade
// the build before the extras shows for the same deck with the same data.
//
//   node tests/extras-check.mjs                 compare with the commit before js/v80-extras.js came in
//   node tests/extras-check.mjs --base=<ref>    compare with another commit
//
// Card data comes from tests/grade-cards.json.gz (as in the grade check), the site's own files
// (matchups.json, data.json, accuracy.json...) from this folder, so it needs no network.
// Needs jsdom: npm install --prefix tests.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { readAppHtml, inlineApp, staleStamps } from '../app-file.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const require = createRequire(path.join(HERE, 'package.json'));
const { JSDOM, VirtualConsole } = require('jsdom');
const args = process.argv.slice(2);
// A day in Delta Reign's first week, so the new set line shows.
const FIXED_NOW = Date.parse('2026-11-11T12:00:00Z');
let STARTER = '';   // the first starter deck in data.json

const cache = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HERE, 'grade-cards.json.gz'))).toString('utf8'));
const CARD_HOSTS = /^https:\/\/(api\.pokemontcg\.io|api\.tcgdex\.net)\//;
// The saved responses are for the grade check's lists. A starter deck asks for its cards in other
// batches, so pokemontcg.io card searches are answered from every card in the saved responses.
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
    if (!hit && process.env.EXTRAS_DEBUG) console.log('miss ' + url);
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

async function open(html) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(String(e && e.message || e)));
  vc.on('error', e => errors.push('console.error ' + String(e && e.message || e)));
  // The extras log their own failures with these tags.
  vc.on('warn', (m, ...rest) => { if (/^\[(field|event record|matchups|grade vs win rate)\]/.test(String(m))) errors.push(String(m) + ' ' + rest.map(String).join(' ')); });
  const dom = new JSDOM(html, {
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
      try { delete w.indexedDB; } catch (_) {}
      w.requestIdleCallback = fn => setTimeout(fn, 0);
      w.innerWidth = 360;
    },
  });
  await wait(3500);
  return { dom, w: dom.window, d: dom.window.document, errors };
}

/** Loads the starter deck, opens its Grade tab and waits for the settled grade. */
async function gradeOf(app) {
  const { w, d } = app;
  STARTER = w.eval('STARTER_DECKS[0].id');
  await w.loadStarterDeck(STARTER);
  const deck = w.eval('state.decks').find(x => x.starter === STARTER);
  if (!deck) return { deck: null, score: null };
  w.openReview(deck.id);
  w.showReviewTab('grade');
  for (let i = 0; i < 40; i++) {
    await wait(250);
    const el = d.querySelector('#grade-body .g-score');
    if (el && !d.querySelector('#grade-body .g71-wait')) break;
  }
  w.renderGrade();
  await wait(300);
  const el = d.querySelector('#grade-body .g-score');
  return { deck, score: el ? el.textContent.replace(/\/10.*/, '').trim() : null };
}

// ── the build before the extras ──
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
let base = (args.find(a => a.startsWith('--base=')) || '').slice(7);
if (!base) {
  let added = '';
  try { added = git('log', '--diff-filter=A', '--format=%H', '--', 'js/v80-extras.js').split('\n').pop(); } catch (_) {}
  base = added ? added + '~1' : 'HEAD';
}
const baseHtml = inlineApp(git('show', `${base}:index.html`), f => {
  try { return execFileSync('git', ['show', `${base}:${f}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }); } catch (_) { return ''; }
});
const before = await open(baseHtml);
const b = await gradeOf(before);
before.dom.window.close();
console.log(`     the build at ${base} shows ${b.score} for the ${STARTER} starter deck`);

// ── this build ──
const stale = staleStamps();
ok(!stale.length, 'file stamps are current' + (stale.length ? ': ' + stale.join(', ') : ''));
const app = await open(readAppHtml());
const { w, d } = app;
const a = await gradeOf(app);
ok(a.score && a.score === b.score, `grade shown ${a.score}, the same as before the extras (${b.score})`);

// Grade tab
const gb = d.getElementById('grade-body');
// 3.3.6: How the grade works is a link on the Grade tab that opens the Questions answer in a sheet,
// with the accuracy line under it.
ok(!d.getElementById('g29-about') && gb.querySelector('.gw336-a'), 'the Grade tab has the How the grade works link, not the old fold');
w.gw336Open();
const acc = d.getElementById('acc80');
ok(acc && /How accurate the grades are/.test(acc.textContent) && acc.querySelector('a[href="how-grading-works.html#accuracy"]'), 'accuracy line under How the grade works: ' + (acc && acc.textContent.replace(/\s+/g, ' ').trim()));
ok(acc && acc.closest('#x-modal-inner .gw336-body') && d.querySelector('#x-modal-inner .g29-scale'), 'the accuracy line and grade scale sit in the How the grade works sheet');
w.closeSheet();
const mx = d.getElementById('mx80');
ok(mx && /Against the field now: about \d+\.\d% expected/.test(mx.textContent), 'field line under Against the meta: ' + (mx && mx.textContent.replace(/\s+/g, ' ').trim()));
const how = (gb.querySelector('.g29-how') || {}).textContent || '';
const g79 = (d.getElementById('g79-sec') || {}).textContent || '';
ok(!/counted three times/.test(how) || /\(\d+\.\d% over all [\d,]+ games\)/.test(how), 'the sentence under the grade names both win rates: ' + (how.match(/:[^:]*games[^.]*\./) || [''])[0].trim());
ok(/Win rate: \d+\.\d% over all [\d,]+ games/.test(g79), 'Grade vs win rate says its win rate is over all games');
ok(/won \d+\.\d% of all [\d,]+ matches/.test((d.getElementById('mu60-sec') || {}).textContent || ''), 'Against the meta says its win rate is over all matches');

// Grade history with a saved record
const hist = d.getElementById('gh72-sec');
ok(!!hist, 'grade history shows');
const add = hist && [...hist.querySelectorAll('.ev80-btn')].find(x => /How did it do\?/.test(x.textContent));
ok(!!add, 'grade history has How did it do?');
if (add) {
  add.click();
  ok(/How did it do\?/.test((d.querySelector('.modal-overlay.active') || d.body).textContent) && d.getElementById('ev80-w'), 'the event record sheet opens');
  w.ev80Step('w', 1); w.ev80Step('w', 1); w.ev80Step('w', 1); w.ev80Step('w', 1); w.ev80Step('w', 1);
  w.ev80Step('l', 1); w.ev80Step('l', 1); w.ev80Step('t', 1); w.ev80Step('t', -1); w.ev80Step('t', -1); w.ev80Step('t', 1);
  d.getElementById('ev80-p').value = '12';
  d.getElementById('ev80-n').value = '  Toronto <b>Regional</b>  ';
  d.getElementById('ev80-save').click();
  await wait(200);
  const rec = d.querySelector('#gh72-sec .ev80-rec');
  ok(rec && /Your record there: 5-2-1, 12th place/.test(rec.textContent), 'the record shows next to its grade: ' + (rec && rec.textContent.trim()));
  const deck = w.eval('state.decks').find(x => x.starter === STARTER);
  const saved = deck.gradeLog.e.find(x => x.ev);
  ok(saved && saved.ev.w === 5 && saved.ev.l === 2 && saved.ev.t === 1 && saved.ev.p === 12, 'the record is kept on its grade history entry');
  const row = rec && rec.closest('.gh72-row, #gh72-sec');
  ok(row && row.textContent.includes(saved.g.toFixed(1)), 'the record sits beside the grade it had then (' + saved.g.toFixed(1) + ')');
  // 3.0.1: event name, shown as plain text and never translated.
  const nm = d.querySelector('#gh72-sec .ev80-nm');
  ok(saved && typeof saved.ev.n === 'string' && !/[<>]/.test(saved.ev.n) && saved.ev.n === 'Toronto b Regional /b' && saved.ev.n === saved.ev.n.trim(), 'the event name is kept, trimmed and without markup: ' + (saved && saved.ev.n));
  ok(nm && nm.hasAttribute('data-no-tr') && !nm.querySelector('b') && /Toronto/.test(nm.textContent), 'the event name shows on the row as plain text');
  // 3.0.1: Delete from the row asks once, Cancel keeps it.
  const del = [...d.querySelectorAll('#gh72-sec .ev80-btn')].find(x => x.textContent === 'Delete');
  ok(!!del, 'the record row has a Delete button');
  del.click();
  const sheet = (d.querySelector('.modal-overlay.active') || d.body).textContent;
  ok(/Delete this event record\?/.test(sheet) && /The grade history stays/.test(sheet), 'Delete asks first');
  w.closeSheet();
  ok(deck.gradeLog.e.some(x => x.ev), 'Cancel keeps the record');
  [...d.querySelectorAll('#gh72-sec .ev80-btn')].find(x => x.textContent === 'Delete').click();
  [...d.querySelectorAll('.modal-overlay.active .btn-danger, #x-modal-inner .btn-danger')].find(x => x.textContent === 'Delete').click();
  await wait(100);
  ok(!deck.gradeLog.e.some(x => x.ev) && !d.querySelector('#gh72-sec .ev80-rec'), 'Delete clears the record and keeps the grade history');
  ok(deck.gradeLog.e.length >= 1, 'grade history entries stay after a delete');
  // Remove it again from the edit sheet.
  w.ev80Open(saved.t); w.ev80Step('w', 1); d.getElementById('ev80-save').click(); await wait(100);
  [...d.querySelectorAll('#gh72-sec .ev80-btn')].find(x => x.textContent === 'Edit').click();
  ok(!d.getElementById('ev80-n').value, 'a record without a name has an empty name box');
  w.ev80Save(true);
  ok(!deck.gradeLog.e.some(x => x.ev) && !d.querySelector('#gh72-sec .ev80-rec'), 'Remove clears the record');
  // 3.0.1: the history count matches its rows on a deck with several entries.
  const e0 = deck.gradeLog.e[deck.gradeLog.e.length - 1];
  const keep = deck.gradeLog.e.slice();
  deck.gradeLog.e = [0, 1, 2, 3].map(i => Object.assign({}, e0, { t: e0.t - (4 - i) * 86400000, g: Math.round((e0.g - 0.3 * (3 - i)) * 10) / 10, ev: undefined })).concat([e0]);
  deck.gradeLog.e.forEach(x => { if (!x.ev) delete x.ev; });
  w.eval(`state.activeDeckId = 'none'`); w.renderGrade(); w.eval(`state.activeDeckId = ${JSON.stringify(deck.id)}`); w.renderGrade(); await wait(200);
  const hs = d.getElementById('gh72-sec');
  const nBadge = parseInt(((hs && hs.querySelector('.g29-n')) || {}).textContent, 10);
  const nRows = hs ? hs.querySelectorAll('.gh72-row').length : 0;
  const nOver = parseInt(((/over (\d+) versions/.exec(hs ? hs.textContent : '')) || [])[1], 10);
  ok(deck.gradeLog.e.length === 5 && nBadge === 5 && nRows === 5 && nOver === 5, `grade history count matches its rows (log ${deck.gradeLog.e.length}, badge ${nBadge}, rows ${nRows}, "over ${nOver} versions")`);
  deck.gradeLog.e = keep; w.renderGrade(); await wait(100);
  const a2 = (d.querySelector('#grade-body .g-score') || {}).textContent || '';
  ok(a2.replace(/\/10.*/, '').trim() === b.score, 'the grade is the same after saving a record');
}

// Share
await w.v45ShareGrade();
await wait(600);
const go = d.getElementById('sh80-go');
ok(go && !go.disabled && /Save and copy link|Copy link|Share/.test(go.textContent), 'share sheet has one ready button: ' + (go && go.textContent.trim()));
ok(/could not be made|gs45-img/.test((d.getElementById('gs261-pic') || {}).innerHTML || ''), 'a picture that cannot be drawn (no canvas here) says so instead of waiting');
w.closeSheet();

// What's next from Settings and from Help
w.openSettings();
const set = d.getElementById('wx80-set');
ok(!!set && /What's Next/.test(set.textContent), "Settings has What's next");
set.click();
const list = d.getElementById('wx80-list');
const items = list ? [...list.querySelectorAll('li b')].map(x => x.textContent) : [];
ok(items.length === w.eval('WHATS_NEXT.length') && items.includes('Google Play app') && items.includes('Puzzle mode'), "What's next lists: " + items.join(', '));
ok(!/discord/i.test(d.querySelector('.modal-overlay.active') ? d.querySelector('.modal-overlay.active').innerHTML : d.body.innerHTML), 'no Discord link shows');
const fb = d.getElementById('wx80-fb');
ok(!!fb, "What's next has Send feedback");
fb.click();
const idea = d.querySelector('.fb-seg .mode-opt.active');
ok(d.getElementById('fb-text') && idea && idea.dataset.k === 'Idea', 'Send feedback opens the feedback sheet set to Idea');
w.closeSheet();
w.openHelpSheet();
ok(!!d.getElementById('wx80-help'), "Help has What's next");
w.closeSheet();

// New set week on home
w.showScreen ? w.showScreen('home') : null;
w.renderHome();
const ns = d.getElementById('ns80-card');
ok(ns && /Delta Reign is out/.test(ns.textContent), 'home says the new set is out in its first week: ' + (ns && ns.textContent.replace(/\s+/g, ' ').trim()));
w.ns80Close();
ok(ns && ns.innerHTML === '', 'Close hides the new set line');

// 3.3.3 (Muse 3.3.2 retest): a saved deck someone has practiced with keeps its per-day practice
// rollup in deck.daily (an object). That is not the Daily challenge, so the deck keeps its Upgrades,
// its grade history, its results blend and its grade, the same as before it was practiced.
{
  const deck = a.deck;
  const howBefore = ((d.querySelector('#grade-body .g29-how') || {}).textContent || '').replace(/\s+/g, ' ').trim();
  deck.daily = { '2026-11-10': { g: 2, s: 9, p: 12, t: 240 } }; deck.dailyVer = 1;
  // As after a reload: nothing graded yet this visit, and a log whose only entry is an older grade (Toxtricity's 8.4).
  const e0 = deck.gradeLog.e[0];
  deck.gradeLog = { v: 1, l: deck.gradeLog.l, x: {}, e: [Object.assign({}, e0, { g: Math.round((parseFloat(a.score) - 0.6) * 10) / 10, w: 's', t: e0.t - 86400000 })] };
  w.eval('_g29Cache.clear(); _up75Cache.clear()');
  w.openReview(deck.id); w.showReviewTab('grade');
  for (let i = 0; i < 40; i++) { await wait(250); if (d.querySelector('#grade-body .g-score') && !d.querySelector('#grade-body .g71-wait') && d.getElementById('up75-sec') && !/Checking which card swaps/.test(d.getElementById('up75-sec').textContent)) break; }
  const sc = ((d.querySelector('#grade-body .g-score') || {}).textContent || '').replace(/\/10.*/, '').trim();
  const howNow = ((d.querySelector('#grade-body .g29-how') || {}).textContent || '').replace(/\s+/g, ' ').trim();
  ok(sc === a.score, `a practiced deck grades the same: ${sc}, was ${a.score}`);
  ok(howNow === howBefore, 'a practiced deck keeps its results blend in the sentence under the grade');
  const upRes = await w.up75Find(deck);
  ok(upRes && upRes.why !== 'format', 'Upgrades looks for swaps on a practiced deck (' + (upRes && (upRes.why || upRes.swaps.length + ' swaps')) + ')');
  const up = d.getElementById('up75-sec');
  ok(up && !/Checking which card swaps/.test(up.textContent), 'a practiced deck shows Upgrades: ' + (up ? up.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : 'missing'));
  ok(!!d.getElementById('gh72-sec'), 'a practiced deck shows its grade history');
  const last = deck.gradeLog && deck.gradeLog.e[deck.gradeLog.e.length - 1];
  ok(last && last.g.toFixed(1) === sc, `its grade history ends on the grade on screen (${last && last.g.toFixed(1)})`);
  ok(w.eval('isDailyChallenge')(w.eval('dailyDeck()')) && !w.eval('isDailyChallenge')(deck), 'only the Daily challenge deck counts as the Daily challenge');
}

// 3.3.3 (Muse 3.3.2 retest): Kingdra ex. Played thin to set up with King's Order beside another main attacker,
// its Hydro Pump is left out of the damage the grade counts (3.3.2). As the deck's own main attacker, Hydro
// Pump still counts. And a single main attacker an Ability brings back (Gengar's Netherworld Gate) earns
// Power by the odds its second life comes together, with a line in Why Power is.
{
  const res = JSON.parse(w.eval(`(() => {
    const src = state.decks.find(x => x.starter === STARTER_DECKS[0].id);
    const base = () => toGradeDeck(src).map(e => Object.assign({}, e, { card: e.card && Object.assign({}, e.card) }))
      .filter(e => !/Munkidori|Blaziken|Torchic|Chi-Yu|Meowth|Fezandipiti/.test(e.name));
    const flat = en => en.forEach(e => { if (e.card && e.card.attacks) e.card.attacks = e.card.attacks.map(a => Object.assign({}, a, { fx: null })); });
    const kingdra = q => ({ name: 'Kingdra ex', qty: q, card: { t: 'pkmn', key: 'kingdra ex', stage: 'basic', from: null, hp: 320, isEx: true, p: 2, types: ['water'], provides: [], requires: [],
      attacks: [{ name: "King's Order", cost: ['water'], dmg: 0, max: 0, rev: { self: false }, fx: null, copy: null },
                { name: 'Hydro Pump', cost: ['water', 'water', 'water'], dmg: 250, early: 250, max: 250, conf: 'high', fx: null, copy: null }] } });
    const water = { name: 'Basic Water Energy', qty: 14, card: { t: 'energy', key: 'basic water energy', etype: 'water', etypes: ['water'], basic: true, provides: [] } };
    const grade = en => { const coh = gCoherence(en), main = gMainAttacker(en, coh, null), v = gViability(en, coh, main);
      return { main: main && main.name, best: v.bestName, out: (v.setupOut || []).map(x => x.name), power: v.score, back: v.parts.back, f: v.findings.map(x => x.t + ' :: ' + x.d), why: g67PowWhy({ via: v })[0].t }; };
    const side = base(); flat(side); side.push(kingdra(1), water);
    const own = base().filter(e => !/Dragapult|Dreepy|Drakloak/.test(e.name)); flat(own); own.push(kingdra(3), water);
    const solo = (rev) => { const en = base(); flat(en); const m = en.find(e => e.card && e.card.key === 'dragapult ex'); m.qty = 1;
      if (rev) m.card.rev = [{ self: true, src: 'ability', via: 'Netherworld Gate' }]; return grade(en); };
    return JSON.stringify({ side: grade(side), own: grade(own), plain: solo(false), back: solo(true) });
  })()`));
  ok(res.side.best !== 'Kingdra ex' && res.side.out.includes('Kingdra ex'), `a thin Kingdra ex beside ${res.side.main} is a setup piece, left out of the damage counted (counts ${res.side.best})`);
  ok(res.own.main === 'Kingdra ex' && res.own.best === 'Kingdra ex' && !res.own.out.includes('Kingdra ex'), `Kingdra ex as the main attacker still counts Hydro Pump (main ${res.own.main}, counts ${res.own.best})`);
  const fb = res.back.f.find(x => /comes back ::/.test(x)) || '';
  ok(res.back.back && res.back.back.p > 0.5 && res.back.back.p < 1 && res.back.power > res.plain.power, `Netherworld Gate adds Power by the odds its second life comes together (${(10 * res.plain.power).toFixed(2)} to ${(10 * res.back.power).toFixed(2)}, ${Math.round(100 * (res.back.back || {}).p)}% of games)`);
  ok(/comes together in about \d+% of games/.test(fb) && /Power counts it as \d+% of a second copy\./.test(fb), 'the finding says how often the line comes together and what Power counts');
  ok(/coming back with Netherworld Gate, in about \d+% of games, adds [\d.]+ to Damage\./.test(res.back.why), 'Why Power is has a line for the revival credit: ' + res.back.why);
}

// No em or en dashes in the new file
const src = fs.readFileSync(path.join(ROOT, 'js/v80-extras.js'), 'utf8');
ok(!/[\u2013\u2014]/.test(src), 'no em or en dashes in js/v80-extras.js');

ok(!app.errors.length, 'no JS errors' + (app.errors.length ? ':\n  ' + app.errors.slice(0, 8).join('\n  ') : ''));
console.log(fails ? `Extras check FAILED: ${fails} problem${fails > 1 ? 's' : ''}.` : 'Extras check passed.');
process.exit(fails ? 1 : 0);
