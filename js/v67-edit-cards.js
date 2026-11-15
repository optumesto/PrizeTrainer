
// ═══════════ v67: edit from the Cards tab ═══════════
// Saving from the Cards tab's Edit list redraws that tab with the new list.
(function () {
  const _save = saveEditDeck;
  saveEditDeck = async function () {
    const id = editDeckId;
    const r = await _save.apply(this, arguments);
    try {
      const deck = state.decks.find(d => d.id === id);
      const scr = document.getElementById('screen-review');
      if (deck && state.activeDeckId === id && scr && scr.classList.contains('active')) renderReview(deck);
    } catch (_) {}
    return r;
  };
})();

// ═══════════ v67: deck order and a long deck list on home ═══════════
// Decks keep the order you set (Move up, down, to the top or bottom in each deck's menu), saved on this
// device. Past 8 decks, home shows the first 8 with Show all, and a bar to find a deck or sort the list.
const DL67_CAP = 8;
let dl67Q = '', dl67All = false, dl67Sort = (() => { try { return localStorage.getItem('dl67Sort') || 'mine'; } catch (_) { return 'mine'; } })();
async function dl67Move(id, dir) {
  closeSheet();
  const deck = dd65Find(id);
  if (!deck) return;
  const peers = state.decks.filter(d => !!d.hidden === !!deck.hidden);
  const i = peers.indexOf(deck);
  const j = dir === 'top' ? 0 : dir === 'bottom' ? peers.length - 1 : dir === 'up' ? i - 1 : i + 1;
  if (j < 0 || j >= peers.length || j === i) return;
  peers.splice(i, 1); peers.splice(j, 0, deck);
  // Put the reordered decks back into the slots their group held, so the other group stays where it was.
  let k = 0; state.decks = state.decks.map(d => !!d.hidden === !!deck.hidden ? peers[k++] : d);
  if (dl67Sort !== 'mine') { dl67Sort = 'mine'; try { localStorage.setItem('dl67Sort', 'mine'); } catch (_) {} }
  if (dir === 'bottom' || j >= DL67_CAP) dl67All = true;
  await saveState();
  renderHome();
  showToast('"' + deck.name + '" moved ' + (dir === 'top' ? 'to the top.' : dir === 'bottom' ? 'to the bottom.' : dir + '.'));
}
function dl67MoveRows(deck) {
  const peers = state.decks.filter(d => !!d.hidden === !!deck.hidden);
  if (peers.length < 2) return '';
  const i = peers.indexOf(deck), sid = esc(String(deck.id));
  const r = (dir, t, off) => `<button type="button" class="st38-row"${off ? ' disabled' : ''} onclick="dl67Move('${sid}','${dir}')"><span>${t}</span></button>`;
  return `<div class="st38-sec st38-rows dl67-move">
      ${r('top', 'Move to the top', i === 0)}${r('up', 'Move up', i === 0)}${r('down', 'Move down', i === peers.length - 1)}${r('bottom', 'Move to the bottom', i === peers.length - 1)}
    </div>`;
}
(function () {
  const _open = dm38Open;
  dm38Open = function (id) {
    const r = _open.apply(this, arguments);
    try {
      const deck = dd65Find(id), sheet = document.getElementById('x-modal-inner');
      const danger = deck && sheet && [...sheet.querySelectorAll('.st38-rows')].pop();
      if (deck && danger) danger.insertAdjacentHTML('beforebegin', dl67MoveRows(deck));
    } catch (_) {}
    return r;
  };
})();
function dl67Apply() {
  const list = document.getElementById('deck-list');
  if (!list) return;
  const nodes = [...list.querySelectorAll(':scope > .deck-card')].filter(n => !n.classList.contains('deck-hidden'));
  const q = dl67Q.trim().toLowerCase();
  const byId = id => dd65Find(id);
  let shown = 0;
  nodes.forEach(n => {
    const d = byId(n.dataset.dl67);
    const hit = !q || (d && String(d.name).toLowerCase().includes(q));
    const vis = hit && (q || dl67All || shown < DL67_CAP);
    if (hit) shown++;
    n.style.display = vis ? '' : 'none';
  });
  const more = list.querySelector('.dl67-more');
  if (more) {
    more.style.display = q || nodes.length <= DL67_CAP ? 'none' : '';
    more.innerHTML = dl67All ? 'Show fewer decks' : `Show all ${nodes.length} decks`;
  }
  const none = list.querySelector('.dl67-none');
  if (none) none.style.display = q && !nodes.some(n => n.style.display !== 'none') ? '' : 'none';
}
function dl67SetSort(v) { dl67Sort = v; try { localStorage.setItem('dl67Sort', v); } catch (_) {} renderHome(); }
function dl67Toggle() { dl67All = !dl67All; dl67Apply(); }
(function () {
  const _home = renderHome;
  renderHome = function () {
    const typing = document.activeElement && document.activeElement.classList.contains('dl67-q');
    const r = _home.apply(this, arguments);
    try {
      const list = document.getElementById('deck-list');
      if (!list) return r;
      const cards = [...list.querySelectorAll(':scope > .deck-card')];
      cards.forEach(n => { const m = (n.getAttribute('onclick') || '').match(/\('([^']+)'\)/); if (m) n.dataset.dl67 = m[1]; });
      const vis = cards.filter(n => !n.classList.contains('deck-hidden'));
      if (vis.length <= DL67_CAP) { dl67All = false; return r; }
      // Sort the shown decks; your own order stays as saved.
      if (dl67Sort !== 'mine') {
        const g = n => { const R = g29Grade(dd65Find(n.dataset.dl67)); return R ? R.overall : -1; };
        const nm = n => String((dd65Find(n.dataset.dl67) || {}).name || '').toLowerCase();
        const sorted = vis.slice().sort(dl67Sort === 'grade' ? (a, b) => g(b) - g(a) || nm(a).localeCompare(nm(b), undefined, { numeric: true }) : (a, b) => nm(a).localeCompare(nm(b), undefined, { numeric: true }));
        sorted.slice().reverse().forEach(n => list.insertBefore(n, list.firstChild));
      }
      const o = (v, t) => `<option value="${v}"${dl67Sort === v ? ' selected' : ''}>${t}</option>`;
      list.insertAdjacentHTML('afterbegin', `<div class="dl67-bar">
          <input type="search" class="dl67-q" placeholder="Find a deck" aria-label="Find a deck" value="${esc(dl67Q)}" oninput="dl67Q=this.value;dl67Apply()">
          <select class="dl67-sort" aria-label="Sort decks" onchange="dl67SetSort(this.value)">${o('mine', 'Your order')}${o('grade', 'Best grade')}${o('name', 'Name')}</select>
        </div><div class="dl67-none" style="display:none">No deck by that name.</div>`);
      const after = [...list.querySelectorAll(':scope > .deck-card')].filter(n => !n.classList.contains('deck-hidden')).pop();
      after.insertAdjacentHTML('afterend', '<div class="hidden-toggle-row dl67-more" onclick="dl67Toggle()"></div>');
      dl67Apply();
      // A redraw while typing (say, card art arriving) keeps the cursor in the box.
      if (typing) { const q = list.querySelector('.dl67-q'); q.focus(); try { q.setSelectionRange(q.value.length, q.value.length); } catch (_) {} }
    } catch (e) { console.warn('[deck list]', e); }
    return r;
  };
})();
