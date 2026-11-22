// Láminas técnicas (skill Anatomy): ilustraciones isométricas interactivas que enseñan por dentro cómo se hace o cómo
// funciona algo de Navarra (la almadía en el portillo, el queso, el rosado, el espárrago, el molino, el piquillo, el aceite, la miel, la cuajada, la txistorra, la ferrería, el salmón, la carbonera, la lana, la barrica, el pan, la alpargata, la cesta, las palomeras, el cantero, el aizkolari, la piedra, las setas, la Bajada del Ángel, la sidra...). Se dibujan con tools/anatomia/*.mjs, que las deja en
// public/anatomia/<id>.html, y aquí se abren encima del juego, casi a pantalla entera, con su título y «Seguir».
// El autor, 21 de noviembre de 2026: «explicaciones técnicas en 3D [...] todo esto quiero que poco a poco lo vayas
// aplicando y lo vayas metiendo en el juego y en las misiones».
import { esc, el } from '../util/html.js';
import { windowKeys } from '../util/keys.js';
import { NARRA, SIN_VOZ, narraTexto } from '../data/narraLaminas.js';

export const LAMINAS_TEC = {
  almadia: { title: 'La almadía en el portillo', kicker: 'Cómo funciona' },
  queso: { title: 'Cómo se hace el queso', kicker: 'Cómo se hace' },
  vino: { title: 'Cómo se hace el rosado', kicker: 'Cómo se hace' },
  esparrago: { title: 'Cómo se recoge el espárrago', kicker: 'Cómo se hace' },
  molino: { title: 'Cómo funciona el molino', kicker: 'Cómo funciona' },
  piquillo: { title: 'Cómo se hace el piquillo', kicker: 'Cómo se hace' },
  aceite: { title: 'Cómo se hace el aceite', kicker: 'Cómo se hace' },
  miel: { title: 'Cómo se hace la miel', kicker: 'Cómo se hace' },
  cuajada: { title: 'Cómo se hace la cuajada', kicker: 'Cómo se hace' },
  txistorra: { title: 'Cómo se hace la txistorra', kicker: 'Cómo se hace' },
  ferreria: { title: 'Cómo trabajaba una ferrería', kicker: 'Oficio de antes' },
  salmon: { title: 'El viaje del salmón', kicker: 'Cómo vive' },
  carbonera: { title: 'La carbonera', kicker: 'Oficio de antes' },
  hilandera: { title: 'De la oveja al ovillo', kicker: 'Oficio de antes' },
  tonelero: { title: 'Cómo se hace una barrica', kicker: 'Oficio de antes' },
  pan: { title: 'Cómo se hace el pan', kicker: 'Oficio de antes' },
  alpargata: { title: 'Cómo se hace una alpargata', kicker: 'Oficio de antes' },
  cesta: { title: 'Cómo se hace una cesta', kicker: 'Oficio de antes' },
  palomeras: { title: 'Las palomeras de Etxalar', kicker: 'Oficio de antes' },
  cantero: { title: 'Del monte al puente: el cantero', kicker: 'Oficio de antes' },
  aizkolari: { title: 'Cómo se corta un tronco: el aizkolari', kicker: 'Oficio de antes' },
  harrijasotzaile: { title: 'Cómo se levanta una piedra', kicker: 'Oficio de antes' },
  setas: { title: 'Cómo vive una seta', kicker: 'Cómo vive' },
  angel: { title: 'La Bajada del Ángel', kicker: 'Cómo funciona' },
  sidra: { title: 'Cómo se hace la sidra', kicker: 'Cómo se hace' },
};
// los productos de las misiones (data/procesos.js) que tienen su lámina
export const LAMINA_DE = { idiazabal: 'queso', roncal: 'queso', wine: 'vino', mill: 'molino', olive: 'aceite', olivo: 'aceite', honey: 'miel', chistorra: 'txistorra', herrero: 'ferreria', carbonero: 'carbonera', hilandera: 'hilandera', tonelero: 'tonelero', panadero: 'pan', alpargatero: 'alpargata', cestero: 'cesta', palomero: 'palomeras', uva: 'vino', trigo: 'molino', manzana: 'sidra' };   // (el espárrago y el piquillo, por su id: esparrago, piquillo; los oficios, por su kind: herrero, carbonero, hilandera, tonelero, panadero, alpargatero, cestero)
export const laminaDe = (id) => LAMINA_DE[id] || (LAMINAS_TEC[id] ? id : null);
// los pasos de las láminas de los oficios con taller (los de tools/anatomia/<lámina>.mjs, PASOS): el taller enseña cada
// herramienta y cada paso en su lámina (game/talleres.js, TALLERES.<oficio>.lamina) y la tarjeta del paso lleva su
// miniatura (public/anatomia/pasos, tools/anatomia/pasos-miniaturas.mjs)
export const LAMINA_PASOS = {
  ferreria: ['El agua', 'Carbón y vena', 'Los barquines', 'La zamarra', 'El mazo', 'Las barras'],
  pan: ['Amasar', 'Reposar', 'Calentar', 'Limpiar', 'Meter', 'Cocer'],
  cantero: ['Arrancar', 'Desbastar', 'Labrar', 'Escuadrar', 'La marca', 'El arco'],
  tonelero: ['Secar', 'Levantar', 'Tostar', 'Cerrar', 'Tapas', 'Probar'],
  cesta: ['Cortar', 'Cocer', 'Rajar', 'Armar', 'Tejer', 'Rematar'],
};
/** La miniatura de la lámina id en el paso i (o null si esa lámina no tiene pasos con miniatura) */
export const laminaPaso = (id, i) => (LAMINA_PASOS[id] && i != null ? `./anatomia/pasos/${id}-${i}.webp` : null);


// ---------- el visor ----------
// El autor, 22 nov 2026: «cuando cliques la imagen se amplíe y se vea más detalle del oficio, y que una voz en off vaya
// explicando y cuente la historia de ese oficio [...] tiene que ser mucho más interactivo, más ampliable [...] que cambie el
// ángulo de la cámara [...] no pongas textos en ningún momento que se corten [...] Las tipografías siguen siendo muy toscas».
// La lámina ocupa toda la pantalla y tiene una cámara: se acerca a la pieza que trabaja en cada paso y gira un poco (un
// ángulo distinto en cada paso); con la rueda, el pellizco o un clic se amplía donde se toca, y arrastrando se mueve. Si la
// lámina tiene narrador (data/narraLaminas.js), Salva cuenta la historia del oficio y después cada paso, con su subtítulo,
// y la lámina va al paso que cuenta. La letra, la del juego (MZ Texto y MZ Cond, sin la itálica gruesa), y ningún texto se
// corta: los pasos y el subtítulo saltan de línea.
const CSS = `.lt-ov{position:fixed;inset:0;z-index:960;background:radial-gradient(120% 90% at 50% 40%,#21123c 0%,#160c2a 55%,#0c0618 100%);opacity:0;transition:opacity .3s ease;overflow:hidden;
  --lt-pad-t:max(12px,env(safe-area-inset-top));--lt-pad-r:max(14px,env(safe-area-inset-right));--lt-pad-b:max(12px,env(safe-area-inset-bottom));--lt-pad-l:max(14px,env(safe-area-inset-left))}
.lt-ov.on{opacity:1}.lt-ov.out{opacity:0;pointer-events:none}
.lt-ov.lt-ov.mg-overlay{background:radial-gradient(120% 90% at 50% 40%,#21123c 0%,#160c2a 55%,#0c0618 100%)}
.lt-ov iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent;color-scheme:normal;opacity:0;transition:opacity .45s ease}
.lt-ov iframe.lista{opacity:1}
.lt-top{position:absolute;left:var(--lt-pad-l);right:var(--lt-pad-r);top:var(--lt-pad-t);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;pointer-events:none}
.lt-tit{min-width:0;pointer-events:none;text-shadow:0 1px 10px rgba(8,3,18,.85)}
.lt-tit small{display:block;color:#ff9bd6;font:600 11px/1.3 var(--f-cond,sans-serif);letter-spacing:.16em;text-transform:uppercase}
.lt-tit b{display:block;color:#f4ecff;font:600 clamp(19px,2.3vw,26px)/1.12 var(--f-cond,sans-serif);letter-spacing:.01em;margin-top:2px}
.lt-acc{display:flex;gap:8px;pointer-events:auto;flex:none}
.lt-bt{width:40px;height:40px;border-radius:50%;border:0;display:grid;place-items:center;cursor:pointer;color:#f4ecff;background:rgba(22,12,42,.62);box-shadow:inset 0 0 0 1px rgba(236,220,255,.16);
  backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);transition:background .2s,box-shadow .2s,transform .09s}
.lt-bt:hover{background:rgba(60,28,92,.75)}.lt-bt:active{transform:scale(.94)}
.lt-bt svg{width:19px;height:19px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.lt-bt.off{color:rgba(244,236,255,.5)}
.lt-zoom{position:absolute;right:var(--lt-pad-r);top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:8px}
.lt-zoom .lt-bt{width:36px;height:36px}
.lt-pie{position:absolute;left:var(--lt-pad-l);right:var(--lt-pad-r);bottom:var(--lt-pad-b);display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none}
.lt-sub{max-width:min(62ch,100%);text-align:center;color:#fff;font:500 clamp(15px,1.55vw,18px)/1.38 var(--f-ui,sans-serif);text-wrap:balance;text-shadow:0 1px 3px rgba(8,3,18,.9),0 0 18px rgba(8,3,18,.8);
  min-height:1.38em;opacity:0;transform:translateY(6px);transition:opacity .35s ease,transform .35s ease}
.lt-sub.on{opacity:1;transform:none}
.lt-fila{display:flex;align-items:flex-end;gap:10px;width:100%;justify-content:center;pointer-events:none}
.lt-pasos{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;pointer-events:auto;min-width:0}
.lt-pasos button{display:flex;align-items:center;gap:7px;padding:6px 12px 6px 6px;border:0;border-radius:999px;cursor:pointer;color:#d9ccf2;text-align:left;white-space:normal;
  background:rgba(22,12,42,.62);box-shadow:inset 0 0 0 1px rgba(236,220,255,.12);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
  font:600 13px/1.15 var(--f-ui,sans-serif);transition:background .2s,box-shadow .2s,color .2s,transform .09s;animation:ltPaso .3s ease backwards;animation-delay:calc(120ms + var(--k) * 30ms)}
.lt-pasos button:active{transform:scale(.97)}
.lt-pasos i{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font:600 12px/1 var(--f-cond,sans-serif);font-style:normal;color:#fff;background:rgba(255,255,255,.08)}
.lt-pasos .hist i{font-size:0}.lt-pasos .hist i::after{content:'';width:8px;height:8px;border-radius:50%;background:currentColor}
.lt-pasos .hecho i{background:linear-gradient(135deg,#7dffb0,#1fa864);font-size:0}
.lt-pasos .hecho i::after{content:'';width:8px;height:4px;margin-top:-2px;border:solid #fff;border-width:0 0 2px 2px;transform:rotate(-45deg)}
.lt-pasos .on{background:rgba(255,122,200,.2);box-shadow:inset 0 0 0 1.5px #ff7ac8;color:#fff}
.lt-pasos .on i{background:#ff7ac8}
.lt-sigue{pointer-events:auto;flex:none;border:0;cursor:pointer;border-radius:999px;padding:0 20px;min-height:40px;color:#fff;font:600 15px/1 var(--f-cond,sans-serif);letter-spacing:.04em;
  background:linear-gradient(135deg,#ff5fb8,#a23cf0);box-shadow:0 6px 20px rgba(162,60,240,.35);transition:transform .09s,filter .2s}
.lt-sigue:hover{filter:brightness(1.08)}.lt-sigue:focus-visible,.lt-bt:focus-visible,.lt-pasos button:focus-visible{outline:2px solid rgba(255,255,255,.7);outline-offset:2px}.lt-sigue:active{transform:scale(.96)}
.lt-ayuda{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;color:rgba(244,236,255,.85);font:500 13px/1.3 var(--f-ui,sans-serif);
  background:rgba(12,6,24,.6);padding:8px 14px;border-radius:999px;opacity:0;transition:opacity .4s}
.lt-ayuda.on{opacity:1}
@keyframes ltPaso{from{opacity:0;transform:translateY(8px)}}
@media (max-height:500px){.lt-tit b{font-size:18px}.lt-tit small{font-size:10px}.lt-bt{width:34px;height:34px}.lt-bt svg{width:16px;height:16px}.lt-zoom .lt-bt{width:32px;height:32px}
  .lt-pie{gap:6px}.lt-sub{font-size:14px;line-height:1.3}.lt-pasos{gap:5px}.lt-pasos button{padding:4px 10px 4px 4px;font-size:12px}.lt-pasos i{width:19px;height:19px;font-size:11px}.lt-sigue{min-height:34px;font-size:14px;padding:0 16px}}
@media (max-width:620px){.lt-zoom{top:auto;bottom:calc(var(--lt-pad-b) + 120px);transform:none}}
@media (prefers-reduced-motion:reduce){.lt-pasos button{animation:none}}`;
// (dentro de la lámina: a pantalla entera, sin las esquinas, la leyenda ni el pie, que ya cuentan el visor y el narrador)
const CSS_DENTRO = `:root,html,body{color-scheme:normal!important}html,body{height:100%;margin:0;overflow:hidden;background:transparent!important}
body.en-juego .iso-page{width:100vw!important;height:100vh!important;margin:0!important;max-width:none!important;padding:0!important}
body.en-juego .iso-figure,body.en-juego .iso-plate{height:100%;margin:0!important;padding:0!important;background:transparent!important;box-shadow:none!important;border-radius:0}
body.en-juego .iso-plate-corners,body.en-juego .iso-legend{display:none!important}
body.en-juego .iso-stage{position:fixed;inset:0;cursor:zoom-in;outline:none}
body.en-juego .iso-stage.arrastra{cursor:grabbing}
body.en-juego .iso-stage svg{width:100%!important;height:100%!important;overflow:hidden!important;transform-origin:50% 50%;will-change:auto}`;
const ICON = {
  cerrar: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  voz: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  mudo: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
  mas: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  menos: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  encuadre: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
};
let css = false;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const VOZ = (id, k) => `./anatomia/voz/${id}-${k}.mp3`;

// la cámara de la lámina: el viewBox del dibujo (acercar, alejar, mover; siempre nítido, es vectorial) y un giro en
// perspectiva (el ángulo). Va dentro del iframe, que es del mismo sitio.
function camara(fr, alTocar, alTecla, margen = () => ({ t: 0, b: 0 })) {
  const d = fr.contentDocument, w = fr.contentWindow;
  const svg = d?.querySelector('.iso-stage svg'); if (!svg) return null;
  const st = d.createElement('style'); st.textContent = CSS_DENTRO; d.head.appendChild(st);
  const stage = svg.parentElement, b0 = svg.viewBox.baseVal, V = { x: b0.x, y: b0.y, w: b0.width, h: b0.height };
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const caja = () => { const r = stage.getBoundingClientRect(); return { r, a: r.width / Math.max(1, r.height) }; };
  // (el encuadre entero: la lámina entera con un poco de aire, ajustado a la forma de la pantalla)
  const base = () => { const { a } = caja(); const bw = Math.max(V.w * 1.06, V.h * 1.06 * a); return { bw, bh: bw / a }; };
  const cam = { cx: V.x + V.w / 2, cy: V.y + V.h / 2, z: 1, rx: 0, ry: 0 }, meta = { ...cam };
  let manual = false, orbita = 0, raf = 0, last = 0, vivo = true;
  // (el centro de la vista va al centro del hueco libre, entre el título de arriba y el subtítulo y los pasos de abajo)
  const hueco = () => { const { r } = caja(), m = margen(); return { H: r.height, t: m.t, b: m.b, f: Math.max(0.35, (r.height - m.t - m.b) / Math.max(1, r.height)) }; };
  const vista = () => { const { bw, bh } = base(), vw = bw / cam.z, vh = bh / cam.z, h = hueco(); return { x: cam.cx - vw / 2, y: cam.cy - vh / 2 + vh * ((h.b - h.t) / 2) / Math.max(1, h.H), w: vw, h: vh }; };
  const pinta = () => {
    const v = vista(); svg.setAttribute('viewBox', `${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.w.toFixed(2)} ${v.h.toFixed(2)}`);
    svg.style.transform = `perspective(1500px) rotateX(${cam.rx.toFixed(2)}deg) rotateY(${cam.ry.toFixed(2)}deg)`;
  };
  const limita = (m) => { m.z = clamp(m.z, 1, 5); m.cx = clamp(m.cx, V.x, V.x + V.w); m.cy = clamp(m.cy, V.y, V.y + V.h); };
  const tick = (now) => {
    if (!vivo) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
    if (orbita) { orbita += dt; meta.ry = Math.sin(orbita * 0.35) * 7; meta.rx = 5 + Math.sin(orbita * 0.23) * 2; }
    const k = 1 - Math.exp(-dt / (manual ? 0.12 : 0.55));
    for (const p of ['cx', 'cy', 'z', 'rx', 'ry']) cam[p] += (meta[p] - cam[p]) * k;
    pinta(); raf = w.requestAnimationFrame(tick);
  };
  raf = w.requestAnimationFrame(tick);
  // (la caja de las piezas que trabajan en este paso, en unidades del dibujo: su getBBox y los transform de sus padres
  // hasta el svg; sin getScreenCTM, que mezcla el viewBox y el giro de la cámara)
  const lit = () => {
    const L = [...svg.querySelectorAll('[data-lit]')]; if (!L.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of L) {
      let bb; try { bb = n.getBBox(); } catch { continue; } if (!bb || (!bb.width && !bb.height)) continue;
      let m = svg.createSVGMatrix();
      for (let e = n; e && e !== svg; e = e.parentNode) { const t = e.transform?.baseVal?.consolidate?.(); if (t) m = t.matrix.multiply(m); }
      for (const [px, py] of [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]]) {
        const x = m.a * px + m.c * py + m.e, y = m.b * px + m.d * py + m.f; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
    return isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
  };
  const API = {
    encuadra(intro) { manual = false; orbita = intro ? 0.001 : 0; Object.assign(meta, { cx: V.x + V.w / 2, cy: V.y + V.h / 2, z: 1, rx: intro ? 5 : 0, ry: 0 }); },
    // la cámara del paso i: hacia lo que trabaja, más cerca, y de otro lado
    paso(i) {
      manual = false; orbita = 0;
      const b = lit(), { bw, bh } = base();
      const ang = [[9, -8], [7, 8], [10, -5], [6, 9], [9, -9], [7, 6]][i % 6];
      if (!b) { Object.assign(meta, { cx: V.x + V.w / 2, cy: V.y + V.h / 2, z: 1.15, rx: ang[0], ry: ang[1] }); return; }
      const h = hueco(), z = clamp(Math.min(bw / Math.max(b.w, 1), bh * h.f / Math.max(b.h, 1)) * 0.8, 1.08, h.H < 500 ? 2.1 : 2.4);
      Object.assign(meta, { cx: b.x + b.w / 2, cy: b.y + b.h / 2, z, rx: ang[0], ry: ang[1] }); limita(meta);
    },
    acerca(f, px, py) {
      manual = true; orbita = 0; const v = vista();
      const x = px == null ? meta.cx : v.x + px * v.w, y = py == null ? meta.cy : v.y + py * v.h, z2 = clamp(meta.z * f, 1, 5), s = meta.z / z2;
      meta.cx = x - (x - meta.cx) * s; meta.cy = y - (y - meta.cy) * s; meta.z = z2; limita(meta); alTocar?.();
    },
    mueve(dx, dy) { manual = true; orbita = 0; const v = vista(), { r } = caja(); meta.cx -= dx * v.w / r.width; meta.cy -= dy * v.h / r.height; limita(meta); Object.assign(cam, { cx: meta.cx, cy: meta.cy }); },
    get z() { return meta.z; },
    destruye() { vivo = false; w.cancelAnimationFrame(raf); },
  };
  // el ratón, el dedo y la rueda: la lámina ya no cambia de paso al pasar el ratón (eso lo llevan el narrador y los pasos)
  const pts = new Map(); let arr = null, pin = null;
  const rel = (e) => { const { r } = caja(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  const corta = (e) => { e.stopImmediatePropagation(); };
  w.addEventListener('pointermove', (e) => {
    corta(e); if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2 && pin) { const [a, b] = [...pts.values()], dd = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pin.d) API.acerca(dd / pin.d, ...rel({ clientX: (a[0] + b[0]) / 2, clientY: (a[1] + b[1]) / 2 })); pin.d = dd; return; }
    if (arr) { const dx = e.clientX - arr.x, dy = e.clientY - arr.y; if (!arr.mov && Math.hypot(dx, dy) > 6) { arr.mov = true; stage.classList.add('arrastra'); } if (arr.mov) { API.mueve(dx, dy); arr.x = e.clientX; arr.y = e.clientY; alTocar?.(); } }
  }, true);
  w.addEventListener('pointerdown', (e) => {
    corta(e); pts.set(e.pointerId, [e.clientX, e.clientY]); try { stage.setPointerCapture(e.pointerId); } catch {}
    if (pts.size === 2) { arr = null; pin = { d: 0 }; } else { arr = { x: e.clientX, y: e.clientY, mov: false }; pin = null; }
  }, true);
  const suelta = (e) => {
    corta(e); const fue = arr; pts.delete(e.pointerId); if (pts.size < 2) pin = null;
    if (fue && !fue.mov && e.type === 'pointerup' && pts.size === 0) {
      // un toque en la lámina: se amplía ahí; si ya está muy cerca, vuelve al encuadre del paso
      if (meta.z > 3.6) alTocar?.('vuelve'); else API.acerca(1.8, ...rel(e));
    }
    arr = null; stage.classList.remove('arrastra');
  };
  w.addEventListener('pointerup', suelta, true); w.addEventListener('pointercancel', suelta, true);
  w.addEventListener('wheel', (e) => { corta(e); e.preventDefault(); API.acerca(Math.exp(-e.deltaY * 0.0016), ...rel(e)); }, { capture: true, passive: false });
  w.addEventListener('keydown', (e) => { corta(e); alTecla?.(e); }, true);
  w.addEventListener('dblclick', (e) => corta(e), true);
  w.addEventListener('resize', () => pinta());
  return API;
}

/** Abre la lámina técnica id; se resuelve al cerrarla. Si no hay lámina con ese id, o en las pruebas, no hace nada.
 *  paso: la abre en ese paso (y el narrador cuenta solo ese); hechos: los pasos que ya se han hecho en el taller (con su
 *  marca). Sin paso, el narrador cuenta la historia del oficio y luego todos los pasos, uno tras otro. */
export function laminaTecnica(ui, id, { button = 'Seguir', paso = null, hechos = [], kicker = '' } = {}) {
  const L = LAMINAS_TEC[id];
  if (!L || window.__autoWin) return Promise.resolve();
  if (!css) { css = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
  return new Promise((res) => {
    ui?.closeModal?.(); ui?.sound?.ui?.('card');
    const N = NARRA[id], mudo = SIN_VOZ.has(id), hecho = new Set(hechos);
    let PS = LAMINA_PASOS[id] || null;
    const chips = (lista) => (N ? `<button type="button" class="hist" data-i="h" style="--k:0"><i></i><span>Historia</span></button>` : '')
      + lista.map((t, i) => `<button type="button" data-i="${i}" style="--k:${i + 1}" class="${hecho.has(i) ? 'hecho' : ''}"><i>${i + 1}</i><span>${esc(t)}</span></button>`).join('');
    const o = el(`<div class="lt-ov mg-overlay" role="dialog" aria-label="${esc(L.title)}">
      <iframe src="./anatomia/${id}.html?juego${paso != null ? '&paso=' + paso : ''}" title="${esc(L.title)}" loading="eager"></iframe>
      <div class="lt-top"><div class="lt-tit"><small>${esc(kicker || L.kicker)}</small><b>${esc(L.title)}</b></div>
        <div class="lt-acc">${N && !mudo ? `<button type="button" class="lt-bt" data-a="voz" aria-label="Narrador">${ICON.voz}</button>` : ''}<button type="button" class="lt-bt" data-a="cerrar" aria-label="Cerrar">${ICON.cerrar}</button></div></div>
      <div class="lt-zoom"><button type="button" class="lt-bt" data-a="mas" aria-label="Acercar">${ICON.mas}</button><button type="button" class="lt-bt" data-a="menos" aria-label="Alejar">${ICON.menos}</button><button type="button" class="lt-bt" data-a="encuadre" aria-label="Ver entera">${ICON.encuadre}</button></div>
      <div class="lt-ayuda">Toca la lámina para acercarte</div>
      <div class="lt-pie"><div class="lt-sub" aria-live="polite"></div>
        <div class="lt-fila"><div class="lt-pasos" role="tablist" aria-label="Paso a paso">${PS ? chips(PS) : ''}</div><button type="button" class="lt-sigue">${esc(button)}</button></div></div>
    </div>`);
    const fr = o.querySelector('iframe'), sub = o.querySelector('.lt-sub'), pasosEl = o.querySelector('.lt-pasos'), ayuda = o.querySelector('.lt-ayuda');
    let cam = null, actual = paso, voz = null, vozOn = true, cola = [], cerrado = false, tSub = 0, espera = null, tEspera = 0;
    const botones = () => [...pasosEl.querySelectorAll('button')];
    const enciende = (k) => botones().forEach((b) => { const on = b.dataset.i === String(k); b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    const subtitulo = (t) => { clearTimeout(tSub); sub.classList.remove('on'); tSub = setTimeout(() => { sub.textContent = t || ''; if (t) sub.classList.add('on'); }, t ? 180 : 0); };
    // ir a un paso: la lámina se mueve a él y la cámara, cuando ya está encendida la pieza, se acerca y gira
    const vaPaso = (i) => {
      actual = i; enciende(i);
      fr.contentWindow?.postMessage({ anatomia: 'paso', i }, '*');
      // (la cámara mide la pieza encendida cuando la lámina dice que ya está en ese paso; si no lo dice, al rato)
      espera = i; clearTimeout(tEspera); tEspera = setTimeout(() => { if (!cerrado && espera === i) { espera = null; cam?.paso(i); } }, 1600);
    };
    // el narrador: una cola de trozos (h, 0, 1...); cada uno suena con su subtítulo y, al acabar, el siguiente
    const para = () => { if (voz) { voz.onended = null; voz.pause(); voz = null; } };
    const suena = () => {
      para(); if (cerrado) return;
      const k = cola.shift(); if (k == null) { enciende(actual); return; }
      const x = narraTexto(k === 'h' ? N.h : N.p[k]);
      if (k === 'h') { enciende('h'); cam?.encuadra(true); fr.contentWindow?.postMessage({ anatomia: 'tour' }, '*'); } else vaPaso(k);
      subtitulo(x.t);
      if (!vozOn || mudo) { voz = null; const t = setTimeout(suena, 1200 + x.t.length * 55); voz = { pause: () => clearTimeout(t) }; return; }
      const a = new Audio(VOZ(id, k)); voz = a; a.volume = 1;
      a.onended = () => { if (voz === a) setTimeout(() => { if (voz === a) suena(); }, 650); };
      a.onerror = () => { if (voz === a) setTimeout(() => { if (voz === a) suena(); }, 1200 + x.t.length * 55); };
      a.play().catch(() => { /* (sin permiso para sonar: el subtítulo sigue y pasa solo) */ a.onerror(); });
    };
    const cuenta = (desde) => { if (!N) return; const n = N.p.length; cola = desde === 'h' ? ['h', ...Array.from({ length: n }, (_, i) => i)] : Array.from({ length: n - desde }, (_, i) => desde + i); if (paso != null && desde !== 'h') cola = [desde]; suena(); };
    const chip = (b) => {
      ui?.sound?.ui?.('click'); const k = b.dataset.i;
      if (N) { cola = []; para(); cuenta(k === 'h' ? 'h' : +k); }
      else vaPaso(+k);
    };
    pasosEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) chip(b); });
    // (la lámina dice qué pasos tiene y en cuál está; sin narrador, la ficha encendida sigue a la lámina)
    const oye = (e) => {
      if (e.source !== fr.contentWindow) return; const d = e.data || {};
      if (d.anatomia === 'lista' && !PS && Array.isArray(d.pasos)) { PS = d.pasos; pasosEl.innerHTML = chips(PS); if (actual != null) enciende(actual); }
      if (d.anatomia === 'en' && d.i === espera) { espera = null; clearTimeout(tEspera); setTimeout(() => { if (!cerrado && actual === d.i) cam?.paso(d.i); }, 260); }
      if (d.anatomia === 'en' && !N && actual == null) enciende(d.i);
    };
    addEventListener('message', oye);
    fr.addEventListener('load', () => {
      const top = o.querySelector('.lt-top'), pie = o.querySelector('.lt-pie');
      const margen = () => { const R = o.getBoundingClientRect(), a = top.getBoundingClientRect(), b = pie.getBoundingClientRect(); return { t: a.bottom - R.top, b: R.bottom - b.top }; };
      cam = camara(fr, (q) => { ayuda.classList.remove('on'); if (q === 'vuelve') actual != null && actual !== 'h' ? cam.paso(actual) : cam.encuadra(); }, (e) => tecla(e), margen);
      fr.classList.add('lista');
      setTimeout(() => { if (!cerrado && cam && cam.z < 1.01) ayuda.classList.add('on'); }, 2600); setTimeout(() => ayuda.classList.remove('on'), 6500);
      if (N) setTimeout(() => cuenta(paso != null ? paso : 'h'), 500);
      else if (paso != null) vaPaso(paso); else cam?.encuadra(true);
    });
    o.querySelector('.lt-acc').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'cerrar') return cierra();
      if (b.dataset.a === 'voz') { vozOn = !vozOn; b.classList.toggle('off', !vozOn); b.innerHTML = vozOn ? ICON.voz : ICON.mudo; if (voz && voz.muted !== undefined) voz.muted = !vozOn; ui?.sound?.ui?.('click'); }
    });
    o.querySelector('.lt-zoom').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || !cam) return; ui?.sound?.ui?.('click'); ayuda.classList.remove('on');
      if (b.dataset.a === 'mas') cam.acerca(1.5); else if (b.dataset.a === 'menos') cam.acerca(1 / 1.5); else actual != null && actual !== 'h' ? cam.paso(actual) : cam.encuadra();
    });
    document.body.appendChild(o); if (ui) ui.modal = o;
    requestAnimationFrame(() => o.classList.add('on'));
    const bSigue = o.querySelector('.lt-sigue');
    const tecla = (e) => {
      const t = (e.key || '').toLowerCase();
      if (['enter', 'escape', 'e'].includes(t)) { e.preventDefault(); cierra(); }
      else if (t === '+' || t === '=') cam?.acerca(1.4); else if (t === '-') cam?.acerca(1 / 1.4);
    };
    const k = windowKeys((e) => { e.stopImmediatePropagation(); tecla(e); });
    const cierra = () => {
      if (cerrado) return; cerrado = true; cola = []; para(); clearTimeout(tSub); clearTimeout(tEspera);
      ui?.sound?.ui?.('click'); removeEventListener('keydown', k, true); removeEventListener('message', oye); cam?.destruye(); o.classList.add('out');
      setTimeout(() => o.remove(), 320); if (ui && ui.modal === o) ui.modal = null; res();
    };
    addEventListener('keydown', k, true); bSigue.onclick = cierra;
  });
}
