
// ═══════════ Upgrades (2.5): which cards to change, and the grade each change gives ═══════════
// Every number here comes from grading the changed list with gradeDeck, the same grade the page
// shows (Synergy, Power and the tournament results blend). Nothing is estimated.
// Cards to add come from what this deck's top lists run (builder.json, the same data as the deck
// builder) and from the Trainer swap ideas, so every card is one winning lists play now. Cards to
// take out are the ones the list runs that its top lists run less of, and Trainers marked Weak or
// Does nothing. A swap is one copy out and one copy in, so the list stays 60 cards; a swap that
// breaks a deck building rule (4 copies, one ACE SPEC, one Radiant) or holds the grade at the
// legality cap is never shown. Looking for upgrades never changes the deck or its grade.
const UP75_ADD = 12;        // most cards tried as adds
const UP75_OUT = 10;        // most cards tried as cuts
const UP75_SHOW = 3;        // swaps shown
const UP75_STEPS = 3;       // swaps made in a row for the "all together" line
const UP75_SHARE = 0.25;    // an add must be run by at least this share of the deck's top lists
const _up75Cache = new Map();   // deck id -> { sig, res } or { sig, busy }

const up75Key = n => typeof bldKey === 'function' ? bldKey(n) : rules34Key(n);

/** The builder.json deck this list plays: the archetype its grade takes results from, or the best match. */
function up75Arch(deck, R) {
  const decks = (bldUp && bldUp.decks) || [];
  if (!decks.length) return null;
  if (R && R.res) { const d = decks.find(x => x.id === R.res.id); if (d) return d; }
  try { const pick = mu60Picks()[deck.id]; const d = pick && decks.find(x => x.id === pick); if (d) return d; } catch (_) {}
  // No results archetype: the deck whose usual Pokemon this list plays most of, if it plays most of them.
  const have = new Set((deck.cards || []).map(c => up75Key(c.name)));
  let best = null;
  decks.forEach(d => {
    const core = d.cards.filter(c => c[3] === 'P' && c[6] >= 0.75);
    if (!core.length) return;
    const named = typeof g68Named === 'function' ? g68Named(d.name) : [];
    const mons = (deck.cards || []).filter(c => cardCategory(c) === 'pokemon').map(c => ' ' + mu60Norm(c.apiName || c.name) + ' ');
    if (named.length && !named.every(p => mons.some(n => n.includes(' ' + p + ' ')))) return;
    const s = core.filter(c => have.has(up75Key(c[0]))).length / core.length;
    if (s >= 0.6 && (!best || s > best.s)) best = { s, d };
  });
  return best ? best.d : null;
}

function up75Count(deck, key) {
  return (deck.cards || []).filter(c => up75Key(c.name) === key).reduce((a, c) => a + (c.count || 0), 0);
}

/** The deck with one copy of row `outKey` taken out and one copy of `add` put in, or null if it breaks a rule. */
function up75Swap(deck, outKey, add) {
  const cards = [];
  let took = false, put = false;
  (deck.cards || []).forEach(c => {
    let n = c.count || 0;
    if (!took && up75Key(c.name) === outKey && n > 0) { n -= 1; took = true; }
    if (!put && up75Key(c.name) === add.key && c.supertype) { n += 1; put = true; }
    if (n > 0) cards.push(Object.assign({}, c, { count: n }));
  });
  if (!took) return null;
  if (!put) cards.push(Object.assign({}, add.card, { count: 1 }));
  const d = Object.assign({}, deck, { cards, rot29: deck.rot29 ? JSON.parse(JSON.stringify(deck.rot29)) : deck.rot29 });
  if (rules34Breaches(d).length) return null;
  return d;
}

/** Grade a changed list. Returns null when it is held at the legality cap or does not grade. */
function up75Grade(d) {
  let R = null;
  try { R = gradeDeck(d); } catch (_) { return null; }
  if (!R || R.rawOverall != null) return null;
  return R;
}
// The grade before rounding, to break ties between swaps that show the same number.
const up75Raw = R => (R.steps ? R.steps.cohF * R.steps.viaF * 10 : R.overall) * (R.res ? 1 - R.res.w : 1) + (R.res ? R.res.score * R.res.w : 0);

// Synergy and Power as the page shows them.
const up75Parts = R => [gR1(R.coh.score * 10), gR1(R.via.score * 10)];
/** A swap counts when the grade, Synergy or Power goes up as shown, and none of the three goes down.
 *  Synergy can rise while the grade stays: it lowers the grade only once the list fits loosely. */
function up75Better(R, base) {
  const [s, p] = up75Parts(R), [s0, p0] = up75Parts(base), e = 1e-9;
  if (R.overall < base.overall - e || s < s0 - e || p < p0 - e) return false;
  return R.overall > base.overall + e || s > s0 + e || p > p0 + e;
}
const up75Yield = () => new Promise(r => setTimeout(r, 0));

/**
 * The swaps that raise this deck's grade most. Resolves to
 * { why } when there is nothing to look at, or { base, arch, swaps: [...], all } where each swap is
 * { out, in, from, to, syn: [a, b], pow: [a, b], note } and all is the grade after the best swaps in a row.
 */
async function up75Find(deck) {
  if (!deck || isDailyChallenge(deck) || deck.format === 'expanded' || deck.format === 'prerelease') return { why: 'format' };
  if (!(deck.cards || []).some(c => c.supertype)) return { why: 'data' };
  if (rules34Breaches(deck).length) return { why: 'rules' };
  const R0 = gradeDeck(deck);
  if (!R0) return { why: 'data' };
  if (R0.rawOverall != null) return { why: 'legal' };
  try { await bldData(); } catch (_) {}
  const arch = up75Arch(deck, R0);
  const tr = (R0.coh && R0.coh.trainers) || {};
  const fit = new Map((tr.fit || []).map(r => [up75Key(r.name), r]));

  // Cards to add: what this deck's top lists run more of than this list does, most played first.
  const adds = new Map();
  // A list with no meta deck to go by is offered the staples most top lists run, of any deck:
  // Trainers and the support Pokemon nearly every deck plays, never Energy or another deck's attackers.
  const ref = arch ? arch.cards : ((bldUp && bldUp.all) || []).filter(c => c[3] === 'T' ? c[6] >= 0.4 : c[3] === 'P' && c[6] >= 0.6);
  ref.forEach(c => {
    const [name, set, num, part, usual, , share] = c;
    const key = up75Key(name);
    if (share < UP75_SHARE || adds.has(key)) return;
    const have = up75Count(deck, key);
    if (have >= Math.max(1, usual) || have >= 4) return;
    adds.set(key, { key, name, set, num, part, share, src: 'arch' });
  });
  // The Trainer swap ideas name staples that do a job the list is short on.
  (tr.fit || []).forEach(r => {
    if (!r.swap || r.swap.more) return;
    const key = up75Key(r.swap.name);
    if (adds.has(key) || up75Count(deck, key)) return;
    const e = bldCat && bldCat.byName && (bldCat.byName.get(key) || [])[0];
    const meta = e ? (e.mp || [e.s, e.no]) : null;
    if (!meta) return;
    adds.set(key, { key, name: r.swap.name, set: meta && meta[0], num: meta && meta[1], part: 'T', share: 0, src: 'fit', why: r.swap.why });
  });
  const addList = [...adds.values()].sort((a, b) => b.share - a.share).slice(0, UP75_ADD);
  if (!addList.length) return { why: 'none', base: R0.overall, arch: arch && arch.name };

  // Read the cards to add the way an imported list is read (saved after the first time).
  const sect = { P: 'pokemon', T: 'trainer', E: 'energy' };
  const fresh = addList.map(a => ({ count: 1, name: a.name, set: a.set || '', num: a.num || '', section: sect[a.part] || undefined }));
  try { await enrichDeckCards(fresh); } catch (_) {}
  addList.forEach((a, i) => { if (fresh[i].resolved && fresh[i].supertype) a.card = fresh[i]; });
  const ready = addList.filter(a => a.card);
  if (!ready.length) return { why: 'offline', base: R0.overall, arch: arch && arch.name };

  // Cards to take out: one copy of anything its top lists run fewer of, or rarely run, and
  // Trainers marked Weak or Does nothing. Never the last Basic Energy of a type the deck needs:
  // the grade decides that, like everything else.
  const usualOf = new Map((arch ? arch.cards : ((bldUp && bldUp.all) || [])).map(c => [up75Key(c[0]), c]));
  const rows = new Map();
  (deck.cards || []).forEach(c => { const k = up75Key(c.name); const r = rows.get(k); if (r) r.n += c.count || 0; else rows.set(k, { key: k, name: c.name, n: c.count || 0, c }); });
  // The Pokemon the deck is named for stay: cutting the deck's own attacker is never the upgrade a player means.
  // 2.5.2: so does the deck's own main attacker, as the grade reads it from this list and its name,
  // with the Pokemon it evolves from, and any Pokemon the player's own deck name calls out. A deck
  // matched to the wrong archetype (Raging Bolt Ogerpon read as Basic Box) keeps its attacker too.
  // 2.6.2: the player's own deck name no longer counts here; the Main attacker pick says what the deck is built around.
  const named = arch && typeof g68Named === 'function' ? g68Named(arch.name) : [];
  const keep = new Set();
  try {
    // The main attacker as the grade reads it from the cards, and the one the player set under Main attacker
    // (every attacker the grade leads with when it is set as a toolbox), each with the Pokemon it evolves from.
    const v = R0.via || {};
    let ms = [v.auto, v.main].filter(Boolean);
    if (!R0.via) { const m = gMainAttacker(R0.entries || [], R0.coh, gArchName(deck, R0)); if (m) ms = [m]; }
    const line = new Set(ms.map(m => m.key).concat(v.boxPick || []));
    for (let i = 0; i < 3; i++) (R0.entries || []).forEach(e => { if (e.card && line.has(e.card.key) && e.card.from) line.add(e.card.from); });
    (R0.entries || []).forEach(e => { if (e.card && line.has(e.card.key)) keep.add(up75Key(e.name)); });
    ms.forEach(m => { if (m.engine && m.engine.name) keep.add(up75Key(m.engine.name)); });
  } catch (_) {}
  const isNamed = r => keep.has(r.key) || (cardCategory(r.c) === 'pokemon' && named.some(p => (' ' + mu60Norm(r.c.apiName || r.name) + ' ').includes(' ' + p + ' ')));
  const outs = [];
  rows.forEach(r => {
    if (isNamed(r)) return;
    const u = usualOf.get(r.key), f = fit.get(r.key);
    let v = 0;
    if (f && (f.fit === 'dead' || f.fit === 'weak')) v += f.fit === 'dead' ? 3 : 2;
    if (arch) { if (!u) v += 2.5; else { if (r.n > u[4]) v += 1 + (r.n - u[4]) * 0.25; if (u[6] < UP75_SHARE) v += 1; } }
    // With no meta deck to compare with, a card the list runs on purpose can look odd, so only
    // Trainers the grade marks Weak or Does nothing, and extra copies of a staple, are cut.
    else if (r.c.supertype === 'Trainer' && u && r.n > u[4]) v += 1 + (r.n - u[4]) * 0.25;
    if (r.c.ace && v > 0) v += 0.5;   // an ACE SPEC can trade for another one
    if (v > 0) outs.push(Object.assign(r, { v }));
  });
  outs.sort((a, b) => b.v - a.v);
  const outList = outs.slice(0, UP75_OUT);
  if (!outList.length) return { why: 'none', base: R0.overall, arch: arch && arch.name };

  // Grade every swap.
  const tryAll = async (d, base, skipOut, skipIn) => {
    const res = [];
    let t = Date.now();
    for (const o of outList) {
      if (skipOut && skipOut.has(o.key)) continue;
      for (const a of ready) {
        if (a.key === o.key || (skipIn && skipIn.has(a.key))) continue;
        const nd = up75Swap(d, o.key, a);
        if (!nd) continue;
        const R = up75Grade(nd);
        if (R && up75Better(R, base)) res.push({ o, a, R, raw: up75Raw(R), parts: up75Parts(R), deck: nd });
        if (Date.now() - t > 30) { await up75Yield(); t = Date.now(); }
      }
    }
    // Same numbers shown: cut the card top lists play least, add the one they play most.
    return res.sort((x, y) => (y.R.overall - x.R.overall) || ((y.parts[0] + y.parts[1]) - (x.parts[0] + x.parts[1])) ||
      (y.o.v - x.o.v) || (y.a.share - x.a.share) || (y.raw - x.raw));
  };
  const first = await tryAll(deck, R0);

  // Shown swaps: the best few, each with its own card out and card in.
  const usedO = new Set(), usedI = new Set(), pick = [];
  for (const s of first) {
    if (pick.length >= UP75_SHOW) break;
    if (usedO.has(s.o.key) || usedI.has(s.a.key)) continue;
    usedO.add(s.o.key); usedI.add(s.a.key); pick.push(s);
  }
  const syn = R => gR1(R.coh.score * 10), pow = R => gR1(R.via.score * 10);
  const note = s => {
    const u = s.a.src === 'arch' ? `${Math.round(s.a.share * 100)}% of ${arch ? arch.name + ' ' : ''}top lists run ${s.a.name}.` : s.a.why ? `Right now ${s.a.why}.` : '';
    const parts = [];
    if (syn(s.R) !== syn(R0)) parts.push(`Synergy ${syn(R0).toFixed(1)} to ${syn(s.R).toFixed(1)}`);
    if (pow(s.R) !== pow(R0)) parts.push(`Power ${pow(R0).toFixed(1)} to ${pow(s.R).toFixed(1)}`);
    // 3.3.3 (Muse 3.3.2 retest): each sentence is its own piece, so each one is translated on its own.
    return [parts.length ? parts.join(', ') + '.' : '', u].filter(Boolean);
  };
  // 3.0: each swap also names the printing of the card it adds, for its price (js/owned-prices.js).
  const swapOf = s => ({ out: s.o.name, in: s.a.name, from: R0.overall, to: s.R.overall,
    syn: [syn(R0), syn(s.R)], pow: [pow(R0), pow(s.R)], note: note(s).join(' '), notes: note(s),
    inSet: (s.a.card && s.a.card.set) || s.a.set || '', inNum: (s.a.card && s.a.card.num) || s.a.num || '' });
  const swaps = pick.map(swapOf);
  // 3.0: more of the swaps that raise the grade, best first, so "Suggest cards I own first" and
  // "Cheapest first" can pick from them. Each keeps its own graded numbers; nothing is graded again.
  const more = first.slice(0, 40).map(swapOf);

  // The best swaps made one after another, each one graded on the list the last one left.
  let all = null;
  if (first.length) {
    let cur = first[0], steps = [first[0]];
    const so = new Set([first[0].o.key]), si = new Set([first[0].a.key]);
    while (steps.length < UP75_STEPS) {
      const next = (await tryAll(cur.deck, cur.R, null, null)).filter(s => !(si.has(s.o.key) || so.has(s.a.key)));
      if (!next.length) break;
      cur = next[0]; steps.push(cur); so.add(cur.o.key); si.add(cur.a.key);
    }
    if (steps.length > 1) all = { n: steps.length, from: R0.overall, to: cur.R.overall,
      syn: [syn(R0), syn(cur.R)], pow: [pow(R0), pow(cur.R)], swaps: steps.map(s => ({ out: s.o.name, in: s.a.name })) };
  }
  return { base: R0.overall, arch: arch && arch.name, swaps, all, more };
}

function up75Sig(deck) {
  let mu = '';
  try { mu = (mu60Data && mu60Data.asOf) || ''; } catch (_) {}
  return g29Sig(deck) + '|' + mu + '|' + ((bldUp && bldUp.asOf) || '');
}

function up75Html(res, hasFix) {
  // 3.0: the order the player picked (cards they own first, cheapest first). Only which swaps show changes.
  if (typeof op30UpOrder === 'function') res = op30UpOrder(res);
  const head = n => `<details class="g-sec g29-fold" id="up75-sec" open data-go37-open><summary><span class="g-sec-t">Upgrades</span>${n ? `<span class="g29-n">${n}</span>` : ''}</summary>`;
  // 3.3.1 (Muse 3.3 retest, section 5 M1): with nothing to list, the section is not a fold. Its one line
  // stays on screen, even where the player once folded Upgrades away (that choice is kept for every deck).
  const line = t => `<div class="g-sec" id="up75-sec"><div class="g-sec-t">Upgrades</div><div class="g-sec-i">${t}</div></div>`;
  if (!res || res.busy) return line(`Checking which card swaps raise this grade.`);
  // 3.5.7: "need a connection" only when the device is offline; online, the card databases did not answer.
  if (res.why === 'offline') return line(typeof navigator !== 'undefined' && navigator.onLine === false
    ? `Upgrades need a connection the first time, to read the cards to try.`
    : `Upgrades could not read the cards to try yet. School or work wifi can block card data. They are tried again when you open this deck.`);
  // 3.2.8 (Muse s5 M1): the section stays, with a line saying why there is nothing to try, so Upgrades is never
  // missing without a word. Only a format Upgrades does not cover (Expanded, prerelease, the daily list) hides it.
  if (res.why === 'rules') return line(`Upgrades show once the list follows the deck rules. Fix first says what to change.`);
  if (res.why === 'legal') return line(`Upgrades show once every card in the list is Standard legal.`);
  if (res.why === 'data') return line(`Upgrades show once the card data for this list has loaded.`);
  if (res.why === 'error') return line(`Upgrades could not be worked out for this list just now. Open the deck again to retry.`);
  if (res.why && res.why !== 'none') return '';
  if (res.why === 'none' || !res.swaps.length) return line(`No single swap raises this grade, its Synergy or its Power${res.arch ? ` with the cards ${esc(res.arch)} top lists run` : ''}.${hasFix ? ' What Fix first lists needs more than one card changed.' : ''}`);
  const g = (a, b) => `${a.toFixed(1)} to ${b.toFixed(1)}`;
  const moved = s => s.to > s.from;
  const rows = res.swaps.map(s => `<div class="up75-row"><div class="up75-h"><span class="up75-n">Swap 1 ${esc(s.out)} for 1 ${esc(s.in)}</span>${moved(s) ? `<span class="up75-g">${g(s.from, s.to)}</span>` : ''}</div>
    ${s.note ? `<p>${(s.notes || [s.note]).map(x => `<span>${esc(x)}</span>`).join(' ')}</p>` : ''}${typeof op30UpTag === 'function' ? op30UpTag(s) : ''}</div>`);
  const best = Math.max(...res.swaps.map(s => s.to));
  if (res.all && (res.all.to > best || res.all.syn[1] > Math.max(...res.swaps.map(s => s.syn[1])) || res.all.pow[1] > Math.max(...res.swaps.map(s => s.pow[1])))) {
    const parts = [];
    if (res.all.syn[1] !== res.all.syn[0]) parts.push(`Synergy ${g(res.all.syn[0], res.all.syn[1])}`);
    if (res.all.pow[1] !== res.all.pow[0]) parts.push(`Power ${g(res.all.pow[0], res.all.pow[1])}`);
    rows.push(`<div class="up75-row all"><div class="up75-h"><span class="up75-n">Best ${res.all.n} swaps together</span>${moved(res.all) ? `<span class="up75-g">${g(res.all.from, res.all.to)}</span>` : ''}</div>
    <p><span>${res.all.swaps.map(s => `${esc(s.out)} for ${esc(s.in)}`).join(', ')}.</span>${parts.length ? ' <span>' + parts.join(', ') + '.</span>' : ''}</p></div>`);
  }
  const any = res.swaps.some(moved) || (res.all && moved(res.all));
  const intro = any ? 'Each number comes from grading the list with that swap made.'
    : 'These raise Synergy or Power. The grade itself stays the same, because Synergy lowers the grade only when a list fits loosely. Each number comes from grading the list with that swap made.';
  return head(res.swaps.length) + `<div class="g-sec-i">${intro}</div>${typeof op30UpBar === 'function' ? op30UpBar(res) : ''}${rows.join('')}</details>`;
}

(function () {
  const place = (el, html) => {
    const old = el.querySelector('#up75-sec');
    if (old) { if (!html) old.remove(); else old.outerHTML = html; return; }
    if (!html) return;
    const after = el.querySelector('#g29-fix');
    if (after) after.insertAdjacentHTML('afterend', html);
  };
  const fixed = el => !!el.querySelector('#g29-fix .g-sec-t');   // 2.5.2: Fix first lists a problem
  // 3.2.8 (Muse s5 M1): a throw while finding or drawing Upgrades is reported and leaves a line, not a gap.
  const html = (res, hasFix) => {
    try { return up75Html(res, hasFix); }
    catch (e) { if (typeof rdReportError === 'function') rdReportError(e, 'upgrades html'); return up75Html({ why: 'error' }); }
  };
  const _rg = renderGrade;
  renderGrade = function () {
    const r = _rg.apply(this, arguments);
    try {
      const el = document.getElementById('grade-body');
      const deck = state.decks.find(d => String(d.id) === String(state.activeDeckId));
      if (!el || !deck || !el.querySelector('#g29-fix')) return r;   // still grading, or no grade
      // 3.3.2 (Muse 3.3.1 retest M2): once the grade is on screen, Upgrades is placed too. A results or rotation
      // read that starts while the grade draws used to stop it here, and the section never came back.
      if (el.querySelector('.g71-wait')) return r;
      const sig = up75Sig(deck), hit = _up75Cache.get(deck.id);
      if (hit && hit.sig === sig && !hit.err) { place(el, html(hit.busy ? { busy: true } : hit.res, fixed(el))); return r; }
      _up75Cache.set(deck.id, { sig, busy: true });
      place(el, html({ busy: true }));
      up75Find(deck).then(res => {
        const h = _up75Cache.get(deck.id);
        if (!h || h.sig !== sig) return;
        // 3.3.2: the Trainer data can arrive while the swaps are worked out; the result is kept under the new key.
        const now = up75Sig(deck);
        // 3.5.7: cards it could not read are tried again on the next draw, as an error is.
        _up75Cache.set(deck.id, res && res.why === 'offline' ? { sig: now, res, err: true } : { sig: now, res });
        const live = document.getElementById('grade-body');
        if (live && String(state.activeDeckId) === String(deck.id) && live.querySelector('#g29-fix')) place(live, html(res, fixed(live)));
      }).catch(e => {
        if (typeof rdReportError === 'function') rdReportError(e, 'upgrades');
        // 3.3.1: kept as an error (not deleted) so Top fixes stops waiting; the next draw still tries again.
        _up75Cache.set(deck.id, { sig, res: { why: 'error' }, err: true });
        const live = document.getElementById('grade-body');
        if (live && String(state.activeDeckId) === String(deck.id) && live.querySelector('#g29-fix')) place(live, html({ why: 'error' }));
      });
    } catch (e) { if (typeof rdReportError === 'function') rdReportError(e, 'upgrades place'); }
    return r;
  };
})();
