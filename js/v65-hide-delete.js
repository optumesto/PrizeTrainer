
// ═══════════ v65: hide and delete a deck from its menus ═══════════
// Delete used to sit at the bottom of Game modes. It is now the last row of
// the deck menu on home and of the menu on the deck page, behind one confirm.
function dd65Find(id) { return state.decks.find(d => String(d.id) === String(id)) || null; }
function dd65Rows(deck) {
  const sid = esc(String(deck.id));
  const r = (fn, t, ic, cls) => `<button type="button" class="st38-row${cls ? ' ' + cls : ''}" onclick="${fn}('${sid}')"><span>${t}</span><svg class="ic"><use href="#i-${ic}"/></svg></button>`;
  // v82: copy the list for TCG Live (js/v82-copy-tcg-live.js). Its card data starts loading now, so the tap copies at once.
  const tl = typeof tl82Copy === 'function' && (deck.cards || []).length;
  if (tl && tl82Missing(deck)) tl82Data();
  return `<div class="st38-sec st38-rows">
      ${tl ? r('tl82Copy', 'Copy List for TCG Live', 'clipboard') : ''}
      ${r('dd65Hide', deck.hidden ? 'Show deck' : 'Hide Deck', deck.hidden ? 'eye' : 'eye-off')}
      ${r('dd65Ask', 'Delete Deck', 'trash', 'st38-danger')}
    </div>`;
}
function dd65Menu() {
  const deck = dd65Find(state.activeDeckId);
  if (!deck) return;
  openSheet(`<div class="modal-title">${esc(deck.name)}</div>
    ${dd65Rows(deck)}
    <div class="modal-actions"><button class="btn" onclick="closeSheet()">Close</button></div>`);
}
async function dd65Hide(id) {
  closeSheet();
  const deck = dd65Find(id);
  if (deck) await toggleHideDeck(deck.id);
}
function dd65Ask(id) {
  const deck = dd65Find(id);
  if (!deck) { closeSheet(); return; }
  openSheet(`<div class="modal-title">Delete ${esc(deck.name)}?</div>
    <p class="st38-p">Its prize games, drills and notes are deleted with it. This cannot be undone.</p>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeSheet()">Cancel</button>
      <button class="btn btn-danger" onclick="dd65Delete('${esc(String(deck.id))}')"><svg class="ic ic-sm"><use href="#i-trash"/></svg>Delete</button>
    </div>`);
}
async function dd65Delete(id) {
  closeSheet();
  const deck = dd65Find(id);
  if (!deck) return;
  state.decks = state.decks.filter(d => d !== deck);
  await saveState();
  if (String(state.activeDeckId) === String(deck.id) && document.getElementById('screen-review').classList.contains('active')) showScreen('home');
  renderHome();
  showToast('"' + deck.name + '" deleted.');
}
// The deck page menu shows only for decks saved on this device.
(function () {
  const _r = renderReview;
  renderReview = function (deck) {
    const r = _r.apply(this, arguments);
    const b = document.getElementById('dd65-more');
    if (b) b.style.display = deck && dd65Find(deck.id) ? '' : 'none';
    return r;
  };
})();
// Game modes keeps its own delete, now behind the same confirm.
deleteDeckFromModal = function () { closeModeModal(); if (modeDeckId) dd65Ask(modeDeckId); };
// ═══════════ AUDIT FIXES (v67) ═══════════
// Session history rows open the game they record: score, time, which prizes
// you named and missed, and the notes on the missed ones, which can be edited.
function hx67Open(i) {
  const deck = findDeck(state.activeDeckId);
  const h = deck && deck.history && deck.history[i];
  if (!h) return;
  const pc = h.prizeCount || 6;
  const ps = Array.isArray(h.prizes) ? h.prizes : [];
  const rows = ps.map((p, k) => `<div class="hx67-row${p.missed ? ' miss' : ''}">
      <span class="hx67-mk" aria-hidden="true">${p.missed ? '&#10005;' : '&#10003;'}</span>
      <div class="hx67-mid"><div class="hx67-nm">${esc(cn23(p.name || ''))}<span class="sr-only">${p.missed ? ', missed' : ', named'}</span></div>
      ${p.missed ? `<textarea class="mn-input hx67-note" data-k="${k}" maxlength="500" aria-label="Note on ${esc(cn23(p.name || ''))}" placeholder="Why did I miss this?">${esc(p.note || '')}</textarea>` : ''}</div></div>`).join('');
  openSheet(`<div class="modal-title">Game ${deck.history.length - i}</div>
    <div class="pg-tiles">
      <div class="pg-tile"><div class="pl">Score</div><div class="pv">${h.score}/${pc}</div><div class="ps">${h.score === pc ? 'Perfect' : (pc - h.score) + ' missed'}</div></div>
      <div class="pg-tile"><div class="pl">Time</div><div class="pv">${formatTime(h.time)}</div><div class="ps">${esc(h.date || '')}</div></div>
    </div>
    ${rows ? `<div class="hp-lbl">Prize Cards</div><div class="hx67-list" id="hx67-list">${rows}</div>` : '<div class="nt-empty">This game was saved before prize cards were kept.</div>'}
    <div class="modal-actions"><button class="btn btn-primary" onclick="closeSheet()">Done</button></div>`);
  const list = document.getElementById('hx67-list');
  if (!list) return;
  let t = null;
  list.addEventListener('input', e => {
    const ta = e.target.closest('.hx67-note');
    if (!ta || !ps[+ta.dataset.k]) return;
    ps[+ta.dataset.k].note = ta.value.slice(0, 500);
    clearTimeout(t);
    t = setTimeout(() => { Promise.resolve(saveState()).then(() => f40Saved(list)); }, 600);
  });
}
(function () {
  const _r = renderHistoryTable;
  renderHistoryTable = function () {
    const r = _r.apply(this, arguments);
    const deck = findDeck(state.activeDeckId);
    const tbody = document.getElementById('history-tbody');
    if (!deck || !deck.history || !deck.history.length || !tbody) return r;
    tbody.querySelectorAll('tr').forEach((tr, i) => {
      if (!deck.history[i]) return;
      tr.className = 'hx67-tr';
      tr.tabIndex = 0;
      tr.setAttribute('role', 'button');
      tr.setAttribute('aria-label', 'Open game ' + (deck.history.length - i) + ', ' + deck.history[i].score + ' of ' + (deck.history[i].prizeCount || 6));
      tr.onclick = () => hx67Open(i);
      tr.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hx67Open(i); } };
    });
    return r;
  };
})();
// The saved line sits right under the note you are typing in, and stays until
// the next keystroke, so it is there when you look up from typing.
f40Saved = function (root) {
  if (!root) return;
  let s = root.querySelector('.f40-saved');
  if (!s) { s = document.createElement('div'); s.className = 'f40-saved'; s.setAttribute('role', 'status'); }
  const a = document.activeElement;
  if (a && a.tagName === 'TEXTAREA' && root.contains(a)) a.insertAdjacentElement('afterend', s);
  else if (s.parentNode !== root) root.appendChild(s);
  s.textContent = 'Notes saved';
  if (!root._f67) { root._f67 = 1; root.addEventListener('input', () => { const z = root.querySelector('.f40-saved'); if (z) z.textContent = ''; }); }
};
