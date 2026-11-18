// ── v81 (3.4): Share an event result with RdyDeck (player-reported results) ──
// Adds "Share this result" to a grade history entry that has an event record (v80 section 4), when the
// list is still the one that was played. What is sent: event type, date, player count, placing, the
// archetype, the 60 cards (names and counts) and each round's opponent archetype and result. No name,
// no event name, no account, nothing else about the player. worker/player-results.js checks and stores it,
// and merge-player-results.mjs adds the totals to matchups.json at half weight, labeled player-reported.
//
// Off until the server says on (/api/results/status), so this file does nothing live until it is set up.
// ?pr81=1 shows the button anyway, for testing the form. Only for people who said they are 13 or older
// (the neutral age question from v32): no answer, Skip and under 13 all mean the button never shows.

const PR81_TYPES = [
  ['league-challenge', 'League Challenge'], ['league-cup', 'League Cup'], ['regional', 'Regional Championship'],
  ['international', 'International Championship'], ['worlds', 'World Championship'], ['special', 'Special Event'],
  ['other-local', 'Other local event'],
];
const PR81_MAXAGE = 45, PR81_RMIN = 3, PR81_RMAX = 18;
let pr81On = null, pr81Key = '', _pr81T = 0;

/** Whether the server takes results. Asked once per visit; any failure counts as off. */
function pr81Check() {
  if (pr81On !== null) return Promise.resolve(pr81On);
  if (/[?&]pr81=1\b/.test(location.search)) { pr81On = true; return Promise.resolve(true); }
  if (location.protocol !== 'https:' || (typeof navigator !== 'undefined' && navigator.onLine === false)) { pr81On = false; return Promise.resolve(false); }
  pr81On = false;
  return fetch('/api/results/status', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(j => {
    pr81On = !!(j && j.on === true);
    pr81Key = j && typeof j.turnstile === 'string' && /^[\w-]{10,100}$/.test(j.turnstile) ? j.turnstile : '';
    return pr81On;
  }).catch(() => false);
}
/** 13 or older, from the age question. Anything else (no answer, Skip, under 13) is no. */
const pr81Age = () => { const b = typeof age32Get === 'function' ? age32Get() : ''; return b === 'teen' || b === 'adult'; };
const pr81Asked = () => typeof age32Get === 'function' && !!age32Get();

/** The deck as names and counts, when it is a 60 card list. */
function pr81List(deck) {
  const m = new Map();
  for (const c of (deck && deck.cards) || []) {
    if (!c || !(c.count > 0)) continue;
    const n = String(c.apiName || c.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (n) m.set(n, (m.get(n) || 0) + c.count);
  }
  const out = [...m.entries()];
  return out.length <= 45 && out.reduce((a, x) => a + x[1], 0) === 60 ? out : null;
}
/** True when this entry's list is the deck's list now, so the cards sent are the ones played. */
function pr81Same(deck, e) {
  try { return !!(e && e.k && e.k === gh72Hash(gh72Lines(deck))); } catch (_) { return false; }
}

// The button, next to the event record's Edit and Delete.
(function () {
  if (typeof ev80Bits !== 'function') return;
  const was = ev80Bits;
  ev80Bits = function (e, mine) {
    let h = was.apply(this, arguments);
    try {
      const deck = state.decks.find(d => d.id === state.activeDeckId);
      if (h && pr81On && ev80Get(e) && pr81Same(deck, e) && pr81List(deck) && (pr81Age() || !pr81Asked())) {
        const b = e.pr ? `<span class="pr81-done">Shared with RdyDeck</span>`
          : `<button type="button" class="ev80-btn pr81-btn" onclick="pr81Open(${e.t})">Share this result</button>`;
        h = h.replace(/<\/div>$/, b + '</div>');
      }
    } catch (_) {}
    return h;
  };
  // Ask the server once, then draw the Grade tab again if it says on.
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => pr81Check().then(on => {
    if (on && document.getElementById('gh72-sec') && typeof renderGrade === 'function') { try { renderGrade(); } catch (_) {} }
  }), 2600));
})();

/** The neutral age question, the same one the app asks for ads, when it has never been answered. */
function pr81AskAge(t) {
  openSheet(`<div class="modal-title">How old are you?</div>
    <div class="age32"><input id="pr81-age" class="age32-in" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" aria-label="Your age in years"><span class="age32-unit">years</span></div>
    <div class="modal-hint age32-hint">Your answer stays on this device.</div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="pr81AgeSave('',${t})">Skip</button><button class="btn btn-primary" id="pr81-age-go" disabled onclick="pr81AgeSave(document.getElementById('pr81-age').value,${t})">Continue</button></div>`);
  const i = document.getElementById('pr81-age'), go = document.getElementById('pr81-age-go');
  i.addEventListener('input', () => { i.value = i.value.replace(/\D/g, '').slice(0, 3); go.disabled = !(+i.value >= 1 && +i.value <= 130); });
  i.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !go.disabled) go.click(); });
}
function pr81AgeSave(v, t) {
  safeLocalSet(AGE32_KEY, age32Band(parseInt(v, 10)));
  closeSheet();
  try { if (typeof ads32Sync === 'function') ads32Sync(); } catch (_) {}
  if (pr81Age()) pr81Open(t);
  else { showToast('Sharing results is for players 13 and older.'); try { renderGrade(); } catch (_) {} }
}

const pr81Day = d => d.toISOString().slice(0, 10);
const pr81Opt = (v, label, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(label)}</option>`;
function pr81Opps(sel) {
  const decks = (mu60Data && mu60Data.decks) || [];
  return pr81Opt('unknown', 'Not sure', sel === 'unknown') + decks.map(d => pr81Opt(d.id, d.name, sel === d.id)).join('') + pr81Opt('other', 'Other deck', sel === 'other');
}
function pr81Round(i, opp, res) {
  return `<div class="pr81-r"><span class="pr81-rn">Round ${i + 1}</span>
    <select class="pr81-opp" aria-label="Opponent's deck">${pr81Opps(opp)}</select>
    <select class="pr81-res" aria-label="Result">${pr81Opt('w', 'Win', res === 'w')}${pr81Opt('l', 'Loss', res === 'l')}${pr81Opt('t', 'Tie', res === 't')}</select></div>`;
}

function pr81Open(t) {
  const deck = state.decks.find(d => d.id === state.activeDeckId), e = ev80Entry(deck, t), v = ev80Get(e);
  if (!deck || !e || !v || !mu60Data) return;
  if (!pr81Age()) { if (!pr81Asked()) pr81AskAge(t); return; }
  if (!pr81Same(deck, e) || !pr81List(deck)) { showToast('Share needs the full 60 card list you played.'); return; }
  _pr81T = t;
  let arch = '';
  try { const a = g68Arch(deck, mu60Data, null); arch = a && a.deck ? a.deck.id : ''; } catch (_) {}
  // The rounds start from the record (wins, then losses, then ties); the order does not matter.
  const n = Math.max(PR81_RMIN, Math.min(PR81_RMAX, v.w + v.l + v.t));
  const res = [...Array(v.w).fill('w'), ...Array(v.l).fill('l'), ...Array(v.t).fill('t')];
  const now = new Date(), min = new Date(now.getTime() - PR81_MAXAGE * 864e5);
  openSheet(`<div class="modal-title">Share this result</div>
    <div class="modal-hint">Adds your result to RdyDeck's player-reported results, which help grades match in-person events. Player-reported results count half as much as Limitless results.</div>
    <div class="pr81-form">
      <label class="ev80-l" for="pr81-type">Event</label>
      <select id="pr81-type">${PR81_TYPES.map(([k, l]) => pr81Opt(k, l, k === 'league-cup')).join('')}</select>
      <label class="ev80-l" for="pr81-date">Event date</label>
      <input type="date" id="pr81-date" min="${pr81Day(min)}" max="${pr81Day(now)}" value="${pr81Day(now)}">
      <label class="ev80-l" for="pr81-players">Players at the event</label>
      <input type="number" id="pr81-players" inputmode="numeric" min="4" max="5000" step="1" value="">
      <label class="ev80-l" for="pr81-place">Your placing</label>
      <input type="number" id="pr81-place" inputmode="numeric" min="1" max="5000" step="1" value="${v.p || ''}" placeholder="Optional">
      <label class="ev80-l" for="pr81-arch">Deck</label>
      <select id="pr81-arch">${pr81Opt('', 'Pick the deck', !arch)}${mu60Data.decks.map(d => pr81Opt(d.id, d.name, d.id === arch)).join('')}</select>
      <div class="ev80-l">Rounds</div>
      <div id="pr81-rounds">${Array.from({ length: n }, (_, i) => pr81Round(i, 'unknown', res[i] || 'w')).join('')}</div>
      <div class="pr81-rb"><button type="button" class="btn btn-sm" onclick="pr81More(1)">Add a round</button><button type="button" class="btn btn-sm" onclick="pr81More(-1)">Take one off</button></div>
      <label class="pr81-ck"><input type="checkbox" id="pr81-ok1"> <span>I played this in the Masters division, with this exact list.</span></label>
      <label class="pr81-ck"><input type="checkbox" id="pr81-ok2"> <span>This is my own result, and it is correct.</span></label>
      ${pr81Key ? '<div id="pr81-ts"></div>' : ''}
    </div>
    <div class="modal-hint pr81-what">What is sent: the event type, date and size, your placing, the deck, its 60 cards and each round's result. No name, no event name and nothing else about you. Only Masters results are taken.</div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet()">Cancel</button><button class="btn btn-primary" id="pr81-go" onclick="pr81Send()">Send</button></div>`, true);
  if (pr81Key) pr81Turnstile();
}
function pr81More(d) {
  const box = document.getElementById('pr81-rounds');
  if (!box) return;
  const n = box.children.length;
  if (d > 0 && n < PR81_RMAX) box.insertAdjacentHTML('beforeend', pr81Round(n, 'unknown', 'w'));
  if (d < 0 && n > PR81_RMIN) box.lastElementChild.remove();
}

// Turnstile, only when the server names a site key.
let pr81Tok = '';
function pr81Turnstile() {
  pr81Tok = '';
  const draw = () => { try { window.turnstile.render('#pr81-ts', { sitekey: pr81Key, callback: t => { pr81Tok = t; } }); } catch (_) {} };
  if (window.turnstile) return draw();
  const s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  s.async = true; s.onload = draw;
  document.head.appendChild(s);
}

const PR81_WHY = {
  date: 'Pick the event date. Results older than 45 days are not taken.',
  players: 'Enter how many players were at the event (4 to 5000).',
  place: 'Your placing must be a number no larger than the number of players.',
  arch: 'Pick the deck you played.',
  list: 'Share needs the full 60 card list you played.',
  'list-arch': "This list doesn't play that deck's main Pokemon. Pick the deck it is.",
  rounds: "Check the rounds: at least 3, and no more than an event that size plays.",
  'place-record': "That placing doesn't fit that record. Check both.",
  division: 'Only Masters division results are taken.',
  already: 'A result for that event was already sent from here.',
  'day-max': 'That is the most results for one day. Try again tomorrow.',
  'slow-down': 'That is the most results for one day. Try again tomorrow.',
  full: "RdyDeck can't take results right now. Try again later.",
  busy: "RdyDeck can't take results right now. Try again later.",
  human: "The check didn't pass. Try again.",
};
const PR81_FAIL = "Couldn't send. Check your connection and try again.";

/** Reads the form, checks what it can here, and sends. */
function pr81Send() {
  const deck = state.decks.find(d => d.id === state.activeDeckId), e = ev80Entry(deck, _pr81T);
  const $ = id => document.getElementById(id);
  if (!deck || !e) { closeSheet(); return; }
  const num = id => { const x = parseInt(String(($(id) || {}).value || '').replace(/\D/g, ''), 10); return Number.isInteger(x) ? x : null; };
  const b = {
    v: PT_VERSION, type: ($('pr81-type') || {}).value, division: 'masters', date: ($('pr81-date') || {}).value,
    players: num('pr81-players'), place: num('pr81-place'), arch: ($('pr81-arch') || {}).value, list: pr81List(deck),
    rounds: [...document.querySelectorAll('#pr81-rounds .pr81-r')].map(r => [r.querySelector('.pr81-opp').value, r.querySelector('.pr81-res').value]),
  };
  const why = !b.arch ? 'arch' : !(b.players >= 4 && b.players <= 5000) ? 'players' : b.place != null && !(b.place >= 1 && b.place <= b.players) ? 'place'
    : !/^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? 'date' : !b.list ? 'list' : '';
  if (why) { showToast(PR81_WHY[why]); return; }
  if (!($('pr81-ok1') || {}).checked || !($('pr81-ok2') || {}).checked) { showToast('Tick both boxes to send.'); return; }
  if (pr81Key && !pr81Tok) { showToast('Finish the check first.'); return; }
  if (pr81Key) b.ts = pr81Tok;
  const go = $('pr81-go');
  if (go) go.disabled = true;
  fetch('/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
    .then(r => r.json().catch(() => ({})).then(j => ({ ok: r.ok && j && j.ok, why: j && j.why })))
    .catch(() => ({ ok: false }))
    .then(r => {
      if (r.ok || r.why === 'already') {
        e.pr = 1;
        try { saveState(); } catch (_) {}
        closeSheet();
        showToast(r.ok ? 'Result sent. Thank you.' : PR81_WHY.already);
        try { renderGrade(); } catch (_) {}
        return;
      }
      if (go) go.disabled = false;
      if (pr81Key && window.turnstile) { try { window.turnstile.reset('#pr81-ts'); pr81Tok = ''; } catch (_) {} }
      showToast(PR81_WHY[r.why] || PR81_FAIL);
    });
}
