// Movimiento: las piezas comunes para animar cualquier pantalla del juego, con las curvas y los tiempos de ui/motion.css
// (noviembre de 2026, fase 1 del rediseño de la animación). Con la Web Animations API del navegador, sin librerías:
// - solo transform y opacity, así no se recoloca nada alrededor y va suave en el móvil;
// - «fill: backwards»: el elemento espera ya en su punto de salida mientras le toca, y al acabar no queda ningún estilo
//   pegado (si la animación no llega a correr, se ve tal cual);
// - con «reducir movimiento» del sistema no se anima nada: todo aparece en su sitio.
const css = () => getComputedStyle(document.documentElement);
/** ¿Ha pedido el sistema reducir el movimiento? */
export const reducido = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Un tiempo de motion.css en milisegundos (--d-entra…), o el de repuesto si no está */
export const tiempo = (nombre, porDefecto) => { const s = css().getPropertyValue(nombre).trim(); const v = parseFloat(s); return Number.isFinite(v) ? (s.endsWith('ms') ? v : v * 1000) : porDefecto; };
/** Una curva de motion.css por su nombre (ease, muelle, sale, anticipa, vaiven) */
export const curva = (nombre) => css().getPropertyValue('--' + nombre).trim() || 'ease-out';
const DIR = { abajo: [0, 1], arriba: [0, -1], izq: [-1, 0], der: [1, 0], centro: [0, 0] };

/** Que aparezca: desde un lado (abajo, arriba, izq, der) o en el sitio (centro), con fundido y, si se pide, creciendo */
export function entra(el, { de = 'abajo', dist = 12, escala = 1, dur, delay = 0, ease = 'ease' } = {}) {
  if (!el?.animate || reducido()) return null;
  const [x, y] = DIR[de] || DIR.abajo;
  return el.animate([{ opacity: 0, transform: `translate(${x * dist}px, ${y * dist}px) scale(${escala})` }, { opacity: 1, transform: 'none' }],
    { duration: dur ?? tiempo('--d-entra', 300), delay, easing: curva(ease), fill: 'backwards' });
}

/** Que se vaya, más deprisa que como entró; devuelve una promesa que se cumple al acabar (o enseguida, sin animación) */
export function sale(el, { a = 'abajo', dist = 8, dur } = {}) {
  if (!el?.animate || reducido()) return Promise.resolve();
  const [x, y] = DIR[a] || DIR.abajo;
  const an = el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translate(${x * dist}px, ${y * dist}px)` }],
    { duration: dur ?? tiempo('--d-entra', 300) * 0.6, easing: curva('sale'), fill: 'forwards' });
  return an.finished.catch(() => {});
}

/** En cascada: cada uno detrás del anterior, de «escalon» en «escalon»; a partir del «max», todos a la vez (así la última
 *  no se hace esperar en una lista larga) */
export function cascada(els, opts = {}) {
  const e = tiempo('--escalon', 30), max = opts.max ?? 8;
  return [...els].map((el, i) => entra(el, { ...opts, delay: (opts.delay || 0) + Math.min(i, max) * e }));
}

/** Cambio de sección: lo de dentro llega desde el lado hacia el que vas (1, la siguiente; -1, la anterior) o, si no hay
 *  lado, sube un poco. Primero el rótulo y luego lo demás, en cascada; solo lo que se ve de entrada */
export function cambiaPantalla(cont, dir = 0) {
  if (!cont || reducido()) return;
  const alto = cont.clientHeight || innerHeight, hijos = [...cont.children].filter(h => h.getClientRects().length && h.offsetTop < cont.scrollTop + alto);
  cascada(hijos.slice(0, 10), { de: dir > 0 ? 'der' : dir < 0 ? 'izq' : 'abajo', dist: dir ? 28 : 12, dur: tiempo('--d-pantalla', 450), max: 5 });
}

/** Que se deslice desde donde estaba (r0, su getBoundingClientRect de antes del cambio) hasta donde está ahora: se cambia
 *  de sitio de golpe y se anima solo el transform de vuelta (la técnica FLIP), sin animar top ni left, que recolocan */
export function desdeAqui(el, r0, { dur, ease = 'muelle' } = {}) {
  if (!el?.animate || !r0 || reducido()) return null;
  const r1 = el.getBoundingClientRect(), dx = r0.left - r1.left, dy = r0.top - r1.top;
  if (Math.abs(dx) + Math.abs(dy) < 1 || !r1.width) return null;
  return el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: dur ?? tiempo('--d-panel', 380), easing: curva(ease) });
}

/** Un número que sube hasta su valor (marcadores, experiencia): rápido al principio y despacio al llegar */
export function cuenta(el, hasta, { desde = 0, dur = 900, fmt = (v) => Math.round(v).toLocaleString('es-ES') } = {}) {
  if (!el) return;
  if (reducido() || !(dur > 0)) { el.textContent = fmt(hasta); return; }
  const t0 = performance.now(), paso = (t) => { const k = Math.min(1, (t - t0) / dur), v = desde + (hasta - desde) * (1 - Math.pow(1 - k, 3)); el.textContent = fmt(v); if (k < 1 && el.isConnected) requestAnimationFrame(paso); };
  requestAnimationFrame(paso);
}

/** Relieve con el ratón: pone --px y --py (de -1 a 1, dónde está el puntero) en el elemento, y cada capa se mueve con
 *  ellas en su CSS según lo lejos que esté. Solo con ratón y sin «reducir movimiento»; devuelve cómo quitarlo */
export function relieve(host) {
  if (!host || reducido() || typeof matchMedia !== 'function' || !matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};
  let raf = 0, x = 0, y = 0;
  const mueve = (e) => { const r = host.getBoundingClientRect(); x = ((e.clientX - r.left) / r.width) * 2 - 1; y = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; host.style.setProperty('--px', x.toFixed(3)); host.style.setProperty('--py', y.toFixed(3)); }); };
  const fuera = () => { host.style.setProperty('--px', 0); host.style.setProperty('--py', 0); };
  host.addEventListener('pointermove', mueve, { passive: true }); host.addEventListener('pointerleave', fuera);
  return () => { host.removeEventListener('pointermove', mueve); host.removeEventListener('pointerleave', fuera); cancelAnimationFrame(raf); };
}
