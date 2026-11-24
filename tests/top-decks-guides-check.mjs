// Top decks guide check: node tests/top-decks-guides-check.mjs
// Top decks on home (js/v90-top-decks.js) opens a deck's guide when it has one, and the deck
// builder when it doesn't. This works out the Top rated and Up and coming lists from
// matchups.json the same way the app does, and:
//   1. fails if the guide links on home (TD90_GUIDES) don't match deck-guides.json, or a linked
//      guide page is missing (run node build-pages.mjs --guides to fix both);
//   2. lists the decks on either list that have no guide yet. That is a notice, not a failure,
//      since the lists change every week. --strict makes it a failure.
// To add a guide: add the deck to deck-guides.json (its id is the deck's id in matchups.json),
// run node build-pages.mjs --guides, then run this again.
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(path.join(ROOT, f), 'utf8');
const STRICT = process.argv.includes('--strict');
let bad = 0;
const fail = m => { bad++; console.log('FAIL ' + m); };

// The app's own code for both lists, run without a page.
const ctx = { console, gClamp: (x, a, b) => Math.max(a, Math.min(b, x)), safeLocalGet: () => null, safeLocalSet: () => {}, esc: s => s };
vm.createContext(ctx);
vm.runInContext(read('js/v69-grade-blend.js').split('\nfunction g68Arch')[0], ctx);
const td = read('js/v90-top-decks.js').split('// Drawn with home')[0];
vm.runInContext(td.replace(/^const /gm, 'var ').replace(/^let /gm, 'var '), ctx);
ctx.D = JSON.parse(read('matchups.json'));
const L = vm.runInContext('td90Lists2(D)', ctx);
const links = ctx.TD90_GUIDES;

// 1. Home's links match deck-guides.json, and every linked page exists.
const guides = JSON.parse(read('deck-guides.json')).decks;
const want = Object.fromEntries(guides.filter(g => existsSync(path.join(ROOT, `deck-${g.slug}.html`))).map(g => [g.id, g.slug]));
for (const [id, slug] of Object.entries(want)) if (links[id] !== slug) fail(`${id}: deck-${slug}.html is not linked from Top decks. Run node build-pages.mjs --guides.`);
for (const [id, slug] of Object.entries(links)) {
  if (want[id] !== slug) fail(`${id}: Top decks links deck-${slug}.html, which deck-guides.json doesn't build. Run node build-pages.mjs --guides.`);
}

// 2. Decks on home without a guide.
const names = { top: 'Top rated', up: 'Up and coming' };
const need = [];
for (const k of ['top', 'up']) for (const x of L[k]) {
  const has = !!links[x.id];
  console.log(`${names[k]}: ${x.name} (${x.id}) ${has ? 'guide deck-' + links[x.id] + '.html' : 'NO GUIDE, opens the deck builder'}`);
  if (!has) need.push(`${x.name} (${x.id}, ${names[k]})`);
}
if (need.length) {
  const m = `No deck guide yet for: ${need.join('; ')}. Add it to deck-guides.json and run node build-pages.mjs --guides.`;
  if (STRICT) fail(m);
  else console.log(process.env.GITHUB_ACTIONS ? `::notice title=Top decks without a guide::${m}` : 'NOTE ' + m);
}
console.log(bad ? `${bad} failed.` : 'Top decks guide check passed.');
if (bad) process.exitCode = 1;
