// En qué se está en el juego y qué hace cada botón del mando en ese momento. Lo usan el móvil (mando.js le manda los
// nombres para que pinte sus botones) y los mandos de verdad (pad.js convierte cada botón en su tecla). Hay dos clases:
//  · los momentos con mando propio (el pueblo, el encierro, los prismáticos, los diálogos, la pelota, la pasaka, el fútbol
//    y los minijuegos 3D que se juegan con teclas): sus botones y sus teclas, de la tabla FIJOS;
//  · todo lo demás (los minijuegos de ventana, los 3D con botones, las fichas, los paneles y los menús): el mando copia los
//    botones que se ven en pantalla, los mismos que se tocan en una tableta, y además hace de panel táctil con una flecha
//    para lo que no es un botón. Así cada minijuego trae sus botones, también los que se añadan, sin tocar el minijuego.
// Botones estándar de un mando: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 Select, 9 Start.

// [nombre, tecla]; la tecla null es que el juego lee el mando él mismo (el fútbol)
const FIJOS = {
  juego: { tit: 'En el pueblo', pal: 'andar', mira: true, b: { 0: ['Acción', 'e'], 1: ['Saltar', ' '], 2: ['Prismáticos', 'f'], 3: ['Mochila', 'b'], 4: ['Cuaderno', 'c'], 5: ['Mapa', 'm'], 7: ['Correr', 'Shift'], 8: ['Perro', 'h'], 9: ['Menú', 'Escape'] }, fijo: [7] },
  encierro: { tit: 'El encierro', pal: 'andar', mira: true, b: { 0: ['Saltar', ' '], 2: ['Periódico', 'p'], 3: ['Cámara', 'c'], 7: ['Correr', 'Shift'] } },
  bino: { tit: 'Prismáticos', mira: true, b: { 0: ['Anotar', 'e'], 1: ['Salir', 'f'] } },
  dialogo: { tit: 'Hablando', b: { 0: ['Seguir', 'e'] } },
  pelota: { tit: 'Pelota a mano', pal: 'flechas', b: { 0: ['Golpe', ' '], 1: ['Dejada', 'Shift'], 2: ['Cortada', 'l'], 9: ['Salir', 'Escape'] } },
  pasaka: { tit: 'Pasaka', pal: 'flechas', b: { 0: ['Golpe', ' '], 1: ['Dejada', 'Shift'], 2: ['Globo', 'l'], 9: ['Salir', 'Escape'] } },
  futbol: { tit: 'Fútbol', pal: 'pad', nativo: true, b: { 0: ['Pase', null], 1: ['Tiro', null], 4: ['Cambiar', null], 7: ['Sprint', null], 9: ['Pausa', null] } },
  // (minijuegos 3D que se juegan con teclas: el esquileo con las flechas, la costura con un botón)
  shearGame: { tit: 'El esquileo', pal: 'flechas', b: { 9: ['Salir', 'Escape'] } },
  stitchGame: { tit: 'La costura', b: { 0: ['Coser', ' '], 9: ['Salir', 'Escape'] } },
};
// las ventanas que, abiertas, mandan sobre el juego (la última en la página es la de encima)
const VENTANAS = '.mnd-ov, .mg-overlay, .mg3d, .screen, #reward, .champ, .lg-root, .tn-root, .pfx, .pel-panel, .fb-panel, .shop, .bagpanel, .sheet, .hub-sheet, [role=dialog]';
const vis = (e) => !!e && e.offsetWidth > 0 && e.offsetHeight > 0 && getComputedStyle(e).visibility !== 'hidden';
// (sin el número de delante de las respuestas, que va en su propia etiqueta: «1Sí, vamos» es «Sí, vamos»)
const nombre = (b) => { const n = b.firstElementChild && /^\d+$/.test(b.firstElementChild.textContent.trim()) ? b.firstElementChild.textContent.length : 0; const t = (b.textContent || '').slice(n).replace(/\s+/g, ' ').trim(), al = b.getAttribute('aria-label') || b.title || ''; return (t.length < 2 && al) || t || al; };   // (un ✕ suelto se llama por su etiqueta: «Salir»)
const CERRAR = /^(✕|×|x)$|salir|cerrar|volver|atrás|ahora no|itxi|irten|itzuli/i;

/** Los botones que se ven en una ventana, para copiarlos en el móvil (como mucho 8, el de cerrar al final). */
function botones(root) {
  const L = [], seen = new Set();
  for (const b of root.querySelectorAll('button, [role=button]')) {
    if (!vis(b) || b.disabled || b.closest('details:not([open]) > :not(summary)')) continue;
    const t = nombre(b); if (!t || seen.has(t)) continue;
    seen.add(t); L.push({ el: b, t: t.length > 34 ? t.slice(0, 33) + '…' : t });
  }
  const cierra = L.filter(x => CERRAR.test(x.t)), resto = L.filter(x => !CERRAR.test(x.t));
  return [...resto.slice(0, 8 - Math.min(1, cierra.length)), ...cierra.slice(0, 1)];
}
function fijo(m, extra = {}) { const F = FIJOS[m]; return { m, tit: F.tit, pal: F.pal || '', mira: !!F.mira, tac: false, nativo: !!F.nativo, b: F.b, fijo: F.fijo || [], esp: [], ...extra }; }
function espejo(m, root, tit) {
  const esp = botones(root), prim = esp.find(x => x.el.matches('.primary, .go, [data-go], .pel-go:not(.alt)')) || esp.find(x => !CERRAR.test(x.t)) || esp[0];
  const h = root.querySelector('h1, h2, h3');
  return { m, tit: tit || (h ? nombre(h).slice(0, 40) : ''), pal: '', mira: false, tac: true, nativo: false, b: { 9: ['Atrás', 'Escape'] }, fijo: [], esp, prim };
}

function calcula() {
  const fb = document.querySelector('.fb-root'), pel = document.querySelector('.pel-root');
  // la ventana de encima (sin contar la del propio fútbol o la pelota, que son el juego)
  const tops = [...document.querySelectorAll(VENTANAS)].filter(vis);
  const top = tops[tops.length - 1];
  if (fb && !(top && (top.matches('.fb-panel, .lg-root, .tn-root') || top.closest('.fb-panel')))) return fijo('futbol');
  if (pel && !(top && (top.matches('.pel-panel, .pfx') || top.closest('.pel-panel')))) return fijo(pel.classList.contains('pk-hud') ? 'pasaka' : 'pelota');
  const d = document.getElementById('dialog');
  if (vis(d)) { const ch = d.querySelectorAll('.choices button'); return ch.length ? espejo('elegir', d, 'Pregunta') : fijo('dialogo'); }
  if (top) {
    const m3 = top.matches('.mg3d') && document.body.dataset.mini3d;
    if (m3 && FIJOS[m3]) return fijo(m3);
    return espejo(top.matches('.mg3d') ? 'mini3d' : top.matches('.mg-overlay') ? 'minijuego' : 'ventana', top);
  }
  if (document.body.classList.contains('bino-on')) return fijo('bino');
  if (document.querySelector('.enc-hud')) return fijo('encierro');
  const hub = document.getElementById('hub');
  if (hub && !hub.classList.contains('hidden')) return { m: 'menu', tit: 'En el menú', pal: '', mira: false, tac: true, nativo: false, b: {}, fijo: [], esp: [], jugar: true };
  return fijo('juego');
}
let C = null, t = 0;
/** El momento de ahora (se recalcula como mucho cinco veces por segundo). */
export function ctxActual() { const n = performance.now(); if (!C || n - t > 200) { C = calcula(); t = n; } return C; }
/** Lo que se le cuenta al móvil: los nombres de los botones, sin las teclas ni los elementos de la página. */
export function ctxMovil(c = ctxActual()) {
  return { t: 'ctx', m: c.m, tit: c.tit, pal: c.pal, mira: c.mira, tac: c.tac, fijo: c.fijo, jugar: !!c.jugar, b: Object.fromEntries(Object.entries(c.b).map(([i, [n]]) => [i, n])), esp: c.esp.map(x => x.t) };
}
