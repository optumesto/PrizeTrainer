// Plays the hidden page (opponent/play.js) with no browser: a stand-in document, timers run at once,
// and a bot that presses the page's own buttons. Catches errors in labels and screens.
// node opponent/test/page.mjs [games] [mode] [level]
// OWN=1: your saved decks (opponent/own.js) are switched on with ?mine, read from a stand-in localStorage holding the
// meta lists saved the way RdyDeck saves them, and every game starts from the menu with a saved deck.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url)), root = join(dir, '..', '..');
const [nArg = '6', modeArg, levelArg] = process.argv.slice(2);
const els = {}; const el = id => els[id] || (els[id] = { id, innerHTML: '', value: '', onclick: null });
let timers = [];
const ctx = { console, Math, JSON, Date, Map, Set, WeakMap, Object, Array, String, Number, Error, RegExp, Boolean, Symbol, Promise,
  setTimeout: f => timers.push(f), document: { getElementById: el, addEventListener: (e, f) => { ctx._ready = f; } }, location: { search: process.env.OWN ? '?try&mine' : '?try' } };
let OWNDECKS = null;
if (process.env.OWN) {
  const { savedDecks, saved } = await import('./saved.mjs');
  OWNDECKS = savedDecks();
  // Two that can't play (58 cards, a card with no data) and one with cards Sparring can't fully play.
  OWNDECKS.push({ id: 'short', name: 'Short deck', cards: OWNDECKS[0].cards.map((c, i) => i ? c : Object.assign({}, c, { count: c.count - 2 })) });
  OWNDECKS.push({ id: 'nodata', name: 'No data deck', cards: OWNDECKS[0].cards.map((c, i) => i ? c : Object.assign({}, c, { count: c.count - 1 })).concat([{ name: 'Mystery Card', count: 1 }]) });
  const odd = OWNDECKS[1].cards.map(c => c.supertype === 'Trainer' && c.ttype === 'item' ? Object.assign({}, c, { name: 'Odd ' + c.name, rtext: 'Do something no card has ever done before.' }) : c);
  OWNDECKS.push({ id: 'odd', name: 'Odd deck', cards: odd });
  const store = { ptcg_prize_trainer_v2: JSON.stringify({ decks: OWNDECKS, activeDeckId: 'odd' }) };
  ctx.localStorage = { getItem: k => store[k] == null ? null : store[k], setItem: (k, v) => { store[k] = String(v); } };
}
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['puzzle/text.js', 'puzzle/engine.js', 'opponent/game.js', 'opponent/effects.js', 'opponent/ai.js', 'opponent/decks.js', 'opponent/own.js', 'opponent/play.js'])
  vm.runInContext(readFileSync(join(root, f), 'utf8'), ctx, { filename: f });
ctx._ready();
await new Promise(r => setTimeout(r, 0)); await new Promise(r => setImmediate(r));
let ownBad = 0;
if (OWNDECKS) {
  const h = el('app').innerHTML, note = el('m-note').innerHTML.replace(/<[^>]+>/g, '');
  const want = [[/<optgroup label="Your decks">/.test(h), 'menu lists your decks'], [/<optgroup label="Tournament decks">/.test(h), 'menu lists tournament decks'],
    [el('m-a').value === 'o' + (OWNDECKS.length - 1), 'the deck open in RdyDeck is picked'], [/Not every card does all of its text yet: (Mist Energy, )?Odd /.test(note), 'odd cards named: ' + note],
    [el('m-go').disabled === false, 'start allowed']];
  el('m-a').value = 'o' + (OWNDECKS.length - 3); el('m-a').onchange();
  want.push([/This deck has 58 cards\. Sparring needs 60\./.test(el('m-note').innerHTML.replace(/<[^>]+>/g, '')) && el('m-go').disabled === true, 'short deck held back']);
  el('m-a').value = 'o' + (OWNDECKS.length - 2); el('m-a').onchange();
  want.push([/no card data for these cards yet: Mystery Card\./.test(el('m-note').innerHTML.replace(/<[^>]+>/g, '')) && el('m-go').disabled === true, 'no-data deck held back']);
  el('m-a').value = 'o0'; el('m-b').value = 'o2'; el('m-b').onchange();
  // 3.4.9: Legacy and Rocky Fighting Energy pay as their own type; only their extra text is listed.
  want.push([/^Your deck: Every card in this deck plays in full\.Opponent's deck: (Every card|Not every card does all of its text yet: Legacy Energy, Rocky Fighting Energy\.)/.test(el('m-note').innerHTML.replace(/<[^>]+>/g, '')), 'both sides noted: ' + el('m-note').innerHTML.replace(/<[^>]+>/g, '')]);
  want.forEach(([ok, what]) => { if (!ok) { ownBad++; console.log('OWN MENU', what); } });
}
const run = () => { let n = 0; while (timers.length && n++ < 100000) timers.shift()(); };
let rnd = 7; const r = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
let multi = 0, setups = 0, sheets = 0, piles = 0, searches = 0, twins = 0; const N = +nArg, out = { win: 0, lose: 0, pressure: 0 }, labels = new Set(); let bad = 0;
for (let g = 0; g < N; g++) {
  const mode = modeArg || (g % 2 ? 'full' : '5turn'), level = levelArg || ['easy', 'contested', 'aggressive'][g % 3];
  const D = ctx.RdyOppDecks.decks;
  if (OWNDECKS) { // from the menu: a saved deck against a tournament deck, or against another saved deck
    ctx.RdyPlay.menu(); const n = OWNDECKS.length - 2;
    el('m-level').value = level; if (el('m-mode')) el('m-mode').value = mode;
    el('m-a').value = 'o' + (g === 0 ? OWNDECKS.length - 1 : (g * 5) % (n - 1)); el('m-b').value = g % 3 === 2 ? 'o' + ((g * 11 + 1) % (n - 1)) : 'm' + (g % D.length);
    el('m-go').onclick(); run();
    if (!/RdyPlay\.su\(/.test(el('app').innerHTML)) { console.log('OWN START', g, el('app').innerHTML.slice(0, 200)); bad++; continue; }
    if (g === 0 && !/Not every card does all of its text yet/.test(el('app').innerHTML)) { console.log('OWN SETUP NOTE missing'); bad++; }
  } else
  ctx.RdyPlay.start({ mode, level, deckA: D[g % D.length], deckB: D[(g * 7 + 3) % D.length] }); run();
  let presses = 0;
  for (;;) {
    const h = el('app').innerHTML;
    if (/undefined|NaN|\[object/.test(h.replace(/<[^>]+>/g, ' '))) { bad++; console.log('BAD TEXT', g, h.replace(/<[^>]+>/g, ' ').match(/.{0,60}(undefined|NaN|\[object).{0,30}/)[0]); }
    // 3.4.8: every Pokémon in play (both sides) is on the board, and a tapped card opens its full text.
    if (/class="side opp"/.test(h)) {
      const st = ctx.RdyPlay._s && ctx.RdyPlay._s(), inPlay = st ? st.players.reduce((a, P) => a + (P.active ? 1 : 0) + P.bench.length, 0) : 0, shown = (h.match(/onclick="RdyPlay\.card\('m',\d+\)"/g) || []).length;
      if (st && shown !== inPlay) { bad++; console.log('BOARD', g, 'shown', shown, 'in play', inPlay); }
      const taps = [...h.matchAll(/RdyPlay\.card\('([mhc])',(\d+)\)/g)];
      if (taps.length && r() < 0.35) { const t = taps[Math.floor(r() * taps.length)]; ctx.RdyPlay.card(t[1], +t[2]); sheets++;
        const sh = el('sheet').innerHTML, txt = sh.replace(/<[^>]+>/g, ' ');
        if (!/class="sheet"/.test(sh) || /undefined|NaN|\[object/.test(txt)) { bad++; console.log('SHEET', g, t[0], txt.slice(0, 200)); }
        ctx.RdyPlay.shut(); if (el('sheet').innerHTML) { bad++; console.log('SHEET NOT CLOSED'); } }
      // 3.4.9: both discard piles open; a card opened from a pile goes Back to the pile, then the pile closes.
      if (st && r() < 0.3) { const k = r() < 0.5 ? 0 : 1; ctx.RdyPlay.pile(k); piles++;
        const sh = el('sheet').innerHTML, P = st.players[k], txt = sh.replace(/<[^>]+>/g, ' ');
        if (!/class="sheet"/.test(sh) || /undefined|NaN|\[object/.test(txt) || (P.discard.length ? !/class="tiles pile"/.test(sh) : !/No cards yet/.test(sh))) { bad++; console.log('PILE', g, k, txt.slice(0, 200)); }
        const c = sh.match(/RdyPlay\.card\('c',(\d+),(\d)\)/);
        if (c) { ctx.RdyPlay.card('c', +c[1], +c[2]); if (!/>Back</.test(el('sheet').innerHTML)) { bad++; console.log('PILE CARD NO BACK'); } ctx.RdyPlay.shut(); if (!/class="tiles pile"/.test(el('sheet').innerHTML)) { bad++; console.log('BACK NOT TO PILE'); } }
        ctx.RdyPlay.shut(); if (el('sheet').innerHTML) { bad++; console.log('PILE NOT CLOSED'); } }
      // A search shows every distinct card in your deck.
      if (st && st.pending && st.pending.ask && st.pending.ask.kind === 'search' && st.cur === 0) { searches++;
        const want = new Set(st.players[0].deck.map(y => y.card.name)).size, got = ((h.split('class="tiles pile deck">')[1] || '').split('</div>')[0].match(/class="hc( off)?( on)?"/g) || []).length;
        if (want !== got) { bad++; console.log('SEARCH VIEW', g, 'distinct', want, 'tiles', got); } }
    }
    if (/class="result"/.test(h)) { const t = h.match(/<div class="q">([^<]*)/)[1]; if (/You win/.test(t)) out.win++; else if (/opponent wins/.test(t)) out.lose++; else out.pressure++; if (process.env.V) console.log(g, mode, level, t); break; }
    if (/RdyPlay\.go\(\)/.test(h)) { ctx.RdyPlay.go(); run(); continue; }
    if (/RdyPlay\.su\(/.test(h)) { // setup: an Active, then some of the other Basics on the Bench, then start
      const su = [...h.matchAll(/RdyPlay\.su\((\d+)\)/g)].map(m => +m[1]);
      if (!/RdyPlay\.sgo\(\)/.test(h)) { ctx.RdyPlay.su(su[Math.floor(r() * su.length)]); continue; }
      [...h.matchAll(/RdyPlay\.sb\((\d+)\)/g)].forEach(m => { if (r() < 0.6) ctx.RdyPlay.sb(+m[1]); });
      ctx.RdyPlay.sgo(); run(); setups++; continue;
    }
    if (/RdyPlay\.tog\(/.test(h)) { // several cards at once: tap one or two, then take them (or take nothing)
      const un = t => t.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
      const chips = [...h.matchAll(/RdyPlay\.tog\(&quot;(.*?)&quot;\)/g)].map(m => JSON.parse('"' + un(m[1]) + '"'));
      let h2 = h, take = null; multi++;
      for (let j = 0; j < 60 && !take; j++) { ctx.RdyPlay.tog(chips[Math.floor(r() * chips.length)]); h2 = el('app').innerHTML; if (j >= 1 || r() < 0.5) take = h2.match(/RdyPlay\.do\((\d+)\)">(?:Take|Discard) [^n]/); }
      take = take || h2.match(/RdyPlay\.do\((\d+)\)">/);
      if (!take) { console.log('NO TAKE', g, h2.slice(0, 300)); bad++; break; }
      ctx.RdyPlay.do(+take[1]); run(); continue;
    }
    // 3.4.10: a button naming one of two same-name Pokémon by its spot also shows that Pokémon's Energy (and Tool).
    for (const m of h.matchAll(/RdyPlay\.do\(\d+\)">([^<]*\((?:Active|Bench \d+)\)[^<]*)(.*?)<\/button>/g)) { twins++; if (!/class="tw"/.test(m[2])) { bad++; console.log('TWIN NO TAG', g, m[1]); } }
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
bad += ownBad;
console.log(`games ${N}: you won ${out.win}, opponent won ${out.lose}, five-turn results ${out.pressure}, problems ${bad}, multi-pick screens ${multi}, setups by hand ${setups}, card sheets ${sheets}, discard piles ${piles}, deck searches ${searches}, matching-Pokémon buttons ${twins}`);
if (process.env.LABELS) console.log([...labels].sort().join('\n'));
