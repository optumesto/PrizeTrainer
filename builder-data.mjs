// What winning lists run, for RdyDeck's deck builder (builder.json).
//
// refresh-data.mjs calls usage() every week with the lists it reads from Limitless: each deck's
// lists that finished in the top quarter of an event (at least the top 16). For each deck it keeps
// every card that at least 1 list in 10 runs, how many of its lists run it and how many copies they
// run, so the builder can show a deck's core, its flex cards and the usual counts.
//
// It can also run on its own from a saved file of lists:
//   node builder-data.mjs <lists.json> [builder.json]
// lists.json: [{ deck, deckName, place, cards: [{ part, count, name, set, number }] }]

const clean = (v, max) => String(v == null ? '' : v).replace(/[<>`\u0000-\u001f]/g, '').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().slice(0, max);
const BASIC_E = /^(?:basic\s+)?(grass|fire|water|lightning|psychic|fighting|darkness|metal)\s+energy$/i;
/** One card per name for counting: "Fire Energy" and "Basic Fire Energy" are the same card. */
const keyOf = name => { const m = String(name).match(BASIC_E); return m ? 'basic ' + m[1].toLowerCase() + ' energy' : String(name).toLowerCase(); };
const PART = { pokemon: 'P', trainer: 'T', energy: 'E' };
const MIN_LISTS = 3;     // a deck needs this many good finishes to get a page
const MIN_RATE = 0.1;    // cards fewer lists than this run are left out
const r2 = x => Math.round(x * 100) / 100;

/** Card usage across a set of 60 card lists. */
function tally(lists) {
  const by = new Map();
  for (const l of lists) {
    const seen = new Map();
    for (const c of l.cards) {
      const k = keyOf(c.name);
      const s = seen.get(k) || { n: 0, c };
      s.n += c.count; seen.set(k, s);
    }
    for (const [k, { n, c }] of seen) {
      const t = by.get(k) || { name: c.name, part: c.part, lists: 0, copies: 0, counts: {}, prints: {} };
      t.lists++; t.copies += n;
      t.counts[n] = (t.counts[n] || 0) + 1;
      const pk = `${c.name}|${c.set}|${c.number}`;
      t.prints[pk] = (t.prints[pk] || 0) + n;
      by.set(k, t);
    }
  }
  const out = [];
  for (const t of by.values()) {
    const rate = t.lists / lists.length;
    if (rate < MIN_RATE) continue;
    const [name, set, num] = Object.entries(t.prints).sort((a, b) => b[1] - a[1])[0][0].split('|');
    // The usual count: the count most of the lists that run it use (ties go to the higher count).
    const usual = +Object.entries(t.counts).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
    out.push([name, set, num, PART[t.part] || 'T', usual, r2(t.copies / t.lists), r2(rate)]);
  }
  return out.sort((a, b) => b[6] - a[6] || b[4] - a[4] || a[0].localeCompare(b[0]));
}

/**
 * builder.json from lists. Each deck: id, name, lists, cards: [name, set, number, part (P/T/E),
 * usual count, average count when run, share of lists that run it]. "all" is the same over every
 * list, for decks the meta does not have yet.
 */
export function usage(lists, from) {
  const ok = (lists || []).filter(l => l && Array.isArray(l.cards) && l.cards.reduce((a, c) => a + (c.count || 0), 0) === 60)
    .map(l => ({ ...l, cards: l.cards.filter(c => c && c.name && Number.isInteger(c.count) && c.count > 0).map(c => ({ ...c, name: clean(c.name, 60), set: /^[A-Za-z0-9]{2,5}$/.test(String(c.set || '')) ? String(c.set).toUpperCase() : '', number: /^[A-Za-z0-9]{1,8}$/.test(String(c.number || '')) ? String(c.number) : '' })) }));
  const groups = new Map();
  for (const l of ok) {
    const id = clean(l.deck, 40).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!id || id === 'other') continue;
    const g = groups.get(id) || { id, name: clean(l.deckName, 50) || id, lists: [] };
    g.lists.push(l); groups.set(id, g);
  }
  const decks = [...groups.values()].filter(g => g.lists.length >= MIN_LISTS)
    .sort((a, b) => b.lists.length - a.lists.length)
    .map(g => ({ id: g.id, name: g.name, lists: g.lists.length, cards: tally(g.lists) }));
  return {
    schema: 1,
    asOf: new Date().toISOString().slice(0, 10),
    from: clean(from || `${ok.length} top lists`, 120),
    note: 'What winning lists run, for the RdyDeck deck builder. cards: [name, set, number, part P/T/E, usual count, average count when run, share of lists that run it]. Built by builder-data.mjs.',
    lists: ok.length,
    decks,
    all: tally(ok).filter(c => c[6] >= 0.15),
    // Every Trainer and Energy any of these lists runs: [name, how many lists run it]. The grade counts
    // copies of a Trainer or Special Energy that no winning list runs (index.html, v76).
    played: played(ok),
  };
}

/** [name, lists that run it] for every Trainer and Energy in the lists, most played first. */
function played(lists) {
  const n = new Map();
  for (const l of lists) new Set(l.cards.filter(c => c.part !== 'pokemon').map(c => c.name)).forEach(k => n.set(k, (n.get(k) || 0) + 1));
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** A Limitless standings decklist as { part, count, name, set, number } cards, or null. */
export function limitlessCards(dl) {
  if (!dl || typeof dl !== 'object') return null;
  const out = [];
  for (const part of ['pokemon', 'trainer', 'energy']) {
    for (const c of Array.isArray(dl[part]) ? dl[part] : []) {
      const count = Number(c && c.count);
      if (!Number.isInteger(count) || count < 1 || count > 60 || !c.name) return null;
      out.push({ part, count, name: c.name, set: c.set || '', number: c.number || '' });
    }
  }
  return out.length ? out : null;
}

// Run on its own: node builder-data.mjs lists.json [builder.json]
if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFile, writeFile } = await import('node:fs/promises');
  const lists = JSON.parse(await readFile(process.argv[2], 'utf8'));
  const out = usage(lists, process.env.PT_FROM);
  await writeFile(process.argv[3] || 'builder.json', JSON.stringify(out).replace(/\],\[/g, '],\n[') + '\n');
  console.log(`builder.json: ${out.decks.length} decks from ${out.lists} lists`);
}
