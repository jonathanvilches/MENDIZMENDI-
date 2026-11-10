// Ajustes de accesibilidad: textos grandes y alto contraste. Se guardan aparte del perfil (como el modo sencillo,
// util/sencillo.js), en herrizherri-accesible, y se ponen como clases de <body> al abrir el juego y al cambiarlos en
// Ajustes: textos-grandes (la letra de los partidos de pelota, de la pantalla VS y de las fichas, un 20 % más grande) y
// alto-contraste (marcador, avisos, paneles y botones con fondo negro, letra blanca y bordes blancos; también el anillo y
// los corazones de la aventura, ui/aventuraHud.js). Los estilos de cada cosa van con ella (pelota/hud.js, vs.js, ficha.js).
const K = 'herrizherri-accesible';
const lee = () => { try { return JSON.parse(localStorage.getItem(K) || '{}') || {}; } catch (e) { return {}; } };
/** { grandes, contraste } tal como están guardados. */
export const accesible = () => lee();
/** Pone las clases de <body> según lo guardado (o según o). */
export function aplicaAccesible(o = lee()) {
  if (typeof document === 'undefined' || !document.body) return;
  document.body.classList.toggle('textos-grandes', !!o.grandes); document.body.classList.toggle('alto-contraste', !!o.contraste);
}
/** Cambia un ajuste ('grandes' o 'contraste'), lo guarda y lo aplica. */
export function ponAccesible(k, on) { const o = lee(); o[k] = !!on; try { localStorage.setItem(K, JSON.stringify(o)); } catch (e) { /* sin almacenamiento */ } aplicaAccesible(o); }
if (typeof document !== 'undefined') { if (document.body) aplicaAccesible(); else addEventListener('DOMContentLoaded', () => aplicaAccesible()); }
