// El rótulo de televisión para los momentos con nombre (ui/rotulo.css; noviembre de 2026, fase 2 del rediseño de la
// animación): llegar a un pueblo, una comarca nueva, una cima con su altura, una misión nueva o llegar al destino.
// rotulo({ antetitulo, titulo, datos, icono, color, ms }): datos es una lista de { n, unidad } (una cifra que cuenta hasta su
// valor: «1.352 m»), { txt } (un texto) o { nivel, de, txt } (la dificultad, con sus puntos). Solo hay uno a la vez: el
// nuevo quita al anterior. No tapa nada que se toque (no recoge toques) y se anuncia a los lectores de pantalla.
import './rotulo.css';
import { cuenta } from './motion.js';
import { esc } from '../util/html.js';

let actual = null, tFuera = 0, tQuita = 0;
export function rotulo({ antetitulo = '', titulo = '', datos = [], icono = '', color = '', ms = 3600 } = {}) {
  if (!titulo || typeof document === 'undefined') return null;
  clearTimeout(tFuera); clearTimeout(tQuita); actual?.remove();
  const r = document.createElement('div'); r.className = 'rotulo'; r.setAttribute('role', 'status'); r.setAttribute('aria-live', 'polite');
  if (color) r.style.setProperty('--rt-c', color);
  const dato = (d, i) => d.n != null ? `<b style="--i:${i}" data-n="${+d.n}" data-u="${esc(d.unidad || '')}">${esc((d.antes || '') + '0' + (d.unidad ? ' ' + d.unidad : ''))}</b>`
    : d.nivel != null ? `<b style="--i:${i}">${d.txt ? esc(d.txt) + ' ' : ''}<span class="rt-pt" aria-label="${d.nivel} de ${d.de || 3}">${Array.from({ length: d.de || 3 }, (_, k) => `<i class="${k < d.nivel ? 'on' : ''}"></i>`).join('')}</span></b>`
    : `<b style="--i:${i}">${esc(d.txt || '')}</b>`;
  r.innerHTML = `<i class="rt-barra"></i>${icono ? `<span class="rt-ic">${icono}</span>` : ''}<div class="rt-tx">${antetitulo ? `<span class="rt-k"><span>${esc(antetitulo)}</span></span>` : ''}`
    + `<span class="rt-t"><span>${esc(titulo)}</span></span>${datos.length ? `<span class="rt-d">${datos.map(dato).join('')}</span>` : ''}</div>`;
  document.body.appendChild(r); actual = r;
  // (las cifras cuentan hasta su valor cuando su píldora aparece)
  r.querySelectorAll('[data-n]').forEach((b, i) => { const n = +b.dataset.n, u = b.dataset.u; setTimeout(() => cuenta(b, n, { dur: 900, fmt: (v) => Math.round(v).toLocaleString('es-ES') + (u ? ' ' + u : '') }), 380 + i * 70); });
  tFuera = setTimeout(() => { r.classList.add('fuera'); tQuita = setTimeout(() => { r.remove(); if (actual === r) actual = null; }, 300); }, ms);
  return r;
}
/** Quita el rótulo que haya (al salir del pueblo o al abrir algo encima) */
export function quitaRotulo() { clearTimeout(tFuera); clearTimeout(tQuita); actual?.remove(); actual = null; }
