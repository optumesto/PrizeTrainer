// ═══════════ 3.1: Creator kit ═══════════
// From Share grade, a creator can copy three things for a deck:
//  1. An OBS browser source: the app opened with ?overlay=1, which shows only a grade card on a
//     see-through background. It grades the list in the link each time it loads, the same way the
//     Grade tab does, so the card follows the newest tournament results.
//  2. An embed for a website: the same card with ?overlay=1&embed=1, which links to the full grade.
//  3. A line for a video description with the grade and the link.
// The card carries the RdyDeck name and never shows an ad. Nothing it reads is saved as a deck.

const CK31 = (() => {
  try {
    const q = new URLSearchParams(location.search);
    return q.get('overlay') === '1' ? { embed: q.get('embed') === '1', hash: location.hash || '' } : null;
  } catch (_) { return null; }
})();

if (CK31) {
  document.documentElement.classList.add('ck31-ov');
  // The deck in the link is shown, not imported, and no ad loads on the card.
  try { handleShareHash = async function () {}; } catch (_) {}
  try { handleDailyHash = function () {}; } catch (_) {}
  try { if (typeof ads32Load === 'function') ads32Load = function () {}; } catch (_) {}
  try { if (typeof ads32Make === 'function') ads32Make = function () {}; } catch (_) {}
  document.addEventListener('DOMContentLoaded', () => { ck31Run(); });
}

/** The deck and Main attacker pick in a #deck=CODE&a=NAME hash. */
function ck31Hash(h) {
  const m = /^#deck=([^&]*)/.exec(h || '');
  if (!m) return null;
  let code = '', atk = '';
  try { code = decodeURIComponent(m[1]); } catch (_) {}
  const a = /&a=([^&]*)/.exec(h);
  try { atk = a ? decodeURIComponent(a[1]).slice(0, 80) : ''; } catch (_) {}
  return { code, atk };
}

function ck31Box(html) {
  let el = document.getElementById('ck31');
  if (!el) { el = document.createElement('div'); el.id = 'ck31'; document.body.appendChild(el); }
  el.innerHTML = html;
  return el;
}
const ck31Msg = t => ck31Box(`<div class="ck31-card msg"><div class="ck31-brand"><span>Rdy</span>Deck</div><p>${esc(t)}</p></div>`);

/** Wait for the tournament results the grade blends in, as the Grade tab does, for up to 10 seconds. */
async function ck31Results() {
  try { if (typeof mu60Load === 'function') mu60Load(); } catch (_) {}
  try { if (typeof g88Load === 'function') g88Load(); } catch (_) {}
  try { if (typeof g76Load === 'function') g76Load(); } catch (_) {}
  const done = () => (typeof mu60Tried === 'undefined' || mu60Tried) && (typeof g88Tried === 'undefined' || g88Tried) && (typeof g76Tried === 'undefined' || g76Tried);
  for (let i = 0; i < 100 && !done(); i++) await new Promise(r => setTimeout(r, 100));
}

async function ck31Run() {
  const h = ck31Hash(CK31 && CK31.hash);
  if (!h || !h.code) { ck31Msg('This card needs a deck link. Make one from Share grade, Creator kit.'); return; }
  ck31Msg('Grading…');
  const shared = await decodeDeckShare(h.code);
  if (!shared || shared.unsupported) { ck31Msg('That deck link could not be read.'); return; }
  const cards = parseDeckList(shared.list);
  let cov = null;
  try { cov = await enrichDeckCards(cards); } catch (_) {}
  const deck = { id: 'ck31-card', name: shared.name || 'Shared deck', cards, format: shared.format || 'standard', coverage: cov,
    enrichVer: typeof ENRICH_VER !== 'undefined' ? ENRICH_VER : undefined, history: [], created: Date.now() };
  if (h.atk) deck.atk = h.atk;
  if (!cards.some(c => c.supertype)) { ck31Msg('The cards in this list could not be read just now. Try again later.'); return; }
  await ck31Results();
  let R = null;
  try { R = (typeof g29Grade === 'function' && g29Grade(deck)) || gradeDeck(deck); } catch (_) { R = null; }
  if (!R) { ck31Msg('This list could not be graded.'); return; }
  if (R.unread > 0) { ck31Msg('Some cards have not been read yet, so there is no final grade. Try again later.'); return; }
  if (typeof rules34Breaches === 'function' && rules34Breaches(deck).length) { ck31Msg('This list breaks a deck building rule, so it has no grade.'); return; }
  ck31Draw(deck, R);
  // Grade again every hour, so a card left on stream follows the newest results.
  setTimeout(() => { try { location.reload(); } catch (_) {} }, 60 * 60 * 1000);
}

function ck31Draw(deck, R) {
  const band = typeof gs45Band === 'function' ? gs45Band(R.overall, R.noRes) : '';
  let info = { main: '', urls: [] };
  try { if (typeof gs261Info === 'function') info = gs261Info(deck, R); } catch (_) {}
  const art = info.urls && info.urls[0] ? `<img class="ck31-art" src="${esc(info.urls[0])}" alt="" onerror="this.remove()">` : '';
  // 3.3.2: the numbers in the card's language (8,4 in French); the link carries it as ?lang=.
  const nf = x => { try { return typeof i18nNums === 'function' && typeof rdI18n !== 'undefined' ? i18nNums(x, rdI18n.lang !== 'en' ? rdI18n.lang : rdI18n.pick()) : x; } catch (_) { return x; } };
  const syn = nf(gR1(R.coh.score * 10).toFixed(1)), pow = nf(gR1(R.via.score * 10).toFixed(1));
  const inner = `${art}<div class="ck31-main">
      <div class="ck31-name" data-no-tr>${esc(cleanSharedText(deck.name, 60).replace(/\n/g, ' '))}</div>
      <div class="ck31-row"><span class="ck31-g" data-no-tr>${nf(R.overall.toFixed(1))}</span><span class="ck31-of" data-no-tr>/10</span><span class="ck31-band">${esc(band)}</span></div>
      <div class="ck31-row small"><span>Synergy</span> <b data-no-tr>${syn}</b><span class="ck31-sp"></span><span>Power</span> <b data-no-tr>${pow}</b></div>
    </div><div class="ck31-brand"><span>Rdy</span>Deck</div>`;
  const link = CK31 && CK31.embed ? ck31Link(CK31.hash) : '';
  ck31Box(link ? `<a class="ck31-card" href="${esc(link)}" target="_blank" rel="noopener" aria-label="Open this grade in RdyDeck">${inner}</a>` : `<div class="ck31-card">${inner}</div>`);
  document.title = `${deck.name}: ${R.overall.toFixed(1)} out of 10 on RdyDeck`;
}

/** The full grade link for a card's hash: the same link Share grade copies. */
function ck31Link(hash) {
  const h = ck31Hash(hash);
  if (!h) return '';
  return shareBaseUrl() + '?ref=grade#deck=' + encodeURIComponent(h.code) + '&g=1' + (h.atk ? '&a=' + encodeURIComponent(h.atk) : '');
}

// ── the Creator kit sheet, from Share grade ──
async function ck31Open() {
  const deck = state.decks.find(d => d.id === state.activeDeckId);
  if (!deck) return;
  const R = (typeof g29Grade === 'function' && g29Grade(deck)) || gradeDeck(deck);
  const code = await encodeDeckShare(deck);
  const tail = '#deck=' + code + (typeof deck.atk === 'string' && deck.atk ? '&a=' + encodeURIComponent(deck.atk) : '');
  const base = shareBaseUrl();
  // The card shows in the player's language: OBS keeps its own storage, so the link carries it.
  const lg = typeof rdI18n !== 'undefined' && rdI18n.lang && rdI18n.lang !== 'en' ? '&lang=' + rdI18n.lang : '';
  const tr = x => typeof i18nTr === 'function' ? i18nTr(x) : x;
  const obs = base + '?overlay=1' + lg + tail;
  const emb = base + '?overlay=1&embed=1' + lg + tail;
  const full = base + '?ref=grade' + tail.replace(/^#deck=([^&]*)/, '#deck=$1&g=1');
  const iframe = `<iframe src="${emb}" width="560" height="190" style="border:0;max-width:100%" title="${esc(tr('RdyDeck grade'))}" loading="lazy"></iframe>`;
  const line = tr('{name} grades {grade} out of 10 on RdyDeck: {link}').replace('{name}', () => cleanSharedText(deck.name, 60).replace(/\n/g, ' '))
    .replace('{grade}', () => typeof rdI18n !== 'undefined' && rdI18n.nums ? rdI18n.nums(R.overall.toFixed(1)) : R.overall.toFixed(1)).replace('{link}', () => full);
  _ck31 = { obs, iframe, line };
  const row = (id, title, hint, val) => `<div class="ck31-k">
      <div class="ck31-kh"><b>${title}</b><button class="btn btn-sm" onclick="ck31Copy('${id}')">${ic23('copy')}Copy</button></div>
      <p class="modal-hint">${hint}</p>
      <code class="ck31-code" data-no-tr>${esc(val)}</code>
    </div>`;
  openSheet(`<div class="modal-title">Creator Kit</div>
    <p class="modal-hint">For your stream or videos. The card shows this list's grade with the RdyDeck name, and grades it again each time it loads, so it follows the newest tournament results.</p>
    ${row('obs', 'OBS browser source', 'In OBS, add a Browser source, paste this as its URL and set its size to 560 by 190. The card grades the list again every hour.', obs)}
    ${row('iframe', 'Embed on a website', 'Paste this where your site takes HTML. Tapping the card opens the full grade.', iframe)}
    ${row('line', 'Video description', 'One line with the grade and a link that opens this list in RdyDeck.', line)}
    <div class="modal-actions"><button class="btn btn-primary" onclick="closeSheet()">Done</button></div>`);
}
let _ck31 = null;
async function ck31Copy(which) {
  const v = _ck31 && _ck31[which];
  if (!v) return;
  try { await navigator.clipboard.writeText(v); showToast('Copied.'); }
  catch (_) { showToast('Could not copy. Press and hold the text to copy it.'); }
}

// A Creator kit button under Share grade's buttons.
(function () {
  if (CK31 || typeof v45ShareGrade !== 'function') return;
  const _s = v45ShareGrade;
  v45ShareGrade = async function () {
    const out = await _s.apply(this, arguments);
    const acts = document.querySelector('#x-modal-inner .gs45-actions');
    if (acts && !document.getElementById('ck31-btn')) {
      acts.insertAdjacentHTML('afterend', `<button class="btn btn-sm ck31-open" id="ck31-btn" onclick="ck31Open()">Creator kit: stream card and embed</button>`);
    }
    return out;
  };
})();
