// Sparring with your own saved decks (opponent/play.html). Hidden until play.js turns OWN_ON on.
//
// The app keeps saved decks in localStorage (ptcg_prize_trainer_v2, IndexedDB as a backup), each card
// with the text RdyDeck read for it (js/core.js, after TCGEnrich). This file turns one saved deck into
// 60 engine cards (puzzle/engine.js cardFromApi records) and says which cards a game can't fully play.
//
// Where a card's record comes from:
//   1. Sparring's own card file (opponent/decks.js, every card of the meta tournament lists), when the
//      name matches and, for a Pokemon, its attacks have the same names (so another printing isn't swapped in).
//   2. Otherwise the text the deck saved. Saved decks keep the Weakness type but no Resistance, so these
//      Pokemon play with none (marked resUnknown, as the engine already knows how to report).
// A card with no saved card data at all can't be played (we can't know whether it is even a Pokemon), so
// the deck is held back with that reason. Anything else plays: what the engine can't read is listed.
(function (root) {
'use strict';
const E = root.RdyPuzzle && root.RdyPuzzle.internals ? root.RdyPuzzle : require('../puzzle/engine.js');
const STORAGE_KEY = 'ptcg_prize_trainer_v2';
const TYPES = /^(grass|fire|water|lightning|psychic|fighting|darkness|metal|fairy|dragon|colorless)$/;
const low = a => (Array.isArray(a) ? a : []).map(x => String(x).toLowerCase());

/** Saved decks: localStorage first (the app's main store), IndexedDB when that is empty. */
function readSaved() {
  let p = null;
  try { const raw = root.localStorage && root.localStorage.getItem(STORAGE_KEY); if (raw) p = JSON.parse(raw); } catch (_) { p = null; }
  if (p && Array.isArray(p.decks)) return Promise.resolve(p);
  return new Promise(res => {
    try {
      const req = root.indexedDB.open('ptcg_db', 1);
      req.onupgradeneeded = e => { try { e.target.result.createObjectStore('kv'); } catch (_) {} };
      req.onerror = () => res(null);
      req.onsuccess = e => {
        try {
          const g = e.target.result.transaction('kv', 'readonly').objectStore('kv').get(STORAGE_KEY);
          g.onsuccess = () => { try { res(g.result ? JSON.parse(g.result) : null); } catch (_) { res(null); } };
          g.onerror = () => res(null);
        } catch (_) { res(null); }
      };
      setTimeout(() => res(null), 1500);
    } catch (_) { res(null); }
  }).then(x => x && Array.isArray(x.decks) ? x : null);
}
function load() { return readSaved().then(p => p ? p.decks.filter(d => d && Array.isArray(d.cards)) : []); }

// The printed damage. Since 3.4 a saved attack keeps its printed damage (pd) and its text; pd is left out when
// nothing is printed ("Place 2 damage counters..."), so then there is none. Older saves have neither, so the read number stands.
function printed(a) {
  if (a.pd != null) return String(a.pd);
  if (typeof a.text === 'string') return '';
  return a.dmg ? String(a.dmg) : '';
}
const words = t => String(t || '').replace(/\s+/g, ' ').trim();
/** One saved card (js/core.js shape) as an engine card record, or null when the deck has no data for it. */
function fromSaved(c) {
  const sup = String(c.supertype || '').toLowerCase();
  const cat = /^pok/.test(sup) ? 'pokemon' : sup === 'trainer' ? 'trainer' : sup === 'energy' ? 'energy' : null;
  if (!cat) return null;
  const sub = low(c.sub || c.subtypes);
  const out = { key: c.name, name: c.name, cat, sub, types: low(c.types), own: true };
  if (c.img || c.image) out.img = c.img || c.image;
  // Its printing, so Sparring can show the card's picture (opponent/play.js cardArt).
  if (c.set && c.num) { out.set = String(c.set); out.num = String(c.num); }
  if (cat === 'pokemon') {
    const stage = c.stage === 'stage1' || c.stage === 'stage2' ? c.stage : c.evolvesFrom ? 'stage1' : 'basic';
    const w = typeof c.weak === 'string' ? c.weak.toLowerCase() : c.weak && c.weak.type ? String(c.weak.type).toLowerCase() : '';
    Object.assign(out, {
      hp: +c.hp || 0, stage, from: c.evolvesFrom || null,
      p: +c.prizeValue || (sub.includes('mega') ? 3 : sub.includes('ex') || sub.includes('v') ? 2 : 1),
      // A card with no Retreat Cost printed has none (the card data leaves the field out), as cardFromApi reads it.
      retreat: c.retreat != null && isFinite(+c.retreat) ? +c.retreat : 0,
      // Every card in today's sets doubles its Weakness; saved decks keep only the type.
      weak: TYPES.test(w) ? { type: w, x: 2 } : null,
      res: null, resUnknown: true,
      attacks: (c.attacks || []).map(a => ({ name: a.name || '', cost: low(a.cost).filter(x => x !== 'free'),
        dmg: printed(a), text: a.text || '' })),
      abil: Array.isArray(c.atext) ? c.atext.map(a => [a[0], a[1]]) : (c.abilities || []).filter(a => a && a.name && a.text).map(a => [a.name, a.text]),
    });
    if (c.base) out.base = c.base;
  } else if (cat === 'trainer') {
    out.kind = c.ttype || (sub.includes('supporter') ? 'supporter' : sub.includes('stadium') ? 'stadium' : sub.some(x => /tool/.test(x)) ? 'tool' : 'item');
    out.rtext = words(c.rtext);
    out.ace = !!c.ace || sub.includes('ace spec');
  } else {
    out.rtext = words(c.etext);
  }
  return out;
}

/** The Sparring card to use for a saved card: the tournament record when it is the same card. */
function pick(c, known) {
  const k = known && known[c.name];
  if (k) {
    if (k.cat !== 'pokemon') return k;
    const mine = (c.attacks || []).map(a => a.name).join('|'), theirs = (k.attacks || []).map(a => a.name).join('|');
    if (!c.attacks || !c.attacks.length || mine === theirs) return k;
  }
  return fromSaved(c);
}

/**
 * A saved deck ready for Sparring:
 * { id, name, own: true, cards: [60 engine cards] | null, block: reason it can't play | '', plain: [what doesn't fully play], colorless: [Energy played as Colorless] }
 * known: Sparring's card records by name (RdyOppDecks.cards).
 */
function build(d, known) {
  const out = { id: d.id, name: String(d.name || 'My deck'), own: true, cards: null, block: '', plain: [], colorless: [], n: 0 };
  const rows = (d.cards || []).filter(c => c && c.count > 0 && c.name);
  const by = new Map();
  rows.forEach(c => { const g = by.get(c.name); if (g) g.n += +c.count || 0; else by.set(c.name, { c, n: +c.count || 0 }); });
  out.n = [...by.values()].reduce((a, g) => a + g.n, 0);
  if (out.n !== 60) { out.block = 'count'; return out; }
  const recs = new Map(), missing = [];
  by.forEach((g, name) => { const r = pick(g.c, known); if (r) recs.set(name, r); else missing.push(name); });
  if (missing.length) { out.block = 'data'; out.missing = missing; return out; }
  // The Basic behind a Stage 2, for Rare Candy, from the deck's own Stage 1 or the tournament records.
  recs.forEach((r, name) => {
    if (r.cat !== 'pokemon' || r.stage !== 'stage2' || r.base || !r.from) return;
    const s1 = recs.get(r.from) || (known && known[r.from]);
    if (s1 && s1.from) recs.set(name, Object.assign({}, r, { base: s1.from }));
  });
  if (![...recs.values()].some(r => r.cat === 'pokemon' && r.stage === 'basic')) { out.block = 'basic'; return out; }
  // What a game can't fully play, the same check the coverage test uses (opponent/test/coverage.mjs).
  const was = E.internals && E.internals.setReal;
  if (was) E.internals.setReal(true);
  const s = { real: true, turn: 2, cur: 0, first: false, stadium: null, mods: {}, players: [{ active: null, bench: [], hand: [], deck: [], discard: [], prizes: [], used: {}, lim: {} }, { active: null, bench: [], hand: [], deck: [], discard: [], prizes: [], used: {}, lim: {} }], unread: [], log: [] };
  const plain = new Set();
  recs.forEach((r, name) => {
    let bad = [];
    try { bad = E.cardProblems(s, { card: r, uid: -1 }, true); } catch (_) { bad = [name]; }
    // 3.4.9: a Special Energy whose type is read but whose extra text isn't (Mist, Legacy...) still pays as its own
    // type, so it goes in the "not in full" list; only Energy whose type can't be read plays as 1 Colorless.
    if (r.cat === 'energy' && bad.length && E.internals.provides && E.internals.provides({ card: r, uid: -1 })) { plain.add(name); return; }
    if (r.cat === 'energy' && bad.length) { out.colorless.push(name); recs.set(name, Object.assign({}, r, { plainEnergy: true })); return; }
    if (r.cat === 'pokemon') (r.attacks || []).forEach(a => { const R = E.readAttack(a); if (R && R.partial) bad.push(name + ': ' + a.name); });
    if (bad.length) plain.add(name);
  });
  out.plain = [...plain].sort();
  out.cards = [];
  by.forEach((g, name) => { const r = recs.get(name); for (let i = 0; i < g.n; i++) out.cards.push(r); });
  return out;
}

// Special Energy the engine can't read plays as 1 Colorless Energy, so it still pays for attacks.
if (E.HOOKS && E.HOOKS.provides) E.HOOKS.provides.push(ref => ref.card && ref.card.plainEnergy ? ['colorless'] : null);

const api = { load, readSaved, fromSaved, pick, build, STORAGE_KEY };
root.RdyOwn = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
