
// ═══════════ v45: sample grade, share grade, numbered daily ═══════════

// Share links carry ?ref= so a visit from a shared grade or daily score
// can be counted later. Nothing is stored; the tag comes off the address bar.
(function () {
  try {
    const q = new URLSearchParams(location.search);
    if (!q.has('ref')) return;
    q.delete('ref');
    const rest = q.toString();
    history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
  } catch (_) {}
})();

// 1. Sample grade: one tap on the empty home screen loads the first starter
// deck (a real Regionals list) and opens its grade.
async function v45SampleGrade() {
  const s = STARTER_DECKS[0];
  if (!s) { openStarterPicker(); return; }
  const mine = () => state.decks.find(d => d.starter === s.id && deckListText(d.cards || []) === deckListText(parseDeckList(s.list)));
  const have = mine();
  if (have) { openReview(have.id); return; }
  await loadStarterDeck(s.id);
  const d = mine();
  if (d) openReview(d.id);
}
(function () {
  const _home = renderHome;
  renderHome = function () {
    const r = _home.apply(this, arguments);
    try {
      if (state.decks.length === 0 && STARTER_DECKS.length) {
        const box = document.querySelector('#deck-list .st-empty');
        if (box && !box.querySelector('.st45-sample')) {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'btn btn-primary st45-sample';
          b.innerHTML = ic23('award') + 'Grade a sample deck';
          b.onclick = v45SampleGrade;
          box.appendChild(b);
        }
      }
    } catch (_) {}
    return r;
  };
})();
// rdydeck.com/#sample opens the sample grade straight away.
function v45SampleHash() {
  if (!/^#sample\b/.test(location.hash || '')) return;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
  showScreen('home');
  v45SampleGrade();
}
window.addEventListener('hashchange', v45SampleHash);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(v45SampleHash, 400));
else setTimeout(v45SampleHash, 400);

// A grade link opens the grade as soon as the shared list is imported.
(function () {
  const _imp = importDeck;
  importDeck = async function () {
    const want = _v45GradeAfterImport, atk = _gs261Atk, before = state.decks.length;
    _v45GradeAfterImport = false; _gs261Atk = '';
    const r = await _imp.apply(this, arguments);
    if (want && state.decks.length > before) {
      const nd = state.decks[state.decks.length - 1];
      // The sharer's Main attacker pick; the grade ignores a pick that is not a Pokemon in this list.
      if (atk) { nd.atk = atk; try { saveState(); } catch (_) {} }
      openReview(nd.id);
    }
    return r;
  };
})();

// 2. Share grade: a picture of the grade and a link that opens the list.
// The link holds the list only. Whoever opens it gets the grade worked out
// fresh on their own device, so a shared number can never be made up.
const GS45 = { bg:'#131210', panel:'#1a1917', line:'rgba(237,232,222,0.14)', text:'#ede8de', text2:'#bdb6a9', mark:'#e5483a',
  band:{ 'Tournament-ready':'#6cba8a', 'Strong':'#6f9fd0', 'Fixable':'#d9b24a', 'Needs work':'#e07a4a', 'Does not function':'#ef5a4b' } };
let _gs45 = null;

function gs45Fit(ctx, text, max) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}
function gs45Band(v, noRes) { return v >= 8.5 && !noRes ? 'Tournament-ready' : v >= 7 ? 'Strong' : v >= 5 ? 'Fixable' : v >= 3 ? 'Needs work' : 'Does not function'; }

// 2.6.1: the card also names the deck's archetype and main attacker and shows the attacker's art,
// in two sizes: wide (1200 by 630, for X, Discord and YouTube) and square (1080 by 1080, for
// Instagram and TikTok). The art is read only from a host that allows it; without it the card
// still draws, in a layout made for no art. The grade itself is the same one the Grade tab shows.
const GS261_SIZES = { wide: [1200, 630], square: [1080, 1080] };
const GS261_KEY = 'pt_gs261_size';
function gs261Size() { const s = safeLocalGet(GS261_KEY); return GS261_SIZES[s] ? s : 'wide'; }

/** What the card says besides the grade: archetype, main attacker, art addresses, credit. */
function gs261Info(deck, R) {
  const out = { arch: '', main: '', urls: [], lim: false };
  try {
    const a = typeof mu60Data !== 'undefined' && mu60Data && typeof g68Arch === 'function' ? g68Arch(deck, mu60Data, R) : null;
    // 3.2.8: a list that only borrows an archetype's results (a.own) is not that deck, so the card does not name it.
    if (a && a.deck && a.deck.name && a.deck.id !== 'other' && !a.own) {
      out.lim = true;
      // A deck already named for its archetype does not say it twice.
      if (!(' ' + mu60Norm(deck.name) + ' ').includes(' ' + mu60Norm(a.deck.name) + ' ')) out.arch = a.deck.name;
    }
  } catch (_) {}
  // The attacker the Grade tab leads with: the player's Main attacker pick when it counts, else Auto.
  // A deck set as a toolbox leads with its hardest hitter.
  const v = (R && R.via) || {};
  const box = !v.main && (v.boxPick || []).length ? v.boxPick : null;
  let m = box ? { name: box[0] } : v.main || null;
  if (!m && !R.via) { try { m = gMainAttacker(R.entries || [], R.coh, gArchName(deck, R)); } catch (_) {} }
  if (m && m.name) {
    out.main = gCap(m.name);
    out.box = !!box;
    const k = mu60Norm(m.name);
    const c = (deck.cards || []).find(x => x.imageUrl && mu60Norm(x.apiName || x.name) === k);
    if (c) {
      let more = [];
      try { more = getImageCandidates(c); } catch (_) {}
      out.urls = gs261Big([c.imageUrl].concat(c.fallbackUrls || [], more));
      out.card = { set: c.set, num: c.num, name: c.apiName || c.name };
    }
  }
  return out;
}
/** Larger copies first, and the hosts that let a page read their pictures first: pokemontcg.io
 *  and TCGdex do; the Limitless image host does not (checked 13 Nov 2026), so it is tried last. */
function gs261Big(list) {
  const out = [];
  list.forEach(u => {
    u = String(u || '');
    if (!/^https:\/\//.test(u)) return;
    if (/_R_EN_XS\.png$/.test(u)) out.push(u.replace(/_XS\.png$/, '_LG.png'), u.replace(/_XS\.png$/, '.png'));
    if (/images\.pokemontcg\.io\/[^/]+\/[^/_]+\.png$/.test(u)) out.push(u.replace(/\.png$/, '_hires.png'));
    if (/assets\.tcgdex\.net\/.+\/low\.(webp|png)$/.test(u)) out.push(u.replace(/low\.(webp|png)$/, 'high.webp'));
    out.push(u);
  });
  const rank = u => /pokemontcg\.io/.test(u) ? 0 : /tcgdex\.net/.test(u) ? 1 : 2;
  return [...new Set(out)].map((u, i) => ({ u, i })).sort((a, b) => rank(a.u) - rank(b.u) || a.i - b.i).map(x => x.u);
}
/** 3.4.17: when only the Limitless host has the attacker's art (every 30th Celebration card), the
 *  share card cannot read it. TCGdex has those pictures and lets a page read them, so its record for
 *  the card's own printing is read, the name checked (30th Classic Collection cards share the 30C
 *  code and numbers 1 to 30), and its picture tried first. Gives up after 3 seconds. */
async function gs3417Urls(info) {
  const urls = (info && info.urls) || [], c = info && info.card;
  if (!c || urls.some(u => /tcgdex\.net/.test(u)) || typeof fetch === 'undefined'
    || typeof td30CardId !== 'function' || typeof TD30_API === 'undefined') return urls;
  let id = null;
  try { id = td30CardId(c.set, c.num); } catch (_) {}
  if (!id) return urls;
  const ids = [id].concat(/^30th-/.test(id) ? [id.replace(/^30th-/, '30th-c-')] : []);
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = setTimeout(() => { if (ac) ac.abort(); }, 3000);
  try {
    for (const tid of ids) {
      try {
        const r = await fetch(TD30_API + '/cards/' + encodeURIComponent(tid), { signal: ac ? ac.signal : undefined });
        if (!r.ok) continue;
        const d = await r.json();
        const same = d && typeof d.name === 'string' && typeof TCGEnrich !== 'undefined' && TCGEnrich.sameCard(c.name, d.name);
        if (same && typeof d.image === 'string' && /^https:\/\/assets\.tcgdex\.net\/[\w./-]+$/.test(d.image))
          return gs261Big([d.image + '/low.webp'].concat(urls));
      } catch (e) { if (e && e.name === 'AbortError') break; }
    }
  } finally { clearTimeout(t); }
  return urls;
}
/** The first art that loads as a readable picture, or null. Gives up after 4 seconds in all. */
async function gs261Art(urls) {
  if (!urls.length || typeof fetch === 'undefined') return null;
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = setTimeout(() => { if (ac) ac.abort(); }, 4000);
  try {
    for (const u of urls.slice(0, 8)) {
      try {
        const r = await fetch(u, { mode: 'cors', credentials: 'omit', signal: ac ? ac.signal : undefined });
        if (!r.ok || !/^image\//.test(r.headers.get('content-type') || 'image/')) continue;
        const img = await gs261Img(await r.blob());
        if (img) return { img, url: u };
      } catch (e) { if (e && e.name === 'AbortError') return null; }
    }
    return null;
  } finally { clearTimeout(t); }
}
function gs261Img(blob) {
  return new Promise(res => {
    try {
      const src = URL.createObjectURL(blob), im = new Image();
      im.onload = () => { res(im.naturalWidth > 40 ? im : null); setTimeout(() => URL.revokeObjectURL(src), 0); };
      im.onerror = () => { res(null); URL.revokeObjectURL(src); };
      im.src = src;
    } catch (_) { res(null); }
  });
}

async function gs45Draw(deck, R, size, info, art) {
  try {
    if (document.fonts && document.fonts.load) await Promise.all([
      document.fonts.load('800 100px "RD Display"'), document.fonts.load('700 40px "RD Display"'),
      document.fonts.load('600 40px "RD Body"'), document.fonts.load('400 30px "RD Body"')]);
  } catch (_) {}
  size = GS261_SIZES[size] ? size : 'wide';
  info = info || { arch: '', main: '', urls: [], lim: false };
  const [W, H] = GS261_SIZES[size], sq = size === 'square';
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const D = '"RD Display", "Arial Narrow", sans-serif', B = '"RD Body", system-ui, sans-serif';
  const synV = gR1(R.coh.score * 10), powV = gR1(R.via.score * 10);
  const band = gs45Band(R.overall, R.noRes), col = GS45.band[band];
  const k = sq ? 1.18 : 1;   // the square card's type is a little larger

  x.fillStyle = GS45.bg; x.fillRect(0, 0, W, H);
  x.fillStyle = col; x.fillRect(0, 0, W, 8);
  x.textBaseline = 'alphabetic';

  // Logo: the Ready Check mark, then RDY in red and DECK in white.
  const logoY = sq ? 60 : 52;
  x.save(); x.translate(64, logoY); x.scale(0.62 * k, 0.62 * k); x.translate(-19, -6);
  rdMarkCanvas(x, GS45.text, GS45.mark);
  x.restore();
  x.font = `800 ${Math.round(50 * k)}px ${D}`;
  const lx = 64 + 52 * k, ly = logoY + 40 * k;
  x.fillStyle = GS45.mark; x.fillText('RDY', lx, ly);
  x.fillStyle = GS45.text; x.fillText('DECK', lx + x.measureText('RDY').width, ly);

  // The main attacker's art, when it loaded.
  let textR = W - 64;
  if (art && art.img) {
    const aw = sq ? 400 : 321, ah = Math.round(aw * 1.396);
    const ax = W - 64 - aw, ay = sq ? 316 : 52, rr = Math.round(aw * 0.045);
    x.save();
    x.beginPath(); if (x.roundRect) x.roundRect(ax, ay, aw, ah, rr); else x.rect(ax, ay, aw, ah); x.clip();
    x.drawImage(art.img, ax, ay, aw, ah);
    x.restore();
    x.strokeStyle = GS45.line; x.lineWidth = 2;
    x.beginPath(); if (x.roundRect) x.roundRect(ax, ay, aw, ah, rr); else x.rect(ax, ay, aw, ah); x.stroke();
    if (!sq) textR = ax - 40;
  }
  const hasArt = !!(art && art.img);

  // Deck name, then the archetype and main attacker.
  x.font = `600 ${sq ? 52 : 40}px ${B}`; x.fillStyle = GS45.text;
  x.fillText(gs45Fit(x, deck.name || 'My deck', textR - 64), 64, sq ? 212 : 172);
  const sub = [info.arch, info.main ? (info.box ? 'Toolbox led by ' : 'Main attacker: ') + info.main : ''].filter(Boolean).join('  \u00b7  ');
  if (sub) {
    x.font = `400 ${sq ? 32 : 28}px ${B}`; x.fillStyle = GS45.text2;
    x.fillText(gs45Fit(x, sub, textR - 64), 64, sq ? 262 : 214);
  }

  // The grade and its band.
  const sc = R.overall.toFixed(1);
  const gSize = sq ? (hasArt ? 200 : 240) : (hasArt ? 160 : 200);
  const gY = sq ? (hasArt ? 520 : 560) : (hasArt ? 372 : 404);
  x.font = `800 ${gSize}px ${D}`; x.fillStyle = col;
  x.fillText(sc, 58, gY);
  const sw = x.measureText(sc).width;
  x.font = `700 ${Math.round(gSize * 0.3)}px ${D}`; x.fillStyle = GS45.text2;
  x.fillText('/10', 58 + sw + 10, gY);
  x.font = `700 ${Math.round(gSize * 0.23)}px ${D}`; x.fillStyle = col;
  x.fillText(band, 64, gY + Math.round(gSize * 0.33));

  // 3.5.1: Card Strength (was Deck Strength (cards based)).
  // 3.4.41: labels Deck Strength (cards based) and Tournament Strength, fitted beside the value.
  // 3.4.38: Deck Strength and Tourney strength with their bars (Synergy and Power before). N/A when the
  // archetype has too few games, with an empty bar. Without the split helper the old pair shows.
  const part = (lbl, v, px, y, pw, big) => {
    const t = v == null ? 'N/A' : v.toFixed(1);
    x.font = `800 ${big ? 60 : 44}px ${D}`; const tw = x.measureText(t).width;
    x.font = `600 ${big ? 30 : 26}px ${B}`; x.fillStyle = GS45.text2; x.fillText(gs45Fit(x, lbl, pw - tw - 16), px, y);
    x.font = `800 ${big ? 60 : 44}px ${D}`; x.fillStyle = v == null ? GS45.text2 : GS45.band[gs45Band(v)];
    x.fillText(t, px + pw - tw, y + 4);
    const by = y + (big ? 22 : 16), bh = big ? 12 : 8;
    x.fillStyle = GS45.line; x.fillRect(px, by, pw, bh);
    if (v != null) { x.fillStyle = GS45.band[gs45Band(v)]; x.fillRect(px, by, pw * Math.max(0, Math.min(1, v / 10)), bh); }
  };
  const S = typeof g338Split === 'function' ? g338Split(R) : null;
  const P = S ? [['Card Strength', S.deck], ['Tournament Strength', S.tour]] : [['Synergy', synV], ['Power', powV]];
  if (!sq && !hasArt) { part(P[0][0], P[0][1], 700, 262, 436, true); part(P[1][0], P[1][1], 700, 392, 436, true); }
  else if (!sq) { part(P[0][0], P[0][1], 64, 474, 320, false); part(P[1][0], P[1][1], 424, 474, 320, false); }
  else if (hasArt) { part(P[0][0], P[0][1], 64, 690, 496, true); part(P[1][0], P[1][1], 64, 800, 496, true); }
  else { part(P[0][0], P[0][1], 64, 760, 456, true); part(P[1][0], P[1][1], 560, 760, 456, true); }

  // Footer: a note when the grade is held back, the tag line, the address, and the
  // Limitless credit when its deck data or card image is on the card.
  const lineY = sq ? 920 : 522;
  x.fillStyle = GS45.line; x.fillRect(64, lineY, W - 128, 2);
  const limArt = hasArt && /limitlesstcg/.test(art.url || '');
  const credit = info.lim && limArt ? 'Deck data and card image from Limitless TCG'
    : info.lim ? 'Deck data from Limitless TCG' : limArt ? 'Card image from Limitless TCG' : '';
  const fs = sq ? 30 : 26;
  const t1 = credit ? lineY + (sq ? 58 : 40) : lineY + (sq ? 82 : 50);
  x.font = `400 ${fs}px ${B}`; x.fillStyle = GS45.text2;
  const held = R.rawOverall != null ? `Held at ${R.overall.toFixed(1)}: some cards are not Standard legal now. ` : '';
  x.fillText(gs45Fit(x, held + 'Can Your Deck Win?', W - 128 - 260), 64, t1);
  if (credit) x.fillText(gs45Fit(x, credit, W - 128), 64, t1 + (sq ? 48 : 34));
  // The not-affiliated notice travels with the image wherever it is posted.
  x.font = `400 ${sq ? 18 : 16}px ${B}`; x.fillStyle = GS45.text2;
  x.fillText(gs45Fit(x, 'Unofficial fan tool, not affiliated with The Pok\u00e9mon Company or Nintendo. Card images \u00a9 their owners.', W - 128), 64, H - (sq ? 22 : 12));
  x.font = `600 ${fs + 2}px ${B}`; x.fillStyle = GS45.text;
  const site = 'rdydeck.com';
  x.fillText(site, W - 64 - x.measureText(site).width, t1);

  return new Promise(res => { try { c.toBlob(b => res(b), 'image/png'); } catch (_) { res(null); } });
}

/** 3.4.38: the split scores for the shared text, Synergy and Power when the split is not there. */
function gs338Text(R) {
  const S = typeof g338Split === 'function' ? g338Split(R) : null;
  if (!S) return `Synergy ${gR1(R.coh.score * 10).toFixed(1)}, Power ${gR1(R.via.score * 10).toFixed(1)}.`;
  return `Card Strength ${S.deck.toFixed(1)}, Tournament Strength ${S.tour == null ? 'N/A' : S.tour.toFixed(1)}.`;
}
async function v45ShareGrade() {
  const deck = state.decks.find(d => d.id === state.activeDeckId);
  if (!deck) return;
  if (!(deck.cards || []).some(c => c.supertype)) { showToast('This deck has no card data yet, so there is no grade to share.'); return; }
  const R = g29Grade(deck) || gradeDeck(deck);
  if (R.unread > 0) { showToast('Some cards have not been read yet, so this grade is not final. Open the deck again while online, then share.'); return; }
  // v57: a list that breaks a deck building rule would share as Tournament-ready, so fix it first.
  if (typeof rules34Breaches === 'function' && rules34Breaches(deck).length) { showToast('This list breaks a deck building rule. Fix it in Edit deck, then share the grade.'); return; }
  const band = gs45Band(R.overall, R.noRes);
  const url = shareBaseUrl() + '?ref=grade#deck=' + (await encodeDeckShare(deck)) + '&g=1' + (typeof deck.atk === 'string' && deck.atk ? '&a=' + encodeURIComponent(deck.atk) : '');
  const text = `My ${cleanSharedText(deck.name, 60).replace(/\n/g, ' ')} grades ${R.overall.toFixed(1)} out of 10 (${band}) on RdyDeck. ${gs338Text(R)} Can Your Deck Win?`;
  if (_gs45 && _gs45.img) { try { URL.revokeObjectURL(_gs45.img); } catch (_) {} }
  const info = gs261Info(deck, R), size = gs261Size();
  _gs45 = { deck, R, info, url, text, size, blob: null, file: null, img: '', artP: null, tok: 0,
    alt: `${deck.name}: ${R.overall.toFixed(1)} out of 10, ${band}` };
  const canShare = !!navigator.share;
  const opt = s => `<div class="mode-opt${size === s ? ' active' : ''}" data-sz="${s}" onclick="gs261SetSize('${s}')">${s === 'wide' ? 'Wide' : 'Square'}</div>`;
  openSheet(`<div class="modal-title">Share Your Grade</div>
    <div class="seg gs261-seg" role="group" aria-label="Picture size">${opt('wide')}${opt('square')}</div>
    <div class="gs261-pic" id="gs261-pic" style="aspect-ratio:${GS261_SIZES[size].join(' / ')}"><span>Making your card</span></div>
    <div class="modal-hint" style="margin-bottom:0.9rem">The link opens this list in RdyDeck, so anyone can see its grade and odds for themselves.</div>
    <div class="modal-actions gs45-actions">
      <button class="btn" id="gs261-save" onclick="gs45Save()" disabled>${ic23('save')}Save image</button>
      <button class="btn" onclick="gs45Copy()">${ic23('copy')}Copy link</button>
      ${canShare ? `<button class="btn btn-primary" onclick="gs45Share()">${ic23('share')}Share</button>` : ''}
    </div>`);
  gs261Render();
}
/** Draws the card at the picked size into the open sheet. A newer draw wins over an older one. */
async function gs261Render() {
  const g = _gs45; if (!g) return;
  const tok = ++g.tok;
  if (!g.artP) g.artP = gs3417Urls(g.info).catch(() => g.info.urls).then(gs261Art).catch(() => null);
  const art = await g.artP;
  if (g !== _gs45 || tok !== g.tok) return;
  const blob = await gs45Draw(g.deck, g.R, g.size, g.info, art);
  if (g !== _gs45 || tok !== g.tok) return;
  if (g.img) { try { URL.revokeObjectURL(g.img); } catch (_) {} }
  g.blob = blob;
  g.file = blob && typeof File !== 'undefined' ? new File([blob], gs261Name(g.deck), { type: 'image/png' }) : null;
  g.img = blob ? URL.createObjectURL(blob) : '';
  const pic = document.getElementById('gs261-pic');
  if (pic) pic.innerHTML = g.img ? `<img class="gs45-img" src="${g.img}" alt="${esc(g.alt)}">`
    : '<span>The picture could not be made on this device. The link still works.</span>';
  const sv = document.getElementById('gs261-save');
  if (sv) sv.disabled = !g.img;
}
// 3.4.37: the saved picture is named after the deck, e.g. rdydeck-grade-dragapult-ex.png.
// Accents and apostrophes dropped, anything but a to z and 0 to 9 becomes one hyphen, 60 characters at most.
function gs261Slug(name) {
  return String(name || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/['\u2019]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
}
function gs261Name(deck) { const s = gs261Slug(deck && deck.name); return s ? 'rdydeck-grade-' + s + '.png' : 'rdydeck-grade.png'; }
function gs261SetSize(s) {
  const g = _gs45; if (!g || !GS261_SIZES[s] || g.size === s) return;
  g.size = s;
  try { safeLocalSet(GS261_KEY, s); } catch (_) {}
  document.querySelectorAll('.gs261-seg .mode-opt').forEach(el => el.classList.toggle('active', el.dataset.sz === s));
  const pic = document.getElementById('gs261-pic');
  if (pic) { pic.style.aspectRatio = GS261_SIZES[s].join(' / '); pic.innerHTML = '<span>Making your card</span>'; }
  const sv = document.getElementById('gs261-save');
  if (sv) sv.disabled = true;
  gs261Render();
}
async function gs45Share() {
  const g = _gs45; if (!g) return;
  try {
    if (g.file && navigator.canShare && navigator.canShare({ files: [g.file] })) {
      await navigator.share({ files: [g.file], text: g.text + ' ' + g.url });
      return;
    }
    await navigator.share({ text: g.text, url: g.url });
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    gs45Copy();
  }
}
async function gs45Copy() {
  const g = _gs45; if (!g) return;
  try { await navigator.clipboard.writeText(g.text + ' ' + g.url); showToast('Grade and link copied. Paste it anywhere.'); }
  catch (_) { showToast(navigator.share ? 'Could not copy. Try Share instead.' : g.url); }
}
function gs45Save() {
  const g = _gs45; if (!g || !g.img) return;
  const a = document.createElement('a');
  a.href = g.img; a.download = gs261Name(g.deck);
  document.body.appendChild(a); a.click(); a.remove();
}
