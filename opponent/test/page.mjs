// Plays the hidden page (opponent/play.js) with no browser: a stand-in document, timers run at once,
// and a bot that presses the page's own buttons. Catches errors in labels and screens.
// node opponent/test/page.mjs [games] [mode] [level]
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url)), root = join(dir, '..', '..');
const [nArg = '6', modeArg, levelArg] = process.argv.slice(2);
const els = {}; const el = id => els[id] || (els[id] = { id, innerHTML: '', value: '', onclick: null });
let timers = [];
const ctx = { console, Math, JSON, Date, Map, Set, WeakMap, Object, Array, String, Number, Error, RegExp, Boolean, Symbol, Promise,
  setTimeout: f => timers.push(f), document: { getElementById: el, addEventListener: (e, f) => { ctx._ready = f; } }, location: { search: '?try' } };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['puzzle/text.js', 'puzzle/engine.js', 'opponent/game.js', 'opponent/effects.js', 'opponent/ai.js', 'opponent/decks.js', 'opponent/play.js'])
  vm.runInContext(readFileSync(join(root, f), 'utf8'), ctx, { filename: f });
ctx._ready();
const run = () => { let n = 0; while (timers.length && n++ < 100000) timers.shift()(); };
let rnd = 7; const r = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
let multi = 0; const N = +nArg, out = { win: 0, lose: 0, pressure: 0 }, labels = new Set(); let bad = 0;
for (let g = 0; g < N; g++) {
  const mode = modeArg || (g % 2 ? 'full' : 'pressure'), level = levelArg || ['easy', 'contested', 'aggressive'][g % 3];
  const D = ctx.RdyOppDecks.decks;
  ctx.RdyPlay.start({ mode, level, deckA: D[g % D.length], deckB: D[(g * 7 + 3) % D.length] }); run();
  let presses = 0;
  for (;;) {
    const h = el('app').innerHTML;
    if (/undefined|NaN|\[object/.test(h.replace(/<[^>]+>/g, ' '))) { bad++; console.log('BAD TEXT', g, h.replace(/<[^>]+>/g, ' ').match(/.{0,60}(undefined|NaN|\[object).{0,30}/)[0]); }
    if (/class="result"/.test(h)) { const t = h.match(/<div class="q">([^<]*)/)[1]; if (/You win/.test(t)) out.win++; else if (/opponent wins/.test(t)) out.lose++; else out.pressure++; if (process.env.V) console.log(g, mode, level, t); break; }
    if (/RdyPlay\.go\(\)/.test(h)) { ctx.RdyPlay.go(); run(); continue; }
    if (/RdyPlay\.tog\(/.test(h)) { // several cards at once: tap one or two, then take them (or take nothing)
      const un = t => t.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
      const chips = [...h.matchAll(/RdyPlay\.tog\(&quot;(.*?)&quot;\)/g)].map(m => JSON.parse('"' + un(m[1]) + '"'));
      let h2 = h, take = null; multi++;
      for (let j = 0; j < 60 && !take; j++) { ctx.RdyPlay.tog(chips[Math.floor(r() * chips.length)]); h2 = el('app').innerHTML; if (j >= 1 || r() < 0.5) take = h2.match(/RdyPlay\.do\((\d+)\)">Take [^n]/); }
      take = take || h2.match(/RdyPlay\.do\((\d+)\)">/);
      if (!take) { console.log('NO TAKE', g, h2.slice(0, 300)); bad++; break; }
      ctx.RdyPlay.do(+take[1]); run(); continue;
    }
    const btn = [...h.matchAll(/RdyPlay\.do\((\d+)\)">([^<]*)</g)].map(m => ({ i: +m[1], l: m[2] }));
    if (!btn.length) { console.log('NO BUTTONS', g, h.slice(0, 400)); bad++; break; }
    btn.forEach(b => labels.add(b.l.replace(/\d+/g, '#')));
    const atk = btn.filter(b => /primary/.test(h.split(`RdyPlay.do(${b.i})`)[0].slice(-40)));
    const nonEnd = btn.filter(b => !/End your turn/.test(b.l));
    const pick = atk.length && r() < 0.7 ? atk[0] : nonEnd.length && r() < 0.85 ? nonEnd[Math.floor(r() * nonEnd.length)] : btn[btn.length - 1];
    ctx.RdyPlay.do(pick.i); run();
    if (++presses > 3000) { console.log('TOO LONG', g); bad++; break; }
  }
}
console.log(`games ${N}: you won ${out.win}, opponent won ${out.lose}, five-turn results ${out.pressure}, problems ${bad}, multi-pick screens ${multi}`);
if (process.env.LABELS) console.log([...labels].sort().join('\n'));
