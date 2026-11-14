// Builds RdyDeck's plain reading pages: the deck guides (meta-decks.html and one deck-*.html per
// deck in deck-guides.json) and the pages written in pages/*.html (How grading works, FAQ, About,
// Contact). They are plain HTML that reads without running the app, so search engines and
// visitors with scripts off see the same text.
//
// The deck guides' words come from deck-guides.json. Their numbers come from the data files the
// app already reads, with nothing fetched: data.json (field share), meta-cards.json (what the
// top lists run), matchups.json (records and matchups) and tests/grade-baseline.json (the grade
// RdyDeck gives the top lists, written by the grade check). Run it again after those change.
//
// Usage: node build-pages.mjs        writes the pages next to this file
//        node build-pages.mjs --check  fails if a written page would change (nothing written)
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const read = f => JSON.parse(readFileSync(path.join(ROOT, f), 'utf8'));
const CHECK = process.argv.includes('--check');

const guides = read('deck-guides.json');
const data = read('data.json');
const mc = read('meta-cards.json');
const mu = read('matchups.json');
const base = existsSync(path.join(ROOT, 'tests/grade-baseline.json')) ? read('tests/grade-baseline.json').lists : {};
const lists = existsSync(path.join(ROOT, 'tests/grade-lists.json')) ? read('tests/grade-lists.json') : [];

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? `${+m[3]} ${MON[+m[2] - 1]} ${m[1]}` : ''; };
const pct = (w, n) => n ? (100 * w / n).toFixed(1) + '%' : '';
const num = n => Number(n).toLocaleString('en-US');
const median = a => { const s = a.slice().sort((x, y) => x - y), h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
const r1 = x => (Math.round(x * 10) / 10).toFixed(1);

// ── the page shell, the same look as the guide pages already on the site ──────────────────────
const NAV = [
  ['./', 'RdyDeck'], ['meta-decks.html', 'Deck guides'], ['how-grading-works.html', 'How grading works'],
  ['faq.html', 'FAQ'], ['about.html', 'About'], ['contact.html', 'Contact'],
  ['terms.html', 'Terms of Service'], ['privacy.html', 'Privacy Policy'],
];
const STYLE = `  @font-face { font-family:'RD Body'; font-weight:100 900; font-display:swap; src:url(saira.woff2) format('woff2'); }
  @font-face { font-family:'RD Display'; font-weight:700 900; font-display:swap; src:url(saira-condensed-800.woff2) format('woff2'); }
  :root { --bg:#131210; --text:#ede8de; --text-2:#bdb6a9; --text-3:#8f887c; --line:rgba(237,232,222,0.22); --rule:#ede8de; --mark:#e5483a; --on-mark:#ffffff;
    --font:'RD Body', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; --display:'RD Display', 'Arial Narrow', sans-serif; }
  html[data-theme="light"] { --bg:#f2eee5; --text:#1a1814; --text-2:#4a453d; --text-3:#6b645a; --line:rgba(26,24,20,0.24); --rule:#1a1814; --mark:#c42b1f; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font-family:var(--font); font-size:1rem; line-height:1.6; }
  main { max-width:760px; margin:0 auto; padding:1.5rem 1rem 4rem; }
  .top { display:flex; align-items:center; justify-content:space-between; gap:1rem; border-bottom:2px solid var(--rule); padding-bottom:0.8rem; }
  .brand { font-family:var(--display); font-weight:800; font-size:1.75rem; text-transform:uppercase; letter-spacing:0.01em; color:var(--text); text-decoration:none; line-height:1; }
  .brand span { color:var(--mark); }
  .top a.open { font-size:0.875rem; color:var(--text-2); }
  .kicker { font-family:var(--display); font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--mark); margin:1.6rem 0 0; font-size:1rem; }
  h1 { font-family:var(--display); font-weight:800; font-size:2.4rem; text-transform:uppercase; letter-spacing:0.01em; line-height:1.02; margin:0.2rem 0 0.8rem; }
  h2 { font-family:var(--display); font-weight:700; font-size:1.3rem; text-transform:uppercase; letter-spacing:0.04em; margin:2.2rem 0 0.4rem; padding-top:0.6rem; border-top:1px solid var(--line); }
  h3 { font-family:var(--display); font-weight:700; font-size:1.05rem; text-transform:uppercase; letter-spacing:0.04em; margin:1.4rem 0 0.2rem; }
  p, li { color:var(--text-2); }
  .lead { font-size:1.125rem; color:var(--text); }
  strong { color:var(--text); }
  a { color:var(--text); text-decoration:underline; text-decoration-color:var(--mark); text-underline-offset:2px; }
  ol, ul { padding-left:1.3rem; }
  li { margin:0.25rem 0; }
  .cta { display:inline-block; margin:0.6rem 0 0.4rem; padding:0.75rem 1.3rem; background:var(--mark); color:var(--on-mark); font-family:var(--display); font-weight:700; text-transform:uppercase; letter-spacing:0.05em; font-size:1.125rem; text-decoration:none; border-radius:4px; }
  .cta:hover { filter:brightness(1.08); }
  .cta-row { margin:1.2rem 0 0.4rem; }
  .tw { overflow-x:auto; }
  table { width:100%; border-collapse:collapse; font-size:0.9375rem; margin:0.6rem 0; }
  th, td { text-align:left; vertical-align:top; padding:0.5rem 0.6rem 0.5rem 0; border-bottom:1px solid var(--line); color:var(--text-2); }
  th { font-family:var(--display); text-transform:uppercase; letter-spacing:0.04em; font-weight:700; color:var(--text); }
  td.n, th.n { font-variant-numeric:tabular-nums; text-align:right; }
  td.n { color:var(--text); }
  tr.thin td { color:var(--text-3); }
  .note { font-size:0.875rem; color:var(--text-3); }
  dl { margin:0.6rem 0; }
  dt { color:var(--text); font-weight:600; margin-top:0.8rem; }
  dd { margin:0.2rem 0 0; color:var(--text-2); }
  .guides { display:flex; flex-wrap:wrap; gap:0.5rem 1.2rem; margin:0.4rem 0 0; padding:0; list-style:none; }
  .guides li { margin:0; }
  footer { margin-top:3rem; padding-top:1rem; border-top:1px solid var(--line); font-size:0.875rem; color:var(--text-3); }
  footer p { color:var(--text-3); margin:0 0 0.6rem; }
  footer nav { display:flex; flex-wrap:wrap; gap:0.5rem 1.2rem; }
  footer a { color:var(--text-2); }`;

export function footerHtml() {
  return `  <footer>
    <p>RdyDeck is free, has no account and works offline once it has loaded. Unofficial fan-made app. Not affiliated with Nintendo, Creatures, GAME FREAK or The Pok&eacute;mon Company.</p>
    <nav>${NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</nav>
  </footer>`;
}

function page({ file, title, desc, crumb, kicker, h1, body, og = 'og-deck-grader.png', type = 'article' }) {
  const url = 'https://rdydeck.com/' + file;
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': url + '#page', url, name: title, inLanguage: 'en',
      isPartOf: { '@type': 'WebSite', '@id': 'https://rdydeck.com/#site', name: 'RdyDeck', url: 'https://rdydeck.com/' },
      about: { '@id': 'https://rdydeck.com/#app' }, primaryImageOfPage: 'https://rdydeck.com/' + og, breadcrumb: { '@id': url + '#crumbs' } },
    { '@type': 'BreadcrumbList', '@id': url + '#crumbs', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'RdyDeck', item: 'https://rdydeck.com/' },
      ...(crumb ? [{ '@type': 'ListItem', position: 2, name: crumb[0], item: 'https://rdydeck.com/' + crumb[1] }] : []),
      { '@type': 'ListItem', position: crumb ? 3 : 2, name: h1.replace(/<[^>]+>/g, '').replace(/&eacute;/g, 'é').replace(/&amp;/g, '&'), item: url },
    ] },
  ] };
  const t = esc(title), d = esc(desc);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<script>
// The old GitHub Pages copy of this page sends visitors on to rdydeck.com, the same page.
if (location.hostname === 'optumesto.github.io') location.replace('https://rdydeck.com/' + location.pathname.replace(/^\\/PrizeTrainer\\/?/i, '') + location.search + location.hash);
</script>
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${t}</title>
<meta name="description" content="${d}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="RdyDeck">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="https://rdydeck.com/${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="RdyDeck. Pok&eacute;mon TCG deck grader.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="https://rdydeck.com/${og}">
<meta name="theme-color" content="#131210">
<link rel="icon" type="image/svg+xml" href="icon.svg">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="manifest.json">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>
${STYLE}
</style>
<script>try { if (localStorage.getItem('ptcg_theme') === 'light') document.documentElement.dataset.theme = 'light'; } catch (e) {}</script>
</head>
<body>
<main>
  <div class="top"><a class="brand" href="./"><span>Rdy</span>Deck</a><a class="open" href="./">Open RdyDeck</a></div>

  <p class="kicker">${kicker}</p>
  <h1>${h1}</h1>
${body.trim().split('\n').map(l => l ? '  ' + l.replace(/^ {2}/, '') : l).join('\n')}

${footerHtml()}
</main>
<script src="ads.js" defer></script>
<script>
// The app's service worker, so this page and the app open with no signal next time.
if ('serviceWorker' in navigator) addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
</script>
</body>
</html>
`;
}

// ── numbers for one deck ────────────────────────────────────────────────────────────────────
const muById = Object.fromEntries(mu.decks.map(d => [d.id, d]));
const mcById = Object.fromEntries(mc.decks.map(d => [d.id, d]));
const guideById = Object.fromEntries(guides.decks.map(g => [g.id, g]));
const metaShare = Object.fromEntries((data.meta && data.meta.decks || []).map(d => [d.name, d.share]));
const sum3 = recs => Object.values(recs || {}).reduce((a, v) => [a[0] + v[0], a[1] + v[1], a[2] + v[2]], [0, 0, 0]);
const curSince = mc.newest && mc.newest.since, curName = mc.newest && mc.newest.name;
// "Limitless online tournaments, 5 events and 1266 players in the last 14 days" reads as
// "in the 5 Limitless online events in the 14 days to 10 Nov 2026 (1,266 players)".
const FIELD = (() => {
  const m = /(\d+) events and (\d+) players in the last (\d+) days/.exec(data.meta.from || '');
  return m ? `in the ${m[1]} Limitless online events in the ${m[3]} days to ${day(data.meta.asOf)} (${num(+m[2])} players)`
    : `in ${esc(data.meta.from)} (as of ${day(data.meta.asOf)})`;
})();

function stats(g) {
  const m = muById[g.id], c = mcById[g.id];
  const rec = m ? sum3(m.rec) : [0, 0, 0], games = rec[0] + rec[1] + rec[2];
  const cur = m && m.cur ? sum3(m.cur.rec) : [0, 0, 0], curGames = cur[0] + cur[1] + cur[2];
  const graded = Object.values(base).filter(v => v.deck === g.title);
  const ids = new Set(Object.entries(base).filter(([, v]) => v.deck === g.title).map(([k]) => k));
  const dates = lists.filter((l, i) => ids.has(String(i + 1).padStart(3, '0'))).map(l => l.date).filter(Boolean).sort();
  return {
    m, c, rec, games, cur, curGames,
    share: metaShare[g.title] != null ? metaShare[g.title] : null,
    grade: graded.length ? { n: graded.length, g: median(graded.map(v => v.grade)), s: median(graded.map(v => v.synergy)), p: median(graded.map(v => v.power)) } : null,
    gradeDates: dates.length ? [dates[0], dates[dates.length - 1]] : null,
  };
}

const PART_NAME = { P: 'Pok&eacute;mon', T: 'Trainers', E: 'Energy' };
function coreTables(c) {
  const core = c.cards.filter(x => x[6] >= 0.9), flex = c.cards.filter(x => x[6] >= 0.25 && x[6] < 0.9);
  let h = '';
  for (const part of ['P', 'T', 'E']) {
    const rows = core.filter(x => x[3] === part);
    if (!rows.length) continue;
    const total = rows.reduce((a, x) => a + x[4], 0);
    h += `<h3>${PART_NAME[part]} (${total})</h3>
<div class="tw"><table>
  <thead><tr><th class="n">Count</th><th>Card</th><th>Set</th><th class="n">In lists</th></tr></thead>
  <tbody>
${rows.map(x => `    <tr><td class="n">${x[4]}</td><td>${esc(x[0])}</td><td>${esc(x[1])} ${esc(x[2])}</td><td class="n">${Math.round(x[6] * 100)}%</td></tr>`).join('\n')}
  </tbody>
</table></div>
`;
  }
  const coreN = core.reduce((a, x) => a + x[4], 0);
  h += `<p>That is ${coreN} of the 60 cards. The rest of each list is made of flex slots, and these are the most common choices:</p>
<div class="tw"><table>
  <thead><tr><th class="n">Count</th><th>Card</th><th>Set</th><th class="n">In lists</th></tr></thead>
  <tbody>
${flex.map(x => `    <tr><td class="n">${x[4]}</td><td>${esc(x[0])}</td><td>${esc(x[1])} ${esc(x[2])}</td><td class="n">${Math.round(x[6] * 100)}%</td></tr>`).join('\n')}
  </tbody>
</table></div>
`;
  return h;
}

function matchupTable(g, s) {
  const names = Object.fromEntries(mu.decks.map(d => [d.id, d.name]));
  const rows = (mu.cols || []).filter(id => id !== g.id).map(id => {
    const v = s.m && s.m.vs[id] ? sum3(s.m.vs[id]) : [0, 0, 0];
    return { id, v, n: v[0] + v[1] + v[2] };
  }).sort((a, b) => (a.id === 'other') - (b.id === 'other') || b.n - a.n).map(({ id, v, n }) => {
    const label = id === 'other' ? 'Other decks' : names[id] || id;
    const link = guideById[id] ? `<a href="deck-${guideById[id].slug}.html">${esc(label)}</a>` : esc(label);
    return `    <tr${n < 20 ? ' class="thin"' : ''}><td>${link}</td><td class="n">${n ? pct(v[0], n) : 'No games'}</td><td class="n">${num(n)}</td></tr>`;
  });
  return `<div class="tw"><table>
  <thead><tr><th>Against</th><th class="n">Win rate</th><th class="n">Games</th></tr></thead>
  <tbody>
${rows.join('\n')}
  </tbody>
</table></div>`;
}

function deckPage(g) {
  const s = stats(g), c = s.c;
  const basis = c && c.basis === 'cur'
    ? `the top lists of events since ${esc(curName)} came out (${day(curSince)})`
    : `the top lists of events from ${day(mc.since)} to ${day(mc.until)}`;
  const facts = [];
  if (s.share != null) facts.push(`<li><strong>Field share:</strong> ${esc(s.share)}% of players ${FIELD}.</li>`);
  if (s.games) facts.push(`<li><strong>Online record:</strong> ${pct(s.rec[0], s.games)} wins over ${num(s.games)} games ${s.curGames >= s.games
    ? `since ${esc(curName)} came out`
    : `since ${day(mu.since)}${s.curGames ? `, and ${pct(s.cur[0], s.curGames)} over ${num(s.curGames)} games since ${esc(curName)}` : ''}`}.</li>`);
  if (s.grade) facts.push(`<li><strong>RdyDeck grade:</strong> ${r1(s.grade.g)} out of 10 for its top lists.</li>`);
  const body = `
<p class="lead">${esc(g.lead)}</p>
<ul>
${facts.map(f => '  ' + f).join('\n')}
</ul>
<div class="cta-row"><a class="cta" href="./">Grade my ${esc(g.title)} list</a></div>

<h2>Game plan</h2>
${g.plan.map(p => `<p>${esc(p)}</p>`).join('\n')}

<h2>Key cards</h2>
<dl>
${g.keys.map(([k, v]) => `  <dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('\n')}
</dl>

<h2>The core list</h2>
<p>These cards are in at least 90% of ${esc(g.title)} lists, at their usual count. They come from ${basis}, ${num(c.tops)} lists in all, on Limitless online tournaments.</p>
${coreTables(c)}
<h2>Matchups</h2>
<p>How ${esc(g.title)} has done against the most played decks in Limitless online tournaments since ${day(mu.since)}, as of ${day(mu.asOf)}. Mirror matches are left out. Results with fewer than 20 games are grayed out, since they can swing a lot either way.</p>
${matchupTable(g, s)}
<p class="note">These are results for decks like this one, not one exact list.</p>

<h2>How RdyDeck grades it</h2>
${s.grade ? `<p>RdyDeck grades the ${s.grade.n} ${esc(g.title)} lists in its test set, all top 16 finishes${s.gradeDates ? ` from ${day(s.gradeDates[0])} to ${day(s.gradeDates[1])}` : ''}, at ${r1(s.grade.g)} out of 10 (the middle value). Their middle Synergy is ${r1(s.grade.s)} and their middle Power is ${r1(s.grade.p)}. The grade is not simply Synergy times Power, since it also counts the deck's online results and lowers the grade for how tightly a list fits only when the fit is loose.</p>\n` : ''}<p>${esc(g.grade)}</p>
<p>Your own list will grade differently, since the grade reads every card you run. <a href="how-grading-works.html">How grading works</a> explains each part.</p>
<div class="cta-row"><a class="cta" href="./">Grade my deck</a></div>

<h2>More deck guides</h2>
<ul class="guides">
${guides.decks.filter(x => x.id !== g.id).map(x => `  <li><a href="deck-${x.slug}.html">${esc(x.title)}</a></li>`).join('\n')}
</ul>
<p class="note">Tournament numbers are from <a href="${esc(data.meta.src)}">Limitless TCG</a> online tournaments, read once a week and credited to them. Card details are from each card's own text.</p>
`;
  return page({
    file: `deck-${g.slug}.html`,
    title: `${g.title} Deck Guide: List, Game Plan and Matchups | RdyDeck`,
    desc: `How ${g.title} plays in the Pokémon TCG: the core list from top finishes, the game plan, key cards, matchups and how RdyDeck grades it.`,
    crumb: ['Deck guides', 'meta-decks.html'],
    kicker: 'Deck guide',
    h1: `${esc(g.title)} deck guide`,
    body,
  });
}

function indexPage() {
  const rows = guides.decks.map(g => {
    const s = stats(g);
    return `    <tr><td><a href="deck-${g.slug}.html">${esc(g.title)}</a></td><td class="n">${s.share != null ? esc(s.share) + '%' : ''}</td><td class="n">${s.games ? pct(s.rec[0], s.games) : ''}</td><td class="n">${s.grade ? r1(s.grade.g) : ''}</td></tr>`;
  });
  const body = `
<p class="lead">Guides to the decks winning Pok&eacute;mon TCG tournaments right now: what each one runs, how it plays, what it beats, and how RdyDeck grades it.</p>
<p>Each guide is built from real results. The core lists come from the top finishes of Limitless online tournaments, the matchups from every game played in them since ${day(mu.since)}, and the grades from RdyDeck's own grader run on top 16 lists. The game plans are written from the cards' own text, so you can check every claim against the card.</p>

<h2>The decks</h2>
<div class="tw"><table>
  <thead><tr><th>Deck</th><th class="n">Field share</th><th class="n">Win rate</th><th class="n">Grade</th></tr></thead>
  <tbody>
${rows.join('\n')}
  </tbody>
</table></div>
<p class="note">Field share is the share of players ${FIELD}. Win rate is wins over all games since ${day(mu.since)}, as of ${day(mu.asOf)}. Grade is RdyDeck's grade for the deck's top lists, out of 10.</p>

<h2>Reading the numbers</h2>
<p>A win rate a little over 50% is good in a format this crowded: most decks sit between 47% and 53%, and only a handful stay above 55% over thousands of games. A deck with a small share and a high win rate can be a strong pick that few people have found yet, or a deck that has only played a few events, so check the number of games before reading much into it.</p>
<p>The grade and the record measure different things. The grade reads the cards in a list: do they work together, and can the plan win. The record shows how the deck has actually done. RdyDeck blends the two, and <a href="how-grading-works.html">How grading works</a> explains how much each one counts.</p>

<h2>Grade your own list</h2>
<p>Paste your list from Pok&eacute;mon TCG Live or Limitless into RdyDeck and it grades it out of 10, matches it to the closest of these decks, and shows what to fix first. It is free, needs no account and works offline.</p>
<div class="cta-row"><a class="cta" href="./">Grade my deck</a></div>
<p class="note">Tournament numbers are from <a href="${esc(data.meta.src)}">Limitless TCG</a> online tournaments, read once a week and credited to them.</p>
`;
  return page({
    file: 'meta-decks.html',
    title: 'Pokémon TCG Meta Deck Guides: Top Decks and Lists | RdyDeck',
    desc: 'Guides to the top Pokémon TCG decks right now: core lists from tournament top finishes, game plans, matchups and grades.',
    kicker: 'Deck guides',
    h1: 'Top Pok&eacute;mon TCG decks',
    body,
  });
}

// ── pages written by hand in pages/*.html ──────────────────────────────────────────────────────
// Each starts with one comment line of JSON: {"file", "title", "desc", "kicker", "h1"}.
function handPages() {
  const dir = path.join(ROOT, 'pages');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.html')).sort().map(f => {
    const src = readFileSync(path.join(dir, f), 'utf8');
    const m = /^<!--\s*(\{[\s\S]*?\})\s*-->\n/.exec(src);
    if (!m) throw new Error(`pages/${f}: the first line must be a <!-- {json} --> header`);
    const meta = JSON.parse(m[1]);
    return [meta.file, page({ ...meta, body: src.slice(m[0].length) })];
  });
}

const out = [
  ['meta-decks.html', indexPage()],
  ...guides.decks.filter(g => mcById[g.id]).map(g => [`deck-${g.slug}.html`, deckPage(g)]),
  ...handPages(),
];
const missing = guides.decks.filter(g => !mcById[g.id]).map(g => g.title);
if (missing.length) console.warn('No card data for: ' + missing.join(', ') + '. Their pages were not rebuilt.');
let changed = 0;
for (const [file, html] of out) {
  if (/[\u2013\u2014]/.test(html)) throw new Error(`${file} has an en or em dash`);
  const p = path.join(ROOT, file);
  if (existsSync(p) && readFileSync(p, 'utf8') === html) continue;
  changed++;
  if (CHECK) console.log('Would change: ' + file);
  else writeFileSync(p, html);
}
console.log(`${out.length} pages, ${changed} ${CHECK ? 'out of date' : 'written'}.`);
if (CHECK && changed) process.exitCode = 1;
