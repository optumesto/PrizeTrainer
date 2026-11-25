// The app is index.html plus the scripts in js/. Each script is linked with
// ?v=<first 8 hex of its SHA-256>, so a browser downloads a file again only when it changed, and
// sw.js saves each one under that exact address.
//
//   node app-file.mjs --stamp   set every ?v= in index.html to its file's current hash (run after
//                               editing any js/ file, before you commit)
//   node app-file.mjs --check   fail if any ?v= is out of date or a linked file is missing
//                               (tests/grade-check.mjs runs this too)
// Both also write or check the language home pages (lang-pages.mjs), which copy index.html.
//   node app-file.mjs --single <out.html>   write the one-file app (everything inline), the same
//                               file Share the app and Download RdyDeck.html give
//
// Tools that read the app's code as text (the grade check, check-cards.mjs, the puzzle's
// sync-text.mjs) read readAppHtml(), which is index.html with every file put back inline, in
// the same places and order the browser runs them.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// <script ... src="js/x.js?v=..."></script>
export const JS_RE = /<script([^>]*?) src="(js\/[\w.-]+\.js)\?v=([0-9a-z]+)"><\/script>/g;

export const hashOf = text => createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 8);

/** index.html with every js/ file put back inline. */
export function inlineApp(html, read) {
  return html.replace(JS_RE, (_, attrs, f) => '<script' + attrs + '>' + read(f) + '</script>');
}

/** The one-file app for the index.html at htmlPath (default: this folder's). */
export function readAppHtml(htmlPath = path.join(ROOT, 'index.html')) {
  const dir = path.dirname(path.resolve(htmlPath));
  return inlineApp(readFileSync(htmlPath, 'utf8'), f => {
    const p = path.join(dir, f);
    if (!existsSync(p)) throw new Error(`${f} is linked from ${htmlPath} but is not next to it`);
    return readFileSync(p, 'utf8');
  });
}

/** Files linked from index.html whose ?v= does not match their content, that are missing, or that could not go inline. */
export function staleStamps(htmlPath = path.join(ROOT, 'index.html')) {
  const dir = path.dirname(path.resolve(htmlPath)), html = readFileSync(htmlPath, 'utf8'), bad = [];
  const look = (f, v) => {
    const p = path.join(dir, f);
    if (!existsSync(p)) { bad.push(`${f} (missing)`); return; }
    const text = readFileSync(p, 'utf8');
    // The one-file copy puts the file inside <script>...</script>, where this would end it early.
    if (/<\/script/i.test(text)) bad.push(`${f} (contains </script, write <\\/script instead)`);
    else if (hashOf(text) !== v) bad.push(f);
  };
  for (const m of html.matchAll(JS_RE)) look(m[2], m[3]);
  const v = appVersion(dir), sv = (html.match(/"softwareVersion":"([^"]*)"/) || [])[1];
  if (v && sv !== v) bad.push(`softwareVersion ${sv || 'missing'}, want ${v}`);
  return bad;
}

// The version search engines read (softwareVersion in the page's structured data), kept equal to PT_VERSION.
function appVersion(dir) {
  const p = path.join(dir, 'js/core.js');
  const m = existsSync(p) && /const PT_VERSION = 'v?([^']+)'/.exec(readFileSync(p, 'utf8'));
  return m ? m[1] : '';
}

function stamp(htmlPath = path.join(ROOT, 'index.html')) {
  const dir = path.dirname(htmlPath), h = f => hashOf(readFileSync(path.join(dir, f), 'utf8'));
  const html = readFileSync(htmlPath, 'utf8');
  const v = appVersion(dir);
  let out = html.replace(JS_RE, (_, attrs, f) => `<script${attrs} src="${f}?v=${h(f)}"></script>`);
  if (v) out = /"softwareVersion":"[^"]*"/.test(out) ? out.replace(/"softwareVersion":"[^"]*"/, `"softwareVersion":"${v}"`)
    : out.replace('"applicationCategory":"GameApplication",', `"applicationCategory":"GameApplication","softwareVersion":"${v}",`);
  if (out !== html) writeFileSync(htmlPath, out);
  return out !== html;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  // 3.6.8: the language home pages (es/index.html and so on) are copies of index.html, so they follow its stamps.
  const { langPages } = await import('./lang-pages.mjs');
  if (a[0] === '--stamp') {
    console.log(stamp() ? 'index.html: file stamps updated' : 'index.html: stamps already current');
    const lb = langPages(false);
    if (lb.length) { console.error('Language pages: ' + lb.join(', ')); process.exit(1); }
  } else if (a[0] === '--check') {
    const bad = staleStamps().concat(langPages(true));
    if (bad.length) { console.error('Problems with the files index.html links (for stamps, run node app-file.mjs --stamp): ' + bad.join(', ')); process.exit(1); }
    console.log('index.html: every linked file is there and its stamp is current');
  } else if (a[0] === '--single' && a[1]) { writeFileSync(a[1], readAppHtml()); console.log('wrote ' + a[1]); }
  else { console.error('usage: node app-file.mjs --stamp | --check | --single <out.html>'); process.exit(2); }
}
