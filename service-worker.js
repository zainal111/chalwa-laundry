// Simple service worker for offline caching
const CACHE = 'chalwa-v1';
const ASSETS = [
  '.',
  './index.html',
  './style.css',
  './app.js',
  './printer.js',
  './manifest.json'
];

self.addEventListener('install', (e)=> {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e)=> {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e)=> {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
