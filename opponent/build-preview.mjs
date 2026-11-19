// One-file preview of the Sparring page, for review outside the site (nothing here is published by the site).
// node opponent/build-preview.mjs <out.html> [--own]
// --own: your saved decks switched on, with sample saved decks (tournament lists saved the way RdyDeck saves them,
// plus a few that show each note) in place of the browser's own, since a preview can't read rdydeck.com's storage.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv.slice(2).find(a => !a.startsWith('--')) || join(root, 'opponent', 'preview.html');
const OWN = process.argv.includes('--own');
let saved = '';
if (OWN) {
  const { savedDecks } = await import('./test/saved.mjs');
  const all = savedDecks(), want = ['Dragapult', 'Gardevoir', 'Mega Lucario', 'Crustle', "N's Zoroark", 'Mega Absol'];
  const decks = [];
  want.forEach(w => { const d = all.find(x => x.name === w && !decks.includes(x)); if (d) decks.push(d); });
  all.forEach(d => { if (decks.length < 6 && !decks.includes(d)) decks.push(d); });
  const S = decks.map((d, i) => Object.assign({}, d, { id: 's' + i, name: 'Sample: ' + d.name }));
  S.push({ id: 'odd', name: 'Sample with made-up cards', cards: S[1].cards.map(c => c.supertype === 'Trainer' && c.ttype === 'item' && !/ball/i.test(c.name) ? Object.assign({}, c, { name: 'Made-up ' + c.name, rtext: 'Do something no card has ever done before.' })
    : c.supertype === 'Energy' && /^(fire|water|grass|lightning|psychic|fighting|darkness|metal) energy$/i.test(c.name) ? Object.assign({}, c, { name: 'Made-up Energy', etext: 'This card is very strange.', sub: ['special'] }) : c) });
  S.push({ id: 'short', name: 'Sample with 58 cards', cards: S[0].cards.map((c, i) => i ? c : Object.assign({}, c, { count: c.count - 2 })) });
  saved = JSON.stringify({ decks: S, activeDeckId: 's0' });
}
const page = readFileSync(join(root, 'opponent', 'play.html'), 'utf8');
const css = page.match(/<style>([\s\S]*?)<\/style>/)[1]
  .replace(/@font-face[^}]*}/, '')
  .replace("font-family:'Saira', system-ui, sans-serif;", "font-family:'Saira', system-ui, sans-serif;")
  .replace(/body \{ padding:16px;/, 'body { padding-block:16px; padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px));');
const js = ['puzzle/text.js', 'puzzle/engine.js', 'opponent/game.js', 'opponent/effects.js', 'opponent/ai.js', 'opponent/decks.js', 'opponent/own.js', 'opponent/play.js',
  // the app's translations, every language loaded up front (the site loads French, German and Italian on demand)
  'js/i18n.js', 'js/i18n-fr.js', 'js/i18n-de.js', 'js/i18n-it.js']
  .map(f => readFileSync(join(root, f), 'utf8').replace('const OPP_ON = false;', 'const OPP_ON = true;')
    .replace('const OWN_ON = false;', OWN ? 'const OWN_ON = true;' : 'const OWN_ON = false;')
    .replace('function readSaved() {', OWN ? 'function readSaved() {\n  if (root.RD_SAVED) return Promise.resolve(root.RD_SAVED);' : 'function readSaved() {').replace(/<\/script/gi, '<\\/script'))
  .map(t => `<script>\n${t}\n</script>`).join('\n');
const html = `<title>Sparring | RdyDeck</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="robots" content="noindex, nofollow">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira:wght@400;600;700&display=swap">
<style>${css}</style>
<h1 data-no-tr><span class="r">Rdy</span>Deck Sparring</h1>
<div id="app"></div>
${OWN ? `<script>window.RD_SAVED = ${saved.replace(/<\//g, '<\\/')};</script>` : ''}
${js}
<script>['fr', 'de', 'it'].forEach(l => rdI18n.add(l)); rdI18n.addCardNames(Object.keys(RdyOppDecks.cards));</script>
<script>if (document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));</script>
`;
writeFileSync(out, html);
console.log(out, Math.round(html.length / 1024) + ' KB');
