// Minimal service worker: cache the shell, always go to the network for the calendar.
const CACHE = 'pa1997-v24';
const SHELL = ['index.html','about.html','events.html','gallery.html','resources.html','contact.html','scripture.html','styles.css?v=20','script.js?v=13','scripture.js?v=3','image_0.png','image_7.png','images/hero-banner.jpg','images/hero-banner-mobile.jpg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // Google APIs, fonts, Drive: network only
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
