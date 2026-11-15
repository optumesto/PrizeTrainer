
// ═══════════ v33: the Daily Challenge shows its full list before the game ═══════════
// Players review all 60 cards first, with art, then tap Start. The clock
// starts with the game, not while the list is open.
const _v32StartDaily = startDaily;
startDaily = async function () {
  _dailyViewKey = dailyKey();
  const d = dailyDeck();
  if (!d._img) { d.cards = await Promise.all(d.cards.map(c => fetchCardImage(c))); d._img = true; }
  openDailyList();
};
function dailyBegin() { return _v32StartDaily(); }
function dly33Groups(cards) {
  const g = { pokemon: [], trainer: [], energy: [] };
  (cards || []).forEach(c => g[cardCategory(c)].push(c));
  return [['pokemon', 'Pokémon'], ['trainer', 'Trainers'], ['energy', 'Energy']]
    .map(([key, label]) => ({ key, label, cards: g[key], n: g[key].reduce((a, c) => a + c.count, 0) }))
    .filter(x => x.cards.length);
}
function dly33Card(c) {
  const nm = esc(cn23(c.apiName || c.name));
  const img = c.imageUrl
    ? `<img src="${esc(c.imageUrl)}" alt="${nm}" loading="lazy" data-fallbacks="${esc(JSON.stringify(c.fallbackUrls || []))}" data-fallback-idx="0" onerror="reviewImgError(this)">`
    : `<div class="review-placeholder"><i class=ph-card></i></div>`;
  return `<div class="review-card"><div class="review-card-img">${img}<div class="review-card-qty${c.count > 1 ? ' multi' : ''}">×${c.count}</div></div><div class="review-card-name">${nm}</div></div>`;
}
function openDailyList() {
  const d = dailyDeck();
  const r = dailyStore().results[dailyKey()];
  const groups = dly33Groups(d.cards);
  const total = groups.reduce((a, g) => a + g.n, 0);
  openSheet(`<div class="modal-title">Today's deck: ${esc(dailyName())}</div>
    <div class="modal-hint dly33-hint">Review all ${total} cards, then tap Start. The clock starts with the game. ${r ? 'This is a practice replay, your score for today is already in.' : 'Your first try is your score.'}</div>
    <div class="dly33-list" id="dly33-list">
      ${groups.map(g => `<div class="review-group"><div class="review-group-title ${g.key}"><span class="rg-dot"></span>${g.label}<span class="rg-count">${g.n}</span></div>
        <div class="review-cards">${g.cards.map(dly33Card).join('')}</div></div>`).join('')}
    </div>
    <div class="modal-actions dly33-actions"><button class="btn btn-ghost" onclick="closeSheet()">Not now</button><button class="btn btn-primary" id="dly33-start" onclick="dailyBegin()">${ic23('play')}Start</button></div>`, true);
}
