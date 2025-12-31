// sw.js — Service Worker Kamus Dayak Kanayatn / Ahe

const CACHE_NAME = 'kamus-dayak-cache-v2';

// Gunakan path relatif agar aman di localhost, PWA, & WebView
const OFFLINE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './data-max.json',
  './icon-192.png',
  './icon-512.png'
];

// ==============================
// INSTALL — cache aset inti
// ==============================
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_ASSETS);
    })
  );
  self.skipWaiting();
});

// ==============================
// ACTIVATE — bersihkan cache lama
// ==============================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Hapus cache lama:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// ==============================
// FETCH — routing strategi cache
// ==============================
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Hanya tangani GET
  if (request.method !== 'GET') return;

  // JSON kamus → network first
  if (request.url.endsWith('data-max.json')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // File lain → cache first
  event.respondWith(cacheFirst(request));
});

// ==============================
// CACHE FIRST (HTML, CSS, JS, ICON)
// ==============================
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    // Update cache di background
    fetch(request)
      .then((res) => {
        if (res.ok) cache.put(request, res.clone());
      })
      .catch(() => {});
    return cached;
  }

  try {
    const network = await fetch(request);
    if (network.ok) cache.put(request, network.clone());
    return network;
  } catch {
    // Fallback hanya untuk halaman
    if (request.destination === 'document') {
      return offlinePage();
    }
  }
}

// ==============================
// NETWORK FIRST (JSON DATA)
// ==============================
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const network = await fetch(request);
    if (network.ok) cache.put(request, network.clone());
    return network;
  } catch {
    const cached = await cache.match(request);
    return (
      cached ||
      new Response('{}', {
        headers: { 'Content-Type': 'application/json' }
      })
    );
  }
}

// ==============================
// OFFLINE FALLBACK PAGE
// ==============================
function offlinePage() {
  return new Response(
    `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Offline</title>
      <style>
        body {
          font-family: system-ui, sans-serif;
          text-align: center;
          padding: 40px;
        }
      </style>
    </head>
    <body>
      <h2>📕 Kamus Dayak Ahe</h2>
      <p>Kamu sedang offline.</p>
      <p>Kamus tetap bisa digunakan jika data sudah tersimpan.</p>
    </body>
    </html>
    `,
    { headers: { 'Content-Type': 'text/html' } }
  );
                      }
