// Adds player-reported event results to matchups.json as their own source, "player" (v81).
// Run by the weekly data job after refresh-matchups.mjs, and only when the repo variable
// PLAYER_RESULTS is "on" (Settings, Secrets and variables, Actions, Variables).
//
// Reads https://rdydeck.com/api/results/summary (totals only, no single submission) for the
// same window matchups.json covers, and writes each archetype's player record, matchups and
// finishes next to its Limitless ones. Every number is counted at WEIGHT (half), and the player
// games for one archetype are held to at most CAP of its Limitless games, so a few loud
// submissions cannot outweigh real tournament data. The grade (js/v69-grade-blend.js) reads every
// source the same way, so the weight is applied here, in the file.
//
//   node merge-player-results.mjs            merge (needs PLAYER_RESULTS=on)
//   node merge-player-results.mjs --file=x   read the summary from a file instead (for tests)
//
// With the variable off, no answer, or a bad answer, matchups.json is left as it is, apart from
// taking out an earlier "player" source when the variable is off.

import { readFile, writeFile } from 'node:fs/promises';

const FILE = 'matchups.json';
const URL_SUM = 'https://rdydeck.com/api/results/summary';
export const WEIGHT = 0.5, CAP = 0.25;

const arg = (process.argv.slice(2).find(a => a.startsWith('--file=')) || '').slice(7);
const isDay = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const okId = s => typeof s === 'string' && /^[a-z0-9-]{1,50}$/.test(s);
const rec3 = r => Array.isArray(r) && r.length === 3 && r.every(n => Number.isInteger(n) && n >= 0) ? r : null;
const pl6 = p => Array.isArray(p) && p.length === 6 && p.every(n => Number.isInteger(n) && n >= 0) ? p : null;
const games = r => r ? r[0] + r[1] + r[2] : 0;

/** Takes every "player" entry out, so a merge always starts from the Limitless numbers alone. */
export function strip(m) {
  m.sources = (m.sources || []).filter(s => s.id !== 'player');
  for (const d of m.decks || []) {
    if (d.rec) delete d.rec.player;
    if (d.place) delete d.place.player;
    for (const v of Object.values(d.vs || {})) delete v.player;
    if (d.cur) { if (d.cur.rec) delete d.cur.rec.player; if (d.cur.place) delete d.cur.place.player; }
  }
  if (m.cur && m.cur.place) delete m.cur.place.player;
  return m;
}

/** Scales a record by k, rounding, so the file keeps whole numbers. */
const scaleRec = (r, k) => r.map(n => Math.round(n * k));
/** Scales finishes by k, then keeps them valid for the app (sums no larger than allowed). */
function scalePl(p, k) {
  const n = Math.round(p[0] * k);
  if (!n) return null;
  const f = Math.min(n * 1000, Math.round(p[1] * k)), f2 = Math.min(f, Math.round(p[2] * k));
  const t16 = Math.min(n, Math.round(p[4] * k)), t8 = Math.min(t16, Math.round(p[3] * k)), t10 = Math.min(n, Math.round(p[5] * k));
  return [n, f, f2, t8, t16, t10];
}

/** Merges a summary into matchups.json (both as objects). Returns a note for the log. */
export function merge(m, sum) {
  strip(m);
  if (!sum || sum.schema !== 1 || sum.since !== m.since || !sum.decks || typeof sum.decks !== 'object') return 'summary does not match this window';
  const ids = new Set((m.decks || []).map(d => d.id));
  let used = 0, gamesIn = 0;
  const field = [0, 0, 0, 0, 0, 0], curField = [0, 0, 0, 0, 0, 0];
  for (const d of m.decks) {
    const s = sum.decks[d.id];
    if (!s || !okId(d.id) || !rec3(s.rec)) continue;
    // Half weight, and at most CAP of the archetype's Limitless games.
    const lim = Object.values(d.rec || {}).reduce((a, r) => a + games(r), 0);
    const raw = games(s.rec);
    if (!raw || !lim) continue;
    const k = Math.min(WEIGHT, (CAP * lim) / raw);
    const r = scaleRec(s.rec, k);
    if (!games(r)) continue;
    d.rec = d.rec || {}; d.rec.player = r;
    for (const [opp, v] of Object.entries(s.vs || {})) {
      if (!ids.has(opp) || !rec3(v) || opp === d.id) continue;
      const sv = scaleRec(v, k);
      if (!games(sv)) continue;
      d.vs = d.vs || {};
      (d.vs[opp] || (d.vs[opp] = {})).player = sv;
    }
    const p = pl6(s.place) && scalePl(s.place, k);
    if (p) { d.place = d.place || {}; d.place.player = p; p.forEach((x, i) => { field[i] += x; }); }
    if (d.cur && s.cur && rec3(s.cur.rec)) {
      const cr = scaleRec(s.cur.rec, k);
      if (games(cr)) { d.cur.rec = d.cur.rec || {}; d.cur.rec.player = cr; }
      const cp = pl6(s.cur.place) && scalePl(s.cur.place, k);
      if (cp) { d.cur.place = d.cur.place || {}; d.cur.place.player = cp; cp.forEach((x, i) => { curField[i] += x; }); }
    }
    used += s.subs || 0; gamesIn += games(r);
  }
  if (!used) return 'no archetype has enough player results yet';
  m.sources.push({ id: 'player', name: 'Player-reported', url: 'https://rdydeck.com/', events: used, matches: gamesIn, place: field });
  if (m.cur && m.cur.since === sum.cur && curField[0]) { m.cur.place = m.cur.place || {}; m.cur.place.player = curField; }
  return `merged ${used} player submissions (${gamesIn} weighted games)`;
}

async function main() {
  const m = JSON.parse(await readFile(FILE, 'utf8'));
  const before = JSON.stringify(m);
  let note;
  if (String(process.env.PLAYER_RESULTS || '').toLowerCase() !== 'on' && !arg) {
    strip(m);
    note = 'PLAYER_RESULTS is not on';
  } else {
    let sum = null;
    try {
      if (arg) sum = JSON.parse(await readFile(arg, 'utf8'));
      else {
        const q = `?since=${encodeURIComponent(m.since)}${m.cur && isDay(m.cur.since) ? '&cur=' + encodeURIComponent(m.cur.since) : ''}`;
        const r = await fetch(URL_SUM + q, { headers: { 'User-Agent': 'RdyDeck data job' } });
        sum = r.ok ? await r.json() : null;
      }
    } catch (_) { sum = null; }
    note = sum ? merge(m, sum) : 'no summary (left as it is)';
    if (!sum) { console.log('player results: ' + note); return; }
  }
  const after = JSON.stringify(m);
  if (after !== before) await writeFile(FILE, JSON.stringify(m, null, 1) + '\n');
  console.log('player results: ' + note + (after === before ? ' (no change)' : ''));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(1); });
