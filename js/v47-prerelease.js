
// ═══════════ v47: Prerelease section and 40 card prerelease decks ═══════════
// A prerelease deck is exactly 40 cards, any number of copies of a card, and
// each player takes 4 prize cards (Play! Pokemon prerelease guidelines; the
// copy rule is how prereleases run). The section shows the newest set's
// event dates, what the kit holds, the rules, and every card in the set with
// its art, so players can learn it and build a practice 40.
//
// Where the cards come from: data.json's prerelease block, which the set watch
// (watch-sets.mjs, twice a day) fills on its own once a card database has the
// whole list, and the set list on TCGdex, read in the browser. Only a whole
// list is ever shown: every printed number and as many cards as the set has.
// Art always comes from the set code and number, never from a name.
const PRE47_BUILT = {
  set: 'Delta Reign', code: 'DLR', tcgdex: 'me06', official: 103, total: 141,
  start: '2026-10-24', end: '2026-11-01', release: '2026-11-06',
  kit: ['4 Delta Reign booster packs', 'A 40 card deck, ready to play', '1 of 4 foil promo cards'],
  cards: null,
};
let PRE47 = PRE47_BUILT;
// v51: the Prerelease section is hidden for now (Mason, 9 Nov 2026). Set this to
// true to bring back the home card, the sheet and the Prerelease format choice.
// The set watch keeps data.json's prerelease block current either way.
const PRE47_ON = false;
const PRE47_KEY = 'pt_pre47_v1';
const PRE47_TYPES = ['Grass', 'Fire', 'Water', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal'];

function pre47Day(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null; }
function pre47Str(s, max) { return typeof s === 'string' ? s.replace(/[<>`]/g, '').replace(/[\u2013\u2014]/g, '-').trim().slice(0, max) : ''; }

/** A checked prerelease block from data.json, or null. */
function pre47Valid(p) {
  if (!p || typeof p !== 'object') return null;
  const out = {
    set: pre47Str(p.set, 40),
    code: /^[A-Z0-9]{2,5}$/.test(String(p.code || '')) ? p.code : '',
    tcgdex: /^[a-z0-9.]{2,12}$/.test(String(p.tcgdex || '')) ? p.tcgdex : '',
    official: Number.isInteger(p.official) && p.official > 0 && p.official < 400 ? p.official : 0,
    total: Number.isInteger(p.total) && p.total > 0 && p.total < 400 ? p.total : 0,
    start: pre47Day(p.start), end: pre47Day(p.end), release: pre47Day(p.release),
    kit: Array.isArray(p.kit) ? p.kit.slice(0, 6).map(k => pre47Str(k, 60)).filter(Boolean) : [],
    cards: null,
  };
  if (!out.set || !out.code || !out.release) return null;
  if (Array.isArray(p.cards)) {
    const cards = p.cards.slice(0, 400).map(c => c && typeof c === 'object' &&
      /^[A-Za-z0-9]{1,6}$/.test(String(c.num || '')) && pre47Str(c.name, 60)
      ? { num: String(c.num).replace(/^0+(\d)/, '$1'), name: pre47Str(c.name, 60) } : null).filter(Boolean);
    if (cards.length) out.cards = cards;
  }
  return out;
}

(function () {
  const _v = d30Validate, _a = d30Apply;
  d30Validate = function (j) {
    const out = _v.apply(this, arguments);
    const p = pre47Valid(j && j.prerelease);
    if (out && p) out.prerelease = p;
    return out;
  };
  d30Apply = function (d) {
    const r = _a.apply(this, arguments);
    PRE47 = (d && d.prerelease) || PRE47_BUILT;
    pre47MapSet();
    try { pre47RenderHome(); } catch (_) {}
    return r;
  };
  // The saved copy was applied before this script ran: read its prerelease part now.
  try {
    const saved = JSON.parse(localStorage.getItem(DATA30_KEY) || 'null');
    const p = saved && saved.data && pre47Valid(saved.data.prerelease);
    if (p && saved.data.asOf >= DATA30_BUILT_DAY) PRE47 = p;
  } catch (_) {}
})();

// Deck lines with the new set's code read their card data from the right TCGdex set.
function pre47MapSet() { try { if (PRE47.code && PRE47.tcgdex && !TD30_SETS[PRE47.code]) TD30_SETS[PRE47.code] = PRE47.tcgdex; } catch (_) {} }
pre47MapSet();

// ── Dates ──
function pre47Today() {
  if (window.PRE47_NOW) return window.PRE47_NOW;
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function pre47Nice(day) {
  const [y, m, d] = day.split('-').map(Number);
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1] + ' ' + d;
}
function pre47DaysTo(day) {
  const a = Date.UTC(...pre47Today().split('-').map((v, i) => i === 1 ? v - 1 : +v));
  const b = Date.UTC(...day.split('-').map((v, i) => i === 1 ? v - 1 : +v));
  return Math.round((b - a) / 86400000);
}
/** soon, live, between (events over, set not out), out. */
function pre47Phase(p) {
  const t = pre47Today();
  if (p.start && t < p.start) return 'soon';
  if (p.start && p.end && t <= p.end) return 'live';
  if (t < p.release) return 'between';
  return 'out';
}
function pre47When(p) {
  const ev = p.start && p.end ? `Prerelease events ${pre47Nice(p.start)} to ${pre47Nice(p.end)}` : '';
  const out = `in stores ${pre47Nice(p.release)}`;
  return ev ? `${ev}, ${out}.` : pre47Today() >= p.release ? `In stores since ${pre47Nice(p.release)}.` : `In stores ${pre47Nice(p.release)}.`;
}

// Hides the Prerelease format choice while the section is off. A deck that is
// already a prerelease deck still shows it in its editor, so a save keeps its format.
function pre47FormatChoices(keepEdit) {
  const a = document.getElementById('fmt-prerelease'), b = document.getElementById('edit-fmt-prerelease');
  if (a) a.style.display = PRE47_ON ? '' : 'none';
  if (b) b.style.display = PRE47_ON || keepEdit ? '' : 'none';
}
document.addEventListener('DOMContentLoaded', () => { try { pre47FormatChoices(false); } catch (_) {} });

// ── Home card ──
function pre47RenderHome() {
  if (!PRE47_ON) { const old = document.getElementById('pre47-card'); if (old) old.innerHTML = ''; return; }
  let el = document.getElementById('pre47-card');
  if (!el) {
    const daily = document.getElementById('daily-card');
    if (!daily) return;
    el = document.createElement('div');
    el.id = 'pre47-card';
    daily.parentNode.insertBefore(el, daily.nextSibling);
  }
  const p = PRE47, ph = pre47Phase(p);
  // On home from four weeks before the events until three weeks after the set is out.
  const show = (p.start ? pre47DaysTo(p.start) <= 28 : pre47DaysTo(p.release) <= 35) && pre47DaysTo(p.release) >= -21;
  if (!show) { el.innerHTML = ''; return; }
  const n = p.start ? pre47DaysTo(p.start) : 0;
  const line = ph === 'soon' ? `Events start ${pre47Nice(p.start)}${n <= 7 ? (n === 1 ? ', tomorrow' : `, in ${n} days`) : ''}. Learn the set and practice a 40 card deck.`
    : ph === 'live' ? `Events run through ${pre47Nice(p.end)}. Learn the set and practice a 40 card deck.`
    : ph === 'between' ? `In stores ${pre47Nice(p.release)}. Practice a 40 card deck with the new cards.`
    : `Out now. Practice a 40 card deck with the new cards.`;
  el.innerHTML = `<div class="dc-card pre47-home">
    <div class="dc-ic">${ic23('cards')}</div>
    <div class="dc-tx"><div class="dc-t">${esc(p.set)} prerelease</div><div class="dc-s">${esc(line)}</div></div>
    <button class="btn btn-sm btn-primary" onclick="openPre47()">Open</button>
  </div>`;
}

// ── The set's cards ──
let _pre47Cards = null, _pre47Busy = false, _pre47Tried = '', _pre47Failed = false;
/** v50: a list counts only when it has every printed number and the set's total. */
function pre47Whole(cards, official, total) {
  if (!Array.isArray(cards) || !cards.length || !official) return false;
  const nums = new Set(cards.map(c => c.num));
  if (nums.size !== cards.length) return false;
  for (let i = 1; i <= official; i++) if (!nums.has(String(i))) return false;
  return cards.length >= (total || official);
}
function pre47Cache() { try { return JSON.parse(localStorage.getItem(PRE47_KEY) || 'null') || {}; } catch (_) { return {}; } }
function pre47SaveCache(c) { try { localStorage.setItem(PRE47_KEY, JSON.stringify(c)); } catch (_) {} }

async function pre47LoadCards() {
  const p = PRE47, store = pre47Cache();
  if (_pre47Cards && _pre47Cards.code === p.code) return;
  const hit = store.sets && store.sets[p.code];
  if (p.cards) { _pre47Cards = { code: p.code, cards: p.cards }; }
  else if (hit && hit.full && Array.isArray(hit.cards) && hit.cards.length) { _pre47Cards = hit; }
  // A list from data.json is whole already. A whole TCGdex list read in the last day is fresh enough.
  if (p.cards || !p.tcgdex || _pre47Busy || (typeof navigator !== 'undefined' && navigator.onLine === false)) { _pre47Tried = p.code; return; }
  if (hit && hit.full && Date.now() - (hit.at || 0) < 86400000) { _pre47Tried = p.code; return; }
  _pre47Busy = true; _pre47Failed = false;
  try {
    const init = {};
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) init.signal = AbortSignal.timeout(10000);
    const r = await fetch(TD30_API + '/sets/' + encodeURIComponent(p.tcgdex), init);
    const j = r.ok ? await r.json() : null;
    if (!j) _pre47Failed = true;
    const code = j && j.abbreviation && String(j.abbreviation.official || '').toUpperCase();
    // Only use the list when TCGdex says it is this set.
    if (j && Array.isArray(j.cards) && (!code || code === p.code)) {
      const cards = j.cards.map(c => c && /^[A-Za-z0-9]{1,6}$/.test(String(c.localId || '')) && typeof c.name === 'string'
        ? { num: String(c.localId).replace(/^0+(\d)/, '$1'), name: pre47Str(c.name, 60) } : null).filter(Boolean);
      const want = p.total || (j.cardCount && j.cardCount.total) || 0;
      const official = p.official || (j.cardCount && j.cardCount.official) || 0;
      // A partial list is never shown: the set waits until TCGdex has all of it.
      if (pre47Whole(cards, official, want)) {
        _pre47Cards = { code: p.code, cards, official, full: true, at: Date.now() };
        store.sets = store.sets || {};
        store.sets[p.code] = _pre47Cards;
        pre47SaveCache(store);
      }
    }
  } catch (_) { _pre47Failed = true; }
  _pre47Busy = false; _pre47Tried = p.code;
}

// ── The 40 card build ──
let _pre47Build = null;
function pre47BuildState() {
  if (_pre47Build && _pre47Build.code === PRE47.code) return _pre47Build;
  const s = pre47Cache();
  const b = s.build && s.build.code === PRE47.code ? s.build : null;
  _pre47Build = b || { code: PRE47.code, picks: {}, energy: {} };
  return _pre47Build;
}
function pre47SaveBuild() { const s = pre47Cache(); s.build = _pre47Build; pre47SaveCache(s); }
function pre47Count() {
  const b = pre47BuildState();
  return Object.values(b.picks).reduce((a, n) => a + n, 0) + Object.values(b.energy).reduce((a, n) => a + n, 0);
}
let _pre47Q = '', _pre47Secret = false;

function openPre47() {
  if (!PRE47_ON) return;
  const p = PRE47;
  openSheet(`<div class="pre47">
    <div class="modal-title">${esc(p.set)} prerelease</div>
    <p class="pre47-p">${esc(pre47When(p))}</p>
    ${p.kit.length ? `<div class="pre47-sec"><div class="pre47-h">What you get</div>
      <p class="pre47-p">Each player gets a Build and Battle Box:</p>
      <ul class="pre47-ul">${p.kit.map(k => `<li>${esc(k)}</li>`).join('')}</ul></div>` : ''}
    <div class="pre47-sec"><div class="pre47-h">Deck rules</div>
      <ul class="pre47-ul">
        <li>Exactly 40 cards.</li>
        <li>Any number of copies of a card.</li>
        <li>Each player takes 4 prize cards, not 6.</li>
        <li>The store has extra Basic Energy to add.</li>
      </ul></div>
    <div class="pre47-sec"><div class="pre47-h">Build a practice 40</div>
      <p class="pre47-p">Tap a card to add a copy. Save it, then practice it like any deck. Prize games use 4 prizes.</p>
      <div class="pre47-tools">
        <input type="search" id="pre47-q" class="pre47-q" placeholder="Find a card" aria-label="Find a card" value="${esc(_pre47Q)}" oninput="pre47Search(this.value)">
        <label class="pre47-sw"><input type="checkbox" id="pre47-secret" ${_pre47Secret ? 'checked' : ''} onchange="pre47ToggleSecret(this.checked)"> Secret rares</label>
      </div>
      <div id="pre47-grid" class="pre47-grid"><div class="pre47-p">Loading the set…</div></div>
      <div class="pre47-h pre47-h2">Basic Energy</div>
      <div id="pre47-energy" class="pre47-energy"></div>
    </div>
    <div class="pre47-bar">
      <div class="pre47-n" id="pre47-n"></div>
      <button class="btn btn-sm btn-ghost" onclick="pre47Clear()">Clear</button>
      <button class="btn btn-sm btn-primary" onclick="pre47SaveDeck()">${ic23('save')}Save deck</button>
    </div>
  </div>`, true);
  // Start the load first: a list from data.json is ready at once, and a TCGdex read shows as loading.
  const load = pre47LoadCards();
  pre47RenderEnergy();
  pre47RenderCount();
  pre47RenderGrid();
  load.then(pre47RenderGrid);
}

function pre47Search(q) { _pre47Q = String(q || '').slice(0, 40); pre47RenderGrid(); }
function pre47ToggleSecret(on) { _pre47Secret = !!on; pre47RenderGrid(); }

function pre47Visible() {
  if (!_pre47Cards) return [];
  const off = _pre47Cards.official || PRE47.official || 0;
  const q = rules34Key(_pre47Q);
  return _pre47Cards.cards.filter(c => {
    const n = parseInt(c.num, 10);
    if (!_pre47Secret && off && Number.isFinite(n) && n > off) return false;
    return !q || rules34Key(c.name).includes(q);
  });
}

function pre47RenderGrid() {
  const el = document.getElementById('pre47-grid');
  if (!el) return;
  if (!_pre47Cards) {
    el.innerHTML = `<div class="pre47-p">${_pre47Busy || _pre47Tried !== PRE47.code ? 'Loading the set…'
      : _pre47Failed || (typeof navigator !== 'undefined' && navigator.onLine === false) ? 'The card list could not load. Check your connection and open this again.'
      : 'The full card list for this set is not out yet. It shows here as soon as it is.'}</div>`;
    return;
  }
  const b = pre47BuildState(), list = pre47Visible();
  if (!list.length) { el.innerHTML = `<div class="pre47-p">No card matches that name.</div>`; return; }
  el.innerHTML = list.map(c => {
    const card = { set: PRE47.code, num: c.num, name: c.name };
    const urls = getImageCandidates(card);
    const n = b.picks[c.num] || 0;
    const nm = esc(c.name);
    return `<div class="pre47-tile${n ? ' on' : ''}" data-num="${esc(c.num)}">
      <button class="pre47-add" onclick="pre47Add('${esc(c.num)}')" aria-label="Add ${nm}, number ${esc(c.num)}">
        ${urls.length ? `<img loading="lazy" src="${esc(urls[0])}" alt="" data-fallbacks="${esc(JSON.stringify(urls.slice(1)))}" data-fallback-idx="0" onerror="reviewImgError(this)">` : '<div class="review-placeholder"></div>'}
        ${n ? `<span class="pre47-c">${n}</span>` : ''}
      </button>
      <div class="pre47-nm">${nm}</div>
      ${n ? `<button class="pre47-rm" onclick="pre47Remove('${esc(c.num)}')" aria-label="Remove a ${nm}">−</button>` : ''}
    </div>`;
  }).join('');
}

function pre47RenderEnergy() {
  const el = document.getElementById('pre47-energy');
  if (!el) return;
  const b = pre47BuildState();
  el.innerHTML = PRE47_TYPES.map(t => {
    const n = b.energy[t] || 0, url = getEnergyImageUrl(t + ' Energy') || '';
    return `<div class="pre47-en${n ? ' on' : ''}">
      <button class="pre47-add" onclick="pre47Energy('${t}',1)" aria-label="Add a ${t} Energy">${url ? `<img loading="lazy" src="${esc(url)}" alt="">` : ''}${n ? `<span class="pre47-c">${n}</span>` : ''}</button>
      <div class="pre47-nm">${t}</div>
      ${n ? `<button class="pre47-rm" onclick="pre47Energy('${t}',-1)" aria-label="Remove a ${t} Energy">−</button>` : ''}
    </div>`;
  }).join('');
}

function pre47RenderCount() {
  const el = document.getElementById('pre47-n');
  if (el) { const n = pre47Count(); el.textContent = `${n} of 40`; el.classList.toggle('ok', n === 40); el.classList.toggle('over', n > 40); }
}

function pre47Add(num) {
  const b = pre47BuildState();
  b.picks[num] = (b.picks[num] || 0) + 1;
  pre47SaveBuild(); pre47RenderGrid(); pre47RenderCount();
}
function pre47Remove(num) {
  const b = pre47BuildState();
  if (!b.picks[num]) return;
  if (--b.picks[num] <= 0) delete b.picks[num];
  pre47SaveBuild(); pre47RenderGrid(); pre47RenderCount();
}
function pre47Energy(t, d) {
  const b = pre47BuildState();
  b.energy[t] = Math.max(0, (b.energy[t] || 0) + d);
  if (!b.energy[t]) delete b.energy[t];
  pre47SaveBuild(); pre47RenderEnergy(); pre47RenderCount();
}
async function pre47Clear() {
  if (!pre47Count()) return;
  if (!(await rdConfirm({ title: 'Clear this prerelease deck?', yes: 'Clear', danger: true }))) return;
  _pre47Build = { code: PRE47.code, picks: {}, energy: {} };
  pre47SaveBuild(); pre47RenderGrid(); pre47RenderEnergy(); pre47RenderCount();
}

/** The build as deck list text: set cards with code and number, then Basic Energy. */
function pre47ListText() {
  const b = pre47BuildState();
  const byNum = new Map(((_pre47Cards && _pre47Cards.cards) || []).map(c => [c.num, c.name]));
  const lines = Object.keys(b.picks).filter(n => byNum.has(n))
    .sort((a, c) => (parseInt(a, 10) || 0) - (parseInt(c, 10) || 0))
    .map(n => `${b.picks[n]} ${byNum.get(n)} ${PRE47.code} ${n}`);
  PRE47_TYPES.forEach(t => { if (b.energy[t]) lines.push(`${b.energy[t]} Basic ${t} Energy`); });
  return lines.join('\n');
}

async function pre47SaveDeck() {
  const n = pre47Count();
  if (!n) { showToast('Add some cards first.'); return; }
  if (n !== 40 && !(await rdConfirm({ title: 'Save this prerelease deck anyway?', text: `It has ${n} cards. A prerelease deck is exactly 40.`, yes: 'Save anyway' }))) return;
  const cards = parseDeckList(pre47ListText());
  if (!cards.length) { showToast('The card list has not loaded yet. Try again in a moment.'); return; }
  const base = PRE47.set + ' prerelease';
  const used = new Set(state.decks.map(d => d.name));
  let name = base, i = 2;
  while (used.has(name)) name = base + ' ' + i++;
  closeSheet();
  showLoading('Preparing deck…');
  const fetched = await Promise.all(cards.map(c => fetchCardImage(c)));
  showLoading('Reading card data…');
  let cov = null;
  try { cov = await enrichDeckCards(fetched); } catch (_) {}
  hideLoading();
  const deck = { id: Date.now().toString(), name, cards: fetched, history: [], format: 'prerelease', coverage: cov, enrichVer: ENRICH_VER };
  state.decks.push(deck);
  await saveState();
  renderHome();
  showToast(`"${name}" saved. Prize games use 4 prizes.`);
}

// ── Prerelease decks across the app ──
function pre47Is(deck) { return !!deck && deck.format === 'prerelease'; }

// Rules: 40 cards and a Basic Pokemon. No copy limit, no ACE SPEC or Radiant limit.
(function () {
  const _r = rules34Breaches;
  rules34Breaches = function (deck) {
    if (!pre47Is(deck)) return _r.apply(this, arguments);
    const cards = (deck && deck.cards) || [];
    const out = [];
    const total = cards.reduce((a, c) => a + (c.count || 0), 0);
    if (total !== 40) out.push(`${total} cards in the list. A prerelease deck is exactly 40.`);
    const mons = cards.filter(c => cardCategory(c) === 'pokemon');
    const known = mons.length && mons.every(c => c.resolved && c.stage);
    if (known && !mons.some(c => c.stage === 'basic')) out.push('No Basic Pokémon, so the game cannot start.');
    if (!mons.length && total) out.push('No Pokémon at all, so the game cannot start.');
    return out;
  };
})();

// Grade tab: the 0 to 10 score is tuned for 60 card Standard decks, so a
// prerelease deck gets a build check from its card data instead.
function pre47Check(deck) {
  const cards = deck.cards || [];
  const sum = f => cards.filter(f).reduce((a, c) => a + (c.count || 0), 0);
  const total = sum(() => true);
  const mon = sum(c => cardCategory(c) === 'pokemon'), tr = sum(c => cardCategory(c) === 'trainer'), en = sum(c => cardCategory(c) === 'energy');
  const unread = cards.filter(c => cardCategory(c) !== 'energy' && !c.resolved);
  const basics = sum(c => cardCategory(c) === 'pokemon' && c.resolved && c.stage === 'basic');
  const names = new Set(cards.map(c => rules34Key(c.name)));
  const gaps = [], noFrom = [];
  cards.forEach(c => {
    if (cardCategory(c) !== 'pokemon' || !c.resolved) return;
    // An evolution whose card data does not say what it evolves from is named, never assumed fine.
    if (!c.evolvesFrom) { if (c.stage && c.stage !== 'basic') noFrom.push(c.name); return; }
    if (!names.has(rules34Key(c.evolvesFrom))) gaps.push(`${c.count} ${c.name}, but no ${c.evolvesFrom} to evolve from.`);
  });
  const rules = rules34Breaches(deck);
  return { total, mon, tr, en, basics, gaps, noFrom, rules, unread };
}

function pre47GradeHtml(deck) {
  const k = pre47Check(deck);
  const li = a => `<ul class="pre47-ul">${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return `<div class="g-sec">
      <div class="g-sec-t">Prerelease Check</div>
      <div class="g-sec-i">${k.rules.length ? 'This list breaks the prerelease rules:' : 'This list follows the prerelease rules: 40 cards, any number of copies.'}</div>
      ${k.rules.length ? li(k.rules) : ''}
    </div>
    <div class="g-sec">
      <div class="g-sec-t">What Is in It</div>
      ${li([`${k.mon} Pokémon, ${k.tr} Trainer, ${k.en} Energy.`, `${k.basics} Basic Pokémon.`])}
    </div>
    <div class="g-sec">
      <div class="g-sec-t">Evolutions</div>
      <div class="g-sec-i">${k.gaps.length ? 'These cannot be played without the Pokémon they evolve from:' : k.noFrom.length || k.unread.length ? 'No missing evolutions among the cards with full data.' : 'Every evolution has the Pokémon it evolves from.'}</div>
      ${k.gaps.length ? li(k.gaps) : ''}
      ${k.noFrom.length ? `<div class="g-sec-i">The card data does not say yet what ${k.noFrom.length === 1 ? 'this card evolves' : 'these cards evolve'} from: ${esc(k.noFrom.join(', '))}.</div>` : ''}
      ${k.unread.length ? `<div class="g-sec-i">${k.unread.length} card${k.unread.length === 1 ? ' has' : 's have'} no card data yet, so ${k.unread.length === 1 ? 'it is' : 'they are'} left out of this check: ${esc(k.unread.map(c => c.name).join(', '))}.</div>` : ''}
    </div>
    <div class="g-sec"><div class="g-sec-i">The 0 to 10 grade is built for 60 card Standard decks, so prerelease decks get this check instead.</div></div>`;
}

(function () {
  const _g = renderGrade;
  renderGrade = function () {
    const deck = findDeck(state.activeDeckId);
    if (!pre47Is(deck)) return _g.apply(this, arguments);
    const el = document.getElementById('grade-body');
    if (el) el.innerHTML = pre47GradeHtml(deck);
  };
  const _g29 = g29Grade;
  g29Grade = function (deck) { return pre47Is(deck) ? null : _g29.apply(this, arguments); };
  // Odds and Hand deal 7, take 6 prizes and count 60 cards, so they stay off for 40 card decks.
  const note = id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<div class="g-empty">${id === 'odds-body' ? 'Odds' : 'Hand practice'} is built for 60 card decks with 6 prizes, so it is off for prerelease decks.<br><br>Prize games work with 4 prizes. Tap Play to start one.</div>`;
  };
  const _o = renderOdds;
  renderOdds = function () { return pre47Is(findDeck(state.activeDeckId)) ? note('odds-body') : _o.apply(this, arguments); };
  const _h = renderHand;
  renderHand = function () { return pre47Is(findDeck(state.activeDeckId)) ? note('hand-body') : _h.apply(this, arguments); };
  const _sh = v45ShareGrade;
  v45ShareGrade = function () {
    if (pre47Is(findDeck(state.activeDeckId))) { showToast('Prerelease decks have a build check, not a grade to share.'); return; }
    return _sh.apply(this, arguments);
  };
  const _rl = r29HomeLine;
  r29HomeLine = function (deck) { return pre47Is(deck) ? '' : _rl.apply(this, arguments); };
  // Home: the grade spot says what kind of deck it is.
  const _b = buildDeckCard;
  buildDeckCard = function (deck) {
    let h = _b.apply(this, arguments);
    if (pre47Is(deck)) h = h.replace('<div class="deck-grade none"><span>Not graded yet</span></div>', '<div class="deck-grade none"><span>Prerelease deck</span></div>');
    return h;
  };
})();

// Prize games: 4 prizes for a prerelease deck unless the player picks a count.
(function () {
  const _s = startGame;
  let fromMode = false;
  startGame = function (deckId) {
    const deck = findDeck(deckId);
    if (pre47Is(deck) && !fromMode && game.prizeCount === 6) game.prizeCount = 4;
    return _s.apply(this, arguments);
  };
  const _m = startGameFromMode;
  startGameFromMode = function () { fromMode = true; try { return _m.apply(this, arguments); } finally { fromMode = false; } };
  const _open = openModeModal;
  let autoSet = false;
  openModeModal = function (deckId) {
    const deck = findDeck(deckId);
    if (pre47Is(deck) && modeSettings.prizes === 6) { modeSettings.prizes = 4; autoSet = true; }
    else if (!pre47Is(deck) && autoSet && modeSettings.prizes === 4) { modeSettings.prizes = 6; autoSet = false; }
    return _open.apply(this, arguments);
  };
})();

document.addEventListener('DOMContentLoaded', () => { try { pre47RenderHome(); } catch (e) { console.warn('[prerelease]', e); } });
(function () {
  const _rh = renderHome;
  renderHome = function () { const r = _rh.apply(this, arguments); try { pre47RenderHome(); } catch (_) {} return r; };
})();
