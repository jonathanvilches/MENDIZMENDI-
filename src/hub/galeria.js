// La galería de los pueblos (sección Pueblos del menú): todos los pueblos de Navarra en un carrusel 3D que gira en redondo,
// el mismo anillo que el del menú, los campeonatos de pelota y «Elige tu pelotari» (game/carrusel3d.js). El autor, 22 de
// noviembre de 2026: «El bloque de pueblos también tiene que ser un carrusel 3D rotativo 360, igual que el de la pelota y
// todos los demás». La carta de delante, grande y encendida, con su nombre, sus misiones y el botón de jugar; las demás,
// alrededor, cada una más girada y más honda, y la vuelta no se acaba nunca (después del último pueblo viene el primero).
// Comarca tras comarca, sin cortes: al pasar de los pueblos de una a los de la siguiente se enciende arriba su pestaña, y
// las pestañas (o ↑ ↓) giran el anillo hasta el primer pueblo de cada comarca. Se gira arrastrando, con las flechas, la
// rueda del ratón o el teclado (← →); tocar una carta, la de delante o una de los lados, abre su ficha al primer toque, y
// el botón de jugar de la de delante, el pueblo. Antes (hasta el 22 nov) era una fila propia, con una carta a cada lado.
import './galeria.css';
import { carrusel3d, CSS_CARRUSEL3D } from '../game/carrusel3d.js';

const reduce = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// (los estilos del anillo, una vez: los mismos que el menú)
let cssPuesto = false;
const css = () => { if (cssPuesto) return; cssPuesto = true; const st = document.createElement('style'); st.textContent = CSS_CARRUSEL3D; document.head.appendChild(st); };
// (alto / ancho de cada carta: la portada entera, 16:9, y debajo su franja, un 24 % del ancho)
const AR = 0.8;

/**
 * m: el contenedor (la ventana de la sección). o: { comarcas: [{ id, nombre, color }], tarjetas(id) → html de
 * las tarjetas de sus pueblos (bloques .gal-t con data-gt), info(townId, i, n) → html de debajo del de delante (o ''),
 * inicial (id de la comarca), pueblo (id del pueblo de delante al entrar), abre(townId), juega(townId) (el botón
 * [data-play] de la carta de delante), sonido(nombre) }.
 */
export function galeria(m, o) {
  const G = m.querySelector('.gal'); if (!G) return;
  let escena = G.querySelector('.gal-escena');
  const info = G.querySelector('.gal-info'), cms = [...G.querySelectorAll('[data-gc]')];
  css();
  // ---------- todas las comarcas en el mismo anillo, una detrás de otra ----------
  // (las portadas, sin cargar: cada una se pide cuando su carta se acerca a la de delante y se suelta al alejarse mucho; con
  // las cuarenta y tantas a la vez, en el móvil se iba la memoria)
  const anillo0 = escena.querySelector('.gal-anillo');
  anillo0.innerHTML = o.comarcas.map((c, i) => o.tarjetas(c.id).replace(/<img class="gt-img" src=/g, '<img class="gt-img" data-src=').replace(/ class="gal-t"/g, ` class="gal-t" data-ci="${i}" style="--c:${c.color};--ac:${c.color}"`)).join('');
  escena.classList.add('c3-escena'); anillo0.classList.add('c3-anillo'); G.classList.add('gal-c3');
  const R = [], deC = [];
  [...anillo0.children].forEach((t, k) => { const i = +t.dataset.ci; deC[k] = i; if (!R[i]) R[i] = { a: k, n: 0 }; R[i].n++; });
  const N = deC.length; if (!N) return;
  const T = () => [...escena.querySelector('.c3-anillo').children];
  const md = (k) => ((k % N) + N) % N;
  const visible = () => G.isConnected && G.getClientRects().length > 0;
  let ci = -1, frente = -1, car = null;

  // ---------- la comarca de delante: su pestaña y su color ----------
  function enComarca(i) {
    if (i === ci || !o.comarcas[i]) return;
    ci = i; G.style.setProperty('--c', o.comarcas[i].color);
    cms.forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-pressed', String(k === i)); });
    // (la comarca elegida, en medio de su fila; sin scrollIntoView, que también corría de lado la ventana de la sección)
    const fila = cms[i]?.parentElement, b = cms[i];
    if (fila && b) fila.scrollTo({ left: b.offsetLeft - (fila.clientWidth - b.offsetWidth) / 2, behavior: reduce() ? 'auto' : 'smooth' });
  }
  // (las fotos de las cartas cercanas a la de delante; las lejanas, sueltas)
  function fotos(f) {
    T().forEach((t, k) => {
      let d = md(k - f); if (d > N / 2) d = N - d;
      const im = t.querySelector('img.gt-img'); if (!im) return;
      if (d <= 4 && !im.getAttribute('src') && im.dataset.src) im.src = im.dataset.src;
      else if (d > 8 && im.getAttribute('src')) im.removeAttribute('src');
    });
  }
  const alCambiar = (f) => {
    frente = f; enComarca(deC[f]); fotos(f);
    // (el botón de jugar, solo en la de delante y alcanzable con el tabulador)
    T().forEach((t, k) => { const b = t.querySelector('[data-play]'); if (b) b.tabIndex = k === f ? 0 : -1; });
    if (info) { const r = R[ci]; info.innerHTML = o.info(T()[f].dataset.gt, f - r.a, r.n) || ''; }
  };
  // ---------- el anillo: se monta cuando la galería se ve y se suelta cuando se esconde ----------
  // (escondida, con el menú detrás de un pueblo o de un partido, las flechas no son suyas: si el anillo siguiera escuchando,
  // girarían a escondidas y sonarían. Al soltarlo, la escena se cambia por una copia limpia, sin lo que escuchaba el anillo
  // de antes, y al volver a verse se monta otro con la misma carta delante)
  function monta(inicio) {
    if (car) return;
    car = carrusel3d(escena, { banda: true, ar: AR, inicio, alCambiar, sonido: (k) => { if (visible()) o.sonido?.(k); } });
  }
  function suelta() {
    if (!car) return;
    guardada = frente; car.destroy(); car = null;
    const nueva = escena.cloneNode(true); escena.replaceWith(nueva); escena = nueva; escucha();
  }
  let guardada = -1;
  const ro = new ResizeObserver(() => {
    if (!G.isConnected) { ro.disconnect(); car?.destroy(); car = null; return; }
    if (!escena.clientWidth) { if (car) { suelta(); ro.disconnect(); ro.observe(escena); } }
    else if (!car) monta(guardada >= 0 ? guardada : inicio0);
  });

  // ---------- tocar: abrir la ficha o jugar ----------
  // (el anillo ya gira hacia la carta tocada; aquí, la ficha de esa carta, o el pueblo si es el botón de jugar de la de
  // delante. El toque no sigue hacia arriba: el menú también escucha [data-play] y jugaría dos veces, o una carta de los
  // lados jugaría sin estar delante)
  function escucha() {
    escena.addEventListener('click', (e) => {
      const t = e.target.closest('.gal-t'); if (!t) return; e.stopPropagation();
      const delante = car && t === car.actual(), jg = e.target.closest('[data-play]');
      if (jg && delante && o.juega) { o.sonido?.('open'); o.juega(jg.dataset.play); return; }
      o.abre(t.dataset.gt);
    });
  }
  escucha();
  G.addEventListener('click', (e) => {
    const b = e.target.closest('[data-gal], [data-gc]'); if (!b || !car) return;
    if (b.dataset.gal) car.paso(+b.dataset.gal);
    else { const i = cms.indexOf(b); if (R[i]) car.ir(R[i].a); }
  });
  // (↑ ↓: a la comarca de antes o de después; ← → e Intro ya los lleva el anillo)
  const tecla = (e) => {
    if (!G.isConnected) { removeEventListener('keydown', tecla, true); return; }
    if (!car || !visible() || document.querySelector('.sheet') || e.target.closest?.('input, textarea, select')) return;
    const v = { ArrowUp: -1, ArrowDown: 1 }[e.key]; if (!v) return;
    const i = Math.max(0, Math.min(o.comarcas.length - 1, ci + v)); if (R[i]) car.ir(R[i].a);
    e.preventDefault(); e.stopImmediatePropagation();
  };
  addEventListener('keydown', tecla, true);

  // ---------- al entrar: el pueblo pedido, o el primero de la comarca pedida, ya delante ----------
  const i0 = Math.max(0, o.comarcas.findIndex(c => c.id === o.inicial)), j = o.pueblo ? T().findIndex(t => t.dataset.gt === o.pueblo) : -1;
  const inicio0 = j >= 0 ? j : R[i0]?.a || 0;
  fotos(inicio0);
  if (escena.clientWidth) monta(inicio0);
  ro.observe(escena);
  // (la pastilla de la comarca elegida se mide por el botón: cuando llegan las letras o cambia el ancho de la fila, se mide
  // otra vez; si no, se quedaba corrida unas comarcas más allá)
  const remide = () => { const b = cms[ci]; if (!b || !G.isConnected) return; b.classList.remove('on'); b.classList.add('on'); };
  document.fonts?.ready.then(remide);
  if (cms[0]) new ResizeObserver(() => { if (!G.isConnected) return; remide(); }).observe(cms[0].parentElement);
}
