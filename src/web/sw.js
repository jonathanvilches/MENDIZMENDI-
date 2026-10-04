// Service worker de MENDIMENDIZ (versión web): guarda lo que se descarga para que la segunda vez cargue al momento y se
// pueda jugar sin conexión. Los archivos de assets/ llevan su huella en el nombre (no cambian nunca): se sirven de la
// caché. La página y el manifiesto se piden primero a la red (para recibir la versión nueva) y, sin red, de la caché.
// Dos cachés:
//  · la de la página, con el nombre de la versión (lo pone vite.config.js): al llegar una versión nueva se cambia entera
//  · la de los archivos con huella, común a todas las versiones: al actualizar solo se descarga lo que ha cambiado
//    (modelos, texturas y sonidos que no se tocan siguen guardados) y se quitan los que esta versión ya no usa
const CACHE = 'mendimendiz-__VERSION__';
const ASSETS = 'mendimendiz-assets';
const KEEP = new Set(__FILES__);   // los archivos de assets/ de esta versión (lo pone vite.config.js)
const name = (url) => new URL(url).pathname.split('/').pop();
// al instalarse guarda la página y lo imprescindible para arrancar (código, estilos y fuentes; unos 2,5 MB): así el
// juego abre sin conexión desde la primera visita. Modelos, texturas y sonidos se guardan según se usan.
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil((async () => {
    await caches.open(CACHE).then(c => c.addAll(['./', './manifest.webmanifest'])).catch(() => {});
    const a = await caches.open(ASSETS);
    // (si ya está en la caché de una versión anterior, se copia en vez de volver a descargarlo)
    await Promise.all([...KEEP].filter(f => /\.(js|css|woff2)$/.test(f)).map(async f => {
      const u = new URL('./assets/' + f, self.location).href; if (await a.match(u)) return;
      const hit = await caches.match(u); if (hit) return a.put(u, hit);
      return a.add(u).catch(() => {});
    }));
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = await caches.open(ASSETS);
    for (const k of await caches.keys()) {
      if (k === CACHE || k === ASSETS) continue;
      // cachés de versiones anteriores: lo que esta versión sigue usando pasa a la caché común antes de borrarlas
      if (k.startsWith('mendimendiz-')) {
        const old = await caches.open(k);
        for (const r of await old.keys()) if (new URL(r.url).pathname.includes('/assets/') && KEEP.has(name(r.url)) && !(await keep.match(r))) { const res = await old.match(r); if (res) await keep.put(r, res); }
      }
      await caches.delete(k);
    }
    for (const r of await keep.keys()) if (!KEEP.has(name(r.url))) await keep.delete(r);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.includes('/assets/')) {
    // con huella: caché primero; lo que no esté se descarga y se guarda
    e.respondWith(caches.open(ASSETS).then(async c => (await c.match(r)) || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; })));
    return;
  }
  // la página: red primero (versión nueva), y si no hay red, la guardada
  e.respondWith(fetch(r).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(r, res.clone())); return res; })
    .catch(async () => (await caches.match(r)) || (await caches.match('./'))));
});
