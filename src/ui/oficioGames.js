// Minijuegos de los oficios: cada uno se parece a la tarea de verdad, para que tenga sentido lo que se hace.
//  · ordeñar: apretar las dos tetillas alternando las manos (izquierda, derecha…) con calma; el cubo se llena
//  · esquilar: pasar las tijeras por todo el vellón, sin acercarse a la cabeza
//  · recoger (vendimia, huerta): coger lo que está maduro y dejar lo verde
//  · forja: avivar el fuego con el fuelle y golpear el hierro cuando está al rojo vivo (frío no se deja, blanco se quema)
//  · coser: dar las puntadas siguiendo el contorno de la suela, en orden
// Todos devuelven una promesa con { win } y se juegan con el dedo, el ratón o el teclado.
import { iconSVG } from './icons.js';
import { milkBG, drawMilk, shearBG, drawShear, forgeBG, drawForge, pickBG, drawRow, drawCrop, stitchBG, drawStitch } from './oficioArt.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const W = 480, H = 360;

// ventana común: título, explicación, lienzo, mensaje, tiempo y botones propios de cada juego
function frame(ui, { title, hint, icon, buttons = '' }) {
  ui.closeModal?.();
  const o = document.createElement('div'); o.className = 'mg-overlay oficio';
  o.innerHTML = `<div class="mg-card"><div class="mg-top">${iconSVG(icon, 48)}<div><h3>${esc(title)}</h3><small>${esc(hint)}</small></div></div>
    <div class="of-stage"><canvas width="${W}" height="${H}"></canvas><div class="of-clock"></div></div>
    <div class="fb">¡Cuando quieras!</div><div class="of-btns">${buttons}</div></div>`;
  document.body.appendChild(o); ui.modal = o;
  const cv = o.querySelector('canvas'), g = cv.getContext('2d');
  const at = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
  let keyFn = null, raf = 0, closed = false, done = null;
  const api = {
    o, cv, g, at, fb: o.querySelector('.fb'), clock: o.querySelector('.of-clock'),
    keys(fn) { keyFn = (e) => { e.stopImmediatePropagation(); fn(e); }; addEventListener('keydown', keyFn, true); },
    // si alguien quita la ventana (salir al mapa, otra ventana encima), el juego se da por perdido y deja de dibujar
    loop(fn, res) { done = res; let last = performance.now(); const step = (now) => { if (closed) return; if (!o.isConnected) { api.close(done, { win: false }, '', 0); return; } const dt = Math.min(0.1, (now - last) / 1000); last = now; fn(dt); raf = requestAnimationFrame(step); }; raf = requestAnimationFrame(step); },
    close(res, value, msg, wait = 1100) {
      if (closed) return; closed = true; cancelAnimationFrame(raf); if (keyFn) removeEventListener('keydown', keyFn, true);
      if (!o.isConnected) { if (ui.modal === o) ui.modal = null; res(value); return; }
      if (msg) api.fb.textContent = msg; if (value.win) ui.sound.fanfare?.();
      setTimeout(() => { o.classList.add('out'); setTimeout(() => o.remove(), 250); if (ui.modal === o) ui.modal = null; res(value); }, wait);
    },
  };
  return api;
}
const blip = (ui, f, d = 0.06, v = 0.08, type = 'triangle') => ui.sound.tone?.(f, d, type, v, ui.sound.sfx);
const auto = () => window.__autoWin ? Promise.resolve({ win: true }) : null;

// ---------- Ordeñar a mano ----------
export function milkGame(ui, { title = 'Ordeñar a mano', icon = 'milk', seconds = 18 } = {}) {
  return auto() || new Promise(res => {
    const F = frame(ui, { title, icon, hint: 'Aprieta una tetilla y luego la otra, alternando las manos y con calma: así baja la leche. Si repites mano o vas muy deprisa, la vaca se pone nerviosa.',
      buttons: '<button class="btn primary big" data-s="L">Mano izquierda</button><button class="btn primary big" data-s="R">Mano derecha</button>' });
    const { g } = F, BG = milkBG(); let milk = 0, last = null, lastT = -1, t = 0, squeeze = { L: 0, R: 0 }, nerves = 0, drops = [];
    const S = { milk: 0, squeeze, shake: 0, drops, surf: 300 };
    const press = (s) => {
      const now = performance.now() / 1000;
      if (now - lastT < 0.16) { nerves = 1; milk = Math.max(0, milk - 3); F.fb.textContent = '¡Despacio! La vaca se mueve'; ui.sound.ui?.('error'); lastT = now; return; }
      if (s === last) { F.fb.textContent = '¡Alterna! Ahora la otra mano'; blip(ui, 180); lastT = now; return; }
      last = s; lastT = now; squeeze[s] = 1; milk += 5.5; drops.push({ x: s === 'L' ? 210 : 270, y: 206, v: 0 }); blip(ui, 520 + milk * 2);
      F.fb.textContent = milk < 40 ? '¡Bien! Sigue alternando' : milk < 80 ? 'El cubo se llena…' : '¡Ya casi!';
      ui.onMiniHit?.(true);
      if (milk >= 100) F.close(res, { win: true }, '¡Cubo lleno! Leche fresca para el queso');
    };
    F.o.querySelectorAll('[data-s]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); press(b.dataset.s); }));
    F.cv.addEventListener('pointerdown', e => { const p = F.at(e); press(p.x < W / 2 ? 'L' : 'R'); });
    F.keys((e) => { const k = e.key.toLowerCase(); if (['a', 'arrowleft', 'j'].includes(k)) press('L'); if (['d', 'arrowright', 'k', 'l'].includes(k)) press('R'); });
    F.loop((dt) => {
      t += dt; nerves = Math.max(0, nerves - dt * 1.5); for (const s of 'LR') squeeze[s] = Math.max(0, squeeze[s] - dt * 5);
      const left = seconds - t; F.clock.textContent = Math.max(0, left).toFixed(1) + ' s';
      if (left <= 0) F.close(res, { win: false }, 'Se acabó el tiempo. ¡Con más ritmo la próxima vez!');
      // dibujo: la cuadra, el vientre de la vaca, la ubre con sus tetillas, las manos y el cubo
      for (const d of drops) { d.v += 900 * dt; d.y += d.v * dt; d.x += (240 - d.x) * dt * 1.2; }
      drops = drops.filter(d => d.y < S.surf); S.drops = drops;
      S.milk = milk; S.shake = nerves ? Math.sin(t * 60) * 4 * nerves : 0;
      drawMilk(g, BG, S);
    }, res);
  });
}

// ---------- Esquilar a mano ----------
export function shearGame(ui, { title = 'Esquilar a mano', icon = 'wool', seconds = 24 } = {}) {
  return auto() || new Promise(res => {
    const F = frame(ui, { title, icon, hint: 'Arrastra las tijeras por el vellón para cortar la lana. Toda la lana sale entera, como un abrigo. Ojo: no acerques las tijeras a la cabeza.' });
    const { g } = F, BG = shearBG(), wool = [], head = { x: 395, y: 150, r: 46 }, tufts = [];
    for (let y = 95; y <= 255; y += 16) for (let x = 95; x <= 345; x += 16) { const dx = (x - 220) / 128, dy = (y - 175) / 82; if (dx * dx + dy * dy < 1) wool.push({ x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6, on: true }); }
    const total = wool.length; let cut = 0, t = 0, ptr = null, down = false, warn = 0;
    const shear = (p) => {
      if (Math.hypot(p.x - head.x, p.y - head.y) < head.r + 8) { if (warn <= 0) { warn = 1.2; F.fb.textContent = '¡Cuidado con la cabeza! Las tijeras, por el lomo'; ui.sound.ui?.('error'); } return; }
      let n = 0; for (const w of wool) if (w.on && Math.hypot(w.x - p.x, w.y - p.y) < 22) { w.on = false; n++; if (tufts.length < 40) tufts.push({ x: w.x, y: w.y, vy: 20 + Math.random() * 40, vx: (Math.random() - 0.5) * 30, a: Math.random() * 3, life: 1 }); }
      if (n) { cut += n; blip(ui, 900 + Math.random() * 200, 0.03, 0.05, 'square'); ui.onMiniHit?.(true); F.fb.textContent = cut / total < 0.5 ? '¡Bien, sigue por todo el lomo!' : cut / total < 0.85 ? 'Ya va saliendo el vellón…' : '¡Casi esquilada!'; }
      if (cut / total >= 0.9) F.close(res, { win: true }, '¡Esquilada! Un vellón entero de lana latxa');
    };
    F.cv.addEventListener('pointerdown', e => { down = true; ptr = F.at(e); shear(ptr); try { F.cv.setPointerCapture(e.pointerId); } catch { /* sin captura */ } });
    F.cv.addEventListener('pointermove', e => { ptr = F.at(e); if (down) shear(ptr); });
    addEventListener('pointerup', () => { down = false; });
    // con teclado: flechas para mover las tijeras (cortan solas al pasar)
    const kb = { x: 160, y: 175 }; F.keys((e) => { const k = e.key.toLowerCase(), s = 18; if (k === 'arrowleft' || k === 'a') kb.x -= s; if (k === 'arrowright' || k === 'd') kb.x += s; if (k === 'arrowup' || k === 'w') kb.y -= s; if (k === 'arrowdown' || k === 's') kb.y += s; kb.x = Math.max(60, Math.min(W - 20, kb.x)); kb.y = Math.max(60, Math.min(H - 40, kb.y)); ptr = { ...kb }; shear(ptr); });
    F.loop((dt) => {
      t += dt; warn -= dt; const left = seconds - t; F.clock.textContent = Math.max(0, left).toFixed(1) + ' s';
      if (left <= 0) F.close(res, { win: cut / total >= 0.7 }, cut / total >= 0.7 ? 'Bien esquilada, aunque con algún mechón' : 'Se acabó el tiempo: queda mucha lana');
      for (const f of tufts) { f.vy += 160 * dt; f.y = Math.min(318, f.y + f.vy * dt); f.x += f.vx * dt; f.life -= dt * 0.6; }
      for (let i = tufts.length - 1; i >= 0; i--) if (tufts[i].life <= 0) tufts.splice(i, 1);
      drawShear(g, BG, { wool, head, tufts, ptr, warn, t, down, cut: cut / total });
    }, res);
  });
}

// ---------- Recoger lo maduro (vendimia, huerta) ----------
// kind: 'uva' (racimos morados maduros, verdes no), 'pimiento' (rojos sí, verdes no), 'alcachofa' (cerradas sí, abiertas no)
const CROP = {
  uva: { ripe: '#4a2350', unripe: '#9ec25a', leaf: '#4f7a2e', draw: (g, x, y, c) => { g.fillStyle = c; for (const [dx, dy] of [[0, 0], [-8, -10], [8, -10], [-12, -22], [0, -22], [12, -22], [-6, 10], [6, 10], [0, 20]]) { g.beginPath(); g.arc(x + dx, y - dy * 0.9, 7, 0, Math.PI * 2); g.fill(); } } },
  pimiento: { ripe: '#c9271f', unripe: '#4e8c2c', leaf: '#3c6e28', draw: (g, x, y, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x - 9, y - 14); g.quadraticCurveTo(x - 12, y + 10, x + 2, y + 24); g.quadraticCurveTo(x + 12, y + 6, x + 9, y - 14); g.closePath(); g.fill(); g.fillStyle = '#3a6a22'; g.fillRect(x - 2, y - 22, 4, 9); } },
  alcachofa: { ripe: '#5f8a4a', unripe: '#8a6aa0', leaf: '#4a6e3a', draw: (g, x, y, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, 15, 19, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x - 13, y + k * 9); g.quadraticCurveTo(x, y + k * 9 + 6, x + 13, y + k * 9); g.stroke(); } } },
};
export function pickGame(ui, { title = 'La vendimia', icon = 'grapes', kind = 'uva', need = 12, seconds = 22, hint } = {}) {
  return auto() || new Promise(res => {
    const C = CROP[kind] || CROP.uva, nameR = kind === 'uva' ? 'los racimos morados' : kind === 'pimiento' ? 'los pimientos rojos' : 'las alcachofas bien cerradas', nameU = kind === 'uva' ? 'los verdes aún no están maduros' : kind === 'pimiento' ? 'los verdes aún no' : 'las abiertas ya han pasado';
    const F = frame(ui, { title, icon, hint: hint || `Recoge solo ${nameR}: ${nameU}. Llena la cesta.` });
    const { g } = F, BG = pickBG(kind); let got = 0, bad = 0, t = 0, items = [], spawnT = 0;
    F.o.state = () => ({ items: items.map(i => ({ x: i.x, y: i.y, ripe: i.ripe })) });   // para las pruebas automáticas
    const rows = [120, 220, 310];
    const spawn = () => { const row = rows[Math.floor(Math.random() * rows.length)], x = 50 + Math.random() * 380; if (items.some(i => Math.abs(i.x - x) < 40 && i.y === row)) return; items.push({ x, y: row, ripe: Math.random() < 0.62, life: 2.6 + Math.random() * 1.6, age: 0 }); };
    for (let i = 0; i < 6; i++) spawn();
    const pick = (p) => {
      const it = items.find(i => Math.hypot(i.x - p.x, i.y - p.y) < 30); if (!it) return;
      items.splice(items.indexOf(it), 1);
      if (it.ripe) { got++; blip(ui, 600 + got * 30); ui.onMiniHit?.(true); F.fb.textContent = got < need * 0.5 ? '¡A la cesta!' : got < need ? '¡Ya pesa la cesta!' : ''; if (got >= need) F.close(res, { win: true }, '¡Cesta llena! Buena cosecha'); }
      else { bad++; ui.sound.ui?.('error'); F.fb.textContent = kind === 'uva' ? 'Ese racimo está verde: déjalo madurar' : 'Ese aún no está para coger'; }
    };
    F.cv.addEventListener('pointerdown', e => pick(F.at(e)));
    F.keys(() => {});
    F.loop((dt) => {
      t += dt; spawnT -= dt; if (spawnT <= 0) { spawnT = 0.45; if (items.length < 9) spawn(); }
      for (const i of items) i.age += dt; items = items.filter(i => i.age < i.life);
      const left = seconds - t; F.clock.textContent = Math.max(0, left).toFixed(1) + ' s';
      if (left <= 0) F.close(res, { win: got >= need }, got >= need ? '¡Cesta llena!' : `Se acabó: ${got} de ${need}. ¡Más rápido la próxima vez!`);
      g.drawImage(BG, 0, 0);
      for (const y of rows) drawRow(g, y, kind);
      for (const i of items) { const a = Math.min(1, i.age * 4, (i.life - i.age) * 3); g.globalAlpha = a; drawCrop(g, kind, i.x, i.y, i.ripe); g.globalAlpha = 1; }
      g.fillStyle = 'rgba(16,10,30,0.72)'; g.beginPath(); g.roundRect?.(6, 12, 150, 30, 10); if (!g.roundRect) g.rect(6, 12, 150, 30); g.fill();
      g.fillStyle = '#fff'; g.font = '800 17px Nunito, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(`Cesta: ${got} / ${need}`, 16, 28);
    }, res);
  });
}

// ---------- La forja del herrero ----------
export function forgeGame(ui, { title = 'En la fragua', icon = 'anvil', need = 6, seconds = 30 } = {}) {
  return auto() || new Promise(res => {
    const F = frame(ui, { title, icon, hint: 'Sopla con el fuelle hasta que el hierro esté al rojo vivo (naranja) y entonces golpéalo en el yunque. Frío no se deja trabajar; si lo dejas blanco, se quema.',
      buttons: '<button class="btn big" data-a="fuelle">Fuelle</button><button class="btn primary big" data-a="golpe">Golpear</button>' });
    const { g } = F, BG = forgeBG(); let heat = 0.15, hits = 0, t = 0, burnt = 0, flash = 0, stun = 0, blowT = 0; const sparks = [];
    const blow = () => { heat = Math.min(1.15, heat + 0.07); blowT = 1; ui.sound.noiseBurst?.(0.12, 400, 0.7, 0.12, ui.sound.sfx); };
    const strike = () => {
      if (stun > 0) return;
      // en frío el martillo rebota y te duele la muñeca: un momento sin poder golpear
      if (heat < 0.55) { stun = 0.7; F.fb.textContent = 'El martillo rebota: en frío no se deja. Aviva el fuego con el fuelle'; ui.sound.tone?.(140, 0.08, 'square', 0.1, ui.sound.sfx); return; }
      if (heat > 0.95) { burnt++; heat = 0.4; F.fb.textContent = '¡Demasiado caliente! El hierro se ha quemado un poco'; ui.sound.ui?.('error'); return; }
      hits++; heat -= 0.22; flash = 1; ui.onMiniHit?.(true);
      for (let k = 0; k < 16; k++) sparks.push({ x: 300 + (Math.random() - 0.5) * 30, y: 176, vx: (Math.random() - 0.5) * 260, vy: -80 - Math.random() * 180, l: 1 }); ui.sound.tone?.(900, 0.07, 'square', 0.14, ui.sound.sfx); ui.sound.noiseBurst?.(0.06, 3200, 1.4, 0.3, ui.sound.sfx);
      F.fb.textContent = hits < need ? `¡Bien! Golpe ${hits} de ${need}` : '';
      if (hits >= need) F.close(res, { win: true }, '¡Herradura terminada! Al agua: ¡ssshhh!');
    };
    F.o.querySelectorAll('[data-a]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); b.dataset.a === 'fuelle' ? blow() : strike(); }));
    F.o.state = () => ({ heat, stun, hits, burnt });   // para las pruebas
    F.keys((e) => { const k = e.key.toLowerCase(); if (['f', 'a', 'arrowleft'].includes(k)) blow(); if ([' ', 'enter', 'e', 'd', 'arrowright'].includes(k)) { e.preventDefault(); strike(); } });
    F.loop((dt) => {
      t += dt; heat = Math.max(0, heat - dt * 0.07); flash = Math.max(0, flash - dt * 4); stun = Math.max(0, stun - dt);
      const left = seconds - t; F.clock.textContent = Math.max(0, left).toFixed(1) + ' s';
      if (left <= 0) F.close(res, { win: hits >= need }, hits >= need ? '¡Terminada!' : `Se acabó: ${hits} de ${need} golpes buenos`);
      blowT = Math.max(0, blowT - dt * 4);
      for (const p of sparks) { p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt * 1.6; }
      for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].l <= 0) sparks.splice(i, 1);
      drawForge(g, BG, { heat, hits, need, flash, sparks, blowT, t });
    }, res);
  });
}

// ---------- Coser (alpargatas, ropa) ----------
export function stitchGame(ui, { title = 'Coser la alpargata', icon = 'espadrille', n = 14, seconds = 25, hint } = {}) {
  return auto() || new Promise(res => {
    const F = frame(ui, { title, icon, hint: hint || 'Da las puntadas una tras otra siguiendo el borde de la suela: toca el punto que brilla. Puntadas fuertes y en orden para que no se deshaga.' });
    const { g } = F, BG = stitchBG(), pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 - Math.PI / 2; pts.push({ x: 240 + Math.cos(a) * 80 * (1 + 0.15 * Math.sin(a)), y: 180 + Math.sin(a) * 140 }); }
    let k = 0, t = 0, miss = 0;
    const tap = (p) => {
      const d = Math.hypot(pts[k].x - p.x, pts[k].y - p.y);
      if (d < 26) { k++; blip(ui, 500 + k * 25); ui.onMiniHit?.(true); F.fb.textContent = k < n ? `Puntada ${k} de ${n}` : ''; if (k >= n) F.close(res, { win: true }, '¡Suela cosida! A andar con ellas'); }
      else if (pts.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 26)) { miss++; ui.sound.ui?.('error'); F.fb.textContent = 'En orden: la puntada que brilla'; }
    };
    F.cv.addEventListener('pointerdown', e => tap(F.at(e)));
    F.keys((e) => { if ([' ', 'enter', 'e'].includes(e.key.toLowerCase())) { e.preventDefault(); tap(pts[k]); } });
    F.loop((dt) => {
      t += dt; const left = seconds - t; F.clock.textContent = Math.max(0, left).toFixed(1) + ' s';
      if (left <= 0) F.close(res, { win: false }, `Se acabó: ${k} de ${n} puntadas`);
      drawStitch(g, BG, { pts, k, t });
    }, res);
  });
}
