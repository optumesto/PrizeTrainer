// ═══════════ 3.3.6: De-bling, named Cheapest Version since 3.5.12 ═══════════
// One tap on a deck's Cards tab swaps every card to the cheapest printing that plays the same
// (Dragapult ex TWM 200 to TWM 130), then shows what changed and what it saves, with Undo.
//
// Which printings play the same comes from prints.json, built each week with cards.json by
// build-cards.mjs: a Trainer or Energy is one card per name, and a Pokemon only matches a printing
// with the same game text (HP, types, stage, evolves from, every Ability and attack, weakness,
// resistance, retreat). A card swaps only to a Standard legal printing. An older printing a list
// runs can swap to a legal one, never the other way.
// Prices are the Cards tab's own (owned-prices.js: TCGplayer market price in US dollars, from TCGdex).
// A card swaps only when its own printing has a price and another printing has a lower one, so a
// card with no price, or a printing with no price, stays as it is.
// A swap keeps the card's data as it was read (the printings play the same), so no grade moves.
// Only the set, number, picture and regulation mark change. Two lines that end up the same printing
// become one line. The grade history keeps no entry for it, since no card changed.
// 3.5.12: renamed Cheapest Version (Mason: "we can rename it to Cheapest Version not debling"). It always
// took the lowest market price, which is sometimes a full art (Latias ex SSP 220 at $10.61 under the
// SSP 76 regular at $11.23), so "De-bling" read as the opposite of what it did.

const DBL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>';
let _dblData = null, _dblLoad = null;
// The last De-bling, while it can still be undone: { id, was, log, now }. Kept for this visit only.
let _dblUndo = null, _dblBusy = false;

/** prints.json, loaded once: { by: Map("SET NUM" -> row), names: Map(name key -> row) }. Resolves null when unreadable. */
function dblData() {
  if (_dblData) return Promise.resolve(_dblData);
  if (_dblLoad) return _dblLoad;
  _dblLoad = fetch('prints.json').then(r => (r.ok ? r.json() : null)).catch(() => null).then(j => {
    _dblLoad = null;
    if (!j || !Array.isArray(j.rows)) return null;
    const by = new Map(), names = new Map(), many = new Set();
    j.rows.forEach(r => {
      if (!r || typeof r.n !== 'string' || !Array.isArray(r.p) || !r.p.length) return;
      r.p.concat(Array.isArray(r.o) ? r.o : []).forEach(id => { if (typeof id === 'string') by.set(dblId(id), r); });
      if (r.k === 'T' || r.k === 'E') {
        const k = dblName(r.n);
        if (names.has(k)) many.add(k); else names.set(k, r);
      }
    });
    many.forEach(k => names.delete(k));   // a name with two different cards never matches by name
    _dblData = { by, names };
    return _dblData;
  });
  return _dblLoad;
}
const dblName = n => (typeof ptCanonName === 'function' ? ptCanonName(n) : String(n || '')).toLowerCase();
/** "SET NUM", with the promo codes TCG Live writes read as the others write them and no leading zeros. */
function dblId(set, num) {
  if (num === undefined) { const p = String(set || '').trim().split(/\s+/); set = p[0]; num = p[1]; }
  const s = String((typeof ptCanonSet === 'function' ? ptCanonSet(set) : set) || '').trim().toUpperCase();
  const n = String(num || '').trim().toUpperCase().replace(/^0+(?=\d)/, '');
  return s && n ? s + ' ' + n : '';
}
/** The prints.json row a list line is a printing of, or null. */
function dblRow(D, c) {
  const r = D.by.get(dblId(c.set, c.num));
  if (r) return dblName(r.n) === dblName(c.name) ? r : null;
  // A Trainer or Energy from a set prints.json does not read (an older printing) is the same card by name.
  const cat = typeof cardCategory === 'function' ? cardCategory(c) : '';
  if (cat === 'trainer' || cat === 'energy') return D.names.get(dblName(c.name)) || null;
  return null;
}
const dblShowable = deck => !!deck && state.decks.includes(deck) && deck.format !== 'prerelease' &&
  !(typeof isDailyChallenge === 'function' && isDailyChallenge(deck)) && (deck.cards || []).length > 0;
/** The list as lines, to tell whether it changed since a De-bling. */
const dblSig = deck => (deck.cards || []).map(c => [c.count, c.name, c.set || '', c.num || ''].join('|')).join('\n');

/** Work out the swaps: [{ i, c, to, mark, was, now, n }], and how many cards have no price to compare. */
function dblPlan(deck, D) {
  const swaps = [];
  let noPrice = 0;
  (deck.cards || []).forEach((c, i) => {
    if (!c || !(c.count > 0) || !c.set || !c.num) return;
    const r = dblRow(D, c);
    if (!r) return;
    const self = dblId(c.set, c.num);
    const others = r.p.map(id => dblId(id)).filter(id => id && id !== self);
    if (!others.length) return;
    const own = op30Price(c.set, c.num);
    if (!own || !own.u) { noPrice += c.count; return; }
    let best = null, bestU = own.u;
    others.forEach(id => {
      const [s, n] = id.split(' '), p = op30Price(s, n);
      if (p && p.u && p.u < bestU - 0.004) { best = id; bestU = p.u; }
    });
    if (!best) {
      // Some printing could not be priced, so the card may not be its cheapest: say so.
      if (others.some(id => { const [s, n] = id.split(' '), p = op30Price(s, n); return !p || !p.u; })) noPrice += c.count;
      return;
    }
    const k = r.p.map(id => dblId(id)).indexOf(best), mark = typeof r.m === 'string' && /^[A-Z]$/.test(r.m[k] || '') ? r.m[k] : '';
    swaps.push({ i, c, to: best, mark, was: own.u, now: bestU, n: c.count });
  });
  return { swaps, noPrice };
}

/** Read the prices of every printing the list could swap to. Resolves true when some prices are known. */
async function dblReadPrices(deck, D) {
  const ids = [];
  (deck.cards || []).forEach(c => {
    if (!c || !c.set || !c.num) return;
    const r = dblRow(D, c);
    if (!r || r.p.length + (r.o ? r.o.length : 0) < 2) return;
    ids.push(op30Id(c.set, c.num));
    r.p.forEach(id => { const [s, n] = dblId(id).split(' '); ids.push(op30Id(s, n)); });
  });
  const want = [...new Set(ids.filter(Boolean))];
  for (let k = 0; k < 4 && op30Todo(want).length; k++) {
    let got = 0;
    try { got = await op30Fetch(want); } catch (_) {}
    if (!got) break;
  }
  return want.some(id => { const p = op30Prices()[id]; return p && p.u; });
}

async function dblRun(id) {
  const deck = dd65Find(id);
  if (!deck || _dblBusy || !dblShowable(deck)) return;
  if (!op30PricesOn()) { showToast('Turn prices on in Settings to use Cheapest Version.'); return; }
  _dblBusy = true;
  showLoading('Finding the cheapest printings…');
  let D = null, priced = false;
  try {
    D = await dblData();
    if (D) priced = await dblReadPrices(deck, D);
  } catch (_) {}
  hideLoading();
  _dblBusy = false;
  if (!D) { showToast('Cheapest Version could not load its card list. Try again when you are online.'); return; }
  const plan = dblPlan(deck, D);
  if (!plan.swaps.length) {
    if (!priced && !op30Online()) showToast('Prices could not be read. Try again when you are online.');
    else if (plan.noPrice) showToast('No cheaper printing with a price was found.');
    else showToast('Every card is already its cheapest printing.');
    return;
  }
  await dblApply(deck, plan);
}

async function dblApply(deck, plan) {
  const was = JSON.parse(JSON.stringify(deck.cards));
  const logWas = deck.gradeLog ? JSON.parse(JSON.stringify(deck.gradeLog)) : null;
  const linesWas = typeof gh72Lines === 'function' ? gh72Lines(deck) : null;
  const by = new Map(plan.swaps.map(s => [s.i, s]));
  let cards = [];
  for (let i = 0; i < deck.cards.length; i++) {
    const c = deck.cards[i], s = by.get(i);
    if (!s) { cards.push(c); continue; }
    const [set, num] = s.to.split(' ');
    let n = Object.assign({}, c, { set, num });
    try { n = await fetchCardImage(n); } catch (_) {}
    n.apiName = c.apiName || c.name;
    if (s.mark && n.reg && n.reg.status === 'marked') n.reg = { mark: s.mark, status: 'marked' };
    cards.push(n);
  }
  // Two lines of one card that are now the same printing become one line.
  const seen = new Map();
  cards = cards.filter(c => {
    const k = String(c.name).toLowerCase() + '|' + dblId(c.set, c.num);
    if (!c.set || !c.num || !seen.has(k)) { if (c.set && c.num) seen.set(k, c); return true; }
    seen.get(k).count += c.count;
    return false;
  });
  deck.cards = cards;
  // No card changed, only printings, so the grade history adds no entry for it.
  try {
    const log = typeof gh72Log === 'function' && gh72Log(deck);
    if (log && linesWas && log.e.length && log.e[log.e.length - 1].k === gh72Hash(linesWas)) {
      const lines = gh72Lines(deck);
      log.e[log.e.length - 1].k = gh72Hash(lines);
      log.l = lines;
      deck.gradeLog = log;
    }
  } catch (_) {}
  _dblUndo = { id: deck.id, was, log: logWas, now: dblSig(deck) };
  await saveState();
  try { renderReview(deck); } catch (_) {}
  dblSheet(deck, plan);
}

function dblSheet(deck, plan) {
  const m = v => (typeof op30Money === 'function' ? op30Money(v) : '$' + v.toFixed(2));
  const save = plan.swaps.reduce((a, s) => a + (s.was - s.now) * s.n, 0);
  const rows = plan.swaps.map(s => `<div class="dbl-row">
      <span class="dbl-n" data-no-tr>${esc(s.n + ' ' + s.c.name)}</span>
      <span class="dbl-p" data-no-tr>${esc(dblId(s.c.set, s.c.num) + ' → ' + s.to)}</span>
      <span class="dbl-s">${esc(m((s.was - s.now) * s.n))}</span>
    </div>`).join('');
  const np = plan.noPrice ? `<p class="st38-p">${plan.noPrice === 1 ? '1 card has no price to compare, so it stays as it is.' : plan.noPrice + ' cards have no price to compare, so they stay as they are.'}</p>` : '';
  openSheet(`<div class="modal-title">Cheapest Version</div>
    <p class="st38-p">These cards now use their cheapest printing that plays the same. Each line shows what it saves.</p>
    <p class="st38-p">The cheapest printing can have different art, even a full art.</p>
    <div class="dbl-list">${rows}</div>
    <p class="dbl-total">Estimated savings: <b>${esc(m(save))}</b></p>
    ${np}
    <p class="op30-src">TCGplayer market prices in US dollars, from TCGdex.</p>
    <div class="modal-actions"><button type="button" class="btn" onclick="dblUndo()">Undo</button><button type="button" class="btn btn-primary" onclick="closeSheet()">Done</button></div>`);
}

/** Put the list back as it was before the last Cheapest Version, while nothing else changed it. */
async function dblUndo() {
  closeSheet();
  const u = _dblUndo, deck = u && dd65Find(u.id);
  if (!deck || dblSig(deck) !== u.now) { _dblUndo = null; showToast('The list changed since, so there is nothing to undo.'); return; }
  deck.cards = u.was;
  if (u.log) deck.gradeLog = u.log;
  _dblUndo = null;
  await saveState();
  try { renderReview(deck); } catch (_) {}
  showToast('Cheapest Version undone.');
}

/** The button on the Cards tab, beside Mark cards you own. Undo Cheapest Version while the last one can be undone. */
function dblButton(deck) {
  const row = document.querySelector('#review-body .rv-edit-row');
  const old = document.getElementById('dbl-btn');
  if (old) old.remove();
  if (!row || !dblShowable(deck) || !op30PricesOn()) return;
  const undo = _dblUndo && String(_dblUndo.id) === String(deck.id) && dblSig(deck) === _dblUndo.now;
  const b = document.createElement('button');
  b.id = 'dbl-btn'; b.type = 'button'; b.className = 'btn btn-sm dbl-btn';
  b.title = undo ? 'Put back the printings the list had before' : 'Swap each card to its cheapest printing that plays the same';
  b.innerHTML = DBL_ICON + (undo ? 'Undo Cheapest Version' : 'Cheapest Version');
  b.onclick = undo ? dblUndo : () => dblRun(deck.id);
  const mark = document.getElementById('op30-mark');
  if (mark) mark.insertAdjacentElement('afterend', b); else row.insertBefore(b, row.firstChild);
}
(function () {
  if (typeof op30Cards !== 'function') return;
  const _oc = op30Cards;
  op30Cards = function (deck) {
    const r = _oc.apply(this, arguments);
    try { dblButton(deck); } catch (_) {}
    return r;
  };
})();
