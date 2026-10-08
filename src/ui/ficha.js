// Ficha descriptiva de cada especie (fauna y flora): la imagen (la lámina dibujada de la planta o el animal), su
// nombre en castellano y en euskera, el científico, cómo reconocerla, dónde vive, cuándo verla y una curiosidad, con las
// comarcas donde está. La misma ficha sale en el juego (al identificar una planta, observar un animal o acariciar uno de
// granja) y en la sección Naturaleza del menú.
//   showFicha('flora:haya' | 'fauna:corzo', { ui, badge, button, kicker }) → promesa (al cerrar)
//   identifyQuiz('flora:haya', opciones, { ui }) → promesa del índice elegido (¿qué planta es?)
import { FLORA, FLORA_KIND, floraOf } from '../data/flora.js';
import { FAUNA, FAUNA_KIND, faunaOf } from '../data/fauna.js';
import { iconSVG } from './icons.js';
import { floraIllustration } from './floraArt.js';
import { leafImage } from './leafArt.js';
import COMARCAS from '../data/comarcas.json';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

/** Datos de una ficha: { type, id, F, comarcas } (o null). */
// letra que se lee sobre un color: oscura sobre los claros (amarillo, naranja) y blanca sobre los oscuros (antes, blanca
// siempre: «Sakana» en blanco sobre amarillo no se leía)
function inkOn(hex) {
  const m = String(hex).replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i); if (!m) return '#fff';
  const [r, g, b] = m.slice(1).map(x => { const v = parseInt(x, 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.2 ? '#241500' : '#fff';
}
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
// la imagen: la lámina dibujada de la planta (con su hoja en un medallón) o el animal sobre el mismo papel
function picture(d) {
  if (d.type === 'fauna') return `<div class="fc-pic fauna">${iconSVG(d.F.icon || d.id, 240)}</div>`;
  const leaf = leafImage(d.id);
  return `<div class="fc-pic flora"><img alt="${esc(d.F.name)}" src="${floraIllustration(d.id)}">${leaf ? `<figure class="fc-leaf"><img src="${leaf}" alt="Hoja de ${esc(d.F.name)}"><figcaption>Su hoja</figcaption></figure>` : ''}</div>`;
}

export function showFicha(key, { ui = null, badge = '', button = 'Seguir', kicker = '' } = {}) {
  const d = fichaOf(key); if (!d) return Promise.resolve();
  if (window.__autoWin) return Promise.resolve();
  const F = d.F, kind = d.type === 'flora' ? FLORA_KIND[F.kind] : FAUNA_KIND[F.kind];
  return new Promise(res => {
    ui?.sound?.ui?.('card');
    const sec = (t, x) => x ? `<div><dt>${t}</dt><dd>${esc(x)}</dd></div>` : '';
    const o = open(ui, '', `
      <div class="fc-head">${picture(d)}${badge ? `<div class="ic-badge">${esc(badge)}</div>` : ''}
        <div class="fc-title"><small class="kicker">${esc(kicker || `${kind || ''} · ficha de ${d.type === 'flora' ? 'flora' : 'fauna'}`)}</small>
        <h2>${esc(F.name)}</h2>
        <div class="fc-names">${F.eu ? `<span class="eu" lang="eu">${esc(F.eu)}</span>` : ''}${F.sci ? `<i class="sci">${esc(F.sci)}</i>` : ''}</div></div>
      </div>
      <div class="fc-body">
        <dl class="fc-sec">
          ${sec(d.type === 'flora' ? 'Cómo reconocerla' : 'Cómo reconocerlo', F.look)}${sec('Dónde vive', F.where)}${sec('Cuándo verla', F.season)}${sec('¿Sabías que…?', F.fact)}
        </dl>
        ${d.comarcas.length ? `<div class="fc-where">${d.comarcas.map(c => `<span style="--c:${c.color};color:${inkOn(c.color)}">${esc(c.name)}</span>`).join('')}</div>` : ''}
        <button class="btn primary">${esc(button)}</button>
      </div>`);
    const b = o.querySelector('button'); setTimeout(() => b.focus({ preventScroll: true }), 60);
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
      <div class="fc-head">${picture(d)}</div>
      <small class="kicker">${d.type === 'flora' ? 'Identifica la planta' : 'Identifica el animal'}</small>
      <h2>${esc(question || (d.type === 'flora' ? '¿Qué planta es?' : '¿Qué animal es?'))}</h2>
      <p class="fc-hint">${esc(d.F.look)}</p>
      <div class="fc-opts">${options.map((t, i) => `<button class="btn fc-opt" data-i="${i}">${esc(t)}</button>`).join('')}</div>`);
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
