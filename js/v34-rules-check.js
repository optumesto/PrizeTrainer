
// ═══════════ v34: deck rules check, Delta Reign set code ═══════════
// The grade scored decks without checking the deck building rules, so a list
// with 5 Arven, 2 ACE SPEC cards or 59 cards graded like a legal one. The grade
// now opens with a short box naming each rule the list breaks. The score itself
// is unchanged. Rules: exactly 60 cards, at most 4 cards with the same name
// (Basic Energy excepted), at most 1 ACE SPEC, at most 1 Radiant Pokémon, and at
// least 1 Basic Pokémon.
(function () {
  // Delta Reign (DLR), out 6 Nov 2026. TCGdex numbers Mega Evolution sets me01,
  // me02 and so on, so me06 is the expected id (not checked from here: TCGdex
  // refuses automated reads). A wrong id only means the card is read by name.
  try { if (!TCGEnrich.SET_MAP.DLR) TCGEnrich.SET_MAP.DLR = 'me6'; } catch (_) {}
  try { if (!TD30_SETS.DLR) TD30_SETS.DLR = 'me06'; } catch (_) {}
})();

function rules34IsBasicEnergy(c) {
  const n = String(c.name || '').trim();
  if (R29_BASIC_E.test(n)) return true;
  return String(c.supertype || '').toLowerCase() === 'energy' && c.stage === 'basic' && /energy$/i.test(n) && !/special/i.test(n);
}

/** Same name test: case, accents, curly apostrophes and spacing ignored. */
function rules34Key(n) {
  return String(n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim();
}

/** Each deck building rule the list breaks, as plain sentences. */
function rules34Breaches(deck) {
  const cards = (deck && deck.cards) || [];
  const out = [];
  const total = cards.reduce((a, c) => a + (c.count || 0), 0);
  if (total !== 60) out.push(`${total} cards in the list. A Standard deck is exactly 60.`);
  const byName = new Map();
  cards.forEach(c => {
    if (rules34IsBasicEnergy(c)) return;
    const k = rules34Key(c.name);
    const r = byName.get(k) || { name: c.name, n: 0 };
    r.n += c.count || 0; byName.set(k, r);
  });
  byName.forEach(r => { if (r.n > 4) out.push(`${r.n} ${r.name}. The most allowed is 4 cards with the same name.`); });
  const ace = cards.filter(c => c.ace).reduce((a, c) => a + (c.count || 0), 0);
  if (ace > 1) out.push(`${ace} ACE SPEC cards (${cards.filter(c => c.ace).map(c => c.name).join(', ')}). Only 1 is allowed.`);
  const rad = cards.filter(c => /^radiant /i.test(String(c.name || ''))).reduce((a, c) => a + (c.count || 0), 0);
  if (rad > 1) out.push(`${rad} Radiant Pokémon. Only 1 is allowed.`);
  const mons = cards.filter(c => cardCategory(c) === 'pokemon');
  const known = mons.length && mons.every(c => c.resolved && c.stage);
  if (known && !mons.some(c => c.stage === 'basic')) out.push('No Basic Pokémon, so the game cannot start.');
  if (!mons.length && total) out.push('No Pokémon at all, so the game cannot start.');
  return out;
}

const _v33RenderGrade = renderGrade;
renderGrade = function () {
  const r = _v33RenderGrade.apply(this, arguments);
  try {
    const deck = findDeck(state.activeDeckId);
    const body = document.getElementById('grade-body');
    const old = document.getElementById('rules34');
    if (old) old.remove();
    const list = rules34Breaches(deck);
    if (body && list.length) {
      const box = document.createElement('div');
      box.id = 'rules34'; box.className = 'rules34'; box.setAttribute('role', 'note');
      box.innerHTML = `<div class="rules34-t">Not tournament legal yet</div><ul>${list.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
        <div class="rules34-s">The grade below scores the list as entered. Fix these in <b>Edit deck</b> before an event.</div>`;
      body.insertBefore(box, body.firstChild);
    }
  } catch (_) {}
  return r;
};
