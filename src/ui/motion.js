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
  // (k desde 0: el reloj del fotograma puede ir un poco por detrás del de ahora, y la cuenta empezaba en negativo, «-1»)
  const t0 = performance.now(), paso = (t) => { const k = Math.max(0, Math.min(1, (t - t0) / dur)), v = desde + (hasta - desde) * (1 - Math.pow(1 - k, 3)); el.textContent = fmt(v); if (k < 1 && el.isConnected) requestAnimationFrame(paso); };
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

// ---------- Cartas (fase 3 del rediseño de la animación) ----------
// (las cartas que reaccionan: las del menú y de las colecciones; las del partido van aparte, con su neón)
export const CARTAS = '.pcard, .fcard, .lam, .ar, .scard, .ins, .ddc, .vt-cert, .ct-card, .sb-tile, .badge, .m3-chip';

/** Al pasar el ratón, la carta se inclina un poco hacia él, una luz suave la sigue y su imagen se mueve al revés (el
 *  relieve). Pone --rx, --ry (la inclinación), --mx, --my (dónde está la luz) y --px, --py (-1 a 1) en la carta; el CSS
 *  hace el resto (ui/cartas.css). Delegado en el documento, así vale para las que se pintan después. Solo con ratón */
export function cartasVivas(sel = CARTAS) {
  if (reducido() || typeof matchMedia !== 'function' || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let cur = null, raf = 0, ev = null;
  const pon = () => { raf = 0; if (!cur || !ev) return; const r = cur.getBoundingClientRect(); if (!r.width) return;
    const x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)), S = cur.style;
    S.setProperty('--ry', ((x - 0.5) * 8).toFixed(2) + 'deg'); S.setProperty('--rx', ((0.5 - y) * 6).toFixed(2) + 'deg');
    S.setProperty('--mx', (x * 100).toFixed(1) + '%'); S.setProperty('--my', (y * 100).toFixed(1) + '%');
    S.setProperty('--px', (x * 2 - 1).toFixed(3)); S.setProperty('--py', (y * 2 - 1).toFixed(3)); };
  const suelta = () => { if (!cur) return; cur.classList.remove('viva'); for (const k of ['--rx', '--ry', '--px', '--py']) cur.style.removeProperty(k); cur = null; };
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return; const c = e.target.closest?.(sel); if (c === cur) return; suelta(); if (!c) return;
    cur = c; if (!c.querySelector(':scope > .luz')) { const l = document.createElement('i'); l.className = 'luz'; l.setAttribute('aria-hidden', 'true'); if (getComputedStyle(c).position === 'static') c.style.position = 'relative'; c.appendChild(l); }
    c.classList.add('viva');
  }, { passive: true });
  document.addEventListener('pointermove', (e) => { if (!cur) return; ev = e; if (!raf) raf = requestAnimationFrame(pon); }, { passive: true });
  document.addEventListener('pointerout', (e) => { if (cur && !cur.contains(e.relatedTarget)) suelta(); }, { passive: true });
}

/** Continuidad: la ventana que abre una carta nace de la carta. Se apunta dónde estaba la carta que se toca y, si en
 *  menos de 0,7 s se abre una ventana (.mg-overlay o el visor de láminas), su recuadro sale de ese sitio y de ese tamaño
 *  hasta el suyo (FLIP: solo transform y opacity) */
export function continuidad(sel = CARTAS) {
  if (typeof MutationObserver === 'undefined') return;
  let origen = null;
  document.addEventListener('pointerdown', (e) => { const c = e.target.closest?.(sel + ', [data-carta]'); origen = c ? { r: c.getBoundingClientRect(), t: performance.now() } : null; }, { capture: true, passive: true });
  new MutationObserver((ms) => {
    if (!origen || performance.now() - origen.t > 700 || reducido()) return;
    for (const m of ms) for (const n of m.addedNodes) {
      if (n.nodeType !== 1 || !n.matches?.('.mg-overlay, .lam-view')) continue;
      const caja = n.querySelector(':scope > .mg-card, :scope > figure'); if (!caja) continue;
      const a = origen.r; origen = null;
      requestAnimationFrame(() => { const b = caja.getBoundingClientRect(); if (!b.width || !b.height) return;
        const sx = a.width / b.width, sy = a.height / b.height, dx = a.left - b.left, dy = a.top - b.top;
        caja.animate([{ transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.35 }, { transformOrigin: '0 0', transform: 'none', opacity: 1 }],
          { duration: tiempo('--d-panel', 380), easing: curva('muelle') }); });
      return;
    }
  }).observe(document.body, { childList: true });
}

/** Filas de cartas que se arrastran con el ratón y siguen un poco con la inercia al soltar, como con el dedo en el móvil
 *  (con el dedo ya lo hace el navegador). Un arrastre no cuenta como toque en la carta. Se marca la fila con data-inercia */
export function inercia(fila) {
  if (!fila || fila.dataset.inercia) return; fila.dataset.inercia = '1';
  let x0 = 0, s0 = 0, v = 0, tU = 0, xU = 0, raf = 0, movio = false, activo = false;
  const para = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; fila.style.scrollSnapType = ''; } };
  const iman = (on) => { fila.style.scrollSnapType = on ? '' : 'none'; };   // (con el imán de las cartas puesto, la fila saltaba de carta en carta mientras se arrastraba)
  fila.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; para(); activo = true; movio = false; x0 = xU = e.clientX; s0 = fila.scrollLeft; v = 0; tU = performance.now(); });
  addEventListener('pointermove', (e) => { if (!activo) return; const d = e.clientX - x0; if (Math.abs(d) > 6 && !movio) { movio = true; iman(false); } if (!movio) return;
    fila.scrollLeft = s0 - d; const t = performance.now(), dt = Math.max(1, t - tU); v = 0.8 * ((xU - e.clientX) / dt) + 0.2 * v; xU = e.clientX; tU = t; }, { passive: true });
  addEventListener('pointerup', () => { if (!activo) return; activo = false; if (!movio) return; if (reducido()) { iman(true); return; }
    let vel = v * 16; const paso = () => { fila.scrollLeft += vel; vel *= 0.92; if (Math.abs(vel) > 0.4 && fila.isConnected) raf = requestAnimationFrame(paso); else { raf = 0; iman(true); } }; raf = requestAnimationFrame(paso); });
  fila.addEventListener('click', (e) => { if (movio) { e.preventDefault(); e.stopPropagation(); movio = false; } }, { capture: true });
  fila.addEventListener('wheel', para, { passive: true });
  fila.addEventListener('dragstart', (e) => e.preventDefault());   // (sin esto el navegador arrastraba la imagen de la carta y cortaba el gesto)
}

// ---------- Marcadores y cifras (fase 4 del rediseño de la animación) ----------
/** Que la primera cifra del texto de un elemento suba desde 0 hasta su valor, sin tocar el resto del texto ni los iconos
 *  («12 sellos», «7 de 43»): se busca el primer trozo de texto con un número y solo ese trozo va cambiando */
export function cuentaTexto(el, { dur = 900 } = {}) {
  if (!el || reducido()) return;
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n = null, m = null;
  while ((n = w.nextNode())) { m = /\d[\d.]*/.exec(n.nodeValue); if (m) break; }
  if (!n || !m) return;
  const txt = n.nodeValue, antes = txt.slice(0, m.index), despues = txt.slice(m.index + m[0].length), hasta = +m[0].replace(/\./g, '');
  if (!(hasta > 0) || hasta > 1e7) return;
  // (si detrás va una palabra en plural, «12 cartas», la cuenta se salta el 1: si no, se veía un momento «1 cartas»)
  const plural = hasta > 1 && /^\s*[a-záéíóúñ]+s\b/i.test(despues);
  const mil = m[0].includes('.') || hasta >= 10000, fmt = (v) => { let r = Math.round(v); if (plural && r === 1) r = v < 1 ? 0 : 2; return mil ? r.toLocaleString('es-ES') : String(r); };
  const t0 = performance.now(), paso = (t) => { const k = Math.max(0, Math.min(1, (t - t0) / dur)); n.nodeValue = antes + fmt(hasta * (1 - Math.pow(1 - k, 3))) + despues; if (k < 1 && n.isConnected) requestAnimationFrame(paso); else n.nodeValue = txt; };
  n.nodeValue = antes + '0' + despues; requestAnimationFrame(paso);
}
// (las cifras del menú que suben al abrir una sección: la media de una ficha, las cualidades, lo descubierto de cada
// colección, tus sellos, misiones y cartas en el Perfil, tu nivel y tu experiencia)
export const CIFRAS = '.ar-count > b, .ci-ovr > b, .stats .stat > b, .pstats > span, .prof .lvl > b, .prof .lvl small, [data-cuenta]';
/** Pone a contar las cifras de lo que se acaba de pintar (solo las que se ven de entrada, como mucho 24) */
export function contadores(raiz, sel = CIFRAS) {
  if (!raiz || reducido()) return;
  const alto = innerHeight; let n = 0;
  for (const el of raiz.querySelectorAll(sel)) { if (n >= 24) break; const r = el.getBoundingClientRect(); if (!r.width || r.top > alto) continue; cuentaTexto(el); n++; }
}
