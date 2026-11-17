
// ═══════════ v35: rotation marks on the card grid, set codes ═══════════
// Cards expected to rotate get a small caution mark in the deck's card grid,
// with a one line key above the grid. Mega promos (MEP), Scarlet and Violet
// promos (SVP), Black Bolt (BLK) and White Flare (WHT) now map to TCGdex, so
// those printings are read as themselves and not by name from an older card.
(function () {
  const add = { MEP: 'mep', SVP: 'svp', BLK: 'sv10.5b', WHT: 'sv10.5w' };
  try { Object.keys(add).forEach(k => { if (!TD30_SETS[k]) TD30_SETS[k] = add[k]; }); } catch (_) {}
})();

function rot35Key(n) { return r29Key(String(n || '').replace(/\{[a-zA-Z]\}/g, '')); }

function rot35Mark(deck) {
  const body = document.getElementById('review-body');
  if (!body || !deck) return;
  const old = document.getElementById('rot35-key');
  if (old) old.remove();
  const oldOut = document.getElementById('rot35-out-key');
  if (oldOut) oldOut.remove();
  body.querySelectorAll('.rot35').forEach(x => x.remove());
  if (deck.format === 'expanded' || !(deck.cards || []).some(c => c.supertype)) return;
  const rows = r29Rows(deck);
  const risk = new Set(rows.filter(r => r.st === 'risk').map(r => r.key));
  // 3.2.7: a card that is not Standard legal now (an Expanded or older card) keeps its place in the list, with its own mark.
  const out = new Set(rows.filter(r => r.st === 'out').map(r => r.key));
  if (out.size) rot35Out(deck, body, out);
  if (!risk.size) return;
  // The grid shows the API name where there is one, so map both names.
  const shown = new Map();
  (deck.cards || []).forEach(c => {
    const k = r29Key(c.name);
    if (!risk.has(k)) return;
    shown.set(rot35Key(c.apiName || c.name), k); shown.set(rot35Key(c.name), k);
  });
  const N = ROT29.next, when = N.when;
  const label = `${N.announced ? 'Rotates' : 'May rotate'} in ${when}`;
  let n = 0;
  body.querySelectorAll('.review-card').forEach(el => {
    const nm = el.querySelector('.review-card-name'), img = el.querySelector('.review-card-img');
    if (!nm || !img || !shown.has(rot35Key(nm.textContent))) return;
    const q = el.querySelector('.review-card-qty');
    n += q ? (parseInt(q.textContent.replace(/\D/g, ''), 10) || 0) : 0;
    const b = document.createElement('span');
    b.className = 'rot35'; b.setAttribute('role', 'img'); b.setAttribute('aria-label', label); b.title = label;
    b.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-alert"/></svg>';
    img.appendChild(b);
  });
  if (!n) return;
  const key = document.createElement('div');
  key.id = 'rot35-key'; key.className = 'rot35-key';
  key.innerHTML = `<span class="rot35 rot35-in" aria-hidden="true"><svg class="ic"><use href="#i-alert"/></svg></span>
    <span>${n} card${n > 1 ? 's' : ''} ${N.announced ? 'rotate' : 'may rotate'} in ${esc(when)}${N.announced ? '' : ' (not announced yet)'}.</span>`;
  body.insertBefore(key, body.firstChild);
}

const _v34RenderReview = renderReview;
renderReview = function (deck) {
  const r = _v34RenderReview.apply(this, arguments);
  try { rot35Mark(deck); } catch (_) {}
  return r;
};

// After a reprint check, a card may no longer rotate, so the marks are redrawn.
const _v34Reprints = r29CheckReprints;
r29CheckReprints = async function (deck) {
  const r = await _v34Reprints.apply(this, arguments);
  try {
    const body = document.getElementById('review-body');
    if (deck && state.activeDeckId === deck.id && body && body.style.display !== 'none') rot35Mark(deck);
  } catch (_) {}
  return r;
};

/** 3.2.7: marks the cards in a Standard deck that are not Standard legal now, with a key above the grid. */
function rot35Out(deck, body, out) {
  const shown = new Map();
  (deck.cards || []).forEach(c => {
    const k = r29Key(c.name);
    if (!out.has(k)) return;
    shown.set(rot35Key(c.apiName || c.name), k); shown.set(rot35Key(c.name), k);
  });
  const label = 'Not legal in Standard now';
  let n = 0;
  body.querySelectorAll('.review-card').forEach(el => {
    const nm = el.querySelector('.review-card-name'), img = el.querySelector('.review-card-img');
    if (!nm || !img || !shown.has(rot35Key(nm.textContent))) return;
    const q = el.querySelector('.review-card-qty');
    n += q ? (parseInt(q.textContent.replace(/\D/g, ''), 10) || 0) : 0;
    const b = document.createElement('span');
    b.className = 'rot35 rot35-out'; b.setAttribute('role', 'img'); b.setAttribute('aria-label', label); b.title = label;
    b.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-alert"/></svg>';
    img.appendChild(b);
  });
  if (!n) return;
  const key = document.createElement('div');
  key.id = 'rot35-out-key'; key.className = 'rot35-key';
  key.innerHTML = `<span class="rot35 rot35-in rot35-out" aria-hidden="true"><svg class="ic"><use href="#i-alert"/></svg></span>
    <span>${n} card${n > 1 ? 's are' : ' is'} not legal in Standard now. ${n > 1 ? 'They stay' : 'It stays'} in the list, and the grade counts ${n > 1 ? 'them' : 'it'} as not legal.</span>`;
  body.insertBefore(key, body.firstChild);
}
