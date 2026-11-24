// ═══════════ 3.2.7: fold sections ═══════════
// The Odds, Drills and Notes tabs and the deck builder stack several sections, which gets long on a
// phone. Tapping a section's heading now folds it to that one line (a chevron shows which way it is),
// and tapping again opens it. Each section's open or folded state is kept on this device
// (localStorage rd_fold), by tab and by the section's English heading, so it stays that way the next
// time and in every language. The Grade tab's sections already fold (Upgrades, Grade history and the
// rest); now the way they were left is kept too.
// Open by default: the part each tab is for. Folded by default:
//   Odds:    Opening Basics, Main attacker (3.5.4), Prize risk
//   Drills:  Opponent prize read
//   Notes:   Edit log, Compare lists
//   Builder: Suggestions, and Start from once the list has cards
// A tab with only one section (Hand) gets no fold. Nothing here changes a grade.
// 3.5.4 (Mason, 24 Nov 2026: "Lets do more drop downs/collapsible sections"): on the Grade tab, How this grade
// was worked out, Main attacker, Grade history, Grade vs win rate, Against the meta and Watch out for start
// folded too, each with one line that says what is inside. A chip that jumps to a section keeps it open.

const FS325_KEY = 'rd_fold';
let _fs325 = null;
function fs325Store() {
  if (_fs325) return _fs325;
  try { _fs325 = JSON.parse(localStorage.getItem(FS325_KEY) || '{}') || {}; } catch (_) { _fs325 = {}; }
  if (typeof _fs325 !== 'object' || Array.isArray(_fs325)) _fs325 = {};
  return _fs325;
}
function fs325Set(key, shut) {
  const s = fs325Store();
  s[key] = shut ? 1 : 0;
  try { localStorage.setItem(FS325_KEY, JSON.stringify(s)); } catch (_) {}
}
/** A heading's English words, without counts in child tags (so "Your list 12 cards" is "Your list"). */
function fs325Title(h) {
  let t = '';
  h.childNodes.forEach(n => {
    if (n.nodeType !== 3) return;
    try { t += typeof rdI18n !== 'undefined' && rdI18n.orig ? rdI18n.orig(n) : n.nodeValue; } catch (_) { t += n.nodeValue; }
  });
  return t.replace(/\s+/g, ' ').trim();
}

const FS325_SCOPES = [
  { el: 'odds-body', name: 'odds', sec: '.g-sec', head: '.g-sec-t', shut: { 'Opening Basics': 1, 'Main attacker': 1, 'Prize risk': 1 } },
  { el: 'hand-body', name: 'hand', sec: '.g-sec', head: '.g-sec-t', shut: {} },
  { el: 'drills-body', name: 'drills', sec: '.g-sec', head: '.g-sec-t', shut: { 'Opponent prize read': 1 } },
  { el: 'notes-body', name: 'notes', sec: '.g-sec', head: '.g-sec-t', shut: { 'Edit log': 1, 'Compare lists': 1 } },
  { el: 'bld-body', name: 'build', sec: '.bld-sec', head: 'h2.bld-h', shut: { 'Suggestions': 1 },
    more: (title, root) => title === 'Start from' && !!root.querySelector('.bld-group .bld-row') },
];

function fs325Paint(sec, head, shut) {
  sec.classList.toggle('fs325-shut', shut);
  head.setAttribute('aria-expanded', String(!shut));
}
function fs325Apply(sc) {
  const root = document.getElementById(sc.el);
  if (!root) return;
  const secs = [...root.querySelectorAll(sc.sec)].filter(s => {
    const h = s.firstElementChild;
    return h && h.matches(sc.head) && !s.closest('.fs325-skip');
  });
  if (secs.length < 2) return;   // one section: nothing to fold away
  secs.forEach(sec => {
    const head = sec.firstElementChild;
    const title = sec.dataset.fs325 || fs325Title(head);
    if (!title) return;
    const key = sc.name + ':' + title;
    const store = fs325Store();
    const shut = key in store ? !!store[key] : !!(sc.shut[title] || (sc.more && sc.more(title, root)));
    if (sec.dataset.fs325 !== title) {
      sec.dataset.fs325 = title;
      sec.classList.add('fs325');
      head.classList.add('fs325-h');
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');
    }
    fs325Paint(sec, head, shut);
  });
}
function fs325Toggle(head) {
  const sec = head.parentElement;
  if (!sec || !sec.dataset.fs325) return;
  const sc = FS325_SCOPES.find(s => sec.closest('#' + s.el));
  if (!sc) return;
  const shut = !sec.classList.contains('fs325-shut');
  fs325Paint(sec, head, shut);
  fs325Set(sc.name + ':' + sec.dataset.fs325, shut);
}

// The Grade tab's own folds (details with an id): keep how they were left.
function fs325Grade() {
  const root = document.getElementById('grade-body');
  if (!root) return;
  const store = fs325Store();
  root.querySelectorAll('details.g29-fold[id]').forEach(d => {
    if (d.dataset.fs325) return;
    d.dataset.fs325 = '1';
    const key = 'grade:' + d.id;
    if (key in store) d.open = !store[key];
  });
}

(function () {
  if (typeof document === 'undefined') return;
  let queued = false;
  const run = () => {
    queued = false;
    FS325_SCOPES.forEach(sc => { try { fs325Apply(sc); } catch (_) {} });
    try { fs325Grade(); } catch (_) {}
  };
  const soon = () => { if (!queued) { queued = true; Promise.resolve().then(run); } };
  // Sections are drawn and drawn again by many parts of the app, so watch for new ones.
  const watch = () => {
    const mo = new MutationObserver(soon);
    [...FS325_SCOPES.map(s => s.el), 'grade-body'].forEach(id => {
      const el = document.getElementById(id);
      if (el) mo.observe(el, { childList: true, subtree: true });
    });
    run();
    // A chip that jumps to a Grade tab section opens it; keep it open when the grade is drawn again.
    if (typeof g29Jump === 'function' && !g29Jump._fs) {
      const _j = g29Jump;
      g29Jump = function (id) {
        const r = _j.apply(this, arguments);
        const d = document.getElementById(id);
        if (d && d.matches('#grade-body details.g29-fold[id]')) fs325Set('grade:' + id, false);
        return r;
      };
      g29Jump._fs = true;
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  // Tap, Enter or Space on a heading.
  document.addEventListener('click', e => {
    const h = e.target && e.target.closest && e.target.closest('.fs325-h');
    if (h && !e.target.closest('button, a, input, select, textarea')) fs325Toggle(h);
    const s = e.target && e.target.closest && e.target.closest('#grade-body details.g29-fold[id] > summary');
    if (s) {
      const d = s.parentElement;
      setTimeout(() => fs325Set('grade:' + d.id, !d.open), 0);
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const h = e.target && e.target.classList && e.target.classList.contains('fs325-h') ? e.target : null;
    if (!h) return;
    e.preventDefault();
    fs325Toggle(h);
  });
})();
