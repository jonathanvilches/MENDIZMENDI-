// Tipografía cinética (noviembre de 2026, lo pidió el autor con el encargo de motion graphics: «títulos que entran
// mediante desplazamientos y máscaras, antetítulos con pequeñas animaciones», en todo el juego). Los títulos entran letra
// a letra, como los rótulos de una retransmisión: cada letra sube desde abajo con un pequeño giro y se asienta con un
// rebote corto; los antetítulos se juntan desde separados, como cuando se cierra el espaciado; los nombres grandes de la
// pantalla de carga caen desde arriba. Solo transform y opacity (ui/cinetica.css). El texto se lee igual: el elemento
// guarda su texto en aria-label y las letras van ocultas a los lectores de pantalla. Cada palabra va en su caja, para
// que las líneas se partan por las palabras y nunca por la mitad. Con «reducir movimiento», nada.
import './cinetica.css';
import { reducido } from './motion.js';

/** Pone en marcha la entrada letra a letra de un elemento que solo tiene texto. estilo: 'sube' (títulos), 'junta'
 *  (antetítulos) o 'cae' (nombres grandes); retardo en ms antes de la primera letra; paso, ms entre letra y letra.
 *  Si ya se hizo con ese mismo texto, la repite. Devuelve el elemento o null si no se puede (tiene más elementos dentro). */
export function cinetica(el, { estilo = 'sube', retardo = 0, paso } = {}) {
  if (!el || typeof document === 'undefined') return null;
  if (el.children.length && !el.classList.contains('cin')) return null;
  const txt = el.dataset.cinTxt ?? el.textContent;
  if (!txt.trim()) return null;
  if (reducido()) return el;
  // (lo largo, más deprisa: el título entero tarda como mucho medio segundo en estar)
  const letras = txt.replace(/\s+/g, '').length, p = paso ?? Math.max(10, Math.min(estilo === 'junta' ? 16 : 26, 480 / Math.max(1, letras)));
  el.dataset.cinTxt = txt; el.setAttribute('aria-label', txt.trim());
  el.classList.remove('cin', 'sube', 'junta', 'cae'); void el.offsetWidth;
  let k = 0; const n = letras, html = [];
  for (const parte of txt.split(/(\s+)/)) {
    if (!parte) continue;
    if (/^\s+$/.test(parte)) { html.push(' '); continue; }
    html.push(`<span class="cw" aria-hidden="true">${[...parte].map(ch => `<span class="cl" style="--k:${k};--o:${(k++ - (n - 1) / 2).toFixed(1)}">${ch.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}</span>`).join('')}</span>`);
  }
  el.innerHTML = html.join('');
  el.style.setProperty('--cin-d', retardo + 'ms'); el.style.setProperty('--cin-p', p.toFixed(1) + 'ms');
  el.classList.add('cin', estilo);
  return el;
}

// (dónde va: los títulos y antetítulos de las secciones del menú, de las fichas de comarca y pueblo, la cabecera de la
// ventana del juego y la pantalla de carga. En el partido de pelota no: allí el autor quiere los rótulos sobrios)
const TITULOS = ['.hub-main > .title', '.hub-main :is(.ar-head, .sb-head, .frs-head) > :is(h1, h2)', '.ch-nom h1 > span', '.cm-uno h3 > span'];
const ANTES = ['.hub-main > .kicker', '.hub-main :is(.ar-head, .sb-head, .frs-head) > :is(.kicker, small)', '.ch-nom .kicker', '.cm-uno > .kicker'];
/** Los títulos de una sección recién pintada, letra a letra; el antetítulo primero y el título detrás */
export function titulosCineticos(raiz) {
  if (!raiz?.querySelectorAll) return;
  for (const el of raiz.querySelectorAll(ANTES.join(','))) cinetica(el, { estilo: 'junta', retardo: 40 });
  for (const el of raiz.querySelectorAll(TITULOS.join(','))) cinetica(el, { estilo: 'sube', retardo: 140 });
}
