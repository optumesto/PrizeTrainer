// ═══════════ 3.2.7: starter decks work offline ═══════════
// A starter deck needs card data (HP, attacks, Abilities) from the card databases before it can be
// graded. Offline those reads failed, so a starter deck loaded with no signal came in with no card
// data and a grade far off until it was opened again online.
// Now the card data each starter deck reads is saved on this device (IndexedDB, key rd_starter_data),
// and a starter deck loaded offline is built from that saved copy: the same cards, the same data and
// so the same grade as online. The copy is saved whenever a starter deck is read online, and while
// online the app reads the starter decks it has no copy of yet in the background, one at a time
// (never on a data saver connection). A copy only counts for the exact list it was read for and for
// this version of the card reader (ENRICH_VER); the weekly new lists are read again once.
// Offline with no saved copy, the deck is not added half read: a short message says it loads once
// the device is back online. A list pasted offline is held the same way, and stays in the box.
// Online, nothing changes: a starter deck is read fresh, as before. Nothing here changes a grade.

const OS325_KEY = 'rd_starter_data';
let _os325 = null;          // { v, lists: { [list key]: { at, cards, cov } } }
let _os325Ready = null;     // resolves once the saved copy is read

/** One line per card, in list order: the exact list a saved copy belongs to. */
function os325Key(cards) {
  return (cards || []).map(c => [c.count || 0, c.name || '', c.set || '', c.num || ''].join('|')).join('\n');
}
function os325Load() {
  if (_os325Ready) return _os325Ready;
  _os325Ready = (async () => {
    let raw = null;
    try { raw = typeof idbGet === 'function' ? await idbGet(OS325_KEY) : null; } catch (_) {}
    let o = null;
    try { o = raw ? JSON.parse(raw) : null; } catch (_) {}
    _os325 = o && o.v === ENRICH_VER && o.lists && typeof o.lists === 'object' ? o : { v: ENRICH_VER, lists: {} };
    return _os325;
  })();
  return _os325Ready;
}
/** The list keys of today's starter decks. */
function os325StarterKeys() {
  const keys = new Map();
  (typeof STARTER_DECKS !== 'undefined' ? STARTER_DECKS : []).forEach(s => {
    try { keys.set(os325Key(parseDeckList(s.list)), s.id); } catch (_) {}
  });
  return keys;
}
function os325Save() {
  if (!_os325) return;
  // Drop lists that are no longer starter decks once they are three weeks old, so old weekly lists
  // never pile up (and the built-in lists shown for a moment before this week's arrive are not lost).
  const live = os325StarterKeys(), old = Date.now() - 21 * 864e5;
  Object.keys(_os325.lists).forEach(k => { if (!live.has(k) && !(_os325.lists[k].at > old)) delete _os325.lists[k]; });
  try { if (typeof idbSet === 'function') idbSet(OS325_KEY, JSON.stringify(_os325)); } catch (_) {}
}
const os325Offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
/** True when this starter deck can load with no signal. */
function os325Has(s) {
  try { return !!(_os325 && _os325.lists[os325Key(parseDeckList(s.list))]); } catch (_) { return false; }
}

// Card data reads go through enrichDeckCards. A starter deck's list read online is saved; offline,
// a list with a saved copy gets that copy and nothing is asked of the network.
let _os325Prewarm = false;
(function () {
  if (typeof enrichDeckCards !== 'function') return;
  const _e = enrichDeckCards;
  enrichDeckCards = async function (cards) {
    const key = Array.isArray(cards) && cards.length ? os325Key(cards) : '';
    const starter = key && os325StarterKeys().has(key);
    if (starter && os325Offline()) {
      await os325Load();
      const hit = _os325.lists[key];
      if (hit && Array.isArray(hit.cards) && hit.cards.length === cards.length) {
        cards.forEach((c, i) => {
          const keep = { imageUrl: c.imageUrl, fallbackUrls: c.fallbackUrls };
          Object.assign(c, JSON.parse(JSON.stringify(hit.cards[i])), keep);
        });
        return Object.assign({}, hit.cov);
      }
    }
    const cov = await _e.apply(this, arguments);
    if (starter && cov && !cov.partial && cov.total && cov.resolved) {
      await os325Load();
      const copy = cards.map(c => { const x = JSON.parse(JSON.stringify(c)); delete x.imageUrl; delete x.fallbackUrls; return x; });
      _os325.lists[key] = { at: Date.now(), cards: copy, cov: Object.assign({}, cov) };
      os325Save();
    }
    return cov;
  };
})();

// Offline with no saved copy: say so, and add nothing.
(function () {
  if (typeof loadStarterDeck !== 'function') return;
  const _l = loadStarterDeck;
  loadStarterDeck = async function (id) {
    const s = (typeof STARTER_DECKS !== 'undefined' ? STARTER_DECKS : []).find(x => x.id === id);
    if (s && os325Offline() && !state.decks.some(d => d.starter === id)) {
      await os325Load();
      if (!os325Has(s)) {
        try { closeSheet(); } catch (_) {}
        showToast("You're offline. This starter deck loads once you're back online.");
        return;
      }
    }
    return _l.apply(this, arguments);
  };
})();

// Offline, a pasted list (not a starter deck with a saved copy) would come in with no card data and a
// grade near 0. Say so instead, and leave the list in the box so it can be imported once back online.
(function () {
  if (typeof importDeck !== 'function') return;
  const _i = importDeck;
  importDeck = async function () {
    if (os325Offline()) {
      const t = document.getElementById('import-list');
      let ok = false;
      try {
        const key = os325Key(parseDeckList((t && t.value) || ''));
        if (key && os325StarterKeys().has(key)) { await os325Load(); ok = !!_os325.lists[key]; }
      } catch (_) {}
      if (!ok) {
        showToast("You're offline. Card data loads once you're back online, so your list stays here until then.");
        return;
      }
    }
    return _i.apply(this, arguments);
  };
})();

// While online, read the starter decks that have no saved copy yet, one at a time, in the background.
async function os325Warm() {
  if (_os325Prewarm || os325Offline()) return;
  try { const cn = navigator.connection; if (cn && cn.saveData) return; } catch (_) {}
  if (typeof STARTER_DECKS === 'undefined' || !STARTER_DECKS.length) return;
  _os325Prewarm = true;
  try {
    await os325Load();
    for (const s of STARTER_DECKS.slice()) {
      if (os325Offline()) break;
      if (os325Has(s)) continue;
      let cards = [];
      try { cards = await Promise.all(parseDeckList(s.list).map(c => fetchCardImage(c))); } catch (_) { continue; }
      if (!cards.length) continue;
      try { await enrichDeckCards(cards); } catch (_) {}
      await new Promise(r => setTimeout(r, 2000));   // gentle on the card databases
    }
  } finally { _os325Prewarm = false; }
}
(function () {
  if (typeof window === 'undefined') return;
  os325Load();
  const later = () => setTimeout(() => {
    if (document.visibilityState === 'hidden') return;
    os325Warm();
  }, 20000);
  if (document.readyState === 'complete') later(); else window.addEventListener('load', later);
  window.addEventListener('online', () => setTimeout(os325Warm, 5000));
})();
