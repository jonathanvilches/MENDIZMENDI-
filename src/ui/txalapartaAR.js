// La txalaparta con la cámara (realidad aumentada): la cámara de delante a pantalla completa, como un espejo, y encima las
// dos tablas de la txalaparta; en cada mano, una makila. Se toca bajando las manos de golpe sobre las tablas: la grave a
// la izquierda y la aguda a la derecha. Joxe lleva el ttakun (el acompañamiento) y las notas del herrena caen hacia la
// tabla que toca, como en el minijuego de siempre (ui/instrumentos.js), con el mismo reloj y la misma puntuación.
// Las manos las sigue MediaPipe (Hand Landmarker de Google, licencia Apache 2.0: public/ar), en el propio aparato: la
// imagen de la cámara no sale de él. Las makilas de verdad no se reconocen (no hay un modelo para eso): se sigue la mano
// que las sujeta. Sin cámara o sin permiso, se toca tocando las tablas en la pantalla.
import { notasDe } from '../data/instrumentos.js';
import { tocarNota, acompanar } from '../audio/instrumentos.js';
import { tr, isEU } from '../i18n.js';
import { esc, el } from '../util/html.js';

/** ¿Se puede tocar con la cámara aquí? Solo en la web (los archivos del modelo van en public/ar; en los archivos únicos
 *  no caben) y con cámara. */
export const camaraDisponible = () => ((typeof __WEB__ !== 'undefined' && __WEB__) || import.meta.env.DEV) && !!navigator.mediaDevices?.getUserMedia;

const RUTA = (f) => new URL((import.meta.env.BASE_URL || './') + 'ar/' + f, location.href).href;
// (el detector de manos: con la tarjeta gráfica si se puede y, si no, con el procesador)
async function detector() {
  const V = await import('@mediapipe/tasks-vision');
  const fs = await V.FilesetResolver.forVisionTasks(RUTA('wasm'));
  const op = (delegate) => ({ baseOptions: { modelAssetPath: RUTA('hand_landmarker.task'), delegate }, runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
  try { return await V.HandLandmarker.createFromOptions(fs, op('GPU')); } catch (e) { return V.HandLandmarker.createFromOptions(fs, op('CPU')); }
}

const CSS = `
.arx{position:fixed;inset:0;z-index:30020;background:#07020f;color:#fff;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;font-family:'MZ Texto',sans-serif}
.arx video,.arx canvas{position:absolute;inset:0;width:100%;height:100%}
.arx video{object-fit:cover;transform:scaleX(-1);filter:saturate(.9) brightness(.82)}
.arx-top{position:absolute;left:0;right:0;top:0;z-index:2;display:flex;align-items:center;gap:12px;padding:calc(env(safe-area-inset-top,0px) + 12px) calc(env(safe-area-inset-right,0px) + 72px) 12px calc(env(safe-area-inset-left,0px) + 16px);background:linear-gradient(180deg,rgba(7,2,15,.7),rgba(7,2,15,0))}
.arx-top b{font:400 var(--fs-xl)/1 var(--f-display,'MZ Display'),sans-serif;text-transform:uppercase;letter-spacing:.02em}
.arx-top small{display:block;margin-top:4px;font:700 var(--fs-xs)/1.2 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#ffb1e3}
.arx-sc{margin-left:auto;font:400 var(--fs-xl)/1 var(--f-display,'MZ Display'),sans-serif;white-space:nowrap}
.arx-x{position:absolute;z-index:3;top:calc(env(safe-area-inset-top,0px) + 10px);right:calc(env(safe-area-inset-right,0px) + 12px);width:48px;height:48px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:rgba(20,8,40,.6);color:#fff;font:700 20px/1 sans-serif;cursor:pointer}
.arx-msg{position:absolute;z-index:2;left:50%;top:42%;transform:translate(-50%,-50%);max-width:min(560px,86vw);padding:14px 22px;border-radius:18px;background:rgba(20,8,40,.72);border:1px solid rgba(201,178,255,.3);text-align:center;font:700 var(--fs-md)/1.35 'MZ Texto',sans-serif;pointer-events:none}
.arx-msg:empty{display:none}.arx-msg.ok{color:#7dffa8}.arx-msg.bad{color:#ffb1b1}
`;
let cssPuesto = false;

/** El minijuego: devuelve { win, hits, total } o { quit }. */
export function tocarConCamara(ui, x) {
  if (!cssPuesto) { cssPuesto = true; document.head.appendChild(el(`<style>${CSS}</style>`)); }
  return new Promise(res => {
    const S = ui.sound, g = x.game, notas = notasDe(x), total = notas.length, eighth = 60 / g.bpm / 2, bar = eighth * 2 * g.meter, fall = 2.3;
    const eu = isEU();
    ui.closeModal?.();
    const o = el(`<div class="arx" role="dialog" aria-label="${esc(x.name)}"><video playsinline muted></video><canvas></canvas>
      <div class="arx-top"><div><b>${esc(eu ? `${x.eushort} kamerarekin` : `${x.name} con la cámara`)}</b><small>${esc(tr('Baja las manos de golpe sobre las tablas'))}</small></div><span class="arx-sc"><span>0</span>/${total}</span></div>
      <div class="arx-msg">${esc(tr('Pidiendo la cámara…'))}</div><button type="button" class="arx-x" aria-label="${esc(tr('Salir'))}">✕</button></div>`);
    document.body.appendChild(o); ui.modal = o;
    const video = o.querySelector('video'), cv = o.querySelector('canvas'), c = cv.getContext('2d'), msg = o.querySelector('.arx-msg'), sc = o.querySelector('.arx-sc span');
    const di = (t, cls = '') => { msg.textContent = t; msg.className = 'arx-msg' + (cls ? ' ' + cls : ''); };
    // el reloj del sonido, como en el minijuego de siempre (si el navegador lo tiene parado, el de la página)
    if (S?.ctx?.state === 'suspended') S.ctx.resume?.().catch?.(() => { });
    const p0 = performance.now() / 1000, a0 = S?.ctx ? S.ctx.currentTime : 0; let audioOk = !!S?.ctx;
    const clock = () => { const p = performance.now() / 1000 - p0; if (audioOk) { if (p > 1 && S.ctx.currentTime - a0 < p * 0.5) audioOk = false; else return S.ctx.currentTime; } return a0 + p; };
    const wasMusic = S?.musicOn; S?.setMusic?.(false);
    let W = 0, H = 0, dpr = 1, over = false, raf = 0, stream = null, hl = null, t0 = 0, nextBar = -2, hits = 0, ultimoVideo = -1, sinManos = 0;
    const notes = [], bars = Math.ceil((notas.at(-1).i + 1) / (g.meter * 2));
    const mide = () => { dpr = Math.min(2, devicePixelRatio || 1); W = o.clientWidth; H = o.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); };
    mide(); addEventListener('resize', mide);
    // las tablas: dos tablones a lo ancho, a dos tercios de la pantalla; la grave a la izquierda y la aguda a la derecha
    const tabla = (i) => { const y = H * 0.7, m = W * 0.06, gap = W * 0.04, w = (W - 2 * m - gap) / 2; return { x: m + i * (w + gap), y, w, h: Math.max(26, H * 0.07) }; };
    const brillo = [0, 0];
    const press = (i) => {
      if (over || t0 === 0) return;
      const now = clock(); brillo[i] = 1;
      tocarNota(S, x, i, null, eighth * 1.8);
      let best = null, bd = 1; for (const nn of notes) if (!nn.done && nn.lane === i) { const d = Math.abs(now - nn.t); if (d < bd) { bd = d; best = nn; } }
      if (best && bd < 0.3) { best.done = true; best.hit = now; hits++; sc.textContent = hits; di(bd < 0.12 ? tr('¡Perfecto!') : tr('¡Bien!'), 'ok'); }
      else di(tr('¡Uy!'), 'bad');
      clearTimeout(press.t); press.t = setTimeout(() => { if (!over && msg.classList.length > 1) di(''); }, 500);
    };
    // las makilas: cada mano, la suya; la punta es lo que golpea. Se arma por encima de la tabla y golpea al cruzarla
    // bajando deprisa
    const manos = [];
    const sigue = (lms) => {
      const vw = video.videoWidth, vh = video.videoHeight; if (!vw) return;
      const k = Math.max(W / vw, H / vh), dw = vw * k, dh = vh * k, ox = (W - dw) / 2, oy = (H - dh) / 2;
      const P = (l) => ({ x: W - (ox + l.x * dw), y: oy + l.y * dh });   // (la imagen va de espejo)
      const vistas = lms.map(l => {
        const pu = [0, 5, 9, 13, 17].map(j => P(l[j])), cx = pu.reduce((a, q) => a + q.x, 0) / 5, cy = pu.reduce((a, q) => a + q.y, 0) / 5;
        // (la makila sale del puño hacia abajo, algo inclinada según gira la mano)
        const a = P(l[5]), b = P(l[17]), dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, L = H * 0.2;
        let nx = -dy / d, ny = dx / d; if (ny < 0) { nx = -nx; ny = -ny; }
        ny = Math.max(ny, 0.75); const nn = Math.hypot(nx, ny); nx /= nn; ny /= nn;
        return { cx, cy, tx: cx + nx * L, ty: cy + ny * L };
      });
      // (cada mano vista, con la más cercana de la imagen anterior: así cada una lleva su velocidad)
      const prev = manos.splice(0);
      for (const v of vistas) {
        let m = null, md = 1e9; for (const q of prev) { const dd = Math.hypot(q.tx - v.tx, q.ty - v.ty); if (dd < md) { md = dd; m = q; } }
        const arm = m ? m.arm : false, vy = m ? v.ty - m.ty : 0;
        const nueva = { ...v, arm, vy };
        for (let i = 0; i < 2; i++) {
          const T = tabla(i), dentro = v.tx > T.x - W * 0.02 && v.tx < T.x + T.w + W * 0.02;
          if (v.ty < T.y - H * 0.05) nueva.arm = true;
          else if (dentro && nueva.arm && m && m.ty < T.y && v.ty >= T.y && vy > H * 0.012) { nueva.arm = false; press(i); }
        }
        manos.push(nueva);
      }
    };
    const pinta = (now) => {
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      // las tablas, de madera, con su sombra; se encienden al golpearlas
      for (let i = 0; i < 2; i++) {
        const T = tabla(i), gr = c.createLinearGradient(0, T.y, 0, T.y + T.h); gr.addColorStop(0, i ? '#c98f55' : '#a8703c'); gr.addColorStop(1, i ? '#8a5a2e' : '#6e4422');
        c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(T.x + 6, T.y + T.h, T.w - 12, 10);
        c.fillStyle = gr; c.fillRect(T.x, T.y, T.w, T.h);
        c.strokeStyle = 'rgba(60,30,10,.35)'; c.lineWidth = 2; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(T.x, T.y + T.h * k / 4); c.bezierCurveTo(T.x + T.w * 0.3, T.y + T.h * k / 4 - 3, T.x + T.w * 0.7, T.y + T.h * k / 4 + 3, T.x + T.w, T.y + T.h * k / 4); c.stroke(); }
        if (brillo[i] > 0) { c.fillStyle = `rgba(255,224,138,${brillo[i] * 0.55})`; c.fillRect(T.x, T.y, T.w, T.h); brillo[i] = Math.max(0, brillo[i] - 0.08); }
        c.fillStyle = 'rgba(255,255,255,.85)'; c.font = `700 ${Math.round(Math.max(13, H * 0.028))}px 'MZ Texto',sans-serif`; c.textAlign = 'center';
        c.fillText(g.lanes[i], T.x + T.w / 2, T.y + T.h + Math.max(26, H * 0.05));
      }
      // las notas: caen hacia su tabla y llegan a ella en su momento
      for (const nn of notes) {
        const k = 1 - (nn.t - now) / fall; if (k < 0 || (nn.done && !nn.hit && now - nn.t > 0.5) || (nn.hit && now - nn.hit > 0.35)) continue;
        const T = tabla(nn.lane), x0 = T.x + T.w / 2, y = Math.min(1, k) * T.y, r = Math.max(14, H * 0.03);
        c.globalAlpha = nn.hit ? 1 - (now - nn.hit) / 0.35 : nn.done ? 0.35 : 1;
        c.beginPath(); c.arc(x0, y, r * (nn.hit ? 1.4 : 1), 0, Math.PI * 2); c.fillStyle = nn.hit ? '#7dffa8' : Math.abs(nn.t - now) < 0.3 ? '#ffe08a' : '#ff7ac8'; c.fill();
        c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.8)'; c.stroke(); c.globalAlpha = 1;
      }
      // las makilas
      for (const m of manos) {
        c.lineCap = 'round'; c.strokeStyle = '#d8b07a'; c.lineWidth = Math.max(10, W * 0.012); c.beginPath(); c.moveTo(m.cx, m.cy); c.lineTo(m.tx, m.ty); c.stroke();
        c.strokeStyle = 'rgba(80,45,15,.6)'; c.lineWidth = 3; c.beginPath(); c.moveTo(m.cx, m.cy); c.lineTo(m.tx, m.ty); c.stroke();
        c.beginPath(); c.arc(m.tx, m.ty, Math.max(8, W * 0.009), 0, Math.PI * 2); c.fillStyle = m.arm ? '#ffe08a' : '#a8703c'; c.fill();
      }
    };
    const tick = () => {
      if (over) return;
      raf = requestAnimationFrame(tick);
      const now = clock();
      if (hl && video.readyState >= 2 && video.currentTime !== ultimoVideo) {
        ultimoVideo = video.currentTime;
        try { const r = hl.detectForVideo(video, performance.now()); sigue(r.landmarks || []); sinManos = r.landmarks?.length ? 0 : sinManos + 1; } catch (e) { /* (un fotograma que no se pudo leer) */ }
      }
      if (t0) {
        while (nextBar < bars && t0 + nextBar * bar < now + 0.6) { acompanar(S, x, Math.max(0, nextBar), t0 + nextBar * bar, eighth); nextBar++; }
        if (now < t0) di(now < t0 - bar ? tr('¡Prepárate!') : String(g.meter - Math.floor((t0 - now) / (eighth * 2)) % g.meter));
        else if (msg.textContent && !msg.classList.contains('ok') && !msg.classList.contains('bad')) di(hl && sinManos > 45 ? tr('No veo tus manos: apártate un poco de la cámara') : '');
        for (const nn of notes) if (!nn.done && now - nn.t > 0.3) nn.done = true;
        if (now > notes[notes.length - 1].t + 1.2) { di(hits >= Math.ceil(total * 0.6) ? tr('¡Bravo!') : tr('Casi…'), 'ok'); setTimeout(() => end(false), 900); over = true; }
      }
      pinta(now);
    };
    const empieza = () => { if (t0 || over) return; t0 = clock() + bar * 2 + 0.3; for (const nn of notas) notes.push({ lane: nn.lane, t: t0 + nn.i * eighth, done: false }); };
    const end = (quit = false) => {
      over = true; cancelAnimationFrame(raf); removeEventListener('resize', mide); removeEventListener('keydown', key, true);
      try { stream?.getTracks().forEach(t => t.stop()); } catch (e) { }
      try { hl?.close(); } catch (e) { }
      S?.setMusic?.(wasMusic); delete window.__txalapartaAR;
      o.remove(); if (ui.modal === o) ui.modal = null;
      res(quit ? { quit: true, hits, total } : { win: hits >= Math.ceil(total * 0.6), hits, total });
    };
    // (sin cámara: tocando las tablas en la pantalla; y con el teclado, A y L)
    o.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.arx-x')) return;
      for (let i = 0; i < 2; i++) { const T = tabla(i); if (e.clientX >= T.x && e.clientX <= T.x + T.w && e.clientY >= T.y - H * 0.12 && e.clientY <= T.y + T.h + H * 0.12) { e.preventDefault(); press(i); } }
    });
    const key = (e) => { const k = e.key.toLowerCase(); if (k === 'escape') { e.preventDefault(); e.stopImmediatePropagation(); end(true); return; }
      const i = { a: 0, s: 0, arrowleft: 0, l: 1, k: 1, arrowright: 1 }[k]; if (i != null) { e.preventDefault(); e.stopImmediatePropagation(); press(i); } };
    addEventListener('keydown', key, true);
    o.querySelector('.arx-x').addEventListener('click', () => end(true));
    window.__txalapartaAR = { golpe: press, notas: () => { const now = clock(); return notes.filter(nn => !nn.done).map(nn => ({ lane: nn.lane, dt: nn.t - now })); }, estado: () => ({ camara: !!stream, manos: !!hl, empezado: !!t0, over }) };
    raf = requestAnimationFrame(tick);
    // la cámara de delante y luego el detector de manos; si algo falla, se toca en la pantalla
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (over) { stream.getTracks().forEach(t => t.stop()); return; }
        video.srcObject = stream; await video.play().catch(() => { });
        di(tr('Preparando la detección de manos…'));
        hl = await detector(); if (over) { hl.close(); return; }
        di(tr('Levanta las manos con las makilas y bájalas de golpe sobre las tablas'));
        setTimeout(empieza, 2200);
      } catch (e) {
        console.warn('txalaparta con la cámara', e);
        di(tr('Sin cámara: toca las tablas en la pantalla'));
        video.remove(); setTimeout(empieza, 1800);
      }
    })();
  });
}
