
// ═══════════ 2.6: What top lists run, in the deck builder ═══════════
// meta-cards.json (built weekly by refresh-matchups.mjs with meta-cards.mjs) holds, per meta deck, what
// its top lists run (the top quarter of each Limitless online event in the last two sets, or only those
// since the newest set when there are enough), how the share of its lists that run each card moved in
// the last two weeks, and cards whose lists won more often against each of the most played decks.
// The builder shows them for the meta deck the list is built from or looks like: the cards with their
// usual counts (core and flex), how the list's counts compare, matchup techs and trends.
// None of it feeds the grade, which keeps reading builder.json and matchups.json.
const MC26_COMMON = 0.15;   // a count this share of top lists run is common
const MC26_RARE = 0.05;     // under this share of top lists, a count (or a card) is unusual
let mc26Tab = 'cards', mc26Opp = null, mc26AllFlex = false;

const MC26_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mc26Day = d => { const m = String(d || '').match(/^\d{4}-(\d{2})-(\d{2})$/); return m ? `${+m[2]} ${MC26_MON[+m[1] - 1]}` : String(d || ''); };

/** The builder's meta decks: meta-cards.json's when it loaded, builder.json's for any deck it lacks. */
function mc26Merge(up, mc) {
  if (!mc) return up;
  const decks = mc.decks.filter(d => Array.isArray(d.cards) && d.cards.length).map(d => ({ id: d.id, name: d.name, lists: d.tops, cards: d.cards, mc: d }));
  const have = new Set(decks.map(d => d.id));
  if (up && Array.isArray(up.decks)) up.decks.forEach(d => { if (!have.has(d.id)) decks.push(d); });
  let all = up && Array.isArray(up.all) ? up.all : null;
  if (!all) {
    // No builder.json: what every deck's top lists run, weighted by how many top lists each deck has.
    const tops = decks.reduce((a, d) => a + d.lists, 0) || 1, by = new Map();
    decks.forEach(d => d.cards.forEach(c => { const x = by.get(c[0]) || { c, n: 0 }; x.n += c[6] * d.lists; by.set(c[0], x); }));
    all = [...by.values()].map(({ c, n }) => [c[0], c[1], c[2], c[3], c[4], c[5], Math.round(n / tops * 100) / 100]).filter(c => c[6] >= 0.15).sort((a, b) => b[6] - a[6]);
  }
  const from = mc.from ? `Top lists from Limitless online tournaments since ${mc.from} came out (${mc26Day(mc.since)} to ${mc26Day(mc.until)})` : `Top lists from Limitless online tournaments, ${mc26Day(mc.since)} to ${mc26Day(mc.until)}`;
  return { ...(up || {}), asOf: mc.asOf, from, decks, all };
}

/** Where a deck's card numbers come from, in a sentence. */
function mc26Basis(d) {
  if (!d.mc || !bldMC) return `${d.lists} top lists.`;
  const n = bldMC.newest;
  return d.mc.basis === 'cur' && n ? `${d.lists} top lists since ${n.name || 'the newest set'} came out (${mc26Day(n.since)}).` : `${d.lists} top lists since ${bldMC.from || mc26Day(bldMC.since)}${bldMC.from ? ' came out' : ''}.`;
}

/** Share of a deck's top lists that run a card at exactly n copies (0 when none do). */
function mc26At(c, n) {
  if (!c) return 0;
  if (Array.isArray(c[7])) { const h = c[7].find(x => x[0] === n); return h ? c[6] * h[1] : 0; }
  return n === c[4] ? c[6] : 0;   // builder.json has the usual count only
}
/** "70% run 2, 22% run 3": the counts top lists run, as shares of all of them. */
function mc26Counts(c) {
  if (!Array.isArray(c[7])) return `${bldPct(c[6])} run it, most with ${c[4]}.`;   // builder.json: the usual count only
  const h = c[7];
  const parts = h.map(([k, s]) => [k, c[6] * s]).filter(x => x[1] >= 0.03).slice(0, 3).map(([k, s]) => `${bldPct(s)} run ${k}`);
  return parts.length ? parts.join(', ') + '.' : `${bldPct(c[6])} run it.`;
}

/**
 * How a count in the list compares with the deck's top lists: null when they run it at that count
 * commonly, else { sev, t } in a sentence. sev warn: under MC26_RARE of top lists run that count.
 */
function mc26Fit(d, name, n) {
  if (!d || !n) return null;
  const c = bldUseIn(d, name);
  if (!c) return { sev: 'warn', none: true };
  if (n === c[4] || !Array.isArray(c[7])) return null;   // builder.json has no counts to compare with
  const s = mc26At(c, n);
  if (s >= MC26_COMMON) return null;
  if (s >= MC26_RARE) return { sev: 'info', t: `${bldPct(s)} of ${d.name} top lists run ${n} ${name}. Most that run it run ${c[4]}.` };
  return { sev: 'warn', t: `${s ? `Only ${bldPct(s)} of ${d.name} top lists run` : `No ${d.name} top list runs`} ${n} ${name}. Most that run it run ${c[4]}.`, to: c[4] };
}

/** Checks for the counts: each count few top lists run, and the cards they do not run. */
function mc26Checks(ref, act) {
  if (!ref || !ref.d) return [];
  const d = ref.d, out = [], none = [];
  const seen = new Map();
  bld.rows.forEach(r => { const k = bldKey(r.name); const x = seen.get(k) || { name: r.name, n: 0, r }; x.n += r.count; seen.set(k, x); });
  let odd = 0;
  seen.forEach(x => {
    const f = mc26Fit(d, x.name, x.n);
    if (!f) return;
    // Too few copies of a card most lists run is already a suggestion ("Make it 2").
    const c = bldUseIn(d, x.name);
    if (c && x.n < c[4] && c[6] >= 0.5) return;
    if (f.none) { none.push(x.name); return; }
    if (f.sev !== 'warn') return;
    odd++;
    if (odd > 6) return;
    const to = f.to, cur = x.n, row = x.r;
    out.push({ sev: 'warn', t: f.t, act: act(`Make it ${to}`, () => {
      if (to < cur) { let cut = cur - to; bld.rows.filter(r => bldKey(r.name) === bldKey(row.name)).forEach(r => { const k = Math.min(cut, r.count); r.count -= k; cut -= k; }); bld.rows = bld.rows.filter(r => r.count > 0); }
      else bldAdd({ n: row.name, s: row.set, no: row.num, k: { pokemon: 'P', trainer: 'T', energy: 'E' }[bldKind(row)] }, to - cur);
    }) });
  });
  // meta-cards.json keeps cards 5% of top lists run, builder.json 10%.
  if (none.length) out.push({ sev: 'warn', t: `Under ${d.mc ? '5%' : '10%'} of ${d.name} top lists run ${none.slice(0, 5).join(', ')}${none.length > 5 ? ` and ${none.length - 5} more` : ''}.` });
  if (!odd && !none.length && bldTotal() >= 40) out.push({ sev: 'ok', t: `Every count is one ${d.name} top lists run.` });
  return out;
}

/** The sentence under a card in the list: how many top lists run it, and how the count compares. */
function mc26RowSub(ref, r) {
  const d = ref && ref.d, c = d && bldUseIn(d, r.name);
  if (!c) return null;
  let t = `${bldPct(c[6])} of ${d.name} top lists run it, most with ${c[4]}.`;
  const n = bldNameCount(r.name);
  if (n !== c[4] && Array.isArray(c[7])) { const s = mc26At(c, n); t += ` ${s ? bldPct(s) : 'None'} run ${n}.`; }
  return t;
}

function mc26SetTab(t) { mc26Tab = t; bldRender(); }
function mc26SetOpp(id) { mc26Opp = id; bldRender(); }
function mc26More() { mc26AllFlex = !mc26AllFlex; bldRender(); }

/** One card line with what the list has of it, or a button to add the usual count. */
function mc26Line(c, sub, usual) {
  const n = bldNameCount(c[0]);
  let right;
  if (n) right = `<span class="mc26-you">You ${n}</span>`;
  else {
    const e = (bldCat && bldCat.byPrint.get(c[1] + ' ' + c[2])) || (bldCat && (bldCat.byName.get(bldKey(c[0])) || [])[0]);
    const card = e ? { ...e, n: c[0], s: c[1] || e.s, no: c[2] || e.no } : { n: c[0], s: c[1], no: c[2], k: c[3] };
    const k = Math.max(1, usual || c[4] || 1);
    const i = bldActs.push(() => { if (bldAdd(card, k)) showToast(`Added ${k} ${c[0]}.`); }) - 1;
    right = `<button type="button" class="bld-add wide" onclick="bldAct(${i})">Add ${k}</button>`;
  }
  return `<div class="mc26-row"><div class="bld-tx"><div class="bld-nm">${esc(c[0])}</div><div class="bld-sub">${esc(sub)}</div></div>${right}</div>`;
}

function mc26CardsHtml(d) {
  const core = d.cards.filter(c => c[6] >= BLD_CORE), flex = d.cards.filter(c => c[6] < BLD_CORE);
  const shown = mc26AllFlex ? flex : flex.slice(0, 12);
  let h = `<p class="bld-small mc26-p">${esc(mc26Basis(d))} Core is what ${bldPct(BLD_CORE)} or more of them run.</p>`;
  h += `<div class="bld-group"><h3 class="bld-h">Core <span class="bld-n">${core.length} cards</span></h3>${core.map(c => mc26Line(c, mc26Counts(c))).join('') || '<div class="mc26-row bld-small">No card is in that many lists.</div>'}</div>`;
  if (flex.length) h += `<div class="bld-group"><h3 class="bld-h">Flex <span class="bld-n">${flex.length} cards</span></h3>${shown.map(c => mc26Line(c, mc26Counts(c))).join('')}${flex.length > 12 ? `<button type="button" class="mc26-more" onclick="mc26More()">${mc26AllFlex ? 'Show fewer' : `Show all ${flex.length}`}</button>` : ''}</div>`;
  return h;
}

function mc26TechsHtml(d) {
  const t = d.mc && d.mc.techs, names = new Map(((bldMC && bldMC.opponents) || []).map(x => [x[0], x[1]]));
  const opps = ((bldMC && bldMC.opponents) || []).map(x => x[0]).filter(id => id !== d.id && t && t[id]);
  if (!opps.length) return `<p class="bld-small mc26-p">Too few recorded matches for ${esc(d.name)} against the most played decks to tell.</p>`;
  if (!opps.includes(mc26Opp)) mc26Opp = opps[0];
  const x = t[mc26Opp], name = names.get(mc26Opp) || mc26Opp;
  const m = x.rec[0] + x.rec[1] + x.rec[2];
  let h = `<div class="mc26-opps" role="group" aria-label="Opponent">${opps.map(id => `<button type="button" class="${id === mc26Opp ? 'active' : ''}" onclick="mc26SetOpp('${esc(id)}')">${esc(names.get(id) || id)}</button>`).join('')}</div>`;
  h += `<p class="bld-small mc26-p">${esc(d.name)} against ${esc(name)}: won ${bldPct(x.rec[0] / m)} of ${m.toLocaleString('en-US')} matches.</p>`;
  if (!x.cards.length) return h + `<p class="bld-small mc26-p">No card stands out against ${esc(name)} yet. Lists with and without each card did about the same.</p>`;
  const usual = name => { const c = bldUseIn(d, name); return c ? c[4] : 1; };
  h += `<div class="bld-group">${x.cards.map(c => mc26Line([c[0], '', '', c[1]], `With it: won ${bldPct(c[2] / c[3])} of ${c[3].toLocaleString('en-US')}. Without: ${bldPct(c[4] / c[5])} of ${c[5].toLocaleString('en-US')}.`, usual(c[0]))).join('')}</div>`;
  return h + `<p class="bld-small">Lists that ran these won more often against ${esc(name)}. The card may not be the only reason.</p>`;
}

function mc26TrendsHtml(d) {
  const t = d.mc && d.mc.trend, r = bldMC && bldMC.recent;
  if (!t || !r) return `<p class="bld-small mc26-p">Not enough ${esc(d.name)} lists both in the last two weeks and before to show what is changing.</p>`;
  let h = `<p class="bld-small mc26-p">Share of all ${esc(d.name)} lists that run each card: the last two weeks (${mc26Day(r.since)} to ${mc26Day(r.until)}, ${t.late.toLocaleString('en-US')} lists) against before (${t.early.toLocaleString('en-US')} lists).</p>`;
  if (!t.cards.length) return h + '<p class="bld-small">No card moved by 10 points or more.</p>';
  const usual = name => { const c = bldUseIn(d, name); return c ? c[4] : 1; };
  const up = t.cards.filter(c => c[3] > c[2]), down = t.cards.filter(c => c[3] < c[2]);
  const group = (title, cs) => cs.length ? `<div class="bld-group"><h3 class="bld-h">${title} <span class="bld-n">${cs.length}</span></h3>${cs.map(c => mc26Line([c[0], '', '', c[1]], `${bldPct(c[2])} to ${bldPct(c[3])} of lists.`, usual(c[0]))).join('')}</div>` : '';
  return h + group('Rising', up) + group('Falling', down);
}

/** The builder's panel for the meta deck the list is built from or looks like. */
function mc26PanelHtml(ref) {
  if (!ref || !ref.d) return '';
  const d = ref.d, rich = !!(d.mc && bldMC);
  const tabs = rich ? [['cards', 'Cards'], ['techs', 'Matchups'], ['trends', 'Trends']] : [['cards', 'Cards']];
  if (!tabs.some(x => x[0] === mc26Tab)) mc26Tab = 'cards';
  const body = mc26Tab === 'techs' ? mc26TechsHtml(d) : mc26Tab === 'trends' ? mc26TrendsHtml(d) : mc26CardsHtml(d);
  return `<div class="bld-sec"><h2 class="bld-h">What ${esc(d.name)} top lists run</h2>
    ${tabs.length > 1 ? `<div class="mc26-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" aria-selected="${mc26Tab === k}" class="${mc26Tab === k ? 'active' : ''}" onclick="mc26SetTab('${k}')">${l}</button>`).join('')}</div>` : ''}
    ${body}<p class="bld-small">These are for decks like yours, not your exact list.</p></div>`;
}
