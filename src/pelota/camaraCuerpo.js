// La pelota en casa, con la cámara: juegas de pie delante de la pantalla y tu pelotari hace lo que haces tú. La cámara de
// delante te mira y MediaPipe (Pose Landmarker de Google, licencia Apache 2.0: public/ar) sigue tu cuerpo en el propio
// aparato; la imagen no sale de él. De lo que hace el cuerpo se saca:
//  - dónde estás: si te mueves a un lado, tu pelotari se mueve a ese lado de la cancha (y, cuando te toca, apuntas hacia ahí);
//  - el armado: con el brazo atrás (hacia fuera, arriba o detrás del cuerpo), tu pelotari arma el brazo como tú;
//  - el golpe: la mano que va deprisa hacia delante; cuanto más deprisa, más fuerte. Con la derecha o con la izquierda, y
//    alta (de aire), a media altura o baja (sotamano), como la tuya.
// Moverse hasta la pelota lo hace solo el pelotari cuando te toca: tú das el golpe en su momento.
// Juego propio del juego (ni marca ni diseño de ninguna consola). Lo usa pelota/match.js (opción camara).
import { motorVision, rutaAR } from '../ui/camaraAR.js';
import { isEU } from '../i18n.js';

const T = (es, eu) => (isEU() ? eu : es);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// la velocidad de la mano para que cuente como golpe, en anchos de hombros por segundo (un brazo que se mueve tranquilo va
// a 1 o 2; un golpe de verdad, a 6 o más)
const V_MIN = 4.2;
// los huesos que se dibujan en la ventana de la cámara
const HUESOS = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];

// (el detector del cuerpo: con la tarjeta gráfica si se puede y, si no, con el procesador)
async function detector() {
  const { V, fs } = await motorVision();
  const op = (delegate) => ({ baseOptions: { modelAssetPath: rutaAR('pose_landmarker_lite.task'), delegate }, runningMode: 'VIDEO', numPoses: 1,
    minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
  try { return await V.PoseLandmarker.createFromOptions(fs, op('GPU')); } catch (e) { return V.PoseLandmarker.createFromOptions(fs, op('CPU')); }
}

const CSS = `
.pcam{position:absolute;left:calc(env(safe-area-inset-left,0px) + 14px);top:calc(env(safe-area-inset-top,0px) + 14px);z-index:3;width:clamp(150px,22vw,300px);aspect-ratio:4/3;border-radius:16px;overflow:hidden;background:#0d0620;border:2px solid rgba(255,255,255,.55);box-shadow:0 8px 24px rgba(0,0,0,.35);pointer-events:auto;cursor:pointer;transition:opacity .3s,border-color .2s}
.pcam video,.pcam canvas{position:absolute;inset:0;width:100%;height:100%}
.pcam video{object-fit:cover;transform:scaleX(-1);filter:saturate(.85) brightness(.85)}
.pcam.sin-video video{opacity:0}
.pcam.visto{border-color:#ffd166}
.pcam.fuera{opacity:0;pointer-events:none}
.pcam-msg{position:absolute;left:6px;right:6px;bottom:6px;padding:6px 8px;border-radius:10px;background:rgba(13,6,32,.78);font:700 12px/1.25 var(--pel-font,'MZ Texto'),sans-serif;text-align:center;color:#fff}
.pcam-msg:empty{display:none}
.pel-root.con-camara .pel-stick,.pel-root.con-camara .pel-stickhint{display:none}
@media (max-height:480px){.pcam{width:clamp(130px,24vw,220px)}.pcam-msg{font-size:11px}}
`;
let cssPuesto = false;

// cada mano: dónde está (suavizado), a qué velocidad va, cuánto está armada y cuándo golpeó por última vez
const mano = () => ({ x: 0, y: 0, vx: 0, vy: 0, v: 0, wind: 0, windMax: 0, ok: false, ult: -9, pico: 0, picoHasta: 0, rastro: [] });

export class CamaraCuerpo {
  /** host: donde va la ventana de la cámara (el marcador del partido). onGolpe({ power, golpe, aimX, t }) al golpear */
  constructor(host) {
    this.host = host;
    this.x = 0; this.wind = 0; this.arma = 'Hit'; this.visto = false; this.listo = false; this.fallo = false; this.parado = false;
    this.onGolpe = null; this.golpes = 0;
    this.M = { 15: mano(), 16: mano() };
    this.sw = 0; this.cx = 0; this.x0 = null; this.cal = []; this.tVisto = -9; this.tPrev = 0; this.lms = null; this.vw = 640; this.vh = 480;
    if (!cssPuesto) { cssPuesto = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
    const o = this.box = document.createElement('div'); o.className = 'pcam';
    o.title = T('Tocar para ver u ocultar tu imagen', 'Ukitu zure irudia ikusi edo ezkutatzeko');
    o.innerHTML = '<video playsinline muted></video><canvas></canvas><div class="pcam-msg"></div>';
    host.appendChild(o);
    this.video = o.querySelector('video'); this.cv = o.querySelector('canvas'); this.c = this.cv.getContext('2d'); this.msg = o.querySelector('.pcam-msg');
    o.addEventListener('pointerdown', (e) => { e.stopPropagation(); o.classList.toggle('sin-video'); });
    this.di(T('Pidiendo la cámara…', 'Kamera eskatzen…'));
    // (para las pruebas: el estado y un cuerpo de mentira; con él, la cámara deja de mandar)
    window.__camaraCuerpo = { estado: () => this.estado(), pose: (lms, t) => { this.manual = true; this.sigue(lms, t ?? performance.now() / 1000); } };
  }
  di(t) { if (this.msg.textContent !== t) this.msg.textContent = t; }
  estado() { const m = (k) => ({ v: +this.M[k].v.toFixed(1), wind: +this.M[k].wind.toFixed(2), ok: this.M[k].ok }); return { listo: this.listo, fallo: this.fallo, visto: this.visto, vistos: this.vistos || 0, imagenes: this.imagenes || 0, x: +this.x.toFixed(2), wind: +this.wind.toFixed(2), arma: this.arma, golpes: this.golpes, d: m(16), i: m(15), msg: this.msg.textContent }; }

  /** La cámara de delante y el detector; si algo falla, se juega con los botones de siempre */
  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (this.parado) { this.stream.getTracks().forEach(t => t.stop()); return; }
      this.video.srcObject = this.stream; await this.video.play().catch(() => { });
      this.di(T('Preparando…', 'Prestatzen…'));
      this.pl = await detector(); if (this.parado) { this.pl.close(); return; }
      this.listo = true; this.di(T('Ponte delante: que se te vea de cintura para arriba', 'Jarri aurrean, gerritik gora ikusteko moduan'));
      this.bucle();
    } catch (e) {
      console.warn('pelota con la cámara', e);
      this.fallo = true; this.video.remove(); this.di(T('Sin cámara: juega con los botones', 'Kamerarik gabe: jokatu botoiekin'));
      setTimeout(() => this.box.classList.add('fuera'), 4000);
    }
  }
  // (cada imagen nueva de la cámara, una vez: con requestVideoFrameCallback si lo hay y, si no, en cada vuelta de pantalla)
  bucle() {
    const v = this.video, uno = () => {
      if (this.parado) return;
      if (!this.manual && v.readyState >= 2 && v.currentTime !== this.ultV) {
        this.ultV = v.currentTime;
        try { const r = this.pl.detectForVideo(v, performance.now()); this.vw = v.videoWidth || 640; this.vh = v.videoHeight || 480; this.imagenes = (this.imagenes || 0) + 1; if (r.landmarks?.[0]) this.vistos = (this.vistos || 0) + 1; this.sigue(r.landmarks?.[0] || null, performance.now() / 1000); }
        catch (e) { /* (una imagen que no se pudo leer) */ }
      }
      pide();
    };
    const pide = () => { if (this.parado) return; if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(uno); else this.raf = requestAnimationFrame(uno); };
    pide();
  }

  /** Lo que hace el cuerpo en esta imagen: lms, los 33 puntos de MediaPipe (x, y de 0 a 1 en la imagen sin espejo) */
  sigue(lms, t) {
    const dt = clamp(t - (this.tPrev || t - 1 / 30), 1 / 90, 0.2); this.tPrev = t; this.lms = lms;
    const vis = (i) => lms && lms[i] && (lms[i].visibility ?? 1) > 0.5;
    // (en píxeles de la imagen y de espejo, como se ve en la ventana: tu derecha, a la derecha)
    const P = (i) => ({ x: (1 - lms[i].x) * this.vw, y: lms[i].y * this.vh, z: (lms[i].z || 0) * this.vw });
    if (!lms || !vis(11) || !vis(12)) {
      if (t - this.tVisto > 0.6) { this.visto = false; this.wind *= 0.8; if (this.listo) this.di(T('No te veo: ponte delante de la cámara', 'Ez zaitut ikusten: jarri kameraren aurrean')); }
      this.box.classList.toggle('visto', this.visto); this.pinta(t); return;
    }
    const s11 = P(11), s12 = P(12), swNow = Math.hypot(s11.x - s12.x, s11.y - s12.y);
    if (swNow < 8) { this.pinta(t); return; }
    this.sw = this.sw ? this.sw + (swNow - this.sw) * 0.15 : swNow;
    const sw = this.sw, cs = { x: (s11.x + s12.x) / 2, y: (s11.y + s12.y) / 2 };
    const caderas = vis(23) && vis(24) ? { x: (P(23).x + P(24).x) / 2, y: (P(23).y + P(24).y) / 2 } : null;
    const cx = caderas ? cs.x * 0.6 + caderas.x * 0.4 : cs.x, hipY = caderas ? caderas.y : cs.y + sw * 1.5;
    this.cx = this.cx ? this.cx + (cx - this.cx) * 0.35 : cx;
    if (!this.visto) { this.cal = []; this.x0 = null; }
    this.visto = true; this.tVisto = t; this.box.classList.add('visto');
    // dónde estás: el centro, el sitio donde te quedas quieto el primer segundo (con la cámara algo torcida, también vale)
    if (this.x0 == null) { this.cal.push(this.cx); if (this.cal.length >= 12) { const a = this.cal.slice().sort((p, q) => p - q); this.x0 = clamp(a[a.length >> 1], this.vw * 0.3, this.vw * 0.7); } }
    const x0 = this.x0 ?? this.vw / 2, off = (this.cx - x0) / (sw * 1.3), dz = Math.abs(off) < 0.12 ? 0 : off - Math.sign(off) * 0.12;
    this.x = clamp(dz / 0.88, -1, 1);
    // cada mano: lo armada que está y si golpea
    let mejor = null;
    for (const k of [15, 16]) {
      const h = this.M[k], S = k === 15 ? s11 : s12, E = P(k - 2);
      if (!vis(k)) { h.ok = false; h.wind *= 0.85; h.windMax = Math.max(0, h.windMax - dt * 1.2); continue; }
      const W = P(k), lado = Math.sign(S.x - cs.x) || (k === 16 ? 1 : -1);
      // (la mano, respecto al centro de los hombros: así un paso a un lado no es un golpe)
      const rx = W.x - cs.x, ry = W.y - cs.y;
      if (!h.ok) { h.rx = rx; h.ry = ry; h.vx = h.vy = 0; }
      // (suavizado según el tiempo entre imágenes: con una cámara o un aparato lentos, un golpe rápido cae entre dos
      // imágenes y no se puede suavizar como a 30 imágenes por segundo, o no llegaría a contar)
      const aP = 1 - Math.exp(-dt / 0.02), aV = 1 - Math.exp(-dt / 0.03);
      const nx = h.rx + (rx - h.rx) * aP, ny = h.ry + (ry - h.ry) * aP;
      const vx = (nx - h.rx) / dt / sw, vy = (ny - h.ry) / dt / sw;
      h.vx += (vx - h.vx) * aV; h.vy += (vy - h.vy) * aV; h.rx = nx; h.ry = ny; h.x = cs.x + nx; h.y = cs.y + ny; h.ok = true;
      h.v = Math.hypot(h.vx, h.vy);
      // (el armado: la mano hacia fuera del hombro, por encima de él o por detrás del cuerpo; el codo hacia fuera ayuda)
      const out = (h.x - S.x) * lado / sw, up = (S.y - h.y) / sw, atras = vis(k - 2) ? (W.z - S.z) / sw : 0, codo = vis(k - 2) ? (E.x - S.x) * lado / sw : 0;
      const w = Math.max(clamp((out - 0.25) / 0.55, 0, 1), clamp((up - 0.15) / 0.5, 0, 1), clamp((atras - 0.35) / 0.6, 0, 1) * 0.8, clamp((codo - 0.35) / 0.4, 0, 1) * 0.7);
      h.wind += (w - h.wind) * 0.35; h.windMax = Math.max(h.wind, h.windMax - dt * 1.2);
      h.rastro.push({ x: h.x, y: h.y, rx: h.rx, ry: h.ry, t }); while (h.rastro.length && t - h.rastro[0].t > 0.35) h.rastro.shift();
      if (!mejor || h.wind > mejor.h.wind) mejor = { h, k, up, lado };
      // el golpe: la mano va deprisa y no hacia fuera (eso es armar). Hacia abajo, el de aire; hacia arriba solo cuenta si
      // va también hacia dentro, el sotamano (subir el brazo por el lado es armar el de aire); de lado, hacia dentro
      const vOut = h.vx * lado, vert = h.vy / (h.v || 1);
      const haciaDelante = vert > 0.6 ? vOut < 0.25 * h.v : vert < -0.6 ? vOut < -0.35 * h.v : vOut < 0;
      const umbral = V_MIN * (h.windMax > 0.3 ? 1 : 1.3) * (vert < -0.6 ? 1.15 : 1);
      const k01 = (v) => clamp((v - 3.5) / 7, 0, 1);
      if (t < h.picoHasta && h.v > h.pico) { h.pico = h.v; this.picoPow = Math.max(this.picoPow, 0.25 + 0.75 * k01(h.v)); }
      if (h.v > umbral && haciaDelante && t - h.ult > 0.45 && t - (this.ultGolpe || -9) > 0.35) {
        h.ult = t; this.ultGolpe = t; h.pico = h.v; h.picoHasta = t + 0.15; h.windMax = 0;
        // (de qué lado y a qué altura, por donde empezó el gesto: el de aire empieza arriba y baja, el sotamano empieza abajo)
        const r0 = h.rastro.find(r => t - r.t <= 0.25) || h, up0 = (S.y - cs.y - r0.ry) / sw;
        const alto = up0 > 0.45 ? 'High' : r0.ry > hipY - cs.y - sw * 0.15 ? 'Low' : 'Hit', golpe = alto + (r0.rx > 0 ? '' : 'L');
        const power = this.picoPow = 0.25 + 0.75 * k01(h.v);
        this.golpes++; this.flash = { k, t };
        try { this.onGolpe?.({ power, golpe, aimX: this.x, t }); } catch (e) { console.warn('golpe con la cámara', e); }
      }
    }
    // tu pelotari arma como tú: lo de la mano más armada, de su lado y a su altura
    this.wind = mejor ? mejor.h.wind : this.wind * 0.85;
    if (mejor && mejor.h.wind > 0.2) this.arma = (mejor.up > 0.45 ? 'High' : mejor.h.y > hipY - sw * 0.15 ? 'Low' : 'Hit') + (mejor.h.x > cs.x ? '' : 'L');
    if (this.listo) this.di(this.x0 == null ? T('Te veo. Quieto un momento…', 'Ikusten zaitut. Geldi une batez…') : this.golpes ? '' : T('Muévete a los lados. Cuando venga la pelota, brazo atrás y ¡golpea!', 'Mugitu alboetara. Pilota datorrenean, besoa atzera eta jo!'));
    this.pinta(t);
  }

  // la ventana: tu imagen de espejo con tu esqueleto encima; la mano armada en amarillo, el golpe con su estela y, abajo,
  // dónde estás respecto al centro
  pinta(t) {
    const o = this.box, cv = this.cv, c = this.c, dpr = Math.min(2, devicePixelRatio || 1), W = o.clientWidth, H = o.clientHeight;
    if (!W) return;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    // (como la imagen, que llena la ventana recortando lo que sobra)
    const k = Math.max(W / this.vw, H / this.vh), ox = (W - this.vw * k) / 2, oy = (H - this.vh * k) / 2, Q = (x, y) => [ox + x * k, oy + y * k];
    // el centro y tu sitio
    const yb = H - 4;
    c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(W * 0.2, yb - 1, W * 0.6, 2);
    if (this.visto) { c.fillStyle = '#ffd166'; c.beginPath(); c.arc(W / 2 + this.x * W * 0.3, yb, 3.5, 0, Math.PI * 2); c.fill(); }
    const L = this.lms; if (!L || !this.visto) return;
    const P = (i) => Q((1 - L[i].x) * this.vw, L[i].y * this.vh), vis = (i) => (L[i]?.visibility ?? 1) > 0.5;
    c.lineCap = 'round'; c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.75)';
    c.beginPath(); for (const [a, b] of HUESOS) if (vis(a) && vis(b)) { const p = P(a), q = P(b); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); } c.stroke();
    if (vis(0)) { const n = P(0); c.beginPath(); c.arc(n[0], n[1], Math.max(5, this.sw * k * 0.22), 0, Math.PI * 2); c.stroke(); }
    for (const kk of [15, 16]) {
      const h = this.M[kk]; if (!h.ok) continue;
      const golpe = this.flash?.k === kk && t - this.flash.t < 0.35;
      if (h.rastro.length > 1 && (golpe || h.v > 2.5)) { c.strokeStyle = golpe ? 'rgba(255,122,200,.9)' : 'rgba(255,255,255,.35)'; c.lineWidth = golpe ? 6 : 3; c.beginPath(); h.rastro.forEach((r, i) => { const p = Q(r.x, r.y); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.stroke(); }
      const p = Q(h.x, h.y); c.beginPath(); c.arc(p[0], p[1], 6 + h.wind * 4, 0, Math.PI * 2); c.fillStyle = golpe ? '#ff7ac8' : h.wind > 0.3 ? '#ffd166' : '#fff'; c.fill();
    }
  }

  stop() {
    this.parado = true; cancelAnimationFrame(this.raf);
    try { this.stream?.getTracks().forEach(t => t.stop()); } catch (e) { /* nada */ }
    try { this.pl?.close(); } catch (e) { /* nada */ }
    this.box.remove(); if (window.__camaraCuerpo) delete window.__camaraCuerpo;
  }
}
