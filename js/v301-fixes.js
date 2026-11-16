// ═══════════ 3.0.1: fixes from the 16 Nov 2026 audit ═══════════

// Home keeps a deck's row at "Grading" until home is drawn again. The deck view's back button only
// switched screens, so a grade that finished while the deck was open stayed hidden on home until a
// reload. Going back to home now draws it again whenever a row is still waiting.
(function () {
  const _s = showScreen;
  showScreen = function (name) {
    const r = _s.apply(this, arguments);
    if (name === 'home' && document.querySelector('#deck-list .g71-wait')) { try { renderHome(); } catch (_) {} }
    return r;
  };
})();
