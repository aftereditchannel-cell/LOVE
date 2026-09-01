/* Couple OS Service Worker — offline-first shell, never caches private API mutations */
const VERSION = 'couple-os-v1';
const STATIC_CACHE = VERSION + '-static';
const STATIC_ASSETS = ['/', '/index.html', '/assets/brand/logo.svg', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return; // mutations go straight to network
  if (url.pathname.startsWith('/api/')) {
    // network-first for API GETs; offline → cached copy if present
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok && !url.pathname.startsWith('/api/auth')) {
            const clone = res.clone();
            caches.open(VERSION + '-api').then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')));
    return;
  }
  // static assets: cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
      if (res.ok && url.origin === location.origin) {
        const clone = res.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
