// A tournament list as RdyDeck saves it: each card read the way the app reads it (TCGEnrich.enrichCard), then the
// fields js/core.js keeps on a saved card (applyEnrich, from "c.supertype = e.supertype" on). For opponent/test/own.mjs and page.mjs.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const TE = require('../../js/tcg-enrich.js');
const C = await import('./cards.mjs');
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
const cache = JSON.parse(gunzipSync(readFileSync(new URL('../../tests/grade-cards.json.gz', import.meta.url))).toString());
const raw = new Map();
for (const v of Object.values(cache)) {
  if (v.s !== 200 || !v.b) continue;
  let d; try { d = JSON.parse(v.b).data; } catch (_) { continue; }
  for (const c of [].concat(d || [])) if (c && c.supertype) { const k = C.normName(c.name); if (!raw.has(k) || (c.attacks || c.rules || c.abilities)) raw.set(k, c); }
}
// The fields js/core.js keeps on a saved card after a read (applyEnrich, "c.supertype = e.supertype" onward).
export function saved(name, count) {
  const e = TE.enrichCard(raw.get(name));
  const st = (e.subtypes || []).map(s => String(s).toLowerCase());
  return { name, count, supertype: e.supertype, hp: e.hp, stage: e.stage, evolvesFrom: e.from, prizeValue: e.p, types: e.types, weak: e.weak,
    retreat: e.retreat != null ? e.retreat : undefined, ace: e.ace, abilities: e.abilities || [],
    ttype: e.t === 'trainer' ? (st.includes('supporter') ? 'supporter' : st.includes('stadium') ? 'stadium' : st.some(s => /tool/.test(s)) ? 'tool' : 'item') : undefined,
    atext: e.atext && e.atext.length ? e.atext : undefined, rtext: e.rtext || undefined, etext: e.etext || undefined, sub: st.length ? st : undefined, tx: 1,
    attacks: (e.attacks || []).map(a => ({ name: a.name, cost: a.cost, dmg: a.dmg, pd: a.damage && a.damage.raw ? a.damage.raw : undefined, text: a.text || '' })) };
}

/** Every tournament list in tests/grade-lists.json that comes to 60 cards, as saved decks. */
export function savedDecks() {
  const grade = JSON.parse(readFileSync(new URL('../../tests/grade-lists.json', import.meta.url), 'utf8'));
  return grade.map((l, i) => ({ id: 'd' + i, name: l.deckName || l.deck, cards: l.cards.map(c => saved(C.normName(c.name), c.count)).filter(c => c.supertype) }))
    .filter(d => d.cards.reduce((a, c) => a + c.count, 0) === 60);
}
