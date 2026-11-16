// ═══════════ 3.0: "This grade looks off" ═══════════
// Under Share grade, a small button lets a player say a grade seems wrong. They
// pick one preset reason (no typing, since young players use the app too). What
// goes to rdydeck.com/api/report: the grade, the archetype the grade matched
// (a name from the meta data, never the player's own deck name), the reason and
// the app version. Nothing else. One flag per deck and grade on this device.
//
// Also the Settings switch for error reports (see js/report-errors.js).

const GF80_REASONS = [
  ['too-high', 'The grade is too high'],
  ['too-low', 'The grade is too low'],
  ['wrong-deck', 'It thinks my deck is a different deck'],
  ['card-misread', 'A card is read wrong'],
  ['other', 'Something else'],
];
const GF80_KEY = 'rd_flags_sent';
// 3.0.1: a flag tapped offline waits here and is sent when the device is back online.
const GF80_QUEUE = 'rd_flags_queue', GF80_QMAX = 10;

function gf80Sent() { try { return JSON.parse(localStorage.getItem(GF80_KEY) || '{}') || {}; } catch (_) { return {}; } }
function gf80Now() {
  const deck = state.decks.find(d => d.id === state.activeDeckId);
  const R = deck && typeof g29Grade === 'function' ? g29Grade(deck) : null;
  if (!deck || !R) return null;
  let arch = 'Unmatched';
  try {
    const a = typeof mu60Data !== 'undefined' && mu60Data && typeof g68Arch === 'function' ? g68Arch(deck, mu60Data) : null;
    if (a && a.deck && a.deck.name) arch = String(a.deck.name).slice(0, 60);
  } catch (_) {}
  return { deck, grade: Math.round(R.overall * 10) / 10, arch, key: deck.id + '|' + R.overall.toFixed(1) };
}
function gf80Open() {
  const g = gf80Now();
  if (!g) return;
  if (gf80Sent()[g.key]) { showToast('Thanks, you already flagged this grade.'); return; }
  openSheet(`<div class="modal-title">This grade looks off</div>
    <div class="modal-hint gf80-hint">Pick the closest reason. It is sent without your name or your deck list, and helps make grades match real results.</div>
    <div class="gf80-opts">${GF80_REASONS.map(([k, t]) => `<button type="button" class="btn gf80-opt" onclick="gf80Send('${k}')">${t}</button>`).join('')}</div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet()">Cancel</button></div>`);
}
async function gf80Send(reason) {
  const g = gf80Now();
  closeSheet();
  if (!g || !GF80_REASONS.some(r => r[0] === reason)) return;
  if (gf80Sent()[g.key]) { showToast('Thanks, you already flagged this grade.'); return; }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    if (typeof rdReportsWanted === 'function' && !rdReportsWanted()) { showToast('Reports are off in Settings, so nothing was sent.'); return; }
    gf80Queue({ key: g.key, grade: g.grade, arch: g.arch, reason });
    showToast('You are offline. It will be sent when you are back online.');
    return;
  }
  const ok = typeof rdReportPost === 'function' && rdReportsOn() ? await rdReportPost({ kind: 'flag', grade: g.grade, arch: g.arch, reason }) : false;
  if (ok) {
    const s = gf80Sent(); s[g.key] = 1;
    try { localStorage.setItem(GF80_KEY, JSON.stringify(s)); } catch (_) {}
    showToast('Thanks. This helps make grades match real results.');
  } else if (typeof rdReportsWanted === 'function' && !rdReportsWanted()) {
    showToast('Reports are off in Settings, so nothing was sent.');
  } else {
    showToast('Could not send it just now. Try again later.');
  }
}

function gf80Q() { try { const q = JSON.parse(localStorage.getItem(GF80_QUEUE) || '[]'); return Array.isArray(q) ? q : []; } catch (_) { return []; } }
function gf80QSave(q) { try { if (q.length) localStorage.setItem(GF80_QUEUE, JSON.stringify(q.slice(-GF80_QMAX))); else localStorage.removeItem(GF80_QUEUE); } catch (_) {} }
/** Keep a flag for later, and count it as sent so the same grade is not flagged twice. */
function gf80Queue(f) {
  const q = gf80Q().filter(x => x && x.key !== f.key);
  q.push(f); gf80QSave(q);
  const s = gf80Sent(); s[f.key] = 1;
  try { localStorage.setItem(GF80_KEY, JSON.stringify(s)); } catch (_) {}
}
let _gf80Flush = false;
/** Send the flags that waited for a connection. With reports off in Settings, they are dropped, never sent. */
async function gf80Flush() {
  if (_gf80Flush || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  let q = gf80Q();
  if (!q.length) return;
  if (typeof rdReportsWanted === 'function' && !rdReportsWanted()) { gf80QSave([]); return; }
  if (typeof rdReportPost !== 'function') return;
  _gf80Flush = true;
  try {
    const left = [];
    for (const f of q) {
      if (!f || !GF80_REASONS.some(r => r[0] === f.reason)) continue;
      const ok = await rdReportPost({ kind: 'flag', grade: f.grade, arch: f.arch, reason: f.reason });
      if (!ok) left.push(f);
    }
    gf80QSave(left);
  } finally { _gf80Flush = false; }
}
if (typeof addEventListener === 'function') {
  addEventListener('online', () => setTimeout(gf80Flush, 2000));
  addEventListener('load', () => setTimeout(gf80Flush, 3000));
}

(function () {
  const _rg = renderGrade;
  renderGrade = function () {
    const r = _rg.apply(this, arguments);
    const share = document.querySelector('#grade-body .g45-share');
    if (share && !share.querySelector('.gf80-btn')) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn btn-sm btn-ghost gf80-btn';
      b.setAttribute('onclick', 'gf80Open()');
      b.textContent = 'This grade looks off?';
      share.appendChild(b);
    }
    return r;
  };
})();

// Settings: a switch for error reports and grade flags.
(function () {
  const _os = openSettings;
  openSettings = function () {
    const r = _os.apply(this, arguments);
    const rows = document.querySelector('#x-modal-inner .st38-rows') || document.querySelector('.st38-rows');
    if (rows && !document.getElementById('st80-rep')) {
      const sec = document.createElement('div');
      sec.className = 'st38-sec'; sec.id = 'st80-rep';
      sec.innerHTML = `<div class="st38-h">Error reports</div>
        <p class="st38-p">When something breaks, RdyDeck sends a short report with no name, deck or address in it, so it can be fixed.</p>
        <div class="st38-seg" role="group" aria-label="Error reports">
          <button type="button" data-r="on" onclick="st80Rep(true)">On</button>
          <button type="button" data-r="off" onclick="st80Rep(false)">Off</button>
        </div>`;
      rows.parentNode.insertBefore(sec, rows);
      st80Paint();
    }
    return r;
  };
})();
function st80Rep(yes) { rdReportsSet(yes); if (!yes) gf80QSave([]); st80Paint(); }
function st80Paint() {
  const on = typeof rdReportsWanted !== 'function' || rdReportsWanted();
  document.querySelectorAll('#st80-rep button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.r === 'on') === on)));
}
