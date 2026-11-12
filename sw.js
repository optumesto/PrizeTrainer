// RdyDeck service worker (cache names keep the old prize-trainer prefix)
// Bump CACHE_NAME on every deploy so clients pull fresh files.
const CACHE_NAME = 'prize-trainer-v73';
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
      .then(cache => Promise.all(
        CORE_ASSETS.map(url =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {
            // Missing or misnamed asset: skip it, keep the rest of the install.
            console.warn('[sw] could not cache', url);
          })
        )
      ))
      .then(() => self.skipWaiting())
  );
});

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
  if (url.origin === self.location.origin && (url.pathname.endsWith('/data.json') || url.pathname.endsWith('/matchups.json') || url.pathname.endsWith('/builder.json') || url.pathname.endsWith('/cards.json'))) {
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(resp => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then(c => c.put(req.url, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() => caches.match(req.url).then(r => r || Response.error()))
    );
    return;
  }

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
  event.respondWith(
    caches.match(same ? bare(req.url) : req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        // Only cache successful, same-origin responses
        if (resp && resp.status === 200 && same) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(bare(req.url), copy)).catch(() => {});
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
