
// ═══════════ v31: TCGdex first, pokemontcg.io as the backup ═══════════
// pokemontcg.io says its API is deprecated and will be shut down, and its
// paid successor has no free plan. TCGdex is free and open (MIT license), so
// it is now read first. Any card TCGdex cannot read is then read from
// pokemontcg.io while it still answers. Card data is still saved with the
// deck, so offline works as before.
const TD31_MAX = 60;
// Where each card came from in the last read, so the grade can name the backup.
let _td31Src = { td: [], pt: [] };
// When TCGdex cannot be reached at all, skip it for ten minutes so reads stay quick.
let _td31DownUntil = 0;

TCGEnrich.fetchDeckCards = async function (entries, opts) {
  const list = (entries || []).filter(e => e && e.name);
  const seen = new Set();
  const uniq = list.filter(e => {
    const k = String(e.name).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const map = new Map();
  const tdRead = [], ptRead = [];
  _td30Failed = false;
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

  // 1. TCGdex, a few requests at a time.
  if (!offline && Date.now() >= _td31DownUntil) {
    const todo = uniq.slice(0, TD31_MAX);
    for (let i = 0; i < todo.length; i += TD30_PAR) {
      if (i && _td30Failed && !tdRead.length) { _td31DownUntil = Date.now() + 600000; break; }
      await Promise.all(todo.slice(i, i + TD30_PAR).map(async e => {
        let r = null;
        try { r = await td30Read(e); } catch (_) {}
        if (!r) return;
        const en = TCGEnrich.enrichCard(r.card);
        if (!r.exact) { en.matchedBy = 'name'; if (r.printing) en.printing = r.printing; }
        if (r.pocket) en.pocket = true;
        const k = String(e.name).toLowerCase();
        map.set(k, en);
        tdRead.push(k);
      }));
    }
  }
  const tdFailed = offline || _td30Failed || Date.now() < _td31DownUntil;

  // 2. pokemontcg.io for whatever TCGdex did not read.
  let ptFailed = offline;
  // 3.3.2 (Muse 3.3.1 retest): a card TCGdex read only from another printing is asked for here too, and its own
  // printing replaces that read when pokemontcg.io has it. A saved deck kept Gastly's text from another printing
  // (and so no confirmed mark) while a fresh import of the same list read its own.
  const other = k => { const v = map.get(k); return !!(v && v.matchedBy === 'name'); };
  const rest = list.filter(e => { const k = String(e.name).toLowerCase(); return !map.has(k) || other(k); });
  if (rest.length && !offline) {
    let pm = null;
    try { pm = await _v29FetchDeck.call(TCGEnrich, rest, opts); } catch (_) { pm = null; }
    ptFailed = !pm || !!pm.partial;
    rest.forEach(e => {
      const k = String(e.name).toLowerCase();
      const got = pm && pm.get(k);
      if (map.has(k)) {
        if (other(k) && got && got.resolved && got.matchedBy !== 'name') {
          map.set(k, got); ptRead.push(k);
          const i = tdRead.indexOf(k); if (i >= 0) tdRead.splice(i, 1);
        }
        return;
      }
      if (got && got.resolved) { map.set(k, got); ptRead.push(k); }
    });
  }

  // Anything still missing gets the usual stub, so coverage stays honest.
  list.forEach(e => {
    const k = String(e.name).toLowerCase();
    if (!map.has(k)) map.set(k, TCGEnrich.enrichCard(null, { fallbackName: e.name }));
  });
  // Old data is kept when a source failed and a card is still unread.
  map.partial = (tdFailed || ptFailed) && [...map.values()].some(x => !x.resolved);
  // 3.3.3: pokemontcg.io could not be asked for a card read only from another printing, so its own printing is still unread.
  map.otherLeft = !!(ptFailed && rest.some(e => other(String(e.name).toLowerCase())));
  map.tcgdex = tdRead;
  map.ptcg = ptRead;
  _td31Src = { td: tdRead, pt: ptRead };
  if (!offline) { try { await td66Bases(map, list); } catch (_) {} }
  return map;
};

/**
 * v66: Rare Candy skips the Stage 1, never the Basic. When a Stage 2's Stage 1 is not in the list,
 * the grade still needs to know which Basic the line starts from, so read the Stage 1 card once
 * (TCGdex first, then pokemontcg.io) and store its "evolves from" on the Stage 2 as base.
 */
async function td66Bases(map, list) {
  const inList = n => list.some(e => TCGEnrich.sameCard(e.name, n));
  const want = new Map();
  map.forEach(v => { if (v && v.resolved && v.stage === 'stage2' && v.from && !inList(v.from)) {
    const k = TCGEnrich.nameKey(v.from); (want.get(k) || want.set(k, { name: v.from, cards: [] }).get(k)).cards.push(v); } });
  if (!want.size) return;
  const found = new Map();
  await Promise.all([...want.values()].map(async w => {
    const hits = await td30Get('/cards?name=' + encodeURIComponent('eq:' + TCGEnrich.apiName(w.name)));
    const bs = (Array.isArray(hits) ? hits : []).filter(h => h && typeof h.id === 'string' && TCGEnrich.sameCard(w.name, h.name || ''))
      .sort((x, y) => td30Rank(y.id) - td30Rank(x.id));
    // 3.2.8: some TCGdex records leave out what the card evolves from, so try the next printings too.
    for (const b of bs.slice(0, 3)) {
      const c = await td30Get('/cards/' + encodeURIComponent(b.id));
      if (c && typeof c.evolveFrom === 'string' && c.evolveFrom) { found.set(TCGEnrich.nameKey(w.name), c.evolveFrom); break; }
    } }));
  const rest = [...want.values()].filter(w => !found.has(TCGEnrich.nameKey(w.name)));
  if (rest.length && !(TCGEnrich.ptcgDown && TCGEnrich.ptcgDown())) {
    const q = rest.map(w => 'name:"' + TCGEnrich.apiName(w.name).replace(/"/g, '') + '"').join(' OR ');
    try {
      const init = {}; if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) init.signal = AbortSignal.timeout(10000);
      const r = await fetch('https://api.pokemontcg.io/v2/cards?q=' + encodeURIComponent('(' + q + ')') + '&select=name,evolvesFrom&pageSize=50', init);
      if (r.status >= 500 && TCGEnrich.ptcgMarkDown) TCGEnrich.ptcgMarkDown();
      const j = r.ok ? await r.json() : null;
      ((j && j.data) || []).forEach(c => { const k = TCGEnrich.nameKey(c.name);
        if (want.has(k) && !found.has(k) && c.evolvesFrom) found.set(k, c.evolvesFrom); });
    } catch (_) { if (navigator.onLine !== false && TCGEnrich.ptcgMarkDown) TCGEnrich.ptcgMarkDown(); }
  }
  // 3.2.8: last, the saved list of Standard cards, which knows every legal Stage 1's Basic.
  want.forEach((w, k) => { if (!found.has(k) && typeof r273From === 'function') { const b = r273From(w.name); if (b) found.set(k, b); } });
  want.forEach((w, k) => { if (found.has(k)) w.cards.forEach(v => { v.base = found.get(k); }); });
}

enrichDeckCards = async function (cards) {
  _td31Src = { td: [], pt: [] };
  const cov = await _v29EnrichDeck.apply(this, arguments);
  const td = new Set(_td31Src.td), pt = new Set(_td31Src.pt);
  (cards || []).forEach(c => {
    const k = String(c.name || '').toLowerCase();
    if (c.resolved && td.has(k)) c.via = 'tcgdex';
    else if (c.resolved && pt.has(k)) c.via = 'ptcg';
    else if (c.resolved === false) delete c.via;
  });
  if (cov) { cov.tcgdex = td.size; cov.ptcg = pt.size; }
  return cov;
};

// 2.5.6: a list can run two different cards with one name (Greninja ex from TWM and from 30C,
// Riolu from MEG and PRE). Card data was looked up by name, so every line of that name got
// one printing's data and the grade read only one of the cards. Lines are now read in layers,
// each layer holding at most one printing of each name, so every printing gets its own data.
// A layer that cannot read a line keeps the data its first printing got.
const _v256EnrichDeck = enrichDeckCards;
const _v256Fields = ['resolved','supertype','hp','stage','evolvesFrom','base','prizeValue','types','weak','retreat','provides',
  'requires','reg','ace','dataSource','abilities','ttype','atext','rtext','etext','sub','tx','byName','readPrint','pocket','attacks','via'];
enrichDeckCards = async function (cards) {
  const list = Array.isArray(cards) ? cards : [];
  const print = c => String(c.set || '').trim().toUpperCase() + ' ' + String(c.num || '').trim().replace(/^0+(?=\d)/, '').toUpperCase();
  const seen = new Map(), layers = [];
  list.forEach(c => {
    const n = String(c && c.name || '').toLowerCase();
    let m = seen.get(n);
    if (!m) { m = new Map(); seen.set(n, m); }
    const k = print(c);
    if (!m.has(k)) m.set(k, m.size);
    (layers[m.get(k)] = layers[m.get(k)] || []).push(c);
  });
  if (layers.length < 2) return _v256EnrichDeck.apply(this, arguments);
  const cov = await _v256EnrichDeck.call(this, layers[0]);
  const first = new Map();
  layers[0].forEach(c => { const n = String(c.name || '').toLowerCase(); if (!first.has(n)) first.set(n, c); });
  for (const layer of layers.slice(1)) {
    try { await _v256EnrichDeck.call(this, layer); } catch (_) {}
    layer.forEach(c => {
      const f = first.get(String(c.name || '').toLowerCase());
      if (c.resolved || !f || !f.resolved) return;
      _v256Fields.forEach(k => { if (f[k] === undefined) delete c[k]; else c[k] = JSON.parse(JSON.stringify(f[k])); });
      c.byName = true;
    });
  }
  return cov;
};

// The grade names the backup when it was needed.
renderGrade = function () {
  const r = _v29RenderGrade.apply(this, arguments);
  const deck = typeof findDeck === 'function' ? findDeck(state.activeDeckId) : null;
  const n = (deck && deck.cards || []).filter(c => c.via === 'ptcg').length;
  const body = document.getElementById('grade-body');
  if (body && n && !document.getElementById('td30-note')) {
    const p = document.createElement('div');
    p.id = 'td30-note';
    p.className = 'r29-note td30-note';
    p.textContent = `${n} ${n === 1 ? 'card was' : 'cards were'} read from pokemontcg.io, the backup card database, because TCGdex could not read ${n === 1 ? 'it' : 'them'}.`;
    body.appendChild(p);
  }
  // 3.2.8: a card whose own printing could not be read names the printing its text came from.
  const note = g116PrintNote(deck);
  if (body && note && !document.getElementById('td116-note')) {
    const p = document.createElement('div');
    p.id = 'td116-note';
    p.className = 'r29-note td30-note';
    p.textContent = note;
    body.appendChild(p);
  }
  return r;
};
/** 3.2.8: one sentence for each card whose text came from another printing, naming that printing, or ''. */
function g116PrintNote(deck) {
  const other = (deck && deck.cards || []).filter((c, i, a) => c.byName && c.readPrint && a.findIndex(x => x.name === c.name) === i);
  return other.slice(0, 5).map(c => `The card text for ${c.name} was read from another printing, ${c.readPrint}.`).join(' ') +
    (other.length > 5 ? ` ${other.length - 5} more cards were read from other printings.` : '');
}

// Card art: TCGdex's picture is one more fallback after Limitless and pokemontcg.io.
function td31Art(card) {
  const id = td30CardId(card.set, card.num);
  if (!id) return null;
  const set = id.slice(0, id.lastIndexOf('-')), local = id.slice(id.lastIndexOf('-') + 1);
  const m = set.match(/^(me|sv|swsh|sm)/);
  if (!m) return null;
  return `https://assets.tcgdex.net/en/${m[1]}/${set}/${local}/low.webp`;
}
const _v30Candidates = getImageCandidates;
getImageCandidates = function (card) {
  const urls = _v30Candidates.apply(this, arguments);
  let u = null;
  try { u = td31Art(card); } catch (_) {}
  if (u && urls.length && !urls.includes(u)) urls.push(u);
  return urls;
};

// Rotation reprint check: pokemontcg.io reads up to four names in one request,
// so it is still asked first. When it fails, each name is read from TCGdex
// (its newest printings: 8 for a Pokemon, 3 for others), so the check keeps working after the shutdown.
async function r31TdReprints(rows) {
  const found = {};
  for (const r of rows) {
    const list = await td30Get('/cards?name=' + encodeURIComponent('eq:' + TCGEnrich.apiName(r.name)));
    if (!Array.isArray(list)) continue;
    const hits = list.filter(b => b && typeof b.id === 'string' && r29Key(b.name || '') === r.key)
      .sort((a, b) => td30Rank(b.id) - td30Rank(a.id)).slice(0, r.pkmn ? 8 : 3);  // 2.5.2: a Pokemon's newest printings can have other attacks, so look further
    let best = null;
    for (const b of hits) {
      const c = td30Shape(await td30Get('/cards/' + encodeURIComponent(b.id)));
      if (!c || !r29M(c.regulationMark)) continue;
      if (r.pkmn) {
        const atk = (c.attacks || []).map(a => r29Key(a.name)).filter(Boolean).sort();
        const abil = (c.abilities || []).map(a => r29Key(a.name)).filter(Boolean).sort();
        if (atk.join('|') !== r.atk.join('|') || abil.join('|') !== r.abil.join('|')) continue;
      }
      if (!best || c.regulationMark > best) best = c.regulationMark;
    }
    found[r.key] = { best };
  }
  return found;
}

/** The reprint reads for the rows to check: { key: { best } }. */
async function r31Reprints(deck, todo) {
  const found = {};
  const failed = [];
  const batches = [];
  for (let i = 0; i < todo.length; i += 4) batches.push(todo.slice(i, i + 4));
  const isDown = () => !!(TCGEnrich.ptcgDown && TCGEnrich.ptcgDown());
  const get = async url => {
    // 3.4.2: pokemontcg.io is skipped while it is down; these names go straight to TCGdex below.
    if (isDown()) return null;
    let down = false;
    for (let a = 0; a < 2; a++) {
      if (a && isDown()) break;
      down = false;
      try {
        const init = {};
        if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) init.signal = AbortSignal.timeout(10000);
        const r = await fetch(url, init);
        if (r.ok) return await r.json();
        if (r.status !== 429 && r.status < 500) return null;
        down = r.status >= 500;
      } catch (_) { down = true; }
      if (!a) await new Promise(res => setTimeout(res, 1200));
    }
    if (down && navigator.onLine !== false && TCGEnrich.ptcgMarkDown) TCGEnrich.ptcgMarkDown();
    return null;
  };
  await Promise.all(batches.map(async b => {
    const q = '(' + b.map(r => 'name:"' + TCGEnrich.apiName(r.name).replace(/"/g, '') + '"').join(' OR ') + ')';
    const json = await r52AllPages(get, 'https://api.pokemontcg.io/v2/cards?q=' + encodeURIComponent(q) +
      '&select=id,name,supertype,regulationMark,attacks,abilities&pageSize=250');
    if (!json || !Array.isArray(json.data)) { failed.push(...b); return; }
    b.forEach(r => {
      let best = null;
      json.data.forEach(c => {
        if (r29Key(c.name) !== r.key || !r29M(c.regulationMark)) return;
        // A Pokemon only counts as a reprint with the same attacks and Abilities.
        if (r.pkmn) {
          const atk = (c.attacks || []).map(a => r29Key(a.name)).filter(Boolean).sort();
          const abil = (c.abilities || []).map(a => r29Key(a.name)).filter(Boolean).sort();
          if (atk.join('|') !== r.atk.join('|') || abil.join('|') !== r.abil.join('|')) return;
        }
        if (!best || c.regulationMark > best) best = c.regulationMark;
      });
      found[r.key] = { best };
    });
  }));
  if (failed.length) {
    try { Object.assign(found, await r31TdReprints(failed)); } catch (_) {}
  }
  return found;
}

r29CheckReprints = async function (deck) {
  if (_r29Busy.has(deck.id) || _r29Tried.has(deck.id)) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const todo = r29NeedsCheck(deck, r29Rows(deck));
  if (!todo.length) return;
  _r29Busy.add(deck.id); _r29Tried.add(deck.id);
  // 3.3.1 (Muse 3.3 retest): the check always ends, even when a read throws, so a grade never waits on it
  // for the rest of the visit (that held the deck's grade history).
  let found = {};
  // A read with no timeout of its own (a browser without AbortSignal.timeout) stops waiting after 30 seconds.
  try { found = await Promise.race([r31Reprints(deck, todo), new Promise(res => setTimeout(() => res({}), 30000))]); }
  catch (e) { if (typeof rdReportError === 'function') rdReportError(e, 'reprint check'); }
  finally { _r29Busy.delete(deck.id); }
  if (!Object.keys(found).length) { if (typeof g71Redraw === 'function') g71Redraw(); return; }
  if (!deck.rot29 || deck.rot29.v !== ROT29.v) deck.rot29 = { v: ROT29.v, names: {} };
  Object.assign(deck.rot29.names, found);
  try { await saveState(); } catch (_) {}
  if (document.getElementById('screen-home').classList.contains('active')) renderHome();
  const pane = document.getElementById('grade-body');
  if (state.activeDeckId === deck.id && pane && pane.style.display !== 'none' &&
      document.getElementById('screen-review').classList.contains('active')) renderGrade();
};

// ═══════════ v31: credits and the unofficial note in Help ═══════════
const PT31_UNOFFICIAL = 'RdyDeck is an unofficial, fan-made app. It is not produced, endorsed, supported or affiliated with Nintendo, The Pokémon Company, Game Freak or Creatures. Pokémon, card names, card text and card images are trademarks and copyright of their respective owners.';
const PT31_MIT = `MIT License

Copyright (c) 2021 TCGdex

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

const _v30Help = openHelpSheet;
openHelpSheet = function () {
  _v30Help.apply(this, arguments);
  const list = document.querySelector('.hs-list');
  if (list && !document.getElementById('cr31-row')) {
    const b = document.createElement('button');
    b.id = 'cr31-row';
    b.className = 'hs-row';
    b.onclick = () => { closeSheet(); openCredits(); };
    b.innerHTML = `<span class="ha-ic">${ic23('file')}</span><span class="hs-tx"><b>Credits and legal</b><span>Where the cards and lists come from</span></span><svg class="ic hs-go"><use href="#i-next"/></svg>`;
    list.appendChild(b);
  }
  const hint = [...document.querySelectorAll('.modal-hint')].find(h => /^(RdyDeck|Prize Trainer) v/.test(h.textContent));
  if (hint && !document.getElementById('cr31-note')) {
    const p = document.createElement('div');
    p.id = 'cr31-note';
    p.className = 'modal-hint cr31-note';
    p.textContent = 'Unofficial fan-made app. Not affiliated with Nintendo or The Pokémon Company.';
    hint.after(p);
  }
};

function openCredits() {
  const a = (href, t) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${t}</a>`;
  const row = (what, who) => `<li><b>${what}</b><span>${who}</span></li>`;
  openSheet(`<div class="modal-title">Credits and legal</div>
    <p class="cr31-legal" id="cr31-legal">${esc(PT31_UNOFFICIAL)}</p>
    <ul class="cr31-list">
      ${row('Card data', `${a('https://tcgdex.dev', 'TCGdex')}, free and open card database (MIT license)`)}
      ${row('Backup card data', `${a('https://pokemontcg.io', 'Pokémon TCG API')} (pokemontcg.io)`)}
      ${row('Decklists, meta and card images', a('https://limitlesstcg.com', 'Limitless TCG'))}
      ${row('More card images', 'Pokémon TCG API and TCGdex')}
      ${row('Fonts', `${a('https://fonts.google.com/specimen/Saira', 'Saira')} and Saira Condensed by Omnibus-Type (SIL Open Font License 1.1)`)}
    </ul>
    <details class="o-more cr31-mit"><summary>TCGdex license</summary><pre>${esc(PT31_MIT)}</pre></details>
    <div class="modal-hint" style="margin-top:0.9rem">RdyDeck ${PT_VERSION}${PT_PLAY ? ' (Google Play)' : ''}</div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet();openHelpSheet()">Back</button><button class="btn" onclick="closeSheet()">Close</button></div>`);
}

