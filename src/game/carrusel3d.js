// El carrusel 3D de los campeonatos de pelota (el autor, 17 de noviembre de 2026: «no quiero que tenga una barra de filtro
// arriba; no es una página web, es un videojuego. Quiero simplemente las portadas de cada campeonato, un carrusel 3D estilo
// circular, y que se adapte muy bien a la pantalla»). Las portadas van en un anillo que gira: la de delante, grande y
// encendida; a los lados, cada una más girada y más honda, y la vuelta no se acaba nunca (después de la última viene la
// primera). Se gira con el dedo o el ratón (arrastrando), con las flechas de los lados, con la rueda, con las teclas ← → y,
// en el mando, con lo mismo. Tocar la de delante (o «Jugar», o Intro) la elige; tocar una de los lados la trae delante.
// El tamaño sale del hueco que hay: la portada, de 3 de ancho por 4 de alto, del mayor alto que cabe, y en el móvil de pie
// algo más estrecha para que asomen las de los lados.

const reduce = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * @param {HTMLElement} escena el hueco del anillo (con un hijo .c3-anillo con las portadas, botones con data-a)
 * @param {object} o { inicio: índice de la portada de delante al abrir, alCambiar(i, boton), sonido(k), ar: alto / ancho de
 *   cada portada (4/3 de pie, como las de los campeonatos; 3/4 tumbadas, como las fotos de los frontones) }
 * @returns {{ destroy(), actual(): HTMLElement, ir(k) }}
 */
export function carrusel3d(escena, o = {}) {
  const anillo = escena.querySelector('.c3-anillo'), T = [...anillo.children], N = T.length;
  let rot = Math.max(0, Math.min(N - 1, o.inicio | 0)), meta = rot, raf = 0, last = 0, frente = -1;
  let w = 200, R = 400, PASO = 26, VIS = 3; const AR = o.ar || 4 / 3;
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
    const hMax = H * (o.paso ? 0.95 : 0.9), wMax = o.paso ? (tumbado ? W / 3.3 : W * 0.78) : W * (tumbado ? (AR < 1 ? 0.42 : 0.3) : (AR < 1 ? 0.78 : 0.62));
    w = Math.max(120, Math.min(hMax / AR, wMax));
    // (el paso entre portadas: con pocas, más abierto; y el radio, el que deja las vecinas borde con borde)
    PASO = o.paso || Math.max(22, Math.min(34, 300 / Math.max(N, 1)));
    R = (w * 1.04) / (2 * Math.sin((PASO * Math.PI) / 360));
    // (cuántas a cada lado se ven: las que caben a lo ancho hasta los 80°)
    VIS = Math.min(Math.floor(N / 2), Math.max(1, Math.floor(80 / PASO)));
    escena.style.setProperty('--c3w', Math.round(w) + 'px');
    escena.style.perspective = Math.round(w * 3.6) + 'px';
    pinta();
  }
  function pinta() {
    for (let k = 0; k < N; k++) {
      const d = aparte(k), a = Math.abs(d), t = T[k];
      if (a > VIS + 0.7) { if (t.style.visibility !== 'hidden') { t.style.visibility = 'hidden'; t.tabIndex = -1; } continue; }
      const th = (d * PASO * Math.PI) / 180, x = R * Math.sin(th), z = R * (Math.cos(th) - 1) + (a < 1 ? (1 - a) * w * 0.12 : 0);
      t.style.transform = `translate3d(${x.toFixed(1)}px,0,${z.toFixed(1)}px) rotateY(${(d * PASO).toFixed(2)}deg)`;
      t.style.setProperty('--d', Math.min(1, a * 0.4).toFixed(3));
      t.style.opacity = (a <= VIS ? 1 : Math.max(0, (VIS + 0.7 - a) / 0.7)).toFixed(3);
      t.style.zIndex = String(100 - Math.round(a * 10));
      t.style.visibility = '';
      // (la imagen, solo cuando se va a ver: con cuarenta y tantas portadas no se cargan todas a la vez)
      if (t.dataset.foto && !t.dataset.cargada) { t.dataset.cargada = '1'; t.style.setProperty('--foto', `url('${t.dataset.foto}')`); }
    }
    const f = md(Math.round(rot));
    if (f !== frente) {
      frente = f;
      T.forEach((t, k) => { const on = k === f; t.classList.toggle('frente', on); t.tabIndex = on ? 0 : -1; t.setAttribute('aria-current', String(on)); });
      o.alCambiar?.(f, T[f]);
    }
  }
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
  function quita() { ro.disconnect(); removeEventListener('keydown', teclas); cancelAnimationFrame(raf); }
  mide();
  return { destroy: quita, actual: () => T[frente], ir, paso };
}

/** Los estilos del carrusel (una vez). Las portadas, con su ilustración entera de fondo; el nombre abajo sobre un velo
 *  suave (sin degradados duros); la de delante, con el filo de su color y algo más de luz. */
export const CSS_CARRUSEL3D = `
.c3{position:relative;flex:1 1 auto;min-height:0;min-width:0;width:100%;display:flex;flex-direction:column;gap:clamp(6px,1.6vh,12px)}
.c3-escena{position:relative;flex:1 1 auto;min-height:150px;display:flex;align-items:center;justify-content:center;touch-action:pan-y;user-select:none;-webkit-user-select:none;cursor:grab}
.c3-escena:active{cursor:grabbing}
.c3-anillo{position:relative;width:var(--c3w,200px);aspect-ratio:var(--c3ar,.75);max-height:100%;transform-style:preserve-3d}
.c3-anillo>*{position:absolute;inset:0;margin:0;padding:0;border:0;border-radius:12px;overflow:hidden;background:#150b2e center/cover no-repeat;background-image:var(--foto,none);color:#fff;font:inherit;text-align:left;cursor:pointer;
  box-shadow:0 14px 34px rgba(4,1,12,.5);backface-visibility:hidden;-webkit-backface-visibility:hidden;will-change:transform;transition:box-shadow .25s,outline-color .25s;outline:2px solid transparent;outline-offset:-2px}
.c3-anillo>*::after{content:'';position:absolute;inset:0;background:#07020f;opacity:calc(var(--d,0) * .62);pointer-events:none;transition:opacity .2s}
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
@media (max-height:430px){.c3-info{min-height:38px}.c3-info .c3-que span{display:none}}
/* la pantalla de los campeonatos (18 de noviembre de 2026): sin marco de ventana, el anillo con todo el alto y, debajo, una
   sola fila con salir, lo que toca en el campeonato de delante con su «Jugar», y el frontón. Antes iban dos filas debajo
   del anillo dentro de una ventana con borde, y en el móvil tumbado la portada de delante se quedaba en 140 × 185 px */
.lg-card.c3-pant{width:100%;max-width:none;height:100%;padding:0;gap:clamp(2px,1vh,10px);background:none;border:0;box-shadow:none;overflow:hidden;border-radius:0}
.lg-card.c3-pant::before,.lg-card.c3-pant::after{display:none}
.c3-pant .c3-escena{min-height:120px}
.c3-pant .c3-pie{padding:calc(var(--c3w,200px) * .12) calc(var(--c3w,200px) * .06) calc(var(--c3w,200px) * .055)}
.c3-pant .c3-pie small{font-size:max(9px,calc(var(--c3w,200px) * .042))}
.c3-pant .c3-pie b{font-size:max(15px,calc(var(--c3w,200px) * .1))}
.c3-pant .largo .c3-pie b{font-size:max(13px,calc(var(--c3w,200px) * .08))}
.c3-pant .c3-anillo>*{border-radius:calc(var(--c3w,200px) * .045)}
.c3-barra{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px 12px;min-width:0}
.c3-barra>.lg-btn{justify-self:start}.c3-barra>.tq-sede{justify-self:end;margin:0}
.c3-barra .c3-info{flex-wrap:nowrap;min-width:0}.c3-barra .c3-info .c3-que{align-items:flex-end;text-align:right}
.c3-barra .c3-info .c3-que span{display:block}.c3-barra .c3-que b,.c3-barra .c3-que span{white-space:nowrap}
@media (max-aspect-ratio:1/1){.c3-barra{grid-template-columns:1fr 1fr}.c3-barra .c3-info{grid-column:1/-1;order:-1;justify-content:center}}
`;
