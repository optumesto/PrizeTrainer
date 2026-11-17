
// ═══════════ 2.6.5: easier first visit ═══════════
// Paste and go, Try a sample deck, Top fixes on each grade. The phone pass is CSS in the style block below.

// ── Paste and go ──
// A whole list pasted into Import is saved and graded straight away: no name to type, no
// Import tap, no tap on the deck. Only a paste (or the Paste button) starts it, never typing,
// and only when every line was read and the count is right (60, or 40 for Prerelease).
// Anything else waits for Import and save, as before.
// 3.2.7: it waits 2.5 seconds, not 0.7, and a tap on the name box stops it, so a deck can still be
// named before it is graded (a phone needs more than a moment to reach the name box after a paste).
const EZ265_WAIT = 2500;
let _ez265Timer = null;
function ez265Stop() { if (_ez265Timer) { clearTimeout(_ez265Timer); _ez265Timer = null; } }
function ez265Check() {
  ez265Stop();
  const modal = document.getElementById('import-modal');
  const ta = document.getElementById('import-list'), pv = document.getElementById('parse-preview');
  if (!modal || !modal.classList.contains('active') || !ta || !pv) return;
  // A list from a shared link is checked by the player first.
  const note = document.getElementById('import-share-note');
  if (note && note.style.display !== 'none' && note.textContent) return;
  const parsed = parseDeckList(ta.value);
  const want = importFormat === 'prerelease' ? 40 : 60;
  if (!parsed.length || parsePreviewText(parsed, want).warn) return;
  pv.classList.remove('warn');
  pv.textContent = `${want} cards read. Grading it in a moment. Tap the name box to name it first.`;
  const snap = ta.value;
  _ez265Timer = setTimeout(() => {
    _ez265Timer = null;
    if (!modal.classList.contains('active') || ta.value !== snap) return;
    importDeck();
  }, EZ265_WAIT);
}
(function () {
  const ta = document.getElementById('import-list');
  if (ta) ta.addEventListener('input', e => {
    ez265Stop();
    const t = e && e.inputType;
    // After the preview line is written, so the "Grading it now" line replaces it.
    if (t === 'insertFromPaste' || t === 'insertFromDrop') setTimeout(ez265Check, 0);
  });
  const nm = document.getElementById('import-name');
  // Tapping or typing in the name box stops the automatic grade; Import and save takes it from there.
  const hold = () => {
    if (!_ez265Timer) return;
    ez265Stop();
    if (ta) ta.dispatchEvent(new Event('input'));
  };
  if (nm) ['input', 'focus', 'pointerdown'].forEach(ev => nm.addEventListener(ev, hold));
  const _paste = pasteFromClipboard;
  pasteFromClipboard = async function () {
    const r = await _paste.apply(this, arguments);
    const box = document.getElementById('import-list');
    if (box && box.value.trim()) ez265Check();
    return r;
  };
  const _close = closeImportModal;
  closeImportModal = function () { ez265Stop(); return _close.apply(this, arguments); };
  // The name is optional now, and the hint says a full list grades on its own.
  const lbl = document.querySelector('label[for="import-name"]');
  if (lbl) lbl.textContent = 'Deck name (optional)';
  if (nm) nm.placeholder = 'Leave blank to name it from the list';
  const hint = document.querySelector('#import-modal .modal-hint');
  if (hint) hint.textContent = 'Paste the export from Limitless or Pokémon TCG Live, section headers included. A full list grades as soon as it is pasted.';
})();

// A deck with no name is named after the meta deck it matches, or else its main attacker.
// The name never changes the grade (2.6.1), so this is only a label.
function ez265Name(deck) {
  let n = '';
  try { n = gArchName(deck) || ''; } catch (_) {}
  if (!n) {
    try {
      const R = g29Grade(deck), v = R && R.via;
      const m = v && (v.auto || v.main);
      if (m && m.name) n = m.name;
    } catch (_) {}
  }
  n = String(n || 'My deck').trim() || 'My deck';
  const taken = new Set(state.decks.filter(d => d.id !== deck.id).map(d => String(d.name).toLowerCase()));
  if (!taken.has(n.toLowerCase())) return n;
  for (let i = 2; i < 100; i++) if (!taken.has((n + ' ' + i).toLowerCase())) return n + ' ' + i;
  return n;
}
function ez265OpenGrade(id) {
  openReview(id);
  try { showReviewTab('grade'); } catch (_) {}
}
// Every import now lands on the new deck's grade instead of the deck list.
(function () {
  const TMP = 'Pasted deck';
  const _imp = importDeck;
  importDeck = async function () {
    ez265Stop();
    const nm = document.getElementById('import-name');
    const auto = !!nm && !nm.value.trim();
    if (auto) nm.value = TMP;
    const before = new Set(state.decks.map(d => d.id));
    let r;
    try { r = await _imp.apply(this, arguments); }
    finally { if (auto && nm && nm.value === TMP) nm.value = ''; }
    const added = state.decks.filter(d => !before.has(d.id));
    if (!added.length) return r;
    const d = added[added.length - 1];
    if (auto) {
      d.name = ez265Name(d);
      try { await saveState(); } catch (_) {}
      renderHome();
      showToast(`Added "${d.name}". Rename it any time in Edit deck.`);
    }
    ez265OpenGrade(d.id);
    return r;
  };
})();

// ── Try a sample deck ──
// The first starter deck is the top list of the most played deck right now (data.json,
// refreshed weekly). One tap loads it and opens its grade.
function ez265SampleLine() {
  const s = STARTER_DECKS[0];
  if (!s) return '';
  return `${s.name}, ${s.place} place on ${s.date}`;
}
(function () {
  const _sample = v45SampleGrade;
  v45SampleGrade = async function () {
    const r = await _sample.apply(this, arguments);
    try { if (document.getElementById('screen-review').classList.contains('active')) showReviewTab('grade'); } catch (_) {}
    return r;
  };
  const _home = renderHome;
  renderHome = function () {
    const r = _home.apply(this, arguments);
    try {
      const b = document.querySelector('#deck-list .st45-sample');
      if (b && !b.dataset.ez265) {
        b.dataset.ez265 = '1';
        b.innerHTML = ic23('award') + 'Try a sample deck';
        const line = ez265SampleLine();
        if (line) b.insertAdjacentHTML('afterend', `<span class="ez265-sample-s">${esc(line)}, graded in one tap</span>`);
      }
    } catch (_) {}
    return r;
  };
  // The first screen of the welcome tour offers the two quickest starts.
  const _tour = renderTour;
  renderTour = function () {
    const r = _tour.apply(this, arguments);
    try {
      if (tourStep !== 0 || state.decks.length || !STARTER_DECKS.length) return r;
      const acts = document.querySelector('#tour-inner .tour-acts');
      if (!acts) return r;
      acts.classList.add('ez265-acts');
      acts.innerHTML = `<button class="btn" onclick="closeTour();openImportModal()">${ic23('clipboard')}Paste my list</button>
        <button class="btn btn-primary" id="tour-next" onclick="closeTour();v45SampleGrade()">${ic23('award')}Try a sample deck</button>
        <button class="btn btn-ghost btn-sm ez265-tour" onclick="tourGo(1)">Take the tour${ic23('next')}</button>`;
    } catch (_) {}
    return r;
  };
})();

// ── Top fixes ──
// A short list at the top of each grade: up to three changes that help most, taken only from
// what the grade already says. Problems that stop the deck come first, then the swaps from
// Upgrades that raise the grade (best first), then the other Fix first problems, then swaps
// that raise Synergy or Power. Upgrades never cut the main attacker; this checks that again.
function tf265Up(deck) {
  try {
    const hit = _up75Cache.get(deck.id);
    if (!hit || hit.sig !== up75Sig(deck)) return { wait: true };
    if (hit.busy) return { wait: true };
    return { res: hit.res };
  } catch (_) { return {}; }
}
function tf265Keep(R) {
  const keep = new Set();
  try {
    const v = R.via || {};
    const line = new Set([v.auto, v.main].filter(Boolean).map(m => m.key).concat(v.boxPick || []));
    for (let i = 0; i < 3; i++) (R.entries || []).forEach(e => { if (e.card && line.has(e.card.key) && e.card.from) line.add(e.card.from); });
    (R.entries || []).forEach(e => { if (e.card && line.has(e.card.key)) keep.add(up75Key(e.name)); });
  } catch (_) {}
  return keep;
}
function tf265Items(deck) {
  const R = g29Grade(deck);
  if (!R) return null;
  const brk = typeof rules34Breaches === 'function' ? rules34Breaches(deck) : [];
  const probs = g29Problems(R);
  const up = tf265Up(deck), res = up.res;
  const keep = tf265Keep(R);
  const swaps = ((res && !res.why && res.swaps) || []).filter(s => !keep.has(up75Key(s.out)));
  const g = (a, b) => `${a.toFixed(1)} to ${b.toFixed(1)}`;
  const raise = swaps.filter(s => s.to > s.from).sort((a, b) => b.to - a.to);
  const lift = swaps.filter(s => !(s.to > s.from));
  const out = [];
  brk.forEach(t => out.push({ t, tone: 'crit' }));
  probs.filter(f => f.sev === 'crit').forEach(f => out.push({ t: f.t, tone: 'crit', j: 'g29-fix' }));
  raise.forEach(s => out.push({ t: `Swap 1 ${s.out} for 1 ${s.in}`, n: `grade ${g(s.from, s.to)}`, j: 'up75-sec' }));
  probs.filter(f => f.sev !== 'crit').forEach(f => out.push({ t: f.t, tone: 'warn', j: 'g29-fix' }));
  lift.forEach(s => {
    const n = s.syn[1] > s.syn[0] ? `Synergy ${g(s.syn[0], s.syn[1])}` : s.pow[1] > s.pow[0] ? `Power ${g(s.pow[0], s.pow[1])}` : '';
    out.push({ t: `Swap 1 ${s.out} for 1 ${s.in}`, n, j: 'up75-sec' });
  });
  return { items: out.slice(0, 3), wait: !!up.wait && out.length < 3 };
}
function tf265Html(deck) {
  const r = tf265Items(deck);
  if (!r || !r.items.length) return r && r.wait ? `<div class="tf265" id="tf265"><div class="tf265-h">Top fixes</div><p class="tf265-wait">Checking which changes help most.</p></div>` : '';
  const li = r.items.map(it => {
    const body = `<span class="tf265-t">${esc(it.t)}</span>${it.n ? `<span class="tf265-n">${esc(it.n)}</span>` : ''}`;
    return `<li class="${it.tone || ''}">${it.j ? `<button type="button" onclick="g29Jump('${it.j}')">${body}</button>` : `<div>${body}</div>`}</li>`;
  }).join('');
  const h = r.items.length === 1 ? 'Top fix' : `Top ${r.items.length === 2 ? 'two' : 'three'} fixes`;
  return `<div class="tf265" id="tf265"><div class="tf265-h">${h}</div><ol>${li}</ol></div>`;
}
function tf265Place() {
  try {
    const el = document.getElementById('grade-body');
    const deck = state.decks.find(d => d.id === state.activeDeckId);
    if (!el || !deck) return;
    const hero = el.querySelector('.g29-hero');
    const old = el.querySelector('#tf265');
    if (!hero || !el.querySelector('#g29-fix')) { if (old) old.remove(); return; }
    const h = tf265Html(deck);
    if (old) { if (h) old.outerHTML = h; else old.remove(); return; }
    if (!h) return;
    const at = hero.querySelector('.g29-verdict');
    if (at) at.insertAdjacentHTML('afterend', h); else hero.insertAdjacentHTML('beforeend', h);
  } catch (e) { console.warn('[top fixes]', e); }
}
(function () {
  const _rg = renderGrade;
  renderGrade = function () { const r = _rg.apply(this, arguments); tf265Place(); return r; };
  // Upgrades finish after the grade is drawn; the list catches up when they do.
  const _uh = up75Html;
  up75Html = function () { const r = _uh.apply(this, arguments); setTimeout(tf265Place, 0); return r; };
})();

// 2.7.4: home has drawn once, so the room kept for it can go.
(function () {
  const done = () => {
    const h = document.documentElement;
    if (!h.classList.contains('rd-boot')) return;
    h.classList.remove('rd-boot');
    // The logo is sized from the title; size it again now the title has its own size.
    try { if (typeof rd38Fit === 'function') rd38Fit(); } catch (_) {}
  };
  const _home = renderHome;
  renderHome = function () { try { return _home.apply(this, arguments); } finally { done(); } };
  window.addEventListener('load', () => setTimeout(done, 5000), { once: true });
})();
