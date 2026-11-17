// 3.2.2: security headers from the rdydeck.com Worker. With GitHub Pages faked
// from the repo's own files, checks that:
// - every page gets X-Frame-Options, an enforced Content-Security-Policy with
//   frame-ancestors 'self', the report-only policy, nosniff, a referrer policy,
//   COOP and CORP, and loses GitHub Pages' Access-Control-Allow-Origin: *;
// - the Creator kit stream card (/?overlay=1, with or without &embed=1) may be
//   framed by any site, and nothing else may;
// - assetlinks.json (Google Play) and the 404 page still answer as before;
// - the report-only policy allows every place the site's pages and scripts load
//   from (scripts, styles, fonts, card data and art), so it starts with no
//   violations from the site itself.
// Then, in jsdom, that a would-be-blocked file sends one short error report
// (rule and site name only), at most two a visit, none for extensions, and
// none with error reports off.
// Needs jsdom: cd tests && npm ci. Then: node tests/headers-check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import worker, { CSP_REPORT_ONLY, isOverlay } from '../worker/rdydeck-worker.js';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

// ── GitHub Pages, faked from the repo's files ──
const TYPES = { html: 'text/html; charset=utf-8', json: 'application/json; charset=utf-8', js: 'application/javascript; charset=utf-8', png: 'image/png', svg: 'image/svg+xml', woff2: 'font/woff2', ico: 'image/x-icon', txt: 'text/plain; charset=utf-8', xml: 'application/xml' };
globalThis.fetch = async (u) => {
  const url = new URL(typeof u === 'string' ? u : u.url);
  let p = decodeURIComponent(url.pathname.replace(/^\/PrizeTrainer/, '')) || '/';
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  const pages = { 'Access-Control-Allow-Origin': '*', 'Server': 'GitHub.com', 'Cache-Control': 'max-age=600' };
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return new Response('nope', { status: 404, headers: { ...pages, 'Content-Type': 'text/html' } });
  const ext = (p.match(/\.(\w+)$/) || [, 'txt'])[1];
  return new Response(fs.readFileSync(file), { status: 200, headers: { ...pages, 'Content-Type': TYPES[ext] || 'application/octet-stream' } });
};
const get = async (p, method = 'GET') => worker.fetch({ url: 'https://rdydeck.com' + p, method, headers: new Headers() }, {}, { waitUntil() {} });

const fa = h => (String(h.get('Content-Security-Policy') || '').match(/frame-ancestors ([^;]+)/) || [])[1];
for (const p of ['/', '/index.html', '/?ref=grade', '/?src=play', '/?embed=1', '/deck-grader.html', '/deck-slowking.html', '/cards/abra.html', '/privacy.html', '/data.json', '/js/core.js?v=1', '/sw.js', '/manifest.json', '/og-image.png', '/saira.woff2', '/.well-known/assetlinks.json', '/no-such-page']) {
  const r = await get(p), h = r.headers;
  const name = `${p} (${r.status})`;
  ok(h.get('X-Frame-Options') === 'SAMEORIGIN', name + ': X-Frame-Options SAMEORIGIN');
  ok(fa(h) === "'self'", name + ": frame-ancestors 'self'");
  ok(/object-src 'none'/.test(h.get('Content-Security-Policy')) && /base-uri 'self'/.test(h.get('Content-Security-Policy')), name + ': enforced policy blocks plugins and <base>');
  ok(h.get('Content-Security-Policy-Report-Only') === CSP_REPORT_ONLY, name + ': report-only policy');
  ok(h.get('X-Content-Type-Options') === 'nosniff' && h.get('Referrer-Policy') === 'strict-origin-when-cross-origin', name + ': nosniff and referrer policy');
  ok(h.get('Cross-Origin-Opener-Policy') === 'same-origin-allow-popups', name + ': COOP same-origin-allow-popups');
  ok(h.get('Cross-Origin-Resource-Policy') === (/\.(png|ico)$/.test(p) ? 'cross-origin' : 'same-site'), name + ': CORP ' + h.get('Cross-Origin-Resource-Policy'));
  ok(!h.has('Access-Control-Allow-Origin'), name + ': no Access-Control-Allow-Origin');
}
for (const p of ['/?overlay=1', '/?overlay=1&embed=1', '/?overlay=1&embed=1&lang=de', '/index.html?overlay=1&embed=1']) {
  const r = await get(p), h = r.headers;
  ok(r.status === 200 && !h.has('X-Frame-Options') && fa(h) === '*', p + ': stream card may be framed by any site');
  ok(h.get('Cross-Origin-Resource-Policy') === 'cross-origin', p + ': CORP cross-origin');
  ok(/object-src 'none'/.test(h.get('Content-Security-Policy')), p + ': still blocks plugins');
}
ok(!isOverlay(new URL('https://rdydeck.com/deck-grader.html?overlay=1')), 'overlay=1 on another page does not open framing');
{
  const r = await get('/.well-known/assetlinks.json');
  const j = await r.json();
  ok(r.status === 200 && Array.isArray(j) && j[0] && j[0].target && j[0].target.package_name === 'com.rdydeck.app', 'assetlinks.json still serves the Play app link');
  const n = await get('/no-such-page');
  ok(n.status === 404 && /text\/html/.test(n.headers.get('Content-Type')), '404 page still a 404 page');
  const home = await get('/');
  ok(!/data-mirror/.test(await home.text()), 'home page still drops the github.io noindex line');
}

// ── The report-only list covers what the site itself loads ──
const dirs = Object.fromEntries(CSP_REPORT_ONLY.split(/;\s*/).map(d => { const [k, ...v] = d.split(/\s+/); return [k, v]; }));
const allows = (dir, u) => {
  const list = dirs[dir] || dirs['default-src'];
  const url = new URL(u, 'https://rdydeck.com/');
  if (url.origin === 'https://rdydeck.com') return list.includes("'self'");
  return list.some(s => s === url.protocol || s === 'https:' && url.protocol === 'https:' ||
    (s.startsWith('https://*.') ? url.hostname.endsWith(s.slice(9)) : s === url.origin));
};
const htmls = [...fs.readdirSync(ROOT).filter(f => f.endsWith('.html')), ...fs.readdirSync(path.join(ROOT, 'cards')).filter(f => f.endsWith('.html')).map(f => 'cards/' + f)];
let seen = 0;
for (const f of htmls) {
  const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const m of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) { seen++; if (!allows('script-src', m[1])) ok(false, `${f}: script ${m[1]} not in the list`); }
  for (const m of html.matchAll(/<link[^>]*rel="(?:stylesheet|preload|manifest|icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)) {
    seen++; const d = /\.woff2/.test(m[1]) ? 'font-src' : /\.css/.test(m[1]) ? 'style-src' : /manifest/.test(m[1]) ? 'manifest-src' : 'img-src';
    if (!allows(d, m[1])) ok(false, `${f}: ${d} ${m[1]} not in the list`);
  }
  for (const m of html.matchAll(/<img[^>]*\ssrc="([^"$]+)"/g)) { seen++; if (!allows('img-src', m[1])) ok(false, `${f}: picture ${m[1]} not in the list`); }
}
ok(seen > 100, `pages: ${seen} scripts, styles, fonts and pictures checked against the list`);
// Every outside address the scripts read with fetch().
const jsText = ['ads.js', 'sw.js', ...fs.readdirSync(path.join(ROOT, 'js')).map(f => 'js/' + f)].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
const hosts = new Set([...jsText.matchAll(/https:\/\/[a-z0-9.-]+\.[a-z]+/g)].map(m => m[0]));
const linksOnly = /^https:\/\/((www\.)?pokemon\.com|play\.pokemon\.com|community\.pokemon\.com|limitlesstcg\.com|play\.limitlesstcg\.com|tcgdex\.dev|pokemontcg\.io|fonts\.google\.com|cardjinx\.com|rdydeck\.com|optumeventures\.com)$/;
for (const h of hosts) {
  if (linksOnly.test(h)) continue;             // links people tap, not files the app loads
  const d = /googlesyndication|doubleclick/.test(h) ? 'script-src' : 'connect-src';
  ok(allows(d, h + '/x'), `scripts load from ${h}: allowed by ${d}`);
  if (/images\.|assets\.|digitaloceanspaces/.test(h)) ok(allows('img-src', h + '/x'), `card art from ${h}: allowed as a picture`);
}
for (const h of ['https://images.scrydex.com', 'https://d21hwc2yj2s6ok.cloudfront.net']) ok(allows('img-src', h + '/a.png'), `card art from ${h}: allowed as a picture`);
ok(allows('script-src', 'https://static.cloudflareinsights.com/beacon.min.js') && allows('connect-src', 'https://cloudflareinsights.com/cdn-cgi/rum'), 'Cloudflare Web Analytics allowed');
ok(allows('script-src', 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js') && allows('frame-src', 'https://googleads.g.doubleclick.net/pagead/ads') && allows('script-src', 'https://ep2.adtrafficquality.google/sodar/sodar2.js'), 'AdSense script, ad frames and its checks allowed');
ok(allows('img-src', 'blob:x') && allows('img-src', 'data:x') && allows('worker-src', '/sw.js'), 'share pictures (blob:) and the offline worker allowed');

// ── The app's report of a would-be-blocked file ──
const src = fs.readFileSync(path.join(ROOT, 'js/report-errors.js'), 'utf8');
async function app(reportsOff) {
  const dom = new JSDOM('<!doctype html><body><div class="screen active" id="screen-home"></div></body>', { url: 'https://rdydeck.com/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, posts = [];
  Object.defineProperty(w.navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  w.navigator.sendBeacon = undefined;
  w.fetch = async (u, init) => { if (String(u) === '/api/report') posts.push(JSON.parse(init.body)); return new Response('{"ok":true}'); };
  if (reportsOff) w.localStorage.setItem('rd_reports', 'off');
  w.eval(src); w.eval("var PT_VERSION = 'v3.2.2'");
  const fire = (o) => { const e = new w.Event('securitypolicyviolation'); Object.assign(e, { disposition: 'report', ...o }); w.dispatchEvent(e); };
  return { w, posts, fire };
}
{
  const { posts, fire } = await app(false);
  fire({ blockedURI: 'https://tpc.googlesyndication.com/sodar/x.js?id=1234567890&u=me@x.com', effectiveDirective: 'script-src-elem' });
  fire({ blockedURI: 'https://tpc.googlesyndication.com/sodar/y.js', effectiveDirective: 'script-src-elem' });
  fire({ blockedURI: 'chrome-extension://abc/inject.js', effectiveDirective: 'script-src-elem' });
  fire({ blockedURI: 'https://x.com/a.js', sourceFile: 'moz-extension://abc/c.js', effectiveDirective: 'connect-src' });
  fire({ blockedURI: 'https://evil.example/a.js', effectiveDirective: 'script-src-elem', disposition: 'enforce' });
  fire({ blockedURI: 'inline', effectiveDirective: 'style-src-attr' });
  fire({ blockedURI: 'https://third.example/a', effectiveDirective: 'connect-src' });
  await new Promise(r => setTimeout(r, 50));
  ok(posts.length === 2, `two reports sent (got ${posts.length}): the same site once, extensions and enforced ones skipped, two at most`);
  ok(posts[0] && posts[0].kind === 'error' && posts[0].msg === 'CSP would block script-src-elem from tpc.googlesyndication.com' && posts[0].stack === '' && posts[0].v === 'v3.2.2', 'first report: rule and site name only, ' + JSON.stringify(posts[0] && posts[0].msg));
  ok(posts[1] && posts[1].msg === 'CSP would block style-src-attr from inline', 'inline style named as inline');
  ok(!JSON.stringify(posts).includes('1234567890') && !JSON.stringify(posts).includes('sodar'), 'no address, path or query in any report');
}
{
  const { posts, fire } = await app(true);
  fire({ blockedURI: 'https://tpc.googlesyndication.com/x.js', effectiveDirective: 'script-src-elem' });
  await new Promise(r => setTimeout(r, 50));
  ok(posts.length === 0, 'with error reports off in Settings, nothing is sent');
}

console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
