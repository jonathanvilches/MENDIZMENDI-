// Lámina isométrica interactiva «Las palomeras de Etxalar» (skill Anatomy, 21 de noviembre de 2026; el autor: «explicaciones
// técnicas con Anatomy de oficios antiguos [...] todo esto quiero que poco a poco lo vayas aplicando y lo vayas metiendo en
// el juego y en las misiones»). El collado en maqueta, como un mapa de curvas de nivel: dos montes en terrazas con el hayedo
// en otoño y el paso entre ellos; en el monte de la derecha, la atalaya de madera con el vigía; en medio del collado, los
// postes altos con las redes tendidas, sus vientos y la cuerda que baja a la txabola escondida donde esperan los de abajo.
// El bando de palomas torcaces llega del norte, alto; el vigía lanza la paleta blanca, las palomas la toman por un halcón y
// bajan en picado a ras del collado; desde la txabola tiran de la cuerda y las redes caen sobre el bando. Al recorrerla,
// paso a paso, se ilumina lo que trabaja. Es la que se abre al acabar el taller del palomero (data/oficios.js) y en el
// material didáctico.
// Uso: node tools/anatomia/palomeras.mjs [--light]  →  entrega/anatomia/palomeras(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 300;

// ---------- el modelo (unidades de la maqueta; x a lo ancho, y hacia delante, z arriba) ----------
// dos montes en cuatro terrazas de 2,6 y el collado entre ellos; las redes, entre tres postes de 26 de alto, cruzan el paso
const TERRAZA = 2.6, CAPAS = 4;
const MONTE_I = { x: -82, y: -58, w: 56, d: 47, r: 12 }, MONTE_D = { x: 26, y: -58, w: 56, d: 47, r: 12 };
const POSTES = [-21, 0, 21], RED_Y = -30, POSTE_H = 26, RED_ARRIBA = 24.6, RED_ABAJO = 3.2;
const ATALAYA = { x: 47, y: -36, z: 0, h: 15, a: 3.2 };
const TXABOLA = { x: -22, y: -19, w: 8, d: 6, h: 4.2 };
const HAYAS = [[-74, -50], [-60, -52], [-68, -32], [-52, -41], [-40, -22], [-76, -17], [-54, -15],
  [32, -52], [56, -53], [68, -37], [74, -20], [36, -20], [58, -16], [76, -51]];
const PASOS = ['Vigilar', 'La paleta', 'En picado', 'Las redes', 'Recoger'];
const PUESTOS = [[ATALAYA.x, ATALAYA.y, ATALAYA.z + ATALAYA.h + 2], [30, -46, 38], [4, -40, 22], [0, RED_Y, 14], [TXABOLA.x + 4, TXABOLA.y + 3, 4]];
const zTerraza = (x, y) => {      // la altura del suelo en (x, y): la terraza más alta que lo contiene
  for (const M of [MONTE_I, MONTE_D]) for (let c = CAPAS - 1; c >= 0; c--) { const pl = k.insetPlan(M, c * 6); if (x > pl.x + 1 && x < pl.x + pl.w - 1 && y > pl.y + 1 && y < pl.y + pl.d - 1) return (c + 1) * TERRAZA; }
  return 0;
};

ATALAYA.z = zTerraza(ATALAYA.x, ATALAYA.y); PUESTOS[0][2] = ATALAYA.z + ATALAYA.h + 2;

// ---------- la cámara ----------
const PLATE = { x: -90, y: -64, w: 180, d: 62, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [0, RED_Y, POSTE_H + 2], [ATALAYA.x, ATALAYA.y, ATALAYA.z + ATALAYA.h + 6], [8, -60, 44], [30, -46, 42]], WIDTH, HEIGHT, { pad: 8, azimuth: 66, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(2)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const FZ = (x, y, z = 0) => G.frameAlong([x, y, z], [0, 0, 1]);
const porDepth = (lista, f) => [...lista].sort((a, b) => dep(f(a)) - dep(f(b)));
const R2x = (i) => (0.5 + i * 0.7548776662) % 1, R2y = (i) => (0.5 + i * 0.5698402910) % 1;
const caja = (x0, x1, y0, y1, z0, h, cls, bevel = 0.2) => S(k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: 0.2 }, z0, h, P, 2, bevel), { tone: 'mid', className: cls });
const palo = (a, b, w, cls = 'madera') => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...d); return S(G.prismOf(G.frameAlong(a, d), [[-w, -w], [w, -w], [w, w], [-w, w]], 0, l, P), { tone: 'mid', className: cls }); };

// ---------- el tablero de la maqueta ----------
function tablero() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -14, 12, P)}"/>`];
  for (const [x, y] of porDepth(k.corners(PLATE, 20), ([x, y]) => [x, y, 0])) {
    out.push(S(k.cylinder(x, y, 6.4, -14, 1.6, P, 28), { tone: 'lo' }));
    out.push(S(k.cylinder(x, y, 5, -12.4, 4.4, P, 28), { tone: 'mid' }));
  }
  out.push(S(k.slabOf(PLATE, -8, 8, P, 8, 1.6), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 4), 0, P), { tone: 'lo' }));
  const tornillos = k.corners(PLATE, 8.5);
  out.push(L(tornillos.map(([x, y]) => k.ring(x, y, 1.8, 0, P, 16)).join(''), { tone: 'lo' }));
  out.push(D(tornillos.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // la hierba del collado, en motas
  let h = ''; for (let i = 0; i < 70; i++) { const x = -28 + R2x(i) * 56, y = PLATE.y + 6 + R2y(i) * (PLATE.d - 12); if (Math.abs(y - RED_Y) < 1.5) continue; const q = at([x, y, 0]); h += `<circle class="hierba" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${(0.35 + R2x(i + 5) * 0.4).toFixed(2)}"/>`; }
  out.push(h);
  // la senda que cruza el collado
  const senda = Array.from({ length: 13 }, (_, i) => { const y = PLATE.y + 5 + i / 12 * (PLATE.d - 10); return [Math.sin(i * 0.7) * 3 - 6, y, 0]; });
  out.push(`<path class="senda" d="${linea(senda)}"/>`);
  // la regla y la placa
  const regla = { x: -18, y: -9, w: 36, d: 5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.05, 0.6, [1.8, regla.d - 0.1], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.5, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.5, 0.6])], { size: 0.45 }));
  return out.join('');
}
function placa() {
  const pl = { x: 34, y: -8.8, w: 40, d: 5.8, r: 1.2 }, out = [];
  out.push(S(k.slabOf(pl, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(pl, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([pl.x + 5, pl.y + 3.6], 0.8, P, 'x'), 'USO-SAREAK · ETXALAR', { size: 2.3, tone: 'mid' }));
  out.push(D([at([pl.x + 2.2, pl.y + 2.9, 0.8]), at([pl.x + pl.w - 2.2, pl.y + 2.9, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- los dos montes, en terrazas como curvas de nivel ----------
function monte(M) {
  const out = [];
  for (let c = 0; c < CAPAS; c++) {
    const pl = k.insetPlan(M, c * 6);
    out.push(S(k.slabOf(pl, c * TERRAZA, TERRAZA, P, 10, 0.5), { tone: 'mid', className: 'pasto' }));
    out.push(L(k.planOutline(k.insetPlan(pl, 1.4), (c + 1) * TERRAZA, P, 10), { tone: 'faint' }));
  }
  // las piedras sueltas del monte
  let pi = ''; for (let i = 0; i < 26; i++) { const x = M.x + 6 + R2x(i + 11) * (M.w - 12), y = M.y + 6 + R2y(i + 11) * (M.d - 12), z = zTerraza(x, y), q = at([x, y, z]); pi += `<ellipse class="piedrita" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" rx="${(0.6 + R2y(i) * 0.5).toFixed(2)}" ry="${(0.35 + R2y(i) * 0.25).toFixed(2)}"/>`; }
  out.push(pi);
  return out.join('');
}

// ---------- las hayas en otoño ----------
function haya([x, y]) {
  const z0 = zTerraza(x, y), s = 0.82 + R2x(Math.abs(x * 7 + y)) * 0.3;
  const out = [S(G.solidOf([[0, 1.1 * s], [0.6, 0.85 * s, true], [9 * s, 0.6 * s]], FZ(x, y, z0), P), { tone: 'mid', className: 'corteza' })];
  const bolas = [[x - 2.2 * s, y + 0.4, z0 + 10 * s, 3.6 * s], [x + 2 * s, y - 0.3, z0 + 10.8 * s, 3.4 * s], [x, y + 1, z0 + 13.4 * s, 3.8 * s], [x + 0.3, y - 1, z0 + 8.8 * s, 2.8 * s]];
  const tono = ['copa', 'copa2', 'copa3'][Math.floor(R2y(Math.abs(x * 3 + y)) * 3) % 3];
  out.push(porDepth(bolas, (b) => b).map(([bx, by, bz, r]) => S(G.sphereOf([bx, by, bz], r, P), { tone: 'mid', className: tono })).join(''));
  return out.join('');
}

// ---------- la atalaya: cuatro pies, cruces, la plataforma con barandilla, la escalera y el vigía ----------
function atalaya() {
  const { x, y, z, h, a } = ATALAYA, out = [], esq = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const pie = ([sx, sy]) => [x + sx * a, y + sy * a];
  // las zapatas de piedra
  for (const [px, py] of porDepth(esq.map(pie), ([q, w]) => [q, w, z])) out.push(caja(px - 0.9, px + 0.9, py - 0.9, py + 0.9, z, 0.6, 'piedra', 0.15));
  // los pies de atrás, las cruces de atrás y de los lados, y los de delante
  const pies = porDepth(esq.map(pie), ([q, w]) => [q, w, z]);
  const cruz = (p0, p1) => { let o = ''; for (const [z0, z1] of [[z + 0.6, z + h * 0.5], [z + h * 0.5, z + h - 0.2]]) o += palo([p0[0], p0[1], z0], [p1[0], p1[1], z1], 0.18) + palo([p1[0], p1[1], z0], [p0[0], p0[1], z1], 0.18); return o; };
  const [b0, b1, f0, f1] = pies;
  out.push(palo([b0[0], b0[1], z + 0.6], [b0[0], b0[1], z + h], 0.42), palo([b1[0], b1[1], z + 0.6], [b1[0], b1[1], z + h], 0.42));
  out.push(cruz(b0, b1));
  out.push(palo([f0[0], f0[1], z + 0.6], [f0[0], f0[1], z + h], 0.42), palo([f1[0], f1[1], z + 0.6], [f1[0], f1[1], z + h], 0.42));
  // la escalera, apoyada en la cara de delante
  const e0 = [x - 1, y + a + 4.5, z], e1 = [x - 1, y + a + 0.4, z + h], e2 = [x + 1, y + a + 4.5, z], e3 = [x + 1, y + a + 0.4, z + h];
  let pel = ''; for (let i = 1; i < 12; i++) { const t = i / 12; pel += linea([[e0[0], e0[1] + (e1[1] - e0[1]) * t, e0[2] + (e1[2] - e0[2]) * t], [e2[0], e2[1] + (e3[1] - e2[1]) * t, e2[2] + (e3[2] - e2[2]) * t]]); }
  out.push(L(linea([e0, e1]) + linea([e2, e3]), { tone: 'mid', className: 'larguero' }), L(pel, { tone: 'lo' }));
  out.push(D([at(e0), at(e2)], { size: 0.4, tone: 'mid' }));
  // la plataforma, la barandilla y el tejadillo
  out.push(caja(x - a - 1.2, x + a + 1.2, y - a - 1.2, y + a + 1.2, z + h, 0.7, 'madera'));
  const zb = z + h + 0.7, zr = zb + 2.4, ba = a + 1.0;
  const barra = [[x - ba, y - ba], [x + ba, y - ba], [x + ba, y + ba], [x - ba, y + ba]];
  out.push(`<g data-part="vigia"></g>`);
  out.push(L(barra.map(([q, w]) => linea([[q, w, zb], [q, w, zr]])).join('') + poly(barra.map(([q, w]) => [q, w, zr])) + poly(barra.map(([q, w]) => [q, w, zb + 1.2])), { tone: 'mid', className: 'baranda' }));
  out.push(D(barra.map(([q, w]) => at([q, w, zr])), { size: 0.35, tone: 'mid' }));
  return `<g data-part="atalaya">${out.join('')}</g>`;
}

// ---------- los postes de las redes, sus vientos y la txabola ----------
function postes() {
  const out = [];
  // los vientos de atrás (los de delante van por encima de la red, en vivo)
  let v = ''; for (const px of POSTES) v += linea([[px, RED_Y, POSTE_H - 1], [px * 1.15, RED_Y - 16, 0]]);
  out.push(L(v, { tone: 'lo', className: 'viento' }));
  for (const px of POSTES) out.push(D([at([px * 1.15, RED_Y - 16, 0])], { size: 0.45, tone: 'mid' }));
  for (const px of POSTES) {
    out.push(S(k.cylinder(px, RED_Y, 1.2, 0, 0.7, P, 16), { tone: 'mid', className: 'piedra' }));
    out.push(S(G.solidOf([[0, 0.62], [POSTE_H, 0.42]], FZ(px, RED_Y, 0.7), P), { tone: 'mid', className: 'poste' }));
    out.push(S(G.solidOf([[0, 0.75], [0.6, 0.75]], FZ(px, RED_Y, POSTE_H - 1.6), P), { tone: 'mid', className: 'herraje' }));
    out.push(D([at([px, RED_Y, POSTE_H + 0.7])], { size: 0.45, tone: 'mid' }));
  }
  return `<g data-part="postes">${out.join('')}</g>`;
}
function txabola() {
  const { x, y, w, d, h } = TXABOLA, out = [];
  out.push(caja(x, x + w, y, y + d, 0, h, 'piedra', 0.3));
  // el tejado de ramas a dos aguas
  const cum = h + 2.6, t = [[x - 0.6, y - 0.6, h], [x + w + 0.6, y - 0.6, h], [x + w + 0.6, y + d / 2, cum], [x - 0.6, y + d / 2, cum]];
  const t2 = [[x - 0.6, y + d / 2, cum], [x + w + 0.6, y + d / 2, cum], [x + w + 0.6, y + d + 0.6, h], [x - 0.6, y + d + 0.6, h]];
  out.push(`<path class="ramaje r0" d="${poly(t)}"/>`, `<path class="ramaje r1" d="${poly(t2)}"/>`);
  let rm = ''; for (let i = 1; i < 8; i++) { const xx = x - 0.6 + i / 8 * (w + 1.2); rm += linea([[xx, y + d / 2, cum], [xx + 0.3, y + d + 0.6, h]]); }
  out.push(L(rm + linea([[x - 0.6, y + d / 2, cum], [x + w + 0.6, y + d / 2, cum]]), { tone: 'lo' }));
  // la mirilla por donde se ve el collado
  const m = [[x + w, y + 1.4, 1.6], [x + w, y + d - 1.4, 1.6], [x + w, y + d - 1.4, 3.1], [x + w, y + 1.4, 3.1]];
  out.push(`<path class="hueco" d="${poly(m)}"/>`, L(poly(m), { tone: 'mid' }));
  return `<g data-part="txabola">${out.join('')}</g>`;
}

// ---------- la figura: el terreno y lo que está de pie, por profundidad ----------
const dePie = [
  ...HAYAS.map((hy) => ({ d: dep([hy[0], hy[1], 0]), svg: haya(hy) })),
  { d: dep([ATALAYA.x, ATALAYA.y, 0]), svg: atalaya() },
  { d: dep([0, RED_Y - 2, 0]), svg: postes() + '<g data-part="red"></g>' },
  { d: dep([TXABOLA.x + TXABOLA.w / 2, TXABOLA.y + TXABOLA.d / 2, 0]), svg: txabola() + '<g data-part="cuerda"></g>' },
].sort((a, b) => a.d - b.d).map((o) => o.svg);
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta del collado de las palomeras de Etxalar: dos montes en terrazas con hayas en otoño y el paso entre ellos; en el monte de la derecha, la atalaya de madera con su escalera, su barandilla y el vigía; en el collado, tres postes altos con las redes tendidas y sus vientos, y la cuerda que baja a la txabola de piedra y ramas donde esperan los de abajo; arriba, el bando de palomas torcaces y la paleta blanca.',
  body: [tablero(), monte(MONTE_I), monte(MONTE_D), placa(), ...dePie, '<g data-part="paleta"></g>', '<g data-part="bando"></g>'],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, POSTES = ${JSON.stringify(POSTES)}, RED_Y = ${RED_Y}, RA = ${RED_ARRIBA}, RB = ${RED_ABAJO}, PH = ${POSTE_H};
const AT = ${JSON.stringify(ATALAYA)}, TX = ${JSON.stringify(TXABOLA)}, PUESTOS = ${JSON.stringify(PUESTOS)};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), f2 = (v) => v.toFixed(2), linea = (pts) => 'M' + pts.map((p) => { const q = at(p); return f2(q[0]) + ' ' + f2(q[1]); }).join('L'), poly = (pts) => linea(pts) + 'Z';
const K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = {}; for (const n of ['atalaya', 'vigia', 'postes', 'red', 'txabola', 'cuerda', 'paleta', 'bando']) el[n] = $(n);
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }, mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0;
const tourAt = (t) => { const T = 3.2 * N + 2, f = (t % T) / T * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
// ---- el bando: 26 palomas en formación suelta; su centro recorre el camino del modelo y, al bajar, se estira en fila ----
const NB = 26, OFF = Array.from({ length: NB }, (_, i) => { const a = i * 2.39996, r = Math.sqrt((i + 0.5) / NB); return [Math.cos(a) * r * 10, Math.sin(a) * r * 6, ((i * 0.618) % 1 - 0.5) * 4]; });
const CAMINO = [[14, -62, 40], [9, -52, 37], [6, -47, 35], [1, -33, 9], [0, RED_Y - 0.6, 5]];
const centro = (s) => { if (s < 1) return mix(CAMINO[0], CAMINO[1], sm(s)); if (s < 2) return mix(CAMINO[1], CAMINO[2], s - 1); if (s < 3) return mix(CAMINO[2], CAMINO[3], sm((s - 2) / 0.9)); return mix(CAMINO[3], CAMINO[4], sm((s - 3) / 0.5)); };
// ---- la red: cae al soltarla (a partir de 3,15) y queda en el suelo, plegada hacia delante ----
const caida = (s) => sm((s - 3.15) / 0.45);
const bordeRed = (c) => ({ zT: RA - (RA - 1.0) * c, yT: RED_Y + 3.5 * c, zB: RB - (RB - 0.25) * Math.min(1, c * 1.6), yB: RED_Y + 1.2 * c });
function red(c, lit) {
  const b = bordeRed(c); let o = '';
  for (let i = 0; i < POSTES.length - 1; i++) {
    const x0 = POSTES[i] + 0.6, x1 = POSTES[i + 1] - 0.6, comba = (x, z) => z - Math.sin((x - x0) / (x1 - x0) * Math.PI) * (0.9 + c * 0.6);
    const arriba = [], abajo = [];
    for (let j = 0; j <= 10; j++) { const x = x0 + (x1 - x0) * j / 10; arriba.push([x, b.yT, comba(x, b.zT)]); abajo.push([x, b.yB, comba(x, b.zB) + (c > 0.9 ? 0 : 0)]); }
    o += '<path class="malla-fondo" d="' + poly(arriba.concat(abajo.slice().reverse())) + '"/>';
    let m = ''; for (let j = 1; j < 10; j++) m += linea([arriba[j], abajo[j]]);
    for (let r = 1; r < 9; r++) { const t = r / 9; m += linea(arriba.map((p, j) => mix(p, abajo[j], t))); }
    o += '<path class="malla" d="' + m + '"/><path class="relinga" d="' + linea(arriba) + linea(abajo) + '"/>';
  }
  // los vientos de delante y el cabo de soltar, que baja de cada poste a la txabola
  let v = ''; for (const px of POSTES) v += linea([[px, RED_Y, PH - 1], [px * 1.15, RED_Y + 14, 0]]);
  o += '<path class="iso-line viento" data-tone="lo" d="' + v + '"/><g class="iso-dots" data-tone="mid">' + POSTES.map((px) => { const q = at([px * 1.15, RED_Y + 14, 0]); return '<circle r=".45" cx="' + f2(q[0]) + '" cy="' + f2(q[1]) + '"/>'; }).join('') + '</g>';
  return o;
}
function cuerda(tira) {
  const tx = [TX.x + TX.w, TX.y + 1.2, 2.4];
  let o = '';
  for (const px of POSTES) { const top = [px + 0.5, RED_Y + 0.4, PH - 2.2], med = mix(top, tx, 0.5); med[2] -= 3 + tira * -2.4; o += linea([top, med, tx]); }
  return '<path class="cabo" d="' + o + '"/><g class="iso-dots" data-tone="mid"><circle r=".5" cx="' + f2(at(tx)[0]) + '" cy="' + f2(at(tx)[1]) + '"/></g>';
}
// ---- una paloma: cuerpo y dos alas que baten; las de delante, más grandes ----
function paloma(p, aleteo, rumbo) {
  const q = at(p), w = 1.7 * K, h = 1.0 * K * aleteo, cx = q[0], cy = q[1], dx = Math.cos(rumbo), dy = Math.sin(rumbo);
  return 'M' + f2(cx - w) + ' ' + f2(cy - h) + 'Q' + f2(cx - w * 0.45) + ' ' + f2(cy - h * 0.2 - 0.4) + ' ' + f2(cx) + ' ' + f2(cy) + 'Q' + f2(cx + w * 0.45) + ' ' + f2(cy - h * 0.2 - 0.4) + ' ' + f2(cx + w) + ' ' + f2(cy - h) + 'M' + f2(cx - dx * 0.5 * K) + ' ' + f2(cy - dy * 0.5 * K) + 'L' + f2(cx + dx * 0.6 * K) + ' ' + f2(cy + dy * 0.6 * K);
}
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  // el vigía: sube el brazo y lanza (entre 1 y 1,4)
  { const z = AT.z + AT.h + 0.7, x = AT.x - 0.4, y = AT.y + 0.6, lanza = sm((s - 1.0) / 0.2) * (1 - sm((s - 1.45) / 0.3));
    const cuerpo = solidSvg(slabOf({ x: x - 0.7, y: y - 0.5, w: 1.4, d: 1.0, r: 0.4 }, z, 2.6, P, 4, 0.2), { tone: 'mid', className: 'ropa' });
    const cab = at([x, y, z + 3.4]), hombro = [x - 0.2, y - 0.4, z + 2.4], mano = mix([x - 1.1, y - 0.6, z + 1.5], [x - 0.9, y - 1.2, z + 4.6], lanza);
    el.vigia.innerHTML = cuerpo + '<circle class="cara" cx="' + f2(cab[0]) + '" cy="' + f2(cab[1]) + '" r="' + f2(0.75 * K) + '"/><path class="brazo" stroke-width="' + f2(0.42 * K) + '" d="' + linea([hombro, mano]) + '"/>'; }
  // la paleta: sale de la mano en 1,25, sube, gira y cae por delante del bando
  { const t = clamp((s - 1.22) / 1.1, 0, 1);
    if (s > 1.22 && s < 3.4) { const p0 = [AT.x - 1.2, AT.y - 1.2, AT.z + AT.h + 5], p2 = [22, -50, 24], p1 = [34, -48, 46];
      const p = [0, 1, 2].map((k3) => (1 - t) * (1 - t) * p0[k3] + 2 * (1 - t) * t * p1[k3] + t * t * p2[k3]), q = at(p), giro = reloj * 9, rx = 1.6 * K, ry = Math.abs(Math.cos(giro)) * 1.6 * K * 0.5 + 0.3;
      const hx = Math.cos(giro * 0.5) * 2.0 * K, hy = Math.sin(giro * 0.5) * 0.6 * K;
      el.paleta.innerHTML = '<g style="opacity:' + f2(1 - sm((s - 3.0) / 0.4)) + '"><path class="mango-paleta" d="M' + f2(q[0]) + ' ' + f2(q[1]) + 'L' + f2(q[0] + hx) + ' ' + f2(q[1] + hy) + '"/><ellipse class="paleta" cx="' + f2(q[0]) + '" cy="' + f2(q[1]) + '" rx="' + f2(rx) + '" ry="' + f2(ry) + '" transform="rotate(' + f2(-18 + Math.sin(giro * 0.5) * 30) + ' ' + f2(q[0]) + ' ' + f2(q[1]) + ')"/></g>'; }
    else el.paleta.innerHTML = ''; }
  // la red y la cuerda
  const c = caida(s), tira = sm((s - 3.0) / 0.15) * (1 - sm((s - 3.6) / 0.3));
  el.red.innerHTML = red(c);
  el.cuerda.innerHTML = cuerda(tira);
  // el bando
  { const C = centro(s), estira = sm((s - 2.0) / 0.8), cogidas = c, out = []; let d = '', dCogidas = '';
    for (let i = 0; i < NB; i++) {
      const o = OFF[i];
      let p = [C[0] + o[0] * (1 - estira * 0.55), C[1] + o[1] * (1 + estira * 1.6) - estira * i * 0.25, C[2] + o[2] * (1 - estira * 0.6) + estira * (i % 5) * 0.5];
      const enRed = s > 3.0 && i % 4 !== 3;     // (tres de cada cuatro se quedan en la red; las otras siguen de largo)
      if (enRed) { const b = bordeRed(cogidas), x = clamp(p[0], POSTES[0] + 2, POSTES[2] - 2), zz = mix([b.zB + 2 + (i % 6) * 2.6], [0.6 + (i % 3) * 0.4], cogidas)[0]; p = [x, mix([RED_Y - 0.4], [RED_Y + 1.5 + (i % 4) * 0.6], cogidas)[0], zz]; }
      else if (s > 3.0) p = [p[0] + (s - 3) * 4, p[1] + (s - 3) * 22, p[2] + (s - 3) * 6];
      const aleteo = enRed ? 0.25 + 0.2 * Math.sin(reloj * 14 + i) * (1 - cogidas) : 0.4 + 0.6 * Math.abs(Math.sin(reloj * (estira > 0.5 ? 7 : 10) + i * 1.7));
      const dir = at([0, 1, -estira])[0] - at([0, 0, 0])[0], diry = at([0, 1, -estira])[1] - at([0, 0, 0])[1], rumbo = Math.atan2(diry, dir);
      out.push([depthOf(p, P), paloma(p, enRed && cogidas > 0.95 ? 0.2 : aleteo, rumbo), enRed]);
    }
    out.sort((a, b) => a[0] - b[0]);
    for (const [, pth, enRed] of out) if (enRed && c > 0.2) dCogidas += pth; else d += pth;
    el.bando.innerHTML = '<path class="paloma" stroke-width="' + f2(0.42 * K) + '" d="' + d + '"/><path class="paloma cogida" stroke-width="' + f2(0.42 * K) + '" d="' + dCogidas + '"/>'; }
  // lo que trabaja en cada paso
  ilumina([el.atalaya], paso <= 1); ilumina([el.paleta], paso === 1); ilumina([el.bando], paso === 2); ilumina([el.red, el.postes, el.cuerda], paso === 3); ilumina([el.txabola], paso >= 3);
  const extra = ['desde la atalaya se ve llegar el bando de palomas torcaces', 'una tabla blanca al aire: creen que es un halcón', 'el bando baja a ras del collado para escapar', 'desde la txabola tiran de la cuerda: caen las redes', 'las palomas quedan enredadas en la red'][paso];
  const text = (paso + 1) + ' · ' + PASOS[paso] + ' · ' + extra;
  if (text !== txt) { readout.textContent = text; stage.setAttribute('aria-valuetext', text); txt = text; }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
  if (touring) { clock += dt; target = tourAt(clock); }
  s = still.matches ? target : s + (target - s) * (1 - Math.exp(-dt / 0.3));
  if (Math.abs(target - s) < 0.002) s = target;
  draw(dt);
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (to) => { touring = false; target = clamp(to, 0, N - 0.001); clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 5000); run(); };
new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: '120px 0px' }).observe(stage);
const puesto = (ev) => { const m = svgEl.getScreenCTM(); if (!m) return 0; const q = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse()); let best = 0, bd = Infinity; PUESTOS.forEach((p, i) => { const a = at(p), d = Math.hypot(a[0] - q.x, a[1] - q.y); if (d < bd) { bd = d; best = i; } }); return best + 0.5; };
stage.addEventListener('pointermove', (ev) => steer(puesto(ev)));
stage.addEventListener('pointerdown', (ev) => steer(puesto(ev)));
stage.addEventListener('keydown', (ev) => { if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') { ev.preventDefault(); steer(Math.floor(target) + 1.6); } if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') { ev.preventDefault(); steer(Math.floor(target) - 0.4); } });
window.__pasoPalomeras = (v) => { touring = false; target = s = v; draw(0); };
draw(0);
`;

const tonos = (pre, cls, [f, s0, s1, s2, s3, t]) => `${pre}.${cls}>.iso-fill{fill:${f}}${pre}.${cls}>.iso-top{fill:${t}}${pre}.${cls}[data-seamless]>.iso-top{stroke:${t}}` +
  [s0, s1, s2, s3].map((c, i) => `${pre}.${cls}>.iso-shade[data-shade="${i}"]{fill:${c}}${pre}.${cls}[data-seamless]>.iso-shade[data-shade="${i}"]{stroke:${c}}`).join('');
const COLOR = {
  dark: { pasto: ['#2e3a30', '#18201a', '#1e2820', '#243026', '#2a362c', '#36463a'], copa: ['#8a4a22', '#4e2610', '#5e3016', '#6e3a1a', '#7e441e', '#a85a2a'],
    copa2: ['#a06a24', '#5a3a10', '#6a4614', '#7a5218', '#8a5e1c', '#c08430'], copa3: ['#6e3a26', '#3c1e12', '#4a2616', '#582e1a', '#66361e', '#884a2e'],
    corteza: ['#5a5662', '#302e36', '#3a3842', '#46424e', '#524e5a', '#66626e'], madera: ['#4a3628', '#2a1d16', '#35261c', '#403022', '#4c3a2a', '#5a4632'],
    poste: ['#5a4430', '#33261a', '#3e2e20', '#4a3626', '#56402c', '#6a5038'], piedra: ['#5a5266', '#2e2838', '#3a3346', '#463e54', '#524962', '#6a6078'],
    herraje: ['#5c5a6a', '#2e2c38', '#3a3846', '#464454', '#525062', '#6e6c7e'], ropa: ['#3a3a6a', '#1e1e3a', '#262648', '#2e2e56', '#363664', '#46468a'] },
  light: { pasto: ['#a6c49a', '#7a9a6e', '#88a87c', '#96b68a', '#a4c498', '#bcd8b0'], copa: ['#d8844a', '#a85a2a', '#b86634', '#c8723e', '#d87e48', '#f0a06a'],
    copa2: ['#e0a850', '#b07c2a', '#c08a36', '#d09842', '#e0a64e', '#f4c470'], copa3: ['#b8684a', '#884028', '#984c32', '#a8583c', '#b86446', '#d48464'],
    corteza: ['#b8b2c0', '#8a8494', '#9892a2', '#a6a0b0', '#b4aebe', '#c4bece'], madera: ['#8a6a50', '#5e4636', '#6c523e', '#7a5e48', '#886a52', '#9a7c62'],
    poste: ['#9a7a58', '#6c523a', '#7a5e44', '#8a6c4e', '#9a7a58', '#b0926c'], piedra: ['#a49aae', '#766c82', '#857b91', '#948aa0', '#a399af', '#bcb2c6'],
    herraje: ['#9c9aaa', '#6e6c7c', '#7c7a8a', '#8a8898', '#9896a6', '#b2b0c0'], ropa: ['#6a6ab0', '#46468a', '#525296', '#5e5ea4', '#6a6ab2', '#8686c8'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--hierba:#3e5a40;--senda:#4a3a2c;--piedrita:#4a4458;--hueco:#0d0718;--ramaje0:#5a4630;--ramaje1:#463622;--malla:#c8b89a;--malla-f:rgba(200,184,154,.08);--relinga:#e0d0b0;--cabo:#c8a878;--paleta:#ffffff;--paloma:#c4cae6;--cogida:#9aa0c4;--cara:#e0b090;--brazo:#46468a;--mango-p:#a88a62}
.iso[data-theme="light"]{--hierba:#7aa070;--senda:#b8a080;--piedrita:#a49aae;--hueco:#6a5a66;--ramaje0:#a88a62;--ramaje1:#8a6c4a;--malla:#6a5a40;--malla-f:rgba(106,90,64,.08);--relinga:#5a4a30;--cabo:#8a6a40;--paleta:#ffffff;--paloma:#5a6080;--cogida:#8a8ea8;--cara:#c89070;--brazo:#5e5ea4;--mango-p:#8a6a40}
.hierba{fill:var(--hierba)}.senda{fill:none;stroke:var(--senda);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:2.4 1.6}.piedrita{fill:var(--piedrita)}
.hueco{fill:var(--hueco)}.ramaje{stroke:var(--anatomy-lo);stroke-width:.3;stroke-linejoin:round}.ramaje.r0{fill:var(--ramaje1)}.ramaje.r1{fill:var(--ramaje0)}
.malla-fondo{fill:var(--malla-f);stroke:none}.malla{fill:none;stroke:var(--malla);stroke-width:.22;opacity:.75}.relinga{fill:none;stroke:var(--relinga);stroke-width:.55;stroke-linecap:round}
.cabo{fill:none;stroke:var(--cabo);stroke-width:.4;stroke-linecap:round}.viento{stroke-width:.3}
.larguero{stroke-width:.6;stroke-linecap:round}.baranda{stroke-width:.5;stroke-linecap:round}
.paleta{fill:var(--paleta);stroke:var(--anatomy-mid);stroke-width:.3}.mango-paleta{stroke:var(--mango-p);stroke-width:1;stroke-linecap:round}
.paloma{fill:none;stroke:var(--paloma);stroke-linecap:round;stroke-linejoin:round}.paloma.cogida{stroke:var(--cogida)}
.cara{fill:var(--cara);stroke:var(--anatomy-lo);stroke-width:.3}.brazo{fill:none;stroke:var(--brazo);stroke-linecap:round}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line,[data-lit] .ramaje{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
[data-part="bando"][data-lit] .paloma{stroke:var(--anatomy-lit)}
[data-part="red"][data-lit] .relinga,[data-part="cuerda"][data-lit] .cabo{stroke:var(--anatomy-lit)}
[data-part="paleta"][data-lit] .paleta{stroke:var(--anatomy-lit);stroke-width:.6}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 19',
  title: 'Las palomeras de Etxalar',
  hint: 'Pasa el ratón por cada pieza',
  readout: '1 · Vigilar · desde la atalaya se ve llegar el bando de palomas torcaces',
  keys: [
    { mark: 'lit', label: 'Lo que trabaja en cada paso: la atalaya, la paleta, el bando, las redes y la txabola' },
    { mark: 'raised', label: 'La paleta blanca, al aire, parece un halcón' },
    { mark: 'flat', label: 'Las redes cuelgan de postes altos, de lado a lado del collado' },
  ],
  caption: 'Cada otoño, grandes bandos de palomas torcaces cruzan los Pirineos hacia el sur, buscando el calor para pasar el invierno. En los collados de Etxalar, entre los montes y el hayedo, los palomeros las esperan como hace siglos, cada uno en su puesto. En lo alto de una atalaya de madera, el vigía ve llegar el bando y lanza al aire una paleta blanca: las palomas creen que es un halcón, el ave que las caza, y para escapar bajan en picado, casi a ras del suelo, justo por el paso del collado. Allí, colgadas de unos postes muy altos, esperan las redes. Escondidos en una txabola de piedra y ramas, los de abajo tiran de la cuerda en el momento justo y las redes caen sobre el bando. Es un trabajo de muchos, que se reparte el pueblo, y en Etxalar se sigue haciendo cada otoño.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Las palomeras de Etxalar, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="5">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Las palomeras de Etxalar', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('palomeras', html, theme);
