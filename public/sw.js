self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch – no caching, no errors
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      // Silent fail – prevents uncaught promise rejection
      return new Response('Offline fallback', { status: 503 });
    })
  );
});