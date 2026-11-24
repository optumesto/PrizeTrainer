
// ═══════════ v38: settings, a calmer home, the new header ═══════════
// The theme switch, cards per row, the age setting, saved decks and clearing
// data all live in one Settings sheet, opened from the gear on home.

(function () {
  const sub = document.querySelector('#screen-home .app-subtitle');
  if (sub) sub.textContent = 'Can Your Deck Win?';
})();

function st38Theme(t) {
  setTheme(t);
  try { localStorage.setItem('ptcg_theme', t); } catch (_) {}
  st38Paint();
}
function st38Cols(i) { cz37Set(i); st38Paint(); }
function st38Paint() {
  const dark = document.body.dataset.theme !== 'light';
  document.querySelectorAll('#st38-theme button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.t === 'dark') === dark)));
  const s = cz37Step();
  document.querySelectorAll('#st38-cols button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.i === s)));
}
function openSettings() {
  const base = cz37Base(false);
  const go = '<svg class="ic"><use href="#i-next"/></svg>';
  const row = (fn, t, s, cls) => `<button type="button" class="st38-row${cls ? ' ' + cls : ''}" onclick="${fn}"><span>${t}${s ? `<small>${s}</small>` : ''}</span>${go}</button>`;
  const link = (href, t) => `<a class="st38-row" href="${href}"><span>${t}</span>${go}</a>`;
  const age = (typeof age32Any === 'function' && age32Any())
    ? row('closeSheet();age32Help()', 'Age setting', esc(AGE32_LABEL[age32Get() || 'skip']) + '. Sets which ads you see.') : '';
  openSheet(`<div class="modal-title">Settings</div>
    <div class="st38-sec">
      <div class="st38-h">Theme</div>
      <div class="st38-seg" id="st38-theme" role="group" aria-label="Theme">
        <button type="button" data-t="dark" onclick="st38Theme('dark')">Dark</button>
        <button type="button" data-t="light" onclick="st38Theme('light')">Light</button>
      </div>
    </div>
    <div class="st38-sec">
      <div class="st38-h">Cards per row</div>
      <p class="st38-p">For the Cards tab and the daily list on this screen size.</p>
      <div class="st38-seg" id="st38-cols" role="group" aria-label="Cards per row">
        ${[0, 1, 2, 3].map(i => `<button type="button" data-i="${i}" onclick="st38Cols(${i})">${base + i}</button>`).join('')}
      </div>
    </div>
    <div class="st38-sec st38-rows">
      ${row('closeSheet();openBackupModal()', 'Save and open decks', 'Move your decks to a new phone or web address')}
      ${age}
      ${row('closeSheet();openWhatsNew()', "What's new", wnName())}
      ${row('closeSheet();openHelpSheet()', 'Help and feedback', '')}
      ${link('terms.html', 'Terms of Service')}
      ${link('privacy.html', 'Privacy Policy')}
    </div>
    <div class="st38-sec st38-rows">
      ${row('closeSheet();clearAllData()', 'Clear all data', 'Deletes every deck and score saved in this browser', 'st38-danger')}
    </div>
    <div class="st38-ver" data-no-tr>RdyDeck ${String(PT_VERSION).replace(/^v/, '')} (${PT_PLAY ? 'Google Play' : 'Web'})</div>
    <div class="modal-actions"><button class="btn" onclick="closeSheet()">Close</button></div>`);
  st38Paint();
}

// Title lockup: size RDYDECK so its letters span exactly the width of the
// tag line under it, with both left edges and both right edges lined up.
// Measured on the drawn letters (not the text boxes), so it is exact.
function rd38Ink(text, font) {
  const c = rd38Ink.c || (rd38Ink.c = document.createElement('canvas').getContext('2d'));
  // 2.6.8: no canvas (blocked or out of memory) leaves the title at its CSS size,
  // and the rest of this script still runs.
  if (!c) return { left: 0, width: 0 };
  c.font = font;
  const m = c.measureText(text);
  return { left: -m.actualBoundingBoxLeft, width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight };
}
function rd38Lockup(t, s) {
  if (!t || !s) return;
  t.style.fontSize = ''; s.style.letterSpacing = ''; s.style.marginLeft = ''; t.style.marginLeft = '';
  const ct = getComputedStyle(t), cs = getComputedStyle(s);
  // Only the drawn name counts: the h1 also holds a screen reader line (sr-only) since 3.2.
  const vis = (t.querySelector('[data-no-tr]') || t).textContent;
  const title = ct.textTransform === 'uppercase' ? vis.toUpperCase() : vis;
  const sub = s.textContent;
  const lsEm = (parseFloat(ct.letterSpacing) || 0) / parseFloat(ct.fontSize);
  // Title ink at 100px, letter spacing included, then scale to the tag line.
  const T = rd38Ink(title, `${ct.fontWeight} 100px ${ct.fontFamily}`);
  const tW = T.width + lsEm * 100 * (title.length - 1);
  const S = rd38Ink(sub, `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`);
  if (!(tW > 0 && S.width > 0)) return;
  const size = S.width / tW * 100;
  t.style.fontSize = size.toFixed(3) + 'px';
  // Line up the left edges of the first letters.
  const dx = (T.left / 100) * size - S.left;
  if (dx > 0) s.style.marginLeft = dx.toFixed(3) + 'px'; else t.style.marginLeft = (-dx).toFixed(3) + 'px';
}
function rd38Fit() {
  const t = document.querySelector('#screen-home .app-title');
  rd38Lockup(t, document.querySelector('#screen-home .app-subtitle'));
  // The logo stands as tall as the title and tag line together.
  const m = document.querySelector('#screen-home .rd-mark'), box = t && t.parentElement;
  if (m && box && box.offsetHeight) { const h = box.offsetHeight; m.style.height = h + 'px'; m.style.width = (h * 380 / 556).toFixed(2) + 'px'; }
}
(function () {
  rd38Fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rd38Fit);
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', rd38Fit);
  let q; addEventListener('resize', () => { clearTimeout(q); q = setTimeout(rd38Fit, 80); });
})();

// Credits and legal links to the Terms and Privacy pages too.
(function () {
  const _c = openCredits;
  openCredits = function () {
    _c.apply(this, arguments);
    const list = document.querySelector('#x-modal-inner .cr31-list');
    if (list && !document.getElementById('lg38')) {
      const li = document.createElement('li');
      li.id = 'lg38';
      li.innerHTML = '<b>Terms and privacy</b><span><a href="terms.html">Terms of Service</a> and <a href="privacy.html">Privacy Policy</a></span>';
      list.appendChild(li);
    }
  };
})();

// ── Home deck rows: the four buttons move into one menu ──
function dm38Open(id) {
  const deck = state.decks.find(d => String(d.id) === String(id));
  if (!deck) return;
  const sid = esc(String(deck.id));
  const go = '<svg class="ic"><use href="#i-next"/></svg>';
  const row = (fn, t, s) => `<button type="button" class="st38-row" onclick="closeSheet();${fn}('${sid}')"><span>${t}${s ? `<small>${s}</small>` : ''}</span>${go}</button>`;
  const played = (deck.history || []).length;
  openSheet(`<div class="modal-title">${esc(deck.name)}</div>
    <div class="st38-sec st38-rows">
      ${row('openReview', 'Grade, odds and cards', '')}
      ${row('startGameDefault', 'Prize game', '')}
      ${played ? row('openWeakSpots', 'Progress', played + ' prize game' + (played !== 1 ? 's' : '') + ' played') : ''}
      ${row('openModeModal', 'Game modes', '')}
      ${row('openEditModal', 'Edit the list', '')}
      ${row('openThumbPicker', 'Cover card', '')}
    </div>
    ${dd65Rows(deck)}
    <div class="modal-actions"><button class="btn" onclick="closeSheet()">Close</button></div>`);
}

(function () {
  const _b = buildDeckCard;
  buildDeckCard = function (deck) {
    let h = _b.apply(this, arguments);
    const id = esc(String(deck.id));
    // The rotation line sits with the other facts, under the format.
    const rot = h.match(/<div class="deck-rot[^"]*">[\s\S]*?<\/div>/);
    if (rot) {
      h = h.replace(rot[0], '');
      const metaEnd = h.indexOf('</div>', h.indexOf('class="deck-meta"'));
      if (metaEnd > 0) h = h.slice(0, metaEnd + 6) + rot[0] + h.slice(metaEnd + 6);
    }
    // Play and a menu, stacked on the right.
    h = h.replace(/(<button class="deck-play"[\s\S]*?<\/button>)/, (m) =>
      `<div class="deck-side">${m}<button class="deck-more" onclick="event.stopPropagation();dm38Open('${id}')" title="More" aria-label="More for ${esc(deck.name)}"><svg class="ic"><use href="#i-more"/></svg></button></div>`);
    // One plain meta line: "Standard, 2 prize games played". The card count
    // shows only when it is not 60, since a legal deck always has 60.
    h = h.replace(/<div class="deck-meta">([\s\S]*?)<\/div>/, (m, inner) => {
      const txt = inner.replace(/<[^>]+>/g, ' ');
      const fmt = /Expanded/.test(txt) ? 'Expanded' : /Standard/.test(txt) ? 'Standard' : '';
      const cm = txt.match(/(\d+)\s*cards?/), gm = txt.match(/(\d+)\s*(?:prize game|session)/);
      const cards = cm ? +cm[1] : 60, games = gm ? +gm[1] : 0;
      const parts = [fmt, cards !== 60 ? cards + ' cards' : '', games ? games + ' prize game' + (games !== 1 ? 's' : '') + ' played' : 'no prize games yet'].filter(Boolean);
      const line = parts.join(', ');
      return `<div class="deck-meta">${line.charAt(0).toUpperCase() + line.slice(1)}</div>`;
    });
    // Shorter rotation line, matching the "may rotate" count on the Grade tab.
    h = h.replace(/(\d+) (cards?) expected to rotate in ([A-Z][a-z]+) (\d{4})/, '$1 $2 may rotate in $3&nbsp;$4');
    // The old buttons row is no longer shown.
    h = h.replace(/<div class="deck-actions-col">[\s\S]*?<\/div>\s*<\/div>\s*$/, '</div>');
    return h;
  };
})();

// ── v38 layout fixes ──
// 2. Grade: the Rotation section folds to one line, like Working well.
(function () {
  const _r = r29Summary;
  r29Summary = function (deck) {
    const out = _r.apply(this, arguments);
    if (!out || !out.html || out.html.indexOf('r29-sum') < 0) return out;
    const t = document.createElement('template');
    t.innerHTML = out.html;
    const sec = t.content.querySelector('#r29-sec');
    if (!sec) return out;
    const tv = key => { const c = sec.querySelector(`.r29-sum .r29-c[data-k="${key}"] b`); return c ? (+c.textContent || 0) : 0; };
    const [gone, risk, safe, unk] = [tv('out'), tv('risk'), tv('safe'), tv('unconf')];
    const en = (out.counts && out.counts.energy) || 0;
    const ann = !!sec.querySelector('.r29-tag.ann');
    const wm = (sec.querySelector('.r29-head') || sec).textContent.match(/in ([A-Z][a-z]+ \d{4})/);
    const when = wm ? wm[1] : '';
    const parts = [];
    if (gone) parts.push(`${gone} card${gone !== 1 ? 's' : ''} not legal now`);
    if (risk) parts.push(`${risk} card${risk !== 1 ? 's' : ''} ${ann ? 'rotate' : 'may rotate'}${when ? ' in ' + when : ''}`);
    if (unk) parts.push(`${unk} not confirmed`);
    parts.push(risk || gone || unk ? `${safe} ${safe !== 1 ? 'are' : 'is'} safe` : `Nothing here rotates next. All ${safe} cards with a mark are safe`);
    if (en) parts.push(`Plus ${en} Basic Energy`);
    const d = document.createElement('details');
    d.className = 'g-sec g29-fold';
    d.id = 'r29-sec';
    const title = sec.querySelector('.g-sec-t');
    if (title) title.remove();
    d.innerHTML = `<summary><span class="r38-t"><span class="g-sec-t">Rotation</span><span class="r38-line">${parts.join('. ')}.</span></span></summary>` + sec.innerHTML;
    sec.replaceWith(d);
    const box = document.createElement('div');
    box.appendChild(t.content.cloneNode(true));
    return Object.assign({}, out, { html: box.innerHTML });
  };
})();

// 3. Practice: Hand, Drills and Notes become main tabs next to Grade, Odds and Cards.
(function () {
  const tabs = document.querySelector('.review-tabs');
  if (!tabs) return;
  ['hand', 'drills', 'notes'].forEach(k => {
    const b = document.getElementById('rv-tab-' + k);
    if (!b) return;
    b.className = 'rv-tab';
    b.setAttribute('role', 'tab');
    b.removeAttribute('aria-pressed');
    tabs.appendChild(b);
  });
  const p = document.getElementById('rv-tab-practice');
  if (p) p.setAttribute('aria-hidden', 'true');
  const _s = showReviewTab;
  showReviewTab = function () {
    const r = _s.apply(this, arguments);
    const sub = document.getElementById('rv-sub');
    if (sub) sub.style.display = 'none';
    const pr = document.getElementById('rv-tab-practice');
    if (pr) { pr.classList.remove('active'); pr.removeAttribute('aria-selected'); }
    document.querySelectorAll('.review-tabs .rv-tab:not(#rv-tab-practice)').forEach(b => { b.removeAttribute('aria-pressed'); b.setAttribute('aria-selected', b.classList.contains('active') ? 'true' : 'false'); });
    return r;
  };
})();

// 5. Results: the prize cards (with their art) lead, marked guessed or missed,
// with any guesses that were not prizes listed under them. The text table and
// the letter grade go, and the notes on missed prizes open from one button.
(function () {
  const _g = buildGuessComparison;
  buildGuessComparison = function (guessResults, prizes) {
    const r = _g.apply(this, arguments);
    const area = document.getElementById('prize-reveal-area');
    const cmp = document.querySelector('#screen-results .guess-comparison');
    if (!area) return r;
    if (cmp) cmp.classList.add('r38-hide');
    const h = area.querySelector('.section-title');
    if (h) h.textContent = 'Your guesses vs the prizes';
    let w = document.getElementById('r38-wrong');
    if (!w) { w = document.createElement('div'); w.id = 'r38-wrong'; w.className = 'r38-wrong'; area.appendChild(w); }
    const wrong = (guessResults || []).filter(g => !g.correct).map(g => esc(g.guess));
    w.innerHTML = wrong.length ? `<b>Guessed but not prized:</b> ${wrong.join(', ')}` : '';
    w.style.display = wrong.length ? '' : 'none';
    return r;
  };
  const _m = renderMissedNotes;
  renderMissedNotes = function () {
    const r = _m.apply(this, arguments);
    const sec = document.getElementById('missed-notes-section');
    if (!sec) return r;
    let b = document.getElementById('r38-note-btn');
    if (!b) {
      b = document.createElement('button');
      b.type = 'button'; b.id = 'r38-note-btn'; b.className = 'btn r38-note-btn';
      b.innerHTML = '<svg class="ic"><use href="#i-note"/></svg>Add a note about this game';
      b.onclick = () => { sec.classList.remove('r38-closed'); b.style.display = 'none'; const ta = sec.querySelector('textarea'); if (ta) ta.focus(); };
      sec.parentNode.insertBefore(b, sec);
    }
    const shown = sec.style.display !== 'none';
    const hasNote = [...sec.querySelectorAll('textarea')].some(t => t.value.trim());
    sec.classList.toggle('r38-closed', shown && !hasNote);
    b.style.display = shown && !hasNote ? '' : 'none';
    return r;
  };
})();

// ── Back button and back gesture ──
// The app never added history entries, so on a phone (and in the Play app)
// Back closed the whole app from a deck page, a game or an open sheet. Now
// Back closes the open sheet first, then steps back to your decks. A game
// still asks before it quits, and a sheet where you have typed stays open.
(function () {
  if (!window.history || !history.pushState) return;
  let skip = 0, q = 0;
  const isGuard = () => !!(history.state && history.state.rd38);
  const pb = () => { const e = document.getElementById('prize-browser-overlay'); return e && e.classList.contains('active') ? e : null; };
  const tour = () => typeof tourOpen === 'function' && tourOpen();
  const topModal = () => (typeof _v26Top === 'function' ? _v26Top() : null);
  const screen = () => { const a = document.querySelector('.screen.active'); return a ? a.id : 'screen-home'; };
  const busy = () => screen() !== 'screen-home' || !!pb() || tour() || !!topModal();
  function sync() {
    q = 0;
    const need = busy();
    if (need && !isGuard()) { try { history.pushState({ rd38: 1 }, ''); } catch (_) {} }
    else if (!need && isGuard()) { skip++; history.back(); }
  }
  const later = () => { if (!q) { q = 1; setTimeout(sync, 0); } };
  addEventListener('popstate', () => {
    if (skip) { skip--; later(); return; }
    // The Back press used the guard entry. Act on the top thing.
    if (tour()) closeTour();
    else if (pb()) closePrizeBrowser();
    else {
      const m = topModal();
      if (m) { if (!_v26Dirty(m)) _v26Close[m.id](); }
      else if (screen() === 'screen-game') confirmQuit();
      else if (screen() !== 'screen-home') goHome();
    }
    later();
  });
  const _s = showScreen;
  showScreen = function () { const r = _s.apply(this, arguments); later(); return r; };
  const mo = new MutationObserver(later);
  document.querySelectorAll('.modal-overlay, #prize-browser-overlay').forEach(m => mo.observe(m, { attributes: true, attributeFilter: ['class'] }));
  later();
})();

// Where the pinned tabs end once the page has scrolled. On a phone the header
// now scrolls away, so the tabs' current position is not where they settle.
function rd38TabsEnd() {
  const t = document.querySelector('#screen-review .review-tabs');
  if (!t) return 0;
  const top = parseFloat(getComputedStyle(t).top) || 0;
  return top + t.offsetHeight;
}
g29Jump = function (id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.tagName === 'DETAILS') el.open = true;
  window.scrollBy({ top: el.getBoundingClientRect().top - rd38TabsEnd() - 8, behavior: 'smooth' });
};
openCompare = function (val) {
  _cmpSel = val;
  renderNotes();
  const s = document.getElementById('cmp-sec');
  if (s) window.scrollBy(0, s.getBoundingClientRect().top - rd38TabsEnd() - 8);
};
