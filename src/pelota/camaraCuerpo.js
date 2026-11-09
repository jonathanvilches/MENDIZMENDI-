// La pelota en casa, con la cámara: juegas de pie delante de la pantalla y tu pelotari hace lo que haces tú. La cámara de
// delante te mira y MediaPipe (Pose Landmarker de Google, licencia Apache 2.0: public/ar) sigue tu cuerpo en el propio
// aparato; la imagen no sale de él. De lo que hace el cuerpo se saca:
//  - dónde estás: si te mueves a un lado, tu pelotari se mueve a ese lado de la cancha (y, cuando te toca, apuntas hacia ahí);
//  - el armado: con el brazo atrás (hacia fuera, arriba o detrás del cuerpo), tu pelotari arma el brazo como tú;
//  - el golpe: la mano que va deprisa hacia delante; cuanto más deprisa, más fuerte. Con la derecha o con la izquierda, y
//    alta (de aire), a media altura o baja (sotamano), como la tuya. Y hacia dónde: el brazo que acaba cruzado hacia el
//    otro lado manda la pelota hacia ese lado (con la derecha, cruzado del todo, más allá del hombro izquierdo, es la dos
//    paredes); el que acaba en su lado, al ancho; hacia arriba, larga y alta; de arriba abajo y fuerte, la cortada;
//  - la postura: agachado (los hombros bajos o el tronco doblado), el golpe es una dejada, y basta un toque suave.
// Moverse hasta la pelota lo hace solo el pelotari cuando te toca: tú das el golpe en su momento.
// Juego propio del juego (ni marca ni diseño de ninguna consola). Lo usa pelota/match.js (opción camara).
import { motorVision, rutaAR } from '../ui/camaraAR.js';
import { isEU } from '../i18n.js';

const T = (es, eu) => (isEU() ? eu : es);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// la velocidad de la mano para que cuente como golpe, en anchos de hombros por segundo (un brazo que se mueve tranquilo va
// a 1 o 2; un golpe de verdad, a 5 o más)
const V_MIN = 3.4;
// lo deprisa que golpea de normal quien juega, de primeras (anchos de hombros por segundo): luego se mide con sus golpes
const TIPICO = 6;
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
.pcam{position:absolute;left:calc(env(safe-area-inset-left,0px) + 14px);top:calc(env(safe-area-inset-top,0px) + 14px);z-index:3;display:flex;flex-direction:column;align-items:flex-start;gap:6px;pointer-events:none;transition:opacity .3s}
.pcam-v{position:relative;width:clamp(150px,22vw,300px);aspect-ratio:4/3;border-radius:16px;overflow:hidden;background:#0d0620;border:2px solid rgba(255,255,255,.55);box-shadow:0 8px 24px rgba(0,0,0,.35);pointer-events:auto;cursor:pointer;transition:width .35s ease,border-radius .35s ease,border-color .2s}
.pcam video,.pcam canvas{position:absolute;inset:0;width:100%;height:100%}
.pcam video{object-fit:cover;transform:scaleX(-1);filter:saturate(.85) brightness(.85);transition:opacity .25s}
.pcam.visto .pcam-v{border-color:#ffd166}
.pcam.oculta .pcam-v{position:absolute;left:0;top:0;width:2px;height:2px;opacity:.01;border:0;box-shadow:none;pointer-events:none;transition:none}
.pcam.fuera{opacity:0}.pcam.fuera .pcam-v{pointer-events:none}
.pcam-msg{max-width:min(300px,60vw);padding:6px 10px;border-radius:10px;background:rgba(13,6,32,.8);font:700 12px/1.25 var(--pel-font,'MZ Texto'),sans-serif;color:#fff}
.pcam-msg:empty{display:none}
.pel-root.con-camara .pel-stick,.pel-root.con-camara .pel-stickhint{display:none}
@media (max-height:480px){.pcam:not(.oculta) .pcam-v{width:clamp(130px,24vw,220px)}.pcam-msg{font-size:11px}}
`;
let cssPuesto = false;

// cada mano: dónde está (suavizado), a qué velocidad va, cuánto está armada y cuándo golpeó por última vez
const mano = () => ({ x: 0, y: 0, vx: 0, vy: 0, v: 0, wind: 0, windMax: 0, ok: false, ult: -9, tU: 0, rastro: [] });

export class CamaraCuerpo {
  /** host: donde va la ventana de la cámara (el marcador del partido). Al empezar un golpe, onGolpe({ power, golpe, aimX,
   *  aimY, req, tipo, t }) con lo que se ve hasta ahí; mientras dura, onGolpeAvance, cada vez más seguro; al acabar,
   *  onGolpeFin con lo que ha sido. nombres: el nombre de cada
   *  tipo de golpe (TEXT.shots de rules.js), para la ventana */
  constructor(host) {
    this.host = host;
    this.x = 0; this.wind = 0; this.arma = 'Hit'; this.visto = false; this.listo = false; this.fallo = false; this.parado = false;
    this.onGolpe = null; this.onGolpeAvance = null; this.onGolpeFin = null; this.nombres = null; this.golpes = 0; this.agachado = 0; this.gesto = null;
    this.picos = []; this.post = []; this.oculta = false; this.desde = null;
    this.M = { 15: mano(), 16: mano() };
    this.sw = 0; this.cx = 0; this.x0 = null; this.cal = []; this.tVisto = -9; this.tPrev = 0; this.lms = null; this.vw = 640; this.vh = 480;
    if (!cssPuesto) { cssPuesto = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
    // (la ventana: tu imagen y tu esqueleto, solo para colocarte; en cuanto te ve y te ha medido, se quita del todo y vuelve
    // si deja de verte. Queda solo, un momento, el nombre del golpe. El vídeo sigue en la página, diminuto y casi
    // transparente: escondido del todo, algunos navegadores dejan de darle imágenes nuevas)
    const o = this.box = document.createElement('div'); o.className = 'pcam';
    o.innerHTML = '<div class="pcam-v"><video playsinline muted></video><canvas></canvas></div><div class="pcam-msg"></div>';
    host.appendChild(o);
    this.vbox = o.querySelector('.pcam-v'); this.vbox.title = T('Tocar para quitar la cámara', 'Ukitu kamera kentzeko');
    this.video = o.querySelector('video'); this.cv = o.querySelector('canvas'); this.c = this.cv.getContext('2d'); this.msg = o.querySelector('.pcam-msg');
    this.vbox.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.achica(true); });
    this.di(T('Pidiendo la cámara…', 'Kamera eskatzen…'));
    // (para las pruebas: el estado y un cuerpo de mentira; con él, la cámara deja de mandar)
    // (al girar el móvil, la imagen de la cámara gira con él y el cuerpo «salta» en ella: eso no es un golpe. Se vuelve
    // a medir desde cero y, durante un segundo, no cuenta ningún golpe. Lo mismo al volver a la app. Antes, cada giro
    // daba golpes que nadie había dado, a velocidades imposibles, y te daba por agachado)
    this.apaisado = innerWidth > innerHeight;
    this.alGirar = () => { const a = innerWidth > innerHeight; if (a !== this.apaisado) { this.apaisado = a; this.reinicia('giro'); } };
    this.alVolver = () => { if (!document.hidden) this.reinicia('vuelve'); };
    addEventListener('resize', this.alGirar); addEventListener('orientationchange', this.alGirar); document.addEventListener('visibilitychange', this.alVolver);
    window.__camaraCuerpo = { estado: () => this.estado(), pose: (lms, t) => { if (!this.manual) { this.manual = true; this.x0 = null; this.cal = []; this.refSh = null; } this.sigue(lms, t ?? performance.now() / 1000); } };
  }
  di(t) { if (this.msg.textContent !== t) this.msg.textContent = t; }
  // empezar de cero (el centro, la postura, las manos y el golpe a medias) y un segundo sin golpes
  reinicia(por) {
    this.calma = performance.now() / 1000 + 1;
    this.x0 = null; this.cal = []; this.post = []; this.agachado = 0; this.gesto = null; this.picoPow = 0; this.sw = 0; this.cx = 0;
    for (const k of [15, 16]) { const h = this.M[k]; h.ok = false; h.rastro.length = 0; h.wind = 0; h.windMax = 0; h.v = h.v2 = 0; h.vx = h.vy = h.vz = 0; }
    try { window.__informeEvento?.(`cámara empieza de cero (${por})`); } catch (e) { /* sin informe */ }
  }
  achica(on) { if (this.oculta === on) return; this.oculta = on; this.box.classList.toggle('oculta', on); if (on) this.c.clearRect(0, 0, this.cv.width, this.cv.height); }
  // lo deprisa que golpeas de normal: la mediana de tus últimos 12 golpes (sin las dejadas), con cortadas más rápidas y
  // largos más lentos a los lados; de primeras, lo de casi todos
  tipico() { const a = this.picos; if (a.length < 4) return TIPICO; const b = a.slice().sort((p, q) => p - q); return clamp(b[b.length >> 1], 3.5, 30); }
  // la fuerza: por lo deprisa que va la mano, respecto a lo que golpeas tú de normal (la dejada, siempre suave)
  pot(v, dejada) { const T0 = this.tipico(); return dejada ? 0.15 + 0.45 * clamp((v - 1.5) / (T0 * 0.9), 0, 1) : 0.25 + 0.75 * clamp((v - T0 * 0.5) / (T0 * 1.3), 0, 1); }
  estado() { const m = (k) => ({ v: +this.M[k].v.toFixed(1), wind: +this.M[k].wind.toFixed(2), ok: this.M[k].ok }); return { listo: this.listo, fallo: this.fallo, visto: this.visto, vistos: this.vistos || 0, imagenes: this.imagenes || 0, x: +this.x.toFixed(2), wind: +this.wind.toFixed(2), arma: this.arma, golpes: this.golpes, agachado: +this.agachado.toFixed(2), oculta: this.oculta, trabajador: !!this.w, enviadas: this.enviadas || 0, saltadas: this.saltadas || 0, delegado: this.delegado || (this.pl ? 'aquí' : ''), tipico: +this.tipico().toFixed(1), ultimos: (this.ultimos || []).map(u => [u.tipo || 'golpe', u.req || '', +u.aimX.toFixed(2), +u.aimY.toFixed(2), +u.power.toFixed(2), u.golpe]), d: m(16), i: m(15), msg: this.msg.textContent }; }

  /** La cámara de delante y el detector; si algo falla, se juega con los botones de siempre */
  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (this.parado) { this.stream.getTracks().forEach(t => t.stop()); return; }
      this.video.srcObject = this.stream; await this.video.play().catch(() => { });
      this.di(T('Preparando…', 'Prestatzen…'));
      // (el detector, en un trabajador aparte: así el partido no va a trompicones; si el navegador no puede, aquí mismo)
      if (window.__camaraSinTrabajador || !(await this.trabajador())) { this.pl = await detector(); if (this.parado) { this.pl.close(); return; } }   // (__camaraSinTrabajador: para comparar en las pruebas)
      if (this.parado) return;
      this.listo = true; this.di(T('Ponte delante: que se te vea de cintura para arriba', 'Jarri aurrean, gerritik gora ikusteko moduan'));
      this.bucle();
    } catch (e) {
      console.warn('pelota con la cámara', e);
      this.fallo = true; this.video.remove(); this.di(T('Sin cámara: juega con los botones', 'Kamerarik gabe: jokatu botoiekin'));
      setTimeout(() => this.box.classList.add('fuera'), 4000);
    }
  }
  // el trabajador con el detector (public/ar/cuerpo-worker.js): true cuando está listo; false si no se puede
  trabajador() {
    return new Promise((res) => {
      let w; try { w = new Worker(rutaAR('cuerpo-worker.js')); } catch (e) { res(false); return; }
      const mal = (e) => { clearTimeout(to); if (e) console.warn('pelota con la cámara, trabajador', e); try { w.terminate(); } catch (x) { /* nada */ } if (this.w === w) this.w = null; res(false); };
      const to = setTimeout(() => mal('sin respuesta'), 30000);
      w.onmessage = (e) => {
        const m = e.data;
        if (m.tipo === 'listo') { clearTimeout(to); this.w = w; this.delegado = m.delegado; res(true); }
        else if (m.tipo === 'error') mal(m.error);
        else if (m.tipo === 'saltada') { this.ocupado = false; this.contesta = true; this.saltadas = (this.saltadas || 0) + 1; }
        else if (m.tipo === 'puntos') {
          this.ocupado = false; this.contesta = true; if (this.parado || this.manual) return;
          this.imagenes = (this.imagenes || 0) + 1; if (m.lms) this.vistos = (this.vistos || 0) + 1;
          this.sigue(m.lms, m.t);
        }
      };
      w.onerror = (e) => mal(e.message || 'error');
      w.postMessage({ tipo: 'inicia', wasm: rutaAR('wasm'), modelo: rutaAR('pose_landmarker_lite.task') });
    });
  }
  // (cada imagen nueva de la cámara, una vez: con requestVideoFrameCallback si lo hay y, si no, en cada vuelta de pantalla).
  // Con el trabajador, la imagen pequeña (320 de ancho: el detector la reduce a 256 de todos modos) y una a la vez: si aún
  // está con la anterior, esta se salta. El tiempo de cada una es el de cuando llegó de la cámara, para medir bien lo
  // deprisa que va la mano. Sin trabajador, aquí mismo y como mucho unas 20 por segundo
  bucle() {
    const v = this.video, uno = () => {
      if (this.parado) return;
      if (!this.manual && v.readyState >= 2 && v.currentTime !== this.ultV) {
        this.ultV = v.currentTime;
        { const nw = v.videoWidth || 640, nh = v.videoHeight || 480; if (this.listo && this.vw && (nw !== this.vw || nh !== this.vh)) this.reinicia('imagen'); this.vw = nw; this.vh = nh; }
        const t = performance.now() / 1000;
        if (this.w) {
          // (una respuesta perdida no lo para todo; pero la primera, mientras el detector arranca, tarda unos segundos)
          if (this.ocupado && this.contesta && t - this.ocupado > 2) this.ocupado = false;
          if (!this.ocupado) {
            this.ocupado = t;
            const op = this.sinRedim ? undefined : { resizeWidth: 320, resizeHeight: Math.round(320 * this.vh / this.vw), resizeQuality: 'low' };
            (op ? createImageBitmap(v, op) : createImageBitmap(v)).then((img) => {
              if (this.parado || !this.w) { img.close(); this.ocupado = false; return; }
              this.w.postMessage({ tipo: 'imagen', img, ts: performance.now(), d: Date.now(), t }, [img]); this.enviadas = (this.enviadas || 0) + 1;
            }).catch(() => { this.ocupado = false; if (op) this.sinRedim = true; });
          }
        } else if (this.pl && t - (this.ultDet || 0) > 0.045) {
          this.ultDet = t;
          try { const r = this.pl.detectForVideo(v, performance.now()); this.imagenes = (this.imagenes || 0) + 1; if (r.landmarks?.[0]) this.vistos = (this.vistos || 0) + 1; this.sigue(r.landmarks?.[0] || null, t); }
          catch (e) { /* (una imagen que no se pudo leer) */ }
        }
      }
      pide();
    };
    const pide = () => { if (this.parado) return; if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(uno); else this.raf = requestAnimationFrame(uno); };
    pide();
  }

  /** Lo que hace el cuerpo en esta imagen: lms, los 33 puntos de MediaPipe (x, y de 0 a 1 en la imagen sin espejo) */
  sigue(lms, t) {
    const dt = clamp(t - (this.tPrev || t - 1 / 30), 1 / 90, 0.2); this.tPrev = t; this.lms = lms;
    this.hz = this.hz ? this.hz + (1 / dt - this.hz) * 0.1 : 1 / dt;   // (cuántas imágenes por segundo mira el detector)
    const vis = (i) => lms && lms[i] && (lms[i].visibility ?? 1) > 0.5;
    // (en píxeles de la imagen y de espejo, como se ve en la ventana: tu derecha, a la derecha)
    const P = (i) => ({ x: (1 - lms[i].x) * this.vw, y: lms[i].y * this.vh, z: (lms[i].z || 0) * this.vw });
    if (!lms || !vis(11) || !vis(12)) {
      if (t - this.tVisto > 0.6) { this.visto = false; this.desde = null; this.wind *= 0.8; if (this.listo) this.di(T('No te veo: ponte delante de la cámara', 'Ez zaitut ikusten: jarri kameraren aurrean')); }
      if (t - this.tVisto > 1.2) this.achica(false);   // (si deja de verte, otra vez a la vista: para que te coloques)
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
    this.visto = true; this.tVisto = t; this.box.classList.add('visto'); this.desde ??= t;
    if (this.x0 != null && t - this.desde > 2) this.achica(true);   // (ya te ve y te ha medido: fuera)
    // dónde estás: el centro, el sitio donde te quedas quieto el primer segundo (con la cámara algo torcida, también vale)
    if (this.x0 == null) { this.cal.push(this.cx); if (this.cal.length >= 12) { const a = this.cal.slice().sort((p, q) => p - q); this.x0 = clamp(a[a.length >> 1], this.vw * 0.3, this.vw * 0.7); } }
    const x0 = this.x0 ?? this.vw / 2, off = (this.cx - x0) / (sw * 1.3), dz = Math.abs(off) < 0.12 ? 0 : off - Math.sign(off) * 0.12;
    this.x = clamp(dz / 0.88, -1, 1);
    // la postura: encogido, la de la dejada. No contra estar de pie, sino contra como estás tú estos últimos segundos: en la
    // pelota se espera ya agachado y en la dejada el cuerpo se encoge un poco más, para ajustar el golpe (los hombros algo
    // más abajo o el tronco algo más doblado que la mediana de los últimos 3 s, sin el último medio segundo)
    const torso = caderas ? (caderas.y - cs.y) / sw : null;
    this.post.push({ t, y: cs.y, torso }); while (this.post.length && t - this.post[0].t > 3.2) this.post.shift();
    const viejos = this.post.filter(q => t - q.t > 0.45);
    let encoge = 0;
    if (viejos.length >= 8 && viejos[viejos.length - 1].t - viejos[0].t > 0.7) {
      const med = (a) => { const b = a.slice().sort((p, q) => p - q); return b[b.length >> 1]; };
      const yB = med(viejos.map(q => q.y)), tB = viejos.some(q => q.torso != null) ? med(viejos.filter(q => q.torso != null).map(q => q.torso)) : null;
      encoge = Math.max(((cs.y - yB) / sw - 0.08) / 0.25, torso != null && tB != null ? ((tB - torso) - 0.08) / 0.22 : 0);
    }
    this.agachado += (clamp(encoge, 0, 1) - this.agachado) * (1 - Math.exp(-dt / 0.08));
    const agachado = this.agachado > 0.5;
    // cada mano: lo armada que está y si golpea. El golpe se lee entero: empieza cuando la mano va deprisa hacia delante
    // (onGolpe, ya, para no llegar tarde a la pelota) y se cierra cuando frena (onGolpeFin): hasta dónde llegó el brazo
    // (cruzado del todo, dos paredes), si subió (hacia arriba, larga) o bajó de golpe (cortada), y si estabas agachado (dejada)
    let mejor = null;
    const hipRel = (hipY - cs.y) / sw;
    for (const k of [15, 16]) {
      const h = this.M[k], S = k === 15 ? s11 : s12, kc = k - 2, lado = Math.sign(S.x - cs.x) || (k === 16 ? 1 : -1);
      // la mano: la muñeca aunque el detector dude un poco (en lo más rápido del golpe sale movida, o se sale de la imagen)
      // y, si no, por el codo, siguiendo el brazo. Si falta un momento, el golpe sigue: al volver a verla, lo que se ha
      // movido en ese rato (antes se daba por perdida, el golpe se cerraba a medias y, al volver, empezaba de cero)
      const vW = lms[k]?.visibility ?? 1, vC = lms[kc]?.visibility ?? 1, E = vC > 0.3 ? P(kc) : null;
      let W = null;
      if (vW > 0.2) W = P(k);
      else if (E && vC > 0.4) W = { x: E.x + (E.x - S.x) * 0.9, y: E.y + (E.y - S.y) * 0.9, z: E.z };
      if (!W) {
        if (h.ok && t - h.tU > 0.3) h.ok = false;
        h.wind *= 0.9; h.windMax = Math.max(0, h.windMax - dt * 1.2);
        if (this.gesto?.k === k && t - h.tU > 0.2) this.acaba(sw);
        continue;
      }
      if (W.x < this.vw * 0.01 || W.x > this.vw * 0.99) this.fuera = t;   // (la mano se sale de la imagen: estás muy cerca)
      // (la mano, respecto al centro de los hombros: así un paso a un lado no es un golpe)
      const rx = W.x - cs.x, ry = W.y - cs.y, rz = W.z - (s11.z + s12.z) / 2;
      const dh = h.ok ? clamp(t - h.tU, 1 / 90, 0.3) : dt; h.tU = t;
      if (!h.ok) { h.rx = rx; h.ry = ry; h.rz = rz; h.vx = h.vy = h.vz = 0; h.rastro.length = 0; }
      // (suavizado según el tiempo entre imágenes: con una cámara o un aparato lentos, un golpe rápido cae entre dos
      // imágenes y no se puede suavizar como a 30 imágenes por segundo, o no llegaría a contar)
      const aP = 1 - Math.exp(-dh / 0.02), aV = 1 - Math.exp(-dh / 0.03);
      const px = h.rx, py = h.ry, nx = h.rx + (rx - h.rx) * aP, ny = h.ry + (ry - h.ry) * aP;
      const vx = (nx - h.rx) / dh / sw, vy = (ny - h.ry) / dh / sw;
      h.vx += (vx - h.vx) * aV; h.vy += (vy - h.vy) * aV; h.rx = nx; h.ry = ny; h.x = cs.x + nx; h.y = cs.y + ny; h.ok = true;
      // (y hacia la pantalla: el golpe que va hacia delante apenas se mueve en la imagen. La profundidad que da el detector
      // tiene mucho ruido, unas siete veces más que lo de lado: muy suavizada, con poco peso y solo para lo deprisa que va)
      const nz = h.rz + (rz - h.rz) * (1 - Math.exp(-dh / 0.06)), vz = (nz - h.rz) / dh / sw; h.rz = nz; h.vz += (vz - h.vz) * aV;
      h.v2 = Math.hypot(h.vx, h.vy); h.v = Math.hypot(h.vx, h.vy, h.vz * 0.25);
      h.codo = E ? E.x - cs.x : null;
      // (el armado: la mano hacia fuera del hombro, por encima de él o por detrás del cuerpo; el codo hacia fuera ayuda)
      const out = (h.x - S.x) * lado / sw, up = (S.y - h.y) / sw, atras = (W.z - S.z) / sw, codo = E ? (E.x - S.x) * lado / sw : 0;
      const w = Math.max(clamp((out - 0.25) / 0.55, 0, 1), clamp((up - 0.15) / 0.5, 0, 1), clamp((atras - 0.35) / 0.6, 0, 1) * 0.8, clamp((codo - 0.35) / 0.4, 0, 1) * 0.7);
      h.wind += (w - h.wind) * 0.35; h.windMax = Math.max(h.wind, h.windMax - dt * 1.2);
      h.rastro.push({ x: h.x, y: h.y, rx: h.rx, ry: h.ry, v: h.v, t }); while (h.rastro.length && t - h.rastro[0].t > 0.5) h.rastro.shift();
      if (!mejor || h.wind > mejor.h.wind) mejor = { h, k, up, lado };
      // el golpe que se está dando con esta mano: hasta dónde llega (la mano y el codo), cuánto recorre y cuándo frena
      const G = this.gesto;
      if (G && G.k === k) {
        G.minRx = Math.min(G.minRx, h.rx); G.maxRx = Math.max(G.maxRx, h.rx); G.minRy = Math.min(G.minRy, h.ry); G.maxRy = Math.max(G.maxRy, h.ry); G.n++;
        G.camino += Math.hypot(h.rx - px, h.ry - py) / sw; if (dh > 0.07) G.huecos++;
        if (h.codo != null) { G.minCodo = Math.min(G.minCodo ?? h.codo, h.codo); G.maxCodo = Math.max(G.maxCodo ?? h.codo, h.codo); }
        if (h.v > G.pico) { G.pico = h.v; G.pk = h.rx; G.pkY = h.ry; } G.fin = h.rx; G.dejada ||= agachado; G.enc = Math.max(G.enc, this.agachado);
        this.picoPow = Math.max(this.picoPow, this.lee(G, sw).power);
        // (se cierra al frenar la mano dos imágenes seguidas, como al cambiar de sentido al final; o pasado un tercio de
        // segundo con al menos tres imágenes del gesto; con una cámara lenta, si no, se cerraría antes de que acabe de cruzar)
        const dur = t - G.t0; G.bajo = h.v < G.pico * 0.45 ? (G.bajo || 0) + 1 : 0;
        if ((dur >= 0.12 && G.n >= 2 && G.bajo >= 2) || (dur >= 0.35 && G.n >= 3) || dur >= 0.5) this.acaba(sw);
        // (mientras dura, lo que va siendo; frenando, ya no se adelanta)
        else { const hz = h.v > G.pico * 0.7 ? 0.06 : 0, pred = { rx: h.rx + h.vx * sw * hz, ry: h.ry + h.vy * sw * hz }; try { this.onGolpeAvance?.({ ...this.lee(G, sw, pred, clamp(dur / 0.12, 0, 1)), golpe: G.golpe }); } catch (e) { console.warn('golpe con la cámara', e); } }
        continue;
      }
      if (G || t - h.ult < 0.4 || t - (this.ultGolpe || -9) < 0.35 || t < (this.calma || 0)) continue;
      // uno nuevo: la mano va deprisa y no hacia fuera (eso es armar). Hacia abajo, el de aire o la cortada; hacia arriba
      // solo cuenta si va también hacia dentro (subir el brazo por el lado es armar el de aire); de lado, hacia dentro.
      // Encogido, para la dejada, basta un toque suave
      const delante = (dx, dy) => { const d = Math.hypot(dx, dy) || 1, o = dx * lado, ve = dy / d; return ve > 0.6 ? o < 0.25 * d : ve < -0.6 ? o < -0.3 * d : o < 0.1 * d; };
      // (lo deprisa que hay que ir, según lo que golpeas tú de normal; y si la otra mano va casi igual de deprisa, es el
      // cuerpo entero que arma o se equilibra, no un golpe: más todavía. Justo después de un golpe, la vuelta a su sitio
      // tampoco cuenta; y hacia abajo, algo más deprisa: bajar el brazo después de un golpe alto no es otro golpe)
      const otra = this.M[k === 15 ? 16 : 15], juntas = otra.ok && t - otra.tU < 0.1 && otra.v > 0.6 * h.v, vert = h.vy / (h.v2 || 1);
      // (la dejada es un toque corto y con la mano baja: con la mano a la altura de la cadera, o encogido, basta menos; pero
      // no si la mano cae, que es el brazo que vuelve a su sitio tras golpear: la dejada va hacia delante, no hacia abajo)
      const cae = vert > 0.6, manoBaja = !cae && h.ry / sw >= hipRel - 0.45, suave = (agachado && !cae) || manoBaja;
      const k0 = (agachado && !cae ? 0.45 : manoBaja ? 0.65 : h.windMax > 0.3 ? 1 : 1.1) * (t - (h.acabo ?? -9) < (cae ? 0.8 : 0.5) ? 1.35 : 1) * (juntas ? 1.5 : 1);
      // (y nunca menos de una parte de lo que golpeas tú de normal: si no, recolocar la mano contaba como dejada)
      const umbral = Math.max(clamp(this.tipico() * 0.36, 2.6, 8) * k0 * (vert < -0.6 ? 1.1 : vert > 0.6 ? 1.2 : 1), this.tipico() * (suave ? 0.18 : 0.25));
      let r0 = null, dispara = h.v > umbral && delante(h.vx, h.vy);
      if (dispara) {
        // (el principio del gesto: hacia atrás, donde la mano estaba casi quieta, el armado; como mucho, 0,45 s antes)
        for (let i = h.rastro.length - 2; i >= 0; i--) { const r = h.rastro[i]; if (t - r.t > 0.45) break; r0 = r; if (r.v < 1.2) break; }
      } else {
        // (o, aunque no se haya visto ir deprisa en ninguna imagen, porque la cámara va lenta o la mano salió movida: lo que
        // ha recorrido en el último medio segundo, hacia delante y a buen ritmo)
        let mej = 0;
        // (solo desde que acabó el golpe anterior de esta mano: si no, el mismo golpe volvería a contar al quedarse quieta)
        for (const r of h.rastro) { const dtr = t - r.t; if (dtr < 0.06 || dtr > 0.45 || r.t <= (h.acabo ?? -9) || r.t <= h.ult) continue; const D = Math.hypot(h.rx - r.rx, h.ry - r.ry) / sw; if (D > mej && D / dtr >= Math.max(2.2 * k0, this.tipico() * (suave ? 0.18 : 0.25)) && delante(h.rx - r.rx, h.ry - r.ry)) { mej = D; r0 = r; } }
        dispara = !!r0 && mej >= (suave ? 0.45 : 0.75);
      }
      if (!dispara) continue;
      h.ult = t; this.ultGolpe = t; h.windMax = 0;
      r0 ||= h; const up0 = (S.y - cs.y - r0.ry) / sw, derecha = r0.rx > 0;
      const bajaMano = Math.max(r0.ry, h.ry) / sw >= hipRel - 0.45;   // (la mano baja: a la altura de la cadera o más abajo)
      const alto = agachado || bajaMano ? 'Low' : up0 > 0.45 ? 'High' : 'Hit';
      const vIni = Math.hypot(h.rx - r0.rx, h.ry - r0.ry) / sw / Math.max(0.05, t - (r0.t ?? t));
      const g = this.gesto = { k, t0: t, tIni: r0.t ?? t, n: 0, huecos: 0, r0: { rx: r0.rx, ry: r0.ry }, up0, hip: hipRel, derecha, dejada: agachado, enc: this.agachado, golpe: alto + (derecha ? '' : 'L'),
        pico: Math.max(h.v, vIni), pk: h.rx, pkY: h.ry, fin: h.rx, camino: Math.hypot(h.rx - r0.rx, h.ry - r0.ry) / sw,
        minRx: Math.min(r0.rx, h.rx), maxRx: Math.max(r0.rx, h.rx), minRy: Math.min(r0.ry, h.ry), maxRy: Math.max(r0.ry, h.ry), minCodo: h.codo ?? undefined, maxCodo: h.codo ?? undefined };
      this.picoPow = this.lee(g, sw).power; this.golpes++; this.flash = { k, t };
      // (al empezar, hacia dónde va: donde estará la mano en un momento, por cómo va; al acabar ya se sabe de verdad)
      const pred = { rx: h.rx + h.vx * sw * 0.15, ry: h.ry + h.vy * sw * 0.15 };
      try { this.onGolpe?.({ ...this.lee(g, sw, pred, 0), golpe: g.golpe, t }); } catch (e) { console.warn('golpe con la cámara', e); }
    }
    // tu pelotari arma como tú: lo de la mano más armada, de su lado y a su altura (agachado, abajo)
    this.wind = mejor ? Math.max(mejor.h.wind, this.agachado * 0.6) : this.wind * 0.85;
    if (mejor && (mejor.h.wind > 0.2 || agachado)) this.arma = (agachado ? 'Low' : mejor.up > 0.45 ? 'High' : mejor.h.y > hipY - sw * 0.15 ? 'Low' : 'Hit') + (mejor.h.x > cs.x ? '' : 'L');
    // (muy cerca de la cámara, los brazos se salen de la imagen al golpear y el golpe no se ve entero)
    const cerca = sw / this.vw > 0.34 || t - (this.fuera ?? -9) < 2;
    if (this.listo && !(this.rotuloHasta > t)) this.di(this.x0 == null ? T('Te veo. Quieto un momento…', 'Ikusten zaitut. Geldi une batez…') : cerca ? T('Échate un poco hacia atrás: que se te vean los brazos', 'Atzeratu pixka bat: besoak ikusteko moduan') : this.golpes ? '' : T('Muévete a los lados. Cuando venga la pelota, brazo atrás y ¡golpea!', 'Mugitu alboetara. Pilota datorrenean, besoa atzera eta jo!'));
    this.pinta(t);
  }

  // lo que dice un golpe, hasta donde se ha visto: hacia dónde (aimX, de la pared, -1, al ancho, 1; el -1 con la derecha es
  // la dos paredes), lo largo (aimY: hacia arriba, larga y alta), la fuerza y si es dejada o cortada (req); tipo, su nombre
  // ¿dejada? La mano baja y con poco recorrido, o el cuerpo encogido; y nunca un golpe más rápido que los tuyos de siempre
  esDejada(G) {
    const typ = this.tipico(), baja = Math.max(G.r0.ry, G.pkY ?? G.r0.ry) / (this.sw || 1) >= G.hip - 0.45;
    return G.pico < Math.max(5, typ) && (G.dejada || G.enc > 0.4 || (baja && G.camino < 1.15));
  }
  lee(G, sw, pred = null, peso = 1) {
    // (mientras dura el gesto, pred: dónde estará la mano en un momento, por cómo va; peso, cuánto se fía uno de eso: al
    // empezar poco, casi recto; a la décima de segundo, del todo. Cerrado el gesto, lo que hizo de verdad)
    const minRy = pred ? Math.min(G.minRy, pred.ry) : G.minRy, maxRy = pred ? Math.max(G.maxRy, pred.ry) : G.maxRy;
    // hacia dónde: con la derecha, el brazo que va de derecha a izquierda, a la pared; el que acaba muy a la izquierda (la
    // mano a la altura del hombro izquierdo o más allá, o el codo pasado al otro lado del cuerpo), dos paredes; el que se va
    // hacia la derecha al final o acaba con la mano separada del cuerpo, al ancho. Con la izquierda, al revés: cruzada hacia
    // la derecha, al ancho; hacia su lado, a la pared, sin dos paredes
    const fin = (pred ? pred.rx : G.fin) / sw, sigue = fin - G.pk / sw;
    let aimX;
    if (G.derecha) {
      const ex = Math.min(G.minRx / sw, fin), codo = G.minCodo != null ? G.minCodo / sw : 9;
      aimX = ex <= -0.5 || (codo <= -0.05 && ex <= -0.25) ? -1 : ex < -0.1 && sigue < 0.1 ? Math.max(-0.68, ex * 1.25) : clamp(Math.max(0, fin - 0.15) * 0.9 + Math.max(0, sigue) * 1.1, 0, 1);
    } else {
      const ex = Math.max(G.maxRx / sw, fin);
      aimX = ex > 0.1 && sigue > -0.1 ? Math.min(1, ex * 1.1) : -clamp(Math.max(0, -fin - 0.15) * 0.9 + Math.max(0, -sigue) * 0.8, 0, 0.65);
    }
    if (aimX > -0.99 && Math.abs(aimX) < 0.1) aimX = 0;
    if (pred) { const m = 0.35 + 0.65 * peso; aimX = clamp(aimX, -m, m); if (peso < 1 && aimX <= -0.99) aimX = -m; }
    // el golpe, por lo deprisa que va respecto a tus golpes de siempre (typ): mucho más rápido, cortada (de arriba abajo,
    // algo menos ya vale); un golpe entero mucho más lento, o que acaba hacia arriba, largo; la mano baja y con poco
    // recorrido, o encogido, dejada
    const typ = this.tipico(), sube = (G.r0.ry - minRy) / sw, bajaM = (maxRy - G.r0.ry) / sw, arriba = -minRy / sw, seguro = !pred || peso >= 0.6;
    const dejada = this.esDejada(G), chop = G.up0 > -0.7 && G.up0 <= 0.45 && bajaM > 0.5;
    const cortada = !dejada && seguro && (G.pico >= Math.max(5.5, typ * 1.3) || (chop && G.pico >= Math.max(5, typ * 1.1)));
    const haciaArriba = seguro && G.up0 <= 0.45 && sube > 0.45 && arriba > 0.15;
    const largo = !dejada && !cortada && seguro && (haciaArriba || (G.pico <= typ * 0.75 && G.camino >= 1));
    let aimY = 0, req = dejada ? 'dejada' : cortada ? 'cortada' : false;
    if (dejada) aimY = sube > 0.3 ? 0.4 : 0;
    else if (largo) aimY = haciaArriba ? clamp(0.45 + (arriba - 0.15) * 0.9 + (sube - 0.45) * 0.3, 0.6, 1) : 0.75;
    else if (!cortada) aimY = clamp(sube * 0.2 - bajaM * 0.3, -0.5, 0.3);
    const tipo = req === 'dejada' ? (aimX < -0.6 ? 'dejadaTxoko' : aimX > 0.6 ? 'dejadaAncho' : 'dejada') : req === 'cortada' ? (aimX < -0.45 ? 'cortDos' : aimX < -0.3 ? 'cortPared' : aimX > 0.4 ? 'cortAncho' : 'cortada')
      : aimX <= -0.99 ? 'dosparedes' : largo ? 'largo' : aimX < -0.3 ? 'pared' : aimX > 0.4 ? 'ancho' : '';
    // (la fuerza, por lo deprisa que va; un largo es un golpe entero, aunque sea más lento: al menos media fuerza)
    const power = largo ? Math.max(0.55, this.pot(G.pico, false)) : this.pot(G.pico, dejada);
    return { aimX, aimY, req, power, tipo };
  }
  // el golpe, cerrado: lo que ha sido de verdad (y su nombre en la ventana, un momento)
  acaba(sw) {
    const G = this.gesto; if (!G) return; this.gesto = null; this.M[G.k].acabo = this.tPrev;
    const r = this.lee(G, sw), nm = r.tipo && this.nombres?.[r.tipo];
    // (cada golpe al informe de la partida, util/informe.js, con lo que se ha medido: para afinar con golpes de verdad)
    try { const f = (v) => (v == null ? '-' : Math.round(v * 100) / 100); window.__informeEvento?.(`cámara ${r.tipo || 'golpe'}${r.req ? '/' + r.req : ''} ${G.derecha ? 'dcha' : 'izq'} cruce ${f(Math.min(G.minRx, G.fin) / sw)} hasta ${f(G.maxRx / sw)} fin ${f(G.fin / sw)} codo ${f(G.minCodo != null ? G.minCodo / sw : null)} pico ${f(G.pico)} típico ${f(this.tipico())} recorrido ${f(G.camino)} sube ${f((G.r0.ry - G.minRy) / sw)} baja ${f((G.maxRy - G.r0.ry) / sw)} mano ${f(Math.max(G.r0.ry, G.pkY) / sw)} cadera ${f(G.hip)} encoge ${f(G.enc)} dura ${f(this.tPrev - G.tIni)} imágenes ${G.n} huecos ${G.huecos} hz ${f(this.hz)}`); } catch (e) { /* sin informe */ }
    // (las cortadas y los largos también cuentan: la mediana es tu golpe de siempre)
    if (r.req !== 'dejada') { this.picos.push(G.pico); if (this.picos.length > 12) this.picos.shift(); }
    if (nm) { this.di(nm); this.rotuloHasta = this.tPrev + 1.1; }
    try { this.onGolpeFin?.({ ...r, golpe: G.golpe }); } catch (e) { console.warn('golpe con la cámara', e); }
    (this.ultimos ||= []).push({ ...r, golpe: G.golpe }); if (this.ultimos.length > 12) this.ultimos.shift();
  }

  // la ventana: tu imagen de espejo con tu esqueleto encima; la mano armada en amarillo, el golpe con su estela y, abajo,
  // dónde estás respecto al centro
  pinta(t) {
    const o = this.vbox, cv = this.cv, c = this.c, dpr = Math.min(2, devicePixelRatio || 1), W = o.clientWidth, H = o.clientHeight;
    if (!W) return;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    if (this.oculta) return;
    // (como la imagen, que llena la ventana recortando lo que sobra)
    const k = Math.max(W / this.vw, H / this.vh), ox = (W - this.vw * k) / 2, oy = (H - this.vh * k) / 2, Q = (x, y) => [ox + x * k, oy + y * k];
    // el centro y tu sitio
    const yb = H - 4;
    c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(W * 0.2, yb - 1, W * 0.6, 2);
    if (this.visto) { c.fillStyle = '#ffd166'; c.beginPath(); c.arc(W / 2 + this.x * W * 0.3, yb, 3.5, 0, Math.PI * 2); c.fill(); }
    const L = this.lms; if (!L || !this.visto) return;
    const P = (i) => Q((1 - L[i].x) * this.vw, L[i].y * this.vh), vis = (i) => (L[i]?.visibility ?? 1) > 0.5;
    // (agachado, la postura de la dejada: el esqueleto en azul claro y, arriba, su nombre)
    const ag = this.agachado > 0.5;
    c.lineCap = 'round'; c.lineWidth = 3; c.strokeStyle = ag ? 'rgba(120,220,255,.95)' : 'rgba(255,255,255,.75)';
    c.beginPath(); for (const [a, b] of HUESOS) if (vis(a) && vis(b)) { const p = P(a), q = P(b); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); } c.stroke();
    if (vis(0)) { const n = P(0); c.beginPath(); c.arc(n[0], n[1], Math.max(5, this.sw * k * 0.22), 0, Math.PI * 2); c.stroke(); }
    if (ag && this.nombres?.dejada) { c.font = "700 12px 'MZ Texto',sans-serif"; const tw = c.measureText(this.nombres.dejada).width + 16; c.fillStyle = 'rgba(13,6,32,.78)'; c.beginPath(); c.roundRect?.(6, 6, tw, 22, 8); c.fill(); c.fillStyle = '#78dcff'; c.textBaseline = 'middle'; c.fillText(this.nombres.dejada, 14, 17); }
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
    if (this.w) { const w = this.w; this.w = null; try { w.postMessage({ tipo: 'cierra' }); } catch (e) { /* nada */ } setTimeout(() => { try { w.terminate(); } catch (e) { /* nada */ } }, 500); }
    removeEventListener('resize', this.alGirar); removeEventListener('orientationchange', this.alGirar); document.removeEventListener('visibilitychange', this.alVolver);
    this.box.remove(); if (window.__camaraCuerpo) delete window.__camaraCuerpo;
  }
}
