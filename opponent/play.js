// Sparring (opponent/play.html): you against the AI opponent, on RdyDeck's own list layout.
// Sparring: your deck against the AI opponent for 5 of your turns. The opponent's side is one line, and
// after each of its turns a short "Opponent's turn" card says what it did to you. You set up your own
// Active and Bench from your opening hand.
// A full game (both sides shown, played to the end) is kept for tests and opens only with ?full.
// 3.4.6: live, linked from the Hand tab next to Goldfish. Inside the code the mode is still called '5turn'.
// 3.4.7: your own saved decks play too, as your deck or the opponent's (opponent/own.js). OWN_ON turns it off again.
(function () {
'use strict';
const OPP_ON = true; // false would hide the page again unless it opens with ?try
const OWN_ON = true; // true lets your saved decks play (live since 3.4.7)
const ownOn = () => { if (OWN_ON || /[?&]mine\b/.test(location.search)) return true; try { return localStorage.getItem('rd_own') === '1'; } catch (_) { return false; } };
window.RD_FT = true; // js/i18n.js turns on this page's own translations (I18N_FT_ROWS)
const E = window.RdyPuzzle, G = window.RdyGame, AI = window.RdyAI, D = window.RdyOppDecks;
const PRESS_TURNS = 5;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const $ = id => document.getElementById(id);
// Card names stay English in every language (data-no-tr keeps js/i18n.js off them); app words sit in their own nodes so they translate.
const cn = n => `<span data-no-tr>${esc(n)}</span>`;

let S = null; // { s, mode, level, ai, deckA, deckB, busy, oppLog, over }
let OWN = null; // your saved decks, built for Sparring (opponent/own.js), once read
let OWN_ACTIVE = null; // the deck open in RdyDeck when you left it

/* ---------------- Names for what is on the screen ---------------- */
function monById(s, id) { for (let k = 0; k < 2; k++) { const m = E.mons(s.players[k]).find(z => z.id === id); if (m) return { m, k }; } return null; }
// A Pokémon's name, with its spot when the same side has two of that name in play ("your Chikorita (Bench 2)"),
// so two buttons that look alike say which one they act on.
function monName(s, id) {
  const f = monById(s, id); if (!f) return 'a Pokémon';
  const P = s.players[f.k], n = E.topOf(f.m).card.name, twin = E.mons(P).filter(z => E.topOf(z).card.name === n).length > 1;
  const spot = !twin ? '' : P.active === f.m ? ' (Active)' : ' (Bench ' + (P.bench.indexOf(f.m) + 1) + ')';
  return (f.k === 0 ? 'your ' : 'their ') + n + spot;
}
function cardRef(s, uid) {
  for (const P of s.players) for (const z of [P.hand, P.deck, P.discard, P.prizes]) { const r = z.find(y => y.uid === uid); if (r) return r; }
  for (const P of s.players) for (const m of E.mons(P)) { const r = m.energy.concat(m.tool ? [m.tool] : [], m.stack).find(y => y.uid === uid); if (r) return r; }
  // Cards a card effect holds while you choose (the top cards of a deck you look at).
  const c = s.pending && s.pending.ctx;
  if (c) for (const k in c) if (Array.isArray(c[k])) { const r = c[k].find(y => y && typeof y === 'object' && y.uid === uid && y.card); if (r) return r; }
  return null;
}
function refName(s, uid) { const r = cardRef(s, uid); return r ? r.card.name : 'a card'; }
function names(s, uids) { const g = new Map(); uids.forEach(u => { const n = refName(s, u); g.set(n, (g.get(n) || 0) + 1); }); return [...g].map(([n, c]) => (c > 1 ? c + ' ' : '') + n).join(', '); }
function label(s, a) {
  const P = s.players[s.cur], card = uid => refName(s, uid), mon = id => monName(s, id).replace(/^your /, '');
  switch (a.t) {
    case 'bench': return 'Bench ' + card(a.uid);
    case 'evolve': return `Evolve ${mon(a.mon)} into ${card(a.uid)}`;
    case 'candy': return `Rare Candy: ${mon(a.mon)} into ${card(a.s2)}`;
    case 'energy': return `${card(a.uid)} to ${mon(a.mon)}`;
    case 'tool': return `Attach ${card(a.uid)} to ${mon(a.mon)}`;
    case 'stadium': case 'trainer': return 'Play ' + card(a.uid);
    case 'stadiumUse': return 'Use ' + s.stadium.ref.card.name;
    case 'ability': { const f = monById(s, a.mon); return `${mon(a.mon)}: ${E.readAbilities(E.topOf(f.m))[a.i].name}`; }
    case 'handAbility': { const r = P.hand.find(y => y.uid === a.uid); return `${r.card.name} from your hand: ${E.readAbilities(r)[a.i].name}`; }
    case 'retreat': return `Retreat into ${mon(a.mon)}${a.pay && a.pay.length ? ', discarding ' + names(s, a.pay) : ''}`;
    case 'attack': { const c = a.via == null ? E.topOf(P.active).card.attacks[a.i] : E.internals.attackList(s, P.active).find(x => x.act.i === a.i && JSON.stringify(x.act.via) === JSON.stringify(a.via)).a; return `${c.name}${c.dmg ? ' (' + c.dmg + ')' : ''}`; }
    case 'promote': return 'Make ' + monName(s, a.mon).replace(/^(your|their) /, '') + ' Active';
    case 'end': return 'End your turn';
  }
  return a.t;
}
// Choices inside the card effects of a full game (opponent/effects.js) say what kind of thing they pick.
const HOOK_MON = /^(heal|wally|snipe|toolOff|switchOpt|swapOut|energyToBench|perCounter|raid|benchSwap|topAttach|discardAttach)$/;
const HOOK_CARD = /^(oppDiscardTo|gwynn|kinds|eri|pokeBack|comfey|handPick|deckDiscard)$/;
// Any other card effect choice is a Pokémon or a card: whichever every one of its choices is.
function hookKind(s, st) {
  if (HOOK_MON.test(st.t)) return 'mon'; if (HOOK_CARD.test(st.t)) return 'card';
  const ch = G.next(s).actions.map(a => a.v).filter(v => typeof v === 'number');
  const isMon = ch.length && ch.every(v => monById(s, v)), isCard = ch.length && ch.every(v => cardRef(s, v));
  return isCard && !isMon ? 'card' : isMon ? 'mon' : 'card';
}
// A "Choose 1" option is the card's own text, so it shows as printed (card text is never translated):
// the bullet of the card whose words match the engine's lowercased option.
const OPT_TEXT = '\u0001';
function optionText(s, label) {
  const R = s.pending, c = R && R.ctx && R.ctx.name && D.cards[R.ctx.name], norm = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s*\([^)]*\)/g, '').replace(/[.\s]+$/, '').replace(/\s+/g, ' ');
  const parts = c && c.rtext ? c.rtext.split('•').slice(1).map(x => x.trim()) : [];
  const hit = parts.find(x => norm(x) === norm(label)) || parts.find(x => norm(x).startsWith(norm(label).slice(0, 30)));
  return hit ? OPT_TEXT + hit : label;
}
function pickLabel(s, v) {
  const R = s.pending, A = R.ask, st = R.steps[A.step], mon = id => monName(s, id);
  if (A.kind === 'hook') {
    if (v == null) return 'Done';
    if (v === true) return 'Yes'; if (v === false) return 'No';
    if (st.t === 'bolt') return v ? `Discard ${v} Energy` : 'Discard none';
    if (typeof v === 'object') {
      if (v.stadium) return 'Discard the Stadium';
      if (v.tool) return 'The Tool on ' + mon(v.mon);
      if (v.n != null) return `${v.n} damage counter${v.n === 1 ? '' : 's'} on ${mon(v.mon)}`;
      return `${refName(s, v.uid)} from ${mon(v.mon)}`;
    }
    if (typeof v === 'number') return hookKind(s, st) === 'card' ? refName(s, v) : mon(v);
    return String(v);
  }
  switch (A.kind) {
    case 'yesno': return v ? 'Yes' : 'No';
    case 'option': return optionText(s, st.opts[v].label);
    case 'benchMon': return 'Switch in ' + mon(v);
    case 'oppBench': return 'Bring up ' + mon(v);
    case 'oppMon': case 'benchHit': case 'pickUp': case 'splitAttach': return mon(v);
    case 'moveCounters': return `${v.n} from ${mon(v.from)} to ${mon(v.to)}`;
    case 'moveEnergy': return `${refName(s, v.uid)} from ${mon(v.from)} to ${mon(v.to)}`;
    case 'moveToSelf': return v == null ? 'Done' : `${refName(s, v.uid)} from ${mon(v.from)}`;
    case 'attach': return v == null ? 'Done' : `${refName(s, v.uid)} to ${mon(v.mon)}`;
    case 'cost': case 'search': case 'recover': case 'look': return v.length ? names(s, v) : 'Take nothing';
    case 'topFromHand': return refName(s, v);
    case 'splitHand': { const r = (s.pending.ctx.splitPair || []).find(y => y.uid === v.uid); return (r ? r.card.name : 'a card') + ' into your hand'; }
  }
  return String(v);
}
const cap = t => t ? t[0].toUpperCase() + t.slice(1) : t;
function askText(s) {
  const R = s.pending, A = R.ask, who = R.ctx.name ? cn(R.ctx.name) + (window.rdI18n && rdI18n.lang === 'fr' ? ' : ' : ': ') : '';
  const q = { yesno: 'Do it?', option: 'Choose one', benchMon: 'Choose your new Active Pokémon', oppBench: 'Choose which of their Benched Pokémon comes up',
    search: 'Choose cards from your deck', recover: 'Choose cards from your discard pile', look: 'Choose from the cards you looked at', cost: 'Choose cards to discard',
    attach: 'Attach Energy', topFromHand: 'Choose a card to put on top of your deck',
    splitHand: 'Choose the card that goes into your hand. The other one gets attached.', splitAttach: 'Choose the Pokémon to attach the other card to' }[A.kind] || 'Choose';
  const st = R.steps[A.step];
  if (A.kind === 'hook' && st && st.t === 'deckDiscard') return who + `<span>Choose a card from your deck to discard (${(R.ctx.dd || 0) + 1} of ${st.n})</span>`;
  return who + `<span>${q}</span>`;
}

/* ---------------- Drawing the board ----------------
 * 3.4.8: every card shows its picture, and every Pokémon in play (yours and your opponent's) shows its attacks,
 * their Energy costs and damage, and its Energy as small type marks. Tap a card for its full text in a sheet.
 * Laid out as RdyDeck lists and panels, not as a play mat.
 */
// Energy types as small round marks with the letter players write in lists ({G}, {R}...), in RdyDeck's own colors.
const TYPE_L = { grass: 'G', fire: 'R', water: 'W', lightning: 'L', psychic: 'P', fighting: 'F', darkness: 'D', metal: 'M', fairy: 'Y', dragon: 'N', colorless: 'C' };
const tname = t => t ? t[0].toUpperCase() + t.slice(1) : '';
const pip = (t, ring) => { const k = TYPE_L[t] ? t : 'colorless'; return `<i class="pip t-${k}${ring ? ' ring' : ''}" title="${tname(k)}" data-no-tr>${TYPE_L[k]}</i>`; };
const costPips = cost => (cost && cost.length ? cost.map(t => pip(t)).join('') : '<i class="pip t-none" title="No Energy" data-no-tr>0</i>');
// The type an attached Energy gives: its basic type, else the card's own type, else Colorless (shown with a ring: a Special Energy).
function eType(ref) { const t = E.T.gfEType(ref); if (t) return { t, sp: false }; const c = ref.card; return { t: c.types && c.types[0] && TYPE_L[c.types[0]] ? c.types[0] : 'colorless', sp: true }; }
// Attached Energy, grouped: a mark per kind with its count ("G 3"), so three Grass Energy read at a glance.
function energyMarks(m) {
  if (!m.energy.length) return '<span class="none">No Energy</span>';
  const g = new Map();
  m.energy.forEach(e => { const k = e.card.name; if (!g.has(k)) g.set(k, { e: eType(e), n: 0, name: k }); g.get(k).n++; });
  return [...g.values()].map(x => `<span class="eg" title="${esc(x.n + ' ' + x.name)}">${pip(x.e.t, x.e.sp)}${x.n > 1 ? `<b data-no-tr>${x.n}</b>` : ''}</span>`).join('');
}
/* Card pictures: Limitless's copy of the card first (by set code and number), then TCGdex, then the record's own link.
 * A picture that fails moves to the next link; the one that loads is remembered for the rest of the visit. */
const ART_OK = {};
function tdId(img) {
  const m = /images\.pokemontcg\.io\/([a-z0-9]+)\/([A-Za-z0-9]+)\.png/.exec(img || ''); if (!m) return null;
  let r = m[1].match(/^(sv|me)(\d+)(pt5)?$/);
  if (r) return { ser: r[1], set: r[1] + r[2].padStart(2, '0') + (r[3] ? '.5' : ''), n: /^\d+$/.test(m[2]) ? m[2].padStart(3, '0') : m[2] };
  r = m[1].match(/^(swsh|sm)(\d+)(pt5)?$/);
  if (r) { const set = r[1] + r[2] + (r[3] ? '.5' : ''); return { ser: r[1], set, n: /^swsh(9|1[0-2])$/.test(set) && /^\d+$/.test(m[2]) ? m[2].padStart(3, '0') : m[2] }; }
  return null;
}
function artUrls(c, big) {
  const out = [], set = String(c.set || '').toUpperCase(), n = String(c.num || '');
  if (/^[A-Z0-9]{2,6}$/.test(set) && /^[A-Za-z0-9]{1,8}$/.test(n)) {
    const clean = n.replace(/^0+(?=\d)/, ''), pad = /^\d+$/.test(clean) ? clean.padStart(3, '0') : clean, base = `https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/${set}/${set}_`;
    [pad, clean].filter((x, i, a) => a.indexOf(x) === i).forEach(x => { out.push(base + x + (big ? '_R_EN.png' : '_R_EN_XS.png')); });
    if (big) out.push(base + pad + '_R_EN_XS.png');
  }
  const td = tdId(c.img);
  if (td) out.push(`https://assets.tcgdex.net/en/${td.ser}/${td.set}/${td.n}/${big ? 'high' : 'low'}.webp`);
  if (/^https:\/\/[\w.-]+\//.test(c.img || '') && !/["'<>\s|]/.test(c.img)) out.push(c.img);
  return out;
}
function artHTML(c, cls, big) {
  const key = (big ? 'B:' : 'S:') + (c.key || c.name), list = artUrls(c, big), ok = ART_OK[key];
  const urls = ok ? [ok].concat(list.filter(u => u !== ok)) : list;
  const ph = `<span class="ph t-${TYPE_L[(c.types || [])[0]] ? c.types[0] : 'colorless'}" data-no-tr>${esc(c.name)}</span>`;
  if (!urls.length) return `<span class="art ${cls} noart">${ph}</span>`;
  // 3.4.9: art that has loaded before shows at once, with no fade, so the board doesn't flicker each time it redraws.
  if (ok) return `<span class="art ${cls} loaded seen">${ph}<img src="${esc(ok)}" data-a="${esc(list.filter(u => u !== ok).join('|'))}" data-k="${esc(key)}" alt="" decoding="sync" onerror="RdyPlay.ie(this)"></span>`;
  return `<span class="art ${cls}">${ph}<img src="${esc(urls[0])}" data-a="${esc(urls.slice(1).join('|'))}" data-k="${esc(key)}" alt="" loading="lazy" decoding="async" onerror="RdyPlay.ie(this)" onload="RdyPlay.il(this)"></span>`;
}
function hpLine(s, m) { const hp = E.maxHp(s, m), left = Math.max(0, hp - m.dmg); return `${left} of ${hp} HP`; }
function cond(m) { return [m.cond, m.poison ? 'poisoned' : '', m.burn ? 'burned' : ''].filter(Boolean).map(x => `<span>${x[0].toUpperCase() + x.slice(1)}</span>`).join(', '); }
// Can this Pokémon pay for this attack now? Your Active asks the rules (what you can really do this turn);
// any other Pokémon counts its Energy against the cost. Missing: how many more Energy it needs, at least.
function attackState(s, m, k, i, okSet) {
  const a = E.topOf(m).card.attacks[i];
  if (okSet && k === 0 && s.players[0].active === m) return okSet.has(i) ? { ok: true } : { ok: false, miss: Math.max(0, a.cost.length - m.energy.length) };
  const r = E.costMet(m.energy, a.cost || []);
  return r === true ? { ok: true } : { ok: false, miss: Math.max(0, (a.cost || []).length - m.energy.length), unknown: r == null };
}
function attacksHTML(s, m, k, okSet, full) {
  const c = E.topOf(m).card, out = [];
  E.readAbilities(E.topOf(m)).forEach(A => out.push(`<div class="ab"><span class="tag">Ability</span> <b data-no-tr>${esc(A.name)}</b></div>`));
  (c.attacks || []).forEach((a, i) => {
    const st = attackState(s, m, k, i, okSet);
    const need = st.ok ? '' : st.miss > 0 ? `<span class="need">${st.miss === 1 ? 'Needs 1 more Energy' : `Needs ${st.miss} more Energy`}</span>` : `<span class="need">Needs other Energy</span>`;
    out.push(`<div class="atk${st.ok ? ' ok' : ''}"><span class="cost">${costPips(a.cost)}</span><b data-no-tr>${esc(a.name)}</b>${a.dmg ? `<span class="dmg" data-no-tr>${esc(a.dmg)}</span>` : ''}${need}</div>`);
  });
  if (full) {
    const ret = E.retreatCost(s, m, k), w = c.weak, r = c.res;
    out.push(`<div class="wr">${w ? `<span><span>Weakness</span> ${pip(w.type)}<span data-no-tr>×${w.x || 2}</span></span>` : ''}${r && r.type ? `<span><span>Resistance</span> ${pip(r.type)}<span data-no-tr>-${Math.abs(r.n || r.x || 30)}</span></span>` : ''}<span><span>Retreat</span> ${ret ? costPips(Array(ret).fill('colorless')) : '<span>None</span>'}</span></div>`);
  }
  return out.join('');
}
function monRow(s, m, k, active, okSet) {
  const c = E.topOf(m).card, hp = E.maxHp(s, m), pct = hp ? Math.max(0, Math.round((hp - m.dmg) / hp * 100)) : 0;
  return `<div class="mon${active ? ' act' : ''}" role="button" tabindex="0" onclick="RdyPlay.card('m',${m.id})" onkeydown="if(event.key==='Enter')RdyPlay.card('m',${m.id})">${artHTML(c, active ? 'a' : 'b')}
    <div class="mb"><div class="mn"><b data-no-tr>${esc(c.name)}</b>${c.p > 1 ? `<span class="pv">${c.p} Prizes</span>` : ''}</div>
    <div class="hp"><span class="bar${pct <= 34 ? ' low' : ''}"><i style="width:${pct}%"></i></span><span>${hpLine(s, m)}</span><span class="en">${energyMarks(m)}</span></div>
    ${m.tool || cond(m) ? `<div class="meta">${m.tool ? '<span>Tool:</span> ' + cn(m.tool.card.name) : ''}${m.tool && cond(m) ? ' · ' : ''}${cond(m) ? '<span class="bad">' + cond(m) + '</span>' : ''}</div>` : ''}
    <div class="atks">${attacksHTML(s, m, k, okSet, active)}</div></div></div>`;
}
// Which of your Active's attacks the rules let you use right now (its attack buttons), for "ready" marks.
function readyAttacks(s) {
  const X = G.next(s); if (X.who !== 0 || s.pending) return null;
  return new Set(X.actions.filter(a => a.t === 'attack' && a.via == null).map(a => a.i));
}
// Both sides the same way: Active, then Bench, then the piles. Your opponent's hand shows as a count only.
function sideHTML(s, k, okSet) {
  const P = s.players[k], you = k === 0;
  // Prize cards left as small card outlines (the RdyDeck logo's card shape); taken ones stay as faint slots.
  const n = P.prizes.length, slots = Array.from({ length: Math.max(6, n) }, (_, i) => `<i${i < n ? '' : ' class="gone"'}></i>`).join('');
  const head = `<div class="sh"><span>${you ? 'You' : 'Opponent'}</span><span class="pr"><span class="pz" aria-hidden="true">${slots}</span><span class="vh">${n} Prize card${n === 1 ? '' : 's'} left</span></span></div>`;
  const piles = `<div class="piles">${you ? '' : `<span>Hand</span> ${P.hand.length} · `}<span>Deck</span> ${P.deck.length} · <button type="button" class="lk" onclick="RdyPlay.pile(${k})"><span>Discard pile</span> ${P.discard.length}</button></div>`;
  const act = `<div class="zl">Active</div>${P.active ? monRow(s, P.active, k, true, okSet) : '<div class="empty">No Active Pokémon</div>'}`;
  const bench = `<div class="zl"><span>Bench</span> <span>${P.bench.length} of 5</span></div>${P.bench.length ? `<div class="bench">${P.bench.map(m => monRow(s, m, k, false, null)).join('')}</div>` : '<div class="empty">Empty</div>'}`;
  return `<div class="side ${you ? 'me' : 'opp'}">${head}${act}${bench}${piles}</div>`;
}
function handHTML(s) {
  const P = s.players[0], g = new Map();
  P.hand.forEach(r => { const k = r.card.key; if (!g.has(k)) g.set(k, { r, n: 0 }); g.get(k).n++; });
  const tiles = [...g.values()].map(x => `<button type="button" class="hc" onclick="RdyPlay.card('h',${x.r.uid})">${artHTML(x.r.card, 'h')}<span class="hn" data-no-tr>${esc(x.r.card.name)}</span>${x.n > 1 ? `<b class="hx" data-no-tr>×${x.n}</b>` : ''}</button>`).join('');
  return `<div class="hand"><div class="zl hz"><span>Your hand</span><span class="ct" data-no-tr>${P.hand.length}</span></div>${tiles ? `<div class="tiles">${tiles}</div>` : '<span class="empty">Empty</span>'}</div>`;
}
/* ---------------- A discard pile: every card in it, newest first, grouped by name ---------------- */
function pileHTML(s, k) {
  const P = s.players[k], g = new Map();
  P.discard.slice().reverse().forEach(r => { const key = r.card.key || r.card.name; if (!g.has(key)) g.set(key, { r, n: 0 }); g.get(key).n++; });
  const tiles = [...g.values()].map(x => `<button type="button" class="hc" onclick="RdyPlay.card('c',${x.r.uid},${k})">${artHTML(x.r.card, 'h')}<span class="hn" data-no-tr>${esc(x.r.card.name)}</span>${x.n > 1 ? `<b class="hx" data-no-tr>×${x.n}</b>` : ''}</button>`).join('');
  const title = k === 0 ? 'Your discard pile' : "Opponent's discard pile";
  return `<div class="sheet-bg" onclick="RdyPlay.shut()"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sh"><span><span>${title}</span> <span class="ct" data-no-tr>${P.discard.length}</span></span><button type="button" class="btn ghost x" onclick="RdyPlay.shut()">Close</button></div>
    ${tiles ? `<p class="note">Newest first. Tap a card to read it.</p><div class="tiles pile">${tiles}</div>` : '<p class="empty">No cards yet.</p>'}</div>`;
}
/* ---------------- The card sheet: one card's full text ---------------- */
const KIND = { item: 'Item', supporter: 'Supporter', stadium: 'Stadium', tool: 'Pokémon Tool' };
function sheetHTML(s, ref, m, k, back) {
  const c = ref.card, rows = [];
  if (c.cat === 'pokemon') {
    const stage = c.stage === 'stage1' ? 'Stage 1' : c.stage === 'stage2' ? 'Stage 2' : 'Basic';
    rows.push(`<div class="sl"><span>${stage}</span>${c.from ? ` · <span>Evolves from</span> ${cn(c.from)}` : ''} · <span>${(m ? E.maxHp(s, m) : c.hp) + ' HP'}</span>${c.types && c.types[0] ? ' · ' + pip(c.types[0]) : ''}${c.p > 1 ? ` · <span class="pv">${c.p} Prizes</span>` : ''}</div>`);
    if (m) rows.push(`<div class="sl"><span>${hpLine(s, m)}</span> · <span class="en">${energyMarks(m)}</span></div>` +
      (m.energy.length ? `<div class="sl mute">${cn([...new Map(m.energy.map(e => [e.card.name, 0])).keys()].map(n => m.energy.filter(e => e.card.name === n).length + ' ' + n).join(', '))}</div>` : '') +
      (m.tool ? `<div class="sl"><span>Tool:</span> ${cn(m.tool.card.name)}</div><p class="tx" data-no-tr>${esc(m.tool.card.rtext || '')}</p>` : '') +
      (cond(m) ? `<div class="sl bad">${cond(m)}</div>` : ''));
    (c.abil || []).forEach(([n, t]) => rows.push(`<div class="sa"><div><span class="tag">Ability</span> <b data-no-tr>${esc(n)}</b></div><p class="tx" data-no-tr>${esc(t)}</p></div>`));
    (c.attacks || []).forEach((a, i) => {
      const st = m ? attackState(s, m, k, i, k === 0 && s.players[0].active === m ? readyAttacks(s) : null) : null;
      rows.push(`<div class="sa${st && st.ok ? ' ok' : ''}"><div class="atk${!st || st.ok ? ' ok' : ''}"><span class="cost">${costPips(a.cost)}</span><b data-no-tr>${esc(a.name)}</b>${a.dmg ? `<span class="dmg" data-no-tr>${esc(a.dmg)}</span>` : ''}${st && !st.ok ? `<span class="need">${st.miss === 1 ? 'Needs 1 more Energy' : st.miss > 1 ? `Needs ${st.miss} more Energy` : 'Needs other Energy'}</span>` : ''}</div>${a.text ? `<p class="tx" data-no-tr>${esc(a.text)}</p>` : ''}</div>`);
    });
    const ret = m ? E.retreatCost(s, m, k) : c.retreat;
    rows.push(`<div class="wr"><span><span>Weakness</span> ${c.weak ? pip(c.weak.type) + `<span data-no-tr>×${c.weak.x || 2}</span>` : '<span>None</span>'}</span><span><span>Resistance</span> ${c.res && c.res.type ? pip(c.res.type) + `<span data-no-tr>-${Math.abs(c.res.n || c.res.x || 30)}</span>` : c.resUnknown ? '<span>Not saved</span>' : '<span>None</span>'}</span><span><span>Retreat</span> ${ret ? costPips(Array(ret).fill('colorless')) : '<span>None</span>'}</span></div>`);
  } else if (c.cat === 'trainer') {
    rows.push(`<div class="sl"><span>Trainer</span> · <span>${KIND[c.kind] || 'Item'}</span>${c.ace ? ' · <span class="pv" data-no-tr>ACE SPEC</span>' : ''}</div><p class="tx" data-no-tr>${esc(c.rtext || '')}</p>`);
    if (cantDo(s, ref)) rows.push(`<p class="note">Sparring can't do this card's text yet. You can still play it, and nothing happens.</p>`);
  } else {
    rows.push(`<div class="sl"><span>Energy</span> · ${pip(eType(ref).t, eType(ref).sp)}</div>${c.rtext ? `<p class="tx" data-no-tr>${esc(c.rtext)}</p>` : ''}`);
    if (cantDo(s, ref)) rows.push(`<p class="note">Sparring can't do all of this card's text yet. It still counts as Energy.</p>`);
  }
  return `<div class="sheet-bg" onclick="RdyPlay.shut()"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(c.name)}">
    <div class="sh"><b data-no-tr>${esc(c.name)}</b><button type="button" class="btn ghost x" onclick="RdyPlay.shut()">${back != null ? 'Back' : 'Close'}</button></div>
    <div class="sbody">${artHTML(c, 'big', true)}<div class="sinfo">${rows.join('')}</div></div></div>`;
}
// Cards Sparring can't play the text of (so playing them does nothing), checked once per card.
const CANT = new WeakMap();
function cantDo(s, ref) {
  const c = ref.card; if (c.cat === 'pokemon') return false;
  if (!CANT.has(c)) { let bad = false; try { bad = E.cardProblems(s, { card: c, uid: -1 }, true).length > 0; } catch (_) { bad = false; } CANT.set(c, bad); }
  return CANT.get(c);
}
function showSheet() {
  const el = $('sheet'); if (!el) return;
  const s = S && S.s, o = S && S.open;
  let ref = null, m = null, k = 0;
  if (s && o) {
    if (o.t === 'd') { el.className = 'open'; el.innerHTML = pileHTML(s, o.id); return; }
    if (o.t === 'm') { const f = monById(s, o.id); if (f) { m = f.m; k = f.k; ref = E.topOf(m); } }
    else ref = s.players[0].hand.find(y => y.uid === o.id) || (s.stadium && s.stadium.ref.uid === o.id ? s.stadium.ref : null) || cardRef(s, o.id);
  }
  if (!ref) { el.innerHTML = ''; el.className = ''; if (S) S.open = null; return; }
  el.className = 'open';
  el.innerHTML = sheetHTML(s, ref, m, k, o.back);
}
function actionsHTML(s) {
  if (S.over) return resultHTML();
  if (S.busy) return `<div class="q">Opponent is playing…</div>`;
  const X = G.next(s);
  // After a Knock Out in the opponent's turn you choose your new Active right away, under what the opponent did.
  const promoting = X.who === 0 && s.promote && s.promote.length;
  if (S.oppLog) {
    return `<div class="oppturn"><div class="q">Opponent's turn</div><ol>${S.oppLog.map(t => `<li>${esc(t)}</li>`).join('') || '<li>It passed.</li>'}</ol>` +
      (promoting ? '' : `<button class="btn primary" onclick="RdyPlay.go()">Take your turn</button>`) + '</div>' + (promoting ? promoteHTML(s, X) : '');
  }
  if (X.who !== 0) return '';
  const acts = E.legalActions(s, { why: true });
  let h = '';
  if (promoting) return promoteHTML(s, X);
  if (s.pending && s.pending.ask && s.pending.ask.kind === 'search' && s.cur === 0) return multiHTML(s, X, true);
  if (s.pending && s.pending.ask && /^(cost|search|recover|look)$/.test(s.pending.ask.kind) && X.actions.length > 6) return multiHTML(s, X);
  if (s.pending && s.pending.ask) {
    return `<div class="q">${askText(s)}</div><div class="btns">${X.actions.map((a, i) => `<button class="btn" onclick="RdyPlay.do(${i})">${(l => l[0] === OPT_TEXT ? cn(l.slice(1)) : esc(cap(l)))(pickLabel(s, a.v))}</button>`).join('')}</div>`;
  }
  const ok = [], no = [], seen = new Set();
  acts.forEach(a => { const l = label(s, a), key = l + (a.why || ''); if (seen.has(key)) return; seen.add(key); (a.why ? no : ok).push({ a, l, i: X.actions.findIndex(b => JSON.stringify(b) === JSON.stringify({ ...a, why: undefined })) }); });
  const groups = [['hand', 'From your hand'], ['energy', 'Attach Energy'], ['ability', 'Abilities'], ['retreat', 'Retreat'], ['attack', 'Attack'], ['end', '']];
  const kind = a => ['attack', 'end', 'energy', 'ability', 'retreat'].includes(a.t) ? a.t : 'hand';
  h += `<div class="q">Your move</div>`;
  groups.forEach(([g, title]) => {
    const list = ok.filter(x => kind(x.a) === g && x.i >= 0); if (!list.length) return;
    if (title) h += `<div class="gt">${title}</div>`;
    // A card Sparring can't do yet says so on its button (playing it does nothing).
    const nope = a => { const r = /^(trainer|stadium|tool)$/.test(a.t) && s.players[0].hand.find(y => y.uid === a.uid); return r && cantDo(s, r) ? '<span class="nt">Does nothing in Sparring yet</span>' : ''; };
    h += `<div class="btns">${list.map(x => `<button class="btn${g === 'attack' ? ' primary' : g === 'end' ? ' ghost' : ''}" onclick="RdyPlay.do(${x.i})">${esc(x.l)}${nope(x.a)}</button>`).join('')}</div>`;
  });
  if (no.length) h += `<details class="no"><summary>Can't do right now (${no.length})</summary><ul>${no.map(x => `<li><b>${esc(x.l)}</b> <span>${esc(x.a.why)}</span></li>`).join('')}</ul></details>`;
  return h;
}
function promoteHTML(s, X) {
  return `<div class="q">Choose your new Active Pokémon</div><div class="btns">${X.actions.map((a, i) => `<button class="btn" onclick="RdyPlay.do(${i})">${esc(label(s, a))}</button>`).join('')}</div>`;
}
// Picking several cards (search, discard for a cost): tap cards to add them, then confirm, instead of one button per mix.
function pickKey(s, v) { return v.map(u => refName(s, u)).sort().join('|'); }
function multiHTML(s, X, deck) {
  const sel = S.sel || (S.sel = {}), keys = X.actions.map(a => pickKey(s, a.v)), max = {};
  keys.forEach(k => { const c = {}; (k ? k.split('|') : []).forEach(n => { c[n] = (c[n] || 0) + 1; }); for (const n in c) max[n] = Math.max(max[n] || 0, c[n]); });
  const chosen = Object.keys(sel).flatMap(n => Array(sel[n]).fill(n)).sort().join('|'), hit = keys.indexOf(chosen);
  const chips = Object.keys(max).sort().map(n => `<button class="btn${sel[n] ? ' primary' : ''}" onclick="RdyPlay.tog(${esc(JSON.stringify(n))})">${cn(n)}${max[n] > 1 ? ` (<span>${sel[n] || 0} of ${max[n]}</span>)` : ''}</button>`).join('');
  const none = keys.indexOf('');
  // 3.4.9: a search shows your whole deck, sorted (Pokémon, Trainers, Energy), as the real card lets you look. Cards
  // this search can take are tappable; the rest are dimmed. Tap a card again to take one more, or to drop it.
  let pick = `<div class="btns">${chips}</div>`;
  if (deck) {
    const g = new Map(), rank = { pokemon: 0, trainer: 1, energy: 2 };
    s.players[0].deck.forEach(r => { const n = r.card.name; if (!g.has(n)) g.set(n, { r, n: 0 }); g.get(n).n++; });
    const tiles = [...g.values()].sort((a, b) => (rank[a.r.card.cat] ?? 3) - (rank[b.r.card.cat] ?? 3) || a.r.card.name.localeCompare(b.r.card.name)).map(x => {
      const n = x.r.card.name, can = max[n] > 0, on = sel[n] || 0;
      return `<button type="button" class="hc${can ? '' : ' off'}${on ? ' on' : ''}"${can ? ` onclick="RdyPlay.tog(${esc(JSON.stringify(n))})" aria-pressed="${on ? 'true' : 'false'}"` : ' disabled'}>${artHTML(x.r.card, 'h')}<span class="hn" data-no-tr>${esc(n)}</span>${on ? `<b class="hx pk" data-no-tr>✓${max[n] > 1 ? ' ' + on : ''}</b>` : x.n > 1 ? `<b class="hx" data-no-tr>×${x.n}</b>` : ''}</button>`;
    }).join('');
    pick = `<p class="note">Your whole deck (${s.players[0].deck.length} cards). Cards this can take are bright; tap one to choose it.</p><div class="tiles pile deck">${tiles}</div>`;
  }
  return `<div class="q">${askText(s)}</div>${pick}<div class="btns" style="margin-top:10px">` +
    (hit >= 0 && chosen ? `<button class="btn primary" onclick="RdyPlay.do(${hit})">${s.pending.ask.kind === 'cost' ? 'Discard' : 'Take'} ${esc(names(s, X.actions[hit].v))}</button>` : chosen ? '<span class="note">That mix isn\'t allowed. Tap a card again to drop it.</span>' : '') +
    (none >= 0 ? ` <button class="btn ghost" onclick="RdyPlay.do(${none})">${s.pending.ask.kind === 'cost' ? 'Discard nothing' : 'Take nothing'}</button>` : '') + '</div>';
}
// The end: who won. At the turn limit, whoever took more Prize cards wins, and the same number is a draw.
function resultHTML() {
  const s = S.s, R = G.result(s) || { winner: -1, took: [6 - s.players[0].prizes.length, 6 - s.players[1].prizes.length], by: 'game' }, t = R.took;
  const head = R.by === 'prizes' ? (R.winner === 0 ? 'You win on Prize cards.' : R.winner === 1 ? 'Your opponent wins on Prize cards.' : "It's a draw.")
    : R.winner === 0 ? 'You win.' : R.winner === 1 ? 'Your opponent wins.' : 'Game over.';
  const sub = R.by === 'prizes' ? `After ${PRESS_TURNS} turns each, you took ${t[0]} Prize card${t[0] === 1 ? '' : 's'} and your opponent took ${t[1]}.` : '';
  return `<div class="result"><div class="q">${esc(head)}</div>${sub ? `<p class="note">${esc(sub)}</p>` : ''}<div class="line"><span>Opponent level:</span> <span>${esc(S.levelName)}</span> · <span>Opponent's deck:</span> ${cn(S.deckB.name)}</div>
    <button class="btn primary" onclick="RdyPlay.again()">Play again</button> <button class="btn ghost" onclick="RdyPlay.menu()">Change decks</button></div>`;
}
// Setup: your opening hand, then your Active and Bench, before anything is shown of the opponent.
function setupHTML(s) {
  const P = s.players[0], U = S.setup, B = G.setupChoices(s, 0);
  const nm = r => cn(r.card.name);
  const notes = [s.firstPlayer === 0 ? 'You won the coin flip, so you go first.' : 'Your opponent won the coin flip, so they go first.'];
  if (s.mulls[0]) notes.push(s.mulls[0] === 1 ? 'You took 1 mulligan.' : `You took ${s.mulls[0]} mulligans.`);
  if (s.mulls[1]) notes.push(s.mulls[1] === 1 ? 'Your opponent took 1 mulligan, so you draw 1 more card after setup.' : `Your opponent took ${s.mulls[1]} mulligans, so you draw ${s.mulls[1]} more cards after setup.`);
  let h = `<div class="turn"><span>Game setup</span> · <span>${esc(S.levelName)}</span></div>` + notes.map(x => `<p class="note">${x}</p>`).join('') + (S.deckA.own ? deckNote(S.deckA, false) : '') + handHTML(s);
  h += `<div class="acts"><div class="q">Choose your Active Pokémon</div><div class="btns">${B.map(r => `<button class="btn${U.active === r.uid ? ' primary' : ''}" onclick="RdyPlay.su(${r.uid})">${nm(r)}</button>`).join('')}</div>`;
  if (U.active != null) {
    const rest = B.filter(r => r.uid !== U.active);
    h += rest.length ? `<div class="gt"><span>Your Bench</span> <span>${U.bench.length} of 5</span></div><p class="note">Tap a Pokémon to put it on your Bench. Tap it again to take it off.</p><div class="btns">${rest.map(r => `<button class="btn${U.bench.includes(r.uid) ? ' primary' : ''}" onclick="RdyPlay.sb(${r.uid})">${nm(r)}</button>`).join('')}</div>`
      : `<p class="note">No other Basic Pokémon in your hand for your Bench.</p>`;
    h += `<div class="btns" style="margin-top:14px"><button class="btn primary" onclick="RdyPlay.sgo()">Start the game</button></div>`;
  }
  return h + '</div>';
}
function render() {
  if (S.setup) { $('app').innerHTML = `<div class="narrow">${setupHTML(S.s)}</div>`; showSheet(); return; }
  const s = S.s;
  if (E.internals && E.internals.setReal) E.internals.setReal(!!s.real);
  // Whose turn it is, counted from 1 for each player ("Your turn 1 of 5" before your first turn too).
  const n = k => Math.max(1, Math.min(s.turns[k], PRESS_TURNS));
  const head = S.mode !== '5turn' ? `Turn ${s.turns[0] + s.turns[1]}` : s.cur === 1 && !S.over ? `Opponent's turn ${n(1)} of ${PRESS_TURNS}` : `Your turn ${n(0)} of ${PRESS_TURNS}`;
  const turn = `<div class="turn"><span>${head}</span> · <span>${esc(S.levelName)}</span> · ${s.stadium ? `<span>Stadium:</span> <button type="button" class="lk" onclick="RdyPlay.card('c',${s.stadium.ref.uid})">${cn(s.stadium.ref.card.name)}</button>` : '<span>No Stadium</span>'}</div>`;
  const okSet = S.busy || S.oppLog ? null : readyAttacks(s);
  // Two columns on a wide screen (the board, then your hand and moves); one column on a phone.
  $('app').innerHTML = turn + `<div class="game"><div class="board">${sideHTML(s, 1, null)}${sideHTML(s, 0, okSet)}</div><div class="play">${handHTML(s)}<div class="acts">${actionsHTML(s)}</div>` +
    // The whole game, every line, from the first.
    `<details class="log"${S.logOpen ? ' open' : ''} ontoggle="RdyPlay.logT(this.open)"><summary>Full game log</summary><ol>${s.log.map(t => `<li>${esc(t)}</li>`).join('')}</ol></details></div></div>`;
  showSheet();
}

/* ---------------- Playing ---------------- */
function checkOver() {
  const s = S.s;
  if (G.winner(s) >= 0 || s.gameOver != null || s.timeUp) { S.over = true; return true; }
  return false;
}
function oppStep() {
  // The opponent acts one move at a time, with a calm pause (no more than about 2 board changes a second), so you can
  // follow what it does. Card art that has loaded stays put between moves (see artHTML), so nothing flashes.
  const s = S.s, X = G.next(s);
  if (checkOver()) { S.busy = false; render(); return; }
  if (X.who !== 1) { S.busy = false; if (S.oppTurn) { S.oppLog = S.s.log.slice(S.oppTurn.from); S.oppTurn = null; } save(); render(); return; }
  if (s.cur === 1 && !S.oppTurn) S.oppTurn = { from: s.log.length - 1 };
  S.busy = true; render();
  const at = S;
  setTimeout(() => {
    if (S !== at) return; // the game was left or started again meanwhile
    const a = S.ai.choose(S.s, 1);
    S.s = G.step(S.s, a); rec(a);
    oppStep();
  }, s.cur === 1 ? 600 : 50);
}
/* ---------------- Keeping a game through a reload ----------------
 * A game is saved as its seed, both setups and every move in order (yours and the opponent's), and played
 * again from those on the next visit. The same seed deals the same cards, so the board comes back as it was.
 * Saved in this browser only (localStorage), with the decks by name or id, never the cards.
 */
const SAVE_KEY = 'rd_spar_game', MENU_KEY = 'rd_spar_menu', SAVE_V = 1;
const store = { get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (_) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }, del(k) { try { localStorage.removeItem(k); } catch (_) {} } };
function deckCards(d) { if (d.cards) return d.cards.slice(); const out = []; d.list.forEach(([k, n]) => { for (let i = 0; i < n; i++) out.push(D.cards[k]); }); return out; }
// Your deck by id, with its card names, so a deck changed since the game started doesn't come back as a different game.
function deckRef(d) { return d.own ? { o: String(d.id), sig: d.cards.map(c => c.name).join('|') } : { m: D.decks.indexOf(d) }; }
function deckOf(r) {
  if (!r) return null;
  if (r.m != null) return D.decks[r.m] || null;
  const d = (OWN || []).find(x => String(x.id) === r.o && !x.block);
  return d && d.cards.map(c => c.name).join('|') === r.sig ? d : null;
}
function rec(a) { if (S && S.rec) S.rec.acts.push(a); save(); }
function save() { if (!S || !S.rec) return; S.rec.oppLog = S.oppLog || null; S.rec.oppTurn = S.oppTurn || null; S.rec.sel = S.sel || null; store.set(SAVE_KEY, S.rec); }
function drop() { store.del(SAVE_KEY); }
/** The saved game, played again move by move. False when there is none, or it can't come back the same. */
function resume() {
  const R = store.get(SAVE_KEY);
  if (!R || R.v !== SAVE_V) return false;
  const a = deckOf(R.a), b = deckOf(R.b);
  if (!a || !b || !AI.LEVELS[R.level]) { drop(); return false; }
  try {
    let s = G.newGame([deckCards(a), deckCards(b)], { seed: R.seed, maxTurns: R.mode === '5turn' ? PRESS_TURNS : 0 });
    s = G.setUp(s, 1, R.opp.active, R.opp.bench);
    const opts = { mode: R.mode, level: R.level, deckA: a, deckB: b };
    S = { s, mode: R.mode, level: R.level, levelName: AI.LEVELS[R.level].name, ai: new AI.Player(R.level, (R.seed + 1 + R.acts.length) >>> 0), deckA: a, deckB: b, busy: false, oppLog: null, over: false, opts, rec: R };
    if (!R.me) { S.setup = { active: null, bench: [] }; render(); return true; }
    s = G.setUp(s, 0, R.me.active, R.me.bench);
    for (const x of R.acts) s = G.step(s, x);
    S.s = s; S.oppLog = R.oppLog || null; S.oppTurn = R.oppTurn || null; S.sel = R.sel || null;
  } catch (e) { S = null; drop(); return false; }
  if (checkOver()) { render(); return true; }
  oppStep();
  return true;
}

const api = {
  do(i) {
    if (!S || S.busy || S.over) return;
    const X = G.next(S.s); const a = X.actions[i]; if (!a || X.who !== 0) return;
    S.s = G.step(S.s, a); S.sel = null; S.open = null; rec(a);
    if (checkOver()) { save(); render(); return; }
    oppStep();
  },
  tog(n) {
    const sel = S.sel || (S.sel = {}), X = G.next(S.s), keys = X.actions.map(a => pickKey(S.s, a.v));
    const most = Math.max(...keys.map(k => k.split('|').filter(x => x === n).length));
    sel[n] = (sel[n] || 0) + 1; if (sel[n] > most) delete sel[n];
    save(); render();
  },
  go() { S.oppLog = null; save(); render(); if (checkOver()) render(); },
  logT(open) { if (S) S.logOpen = !!open; },
  // A card's full text: 'm' a Pokémon in play (by id), 'h' a card in your hand, 'c' any other card you can see (by uid).
  card(t, id, back) { if (!S) return; S.open = { t, id, back }; showSheet(); },
  pile(k) { if (!S) return; S.open = { t: 'd', id: k }; showSheet(); },
  // From a card opened in a discard pile, Back goes to the pile; anything else closes.
  shut() { if (S) S.open = S.open && S.open.back != null ? { t: 'd', id: S.open.back } : null; showSheet(); },
  _s() { return S && S.s; }, // tests: the game state
  // Card pictures: on a failed link try the next one; remember the one that loads.
  ie(img) { img.parentNode.classList.remove('seen'); const a = (img.getAttribute('data-a') || '').split('|').filter(Boolean); if (a.length) { img.setAttribute('data-a', a.slice(1).join('|')); img.src = a[0]; } else { img.remove(); } },
  il(img) { const k = img.getAttribute('data-k'); if (k) ART_OK[k] = img.getAttribute('src'); img.parentNode.classList.add('loaded'); },
  start(opts, seedIn) {
    const seed = seedIn != null ? seedIn : Math.floor(Math.random() * 2 ** 31);
    let s = G.newGame([deckCards(opts.deckA), deckCards(opts.deckB)], { seed, maxTurns: opts.mode === '5turn' ? PRESS_TURNS : 0 });
    S = { s, mode: opts.mode, level: opts.level, levelName: AI.LEVELS[opts.level].name, ai: new AI.Player(opts.level, seed + 1), deckA: opts.deckA, deckB: opts.deckB, busy: false, oppLog: null, over: false, opts };
    // The opponent sets up first, out of sight; then you pick your own Active and Bench from your opening hand.
    const them = AI.setupPick(s, 1, opts.level, G.rngFrom(seed + 3));
    S.s = G.setUp(s, 1, them.active, them.bench);
    S.setup = { active: null, bench: [] };
    S.rec = { v: SAVE_V, seed, mode: opts.mode, level: opts.level, a: deckRef(opts.deckA), b: deckRef(opts.deckB), opp: them, me: null, acts: [] };
    save();
    render();
  },
  // Setup: tap a Basic to make it your Active, then tap Basics to put them on your Bench.
  su(uid) { if (!S || !S.setup) return; const U = S.setup; if (U.active === uid) { U.active = null; U.bench = []; } else { U.active = uid; U.bench = U.bench.filter(u => u !== uid); } render(); },
  sb(uid) { if (!S || !S.setup || S.setup.active == null) return; const U = S.setup; if (U.bench.includes(uid)) U.bench = U.bench.filter(u => u !== uid); else if (U.bench.length < 5) U.bench.push(uid); render(); },
  sgo() {
    if (!S || !S.setup || S.setup.active == null) return;
    S.rec.me = { active: S.setup.active, bench: S.setup.bench.slice() };
    S.s = G.setUp(S.s, 0, S.setup.active, S.setup.bench); S.setup = null;
    save();
    oppStep();
  },
  again() { api.start(S.opts); },
  lang(l) { rdI18n.set(l, true); Promise.resolve(rdI18n.ready).then(() => { if (!S) menu(); }); },
  menu() { S = null; drop(); menu(); },
};
window.RdyPlay = api;

/** What to know about one of your decks before it plays: why it can't, or which cards don't do all of their text yet. */
function deckNote(d, who) {
  const lead = who ? `<span>${who}</span> ` : '', p = t => `<p class="note">${lead}${t}</p>`;
  if (d.block === 'count') return p(`<span>This deck has ${d.n} cards. Sparring needs 60.</span>`);
  if (d.block === 'data') return p(`<span>RdyDeck has no card data for these cards yet:</span> ${cn(d.missing.join(', '))}. <span>Open the deck in RdyDeck while online, then come back.</span>`);
  if (d.block === 'basic') return p('<span>This deck has no Basic Pokémon.</span>');
  let h = '';
  if (d.plain.length) h += p(`<span>Not every card does all of its text yet:</span> ${cn(d.plain.join(', '))}. <span>They still play, and the parts Sparring can't do yet are skipped.</span>`);
  if (d.colorless.length) h += p(`<span>Sparring can't read this Energy yet, so each one counts as 1 Colorless Energy:</span> ${cn(d.colorless.join(', '))}.`);
  return h || p('<span>Every card in this deck plays in full.</span>');
}
const tr = t => window.rdI18n && rdI18n.t ? rdI18n.t(t) : t;
function pickDeck(v) { return v && v[0] === 'o' ? OWN[+v.slice(1)] : D.decks[+String(v).replace(/^m/, '')]; }
function menuNotes() {
  const el = $('m-note'); if (!el) return;
  const a = pickDeck($('m-a').value), b = pickDeck($('m-b').value);
  el.innerHTML = (a.own ? deckNote(a, b.own ? 'Your deck:' : '') : '') + (b.own ? deckNote(b, "Opponent's deck:") : '');
  $('m-go').disabled = !!(a.block || b.block);
  if (window.rdI18n && rdI18n.walk) rdI18n.walk(el);
}
function menu() {
  if (!OPP_ON && !/[?&]try\b/.test(location.search)) { $('app').innerHTML = '<p class="note">Nothing here yet.</p>'; return; }
  const mine = ownOn() && OWN ? OWN : [];
  const metaOpt = D.decks.map((d, i) => `<option value="m${i}">${esc(d.name)}</option>`).join('');
  const opt = mine.length ? `<optgroup label="${esc(tr('Your decks'))}">${mine.map((d, i) => `<option value="o${i}">${esc(d.name)}</option>`).join('')}</optgroup><optgroup label="${esc(tr('Tournament decks'))}">${metaOpt}</optgroup>` : metaOpt;
  const langs = typeof I18N_LANGS === 'object' && window.rdI18n ? `<div class="zl">Language</div><div class="btns lang" id="i18n-lang">${I18N_LANGS.map(([l, n]) => `<button type="button" class="btn${rdI18n.lang === l ? ' primary' : ''}" data-no-tr data-l="${l}" onclick="RdyPlay.lang('${l}')">${n}</button>`).join('')}</div>` : '';
  const foot = ownOn() ? (mine.length ? `You play ${PRESS_TURNS} turns against the opponent. Tournament decks play from their tournament lists, and your decks from the cards RdyDeck saved with them.`
    : 'You have no saved decks here yet. Save a deck in RdyDeck to spar with it.') : `You play ${PRESS_TURNS} turns against the opponent. Card names and text come from the decks' tournament lists.`;
  $('app').innerHTML = `<div class="menu">
    ${/[?&]full\b/.test(location.search) ? '<label>Way to play<select id="m-mode"><option value="5turn">Sparring</option><option value="full">Full game</option></select></label>' : ''}
    <label>Opponent level<select id="m-level"><option value="easy">Easy: only places cards</option><option value="contested">Contested: attacks and messes with you</option><option value="aggressive">Aggressive: plays the best line it finds</option></select></label>
    <label>Your deck<select id="m-a" data-no-tr>${opt}</select></label>
    <label>Opponent's deck<select id="m-b" data-no-tr>${opt}</select></label>
    <div id="m-note"></div>
    <button class="btn primary" id="m-go">Start a game</button>
    <p class="note">${foot}</p>${langs}</div>`;
  // Your deck: the one open in RdyDeck when there is one, then your first saved deck; the opponent a tournament deck.
  const at = mine.findIndex(d => OWN_ACTIVE != null && String(d.id) === String(OWN_ACTIVE));
  $('m-a').value = mine.length ? 'o' + Math.max(0, at) : 'm0';
  $('m-b').value = 'm1';
  $('m-level').value = 'contested';
  // The choices from your last game come back: both decks and the level.
  const last = store.get(MENU_KEY), back = r => { if (!r) return null; if (r.m != null) return D.decks[r.m] ? 'm' + r.m : null; const i = mine.findIndex(d => String(d.id) === r.o); return i >= 0 ? 'o' + i : null; };
  if (last) { const a = back(last.a), b = back(last.b); if (a) $('m-a').value = a; if (b) $('m-b').value = b; if (AI.LEVELS[last.level]) $('m-level').value = last.level; }
  $('m-a').onchange = $('m-b').onchange = menuNotes;
  menuNotes();
  $('m-go').onclick = () => { const a = pickDeck($('m-a').value), b = pickDeck($('m-b').value); if (a.block || b.block) return;
    store.set(MENU_KEY, { a: deckRef(a), b: deckRef(b), level: $('m-level').value });
    api.start({ mode: $('m-mode') ? $('m-mode').value : '5turn', level: $('m-level').value, deckA: a, deckB: b }); };
}
// Your saved decks are read once, then the menu is drawn again with them (and again once the language file is in).
// A game in progress comes back after a reload: right away for tournament decks, once your saved decks are read for yours.
function boot() {
  const R = store.get(SAVE_KEY), needOwn = !!(R && ((R.a && R.a.o != null) || (R.b && R.b.o != null)));
  if (!needOwn) resume();
  if (!S) menu();
  if (window.rdI18n && rdI18n.ready) Promise.resolve(rdI18n.ready).then(() => { if (!S) menu(); else render(); });
  if (!ownOn() || !window.RdyOwn) { if (needOwn) drop(); return; }
  RdyOwn.readSaved().then(p => {
    const list = p ? p.decks.filter(d => d && Array.isArray(d.cards) && d.cards.length) : [];
    OWN_ACTIVE = p ? p.activeDeckId : null;
    OWN = list.map(d => { try { return RdyOwn.build(d, D.cards); } catch (e) { return { name: String(d.name || ''), own: true, block: 'data', missing: ['?'], plain: [], colorless: [] }; } });
    if (window.rdI18n && rdI18n.addCardNames) rdI18n.addCardNames([...new Set(OWN.flatMap(d => (d.cards || []).map(c => c.name)))]);
    if (needOwn && !S) resume();
    if (!S) menu();
  });
}
document.addEventListener('DOMContentLoaded', boot);
})();
