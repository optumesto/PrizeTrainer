// Refreshes data.json for RdyDeck (the repo and site keep the PrizeTrainer name so installs keep working). Run weekly by .github/workflows/refresh-data.yml.
//
// What it reads, and how politely:
// - Limitless play API (play.limitlesstcg.com/api), no key needed. One tournament list,
//   then details and standings for at most 5 events: about 11 requests a week.
//   Its docs say rate limits apply without publishing numbers, so requests run one at
//   a time with a pause, and a 429 answer stops the run instead of retrying hard.
// - TCGdex (api.tcgdex.net), no key needed, MIT licensed. One set list, then at most
//   8 set details, to learn the codes of new sets.
//
// What it changes: the current meta, the starter decks and the set codes in data.json, and
// builder.json (what each deck's top quarter of lists runs, for the deck builder). No extra requests:
// builder.json comes from the same standings.
// Rotation is left exactly as it is, because Pokemon announces it in a news post,
// not in any data feed. Edit the rotation block by hand when that happens.
//
// Safety: every part is checked the same way the app checks it. A part that comes
// back empty or broken keeps last week's copy. The file is only written when
// something real changed, so a quiet week makes no commit.
import { readFile, writeFile } from 'node:fs/promises';
import { usage, limitlessCards } from './builder-data.mjs';

const FILE = process.argv[2] || 'data.json';
const BUILDER = process.argv[3] || 'builder.json';   // what winning lists run, for the deck builder
const UA = 'RdyDeck-data-refresh/1.0 (+https://optumesto.github.io/PrizeTrainer/)';
const LIMITLESS = 'https://play.limitlesstcg.com/api';
const TCGDEX = 'https://api.tcgdex.net/v2/en';
const DAY = 86400000;
const WINDOW_DAYS = 14;     // events from the last two weeks
const MIN_PLAYERS = 64;     // big enough to mean something
const MAX_EVENTS = 5;
const STARTERS = 6;
const META_TOP = 12;

const sleep = ms => new Promise(r => setTimeout(r, ms));
let calls = 0;
async function getJSON(url) {
  if (calls++ > 40) throw new Error('request budget used up');
  if (!process.env.PT_NO_PAUSE) await sleep(1500);
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (r.status === 429) throw new Error('rate limited by ' + new URL(url).host + ', stopping for this week');
  if (!r.ok) return null;
  return r.json();
}

const clean = (v, max) => String(v == null ? '' : v).replace(/[<>`\u0000-\u001f]/g, '').replace(/[\u2013\u2014]/g, '-').trim().slice(0, max);
const nice = d => `${d.getUTCDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th','st','nd','rd'][n % 10] || 'th');

/** A Limitless decklist object as deck list text the app reads, or null when it is not 60 cards. */
function listText(dl) {
  if (!dl || typeof dl !== 'object') return null;
  const parts = [];
  let total = 0;
  for (const [key, label] of [['pokemon', 'Pokémon'], ['trainer', 'Trainer'], ['energy', 'Energy']]) {
    const cards = Array.isArray(dl[key]) ? dl[key] : [];
    if (!cards.length) continue;
    const lines = [];
    let n = 0;
    for (const c of cards) {
      const count = Number(c && c.count);
      const name = clean(c && c.name, 60);
      if (!Number.isInteger(count) || count < 1 || count > 60 || !name) return null;
      const set = /^[A-Za-z0-9]{2,5}$/.test(String(c.set || '')) ? String(c.set).toUpperCase() : '';
      const num = /^[A-Za-z0-9]{1,8}$/.test(String(c.number || '')) ? String(c.number) : '';
      lines.push([count, name, set, set && num].filter(Boolean).join(' '));
      n += count;
    }
    parts.push(`${label}: ${n}\n${lines.join('\n')}`);
    total += n;
  }
  return total === 60 ? parts.join('\n\n') : null;
}

async function limitless() {
  const now = Date.now();
  const all = await getJSON(`${LIMITLESS}/tournaments?game=PTCG&format=STANDARD&limit=50`);
  if (!Array.isArray(all)) return null;
  const recent = all.filter(t => {
    const d = Date.parse(t && t.date);
    return d && d < now - DAY && d > now - WINDOW_DAYS * DAY && Number(t.players) >= MIN_PLAYERS;
  }).sort((a, b) => b.players - a.players);

  const events = [];
  let tried = 0;
  for (const t of recent) {
    if (events.length >= MAX_EVENTS || ++tried > 8) break;
    const det = await getJSON(`${LIMITLESS}/tournaments/${encodeURIComponent(t.id)}/details`);
    if (!det || det.decklists !== true || det.format !== 'STANDARD') continue;
    const standings = await getJSON(`${LIMITLESS}/tournaments/${encodeURIComponent(t.id)}/standings`);
    if (!Array.isArray(standings) || !standings.length) continue;
    events.push({ t, standings });
  }
  if (!events.length) return null;

  // Meta share: how often each archetype was played across these events.
  const count = new Map();
  let players = 0;
  for (const { standings } of events) {
    for (const s of standings) {
      const name = clean(s && s.deck && s.deck.name, 50);
      if (!name) continue;
      players++;
      count.set(name, (count.get(name) || 0) + 1);
    }
  }
  const metaDecks = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, META_TOP)
    .map(([name, n]) => ({ name, share: Math.round(n / players * 1000) / 10 }));

  // Starters: the best finish for each of the most played archetypes.
  const starters = [];
  for (const m of metaDecks) {
    if (starters.length >= STARTERS) break;
    let best = null;
    for (const { t, standings } of events) {
      for (const s of standings) {
        if (clean(s && s.deck && s.deck.name, 50) !== m.name || !Number.isInteger(s.placing)) continue;
        const list = listText(s.decklist);
        if (!list) continue;
        if (!best || s.placing < best.s.placing || (s.placing === best.s.placing && t.players > best.t.players)) best = { s, t, list };
      }
    }
    if (!best) continue;
    const slug = clean(best.s.deck.id, 40).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'deck';
    if (starters.some(x => x.id === slug)) continue;
    starters.push({
      id: slug,
      name: m.name,
      by: clean(best.s.name, 60) || 'Unknown player',
      place: ordinal(best.s.placing),
      event: clean(`${best.t.name} (${best.t.players} players, online)`, 80),
      date: nice(new Date(best.t.date)),
      list: best.list,
    });
  }
  // The deck builder: each deck's lists that finished in the top quarter of an event (at least the top 16).
  const top = [];
  for (const { t, standings } of events) {
    const cut = Math.max(16, Math.floor(standings.length / 4));
    for (const s of standings) {
      const place = Number(s && s.placing);
      if (!Number.isInteger(place) || place < 1 || place > cut || !s.deck) continue;
      const cards = limitlessCards(s.decklist);
      if (cards) top.push({ deck: s.deck.id, deckName: s.deck.name, place, cards });
    }
  }
  const days = events.map(e => new Date(e.t.date)).sort((a, b) => a - b);
  const builder = top.length >= 40 ? usage(top, `Limitless online tournaments, top quarter of ${events.length} events, ${nice(days[0])} to ${nice(days[days.length - 1])}`) : null;

  return {
    builder: builder && builder.decks.length >= 5 ? builder : null,
    meta: metaDecks.length >= 3 ? {
      asOf: new Date().toISOString().slice(0, 10),
      from: clean(`Limitless online tournaments, ${events.length} events and ${players} players in the last ${WINDOW_DAYS} days`, 100),
      src: 'https://play.limitlesstcg.com/decks?game=PTCG',
      decks: metaDecks,
    } : null,
    starters: starters.length >= 3 ? starters : null,
  };
}

async function tcgdexSets() {
  const list = await getJSON(`${TCGDEX}/sets`);
  if (!Array.isArray(list)) return null;
  // Newest first: Mega Evolution sets, then Scarlet and Violet, by set number.
  // Ids like sv03.5 and me02.5a (a letter after the number) both count.
  const rank = id => { const m = String(id).match(/^(me|sv)(\d+)(?:\.(\d)([a-z])?|([a-z]))?$/); return m ? (m[1] === 'me' ? 1000 : 0) + parseInt(m[2], 10) * 10 + (m[3] ? 5 : 0) + (m[4] || m[5] ? 1 : 0) : -1; };
  const recent = list.filter(s => s && rank(s.id) >= 0).sort((a, b) => rank(b.id) - rank(a.id)).slice(0, 10);
  const sets = {};
  for (const s of recent) {
    const d = await getJSON(`${TCGDEX}/sets/${encodeURIComponent(s.id)}`);
    const code = d && d.abbreviation && String(d.abbreviation.official || '').toUpperCase();
    if (code && /^[A-Z0-9]{2,5}$/.test(code) && /^[a-z0-9.]{2,12}$/.test(String(d.id))) sets[code] = d.id;
  }
  return Object.keys(sets).length ? sets : null;
}

const strip = d => JSON.stringify({ ...d, asOf: null, meta: d.meta ? { ...d.meta, asOf: null } : null });

const old = JSON.parse(await readFile(FILE, 'utf8'));
if (old.schema !== 1) throw new Error('data.json has an unknown schema, not touching it');
const next = structuredClone(old);
const notes = [];

try {
  const l = await limitless();
  if (l && l.meta) { next.meta = l.meta; notes.push(`meta: ${l.meta.decks.length} decks`); } else notes.push('meta: kept last copy');
  if (l && l.starters) { next.starters = l.starters; notes.push(`starters: ${l.starters.length}`); } else notes.push('starters: kept last copy');
  if (l && l.builder) { await writeFile(BUILDER, JSON.stringify(l.builder).replace(/\],\[/g, '],\n[') + '\n'); notes.push(`builder: ${l.builder.decks.length} decks from ${l.builder.lists} lists`); } else notes.push('builder: kept last copy');
} catch (e) { notes.push('Limitless: ' + e.message + ', kept last copy'); }

try {
  const s = await tcgdexSets();
  if (s) { next.sets = { ...(old.sets || {}), ...s }; notes.push(`sets: ${Object.keys(s).join(', ')}`); } else notes.push('sets: kept last copy');
} catch (e) { notes.push('TCGdex: ' + e.message + ', kept last copy'); }

console.log(notes.join('\n'));
if (strip(next) === strip(old)) {
  console.log('Nothing changed this week.');
} else {
  next.asOf = new Date().toISOString().slice(0, 10);
  await writeFile(FILE, JSON.stringify(next, null, 2) + '\n');
  console.log('data.json updated, as of ' + next.asOf);
}
