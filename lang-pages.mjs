// 3.6.8: a home page address for each language, for search engines.
// The app is translated in the browser (js/i18n.js), so search engines only ever saw the English home
// page. This writes es/index.html, pt/index.html, fr/index.html, de/index.html and it/index.html from
// index.html. Each is the same app with its own html lang, canonical, title, description, preview text and
// structured data language, and the app opens in that language (js/i18n.js reads it from the address).
// index.html carries the hreflang links for all six, so every copy carries them too.
//
// The copies link the app's files from the site root (/js/core.js, /cards/), so they share the browser and
// service worker caches with the English page. Files the app reads by relative address at run time
// (cards.json, rulings.html) are answered from the site root by the Worker (worker/rdydeck-worker.js, langFile).
//
// Usage: node lang-pages.mjs           write the five pages (node app-file.mjs --stamp runs this too)
//        node lang-pages.mjs --check   fail if a page is missing or out of date, or a check fails
//                                      (node app-file.mjs --check runs this too)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SITE = 'https://rdydeck.com/';

// Order and codes match js/i18n.js (I18N_LANGS, I18N_HTML_LANG). hreflang uses the html lang.
export const LANG_PAGES = [
  { code: 'es', html: 'es',
    title: 'RdyDeck: califica tu baraja de Pokémon TCG gratis',
    desc: 'Califica tu baraja de Pokémon TCG sobre 10 por sus cartas y, en barajas conocidas, por torneos online y presenciales locales. Mira qué corregir. Gratis.',
    alt: 'Logo de RdyDeck junto a la pantalla de Calificación de una baraja de Mega Rayquaza: 7.9 de 10, Sólida, con su arreglo principal, Sinergia y Poder.' },
  { code: 'pt', html: 'pt-BR',
    title: 'RdyDeck: avalie seu deck de Pokémon TCG grátis',
    desc: 'Avalie seu deck de Pokémon TCG de 0 a 10 pelas cartas e, em decks conhecidos, pelos torneios online e presenciais locais. Veja o que corrigir. Grátis.',
    alt: 'Logo do RdyDeck ao lado da tela de Nota de um deck de Mega Rayquaza: 7.9 de 10, Forte, com a principal correção, Sinergia e Poder.' },
  { code: 'fr', html: 'fr',
    title: 'RdyDeck : notez votre deck du JCC Pokémon gratuitement',
    desc: 'Notez votre deck du JCC Pokémon sur 10 selon ses cartes et, pour les decks connus, les tournois en ligne et locaux. Découvrez quoi corriger. Gratuit.',
    alt: "Logo de RdyDeck à côté de l'écran Note d'un deck Mega Rayquaza : 7.9 sur 10, Solide, avec sa correction principale, Synergie et Puissance." },
  { code: 'de', html: 'de',
    title: 'RdyDeck: Bewerte dein Pokémon TCG Deck kostenlos',
    desc: 'Bewerte dein Pokémon TCG Deck von 0 bis 10 nach seinen Karten und, bei bekannten Decks, nach Online- und lokalen Präsenzturnieren. Kostenlos.',
    alt: 'RdyDeck Logo neben dem Note-Bildschirm eines Mega Rayquaza Decks: 7.9 von 10, Stark, mit der Top-Korrektur, Synergie und Stärke.' },
  { code: 'it', html: 'it',
    title: 'RdyDeck: valuta il tuo mazzo del GCC Pokémon gratis',
    desc: 'Dai un voto su 10 al tuo mazzo del GCC Pokémon in base alle carte e, per i mazzi noti, ai tornei online e locali dal vivo. Scopri cosa sistemare. Gratis.',
    alt: 'Logo di RdyDeck accanto alla schermata Voto di un mazzo Mega Rayquaza: 7.9 su 10, Solido, con la correzione principale, Sinergia e Potenza.' },
];
export const pageUrl = code => code === 'en' ? SITE : SITE + code + '/';

/** The hreflang links index.html carries (and so every copy), English first, then x-default. */
export function hreflangBlock() {
  return [`<link rel="alternate" hreflang="en" href="${SITE}">`,
    ...LANG_PAGES.map(l => `<link rel="alternate" hreflang="${l.html}" href="${pageUrl(l.code)}">`),
    `<link rel="alternate" hreflang="x-default" href="${SITE}">`].join('\n');
}

const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Replace a pattern exactly `want` times, or throw: a changed index.html must not slip through half done. */
function swap(html, re, to, want, what) {
  let n = 0;
  const out = html.replace(re, (...a) => { n++; return typeof to === 'function' ? to(...a) : to; });
  if (n !== want) throw new Error(`${what}: found ${n} times, want ${want}`);
  return out;
}

/** A file address relative to the page (js/core.js, cards/, saira.woff2) as one from the site root. */
const RELATIVE = /^(?![a-z][a-z0-9+.-]*:)[A-Za-z0-9_][^"'<>{}$+\s]*$/i;

export function makePage(index, l) {
  let h = index;
  h = swap(h, /^<!DOCTYPE html>\n<html lang="en">/, `<!DOCTYPE html>\n<!-- Made by lang-pages.mjs from index.html. Edit index.html, then run node lang-pages.mjs. -->\n<html lang="${l.html}" data-page-lang="${l.code}">`, 1, 'html lang');
  h = swap(h, /<title>[^<]*<\/title>/, `<title>${esc(l.title)}</title>`, 1, 'title');
  h = swap(h, /(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*(")/g, (a, x, y) => x + esc(l.desc) + y, 3, 'descriptions');
  h = swap(h, /(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*(")/g, (a, x, y) => x + esc(l.title) + y, 2, 'preview titles');
  h = swap(h, /(<meta (?:property="og:image:alt"|name="twitter:image:alt") content=")[^"]*(")/g, (a, x, y) => x + esc(l.alt) + y, 2, 'image text');
  h = swap(h, /<link rel="canonical" href="https:\/\/rdydeck\.com\/">/, `<link rel="canonical" href="${pageUrl(l.code)}">`, 1, 'canonical');
  h = swap(h, /<meta property="og:url" content="https:\/\/rdydeck\.com\/">/, `<meta property="og:url" content="${pageUrl(l.code)}">`, 1, 'og:url');
  h = swap(h, /"inLanguage":"en"/g, `"inLanguage":"${l.html}"`, 2, 'inLanguage');
  // Files from the site root, so /es/ loads the very same /js/core.js?v=... as the English page.
  h = h.replace(/(\s(?:src|href)=")([^"]*)(")/g, (a, x, u, y) => RELATIVE.test(u) ? x + '/' + u + y : a);
  h = h.replace(/url\(([A-Za-z0-9_][\w.-]*\.woff2)\)/g, 'url(/$1)');
  return h;
}

/** Checks on index.html and a made page; returns a list of problems. */
export function checkPage(html, code) {
  const bad = [];
  const want = hreflangBlock();
  if (html.split(want).length - 1 !== 1) bad.push(`${code}: hreflang links missing or changed (want all six plus x-default, once)`);
  const canon = [...html.matchAll(/<link rel="canonical" href="([^"]*)">/g)].map(m => m[1]);
  if (canon.length !== 1 || canon[0] !== pageUrl(code)) bad.push(`${code}: canonical ${canon.join(', ')}, want ${pageUrl(code)}`);
  const lang = (/^<!DOCTYPE html>\n(?:<!--[^\n]*-->\n)?<html lang="([^"]+)"/.exec(html) || [])[1];
  const wantLang = code === 'en' ? 'en' : LANG_PAGES.find(l => l.code === code).html;
  if (lang !== wantLang) bad.push(`${code}: html lang ${lang}, want ${wantLang}`);
  if (code !== 'en') {
    const rel = [...html.matchAll(/<script src="([^"]*)"/g)].map(m => m[1]).filter(u => !u.startsWith('/'));
    if (rel.length) bad.push(`${code}: scripts not from the site root: ${rel.slice(0, 3).join(', ')}`);
    if (/url\((?!\/|data:|#|https?:)/.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) bad.push(`${code}: a CSS url() is not from the site root`);
  }
  return bad;
}

/** Write (or, with check, compare) the five pages from index.html; returns a list of problems. */
export function langPages(check) {
  const index = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const bad = checkPage(index, 'en');
  for (const l of LANG_PAGES) {
    const file = path.join(ROOT, l.code, 'index.html');
    let made;
    try { made = makePage(index, l); } catch (e) { bad.push(`${l.code}: ${e.message}`); continue; }
    bad.push(...checkPage(made, l.code));
    if (check) {
      if (!existsSync(file)) bad.push(`${l.code}/index.html is missing (run node lang-pages.mjs)`);
      else if (readFileSync(file, 'utf8') !== made) bad.push(`${l.code}/index.html is out of date (run node lang-pages.mjs)`);
    } else if (!existsSync(file) || readFileSync(file, 'utf8') !== made) {
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, made);
    }
  }
  return bad;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const check = process.argv.includes('--check');
  const bad = langPages(check);
  if (bad.length) { bad.forEach(b => console.error('FAIL ' + b)); process.exit(1); }
  console.log(check ? 'Language pages are up to date.' : `Language pages written: ${LANG_PAGES.map(l => l.code + '/index.html').join(', ')}.`);
}
