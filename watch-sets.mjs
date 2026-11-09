// Watches for the next Pokemon TCG set and puts it in RdyDeck's Prerelease section on its own.
// Run twice a day by .github/workflows/watch-sets.yml. Nobody needs to edit data.json by hand.
//
// What it reads (no keys, both free):
// - pokemon-tcg-data on GitHub (the data behind pokemontcg.io): the English set list, and the
//   card list of the next set once it is there. Two requests on a quiet day.
// - TCGdex (api.tcgdex.net): the same set, as a second source. One or two requests.
//
// How it decides:
// - The next set is the next number in the current series (Delta Reign is me06, so me07 next),
//   or the first set of a new series that comes out after the current one.
// - A set counts only when a source has its whole card list: as many cards as the set's total,
//   and every number from 1 to the printed count. A partial list is never used.
// - When both sources have the set, every name must match number by number. If any differs,
//   nothing changes and set-watch.md says which cards, so a wrong list never reaches the app.
// - Then data.json's prerelease block moves to the new set, with its card names and numbers,
//   so the app's Prerelease section needs nothing from us. Until then the current set stays.
// - It also fills in what a set was missing when it switched (the TCGdex id, the card list).
//
// Safety: data.json is only written when something real changed, so a quiet day makes no commit.
import { readFile, writeFile } from 'node:fs/promises';

const FILE = process.argv[2] || 'data.json';
const REPORT = process.argv[3] || 'set-watch.md';
const UA = 'RdyDeck-set-watch/1.0 (+https://rdydeck.com/)';
const PTCG = process.env.SW_PTCG || 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master';
const TCGDEX = process.env.SW_TCGDEX || 'https://api.tcgdex.net/v2/en';
const TODAY = process.env.SW_TODAY || new Date().toISOString().slice(0, 10);

let calls = 0;
async function getJSON(url) {
  if (calls++ > 12) throw new Error('request budget used up');
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
    if (r.status === 404) return { missing: true };
    if (!r.ok) return null;
    return await r.json();
  } catch (_) { return null; }
}

const clean = (v, max) => String(v == null ? '' : v).replace(/[<>`\u0000-\u001f]/g, '').replace(/[\u2013\u2014]/g, '-').trim().slice(0, max);
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
const num = s => String(s || '').replace(/^0+(?=\d)/, '').toUpperCase();
const day = s => { const m = String(s || '').match(/^(\d{4})[/-](\d{2})[/-](\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : null; };
const okCode = c => /^[A-Z0-9]{2,5}$/.test(c);
const okTd = id => /^[a-z0-9.]{2,12}$/.test(String(id || ''));

/** Series and number from a set id: me06 and me6 both give { s: 'me', n: 6 }. */
function seq(id) { const m = String(id || '').match(/^([a-z]+)0*(\d+)$/); return m ? { s: m[1], n: +m[2] } : null; }

/** A card list is whole when it has the set's total and every printed number from 1 up. */
function whole(cards, official, total) {
  if (!Array.isArray(cards) || !cards.length || !official) return false;
  const nums = new Set(cards.map(c => c.num));
  if (nums.size !== cards.length) return false;
  for (let i = 1; i <= official; i++) if (!nums.has(String(i))) return false;
  return cards.length >= (total || official);
}

/** The next set in pokemon-tcg-data's English list, or null. */
function nextInPtcg(list, cur) {
  if (!Array.isArray(list)) return null;
  const s = seq(cur.ptcg) || seq(cur.tcgdex);
  const sets = list.filter(x => x && typeof x.id === 'string' && day(x.releaseDate));
  if (s) {
    const hit = sets.find(x => x.id === s.s + (s.n + 1));
    if (hit) return hit;
  }
  // A new series starts at 1 (its first set), after the current set's release.
  const fresh = sets.filter(x => /^[a-z]+1$/.test(x.id) && (!s || seq(x.id).s !== s.s) && day(x.releaseDate) > (cur.release || '0'))
    .sort((a, b) => day(a.releaseDate).localeCompare(day(b.releaseDate)));
  return fresh[0] || null;
}

async function ptcgCards(id) {
  const j = await getJSON(`${PTCG}/cards/en/${encodeURIComponent(id)}.json`);
  if (!Array.isArray(j)) return null;
  return j.map(c => c && typeof c.name === 'string' && /^[A-Za-z0-9]{1,6}$/.test(String(c.number || ''))
    ? { num: num(c.number), name: clean(c.name, 60) } : null).filter(Boolean);
}

/** The set on TCGdex: its id, code, counts and cards. Null when TCGdex is down or does not have it. */
async function tcgdexSet(guessId, name) {
  let id = guessId;
  if (!id || !okTd(id)) {
    const all = await getJSON(`${TCGDEX}/sets`);
    const hit = Array.isArray(all) && all.find(x => x && norm(x.name) === norm(name));
    id = hit ? hit.id : null;
  }
  if (!id || !okTd(id)) return null;
  const d = await getJSON(`${TCGDEX}/sets/${encodeURIComponent(id)}`);
  if (!d || d.missing || !Array.isArray(d.cards)) return null;
  if (name && d.name && norm(d.name) !== norm(name)) return null;
  const cards = d.cards.map(c => c && typeof c.name === 'string' && /^[A-Za-z0-9]{1,6}$/.test(String(c.localId || ''))
    ? { num: num(c.localId), name: clean(c.name, 60) } : null).filter(Boolean);
  return {
    id: d.id, name: clean(d.name, 40),
    code: String((d.abbreviation && d.abbreviation.official) || '').toUpperCase(),
    official: (d.cardCount && d.cardCount.official) || 0, total: (d.cardCount && d.cardCount.total) || 0,
    release: day(d.releaseDate), cards,
  };
}

/** Numbers where the two lists name different cards. */
function differ(a, b) {
  const m = new Map(b.map(c => [c.num, c.name]));
  return a.filter(c => m.has(c.num) && norm(m.get(c.num)) !== norm(c.name)).map(c => `${c.num}: "${c.name}" on pokemon-tcg-data, "${m.get(c.num)}" on TCGdex`);
}

const sortCards = cards => cards.slice().sort((a, b) => (parseInt(a.num, 10) || 9999) - (parseInt(b.num, 10) || 9999) || a.num.localeCompare(b.num));

// ── Run ──
const old = JSON.parse(await readFile(FILE, 'utf8'));
if (old.schema !== 1) throw new Error('data.json has an unknown schema, not touching it');
const next = structuredClone(old);
const cur = next.prerelease && typeof next.prerelease === 'object' ? next.prerelease : {};
const log = [];

const ptList = await getJSON(`${PTCG}/sets/en.json`);
if (!Array.isArray(ptList)) log.push('pokemon-tcg-data did not answer.');

// 1. Fill in what the current set is missing (its card list, its TCGdex id, its pokemon-tcg-data id).
if (cur.set && cur.code) {
  const pt = Array.isArray(ptList) && ptList.find(x => x && String(x.ptcgoCode || '').toUpperCase() === cur.code && norm(x.name) === norm(cur.set));
  if (pt && !cur.ptcg) cur.ptcg = pt.id;
  const hasCards = Array.isArray(cur.cards) && cur.cards.length;
  if (!hasCards || !cur.tcgdex) {
    const td = await tcgdexSet(cur.tcgdex, cur.set);
    const tdSame = td && (!td.code || td.code === cur.code);
    if (!hasCards) {
      const ptc = pt ? await ptcgCards(pt.id) : null;
      const off = cur.official || (pt && pt.printedTotal) || 0, tot = cur.total || (pt && pt.total) || 0;
      const ptOk = ptc && whole(ptc, off, tot), tdOk = tdSame && whole(td.cards, off, tot);
      const bad = ptc && tdSame ? differ(ptc, td.cards) : [];
      if (bad.length) log.push(`${cur.set}: the two databases disagree on ${bad.length === 1 ? "1 card name" : bad.length + " card names"}, so its list was left out:\n` + bad.map(x => '- ' + x).join('\n'));
      else if (ptOk || tdOk) { cur.cards = sortCards(ptOk ? ptc : td.cards); log.push(`${cur.set}: card list added (${cur.cards.length} cards from ${ptOk ? 'pokemon-tcg-data' : 'TCGdex'}).`); }
    }
    if (!cur.tcgdex && tdSame && okTd(td.id)) {
      const bad = Array.isArray(cur.cards) ? differ(cur.cards, td.cards) : [];
      if (!bad.length) { cur.tcgdex = td.id; log.push(`${cur.set}: TCGdex has it now (${td.id}).`); }
      else log.push(`${cur.set}: TCGdex names differ from the list in use:\n` + bad.map(x => '- ' + x).join('\n'));
    }
  }
  if (cur.code && cur.tcgdex && okCode(cur.code) && okTd(cur.tcgdex)) next.sets = { ...(next.sets || {}), [cur.code]: cur.tcgdex };
}

// 2. Look for the next set.
const pt = nextInPtcg(ptList, cur);
const s = seq(cur.tcgdex) || seq(cur.ptcg);
const tdGuess = pt ? null : s ? s.s + String(s.n + 1).padStart(2, '0') : null;
const td = pt ? await tcgdexSet(null, pt.name) : tdGuess ? await tcgdexSet(tdGuess, null) : null;

if (!pt && !td) {
  log.push(`No newer set than ${cur.set || 'the current one'} in either database yet.`);
} else {
  const name = clean(pt ? pt.name : td.name, 40);
  const code = String(pt ? pt.ptcgoCode || '' : td.code).toUpperCase() || (td && td.code) || '';
  const official = (pt && pt.printedTotal) || (td && td.official) || 0;
  const total = (pt && pt.total) || (td && td.total) || 0;
  const release = (pt && day(pt.releaseDate)) || (td && td.release) || null;
  const ptc = pt ? await ptcgCards(pt.id) : null;
  const ptOk = !!(ptc && whole(ptc, official, total));
  const tdOk = !!(td && whole(td.cards, official, total));
  const bad = ptc && td ? differ(ptc, td.cards) : [];
  const codeClash = pt && td && td.code && pt.ptcgoCode && td.code !== String(pt.ptcgoCode).toUpperCase();
  const newer = release && (!cur.release || release > cur.release);

  if (!okCode(code) || !release || !official) log.push(`${name}: listed, but its code, printed count or release date is not there yet. Waiting.`);
  else if (!newer) log.push(`${name}: not newer than ${cur.set}. Nothing to do.`);
  else if (codeClash) log.push(`${name}: the databases give different set codes (${pt.ptcgoCode} and ${td.code}). Waiting until they agree.`);
  else if (bad.length) log.push(`${name}: the two databases disagree on ${bad.length === 1 ? "1 card name" : bad.length + " card names"}, so the Prerelease section stays on ${cur.set}:\n` + bad.map(x => '- ' + x).join('\n'));
  else if (!ptOk && !tdOk) log.push(`${name} (${code}), out ${release}: listed, but neither database has the whole card list yet (pokemon-tcg-data ${ptc ? ptc.length : 0}, TCGdex ${td ? td.cards.length : 0}, of ${total}). Waiting.`);
  else {
    next.prerelease = {
      set: name, code,
      tcgdex: td && okTd(td.id) ? td.id : '',
      ptcg: pt ? pt.id : '',
      official, total,
      // Event dates are not in either database, so none are guessed. The app then shows the store date.
      start: null, end: null, release,
      kit: [`4 ${name} booster packs`, 'A 40 card deck, ready to play', 'A foil promo card'],
      cards: sortCards(ptOk ? ptc : td.cards),
      from: ptOk && tdOk ? 'pokemon-tcg-data and TCGdex, names match' : ptOk ? 'pokemon-tcg-data' : 'TCGdex',
      added: TODAY,
    };
    if (next.prerelease.tcgdex) next.sets = { ...(next.sets || {}), [code]: next.prerelease.tcgdex };
    log.push(`${name} (${code}) is in the Prerelease section now: ${next.prerelease.cards.length} cards from ${next.prerelease.from}. Out ${release}.`);
  }
}

console.log(log.join('\n'));
const changed = JSON.stringify(next) !== JSON.stringify(old);
if (changed) {
  next.asOf = TODAY > (old.asOf || '') ? TODAY : old.asOf;
  await writeFile(FILE, JSON.stringify(next, null, 2) + '\n');
  console.log('data.json updated.');
}
// The report only changes when what it says changes, so it makes no daily commits on its own.
const body = `# Set watch\n\nWhat the twice daily set watch found last time something changed. It moves the Prerelease section to a new set by itself once a card database has the whole list.\n\nPrerelease section: ${(next.prerelease && next.prerelease.set) || 'none'}${next.prerelease && next.prerelease.code ? ` (${next.prerelease.code})` : ''}\n\n${log.map(l => l.startsWith('-') ? l : '- ' + l.replace(/\n/g, '\n  ')).join('\n')}\n`;
let prev = '';
try { prev = await readFile(REPORT, 'utf8'); } catch (_) {}
if (prev !== body) await writeFile(REPORT, body);
