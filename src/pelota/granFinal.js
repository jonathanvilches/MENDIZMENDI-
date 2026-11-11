// La entrada de la final de un campeonato, como la cabecera de una retransmisión: sobre el frontón oscurecido (con el
// público en pie detrás), entran de los lados «GRAN» y «FINAL», cae la txapela que se juegan con su brillo, llegan las
// cartas de los dos finalistas (las mismas del cuadro del torneo, ui/sportCard.js), el azul por la izquierda y el
// colorado por la derecha, salta el «VS» y cae el confeti. Se va sola a los 6,4 s o al tocar (o con una tecla) y de ahí
// al sorteo del saque. Todo en la página, sin nada nuevo en la escena 3D: en el iPhone no cuesta nada a la imagen.
// Sustituye al vuelo de cámara de la llegada y a los focos que buscaban a los pelotaris a oscuras (noviembre de 2026).
import './granFinal.css';
import { pelotariCard } from '../ui/sportCard.js';
import { iconSVG } from '../ui/icons.js';
import { esc } from '../util/html.js';

const DUR = 6.4, SALE = 0.45;
// (el confeti: cada trozo con su sitio, su color, su giro y su tiempo; siempre el mismo reparto)
const COLORES = ['#ffd166', '#ff7ac8', '#b79cff', '#ffffff', '#ff2bd6', '#ffe39a'];
const confeti = (n) => Array.from({ length: n }, (_, i) => {
  const r = (k) => ((Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
  return `<i style="--x:${(r(1) * 100).toFixed(1)}%;--c:${COLORES[i % COLORES.length]};--d:${(2.6 + r(2) * 2.4).toFixed(2)}s;--t:${(2.1 + r(3) * 1.6).toFixed(2)}s;--g:${Math.round(180 + r(4) * 540)}deg;--w:${(5 + r(5) * 5).toFixed(1)}px;--o:${(r(6) * 60 - 30).toFixed(0)}px"></i>`;
}).join('');

/** La entrada de la final, en root (el marcador del partido). o = { kicker, venue, titulo: [dos palabras], toca,
 *  azul, rojo (las cartas: lo que pide pelotariCard, sin w), lang, onFase(k) ('txapela', 'cartas', 'fin') }.
 *  Devuelve { done (una promesa que se cumple al irse), close () (la quita ya) } */
export function granFinal(root, o) {
  // (las cartas, del tamaño que deja la pantalla. Tumbada o ancha: en fila con la txapela en medio, y de alto lo que queda
  // bajo el título. De pie: la txapela sube encima y las cartas se quedan con el ancho, solo con el «VS» entre ellas)
  const W = innerWidth, H = innerHeight, tumbado = W > H;
  const w = Math.round(Math.max(88, Math.min(220, tumbado ? Math.min((H * 0.6) / 1.48, (W - 32 - 120) / 2.4) : Math.min((W - 96) / 2, (H - 330) / 1.48))));
  const carta = (c, col, d) => pelotariCard({ ...c, side: col, w, lang: o.lang, d });
  const el = document.createElement('div'); el.className = 'gf' + (tumbado ? '' : ' de-pie'); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', (o.titulo || []).join(' '));
  el.style.setProperty('--cw', w + 'px');
  el.innerHTML = `<div class="gf-luz" aria-hidden="true"></div>
    <div class="gf-cab"><small class="gf-k">${esc(o.kicker || '')}</small><h2 class="gf-t"><span class="a">${esc(o.titulo?.[0] || '')}</span> <span class="b">${esc(o.titulo?.[1] || '')}</span></h2><small class="gf-s">${esc(o.venue || '')}</small></div>
    <div class="gf-esc"><div class="gf-c azul">${carta(o.azul, 'azul', 0)}</div><div class="gf-mid"><span class="gf-tx">${iconSVG('txapela', 160)}</span><b class="gf-vs">VS</b></div><div class="gf-c rojo">${carta(o.rojo, 'rojo', 0)}</div></div>
    <div class="gf-confeti" aria-hidden="true">${confeti(54)}</div>
    <small class="gf-toca">${esc(o.toca || '')}</small>`;
  root.appendChild(el); root.classList.add('en-final');
  let fuera = false, fin;
  const done = new Promise(res => { fin = res; });
  const timers = [setTimeout(() => o.onFase?.('txapela'), 1000), setTimeout(() => o.onFase?.('cartas'), 1600), setTimeout(() => cierra(), DUR * 1000)];
  const t0 = performance.now(), salta = (e) => { if (performance.now() - t0 < 600) return; e?.stopPropagation?.(); cierra(); };
  // (tocar en cualquier sitio o una tecla la salta; no antes de 0,6 s, que el toque que abrió la final no la cierre)
  el.addEventListener('pointerdown', salta); addEventListener('keydown', salta, true);
  function cierra() {
    if (fuera) return; fuera = true; timers.forEach(clearTimeout); removeEventListener('keydown', salta, true);
    o.onFase?.('fin'); el.classList.add('sale');
    setTimeout(() => { el.remove(); root.classList.remove('en-final'); fin(); }, SALE * 1000);
  }
  return { done, close: () => { if (fuera) return; fuera = true; timers.forEach(clearTimeout); removeEventListener('keydown', salta, true); el.remove(); root.classList.remove('en-final'); fin(); } };
}
