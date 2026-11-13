// What each meta deck's lists run, card by card, for RdyDeck's deck builder (meta-cards.json).
//
// refresh-matchups.mjs reads each event's standings and pairings once. cardDigest() boils one event
// down to card counts per deck, and buildMetaCards() sums the events in the window into the file the
// builder reads. Nothing here feeds the grade: the grade keeps reading builder.json and matchups.json.
//
// Per deck the file holds:
// - cards: what its top lists run (the top quarter of each event, at least the top 16), from the
//   events since the newest set came out when there are enough of them, else from the whole window.
//   [name, set, number, part P/T/E, usual count, average count when run, share of lists that run it,
//   [[count, share of the lists that run it at that count], ...]]
// - trend: how the share of all its lists that run a card moved, the earlier part of the window
//   against the last two weeks. [name, part, earlier share, recent share]
// - techs: per opponent, cards whose lists won more often against it than lists without them.
//   [name, part, wins with, matches with, wins without, matches without]. A win is a win and a
//   tie is a match that is not a win, the same as matchups.json.

const r2 = x => Math.round(x * 100) / 100;
const clean = (v, max) => String(v == null ? '' : v).replace(/[<>`\u0000-\u001f]/g, '').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().slice(0, max);
const slug = v => clean(v, 60).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
const BASIC_E = /^(?:basic\s+)?(grass|fire|water|lightning|psychic|fighting|darkness|metal)\s+energy$/i;
/** One name per card: "Basic Fire Energy" and "Fire Energy" are the same card. */
const nameOf = n => { const m = String(n).match(BASIC_E); return m ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() + ' Energy' : clean(n, 60); };
const PART = { pokemon: 'P', trainer: 'T', energy: 'E' };
const add = (a, b) => { a[0] += b[0]; a[1] += b[1]; a[2] += b[2]; return a; };

export const CARD_VERSION = 2;

/** A Limitless decklist as Map(name -> { part, n, print }), or null when it is not 60 cards. */
function listOf(dl) {
  if (!dl || typeof dl !== 'object') return null;
  const m = new Map();
  let total = 0;
  for (const part of ['pokemon', 'trainer', 'energy']) {
    if (!Array.isArray(dl[part])) continue;
    for (const c of dl[part]) {
      const n = nameOf(c && c.name), k = Number(c && c.count);
      if (!n || !Number.isInteger(k) || k < 1 || k > 60) return null;
      total += k;
      const set = /^[A-Za-z0-9-]{2,8}$/.test(String(c.set || '')) ? String(c.set).toUpperCase() : '';
      const num = /^[A-Za-z0-9]{1,8}$/.test(String(c.number || '')) ? String(c.number) : '';
      const e = m.get(n) || { part: PART[part], n: 0, prints: {} };
      e.n += k;
      if (set && num) e.prints[set + ' ' + num] = (e.prints[set + ' ' + num] || 0) + k;
      m.set(n, e);
    }
  }
  return total === 60 ? m : null;
}

const V_OPPS = 12;          // per event, records are kept against its most played decks only

/**
 * One event, card by card, kept small: k is the event's card names and p their parts (P/T/E), one
 * letter each, and cards are kept as their place in k.
 * decks[id] = { n: [lists, top lists], c: [[card, lists, copies, { count: top lists at that count }, print]],
 * v: { opponent: [[w, l, t], [card, w, l, t], ...] } }. The first record in v is the deck's own against
 * that opponent; a card is left out when every list of the deck in this event runs it (its record is
 * the deck's). Records are kept for decks with 2 or more lists, against the event's most played decks.
 */
export function cardDigest(t, standings, pairings) {
  const players = standings.length;
  const topCut = Math.max(16, Math.round(players / 4));
  const lists = new Map();   // player -> { id, list }
  const k = [], ki = new Map();
  let p = '';
  const idx = (name, part) => { if (!ki.has(name)) { ki.set(name, k.length); k.push(name); p += part; } return ki.get(name); };
  const raw = {};
  for (const s of standings) {
    const id = slug(s && s.deck && s.deck.id), player = String(s && s.player || '');
    if (!id || id === 'other' || !player) continue;
    const list = listOf(s.decklist);
    if (!list) continue;
    lists.set(player, { id, list });
    const d = raw[id] || (raw[id] = { n: [0, 0], c: new Map(), v: {} });
    const place = Number(s.placing);
    const top = Number.isInteger(place) && place >= 1 && place <= topCut;
    d.n[0]++; if (top) d.n[1]++;
    for (const [name, e] of list) {
      const i = idx(name, e.part);
      const c = d.c.get(i) || (d.c.set(i, [i, 0, 0, {}, {}]), d.c.get(i));
      c[1]++; c[2] += e.n;
      if (top) c[3][e.n] = (c[3][e.n] || 0) + 1;
      for (const [pr, n] of Object.entries(e.prints)) c[4][pr] = (c[4][pr] || 0) + n;
    }
  }
  if (!lists.size) return null;
  const big = new Set(Object.keys(raw).sort((a, b) => raw[b].n[0] - raw[a].n[0]).slice(0, V_OPPS));

  const decided = (pairings || []).filter(x => x && x.player1 && x.player2 && x.winner !== -1 && x.winner != null);
  const withGames = decided.filter(x => x.games && typeof x.games === 'object' && Object.keys(x.games).length).length;
  const recordsGames = decided.length > 0 && withGames >= decided.length * 0.5;
  const side = (me, opp, r) => {
    if (!me || !opp || me.id === opp.id || !big.has(opp.id)) return;
    const d = raw[me.id];
    if (d.n[0] < 2) return;
    const v = d.v[opp.id] || (d.v[opp.id] = { _: [0, 0, 0], c: new Map() });
    add(v._, r);
    for (const name of me.list.keys()) {
      const i = ki.get(name);
      if (d.c.get(i)[1] === d.n[0]) continue;   // every list of this deck runs it: its record is the deck's
      add(v.c.get(i) || (v.c.set(i, [0, 0, 0]), v.c.get(i)), r);
    }
  };
  for (const x of decided) {
    if (recordsGames && !(x.games && Object.keys(x.games).length)) continue;
    const a = lists.get(String(x.player1)), b = lists.get(String(x.player2));
    const w = String(x.winner);
    let r;
    if (w === String(x.player1)) r = [1, 0, 0];
    else if (w === String(x.player2)) r = [0, 1, 0];
    else if (w === '0') r = [0, 0, 1];
    else continue;
    side(a, b, r);
    side(b, a, [r[1], r[0], r[2]]);
  }
  const decks = {};
  for (const [id, d] of Object.entries(raw)) {
    const v = {};
    for (const [opp, x] of Object.entries(d.v)) v[opp] = [x._, ...[...x.c].map(([i, r]) => [i, ...r])];
    decks[id] = {
      n: d.n,
      c: [...d.c.values()].map(c => [c[0], c[1], c[2], c[3], Object.entries(c[4]).sort((a, b) => b[1] - a[1])[0]?.[0] || '']),
      v,
    };
  }
  return { id: String(t.id), date: new Date(t.date).toISOString().slice(0, 10), players, cv: CARD_VERSION, k, p, decks };
}

const MIN_TOP = 8;          // top lists a deck needs to get cards in the file
const CUR_TOP = 24;         // top lists since the newest set before only those are used
const MIN_SHARE = 0.05;     // cards fewer of its top lists run are left out
const MAX_CARDS = 70;
const RECENT_DAYS = 14;     // the trend's recent part: the last two weeks of events
const TREND_LISTS = 20;     // lists each part needs for a trend
const TREND_MOVE = 0.1;     // a share has to move this much to count as rising or falling
const TECH_MIN = 25;        // matches with and without a card before its record counts
const TECH_EDGE = 0.03;     // win rate with it at least this much higher
const TECH_Z = 1.28;        // and unlikely to be chance alone (one sided, about 90%)
const TECH_MAX = 6;
const TECH_SHARE = 0.6;      // a card most lists run is a staple, not a tech

/**
 * meta-cards.json from the card digests of the window's events.
 * opts: { since, newest (set release day), from (set name of the window start), newestName, cols: opponent ids, names: { id: name } }
 */
export function buildMetaCards(events, opts) {
  const ev = events.filter(e => e && e.cv === CARD_VERSION).sort((a, b) => a.date.localeCompare(b.date));
  if (!ev.length) return null;
  const last = ev[ev.length - 1].date;
  const recentFrom = new Date(Date.parse(last) - (RECENT_DAYS - 1) * 86400000).toISOString().slice(0, 10);
  const ids = new Set();
  ev.forEach(e => Object.keys(e.decks).forEach(id => ids.add(id)));
  const decks = [];
  for (const id of ids) {
    const mine = ev.filter(e => e.decks[id]);
    const cur = opts.newest ? mine.filter(e => e.date >= opts.newest) : [];
    const topOf = es => es.reduce((a, e) => a + e.decks[id].n[1], 0);
    const useCur = topOf(cur) >= CUR_TOP;
    const basis = useCur ? cur : mine;
    const tops = topOf(basis);
    if (tops < MIN_TOP) continue;
    // Cards: what the top lists run.
    const t = new Map();
    for (const e of basis) for (const c of e.decks[id].c) {
      const name = e.k[c[0]];
      const x = t.get(name) || { part: e.p[c[0]], hist: {}, prints: {} };
      for (const [k, n] of Object.entries(c[3])) x.hist[k] = (x.hist[k] || 0) + n;
      if (c[4]) x.prints[c[4]] = (x.prints[c[4]] || 0) + c[2];
      t.set(name, x);
    }
    const cards = [];
    for (const [name, x] of t) {
      const runs = Object.values(x.hist).reduce((a, n) => a + n, 0);
      if (!runs || runs / tops < MIN_SHARE) continue;
      const copies = Object.entries(x.hist).reduce((a, [k, n]) => a + k * n, 0);
      const hist = Object.entries(x.hist).map(([k, n]) => [+k, r2(n / runs)]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
      const print = (Object.entries(x.prints).sort((a, b) => b[1] - a[1])[0] || [''])[0].split(' ');
      cards.push([name, print[0] || '', print[1] || '', x.part, hist[0][0], r2(copies / runs), r2(runs / tops), hist]);
    }
    cards.sort((a, b) => b[6] - a[6] || b[4] - a[4] || a[0].localeCompare(b[0]));
    if (!cards.length) continue;
    const all = mine.reduce((a, e) => a + e.decks[id].n[0], 0);

    // Trend: every list, the earlier part of the window against the last two weeks.
    const part = es => {
      const n = es.reduce((a, e) => a + e.decks[id].n[0], 0), runs = new Map(), parts = new Map();
      for (const e of es) for (const c of e.decks[id].c) { const name = e.k[c[0]]; runs.set(name, (runs.get(name) || 0) + c[1]); parts.set(name, e.p[c[0]]); }
      return { n, runs, parts };
    };
    const early = part(mine.filter(e => e.date < recentFrom)), late = part(mine.filter(e => e.date >= recentFrom));
    let trend = null;
    if (early.n >= TREND_LISTS && late.n >= TREND_LISTS) {
      const moves = [];
      for (const name of new Set([...early.runs.keys(), ...late.runs.keys()])) {
        const a = (early.runs.get(name) || 0) / early.n, b = (late.runs.get(name) || 0) / late.n;
        if (Math.abs(b - a) >= TREND_MOVE) moves.push([name, early.parts.get(name) || late.parts.get(name), r2(a), r2(b)]);
      }
      moves.sort((x, y) => Math.abs(y[3] - y[2]) - Math.abs(x[3] - x[2]) || x[0].localeCompare(y[0]));
      trend = { early: early.n, late: late.n, cards: moves.slice(0, 24) };
    }

    // Techs: per opponent, cards whose lists did better against it than lists without them.
    const shareOf = new Map(cards.map(c => [c[0], c[6]]));
    const techs = {};
    for (const opp of opts.cols || []) {
      if (opp === id || opp === 'other') continue;
      const total = [0, 0, 0], withC = new Map(), parts = new Map();
      for (const e of mine) {
        const d = e.decks[id], v = d.v[opp];
        if (!v) continue;
        const own = v[0], by = new Map(v.slice(1).map(x => [x[0], x.slice(1)]));
        add(total, own);
        for (const c of d.c) {
          const name = e.k[c[0]];
          parts.set(name, e.p[c[0]]);
          const r = by.get(c[0]) || (c[1] === d.n[0] ? own : null);
          if (r) add(withC.get(name) || (withC.set(name, [0, 0, 0]), withC.get(name)), r);
        }
      }
      const m = total[0] + total[1] + total[2];
      if (m < TECH_MIN * 2) continue;
      const out = [];
      for (const [name, w] of withC) {
        const mw = w[0] + w[1] + w[2], mo = m - mw, wo = total[0] - w[0];
        if (mw < TECH_MIN || mo < TECH_MIN) continue;
        if (mw / m > TECH_SHARE || (shareOf.get(name) || 0) > TECH_SHARE) continue;
        const pw = w[0] / mw, po = wo / mo, p = total[0] / m;
        const se = Math.sqrt(p * (1 - p) * (1 / mw + 1 / mo));
        if (pw - po < TECH_EDGE || !se || (pw - po) / se < TECH_Z) continue;
        out.push([name, parts.get(name), w[0], mw, wo, mo, (pw - po) / se]);
      }
      out.sort((a, b) => b[6] - a[6]);
      techs[opp] = { rec: total, cards: out.slice(0, TECH_MAX).map(x => x.slice(0, 6)) };
    }
    decks.push({ id, name: (opts.names && opts.names[id]) || id, lists: all, tops, basis: useCur ? 'cur' : 'window', cards: cards.slice(0, MAX_CARDS), trend, techs });
  }
  decks.sort((a, b) => b.lists - a.lists);
  return {
    schema: 1,
    asOf: new Date().toISOString().slice(0, 10),
    since: opts.since, until: last,
    from: opts.from || null,
    newest: opts.newest ? { since: opts.newest, name: opts.newestName || null } : null,
    recent: { since: recentFrom, until: last },
    events: ev.length,
    lists: ev.reduce((a, e) => a + Object.values(e.decks).reduce((b, d) => b + d.n[0], 0), 0),
    note: 'What each meta deck runs, for the RdyDeck deck builder, from Limitless online tournaments. Built weekly by refresh-matchups.mjs with meta-cards.mjs; see that file for the fields.',
    opponents: (opts.cols || []).filter(id => id !== 'other').map(id => [id, (opts.names && opts.names[id]) || id]),
    decks,
  };
}
