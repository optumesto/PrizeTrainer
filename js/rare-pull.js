// ═══════════ 3.5: Rare Pull, a daily card game ═══════════
// Seven prompts a day, the same for everyone on the same day (seeded by the date, like the daily
// challenge). Each prompt is a kind of card ("Name a Supporter") and a group of top lists (one meta
// deck's, or every deck's). The player picks a card name from a search list (no free text) within
// 30 seconds, or passes. A card that fits scores more the fewer of those top lists run it: the most
// common fit scores 10, the rarest 100, on a log scale between them. A pick that does not fit, a pass
// or running out of time scores 0.
//
// Data: meta-cards.json (what each meta deck's top lists run, the cards at least 1 in 20 of them run)
// for what counts and how rare it is, and cards.json (Standard legal cards, from pokemon-tcg-data) for
// what kind of card each one is. Nothing leaves the device: results stay in state.rarePull, and the
// game screen has no ads.
//
// The look is RdyDeck's own decklist sheet: the meter climbs the five rarity steps of a card set
// (Common, Uncommon, Rare, Ultra Rare, Secret Rare). Moves are slow fades, nothing flashes.

const RP_N = 7;                 // prompts a day
const RP_SECS = 30;             // seconds per prompt
const RP_FLOOR = 0.003;         // shares under this score as the rarest
const RP_EPOCH = [2026, 10, 20];   // Rare Pull #1 (months count from 0)
const RP_DECKS = 16;            // meta decks prompts are drawn from: the most played ones
const RP_TIERS = [
  // [lowest score, name, share symbol]
  [95, 'Secret Rare', '🌟'],
  [75, 'Ultra Rare', '✪'],
  [50, 'Rare', '★'],
  [25, 'Uncommon', '◆'],
  [1, 'Common', '●'],
  [0, 'No pull', '○'],
];
const RP_TYPES = { G: 'Grass', R: 'Fire', W: 'Water', L: 'Lightning', P: 'Psychic', F: 'Fighting', D: 'Darkness', M: 'Metal', N: 'Dragon', C: 'Colorless' };
// Each kind of card: the prompt, and the test on a cards.json entry.
const RP_CATS = {
  supporter: ['Name a Supporter', c => c.k === 'T' && c.tk === 'S'],
  item: ['Name an Item', c => c.k === 'T' && c.tk === 'I'],
  tool: ['Name a Pokémon Tool', c => c.k === 'T' && c.tk === 'O'],
  stadium: ['Name a Stadium', c => c.k === 'T' && c.tk === 'D'],
  ace: ['Name an ACE SPEC card', c => !!c.ace],
  trainer: ['Name a Trainer card', c => c.k === 'T'],
  basic: ['Name a Basic Pokémon', c => c.k === 'P' && c.st === 0],
  basicnx: ['Name a Basic Pokémon that is not a Pokémon ex', c => c.k === 'P' && c.st === 0 && !c.ex],
  stage1: ['Name a Stage 1 Pokémon', c => c.k === 'P' && c.st === 1],
  stage2: ['Name a Stage 2 Pokémon', c => c.k === 'P' && c.st === 2],
  ex: ['Name a Pokémon ex', c => c.k === 'P' && !!c.ex],
  pokemon: ['Name a Pokémon', c => c.k === 'P'],
  hp70: ['Name a Pokémon with 70 HP or less', c => c.k === 'P' && c.hp > 0 && c.hp <= 70],
  special: ['Name a Special Energy', c => c.k === 'E' && !c.be],
  any: ['Name any card', () => true],
};
for (const t in RP_TYPES) RP_CATS['t' + t] = ['Name a ' + RP_TYPES[t] + ' Pokémon', c => c.k === 'P' && c.ty === t];
// Kinds asked of every deck's top lists: the broad ones have so many rare fits that any guess scores high.
const RP_WIDE = ['tool', 'stadium', 'ace', 'special', 'stage2', 'stage1', 'hp70', ...Object.keys(RP_TYPES).map(t => 't' + t)];

const RP_BE = /^(?:basic\s+)?(grass|fire|water|lightning|psychic|fighting|darkness|metal)\s+energy$/i;
/** One key per card name: "Basic Fire Energy" and "Fire Energy" are the same card. */
const rpKey = n => { const m = String(n || '').match(RP_BE); return m ? m[1].toLowerCase() + ' energy' : String(n || '').toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim(); };
/** The name a player sees: "Fire Energy", not "Basic Fire Energy". */
const rpShow = n => { const m = String(n || '').match(RP_BE); return m ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() + ' Energy' : String(n || ''); };
/** For search: lower case, no accents. */
const rpFold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’`]/g, "'");

let rpData = null, rpLoad = null, rpG = null, rpTick = 0;

function rpStore() {
  const s = state.rarePull;
  if (!s || typeof s !== 'object' || !s.results || typeof s.results !== 'object') state.rarePull = { results: {} };
  return state.rarePull;
}
function rpNumber(key) {
  const p = String(key || dailyKey()).split('-').map(Number);
  const n = Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - Date.UTC(RP_EPOCH[0], RP_EPOCH[1], RP_EPOCH[2])) / 864e5) + 1;
  return isNaN(n) || n < 1 ? 1 : n;
}
function rpStreak() {
  const R = rpStore().results;
  let n = 0; const d = new Date();
  if (!R[dailyKey(d.getTime())]) d.setDate(d.getDate() - 1);
  while (R[dailyKey(d.getTime())]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function rpTier(score) { return RP_TIERS.find(t => score >= t[0]) || RP_TIERS[RP_TIERS.length - 1]; }
function rpTierIx(score) { return RP_TIERS.length - 1 - RP_TIERS.indexOf(rpTier(score)); }   // 0 no pull … 5 secret

// ── Data ──
function rpLoadData() {
  if (rpData) return Promise.resolve(rpData);
  if (rpLoad) return rpLoad;
  const get = f => fetch(f, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
  rpLoad = Promise.all([get('cards.json'), get('meta-cards.json')]).then(([c, mc]) => {
    rpLoad = null;
    if (!c || !Array.isArray(c.cards) || !mc || !Array.isArray(mc.decks)) throw new Error('no data');
    rpData = rpIndex(c.cards, mc);
    return rpData;
  });
  return rpLoad;
}
/** Every pickable card name, each card's kind, and the prompts the data can ask. */
function rpIndex(cards, mc) {
  const byPrint = new Map(), byName = new Map();
  cards.forEach(c => { byPrint.set(c.s + ' ' + c.no, c); const k = rpKey(c.n); if (!byName.has(k)) byName.set(k, c); });
  const names = new Map();   // key -> shown name
  cards.forEach(c => { const k = rpKey(c.n); if (!names.has(k)) names.set(k, rpShow(c.n)); });
  const card = r => byPrint.get(r[1] + ' ' + r[2]) || byName.get(rpKey(r[0]));
  const decks = mc.decks.filter(d => Array.isArray(d.cards) && d.cards.length && d.tops > 0);
  decks.forEach(d => d.cards.forEach(r => { const k = rpKey(r[0]); if (!names.has(k)) names.set(k, rpShow(r[0])); }));
  // Scopes: the most played decks one by one, and every deck's top lists together (weighted by top lists).
  const scopes = decks.slice().sort((a, b) => b.lists - a.lists || (a.id < b.id ? -1 : 1)).slice(0, RP_DECKS)
    .map(d => ({ id: d.id, name: d.name, fits: d.cards.map(r => ({ k: rpKey(r[0]), n: rpShow(r[0]), s: r[6], c: card(r) })) }));
  const tops = decks.reduce((a, d) => a + d.tops, 0) || 1, all = new Map();
  decks.forEach(d => d.cards.forEach(r => {
    const k = rpKey(r[0]), x = all.get(k) || { k, n: rpShow(r[0]), s: 0, c: card(r) };
    x.s += r[6] * d.tops / tops; all.set(k, x);
  }));
  const wide = { id: '*', name: '', fits: [...all.values()] };
  const pool = [];
  const ask = (sc, cat) => {
    const test = RP_CATS[cat][1];
    const fits = sc.fits.filter(f => f.c && f.s > 0 && test(f.c));
    if (fits.length < 5) return;
    const mx = Math.max(...fits.map(f => f.s)), mn = Math.max(RP_FLOOR, Math.min(...fits.map(f => f.s)));
    if (mx / mn < 3) return;
    pool.push({ scope: sc.id, deck: sc.name, cat, mx, mn, fits: fits.map(f => ({ k: f.k, n: f.n, s: f.s })).sort((a, b) => b.s - a.s || (a.k < b.k ? -1 : 1)) });
  };
  scopes.forEach(sc => Object.keys(RP_CATS).forEach(cat => { if (!/^t[A-Z]$/.test(cat)) ask(sc, cat); }));
  RP_WIDE.forEach(cat => ask(wide, cat));
  const list = [...names].map(([k, n]) => ({ k, n, f: rpFold(n) })).sort((a, b) => a.f < b.f ? -1 : 1);
  return { pool, list, names, asOf: mc.asOf || '' };
}
/** A fit's score: 10 for the most common fit, 100 for the rarest, log scale between. */
function rpScore(p, s) {
  if (!(s > 0)) return 0;
  const span = Math.log(p.mx / p.mn) || 1;
  const x = Math.min(1, Math.max(0, Math.log(p.mx / Math.max(s, p.mn)) / span));
  return Math.round(10 + 90 * x);
}
/** The day's 7 prompts: 5 from different meta decks, 2 from every deck's top lists, in a seeded order. */
function rpDay(key, plain) {
  const rnd = simRng(strHash('rdydeck-rarepull|' + key));
  // yesterday's prompts sit out today when there are others to ask
  let pool = rpData.pool;
  if (!plain) {
    const p = String(key).split('-').map(Number), y = new Date(p[0], p[1] - 1, p[2] - 1);
    const seen = new Set(rpDay(dailyKey(y.getTime()), true).map(q => q.scope + '|' + q.cat));
    const rest = pool.filter(q => !seen.has(q.scope + '|' + q.cat));
    if (rest.length >= RP_N * 3) pool = rest;
  }
  const decks = [...new Set(pool.filter(p => p.scope !== '*').map(p => p.scope))];
  shuffleWith(decks, rnd);
  const out = [], used = {};
  const take = cands => {
    if (!cands.length) return false;
    // a kind asked twice already is a last resort
    const fresh = cands.filter(p => (used[p.cat] || 0) < 1), ok = fresh.length ? fresh : cands.filter(p => (used[p.cat] || 0) < 2);
    const from = ok.length ? ok : cands;
    const p = from[Math.floor(rnd() * from.length)];
    used[p.cat] = (used[p.cat] || 0) + 1; out.push(p); return true;
  };
  for (const id of decks) { if (out.length >= RP_N - 2) break; take(pool.filter(p => p.scope === id)); }
  const wide = pool.filter(p => p.scope === '*');
  // at most one "Name a Fire Pokémon" kind of prompt a day
  const typed = () => out.some(p => /^t[A-Z]$/.test(p.cat));
  const open = () => wide.filter(p => !out.includes(p) && !(typed() && /^t[A-Z]$/.test(p.cat)));
  while (out.length < RP_N && open().length) take(open());
  while (out.length < RP_N && pool.some(p => !out.includes(p))) take(pool.filter(p => !out.includes(p)));
  shuffleWith(out, rnd);
  return out;
}

// ── Home card ──
function rpRenderCard() {
  const el = document.getElementById('rp-card');
  if (!el) return;
  const key = dailyKey(), r = rpStore().results[key], streak = rpStreak();
  el.innerHTML = `<div class="dc-card rp-home">
    <div class="dc-ic rp-ic">${rpGem(r ? rpTierIx(Math.max(...(r.p || [0]))) : 3)}</div>
    <div class="dc-tx"><div class="dc-t"><span data-no-tr>Rare Pull</span> #${rpNumber(key)}</div>
      <div class="dc-s">${r ? `<span>Today:</span> <b>${r.score}/700</b>` : '<span>Name cards from top lists. The rarer the pick, the higher it scores</span>'}${streak > 1 ? `<span class="rp-streak">${streak} day streak</span>` : ''}</div></div>
    ${r ? `<button class="btn btn-sm" onclick="rpShare()">${ic23('share')}Share</button>` : ''}
    <button class="btn btn-sm btn-primary" onclick="rpOpen()">${r ? 'Replay' : 'Play'}</button>
  </div>`;
}
/** A small card with a rarity mark: 0 no pull, 1 common … 5 secret rare. */
function rpGem(ix) {
  const mark = [
    '<circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    '<circle cx="12" cy="13" r="3.4" fill="currentColor"/>',
    '<path d="M12 8.6l4 4.4-4 4.4-4-4.4z" fill="currentColor"/>',
    '<path d="M12 8l1.5 3.2 3.4.4-2.5 2.3.7 3.4-3.1-1.8-3.1 1.8.7-3.4-2.5-2.3 3.4-.4z" fill="currentColor"/>',
    '<path d="M12 8l1.5 3.2 3.4.4-2.5 2.3.7 3.4-3.1-1.8-3.1 1.8.7-3.4-2.5-2.3 3.4-.4z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="13" r="1.3" fill="currentColor"/>',
    '<path d="M12 8l1.5 3.2 3.4.4-2.5 2.3.7 3.4-3.1-1.8-3.1 1.8.7-3.4-2.5-2.3 3.4-.4z" fill="currentColor"/>',
  ][ix] || '';
  return `<svg class="rp-gem rp-g${ix}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="2.5" width="14" height="19" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>${mark}</svg>`;
}

// ── Opening ──
async function rpOpen() {
  closeSheet();
  showLoading('Loading today\'s prompts…');
  try { await rpLoadData(); } catch (_) { hideLoading(); showToast('Rare Pull needs a connection the first time. Try again in a moment.'); return; }
  hideLoading();
  const key = dailyKey(), r = rpStore().results[key];
  const prompts = rpDay(key);
  if (prompts.length < RP_N) { showToast('Today\'s prompts could not be made. Try again later.'); return; }
  openSheet(`<div class="modal-title"><span data-no-tr>Rare Pull</span> #${rpNumber(key)}</div>
    <div class="rp-rules">
      <p>Seven prompts, the same for everyone today. Each asks for a kind of card from a group of top tournament lists.</p>
      <p>Pick a card that fits. The fewer of those top lists run it, the higher it scores, up to 100.</p>
      <p>You have 30 seconds for each prompt. Pass skips it.</p>
      <div class="rp-ladder" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<div class="rp-step rp-on rp-s${i}">${rpGem(i)}<span>${RP_TIERS[RP_TIERS.length - 1 - i][1]}</span></div>`).join('')}</div>
      <p class="rp-fine"><span>${r ? 'This replay is practice. Your score for today is already in.' : 'Your first try is your score.'}</span> <span>A card counts when at least 1 in 20 of those top lists run it.</span></p>
    </div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet()">Not now</button><button class="btn btn-primary" onclick="rpStart()">${ic23('play')}Start</button></div>`);
}
function rpScreen() {
  let s = document.getElementById('screen-rarepull');
  if (s) return s;
  s = document.createElement('div');
  s.id = 'screen-rarepull'; s.className = 'screen';
  s.innerHTML = `<div class="ws-header">
      <button class="icon-btn" onclick="rpQuit()" aria-label="Back to decks" title="Back"><svg class="ic"><use href="#i-back"/></svg></button>
      <div class="bar-titles"><div class="bar-eyebrow">Daily game</div><div class="ws-title" id="rp-title"></div></div>
      <div class="rp-total" id="rp-total" aria-live="polite"></div>
    </div>
    <div class="scrollable" id="rp-body"></div>`;
  (document.getElementById('rd-main') || document.body).appendChild(s);
  return s;
}
function rpScreenOn(on) {
  if (!on) { rpStop(); showScreen('home'); renderHome(); return; }
  const s = rpScreen();
  document.querySelectorAll('.screen').forEach(x => x.classList.remove('active'));
  s.classList.add('active');
  window.scrollTo(0, 0);
  // the Back button leaves the game (js/v38-settings-home.js goes home from any screen but home)
  try { if (!(history.state && history.state.rd38)) history.pushState({ rd38: 1 }, ''); } catch (_) {}
}
function rpStart() {
  closeSheet();
  const key = dailyKey();
  rpG = { key, n: rpNumber(key), prompts: rpDay(key), i: 0, picks: [], over: false, first: !rpStore().results[key] };
  rpScreenOn(true);
  document.getElementById('rp-title').innerHTML = `<span data-no-tr>Rare Pull</span> #${rpG.n}`;
  rpAsk();
}
function rpQuit() { rpG = null; rpScreenOn(false); }
function rpStop() { if (rpTick) { clearInterval(rpTick); rpTick = 0; } }

// ── A prompt ──
function rpTotal() { return rpG ? rpG.picks.reduce((a, p) => a + p.score, 0) : 0; }
function rpHead() {
  const t = document.getElementById('rp-total');
  if (t) t.innerHTML = `<b>${rpTotal()}</b>`;
  const pips = rpG.prompts.map((_, j) => {
    const p = rpG.picks[j];
    return `<span class="rp-pip${j === rpG.i && !p ? ' rp-now' : ''}${p ? ' rp-done' : ''}">${p ? rpGem(rpTierIx(p.score)) : ''}</span>`;
  }).join('');
  return `<div class="rp-pips" aria-hidden="true">${pips}</div>`;
}
function rpPromptHTML(p) {
  return `<div class="rp-q">
    <div class="rp-q-n">${rpG.i + 1}/${RP_N}</div>
    <div class="rp-q-t">${RP_CATS[p.cat][0]}</div>
    <div class="rp-q-from">${p.scope === '*' ? '<span>From top lists of any deck</span>' : `<span>From top lists of</span> <b class="rp-deck" data-no-tr>${esc(p.deck)}</b>`}</div>
    <div class="rp-q-fit"><span>${p.fits.length} cards fit</span></div>
  </div>`;
}
function rpAsk() {
  rpStop();
  const p = rpG.prompts[rpG.i];
  rpG.left = RP_SECS; rpG.q = ''; rpG.sel = -1;
  document.getElementById('rp-body').innerHTML = `<div class="rp-wrap">
    ${rpHead()}
    ${rpPromptHTML(p)}
    <div class="rp-meter" id="rp-meter">${rpMeter(-1)}</div>
    <div class="rp-pick">
      <div class="rp-clock" id="rp-clock" role="timer" aria-label="Seconds left"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.5" class="rp-clock-bg"/><circle cx="18" cy="18" r="15.5" class="rp-clock-fg" id="rp-clock-fg"/></svg><b id="rp-clock-n">${RP_SECS}</b></div>
      <input id="rp-in" class="input rp-in" type="search" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" placeholder="Search card names" aria-label="Search card names" oninput="rpFind(this.value)" onkeydown="rpKeys(event)">
      <button class="btn rp-pass" onclick="rpPick(null)">Pass</button>
    </div>
    <div class="rp-list" id="rp-list" role="listbox" aria-label="Card names"><div class="rp-hint">Type a few letters, then tap a card.</div></div>
  </div>`;
  rpClock();
  rpTick = setInterval(() => {
    if (!rpG || rpG.over || !document.getElementById('screen-rarepull').classList.contains('active')) { rpStop(); return; }
    rpG.left--;
    rpClock();
    if (rpG.left <= 0) rpPick(null, true);
  }, 1000);
  const inp = document.getElementById('rp-in');
  if (inp && window.matchMedia && matchMedia('(pointer:fine)').matches) inp.focus();
}
function rpClock() {
  const n = document.getElementById('rp-clock-n'), fg = document.getElementById('rp-clock-fg'), w = document.getElementById('rp-clock');
  if (!n || !fg) return;
  const left = Math.max(0, rpG.left);
  n.textContent = left;
  const len = 2 * Math.PI * 15.5;
  fg.style.strokeDasharray = len;
  fg.style.strokeDashoffset = String(len * (1 - left / RP_SECS));
  w.classList.toggle('rp-low', left <= 5);
}
function rpFind(q) {
  rpG.q = q; rpG.sel = -1;
  const el = document.getElementById('rp-list');
  const f = rpFold(q).trim();
  if (f.length < 2) { el.innerHTML = '<div class="rp-hint">Type a few letters, then tap a card.</div>'; rpG.hits = []; return; }
  const words = f.split(/\s+/);
  const hits = rpData.list.filter(x => words.every(w => x.f.includes(w)));
  hits.sort((a, b) => (a.f.startsWith(f) ? 0 : 1) - (b.f.startsWith(f) ? 0 : 1) || a.f.length - b.f.length || (a.f < b.f ? -1 : 1));
  rpG.hits = hits.slice(0, 8);
  el.innerHTML = rpG.hits.length
    ? rpG.hits.map((x, j) => `<button class="rp-opt" role="option" id="rp-o${j}" onclick="rpPick(${j})" data-no-tr>${esc(x.n)}</button>`).join('')
    : '<div class="rp-hint">No card by that name.</div>';
}
function rpKeys(e) {
  const hits = rpG && rpG.hits || [];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!hits.length) return;
    e.preventDefault();
    rpG.sel = (rpG.sel + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length;
    hits.forEach((_, j) => { const o = document.getElementById('rp-o' + j); if (o) o.classList.toggle('rp-sel', j === rpG.sel); });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (hits.length) rpPick(rpG.sel >= 0 ? rpG.sel : 0);
  }
}
/** j: index into the search hits, or null for Pass (timeout true when the clock ran out). */
function rpPick(j, timeout) {
  if (!rpG || rpG.over || rpG.picks[rpG.i]) return;
  rpStop();
  const p = rpG.prompts[rpG.i];
  const hit = j == null ? null : (rpG.hits || [])[j];
  let pick;
  if (!hit) pick = { k: '', n: '', score: 0, how: timeout ? 'time' : 'pass' };
  else {
    const f = p.fits.find(x => x.k === hit.k);
    pick = f ? { k: hit.k, n: hit.n, s: f.s, score: rpScore(p, f.s), how: 'fit' } : { k: hit.k, n: hit.n, score: 0, how: rpWhyNot(p, hit.k) };
  }
  rpG.picks[rpG.i] = pick;
  rpReveal(p, pick);
}
/** Why a pick scored nothing: it is not that kind of card, or those top lists do not run it. */
function rpWhyNot(p, k) {
  const test = RP_CATS[p.cat][1];
  const c = rpData.kind ? rpData.kind.get(k) : null;
  return c && test(c) ? 'rare' : 'kind';
}
function rpReveal(p, pick) {
  const rarest = p.fits[p.fits.length - 1], common = p.fits[0];
  const pct = s => (s >= 0.995 ? '100' : s < 0.01 ? '<1' : Math.round(s * 100)) + '%';
  const tier = rpTier(pick.score);
  const why = { pass: 'Passed.', time: 'Time ran out.', kind: 'Not that kind of card.', rare: 'Fits, but fewer than 1 in 20 of those top lists run it.' }[pick.how];
  const last = rpG.i >= RP_N - 1;
  document.getElementById('rp-body').innerHTML = `<div class="rp-wrap">
    ${rpHead()}
    ${rpPromptHTML(p)}
    <div class="rp-meter" id="rp-meter">${rpMeter(-1)}</div>
    <div class="rp-res rp-r${rpTierIx(pick.score)}">
      <div class="rp-res-top">
        <div class="rp-res-gem">${rpGem(rpTierIx(pick.score))}</div>
        <div class="rp-res-tx">
          ${pick.n ? `<div class="rp-res-n" data-no-tr>${esc(pick.n)}</div>` : ''}
          <div class="rp-res-tier">${tier[1]}</div>
          ${why ? `<div class="rp-res-why">${why}</div>` : ''}
        </div>
        <div class="rp-res-pts">+${pick.score}</div>
      </div>
      <dl class="rp-facts">
        ${pick.how === 'fit' ? `<div><dt>Top lists that run it</dt><dd>${pct(pick.s)}</dd></div>` : ''}
        <div><dt>Rarest fit</dt><dd><span data-no-tr>${esc(rarest.n)}</span> ${pct(rarest.s)}</dd></div>
        <div><dt>Most common fit</dt><dd><span data-no-tr>${esc(common.n)}</span> ${pct(common.s)}</dd></div>
      </dl>
    </div>
    <div class="rp-next"><button class="btn btn-primary" id="rp-go" onclick="${last ? 'rpEnd()' : 'rpNext()'}">${last ? 'See your score' : 'Next prompt'}${ic23('next')}</button></div>
  </div>`;
  const t = document.getElementById('rp-total'); if (t) t.innerHTML = `<b>${rpTotal()}</b>`;
  // the meter climbs to this pick's step after the screen draws, so the move is a slow slide
  requestAnimationFrame(() => requestAnimationFrame(() => { const m = document.getElementById('rp-meter'); if (m) m.innerHTML = rpMeter(pick.score); }));
  const go = document.getElementById('rp-go'); if (go) go.focus({ preventScroll: true });
}
/** The five rarity steps, lit up to the step a score reaches (-1: none yet). */
function rpMeter(score) {
  const top = score < 0 ? 0 : rpTierIx(score);
  const fill = score < 0 ? 0 : Math.max(0, Math.min(100, score));
  return `<div class="rp-bar" aria-hidden="true"><i style="width:${fill}%"></i></div>
    <div class="rp-steps">${[1, 2, 3, 4, 5].map(i => `<div class="rp-step rp-s${i}${i <= top ? ' rp-on' : ''}${i === top ? ' rp-here' : ''}">${rpGem(i)}<span>${RP_TIERS[RP_TIERS.length - 1 - i][1]}</span></div>`).join('')}</div>`;
}
function rpNext() { rpG.i++; rpAsk(); }

// ── The end ──
function rpEnd() {
  rpStop();
  rpG.over = true;
  const key = rpG.key, store = rpStore(), score = rpTotal(), p = rpG.picks.map(x => x.score);
  if (!store.results[key]) { store.results[key] = { score, p, ts: Date.now() }; saveState(); }
  const r = store.results[key], streak = rpStreak();
  const best = rpG.picks.reduce((b, x) => x.score > (b ? b.score : 0) ? x : b, null);
  document.getElementById('rp-body').innerHTML = `<div class="rp-wrap rp-end">
    <div class="rp-end-k">${rpG.first ? 'Your score' : 'Practice replay'}</div>
    <div class="rp-end-score">${score}<small>/700</small></div>
    <div class="rp-end-row">${p.map(s => `<span class="rp-end-g rp-r${rpTierIx(s)}" title="${rpTier(s)[1]}">${rpGem(rpTierIx(s))}</span>`).join('')}</div>
    ${!rpG.first ? `<p class="rp-end-note"><span>Today's score stays</span> <b>${r.score}/700</b></p>` : ''}
    ${best ? `<p class="rp-end-note"><span>Best pull:</span> <b data-no-tr>${esc(best.n)}</b> <b>+${best.score}</b></p>` : ''}
    ${streak > 1 ? `<p class="rp-end-note"><span class="rp-streak">${streak} day streak</span></p>` : ''}
    <p class="rp-end-note rp-fine">New prompts tomorrow.</p>
    <div class="rp-next">
      <button class="btn" onclick="rpQuit()">Back to decks</button>
      <button class="btn btn-primary" onclick="rpShare()">${ic23('share')}Share score</button>
    </div>
  </div>`;
  const t = document.getElementById('rp-total'); if (t) t.innerHTML = `<b>${score}</b>`;
  rpRenderCard();
}
function rpShareText(r, key) {
  const row = (r.p || []).map(s => rpTier(s)[2]).join(' ');
  return `RdyDeck Rare Pull #${rpNumber(key)}: ${r.score}/700\n${row}\nrdydeck.com`;
}
async function rpShare(k) {
  const key = dailyOkKey(k) || dailyKey(), r = rpStore().results[key];
  if (!r) { showToast('Play today\'s Rare Pull first.'); return; }
  const text = rpShareText(r, key);
  if (navigator.share) { try { await navigator.share({ text }); return; } catch (_) {} }
  try { await navigator.clipboard.writeText(text); showToast('Score copied. Paste it anywhere.'); }
  catch (_) { openSheet(`<div class="modal-title">Your score</div><textarea class="nt-area" readonly onclick="this.select()" data-no-tr>${esc(text)}</textarea><div class="modal-actions"><button class="btn btn-primary" onclick="closeSheet()">Done</button></div>`); }
}

// The kind of every pickable card, for the reason a pick did not fit. Built with the index.
(function () {
  const _ix = rpIndex;
  rpIndex = function (cards, mc) {
    const d = _ix(cards, mc);
    const kind = new Map();
    cards.forEach(c => { const k = rpKey(c.n); if (!kind.has(k)) kind.set(k, c); });
    d.kind = kind;
    return d;
  };
})();

// Home: draw the card with the daily puzzle's.
(function () {
  if (typeof renderPuzzleCard !== 'function') return;
  const _r = renderPuzzleCard;
  renderPuzzleCard = function () { const x = _r.apply(this, arguments); try { rpRenderCard(); } catch (_) {} return x; };
  // leaving the screen any other way (Back, a link) stops the clock
  const _s = showScreen;
  showScreen = function () { rpStop(); return _s.apply(this, arguments); };
  if (document.getElementById('rp-card')) { try { rpRenderCard(); } catch (_) {} }
})();

(function () {
  const css = `
  .rp-gem { width:24px; height:24px; display:block; }
  .rp-ic { color:var(--mark); }
  .rp-streak { display:inline; }
  .dc-s .rp-streak::before { content:'. '; }
  .rp-rules p { margin:0 0 0.6rem; color:var(--text-2); font-size:var(--fs-sm); line-height:1.5; }
  .rp-rules .rp-fine, .rp-fine { color:var(--text-3); font-size:var(--fs-xs, 0.8rem); }
  .rp-ladder { display:flex; gap:0.35rem; margin:0.4rem 0 0.8rem; }
  .rp-wrap { max-width:640px; margin:0 auto; padding:0.9rem var(--pad-x, 1rem) 2rem; display:flex; flex-direction:column; gap:0.9rem; }
  .rp-total { margin-left:auto; font-family:var(--mono); font-size:1.15rem; color:var(--text); min-width:3ch; text-align:right; }
  .rp-pips { display:flex; gap:0.35rem; justify-content:center; }
  .rp-pip { width:26px; height:34px; border:1px solid var(--line-2); border-radius:var(--r-sm); display:flex; align-items:center; justify-content:center; color:var(--text-3); transition:border-color .4s ease, background .4s ease; }
  .rp-pip.rp-now { border-color:var(--text); box-shadow:inset 0 -3px 0 var(--mark); }
  .rp-pip .rp-gem { width:18px; height:18px; }
  .rp-q { border-top:3px solid var(--rule); border-bottom:1px solid var(--line-2); padding:0.8rem 0 0.9rem; }
  .rp-q-n { font-family:var(--mono); font-size:var(--fs-sm); color:var(--text-3); letter-spacing:0.06em; }
  .rp-q-t { font-family:var(--display); font-weight:800; font-size:clamp(1.55rem, 5.4vw, 2.1rem); line-height:1.1; color:var(--text); margin:0.25rem 0 0.4rem; }
  .rp-q-from { font-size:var(--fs-md, 1rem); color:var(--text-2); }
  .rp-deck { color:var(--text); border-bottom:2px solid var(--mark); }
  .rp-q-fit { margin-top:0.3rem; font-family:var(--mono); font-size:var(--fs-sm); color:var(--text-3); }
  .rp-bar { height:4px; background:var(--line); border-radius:2px; overflow:hidden; }
  .rp-bar i { display:block; height:100%; background:var(--mark); transition:width .9s cubic-bezier(.2,.7,.2,1); }
  .rp-steps { display:grid; grid-template-columns:repeat(5, 1fr); gap:0.3rem; margin-top:0.45rem; }
  .rp-step { display:flex; flex-direction:column; align-items:center; gap:0.2rem; color:var(--text-3); opacity:0.45; transition:opacity .6s ease, color .6s ease; text-align:center; }
  .rp-step span { font-size:0.68rem; line-height:1.15; font-family:var(--display); font-weight:700; letter-spacing:0.02em; text-transform:uppercase; }
  .rp-step.rp-on { opacity:1; color:var(--text-2); }
  .rp-step.rp-here { color:var(--mark); }
  .rp-ladder .rp-step { flex:1; opacity:1; color:var(--text-2); }
  .rp-pick { display:flex; align-items:center; gap:0.55rem; }
  .rp-in { flex:1; min-width:0; font-size:16px; }
  .rp-pass { flex-shrink:0; }
  .rp-clock { position:relative; width:44px; height:44px; flex-shrink:0; }
  .rp-clock svg { width:100%; height:100%; transform:rotate(-90deg); }
  .rp-clock circle { fill:none; stroke-width:3; }
  .rp-clock-bg { stroke:var(--line-2); }
  .rp-clock-fg { stroke:var(--text); transition:stroke-dashoffset 1s linear, stroke .6s ease; }
  .rp-clock b { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-family:var(--mono); font-size:0.95rem; color:var(--text); }
  .rp-clock.rp-low .rp-clock-fg { stroke:var(--mark); }
  .rp-clock.rp-low b { color:var(--mark); }
  .rp-list { display:flex; flex-direction:column; border-top:1px solid var(--line); min-height:3rem; }
  .rp-opt { text-align:left; padding:0.7rem 0.4rem; background:none; border:0; border-bottom:1px solid var(--line); color:var(--text); font:inherit; font-size:var(--fs-md, 1rem); cursor:pointer; }
  .rp-opt:hover, .rp-opt.rp-sel, .rp-opt:focus-visible { background:var(--accent-soft); outline:none; }
  .rp-hint { padding:0.75rem 0.4rem; color:var(--text-3); font-size:var(--fs-sm); }
  .rp-res { border:1px solid var(--line-2); border-radius:var(--r-lg); padding:0.85rem 0.9rem; background:var(--surface); animation:rpIn .45s ease both; }
  @keyframes rpIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
  @media (prefers-reduced-motion:reduce) { .rp-res { animation:none; } .rp-bar i, .rp-step, .rp-clock-fg { transition:none; } }
  .rp-res-top { display:flex; align-items:center; gap:0.75rem; }
  .rp-res-gem .rp-gem { width:40px; height:40px; color:var(--text-2); }
  .rp-r3 .rp-res-gem .rp-gem, .rp-r4 .rp-res-gem .rp-gem, .rp-r5 .rp-res-gem .rp-gem { color:var(--mark); }
  .rp-res-tx { flex:1; min-width:0; }
  .rp-res-n { font-family:var(--display); font-weight:800; font-size:1.25rem; color:var(--text); line-height:1.15; }
  .rp-res-tier { font-family:var(--display); font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-2); font-size:var(--fs-sm); }
  .rp-r3 .rp-res-tier, .rp-r4 .rp-res-tier, .rp-r5 .rp-res-tier { color:var(--mark); }
  .rp-res-why { font-size:var(--fs-sm); color:var(--text-3); margin-top:0.1rem; }
  .rp-res-pts { font-family:var(--mono); font-size:1.5rem; color:var(--text); }
  .rp-facts { margin:0.75rem 0 0; padding:0.6rem 0 0; border-top:1px solid var(--line); display:flex; flex-direction:column; gap:0.35rem; }
  .rp-facts div { display:flex; justify-content:space-between; gap:1rem; font-size:var(--fs-sm); }
  .rp-facts dt { color:var(--text-3); }
  .rp-facts dd { margin:0; color:var(--text); text-align:right; font-family:var(--mono); }
  .rp-facts dd span { font-family:var(--font); }
  .rp-next { display:flex; gap:0.6rem; justify-content:flex-end; flex-wrap:wrap; }
  .rp-next .btn .ic { margin-left:0.3rem; margin-right:0; }
  .rp-end { text-align:center; align-items:center; padding-top:2rem; }
  .rp-end-k { font-family:var(--display); font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-3); }
  .rp-end-score { font-family:var(--mono); font-size:3.4rem; color:var(--text); line-height:1; }
  .rp-end-score small { font-size:1.2rem; color:var(--text-3); }
  .rp-end-row { display:flex; gap:0.4rem; justify-content:center; }
  .rp-end-g { color:var(--text-3); } .rp-end-g.rp-r1, .rp-end-g.rp-r2 { color:var(--text-2); } .rp-end-g.rp-r3, .rp-end-g.rp-r4, .rp-end-g.rp-r5 { color:var(--mark); }
  .rp-end-g .rp-gem { width:30px; height:30px; }
  .rp-end-note { margin:0; color:var(--text-2); font-size:var(--fs-sm); }
  .rp-end .rp-next { justify-content:center; margin-top:0.5rem; }
  `;
  const st = document.createElement('style'); st.id = 'rp-css'; st.textContent = css; document.head.appendChild(st);
})();
