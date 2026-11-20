// ═══════════ 3.4.20: Guess the Grade ═══════════
// A daily game beside the Daily challenge and the daily puzzle. Everyone gets the same real tournament
// list each day (from DAILY_POOL, the best placed list of each archetype in the grade check's top lists),
// never the one the Daily challenge plays that day. The player has GTG_TRIES guesses at the grade RdyDeck
// gives it. A wrong guess says higher or lower, and how close: Hot (within 0.2), Warm (within 0.5) or Cold.
//
// The answer is the grade the app shows for the list today: the list is read and graded the way an
// imported deck is (card data, the reprint check, tournament results and Energy builds, all settled
// first). The first time a player opens the day's game the grade is saved with their result, so it
// stays the same for them all day. Nothing about the game leaves the device. No ads: the game is a sheet.

const GTG_TRIES = 4;
const GTG_HOT = 2, GTG_WARM = 5;          // in tenths of a grade point
const GTG_FLOOR = 5;
const GTG_START = 8.0;                    // where the first guess starts
const GTG_EPOCH = [2026, 10, 20];         // Guess the Grade #1 is 20 Nov 2026
let _gtgKey = '', _gtgV = GTG_START;
const _gtgDecks = {};

function gtgNumber(key) {
  const p = String(key || dailyKey()).split('-').map(Number);
  const n = Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - Date.UTC(GTG_EPOCH[0], GTG_EPOCH[1], GTG_EPOCH[2])) / 864e5) + 1;
  return isNaN(n) || n < 1 ? 1 : n;
}
function gtgStore() {
  const s = state.gtg;
  if (!s || typeof s !== 'object' || !s.results || typeof s.results !== 'object') state.gtg = { results: {} };
  return state.gtg;
}
/** The day's list: a fixed walk through DAILY_POOL, stepping past the Daily challenge's deck. */
function gtgPick(key) {
  const L = DAILY_POOL.length, daily = dailyPick(key);
  let i = (dailyNumber(key) + 19) % L;
  if (DAILY_POOL[i].name === daily.name) i = (i + 1) % L;
  return DAILY_POOL[i];
}
const gtgF = v => (+v).toFixed(1);
/** What a guess earns: a hit, or the way to go and how warm it is. Counted in tenths, so no float sum decides it. */
function gtgHint(g, ans) {
  const off = Math.round(Math.abs(g - ans) * 10);
  if (!off) return { hit: true };
  return { dir: ans > g ? 'up' : 'down', heat: off <= GTG_HOT ? 'hot' : off <= GTG_WARM ? 'warm' : 'cold' };
}
/** Days in a row with a finished game, today or up to yesterday. */
function gtgStreak() {
  const R = gtgStore().results, done = k => R[k] && R[k].done;
  let n = 0;
  const d = new Date();
  if (!done(dailyKey(d.getTime()))) d.setDate(d.getDate() - 1);
  while (done(dailyKey(d.getTime()))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
/** The lowest and highest grade the hints so far still allow. */
function gtgRange(r) {
  // Real tournament lists grade well above 5 (the worst one 6.8), so the slider starts at 5 and stays
  // easy to move by tenths on a phone. A list that grades under 5 opens the whole scale.
  let lo = r.ans < GTG_FLOOR ? 0 : GTG_FLOOR, hi = 10;
  (r.g || []).forEach(g => {
    const h = gtgHint(g, r.ans);
    if (h.dir === 'up') lo = Math.max(lo, Math.round(g * 10 + 1) / 10);
    if (h.dir === 'down') hi = Math.min(hi, Math.round(g * 10 - 1) / 10);
  });
  return { lo, hi };
}

// ── The list and its grade ──
async function gtgDeck(key) {
  if (_gtgDecks[key]) return _gtgDecks[key];
  const p = gtgPick(key);
  // Read the same way an imported list is (importDeck), so the grade is the one the Grade tab shows.
  const cards = await Promise.all(parseDeckList(p.list).map(c => fetchCardImage(c)));
  const coverage = await enrichDeckCards(cards);
  return (_gtgDecks[key] = { id: '__gtg' + key, name: p.name, cards, history: [], format: 'standard', coverage, enrichVer: ENRICH_VER });
}
const gtgSleep = ms => new Promise(r => setTimeout(r, ms));
/** The grade the Grade tab would show for this list once everything it reads has loaded, or null. */
async function gtgGrade(deck) {
  for (let n = 0; ; n++) {
    const w = g71WaitFor(deck);
    const builds = typeof g88Load === 'function' && g71On() && (g88Busy || !g88Tried);
    if (!w && !builds) break;
    if (n * 200 > G71_CARDS_MAX) return null;
    if (w === 'cards') { if (!_dataBusy.has(deck.id)) await refreshDeckData(deck); }
    else if (w === 'rot') { if (!_r29Busy.has(deck.id)) await r29CheckReprints(deck); }
    else if (w === 'results') { if (!mu60Busy) mu60Load(); if (!g76Busy) g76Load(); }
    if (builds && !g88Busy) g88Load();
    await gtgSleep(200);
  }
  const R = g29Grade(deck);
  if (!R || typeof R.overall !== 'number' || !isFinite(R.overall) || g71NotFinal(deck, R)) return null;
  return +R.overall.toFixed(1);
}

// ── The game sheet ──
async function openGtg() {
  const key = dailyKey();
  _gtgKey = key;
  closeSheet();
  showLoading('Reading today\'s list…');
  let deck = null, ans = null;
  try {
    deck = await gtgDeck(key);
    const r = gtgStore().results[key];
    ans = r && typeof r.ans === 'number' ? r.ans : await gtgGrade(deck);
  } catch (e) { console.warn('[guess the grade]', e); }
  hideLoading();
  if (!deck || ans == null) { showToast('Guess the Grade needs a connection to read today\'s list. Try again in a moment.'); return; }
  const S = gtgStore();
  if (!S.results[key]) { S.results[key] = { ans, g: [], ts: Date.now() }; saveState(); }
  const r = S.results[key];
  const { lo, hi } = gtgRange(r);
  _gtgV = Math.min(hi, Math.max(lo, r.g.length ? _gtgV : GTG_START));
  const groups = dly33Groups(gtgMerge(deck.cards));
  openSheet(`<div class="modal-title">Guess the Grade #${gtgNumber(key)}</div>
    <div class="modal-hint gtg-hint">A real tournament list, the same for everyone today. Study it, then guess the grade RdyDeck gives it out of 10. You get 4 guesses. Each one says higher or lower, and Hot (within 0.2), Warm (within 0.5) or Cold.</div>
    <div class="gtg-deck"><span>Today's list</span><b data-no-tr>${esc(deck.name)}</b></div>
    <div class="dly33-list gtg-list">
      ${groups.map(g => `<div class="review-group"><div class="review-group-title ${g.key}"><span class="rg-dot"></span>${g.label}<span class="rg-count">${g.n}</span></div>
        <div class="review-cards">${g.cards.map(dly33Card).join('')}</div></div>`).join('')}
    </div>
    <div class="gtg-play" id="gtg-play" aria-live="polite">${gtgPlayHtml()}</div>`, true);
}
/** 3.4.22: one line per card name, so two prints of a card (Lillie's Determination twice) read as one. */
function gtgMerge(cards) {
  const out = [], at = new Map();
  (cards || []).forEach(c => {
    const nm = typeof cn23 === 'function' ? cn23(c.apiName || c.name) : (c.apiName || c.name);
    const k = (typeof cardCategory === 'function' ? cardCategory(c) : '') + '|' + String(nm || '').toLowerCase().replace(/[\u2018\u2019`]/g, "'").replace(/\s+/g, ' ').trim();
    if (at.has(k)) { at.get(k).count += c.count || 0; return; }
    const x = Object.assign({}, c); at.set(k, x); out.push(x);
  });
  return out;
}
function gtgTryHtml(g, ans) {
  if (g == null) return '<div class="gtg-try empty" aria-hidden="true"><b>&nbsp;</b><span>&nbsp;</span></div>';
  const h = gtgHint(g, ans);
  if (h.hit) return `<div class="gtg-try hit"><b>${gtgF(g)}<i aria-hidden="true">✓</i></b><span>Right</span></div>`;
  return `<div class="gtg-try ${h.heat}"><b>${gtgF(g)}<i aria-hidden="true">${h.dir === 'up' ? '↑' : '↓'}</i></b><span>${{ hot: 'Hot', warm: 'Warm', cold: 'Cold' }[h.heat]}</span></div>`;
}
/** The latest hint as a sentence. */
function gtgSay(g, ans) {
  const h = gtgHint(g, ans);
  if (h.hit) return '';
  const way = h.dir === 'up' ? 'Higher' : 'Lower';
  return h.heat === 'hot' ? `${way}. Hot: within 0.2.` : h.heat === 'warm' ? `${way}. Warm: within 0.5.` : `${way}. Cold: more than 0.5 off.`;
}
function gtgBand(v) { const b = (typeof G29_BANDS !== 'undefined' ? G29_BANDS : []).find(x => v >= x[0]); return b ? b[1] : ''; }
function gtgPlayHtml() {
  const key = _gtgKey, r = gtgStore().results[key];
  if (!r) return '';
  const tries = Array.from({ length: GTG_TRIES }, (_, i) => gtgTryHtml(r.g[i], r.ans)).join('');
  let h = `<div class="gtg-tries">${tries}</div>`;
  if (r.done) {
    const streak = typeof dgStreak === 'function' ? dgStreak() : gtgStreak();
    h += `<div class="gtg-done">
      <div class="gtg-ans" aria-hidden="true"><span>${gtgF(r.ans)}</span><small>/10</small></div>
      <div class="gtg-done-tx"><b>${r.won ? `Got it in ${r.g.length} of ${GTG_TRIES}` : 'Not this time'}</b>
        <span>The grade is ${gtgF(r.ans)}.</span><span>${esc(gtgBand(r.ans))}</span>
        ${streak ? `<span>${streak === 1 ? '1 day streak' : streak + ' day streak'}</span>` : ''}<span>A new list tomorrow.</span></div>
    </div>
    <div class="gtg-acts"><button class="btn" onclick="closeSheet()">Done</button><button class="btn btn-primary" onclick="shareGtg()">${ic23('share')}Share</button></div>`;
    return h;
  }
  const { lo, hi } = gtgRange(r), last = r.g[r.g.length - 1];
  if (last != null) h += `<div class="gtg-say">${gtgSay(last, r.ans)}</div>`;
  h += `<div class="gtg-in">
      <button type="button" class="btn gtg-step" onclick="gtgStep(-1)" aria-label="Lower guess"${_gtgV <= lo ? ' disabled' : ''}>−</button>
      <output class="gtg-v" id="gtg-v">${gtgF(_gtgV)}</output>
      <button type="button" class="btn gtg-step" onclick="gtgStep(1)" aria-label="Higher guess"${_gtgV >= hi ? ' disabled' : ''}>+</button>
      <button type="button" class="btn btn-primary gtg-go" id="gtg-go" onclick="gtgGuess()">Guess ${gtgF(_gtgV)}</button>
    </div>
    <input type="range" class="gtg-range" id="gtg-range" min="${gtgF(lo)}" max="${gtgF(hi)}" step="0.1" value="${gtgF(_gtgV)}" oninput="gtgSet(this.value)" aria-label="Your guess">
    <div class="gtg-left"><span>Between ${gtgF(lo)} and ${gtgF(hi)}</span><span>Guess ${r.g.length + 1} of ${GTG_TRIES}</span></div>`;
  return h;
}
function gtgDraw() {
  const el = document.getElementById('gtg-play');
  if (el) el.innerHTML = gtgPlayHtml();
  try { renderGtgCard(); } catch (_) {}
}
/** Move the guess without drawing the panel again, so the slider keeps the finger. */
function gtgSet(v) {
  const r = gtgStore().results[_gtgKey];
  if (!r || r.done) return;
  const { lo, hi } = gtgRange(r);
  _gtgV = Math.min(hi, Math.max(lo, Math.round(parseFloat(v) * 10) / 10 || 0));
  const out = document.getElementById('gtg-v'), go = document.getElementById('gtg-go'), rg = document.getElementById('gtg-range');
  if (out) out.textContent = gtgF(_gtgV);
  if (go) go.textContent = 'Guess ' + gtgF(_gtgV);
  if (rg && rg.value !== gtgF(_gtgV)) rg.value = gtgF(_gtgV);
  document.querySelectorAll('#gtg-play .gtg-step').forEach((b, i) => { b.disabled = i === 0 ? _gtgV <= lo : _gtgV >= hi; });
}
function gtgStep(d) { gtgSet(Math.round(_gtgV * 10 + d) / 10); }
function gtgGuess() {
  const key = _gtgKey, r = gtgStore().results[key];
  if (!r || r.done) return;
  const g = Math.round(_gtgV * 10) / 10;
  r.g.push(g);
  const h = gtgHint(g, r.ans);
  if (h.hit || r.g.length >= GTG_TRIES) { r.done = true; r.won = !!h.hit; r.doneTs = Date.now(); }
  else {
    // The next guess starts one step the way the hint points, never on a number already ruled out.
    const { lo, hi } = gtgRange(r);
    _gtgV = Math.min(hi, Math.max(lo, Math.round(g * 10 + (h.dir === 'up' ? 1 : -1)) / 10));
  }
  saveState();
  gtgDraw();
}

// ── Share ──
function gtgShareText(r, key) {
  const n = gtgNumber(key);
  const marks = r.g.map(g => { const h = gtgHint(g, r.ans); return h.hit ? '✅' : (h.dir === 'up' ? '⬆️' : '⬇️') + (h.heat === 'hot' ? '🔴' : h.heat === 'warm' ? '🟠' : '⚪'); }).join(' ');
  const head = r.won ? `RdyDeck Guess the Grade #${n}: got it in ${r.g.length} of ${GTG_TRIES}` : `RdyDeck Guess the Grade #${n}: not solved in ${GTG_TRIES}`;
  const t = typeof rdI18n === 'object' && rdI18n && rdI18n.t ? rdI18n.t(head) : head;
  return t + '\n' + marks;
}
async function shareGtg(k) {
  const key = dailyOkKey(k) || dailyKey(), r = gtgStore().results[key];
  if (!r || !r.done) { showToast('Finish today\'s Guess the Grade first.'); return; }
  const text = gtgShareText(r, key), url = shareBaseUrl() + '?ref=guess#guess';
  if (navigator.share) { try { await navigator.share({ text, url }); return; } catch (_) {} }
  try { await navigator.clipboard.writeText(text + '\n' + url); showToast('Result copied. Paste it anywhere.'); }
  catch (_) { openSheet(`<div class="modal-title">Your result</div><textarea class="nt-area" readonly onclick="this.select()">${esc(text + '\n' + url)}</textarea><div class="modal-actions"><button class="btn btn-primary" onclick="closeSheet()">Done</button></div>`); }
}

// ── Home card ──
function renderGtgCard() {
  let el = document.getElementById('gtg-card');
  if (!el) {
    const pz = document.getElementById('puzzle-card');
    if (!pz) return;
    el = document.createElement('div');
    el.id = 'gtg-card';
    pz.parentNode.insertBefore(el, pz.nextSibling);
  }
  const key = dailyKey(), r = gtgStore().results[key];
  const g = r && Array.isArray(r.g) ? r.g.length : 0;
  let sub = r && r.done ? (r.won ? `Today: got it in ${g} of ${GTG_TRIES}` : `Today: not solved in ${GTG_TRIES}`)
    : g ? `Today: ${g} of ${GTG_TRIES} guesses used` : 'Guess the grade of a real tournament list';
  // 3.4.22: the row never shows the grade (that stays behind Result), and the streak moved to the section heading.
  el.innerHTML = `<div class="dc-card">
    <div class="dc-ic">${ic23('award')}</div>
    <div class="dc-tx"><div class="dc-t">Guess the Grade #${gtgNumber(key)}</div>
      <div class="dc-s">${sub}</div></div>
    ${r && r.done ? `<button class="btn btn-sm" onclick="shareGtg()" aria-label="Share Guess the Grade result">${ic23('share')}Share</button>` : ''}
    <button class="btn btn-sm btn-primary" onclick="openGtg()" aria-label="${r && r.done ? 'Result of Guess the Grade' : g ? 'Continue Guess the Grade' : 'Play Guess the Grade'}">${r && r.done ? 'Result' : g ? 'Continue' : 'Play'}</button>
  </div>`;
}
(function () {
  const _pz = renderPuzzleCard;
  renderPuzzleCard = function () {
    const out = _pz.apply(this, arguments);
    try { renderGtgCard(); } catch (e) { console.warn('[guess the grade]', e); }
    return out;
  };
})();

// ── A shared link (#guess) opens the game ──
function handleGtgHash() {
  if (!/^#guess\b/.test(location.hash || '')) return;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
  showScreen('home');
  // Played today already: straight to today's result.
  const r = gtgStore().results[dailyKey()];
  if (r && r.done) { openGtg(); return; }
  openSheet(`<div class="modal-title">Guess the Grade</div>
    <div class="modal-hint" style="margin-bottom:1rem">Everyone gets the same real tournament list today. Study it, then guess the grade RdyDeck gives it. You get 4 guesses.</div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet()">Not now</button><button class="btn btn-primary" onclick="openGtg()">${ic23('play')}Play</button></div>`);
}
(function () {
  const _h = handlePuzzleHash;
  handlePuzzleHash = function () { const out = _h.apply(this, arguments); try { handleGtgHash(); } catch (_) {} return out; };
  window.addEventListener('hashchange', handleGtgHash);
})();
