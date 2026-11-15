
// ═══════════ v37: save and open decks ═══════════
// Saved decks live in this browser, for this web address only. To move to a
// new address (or a new phone), a player saves everything to a file here and
// opens that file there. Opening adds to what is already saved unless the
// player picks Replace everything. A backup is someone's text, so it is
// checked before anything is changed.
const BK37_MAX = 5 * 1024 * 1024;
const BK37_PREFS = {
  theme: ['ptcg_theme', v => v === 'light' || v === 'dark'],
  cardcols: ['ptcg_cardcols', v => /^[0-3]$/.test(v)],
  practiceTab: ['pt_practice_tab', v => typeof PRACTICE_TABS === 'undefined' || PRACTICE_TABS.includes(v)],
  tour: ['pt_tour_v24', v => v === 'done'],
  seen29: ['pt_v29_seen', v => v === '1'],
};
let _bk37 = null;   // what was read and checked, waiting for Add or Replace

function bk37Ok(p) {
  return p && typeof p === 'object' && Array.isArray(p.decks) && p.decks.length <= 1000 && p.decks.every(d =>
    d && typeof d === 'object' && d.id != null && typeof d.name === 'string' && d.name.length <= 200 && Array.isArray(d.cards) &&
    d.cards.every(c => c && typeof c === 'object' && typeof c.name === 'string' && Number.isFinite(c.count) && c.count >= 0 && c.count <= 60) &&
    (d.history == null || Array.isArray(d.history))) &&
    (p.tlog == null || Array.isArray(p.tlog)) && (p.daily == null || typeof p.daily === 'object');
}
// Ids, numbers and picture addresses go into the page as they are, so only
// plain values are allowed there.
const BK37_NUM = new Set(['score', 'time', 'prizeCount', 'count', 'taken', 'given', 'deckVer', 'ts']);
const BK37_ID = new Set(['id', 'deckId', 'activeDeckId']);
const BK37_URL = new Set(['imageUrl', 'thumbUrl', 'fallbackUrls']);
function bk37Plain(v, k, depth) {
  if (depth > 12) return false;
  if (Array.isArray(v)) return v.every(x => bk37Plain(x, k === 'fallbackUrls' ? k : '', depth + 1));
  if (v && typeof v === 'object') return Object.keys(v).every(key => key !== '__proto__' && key !== 'constructor' && bk37Plain(v[key], key, depth + 1));
  if (v == null) return true;
  if (BK37_NUM.has(k)) return Number.isFinite(v);
  if (BK37_ID.has(k)) return /^[\w.-]{1,64}$/.test(String(v));
  if (BK37_URL.has(k)) return v === '' || /^https?:\/\/[^\s"'<>`\\]+$/.test(String(v));
  if (k === 'result') return ['W', 'L', 'T'].includes(v);
  if (k === 'date' || k === 'day') return !/[<>"'`&]/.test(String(v));
  return true;
}

function bk37Pack() {
  const prefs = {};
  Object.keys(BK37_PREFS).forEach(k => { const v = safeLocalGet(BK37_PREFS[k][0]); if (v != null) prefs[k] = v; });
  return { app: 'RdyDeck', backup: 1, saved: new Date().toISOString(), state, prefs };
}
function bk37FileName() { return 'rdydeck-decks-' + new Date().toISOString().slice(0, 10) + '.json'; }
function bk37Text() { return JSON.stringify(bk37Pack()); }

function bk37Parse(text) {
  text = String(text || '').trim();
  if (!text) return { msg: 'Nothing to open yet.' };
  if (text.length > BK37_MAX) return { msg: 'That is too big to be a RdyDeck backup.' };
  let p;
  try { p = JSON.parse(text); } catch (_) { return { msg: "That isn't a RdyDeck backup. Paste the whole text, from the first { to the last }." }; }
  // Old backups are the saved data on its own; new ones wrap it with settings.
  const st = p && p.backup ? p.state : p;
  const prefs = p && p.backup && p.prefs && typeof p.prefs === 'object' ? p.prefs : {};
  if (!st || typeof st !== 'object' || !Array.isArray(st.decks)) return { msg: "That isn't a RdyDeck backup." };
  if (!bk37Ok(st) || !bk37Plain(st, '', 0)) return { msg: 'That backup is damaged or incomplete. Nothing was changed.' };
  const clean = {};
  Object.keys(BK37_PREFS).forEach(k => { const v = prefs[k]; if (typeof v === 'string' && BK37_PREFS[k][1](v)) clean[k] = v; });
  return { st, prefs: clean };
}

function bk37Summary(b) {
  const d = b.st.decks, games = d.reduce((a, x) => a + (x.history || []).length, 0), t = (b.st.tlog || []).length;
  const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
  return `${n(d.length, 'deck', 'decks')}, ${n(games, 'prize game', 'prize games')}` + (t ? `, ${n(t, 'tournament', 'tournaments')}` : '') + '.';
}

function bk37Key(d) { return JSON.stringify([d.name, (d.cards || []).map(c => [c.name, c.set || '', c.num || '', c.count])]); }
function bk37NewId(used) { let id; do { id = Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); } while (used.has(id)); used.add(id); return id; }

// Adds what is in the backup to what is here. A deck that is already here
// (same name and same list) keeps its own games and gains any it was missing.
function bk37Merge(st) {
  const cur = state, used = new Set(cur.decks.map(d => String(d.id))), byKey = new Map(cur.decks.map(d => [bk37Key(d), d]));
  const remap = {};
  let added = 0, joined = 0;
  st.decks.forEach(d0 => {
    const d = JSON.parse(JSON.stringify(d0));
    const same = byKey.get(bk37Key(d));
    if (same) {
      const have = new Set((same.history || []).map(h => JSON.stringify(h)));
      (d.history || []).forEach(h => { if (!have.has(JSON.stringify(h))) { (same.history = same.history || []).push(h); } });
      remap[String(d.id)] = same.id; joined++;
      return;
    }
    const old = String(d.id);
    if (used.has(old)) d.id = bk37NewId(used); else used.add(old);
    remap[old] = d.id;
    if (cur.decks.some(x => x.name === d.name)) d.name = d.name + ' (opened)';
    cur.decks.push(d); byKey.set(bk37Key(d), d); added++;
  });
  if (Array.isArray(st.tlog) && st.tlog.length) {
    cur.tlog = cur.tlog || [];
    const have = new Set(cur.tlog.map(x => String(x.id)));
    st.tlog.forEach(x0 => {
      if (have.has(String(x0.id))) return;
      const x = JSON.parse(JSON.stringify(x0));
      if (x.deckId != null && remap[String(x.deckId)] != null) x.deckId = remap[String(x.deckId)];
      cur.tlog.push(x);
    });
  }
  if (st.daily && st.daily.results && typeof st.daily.results === 'object') {
    cur.daily = cur.daily || { results: {} }; cur.daily.results = cur.daily.results || {};
    Object.keys(st.daily.results).forEach(k => { if (!(k in cur.daily.results)) cur.daily.results[k] = st.daily.results[k]; });
  }
  if (st.drillStats && !cur.drillStats) cur.drillStats = JSON.parse(JSON.stringify(st.drillStats));
  return { added, joined };
}

function bk37Prefs(prefs, all) {
  Object.keys(prefs).forEach(k => {
    const key = BK37_PREFS[k][0];
    if (all || safeLocalGet(key) == null) safeLocalSet(key, prefs[k]);
  });
  try { if (prefs.theme) loadThemePref(); } catch (_) {}
  try { cz37Apply(); } catch (_) {}
}

async function bk37Done(msg) {
  await saveState();
  closeSheet();
  try { renderHome(); } catch (_) {}
  showToast(msg);
}
async function bk37Add() {
  if (!_bk37) return;
  const r = bk37Merge(_bk37.st);
  bk37Prefs(_bk37.prefs, false);
  _bk37 = null;
  const n = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
  await bk37Done(r.added || r.joined ? `Added ${n(r.added, 'deck')}` + (r.joined ? `, ${n(r.joined, 'deck')} already here` : '') + '.' : 'Nothing new to add.');
}
let _bk37Arm = 0;
async function bk37Replace(btn) {
  if (!_bk37) return;
  if (Date.now() - _bk37Arm > 4000) { _bk37Arm = Date.now(); btn.textContent = 'Tap again to replace'; return; }
  const st = JSON.parse(JSON.stringify(_bk37.st));
  if (!st.decks.some(d => String(d.id) === String(st.activeDeckId))) st.activeDeckId = st.decks[0] ? st.decks[0].id : null;
  state = st;
  bk37Prefs(_bk37.prefs, true);
  _bk37 = null; _bk37Arm = 0;
  await bk37Done(`Replaced with ${state.decks.length} deck${state.decks.length === 1 ? '' : 's'}.`);
}

function bk37Read(text) {
  const err = document.getElementById('bk37-err'), box = document.getElementById('bk37-found');
  const b = bk37Parse(text);
  _bk37Arm = 0;
  if (!b.st) { _bk37 = null; err.textContent = b.msg; box.hidden = true; return; }
  try { ptCanonDecks(b.st.decks); } catch (_) {}   // 2.5.3
  _bk37 = b; err.textContent = '';
  document.getElementById('bk37-sum').textContent = 'This backup has ' + bk37Summary(b);
  document.getElementById('bk37-rep').textContent = 'Replace everything';
  box.hidden = false;
  box.scrollIntoView({ block: 'nearest' });
}
async function bk37OpenFile(input) {
  const f = input.files && input.files[0];
  input.value = '';
  if (!f) return;
  if (f.size > BK37_MAX) { bk37Read('x'.repeat(BK37_MAX + 1)); return; }
  let t = '';
  try { t = await f.text(); } catch (_) {}
  bk37Read(t);
}

function bk37Save() {
  try {
    const url = URL.createObjectURL(new Blob([bk37Text()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = bk37FileName(); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast('Saved ' + bk37FileName() + '.');
  } catch (_) { showToast("Couldn't save a file here. Use Copy as text instead."); }
}
function bk37CanShare() {
  try { return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [new File(['{}'], 'x.json', { type: 'application/json' })] })); } catch (_) { return false; }
}
async function bk37Share() {
  try {
    const f = new File([bk37Text()], bk37FileName(), { type: 'application/json' });
    await navigator.share({ files: [f], title: 'RdyDeck decks' });
  } catch (e) { if (!e || e.name !== 'AbortError') showToast("Couldn't share. Use Save a file instead."); }
}
async function bk37Copy() {
  const t = bk37Text();
  try { await navigator.clipboard.writeText(t); showToast('Copied. Paste it somewhere safe, like a note to yourself.'); }
  catch (_) {
    const ta = document.getElementById('bk37-text');
    if (ta) { ta.value = t; ta.select(); }
    showToast('Select the text in the box and copy it.');
  }
}

openBackupModal = function () {
  _bk37 = null; _bk37Arm = 0;
  const n = state.decks.length, games = state.decks.reduce((a, d) => a + (d.history || []).length, 0);
  openSheet(`<div class="modal-title">Save and open decks</div>
    <div class="bk37-sec">
      <div class="bk37-h">Save</div>
      <p class="bk37-p">${n ? `Your ${n} deck${n === 1 ? '' : 's'} and ${games} prize game${games === 1 ? '' : 's'} live in this browser only. Save them to a file to keep a copy or move them to a new phone or web address.` : 'Nothing is saved in this browser yet. To bring decks here, open a file you saved before.'}</p>
      <div class="bk37-btns"${n ? '' : ' hidden'}>
        <button class="btn btn-primary" onclick="bk37Save()">Save a file</button>
        ${bk37CanShare() ? '<button class="btn" onclick="bk37Share()">Share</button>' : ''}
        <button class="btn" onclick="bk37Copy()">Copy as text</button>
      </div>
    </div>
    <div class="bk37-sec">
      <div class="bk37-h">Open</div>
      <p class="bk37-p">Open a saved file or paste the text. Decks are added to the ones here, nothing is removed.</p>
      <div class="bk37-btns">
        <button class="btn" onclick="document.getElementById('bk37-file').click()">Open a file</button>
        <button class="btn" onclick="bk37Read(document.getElementById('bk37-text').value)">Read pasted text</button>
      </div>
      <input type="file" id="bk37-file" accept=".json,application/json,.txt,text/plain" hidden onchange="bk37OpenFile(this)">
      <textarea id="bk37-text" class="bk37-text" placeholder="Paste backup text here" aria-label="Backup text" autocomplete="off" spellcheck="false"></textarea>
      <div class="bk37-err" id="bk37-err" role="alert"></div>
      <div class="bk37-found" id="bk37-found" hidden>
        <p class="bk37-sum" id="bk37-sum"></p>
        <div class="bk37-btns">
          <button class="btn btn-primary" onclick="bk37Add()">Add to my decks</button>
          <button class="btn bk37-danger" id="bk37-rep" onclick="bk37Replace(this)">Replace everything</button>
        </div>
      </div>
    </div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet()">Done</button></div>`);
};

// ═══════════ Moving to rdydeck.com: carry saved decks over ═══════════
// Saved decks live in the browser for one web address only, so decks saved at
// optumesto.github.io/PrizeTrainer/ do not show at rdydeck.com by themselves.
// On the old address: a player with nothing saved goes straight to
// rdydeck.com. A player with saved decks sees a banner; "Move my decks" opens
// rdydeck.com with the decks packed into the link's #part (which never leaves
// the phone), and the new address shows the usual "Add to my decks" choice.
// The old address keeps its copy, so nothing is lost if a move fails.
// Needs from v37: bk37Text, bk37Read, openBackupModal, BK37_MAX, state.
// Call mv41Init() once, right after loadState() has finished.
const MV41_HOME = 'https://rdydeck.com/';
const MV41_OLD_HOST = 'optumesto.github.io';
const MV41_MAX_LINK = 400000;   // longest #move link we send; bigger moves use a file

function mv41B64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function mv41Bytes(b64) {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
async function mv41Pack(text) {
  const raw = new TextEncoder().encode(text);
  if (typeof CompressionStream === 'undefined') return 'j.' + mv41B64(raw);
  const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  return 'z.' + mv41B64(z);
}
async function mv41Unpack(p) {
  if (typeof p !== 'string' || p.length > MV41_MAX_LINK + 10) return '';
  const kind = p.slice(0, 2), bytes = mv41Bytes(p.slice(2));
  if (kind === 'j.') return new TextDecoder().decode(bytes);
  if (kind !== 'z.' || typeof DecompressionStream === 'undefined') return '';
  // Read no more than a backup can hold, so a crafted link cannot balloon.
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const parts = []; let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.length;
    if (n > BK37_MAX) { try { reader.cancel(); } catch (_) {} return 'x'.repeat(BK37_MAX + 1); }
    parts.push(value);
  }
  const all = new Uint8Array(n); let o = 0;
  parts.forEach(v => { all.set(v, o); o += v.length; });
  return new TextDecoder().decode(all);
}

function mv41HasData() {
  return !!(state && ((state.decks && state.decks.length) || (state.tlog && state.tlog.length)));
}
function mv41NewUrl() {
  const rest = location.pathname.replace(/^\/PrizeTrainer\/?/i, '');
  // Shared deck and daily links (#deck=, #daily) keep working after the jump.
  const h = /^#(deck=|daily\b)/.test(location.hash) ? location.hash : '';
  return MV41_HOME + rest + location.search + h;
}

async function mv41Move(btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Packing your decks…'; }
  let p = '';
  try { p = await mv41Pack(bk37Text()); } catch (_) { p = ''; }
  if (!p || p.length > MV41_MAX_LINK) {
    if (btn) { btn.disabled = false; btn.textContent = 'Move my decks'; }
    openBackupModal();
    showToast('Too many decks for one link. Save a file here, then open it at rdydeck.com.');
    return;
  }
  location.href = MV41_HOME + '#move=' + p;
}

function mv41Banner() {
  if (document.getElementById('mv41-banner')) return;
  const n = state.decks.length;
  const el = document.createElement('div');
  el.id = 'mv41-banner';
  el.className = 'mv41-banner';
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', 'RdyDeck has moved');
  el.innerHTML = `<p class="mv41-t">RdyDeck has moved to rdydeck.com.</p>
    <p class="mv41-p">Your ${n} saved deck${n === 1 ? '' : 's'} stay here until you move them. One tap brings them along.</p>
    <div class="mv41-btns">
      <button class="btn btn-primary" onclick="mv41Move(this)">Move my decks</button>
      <a class="btn" href="${MV41_HOME}">Go to rdydeck.com</a>
    </div>`;
  document.body.insertBefore(el, document.body.firstChild);
}

async function mv41Arrive() {
  const h = location.hash;
  if (!h.startsWith('#move=')) return;
  // Take the decks out of the address bar first, so they are not kept in
  // history, bookmarks or a shared link.
  try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
  let text = '';
  try { text = await mv41Unpack(h.slice(6)); } catch (_) { text = ''; }
  openBackupModal();
  if (!text) {
    const err = document.getElementById('bk37-err');
    if (err) err.textContent = "That move link didn't work. On the old address, save a file, then open it here.";
    return;
  }
  bk37Read(text);
  if (_bk37) showToast('Your decks are here. Tap Add to my decks to keep them.');
}

async function mv41Init() {
  try {
    if (location.hostname === MV41_OLD_HOST) {
      if (!mv41HasData()) { location.replace(mv41NewUrl()); return; }
      mv41Banner();
    } else {
      await mv41Arrive();
    }
  } catch (_) {}
}
window.addEventListener('hashchange', () => { if (location.hostname !== MV41_OLD_HOST) mv41Arrive(); });

