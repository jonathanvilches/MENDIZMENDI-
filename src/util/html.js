// Ayudantes del HTML que monta la interfaz: escapar un texto antes de meterlo en el marcado y crear un elemento a partir
// de su marcado.
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
/** El texto listo para ir dentro del HTML (null y undefined quedan vacíos). */
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ESC[c]);
/** El primer elemento del marcado. */
export const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
