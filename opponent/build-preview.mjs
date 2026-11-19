// One-file preview of the hidden play page, for review outside the site (nothing here is published by the site).
// node opponent/build-preview.mjs <out.html>
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || join(root, 'opponent', 'preview.html');
const page = readFileSync(join(root, 'opponent', 'play.html'), 'utf8');
const css = page.match(/<style>([\s\S]*?)<\/style>/)[1]
  .replace(/@font-face[^}]*}/, '')
  .replace("font-family:'Saira', system-ui, sans-serif;", "font-family:'Saira', system-ui, sans-serif;")
  .replace(/body \{ padding:16px;/, 'body { padding-block:16px; padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px));');
const js = ['puzzle/text.js', 'puzzle/engine.js', 'opponent/game.js', 'opponent/effects.js', 'opponent/ai.js', 'opponent/decks.js', 'opponent/play.js',
  // the app's translations, every language loaded up front (the site loads French, German and Italian on demand)
  'js/i18n.js', 'js/i18n-fr.js', 'js/i18n-de.js', 'js/i18n-it.js']
  .map(f => readFileSync(join(root, f), 'utf8').replace('const OPP_ON = false;', 'const OPP_ON = true;').replace(/<\/script/gi, '<\\/script'))
  .map(t => `<script>\n${t}\n</script>`).join('\n');
const html = `<title>5turn | RdyDeck</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="robots" content="noindex, nofollow">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira:wght@400;600;700&display=swap">
<style>${css}</style>
<h1 data-no-tr><span class="r">Rdy</span>Deck 5turn</h1>
<p class="note">Private preview. Not on rdydeck.com.</p>
<div id="app"></div>
${js}
<script>['fr', 'de', 'it'].forEach(l => rdI18n.add(l)); rdI18n.addCardNames(Object.keys(RdyOppDecks.cards));</script>
<script>if (document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));</script>
`;
writeFileSync(out, html);
console.log(out, Math.round(html.length / 1024) + ' KB');
