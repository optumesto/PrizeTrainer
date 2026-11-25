// Search checks for the site pages: node tests/seo-check.mjs
// 1. Every page carries the github.io-only noindex line once, and the Worker
//    takes it out, so rdydeck.com pages are indexable and github.io ones are not.
// 2. Titles and descriptions fit what Google shows; descriptions are distinct.
// 3. Guide pages link to the tools and show a breadcrumb.
// 4. The Worker's browser cache times.
// 5. The language home pages (es/, pt/, fr/, de/, it/) and how the Worker answers paths under them.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MIRROR_NOINDEX, forHome, cacheFor, langFile } from '../worker/rdydeck-worker.js';
import { LANG_PAGES, checkPage } from '../lang-pages.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let bad = 0;
const fail = m => { bad++; console.log('FAIL ' + m); };
const SKIP = new Set(['404.html', 'offline.html']);
const files = [...readdirSync(ROOT).filter(f => f.endsWith('.html') && !/^google[0-9a-f]+\.html$/.test(f)),
  ...LANG_PAGES.map(l => l.code + '/index.html'),
  ...(() => { try { return readdirSync(path.join(ROOT, 'cards')).filter(f => f.endsWith('.html')).map(f => 'cards/' + f); } catch (_) { return []; } })()];
const descs = new Map();
const SITEMAP = readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const TOOLS = ['deck-grader.html', 'opening-odds.html', 'rotation.html', 'prize-trainer.html', 'rulings.html', 'improve-your-deck.html'];

for (const f of files) {
  if (SKIP.has(f)) continue;
  const html = readFileSync(path.join(ROOT, f), 'utf8');
  const n = html.split(MIRROR_NOINDEX).length - 1;
  if (n !== 1) fail(`${f}: github.io noindex line ${n} times, want 1`);
  const home = forHome(html);
  // 3.4.35: every page is in search and in sitemap.xml, except card guides with too little to say yet
  // (build-pages.mjs marks those noindex, follow). A noindex page must be a card guide and out of the sitemap.
  const noindexHere = /name="robots"[^>]*noindex/i.test(home);
  const outOfSearch = noindexHere;
  if (noindexHere && !/^cards\/(?!index\.html)/.test(f)) fail(`${f}: noindex on rdydeck.com, and only thin card guides may be`);
  const loc = `<loc>https://rdydeck.com/${f.replace(/(^|\/)index\.html$/, '$1')}</loc>`;
  if (outOfSearch && SITEMAP.includes(loc)) fail(`${f}: card guide is in sitemap.xml`);
  if (!outOfSearch && !SITEMAP.includes(loc)) fail(`${f}: not in sitemap.xml`);
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  if (!title) fail(`${f}: no title`);
  if ([...title].length > 65) fail(`${f}: title ${[...title].length} chars`);
  if (/&eacute;/.test(title + desc)) fail(`${f}: entity in title or description`);
  const dl = [...desc.replace(/&amp;/g, '&').replace(/&quot;/g, '"')].length;
  if (dl < 70 || dl > 155) fail(`${f}: description ${dl} chars`);
  if (descs.has(desc)) fail(`${f}: same description as ${descs.get(desc)}`);
  descs.set(desc, f);
  if (!/<link rel="canonical" href="https:\/\/rdydeck\.com\//.test(html)) fail(`${f}: no rdydeck.com canonical`);
  if (!/property="og:title"/.test(html) || !/name="twitter:card"/.test(html)) fail(`${f}: no OG or Twitter tags`);
  const isGuide = /^(deck-(?!grader)|cards\/|meta-decks|how-grading|improve-your|rulings|faq|about)/.test(f);
  if (isGuide) {
    for (const t of TOOLS) if (t !== f && !html.includes(`href="${f.startsWith('cards/') ? '../' : ''}${t}"`)) fail(`${f}: no link to ${t}`);
    if (!/<nav class="crumbs"/.test(html) && f !== 'index.html') fail(`${f}: no visible breadcrumb`);
  }
}

const c = [['/js/core.js', '?v=b95517e6', 'immutable'], ['/js/core.js', '', 'max-age=300'], ['/index.html', '', 'max-age=300'],
  ['/data.json', '', 'max-age=300'], ['/sw.js', '', 'no-cache'], ['/saira.woff2', '', '604800'], ['/', '', 'max-age=300']];
for (const [p, q, want] of c) if (!cacheFor(p, q).includes(want)) fail(`cache ${p}${q}: ${cacheFor(p, q)}`);

for (const l of LANG_PAGES) {
  for (const b of checkPage(readFileSync(path.join(ROOT, l.code, 'index.html'), 'utf8'), l.code)) fail(b);
}
const lf = [['/es/', null], ['/es/index.html', null], ['/es/js/core.js', { file: '/js/core.js' }],
  ['/de/cards.json', { file: '/cards.json' }], ['/es/rulings.html', { page: '/rulings.html' }], ['/fr/cards/', { page: '/cards/' }],
  ['/en/', null], ['/js/core.js', null], ['/esx/core.js', null]];
for (const [p, want] of lf) if (JSON.stringify(langFile(p)) !== JSON.stringify(want)) fail(`langFile ${p}: ${JSON.stringify(langFile(p))}, want ${JSON.stringify(want)}`);

console.log(bad ? `${bad} problems` : `seo-check: ${files.length} pages OK`);
process.exit(bad ? 1 : 0);
