
// ═══════════ v68: Deck builder ═══════════
// Build a 60 card list with the card list and what winning lists run beside you.
// Data: cards.json (every Standard legal card, one per card, from pokemon-tcg-data, built weekly by
// build-cards.mjs) and builder.json (what each meta deck's top lists run, built weekly by
// refresh-data.mjs). Both load when the builder opens. Start from a meta deck (its core: the cards
// most of its top lists run), around a Pokemon (adds its evolution line), one of your decks, a pasted
// list or nothing. The checks are the deck building rules and plain facts read from the cards; the
// suggestions are what top lists run. Save and grade hands the list to the same steps as Import.
const BLD_KEY = 'rd_builder_draft_v1';
const BLD_CORE = 0.75;        // a meta deck's core: cards at least this share of its lists run
const BLD_SUGGEST = 0.25;     // suggest a card when at least this share of the lists run it
const BLD_TK = { I: 'Item', S: 'Supporter', D: 'Stadium', O: 'Pokémon Tool' };
const BLD_TYPE = { G: 'Grass', R: 'Fire', W: 'Water', L: 'Lightning', P: 'Psychic', F: 'Fighting', D: 'Darkness', M: 'Metal', Y: 'Fairy', N: 'Dragon', C: 'Colorless' };
const BLD_BASIC_E = /^(?:basic\s+)?(grass|fire|water|lightning|psychic|fighting|darkness|metal)\s+energy$/i;
// Special Energy that pays for a type: the type in its name, or every type (Prism, Luminous, Neo Upper).
const BLD_SPECIAL_TYPES = { 'prism energy': 'GRWLPFDMYN', 'luminous energy': 'GRWLPFDMYN', 'neo upper energy': 'GRWLPFDMYN', "team rocket's energy": 'PD' };

let bldCat = null, bldMeta = null, bldUp = null, bldMC = null, bldLoad = null, bldQ = '', bldTab = 'all', bldActs = [], bldSheetActs = [];
let bld = bldRead();
let bldResumed = false;   // the list on screen was left from last time

function bldRead() {
  try { const d = JSON.parse(safeLocalGet(BLD_KEY) || 'null'); if (d && Array.isArray(d.rows)) return d; } catch (_) {}
  return { rows: [], arch: null, from: null, name: '' };
}
function bldWrite() { safeLocalSet(BLD_KEY, JSON.stringify(bld)); }

/** Same name test as the rules check, with Basic Energy named either way ("Fire Energy", "Basic Fire Energy"). */
function bldKey(name) {
  const m = String(name || '').trim().match(BLD_BASIC_E);
  return m ? 'basic ' + m[1].toLowerCase() + ' energy' : rules34Key(name);
}
const bldPct = r => Math.round(r * 100) + '%';

/** Load cards.json and builder.json once. Either may fail (offline the first time); the builder still works with what it has. */
function bldData() {
  if (bldLoad) return bldLoad;
  const get = f => fetch(f, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
  // 2.6: meta-cards.json (every top list of the last two sets) is what the builder shows; builder.json
  // stays as it was for the grade's upgrade suggestions (bldUp), so they do not move.
  bldLoad = Promise.all([get('cards.json'), get('builder.json'), get('meta-cards.json')]).then(([c, m, mc]) => {
    bldUp = m && Array.isArray(m.decks) ? m : null;
    bldMC = mc && Array.isArray(mc.decks) && mc.decks.length ? mc : null;
    bldMeta = mc26Merge(bldUp, bldMC);
    bldIndex(c && Array.isArray(c.cards) ? c.cards : []);
    if (!c) bldLoad = null;   // try again next time
  });
  return bldLoad;
}

/** Index the card list by name and by print. Cards the meta lists run that the card list lacks (a promo, a set out this week) are added from those lists. */
function bldIndex(cards) {
  const byName = new Map(), byPrint = new Map();
  const add = e => {
    e.key = bldKey(e.n);
    e.q = rules34Key(e.n).replace(/[^a-z0-9' ]/g, ' ');
    if (!byName.has(e.key)) byName.set(e.key, []);
    byName.get(e.key).push(e);
    byPrint.set(e.s + ' ' + e.no, e);
  };
  cards.forEach(add);
  const use = new Map();   // name key -> best share of lists that run it, over every meta deck
  if (bldMeta) {
    const seen = c => {
      const k = bldKey(c[0]);
      const hit = byPrint.get(c[1] + ' ' + c[2]);
      if (hit && !hit.mp) hit.mp = [c[1], c[2]];   // the print top lists run, shown in place of the card list's pick
      if (!hit) {
        const same = byName.get(k);
        if (same) { byPrint.set(c[1] + ' ' + c[2], same[0]); if (!same[0].mp) same[0].mp = [c[1], c[2]]; }
        else if (c[1] && c[2]) add({ n: c[0], s: c[1], no: c[2], k: c[3], meta: 1 });
      }
      use.set(k, Math.max(use.get(k) || 0, c[6]));
    };
    bldMeta.decks.forEach(d => d.cards.forEach(seen));
    (bldMeta.all || []).forEach(seen);
  }
  // What top lists show about card text the card list does not carry: a Stage 1 or 2 most lists of a
  // deck run without what it evolves from is played another way (noEvo), and a Pokemon they run with
  // none of the Energy its last attack asks for is there for its Ability (noNeed).
  const noEvo = new Set(), noNeed = new Set();
  if (bldMeta) bldMeta.decks.forEach(d => {
    const ran = new Map(d.cards.map(c => [bldKey(c[0]), c[6]]));
    const types = new Set();
    d.cards.forEach(c => { if (c[3] === 'E' && c[6] >= 0.25) bldETypes(c[0]).forEach(t => types.add(t)); });
    d.cards.forEach(c => {
      if (c[3] !== 'P' || c[6] < 0.5) return;
      const e = (byName.get(bldKey(c[0])) || [])[0];
      if (!e) return;
      if (e.st && e.ef && (ran.get(bldKey(e.ef)) || 0) < 0.25) noEvo.add(e.key);
      if (e.need && e.need.split('').some(t => !types.has(t) && t !== 'Y' && t !== 'N')) noNeed.add(e.key);
    });
  });
  bldCat = { cards: [...byName.values()].flat(), byName, byPrint, use, noEvo, noNeed };
}

/** The Energy types a card named this pays for: a Basic Energy's type, a type in a Special Energy's name, or every type. */
function bldETypes(name) {
  const m = String(name).match(BLD_BASIC_E);
  if (m) return [Object.keys(BLD_TYPE).find(k => BLD_TYPE[k].toLowerCase() === m[1].toLowerCase())];
  const sp = BLD_SPECIAL_TYPES[rules34Key(name)];
  if (sp) return sp.split('');
  return Object.keys(BLD_TYPE).filter(k => k !== 'C' && new RegExp('\\b' + BLD_TYPE[k] + '\\b', 'i').test(name));
}

/** The card list entry for a list row: its own print first, then any card with the name. */
function bldEntry(row) {
  if (!bldCat) return null;
  return bldCat.byPrint.get(row.set + ' ' + row.num) || (bldCat.byName.get(bldKey(row.name)) || [])[0] || null;
}
function bldKind(row) {
  const e = bldEntry(row);
  if (e) return e.k === 'P' ? 'pokemon' : e.k === 'E' ? 'energy' : 'trainer';
  return row.section || cardCategory(row);
}

// ── The list ──
function bldTotal() { return bld.rows.reduce((a, r) => a + r.count, 0); }
function bldNameCount(name) { const k = bldKey(name); return bld.rows.filter(r => bldKey(r.name) === k).reduce((a, r) => a + r.count, 0); }
function bldIsBasicE(row) { const e = bldEntry(row); return !!(e ? e.be : BLD_BASIC_E.test(row.name)); }
function bldCanAdd(row) { return bldIsBasicE(row) || bldNameCount(row.name) < 4; }

/** Add copies of a card (an entry or a row), keeping to 4 with the same name. Returns how many went in. */
function bldAdd(card, n) {
  const row = card.n ? { name: card.n, set: card.s, num: card.no } : { name: card.name, set: card.set, num: card.num };
  let have = bld.rows.find(r => r.set === row.set && r.num === row.num && bldKey(r.name) === bldKey(row.name));
  let put = 0;
  for (let i = 0; i < (n || 1); i++) {
    if (!bldCanAdd(row)) break;
    if (!have) { have = { ...row, count: 0 }; bld.rows.push(have); }
    have.count++; put++;
  }
  return put;
}
function bldStep(i, d) {
  const r = bld.rows[i];
  if (!r) return;
  if (d > 0 && !bldCanAdd(r)) return;
  r.count += d;
  if (r.count <= 0) bld.rows.splice(i, 1);
  bldChanged();
}
function bldChanged() { bldWrite(); bldRender(); }

/** Copies that most of a meta deck's lists run of a card, or 0. */
function bldUsual(name) {
  if (!bldMeta) return 0;
  const k = bldKey(name);
  let best = null;
  bldMeta.decks.forEach(d => d.cards.forEach(c => { if (bldKey(c[0]) === k && (!best || c[6] > best[6])) best = c; }));
  return best ? best[4] : 0;
}

/** The card list entry to use for a name: the print top lists run, else the card list's own pick. */
function bldByName(name) {
  if (!bldCat) return null;
  const list = bldCat.byName.get(bldKey(name)) || [];
  if (!list.length) return null;
  if (bldMeta) {
    for (const d of bldMeta.decks) for (const c of d.cards) if (bldKey(c[0]) === bldKey(name)) return { ...list[0], n: c[0], s: c[1], no: c[2] };
  }
  return list.slice().sort((a, b) => (b.pr || 1) - (a.pr || 1))[0];
}

/** A Pokemon with what it evolves from, at the counts top lists run (else 4, 3 and 3). */
function bldAddLine(e) {
  const line = [e];
  let cur = e;
  for (let i = 0; i < 2 && cur && cur.ef; i++) {
    const prev = bldByName(cur.ef);
    if (!prev) break;
    line.unshift(prev);
    cur = prev;
  }
  const names = [];
  line.forEach((x, i) => {
    // v71: a card already in the list is topped up to the usual count, so a lone Basic does not stay at 1.
    const n = bldUsual(x.n) || (line.length === 1 ? 3 : i === 0 ? 4 : 3);
    const have = bldNameCount(x.n);
    if (have >= n) return;
    if (bldAdd(x, n - have)) names.push(x.n);
  });
  return names;
}

// ── Which meta deck the list is ──
/** The meta deck the list was started from, or the one whose core Pokemon it shares most. */
function bldRef() {
  if (!bldMeta) return null;
  if (bld.arch) { const d = bldMeta.decks.find(x => x.id === bld.arch); if (d) return { d, how: 'chosen' }; }
  const mine = new Set(bld.rows.filter(r => bldKind(r) === 'pokemon').map(r => bldKey(r.name)));
  if (!mine.size) return null;
  let best = null;
  bldMeta.decks.forEach(d => {
    const core = d.cards.filter(c => c[3] === 'P' && c[6] >= 0.6);
    if (!core.length) return;
    const hit = core.filter(c => mine.has(bldKey(c[0]))).length;
    const score = hit / core.length;
    if (hit && (!best || score > best.score || (score === best.score && d.lists > best.d.lists))) best = { d, score, hit };
  });
  if (!best) return null;
  return { d: best.d, how: best.score >= 0.5 ? 'match' : 'close', hit: best.hit };
}
function bldUseIn(d, name) { const k = bldKey(name); return d ? d.cards.find(c => bldKey(c[0]) === k) || null : null; }

/** A meta deck's core: every card at least BLD_CORE of its lists run, at the usual count, cut to 60. */
function bldCore(d) {
  let rows = d.cards.filter(c => c[6] >= BLD_CORE).map(c => ({ name: c[0], set: c[1], num: c[2], count: c[4], section: c[3] === 'P' ? 'pokemon' : c[3] === 'E' ? 'energy' : 'trainer', rate: c[6] }));
  let total = rows.reduce((a, r) => a + r.count, 0);
  const byRate = rows.slice().sort((a, b) => a.rate - b.rate);
  // v71: over 60, leave out the least played cards whole while the rest still makes 60, so the cards
  // kept stay at their usual counts. Only what is still over comes off one copy at a time.
  for (const r of byRate) { if (total > 60 && total - r.count >= 60) { total -= r.count; r.count = 0; } }
  for (const r of byRate) { while (total > 60 && r.count > 1) { r.count--; total--; } }
  rows = rows.filter(r => r.count > 0).map(({ rate, ...r }) => r);
  return rows;
}

// ── Checks ──
/** The deck building rules and plain facts from the cards, each a sentence; most serious first. */
function bldChecks() {
  const out = [];
  const total = bldTotal();
  const act = (label, fn) => ({ label, i: bldActs.push(fn) - 1 });
  if (!total) return out;
  if (total < 60) out.push({ sev: 'warn', t: `${total} card${total === 1 ? '' : 's'}. A Standard deck is exactly 60, so ${60 - total} to go.` });
  else if (total > 60) out.push({ sev: 'bad', t: `${total} cards. A Standard deck is exactly 60, so cut ${total - 60}.` });
  else out.push({ sev: 'ok', t: '60 cards.' });

  const names = new Map();
  bld.rows.forEach(r => { if (bldIsBasicE(r)) return; const k = bldKey(r.name); const x = names.get(k) || { name: r.name, n: 0 }; x.n += r.count; names.set(k, x); });
  names.forEach(x => { if (x.n > 4) out.push({ sev: 'bad', t: `${x.n} ${x.name}. The most allowed is 4 cards with the same name.` }); });

  const rows = bld.rows.map(r => ({ r, e: bldEntry(r) }));
  const aces = rows.filter(x => x.e && x.e.ace);
  const aceN = aces.reduce((a, x) => a + x.r.count, 0);
  if (aceN > 1) out.push({ sev: 'bad', t: `${aceN} ACE SPEC cards (${aces.map(x => x.r.name).join(', ')}). Only 1 is allowed.` });
  else if (!aceN && total >= 40) out.push({ sev: 'warn', t: 'No ACE SPEC. Every deck may run 1, and nearly every top list does.' });
  const rad = rows.filter(x => /^radiant /i.test(x.r.name)).reduce((a, x) => a + x.r.count, 0);
  if (rad > 1) out.push({ sev: 'bad', t: `${rad} Radiant Pokémon. Only 1 is allowed.` });

  const mons = rows.filter(x => bldKind(x.r) === 'pokemon');
  if (!mons.length) out.push({ sev: 'bad', t: 'No Pokémon yet.' });
  else if (mons.every(x => x.e && x.e.st != null) && !mons.some(x => x.e.st === 0)) out.push({ sev: 'bad', t: 'No Basic Pokémon, so the game cannot start.' });

  // Evolution lines: each Stage 1 needs what it evolves from; a Stage 2 needs its Stage 1, or Rare Candy and the Basic.
  const have = k => bld.rows.some(r => bldKey(r.name) === k);
  const candy = have(bldKey('Rare Candy'));
  const told = new Set();
  mons.forEach(({ r, e }) => {
    if (!e || !e.st || !e.ef || have(bldKey(e.ef)) || told.has(bldKey(e.ef)) || bldCat.noEvo.has(e.key)) return;
    const prev = bldByName(e.ef);
    if (e.st === 2 && candy && prev && prev.ef && have(bldKey(prev.ef))) return;
    told.add(bldKey(e.ef));
    const n = Math.min(4, r.count + 1);
    out.push({ sev: 'bad', t: `${e.n} evolves from ${e.ef}, which is not in the list.`, act: prev ? act(`Add ${n} ${e.ef}`, () => { bldAdd(prev, n); }) : null });
  });

  // Energy for the last attack each Pokemon has (Colorless left out).
  // Only the top of each line (what evolves from it attacks instead), and not a Pokemon that top lists
  // run without that Energy (it is there for its Ability).
  const eTypes = new Set();
  rows.forEach(({ r }) => { if (bldKind(r) === 'energy') bldETypes(r.name).forEach(t => eTypes.add(t)); });
  const below = new Set(mons.filter(x => x.e && x.e.ef).map(x => bldKey(x.e.ef)));
  const missing = new Map();
  mons.forEach(({ e }) => {
    if (!e || !e.need || below.has(e.key) || bldCat.noNeed.has(e.key)) return;
    const lack = e.need.split('').filter(t => !eTypes.has(t) && t !== 'Y' && t !== 'N');
    if (lack.length && !missing.has(e.n)) missing.set(e.n, { e, lack });
  });
  [...missing.values()].slice(0, 4).forEach(({ e, lack }) => {
    const words = lack.map(t => BLD_TYPE[t]);
    const first = bldByName(`Basic ${words[0]} Energy`);
    out.push({ sev: 'warn', t: `${e.na || 'Its attack'} on ${e.n} needs ${e.need.split('').map(t => BLD_TYPE[t]).join(' and ')} Energy. The list has no ${words.join(' or ')} Energy.`,
      act: first ? act(`Add 4 ${first.n}`, () => { bldAdd(first, 4); }) : null });
  });

  // Cards that are not in the Standard card list (an old print, a typo, a set not out yet).
  if (bldCat && bldCat.cards.length) {
    rows.filter(x => !x.e).slice(0, 5).forEach(({ r }) => out.push({ sev: 'warn', t: `${r.name}${r.set ? ` ${r.set} ${r.num}` : ''} is not in the Standard card list. Check the name, or it may not be legal.` }));
  }
  // 2.6: counts few of the meta deck's top lists run, and cards they do not run.
  if (typeof mc26Checks === 'function') out.push(...mc26Checks(bldRef(), act));
  const order = { bad: 0, warn: 1, ok: 2 };
  return out.sort((a, b) => order[a.sev] - order[b.sev]);
}

/** Counts by kind, for the list and, when there is one, the meta deck's lists. */
function bldMix() {
  const m = { pokemon: 0, trainer: 0, energy: 0, sup: 0 };
  bld.rows.forEach(r => { const k = bldKind(r); m[k] += r.count; const e = bldEntry(r); if (e && e.tk === 'S') m.sup += r.count; });
  return m;
}
function bldRefMix(d) {
  const m = { pokemon: 0, trainer: 0, energy: 0, sup: 0 };
  d.cards.forEach(c => {
    const n = c[5] * c[6];
    m[c[3] === 'P' ? 'pokemon' : c[3] === 'E' ? 'energy' : 'trainer'] += n;
    const e = bldCat && (bldCat.byName.get(bldKey(c[0])) || [])[0];
    if (e && e.tk === 'S') m.sup += n;
  });
  Object.keys(m).forEach(k => { m[k] = Math.round(m[k]); });
  return m;
}

// ── Suggestions ──
/** What top lists run that the list does not, or runs fewer of. */
function bldSuggest(ref) {
  const out = [];
  const inList = k => bld.rows.some(r => bldKey(r.name) === k);
  const act = (label, fn) => ({ label, i: bldActs.push(fn) - 1 });
  const entry = c => { const e = bldCat && bldCat.byPrint.get(c[1] + ' ' + c[2]); return e ? { ...e, n: c[0], s: c[1], no: c[2] } : { n: c[0], s: c[1], no: c[2], k: c[3] }; };
  if (ref) {
    const d = ref.d;
    d.cards.forEach(c => {
      const k = bldKey(c[0]);
      if (c[6] < 0.5 || !inList(k)) return;
      const n = bldNameCount(c[0]);
      if (n < c[4] && !BLD_BASIC_E.test(c[0])) out.push({ c, e: entry(c), why: `${bldPct(c[6])} of ${d.name} top lists run it, most with ${c[4]}. You have ${n}.`, act: act(`Make it ${c[4]}`, () => { bldAdd(entry(c), c[4] - n); }) });
    });
    d.cards.forEach(c => {
      if (c[6] < BLD_SUGGEST || inList(bldKey(c[0]))) return;
      const e = entry(c);
      if (e.ace && bld.rows.some(r => { const x = bldEntry(r); return x && x.ace; })) return;
      out.push({ c, e, why: `${bldPct(c[6])} of ${d.name} top lists run it, most with ${c[4]}.`, act: act(`Add ${c[4]}`, () => { bldAdd(e, c[4]); }) });
    });
  } else if (bldMeta) {
    // No meta deck to go by: the Trainers most top lists run, whatever the deck.
    (bldMeta.all || []).filter(c => c[3] === 'T' && c[6] >= 0.35 && !inList(bldKey(c[0]))).forEach(c => {
      const e = entry(c);
      out.push({ c, e, why: `${bldPct(c[6])} of top lists run it, most with ${c[4]}.`, act: act(`Add ${c[4]}`, () => { bldAdd(e, c[4]); }) });
    });
  }
  // No ACE SPEC yet: the ones top lists run most, across every meta deck.
  const hasAce = bld.rows.some(r => { const x = bldEntry(r); return x && x.ace; });
  if (!hasAce && bldMeta && bldCat && !out.some(s => s.e.ace)) {
    const tally = new Map();
    bldMeta.decks.forEach(d => d.cards.forEach(c => { const e = bldCat.byPrint.get(c[1] + ' ' + c[2]); if (e && e.ace) { const t = tally.get(c[0]) || { c, n: 0 }; t.n += c[6] * d.lists; tally.set(c[0], t); } }));
    const lists = bldMeta.decks.reduce((a, d) => a + d.lists, 0) || 1;
    [...tally.values()].sort((a, b) => b.n - a.n).slice(0, 3).forEach(({ c, n }) => {
      const e = entry(c);
      out.push({ c, e, why: `ACE SPEC. ${bldPct(n / lists)} of top lists run it.`, act: act('Add 1', () => { bldAdd(e, 1); }) });
    });
  }
  return out;
}

// ── Drawing ──
function bldThumb(name, set, num) {
  const c = fetchCardImageSync({ name, set, num });
  const nm = esc(name);
  const img = c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="" loading="lazy" data-fallbacks="${esc(JSON.stringify(c.fallbackUrls || []))}" data-fallback-idx="0" onerror="reviewImgError(this)">` : '<div class="review-placeholder"><i class=ph-card></i></div>';
  return `<button type="button" class="bld-th" onclick="event.stopPropagation();bldBig(${esc(JSON.stringify(JSON.stringify({ name, set, num })))})" aria-label="Show ${nm}">${img}</button>`;
}
/** fetchCardImage without the promise: the art addresses for a card. */
function fetchCardImageSync(card) {
  const e = getEnergyImageUrl(card.name);
  if (e) return { imageUrl: e, fallbackUrls: [] };
  if (!card.set || !card.num) return { imageUrl: '', fallbackUrls: [] };
  const u = getImageCandidates(card);
  return { imageUrl: u[0] || '', fallbackUrls: u.slice(1) };
}
function bldBig(json) {
  let c; try { c = JSON.parse(json); } catch (_) { return; }
  const a = fetchCardImageSync(c);
  const urls = [a.imageUrl, ...a.fallbackUrls].filter(Boolean).map(u => u.replace(/_XS\.png$/, '.png'));
  openSheet(`<div class="modal-title">${esc(c.name)}</div>
    ${urls.length ? `<img class="bld-big" src="${esc(urls[0])}" alt="${esc(c.name)}" data-fallbacks="${esc(JSON.stringify(urls.slice(1)))}" data-fallback-idx="0" onerror="reviewImgError(this)">` : ''}
    <div class="bld-small" style="margin-top:0.6rem;text-align:center">${c.set ? esc(c.set + ' ' + c.num) : ''}</div>
    <div class="modal-actions"><button class="btn btn-primary" onclick="closeSheet()">Close</button></div>`);
}

/** The plain facts line for a card: stage, HP, Abilities and attacks; or the Trainer or Energy kind. */
function bldFacts(e) {
  if (!e) return '';
  if (e.meta) return '';
  if (e.k === 'P') return [e.st === 2 ? 'Stage 2' : e.st === 1 ? 'Stage 1' : 'Basic', e.hp ? e.hp + ' HP' : '', e.w || ''].filter(Boolean).join(', ');
  if (e.k === 'T') return (BLD_TK[e.tk] || 'Trainer') + (e.ace ? ', ACE SPEC' : '');
  return e.be ? 'Basic Energy' : 'Special Energy' + (e.ace ? ', ACE SPEC' : '');
}

function bldRowHtml(r, i, ref) {
  const e = bldEntry(r);
  const sub = (typeof mc26RowSub === 'function' && mc26RowSub(ref, r)) || bldFacts(e);
  return `<div class="bld-row">${bldThumb(r.name, r.set, r.num)}
    <div class="bld-tx"><div class="bld-nm">${esc(r.name)} <span class="bld-pr">${esc([r.set, r.num].filter(Boolean).join(' '))}</span></div>${sub ? `<div class="bld-sub">${esc(sub)}</div>` : ''}</div>
    <div class="bld-step"><button type="button" onclick="bldStep(${i},-1)" aria-label="One fewer ${esc(r.name)}">&minus;</button><b>${r.count}</b><button type="button" onclick="bldStep(${i},1)" aria-label="One more ${esc(r.name)}"${bldCanAdd(r) ? '' : ' disabled'}>+</button></div></div>`;
}

/** Pokemon in evolution order (each line together), Trainers by kind, Energy Special first. */
function bldSorted(kind) {
  const idx = bld.rows.map((r, i) => ({ r, i, e: bldEntry(r) })).filter(x => bldKind(x.r) === kind);
  if (kind === 'pokemon') {
    const root = e => { let cur = e, n = 0; while (cur && cur.ef && n++ < 2) { const p = bldByName(cur.ef); if (!p) return bldKey(cur.ef); cur = p; } return cur ? bldKey(cur.n) : ''; };
    const lineN = new Map();
    idx.forEach(x => { const k = root(x.e || { n: x.r.name }); x.root = k; lineN.set(k, (lineN.get(k) || 0) + x.r.count); });
    return idx.sort((a, b) => lineN.get(b.root) - lineN.get(a.root) || a.root.localeCompare(b.root) || ((a.e && a.e.st) || 0) - ((b.e && b.e.st) || 0) || b.r.count - a.r.count);
  }
  if (kind === 'trainer') { const o = { S: 0, I: 1, O: 2, D: 3 }; return idx.sort((a, b) => (o[a.e && a.e.tk] ?? 4) - (o[b.e && b.e.tk] ?? 4) || b.r.count - a.r.count || a.r.name.localeCompare(b.r.name)); }
  return idx.sort((a, b) => ((a.e && a.e.be) ? 1 : 0) - ((b.e && b.e.be) ? 1 : 0) || b.r.count - a.r.count);
}

/** Search the card list: every word must start a word of the name; the cards top lists run come first. */
function bldSearch(q) {
  if (!bldCat) return [];
  const ref = bldRef();
  const share = new Map(((ref && ref.d.cards) || (bldMeta && bldMeta.all) || []).map(c => [bldKey(c[0]), c[6]]));
  const pop = e => share.get(e.key) || 0;
  const words = rules34Key(q).replace(/[^a-z0-9' ]/g, ' ').split(' ').filter(Boolean);
  const kind = { pokemon: 'P', trainer: 'T', energy: 'E' }[bldTab];
  const out = [];
  for (const e of bldCat.cards) {
    if (kind && e.k !== kind) continue;
    if (words.length) {
      const parts = e.q.split(' ');
      if (!words.every(w => parts.some(p => p.startsWith(w)))) continue;
    } else if (!pop(e) || bld.rows.some(r => bldKey(r.name) === e.key)) continue;
    const exact = words.length && e.q === words.join(' ') ? 2 : words.length && e.q.startsWith(words[0]) ? 1 : 0;
    out.push({ e, s: exact * 10 + pop(e) * 5 + (bldCat.use.get(e.key) || 0) - (e.meta ? 0.1 : 0) });
  }
  // With nothing typed: the cards the meta deck's lists (or all top lists) run most, a short list.
  return out.sort((a, b) => b.s - a.s || a.e.n.localeCompare(b.e.n)).slice(0, words.length ? 40 : 8).map(x => x.e);
}
function bldResultsHtml() {
  const ref = bldRef();
  const list = bldSearch(bldQ);
  if (!bldCat) return '<div class="bld-small" style="padding:0.8rem">Loading the card list…</div>';
  if (!bldCat.cards.length) return '<div class="bld-small" style="padding:0.8rem">The card list did not load. Check your connection and open the builder again.</div>';
  if (!list.length) return `<div class="bld-small" style="padding:0.8rem">${bldQ ? 'No Standard card by that name.' : 'Type a card name to search every Standard card.'}</div>`;
  return list.map(x => {
    const e = x.mp ? { ...x, s: x.mp[0], no: x.mp[1] } : x;
    const u = ref && bldUseIn(ref.d, e.n);
    const sub = [bldFacts(e), u ? `${bldPct(u[6])} of ${ref.d.name} lists` : ''].filter(Boolean).join('. ');
    const lineAdd = e.k === 'P' && e.st && e.ef && !bldNameCount(e.ef);
    const full = !bldCanAdd({ name: e.n, set: e.s, num: e.no });
    const i = bldActs.push(() => {
      if (lineAdd) { const n = bldAddLine(e); showToast(n.length > 1 ? `Added ${n.join(', ')}.` : `Added ${e.n}.`); }
      else if (bldAdd(e, 1)) showToast(`Added ${e.n}.`);
    }) - 1;
    return `<div class="bld-row">${bldThumb(e.n, e.s, e.no)}<div class="bld-tx"><div class="bld-nm">${esc(e.n)} <span class="bld-pr">${esc(e.s + ' ' + e.no)}</span></div>${sub ? `<div class="bld-sub">${esc(sub)}</div>` : ''}</div>
      <button type="button" class="bld-add${lineAdd ? ' wide' : ''}" onclick="bldAct(${i})" aria-label="Add ${esc(e.n)}"${full ? ' disabled' : ''}>${lineAdd ? 'Add line' : '+'}</button></div>`;
  }).join('');
}
function bldAct(i) { const f = bldActs[i]; if (f) { f(); bldChanged(); } }

function bldStartHtml() {
  return `<div class="bld-sec"><h2 class="bld-h">Start from</h2><div class="bld-start">
    <button class="bld-opt" onclick="bldStartMeta()"><b>A meta deck</b><span>The cards most of its top lists run. You fill the rest.</span></button>
    <button class="bld-opt" onclick="bldStartMon()"><b>A Pokémon</b><span>Pick one and its evolution line goes in.</span></button>
    <button class="bld-opt" onclick="bldStartMine()"${state.decks.length ? '' : ' disabled'}><b>One of your decks</b><span>Change a saved list and grade it again.</span></button>
    <button class="bld-opt" onclick="bldStartPaste()"><b>A list you paste</b><span>From Limitless or Pokémon TCG Live.</span></button>
  </div></div>`;
}

function bldRender() {
  const body = document.getElementById('bld-body');
  if (!body) return;
  bldActs = [];
  const total = bldTotal();
  const cnt = document.getElementById('bld-count');
  cnt.textContent = `${total}/60`;
  cnt.className = 'bld-count' + (total === 60 ? ' ok' : total > 60 ? ' over' : '');
  const from = bld.from && state.decks.find(d => d.id === bld.from);
  document.getElementById('bld-title').textContent = bld.name || (from ? from.name : 'New deck');
  const ref = bldRef();
  const focus = document.activeElement && document.activeElement.id === 'bld-q';

  let left = '';
  if (!total) left += bldStartHtml();
  left += `<div class="bld-sec"><h2 class="bld-h">Add cards</h2>
    <div class="bld-search"><input type="search" id="bld-q" placeholder="Search Standard cards" aria-label="Search Standard cards" autocomplete="off" value="${esc(bldQ)}" oninput="bldQ=this.value;bldDrawResults()"></div>
    <div class="bld-kinds" role="group" aria-label="Card kind">${[['all', 'All'], ['pokemon', 'Pokémon'], ['trainer', 'Trainer'], ['energy', 'Energy']].map(([k, t]) => `<button type="button" class="${bldTab === k ? 'active' : ''}" onclick="bldSetKind('${k}')">${t}</button>`).join('')}</div>
    <div class="bld-small" id="bld-hint" style="margin:0 0 0.4rem${bldQ ? ';display:none' : ''}">${ref ? `Most run in ${esc(ref.d.name)} lists` : 'Most run in top lists'}</div><div class="bld-results" id="bld-results">${bldResultsHtml()}</div></div>`;
  if (total) {
    const label = { pokemon: 'Pokémon', trainer: 'Trainer', energy: 'Energy' };
    // A list left in the builder from last time says so, with a plain way to start a new deck empty.
    const resumed = bldResumed && !bld.from ? `<div class="bld-ref"><span>Your last unsaved list.</span><button type="button" class="btn btn-sm btn-ghost" onclick="bldConfirmReplace(() => bldReset([]))">Start new</button></div>` : '';
    left += `<div class="bld-sec"><h2 class="bld-h">Your list <span class="bld-n">${total} card${total === 1 ? '' : 's'}</span></h2>${resumed}` + ['pokemon', 'trainer', 'energy'].map(k => {
      const rows = bldSorted(k);
      if (!rows.length) return '';
      return `<div class="bld-group"><h3 class="bld-h">${label[k]} <span class="bld-n">${rows.reduce((a, x) => a + x.r.count, 0)}</span></h3>${rows.map(x => bldRowHtml(x.r, x.i, ref)).join('')}</div>`;
    }).join('') + '</div>';
  }

  let side = '';
  if (total) {
    const checks = bldChecks();
    const m = bldMix();
    let mix = `Pokémon ${m.pokemon}, Trainer ${m.trainer} (Supporter ${m.sup}), Energy ${m.energy}.`;
    if (ref) { const rm = bldRefMix(ref.d); mix += ` Most ${ref.d.name} lists: Pokémon ${rm.pokemon}, Trainer ${rm.trainer} (Supporter ${rm.sup}), Energy ${rm.energy}.`; }
    side += `<div class="bld-sec"><h2 class="bld-h">Checks</h2><ul class="bld-checks">${checks.map(c => `<li class="${c.sev}"><span aria-hidden="true"></span><div>${esc(c.t)}${c.act ? `<div><button type="button" class="bld-add wide" onclick="bldAct(${c.act.i})">${esc(c.act.label)}</button></div>` : ''}</div></li>`).join('')}
      <li class="ok info"><span aria-hidden="true" style="background:var(--text-3)"></span><div>${esc(mix)}</div></li></ul></div>`;
  }
  if (bldMeta) {
    const sugg = total ? bldSuggest(ref) : [];
    let refLine = '';
    if (ref) {
      const how = ref.how === 'chosen' ? 'Built from' : ref.how === 'match' ? 'Looks like' : 'Closest meta deck:';
      refLine = `<div class="bld-ref"><span>${how} <b>${esc(ref.d.name)}</b>, ${ref.d.lists} top lists.</span>${ref.how === 'chosen' ? '' : ''}<button type="button" class="btn btn-sm btn-ghost" onclick="bldStartMeta()">Change</button></div>`;
    } else if (total) refLine = `<div class="bld-ref"><span>No meta deck matches these Pokémon yet, so these are what top lists run whatever the deck.</span></div>`;
    if (total) side += `<div class="bld-sec"><h2 class="bld-h">Suggestions</h2>${refLine}${sugg.length ? `<div class="bld-group">${sugg.slice(0, 14).map(s => `<div class="bld-row">${bldThumb(s.e.n, s.e.s, s.e.no)}<div class="bld-tx"><div class="bld-nm">${esc(s.e.n)} <span class="bld-pr">${esc(s.e.s + ' ' + s.e.no)}</span></div><div class="bld-sub">${esc(s.why)}</div></div><button type="button" class="bld-add wide" onclick="bldAct(${s.act.i})">${esc(s.act.label)}</button></div>`).join('')}</div>` : '<div class="bld-small">Nothing to add from the top lists.</div>'}
      <div class="bld-small">${esc(bldMeta.from || '')}. The grade checks the rest when you save.</div></div>`;
    if (total && typeof mc26PanelHtml === 'function') side += mc26PanelHtml(ref);
  }
  body.innerHTML = side ? `<div class="bld-grid"><div>${left}</div><div class="bld-side">${side}</div></div>` : left;
  if (focus) { const q = document.getElementById('bld-q'); if (q) { q.focus(); try { q.setSelectionRange(q.value.length, q.value.length); } catch (_) {} } }
}
function bldDrawResults() {
  const box = document.getElementById('bld-results');
  if (!box) return;
  // Results keep their own action numbers after the list's.
  box.innerHTML = bldResultsHtml();
  const hint = document.getElementById('bld-hint');
  if (hint) hint.style.display = bldQ ? 'none' : '';
}
function bldSetKind(k) { bldTab = k; bldRender(); }

// ── Opening and starting ──
function openBuilder() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-build').classList.add('active');
  window.scrollTo(0, 0);
  bldResumed = bldTotal() > 0 && !bld.from;
  bldRender();
  bldData().then(bldRender);
}
function bldBack() { showScreen('home'); renderHome(); }

function bldReset(rows, extra) {
  bldResumed = false;
  bld = { rows: rows || [], arch: null, from: null, name: '', ...(extra || {}) };
  bldQ = '';
  bldChanged();
}
function bldConfirmReplace(go) {
  bldSheetActs = [];
  if (!bldTotal()) return go();
  const i = bldSheetActs.push(() => { closeSheet(); go(); }) - 1;
  openSheet(`<div class="modal-title">Start a new list?</div><p class="bld-small">The ${bldTotal()} cards in the builder now are cleared.</p>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet()">Cancel</button><button class="btn btn-primary" onclick="bldSheetActs[${i}]()">Start new</button></div>`);
}

function bldStartMeta() {
  bldData().then(() => {
    bldSheetActs = [];
    if (!bldMeta) { showToast('The meta decks did not load. Check your connection.'); return; }
    const rows = bldMeta.decks.map(d => {
      const top = d.cards.filter(c => c[3] === 'P' && c[6] >= 0.6).slice(0, 1)[0];
      const i = bldSheetActs.push(() => { closeSheet(); bldConfirmReplace(() => { const core = bldCore(d), n = core.reduce((a, r) => a + r.count, 0); bldReset(core, { arch: d.id, name: d.name }); showToast(n < 60 ? `${d.name}: the ${n} cards most top lists run. Fill the other ${60 - n} from Suggestions.` : `${d.name}: the cards most top lists run, at their usual counts.`); }); }) - 1;
      return `<div class="bld-row" role="button" tabindex="0" onclick="bldSheetActs[${i}]()">${top ? bldThumb(top[0], top[1], top[2]) : ''}<div class="bld-tx"><div class="bld-nm">${esc(d.name)}</div><div class="bld-sub">${d.lists} top lists</div></div></div>`;
    }).join('');
    openSheet(`<div class="modal-title">Start from a meta deck</div><div class="bld-list-pick">${rows}</div><p class="bld-small" style="margin-top:0.6rem">${esc(bldMeta.from || '')}.</p>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet()">Cancel</button></div>`, true);
  });
}
function bldStartMon() {
  bldTab = 'pokemon';
  bldRender();
  const q = document.getElementById('bld-q');
  if (q) { q.focus(); q.scrollIntoView({ block: 'center' }); }
}
function bldStartMine() {
  bldSheetActs = [];
  const rows = state.decks.filter(d => (d.format || 'standard') !== 'prerelease').map(d => {
    const n = (d.cards || []).reduce((a, c) => a + (c.count || 0), 0);
    const i = bldSheetActs.push(() => { closeSheet(); bldConfirmReplace(() => {
      bldReset((d.cards || []).map(c => ({ name: c.name, set: c.set || '', num: c.num || '', count: c.count, section: cardCategory(c) })), { from: d.id, name: d.name });
    }); }) - 1;
    return `<div class="bld-row" role="button" tabindex="0" onclick="bldSheetActs[${i}]()"><div class="bld-tx"><div class="bld-nm">${esc(d.name)}</div><div class="bld-sub">${n} card${n === 1 ? '' : 's'}</div></div></div>`;
  }).join('');
  openSheet(`<div class="modal-title">Start from one of your decks</div><div class="bld-list-pick">${rows || '<p class="bld-small">No saved decks yet.</p>'}</div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet()">Cancel</button></div>`, true);
}
function bldStartPaste() {
  bldSheetActs = [];
  const i = bldSheetActs.push(() => {
    const cards = parseDeckList(document.getElementById('bld-paste').value);
    if (!cards.length) { showToast('No cards could be read. One card per line: count, name, set, number.'); return; }
    closeSheet();
    bldConfirmReplace(() => bldReset(cards.map(c => ({ name: c.name, set: c.set || '', num: c.num || '', count: c.count, section: c.section || cardCategory(c) }))));
  }) - 1;
  openSheet(`<div class="modal-title">Paste a list</div><textarea class="bld-ta" id="bld-paste" placeholder="4 Dreepy TWM 128&#10;4 Drakloak TWM 129&#10;..."></textarea>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet()">Cancel</button><button class="btn btn-primary" onclick="bldSheetActs[${i}]()">Use this list</button></div>`);
}
function bldMenu() {
  bldSheetActs = [];
  const i = bldSheetActs.push(() => { closeSheet(); bldConfirmReplace(() => bldReset([])); }) - 1;
  openSheet(`<div class="modal-title">This list</div>
    <div class="modal-actions" style="flex-direction:column;align-items:stretch">
      <button class="btn" onclick="closeSheet();bldStartMeta()">Start from a meta deck</button>
      <button class="btn" onclick="closeSheet();bldStartMine()"${state.decks.length ? '' : ' disabled'}>Start from one of your decks</button>
      <button class="btn" onclick="closeSheet();bldStartPaste()">Paste a list</button>
      <button class="btn btn-danger" onclick="bldSheetActs[${i}]()"${bldTotal() ? '' : ' disabled'}>Clear the list</button>
      <button class="btn btn-ghost" onclick="closeSheet()">Close</button>
    </div>`);
}

// ── Handing off ──
function bldText() { return deckListText(bld.rows.map(r => ({ ...r, section: bldKind(r) }))); }
async function bldCopy() {
  if (!bldTotal()) { showToast('The list is empty.'); return; }
  try { await navigator.clipboard.writeText(bldText()); showToast('List copied.'); }
  catch (_) { openSheet(`<div class="modal-title">Copy list</div><textarea class="bld-ta" readonly onclick="this.select()">${esc(bldText())}</textarea><div class="modal-actions"><button class="btn btn-primary" onclick="closeSheet()">Close</button></div>`); }
}
function bldDefaultName() {
  if (bld.name) return bld.name;
  const ref = bldRef();
  if (ref && ref.how !== 'close') return ref.d.name;
  const top = bld.rows.filter(r => bldKind(r) === 'pokemon').sort((a, b) => { const ea = bldEntry(a), eb = bldEntry(b); return ((eb && eb.st) || 0) - ((ea && ea.st) || 0) || ((eb && eb.ex) || 0) - ((ea && ea.ex) || 0) || b.count - a.count; })[0];
  return top ? top.name : 'New deck';
}
function bldSaveSheet() {
  const total = bldTotal();
  if (!total) { showToast('Add some cards first.'); return; }
  const from = bld.from && state.decks.find(d => d.id === bld.from);
  const note = total !== 60 ? `<p class="bld-small" style="margin-top:0.6rem">The list has ${total} cards. The grade scores it as it is and says what breaks the rules.</p>` : '';
  openSheet(`<div class="modal-title">${from ? 'Save this list' : 'Save and grade'}</div>
    <label for="bld-name">Deck name</label><input type="text" class="bld-in" id="bld-name" value="${esc(from ? from.name : bldDefaultName())}">${note}
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet()">Cancel</button>
    ${from ? `<button class="btn" onclick="bldSave(false)">Save as new</button><button class="btn btn-primary" onclick="bldSave(true)">Update ${esc(from.name)}</button>` : '<button class="btn btn-primary" onclick="bldSave(false)">Save and grade</button>'}</div>`);
}
/** Save through the same steps as Import (card art, card data), then open the deck's grade. */
async function bldSave(update) {
  const name = (document.getElementById('bld-name') || {}).value || '';
  if (!name.trim()) { showToast('Please enter a deck name.'); return; }
  closeSheet();
  const cards = parseDeckList(bldText());
  showLoading('Preparing deck…');
  const fetched = await Promise.all(cards.map(c => fetchCardImage(c)));
  showLoading('Reading card data…');
  let cov = null;
  try { cov = await enrichDeckCards(fetched); } catch (_) {}
  hideLoading();
  let deck = update && state.decks.find(d => d.id === bld.from);
  if (deck) {
    // 2.5.1: an update does what Edit deck does after a save: the edit log, fresh deals, and the
    // Against the meta check when the list changed.
    const sig = d => (d.cards || []).map(c => c.count + ' ' + c.name).sort().join('|');
    const before = sig(deck);
    try { ensureVersions(deck); } catch (_) {}
    deck.name = name.trim(); deck.cards = fetched; deck.coverage = cov; deck.enrichVer = ENRICH_VER;
    try { recordVersion(deck); } catch (_) {}
    if (sig(deck) !== before) {
      const id = deck.id;
      try { if (typeof handState !== 'undefined' && handState && handState.deckId === id) handState = null; } catch (_) {}
      try { if (typeof gf !== 'undefined' && gf && gf.deckId === id) gf = null; } catch (_) {}
      try { if (typeof resDrill !== 'undefined' && resDrill && resDrill.deckId === id) resDrill = null; } catch (_) {}
      try { if (typeof readDrill !== 'undefined' && readDrill && readDrill.src === 'd:' + id) readDrill = null; } catch (_) {}
      try { const pick = mu60Picks()[id]; if (pick) mu71SetAsk(id, pick); } catch (_) {}
    }
  } else {
    deck = { id: Date.now().toString(), name: name.trim(), cards: fetched, history: [], format: 'standard', coverage: cov, enrichVer: ENRICH_VER };
    try { startVersions(deck, 'import'); } catch (_) {}
    state.decks.push(deck);
  }
  await saveState();
  bld = { rows: [], arch: null, from: null, name: '' };
  bldWrite();
  renderHome();
  openReview(deck.id);
  try { showReviewTab('grade'); } catch (_) {}
  showToast(update ? `"${deck.name}" updated.` : `"${deck.name}" saved.`);
}

// The entry on home, beside Import and Starter decks.
(function () {
  const row = document.querySelector('#screen-home .home-cta-row');
  if (!row || document.getElementById('bld-cta')) return;
  row.classList.add('bld-3');
  row.insertAdjacentHTML('beforeend', '<button class="btn bld-cta" id="bld-cta" onclick="openBuilder()"><svg class="ic"><use href="#i-edit"/></svg>Build a deck</button>');
})();
