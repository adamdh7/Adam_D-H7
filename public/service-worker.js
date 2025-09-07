const CACHE_NAME = "adamdh7-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "https://res.cloudinary.com/dckwrqrur/image/upload/v1757217868/tf-stream-url/file_00000000cd7c62439492d8f6bb737dfd_eaj4tl.png"
];

// Installation et mise en cache
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Activer nouveau cache et supprimer anciens
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

// Interception des requêtes réseau
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
