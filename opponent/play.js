// The hidden play page (opponent/play.html): you against the AI opponent, on RdyDeck's own list layout.
// Two ways to play:
//   Under pressure  your deck for 5 turns; the opponent's side is one line, and after each of its turns a
//                   short "Opponent's turn" card says what it did to you.
//   Full game       both sides shown, played to the end.
// Not linked from the app. OPP_ON stays false until Mason says it goes live.
(function () {
'use strict';
const OPP_ON = false; // until then the page only opens with ?try
const E = window.RdyPuzzle, G = window.RdyGame, AI = window.RdyAI, D = window.RdyOppDecks;
const PRESS_TURNS = 5;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const $ = id => document.getElementById(id);

let S = null; // { s, mode, level, ai, deckA, deckB, busy, oppLog, over }

/* ---------------- Names for what is on the screen ---------------- */
function monById(s, id) { for (let k = 0; k < 2; k++) { const m = E.mons(s.players[k]).find(z => z.id === id); if (m) return { m, k }; } return null; }
function monName(s, id) { const f = monById(s, id); if (!f) return 'a Pokémon'; return (f.k === 0 ? 'your ' : 'their ') + E.topOf(f.m).card.name; }
function refName(s, uid) {
  for (const P of s.players) for (const z of [P.hand, P.deck, P.discard, P.prizes]) { const r = z.find(y => y.uid === uid); if (r) return r.card.name; }
  for (const P of s.players) for (const m of E.mons(P)) { const r = m.energy.concat(m.tool ? [m.tool] : [], m.stack).find(y => y.uid === uid); if (r) return r.card.name; }
  const L = s.pending && s.pending.ctx && s.pending.ctx.looked; if (L) { const r = L.find(y => y.uid === uid); if (r) return r.card.name; }
  return 'a card';
}
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
    case 'attack': { const c = E.topOf(P.active).card.attacks[a.i]; return `${c.name}${c.dmg ? ' (' + c.dmg + ')' : ''}`; }
    case 'promote': return 'Make ' + monName(s, a.mon).replace(/^(your|their) /, '') + ' Active';
    case 'end': return 'End your turn';
  }
  return a.t;
}
// Choices inside the card effects of a full game (opponent/effects.js) say what kind of thing they pick.
const HOOK_MON = /^(heal|wally|snipe|toolOff|switchOpt|energyToBench|perCounter|raid|benchSwap|topAttach|discardAttach)$/;
const HOOK_CARD = /^(oppDiscardTo|gwynn|kinds|eri|pokeBack)$/;
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
    if (HOOK_CARD.test(st.t)) return refName(s, v);
    if (HOOK_MON.test(st.t)) return mon(v);
    return String(v);
  }
  switch (A.kind) {
    case 'yesno': return v ? 'Yes' : 'No';
    case 'option': return st.opts[v].label;
    case 'benchMon': return 'Switch in ' + mon(v);
    case 'oppBench': return 'Bring up ' + mon(v);
    case 'oppMon': case 'benchHit': case 'pickUp': case 'splitAttach': return mon(v);
    case 'moveCounters': return `${v.n} from ${mon(v.from)} to ${mon(v.to)}`;
    case 'moveEnergy': return `${refName(s, v.uid)} from ${mon(v.from)} to ${mon(v.to)}`;
    case 'moveToSelf': return v == null ? 'Done' : `${refName(s, v.uid)} from ${mon(v.from)}`;
    case 'attach': return v == null ? 'Done' : `${refName(s, v.uid)} to ${mon(v.mon)}`;
    case 'cost': case 'search': case 'recover': case 'look': return v.length ? names(s, v) : 'Take nothing';
    case 'topFromHand': return refName(s, v);
  }
  return String(v);
}
const cap = t => t ? t[0].toUpperCase() + t.slice(1) : t;
function askText(s) {
  const R = s.pending, A = R.ask, who = R.ctx.name ? R.ctx.name + ': ' : '';
  const q = { yesno: 'Do it?', option: 'Choose one', benchMon: 'Choose your new Active Pokémon', oppBench: 'Choose which of their Benched Pokémon comes up',
    search: 'Choose cards from your deck', recover: 'Choose cards from your discard pile', look: 'Choose from the cards you looked at', cost: 'Choose cards to discard',
    attach: 'Attach Energy', topFromHand: 'Choose a card to put on top of your deck' }[A.kind] || 'Choose';
  return who + q;
}

/* ---------------- Drawing the board ---------------- */
function hpLine(s, m) { const hp = E.maxHp(s, m), left = Math.max(0, hp - m.dmg); return `${left} of ${hp} HP`; }
function cond(m) { return [m.cond, m.poison ? 'poisoned' : '', m.burn ? 'burned' : ''].filter(Boolean).map(x => x[0].toUpperCase() + x.slice(1)).join(', '); }
function monRow(s, m, active) {
  const c = E.topOf(m).card, hp = E.maxHp(s, m), pct = hp ? Math.max(0, Math.round((hp - m.dmg) / hp * 100)) : 0;
  const en = m.energy.map(e => e.card.name.replace(/ Energy$/, '')).join(', ');
  return `<div class="mon${active ? ' act' : ''}"><div class="mn"><b>${esc(c.name)}</b>${c.p > 1 ? `<span class="pv">${c.p} Prizes</span>` : ''}</div>
    <div class="hp"><span class="bar${pct <= 34 ? ' low' : ''}"><i style="width:${pct}%"></i></span>${hpLine(s, m)}</div>
    <div class="meta">${en ? 'Energy: ' + esc(en) : 'No Energy'}${m.tool ? ' · Tool: ' + esc(m.tool.card.name) : ''}${cond(m) ? ' · <span class="bad">' + cond(m) + '</span>' : ''}</div></div>`;
}
function sideHTML(s, k, compact) {
  const P = s.players[k], you = k === 0;
  const head = `<div class="sh"><span>${you ? 'You' : 'Opponent'}</span><span class="pr">${P.prizes.length} Prize card${P.prizes.length === 1 ? '' : 's'} left</span></div>`;
  if (compact) {
    const a = P.active;
    return `<div class="side opp compact">${head}<div class="line">Active: ${a ? `<b>${esc(E.topOf(a).card.name)}</b>, ${hpLine(s, a)}${a.energy.length ? ', ' + a.energy.length + ' Energy' : ''}` : 'none'}. Bench: ${P.bench.length}. Hand: ${P.hand.length}.</div></div>`;
  }
  const piles = `<div class="piles">${you ? '' : `Hand ${P.hand.length} · `}Deck ${P.deck.length} · Discard ${P.discard.length}</div>`;
  const act = `<div class="zl">Active</div>${P.active ? monRow(s, P.active, true) : '<div class="empty">No Active Pokémon</div>'}`;
  const bench = `<div class="zl">Bench <span>${P.bench.length} of 5</span></div>${P.bench.length ? P.bench.map(m => monRow(s, m, false)).join('') : '<div class="empty">Empty</div>'}`;
  return `<div class="side ${you ? 'me' : 'opp'}">${head}${you ? act + bench + piles : piles + bench + act}</div>`;
}
function handHTML(s) {
  const P = s.players[0], g = new Map();
  P.hand.forEach(r => { const k = r.card.key; if (!g.has(k)) g.set(k, { c: r.card, n: 0 }); g.get(k).n++; });
  return `<div class="hand"><div class="zl">Your hand <span>${P.hand.length}</span></div>${[...g.values()].map(x => `<span class="chip">${x.n > 1 ? '<b>' + x.n + '</b> ' : ''}${esc(x.c.name)}</span>`).join('') || '<span class="empty">Empty</span>'}</div>`;
}
function actionsHTML(s) {
  if (S.over) return resultHTML();
  if (S.busy) return `<div class="q">Opponent is playing…</div>`;
  if (S.oppLog) {
    return `<div class="oppturn"><div class="q">Opponent's turn</div><ol>${S.oppLog.map(t => `<li>${esc(t)}</li>`).join('') || '<li>It passed.</li>'}</ol>
      <button class="btn primary" onclick="RdyPlay.go()">Your turn</button></div>`;
  }
  const X = G.next(s);
  if (X.who !== 0) return '';
  const acts = E.legalActions(s, { why: true });
  let h = '';
  if (s.promote && s.promote.length) {
    return `<div class="q">Choose your new Active Pokémon</div><div class="btns">${X.actions.map((a, i) => `<button class="btn" onclick="RdyPlay.do(${i})">${esc(label(s, a))}</button>`).join('')}</div>`;
  }
  if (s.pending && s.pending.ask && /^(cost|search|recover|look)$/.test(s.pending.ask.kind) && X.actions.length > 6) return multiHTML(s, X);
  if (s.pending && s.pending.ask) {
    return `<div class="q">${esc(askText(s))}</div><div class="btns">${X.actions.map((a, i) => `<button class="btn" onclick="RdyPlay.do(${i})">${esc(cap(pickLabel(s, a.v)))}</button>`).join('')}</div>`;
  }
  const ok = [], no = [], seen = new Set();
  acts.forEach(a => { const l = label(s, a), key = l + (a.why || ''); if (seen.has(key)) return; seen.add(key); (a.why ? no : ok).push({ a, l, i: X.actions.findIndex(b => JSON.stringify(b) === JSON.stringify({ ...a, why: undefined })) }); });
  const groups = [['hand', 'From your hand'], ['energy', 'Attach Energy'], ['ability', 'Abilities'], ['retreat', 'Retreat'], ['attack', 'Attack'], ['end', '']];
  const kind = a => ['attack', 'end', 'energy', 'ability', 'retreat'].includes(a.t) ? a.t : 'hand';
  h += `<div class="q">Your move</div>`;
  groups.forEach(([g, title]) => {
    const list = ok.filter(x => kind(x.a) === g && x.i >= 0); if (!list.length) return;
    if (title) h += `<div class="gt">${title}</div>`;
    h += `<div class="btns">${list.map(x => `<button class="btn${g === 'attack' ? ' primary' : g === 'end' ? ' ghost' : ''}" onclick="RdyPlay.do(${x.i})">${esc(x.l)}</button>`).join('')}</div>`;
  });
  if (no.length) h += `<details class="no"><summary>Can't do right now (${no.length})</summary><ul>${no.map(x => `<li><b>${esc(x.l)}</b> ${esc(x.a.why)}</li>`).join('')}</ul></details>`;
  return h;
}
// Picking several cards (search, discard for a cost): tap cards to add them, then confirm, instead of one button per mix.
function pickKey(s, v) { return v.map(u => refName(s, u)).sort().join('|'); }
function multiHTML(s, X) {
  const sel = S.sel || (S.sel = {}), keys = X.actions.map(a => pickKey(s, a.v)), max = {};
  keys.forEach(k => { const c = {}; (k ? k.split('|') : []).forEach(n => { c[n] = (c[n] || 0) + 1; }); for (const n in c) max[n] = Math.max(max[n] || 0, c[n]); });
  const chosen = Object.keys(sel).flatMap(n => Array(sel[n]).fill(n)).sort().join('|'), hit = keys.indexOf(chosen);
  const chips = Object.keys(max).sort().map(n => `<button class="btn${sel[n] ? ' primary' : ''}" onclick="RdyPlay.tog(${esc(JSON.stringify(n))})">${esc(n)}${max[n] > 1 ? ` (${sel[n] || 0} of ${max[n]})` : ''}</button>`).join('');
  const none = keys.indexOf('');
  return `<div class="q">${esc(askText(s))}</div><div class="btns">${chips}</div><div class="btns" style="margin-top:10px">` +
    (hit >= 0 && chosen ? `<button class="btn primary" onclick="RdyPlay.do(${hit})">Take ${esc(names(s, X.actions[hit].v))}</button>` : chosen ? '<span class="note">That mix isn\'t allowed. Tap a card again to drop it.</span>' : '') +
    (none >= 0 ? ` <button class="btn ghost" onclick="RdyPlay.do(${none})">${s.pending.ask.kind === 'cost' ? 'Discard nothing' : 'Take nothing'}</button>` : '') + '</div>';
}
function resultHTML() {
  const s = S.s, w = G.winner(s), P = s.players;
  const took = [6 - P[0].prizes.length, 6 - P[1].prizes.length];
  let head;
  if (S.mode === 'pressure' && w < 0) head = `Five turns done. You took ${took[0]} Prize card${took[0] === 1 ? '' : 's'}; your opponent took ${took[1]}.`;
  else head = w === 0 ? 'You win.' : w === 1 ? 'Your opponent wins.' : 'Game over.';
  return `<div class="result"><div class="q">${esc(head)}</div><div class="line">${esc(S.levelName)} opponent, playing ${esc(S.deckB.name)}.</div>
    <button class="btn primary" onclick="RdyPlay.again()">Play again</button> <button class="btn ghost" onclick="RdyPlay.menu()">Change decks</button></div>`;
}
function render() {
  const s = S.s, compact = S.mode === 'pressure';
  const turn = `<div class="turn">${S.mode === 'pressure' ? `Your turn ${Math.min(s.turns[0], PRESS_TURNS)} of ${PRESS_TURNS}` : `Turn ${s.turns[0] + s.turns[1]}`} · ${esc(S.levelName)} · ${s.stadium ? 'Stadium: ' + esc(s.stadium.ref.card.name) : 'No Stadium'}</div>`;
  $('app').innerHTML = turn + sideHTML(s, 1, compact) + sideHTML(s, 0, false) + handHTML(s) + `<div class="acts">${actionsHTML(s)}</div>` +
    `<details class="log"><summary>Game log</summary><ol>${s.log.slice(-80).map(t => `<li>${esc(t)}</li>`).join('')}</ol></details>`;
}

/* ---------------- Playing ---------------- */
function checkOver() {
  const s = S.s;
  if (G.winner(s) >= 0) { S.over = true; return true; }
  if (S.mode === 'pressure' && s.cur === 0 && s.turns[0] > PRESS_TURNS) { S.over = true; return true; }
  return false;
}
function oppStep() {
  // The opponent acts one move at a time, with a short pause, so you can follow what it does.
  const s = S.s, X = G.next(s);
  if (checkOver()) { S.busy = false; render(); return; }
  if (X.who !== 1) { S.busy = false; if (S.oppTurn) { S.oppLog = S.s.log.slice(S.oppTurn.from); S.oppTurn = null; } render(); return; }
  if (s.cur === 1 && !S.oppTurn) S.oppTurn = { from: s.log.length - 1 };
  S.busy = true; render();
  setTimeout(() => {
    const a = S.ai.choose(S.s, 1);
    S.s = G.step(S.s, a);
    oppStep();
  }, s.cur === 1 ? 350 : 50);
}
const api = {
  do(i) {
    if (!S || S.busy || S.over) return;
    const X = G.next(S.s); const a = X.actions[i]; if (!a || X.who !== 0) return;
    S.s = G.step(S.s, a); S.sel = null;
    if (checkOver()) { render(); return; }
    oppStep();
  },
  tog(n) {
    const sel = S.sel || (S.sel = {}), X = G.next(S.s), keys = X.actions.map(a => pickKey(S.s, a.v));
    const most = Math.max(...keys.map(k => k.split('|').filter(x => x === n).length));
    sel[n] = (sel[n] || 0) + 1; if (sel[n] > most) delete sel[n];
    render();
  },
  go() { S.oppLog = null; render(); if (checkOver()) render(); },
  start(opts) {
    const deck = d => { const out = []; d.list.forEach(([k, n]) => { for (let i = 0; i < n; i++) out.push(D.cards[k]); }); return out; };
    const seed = Math.floor(Math.random() * 2 ** 31);
    let s = G.newGame([deck(opts.deckA), deck(opts.deckB)], { seed });
    S = { s, mode: opts.mode, level: opts.level, levelName: AI.LEVELS[opts.level].name, ai: new AI.Player(opts.level, seed + 1), deckA: opts.deckA, deckB: opts.deckB, busy: false, oppLog: null, over: false, opts };
    // Your setup: the Basic the app picks for you (the same pick the opponent makes); change it in a later version.
    const me = AI.setupPick(s, 0, 'aggressive', G.rngFrom(seed + 2)), them = AI.setupPick(s, 1, opts.level, G.rngFrom(seed + 3));
    s = G.setUp(s, 0, me.active, me.bench); s = G.setUp(s, 1, them.active, them.bench);
    S.s = s;
    oppStep();
  },
  again() { api.start(S.opts); },
  menu() { S = null; menu(); },
};
window.RdyPlay = api;

function menu() {
  if (!OPP_ON && !/[?&]try\b/.test(location.search)) { $('app').innerHTML = '<p class="note">Nothing here yet.</p>'; return; }
  const opt = D.decks.map((d, i) => `<option value="${i}">${esc(d.name)}${d.place ? ' (' + ordinal(d.place) + ')' : ''}</option>`).join('');
  $('app').innerHTML = `<div class="menu">
    <label>Way to play<select id="m-mode"><option value="pressure">Under pressure (5 turns)</option><option value="full">Full game</option></select></label>
    <label>Opponent level<select id="m-level"><option value="easy">Easy: only places cards</option><option value="contested" selected>Contested: attacks and messes with you</option><option value="aggressive">Aggressive: plays the best line it finds</option></select></label>
    <label>Your deck<select id="m-a">${opt}</select></label>
    <label>Opponent's deck<select id="m-b">${opt}</select></label>
    <button class="btn primary" id="m-go">Start</button>
    <p class="note">Card names and text come from the decks' tournament lists. Some card effects aren't read yet; those say "Not played" in the log and do nothing.</p></div>`;
  $('m-b').value = '1';
  $('m-go').onclick = () => api.start({ mode: $('m-mode').value, level: $('m-level').value, deckA: D.decks[+$('m-a').value], deckB: D.decks[+$('m-b').value] });
}
function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
document.addEventListener('DOMContentLoaded', menu);
})();
