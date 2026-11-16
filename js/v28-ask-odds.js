
// ═══════════ v28: Ask the odds (Odds tab) ═══════════
// A question you build yourself: "at least 1 Arven, and 1 Ultra Ball or Nest
// Ball, by my turn 2". Exact counting, not shuffles, for this exact list:
// an opening 7 with no Basic is redrawn (so only hands you keep count), the
// six prizes come from the 53 cards left, and each turn draws one card
// (both players draw on their first turn). Prizes do not change what you
// draw, only what is left to find later, so the prize line is its own number.
const OL_MAX_ROWS = 3, OL_MAX_TURN = 4;
// 2.6.6: a line can ask for any of its cards (or) or for every one of them (and). An "and" line counts
// as one line per card, so the question holds at most OL_MAX_LINES of those in all.
const OL_MAX_LINES = 4;
const olLines = rows => rows.flatMap(r => r.all && r.keys.length > 1 ? r.keys.map(k => ({ keys: [k], k: r.k })) : [{ keys: r.keys, k: r.k }]);
let _olState = null;   // { deckId, rows:[{keys:[...], k, all}], turn }
let _olPick = null;    // row being edited in the picker sheet
const _olMemo = new Map();

function olBinom(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = r * (n - k + i) / i;
  return r;
}

// Card groups for the question: one per card name, with what the odds tab
// already knows about each (Basic, draw, search) from the card data.
function olGroups(deck) {
  return simGroups((deck.cards || []).filter(c => c.count > 0)).map(g => {
    const c = (deck.cards || []).find(x => String(x.name || '').toLowerCase() === g.key) || {};
    const sup = String(c.supertype || '').toLowerCase();
    return Object.assign(g, {
      kind: sup.startsWith('pok') ? 'pokemon' : sup.startsWith('trainer') ? 'trainer' : sup.startsWith('energy') ? 'energy'
        : (c.category || cardCategory(c) || 'other'),
      ace: !!c.ace,
      basicEnergy: /^basic\b.*\benergy$/i.test(String(c.name || '')) || (sup.startsWith('energy') && (c.basic === true || (c.subtypes || []).some(x => /basic/i.test(x)))),
    });
  });
}

// Split the deck into classes of cards that behave the same for the question:
// Basic or not, and which row (if any) they answer.
function olClasses(groups, rows) {
  const byKey = {};
  groups.forEach(g => byKey[g.key] = g);
  const rowOf = {};
  rows.forEach((r, i) => r.keys.forEach(k => { if (byKey[k]) rowOf[k] = i; }));
  const cls = {};
  groups.forEach(g => {
    const r = rowOf[g.key] != null ? rowOf[g.key] : -1;
    const id = (g.basic ? 'b' : 'n') + r;
    (cls[id] = cls[id] || { q: 0, basic: g.basic, row: r }).q += g.qty;
  });
  return Object.values(cls).filter(c => c.q > 0);
}

// Exact chance that every row is met among the first `seen` cards, given the
// kept 7 has a Basic. seen = 7 is the opening hand.
// Counts pairs (S, H): S the cards seen, H the 7 card hand inside S. Every
// such pair is equally likely, so a ratio of weighted counts is the answer.
function olSeenProb(classes, ks, seen, anyBasic) {
  const R = ks.length;
  const caps = ks.map(k => k + 1);
  const dims = [seen + 1, 8, 2].concat(caps);
  const size = dims.reduce((a, b) => a * b, 1);
  const idx = (s, h, b, c) => { let i = s; i = i * 8 + h; i = i * 2 + b; for (let r = 0; r < R; r++) i = i * caps[r] + c[r]; return i; };
  const dec = i => { const c = new Array(R); for (let r = R - 1; r >= 0; r--) { c[r] = i % caps[r]; i = Math.floor(i / caps[r]); } const b = i % 2; i = Math.floor(i / 2); const h = i % 8; const s = Math.floor(i / 8); return { s, h, b, c }; };
  let cur = new Float64Array(size);
  cur[idx(0, 0, 0, new Array(R).fill(0))] = 1;
  classes.forEach(cl => {
    const nxt = new Float64Array(size);
    for (let i = 0; i < size; i++) {
      const w = cur[i]; if (!w) continue;
      const st = dec(i);
      for (let si = 0; si <= cl.q && st.s + si <= seen; si++) {
        const ws = olBinom(cl.q, si);
        for (let hi = 0; hi <= si && st.h + hi <= 7; hi++) {
          // Cards in the hand that are not seen... cannot exist: H is inside S,
          // so the rest of S (si - hi) are draws. Draws must fit seen - 7.
          if (si - hi > seen - 7 - (st.s - st.h)) continue;
          const c = st.c.slice();
          if (cl.row >= 0) c[cl.row] = Math.min(caps[cl.row] - 1, c[cl.row] + si);
          const b = st.b || (cl.basic && hi > 0) ? 1 : 0;
          nxt[idx(st.s + si, st.h + hi, b, c)] += w * ws * olBinom(si, hi);
        }
      }
    }
    cur = nxt;
  });
  let ok = 0, all = 0;
  for (let i = 0; i < size; i++) {
    const w = cur[i]; if (!w) continue;
    const st = dec(i);
    if (st.s !== seen || st.h !== 7) continue;
    if (anyBasic && !st.b) continue;
    all += w;
    if (st.c.every((x, r) => x >= ks[r])) ok += w;
  }
  return all ? ok / all : null;
}

// Chance the six prizes leave too few copies outside them for some row, so
// that row cannot be met from hand and deck until you take a prize.
function olPrizeLock(classes, ks, totals, anyBasic) {
  const R = ks.length;
  const lim = ks.map((k, r) => totals[r] - k + 1); // this many prized breaks the row
  const caps = lim.map(x => Math.max(1, x) + 1);
  const dims = [8, 7, 2].concat(caps);
  const size = dims.reduce((a, b) => a * b, 1);
  const idx = (h, p, b, c) => { let i = h; i = i * 7 + p; i = i * 2 + b; for (let r = 0; r < R; r++) i = i * caps[r] + c[r]; return i; };
  const dec = i => { const c = new Array(R); for (let r = R - 1; r >= 0; r--) { c[r] = i % caps[r]; i = Math.floor(i / caps[r]); } const b = i % 2; i = Math.floor(i / 2); const p = i % 7; const h = Math.floor(i / 7); return { h, p, b, c }; };
  let cur = new Float64Array(size);
  cur[idx(0, 0, 0, new Array(R).fill(0))] = 1;
  classes.forEach(cl => {
    const nxt = new Float64Array(size);
    for (let i = 0; i < size; i++) {
      const w = cur[i]; if (!w) continue;
      const st = dec(i);
      for (let hi = 0; hi <= cl.q && st.h + hi <= 7; hi++) {
        const wh = olBinom(cl.q, hi);
        for (let pi = 0; pi <= cl.q - hi && st.p + pi <= 6; pi++) {
          const c = st.c.slice();
          if (cl.row >= 0) c[cl.row] = Math.min(caps[cl.row] - 1, c[cl.row] + pi);
          const b = st.b || (cl.basic && hi > 0) ? 1 : 0;
          nxt[idx(st.h + hi, st.p + pi, b, c)] += w * wh * olBinom(cl.q - hi, pi);
        }
      }
    }
    cur = nxt;
  });
  let bad = 0, all = 0;
  for (let i = 0; i < size; i++) {
    const w = cur[i]; if (!w) continue;
    const st = dec(i);
    if (st.h !== 7 || st.p !== 6) continue;
    if (anyBasic && !st.b) continue;
    all += w;
    if (st.c.some((x, r) => lim[r] >= 1 && x >= lim[r])) bad += w;
  }
  return all ? bad / all : null;
}

// Basics in the kept opening hand: how many (1, 2, 3, 4 or more) and the
// chance each Basic is in it. Exact, hypergeometric over kept hands.
function olOpening(groups) {
  const N = groups.reduce((a, g) => a + g.qty, 0);
  const B = groups.filter(g => g.basic).reduce((a, g) => a + g.qty, 0);
  if (!B || N < 7) return null;
  const tot = olBinom(N, 7);
  const kept = tot - olBinom(N - B, 7);
  const dist = [0, 0, 0, 0, 0];
  for (let b = 1; b <= Math.min(7, B); b++) dist[Math.min(4, b)] += olBinom(B, b) * olBinom(N - B, 7 - b) / kept;
  const per = groups.filter(g => g.basic).map(g => {
    // In hand and the hand is kept: 1 minus (no copy) among kept hands.
    // Hands with no copy of g and at least one other Basic:
    const noG = olBinom(N - g.qty, 7) - olBinom(N - B, 7);
    return { name: g.name, qty: g.qty, p: 1 - noG / kept };
  }).sort((a, b) => b.p - a.p || a.name.localeCompare(b.name));
  return { mull: 1 - kept / tot, dist, per, B };
}

function olDelta(a, b) {
  if (a == null || b == null) return '';
  const d = Math.round((a - b) * 1000) / 10;
  return (d > 0 ? '+' : '') + d.toFixed(1) + ' pts';
}

function olDeck() { return state.decks.find(d => d.id === state.activeDeckId); }
function olSig(deck) { return JSON.stringify((deck.cards || []).map(c => [c.name, c.count, c.stage || '', c.supertype || ''])); }

function olLoad(deck, groups) {
  if (_olState && _olState.deckId === deck.id) return _olState;
  const saved = deck.oddsLab && Array.isArray(deck.oddsLab.rows) ? deck.oddsLab : null;
  const keys = new Set(groups.map(g => g.key));
  let rows = saved ? saved.rows.map(r => ({ keys: (r.keys || []).filter(k => keys.has(k)).slice(0, r.all ? OL_MAX_LINES : 40), k: Math.max(1, Math.min(4, r.k | 0)), all: !!r.all })).filter(r => r.keys.length) : [];
  if (!rows.length) {
    // Start from something useful: the Supporters and Items that find or
    // draw cards, if the card data says which those are.
    const out = groups.filter(g => (g.sBasic || g.sAny || g.draw) && g.kind !== 'pokemon').map(g => g.key);
    if (out.length) rows = [{ keys: out, k: 1 }];
  }
  rows = rows.slice(0, OL_MAX_ROWS);
  while (rows.length > 1 && olLines(rows).length > OL_MAX_LINES) rows.pop();
  _olState = { deckId: deck.id, rows, turn: saved && saved.turn >= 0 && saved.turn <= OL_MAX_TURN ? saved.turn | 0 : 1 };
  return _olState;
}
function olSave() {
  const deck = olDeck(); if (!deck || !_olState) return;
  deck.oddsLab = { rows: _olState.rows.map(r => ({ keys: r.keys.slice(), k: r.k, all: !!r.all })), turn: _olState.turn };
  saveState();
}

function olCompute(deck, groups, asked, turn) {
  const rows = olLines(asked);
  const key = olSig(deck) + '|' + JSON.stringify(rows) + '|' + turn;
  if (_olMemo.has(key)) return _olMemo.get(key);
  const anyBasic = groups.some(g => g.basic);
  const N = groups.reduce((a, g) => a + g.qty, 0);
  const byKey = {}; groups.forEach(g => byKey[g.key] = g);
  const ks = rows.map(r => r.k);
  const totals = rows.map(r => r.keys.reduce((a, k) => a + (byKey[k] ? byKey[k].qty : 0), 0));
  const classes = olClasses(groups, rows);
  const turns = [];
  for (let t = 0; t <= OL_MAX_TURN; t++) turns.push(7 + t + 6 <= N ? olSeenProb(classes, ks, 7 + t, anyBasic) : null);
  const lock = olPrizeLock(classes, ks, totals, anyBasic);
  // Copies tuner: the first row with one card in it (not an ACE SPEC),
  // from 2 fewer to 2 more copies. Each copy added replaces a card that is
  // not in the question (a non Basic first), so the list stays the same size.
  let tune = null;
  const ti = rows.findIndex(r => r.keys.length === 1 && byKey[r.keys[0]] && !byKey[r.keys[0]].ace);
  if (ti >= 0) {
    const g = byKey[rows[ti].keys[0]];
    const max = g.basicEnergy ? g.qty + 2 : 4;
    const lo = Math.max(1, g.qty - 2), hi = Math.min(max, g.qty + 2);
    const opts = [];
    for (let q = lo; q <= hi; q++) {
      const d = q - g.qty;
      const cls = classes.map(c => Object.assign({}, c));
      const mine = cls.find(c => c.row === ti && c.basic === g.basic);
      mine.q += d;
      let left = d;
      ['n', 'b'].forEach(t => cls.forEach(c => {
        if (!left || c.row !== -1 || (t === 'b') !== c.basic) return;
        const take = left > 0 ? Math.min(left, c.q) : left;
        c.q -= take; left -= take;
      }));
      if (left) continue;
      const anyB = cls.some(c => c.basic && c.q > 0);
      opts.push({ q, d, p: olSeenProb(cls.filter(c => c.q > 0), ks, 7 + turn, anyB) });
    }
    if (opts.length > 1) tune = { row: ti, name: g.name, qty: g.qty, opts };
  }
  const res = { turns, lock, tune, totals, N, anyBasic };
  if (_olMemo.size > 30) _olMemo.delete(_olMemo.keys().next().value);
  _olMemo.set(key, res);
  return res;
}

function olRowText(groups, r) {
  const byKey = {}; groups.forEach(g => byKey[g.key] = g);
  const names = r.keys.map(k => byKey[k] ? byKey[k].name : null).filter(Boolean);
  return names;
}

function olPct(x) {
  if (x == null) return '?';
  if (x > 0 && x < 0.001) return '<0.1%';
  if (x < 1 && x > 0.999) return '>99.9%';
  return (x * 100).toFixed(1) + '%';
}

function olSectionHTML(deck) {
  const groups = olGroups(deck);
  const N = groups.reduce((a, g) => a + g.qty, 0);
  if (N < 13) return '';
  const st = olLoad(deck, groups);
  const anyRead = groups.some(g => g.read);
  const anyBasic = groups.some(g => g.basic);
  const turnLbl = t => t === 0 ? 'Opening hand' : 'Turn ' + t;
  let h = `<div class="g-sec ol-sec" id="ol-sec"><div class="g-sec-t">Ask the odds</div>
    <div class="g-sec-i">Pick the cards you need and the turn. Exact counting for this list: a hand with no Basic is redrawn, so only hands you keep count, and both players draw on their first turn.</div>
    <div class="ol-rows">`;
  st.rows.forEach((r, i) => {
    const names = olRowText(groups, r);
    const tot = r.keys.reduce((a, k) => { const g = groups.find(x => x.key === k); return a + (g ? g.qty : 0); }, 0);
    const each = r.all && names.length > 1, word = each ? 'and' : 'or';
    const minQ = Math.min(...r.keys.map(k => { const g = groups.find(x => x.key === k); return g ? g.qty : 0; }));
    h += `<div class="ol-row">
      <div class="ol-row-top"><span class="ol-and">${i ? 'and at least' : 'At least'}</span>
        <div class="seg ol-k" role="group" aria-label="How many">${[1, 2, 3, 4].map(k => `<div class="mode-opt${r.k === k ? ' active' : ''}${k > (each ? minQ : tot) ? ' ol-dis' : ''}" data-k="${k}" onclick="olSetK(${i},${k})">${k}</div>`).join('')}</div>
        <span class="ol-of">${each ? 'of each' : 'of'}</span></div>
      <div class="ol-line"><button class="ol-names" onclick="olOpenPick(${i})" aria-label="Change cards">${names.length ? names.map(n => `<span class="ol-chip">${esc(n)}</span>`).join(names.length > 1 ? `<span class="ol-or">${word}</span>` : '') : '<span class="ol-ph">Pick cards</span>'}<span class="ol-tot">${tot} in list</span></button>
        <button class="icon-btn sm ol-del" onclick="olDelRow(${i})" aria-label="Remove ${esc(names.length ? names.join(' ' + word + ' ') : 'this row')}" title="Remove">${ic23('x')}</button></div>
    </div>`;
  });
  h += `</div>`;
  if (st.rows.length < OL_MAX_ROWS && olLines(st.rows).length < OL_MAX_LINES) h += `<button class="btn btn-sm ol-add" onclick="olOpenPick(-1)">${ic23('plus')}${st.rows.length ? 'And another card' : 'Pick a card'}</button>`;
  h += `<div class="ol-turn-lbl">By</div><div class="seg ol-turn" role="group" aria-label="By when">${[0, 1, 2, 3, 4].map(t => `<div class="mode-opt${st.turn === t ? ' active' : ''}" data-t="${t}" onclick="olSetTurn(${t})">${t === 0 ? 'Open' : 'T' + t}</div>`).join('')}</div>`;

  if (!st.rows.length) {
    h += `<div class="ol-empty">Pick a card to see how often you have it.</div></div>`;
    return h;
  }
  const R = olCompute(deck, groups, st.rows, st.turn);
  const p = R.turns[st.turn];
  const tone = p == null ? 'var(--text-3)' : p >= 0.8 ? 'var(--green)' : p >= 0.5 ? 'var(--electric)' : 'var(--fire)';
  const seen = 7 + st.turn;
  const ask = st.rows.map((r, i) => {
    const n = olRowText(groups, r);
    const each = r.all && n.length > 1;
    const list = n.length <= 1 ? esc(n[0] || '') : n.slice(0, -1).map(esc).join(', ') + (each ? ' and ' : ' or ') + esc(n[n.length - 1]);
    return `${r.k} ${each ? 'each of ' : n.length > 1 ? 'of ' : ''}${list}`;
  }).join(', and ');
  h += `<div class="ol-res" style="--tone:${tone}"><div class="ol-big">${olPct(p)}</div>
    <div class="ol-what">Chance of at least ${ask} ${st.turn === 0 ? 'in your opening hand' : `by your turn ${st.turn} (your first ${seen} cards)`}.${R.anyBasic ? '' : ' No Basic was read, so mulligans are not taken out.'}</div></div>`;
  h += `<div class="o-table-wrap"><table class="o-table ol-tt"><thead><tr>${R.turns.map((x, t) => `<th${t === st.turn ? ' class="on"' : ''}>${t === 0 ? 'Open' : 'T' + t}</th>`).join('')}</tr></thead>
    <tbody><tr>${R.turns.map((x, t) => `<td${t === st.turn ? ' class="on"' : ''}>${olPct(x)}</td>`).join('')}</tr></tbody></table></div>`;
  if (R.lock != null) h += `<div class="g-item ${R.lock <= 0.02 ? 'ok' : R.lock <= 0.08 ? 'warn' : 'crit'}"><div class="gt">Stuck in prizes: ${olPct(R.lock)}</div>
    <p>Games where the prizes hold so many copies that hand and deck cannot make ${olLines(st.rows).length > 1 ? 'every line of this question' : 'this'} until you take the right prize. The same on every turn.</p></div>`;
  if (R.tune) {
    h += `<div class="ol-tune"><div class="ol-tune-t">How many ${esc(R.tune.name)}?</div>
      <div class="ol-tune-i">The same question by ${turnLbl(st.turn).toLowerCase()}, with more or fewer copies. Each copy added replaces a card that is not in the question, so the list stays at ${R.N}.</div>
      <div class="ol-tune-row">${R.tune.opts.map(o => `<div class="ol-tune-c${o.d === 0 ? ' now' : ''}"><div class="ol-tq">${o.q}</div><div class="ol-tp">${olPct(o.p)}</div><div class="ol-td">${o.d === 0 ? 'Now' : olDelta(o.p, p)}</div></div>`).join('')}</div></div>`;
  }
  if (!anyRead) h += `<div class="ol-note">No card data yet, so mulligans are not taken out. Open Edit deck and save it to read the cards.</div>`;
  else if (!anyBasic) h += `<div class="ol-note">No Basic Pokemon was read in this list, so every opening hand counts.</div>`;
  h += `<div class="ol-note">Raw draws only: search and draw cards are not played out, so a real game lands at or above these numbers.</div>`;
  h += `</div>`;

  const O = anyBasic ? olOpening(groups) : null;
  if (O) {
    h += `<div class="g-sec"><div class="g-sec-t">Opening Basics</div>
      <div class="g-sec-i">How many Basic Pokemon your kept opening hand holds (${O.B} in the list), and how often each one is there for the Active Spot.</div>
      <div class="ol-dist">${[1, 2, 3, 4].map(b => `<div class="ol-dc"><div class="ol-dl">${b === 4 ? '4+' : b}</div><div class="ol-db"><i style="height:${Math.round(O.dist[b] * 100)}%"></i></div><div class="ol-dp">${olPct(O.dist[b])}</div></div>`).join('')}</div>
      <div class="o-table-wrap"><table class="o-table"><thead><tr><th>Basic</th><th>Copies</th><th>In opening hand</th></tr></thead><tbody>
      ${O.per.map(x => `<tr><td>${esc(x.name)}</td><td class="o-qty">${x.qty}</td><td><span class="o-any"><span class="o-bar"><i style="width:${Math.min(100, x.p * 100)}%"></i></span>${olPct(x.p)}</span></td></tr>`).join('')}
      </tbody></table></div></div>`;
  }
  return h;
}

function olRender() {
  const el = document.getElementById('odds-body');
  const deck = olDeck();
  if (!el || !deck) return;
  const old = document.getElementById('ol-wrap');
  const html = olSectionHTML(deck);
  if (old) { old.innerHTML = html; return; }
  if (!html) return;
  const wrap = document.createElement('div');
  wrap.id = 'ol-wrap';
  wrap.innerHTML = html;
  const meta = el.querySelector('.o-meta');
  if (meta) meta.after(wrap); else el.appendChild(wrap);
}

function olSetK(i, k) { if (!_olState || !_olState.rows[i]) return; _olState.rows[i].k = k; olSave(); olRender(); }
function olSetTurn(t) { if (!_olState) return; _olState.turn = t; olSave(); olRender(); }
function olDelRow(i) { if (!_olState) return; _olState.rows.splice(i, 1); olSave(); olRender(); }

function olOpenPick(i) {
  const deck = olDeck(); if (!deck || !_olState) return;
  const groups = olGroups(deck);
  _olPick = { row: i, keys: new Set(i >= 0 && _olState.rows[i] ? _olState.rows[i].keys : []), all: !!(i >= 0 && _olState.rows[i] && _olState.rows[i].all) };
  // Lines the other rows already use, so an "and" line here cannot push the question past OL_MAX_LINES.
  _olPick.room = OL_MAX_LINES - olLines(_olState.rows.filter((r, j) => j !== i)).length;
  const used = new Set();
  _olState.rows.forEach((r, j) => { if (j !== i) r.keys.forEach(k => used.add(k)); });
  const sec = [['pokemon', 'Pokemon'], ['trainer', 'Trainers'], ['energy', 'Energy']];
  const kindOf = g => sec.some(s => s[0] === g.kind) ? g.kind : 'trainer';
  const quick = [
    ['basic', 'Basic Pokemon', g => g.basic],
    ['draw', 'Draw cards', g => g.draw],
    ['search', 'Search cards', g => g.sBasic || g.sAny || g.sItem],
  ].filter(q => groups.some(g => q[2](g) && !used.has(g.key)));
  _olPick.quick = quick;
  let h = `<div class="modal-title">${i >= 0 ? 'Change cards' : 'Pick cards'}</div>
    <p class="ol-pick-i">Tick one card, or several. With several, pick how they count.</p>
    <div class="seg ol-mode" role="group" aria-label="How several cards count"><div class="mode-opt${_olPick.all ? '' : ' active'}" data-m="or" onclick="olSetMode(false)">Any of them (or)</div><div class="mode-opt${_olPick.all ? ' active' : ''}" data-m="and" onclick="olSetMode(true)">Every one (and)</div></div>
    <p class="ol-pick-i ol-mode-i" id="ol-mode-i">${olModeHint()}</p>`;
  if (quick.length) h += `<div class="ol-quick">${quick.map((q, n) => `<button class="btn btn-sm" onclick="olQuick(${n})">${q[1]}</button>`).join('')}</div>`;
  h += `<input type="text" inputmode="search" autocomplete="off" id="ol-find" class="ol-find" placeholder="Find a card" aria-label="Find a card" oninput="olFilter(this.value)">
    <div class="ol-pick-list" id="ol-pick-list">`;
  sec.forEach(([k, label]) => {
    const gs = groups.filter(g => kindOf(g) === k);
    if (!gs.length) return;
    h += `<div class="ol-pick-h">${label}</div>`;
    gs.forEach(g => {
      const dis = used.has(g.key);
      const id = 'olp-' + groups.indexOf(g);
      h += `<label class="ol-pick${dis ? ' dis' : ''}" data-n="${esc(g.key)}" for="${id}"><input type="checkbox" id="${id}" data-key="${esc(g.key)}"${_olPick.keys.has(g.key) ? ' checked' : ''}${dis ? ' disabled' : ''} onchange="olToggle(this)">
        <span class="ol-pn">${esc(g.name)}</span><span class="ol-pq">${g.qty}</span>${dis ? '<span class="ol-pu">in use</span>' : ''}</label>`;
    });
  });
  h += `</div><div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet()">Cancel</button>
    <button class="btn btn-primary" id="ol-pick-done" onclick="olPickDone()">Done</button></div>`;
  openSheet(h);
}
function olModeHint() {
  return _olPick && _olPick.all
    ? `Every card you tick has to be there (Rare Candy and Ultra Ball). Up to ${Math.max(1, _olPick.room)} cards this way.`
    : 'Any one of the cards you tick counts (Ultra Ball or Nest Ball). For an Energy and a draw card on top, add another card after this.';
}
function olSetMode(all) {
  if (!_olPick) return;
  if (all && _olPick.keys.size > _olPick.room) { showToast(`Every one (and) takes up to ${_olPick.room} cards here. Untick some first.`); return; }
  _olPick.all = all;
  document.querySelectorAll('.ol-mode .mode-opt').forEach(el => el.classList.toggle('active', (el.getAttribute('data-m') === 'and') === all));
  const hint = document.getElementById('ol-mode-i'); if (hint) hint.textContent = olModeHint();
}
function olToggle(cb) {
  if (!_olPick) return;
  const k = cb.getAttribute('data-key');
  if (cb.checked && _olPick.all && _olPick.keys.size >= _olPick.room) { cb.checked = false; showToast(`Every one (and) takes up to ${_olPick.room} cards here.`); return; }
  if (cb.checked) _olPick.keys.add(k); else _olPick.keys.delete(k);
}
function olQuick(n) {
  const deck = olDeck(); if (!deck || !_olPick) return;
  const q = _olPick.quick[n]; if (!q) return;
  // A quick pick is a group where any one counts, so it sets the line to "any of them".
  if (_olPick.all) olSetMode(false);
  const groups = olGroups(deck);
  _olPick.keys = new Set();
  document.querySelectorAll('#ol-pick-list input[type=checkbox]').forEach(cb => {
    const g = groups.find(x => x.key === cb.getAttribute('data-key'));
    cb.checked = !cb.disabled && !!g && !!q[2](g);
    if (cb.checked) _olPick.keys.add(g.key);
  });
}
function olFilter(v) {
  const s = String(v || '').toLowerCase().trim();
  document.querySelectorAll('#ol-pick-list .ol-pick').forEach(el => {
    el.style.display = !s || (el.getAttribute('data-n') || '').includes(s) ? '' : 'none';
  });
}
function olPickDone() {
  if (!_olPick || !_olState) { closeSheet(); return; }
  const keys = [..._olPick.keys];
  const i = _olPick.row;
  if (!keys.length) { if (i >= 0) _olState.rows.splice(i, 1); }
  else if (i >= 0 && _olState.rows[i]) { _olState.rows[i].keys = keys; _olState.rows[i].all = _olPick.all && keys.length > 1; }
  else if (_olState.rows.length < OL_MAX_ROWS) _olState.rows.push({ keys, k: 1, all: _olPick.all && keys.length > 1 });
  _olPick = null;
  closeSheet();
  olSave();
  olRender();
}

(function () {
  const _ro = renderOdds;
  renderOdds = function () {
    const r = _ro.apply(this, arguments);
    const deck = olDeck();
    if (_olState && deck && _olState.deckId !== deck.id) _olState = null;
    try { olRender(); } catch (e) { console.warn('[odds lab]', e); }
    return r;
  };
})();

// ═══════════ v28: tournament log, first or second and best of three ═══════════
// Each match can now say who went first, and a best of three match keeps each
// game's result and who went first in it. The log then splits your record by
// going first and going second, overall and per opponent, so the coin flip
// choice has your own numbers behind it.
let _tl28 = null; // form state: { bo, turn, games:[{r,t,pt,pg}] }

const TL_TURNS = ['first', 'second'];
function tlGames(x) {
  // Every game in a match with a known result, as { r, t }.
  if (!x) return [];
  if (x.bo === 3 && Array.isArray(x.games)) {
    return x.games.filter(g => g && ['W', 'L', 'T'].includes(g.r))
      .map(g => ({ r: g.r, t: TL_TURNS.includes(g.t) ? g.t : '' }));
  }
  return ['W', 'L', 'T'].includes(x.result) ? [{ r: x.result, t: TL_TURNS.includes(x.turn) ? x.turn : '' }] : [];
}
function tlBo3Result(games) {
  let w = 0, l = 0;
  games.forEach(g => { if (g.r === 'W') w++; else if (g.r === 'L') l++; });
  return w > l ? 'W' : l > w ? 'L' : 'T';
}
function tlGameRec(list, turn) {
  const r = { w: 0, l: 0, t: 0, n: 0 };
  list.forEach(x => tlGames(x).forEach(g => {
    if (turn && g.t !== turn) return;
    r.n++; if (g.r === 'W') r.w++; else if (g.r === 'L') r.l++; else r.t++;
  }));
  return r;
}
const tlRate = r => r.n ? Math.round(r.w / r.n * 100) + '%' : '?';
const tlRec = r => `${r.w}-${r.l}${r.t ? '-' + r.t : ''}`;

function tlTurnSeg(id, cur, small) {
  return `<div class="seg tl-seg${small ? ' tl-sm' : ''}" id="${id}">${[['first', small ? '1st' : 'First'], ['second', small ? '2nd' : 'Second'], ['', small ? '?' : 'Not sure']]
    .map(([v, l]) => `<div class="mode-opt${v === cur ? ' active' : ''}" data-val="${v}" onclick="tl28Set('${id}','${v}')"${small && !v ? ' aria-label="Not sure who went first"' : ''}>${l}</div>`).join('')}</div>`;
}
function tlResSeg(id, cur) {
  return `<div class="seg tl-seg tl-sm" id="${id}">${[['W', 'W'], ['L', 'L'], ['T', 'T'], ['', '-']]
    .map(([v, l]) => `<div class="mode-opt${v === cur ? ' active' : ''}" data-val="${v}" onclick="tl28Set('${id}','${v}')"${v ? '' : ' aria-label="Not played"'}>${l}</div>`).join('')}</div>`;
}
function tl28Form() {
  const f = _tl28;
  let h = `<div class="mb"><div class="field-label">Match</div><div class="seg tl-seg" id="tl-bo">${[[1, 'One game'], [3, 'Best of three']]
    .map(([v, l]) => `<div class="mode-opt${f.bo === v ? ' active' : ''}" data-val="${v}" onclick="tl28Set('tl-bo','${v}')">${l}</div>`).join('')}</div></div>`;
  if (f.bo === 3) {
    h += `<div class="mb"><div class="field-label">Games</div><div class="tl-games">`;
    f.games.forEach((g, i) => {
      const pz = (k, l) => `<label>${l}<select id="tl-g${i}${k}" class="x-select" onchange="tl28Set('tl-g${i}${k}',this.value)" aria-label="Game ${i + 1}, ${l.toLowerCase()}"><option value=""${g[k] === '' ? ' selected' : ''}>-</option>${[0, 1, 2, 3, 4, 5, 6].map(n => `<option value="${n}"${String(g[k]) === String(n) ? ' selected' : ''}>${n}</option>`).join('')}</select></label>`;
      h += `<div class="tl-game"><span class="tl-gn">Game ${i + 1}</span>${tlResSeg('tl-g' + i + 'r', g.r)}${tlTurnSeg('tl-g' + i + 't', g.t, true)}${g.r ? `<div class="tl-gp">${pz('pt', 'You took')}${pz('pg', 'They took')}</div>` : ''}</div>`;
    });
    const played = f.games.filter(g => g.r);
    h += `</div><div class="tl-derived" id="tl-derived">${played.length ? 'Match result: <b>' + ({ W: 'Win', L: 'Loss', T: 'Tie' })[tlBo3Result(played)] + '</b> (' + tlRec(tlGameRec([{ bo: 3, games: played }])) + ' in games)' : 'Tap W, L or T for each game played.'}</div></div>`;
  } else {
    h += `<div class="mb"><div class="field-label">You went</div>${tlTurnSeg('tl-turn', f.turn)}</div>`;
  }
  return h;
}
function tl28Draw() {
  const box = document.getElementById('tl28-box');
  if (box) box.innerHTML = tl28Form();
  // In best of three the match result comes from the games.
  const res = document.getElementById('tl-result');
  const wrap = res && res.closest('.mb');
  if (wrap) wrap.style.display = _tl28 && _tl28.bo === 3 ? 'none' : '';
  // In best of three each game has its own prizes, so the one game rows hide.
  ['taken', 'given'].forEach(k => {
    const seg = document.getElementById('tl-' + k);
    const mb = seg && seg.closest('.mb');
    if (mb) mb.style.display = _tl28 && _tl28.bo === 3 ? 'none' : '';
  });
  tl28Hint();
}
function tl28Set(id, v) {
  if (!_tl28) return;
  if (id === 'tl-bo') { _tl28.bo = +v === 3 ? 3 : 1; tl28Draw(); return; }
  if (id === 'tl-turn') _tl28.turn = v;
  const m = /^tl-g(\d)(r|t|pt|pg)$/.exec(id);
  if (m) {
    const g = _tl28.games[+m[1]];
    g[m[2]] = v;
    // A won game is usually all 6 of your prizes, a lost one all 6 of theirs.
    if (m[2] === 'r' && v === 'W' && g.pt === '') g.pt = '6';
    if (m[2] === 'r' && v === 'L' && g.pg === '') g.pg = '6';
    if (m[2] === 'pt' || m[2] === 'pg') return;
  }
  document.querySelectorAll('#' + id + ' .mode-opt').forEach(e => e.classList.toggle('active', e.dataset.val === String(v)));
  if (m && m[2] === 'r') tl28Draw();
}

// Your own first or second record against the opponent typed in the form.
function tl28Hint() {
  const el = document.getElementById('tl-hint');
  const inp = document.getElementById('tl-opp');
  if (!el || !inp) return;
  const old = el.querySelector('.tl-ft');
  if (old) old.remove();
  const k = String(inp.value || '').trim().toLowerCase();
  if (!k) { el.style.display = el.innerHTML.trim() ? '' : 'none'; return; }
  const xs = (state.tlog || []).filter(x => String(x.opp || '').toLowerCase() === k && x.id !== (_tl28 && _tl28.id));
  const f = tlGameRec(xs, 'first'), s = tlGameRec(xs, 'second');
  if (!f.n && !s.n) { el.style.display = el.innerHTML.trim() ? '' : 'none'; return; }
  const part = (r, w) => r.n ? `going ${w} you won ${r.w} of ${r.n} game${r.n === 1 ? '' : 's'}` : `no games going ${w} yet`;
  const div = document.createElement('div');
  div.className = 'tl-ft';
  div.innerHTML = `<b>Your record here:</b> ${part(f, 'first')}, ${part(s, 'second')}.`;
  el.appendChild(div);
  el.style.display = '';
}

(function () {
  const _form = openTlogForm;
  openTlogForm = function (id) {
    const r = _form.apply(this, arguments);
    const x = id ? (state.tlog || []).find(e => e.id === id) : null;
    const last = (state.tlog || []).slice().sort((a, b) => b.ts - a.ts)[0];
    const games = [0, 1, 2].map(i => {
      const g = x && x.bo === 3 && Array.isArray(x.games) && x.games[i] || {};
      return { r: ['W', 'L', 'T'].includes(g.r) ? g.r : '', t: TL_TURNS.includes(g.t) ? g.t : '', pt: tlNum(g.pt) == null ? '' : String(tlNum(g.pt)), pg: tlNum(g.pg) == null ? '' : String(tlNum(g.pg)) };
    });
    // A match saved before per game prizes kept only the last game's: put them there.
    if (x && x.bo === 3 && !games.some(g => g.pt !== '' || g.pg !== '')) {
      const lastPlayed = games.map(g => !!g.r).lastIndexOf(true);
      if (lastPlayed >= 0) { games[lastPlayed].pt = tlNum(x.taken) == null ? '' : String(tlNum(x.taken)); games[lastPlayed].pg = tlNum(x.given) == null ? '' : String(tlNum(x.given)); }
    }
    _tl28 = { id: x ? x.id : '', bo: x ? (x.bo === 3 ? 3 : 1) : (last && last.bo === 3 ? 3 : 1), turn: x && TL_TURNS.includes(x.turn) ? x.turn : '', games };
    const res = document.getElementById('tl-result');
    const wrap = res && res.closest('.mb');
    if (wrap) {
      const box = document.createElement('div');
      box.id = 'tl28-box';
      wrap.before(box);
      const rnd = document.createElement('div');
      rnd.className = 'mb';
      const rv = x && x.round ? x.round : '';
      rnd.innerHTML = `<label for="tl-round">Round</label><input type="text" id="tl-round" maxlength="12" placeholder="3 or Top 8" autocomplete="off" value="${esc(rv)}">`;
      const deckSel = document.getElementById('tl-deck');
      const deckWrap = deckSel && deckSel.closest('.mb');
      if (deckWrap) deckWrap.before(rnd); else box.before(rnd);
    }
    tl28Draw();
    return r;
  };

  const _hint = tlPlanHint;
  tlPlanHint = function () { const r = _hint.apply(this, arguments); tl28Hint(); return r; };

  const _save = saveTlog;
  saveTlog = async function (id) {
    if (!_tl28) return _save.apply(this, arguments);
    const f = _tl28;
    const games = f.games.map(g => g.r ? { r: g.r, t: g.t, pt: tlNum(g.pt), pg: tlNum(g.pg) } : { r: '', t: g.t });
    const played = games.filter(g => ['W', 'L', 'T'].includes(g.r));
    if (f.bo === 3) {
      if (!played.length) { showToast('Add the result of at least one game.'); return; }
      _tlForm.result = tlBo3Result(played);
    }
    const round = one23(String((document.getElementById('tl-round') || {}).value || ''), 12);
    const before = new Set((state.tlog || []).map(e => e.id));
    const t0 = Date.now();
    await _save.apply(this, arguments);
    const x = id ? (state.tlog || []).find(e => e.id === id)
      : (state.tlog || []).filter(e => !before.has(e.id) && e.ts >= t0 - 1000).sort((a, b) => b.ts - a.ts)[0];
    if (!x) return;
    x.bo = f.bo;
    x.round = round;
    if (f.bo === 3) {
      x.games = games; delete x.turn;
      // The match's prizes are the totals over its games.
      x.taken = games.reduce((a, g) => a + (g.pt || 0), 0);
      x.given = games.reduce((a, g) => a + (g.pg || 0), 0);
    }
    else { x.turn = TL_TURNS.includes(f.turn) ? f.turn : ''; delete x.games; }
    _tl28 = null;
    await saveState();
    renderTlog();
  };

  const _render = renderTlog;
  renderTlog = function () {
    const r = _render.apply(this, arguments);
    try { tl28Render(); } catch (e) { console.warn('[tlog v28]', e); }
    return r;
  };

  exportTlog = function () {
    const list = (state.tlog || []).filter(x => !_tlogDeck || x.deckId === _tlogDeck);
    const cell = v => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const went = t => t === 'first' ? 'First' : t === 'second' ? 'Second' : '';
    const rows = [['Date', 'Event', 'Round', 'Deck', 'Version', 'Opponent', 'Result', 'Match', 'Went', 'Games', 'Prizes taken', 'Prizes given', 'Notes']]
      .concat(list.map(x => {
        const d = state.decks.find(z => z.id === x.deckId);
        const gs = x.bo === 3 ? (x.games || []).filter(g => g && ['W', 'L', 'T'].includes(g.r)).map(g => g.r + (TL_TURNS.includes(g.t) ? ' ' + g.t : '') + (tlNum(g.pt) != null || tlNum(g.pg) != null ? ' ' + (tlNum(g.pt) || 0) + '-' + (tlNum(g.pg) || 0) : '')).join(' / ') : '';
        return [x.day, x.event, x.round || '', d ? d.name : x.deckName, x.deckVer || '', x.opp, x.result, x.bo === 3 ? 'Best of three' : 'One game',
          x.bo === 3 ? '' : went(x.turn), gs, x.taken, x.given, x.notes];
      }));
    const blob = new Blob([rows.map(r => r.map(cell).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'rdydeck-tournament-log.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
})();

function tl28Render() {
  const el = document.getElementById('tlog-body');
  if (!el) return;
  const list = (state.tlog || []).filter(x => !_tlogDeck || x.deckId === _tlogDeck);
  // Row details: round, who went first, game by game.
  el.querySelectorAll('.tl-row').forEach(row => {
    const btn = row.querySelector('button[onclick^="openTlogForm"]');
    const m = btn && /openTlogForm\('([\w.-]+)'\)/.exec(btn.getAttribute('onclick') || '');
    const x = m && (state.tlog || []).find(e => e.id === m[1]);
    const sub = row.querySelector('.tl-sub');
    if (!x || !sub || row.querySelector('.tl-x')) return;
    const bits = [];
    if (x.round) bits.push('Round ' + esc(x.round));
    if (x.bo === 3) {
      const gs = tlGames(x);
      if (gs.length) bits.push(gs.map(g => `<span class="tl-g ${g.r}" title="${g.t ? 'Went ' + g.t : ''}">${g.r}${g.t ? `<small>${g.t === 'first' ? '1st' : '2nd'}</small>` : ''}</span>`).join(''));
    } else if (TL_TURNS.includes(x.turn)) bits.push('Went ' + x.turn);
    if (!bits.length) return;
    const d = document.createElement('div');
    d.className = 'tl-x';
    d.innerHTML = bits.join('<span class="tl-dot"></span>');
    sub.after(d);
  });
  if (!list.length) return;
  const anchor = el.querySelector('.hp-actions');
  if (!anchor) return;
  const all = tlGameRec(list), f = tlGameRec(list, 'first'), s = tlGameRec(list, 'second');
  let h = `<div class="tl28">`;
  h += `<div class="hp-lbl">First or second</div>
    <div class="pg-tiles tl-ft-tiles">
      <div class="pg-tile"><div class="pl">Going first</div><div class="pv">${tlRate(f)}</div><div class="ps">${f.n ? tlRec(f) + ' in ' + f.n + ' game' + (f.n === 1 ? '' : 's') : 'No games yet'}</div></div>
      <div class="pg-tile"><div class="pl">Going second</div><div class="pv">${tlRate(s)}</div><div class="ps">${s.n ? tlRec(s) + ' in ' + s.n + ' game' + (s.n === 1 ? '' : 's') : 'No games yet'}</div></div>
      <div class="pg-tile"><div class="pl">All games</div><div class="pv">${tlRate(all)}</div><div class="ps">${all.n ? tlRec(all) + (all.n - f.n - s.n ? ', ' + (all.n - f.n - s.n) + ' not marked' : '') : 'No games yet'}</div></div>
    </div>`;
  if (!f.n && !s.n) h += `<div class="tl-tip">Mark who went first when you log a match, and this splits your record so you know what to pick when you win the coin flip.</div>`;
  // Recent form: last 10 matches against the rest.
  const sorted = list.slice().sort((a, b) => (b.day || '').localeCompare(a.day || '') || b.ts - a.ts);
  if (sorted.length > 10) {
    const r10 = tlogRecord(sorted.slice(0, 10), () => true), rest = tlogRecord(sorted.slice(10), () => true);
    const a = Math.round(r10.w / r10.n * 100), b = Math.round(rest.w / rest.n * 100);
    h += `<div class="tl-trend"><b>Last 10 matches:</b> ${r10.w}-${r10.l}-${r10.t} (${a}%), ${a === b ? 'the same as' : a > b ? 'up from' : 'down from'} ${b}% before that.</div>`;
  }
  // By opponent: match record, then games going first and second. This
  // replaces the plain By opponent table, which had the same rows.
  const byOpp = {};
  list.forEach(x => { const k = String(x.opp || '').toLowerCase(); (byOpp[k] = byOpp[k] || { name: x.opp, xs: [] }).xs.push(x); });
  const opps = Object.values(byOpp).sort((a, b) => b.xs.length - a.xs.length || String(a.name).localeCompare(String(b.name))).slice(0, 10);
  if (opps.length) {
    h += `<div class="hp-lbl">By opponent</div><div class="o-table-wrap"><table class="o-table tl-ft-table"><thead><tr><th>Opponent</th><th>Matches</th><th>Going 1st</th><th>Going 2nd</th></tr></thead><tbody>`;
    opps.forEach(o => {
      const m = tlogRecord(o.xs, () => true);
      const a = tlGameRec(o.xs, 'first'), b = tlGameRec(o.xs, 'second');
      // Only point one way with at least 2 games each way and a clear gap.
      const lean = a.n >= 2 && b.n >= 2 ? (Math.abs(a.w / a.n - b.w / b.n) >= 0.2 ? (a.w / a.n > b.w / b.n ? 'Better going first' : 'Better going second') : 'No clear edge') : '';
      h += `<tr><td>${esc(o.name)}<div class="tl-lean">${m.pgames ? m.avgTaken.toFixed(1) + ' prizes taken a game' : 'No prizes logged'}${lean ? ', ' + lean.toLowerCase() : ''}</div></td><td>${m.w}-${m.l}-${m.t}</td><td>${a.n ? tlRec(a) : '?'}</td><td>${b.n ? tlRec(b) : '?'}</td></tr>`;
    });
    h += `</tbody></table></div>`;
  }
  // By list version, for one deck.
  if (_tlogDeck) {
    const vs = {};
    list.forEach(x => { const v = x.deckVer || 0; (vs[v] = vs[v] || []).push(x); });
    const keys = Object.keys(vs).map(Number).sort((a, b) => b - a);
    if (keys.length > 1) {
      h += `<div class="hp-lbl">By list version</div><div class="o-table-wrap"><table class="o-table"><thead><tr><th>Version</th><th>Matches</th><th>Win rate</th></tr></thead><tbody>`;
      keys.forEach(v => { const r = tlogRecord(vs[v], () => true); h += `<tr><td>${v ? 'v' + v : 'Unknown'}</td><td>${r.w}-${r.l}-${r.t}</td><td>${r.n ? Math.round(r.w / r.n * 100) + '%' : '?'}</td></tr>`; });
      h += `</tbody></table></div>`;
    }
  }
  h += `</div>`;
  el.querySelectorAll('.tl-wrap > .hp-lbl').forEach(l => {
    if (l.closest('.tl28') || (window.rdI18n ? rdI18n.orig(l) : l.textContent).trim() !== 'By opponent') return;
    const t = l.nextElementSibling;
    if (t && t.classList.contains('o-table-wrap')) t.remove();
    l.remove();
  });
  const old = el.querySelector('.tl28');
  if (old) old.remove();
  anchor.insertAdjacentHTML('afterend', h);
}

