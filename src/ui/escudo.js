// Ficha informativa de un escudo (sin preguntas): el escudo grande a un lado, en color o tallado en piedra (como se ve
// en la fachada), y al otro su blasón y cómo se lee: la partición, las figuras y lo que significan, los esmaltes y,
// en los escudos de las casas, qué dice el nombre de la casa. Sirve para los escudos de las casas y para el escudo
// oficial del pueblo o del valle.
import { iconSVG } from './icons.js';
import { drawArms } from '../world/heraldry.js';
import { ESMALTES, PARTICIONES, FIGURAS, TIMBRE, REGLAS, CASAS, blazon } from '../data/blasones.js';
import { FIG } from '../data/armas-navarra.js';
import { drawOfficial, officialHeight } from '../world/armas.js';

const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function paint(canvas, A, stone) {
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  g.clearRect(0, 0, W, H);
  const w = Math.min(W * 0.72, H / 1.62);
  drawArms(g, W / 2, H * 0.04, w, A, { stone });
}

// la ficha: { kicker, title, sub, canvas: { w, h, draw(cv, stone) }, stone (si se puede ver en piedra), secs: [[título, html]], badge }
// (cómo se lee, en pestañas: una sección cada vez y entera, sin desplazar ni «Ver más»; antes iban las cuatro en rejilla,
// plegadas, y en el móvil tumbado no cabían)
function armsCard(ui, { kicker, title, sub, canvas, stone = false, secs, more = [], badge = '', note = '' }) {
  const all = [...secs, ...more].filter(x => x && x[1]);
  return new Promise(res => {
    ui.closeModal?.(); ui.sound?.ui?.('card');
    const o = el(`<div class="mg-overlay escudo"><div class="mg-card">
      <div class="es-pic"><div class="es-frame"><canvas width="${canvas.w}" height="${canvas.h}" aria-label="${esc(title)}"></canvas></div>
        ${stone ? '<div class="es-toggle" role="group"><button class="on" data-s="0">En color</button><button data-s="1">En piedra</button></div>' : ''}
        ${badge ? `<span class="badge">${iconSVG('book', 16)} ${esc(badge)}</span>` : ''}</div>
      <div class="es-txt"><small class="kicker">${iconSVG('shield', 18)} ${esc(kicker)}</small><h2>${esc(title)}</h2>
        ${sub ? `<p class="es-blazon">${esc(sub)}</p>` : ''}
        <div class="es-tabs" role="tablist">${all.map(([t], i) => `<button role="tab" data-t="${i}" aria-selected="${i === 0}">${esc(t)}</button>`).join('')}</div>
        <div class="es-scroll es-pane" role="tabpanel" data-vm="no">${all[0]?.[1] || ''}</div>
        <div class="es-more" hidden>Desliza para leer más</div>
        ${note ? `<p class="es-note">${esc(note)}</p>` : ''}
        <button class="btn primary next">Seguir explorando</button></div></div></div>`);
    document.body.appendChild(o); ui.modal = o;
    const cv = o.querySelector('canvas'); canvas.draw(cv, false);
    o.querySelectorAll('.es-toggle button').forEach(b => b.onclick = () => { o.querySelectorAll('.es-toggle button').forEach(x => x.classList.toggle('on', x === b)); canvas.draw(cv, b.dataset.s === '1'); ui.sound?.ui?.('click'); });
    const pane = o.querySelector('.es-pane');
    // (las pestañas van en una fila; solo si no caben, la fila se desliza y el borde se difumina para que se vea)
    requestAnimationFrame(() => { const t = o.querySelector('.es-tabs'); t?.classList.toggle('over', t.scrollWidth > t.clientWidth + 1); });
    o.querySelectorAll('.es-tabs button').forEach(b => b.onclick = () => { o.querySelectorAll('.es-tabs button').forEach(x => x.setAttribute('aria-selected', x === b)); pane.innerHTML = all[+b.dataset.t][1]; pane.scrollTop = 0; upd(); b.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); ui.sound?.ui?.('click'); });
    const next = o.querySelector('.next'); setTimeout(() => next.focus({ preventScroll: true }), 60);
    // si el texto no cabe, un aviso al pie de la columna (se va al llegar al final)
    const sc = o.querySelector('.es-scroll'), mo = o.querySelector('.es-more');
    const upd = () => { mo.hidden = !(sc.scrollHeight > sc.clientHeight + 4 && sc.scrollTop + sc.clientHeight < sc.scrollHeight - 8); };
    sc.addEventListener('scroll', upd, { passive: true }); setTimeout(upd, 80);
    const close = () => { removeEventListener('keydown', k, true); o.classList.add('out'); setTimeout(() => o.remove(), 250); if (ui.modal === o) ui.modal = null; ui.sound?.ui?.('click'); res({ errors: 0 }); };
    const k = (e) => { e.stopImmediatePropagation(); if (['enter', ' ', 'e', 'escape'].includes(e.key.toLowerCase())) { e.preventDefault(); close(); } };
    setTimeout(() => addEventListener('keydown', k, true), 300);
    next.onclick = close; o.onclick = (e) => { if (e.target === o) close(); };
  });
}

/** Ficha del escudo de una casa A (de houseArms). opts: { town, isNew, regla } → Promise<{ errors: 0 }> */
export function readArms(ui, A, { town = '', isNew = false, regla = 0 } = {}) {
  if (window.__autoWin) return Promise.resolve({ errors: 0 });
  const house = A.house.startsWith('Casa') ? A.house : `Casa ${A.house}`;
  const figs = [...new Set(A.q.map(x => x.c))].filter(k => FIGURAS[k]);
  const tints = [...new Set(A.q.map(x => x.f))].filter(k => ESMALTES[k]);
  const R = A.baztan ? REGLAS[2] : REGLAS[regla % 2];
  return armsCard(ui, {
    kicker: `Escudos de ${town}`, title: house, sub: blazon(A), stone: true,
    canvas: { w: 360, h: 420, draw: (cv, st) => paint(cv, A, st) },
    badge: isNew ? 'Nueva carta en tu armorial' : '',
    secs: [
      ['La casa', `Casa del siglo ${esc(A.century)}. Su escudo de piedra, sobre la puerta, decía quién vivía en ella y de qué familia venía.${CASAS[A.house] ? ` <b>${esc(A.house)}</b> quiere decir ${esc(CASAS[A.house])} en euskera: en el norte, la casa da nombre a la familia.` : ''}`],
      ['Partes', `<b>${esc(PARTICIONES[A.part].name)}.</b> ${esc(PARTICIONES[A.part].text)}`],
      ['Figuras', figs.map(k => `<b>${esc(FIGURAS[k].name)}.</b> ${esc(FIGURAS[k].text)}`).join('<br>')],
      ['Esmaltes', tints.map(k => `<span class="es-sw"><i style="background:${ESMALTES[k].color}"></i>${esc(ESMALTES[k].name)} (${esc(ESMALTES[k].es)})</span>`).join(' ') + `<br>En la piedra no hay colores: el cantero los marcaba con rayas y puntos. ${tints.map(k => `${esc(ESMALTES[k].name[0].toUpperCase() + ESMALTES[k].name.slice(1))}: ${esc(ESMALTES[k].piedra)}.`).join(' ')}`],
    ],
    more: [['Yelmo', esc(TIMBRE.yelmo.text)], ['Regla', esc(R.why)]],
  });
}

// ---------------------------------------------------------------- escudo oficial del pueblo o del valle
const PART_NAME = { entero: 'Entero', partido: 'Partido', cortado: 'Cortado', cuartelado: 'Cuartelado', 'terciado-faja': 'Terciado en faja', 'terciado-palo': 'Terciado en palo' };
const PART_TEXT = { entero: 'Un solo campo, sin dividir.', partido: 'Dividido de arriba abajo en dos mitades.', cortado: 'Dividido de lado a lado: arriba el jefe y abajo la punta.', cuartelado: 'En cuatro cuarteles, que se leen como un libro: primero arriba a tu izquierda.', 'terciado-faja': 'En tres franjas tumbadas, una encima de otra.', 'terciado-palo': 'En tres franjas de pie, una al lado de otra.' };
/** Ficha del escudo oficial A (de ARMAS) del pueblo o del valle: opts { town, isNew } → Promise<{ errors: 0 }> */
export function readTownArms(ui, A, { town = '', isNew = false } = {}) {
  if (window.__autoWin) return Promise.resolve({ errors: 0 });
  const valley = A.kind === 'valle';
  const T = { oro: 'oro (amarillo)', plata: 'plata (blanco)', gules: 'gules (rojo)', azur: 'azur (azul)', sinople: 'sinople (verde)', sable: 'sable (negro)' };
  const SW = { oro: '#e2b43c', plata: '#f1efe6', gules: '#b3202a', azur: '#1f4f9a', sinople: '#2f7d4a', sable: '#26221f' };
  const fields = [...new Set(A.q.flatMap(x => x.sub ? x.sub.q.map(y => y.f) : [x.f]))].filter(k => T[k]);
  const W = 300, H = Math.ceil(officialHeight(W, A)) + 12;
  return armsCard(ui, {
    kicker: valley ? `El escudo del valle · ${town}` : `El escudo de ${town}`, title: A.name, sub: A.blazon,
    canvas: { w: 360, h: Math.round(H * 360 / (W + 60)) + 4, draw: (cv) => { const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); g.save(); g.scale(cv.width / (W + 60), cv.width / (W + 60)); drawOfficial(g, (W + 60) / 2, 6, W, A); g.restore(); } },
    badge: isNew ? 'Nueva carta en tu armorial' : '',
    note: A.conf === 'media' ? 'La fuente resume este escudo: el dibujo del juego puede simplificar algún detalle.' : '',
    secs: [
      ['Cómo se lee', `<b>${esc(PART_NAME[A.part] || A.part)}.</b> ${esc(A.read)}`],
      ['Esmaltes', fields.map(k => `<span class="es-sw"><i style="background:${SW[k]}"></i>${esc(T[k])}</span>`).join(' ') + ' Oro y plata son metales; gules, azur, sinople y sable, colores.'],
      ['Figuras', (A.figs || []).filter(k => FIG[k]).map(k => `<b>${esc(FIG[k][0])}.</b> ${esc(FIG[k][1])}`).join('<br>')],
      ['Historia', esc(A.mean)],
    ],
    more: [['Qué es', valley ? `El escudo oficial de todo el valle; ${esc(town)} lo usa como suyo. Lo verás en el ayuntamiento, en los sellos y en las banderas.` : `El escudo oficial de ${esc(A.name)}. Lo verás en el ayuntamiento, en los sellos y en las banderas.`]],
  });
}
