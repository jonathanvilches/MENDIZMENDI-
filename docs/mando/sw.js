// Service worker de la app «Mando» (la página del móvil como mando, instalable): la página y sus archivos, siempre de la
// red si la hay, para que nunca se quede una versión vieja, y, sin red, de la copia guardada, para que la app abra al
// momento y diga que falta internet. El del juego (sw.js de la raíz) deja mando/ para este.
const CACHE = 'herrizherri-mando-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || !u.pathname.includes('/mando/')) return;
  e.respondWith(fetch(r).then((res) => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then((k) => k.put(r, c)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || Response.error())));
});
