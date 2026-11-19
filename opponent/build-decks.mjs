// Writes opponent/decks.js: one tournament list per meta deck (its best finish), as engine card
// records, for the hidden play page (opponent/play.html). Built from the saved test data only.
// node opponent/build-decks.mjs
import { writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { lists, normName } from './test/cards.mjs';
const L = lists();
// Each card's printing in the lists (Limitless set code and number), so Sparring can show the card's picture.
const prints = new Map();
for (const l of JSON.parse(readFileSync(new URL('../tests/grade-lists.json', import.meta.url), 'utf8'))) for (const c of l.cards) { const k = normName(c.name); if (!prints.has(k) && c.set && c.number) prints.set(k, [c.set, String(c.number)]); }
const withPrint = c => { const p = prints.get(c.key); return p ? Object.assign({}, c, { set: p[0], num: p[1] }) : c; };
const by = new Map();
for (const l of L) { const k = l.deck || l.name; const cur = by.get(k); if (!cur) by.set(k, { n: 1, best: l }); else { cur.n++; if ((l.place || 999) < (cur.best.place || 999)) cur.best = l; } }
const pick = [...by.values()].sort((a, b) => b.n - a.n).slice(0, 20).map(x => x.best);
const cards = {}, decks = [];
// Every card of every meta list, so a saved deck (opponent/own.js) plays meta cards from the full records.
for (const l of L) l.cards.forEach(c => { cards[c.key] = withPrint(c); });
for (const l of pick) {
  const counts = new Map();
  l.cards.forEach(c => { cards[c.key] = withPrint(c); counts.set(c.key, (counts.get(c.key) || 0) + 1); });
  decks.push({ name: l.name || l.deck, event: l.event || '', place: l.place || null, list: [...counts].map(([k, n]) => [k, n]) });
}
const out = `// Built by opponent/build-decks.mjs. Meta tournament lists for Sparring, and every card of the meta lists.\nwindow.RdyOppDecks = ${JSON.stringify({ cards, decks })};\n`;
writeFileSync(new URL('./decks.js', import.meta.url), out);
console.log(decks.length, 'decks,', Object.keys(cards).length, 'cards,', Math.round(out.length / 1024), 'KB');
decks.forEach(d => console.log(' ', d.name, d.place, d.event));
