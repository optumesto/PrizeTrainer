
// ═══════════ Keyboard and screen reader support ═══════════
(function () {
  // Segment pickers are divs: make each one a focusable button that Enter and Space press.
  const SEG = '.mode-opt, .fmt-opt';
  const upgrade = el => {
    if (el.tagName === 'BUTTON') return;
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-pressed', el.classList.contains('active') ? 'true' : 'false');
  };
  const sweep = root => root.querySelectorAll(SEG).forEach(upgrade);
  new MutationObserver(ms => ms.forEach(m => {
    if (m.type === 'attributes') { if (m.target.matches(SEG)) upgrade(m.target); return; }
    m.addedNodes.forEach(n => { if (n.nodeType !== 1) return; if (n.matches(SEG)) upgrade(n); sweep(n); });
  })).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  sweep(document);
  document.addEventListener('keydown', e => {
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.matches && t.matches(SEG) && t.tagName !== 'BUTTON') { e.preventDefault(); t.click(); }
  });
  document.querySelectorAll('.review-tabs .rv-tab').forEach(b => b.setAttribute('role', 'tab'));

  // Dialogs: focus moves in when one opens, Tab stays inside, focus goes back when it closes.
  const back = new WeakMap();
  const topDialog = () => [...document.querySelectorAll('.modal-overlay.active, .prize-browser-overlay.active')].pop();
  const focusables = m => [...m.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.disabled && el.getClientRects().length);
  document.querySelectorAll('.modal-overlay, .prize-browser-overlay').forEach(m => {
    const box = m.getAttribute('role') === 'dialog' ? m : (m.querySelector('[role=dialog]') || m.querySelector('.modal') || m);
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    if (!box.hasAttribute('tabindex')) { box.tabIndex = -1; box.style.outline = 'none'; }
    new MutationObserver(() => {
      if (m.classList.contains('active')) {
        if (!back.has(m)) back.set(m, document.activeElement);
        setTimeout(() => { if (m.classList.contains('active') && !m.contains(document.activeElement)) box.focus({ preventScroll: true }); }, 30);
      } else if (back.has(m)) {
        const t = back.get(m); back.delete(m);
        if (t && t.isConnected && t.focus && !topDialog()) t.focus({ preventScroll: true });
      }
    }).observe(m, { attributes: true, attributeFilter: ['class'] });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const m = topDialog(); if (!m) return;
    const f = focusables(m); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (!m.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // The same list always gives the same odds, so keep the last few results
  // (Notes ran two 20000 shuffle runs on every open and every saved note).
  const _sim = simulateOdds, _simMemo = new Map();
  simulateOdds = function (deck, trials) {
    const k = trials + '|' + (deck.format || '') + '|' + JSON.stringify(deck.cards || []);
    if (_simMemo.has(k)) return _simMemo.get(k);
    const r = _sim.apply(this, arguments);
    if (_simMemo.size >= 6) _simMemo.delete(_simMemo.keys().next().value);
    _simMemo.set(k, r);
    return r;
  };
})();

// ═══════════ v26 fixes (sweep B: game, results, decks, backup) ═══════════
(function () {
  // Escape (or any game shortcut) while a pop up sits over the game acts on
  // the pop up, not the game: Escape closes it instead of quitting.
  document.addEventListener('keydown', e => {
    const g = document.getElementById('screen-game');
    if (!g || !g.classList.contains('active')) return;
    const sheet = document.getElementById('x-modal');
    if (!sheet || !sheet.classList.contains('active')) return;
    if (e.key === 'Escape') { closeSheet(); e.preventDefault(); }
    e.stopImmediatePropagation();
  }, true);

  // Quitting closes any open question sheet, so it cannot reveal a game you left.
  confirmQuit = function () {
    if (!confirm('Quit this session?')) return;
    backToMenu();
  };

  // Leaving the game screen for anything but the results stops the clock,
  // so a timed game you left (a deck or daily link) never ends on its own later.
  const _show = showScreen;
  showScreen = function (name) {
    const g = document.getElementById('screen-game');
    if (g && g.classList.contains('active') && name !== 'game' && name !== 'results') stopTimer();
    return _show.apply(this, arguments);
  };

  // During a tournament block the big button carries on with the block
  // instead of quietly ending it.
  const _again = playAgain;
  playAgain = function () {
    if (tournament.active && tournament.current < tournament.total) return nextTournamentGame();
    return _again.apply(this, arguments);
  };
  const _banner = renderTournamentBanner;
  renderTournamentBanner = function () {
    const r = _banner.apply(this, arguments);
    const b = document.querySelector('#screen-results .results-main .btn-primary');
    if (b) b.innerHTML = '<svg class="ic"><use href="#i-play"/></svg>' + (tournament.active && tournament.current < tournament.total ? 'Next game' : 'Play again');
    return r;
  };

  // An edited list needs at least 10 cards, the same as an import.
  const _saveEdit = saveEditDeck;
  saveEditDeck = async function () {
    const raw = (document.getElementById('edit-list').value || '').trim();
    if (raw) {
      const cards = parseDeckList(raw);
      const total = cards.reduce((a, c) => a + c.count, 0);
      if (cards.length && total < 10) { showToast(`Only ${total} cards found. Check your list format.`); return; }
    }
    return _saveEdit.apply(this, arguments);
  };

  // A backup has to look like one before it replaces your data.
  const okBackup = p => p && typeof p === 'object' && Array.isArray(p.decks) && p.decks.every(d =>
    d && typeof d === 'object' && d.id != null && typeof d.name === 'string' && Array.isArray(d.cards) &&
    d.cards.every(c => c && typeof c === 'object' && typeof c.name === 'string' && Number.isFinite(c.count)) &&
    (d.history == null || Array.isArray(d.history)));
  // Ids, numbers and picture addresses go into the page as they are, so a
  // backup may only carry plain values there (a pasted backup is someone's text).
  const RAW_NUM = new Set(['score', 'time', 'prizeCount', 'count', 'taken', 'given', 'deckVer', 'ts']);
  const RAW_ID = new Set(['id', 'deckId']);
  const RAW_URL = new Set(['imageUrl', 'thumbUrl', 'fallbackUrls']);
  const plainBackup = (v, k) => {
    if (Array.isArray(v)) return v.every(x => plainBackup(x, k === 'fallbackUrls' ? k : ''));
    if (v && typeof v === 'object') return Object.keys(v).every(key => plainBackup(v[key], key));
    if (v == null) return true;
    if (RAW_NUM.has(k)) return Number.isFinite(v);
    if (RAW_ID.has(k)) return /^[\w.-]{1,64}$/.test(String(v));
    if (RAW_URL.has(k)) return v === '' || /^https?:\/\/[^\s"'<>`\\]+$/.test(String(v));
    if (k === 'result') return ['W', 'L', 'T'].includes(v);
    if (k === 'date' || k === 'day') return !/[<>"'`&]/.test(String(v));
    return true;
  };
  const _restore = restoreBackup;
  restoreBackup = async function () {
    const text = document.getElementById('backup-textarea').value.trim();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (_) {}
    if (text && parsed && parsed.decks && (!okBackup(parsed) || !plainBackup(parsed, ''))) { showToast('That backup is damaged or incomplete. Nothing was changed.'); return; }
    return _restore.apply(this, arguments);
  };
})();

