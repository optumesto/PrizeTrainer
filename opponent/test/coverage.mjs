// Which cards in the meta lists still have parts a full game can't read, most-played first.
// node opponent/test/coverage.mjs [limit]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('../../puzzle/engine.js'); const G = require('../game.js'); require('../effects.js');
const C = await import('./cards.mjs');
const L = C.lists();
const uses = new Map();
for (const l of L) for (const c of new Set(l.cards)) uses.set(c, (uses.get(c) || 0) + 1);
const s = G.newGame([L[0].cards, L[1].cards], { seed: 1 });
E.internals.setReal(true);
const out = []; let clean = 0;
for (const [c, n] of uses) {
  const bad = E.cardProblems(s, { card: c, uid: -1 }, true);
  if (c.cat === 'pokemon') (c.attacks || []).forEach(a => { const R = E.readAttack(a); if (R && R.partial) bad.push(c.name + ': ' + a.name + ' (part: ' + R.partial.join(' / ') + ')'); });
  if (bad.length) out.push([n, [...new Set(bad)].join('; ')]); else clean++;
}
out.sort((a, b) => b[0] - a[0]);
const lim = +process.argv[2] || 60;
out.slice(0, lim).forEach(x => console.log(String(x[0]).padStart(3), x[1].slice(0, 240)));
const listsClean = L.filter(l => [...new Set(l.cards)].every(c => !out.some(o => o[1].startsWith(c.name)))).length;
console.log(`\n${clean} of ${uses.size} unique cards read fully; ${out.length} not. Lists with every card read: ${listsClean} of ${L.length}.`);
