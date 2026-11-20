// ═══════════ 3.4.21: Daily games ═══════════
// The four daily games (Daily challenge, Daily puzzle, Rare Pull, Guess the Grade) sit in one
// section on home, under the decks, so the grader stays the first thing on the screen. Each game
// still draws its own row (js/core.js, js/rare-pull.js, js/gtg.js); this file marks the rows
// played today and counts them in the section's heading. Nothing here leaves the device.

/** Which of today's games are played, by the id of each game's row. */
function dgPlayedToday() {
  const k = dailyKey();
  const has = (st, done) => { try { const r = st && st.results && st.results[k]; return !!(r && (!done || r.done)); } catch (_) { return false; } };
  return {
    'daily-card': has(state.daily),
    'puzzle-card': has(state.puzzle),
    'rp-card': has(typeof rpStore === 'function' ? rpStore() : null),
    'gtg-card': has(typeof gtgStore === 'function' ? gtgStore() : null, true),
  };
}
function dgRenderHead() {
  const n = document.getElementById('dg51-n');
  if (!n) return;
  const played = dgPlayedToday(), ids = Object.keys(played);
  let done = 0;
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (played[id]) { done++; el.setAttribute('data-dg-done', ''); } else el.removeAttribute('data-dg-done');
  });
  const all = done === ids.length;
  n.classList.toggle('all', all);
  n.textContent = !done ? 'New today' : all ? `All ${ids.length} played` : `${done} of ${ids.length} played`;
}
// The rows are drawn with the Daily puzzle's (js/rare-pull.js and js/gtg.js hook in the same way),
// so the heading is counted after every row is drawn.
(function () {
  if (typeof renderPuzzleCard !== 'function') return;
  const _r = renderPuzzleCard;
  renderPuzzleCard = function () { const x = _r.apply(this, arguments); try { dgRenderHead(); } catch (e) { console.warn('[daily games]', e); } return x; };
  if (document.getElementById('dg51-n')) { try { dgRenderHead(); } catch (_) {} }
})();
