// Sets each page's <lastmod> in sitemap.xml to the day that page last changed in git,
// so Google knows which pages to crawl again. Run by the weekly data job.
// The home page also counts data.json and matchups.json, since it shows both.
// Usage: node update-sitemap.mjs sitemap.xml
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const file = process.argv[2] || 'sitemap.xml';
const day = paths => {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...paths], { encoding: 'utf8' }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch (_) { return null; }
};

const xml = readFileSync(file, 'utf8');
let changed = 0;
const next = xml.replace(/<url><loc>https:\/\/rdydeck\.com\/([^<]*)<\/loc><lastmod>([^<]*)<\/lastmod><\/url>/g, (all, path, was) => {
  const paths = path === '' ? ['index.html', 'data.json', 'matchups.json'] : [path];
  const d = day(paths);
  if (!d || d === was) return all;
  changed++;
  return `<url><loc>https://rdydeck.com/${path}</loc><lastmod>${d}</lastmod></url>`;
});
if (changed) writeFileSync(file, next);
console.log(changed ? `Updated ${changed} date(s) in ${file}.` : `${file} dates already current.`);
