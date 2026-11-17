
// ═══════════ v29: rotation tracker ═══════════
// Which cards in a Standard list leave the format next, by regulation mark.
// Sources, read 8 Nov 2026:
//   Legal now: H, I, J and any later mark. Pokemon TCG Live letter to the
//   community, 19 Mar 2026 (G mark out of Standard from 26 Mar 2026 on Live).
//   G rotation: announced 9 Jan 2026, Play! Pokemon events from 10 Apr 2026.
//   Next rotation: NOT announced. H is expected to go next, by the yearly
//   pattern (D 2023, E 2024, F 2025, G 2026, each announced in early January,
//   on Live in late March and at events in early or mid April).
//   Reprints: a card with an older mark, or none, is legal while it has a
//   reprint with a legal mark (play.pokemon.com Rules and Formats).
const ROT29 = {
  v: 1,
  asOf: '8 Nov 2026',
  firstLegal: 'H',                 // H, I, J and later are Standard legal now
  next: {
    marks: ['H'], announced: false,
    when: 'April 2027', live: 'late March 2027',
    src: { name: 'CardJinx, 25 Oct 2026', url: 'https://cardjinx.com/guides/pokemon-tcg-rotation-2027/' },
    pattern: 'D left in 2023, E in 2024, F in 2025 and G in 2026, each announced in January and gone from events in April',
    checkBy: '2027-02-01',
  },
  last: { marks: ['G'], events: '10 April 2026', live: '26 March 2026',
    src: { name: 'Pokémon TCG Live letter to the community, 19 Mar 2026', url: 'https://community.pokemon.com/en-us/discussion/23170/letter-to-the-community-march-19-2026' } },
  rules: { name: 'Play! Pokémon Rules and Formats', url: 'https://play.pokemon.com/en-ca/resources/rules/' },
};
const R29_BASIC_E = /^(basic )?(grass|fire|water|lightning|psychic|fighting|darkness|metal|fairy|\{[a-z]\}) energy$/i;

function r29Key(n) {
  return String(n || '').replace(/[’‘]/g, "'").toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
// Only a single capital letter is a mark, whatever a stored deck or backup says.
function r29M(m) { return typeof m === 'string' && /^[A-Z]$/.test(m) ? m : null; }
function r29Legal(m) { return !!m && m >= ROT29.firstLegal; }
function r29Rotates(m) { return !!m && ROT29.next.marks.includes(m); }
function r29Safe(m) { return r29Legal(m) && !r29Rotates(m); }

// 2.7.3: the names of every Trainer and Special Energy that is legal in Standard now, from cards.json (built weekly from
// pokemon-tcg-data, reprints included). Saved on the device, so the legality check knows a reprinted
// Trainer before, and without, the online reprint check. Read again once per page load.
const R273_KEY = 'pt_legal_trainers';
let r273 = null, r273Tried = false;
function r273Set(j) {
  if (!j || !Array.isArray(j.cards) || j.firstLegal !== ROT29.firstLegal) return false;
  // Trainers and Special Energy: a reprint keeps either legal by name alone.
  const names = j.cards.filter(c => c && (c.k === 'T' || (c.k === 'E' && !c.be)) && c.n).map(c => r29Key(c.n));
  if (names.length < 100) return false;
  // 3.2.8: and what each Stage 1 evolves from, so a Stage 2 played with Rare Candy knows its Basic.
  const ef = {};
  j.cards.forEach(c => { if (c && c.k === 'P' && c.st === 1 && c.n && typeof c.ef === 'string' && c.ef) ef[r29Key(c.n)] = c.ef; });
  r273 = { asOf: String(j.asOf || ''), firstLegal: j.firstLegal, set: new Set(names), ef };
  return true;
}
function r273Ready() {
  if (!r273) { try { const d = JSON.parse(safeLocalGet(R273_KEY) || 'null'); if (d && Array.isArray(d.n) && d.f === ROT29.firstLegal) r273 = { asOf: d.a, firstLegal: d.f, set: new Set(d.n), ef: d.e && typeof d.e === 'object' ? d.e : {} }; } catch (_) {} }
  if (!r273Tried && typeof fetch === 'function') {
    r273Tried = true;
    fetch('cards.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => {
      const was = r273 && r273.asOf, hadEf = !!(r273 && r273.ef && Object.keys(r273.ef).length);
      if (j && r273Set(j)) {
        safeLocalSet(R273_KEY, JSON.stringify({ a: r273.asOf, f: r273.firstLegal, n: [...r273.set], e: r273.ef }));
        if (was !== r273.asOf || !hadEf) { try { _g29Cache.clear(); } catch (_) {} try { if (typeof mu60Rerender === 'function') mu60Rerender(); } catch (_) {} }
      }
    }).catch(() => {});
  }
  return !!r273;
}
function r273Legal(name) { return !!r273 && r273.set.has(r29Key(name)); }
/** 3.2.8: true for a set code from Sword and Shield or earlier (BRS, LOR), whose cards carry no mark legal now. */
/** 3.2.8: a Pokemon TCG Pocket set code (A1, A2b, P-A), never a card game set. */
function r29PocketSet(code) { return /^(?:[AB]\d+[a-z]?|P-?[AB])$/i.test(String(code || '')); }
function r29OldSet(code) {
  if (typeof TCGEnrich === 'undefined') return false;
  const k = String(code || '').toUpperCase();
  const pid = String((TCGEnrich.SET_MAP || {})[k] || (TCGEnrich.LEARNED_SETS || {})[k] || '');
  return /^(?:swsh|sm|xy|bw|cel25|g1|det1|dv1|hgss|col1|hsp)/.test(pid);
}
/** 3.2.8: the Basic a Standard legal Stage 1 evolves from, from cards.json, or ''. */
function r273From(stage1) { try { r273Ready(); } catch (_) {} return (r273 && r273.ef && r273.ef[r29Key(stage1)]) || ''; }

// One row per card name in the list, with what the mark means for it.
function r29Rows(deck) {
  const cache = (deck.rot29 && deck.rot29.v === ROT29.v && deck.rot29.names) || {};
  const byName = new Map();
  (deck.cards || []).forEach(c => {
    const k = r29Key(c.name);
    let r = byName.get(k);
    if (!r) { r = { key: k, name: c.name, qty: 0, marks: [], unread: false, energy: false, other: false, pkmn: false, atk: [], abil: [] }; byName.set(k, r); }
    r.qty += c.count;
    if (R29_BASIC_E.test(String(c.name || '').trim())) { r.energy = true; return; }
    if (!c.supertype || !c.reg || c.reg.status === 'unknown') { r.unread = true; return; }
    if (String(c.supertype).toLowerCase().startsWith('pok')) {
      r.pkmn = true;
      if (!r.atk.length) r.atk = (c.attacks || []).map(a => r29Key(a.name)).filter(Boolean).sort();
      if (!r.abil.length) r.abil = (c.abilities || []).map(a => r29Key(a.name)).filter(Boolean).sort();
    }
    if (c.byName) r.other = true;
    // 3.2.8: a printing from Pokemon TCG Pocket (X Speed, Sabrina, or a list line with a Pocket set code) is never legal in the card game.
    const pk = !!(c.pocket || (c.byName && r29PocketSet(c.set)));
    r.pocket = (r.pocket === undefined ? true : r.pocket) && pk;
    // v68: the list names a set and number the card database does not have (a new promo like
    // MEP 38), so its mark came from an older printing. New printings reach the database late,
    // so this card is unconfirmed, never "not legal now".
    // A row with a printing the database does have still counts as read.
    // 3.2.8: but a printing from a Sword and Shield or older set is never Standard legal, whatever mark
    // another printing carries, so its own mark is not taken from that printing, and the check decides.
    const old = !!(c.byName && c.set && r.pkmn && String(c.supertype).toLowerCase().startsWith('pok') && r29OldSet(c.set));
    if (old) r.oldSet = true;
    const unl = !!(c.byName && c.set && c.num) && !old;
    r.unlisted = (r.unlisted === undefined ? true : r.unlisted) && unl;
    r.marks.push(old ? null : r29M(c.reg.mark));
  });
  const rows = [];
  byName.forEach(r => {
    if (r.energy) { r.st = 'energy'; rows.push(r); return; }
    if (!r.marks.length) { r.st = 'unread'; rows.push(r); return; }
    // The best mark any printing in the list carries.
    r.mark = r.marks.filter(Boolean).sort().pop() || null;
    const rep = cache[r.key];
    const rb = rep && r29M(rep.best);
    r.reprint = rb && rb > (r.mark || '') ? rb : null;
    r.checked = !!rep;
    // 3.2.8: every line of this name is a Pocket printing, so no mark or reprint makes it legal.
    if (r.pocket) { r.st = 'out'; rows.push(r); return; }
    const best = r.reprint || r.mark;
    // 2.7.3: a Trainer the online reprint check has not looked at yet is decided from the list of every
    // Trainer name legal now (cards.json, saved on the device): on the list, an older printing counts
    // as legal (a reprint keeps it); off the list, it is not legal now. The online check still runs and
    // has the last word, and Pokemon still wait for it, since a reprint has to match their attacks.
    if (!r.checked && !r.pkmn && !r29Legal(best) && r273Ready()) {
      if (r273Legal(r.name)) { r.st = 'safe'; r.listed = true; rows.push(r); return; }
      if (best && !r.unlisted) { r.st = 'out'; r.listed = true; rows.push(r); return; }
    }
    // v40: only a confirmed mark counts as safe. A missing mark, a Pokemon mark read
    // from another printing, or a reprint check that has not run yet is unknown.
    if (r29Safe(best) && !(r.other && r.pkmn && !r.reprint)) r.st = 'safe';
    else if (r29Rotates(best)) r.st = 'risk';
    // v67: a name-only card counts too, once the check has looked at every printing with that name.
    // Before the check a card stays unconfirmed: lists name old printings of Trainers that were reprinted
    // (Pokegear 3.0 SVI), so capping on the printed mark alone would hold legal decks at 4.9.
    else if (best && r.checked && !r.unlisted) r.st = 'out';
    // 3.2.8: an old printing with no legal reprint found is not legal now.
    else if (r.oldSet && r.pkmn && r.checked && !r.marks.some(Boolean)) r.st = 'out';
    else r.st = 'unconf';
    rows.push(r);
  });
  return rows;
}

function r29Counts(rows) {
  const n = st => rows.filter(r => r.st === st).reduce((a, r) => a + r.qty, 0);
  return { out: n('out') + n('nomark'), risk: n('risk'), safe: n('safe'), unread: n('unread'), energy: n('energy'), unconf: n('unconf') + n('unread'),
    outNames: rows.filter(r => r.st === 'out' || r.st === 'nomark').length, riskNames: rows.filter(r => r.st === 'risk').length };
}

// ── Reprint check: a rotating card stays if a printing with a later mark exists ──
// 2.5.2: a name with more printings than one page holds (Pikachu, say) is read to the end,
// up to 1,000 printings, so a legal reprint past the first 250 is still found.
async function r52AllPages(get, url) {
  const json = await get(url);
  if (!json || !Array.isArray(json.data)) return json;
  const total = Number(json.totalCount) || 0, size = Number(json.pageSize) || 250;
  for (let page = 2; total > json.data.length && page <= 4 && (page - 1) * size < total; page++) {
    const more = await get(url + '&page=' + page);
    if (!more || !Array.isArray(more.data) || !more.data.length) break;
    json.data.push(...more.data);
  }
  return json;
}
const _r29Busy = new Set(), _r29Tried = new Set();
function r29NeedsCheck(deck, rows) {
  // v67: name-only cards are checked too, so one whose every printing is past the legal line counts.
  // 2.7.3: a Trainer decided from the saved legal names is still checked online, which has the last word.
  return rows.filter(r => (r.st === 'risk' || r.st === 'out' || r.st === 'nomark' || r.st === 'unconf' || r.listed) && !r.checked && !r.pocket);
}
var r29CheckReprints;   // set further down

// ── What the Grade tab shows ──
function r29Summary(deck) {
  if (deck.format === 'expanded') {
    return { chip: '', html: `<div class="g-sec" id="r29-sec"><div class="g-sec-t">Rotation</div>
      <div class="g-sec-i">Rotation is a Standard format change. This deck is set to Expanded, so nothing here rotates next.</div></div>` };
  }
  const rows = r29Rows(deck);
  const k = r29Counts(rows);
  const N = ROT29.next, ann = N.announced;
  const marks = N.marks.join(' and ');
  const busy = _r29Busy.has(deck.id);
  const pending = r29NeedsCheck(deck, rows).length;
  if (pending && !busy && !_r29Tried.has(deck.id)) setTimeout(() => r29CheckReprints(deck), 0);

  const link = s => `<a href="${s.url}" target="_blank" rel="noopener">${esc(s.name)}</a>`;
  let h = `<div class="g-sec" id="r29-sec"><div class="g-sec-t">Rotation</div>
    <div class="r29-head"><span class="r29-tag ${ann ? 'ann' : 'exp'}">${ann ? 'Announced' : 'Expected'}</span>
      <span><b>${marks} mark</b> cards ${ann ? 'leave' : 'are expected to leave'} Standard in <b>${N.when}</b>${ann ? '' : ', not announced yet'}.</span></div>
    <div class="r29-src">${ann ? `Source: ${link(N.src)}.` : `Pokémon has not announced it yet (${link(N.src)}). ${marks} is next by the yearly pattern: ${N.pattern}.`}
      Legal now: ${ROT29.firstLegal} mark and later. The ${ROT29.last.marks.join(' and ')} mark left on ${ROT29.last.events} at events and ${ROT29.last.live} on Live (${link(ROT29.last.src)}). Checked ${ROT29.asOf}.</div>`;
  if (!ann && N.checkBy && Date.now() > Date.parse(N.checkBy)) h += `<div class="g-item warn"><div class="gt">This may be out of date</div>
    <p>Pokémon usually announces rotation in January. If it has, update the app to see the official date.</p></div>`;

  // "one" marks a count of 1, so translations can use the singular form of the label.
  const tile = (cls, v, t, key) => `<div class="r29-c ${cls}${v === 1 ? ' one' : ''}" data-k="${key}"><b>${v}</b><span>${t}</span></div>`;
  h += `<div class="r29-sum">${tile(k.out ? 'bad' : '', k.out, 'not legal now', 'out')}${tile(k.risk ? 'risk' : '', k.risk, ann ? 'rotate next' : 'may rotate', 'risk')}${k.unconf ? tile('unk', k.unconf, 'not confirmed', 'unconf') : ''}${tile('ok', k.safe, 'safe', 'safe')}</div>`;
  if (k.energy) h += `<div class="r29-tot">Plus ${k.energy} Basic Energy, which never rotate${k.energy === 1 ? 's' : ''}. ${k.out + k.risk + k.unconf + k.safe + k.energy} cards in all.</div>`;

  const name = r => `<div class="r29-n">${esc(r.name)}${r.sub ? `<small>${r.sub}</small>` : ''}</div>`;
  const row = r => `<div class="r29-row"><span class="r29-q">${r.qty}</span>${name(r)}<span class="r29-m">${r.reprint || r.mark || '?'}</span></div>`;
  const sub = r => {
    if (r.reprint && r.st === 'safe') return `Kept legal by a reprint with the ${r.reprint} mark`;
    if (r.pocket) return 'This printing is from Pokemon TCG Pocket, not the card game';
    if (r.st === 'nomark') return 'No mark on this printing in the card database';
    const bits = [];
    if (r.reprint) bits.push(`Newest reprint has the ${r.reprint} mark`);
    else if (!r.checked) bits.push(busy ? 'Checking for reprints' : pending ? 'Reprints not checked yet' : '');
    else bits.push('No reprint with a later mark found');
    if (r.other) bits.push('mark read from another printing');
    return bits.filter(Boolean).join(', ');
  };
  const out = rows.filter(r => r.st === 'out' || r.st === 'nomark'), risk = rows.filter(r => r.st === 'risk');
  out.concat(risk).forEach(r => { r.sub = sub(r); });
  // Long lists show six names, the rest one tap away.
  const list = (title, rs) => `<div class="r29-list"><div class="r29-lh">${title}</div>${rs.slice(0, 6).map(row).join('')}${rs.length > 6
    ? `<details class="g29-more r29-rest"><summary>${rs.length - 6} more</summary>${rs.slice(6).map(row).join('')}</details>` : ''}</div>`;
  if (out.length) h += list('Not Standard legal now', out);
  if (risk.length) h += list(`${ann ? 'Rotate' : 'May rotate'} in ${N.when}`, risk);
  const unk = rows.filter(r => r.st === 'unconf' || r.st === 'unread');
  unk.forEach(r => {
    r.sub = r.st === 'unread' ? 'Could not be read from the card database'
      : r.unlisted ? 'This printing is not in the card database yet, so its mark is not confirmed'
      : r.other && r.pkmn ? 'Mark read from another printing, so not confirmed'
      : !r.checked ? (busy ? 'Checking for reprints' : 'Reprints not checked yet')
      : 'No mark found in the card database';
  });
  if (unk.length) h += list('Not confirmed yet', unk);
  if (!out.length && !risk.length && !unk.length && k.safe) h += `<div class="g-item ok"><div class="gt">Nothing here rotates next</div>
    <p>Every card the database could read has a mark that stays legal after the ${marks} rotation.</p></div>`;
  const safeRows = rows.filter(r => r.st === 'safe');
  if (safeRows.length) {
    safeRows.forEach(r => { r.sub = r.reprint ? `Kept legal by a reprint with the ${r.reprint} mark`
      : r.assumed ? (r.other ? 'Mark read from another printing, so counted as legal' : 'Mark not confirmed in the card database, so counted as legal') : ''; });
    h += `<details class="g29-more"><summary>${safeRows.length} safe card name${safeRows.length > 1 ? 's' : ''}</summary><div class="r29-list">${safeRows.map(row).join('')}</div></details>`;
  }
  if (!busy && pending && _r29Tried.has(deck.id)) h += `<button class="btn btn-sm r29-btn" onclick="r29Retry('${deck.id}')">${ic23('search')}Check reprints again</button>`;
  const notes = [];
  if (k.unconf) notes.push(`A card counts as safe only when its mark is confirmed, so check the ${k.unconf} not confirmed before an event.`);
  notes.push(`A card with an older mark stays legal while a reprint with a legal mark exists (${link(ROT29.rules)}). For a Pokémon, the reprint needs the same name, attacks and Abilities. The marks come from the card database, so check a card you are unsure of before an event.`);
  h += `<div class="r29-note">${notes.join(' ')}</div></div>`;

  let chip = '', chipTone = 'ok';
  const lab = (n, t) => n === 1 ? `<span class="r29-one">${t}</span>` : t;
  if (k.out) { chip = `<b>${k.out}</b> ${lab(k.out, 'not legal now')}`; chipTone = 'crit'; }
  else if (k.risk) { chip = `<b>${k.risk}</b> ${lab(k.risk, ann ? 'rotate next' : 'may rotate')}`; chipTone = 'warn'; }
  else if (k.unconf) { chip = `<b>${k.unconf}</b> ${lab(k.unconf, 'not confirmed')}`; chipTone = 'warn'; }
  else if (k.safe) chip = 'Rotation safe';
  return { chip, chipTone, html: h, counts: k };
}

function r29Retry(id) {
  const deck = state.decks.find(d => d.id === id);
  if (!deck) return;
  _r29Tried.delete(id);
  r29CheckReprints(deck);
  renderGrade();
}

// Home: one line under a deck when something in it rotates or is not legal.
function r29HomeLine(deck) {
  if (deck.format === 'expanded' || !(deck.cards || []).some(c => c.supertype)) return '';
  const rows = r29Rows(deck), k = r29Counts(rows);
  const open = r29NeedsCheck(deck, rows).length;
  if (open && !_r29Busy.has(deck.id) && !_r29Tried.has(deck.id)) setTimeout(() => r29CheckReprints(deck), 0);
  // Until reprints are checked, an old mark may still be legal.
  const upTo = open && rows.some(r => (r.st === 'out' || r.st === 'nomark') && !r.checked && !r.pocket) ? 'Up to ' : '';
  if (k.out) return `<div class="deck-rot crit"><svg class="ic"><use href="#i-alert"/></svg>${upTo}${k.out} card${k.out > 1 ? 's are' : ' is'} not Standard legal now</div>`;
  if (k.risk) return `<div class="deck-rot"><svg class="ic"><use href="#i-calendar"/></svg>${k.risk} card${k.risk > 1 ? 's' : ''} ${ROT29.next.announced ? 'rotate' : 'expected to rotate'} in ${ROT29.next.when}</div>`;
  if (k.unconf && !open) return `<div class="deck-rot"><svg class="ic"><use href="#i-alert"/></svg>${k.unconf} card${k.unconf > 1 ? 's' : ''} not confirmed Standard legal</div>`;
  return '';
}

// ═══════════ v29: the grade comes first, and reads at a glance ═══════════
// The score and every finding come from the same grader as before. What
// changes is how it is shown: one sentence that says what the score means,
// Synergy and Power in plain words, the three problems that cost the most
// first, and the rest folded away until you want it.

const G29_BANDS = [
  [8.5, 'Ready for an event as it is.'],
  [7, 'A good list with a few things to tighten.'],
  [5, 'The plan works, but problems will cost you games.'],
  [3, 'Several problems stop it from working reliably.'],
  [0, 'It cannot carry out its plan yet.'],
];
const G29_SHOW = 3;

// Grading a list is quick, but home grades every deck, so keep the last answer.
const _g29Cache = new Map();
function g29Sig(deck) {
  // 2.6.2: the Main attacker pick is part of what the grade read.
  return (deck.enrichVer || 0) + '|' + (typeof deck.atk === 'string' ? deck.atk : '') + '|' + ((deck.coverage && deck.coverage.resolved) || 0) + '|' +
    (deck.cards || []).map(c => c.count + 'x' + c.name + ':' + (c.supertype || '') + ':' + (c.stage || '')).join('|');
}
function g29Grade(deck) {
  if (!deck || !(deck.cards || []).some(c => c.supertype)) return null;
  const sig = g29Sig(deck);
  const hit = _g29Cache.get(deck.id);
  if (hit && hit.sig === sig) return hit.R;
  let R = null;
  try { R = gradeDeck(deck); } catch (_) { R = null; }
  _g29Cache.set(deck.id, { sig, R });
  return R;
}

function g29Problems(R) {
  const all = R.coh.flaws.concat(R.via.findings.filter(f => f.sev !== 'ok'));
  return all.map((f, i) => ({ f, i })).sort((a, b) => ((a.f.sev === 'crit' ? 0 : 1) - (b.f.sev === 'crit' ? 0 : 1)) || (a.i - b.i)).map(x => x.f);
}

// One plain sentence or two: what the score means and what to do about it.
function g29Verdict(R, means) {
  const probs = g29Problems(R);
  const crit = probs.filter(f => f.sev === 'crit').length;
  if (crit) return crit === 1 ? 'One problem stops this deck from working. Fix it first.' : `${crit} problems stop this deck from working. Fix those first.`;
  // 2.5.2: says what Fix first holds, not that one card change helps, so it agrees with Upgrades.
  if (probs.length) return means + ' ' + (probs.length === 1 ? 'Fix first shows the one problem found.' : `Fix first shows the ${probs.length} problems found.`);
  // v60: a card the app could not read is left out of the grade, so "no problems" would overstate it.
  const un = (R.entries || []).filter(e => !e.card).length;
  if (un) return means + ` No problems found in what was read, but ${un === 1 ? 'one card was' : un + ' cards were'} not, so check ${un === 1 ? 'its' : 'their'} spelling in Edit deck.`;
  return means + ' No problems found.';
}

// v57: the verdict for a list that breaks a deck building rule.
function g29Legal(R, n) {
  const probs = g29Problems(R), crit = probs.filter(f => f.sev === 'crit').length;
  return `Fix the deck ${n === 1 ? 'rule' : 'rules'} above before an event. ` + (crit
    ? (crit === 1 ? 'One problem also stops this deck from working.' : `${crit} problems also stop this deck from working.`)
    : probs.length ? (probs.length === 1 ? 'One other change would make it stronger.' : `${probs.length} other changes would make it stronger.`)
    : `The cards themselves grade ${R.overall.toFixed(1)}.`);
}

// v67: why each score is what it is. Every line is read from the same numbers the grader used.
// Synergy starts from 10 and each line says what took points off (or put them back).
function g67SynWhy(R) {
  const P = R.coh.parts, S = R.steps, out = [];
  if (!P || !S) return out;
  const nm = a => a.slice(0, 2).join('; ') + (a.length > 2 ? `; and ${a.length - 2} more` : '');
  let v = 10 * P.base0;
  if (P.total) {
    if (P.met < P.total) out.push({ d: v - 10, t: `${P.met} of ${P.total} card need${P.total === 1 ? '' : 's'} met. Missing: ${nm(P.unmet)}.` });
    else out.push({ d: 0, t: `${P.total === 1 ? 'The one card need is met' : `All ${P.total} card needs are met`}: every attacker has its Energy and every evolution has what it evolves from.` });
  }
  if (P.noDraw) { out.push({ d: -v * 0.6, t: 'No real draw engine, so the score is cut to 40%.' }); v *= 0.4; }
  if (P.noAtk) { out.push({ d: -v * 0.7, t: 'No clear attacker, so the score is cut to 30%.' }); v *= 0.3; }
  if (P.crits.length) { const d = Math.max(-v, -1.2 * P.crits.length), seen = P.crits.filter(t => P.unmet.includes(t)), other = P.crits.filter(t => !P.unmet.includes(t));
    out.push({ d, t: seen.length === P.crits.length
      ? (seen.length === 1 ? 'That one stops the deck, so it costs 1.2 more.' : `Those ${seen.length} stop the deck, so each costs 1.2 more.`)
      : `${P.crits.length === 1 ? 'A problem that stops the deck' : P.crits.length + ' problems that stop the deck'} (1.2 each): ${nm(other.concat(seen))}.` }); }
  const tr = R.coh.trainers, dT = 10 * (S.s1 - S.s0);
  if (tr && Math.abs(dT) >= 0.05) { const t = (tr.flaws || []).filter(f => f.sev !== 'ok').map(f => f.t);
    out.push({ d: dT, t: `Trainers and Special Energy${t.length ? `: ${nm(t)}` : ''}.` }); }
  else if (tr) out.push({ d: 0, t: 'Trainers and Special Energy: nothing missing or dead.' });
  const fo = R.coh.focus, dF = 10 * (S.s2 - S.s1);
  if (fo && Math.abs(dF) >= 0.05) out.push({ d: dF, t: dF < 0
    ? `How tightly the list fits${fo.why.length ? `: ${fo.why.slice(0, 2).join(', and ')}` : ''}.`
    : 'Cards that work together, which the grade found in the list.' });
  return out;
}
// Power is three parts: damage counts half, the prize trade 30% and setup speed 20%.
const G67_PART = [
  ['close', /^(Nothing can reliably attack|Closes through spread|Hits hard enough|Two hits for|Damage ceiling|Low damage, by design|Hard to disrupt|.* walls Pokemon ex|Hits several|Few Energy for|Only .* to hit with|Wins by|Many ways to attack|.* grows into its damage|Some damage is left out)/],
  ['prize', /^(A three-prize|Three-prize attackers|Big attackers|Two prizes per knockout|Mostly two-prize|Efficient prize trade)/],
  ['clock', /^(Evolves the long way|Might be slow|Sets up on time|Draws every turn)/],
];
function g67PowWhy(R) {
  const P = R.via.parts; if (!P) return [];
  const f = R.via.findings, of = k => f.filter(x => (G67_PART.find(([, re]) => re.test(x.t)) || [])[0] === k).map(x => x.t);
  const one = a => a.length ? a.slice(0, 2).join('; ') + '.' : '';
  const sp = P.speed, pc = x => Math.round(100 * x) + '%';
  const clockTxt = sp && sp.used
    ? `${gCap(sp.name)} is in play with ${sp.n === 1 ? 'the 1 Energy' : `the ${sp.n} Energy`} ${sp.atk} needs${sp.board > 1 ? `, with ${sp.board} Pokemon in play,` : ''} by your second turn in ${pc(sp.t2)} of games and by your third in ${pc(sp.t3)}, from shuffles of this list, so it is ${P.clock >= 0.995 ? 'as quick to set up as any list' : 'quick to set up'}.`
    : one(of('clock')) || (P.stage2 ? '' : 'No Stage 2 line to wait on, which is the usual mark for a deck of Basics and Stage 1s.');
  return [
    { k: 'Damage', w: '50%', v: 10 * P.close, t: one(of('close')) || 'How hard the best attacker hits the format\'s biggest threats.' },
    { k: 'Prize trade', w: '30%', v: 10 * P.prize, t: (P.pkN ? (P.multiN ? `${P.multiN >= P.pkN ? `All ${P.pkN}` : `${P.multiN} of your ${P.pkN}`} Pokemon give up 2 or more prizes. ` : 'Every Pokemon gives up one prize. ') : '') + one(of('prize')) },
    { k: 'Setup speed', w: '20%', v: 10 * P.clock, t: clockTxt },
  ];
}
function g67HowLine(R, synV, powV) {
  // v71: the sum uses the numbers the grade used (Synergy after the fit rule, Power with its floor),
  // and shows two decimals when one would make the sum look wrong.
  const S = R.steps, raw = R.rawOverall != null ? R.rawOverall : R.overall;
  const sU = S && S.cohF != null ? S.cohF * 10 : synV, pU = S && S.viaF != null ? S.viaF * 10 : powV;
  const dp = gR1(+sU.toFixed(1) * +pU.toFixed(1) / 10) === raw ? 1 : 2;
  const f = v => v.toFixed(dp);
  const fit = S && Math.abs(gR1(sU) - synV) >= 0.1 && S.cohF !== 0.06;
  let low = '';
  if (S && S.cohF === 0.06) low += ' Synergy under 0.6 counts as 0.6.';
  if (S && S.viaF === 0.12) low += ' Power under 1.2 counts as 1.2.';
  const sum = `${f(sU)} times ${f(pU)}, divided by 10, is ${raw.toFixed(1)}.`;
  // 2.7.3: name both Synergy numbers, so the one the sum uses is not a number seen nowhere else.
  if (fit) return `The grade is Synergy times Power, divided by 10. Synergy shows ${synV.toFixed(1)} after a cut for how tightly the list fits, but that cut lowers the grade only when the fit is loose, so the grade uses Synergy before the cut, ${f(sU)}: ${sum}${low}`;
  return `The grade is Synergy times Power, divided by 10, so the weaker one pulls the whole grade down: ${sum}${low}`;
}
function g67WhyHtml(R, synV, powV) {
  const fmt = d => Math.abs(d) < 0.05 ? '0' : (d > 0 ? '+' : '−') + Math.abs(d).toFixed(1);
  const syn = g67SynWhy(R), pow = g67PowWhy(R);
  let h = '';
  if (syn.length) h += `<details class="g29-fold g67-why"><summary>Why Synergy is ${synV.toFixed(1)}</summary>
    <p>Synergy starts at 10. These took it to ${synV.toFixed(1)}.</p>
    <ul>${syn.map(x => `<li><b class="${x.d <= -0.05 ? 'dn' : x.d >= 0.05 ? 'up' : ''}">${fmt(x.d)}</b><span>${esc(x.t)}</span></li>`).join('')}</ul></details>`;
  if (pow.length) h += `<details class="g29-fold g67-why"><summary>Why Power is ${powV.toFixed(1)}</summary>
    <p>Power is damage (half), the prize trade (30%) and setup speed (20%), each out of 10.</p>
    <ul>${pow.map(x => `<li><b>${x.v.toFixed(1)}</b><span><strong>${x.k}</strong> (${x.w}). ${esc(x.t)}</span></li>`).join('')}</ul></details>`;
  return h;
}

// v70: how each Trainer and Special Energy fits the list. Explains Synergy; it does not change the grade.
function t68Html(R) {
  const tr = R && R.coh && R.coh.trainers;
  if (!tr || (!(tr.fit || []).length && !tr.ace)) return '';
  const tag = f => f ? `<span class="t68-tag ${f}">${GT_LABEL[f]}</span>` : '';
  // 2.8.3: what the card does in this list in particular, from its text and the list's own cards.
  const here = s => s ? `<p class="t68-here"><b>In this deck:</b> ${esc(s)}</p>` : '';
  const swap = s => s ? `<p class="t68-swap">Swap idea: ${s.more ? 'one more ' : ''}${esc(s.name)}, since ${esc(s.why)}.</p>` : '';
  const rows = [];
  if (tr.ace) {
    const a = tr.ace, f = { covers: 'key', fine: 'good', weak: 'weak', dead: 'dead' }[a.fit] || null;
    const nm = String(a.link || '').replace(/^ACE SPEC: /, '');
    rows.push(`<div class="t68-row ace"><div class="t68-h"><span class="t68-n">${esc(nm)}</span><span class="t68-k">ACE SPEC</span>${tag(f)}</div>
      <p>${esc(a.p)}</p>${here(a.here)}</div>`);
  }
  (tr.fit || []).forEach(r => rows.push(`<div class="t68-row"><div class="t68-h"><span class="t68-n">${r.qty} ${esc(r.name)}</span><span class="t68-k">${esc(r.kind)}</span>${tag(r.fit)}</div>
    <p>${esc(r.why)}</p>${here(r.here)}${swap(r.swap)}</div>`));
  const cnt = k => (tr.fit || []).filter(r => r.fit === k).length;
  // v71: a weak or dead ACE SPEC counts too, and swap ideas are promised only where there are some.
  const aceLow = tr.ace && (tr.ace.fit === 'weak' || tr.ace.fit === 'dead') ? 1 : 0;
  const low = cnt('weak') + cnt('dead') + aceLow;
  const swaps = (tr.fit || []).filter(r => r.swap).length;
  return `<details class="g-sec g29-fold" id="t68-sec"><summary><span class="g-sec-t">Trainers</span><span class="g29-n">${rows.length}</span></summary>
    <div class="g-sec-i">How each Trainer and Special Energy fits this list, ACE SPEC first. ${low ? `${low === 1 ? 'One card does' : low + ' cards do'} little here${swaps ? `, with ${swaps === low ? 'a swap idea for each' : 'swap ideas below'}` : ''}.` : 'Every Trainer and Special Energy here works with the list.'} This explains Synergy and does not change the grade.</div>
    ${rows.join('')}</details>`;
}

function g29Item(f, cls) {
  const tag = cls === 'crit' ? '<span class="g29-tag crit">Stops the deck</span>' : cls === 'warn' ? '<span class="g29-tag warn">Worth fixing</span>' : '';
  // 2.5.2: a real space before the tag, so copied text reads "runs Worth fixing", not "runsWorth fixing".
  return `<div class="g-item ${cls}"><div class="gt">${esc(f.t)}${tag ? ' ' + tag : ''}</div><p>${esc(f.d)}</p></div>`;
}

var g29Jump;   // set further down

renderGrade = function () {
  const el = document.getElementById('grade-body');
  const deck = state.decks.find(d => d.id === state.activeDeckId);
  if (!el || !deck) return;

  const anyData = (deck.cards || []).some(c => c.supertype);
  if (!anyData) {
    el.innerHTML = `<div class="g-empty">No card data for this deck yet.<br><br>
      The grade reads each card when a deck is added. Open <b>Edit deck</b> and save it while online
      to read them, then come back.</div>`;
    return;
  }

  const R = g29Grade(deck) || gradeDeck(deck);
  let [band, col] = gBand(R.overall);
  // v57: a list that breaks a deck building rule is never called ready for an event.
  const brk = typeof rules34Breaches === 'function' ? rules34Breaches(deck) : [];
  if (brk.length) band = 'Not legal yet';
  const synV = gR1(R.coh.score * 10), powV = gR1(R.via.score * 10);
  const means = (G29_BANDS.find(b => R.overall >= b[0]) || G29_BANDS[G29_BANDS.length - 1])[1];
  const probs = g29Problems(R);
  const good = R.via.findings.filter(f => f.sev === 'ok');
  const syn = R.coh.synergies;
  const plays = (R.plan || []).concat(syn);   // v53: the main attacker and support roles lead How it plays
  const rot = typeof r29Summary === 'function' ? r29Summary(deck) : null;

  let weak = '';
  if (Math.abs(synV - powV) >= 1) weak = synV < powV
    ? ' Right now <b>Synergy</b> is what holds it back.'
    : ' Right now <b>Power</b> is what holds it back.';
  const part = (lbl, v, sub) => `<div class="g29-part"><div class="g29-pl">${lbl}</div>
      <div class="g29-pv" style="color:${gBand(v)[1]}">${v.toFixed(1)}</div>
      <div class="g-meter"><span style="width:${Math.max(0, Math.min(100, v * 10))}%;background:${gBand(v)[1]}"></span></div>
      <div class="g29-ps">${sub}</div></div>`;

  const jumps = [];
  if (probs.length) jumps.push(`<button class="g29-jump-b ${probs.some(f => f.sev === 'crit') ? 'crit' : 'warn'}" onclick="g29Jump('g29-fix')"><b>${probs.length}</b> to fix</button>`);
  if (rot && rot.chip) jumps.push(`<button class="g29-jump-b ${rot.chipTone}" onclick="g29Jump('r29-sec')">${rot.chip}</button>`);
  if (good.length) jumps.push(`<button class="g29-jump-b ok" onclick="g29Jump('g29-good')"><b>${good.length}</b> working well</button>`);
  if (plays.length) jumps.push(`<button class="g29-jump-b syn" onclick="g29Jump('g29-syn')">How it plays</button>`);

  let h = `<div class="g-hero g29-hero">
    <div class="g-ring" style="--p:${Math.max(0, Math.min(100, R.overall * 10))};--col:${col}">
      <div class="g-score" style="color:${col}">${R.overall.toFixed(1)}<small>/10</small></div>
    </div>
    <div class="g-band" style="--col:${brk.length ? 'var(--red)' : col}">${band}</div>
    <p class="g29-verdict">${esc(brk.length ? g29Legal(R, brk.length) : g29Verdict(R, means))}</p>
    ${jumps.length ? `<div class="g29-jump">${jumps.join('')}</div>` : ''}
    <div class="g29-parts">
      ${part('Synergy', synV, 'Do the cards work together')}
      ${part('Power', powV, 'Can it win a game')}
    </div>
    <div class="g29-how">${g67HowLine(R, synV, powV)}${weak}${R.rawOverall != null ? ` It is held at ${R.overall.toFixed(1)} because some cards are not Standard legal now.` : ''}</div>
    ${g67WhyHtml(R, synV, powV)}
    <div class="g45-share"><button class="btn btn-sm" onclick="v45ShareGrade()">${ic23('share')}Share grade</button></div>
  </div>`;

  if (R.unread > 0) h += `<div class="g-sec"><div class="g-item warn">
    <div class="gt">${R.unread} card${R.unread > 1 ? 's' : ''} not read</div>
    <p>These could not be looked up, so they count for nothing in the grade.
    Opening the deck again while online tries again.</p></div></div>`;

  if (probs.length) {
    const top = probs.slice(0, G29_SHOW), rest = probs.slice(G29_SHOW);
    h += `<div class="g-sec" id="g29-fix"><div class="g-sec-t">Fix first</div>
      <div class="g-sec-i">${top.length === 1 ? 'The problem that costs you the most.' : `The ${top.length} problems that cost you the most, worst first.`}</div>
      ${top.map(f => g29Item(f, f.sev)).join('')}
      ${rest.length ? `<details class="g29-more"><summary>${rest.length} more to fix</summary>${rest.map(f => g29Item(f, f.sev)).join('')}</details>` : ''}
    </div>`;
  } else {
    h += `<div class="g-sec" id="g29-fix"><div class="g-item ok"><div class="gt">${brk.length ? 'Nothing else to fix' : 'Nothing to fix'}</div>
      <p>${brk.length ? 'Apart from the deck rules above, the grader found no problem in this list.' : 'The grader found no problem in this list.'} Check the odds and the rotation below before an event.</p></div></div>`;
  }

  if (rot) h += rot.html;

  if (good.length) h += `<details class="g-sec g29-fold" id="g29-good"><summary><span class="g-sec-t">Working well</span><span class="g29-n">${good.length}</span></summary>
    ${good.map(f => g29Item(f, 'ok')).join('')}</details>`;

  if (plays.length) h += `<details class="g-sec g29-fold" id="g29-syn"><summary><span class="g-sec-t">How it plays</span><span class="g29-n">${plays.length}</span></summary>
    <div class="g-sec-i">${(R.plan || []).length ? 'The main attacker and the combos' : 'Combos'} the grader found between your own cards. This is what the deck is trying to do.</div>
    ${plays.map(s => `<div class="g-item syn"><div class="gt">${esc(s.link)}</div><p>${esc(s.p)}</p></div>`).join('')}</details>`;

  h += t68Html(R);

  h += `<details class="g-sec g29-fold" id="g29-about"><summary><span class="g-sec-t">How the grade works</span></summary>
    <div class="g29-scale">
      <div><b>8.5 to 10</b>Tournament-ready</div><div><b>7 to 8.4</b>Strong</div><div><b>5 to 6.9</b>Fixable</div>
      <div><b>3 to 4.9</b>Needs work</div><div><b>under 3</b>Does not function</div>
    </div>
    <p class="g29-about-p"><b>Synergy</b> checks that your cards support each other: every attacker can pay for its attacks,
    evolutions have what they evolve from, and the deck can draw and search. <b>Power</b> checks that the plan can win:
    how hard it hits against the format's biggest Pokemon, how many prizes it gives up, and how fast it sets up.</p>
    <p class="g29-about-p">The card grade is Synergy times Power, divided by 10. How tightly the list fits together lowers Synergy in full,
    but lowers the grade only when the fit is loose. When your deck matches an archetype from recent online tournaments, part of the
    grade comes from that archetype's win rate and finishes: more of it the more games there are, up to half at 500 games, and none while cards are
    not Standard legal. The sentence under the grade shows how much. Card roles are read from card text, which is usually right and
    sometimes not. Read the findings and do not worry about the decimal place.</p></details>`;

  el.innerHTML = h;
};

// ═══════════ v29: grade first, practice as one of the tools ═══════════
// Tapping a deck opens its grade. The prize game is still one tap on the
// play button, and Practice keeps hands, drills and notes.

// Opening a deck lands on the Grade tab.
const _v28OpenReview = openReview;
openReview = function (deckId) {
  const r = _v28OpenReview.apply(this, arguments);
  if (state.activeDeckId === deckId && document.getElementById('screen-review').classList.contains('active')) showReviewTab('grade');
  return r;
};

// Each deck on home shows its grade, and its rotation news when there is any.
const _v28BuildDeckCard = buildDeckCard;
buildDeckCard = function (deck) {
  let h = _v28BuildDeckCard.apply(this, arguments);
  const id = deck.id;
  h = h.replace(`<div class="deck-card${deck.hidden ? ' deck-hidden' : ''}" onclick="startGameDefault('${id}')">`,
    `<div class="deck-card${deck.hidden ? ' deck-hidden' : ''}" onclick="openReview('${id}')">`);
  h = h.replace(`title="Play" aria-label="Play ${esc(deck.name)}"`, `title="Prize game" aria-label="Prize game with ${esc(deck.name)}"`);
  h = h.replace('<span>Avg <b>', '<span>Prize avg <b>');
  h = h.replace('title="Cards, grade and odds"><svg class="ic"><use href="#i-grid"/></svg><span>Deck</span>', 'title="Grade, odds and cards"><svg class="ic"><use href="#i-award"/></svg><span>Grade</span>');
  h = h.replace(/(\d+) session(s?)<\/span>/, (m, n, pl) => `${n} prize game${pl}</span>`);
  // v71: no number until the card data, the legality check and the results have all loaded.
  const wait = typeof g71Wait === 'function' ? g71Wait(deck) : '';
  const R = wait ? null : g29Grade(deck);
  let g;
  if (wait) {
    g = `<div class="deck-grade none g71-wait"><span>Grading\u2026</span></div>`;
    if (typeof g71Kick === 'function') setTimeout(() => g71Kick(deck), 0);
  } else if (R) {
    let [band, col] = gBand(R.overall);
    if (typeof rules34Breaches === 'function' && rules34Breaches(deck).length) { band = 'Not legal yet'; col = 'var(--red)'; }
    // 3.2.7: a grade read from part of the list is marked, not shown as final.
    else if (typeof g71NotFinal === 'function' && g71NotFinal(deck, R)) { band = 'Not final'; col = 'var(--text-3)'; }
    g = `<div class="deck-grade" style="--col:${col}"><b>${R.overall.toFixed(1)}</b><span>${band}</span></div>`;
  } else {
    g = `<div class="deck-grade none"><span>Not graded yet</span></div>`;
  }
  const nameEnd = h.indexOf('</div>', h.indexOf('class="deck-name"'));
  if (nameEnd > 0) h = h.slice(0, nameEnd + 6) + g + h.slice(nameEnd + 6);
  const rl = typeof r29HomeLine === 'function' ? r29HomeLine(deck) : '';
  if (rl) {
    const at = h.indexOf('<div class="deck-actions-col">');
    if (at > 0) h = h.slice(0, at) + rl + h.slice(at);
  }
  return h;
};

// Home says what the app is for now.
(function () {
  const sub = document.querySelector('#screen-home .app-subtitle');
  if (sub) sub.textContent = 'Can Your Deck Win?';
  // Tabs: Grade first.
  const tabs = document.querySelector('.review-tabs');
  const order = ['grade', 'odds', 'cards', 'practice'];
  if (tabs) order.forEach(k => { const b = document.getElementById('rv-tab-' + k); if (b) tabs.appendChild(b); });
  const play = document.querySelector('#screen-review .play-btn');
  if (play) { play.innerHTML = '<svg class="ic"><use href="#i-play"/></svg>Prize game'; play.setAttribute('aria-label', 'Start a prize game with this deck'); }
  const md = document.querySelector('meta[name="description"]');
  if (md) md.setAttribute('content', 'Grade your Pokémon TCG deck, check its odds and rotation, then practice prizes, hands and drills. Free, works offline, no account.');
})();

const _v28HomeEmpty = renderHome;
renderHome = function () {
  _v28HomeEmpty.apply(this, arguments);
  if (state.decks.length === 0) {
    const list = document.getElementById('deck-list');
    if (list) list.innerHTML = `<div class="empty-state st-empty">
      <div class="tour-ic">${ic23('award')}</div>
      <b>Start by grading a deck</b>
      <span>Add a deck to see its grade, what to fix first, its odds and which cards rotate. Then practice it with prize games, hands and drills.</span></div>`;
  }
};

// Session count in the header is about prize games.
const _v28Header = updateHeaderStats;
updateHeaderStats = function () {
  _v28Header.apply(this, arguments);
  const el = document.getElementById('header-stats');
  if (el) el.innerHTML = el.innerHTML.replace(/ session(s?) played/, ' prize game$1 played');
};

// First run tour, new order: the grade first.
TOUR_STEPS.splice(0, TOUR_STEPS.length,
  { ic: 'award', t: 'Welcome to RdyDeck', s: 'Grade any Pokémon TCG deck: how well the cards work together, whether it can win, and what to fix first. Then practice it.' },
  { ic: 'plus', t: 'Add a deck', s: 'Paste a list from Pokémon TCG Live or Limitless, or load one of the starter decks from recent Regionals in one tap.' },
  { ic: 'award', t: 'Read the grade', s: 'Tap a deck to open its grade. Fix first lists what costs you the most, and Rotation shows which cards leave Standard next.' },
  { ic: 'chart', t: 'Check the odds', s: 'Odds answers your own question, like Arven and a Ball by turn 2, and shows your opening Basics.' },
  { ic: 'target', t: 'Practice', s: 'Prizes on a deck starts a prize game: six cards go face down and you name them. The Hand, Drills and Notes tabs hold opening hands, goldfish turns, drills and matchup notes.' },
  { ic: 'calendar', t: 'Come back daily', s: 'The daily challenge is the same shuffle for everyone. Log your matches in the tournament log. Help on the home screen replays this tour.' }
);

// People who already know the app hear about the change once.
document.addEventListener('DOMContentLoaded', () => setTimeout(() => {
  if (safeLocalGet('pt_v29_seen')) return;
  if (!safeLocalGet(TOUR_KEY) || !state.decks.length) { safeLocalSet('pt_v29_seen', '1'); return; }
  if (!document.getElementById('screen-home').classList.contains('active') || document.querySelector('.modal-overlay.active')) return;
  safeLocalSet('pt_v29_seen', '1');
  showToast('Tapping a deck now opens its grade. Prizes on the deck starts a prize game.');
}, 1300));

