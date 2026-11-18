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
const js = ['puzzle/text.js', 'puzzle/engine.js', 'opponent/game.js', 'opponent/effects.js', 'opponent/ai.js', 'opponent/decks.js', 'opponent/play.js']
  .map(f => readFileSync(join(root, f), 'utf8').replace('const OPP_ON = false;', 'const OPP_ON = true;').replace(/<\/script/gi, '<\\/script'))
  .map(t => `<script>\n${t}\n</script>`).join('\n');
const html = `<title>RdyDeck Practice Opponent</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="robots" content="noindex, nofollow">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira:wght@400;600;700&display=swap">
<style>${css}</style>
<h1><span class="r">Rdy</span>Deck practice opponent</h1>
<p class="note">Private preview. Not on rdydeck.com.</p>
<div id="app"></div>
${js}
<script>if (document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));</script>
`;
writeFileSync(out, html);
console.log(out, Math.round(html.length / 1024) + ' KB');
