// ═══════════ 3.5.7: card data through rdydeck.com when a network blocks the card databases ═══════════
// Card data comes from two outside card databases (api.tcgdex.net and api.pokemontcg.io), read straight
// from the browser. Some networks block them (school and work filters), and then every card read failed:
// grades stayed Not final, Upgrades could not read cards and Guess the Grade would not open.
// Each card database request still goes straight there first. When it cannot get through (a network
// error, or a filter's block page in place of the database's answer), the same request is sent to rdydeck.com, whose
// Worker passes it on (worker/rdydeck-worker.js, /api/cards/). Once that works, the rest of the visit
// goes through rdydeck.com, so a blocked network does not wait on each request twice. Nothing else
// changes: same requests, same answers, nothing about the player is sent.
// 3.5.11: a network that does not refuse the card databases but lets requests hang (school wifi) made each read
// wait out its full 10 second timeout, twice, before trying rdydeck.com. Now a card database request that has
// no answer after HEDGE_MS also goes to rdydeck.com, and the first card answer is used. Once a card database is
// seen blocked on this device (a network error or a block page, while rdydeck.com answered), the device
// remembers it for a week, so later visits go straight through rdydeck.com without waiting at all.

(function () {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  const direct = window.fetch;
  const ROUTES = [['https://api.tcgdex.net/v2/', '/api/cards/tcgdex/'], ['https://api.pokemontcg.io/v2/', '/api/cards/ptcg/']];
  // On rdydeck.com (the site and the Play app) the same site; anywhere else (the one-file app) the full address.
  const here = typeof location !== 'undefined' && location.protocol === 'https:' && location.hostname === 'rdydeck.com';
  const BASE = here ? '' : 'https://rdydeck.com';
  const KEY = 'cardRoute';
  const HEDGE_MS = 2500;                    // no answer from the card database by then: ask rdydeck.com too
  const DEVICE_DAYS = 7;                    // how long this device keeps going through rdydeck.com after a block
  let viaHome = false;
  try { viaHome = sessionStorage.getItem(KEY) === 'home'; } catch (_) {}
  try { if (!viaHome && +localStorage.getItem(KEY) > Date.now()) viaHome = true; } catch (_) {}
  /** device: also remember it on this device (a block was seen), not only for this visit (a slow answer). */
  const remember = (v, device) => {
    viaHome = v;
    try { if (v) sessionStorage.setItem(KEY, 'home'); else sessionStorage.removeItem(KEY); } catch (_) {}
    try {
      if (!v) localStorage.removeItem(KEY);
      else if (device) localStorage.setItem(KEY, String(Date.now() + DEVICE_DAYS * 86400000));
    } catch (_) {}
  };
  /** A fresh copy of the request options: a timed out signal would stop the second try at once. */
  const again = init => {
    const o = Object.assign({}, init || {});
    delete o.signal;
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) o.signal = AbortSignal.timeout(10000);
    return o;
  };
  const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
  window.cardRoute = {
    viaHome: () => viaHome,
    onDevice: () => { try { return +localStorage.getItem(KEY) > Date.now(); } catch (_) { return false; } },
    _forget: () => remember(false),
    homeUrl: u => { const r = ROUTES.find(([a]) => u.startsWith(a)); return r ? BASE + r[1] + u.slice(r[0].length) : null; },
  };
  // A card database answers in JSON. An HTML page in its place is a network filter's block page, or (from
  // rdydeck.com) the site's own 404 page because the Worker has no card route: not a usable answer.
  const page = resp => /text\/html/i.test((resp && resp.headers && resp.headers.get('content-type')) || '');
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input && typeof input.url === 'string' ? input.url : '';
    const r = url && ROUTES.find(([a]) => url.startsWith(a));
    if (!r || offline()) return direct.call(window, input, init);
    const home = BASE + r[1] + url.slice(r[0].length);
    if (viaHome) {
      let resp;
      try { resp = await direct.call(window, home, init); } catch (e) { if (offline()) throw e; }
      // A card answer from rdydeck.com, even the database's own error (it is down), is the answer:
      // asking the database straight would only wait on the blocked network.
      if (resp && !page(resp)) return resp;
      // rdydeck.com itself did not answer: try the database once more.
      try { const back = await direct.call(window, url, again(init)); if (!page(back)) { remember(false); return back; } }
      catch (e) { if (!resp) throw e; }
      return resp;
    }
    // Ask the database. If it fails, or has no answer after HEDGE_MS, ask rdydeck.com too; the first card answer wins.
    return new Promise((resolve, reject) => {
      let done = false, homeAsked = false, homeOut = null, firstPage = null, firstErr = null, directOut = null, timer = null;
      const finish = (ok, v) => { if (done) return; done = true; clearTimeout(timer); ok ? resolve(v) : reject(v); };
      const tryEnd = () => {
        // Both have ended with no card answer: give back what the database gave (its block page or its error).
        if (directOut && homeOut) { if (firstPage) finish(true, firstPage); else finish(false, firstErr || new TypeError('Failed to fetch')); }
      };
      const askHome = () => {
        if (homeAsked) return;
        homeAsked = true;
        direct.call(window, home, again(init)).then(resp => {
          if (page(resp)) { homeOut = 'no'; tryEnd(); return; }
          homeOut = 'ok';
          if (directOut === 'blocked') remember(true, true);
          else if (!done) remember(true, false);
          finish(true, resp);
        }, () => { homeOut = 'no'; tryEnd(); });
      };
      direct.call(window, url, init).then(resp => {
        if (!page(resp)) { directOut = 'ok'; finish(true, resp); return; }
        directOut = 'blocked'; firstPage = resp;
        if (homeOut === 'ok') remember(true, true);
        askHome(); tryEnd();
      }, e => {
        if (offline() && !homeAsked) { finish(false, e); return; }
        directOut = 'blocked'; firstErr = e;
        if (homeOut === 'ok') remember(true, true);
        askHome(); tryEnd();
      });
      timer = setTimeout(askHome, HEDGE_MS);
    });
  };
})();
