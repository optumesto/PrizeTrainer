// ═══════════ 3.6.0: Quick add the top tournament list ═══════════
// Mason, 24 Nov 2026: "The guides should have a deck that is able to be quick added to the Your Decks
// section, the one that has the best tourney results, same with the top and up and coming decks".
// And: every Top decks entry opens the same screen (before, some opened a guide and some the builder).
//
// top-lists.json (built weekly by top-lists.mjs) holds one list per deck archetype: the best finish in
// the grade's tournament window, lists since the newest set first, online and local in-person weighed
// the same, every list 60 cards and Standard legal. Here:
//   td91Open(id): a sheet with the deck's best finish, its grade (worked out on this device, the same
//     way any list is graded), its cards, Add to your decks, and Read the guide when it has one.
//   td91Add(id): adds the list through the normal import, so it lands on its grade with an edit log,
//     named "<deck> (top list)". A list you already have opens your copy instead of a second one.
//   rdydeck.com/#add=<id> (the guide pages' button) does td91Add straight away.
// No ads in this sheet.
const TD91_URL = './top-lists.json';
let td91Data = null, _td91Load = null;
const _td91Grade = new Map();   // id -> { o, c, t } or 'x', for this visit

function td91Load() {
  if (td91Data) return Promise.resolve(td91Data);
  if (_td91Load) return _td91Load;
  _td91Load = fetch(TD91_URL, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => {
    if (j && j.decks && typeof j.decks === 'object') td91Data = j;
    return td91Data;
  }).catch(() => null).finally(() => { _td91Load = null; });
  return _td91Load;
}
const td91Deck = id => (td91Data && td91Data.decks && td91Data.decks[id]) || null;
/** The deck in Your decks with exactly this list, if any. */
function td91Have(t) {
  const want = deckListText(parseDeckList(t.list));
  return state.decks.find(d => deckListText(d.cards || []) === want) || null;
}
/** "(top list)" in the player's language, since the name is stored as written. */
function td91Name(t) {
  const l = (typeof rdI18n === 'object' && rdI18n && rdI18n.lang) || 'en';
  const suf = { es: 'lista top', pt: 'lista top', it: 'lista top', fr: 'liste top', de: 'Top-Liste' }[l] || 'top list';
  return `${t.name} (${suf})`;
}
const td91Ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th');
/** An event name as people say it: no emoji, and "A | B" as "A, B". */
function td91Ev(s) {
  return String(s || '').replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F100}-\u{1F1FF}\uFE0F\u200D\u20E3]/gu, ' ')
    .replace(/\s*\|\s*/g, ', ').replace(/\s+/g, ' ').replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, '').replace(/\s+,/g, ',').trim();
}
function td91Date(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  if (!m) return '';
  return `${+m[3]} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1]} ${m[1]}`;
}

/** The cards of a list, grouped as the list text has them. */
function td91Cards(list) {
  return String(list).split(/\n\s*\n/).map(block => {
    const lines = block.split('\n');
    const head = /^(Pokémon|Trainer|Energy): (\d+)$/.exec(lines[0] || '');
    if (!head) return '';
    const rows = lines.slice(1).map(l => {
      const m = /^(\d+) (.+?)(?: [A-Z0-9]{2,5} [A-Za-z0-9]{1,8})?$/.exec(l);
      return m ? `<li><b>${m[1]}</b> <span>${esc(m[2])}</span></li>` : '';
    }).join('');
    return `<div class="td91-grp"><div class="td91-gh"><span>${head[1]}</span> <b>${head[2]}</b></div><ul data-no-tr>${rows}</ul></div>`;
  }).join('');
}

function td91Scores(id) {
  const g = _td91Grade.get(id);
  if (!g) return `<div class="td91-sc td91-wait" aria-live="polite"><span>Grading the list…</span></div>`;
  if (g === 'x') return `<div class="td91-sc td91-wait"><span>The grade shows once card data loads. Add the list to see it.</span></div>`;
  const tile = (v, k, main) => `<div class="td91-t${main ? ' td91-main' : ''}"><b>${v == null ? 'N/A' : v.toFixed(1)}</b><span>${k}</span></div>`;
  return `<div class="td91-sc">${tile(g.o, 'Overall', true)}${tile(g.c, 'Card Strength')}${tile(g.t, 'Tournament Strength')}</div>`;
}
/** Grade the list on this device, without saving it. */
async function td91GradeOf(id) {
  if (_td91Grade.has(id)) return;
  const t = td91Deck(id);
  if (!t) return;
  if (typeof os325Offline === 'function' && os325Offline()) { _td91Grade.set(id, 'x'); return; }
  try {
    const fetched = await Promise.all(parseDeckList(t.list).map(c => fetchCardImage(c)));
    const cov = await enrichDeckCards(fetched);
    // A few cards not read yet still grade, as an import does; most of the list unread does not.
    if (!cov || (cov.total && cov.resolved / cov.total < 0.9)) { _td91Grade.set(id, 'x'); return; }
    const R = gradeDeck({ id: 'td91-' + id, name: t.name, cards: fetched, history: [], format: 'standard', coverage: cov, enrichVer: ENRICH_VER });
    const S = typeof g338Split === 'function' ? g338Split(R) : null;
    const r1 = v => (typeof gR1 === 'function' ? gR1(v) : Math.round(v * 10) / 10);
    _td91Grade.set(id, { o: r1(R.overall), c: S ? S.deck : null, t: S ? S.tour : null });
  } catch (e) { console.warn('[top list grade]', e); _td91Grade.set(id, 'x'); }
}

let _td91Open = null;
function td91Sheet(id) {
  const t = td91Deck(id), name = (t && t.name) || id;
  const guide = typeof TD90_GUIDES === 'object' && TD90_GUIDES[id];
  const guideBtn = guide ? `<a class="btn" href="deck-${guide}.html">Read the guide</a>` : '';
  if (!t) {
    return `<div class="modal-title"><span data-no-tr>${esc(name)}</span></div>
      <p class="td91-msg">${td91Data ? 'No top list for this deck yet. Check back after the next weekly update.' : 'Top lists did not load. Check your connection.'}</p>
      <div class="modal-actions">${guideBtn}<button class="btn" onclick="closeSheet()">Close</button></div>`;
  }
  const have = td91Have(t);
  const src = t.src === 'inperson' ? 'Local in-person event' : 'Online event';
  return `<div class="modal-title"><span data-no-tr>${esc(t.name)}</span></div>
    <div class="td91-k">Top Tournament List</div>
    <div class="td91-res"><span class="td91-best">${t.players > 1 ? `Best finish: ${td91Ord(t.place)} of ${Number(t.players).toLocaleString('en-US')} players` : `Best finish: ${td91Ord(t.place)}`}</span>${td91Ev(t.event) ? `<span class="td91-ev" data-no-tr>${esc(td91Ev(t.event))}</span>` : ''}<span class="td91-when"><span>${src}</span><span>${td91Date(t.date)}</span></span></div>
    ${td91Scores(id)}
    <details class="td91-list"><summary>See the 60 Cards</summary><div class="td91-grps">${td91Cards(t.list)}</div></details>
    <div class="modal-actions td91-acts">${guideBtn}<button class="btn btn-primary" onclick="td91Add('${esc(id)}')"><svg class="ic" aria-hidden="true"><use href="#i-${have ? 'next' : 'plus'}"/></svg>${have ? 'Open my copy' : 'Add to your decks'}</button></div>
    <p class="td91-note">The best finish in the grade's tournament window, with lists since the newest set first. Updated weekly.</p>`;
}
/** A Top decks row: its best tournament list, graded, with quick add and its guide. */
async function td91Open(id) {
  _td91Open = id;
  if (!td91Data) {
    openSheet(`<div class="modal-title"><span data-no-tr>${esc((typeof mu60Data !== 'undefined' && mu60Data && (mu60Data.decks.find(d => d.id === id) || {}).name) || id)}</span></div><p class="td91-msg">Loading the top list…</p>`);
    await td91Load();
    if (_td91Open !== id) return;
  }
  openSheet(td91Sheet(id));
  if (!_td91Grade.has(id) && td91Deck(id)) {
    await td91GradeOf(id);
    const m = document.getElementById('x-modal');
    const box = m && m.classList.contains('active') && _td91Open === id && document.querySelector('#x-modal-inner .td91-sc');
    if (box) box.outerHTML = td91Scores(id);
  }
}

let _td91Busy = false;
/** Adds the deck's top list to Your decks and opens its grade. */
async function td91Add(id) {
  if (_td91Busy) return;
  _td91Busy = true;
  try {
    await td91Load();
    const t = td91Deck(id);
    if (!t) { showToast(td91Data ? 'No top list for this deck yet. Check back after the next weekly update.' : 'Top lists did not load. Check your connection.'); return; }
    const have = td91Have(t);
    if (have) { closeSheet(); showScreen('home'); openReview(have.id); try { showReviewTab('grade'); } catch (_) {} showToast(`You already have this list as "${have.name}".`); return; }
    if (typeof os325Offline === 'function' && os325Offline()) { showToast("You're offline. The top list can be added once you're back online."); return; }
    closeSheet();
    showScreen('home');
    openImportModal();
    document.getElementById('import-name').value = td91Name(t);
    const ta = document.getElementById('import-list');
    ta.value = t.list;
    ta.dispatchEvent(new Event('input'));
    setImportFormat('standard');
    const before = new Set(state.decks.map(d => d.id));
    await importDeck();
    const d = state.decks.find(x => !before.has(x.id));
    if (d) {
      d.topList = id;
      d.topListAsOf = t.date;
      try { await saveState(); } catch (_) {}
      renderHome();
      if (!document.getElementById('screen-review').classList.contains('active')) ez265OpenGrade(d.id);
    }
  } finally { _td91Busy = false; }
}

// rdydeck.com/#add=<deck id>: the guide pages' Add button.
function td91Hash() {
  const m = /^#add=([a-z0-9-]{1,60})$/.exec(location.hash || '');
  if (!m) return;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
  td91Add(m[1]);
}
window.addEventListener('hashchange', td91Hash);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(td91Hash, 450));
else setTimeout(td91Hash, 450);

// Read the lists early, so the first tap on a Top decks row opens at once.
setTimeout(() => { try { const b = document.getElementById('td90'); if (b && !b.hidden) td91Load(); } catch (_) {} }, 2500);
