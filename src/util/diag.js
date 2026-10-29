// Lo que hace falta saber para arreglar un fallo en un móvil que no se puede probar aquí: qué versión tiene abierta, qué
// pantalla le da el navegador frente a la del aparato, si es la app instalada, si tiene «Reducir movimiento», el modo
// sencillo, la tarjeta gráfica y lo último que apuntó el mapa 3D al mirar si se veía (src/hub/mapa3d.js). Sale en
// Ajustes › Diagnóstico, para hacerle una captura y mandarla
const K = 'herrizherri-diag-mapa';
/** Apunta lo que ha visto el mapa 3D (lo último, nada más). */
export function apunta(d) { try { localStorage.setItem(K, JSON.stringify(d).slice(0, 6000)); } catch (e) { /* sin almacenamiento */ } }
const lee = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
/** Apunta una pérdida de la imagen (WebGL): cuántas van y dónde fue la última. */
export function apuntaPerdida(donde) { try { const n = +(lee('herrizherri-perdidas') || '0|').split('|')[0] + 1; localStorage.setItem('herrizherri-perdidas', `${n}|${new Date().toLocaleString()} · ${donde}`); if (/pelota/.test(donde)) localStorage.setItem(KP, '1'); } catch (e) { /* sin almacenamiento */ } }
// si en este aparato ya se ha perdido la imagen en un partido de pelota (o al prepararlo), los partidos van desde
// entonces aún más ligeros (src/game/fronton.js). Vale también lo apuntado antes de existir esta marca
const KP = 'herrizherri-pelota-ligera';
export const pelotaLigera = () => !!lee(KP) || /pelota/.test(lee('herrizherri-perdidas') || '');
const version = () => (document.querySelector('script[type="module"][src*="assets/index-"]')?.getAttribute('src') || '').match(/index-([\w-]+)\.js/)?.[1] || 'desarrollo';
const instalada = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;
// (lo último que apuntó el informe de la partida anterior, util/informe.js: dónde estaba y si se cerró bien o de golpe)
function anterior() {
  let r = null; try { r = JSON.parse(lee('herrizherri-rastro') || 'null'); } catch (e) { /* roto */ }
  if (!r?.lugar) return 'sin datos';
  const d = [r.lugar, `${r.t ?? '?'} s`, r.bien ? 'se cerró bien' : 'se cortó de golpe', r.perdida ? 'con la imagen perdida' : '',
    r.fps ? `${r.fps} fps` : '', r.triangulos ? `${Math.round(r.triangulos / 1000)} mil triángulos` : '', r.resolucion ? `×${r.resolucion}` : '',
    r.texturas ? `${r.texturas} texturas · ${r.geometrias} geometrías` : '', r.cuando ? new Date(r.cuando).toLocaleString() : ''];
  return d.filter(Boolean).join(' · ');
}
/** Las filas del diagnóstico: [rótulo, valor] */
export function datos() {
  const f = [['Versión', `${version()} · ${typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'desarrollo'} · ${location.hostname || 'archivo'}`],
    ['Ventana', `${innerWidth} × ${innerHeight} · página ${Math.round(document.documentElement.getBoundingClientRect().height)} · pantalla ${screen.width} × ${screen.height} · ×${devicePixelRatio}`],
    ['App instalada', instalada() ? 'sí' : 'no'],
    ['Reducir movimiento', matchMedia('(prefers-reduced-motion: reduce)').matches ? 'sí' : 'no'],
    ['Modo sencillo', lee('herrizherri-sencillo') || 'no'], ['Arranques sin acabar', lee('herrizherri-arranque') || '0'],
    ['Imagen perdida', (lee('herrizherri-perdidas') || '0').replace('|', ' veces · la última, ') + (pelotaLigera() ? ' · partidos de pelota aligerados' : '')], ['La vez anterior', anterior()]];
  let m = null; try { m = JSON.parse(lee(K) || 'null'); } catch (e) { /* roto */ }
  if (m) {
    f.push(['Mapa 3D', `${m.ve ? 'se ve' : 'no se ve'} · ${m.cuando || ''} · ${m.gpu || ''} · lienzo ${m.lienzo || ''}${m.intento ? ' · intento ' + m.intento : ''}${m.ligero ? ' · ligero' : ''}`]);
    for (const p of m.malos || []) f.push(['Sombreador', `${p.nombre}: ${p.log}`]);
  } else f.push(['Mapa 3D', 'aún sin mirar']);
  f.push(['Navegador', navigator.userAgent]);
  return f;
}
