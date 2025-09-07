const CACHE_NAME = 'adamdh7-v2';
const OFFLINE_URL = '/index.html';
const urlsToCache = [OFFLINE_URL, '/manifest.json', '/'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(urlsToCache); // si youn nan fichye yo 404 => addAll jete erè
      console.log('[SW] Install: cached files');
    } catch (err) {
      console.error('[SW] Cache addAll error:', err);
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()));
    await self.clients.claim();
    console.log('[SW] Activated, old caches cleared');
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    try {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      const networkResponse = await fetch(event.request);
      return networkResponse;
    } catch (err) {
      // Si se yon navigation (paj HTML), retounen offline page
      if (event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html')) {
        return caches.match(OFFLINE_URL);
      }
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});
