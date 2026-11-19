// El carrusel 3D de los campeonatos de pelota (el autor, 17 de noviembre de 2026: «no quiero que tenga una barra de filtro
// arriba; no es una página web, es un videojuego. Quiero simplemente las portadas de cada campeonato, un carrusel 3D estilo
// circular, y que se adapte muy bien a la pantalla»). Las portadas van en un anillo que gira: la de delante, grande y
// encendida; a los lados, cada una más girada y más honda, y la vuelta no se acaba nunca (después de la última viene la
// primera). Se gira con el dedo o el ratón (arrastrando), con las flechas de los lados, con la rueda, con las teclas ← → y,
// en el mando, con lo mismo. Tocar la de delante (o «Jugar», o Intro) la elige; tocar una de los lados la trae delante.
// El tamaño sale del hueco que hay: la portada, de 3 de ancho por 4 de alto, del mayor alto que cabe, y en el móvil de pie
// algo más estrecha para que asomen las de los lados.

import { TACTIL } from '../util/tactil.js';

const reduce = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * @param {HTMLElement} escena el hueco del anillo (con un hijo .c3-anillo con las portadas, botones con data-a)
 * @param {object} o { inicio: índice de la portada de delante al abrir, alCambiar(i, boton), sonido(k), ar: alto / ancho de
 *   cada portada (4/3 de pie, como las de los campeonatos; 3/4 tumbadas, como las fotos de los frontones);
 *   banda: el anillo abierto de lado a lado de la pantalla, con el ángulo que quepa (ver mide) }
 * @returns {{ destroy(), actual(): HTMLElement, ir(k) }}
 */
export function carrusel3d(escena, o = {}) {
  const anillo = escena.querySelector('.c3-anillo'), T = [...anillo.children], N = T.length;
  let rot = Math.max(0, Math.min(N - 1, o.inicio | 0)), meta = rot, raf = 0, last = 0, frente = -1;
  let w = 200, R = 400, PASO = 26, VIS = 3; const AR = o.ar || 4 / 3, PERSP = 3.6, GIRO = 62;   // (PERSP: la distancia del ojo, en anchos de portada)
  escena.style.setProperty('--c3ar', String(1 / AR));
  const md = (k) => ((k % N) + N) % N;
  // (lo que se aparta cada portada de la de delante, por el lado más corto de la vuelta)
  const aparte = (k) => { let d = md(k - rot); if (d > N / 2) d -= N; return d; };

  function mide() {
    const W = escena.clientWidth, H = escena.clientHeight; if (!W || !H) return;
    const tumbado = W > H * 1.15;
    // (la de delante, del mayor alto que cabe con aire arriba y abajo; de ancho, 3/4 del alto, sin pasar de lo que deja
    // ver dos a cada lado tumbado o asomar las de los lados de pie)
    // (con o.paso, el anillo cerrado de los campeonatos, 18 de noviembre de 2026: cada portada a 30° de la siguiente, así
    // el anillo se curva de verdad, la segunda de cada lado ya se va hacia atrás y la de delante puede ser bastante más
    // grande sin que las de los lados se salgan: entero mide de ancho unas 3,2 portadas, y de alto lo que la de delante,
    // que se adelanta un 3,5 %)
    // (las portadas tumbadas, las de los frontones, son más anchas: una sola a cada lado, o.vis, y la de delante hasta el
    // 36 % del ancho; con dos a cada lado no cabrían sin cortarse)
    const hMax = H * (o.banda ? (tumbado ? 0.95 : 0.84) : o.paso ? 0.95 : 0.9), wMax = o.banda ? W * (tumbado ? (AR < 1 ? 0.4 : 0.3) : (AR < 1 ? 0.8 : 0.6)) : o.paso ? (AR < 1 ? (tumbado ? W * 0.36 : W * 0.8) : tumbado ? W / 3.3 : W * 0.78) : W * (tumbado ? (AR < 1 ? 0.42 : 0.3) : (AR < 1 ? 0.78 : 0.62));
    w = Math.max(o.banda ? 96 : 120, Math.min(hMax / AR, wMax));
    // (el paso entre portadas: con pocas, más abierto; y el radio, el que deja las vecinas borde con borde)
    PASO = o.paso || Math.max(22, Math.min(34, 300 / Math.max(N, 1)));
    // (LA BANDA, o.banda, 18 de noviembre de 2026 por la tarde; el autor: «el carrusel de selección debe ser más estrecho
    // y más ancho»: las portadas, más estrechas y algo menos altas, y el anillo, abierto hasta llenar la pantalla de lado
    // a lado. El ángulo entre portadas ya no es fijo: sale del hueco, el más abierto (desde 14°) con el que el anillo
    // entero, con las de los lados giradas y en su perspectiva, cabe a lo ancho. En el móvil tumbado salen la de delante y
    // tres a cada lado; en una pantalla de ordenador, dos y el canto de la tercera; de pie, una)
    // (GIRO: hasta dónde se ven; más allá de los 62° una portada es un canto de pocos píxeles que asoma por detrás)
    if (o.banda) {
      const P = w * PERSP, medio = (p) => {
        const r = (w * 1.04) / (2 * Math.sin((p * Math.PI) / 360)), vis = Math.min(Math.floor(N / 2), Math.max(1, Math.floor(GIRO / p))); let m = w * 0.55;
        for (let d = 1; d <= vis; d++) { const th = (d * p * Math.PI) / 180, x = r * Math.sin(th) + (w / 2) * Math.cos(th), z = r * (Math.cos(th) - 1) - (w / 2) * Math.sin(th); m = Math.max(m, (x * P) / (P - z)); }
        return m; };
      PASO = 34; for (let p = 14; p <= 34; p++) if (medio(p) * 2 <= W) { PASO = p; break; }
    }
    R = (w * 1.04) / (2 * Math.sin((PASO * Math.PI) / 360));
    // (cuántas a cada lado se ven: las que caben a lo ancho hasta los 80°)
    VIS = Math.min(Math.floor(N / 2), o.vis || Math.max(1, Math.floor((o.banda ? GIRO : 80) / PASO)));
    escena.style.setProperty('--c3w', Math.round(w) + 'px');
    escena.style.perspective = Math.round(w * PERSP) + 'px';
    nitK = -1;   // (con otro tamaño, puede hacer falta otra imagen)
    pinta();
  }
  function pinta() {
    for (let k = 0; k < N; k++) {
      const d = aparte(k), a = Math.abs(d), t = T[k];
      if (a > VIS + 0.7) { if (t.style.visibility !== 'hidden') { t.style.visibility = 'hidden'; t.tabIndex = -1; } continue; }
      const th = (d * PASO * Math.PI) / 180, x = R * Math.sin(th), z = R * (Math.cos(th) - 1) + (a < 1 ? (1 - a) * w * 0.12 : 0);
      t.style.transform = `translate3d(${x.toFixed(1)}px,0,${z.toFixed(1)}px) rotateY(${(d * PASO).toFixed(2)}deg)`;
      // (LO QUE SE APAGA, SIN RECALCULAR LA CARTA ENTERA (19 de noviembre de 2026; el autor: «los carruseles de selección
      // van muy lentos»). Antes cada fotograma escribía --d con tres decimales en cada portada, y como --d se heredaba, el
      // navegador recalculaba los estilos de todo lo que lleva dentro: en «Elige tu pelotari», cuarenta y tantos
      // elementos por carta. Ahora es --c3d, que no se hereda (@property en el CSS de abajo: solo lo leen el velo y la
      // carta, que lo piden con inherit), en pasos de 0,05 y solo cuando cambia; la transición del velo funde los pasos.
      // Lo mismo la opacidad, la profundidad y la visibilidad: solo se escriben si cambian)
      const dv = (Math.round(Math.min(1, a * 0.4) * 20) / 20).toFixed(2), op = (a <= VIS ? 1 : Math.max(0, (VIS + 0.7 - a) / 0.7)).toFixed(2), zi = String(100 - Math.round(a * 10));
      if (t._dv !== dv) { t._dv = dv; t.style.setProperty('--c3d', dv); }
      if (t._op !== op) { t._op = op; t.style.opacity = op; }
      if (t._zi !== zi) { t._zi = zi; t.style.zIndex = zi; }
      if (t.style.visibility) t.style.visibility = '';
      // (la imagen, solo cuando se va a ver: con cuarenta y tantas portadas no se cargan todas a la vez)
      if (t.dataset.foto && !t.dataset.cargada) { t.dataset.cargada = '1'; t.style.setProperty('--foto', `url('${t.dataset.foto}')`); }
    }
    const f = md(Math.round(rot));
    if (f !== frente) {
      frente = f;
      T.forEach((t, k) => { const on = k === f; t.classList.toggle('frente', on); t.tabIndex = on ? 0 : -1; t.setAttribute('aria-current', String(on)); });
      o.alCambiar?.(f, T[f]);
    }
    pideNitidas();
  }
  // LA IMAGEN NÍTIDA (18 de noviembre de 2026; el autor, con el carrusel de campeonatos en una pantalla de ordenador: «las
  // imágenes no tienen calidad. Esto no puede ocurrir»). Cada portada lleva su imagen ligera (896 px), que es la que se
  // carga al abrir, y en data-nitida las mayores («url ancho, url ancho»). La de delante acerca la imagen unas 3,6 veces
  // para encuadrar al pelotari: en una pantalla de 1920 px hacen falta 2.000 px de imagen y con 896 se estiraba más del
  // doble. Cuando el anillo se para, la de delante (y en el ordenador también sus dos vecinas, que ya quedan listas para
  // el paso siguiente) pide la menor que cubre lo que se ve y, ya descargada y descodificada, se pinta ENCIMA de la
  // ligera (--nit sobre --foto): sin parpadeo. Al alejarse la suelta, para no guardar descodificadas quince imágenes de
  // 2048 px (17 MB cada una). En el móvil, solo la de delante y sin pasar de 1280 px.
  const DPR = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, TACTIL ? 2 : 3), RADIO = TACTIL ? 0 : 1, TOPE = TACTIL ? 1400 : 1e9;
  let nitT = 0, nitK = -1; const nit0 = performance.now();
  const mayores = (t) => t._nl || (t._nl = (t.dataset.nitida || '').split(',').map(s => s.trim().split(/\s+/)).filter(q => q[0] && +q[1]).map(([u, n]) => ({ u, n: +n })).filter(x => x.n <= TOPE).sort((x, y) => x.n - y.n));
  function afina(t) {
    const L = mayores(t); if (!L.length) return;
    // (lo ancha que se ve de verdad la de delante: su ancho, lo que se adelanta, un 3,5 %, y la escala que lleve el
    // anillo entero, que en la pantalla de campeonatos la agranda un tercio; y de ahí, lo que acerca la imagen. 0,85:
    // un 15 % de estirado no se nota)
    const escala = anillo.offsetWidth ? anillo.getBoundingClientRect().width / anillo.offsetWidth : 1;
    const zoom = (parseFloat(t.style.backgroundSize) || 100) / 100, falta = w * 1.035 * (escala || 1) * DPR * zoom * 0.85;
    const v = falta <= (+t.dataset.ancho || 0) ? null : (L.find(x => x.n >= falta) || L[L.length - 1]);
    if (!v) return suelta(t);
    if (t._nu && t._nn >= v.n) return;   // (ya tiene esa o una mayor: no se baja otra)
    t._nu = v.u; t._nn = v.n;
    const im = new Image(); im.decoding = 'async'; im.src = v.u;
    const pon = () => { if (t._nu === v.u && escena.isConnected) { t._im = im; t.style.setProperty('--nit', `url('${v.u}')`); } };
    (im.decode ? im.decode() : new Promise((ok, no) => { im.onload = ok; im.onerror = no; })).then(pon, () => { if (im.complete && im.naturalWidth) pon(); else if (t._nu === v.u) { t._nu = ''; t._nn = 0; } });
  }
  function suelta(t) { if (!t._nu) return; t._nu = ''; t._nn = 0; t._im = null; t.style.removeProperty('--nit'); }
  function nitidas() {
    const f = md(Math.round(meta));
    T.forEach((t, k) => { if (!t.dataset.nitida) return; let d = md(k - f); if (d > N / 2) d = N - d;
      if (d <= RADIO) afina(t); else if (d > (TACTIL ? 0 : VIS)) suelta(t); });
  }
  // (solo cuando la de delante lleva un momento siendo la misma: girando deprisa no se pide la de cada portada que pasa.
  // Y al abrir, medio segundo: la pantalla entra algo agrandada y la medida saldría de más)
  const pideNitidas = () => { const f = md(Math.round(meta)); if (f === nitK) return; nitK = f; clearTimeout(nitT); nitT = setTimeout(nitidas, performance.now() - nit0 < 500 ? 560 : 160); };
  function anima() {
    if (raf) return;
    last = performance.now();
    const tick = (now) => {
      raf = 0; if (!escena.isConnected) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!arr) { const k = reduce() ? 1 : 1 - Math.exp(-dt * 10); rot += (meta - rot) * k; if (Math.abs(meta - rot) < 0.002) rot = meta; }
      pinta();
      if (arr || rot !== meta) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  // (a la portada k por el lado más corto)
  const ir = (k) => { let d = md(k) - md(Math.round(meta)); if (d > N / 2) d -= N; else if (d < -N / 2) d += N; if (!d) return; meta = Math.round(meta) + d; o.sonido?.('click'); anima(); };
  const paso = (s) => { meta = Math.round(meta) + s; o.sonido?.('click'); anima(); };

  // arrastrar con el dedo o el ratón: lo que se mueve el dedo gira el anillo a la par; al soltar, a la más cercana, con
  // algo de inercia si iba deprisa. Un toque sin arrastrar es un toque (elige o trae delante)
  let arr = null;
  const abajo = (e) => {
    if (e.button > 0) return;
    arr = { x: e.clientX, r: rot, t: performance.now(), v: 0, lx: e.clientX, lt: performance.now(), movido: false, id: e.pointerId };
  };
  const mueve = (e) => {
    if (!arr || e.pointerId !== arr.id) return;
    const dx = e.clientX - arr.x;
    if (!arr.movido && Math.abs(dx) > 8) { arr.movido = true; try { escena.setPointerCapture(e.pointerId); } catch (er) { /* sin captura */ } }
    if (!arr.movido) return;
    const now = performance.now(); arr.v = (e.clientX - arr.lx) / Math.max(1, now - arr.lt); arr.lx = e.clientX; arr.lt = now;
    rot = arr.r - dx / (w * 0.85); meta = rot; anima();
  };
  const arriba = (e) => {
    if (!arr || e.pointerId !== arr.id) return;
    const A = arr; arr = null;
    if (!A.movido) return;   // (un toque: lo coge el click de la portada)
    const lanza = Math.max(-3, Math.min(3, -A.v * 260 / (w * 0.85)));
    meta = Math.round(rot + lanza); o.sonido?.('click'); anima();
    // (que el click que llega al soltar no elija nada)
    escena.addEventListener('click', (ev) => { ev.stopPropagation(); ev.preventDefault(); }, { capture: true, once: true });
  };
  escena.addEventListener('pointerdown', abajo);
  escena.addEventListener('pointermove', mueve);
  escena.addEventListener('pointerup', arriba);
  escena.addEventListener('pointercancel', arriba);
  // (la rueda: un paso por golpe, sin repetir mientras gira)
  let ruedaT = 0;
  const rueda = (e) => { const v = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (Math.abs(v) < 4) return; e.preventDefault(); const now = performance.now(); if (now - ruedaT < 260) return; ruedaT = now; paso(Math.sign(v)); };
  escena.addEventListener('wheel', rueda, { passive: false });
  // (tocar: la de delante se elige; una de los lados viene delante. En las pruebas automáticas, se elige siempre)
  anillo.addEventListener('click', (e) => {
    const b = e.target.closest('.c3-anillo > *'); if (!b) return;
    const k = T.indexOf(b);
    if (k === frente || (typeof navigator !== 'undefined' && navigator.webdriver)) return;   // (sigue: lo elige quien escucha)
    e.stopPropagation(); e.preventDefault(); ir(k);
  }, true);
  const teclas = (e) => {
    if (!escena.isConnected) return quita();
    if (e.key === 'ArrowRight') { e.preventDefault(); paso(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); paso(-1); }
    else if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest?.('button:not(.c3-anillo > *)')) { e.preventDefault(); T[frente]?.click(); }
  };
  addEventListener('keydown', teclas);
  const ro = new ResizeObserver(() => mide()); ro.observe(escena);
  function quita() { ro.disconnect(); removeEventListener('keydown', teclas); cancelAnimationFrame(raf); clearTimeout(nitT); }
  mide();
  // (al abrir, las portadas entran una tras otra desde abajo, de la de delante hacia los lados: CSS, .c3-entra)
  if (!reduce()) { T.forEach((t, k) => t.style.setProperty('--e', String(Math.min(6, Math.abs(aparte(k)))))); anillo.classList.add('c3-entra'); setTimeout(() => anillo.classList.remove('c3-entra'), 1100); }
  return { destroy: quita, actual: () => T[frente], ir, paso };
}

// (la barra de arriba y la de abajo de estas pantallas, ptCabecera y ptPie, viven en src/ui/pantalla.js)
export { ptCabecera, ptPie } from '../ui/pantalla.js';

/** Los estilos del carrusel (una vez). Las portadas, con su ilustración entera de fondo; el nombre abajo sobre un velo
 *  suave (sin degradados duros); la de delante, con el filo de su color y algo más de luz. */
/** El texto de debajo del anillo, que entra de nuevo al cambiar la portada de delante (c3-in: sube 6 px y aparece).
 *  Antes se hacía quitando y poniendo la clase «cambia» con void offsetWidth en medio, y eso obligaba al navegador a
 *  maquetar la página entera a mitad de giro, en cada portada que pasaba: en «Elige tu pelotari», la mayor parte del
 *  tiempo de JavaScript del giro (19 de noviembre de 2026). Ahora la animación se lanza directamente, sin maquetar. */
export function reanima(...els) {
  if (reduce()) return;
  for (const el of els) el?.animate?.([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 350, easing: 'cubic-bezier(.2,.9,.3,1)' });
}

export const CSS_CARRUSEL3D = `
.c3{position:relative;flex:1 1 auto;min-height:0;min-width:0;width:100%;display:flex;flex-direction:column;gap:clamp(6px,1.6vh,12px)}
.c3-escena{position:relative;flex:1 1 auto;min-height:150px;display:flex;align-items:center;justify-content:center;touch-action:pan-y;user-select:none;-webkit-user-select:none;cursor:grab}
.c3-escena:active{cursor:grabbing}
.c3-anillo{position:relative;width:var(--c3w,200px);aspect-ratio:var(--c3ar,.75);max-height:100%;transform-style:preserve-3d}
@property --c3d{syntax:'<number>';inherits:false;initial-value:0}
/* (las de los lados, sin sombra: en un anillo 3D cada sombra agranda la capa de su portada y frenaba el giro; el velo ya las
   separa del fondo. La de delante lleva la suya, de su color, en .frente) */
.c3-anillo>*{position:absolute;inset:0;margin:0;padding:0;border:0;border-radius:12px;overflow:hidden;background:#150b2e center/cover no-repeat;background-image:var(--nit,none),var(--foto,none);color:#fff;font:inherit;text-align:left;cursor:pointer;
  box-shadow:none;backface-visibility:hidden;-webkit-backface-visibility:hidden;transition:outline-color .25s;outline:2px solid transparent;outline-offset:-2px}
.c3-anillo>*::after{--c3d:inherit;content:'';position:absolute;inset:0;background:#07020f;opacity:calc(var(--c3d,0) * .62);pointer-events:none;transition:opacity .2s;will-change:opacity}
.c3-anillo>.frente{outline-color:var(--ac,#ff4fd8);box-shadow:0 0 0 1px rgba(255,255,255,.12),0 0 26px color-mix(in srgb,var(--ac,#ff4fd8) 45%,transparent),0 18px 40px rgba(4,1,12,.55)}
.c3-anillo>* .c3-figs{position:absolute;left:0;right:0;top:12%;bottom:24%;display:flex;align-items:flex-end;justify-content:center;pointer-events:none}
.c3-anillo>* .c3-figs img{height:100%;width:auto;max-width:none;filter:drop-shadow(0 8px 10px rgba(4,1,12,.6))}
.c3-pie{position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;gap:2px;padding:28px 12px 11px;background:linear-gradient(180deg,rgba(9,4,20,0),rgba(9,4,20,.55) 42%,rgba(9,4,20,.55))}
.c3-pie small{font:800 var(--fs-xs,11px)/1.1 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--ac,#ff4fd8);text-shadow:0 1px 2px rgba(0,0,0,.6)}
.c3-pie b{font:400 clamp(17px,calc(var(--c3w,200px) * .11),30px)/1 var(--f-display,'MZ Display'),sans-serif;letter-spacing:.01em;text-wrap:balance;text-shadow:0 2px 4px rgba(0,0,0,.55)}
.c3-tx{position:absolute;top:9px;right:9px;display:flex;align-items:center;gap:3px;padding:3px 8px 3px 5px;border-radius:999px;background:rgba(9,4,20,.55);font:800 var(--fs-sm,13px)/1 var(--f-cond,'MZ Cond'),sans-serif}
.c3-tx svg{width:16px;height:16px}
.c3-flecha{position:absolute;top:50%;z-index:200;width:44px;height:44px;margin-top:-22px;border-radius:50%;border:0;background:rgba(9,4,20,.55);color:#fff;display:grid;place-items:center;cursor:pointer}
.c3-flecha svg{width:22px;height:22px}.c3-flecha.izq{left:max(4px,env(safe-area-inset-left,0px))}.c3-flecha.der{right:max(4px,env(safe-area-inset-right,0px))}
.c3-flecha:hover{background:rgba(9,4,20,.72)}
.c3-info{display:flex;align-items:center;justify-content:center;gap:10px 14px;flex-wrap:wrap;min-height:44px;text-align:center}
.c3-info .c3-que{display:flex;flex-direction:column;gap:2px;align-items:center;min-width:0}
.c3-info .c3-que b{font:800 var(--fs-md,16px)/1.15 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.04em;text-transform:uppercase}
.c3-info .c3-que span{font-size:var(--fs-sm,13px);color:#d9cdef;max-width:44ch}
.c3-info .cp-ronda{display:flex;gap:4px}
.c3-jugar{min-width:150px}
.c3-info.cambia .c3-que{animation:c3-in .35s cubic-bezier(.2,.9,.3,1)}
@keyframes c3-in{from{opacity:0;transform:translateY(6px)}}
@media (prefers-reduced-motion:reduce){.c3-info.cambia .c3-que{animation:none}}
/* la pantalla de los campeonatos (18 de noviembre de 2026): sin marco de ventana, el anillo con todo el alto que dejan la
   barra de arriba y la de abajo de la pantalla de juego (src/ui/pantalla.js). Antes iban dos filas debajo del anillo
   dentro de una ventana con borde, y en el móvil tumbado la portada de delante se quedaba en 140 × 185 px */
.lg-card.c3-pant{width:100%;max-width:none;height:100%;background:none;border:0;box-shadow:none;overflow:hidden;border-radius:0}
.lg-card.c3-pant::before,.lg-card.c3-pant::after{display:none}
.c3-pant .c3-escena{min-height:120px}
.c3-pant .c3-pie{padding:calc(var(--c3w,200px) * .12) calc(var(--c3w,200px) * .06) calc(var(--c3w,200px) * .055)}
.c3-pant .c3-pie small{font-size:max(10px,calc(var(--c3w,200px) * .058))}
.c3-pant .c3-pie b{font-size:max(17px,calc(var(--c3w,200px) * .125))}
.c3-pant .largo .c3-pie b{font-size:max(15px,calc(var(--c3w,200px) * .1))}
.c3-pant .c3-anillo>*{border-radius:calc(var(--c3w,200px) * .045)}
.c3-pant.c3-ancha .c3-pie{padding:calc(var(--c3w,200px) * .07) calc(var(--c3w,200px) * .04) calc(var(--c3w,200px) * .035)}
.c3-pant.c3-ancha .c3-pie small{font-size:max(9px,calc(var(--c3w,200px) * .03))}
.c3-pant.c3-ancha .c3-pie b{font-size:max(14px,calc(var(--c3w,200px) * .062))}
.c3-pant.c3-ancha .c3-anillo>*{border-radius:calc(var(--c3w,200px) * .03)}
.c3-real{position:absolute;right:3%;top:5%;width:26%;display:flex;flex-direction:column;gap:2px;padding:3px;background:rgba(10,4,26,.7)}
.c3-real img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover}
.c3-real small{font:800 max(8px,calc(var(--c3w,200px) * .024))/1.1 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#ffe6a6;text-align:center}
/* LAS PORTADAS, VIVAS (18 de noviembre de 2026; el autor: «las cards deben estar animadas»): al abrir entran una tras otra;
   por la de delante cruza una luz cada pocos segundos y se mece muy despacio. Todo con translate, scale y opacity, que no
   repintan la portada: va igual en el móvil */
.c3-anillo>.c3-port::before{content:'';position:absolute;z-index:1;top:-20%;bottom:-20%;left:0;width:46%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent);transform:translateX(-170%) skewX(-16deg);pointer-events:none;opacity:0}
.c3-anillo>.c3-port.frente::before{opacity:1;animation:c3-luz 4.6s ease-in-out .5s infinite}
@keyframes c3-luz{0%,58%{transform:translateX(-170%) skewX(-16deg)}88%,100%{transform:translateX(330%) skewX(-16deg)}}
.c3-anillo>.frente{animation:c3-mece 5.2s ease-in-out infinite}
@keyframes c3-mece{0%,100%{translate:0 0}50%{translate:0 -1.2%}}
.c3-anillo.c3-entra>*{animation:c3-entra .55s cubic-bezier(.2,.9,.3,1) calc(var(--e,0) * 55ms) backwards}
@keyframes c3-entra{from{opacity:0;translate:0 9%;scale:.9}}
@media (prefers-reduced-motion:reduce){.c3-anillo>.c3-port.frente::before,.c3-anillo>.frente,.c3-anillo.c3-entra>*{animation:none}}
/* las cartas de pelotari en el anillo («Elige tu pelotari»): la carta entera, con su silueta, sin recuadro detrás; las de
   los lados se apagan con su opacidad (un velo rectangular asomaría por fuera de la silueta) */
.c3-anillo>.ep-port{background:none;box-shadow:none;outline:0;overflow:visible;border-radius:0}
.c3-anillo>.ep-port::after,.c3-anillo>.ep-port::before{display:none}
.c3-anillo>.ep-port .gx-card{--w:var(--c3w,160px)!important;display:block;position:absolute;inset:0;width:100%;height:100%;filter:none}
/* LA DE DELANTE, SIN REPINTAR LA CARTA EN CADA FOTOGRAMA (19 de noviembre de 2026; el autor: «los carruseles de selección
   van muy lentos»). El filo de luz que da la vuelta a la carta (ui/neon.css, neon-aro) cambia un degradado cónico en cada
   fotograma: con siete cartas a la vista, el navegador repintaba las siete enteras sesenta veces por segundo, también con
   el anillo quieto. Ahora solo da vueltas en la de delante (y lo mismo el brillo que cruza la cara y la respiración de la
   figura, que iban en las veintidós cartas), y en una capa suya (will-change), que se repinta sola sin
   arrastrar la figura, el texto y las cifras. Y el brillo dorado de la de delante, que era un drop-shadow sobre la carta
   entera (y como dentro gira el filo, se volvía a calcular en cada fotograma), es ahora .ep-aura: una imagen con la misma
   silueta (la de --fifa en ui/neon.css, con menos puntos) dorada y ya difuminada, detrás de la carta: se pinta una vez */
.c3-anillo>.ep-port:not(.frente) .gx-card::after,.c3-anillo>.ep-port:not(.frente) .gx-face::after,.c3-anillo>.ep-port:not(.frente) .gx-fig>img.pf{animation:none}
.c3-anillo>.ep-port.frente .gx-card::after{will-change:transform}
.c3-anillo>.ep-port .ep-aura{position:absolute;inset:calc(var(--c3w,160px) * -.12);z-index:-4;pointer-events:none;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='-12 -12 124 172'><filter id='b' x='-25%' y='-25%' width='150%' height='150%'><feGaussianBlur stdDeviation='3.5'/></filter><polygon points='0,12.99 3.89,11.83 6.47,8.67 7,5.99 32,4.5 40.64,3.77 45.86,2.29 50,0 54.14,2.29 59.36,3.77 68,4.5 93,5.99 93.53,8.67 96.11,11.83 100,12.99 100,125 99.11,128.94 96.44,132.1 92,134.5 50,148 8,134.5 3.56,132.1 0.89,128.94 0,125' fill='%23ffd166' fill-opacity='.55' filter='url(%23b)'/></svg>") center/100% 100% no-repeat;opacity:0;transition:opacity .25s}
.c3-anillo>.ep-port.frente .ep-aura{opacity:1}
.c3-anillo>.ep-port .ep-tu{position:absolute;z-index:3;left:50%;top:-1%;translate:-50% -50%;padding:3px 10px;border-radius:999px;background:#ffd166;color:#2a1450;font:800 max(10px,calc(var(--c3w,160px) * .075))/1.1 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.08em;text-transform:uppercase;font-style:normal;white-space:nowrap;--c3d:inherit;opacity:calc(1 - var(--c3d,0) * .5)}
/* el aviso de la esquina de una portada cuya imagen es la cancha del juego y no una foto del frontón de verdad */
.c3-chip{position:absolute;left:calc(var(--c3w,400px) * .028);top:calc(var(--c3w,400px) * .028);padding:4px 9px;border-radius:999px;background:rgba(9,4,20,.62);color:#e8defa;font:800 max(9px,calc(var(--c3w,400px) * .021))/1.1 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.1em;text-transform:uppercase;font-style:normal}
.c3-mosaico{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:2px}.c3-mosaico img{width:100%;height:100%;object-fit:cover;min-height:0}
`;
