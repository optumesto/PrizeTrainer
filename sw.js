// RdyDeck service worker (cache names keep the old prize-trainer prefix)
// Bump CACHE_NAME on every deploy so clients pull fresh files.
const CACHE_NAME = 'prize-trainer-v131';
// How long a page open waits for the network before using the saved copy.
const HTML_WAIT = 3000;

// Card art from other sites lives in its own cache, kept across deploys, so
// a deck you have opened still shows its pictures with no signal. The page
// tells us when a picture loaded; we keep a copy of that one only, so broken
// fallback addresses never fill the cache.
const ART_CACHE = 'prize-trainer-art';
const ART_MAX = 600;
const ART_HOSTS = ['digitaloceanspaces.com', 'pokemontcg.io', 'tcgdex.net'];

// Ad networks: always straight from the network, never saved, so no ad or
// ad script is ever shown or kept offline.
const AD_HOSTS = ['googlesyndication.com', 'doubleclick.net', 'googleadservices.com', 'googletagservices.com', 'adtrafficquality.google', 'tpc.goog', 'fundingchoicesmessages.google.com'];
const isAdHost = h => AD_HOSTS.some(a => h === a || h.endsWith('.' + a));

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
  './icon.svg',
  './terms.html',
  './privacy.html',
  './delete-data.html',
  './offline.html',
  './saira.woff2',
  './saira-condensed-600.woff2',
  './saira-condensed-700.woff2',
  './saira-condensed-800.woff2',
  './icon-maskable-192x192.png',
  './icon-maskable-512x512.png',
  './apple-touch-icon.png',
  './favicon.ico',
  './data.json',
  './matchups.json',
  './deck-grader.html',
  './opening-odds.html',
  './prize-trainer.html',
  './rotation.html',
  './puzzle/text.js',
  './puzzle/engine.js',
  './puzzle/solver.js',
  './puzzle/daily.json',
  // 2.5.1: the deck builder's card data, so card search works offline from the first visit.
  './cards.json',
  // 3.3.6: which printings play the same, for De-bling.
  './prints.json',
  './builder.json',
  // 2.6: what each meta deck's top lists run, for the deck builder's panel.
  './meta-cards.json',
  // 3.1: the official rules the card details show, and their page.
  './rulings.json',
  './rulings.html',
];

// Saved copies are kept under the address without its query, so links with
// tracking or version tags (?utm_source=, ?src=play) never store extra copies.
const bare = url => { const u = new URL(url); u.search = ''; u.hash = ''; return u.href; };
// Addresses that are the app itself. Offline, these open the saved app;
// any other page that was never saved opens offline.html instead.
const isAppPath = url => { const p = new URL(url).pathname; return p.endsWith('/') || p.endsWith('/index.html'); };

// On install: pre-cache the core shell, then skip waiting so the new SW
// activates immediately rather than waiting for all tabs to close.
//
// Each asset is cached individually rather than via cache.addAll, because
// addAll rejects the ENTIRE install if any single file 404s. That would
// silently leave the app with no service worker and no offline support
// just because one icon path did not match this repo's layout.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all([
        // 2.7.4: './' and './index.html' are the same page, so it downloads
        // once and is saved under both addresses (it used to download twice).
        // The page names its own script files (js/*.js?v=...); those are saved
        // too, read from the page itself so the list never goes stale.
        fetch(new Request('./index.html', { cache: 'reload' }))
          .then(resp => {
            if (!resp.ok || resp.redirected) throw new Error('index.html');
            return resp.clone().text().then(html => Promise.all([
              cache.put('./', resp.clone()), cache.put('./index.html', resp),
              ...appFiles(html).map(url => saveAppFile(cache, url)),
            ]));
          })
          .catch(() => Promise.all(['./', './index.html'].map(url =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => console.warn('[sw] could not cache', url))))),
        ...CORE_ASSETS.filter(url => url !== './' && url !== './index.html').map(url =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {
            // Missing or misnamed asset: skip it, keep the rest of the install.
            console.warn('[sw] could not cache', url);
          })
        )
      ]))
      .then(() => self.skipWaiting())
  );
});

// The app's own script files, as the page links them. Each address carries
// ?v=<hash of the file>, so the same address always means the same content.
const APP_FILE_RE = /src="(js\/[\w.-]+\.js\?v=[0-9a-z]+)"/g;
const appFiles = html => [...new Set([...html.matchAll(APP_FILE_RE)].map(m => new URL(m[1], self.registration.scope).href))];
const isAppFile = url => /\/js\/[\w.-]+\.js$/.test(url.pathname) && url.searchParams.has('v');
// A file this version still uses at the same ?v= is copied from the old saved copy,
// so an update downloads only the files that changed. A new one may come from the
// browser's own cache: the page has usually just downloaded it, and its ?v= means
// the same address always holds the same file.
function saveAppFile(cache, url) {
  return caches.match(url)
    .then(hit => hit || fetch(url).then(r => { if (!r.ok) throw new Error(url); return r; }))
    .then(r => cache.put(url, r))
    .catch(() => console.warn('[sw] could not cache', url));
}

// On activate: delete any old caches whose name doesn't match this version,
// then take control of all open clients so they get the new SW without reload.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== ART_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// On fetch: network-first for the HTML shell (so deploys show up quickly),
// network-first for data.json and matchups.json, cache-first for everything else (images, fonts, icons).
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (isAdHost(url.hostname)) return;
  // 3.1.1: rdydeck.com's own answers (/api/where, /api/report) always come
  // from the network and are never saved: /api/where depends on where the
  // visitor is right now.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;
  // 3.4.2: the card databases' APIs go straight to the network. They were never saved here, and passing
  // them through only added a second error line in the console each time one did not answer.
  if (url.hostname === 'api.pokemontcg.io' || url.hostname === 'api.tcgdex.net') return;
  // Card art from another site: saved copy first, then the network.
  if (req.destination === 'image' && url.origin !== self.location.origin) {
    event.respondWith(
      caches.open(ART_CACHE)
        .then(c => c.match(req.url))
        .then(hit => hit || fetch(req))
        .catch(() => fetch(req))
    );
    return;
  }

  // The weekly data files: newest copy first, the saved one with no signal.
  if (url.origin === self.location.origin && (url.pathname.endsWith('/data.json') || url.pathname.endsWith('/matchups.json') || url.pathname.endsWith('/builder.json') || url.pathname.endsWith('/meta-cards.json') || url.pathname.endsWith('/cards.json') || url.pathname.endsWith('/prints.json') || url.pathname.endsWith('/accuracy.json') || url.pathname.endsWith('/art-index.json') || url.pathname.endsWith('/art-index.bin'))) {
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(resp => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then(c => c.put(bare(req.url), copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() => caches.match(bare(req.url)).then(r => r || Response.error()))
    );
    return;
  }

  // 3.2.2: a page inside a frame (the Creator kit card on a creator's site)
  // always comes from the network. A saved copy keeps the headers it was saved
  // with, and only the stream card's own answer lets another site frame it.
  if (req.destination === 'iframe' || req.destination === 'frame') return;

  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // Network-first for HTML, but never a long wait: after HTML_WAIT ms with
    // no answer, the saved copy opens and the fresh one is still saved for
    // next time. A slow phone signal right after a new version used to leave
    // the app loading for as long as the download took.
    const net = fetch(req, { cache: 'no-cache' })
      .then(resp => {
        // Keep only a good page, so an error page never replaces the saved app.
        if (resp && resp.ok && url.origin === self.location.origin) {
          const copy = resp.clone();
          return caches.open(CACHE_NAME).then(c => c.put(bare(req.url), copy)).catch(() => {}).then(() => resp);
        }
        return resp;
      });
    event.waitUntil(net.catch(() => {}));
    const late = new Promise(res => setTimeout(() => res(undefined), HTML_WAIT));
    event.respondWith((async () => {
      const quick = await Promise.race([net.catch(() => null), late]);
      if (quick && quick.ok) return quick;
      // Slow, offline or an error from the server: a good saved copy of this
      // page wins over all three.
      const exact = await caches.match(req, { ignoreSearch: true });
      if (exact) return exact;
      // Nothing saved for this page: wait for the network, and show its
      // answer even when it is an error (a real 404 shows the 404 page).
      const late2 = quick || await net.catch(() => null);
      if (late2) return late2;
      // Offline with nothing saved for this page.
      if (isAppPath(req.url)) {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      return (await caches.match('./offline.html')) || Response.error();
    })());
    return;
  }

  // Cache-first for everything else
  const same = url.origin === self.location.origin;
  // The app's script files are saved under their full address with ?v=, so a page
  // that names a newer file never gets an older saved one.
  const key = same ? (isAppFile(url) ? url.href.split('#')[0] : bare(req.url)) : req;
  event.respondWith(
    caches.match(key).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        // Only cache successful, same-origin responses
        if (resp && resp.status === 200 && same) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(key, copy)).catch(() => {});
        }
        return resp;
      }).catch(() => Response.error());
    })
  );
});

// Allow the page to trigger an immediate activation via postMessage.
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  const d = event.data;
  if (d && d.type === 'art-ok' && typeof d.url === 'string') event.waitUntil(cacheArt(d.url));
});

async function cacheArt(url) {
  let u;
  try { u = new URL(url); } catch (_) { return; }
  if (!/^https?:$/.test(u.protocol) || u.origin === self.location.origin) return;
  // Card art hosts only: never an ad, a tracker or any other site.
  if (isAdHost(u.hostname) || !ART_HOSTS.some(a => u.hostname === a || u.hostname.endsWith('.' + a))) return;
  const cache = await caches.open(ART_CACHE);
  if (await cache.match(u.href)) return;
  let resp = null;
  // A readable copy when the site allows it, an opaque one otherwise.
  try { const r = await fetch(u.href, { mode: 'cors', credentials: 'omit' }); if (r.ok) resp = r; } catch (_) {}
  if (!resp) {
    try { resp = await fetch(u.href, { mode: 'no-cors', credentials: 'omit' }); } catch (_) { return; }
    // An opaque answer hides its status, so it is only kept when it is a
    // plain opaque response; anything else is a failure and is not saved.
    if (!resp || resp.type !== 'opaque') return;
  }
  try { await cache.put(u.href, resp); } catch (_) { return; }
  const keys = await cache.keys();
  if (keys.length > ART_MAX) {
    for (const k of keys.slice(0, keys.length - ART_MAX)) await cache.delete(k);
  }
}
