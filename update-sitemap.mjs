// Sets each page's <lastmod> in sitemap.xml to the day that page last changed in git,
// so Google knows which pages to crawl again. Run by the weekly data job.
// The home page also counts data.json and matchups.json, since it shows both.
// Usage: node update-sitemap.mjs sitemap.xml
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const file = process.argv[2] || 'sitemap.xml';
const day = paths => {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...paths], { encoding: 'utf8' }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch (_) { return null; }
};

const xml = readFileSync(file, 'utf8');
// Whitespace between the tags is allowed, so a pretty-printed sitemap still matches.
const URL_RE = /<url>(\s*)<loc>https:\/\/rdydeck\.com\/([^<]*)<\/loc>(\s*)<lastmod>([^<]*)<\/lastmod>(\s*)<\/url>/g;
const total = (xml.match(/<url>/g) || []).length;
let matched = 0, changed = 0;
const next = xml.replace(URL_RE, (all, s1, path, s2, was, s3) => {
  matched++;
  const paths = path === '' ? ['index.html', 'data.json', 'matchups.json'] : [path];
  if (path !== '' && !existsSync(path)) console.warn(`Warning: ${path} is in ${file} but the file does not exist.`);
  const d = day(paths);
  if (!d || d === was) return all;
  changed++;
  return `<url>${s1}<loc>https://rdydeck.com/${path}</loc>${s2}<lastmod>${d}</lastmod>${s3}</url>`;
});
if (matched !== total) {
  console.error(`Error: ${file} has ${total} <url> entries but only ${matched} could be read. Its layout changed; nothing was written.`);
  process.exitCode = 1;
} else {
  if (changed) writeFileSync(file, next);
  console.log(changed ? `Updated ${changed} date(s) in ${file}.` : `${file} dates already current.`);
}
