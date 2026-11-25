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
//        node build-pages.mjs --guides  writes only the pages a deck guide shows on: meta-decks.html,
//                                      every deck-*.html, the card guides (cards/*.html) and the guide
//                                      links of Top decks on home (js/v90-top-decks.js). Use it
//                                      after adding a guide to deck-guides.json, so the hand edited
//                                      pages (FAQ, About and the rest) are left alone.
//
// 3.0: how-grading-works.html gets its How accurate the grades are section from accuracy.json,
// written each week by tests/grade-check.mjs --results --board=accuracy.json.
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const read = f => JSON.parse(readFileSync(path.join(ROOT, f), 'utf8'));
const CHECK = process.argv.includes('--check');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7);
const GUIDES = process.argv.includes('--guides');

const guides = read('deck-guides.json');
const data = read('data.json');
const mc = read('meta-cards.json');
const mu = read('matchups.json');
// Nov 19 2026: matchups.json can list local in-person store events as a second source.
const MU_IP = Array.isArray(mu.sources) && mu.sources.some(s => s.id === 'inperson');
const MU_WHERE = MU_IP ? 'online and local in-person tournaments' : 'online tournaments';
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

// 3.5.12: one capitalization rule. Headings (h1 to h3) and the site's link labels are in Title Case:
// minor words stay lowercase unless first or last, card suffixes (ex, V) stay as printed, and a
// heading that asks a question keeps sentence case. Applied to every built page as it is written, so
// the words in this file and in .github/pages can stay as they read in a sentence. The breadcrumb and
// structured data keep the sentence form, as on the live pages.
const MINOR = new Set('a an the and but or nor for of in on at to by vs vs. with from as per into via'.split(' '));
const titleCase = s => { const ws = s.split(' '); return ws.map((w, i) => {
  if (!/^[a-z]/.test(w) || /^(ex|v|vmax|vstar)$/.test(w)) return w;
  const first = i === 0 || /[:(]$/.test(ws[i - 1]) || /^\(/.test(w), last = i === ws.length - 1;
  if (!first && !last && MINOR.has(w.replace(/[^a-z']/g, ''))) return w;
  return w.replace(/^([("']?)([a-z])/, (m, p, c) => p + c.toUpperCase()).replace(/-([a-z])/g, (m, c) => '-' + c.toUpperCase());
}).join(' '); };
const LINK_CAPS = ['Card guides', 'Deck checker', 'Improve your deck', 'Opening hand odds', 'Rotation check', 'Rotation checker', 'Prize trainer',
  'Rules and rulings', 'Your first deck', 'Goldfish your deck', 'Deck guides', 'How grading works', 'Delete your data', 'Opening odds'];
const capsHtml = html => {
  html = html.replace(/<(h[1-3])([^>]*)>([^<>]+)<\/\1>/g, (m, h, a, t) => /\?\s*$/.test(t) || a.includes('rd-age-h') ? m : `<${h}${a}>${titleCase(t)}</${h}>`);
  for (const l of LINK_CAPS) html = html.split('>' + l + '</a>').join('>' + titleCase(l) + '</a>');
  return html;
};

// ── the page shell, the same look as the guide pages already on the site ──────────────────────
const NAV = [
  ['./', 'RdyDeck'], ['meta-decks.html', 'Deck Guides'], ['how-grading-works.html', 'How Grading Works'],
  ['faq.html', 'FAQ'], ['about.html', 'About'], ['contact.html', 'Contact'],
  ['terms.html', 'Terms of Service'], ['privacy.html', 'Privacy Policy'], ['delete-data.html', 'Delete Your Data'],
];
// The free tools and guides, linked from every guide page so search engines and readers find them.
const TOOLS = [
  ['deck-grader.html', 'Deck Checker'], ['improve-your-deck.html', 'Improve Your Deck'], ['opening-odds.html', 'Opening Hand Odds'],
  ['rotation.html', 'Rotation Check'], ['prize-trainer.html', 'Prize Trainer'], ['rulings.html', 'Rules and Rulings'],
  ['cards/', 'Card Guides'], ['first-deck.html', 'Your First Deck'], ['goldfish.html', 'Goldfish Your Deck'], ['daily-games.html', 'Daily Games'],
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
  .cta-row { display:flex; flex-wrap:wrap; gap:0 0.6rem; align-items:center; }
  .cta.cta2 { background:transparent; color:var(--text); box-shadow:inset 0 0 0 2px var(--mark); }
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
  footer nav.tools { margin:0 0 1rem; font-weight:600; }
  .crumbs { font-size:0.875rem; color:var(--text-3); margin:0.8rem 0 0; }
  .crumbs a { color:var(--text-2); }
  .crumbs span[aria-hidden] { margin:0 0.4rem; }
  footer a { color:var(--text-2); }
  .card-top { display:flex; gap:1.2rem; align-items:flex-start; margin:1rem 0 0.4rem; }
  .card-top .tw { flex:1; min-width:0; }
  .card-top table { margin:0; }
  tr.you td { color:var(--text); font-weight:600; }
  .card-art { flex:0 0 auto; width:180px; margin:0; }
  .card-art img { display:block; width:100%; height:auto; aspect-ratio:274/381; border-radius:4.5%; background:var(--line); }
  @media (max-width:520px) { .card-top { flex-direction:column; align-items:center; } .card-art { width:min(240px, 70vw); } .card-top .tw { width:100%; } }`;
// The card guide styles, left out of the pages written by hand that never had them (cardCss: false).
const CARD_CSS = STYLE.slice(STYLE.indexOf('\n  .card-top {'));

export function footerHtml(up = '') {
  const a = ([h, t]) => `<a href="${up}${h}">${t}</a>`;
  return `  <footer>
    <nav class="tools" aria-label="Free tools">${TOOLS.map(a).join('')}</nav>
    <p>RdyDeck is free, has no account and works offline once it has loaded. Unofficial fan-made app. Not affiliated with Nintendo, Creatures, GAME FREAK or The Pok&eacute;mon Company. Card names, text and images are &copy; The Pok&eacute;mon Company, Nintendo, Creatures and GAME FREAK.</p>
    <nav aria-label="Site">${NAV.map(a).join('')}<a class="rd-social" href="https://www.instagram.com/rdydeck/" rel="me noopener" target="_blank">Instagram</a></nav>
  </footer>`;
}

// Plain text from a bit of page HTML, for structured data: tags dropped, the entities these pages use decoded.
const plain = h => String(h).replace(/<[^>]+>/g, '').replace(/&eacute;/g, '\u00e9').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
  .replace(/&#39;|&rsquo;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
// The question and answer pairs (<dt> then <dd>) on a page, so Google and AI assistants can read them as an FAQ.
const faqPairs = body => [...String(body).matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)].map(m => [plain(m[1]), plain(m[2])]);

function page({ file, title, desc, crumb, kicker, h1, body, og = 'og-deck-grader.png', ogAlt = '', type = 'article', faq = false, updated = '', extraLd = [], index = true, cardCss = true }) {
  const url = 'https://rdydeck.com/' + file.replace(/(^|\/)index\.html$/, '$1');
  const up = '../'.repeat(file.split('/').length - 1);
  const qa = faq ? faqPairs(body) : [];
  const name = plain(h1);
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': url + '#page', url, name: title, inLanguage: 'en',
      isPartOf: { '@type': 'WebSite', '@id': 'https://rdydeck.com/#site', name: 'RdyDeck', url: 'https://rdydeck.com/' },
      about: { '@id': 'https://rdydeck.com/#app' }, primaryImageOfPage: 'https://rdydeck.com/' + og, breadcrumb: { '@id': url + '#crumbs' },
      ...(updated ? { dateModified: updated } : {}) },
    ...(type === 'article' && updated ? [{ '@type': 'Article', '@id': url + '#article', headline: name, description: desc, dateModified: updated,
      mainEntityOfPage: { '@id': url + '#page' }, image: 'https://rdydeck.com/' + og, inLanguage: 'en',
      author: { '@type': 'Organization', name: 'RdyDeck', url: 'https://rdydeck.com/' },
      publisher: { '@type': 'Organization', name: 'Optume Ventures LLC', url: 'https://rdydeck.com/' } }] : []),
    { '@type': 'BreadcrumbList', '@id': url + '#crumbs', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'RdyDeck', item: 'https://rdydeck.com/' },
      ...(crumb ? [{ '@type': 'ListItem', position: 2, name: crumb[0], item: 'https://rdydeck.com/' + crumb[1] }] : []),
      { '@type': 'ListItem', position: crumb ? 3 : 2, name, item: url },
    ] },
    ...(qa.length ? [{ '@type': 'FAQPage', '@id': url + '#faq', url, mainEntity: qa.map(([q, a]) => (
      { '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }] : []),
    ...extraLd,
  ] };
  const crumbs = `<nav class="crumbs" aria-label="Breadcrumb"><a href="${up || './'}">RdyDeck</a><span aria-hidden="true">›</span>${crumb
    ? `<a href="${up}${crumb[1]}">${esc(crumb[0])}</a><span aria-hidden="true">›</span>` : ''}<span aria-current="page">${esc(name)}</span></nav>`;
  const t = esc(title), d = esc(desc);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="robots" content="noindex" data-mirror>
${index ? '' : NOINDEX_HERE + '\n'}<script>
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
<meta property="og:image:alt" content="${ogAlt ? esc(ogAlt) : 'RdyDeck. Pok&eacute;mon TCG deck checker.'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="https://rdydeck.com/${og}">
<meta name="theme-color" content="#131210">
<link rel="icon" type="image/svg+xml" href="${up}icon.svg">
<link rel="apple-touch-icon" href="${up}apple-touch-icon.png">
<link rel="manifest" href="${up}manifest.json">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>
${(cardCss ? STYLE : STYLE.replace(CARD_CSS, '')).replace(/url\((saira)/g, 'url(' + up + '$1')}
</style>
<script>try { if (localStorage.getItem('ptcg_theme') === 'light') document.documentElement.dataset.theme = 'light'; } catch (e) {}</script>
<style>.rd-nosocial .rd-social { display:none !important; }
.rd-age { position:fixed; inset:0; z-index:50; display:flex; align-items:center; justify-content:center; padding:1rem; background:rgba(0,0,0,0.6); }
.rd-age form { width:100%; max-width:22rem; background:var(--bg); color:var(--text); border:2px solid var(--rule); padding:1.2rem; font-family:var(--font); }
.rd-age h2 { margin:0 0 0.8rem; padding:0; border:0; font-size:1.2rem; }
.rd-age .row { display:flex; gap:0.6rem; }
.rd-age select, .rd-age input { flex:1; min-width:0; min-height:44px; font:inherit; color:var(--text); background:transparent; border:1px solid var(--line); padding:0 0.6rem; }
.rd-age select option { color:#1a1814; background:#f2eee5; }
.rd-age p { margin:0.7rem 0 0; font-size:0.875rem; }
.rd-age .btns { display:flex; justify-content:flex-end; gap:0.6rem; margin-top:1rem; }
.rd-age button { min-height:44px; padding:0 1rem; font:inherit; color:var(--text); background:transparent; border:1px solid var(--line); cursor:pointer; }
.rd-age button[type=submit] { background:var(--mark); border-color:var(--mark); color:#fff; }
.rd-age button:disabled { opacity:0.45; cursor:default; }</style>
<script>
// 3.2.8: Instagram and YouTube are for ages 13 and up. Their links stay hidden for anyone who told
// RdyDeck they are under 13. In the Google Play app, someone who has not given an age is asked a
// neutral question (birth month and year, no default, no hint of an age limit) when they tap one.
// 13 or older opens the link; under 13 does not, and the links stay hidden from then on. Only the
// age group is kept, on this device, under the same key as the app's own age question.
(function () {
  var KEY = 'pt_age_v32', mode = '';
  try {
    var r = String(document.referrer || ''), rp = false;
    try { var u = new URL(r); rp = u.origin === location.origin && u.searchParams.get('src') === 'play'; } catch (e) {}
    var play = new URLSearchParams(location.search).get('src') === 'play' || r.indexOf('android-app://com.rdydeck.app') === 0 || rp || sessionStorage.getItem('pt_channel') === 'play';
    var age = localStorage.getItem(KEY) || '';
    mode = age === 'u13' ? 'hide' : (play && age !== 'teen' && age !== 'adult') ? 'ask' : '';
  } catch (e) { mode = 'hide'; }
  var root = document.documentElement;
  if (mode === 'hide') { root.classList.add('rd-nosocial'); return; }
  if (mode !== 'ask') return;
  var T = {
    en: ['When were you born?', 'Month', 'Year', 'Your answer stays on this device.', 'Cancel', 'Continue'],
    es: ['¿Cuándo naciste?', 'Mes', 'Año', 'Tu respuesta se queda en este dispositivo.', 'Cancelar', 'Continuar'],
    pt: ['Quando você nasceu?', 'Mês', 'Ano', 'Sua resposta fica neste aparelho.', 'Cancelar', 'Continuar'],
    fr: ['Mois et année de naissance', 'Mois', 'Année', 'Votre réponse reste sur cet appareil.', 'Annuler', 'Continuer'],
    de: ['Wann bist du geboren?', 'Monat', 'Jahr', 'Deine Antwort bleibt auf diesem Gerät.', 'Abbrechen', 'Weiter'],
    it: ['Mese e anno di nascita', 'Mese', 'Anno', 'La tua risposta resta su questo dispositivo.', 'Annulla', 'Continua']
  };
  function lang() {
    var l = ''; try { l = localStorage.getItem('rd_lang') || ''; } catch (e) {}
    if (!T[l]) { var n = String((navigator.languages && navigator.languages[0]) || navigator.language || '').toLowerCase().slice(0, 2); l = T[n] ? n : 'en'; }
    return l;
  }
  function ask(href) {
    if (document.querySelector('.rd-age')) return;
    var l = lang(), t = T[l], now = new Date(), Y = now.getFullYear(), M = now.getMonth() + 1, opts = '<option value="" selected disabled>' + t[1] + '</option>';
    var name = function (m) { try { return new Intl.DateTimeFormat(l === 'pt' ? 'pt-BR' : l, { month: 'long' }).format(new Date(2000, m - 1, 15)); } catch (e) { return String(m); } };
    for (var m = 1; m <= 12; m++) opts += '<option value="' + m + '">' + name(m) + '</option>';
    var w = document.createElement('div');
    w.className = 'rd-age';
    w.innerHTML = '<form role="dialog" aria-modal="true" aria-labelledby="rd-age-h"><h2 id="rd-age-h">' + t[0] + '</h2><div class="row"><select aria-label="' + t[1] + '">' + opts +
      '</select><input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="' + t[2] + '" aria-label="' + t[2] + '"></div><p>' + t[3] +
      '</p><div class="btns"><button type="button">' + t[4] + '</button><button type="submit" disabled>' + t[5] + '</button></div></form>';
    document.body.appendChild(w);
    var f = w.querySelector('form'), s = w.querySelector('select'), y = w.querySelector('input'), go = w.querySelector('button[type=submit]');
    function val() { var yr = +y.value, mo = +s.value; return mo && /^\\d{4}$/.test(y.value) && yr >= Y - 120 && (yr < Y || (yr === Y && mo <= M)) ? [yr, mo] : null; }
    function close() { w.remove(); document.removeEventListener('keydown', esc, true); }
    function esc(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', esc, true);
    s.addEventListener('change', function () { go.disabled = !val(); });
    y.addEventListener('input', function () { y.value = y.value.replace(/\\D/g, ''); go.disabled = !val(); });
    w.querySelector('button[type=button]').addEventListener('click', close);
    w.addEventListener('click', function (e) { if (e.target === w) close(); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = val(); if (!v) return;
      // The youngest they can be: a birthday in this month counts as not yet reached.
      var a = Y - v[0] - (v[1] >= M ? 1 : 0), band = a < 13 ? 'u13' : a < 18 ? 'teen' : 'adult';
      try { localStorage.setItem(KEY, band); } catch (x) {}
      close();
      if (band === 'u13') { mode = 'hide'; root.classList.add('rd-nosocial'); return; }
      mode = '';
      window.open(href, '_blank', 'noopener');
    });
    s.focus();
  }
  document.addEventListener('click', function (e) {
    if (!mode || !e.target.closest) return;
    var a = e.target.closest('a.rd-social, .rd-social a');
    if (!a) return;
    e.preventDefault();
    if (mode === 'ask') ask(a.href);
  }, true);
})();
</script>
</head>
<body>
<main>
  <div class="top"><a class="brand" href="${up || './'}"><span>Rdy</span>Deck</a><a class="open" href="${up || './'}">Open RdyDeck</a></div>
  ${crumbs}

  <p class="kicker">${kicker}</p>
  <h1>${h1}</h1>
${body.trim().split('\n').map(l => l ? '  ' + l.replace(/^ {2}/, '') : l).join('\n')}

${footerHtml(up)}
</main>
<script src="${up}ads.js" defer></script>
<script src="${up}js/leave.js" defer></script>
<script>
// The app's service worker, so this page and the app open with no signal next time.
if ('serviceWorker' in navigator) addEventListener('load', function () { navigator.serviceWorker.register('${up}sw.js', { scope: '${up || './'}' }).catch(function () {}); });
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
// 3.4.36: small card pictures in the deck guides, from the same picture host as the card guides.
const LTCG = 'https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/';
function thumbUrls(x) {
  const clean = String(x[2]).replace(/^0+(\d)/, '$1'), pad = clean.padStart(3, '0');
  return [`${LTCG}${x[1]}/${x[1]}_${pad}_R_EN_XS.png`, `${LTCG}${x[1]}/${x[1]}_${clean}_R_EN_XS.png`, `${LTCG}${x[1]}/${x[1]}_${pad}_R_EN_SM.png`];
}
/** A card's cell in a deck guide table: its small picture, then its name. data-f holds the fallbacks (CARD_IMG_FALLBACK). */
function cardCell(x) {
  const [src, ...f] = thumbUrls(x);
  return `<span class="ci"><img src="${src}" data-f="${f.join(' ')}" alt="" width="34" height="47" loading="lazy" decoding="async">${cardLink(x[0])}</span>`;
}
/** Tries the next picture in data-f when one fails, and hides the picture when none is left. */
const DECK_PIC_CSS = `<style>
.deck-top { margin-top:0.4rem; }
.deck-top .card-art { width:170px; }
.deck-top .card-art figcaption { font-size:0.8rem; color:var(--text-3); text-align:center; margin-top:0.35rem; }
.deck-top .lead { margin-top:0; }
.ci { display:flex; align-items:center; gap:0.55rem; }
.ci img { flex:0 0 auto; width:34px; height:auto; aspect-ratio:136/189; border-radius:3px; background:var(--line); }
@media (max-width:520px) { .deck-top .card-art { width:min(190px, 52vw); } .ci img { width:28px; } }
</style>`;
const CARD_IMG_FALLBACK = `<script>document.addEventListener('error', function (e) { var i = e.target; if (!i || i.tagName !== 'IMG' || !i.hasAttribute('data-f')) return; var f = i.getAttribute('data-f').split(' ').filter(Boolean); if (f.length) { i.setAttribute('data-f', f.slice(1).join(' ')); i.src = f[0]; } else { i.removeAttribute('data-f'); i.style.visibility = 'hidden'; } }, true);</script>`;
/** The deck's lead card picture: the first key card that is a Pokémon, as its card guide shows it. */
function deckHero(g, c) {
  for (const [k] of g.keys) {
    const cp1 = cardByName[k];
    const x = c.cards.filter(y => y[0] === k && y[3] === 'P').sort((a, b) => b[6] - a[6])[0];
    if (!(cp1 ? /Pok/.test(cp1.supertype) : x)) continue;
    const set = cp1 ? cp1.set : x[1], no = cp1 ? cp1.no : x[2];
    const label = `${k}, ${set} ${no}`;
    const sm = artUrl({ set, no });
    return `<figure class="card-art"><img src="${sm}" data-f="${sm.replace('_SM.png', '.png')}" alt="${esc(k)} card, ${esc(set)} ${esc(no)}" width="274" height="381" decoding="async"><figcaption>${esc(label)}</figcaption></figure>`;
  }
  return '';
}

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
${rows.map(x => `    <tr><td class="n">${x[4]}</td><td>${cardCell(x)}</td><td>${esc(x[1])} ${esc(x[2])}</td><td class="n">${Math.round(x[6] * 100)}%</td></tr>`).join('\n')}
  </tbody>
</table></div>
`;
  }
  const coreN = core.reduce((a, x) => a + x[4], 0);
  h += `<p>That is ${coreN} of the 60 cards. The rest of each list is made of flex slots, and these are the most common choices:</p>
<div class="tw"><table>
  <thead><tr><th class="n">Count</th><th>Card</th><th>Set</th><th class="n">In lists</th></tr></thead>
  <tbody>
${flex.map(x => `    <tr><td class="n">${x[4]}</td><td>${cardCell(x)}</td><td>${esc(x[1])} ${esc(x[2])}</td><td class="n">${Math.round(x[6] * 100)}%</td></tr>`).join('\n')}
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
  if (s.games) facts.push(`<li><strong>${MU_IP ? 'Tournament' : 'Online'} record:</strong> ${pct(s.rec[0], s.games)} wins over ${num(s.games)} games ${s.curGames >= s.games
    ? `since ${esc(curName)} came out`
    : `since ${day(mu.since)}${s.curGames ? `, and ${pct(s.cur[0], s.curGames)} over ${num(s.curGames)} games since ${esc(curName)}` : ''}`}.</li>`);
  if (s.grade) facts.push(`<li><strong>RdyDeck grade:</strong> ${r1(s.grade.g)} out of 10 for its top lists.</li>`);
  const hero = deckHero(g, c);
  const top = `<p class="lead">${esc(g.lead)}</p>
<ul>
${facts.map(f => '  ' + f).join('\n')}
</ul>`;
  const body = `
${DECK_PIC_CSS}
${CARD_IMG_FALLBACK}
${hero ? `<div class="card-top deck-top">${hero}<div class="tw">
${top}
</div></div>` : top}
<div class="cta-row"><a class="cta" href="./">Grade my ${esc(g.title)} list</a><a class="cta cta2" href="./#add=${esc(g.id)}">Add the top list to my decks</a></div>

<h2>Game Plan</h2>
${g.plan.map(p => `<p>${esc(p)}</p>`).join('\n')}

<h2>Key Cards</h2>
<dl>
${g.keys.map(([k, v]) => `  <dt>${cardLink(k)}</dt><dd>${esc(v)}</dd>`).join('\n')}
</dl>

<h2>The Core List</h2>
<p>These cards are in at least 90% of ${esc(g.title)} lists, at their usual count. They come from ${basis}, ${num(c.tops)} lists in all, on Limitless online tournaments.</p>
${coreTables(c)}
<h2>Matchups</h2>
<p>How ${esc(g.title)} has done against the most played decks in Limitless ${MU_WHERE} since ${day(mu.since)}, as of ${day(mu.asOf)}. Mirror matches are left out. Results with fewer than 20 games are grayed out, since they can swing a lot either way.</p>
${matchupTable(g, s)}
<p class="note">These are results for decks like this one, not one exact list.</p>

<h2>How RdyDeck Grades It</h2>
${s.grade ? `<p>${s.grade.n === 1 ? `RdyDeck grades the one ${esc(g.title)} list in its test set, a top 16 finish${s.gradeDates ? ` on ${day(s.gradeDates[0])}` : ''}, at ${r1(s.grade.g)} out of 10. Its Synergy is ${r1(s.grade.s)} and its Power is ${r1(s.grade.p)}.` : `RdyDeck grades the ${s.grade.n} ${esc(g.title)} lists in its test set, all top 16 finishes${s.gradeDates ? ` from ${day(s.gradeDates[0])} to ${day(s.gradeDates[1])}` : ''}, at ${r1(s.grade.g)} out of 10 (the middle value). Their middle Synergy is ${r1(s.grade.s)} and their middle Power is ${r1(s.grade.p)}.`} The grade is not simply Synergy times Power, since it also counts the deck's online results and lowers the grade for how tightly a list fits only when the fit is loose.</p>\n` : ''}<p>${esc(g.grade)}</p>
<p>Your own list will grade differently, since the grade reads every card you run. <a href="how-grading-works.html">How Grading Works</a> explains each part.</p>
<div class="cta-row"><a class="cta" href="./">Rate my deck</a></div>
<p>To test your own copy before an event, <a href="goldfish.html">goldfish it</a>: play its first turns alone in RdyDeck with real draws and see how often ${esc(g.title)} sets up on time.</p>

<h2>More Deck Guides</h2>
<ul class="guides">
${guides.decks.filter(x => x.id !== g.id).map(x => `  <li><a href="deck-${x.slug}.html">${esc(x.title)}</a></li>`).join('\n')}
</ul>
<p class="note">Tournament numbers are from <a href="${esc(data.meta.src)}">Limitless TCG</a> ${MU_IP ? 'online tournaments and local in-person store events' : 'online tournaments'}, read once a week and credited to them. Card details are from each card's own text.</p>
`;
  return page({
    file: `deck-${g.slug}.html`,
    og: existsSync(path.join(ROOT, `og/deck-${g.slug}.png`)) ? `og/deck-${g.slug}.png` : 'og/deck-guide.png', ogAlt: `RdyDeck. ${g.title} deck guide.`,
    title: [`${g.title} Deck Guide: List, Game Plan and Matchups | RdyDeck`, `${g.title} Deck Guide: List and Matchups | RdyDeck`, `${g.title} Deck Guide | RdyDeck`]
      .find(t => t.length <= 60) || `${g.title} Deck Guide | RdyDeck`,
    desc: g.desc || `How ${g.title} plays in the Pokémon TCG: the core list from top finishes, the game plan, key cards, matchups and how RdyDeck grades it.`,
    updated: mu.asOf,
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
  // Nov 25 2026 (SEO): a plain summary of the meta at the top, written from the same numbers as the table.
  const st = guides.decks.map(g => [g, stats(g)]);
  const byShare = st.filter(([, x]) => x.share != null).sort((a, b) => b[1].share - a[1].share).slice(0, 3);
  const MIN_GAMES = 300;
  const best = st.filter(([, x]) => x.games >= MIN_GAMES).sort((a, b) => b[1].rec[0] / b[1].games - a[1].rec[0] / a[1].games)[0];
  const link = g => `<a href="deck-${g.slug}.html">${esc(g.title)}</a>`;
  const listOf = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a.join('');
  const summary = byShare.length ? `<p>The most played decks right now are ${listOf(byShare.map(([g, x]) => `${link(g)} (${esc(x.share)}%)`))}, by share of players ${FIELD}.${best
    ? ` Of the decks with at least ${MIN_GAMES} games since ${day(mu.since)}, ${link(best[0])} has the best win rate, ${pct(best[1].rec[0], best[1].games)} over ${num(best[1].games)} games.` : ''}</p>` : '';
  const body = `
<p class="lead">The Pok&eacute;mon TCG meta decks winning tournaments right now: what each one runs, how it plays, what it beats, and how RdyDeck grades it. Updated every week from real tournament results.</p>
${summary}
<p>Each guide is built from real results. The core lists come from the top finishes of Limitless online tournaments, the matchups from every game played in them${MU_IP ? ' and in local in-person store events' : ''} since ${day(mu.since)}, and the grades from RdyDeck's own deck checker run on top 16 lists. The game plans are written from the cards' own text, so you can check every claim against the card.</p>

<h2>The Decks</h2>
<div class="tw"><table>
  <thead><tr><th>Deck</th><th class="n">Field share</th><th class="n">Win rate</th><th class="n">Grade</th></tr></thead>
  <tbody>
${rows.join('\n')}
  </tbody>
</table></div>
<p class="note">Field share is the share of players ${FIELD}. Win rate is wins over all games since ${day(mu.since)}, as of ${day(mu.asOf)}. Grade is RdyDeck's grade for the deck's top lists, out of 10.</p>

<h2>What the Meta Is</h2>
<p>The meta is the set of decks most players bring to events right now. It moves when a new set comes out, when a deck wins a big event and others copy it, and when players find an answer to the deck on top. Knowing the meta tells you what you will face, which matchups matter most, and which tech cards are worth a slot.</p>

<h2>Reading the Numbers</h2>
<p>A win rate a little over 50% is good in a format this crowded: most decks sit between 47% and 53%, and only a handful stay above 55% over thousands of games. A deck with a small share and a high win rate can be a strong pick that few people have found yet, or a deck that has only played a few events, so check the number of games before reading much into it.</p>
<p>The grade and the record measure different things. The grade reads the cards in a list: do they work together, and can the plan win. The record shows how the deck has actually done. RdyDeck blends the two, and <a href="how-grading-works.html">How Grading Works</a> explains how much each one counts.</p>

<h2>How to Pick a Meta Deck</h2>
<ul>
  <li><strong>Start with what you enjoy:</strong> you will play a deck better after many games with it, and you play more games with a deck you like.</li>
  <li><strong>Check the matchups:</strong> each guide lists what the deck beats and what it struggles against. A deck that beats the most played decks can do well even with a small share.</li>
  <li><strong>Count what you own:</strong> the core list in each guide shows the cards nearly every top list runs, so you can see what you still need before you build.</li>
  <li><strong>Check rotation:</strong> if your event is after the next rotation, run the <a href="rotation.html">rotation checker</a> on the list first.</li>
</ul>

<h2>Rate Your Own List</h2>
<p>Paste your list from Pok&eacute;mon TCG Live or Limitless into RdyDeck and it rates it out of 10, matches it to the closest of these decks, and shows what to fix first. It is free, needs no account and works offline.</p>
<div class="cta-row"><a class="cta" href="./">Rate my deck</a></div>
<p class="note">Tournament numbers are from <a href="${esc(data.meta.src)}">Limitless TCG</a> ${MU_IP ? 'online tournaments and local in-person store events' : 'online tournaments'}, read once a week and credited to them.</p>
`;
  return page({
    file: 'meta-decks.html', og: 'og/meta-decks.png', ogAlt: 'RdyDeck. Pokémon TCG meta decks.',
    title: 'Pokémon TCG Meta Decks: Top Decks, Lists and Guides | RdyDeck',
    desc: 'The top Pokémon TCG meta decks right now, with field share, win rates and grades, and a guide to each deck: core list, game plan and matchups.',
    updated: mu.asOf,
    kicker: 'Deck guides',
    h1: 'Pok&eacute;mon TCG meta decks',
    body,
    extraLd: [{ '@type': 'ItemList', '@id': 'https://rdydeck.com/meta-decks.html#decks', name: 'Pokémon TCG meta deck guides',
      itemListElement: guides.decks.filter(g => mcById[g.id]).map((g, i) => ({ '@type': 'ListItem', position: i + 1, name: g.title + ' deck guide', url: `https://rdydeck.com/deck-${g.slug}.html` })) }],
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
  const rows = staples.map(([name, cs]) => `    <tr><td>${cardLink(name)}</td><td class="n">${cs.length} of ${n}</td><td class="n">${median(cs)}</td></tr>`);
  const when = dates.length ? `from ${day(dates[0])} to ${day(dates[dates.length - 1])}` : '';
  const body = `<p class="lead">To improve a Pok&eacute;mon TCG deck, check it in this order: every card is legal, every attacker can pay for its attack and every evolution has what it evolves from, the deck has a steady way to draw and search, its counts sit near what winning lists run, and it has a plan against the decks you will face. RdyDeck, a free deck checker, runs these checks for you: paste your decklist and it rates the deck out of 10 and names what to fix first.</p>
<div class="cta-row"><a class="cta" href="./">Rate my deck free</a></div>

<h2>1. Make Sure Every Card Is Legal</h2>
<p>A card that is not Standard legal makes the deck unplayable at an event, so fix this first. Check each card's regulation mark. An older printing is still legal when a reprint with the same name, attacks and Abilities is legal now. The <a href="rotation.html">rotation checker</a> marks which cards are legal now and which may rotate next.</p>

<h2>2. Give Every Card What It Needs</h2>
<p>Every attacker needs the Energy its attacks cost, and every evolution needs the Pok&eacute;mon it evolves from. A Stage 2 line also wants Rare Candy or enough search to find both stages. These gaps are the most common reason a deck stalls, and they are easy to miss when you build from a list of favourite cards.</p>

<h2>3. Build a Steady Way to Draw and Search</h2>
<p>A deck needs to find the same few cards every game: draw Supporters, search Items, or a Pok&eacute;mon with a draw or search Ability. Without one, even strong attackers sit in the deck. A deck with a draw engine but single copies of cards it needs often will still miss them, so run more copies of what you need every game and fewer one of a kind ideas.</p>

<h2>4. Compare Your Counts with Winning Lists</h2>
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

<h2>5. Check Your Opening Odds</h2>
<p>How often you mulligan, start without your attacker or put a key card in your prizes is just maths on your list. Too few Basic Pok&eacute;mon means more mulligans. One copy of a key card means it is often prized. <a href="opening-odds.html">Opening Odds</a> works these out for your exact list.</p>

<h2>6. Plan for the Decks You Will Face</h2>
<p>A deck that wins the prize race against the most played decks will do well even if it loses to a rare one. Look at which decks are popular now, how your attacker trades against them, and whether a tech card would swing a common matchup. The <a href="meta-decks.html">deck guides</a> list each top deck's record and matchups from real tournament games.</p>

<h2>7. Practice with the Deck</h2>
<p>A better list only helps if you play it well. Knowing which cards went to your prizes changes what you search for. The <a href="prize-trainer.html">prize trainer</a> drills this with your own deck.</p>

<h2>Common Questions</h2>
<dl>
  <dt>Is there a free tool that rates my Pok&eacute;mon deck?</dt>
  <dd>Yes. RdyDeck rates a 60 card Pok&eacute;mon TCG deck out of 10 for free, with no account. Paste a list from Pok&eacute;mon TCG Live or Limitless TCG and it scores Synergy and Power, compares the deck with recent tournament results and lists what to fix first.</dd>
  <dt>How many Pok&eacute;mon, Trainers and Energy should a Pok&eacute;mon deck have?</dt>
  <dd>A deck has exactly 60 cards. In ${n} recent top 16 lists the typical split was ${P.med} Pok&eacute;mon, ${T.med} Trainers and ${E.med} Energy, with the middle half of lists running ${P.lo} to ${P.hi} Pok&eacute;mon, ${T.lo} to ${T.hi} Trainers and ${E.lo} to ${E.hi} Energy. The right split depends on the deck.</dd>
  <dt>Why does my Pok&eacute;mon deck keep losing?</dt>
  <dd>The usual causes are an attacker that cannot pay for its attack, an evolution with nothing to evolve from, no steady way to draw cards, or too few Basic Pok&eacute;mon to start well. A deck checker like RdyDeck names which of these your list has.</dd>
  <dt>Does this work for Pok&eacute;mon TCG Pocket?</dt>
  <dd>No. RdyDeck rates 60 card decks for the Pok&eacute;mon Trading Card Game, played with paper cards or in Pok&eacute;mon TCG Live. Pok&eacute;mon TCG Pocket decks have 20 cards and different rules.</dd>
</dl>

<h2>Rate Your Deck Now</h2>
<p>RdyDeck does every check on this page in a few seconds. It is free, has no paid tier, needs no account and works offline once it has loaded. <a href="how-grading-works.html">How Grading Works</a> explains exactly what the grade measures.</p>
<div class="cta-row"><a class="cta" href="./">Rate my deck</a></div>`;
  return page({
    file: 'improve-your-deck.html', cardCss: false, og: 'og/improve.png', ogAlt: 'RdyDeck. Improve your deck.',
    title: 'How to Improve Your Pokémon TCG Deck: 7 Checks | RdyDeck',
    desc: 'How to make your Pokémon TCG deck better: 7 checks with typical counts from recent top 16 lists, and a free deck checker that runs them for you.',
    updated: mu.asOf,
    kicker: 'Deck building',
    h1: 'How to improve your Pok&eacute;mon TCG deck',
    body, faq: true,
  });
}

// ── Your first deck: the official deck rules with their rulebook pages, then what top lists run ──
// The rules are cited from rulings.json's rulebook source. The counts come from tests/grade-lists.json, like improvePage.
function firstDeckPage() {
  if (!lists.length || !rul) return null;
  const rb = (rul.sources || []).find(s => s.id === 'rb');
  if (!rb) return null;
  const n = lists.length;
  const part = (l, p) => l.cards.filter(c => c.part === p).reduce((a, c) => a + c.count, 0);
  const P = median(lists.map(l => part(l, 'pokemon'))), T = median(lists.map(l => part(l, 'trainer'))), E = median(lists.map(l => part(l, 'energy')));
  const types = lists.map(l => new Set(l.cards.filter(c => c.part === 'energy' && /^(Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal) Energy$/.test(c.name)).map(c => c.name)).size);
  const twoOrFewer = types.filter(t => t <= 2).length;
  const runs = {};
  for (const l of lists) for (const c of new Set(l.cards.filter(c => c.part === 'trainer').map(c => c.name))) runs[c] = (runs[c] || 0) + 1;
  const staples = Object.entries(runs).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
  const rows = staples.map(([name, k]) => `    <tr><td>${cardLink(name)}</td><td class="n">${Math.round(100 * k / n)}%</td></tr>`);
  const src = where => `<p class="note">Source: <a href="${esc(rb.url)}" rel="noopener">${esc(rb.title)}</a>, ${esc(rb.publisher)} (${esc([rb.edition, where].join(', '))}).</p>`;
  const body = `<p class="lead">A Pok&eacute;mon TCG deck has exactly 60 cards, no more than 4 cards with the same name except Basic Energy, and at least 1 Basic Pok&eacute;mon. Inside those rules, a good first deck is built around one main attacker, the Pok&eacute;mon and Energy it needs, and the draw and search cards nearly every winning deck plays.</p>
<div class="cta-row"><a class="cta" href="./">Rate my deck</a></div>

<h2>The Deck Building Rules</h2>
<ul>
  <li><strong>Exactly 60 cards.</strong> Not 59 and not 61.</li>
  <li><strong>No more than 4 cards with the same name,</strong> except Basic Energy, which has no limit. Cards with the same name count together even if their attacks are different.</li>
  <li><strong>At least 1 Basic Pok&eacute;mon,</strong> since you need one to start the game. Your opening hand needs one too, or you mulligan.</li>
  <li><strong>Only 1 ACE SPEC card in the whole deck,</strong> not 1 of each.</li>
</ul>
${src('pp. 22 and 23')}
<p>For tournaments, every card also has to be legal in the format you play. In Standard that is set by each card's regulation mark, and the <a href="rotation.html">rotation checker</a> marks which of your cards are legal now. The <a href="rulings.html">rules page</a> answers more rules questions, each with its source.</p>

<h2>Start from a Deck That Already Works</h2>
<p>The rulebook's own advice is to take a ready-made ex Battle Deck you like and change it, keeping it at exactly 60 cards. You can do the same with a winning list: the <a href="meta-decks.html">deck guides</a> show the cards top players run in each deck, and RdyDeck has starter decks built in, so you can open one and change it card by card.</p>

<h2>Pick One Attacker and One or Two Energy Types</h2>
<p>Choose the Pok&eacute;mon you want to attack with, then put in its whole evolution line and the Energy its attack costs. The rulebook suggests one or two Energy types at most, and ${twoOrFewer} of the ${n} top 16 lists we test with play two types of Basic Energy or fewer. A second attacker for matchups where the first one struggles is the next thing to add.</p>

<h2>How Many Pok&eacute;mon, Trainers and Energy</h2>
<p>The rulebook's starting point is 12 to 15 Energy and about 20 to 25 Trainer cards, with the rest Pok&eacute;mon. Winning lists today lean further toward Trainers. Across ${n} recent top 16 lists from Limitless online tournaments, the typical deck ran:</p>
<div class="tw"><table>
  <thead><tr><th>Part</th><th class="n">Rulebook starting point</th><th class="n">Typical top 16 list</th></tr></thead>
  <tbody>
    <tr><td>Pok&eacute;mon</td><td class="n">the rest</td><td class="n">${P}</td></tr>
    <tr><td>Trainers</td><td class="n">20 to 25</td><td class="n">${T}</td></tr>
    <tr><td>Energy</td><td class="n">12 to 15</td><td class="n">${E}</td></tr>
  </tbody>
</table></div>
${src('p. 22')}
<p>The extra Trainers are mostly draw and search, which find your attacker every game. If you are just starting, a few more Energy than the top lists run is fine while you learn the deck.</p>

<h2>The Trainers Most Decks Play</h2>
<p>These Trainer cards are played in more of those ${n} lists than any others, whatever the deck. They are a good first set of slots to fill:</p>
<div class="tw"><table>
  <thead><tr><th>Trainer</th><th class="n">Share of top lists</th></tr></thead>
  <tbody>
${rows.join('\n')}
  </tbody>
</table></div>

<h2>Check the Deck Before You Play It</h2>
<p>Paste your list into RdyDeck and it rates the deck out of 10, names what to fix first, such as an attacker that cannot pay for its attack or an evolution with nothing to evolve from, and shows how often you will mulligan. It is free, needs no account and works offline. <a href="improve-your-deck.html">How to improve your deck</a> walks through the same checks by hand.</p>
<div class="cta-row"><a class="cta" href="./">Rate my deck</a></div>

<h2>Common Questions</h2>
<dl>
  <dt>How many cards are in a Pok&eacute;mon TCG deck?</dt>
  <dd>Exactly 60. The deck can have no more than 4 cards with the same name, except Basic Energy, and needs at least 1 Basic Pok&eacute;mon.</dd>
  <dt>How many Energy should a beginner Pok&eacute;mon deck have?</dt>
  <dd>The official rulebook suggests 12 to 15 Energy in a new 60 card deck. Recent top 16 lists run fewer, ${E} in a typical list, since many of them use Trainers and Abilities that find or attach Energy.</dd>
  <dt>Can I put more than 4 of a card in my deck?</dt>
  <dd>Only Basic Energy. Every other card is limited to 4 copies with the same name, and ACE SPEC cards to 1 in the whole deck.</dd>
  <dt>Is there a free tool to check my first deck?</dt>
  <dd>Yes. RdyDeck rates a 60 card deck out of 10 for free and lists what to fix first. It checks how the deck plays, not the condition of your cards.</dd>
</dl>`;
  return page({
    file: 'first-deck.html', cardCss: false, og: 'og/first-deck.png', ogAlt: 'RdyDeck. Your first deck.',
    title: 'How to Build Your First Pokémon TCG Deck | RdyDeck',
    desc: 'Build your first Pokémon TCG deck: the official 60 card deck rules, how many Pokémon, Trainers and Energy top lists run, and a free deck checker.',
    updated: rul.asOf,
    kicker: 'Beginner guide',
    h1: 'How to build your first Pok&eacute;mon TCG deck',
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
  const cite = r => { const s = src(r.src); return s ? `<span class="note">Source: <a href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a>, ${esc(s.publisher)} (${esc([s.edition, r.where].filter(Boolean).join(', '))})${s.pdf ? `, <a href="${esc(s.pdf)}" rel="noopener">PDF</a>` : ''}. Checked ${day(r.checked || s.checked)}.</span>` : ''; };
  const body = `<p>Common Pok&eacute;mon TCG rules questions, answered from the official rulebook, tournament handbook and rules posts that The Pok&eacute;mon Company International publishes. Each answer is in our own words and names the document and the page or section it comes from, so you can check it there. RdyDeck shows the matching rules when you tap a card in a deck.</p>
${topics.map(t => `
<h2>${esc(t)}</h2>
<dl>
${rul.rulings.filter(r => r.topic === t).map(r => `  <dt id="${esc(r.id)}">${esc(r.q)}</dt>
  <dd>${esc(r.a)}<br>${cite(r)}</dd>`).join('\n')}
</dl>`).join('\n')}

<h2>What Is Not Here Yet</h2>
<p>Pok&eacute;mon also rules on how two specific cards work together. Most of those rulings are not on this page yet: RdyDeck only adds one when The Pok&eacute;mon Company International has published it where anyone can read it. When a rule here and a card's text disagree, the card's text wins, and a judge at your event has the final word.</p>
<p class="note">Rules as of ${day(rul.asOf)}. RdyDeck is an unofficial fan-made app, not affiliated with Nintendo, Creatures, GAME FREAK or The Pok&eacute;mon Company.</p>
<div class="cta-row"><a class="cta" href="./">Rate my deck</a></div>`;
  return page({
    file: 'rulings.html', og: 'og/rulings.png', ogAlt: 'RdyDeck. Rules and rulings.',
    title: 'Pokémon TCG Rules: Damage, Prizes and Abilities | RdyDeck',
    desc: 'Pokémon TCG rules answered from the official rulebook: setup and mulligans, damage order, Weakness, Pokémon ex, Tera, ACE SPEC and more.',
    updated: rul.asOf,
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
  return `<h2 id="accuracy">How Accurate the Grades Are</h2>
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
// 3.4.33 kept card guides out of search while they were mostly the card's printed text. 3.4.34 built
// them out (notes in our words, draw odds, trends, win records), so they are back in search and the
// sitemap. 3.4.35 keeps out the thinnest ones (see thinCard): they stay up and linked, with noindex,
// follow, and leave the sitemap until they have more to say.
const NOINDEX_HERE = '<meta name="robots" content="noindex, follow">';
const THIN_FILES = new Set();

// ── 3.2: one guide page per card (cards/*.html), from .github/card-pages.json ──────────────────
// The text is the card's own, from pokemon-tcg-data (card-pages-data.mjs writes the file). What
// each deck does with it is from deck-guides.json (our own words) and meta-cards.json (counts).
const cp = existsSync(path.join(ROOT, '.github/card-pages.json')) ? read('.github/card-pages.json') : { cards: [] };
const cardByName = Object.fromEntries(cp.cards.map(c => [c.name, c]));
// 3.4.34: a few sentences per card in our own words, what it does and why decks play it (.github/card-notes.json).
const cardNotes = existsSync(path.join(ROOT, '.github/card-notes.json')) ? read('.github/card-notes.json').notes : {};
/** The card's name, linked to its guide page when it has one. up is '../' from inside cards/. */
const cardLink = (name, up = '') => cardByName[name] ? `<a href="${up}cards/${cardByName[name].slug}.html">${esc(name)}</a>` : esc(name);
const guideByTitle = Object.fromEntries(guides.decks.map(g => [g.id, g]));
const ENERGY = { Grass: 'Grass', Fire: 'Fire', Water: 'Water', Lightning: 'Lightning', Psychic: 'Psychic', Fighting: 'Fighting', Darkness: 'Darkness', Metal: 'Metal', Dragon: 'Dragon', Colorless: 'Colorless' };
function cardKind(c) {
  const sub = c.subtypes || [];
  if (c.supertype === 'Pokémon') {
    const stage = ['Stage 2', 'Stage 1', 'Basic', 'MEGA'].find(x => sub.includes(x)) || 'Basic';
    return `${stage === 'MEGA' ? 'Mega Evolution' : stage} ${(c.types || []).join(' and ')} Pokémon${sub.includes('ex') ? ' ex' : ''}${sub.includes('Tera') ? ' (Tera)' : ''}`;
  }
  if (c.supertype === 'Energy') return sub.includes('Special') ? 'Special Energy' : 'Energy';
  const kind = ['Supporter', 'Stadium', 'Pokémon Tool', 'Item'].find(x => sub.includes(x)) || 'Trainer';
  return (sub.includes('ACE SPEC') ? 'ACE SPEC ' : '') + kind;
}
// Which rulings.json rules apply, the same way the app picks them when you tap a card (js/card-details.js).
function cardTags(c) {
  const t = new Set(), sub = (c.subtypes || []).map(x => x.toLowerCase()), kind = cardKind(c);
  // 3.4.35: Mega Evolution Pokémon ex get the ex rule too (its answer gives their 3 Prize cards), and an
  // ACE SPEC is read from its subtypes, so ACE SPEC Special Energy gets the ACE SPEC rule.
  if (/ ex$/.test(c.name)) t.add('ex');
  if (sub.includes('tera')) t.add('tera');
  if (kind.includes('ACE SPEC') || sub.includes('ace spec')) t.add('ace');
  if (kind.includes('Pokémon Tool')) t.add('tool');
  if (kind.includes('Stadium')) t.add('stadium');
  if (kind.includes('Supporter')) t.add('supporter');
  if (sub.includes('stage 1') || sub.includes('stage 2')) t.add('evolution');
  if (c.supertype === 'Trainer' && /\bevolve/i.test(c.rules.join(' '))) t.add('evolution');
  if (c.abilities.length) t.add('ability');
  const text = [...c.abilities.map(a => a.text), ...c.attacks.map(a => a.text), ...(c.supertype === 'Pokémon' ? [] : c.rules)].join(' ');
  if (/damage counters? on/i.test(text)) t.add('counters');
  if (/Benched Pok[eé]mon/i.test(text) && /damage/i.test(text)) t.add('bench');
  if (/\b(Asleep|Burned|Confused|Paralyzed|Poisoned)\b/.test(text)) t.add('condition');
  if (/\b(more|less) damage\b|damage done to (this|your)/i.test(text)) t.add('modifier');
  if (/\bRetreat Cost\b|\bswitch\b/i.test(text)) t.add('retreat');
  if (/during your (opponent's )?next turn/i.test(text)) t.add('lasting');
  if (/\bup to\b/i.test(text)) t.add('search');
  return t;
}
const nm = n => String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function cardRulings(c) {
  if (!rul) return [];
  const tags = cardTags(c);
  const named = rul.rulings.filter(r => (r.cards || []).some(x => nm(x) === nm(c.name)));
  return named.concat(rul.rulings.filter(r => !named.includes(r) && (r.tags || []).some(x => tags.has(x)))).slice(0, 4);
}
/** Decks whose top lists run the card, most played first: { d, share, count }. */
function cardDecks(name) {
  const rows = [];
  for (const d of mc.decks) {
    const x = d.cards.find(k => k[0] === name);
    if (x && x[6] >= 0.25) rows.push({ d, share: x[6], count: x[4] });
  }
  return rows.sort((a, b) => b.share * b.d.lists - a.share * a.d.lists);
}
const costWords = cost => cost.length ? cost.map(x => ENERGY[x] || x).join(', ') : 'no Energy';
const dLink = (d, up) => guideByTitle[d.id] ? `<a href="${up}deck-${guideByTitle[d.id].slug}.html">${esc(d.name)}</a>` : esc(d.name);


// ── 3.4.34: what RdyDeck's own numbers add to each card guide ──────────────────────────────────
const TOTAL_TOPS = mc.decks.reduce((a, d) => a + d.tops, 0);
const oppName = Object.fromEntries((mc.opponents || []).map(([id, n]) => [id, n]));
const pc = x => Math.round(x * 100) + '%';
/** The card's share of every top list RdyDeck counted, across all tracked decks. */
const cardShare = name => mc.decks.reduce((a, d) => { const x = d.cards.find(k => k[0] === name); return a + (x ? x[6] * d.tops : 0); }, 0) / (TOTAL_TOPS || 1);
// Hypergeometric: the chance of at least one of k copies among n cards drawn from a 60 card deck.
function choose(n, r) { if (r < 0 || r > n) return 0; let v = 1; for (let i = 1; i <= r; i++) v = v * (n - r + i) / i; return v; }
const atLeastOne = (k, n) => 1 - choose(60 - k, n) / choose(60, n);
const allOf = (k, n) => choose(60 - k, n - k) / choose(60, n);
/** Card art from the same picture host the app tries first (Limitless TCG's card images). */
const artUrl = c => `https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/${c.set}/${c.set}_${String(c.no).replace(/^0+(\d)/, '$1').padStart(3, '0')}_R_EN_SM.png`;
const copyWord = n => n === 1 ? 'copy' : 'copies';
function oddsHtml(c, decks) {
  const top = decks[0];
  if (!top || !top.count) return '';
  const k = Math.min(4, top.count);
  if (c.supertype === 'Energy' && /Basic/.test((c.subtypes || []).join(' '))) return '';
  const rows = [1, 2, 3, 4];
  const tr = rows.map(n => `  <tr${n === k ? ' class="you"' : ''}><td>${n} ${copyWord(n)}</td><td class="n">${pc(atLeastOne(n, 7))}</td><td class="n">${pc(atLeastOne(n, 8))}</td><td class="n">${pc(atLeastOne(n, 6))}</td></tr>`).join('\n');
  const prizedAll = allOf(k, 6);
  return `
<h2>Odds of Drawing It</h2>
<p>${esc(top.d.name)} lists usually run ${k} ${copyWord(k)}. With ${k} in a 60 card deck, you start with at least one in your 7 card opening hand ${pc(atLeastOne(k, 7))} of the time, and ${pc(atLeastOne(k, 8))} of the time once you draw for your first turn. At least one ends up in your Prize cards ${pc(atLeastOne(k, 6))} of the time${k > 1 ? `, and ${k === 2 ? 'both' : 'all ' + k} ${prizedAll < 0.001 ? 'less than 0.1%' : (prizedAll * 100).toFixed(1) + '%'} of the time` : ''}.</p>
<div class="tw"><table><thead><tr><th>Copies</th><th class="n">In opening hand</th><th class="n">After first draw</th><th class="n">At least one prized</th></tr></thead><tbody>
${tr}
</tbody></table></div>
<p class="note">Plain draw odds before mulligans or any card that searches the deck. <a href="../opening-odds.html">Opening Odds</a> works these out for your whole list, and the <a href="../prize-trainer.html">prize trainer</a> helps you spot prized cards faster.</p>
`;
}
function trendHtml(c) {
  const rows = [];
  for (const d of mc.decks) for (const t of (d.trend && d.trend.cards) || []) {
    if (t[0] === c.name && Math.abs(t[3] - t[2]) >= 0.1 && d.trend.late >= 50) rows.push({ d, a: t[2], b: t[3], early: d.trend.early, late: d.trend.late });
  }
  if (!rows.length) return '';
  rows.sort((x, y) => Math.abs(y.b - y.a) - Math.abs(x.b - x.a));
  return `
<h2>Rising or Falling</h2>
<p>The share of each deck's lists that run it, earlier in the window against the last two weeks (${day(mc.recent.since)} to ${day(mc.recent.until)}), where it moved by 10 points or more:</p>
<ul>
${rows.slice(0, 5).map(r => `  <li>${dLink(r.d, '../')}: ${r.b > r.a ? 'up' : 'down'} from ${pc(r.a)} of ${num(r.early)} lists to ${pc(r.b)} of ${num(r.late)}.</li>`).join('\n')}
</ul>`;
}
const MIN_MATCHES = 30;
function techHtml(c) {
  const rows = [];
  for (const d of mc.decks) for (const [opp, v] of Object.entries(d.techs || {})) for (const t of v.cards || []) {
    const [n, , w1, m1, w0, m0] = t;
    if (n !== c.name || m1 < MIN_MATCHES || m0 < MIN_MATCHES || !oppName[opp]) continue;
    rows.push({ d, opp: oppName[opp], w1, m1, w0, m0, gap: w1 / m1 - w0 / m0 });
  }
  if (!rows.length) return '';
  rows.sort((a, b) => b.gap - a.gap);
  return `
<h2>Does it win more?</h2>
<p>Matches from Limitless online tournaments where some lists of a deck ran ${esc(c.name)} and some did not, against the same opponent, with at least ${MIN_MATCHES} matches each way:</p>
<ul>
${rows.slice(0, 5).map(r => `  <li>${dLink(r.d, '../')} against ${esc(r.opp)}: with it, won ${r.w1} of ${r.m1} (${pc(r.w1 / r.m1)}). Without it, won ${r.w0} of ${r.m0} (${pc(r.w0 / r.m0)}).</li>`).join('\n')}
</ul>
<p class="note">A tie counts as a match that is not a win. These show what happened, not that the card caused it: better players may pick it, and other cards in the list matter too.</p>`;
}
function evoHtml(c, up) {
  if (c.supertype !== 'Pokémon') return '';
  const into = cp.cards.filter(x => x.evolvesFrom === c.name);
  if (!c.evolvesFrom && !into.length) return '';
  const from = c.evolvesFrom ? cardByName[c.evolvesFrom] : null;
  const back = from && from.evolvesFrom ? cardLink(from.evolvesFrom, up) + ' to ' : '';
  const parts = [];
  if (c.evolvesFrom) parts.push(`It evolves from ${back}${cardLink(c.evolvesFrom, up)}.`);
  if (into.length) parts.push(`${into.map(x => cardLink(x.name, up)).join(' and ')} ${into.length > 1 ? 'evolve' : 'evolves'} from it.`);
  return `\n<h2>Evolution Line</h2>\n<p>${parts.join(' ')}</p>\n`;
}
function partnersHtml(c, decks, up) {
  const top = decks[0];
  if (!top) return '';
  const near = top.d.cards.filter(k => k[0] !== c.name && k[6] >= 0.75 && cardByName[k[0]]).slice(0, 10);
  if (near.length < 2) return '';
  return `
<h2>Often Played With</h2>
<p>Other cards in at least three quarters of the ${esc(top.d.name)} top lists, with the usual count:</p>
<ul class="guides">
${near.map(k => `  <li>${cardLink(k[0], up)} (${k[4]})</li>`).join('\n')}
</ul>`;
}
const spread = (r, name) => { const h = (r.d.cards.find(k => k[0] === name) || [])[7] || []; return h.length > 1 && h[0][1] < 0.9 ? ` Counts: ${h.filter(([, s]) => s >= 0.05).map(([n, s]) => `${n} in ${pc(s)}`).join(', ')}.` : ''; };

/** A card guide with little of its own: played by 2 decks or fewer, and a short page (under THIN_WORDS words of
 *  its own, counted without the site header and footer). Mostly Basic Pokémon that only evolve and one-deck techs. */
const THIN_WORDS = 560;
const pageWords = body => body.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').split(/\s+/).filter(Boolean).length;
const thinCard = (decks, body) => decks.length <= 2 && pageWords(body) < THIN_WORDS;
function cardPage(c) {
  const up = '../', file = `cards/${c.slug}.html`, kind = cardKind(c), decks = cardDecks(c.name), rules = cardRulings(c);

  const top = decks[0];
  const fields = c.supertype === 'Pokémon' ? [
    ['HP', c.hp], ['Type', (c.types || []).join(', ')], ['Evolves from', c.evolvesFrom ? cardLink(c.evolvesFrom, up) : ''],
    ['Weakness', c.weak.join(', ') || 'None'], ['Resistance', c.resist.join(', ') || 'None'], ['Retreat Cost', c.retreat],
  ].filter(([, v]) => v !== '' && v != null) : [];
  const text = [
    ...(fields.length ? [`<div class="tw"><table><tbody>
${fields.map(([k, v]) => `  <tr><th>${k}</th><td>${typeof v === 'string' && v.startsWith('<a') ? v : esc(v)}</td></tr>`).join('\n')}
</tbody></table></div>`] : []),
    ...(c.abilities.length || c.attacks.length ? [`<dl>
${c.abilities.map(a => `  <dt>${esc(a.type || 'Ability')}: ${esc(a.name)}</dt><dd>${esc(a.text)}</dd>`).join('\n')}${c.abilities.length ? '\n' : ''}${c.attacks.map(a => `  <dt>${esc(a.name)}${a.damage ? ` (${esc(a.damage)} damage)` : ''}</dt><dd>Costs ${esc(costWords(a.cost))}.${a.text ? ' ' + esc(a.text) : ''}</dd>`).join('\n')}
</dl>`] : []),
    ...c.rules.map(r => `<p>${esc(r)}</p>`),
  ].join('\n');
  const used = decks.slice(0, 10).map(r => `  <li>${dLink(r.d, up)}: in ${Math.round(r.share * 100)}% of top lists, usually ${r.count} ${r.count === 1 ? 'copy' : 'copies'}.${spread(r, c.name)}</li>`).join('\n');
  const share = cardShare(c.name);
  const glance = [
    ['Card type', esc(kind)], ['Set', `${esc(c.setName)} (${esc(c.set)} ${esc(c.no)})`],
    ['Top lists', share >= 0.005 ? `${pc(share)} of all ${num(TOTAL_TOPS)}` : `under 1% of all ${num(TOTAL_TOPS)}`],
    ['Decks', `${decks.length} run it in a quarter or more of their top lists`],
    ...(top ? [['Usual count', `${top.count} in ${esc(top.d.name)}`]] : []),
  ];
  const art = `<figure class="card-art"><img src="${artUrl(c)}" alt="${esc(c.name)} card, ${esc(c.setName)} ${esc(c.no)}" width="274" height="381" loading="lazy" decoding="async"></figure>`;
  const notes = guides.decks.map(g => [g, (g.keys || []).find(([k]) => k === c.name)]).filter(([, k]) => k)
    .map(([g, k]) => `<h3>In ${esc(g.title)}</h3>\n<p>${esc(k[1])} <a href="${up}deck-${g.slug}.html">Read the ${esc(g.title)} guide</a>.</p>`).join('\n');
  const cite = r => { const s = (rul.sources || []).find(x => x.id === r.src); return s ? ` <span class="note">Source: <a href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a>, ${esc(s.publisher)} (${esc([s.edition, r.where].filter(Boolean).join(', '))}).</span>` : ''; };
  const lead = `${esc(c.name)} is ${/^[AEIOU]/.test(kind) ? 'an' : 'a'} ${esc(kind)} card from ${esc(c.setName)} (${esc(c.set)} ${esc(c.no)})${c.mark ? `, regulation mark ${esc(c.mark)}` : ''}.`
    + (top ? ` It is played most in ${esc(top.d.name)}, in ${Math.round(top.share * 100)}% of that deck's top lists${decks.length > 1 ? `, and ${decks.length - 1} other ${decks.length === 2 ? 'deck runs' : 'decks run'} it too` : ''}.` : '');
  const body = `
<p class="lead">${lead}</p>
<div class="card-top">${art}<div class="tw"><table><tbody>
${glance.map(([k, v]) => `  <tr><th>${k}</th><td>${v}</td></tr>`).join('\n')}
</tbody></table></div></div>
<div class="cta-row"><a class="cta" href="${up}">Grade a deck with ${esc(c.name)}</a></div>

<h2>Card Text</h2>
${text}
${cardNotes[c.name] ? `\n<h2>In Plain Words</h2>\n${[].concat(cardNotes[c.name]).map(x => `<p>${esc(x)}</p>`).join('\n')}\n` : ''}
<h2>Decks That Play It</h2>
${decks.length ? `<p>From the top lists of Limitless online tournaments from ${day(mc.since)} to ${day(mc.until)}. A deck is listed when at least a quarter of its top lists run the card${decks.length > 10 ? `. These are the 10 that play it most, of ${decks.length}` : ''}.</p>
<ul>
${used}
</ul>` : `<p>No top deck runs it in at least a quarter of its lists right now.</p>`}
${notes ? `\n<h2>How It Works in These Decks</h2>\n${notes}\n` : ''}${oddsHtml(c, decks)}${trendHtml(c)}${techHtml(c)}${evoHtml(c, up)}${partnersHtml(c, decks, up)}
<h2>Official Rules for It</h2>
${rules.length ? `<dl>
${rules.map(r => `  <dt><a href="${up}rulings.html#${esc(r.id)}">${esc(r.q)}</a></dt>\n  <dd>${esc(r.a)}${cite(r)}</dd>`).join('\n')}
</dl>` : `<p>No rule in the <a href="${up}rulings.html">rules list</a> is tied to this card yet.</p>`}
<p>When a rule and a card's text disagree, the card's text wins, and a judge at your event has the final word.</p>

<p class="note">Card text from <a href="https://github.com/PokemonTCG/pokemon-tcg-data" rel="noopener">pokemon-tcg-data</a>, as printed on ${esc(c.set)} ${esc(c.no)}. Card picture from Limitless TCG. Deck numbers from <a href="${esc(data.meta.src)}">Limitless TCG</a>, as of ${day(mc.asOf)}.</p>
`;
  const thin = thinCard(decks, body);
  if (thin) THIN_FILES.add(file);
  if (process.env.THIN_REPORT) console.log('words', pageWords(body), decks.length, file);
  const say = top ? `played most in ${top.d.name}` : 'its official rules';
  let desc = `${c.name}, ${/^[AEIOU]/.test(kind) ? 'an' : 'a'} ${kind} in the Pokémon TCG: what it does, ${say}, draw odds and win records.`;
  if ([...desc].length > 155) desc = `${c.name}: what this ${kind} does, the decks that run it, draw odds and win records.`;
  if ([...desc].length > 155) desc = `${c.name} in the Pokémon TCG: card text, decks that run it and official rules.`;
  if ([...desc].length < 70) desc = desc.replace(' in the Pokémon TCG:', ' in the Pokémon TCG, as played today:');
  return page({
    file, desc, updated: mc.asOf, crumb: ['Card guides', 'cards/'], kicker: 'Card guide', h1: esc(c.name), body, index: !thin,
    og: 'og/card-guide.png', ogAlt: `RdyDeck. ${c.name} card guide.`,
    title: [`${c.name}: Card Text, Decks and Rulings | RdyDeck`, `${c.name}: Card Text and Decks | RdyDeck`, `${c.name} Card Guide | RdyDeck`].find(t => t.length <= 60) || `${c.name} | RdyDeck`,
  });
}

function cardIndexPage() {
  if (!cp.cards.length) return null;
  const groups = [['Pokémon', c => c.supertype === 'Pokémon'], ['Trainers', c => c.supertype === 'Trainer'], ['Special Energy', c => c.supertype === 'Energy']];
  const body = `
<p class="lead">Guides to the Pok&eacute;mon TCG cards that top decks play right now: what each card does in plain words, the decks that run it and how many copies, the odds of drawing it or having it prized, whether its play is rising or falling, how lists with it have done, and the official rules that apply to it.</p>
<p>A card is here when at least half of the top lists of a guided deck, or of one of the 20 most played decks, run it. Numbers are from Limitless online tournaments from ${day(mc.since)} to ${day(mc.until)}.</p>
${groups.map(([h, f]) => { const cs = cp.cards.filter(f); return cs.length ? `
<h2>${h}</h2>
<ul class="guides">
${cs.map(c => `  <li><a href="${c.slug}.html">${esc(c.name)}</a></li>`).join('\n')}
</ul>` : ''; }).join('\n')}
<div class="cta-row"><a class="cta" href="../">Grade my deck</a></div>
`;
  return page({
    file: 'cards/index.html', title: 'Pokémon TCG Card Guides: Top Meta Cards | RdyDeck', updated: mc.asOf, og: 'og/card-index.png', ogAlt: 'RdyDeck. Pokémon TCG card guides.',
    desc: 'Guides to the Pokémon TCG cards top decks play now: card text, which decks run them and how often, and the official rules that apply.',
    kicker: 'Card guides', h1: 'Pok&eacute;mon TCG card guides', body, type: 'website',
  });
}

// How many turns Goldfish plays, read from the app itself, so the pages that describe it (goldfish.html,
// the FAQ) never say a different number from the app. {{GF_TURNS}} is the digit, {{GF_TURNS_WORD}} the word.
const GF_TURNS = (() => {
  const m = /^const GF_TURNS = (\d+);/m.exec(readFileSync(path.join(ROOT, 'js/core.js'), 'utf8'));
  if (!m) throw new Error('js/core.js: no GF_TURNS line, so the Goldfish pages cannot say how many turns it plays');
  return +m[1];
})();
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const gfTurns = s => s.replace(/\{\{GF_TURNS\}\}/g, String(GF_TURNS)).replace(/\{\{GF_TURNS_WORD\}\}/g, WORDS[GF_TURNS] || String(GF_TURNS));
function handPages() {
  const dir = path.join(ROOT, '.github/pages');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.html')).sort().map(f => {
    const src = readFileSync(path.join(dir, f), 'utf8');
    const m = /^<!--\s*(\{[\s\S]*?\})\s*-->\n/.exec(src);
    if (!m) throw new Error(`.github/pages/${f}: the first line must be a <!-- {json} --> header`);
    const meta = JSON.parse(gfTurns(m[1]));
    const body = gfTurns(src.slice(m[0].length)).replace(/^<!-- accuracy:[^\n]*-->\n/m, () => accuracyHtml());
    return [meta.file, page({ ...meta, body })];
  });
}

const out = [
  ['meta-decks.html', indexPage()],
  ...guides.decks.filter(g => mcById[g.id]).map(g => [`deck-${g.slug}.html`, deckPage(g)]),
  ...handPages(),
  ...(improvePage() ? [['improve-your-deck.html', improvePage()]] : []),
  ...(firstDeckPage() ? [['first-deck.html', firstDeckPage()]] : []),
  ...(rulingsPage() ? [['rulings.html', rulingsPage()]] : []),
  ...(cardIndexPage() ? [['cards/index.html', cardIndexPage()]] : []),
  ...cp.cards.map(c => [`cards/${c.slug}.html`, cardPage(c)]),
  // 3.4.35: which cards have a guide, so the app's card sheet can link "Read the guide" (js/card-details.js).
  ...(cp.cards.length ? [['card-guides.json', JSON.stringify({ schema: 1, note: 'Card name to its guide at cards/<slug>.html. Written by build-pages.mjs.', guides: Object.fromEntries(cp.cards.map(c => [c.name, c.slug])) }, null, 1) + '\n']] : []),
];
// 3.5.12: every page gets its headings and link labels in Title Case as it is written.
for (const e of out) if (e[0].endsWith('.html')) e[1] = capsHtml(e[1]);
// Nov 24 2026: Top decks on home (js/v90-top-decks.js) links a deck to its guide through TD90_GUIDES.
// The map is written here from deck-guides.json, so a new guide is linked from home by the same run
// that builds its page. tests/top-decks-guides-check.mjs lists Top decks that still need a guide.
{
  const f = 'js/v90-top-decks.js';
  const src = readFileSync(path.join(ROOT, f), 'utf8');
  const m = /const TD90_GUIDES = \{\n[\s\S]*?\n\};\n/.exec(src);
  if (!m) throw new Error(`${f}: TD90_GUIDES not found`);
  const map = guides.decks.filter(g => mcById[g.id]).map(g => `  '${g.id}': '${g.slug}',`).join('\n');
  out.push([f, src.replace(m[0], `const TD90_GUIDES = {\n${map}\n};\n`)]);
}
const missing = guides.decks.filter(g => !mcById[g.id]).map(g => g.title);
if (missing.length) console.warn('No card data for: ' + missing.join(', ') + '. Their pages were not rebuilt.');
// Nov 24 2026: --guides keeps a run to the pages that list or link deck guides.
const guidePage = f => f === 'meta-decks.html' || f === 'js/v90-top-decks.js' || /^deck-[a-z0-9-]+\.html$/.test(f) || /^cards\/(?!index\.html$)[a-z0-9-]+\.html$/.test(f);
const inScope = f => (!ONLY || f === ONLY) && (!GUIDES || guidePage(f));
let changed = 0;
for (const [file, html] of out) {
  if (!inScope(file)) continue;
  if (/[\u2013\u2014]/.test(html)) throw new Error(`${file} has an en or em dash`);
  const p = path.join(ROOT, file);
  if (existsSync(p) && readFileSync(p, 'utf8') === html) continue;
  changed++;
  if (CHECK) console.log('Would change: ' + file);
  else { mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, html); }
}
// Every built page is in sitemap.xml (a new page joins with today's date; update-sitemap.mjs keeps dates current).
{
  const sm = path.join(ROOT, 'sitemap.xml');
  let xml = readFileSync(sm, 'utf8');
  // 3.4.39: a page's place in the sitemap follows the noindex line on the page as it is on disk, not this
  // run's thin check. An --only run (the weekly data refresh) leaves the other pages as they were, so a guide
  // that grew past THIN_WORDS keeps its noindex until a full build, and must stay out of the sitemap until then.
  // The page as it will be served: what this run built if it writes (or, with --check, would write) that page,
  // otherwise the file already on disk.
  const built = new Map(out);
  const served = f => CHECK && inScope(f) ? built.get(f) : (existsSync(path.join(ROOT, f)) ? readFileSync(path.join(ROOT, f), 'utf8') : built.get(f));
  const outOfSearch = f => served(f).includes(NOINDEX_HERE);
  const html = out.map(([f]) => f).filter(f => f.endsWith('.html') && (!GUIDES || guidePage(f)));
  const listed = html.filter(f => !outOfSearch(f));
  const add = listed.map(f => f.replace(/(^|\/)index\.html$/, '$1')).filter(f => !xml.includes(`<loc>https://rdydeck.com/${f}</loc>`));
  const drop = html.filter(outOfSearch).filter(f => xml.includes(`<loc>https://rdydeck.com/${f}</loc>`));
  if (drop.length) {
    changed++;
    if (CHECK) console.log('In sitemap.xml but kept out of search: ' + drop.join(', '));
    else { for (const f of drop) xml = xml.replace(new RegExp(`  <url><loc>https://rdydeck\\.com/${f.replace(/[.]/g, '\\.')}</loc>.*?</url>\n`), ''); writeFileSync(sm, xml); }
  }
  if (add.length) {
    changed++;
    if (CHECK) console.log('Not in sitemap.xml: ' + add.join(', '));
    else {
      const today = new Date().toISOString().slice(0, 10);
      xml = xml.replace('</urlset>', add.map(f => `  <url><loc>https://rdydeck.com/${f}</loc><lastmod>${today}</lastmod></url>\n`).join('') + '</urlset>');
      writeFileSync(sm, xml);
    }
  }
}
console.log(`${out.length} pages, ${changed} ${CHECK ? 'out of date' : 'written'}.`);
if (CHECK && changed) process.exitCode = 1;
