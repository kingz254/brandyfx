self.addEventListener('install', event => {
  event.waitUntil(caches.open('brandyfx-shell-v1').then(cache => cache.addAll(['/','/manifest.webmanifest','/brand/brandyfx-app-icon.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(async () => (await caches.match('/')) || Response.error()));
});
