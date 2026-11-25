
// ═══════════ v40: fixes from the 9 Nov 2026 audit ═══════════

// 1. A deck with cards that are not Standard legal now cannot grade above 4.9.
// 3.2.7: a list that grades below 4.9 anyway is told the cap, not that it is held there.
// The grade still runs on the list as it is, but the cap and a first "fix" say why.
const G40_CAP = 4.9;
(function () {
  const _grade = gradeDeck;
  gradeDeck = function (deck) {
    const R = _grade.apply(this, arguments);
    try {
      if (!R || !deck || isDailyChallenge(deck) || deck.format === 'expanded') return R;
      if (!(deck.cards || []).some(c => c.supertype) || typeof r29Rows !== 'function') return R;
      const rows = r29Rows(deck), k = r29Counts(rows);
      R.rot = k;
      if (k.out > 0) {
        const names = rows.filter(r => r.st === 'out' || r.st === 'nomark').map(r => r.name);
        const list = names.slice(0, 3).join(', ') + (names.length > 3 ? ` and ${names.length - 3} more` : '');
        R.rawOverall = R.overall;
        R.overall = Math.min(R.overall, G40_CAP);
        R.coh.flaws.unshift({ sev: 'crit', t: `${k.out} card${k.out > 1 ? 's are' : ' is'} not Standard legal now`,
          d: `${list}. ${k.out > 1 ? 'These cannot' : 'It cannot'} be played in Standard, so the grade ${R.rawOverall > G40_CAP ? 'is held at' : 'can go no higher than'} ${G40_CAP} until ${k.out > 1 ? 'they are' : 'it is'} swapped for legal cards.` +
            (R.rawOverall > G40_CAP ? ` The list alone would score ${R.rawOverall.toFixed(1)}.` : '') +
            '' });
      } else if (k.unconf > 0) {
        // 3.2.8 (Muse final report H5): a card whose mark the card database could not confirm is not
        // called legal in silence. It is named here, after the other problems, and the grade is unchanged.
        const names = rows.filter(r => r.st === 'unconf' || r.st === 'unread').map(r => r.name);
        const one = names.length === 1, list = names.slice(0, 3).join(', ') + (names.length > 3 ? ` and ${names.length - 3} more` : '');
        R.coh.flaws.push({ sev: 'warn', t: `${names.length} card${one ? '' : 's'} not confirmed as Standard legal`,
          d: `Check the regulation mark on ${list} before an event. The card database could not confirm ${one ? 'it' : 'them'}, so the grade counts ${one ? 'it' : 'them'} as legal for now.` });
      }
    } catch (_) {}
    return R;
  };
  // The cached grade has to change when the rotation data does.
  const _sig = g29Sig;
  g29Sig = function (deck) {
    const rot = (deck && deck.rot29 && deck.rot29.names) || {};
    return _sig.apply(this, arguments) + '|' + ((deck && deck.format) || '') + '|' +
      (deck.cards || []).map(c => (c.reg && c.reg.mark) || '').join('') + '|' +
      Object.keys(rot).sort().map(k => k + ':' + ((rot[k] && rot[k].best) || '')).join(',') +
      '|' + (typeof r273 === 'object' && r273 ? r273.asOf : '');
  };
})();

// 2. A field that stops a save is marked and focused, not only named in a toast.
function f40Invalid(id, msg) {
  const el = document.getElementById(id);
  if (el) {
    el.setAttribute('aria-invalid', 'true');
    el.classList.add('f40-bad');
    el.addEventListener('input', () => { el.removeAttribute('aria-invalid'); el.classList.remove('f40-bad'); }, { once: true });
    try { el.focus(); } catch (_) {}
  }
  showToast(msg);
}

var f40Saved;   // set further down

// 4. Sheets: a close button that stays at the top, and the buttons stay at the bottom.
(function () {
  const _open = openSheet;
  openSheet = function () {
    const r = _open.apply(this, arguments);
    try {
      const inner = document.getElementById('x-modal-inner');
      const t = inner && inner.firstElementChild;
      if (t && t.classList.contains('modal-title') && !t.querySelector('.x40-close')) {
        t.classList.add('x40-head');
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'icon-btn x40-close'; b.setAttribute('aria-label', 'Close'); b.title = 'Close';
        b.innerHTML = '<svg class="ic"><use href="#i-x"/></svg>';
        b.onclick = () => { if (typeof _v26Close === 'object' && _v26Close['x-modal']) _v26Close['x-modal'](); else closeSheet(); };
        t.appendChild(b);
      }
    } catch (_) {}
    return r;
  };
})();

// 5. Share the app on a phone: iPhone Safari ignores downloads, so copy the link instead.
(function () {
  const _dl = downloadAppFile;
  downloadAppFile = function () {
    if (!/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) return _dl.apply(this, arguments);
    const url = location.origin + location.pathname.replace(/index\.html$/, '').replace(/^\/(es|pt|fr|de|it)\/$/, '/');
    const done = () => showToast('Link copied. Send it to your friend.');
    try { navigator.clipboard.writeText(url).then(done, () => showToast(url)); } catch (_) { showToast(url); }
  };
})();

// v43: in the Play app there is no file to send, so Share the app shares the web address.
if (PT_PLAY) {
  shareApp = async function () {
    const url = 'https://rdydeck.com/';
    try {
      if (navigator.share) { await navigator.share({ title: 'RdyDeck', text: 'Can Your Deck Win? Grade your deck and train your prizes.', url }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); showToast('Link copied. Send it to your friend.'); } catch (_) { showToast(url); }
  };
}
