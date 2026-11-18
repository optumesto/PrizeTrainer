// ═══════════ 3.1: tap a card to read it ═══════════
// On a deck's Cards tab, tapping a card (outside Mark cards you own) opens its full text:
// HP, type, stage, Abilities, attacks with their cost, damage and text, Weakness, Resistance,
// Retreat Cost, Trainer and Special Energy text, the Rule Box, regulation mark and set. Under it:
// what RdyDeck says the card does in this deck (Trainers), and the official rulings that name it.
//
// The full text is read from TCGdex (the same free card source the app already reads) the first
// time a card is opened, and saved on the device (at most CD31_MAX cards), so it opens offline
// after that. With no signal and nothing saved, the sheet shows what the deck already stores.
//
// Card text stays English in every language, like card names: it is card data. The labels
// around it (Weakness, Retreat and so on) go through the app's translation like any app text.
// Nothing here changes a grade.

const CD31_KEY = 'rd_cardtext';
const CD31_MAX = 400;
const CD31_TYPES = { grass: 'grass', fire: 'fire', water: 'water', lightning: 'electric', psychic: 'psychic', fighting: 'fighting',
  darkness: 'dark', metal: 'metal', dragon: 'dragon', fairy: 'fairy', colorless: '' };
const _cd31Again = new Set();
let _cd31Store = null, _cd31Open = null, _cd31Rul = null, _cd31RulP = null, _cd31Grade = null;

function cd31Load() {
  if (_cd31Store) return _cd31Store;
  let o = null;
  try { o = JSON.parse(safeLocalGet(CD31_KEY) || 'null'); } catch (_) {}
  _cd31Store = o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  return _cd31Store;
}
function cd31Save() {
  const S = cd31Load(), ids = Object.keys(S);
  if (ids.length > CD31_MAX) ids.sort((a, b) => (S[a].t || 0) - (S[b].t || 0)).slice(0, ids.length - CD31_MAX).forEach(k => delete S[k]);
  try { safeLocalSet(CD31_KEY, JSON.stringify(S)); } catch (_) {}
}

/** What the sheet keeps from a TCGdex card. Text is cleaned to plain words; nothing else is kept. */
function cd31Trim(t) {
  if (!t || typeof t !== 'object' || typeof t.name !== 'string') return null;
  try { if (typeof fix37Td === 'function') t = fix37Td(t); } catch (_) {}
  if (!t) return null;
  const s = v => typeof v === 'string' ? v.replace(/<[^>]*>/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, 900) : '';
  const n = v => typeof v === 'number' && isFinite(v) ? v : (typeof v === 'string' && /^\d+$/.test(v) ? +v : null);
  const types = a => (Array.isArray(a) ? a : []).filter(x => typeof x === 'string').slice(0, 6).map(x => x.slice(0, 12));
  const wr = a => (Array.isArray(a) ? a : []).filter(w => w && typeof w.type === 'string').slice(0, 3).map(w => ({ type: w.type.slice(0, 12), value: s(w.value).slice(0, 8) }));
  return {
    id: s(t.id), name: s(t.name), cat: s(t.category), hp: n(t.hp), types: types(t.types),
    stage: s(t.stage), from: s(t.evolveFrom), suffix: s(t.suffix),
    abilities: (Array.isArray(t.abilities) ? t.abilities : []).slice(0, 4).map(a => ({ type: s(a && a.type), name: s(a && a.name), text: s(a && a.effect) })),
    attacks: (Array.isArray(t.attacks) ? t.attacks : []).slice(0, 6).map(a => ({ name: s(a && a.name), cost: types(a && a.cost),
      dmg: a && a.damage != null ? s(String(a.damage)) : '', text: s(a && a.effect) })),
    weak: wr(t.weaknesses), res: wr(t.resistances), retreat: n(t.retreat),
    effect: s(t.effect), ttype: s(t.trainerType), etype: s(t.energyType),
    reg: typeof t.regulationMark === 'string' && /^[A-Z]$/.test(t.regulationMark) ? t.regulationMark : '',
    rarity: s(t.rarity), set: t.set && typeof t.set === 'object' ? s(t.set.name) : '', no: s(t.localId),
  };
}

/** The deck line's TCGdex card, read once and saved. Its own printing first, then the newest printing with that name. */
async function cd31Fetch(c) {
  if (typeof td30Get !== 'function' || typeof td30CardId !== 'function') return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  const id = td30CardId(c.set, c.num);
  const same = t => t && typeof TCGEnrich !== 'undefined' && TCGEnrich.sameCard(c.name, t.name);
  let got = null;
  // 3.3.1: Sword and Shield ids are tried padded both ways, as the deck's own card read does (Lost Origin Gengar).
  const alt = id && typeof td30AltId === 'function' ? td30AltId(id) : null;
  for (const tid of id ? [id].concat(/^30th-/.test(id) ? [id.replace(/^30th-/, '30th-c-')] : [], alt || []) : []) {
    const t = await td30Get('/cards/' + encodeURIComponent(tid));
    if (same(t)) { got = cd31Trim(t); break; }
  }
  if (!got && typeof TCGEnrich !== 'undefined') {
    const nm = TCGEnrich.apiName(c.name);
    const list = await td30Get('/cards?name=' + encodeURIComponent('eq:' + nm));
    const hits = (Array.isArray(list) ? list : []).filter(b => b && typeof b.id === 'string' && same(b))
      .sort((a, b) => (typeof td30Rank === 'function' ? td30Rank(b.id) - td30Rank(a.id) : 0));
    // 3.3.1: the list line's own printing, when the name search finds it under an id the guess missed.
    const set = typeof td30SetId === 'function' ? td30SetId(c.set) : null, num = String(c.num || '').replace(/^0+(?=\d)/, '').toLowerCase();
    const own = set && num ? hits.find(b => String(b.id).toLowerCase().startsWith(set.toLowerCase() + '-')
      && String(b.localId || String(b.id).split('-').pop()).replace(/^0+(?=\d)/, '').toLowerCase() === num) : null;
    const hit = own || hits[0];
    if (hit) { const t = cd31Trim(await td30Get('/cards/' + encodeURIComponent(hit.id))); if (t) { if (!own) t.other = true; got = t; } }
  }
  if (got) { cd31Load()[cd31Key(c)] = { t: Date.now(), d: got }; cd31Save(); }
  return got;
}
const cd31Key = c => (String(c.set || '').toUpperCase() + ' ' + String(c.num || '')).trim() + '|' + String(c.name || '').toLowerCase();
function cd31Saved(c) { const e = cd31Load()[cd31Key(c)]; return e && e.d ? e.d : null; }

// ── rulings (rulings.json, read once) ──
function cd31Rulings() {
  if (_cd31Rul) return Promise.resolve(_cd31Rul);
  if (!_cd31RulP) _cd31RulP = fetch('rulings.json').then(r => r.ok ? r.json() : null)
    .then(j => { _cd31Rul = j && Array.isArray(j.rulings) ? j : { rulings: [], sources: [] }; return _cd31Rul; })
    .catch(() => { _cd31RulP = null; return { rulings: [], sources: [] }; });
  return _cd31RulP;
}
const cd31Nm = n => String(n || '').replace(/\{[a-zA-Z]\}/g, '').replace(/[‘’]/g, "'").normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
/** What a card is and what its text does, as rulings.json tags read it. */
function cd31Tags(c, f) {
  const t = new Set();
  const nm = String((f && f.name) || c.name || '');
  const sub = (c.sub || []).map(x => String(x).toLowerCase());
  const kind = cd31Kind(c, f);
  if (/ ex$/.test(nm) && !/^mega /i.test(nm)) t.add('ex');
  if (sub.includes('tera')) t.add('tera');
  if (kind.includes('ACE SPEC')) t.add('ace');
  if (kind.includes('Pokémon Tool')) t.add('tool');
  if (kind.includes('Stadium')) t.add('stadium');
  if (kind.includes('Supporter')) t.add('supporter');
  if (kind.includes('Stage 1') || kind.includes('Stage 2')) t.add('evolution');
  const abs = f ? f.abilities : (c.atext || []).map(([n, x]) => ({ name: n, text: x }));
  if (abs.length) t.add('ability');
  const text = [].concat(abs.map(a => a.text), f ? f.attacks.map(a => a.text) : [], f ? f.effect : (c.rtext || c.etext || '')).join(' ');
  if (/damage counters? on/i.test(text)) t.add('counters');
  if (/Benched Pok[eé]mon/i.test(text) && /damage/i.test(text)) t.add('bench');
  if (/\b(Asleep|Burned|Confused|Paralyzed|Poisoned)\b/.test(text)) t.add('condition');
  if (/\b(more|less) damage\b|damage done to (this|your)/i.test(text)) t.add('modifier');
  if (/\bRetreat Cost\b|\bswitch\b/i.test(text)) t.add('retreat');
  if (/during your (opponent's )?next turn/i.test(text)) t.add('lasting');
  return t;
}
/** The official rulings for this card: those that name it, then those for what it is or does. At most 4. */
function cd31RulingsFor(c, f, R) {
  const k = cd31Nm(c.apiName || c.name), tags = cd31Tags(c, f);
  const all = (R && R.rulings) || [];
  const named = all.filter(r => (r.cards || []).some(x => cd31Nm(x) === k));
  const tagged = all.filter(r => !named.includes(r) && (r.tags || []).some(x => tags.has(x)));
  return named.concat(tagged).slice(0, 4);
}
function cd31Source(R, id) { return ((R && R.sources) || []).find(s => s.id === id) || null; }

// ── drawing ──
const cd31Dot = t => { const k = String(t || '').toLowerCase(), v = CD31_TYPES[k]; return `<i class="cd31-e${v ? '' : ' c'}"${v ? ` style="--t:var(--${v})"` : ''} title="${esc(t)}"></i>`; };
function cd31Cost(cost) {
  const a = (cost || []).filter(Boolean);
  if (!a.length) return '<span class="cd31-cost" data-no-tr aria-label="No Energy cost"></span>';
  return `<span class="cd31-cost" data-no-tr role="img" aria-label="${esc(a.join(', '))}">${a.map(cd31Dot).join('')}</span>`;
}
const cd31Cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

/** The card's kind as the label chips show it. */
function cd31Kind(c, f) {
  const out = [];
  const cat = f ? f.cat.toLowerCase() : String(c.supertype || '').toLowerCase().replace('é', 'e');
  const sub = (c.sub || []).map(x => String(x).toLowerCase());
  if (cat === 'pokemon') {
    const st = f && f.stage ? f.stage : c.stage === 'stage2' ? 'Stage2' : c.stage === 'stage1' ? 'Stage1' : 'Basic';
    out.push(/2/.test(st) ? 'Stage 2' : /1/.test(st) ? 'Stage 1' : 'Basic');
    if (/^mega /i.test(c.name)) out.push('Mega Evolution Pokémon');
    if (sub.includes('tera')) out.push('Tera');
    if (sub.includes('ancient')) out.push('Ancient');
    if (sub.includes('future')) out.push('Future');
  } else if (cat === 'trainer') {
    const tt = f && f.ttype ? f.ttype.toLowerCase() : c.ttype || '';
    out.push(/tool/.test(tt) ? 'Pokémon Tool' : /supporter/.test(tt) ? 'Supporter' : /stadium/.test(tt) ? 'Stadium' : 'Item');
  } else if (cat === 'energy') {
    out.push((f ? /special/i.test(f.etype) : !c.basic && !/^basic /i.test(c.name)) ? 'Special Energy' : 'Basic Energy');
  }
  if (c.ace || (f && /ace spec/i.test(f.rarity))) out.push('ACE SPEC');
  return out;
}

/** The Rule Box lines printed on the card, from what kind of card it is. Card text, so English. */
function cd31RuleBox(c, f) {
  const nm = String((f && f.name) || c.name || ''), out = [];
  const sub = (c.sub || []).map(x => String(x).toLowerCase());
  const mega = /^mega /i.test(nm) && / ex$/i.test(nm);
  if (mega) out.push('Mega Evolution Pokémon ex rule: When your Mega Evolution Pokémon ex is Knocked Out, your opponent takes 3 Prize cards.');
  else if (/ ex$/.test(nm)) out.push('Pokémon ex rule: When your Pokémon ex is Knocked Out, your opponent takes 2 Prize cards.');
  if (sub.includes('tera')) out.push('Tera: As long as this Pokémon is on your Bench, prevent all damage done to this Pokémon by attacks (both yours and your opponent\'s).');
  if (c.ace || (f && /ace spec/i.test(f.rarity))) out.push('ACE SPEC: You can\'t have more than 1 ACE SPEC card in your deck.');
  return out;
}

function cd31Html(c, f, opts) {
  const o = opts || {};
  const nm = String(c.apiName || c.name || '').replace(/\{[a-zA-Z]\}/g, '').trim();
  const cat = f ? f.cat.toLowerCase() : String(c.supertype || '').toLowerCase().replace('é', 'e');
  const img = c.imageUrl ? `<img class="cd31-img" src="${esc(String(c.imageUrl).replace(/\.png$/, '_hires.png'))}" onerror="this.onerror=null;this.src='${esc(c.imageUrl)}'" alt="${esc(nm)}">` : '';
  const row = (label, val) => `<div class="cd31-f"><span class="cd31-l">${label}</span><span class="cd31-v" data-no-tr>${val}</span></div>`;
  let h = `<div class="cd31">${img}<div class="cd31-body">`;
  h += `<div class="modal-title cd31-name" data-no-tr>${esc(nm)}</div>`;
  h += `<div class="cd31-chips">${cd31Kind(c, f).map(k => `<span class="cd31-chip">${esc(k)}</span>`).join('')}${c.count ? `<span class="cd31-chip q" data-no-tr>×${c.count}</span>` : ''}</div>`;

  if (cat === 'pokemon') {
    const hp = f && f.hp != null ? f.hp : c.hp;
    const types = f && f.types.length ? f.types : (c.types || []).map(cd31Cap);
    const from = f && f.from ? f.from : c.evolvesFrom;
    h += '<div class="cd31-facts">';
    if (hp) h += `<div class="cd31-f"><span class="cd31-v big">${hp} HP</span></div>`;
    if (types.length) h += row('Type', types.map(t => cd31Dot(t) + esc(cd31Cap(String(t)))).join(' '));
    if (from) h += row('Evolves from', esc(from));
    h += '</div>';
    // Abilities: the full text when read, else what the deck stores.
    const abs = f ? f.abilities : (c.atext || []).map(([n, t]) => ({ name: n, text: t }));
    abs.forEach(a => { h += `<div class="cd31-blk ab"><div class="cd31-bh"><span class="cd31-tag">Ability</span><b data-no-tr>${esc(a.name)}</b></div>${a.text ? `<p class="cd31-tx" data-no-tr>${esc(a.text)}</p>` : ''}</div>`; });
    const atks = f ? f.attacks : (c.attacks || []).map(a => ({ name: a.name, cost: (a.cost || []).map(cd31Cap), dmg: a.dmg ? String(a.dmg) : '', text: '' }));
    atks.forEach(a => { h += `<div class="cd31-blk"><div class="cd31-bh">${cd31Cost(a.cost)}<b data-no-tr>${esc(a.name)}</b>${a.dmg ? `<span class="cd31-dmg" data-no-tr>${esc(a.dmg)}</span>` : ''}</div>${a.text ? `<p class="cd31-tx" data-no-tr>${esc(a.text)}</p>` : ''}</div>`; });
    h += '<div class="cd31-facts wrr">';
    if (f) {
      h += f.weak.length ? row('Weakness', f.weak.map(w => cd31Dot(w.type) + esc(cd31Cap(w.type)) + (w.value ? ' ' + esc(w.value) : '')).join(' ')) : `<div class="cd31-f"><span class="cd31-l">Weakness</span><span class="cd31-v">none</span></div>`;
      h += f.res.length ? row('Resistance', f.res.map(w => cd31Dot(w.type) + esc(cd31Cap(w.type)) + (w.value ? ' ' + esc(w.value) : '')).join(' ')) : `<div class="cd31-f"><span class="cd31-l">Resistance</span><span class="cd31-v">none</span></div>`;
      if (f.retreat != null) h += row('Retreat', f.retreat ? cd31Cost(Array(f.retreat).fill('Colorless')) + ' ' + f.retreat : '0');
    } else {
      if (c.weak) h += row('Weakness', cd31Dot(c.weak) + esc(cd31Cap(c.weak)));
      if (c.retreat != null) h += row('Retreat', c.retreat ? cd31Cost(Array(c.retreat).fill('Colorless')) + ' ' + c.retreat : '0');
    }
    h += '</div>';
  } else {
    const tx = f ? f.effect : (c.rtext || c.etext || '');
    if (tx) h += `<div class="cd31-blk"><p class="cd31-tx" data-no-tr>${esc(tx)}</p></div>`;
  }
  const rb = cd31RuleBox(c, f);
  if (rb.length) h += `<div class="cd31-rb"><div class="cd31-rbh">Rule Box</div>${rb.map(r => `<p class="cd31-tx" data-no-tr>${esc(r)}</p>`).join('')}</div>`;

  const reg = f && f.reg ? f.reg : c.reg && c.reg.mark ? c.reg.mark : '';
  const pr = [f && f.set ? f.set : '', f && f.no ? f.no : c.num || ''].filter(Boolean).join(' ');
  h += '<div class="cd31-facts small">';
  if (reg) h += row('Regulation mark', esc(reg));
  if (pr || c.set) h += row('Printing', esc(f && f.set ? pr : [String(c.set || '').toUpperCase(), c.num].filter(Boolean).join(' ')));
  // 3.2.8: the same price as the card's tile on the Cards tab (TCGplayer market price, or "no price").
  try {
    const pt = typeof op30PriceText === 'function' && c.set && c.num ? op30PriceText(op30Price(c.set, c.num)) : '';
    if (pt) h += `<div class="cd31-f"><span class="cd31-l">Price</span><span class="cd31-v"${pt === 'no price' ? '' : ' data-no-tr'}>${esc(pt)}</span></div>`;
  } catch (_) {}
  h += '</div>';

  h += `<div id="cd31-here"></div><div id="cd31-rul"></div>`;
  if (!f) h += `<p class="cd31-note" id="cd31-note">${o.reading ? 'Reading the full card text…' : 'The full card text shows once you open this card with a signal.'}</p>`;
  else h += `<p class="cd31-note">${f.other ? 'Card text from TCGdex, read from another printing of this card.' : 'Card text from TCGdex.'}</p>`;
  return h + `</div></div><div class="modal-actions"><button class="btn btn-primary" onclick="closeSheet()">Done</button></div>`;
}

/** "In this deck" for a Trainer or Special Energy: the same words as the Grade tab's Trainers section. */
function cd31Here(deck, c) {
  try {
    const key = deck.id + '|' + (typeof deckListText === 'function' ? deckListText(deck.cards) : '');
    if (!_cd31Grade || _cd31Grade.key !== key) {
      const R = typeof g29Grade === 'function' ? (g29Grade(deck) || gradeDeck(deck)) : gradeDeck(deck);
      _cd31Grade = { key, R };
    }
    const tr = _cd31Grade.R && _cd31Grade.R.coh && _cd31Grade.R.coh.trainers;
    if (!tr) return null;
    const k = cd31Nm(c.apiName || c.name);
    if (tr.ace && cd31Nm(String(tr.ace.link || '').replace(/^ACE SPEC: /, '')) === k) {
      return { fit: { covers: 'key', fine: 'good', weak: 'weak', dead: 'dead' }[tr.ace.fit] || null, why: tr.ace.p, here: tr.ace.here };
    }
    const r = (tr.fit || []).find(x => cd31Nm(x.name) === k);
    return r ? { fit: r.fit, why: r.why, here: r.here } : null;
  } catch (_) { return null; }
}
function cd31HereHtml(x) {
  if (!x || (!x.why && !x.here)) return '';
  const tag = x.fit && typeof GT_LABEL === 'object' && GT_LABEL[x.fit] ? `<span class="t68-tag ${x.fit}">${GT_LABEL[x.fit]}</span>` : '';
  return `<div class="cd31-sec"><div class="cd31-sh">How it fits this deck ${tag}</div>${x.why ? `<p class="cd31-p">${esc(x.why)}</p>` : ''}${x.here ? `<p class="t68-here"><b>In this deck:</b> ${esc(x.here)}</p>` : ''}</div>`;
}

// 3.2.3: All rules opens in a new tab, which starts with no sessionStorage, so inside
// the Play app the link carries ?src=play and the rules page still knows it is the Play app (no ads).
function cd31RulHtml(list, R) {
  if (!list.length) return '';
  return `<div class="cd31-sec"><div class="cd31-sh">Official rules</div>${list.map(r => {
    const s = cd31Source(R, r.src);
    const where = [s && s.edition, r.where].filter(Boolean).join(', ');
    return `<div class="cd31-rul"><p class="cd31-q" data-no-tr>${esc(r.q)}</p><p class="cd31-a" data-no-tr>${esc(r.a)}</p>
      <p class="cd31-src">${s ? `<a href="${esc(s.url)}" target="_blank" rel="noopener" data-no-tr>${esc(s.title)}</a>` : ''}${where ? ` <span data-no-tr>(${esc(where)})</span>` : ''}</p></div>`;
  }).join('')}<a class="btn btn-sm cd31-all" href="rulings.html${typeof PT_PLAY !== 'undefined' && PT_PLAY ? '?src=play' : ''}#${esc(list[0].id)}" target="_blank" rel="noopener">All rules</a></div>`;
}

function cd31Deck() { return state.decks.find(d => String(d.id) === String(state.activeDeckId)) || (typeof _op30Deck !== 'undefined' ? _op30Deck : null); }

/** Open the card a Cards tab tile shows. */
async function cd31OpenTile(el) {
  const deck = cd31Deck();
  if (!deck || !Array.isArray(deck.cards)) return;
  const nmEl = el.querySelector('.review-card-name');
  const shown = String(el.dataset.op30 || (nmEl && nmEl.textContent) || '').trim();
  const k = cd31Nm(shown), pr = String(el.dataset.op30p || '').toUpperCase();
  const hits = deck.cards.filter(c => cd31Nm(c.apiName || c.name) === k || cd31Nm(c.name) === k);
  const c0 = hits.find(c => [c.set, c.num].filter(Boolean).join(' ').toUpperCase() === pr) || hits[0];
  if (!c0) return;
  // Two printings of a Trainer share a tile: show the tile's count.
  const mon = String(c0.supertype || '').toLowerCase().indexOf('pok') === 0;
  const c = Object.assign({}, c0, { count: !mon && hits.length > 1 ? hits.reduce((a, x) => a + (x.count || 0), 0) : c0.count });
  cd31Show(deck, c);
}

async function cd31Show(deck, c) {
  const tok = _cd31Open = {};
  let f = cd31Saved(c);
  const online = !(typeof navigator !== 'undefined' && navigator.onLine === false);
  openSheet(cd31Html(c, f, { reading: !f && online }), true);
  const sheet = document.getElementById('x-modal-inner');
  const fill = () => {
    if (_cd31Open !== tok) return;
    const cat = String(c.supertype || '').toLowerCase();
    const here = document.getElementById('cd31-here');
    if (here && (cat === 'trainer' || (cat === 'energy' && !c.basic))) here.innerHTML = cd31HereHtml(cd31Here(deck, c));
    cd31Rulings().then(R => {
      if (_cd31Open !== tok) return;
      const box = document.getElementById('cd31-rul');
      if (box) box.innerHTML = cd31RulHtml(cd31RulingsFor(c, f, R), R);
    });
  };
  fill();
  // 3.3.1 (Muse 3.3 retest, H4/H5): text saved from another printing is read again once a session, so a card
  // whose own printing the lookup missed before (Lost Origin Gengar under 3.2.7) shows its own text once it can.
  const again = !!(f && f.other && online && !_cd31Again.has(cd31Key(c)));
  if ((f && !again) || !online) return;
  if (again) _cd31Again.add(cd31Key(c));
  const was = f;
  try { f = await cd31Fetch(c); } catch (_) { f = null; }
  if (_cd31Open !== tok || !document.getElementById('x-modal').classList.contains('active') || !sheet) return;
  if (f && (!was || !f.other)) { sheet.innerHTML = cd31Html(c, f); fill(); }
  else if (!f && !was) { const n = document.getElementById('cd31-note'); if (n) n.textContent = 'The full card text could not be read just now. Try again later.'; }
}

(function () {
  const body = document.getElementById('review-body');
  const tile = e => { const el = e.target.closest && e.target.closest('.review-group .review-card'); return el && body.contains(el) ? el : null; };
  const marking = () => typeof _op30Mark !== 'undefined' && _op30Mark;
  if (body) {
    body.addEventListener('click', e => {
      if (marking()) return;
      const el = tile(e);
      if (el) { e.preventDefault(); cd31OpenTile(el); }
    });
    body.addEventListener('keydown', e => {
      if (marking() || (e.key !== 'Enter' && e.key !== ' ')) return;
      const el = tile(e);
      if (el) { e.preventDefault(); cd31OpenTile(el); }
    });
  }
  // Tiles are buttons outside marking mode. Run after anything that redraws them.
  function mark() {
    if (!body || marking()) return;
    body.querySelectorAll('.review-group .review-card').forEach(el => {
      el.setAttribute('role', 'button'); el.tabIndex = 0;
      el.classList.add('cd31-tap');
    });
  }
  if (typeof op30Cards === 'function') { const _oc = op30Cards; op30Cards = function () { const r = _oc.apply(this, arguments); try { mark(); } catch (_) {} return r; }; }
  const _rr = renderReview;
  renderReview = function () { const r = _rr.apply(this, arguments); try { mark(); } catch (_) {} return r; };
})();
