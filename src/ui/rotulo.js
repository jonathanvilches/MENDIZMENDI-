// El rótulo de televisión para los momentos con nombre (ui/rotulo.css; noviembre de 2026, fase 2 del rediseño de la
// animación): llegar a un pueblo, una comarca nueva, una cima con su altura, una misión nueva o llegar al destino.
// rotulo({ antetitulo, titulo, datos, icono, color, ms }): datos es una lista de { n, unidad } (una cifra que cuenta hasta su
// valor: «1.352 m»), { txt } (un texto) o { nivel, de, txt } (la dificultad, con sus puntos). Solo hay uno a la vez: el
// nuevo quita al anterior. No tapa nada que se toque (no recoge toques) y se anuncia a los lectores de pantalla.
import './rotulo.css';
import { cuenta } from './motion.js';
import { cinetica } from './cinetica.js';
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
  // (el antetítulo se junta y el título sube letra a letra, detrás del barrido de color; ui/cinetica.js)
  cinetica(r.querySelector('.rt-k > span'), { estilo: 'junta', retardo: 110 }); cinetica(r.querySelector('.rt-t > span'), { estilo: 'sube', retardo: 420 });
  coloca(r);
  // (las cifras cuentan hasta su valor cuando su píldora aparece)
  r.querySelectorAll('[data-n]').forEach((b, i) => { const n = +b.dataset.n, u = b.dataset.u; setTimeout(() => cuenta(b, n, { dur: 900, fmt: (v) => Math.round(v).toLocaleString('es-ES') + (u ? ' ' + u : '') }), 380 + i * 70); });
  tFuera = setTimeout(() => { r.classList.add('fuera'); tQuita = setTimeout(() => { r.remove(); if (actual === r) actual = null; }, 300); }, ms);
  return r;
}
// Dónde va: centrado y tan ancho como pida su texto (hasta 560 px), nunca menos que su min-width del CSS, que es pequeño. Si a su altura le queda al lado algo de arriba (la
// barra de misiones, el minimapa), se estrecha lo justo para no llegar a ello, pero solo si así le cabe el
// texto entero; si no, baja hasta debajo de eso y usa todo el ancho. Antes tenía un ancho fijo pensado para lo peor
// (en el móvil tumbado, la pantalla menos 380 px): en un iPhone pequeño se quedaba en 287 px, la comarca se cortaba con
// puntos suspensivos y, con la barra de misiones en dos filas, la pisaba; de pie pisaba el minimapa
function coloca(r) {
  const W = innerWidth, borde = 16, hud = document.getElementById('hud');
  const obst = hud && getComputedStyle(hud).display !== 'none'
    ? ['#tl', '#mini', '#topright .rbtns'].map((q) => hud.querySelector(q)?.getBoundingClientRect()).filter((q) => q && q.width > 0 && q.height > 0) : [];
  r.style.maxWidth = Math.min(560, W - 2 * borde) + 'px';
  // (lo que pide el texto, sin el ancho mínimo: si al lado de algo cabe el texto pero no el ancho mínimo, se estrecha el
  // mínimo en vez de bajar el rótulo)
  const minimo = parseFloat(getComputedStyle(r).minWidth) || 0;
  r.style.minWidth = '0px'; const quiere = r.offsetWidth, alto = r.offsetHeight; r.style.minWidth = '';
  let top = parseFloat(getComputedStyle(r).top) || 0;
  for (let i = 0; i < 4; i++) {
    const encima = obst.filter((o) => o.bottom + 8 > top && o.top < top + alto + 8);
    let mitad = Math.min(560, W - 2 * borde) / 2, centro = false;
    for (const o of encima) {
      if (o.right + 8 <= W / 2) mitad = Math.min(mitad, W / 2 - o.right - 8);
      else if (o.left - 8 >= W / 2) mitad = Math.min(mitad, o.left - 8 - W / 2);
      else centro = true;
    }
    if (!encima.length || (!centro && 2 * mitad >= quiere)) {
      r.style.top = Math.round(top) + 'px';
      if (encima.length) { const m = Math.floor(2 * mitad); r.style.maxWidth = m + 'px'; if (minimo > m) r.style.minWidth = m + 'px'; }
      return;
    }
    top = Math.max(...encima.map((o) => o.bottom)) + 10;
  }
  r.style.top = Math.round(top) + 'px';
}
/** Quita el rótulo que haya (al salir del pueblo o al abrir algo encima) */
export function quitaRotulo() { clearTimeout(tFuera); clearTimeout(tQuita); actual?.remove(); actual = null; }
