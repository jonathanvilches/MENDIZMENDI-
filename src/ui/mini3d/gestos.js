// Los pasos de los talleres, con las manos: cada oficio se juega con su gesto de verdad, y no pulsando un botón cuando
// una raya pasa por una zona. El hachazo es un tajo con el dedo; el cantero lleva el puntero con una mano y da con la
// maceta con la otra; los aros bajan a golpes a un lado y a otro sin que se tuerzan; la herradura se enfría dando
// vueltas en el agua sin soltar las tenazas; la cesta se teje siguiendo la tira por delante y por detrás de las varas;
// una mano hace girar el huso y la otra estira la lana; el pan entra con la pala y un tirón; la paleta se lanza adonde
// va a pasar el bando; las redes caen tirando de las dos cuerdas a la vez; la piedra sube con una mano y otra y un golpe
// de piernas; las fugas de la carbonera se tapan tocándolas; la masa se empuja, se dobla y se gira.
// Con teclado o con el mando, las flechas y un botón (mando/contextos.js, tabla FIJOS). Las escenas, en trades.js.
import * as THREE from 'three';
import { play3d, blip } from './play.js';
import { montar, escenario } from './trades.js';
import { iconSVG } from '../icons.js';
import { esc } from '../../util/html.js';

const U = () => Math.min(innerWidth, innerHeight);   // la medida de los gestos: el lado corto de la pantalla
const ahora = () => performance.now() / 1000;
const clamp = THREE.MathUtils.clamp;
const NS = 'http://www.w3.org/2000/svg';
const ruido = (ui, d, f, q, v) => ui.sound?.noiseBurst?.(d, f, q, v, ui.sound.sfx);

// ------------------------------------------------------------------------------------------------ los dedos
// Los dedos que tocan la escena (varios a la vez: las dos manos). Cada uno lleva por dónde ha ido (los últimos 0,35 s),
// de qué lado de la pantalla empezó y cuánto ha girado su rumbo (dar vueltas con el dedo, esté donde esté el centro).
// Con ratón, además, por dónde pasa sin pulsar.
function dedos(H, S) {
  const P = new Map(), fns = { down: [], move: [], up: [], hover: [] };
  const fire = (k, d) => { for (const f of fns[k]) f(d); };
  const down = (e) => {
    e.preventDefault(); const t = ahora();
    const d = { id: e.pointerId, raton: e.pointerType === 'mouse', x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: t, t, lado: e.clientX < innerWidth / 2 ? 'L' : 'R', pista: [{ x: e.clientX, y: e.clientY, t }], giro: 0, rumbo: null };
    P.set(e.pointerId, d); fire('down', d);
  };
  const move = (e) => {
    const d = P.get(e.pointerId);
    if (!d) { if (e.pointerType === 'mouse') fire('hover', { x: e.clientX, y: e.clientY }); return; }
    const t = ahora();
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 2.5) { const r = Math.atan2(e.clientY - d.y, e.clientX - d.x); if (d.rumbo != null) d.giro += Math.atan2(Math.sin(r - d.rumbo), Math.cos(r - d.rumbo)); d.rumbo = r; }
    d.x = e.clientX; d.y = e.clientY; d.t = t; d.pista.push({ x: d.x, y: d.y, t });
    while (d.pista.length > 2 && t - d.pista[0].t > 0.35) d.pista.shift();
    fire('move', d);
  };
  const up = (e) => { const d = P.get(e.pointerId); if (!d) return; P.delete(e.pointerId); fire('up', d); };
  H.cap.addEventListener('pointerdown', down);
  addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  S.own({ dispose: () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); } });
  return { P, on(k, f) { fns[k].push(f); }, de: (lado) => { for (const d of P.values()) if (!d.raton && d.lado === lado) return d; return null; } };
}
// la velocidad del dedo en los últimos «win» segundos, en pantallas (lado corto) por segundo; quieto, cero
function vel(d, win = 0.08) {
  const L = d.pista, b = L[L.length - 1]; if (ahora() - b.t > 0.12) return { vx: 0, vy: 0 };
  let a = L[0]; for (let i = L.length - 2; i >= 0; i--) { a = L[i]; if (b.t - a.t >= win) break; }
  const dt = Math.max(0.012, b.t - a.t), u = U(); return { vx: (b.x - a.x) / dt / u, vy: (b.y - a.y) / dt / u };
}
// lo que gira cada dedo (rad/s), con el tiempo de verdad de sus movimientos y suavizado con su signo: ir y volver no
// cuenta como dar vueltas; quieto, cero
function giros(D) {
  const prev = new Map();
  D.on('up', (d) => prev.delete(d.id));
  return (d) => {
    const q = prev.get(d.id); if (!q) { prev.set(d.id, { g: d.giro, t: d.t, s: 0 }); return 0; }
    if (d.t > q.t) { const dt = d.t - q.t; q.s += ((d.giro - q.g) / Math.max(0.008, dt) - q.s) * Math.min(1, dt * 5); q.g = d.giro; q.t = d.t; }
    return ahora() - d.t > 0.12 ? (q.s = 0) : Math.abs(q.s);
  };
}

// ------------------------------------------------------------------------------------------------ las teclas
// las flechas (también WASD) y el botón (espacio, intro o E); el mando del móvil y los de verdad mandan estas teclas.
// Escape sale.
const TECLA = { a: 'izq', arrowleft: 'izq', d: 'der', arrowright: 'der', w: 'arr', arrowup: 'arr', s: 'aba', arrowdown: 'aba', ' ': 'boton', enter: 'boton', e: 'boton' };
function teclas(H, S) {
  const abajo = new Set(), fns = [];
  H.keys((e) => {
    const key = e.key.toLowerCase(); if (key === 'escape') { H.x[0]?.click(); return; }
    const k = TECLA[key]; if (!k) return; e.preventDefault(); if (e.repeat) return; abajo.add(k); for (const f of fns) f(k);
  });
  const up = (e) => { const k = TECLA[e.key?.toLowerCase()]; if (k) abajo.delete(k); };
  addEventListener('keyup', up, true); S.own({ dispose: () => removeEventListener('keyup', up, true) });
  return { abajo, on(f) { fns.push(f); } };
}

// ------------------------------------------------------------------------------------------------ el dibujo
// Una capa encima de la escena (sin recoger toques) con las marcas, las flechas, las manos y la mano fantasma.
function capa(H, S) {
  const o = document.createElement('div'); o.className = 'm3-gest'; H.cap.after(o);
  const svg = document.createElementNS(NS, 'svg'); o.appendChild(svg);
  const fit = () => svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`); fit();
  addEventListener('resize', fit); S.own({ dispose: () => removeEventListener('resize', fit) });
  return {
    f(tag, cls) { const e = document.createElementNS(NS, tag); e.setAttribute('class', cls); svg.appendChild(e); return e; },
    div(cls, html = '') { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; o.appendChild(e); return e; },
  };
}
const at = (e, a) => { for (const k in a) e.setAttribute(k, typeof a[k] === 'number' ? a[k].toFixed(1) : a[k]); return e; };
const pon = (e, x, y) => { e.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; };
const ve = (e, v) => { e.style.display = v ? '' : 'none'; };
// una marca (un anillo que late) donde va el gesto
function anillo(C, base = '') {
  const g = C.f('g', 'g-anillo ' + base), a = document.createElementNS(NS, 'circle'), b = document.createElementNS(NS, 'circle');
  a.setAttribute('class', 'g-ar'); b.setAttribute('class', 'g-ap'); g.append(a, b); let k0 = null;
  return { set(x, y, r) { at(a, { cx: x, cy: y, r }); at(b, { cx: x, cy: y, r: r * 0.22 }); }, cls(k = '') { if (k !== k0) { k0 = k; g.setAttribute('class', `g-anillo ${base} ${k}`); } }, ver(v) { ve(g, v); } };
}
// una flecha: un trazo discontinuo que corre hacia su punta (la dirección del gesto)
function flecha(C, base = '') {
  const g = C.f('g', 'g-flecha ' + base), l = document.createElementNS(NS, 'path'), h = document.createElementNS(NS, 'path');
  l.setAttribute('class', 'g-fl'); h.setAttribute('class', 'g-fp'); g.append(l, h); let k0 = null;
  return {
    set(x1, y1, x2, y2) {
      const a = Math.atan2(y2 - y1, x2 - x1), s = Math.max(14, U() * 0.04), f = (v) => v.toFixed(1);
      l.setAttribute('d', `M${f(x1)} ${f(y1)}L${f(x2 - Math.cos(a) * s * 0.7)} ${f(y2 - Math.sin(a) * s * 0.7)}`);
      h.setAttribute('d', `M${f(x2)} ${f(y2)}L${f(x2 - Math.cos(a - 0.55) * s)} ${f(y2 - Math.sin(a - 0.55) * s)}L${f(x2 - Math.cos(a + 0.55) * s)} ${f(y2 - Math.sin(a + 0.55) * s)}Z`);
    },
    cls(k = '') { if (k !== k0) { k0 = k; g.setAttribute('class', `g-flecha ${base} ${k}`); } }, ver(v) { ve(g, v); },
  };
}
// las dos manos, a los lados de la pantalla: qué hace cada una; se encienden mientras se toca con ella
function manos(C, izq, der) {
  const m = (lado, txt) => C.div(`g-mano ${lado}`, `${iconSVG('hand', 30)}<b>${esc(txt)}</b>`);
  const L = m('l', izq), R = m('r', der); let p0 = null, t0 = -9, pl = null, pr = null;
  // (dónde está cada una; se mide como mucho dos veces por segundo, no en cada fotograma)
  const mide = () => { if (ahora() - t0 > 0.5) { t0 = ahora(); const c = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }; pl = c(L); pr = c(R); } };
  return {
    on(lado, v) { (lado === 'L' ? L : R).classList.toggle('on', v); },
    pide(lado = '') { if (lado === p0) return; p0 = lado; L.classList.toggle('pide', lado.includes('L')); R.classList.toggle('pide', lado.includes('R')); },
    toca(lado) { const e = lado === 'L' ? L : R; e.classList.remove('toc'); void e.offsetWidth; e.classList.add('toc'); },
    get l() { mide(); return pl; }, get r() { mide(); return pr; },
  };
}
// la mano fantasma que enseña el gesto al empezar (y otra vez si pasa un rato sin acertar): fn(t) dice dónde está cada
// dedo, [{ x, y, pisa }], en el segundo t de la demostración
function demo(C, fn) {
  const ds = [C.div('g-dedo'), C.div('g-dedo')]; let t = 0, on = true;
  return {
    tick(dt) { t += dt; const q = (on && fn(t)) || []; ds.forEach((d, i) => { const p = q[i]; d.classList.toggle('ve', !!p); if (p) { pon(d, p.x, p.y); d.classList.toggle('pisa', !!p.pisa); } }); },
    para() { on = false; }, sigue() { if (!on) { on = true; t = 0; } },
  };
}
// unas fichas (las paletas que quedan, las llamas)
function fichas(C, n, dibujo, cls) {
  const e = C.div('g-fichas ' + cls, Array.from({ length: n }, () => `<i>${dibujo}</i>`).join(''));
  return (k) => e.querySelectorAll('i').forEach((i, j) => i.classList.toggle('off', j >= k));
}
const scr = (S, v) => S.toScreen(v);

// ------------------------------------------------------------------------------------------------ el juego
// Lo común: el avance (p), el último golpe (hit: el tiempo desde él, y ok: si fue bueno) que anima la escena, lo que
// la escena necesita del gesto (o), el reloj y los mensajes. Un mensaje de un golpe se lee un momento antes de que lo
// tape el de la situación (suave).
function base(ui, H, end, over) {
  const J = {
    p: 0, hit: 9, ok: true, o: {}, t: 0, limite: 0, empezado: false, bien: ahora(), tg: 0, msg: '', demo: null,
    di(msg) { if (msg && msg !== J.msg) { J.msg = msg; H.fb.textContent = msg; } },
    suave(msg) { if (ahora() - J.tg > 1.4) J.di(msg); },
    golpe(ok, msg) {
      if (over()) return; J.hit = 0; J.ok = ok; J.tg = ahora(); if (msg) J.di(msg); ui.onMiniHit?.(ok);
      if (ok) { J.bien = ahora(); J.demo?.para(); } else ui.sound?.ui?.('error');
    },
    suma(d) { J.p = clamp(J.p + d, 0, 1); if (J.p > 1 - 1e-6) { J.p = 1; J.gana(); } },   // (siete sétimos no suman 1 justo)
    gana(msg = '¡Hecho! ¡Qué manos!') { end({ win: true, hits: 5 }, msg, 1700); },
    pierde(msg = '¡Casi! Prueba otra vez') { end({ win: false, hits: Math.round(J.p * 5) }, msg, 1700); },
  };
  return J;
}

// ------------------------------------------------------------------------------------------------ tajo
// Aizkolari: el hachazo es un tajo con el dedo por la marca, deprisa y en la dirección de la flecha; la V se corta a un
// lado y a otro (la flecha cambia). Cantero (desbaste, «pico»): tajos hacia abajo por los bultos de la piedra, el que
// se quiera. «golpe» (el yunque, la suela): hacia abajo por la marca. Con teclas: la flecha de ese lado.
function tajo(c, modo = 'hacha') {
  const { ui, S, sc, J, D, C, K } = c, N = modo === 'golpe' ? 6 : 8, piedra = modo === 'pico', abajo = modo !== 'hacha';
  J.limite = 25;
  const SITIOS = [0.12, 0.31, 0.5, 0.69, 0.88];
  let lado = 1, espera = 0; const bultos = [0, 2, 4];
  const marcas = () => piedra ? bultos.map(i => ({ ...scr(S, sc.cara(SITIOS[i])), i })) : [scr(S, sc.punto())];
  const dir = () => abajo ? [0, 1] : [lado * Math.SQRT1_2, Math.SQRT1_2];
  const rs = (piedra ? bultos : [0]).map(() => anillo(C)), fs = rs.map(() => flecha(C));
  const da = (m, v) => {
    const fuerte = v >= 2.2;
    if (piedra) { J.o.tx = sc.cara(SITIOS[m.i]).x; const libres = SITIOS.map((_, i) => i).filter(i => !bultos.includes(i)); bultos[bultos.indexOf(m.i)] = libres[Math.random() * libres.length | 0]; }
    else if (!abajo) lado = -lado;
    J.golpe(true, fuerte ? (modo === 'hacha' ? '¡Hachazo!' : '¡Buen golpe!') : '¡Bien!');
    blip(ui, fuerte ? 170 : 210, 0.08, 0.14, 'square'); ruido(ui, 0.06, piedra ? 2400 : 1500, 1.2, 0.25);
    espera = 0.3; J.suma((fuerte ? 1.25 : 1) / N);
  };
  const juzga = (d, fin) => {
    if (d.usado || espera > 0) return;
    const u = U(), dx = d.x - d.x0, dy = d.y - d.y0, len = Math.hypot(dx, dy);
    if (!fin && len < 0.3 * u) return;
    d.usado = true;
    if (len < 0.13 * u) return J.golpe(false, 'Desliza más largo, de un lado a otro de la marca');
    // (la velocidad: la media del trazo o la del último momento, la mayor: si el dedo esperó quieto antes de deslizar,
    // el tajo también vale)
    const [ux, uy] = dir(), cos = (dx * ux + dy * uy) / len, vi = vel(d), v = Math.max(len / u / Math.max(0.04, d.t - d.t0), Math.hypot(vi.vx, vi.vy));
    // la marca por la que pasa el trazo (la más cercana a él)
    let m = null; for (const q of marcas()) { const t = clamp(((q.x - d.x0) * dx + (q.y - d.y0) * dy) / (len * len), 0, 1), e = Math.hypot(d.x0 + dx * t - q.x, d.y0 + dy * t - q.y) / u; if (!m || e < m.e) m = { ...q, e }; }
    if (cos < 0.55) return J.golpe(false, abajo ? '¡Hacia abajo!' : lado > 0 ? 'Sigue la flecha: abajo y a la derecha' : 'Sigue la flecha: abajo y a la izquierda');
    if (m.e > 0.12) return J.golpe(false, piedra ? 'Pasa por un bulto de la piedra' : 'Pasa por la marca');
    if (v < 0.9) return J.golpe(false, '¡Más fuerte! Desliza más deprisa');
    da(m, v);
  };
  D.on('move', (d) => juzga(d, false)); D.on('up', (d) => juzga(d, true));
  K.on((k) => {
    if (espera > 0) return;
    if (piedra) { const L = marcas().sort((a, b) => a.x - b.x), m = { izq: L[0], aba: L[1], boton: L[1], der: L[2] }[k]; if (m) da(m, 1.5); return; }
    if (abajo) { if (k === 'aba' || k === 'boton') da(null, 1.5); return; }
    if (k === 'izq' || k === 'der') { if ((k === 'der') === (lado > 0)) da(null, 1.5); else J.golpe(false, lado > 0 ? 'Este tajo va hacia la derecha' : 'Este tajo va hacia la izquierda'); }
  });
  return {
    como: piedra ? 'Desliza el dedo hacia abajo, deprisa, por los bultos de la piedra' : abajo ? 'Desliza el dedo hacia abajo, deprisa, por la marca' : 'Desliza el dedo por la marca, deprisa, como dice la flecha',
    teclas: piedra ? 'Teclas: ← ↓ → para cada bulto' : abajo ? 'Tecla: ↓' : 'Teclas: ← o →, el lado de la flecha',
    tick(dt) {
      espera = Math.max(0, espera - dt);
      const M = marcas(), u = U(), [ux, uy] = dir(), L = 0.17 * u;
      M.forEach((m, i) => { rs[i].set(m.x, m.y, 0.045 * u); rs[i].cls(espera > 0 ? 'tenue' : ''); fs[i].set(m.x - ux * L, m.y - uy * L, m.x + ux * L, m.y + uy * L); fs[i].cls(espera > 0 ? 'tenue' : ''); });
    },
    demo: demo(C, (t) => { const k = t % 1.8; if (k > 0.95) return null; const m = marcas()[0], [ux, uy] = dir(), L = 0.2 * U(), f = clamp((k - 0.3) / 0.3, 0, 1); return [{ x: m.x + ux * L * (2 * f - 1), y: m.y + uy * L * (2 * f - 1), pisa: k > 0.18 && k < 0.7 }]; }),
    state: () => ({ espera, lado, marcas: marcas(), dir: dir() }),
  };
}

// ------------------------------------------------------------------------------------------------ cincel
// Cantero (talla): con una mano se lleva el puntero a la marca de la cara (se arrastra el dedo en cualquier sitio de
// la izquierda, como en un panel táctil, para no tapar la piedra); con la otra se toca para dar con la maceta. Dos
// golpes en cada marca, de izquierda a derecha. Con ratón: el puntero sigue al ratón y el clic pega. Con teclas: las
// flechas llevan el puntero y el botón pega.
function cincel(c) {
  const { ui, S, sc, J, D, C, K } = c, N = 7, ANCHO = sc.BX * 2 - 0.08;
  J.limite = 45;
  const marcas = Array.from({ length: N }, (_, i) => ({ f: clamp((i + 0.5) / N + (Math.random() - 0.5) * 0.05, 0.04, 0.96), z: (Math.random() * 2 - 1) * sc.BZ * 0.3, n: 0 }));
  const pos = { f: 0.5, z: 0 }, plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -sc.alto), q1 = new THREE.Vector3(), q2 = new THREE.Vector3();
  const enPlano = (x, y, out) => S.rayFrom({ clientX: x, clientY: y }).ray.intersectPlane(plano, out);
  const lleva = (dx, dz) => { pos.f = clamp(pos.f + dx / ANCHO, 0, 1); pos.z = clamp(pos.z + dz, -sc.BZ * 0.8, sc.BZ * 0.8); };
  let k = 0, espera = 0, mano = null;
  const M = manos(C, 'Puntero', 'Maceta'), meta = anillo(C), sig = anillo(C, 'tenue'), punta = anillo(C, 'punta');
  const tolera = () => { const m = marcas[k]; return m && Math.hypot((pos.f - m.f) * ANCHO, pos.z - m.z) <= 0.032; };
  const pega = () => {
    if (espera > 0 || k >= N) return; espera = 0.25; M.toca('R');
    if (!tolera()) return J.golpe(false, 'Primero pon el puntero en la marca');
    const m = marcas[k]; m.n++; blip(ui, 320 + m.n * 70, 0.05, 0.12, 'square'); ruido(ui, 0.05, 3200, 1.5, 0.2);
    if (m.n < 2) return J.golpe(true, '¡Otro golpe!');
    k++; J.golpe(true, k < N ? '¡Bien! A la marca siguiente' : '¡Cara labrada!'); J.suma(1 / N);
  };
  D.on('down', (d) => {
    if (d.raton) { if (enPlano(d.x, d.y, q1)) lleva((q1.x - sc.cara(pos.f).x), q1.z - pos.z); return pega(); }
    if (d.lado === 'L' && mano == null) { mano = d.id; d.px = d.x; d.py = d.y; M.on('L', true); } else pega();
  });
  D.on('move', (d) => { if (d.id !== mano) return; if (enPlano(d.px, d.py, q1) && enPlano(d.x, d.y, q2)) lleva((q2.x - q1.x) * 1.3, (q2.z - q1.z) * 1.3); d.px = d.x; d.py = d.y; });
  D.on('hover', (q) => { if (enPlano(q.x, q.y, q1)) lleva(q1.x - sc.cara(pos.f).x, q1.z - pos.z); });
  D.on('up', (d) => { if (d.id === mano) { mano = null; M.on('L', false); } });
  K.on((key) => { if (key === 'boton') pega(); });
  return {
    como: 'Con una mano lleva el puntero a la marca; con la otra, toca para dar con la maceta',
    teclas: 'Teclas: las flechas llevan el puntero; espacio, la maceta',
    tick(dt) {
      espera = Math.max(0, espera - dt);
      const A = K.abajo; lleva(((A.has('der') ? 1 : 0) - (A.has('izq') ? 1 : 0)) * dt * 0.16, ((A.has('aba') ? 1 : 0) - (A.has('arr') ? 1 : 0)) * dt * 0.1);
      J.o.cx = pos.f; J.o.cz = pos.z;
      const u = U(), m = marcas[k], n = marcas[k + 1], dentro = tolera();
      meta.ver(!!m); if (m) { const q = scr(S, sc.cara(m.f, m.z)); meta.set(q.x, q.y, 0.04 * u); meta.cls(dentro ? 'ok' : ''); }
      sig.ver(!!n); if (n) { const q = scr(S, sc.cara(n.f, n.z)); sig.set(q.x, q.y, 0.03 * u); }
      const p = scr(S, sc.cara(pos.f, pos.z)); punta.set(p.x, p.y, 0.014 * u);
      M.pide(dentro ? 'R' : 'L');
      J.suave(dentro ? '¡Ahí! Dale con la maceta' : 'Lleva el puntero a la marca que brilla');
    },
    demo: demo(C, (t) => { const k = t % 2.6, l = M.l, r = M.r, u = U(); return [{ x: l.x + Math.sin(Math.min(k, 1.3) * 2.4) * 0.06 * u, y: l.y - 0.12 * u + Math.min(k, 1.3) * 0.05 * u, pisa: k < 2.4 }, k > 1.5 && k < 2.4 ? { x: r.x, y: r.y - 0.12 * u, pisa: (k > 1.6 && k < 1.75) || (k > 2.0 && k < 2.15) } : null]; }),
    state: () => { const m = marcas[k]; return { k, pos: { ...pos }, marca: m ? { ...m, ...scr(S, sc.cara(m.f, m.z)) } : null, punta: scr(S, sc.cara(pos.f, pos.z)), dentro: tolera() }; },
  };
}

// ------------------------------------------------------------------------------------------------ aros
// Tonelero: el aro baja a golpes, a un lado (toque a la izquierda) y a otro (a la derecha); si se golpea mucho de un
// lado se tuerce y se atasca, y solo vale golpear el lado alto. El nivel de encima dice hacia dónde se tuerce.
function aros(c) {
  const { ui, S, sc, J, D, C, K } = c;
  J.limite = 16;
  let L = 0, R = 0;
  const M = manos(C, 'Izquierda', 'Derecha');
  const nv = C.f('g', 'g-nivel'), barra = document.createElementNS(NS, 'rect'), zl = document.createElementNS(NS, 'rect'), zr = document.createElementNS(NS, 'rect'), mid = document.createElementNS(NS, 'line'), bur = document.createElementNS(NS, 'circle');
  barra.setAttribute('class', 'g-nb'); zl.setAttribute('class', 'g-nz'); zr.setAttribute('class', 'g-nz'); mid.setAttribute('class', 'g-nm'); bur.setAttribute('class', 'g-nu'); nv.append(barra, zl, zr, mid, bur);
  const pega = (s) => {
    M.toca(s);
    const dif = L - R, alto = dif < 0 ? 'L' : 'R';   // (el lado que ha bajado menos queda alto)
    if (Math.abs(dif) > 0.2 && s !== alto) return J.golpe(false, '¡Se tuerce! Dale al lado alto');
    // (la madera no cede siempre igual; y el otro lado sube un poco, si no ha llegado ya abajo del todo)
    const k = 0.07 + Math.random() * 0.035;
    if (s === 'L') { L = Math.min(1, L + k); if (R < 1) R = Math.max(0, R - 0.012); } else { R = Math.min(1, R + k); if (L < 1) L = Math.max(0, L - 0.012); }
    blip(ui, s === 'L' ? 520 : 610, 0.05, 0.1, 'square'); ruido(ui, 0.04, 4200, 2, 0.18);
    const d = L - R; J.golpe(true, Math.abs(d) > 0.13 ? (d < 0 ? 'Ojo: el lado izquierdo se queda alto' : 'Ojo: el lado derecho se queda alto') : '¡Bien, recto!');
    J.p = (L + R) / 2; if (L >= 1 && R >= 1) J.gana('¡Aros apretados! La barrica no pierde ni gota');
  };
  D.on('down', (d) => pega(d.x < innerWidth / 2 ? 'L' : 'R'));
  K.on((k) => { if (k === 'izq') pega('L'); else if (k === 'der') pega('R'); });
  return {
    como: 'Golpea a un lado y a otro, izquierda y derecha, para que el aro baje recto',
    teclas: 'Teclas: ← y →, una y otra',
    tick() {
      J.o.tilt = (L - R) * 0.55;
      const u = U(), q = scr(S, sc.punto()), w = 0.34 * u, h = 0.045 * u, x0 = q.x - w / 2, y0 = q.y - h / 2, off = clamp((L - R) / 0.25, -1, 1);
      at(barra, { x: x0, y: y0, width: w, height: h, rx: h / 2 }); at(zl, { x: x0, y: y0, width: w * 0.1, height: h, rx: h / 2 }); at(zr, { x: x0 + w * 0.9, y: y0, width: w * 0.1, height: h, rx: h / 2 });
      at(mid, { x1: q.x, y1: y0 - 4, x2: q.x, y2: y0 + h + 4 }); at(bur, { cx: q.x + off * w * 0.45, cy: q.y, r: h * 0.36 });
      bur.setAttribute('class', Math.abs(L - R) > 0.2 ? 'g-nu mal' : Math.abs(L - R) > 0.12 ? 'g-nu ojo' : 'g-nu');
      M.pide(Math.abs(L - R) > 0.12 ? (L < R ? 'L' : 'R') : '');
    },
    demo: demo(C, (t) => { const k = t % 1, s = k < 0.5 ? M.l : M.r, f = (k % 0.5) / 0.5; return [{ x: s.x, y: s.y - 0.12 * U(), pisa: f < 0.35 }]; }),
    state: () => ({ L, R }),
  };
}

// ------------------------------------------------------------------------------------------------ tenazas
// Herrero (al agua): un dedo a la izquierda sujeta las tenazas (si se suelta, la herradura sale del agua) y el otro da
// vueltas para remover; muy deprisa salpica. Con ratón, pulsar y dar vueltas; con teclas, el botón sujeta y las
// flechas, una tras otra en redondo (arriba, derecha, abajo, izquierda), remueven.
function tenazas(c) {
  const { ui, S, sc, J, D, C, K } = c, ORD = ['arr', 'der', 'aba', 'izq'];
  J.limite = 24;
  const M = manos(C, 'Tenazas', 'Remover'), gira = giros(D), aro = C.f('circle', 'g-giro');
  let w = 0, wk = 0, ang = 0, dip = 0, uk = -1, chis = 0;
  K.on((k) => { const i = ORD.indexOf(k); if (i < 0) return; if (uk >= 0 && (i === (uk + 1) % 4 || i === (uk + 3) % 4)) wk = Math.min(12, wk + 3.4); uk = i; });
  return {
    como: 'Sujeta las tenazas con un dedo a la izquierda y remueve en el agua dando vueltas con el otro',
    teclas: 'Teclas: espacio sujeta; ↑ → ↓ ←, en redondo, remueven',
    tick(dt) {
      // ¿sujeta? (un dedo a la izquierda, el botón, o el ratón pulsado: con ratón, una mano hace las dos cosas)
      let agarra = K.abajo.has('boton'), rate = 0;
      for (const d of D.P.values()) { if (d.raton) agarra = true; else if (d.lado === 'L') { agarra = true; continue; } rate = Math.max(rate, gira(d)); }
      wk *= Math.exp(-dt * 2.5);
      w += (Math.max(rate, wk) - w) * Math.min(1, dt * 4);
      dip += ((agarra ? 1 : 0) - dip) * Math.min(1, dt * 6); ang += w * dt * 0.45;
      J.o.dip = dip; J.o.swirl = ang; J.o.stir = clamp(w / 8, 0, 2);
      M.on('L', agarra); M.on('R', w > 2);
      if (!agarra) { M.pide('L'); J.suave(w > 2 ? '¡Sujeta las tenazas, que se sale del agua!' : 'Sujeta las tenazas: un dedo a la izquierda'); }
      else if (w < 3) { M.pide('R'); J.suave('Ahora da vueltas con el otro dedo, en el agua'); }
      else if (w > 17) { M.pide(''); J.suave('¡Despacio, que salpica!'); if (Math.random() < dt * 6) ruido(ui, 0.12, 1600, 0.8, 0.12); }
      else {
        M.pide(''); J.empezado = true; J.suma(dt / 6); J.bien = ahora(); J.demo?.para(); J.suave('¡Así! El hierro se enfría y se pone duro');
        if ((chis -= dt) <= 0) { chis = 0.28; ruido(ui, 0.25, 5200, 0.6, 0.06 * (1 - J.p * 0.7)); }
      }
      const u = U(), q = scr(S, sc.punto()); at(aro, { cx: q.x, cy: q.y, r: 0.13 * u }); aro.setAttribute('class', `g-giro ${w > 17 ? 'mal' : w >= 3 && agarra ? 'ok' : ''}`);
      aro.style.transform = `rotate(${(ang * 57.3) % 360}deg)`;
    },
    demo: demo(C, (t) => { const q = scr(S, sc.punto()), u = U(), a = t * 5; return [{ x: M.l.x, y: M.l.y - 0.12 * u, pisa: true }, t > 0.6 ? { x: q.x + Math.cos(a) * 0.1 * u, y: q.y + Math.sin(a) * 0.07 * u, pisa: true } : null]; }),
    state: () => ({ w, dip, centro: scr(S, sc.punto()) }),
  };
}

// ------------------------------------------------------------------------------------------------ trenzar
// Cestero: la tira se pasa por delante y por detrás de las varas. Abajo, la tira vista desde arriba (las varas son los
// puntos): se sigue con el dedo desde la bolita, de un lado a otro; cada pasada, una vuelta más en la cesta (y la
// siguiente, al revés). Con teclas: arriba (por delante) y abajo (por detrás), una y otra.
function trenzar(c) {
  const { ui, J, D, C, K } = c, PAS = 5, ONDAS = 7;
  J.limite = 45;
  let s = 0, sentido = 1, mano = null;
  const fondo = C.f('rect', 'g-fondo'), camino = C.f('path', 'g-camino'), hecho = C.f('path', 'g-hecho'), varas = Array.from({ length: ONDAS }, () => C.f('circle', 'g-vara')), bola = anillo(C);
  const geo = () => { const W = innerWidth, y = innerHeight * 0.76, a = { x: W * 0.2, y }, b = { x: W * 0.8, y }; return { A: sentido > 0 ? a : b, B: sentido > 0 ? b : a, amp: 0.075 * U() }; };
  const P = (G, q) => ({ x: G.A.x + (G.B.x - G.A.x) * q, y: G.A.y + (G.B.y - G.A.y) * q - G.amp * Math.sin(q * ONDAS * Math.PI) });
  const traza = (G, q0, q1) => { let d = ''; for (let i = 0; i <= 48; i++) { const p = P(G, q0 + (q1 - q0) * i / 48); d += `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`; } return d; };
  const pasada = () => {
    mano = null; s = 0; sentido = -sentido; blip(ui, 520, 0.1, 0.1); blip(ui, 780, 0.12, 0.08);
    J.golpe(true, J.p + 1 / PAS < 1 ? '¡Una vuelta más! Ahora hacia el otro lado' : '¡Cesta tejida!'); J.suma(1 / PAS);
  };
  D.on('down', (d) => { const q = P(geo(), s); if (Math.hypot(d.x - q.x, d.y - q.y) < 0.13 * U()) mano = d.id; else J.di('Pon el dedo en la bolita y sigue la tira'); });
  D.on('move', (d) => {
    if (d.id !== mano) return;
    const G = geo(), u = U(); let best = s, be = 1e9;
    for (let q = s; q <= Math.min(1, s + 0.12); q += 0.004) { const p = P(G, q), e = Math.hypot(d.x - p.x, d.y - p.y); if (e < be) { be = e; best = q; } }
    if (be < 0.08 * u) { if (Math.floor(best * ONDAS) > Math.floor(s * ONDAS)) blip(ui, 600 + Math.floor(best * ONDAS) * 30, 0.04, 0.06); s = best; if (s >= 0.985) pasada(); }
    else if (be > 0.16 * u) { mano = null; J.golpe(false, '¡Se suelta la tira! Vuelve a la bolita'); }
  });
  D.on('up', (d) => { if (d.id === mano) mano = null; });
  K.on((k) => {
    if (k !== 'arr' && k !== 'aba') return;
    const h = Math.floor(s * ONDAS + 1e-6), quiere = h % 2 ? 'aba' : 'arr';
    if (k !== quiere) return J.golpe(false, '¡Por delante y por detrás! Mira la tira');
    s = (h + 1) / ONDAS; blip(ui, 600 + h * 30, 0.04, 0.06); if (s >= 0.985) pasada();
  });
  return {
    como: 'Sigue la tira con el dedo desde la bolita: por delante y por detrás de las varas',
    teclas: 'Teclas: ↑ por delante, ↓ por detrás',
    tick() {
      const G = geo(), u = U(), x0 = Math.min(G.A.x, G.B.x) - 0.06 * u;
      at(fondo, { x: x0, y: G.A.y - G.amp - 0.05 * u, width: Math.abs(G.B.x - G.A.x) + 0.12 * u, height: G.amp * 2 + 0.1 * u, rx: 0.05 * u });
      varas.forEach((v, k) => { const q = (k + 0.5) / ONDAS; at(v, { cx: G.A.x + (G.B.x - G.A.x) * q, cy: G.A.y + (G.B.y - G.A.y) * q, r: 0.022 * u }); });
      camino.setAttribute('d', traza(G, 0, 1)); hecho.setAttribute('d', s > 0 ? traza(G, 0, s) : '');
      const b = P(G, s); bola.set(b.x, b.y, 0.04 * u); bola.cls(mano != null ? 'ok' : '');
    },
    demo: demo(C, (t) => { const k = t % 2.2; if (k > 1.8) return null; const G = geo(), q = clamp(s + (k - 0.25) * 0.45, s, 1); return [{ ...P(G, q), pisa: k > 0.15 }]; }),
    state: () => { const G = geo(); return { s, sentido, bola: P(G, s), camino: Array.from({ length: 41 }, (_, i) => P(G, i / 40)) }; },
  };
}

// ------------------------------------------------------------------------------------------------ huso
// Hilandera: una mano (a la derecha) da vueltas para que gire el huso; la otra (a la izquierda) estira la lana hacia
// abajo, despacio. Estirar sin que gire rompe el hilo; girar sin estirar lo enreda. Con ratón: dar vueltas pulsando y
// estirar con la flecha abajo; con teclas: izquierda y derecha, una y otra, giran, y abajo estira.
function huso(c) {
  const { ui, S, sc, J, D, C, K } = c;
  J.limite = 32;
  const M = manos(C, 'Estirar', 'Girar'), gira = giros(D), aro = C.f('circle', 'g-giro'), fl = flecha(C);
  let W = 0, wk = 0, tira = 0, roto = 0, sinGiro = 0, sinTirar = 0, twirl = 0, uk = null;
  K.on((k) => { if ((k === 'izq' || k === 'der') && k !== uk) { wk = Math.min(14, wk + 3); uk = k; } });
  return {
    como: 'Da vueltas con un dedo a la derecha para que gire el huso y estira la lana hacia abajo con el otro',
    teclas: 'Teclas: ← y →, una y otra, giran; ↓ estira',
    tick(dt) {
      let rate = 0, vy = 0;
      for (const d of D.P.values()) { if (!d.raton && d.lado === 'L') { vy = Math.max(vy, vel(d).vy); continue; } rate = Math.max(rate, gira(d)); }
      if (K.abajo.has('aba')) vy = Math.max(vy, 0.35);
      wk *= Math.exp(-dt * 1.5);
      const quiere = Math.max(rate * 1.1, wk); W += (quiere - W) * Math.min(1, dt * (quiere > W ? 3 : 0.8));
      tira += (vy - tira) * Math.min(1, dt * 8);
      const gir = W >= 4, est = tira >= 0.08;
      J.o.spin = W; J.o.draw = Math.min(1, Math.max(0, tira) * 2);
      M.on('R', rate > 2 || wk > 2); M.on('L', est);
      if (roto > 0) { roto -= dt; return; }
      if (est && !gir) { if ((sinGiro += dt) > 0.35) { roto = 1; sinGiro = 0; J.p = Math.max(0, J.p - 0.05); J.golpe(false, '¡Se rompe el hilo! Primero haz girar el huso'); } } else sinGiro = 0;
      if (est) sinTirar = 0; else if (gir) sinTirar += dt;
      if (tira > 1.5) J.suave('¡Despacio, que se rompe!');
      else if (gir && est) {
        J.empezado = true; J.suma(dt / 7); J.bien = ahora(); J.demo?.para(); J.suave('¡Así! El hilo se retuerce y se enrolla');
        if ((twirl += dt) > 0.6) { twirl = 0; J.hit = 0; J.ok = true; blip(ui, 300 + J.p * 200, 0.05, 0.05, 'sine'); }
      }
      else if (gir && sinTirar > 1.2) J.suave('Estira la lana hacia abajo con la otra mano');
      else if (!gir) J.suave('Da vueltas con el dedo para que gire el huso');
      M.pide(!gir ? 'R' : !est ? 'L' : '');
      const u = U(), h = scr(S, sc.huso()), l = scr(S, sc.lana());
      at(aro, { cx: h.x, cy: h.y, r: 0.1 * u }); aro.setAttribute('class', `g-giro ${W > 24 ? 'mal' : gir ? 'ok' : ''}`); aro.style.transform = `rotate(${(S.t * W * 20) % 360}deg)`;
      fl.set(l.x - 0.05 * u, l.y - 0.04 * u, l.x - 0.05 * u, l.y + 0.14 * u); fl.cls(est && gir ? 'ok' : '');
    },
    demo: demo(C, (t) => { const u = U(), a = t * 6, k = (t % 1.6) / 1.6; return [{ x: M.r.x - 0.1 * u + Math.cos(a) * 0.06 * u, y: M.r.y + Math.sin(a) * 0.06 * u, pisa: true }, t > 0.8 ? { x: M.l.x, y: M.l.y - 0.18 * u + k * 0.3 * u, pisa: k < 0.9 } : null]; }),
    state: () => ({ W, tira, roto }),
  };
}

// ------------------------------------------------------------------------------------------------ pala
// Panadera: se arrastra la pala con el dedo (arriba, más adentro; a los lados, a los lados) hasta el sitio que brilla y
// se tira de golpe hacia una misma: el pan se queda en el horno. Si se tira despacio, el pan vuelve con la pala. Con
// teclas: las flechas llevan la pala y el botón da el tirón.
function pala(c) {
  const { ui, S, sc, J, D, C, K } = c, ORDEN = [1, 0, 2, 3].filter(i => i < sc.nSitios);
  J.limite = 40;
  const puestos = ORDEN.map(() => false), peel = { x: 0, d: 0, carry: true };
  let k = 0, vuelve = false, mano = null;
  J.o.peel = peel; J.o.puestos = puestos;
  const meta = anillo(C), hoja = anillo(C, 'punta'), fl = flecha(C);
  const sitio = () => ORDEN[k], lejos = () => { const a = sc.sitio(sitio()), b = sc.pala(); return Math.hypot(a.x - b.x, a.z - b.z); };
  const tiron = () => {
    if (!peel.carry || vuelve || k >= ORDEN.length || peel.d < 0.25) return;
    if (lejos() <= 0.075) {
      puestos[sitio()] = true; peel.carry = false; vuelve = true; k++; blip(ui, 440, 0.1, 0.1); ruido(ui, 0.1, 900, 1, 0.2);
      J.golpe(true, k < ORDEN.length ? '¡Dentro! A por el siguiente' : '¡Todos al horno!'); J.suma(1 / ORDEN.length); return;
    }
    const hd = sc.hondo(sitio());
    J.golpe(false, peel.d < hd - 0.06 ? 'Más adentro: hasta el sitio que brilla' : peel.d > hd + 0.06 ? 'Te has pasado: un poco hacia fuera' : 'Ponla justo en el sitio que brilla');
  };
  D.on('down', (d) => { if (mano == null) { mano = d.id; d.px = d.x; d.py = d.y; } });
  D.on('move', (d) => {
    if (d.id !== mano) return;
    const v = vel(d, 0.06), u = U();
    // (deprisa hacia abajo es el tirón: la pala no se mueve hasta saber si lo es)
    if (v.vy > 2.0) { if (!d.usado) { d.usado = true; tiron(); } }
    else if (v.vy < 1.1 && !vuelve && peel.carry) { peel.d = clamp(peel.d - (d.y - d.py) / u * 1.4, 0, 1); peel.x = clamp(peel.x + (d.x - d.px) / u * 0.7, -0.28, 0.28); }
    if (v.vy < 0.5) d.usado = false;
    d.px = d.x; d.py = d.y;
  });
  D.on('up', (d) => { if (d.id === mano) mano = null; });
  K.on((key) => { if (key === 'boton') tiron(); });
  return {
    como: 'Arrastra la pala hasta el sitio que brilla y tira de golpe hacia ti',
    teclas: 'Teclas: las flechas llevan la pala; espacio, el tirón',
    tick(dt) {
      const A = K.abajo;
      if (vuelve) { peel.d = Math.max(0, peel.d - dt * 1.6); if (peel.d <= 0) { vuelve = false; peel.x = 0; peel.carry = k < ORDEN.length; } }
      else if (peel.carry) { peel.d = clamp(peel.d + ((A.has('arr') ? 1 : 0) - (A.has('aba') ? 1 : 0)) * dt * 0.55, 0, 1); peel.x = clamp(peel.x + ((A.has('der') ? 1 : 0) - (A.has('izq') ? 1 : 0)) * dt * 0.3, -0.28, 0.28); }
      const u = U(), i = sitio();
      if (i == null) { meta.ver(false); hoja.ver(false); fl.ver(false); return; }
      const m = scr(S, sc.sitio(i)), h = scr(S, sc.pala()), listo = peel.carry && !vuelve && lejos() <= 0.075;
      meta.set(m.x, m.y, 0.04 * u); meta.cls(listo ? 'ok' : ''); hoja.set(h.x, h.y, 0.016 * u); hoja.ver(peel.carry);
      fl.ver(peel.carry && !vuelve); if (listo) { fl.set(h.x, h.y + 0.03 * u, h.x, h.y + 0.18 * u); fl.cls('ok'); } else { fl.set(h.x, h.y, h.x + (m.x - h.x) * 0.8, h.y + (m.y - h.y) * 0.8); fl.cls('tenue'); }
      if (listo) J.suave('¡Ahí! Ahora tira de golpe hacia ti'); else if (peel.d > 0.97) J.suave('¡Cuidado, que llegas al fuego!'); else if (peel.carry) J.suave('Arrastra la pala hasta el sitio que brilla');
    },
    demo: demo(C, (t) => { const k = t % 2.4, u = U(), x = innerWidth * 0.55, y0 = innerHeight * 0.82; if (k > 1.9) return null; const y = k < 1.2 ? y0 - (k / 1.2) * 0.32 * u : k < 1.5 ? y0 - 0.32 * u : y0 - 0.32 * u + Math.min(1, (k - 1.5) / 0.15) * 0.28 * u; return [{ x, y, pisa: k > 0.1 && k < 1.7 }]; }),
    state: () => ({ k, peel: { ...peel }, vuelve, lejos: k < ORDEN.length ? lejos() : 0, hondo: k < ORDEN.length ? sc.hondo(sitio()) : 0, sx: k < ORDEN.length ? sc.sitio(sitio()).x : 0 }),
  };
}

// ------------------------------------------------------------------------------------------------ paleta
// Palomero (la paleta): el bando cruza el collado; se lanza la paleta con el dedo hacia arriba, adonde va a estar el
// bando cuando llegue (hay que adelantarse). Si cae cerca, las palomas creen que es un halcón y bajan. Con teclas: la
// mira, a izquierda y derecha, y el botón lanza.
function paleta(c) {
  const { ui, S, sc, J, D, C, K } = c, TIROS = 6, HACEN = 3;
  J.limite = 45;
  let fase = -0.02, tiros = 0, fallos = 0, vuelo = null, mira = 0.4;
  const plano = new THREE.Plane(new THREE.Vector3(0, 0, 1), -sc.planoZ), hp = new THREE.Vector3();
  const ret = anillo(C, 'mira'), guia = anillo(C, 'tenue'), marca = anillo(C, 'bando'), quedan = fichas(C, TIROS, '<b></b>', 'paletas');
  let conTeclas = false; K.on(() => { conTeclas = true; });
  const prevision = () => { const b = sc.bando(); b.x += 14 * 0.6 / 5.5; return scr(S, b); };
  const lanza = (x, y) => {
    if (vuelo || tiros >= TIROS || !S.rayFrom({ clientX: x, clientY: y }).ray.intersectPlane(plano, hp)) return;
    tiros++; quedan(TIROS - tiros); vuelo = { t: 0, x, y }; J.o.aim = hp.clone(); J.o.tiro = 0; J.hit = 0; J.ok = true;
    blip(ui, 700, 0.12, 0.06, 'sine'); ruido(ui, 0.2, 2200, 0.8, 0.08);
  };
  // (se lanza al soltar el dedo tras llevarlo hacia arriba: cae donde se suelta, un poco más allá si va deprisa)
  D.on('up', (d) => { const v = vel(d, 0.1), u = U(); if (d.y0 - d.y > 0.07 * u && v.vy < 0.3) lanza(clamp(d.x + clamp(v.vx, -3, 3) * 0.05 * u, 0, innerWidth), clamp(d.y + clamp(v.vy, -3, 0) * 0.05 * u, 0, innerHeight)); });
  K.on((k) => { if (k === 'boton' || k === 'arr') { const b = scr(S, sc.bando()); lanza(mira * innerWidth, b.y); } });
  return {
    como: 'Desliza el dedo hacia arriba y suéltalo adonde va a pasar el bando',
    teclas: 'Teclas: ← y → apuntan; espacio, lanzar',
    tick(dt) {
      fase += dt / 5.5; if (fase > 1.06) fase = -0.06;
      J.o.fase = fase;
      const A = K.abajo; mira = clamp(mira + ((A.has('der') ? 1 : 0) - (A.has('izq') ? 1 : 0)) * dt * 0.45, 0.05, 0.95);
      const b = scr(S, sc.bando()), u = U(), dedo = [...D.P.values()][0];
      marca.ver(b.x > -40 && b.x < innerWidth + 40); marca.set(b.x, b.y, 0.09 * u);
      if (vuelo) {
        vuelo.t += dt; J.o.tiro = vuelo.t;
        if (vuelo.t >= 0.6 && !vuelo.hecho) {
          vuelo.hecho = true; const e = Math.hypot(b.x - vuelo.x, b.y - vuelo.y) / u;
          if (e < 0.16) { J.golpe(true, '¡Bajan! Creen que es un halcón'); J.suma(1 / HACEN); }
          else { fallos++; J.golpe(false, vuelo.x > b.x ? '¡Muy adelantada! Espera un poco' : '¡Tarde! Lánzala por delante del bando'); }
          if (J.p < 1 && tiros >= TIROS) J.pierde('Se acabaron las paletas. ¡Otra vez!');
        }
        if (vuelo.t > 0.95) vuelo = null;
      }
      // la mira: con teclas, siempre; con el dedo, mientras se prepara el lanzamiento
      // (dónde estará el bando cuando caiga una paleta lanzada ahora)
      const pv = prevision(); guia.ver(fallos >= 2 && !vuelo && fase > 0.1 && fase < 0.8); guia.set(pv.x, pv.y, 0.06 * u);
      ret.ver(conTeclas || !!dedo); if (dedo) ret.set(dedo.x, dedo.y, 0.05 * u); else if (conTeclas) ret.set(mira * innerWidth, b.y, 0.05 * u);
      J.suave(fase < 0.12 ? 'Prepárate: viene un bando' : fase > 0.9 ? 'Espera al siguiente bando' : 'Lánzala por delante de las palomas');
    },
    demo: demo(C, (t) => { const k = t % 2, u = U(), b = scr(S, sc.bando()), x0 = innerWidth * 0.5, y0 = innerHeight * 0.85; if (k > 1.2 || fase < 0.15 || fase > 0.7) return null; const f = clamp((k - 0.5) / 0.25, 0, 1); return [{ x: x0 + (b.x + 0.15 * u - x0) * f * 0.6, y: y0 + (b.y - y0) * f * 0.6, pisa: k > 0.3 && k < 0.8 }]; }),
    state: () => ({ fase, tiros, vuelo: !!vuelo, bando: scr(S, sc.bando()), prevision: prevision(), mira: mira * innerWidth }),
  };
}

// ------------------------------------------------------------------------------------------------ red
// Palomero (las redes): con un dedo en cada cuerda (uno a cada lado), se tira de las dos hacia abajo a la vez cuando el
// bando pasa bajo, por delante de las redes; los bandos que van altos se dejan pasar. Con ratón, un tirón hacia abajo;
// con teclas, abajo o el botón.
function red(c) {
  const { ui, S, sc, J, D, C, K } = c, ALTOS = [0, 1, 0, 0, 1, 0, 1, 0], HACEN = 3;
  let pasada = 0, fase = -0.02, tirado = false, cae = 0, uno = null;
  const tirones = [];
  const M = manos(C, 'Cuerda', 'Cuerda'), banda = C.f('polygon', 'g-banda'), zl = C.f('line', 'g-zona'), zr = C.f('line', 'g-zona'), marca = anillo(C, 'bando');
  const alto = () => ALTOS[pasada % ALTOS.length];
  const tira = () => {
    if (tirado || cae > 0) return; tirado = true; cae = 1; J.hit = 0; uno = null;
    blip(ui, 190, 0.18, 0.1, 'sawtooth'); ruido(ui, 0.3, 700, 0.6, 0.15);
    const b = sc.bando();
    if (alto()) return J.golpe(false, '¡Iban altas! Deja pasar las que vuelan alto');
    if (Math.abs(b.x) > sc.redX) return J.golpe(false, b.x < -sc.redX ? '¡Pronto! Espera a que lleguen a las redes' : '¡Tarde! Ya habían pasado');
    J.golpe(true, '¡Dentro de la red!'); J.suma(1 / HACEN);
  };
  D.on('move', (d) => {
    if (d.usado) return; const v = vel(d);
    if (v.vy > 1.3 && d.y - d.y0 > 0.06 * U()) {
      d.usado = true; if (d.raton) return tira();
      const t = ahora(); tirones.push({ id: d.id, t }); while (tirones.length && t - tirones[0].t > 0.4) tirones.shift();
      if (new Set(tirones.map(x => x.id)).size >= 2) { tirones.length = 0; tira(); } else uno = t;
    }
  });
  K.on((k) => { if (k === 'aba' || k === 'boton') tira(); });
  return {
    como: 'Pon un dedo en cada cuerda y tira de las dos hacia abajo a la vez cuando el bando pase bajo',
    teclas: 'Tecla: ↓ o espacio, tirar',
    tick(dt) {
      fase += dt / 5.2;
      if (fase > 1.06) {
        if (!tirado && !alto()) J.golpe(false, 'Se han escapado: a por el siguiente bando');
        pasada++; fase = -0.06; tirado = false;
        if (pasada >= ALTOS.length && J.p < 1) return J.pierde('Se fueron los bandos. ¡Otra vez!');
      }
      if (uno != null && ahora() - uno > 0.4) { uno = null; J.golpe(false, '¡Las dos cuerdas a la vez!'); M.pide('LR'); }
      cae = Math.max(0, cae - dt / 1.6);
      J.o.fase = fase; J.o.alto = (J.o.alto || 0) + (alto() - (J.o.alto || 0)) * Math.min(1, dt * 2); J.o.cae = cae > 0.75 ? (1 - cae) / 0.25 : cae / 0.75;
      M.on('L', !!D.de('L')); M.on('R', !!D.de('R'));
      const b = sc.bando(), dentro = !alto() && Math.abs(b.x) < sc.redX, bs = scr(S, b);
      marca.ver(bs.x > -40 && bs.x < innerWidth + 40); marca.set(bs.x, bs.y, 0.09 * U()); marca.cls(alto() ? 'tenue' : dentro ? 'ok' : '');
      // (las redes: entre las dos rayas; en verde, con el bando bajo delante)
      const pts = [];
      for (const [l, s] of [[zl, -1], [zr, 1]]) { const p = scr(S, new THREE.Vector3(s * sc.redX, 0.6, sc.planoZ)), q = scr(S, new THREE.Vector3(s * sc.redX, 4.6, sc.planoZ)); at(l, { x1: p.x, y1: p.y, x2: q.x, y2: q.y }); l.setAttribute('class', `g-zona${dentro ? ' ok' : ''}`); pts.push(p, q); }
      banda.setAttribute('points', [pts[0], pts[1], pts[3], pts[2]].map(v => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(' ')); ve(banda, dentro && !tirado);
      if (!tirado) J.suave(alto() ? 'Estas van altas: déjalas pasar' : dentro ? '¡Ahora! Tira de las dos cuerdas' : b.x < 0 ? 'Prepara las dos cuerdas…' : 'Espera al siguiente bando');
      M.pide(dentro && !tirado ? 'LR' : '');
    },
    demo: demo(C, (t) => { const k = t % 2, u = U(), f = clamp((k - 0.9) / 0.2, 0, 1); if (k > 1.5) return null; return [{ x: M.l.x, y: M.l.y - 0.12 * u + f * 0.2 * u, pisa: k > 0.2 && k < 1.2 }, { x: M.r.x, y: M.r.y - 0.12 * u + f * 0.2 * u, pisa: k > 0.2 && k < 1.2 }]; }),
    state: () => ({ fase, pasada, alto: alto(), tirado, bando: sc.bando(), redX: sc.redX }),
  };
}

// ------------------------------------------------------------------------------------------------ alzar
// Harrijasotzaile: la piedra sube a toques, una mano y otra (izquierda, derecha); si se toca dos veces con la misma,
// resbala; si se para, baja. Al pecho, el golpe de piernas: deslizar hacia arriba con los dos dedos a la vez. Con
// teclas: izquierda y derecha, y arriba.
function alzar(c) {
  const { ui, J, D, C, K } = c;
  J.limite = 12;
  const M = manos(C, 'Izquierda', 'Derecha'), fl = [flecha(C, 'ok'), flecha(C, 'ok')];
  let ultimo = null, fase = 0, quieto = 0, sube = 0;
  const ups = [];
  const toca = (s) => {
    if (fase) return; M.toca(s); quieto = 0;
    if (s === ultimo) { J.p = Math.max(0, J.p - 0.03); return J.golpe(false, '¡Alterna las manos: una y otra!'); }
    ultimo = s; J.p = Math.min(0.74, J.p + 0.042); blip(ui, 160 + J.p * 320, 0.06, 0.1);
    J.golpe(true, J.p < 0.3 ? '¡Arriba!' : J.p < 0.6 ? '¡Más! ¡Hasta el pecho!' : '¡Ya casi!');
    if (J.p >= 0.74) { fase = 1; J.di('¡Al hombro! Desliza hacia arriba con los dos dedos a la vez'); }
  };
  const golpe = () => { if (!sube) { sube = 1e-3; J.golpe(true, '¡Golpe de piernas!'); ruido(ui, 0.2, 300, 0.7, 0.2); } };
  D.on('down', (d) => toca(d.x < innerWidth / 2 ? 'L' : 'R'));
  D.on('move', (d) => {
    if (!fase || d.usado) return; const v = vel(d);
    if (v.vy < -1.2 && d.y0 - d.y > 0.06 * U()) {
      d.usado = true; if (d.raton) return golpe();
      const t = ahora(); ups.push({ id: d.id, t }); while (ups.length && t - ups[0].t > 0.45) ups.shift();
      if (new Set(ups.map(x => x.id)).size >= 2) golpe(); else J.di('¡Con los dos dedos a la vez!');
    }
  });
  K.on((k) => { if (k === 'izq') toca('L'); else if (k === 'der') toca('R'); else if (fase && (k === 'arr' || k === 'boton')) golpe(); });
  return {
    como: 'Toca a la izquierda y a la derecha, una y otra, para subir la piedra',
    teclas: 'Teclas: ← y →, una y otra; ↑, al hombro',
    tick(dt) {
      if (!fase && J.p > 0 && (quieto += dt) > 0.5) J.p = Math.max(0, J.p - dt * 0.08);
      if (sube) { sube += dt; J.p = Math.min(1, 0.74 + sube / 0.5 * 0.26); if (J.p >= 1) J.gana('¡Al hombro! ¡Qué fuerza!'); }
      M.pide(fase ? 'LR' : ultimo === 'L' ? 'R' : ultimo === 'R' ? 'L' : 'LR');
      const u = U(); [M.l, M.r].forEach((m, i) => { fl[i].ver(fase === 1 && !sube); fl[i].set(m.x, m.y - 0.1 * u, m.x, m.y - 0.3 * u); });
    },
    demo: demo(C, (t) => { const k = t % 0.8, s = k < 0.4 ? M.l : M.r; return [{ x: s.x, y: s.y - 0.12 * U(), pisa: (k % 0.4) < 0.15 }]; }),
    state: () => ({ fase, ultimo }),
  };
}

// ------------------------------------------------------------------------------------------------ fugas
// Carbonero: en la carbonera se abren fugas de humo, cada vez más deprisa; se tapan tocándolas (la pala echa tierra).
// Si una fuga se deja, sale llama; con tres llamas, la leña se quema. Varias a la vez: mejor con las dos manos. Con
// teclas: las flechas eligen la fuga y el botón la tapa.
function fugas(c) {
  const { ui, S, sc, J, D, C, K } = c, META = 12, n = sc.nFugas;
  const st = new Array(n).fill(0), tt = new Array(n).fill(0);
  let tapadas = 0, llamas = 0, prox = 0.4, cur = 0, conTeclas = false;
  J.o.open = st; J.o.target = 0;
  const rs = st.map(() => anillo(C)), cursor = anillo(C, 'mira'), fuego = fichas(C, 3, iconSVG('fire', 22), 'llamas');
  fuego(0);
  const abre = () => { const L = st.map((v, i) => (v ? -1 : i)).filter(i => i >= 0); if (!L.length) return; const i = L[Math.random() * L.length | 0]; st[i] = 1; tt[i] = 0; ruido(ui, 0.3, 500, 0.5, 0.06); };
  const tapa = (i) => {
    if (!st[i]) return; st[i] = 0; tapadas++; J.o.target = i; blip(ui, 240, 0.08, 0.1); ruido(ui, 0.12, 700, 0.7, 0.2);
    J.golpe(true, tapadas < META ? '¡Tapada!' : '¡Carbonera a salvo!'); J.suma(1 / META);
  };
  D.on('down', (d) => { let best = -1, be = 0.12 * U(); st.forEach((v, i) => { if (!v) return; const q = scr(S, sc.fuga(i)), e = Math.hypot(q.x - d.x, q.y - d.y); if (e < be) { be = e; best = i; } }); if (best >= 0) tapa(best); });
  K.on((k) => {
    conTeclas = true;
    if (k === 'boton') return tapa(cur);
    const dx = k === 'izq' ? -1 : k === 'der' ? 1 : 0, dy = k === 'arr' ? -1 : k === 'aba' ? 1 : 0, a = scr(S, sc.fuga(cur));
    let best = cur, be = 1e9; for (let i = 0; i < n; i++) { if (i === cur) continue; const q = scr(S, sc.fuga(i)), vx = q.x - a.x, vy = q.y - a.y, along = vx * dx + vy * dy; if (along <= 0) continue; const e = Math.hypot(vx, vy) - along * 0.5 - (st[i] ? 60 : 0); if (e < be) { be = e; best = i; } }
    cur = best;
  });
  return {
    como: 'Toca cada fuga de humo para taparla con tierra, antes de que salga llama',
    teclas: 'Teclas: las flechas eligen la fuga; espacio, tapar',
    tick(dt) {
      if ((prox -= dt) <= 0) { abre(); prox = Math.max(0.5, 1.6 - tapadas * 0.08) * (0.7 + Math.random() * 0.6); }
      for (let i = 0; i < n; i++) if (st[i] === 1 && (tt[i] += dt) > 3.4) {
        st[i] = 2; llamas++; fuego(llamas); ruido(ui, 0.4, 300, 0.5, 0.2);
        if (llamas >= 3) return J.pierde('Demasiadas llamas: la leña se quema. ¡Otra vez!');
        J.golpe(false, '¡Llama! Tápala rápido');
      }
      const u = U();
      st.forEach((v, i) => { rs[i].ver(v > 0); if (v) { const q = scr(S, sc.fuga(i)); rs[i].set(q.x, q.y, 0.045 * u); rs[i].cls(v === 2 ? 'mal' : ''); } });
      cursor.ver(conTeclas); if (conTeclas) { const q = scr(S, sc.fuga(cur)); cursor.set(q.x, q.y, 0.06 * u); }
    },
    demo: demo(C, (t) => { const i = st.findIndex(v => v); if (i < 0) return null; const q = scr(S, sc.fuga(i)), k = t % 1.2; return [{ x: q.x, y: q.y, pisa: k > 0.5 && k < 0.7 }]; }),
    state: () => ({ abiertas: st.map((v, i) => (v ? { i, v, ...scr(S, sc.fuga(i)) } : null)).filter(Boolean), llamas, tapadas, cur: { i: cur, ...scr(S, sc.fuga(cur)) } }),
  };
}

// ------------------------------------------------------------------------------------------------ amasar
// Panadera (amasar): cada vez sale un gesto: empujar la masa con las dos manos (los dos dedos hacia arriba a la vez),
// doblarla hacia una misma (hacia abajo) o girarla (a un lado). Con ratón, un trazo; con teclas, la flecha.
function amasar(c) {
  const { ui, S, sc, J, D, C, K } = c, META = 12;
  J.limite = 28;
  const GES = [{ k: 'empuja', d: [0, -1], dos: true, txt: 'Empuja con las dos manos' }, { k: 'dobla', d: [0, 1], txt: 'Dobla la masa hacia ti' }, { k: 'gira', txt: 'Gira la masa' }];
  let i = 0, lado = 1, giro = 0, espera = 0;
  const ups = [], fs = [flecha(C), flecha(C)], rot = C.div('g-txt');
  const actual = () => GES[i % 3], dirA = () => actual().d || [lado, 0];
  const vale = () => {
    if (actual().k === 'gira') { giro += lado * Math.PI / 2; J.o.giro = giro; }
    blip(ui, 260 + (i % 3) * 80, 0.07, 0.1); ruido(ui, 0.1, 400, 0.8, 0.12);
    J.golpe(true, ['¡Eso es!', '¡Bien!', '¡Muy bien!'][i % 3]); J.suma(1 / META);
    i++; if (actual().k === 'gira') lado = Math.random() < 0.5 ? -1 : 1; espera = 0.15;
  };
  const gesto = (d) => {
    const u = U(), dx = d.x - d.x0, dy = d.y - d.y0, len = Math.hypot(dx, dy);
    if (len < 0.12 * u || espera > 0) return; d.usado = true;
    const [ux, uy] = dirA(); if ((dx * ux + dy * uy) / len < 0.6) return J.golpe(false, 'Ese no: mira la flecha');
    if (actual().dos && !d.raton) {
      const t = ahora(); ups.push({ id: d.id, t }); while (ups.length && t - ups[0].t > 0.45) ups.shift();
      if (new Set(ups.map(x => x.id)).size < 2) return J.di('Con las dos manos a la vez');
      ups.length = 0;
    }
    vale();
  };
  D.on('move', (d) => { if (!d.usado && Math.hypot(d.x - d.x0, d.y - d.y0) > 0.16 * U()) gesto(d); });
  D.on('up', (d) => { if (!d.usado) gesto(d); });
  K.on((k) => { if (espera > 0 || k === 'boton') return; const q = actual().k, ok = q === 'empuja' ? k === 'arr' : q === 'dobla' ? k === 'aba' : k === (lado > 0 ? 'der' : 'izq'); if (ok) vale(); else J.golpe(false, 'Ese no: mira la flecha'); });
  return {
    como: 'Haz el gesto de la flecha: empuja con las dos manos, dobla y gira la masa',
    teclas: 'Teclas: la flecha del gesto',
    tick(dt) {
      espera = Math.max(0, espera - dt);
      const u = U(), q = scr(S, sc.masa()), g = actual(), [ux, uy] = dirA(), L = 0.14 * u;
      if (g.dos) { for (const [k, s] of [[0, -1], [1, 1]]) { fs[k].ver(true); fs[k].set(q.x + s * 0.07 * u, q.y + L, q.x + s * 0.07 * u, q.y - L); } }
      else { fs[1].ver(false); fs[0].ver(true); fs[0].set(q.x - ux * L, q.y - uy * L, q.x + ux * L, q.y + uy * L); }
      if (rot.textContent !== g.txt) rot.textContent = g.txt; rot.style.left = q.x.toFixed(1) + 'px'; rot.style.top = (q.y + L + 0.04 * u).toFixed(1) + 'px';
    },
    demo: demo(C, (t) => { const k = t % 1.6, q = scr(S, sc.masa()), u = U(), [ux, uy] = dirA(), L = 0.15 * u, f = clamp((k - 0.3) / 0.35, 0, 1); if (k > 1) return null; const p = (s) => ({ x: q.x + s * 0.07 * u - ux * L + ux * 2 * L * f, y: q.y - uy * L + uy * 2 * L * f, pisa: k > 0.2 && k < 0.75 }); return actual().dos ? [p(-1), p(1)] : [p(0)]; }),
    state: () => ({ gesto: actual().k, lado, masa: scr(S, sc.masa()) }),
  };
}

// ------------------------------------------------------------------------------------------------ cada paso
// el juego de cada escena y el nombre de sus botones en el mando (mando/contextos.js)
const JUEGOS = {
  chop: [tajo, 'gTajo'], chop2: [tajo, 'gTajo'], stone: [(c) => tajo(c, 'pico'), 'gPico'], anvil: [(c) => tajo(c, 'golpe'), 'gGolpe'], sole: [(c) => tajo(c, 'golpe'), 'gGolpe'],
  ashlar: [cincel, 'gCincel'], hoops: [aros, 'gAros'], quench: [tenazas, 'gTenazas'], basket: [trenzar, 'gTrenzar'], spin: [huso, 'gHuso'],
  oven: [pala, 'gPala'], dove: [paleta, 'gPaleta'], net: [red, 'gRed'], lift: [alzar, 'gAlzar'], mound: [fugas, 'gFugas'], knead: [amasar, 'gAmasar'],
};
export const has3DArt = (art) => !!JUEGOS[art];
/** Un paso de un taller en su escena 3D, con el juego de su oficio. Devuelve { win, hits } (o quit, o error). */
export function oficio3d(ui, { title, hint, icon = 'hammer', art }) {
  const [juego, mando] = JUEGOS[art];
  document.body.dataset.mini3d = mando;
  return play3d(ui, { title, hint, icon, stage: escenario(art) }, async (S, H, end, over) => {
    const sc = await montar(S, art);
    const J = base(ui, H, end, over), c = { ui, S, H, sc, J, D: dedos(H, S), C: capa(H, S), K: teclas(H, S) };
    const g = juego(c);
    J.demo = g.demo; J.di(g.como); H.clock.textContent = J.limite ? J.limite.toFixed(1) + ' s' : '';
    // (con ratón y teclado, o la tele con el mando: qué teclas valen)
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) { const t = document.createElement('div'); t.className = 'g-teclas'; t.textContent = g.teclas; H.fb.before(t); }
    // (el reloj empieza con el primer gesto: no se pierde tiempo leyendo; la mano fantasma se va al tocar)
    c.D.on('down', () => { J.empezado = true; g.demo.para(); }); c.K.on(() => { J.empezado = true; g.demo.para(); });
    S.every((dt) => {
      J.hit += dt;
      if (!over()) {
        if (J.limite && J.empezado) { J.t += dt; H.time(J.limite - J.t); if (J.t >= J.limite) J.pierde('¡Se acabó el tiempo! Prueba otra vez'); }
        g.tick(dt);
        if (ahora() - J.bien > 8 && !c.D.P.size) g.demo.sigue();   // (si pasa un rato sin acertar, se enseña otra vez)
      }
      g.demo.tick(dt);
      const Dbg = H.o.debug;   // (laboratorio) forzar el avance y el golpe para ver la escena
      sc.set(Dbg ? Dbg.p : J.p, Dbg ? Dbg.hit : J.hit, J.ok, dt, J.o);
      H.prog(J.p);
    });
    H.o.state = () => ({ juego: mando, p: J.p, ...g.state() });
  }).finally(() => { if (document.body.dataset.mini3d === mando) delete document.body.dataset.mini3d; });
}
