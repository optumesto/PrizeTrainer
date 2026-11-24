// ═══════════ v82: copy a deck's list for Pokemon TCG Live ═══════════
// A row in the deck menu (on home and on the deck page) copies the list the way TCG Live's own
// Export writes it, so it pastes straight into TCG Live's deck import:
//
//   Pokémon: 1
//   4 Iron Thorns ex TWM 77
//
//   Trainer: 24
//   1 AZ's Tranquility CRI 76
//   ...
//
//   Energy: 4
//   2 Mist Energy TEF 161
//   5 Basic {L} Energy MEE 12
//   4 Voltaic {L} Energy PBL 84
//   ...
//
//   Total Cards: 60
//
// TCG Live counts the lines under each header, not the cards ("Pokémon: 1" over 4 Iron Thorns ex), and
// spells Energy types as symbols. Card names stay English in every language, as TCG Live's import
// reads them. Each card keeps its own set and number; a card saved without one gets the printing winning
// lists run (meta-cards.json) or cards.json's (Standard legal, so TCG Live has it), and a Basic Energy MEE's.
// deckListText (core.js) stays as it is: decks are matched by its text.

const TL82_SYM = { Grass: 'G', Fire: 'R', Water: 'W', Lightning: 'L', Psychic: 'P', Fighting: 'F', Darkness: 'D', Metal: 'M', Fairy: 'Y' };
// TCG Live's numbers for its Basic Energy set (MEE), as in the starter decks.
const TL82_MEE = { Grass: 9, Fire: 10, Water: 11, Lightning: 12, Psychic: 13, Fighting: 14, Darkness: 15, Metal: 16 };
// The promo set codes as TCG Live writes them (ptCanonSet reads them back).
const TL82_SET = { SVP: 'PR-SV', MEP: 'PR-ME' };
let tl82Prints = null, tl82Load = null;

/** A printing for each card name, loaded once: the one winning lists run most (meta-cards.json, read from
 *  Limitless, where lists are TCG Live exports), else cards.json's. Resolves even offline. */
function tl82Data() {
  if (tl82Prints) return Promise.resolve(tl82Prints);
  if (tl82Load) return tl82Load;
  const get = f => fetch(f).then(r => (r.ok ? r.json() : null)).catch(() => null);
  tl82Load = Promise.all([get('meta-cards.json'), get('cards.json')]).then(([mc, cj]) => {
    const m = new Map(), runs = new Map();
    (mc && Array.isArray(mc.decks) ? mc.decks : []).forEach(dk => (Array.isArray(dk.cards) ? dk.cards : []).forEach(r => {
      if (!Array.isArray(r) || !r[0] || !r[1] || !r[2]) return;
      const k = ptCanonName(r[0]).toLowerCase(), n = (dk.lists || 1) * (r[6] || 1), by = runs.get(k) || new Map(), id = r[1] + ' ' + r[2];
      by.set(id, (by.get(id) || 0) + n); runs.set(k, by);
    }));
    runs.forEach((by, k) => { const id = [...by.entries()].sort((a, b) => b[1] - a[1])[0][0].split(' '); m.set(k, { set: id[0], num: id[1] }); });
    (cj && Array.isArray(cj.cards) ? cj.cards : []).forEach(c => {
      if (c && c.n && c.s && c.no) { const k = ptCanonName(c.n).toLowerCase(); if (!m.has(k)) m.set(k, { set: c.s, num: String(c.no) }); }
    });
    if (m.size) tl82Prints = m; else tl82Load = null;   // try again next time
    return tl82Prints;
  });
  return tl82Load;
}
const tl82Missing = deck => (deck.cards || []).some(c => c && c.count > 0 && !(c.set && c.num));

/** One card's line, as TCG Live writes it. */
function tl82Line(c, cat) {
  let name = String(c.name || '').trim(), set = String(c.set || '').trim(), num = String(c.num || '').trim();
  const basic = cat === 'energy' && name.match(/^(Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal|Fairy) Energy$/);
  if (basic) name = 'Basic {' + TL82_SYM[basic[1]] + '} Energy';
  else if (cat === 'energy') name = name.replace(/ (Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal) Energy$/, (m, t) => ' {' + TL82_SYM[t] + '} Energy');
  if (!(set && num)) {
    if (basic && TL82_MEE[basic[1]]) { set = 'MEE'; num = String(TL82_MEE[basic[1]]); }
    else {
      const p = tl82Prints && tl82Prints.get(ptCanonName(c.name).toLowerCase());
      if (p) { set = p.set; num = p.num; }
    }
  }
  set = TL82_SET[set.toUpperCase()] || set;
  if (/^\d+$/.test(num)) num = String(parseInt(num, 10));
  return [c.count, name].concat(set && num ? [set, num] : []).join(' ');
}

/** The whole list in TCG Live's format. */
function tl82Text(deck) {
  const groups = { pokemon: [], trainer: [], energy: [] };
  (deck.cards || []).forEach(c => { if (c && c.count > 0) groups[cardCategory(c)].push(c); });
  const label = { pokemon: 'Pokémon', trainer: 'Trainer', energy: 'Energy' };
  const parts = Object.keys(groups).filter(k => groups[k].length)
    .map(k => label[k] + ': ' + groups[k].length + '\n' + groups[k].map(c => tl82Line(c, k)).join('\n'));
  const total = (deck.cards || []).reduce((a, c) => a + (c && c.count > 0 ? c.count : 0), 0);
  return parts.concat('Total Cards: ' + total).join('\n\n');
}

/** Copy on the tap. Where the browser blocks the clipboard, show the list to copy by hand. */
async function tl82Copy(id) {
  closeSheet();
  const deck = dd65Find(id);
  if (!deck || !(deck.cards || []).length) return;
  if (tl82Missing(deck) && !tl82Prints) await tl82Data();
  const text = tl82Text(deck);
  let done = false;
  try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); done = true; } } catch (_) {}
  if (!done) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.appendChild(ta); ta.select(); done = document.execCommand('copy'); ta.remove();
    } catch (_) {}
  }
  if (done) { showToast("List copied. Paste it into TCG Live's deck import."); return; }
  openSheet(`<div class="modal-title">Copy List for TCG Live</div>
    <p class="st38-p">Your browser blocked the copy. Press and hold the list, choose Select all, then Copy.</p>
    <textarea class="bld-ta" readonly onclick="this.select()" data-no-tr>${esc(text)}</textarea>
    <div class="modal-actions"><button class="btn btn-primary" onclick="closeSheet()">Close</button></div>`);
}
