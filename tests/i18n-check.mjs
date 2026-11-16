// i18n check: loads index.html in jsdom (like tests/grade-check.mjs and puzzle/test/screen.cjs),
// switches to Spanish and then Portuguese, draws the main screens and a graded starter deck, and
//   - fails when a JS error is thrown, in any language,
//   - fails when a dictionary key in js/i18n.js is a card, attack, Ability, set or deck name,
//   - fails when a text node that shows a card or deck name got changed,
//   - fails when switching back to English leaves any translated text behind,
//   - prints the English still showing on each screen (a rough report, it never fails on that).
//
//   node tests/i18n-check.mjs              the check, with a short report per screen
//   node tests/i18n-check.mjs --dump       every English string still showing, per screen
//   node tests/i18n-check.mjs --lang=es    one language only
//
// Needs jsdom: npm install --prefix tests.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { staleStamps } from '../app-file.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const require = createRequire(path.join(HERE, 'package.json'));
const { JSDOM, VirtualConsole, ResourceLoader } = require('jsdom');

const args = process.argv.slice(2);
const DUMP = args.includes('--dump');
const ONLY = (args.find(a => a.startsWith('--lang=')) || '').slice(7);
const LANGS = ONLY ? [ONLY] : ['es', 'pt'];
const SHOW = (args.find(a => a.startsWith('--show=')) || '').slice(7);   // print what a screen shows, to read it over
const FIXED_NOW = Date.parse('2026-11-12T15:00:00Z');

let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

const stale = staleStamps();
if (stale.length) { console.error('Stale stamps (run node app-file.mjs --stamp): ' + stale.join(', ')); process.exit(1); }

// ── every name that must never be translated ──
const norm = s => String(s).replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
const names = new Set();
const grab = (o, deep) => {
  if (Array.isArray(o)) {
    if (o.length >= 4 && typeof o[0] === 'string' && typeof o[1] === 'string' && /^[A-Z0-9]{2,5}$/.test(o[1]) && /^[PTE]$/.test(o[3])) names.add(norm(o[0]));   // builder rows: [name, set, number, part, ...]
    o.forEach(x => grab(x, deep));
  } else if (o && typeof o === 'object') {
    for (const k in o) {
      if ((k === 'name' || k === 'n' || k === 'opp' || k === 'archetype') && typeof o[k] === 'string') names.add(norm(o[k]));
      grab(o[k], deep);
    }
  }
};
for (const f of ['cards.json', 'builder.json', 'meta-cards.json', 'data.json', 'matchups.json', 'puzzle/daily.json', 'puzzle/test/cards.json']) {
  try { grab(JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'))); } catch (_) {}
}
try { for (const k in JSON.parse(fs.readFileSync(path.join(HERE, 'card-text.json'), 'utf8')).cards) names.add(norm(k)); } catch (_) {}
const cardCache = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HERE, 'grade-cards.json.gz'))).toString('utf8'));
for (const k in cardCache) { try { grab(JSON.parse(cardCache[k].b)); } catch (_) {} }
// matchups.json keys its decks by name too.
try { const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'matchups.json'), 'utf8')); Object.keys(m.decks || {}).forEach(k => names.add(norm(k))); } catch (_) {}
names.delete('');

// ── load the app ──
class Local extends ResourceLoader {
  fetch(url) {
    const u = new URL(url);
    if (u.hostname === 'rdydeck.com') { const f = path.join(ROOT, u.pathname); if (fs.existsSync(f)) return Promise.resolve(fs.readFileSync(f)); }
    return Promise.resolve(Buffer.from(''));
  }
}
const CARD_HOSTS = /^https:\/\/(api\.pokemontcg\.io|api\.tcgdex\.net)\//;
async function fakeFetch(input, init) {
  const url = String(input && input.url || input);
  const u = new URL(url, 'https://rdydeck.com/');
  if (u.hostname === 'rdydeck.com') {
    const f = path.join(ROOT, u.pathname);
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return new Response(fs.readFileSync(f), { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response('', { status: 404 });
  }
  if (CARD_HOSTS.test(u.href)) {
    const hit = cardCache[((init && init.method) || 'GET').toUpperCase() + ' ' + u.href];
    if (hit) return new Response(hit.b, { status: hit.s, headers: { 'content-type': hit.t } });
    return new Response('', { status: 503 });
  }
  return new Response('', { status: 404 });
}

async function load(lang) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(String(e && e.message || e)));
  const dom = new JSDOM(html, {
    url: 'https://rdydeck.com/', runScripts: 'dangerously', resources: new Local(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      const RealDate = w.Date;
      class FixedDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(FIXED_NOW); } static now() { return FIXED_NOW; } }
      w.Date = FixedDate;
      w.fetch = fakeFetch;
      w.Response = Response; w.Request = Request; w.Headers = Headers; w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
      w.AbortSignal.timeout = () => new AbortController().signal;
      w.matchMedia = () => ({ matches: false, media: '', addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.scrollTo = () => {}; w.scrollBy = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.confirm = () => true; w.alert = () => {};
      try { delete w.indexedDB; } catch (_) {}
      w.requestIdleCallback = fn => setTimeout(fn, 0);
      if (lang) w.localStorage.setItem('rd_lang', lang);
    },
  });
  await new Promise(r => setTimeout(r, 3000));
  return { dom, w: dom.window, d: dom.window.document, errors };
}
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));

// ── what is still English, and what changed that must not ──
function scan(w, roots) {
  const d = w.document, I = w.rdI18n, left = new Map(), badCards = [];
  const hidden = el => !!el.closest('[style*="display:none"], [style*="display: none"], [hidden]');
  for (const root of roots) {
    if (!root) continue;
    const tw = d.createTreeWalker(root, 4);
    while (tw.nextNode()) {
      const n = tw.currentNode, p = n.parentElement;
      if (!p) continue;
      const o = I.orig(n), now = n.nodeValue, k = norm(o);
      const sc = I.scoped[o.replace(/\s+/g, ' ').trim()];
      if (now !== o && names.has(k) && !(sc && p.matches(sc[0]))) badCards.push(o.trim());
      if (now !== o || !/[A-Za-z]{2}/.test(o) || I.lookup(o) != null) continue;
      if (p.closest(I.skip) || hidden(p)) continue;
      if (names.has(k)) continue;              // card data, left English on purpose
      if (/^(rdydeck|rdy|deck|ok|hp|ex|vstar|vmax|ace spec)$/i.test(o.trim()) || /^[A-Z0-9]{2,6} [\w-]+$/.test(o.trim())) continue;   // set code and number
      const key = o.replace(/\s+/g, ' ').trim();
      if (!left.has(key)) left.set(key, (p.className && String(p.className).split(' ')[0]) || p.tagName.toLowerCase());
    }
  }
  return { left, badCards };
}
function roots(d) {
  return [d.querySelector('.screen.active'), ...d.querySelectorAll('.modal-overlay.active'), d.getElementById('toast')];
}

// A top list the saved card data covers, so the Grade tab reads like a real one.
const LIST = JSON.parse(fs.readFileSync(path.join(HERE, 'grade-lists.json'), 'utf8'))[0];
const LIST_TEXT = ['pokemon', 'trainer', 'energy'].map(part => {
  const rows = LIST.cards.filter(c => c.part === part);
  const label = { pokemon: 'Pokémon', trainer: 'Trainer', energy: 'Energy' }[part];
  return rows.length ? label + ': ' + rows.reduce((a, c) => a + c.count, 0) + '\n' + rows.map(c => [c.count, c.name, c.set, c.number].filter(Boolean).join(' ')).join('\n') : '';
}).filter(Boolean).join('\n\n');
const shut = w => w.document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
const id0 = w => w.eval('String(state.decks[0].id)');
const SCREENS = [
  ['home (empty)', async w => { w.showScreen('home'); w.renderHome(); }],
  ['settings', async w => { w.openSettings(); }],
  ['help', async w => { shut(w); w.openHelpSheet(); }],
  ["what's new", async w => { shut(w); w.openWhatsNew(); }],
  ["what's next", async w => { shut(w); w.openWhatsNext(); }],
  ['how to play', async w => { shut(w); w.openHowToPlay(); }],
  ['shortcuts', async w => { shut(w); w.openShortcuts(); }],
  ['credits', async w => { shut(w); w.openCredits(); }],
  ['feedback', async w => { shut(w); w.openFeedback(); }],
  ['starter decks', async w => { shut(w); w.openStarterPicker(); }],
  ['daily list', async w => { shut(w); w.openDailyList(); await tick(200); }],
  ['import', async w => { shut(w); w.openImportModal(); }],
  ['save and open decks', async w => { shut(w); w.openBackupModal(); }],
  ['import a list', async w => {
    shut(w); w.openImportModal();
    w.document.getElementById('import-name').value = LIST.deckName;
    const t = w.document.getElementById('import-list'); t.value = LIST_TEXT; t.dispatchEvent(new w.Event('input'));
    w.setImportFormat('standard');
    await w.importDeck(); await tick(1500); shut(w);
    w.showScreen('home'); w.renderHome();
  }],
  ['deck menu', async w => { w.dm38Open(id0(w)); }],
  ['cards tab', async w => { shut(w); await w.openReview(id0(w)); await tick(800); w.showReviewTab('cards'); }],
  ['cards tab: mark owned', async w => { w.op30MarkMode(); await tick(100); }],
  ['grade tab', async w => { w.op30MarkMode(); w.showReviewTab('grade'); await tick(1500); }],
  ['grade looks off', async w => { w.gf80Open(); await tick(60); }],
  ['grade looks off sent', async w => { await w.gf80Send('too-high'); await tick(60); }],
  ['odds tab', async w => { w.showReviewTab('odds'); await tick(300); }],
  ['practice tab', async w => { w.showReviewTab('practice'); await tick(300); }],
  ['hand', async w => { w.showReviewTab('hand'); await tick(300); }],
  ['goldfish', async w => { w.setHandMode('gold'); await tick(300); }],
  ['drills', async w => { w.showReviewTab('drills'); await tick(300); }],
  ['resource drill', async w => { w.newResDrill(); await tick(300); }],
  ['notes', async w => { w.showReviewTab('notes'); await tick(300); }],
  ['more menu', async w => { w.dd65Menu(); }],
  ['share deck', async w => { shut(w); await w.openDeckShare(); await tick(200); }],
  ['edit list', async w => { shut(w); w.openEditModal(id0(w)); }],
  ['cover card', async w => { shut(w); w.openThumbPicker(id0(w)); }],
  ['matchup note', async w => { shut(w); w.openMatchupForm(id0(w)); }],
  ['game modes', async w => { shut(w); w.openModeModal(id0(w)); }],
  ['prize game', async w => { shut(w); w.startGameDefault(id0(w)); await tick(500); }],
  ['prize results', async w => { await w.revealPrizes(true); await tick(500); }],
  ['progress', async w => { shut(w); w.openWeakSpots(id0(w)); await tick(200); }],
  ['tournament log', async w => { shut(w); w.showScreen('home'); w.openTlog(); await tick(300); }],
  ['log a match', async w => { w.openTlogForm(); await tick(100); }],
  ['daily challenge', async w => { shut(w); w.showScreen('home'); await w.startDaily(); await tick(500); }],
  ['puzzle', async w => { shut(w); await w.openPuzzle(); await tick(300); }],
  ['deck builder', async w => { shut(w); w.showScreen('home'); await w.openBuilder(); await tick(800); }],
  ['builder: meta deck', async w => { w.bldStartMeta(); await tick(400); }],
  ['builder: a list', async w => { w.eval('bldSheetActs[0]()'); await tick(400); shut(w); await tick(600); }],
  ['prerelease', async w => { shut(w); w.showScreen('home'); try { await w.openPre47(); } catch (_) {} await tick(400); }],
  ["what's new card", async w => { shut(w); w.localStorage.setItem('rd_seen_version', 'v2.0.0'); w.showScreen('home'); w.renderHome(); await tick(100); }],
  ['tour', async w => { shut(w); w.showScreen('home'); w.startTour(true); await tick(300); }],
];

const report = {};
for (const lang of LANGS) {
  console.log(`\n== ${lang} ==`);
  const { w, d, errors } = await load(lang);
  ok(d.documentElement.lang === (lang === 'pt' ? 'pt-BR' : lang), `html lang is ${d.documentElement.lang}`);
  // Dictionary keys must not be card data.
  const dict = w.rdI18n.dict[lang];
  const coll = Object.keys(dict).filter(k => names.has(norm(k)));
  const sc = Object.keys(w.rdI18n.scoped).filter(k => names.has(norm(k)));
  console.log(`     scoped words that are also card data (translated only in their own buttons): ${sc.join(', ') || 'none'}`);
  ok(!coll.length, `${Object.keys(dict).length} strings, ${w.rdI18n.pat[lang].length} patterns, no key is a card, attack, set or deck name${coll.length ? ': ' + coll.join(', ') : ''}`);
  const bad = [];
  let totalLeft = 0;
  for (const [name, fn] of SCREENS) {
    const before = errors.length;
    try { await fn(w); } catch (e) { errors.push(name + ': ' + (e && e.stack || e)); }
    await tick(60);
    const { left, badCards } = scan(w, roots(d));
    bad.push(...badCards.map(b => name + ': ' + b));
    totalLeft += left.size;
    (report[name] = report[name] || {})[lang] = left.size;
    if (SHOW && name.startsWith(SHOW)) {
      const out = [];
      for (const r of roots(d)) { if (!r) continue; const tw = d.createTreeWalker(r, 4); while (tw.nextNode()) { const t = tw.currentNode.nodeValue.replace(/\s+/g, ' ').trim(); if (t && !tw.currentNode.parentElement.closest('style,script')) out.push(t); } }
      console.log(`-- ${name} (${lang}):\n` + out.join(' | '));
    }
    if (DUMP) {
      console.log(`-- ${name}: ${left.size} still English`);
      for (const [s, c] of left) console.log(`   [${c}] ${s}`);
    }
    if (errors.length > before) console.log('   errors on ' + name + ': ' + errors.slice(before).join(' | ').slice(0, 600));
  }
  ok(!bad.length, 'no card or deck name changed' + (bad.length ? ': ' + [...new Set(bad)].slice(0, 20).join('; ') : ''));
  // Back to English: nothing translated stays.
  w.showScreen('home'); w.renderHome(); w.openSettings();
  w.i18nPick('en');
  await tick(60);
  let stuck = 0;
  const tw = d.createTreeWalker(d.body, 4);
  while (tw.nextNode()) if (w.rdI18n.orig(tw.currentNode) !== tw.currentNode.nodeValue) stuck++;
  ok(stuck === 0 && d.documentElement.lang === 'en', `switching back to English restores every string (${stuck} left)`);
  w.i18nPick(lang); await tick(60);
  ok(w.localStorage.getItem('rd_lang') === lang && w.rdI18n.lang === lang, 'choice saved as rd_lang=' + lang);
  ok(!errors.length, 'no JS errors' + (errors.length ? ': ' + errors.slice(0, 5).join(' | ').slice(0, 1500) : ''));
  console.log(`     ${totalLeft} English strings still showing over ${SCREENS.length} screens (rough, repeats counted per screen)`);
  w.close();
}
// English still loads without errors, and the browser language picks the default.
{
  const { w, errors } = await load('');
  ok(w.rdI18n.lang === 'en' && !w.localStorage.getItem('rd_lang'), 'default is English with no choice saved');
  ok(!errors.length, 'no JS errors in English' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  w.close();
}
if (!DUMP) {
  console.log('\nEnglish left per screen (' + LANGS.join(' / ') + '):');
  for (const k in report) console.log('  ' + k.padEnd(22) + LANGS.map(l => String(report[k][l] ?? '-')).join(' / '));
}
console.log(fails ? `\ni18n check failed: ${fails} problem(s).` : '\ni18n check passed.');
process.exit(fails ? 1 : 0);
