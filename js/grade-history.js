
// ═══════════ v2.5: grade history ═══════════
// Each saved deck keeps a short log of its grades on this device: a new entry whenever the list
// changes, and whenever the grade moves for another reason (new tournament results, a RdyDeck
// update, a different deck picked under Against the meta). Each entry says which it was, so a
// player can tell their own edits from a weekly results refresh. Nothing here changes a grade.
// Stored on the deck as deck.gradeLog = { v, l, e }: l is the newest list (one line per card, to
// work out what the next edit changed), e the entries, oldest first. The first entry is always
// kept, so the climb from where a player started stays visible.
const GH72_MAX = 16;   // entries per deck: the first one plus the newest 15
const GH72_DIFF = 8;   // card changes kept per entry
const gh72Num = v => typeof v === 'number' && isFinite(v);
/** The list as sorted lines, "count|name|set|num". */
function gh72Lines(deck) {
  return (deck.cards || []).filter(c => c && c.count > 0).map(c => [c.count, String(c.name || '').trim(), c.set || '', c.num || ''].join('|')).sort();
}
function gh72Hash(lines) {
  let h = 5381; const s = lines.join('\n');
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36) + ':' + lines.length;
}
/** What changed between two lists, by card name: [[+1, 'Counter Catcher'], [-1, 'Fighting Gong']]. */
function gh72Diff(was, now) {
  const tally = (lines, k) => { const m = new Map(); (lines || []).forEach(l => { const p = String(l).split('|'); const n = p[1] || ''; m.set(n, (m.get(n) || 0) + k * (parseInt(p[0]) || 0)); }); return m; };
  const a = tally(was, -1), b = tally(now, 1);
  b.forEach((v, n) => a.set(n, (a.get(n) || 0) + v));
  const out = [];
  a.forEach((v, n) => { if (v) out.push([v, n]); });
  out.sort((x, y) => (y[0] > 0) - (x[0] > 0) || Math.abs(y[0]) - Math.abs(x[0]) || x[1].localeCompare(y[1]));
  return out;
}
/** The log, checked: a log that came from an old backup or was damaged is set aside, never trusted. */
function gh72Log(deck) {
  const g = deck && deck.gradeLog;
  if (!g || typeof g !== 'object' || !Array.isArray(g.e) || !Array.isArray(g.l)) return null;
  const e = g.e.filter(x => x && gh72Num(x.t) && gh72Num(x.g));
  return e.length ? { v: 1, l: g.l.filter(x => typeof x === 'string'), x: g.x && typeof g.x === 'object' ? g.x : {}, e } : null;
}
let _gh72T = 0;
function gh72Save() { clearTimeout(_gh72T); _gh72T = setTimeout(() => { try { saveState(); } catch (_) {} }, 500); }
/** True when this grade is the settled one, so it is safe to keep. */
function gh72Final(deck, R) {
  if (!deck || !R || !gh72Num(R.overall) || deck.daily || deck.format === 'prerelease') return false;
  if (!state.decks.includes(deck)) return false;                       // shared and daily decks are not saved
  if (typeof g71WaitFor === 'function' && g71WaitFor(deck)) return false;  // still loading
  if (typeof _g71Late !== 'undefined' && _g71Late.has(deck.id)) return false;  // shown before it settled
  if (typeof g71Stale === 'function' && g71Stale(deck)) return false;  // card data from an older reader
  if (typeof g71NotFinal === 'function' && g71NotFinal(deck, R)) return false;  // 3.2.7: some cards unread
  return true;
}
/** The things around a grade that can move it while the list stays the same. */
function gh72Ctx(deck, R) {
  let pick = '';
  try { pick = mu60Picks()[deck.id] || ''; } catch (_) {}
  return { m: mu60Data && mu60Data.asOf ? String(mu60Data.asOf) : '', u: pick, b: typeof PT_BUILD === 'number' ? PT_BUILD : 0,
    // 2.5.1: n is the rotation hold (the grade held at G40_CAP), which is what the history line says.
    // t is the Trainer data (builder.json) the grade was read with, so a change there reads as results.
    f: deck.format || 'standard', n: R.rawOverall != null ? 1 : 0, r: R.unread || 0,
    t: typeof g76Played !== 'undefined' && g76Played ? g76N : 0,
    // 2.6.2: the Main attacker pick ('' is Auto), as the grade read it.
    atk: R.via && R.via.pick ? R.via.pick : '' };
}
/** Keep the grade on the deck's log when it is new: a changed list, or a grade that moved. The
 *  reason is worked out now and kept with the entry (w): s start, e your edit (with r:1 when results
 *  also updated since the last entry), u Against the meta pick, f format, r results, a app update,
 *  l legality, c card data read again. */
function gh72Note(deck, R) {
  if (!gh72Final(deck, R)) return;
  const lines = gh72Lines(deck), k = gh72Hash(lines), x = gh72Ctx(deck, R);
  const cur = { t: Date.now(), g: R.overall, s: gR1(R.coh.score * 10), p: gR1(R.via.score * 10),
    c: R.res && gh72Num(R.cardOverall) ? R.cardOverall : null, k, m: x.m, u: x.u, n: x.n };
  const log = gh72Log(deck);
  if (!log) { cur.w = 's'; deck.gradeLog = { v: 1, l: lines, x, e: [cur] }; gh72Save(); return; }
  const last = log.e[log.e.length - 1], was = log.x && typeof log.x === 'object' ? log.x : {};
  if (last.k === k) {
    // Same list. Results that have not loaded (offline) or cards that could not be read this time
    // would show a drop that is not real, so those are not kept.
    if (!x.m && was.m) return;
    if (!x.t && was.t) return;
    if (x.r > (was.r || 0)) return;
    if (last.g === cur.g && last.n === cur.n) {
      // The grade held: remember what it was read with, so the next move is put down to the right cause.
      if (['m', 'u', 'b', 'f', 'n', 'r', 't', 'atk'].some(f => (was[f] || '') !== (x[f] || ''))) { log.x = x; deck.gradeLog = log; gh72Save(); }
      return;
    }
    cur.w = x.atk !== (was.atk || '') ? 'k' : x.u !== (was.u || '') ? 'u' : x.f !== (was.f || 'standard') ? 'f' : x.m !== (was.m || '') ? 'r'
      : x.b !== was.b ? 'a' : x.t !== (was.t || 0) ? 'r' : x.n !== (was.n || 0) ? 'l' : 'c';
    if (cur.w === 'k') { cur.ak = x.atk; if (x.atk && x.atk !== 'toolbox') { const pe = (R.entries || []).find(y => y.card && y.card.key === x.atk); cur.akn = pe ? pe.name : x.atk; } }
  } else {
    cur.w = 'e';
    if (x.m && was.m && x.m !== was.m) cur.r = 1;
    cur.d = gh72Diff(log.l, lines).slice(0, GH72_DIFF);
  }
  log.e.push(cur);
  if (log.e.length > GH72_MAX) log.e.splice(1, log.e.length - GH72_MAX);
  log.l = lines; log.x = x;
  deck.gradeLog = log;
  gh72Save();
}
(function () {
  const _g = g29Grade;
  g29Grade = function (deck) {
    const R = _g.apply(this, arguments);
    try { if (R) gh72Note(deck, R); } catch (_) {}
    return R;
  };
})();

// ── the Grade tab section ──
function gh72When(t) {
  const d = new Date(t);
  if (isNaN(d)) return '';
  const now = new Date(), day = 86400000;
  const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const clock = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (same(d, now)) return 'Today, ' + clock;
  if (same(d, new Date(now.getTime() - day))) return 'Yesterday, ' + clock;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}
function gh72Arch(id) {
  const d = id && mu60Data && Array.isArray(mu60Data.decks) ? mu60Data.decks.find(x => x.id === id) : null;
  return d ? d.name : '';
}
/** Why an entry has the grade it has, in one plain sentence. */
function gh72Why(e) {
  switch (e.w) {
    case 'e': {
      const d = Array.isArray(e.d) ? e.d.filter(x => Array.isArray(x) && gh72Num(x[0]) && typeof x[1] === 'string') : [];
      return (d.length ? 'You changed the list: ' + d.map(x => (x[0] > 0 ? '+' : '-') + Math.abs(x[0]) + ' ' + x[1]).join(', ') + '.'
        : 'You changed card printings or set codes.') + (e.r ? ' Tournament results also updated.' : '');
    }
    case 'u': { const n = gh72Arch(e.u); return e.u ? `You set it to compare as ${n || 'another deck'} under Against the meta.` : 'You cleared the deck picked under Against the meta.'; }
    case 'f': return 'You changed the format.';
    case 'k': return e.ak === 'toolbox' ? 'You set it as a toolbox deck under Main attacker.' : e.ak ? `You set the main attacker to ${typeof e.akn === 'string' ? gCap(e.akn) : 'another Pokemon'}.` : 'You set the main attacker back to Auto.';
    case 'r': return `Tournament results updated${e.m && typeof d30Nice === 'function' ? ' (as of ' + d30Nice(e.m) + ')' : ''}. Your list did not change.`;
    case 'a': return 'A RdyDeck update changed how grades are worked out. Your list did not change.';
    case 'l': return e.n ? 'Some cards are no longer Standard legal. Your list did not change.' : 'Every card is Standard legal again. Your list did not change.';
    case 'c': return 'The card data was read again. Your list did not change.';
    default: return 'Where your history starts.';
  }
}
const gh72Mine = e => !e.w || e.w === 's' || e.w === 'e' || e.w === 'u' || e.w === 'f' || e.w === 'k';
function gh72Chart(e) {
  const W = 320, H = 96, px = 14, py = 14;
  const gs = e.map(x => x.g), lo = Math.max(0, Math.min(...gs) - 0.5), hi = Math.min(10, Math.max(...gs) + 0.5), span = Math.max(hi - lo, 1);
  const X = i => px + (e.length === 1 ? (W - 2 * px) / 2 : i * (W - 2 * px) / (e.length - 1));
  const Y = v => py + (1 - (v - lo) / span) * (H - 2 * py);
  const pts = e.map((x, i) => X(i).toFixed(1) + ',' + Y(x.g).toFixed(1)).join(' ');
  const dots = e.map((x, i) => {
    const mine = gh72Mine(x);
    return `<circle cx="${X(i).toFixed(1)}" cy="${Y(x.g).toFixed(1)}" r="4.5" class="${mine ? 'gh72-dm' : 'gh72-do'}"><title>${esc(gh72When(x.t))}: ${x.g.toFixed(1)}</title></circle>`;
  }).join('');
  const lab = (v, y) => `<text x="${W - 2}" y="${y}" text-anchor="end" class="gh72-ax">${v.toFixed(1)}</text>`;
  return `<svg class="gh72-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grade over ${e.length} versions, from ${e[0].g.toFixed(1)} to ${e[e.length - 1].g.toFixed(1)}">
    <line x1="${px}" x2="${W - px}" y1="${Y(hi).toFixed(1)}" y2="${Y(hi).toFixed(1)}" class="gh72-grid"/>
    <line x1="${px}" x2="${W - px}" y1="${Y(lo).toFixed(1)}" y2="${Y(lo).toFixed(1)}" class="gh72-grid"/>
    ${lab(hi, Y(hi) - 3)}${lab(lo, Y(lo) - 3)}
    <polyline points="${pts}" class="gh72-line"/>${dots}</svg>`;
}
function gh72Html(deck) {
  const log = gh72Log(deck);
  if (!log) return '';
  const e = log.e, first = e[0], last = e[e.length - 1];
  if (e.length === 1) return `<div class="g-sec" id="gh72-sec"><div class="g-sec-t">Grade history</div>
    <div class="g-sec-i">The first saved grade is ${first.g.toFixed(1)}. Each time you change this list, its new grade is kept here, so you can see it climb.</div></div>`;
  const dlt = gR1(last.g - first.g), edits = e.filter(x => x.w === 'e').length;
  const sum = dlt > 0 ? `Up ${dlt.toFixed(1)}, from ${first.g.toFixed(1)} to ${last.g.toFixed(1)}`
    : dlt < 0 ? `Down ${Math.abs(dlt).toFixed(1)}, from ${first.g.toFixed(1)} to ${last.g.toFixed(1)}` : `Holding at ${last.g.toFixed(1)}`;
  const rows = e.map((x, i) => {
    const prev = e[i - 1], mv = prev ? gR1(x.g - prev.g) : 0;
    const chg = !prev ? '' : mv > 0 ? `<span class="gh72-up">+${mv.toFixed(1)}</span>` : mv < 0 ? `<span class="gh72-dn">-${Math.abs(mv).toFixed(1)}</span>` : `<span class="gh72-eq">0.0</span>`;
    return `<li class="gh72-row${gh72Mine(x) ? '' : ' gh72-not'}"><div class="gh72-top"><span class="gh72-w">${esc(gh72When(x.t))}</span><b class="gh72-g">${x.g.toFixed(1)}</b>${chg}</div>
      <p>${esc(i ? gh72Why(x) : gh72Why({ w: 's' }))}${x.n ? ' Held at this grade until the list is legal.' : ''}</p></li>`;
  }).reverse().join('');
  const cut = e.length >= GH72_MAX ? `<p class="gh72-note">The first version and the newest ${GH72_MAX - 1} are kept.</p>` : '';
  return `<details class="g-sec g29-fold" id="gh72-sec" open><summary><span class="g-sec-t">Grade history</span><span class="g29-n">${e.length}</span></summary>
    <div class="g-sec-i">${sum} over ${e.length} versions${edits ? `, ${edits} of them your edits` : ''}. Open dots are changes you did not make, like new tournament results.</div>
    ${gh72Chart(e)}
    <ol class="gh72-list">${rows}</ol>${cut}
    <p class="gh72-note">Kept on this device only.</p></details>`;
}
(function () {
  const _rg = renderGrade;
  renderGrade = function () {
    const r = _rg.apply(this, arguments);
    try {
      const el = document.getElementById('grade-body');
      const deck = state.decks.find(d => d.id === state.activeDeckId);
      if (!el || !deck || el.querySelector('.g71-wait') || el.querySelector('#gh72-sec')) return r;
      const h = gh72Html(deck);
      if (!h) return r;
      const fix = el.querySelector('#g29-fix');
      if (fix) fix.insertAdjacentHTML('afterend', h); else el.insertAdjacentHTML('beforeend', h);
    } catch (_) {}
    return r;
  };
})();
// 2.6.2: Main attacker sits right under Fix first; this wraps last so it lands above Grade history and Upgrades.
(function () {
  const _rg = renderGrade;
  renderGrade = function () {
    const r = _rg.apply(this, arguments);
    try {
      const deck = state.decks.find(d => d.id === state.activeDeckId);
      const el = document.getElementById('grade-body');
      const fix = el && el.querySelector('#g29-fix');
      if (!deck || !fix || el.querySelector('.g71-wait') || el.querySelector('#atk62-sec')) return r;
      const h = atk62Section(deck, g29Grade(deck));
      if (h) fix.insertAdjacentHTML('afterend', h);
    } catch (e) { console.warn('[attacker]', e); }
    return r;
  };
})();
