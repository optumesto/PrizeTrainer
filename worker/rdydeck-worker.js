// RdyDeck at rdydeck.com (Cloudflare Worker "rdydeck", 3.5.7).
// The app's files stay in the GitHub repo optumesto/PrizeTrainer and keep
// being served at optumesto.github.io/PrizeTrainer/. This Worker shows those
// same files at rdydeck.com, so an upload to GitHub (or the weekly data
// refresh) reaches rdydeck.com within a few minutes, with no second copy.
// Every other name (www.rdydeck.com, rdydeck.app, www.rdydeck.app) is sent
// to https://rdydeck.com with a permanent redirect, keeping the path.
//
// 3.0 adds:
// 1. Only site files are served. The data scripts, tests, workflow files,
//    notes and this Worker's own source stay in the repo but get the 404 page
//    here (see BLOCKED below).
// 2. POST /api/report takes two kinds of anonymous report from the app and
//    keeps them in the D1 database bound as DB:
//      error: an error message, a short stack, the app version, the screen and
//             the browser and system family (no IP, no deck, no ids, no free text)
//      flag:  "this grade looks off": the grade, the archetype and one preset reason
//    Repeats are counted in one row, not stored again. The visitor's IP is used
//    only by the rate limiter (binding LIMIT) and is never stored.
// 3. GET /api/reports?key=... shows the reports as a page, only once the
//    secret REPORTS_KEY has been set on this Worker (Settings, Variables and
//    Secrets). With no secret set, that address is a 404.
//
// 3.1.1 adds GET /api/where, which tells the app whether this visitor may
// see ads: {"ads":true} only when Cloudflare places the request in the United
// States, {"ads":false} for every other country and when the country is
// unknown. Only that yes or no is sent back; nothing is stored or logged.
//
// 3.2 adds, for search engines:
// 1. Pages take out the github.io-only noindex line (MIRROR_NOINDEX), so the
//    github.io copy leaves search results and rdydeck.com stays in them.
// 2. Browser cache times by file (cacheFor): a year for ?v= stamped scripts,
//    5 minutes for pages and data, a week for fonts and icons.
// 3. http://rdydeck.com redirects straight to https (only reached if Cloudflare's
//    Always Use HTTPS is off; it is on now).
//
// 3.2.2 adds security headers to every answer (see securityHeaders):
// 1. No other site may show RdyDeck in a frame (X-Frame-Options and the
//    policy's frame-ancestors), except the Creator kit's stream card
//    (/?overlay=1, which the embed code puts in an iframe on creators' sites).
// 2. An enforced Content-Security-Policy with only rules that cannot block
//    anything the site loads (frames, plugins, <base> and form targets).
// 3. A fuller Content-Security-Policy-Report-Only listing every place the site
//    loads from. It blocks nothing: the app reports what it would have blocked
//    through its usual error reports, so the list can be checked before it is
//    enforced.
// 4. Cross-Origin-Opener-Policy (ad clicks may still open new tabs),
//    Cross-Origin-Resource-Policy, Permissions-Policy, and no
//    Access-Control-Allow-Origin: * (GitHub Pages' default; nothing needs it).
//
// 3.3 adds POST /api/feedback, which emails the app's Send feedback form to the
// owner (see takeFeedback). It needs the send_email binding FEEDBACK and the
// plain variable FEEDBACK_TO; without them it answers 503 and the app falls
// back to the player's own email app.
//
// 3.5.7 adds GET /api/cards/tcgdex/... and /api/cards/ptcg/..., which pass card data reads on to the
// two card databases for networks that block them (see cardApi). No new bindings.
//
// Bindings this version expects: DB (D1 "rdydeck-reports"), LIMIT (rate limit,
// 10 per 60 s), optionally FEEDBACK (send_email) with FEEDBACK_TO, and optionally the secret REPORTS_KEY. With no DB bound, reports
// are accepted and dropped, so the site itself never depends on them.

const HOME = 'rdydeck.com';
const ORIGIN = 'https://optumesto.github.io/PrizeTrainer';

// Repo files that are not part of the site.
const BLOCKED = [
  /\.(mjs|cjs|md|ts|toml|yml|yaml|sh|py|gz)$/i,
  /^\/(tests|worker|node_modules|\.github|puzzle\/test|puzzle\/tools)(\/|$)/i,
  /^\/(package(-lock)?\.json|\.nojekyll|\.gitignore|wrangler\.json)$/i,
];
export const isBlocked = p => BLOCKED.some(re => re.test(p));

// Ads are shown only to visitors in these countries (ISO codes from Cloudflare).
const AD_COUNTRIES = ['US'];
export function adsAllowed(request) {
  // request.cf is set by Cloudflare itself, so a visitor cannot change it.
  const c = String((request.cf && request.cf.country) || '').toUpperCase();
  return AD_COUNTRIES.includes(c);
}

// Every page in the repo carries this line, so the github.io copy stays out of
// search results. rdydeck.com takes it out, so only rdydeck.com is indexed.
export const MIRROR_NOINDEX = '<meta name="robots" content="noindex" data-mirror>';
export const forHome = html => html.split(MIRROR_NOINDEX + '\n').join('').split(MIRROR_NOINDEX).join('');

// 3.6.8: the home page has a copy for each language (/es/, /pt/, /fr/, /de/, /it/, made by
// lang-pages.mjs). The app in those copies reads some files by relative address while it runs
// (cards.json, rulings.json), which from /es/ is /es/cards.json. Those are the files at the site root.
// A page under a language folder other than its home page (/es/rulings.html, a link the app builds)
// moves to the page at the root, so each page keeps one address in search.
export const LANG_DIRS = ['es', 'pt', 'fr', 'de', 'it'];
/** For a path under a language folder: { file } to answer with the root file, { page } to move to it, or null. */
export function langFile(pathname) {
  const m = /^\/(es|pt|fr|de|it)\/(.+)$/.exec(pathname);
  if (!m || m[2] === 'index.html') return null;
  const rest = '/' + m[2];
  if (/(\/|\.html)$/i.test(rest)) return { page: rest };
  return { file: rest };
}

// How long browsers keep each file. Files the app links with ?v=<hash> change
// name when they change, so they keep for a year. Pages and data stay short, so
// a new upload shows within minutes. Fonts and icons keep for a week.
export function cacheFor(pathname, search) {
  if (/\.(js|css)$/i.test(pathname) && /[?&]v=[0-9a-f]{6,}/i.test(search)) return 'public, max-age=31536000, immutable';
  if (/^\/sw\.js$/i.test(pathname)) return 'no-cache';
  if (/\.(woff2|png|svg|ico)$/i.test(pathname)) return 'public, max-age=604800';
  return 'public, max-age=300';
}

// Google AdSense (US visitors only, once a publisher id is set). From Google's
// own list of AdSense hosts; the report-only policy shows anything missing.
const AD_SRC = ['https://pagead2.googlesyndication.com', 'https://*.googlesyndication.com', 'https://*.doubleclick.net',
  'https://*.adtrafficquality.google', 'https://www.googletagservices.com', 'https://adservice.google.com',
  'https://www.google.com', 'https://fundingchoicesmessages.google.com'];
// Card data the app reads in the browser, and card art it reads as pictures.
const DATA_SRC = ['https://api.tcgdex.net', 'https://api.pokemontcg.io'];
const ART_SRC = ['https://images.pokemontcg.io', 'https://assets.tcgdex.net', 'https://limitlesstcg.nyc3.digitaloceanspaces.com'];
// Cloudflare Web Analytics, which Cloudflare adds to pages itself.
const STATS_SCRIPT = 'https://static.cloudflareinsights.com', STATS_SEND = 'https://cloudflareinsights.com';

// The whole list, reported but not enforced. Inline scripts and styles are
// allowed because the pages use them (inline <script> blocks and onclick=).
export const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' " + [STATS_SCRIPT, ...AD_SRC].join(' '),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' " + [...DATA_SRC, ...ART_SRC, STATS_SEND, ...AD_SRC, 'https://csi.gstatic.com'].join(' '),
  "frame-src " + AD_SRC.join(' '),
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

// The Creator kit's stream card: /?overlay=1 (OBS) and /?overlay=1&embed=1 (iframe on a creator's site).
export const isOverlay = url => (url.pathname === '/' || url.pathname === '/index.html') && url.searchParams.get('overlay') === '1';

/** Security headers for one answer. Pages may be framed only by rdydeck.com itself, except the stream card. */
export function securityHeaders(headers, url) {
  const card = isOverlay(url);
  headers.set('Content-Security-Policy', ["object-src 'none'", "base-uri 'self'", "form-action 'self'",
    'frame-ancestors ' + (card ? '*' : "'self'")].join('; '));
  if (card) headers.delete('X-Frame-Options'); else headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Content-Security-Policy-Report-Only', CSP_REPORT_ONLY);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  // Pictures and the stream card may be used by other sites; everything else only by rdydeck.com.
  headers.set('Cross-Origin-Resource-Policy', card || /\.(png|svg|ico|jpe?g|webp|gif)$/i.test(url.pathname) ? 'cross-origin' : 'same-site');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  headers.delete('Access-Control-Allow-Origin');
  return headers;
}

const DAY_CAP = 5000;           // reports kept per day, all kinds together
const KEEP_DAYS = 90;           // older rows are deleted
const REASONS = ['too-high', 'too-low', 'wrong-deck', 'card-misread', 'other'];
const BROWSERS = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Samsung', 'Opera', 'Other'];
const SYSTEMS = ['Android', 'iOS', 'Windows', 'macOS', 'ChromeOS', 'Linux', 'Other'];

const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
const pick = (v, list) => list.includes(v) ? v : 'Other';
const str = (v, max, re) => {
  if (typeof v !== 'string') return '';
  let s = v.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);
  return re && !re.test(s) ? '' : s;
};
const today = () => new Date().toISOString().slice(0, 10);

async function sha(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function ensureTables(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS errors (sig TEXT PRIMARY KEY, msg TEXT, stack TEXT, v TEXT, page TEXT, br TEXT, os TEXT, play INTEGER, first TEXT, last TEXT, n INTEGER)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS flags (day TEXT, v TEXT, arch TEXT, grade REAL, reason TEXT, n INTEGER, PRIMARY KEY (day, v, arch, grade, reason))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS days (day TEXT PRIMARY KEY, n INTEGER)`),
  ]);
}

async function takeReport(request, env, ctx) {
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > 4096) return json({ ok: false }, 413);
  if (env.LIMIT) {
    // The IP is the rate limit key only; it is not stored anywhere.
    const ip = request.headers.get('CF-Connecting-IP') || 'none';
    const { success } = await env.LIMIT.limit({ key: 'report:' + ip });
    if (!success) return json({ ok: false }, 429);
  }
  let b;
  try { const t = await request.text(); if (t.length > 4096) return json({ ok: false }, 413); b = JSON.parse(t); }
  catch (_) { return json({ ok: false }, 400); }
  if (!b || typeof b !== 'object') return json({ ok: false }, 400);
  const v = str(b.v, 16, /^v\d+\.\d+(\.\d+)?$/);
  if (!v) return json({ ok: false }, 400);
  const db = env.DB;
  if (!db) return json({ ok: true, kept: false });

  await ensureTables(db);
  const day = today();
  const cap = await db.prepare(`INSERT INTO days (day, n) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET n = n + 1 RETURNING n`).bind(day).first();
  if (cap && cap.n > DAY_CAP) return json({ ok: true, kept: false });

  if (b.kind === 'error') {
    const msg = str(b.msg, 200), stack = str(b.stack, 800);
    if (!msg) return json({ ok: false }, 400);
    const page = str(b.page, 24, /^[a-z0-9-]+$/) || 'other';
    const br = pick(b.br, BROWSERS), os = pick(b.os, SYSTEMS), play = b.play ? 1 : 0;
    const sig = await sha([msg, stack.split('\n')[0] || '', v, page, br, os, play].join('|'));
    const now = new Date().toISOString();
    await db.prepare(`INSERT INTO errors (sig, msg, stack, v, page, br, os, play, first, last, n) VALUES (?,?,?,?,?,?,?,?,?,?,1)
      ON CONFLICT(sig) DO UPDATE SET last = excluded.last, n = n + 1`).bind(sig, msg, stack, v, page, br, os, play, now, now).run();
  } else if (b.kind === 'flag') {
    const reason = REASONS.includes(b.reason) ? b.reason : '';
    const grade = Number(b.grade);
    if (!reason || !(grade >= 0 && grade <= 10)) return json({ ok: false }, 400);
    const arch = str(b.arch, 60, /^[\p{L}\p{N} '.&:-]*$/u) || 'Unmatched';
    await db.prepare(`INSERT INTO flags (day, v, arch, grade, reason, n) VALUES (?,?,?,?,?,1)
      ON CONFLICT(day, v, arch, grade, reason) DO UPDATE SET n = n + 1`).bind(day, v, arch, Math.round(grade * 10) / 10, reason).run();
  } else {
    return json({ ok: false }, 400);
  }
  // Now and then, drop rows older than KEEP_DAYS.
  if (Math.random() < 0.02) ctx.waitUntil(prune(db));
  return json({ ok: true, kept: true });
}

async function prune(db) {
  const cut = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10);
  await db.batch([
    db.prepare(`DELETE FROM errors WHERE last < ?`).bind(cut),
    db.prepare(`DELETE FROM flags WHERE day < ?`).bind(cut),
    db.prepare(`DELETE FROM days WHERE day < ?`).bind(cut),
  ]);
}

// ── 3.3 feedback: POST /api/feedback ──
// The app's Send feedback form posts here, and the message is emailed to the
// owner through Cloudflare Email Routing (send_email binding FEEDBACK, whose
// one allowed destination is the verified address in the plain variable
// FEEDBACK_TO; neither is in this repo). Nothing is stored: no D1 row, no
// IP (the rate limiter uses it as a key only). The message carries what the
// form shows: the kind, the text, the deck list only if ticked, and the app
// version, screen, device family, screen width and language. No email address,
// so there is no way to reply. With no FEEDBACK binding the answer is 503 and
// the app offers the player's own email app instead.
const FB_KINDS = ['Bug', 'Missing card', 'Idea'];
const FB_DEVICES = ['Android', 'iPhone or iPad', 'Mac', 'Windows', 'Other'];
const FB_DAY_CAP = 200;         // feedback emails per day, all visitors together

const fbText = (v, max) => typeof v === 'string'
  ? v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max) : '';

/** The checked feedback from a posted body, or null when it is not one. */
export function cleanFeedback(b) {
  if (!b || typeof b !== 'object' || b.website) return null;   // website: a field people never see, filled only by bots
  const text = fbText(b.text, 1500);
  if (!text) return null;
  return {
    kind: FB_KINDS.includes(b.kind) ? b.kind : 'Bug',
    text,
    deck: fbText(b.deck, 1000),
    deckName: fbText(b.deckName, 80).replace(/\n/g, ' '),
    v: str(b.v, 16, /^v\d+\.\d+(\.\d+)?$/) || '?',
    build: Number.isInteger(b.build) && b.build > 0 && b.build < 100000 ? b.build : 0,
    screen: str(b.screen, 24, /^[a-z0-9-]+$/) || 'other',
    device: FB_DEVICES.includes(b.device) ? b.device : 'Other',
    width: Number.isInteger(b.width) && b.width > 0 && b.width < 10000 ? b.width : 0,
    play: !!b.play,
    lang: str(b.lang, 5, /^[a-z]{2}$/) || 'en',
  };
}

const b64 = text => {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};

/** The whole email (headers and body) for one cleaned feedback. */
export function feedbackMime(f, from, to, id, date = new Date()) {
  const first = f.text.split('\n')[0].slice(0, 60);
  const subject = `RdyDeck ${f.kind}: ${first}`;
  const body = [
    f.text,
    '',
    '----',
    `Kind: ${f.kind}`,
    `App version: ${f.v}${f.build ? ` (build ${f.build})` : ''}${f.play ? ' (Google Play)' : ''}`,
    `Screen: ${f.screen.replace(/^screen-/, '')}`,
    `Device: ${f.device}${f.width ? `, ${f.width} px wide` : ''}`,
    `Language: ${f.lang}`,
    ...(f.deck ? ['', `Deck: ${f.deckName || 'Untitled'}`, f.deck] : []),
    '',
    'Sent from the Send feedback form in RdyDeck. It has no email address, so it cannot be answered by replying.',
  ].join('\n').replace(/\r?\n/g, '\r\n');
  return [
    `From: "RdyDeck feedback" <${from}>`,
    `To: <${to}>`,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    `Date: ${date.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${id}@${from.split('@')[1]}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64(body).replace(/.{76}/g, '$&\r\n'),
    '',
  ].join('\r\n');
}

async function takeFeedback(request, env) {
  if (!env.FEEDBACK || !env.FEEDBACK_TO) return json({ ok: false, why: 'off' }, 503);
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > 8192) return json({ ok: false }, 413);
  if (env.LIMIT) {
    const ip = request.headers.get('CF-Connecting-IP') || 'none';
    const { success } = await env.LIMIT.limit({ key: 'feedback:' + ip });
    if (!success) return json({ ok: false, why: 'busy' }, 429);
  }
  let b;
  try { const t = await request.text(); if (t.length > 8192) return json({ ok: false }, 413); b = JSON.parse(t); }
  catch (_) { return json({ ok: false }, 400); }
  if (b && b.website) return json({ ok: true });   // a bot: answer as if sent, send nothing
  const f = cleanFeedback(b);
  if (!f) return json({ ok: false, why: 'empty' }, 400);
  if (env.DB) {
    // Only a count per day, so a flood cannot fill the inbox.
    await ensureTables(env.DB);
    const c = await env.DB.prepare(`INSERT INTO days (day, n) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET n = n + 1 RETURNING n`).bind('feedback-' + today()).first();
    if (c && c.n > FB_DAY_CAP) return json({ ok: false, why: 'busy' }, 429);
  }
  const from = 'feedback@' + HOME, to = env.FEEDBACK_TO;
  const { EmailMessage } = await import('cloudflare:email');
  await env.FEEDBACK.send(new EmailMessage(from, to, feedbackMime(f, from, to, crypto.randomUUID())));
  return json({ ok: true });
}

const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function showReports(url, env) {
  const key = url.searchParams.get('key') || '';
  if (!env.REPORTS_KEY || !env.DB || key.length < 16 || key !== env.REPORTS_KEY) return null;
  await ensureTables(env.DB);
  const days = Math.max(1, Math.min(90, Number(url.searchParams.get('days')) || 30));
  const cut = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const errs = (await env.DB.prepare(`SELECT msg, stack, v, page, br, os, play, first, last, n FROM errors WHERE last >= ? ORDER BY n DESC, last DESC LIMIT 200`).bind(cut).all()).results || [];
  const flags = (await env.DB.prepare(`SELECT arch, reason, v, ROUND(AVG(grade), 1) AS grade, SUM(n) AS n FROM flags WHERE day >= ? GROUP BY arch, reason, v ORDER BY n DESC LIMIT 200`).bind(cut).all()).results || [];
  const perDay = (await env.DB.prepare(`SELECT day, n FROM days WHERE day >= ? ORDER BY day DESC`).bind(cut).all()).results || [];
  const reasonText = { 'too-high': 'Grade too high', 'too-low': 'Grade too low', 'wrong-deck': 'Wrong deck type', 'card-misread': 'A card is read wrong', other: 'Something else' };
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>RdyDeck reports</title>
<style>body{font:15px/1.45 system-ui,sans-serif;margin:16px;background:#111;color:#eee}h1{font-size:20px}h2{font-size:17px;margin-top:28px}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #333;padding:6px;text-align:left;vertical-align:top}
pre{white-space:pre-wrap;font-size:12px;margin:4px 0 0;color:#aaa}.n{text-align:right;font-weight:700}a{color:#7cf}</style></head><body>
<h1>RdyDeck reports, last ${days} days</h1>
<p><a href="?key=${h(key)}&days=7">7 days</a> · <a href="?key=${h(key)}&days=30">30 days</a> · <a href="?key=${h(key)}&days=90">90 days</a></p>
<h2>This grade looks off (${flags.reduce((a, r) => a + r.n, 0)})</h2>
${flags.length ? `<table><tr><th>Deck</th><th>Reason</th><th>Grade</th><th>Version</th><th class="n">Times</th></tr>
${flags.map(r => `<tr><td>${h(r.arch)}</td><td>${h(reasonText[r.reason] || r.reason)}</td><td>${h(r.grade)}</td><td>${h(r.v)}</td><td class="n">${r.n}</td></tr>`).join('')}</table>` : '<p>None yet.</p>'}
<h2>Errors (${errs.reduce((a, r) => a + r.n, 0)})</h2>
${errs.length ? `<table><tr><th>Error</th><th>Where</th><th class="n">Times</th></tr>
${errs.map(r => `<tr><td>${h(r.msg)}<pre>${h(r.stack)}</pre></td><td>${h(r.v)}, ${h(r.page)}<br>${h(r.br)} on ${h(r.os)}${r.play ? ' (Play app)' : ''}<br>last ${h(String(r.last).slice(0, 16).replace('T', ' '))} UTC</td><td class="n">${r.n}</td></tr>`).join('')}</table>` : '<p>None yet.</p>'}
<h2>Reports per day</h2>
<p>${perDay.map(r => `${h(r.day)}: ${r.n}`).join('<br>') || 'None yet.'}</p>
</body></html>`;
  return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}

// ── 3.5.7 card data: GET /api/cards/tcgdex/... and /api/cards/ptcg/... ──
// The app reads card data from two public card databases straight from the browser. Some networks
// (school and work filters) block them, and then every card read failed. When a direct read cannot get
// through, the app (js/card-route.js) sends the same request here and this passes it on to the
// database, unchanged, and hands back its answer. Only those two databases, only their card and set
// reads, only GET. Answers are kept at Cloudflare's edge for a day, so repeat reads cost the databases
// nothing. Nothing about the visitor is stored or sent on (no cookies, no IP, no headers of theirs).
export const CARD_APIS = { tcgdex: 'https://api.tcgdex.net/v2/', ptcg: 'https://api.pokemontcg.io/v2/' };
const CARD_PATH = { tcgdex: /^en\/(cards|sets)(\/[\w.%~-]+)?$/, ptcg: /^(cards|sets)(\/[\w.%~-]+)?$/ };
/** The database address for an /api/cards/ path, or null when it is not one this passes on. */
export function cardApiTarget(url) {
  const m = /^\/api\/cards\/(tcgdex|ptcg)\/(.+)$/.exec(url.pathname);
  if (!m || !CARD_PATH[m[1]].test(m[2]) || /\.\.|%2f|%5c/i.test(m[2]) || url.search.length > 2000) return null;
  return CARD_APIS[m[1]] + m[2] + url.search;
}
async function cardApi(request, url) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD', 'X-Robots-Tag': 'noindex' };
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD', ...cors } });
  const target = cardApiTarget(url);
  if (!target) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...cors } });
  let up;
  try {
    up = await fetch(target, {
      method: request.method,
      headers: { Accept: 'application/json', 'User-Agent': 'RdyDeck card data relay (rdydeck.com)' },
      cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 86400, '404': 3600, '500-599': 0 } },
    });
  } catch (_) {
    return new Response(JSON.stringify({ error: 'card database did not answer' }), { status: 502, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors } });
  }
  return new Response(up.body, {
    status: up.status,
    headers: { 'Content-Type': up.headers.get('Content-Type') || 'application/json', 'Cache-Control': up.ok ? 'public, max-age=3600' : 'no-store', ...cors },
  });
}

async function notFound(request) {
  let body = 'Not found';
  try { const r = await fetch(ORIGIN + '/404.html', { cf: { cacheEverything: true, cacheTtl: 300 } }); if (r.ok) body = forHome(await r.text()); } catch (_) {}
  return new Response(request.method === 'HEAD' ? null : body, {
    status: 404, headers: securityHeaders(new Headers({ 'Content-Type': 'text/html; charset=utf-8' }), new URL(request.url)),
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.hostname !== HOME || url.protocol === 'http:') {
      return Response.redirect('https://' + HOME + url.pathname + url.search, 301);
    }

    if (url.pathname === '/api/report') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
      // Same site only: the app posts from rdydeck.com.
      const origin = request.headers.get('Origin');
      if (origin && origin !== 'https://' + HOME) return json({ ok: false }, 403);
      try { return await takeReport(request, env, ctx); } catch (_) { return json({ ok: false }, 500); }
    }
    if (url.pathname === '/api/feedback') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
      if (request.headers.get('Origin') !== 'https://' + HOME) return json({ ok: false }, 403);
      try { return await takeFeedback(request, env); } catch (_) { return json({ ok: false, why: 'error' }, 502); }
    }
    if (url.pathname === '/api/where' && (request.method === 'GET' || request.method === 'HEAD')) {
      // Never cached anywhere: the answer depends on where this visitor is.
      return new Response(request.method === 'HEAD' ? null : JSON.stringify({ ads: adsAllowed(request) }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex' },
      });
    }
    if (url.pathname.startsWith('/api/cards/')) return cardApi(request, url);
    if (url.pathname === '/api/reports' && request.method === 'GET') {
      const r = await showReports(url, env).catch(() => null);
      return r || notFound(request);
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }

    let path;
    try { path = decodeURIComponent(url.pathname); } catch (_) { path = url.pathname; }
    if (isBlocked(path) || path.startsWith('/api/')) return notFound(request);

    const lf = langFile(url.pathname);
    if (lf && lf.page) return Response.redirect('https://' + HOME + lf.page + url.search, 301);
    if (lf) {
      let f;
      try { f = decodeURIComponent(lf.file); } catch (_) { f = lf.file; }
      if (isBlocked(f) || f.startsWith('/api/')) return notFound(request);
    }

    const upstream = await fetch(ORIGIN + (lf ? lf.file : url.pathname) + url.search, {
      method: request.method,
      redirect: 'manual',
      // Short edge cache: new uploads and the weekly data show within 5 minutes.
      cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 300, '404': 60, '500-599': 0 } },
    });

    const headers = new Headers(upstream.headers);
    // GitHub's own redirects (for example a folder without its last slash)
    // point at github.io; keep the visitor on rdydeck.com.
    const loc = headers.get('Location');
    if (loc && loc.startsWith(ORIGIN)) {
      headers.set('Location', 'https://' + HOME + (loc.slice(ORIGIN.length) || '/'));
    }
    ['x-github-request-id', 'x-proxy-cache', 'x-fastly-request-id', 'x-served-by', 'x-cache', 'x-cache-hits', 'x-timer', 'via']
      .forEach(k => headers.delete(k));
    securityHeaders(headers, url);
    if (upstream.status === 200) headers.set('Cache-Control', cacheFor(url.pathname, url.search));

    // Pages: take out the github.io-only noindex line (see MIRROR_NOINDEX).
    if (/text\/html/i.test(headers.get('Content-Type') || '') && request.method === 'GET' && upstream.status === 200) {
      headers.delete('Content-Length'); headers.delete('ETag');
      return new Response(forHome(await upstream.text()), { status: upstream.status, statusText: upstream.statusText, headers });
    }
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
  },
};
