// Player-reported event results (v81), for the rdydeck.com Worker.
//
// Off until the Worker's variable PLAYER_RESULTS is set to "on" and the DB binding
// (the same D1 database as the reports) exists. While off, all three addresses are 404s.
//
//   GET  /api/results/status   {"on":true} when submissions are open
//   POST /api/results          one player's result at one event (the app's Share sheet)
//   GET  /api/results/summary  totals per archetype, for merge-player-results.mjs
//
// What is kept per submission: the event type, date, player count and placing, the
// archetype, the 60 card names and counts, and each round's opponent archetype and
// result. No name, no account, no free text, no device id. The visitor's IP is never
// stored: it is the rate limit key, and two salted hashes of it (one for "this event",
// one for "today") stop the same connection sending the same event twice or flooding
// a day. Both hashes are cleared after HASH_DAYS; rows go after KEEP_DAYS.
//
// Honesty checks (each failure is a plain 400 with a reason code, nothing kept):
//   the app's origin only, a rate limit, Cloudflare Turnstile when TURNSTILE_SECRET is set,
//   an event in the last MAX_AGE days and not in the future, Masters only, a known
//   archetype, 60 cards, a list that plays the archetype's core Pokemon, a round count
//   that fits the event size, a placing that fits the record, one submission per
//   connection per event, at most DAY_MAX a day per connection, and a site-wide daily cap.
// The summary only counts an archetype with at least MIN_SUBS submissions.

export const RESULT_TYPES = ['league-challenge', 'league-cup', 'regional', 'international', 'worlds', 'special', 'other-local'];
const MAX_AGE = 45, HASH_DAYS = 45, KEEP_DAYS = 400, DAY_MAX = 3, SITE_DAY_CAP = 2000, MIN_SUBS = 5;
const ROUNDS_MAX = { 'league-challenge': 8, 'league-cup': 10, 'other-local': 10, special: 16, regional: 20, international: 20, worlds: 20 };

const json = (o, status = 200, extra) => new Response(JSON.stringify(o), {
  status, headers: Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }, extra || {}),
});
const bad = why => json({ ok: false, why }, 400);
const isDay = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z'));
const dayOf = ms => new Date(ms).toISOString().slice(0, 10);
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const CARD_NAME = /^[\p{L}\p{N} '.&:,!?()\-]{1,60}$/u;

export const resultsOn = env => !!(env && env.DB && String(env.PLAYER_RESULTS || '').toLowerCase() === 'on');

async function hash(env, text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(env.RESULTS_SALT || '') + '|' + text));
  return [...new Uint8Array(d)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function ensureTable(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS player_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT, sent TEXT, v TEXT, type TEXT, date TEXT, players INTEGER, place INTEGER,
      arch TEXT, w INTEGER, l INTEGER, t INTEGER, rounds TEXT, list TEXT, dup TEXT UNIQUE, ipday TEXT, status TEXT DEFAULT 'ok')`),
    db.prepare(`CREATE INDEX IF NOT EXISTS player_results_date ON player_results (date)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS player_results_ipday ON player_results (ipday)`),
  ]);
}

/** The archetypes in the live matchups.json: id to the Pokemon nearly every list plays. Cached 10 minutes. */
let _arch = null, _archAt = 0;
async function archetypes(origin) {
  if (_arch && Date.now() - _archAt < 6e5) return _arch;
  const r = await fetch(origin + '/matchups.json', { cf: { cacheEverything: true, cacheTtl: 600 } });
  if (!r.ok) throw new Error('matchups ' + r.status);
  const j = await r.json(), out = {};
  for (const d of (j && j.decks) || []) {
    if (!d || typeof d.id !== 'string') continue;
    // The core: Pokemon in at least 90% of the archetype's lists. Card names only.
    out[d.id] = (Array.isArray(d.sig) ? d.sig : []).filter(s => Array.isArray(s) && typeof s[0] === 'string' && s[2] >= 0.9).map(s => norm(s[0]));
  }
  _arch = out; _archAt = Date.now();
  return out;
}

/** Turnstile, only when the secret is set. */
async function human(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET); body.append('response', token); body.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const j = await r.json();
    return !!(j && j.success);
  } catch (_) { return false; }
}

/** Checks one submission. Returns { row } or { why }. Exported for the tests. */
export function checkResult(b, arch, now = Date.now()) {
  if (!b || typeof b !== 'object') return { why: 'body' };
  const v = typeof b.v === 'string' && /^v\d+\.\d+(\.\d+)?$/.test(b.v) ? b.v : '';
  if (!v) return { why: 'version' };
  if (!RESULT_TYPES.includes(b.type)) return { why: 'type' };
  if (b.division !== 'masters') return { why: 'division' };
  if (!isDay(b.date)) return { why: 'date' };
  const age = (now - Date.parse(b.date + 'T00:00:00Z')) / 864e5;
  if (age < -1 || age > MAX_AGE) return { why: 'date' };
  const players = b.players;
  if (!Number.isInteger(players) || players < 4 || players > 5000) return { why: 'players' };
  const place = b.place == null ? null : b.place;
  if (place !== null && (!Number.isInteger(place) || place < 1 || place > players)) return { why: 'place' };
  if (typeof b.arch !== 'string' || !arch[b.arch] || b.arch === 'other') return { why: 'arch' };

  // The list: card names and counts only, 60 cards.
  if (!Array.isArray(b.list) || !b.list.length || b.list.length > 45) return { why: 'list' };
  let total = 0;
  const list = [];
  for (const x of b.list) {
    if (!Array.isArray(x) || x.length !== 2 || typeof x[0] !== 'string' || !CARD_NAME.test(x[0].trim()) || !Number.isInteger(x[1]) || x[1] < 1 || x[1] > 60) return { why: 'list' };
    total += x[1]; list.push([x[0].trim(), x[1]]);
  }
  if (total !== 60) return { why: 'list' };
  // The list must play the archetype's core Pokemon (at least half of them), so a result
  // is not filed under a deck it was not played with.
  const core = arch[b.arch], names = list.map(x => ' ' + norm(x[0]) + ' ');
  if (core.length) {
    const has = core.filter(p => names.some(n => n.includes(' ' + p + ' '))).length;
    if (has * 2 < core.length) return { why: 'list-arch' };
  }

  // Rounds: each a known opponent archetype (or "other", or "unknown") and a result.
  if (!Array.isArray(b.rounds) || b.rounds.length < 3 || b.rounds.length > ROUNDS_MAX[b.type]) return { why: 'rounds' };
  // A Swiss event needs about log2(players) rounds; more than that plus a top cut does not fit.
  // Two-day events (Regionals and up) run a few more Swiss rounds on day 2.
  const big = ['regional', 'international', 'worlds'].includes(b.type);
  if (b.rounds.length > Math.ceil(Math.log2(players)) + (big ? 7 : 4)) return { why: 'rounds' };
  let w = 0, l = 0, t = 0;
  const rounds = [];
  for (const r of b.rounds) {
    if (!Array.isArray(r) || r.length !== 2) return { why: 'rounds' };
    const [opp, res] = r;
    if (typeof opp !== 'string' || !(opp === 'other' || opp === 'unknown' || arch[opp])) return { why: 'rounds' };
    if (res === 'w') w++; else if (res === 'l') l++; else if (res === 't') t++; else return { why: 'rounds' };
    rounds.push([opp, res]);
  }
  // A placing that cannot go with the record: a top 8 at 32 players or more with more losses than wins,
  // or first place at a Swiss event with more than two losses.
  if (place !== null && players >= 32 && place <= 8 && l > w) return { why: 'place-record' };
  if (place === 1 && l > 2) return { why: 'place-record' };
  return { row: { v, type: b.type, date: b.date, players, place, arch: b.arch, w, l, t, rounds, list } };
}

async function takeResult(request, env, ctx, origin) {
  const ip = request.headers.get('CF-Connecting-IP') || 'none';
  if (env.LIMIT) {
    const { success } = await env.LIMIT.limit({ key: 'results:' + ip });
    if (!success) return json({ ok: false, why: 'slow-down' }, 429);
  }
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > 8192) return json({ ok: false }, 413);
  let b;
  try { const t = await request.text(); if (t.length > 8192) return json({ ok: false }, 413); b = JSON.parse(t); }
  catch (_) { return bad('body'); }
  if (!(await human(env, b && b.ts, ip))) return bad('human');

  let arch;
  try { arch = await archetypes(origin); } catch (_) { return json({ ok: false, why: 'busy' }, 503); }
  const c = checkResult(b, arch);
  if (c.why) return bad(c.why);
  const r = c.row, db = env.DB;
  await ensureTable(db);

  const day = dayOf(Date.now());
  const site = await db.prepare(`SELECT COUNT(*) AS n FROM player_results WHERE sent = ?`).bind(day).first();
  if (site && site.n >= SITE_DAY_CAP) return json({ ok: false, why: 'full' }, 503);
  const ipday = await hash(env, 'day|' + ip + '|' + day);
  const mine = await db.prepare(`SELECT COUNT(*) AS n FROM player_results WHERE ipday = ?`).bind(ipday).first();
  if (mine && mine.n >= DAY_MAX) return json({ ok: false, why: 'day-max' }, 429);
  const dup = await hash(env, 'event|' + ip + '|' + r.date + '|' + r.type);
  const res = await db.prepare(`INSERT OR IGNORE INTO player_results (sent, v, type, date, players, place, arch, w, l, t, rounds, list, dup, ipday)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(day, r.v, r.type, r.date, r.players, r.place, r.arch, r.w, r.l, r.t, JSON.stringify(r.rounds), JSON.stringify(r.list), dup, ipday).run();
  if (!res.meta || !res.meta.changes) return json({ ok: false, why: 'already' }, 409);
  if (Math.random() < 0.05) ctx.waitUntil(prune(db));
  return json({ ok: true });
}

async function prune(db) {
  const hcut = dayOf(Date.now() - HASH_DAYS * 864e5), kcut = dayOf(Date.now() - KEEP_DAYS * 864e5);
  await db.batch([
    db.prepare(`UPDATE player_results SET dup = NULL, ipday = NULL WHERE sent < ? AND (dup IS NOT NULL OR ipday IS NOT NULL)`).bind(hcut),
    db.prepare(`DELETE FROM player_results WHERE sent < ?`).bind(kcut),
  ]);
}

/** Totals in the shape matchups.json uses: rec [w, l, t], vs {opp: [w, l, t]}, place [lists, sum of finish,
 *  sum of finish squared, top 8, top 16, top 10%] with finish 1 for first and 0 for last, sums in thousandths. */
export function summarize(rows, since, cur) {
  const blank = () => ({ subs: 0, rec: [0, 0, 0], vs: {}, place: [0, 0, 0, 0, 0, 0] });
  const add = (d, x) => {
    d.subs++;
    let rounds = [];
    try { rounds = JSON.parse(x.rounds) || []; } catch (_) {}
    for (const [opp, res] of rounds) {
      const k = res === 'w' ? 0 : res === 'l' ? 1 : 2;
      if (opp === x.arch) continue;                 // mirrors left out, as in the Limitless numbers
      d.rec[k]++;
      if (opp === 'unknown') continue;              // unknown opponents: in the record, not the matchups
      const v = d.vs[opp] || (d.vs[opp] = [0, 0, 0]);
      v[k]++;
    }
    if (x.place && x.players > 1) {
      const f = Math.max(0, Math.min(1, (x.players - x.place) / (x.players - 1)));
      d.place[0]++; d.place[1] += Math.round(f * 1000); d.place[2] += Math.round(f * f * 1000);
      if (x.place <= 8) d.place[3]++;
      if (x.place <= 16) d.place[4]++;
      if (x.place <= Math.max(1, Math.round(x.players * 0.1))) d.place[5]++;
    }
  };
  const all = {}, now = {};
  let subs = 0, matches = 0, curSubs = 0, curMatches = 0;
  for (const x of rows) {
    if (x.status !== 'ok' || x.date < since) continue;
    add(all[x.arch] || (all[x.arch] = blank()), x);
    subs++; matches += x.w + x.l + x.t;
    if (cur && x.date >= cur) { add(now[x.arch] || (now[x.arch] = blank()), x); curSubs++; curMatches += x.w + x.l + x.t; }
  }
  const decks = {};
  for (const [id, d] of Object.entries(all)) {
    if (d.subs < MIN_SUBS) continue;
    decks[id] = { subs: d.subs, rec: d.rec, vs: d.vs, place: d.place };
    if (now[id] && now[id].subs >= MIN_SUBS) decks[id].cur = { subs: now[id].subs, rec: now[id].rec, place: now[id].place };
  }
  return { schema: 1, since, cur: cur || null, submissions: subs, matches, curSubmissions: curSubs, curMatches, minSubs: MIN_SUBS, decks };
}

async function showSummary(url, env) {
  const since = url.searchParams.get('since'), cur = url.searchParams.get('cur');
  if (!isDay(since) || (cur && !isDay(cur))) return bad('since');
  await ensureTable(env.DB);
  const rows = (await env.DB.prepare(`SELECT date, players, place, arch, w, l, t, rounds, status FROM player_results WHERE date >= ? LIMIT 50000`).bind(since).all()).results || [];
  return json(summarize(rows, since, cur || null), 200, { 'Cache-Control': 'public, max-age=3600' });
}

/** Handles /api/results*. Returns a Response, or null for any other path. */
export async function handleResults(request, env, ctx, url, origin, home) {
  if (!url.pathname.startsWith('/api/results')) return null;
  if (!resultsOn(env)) return null;   // the caller shows its 404 page
  if (url.pathname === '/api/results/status' && request.method === 'GET') {
    return json({ on: true, turnstile: env.TURNSTILE_SITEKEY || '' });
  }
  if (url.pathname === '/api/results/summary' && request.method === 'GET') {
    try { return await showSummary(url, env); } catch (_) { return json({ ok: false }, 500); }
  }
  if (url.pathname === '/api/results') {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
    const o = request.headers.get('Origin');
    if (o !== 'https://' + home) return json({ ok: false }, 403);
    try { return await takeResult(request, env, ctx, origin); } catch (_) { return json({ ok: false }, 500); }
  }
  return null;
}
