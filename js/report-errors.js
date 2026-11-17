// ═══════════ 3.0: anonymous error reports ═══════════
// Loaded first, so an error while the app starts is caught too. When something
// breaks on a player's device, a short report goes to rdydeck.com/api/report
// (the site's own Cloudflare Worker), so it can be fixed without anyone writing in.
//
// A report holds only: the error message (quoted text, addresses and long numbers
// taken out), a short stack of function names and app file lines, the app
// version, which screen was open, and the browser and system family (like
// "Chrome" and "Android"). Never a deck, a card list, a name, an id, an IP
// address or anything typed. The Worker counts repeats instead of storing
// them again. Settings has a switch to turn it off (rd_reports = 'off').
//
// Only from rdydeck.com itself, at most 5 reports per page load, each kind once.
(function () {
  const KEY = 'rd_reports';
  const MAX = 5;
  const sent = new Set();
  let count = 0, queue = [];

  function on() {
    try { if (localStorage.getItem(KEY) === 'off') return false; } catch (_) {}
    if (typeof location === 'undefined' || location.hostname !== 'rdydeck.com') return false;
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    if (/jsdom|HeadlessChrome|bot|crawl|spider/i.test(ua) || (typeof navigator !== 'undefined' && navigator.webdriver)) return false;
    return true;
  }
  function family(ua) {
    const br = /SamsungBrowser/.test(ua) ? 'Samsung' : /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera'
      : /Firefox\/|FxiOS/.test(ua) ? 'Firefox' : /Chrome\/|CriOS/.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other';
    const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /CrOS/.test(ua) ? 'ChromeOS'
      : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? (navigator.maxTouchPoints > 1 ? 'iOS' : 'macOS') : /Linux/.test(ua) ? 'Linux' : 'Other';
    return { br, os };
  }
  // Text from inside an error message can carry what was on screen, so it goes.
  function scrub(s) {
    return String(s || '')
      .replace(/https?:\/\/[^\s)]+/g, u => { try { const p = new URL(u).pathname.split('/').pop(); return p || 'url'; } catch (_) { return 'url'; } })
      .replace(/(["'`“‘]).*?(["'`”’])/g, '"..."')
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '...')
      .replace(/\d{6,}/g, '#')
      .replace(/\s+/g, ' ').trim().slice(0, 200);
  }
  // "at fn (https://rdydeck.com/js/core.js?v=1:10:5)" becomes "at fn (js/core.js:10:5)".
  // Frames from browser extensions or other sites are left out.
  function shortStack(st) {
    const out = [];
    for (const line of String(st || '').split('\n')) {
      const m = line.match(/^\s*(?:at\s+)?([\w$.<>\[\] ]*?)\s*[@(]?\s*(https?:\/\/[^)\s]+?):(\d+):(\d+)\)?\s*$/);
      if (!m) continue;
      let file;
      try { const u = new URL(m[2]); if (u.hostname !== location.hostname) continue; file = u.pathname.replace(/^\//, '') || 'index.html'; } catch (_) { continue; }
      out.push(`at ${(m[1] || '').trim().slice(0, 60) || '?'} (${file}:${m[3]}:${m[4]})`);
      if (out.length >= 8) break;
    }
    return out.join('\n');
  }
  function screenNow() {
    const s = document.querySelector('.screen.active');
    let p = s && s.id ? s.id.replace(/^screen-/, '') : 'start';
    const tab = p === 'review' && document.querySelector('.review-tabs .active');
    if (tab && tab.id) p += '-' + tab.id.replace(/^rv-tab-/, '');
    if (document.querySelector('.modal-overlay.active')) p += '-sheet';
    return p.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'other';
  }
  function version() { return typeof PT_VERSION === 'string' ? PT_VERSION : ''; }
  function post(body) {
    const text = JSON.stringify(body);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon('/api/report', new Blob([text], { type: 'application/json' }))) return Promise.resolve(true);
    } catch (_) {}
    return fetch('/api/report', { method: 'POST', body: text, headers: { 'Content-Type': 'application/json' }, keepalive: true, credentials: 'omit' })
      .then(r => r.ok).catch(() => false);
  }
  function send(msg, stack) {
    if (!on() || count >= MAX) return;
    const m = scrub(msg), st = shortStack(stack);
    if (!m || /^Script error\.?$/i.test(m)) return;          // from another site, nothing to go on
    if (!st && /extension|googlesyndication|adsbygoogle/i.test(String(stack || '') + m)) return;
    const sig = m + '|' + (st.split('\n')[0] || '');
    if (sent.has(sig)) return;
    sent.add(sig); count++;
    const { br, os } = family(navigator.userAgent || '');
    const body = { kind: 'error', msg: m, stack: st, page: screenNow(), br, os, play: typeof PT_PLAY !== 'undefined' && !!PT_PLAY };
    // Until the app has started, the version is not known yet.
    if (!version()) { queue.push(body); return; }
    post(Object.assign(body, { v: version() }));
  }
  addEventListener('error', e => {
    if (!e || (!e.error && !e.message)) return;               // a picture that failed to load, not a script error
    send(e.message || (e.error && e.error.message), e.error && e.error.stack);
  });
  addEventListener('unhandledrejection', e => {
    const r = e && e.reason;
    if (!r || !(r instanceof Error)) return;                 // a plain "no network" promise, not a bug
    if (/Failed to fetch|NetworkError|Load failed|aborted|AbortError|QuotaExceeded/i.test(String(r.message) + r.name)) return;
    send((r.name ? r.name + ': ' : '') + r.message, r.stack);
  });
  // 3.2.2: rdydeck.com sends a Content-Security-Policy-Report-Only header, a
  // list of the places pages may load from that blocks nothing yet. When the
  // browser says something would have been blocked, one short error report
  // names the rule and the site it came from (the site's name only, never the
  // full address), so the list can be checked before it is enforced. At most
  // two a visit (within the five above), each once, and none for browser extensions.
  const cspSent = new Set();
  addEventListener('securitypolicyviolation', e => {
    if (!e || e.disposition !== 'report' || cspSent.size >= 2 || count >= MAX || !on()) return;
    const b = String(e.blockedURI || ''), src = String(e.sourceFile || '');
    if (/^[a-z-]*extension:/i.test(b) || /^[a-z-]*extension:/i.test(src)) return;
    let where = 'other';
    try { where = /^https?:/i.test(b) ? new URL(b).hostname : (b.match(/^[a-z-]+/i) || ['other'])[0]; } catch (_) {}
    const rule = String(e.effectiveDirective || e.violatedDirective || '').toLowerCase().replace(/[^a-z-]/g, '').slice(0, 24) || 'unknown';
    const msg = scrub('CSP would block ' + rule + ' from ' + where.slice(0, 80));
    if (cspSent.has(msg)) return;
    cspSent.add(msg); count++;
    const { br, os } = family(navigator.userAgent || '');
    const body = { kind: 'error', msg, stack: '', page: screenNow(), br, os, play: typeof PT_PLAY !== 'undefined' && !!PT_PLAY };
    if (!version()) { queue.push(body); return; }
    post(Object.assign(body, { v: version() }));
  });
  addEventListener('load', () => setTimeout(() => {
    const q = queue; queue = [];
    if (version()) q.forEach(b => post(Object.assign(b, { v: version() })));
  }, 1500));

  // Shared with the "this grade looks off" button.
  window.rdReportsOn = on;
  window.rdReportPost = body => on() && version() ? post(Object.assign({}, body, { v: version() })) : Promise.resolve(false);
  window.rdReportsSet = yes => { try { if (yes) localStorage.removeItem(KEY); else localStorage.setItem(KEY, 'off'); } catch (_) {} };
  window.rdReportsWanted = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch (_) { return true; } };
})();
