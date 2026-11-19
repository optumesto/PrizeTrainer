// 5turn in every language: loads the hidden page (opponent/play.html) in jsdom with js/i18n.js and the
// language files, plays games in Spanish, Portuguese, French, German and Italian through the page's own
// buttons, and lists any app text still showing in English. Card, attack and Ability names stay English
// and are not counted. Fails (exit 1) when any English app text is left.
// node opponent/test/i18n.mjs [games per language] [--lang=xx]
// Needs jsdom: npm install --prefix tests.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const dir = dirname(fileURLToPath(import.meta.url)), root = join(dir, '..', '..');
const require = createRequire(join(root, 'tests', 'package.json'));
const { JSDOM } = require('jsdom');
const args = process.argv.slice(2);
const N = +(args.find(a => /^\d+$/.test(a)) || 3);
const ONLY = (args.find(a => a.startsWith('--lang=')) || '').slice(7);
const LANGS = ONLY ? [ONLY] : ['es', 'pt', 'fr', 'de', 'it'];

const html = readFileSync(join(root, 'opponent', 'play.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<template[\s\S]*?<\/template>/g, '');
const dom = new JSDOM(html, { url: 'https://rdydeck.com/opponent/play.html?try', runScripts: 'dangerously', pretendToBeVisual: true });
const w = dom.window;
let timers = [];
w.setTimeout = f => { timers.push(f); return timers.length; };
const files = ['puzzle/text.js', 'puzzle/engine.js', 'opponent/game.js', 'opponent/effects.js', 'opponent/ai.js', 'opponent/decks.js', 'opponent/play.js',
  'js/i18n.js', 'js/i18n-fr.js', 'js/i18n-de.js', 'js/i18n-it.js'];
for (const f of files) { const sc = w.document.createElement('script'); sc.textContent = readFileSync(join(root, f), 'utf8') + '\n//# sourceURL=' + f; w.document.head.appendChild(sc); }
w.eval("['fr','de','it'].forEach(l => rdI18n.add(l)); rdI18n.addCardNames(Object.keys(RdyOppDecks.cards));");
// jsdom fires its own DOMContentLoaded a moment later, which would put the menu back over the first game
if (w.document.readyState !== 'complete') await new Promise(res => w.addEventListener('load', res));
const run = () => { let n = 0; while (timers.length && n++ < 100000) timers.shift()(); };

// Every card, attack and Ability name in the decks, longest first, to mask before looking for English.
const D = w.RdyOppDecks, names = new Set();
Object.values(D.cards).forEach(c => { names.add(c.name); (c.attacks || []).forEach(a => names.add(a.name)); (c.abil || []).forEach(a => names.add(a[0])); });
const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const NAMES = new RegExp('(' + [...names].sort((a, b) => b.length - a.length).map(esc).join('|') + ')', 'g');
const KEEP = /^(RdyDeck|5turn|Pokémon|ex|OK|No|Tool)$/;
const SKIP = w.eval('I18N_SKIP');

function english(lang, found) {
  w.rdI18n.walk(w.document.body);
  const tw = w.document.createTreeWalker(w.document.body, 4);
  while (tw.nextNode()) {
    const n = tw.currentNode, el = n.parentElement;
    if (!el || el.closest(SKIP) || el.closest('[data-no-tr]')) continue;
    const t = n.nodeValue.replace(/\s+/g, ' ').trim();
    if (!/[A-Za-z]/.test(t)) continue;
    const o = w.rdI18n.orig(n).replace(/\s+/g, ' ').trim();
    if (o !== t) { // translated: still look for English joining words left inside it, like "Cambiar a your X"
      const half = t.replace(NAMES, '').match(/\b(your|their|the|from|with|and|of|is|turn)\b/i);
      if (half) { const k = '(half) ' + t.replace(NAMES, '{C}').replace(/\d+/g, '#'); if (!found.has(k)) found.set(k, { n: 0, ex: t + ' <= ' + o }); found.get(k).n++; }
      continue;
    }
    const left = t.replace(NAMES, '').replace(/\b(x\d+|HP)\b/g, '');
    const words = (left.match(/[A-Za-z]{2,}/g) || []).filter(x => !KEEP.test(x));
    if (!words.length) continue;
    if (w.rdI18n.lookup(t, lang) != null) continue;
    const k = t.replace(NAMES, '{C}').replace(/\d+/g, '#');
    if (!found.has(k)) found.set(k, { n: 0, ex: t }); found.get(k).n++;
  }
}

let rnd = 11; const r = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
let total = 0, errors = 0;
for (const lang of LANGS) {
  w.rdI18n.set(lang, false);
  const found = new Map();
  w.RdyPlay.menu(); english(lang, found);
  for (let g = 0; g < N; g++) {
    const level = ['easy', 'contested', 'aggressive'][g % 3];
    w.RdyPlay.start({ mode: '5turn', level, deckA: D.decks[(g * 3 + LANGS.indexOf(lang)) % D.decks.length], deckB: D.decks[(g * 5 + 7) % D.decks.length] }); run();
    for (let presses = 0; presses < 3000; presses++) {
      await new Promise(res => setImmediate(res)); // lets the page's MutationObserver run, so its records don't pile up
      english(lang, found);
      const app = w.document.getElementById('app'), h = app.innerHTML;
      // the Game log is folded; open it so its lines are looked at too
      app.querySelectorAll('details').forEach(d => d.setAttribute('open', ''));
      if (/class="result"/.test(h)) { if (process.env.DEBUG) console.log("result at", presses); break; }
      if (process.env.DUMP && presses === +process.env.DUMP) { const a = app.cloneNode(true); a.querySelectorAll('div,li,p,button,summary').forEach(e => e.append('\n')); console.log(a.textContent.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').slice(0, 5000)); }
      const on = re => [...h.matchAll(re)].map(m => m[1]);
      try {
        if (/RdyPlay\.go\(\)/.test(h)) { w.RdyPlay.go(); run(); continue; }
        if (/RdyPlay\.su\(/.test(h)) {
          const su = on(/RdyPlay\.su\((\d+)\)/g);
          if (!/RdyPlay\.sgo\(\)/.test(h)) { w.RdyPlay.su(+su[Math.floor(r() * su.length)]); continue; }
          on(/RdyPlay\.sb\((\d+)\)/g).forEach(u => { if (r() < 0.6) w.RdyPlay.sb(+u); });
          english(lang, found); w.RdyPlay.sgo(); run(); continue;
        }
        if (/RdyPlay\.tog\(/.test(h)) {
          const chips = [...h.matchAll(/RdyPlay\.tog\(&quot;(.*?)&quot;\)/g)].map(m => JSON.parse('"' + m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'") + '"'));
          w.RdyPlay.tog(chips[Math.floor(r() * chips.length)]); english(lang, found);
          const h2 = app.innerHTML, take = h2.match(/RdyPlay\.do\((\d+)\)/);
          if (take) { w.RdyPlay.do(+take[1]); run(); } else { w.RdyPlay.tog(chips[0]); }
          continue;
        }
        const btn = on(/RdyPlay\.do\((\d+)\)/g).map(Number);
        if (!btn.length) { if (process.env.DEBUG) console.log("no buttons at", presses, h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 600)); break; }
        const atk = btn.filter(i => /primary/.test(h.split(`RdyPlay.do(${i})`)[0].slice(-40)));
        const pick = atk.length && r() < 0.7 ? atk[0] : btn.length > 1 && r() < 0.85 ? btn[Math.floor(r() * (btn.length - 1))] : btn[btn.length - 1];
        w.RdyPlay.do(pick); run();
      } catch (e) { errors++; console.log(lang, 'ERROR', e.stack.split('\n').slice(0, 3).join(' | ')); break; }
    }
  }
  w.RdyPlay.menu(); english(lang, found);
  const list = [...found].sort((a, b) => b[1].n - a[1].n);
  total += list.length;
  console.log(`${lang}: ${list.length} English text${list.length === 1 ? '' : 's'} left`);
  list.slice(0, process.env.ALL ? 1000 : 40).forEach(([k, v]) => console.log(`  ${v.n}\t${k}\t|| ${v.ex}`));
}
w.rdI18n.set('en', false);
if (total || errors) { console.log(`FAIL: ${total} English texts, ${errors} errors`); process.exit(1); }
console.log('OK: no English app text left in ' + LANGS.join(', '));
