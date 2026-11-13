// Builds matchups.json for RdyDeck: how each deck archetype has done against the
// most played decks, from recent Limitless online tournaments. Run weekly by
// .github/workflows/refresh-data.yml, right after refresh-data.mjs.
//
// What it reads, and how politely:
// - Limitless play API (play.limitlesstcg.com/api), no key needed. The tournament list
//   (newest first, until it reaches the start of the window), then standings and pairings
//   for each big event in the window. An event is read once and kept in
//   .github/matchups-cache.json, so the next week only reads the events that are new.
//   At most 40 new events a run, at most 120 requests, 3 seconds apart. Requests run one at a
//   time with a pause, and a 429 answer stops the run.
//
// The window: the last SETS_BACK sets (two today), from the day the older of them came out,
// so it rolls forward by itself when a new set comes out. A rotation inside the window
// moves its start to the rotation day. PT_SINCE=YYYY-MM-DD sets the start by hand.
// A run with PT_BACKFILL=1 reads up to 50 new events, to fill a wider window sooner.
//
// How a match counts, the same way Limitless counts its own matchup tables:
// - Both players must have a deck the event recorded. A win is a win, a tie is a match
//   that is not a win, so win rate = wins / matches.
// - Byes, double losses and rounds nobody played are left out. In an event that records
//   games, a decided match with no games recorded is a no-show and is left out too.
// - Mirror matches are left out of every number.
//
// Placements: every list's finish counts too, not just its match record. Per deck and
// source the file keeps [lists, sum of finish, sum of finish squared, top 8, top 16, top 10%],
// where a list's finish is 1 for first place and 0 for last (sums in thousandths). The app
// ranks decks on win rate and finish together, with high finishes weighing more.
//
// Built for more than one source: every record is kept per source ("online" today).
// In-person results can be added later as a second source without changing the app.
//
// Safety: a run that reads too little keeps last week's matchups.json. The files are
// only written when something real changed, so a quiet week makes no commit.
import { readFile, writeFile } from 'node:fs/promises';
import { cardDigest, buildMetaCards, CARD_VERSION } from './meta-cards.mjs';

const OUT = process.argv[2] || 'matchups.json';
const CACHE = process.argv[3] || '.github/matchups-cache.json';
const DATA = process.argv[4] || 'data.json';
// The deck builder's card data (2.6): what each deck's lists run, from the same standings and pairings.
const CARDS_OUT = process.env.PT_CARDS_OUT || 'meta-cards.json';
const CARDS_CACHE = process.env.PT_CARDS_CACHE || '.github/cards-cache.json';
// PT_CARDS_ONLY=1 reads no new events and leaves matchups.json alone: it only reads events already in
// the window once more for their card data (each event is read again only once), newest first.
const CARDS_ONLY = !!process.env.PT_CARDS_ONLY;
const UA = 'RdyDeck-data-refresh/1.0 (+https://rdydeck.com/)';
const LIMITLESS = process.env.PT_LIMITLESS || 'https://play.limitlesstcg.com/api';
const DAY = 86400000;
const SETS_BACK = 2;       // the window covers this many of the newest sets
// Sets that came out, oldest first. New ones are added from data.json's prerelease block
// on their release day, so this list only seeds the cache.
const KNOWN_SETS = [
  { code: 'PBL', name: 'Pitch Black', release: '2026-07-17' },
  { code: '30C', name: '30th Celebration', release: '2026-09-16' },
  { code: 'DLR', name: 'Delta Reign', release: '2026-11-06' },
];
const BACKFILL = !!process.env.PT_BACKFILL;
const MIN_PLAYERS = 64;    // big enough to mean something
const MAX_EVENTS = 400;    // events in the window looked at, biggest first
const NEW_PER_RUN = BACKFILL ? 50 : 40;   // new events read per run
const MAX_CALLS = CARDS_ONLY ? 300 : BACKFILL ? 130 : 120;    // requests per run, all told
const CARDS_AGAIN = CARDS_ONLY ? 150 : 10;  // events read once more for their card data, per run
const PAUSE = CARDS_ONLY ? 5000 : 3000;   // between requests (Limitless answered 429 after about 4 minutes at 1.5 s); the one-off card data run goes slower
const MAX_PAGES = 40;      // tournament list pages, 100 events each
const MIN_LISTS = 10;      // an archetype needs this many lists to get a row
const MAX_ROWS = 40;       // plus any deck with MIN_LISTS lists since the newest set
const NOW_MIN = 500;       // lists since the newest set before its decks pick the opponents
const COLS = 10;           // the most played decks, shown as opponents
const SIG_MIN = 0.3;       // a Pokemon in this share of an archetype's lists is part of its shape
const SIG_MAX = 10;

const sleep = ms => new Promise(r => setTimeout(r, ms));
let calls = 0, limitSeen = 'no limit headers';
async function getJSON(url) {
  if (calls++ > MAX_CALLS) throw new Error('request budget used up');
  if (!process.env.PT_NO_PAUSE) await sleep(PAUSE);
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
  if (r.status === 429) throw new Error('rate limited by ' + new URL(url).host + ', stopping for this week');
  // Stop well short of any limit the server reports (X-RateLimit-* or RateLimit-* headers).
  const hv = n => { const v = r.headers.get(n); return v == null ? null : parseFloat(v); };
  const left = hv('x-ratelimit-remaining') ?? hv('ratelimit-remaining'), cap = hv('x-ratelimit-limit') ?? hv('ratelimit-limit');
  if (left != null || cap != null) limitSeen = `${left ?? '?'} of ${cap ?? '?'} left`;
  if (left != null && left <= Math.max(5, (cap || 0) * 0.25)) throw new Error(`stopping early: ${limitSeen} at ${new URL(url).host}`);
  if (!r.ok) return null;
  return r.json();
}

const clean = (v, max) => String(v == null ? '' : v).replace(/[<>`\u0000-\u001f]/g, '').replace(/[\u2013\u2014]/g, '-').trim().slice(0, max);
const slug = v => clean(v, 60).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
const day = t => new Date(t).toISOString().slice(0, 10);
const add = (a, b) => { a[0] += b[0]; a[1] += b[1]; a[2] += b[2]; return a; };

// A whole 60-card list as a short code, so the app can tell when a player's list is the
// same one that placed in an event, card for card. Only names and counts are used, not
// set numbers, so another printing of the same card still matches. The app builds the
// same code from the open deck (mu61Code in index.html): keep the two in step.
const TOP_PLACE = 16;      // lists that finished this high are kept, as codes only
const TOPS_MAX = 24;       // codes kept per archetype, best finishes first
const cardKey = n => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ').trim().replace(/^basic (?=.* energy$)/, '');
function listCode(dl) {
  if (!dl || typeof dl !== 'object') return null;
  const n = {};
  let total = 0;
  for (const part of ['pokemon', 'trainer', 'energy']) {
    if (!Array.isArray(dl[part])) return null;
    for (const c of dl[part]) {
      const k = cardKey(c && c.name), q = Number(c && c.count);
      if (!k || !Number.isInteger(q) || q < 1 || q > 60) return null;
      n[k] = (n[k] || 0) + q; total += q;
    }
  }
  if (total !== 60) return null;
  const s = Object.keys(n).sort().map(k => k + ':' + n[k]).join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/**
 * Each deck's finishes in one event: [lists, sum of finish, sum of finish squared, top 8, top 16,
 * top 10%]. A finish is 1 for first place and 0 for last, so events of every size compare;
 * the sums are in thousandths to keep whole numbers.
 */
function placements(standings) {
  const field = standings.filter(s => s && s.deck && slug(s.deck.id) && Number.isInteger(Number(s.placing)) && Number(s.placing) >= 1);
  const last = Math.max(2, ...field.map(s => Number(s.placing)));
  const out = {};
  for (const s of field) {
    const id = slug(s.deck.id), place = Number(s.placing);
    const f = Math.max(0, Math.min(1, (last - place) / (last - 1)));
    const p = out[id] || (out[id] = [0, 0, 0, 0, 0, 0]);
    p[0]++; p[1] += Math.round(f * 1000); p[2] += Math.round(f * f * 1000);
    if (place <= 8) p[3]++;
    if (place <= 16) p[4]++;
    if (place <= Math.max(1, Math.round(last * 0.1))) p[5]++;
  }
  return out;
}

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
    const place = Number(s.placing);
    if (Number.isInteger(place) && place >= 1 && place <= TOP_PLACE) {
      const code = listCode(s.decklist);
      if (code) (d.tops || (d.tops = [])).push([code, place]);
    }
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
  for (const [id, p] of Object.entries(placements(standings))) if (decks[id]) decks[id].pl = p;

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
    name: clean(t.name, 80), decks, pairs, matches, plv: 1,
  };
}

/** Big finished events in the window, biggest first. */
async function eventList(since, now) {
  const out = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
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
function build(events, since, until, from, newest) {
  const lists = {}, names = {}, mons = {}, vs = {}, tops = {}, fin = {}, field = {}, now = {};
  // v68: results since the newest set came out, kept apart so the grade can weigh them most.
  const curRec = {}, curFin = {}, curField = {};
  let curEvents = 0, curMatches = 0;
  let nowTotal = 0;
  let total = 0, matches = 0;
  for (const e of events) {
    matches += e.matches;
    const src = e.src || 'online';
    const isCur = !!(newest && e.date >= newest);
    if (isCur) { curEvents++; curMatches += e.matches; }
    for (const [id, d] of Object.entries(e.decks)) {
      if (Array.isArray(d.pl) && d.pl.length === 6) {
        const pd = (fin[id] = fin[id] || {});
        const a = pd[src] || (pd[src] = [0, 0, 0, 0, 0, 0]), f = field[src] || (field[src] = [0, 0, 0, 0, 0, 0]);
        d.pl.forEach((v, i) => { a[i] += v; f[i] += v; });
        if (isCur) {
          const cd = (curFin[id] = curFin[id] || {});
          const ca = cd[src] || (cd[src] = [0, 0, 0, 0, 0, 0]), cf = curField[src] || (curField[src] = [0, 0, 0, 0, 0, 0]);
          d.pl.forEach((v, i) => { ca[i] += v; cf[i] += v; });
        }
      }
      names[id] = names[id] || d.name;
      lists[id] = (lists[id] || 0) + d.lists;
      if (newest && e.date >= newest) { now[id] = (now[id] || 0) + d.lists; nowTotal += d.lists; }
      for (const [code, place] of d.tops || []) (tops[id] || (tops[id] = [])).push([code, place, e.name, e.date]);
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
      if (isCur && a !== b) {
        const ca = ((curRec[a] = curRec[a] || {})[src] = curRec[a][src] || [0, 0, 0]);
        const cb = ((curRec[b] = curRec[b] || {})[src] = curRec[b][src] || [0, 0, 0]);
        add(ca, r); add(cb, [r[1], r[0], r[2]]);
      }
    }
  }
  // Rows: the most played decks over the window, plus every deck played enough since the
  // newest set came out, so a deck people play today always has a row.
  const top = Object.keys(lists).filter(id => lists[id] >= MIN_LISTS).sort((a, b) => lists[b] - lists[a]).slice(0, MAX_ROWS);
  const live = Object.keys(now).filter(id => now[id] >= MIN_LISTS && !top.includes(id)).sort((a, b) => now[b] - now[a]);
  const rows = [...top, ...live];
  // Opponents: the decks played most since the newest set came out, once it has enough lists,
  // since those are the decks a player meets today. Before that, the most played in the window.
  const cols = nowTotal >= NOW_MIN ? rows.slice().sort((a, b) => (now[b] || 0) - (now[a] || 0) || lists[b] - lists[a]).slice(0, COLS) : rows.slice(0, COLS);
  const decks = rows.map(id => {
    const rec = {};
    for (const opp of Object.values(vs[id] || {})) for (const [src, r] of Object.entries(opp)) add(rec[src] || (rec[src] = [0, 0, 0]), r);
    const v = {};
    for (const c of cols) if (c !== id && vs[id] && vs[id][c]) v[c] = vs[id][c];
    const sig = Object.entries(mons[id] || {})
      .map(([n, x]) => [n, Math.round(x[1] / lists[id] * 10) / 10, Math.round(x[0] / lists[id] * 100) / 100])
      .filter(s => s[2] >= SIG_MIN).sort((a, b) => b[2] - a[2] || b[1] - a[1]).slice(0, SIG_MAX);
    // The same list can place more than once: keep its best finish, then the newest.
    const best = {};
    for (const x of (tops[id] || []).sort((a, b) => a[1] - b[1] || (a[3] < b[3] ? 1 : -1))) if (!best[x[0]]) best[x[0]] = x;
    const top = Object.values(best).slice(0, TOPS_MAX);
    const out = { id, name: names[id], share: Math.round(lists[id] / total * 1000) / 10, lists: lists[id], sig, rec, vs: v, tops: top, place: fin[id] || {} };
    if (now[id]) out.cur = { lists: now[id], rec: curRec[id] || {}, place: curFin[id] || {} };
    return out;
  }).filter(d => d.sig.length);
  return {
    schema: 1,
    asOf: day(Date.now()),
    since: day(since), until: until ? day(until) : day(Date.now()),
    // The oldest set in the window, so the app can say "since 30th Celebration".
    window: from ? { sets: SETS_BACK, from: from.name, code: from.code } : null,
    note: 'Matchup stats for RdyDeck, built weekly by refresh-matchups.mjs from Limitless online tournaments. Win rate = wins / matches. Mirrors, byes and no-shows left out. place per source: [lists, sum of finish, sum of finish squared, top 8, top 16, top 10%], finish 1 for first and 0 for last, sums in thousandths.',
    sources: [{
      id: 'online',
      name: 'Limitless online tournaments',
      url: 'https://play.limitlesstcg.com/tournaments?game=PTCG&format=STANDARD',
      events: events.length,
      matches,
      // Every deck's finishes summed, the same six numbers as each deck's place.
      place: field.online || [0, 0, 0, 0, 0, 0],
    }],
    cols: cols.filter(c => decks.some(d => d.id === c)),
    // v68: the same totals for the events since the newest set came out (each deck's cur).
    cur: newest && curEvents ? { since: newest, events: curEvents, matches: curMatches, place: curField } : null,
    decks,
  };
}

const readJSON = async (f, fb) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch (_) { return fb; } };
const now = Date.now();
const cache = await readJSON(CACHE, { schema: 1, formatStart: null, events: [] });
const cardCache = await readJSON(CARDS_CACHE, { schema: 1, events: [] });
const cardHave = new Map((cardCache.events || []).filter(e => e && e.cv === CARD_VERSION).map(e => [e.id, e]));
const old = await readJSON(OUT, null);
const data = await readJSON(DATA, {});

// Every set that came out, kept here so it outlives the prerelease block in data.json.
// Once a set's release day has passed it joins the list, and the window moves forward.
const isDay = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
const sets = new Map();
for (const s of [...KNOWN_SETS, ...(Array.isArray(cache.sets) ? cache.sets : [])]) if (s && isDay(s.release)) sets.set(s.release, s);
const pre = data && data.prerelease;
if (pre && isDay(pre.release) && Date.parse(pre.release) <= now && !sets.has(pre.release))
  sets.set(pre.release, { code: clean(pre.code, 8), name: clean(pre.set, 40), release: pre.release });
cache.sets = [...sets.values()].filter(s => Date.parse(s.release) <= now).sort((a, b) => a.release.localeCompare(b.release));
const fromSet = cache.sets[Math.max(0, cache.sets.length - SETS_BACK)] || null;
cache.formatStart = cache.sets.length ? cache.sets[cache.sets.length - 1].release : cache.formatStart;
// A rotation inside the window starts it again on the rotation day.
const rot = Date.parse(data && data.rotation && data.rotation.last && data.rotation.last.live) || 0;
let since = isDay(process.env.PT_SINCE) ? Date.parse(process.env.PT_SINCE) : fromSet ? Date.parse(fromSet.release) : now - 14 * DAY;
const fromName = isDay(process.env.PT_SINCE) ? null : rot > since && rot <= now ? null : fromSet;
since = Math.max(since, rot <= now ? rot : 0);

const notes = [];
let fresh = 0;
const have = new Map((cache.events || []).map(e => [e.id, e]));
// PT_OFFLINE=1 rebuilds the file from the cache alone, without reading Limitless.
if (!process.env.PT_OFFLINE && !CARDS_ONLY) try {
  const list = await eventList(since, now);
  for (const t of list) {
    if (have.has(String(t.id)) || fresh >= NEW_PER_RUN) continue;
    const standings = await getJSON(`${LIMITLESS}/tournaments/${encodeURIComponent(t.id)}/standings`);
    if (!Array.isArray(standings)) continue;
    const pairings = await getJSON(`${LIMITLESS}/tournaments/${encodeURIComponent(t.id)}/pairings`);
    if (!Array.isArray(pairings)) continue;
    fresh++;
    // An event that cannot be used is still kept, as skipped, so it is not read again.
    have.set(String(t.id), digest(t, standings, pairings) || { id: String(t.id), date: day(t.date), skip: true });
    const cd = cardDigest(t, standings, pairings);
    if (cd) cardHave.set(cd.id, cd);
  }
  // Events read before placements were kept: read their standings once more, a few a run.
  let again = 0;
  for (const e of have.values()) {
    if (e.skip || e.plv === 1 || Date.parse(e.date) < since - DAY || again >= 10) continue;
    const standings = await getJSON(`${LIMITLESS}/tournaments/${encodeURIComponent(e.id)}/standings`);
    if (!Array.isArray(standings)) continue;
    again++;
    for (const [id, p] of Object.entries(placements(standings))) if (e.decks[id]) e.decks[id].pl = p;
    e.plv = 1;
  }
  if (again) notes.push(`placements: ${again} earlier events read again`);
  notes.push(`window: from ${day(since)}${fromName ? ' (' + fromName.name + ')' : ''}, ${list.length} big events listed`);
  notes.push(`events: ${fresh} new, ${[...have.values()].filter(e => !e.skip && Date.parse(e.date) >= since - DAY).length} in use, ${list.filter(t => !have.has(String(t.id))).length} left to read`);
} catch (e) { notes.push('Limitless: ' + e.message + `, kept what was read (${fresh} new events)`); }
// Card data for events read before 2.6: read them once more, newest first, a few a run.
let cardAgain = 0;
if (!process.env.PT_OFFLINE) try {
  const todo = [...have.values()].filter(e => !e.skip && Date.parse(e.date) >= since - DAY && !cardHave.has(e.id))
    .sort((a, b) => b.date.localeCompare(a.date));
  for (const e of todo) {
    if (cardAgain >= CARDS_AGAIN) break;
    const standings = await getJSON(`${LIMITLESS}/tournaments/${encodeURIComponent(e.id)}/standings`);
    if (!Array.isArray(standings)) continue;
    const pairings = await getJSON(`${LIMITLESS}/tournaments/${encodeURIComponent(e.id)}/pairings`);
    if (!Array.isArray(pairings)) continue;
    cardAgain++;
    const cd = cardDigest({ id: e.id, date: e.date }, standings, pairings);
    cardHave.set(e.id, cd || { id: e.id, date: e.date, cv: CARD_VERSION, decks: {} });
  }
  notes.push(`card data: ${cardAgain} earlier events read again, ${todo.length - cardAgain} left`);
} catch (e) { notes.push('Limitless (card data): ' + e.message + `, kept what was read (${cardAgain} events)`); }
// Events read before a stop are kept too, so the next run does not read them again.
cache.events = [...have.values()].filter(e => Date.parse(e.date) >= since - DAY);
notes.push(`requests: ${calls} (rate limit: ${limitSeen})`);

const use = (cache.events || []).filter(e => !e.skip && Date.parse(e.date) >= since - DAY);
const newest = cache.sets.length ? cache.sets[cache.sets.length - 1].release : null;
const next = build(use, since, null, fromName, newest);
const ok = next.cols.length >= 3 && next.sources[0].matches >= 200;
notes.push(ok ? `matchups: ${next.decks.length} decks, ${next.sources[0].matches} matches` : 'matchups: too little data, kept last copy');

const strip = d => JSON.stringify(d ? { ...d, asOf: null, until: null } : null);
if (!CARDS_ONLY) await writeFile(CACHE, JSON.stringify(cache) + '\n');
if (CARDS_ONLY) notes.push('matchups.json: left alone (card data run)');
else if (ok && strip(next) !== strip(old)) {
  await writeFile(OUT, JSON.stringify(next, null, 1) + '\n');
  notes.push('matchups.json updated, as of ' + next.asOf);
} else notes.push('matchups.json: no change');

// The deck builder's card data, from the same events as matchups.json.
const inWindow = new Set(use.map(e => e.id));
cardCache.events = [...cardHave.values()].filter(e => inWindow.has(e.id));
await writeFile(CARDS_CACHE, JSON.stringify(cardCache) + '\n');
const names = {};
for (const e of use) for (const [id, d] of Object.entries(e.decks)) if (!names[id]) names[id] = d.name;
const shown = ok ? next : old;
const newestSet = cache.sets.length ? cache.sets[cache.sets.length - 1] : null;
const mc = buildMetaCards(cardCache.events, { since: day(since), newest, newestName: newestSet && newestSet.name, from: fromName && fromName.name, cols: (shown && shown.cols) || [], names });
if (mc) {
  const oldMc = await readJSON(CARDS_OUT, null);
  if (JSON.stringify({ ...mc, asOf: null }) !== JSON.stringify(oldMc ? { ...oldMc, asOf: null } : null)) {
    await writeFile(CARDS_OUT, JSON.stringify(mc).replace(/\},\{"id"/g, '},\n{"id"') + '\n');
    notes.push(`meta-cards.json: ${mc.decks.length} decks from ${mc.events} events (${mc.lists} lists)`);
  } else notes.push('meta-cards.json: no change');
} else notes.push('meta-cards.json: no card data yet');
console.log(notes.join('\n'));
