// Leer el escudo de una fachada: primero tallado en piedra (como se ve en la calle) y, pregunta a pregunta, se aprende a
// leerlo (cómo está dividido, qué figuras lleva, qué esmalte marcan las rayas de la piedra y una regla de la heráldica).
// Al final aparece en color con su descripción de heraldista (el blasón) y lo que significa cada figura.
import { iconSVG } from './icons.js';
import { drawArms } from '../world/heraldry.js';
import { ESMALTES, PARTICIONES, FIGURAS, TIMBRE, REGLAS, CASAS, blazon } from '../data/blasones.js';

const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ORD = ['primer', 'segundo', 'tercer', 'cuarto'];

function paint(canvas, A, stone) {
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  g.clearRect(0, 0, W, H);
  const w = Math.min(W * 0.72, H / 1.62);
  drawArms(g, W / 2, H * 0.04, w, A, { stone });
}

/** Lectura guiada del escudo A (de houseArms). opts: { town, isNew, regla } → Promise<{ errors }> */
export function readArms(ui, A, { town = '', isNew = false, regla = 0 } = {}) {
  if (window.__autoWin) return Promise.resolve({ errors: 0 });
  return new Promise(res => {
    ui.closeModal?.(); ui.sound?.ui?.('card');
    const o = el(`<div class="mg-overlay escudo"><div class="mg-card">
      <div class="es-pic"><canvas width="360" height="420" aria-label="Escudo de la casa ${esc(A.house)}"></canvas><small class="es-cap">Tallado en piedra</small></div>
      <div class="es-txt"><small class="kicker">${iconSVG('shield', 20)} Escudos de ${esc(town)} · ${esc(A.house.startsWith('Casa') ? A.house : 'casa ' + A.house)}</small><h2></h2><p class="es-q"></p>
        <div class="opts"></div><div class="fb"></div><button class="btn primary next">Seguir</button></div></div></div>`);
    document.body.appendChild(o); ui.modal = o;
    const cv = o.querySelector('canvas'), h2 = o.querySelector('h2'), q = o.querySelector('.es-q'), opts = o.querySelector('.opts'), fb = o.querySelector('.fb'), next = o.querySelector('.next'), cap = o.querySelector('.es-cap');
    paint(cv, A, true);
    let errors = 0;
    const first = A.q.findIndex(x => x.c !== 'chequy'), Q1 = A.q[Math.max(0, first)], where = A.q.length > 1 ? `el ${ORD[Math.max(0, first)]} cuartel` : 'el escudo';
    const figs = [...new Set(A.q.map(x => x.c))];
    const R = A.baztan ? REGLAS[2] : REGLAS[regla % 2];
    const steps = [
      { title: 'Lee el escudo de la fachada', text: `Esta casa del siglo ${A.century} luce su escudo de piedra sobre la puerta. Los escudos dicen quién vivía en la casa y de qué familia venía. Vamos a leerlo como lo haría un heraldista.` },
      { title: '¿Cómo está dividido?', text: 'Fíjate en las líneas que cruzan el escudo.', options: Object.keys(PARTICIONES).map(k => [k, PARTICIONES[k].name]), answer: A.part, why: PARTICIONES[A.part].text },
      { title: '¿Qué figura ves?', text: `Mira ${where}.`, options: shuffle([Q1.c, ...shuffle(Object.keys(FIGURAS).filter(k => k !== Q1.c && k !== 'chequy')).slice(0, 2)]).map(k => [k, FIGURAS[k].name]), answer: Q1.c, why: FIGURAS[Q1.c].text },
      { title: '¿Qué esmalte marca la piedra?', text: `En la piedra no hay colores, pero a veces los canteros los marcaban. El campo de ${where} tiene: ${ESMALTES[Q1.f].piedra}. ¿Qué esmalte es?`,
        options: shuffle([Q1.f, ...shuffle(Object.keys(ESMALTES).filter(k => k !== Q1.f)).slice(0, 3)]).map(k => [k, `${ESMALTES[k].name} (${ESMALTES[k].es})`, ESMALTES[k].color]), answer: Q1.f,
        why: `Es ${ESMALTES[Q1.f].name}, el ${ESMALTES[Q1.f].es}. Oro y plata son los metales; gules, azur, sinople y sable, los colores. En piedra: oro, puntitos; gules, rayas verticales; azur, horizontales; sinople, en diagonal; sable, cuadrícula; plata, liso.` },
      { title: 'Una regla de los escudos', text: R.q, options: R.options.map((t, i) => [i, t]), answer: R.answer, why: R.why },
    ];
    let si = 0;
    const show = () => {
      const S = steps[si]; h2.textContent = S.title; q.textContent = S.text; fb.textContent = ''; opts.innerHTML = '';
      next.style.display = S.options ? 'none' : ''; next.textContent = si === 0 ? 'Empezar' : 'Seguir';
      if (S.options) for (const [k, label, color] of S.options) {
        const b = el(`<button class="opt">${color ? `<i class="sw" style="background:${color}"></i>` : ''}${esc(label)}</button>`);
        b.onclick = () => {
          if (next.style.display !== 'none') return;
          if (String(k) === String(S.answer)) { b.classList.add('right'); ui.sound?.ui?.('coin'); fb.textContent = S.why; opts.querySelectorAll('.opt').forEach(x => { if (x !== b) x.disabled = true; }); next.style.display = ''; next.focus({ preventScroll: true }); }
          else { errors++; b.classList.add('shake', 'wrong'); b.disabled = true; setTimeout(() => b.classList.remove('shake'), 400); ui.sound?.ui?.('error'); fb.textContent = 'Fíjate otra vez…'; }
        };
        opts.appendChild(b);
      }
    };
    const reveal = () => {
      paint(cv, A, false); cap.textContent = 'Con sus esmaltes'; ui.sound?.ui?.('coin');
      h2.textContent = A.house.startsWith('Casa') ? A.house : `Casa ${A.house}`;
      q.innerHTML = `${CASAS[A.house] ? `<b>${esc(A.house)}</b> quiere decir ${esc(CASAS[A.house])} en euskera: en el norte, la casa da nombre a la familia y dice dónde está.<br>` : ''}<b>El blasón:</b> ${esc(blazon(A))}`;
      opts.innerHTML = `<ul class="es-means">${figs.map(k => `<li><b>${esc(FIGURAS[k].name)}.</b> ${esc(FIGURAS[k].text)}</li>`).join('')}<li><b>${TIMBRE.yelmo.name}.</b> ${esc(TIMBRE.yelmo.text)}</li></ul>`;
      fb.innerHTML = isNew ? `<span class="badge">${iconSVG('book', 18)} Nueva carta: escudo de la casa ${esc(A.house)}</span>` : '';
      next.textContent = 'Seguir explorando'; next.style.display = ''; next.onclick = close;
    };
    next.onclick = () => { si++; if (si < steps.length) show(); else reveal(); };
    const close = () => { removeEventListener('keydown', k, true); o.classList.add('out'); setTimeout(() => o.remove(), 250); if (ui.modal === o) ui.modal = null; res({ errors }); };
    const k = (e) => { e.stopImmediatePropagation(); if (next.style.display !== 'none' && ['enter', ' ', 'e'].includes(e.key.toLowerCase())) { e.preventDefault(); next.click(); return; } const m = /^[1-9]$/.test(e.key) ? +e.key - 1 : -1; const bs = opts.querySelectorAll('.opt'); if (m >= 0 && bs[m]) bs[m].click(); };
    addEventListener('keydown', k, true);
    show();
  });
}
