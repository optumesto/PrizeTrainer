
// ═══════════ v30: live data file ═══════════
// Starter decks, the current meta and rotation used to live only inside
// this page. Now they also come from data.json next to the page, which a
// weekly GitHub Action refreshes. The copy built into the page is the
// fallback: with no signal, or a data.json that fails any check below,
// the app keeps what it already had and says how old it is.
const DATA30_URL = './data.json';
const DATA30_KEY = 'pt_data_v30';
// The day the copy built into this version was checked. A data.json older than this never replaces it.
const DATA30_BUILT_DAY = '2026-11-08';
const DATA30_BUILT = {
  asOf: DATA30_BUILT_DAY,
  starters: STARTER_DECKS.map(s => Object.assign({}, s)),
  rotation: JSON.parse(JSON.stringify(ROT29)),
  meta: null,
  sets: {},
  live: false,
};
let DATA30 = Object.assign({}, DATA30_BUILT);

// Hosts a link in data.json may point to. Anything else is dropped.
const DATA30_HOSTS = /^https:\/\/(limitlesstcg\.com|play\.limitlesstcg\.com|community\.pokemon\.com|play\.pokemon\.com|www\.pokemon\.com|cardjinx\.com|bulbapedia\.bulbagarden\.net|tcgdex\.dev|www\.tcgdex\.dev)\/[^\s"'<>`\\]*$/;
const d30Str = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= (max || 120) && !/[<>`\u0000-\u001f]/.test(v) ? v : null;
const d30Url = v => typeof v === 'string' && v.length <= 300 && DATA30_HOSTS.test(v) ? v : null;
const d30Day = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) ? v : null;
const d30Mark = v => typeof v === 'string' && /^[A-Z]$/.test(v) ? v : null;

// "2026-10-31" to "31 Oct 2026", the way the app writes dates.
function d30Nice(day) {
  const d = new Date(day + 'T12:00:00Z');
  return isNaN(d) ? day : `${d.getUTCDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Check every field. Returns a clean copy, or null when the file is not usable. */
function d30Validate(j) {
  if (!j || typeof j !== 'object' || j.schema !== 1) return null;
  const asOf = d30Day(j.asOf);
  if (!asOf) return null;
  const out = { asOf, live: true, starters: null, meta: null, rotation: null };

  if (Array.isArray(j.starters) && j.starters.length >= 1 && j.starters.length <= 12) {
    const seen = new Set();
    const decks = j.starters.map(s => {
      if (!s || typeof s !== 'object') return null;
      const id = typeof s.id === 'string' && /^[a-z0-9-]{1,40}$/.test(s.id) ? s.id : null;
      const list = typeof s.list === 'string' && s.list.length < 4000 && !/[<>`]/.test(s.list) ? s.list : null;
      if (!id || !list || seen.has(id)) return null;
      const n = parseDeckList(list).reduce((a, c) => a + c.count, 0);
      if (n !== 60) return null;
      seen.add(id);
      return { id, list, name: d30Str(s.name, 60), by: d30Str(s.by, 60), place: d30Str(s.place, 20),
        event: d30Str(s.event, 80), date: d30Str(s.date, 20), src: d30Url(s.src) };
    }).filter(s => s && s.name && s.by && s.place && s.event && s.date);
    if (decks.length) out.starters = decks;
  }

  if (j.meta && typeof j.meta === 'object' && Array.isArray(j.meta.decks)) {
    const decks = j.meta.decks.slice(0, 20).map(m => m && d30Str(m.name, 50) ? {
      name: m.name, share: Number.isFinite(m.share) && m.share >= 0 && m.share <= 100 ? Math.round(m.share * 10) / 10 : null,
    } : null).filter(Boolean);
    const from = d30Str(j.meta.from, 100);
    if (decks.length && from) out.meta = { decks, from, src: d30Url(j.meta.src), asOf: d30Day(j.meta.asOf) || asOf };
  }

  const r = j.rotation;
  if (r && typeof r === 'object' && d30Mark(r.firstLegal) && r.next && Array.isArray(r.next.marks) && r.next.marks.length && r.next.marks.every(d30Mark)) {
    const src = s => s && d30Str(s.name, 100) && d30Url(s.url) ? { name: s.name, url: s.url } : null;
    const rot = {
      firstLegal: r.firstLegal,
      asOf: d30Str(r.asOf, 20) || d30Nice(asOf),
      next: { marks: r.next.marks.slice(0, 3), announced: r.next.announced === true,
        when: d30Str(r.next.when, 30), live: d30Str(r.next.live, 30), src: src(r.next.src),
        pattern: d30Str(r.next.pattern, 200) || '', checkBy: d30Day(r.next.checkBy) || null },
      last: r.last && Array.isArray(r.last.marks) && r.last.marks.every(d30Mark) ? { marks: r.last.marks.slice(0, 3),
        events: d30Str(r.last.events, 30), live: d30Str(r.last.live, 30), src: src(r.last.src) } : null,
      rules: src(r.rules),
    };
    if (rot.next.when && rot.next.src && rot.last && rot.last.events && rot.last.live && rot.last.src && rot.rules) out.rotation = rot;
  }
  // New set codes and their TCGdex ids, so the backup card source can read a set
  // the app was built before.
  if (j.sets && typeof j.sets === 'object' && !Array.isArray(j.sets)) {
    const sets = {};
    Object.keys(j.sets).slice(0, 80).forEach(k => {
      const v = j.sets[k];
      if (/^[A-Z0-9]{2,5}$/.test(k) && typeof v === 'string' && /^[a-z0-9.]{2,12}$/.test(v)) sets[k] = v;
    });
    if (Object.keys(sets).length) out.sets = sets;
  }
  // v37: card fixes found by the weekly card check. Only known fields with checked values pass.
  if (j.cardFixes && typeof j.cardFixes === 'object' && !Array.isArray(j.cardFixes)) {
    const fx = {};
    Object.keys(j.cardFixes).slice(0, 600).forEach(k => {
      const v = j.cardFixes[k];
      if (!/^[a-z0-9.]{2,12}-[A-Za-z0-9]{1,8}$/.test(k) || !v || typeof v !== 'object') return;
      const f = {};
      if (typeof v.mark === 'string' && /^[A-Z]$/.test(v.mark)) f.mark = v.mark;
      if (/^(Basic|Stage1|Stage2)$/.test(String(v.stage || ''))) f.stage = v.stage;
      if (typeof v.from === 'string' && v.from.length <= 40 && !/[<>`]/.test(v.from)) f.from = v.from;
      if (v.bad === true) f.bad = true;
      if (Object.keys(f).length) fx[k] = f;
    });
    if (Object.keys(fx).length) out.cardFixes = fx;
  }
  if (j.setMarks && typeof j.setMarks === 'object' && !Array.isArray(j.setMarks)) {
    const sm = {};
    Object.keys(j.setMarks).slice(0, 40).forEach(k => { if (/^[a-z0-9.]{2,12}$/.test(k) && /^[A-Z]$/.test(String(j.setMarks[k]))) sm[k] = j.setMarks[k]; });
    if (Object.keys(sm).length) out.setMarks = sm;
  }
  return out.starters || out.meta || out.rotation || out.sets || out.cardFixes ? out : null;
}

/** Put a checked file into use. Each part falls back to the built-in copy on its own. */
function d30Apply(d) {
  DATA30 = {
    asOf: d.asOf, live: !!d.live,
    starters: d.starters || DATA30_BUILT.starters,
    startersLive: !!d.starters,
    meta: d.meta || null,
    sets: d.sets || {},
    cardFixes: d.cardFixes || {}, setMarks: d.setMarks || {},
    rotation: d.rotation || DATA30_BUILT.rotation,
    rotationLive: !!d.rotation,
  };
  STARTER_DECKS.splice(0, STARTER_DECKS.length, ...DATA30.starters.map(s => Object.assign({}, s)));
  const rot = DATA30.rotation;
  Object.assign(ROT29, {
    firstLegal: rot.firstLegal, asOf: rot.asOf, rules: rot.rules,
    next: Object.assign({}, rot.next), last: Object.assign({}, rot.last),
  });
}

// What the app had last time, so a phone with no signal still shows this week's data.
(function () {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(DATA30_KEY) || 'null'); } catch (_) {}
  const d = saved && d30Validate(saved.data);
  // An older saved file never wins over a newer copy built into the page.
  if (d && d.asOf >= DATA30_BUILT_DAY) d30Apply(d);
})();

let _d30Busy = false;
async function d30Refresh() {
  if (_d30Busy || (typeof navigator !== 'undefined' && navigator.onLine === false)) return false;
  _d30Busy = true;
  let j = null;
  try {
    const init = { cache: 'no-cache' };
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) init.signal = AbortSignal.timeout(8000);
    const r = await fetch(DATA30_URL, init);
    if (r.ok) j = await r.json();
  } catch (_) {}
  _d30Busy = false;
  const d = d30Validate(j);
  if (!d || d.asOf < DATA30_BUILT_DAY || (DATA30.live && d.asOf < DATA30.asOf)) return false;
  d30Apply(d);
  try { localStorage.setItem(DATA30_KEY, JSON.stringify({ at: Date.now(), data: j })); } catch (_) {}
  // Redraw what shows the data, if it is on screen.
  try {
    const pane = document.getElementById('grade-body');
    const rev = document.getElementById('screen-review');
    if (pane && pane.style.display !== 'none' && rev && rev.classList.contains('active')) renderGrade();
    const home = document.getElementById('screen-home');
    if (home && home.classList.contains('active')) renderHome();
  } catch (_) {}
  return true;
}
document.addEventListener('DOMContentLoaded', () => setTimeout(d30Refresh, 1500));
window.addEventListener('online', () => d30Refresh());

function d30AsOfLine() {
  return DATA30.live ? `Data as of ${d30Nice(DATA30.asOf)}, updated weekly.` : `Data as of ${d30Nice(DATA30.asOf)}, built into this version.`;
}

// Starter picker: dates from the data file, and the current meta when there is one.
openStarterPicker = function () {
  closeImportModal();
  const rows = STARTER_DECKS.map(s => {
    const n = parseDeckList(s.list).reduce((a, c) => a + c.count, 0);
    const done = starterLoaded(s.id);
    return `<div class="st-row">
      <div class="st-tx"><div class="st-t">${esc(s.name)}</div>
        <div class="st-s">${esc(s.place)}, ${esc(s.event)}, ${esc(s.date)}. Played by ${esc(s.by)}${n !== 60 ? ', ' + n + ' cards' : ''}</div></div>
      <button class="btn btn-sm ${done ? '' : 'btn-primary'}" onclick="loadStarterDeck('${s.id}')">${done ? 'Open' : 'Load'}</button>
    </div>`;
  }).join('');
  const asOf = DATA30.startersLive ? d30Nice(DATA30.asOf) : STARTER_AS_OF;
  // Lists the weekly job took from online tournaments say so.
  const online = STARTER_DECKS.length > 0 && STARTER_DECKS.every(s => /\bonline\)$/.test(s.event || ''));
  const m = DATA30.meta;
  const meta = m ? `<div class="hp-lbl d30-lbl">Most Played Right Now</div>
    <div class="d30-meta">${m.decks.slice(0, 8).map((x, i) => `<div class="d30-mrow"><span class="d30-mi">${i + 1}</span><span class="d30-mn">${esc(x.name)}</span>${x.share != null ? `<span class="d30-ms">${x.share}%</span>` : ''}</div>`).join('')}</div>
    <div class="modal-hint">${esc(m.from)}, as of ${d30Nice(m.asOf)}.</div>` : '';
  openSheet(`<div class="modal-title">Starter Decks</div>
    <div class="modal-hint" style="margin-bottom:0.9rem">${online ? 'Top finishes for the most played decks at big online tournaments, not Regionals.' : 'Real Standard lists that placed at recent events.'} Lists as of ${asOf}. Load one to start practicing right away, then edit it to match your own build.</div>
    <div class="st-list">${rows}</div>
    ${meta}
    <div class="modal-hint" style="margin-top:0.9rem">Lists as posted on Limitless (${online ? 'play.limitlesstcg.com' : 'limitlesstcg.com'}). ${d30AsOfLine()} The format changes with every new set, so check a list before an event.</div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet()">Close</button><button class="btn" onclick="closeSheet();openImportModal()">${ic23('clipboard')}Paste my own</button></div>`);
};

// Help says how fresh the data is.
const _v29Help = openHelpSheet;
openHelpSheet = function () {
  _v29Help.apply(this, arguments);
  const hint = [...document.querySelectorAll('.modal-hint')].find(h => /^(RdyDeck|Prize Trainer) v/.test(h.textContent));
  if (hint) hint.textContent = `RdyDeck ${PT_VERSION}${PT_PLAY ? ' (Google Play)' : ''}. ${d30AsOfLine()}`;
};

// Opponent boxes suggest the current meta decks after your own.
function d30MetaNames() { return DATA30.meta ? DATA30.meta.decks.map(d => d.name) : []; }
function d30AddMeta(listId) {
  const dl = document.getElementById(listId);
  if (!dl) return;
  const have = new Set([...dl.options].map(o => o.value.toLowerCase()));
  d30MetaNames().forEach(n => {
    if (have.has(n.toLowerCase())) return;
    const o = document.createElement('option');
    o.value = n;
    dl.appendChild(o);
  });
}
const _v29Matchup = openMatchupForm;
openMatchupForm = function () { const r = _v29Matchup.apply(this, arguments); d30AddMeta('mu-opp-list'); return r; };
const _v29Tlog = openTlogForm;
openTlogForm = function () { const r = _v29Tlog.apply(this, arguments); d30AddMeta('tl-opp-list'); return r; };

// ═══════════ v30: backup card source (TCGdex) ═══════════
// pokemontcg.io is still read first. A card it cannot read (a brand new set
// it has not added yet, or a request that failed) is then read from TCGdex,
// a free open card database (MIT license, no key). Its cards are turned into
// the shape the grader already reads, so the grade, odds and rotation work
// the same either way. Reads are saved with the deck as before, so offline
// still works.
const TD30_API = 'https://api.tcgdex.net/v2/en';
// Deck list set codes to TCGdex set ids, read from TCGdex's own set files on 8 Nov 2026.
const TD30_SETS = { MEG: 'me01', PFL: 'me02', ASC: 'me02.5', POR: 'me03', CRI: 'me04', PBL: 'me05', OBF: 'sv03', SVE: 'sve',
  // 2.5.5: 30th Celebration and Mega Evolution Energy, read from TCGdex's own set files on 13 Nov 2026.
  // Without them a 30th Celebration card was read by name from an older printing (Mew ex with
  // Restart in place of Memory Helix), and its checked stage fixes never applied.
  '30C': '30th', MEE: 'mee', DLR: 'me06' };
const TD30_PAR = 4;          // at most 4 requests at once, to be polite
const TD30_MAX = 40;         // never more than 40 cards from the backup in one read

function td30SetId(code) {
  const c = String(code || '').toUpperCase();
  if (!c) return null;
  if (DATA30.sets && DATA30.sets[c]) return DATA30.sets[c];
  if (TD30_SETS[c]) return TD30_SETS[c];
  const pid = TCGEnrich.SET_MAP[c] || TCGEnrich.LEARNED_SETS[c];
  if (!pid) return null;
  let m = String(pid).match(/^(sv|me)(\d+)(pt5)?$/);
  if (m) return m[1] + m[2].padStart(2, '0') + (m[3] ? '.5' : '');
  m = String(pid).match(/^(swsh|sm)(\d+)(pt5)?$/);
  if (m) return m[1] + m[2] + (m[3] ? '.5' : '');
  return null;
}

/** TCGdex card id for a list line, or null. Newer sets number cards with three digits. */
function td30CardId(code, num) {
  const set = td30SetId(code);
  if (!set || !num) return null;
  let n = String(num).trim();
  if (!/^[A-Za-z0-9]{1,8}$/.test(n)) return null;
  if (/^(sv|me|30th)/.test(set) && /^\d+$/.test(n)) n = n.padStart(3, '0');   // 2.5.5: 30th Celebration ids are padded too
  // 3.2.8: TCGdex pads the later Sword and Shield sets too (Lost Origin's Gengar is swsh11-066).
  else if (/^swsh(9|1[0-2])$/.test(set) && /^\d+$/.test(n)) n = n.padStart(3, '0');
  return set + '-' + n;
}
/** 3.2.8: the same TCGdex id with its number padded the other way, for sets TCGdex numbers both ways. */
function td30AltId(id) {
  const m = String(id || '').match(/^((?:swsh|sm)[\d.]+[a-z]?)-(\d+)$/);
  if (!m) return null;
  const n = m[2].replace(/^0+(?=\d)/, '');
  const alt = n === m[2] ? n.padStart(3, '0') : n;
  return alt === m[2] ? null : m[1] + '-' + alt;
}
/** 3.2.8: the printing a TCGdex card is, in words ("Lost Origin 066"), so the Grade tab can name it. */
function td30Printing(t) {
  if (!t || typeof t !== 'object') return '';
  const set = t.set && typeof t.set.name === 'string' ? t.set.name.trim() : '';
  const num = typeof t.localId === 'string' ? t.localId.trim() : '';
  return /^[\w .:'&()-]{1,60}$/.test(set) && /^[A-Za-z0-9]{1,8}$/.test(num) ? set + ' ' + num : '';
}

/** A TCGdex card in the shape pokemontcg.io gives, which enrichCard reads. */
function td30Shape(t) {
  if (!t || typeof t !== 'object' || typeof t.name !== 'string') return null;
  t = fix37Td(t);
  if (!t) return null;
  const cat = String(t.category || '').toLowerCase();
  const supertype = cat === 'pokemon' ? 'Pokémon' : cat === 'trainer' ? 'Trainer' : cat === 'energy' ? 'Energy' : null;
  if (!supertype) return null;
  const sub = [];
  const rules = [];
  // v67: TCGdex writes Energy as symbols ("any {D} Energy attached"); spell them out the way the
  // other card source does, so every check that reads card text sees "Darkness Energy".
  const SYM = { g: 'Grass', r: 'Fire', w: 'Water', l: 'Lightning', p: 'Psychic', f: 'Fighting', d: 'Darkness', m: 'Metal', y: 'Fairy', n: 'Dragon', c: 'Colorless' };
  const txt = v => typeof v === 'string' ? v.replace(/<[^>]*>/g, ' ').replace(/\{([a-z])\}/gi, (m, ch) => SYM[ch.toLowerCase()] || m).replace(/[ \t]+/g, ' ').trim() : '';
  if (supertype === 'Pokémon') {
    const stage = String(t.stage || '').replace(/^stage\s*(\d)$/i, 'Stage $1');
    if (/^(basic|stage 1|stage 2)$/i.test(stage)) sub.push(stage.replace(/^basic$/i, 'Basic'));
    const suffix = String(t.suffix || '');
    if (suffix) sub.push(suffix);
    else if (/ ex$/.test(t.name)) sub.push('ex');
    if (/^mega /i.test(t.name)) sub.push('MEGA');
    if (/^radiant /i.test(t.name)) sub.push('Radiant');   // 2.5.4: a Rule Box, as pokemontcg.io marks it
  } else if (supertype === 'Trainer') {
    const tt = String(t.trainerType || '');
    sub.push(/tool/i.test(tt) ? 'Pokémon Tool' : tt || 'Item');
    if (txt(t.effect)) rules.push(txt(t.effect));
  } else {
    const et = String(t.energyType || '');
    // TCGdex marks some Special Energy as "Normal", so Basic goes by the name too.
    sub.push(!/special/i.test(et) && /^(basic )?(grass|fire|water|lightning|psychic|fighting|darkness|metal|fairy) energy$/i.test(t.name.trim()) ? 'Basic' : 'Special');
    if (txt(t.effect)) rules.push(txt(t.effect));
  }
  if (/ace spec/i.test(String(t.rarity || ''))) sub.push('ACE SPEC');
  return {
    id: typeof t.id === 'string' ? t.id : null,
    name: t.name,
    supertype,
    subtypes: sub,
    hp: t.hp != null ? String(t.hp) : undefined,
    types: Array.isArray(t.types) ? t.types.filter(x => typeof x === 'string') : [],
    evolvesFrom: typeof t.evolveFrom === 'string' ? t.evolveFrom : undefined,
    attacks: (Array.isArray(t.attacks) ? t.attacks : []).map(a => ({
      name: txt(a && a.name), cost: Array.isArray(a && a.cost) ? a.cost : [],
      damage: a && a.damage != null ? String(a.damage) : '', text: txt(a && a.effect),
    })),
    abilities: (Array.isArray(t.abilities) ? t.abilities : []).map(a => ({ name: txt(a && a.name), text: txt(a && a.effect), type: 'Ability' })),
    rules,
    weaknesses: (Array.isArray(t.weaknesses) ? t.weaknesses : []).filter(w => w && typeof w.type === 'string').map(w => ({ type: w.type, value: txt(w.value) })),
    convertedRetreatCost: typeof t.retreat === 'number' ? t.retreat : undefined,
    regulationMark: typeof t.regulationMark === 'string' && /^[A-Z]$/.test(t.regulationMark) ? t.regulationMark : undefined,
    number: typeof t.localId === 'string' ? t.localId : undefined,
  };
}

// Newest printing first: Mega Evolution sets, then Scarlet and Violet, then older.
// 2.5.5: sets whose TCGdex id has no number (30th Celebration, the promos, the Energy sets) by release.
const TD30_RANK = { '30th': 6055, '30th-c': 6054, mep: 6001, mee: 6000, svp: 5110, sve: 5000, mfb: 5000 };
function td30Rank(id) {
  const s = String(id || '');
  const k = Object.keys(TD30_RANK).filter(x => s.startsWith(x + '-')).sort((a, b) => b.length - a.length)[0];
  if (k) return TD30_RANK[k];
  const m = s.match(/^([a-z]+)(\d+)?(?:\.(\d))?[a-z]?-/);
  if (!m) return -1;
  const era = { me: 6, sv: 5, sve: 5, svp: 4, swsh: 3, sm: 2, xy: 1 }[m[1]] || 0;
  return era * 1000 + (parseInt(m[2] || '0', 10) * 10) + (m[3] ? 5 : 0);
}

let _td30Failed = false;
async function td30Get(path) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const init = {};
      if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) init.signal = AbortSignal.timeout(10000);
      const r = await fetch(TD30_API + path, init);
      if (r.ok) return await r.json();
      if (r.status !== 429 && r.status < 500) return null;
    } catch (_) {}
    if (attempt === 0) await new Promise(res => setTimeout(res, 1500));
  }
  _td30Failed = true;
  return null;
}

/** Read one list line from TCGdex: its own printing first, then the newest printing with that name. */
/** 3.2.8: a TCGdex id from Pokemon TCG Pocket (A1-225, A2b-010, P-A-002), not the card game. */
function td30Pocket(id) { return /^(?:[AB]\d+[a-z]?|P-[AB])-/.test(String(id || '')); }
async function td30Read(e) {
  const id = td30CardId(e.set, e.num);
  // 2.5.5: 30th Classic Collection cards carry the same 30C code as 30th Celebration.
  // 3.2.8: and Sword and Shield ids are tried padded both ways.
  const ids = id ? [id].concat(/^30th-/.test(id) ? [id.replace(/^30th-/, '30th-c-')] : [], td30AltId(id) || []) : [];
  for (const tid of ids) {
    const c = await td30Get('/cards/' + encodeURIComponent(tid));
    const shaped = td30Shape(c);
    if (shaped && TCGEnrich.sameCard(e.name, shaped.name)) return td30Pocket(tid) ? { card: shaped, exact: true, pocket: true } : { card: shaped, exact: true };
  }
  const want = td30SetId(e.set), wantNum = String(e.num || '').trim().replace(/^0+(?=\d)/, '').toLowerCase();
  const own = b => !!want && String(b.id).toLowerCase().startsWith(want.toLowerCase() + '-') &&
    String(b.localId || String(b.id).split('-').pop()).replace(/^0+(?=\d)/, '').toLowerCase() === wantNum;
  for (const v of [TCGEnrich.apiName(e.name)].concat(/^basic (\w+) energy$/i.test(TCGEnrich.apiName(e.name)) ? [TCGEnrich.apiName(e.name).replace(/^basic /i, '')] : [])) {
    const list = await td30Get('/cards?name=' + encodeURIComponent('eq:' + v));
    const hits = (Array.isArray(list) ? list : []).filter(b => b && typeof b.id === 'string' && TCGEnrich.sameCard(e.name, b.name || ''))
      .sort((a, b) => td30Rank(b.id) - td30Rank(a.id));
    // 3.2.8: TCGdex also lists Pokemon TCG Pocket cards. A name printed only for Pocket is not a card game card,
    // so it is read for what it does and marked, and the legality check counts it as not legal.
    const game = hits.filter(h => !td30Pocket(h.id));
    if (!game.length && hits.length) {
      const raw = await td30Get('/cards/' + encodeURIComponent(hits[0].id)), shaped = td30Shape(raw);
      if (shaped) return { card: shaped, exact: false, pocket: true, printing: td30Printing(raw) };
    }
    // 3.2.8: the list line's own printing, when the name search finds it under an id the guess missed.
    const mine = game.find(own);
    if (mine) {
      const shaped = td30Shape(await td30Get('/cards/' + encodeURIComponent(mine.id)));
      if (shaped) return { card: shaped, exact: true };
    }
    for (const b of game.slice(0, 2)) {
      const raw = await td30Get('/cards/' + encodeURIComponent(b.id));
      const shaped = td30Shape(raw);
      if (!shaped) continue;
      // 3.2.8: some TCGdex records leave out what the card evolves from (30th Classic Collection Gengar).
      // Every printing of an evolution evolves from the same Pokemon, so take it from another printing.
      if (!shaped.evolvesFrom && shaped.subtypes.some(x => /^stage [12]$/i.test(x))) {
        for (const o of game.filter(h => h !== b).slice(0, 3)) {
          const ot = await td30Get('/cards/' + encodeURIComponent(o.id));
          if (ot && typeof ot.evolveFrom === 'string' && ot.evolveFrom) { shaped.evolvesFrom = ot.evolveFrom; break; }
        }
      }
      return { card: shaped, exact: false, printing: td30Printing(raw) };
    }
    if (hits.length) break;
  }
  return null;
}

const _v29FetchDeck = TCGEnrich.fetchDeckCards;
TCGEnrich.fetchDeckCards = async function (entries, opts) {
  let map = null;
  try { map = await _v29FetchDeck.call(TCGEnrich, entries, opts); } catch (_) { map = null; }
  const firstFailed = !map || !!map.partial;
  const list = (entries || []).filter(e => e && e.name);
  const seen = new Set();
  const missing = list.filter(e => {
    const k = String(e.name).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    const got = map && map.get(k);
    return !got || !got.resolved;
  }).slice(0, TD30_MAX);
  if (!missing.length || (typeof navigator !== 'undefined' && navigator.onLine === false)) return map || new Map();
  if (!map) map = new Map();
  _td30Failed = false;
  const read = [];
  for (let i = 0; i < missing.length; i += TD30_PAR) {
    await Promise.all(missing.slice(i, i + TD30_PAR).map(async e => {
      let r = null;
      try { r = await td30Read(e); } catch (_) {}
      if (!r) return;
      const en = TCGEnrich.enrichCard(r.card);
      if (!r.exact) { en.matchedBy = 'name'; if (r.printing) en.printing = r.printing; }
      if (r.pocket) en.pocket = true;
      en.via = 'tcgdex';
      map.set(String(e.name).toLowerCase(), en);
      read.push(String(e.name).toLowerCase());
    }));
  }
  // Anything still missing gets the usual stub, so coverage stays honest.
  list.forEach(e => {
    const k = String(e.name).toLowerCase();
    if (!map.has(k)) map.set(k, TCGEnrich.enrichCard(null, { fallbackName: e.name }));
  });
  // Old data is kept only when the main source failed and a card is still unread.
  map.partial = firstFailed && [...map.values()].some(x => !x.resolved);
  map.tcgdex = read;
  return map;
};

// The first enrichDeckCards, for the wrappers below.
const _v29EnrichDeck = enrichDeckCards;

// The Grade tab before the backup line, for the wrapper below.
const _v29RenderGrade = renderGrade;

