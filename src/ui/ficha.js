// Ficha descriptiva de cada especie (fauna y flora): la imagen (el modelo 3D de la planta o el icono del animal), su
// nombre en castellano y en euskera, el científico, cómo reconocerla, dónde vive, cuándo verla y una curiosidad, con las
// comarcas donde está. La misma ficha sale en el juego (al identificar una planta, observar un animal o acariciar uno de
// granja) y en la sección Naturaleza del menú.
//   showFicha('flora:haya' | 'fauna:corzo', { ui, badge, button, kicker }) → promesa (al cerrar)
//   identifyQuiz('flora:haya', opciones, { ui }) → promesa del índice elegido (¿qué planta es?)
import { FLORA, FLORA_KIND, floraOf } from '../data/flora.js';
import { FAUNA, FAUNA_KIND, faunaOf } from '../data/fauna.js';
import { iconSVG } from './icons.js';
import { floraPortrait } from '../world/flora3d.js';
import COMARCAS from '../data/comarcas.json';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

/** Datos de una ficha: { type, id, F, comarcas } (o null). */
export function fichaOf(key) {
  const [type, id] = String(key).split(':');
  const F = type === 'flora' ? FLORA[id] : type === 'fauna' ? FAUNA[id] : null;
  if (!F) return null;
  const comarcas = COMARCAS.filter(c => (type === 'flora' ? floraOf(c) : faunaOf(c)).includes(id));
  return { type, id, F, comarcas };
}
/** Todas las fichas de un tipo ('flora' | 'fauna'). */
export const allFichas = (type) => Object.keys(type === 'flora' ? FLORA : FAUNA).map(id => fichaOf(type + ':' + id));

function open(ui, cls, html) {
  ui?.closeModal?.();
  const o = el(`<div class="mg-overlay ficha ${cls}"><div class="mg-card fc">${html}</div></div>`);
  document.body.appendChild(o); if (ui) ui.modal = o;
  return o;
}
function close(ui, o, k) { removeEventListener('keydown', k, true); o.classList.add('out'); setTimeout(() => o.remove(), 250); if (ui?.modal === o) ui.modal = null; }
// la imagen: el retrato 3D de la planta (se dibuja la primera vez) o el icono del animal
function picture(d) {
  if (d.type === 'fauna') return `<div class="fc-pic fauna">${iconSVG(d.F.icon || d.id, 150)}</div>`;
  return `<div class="fc-pic flora"><img alt="${esc(d.F.name)}" data-flora="${d.id}"></div>`;
}
function fillPictures(o) {
  o.querySelectorAll('img[data-flora]').forEach(img => floraPortrait(img.dataset.flora).then(u => { if (u) { img.src = u; img.classList.add('on'); } }).catch(() => {}));
}

export function showFicha(key, { ui = null, badge = '', button = 'Seguir', kicker = '' } = {}) {
  const d = fichaOf(key); if (!d) return Promise.resolve();
  if (window.__autoWin) return Promise.resolve();
  const F = d.F, kind = d.type === 'flora' ? FLORA_KIND[F.kind] : FAUNA_KIND[F.kind];
  return new Promise(res => {
    ui?.sound?.ui?.('card');
    const o = open(ui, '', `
      <div class="fc-head">${picture(d)}${badge ? `<div class="ic-badge">${esc(badge)}</div>` : ''}</div>
      <small class="kicker">${esc(kicker || `${kind || ''} · ficha de ${d.type === 'flora' ? 'flora' : 'fauna'}`)}</small>
      <h2>${esc(F.name)}</h2>
      <div class="fc-names">${F.eu ? `<span class="eu" lang="eu">${esc(F.eu)}</span>` : ''}${F.sci ? `<i class="sci">${esc(F.sci)}</i>` : ''}</div>
      <dl class="fc-sec">
        <dt>${d.type === 'flora' ? 'Cómo reconocerla' : 'Cómo reconocerlo'}</dt><dd>${esc(F.look)}</dd>
        ${F.where ? `<dt>Dónde vive</dt><dd>${esc(F.where)}</dd>` : ''}
        ${F.season ? `<dt>Cuándo verla</dt><dd>${esc(F.season)}</dd>` : ''}
        <dt>¿Sabías que…?</dt><dd>${esc(F.fact)}</dd>
      </dl>
      ${d.comarcas.length ? `<div class="fc-where">${d.comarcas.map(c => `<span style="--c:${c.color}">${esc(c.name)}</span>`).join('')}</div>` : ''}
      <button class="btn primary">${esc(button)}</button>`);
    fillPictures(o);
    const b = o.querySelector('button'); setTimeout(() => b.focus(), 60);
    const k = (e) => { e.stopImmediatePropagation(); if (['e', 'enter', ' ', 'escape'].includes(e.key.toLowerCase())) { e.preventDefault(); done(); } };
    const done = () => { ui?.sound?.ui?.('click'); close(ui, o, k); res(); };
    setTimeout(() => addEventListener('keydown', k, true), 300);
    b.onclick = done;
    o.onclick = (e) => { if (e.target === o) done(); };
  });
}

/** ¿Qué planta (o animal) es? Muestra la imagen y las opciones; devuelve el índice elegido tras marcar la buena. */
export function identifyQuiz(key, options, { ui = null, right = 0, question = '' } = {}) {
  const d = fichaOf(key); if (!d) return Promise.resolve(right);
  if (window.__autoWin) return Promise.resolve(right);
  return new Promise(res => {
    ui?.sound?.ui?.('card');
    const o = open(ui, 'quiz', `
      <div class="fc-head">${d.type === 'flora' ? picture(d) : picture(d)}</div>
      <small class="kicker">${d.type === 'flora' ? 'Identifica la planta' : 'Identifica el animal'}</small>
      <h2>${esc(question || (d.type === 'flora' ? '¿Qué planta es?' : '¿Qué animal es?'))}</h2>
      <p class="fc-hint">${esc(d.F.look)}</p>
      <div class="fc-opts">${options.map((t, i) => `<button class="btn fc-opt" data-i="${i}">${esc(t)}</button>`).join('')}</div>`);
    fillPictures(o);
    let busy = false;
    const pick = (i) => {
      if (busy) return; busy = true;
      const bs = o.querySelectorAll('.fc-opt');
      bs[right].classList.add('ok'); if (i !== right) bs[i].classList.add('ko');
      ui?.sound?.ui?.(i === right ? 'coin' : 'error');
      setTimeout(() => { close(ui, o, k); res(i); }, i === right ? 700 : 1400);
    };
    const k = (e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= options.length) { e.stopImmediatePropagation(); e.preventDefault(); pick(n - 1); } };
    addEventListener('keydown', k, true);
    o.querySelectorAll('.fc-opt').forEach(b => b.onclick = () => pick(+b.dataset.i));
  });
}
