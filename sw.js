const CACHE_NAME = 'trailhead-pa1997-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/image_0.png',
  '/image_1.jpeg',
  '/image_2.jpeg',
  '/image_3.jpeg',
  '/image_4.jpeg',
  '/image_5.jpeg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});