/* Apuntador · service worker
   - La app (esta carpeta): primero la red, para que cada versión nueva llegue al momento; sin conexión, la copia guardada.
   - Librerías, modelos de visión y letra (CDN con versión fija en la dirección): primero la copia guardada; se descargan una vez.
   Solo actúa dentro de /apuntador/: el resto del sitio no se toca. */
const APP = 'apuntador-app-v7';
const LIBS = 'apuntador-libs-v1';
const SHELL = ['./', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const LIB_HOSTS = /^(cdn\.jsdelivr\.net|storage\.googleapis\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('apuntador-') && k !== APP && k !== LIBS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  // el modelo de voz (unos 40 MB) lo guarda el propio reconocedor en el dispositivo: aquí no se duplica
  if (url.origin === location.origin && url.pathname.includes('/models/')) return;
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(APP).then(c => c.put(req, copy)); }
      return res;
    }).catch(async () => (await caches.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? caches.match('./') : Response.error())));
    return;
  }
  if (LIB_HOSTS.test(url.hostname)) {
    e.respondWith(caches.open(LIBS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone()).catch(() => {});
      return res;
    }));
  }
});
