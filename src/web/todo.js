// Descargar el juego entero (versión web y app instalada): todos los archivos de esta versión —modelos, texturas,
// láminas, sonidos y el código de cada pueblo y minijuego— se guardan en el ordenador, en la misma caché que usa el
// service worker (src/web/sw.js). Así no se espera a internet al entrar en un pueblo nuevo o en un minijuego, y se puede
// jugar sin conexión. La lista la escribe vite.config.js en todo.json; lo que ya está guardado no se vuelve a bajar.
const CACHE = 'herrizherri-assets';
export const puedeDescargar = () => typeof __WEB__ !== 'undefined' && __WEB__ && !(typeof __AF__ !== 'undefined' && __AF__) && 'caches' in globalThis && !!navigator.serviceWorker;

async function lista() {
  const r = await fetch('./todo.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('lista');
  return r.json();   // { files: [nombre en assets/], bytes: [tamaño de cada uno] }
}
/** Lo que falta por guardar: { falta, total, bytesFalta, bytesTotal }. */
export async function queFalta() {
  const L = await lista(), c = await caches.open(CACHE);
  let falta = 0, bytesFalta = 0;
  await Promise.all(L.files.map(async (f, i) => { if (!(await c.match(new URL('./assets/' + f, location.href).href))) { falta++; bytesFalta += L.bytes[i] || 0; } }));
  return { falta, total: L.files.length, bytesFalta, bytesTotal: L.bytes.reduce((a, b) => a + b, 0) };
}
/** Lo baja todo, de seis en seis; avisa con progreso({ hechos, total, bytes, bytesTotal }) y devuelve los que fallaron. */
export async function descargarTodo(progreso) {
  try { await navigator.storage?.persist?.(); } catch (e) { }   // (que el navegador no lo borre para hacer sitio)
  const L = await lista(), c = await caches.open(CACHE), total = L.files.length, bytesTotal = L.bytes.reduce((a, b) => a + b, 0);
  let i = 0, hechos = 0, bytes = 0, fallos = 0;
  const uno = async () => {
    while (i < total) {
      const n = i++, u = new URL('./assets/' + L.files[n], location.href).href;
      try { if (!(await c.match(u))) { const r = await fetch(u); if (r.ok) await c.put(u, r); else fallos++; } } catch (e) { fallos++; }
      hechos++; bytes += L.bytes[n] || 0; progreso?.({ hechos, total, bytes, bytesTotal });
    }
  };
  await Promise.all(Array.from({ length: 6 }, uno));
  return fallos;
}
