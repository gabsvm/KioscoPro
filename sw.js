
const CACHE_NAME = 'kioscopro-v4-vercel';
// Usamos rutas absolutas para Vercel
const ASSETS = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Estrategia para navegación (HTML): Network First, pero con fallback a caché si hay error 404/500
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Si Vercel devuelve 404 (porque la ruta no es un archivo real) o OK, verificamos
          // Si es OK, devolvemos la respuesta de red
          if (response.ok) {
            return response;
          }
          // Si es 404 o 500, lanzamos error para caer en el catch y servir el caché
          throw new Error('Server returned error (SPA routing)');
        })
        .catch(() => {
          // Si hay error de red u error del servidor (404), devolvemos el App Shell (index.html)
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Para otros recursos (imágenes, scripts, css)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(request).catch(() => null);
    })
  );
});
