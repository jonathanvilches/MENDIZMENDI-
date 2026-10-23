// Instrumentos de Navarra (data/instrumentos.js): la lista del menú, la ficha de cada uno (qué es, cómo se toca, dónde
// suena, en el juego; con «Escuchar» y «Tocar») y el minijuego de tocar: las notas bajan por su carril y hay que pulsar
// cuando llegan a la línea, cada pulsación suena con el instrumento de verdad (audio/instrumentos.js) y el acompañamiento
// lleva el tiempo. Vale desde el menú y en la plaza del pueblo con el músico (game/townGame.js, tocarCon).
import { INSTRUMENTOS, instrumentoById, notasDe } from '../data/instrumentos.js';
import { tocarNota, acompanar, muestra } from '../audio/instrumentos.js';
import { infoCard as fichaTabs } from './escudo.js';
import { infoCard } from './minigames.js';
import { iconSVG } from './icons.js';
import { tr, isEU } from '../i18n.js';
import { profile, addCard, addXP, saveProfile, checkBadges } from '../game/profile.js';
import { fitCircles } from './fitlabel.js';
import { esc, el } from '../util/html.js';
import { isDidactico } from '../util/modo.js';
import { TACTIL } from '../util/tactil.js';

const tocado = (id, p = profile()) => (p.cards || []).includes('instrumento:' + id);

/** La lista del menú: una tarjeta por instrumento (abre su ficha por data-instrumento). */
export function instrumentosHTML(list = INSTRUMENTOS) {
  const p = profile();
  return `<div class="ins-grid">${list.map(x => `<button type="button" class="ins${tocado(x.id, p) ? ' on' : ''}" data-instrumento="${x.id}">${iconSVG(x.icon, 84)}
    <span class="ins-tx"><small>${esc(tr(x.family))}\u00a0· ${esc(tr(x.zone))}</small><b>${esc(x.name)}</b><i>${esc(x.eu)}</i>${tocado(x.id, p) ? `<em>${esc(tr('Tocado'))}</em>` : ''}</span></button>`).join('')}</div>`;
}

/** La ficha: pestañas y, debajo, Escuchar y Tocar (ui: { sound }). */
export async function openInstrumento(ui, id) {
  const x = instrumentoById(id); if (!x) return;
  const notas = notasDe(x), pueblos = x.towns.map(t => ui.townName?.(t) || t);
  const p = fichaTabs(ui, {
    kicker: tr('Saberes · Instrumentos'), title: x.name, sub: x.eu, media: `<img class="ins-big" src="" alt="" data-icon="${x.icon}">`,
    secs: [[tr('Qué es'), esc(x.what)], [tr('Cómo se toca'), esc(x.how)], [tr('Dónde suena'), esc(x.where)],
      ...(isDidactico() ? [] : [[tr('En el juego'), `${esc(tr('Busca al músico en la plaza de'))} ${esc(pueblos.join(', '))}: ${esc(tr('te enseña a tocarlo y, si te sale, ganas una carta de tradiciones. También puedes tocar aquí mismo.'))}`]])],
    badge: tocado(x.id) && !isDidactico() ? tr('Tocado') : '',
  });
  const o = ui.modal; if (!o) return p;
  // (el icono 3D, como en el resto del menú)
  const im = o.querySelector('.ins-big'); if (im) { const t = document.createElement('template'); t.innerHTML = iconSVG(x.icon, 260).trim(); im.replaceWith(t.content.firstElementChild); }
  const foot = o.querySelector('.ix-foot'), next = foot?.querySelector('.next');
  if (foot) {
    // (en el modo didáctico, solo escucharlo: tocarlo es un juego)
    const oir = el(`<button type="button" class="btn ghost tc-oir">${esc(tr('Escuchar'))}</button>`), tocar = el(`<button type="button" class="btn tc-tocar">${esc(tr('Tocar'))}</button>`);
    if (isDidactico()) foot.prepend(oir); else foot.prepend(oir, tocar);
    let busy = 0;
    oir.onclick = () => { if (busy > Date.now()) return; ui.sound?.init?.(); const d = muestra(ui.sound, x, notas); busy = Date.now() + d * 1000; oir.classList.add('on'); setTimeout(() => oir.classList.remove('on'), d * 1000); };
    tocar.onclick = async () => { next?.click(); await new Promise(r => setTimeout(r, 280)); await jugarInstrumento(ui, x); };
  }
  return p;
}

/** Tocar el instrumento y, si sale, la carta: devuelve { win, hits, total } o { quit }. who: el músico que enseña. */
export async function jugarInstrumento(ui, x, { who = '' } = {}) {
  if (window.__autoWin) { window.__autoSeen?.({ title: x.name }); return { win: true, hits: 1, total: 1 }; }
  ui.sound?.init?.();
  const r = await tocarGame(ui, x, { who });
  if (r.quit) return r;
  const isNew = r.win && addCard('instrumento:' + x.id, 'tradiciones');
  if (r.win) { addXP(isNew ? 25 : 5); saveProfile(); }
  const eu = isEU(), corto = eu ? x.eushort : x.short;
  await infoCard(ui, { icon: x.icon, kicker: who ? (eu ? `${who}rekin` : `Con ${who}`) : tr('Instrumentos de Navarra'), title: r.win ? (eu ? `${corto[0].toUpperCase() + corto.slice(1)} jo duzu!` : `¡Has tocado ${x.short}!`) : tr('Casi…'),
    text: `${r.hits} ${tr('de')} ${r.total} ${tr('notas a tiempo.')} ${r.win ? tr('Ahora ya sabes cómo suena de verdad.') : tr('Escucha el acompañamiento y vuelve a intentarlo cuando quieras.')}`,
    badge: isNew ? tr('Nueva carta en tus tradiciones') : '', button: tr('Seguir') });
  if (isNew && !who) for (const bd of checkBadges()) await infoCard(ui, { icon: bd.icon, kicker: tr('Nueva insignia'), title: bd.name, text: bd.text, button: '¡Bien!' });
  return r;
}

// ---------- el minijuego ----------
const KEYS = ['a', 's', 'd', 'f', 'g'];
function tocarGame(ui, x, { who = '' } = {}) {
  return new Promise(res => {
    const S = ui.sound, g = x.game, n = g.lanes.length, notas = notasDe(x), total = notas.length;
    const eighth = 60 / g.bpm / 2, bar = eighth * 2 * g.meter, fall = 2.3, touch = TACTIL;
    const air = (isEU() && g.airEu) || g.air || '';
    // el reloj del sonido (así las notas van a tempo con el acompañamiento); si el navegador lo tiene parado (sin permiso
    // para sonar, o el sonido suspendido al volver de otra aplicación), el de la página: si no, las notas no bajaban
    // nunca y el minijuego se quedaba para siempre en «¡Prepárate!»
    if (S?.ctx?.state === 'suspended') S.ctx.resume?.().catch?.(() => { });
    const p0 = performance.now() / 1000, a0 = S?.ctx ? S.ctx.currentTime : 0; let audioOk = !!S?.ctx;
    const clock = () => { const p = performance.now() / 1000 - p0; if (audioOk) { if (p > 1 && S.ctx.currentTime - a0 < p * 0.5) audioOk = false; else return S.ctx.currentTime; } return a0 + p; };
    ui.closeModal?.();
    // (cada carril acaba en su botón: la nota baja hasta él y se pulsa cuando le llega; en el móvil no hay letras de teclas)
    const o = el(`<div class="mg-overlay tocar${touch ? ' touch' : ''}"><div class="mg-card tocar-card">
      <div class="mg-top">${iconSVG(x.icon, 48)}<div><h3>${isEU() ? `Jo ${esc(x.eushort)}` : `Toca ${esc(x.short)}`}</h3><small>${esc(air)}${air ? ' · ' : ''}${esc(tr('aire tradicional'))}${who ? ` · ${isEU() ? esc(who) + 'rekin' : 'con ' + esc(who)}` : ''}</small></div><b class="tc-score"><span>0</span>/${total}</b></div>
      <div class="tc-stage" style="--n:${n}"><div class="tc-lanes">${g.lanes.map((l) => `<div class="tc-lane"><span class="tc-tag">${esc(l)}</span></div>`).join('')}</div>
        <div class="tc-pads">${g.lanes.map((l, i) => `<button type="button" data-i="${i}" aria-label="${esc(l)}"><span>${esc(l)}</span>${touch ? '' : `<small class="tc-k">${KEYS[i].toUpperCase()}</small>`}</button>`).join('')}</div><div class="tc-notes"></div>
        <div class="tc-fb">${esc(tr('¡Prepárate!'))}</div></div>
      <p class="tc-hint">${esc(touch ? tr('Pulsa el botón de cada carril cuando la nota le llegue') : tr('Pulsa el botón de cada carril cuando la nota le llegue · teclas A S D F G o 1-5'))}</p>
      <button type="button" class="x tc-x" aria-label="${esc(tr('Salir'))}">✕</button></div></div>`);
    document.body.appendChild(o); ui.modal = o;
    fitCircles(o.querySelector('.tc-pads')); const onFit = () => fitCircles(o.querySelector('.tc-pads')); addEventListener('resize', onFit);
    const stage = o.querySelector('.tc-notes'), fb = o.querySelector('.tc-fb'), score = o.querySelector('.tc-score span'), pads = [...o.querySelectorAll('.tc-pads button')], stageEl = o.querySelector('.tc-stage');
    // la nota llega al centro del botón de su carril (se mide en píxeles: el escenario cambia de alto con la pantalla)
    const lineY = () => { const r = stageEl.getBoundingClientRect(), b = pads[0]?.getBoundingClientRect(); return r.height && b ? (b.top + b.height / 2 - r.top) / r.height : 0.84; };
    const wasMusic = S?.musicOn; S?.setMusic?.(false);
    const t0 = clock() + bar * 2 + 0.3;   // (dos compases de entrada con el acompañamiento)
    const notes = notas.map(nn => ({ lane: nn.lane, t: t0 + nn.i * eighth, el: null, done: false }));
    const bars = Math.ceil((notas.at(-1).i + 1) / (g.meter * 2));
    let nextBar = -2, hits = 0, over = false, raf = 0, lastCount = -1;
    const flash = (i) => { pads[i].classList.add('flash'); setTimeout(() => pads[i].classList.remove('flash'), 120); };
    const press = (i) => {
      if (over || i >= n) return; flash(i); const now = clock();
      let best = null, bd = 1; for (const nn of notes) if (!nn.done && nn.lane === i) { const d = Math.abs(now - nn.t); if (d < bd) { bd = d; best = nn; } }
      tocarNota(S, x, i, null, eighth * 1.8);   // (suena siempre: se está tocando el instrumento)
      if (best && bd < 0.3) { best.done = true; best.el?.classList.add('hit'); hits++; score.textContent = hits; fb.textContent = bd < 0.12 ? tr('¡Perfecto!') : tr('¡Bien!'); fb.className = 'tc-fb ok'; }
      else { fb.textContent = tr('¡Uy!'); fb.className = 'tc-fb bad'; }
    };
    const end = (quit = false) => {
      if (over) return; over = true; cancelAnimationFrame(raf); removeEventListener('keydown', key, true); removeEventListener('resize', onFit);
      S?.setMusic?.(wasMusic); delete window.__tocar;
      o.classList.add('out'); setTimeout(() => o.remove(), 250); if (ui.modal === o) ui.modal = null;
      res(quit ? { quit: true, hits, total } : { win: hits >= Math.ceil(total * 0.6), hits, total });
    };
    const tick = () => {
      if (over) return; const now = clock();
      // el acompañamiento, un compás por delante
      while (nextBar < bars && t0 + nextBar * bar < now + 0.6) { acompanar(S, x, Math.max(0, nextBar), t0 + nextBar * bar, eighth); nextBar++; }
      // la cuenta de entrada
      if (now < t0) { const c = g.meter - Math.floor((t0 - now) / (eighth * 2)) % g.meter; if (c !== lastCount) { lastCount = c; fb.textContent = now < t0 - bar ? tr('¡Prepárate!') : String(c); fb.className = 'tc-fb'; } }
      else if (fb.className === 'tc-fb' && fb.textContent) fb.textContent = '';
      const LINE = lineY(), H = stageEl.clientHeight || 300, near = new Array(n).fill(false);
      for (const nn of notes) {
        const k = 1 - (nn.t - now) / fall;
        if (k < 0) continue;
        if (!nn.el) { nn.el = el(`<div class="tc-note" style="left:${(nn.lane + 0.5) / n * 100}%">${esc(g.lanes[nn.lane])}</div>`); stage.appendChild(nn.el); }
        const top = k * LINE * H; nn.el.style.top = top + 'px'; nn.el.style.visibility = top < 28 ? 'hidden' : '';
        if (!nn.done && Math.abs(nn.t - now) < 0.3) near[nn.lane] = true;
        if (!nn.done && now - nn.t > 0.3) { nn.done = true; nn.el.classList.add('miss'); }
        if (now - nn.t > 0.7 && nn.el.parentNode) nn.el.remove();
      }
      // el botón se enciende cuando su nota está llegando: es el momento de pulsar
      for (let i = 0; i < n; i++) pads[i].classList.toggle('near', near[i]);
      if (now > notes[notes.length - 1].t + 1) { fb.textContent = hits >= Math.ceil(total * 0.6) ? tr('¡Bravo!') : tr('Casi…'); fb.className = 'tc-fb ok'; setTimeout(() => end(false), 900); return; }
      raf = requestAnimationFrame(tick);
    };
    pads.forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); press(+b.dataset.i); }));
    const key = (e) => { e.stopImmediatePropagation(); const k = e.key.toLowerCase(); if (k === 'escape') { e.preventDefault(); return end(true); }
      const m = /^[1-5]$/.test(k) ? +k - 1 : { arrowleft: 0, arrowup: 1, arrowdown: 2, arrowright: 3 }[k] ?? KEYS.indexOf(k); if (m >= 0) { e.preventDefault(); press(m); } };
    addEventListener('keydown', key, true);
    o.querySelector('.tc-x').onclick = () => end(true);
    // (para las pruebas automáticas: las notas que vienen y pulsar un carril)
    window.__tocar = { notas: () => { const now = clock(); return notes.filter(nn => !nn.done).map(nn => ({ lane: nn.lane, dt: nn.t - now })); }, pulsar: press, fin: () => over };
    raf = requestAnimationFrame(tick);
  });
}
