
// ═══════════ 2.6.2: Main attacker pick ═══════════
// The player says which Pokemon the deck attacks with, or that it is a toolbox deck that picks
// its attacker each turn. Auto is the grade's own read of the cards. Saved with the deck (deck.atk).
function atk62Set(v) {
  const deck = state.decks.find(d => d.id === state.activeDeckId);
  if (!deck) return;
  if (v) deck.atk = String(v).slice(0, 80); else delete deck.atk;
  try { saveState(); } catch (_) {}
  renderGrade();
  const s = document.getElementById('atk62-sec');
  if (s && s.scrollIntoView) s.scrollIntoView({ block: 'nearest' });
}
function atk62Section(deck, R) {
  if (!R || !R.via || !R.entries) return '';
  const opts = gAtkOptions(R.entries, R.via.reach);
  // A Pokemon set before, still in the list but no longer offered (it now evolves into something), stays in the menu.
  if (R.via.pick && R.via.pick !== 'toolbox' && !opts.some(x => x.key === R.via.pick) && R.via.main) opts.push({ key: R.via.main.key, name: R.via.main.name });
  if (!opts.length) return '';
  const auto = R.via.auto, cur = R.via.pick || '';
  const gone = typeof deck.atk === 'string' && deck.atk && !cur;
  const o = (v, t) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(t)}</option>`;
  const sel = o('', auto ? `Auto: ${gCap(auto.name)}` : 'Auto') + opts.map(x => o(x.key, gCap(x.name))).join('') + o('toolbox', 'Toolbox: several attackers');
  const say = cur === 'toolbox' ? 'Set as a toolbox deck, so the plan names each attacker. The grade still counts only the hits the cards can make.'
    : cur ? 'The plan, upgrades and draw odds are built around the attacker you set. Auto is what the grade reads from the cards.'
    : 'The Pokemon the plan, upgrades and draw odds are built around. Auto reads it from the cards; set it if your deck attacks with something else, or picks its attacker each turn.';
  return `<div class="g-sec" id="atk62-sec"><div class="g-sec-t">Main attacker</div>
    <div class="g-sec-i">${say}</div>
    <select class="x-select" aria-label="Main attacker" onchange="atk62Set(this.value)">${sel}</select>
    ${gone ? '<p class="mu60-p">The Pokemon you set is no longer in the list, so the grade is back on Auto.</p>' : ''}</div>`;
}
