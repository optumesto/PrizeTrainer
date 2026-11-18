// TCG Live copy check: opens the app in jsdom and checks js/v82-copy-tcg-live.js.
//   - a list exported from TCG Live, saved and copied again, comes out exactly as TCG Live wrote it
//     (headers count lines, Energy types as symbols, Total Cards last),
//   - a deck saved without set codes gets printings TCG Live has (cards.json, MEE Basic Energy),
//     promo sets as TCG Live writes them, and card names stay English in every language,
//   - the deck menu's row copies on the tap, and shows the list to copy by hand when the clipboard is blocked,
//   - the row, the toast and the blocked sheet read in Spanish, Portuguese, French, German and Italian.
//
//   node tests/tcg-live-copy-check.mjs
//
// Needs jsdom: npm install --prefix tests. Reads only this folder's files, no network.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { staleStamps } from '../app-file.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const require = createRequire(path.join(HERE, 'package.json'));
const { JSDOM, VirtualConsole, ResourceLoader } = require('jsdom');

let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

const stale = staleStamps();
ok(!stale.length, 'file stamps are current' + (stale.length ? ': ' + stale.join(', ') : ''));

class Local extends ResourceLoader {
  fetch(url) {
    const u = new URL(url);
    if (u.hostname === 'rdydeck.com') { const f = path.join(ROOT, u.pathname); if (fs.existsSync(f)) return Promise.resolve(fs.readFileSync(f)); }
    return Promise.resolve(Buffer.from(''));
  }
}
async function fakeFetch(input) {
  const u = new URL(String(input && input.url || input), 'https://rdydeck.com/');
  if (u.hostname === 'rdydeck.com') {
    const f = path.join(ROOT, u.pathname);
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return new Response(fs.readFileSync(f), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response('', { status: 503 });
}
async function load(lang) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(String(e && e.message || e)));
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
    url: 'https://rdydeck.com/', runScripts: 'dangerously', resources: new Local(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.fetch = fakeFetch;
      w.Response = Response; w.Request = Request; w.Headers = Headers; w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
      w.AbortSignal.timeout = () => new AbortController().signal;
      w.matchMedia = () => ({ matches: false, media: '', addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.scrollTo = () => {}; w.scrollBy = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
      w.HTMLCanvasElement.prototype.getContext = () => null;
      try { delete w.indexedDB; } catch (_) {}
      w.requestIdleCallback = fn => setTimeout(fn, 0);
      w.clip = null;
      Object.defineProperty(w.navigator, 'clipboard', { configurable: true, value: { writeText: t => { if (w.clipBlocked) return Promise.reject(new Error('blocked')); w.clip = t; return Promise.resolve(); } } });
      w.document.execCommand = () => false;
      if (lang) w.localStorage.setItem('rd_lang', lang);
    },
  });
  await wait(3000);
  if (dom.window.rdI18n) await dom.window.rdI18n.ready;
  return { dom, w: dom.window, d: dom.window.document, errors };
}

// A list as TCG Live exports it (Nov 2026).
const LIVE = `Pokémon: 1
4 Iron Thorns ex TWM 77

Trainer: 24
1 AZ's Tranquility CRI 76
2 Xerosic's Machinations SFA 64
1 Clemont's Quick Wit SSP 229
1 Call Bell SSP 165
4 Crispin SCR 133
3 Lillie's Determination MEG 119
4 Pokégear 3.0 BLK 84
1 Rust Syndicate Grunt PBL 81
1 Gravity Mountain SSP 250
3 Boss's Orders MEG 114
1 Cyrano SSP 230
3 Crushing Hammer POR 71
1 Energy Recycler FLI 143
2 Switch MEG 130
1 Tool Scrapper CRI 115
1 Ultra Ball MEG 131
1 Judge POR 76
2 Adventure Lantern DLR 126
1 Hero's Cape TEF 152
2 Heavy Baton TEF 151
1 Enhanced Hammer PRC 162
1 Team Rocket's Watchtower ASC 210
1 Custom Vest DLR 91
2 Jumbo Ice Cream PFL 91

Energy: 4
2 Mist Energy TEF 161
5 Basic {L} Energy MEE 12
4 Voltaic {L} Energy PBL 84
4 Basic {R} Energy MEE 10

Total Cards: 60`;

// Saved without set codes (typed by hand), with a promo and a zero-padded number.
const BARE = `4 Dreepy
4 Drakloak TWM 129
1 Fezandipiti SVP 85
4 Boss's Orders
2 Lightning Energy
1 Psychic Energy SVE 013
1 Telepathic Psychic Energy`;

function save(w, name, text) {
  const cards = w.parseDeckList(text);
  const deck = { id: 'tl82-' + name, name, cards, format: 'standard', created: Date.now() };
  w.eval('state').decks.push(deck);
  return deck;
}

// ── English: the text, the row, the copy, the blocked fallback ──
{
  const { w, d, errors } = await load('');
  const deck = save(w, 'Iron Thorns', LIVE);
  const out = w.tl82Text(deck);
  ok(out === LIVE, 'a TCG Live export saved in RdyDeck copies back exactly as TCG Live wrote it');
  if (out !== LIVE) console.log(out);
  ok(w.deckListText(deck.cards) !== out && /^Pokémon: 4\n/.test(w.deckListText(deck.cards)), 'the edit box text (deckListText) is unchanged, so saved decks still match');

  const bare = save(w, 'Bare', BARE);
  await w.tl82Data();
  const b = w.tl82Text(bare);
  console.log('     ' + b.replace(/\n/g, '\n     '));
  ok(/^Pokémon: 3\n4 Dreepy TWM 128\n4 Drakloak TWM 129\n1 Fezandipiti PR-SV 85\n/.test(b), 'a card without a set gets the cards.json printing, a promo reads PR-SV');
  ok(/\n4 Boss's Orders MEG 114\n/.test(b), "a Trainer without a set gets the cards.json printing (Boss's Orders MEG 114)");
  ok(/\n2 Basic \{L\} Energy MEE 12\n1 Basic \{P\} Energy SVE 13\n1 Telepathic \{P\} Energy POR 88\n/.test(b), 'Basic Energy as TCG Live writes it (MEE when no set, its own set when it has one, no leading zero); a typed Special Energy with its symbol');
  ok(/\n\nTotal Cards: 17$/.test(b), 'Total Cards counts the cards');

  w.eval('state').activeDeckId = deck.id;
  w.dd65Menu();
  const row = [...d.querySelectorAll('.st38-row')].find(x => /Copy list for TCG Live/.test(x.textContent));
  ok(!!row, 'the deck menu has Copy list for TCG Live');
  row.click(); await wait(50);
  ok(w.clip === LIVE, 'the tap copies the list');
  ok(/List copied\. Paste it into TCG Live's deck import\./.test(d.getElementById('toast').textContent), 'the toast says it was copied');

  w.clipBlocked = true;
  w.dd65Menu();
  [...d.querySelectorAll('.st38-row')].find(x => /Copy list for TCG Live/.test(x.textContent)).click(); await wait(50);
  const ta = d.querySelector('.modal-overlay.active textarea.bld-ta, textarea.bld-ta');
  ok(ta && ta.value === LIVE && ta.hasAttribute('data-no-tr'), 'a blocked clipboard shows the whole list to copy by hand');
  ok(/Press and hold the list/.test(d.body.textContent), 'the fallback says how to copy it');
  w.closeSheet();
  ok(!errors.length, 'no JS errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  w.close();
}

// ── each language: UI translated, the list stays English ──
const WANT = {
  es: ['Copiar lista para TCG Live', 'Lista copiada. Pégala al importar una baraja en TCG Live.', 'Tu navegador bloqueó la copia.'],
  pt: ['Copiar lista para o TCG Live', 'Lista copiada. Cole-a ao importar um deck no TCG Live.', 'Seu navegador bloqueou a cópia.'],
  fr: ['Copier la liste pour TCG Live', "Liste copiée. Collez-la dans l'importation de deck de TCG Live.", 'Votre navigateur a bloqué la copie.'],
  de: ['Liste für TCG Live kopieren', 'Liste kopiert. Füge sie beim Deck-Import in TCG Live ein.', 'Dein Browser hat das Kopieren blockiert.'],
  it: ['Copia la lista per TCG Live', "Lista copiata. Incollala nell'importazione del mazzo su TCG Live.", 'Il tuo browser ha bloccato la copia.'],
};
for (const lang of Object.keys(WANT)) {
  const { w, d, errors } = await load(lang);
  const deck = save(w, 'Iron Thorns', LIVE);
  w.eval('state').activeDeckId = deck.id;
  w.dd65Menu(); await wait(60);
  const row = [...d.querySelectorAll('.st38-row')].find(x => x.getAttribute('onclick').startsWith('tl82Copy'));
  ok(row && row.textContent.trim() === WANT[lang][0], `${lang}: the row reads "${row && row.textContent.trim()}"`);
  row.click(); await wait(80);
  ok(w.clip === LIVE, `${lang}: the copied list stays in English`);
  ok(d.getElementById('toast').textContent === WANT[lang][1], `${lang}: the toast reads "${d.getElementById('toast').textContent}"`);
  w.clipBlocked = true;
  w.dd65Menu(); await wait(60);
  [...d.querySelectorAll('.st38-row')].find(x => x.getAttribute('onclick').startsWith('tl82Copy')).click(); await wait(80);
  const p = [...d.querySelectorAll('.st38-p')].map(x => x.textContent).find(t => t.startsWith(WANT[lang][2]));
  ok(!!p, `${lang}: the blocked sheet reads "${p || ''}"`);
  ok(d.querySelector('textarea.bld-ta').value === LIVE, `${lang}: the list to copy by hand stays in English`);
  ok(!errors.length, `${lang}: no JS errors` + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  w.close();
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
