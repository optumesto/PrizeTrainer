// ═══════════ 3.5.7: card data through rdydeck.com when a network blocks the card databases ═══════════
// Card data comes from two outside card databases (api.tcgdex.net and api.pokemontcg.io), read straight
// from the browser. Some networks block them (school and work filters), and then every card read failed:
// grades stayed Not final, Upgrades could not read cards and Guess the Grade would not open.
// Each card database request still goes straight there first. When it cannot get through (a network
// error, or a filter's block page in place of the database's answer), the same request is sent to rdydeck.com, whose
// Worker passes it on (worker/rdydeck-worker.js, /api/cards/). Once that works, the rest of the visit
// goes through rdydeck.com, so a blocked network does not wait on each request twice. Nothing else
// changes: same requests, same answers, nothing about the player is sent.
(function () {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  const direct = window.fetch;
  const ROUTES = [['https://api.tcgdex.net/v2/', '/api/cards/tcgdex/'], ['https://api.pokemontcg.io/v2/', '/api/cards/ptcg/']];
  // On rdydeck.com (the site and the Play app) the same site; anywhere else (the one-file app) the full address.
  const here = typeof location !== 'undefined' && location.protocol === 'https:' && location.hostname === 'rdydeck.com';
  const BASE = here ? '' : 'https://rdydeck.com';
  const KEY = 'cardRoute';
  let viaHome = false;
  try { viaHome = sessionStorage.getItem(KEY) === 'home'; } catch (_) {}
  const remember = v => { viaHome = v; try { if (v) sessionStorage.setItem(KEY, 'home'); else sessionStorage.removeItem(KEY); } catch (_) {} };
  /** A fresh copy of the request options: a timed out signal would stop the second try at once. */
  const again = init => {
    const o = Object.assign({}, init || {});
    delete o.signal;
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) o.signal = AbortSignal.timeout(10000);
    return o;
  };
  const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
  window.cardRoute = { viaHome: () => viaHome, _forget: () => remember(false), homeUrl: u => { const r = ROUTES.find(([a]) => u.startsWith(a)); return r ? BASE + r[1] + u.slice(r[0].length) : null; } };
  // A card database answers in JSON. An HTML page in its place is a network filter's block page, or (from
  // rdydeck.com) the site's own 404 page because the Worker has no card route yet: not a usable answer.
  const page = resp => /text\/html/i.test((resp && resp.headers && resp.headers.get('content-type')) || '');
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input && typeof input.url === 'string' ? input.url : '';
    const r = url && ROUTES.find(([a]) => url.startsWith(a));
    if (!r) return direct.call(window, input, init);
    const home = BASE + r[1] + url.slice(r[0].length);
    if (viaHome) {
      let resp;
      try { resp = await direct.call(window, home, init); } catch (e) { if (offline()) throw e; }
      if (resp && !page(resp) && resp.status < 500) return resp;
      // rdydeck.com did not give a card answer: try the database itself once more.
      try { const back = await direct.call(window, url, again(init)); if (!page(back)) { remember(false); return back; } }
      catch (e) { if (!resp) throw e; }
      return resp;
    }
    let first, err;
    try { first = await direct.call(window, url, init); if (!page(first)) return first; }
    catch (e) { err = e; if (offline()) throw e; }
    let resp;
    try { resp = await direct.call(window, home, again(init)); } catch (_) { if (first) return first; throw err; }
    if (page(resp)) { if (first) return first; throw err; }
    if (resp.status < 500) remember(true);
    return resp;
  };
})();
