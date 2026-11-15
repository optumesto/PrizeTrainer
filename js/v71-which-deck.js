
// ═══════════ v71 (2.4.2): ask which deck a list is after an edit changes it ═══════════
// A deck picked under Against the meta borrows that deck's tournament results for its grade. When an
// edit takes out the Pokemon the picked deck is built on, RdyDeck asks which deck it is now rather
// than keep the old pick or quietly guess. Until it is answered, the grade leaves results out.
const MU71_ASK = 'pt_mu71_ask';
function mu71Asks() { try { return JSON.parse(safeLocalGet(MU71_ASK) || '{}') || {}; } catch (_) { return {}; } }
function mu71SetAsk(id, v) {
  const a = mu71Asks();
  if (v) a[id] = v; else delete a[id];
  try { safeLocalSet(MU71_ASK, JSON.stringify(a)); } catch (_) {}
}
/** True when the deck plays every Pokemon the archetype is built on. */
function mu71Fits(deck, d) {
  const mons = (deck.cards || []).filter(c => cardCategory(c) === 'pokemon').map(c => ' ' + mu60Norm(c.apiName || c.name) + ' ');
  return g68Need(d).every(p => mons.some(n => n.includes(' ' + p + ' ')));
}
/** The open question for this deck, { was, now }, or null. */
function mu71Question(deck) {
  if (!deck || !mu60Data) return null;
  const asks = mu71Asks();
  if (!asks[deck.id]) return null;
  const pickId = mu60Picks()[deck.id];
  const was = pickId && mu60Data.decks.find(d => d.id === pickId);
  if (!was) { mu71SetAsk(deck.id, null); return null; }
  if (!(deck.cards || []).some(c => c.supertype)) return null;
  if (mu71Fits(deck, was)) { mu71SetAsk(deck.id, null); return null; }
  const best = mu60Best(deck, mu60Data, d => d.id !== was.id && mu71Fits(deck, d));
  return { was, now: best && best.score >= G68_MATCH ? best.deck : null };
}
function mu71Answer(id) {
  mu71SetAsk(state.activeDeckId, null);
  if (id === '#keep') { renderGrade(); return; }
  mu60SetPick(id);
}
(function () {
  const _save = saveEditDeck;
  saveEditDeck = async function () {
    const id = editDeckId;
    const sig = d => d ? (d.cards || []).map(c => c.count + ' ' + c.name).sort().join('|') : '';
    const before = sig(state.decks.find(d => d.id === id));
    const r = await _save.apply(this, arguments);
    try {
      const deck = state.decks.find(d => d.id === id);
      const pick = mu60Picks()[id];
      if (deck && pick && sig(deck) !== before) {
        mu71SetAsk(id, pick);
        if (mu71Question(deck)) {
          showToast('This list looks like a different deck now. Its Grade tab asks which one.');
          const scr = document.getElementById('screen-review');
          if (state.activeDeckId === id && scr && scr.classList.contains('active')) renderReview(deck); else renderHome();
        }
      }
    } catch (_) {}
    return r;
  };
  const _pick = mu60SetPick;
  mu60SetPick = function () { mu71SetAsk(state.activeDeckId, null); return _pick.apply(this, arguments); };
  const _arch = g68Arch;
  g68Arch = function (deck) { return mu71Question(deck) ? null : _arch.apply(this, arguments); };
  const _sig = g29Sig;
  g29Sig = function (deck) { return _sig.apply(this, arguments) + '|ask' + (deck && mu71Asks()[deck.id] ? 1 : 0); };
  const _line = g68Line;
  g68Line = function (R) {
    const t = _line.apply(this, arguments);
    try {
      const deck = state.decks.find(d => d.id === state.activeDeckId);
      if (!t && mu71Question(deck)) return ' Tournament results are left out until you say which deck this is, under Against the meta.';
    } catch (_) {}
    return t;
  };
  const _sec = mu60Section;
  mu60Section = function (deck) {
    const h = _sec.apply(this, arguments);
    const q = h && mu71Question(deck);
    if (!q) return h;
    const b = (id, label) => `<button class="btn btn-sm" onclick="mu71Answer('${esc(id)}')">${esc(label)}</button>`;
    const box = `<div class="mu71-ask" role="group" aria-label="Which deck is this now?">
      <p class="mu60-p"><b>Which deck is this now?</b> You set it to compare as ${esc(q.was.name)}, and after your edit it no longer plays the Pokémon that deck is built on. Until you pick, the grade leaves out tournament results.</p>
      <div class="mu71-btns">${q.now ? b(q.now.id, q.now.name) : ''}${b('#keep', 'Keep ' + q.was.name)}${q.now ? '' : b('', 'No match')}</div>
      <p class="mu60-p">Or pick another deck from the list below.</p></div>`;
    return h.replace('<select class="x-select" aria-label="Deck to compare"', box + '<select class="x-select" aria-label="Deck to compare"');
  };
})();
