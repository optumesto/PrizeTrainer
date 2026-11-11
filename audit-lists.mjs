// Temporary: reads the top 16 lists of each event the meta job already uses, for a grade audit.
// One standings request per event, 3 seconds apart, stops on a 429. Not part of the app.
import { readFile, writeFile } from 'node:fs/promises';
const [cachePath, out] = process.argv.slice(2);
const cache = JSON.parse(await readFile(cachePath, 'utf8'));
const UA = 'RdyDeck-data-refresh/1.0 (+https://rdydeck.com/)';
const ev = cache.events.filter(e => !e.skip);
const lists = [];
for (const e of ev) {
  await new Promise(r => setTimeout(r, 3000));
  const r = await fetch(`https://play.limitlesstcg.com/api/tournaments/${encodeURIComponent(e.id)}/standings`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  console.log(e.id, r.status);
  if (r.status === 429) break;
  if (!r.ok) continue;
  const st = await r.json();
  for (const s of st) {
    const p = Number(s.placing);
    if (!(p >= 1 && p <= 16) || !s.decklist || !s.deck) continue;
    const cards = [];
    for (const part of ['pokemon', 'trainer', 'energy']) for (const c of s.decklist[part] || []) cards.push({ part, count: c.count, name: c.name, set: c.set || null, number: c.number || null });
    if (cards.reduce((a, c) => a + c.count, 0) !== 60) continue;
    lists.push({ deck: s.deck.id, deckName: s.deck.name, place: p, event: e.name, date: e.date, cards });
  }
}
await writeFile(out, JSON.stringify(lists));
console.log('lists', lists.length);
