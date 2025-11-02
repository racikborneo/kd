const CACHE_NAME = 'kamus-dayak-cache-v2';
const urlsToCache = [
  '/kd/',
  '/kd/index.html',
  '/kd/style.css',
  '/kd/app.js',
  '/kd/manifest.json',
  '/kd/favicon.ico',
  '/kd/icon-192.png',
  '/kd/icon-512.png'
];

// Install Event — Simpan aset ke cache
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => console.error('Gagal caching:', err))
  );
  self.skipWaiting(); // langsung aktif tanpa tunggu reload
});

// Fetch Event — Ambil dari cache atau jaringan
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Untuk data dinamis: network-first
  if (requestUrl.pathname.endsWith('/data-max.json')) {
    event.respondWith(networkFirst(event.request));
  } else {
    // Untuk file statis: cache-first
    event.respondWith(cacheFirst(event.request));
  }
});

// Strategi network-first
const networkFirst = async (request) => {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
};

// Strategi cache-first
const cacheFirst = async (request) => {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;
  const networkResponse = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, networkResponse.clone());
  return networkResponse;
};

// Activate Event — Hapus cache lama
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[ServiceWorker] Hapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  self.clients.claim(); // aktif segera tanpa reload halaman
});