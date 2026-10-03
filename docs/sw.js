// Service worker de MENDIMENDIZ (versión web): guarda lo que se descarga para que la segunda vez cargue al momento y se
// pueda jugar sin conexión. Los archivos de assets/ llevan su huella en el nombre (no cambian nunca): se sirven de la
// caché. La página y el manifiesto se piden primero a la red (para recibir la versión nueva) y, sin red, de la caché.
// el nombre de la caché cambia con cada versión publicada (lo pone vite.config.js): al llegar una versión nueva se
// borra la caché vieja entera y se vuelve a guardar lo que se use
const CACHE = 'mendimendiz-e18559f7f2';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './manifest.webmanifest']).catch(() => {}))); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.includes('/assets/')) {
    // con huella: caché primero; lo que no esté se descarga y se guarda
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(r)) || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; })));
    return;
  }
  // la página: red primero (versión nueva), y si no hay red, la guardada
  e.respondWith(fetch(r).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(r, res.clone())); return res; })
    .catch(async () => (await caches.match(r)) || (await caches.match('./'))));
});
