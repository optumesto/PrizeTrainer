// PrizeTrainer service worker
// Bump CACHE_NAME on every deploy so clients pull fresh files.
const CACHE_NAME = 'prize-trainer-v15';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/icon.svg',
];

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
          cache.add(url).catch(() => {
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
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// On fetch: network-first for the HTML shell (so deploys show up quickly),
// cache-first for everything else (images, fonts, icons).
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // Network-first for HTML — falls back to cache if offline
    event.respondWith(
      fetch(req)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        // Only cache successful, same-origin responses
        if (resp && resp.status === 200 && url.origin === self.location.origin) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
        }
        return resp;
      }).catch(() => cached);
    })
  );
});

// Allow the page to trigger an immediate activation via postMessage.
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
