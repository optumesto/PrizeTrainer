// Sparring page fixes from the 3.4.6 test report, played on the page itself (opponent/play.js) with no browser:
// the 5-turn limit (H1), the verdict (H2), a reload bringing the game back (H3), the menu remembering its
// choices, the turn header (M16), the new Active chosen right after a Knock Out (M12) and the full game log.
// node opponent/test/sparring.mjs [games]
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url)), root = join(dir, '..', '..');
const N = +(process.argv[2] || 9);
let pass = 0, fail = 0;
const ok = (cond, what) => { if (cond) pass++; else { fail++; console.log('FAIL ' + what); } };
const disk = {}; // one localStorage for every page load, as in one browser
function page() {
  const els = {}, el = id => els[id] || (els[id] = { id, innerHTML: '', value: '', onclick: null, disabled: false });
  const timers = [];
  const ctx = { console, Math, JSON, Date, Map, Set, WeakMap, Object, Array, String, Number, Error, RegExp, Boolean, Symbol, Promise,
    setTimeout: f => timers.push(f), document: { getElementById: el, addEventListener: (e, f) => { ctx._ready = f; } }, location: { search: '?try' },
    localStorage: { getItem: k => disk[k] == null ? null : disk[k], setItem: (k, v) => { disk[k] = String(v); }, removeItem: k => { delete disk[k]; } } };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['puzzle/text.js', 'puzzle/engine.js', 'opponent/game.js', 'opponent/effects.js', 'opponent/ai.js', 'opponent/decks.js', 'opponent/own.js', 'opponent/play.js'])
    vm.runInContext(readFileSync(join(root, f), 'utf8'), ctx, { filename: f });
  ctx._ready();
  const run = () => { let n = 0; while (timers.length && n++ < 100000) timers.shift()(); };
  run();
  return { ctx, el, run, html: () => el('app').innerHTML, P: ctx.RdyPlay };
}
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const logOf = h => [...(h.split('Full game log')[1] || '').matchAll(/<li>([^<]*)<\/li>/g)].map(m => m[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
const board = h => h.split('<details class="log"')[0];

let rnd = 11; const r = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
/** One press of the page's own buttons, as a player would. False once the game is over. */
function press(pg) {
  const h = pg.html();
  if (/class="result"/.test(h)) return false;
  if (/RdyPlay\.su\(/.test(h)) {
    const su = [...h.matchAll(/RdyPlay\.su\((\d+)\)/g)].map(m => +m[1]);
    if (!/RdyPlay\.sgo\(\)/.test(h)) { pg.P.su(su[Math.floor(r() * su.length)]); return true; }
    [...h.matchAll(/RdyPlay\.sb\((\d+)\)/g)].forEach(m => { if (r() < 0.6) pg.P.sb(+m[1]); });
    pg.P.sgo(); pg.run(); return true;
  }
  if (/RdyPlay\.go\(\)/.test(h)) { pg.P.go(); pg.run(); return true; }
  if (/RdyPlay\.tog\(/.test(h)) { const none = h.match(/RdyPlay\.do\((\d+)\)">(?:Take|Discard) nothing/); const any = h.match(/RdyPlay\.do\((\d+)\)/);
    if (none || any) { pg.P.do(+(none || any)[1]); pg.run(); return true; }
    const chips = [...h.matchAll(/RdyPlay\.tog\(&quot;(.*?)&quot;\)/g)].map(m => m[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
    pg.P.tog(JSON.parse('"' + chips[Math.floor(r() * chips.length)] + '"')); return true; }
  const btn = [...h.matchAll(/RdyPlay\.do\((\d+)\)">([^<]*)</g)].map(m => ({ i: +m[1], l: m[2] }));
  if (!btn.length) return false;
  const atk = btn.filter(b => /primary/.test(h.split(`RdyPlay.do(${b.i})`)[0].slice(-40)));
  const nonEnd = btn.filter(b => !/End your turn/.test(b.l));
  const b = atk.length && r() < 0.7 ? atk[0] : nonEnd.length && r() < 0.8 ? nonEnd[Math.floor(r() * nonEnd.length)] : btn[btn.length - 1];
  pg.P.do(b.i); pg.run(); return true;
}

const levels = ['easy', 'contested', 'aggressive'];
let reloads = 0, short = 0, promoteSeen = 0, verdicts = { win: 0, lose: 0, draw: 0, early: 0 };
for (let g = +(process.env.G0 || 0); g < N; g++) {
  for (const k in disk) delete disk[k];
  let pg = page();
  const D = pg.ctx.RdyOppDecks.decks, a = g % D.length, b = (g * 7 + 3) % D.length, level = levels[g % 3];
  // From the menu, as a player starts a game.
  pg.el('m-a').value = 'm' + a; pg.el('m-b').value = 'm' + b; pg.el('m-level').value = level; pg.el('m-mode').value = '5turn'; pg.el('m-go').onclick(); pg.run();
  ok(/Game setup/.test(pg.html()) && /coin flip/.test(text(pg.html())), `game ${g}: setup says who won the coin flip`);
  let presses = 0, reloadAt = 2 + (g * 5) % 10;
  for (;;) {
    const h = pg.html();
    ok(!/turn 0 of|turn 6 of/.test(text(h)), `game ${g}: header counts turns 1 to 5`);
    if (/Opponent's turn/.test(h) && /Choose Your New Active Pokémon/.test(h)) promoteSeen++;
    if (presses === reloadAt) {
      // A reload: a new page in the same browser shows the same board.
      const before = board(h), log0 = logOf(h);
      pg = page(); reloads++;
      const after = pg.html();
      const same = board(after) === before || (/Opponent is playing/.test(before) && !/RdyPlay\.su\(/.test(after));
      if (!same && process.env.V) { const A = text(before), B = text(board(after)); let i = 0; while (A[i] === B[i]) i++; console.log('BEFORE', A.slice(Math.max(0, i - 300), i + 400)); console.log('AFTER ', B.slice(Math.max(0, i - 300), i + 400)); }
      ok(same, `game ${g}: the board comes back after a reload`);
      ok(logOf(after).slice(0, log0.length).join('\n') === log0.join('\n'), `game ${g}: the log comes back after a reload`);
    }
    if (!press(pg)) { if (presses < reloadAt) short++; if (process.env.V) console.log('end', g, presses); break; }
    if (++presses > 4000) { ok(false, `game ${g}: too long`); if (process.env.V) console.log(text(pg.html()).slice(0, 1500)); break; }
  }
  const h = pg.html(), log = logOf(h), t = text(h);
  ok(/class="result"/.test(h), `game ${g}: ends on the result screen`);
  ok(log.filter(x => /^(You win|Your opponent wins)\.?$/.test(x)).length <= 1, `game ${g}: the log names the winner once`);
  const mine = log.filter(x => /^Your turn \d+$/.test(x)).length, theirs = log.filter(x => /^Your opponent's turn \d+$/.test(x)).length;
  ok(mine <= 5 && theirs <= 5, `game ${g}: at most 5 turns each (you ${mine}, opponent ${theirs})`);
  ok(log[0] === 'You go first' || log[0] === 'Your opponent goes first', `game ${g}: the full log starts at the first line`);
  const timeUp = /on Prize cards|a draw/.test(t);
  if (timeUp) ok(mine === 5 && theirs === 5, `game ${g}: the turn limit comes after 5 turns each (you ${mine}, opponent ${theirs})`);
  const m = t.match(/you took (\d+) Prize cards? and your opponent took (\d+)/);
  if (timeUp) {
    ok(!!m, `game ${g}: the Prize cards each side took are named`);
    const [y, o] = [+m[1], +m[2]], head = t.match(/(You win on Prize cards|Your opponent wins on Prize cards|It's a draw)/)[1];
    ok(head === (y > o ? 'You win on Prize cards' : o > y ? 'Your opponent wins on Prize cards' : "It's a draw"), `game ${g}: verdict ${head} for ${y} to ${o}`);
    verdicts[y > o ? 'win' : o > y ? 'lose' : 'draw']++;
  } else { ok(/You win\.|Your opponent wins\./.test(t), `game ${g}: a game that ends early names its winner`); verdicts.early++; }
  // The menu remembers both decks and the level.
  pg.P.menu();
  ok(pg.el('m-a').value === 'm' + a && pg.el('m-b').value === 'm' + b && pg.el('m-level').value === level, `game ${g}: the menu keeps both decks and the level`);
  ok(!disk.rd_spar_game, `game ${g}: leaving for the menu ends the saved game`);
}
ok(reloads + short === N - +(process.env.G0 || 0) && reloads >= (N - +(process.env.G0 || 0)) / 2, `every game that lasted was reloaded once (${reloads} reloaded, ${short} ended first, of ${N})`);
console.log(`sparring: ${pass} passed, ${fail} failed (verdicts ${JSON.stringify(verdicts)}, new Active chosen under the opponent's turn ${promoteSeen} times)`);
process.exit(fail ? 1 : 0);
