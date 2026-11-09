// Weekly card check for RdyDeck. Run by .github/workflows/refresh-data.yml after the data refresh.
//
// Why: the app shows card facts from two free databases, pokemontcg.io (pokemon-tcg-data)
// and TCGdex. Both have gaps and mistakes, mostly in the newest sets. This script compares
// them card by card for every card in the starter decks and every card in the two newest
// sets, and writes what it finds to card-check.md.
//
// What it changes in data.json, and only this:
// - cardFixes: what a Stage 1 or Stage 2 evolves from, when TCGdex leaves it out and every
//   other print of the same card agrees; a regulation mark, when TCGdex has none and
//   pokemon-tcg-data has one for the same card.
// - setMarks: one mark for a whole set, when TCGdex has no marks for it and pokemon-tcg-data
//   gives every card in the set the same mark.
// Anything else that disagrees is listed in card-check.md for a person to check against the
// printed card. Fixes written by hand in index.html (FIX37) are never touched.
//
// Politeness: one request at a time with a pause, a hard request budget, and a 429 answer
// stops the run. A failed run leaves data.json alone and still writes the report.
import { readFile, writeFile } from 'node:fs/promises';

const FILE = process.argv[2] || 'data.json';
const REPORT = process.argv[3] || 'card-check.md';
const APP = process.argv[4] || 'index.html';
const UA = 'RdyDeck-card-check/1.0 (+https://optumesto.github.io/PrizeTrainer/)';
const TCGDEX = process.env.CC_TCGDEX || 'https://api.tcgdex.net/v2/en';   // overridable only for local tests
const PTCG = process.env.CC_PTCG || 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master';
const BUDGET = 700;
const PAUSE = process.env.PT_NO_PAUSE ? 0 : 300;

const sleep = ms => new Promise(r => setTimeout(r, ms));
let calls = 0;
async function getJSON(url) {
  if (++calls > BUDGET) throw new Error('request budget used up');
  if (PAUSE) await sleep(PAUSE);
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (r.status === 429) throw new Error('rate limited by ' + new URL(url).host);
  if (!r.ok) return null;
  return r.json();
}

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
const num = s => String(s || '').replace(/^0+(?=\d)/, '').toUpperCase();
const dmg = s => { const m = String(s == null ? '' : s).match(/\d+/); return m ? Number(m[0]) : 0; };
const species = n => String(n || '').replace(/^Mega /, '').replace(/ ex$/, '').trim();

/** The hand-written fixes in index.html, read as text (never run): ids, stage, evolves from, set marks. */
async function appFixes() {
  const fx = new Map(), sets = {};
  let problem = '';
  try {
    const html = await readFile(APP, 'utf8');
    const block = html.slice(html.indexOf('const FIX37 = {'), html.indexOf('const FIX37_SET_MARKS'));
    for (const m of block.matchAll(/'([a-z0-9.]{2,12}-[A-Za-z0-9]{1,8})'\s*:\s*\{([^}]*)\}/g)) {
      const f = {};
      for (const kv of m[2].matchAll(/(\w+)\s*:\s*'([^']*)'/g)) f[kv[1]] = kv[2].replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
      fx.set(m[1], f);
    }
    const sm = html.slice(html.indexOf('const FIX37_SET_MARKS'), html.indexOf('const FIX37_SET_MARKS') + 300).match(/\{([^}]*)\}/);
    if (sm) for (const kv of sm[1].matchAll(/'([a-z0-9.]{2,12})'\s*:\s*'([A-Z])'/g)) sets[kv[1]] = kv[2];
    if (html.indexOf('const FIX37 = {') < 0 || html.indexOf('const FIX37_SET_MARKS') < 0) problem = 'the FIX37 block was not found in index.html';
    else if (!fx.size) problem = 'no card fixes could be read from the FIX37 block';
  } catch (e) { problem = 'index.html could not be read: ' + e.message; }
  // Say so loudly: a silent empty list would make every fixed card look wrong.
  if (problem) { console.error('App fixes: ' + problem); process.exitCode = 1; }
  return { fx, sets, problem };
}

/** Card lines from a deck list: count, name, set code, number. */
function listCards(text) {
  const out = [];
  for (const line of String(text || '').split('\n')) {
    const m = line.trim().match(/^(\d+)\s+(.+?)\s+([A-Z0-9]{2,5})\s+([A-Za-z0-9]{1,8})$/);
    if (m) out.push({ n: Number(m[1]), name: m[2], code: m[3], no: m[4] });
  }
  return out;
}

/** One card from TCGdex, in the fields both sources share. */
function fromTd(t) {
  const special = t.category === 'Energy' && !/^(basic )?(grass|fire|water|lightning|psychic|fighting|darkness|metal|fairy) energy$/i.test(t.name || '');
  return {
    name: t.name, cat: String(t.category || '').toLowerCase().replace('é', 'e'), hp: Number(t.hp) || 0,
    stage: t.category === 'Pokemon' ? String(t.stage || '').replace(/\s/g, '') : '', from: t.evolveFrom || '',
    mark: t.regulationMark || '', special,
    ace: /ace spec/i.test(t.rarity || '') || /ace spec/i.test(t.trainerType || ''),
    attacks: (t.attacks || []).map(a => ({ name: a.name, dmg: dmg(a.damage), cost: (a.cost || []).length })),
    abilities: (t.abilities || []).map(a => a.name),
  };
}
/** The same fields from pokemon-tcg-data. */
function fromPt(c) {
  const sub = c.subtypes || [];
  const stage = sub.includes('Stage 2') ? 'Stage2' : sub.includes('Stage 1') ? 'Stage1' : sub.includes('Basic') ? 'Basic' : '';
  return {
    name: c.name, cat: norm(c.supertype).replace('pokemon', 'pokemon'), hp: Number(c.hp) || 0,
    stage: norm(c.supertype) === 'pokemon' ? stage : '', from: c.evolvesFrom || '', mark: c.regulationMark || '',
    special: norm(c.supertype) === 'energy' && !sub.includes('Basic'), ace: sub.includes('ACE SPEC'),
    attacks: (c.attacks || []).map(a => ({ name: a.name, dmg: dmg(a.damage), cost: (a.cost || []).filter(x => x !== 'Free').length })),
    abilities: (c.abilities || []).map(a => a.name),
  };
}

/** Where the two sources disagree, as short plain lines. */
function compare(td, pt) {
  const d = [];
  if (norm(td.name) !== norm(pt.name)) return [`names differ (TCGdex "${td.name}", pokemon-tcg-data "${pt.name}"), so the numbers may not line up`];
  if (td.hp !== pt.hp) d.push(`HP ${td.hp} on TCGdex, ${pt.hp} on pokemon-tcg-data`);
  if (td.stage && pt.stage && td.stage !== pt.stage) d.push(`stage ${td.stage} on TCGdex, ${pt.stage} on pokemon-tcg-data`);
  if (td.from && pt.from && norm(td.from) !== norm(pt.from)) d.push(`evolves from ${td.from} on TCGdex, ${pt.from} on pokemon-tcg-data`);
  if (td.mark && pt.mark && td.mark !== pt.mark) d.push(`mark ${td.mark} on TCGdex, ${pt.mark} on pokemon-tcg-data` + (td.mark === 'G' && pt.mark === 'H' ? ' (pokemon-tcg-data has listed G cards as H before)' : ''));
  if (td.special !== pt.special) d.push(`Special Energy ${td.special ? 'yes' : 'no'} on TCGdex, ${pt.special ? 'yes' : 'no'} on pokemon-tcg-data`);
  if (td.ace !== pt.ace) d.push(`ACE SPEC ${td.ace ? 'yes' : 'no'} on TCGdex, ${pt.ace ? 'yes' : 'no'} on pokemon-tcg-data`);
  const tn = td.attacks.map(a => norm(a.name)).join('|'), pn = pt.attacks.map(a => norm(a.name)).join('|');
  if (tn !== pn) d.push(`attacks differ (TCGdex: ${td.attacks.map(a => a.name).join(', ') || 'none'}; pokemon-tcg-data: ${pt.attacks.map(a => a.name).join(', ') || 'none'})`);
  else td.attacks.forEach((a, i) => {
    const b = pt.attacks[i];
    if (a.dmg !== b.dmg) d.push(`${a.name} does ${a.dmg} on TCGdex, ${b.dmg} on pokemon-tcg-data`);
    if (a.cost !== b.cost) d.push(`${a.name} costs ${a.cost} Energy on TCGdex, ${b.cost} on pokemon-tcg-data`);
  });
  const ta = td.abilities.map(norm).join('|'), pa = pt.abilities.map(norm).join('|');
  if (ta !== pa) d.push(`Abilities differ (TCGdex: ${td.abilities.join(', ') || 'none'}; pokemon-tcg-data: ${pt.abilities.join(', ') || 'none'})`);
  return d;
}

/** Deck rules for a starter list: 60 cards, 4 of a name, 1 ACE SPEC. */
function listRules(cards, info) {
  const out = [];
  const total = cards.reduce((a, c) => a + c.n, 0);
  if (total !== 60) out.push(`${total} cards, not 60`);
  const byName = new Map();
  cards.forEach(c => { const i = info.get(c.code + ' ' + num(c.no)); if (i && i.cat === 'energy' && !i.special) return;
    byName.set(norm(c.name), (byName.get(norm(c.name)) || 0) + c.n); });
  byName.forEach((n, k) => { if (n > 4) out.push(`${n} copies of ${k}`); });
  const ace = cards.filter(c => { const i = info.get(c.code + ' ' + num(c.no)); return i && i.ace; }).reduce((a, c) => a + c.n, 0);
  if (ace > 1) out.push(`${ace} ACE SPEC cards`);
  return out;
}

async function run(data, hand) {
  const fixedByHand = hand.fx;
  const report = { handOk: 0, handDiff: [], fixedDiffs: [], seen: {}, checked: 0, agree: 0, diffs: [], gaps: [], fills: {}, setMarks: {}, rules: [], notes: [] };
  if (hand.problem) report.notes.push('App fixes not read: ' + hand.problem + '. Cards fixed by hand may show as disagreeing.');

  // Set codes to ids in both sources.
  const ptSets = await getJSON(`${PTCG}/sets/en.json`);
  const tdSets = await getJSON(`${TCGDEX}/sets`);
  if (!Array.isArray(ptSets) || !Array.isArray(tdSets)) throw new Error('could not read the set lists');
  const tdByName = new Map(tdSets.map(s => [norm(s.name), s.id]));
  const codeToTd = { ...(data.sets || {}) };
  const codeToPt = {};
  for (const s of ptSets) {
    const code = String(s.ptcgoCode || '').toUpperCase();
    if (!code) continue;
    codeToPt[code] = s.id;
    if (!codeToTd[code] && tdByName.has(norm(s.name))) codeToTd[code] = tdByName.get(norm(s.name));
    else if (!codeToTd[code] && tdSets.some(t => t.id === s.id)) codeToTd[code] = s.id;
  }

  // Which cards: every starter card, plus every card in the two newest sets.
  const want = new Map();   // "CODE NUM" -> code, number
  (data.starters || []).forEach(s => listCards(s.list).forEach(c => want.set(c.code + ' ' + num(c.no), { code: c.code, no: num(c.no) })));
  const rank = id => { const m = String(id).match(/^(me|sv)(\d+)(?:\.(\d))?$/); return m ? (m[1] === 'me' ? 1000 : 0) + parseInt(m[2], 10) * 10 + (m[3] ? 5 : 0) : -1; };
  const newest = Object.entries(codeToTd).filter(([, id]) => rank(id) >= 0).sort((a, b) => rank(b[1]) - rank(a[1])).slice(0, 2);

  const tdSetCache = new Map(), ptSetCache = new Map();
  const tdSet = async id => { if (!tdSetCache.has(id)) tdSetCache.set(id, await getJSON(`${TCGDEX}/sets/${encodeURIComponent(id)}`)); return tdSetCache.get(id); };
  const ptSet = async id => { if (!id) return null; if (!ptSetCache.has(id)) ptSetCache.set(id, await getJSON(`${PTCG}/cards/en/${encodeURIComponent(id)}.json`)); return ptSetCache.get(id); };

  for (const [code, id] of newest) {
    const s = await tdSet(id);
    (s && s.cards || []).forEach(c => want.set(code + ' ' + num(c.localId), { code, no: num(c.localId) }));
  }

  const info = new Map();
  const tdCards = [];
  for (const [key, w] of want) {
    const tid = codeToTd[w.code];
    if (!tid) { report.notes.push(`${key}: no TCGdex set for ${w.code}`); continue; }
    const s = await tdSet(tid);
    const brief = s && (s.cards || []).find(c => num(c.localId) === w.no);
    if (!brief) { report.notes.push(`${key}: not on TCGdex yet`); continue; }
    const t = await getJSON(`${TCGDEX}/cards/${encodeURIComponent(brief.id)}`);
    if (!t) { report.notes.push(`${key}: TCGdex card ${brief.id} did not load`); continue; }
    const td = fromTd(t);
    info.set(key, td);
    tdCards.push({ key, id: t.id, set: tid, td });
    report.seen[t.id] = { mark: !!td.mark, from: !!td.from };
    report.checked++;

    const pts = await ptSet(codeToPt[w.code]);
    const pc = Array.isArray(pts) ? pts.find(c => num(c.number) === w.no) : null;
    if (!pc) continue;
    const pt = fromPt(pc);
    const d = compare(td, pt);
    const hf = fixedByHand.get(t.id);
    if (hf && (hf.stage || hf.from)) {
      const agrees = (!hf.stage || hf.stage === pt.stage) && (!hf.from || norm(hf.from) === norm(pt.from));
      if (agrees) report.handOk++; else report.handDiff.push(`${key} ${td.name} (${t.id}): fixed by hand as ${hf.stage || td.stage} from ${hf.from || td.from || 'nothing'}, pokemon-tcg-data says ${pt.stage} from ${pt.from || 'nothing'}`);
    }
    if (!d.length) report.agree++;
    else if (hf) report.fixedDiffs.push(t.id);
    else report.diffs.push({ key, id: t.id, name: td.name, d });
    // TCGdex says Basic, pokemon-tcg-data prints a stage and what it evolves from: the app's main source wins.
    if (!hf && td.stage === 'Basic' && (pt.stage === 'Stage1' || pt.stage === 'Stage2') && pt.from && norm(td.name) === norm(pt.name))
      report.fills[t.id] = { ...(report.fills[t.id] || {}), stage: pt.stage, from: pt.from };
    // A mark TCGdex leaves out, from pokemon-tcg-data for the same card.
    if (!td.mark && pt.mark && norm(td.name) === norm(pt.name) && !fixedByHand.has(t.id)) report.fills[t.id] = { ...(report.fills[t.id] || {}), mark: pt.mark };
  }

  // What a Stage 1 or Stage 2 evolves from, when TCGdex leaves it out: only when other prints agree.
  // A Basic Pokemon ex whose plain prints are Stage 1 or 2 is listed for a person to check
  // (some, like Bloodmoon Ursaluna ex, really are Basic).
  const lookups = new Map();
  const prints = async name => {
    if (!lookups.has(name)) {
      const list = await getJSON(`${TCGDEX}/cards?name=eq:${encodeURIComponent(name)}`);
      const ids = (Array.isArray(list) ? list : []).slice(0, 4).map(c => c.id);
      const full = [];
      for (const id of ids) { const c = await getJSON(`${TCGDEX}/cards/${encodeURIComponent(id)}`); if (c) full.push(fromTd(c)); }
      lookups.set(name, full);
    }
    return lookups.get(name);
  };
  for (const c of tdCards) {
    const td = c.td;
    if (td.cat !== 'pokemon') continue;
    if ((td.stage === 'Stage1' || td.stage === 'Stage2') && !td.from && !fixedByHand.has(c.id)) {
      const others = (await prints(td.name)).filter(o => o.stage === td.stage && o.from);
      const froms = [...new Set(others.map(o => o.from))];
      if (froms.length === 1) report.fills[c.id] = { ...(report.fills[c.id] || {}), from: froms[0] };
      else report.gaps.push(`${c.key} ${td.name}: ${td.stage} with nothing to evolve from on TCGdex, and other prints do not settle it`);
    }
    if (td.stage === 'Basic' && / ex$/.test(td.name) && !fixedByHand.has(c.id)) {
      const plain = (await prints(species(td.name))).filter(o => o.stage === 'Stage1' || o.stage === 'Stage2');
      if (plain.length) report.gaps.push(`${c.key} ${td.name}: Basic on TCGdex, but ${species(td.name)} is ${plain[0].stage} on other cards. Check the printed card.`);
    }
  }

  // Whole sets with no marks on TCGdex.
  const bySet = new Map();
  tdCards.forEach(c => { const s = bySet.get(c.set) || { n: 0, none: 0 }; s.n++; if (!c.td.mark) s.none++; bySet.set(c.set, s); });
  for (const [set, s] of bySet) {
    if (s.n < 5 || s.none / s.n < 0.8) continue;
    const code = Object.keys(codeToTd).find(k => codeToTd[k] === set);
    const pts = await ptSet(codeToPt[code]);
    const marks = Array.isArray(pts) ? pts.map(c => c.regulationMark).filter(Boolean) : [];
    const top = marks.length ? [...marks.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1])[0] : null;
    if (top && top[1] / marks.length >= 0.9) report.setMarks[set] = top[0];
    else report.gaps.push(`${code || set}: TCGdex has no regulation marks for this set and pokemon-tcg-data does not settle it. Add it to FIX37_SET_MARKS in index.html by hand.`);
  }

  for (const [id, v] of Object.entries(report.fills)) {
    const set = id.split('-')[0], sm = report.setMarks[set] || hand.sets[set] || (data.setMarks || {})[set];
    if (v.mark && v.mark === sm) { delete v.mark; if (!Object.keys(v).length) delete report.fills[id]; }
  }
  Object.keys(report.setMarks).forEach(k => { if (hand.sets[k] === report.setMarks[k]) delete report.setMarks[k]; });
  (data.starters || []).forEach(s => { const r = listRules(listCards(s.list), info); if (r.length) report.rules.push(`${s.name}: ${r.join('; ')}`); });
  return report;
}

function md(r, err) {
  const L = ['# Weekly card check', '', `Run ${new Date().toISOString().slice(0, 10)}. ${calls} requests.`, ''];
  if (err) L.push(`The check stopped early: ${err}. data.json was left as it was.`, '');
  if (r) {
    L.push(`${r.checked} cards checked on TCGdex. ${r.agree} match pokemon-tcg-data exactly. ${r.diffs.length} disagree.`, '');
    L.push('## Fixes written to data.json', '');
    const f = Object.entries(r.fills);
    if (!f.length && !Object.keys(r.setMarks).length) L.push('None this week.');
    f.forEach(([id, v]) => L.push(`- ${id}: ${Object.entries(v).map(([k, x]) => k + ' ' + x).join(', ')}`));
    Object.entries(r.setMarks).forEach(([s, m]) => L.push(`- whole set ${s}: mark ${m}`));
    L.push('', '## Fixes already in the app', '');
    L.push(`${r.handOk} hand fixes for stage or evolves from match pokemon-tcg-data. ${r.fixedDiffs.length} cards where the sources disagree are already fixed in the app.`);
    r.handDiff.forEach(x => L.push(`- Hand fix disagrees: ${x}`));
    L.push('', '## Needs a person to check the printed card', '');
    if (!r.gaps.length && !r.diffs.length && !r.rules.length) L.push('Nothing.');
    r.rules.forEach(x => L.push(`- Starter deck rule: ${x}`));
    r.gaps.forEach(x => L.push(`- ${x}`));
    r.diffs.forEach(x => L.push(`- ${x.key} ${x.name} (${x.id}): ${x.d.join('; ')}`));
    if (r.notes.length) { L.push('', '## Not checked', ''); r.notes.forEach(x => L.push(`- ${x}`)); }
  }
  return L.join('\n') + '\n';
}

const data = JSON.parse(await readFile(FILE, 'utf8'));
if (data.schema !== 1) throw new Error('data.json has an unknown schema, not touching it');
let rep = null, err = null;
try { rep = await run(data, await appFixes()); } catch (e) { err = e.message; }
await writeFile(REPORT, md(rep, err));

if (rep) {
  const next = structuredClone(data);
  // Keep last week's fixes unless TCGdex has since filled the gap itself; add this week's.
  const old = {};
  Object.entries(data.cardFixes || {}).forEach(([id, v]) => {
    const seen = rep.seen[id], keep = { ...v };
    if (seen && seen.mark) delete keep.mark;
    if (seen && seen.from) delete keep.from;
    if (Object.keys(keep).length) old[id] = keep;
  });
  const fixes = { ...old, ...rep.fills };
  const marks = { ...(data.setMarks || {}), ...rep.setMarks };
  if (Object.keys(fixes).length) next.cardFixes = Object.fromEntries(Object.entries(fixes).sort().slice(0, 600)); else delete next.cardFixes;
  if (Object.keys(marks).length) next.setMarks = marks; else delete next.setMarks;
  if (JSON.stringify(next) !== JSON.stringify(data)) {
    await writeFile(FILE, JSON.stringify(next, null, 2) + '\n');
    console.log('data.json card fixes updated');
  }
  console.log(`${rep.checked} cards checked, ${rep.diffs.length} disagree, ${rep.gaps.length} to check by hand`);
} else console.log('card check stopped: ' + err);
