// Daily puzzle extras (3.3.x):
//  1. Pick cards one at a time when a search, a discard or a pick from the discard pile has many
//     possible answers (Cyrano can have over 100), instead of one button per combination.
//  2. Share your score against the best possible line, as a picture plus a link.
// Loaded after core.js. Reads pzS, the puzzle screen state core.js keeps.

/* ---------------- 1. Pick cards one at a time ---------------- */
const PZ_PICK_MAX_BUTTONS = 8; // up to this many answers stay as plain buttons
const PZ_PICK_KINDS = { search: 1, recover: 1, cost: 1 };
/** The card behind a uid in the current player's hand, deck or discard pile. */
function pzPickRef(s, uid) {
  const P = s.players[s.cur];
  for (const z of [P.deck, P.hand, P.discard]) { const r = z.find(y => y.uid === uid); if (r) return r; }
  return null;
}
const pzPickKeys = (s, v) => v.map(u => { const r = pzPickRef(s, u); return r ? r.card.key : '?'; });
const pzPickCount = keys => keys.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
const pzPickHas = (big, small) => Object.keys(small).every(k => (big[k] || 0) >= small[k]);
const pzPickSame = (a, b) => pzPickHas(a, b) && pzPickHas(b, a);
/** Is this choice one to show as a pick list? */
function pzPickWanted(s, acts) {
  const A = s.pending && s.pending.ask;
  return !!(A && PZ_PICK_KINDS[A.kind] && acts.length > PZ_PICK_MAX_BUTTONS && acts.every(a => Array.isArray(a.v)));
}
function pzPickState(s) {
  if (!pzS.pick || pzS.pick.s !== s) pzS.pick = { s, sel: [] };
  return pzS.pick;
}
/** The pick list: a chip per card, tap to add a copy, and one button to confirm. */
function pzPickHTML(s, acts, tools) {
  const st = pzPickState(s), sel = pzPickCount(st.sel);
  const opts = acts.map((a, i) => ({ i, c: pzPickCount(pzPickKeys(s, a.v)), n: a.v.length }));
  const cards = new Map();
  opts.forEach(o => Object.keys(o.c).forEach(k => {
    if (!cards.has(k)) { const a = acts[o.i], u = a.v.find(x => { const r = pzPickRef(s, x); return r && r.card.key === k; }); cards.set(k, { card: pzPickRef(s, u).card, max: 0 }); }
    cards.get(k).max = Math.max(cards.get(k).max, o.c[k]);
  }));
  const most = Math.max(...opts.map(o => o.n));
  const canAdd = k => { const t = Object.assign({}, sel); t[k] = (t[k] || 0) + 1; return opts.some(o => pzPickHas(o.c, t)); };
  const match = opts.find(o => pzPickSame(o.c, sel));
  const chosen = st.sel.length;
  let h = `<div class="pz-q">${pzAskText(s)}</div>`;
  h += `<div class="pz-s pz-pk-hint">Tap a card to add it. Up to ${most}. Tap again for another copy, or to take it back.</div><div class="pz-pk">`;
  [...cards].forEach(([k, x]) => {
    const n = sel[k] || 0, add = canAdd(k);
    h += `<button class="pz-chip pz-pk-c${n ? ' on' : ''}${!n && !add ? ' off' : ''}" onclick="pzPickTap('${esc(k)}')" ${!n && !add ? 'disabled' : ''}>${n ? `<b>${n}</b> ` : ''}${esc(x.card.name)}</button>`;
  });
  h += `</div><div class="pz-btns pz-pk-go">`;
  h += `<button class="btn btn-primary pz-b" onclick="pzPickGo()" ${match ? '' : 'disabled'}>${chosen ? `Take ${chosen} card${chosen === 1 ? '' : 's'}` : opts.some(o => !o.n) ? 'Take nothing' : 'Choose cards'}</button>`;
  if (chosen) h += `<button class="btn btn-ghost pz-b" onclick="pzPickClear()">Clear</button>`;
  return h + `</div>` + tools;
}
function pzPickTap(k) {
  if (!pzS || !pzS.pick) return;
  const s = pzS.s, st = pzPickState(s), sel = pzPickCount(st.sel);
  const acts = pzS.E.legalActions(s, { why: true });
  const t = Object.assign({}, sel); t[k] = (t[k] || 0) + 1;
  const fits = acts.some(a => Array.isArray(a.v) && pzPickHas(pzPickCount(pzPickKeys(s, a.v)), t));
  if (fits) st.sel.push(k);
  else st.sel = st.sel.filter(x => x !== k); // no room for another copy: tapping takes it back
  renderPuzzle();
}
function pzPickClear() { if (pzS && pzS.pick) { pzS.pick.sel = []; renderPuzzle(); } }
function pzPickGo() {
  if (!pzS || !pzS.pick) return;
  const s = pzS.s, sel = pzPickCount(pzS.pick.sel);
  const acts = pzS.E.legalActions(s, { why: true });
  const i = acts.findIndex(a => Array.isArray(a.v) && pzPickSame(pzPickCount(pzPickKeys(s, a.v)), sel));
  if (i < 0) return;
  pzS.pick = null;
  pzDo(i);
}

/* ---------------- 2. Share your score against the best ---------------- */
let _pz83 = null;
/** The board a day had, from the pack (the best line for results saved before 3.3.6). */
async function pzBestFor(key) {
  try {
    const kit = await loadPuzzleKit(), list = kit.pack.puzzles;
    const p = list[(puzzleBoardDay(key) - 1) % list.length];
    return p ? { best: p.moves, mine: p.from && p.from.mine, theirs: p.from && p.from.theirs } : null;
  } catch (_) { return null; }
}
/** Your result in words: the headline, how it compares with the best line, and a color. */
function pzScoreWords(r, best) {
  if (r.won) {
    const b = best ? Math.min(best, r.moves) : null, over = b ? r.moves - b : null;
    return { won: true, plays: r.moves, best: b, over,
      head: over === 0 ? 'Shortest win' : over === 1 ? '1 play over the best' : over > 1 ? `${over} plays over the best` : 'Won',
      col: over === 0 ? GS45.band['Tournament-ready'] : GS45.band['Strong'] };
  }
  return { won: false, plays: 0, best: best || null, over: null, head: r.peek ? 'Looked at the answer' : 'No win on the first try', col: GS45.band['Fixable'] };
}
function pzShareTextFor(r, key, W) {
  const st = puzzleStats(), runs = puzzleStreakText(st), num = r.num || puzzleNumber(key);
  const score = W.won ? `won this turn in ${W.plays} play${W.plays === 1 ? '' : 's'}` + (W.best ? (W.over === 0 ? ', the shortest win' : `. Best possible: ${W.best}`) : '')
    : (r.peek ? 'I needed the answer today' : 'no win on my first try') + (W.best ? `. Best possible: ${W.best} play${W.best === 1 ? '' : 's'}` : '');
  return `RdyDeck Daily Puzzle, my #${num}: ${score}${runs ? '. ' + runs.charAt(0).toUpperCase() + runs.slice(1) : ''}. Same board for everyone today. Can you match it?`;
}
async function pz83Draw(g, size) {
  try {
    if (document.fonts && document.fonts.load) await Promise.all([
      document.fonts.load('800 100px "RD Display"'), document.fonts.load('700 40px "RD Display"'),
      document.fonts.load('600 40px "RD Body"'), document.fonts.load('400 30px "RD Body"')]);
  } catch (_) {}
  const [W, H] = GS261_SIZES[size] || GS261_SIZES.wide, sq = size === 'square', S = g.W;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  if (!x) return null; // no canvas here: the link and text still share
  const D = '"RD Display", "Arial Narrow", sans-serif', B = '"RD Body", system-ui, sans-serif';
  const L = 64, R = W - 64, k = sq ? 1.18 : 1;
  x.fillStyle = GS45.bg; x.fillRect(0, 0, W, H);
  x.fillStyle = S.col; x.fillRect(0, 0, W, 8);
  x.textBaseline = 'alphabetic';
  // Logo: the Ready Check mark, then RDY in red and DECK in white (as on the grade card).
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
  // Top right: which puzzle.
  x.font = `700 ${sq ? 34 : 30}px ${D}`; x.fillStyle = GS45.text2;
  const tag = `DAILY PUZZLE #${g.num}`;
  x.fillText(tag, R - x.measureText(tag).width, ly);

  // The headline and the board's two decks.
  const y0 = sq ? 300 : 192;
  x.font = `800 ${sq ? 92 : 76}px ${D}`; x.fillStyle = S.col;
  x.fillText(gs45Fit(x, S.head.toUpperCase(), R - L), L, y0);
  if (g.decks) { x.font = `400 ${sq ? 32 : 28}px ${B}`; x.fillStyle = GS45.text2; x.fillText(gs45Fit(x, g.decks, R - L), L, y0 + (sq ? 56 : 46)); }

  // Your line against the best: two numbers, then a bar of plays.
  const ny = sq ? 640 : 392, colW = sq ? 440 : 360;
  const stat = (lbl, val, unit, px, col) => {
    x.font = `600 ${sq ? 28 : 24}px ${B}`; x.fillStyle = GS45.text2; x.fillText(lbl, px, ny - (sq ? 118 : 100));
    x.font = `800 ${sq ? 150 : 124}px ${D}`; x.fillStyle = col; x.fillText(val, px - 4, ny);
    const vw = x.measureText(val).width;
    if (unit) { x.font = `700 ${sq ? 40 : 34}px ${D}`; x.fillStyle = GS45.text2; x.fillText(unit, px + vw + 10, ny); }
  };
  const pw = n => n === 1 ? 'PLAY' : 'PLAYS';
  // No win: only the best line shows, and the bar outlines its length.
  if (S.won) stat('Your line', String(S.plays), pw(S.plays), L, S.col);
  if (S.best) stat('Best possible', String(S.best), pw(S.best), S.won ? L + colW : L, GS45.text);
  // The bar: one block per play. Plays inside the best line in the result color, extra ones in amber,
  // and the best line's length marked with outlines when you didn't win.
  const n = Math.max(S.plays, S.best || 0);
  if (n) {
    const by = ny + (sq ? 60 : 44), bh = sq ? 34 : 26, gap = sq ? 12 : 10;
    const bw = Math.min(sq ? 110 : 96, ((R - L) - gap * (n - 1)) / n);
    for (let i = 0; i < n; i++) {
      const bx = L + i * (bw + gap), r = Math.round(bh * 0.28);
      x.beginPath(); if (x.roundRect) x.roundRect(bx, by, bw, bh, r); else x.rect(bx, by, bw, bh);
      if (i < S.plays) { x.fillStyle = S.best && i >= S.best ? GS45.band['Needs work'] : S.col; x.fill(); }
      else { x.strokeStyle = 'rgba(237,232,222,0.32)'; x.lineWidth = 3; x.stroke(); }
    }
  }

  // Footer, as on the grade card.
  const lineY = sq ? 920 : 522;
  x.fillStyle = GS45.line; x.fillRect(L, lineY, W - 128, 2);
  const fs = sq ? 30 : 26, t1 = lineY + (sq ? 82 : 50);
  const site = 'rdydeck.com';
  x.font = `600 ${fs + 2}px ${B}`; x.fillStyle = GS45.text;
  const siteW = x.measureText(site).width; x.fillText(site, R - siteW, t1);
  x.font = `400 ${sq ? fs - 4 : fs}px ${B}`; x.fillStyle = GS45.text2;
  x.fillText(gs45Fit(x, 'Same board for everyone today. Can you match it?', R - L - siteW - 32), L, t1);
  x.font = `400 ${sq ? 18 : 16}px ${B}`; x.fillStyle = GS45.text2;
  x.fillText(gs45Fit(x, 'Unofficial fan tool, not affiliated with The Pokémon Company or Nintendo.', W - 128), L, H - (sq ? 22 : 12));
  return new Promise(res => { try { c.toBlob(b => res(b), 'image/png'); } catch (_) { res(null); } });
}
const pz83Name = size => size === 'square' ? 'rdydeck-puzzle-square.png' : 'rdydeck-puzzle.png';
/** Share your puzzle result: a picture of your score next to the best line, a link and the text. */
async function pzShareScore(k) {
  const key = dailyOkKey(k) || dailyKey(), r = puzzleStore().results[key];
  if (!r) { showToast('Play today\'s puzzle first.'); return; }
  const url = shareBaseUrl() + '?ref=puzzle#puzzle';
  let size = 'wide'; try { size = safeLocalGet(GS261_KEY) === 'square' ? 'square' : 'wide'; } catch (_) {}
  const canShare = !!navigator.share;
  const opt = s => `<div class="mode-opt${size === s ? ' active' : ''}" data-sz="${s}" onclick="pz83SetSize('${s}')">${s === 'wide' ? 'Wide' : 'Square'}</div>`;
  if (_pz83 && _pz83.img) { try { URL.revokeObjectURL(_pz83.img); } catch (_) {} }
  _pz83 = { key, r, url, size, text: '', file: null, img: '', tok: 0 };
  const g = _pz83;
  openSheet(`<div class="modal-title">Share your puzzle score</div>
    <div class="seg gs261-seg pz83-seg" role="group" aria-label="Picture size">${opt('wide')}${opt('square')}</div>
    <div class="gs261-pic" id="pz83-pic" style="aspect-ratio:${GS261_SIZES[size].join(' / ')}"><span>Making your card</span></div>
    <div class="modal-hint" style="margin-bottom:0.9rem">The link opens today's puzzle, so friends play the same board.</div>
    <div class="modal-actions gs45-actions">
      <button class="btn" id="pz83-save" onclick="pz83Save()" disabled>${ic23('save')}Save image</button>
      <button class="btn" onclick="pz83Copy()">${ic23('copy')}Copy link</button>
      ${canShare ? `<button class="btn btn-primary" onclick="pz83Share()">${ic23('share')}Share</button>` : ''}
    </div>`);
  const here = pzS && pzS.key === key ? { best: pzS.p.moves, mine: pzS.p.from && pzS.p.from.mine, theirs: pzS.p.from && pzS.p.from.theirs } : null;
  const info = here || await pzBestFor(key);
  if (g !== _pz83) return;
  g.W = pzScoreWords(r, r.best || (info && info.best));
  g.num = r.num || puzzleNumber(key);
  g.decks = info && info.mine && info.theirs ? `${info.mine} against ${info.theirs}` : '';
  g.text = pzShareTextFor(r, key, g.W);
  g.alt = `Daily puzzle #${g.num}: ${g.W.head}` + (g.W.best ? `, best possible ${g.W.best} plays` : '');
  pz83Render();
}
async function pz83Render() {
  const g = _pz83; if (!g || !g.W) return;
  const tok = ++g.tok;
  const blob = await pz83Draw(g, g.size);
  if (g !== _pz83 || tok !== g.tok) return;
  if (g.img) { try { URL.revokeObjectURL(g.img); } catch (_) {} }
  g.file = blob && typeof File !== 'undefined' ? new File([blob], pz83Name(g.size), { type: 'image/png' }) : null;
  g.img = blob ? URL.createObjectURL(blob) : '';
  const pic = document.getElementById('pz83-pic');
  if (pic) pic.innerHTML = g.img ? `<img class="gs45-img" src="${g.img}" alt="${esc(g.alt)}">` : '<span>The picture could not be made on this device. The link still works.</span>';
  const sv = document.getElementById('pz83-save'); if (sv) sv.disabled = !g.img;
}
function pz83SetSize(s) {
  const g = _pz83; if (!g || !GS261_SIZES[s] || g.size === s) return;
  g.size = s;
  try { safeLocalSet(GS261_KEY, s); } catch (_) {}
  document.querySelectorAll('.pz83-seg .mode-opt').forEach(el => el.classList.toggle('active', el.dataset.sz === s));
  const pic = document.getElementById('pz83-pic');
  if (pic) { pic.style.aspectRatio = GS261_SIZES[s].join(' / '); pic.innerHTML = '<span>Making your card</span>'; }
  const sv = document.getElementById('pz83-save'); if (sv) sv.disabled = true;
  pz83Render();
}
async function pz83Share() {
  const g = _pz83; if (!g || !g.text) return;
  try {
    if (g.file && navigator.canShare && navigator.canShare({ files: [g.file] })) { await navigator.share({ files: [g.file], text: g.text + ' ' + g.url }); return; }
    await navigator.share({ text: g.text, url: g.url });
  } catch (e) { if (e && e.name === 'AbortError') return; pz83Copy(); }
}
async function pz83Copy() {
  const g = _pz83; if (!g || !g.text) return;
  try { await navigator.clipboard.writeText(g.text + ' ' + g.url); showToast('Score and link copied. Paste it anywhere.'); }
  catch (_) { showToast(navigator.share ? 'Could not copy. Try Share instead.' : g.url); }
}
function pz83Save() {
  const g = _pz83; if (!g || !g.img) return;
  const a = document.createElement('a'); a.href = g.img; a.download = pz83Name(g.size);
  document.body.appendChild(a); a.click(); a.remove();
}
