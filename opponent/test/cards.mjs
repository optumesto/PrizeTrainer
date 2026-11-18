// Card records for the opponent tests: the pokemontcg.io responses saved in tests/grade-cards.json.gz
// and the tournament lists in tests/grade-lists.json. Nothing here goes online.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const E = require('../../puzzle/engine.js');
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const TYPES = { G: 'Grass', R: 'Fire', W: 'Water', L: 'Lightning', P: 'Psychic', F: 'Fighting', D: 'Darkness', M: 'Metal' };
export const normName = n => String(n).replace(/[‘’]/g, "'").replace(/^Basic \{(\w)\} Energy$/, (_, t) => TYPES[t] + ' Energy').trim();

const cache = JSON.parse(gunzipSync(readFileSync(join(root, 'tests', 'grade-cards.json.gz'))).toString());
const byName = new Map();
for (const v of Object.values(cache)) {
  if (v.s !== 200 || !v.b) continue;
  let d; try { d = JSON.parse(v.b).data; } catch (_) { continue; }
  for (const c of [].concat(d || [])) if (c && c.supertype) { const k = normName(c.name); if (!byName.has(k) || (c.attacks || c.rules || c.abilities)) byName.set(k, c); }
}
const engineCards = new Map();
export function card(name) {
  const k = normName(name);
  if (engineCards.has(k)) return engineCards.get(k);
  const r = byName.get(k);
  if (!r) return null;
  const c = E.cardFromApi(r, { base: n => { const s1 = byName.get(normName(n)); return s1 ? s1.evolvesFrom : null; } });
  c.key = k;
  engineCards.set(k, c);
  return c;
}
/** Tournament lists as arrays of 60 engine cards. */
export function lists() {
  const L = JSON.parse(readFileSync(join(root, 'tests', 'grade-lists.json'), 'utf8'));
  const out = [];
  for (const l of L) {
    const cards = []; let ok = true;
    for (const e of l.cards) { const c = card(e.name); if (!c) { ok = false; break; } for (let i = 0; i < e.count; i++) cards.push(c); }
    if (ok && cards.length === 60) out.push({ deck: l.deck, name: l.deckName, place: l.place, event: l.event, cards });
  }
  return out;
}
