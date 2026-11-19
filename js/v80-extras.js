// ═══════════ 3.0: extras ═══════════
// Six small things, none of which changes a grade:
// 1. How accurate the grades are: one line from accuracy.json under How the grade works.
// 2. What's next: planned features, from Settings and Help, with Send feedback.
// 3. Share grade: one tap from the share sheet (the picture where the phone can share files,
//    else the picture saved and the link copied).
// 4. How did it do?: an event record (wins, losses, ties, placing) on a grade history entry,
//    kept on this device only.
// 5. Against the meta: the expected win rate against the field as it is played now. Display only.
// 6. New set week: one home line in a new set's first week.

// ── 2. What's next: the lead edits this list ──
// Each item: t is the name, d one short line. Shown in this order.
const WHATS_NEXT = [
  { t: 'Google Play app', d: 'RdyDeck as an Android app.' },
  { t: 'Spanish and Portuguese deck guides', d: 'The deck guides in two more languages.' },
  { t: 'Regionals results', d: 'Results from Regionals and other big in-person events, once a data source allows it.' },
  { t: 'Puzzle mode', d: 'More win this turn puzzles to play whenever you like.' },
];
// Discord invite link, once a server exists. While it is empty, no Discord link shows anywhere.
// It never shows to anyone the age setting tags as under 13 (no answer counts as under 13).
const DISCORD_URL = '';

function wx80Discord() {
  if (!DISCORD_URL || !/^https:\/\/discord\.(gg|com)\//.test(DISCORD_URL)) return '';
  if (typeof age32Tag !== 'function' || age32Tag() === '1') return '';
  return `<a class="btn" href="${esc(DISCORD_URL)}" target="_blank" rel="noopener">Join the Discord</a>`;
}
function openWhatsNext() {
  const items = WHATS_NEXT.map(i => `<li><b>${esc(i.t)}</b>${i.d ? `<span>${esc(i.d)}</span>` : ''}</li>`).join('');
  const fb = typeof FEEDBACK_EMAIL === 'string' && FEEDBACK_EMAIL;
  const dc = wx80Discord();
  openSheet(`<div class="modal-title">What's next</div>
    <div class="wn-sub">Planned, in no fixed order. Plans can change.</div>
    <ul class="wn-list" id="wx80-list">${items}</ul>
    <div class="modal-hint" style="margin-top:0.9rem">Want something else? Tell us. Ideas from players decide what comes first.</div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeSheet()">Close</button>
      ${dc}
      ${fb ? `<button class="btn btn-primary" id="wx80-fb" onclick="wx80Feedback()">Send feedback</button>` : ''}
    </div>`);
}
/** The app's own feedback sheet, set to Idea. */
function wx80Feedback() {
  closeSheet();
  openFeedback();
  const b = document.querySelector('.fb-seg .mode-opt[data-k="Idea"]');
  if (b && typeof setFbKind === 'function') setFbKind(b);
}
(function () {
  const go = '<svg class="ic"><use href="#i-next"/></svg>';
  const _set = openSettings;
  openSettings = function () {
    const r = _set.apply(this, arguments);
    try {
      const wn = document.querySelector('.st38-rows .st38-row[onclick*="openWhatsNew"]');
      if (wn && !document.getElementById('wx80-set')) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'st38-row'; b.id = 'wx80-set';
        b.onclick = () => { closeSheet(); openWhatsNext(); };
        b.innerHTML = `<span>What's next<small>Planned features</small></span>${go}`;
        wn.parentNode.insertBefore(b, wn.nextSibling);
      }
    } catch (_) {}
    return r;
  };
  const _help = openHelpSheet;
  openHelpSheet = function () {
    const r = _help.apply(this, arguments);
    try {
      const list = document.querySelector('.hs-list');
      if (list && !document.getElementById('wx80-help')) {
        const b = document.createElement('button');
        b.className = 'hs-row'; b.id = 'wx80-help';
        b.onclick = () => { closeSheet(); openWhatsNext(); };
        b.innerHTML = `<span class="ha-ic">${ic23('trend')}</span><span class="hs-tx"><b>What's next</b><span>Planned features, and a place to ask for yours</span></span><svg class="ic hs-go"><use href="#i-next"/></svg>`;
        const fb = list.querySelector('.hs-row[onclick*="openFeedback"]');
        list.insertBefore(b, fb ? fb.nextSibling : null);
      }
    } catch (_) {}
    return r;
  };
})();

// ── 1. How accurate the grades are ──
// accuracy.json is written each week by the grade check (tests/grade-check.mjs --board). It holds
// only the scoreboard: per set, the rank match between grades and win rates, decks and games.
const ACC80_URL = './accuracy.json', ACC80_KEY = 'pt_acc80';
let acc80 = null, acc80Tried = false;
function acc80Valid(j) {
  try {
    if (!j || j.schema !== 1 || !d30Day(j.asOf) || !Array.isArray(j.sets)) return null;
    const rho = v => typeof v === 'number' && v >= -1 && v <= 1 ? v : null;
    const sets = j.sets.slice(0, 6).map(s => s && d30Str(s.name, 40) && d30Day(s.from) && d30Day(s.to) && Number.isInteger(s.decks) && Number.isInteger(s.games)
      ? { name: s.name, from: s.from, to: s.to, decks: s.decks, games: s.games, shown: rho(s.shown), cards: rho(s.cards) } : null).filter(Boolean);
    return sets.length ? { asOf: j.asOf, sets } : null;
  } catch (_) { return null; }
}
function acc80Load() {
  if (!acc80) { try { acc80 = acc80Valid(JSON.parse(safeLocalGet(ACC80_KEY) || 'null')); } catch (_) {} }
  if (acc80Tried) return;
  acc80Tried = true;
  fetch(ACC80_URL, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => {
    const a = acc80Valid(j);
    if (!a) return;
    acc80 = a;
    safeLocalSet(ACC80_KEY, JSON.stringify(j));
    acc80Place();
  }).catch(() => {});
}
/** The newest set with enough decks to trust, else the one before it. */
function acc80Line() {
  if (!acc80) return '';
  const s = acc80.sets.slice().reverse().find(x => x.decks >= 8 && x.shown != null);
  if (!s) return '';
  const cards = s.cards != null ? ` (${s.cards.toFixed(2)} from the cards alone)` : '';
  return `<p class="g29-about-p" id="acc80"><b>How accurate the grades are.</b> On ${esc(s.name)} results, grades put ${s.decks} decks in an order that matches their online win rates at ${s.shown.toFixed(2)}${cards}. 1.0 means exactly the order of their results. <a href="how-grading-works.html#accuracy">See every set</a></p>`;
}
function acc80Place() {
  const fold = document.getElementById('g29-about');
  if (!fold || document.getElementById('acc80')) return;
  const h = acc80Line();
  if (h) fold.insertAdjacentHTML('beforeend', h);
}

// ── 5. Against the meta: expected win rate against the field now ──
// Each matchup counts by how often that opponent is played: since the newest set came out once
// there are enough lists (the same 500 refresh-matchups.mjs uses to pick the opponents), else over
// the whole window. Only opponents with MU60_FEW or more matches count. Mirrors are left out, as
// they are in the data. Display only: the grade never reads this.
const MX80_NOW = 500, MX80_MIN = 3;
function mx80Field(arch, data) {
  if (!arch || !data || !Array.isArray(data.decks)) return null;
  const curN = d => (d.cur && d.cur.lists) || 0;
  let curTotal = data.decks.reduce((a, d) => a + curN(d), 0);
  if (data.cur && data.cur.place) for (const v of Object.values(data.cur.place)) if (v && v[0] > curTotal) curTotal = v[0];
  const now = !!(data.cur && curTotal >= MX80_NOW);
  let W = 0, P = 0, G = 0, k = 0;
  for (const [id, recs] of Object.entries(arch.vs || {})) {
    const opp = data.decks.find(d => d.id === id);
    if (!opp || id === arch.id) continue;
    const r = mu60Sum(recs), n = r[0] + r[1] + r[2];
    if (n < MU60_FEW) continue;
    const share = now ? curN(opp) / curTotal : (opp.share || 0) / 100;
    if (!(share > 0)) continue;
    W += share; P += share * r[0] / n; G += n; k++;
  }
  if (k < MX80_MIN || !W) return null;
  return { p: P / W * 100, cover: W * 100, games: G, decks: k, since: now ? data.cur.since : '' };
}
function mx80Html(arch, data) {
  const f = mx80Field(arch, data);
  if (!f) return '';
  const when = f.since ? `since ${esc(d30Nice(f.since))}` : 'in these results';
  return `<p class="mu60-p" id="mx80"><b>Against the field now:</b> about <b>${f.p.toFixed(1)}%</b> expected. That is its record against the ${f.decks} most played decks (${Math.round(f.cover)}% of play ${when}), each counted by how often that deck is played, over ${f.games.toLocaleString('en-US')} matches.</p>`;
}

(function () {
  const _rg = renderGrade;
  renderGrade = function () {
    const r = _rg.apply(this, arguments);
    try { acc80Load(); acc80Place(); } catch (_) {}
    try {
      const sec = document.getElementById('mu60-sec');
      if (sec && !document.getElementById('mx80') && mu60Data) {
        const deck = state.decks.find(d => d.id === state.activeDeckId);
        const pickId = deck ? mu60Picks()[deck.id] : '';
        const arch = deck && (mu60Data.decks.find(d => d.id === pickId) || mu60Match(deck, mu60Data));
        const h = arch ? mx80Html(arch, mu60Data) : '';
        const won = sec.querySelector('.mu60-p');
        if (h && won) won.insertAdjacentHTML('afterend', h);
      }
    } catch (e) { console.warn('[field]', e); }
    try { ev80Place(); } catch (e) { console.warn('[event record]', e); }
    return r;
  };
})();

// ── 3. Share grade: one tap from the sheet ──
// The Share button waits for the picture, so one tap always sends it. Where the phone cannot
// share a file, the same button saves the picture and copies the grade and link.
function sh80Files(g) {
  try { return !!(g && g.file && navigator.share && navigator.canShare && navigator.canShare({ files: [g.file] })); } catch (_) { return false; }
}
function sh80Buttons() {
  const g = _gs45, acts = document.querySelector('.gs45-actions');
  if (!g || !acts) return;
  let b = document.getElementById('sh80-go') || acts.querySelector('.btn-primary');
  if (!b) {
    b = document.createElement('button');
    b.className = 'btn btn-primary';
    b.onclick = () => gs45Share();
    acts.appendChild(b);
  }
  b.id = 'sh80-go';
  b.disabled = !g.done80;
  const pic = !!g.img;
  b.innerHTML = ic23('share') + (sh80Files(g) || (!pic && navigator.share) ? 'Share' : pic ? 'Save and copy link' : 'Copy link');
}
(function () {
  const _open = v45ShareGrade;
  v45ShareGrade = async function () {
    const r = await _open.apply(this, arguments);
    try { sh80Buttons(); } catch (_) {}
    return r;
  };
  const _draw = gs261Render;
  gs261Render = async function () {
    const g = _gs45;
    if (g) g.done80 = false;
    try { sh80Buttons(); } catch (_) {}
    const tok = g ? g.tok + 1 : 0;   // the original counts each draw in g.tok
    let r;
    try { r = await _draw.apply(this, arguments); }
    catch (_) {
      // A draw that fails (no canvas on this device) left the sheet waiting: say so, so the link still goes.
      const pic = document.getElementById('gs261-pic');
      if (g && g === _gs45 && g.tok === tok && pic) { g.img = ''; g.file = null; pic.innerHTML = '<span>The picture could not be made on this device. The link still works.</span>'; }
    }
    // Done when the sheet shows the picture (or says it could not be made), not a newer draw's wait.
    const pic = document.getElementById('gs261-pic');
    if (g && g === _gs45 && pic && !/Making your card/.test(pic.textContent)) g.done80 = true;
    try { sh80Buttons(); } catch (_) {}
    return r;
  };
})();
gs45Share = async function () {
  const g = _gs45; if (!g || !g.done80) return;
  if (sh80Files(g)) {
    try { await navigator.share({ files: [g.file], text: g.text + ' ' + g.url }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  } else if (!g.img && navigator.share) {
    try { await navigator.share({ text: g.text, url: g.url }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  if (g.img) gs45Save();
  let copied = false;
  try { await navigator.clipboard.writeText(g.text + ' ' + g.url); copied = true; } catch (_) {}
  if (g.img) showToast(copied ? 'Picture saved and link copied. Post the picture and paste the link with it.' : 'Picture saved. Copy the link with Copy link.');
  else showToast(copied ? 'Grade and link copied. Paste it anywhere.' : g.url);
};

// ── 4. How did it do?: an event record on a grade history entry ──
// Kept on the entry itself (deck.gradeLog.e[i].ev = { w, l, t, p, n }), so it stays on this device
// with the grade history and is never sent anywhere. p (placing) and n (event name, 3.0.1) are optional.
const EV80_MAX = 99, EV80_PMAX = 9999, EV80_NMAX = 40;
const ev80Name = x => typeof x === 'string' ? x.replace(/[\u0000-\u001f\u007f<>]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, EV80_NMAX) : '';
function ev80Get(e) {
  const v = e && e.ev;
  const n = (x, m) => Number.isInteger(x) && x >= 0 && x <= m ? x : 0;
  if (!v || typeof v !== 'object') return null;
  const p = Number.isInteger(v.p) && v.p >= 1 && v.p <= EV80_PMAX ? v.p : null;
  const out = { w: n(v.w, EV80_MAX), l: n(v.l, EV80_MAX), t: n(v.t, EV80_MAX), p, n: ev80Name(v.n) };
  return out.w + out.l + out.t || out.p ? out : null;
}
function ev80Text(v) {
  const rec = `${v.w}-${v.l}-${v.t}`;
  return v.p ? `${rec}, ${mu61Nth(v.p)} place` : rec;
}
function ev80Entry(deck, t) {
  const g = deck && deck.gradeLog;
  return g && Array.isArray(g.e) ? g.e.find(x => x && x.t === t) : null;
}
function ev80Bits(e, mine) {
  const v = ev80Get(e);
  if (v) return `<div class="ev80-row">${v.n ? `<span class="ev80-nm" data-no-tr>${esc(v.n)}</span>` : ''}<span class="ev80-rec">${v.n ? 'Your record there:' : 'Your record at an event:'} <b>${ev80Text(v)}</b> <span class="ev80-k">(wins, losses, ties)</span></span><button type="button" class="ev80-btn" onclick="ev80Open(${e.t})">Edit</button><button type="button" class="ev80-btn" onclick="ev80Del(${e.t})">Delete</button></div>`;
  return mine ? `<div class="ev80-row"><button type="button" class="ev80-btn" onclick="ev80Open(${e.t})">How did it do?</button></div>` : '';
}
/** Adds the records and the buttons to the Grade history section after it is drawn. */
function ev80Place() {
  const sec = document.getElementById('gh72-sec');
  const deck = state.decks.find(d => d.id === state.activeDeckId);
  if (!sec || !deck || sec.querySelector('.ev80-row')) return;
  const log = gh72Log(deck);
  if (!log) return;
  const e = log.e, rows = sec.querySelectorAll('.gh72-row');
  if (rows.length === e.length) {
    rows.forEach((li, i) => {
      const x = e[e.length - 1 - i];   // the list is drawn newest first
      const h = ev80Bits(x, i === 0 || gh72Mine(x));
      if (h) li.insertAdjacentHTML('beforeend', h);
    });
  } else if (e.length === 1) {
    const h = ev80Bits(e[0], true);
    if (h) sec.insertAdjacentHTML('beforeend', h);
  }
}
let _ev80T = 0;
function ev80Open(t) {
  const deck = state.decks.find(d => d.id === state.activeDeckId), e = ev80Entry(deck, t);
  if (!e) return;
  _ev80T = t;
  const v = ev80Get(e) || { w: 0, l: 0, t: 0, p: null };
  const step = (id, lbl, val) => `<div class="ev80-f"><label class="ev80-l" for="ev80-${id}">${lbl}</label><div class="ev80-step">
      <button type="button" class="btn btn-sm" aria-label="${lbl}: one less" onclick="ev80Step('${id}',-1)">-</button>
      <input type="number" id="ev80-${id}" inputmode="numeric" min="0" max="${EV80_MAX}" step="1" value="${val}">
      <button type="button" class="btn btn-sm" aria-label="${lbl}: one more" onclick="ev80Step('${id}',1)">+</button></div></div>`;
  openSheet(`<div class="modal-title">How did it do?</div>
    <div class="modal-hint" style="margin-bottom:0.9rem">The record from an event you played with this version, graded ${e.g.toFixed(1)}. It stays on this device and is never sent anywhere.</div>
    <div class="ev80-form">
      <div class="ev80-f ev80-fn"><label class="ev80-l" for="ev80-n">Event name</label>
        <input type="text" id="ev80-n" maxlength="${EV80_NMAX}" autocomplete="off" value="${esc(v.n || '')}" placeholder="Optional"></div>
      ${step('w', 'Wins', v.w)}${step('l', 'Losses', v.l)}${step('t', 'Ties', v.t)}
      <div class="ev80-f"><label class="ev80-l" for="ev80-p">Placing</label><div class="ev80-step">
        <input type="number" id="ev80-p" inputmode="numeric" min="1" max="${EV80_PMAX}" step="1" value="${v.p || ''}" placeholder="Optional"></div></div>
    </div>
    <div class="modal-actions">
      ${ev80Get(e) ? `<button class="btn btn-ghost" onclick="ev80Save(true)">Delete</button>` : `<button class="btn btn-ghost" onclick="closeSheet()">Cancel</button>`}
      <button class="btn btn-primary" id="ev80-save" onclick="ev80Save(false)">Save</button>
    </div>`);
}
function ev80Step(id, d) {
  const i = document.getElementById('ev80-' + id);
  if (!i) return;
  i.value = String(Math.max(0, Math.min(EV80_MAX, (parseInt(i.value, 10) || 0) + d)));
}
function ev80Read(id, lo, hi) {
  const i = document.getElementById('ev80-' + id);
  const v = i ? parseInt(String(i.value).replace(/\D/g, ''), 10) : NaN;
  return Number.isInteger(v) ? Math.max(lo, Math.min(hi, v)) : null;
}
function ev80Save(remove) {
  const deck = state.decks.find(d => d.id === state.activeDeckId), e = ev80Entry(deck, _ev80T);
  if (!e) { closeSheet(); return; }
  if (remove) delete e.ev;
  else {
    const v = { w: ev80Read('w', 0, EV80_MAX) || 0, l: ev80Read('l', 0, EV80_MAX) || 0, t: ev80Read('t', 0, EV80_MAX) || 0 };
    const p = ev80Read('p', 1, EV80_PMAX);
    if (p) v.p = p;
    const ni = document.getElementById('ev80-n'), nm = ev80Name(ni ? ni.value : '');
    if (nm) v.n = nm;
    if (v.w + v.l + v.t || v.p) e.ev = v; else delete e.ev;
  }
  closeSheet();
  try { saveState(); } catch (_) {}
  renderGrade();
}

/** 3.0.1: delete an event record from its row, after one check. */
function ev80Del(t) {
  const deck = state.decks.find(d => d.id === state.activeDeckId), e = ev80Entry(deck, t), v = ev80Get(e);
  if (!v) return;
  _ev80T = t;
  openSheet(`<div class="modal-title">Delete this event record?</div>
    <div class="modal-hint">${v.n ? `<span data-no-tr>${esc(v.n)}</span>: ` : ''}${ev80Text(v)}. The grade history stays.</div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet()">Cancel</button>
      <button class="btn btn-danger" onclick="ev80Save(true)">Delete</button></div>`);
}

// ── 6. New set week: one home line in the newest set's first 7 days ──
// The prerelease home card is off for now (PRE47_ON), so nothing on home said a new set was out.
// This line says so, that results since it came out count three times in grades (so grades can
// move that week), and how many saved decks have cards that are not legal or may rotate.
const NS80_DAYS = 7, NS80_KEY = 'pt_ns80_seen';
function ns80Set() {
  if (typeof PRE47 === 'undefined' || !PRE47 || !PRE47.release || typeof pre47DaysTo !== 'function') return null;
  const ago = -pre47DaysTo(PRE47.release);
  return ago >= 0 && ago < NS80_DAYS ? PRE47 : null;
}
function ns80Render() {
  let el = document.getElementById('ns80-card');
  const wn = document.getElementById('wn-card');
  if (!el && wn) { el = document.createElement('div'); el.id = 'ns80-card'; wn.parentNode.insertBefore(el, wn); }
  if (!el) return;
  const s = ns80Set();
  const decks = (state.decks || []).filter(d => !isDailyChallenge(d) && d.format !== 'expanded' && d.format !== 'prerelease' && (d.cards || []).some(c => c.supertype));
  if (!s || !decks.length || safeLocalGet(NS80_KEY) === s.code) { el.innerHTML = ''; return; }
  let n = 0;
  try { for (const d of decks) { const k = r29Counts(r29Rows(d)); if (k.out || k.risk) n++; } } catch (_) {}
  const rot = n ? ` ${n} of your decks ${n === 1 ? 'has' : 'have'} cards that are not legal or may rotate. The deck says which.` : '';
  el.innerHTML = `<div class="dc-banner" role="status">
    <div><b>${esc(s.set)} is out</b><span>In stores since ${esc(pre47Nice(s.release))}. Results since then count three times in grades, so yours may move this week.${rot}</span></div>
    <button class="btn btn-sm" onclick="ns80Close()">Close</button>
  </div>`;
}
function ns80Close() {
  const s = ns80Set();
  if (s) safeLocalSet(NS80_KEY, s.code);
  ns80Render();
}
(function () {
  const _home = renderHome;
  renderHome = function () {
    const r = _home.apply(this, arguments);
    try { ns80Render(); } catch (_) {}
    return r;
  };
})();
