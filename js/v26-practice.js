

// ═══════════ v26 fixes, area A: Practice tab, tournament log ═══════════

// A1. Saving Edit deck left Hand, Goldfish and the drills dealing from the
// old list (cards cut from the deck still showed up). Drop those deals when
// the saved list differs, so the next look deals from the new list.
(function () {
  const sig = d => JSON.stringify((d && d.cards || []).map(c => [c.name, c.set, c.num, c.count]));
  const _saveEdit = saveEditDeck;
  saveEditDeck = async function () {
    const id = editDeckId;
    const before = sig(state.decks.find(d => d.id === id));
    const r = await _saveEdit.apply(this, arguments);
    const deck = state.decks.find(d => d.id === id);
    if (deck && sig(deck) !== before) {
      if (handState && handState.deckId === id) handState = null;
      if (gf && gf.deckId === id) gf = null;
      if (resDrill && resDrill.deckId === id) resDrill = null;
      if (readDrill && readDrill.src === 'd:' + id) readDrill = null;
    }
    return r;
  };
})();


// A3. Editing a logged match whose deck was deleted moved it to whichever
// deck was first in the list. Keep it on the deleted deck instead.
(function () {
  const GONE = '__deleted__';
  const _form = openTlogForm;
  openTlogForm = function (id) {
    const r = _form.apply(this, arguments);
    const x = id ? (state.tlog || []).find(e => e.id === id) : null;
    const sel = document.getElementById('tl-deck');
    if (x && sel && !state.decks.some(d => d.id === x.deckId)) {
      const o = document.createElement('option');
      o.value = GONE;
      o.textContent = (x.deckName || 'Deleted deck') + ' (deleted)';
      sel.insertBefore(o, sel.firstChild);
      sel.value = GONE;
    }
    return r;
  };
  const _save = saveTlog;
  saveTlog = async function (id) {
    const sel = document.getElementById('tl-deck');
    const x = id ? (state.tlog || []).find(e => e.id === id) : null;
    if (!sel || sel.value !== GONE || !x) return _save.apply(this, arguments);
    const dayRaw = String(document.getElementById('tl-day').value || '');
    Object.assign(x, {
      day: /^\d{4}-\d{2}-\d{2}$/.test(dayRaw) ? dayRaw : x.day,
      event: one23(document.getElementById('tl-event').value, 60),
      opp: one23(document.getElementById('tl-opp').value, 60) || 'Unknown deck',
      result: ['W', 'L', 'T'].includes(_tlForm.result) ? _tlForm.result : 'W',
      taken: Math.max(0, Math.min(6, _tlForm.taken | 0)), given: Math.max(0, Math.min(6, _tlForm.given | 0)),
      notes: clean23(document.getElementById('tl-notes').value, 500).trim(),
    });
    await saveState();
    closeSheet();
    renderTlog();
    showToast('Match saved.');
  };
})();

// A4. Adding a matchup note for an opponent that already had one, or
// renaming a note to that opponent, silently threw the older plan away
// (or left two notes for one deck). Ask before replacing it.
(function () {
  const _saveMu = saveMatchup;
  saveMatchup = async function (id) {
    const deck = findDeck(state.activeDeckId);
    const inp = document.getElementById('mu-opp');
    if (deck && inp) {
      const opp = one23(inp.value, 60);
      const k = opp.toLowerCase();
      const other = k && (deck.matchups || []).find(m => m.id !== id && m.opp.toLowerCase() === k);
      if (other) {
        if (other.plan && !(await rdConfirm({ title: `Replace your note for ${opp}?`, text: 'You already have a note for this matchup.', yes: 'Replace', danger: true }))) return;
        deck.matchups = deck.matchups.filter(m => m !== other);
      }
    }
    return _saveMu.apply(this, arguments);
  };
})();

