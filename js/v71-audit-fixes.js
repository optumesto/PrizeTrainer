
// ═══════════ v71 (2.4.2): fixes from the 11 Nov 2026 evening audit ═══════════

// 1. A grade never changes after it shows. A deck's grade reads three things that load on their
// own time: the card data, the check for reprints that decides which cards are Standard legal,
// and the tournament results. Until all three have settled for a deck, home and the Grade tab
// say "Grading" instead of a number, so the number a player sees is the one that stays.
const g71On = () => typeof navigator === 'undefined' || navigator.onLine !== false;
/** What the deck's grade still waits for: 'cards', 'rot', 'results', or '' when it is final. */
// v72 (2.4.3): a grade never waits more than G71_MAX. Card reads go one deck at a time and the card
// APIs can be slow, so a home with several decks could sit at "Grading" for minutes. After the
// limit the grade shows from what has loaded, and that deck stops waiting for this visit.
const G71_MAX = 6000;
// 3.2.7: card data is held for longer (Mason: hold the grade until all cards are loaded). A deck whose
// card read is under way waits up to G71_CARDS_MAX; a grade that shows without every card is marked Not final.
const G71_CARDS_MAX = 60000;
const _g71Since = new Map(), _g71Late = new Set();
/** True when the deck's saved card data is from an older card reader, so the grade would read it wrong. */
const g71Stale = deck => (deck.enrichVer || 0) < ENRICH_VER;
function g71Wait(deck) {
  if (!deck || _g71Late.has(deck.id)) return '';
  const w = g71WaitFor(deck);
  if (!w) { _g71Since.delete(deck.id); return ''; }
  const t0 = _g71Since.get(deck.id);
  if (t0 == null) { _g71Since.set(deck.id, Date.now()); setTimeout(() => g71Redraw(), G71_MAX + 100); setTimeout(() => g71Redraw(), G71_CARDS_MAX + 100); return w; }
  if (Date.now() - t0 >= (w === 'cards' ? G71_CARDS_MAX : G71_MAX)) { _g71Late.add(deck.id); return ''; }
  return w;
}
function g71WaitFor(deck) {
  if (!deck || !(deck.cards || []).some(c => c.supertype) || deck.format === 'prerelease') return '';
  const on = g71On();
  // v72: only a deck whose saved card data is out of date waits for a new read. One that only has
  // a few cards the APIs could not read (a new promo, say) grades from what it has: a read again
  // usually finds the same, and waiting for it held whole homes at "Grading".
  // 3.2.7: a deck with cards the last read missed waits for one more read too, so the grade does not
  // show from part of the list (an unread Trainer counted as no Supporter, say).
  const gaps = g71Stale(deck) || g71Gaps(deck);
  if ((_dataBusy.has(deck.id) || _g71Queued.has(deck.id)) && gaps) return 'cards';
  if (on && gaps && !_dataTried.has(deck.id)) return 'cards';
  if (deck.format === 'expanded' || deck.daily) return '';
  if (_r29Busy.has(deck.id)) return 'rot';
  if (on && !_r29Tried.has(deck.id) && r29NeedsCheck(deck, r29Rows(deck)).length) return 'rot';
  if (mu60Busy || (on && !mu60Tried)) return 'results';
  if (g76Busy || (on && !g76Tried)) return 'results';
  return '';
}
/** 3.2.7: cards the last read of this deck did not find. */
function g71Gaps(deck) { const c = deck && deck.coverage; return !!(c && c.total && c.unresolved > 0); }
/** 3.2.7: copies the grade has no card data for (or no Trainer kind, which the Supporter count needs). */
function g71Unread(R) { return ((R && R.entries) || []).reduce((a, e) => a + (!e.card || (e.card.t === 'trainer' && !e.card.tt) ? e.qty : 0), 0); }
/** 3.2.7: true when a grade shows without every card read, so it is marked Not final and is not kept or shared. */
function g71NotFinal(deck, R) {
  if (!deck || !(deck.cards || []).some(c => c.supertype) || deck.format === 'prerelease') return false;
  return g71Stale(deck) || g71Gaps(deck) || g71Unread(R) > 0;
}
/** 3.2.7: read the deck's cards again from the Not final note. */
function g71Retry() {
  const deck = state.decks.find(d => d.id === state.activeDeckId);
  if (!deck) return;
  _dataTried.delete(deck.id); _g71Late.delete(deck.id); _g71Since.delete(deck.id);
  g71Kick(deck); g71Redraw();
}
// Card data is read for one deck at a time, so a home full of decks does not flood the card APIs.
let _g71Q = Promise.resolve();
const _g71Queued = new Set();
/** Start whatever the grade waits for. */
function g71Kick(deck) {
  const w = g71Wait(deck);
  if (w === 'cards' && !_dataBusy.has(deck.id) && !_g71Queued.has(deck.id)) {
    _g71Queued.add(deck.id);
    _g71Q = _g71Q.then(() => refreshDeckData(deck)).catch(() => {}).then(() => { _g71Queued.delete(deck.id); });
  } else if (w === 'rot' && !_r29Busy.has(deck.id)) r29CheckReprints(deck);
  else if (w === 'results') { if (!mu60Busy) mu60Load(); if (!g76Busy) g76Load(); }
}
let _g71T = 0;
/** Draw home and the open Grade tab again once something a grade waits for has loaded. */
function g71Redraw() {
  clearTimeout(_g71T);
  _g71T = setTimeout(() => {
    try {
      const home = document.getElementById('screen-home');
      if (home && home.classList.contains('active')) renderHome();
      const pane = document.getElementById('grade-body'), scr = document.getElementById('screen-review');
      if (pane && pane.style.display !== 'none' && scr && scr.classList.contains('active')) renderGrade();
    } catch (_) {}
  }, 60);
}
(function () {
  const _refresh = refreshDeckData;
  refreshDeckData = async function (deck) {
    try { return await _refresh.apply(this, arguments); }
    finally { if (deck) { const w = g71Wait(deck); if (w) g71Kick(deck); } g71Redraw(); }
  };
  const _r29 = r29CheckReprints;
  r29CheckReprints = async function (deck) {
    // Cards first: a reprint check on marks that are about to be read again could settle on the wrong ones.
    if (deck && g71Stale(deck) && (_dataBusy.has(deck.id) || (g71On() && !_dataTried.has(deck.id)))) return;
    try { return await _r29.apply(this, arguments); }
    finally { if (deck) { const w = g71Wait(deck); if (w && w !== 'rot') g71Kick(deck); } g71Redraw(); }
  };
  const _rg = renderGrade;
  renderGrade = function () {
    const el = document.getElementById('grade-body');
    const deck = state.decks.find(d => d.id === state.activeDeckId);
    const w = deck ? g71Wait(deck) : '';
    if (!el || !w) {
      const r = _rg.apply(this, arguments);
      // 3.2.7: a grade from part of the list says so above the number.
      try {
        if (el && deck && !el.querySelector('.g71-partial') && g71NotFinal(deck, g29Grade(deck))) el.insertAdjacentHTML('afterbegin',
          `<div class="g71-partial" role="status"><b>Not final.</b> <span>RdyDeck could not read every card in this list yet, so this grade may change.</span> <button class="btn btn-ghost btn-sm" onclick="g71Retry()">Read the cards again</button></div>`);
      } catch (_) {}
      // 3.2.7: an Expanded deck says so above the grade, since the Standard parts are left out.
      try {
        if (el && deck && deck.format === 'expanded' && !el.querySelector('.g71-fmt')) el.insertAdjacentHTML('afterbegin',
          `<div class="g71-fmt" role="note"><b>Expanded.</b> <span>This deck is graded as an Expanded deck, so Standard rotation, tournament results and matchups are left out.</span></div>`);
      } catch (_) {}
      return r;
    }
    g71Kick(deck);
    const why = { cards: 'Reading the card data for this deck.', rot: 'Checking which cards are Standard legal now.', results: 'Loading recent tournament results.' }[w];
    el.innerHTML = `<div class="g-hero g29-hero g71-wait">
      <div class="g-ring" style="--p:0;--col:var(--text-3)"><div class="g-score" style="color:var(--text-3)">…</div></div>
      <div class="g-band" style="--col:var(--text-3)">Grading</div>
      <p class="g29-verdict">${why} The grade shows once it is done, so it will not change while you look at it.</p></div>`;
  };
  const _share = v45ShareGrade;
  v45ShareGrade = function () {
    const deck = state.decks.find(d => d.id === state.activeDeckId);
    if (deck && g71Wait(deck)) { showToast('The grade is still loading. Try again in a moment.'); return; }
    if (deck && g71NotFinal(deck, g29Grade(deck))) { showToast('Some cards have not been read yet, so there is no final grade. Try again later.'); return; }
    return _share.apply(this, arguments);
  };
})();
