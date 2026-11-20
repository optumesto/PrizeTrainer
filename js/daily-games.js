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
// 3.4.22: one streak for the section. A day counts when any of the four games was played that day
// (Guess the Grade once it is finished), shown from the first day.
function dgDayPlayed(k) {
  const has = (st, done) => { try { const r = st && st.results && st.results[k]; return !!(r && (!done || r.done)); } catch (_) { return false; } };
  return has(state.daily) || has(state.puzzle) || has(typeof rpStore === 'function' ? rpStore() : null) || has(typeof gtgStore === 'function' ? gtgStore() : null, true);
}
function dgStreak() {
  let n = 0; const d = new Date();
  if (!dgDayPlayed(dailyKey(d.getTime()))) d.setDate(d.getDate() - 1);
  while (n < 3660 && dgDayPlayed(dailyKey(d.getTime()))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function dgStreakText(n) { return n === 1 ? '1 day streak' : `${n} day streak`; }
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
  // "New today" stays up while any game is still open today.
  n.textContent = all ? `All ${ids.length} played` : 'New today';
  const dt = document.getElementById('dg51-date');
  if (dt) dt.textContent = shortDate23(Date.now());
  const meta = document.getElementById('dg51-meta');
  if (meta) {
    const st = dgStreak(), bits = [];
    if (done && !all) bits.push(`<span>${done} of ${ids.length} played</span>`);
    if (st) bits.push(`<span class="dg51-st">${dgStreakText(st)}</span>`);
    meta.innerHTML = bits.join('');
    meta.hidden = !bits.length;
  }
}
// The rows are drawn with the Daily puzzle's (js/rare-pull.js and js/gtg.js hook in the same way),
// so the heading is counted after every row is drawn.
(function () {
  if (typeof renderPuzzleCard !== 'function') return;
  const _r = renderPuzzleCard;
  renderPuzzleCard = function () { const x = _r.apply(this, arguments); try { dgRenderHead(); } catch (e) { console.warn('[daily games]', e); } return x; };
  if (document.getElementById('dg51-n')) { try { dgRenderHead(); } catch (_) {} }
})();
