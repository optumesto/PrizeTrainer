
// ═══════════ v32: ads, by age ═══════════
// Nothing in this part shows or loads until the fill-ins below are set.
// README.md says how to fill them in.
const PT_ADS = {
  client: 'ca-pub-XXXXXXXXXXXXXXXX',  // AdSense publisher id, once AdSense approves the site
  // Ad unit id for each spot, made in AdSense as fixed size display units (320 by 100).
  // One id can be used for several spots. A blank spot stays off.
  slots: { home: '', grade: '', odds: '', odds2: '', cards: '', cards2: '', results: '', tlog: '' },
  // The guide pages have their own fill-ins, at the top of ads.js.
};
const AGE32_KEY = 'pt_age_v32';
const AGE32_LABEL = { u13: 'Under 13', teen: '13 to 17', adult: '18 or over', skip: 'No answer' };
const AD32_GAP = 30000;  // at most one new ad per spot every 30 seconds

// The Play app has no ads at launch, so ads stay off there whatever is set above.
// 3.1.1: ads are for visitors in the United States only. Until rdydeck.com has
// said this visitor is in the US (ads32Geo true), there is no ad script, no ad
// spot, no ad label, no age question and no Age setting row.
function ads32Real() { return !PT_PLAY && /^ca-pub-\d{10,20}$/.test(PT_ADS.client) && ads32Geo === true; }

// ── US only (3.1.1) ──
// rdydeck.com (our Cloudflare Worker) answers /api/where with {"ads":true}
// only for a visitor Cloudflare places in the United States. Another country,
// an unknown country, an error, a slow answer, the github.io copy (no such
// address) and an older Worker (a 404) all mean no ads. The question is only
// asked once a real publisher id and a spot are set, never in the Play app and
// never offline, and the answer is kept for this visit only (sessionStorage).
const ADS32_WHERE_KEY = 'rd_ads_where';
let ads32Geo = null;      // null: not known yet, true: US, false: not US
let ads32Asking = false;
function ads32Where() {
  if (ads32Geo !== null || ads32Asking || PT_PLAY) return;
  if (!/^ca-pub-\d{10,20}$/.test(PT_ADS.client) || !Object.values(PT_ADS.slots).some(Boolean)) return;
  let kept = null;
  try { kept = sessionStorage.getItem(ADS32_WHERE_KEY); } catch (e) {}
  if (kept === '1' || kept === '0') { ads32Geo = kept === '1'; if (ads32Geo) ads32Ready(); return; }
  if (!age32Online() || typeof fetch !== 'function') return;
  ads32Asking = true;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const stop = setTimeout(() => { if (ctl) ctl.abort(); }, 5000);
  fetch('/api/where', { cache: 'no-store', credentials: 'omit', signal: ctl ? ctl.signal : undefined })
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
    .then(d => {
      clearTimeout(stop);
      ads32Asking = false;
      ads32Geo = !!(d && d.ads === true);
      try { sessionStorage.setItem(ADS32_WHERE_KEY, ads32Geo ? '1' : '0'); } catch (e) {}
      if (ads32Geo) ads32Ready();
    });
}
// A US visitor: place the spots on the open screen, and ask the age question
// if its usual moment has already passed.
function ads32Ready() {
  if (document.readyState === 'loading') return;
  ads32Sync();
  if (typeof performance !== 'undefined' && performance.now() > 2200) setTimeout(age32Boot, 700);
}
document.addEventListener('DOMContentLoaded', ads32Where);
window.addEventListener('online', ads32Where);
function ads32On(where) { return ads32Real() && (where ? !!PT_ADS.slots[where] : Object.values(PT_ADS.slots).some(Boolean)); }
function age32Any() { return ads32On(); }
function age32Get() { const v = safeLocalGet(AGE32_KEY); return /^(u13|teen|adult|skip)$/.test(v || '') ? v : ''; }
function age32Band(n) { return !(n >= 1 && n <= 130) ? 'skip' : n < 13 ? 'u13' : n < 18 ? 'teen' : 'adult'; }
// No answer counts as under 13.
function age32Tag() { const b = age32Get(); return b === 'adult' ? '' : b === 'teen' ? '2' : '1'; }
function age32Online() { return !(typeof navigator !== 'undefined' && navigator.onLine === false); }

// ── The age question: neutral, no default, never blocks anyone ──
// Only the age group is kept, on this device. Closing it without an answer
// counts as no answer.
function age32Ask() {
  if (!age32Get()) safeLocalSet(AGE32_KEY, 'skip');
  openSheet(`<div class="modal-title">How old are you?</div>
    <div class="age32"><input id="age32-in" class="age32-in" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" aria-label="Your age in years"><span class="age32-unit">years</span></div>
    <div class="modal-hint age32-hint">Your answer stays on this device.</div>
    <div class="modal-actions"><button class="btn btn-ghost" id="age32-skip" onclick="age32Save('')">Skip</button><button class="btn btn-primary" id="age32-go" disabled onclick="age32Save(document.getElementById('age32-in').value)">Continue</button></div>`);
  const i = document.getElementById('age32-in'), go = document.getElementById('age32-go');
  i.addEventListener('input', () => {
    i.value = i.value.replace(/\D/g, '').slice(0, 3);
    go.disabled = !(+i.value >= 1 && +i.value <= 130);
  });
  i.addEventListener('keydown', e => { if (e.key === 'Enter' && !go.disabled) go.click(); });
}
function age32Save(v) {
  safeLocalSet(AGE32_KEY, age32Band(parseInt(v, 10)));
  closeSheet();
  ads32Sync();
}
function age32Boot() {
  if (!age32Any() || age32Get()) return;
  if (/^#(deck|daily)/.test(location.hash)) return;
  const home = document.getElementById('screen-home');
  if (!home || !home.classList.contains('active') || document.querySelector('.modal-overlay.active')) return;
  age32Ask();
}
document.addEventListener('DOMContentLoaded', () => setTimeout(age32Boot, 2200));

// Help: the age setting can move to a younger group only, so a child who
// answered cannot go back and give an older age.
function age32Help() {
  const b = age32Get() || 'skip';
  const younger = { adult: ['teen', 'u13'], teen: ['u13'] }[b] || [];
  openSheet(`<div class="modal-title">Age Setting</div>
    <p class="age32-now">Set to <b>${AGE32_LABEL[b]}</b>.</p>
    <div class="modal-hint">It decides which ads you see, and stays on this device.</div>
    ${younger.length ? `<div class="age32-opts">${younger.map(k => `<button class="btn" onclick="age32Set('${k}')">Change to ${AGE32_LABEL[k].toLowerCase()}</button>`).join('')}</div>`
      : `<div class="modal-hint">To answer again, clear this app's site data in your browser settings.</div>`}
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet();openHelpSheet()">Back</button><button class="btn" onclick="closeSheet()">Close</button></div>`);
}
function age32Set(k) {
  const order = ['u13', 'teen', 'adult'];
  const now = age32Get();
  if (order.indexOf(k) < 0 || order.indexOf(k) >= order.indexOf(now)) return;
  safeLocalSet(AGE32_KEY, k);
  closeSheet();
  ads32Sync();
  showToast('Age setting changed to ' + AGE32_LABEL[k].toLowerCase() + '.');
}

const _v31Help = openHelpSheet;
openHelpSheet = function () {
  _v31Help.apply(this, arguments);
  const list = document.querySelector('.hs-list');
  if (!list) return;
  const credits = document.getElementById('cr31-row');
  const add = el => credits ? list.insertBefore(el, credits) : list.appendChild(el);
  if (age32Any() && !document.getElementById('age32-row')) {
    const b = document.createElement('button');
    b.id = 'age32-row'; b.className = 'hs-row';
    b.onclick = () => { closeSheet(); age32Help(); };
    b.innerHTML = `<span class="ha-ic">${ic23('file')}</span><span class="hs-tx"><b>Age Setting</b><span>${AGE32_LABEL[age32Get() || 'skip']}. Sets which ads you see.</span></span><svg class="ic hs-go"><use href="#i-next"/></svg>`;
    add(b);
  }
};

// ── Banner spots: results screen and the bottom of the deck grade ──
// Static, fixed size, one per screen, never in games or drills. A spot is
// made when its screen opens and removed when it closes, so an ad is never
// hidden on the page or refreshed on its own. Nothing loads before the age
// question, when offline, or until the fill-ins are set.
let ads32Script = false;
const ads32Last = {};
function ads32Load() {
  if (ads32Script) return;
  ads32Script = true;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  // v47: ?client= is needed for Google's consent message (EEA, UK, Switzerland).
  // Keep Auto ads off in AdSense, so only the spots placed here ever show.
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(PT_ADS.client);
  document.head.appendChild(s);
}
function ads32Make(where, place) {
  if (document.getElementById('ad32-' + where)) return;
  if (!ads32On(where) || !age32Get() || !age32Online() || !place) return;
  const now = Date.now();
  if (ads32Last[where] && now - ads32Last[where] < AD32_GAP) return;
  const size = ads32Size(where, place.parent);
  if (!size) return;
  const [w, h] = size;
  // v52: never two ads in view at once. Skip a spot that would sit within one
  // screen height of another ad on the same screen.
  const scr = place.parent.closest('.screen');
  if (scr) {
    const b = place.before;
    const ref = b ? (b.nodeType === 1 ? b : b.nextElementSibling) : null;
    const y = ref ? ref.getBoundingClientRect().top : place.parent.getBoundingClientRect().bottom;
    const near = [...scr.querySelectorAll('.ad32')].some(a => a.offsetParent && Math.abs(a.getBoundingClientRect().top - y) < window.innerHeight);
    if (near) return;
  }
  ads32Last[where] = now;
  ads32Load();
  const box = document.createElement('div');
  box.id = 'ad32-' + where; box.className = 'ad32';
  box.style.height = (h + 38) + 'px';
  const tag = age32Tag();
  box.innerHTML = `<div class="ad32-lbl" style="max-width:${w}px">Advertisements</div><ins class="adsbygoogle" style="display:inline-block;width:${w}px;height:${h}px" data-ad-client="${esc(PT_ADS.client)}" data-ad-slot="${esc(PT_ADS.slots[where])}"${tag ? ` data-tag-for-age-treatment="${tag}"` : ''}></ins>`;
  place.parent.insertBefore(box, place.before || null);
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
}
// v52: each ad is sized to the space it sits in. Phones: a 320 by 100 banner.
// Computers: as wide as the column it sits in (up to the standard 728 or 970
// banner widths), so it fills the row instead of leaving empty space beside it.
// The game results ad sits in the right column beside the taller guesses panel,
// so it is a rectangle that fills that column. The ad units in AdSense must be
// responsive display units, so Google can fill each exact size.
function ads32Size(where, parent) {
  const cw = Math.floor(parent.clientWidth || 320);
  if (window.innerWidth < 768) return cw >= 234 ? [Math.min(320, cw), 100] : null;
  if (where === 'results') return cw >= 300 ? [Math.min(580, cw), 250] : null;
  const cap = (where === 'home' && window.innerWidth >= 1100) || where === 'cards' ? 970 : 728;
  return cw >= 468 ? [Math.min(cap, cw), 90] : cw >= 234 ? [Math.min(320, cw), 100] : null;
}
function ads32Drop(where) { const el = document.getElementById('ad32-' + where); if (el) el.remove(); }
function ads32Sync() {
  // v52: ten spots in all, each at a break between sections and never in a game,
  // hand or drill. Each needs its screen (and tab) open.
  const on = id => { const el = document.getElementById(id); return el && el.classList.contains('active') ? el : null; };
  const shown = id => { const el = document.getElementById(id); return el && el.style.display !== 'none' ? el : null; };
  const after = el => el && el.parentNode ? { parent: el.parentNode, before: el.nextSibling } : null;
  const before = el => el && el.parentNode ? { parent: el.parentNode, before: el } : null;
  const want = {};
  // Home: at the end of More (under it on phones, in the side column on wide screens).
  const home = on('screen-home');
  // On a wide computer screen home is two columns; the ad becomes a full-width band
  // right under them, filling the empty space beside the side column.
  if (home) want.home = window.innerWidth >= 1100 && home.querySelector('.home-content > .about38')
    ? before(home.querySelector('.home-content > .about38'))
    : { parent: home.querySelector('.home-more'), before: null };
  const res = on('screen-results');
  if (res) want.results = before(res.querySelector('.history-section'));
  const tl = on('screen-tlog');
  if (tl) want.tlog = after(tl.querySelector('#tlog-body .hp-actions'));
  if (on('screen-review')) {
    const gb = shown('grade-body'), ob = shown('odds-body'), cb = shown('review-body');
    // 3.5.5: under how the grade was worked out, so the scores and what to fix first stay together.
    if (gb) want.grade = after(gb.querySelector('#go37-proof') || gb.querySelector('.g-hero'));
    if (ob) { want.odds = after(ob.querySelector('.o-meta')); want.odds2 = after(ob.querySelector('#ol-wrap')); }
    if (cb) { const g = cb.querySelectorAll('.review-group'); if (g.length > 1) want.cards = after(g[0]); if (g.length > 2) want.cards2 = after(g[1]); }
  }
  // Remove the spots that are gone first, then add the new ones in page order,
  // so a spot is never skipped for an ad on a tab that is closing.
  const keys = ['home', 'grade', 'odds', 'odds2', 'cards', 'cards2', 'results', 'tlog'];
  keys.forEach(k => { const p = want[k]; if (!(p && p.parent)) ads32Drop(k); });
  keys.forEach(k => { const p = want[k]; if (p && p.parent) ads32Make(k, p); });
}
let _ads32T = 0;
document.addEventListener('DOMContentLoaded', () => {
  // Wait for a screen to settle before placing its ads.
  const mo = new MutationObserver(() => { clearTimeout(_ads32T); _ads32T = setTimeout(ads32Sync, 400); });
  ['screen-results', 'screen-review', 'screen-home', 'screen-tlog', 'grade-body', 'odds-body', 'review-body'].forEach(id => {
    const el = document.getElementById(id);
    if (el) mo.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
  });
  // The tabs and the log redraw their contents, which can remove an ad: place it again.
  ['grade-body', 'odds-body', 'review-body', 'tlog-body'].forEach(id => {
    const el = document.getElementById(id);
    if (el) mo.observe(el, { childList: true });
  });
  // v47: the home screen is already open at start, so check the spots once on load too.
  setTimeout(ads32Sync, 1500);
  // Ask the age question after the first-run tour, on the next visit home.
  const home = document.getElementById('screen-home');
  if (home) new MutationObserver(() => { if (home.classList.contains('active')) setTimeout(age32Boot, 700); }).observe(home, { attributes: true, attributeFilter: ['class'] });
});
