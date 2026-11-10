// Builds matchups.json for RdyDeck: how each deck archetype has done against the
// most played decks, from recent Limitless online tournaments. Run weekly by
// .github/workflows/refresh-data.yml, right after refresh-data.mjs.
//
// What it reads, and how politely:
// - Limitless play API (play.limitlesstcg.com/api), no key needed. The tournament list
//   (up to 3 pages), then standings and pairings for each big event in the window.
//   An event is read once and kept in .github/matchups-cache.json, so the next week
//   only reads the events that are new. At most 12 new events a run: about 27 requests.
//   Requests run one at a time with a pause, and a 429 answer stops the run.
//
// How a match counts, the same way Limitless counts its own matchup tables:
// - Both players must have a deck the event recorded. A win is a win, a tie is a match
//   that is not a win, so win rate = wins / matches.
// - Byes, double losses and rounds nobody played are left out. In an event that records
//   games, a decided match with no games recorded is a no-show and is left out too.
// - Mirror matches are left out of every number.
//
// Built for more than one source: every record is kept per source ("online" today).
// In-person results can be added later as a second source without changing the app.
//
// Safety: a run that reads too little keeps last week's matchups.json. The files are
// only written when something real changed, so a quiet week makes no commit.
import { readFile, writeFile } from 'node:fs/promises';

const OUT = process.argv[2] || 'matchups.json';
const CACHE = process.argv[3] || '.github/matchups-cache.json';
const DATA = process.argv[4] || 'data.json';
const UA = 'RdyDeck-data-refresh/1.0 (+https://rdydeck.com/)';
const LIMITLESS = process.env.PT_LIMITLESS || 'https://play.limitlesstcg.com/api';
const DAY = 86400000;
const WINDOW_DAYS = 14;    // the same window as the meta in data.json
const MIN_PLAYERS = 64;    // big enough to mean something
const MAX_EVENTS = 16;     // events used at once, biggest first
const NEW_PER_RUN = 12;    // new events read per run
const MIN_LISTS = 10;      // an archetype needs this many lists to get a row
const MAX_ROWS = 40;
const COLS = 10;           // the most played decks, shown as opponents
const SIG_MIN = 0.3;       // a Pokemon in this share of an archetype's lists is part of its shape
const SIG_MAX = 10;

const sleep = ms => new Promise(r => setTimeout(r, ms));
let calls = 0;
async function getJSON(url) {
  if (calls++ > 40) throw new Error('request budget used up');
  if (!process.env.PT_NO_PAUSE) await sleep(1500);
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
  if (r.status === 429) throw new Error('rate limited by ' + new URL(url).host + ', stopping for this week');
  if (!r.ok) return null;
  return r.json();
}

const clean = (v, max) => String(v == null ? '' : v).replace(/[<>`\u0000-\u001f]/g, '').replace(/[\u2013\u2014]/g, '-').trim().slice(0, max);
const slug = v => clean(v, 60).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
const day = t => new Date(t).toISOString().slice(0, 10);
const add = (a, b) => { a[0] += b[0]; a[1] += b[1]; a[2] += b[2]; return a; };

/** One event's standings and pairings, boiled down to counts. Null when it cannot be used. */
function digest(t, standings, pairings) {
  const deckOf = new Map();
  const decks = {};
  for (const s of standings) {
    const id = slug(s && s.deck && s.deck.id);
    const name = clean(s && s.deck && s.deck.name, 50);
    const player = String(s && s.player || '');
    if (!id || !name || !player) continue;
    deckOf.set(player, id);
    const d = decks[id] || (decks[id] = { name, lists: 0, mons: {} });
    const mons = s.decklist && Array.isArray(s.decklist.pokemon) ? s.decklist.pokemon : null;
    if (!mons) continue;
    d.lists++;
    const seen = {};
    for (const c of mons) {
      const n = clean(c && c.name, 60), k = Number(c && c.count);
      if (!n || !Number.isInteger(k) || k < 1 || k > 60) continue;
      seen[n] = (seen[n] || 0) + k;
    }
    for (const [n, k] of Object.entries(seen)) {
      const m = d.mons[n] || (d.mons[n] = [0, 0]);
      m[0]++; m[1] += k;
    }
  }
  // Most players need a recorded deck, or the event says too little.
  if (!standings.length || deckOf.size < standings.length * 0.5) return null;

  const decided = pairings.filter(p => p && p.player1 && p.player2 && p.winner !== -1 && p.winner != null);
  const withGames = decided.filter(p => p.games && typeof p.games === 'object' && Object.keys(p.games).length).length;
  const recordsGames = decided.length > 0 && withGames >= decided.length * 0.5;
  const pairs = {};
  let matches = 0;
  for (const p of decided) {
    if (recordsGames && !(p.games && Object.keys(p.games).length)) continue;   // a no-show
    const a = deckOf.get(String(p.player1)), b = deckOf.get(String(p.player2));
    if (!a || !b || a === b) continue;
    const w = String(p.winner);
    let r;
    if (w === String(p.player1)) r = [1, 0, 0];
    else if (w === String(p.player2)) r = [0, 1, 0];
    else if (w === '0') r = [0, 0, 1];
    else continue;
    // Stored once per pair, from the side whose id sorts first.
    const [x, y, rr] = a < b ? [a, b, r] : [b, a, [r[1], r[0], r[2]]];
    add(pairs[x + '|' + y] || (pairs[x + '|' + y] = [0, 0, 0]), rr);
    matches++;
  }
  if (!matches) return null;
  return {
    id: String(t.id), src: 'online', date: day(t.date), players: Number(t.players) || 0,
    name: clean(t.name, 80), decks, pairs, matches,
  };
}

/** Big finished events in the window, biggest first. */
async function eventList(since, now) {
  const out = [];
  for (let page = 1; page <= 3; page++) {
    const list = await getJSON(`${LIMITLESS}/tournaments?game=PTCG&format=STANDARD&limit=100&page=${page}`);
    if (!Array.isArray(list) || !list.length) break;
    let older = false;
    for (const t of list) {
      const d = Date.parse(t && t.date);
      if (!d) continue;
      if (d < since) { older = true; continue; }
      if (d < now - DAY && Number(t.players) >= MIN_PLAYERS && t.format === 'STANDARD' && /^[A-Za-z0-9]{6,40}$/.test(String(t.id))) out.push(t);
    }
    if (older) break;
  }
  return out.sort((a, b) => b.players - a.players).slice(0, MAX_EVENTS);
}

/** Sum the window's events into the file the app reads. */
function build(events, since, until) {
  const lists = {}, names = {}, mons = {}, vs = {};
  let total = 0, matches = 0;
  for (const e of events) {
    matches += e.matches;
    for (const [id, d] of Object.entries(e.decks)) {
      names[id] = names[id] || d.name;
      lists[id] = (lists[id] || 0) + d.lists;
      total += d.lists;
      const m = mons[id] || (mons[id] = {});
      for (const [n, v] of Object.entries(d.mons)) add(m[n] || (m[n] = [0, 0, 0]), [v[0], v[1], 0]);
    }
    for (const [k, r] of Object.entries(e.pairs)) {
      const [a, b] = k.split('|');
      const src = e.src || 'online';
      const ab = ((vs[a] = vs[a] || {})[b] = vs[a][b] || {});
      const ba = ((vs[b] = vs[b] || {})[a] = vs[b][a] || {});
      add(ab[src] || (ab[src] = [0, 0, 0]), r);
      add(ba[src] || (ba[src] = [0, 0, 0]), [r[1], r[0], r[2]]);
    }
  }
  const rows = Object.keys(lists).filter(id => lists[id] >= MIN_LISTS).sort((a, b) => lists[b] - lists[a]).slice(0, MAX_ROWS);
  const cols = rows.slice(0, COLS);
  const decks = rows.map(id => {
    const rec = {};
    for (const opp of Object.values(vs[id] || {})) for (const [src, r] of Object.entries(opp)) add(rec[src] || (rec[src] = [0, 0, 0]), r);
    const v = {};
    for (const c of cols) if (c !== id && vs[id] && vs[id][c]) v[c] = vs[id][c];
    const sig = Object.entries(mons[id] || {})
      .map(([n, x]) => [n, Math.round(x[1] / lists[id] * 10) / 10, Math.round(x[0] / lists[id] * 100) / 100])
      .filter(s => s[2] >= SIG_MIN).sort((a, b) => b[2] - a[2] || b[1] - a[1]).slice(0, SIG_MAX);
    return { id, name: names[id], share: Math.round(lists[id] / total * 1000) / 10, lists: lists[id], sig, rec, vs: v };
  }).filter(d => d.sig.length);
  return {
    schema: 1,
    asOf: day(Date.now()),
    since: day(since), until: until ? day(until) : day(Date.now()),
    note: 'Matchup stats for RdyDeck, built weekly by refresh-matchups.mjs from Limitless online tournaments. Win rate = wins / matches. Mirrors, byes and no-shows left out.',
    sources: [{
      id: 'online',
      name: 'Limitless online tournaments',
      url: 'https://play.limitlesstcg.com/tournaments?game=PTCG&format=STANDARD',
      events: events.length,
      matches,
    }],
    cols: cols.filter(c => decks.some(d => d.id === c)),
    decks,
  };
}

const readJSON = async (f, fb) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch (_) { return fb; } };
const now = Date.now();
const cache = await readJSON(CACHE, { schema: 1, formatStart: null, events: [] });
const old = await readJSON(OUT, null);
const data = await readJSON(DATA, {});

// A new set changes the format. Once its release day has passed, matches from before
// it are left out. The day is kept here so it outlives the prerelease block in data.json.
const rel = data && data.prerelease && /^\d{4}-\d{2}-\d{2}$/.test(String(data.prerelease.release)) ? data.prerelease.release : null;
if (rel && Date.parse(rel) <= now && (!cache.formatStart || rel > cache.formatStart)) cache.formatStart = rel;
const since = Math.max(now - WINDOW_DAYS * DAY, cache.formatStart ? Date.parse(cache.formatStart) : 0);

const notes = [];
let fresh = 0;
try {
  const list = await eventList(since, now);
  const have = new Map((cache.events || []).map(e => [e.id, e]));
  for (const t of list) {
    if (have.has(String(t.id)) || fresh >= NEW_PER_RUN) continue;
    const standings = await getJSON(`${LIMITLESS}/tournaments/${encodeURIComponent(t.id)}/standings`);
    if (!Array.isArray(standings)) continue;
    const pairings = await getJSON(`${LIMITLESS}/tournaments/${encodeURIComponent(t.id)}/pairings`);
    if (!Array.isArray(pairings)) continue;
    fresh++;
    // An event that cannot be used is still kept, as skipped, so it is not read again.
    have.set(String(t.id), digest(t, standings, pairings) || { id: String(t.id), date: day(t.date), skip: true });
  }
  cache.events = [...have.values()].filter(e => Date.parse(e.date) >= since - DAY);
  notes.push(`events: ${fresh} new, ${cache.events.filter(e => !e.skip).length} in use`);
} catch (e) { notes.push('Limitless: ' + e.message + ', kept what was read'); }

const use = (cache.events || []).filter(e => !e.skip && Date.parse(e.date) >= since - DAY);
const next = build(use, since);
const ok = next.cols.length >= 3 && next.sources[0].matches >= 200;
notes.push(ok ? `matchups: ${next.decks.length} decks, ${next.sources[0].matches} matches` : 'matchups: too little data, kept last copy');

const strip = d => JSON.stringify(d ? { ...d, asOf: null, until: null } : null);
await writeFile(CACHE, JSON.stringify(cache) + '\n');
if (ok && strip(next) !== strip(old)) {
  await writeFile(OUT, JSON.stringify(next, null, 1) + '\n');
  notes.push('matchups.json updated, as of ' + next.asOf);
} else notes.push('matchups.json: no change');
console.log(notes.join('\n'));
