// ═══════════ 3.5.9: Top decks on home ═══════════
// Mason, 24 Nov 2026: "Lets add a section to the homepage of the top rated decks and up and coming
// decks (based off tourney results)". Two lists from matchups.json, the same file and the same score
// the grade uses, so the home list and a deck's grade always agree:
//   Top rated: the archetypes with the highest Tournament strength (g68Strength, results since the
//     newest set counted three times, every source weighed the way the grade weighs it), with at
//     least TD90_TOP_MIN games, which is where results reach their full share of the grade.
//   Up and coming: since the newest set came out, an archetype with at least TD90_UP_MIN games that
//     beats the field (index 100 or more and at least half its games won), does better than it did before the newest set, and makes
//     up a bigger share of the lists than before. Ranked by how much its index rose. A deck already
//     in Top rated is left out. Before and since are each scored by g68Strength on that window
//     alone, so a change to how sources are weighed (the in-person split) carries over by itself.
// Tapping a deck opens its top tournament list (3.6.0, js/v91-quick-add.js), with its guide when it
// has one; + adds that list to Your decks. Every number comes from the file; nothing here is stored but
// the tab last picked. No ads in this section.
const TD90_TOP_MIN = 250;   // games for Top rated (G68_FULL in js/v69-grade-blend.js)
const TD90_UP_MIN = 100;    // games since the newest set for Up and coming
const TD90_SHOW = 5;        // rows per list
const TD90_PHONE = 3;       // rows on phones until Show more
const TD90_TAB = 'rd_td90_tab';
let td90Tab = (() => { try { return safeLocalGet(TD90_TAB) === 'up' ? 'up' : 'top'; } catch (_) { return 'top'; } })();
let td90More = false, _td90Memo = null;

/** Deck guide pages by archetype id, from deck-guides.json (built into the site's guide pages). */
const TD90_GUIDES = {
  'mega-rayquaza-ex': 'mega-rayquaza', 'dragapult-ex': 'dragapult', 'basic-box-m': 'basic-box', 'slowking-scr': 'slowking',
  'alakazam-dudunsparce': 'alakazam-dudunsparce', 'ogerpon-meganium-hydrapple': 'ogerpon-meganium-hydrapple',
  'dragapult-dudunsparce': 'dragapult-dudunsparce', 'dhelmise-pbl': 'dhelmise', 'n-zoroark': 'ns-zoroark', 'crustle-dri': 'crustle',
  'festival-lead': 'festival-lead', 'mega-excadrill-ex': 'mega-excadrill', 'dragapult-dusknoir': 'dragapult-dusknoir',
  'dragapult-blaziken': 'dragapult-blaziken', 'sharpedo-toxtricity': 'sharpedo-toxtricity', 'talonflame-dusknoir': 'talonflame-dusknoir',
  'lopunny-dudunsparce': 'lopunny-dudunsparce', 'mega-lucario-ex': 'mega-lucario', 'rockets-honchkrow': 'rockets-honchkrow', 'greninja-ex': 'greninja',
};

const td90Add = (a, b, k) => a.map((v, i) => v + k * ((b && b[i]) || 0));
const td90Pos = a => a.map(v => Math.max(0, v));
/** One window of the file as a file of its own: 'cur' (since the newest set) or 'pre' (before it). */
function td90Window(data, which) {
  const curP = (data.cur && data.cur.place) || {};
  const sources = data.sources.map(s => {
    const c = curP[s.id] || null;
    const place = which === 'cur' ? c : s.place ? td90Pos(td90Add(s.place, c, -1)) : null;
    return Object.assign({}, s, { place: place && place[0] ? place : null });
  }).filter(s => s.place);
  const part = (all, cur) => {
    const out = {};
    const ids = new Set(Object.keys(all || {}).concat(Object.keys(cur || {})));
    ids.forEach(k => {
      const c = (cur && cur[k]) || null, a = (all && all[k]) || null;
      const v = which === 'cur' ? c : a ? td90Pos(td90Add(a, c, -1)) : null;
      if (v && v.some(n => n > 0)) out[k] = v;
    });
    return out;
  };
  const decks = data.decks.map(d => Object.assign({}, d, {
    rec: part(d.rec, d.cur && d.cur.rec), place: part(d.place, d.cur && d.cur.place), cur: null,
  }));
  return { asOf: data.asOf, since: data.since, sources, decks, cur: null, cols: data.cols };
}
/** Lists in a window: per deck and for the whole field, from the finishes. */
function td90Lists(w) {
  const field = w.sources.reduce((a, s) => a + ((s.place && s.place[0]) || 0), 0);
  const per = {};
  w.decks.forEach(d => { per[d.id] = Object.values(d.place || {}).reduce((a, p) => a + (p[0] || 0), 0); });
  return { field, per };
}

/** Both lists, worked out once per copy of the file. */
function td90Lists2(data) {
  if (_td90Memo && _td90Memo.data === data) return _td90Memo.out;
  const out = { top: [], up: [] };
  try {
    const S = g68Strength(data);
    const names = {};
    data.decks.forEach(d => { names[d.id] = d.name; });
    out.top = Object.keys(S).filter(id => id !== 'other' && S[id].games >= TD90_TOP_MIN)
      .map(id => ({ id, name: names[id], score: S[id].score, idx: S[id].idx, wr: S[id].wr, games: S[id].games }))
      .sort((a, b) => b.score - a.score || b.idx - a.idx).slice(0, TD90_SHOW);
    if (data.cur) {
      const C = td90Window(data, 'cur'), P = td90Window(data, 'pre');
      const SC = g68Strength(C), SP = g68Strength(P);
      const LC = td90Lists(C), LP = td90Lists(P);
      const inTop = new Set(out.top.map(x => x.id));
      out.up = Object.keys(SC).filter(id => id !== 'other' && !inTop.has(id) && S[id] && SC[id].games >= TD90_UP_MIN).map(id => {
        const c = SC[id], p = SP[id] || null;
        const shareC = LC.field ? LC.per[id] / LC.field : 0, shareP = LP.field && LP.per[id] ? LP.per[id] / LP.field : 0;
        return { id, name: names[id], score: S[id].score, idx: c.idx, was: p ? p.idx : 100, wr: c.wr, wasWr: p && p.games ? p.wr : null,
          games: c.games, shareC, shareP };
      }).filter(x => x.idx >= 100 && x.wr >= 0.5 && x.idx > x.was && x.shareC > x.shareP)
        .sort((a, b) => (b.idx - b.was) - (a.idx - a.was)).slice(0, TD90_SHOW);
    }
  } catch (e) { console.warn('[top decks]', e); }
  _td90Memo = { data, out };
  return out;
}

const td90Pct = v => Math.round(v * 100) + '%';
const td90Sh = v => (Math.round(v * 1000) / 10).toFixed(1) + '%';
const td90Num = n => Math.round(n).toLocaleString('en-US');
function td90Row(x, i, kind) {
  const sub = kind === 'up'
    ? (x.shareP ? `${td90Pct(x.wr)} wins, ${td90Sh(x.shareC)} of lists, up from ${td90Sh(x.shareP)}` : `${td90Pct(x.wr)} wins, ${td90Sh(x.shareC)} of lists, new since the newest set`)
    : `${td90Pct(x.wr)} wins over ${td90Num(x.games)} games`;
  const score = typeof gR1 === 'function' ? gR1(x.score) : Math.round(x.score * 10) / 10;
  const id = esc(x.id);
  // 3.6.0: every row opens the deck's top tournament list (js/v91-quick-add.js); + adds it to Your decks.
  return `<div class="td90-row td91-row${i >= TD90_PHONE ? ' td90-x' : ''}">
    <button type="button" class="td91-open" onclick="td91Open('${id}')"><span class="td90-rk">${i + 1}</span><span class="td90-tx"><span class="td90-nm" data-no-tr>${esc(x.name)}</span><span class="td90-sub">${sub}</span></span>
    <span class="td90-sc">${kind === 'up' ? '<svg class="ic" aria-hidden="true"><use href="#i-trend"/></svg>' : ''}<b>${score.toFixed(1)}</b></span></button>
    <button type="button" class="td91-add" onclick="td91Add('${id}')" aria-label="Add the top list to your decks" title="Add the top list to your decks"><svg class="ic" aria-hidden="true"><use href="#i-plus"/></svg></button></div>`;
}

function renderTopDecks() {
  const box = document.getElementById('td90');
  if (!box) return;
  const data = typeof mu60Data !== 'undefined' ? mu60Data : null;
  if (!data) {
    box.hidden = false;
    box.querySelector('.td90-body').innerHTML = `<p class="td90-note">${typeof mu60Tried !== 'undefined' && mu60Tried ? 'Tournament results did not load. Check your connection.' : 'Loading tournament results…'}</p>`;
    return;
  }
  const L = td90Lists2(data);
  if (!L.top.length) { box.hidden = true; return; }
  box.hidden = false;
  box.querySelectorAll('.td90-tabs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === td90Tab)));
  const rows = td90Tab === 'up' ? L.up : L.top;
  const src = typeof mu60SrcWords === 'function' ? mu60SrcWords(data, true) : 'online';
  const list = rows.length
    ? `<div class="td90-list${td90More ? ' td90-open' : ''}">${rows.map((x, i) => td90Row(x, i, td90Tab)).join('')}</div>`
    : `<p class="td90-note">No deck is climbing right now. Check back after the next weekly update.</p>`;
  const more = rows.length > TD90_PHONE
    ? `<button type="button" class="td90-more" aria-expanded="${td90More}" onclick="td90More=!td90More;renderTopDecks()">${td90More ? 'Show less' : 'Show more'}</button>` : '';
  const how = td90Tab === 'up'
    ? `<span>Since the newest set: at least ${TD90_UP_MIN} games, 50% wins or more, and both its results and its share of lists went up.</span>`
    : `<span>Scores are Tournament strength out of 10, from ${src} events, updated weekly.</span>`;
  box.querySelector('.td90-body').innerHTML = list + more + `<p class="td90-note">${how} <span>Tap a deck for its top tournament list. Tap + to add it to your decks.</span></p>`;
}
function td90SetTab(t) {
  td90Tab = t === 'up' ? 'up' : 'top';
  td90More = false;
  try { safeLocalSet(TD90_TAB, td90Tab); } catch (_) {}
  renderTopDecks();
}
/** A deck with no guide yet: the deck builder, started from the cards most of its top lists run. */
function td90Build(id) {
  if (typeof openBuilder !== 'function') return;
  openBuilder();
  bldData().then(() => {
    const d = bldMeta && bldMeta.decks.find(x => x.id === id);
    if (!d) { bldStartMeta(); return; }
    bldConfirmReplace(() => {
      const core = bldCore(d), n = core.reduce((a, r) => a + r.count, 0);
      bldReset(core, { arch: d.id, name: d.name });
      showToast(n < 60 ? `${d.name}: the ${n} cards most top lists run. Fill the other ${60 - n} from Suggestions.` : `${d.name}: the cards most top lists run, at their usual counts.`);
    });
  });
}

// Drawn with home, which is drawn again once the newest results arrive (g71Redraw).
(function () {
  if (typeof renderHome !== 'function') return;
  const _h = renderHome;
  renderHome = function () {
    const r = _h.apply(this, arguments);
    try { renderTopDecks(); } catch (e) { console.warn('[top decks]', e); }
    return r;
  };
  try { renderTopDecks(); } catch (_) {}
})();
