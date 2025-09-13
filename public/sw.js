/* Service Worker con versionado automático y actualización forzada */
// Tomar parámetro v de la URL del script (sw.js?v=HASH-TIME) para separar caches por versión
const swUrl = new URL(self.location.href);
const SW_VERSION = swUrl.searchParams.get('v') || 'dev';
const CACHE_PREFIX = 'ventas-cache';
const CACHE_NAME = `${CACHE_PREFIX}-${SW_VERSION}`;

const CORE_ASSETS = ['/', '/index.html', '/icon.png', '/manifest.webmanifest'];

// Instalación: precache y saltar a waiting inmediatamente (luego skipWaiting controlado por la app)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch((err) => console.warn('[SW] Falló precache', err))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(async () => {
        await self.clients.claim();
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({ type: 'SW_ACTIVATED', version: SW_VERSION });
        }
      }),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Navegaciones (documentos HTML): network-first para detectar nuevas versiones rápidamente
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put('/index.html', copy))
            .catch(() => {});
          return res;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  // Otros recursos: cache-first con actualización en segundo plano
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(req, copy))
            .catch(() => {});
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    }),
  );
});

// Permitir que la página solicite activación inmediata
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
