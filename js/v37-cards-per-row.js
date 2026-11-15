
// ═══════════ v37: cards per row ═══════════
// A small control above the card grid lets the player fit more cards on a row
// (up to three more than the default for the screen width). The choice is a
// step, so it carries across phone and tablet widths, and is kept on this device.
// Pinch is left to page zoom, so the two never fight.
const CZ37_KEY = 'ptcg_cardcols';
function cz37Step() { try { const n = parseInt(localStorage.getItem(CZ37_KEY), 10); return n >= 0 && n <= 3 ? n : 0; } catch (_) { return 0; } }
function cz37Base(daily) {
  const w = (m) => window.matchMedia('(min-width:' + m + 'px)').matches;
  if (daily) return window.matchMedia('(max-width:340px)').matches ? 3 : 4;
  return w(1600) ? 10 : w(1100) ? 8 : w(768) ? 6 : w(560) ? 4 : 3;
}
function cz37Apply() {
  const s = cz37Step(), root = document.documentElement;
  if (document.body) document.body.dataset.cz = String(s);
  root.style.setProperty('--cz-cols', String(cz37Base(false) + s));
  root.style.setProperty('--cz-dcols', String(cz37Base(true) + s));
  document.querySelectorAll('.cz-bar').forEach(b => cz37Fill(b));
}
function cz37Fill(bar) {
  const base = cz37Base(bar.dataset.daily === '1'), s = cz37Step();
  bar.querySelector('.cz-opts').innerHTML = [0, 1, 2, 3].map(i =>
    `<button type="button" aria-pressed="${i === s}" aria-label="${base + i} cards per row" onclick="cz37Set(${i})">${base + i}</button>`).join('');
}
function cz37Set(i) {
  try { localStorage.setItem(CZ37_KEY, String(i)); } catch (_) {}
  cz37Apply();
}
function cz37Bar(host, daily) {
  if (!host || host.querySelector('.cz-bar')) return;
  const first = host.querySelector('.review-group');
  if (!first) return;
  const bar = document.createElement('div');
  bar.className = 'cz-bar'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Cards per row');
  if (daily) bar.dataset.daily = '1';
  bar.innerHTML = '<span class="cz-label">Cards per row</span><div class="cz-opts"></div>';
  first.parentNode.insertBefore(bar, first);
  cz37Fill(bar);
}
(function () {
  const _r = renderReview;
  renderReview = function (deck) {
    const out = _r.apply(this, arguments);
    try { cz37Bar(document.getElementById('review-body'), false); } catch (_) {}
    return out;
  };
  const _d = openDailyList;
  openDailyList = function () {
    const out = _d.apply(this, arguments);
    try { cz37Bar(document.getElementById('dly33-list'), true); } catch (_) {}
    return out;
  };
  try {
    [560, 768, 1100, 1600].forEach(m => window.matchMedia('(min-width:' + m + 'px)').addEventListener('change', cz37Apply));
    window.matchMedia('(max-width:340px)').addEventListener('change', cz37Apply);
  } catch (_) {}
  if (document.body) cz37Apply(); else document.addEventListener('DOMContentLoaded', cz37Apply);
})();
