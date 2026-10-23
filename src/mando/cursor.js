// La flecha del panel táctil: en los menús y en los minijuegos que se tocan, el móvil (o la palanca de un mando de verdad)
// la mueve y, al tocar, pulsa lo que hay debajo. Y pulsar un botón de la pantalla como si se tocara con el dedo, para los
// botones que el móvil copia (contextos.js).
import { enCss } from '../util/tele.js';
let el = null, x = 0, y = 0, on = false;
const pon = () => { if (el) el.style.transform = `translate(${enCss(x)}px, ${enCss(y)}px)`; };   // (x e y, en píxeles de la pantalla: util/tele.js)
/** Enseña o esconde la flecha. */
export function verFlecha(v) {
  if (v === on) return; on = v;
  if (v && !el) {
    el = document.createElement('div'); el.className = 'mnd-cur'; el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;width:28px;height:28px;pointer-events:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.6));transition:opacity .2s';
    el.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M3 2l17 9-7 2-3 8z" fill="#fff" stroke="#ff2bd6" stroke-width="2" stroke-linejoin="round"/></svg>';
    document.body.appendChild(el); x = innerWidth / 2; y = innerHeight / 2; pon();
  }
  if (el) el.style.opacity = v ? '1' : '0';
}
/** Mueve la flecha (en píxeles de la pantalla del ordenador). */
export function mueve(dx, dy) {
  if (!on) verFlecha(true);
  x = Math.max(0, Math.min(innerWidth - 4, x + dx)); y = Math.max(0, Math.min(innerHeight - 4, y + dy)); pon();
  const t = document.elementFromPoint(x, y); if (t) t.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: y, pointerType: 'mouse', pointerId: 77 }));
}
// lo que hace un dedo al tocar: apoyar, levantar y, al levantar, el clic
function toca(t, cx, cy, down) {
  const o = { bubbles: true, cancelable: true, composed: true, clientX: cx, clientY: cy, pointerId: 77, pointerType: 'mouse', isPrimary: true, button: 0, buttons: down ? 1 : 0 };
  if (down) { t.dispatchEvent(new PointerEvent('pointerdown', o)); t.dispatchEvent(new MouseEvent('mousedown', o)); }
  else { t.dispatchEvent(new PointerEvent('pointerup', o)); t.dispatchEvent(new MouseEvent('mouseup', o)); t.dispatchEvent(new MouseEvent('click', o)); }
}
/** Pulsa lo que hay debajo de la flecha (apoyar y levantar). */
export function clic() { const t = document.elementFromPoint(x, y); if (!t) return; toca(t, x, y, true); toca(t, x, y, false); if (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) t.focus(); }
/** Apoya (down) o levanta el dedo sobre un botón de la pantalla, en su centro. */
export function pulsar(b, down) {
  if (!b?.isConnected) return;
  const r = b.getBoundingClientRect(); toca(b, r.left + r.width / 2, r.top + r.height / 2, down);
}
/** Desplaza la lista que hay debajo de la flecha (dos dedos en el móvil). */
export function rueda(dy) {
  for (let t = document.elementFromPoint(x, y); t && t !== document.body; t = t.parentElement) {
    const s = getComputedStyle(t);
    if (/(auto|scroll)/.test(s.overflowY) && t.scrollHeight > t.clientHeight + 1) { t.scrollBy(0, dy); return; }
  }
  document.scrollingElement?.scrollBy(0, dy);
}
