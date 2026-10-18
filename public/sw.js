// Offline support: cache the app shell and shared safety rules so triage still works
// without a connection. API calls always go to the network.
const CACHE = 'health-ai-v2';
const SHELL = [
  '/', '/index.html', '/styles.css', '/app.js', '/i18n.js', '/manifest.webmanifest', '/icons/icon.svg',
  '/shared/levels.js', '/shared/redflags.js', '/shared/vitals.js', '/shared/protocols.js', '/shared/safety.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  // Network first (fresh code when online), cache fallback (works offline).
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/index.html'))),
  );
});
