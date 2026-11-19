// ¿Cómo quieres jugar? La primera pantalla de quien empieza (tras elegir idioma, antes del nombre) y siempre a mano con
// «Cómo jugar», arriba del menú, en «Más» y en Ajustes. Las tres formas de jugar, cada una con sus pasos y su botón:
//  · en el ordenador (o en la tele, con el ordenador conectado): aquí mismo, con teclado y ratón o un mando de consola;
//    y, si se quiere, instalar el juego como app
//  · con el móvil de mando: el juego en el ordenador y el móvil como mando, por la wifi; y la app «Mando» en el móvil,
//    que la próxima vez se conecta sola
//  · en el móvil o la tableta: con los botones de la pantalla; instalar el juego en el móvil
// Se adapta a donde se abre: en el ordenador, un QR lleva el juego al móvil; en el móvil, los botones instalan aquí
// mismo. En el archivo único y en el artefacto de claude.ai, que no se pueden instalar, se manda a la web.
// Desde el 19 de noviembre de 2026, con el diseño de las pantallas de juego (src/ui/pantalla.js; el autor, con una captura
// del móvil donde los pasos quedaban tapados por «Cerrar» y cortados abajo: «cambiar el diseño de estas páginas para
// ajustarlas al nuevo diseño e identidad»): arriba, volver, el antetítulo y el título; en medio, las tres formas a la
// izquierda, como pestañas, y los pasos de la elegida a la derecha, enteros; abajo, una línea de ayuda y el botón.
import { esc, el } from '../util/html.js';
import { TACTIL } from '../util/tactil.js';
import { offer, openInstall, instalada } from '../web/install.js';
import { appNativa } from '../web/app.js';
import { profile, saveProfile } from '../game/profile.js';
import { ATRAS_SVG } from '../ui/pantalla.js';

const WEB = 'https://jonathanvilches.github.io/MENDIZMENDI-/';
const AF = typeof __AF__ !== 'undefined' && __AF__;
const UA = navigator.userAgent;
const IOS = /iP(hone|ad|od)/.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1);
// (la dirección del juego: la de esta misma web si se juega en ella, también desde el archivo de descargas/; si no, la web publicada)
const juego = () => (/^https?:$/.test(location.protocol) && !/claude|usercontent/.test(location.hostname) ? new URL(/\/descargas\/[^/]*$/.test(location.pathname) ? '../' : './', location.href).href : WEB);
const mandoApp = () => juego() + 'mando/';
const corta = (u) => u.replace(/^https?:\/\//, '').replace(/\/$/, '');

// los dibujos de cada forma, de trazo como los pasos de instalar: el ordenador, el móvil tumbado como mando y el móvil
const G = {
  pc: '<rect x="5" y="7" width="38" height="25" rx="3"/><path d="M24 32v8M15 41h18"/>',
  mando: '<rect x="3" y="14" width="42" height="22" rx="6"/><path d="M12 21v8M8 25h8"/><circle cx="32" cy="22.5" r="2.2"/><circle cx="37.5" cy="27.5" r="2.2"/><path d="M17 8.5a10 10 0 0 1 14 0M20.5 11.5a5 5 0 0 1 7 0"/>',
  movil: '<rect x="14" y="3" width="20" height="42" rx="4"/><path d="M21 39h6"/>',
  inst: '<path d="M24 6v24M15 21l9 9 9-9M8 34v6h32v-6"/>',
  play: '<path d="M16 9l24 15-24 15z"/>',
  ok: '<path d="M10 25l9 9 19-20"/>',
  share: '<path d="M24 6v24M15 15l9-9 9 9"/><path d="M14 22h-4v20h28V22h-4"/>',
  web: '<circle cx="24" cy="24" r="18"/><path d="M6 24h36M24 6c-6 6-6 30 0 36M24 6c6 6 6 30 0 36"/>',
};
const ico = (k) => `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${G[k]}</svg>`;
const paso = ([b, t], i) => `<li><span class="cj-n">${i + 1}</span><div><b>${b}</b><small>${t}</small></div></li>`;
const btn = (k, txt, attrs, cls = '') => `<button type="button" class="btn ${cls}" ${attrs}>${ico(k)}<span>${txt}</span></button>`;
const enlace = (k, txt, href, cls = '') => `<a class="btn ${cls}" href="${esc(href)}" target="_blank" rel="noopener">${ico(k)}<span>${txt}</span></a>`;
// (instalar el juego aquí: el botón del navegador; ya instalado, dicho; en el archivo o el artefacto, desde la web)
const instalar = (donde) => offer() ? btn('inst', `Instalar en ${donde}`, 'data-cj="instalar"')
  : instalada() ? `<span class="cj-hecho">${ico('ok')}<span>Ya lo tienes instalado</span></span>`
    : enlace('web', 'Instalarlo desde la web', WEB);

/** ¿Ya ha visto quien juega cómo se puede jugar? */
export const vistoComoJugar = () => !!profile().seen?.comoJugar;

/** Abre la pantalla. primera: la de quien empieza («Empezar» sigue con el nombre y el personaje); al cerrarla, despues. */
export function comoJugar(root, { primera = false, despues } = {}) {
  root.querySelector('.cj')?.remove();
  const aquiPc = !TACTIL, conMando = !AF;
  const cards = [
    { k: 'pc', aqui: aquiPc, t: 'En el ordenador', c: 'Teclado y ratón o mando', s: 'Con el teclado y el ratón o con un mando de consola. También en la tele, con el ordenador conectado.',
      pasos: aquiPc ? [['Juega aquí mismo', 'En este navegador, sin instalar nada'], ['Instálalo si quieres', 'Se abre en su propia ventana, a pantalla completa y también sin conexión'], ['Las teclas', 'WASD o flechas para andar, E para hablar, espacio para saltar y Mayús para correr']]
        : [['Abre el juego en el ordenador', `En el navegador, en ${corta(WEB)}`], ['Instálalo allí si quieres', 'Con el botón «Instalar en el ordenador» de esta misma pantalla']],
      btns: aquiPc ? instalar('el ordenador') : btn('share', 'Enviar al ordenador', 'data-cj="compartir"') },
    { k: 'mando', t: 'Con el móvil de mando', c: 'El móvil, de mando por la wifi', s: 'El juego en el ordenador o en la tele y tu móvil como mando, por la wifi de casa.',
      pasos: [[aquiPc ? 'Pulsa «Conectar el móvil»' : 'En el ordenador, pulsa «Mando del móvil»', 'En la pantalla sale un código QR'], ['Escanéalo con la cámara del móvil', 'Se abre el mando, sin instalar nada'], ['Instala la app Mando', 'El móvil te la ofrece: la próxima vez se conecta sola y ocupa toda la pantalla']],
      btns: !conMando ? enlace('web', 'Abrir la web del juego', WEB) : aquiPc ? btn('mando', 'Conectar el móvil', 'data-cj="mando"', 'primary') : enlace('mando', 'Descargar app Mando', mandoApp(), 'primary') },
    { k: 'movil', aqui: TACTIL, t: 'En el móvil o la tableta', c: 'Con los botones de la pantalla', s: 'Con los botones de la pantalla. Se juega mejor con el móvil en horizontal.',
      pasos: TACTIL ? [['Instálalo en este móvil', IOS ? 'En Safari, toca Compartir y luego «Añadir a pantalla de inicio»' : 'Con el botón de abajo: se queda junto a tus apps'], ['Ábrelo desde su icono', 'A pantalla completa, sin las barras del navegador'], ['Gira el móvil', 'A la izquierda, andar; a la derecha, los botones']]
        : [['Ábrelo en el móvil', 'Escanea este código con la cámara'], ['Instálalo', 'Android: menú ⋮ e «Instalar app». iPhone: Compartir y «Añadir a pantalla de inicio»'], ['Juega desde su icono', 'A pantalla completa y en horizontal']],
      qr: !TACTIL, btns: TACTIL ? instalar('este móvil') : '' },
  ];
  // (en el móvil, al revés: primero jugar en él, luego usarlo de mando y por último el ordenador)
  if (TACTIL) cards.reverse();
  // (dentro de la app de la tienda, solo cómo se juega aquí: sin instalar desde el navegador, sin la web ni otras
  // plataformas; src/web/app.js)
  if (appNativa()) cards.splice(0, cards.length, { k: 'movil', aqui: true, t: TACTIL ? 'En el móvil o la tableta' : 'En este dispositivo', c: 'Con los botones de la pantalla', s: 'Con los botones de la pantalla. Se juega mejor con el móvil en horizontal.',
    pasos: [['Gira el móvil', 'En horizontal se ve más y se juega mejor'], ['A la izquierda, andar', 'Arrastra el dedo hacia donde quieras ir'], ['A la derecha, los botones', 'El amarillo, para hablar y usar; los demás, para correr y saltar']] });
  const ini = Math.max(0, cards.findIndex(c => c.aqui));
  const o = el(`<div class="onb cj${cards.length < 2 ? ' una' : ''}" role="dialog" aria-modal="true" aria-labelledby="cjT" tabindex="-1"><div class="cj-in">
    <header class="cj-top">${primera ? '' : `<button type="button" class="cj-atras" data-cj="seguir" aria-label="Cerrar" title="Cerrar (Esc)">${ATRAS_SVG}</button>`}
      <div class="cj-tit"><small>${primera ? 'Antes de empezar' : 'Cómo jugar'}</small><h2 id="cjT">¿Cómo quieres jugar?</h2></div></header>
    <div class="cj-medio">
      <div class="cj-formas" role="tablist" aria-label="Las formas de jugar">${cards.map((c, i) => `<button type="button" role="tab" class="cj-forma${i === ini ? ' on' : ''}" data-f="${i}" aria-selected="${i === ini}" aria-controls="cjP${i}" id="cjF${i}">
        <span class="cj-ico">${ico(c.k)}</span><span class="cj-ft"><b>${c.t}</b><small>${c.c}</small></span>${c.aqui ? `<i class="cj-aqui">${TACTIL ? 'Estás en el móvil' : 'Estás aquí'}</i>` : ''}</button>`).join('')}</div>
      <div class="cj-dets">${cards.map((c, i) => `<section class="cj-card" data-forma="${c.k}" role="tabpanel" id="cjP${i}" aria-labelledby="cjF${i}"${i === ini ? '' : ' hidden'}>
        <p class="cj-txt">${c.s}</p>
        <ol class="cj-pasos">${c.pasos.map(paso).join('')}</ol>
        ${c.qr || c.btns ? `<div class="cj-pie">${c.qr ? `<div class="cj-qr"><div class="cj-qrimg" aria-label="Código QR para abrir el juego en el móvil"></div><small>${esc(corta(juego()))}</small></div>` : ''}${c.btns ? `<div class="cj-btns">${c.btns}</div>` : ''}</div>` : ''}</section>`).join('')}</div>
    </div>
    <footer class="cj-foot"><p class="cj-ayuda"><b>${cards.length > 1 ? 'Elige una de las tres formas' : 'Así se juega'}</b><span>Puedes volver aquí cuando quieras con «Cómo jugar», en el menú.</span></p>
      ${btn(primera ? 'play' : 'ok', primera ? 'Empezar' : 'Cerrar', 'data-cj="seguir"', 'primary big cj-go')}</footer>
  </div></div>`);
  root.appendChild(o);
  // (el QR del juego, para abrirlo en el móvil; su código se carga solo aquí)
  const q = o.querySelector('.cj-qrimg');
  if (q) import('qrcode-generator').then(({ default: qrcode }) => { const c = qrcode(0, 'M'); c.addData(juego()); c.make(); q.innerHTML = c.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); }).catch(() => q.remove());
  const cierra = () => {
    o.remove(); document.removeEventListener('keydown', tecla, true);
    const p = profile(); p.seen = { ...p.seen, comoJugar: true }; saveProfile();
    despues?.();
  };
  const tecla = (e) => { if (e.key === 'Escape' && !primera) { e.stopPropagation(); cierra(); } };
  document.addEventListener('keydown', tecla, true);
  const elige = (i) => {
    const F = [...o.querySelectorAll('.cj-forma')], P = [...o.querySelectorAll('.cj-card')]; i = (i + F.length) % F.length;
    F.forEach((f, k) => { f.classList.toggle('on', k === i); f.setAttribute('aria-selected', k === i); });
    P.forEach((p, k) => { p.hidden = k !== i; });
    return F[i];
  };
  o.querySelector('.cj-formas').addEventListener('keydown', (e) => {
    const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]; if (!k) return;
    e.preventDefault(); const F = [...o.querySelectorAll('.cj-forma')]; elige(F.findIndex(f => f.classList.contains('on')) + k)?.focus();
  });
  o.addEventListener('click', async (e) => {
    const f = e.target.closest('.cj-forma'); if (f) { elige(+f.dataset.f); return; }
    const b = e.target.closest('[data-cj]'); if (!b) return;
    const a = b.dataset.cj;
    if (a === 'seguir') cierra();
    else if (a === 'instalar') openInstall(root);
    else if (a === 'mando') { cierra(); import('../mando/mando.js').then(m => m.abrirMando()); }
    else if (a === 'compartir') {
      const s = b.querySelector('span');
      try { if (navigator.share) { await navigator.share({ title: 'HERRIZHERRI', text: 'Ábrelo en el ordenador', url: juego() }); return; } } catch (err) { if (err?.name === 'AbortError') return; }
      try { await navigator.clipboard.writeText(juego()); s.textContent = 'Enlace copiado'; } catch (err) { s.textContent = corta(juego()); }
    }
  });
  o.focus({ preventScroll: true });   // (el foco, en la pantalla: antes iba a «Cerrar» y le dejaba un anillo blanco, también en el iPhone)
  return o;
}
