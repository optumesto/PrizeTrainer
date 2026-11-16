// RdyDeck at rdydeck.com (Cloudflare Worker "rdydeck", 3.1.1).
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
// Bindings this version expects: DB (D1 "rdydeck-reports"), LIMIT (rate limit,
// 10 per 60 s) and optionally the secret REPORTS_KEY. With no DB bound, reports
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

// How long browsers keep each file. Files the app links with ?v=<hash> change
// name when they change, so they keep for a year. Pages and data stay short, so
// a new upload shows within minutes. Fonts and icons keep for a week.
export function cacheFor(pathname, search) {
  if (/\.(js|css)$/i.test(pathname) && /[?&]v=[0-9a-f]{6,}/i.test(search)) return 'public, max-age=31536000, immutable';
  if (/^\/sw\.js$/i.test(pathname)) return 'no-cache';
  if (/\.(woff2|png|svg|ico)$/i.test(pathname)) return 'public, max-age=604800';
  return 'public, max-age=300';
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

async function notFound(request) {
  let body = 'Not found';
  try { const r = await fetch(ORIGIN + '/404.html', { cf: { cacheEverything: true, cacheTtl: 300 } }); if (r.ok) body = forHome(await r.text()); } catch (_) {}
  return new Response(request.method === 'HEAD' ? null : body, {
    status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff' },
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
    if (url.pathname === '/api/where' && (request.method === 'GET' || request.method === 'HEAD')) {
      // Never cached anywhere: the answer depends on where this visitor is.
      return new Response(request.method === 'HEAD' ? null : JSON.stringify({ ads: adsAllowed(request) }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex' },
      });
    }
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

    const upstream = await fetch(ORIGIN + url.pathname + url.search, {
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
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (upstream.status === 200) headers.set('Cache-Control', cacheFor(url.pathname, url.search));

    // Pages: take out the github.io-only noindex line (see MIRROR_NOINDEX).
    if (/text\/html/i.test(headers.get('Content-Type') || '') && request.method === 'GET' && upstream.status === 200) {
      headers.delete('Content-Length'); headers.delete('ETag');
      return new Response(forHome(await upstream.text()), { status: upstream.status, statusText: upstream.statusText, headers });
    }
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
  },
};
