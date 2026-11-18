// i18n check: loads index.html in jsdom (like tests/grade-check.mjs and puzzle/test/screen.cjs),
// switches to Spanish and then Portuguese, draws the main screens and a graded starter deck, and
//   - fails when a JS error is thrown, in any language,
//   - fails when a dictionary key in js/i18n.js is a card, attack, Ability, set or deck name,
//   - fails when a text node that shows a card or deck name got changed,
//   - fails when switching back to English leaves any translated text behind,
//   - fails when a screen still shows English app text. English that is card data stays: a text
//     made only of card, attack and Ability names (with counts, "x2", "vs"), the proper names in
//     KEEP_NAMES, and text inside the CARD_TEXT blocks that names a card, attack or Ability.
//     Elements marked data-no-tr or listed in I18N_SKIP are never looked at.
//
//   node tests/i18n-check.mjs              the check (Spanish, then Portuguese), with a short report per screen
//   node tests/i18n-check.mjs --dump       every English string still showing, per screen, kept ones marked
//   node tests/i18n-check.mjs --lang=es    one language only
//   node tests/i18n-check.mjs --show=grade every text a screen shows (screens whose name starts with it)
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
const LANGS = ONLY ? [ONLY] : ['es', 'pt', 'fr', 'de', 'it'];
// 3.0.2: the html lang each language sets, and how Ask the odds says Open (the opening hand).
const HTML_LANG = { es: 'es', pt: 'pt-BR', fr: 'fr', de: 'de', it: 'it' };
const OPEN_WORD = { es: 'Mano', pt: 'Mão', fr: 'Main', de: 'Hand', it: 'Mano' };
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
      if (k === 'src') continue;   // a source's label ("CardJinx, 25 Oct 2026") is app text, not a card
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

// ── English that may stay on screen (card data, not app text) ──
// Proper names: the data sources and the font in Credits, the results site under Against the meta.
const KEEP_NAMES = new Set(['Limitless TCG', 'TCGdex', 'Pokémon TCG API', '(pokemontcg.io)', 'Saira']);
// Blocks whose text is built from card text. A string here stays English only when it names a card,
// attack or Ability; a sentence there with no card name in it is app text and must be translated.
const CARD_TEXT = [
  ['#grade-body p, #grade-body .gt, #grade-body .t68-here', 'Grade tab findings and How it plays paragraphs, built from card text'],
  ['.bld-sub', 'deck builder sub-lines: stage, HP, attack and Ability names'],
  ['#pz-act, .pz-btns', 'puzzle actions: each names a card, an attack or an Ability'],
];
const EN_GLUE = /\b(?:the|and|your|you|with|this|that|is|it|its|of|to|for|from|when|while|cannot|than|each|every|has|have|are|be|or|which|they|their)\b/;
const NAMES_BY_LEN = [...names].filter(n => n.length >= 3).sort((a, b) => b.length - a.length);
const isLetter = c => !!c && /[\p{L}\p{N}]/u.test(c);
/** The text with every card, attack and Ability name in it blanked out, and whether it had one. */
function stripNames(s) {
  let r = norm(s), hit = false;
  for (const n of NAMES_BY_LEN) {
    let i = r.indexOf(n);
    while (i >= 0) {
      if (!isLetter(r[i - 1]) && !isLetter(r[i + n.length])) { r = r.slice(0, i) + ' '.repeat(n.length) + r.slice(i + n.length); hit = true; }
      i = r.indexOf(n, i + 1);
    }
  }
  return { rest: r, hit };
}
/** Why an English string may stay, or '' when it is app text that should be translated. */
function keepWhy(s, el) {
  if (KEEP_NAMES.has(s)) return 'proper name';
  const { rest, hit } = stripNames(s);
  if (hit && !/[a-z]{2}/.test(rest.replace(/\b(?:vs|x\d+|ex|v|vstar|vmax)\b/g, ''))) return 'card names only';
  // Muse s6 M1: a sentence in those blocks stays English only when, with the names blanked, it has none
  // of the little words that make an English sentence; "Mew's Restart: can use the attacks of ..." does.
  if (hit && !EN_GLUE.test(rest)) for (const [sel, why] of CARD_TEXT) if (el.closest(sel)) return why;
  return '';
}

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
      // Shuffles are seeded, so every run deals the same hands and shows the same text.
      let seed = 20261112;
      w.Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
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
  // 3.0.2: French, German and Italian download when picked.
  if (dom.window.rdI18n) await dom.window.rdI18n.ready;
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
      if (!left.has(key)) left.set(key, { tag: (p.getAttribute('class') || '').split(' ')[0] || p.tagName.toLowerCase(), keep: keepWhy(key, p) });
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
// Muse s6 M1: a second, messier list: the main attacker at one copy, many singletons and a toolbox of
// support Pokemon, so the Grade tab writes the sentences a clean top list never needs.
const LIST2 = (() => {
  const l = JSON.parse(fs.readFileSync(path.join(HERE, 'grade-lists.json'), 'utf8')).find(x => x.deckName === 'Mega Excadrill');
  const cards = l.cards.map(c => Object.assign({}, c));
  const main = cards.find(c => c.name === 'Mega Excadrill ex'), base = cards.find(c => c.name === 'Drilbur');
  main.count -= 1; base.count += 1;
  return { deckName: l.deckName, cards };
})();
const listText = L => ['pokemon', 'trainer', 'energy'].map(part => {
  const rows = L.cards.filter(c => c.part === part);
  const label = { pokemon: 'Pokémon', trainer: 'Trainer', energy: 'Energy' }[part];
  return rows.length ? label + ': ' + rows.reduce((a, c) => a + c.count, 0) + '\n' + rows.map(c => [c.count, c.name, c.set, c.number].filter(Boolean).join(' ')).join('\n') : '';
}).filter(Boolean).join('\n\n');
const shut = w => w.document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
const id0 = w => w.eval('String(state.decks[0].id)');
/** Put earlier entries in front of the deck's one real grade history entry. `first` is how far the
 *  first grade sits below the real one (negative: above), `mids` the entries in between, oldest
 *  first, and `last` what the real entry is marked as. Days apart: `gap` (in days, from today back). */
function ghLog(w, first, mids, last, gap = 1) {
  const deck = w.eval('state.decks[0]'), log = deck.gradeLog, real = Object.assign({}, log.e[log.e.length - 1]);
  const day = 86400000, n = mids.length + 2, now = FIXED_NOW;
  const g = i => Math.round((real.g - first + first * i / (n - 1)) * 10) / 10;
  const at = i => now - (n - 1 - i) * gap * day;
  const e = [{ t: at(0), g: g(0), s: real.s, p: real.p, k: 'old', w: 's' }];
  mids.forEach((m, i) => e.push(Object.assign({ t: at(i + 1), g: g(i + 1), s: real.s, p: real.p, k: 'old' + i }, m)));
  e.push(Object.assign(real, last, { t: real.t }));
  log.e = e;
}
/** Ask the odds: two cards each (and), plus one card on its own, by turn `turn`. */
function olAsk(w, turn) {
  w.eval(`(() => { const deck = findDeck(state.activeDeckId), gs = olGroups(deck).filter(g => g.kind !== 'pokemon' && !g.ace && g.qty >= 2);
    _olState = { deckId: deck.id, rows: [{ keys: [gs[0].key, gs[1].key], k: 1, all: true }, { keys: [gs[2].key], k: 2 }], turn: ${turn} }; olRender(); })()`);
}
/** An earlier version of the list: two fewer of one card and two more of another. */
function oldVersion(w) {
  w.eval(`(() => { const deck = findDeck(state.activeDeckId), v = ensureVersions(deck), cs = snapCards(deck.cards);
    const a = cs.find(c => c.count >= 3), b = cs.find(c => c !== a && c.count >= 1 && c.count <= 2);
    a.count -= 2; b.count += 2;
    v.unshift({ ts: Date.now() - 5 * 86400000, kind: 'import', cards: cs }); _cmpSel = ''; })()`);
}
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
  // Grade history: the first grade is kept by the screen above. These put earlier entries in front of
  // it, one of each kind the history can show. The last entry stays the real one, so no grade moves.
  ['grade history', async w => { ghLog(w, 0.3, [{ w: 'e', d: [[1, 'Ultra Ball'], [-1, 'Nest Ball']] }], { w: 'r', m: '2026-11-15' }); w.renderGrade(); await tick(300); }],
  ['grade history: every note', async w => {
    ghLog(w, -0.4, [{ w: 'e', d: [[2, 'Ultra Ball'], [-1, 'Nest Ball'], [-1, 'Switch']], r: 1 }, { w: 'e', d: [] }, { w: 'u', u: 'no-such-deck' }, { w: 'u', u: '' },
      { w: 'f' }, { w: 'k', ak: 'toolbox' }, { w: 'k', ak: 'x', akn: 'mega rayquaza ex' }, { w: 'k', ak: '' }, { w: 'r', m: '2026-11-01' }, { w: 'r' },
      { w: 'a' }, { w: 'l', n: 1 }, { w: 'l', n: 0 }, { w: 'c' }, { w: 'q' }], { w: 'a' }, 2);
    w.renderGrade(); await tick(300);
  }],
  ['grade history: holding', async w => { ghLog(w, 0, [], { w: 'c' }, 400); w.renderGrade(); await tick(300); }],
  ['grade looks off', async w => { w.gf80Open(); await tick(60); }],
  ['grade looks off sent', async w => { await w.gf80Send('too-high'); await tick(60); }],
  // 3.2.7: a grade read from part of the list (marked Not final, with the card data note), then one
  // still waiting on the card read. The last step puts the deck back as it was.
  ['grade: not final', async w => {
    shut(w); w.showReviewTab('grade');
    w.eval(`(() => { const d = state.decks[0]; window.__cov327 = d.coverage; _dataTried.add(d.id);
      d.coverage = { total: 20, resolved: 19, unresolved: 1, pct: 95, partial: true };
      renderCoverageNote(d); renderGrade(); })()`); await tick(300);
  }],
  ['grade: card data note, misspelled', async w => {
    w.eval(`(() => { const d = state.decks[0]; d.coverage = { total: 20, resolved: 19, unresolved: 1, pct: 95, missing: ['Ultra Bal'] };
      renderCoverageNote(d); })()`); await tick(100);
  }],
  ['grade: reading the cards', async w => {
    w.eval(`(() => { const d = state.decks[0]; _dataBusy.add(d.id); _g71Late.delete(d.id); _g71Since.delete(d.id); renderGrade(); })()`); await tick(300);
  }],
  ['grade: settled again', async w => {
    w.eval(`(() => { const d = state.decks[0]; _dataBusy.delete(d.id); d.coverage = window.__cov327; _g71Since.delete(d.id);
      renderCoverageNote(d); renderGrade(); })()`); await tick(300);
  }],
  ['grade: expanded deck', async w => {
    w.eval(`(() => { const d = state.decks[0]; window.__fmt327 = d.format; d.format = 'expanded'; renderGrade(); })()`); await tick(300);
  }],
  ['cards tab: not legal in Standard', async w => {
    w.eval(`(() => { const d = state.decks[0]; d.format = window.__fmt327; renderGrade(); })()`);
    w.showReviewTab('cards'); await tick(300);
    w.eval(`(() => { const d = state.decks[0]; rot35Out(d, document.getElementById('review-body'), new Set(d.cards.slice(0, 2).map(c => r29Key(c.name)))); })()`); await tick(100);
  }],
  ['odds tab', async w => { w.showReviewTab('odds'); await tick(300); }],
  // Ask the odds with two rows: "and at least ... of each", and a one-card row for the copies tuner.
  ['odds tab: ask the odds', async w => { olAsk(w, 1); await tick(300); }],
  ['odds tab: opening hand', async w => { olAsk(w, 0); await tick(300); }],
  ['practice tab', async w => { w.showReviewTab('practice'); await tick(300); }],
  ['hand', async w => { w.showReviewTab('hand'); await tick(300); }],
  ['goldfish', async w => { w.setHandMode('gold'); await tick(300); }],
  ['drills', async w => { w.showReviewTab('drills'); await tick(300); }],
  ['resource drill', async w => { w.newResDrill(); await tick(300); }],
  ['resource drill: checked', async w => { w.resCheck(); await tick(100); }],
  ['resource drill: 2 rounds', async w => { w.newResDrill(); w.resCheck(); await tick(100); }],
  ['prize read drill', async w => { w.setOppSrc('d:' + id0(w)); w.newReadDrill(); await tick(100); }],
  ['prize read drill: checked', async w => { w.eval('readDrill.rows.filter(r => r.listed > r.shown).slice(0, 6).forEach(r => r.guess = 1); readDrill.rows.filter(r => r.listed > r.shown).slice(6).forEach(r => r.guess = 0)'); w.readCheck(); await tick(100); }],
  ['notes', async w => { w.showReviewTab('notes'); await tick(300); }],
  // An older version with other counts, so Compare lists has card changes and "All ... prized" rows.
  ['notes: compare', async w => { oldVersion(w); w.showReviewTab('notes'); await tick(300); }],
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
  // Home with puzzles played on earlier days and a deck with cards missing art.
  ['home: puzzle and missing art', async w => {
    shut(w); w.showScreen('home');
    w.eval(`(() => { const R = puzzleStore().results, day = 86400000;
      R[dailyKey(Date.now() - day)] = { won: true, moves: 3, num: 3, ts: Date.now() - day };
      R[dailyKey(Date.now() - 2 * day)] = { won: false, moves: 5, num: 2, ts: Date.now() - 2 * day };
      R[dailyKey(Date.now() - 6 * day)] = { won: true, moves: 2, num: 1, ts: Date.now() - 6 * day }; })()`);
    const deck = w.eval('state.decks[0]');
    w._i18nArt = deck.cards.map(c => c.imageUrl);
    deck.cards.slice(0, 22).forEach(c => { c.imageUrl = ''; });
    w.renderHome(); await tick(100);
  }],
  ['home: 1 missing art', async w => {
    const deck = w.eval('state.decks[0]');
    deck.cards.forEach((c, i) => { c.imageUrl = i === 0 ? '' : w._i18nArt[i]; });
    w.eval(`(() => { const R = puzzleStore().results; for (const k in R) delete R[k]; R[dailyKey(Date.now() - 4 * 86400000)] = { won: true, moves: 3, num: 1, ts: 1 }; })()`);
    w.renderHome(); await tick(100);
    deck.cards.forEach((c, i) => { c.imageUrl = w._i18nArt[i]; });
  }],
  ['home: puzzle won today', async w => {
    w.eval(`(() => { const R = puzzleStore().results; R[dailyKey()] = { won: true, moves: 2, num: 2, ts: Date.now() }; R[dailyKey(Date.now() - 86400000)] = { won: true, moves: 4, num: 1, ts: 1 }; })()`);
    w.renderHome(); await tick(100);
  }],
  ['home: puzzle lost today', async w => {
    w.eval(`(() => { const R = puzzleStore().results; R[dailyKey()] = { won: false, moves: 5, num: 2, ts: Date.now() }; })()`);
    w.renderHome(); await tick(100);
  }],
  // Muse s6 M1: the messy list, imported on its own, then its Grade and Cards tabs.
  ['import a messy list', async w => {
    shut(w); w.showScreen('home'); w._i18nIds = w.eval('state.decks.map(d => String(d.id))');
    w.openImportModal();
    w.document.getElementById('import-name').value = LIST2.deckName;
    const t = w.document.getElementById('import-list'); t.value = listText(LIST2); t.dispatchEvent(new w.Event('input'));
    w.setImportFormat('standard');
    await w.importDeck(); await tick(1500); shut(w);
    w._i18nMessy = w.eval('state.decks.map(d => String(d.id))').find(id => !w._i18nIds.includes(id));
    w.showScreen('home'); w.renderHome();
  }],
  ['messy deck: grade tab', async w => { shut(w); await w.openReview(w._i18nMessy); await tick(800); w.showReviewTab('grade'); await tick(1500); }],
  ['messy deck: cards tab', async w => { w.showReviewTab('cards'); await tick(300); }],
  ["what's new card", async w => { shut(w); w.localStorage.setItem('rd_seen_version', 'v2.0.0'); w.showScreen('home'); w.renderHome(); await tick(100); }],
  ['tour', async w => { shut(w); w.showScreen('home'); w.startTour(true); await tick(300); }],
];

const report = {};
for (const lang of LANGS) {
  console.log(`\n== ${lang} ==`);
  const { w, d, errors } = await load(lang);
  ok(d.documentElement.lang === HTML_LANG[lang], `html lang is ${d.documentElement.lang}`);
  ok(!!w.rdI18n.dict[lang], `${lang} is loaded and offered in Settings`);
  // Dictionary keys must not be card data.
  const dict = w.rdI18n.dict[lang] || {};
  const coll = Object.keys(dict).filter(k => names.has(norm(k)));
  const sc = Object.keys(w.rdI18n.scoped).filter(k => names.has(norm(k)));
  console.log(`     scoped words that are also card data (translated only in their own buttons): ${sc.join(', ') || 'none'}`);
  ok(!coll.length, `${Object.keys(dict).length} strings, ${w.rdI18n.pat[lang].length} patterns, no key is a card, attack, set or deck name${coll.length ? ': ' + coll.join(', ') : ''}`);
  const bad = [], english = [], engNums = [];
  let numsSeen = 0;
  // An English-form number left on screen: 51.8 (a decimal point), 5,885 (comma thousands), or 52%
  // with no space where the language puts one. Versions (v3.3, License 1.1) are not numbers.
  const VER = w.eval('I18N_NUM_VER'), group4 = /\D/.test(new Intl.NumberFormat(HTML_LANG[lang]).format(3023)), pctSpace = /\s/.test(new Intl.NumberFormat(HTML_LANG[lang], { style: 'percent' }).format(0.5));
  const engForm = v => {
    for (const m of v.matchAll(/(?<![\w.,$])(\d+\.\d{1,2}|\d{1,3}(?:,\d{3})+)(?![\w]|[.,:]\d)/g)) if (!VER.test(v.slice(Math.max(0, m.index - 9), m.index))) return true;
    if (pctSpace && /\d%/.test(v)) return true;
    // 3.3.3: a count of 1000 or more with no grouping (3023 wins). Years (1990 to 2099) stay.
    for (const m of v.matchAll(group4 ? /(?<![\w.,:\/#$\u00a0\u202f-]|\d[\u00a0\u202f])\d{4,}(?![\w.,:\/]?\d|[\u00a0\u202f]\d)/g : /(?<![\w.,:\/#$\u00a0\u202f-]|\d[\u00a0\u202f])\d{5,}(?![\w.,:\/]?\d|[\u00a0\u202f]\d)/g)) if (!w.i18nIsYear(m[0], v.slice(0, m.index), v.slice(m.index + m[0].length), lang) && !VER.test(v.slice(Math.max(0, m.index - 9), m.index)) && !/(?:build |n°|nº|Nr\. |n\. )$/i.test(v.slice(Math.max(0, m.index - 7), m.index))) return true;
    return false;
  };
  let totalLeft = 0, totalKept = 0;
  let openWord = '';
  for (const [name, fn] of SCREENS) {
    const before = errors.length;
    try { await fn(w); } catch (e) { errors.push(name + ': ' + (e && e.stack || e)); }
    await tick(60);
    const { left, badCards } = scan(w, roots(d));
    bad.push(...badCards.map(b => name + ': ' + b));
    // 3.3.2: every number in the language's own form (51,8 % in French), none left as 51.8%.
    for (const r of roots(d)) {
      if (!r) continue;
      const tn = d.createTreeWalker(r, 4);
      while (tn.nextNode()) {
        const n = tn.currentNode, v = n.nodeValue, pe = n.parentElement;
        if (!/\d/.test(v) || !pe || pe.closest(w.rdI18n.skip) || names.has(norm(v))) continue;
        if (engForm(v)) engNums.push(name + ': ' + v.replace(/\s+/g, ' ').trim().slice(0, 90));
        else if (/\d,\d|\d\.\d{3}\b|\d[\u00a0\u202f]\d/.test(v)) numsSeen++;
      }
    }
    const ui = [...left].filter(([, v]) => !v.keep);
    english.push(...ui.map(([k]) => name + ': ' + k));
    totalLeft += ui.length; totalKept += left.size - ui.length;
    (report[name] = report[name] || {})[lang] = ui.length + (left.size > ui.length ? ' (+' + (left.size - ui.length) + ' card data)' : '');
    if (SHOW && name.startsWith(SHOW)) {
      const out = [];
      for (const r of roots(d)) { if (!r) continue; const tw = d.createTreeWalker(r, 4); while (tw.nextNode()) { const t = tw.currentNode.nodeValue.replace(/\s+/g, ' ').trim(); if (t && !tw.currentNode.parentElement.closest('style,script')) out.push(t); } }
      console.log(`-- ${name} (${lang}):\n` + out.join(' | '));
    }
    if (DUMP) {
      console.log(`-- ${name}: ${ui.length} still English, ${left.size - ui.length} card data`);
      for (const [s, c] of left) console.log(`   ${c.keep ? 'kept ' : 'LEFT '}[${c.tag}] ${s}${c.keep ? '   (' + c.keep + ')' : ''}`);
    }
    if (name === 'odds tab: ask the odds') {
      const o = d.querySelector('.ol-turn .mode-opt[data-t="0"]');
      openWord = o ? o.textContent.trim() : '(missing)';
    }
    if (errors.length > before) console.log('   errors on ' + name + ': ' + errors.slice(before).join(' | ').slice(0, 600));
  }
  ok(openWord === OPEN_WORD[lang], `Ask the odds: Open (the opening hand) reads ${openWord}, not the verb`);
  ok(!english.length, `no English app text left on any of ${SCREENS.length} screens (${totalKept} card data strings kept)` + (english.length ? ':\n       ' + english.slice(0, 40).join('\n       ') + (english.length > 40 ? `\n       and ${english.length - 40} more` : '') : ''));
  // 3.3.3: a count is grouped by what it is, not its size: 2045 games is a count, April 2027 a year.
  {
    const want = new Intl.NumberFormat(HTML_LANG[lang]).format(2045), y = w.i18nNums;
    const mon = (w.eval('I18N_MON')[lang] || (w.i18nMore(lang) || {}).mon)[3];   // April in the language
    const cases = [[y('2045 x', lang), want + ' x'], [y('51.4% / 2045 x', lang).endsWith(want + ' x'), true], [y(mon + ' 2027', lang), mon + ' 2027'],
      [y('16 Nov 2026', lang), '16 Nov 2026'], [y('Nov 16, 2026', lang), 'Nov 16, 2026'], [y('11/12/2026', lang), '11/12/2026'], [y('E 2024, F 2025', lang), 'E 2024, F 2025'], [y('build 1210', lang), 'build 1210']];
    const badCase = cases.filter(([a, b]) => a !== b);
    ok(!badCase.length, `2045 games reads ${y('2045', lang)} games, years stay years` + (badCase.length ? ': ' + badCase.map(c => JSON.stringify(c)).join(' ') : ''));
  }
  // 3.3.3 (Muse 3.3.2 retest): the Upgrades block and the Top fixes line, whose swaps the screens here may not reach
  // (no network for the cards to try). Each piece is translated, with card and deck names kept.
  {
    const UPS = ['These raise Synergy or Power. The grade itself stays the same, because Synergy lowers the grade only when a list fits loosely. Each number comes from grading the list with that swap made.',
      'Each number comes from grading the list with that swap made.', 'Synergy 8.4 to 8.9.', 'Power 8.8 to 9.0.', 'Synergy 8.4 to 8.9, Power 8.8 to 9.0.',
      '100% of Dragapult Dudunsparce top lists run Dunsparce.', '74% of top lists run Night Stretcher.', 'Right now nothing in the list finds Pokemon.', 'Right now only 3 cards draw.',
      'grade 8.5 to 8.6', 'Synergy 8.4 to 8.9', 'Power 8.8 to 9.0', 'Best 3 swaps together', "Switch for Night Stretcher, Team Rocket's Watchtower for Dunsparce.",
      'Suggest cards I own first', 'Cheapest first', 'Top fix', 'Top two fixes', 'Upgrades',
      // 3.3.3: Gengar's second life, in its finding and in Why Power is.
      'That second life comes together in about 90% of games, since Gengar has to reach play or your discard pile first and is in your prizes in about 1 game in 10.',
      'Power counts it as 90% of a second copy.', 'Gengar coming back with Netherworld Gate, in about 90% of games, adds 0.8 to Damage.',
      'Gengar coming back with Netherworld Gate, in about 90% of games, adds less than 0.1 to Damage, since other attackers in the list already cover a Knock Out.'];
    if (process.env.I18N_SHOW_UP) UPS.slice(-4).forEach(x => console.log('     ' + w.rdI18n.t(x)));
    const words = x => x.replace(/[^A-Za-z]+/g, ' ').trim();
    const keep = ['Dragapult Dudunsparce', 'Dunsparce', 'Night Stretcher', "Team Rocket's Watchtower", 'Switch', 'Gengar', 'Netherworld Gate'];
    const left = UPS.filter(x => { const r = w.rdI18n.t(x); return words(r) === words(x) || !keep.filter(k => x.includes(k)).every(k => r.includes(k)); });
    ok(!left.length, `Upgrades and Top fixes read in ${lang} (${UPS.length} pieces)` + (left.length ? ':\n       ' + left.join('\n       ') : ''));
  }
  ok(!engNums.length && numsSeen > 0, `every number in ${lang} form (${numsSeen} shown)` + (engNums.length ? ':\n       ' + [...new Set(engNums)].slice(0, 30).join('\n       ') : ''));
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
  console.log(`     ${totalLeft} English strings still showing over ${SCREENS.length} screens (repeats counted per screen)`);
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
  console.log('\nEnglish app text left per screen (' + LANGS.join(' / ') + '), card data kept in brackets:');
  for (const k in report) console.log('  ' + k.padEnd(30) + LANGS.map(l => String(report[k][l] ?? '-')).join(' / '));
}
console.log(fails ? `\ni18n check failed: ${fails} problem(s).` : '\ni18n check passed.');
process.exit(fails ? 1 : 0);
