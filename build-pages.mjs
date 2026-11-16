// Builds RdyDeck's plain reading pages: the deck guides (meta-decks.html and one deck-*.html per
// deck in deck-guides.json) and the pages written in .github/pages/*.html (How grading works, FAQ, About,
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
//        node build-pages.mjs --only=how-grading-works.html   writes just that page (the weekly
//                                      refresh does this after the grade check writes accuracy.json)
//
// 3.0: how-grading-works.html gets its How accurate the grades are section from accuracy.json,
// written each week by tests/grade-check.mjs --results --board=accuracy.json.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const read = f => JSON.parse(readFileSync(path.join(ROOT, f), 'utf8'));
const CHECK = process.argv.includes('--check');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7);

const guides = read('deck-guides.json');
const data = read('data.json');
const mc = read('meta-cards.json');
const mu = read('matchups.json');
const base = existsSync(path.join(ROOT, 'tests/grade-baseline.json')) ? read('tests/grade-baseline.json').lists : {};
const lists = existsSync(path.join(ROOT, 'tests/grade-lists.json')) ? read('tests/grade-lists.json') : [];
const acc = existsSync(path.join(ROOT, 'accuracy.json')) ? read('accuracy.json') : null;

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
    <p>RdyDeck is free, has no account and works offline once it has loaded. Unofficial fan-made app. Not affiliated with Nintendo, Creatures, GAME FREAK or The Pok&eacute;mon Company. Card names, text and images are &copy; The Pok&eacute;mon Company, Nintendo, Creatures and GAME FREAK.</p>
    <nav>${NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</nav>
  </footer>`;
}

// Plain text from a bit of page HTML, for structured data: tags dropped, the entities these pages use decoded.
const plain = h => String(h).replace(/<[^>]+>/g, '').replace(/&eacute;/g, '\u00e9').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
  .replace(/&#39;|&rsquo;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
// The question and answer pairs (<dt> then <dd>) on a page, so Google and AI assistants can read them as an FAQ.
const faqPairs = body => [...String(body).matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)].map(m => [plain(m[1]), plain(m[2])]);

function page({ file, title, desc, crumb, kicker, h1, body, og = 'og-deck-grader.png', type = 'article', faq = false }) {
  const url = 'https://rdydeck.com/' + file;
  const qa = faq ? faqPairs(body) : [];
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': url + '#page', url, name: title, inLanguage: 'en',
      isPartOf: { '@type': 'WebSite', '@id': 'https://rdydeck.com/#site', name: 'RdyDeck', url: 'https://rdydeck.com/' },
      about: { '@id': 'https://rdydeck.com/#app' }, primaryImageOfPage: 'https://rdydeck.com/' + og, breadcrumb: { '@id': url + '#crumbs' } },
    { '@type': 'BreadcrumbList', '@id': url + '#crumbs', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'RdyDeck', item: 'https://rdydeck.com/' },
      ...(crumb ? [{ '@type': 'ListItem', position: 2, name: crumb[0], item: 'https://rdydeck.com/' + crumb[1] }] : []),
      { '@type': 'ListItem', position: crumb ? 3 : 2, name: h1.replace(/<[^>]+>/g, '').replace(/&eacute;/g, 'é').replace(/&amp;/g, '&'), item: url },
    ] },
    ...(qa.length ? [{ '@type': 'FAQPage', '@id': url + '#faq', url, mainEntity: qa.map(([q, a]) => (
      { '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }] : []),
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

// ── How to improve your deck: the checks the grader makes, written out for a player, with numbers from the top lists ──
// The numbers come from tests/grade-lists.json, the top 16 lists the grade check uses, so they move when those lists do.
function improvePage() {
  if (!lists.length) return null;
  const n = lists.length, events = new Set(lists.map(l => l.event)).size, decks = new Set(lists.map(l => l.deck)).size;
  const dates = lists.map(l => l.date).filter(Boolean).sort();
  const part = (l, p) => l.cards.filter(c => c.part === p).reduce((a, c) => a + c.count, 0);
  const q = (a, f) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };
  const spread = p => { const a = lists.map(l => part(l, p)); return { med: median(a), lo: q(a, 0.25), hi: q(a, 0.75) }; };
  const P = spread('pokemon'), T = spread('trainer'), E = spread('energy');
  const runs = {};
  for (const l of lists) for (const c of l.cards) if (c.part === 'trainer') (runs[c.name] = runs[c.name] || []).push(c.count);
  const staples = Object.entries(runs).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).slice(0, 10);
  const rows = staples.map(([name, cs]) => `    <tr><td>${esc(name)}</td><td class="n">${cs.length} of ${n}</td><td class="n">${median(cs)}</td></tr>`);
  const when = dates.length ? `from ${day(dates[0])} to ${day(dates[dates.length - 1])}` : '';
  const body = `<p class="lead">To improve a Pok&eacute;mon TCG deck, check it in this order: every card is legal, every attacker can pay for its attack and every evolution has what it evolves from, the deck has a steady way to draw and search, its counts sit near what winning lists run, and it has a plan against the decks you will face. RdyDeck, a free deck grader, runs these checks for you: paste your list and it grades the deck out of 10 and names what to fix first.</p>
<div class="cta-row"><a class="cta" href="./">Grade my deck free</a></div>

<h2>1. Make sure every card is legal</h2>
<p>A card that is not Standard legal makes the deck unplayable at an event, so fix this first. Check each card's regulation mark. An older printing is still legal when a reprint with the same name, attacks and Abilities is legal now. The <a href="rotation.html">rotation checker</a> marks which cards are legal now and which may rotate next.</p>

<h2>2. Give every card what it needs</h2>
<p>Every attacker needs the Energy its attacks cost, and every evolution needs the Pok&eacute;mon it evolves from. A Stage 2 line also wants Rare Candy or enough search to find both stages. These gaps are the most common reason a deck stalls, and they are easy to miss when you build from a list of favourite cards.</p>

<h2>3. Build a steady way to draw and search</h2>
<p>A deck needs to find the same few cards every game: draw Supporters, search Items, or a Pok&eacute;mon with a draw or search Ability. Without one, even strong attackers sit in the deck. A deck with a draw engine but single copies of cards it needs often will still miss them, so run more copies of what you need every game and fewer one of a kind ideas.</p>

<h2>4. Compare your counts with winning lists</h2>
<p>Across ${n} top 16 lists from ${events} Limitless online tournaments ${when}, covering ${decks} different decks, the typical split was:</p>
<div class="tw"><table>
  <thead><tr><th>Part</th><th class="n">Typical count</th><th class="n">Middle half of lists</th></tr></thead>
  <tbody>
    <tr><td>Pok&eacute;mon</td><td class="n">${P.med}</td><td class="n">${P.lo} to ${P.hi}</td></tr>
    <tr><td>Trainers</td><td class="n">${T.med}</td><td class="n">${T.lo} to ${T.hi}</td></tr>
    <tr><td>Energy</td><td class="n">${E.med}</td><td class="n">${E.lo} to ${E.hi}</td></tr>
  </tbody>
</table></div>
<p>Your deck does not have to match these, since a deck of Basics and a deck with Stage 2 lines play very differently. But if your Trainer count is far below the range, the deck is likely short on draw and search. These were the Trainers the most lists played:</p>
<div class="tw"><table>
  <thead><tr><th>Trainer</th><th class="n">Lists that play it</th><th class="n">Usual count</th></tr></thead>
  <tbody>
${rows.join('\n')}
  </tbody>
</table></div>
<p>The <a href="meta-decks.html">deck guides</a> show what top lists of each deck run, card by card.</p>

<h2>5. Check your opening odds</h2>
<p>How often you mulligan, start without your attacker or put a key card in your prizes is just maths on your list. Too few Basic Pok&eacute;mon means more mulligans. One copy of a key card means it is often prized. <a href="opening-odds.html">Opening odds</a> works these out for your exact list.</p>

<h2>6. Plan for the decks you will face</h2>
<p>A deck that wins the prize race against the most played decks will do well even if it loses to a rare one. Look at which decks are popular now, how your attacker trades against them, and whether a tech card would swing a common matchup. The <a href="meta-decks.html">deck guides</a> list each top deck's record and matchups from real tournament games.</p>

<h2>7. Practice with the deck</h2>
<p>A better list only helps if you play it well. Knowing which cards went to your prizes changes what you search for. The <a href="prize-trainer.html">prize trainer</a> drills this with your own deck.</p>

<h2>Common questions</h2>
<dl>
  <dt>Is there a free tool that rates my Pok&eacute;mon deck?</dt>
  <dd>Yes. RdyDeck grades a 60 card Pok&eacute;mon TCG deck out of 10 for free, with no account. Paste a list from Pok&eacute;mon TCG Live or Limitless TCG and it scores Synergy and Power, compares the deck with recent tournament results and lists what to fix first.</dd>
  <dt>How many Pok&eacute;mon, Trainers and Energy should a Pok&eacute;mon deck have?</dt>
  <dd>A deck has exactly 60 cards. In ${n} recent top 16 lists the typical split was ${P.med} Pok&eacute;mon, ${T.med} Trainers and ${E.med} Energy, with the middle half of lists running ${P.lo} to ${P.hi} Pok&eacute;mon, ${T.lo} to ${T.hi} Trainers and ${E.lo} to ${E.hi} Energy. The right split depends on the deck.</dd>
  <dt>Why does my Pok&eacute;mon deck keep losing?</dt>
  <dd>The usual causes are an attacker that cannot pay for its attack, an evolution with nothing to evolve from, no steady way to draw cards, or too few Basic Pok&eacute;mon to start well. A grader like RdyDeck names which of these your list has.</dd>
  <dt>Does this work for Pok&eacute;mon TCG Pocket?</dt>
  <dd>No. RdyDeck grades 60 card decks for the Pok&eacute;mon Trading Card Game, played with paper cards or in Pok&eacute;mon TCG Live. Pok&eacute;mon TCG Pocket decks have 20 cards and different rules.</dd>
</dl>

<h2>Grade your deck now</h2>
<p>RdyDeck does every check on this page in a few seconds. It is free, has no paid tier, needs no account and works offline once it has loaded. <a href="how-grading-works.html">How grading works</a> explains exactly what the grade measures.</p>
<div class="cta-row"><a class="cta" href="./">Grade my deck</a></div>`;
  return page({
    file: 'improve-your-deck.html',
    title: 'How to Improve Your Pokémon TCG Deck: 7 Checks | RdyDeck',
    desc: 'How to make your Pokémon TCG deck better: the 7 checks to run, with typical counts from recent top 16 lists, and a free deck grader that runs them for you.',
    kicker: 'Deck building',
    h1: 'How to improve your Pok&eacute;mon TCG deck',
    body, faq: true,
  });
}

// ── 3.1: Official rules, from rulings.json ──────────────────────────────────────────────────
// Only rules The Pokémon Company International publishes itself, in our own words, each with its
// document and page. Card by card rulings wait until they can be cited from an official original.
const rul = existsSync(path.join(ROOT, 'rulings.json')) ? read('rulings.json') : null;
function rulingsPage() {
  if (!rul || !Array.isArray(rul.rulings) || !rul.rulings.length) return null;
  const src = id => (rul.sources || []).find(s => s.id === id) || null;
  const topics = [...new Set(rul.rulings.map(r => r.topic))];
  const cite = r => { const s = src(r.src); return s ? `<span class="note">Source: <a href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a> (${esc([s.edition, r.where].filter(Boolean).join(', '))})</span>` : ''; };
  const body = `<p>Common Pok&eacute;mon TCG rules questions, answered from the official rulebook and tournament handbook that The Pok&eacute;mon Company International publishes. Each answer is in our own words and names the document and page it comes from, so you can check it there. RdyDeck shows the matching rules when you tap a card in a deck.</p>
${topics.map(t => `
<h2>${esc(t)}</h2>
<dl>
${rul.rulings.filter(r => r.topic === t).map(r => `  <dt id="${esc(r.id)}">${esc(r.q)}</dt>
  <dd>${esc(r.a)}<br>${cite(r)}</dd>`).join('\n')}
</dl>`).join('\n')}

<h2>What is not here yet</h2>
<p>Pok&eacute;mon also rules on how two specific cards work together. Those rulings are not on this page yet: RdyDeck only adds one when it can point to an official document that states it. When a rule here and a card's text disagree, the card's text wins, and a judge at your event has the final word.</p>
<p class="note">Rules as of ${day(rul.asOf)}. RdyDeck is an unofficial fan-made app, not affiliated with Nintendo, Creatures, GAME FREAK or The Pok&eacute;mon Company.</p>
<div class="cta-row"><a class="cta" href="./">Grade my deck</a></div>`;
  return page({
    file: 'rulings.html',
    title: 'Pokémon TCG Rules: Damage, Prizes, Abilities and More | RdyDeck',
    desc: 'Common Pokémon TCG rules questions answered from the official rulebook: damage order, Weakness and Resistance, Pokémon ex and Tera, ACE SPEC, evolving and Special Conditions.',
    kicker: 'Rules',
    h1: 'Pok&eacute;mon TCG rules, from the official rulebook',
    body, faq: true,
  });
}

// ── 3.0: How accurate the grades are, from accuracy.json ──────────────────────────────────────
// One row per set: how closely the grades rank decks against their online win rates (Spearman),
// with the decks ranked and the games played. Only the scoreboard, nothing about how it is tuned.
const rho = v => typeof v === 'number' && isFinite(v) ? v.toFixed(2) : 'Too few';
// 3.0.1: one count, explained: every list the grade check grades, and how many of them the scoreboard uses.
function accCount() {
  const total = Array.isArray(lists) ? lists.length : 0, used = acc.lists || 0, out = total - used;
  if (!total || out <= 0) return `Every week RdyDeck grades the same ${num(used || total)} top 16 lists from recent events.`;
  return `Every week RdyDeck grades the same ${num(total)} top 16 lists from recent events. ${num(used)} of them are used here; the other ${num(out)} ${out === 1 ? 'uses' : 'use'} cards that have rotated or older printings.`;
}
function accuracyHtml() {
  const sets = acc && Array.isArray(acc.sets) ? acc.sets.filter(x => x && x.name) : [];
  if (!sets.length) return '';
  const a = sets[0].min, b = sets[sets.length - 1].min;
  const mins = a && b && a !== b ? `${num(a)} games in a set, or ${num(b)} in the newest one` : `${num(a || b || 0)} games in a set`;
  return `<h2 id="accuracy">How accurate the grades are</h2>
<p>${accCount()} RdyDeck checks the order its grades put those decks in against how the decks actually win in ${esc(acc.source || 'Limitless online tournaments')}. The number is a rank match: 1.0 means the grades put the decks in exactly the order of their results, 0 means no link.</p>
<div class="tw"><table>
  <thead><tr><th>Set</th><th>Dates</th><th class="n">Decks</th><th class="n">Games</th><th class="n">Grade as shown</th><th class="n">Cards alone</th></tr></thead>
  <tbody>
${sets.map(x => `    <tr><td>${esc(x.name)}</td><td>${day(x.from)} to ${day(x.to)}</td><td class="n">${num(x.decks || 0)}</td><td class="n">${num(x.games || 0)}</td><td class="n">${rho(x.shown)}</td><td class="n">${rho(x.cards)}</td></tr>`).join('\n')}
  </tbody>
</table></div>
<p class="note">Grade as shown is the grade the app shows. It counts these same results, so it is partly circular and runs high. Cards alone is the grade from each list's cards with no results, the harder test. Decks is how many different decks those lists make up that have enough games to rank: a deck is ranked once it has ${mins}. Updated ${day(acc.asOf)}.</p>
`;
}

// ── pages written by hand in .github/pages/*.html (kept out of the site's own folders, so the bare source is never served as a page) ──────────────────────────────────────────────────────
// Each starts with one comment line of JSON: {"file", "title", "desc", "kicker", "h1"}.
function handPages() {
  const dir = path.join(ROOT, '.github/pages');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.html')).sort().map(f => {
    const src = readFileSync(path.join(dir, f), 'utf8');
    const m = /^<!--\s*(\{[\s\S]*?\})\s*-->\n/.exec(src);
    if (!m) throw new Error(`.github/pages/${f}: the first line must be a <!-- {json} --> header`);
    const meta = JSON.parse(m[1]);
    const body = src.slice(m[0].length).replace(/^<!-- accuracy:[^\n]*-->\n/m, () => accuracyHtml());
    return [meta.file, page({ ...meta, body })];
  });
}

const out = [
  ['meta-decks.html', indexPage()],
  ...guides.decks.filter(g => mcById[g.id]).map(g => [`deck-${g.slug}.html`, deckPage(g)]),
  ...handPages(),
  ...(improvePage() ? [['improve-your-deck.html', improvePage()]] : []),
  ...(rulingsPage() ? [['rulings.html', rulingsPage()]] : []),
];
const missing = guides.decks.filter(g => !mcById[g.id]).map(g => g.title);
if (missing.length) console.warn('No card data for: ' + missing.join(', ') + '. Their pages were not rebuilt.');
let changed = 0;
for (const [file, html] of out) {
  if (ONLY && file !== ONLY) continue;
  if (/[\u2013\u2014]/.test(html)) throw new Error(`${file} has an en or em dash`);
  const p = path.join(ROOT, file);
  if (existsSync(p) && readFileSync(p, 'utf8') === html) continue;
  changed++;
  if (CHECK) console.log('Would change: ' + file);
  else writeFileSync(p, html);
}
console.log(`${out.length} pages, ${changed} ${CHECK ? 'out of date' : 'written'}.`);
if (CHECK && changed) process.exitCode = 1;
