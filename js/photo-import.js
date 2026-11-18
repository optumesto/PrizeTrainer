// Photo deck import (test branch photo-import): read a deck list from a screenshot or photo of a
// deck screen, such as a Pokemon TCG Live deck shared as a picture.
//
// Everything happens on the player's device. The picture is drawn into a canvas in this page and
// read there; it is never uploaded, saved or sent anywhere. The card picture index
// (art-index.json and art-index.bin) and the reader (js/photo-scan.js) download only when the
// player picks a picture, and the service worker keeps them for offline use after that.
//
// The reader finds each card, names it from its picture and reads its count. The review sheet
// shows every card with a crop from the player's own picture, its count and how sure the read is,
// so a misread can be fixed or replaced. "Use this list" fills the import box; nothing is graded
// until the player imports it.
(function () {
  'use strict';
  const MAX_SIDE = 2400;          // a camera photo is scaled down to this before reading
  const SURE_NAME = 0.35, SURE_COUNT = 0.5;
  let PS = null, IDX = null, KIND = null, loading = null;
  let shots = 0, rows = [], busy = false;

  const $ = id => document.getElementById(id);
  const escH = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = t => { if (typeof showToast === 'function') showToast(t); };

  /** A file from <template id="photo-files">, with its stamp, so the service worker keeps it. */
  function stamped(name) {
    const t = $('photo-files'), tag = t && t.content && t.content.querySelector(`script[src*="${name}"]`);
    return tag ? tag.getAttribute('src') : 'js/' + name;
  }
  function loadScript(src) {
    return new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = src; sc.onload = res; sc.onerror = () => rej(new Error(src));
      document.head.appendChild(sc);
    });
  }
  /** The reader, the card picture index and the card kinds, once. */
  function ready() {
    if (IDX) return Promise.resolve();
    if (loading) return loading;
    loading = (async () => {
      if (!self.PhotoScan) await loadScript(stamped('photo-scan.js'));
      PS = self.PhotoScan;
      const [meta, bin, cards] = await Promise.all([
        fetch('art-index.json').then(r => { if (!r.ok) throw new Error('index'); return r.json(); }),
        fetch('art-index.bin').then(r => { if (!r.ok) throw new Error('index'); return r.arrayBuffer(); }),
        fetch('cards.json').then(r => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      IDX = PS.loadIndex(meta, new Uint8Array(bin));
      KIND = new Map();
      if (cards && Array.isArray(cards.cards)) for (const c of cards.cards) KIND.set(key(c.n), c.k);
    })();
    loading.catch(() => { loading = null; });
    return loading;
  }
  const key = n => String(n || '').toLowerCase().replace(/[’']/g, "'").replace(/^basic (\w+ energy)$/, '$1').trim();
  /** pokemon-tcg-data calls some basic Energy "Basic Fire Energy"; deck lists say "Fire Energy". */
  const listName = n => String(n).replace(/^Basic (\w+ Energy)$/, '$1');
  function kindOf(name) {
    const k = KIND && KIND.get(key(name));
    if (k) return k;
    return /Energy$/.test(name) ? 'E' : 'T';
  }

  /** The picture as pixels, scaled down if it is a large camera photo. */
  async function pixels(file) {
    let src;
    try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (_) {
      src = await new Promise((res, rej) => {
        const im = new Image(), u = URL.createObjectURL(file);
        im.onload = () => { URL.revokeObjectURL(u); res(im); };
        im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('image')); };
        im.src = u;
      });
    }
    const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight;
    const f = Math.min(1, MAX_SIDE / Math.max(w0, h0));
    const W = Math.max(1, Math.round(w0 * f)), H = Math.max(1, Math.round(h0 * f));
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(src, 0, 0, W, H);
    if (src.close) src.close();
    return { cv, W, H, px: g.getImageData(0, 0, W, H).data };
  }
  /** A small crop of the card from the player's own picture, for the review list. */
  function thumb(cv, b) {
    const t = document.createElement('canvas');
    t.width = 84; t.height = 117;
    t.getContext('2d').drawImage(cv, b.x, b.y, b.w, b.h, 0, 0, 84, 117);
    try { return t.toDataURL('image/jpeg', 0.8); } catch (_) { return ''; }
  }

  // ── Sheet ──
  function open() {
    $('photo-modal').classList.add('active');
  }
  function close() {
    $('photo-modal').classList.remove('active');
    rows = []; shots = 0;
    const f = $('photo-file'); if (f) f.value = '';
  }
  function pick() {
    if (busy) return;
    const f = $('photo-file');
    if (f) { f.value = ''; f.click(); }
  }
  function setState(s) {
    $('photo-modal').dataset.state = s;   // reading, list, empty, error
  }

  async function read(file) {
    if (!file || busy) return;
    busy = true;
    open();
    const first = !rows.length;
    setState(first ? 'reading' : 'list');
    $('pi-more').disabled = true;
    $('pi-reading-more').hidden = first;
    try {
      await ready();
    } catch (_) {
      busy = false; $('pi-more').disabled = false; $('pi-reading-more').hidden = true;
      if (first) { setState('error'); $('pi-msg').textContent = 'Photo import needs a connection the first time you use it.'; }
      else toast('Photo import needs a connection the first time you use it.');
      return;
    }
    let found;
    try {
      const img = await pixels(file);
      await new Promise(r => setTimeout(r, 30));   // let "Reading your picture" draw first
      const got = PS.mergeRows(PS.readDeck(IDX, img.px, img.W, img.H));
      found = got.filter(r => r.matches.length).map(r => {
        const m = r.matches[0];
        return { name: m.name, set: m.set, num: m.num, count: Math.max(1, Math.min(60, r.count || 1)),
          nameOk: r.sure >= SURE_NAME, countOk: r.count != null && r.countSure >= SURE_COUNT,
          alts: r.matches.slice(1, 5), img: thumb(img.cv, r.box) };
      });
    } catch (_) {
      found = null;
    }
    busy = false; $('pi-more').disabled = false; $('pi-reading-more').hidden = true;
    if (!found) {
      if (first) { setState('error'); $('pi-msg').textContent = 'This picture could not be opened. Try a screenshot saved as PNG or JPEG.'; }
      else toast('This picture could not be opened. Try a screenshot saved as PNG or JPEG.');
      return;
    }
    if (!found.length) {
      if (first) { setState('error'); $('pi-msg').textContent = 'No cards found in this picture. Try a screenshot of the whole deck screen, with every card and its count showing.'; }
      else toast('No cards found in this picture.');
      return;
    }
    // A card already in the list from another picture of the same deck counts once.
    for (const r of found) {
      const same = rows.find(o => o.name === r.name && o.set === r.set && o.num === r.num);
      if (same) { if (r.count > same.count && r.countOk) same.count = r.count; continue; }
      rows.push(r);
    }
    shots++;
    setState('list');
    draw();
  }

  function draw() {
    const total = rows.reduce((a, r) => a + r.count, 0);
    const check = rows.filter(r => !r.nameOk || !r.countOk).length;
    const tot = $('pi-total');
    // The numbers sit in their own elements, so each text around them translates as it is.
    tot.innerHTML = `<span class="pi-big">${total}</span> <span>of 60 cards</span>`;
    tot.classList.toggle('ok', total === 60);
    $('pi-check').innerHTML = check ? `<span>To check:</span> <b>${check}</b>` : '<span>Every card read clearly</span>';
    $('pi-check').classList.toggle('warn', !!check);
    $('pi-list').innerHTML = rows.map((r, i) => {
      const flag = !r.nameOk ? 'Check the card' : !r.countOk ? 'Check the count' : '';
      return `<div class="pi-row${flag ? ' pi-unsure' : ''}" data-i="${i}">
        ${r.img ? `<img class="pi-thumb" src="${r.img}" alt="">` : '<div class="pi-thumb"></div>'}
        <div class="pi-info">
          <div class="pi-name" data-no-tr>${escH(r.name)}</div>
          <div class="pi-sub"><span data-no-tr>${escH(r.set)} ${escH(r.num)}</span>${flag ? `<span class="pi-pill">${flag}</span>` : ''}</div>
          <button class="pi-change" type="button" data-act="change">Change</button>
        </div>
        <div class="pi-step">
          <button type="button" class="pi-sb" data-act="minus" aria-label="One fewer"${r.count > 1 ? '' : ' disabled'}>&minus;</button>
          <span class="pi-n${r.countOk ? '' : ' pi-n-q'}">${r.count}</span>
          <button type="button" class="pi-sb" data-act="plus" aria-label="One more">+</button>
        </div>
      </div>`;
    }).join('');
    $('pi-use').disabled = !rows.length;
  }

  // ── Change a card: other close matches, or search every legal card ──
  let editing = -1;
  function openChange(i) {
    editing = i;
    const r = rows[i];
    $('pi-alt-img').src = r.img || '';
    const alts = r.alts.filter(a => !(a.name === r.name && a.set === r.set && a.num === r.num));
    $('pi-alts').innerHTML = alts.length ? alts.map((a, k) => `<button type="button" class="pi-opt" data-k="${k}"><span data-no-tr>${escH(a.name)}</span><small data-no-tr>${escH(a.set)} ${escH(a.num)}</small></button>`).join('') : '';
    $('pi-alts-h').hidden = !alts.length;
    $('pi-alts')._alts = alts;
    $('pi-q').value = '';
    $('pi-found').innerHTML = '';
    $('photo-change').classList.add('active');
  }
  function closeChange() { $('photo-change').classList.remove('active'); editing = -1; }
  function setCard(c) {
    const r = rows[editing];
    if (!r) return;
    const same = rows.findIndex((o, k) => k !== editing && o.name === c.name && o.set === c.set && o.num === c.num);
    if (same >= 0) { rows[same].count = Math.min(60, rows[same].count + r.count); rows.splice(editing, 1); }
    else Object.assign(r, { name: c.name, set: c.set, num: c.num, nameOk: true });
    closeChange(); draw();
  }
  function search(q) {
    q = key(q);
    if (q.length < 2 || !IDX) { $('pi-found').innerHTML = ''; return; }
    const hits = [];
    const names = IDX.meta.names;
    for (let i = 0; i < names.length && hits.length < 30; i++) if (key(names[i]).includes(q)) hits.push(i);
    hits.sort((a, b) => (key(names[a]).startsWith(q) ? 0 : 1) - (key(names[b]).startsWith(q) ? 0 : 1));
    const out = [];
    for (const ni of hits.slice(0, 12)) {
      // every print of that name, newest set last in the index order; show up to three
      const ps = IDX.meta.prints.filter(p => p[0] === ni).slice(-3);
      for (const p of ps) out.push({ name: names[ni], set: p[1], num: p[2] });
    }
    $('pi-found')._hits = out;
    $('pi-found').innerHTML = out.length
      ? out.map((a, k) => `<button type="button" class="pi-opt" data-k="${k}"><span data-no-tr>${escH(a.name)}</span><small data-no-tr>${escH(a.set)} ${escH(a.num)}</small></button>`).join('')
      : '<div class="pi-none">No Standard card by that name.</div>';
  }

  /** The list as import box text, with section headers, so the usual import reads it. */
  function listText() {
    const by = { P: [], T: [], E: [] };
    for (const r of rows) (by[kindOf(r.name)] || by.T).push(`${r.count} ${listName(r.name)} ${r.set} ${r.num}`);
    const n = a => a.reduce((s, l) => s + parseInt(l, 10), 0);
    const part = (h, a) => (a.length ? `${h}: ${n(a)}\n${a.join('\n')}\n` : '');
    return (part('Pokémon', by.P) + '\n' + part('Trainer', by.T) + '\n' + part('Energy', by.E)).replace(/\n{3,}/g, '\n\n').trim();
  }
  function use() {
    if (!rows.length) return;
    const ta = $('import-list');
    if (!ta) return;
    ta.value = listText();
    ta.dispatchEvent(new Event('input'));
    close();
    toast('List added. Check it, then tap Import and save.');
  }

  function wire() {
    const m = $('photo-modal');
    if (!m || m._wired) return;
    m._wired = true;
    $('photo-file').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) read(f); });
    $('pi-list').addEventListener('click', e => {
      const b = e.target.closest('button'), row = e.target.closest('.pi-row');
      if (!b || !row) return;
      const i = +row.dataset.i, r = rows[i];
      if (!r) return;
      if (b.dataset.act === 'plus') { r.count = Math.min(60, r.count + 1); r.countOk = true; draw(); }
      else if (b.dataset.act === 'minus') {
        if (r.count > 1) { r.count--; r.countOk = true; draw(); }
      } else if (b.dataset.act === 'change') openChange(i);
    });
    $('pi-alts').addEventListener('click', e => { const b = e.target.closest('.pi-opt'); if (b) setCard($('pi-alts')._alts[+b.dataset.k]); });
    $('pi-found').addEventListener('click', e => { const b = e.target.closest('.pi-opt'); if (b) setCard($('pi-found')._hits[+b.dataset.k]); });
    $('pi-q').addEventListener('input', e => search(e.target.value));
    $('pi-keep').addEventListener('click', () => { const r = rows[editing]; if (r) r.nameOk = true; closeChange(); draw(); });
    $('pi-remove').addEventListener('click', () => { if (editing >= 0) rows.splice(editing, 1); closeChange(); draw(); });
    $('pi-change-x').addEventListener('click', closeChange);
    $('pi-more').addEventListener('click', pick);
    $('pi-retry').addEventListener('click', pick);
    $('pi-use').addEventListener('click', use);
    document.querySelectorAll('[data-pi-close]').forEach(b => b.addEventListener('click', close));
    // Escape and a tap on the dim area close the top sheet. The review sheet stays open once it
    // holds cards, so a stray tap never loses the read. (On window, so it runs before the import
    // box's own Escape handler, which would close the import box underneath.)
    const ch = $('photo-change');
    window.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (ch.classList.contains('active')) closeChange();
      else if (m.classList.contains('active')) { if (!rows.length && !busy) close(); }
      else return;
      e.preventDefault(); e.stopImmediatePropagation();
    }, true);
    ch.addEventListener('click', e => { if (e.target === ch) closeChange(); });
    m.addEventListener('click', e => { if (e.target === m && !rows.length && !busy) close(); });
  }

  /** The "From a photo" button in the import box. */
  function start() {
    wire();
    if (!rows.length) setState('start');
    pick();
  }
  self.rdPhotoImport = start;

  function init() {
    // A downloaded copy of the app (file:) cannot read the card picture index.
    if (location.protocol === 'file:') { const b = $('photo-import-btn'); if (b) b.hidden = true; return; }
    wire();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
