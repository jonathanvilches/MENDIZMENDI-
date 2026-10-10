// Ficha descriptiva de cada especie (fauna y flora): la imagen (la foto real de la planta y de su hoja, o el animal), su
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
import { floraFoto, floraCredito } from './floraFoto.js';
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
  const o = el(`<div class="mg-overlay ficha ${cls}"><div class="mg-card ix fc${/quiz/.test(cls) ? ' quiz fit' : ''}">${html}</div></div>`);
  document.body.appendChild(o); if (ui) ui.modal = o;
  return o;
}
function close(ui, o, k) { removeEventListener('keydown', k, true); o.classList.add('out'); setTimeout(() => o.remove(), 250); if (ui?.modal === o) ui.modal = null; }
// la imagen: la foto real de la planta (y la de su hoja, con un selector debajo) o el animal dibujado; si no hay foto,
// la lámina dibujada. La etiqueta de estado («Nueva carta», «Al herbario») va recta en la esquina de arriba
function media(d, tag = '', shots = true) {
  const t = tag ? `<span class="ix-tag">${esc(tag)}</span>` : '';
  if (d.type === 'fauna') return `<div class="ix-media"><figure class="ix-frame icon">${iconSVG(d.F.icon || d.id, 240)}</figure>${t}</div>`;
  const ph = floraFoto(d.id);
  const A = ph ? { planta: ph.planta, hoja: ph.hoja, cp: floraCredito(ph.cr.planta), ch: floraCredito(ph.cr.hoja), cls: 'photo' }
    : { planta: floraIllustration(d.id), hoja: leafImage(d.id), cp: '', ch: '', cls: 'draw' };
  const two = shots && A.hoja;
  return `<div class="ix-media"><figure class="ix-frame ${A.cls}" data-planta="${A.planta}" data-hoja="${A.hoja || ''}" data-cp="${esc(A.cp)}" data-ch="${esc(A.ch)}">
      ${A.cls === 'photo' ? `<span class="ix-bd" style="background-image:url(${A.planta})"></span>` : ''}<img alt="${esc(d.F.name)}" src="${A.planta}">${two ? `<button type="button" class="ix-inset" aria-label="Ver la hoja"><img alt="" src="${A.hoja}"></button>` : ''}${A.cp ? `<figcaption class="ix-credit">${esc(A.cp)}</figcaption>` : ''}</figure>${t}
    ${two ? `<div class="ix-shots" role="group"><button type="button" data-s="planta" aria-pressed="true">${d.F.kind === 'flor' ? 'La flor' : 'La planta'}</button><button type="button" data-s="hoja" aria-pressed="false">La hoja</button></div>` : ''}</div>`;
}
// (el selector de foto: planta u hoja. La otra foto va en el círculo de la esquina: tocándolo, se cambian)
function wireShots(o, ui) {
  const fr = o.querySelector('.ix-frame[data-planta]'); if (!fr) return;
  const img = fr.querySelector(':scope > img'), cap = fr.querySelector('.ix-credit'), ins = fr.querySelector('.ix-inset');
  const show = (s) => {
    o.querySelectorAll('.ix-shots button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.s === s)));
    img.src = fr.dataset[s]; img.alt = (s === 'hoja' ? 'Hoja de ' : '') + img.alt.replace(/^Hoja de /, '');
    const bd = fr.querySelector('.ix-bd'); if (bd) bd.style.backgroundImage = `url(${fr.dataset[s]})`;
    if (cap) cap.textContent = fr.dataset[s === 'hoja' ? 'ch' : 'cp'] || fr.dataset.cp;
    if (ins) { const other = s === 'hoja' ? 'planta' : 'hoja'; ins.querySelector('img').src = fr.dataset[other]; ins.dataset.s = other; ins.setAttribute('aria-label', other === 'hoja' ? 'Ver la hoja' : 'Ver la planta'); }
    ui?.sound?.ui?.('click');
  };
  o.querySelectorAll('.ix-shots button').forEach(b => b.onclick = (e) => { e.stopPropagation(); show(b.dataset.s); });
  if (ins) { ins.dataset.s = 'hoja'; ins.onclick = (e) => { e.stopPropagation(); show(ins.dataset.s); }; }
}
// (las pestañas: una sección cada vez, entera)
function wireTabs(o, secs, ui) {
  const pane = o.querySelector('.ix-pane'); if (!pane) return;
  o.querySelectorAll('.ix-tabs button').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    o.querySelectorAll('.ix-tabs button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    pane.textContent = secs[+b.dataset.t][1]; pane.scrollTop = 0; pane.style.animation = 'none'; void pane.offsetWidth; pane.style.animation = '';
    b.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); ui?.sound?.ui?.('click');
  });
}

export function showFicha(key, { ui = null, badge = '', button = 'Seguir', kicker = '' } = {}) {
  const d = fichaOf(key); if (!d) return Promise.resolve();
  if (window.__autoWin) return Promise.resolve();
  const F = d.F, kind = d.type === 'flora' ? FLORA_KIND[F.kind] : FAUNA_KIND[F.kind];
  return new Promise(res => {
    ui?.sound?.ui?.('card');
    const secs = [['Cómo es', F.look], ['Dónde vive', F.where], ['Cuándo', F.season], ['¿Sabías que…?', F.fact]].filter(x => x[1]);
    const o = open(ui, 'ix-ov', `
      ${media(d, badge)}
      <div class="ix-main">
        <header class="ix-head"><p class="ix-kicker">${esc(kicker || `${kind || ''} · ficha de ${d.type === 'flora' ? 'flora' : 'fauna'}`)}</p>
          <h2 class="ix-title">${esc(F.name)}</h2>
          <div class="ix-sub">${F.eu ? `<b lang="eu">${esc(F.eu)}</b>` : ''}${F.sci ? `<i>${esc(F.sci)}</i>` : ''}</div></header>
        <div class="ix-tabs" role="tablist">${secs.map(([t], i) => `<button type="button" role="tab" data-t="${i}" aria-selected="${i === 0}">${esc(t)}</button>`).join('')}</div>
        <div class="ix-pane" role="tabpanel">${esc(secs[0]?.[1] || '')}</div>
        <div class="ix-end">${d.comarcas.length ? `<div class="ix-chips"><small>Comarcas</small>${d.comarcas.map(c => `<span style="--c:${c.color}">${esc(c.name)}</span>`).join('')}</div>` : ''}
          <div class="ix-foot"><button class="btn primary ix-go">${esc(button)}</button></div></div>
      </div>`);
    wireShots(o, ui); wireTabs(o, secs, ui);
    const b = o.querySelector('.ix-go'); setTimeout(() => b.focus({ preventScroll: true }), 60);
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
    const o = open(ui, 'ix-ov quiz', `
      ${media(d, '', false)}
      <div class="ix-main">
        <header class="ix-head"><p class="ix-kicker">${d.type === 'flora' ? 'Identifica la planta' : 'Identifica el animal'}</p>
          <h2 class="ix-title">${esc(question || (d.type === 'flora' ? '¿Qué planta es?' : '¿Qué animal es?'))}</h2></header>
        <div class="ix-body"><p class="ix-text fc-hint">${esc(d.F.look)}</p></div>
        <div class="ix-opts">${options.map((t, i) => `<button class="btn fc-opt" data-i="${i}">${esc(t)}</button>`).join('')}</div>
      </div>`);
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
