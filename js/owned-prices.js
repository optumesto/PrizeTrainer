// ═══════════ 3.0: Cards you own, and card prices ═══════════
// Owned cards: a player ticks the cards they own, on a deck's Cards tab ("Mark cards you own") or
// in the deck builder. Saved on this device only (localStorage rd_owned), never sent anywhere and
// never part of a deck. Owning any printing of a name counts, so an old printing of a reprint counts.
// Stored as { v: 1, n: { "<name key>": { p: ["SET NUM", ...] } } }: the name key the deck builder and
// rules check use (bldKey), with the printings the player ticked.
// Prices: read from TCGdex (the same card source the app reads card data from), one request per
// printing in the open deck or in its upgrade suggestions, a few at a time, saved on this device
// for 24 hours. Offline, or with no price, a card shows "no price", never $0.
// Nothing here reads or changes a grade. Owned cards and prices only change which upgrade swaps
// show first, and each swap keeps the numbers it was graded with.

// Turn every price display off in one line (the owned cards stay).
const PRICES_ON = true;

const OP30_OWN = 'rd_owned';
const OP30_PREFS = 'rd_owned_prefs';
const OP30_PRICES = 'rd_prices';
const OP30_TTL = 24 * 3600 * 1000;          // a price is read again after 24 hours
const OP30_KEEP = 7 * 24 * 3600 * 1000;     // and shown, marked with its date, for up to 7 days
const OP30_PAR = 3;                          // at most 3 requests at once
const OP30_MAX = 70;                         // at most 70 cards read in one go
const OP30_UP_MAX = 15;                      // upgrade cards whose price is read
const OP30_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const OP30_TICK = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// ── Owned cards ──
function op30Key(name) {
  const n = typeof TCGEnrich !== 'undefined' && TCGEnrich.apiName ? TCGEnrich.apiName(name) : String(name || '');
  return typeof bldKey === 'function' ? bldKey(n) : rules34Key(n);
}
let _op30Own = null;
function op30Owned() {
  if (_op30Own) return _op30Own;
  let o = null;
  try { o = JSON.parse(safeLocalGet(OP30_OWN) || 'null'); } catch (_) {}
  _op30Own = o && o.v === 1 && o.n && typeof o.n === 'object' && !Array.isArray(o.n) ? o : { v: 1, n: {} };
  return _op30Own;
}
function op30Has(name) { return Object.prototype.hasOwnProperty.call(op30Owned().n, op30Key(name)); }
/** Mark a card (name, and its set and number when known) as owned, or not. */
function op30Set(name, print, on) {
  const o = op30Owned(), k = op30Key(name);
  if (!k) return;
  if (on) {
    const e = o.n[k] && Array.isArray(o.n[k].p) ? o.n[k] : { p: [] };
    if (print && !e.p.includes(print) && e.p.length < 8) e.p.push(print);
    o.n[k] = e;
  } else delete o.n[k];
  safeLocalSet(OP30_OWN, JSON.stringify(o));
}

let _op30Pf = null;
function op30Prefs() {
  if (_op30Pf) return _op30Pf;
  let p = null;
  try { p = JSON.parse(safeLocalGet(OP30_PREFS) || 'null'); } catch (_) {}
  _op30Pf = { own: !!(p && p.own), cheap: !!(p && p.cheap) };
  return _op30Pf;
}

// ── Prices ──
let _op30P = null;
function op30Prices() {
  if (_op30P) return _op30P;
  let p = null;
  try { p = JSON.parse(safeLocalGet(OP30_PRICES) || 'null'); } catch (_) {}
  _op30P = {};
  if (p && typeof p === 'object' && !Array.isArray(p)) {
    const now = Date.now();
    Object.keys(p).forEach(id => { const e = p[id]; if (e && typeof e.t === 'number' && now - e.t < OP30_KEEP) _op30P[id] = e; });
  }
  return _op30P;
}
let _op30PT = 0;
function op30PSave() {
  clearTimeout(_op30PT);
  _op30PT = setTimeout(() => {
    const P = op30Prices();
    const ids = Object.keys(P).sort((a, b) => P[b].t - P[a].t).slice(0, 800);
    const out = {};
    ids.forEach(id => { out[id] = P[id]; });
    safeLocalSet(OP30_PRICES, JSON.stringify(out));
  }, 300);
}
/** The TCGdex id of a card's own printing, or null (a card with no set and number has no price). */
function op30Id(set, num) {
  try { return typeof td30CardId === 'function' ? td30CardId(set, num) : null; } catch (_) { return null; }
}
/** What TCGdex's pricing says: TCGplayer market price in US dollars, or else Cardmarket trend in euros. */
function op30Read(j) {
  const pr = j && typeof j === 'object' && j.pricing && typeof j.pricing === 'object' ? j.pricing : null;
  const num = v => typeof v === 'number' && isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null;
  const when = v => { const t = typeof v === 'string' ? Date.parse(v) : NaN; return isFinite(t) ? t : null; };
  let u = null, e = null, d = null;
  const tp = pr && pr.tcgplayer;
  if (tp && typeof tp === 'object' && (!tp.unit || tp.unit === 'USD')) {
    for (const k of ['normal', 'holofoil', 'reverse-holofoil'].concat(Object.keys(tp))) {
      const v = tp[k];
      if (v && typeof v === 'object' && num(v.marketPrice)) { u = num(v.marketPrice); break; }
    }
    if (u) d = when(tp.updated);
  }
  const cm = pr && pr.cardmarket;
  if (cm && typeof cm === 'object' && (!cm.unit || cm.unit === 'EUR')) {
    e = num(cm.trend) || num(cm['trend-holo']);
    if (!u && e) d = when(cm.updated);
  }
  return { u, e, d };
}
/** The saved price of a printing: { u, e, d, t }, or null when it has not been read. */
function op30Price(set, num) {
  if (!PRICES_ON) return null;
  const id = op30Id(set, num);
  return id ? op30Prices()[id] || null : null;
}
const op30Money = (v, cur) => (cur === 'e' ? '€' : '$') + v.toFixed(2);
/** "$1.25", "€0.80", "no price", or '' when not read yet. */
function op30PriceText(p) {
  if (!p) return '';
  if (p.u) return op30Money(p.u, 'u');
  if (p.e) return op30Money(p.e, 'e');
  return 'no price';
}
function op30Date(t) { const d = new Date(t); return d.getDate() + ' ' + OP30_MON[d.getMonth()] + ' ' + d.getFullYear(); }

const _op30Busy = new Set(), _op30Fail = new Map();
let _op30Down = 0;
const op30Fresh = id => { const p = op30Prices()[id]; return !!p && Date.now() - p.t < OP30_TTL; };
const op30Online = () => !(typeof navigator !== 'undefined' && navigator.onLine === false);
/** True when the deck page shows this pane (review-body for Cards, grade-body for Grade). */
const op30Showing = id => {
  const sc = document.getElementById('screen-review'), el = document.getElementById(id);
  return !!(sc && el && sc.classList.contains('active') && el.style.display !== 'none');
};
/** The ids among these that still need reading now. */
function op30Todo(ids) {
  const now = Date.now();
  return [...new Set(ids)].filter(id => id && !_op30Busy.has(id) && !op30Fresh(id) && !(now - (_op30Fail.get(id) || 0) < 600000));
}
/** Read the prices of these TCGdex ids, a few at a time. Resolves to how many were read. */
async function op30Fetch(ids) {
  if (!PRICES_ON || !op30Online() || Date.now() < _op30Down) return 0;
  const todo = op30Todo(ids).slice(0, OP30_MAX);
  const P = op30Prices();
  let got = 0, fails = 0;
  todo.forEach(id => _op30Busy.add(id));
  for (let i = 0; i < todo.length; i += OP30_PAR) {
    // TCGdex not answering at all: stop, and leave it alone for ten minutes.
    if (fails >= OP30_PAR && !got) { _op30Down = Date.now() + 600000; break; }
    await Promise.all(todo.slice(i, i + OP30_PAR).map(async id => {
      try {
        const init = {};
        if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) init.signal = AbortSignal.timeout(10000);
        const r = await fetch(TD30_API + '/cards/' + encodeURIComponent(id), init);
        if (r.ok) { P[id] = Object.assign({ t: Date.now() }, op30Read(await r.json())); got++; }
        else if (r.status === 404) { P[id] = { t: Date.now(), u: null, e: null, d: null }; got++; }
        else { fails++; _op30Fail.set(id, Date.now()); }
      } catch (_) { fails++; _op30Fail.set(id, Date.now()); }
    }));
  }
  todo.forEach(id => _op30Busy.delete(id));
  if (got) op30PSave();
  return got;
}

// ── The Cards tab ──
let _op30Mark = false, _op30Deck = null, _op30In = false;
const op30Shown = n => String(n || '').replace(/\{[a-zA-Z]\}/g, '').trim().toLowerCase();

/** Owned marks, prices and the owned and price lines on the Cards tab. Safe to run again at any time. */
function op30Cards(deck) {
  const body = document.getElementById('review-body');
  if (!body || !deck || !Array.isArray(deck.cards)) return;
  _op30Deck = deck;
  body.querySelectorAll('.op30-tick, .op30-pr').forEach(x => x.remove());
  ['op30-bar', 'op30-mark'].forEach(id => { const x = document.getElementById(id); if (x) x.remove(); });
  body.classList.toggle('op30-marking', _op30Mark);

  // Each tile shows one card (two printings of a Trainer or Energy share a tile, as the list shows them).
  const queue = new Map();
  deck.cards.forEach(c => { const k = op30Shown(c.apiName || c.name); if (!queue.has(k)) queue.set(k, []); queue.get(k).push(c); });
  body.querySelectorAll('.review-group .review-card').forEach(el => {
    const nm = el.querySelector('.review-card-name'), img = el.querySelector('.review-card-img');
    const q = nm && queue.get(op30Shown(nm.textContent));
    const c = q && (q.length > 1 ? q.shift() : q[0]);
    if (!c || !img) return;
    el.dataset.op30 = c.name;
    el.dataset.op30p = [c.set, c.num].filter(Boolean).join(' ');
    const own = op30Has(c.name);
    el.classList.toggle('op30-own', own);
    if (_op30Mark) { el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('aria-pressed', own ? 'true' : 'false'); }
    else { el.removeAttribute('role'); el.removeAttribute('tabindex'); el.removeAttribute('aria-pressed'); }
    if (own) {
      const b = document.createElement('span');
      b.className = 'op30-tick'; b.title = 'You own this card';
      b.setAttribute('role', 'img'); b.setAttribute('aria-label', 'You own this card');
      b.innerHTML = OP30_TICK;
      img.appendChild(b);
    }
    const t = op30PriceText(op30Price(c.set, c.num));
    if (t) {
      const p = document.createElement('div');
      p.className = 'op30-pr' + (t === 'no price' ? ' none' : '');
      p.textContent = t;
      nm.insertAdjacentElement('afterend', p);
    }
  });

  // The owned and price lines.
  const keys = new Set(deck.cards.map(c => op30Key(c.name)).filter(Boolean));
  const ownN = [...keys].filter(k => Object.prototype.hasOwnProperty.call(op30Owned().n, k)).length;
  const lines = [`<p class="op30-own-n">You own ${ownN} of the ${keys.size} different cards in this list.</p>`];
  if (_op30Mark) lines.push('<p class="op30-hint">Tap each card you own. Tap it again to unmark it. Saved on this device only.</p>');
  if (PRICES_ON) {
    let usd = 0, eur = 0, none = 0, needU = 0, needE = 0, any = false, oldest = null, euro = false, unread = 0;
    deck.cards.forEach(c => {
      const n = c.count || 0, p = op30Price(c.set, c.num), own = op30Has(c.name);
      if (!p) { if (op30Id(c.set, c.num)) unread += n; else none += n; return; }
      const when = p.d || p.t;
      if (p.u) { usd += p.u * n; if (!own) needU += p.u * n; }
      else if (p.e) { eur += p.e * n; euro = true; if (!own) needE += p.e * n; }
      else { none += n; return; }
      any = true;
      if (oldest == null || when < oldest) oldest = when;
    });
    const sum = (u, e) => [u > 0 ? op30Money(u, 'u') : '', e > 0 ? op30Money(e, 'e') : ''].filter(Boolean).join(' and ');
    if (any) {
      lines.push(`<p class="op30-total">List total: <b>${sum(usd, eur)}</b>.</p>`);
      if (ownN && (needU > 0 || needE > 0)) lines.push(`<p>Cards you do not own: <b>${sum(needU, needE)}</b>.</p>`);
      else if (ownN) lines.push('<p>You own every card with a price.</p>');
      const miss = none + unread;
      if (miss) lines.push(`<p>${miss === 1 ? '1 card has no price and is not counted.' : miss + ' cards have no price and are not counted.'}</p>`);
      lines.push(`<p class="op30-src">Prices from TCGdex (TCGplayer and Cardmarket), as of ${op30Date(oldest)}.${euro ? ' Prices in € are from Cardmarket, where TCGplayer has none.' : ''}</p>`);
    } else if (unread && op30Online() && deck.cards.some(c => { const id = op30Id(c.set, c.num); return id && (_op30Busy.has(id) || op30Todo([id]).length); })) {
      lines.push('<p class="op30-src">Reading prices…</p>');
    }
  }
  const bar = document.createElement('div');
  bar.id = 'op30-bar'; bar.className = 'op30-bar';
  bar.innerHTML = lines.join('');
  const row = body.querySelector('.rv-edit-row');
  if (row) {
    const btn = document.createElement('button');
    btn.id = 'op30-mark'; btn.type = 'button';
    btn.className = 'btn btn-sm op30-mark' + (_op30Mark ? ' active' : '');
    btn.setAttribute('aria-pressed', _op30Mark ? 'true' : 'false');
    btn.innerHTML = OP30_TICK + (_op30Mark ? 'Done marking' : 'Mark cards you own');
    btn.onclick = op30MarkMode;
    row.insertBefore(btn, row.firstChild);
    row.insertAdjacentElement('afterend', bar);
  } else body.insertBefore(bar, body.firstChild);

  if (PRICES_ON && op30Showing('review-body')) op30CardsFetch(deck);
}

function op30CardsFetch(deck) {
  const ids = deck.cards.map(c => op30Id(c.set, c.num));
  if (!op30Todo(ids).length || !op30Online()) return;
  op30Fetch(ids).then(got => {
    if (!got || _op30Deck !== deck || String(state.activeDeckId) !== String(deck.id)) return;
    if (document.getElementById('review-body')) op30Cards(deck);
  }).catch(() => {});
}

function op30MarkMode() {
  _op30Mark = !_op30Mark;
  if (_op30Deck) op30Cards(_op30Deck);
  const b = document.getElementById('op30-mark');
  if (b) b.focus();
}

function op30TileTap(el) {
  const name = el.dataset.op30;
  if (!name) return;
  op30Set(name, el.dataset.op30p || '', !op30Has(name));
  if (_op30Deck) op30Cards(_op30Deck);
  const again = [...document.querySelectorAll('#review-body .review-card')].find(x => x.dataset.op30 === name);
  if (again) again.focus();
}

(function () {
  const body = document.getElementById('review-body');
  if (body) {
    body.addEventListener('click', e => {
      if (!_op30Mark) return;
      const el = e.target.closest && e.target.closest('.review-group .review-card');
      if (el && body.contains(el)) { e.preventDefault(); op30TileTap(el); }
    });
    body.addEventListener('keydown', e => {
      if (!_op30Mark || (e.key !== 'Enter' && e.key !== ' ')) return;
      const el = e.target.closest && e.target.closest('.review-group .review-card');
      if (el && body.contains(el)) { e.preventDefault(); op30TileTap(el); }
    });
  }
  const _rr = renderReview;
  renderReview = function (deck) {
    if (deck !== _op30Deck) _op30Mark = false;   // a new deck opens out of marking
    _op30In = true;
    let r;
    try { r = _rr.apply(this, arguments); } finally { _op30In = false; }
    try { op30Cards(deck); } catch (_) {}
    return r;
  };
  const _tab = showReviewTab;
  showReviewTab = function (which) {
    const r = _tab.apply(this, arguments);
    if (which === 'cards' && _op30Deck && !_op30In) { try { op30Cards(_op30Deck); } catch (_) {} }
    return r;
  };
})();

// ── Upgrades ──
/** The swap's added card's saved price, or null. */
const op30UpPrice = s => op30Price(s.inSet, s.inNum);

/** The upgrade swaps in the order the player picked: cards they own first, then cheapest first.
 *  Picks from the swaps that raise the grade, each with its own card out and card in, as before. */
function op30UpOrder(res) {
  if (!res || !Array.isArray(res.swaps) || !res.swaps.length || !Array.isArray(res.more) || !res.more.length) return res;
  const pf = op30Prefs(), cheap = PRICES_ON && pf.cheap;
  if (!pf.own && !cheap) return res;
  const rank = s => { const p = op30UpPrice(s); return p && p.u ? [0, p.u] : p && p.e ? [1, p.e] : [2, 0]; };
  const list = res.more.map((s, i) => ({ s, i, own: pf.own && op30Has(s.in) ? 1 : 0, r: cheap ? rank(s) : [0, 0] }));
  list.sort((a, b) => (b.own - a.own) || (a.r[0] - b.r[0]) || (a.r[1] - b.r[1]) || (a.i - b.i));
  const usedO = new Set(), usedI = new Set(), pick = [];
  const show = typeof UP75_SHOW === 'number' ? UP75_SHOW : 3;
  for (const x of list) {
    if (pick.length >= show) break;
    const o = op30Key(x.s.out), n = op30Key(x.s.in);
    if (usedO.has(o) || usedI.has(n)) continue;
    usedO.add(o); usedI.add(n); pick.push(x.s);
  }
  return pick.length ? Object.assign({}, res, { swaps: pick }) : res;
}

/** The line under a swap: whether the player owns the card it adds, and its price. */
function op30UpTag(s) {
  const bits = [];
  if (op30Has(s.in)) bits.push(`<span class="op30-tag own">${OP30_TICK}You own ${esc(s.in)}</span>`);
  const t = op30PriceText(op30UpPrice(s));
  if (t) bits.push(`<span class="op30-tag${t === 'no price' ? ' none' : ''}">${t === 'no price' ? 'No price' : esc(t) + ' each'}</span>`);
  return bits.length ? `<div class="op30-tags">${bits.join('')}</div>` : '';
}

/** The order toggles above the swaps, and the price source when prices show. */
function op30UpBar(res) {
  if (!res || !Array.isArray(res.swaps) || !res.swaps.length) return '';
  const pf = op30Prefs();
  let h = `<div class="op30-up-bar" role="group" aria-label="Order of upgrades">
    <label class="op30-sw"><input type="checkbox" id="op30-up-own"${pf.own ? ' checked' : ''} onchange="op30UpSet('own',this.checked)"><span>Suggest cards I own first</span></label>`;
  if (PRICES_ON) h += `<label class="op30-sw"><input type="checkbox" id="op30-up-cheap"${pf.cheap ? ' checked' : ''} onchange="op30UpSet('cheap',this.checked)"><span>Cheapest first</span></label>`;
  h += '</div>';
  if (PRICES_ON) {
    // The cards shown, or with Cheapest first on, the cards it picks from.
    const pool = (pf.cheap && res.more ? res.more : res.swaps).slice(0, OP30_UP_MAX);
    const known = res.swaps.map(op30UpPrice).filter(p => p && (p.u || p.e));
    if (known.length) {
      const oldest = Math.min(...known.map(p => p.d || p.t));
      h += `<div class="op30-src">Prices from TCGdex (TCGplayer and Cardmarket), as of ${op30Date(oldest)}.</div>`;
    }
    const ids = pool.map(s => op30Id(s.inSet, s.inNum));
    if (op30Todo(ids).length && op30Online()) setTimeout(() => {
      if (!op30Showing('grade-body')) return;
      op30Fetch(ids).then(got => { if (got) op30UpRefresh(); }).catch(() => {});
    }, 0);
  }
  return h;
}

/** Draw the Upgrades section again from the swaps already found (nothing is graded again). */
function op30UpRefresh() {
  const el = document.getElementById('grade-body');
  const sec = el && el.querySelector('#up75-sec');
  const deck = state.decks.find(d => d.id === state.activeDeckId);
  if (!sec || !deck || typeof _up75Cache === 'undefined') return;
  const hit = _up75Cache.get(deck.id);
  if (!hit || !hit.res) return;
  const open = sec.open;
  sec.outerHTML = up75Html(hit.res, !!el.querySelector('#g29-fix .g-sec-t'));
  const now = el.querySelector('#up75-sec');
  if (now) now.open = open;
}

function op30UpSet(k, on) {
  const pf = op30Prefs();
  pf[k] = !!on;
  safeLocalSet(OP30_PREFS, JSON.stringify(pf));
  op30UpRefresh();
  const box = document.getElementById(k === 'own' ? 'op30-up-own' : 'op30-up-cheap');
  if (box) box.focus();
}

// ── Deck builder: a tick on each card row to mark it as owned ──
function op30BldMarks() {
  const body = document.getElementById('bld-body');
  if (!body) return;
  body.querySelectorAll('.bld-row').forEach(row => {
    if (row.querySelector('.op30-tg') || row.getAttribute('role') === 'button') return;
    const nmEl = row.querySelector('.bld-nm');
    if (!nmEl || !nmEl.firstChild || nmEl.firstChild.nodeType !== 3) return;
    const name = nmEl.firstChild.textContent.trim();
    if (!name) return;
    const pr = row.querySelector('.bld-pr');
    const own = op30Has(name);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'op30-tg';
    b.dataset.n = name; b.dataset.p = pr ? pr.textContent.trim() : '';
    b.setAttribute('aria-pressed', own ? 'true' : 'false');
    b.setAttribute('aria-label', 'I own ' + name);
    b.title = 'I own this card';
    b.innerHTML = OP30_TICK;
    b.onclick = ev => { ev.stopPropagation(); op30BldTap(b); };
    const last = row.lastElementChild;
    row.insertBefore(b, last && last !== nmEl.parentNode ? last : null);
  });
}
function op30BldTap(b) {
  const name = b.dataset.n, on = !op30Has(name);
  op30Set(name, b.dataset.p || '', on);
  const k = op30Key(name);
  document.querySelectorAll('#bld-body .op30-tg').forEach(x => { if (op30Key(x.dataset.n) === k) x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  showToast(on ? 'Marked as a card you own.' : 'No longer marked as yours.');
}
(function () {
  if (typeof bldRender !== 'function') return;
  const _r = bldRender;
  bldRender = function () { const r = _r.apply(this, arguments); try { op30BldMarks(); } catch (_) {} return r; };
  const _d = bldDrawResults;
  bldDrawResults = function () { const r = _d.apply(this, arguments); try { op30BldMarks(); } catch (_) {} return r; };
})();

// Clear all data (Settings) clears the owned cards and saved prices too.
(function () {
  if (typeof clearAllStorage !== 'function') return;
  const _c = clearAllStorage;
  clearAllStorage = function () {
    try { [OP30_OWN, OP30_PREFS, OP30_PRICES].forEach(k => localStorage.removeItem(k)); } catch (_) {}
    _op30Own = null; _op30Pf = null; _op30P = null; _op30Mark = false;
    return _c.apply(this, arguments);
  };
})();
