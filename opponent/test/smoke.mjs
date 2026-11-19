// Plays many random games between meta lists and reports crashes, stuck states and how games end.
// node opponent/test/smoke.mjs [games]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../game.js'); require('../effects.js');
const C = await import('./cards.mjs');
const L = C.lists();
const N = +process.argv[2] || 200;
const end = {}; let crash = 0, stuck = 0, steps = 0, t0 = Date.now(); const errs = new Map();
for (let g = 0; g < N; g++) {
  const rnd = G.rngFrom(1000 + g), a = L[g % L.length], b = L[(g * 7 + 3) % L.length];
  let s;
  try {
    s = G.newGame([a.cards, b.cards], { seed: g });
    for (const k of [0, 1]) { const ch = G.setupChoices(s, k); s = G.setUp(s, k, ch[0].uid, ch.slice(1, 1 + Math.floor(rnd() * ch.length)).map(x => x.uid)); }
    let n = 0;
    while (G.winner(s) < 0 && n < 4000) {
      const X = G.next(s); if (!X.actions.length) { stuck++; if (process.env.DBG) { console.log("FLAGS", JSON.stringify({ended:s.ended,go:s.gameOver,pro:s.promote,cur:s.cur,mods:s.mods,act:s.players.map(p=>p.active&&p.active.id),bench:s.players.map(p=>p.bench.length)})); console.log(JSON.stringify(s.pending, (k, v) => k === "card" ? v.name : v).slice(0, 1500)); console.log(s.log.slice(-8).join("\n")); } errs.set('stuck ' + JSON.stringify(s.pending && s.pending.ask || s.phase).slice(0, 120), (errs.get('stuck') || 0) + 1); break; }
      const atk = X.actions.filter(x => x.t === 'attack');
      const act = atk.length && rnd() < 0.6 ? atk[Math.floor(rnd() * atk.length)] : X.actions[Math.floor(rnd() * X.actions.length)];
      s = G.step(s, act); n++;
    }
    steps += n;
    const w = G.winner(s); const why = s.endWhy || (n >= 4000 ? 'cap' : 'other'); end[w + ':' + why] = (end[w + ':' + why] || 0) + 1;
  } catch (e) { crash++; const k = (e.stack || String(e)).split('\n').slice(0, 3).join(' | ').slice(0, 300); errs.set(k, (errs.get(k) || 0) + 1); }
}
console.log({ games: N, crash, stuck, end, avgSteps: Math.round(steps / N), ms: Date.now() - t0 });
[...errs].sort((x, y) => y[1] - x[1]).slice(0, 12).forEach(([k, v]) => console.log(v, k));
