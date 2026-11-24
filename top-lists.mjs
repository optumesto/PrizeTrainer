// Builds top-lists.json for RdyDeck: for each deck archetype, the one tournament list with the best
// result, so the app can load it, grade it and add it to Your Decks in one tap (3.6.0, Mason, 24 Nov
// 2026: "the one that has the best tourney results"). Run weekly by .github/workflows/refresh-data.yml,
// right after refresh-matchups.mjs, from the same window and the same events.
//
// Which list is best, the same way every week:
//   1. Lists from events since the newest set came out come first, when the deck has any in the top 16.
//      Older ones are used only for a deck with no top 16 finish since then.
//   2. The highest finish wins (1st before 2nd).
//   3. A tie goes to the bigger event, then the newer one, then the event id, so the pick never wobbles.
//   Online and local in-person events count the same (Mason, 24 Nov 2026: weigh both).
//   The list must be 60 cards, every card Standard legal today (cards.json), at most 4 of a card
//   (Basic Energy aside) and at most 1 ACE SPEC. A list that fails goes to the next best.
//
// How it reads, and how politely: refresh-matchups.mjs keeps every event's top 16 finishes per deck
// in .github/matchups-cache.json, as list codes only. This script works out each deck's best finish
// from that, then reads the standings of just those events (one request each, which holds every list
// in the event) and keeps each deck's best placed list per event in .github/top-lists-cache.json, so
// an event is read once. At most MAX_CALLS requests a run, PT_PAUSE_MS apart (the weekly run uses
// 30 seconds, about 30 requests per 15 minutes), and a 429 answer stops the run. A deck whose list is
// not read yet keeps last week's pick until it is.
import { readFile, writeFile } from 'node:fs/promises';

const OUT = process.argv[2] || 'top-lists.json';
const CACHE = process.argv[3] || '.github/top-lists-cache.json';
const MCACHE = process.argv[4] || '.github/matchups-cache.json';
const MATCHUPS = process.argv[5] || 'matchups.json';
const CARDS = process.argv[6] || 'cards.json';
const UA = 'RdyDeck-data-refresh/1.0 (+https://rdydeck.com/)';
const LIMITLESS = process.env.PT_LIMITLESS || 'https://play.limitlesstcg.com/api';
const MAX_CALLS = Number(process.env.PT_TOP_CALLS) > 0 ? Number(process.env.PT_TOP_CALLS) : 40;
const PAUSE = Number(process.env.PT_PAUSE_MS) > 0 ? Number(process.env.PT_PAUSE_MS) : 3000;
const TOP_PLACE = 16;
const TRY = 3;          // candidates per deck looked at before giving up for this run

const sleep = ms => new Promise(r => setTimeout(r, ms));
let calls = 0;
async function getJSON(url) {
  if (calls >= MAX_CALLS) throw new Error('request budget used up');
  calls++;
  if (!process.env.PT_NO_PAUSE) await sleep(PAUSE);
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
  if (r.status === 429) throw new Error('rate limited by ' + new URL(url).host + ', stopping for this week');
  if (!r.ok) return null;
  return r.json();
}
const clean = (v, max) => String(v == null ? '' : v).replace(/[<>`\u0000-\u001f]/g, '').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().slice(0, max);
const slug = v => clean(v, 60).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
const readJSON = async (f, fb) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch (_) { return fb; } };
const BASIC_E = /^(?:basic\s+)?(grass|fire|water|lightning|psychic|fighting|darkness|metal)\s+energy$/i;
const nameKey = n => { const m = String(n).match(BASIC_E); return m ? m[1].toLowerCase() + ' energy' : clean(n, 60).toLowerCase(); };

/** A Limitless decklist as list text the app reads, or null when it is not 60 cards. */
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

const now = Date.now();
const mcache = await readJSON(MCACHE, { events: [] });
const mu = await readJSON(MATCHUPS, null);
const cardsFile = await readJSON(CARDS, { cards: [] });
const cache = await readJSON(CACHE, { schema: 1, events: {} });
const old = await readJSON(OUT, null);
if (!mu || !Array.isArray(mu.decks)) { console.log('top lists: no matchups.json, nothing done'); process.exit(0); }

// Standard legal names today, and the ACE SPEC ones.
const legal = new Set(), ace = new Set();
for (const c of cardsFile.cards || []) {
  if (!c || !c.n) continue;
  legal.add(nameKey(c.n));
  if (c.ace) ace.add(nameKey(c.n));
}
/** Why a list cannot be used, or '' when it can. */
function problem(text) {
  if (!legal.size) return 'no card list';
  const count = new Map();
  let total = 0;
  for (const line of text.split('\n')) {
    const m = /^(\d+) (.+?)(?: [A-Z0-9]{2,5} [A-Za-z0-9]{1,8})?$/.exec(line);
    if (!m) continue;
    const k = nameKey(m[2]), n = Number(m[1]);
    total += n;
    count.set(k, (count.get(k) || 0) + n);
  }
  if (total !== 60) return `${total} cards`;
  let aces = 0;
  for (const [k, n] of count) {
    if (!legal.has(k)) return `${k} is not Standard legal`;
    if (n > 4 && !/ energy$/.test(k)) return `${n} copies of ${k}`;
    if (n > 4 && / energy$/.test(k) && !BASIC_E.test(k)) return `${n} copies of ${k}`;
    if (ace.has(k)) aces += n;
  }
  return aces > 1 ? `${aces} ACE SPEC cards` : '';
}

const since = mu.since || '';
const newest = (mu.cur && mu.cur.since) || '';
const events = (mcache.events || []).filter(e => e && !e.skip && e.decks && e.date >= since);
const evById = new Map(events.map(e => [e.id, e]));
// Drop cached events that left the window.
for (const id of Object.keys(cache.events || {})) if (!evById.has(id)) delete cache.events[id];
cache.events = cache.events || {};

/** Each deck's candidates, best first. */
function candidates(id) {
  const out = [];
  for (const e of events) {
    const d = e.decks[id];
    if (!d || !Array.isArray(d.tops) || !d.tops.length) continue;
    const place = Math.min(...d.tops.map(t => Number(t[1])).filter(Number.isFinite));
    if (!(place >= 1 && place <= TOP_PLACE)) continue;
    out.push({ e, place, cur: !!(newest && e.date >= newest) });
  }
  return out.sort((a, b) => (b.cur - a.cur) || (a.place - b.place) || ((b.e.players || 0) - (a.e.players || 0)) || b.e.date.localeCompare(a.e.date) || a.e.id.localeCompare(b.e.id));
}

const ids = mu.decks.map(d => d.id).filter(id => id && id !== 'other');
const names = Object.fromEntries(mu.decks.map(d => [d.id, d.name]));
/** Pick each deck's list from what is read. want: events still to read, in order of need. */
function pick() {
  const out = {}, want = [];
  for (const id of ids) {
    let tried = 0;
    for (const c of candidates(id)) {
      if (tried >= TRY) break;
      const ev = cache.events[c.e.id];
      if (!ev) { if (!want.includes(c.e.id)) want.push(c.e.id); tried++; break; }
      const got = ev.decks && ev.decks[id];
      tried++;
      if (!got || got[0] !== c.place) continue;
      const why = problem(got[2]);
      if (why) { console.log(`top lists: ${id} ${c.e.id} skipped, ${why}`); continue; }
      out[id] = {
        name: names[id], list: got[2], by: got[1], place: c.place, players: c.e.players || 0,
        event: clean(c.e.name, 80), date: c.e.date, src: c.e.src || 'online', tid: c.e.id,
      };
      break;
    }
  }
  return { out, want };
}

let { out, want } = pick();
const notes = [];
let read = 0;
if (!process.env.PT_OFFLINE && want.length) try {
  // Read until nothing more is needed or the budget is spent; a read can open the next candidate.
  for (let round = 0; round < 4 && want.length; round++) {
    for (const tid of want) {
      if (cache.events[tid]) continue;
      const standings = await getJSON(`${LIMITLESS}/tournaments/${encodeURIComponent(tid)}/standings`);
      read++;
      const decks = {};
      if (Array.isArray(standings)) for (const s of standings) {
        const id = slug(s && s.deck && s.deck.id), place = Number(s && s.placing);
        if (!id || !Number.isInteger(place) || place < 1 || place > TOP_PLACE) continue;
        if (decks[id] && decks[id][0] <= place) continue;
        const text = listText(s.decklist);
        if (text) decks[id] = [place, clean(s.name, 60) || 'Unknown player', text];
      }
      cache.events[tid] = { date: evById.get(tid).date, decks };
    }
    ({ out, want } = pick());
  }
} catch (e) { notes.push('Limitless: ' + e.message); }

// A deck not settled this run keeps last week's pick while that list's event is still in the window.
let kept = 0;
for (const id of ids) {
  if (out[id] || !old || !old.decks || !old.decks[id]) continue;
  const o = old.decks[id];
  if (o.tid && evById.has(o.tid) && !problem(o.list)) { out[id] = o; kept++; }
}
const next = {
  schema: 1,
  asOf: new Date(now).toISOString().slice(0, 10),
  since, newest,
  note: 'The best tournament list per deck, for RdyDeck quick add. Built weekly by top-lists.mjs from Limitless online and local in-person tournaments: lists since the newest set first, then the best finish, then the bigger event, then the newer one. Every list is 60 cards and Standard legal.',
  decks: out,
};
notes.push(`top lists: ${Object.keys(out).length} of ${ids.length} decks, ${read} events read (${calls} requests), ${want.length} still to read, ${kept} kept from last week`);
await writeFile(CACHE, JSON.stringify(cache) + '\n');
const strip = d => JSON.stringify(d ? { ...d, asOf: null } : null);
if (Object.keys(out).length && strip(next) !== strip(old)) {
  await writeFile(OUT, JSON.stringify(next, null, 1) + '\n');
  notes.push('top-lists.json updated');
} else notes.push('top-lists.json: no change');
console.log(notes.join('\n'));
