// Los mandos: los de verdad (Bluetooth o USB, que el navegador da por la Gamepad API) y el móvil que hace de mando
// (mando.js, que se presenta como uno más, con la disposición estándar). Cada fotograma se leen todos y lo que hace cada
// botón depende del momento (contextos.js): en el pueblo, A es hablar y la palanca anda; en la pelota, A golpea y la
// palanca pulsa las flechas; en un minijuego o un menú, A pulsa su botón principal, B vuelve atrás y la palanca mueve la
// flecha del panel táctil. Las teclas se pulsan como si vinieran del teclado, así que valen sin tocar cada juego. El
// fútbol lee los mandos él mismo (futbol/match.js: pollPad) y, mientras se juega, aquí no se pulsa nada.
import { ctxActual } from './contextos.js';
import { verFlecha, mueve, pulsar } from './cursor.js';

/** Palanca para andar (de -1 a 1; y: adelante) y giro de cámara acumulado en píxeles, como si se arrastrara el ratón. */
export const PAD = { x: 0, y: 0, lx: 0, ly: 0 };
/** El móvil, con la forma de un mando estándar: 4 ejes y 17 botones. */
export const VPAD = { id: 'Herrizherri: mando del móvil', index: 7, connected: false, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };

const CODE = { e: 'KeyE', ' ': 'Space', f: 'KeyF', b: 'KeyB', c: 'KeyC', m: 'KeyM', h: 'KeyH', l: 'KeyL', p: 'KeyP', Shift: 'ShiftLeft', Escape: 'Escape', Enter: 'Enter' };
/** Pulsa o suelta una tecla del juego como si viniera del teclado. */
export function tecla(type, key, repeat = false) {
  const code = CODE[key] || (/^Arrow/.test(key) ? key : /^\d$/.test(key) ? 'Digit' + key : '');
  document.body.dispatchEvent(new KeyboardEvent(type, { key, code, repeat, bubbles: true, cancelable: true }));
}

// qué hace un botón ahora: una tecla, pulsar un botón de la pantalla o nada (lo lee el propio juego)
function accion(C, i) {
  if (C.nativo) return null;
  if (C.tac && i === 0 && C.prim) return { el: C.prim.el };
  const k = C.b[i]?.[1]; return k ? { key: k } : null;
}
const prev = new Map(), held = new Map(), flechas = new Map();
let raf = 0, quieto = 0;
const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
function suelta(a) { if (a.key) tecla('keyup', a.key); else if (a.el) pulsar(a.el, false); }
function frame() {
  const L = navigator.getGamepads ? [...navigator.getGamepads()].filter(p => p && p.connected) : [];
  if (!L.length && ++quieto > 120) { raf = 0; PAD.x = PAD.y = 0; verFlecha(false); return; }   // (sin mandos, deja de mirar)
  if (L.length) quieto = 0;
  raf = requestAnimationFrame(frame);
  const C = ctxActual();
  verFlecha(L.length > 0 && C.tac);
  let x = 0, y = 0;
  for (const gp of L) {
    const ax = dz(gp.axes[0] || 0), ay = dz(gp.axes[1] || 0);
    if (Math.abs(ax) + Math.abs(ay) > Math.abs(x) + Math.abs(y)) { x = ax; y = -ay; }
    if (gp.mapping === 'standard' && C.mira) { PAD.lx += dz(gp.axes[2] || 0) * 12; PAD.ly += dz(gp.axes[3] || 0) * 9; }
    if (gp === VPAD) continue;   // (los botones del móvil se atienden al llegar: botonMovil)
    const id = gp.index + gp.id, before = prev.get(id) || [], now = gp.buttons.map(b => b.pressed || b.value > 0.5);
    for (let i = 0; i < now.length; i++) {
      const k = i + ':' + id;
      if (now[i] && !before[i]) { const a = accion(C, i); if (a) { held.set(k, a); if (a.key) tecla('keydown', a.key); else pulsar(a.el, true); } }
      else if (!now[i] && held.has(k)) { suelta(held.get(k)); held.delete(k); }
    }
    prev.set(id, now);
  }
  // la palanca: anda (Input la suma al teclado), pulsa las flechas (con repetición, como una tecla que se deja apretada) o
  // mueve la flecha del panel táctil (solo la de un mando de verdad: el móvil la mueve con el dedo)
  const want = new Set(C.pal === 'flechas' ? [x < -0.4 && 'ArrowLeft', x > 0.4 && 'ArrowRight', y > 0.4 && 'ArrowUp', y < -0.4 && 'ArrowDown'].filter(Boolean) : []);
  const n = performance.now();
  for (const [k] of flechas) if (!want.has(k)) { tecla('keyup', k); flechas.delete(k); }
  for (const k of want) { const last = flechas.get(k); if (last == null) { tecla('keydown', k); flechas.set(k, n + 250); } else if (n > last) { tecla('keydown', k, true); flechas.set(k, n + 80); } }
  if (C.tac && !C.pal) { const real = L.find(p => p !== VPAD); if (real) { const rx = dz(real.axes[0] || 0), ry = dz(real.axes[1] || 0); if (rx || ry) mueve(rx * 14, ry * 14); } }
  PAD.x = C.pal === 'andar' ? x : 0; PAD.y = C.pal === 'andar' ? y : 0;
}
/** Un botón del móvil: se pulsa en cuanto llega, sin esperar al siguiente fotograma (una pulsación corta, con el ordenador
 *  ocupado, podía caer entre dos y perderse); el mando estándar del móvil también se actualiza, para el fútbol. */
export function botonMovil(i, d) {
  const b = VPAD.buttons[i]; if (!b) return;
  b.pressed = b.touched = !!d; b.value = d ? 1 : 0; VPAD.timestamp = performance.now();
  const k = i + ':' + VPAD.index + VPAD.id;
  if (d && !held.has(k)) { const a = accion(ctxActual(), i); if (a) { held.set(k, a); if (a.key) tecla('keydown', a.key); else pulsar(a.el, true); } }
  else if (!d && held.has(k)) { suelta(held.get(k)); held.delete(k); }
}
/** Empieza a leer los mandos (se para solo cuando no queda ninguno). */
export function leerMandos() { quieto = 0; if (!raf) raf = requestAnimationFrame(frame); }
addEventListener('gamepadconnected', leerMandos);

let parche = false;
/** Enciende o apaga el mando del móvil: mientras está, sale en navigator.getGamepads como uno más. */
export function mandoMovil(on) {
  if (on && !parche) {
    parche = true;
    const real = navigator.getGamepads ? navigator.getGamepads.bind(navigator) : () => [];
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => { const L = [...real()]; if (VPAD.connected) L.push(VPAD); return L; } });
  }
  VPAD.connected = !!on;
  if (!on) {   // (lo que el móvil dejó pulsado se suelta: si se corta a media carrera, el explorador no sigue corriendo)
    VPAD.axes.fill(0); VPAD.buttons.forEach(b => { b.pressed = false; b.value = 0; });
    const id = VPAD.index + VPAD.id; prev.delete(id);
    for (const [k, a] of held) if (k.endsWith(':' + id)) { suelta(a); held.delete(k); }
    for (const [k] of flechas) tecla('keyup', k); flechas.clear(); PAD.x = PAD.y = 0;
  } else leerMandos();
}
