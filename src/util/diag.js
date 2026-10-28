// Lo que hace falta saber para arreglar un fallo en un móvil que no se puede probar aquí: qué versión tiene abierta, qué
// pantalla le da el navegador frente a la del aparato, si es la app instalada, si tiene «Reducir movimiento», el modo
// sencillo, la tarjeta gráfica y lo último que apuntó el mapa 3D al mirar si se veía (src/hub/mapa3d.js). Sale en
// Ajustes › Diagnóstico, para hacerle una captura y mandarla
const K = 'herrizherri-diag-mapa';
/** Apunta lo que ha visto el mapa 3D (lo último, nada más). */
export function apunta(d) { try { localStorage.setItem(K, JSON.stringify(d).slice(0, 6000)); } catch (e) { /* sin almacenamiento */ } }
const lee = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
/** Apunta una pérdida de la imagen (WebGL): cuántas van y dónde fue la última. */
export function apuntaPerdida(donde) { try { const n = +(lee('herrizherri-perdidas') || '0|').split('|')[0] + 1; localStorage.setItem('herrizherri-perdidas', `${n}|${new Date().toLocaleString()} · ${donde}`); } catch (e) { /* sin almacenamiento */ } }
const version = () => (document.querySelector('script[type="module"][src*="assets/index-"]')?.getAttribute('src') || '').match(/index-([\w-]+)\.js/)?.[1] || 'desarrollo';
const instalada = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;
/** Las filas del diagnóstico: [rótulo, valor] */
export function datos() {
  const f = [['Versión', version()],
    ['Ventana', `${innerWidth} × ${innerHeight} · página ${Math.round(document.documentElement.getBoundingClientRect().height)} · pantalla ${screen.width} × ${screen.height} · ×${devicePixelRatio}`],
    ['App instalada', instalada() ? 'sí' : 'no'],
    ['Reducir movimiento', matchMedia('(prefers-reduced-motion: reduce)').matches ? 'sí' : 'no'],
    ['Modo sencillo', lee('herrizherri-sencillo') || 'no'], ['Arranques sin acabar', lee('herrizherri-arranque') || '0'],
    ['Imagen perdida', (lee('herrizherri-perdidas') || '0').replace('|', ' veces · la última, ')]];
  let m = null; try { m = JSON.parse(lee(K) || 'null'); } catch (e) { /* roto */ }
  if (m) {
    f.push(['Mapa 3D', `${m.ve ? 'se ve' : 'no se ve'} · ${m.cuando || ''} · ${m.gpu || ''} · lienzo ${m.lienzo || ''}${m.intento ? ' · intento ' + m.intento : ''}${m.ligero ? ' · ligero' : ''}`]);
    for (const p of m.malos || []) f.push(['Sombreador', `${p.nombre}: ${p.log}`]);
  } else f.push(['Mapa 3D', 'aún sin mirar']);
  f.push(['Navegador', navigator.userAgent]);
  return f;
}
