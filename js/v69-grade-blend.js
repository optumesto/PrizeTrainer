
// ═══════════ v69 (2.4): the grade blends in how the deck does in tournaments ═══════════
// The card grade (Synergy times Power) reads the list. It cannot see matchups, how often a deck
// draws into its plan, or how it plays, and on 11 Nov 2026 it ranked archetypes no better than
// chance against their results. So when the open deck matches an archetype in matchups.json, part
// of the grade comes from that archetype's win rate and finishes. Results since the newest set count
// three times. The share grows with the games behind it, to at most 60%, so a deck with few games
// leans on its cards. A list that is broken (a card grade under 6) gets less of it, and a list held
// at the legality cap gets none.
// v71: an average record scores 8.0 on results (was 8.5), so an average deck no longer reads as
// Tournament-ready on its record alone. Checked on the 130 test lists: grades fall 0.1 to 0.3, and
// the rank match with win rates holds (+0.79 all results, +0.49 since the newest set).
const G68_MATCH = 0.45, G68_CUR = 3, G68_WMAX = 0.6, G68_N0 = 400, G68_SLOPE = 0.07, G68_MID = 8.0, G68_KM = 40, G68_K = 15;
let _g68Memo = null;
function g68Strength(data) {
  if (_g68Memo && _g68Memo.data === data) return _g68Memo.out;
  const plus = (a, b, k) => a.map((v, i) => v + k * ((b && b[i]) || 0));
  const F0 = [0, 0, 0, 0, 0, 0];
  let F = F0.slice();
  for (const s of data.sources) if (s.place) F = plus(F, s.place, 1);
  if (data.cur && data.cur.place) for (const v of Object.values(data.cur.place)) F = plus(F, v, G68_CUR - 1);
  const rows = data.decks.map(d => {
    let r = [0, 0, 0], p = F0.slice();
    for (const v of Object.values(d.rec || {})) r = plus(r, v, 1);
    for (const v of Object.values(d.place || {})) p = plus(p, v, 1);
    if (d.cur) {
      for (const v of Object.values(d.cur.rec || {})) r = plus(r, v, G68_CUR - 1);
      for (const v of Object.values(d.cur.place || {})) p = plus(p, v, G68_CUR - 1);
    }
    return { d, r, p };
  }).filter(x => x.p[0] && x.d.id !== 'other');
  let W = 0, M = 0;
  rows.forEach(x => { W += x.r[0]; M += x.r[0] + x.r[1] + x.r[2]; });
  const out = {};
  if (rows.length >= 3 && M && F[0]) {
    const fw = W / M, fq = F[2] / 1000 / F[0];
    for (const x of rows) {
      const m = x.r[0] + x.r[1] + x.r[2];
      const wr = (x.r[0] + G68_KM * fw) / (m + G68_KM);
      const q = (x.p[2] / 1000 + G68_K * fq) / (x.p[0] + G68_K);
      const idx = 100 * Math.sqrt(wr / fw * q / fq);
      const curR = x.d.cur ? Object.values(x.d.cur.rec || {}).reduce((a, v) => plus(a, v, 1), [0, 0, 0]) : [0, 0, 0];
      const all = Object.values(x.d.rec || {}).reduce((a, v) => plus(a, v, 1), [0, 0, 0]);
      out[x.d.id] = { idx, n: m, score: gClamp(G68_MID + G68_SLOPE * (idx - 100), 3, 10), wrUsed: m ? x.r[0] / m : null,
        wr: (all[0] + all[1] + all[2]) ? all[0] / (all[0] + all[1] + all[2]) : null, games: all[0] + all[1] + all[2],
        curGames: curR[0] + curR[1] + curR[2], curWr: (curR[0] + curR[1] + curR[2]) ? curR[0] / (curR[0] + curR[1] + curR[2]) : null };
    }
  }
  _g68Memo = { data, out };
  return out;
}
/** The archetype the grade uses: the player's own pick on the meta section, else the closest match. */
function g68Arch(deck, data) {
  try { const pick = mu60Picks()[deck.id]; const d = pick && data.decks.find(x => x.id === pick); if (d) return { deck: d, score: 1, pick: true }; } catch (_) {}
  // The grade only borrows results from an archetype whose named Pokemon the deck plays, so an
  // Archaludon list never takes Mega Excadrill's record just because they share support cards.
  const mons = (deck.cards || []).filter(c => cardCategory(c) === 'pokemon').map(c => ' ' + mu60Norm(c.apiName || c.name) + ' ');
  const best = mu60Best(deck, data, d => g68Need(d).every(p => mons.some(n => n.includes(' ' + p + ' '))));
  return best && best.score >= G68_MATCH ? best : null;
}
const G68_STOP = new Set(['box', 'lead', 'festival', 'basic', 'ex', 'toolbox', 'control', 'turbo']);
/** The Pokemon an archetype's name asks for: "Mega Charizard Y" is one, "Dragapult Dudunsparce" two. */
function g68Named(name) {
  const t = mu60Norm(name).split(' ').filter(x => x && !G68_STOP.has(x)), out = [];
  for (let i = 0; i < t.length; i++) {
    const p = [t[i]];
    while (i + 1 < t.length && (p[p.length - 1] === 'mega' || p[p.length - 1] === 's' || t[i + 1] === 's' || /^[xy]$/.test(t[i + 1]))) p.push(t[++i]);
    out.push(p.join(' '));
  }
  return out;
}
/** v71: the Pokemon a deck must play to borrow an archetype's results. An archetype whose name
 *  names no Pokemon ("Basic Box", "Festival Lead") asks for its two most played Pokemon instead,
 *  so not every deck passes the check. */
function g68Need(d) {
  const named = g68Named(d.name);
  if (named.length) return named;
  const sig = (d.sig || []).filter(s => s[2] >= 0.9).slice().sort((a, b) => b[1] - a[1]).slice(0, 2).map(s => mu60Norm(s[0]));
  return sig.length ? sig : ['\u0000'];
}
// 2.6.8: how a list's Energy count compares with what its archetype's winning lists run
// (meta-cards.json: the top quarter of each Limitless online event). Every top list in the grade
// check sits inside the band, so a winning build is never graded down. A list far outside it is, and
// borrows less of the archetype's results, since those were won with a different build.
// 2.7.2: the same for the cards nearly every winning list runs (the core). A card's core count is the
// most copies that 95% of the archetype's top lists run. Real top lists sometimes swap a few of those
// copies for another card, so the first G88_FREE copies short are free and only a list short by more
// than any top list in the grade check is graded down, gently.
const G88_KEY = 'pt_builds2', G88_TOPS = 20, G88_TOL = 3, G88_TOLF = 0.3, G88_PER = 0.25, G88_CAP = 1.5, G88_FIT = 6, G88_MATCH = 0.6;
const G88_CORE = 0.95, G88_FREE = 4, G88_CPER = 0.2, G88_CCAP = 1.2, G88_CFIT = 8, G88_ALL = 2;
let g88Data = null, g88Busy = false, g88Tried = false;
/** Read meta-cards.json, or the summary saved from it: per archetype, the Energy its top lists run and its core cards. */
function g88Set(j) {
  if (!j || typeof j !== 'object') return false;
  let e = j.e;
  if (!e && Array.isArray(j.decks)) {
    e = {};
    for (const d of j.decks) {
      if (!d || typeof d.id !== 'string' || !Array.isArray(d.cards) || !(d.tops >= G88_TOPS)) continue;
      // Average copies when run, times the share of top lists that run it, summed over the Energy.
      let n = 0;
      const core = [];
      for (const c of d.cards) {
        if (!Array.isArray(c) || !(c[6] > 0)) continue;
        if (c[3] === 'E') { if (c[5] > 0) n += c[5] * c[6]; continue; }
        if (!Array.isArray(c[7])) continue;
        // The share of all top lists that run at least k copies, for k from 1 to 4.
        let k0 = 0;
        for (let k = 1; k <= 4; k++) if (c[6] * c[7].reduce((a, h) => a + (Array.isArray(h) && h[0] >= k ? +h[1] || 0 : 0), 0) >= G88_CORE) k0 = k;
        if (k0) core.push([String(c[0]), k0]);
      }
      if (n > 0 || core.length) e[d.id] = [Math.round(n * 10) / 10, d.tops, core];
    }
  }
  if (!e || typeof e !== 'object' || Object.keys(e).length < 5) return false;
  g88Data = { asOf: String(j.asOf || ''), e };
  return true;
}
/** The saved summary at once, the newest meta-cards.json from the site once per page load. */
function g88Load() {
  if (!g88Data) { try { g88Set(JSON.parse(safeLocalGet(G88_KEY) || 'null')); } catch (_) {} }
  if (g88Busy || g88Tried) return;
  g88Busy = true;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), 8000) : 0;
  fetch('meta-cards.json', { cache: 'no-cache', signal: ctl ? ctl.signal : undefined })
    .then(r => r.ok ? r.json() : null)
    .then(j => { const was = g88Data && g88Data.asOf; if (j && g88Set(j)) { safeLocalSet(G88_KEY, JSON.stringify(g88Data)); if (was !== g88Data.asOf) mu60Rerender(); } })
    .catch(() => {})
    .finally(() => { clearTimeout(t); g88Busy = false; g88Tried = true; if (typeof g71Redraw === 'function') g71Redraw(); });
}
/** 2.7.3: an Item that searches the deck for Basic Energy into the hand, without attaching it. */
function g273ESearch(c) {
  const t = gtNorm((Array.isArray(c.rules) ? c.rules.join(' ') : c.rules || c.rt || '') || '');
  if (t) return /search your deck for (?:up to \d+ |a |an |\d+ )?basic [a-z ]{0,20}energy cards?/.test(t) && !/\battach/.test(t);
  return /^energy search\b/i.test(String(c.name || ''));
}
/** How far the list is from its archetype's winning lists (Energy and core cards), and what that costs the grade. */
function g88Check(deck, arch, m) {
  if (!g88Data || !arch || !m || !(m.pick || m.score >= G88_MATCH)) return null;
  const x = g88Data.e[arch.id];
  if (!Array.isArray(x)) return null;
  const cards = deck.cards || [];
  let n = 0, srch = 0;
  const have = new Map();
  for (const c of cards) {
    const q = +c.count || 0;
    const cat = cardCategory(c);
    if (cat === 'energy') n += q;
    else if (cat === 'trainer' && g273ESearch(c)) srch += q;
    const k = g76Key(c.name);
    have.set(k, (have.get(k) || 0) + q);
  }
  const out = { name: arch.name, tops: x[1], pen: 0, fit: 1 };
  // 2.7.3: an Item that puts a Basic Energy card from the deck into the hand (Energy Search) counts
  // as half an Energy toward a list that runs fewer Energy than its archetype, never past what the
  // archetype runs, since it finds an Energy but is not one.
  const raw = n;
  if (srch && n < x[0]) n = Math.min(x[0], n + srch / 2);
  // Energy, as in 2.6.8.
  if (n && x[0] > 0) {
    const exp = x[0], tol = Math.max(G88_TOL, G88_TOLF * exp), off = Math.abs(n - exp) - tol;
    const pen = off > 0 ? Math.min(G88_CAP, Math.round(G88_PER * off * 10) / 10) : 0;
    if (pen >= 0.1) {
      out.energy = { n, raw, srch: n > raw ? srch : 0, exp, lo: Math.max(0, Math.ceil(exp - tol)), hi: Math.floor(exp + tol), more: n > exp, pen };
      out.pen += pen; out.fit *= gClamp(1 - off / G88_FIT, 0, 1);
    }
  }
  // Core cards: copies short of what 95% of top lists run.
  const core = Array.isArray(x[2]) ? x[2] : [];
  if (core.length && cards.length) {
    const miss = [];
    let short = 0;
    for (const r of core) {
      if (!Array.isArray(r) || !(r[1] > 0)) continue;
      const h = have.get(g76Key(r[0])) || 0;
      if (h < r[1]) { short += r[1] - h; miss.push({ name: r[0], want: r[1], have: h }); }
    }
    const over = short - G88_FREE;
    const pen = over > 0 ? Math.min(G88_CCAP, Math.round(G88_CPER * over * 10) / 10) : 0;
    if (pen >= 0.1) {
      miss.sort((a, b) => (b.want - b.have) - (a.want - a.have));
      out.core = { short, miss, pen };
      out.pen += pen; out.fit *= gClamp(1 - over / G88_CFIT, 0, 1);
    }
  }
  if (!out.energy && !out.core) return null;
  out.pen = Math.min(G88_ALL, Math.round(out.pen * 10) / 10);
  return out;
}
/** Grade a list down for Energy or core cards far from its archetype's winning lists, with fixes for What to fix. */
function g88Apply(R, deck, arch, m) {
  const b = g88Check(deck, arch, m);
  if (!b) return null;
  const before = R.overall;
  R.overall = gR1(Math.max(0, before - b.pen));
  R.build = Object.assign(b, { before, after: R.overall });
  const f = R.via && R.via.findings;
  if (Array.isArray(f)) {
    const e = b.energy, c = b.core;
    if (e) {
      // The older "Heavy on Energy" check says the same thing with a general range, so this replaces it.
      for (const o of [R.coh && R.coh.flaws, f]) if (Array.isArray(o)) for (let i = o.length - 1; i >= 0; i--) if (o[i] && o[i].t === 'Heavy on Energy') o.splice(i, 1);
      f.push({ sev: 'warn', t: `${e.more ? 'Heavy' : 'Light'} on Energy for ${b.name}`,
        d: `${b.name} lists that finished in the top quarter of recent online tournaments run about ${Math.round(e.exp)} Energy. This list runs ${e.srch ? `${e.raw}, and its ${e.srch} Energy search Item${e.srch > 1 ? 's count' : ' counts'} as ${e.n - e.raw} more, so ${e.n}` : e.n}, outside the ${e.lo} to ${e.hi} the grade allows. ` +
          (e.more ? `The extra Energy takes the place of draw and search, so many turns open with Energy you cannot use. Trade some for draw or search cards.`
            : `With fewer, attackers often miss an attachment and fall behind. Add Energy back.`) });
    }
    if (c) {
      const top = c.miss.slice(0, 4).map(x => `${x.name} (${x.have ? `${x.have} of ${x.want}` : `none of ${x.want}`})`);
      f.push({ sev: 'warn', t: `Missing ${b.name} staples`,
        d: `Nearly every ${b.name} list that finished in the top quarter of recent online tournaments runs these, and this one is ${c.short} copies short: ${top.join(', ')}${c.miss.length > 4 ? ` and ${c.miss.length - 4} more` : ''}. A few swaps are normal, so the first ${G88_FREE} copies cost nothing. Add the rest back unless you have a reason not to.` });
    }
  }
  return b;
}
/** One plain sentence on the build check, for under the grade. */
function g88Line(R) {
  const b = R && R.build; if (!b) return '';
  const why = [];
  if (b.energy) why.push(`runs ${b.energy.raw} Energy${b.energy.srch ? ` (${b.energy.n} with its Energy search)` : ''}, where ${esc(b.name)} top lists run about ${Math.round(b.energy.exp)}`);
  if (b.core) why.push(`is ${b.core.short} copies short of the cards nearly every ${esc(b.name)} top list runs`);
  return ` The list ${why.join(' and ')}, so the card grade drops ${b.pen.toFixed(1)} to ${b.after.toFixed(1)}${R.res && b.fit < 1 ? ' and leans less on those lists\' results' : ''}.`;
}
function g68Blend(R, deck) {
  if (!R || !deck || !mu60Data) return R;
  if (deck.format === 'expanded' || deck.format === 'prerelease' || deck.daily || R.rawOverall != null) return R;
  if (!(deck.cards || []).some(c => c.supertype)) return R;
  const m = g68Arch(deck, mu60Data);
  if (!m) return R;
  const arch = m.deck;
  const b = g88Apply(R, deck, arch, m);
  const st = g68Strength(mu60Data)[arch.id];
  if (!st) return R;
  const card = R.overall;
  let w = G68_WMAX * st.n / (st.n + G68_N0) * (b ? b.fit : 1);
  if (card < 6) w *= gClamp((card - 4) / 2, 0, 1);
  if (w < 0.01) return R;
  R.cardOverall = card;
  R.overall = gR1(card * (1 - w) + st.score * w);
  // v71: wr is the win rate the score was built from (games since the newest set counted three
  // times), and thin follows the share results actually get, not a separate game count.
  R.res = { id: arch.id, name: arch.name, match: Math.round(m.score * 100) / 100, pick: !!m.pick, w, score: st.score, idx: st.idx, wr: st.wrUsed, games: st.games, curGames: st.curGames, curWr: st.curWr,
    since: mu60Data.from || '', curSet: mu60Data.cur ? mu60Data.cur.since : '', asOf: mu60Data.asOf || '', thin: w < 0.2 };
  return R;
}
/** One plain sentence on the results part, for under the grade. */
function g68Line(R) {
  const r = R && R.res; if (!r) return '';
  const pct = Math.round(r.w * 100), wr = r.wr != null ? (r.wr * 100).toFixed(1) + '%' : '';
  const asOf = r.asOf && typeof d30Nice === 'function' ? ' (as of ' + esc(d30Nice(r.asOf)) + ')' : '';
  return ` ${pct}% of the grade comes from ${esc(r.name)}'s online tournament results${r.since ? ' since ' + esc(r.since) : ''}${asOf}: ${wr} wins over ${r.games.toLocaleString('en-US')} games${r.curGames ? ', with games since the newest set counted three times' : ''}. Those results alone score ${r.score.toFixed(1)}, so the list's ${R.cardOverall.toFixed(1)} becomes ${R.overall.toFixed(1)}.${r.thin ? ' There are few games so far, so results count for little.' : ''}${r.pick ? '' : ' If that is the wrong deck, pick the right one under Against the meta.'}`;
}
(function () {
  const _grade = gradeDeck;
  gradeDeck = function (deck) {
    const R = _grade.apply(this, arguments);
    try { return g68Blend(R, deck); } catch (_) { return R; }
  };
  const _sig = g29Sig;
  g29Sig = function (deck) {
    let pick = '';
    try { pick = mu60Picks()[deck.id] || ''; } catch (_) {}
    // 2.5.1: and when the Trainer data (builder.json) arrives, so a grade made before it is not reused.
    return _sig.apply(this, arguments) + '|mu' + (mu60Data ? mu60Data.asOf : '') + ':' + pick + '|g76' + (g76Played ? g76N : 0) + '|g88' + (g88Data ? g88Data.asOf + ':2' : '');
  };
  const _how = g67HowLine;
  g67HowLine = function (R, synV, powV) {
    // The Synergy times Power sum explains the card grade; the results sentence explains the rest.
    // 2.6.8: and the Energy sentence explains a drop from that sum to the card grade.
    const b = R && R.build;
    const card = R && (R.res || b) ? Object.assign({}, R, { overall: b ? b.before : R.cardOverall }) : R;
    return _how.call(this, card, synV, powV) + g88Line(R) + g68Line(R);
  };
  // Read the saved results at once, so grades in the deck list match the grade screen.
  try { mu60Load(); } catch (_) {}
  try { g88Load(); } catch (_) {}
})();
