// ═══════════ 3.2.7: swipe between cards ═══════════
// With a card open from a deck's Cards tab, swipe left for the next card in the list and right for
// the one before, in the order the Cards tab shows them (Pokemon, then Trainers, then Energy).
// The card follows the finger and slides out; at the first or last card it springs back.
// A swipe only counts once the finger has moved more sideways than up or down, so scrolling a long
// card still scrolls. Previous and Next buttons and the Left and Right arrow keys do the same.
// Done, tapping outside and everything else in the sheet work as before. Nothing here changes a grade.

let _cs325I = -1;          // the open card's place among the Cards tab's tiles, or -1
let _cs325Via = false;

/** The Cards tab's card tiles, in the order shown. */
function cs325Tiles() {
  return [...document.querySelectorAll('#review-body .review-group .review-card')];
}
const cs325Open = () => {
  const m = document.getElementById('x-modal');
  return _cs325I >= 0 && !!m && m.classList.contains('active') && !!document.querySelector('#x-modal-inner .cd31');
};

(function () {
  if (typeof cd31OpenTile !== 'function' || typeof cd31Show !== 'function' || typeof cd31Html !== 'function') return;
  const _open = cd31OpenTile;
  cd31OpenTile = function (el) {
    _cs325I = cs325Tiles().indexOf(el);
    _cs325Via = true;
    try { return _open.apply(this, arguments); } finally { _cs325Via = false; }
  };
  const _show = cd31Show;
  cd31Show = function () {
    if (!_cs325Via) _cs325I = -1;   // a card opened from anywhere else gets no Previous and Next
    return _show.apply(this, arguments);
  };
  // Previous and Next beside Done, with where the card sits in the list.
  const _html = cd31Html;
  cd31Html = function () {
    const h = _html.apply(this, arguments);
    const n = cs325Tiles().length;
    if (_cs325I < 0 || n < 2) return h;
    const i = _cs325I;
    const btn = (dir, label, ic, off) => `<button type="button" class="btn cs325-b" aria-label="${label}" title="${label}" onclick="cs325Step(${dir})"${off ? ' disabled' : ''}><svg class="ic"><use href="#${ic}"/></svg></button>`;
    const nav = `<div class="cs325-nav">${btn(-1, 'Previous card', 'i-back', i <= 0)}<span class="cs325-n">Card ${i + 1} of ${n}</span>${btn(1, 'Next card', 'i-next', i >= n - 1)}</div>`;
    return h.replace(/<div class="modal-actions">(?![\s\S]*<div class="modal-actions">)/, '<div class="modal-actions cs325-acts">' + nav);
  };
})();

/** Open the card before (-1) or after (1) the open one. Slides the sheet's content that way. */
function cs325Step(dir, swiped) {
  if (!cs325Open()) return false;
  const tiles = cs325Tiles(), next = tiles[_cs325I + dir];
  if (!next) return false;
  const inner = document.getElementById('x-modal-inner');
  const modal = inner && inner.parentElement;
  const go = () => {
    cd31OpenTile(next);
    if (modal) modal.scrollTop = 0;
    if (inner && !cs325Still()) {
      inner.style.transition = 'none';
      inner.style.transform = `translateX(${dir * 40}px)`;
      inner.style.opacity = '0.4';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        inner.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
        inner.style.transform = '';
        inner.style.opacity = '';
      }));
    }
    // A button press keeps focus on Previous or Next (the other one at the end of the list).
    if (!swiped) {
      const bs = [...document.querySelectorAll('#x-modal-inner .cs325-b')];
      const want = bs[dir > 0 ? 1 : 0], other = bs[dir > 0 ? 0 : 1];
      const f = want && !want.disabled ? want : other;
      if (f) f.focus({ preventScroll: true });
    }
  };
  if (swiped && inner && !cs325Still()) {
    inner.style.transition = 'transform 0.14s ease-in, opacity 0.14s ease-in';
    inner.style.transform = `translateX(${-dir * 60}px)`;
    inner.style.opacity = '0';
    setTimeout(go, 140);
  } else go();
  return true;
}
const cs325Still = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };

// Swipes on the open card.
(function () {
  const modal = document.querySelector('#x-modal .modal');
  const inner = document.getElementById('x-modal-inner');
  if (!modal || !inner) return;
  let x0 = 0, y0 = 0, t0 = 0, axis = '', dx = 0, live = false;
  const reset = anim => {
    inner.style.transition = anim ? 'transform 0.2s ease-out, opacity 0.2s ease-out' : '';
    inner.style.transform = '';
    inner.style.opacity = '';
  };
  modal.addEventListener('touchstart', e => {
    live = cs325Open() && e.touches.length === 1;
    if (!live) return;
    // Sliding along a scrollable row inside the card (none today) keeps its own swipe.
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); axis = ''; dx = 0;
  }, { passive: true });
  modal.addEventListener('touchmove', e => {
    if (!live || e.touches.length !== 1) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (!axis) {
      if (Math.abs(mx) < 10 && Math.abs(my) < 10) return;
      axis = Math.abs(mx) > Math.abs(my) * 1.2 ? 'x' : 'y';
    }
    if (axis !== 'x') return;
    e.preventDefault();
    dx = mx;
    const tiles = cs325Tiles();
    const edge = (dx > 0 && _cs325I <= 0) || (dx < 0 && _cs325I >= tiles.length - 1);
    const shift = edge ? dx * 0.25 : dx;
    inner.style.transition = 'none';
    inner.style.transform = `translateX(${shift}px)`;
    inner.style.opacity = String(Math.max(0.35, 1 - Math.abs(shift) / 500));
  }, { passive: false });
  const end = () => {
    if (!live) return;
    live = false;
    if (axis !== 'x') return;
    const fast = Math.abs(dx) > 35 && Date.now() - t0 < 250;
    if ((Math.abs(dx) > 70 || fast) && cs325Step(dx < 0 ? 1 : -1, true)) return;
    reset(true);
  };
  modal.addEventListener('touchend', end, { passive: true });
  modal.addEventListener('touchcancel', () => { if (live && axis === 'x') reset(true); live = false; }, { passive: true });
  // The swipe must not also count as a tap on whatever it started on.
  modal.addEventListener('click', e => { if (axis === 'x' && Math.abs(dx) > 10) { e.stopPropagation(); e.preventDefault(); axis = ''; } }, true);
  // Left and Right arrow keys, when focus is not in a text box.
  document.addEventListener('keydown', e => {
    if (!cs325Open() || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName || ''))) return;
    if (cs325Step(e.key === 'ArrowRight' ? 1 : -1)) e.preventDefault();
  });
  // Closing the sheet forgets the open card.
  if (typeof closeSheet === 'function') {
    const _c = closeSheet;
    closeSheet = function () { _cs325I = -1; reset(false); return _c.apply(this, arguments); };
  }
})();
