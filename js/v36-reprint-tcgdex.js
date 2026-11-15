
// ═══════════ v36: reprint check asks TCGdex too ═══════════
// pokemontcg.io no longer adds new sets, so a "no later printing" answer from it
// is not proof (it missed Pokégear 3.0 in Black Bolt, an I mark printing).
// Every card it leaves rotating or not legal is checked again on TCGdex,
// and the later mark of the two answers wins.
ROT29.v = 2;   // drops reprint answers saved before v36
const _r36Tried = new Set();
const _v35Reprints = r29CheckReprints;
r29CheckReprints = async function (deck) {
  const out = await _v35Reprints.apply(this, arguments);
  if (!deck || _r36Tried.has(deck.id)) return out;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return out;
  const names = deck.rot29 && deck.rot29.v === ROT29.v && deck.rot29.names;
  if (!names) return out;
  const todo = r29Rows(deck).filter(r => (r.st === 'out' || r.st === 'risk') && names[r.key] && !names[r.key].td);
  if (!todo.length) return out;
  _r36Tried.add(deck.id);
  let td = {};
  try { td = await r31TdReprints(todo); } catch (_) { return out; }
  let changed = false;
  todo.forEach(r => {
    const t = td[r.key];
    if (!t) return;                       // TCGdex had no answer, so the first answer stands
    const a = r29M(names[r.key].best), b = r29M(t.best);
    names[r.key] = { best: b && (!a || b > a) ? b : a, td: true };
    changed = true;
  });
  if (!changed) return out;
  try { await saveState(); } catch (_) {}
  try {
    if (document.getElementById('screen-home').classList.contains('active')) renderHome();
    const pane = document.getElementById('grade-body');
    if (state.activeDeckId === deck.id && pane && pane.style.display !== 'none' &&
        document.getElementById('screen-review').classList.contains('active')) renderGrade();
    const body = document.getElementById('review-body');
    if (state.activeDeckId === deck.id && body && body.style.display !== 'none') rot35Mark(deck);
  } catch (_) {}
  return out;
};
