
// ═══════════ Against the meta: matchup stats from Limitless ═══════════
// matchups.json sits next to the page and is rebuilt every week by
// refresh-matchups.mjs from Limitless online tournaments and local in-person store events. It holds, per deck
// archetype, the Pokemon its lists usually play and its record against the most
// played decks, kept per source ("online", and "inperson" for local store events of 16 to 63 players).
// The Grade tab matches the open deck to its closest archetype by Pokemon names and
// shows that archetype's win rate against each of the most played decks.
// Every number on screen comes straight from the file. The page never asks Limitless.
const MU60_URL = './matchups.json';
const MU60_KEY = 'pt_mu60';
const MU60_PICK = 'pt_mu60_pick';
const MU60_FEW = 20;      // fewer matches than this is too few to trust
const MU60_CLOSE = 0.45;  // how alike a deck must be to count as that archetype
const MU60_SRC = { online: 'Online', inperson: 'Local in person' };
let mu60Data = null, mu60Busy = false, mu60Tried = false, mu60Src = '';
/** Which results the numbers on screen come from, in words: 'online', 'local in-person', or both. With all set, the picker is ignored (the grade always uses every source). */
function mu60SrcWords(data, all) {
  const d = data || mu60Data, ids = d && Array.isArray(d.sources) ? d.sources.map(s => s.id) : ['online'], src = all ? '' : mu60Src;
  const on = ids.includes('online') && (!src || src === 'online'), ip = ids.includes('inperson') && (!src || src === 'inperson');
  return on && ip ? 'online and local in-person' : ip ? 'local in-person' : 'online';
}

const mu60Id = v => typeof v === 'string' && /^[a-z0-9-]{1,50}$/.test(v) ? v : null;
const mu60Rec = r => Array.isArray(r) && r.length === 3 && r.every(n => Number.isInteger(n) && n >= 0 && n < 1e7) ? r.slice() : null;
// v64: finishes per source, [lists, sum of finish, sum of finish squared, top 8, top 16, top 10%].
// A finish is 1 for first place and 0 for last; the two sums are in thousandths.
function mu64Pl(p) {
  if (!Array.isArray(p) || p.length !== 6 || !p.every(n => Number.isInteger(n) && n >= 0 && n < 1e9)) return null;
  const [n, f, f2, t8, t16, t10] = p;
  return n && f <= n * 1000 && f2 <= f && t8 <= t16 && t16 <= n && t10 <= n ? p.slice() : null;
}
function mu64Pls(o) {
  const out = {};
  if (o && typeof o === 'object') for (const [k, r] of Object.entries(o)) { const s = mu60Id(k), v = mu64Pl(r); if (s && v) out[s] = v; }
  return out;
}
function mu60Recs(o) {
  if (!o || typeof o !== 'object') return null;
  const out = {};
  for (const [k, r] of Object.entries(o)) { const s = mu60Id(k), v = mu60Rec(r); if (s && v) out[s] = v; }
  return Object.keys(out).length ? out : null;
}

/** Check every field. Returns a clean copy, or null when the file is not usable. */
function mu60Validate(j) {
  try {
    if (!j || j.schema !== 1 || !d30Day(j.asOf) || !d30Day(j.since) || !Array.isArray(j.sources) || !Array.isArray(j.decks)) return null;
    const sources = j.sources.slice(0, 5).map(s => s && mu60Id(s.id) && d30Str(s.name, 60) ? {
      id: s.id, name: s.name, url: d30Url(s.url),
      events: Number.isInteger(s.events) ? s.events : 0, matches: Number.isInteger(s.matches) ? s.matches : 0,
      place: mu64Pl(s.place),
    } : null).filter(Boolean);
    // 3.4.14: up to 150 rows (was 60). refresh-matchups.mjs writes the 40 most played decks plus every deck
    // played enough since the newest set, 63 on 16 Nov 2026, so the last ones (Mega Abomasnow) were dropped.
    const decks = j.decks.slice(0, 150).map(d => {
      if (!d || !mu60Id(d.id) || !d30Str(d.name, 50) || !Array.isArray(d.sig)) return null;
      const sig = d.sig.slice(0, 12).filter(s => Array.isArray(s) && d30Str(s[0], 60) && typeof s[2] === 'number' && s[2] > 0 && s[2] <= 1)
        .map(s => [s[0], Number(s[1]) || 0, s[2]]);
      if (!sig.length) return null;
      const vs = {};
      for (const [o, r] of Object.entries(d.vs || {})) { const k = mu60Id(o), v = mu60Recs(r); if (k && v) vs[k] = v; }
      // v61: lists that placed high, as codes (see mu61Code), with the finish and the event.
      const tops = (Array.isArray(d.tops) ? d.tops : []).slice(0, 40)
        .filter(x => Array.isArray(x) && /^[0-9a-f]{8}$/.test(x[0]) && Number.isInteger(x[1]) && x[1] >= 1 && x[1] <= 64 && d30Str(x[2], 80) && d30Day(x[3]))
        .map(x => [x[0], x[1], x[2], x[3]]);
      // v68: results since the newest set came out, which the grade weighs most.
      const cur = d.cur && typeof d.cur === 'object' && Number.isInteger(d.cur.lists)
        ? { lists: d.cur.lists, rec: mu60Recs(d.cur.rec) || {}, place: mu64Pls(d.cur.place) } : null;
      return { id: d.id, name: d.name, share: typeof d.share === 'number' ? d.share : 0,
        lists: Number.isInteger(d.lists) ? d.lists : 0, sig, rec: mu60Recs(d.rec) || {}, vs, tops, place: mu64Pls(d.place), cur };
    }).filter(Boolean);
    const ids = new Set(decks.map(d => d.id));
    const cols = (Array.isArray(j.cols) ? j.cols : []).filter(c => ids.has(c)).slice(0, 12);
    if (!sources.length || decks.length < 2 || cols.length < 2) return null;
    // The oldest set in the window ("since 30th Celebration"), when the file names one.
    const from = j.window && d30Str(j.window.from, 40) ? j.window.from : '';
    const cur = j.cur && typeof j.cur === 'object' && d30Day(j.cur.since)
      ? { since: j.cur.since, events: Number.isInteger(j.cur.events) ? j.cur.events : 0, matches: Number.isInteger(j.cur.matches) ? j.cur.matches : 0, place: mu64Pls(j.cur.place) } : null;
    return { asOf: j.asOf, since: j.since, until: d30Day(j.until) || j.asOf, from, sources, cols, decks, cur };
  } catch (_) { return null; }
}

/** The saved copy at once, the newest copy from the site once per page load. */
function mu60Load() {
  if (!mu60Data) { try { mu60Data = mu60Validate(JSON.parse(safeLocalGet(MU60_KEY) || 'null')); } catch (_) {} }
  if (mu60Busy || mu60Tried) return;
  mu60Busy = true;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), 8000) : 0;
  fetch(MU60_URL, { cache: 'no-cache', signal: ctl ? ctl.signal : undefined })
    .then(r => r.ok ? r.json() : null)
    .then(j => {
      const d = mu60Validate(j);
      if (!d) return;
      const was = mu60Data;
      mu60Data = d;
      safeLocalSet(MU60_KEY, JSON.stringify(j));
      if (!was || was.asOf !== d.asOf) mu60Rerender();
    })
    .catch(() => {})
    .finally(() => { clearTimeout(t); mu60Busy = false; mu60Tried = true; if (typeof g71Redraw === 'function') g71Redraw(); });
}

function mu60Rerender() {
  const pane = document.getElementById('grade-body');
  const scr = document.getElementById('screen-review');
  if (pane && pane.style.display !== 'none' && scr && scr.classList.contains('active')) renderGrade();
}

const mu60Norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** The open deck's closest archetype, by the Pokemon it plays. */
function mu60Match(deck, data) {
  const best = mu60Best(deck, data);
  return best && best.score >= MU60_CLOSE ? best.deck : null;
}
/** v68: the closest archetype and how close it is (0 to 1), for callers that need a surer match. */
const MU60_NEAR = 0.02;
function mu60Best(deck, data, ok) {
  // 3.4.38: copies count too, so a list built on 4 Dunsparce and 2 Mega Lopunny ex is Lopunny Dudunsparce,
  // not Mega Lopunny (which plays no Dunsparce). When two archetypes fit about as well (within MU60_NEAR),
  // the one with more lists wins, since its results rest on more games: a Dragapult list with a single
  // Dudunsparce line is Dragapult (4,158 lists), not Dragapult Dudunsparce (435). Checked on the 132 test
  // lists: 4 borrowed the wrong archetype's results, now 1 (a Raging Bolt Ogerpon list that fits Basic Box
  // just as well).
  const mine = new Map();
  for (const c of deck.cards || []) {
    if (cardCategory(c) !== 'pokemon') continue;
    const n = mu60Norm(c.apiName || c.name);
    if (n) mine.set(n, (mine.get(n) || 0) + (Number(c.count) || 1));
  }
  if (!mine.size) return null;
  // A Pokemon most archetypes play (a support ex, say) says little about which deck this is.
  const df = {};
  data.decks.forEach(d => new Set(d.sig.map(s => mu60Norm(s[0]))).forEach(n => { df[n] = (df[n] || 0) + 1; }));
  const N = data.decks.length;
  const w = n => Math.log(1 + N / (df[n] || 0.5));
  const fits = [];
  for (const d of data.decks) {
    // v76: "Other" is every list no named archetype claims, so its few common Pokemon (Latias ex,
    // Fezandipiti ex) match many real decks. A deck is never matched to it.
    if (d.id === 'other' || (ok && !ok(d))) continue;
    let have = 0, all = 0;
    const theirs = new Set();
    for (const [name, avg, freq] of d.sig) {
      const n = mu60Norm(name);
      if (theirs.has(n)) continue;
      theirs.add(n);
      all += w(n) * freq;
      // Full credit at the archetype's usual count or more, part credit below it.
      if (mine.has(n)) have += w(n) * freq * Math.min(1, mine.get(n) / Math.max(1, avg || 1));
    }
    // How much of my own Pokemon, by copies, the archetype plays.
    let myAll = 0, myHave = 0;
    mine.forEach((q, n) => { const k = w(n) * q; myAll += k; if (theirs.has(n)) myHave += k; });
    const score = all ? 0.7 * have / all + 0.3 * (myAll ? myHave / myAll : 0) : 0;
    fits.push({ deck: d, score });
  }
  if (!fits.length) return null;
  const top = Math.max(...fits.map(f => f.score));
  const pick = fits.filter(f => f.score >= top - MU60_NEAR).sort((a, b) => (b.deck.lists || 0) - (a.deck.lists || 0) || b.score - a.score)[0];
  // top: how well the best fit scored, so a near pick still clears a match threshold the best one clears.
  return Object.assign({}, pick, { top });
}

// v61: the open deck as the same short code refresh-matchups.mjs makes for lists that placed
// (listCode there): card names without set numbers, counts summed, sorted, hashed. Keep in step.
function mu61Code(deck) {
  const n = {};
  let total = 0;
  for (const c of deck.cards || []) {
    const k = String(c.apiName || c.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ').trim().replace(/^basic (?=.* energy$)/, '');
    const q = Number(c.count) || 0;
    if (!k || q < 1) continue;
    n[k] = (n[k] || 0) + q; total += q;
  }
  if (total !== 60) return null;
  const s = Object.keys(n).sort().map(k => k + ':' + n[k]).join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
/** A list that placed in the results, card for card the same as the open deck, or null. */
function mu61Same(deck, data) {
  const code = mu61Code(deck);
  if (!code) return null;
  let best = null;
  for (const d of data.decks) for (const x of d.tops || []) if (x[0] === code && (!best || x[1] < best.place)) best = { deck: d, place: x[1], event: x[2], day: x[3] };
  return best;
}
const mu61Nth = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

function mu60Picks() { try { return JSON.parse(safeLocalGet(MU60_PICK) || '{}') || {}; } catch (_) { return {}; } }
function mu60SetPick(v) {
  const p = mu60Picks();
  if (v) p[state.activeDeckId] = v; else delete p[state.activeDeckId];
  safeLocalSet(MU60_PICK, JSON.stringify(p));
  renderGrade();
  const s = document.getElementById('mu60-sec');
  if (s && s.scrollIntoView) s.scrollIntoView({ block: 'nearest' });
}
function mu60SetSrc(v) { mu60Src = MU60_SRC[v] ? v : ''; renderGrade(); }

/** Wins, losses and ties summed over the sources in use. */
function mu60Sum(recs) {
  const r = [0, 0, 0];
  for (const [k, v] of Object.entries(recs || {})) if (!mu60Src || k === mu60Src) { r[0] += v[0]; r[1] += v[1]; r[2] += v[2]; }
  return r;
}
/**
 * v64: how strong each deck is, from its win rate and how high its lists finish, together.
 * Finishes count by their square, so a list in the top 10% weighs far more than one in the
 * middle. Both parts are pulled toward the field average until a deck has enough results,
 * so a deck with a few lucky lists does not top the table. 100 is an average deck.
 */
const MU64_K = 15, MU64_KM = 40;
function mu64Strength(data) {
  const F = [0, 0, 0, 0, 0, 0];
  for (const s of data.sources) if (s.place && (!mu60Src || s.id === mu60Src)) s.place.forEach((v, i) => { F[i] += v; });
  if (!F[0]) return null;
  let W = 0, M = 0;
  const rows = data.decks.map(d => {
    const p = [0, 0, 0, 0, 0, 0];
    for (const [k, v] of Object.entries(d.place || {})) if (!mu60Src || k === mu60Src) v.forEach((x, i) => { p[i] += x; });
    const r = mu60Sum(d.rec);
    W += r[0]; M += r[0] + r[1] + r[2];
    return { d, p, r };
  }).filter(x => x.p[0]);
  if (rows.length < 3 || !M) return null;
  const fw = W / M, fq = F[2] / 1000 / F[0], ft = F[4] / F[0];
  const out = {};
  for (const x of rows) {
    const m = x.r[0] + x.r[1] + x.r[2];
    const wr = (x.r[0] + MU64_KM * fw) / (m + MU64_KM);
    const q = (x.p[2] / 1000 + MU64_K * fq) / (x.p[0] + MU64_K);
    out[x.d.id] = { idx: 100 * Math.sqrt(wr / fw * q / fq), n: x.p[0], fin: x.p[1] / 1000 / x.p[0], t16: x.p[4], exp: x.p[0] * ft };
  }
  // "Other" is many small decks lumped together, not a deck, so it gets no rank.
  delete out.other;
  const order = Object.keys(out).sort((a, b) => out[b].idx - out[a].idx);
  order.forEach((id, i) => { out[id].rank = i + 1; out[id].of = order.length; });
  out._order = order;
  return out;
}

const mu60Pct = r => { const n = r[0] + r[1] + r[2]; return n ? r[0] / n * 100 : null; };
const mu60Fmt = p => p.toFixed(1) + '%';
const mu60Tone = p => p >= 55 ? 'good' : p < 45 ? 'bad' : '';

// ═══════════ 2.5: matchup chart against the most played decks ═══════════
// The five decks played most right now (matchups.json cols, mirror left out), each with a call:
// Favored or Unfavored for decks like the open one only when the likely range of the win rate
// (90%, Wilson) sits on one side of 50% and the win rate is at least 3 points off even, so a few
// lucky games never read as a favored matchup. A win rate 5 or more points off even without
// enough games for that is a lean. Display only: the grade does not read any of this.
const MC73_TOP = 5, MC73_Z = 1.645, MC73_EDGE = 3, MC73_LEAN = 5;
/** Likely range of a win rate, in percent: [low, high]. */
function mc73Range(w, n) {
  if (!n) return [0, 100];
  const p = w / n, z2 = MC73_Z * MC73_Z, d = 1 + z2 / n;
  const c = (p + z2 / (2 * n)) / d, m = MC73_Z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / d;
  return [Math.max(0, c - m) * 100, Math.min(1, c + m) * 100];
}
/** good, bad, lgood, lbad, even or thin, from a record [wins, losses, ties]. */
function mc73Call(r) {
  const n = r[0] + r[1] + r[2];
  if (n < MU60_FEW) return 'thin';
  const p = r[0] / n * 100, [lo, hi] = mc73Range(r[0], n);
  if (lo > 50 && p >= 50 + MC73_EDGE) return 'good';
  if (hi < 50 && p <= 50 - MC73_EDGE) return 'bad';
  if (p >= 50 + MC73_LEAN) return 'lgood';
  if (p <= 50 - MC73_LEAN) return 'lbad';
  return 'even';
}
const MC73_WORD = { good: 'Favored', bad: 'Unfavored', lgood: 'Leans favored', lbad: 'Leans unfavored', even: 'Even', thin: 'Too few games' };
// The bar runs from 25% to 75% win rate, where nearly every matchup falls, with even in the middle.
const mc73Pos = v => Math.max(0, Math.min(100, (v - 25) * 2));
function mc73Names(xs) {
  const n = xs.map(x => esc(x.opp.name));
  return n.length < 3 ? n.join(' and ') : n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
}
/** rows: [{opp, r, n, p}] from mu60Section, most played first. */
function mc73Chart(rows, data) {
  const xs = rows.map(x => ({ ...x, call: mc73Call(x.r) }));
  const by = k => xs.filter(x => x.call === k);
  const good = by('good'), bad = by('bad');
  const parts = [];
  if (good.length) parts.push(`favored against ${mc73Names(good)}`);
  if (bad.length) parts.push(`unfavored against ${mc73Names(bad)}`);
  let sum = parts.length ? parts.join(', ') : xs.every(x => x.call === 'thin') ? 'too few games against these decks to call yet' : 'no clear edge either way against these decks yet';
  sum = sum[0].toUpperCase() + sum.slice(1) + '.';
  const since = data.cur && data.cur.since ? ` since ${d30Nice(data.cur.since)}` : '';
  const rowsH = xs.map(x => {
    const word = MC73_WORD[x.call];
    let bar = '';
    if (x.call !== 'thin') {
      const [lo, hi] = mc73Range(x.r[0], x.n), a = mc73Pos(Math.min(x.p, 50)), b = mc73Pos(Math.max(x.p, 50));
      bar = `<span class="mc73-band" style="left:${mc73Pos(lo).toFixed(1)}%;width:${(mc73Pos(hi) - mc73Pos(lo)).toFixed(1)}%"></span>`
        + `<span class="mc73-fill" style="left:${a.toFixed(1)}%;width:${(b - a).toFixed(1)}%"></span>`;
    }
    const pct = x.p == null ? 'None' : mu60Fmt(x.p);
    const label = `${x.opp.name}: ${word}, ${pct} over ${x.n} ${x.n === 1 ? 'match' : 'matches'}`;
    return `<div class="mc73-r ${x.call}" role="listitem" aria-label="${esc(label)}">
      <div class="mc73-l1"><span>${esc(x.opp.name)}</span><span class="mc73-v">${word}</span></div>
      <div class="mc73-l2" aria-hidden="true"><span class="mc73-bar">${bar}<span class="mc73-mid"></span></span><span class="mc73-n">${pct}, ${x.n} ${x.n === 1 ? 'match' : 'matches'}</span></div>
    </div>`;
  }).join('');
  return `<div class="mc73-h">Top ${xs.length} decks right now</div>
    <p class="mc73-sum">${sum}</p>
    <div class="mc73" role="list" aria-label="Matchups against the ${xs.length} decks played most${esc(since)}">${rowsH}</div>
    <p class="mu60-f">The line in each bar is 50%. The light band is the likely range from the games so far. Favored and Unfavored need the whole band on one side of 50%.</p>`;
}

function mu60Section(deck) {
  const data = mu60Data;
  if (!data || deck.format === 'expanded' || deck.format === 'prerelease') return '';
  // 3.2.8 (Muse section 4 M10): the box opens on the deck whose results the grade uses, so the two agree.
  let graded = null;
  try { const R = typeof g29Grade === 'function' ? g29Grade(deck) : null; graded = R && R.res ? data.decks.find(d => d.id === R.res.id) || null : null; } catch (_) {}
  const auto = graded || mu60Match(deck, data);
  const pickId = mu60Picks()[deck.id];
  const arch = data.decks.find(d => d.id === pickId) || auto;
  const byName = data.decks.slice().sort((a, b) => a.name.localeCompare(b.name));
  const opts = `<option value=""${arch ? '' : ' selected'}>${auto ? 'Closest match: ' + esc(auto.name) : 'Pick a deck'}</option>`
    + byName.map(d => `<option value="${esc(d.id)}"${pickId === d.id ? ' selected' : ''}>${esc(d.name)}</option>`).join('');
  const srcIds = data.sources.map(s => s.id);
  const srcSel = srcIds.length > 1
    ? `<select class="x-select" aria-label="Results from" onchange="mu60SetSrc(this.value)"><option value="">All results</option>${srcIds.map(id => `<option value="${esc(id)}"${mu60Src === id ? ' selected' : ''}>${esc(MU60_SRC[id] || id)}</option>`).join('')}</select>` : '';
  const days = data.since === data.until ? d30Nice(data.since) : `${d30Nice(data.since)} to ${d30Nice(data.until)}`;
  const span = data.from ? `since ${esc(data.from)} came out (${days})` : days;
  const from = data.sources.filter(s => !mu60Src || s.id === mu60Src);
  const events = from.reduce((a, s) => a + s.events, 0);

  // 3.5.2: folded by default; the folded line gives the record of the deck it is compared with.
  let h = `<details class="g-sec g29-fold" id="mu60-sec"><summary><span class="r38-t"><span class="g-sec-t">Against the meta</span><!--mu60-say--></span></summary>
    <div class="g-sec-i">How ${arch ? 'decks like this one' : 'each deck'} did in ${events} Limitless ${mu60SrcWords(data)} tournaments, ${span}.</div>
    <select class="x-select" aria-label="Deck to compare" onchange="mu60SetPick(this.value)">${opts}</select>${srcSel}`;

  if (!arch) {
    h += `<p class="mu60-p">No deck in recent results plays the same Pokemon as this one. Pick the closest deck above to see its matchups.</p>`;
    const st = mu64Strength(data);
    if (st) h += `<p class="mu60-p">Strongest right now, by win rate and finishes: ${st._order.slice(0, 3).map(id => esc(data.decks.find(d => d.id === id).name)).join(', ')}.</p>`;
  } else {
    const all = mu60Sum(arch.rec), n = all[0] + all[1] + all[2], p = mu60Pct(all);
    if (n) h = h.replace('<!--mu60-say-->', `<span class="r38-line"><span data-no-tr>${esc(arch.name)}</span><span>: ${mu60Fmt(p)} wins over ${n.toLocaleString('en-US')} matches</span></span>`);
    h += n ? `<p class="mu60-p"><b>${esc(arch.name)}</b> won <b>${mu60Fmt(p)}</b> of all ${n.toLocaleString('en-US')} matches against other decks (${all[0]} wins, ${all[1]} losses, ${all[2]} ties).</p>`
      : `<p class="mu60-p">No matches for ${esc(arch.name)} in these results yet.</p>`;
    // v64: placements, weighed with the win rate into one strength rank.
    const st = mu64Strength(data), sa = st && st[arch.id];
    if (sa) h += `<p class="mu60-p">Strength: <b>${mu61Nth(sa.rank)} of ${sa.of}</b> decks, counting wins and how high lists finish. Its ${sa.n} lists finished in the top ${Math.max(1, Math.round((1 - sa.fin) * 100))}% of the field on average, and ${sa.t16} made the top 16, where an average deck with as many lists places ${Math.round(sa.exp)}.</p>`;
    // v61: say whether these numbers are for this exact list. Many players copy a list that placed, card for card.
    const same = mu61Same(deck, data);
    h += same ? `<p class="mu60-f mu61-same">This is the same list, card for card, that finished ${mu61Nth(same.place)} at ${esc(same.event)} on ${d30Nice(same.day)}.${same.deck.id !== arch.id ? ` That list was played as ${esc(same.deck.name)}.` : ''}</p>`
      : `<p class="mu60-f mu61-like">These are results for all ${esc(arch.name)} lists, not your exact list.</p>`;
    const rows = data.cols.filter(c => c !== arch.id).map(c => {
      const opp = data.decks.find(d => d.id === c);
      const r = mu60Sum(arch.vs[c]);
      return { opp, r, n: r[0] + r[1] + r[2], p: mu60Pct(r) };
    }).filter(x => x.opp);
    // 2.5: the five most played decks as a chart with a call each; the rest stay in the table.
    const top = rows.slice(0, MC73_TOP), rest = rows.slice(MC73_TOP);
    if (top.length) h += mc73Chart(top, data);
    let few = false;
    if (rest.length) h += `<div class="mc73-sub">Other popular decks</div><div class="mu60-t" role="table" aria-label="Win rate against other popular decks">
      <div class="mu60-r mu60-h" role="row"><span role="columnheader">Against</span><span role="columnheader">Win rate</span><span role="columnheader">Matches</span></div>
      ${rest.map(x => {
        const thin = x.n < MU60_FEW;
        if (thin) few = true;
        return `<div class="mu60-r${thin ? ' thin' : ''}" role="row"><span role="cell">${esc(x.opp.name)}</span>
          <span role="cell" class="mu60-p2 ${thin || x.p == null ? '' : mu60Tone(x.p)}">${x.p == null ? 'None' : mu60Fmt(x.p)}</span>
          <span role="cell" class="mu60-n">${x.n}</span></div>`;
      }).join('')}</div>`;
    if (few) h += `<p class="mu60-f">Gray rows have fewer than ${MU60_FEW} matches, too few to trust.</p>`;
  }
  const src = from[0] && from[0].url ? from[0].url : 'https://play.limitlesstcg.com/';
  h += `<p class="mu60-f">Data: <a href="${esc(src)}" target="_blank" rel="noopener">Limitless TCG</a>. Ties count as matches, not wins. Mirror matches, byes and no-shows are left out. Updated ${d30Nice(data.asOf)}.</p></details>`;
  return h;
}

(function () {
  const _rg = renderGrade;
  renderGrade = function () {
    const r = _rg.apply(this, arguments);
    try {
      mu60Load();
      const deck = state.decks.find(d => d.id === state.activeDeckId);
      const el = document.getElementById('grade-body');
      const fix = el && el.querySelector('#g29-fix');
      if (!deck || !fix || el.querySelector('#mu60-sec')) return r;
      const h = mu60Section(deck);
      if (!h) return r;
      const after = el.querySelector('#r29-sec') || fix;
      after.insertAdjacentHTML('afterend', h);
    } catch (e) { console.warn('[matchups]', e); }
    return r;
  };
})();
