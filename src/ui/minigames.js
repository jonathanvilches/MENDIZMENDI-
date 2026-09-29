// Minijuegos de interfaz: barra de precisión, pulsar rápido, ordenar pasos, repetir melodía y fichas de lugar.
import { iconSVG } from './icons.js';

const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = (a, rnd = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Capa modal común: bloquea el juego, gestiona teclado y limpieza
function overlay(ui, cls, html) {
  ui.closeModal?.();
  const o = el(`<div class="mg-overlay ${cls}"><div class="mg-card">${html}</div></div>`);
  document.body.appendChild(o);
  ui.modal = o;
  return o;
}
function done(ui, o, keyFn) { if (keyFn) removeEventListener('keydown', keyFn, true); o.classList.add('out'); setTimeout(() => o.remove(), 250); if (ui.modal === o) ui.modal = null; }

// ---------- Ficha de lugar (iglesias, monumentos, productos) ----------
export function infoCard(ui, opts) {
  if (window.__autoWin) return Promise.resolve();
  return infoCard_(ui, opts);
}
function infoCard_(ui, { icon = 'church', kicker = '', title, text, extra = '', image = '', button = 'Seguir explorando', badge = '' }) {
  return new Promise(res => {
    ui.sound.ui('card');
    const o = overlay(ui, 'info', `
      <div class="ic-head">${image ? `<img class="ic-img" src="${image}" alt="">` : `<div class="ic-icon">${iconSVG(icon, 84)}</div>`}${badge ? `<div class="ic-badge">${badge}</div>` : ''}</div>
      <small class="kicker">${esc(kicker)}</small><h2>${esc(title)}</h2><p>${esc(text)}</p>${extra}
      <button class="btn primary">${esc(button)}</button>`);
    const b = o.querySelector('button'); setTimeout(() => b.focus(), 60);
    const k = (e) => { e.stopImmediatePropagation(); if (['e', 'enter', ' ', 'escape'].includes(e.key.toLowerCase())) { e.preventDefault(); close(); } };
    const close = () => { ui.sound.ui('click'); done(ui, o, k); res(); };
    setTimeout(() => addEventListener('keydown', k, true), 300);
    b.onclick = close;
  });
}

// ---------- Barra de precisión (herrero, palomero, aizkolari, cantero…) ----------
// rounds: nº de golpes; zone: anchura de la zona buena (0..1); speed: vueltas por segundo
export function timingGame(ui, opts) {
  if (window.__autoWin) return Promise.resolve({ win: true, hits: 5, errors: 0 });
  return timingGame_(ui, opts);
}
function timingGame_(ui, { title, hint, icon = 'hammer', rounds = 5, zone = 0.18, speed = 0.7, need = 3, verb = 'Golpear' }) {
  return new Promise(res => {
    const o = overlay(ui, 'timing', `<div class="mg-top">${iconSVG(icon, 48)}<div><h3>${esc(title)}</h3><small>${esc(hint)}</small></div></div>
      <div class="tbar"><div class="zone"></div><div class="cursor"></div></div>
      <div class="pips">${Array.from({ length: rounds }, () => '<i></i>').join('')}</div>
      <div class="fb">¡Prepárate!</div><button class="btn primary big">${esc(verb)}</button>`);
    const zoneEl = o.querySelector('.zone'), cur = o.querySelector('.cursor'), fb = o.querySelector('.fb'), pips = o.querySelectorAll('.pips i');
    let zc = 0.5, t = 0, round = 0, hits = 0, raf, last = performance.now(), locked = false, sp = speed;
    const place = () => { zc = 0.15 + Math.random() * 0.7; zoneEl.style.left = ((zc - zone / 2) * 100) + '%'; zoneEl.style.width = (zone * 100) + '%'; };
    place();
    const pos = () => 0.5 - 0.5 * Math.cos(t * Math.PI * 2 * sp);
    const tick = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!locked) t += dt; cur.style.left = (pos() * 100) + '%'; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    const hit = () => {
      if (locked) return;
      const p = pos(), ok = Math.abs(p - zc) <= zone / 2 + 0.01;
      pips[round].className = ok ? 'ok' : 'ko';
      if (ok) { hits++; fb.textContent = Math.abs(p - zc) < zone * 0.2 ? '¡Perfecto!' : '¡Bien!'; ui.sound.tone(660 + hits * 60, 0.12, 'square', 0.12, ui.sound.sfx); ui.sound.noiseBurst?.(0.05, 3000, 1.5, 0.3, ui.sound.sfx); }
      else { fb.textContent = p < zc ? '¡Demasiado pronto!' : '¡Demasiado tarde!'; ui.sound.ui('error'); }
      ui.onMiniHit?.(ok);
      round++; locked = true;
      setTimeout(() => {
        if (round >= rounds) { cancelAnimationFrame(raf); const win = hits >= need; fb.textContent = win ? `¡Lo has conseguido! ${hits}/${rounds}` : `${hits}/${rounds}: necesitas ${need}. ¡Otra vez!`; setTimeout(() => { done(ui, o, k); res({ win, hits }); }, 1100); return; }
        sp *= 1.1; place(); locked = false;
      }, 550);
    };
    const k = (e) => { const key = e.key.toLowerCase(); e.stopImmediatePropagation(); if ([' ', 'e', 'enter'].includes(key)) { e.preventDefault(); hit(); } };
    addEventListener('keydown', k, true);
    o.querySelector('button').addEventListener('pointerdown', e => { e.preventDefault(); hit(); });
  });
}

// ---------- Pulsar rápido (harrijasotzaile, subir la piedra; remar la almadía…) ----------
export function mashGame(ui, opts) {
  if (window.__autoWin) return Promise.resolve({ win: true, hits: 5, errors: 0 });
  return mashGame_(ui, opts);
}
function mashGame_(ui, { title, hint, icon = 'stone', seconds = 6, goal = 30, verb = '¡Empuja!' }) {
  return new Promise(res => {
    const o = overlay(ui, 'mash', `<div class="mg-top">${iconSVG(icon, 48)}<div><h3>${esc(title)}</h3><small>${esc(hint)}</small></div></div>
      <div class="mbar"><i></i><span class="goal"></span></div><div class="fb">Pulsa muchas veces seguidas</div><div class="clock"></div>
      <button class="btn primary big">${esc(verb)}</button>`);
    const bar = o.querySelector('.mbar i'), fb = o.querySelector('.fb'), clock = o.querySelector('.clock');
    let n = 0, t0 = 0, raf, fin = false, lvl = 0;
    const tick = (now) => {
      if (!t0) t0 = now;
      const left = Math.max(0, seconds - (now - t0) / 1000);
      lvl = Math.max(0, lvl - 0.0025);          // la piedra pesa: baja si no empujas
      bar.style.height = Math.min(100, (n / goal) * 100 - lvl * 0) + '%';
      clock.textContent = left.toFixed(1) + ' s';
      if (n >= goal || left <= 0) { finish(n >= goal); return; }
      raf = requestAnimationFrame(tick);
    };
    const finish = (win) => { if (fin) return; fin = true; cancelAnimationFrame(raf); fb.textContent = win ? '¡Arriba! ¡Qué fuerza!' : '¡Casi! Prueba otra vez'; if (win) ui.sound.fanfare?.(); setTimeout(() => { done(ui, o, k); res({ win, n }); }, 1000); };
    const press = () => { if (fin) return; if (!t0) raf = requestAnimationFrame(tick); n++; ui.sound.tone(200 + n * 12, 0.05, 'triangle', 0.08, ui.sound.sfx); ui.onMiniHit?.(true); fb.textContent = n < goal * 0.3 ? '¡Vamos!' : n < goal * 0.7 ? '¡Más fuerte!' : '¡Ya casi!'; };
    const k = (e) => { const key = e.key.toLowerCase(); e.stopImmediatePropagation(); if ([' ', 'e', 'enter'].includes(key)) { e.preventDefault(); if (!e.repeat) press(); } };
    addEventListener('keydown', k, true);
    o.querySelector('button').addEventListener('pointerdown', e => { e.preventDefault(); press(); });
    raf = requestAnimationFrame(tick); t0 = 0;
  });
}

// ---------- Ordenar pasos (del producto a la mesa) ----------
export function sequenceGame(ui, opts) {
  if (window.__autoWin) return Promise.resolve({ win: true, hits: 5, errors: 0 });
  return sequenceGame_(ui, opts);
}
function sequenceGame_(ui, { title, hint, icon = 'basket', steps }) {
  return new Promise(res => {
    const order = shuffle(steps.map((s, i) => ({ s, i })));
    const o = overlay(ui, 'seq', `<div class="mg-top">${iconSVG(icon, 48)}<div><h3>${esc(title)}</h3><small>${esc(hint || 'Toca los pasos en el orden correcto')}</small></div></div>
      <ol class="slots">${steps.map((_, i) => `<li data-i="${i}"><b>${i + 1}</b><span></span></li>`).join('')}</ol>
      <div class="opts">${order.map(({ s, i }) => `<button class="opt" data-i="${i}">${esc(s)}</button>`).join('')}</div><div class="fb"></div>`);
    let next = 0, errors = 0;
    const slots = o.querySelectorAll('.slots li'), fb = o.querySelector('.fb');
    o.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      const i = +b.dataset.i;
      if (i === next) {
        slots[next].classList.add('ok'); slots[next].querySelector('span').textContent = steps[i];
        b.disabled = true; b.classList.add('used'); next++; ui.sound.ui('coin'); fb.textContent = '';
        if (next === steps.length) { fb.textContent = errors ? '¡Muy bien!' : '¡Perfecto, a la primera!'; ui.sound.magic?.(); setTimeout(() => { done(ui, o, k); res({ win: true, errors }); }, 1200); }
      } else { errors++; b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); ui.sound.ui('error'); fb.textContent = `Ese no va el ${next + 1}.º. Piensa qué pasa antes.`; }
    });
    const k = (e) => { e.stopImmediatePropagation(); const m = /^[1-9]$/.test(e.key) ? +e.key - 1 : -1; const bs = o.querySelectorAll('.opt:not(.used)'); if (m >= 0 && bs[m]) bs[m].click(); };
    addEventListener('keydown', k, true);
  });
}

// ---------- Repetir melodía / secuencia (canto, txistu, Bajada del Ángel) ----------
const PADS = [{ c: '#e03c3c', f: 392 }, { c: '#f2c230', f: 440 }, { c: '#3a8fd6', f: 523 }, { c: '#3ca05a', f: 587 }];
export function simonGame(ui, opts) {
  if (window.__autoWin) return Promise.resolve({ win: true, hits: 5, errors: 0 });
  return simonGame_(ui, opts);
}
function simonGame_(ui, { title, hint, icon = 'music', rounds = 4, labels = null }) {
  return new Promise(res => {
    const o = overlay(ui, 'simon', `<div class="mg-top">${iconSVG(icon, 48)}<div><h3>${esc(title)}</h3><small>${esc(hint || 'Escucha y repite la secuencia')}</small></div></div>
      <div class="pads4">${PADS.map((p, i) => `<button data-i="${i}" style="--c:${p.c}"><span>${labels ? esc(labels[i]) : ['Do', 'Re', 'Mi', 'Fa'][i]}</span></button>`).join('')}</div>
      <div class="fb">Escucha…</div><div class="pips">${Array.from({ length: rounds }, () => '<i></i>').join('')}</div>`);
    const btns = o.querySelectorAll('.pads4 button'), fb = o.querySelector('.fb'), pips = o.querySelectorAll('.pips i');
    const seq = []; let input = [], listening = false, round = 0, fails = 0;
    const flash = (i) => { btns[i].classList.add('on'); ui.sound.tone(PADS[i].f, 0.3, 'triangle', 0.16, ui.sound.sfx); setTimeout(() => btns[i].classList.remove('on'), 260); };
    const play = async () => {
      listening = false; fb.textContent = 'Escucha…';
      for (const i of seq) { await new Promise(r => setTimeout(r, 480)); flash(i); }
      await new Promise(r => setTimeout(r, 300));
      fb.textContent = 'Tu turno'; input = []; listening = true;
    };
    const nextRound = () => { seq.push(Math.floor(Math.random() * 4)); if (seq.length < 3) seq.push(Math.floor(Math.random() * 4)); play(); };
    const press = (i) => {
      if (!listening) return;
      flash(i); input.push(i);
      const k = input.length - 1;
      if (input[k] !== seq[k]) {
        listening = false; fails++; ui.sound.ui('error'); fb.textContent = fails >= 3 ? 'Vamos a intentarlo otra vez más tarde' : '¡Casi! Escucha otra vez';
        if (fails >= 3) { setTimeout(() => { done(ui, o, key); res({ win: false }); }, 900); return; }
        setTimeout(play, 900); return;
      }
      if (input.length === seq.length) {
        listening = false; pips[round].className = 'ok'; round++;
        if (round >= rounds) { fb.textContent = '¡Precioso!'; ui.sound.fanfare?.(); setTimeout(() => { done(ui, o, key); res({ win: true }); }, 1000); return; }
        fb.textContent = '¡Bien! Otra más'; setTimeout(nextRound, 700);
      }
    };
    btns.forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); press(+b.dataset.i); }));
    const key = (e) => { e.stopImmediatePropagation(); const m = { '1': 0, '2': 1, '3': 2, '4': 3, arrowleft: 0, arrowup: 1, arrowdown: 2, arrowright: 3 }[e.key.toLowerCase()]; if (m != null) { e.preventDefault(); press(m); } };
    addEventListener('keydown', key, true);
    setTimeout(nextRound, 600);
  });
}

// ---------- Resultado de misión (XP, carta y progreso) ----------
export function missionComplete(ui, opts) {
  if (window.__autoWin) return Promise.resolve();
  return missionComplete_(ui, opts);
}
function missionComplete_(ui, { title, text, xp, card, icon = 'star', progress, stamp = null, next = 'Seguir' }) {
  return new Promise(res => {
    ui.sound.fanfare?.();
    const o = overlay(ui, 'complete', `
      <div class="burst"></div>
      ${stamp ? `<img class="stampimg" src="${stamp}" alt="">` : `<div class="ic-icon big">${iconSVG(icon, 110)}</div>`}
      <small class="kicker">${stamp ? '¡Sello conseguido!' : '¡Misión cumplida!'}</small><h2>${esc(title)}</h2><p>${esc(text || '')}</p>
      <div class="rewards">${xp ? `<span class="rw">${iconSVG('xp', 26)} +${xp} XP</span>` : ''}${card ? `<span class="rw">${iconSVG('book', 26)} Carta: ${esc(card)}</span>` : ''}</div>
      ${progress ? `<div class="prog"><i style="width:${Math.round(progress.done / progress.total * 100)}%"></i><span>${progress.done}/${progress.total} misiones en ${esc(progress.name)}</span></div>` : ''}
      <button class="btn primary">${esc(next)}</button>`);
    const b = o.querySelector('button'); setTimeout(() => b.focus(), 80);
    const k = (e) => { e.stopImmediatePropagation(); if (['e', 'enter', ' ', 'escape'].includes(e.key.toLowerCase())) { e.preventDefault(); close(); } };
    const close = () => { ui.sound.ui('click'); done(ui, o, k); res(); };
    setTimeout(() => addEventListener('keydown', k, true), 500);
    b.onclick = close;
  });
}

// ---------- Final de un pueblo: todo completado ----------
// Devuelve 'stay' (seguir paseando), 'next' (siguiente pueblo) o 'map' (volver al mapa)
export function townFinale(ui, { town, stamp, missions = [], xp = 0, next = null }) {
  if (window.__autoWin) return Promise.resolve('stay');
  return new Promise(res => {
    ui.sound.fanfare?.();
    const o = overlay(ui, 'finale', `
      <div class="fw">${Array.from({ length: 14 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 5) * 0.35}s;--c:${['#FFD700', '#FF69B4', '#00BFFF', '#FF6347', '#8A2BE2'][i % 5]}"></i>`).join('')}</div>
      <small class="kicker">¡Pueblo completado!</small>
      <img class="stampimg big" src="${stamp}" alt="">
      <h2>${esc(town)}</h2>
      <p>Has cumplido todas las misiones y el sello ya brilla en tu Pasaporte Mendi.</p>
      <ul class="fin-list">${missions.map(m => `<li>${iconSVG(m.icon, 34)}<span>${esc(m.title)}</span>${iconSVG('check', 22)}</li>`).join('')}</ul>
      <div class="rewards"><span class="rw">${iconSVG('star', 26)} +${xp} XP</span><span class="rw">${iconSVG('stamp', 26)} Sello nuevo</span></div>
      <div class="fin-btns">
        ${next ? `<button class="btn primary" data-r="next">${iconSVG('play', 24)} Siguiente: ${esc(next)}</button>` : ''}
        <button class="btn ${next ? '' : 'primary'}" data-r="map">${iconSVG('map', 24)} Volver al mapa</button>
        <button class="btn ghost" data-r="stay">Seguir paseando por ${esc(town)}</button>
      </div>`);
    const k = (e) => { e.stopImmediatePropagation(); if (e.key === 'Escape') { e.preventDefault(); close('stay'); } };
    const close = (r) => { ui.sound.ui('click'); done(ui, o, k); res(r); };
    setTimeout(() => addEventListener('keydown', k, true), 500);
    o.querySelectorAll('[data-r]').forEach(b => b.onclick = () => close(b.dataset.r));
    setTimeout(() => o.querySelector('[data-r]')?.focus(), 80);
  });
}
