// ═══════════ 3.4.23: a look of their own for the daily games ═══════════
// Each daily game keeps its rules and scoring; this file only changes how they look.
//   1. Daily challenge: on the results screen the six Prize cards start face down, as Prize
//      rectangles like the logo, and the ones you found turn over one by one. A missed one turns
//      over when you tap it. Share makes a picture of the six rectangles (no card art, so a friend's
//      game is not spoiled).
//   2. Guess the Grade: a gauge from 5 to 10 under the guesses, each guess a marker with its own
//      shape (Cold a ring, Warm a diamond, Hot a triangle, right a square) and the grade marked when
//      the game ends. Share makes a picture of how warm each guess got, with no grade and no deck.
//   3. Daily puzzle: a winning line is shown as the cards you played, in order.
//   4. Rare Pull: foil. The card you named on a tile with a foil edge in its rarity's color,
//      swaying a few degrees while idle. The end screen shows all seven and the best pull.
//   5. Home: each daily game's row has its own color edge and faded card art, and the heading has
//      a ring that fills as the games are played.
// Moves are short (200 to 400ms, ease out) and nothing loops or flashes; with reduced motion on,
// everything appears in its final state. No ads, and nothing new leaves the device: the pictures
// are drawn on the device, like the grade card's.

const DG_COL = { daily: 'var(--electric)', puzzle: 'var(--grass)', rp: 'var(--psychic)', gtg: 'var(--water)' };
// Canvas colors, the dark theme's (the share pictures are always dark, like the grade card).
const DG_CV = { daily: '#d9b24a', puzzle: '#6aae6a', rp: '#b77ac4', gtg: '#6f9fd0', cold: '#7aa6d1', warm: '#d9b24a', hot: '#e5483a' };
const dgReduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };
const dgT = s => (typeof rdI18n === 'object' && rdI18n && rdI18n.t ? rdI18n.t(s) : s);

/** An <img> for a card by set and number, with the app's usual fallbacks (Limitless first). */
function dgImg(set, num, cls, name) {
  let urls = [];
  try { urls = getImageCandidates({ set, num: String(num || '') }); } catch (_) {}
  if (!urls.length) return '';
  return `<img class="${cls || ''}" src="${esc(urls[0])}" alt="" loading="lazy" decoding="async" data-fallbacks="${esc(JSON.stringify(urls.slice(1)))}" data-fallback-idx="0"${name ? ` data-name="${esc(name)}"` : ''} onerror="swapImgOrPlaceholder(this,'dg-noimg')">`;
}

// ── Share pictures: one sheet for any daily game (wide or square, like the grade card) ──
let _dgShare = null;
/** o: { title, hint, text, url, alt, name, draw(size) -> Promise<Blob|null> } */
function dgShareSheet(o) {
  let size = 'wide';
  try { size = safeLocalGet(GS261_KEY) === 'square' ? 'square' : 'wide'; } catch (_) {}
  if (_dgShare && _dgShare.img) { try { URL.revokeObjectURL(_dgShare.img); } catch (_) {} }
  _dgShare = Object.assign({ size, img: '', file: null, tok: 0 }, o);
  const canShare = !!navigator.share;
  const opt = s => `<div class="mode-opt${size === s ? ' active' : ''}" data-sz="${s}" onclick="dgShareSize('${s}')">${s === 'wide' ? 'Wide' : 'Square'}</div>`;
  openSheet(`<div class="modal-title">${o.title}</div>
    <div class="seg gs261-seg dgs-seg" role="group" aria-label="Picture size">${opt('wide')}${opt('square')}</div>
    <div class="gs261-pic" id="dgs-pic" style="aspect-ratio:${GS261_SIZES[size].join(' / ')}"><span>Making your card</span></div>
    <div class="modal-hint" style="margin-bottom:0.9rem">${o.hint}</div>
    <div class="modal-actions gs45-actions">
      <button class="btn" id="dgs-save" onclick="dgShareSave()" disabled>${ic23('save')}Save image</button>
      <button class="btn" onclick="dgShareCopy()">${ic23('copy')}Copy link</button>
      ${canShare ? `<button class="btn btn-primary" onclick="dgShareGo()">${ic23('share')}Share</button>` : ''}
    </div>`);
  dgShareRender();
}
async function dgShareRender() {
  const g = _dgShare; if (!g) return;
  const tok = ++g.tok;
  let blob = null;
  try { blob = await g.draw(g.size); } catch (e) { console.warn('[daily games share]', e); }
  if (g !== _dgShare || tok !== g.tok) return;
  if (g.img) { try { URL.revokeObjectURL(g.img); } catch (_) {} }
  const name = g.name + (g.size === 'square' ? '-square' : '') + '.png';
  g.file = blob && typeof File !== 'undefined' ? new File([blob], name, { type: 'image/png' }) : null;
  g.img = blob ? URL.createObjectURL(blob) : '';
  const pic = document.getElementById('dgs-pic');
  if (pic) pic.innerHTML = g.img ? `<img class="gs45-img" src="${g.img}" alt="${esc(g.alt)}">` : '<span>The picture could not be made on this device. The link still works.</span>';
  const sv = document.getElementById('dgs-save'); if (sv) sv.disabled = !g.img;
}
function dgShareSize(s) {
  const g = _dgShare; if (!g || !GS261_SIZES[s] || g.size === s) return;
  g.size = s;
  try { safeLocalSet(GS261_KEY, s); } catch (_) {}
  document.querySelectorAll('.dgs-seg .mode-opt').forEach(el => el.classList.toggle('active', el.dataset.sz === s));
  const pic = document.getElementById('dgs-pic');
  if (pic) { pic.style.aspectRatio = GS261_SIZES[s].join(' / '); pic.innerHTML = '<span>Making your card</span>'; }
  const sv = document.getElementById('dgs-save'); if (sv) sv.disabled = true;
  dgShareRender();
}
async function dgShareGo() {
  const g = _dgShare; if (!g) return;
  const line = g.text + (g.url ? '\n' + g.url : '');
  try {
    if (g.file && navigator.canShare && navigator.canShare({ files: [g.file] })) { await navigator.share({ files: [g.file], text: line }); return; }
    await navigator.share(g.url ? { text: g.text, url: g.url } : { text: g.text });
  } catch (e) { if (e && e.name === 'AbortError') return; dgShareCopy(); }
}
async function dgShareCopy() {
  const g = _dgShare; if (!g) return;
  try { await navigator.clipboard.writeText(g.text + (g.url ? '\n' + g.url : '')); showToast('Result copied. Paste it anywhere.'); }
  catch (_) { showToast(navigator.share ? 'Could not copy. Try Share instead.' : g.url || g.text); }
}
function dgShareSave() {
  const g = _dgShare; if (!g || !g.img) return;
  const a = document.createElement('a'); a.href = g.img; a.download = g.name + (g.size === 'square' ? '-square' : '') + '.png';
  document.body.appendChild(a); a.click(); a.remove();
}

/** The canvas every daily game picture starts from: background, the game's color bar, the logo
 *  and the game's tag top right. Returns what the drawing needs. */
async function dgCanvas(size, col, tag) {
  try {
    if (document.fonts && document.fonts.load) await Promise.all([
      document.fonts.load('800 100px "RD Display"'), document.fonts.load('700 40px "RD Display"'),
      document.fonts.load('600 40px "RD Body"'), document.fonts.load('400 30px "RD Body"')]);
  } catch (_) {}
  const [W, H] = GS261_SIZES[size] || GS261_SIZES.wide, sq = size === 'square';
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  if (!x) return null;
  const D = '"RD Display", "Arial Narrow", sans-serif', B = '"RD Body", system-ui, sans-serif';
  const L = 64, R = W - 64, k = sq ? 1.18 : 1;
  x.fillStyle = GS45.bg; x.fillRect(0, 0, W, H);
  x.fillStyle = col; x.fillRect(0, 0, W, 8);
  x.textBaseline = 'alphabetic';
  const logoY = sq ? 60 : 52;
  x.save(); x.translate(L, logoY); x.scale(0.62 * k, 0.62 * k); x.translate(-19, -6);
  x.lineJoin = 'round'; x.lineCap = 'round';
  x.strokeStyle = GS45.text; x.lineWidth = 7;
  x.beginPath(); if (x.roundRect) x.roundRect(23, 10, 54, 80, 5); else x.rect(23, 10, 54, 80); x.stroke();
  x.strokeStyle = GS45.mark; x.lineWidth = 10;
  x.beginPath(); x.moveTo(35, 52); x.lineTo(46, 63); x.lineTo(66, 38); x.stroke();
  x.restore();
  x.font = `800 ${Math.round(50 * k)}px ${D}`;
  const lx = L + 52 * k, ly = logoY + 40 * k;
  x.fillStyle = GS45.mark; x.fillText('RDY', lx, ly);
  x.fillStyle = GS45.text; x.fillText('DECK', lx + x.measureText('RDY').width, ly);
  x.font = `700 ${sq ? 34 : 30}px ${D}`; x.fillStyle = col;
  const t = dgT(tag).toUpperCase();
  x.fillText(t, R - x.measureText(t).width, ly);
  return { c, x, W, H, sq, D, B, L, R };
}
/** The footer: a rule, a line of text, rdydeck.com and the not-affiliated notice. */
function dgCanvasFoot(g, line) {
  const { x, W, H, sq, B, L, R } = g;
  const lineY = sq ? 920 : 522;
  x.fillStyle = GS45.line; x.fillRect(L, lineY, W - 128, 2);
  const fs = sq ? 30 : 26, t1 = lineY + (sq ? 82 : 50), site = 'rdydeck.com';
  x.font = `600 ${fs + 2}px ${B}`; x.fillStyle = GS45.text;
  const sw = x.measureText(site).width; x.fillText(site, R - sw, t1);
  x.font = `400 ${sq ? fs - 4 : fs}px ${B}`; x.fillStyle = GS45.text2;
  x.fillText(gs45Fit(x, dgT(line), R - L - sw - 32), L, t1);
  x.font = `400 ${sq ? 18 : 16}px ${B}`; x.fillStyle = GS45.text2;
  x.fillText(gs45Fit(x, 'Unofficial fan tool, not affiliated with The Pokémon Company or Nintendo.', W - 128), L, H - (sq ? 22 : 12));
}
const dgBlob = c => new Promise(res => { try { c.toBlob(b => res(b), 'image/png'); } catch (_) { res(null); } });
function dgRR(x, X, Y, w, h, r) { x.beginPath(); if (x.roundRect) x.roundRect(X, Y, w, h, r); else x.rect(X, Y, w, h); }

// ═══ 1. Daily challenge: the Prize cards turn over ═══
/** A face-down Prize card: a Prize rectangle with the logo's check, and its number. */
function dgPrizeBack(n) {
  return `<span class="dgp-back" aria-hidden="true"><svg viewBox="0 0 40 56"><rect x="6" y="6" width="28" height="44" rx="3"/><path d="M13 29l5 5 9-11"/></svg><b>${n}</b></span>`;
}
function dgPrizeGrid() {
  const grid = document.getElementById('prize-reveal-grid');
  if (!grid || typeof DAILY_ID === 'undefined' || state.activeDeckId !== DAILY_ID || !Array.isArray(game.prizes)) return;
  const used = game._usedPrizeIdxs || new Set();
  grid.classList.add('dgp-grid');
  grid.innerHTML = game.prizes.map((card, i) => {
    const found = used.has(i), nm = cn23(card.apiName || card.name);
    return `<button type="button" class="dgp${found ? ' dgp-found' : ' dgp-miss'}" data-i="${i}" onclick="dgPrizeTurn(this)"
        aria-label="${found ? 'Found' : 'Missed. Tap to see it'}" ${found ? 'tabindex="-1"' : ''}>
      <span class="dgp-in">
        ${dgPrizeBack(i + 1)}
        <span class="dgp-face">
          ${card.imageUrl ? `<img src="${esc(card.imageUrl)}" alt="${esc(nm)}" data-fallbacks="${esc(JSON.stringify(card.fallbackUrls || []))}" data-fallback-idx="0" onerror="swapImgOrPlaceholder(this,'card-placeholder result-ph')">` : '<span class="card-placeholder result-ph"><i class=ph-card></i></span>'}
          <span class="dgp-tag">${found ? 'Found' : 'Missed'}</span>
          <span class="prize-card-name" data-no-tr>${esc(nm)}</span>
        </span>
      </span>
      ${found ? '' : '<span class="dgp-hint" aria-hidden="true">Tap to see</span>'}
    </button>`;
  }).join('');
  // The found ones turn over in order once the screen is up; the missed ones wait for a tap.
  const sec = grid.closest('.prize-reveal');
  const title = sec && sec.querySelector('.section-title');
  if (title && !sec.querySelector('.dgp-all')) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn btn-sm btn-ghost dgp-all'; b.textContent = 'Show all';
    b.onclick = () => grid.querySelectorAll('.dgp').forEach(el => dgPrizeTurn(el, true));
    title.insertAdjacentElement('afterend', b);
  }
  const all = sec && sec.querySelector('.dgp-all');
  if (all) all.hidden = used.size >= game.prizes.length;
  const found = [...grid.querySelectorAll('.dgp-found')];
  if (dgReduced()) { found.forEach(el => el.classList.add('dgp-up')); return; }
  found.forEach((el, j) => setTimeout(() => el.classList.add('dgp-up'), 250 + j * 160));
}
function dgPrizeTurn(el, quiet) {
  if (!el || el.classList.contains('dgp-up')) return;
  el.classList.add('dgp-up');
  const h = el.querySelector('.dgp-hint'); if (h) h.remove();
  el.setAttribute('aria-label', el.classList.contains('dgp-found') ? 'Found' : 'Missed');
  if (!quiet) { const g = el.parentElement, all = g && g.parentElement && g.parentElement.querySelector('.dgp-all'); if (all && !g.querySelector('.dgp:not(.dgp-up)')) all.hidden = true; }
  else { const all = el.closest('.prize-reveal') && el.closest('.prize-reveal').querySelector('.dgp-all'); if (all) all.hidden = true; }
}
// The grid is drawn by revealPrizes (js/core.js); a daily game's grid is drawn again face down.
(function () {
  if (typeof revealPrizes !== 'function') return;
  const _rv = revealPrizes;
  revealPrizes = async function () {
    const out = await _rv.apply(this, arguments);
    try { dgPrizeGrid(); } catch (e) { console.warn('[daily look]', e); }
    // a later regular game draws its grid the usual way
    try {
      const grid = document.getElementById('prize-reveal-grid');
      if (grid && state.activeDeckId !== DAILY_ID) {
        grid.classList.remove('dgp-grid');
        const all = document.querySelector('#prize-reveal-area .dgp-all'); if (all) all.remove();
      }
    } catch (_) {}
    return out;
  };
})();

// The Daily challenge's share picture: six Prize rectangles, found or not, with no card art.
async function dgDailyDraw(r, key, size) {
  const g = await dgCanvas(size, DG_CV.daily, `Daily challenge #${dailyNumber(key)}`);
  if (!g) return null;
  const { x, sq, D, B, L, R } = g;
  const y0 = sq ? 290 : 186;
  x.font = `800 ${sq ? 150 : 128}px ${D}`; x.fillStyle = DG_CV.daily;
  const sc = `${r.score}`;
  x.fillText(sc, L - 4, y0 + (sq ? 30 : 20));
  const scw = x.measureText(sc).width;
  x.font = `700 ${sq ? 52 : 44}px ${D}`; x.fillStyle = GS45.text;
  x.fillText(gs45Fit(x, dgT(`of 6 prizes`).toUpperCase(), R - L - scw - 24), L + scw + 16, y0 + (sq ? 30 : 20));
  x.font = `400 ${sq ? 34 : 30}px ${B}`; x.fillStyle = GS45.text2;
  const st = dailyStreak();
  const sub = [dgT(`in ${formatTime(r.time)}`), st > 1 ? dgT(`${st} day streak`) : ''].filter(Boolean).join('  ·  ');
  x.fillText(gs45Fit(x, sub, R - L), L, y0 + (sq ? 92 : 72));
  // The six Prize rectangles: found ones filled in the game's color with the check, missed ones outlined.
  const n = 6, gap = sq ? 22 : 20;
  const cw = Math.min(sq ? 140 : 150, ((R - L) - gap * (n - 1)) / n), ch = Math.round(cw * 1.4);
  const cy = sq ? 520 : 318;
  for (let i = 0; i < n; i++) {
    const cx = L + i * (cw + gap), on = i < r.score;
    dgRR(x, cx, cy, cw, ch, 8);
    if (on) { x.fillStyle = DG_CV.daily; x.fill(); }
    else { x.strokeStyle = 'rgba(237,232,222,0.34)'; x.lineWidth = 4; x.stroke(); }
    x.save(); x.lineJoin = 'round'; x.lineCap = 'round';
    x.strokeStyle = on ? GS45.bg : 'rgba(237,232,222,0.34)'; x.lineWidth = on ? 9 : 5;
    x.beginPath();
    if (on) { x.moveTo(cx + cw * 0.3, cy + ch * 0.52); x.lineTo(cx + cw * 0.45, cy + ch * 0.62); x.lineTo(cx + cw * 0.72, cy + ch * 0.4); }
    else { x.moveTo(cx + cw * 0.36, cy + ch * 0.5); x.lineTo(cx + cw * 0.64, cy + ch * 0.5); }
    x.stroke(); x.restore();
  }
  dgCanvasFoot(g, 'Same deck and shuffle for everyone today. Can you find them all?');
  return dgBlob(g.c);
}
(function () {
  if (typeof shareDaily !== 'function') return;
  shareDaily = async function (k) {
    const key = dailyOkKey(k) || dailyKey(), r = dailyStore().results[key];
    if (!r) { showToast('Play today\'s challenge first.'); return; }
    dgShareSheet({
      title: 'Share your daily score',
      hint: 'The link opens today\'s challenge, so friends get the same deck and shuffle. The picture shows no cards.',
      text: dailyShareText(r, key), url: shareBaseUrl() + '?ref=daily#daily', name: 'rdydeck-daily',
      alt: `Daily challenge #${dailyNumber(key)}: ${r.score} of 6 prizes in ${formatTime(r.time)}`,
      draw: size => dgDailyDraw(r, key, size),
    });
  };
})();

// ═══ 2. Guess the Grade: the gauge ═══
const DG_HEAT = { cold: 'Cold', warm: 'Warm', hot: 'Hot', hit: 'Right' };
/** A guess's marker: its shape tells the heat as much as its color does. */
function dgMark(kind) {
  const p = {
    cold: '<circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="2.4"/>',
    warm: '<path d="M8 1.8l6.2 6.2L8 14.2 1.8 8z" fill="currentColor"/>',
    hot: '<path d="M8 1.6l6.6 12H1.4z" fill="currentColor"/>',
    hit: '<rect x="2" y="2" width="12" height="12" rx="1.5" fill="currentColor"/><path d="M5 8.2l2.1 2.1L11.2 6" fill="none" stroke="var(--surface)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  }[kind];
  return `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${p}</svg>`;
}
function dgGauge(r, key) {
  if (!r || !Array.isArray(r.g)) return '';
  const lo0 = r.ans < GTG_FLOOR ? 0 : GTG_FLOOR, span = 10 - lo0;
  const pos = v => Math.max(0, Math.min(100, (v - lo0) / span * 100));
  const ticks = [];
  for (let v = Math.ceil(lo0); v <= 10; v++) ticks.push(`<span class="dgg-tick" style="left:${pos(v)}%"><i></i><b>${v}</b></span>`);
  // the part of the scale the hints still allow, while the game is on
  let band = '';
  if (!r.done) { const { lo, hi } = gtgRange(r); band = `<span class="dgg-band" style="left:${pos(lo)}%;width:${Math.max(1.2, pos(hi) - pos(lo))}%"></span>`; }
  // markers that would sit on top of each other go up a row
  const rows = [];
  const marks = r.g.map((g, i) => {
    const h = gtgHint(g, r.ans), kind = h.hit ? 'hit' : h.heat, p = pos(g);
    let row = 0;
    while ((rows[row] || []).some(q => Math.abs(q - p) < 9)) row++;
    (rows[row] = rows[row] || []).push(p);
    const fresh = !r.done && i === r.g.length - 1;
    return `<span class="dgg-m dgg-${kind}${fresh ? ' dgg-new' : ''}" style="left:${p}%;--row:${row}" title="${gtgF(g)}">${dgMark(kind)}<b>${i + 1}</b></span>`;
  }).join('');
  const ans = r.done ? `<span class="dgg-ans" style="left:${pos(r.ans)}%"><i></i><b>${gtgF(r.ans)}</b></span>` : '';
  const legend = ['cold', 'warm', 'hot'].map(k => `<span class="dgg-k dgg-${k}">${dgMark(k)}<span>${DG_HEAT[k]}</span></span>`).join('');
  return `<div class="dgg${r.done ? ' dgg-done' : ''}" style="--dgg-rows:${Math.max(1, rows.length)}">
    <div class="dgg-scale" aria-hidden="true">${band}<span class="dgg-track"></span>${ticks.join('')}${marks}${ans}</div>
    <div class="dgg-legend" aria-hidden="true">${legend}</div>
  </div>`;
}
(function () {
  if (typeof gtgPlayHtml !== 'function') return;
  const _p = gtgPlayHtml;
  gtgPlayHtml = function () {
    const h = _p.apply(this, arguments);
    try {
      const r = gtgStore().results[_gtgKey];
      if (r && r.g && (r.g.length || r.done)) return dgGauge(r, _gtgKey) + h;
    } catch (e) { console.warn('[daily look]', e); }
    return h;
  };
})();

// The share picture: how warm each guess got, in order, from Cold to Right. No grade, no deck.
async function dgGtgDraw(r, key, size) {
  const g = await dgCanvas(size, DG_CV.gtg, `Guess the Grade #${gtgNumber(key)}`);
  if (!g) return null;
  const { x, sq, D, B, L, R } = g;
  const y0 = sq ? 280 : 182;
  x.font = `800 ${sq ? 92 : 76}px ${D}`; x.fillStyle = r.won ? DG_CV.gtg : GS45.text;
  x.fillText(gs45Fit(x, dgT(r.won ? `Got it in ${r.g.length} of ${GTG_TRIES}` : 'Not this time').toUpperCase(), R - L), L, y0);
  const st = gtgStreak();
  x.font = `400 ${sq ? 32 : 28}px ${B}`; x.fillStyle = GS45.text2;
  x.fillText(gs45Fit(x, dgT('A real tournament list, the same for everyone today.') + (st > 1 ? '  ·  ' + dgT(`${st} days in a row`) : ''), R - L), L, y0 + (sq ? 56 : 46));
  // The heat scale: four zones, Cold to Right, each guess a numbered marker in its zone.
  const zones = ['cold', 'warm', 'hot', 'hit'], zc = { cold: DG_CV.cold, warm: DG_CV.warm, hot: DG_CV.hot, hit: GS45.text };
  const zy = sq ? 640 : 404, zh = sq ? 20 : 16, gap = 10, zw = ((R - L) - gap * 3) / 4;
  zones.forEach((z, i) => {
    const zx = L + i * (zw + gap);
    x.globalAlpha = 0.28; x.fillStyle = zc[z]; dgRR(x, zx, zy, zw, zh, zh / 2); x.fill(); x.globalAlpha = 1;
    x.font = `700 ${sq ? 30 : 26}px ${D}`; x.fillStyle = zc[z];
    const t = dgT(DG_HEAT[z]).toUpperCase();
    x.fillText(t, zx + (zw - x.measureText(t).width) / 2, zy + zh + (sq ? 50 : 40));
  });
  const kinds = r.g.map(v => { const h = gtgHint(v, r.ans); return h.hit ? 'hit' : h.heat; });
  const ms = sq ? 56 : 46;
  zones.forEach((z, zi) => {
    const here = kinds.map((k, i) => ({ k, i })).filter(o => o.k === z);
    here.forEach((o, j) => {
      const zx = L + zi * (zw + gap), cx = zx + zw * (j + 1) / (here.length + 1), cy = zy - ms * 0.9;
      const col = zc[z];
      x.fillStyle = col; x.strokeStyle = col; x.lineWidth = sq ? 7 : 6;
      x.beginPath();
      if (z === 'cold') { x.arc(cx, cy, ms * 0.36, 0, Math.PI * 2); x.stroke(); }
      else if (z === 'warm') { x.moveTo(cx, cy - ms * 0.48); x.lineTo(cx + ms * 0.48, cy); x.lineTo(cx, cy + ms * 0.48); x.lineTo(cx - ms * 0.48, cy); x.closePath(); x.fill(); }
      else if (z === 'hot') { x.moveTo(cx, cy - ms * 0.5); x.lineTo(cx + ms * 0.52, cy + ms * 0.4); x.lineTo(cx - ms * 0.52, cy + ms * 0.4); x.closePath(); x.fill(); }
      else { dgRR(x, cx - ms * 0.42, cy - ms * 0.42, ms * 0.84, ms * 0.84, 6); x.fill(); }
      // the guess's number above its marker
      x.font = `700 ${sq ? 30 : 26}px ${D}`; x.fillStyle = GS45.text2;
      const t = String(o.i + 1); x.fillText(t, cx - x.measureText(t).width / 2, cy - ms * 0.62);
    });
  });
  dgCanvasFoot(g, 'Guess the grade of today\'s list. Can you get it?');
  return dgBlob(g.c);
}
(function () {
  if (typeof shareGtg !== 'function') return;
  shareGtg = async function (k) {
    const key = dailyOkKey(k) || dailyKey(), r = gtgStore().results[key];
    if (!r || !r.done) { showToast('Finish today\'s Guess the Grade first.'); return; }
    dgShareSheet({
      title: 'Share your result',
      hint: 'The picture shows how close each guess got, with no grade and no deck. The link opens today\'s game.',
      text: gtgShareText(r, key), url: shareBaseUrl() + '?ref=guess#guess', name: 'rdydeck-guess',
      alt: `Guess the Grade #${gtgNumber(key)}: ` + (r.won ? `got it in ${r.g.length} of ${GTG_TRIES}` : 'not this time'),
      draw: size => dgGtgDraw(r, key, size),
    });
  };
})();

// ═══ 3. Daily puzzle: the winning line as cards ═══
function dgPzRef(s, uid) {
  for (const P of s.players) for (const z of [P.hand, P.deck, P.discard]) { const r = z.find(y => y.uid === uid); if (r) return r.card; }
  for (const P of s.players) for (const m of pzS.E.mons(P)) { const r = m.energy.find(y => y.uid === uid); if (r) return r.card; }
  return null;
}
/** The card a play shows as, and the word under it. */
function dgPzStep(s, a) {
  const E = pzS.E, P = s.players[s.cur], monCard = id => { const m = E.mons(P).find(z => z.id === id); return m ? E.topOf(m).card : null; };
  switch (a.t) {
    case 'bench': return { c: dgPzRef(s, a.uid), w: 'Bench' };
    case 'evolve': return { c: dgPzRef(s, a.uid), w: 'Evolve' };
    case 'candy': return { c: dgPzRef(s, a.s2), w: 'Evolve' };
    case 'energy': return { c: dgPzRef(s, a.uid), w: 'Energy' };
    case 'tool': return { c: dgPzRef(s, a.uid), w: 'Tool' };
    case 'stadium': return { c: dgPzRef(s, a.uid), w: 'Stadium' };
    case 'trainer': return { c: dgPzRef(s, a.uid), w: 'Trainer' };
    case 'stadiumUse': return { c: s.stadium && s.stadium.ref.card, w: 'Stadium' };
    case 'ability': return { c: monCard(a.mon), w: 'Ability' };
    case 'handAbility': return { c: dgPzRef(s, a.uid), w: 'Ability' };
    case 'retreat': return { c: a.mon ? monCard(a.mon) : null, w: 'Retreat' };
    case 'attack': { const c = P.active ? E.topOf(P.active).card : null; return { c, w: 'Attack', x: c && c.attacks && c.attacks[a.i] ? c.attacks[a.i].name : '' }; }
  }
  return null;
}
(function () {
  if (typeof pzDo !== 'function') return;
  const _do = pzDo, _undo = pzUndo, _reset = pzReset;
  pzDo = function (i) {
    let step = null, len = 0;
    try {
      if (pzS && !pzS.over) {
        pzS.line = pzS.line || [];
        len = pzS.line.length;
        const a = pzS.E.legalActions(pzS.s, { why: true })[i];
        if (a && !a.why && !/^(pick|promote|end)$/.test(a.t)) { step = dgPzStep(pzS.s, a); if (step) step.label = pzLabel(pzS.s, a); }
      }
    } catch (e) { step = null; }
    const n0 = pzS ? pzS.hist.length : 0;
    const out = _do.apply(this, arguments);
    try {
      if (pzS && pzS.hist.length > n0) {
        pzS.hist[pzS.hist.length - 1].dgLine = len;
        if (step) { pzS.line.push(step); if (pzS.over) renderPuzzle(); }
      }
    } catch (_) {}
    return out;
  };
  pzUndo = function () {
    const h = pzS && pzS.hist.length ? pzS.hist[pzS.hist.length - 1] : null;
    const out = _undo.apply(this, arguments);
    if (h && pzS && pzS.line && typeof h.dgLine === 'number') pzS.line.length = h.dgLine;
    return out;
  };
  pzReset = function () { if (pzS) pzS.line = []; return _reset.apply(this, arguments); };
})();
function dgPzLine() {
  const L = (pzS && pzS.line) || [];
  if (!L.length) return '';
  return `<div class="dgz"><div class="dgz-t">Your winning line</div>
    <ol class="dgz-row">${L.map((st, i) => {
      const c = st.c || {};
      return `<li class="dgz-c" title="${esc(st.label || '')}">
        <span class="dgz-art">${c.img ? `<img src="${esc(c.img)}" alt="" loading="lazy" decoding="async">` : '<span class="pz-noimg"></span>'}<b>${i + 1}</b></span>
        <span class="dgz-w">${st.w}</span>
        <span class="dgz-n" data-no-tr>${esc(st.x || c.name || '')}</span>
      </li>`;
    }).join('')}</ol></div>`;
}
(function () {
  if (typeof pzResult !== 'function') return;
  const _r = pzResult;
  pzResult = function () {
    const h = _r.apply(this, arguments);
    try { if (pzS && pzS.E.goalMet(pzS.s)) return h + dgPzLine(); } catch (e) { console.warn('[daily look]', e); }
    return h;
  };
})();

// ═══ 4. Rare Pull: foil. The card you named sits on a dark tile with a thin foil edge in its
//     rarity's color. One slow sheen crosses the tile when it lands, then the card sways about 12
//     degrees each way while it sits, so the foil catches the light. Calm: no flashing, and all of it stops
//     with reduced motion. ═══
function dgRpCard(k, p) {
  // 3.4.27: the printing the top lists run (p), not the first card of that name
  if (p && p.s && p.no) return p;
  const a = k && rpData && rpData.art ? rpData.art.get(k) : null;
  if (a && a.s && a.no) return a;
  const c = k && rpData && rpData.kind ? rpData.kind.get(k) : null;
  return c && c.s && c.no ? c : null;
}
/** The card itself, with its glint. live: it sways while idle. */
function dgFoilCard(c, name, live) {
  return `<span class="dgf-card${live ? ' dgf-live' : ''}">${dgImg(c.s, c.no, 'dgf-img', name) || '<span class="dg-noimg"></span>'}<i class="dgf-glint" aria-hidden="true"></i></span>`;
}
(function () {
  if (typeof rpReveal !== 'function') return;
  const _rv = rpReveal, _end = rpEnd;
  rpReveal = function (p, pick) {
    const out = _rv.apply(this, arguments);
    try {
      const res = document.querySelector('#rp-body .rp-res');
      const fit = pick && pick.how === 'fit', ix = fit ? rpTierIx(pick.score) : 0;
      const c = pick && pick.k ? dgRpCard(pick.k, pick.p) : null;
      if (res) {
        res.classList.add('dgf', 'dgf-t' + ix);
        // a card that does not count still shows, dimmed and still, so you see what you named
        if (c) res.insertAdjacentHTML('afterbegin', `<div class="dgf-stage">${dgFoilCard(c, pick.n, fit)}</div>`);
        if (fit) res.insertAdjacentHTML('afterbegin', '<i class="dgf-sheen" aria-hidden="true"></i>');
        if (!c) res.classList.add('dgf-flat');
      }
    } catch (e) { console.warn('[daily look]', e); }
    return out;
  };
  rpEnd = function () {
    const picks = rpG ? rpG.picks.slice() : [];
    const first = rpG && rpG.first;
    const out = _end.apply(this, arguments);
    try {
      const body = document.getElementById('rp-body');
      const row = body && body.querySelector('.rp-end-row');
      if (row && picks.length) {
        row.classList.add('dgf-row');
        row.innerHTML = picks.map(x => {
          const fit = x.how === 'fit', ix = fit ? rpTierIx(x.score) : 0, t = rpTier(fit ? x.score : 0)[1];
          const c = fit && x.k ? dgRpCard(x.k, x.p) : null;
          const art = c ? (dgImg(c.s, c.no, 'dgf-img', x.n) || '<span class="dg-noimg"></span>') : rpGem(0);
          return `<span class="dgf-mini dgf-t${ix}${c ? '' : ' dgf-empty'}" title="${esc(t)}"><span class="dgf-mini-art">${art}</span><b>${fit ? x.score : 0}</b></span>`;
        }).join('');
      }
      // the best pull gets a foil tile of its own, in place of its line of text
      const best = picks.filter(x => x.how === 'fit').sort((a, b) => b.score - a.score)[0];
      const bc = best && best.k ? dgRpCard(best.k, best.p) : null;
      const line = body && body.querySelector('.rp-end-note b[data-no-tr]');
      if (bc && line) {
        const ix = rpTierIx(best.score);
        line.closest('p').outerHTML = `<div class="dgf dgf-t${ix} dgf-best"><i class="dgf-sheen" aria-hidden="true"></i>
          ${dgFoilCard(bc, best.n, true)}
          <div class="dgf-bt"><div class="dgf-k">Best pull</div><div class="dgf-n" data-no-tr>${esc(best.n)}</div><div class="dgf-tier">${esc(rpTier(best.score)[1])} <span data-no-tr>· +${best.score}</span></div></div>
        </div>`;
      }
      // home shows the day's best pull, so keep which card it was
      const r = rpStore().results[dailyKey()];
      if (first && r && best && !r.bk) { r.bk = best.k; r.bn = best.n; if (best.p) r.bp = best.p.s + ' ' + best.p.no; saveState(); }
    } catch (e) { console.warn('[daily look]', e); }
    return out;
  };
})();

// 3.4.32: Rare Pull's share picture: the score and the seven pulls, each a card in its rarity's
// color with its mark and points (the colors of the end screen). No card names or art, so today's
// prompts stay a surprise for friends. Save image downloads it; Share sends it with the score line.
const DG_RP_TIER = ['rgba(237,232,222,0.30)', '#bdb6a9', '#6aae6a', '#6f9fd0', '#b77ac4', '#d9b24a'];
/** A rarity mark on the canvas, like rpGem: a card outline with the tier's mark, in a box of s by s. */
function dgRpGem(x, ix, cx, cy, s, col) {
  const k = s / 24;
  x.save(); x.translate(cx - s / 2, cy - s / 2); x.scale(k, k);
  x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 1.6; x.lineJoin = 'round';
  dgRR(x, 5, 2.5, 14, 19, 2); x.stroke();
  const star = 'M12 8l1.5 3.2 3.4.4-2.5 2.3.7 3.4-3.1-1.8-3.1 1.8.7-3.4-2.5-2.3 3.4-.4z';
  if (ix === 0) { x.beginPath(); x.arc(12, 13, 3.2, 0, Math.PI * 2); x.stroke(); }
  else if (ix === 1) { x.beginPath(); x.arc(12, 13, 3.4, 0, Math.PI * 2); x.fill(); }
  else if (ix === 2) { x.fill(new Path2D('M12 8.6l4 4.4-4 4.4-4-4.4z')); }
  else if (ix === 3 || ix === 5) { x.fill(new Path2D(star)); }
  else if (ix === 4) { x.lineWidth = 1.3; x.stroke(new Path2D(star)); x.beginPath(); x.arc(12, 13, 1.3, 0, Math.PI * 2); x.fill(); }
  x.restore();
}
async function dgRpDraw(r, key, size) {
  const g = await dgCanvas(size, DG_CV.rp, `Rare Pull #${rpNumber(key)}`);
  if (!g) return null;
  const { x, sq, D, B, L, R } = g;
  const ps = (r.p || []).slice(0, RP_N);
  // the score, out of 700
  const y0 = sq ? 330 : 212;
  x.font = `800 ${sq ? 156 : 108}px ${D}`; x.fillStyle = GS45.text;
  const sc = String(r.score);
  x.fillText(sc, L - 4, y0);
  const scw = x.measureText(sc).width;
  x.font = `700 ${sq ? 60 : 44}px ${D}`; x.fillStyle = GS45.text2;
  x.fillText('/700', L + scw + 10, y0);
  // the best pull's rarity and the streak
  const top = Math.max(0, ...ps), st = typeof dgStreak === 'function' ? dgStreak() : 0;
  const parts = [];
  if (top > 0) parts.push(`${dgT('Best pull')}: ${dgT(rpTier(top)[1])} +${top}`);
  if (st > 1) parts.push(dgT(dgStreakText(st)));
  if (parts.length) {
    x.font = `400 ${sq ? 34 : 30}px ${B}`; x.fillStyle = GS45.text2;
    x.fillText(gs45Fit(x, parts.join('  ·  '), R - L), L, y0 + (sq ? 66 : 46));
  }
  // the seven pulls: a card per prompt, edged and marked in its rarity's color, points underneath
  const n = RP_N, gap = sq ? 18 : 20;
  const cw = Math.floor(((R - L) - gap * (n - 1)) / n), art = Math.round(cw * (sq ? 1.42 : 1.06)), strip = sq ? 64 : 50, ch = art + strip;
  const cy = sq ? 490 : 294;
  for (let i = 0; i < n; i++) {
    const v = ps[i] || 0, ix = v > 0 ? rpTierIx(v) : 0, col = DG_RP_TIER[ix], cx = L + i * (cw + gap);
    dgRR(x, cx, cy, cw, ch, 10);
    x.fillStyle = ix ? col : 'rgba(237,232,222,0.04)'; x.globalAlpha = ix ? 0.13 : 1; x.fill(); x.globalAlpha = 1;
    x.strokeStyle = col; x.lineWidth = ix ? 3 : 2; x.stroke();
    x.fillStyle = col; x.globalAlpha = ix ? 0.45 : 1; x.fillRect(cx + 2, cy + art, cw - 4, 2); x.globalAlpha = 1;
    dgRpGem(x, ix, cx + cw / 2, cy + art / 2, Math.min(cw * 0.62, art * 0.62), ix ? col : 'rgba(237,232,222,0.34)');
    x.font = `600 ${sq ? 34 : 28}px ${B}`; x.fillStyle = ix ? col : 'rgba(237,232,222,0.42)';
    const t = String(v);
    x.fillText(t, cx + (cw - x.measureText(t).width) / 2, cy + art + strip / 2 + (sq ? 12 : 10));
  }
  // the square picture has room for the rarity key under the row
  if (sq) {
    const ky = cy + ch + 100;
    x.font = `700 24px ${D}`;
    const keys = [1, 2, 3, 4, 5].map(i => { const t = gs45Fit(x, dgT(RP_TIERS[RP_TIERS.length - 1 - i][1]).toUpperCase(), 150); return { i, t, w: 46 + x.measureText(t).width }; });
    const gapK = Math.max(16, ((R - L) - keys.reduce((a, k) => a + k.w, 0)) / 4);
    let kx = L;
    keys.forEach(k => {
      const col = DG_RP_TIER[k.i];
      dgRpGem(x, k.i, kx + 18, ky - 9, 38, col);
      x.fillStyle = col; x.fillText(k.t, kx + 46, ky);
      kx += k.w + gapK;
    });
  }
  dgCanvasFoot(g, 'Same prompts for everyone. How rare can you go?');
  return dgBlob(g.c);
}
(function () {
  if (typeof rpShare !== 'function') return;
  rpShare = async function (k) {
    const key = dailyOkKey(k) || dailyKey(), r = rpStore().results[key];
    if (!r) { showToast('Play today\'s Rare Pull first.'); return; }
    // the score line without its last line (rdydeck.com): the link takes its place
    const text = rpShareText(r, key).split('\n').filter(l => l && l !== 'rdydeck.com').join('\n');
    dgShareSheet({
      title: 'Share your result',
      hint: 'The picture shows how rare each pull was, with no card names, so today\'s prompts stay a surprise.',
      text, url: shareBaseUrl() + '?ref=rarepull', name: 'rdydeck-rare-pull',
      alt: `Rare Pull #${rpNumber(key)}: ${r.score} of 700`,
      draw: size => dgRpDraw(r, key, size),
    });
  };
})();

// ═══ 5. Home: color edges, faded art and the ring ═══
/** The art behind each row. None of it gives a game away: the Daily challenge's deck is already
 *  named on its row, Rare Pull shows your own best pull once you have one, and the puzzle and
 *  Guess the Grade use a card that fits the game (Boss's Orders, Judge). */
function dgHomeArt(id) {
  try {
    if (id === 'daily-card') {
      const list = dailyPick(dailyKey()).list || '';
      const mons = [];
      let inMon = false;
      String(list).split('\n').forEach(l => {
        if (/^Pok[eé]mon/i.test(l)) { inMon = true; return; }
        if (/^(Trainer|Energy)/i.test(l)) { inMon = false; return; }
        const m = inMon && l.match(/^\d+\s+(.+?)\s+([A-Z0-9-]{2,5})\s+(\d+[a-z]?)\s*$/);
        if (m) mons.push({ n: m[1], s: m[2], no: m[3] });
      });
      const main = mons.find(m => /\bex$|^Mega /.test(m.n)) || mons[0];
      return main ? { s: main.s, no: main.no } : null;
    }
    if (id === 'puzzle-card') return { s: 'MEG', no: '114' };
    if (id === 'gtg-card') return { s: 'POR', no: '76' };
    if (id === 'rp-card') {
      const r = rpStore().results[dailyKey()];
      const bp = r && typeof r.bp === 'string' ? r.bp.split(' ') : null;
      const c = r && r.bk && typeof rpData !== 'undefined' && rpData ? dgRpCard(r.bk, bp && { s: bp[0], no: bp[1] }) : null;
      return c ? { s: c.s, no: c.no } : { s: 'MEG', no: '125' };
    }
  } catch (_) {}
  return null;
}
function dgHomeDress() {
  const ids = { 'daily-card': 'daily', 'puzzle-card': 'puzzle', 'rp-card': 'rp', 'gtg-card': 'gtg' };
  Object.keys(ids).forEach(id => {
    const el = document.getElementById(id), card = el && el.querySelector('.dc-card');
    if (!card) return;
    el.style.setProperty('--dg-c', DG_COL[ids[id]]);
    card.classList.add('dgh');
    const a = dgHomeArt(id), key = a ? a.s + ' ' + a.no : '';
    const old = card.querySelector('.dgh-art');
    if (old && old.dataset.k === key) return;
    if (old) old.remove();
    if (!a) return;
    const img = dgImg(a.s, a.no, '');
    if (img) card.insertAdjacentHTML('afterbegin', `<span class="dgh-art" data-k="${esc(key)}" aria-hidden="true">${img}</span>`);
  });
}
function dgRing(done, all) {
  const C = 2 * Math.PI * 9, f = all ? done / all : 0;
  return `<svg class="dgh-ring" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" class="dgh-ring-bg"/><circle cx="12" cy="12" r="9" class="dgh-ring-fg" style="stroke-dasharray:${C.toFixed(2)};stroke-dashoffset:${(C * (1 - f)).toFixed(2)}"/></svg>`;
}
(function () {
  if (typeof dgRenderHead !== 'function') return;
  const _h = dgRenderHead;
  dgRenderHead = function () {
    const out = _h.apply(this, arguments);
    try {
      dgHomeDress();
      const n = document.getElementById('dg51-n');
      if (n) {
        const played = dgPlayedToday(), ids = Object.keys(played), done = ids.filter(k => played[k]).length;
        let ring = n.parentElement.querySelector('.dgh-ring');
        if (!ring) { n.insertAdjacentHTML('beforebegin', dgRing(0, ids.length)); ring = n.parentElement.querySelector('.dgh-ring'); }
        // the ring moves from where it was, so a game played today fills it with a short slide
        const fg = ring.querySelector('.dgh-ring-fg'), C = 2 * Math.PI * 9;
        if (fg) fg.style.strokeDashoffset = (C * (1 - done / ids.length)).toFixed(2);
        ring.classList.toggle('all', done === ids.length);
      }
    } catch (e) { console.warn('[daily look]', e); }
    return out;
  };
  if (document.getElementById('dg51-n')) { try { dgRenderHead(); } catch (_) {} }
})();

// ── Styles ──
(function () {
  const css = `
  /* 1. Daily challenge: Prize cards that turn over */
  .dgp-grid { perspective:900px; }
  .dgp { position:relative; display:block; width:100%; aspect-ratio:2.5/3.5; padding:0; border:0; background:none; cursor:pointer; font:inherit; color:inherit; border-radius:4px; }
  .dgp.dgp-found { cursor:default; }
  .dgp-in { position:absolute; inset:0; transform-style:preserve-3d; transition:transform .38s cubic-bezier(.2,.7,.2,1); }
  .dgp.dgp-up .dgp-in { transform:rotateY(180deg); }
  .dgp-back, .dgp-face { position:absolute; inset:0; border-radius:4px; overflow:hidden; backface-visibility:hidden; -webkit-backface-visibility:hidden; }
  .dgp-back { display:flex; align-items:center; justify-content:center; background:var(--surface-2); border:2px solid var(--mark); }
  .dgp-back svg { width:46%; height:auto; fill:none; stroke-linejoin:round; stroke-linecap:round; }
  .dgp-back rect { stroke:var(--line-2); stroke-width:2.5; }
  .dgp-back path { stroke:var(--mark); stroke-width:3.5; }
  .dgp-back b { position:absolute; top:6px; left:8px; font-family:var(--mono); font-size:var(--fs-xs); font-weight:500; color:var(--text-3); }
  .dgp-face { transform:rotateY(180deg); background:var(--surface-2); border:2px solid var(--line-2); }
  .dgp-found .dgp-face { border-color:var(--electric); }
  .dgp-face img { width:100%; height:100%; object-fit:cover; display:block; }
  .dgp-tag { position:absolute; top:6px; left:6px; z-index:1; padding:0.1rem 0.4rem; border-radius:2px; font-family:var(--display); font-weight:700; font-size:0.72rem; letter-spacing:0.04em; text-transform:uppercase; background:var(--electric); color:#131210; }
  .dgp-miss .dgp-tag { background:var(--surface); color:var(--text); border:1px solid var(--line-2); }
  .dgp-hint { position:absolute; left:0; right:0; bottom:8px; text-align:center; font-size:var(--fs-xs); font-weight:600; color:var(--text-2); pointer-events:none; }
  .dgp:focus-visible { outline:2px solid var(--mark); outline-offset:2px; }
  #prize-reveal-area { position:relative; }
  #prize-reveal-area .dgp-all { display:flex; width:max-content; margin:-0.7rem 0 0.35rem auto; }
  #prize-reveal-area .dgp-all[hidden] { display:none; }

  /* 2. Guess the Grade: the gauge */
  .dgg { margin:0 0 0.7rem; }
  .dgg-scale { position:relative; height:calc(var(--dgg-rows) * 22px + 34px); margin:0 10px; }
  .dgg-track { position:absolute; left:0; right:0; bottom:20px; height:4px; border-radius:2px; background:var(--line-2); }
  .dgg-band { position:absolute; bottom:18px; height:8px; border-radius:4px; background:color-mix(in srgb, var(--water) 45%, transparent); transition:left .3s ease-out, width .3s ease-out; }
  .dgg-tick { position:absolute; bottom:0; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; }
  .dgg-tick i { width:1px; height:8px; background:var(--line-2); margin-bottom:2px; }
  .dgg-tick b { font-family:var(--mono); font-size:0.7rem; font-weight:500; color:var(--text-3); line-height:1; }
  .dgg-m { position:absolute; bottom:calc(28px + var(--row) * 22px); transform:translateX(-50%); display:flex; align-items:center; gap:1px; }
  .dgg-m svg { width:15px; height:15px; display:block; }
  .dgg-m b { font-family:var(--mono); font-size:0.65rem; font-weight:500; color:var(--text-3); }
  .dgg-cold { color:var(--info); } .dgg-warm { color:var(--electric); } .dgg-hot { color:var(--mark); } .dgg-hit { color:var(--mark); }
  .dgg-new { animation:dgUp .3s cubic-bezier(.2,.7,.2,1) both; }
  .dgg-ans { position:absolute; bottom:14px; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; animation:dgUp .35s cubic-bezier(.2,.7,.2,1) both; }
  .dgg-ans i { width:10px; height:16px; border:2px solid var(--mark); border-radius:2px; background:var(--surface); }
  .dgg-done .dgg-tick b { visibility:hidden; }
  .dgg-ans b { position:absolute; top:100%; margin-top:2px; font-family:var(--mono); font-size:0.75rem; font-weight:700; color:var(--mark); }
  .dgg-legend { display:flex; gap:0.9rem; justify-content:center; flex-wrap:wrap; margin-top:0.35rem; font-size:var(--fs-xs); color:var(--text-2); }
  .dgg-k { display:inline-flex; align-items:center; gap:0.25rem; }
  .dgg-k svg { width:12px; height:12px; }
  .dgg-k span { color:var(--text-2); }

  /* 3. Daily puzzle: the winning line */
  .dgz { margin-top:0.6rem; }
  .dgz-t { font-family:var(--display); font-weight:700; text-transform:uppercase; letter-spacing:0.04em; font-size:var(--fs-sm); color:var(--text-2); margin-bottom:0.45rem; }
  .dgz-row { list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(auto-fill, minmax(74px, 1fr)); gap:0.5rem; }
  .dgz-c { display:flex; flex-direction:column; gap:0.15rem; min-width:0; animation:dgUp .3s cubic-bezier(.2,.7,.2,1) both; }
  ${[1, 2, 3, 4, 5, 6, 7, 8].map(i => `.dgz-c:nth-child(${i}) { animation-delay:${(i - 1) * 60}ms; }`).join(' ')}
  .dgz-art { position:relative; display:block; aspect-ratio:2.5/3.5; border-radius:3px; overflow:hidden; border:2px solid var(--grass); background:var(--surface-2); }
  .dgz-art img { width:100%; height:100%; object-fit:cover; display:block; }
  .dgz-art b { position:absolute; top:3px; left:3px; min-width:1.3em; padding:0 0.2rem; border-radius:2px; background:var(--grass); color:#131210; font-family:var(--mono); font-size:0.7rem; text-align:center; }
  .dgz-w { font-family:var(--display); font-weight:700; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.03em; color:var(--grass); line-height:1.15; }
  .dgz-n { font-size:0.72rem; color:var(--text-2); line-height:1.2; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }

  /* 4. Rare Pull: foil */
  .dgf { --dgf:var(--line-2); }
  .dgf-t1 { --dgf:var(--text-3); } .dgf-t2 { --dgf:var(--grass); } .dgf-t3 { --dgf:var(--water); } .dgf-t4 { --dgf:var(--psychic); } .dgf-t5 { --dgf:var(--electric); }
  html:not(#z) .rp-res.dgf { position:relative; overflow:hidden; text-align:center; border:1.5px solid transparent;
    background:linear-gradient(var(--surface), var(--surface)) padding-box,
      linear-gradient(135deg, var(--dgf), color-mix(in srgb, var(--dgf) 35%, var(--surface)) 45%, var(--dgf) 70%, color-mix(in srgb, var(--dgf) 45%, var(--surface))) border-box; }
  html:not(#z) .rp-res.dgf-t0 { border-color:var(--line-2); background:var(--surface); }
  .dgf > :not(.dgf-sheen) { position:relative; z-index:1; }
  .dgf-sheen { position:absolute; inset:0; z-index:0; pointer-events:none; overflow:hidden; }
  .dgf-sheen::before { content:''; position:absolute; top:0; bottom:0; left:-100%; width:300%;
    background:linear-gradient(115deg, transparent 38%, color-mix(in srgb, var(--dgf) 22%, transparent) 46%, rgba(255,255,255,.06) 50%, color-mix(in srgb, var(--dgf) 16%, transparent) 54%, transparent 62%);
    transform:translateX(34%); animation:dgfSweep 1.8s cubic-bezier(.3,.6,.2,1) .25s both; }
  .dgf-stage { display:flex; justify-content:center; padding:0.2rem 0 0.6rem; perspective:700px; }
  .dgf-card { position:relative; display:block; width:clamp(108px, 30vw, 156px); aspect-ratio:2.5/3.5; border-radius:6px; overflow:hidden; background:var(--surface-2);
    box-shadow:0 10px 24px rgba(0,0,0,.45), 0 0 0 1px color-mix(in srgb, var(--dgf) 55%, transparent); animation:dgUp .35s cubic-bezier(.2,.7,.2,1) both; }
  .dgf-card .dgf-img, .dgf-card .dg-noimg { width:100%; height:100%; object-fit:cover; display:block; }
  .dgf-t0 .dgf-card { width:clamp(88px, 26vw, 112px); }
  .dgf-t0 .dgf-card img { opacity:0.5; }
  .dgf-glint { position:absolute; top:0; bottom:0; left:-100%; width:300%; pointer-events:none; opacity:0;
    background:linear-gradient(105deg, transparent 38%, rgba(255,255,255,.13) 47%, color-mix(in srgb, var(--dgf) 30%, transparent) 52%, transparent 62%); }
  /* the idle sway: a few degrees, slow, and the glint moves with it */
  .dgf-live { animation:dgUp .35s cubic-bezier(.2,.7,.2,1) both, dgfTilt 7s ease-in-out 1.4s infinite; transform-origin:50% 60%; backface-visibility:hidden; }
  .dgf-live .dgf-glint { opacity:1; animation:dgfGlint 7s ease-in-out 1.4s infinite; transform:translateX(-20%); }
  .dgf .rp-res-gem { display:none; }
  .dgf .rp-res-top { justify-content:center; }
  .dgf .rp-res-n { font-size:1.35rem; }
  .dgf .rp-res-tier { color:var(--dgf); }
  .dgf-t0 .rp-res-tier { color:var(--text-2); }
  .dgf .rp-res-pts { position:absolute; top:-0.1rem; right:0; color:var(--dgf); }
  .dgf-t0 .rp-res-pts { color:var(--text-3); }
  .dgf:not(.dgf-flat) .rp-res-top { position:static; }
  .dgf:not(.dgf-flat) .rp-res-pts { top:0.75rem; right:0.9rem; }
  .dgf-flat .rp-res-top { padding-right:2.6rem; }
  .dgf .rp-facts { text-align:left; }
  /* end of the day: seven small tiles, then the best pull */
  .dgf-row { display:grid !important; grid-template-columns:repeat(7, minmax(0, 54px)); gap:0.4rem; justify-content:center; width:100%; }
  .dgf-mini { --dgf:var(--line-2); display:flex; flex-direction:column; min-width:0; border:1.5px solid var(--dgf); border-radius:5px; overflow:hidden; background:var(--surface); animation:dgUp .3s cubic-bezier(.2,.7,.2,1) both; }
  .dgf-mini.dgf-t1 { --dgf:var(--text-3); } .dgf-mini.dgf-t2 { --dgf:var(--grass); } .dgf-mini.dgf-t3 { --dgf:var(--water); } .dgf-mini.dgf-t4 { --dgf:var(--psychic); } .dgf-mini.dgf-t5 { --dgf:var(--electric); }
  ${[1, 2, 3, 4, 5, 6, 7].map(i => `.dgf-mini:nth-child(${i}) { animation-delay:${(i - 1) * 60}ms; }`).join(' ')}
  .dgf-mini-art { display:flex; align-items:center; justify-content:center; aspect-ratio:2.5/3; overflow:hidden; background:var(--surface-2); color:var(--text-3); }
  .dgf-mini-art img, .dgf-mini-art .dg-noimg { width:100%; height:100%; object-fit:cover; object-position:50% 18%; display:block; }
  .dgf-mini-art .rp-gem { width:55%; height:auto; opacity:0.5; }
  .dgf-mini b { font-family:var(--mono); font-weight:500; font-size:0.78rem; line-height:1; padding:0.28rem 0; text-align:center; color:var(--dgf); border-top:1px solid color-mix(in srgb, var(--dgf) 45%, transparent); }
  .dgf-mini.dgf-t0 b { color:var(--text-3); }
  .dgf-best { position:relative; overflow:hidden; display:flex; align-items:center; gap:0.9rem; width:100%; max-width:420px; padding:0.8rem 0.95rem; border-radius:var(--r-lg); text-align:left; border:1.5px solid transparent; perspective:600px;
    background:linear-gradient(var(--surface), var(--surface)) padding-box,
      linear-gradient(135deg, var(--dgf), color-mix(in srgb, var(--dgf) 35%, var(--surface)) 45%, var(--dgf) 70%, color-mix(in srgb, var(--dgf) 45%, var(--surface))) border-box; }
  .dgf-best .dgf-card { width:64px; flex-shrink:0; border-radius:4px; box-shadow:0 6px 14px rgba(0,0,0,.4), 0 0 0 1px color-mix(in srgb, var(--dgf) 55%, transparent); }
  .dgf-bt { min-width:0; }
  .dgf-k { font-family:var(--display); font-weight:700; text-transform:uppercase; letter-spacing:0.05em; font-size:var(--fs-xs, 0.8rem); color:var(--text-3); }
  .dgf-n { font-family:var(--display); font-weight:800; font-size:1.2rem; line-height:1.15; color:var(--text); }
  .dgf-tier { font-family:var(--display); font-weight:700; text-transform:uppercase; letter-spacing:0.04em; font-size:var(--fs-sm); color:var(--dgf); }
  @keyframes dgfSweep { from { transform:translateX(34%); } to { transform:translateX(-34%); } }
  @keyframes dgfTilt { 0%, 100% { transform:rotateY(-12deg) rotateX(4deg); } 50% { transform:rotateY(12deg) rotateX(-4deg); } }
  @keyframes dgfGlint { 0%, 100% { transform:translateX(-20%); } 50% { transform:translateX(20%); } }
  .dg-noimg { display:block; width:100%; height:100%; background:var(--surface-2); }
  .dg-noimg span { display:none; }

  /* 5. Home: a color edge, faded art and the ring */
  html:not(#z) .dg51-list .dc-card.dgh { position:relative; overflow:hidden; padding-left:0.7rem; box-shadow:inset 3px 0 0 var(--dg-c); }
  .dgh > :not(.dgh-art) { position:relative; z-index:1; }
  .dgh-art { position:absolute; top:0; bottom:0; right:0; width:58%; pointer-events:none; z-index:0; opacity:0.2;
    -webkit-mask-image:linear-gradient(90deg, transparent, #000 70%); mask-image:linear-gradient(90deg, transparent, #000 70%); }
  .dgh-art img { width:100%; height:100%; object-fit:cover; object-position:50% 22%; display:block; }
  body[data-theme="light"] .dgh-art { opacity:0.16; }
  html:not(#z) .dg51-list .dgh .dc-ic { color:var(--dg-c); }
  html:not(#z) .dg51-list > [data-dg-done] .dgh .dc-ic { color:var(--text-3); }
  .dg51-list > [data-dg-done] .dgh-art { opacity:0.1; }
  .dgh-ring { width:20px; height:20px; flex-shrink:0; transform:rotate(-90deg); }
  .dgh-ring circle { fill:none; stroke-width:3; }
  .dgh-ring-bg { stroke:var(--line-2); }
  .dgh-ring-fg { stroke:var(--mark); stroke-linecap:round; transition:stroke-dashoffset .4s cubic-bezier(.2,.7,.2,1); }
  .dg51-head .dgh-ring + .dg51-n { margin-left:-0.4rem; }

  @keyframes dgUp { from { opacity:0; transform:translate(var(--dg-x, 0), 6px); } to { opacity:1; transform:translate(var(--dg-x, 0), 0); } }
  .dgg-m, .dgg-ans { --dg-x:-50%; }
  @media (prefers-reduced-motion:reduce) {
    .dgp-in, .dgg-band, .dgh-ring-fg { transition:none; }
    .dgg-new, .dgg-ans, .dgz-c, .dgf-card, .dgf-live, .dgf-live .dgf-glint, .dgf-sheen::before, .dgf-mini { animation:none; }
    .dgf-sheen { display:none; }
    .dgf-live { transform:none; }
    .dgf-live .dgf-glint { opacity:0.5; transform:none; }
  }
  `;
  const st = document.createElement('style'); st.id = 'dg-look-css'; st.textContent = css; document.head.appendChild(st);
})();
