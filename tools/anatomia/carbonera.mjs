// Lámina isométrica interactiva de la carbonera (skill Anatomy, 21 de noviembre de 2026; el autor: «la elaboración de
// diferentes alimentos y artesanía [...] todo lo que tenga que ver con Navarra», metido en las misiones). Un claro de hayedo
// en maqueta, sobre su tablero: la txondorra, el montón de leña cubierto de hojas y tierra, abierta en cuña para ver por
// dentro la chimenea del centro y la leña de pie en dos pisos; el fuego baja por la chimenea y la madera se va volviendo
// carbón desde arriba; los respiraderos y el humo, que cambia de color; la escalera apoyada para llegar arriba, la pala en
// su montón de tierra, la chabola de ramas del carbonero, la leñera, el tocón con el hacha, los sacos y el carbón. Al
// recorrerla, paso a paso, se ilumina la pieza que trabaja. Es la que se abre al acabar el taller del carbonero
// («La carbonera», data/oficios.js) y en el material didáctico.
// Uso: node tools/anatomia/carbonera.mjs [--light]  →  entrega/anatomia/carbonera(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 250;

// ---------- el modelo (centímetros de la maqueta) ----------
const DOMO = { x: -40, y: -30, R: 23, Hc: 18, H: 17.3, tierra: 1.5, chim: 2 };
const rDomo = (z) => DOMO.R * Math.sqrt(Math.max(0, 1 - (z / DOMO.Hc) ** 2));        // el radio de la carbonera a la altura z
const rDentro = (z) => Math.max(DOMO.chim, rDomo(z) - DOMO.tierra);                    // y por dentro de la capa de tierra
const zDentro = (r) => DOMO.Hc * Math.sqrt(Math.max(0, 1 - ((r + DOMO.tierra) / DOMO.R) ** 2));   // la altura de la leña a radio r
const ANILLOS = [3.9, 6.9, 9.9, 12.9, 15.9, 18.9];
const PISO = 8;
const CHABOLA = { x: -114, y: -42, r: 8.5, h: 13 };
const LENA = { x0: -126, x1: -103, y: -21 };
const TOCON = { x: -90, y: -13 };
const SACOS = [[14, -26], [21, -20], [11, -17]];
const HAYAS = [[-84, -51], [-4, -51], [22, -49], [38, -36]];
const PASOS = ['La leña', 'La chimenea', 'La tierra', 'El fuego', 'Vigilar', 'El carbón'];

// ---------- la cámara ----------
const PLATE = { x: -142, y: -58, w: 190, d: 58, r: 7 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [-84, -51, 30], [22, -49, 29], [DOMO.x, DOMO.y, DOMO.H + 12]], WIDTH, HEIGHT, { pad: 10, azimuth: 76, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const FZ = (x, y, z = 0) => G.frameAlong([x, y, z], [0, 0, 1]);
const FX = (x, y, z) => G.frameAlong([x, y, z], [1, 0, 0]);
const porDepth = (lista, f) => [...lista].sort((a, b) => dep(f(a)) - dep(f(b)));
const VIS = Math.atan2(dep([0, 1, 0]) - dep([0, 0, 0]), dep([1, 0, 0]) - dep([0, 0, 0]));
const arcoDelante = (x, y, r, z, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = VIS - Math.PI / 2 + i / n * Math.PI; return [x + Math.cos(t) * r, y + Math.sin(t) * r, z]; });
const seam = (x, y, r, z) => k.pathOf(arcoDelante(x, y, r, z).map(at));
const R2x = (i) => (0.5 + i * 0.7548776662) % 1, R2y = (i) => (0.5 + i * 0.5698402910) % 1;
const CUNA = [VIS - 0.55, VIS + 0.55];                                                 // la cuña abierta de la carbonera
const enPlano = (a, r, z) => [DOMO.x + Math.cos(a) * r, DOMO.y + Math.sin(a) * r, z];
const prisma = (a, b, w, cls) => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...d); return S(G.prismOf(G.frameAlong(a, d), [[-w, -w], [w, -w], [w, w], [-w, w]], 0, l, P), { tone: 'mid', className: cls }); };

// ---------- el tablero ----------
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
  let hoja = ''; for (let i = 0; i < 60; i++) { const x = PLATE.x + 8 + R2x(i) * (PLATE.w - 16), y = PLATE.y + 8 + R2y(i) * (PLATE.d - 16); if (Math.hypot(x - DOMO.x, y - DOMO.y) < DOMO.R + 2) continue; const q = at([x, y, 0]); hoja += `<circle class="hojarasca" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${(0.4 + R2x(i + 7) * 0.5).toFixed(2)}"/>`; }
  out.push(hoja);
  const regla = { x: -100, y: -7, w: 44, d: 5.5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.6, 0.6, [1.6, 3], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.8, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.8, 0.6])], { size: 0.45 }));
  const placa = { x: -4, y: -6.5, w: 34, d: 6, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 5, placa.y + 3.7], 0.8, P, 'x'), 'TXONDORRA', { size: 2.4, tone: 'mid' }));
  out.push(D([at([placa.x + 2.2, placa.y + 3, 0.8]), at([placa.x + placa.w - 2.2, placa.y + 3, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- las hayas del claro y los tocones ----------
function haya(x, y) {
  const out = [S(G.solidOf([[0, 1.5], [0.8, 1.2, true], [11, 0.9]], FZ(x, y), P), { tone: 'mid', className: 'corteza' })];
  const bolas = [[x - 2.6, y + 0.5, 14, 4.6], [x + 2.4, y - 0.4, 15, 4.4], [x, y + 1.4, 18.6, 4.8], [x + 0.4, y - 1.2, 12.4, 3.6]];
  out.push(porDepth(bolas, (b) => b).map(([bx, by, bz, r]) => S(G.sphereOf([bx, by, bz], r, P), { tone: 'mid', className: 'copa' })).join(''));
  return out.join('');
}
function tocon(x, y, r = 2.2) {
  return S(k.cylinder(x, y, r, 0, 1.6, P, 24), { tone: 'mid', className: 'madera' }) + L(k.ring(x, y, r * 0.55, 1.6, P, 18), { tone: 'lo' }) + D([at([x, y, 1.6])], { size: 0.35, tone: 'lo' });
}

// ---------- la chabola de ramas del carbonero ----------
function chabola() {
  const { x, y, r, h } = CHABOLA, out = [];
  out.push(S(G.solidOf([[0, r], [h, 0.1]], FZ(x, y), P), { tone: 'mid', className: 'ramas' }));
  let rm = ''; for (let i = 1; i < 9; i++) { const a = VIS - Math.PI / 2 + i / 9 * Math.PI; rm += linea([[x + Math.cos(a) * r, y + Math.sin(a) * r, 0], [x + Math.cos(a) * 0.1, y + Math.sin(a) * 0.1, h]]); }
  out.push(L(rm, { tone: 'lo' }));
  const a = VIS + 0.15, pu = [[x + Math.cos(a - 0.32) * r, y + Math.sin(a - 0.32) * r, 0], [x + Math.cos(a + 0.32) * r, y + Math.sin(a + 0.32) * r, 0], [x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, h * 0.45]];
  out.push(`<path class="hueco" d="${poly(pu)}"/>`, L(poly(pu), { tone: 'mid' }));
  return `<g data-part="chabola">${out.join('')}</g>`;
}

// ---------- la leñera, el tocón con el hacha ----------
function lenera() {
  const out = [], troncos = [];
  [[4, 1.5], [3, 4.1], [2, 6.7]].forEach(([n, z], c) => { for (let i = 0; i < n; i++) troncos.push([LENA.y + 2 + i * 3 + c * 1.5, z]); });
  for (const [y, z] of porDepth(troncos, ([y, z]) => [LENA.x1, y, z])) {
    const F = FX(LENA.x0, y, z);
    out.push(S(G.solidOf([[0, 1.5], [LENA.x1 - LENA.x0, 1.5]], F, P), { tone: 'mid', className: 'corteza' }));
    out.push(L(G.circleOf(F, LENA.x1 - LENA.x0, 0.8, P), { tone: 'lo' }), D([at([LENA.x1, y, z])], { size: 0.3, tone: 'lo' }));
  }
  return `<g data-part="lenera">${out.join('')}</g>`;
}
function hacha() {
  const { x, y } = TOCON, out = [];
  out.push(S(k.cylinder(x, y, 2.6, 0, 3, P, 24), { tone: 'mid', className: 'corteza' }), L(k.ring(x, y, 1.6, 3, P, 18) + k.ring(x, y, 0.8, 3, P, 14), { tone: 'lo' }));
  const fil = [x - 0.6, y + 0.2, 3], cab = [x - 0.2, y + 0.3, 4.2], mango = [x + 3.4, y + 4, 9];
  out.push(L(linea([cab, mango]), { tone: 'mid', className: 'mango' }), D([at(mango)], { size: 0.6, tone: 'mid' }));
  const hoja = [[cab[0] - 1.8, cab[1] - 0.2, cab[2] + 1.4], [cab[0] + 0.6, cab[1] + 0.4, cab[2] + 0.4], [cab[0] + 0.4, cab[1] + 0.4, cab[2] - 0.6], [fil[0] - 1.6, fil[1], fil[2]]];
  out.push(`<path class="hoja" d="${poly(hoja)}"/>`, L(poly(hoja), { tone: 'mid' }));
  return `<g data-part="hacha">${out.join('')}</g>`;
}

// ---------- la carbonera: la tierra por fuera, el suelo de la cuña y los dos cortes con la leña y la chimenea ----------
function domo() {
  const perfil = Array.from({ length: 13 }, (_, i) => { const z = i / 12 * DOMO.H; return [z, rDomo(z), i > 0 && i < 12]; });
  return S(G.solidOf(perfil, FZ(DOMO.x, DOMO.y), P), { tone: 'mid', className: 'tierra', crease: 'none' });
}
function respiraderos() {
  let h = ''; for (let i = 0; i < 9; i++) { const a = VIS - 1.35 + i / 8 * 2.7; if (a > CUNA[0] - 0.12 && a < CUNA[1] + 0.12) continue; const z = 1.6 + (i % 2) * 2.2, q = at(enPlano(a, rDomo(z) + 0.05, z)); h += `<ellipse class="hueco" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" rx="0.9" ry="0.6"/>`; }
  return `<g data-part="respiraderos">${h}</g>`;
}
function cuna() {
  const out = [], n = 24;
  // el suelo de la cuña
  const arco = Array.from({ length: n + 1 }, (_, i) => enPlano(CUNA[0] + i / n * (CUNA[1] - CUNA[0]), DOMO.R, 0));
  out.push(`<path class="suelo-q" d="${poly([[DOMO.x, DOMO.y, 0], ...arco])}"/>`, L(poly([[DOMO.x, DOMO.y, 0], ...arco]), { tone: 'mid' }));
  // los dos cortes, el de atrás primero
  const cortes = porDepth(CUNA.map((a, i) => ({ a, i })), ({ a }) => enPlano(a, DOMO.R / 2, 4));
  for (const { a, i } of cortes) {
    const zs = Array.from({ length: 41 }, (_, j) => j / 40 * DOMO.H);
    const fuera = zs.map((z) => enPlano(a, rDomo(z), z)), dentro = zs.map((z) => enPlano(a, rDentro(z), z));
    const todo = [enPlano(a, 0, 0), ...fuera, enPlano(a, 0, DOMO.H)];
    const pl = [];
    pl.push(`<path class="lena" d="${poly(todo)}"/>`);
    pl.push(`<g data-part="carbon-${i}"></g>`);
    // las juntas de la leña de pie (cada anillo) y el piso
    let ju = ''; for (const r of ANILLOS) { const zt = zDentro(r); if (zt > 0.5) ju += linea([enPlano(a, r, 0), enPlano(a, r, zt)]); }
    ju += linea([enPlano(a, DOMO.chim, PISO), enPlano(a, rDentro(PISO), PISO)]);
    pl.push(L(ju, { tone: 'lo', className: 'junta' }));
    // la capa de hojas y tierra
    pl.push(`<path class="tierra-c" d="${poly([...fuera, ...dentro.slice().reverse()])}"/>`, L(linea(dentro), { tone: 'mid' }));
    // la chimenea (y su resplandor, vivo)
    const ch = [enPlano(a, 0, 0), enPlano(a, DOMO.chim, 0), enPlano(a, DOMO.chim, DOMO.H), enPlano(a, 0, DOMO.H)];
    pl.push(`<path class="hueco" d="${poly(ch)}"/>`, `<g data-part="brillo-${i}"></g>`, L(poly(ch), { tone: 'mid' }));
    pl.push(L(poly(todo), { tone: 'mid' }));
    out.push(`<g data-part="corte-${i}">${pl.join('')}</g>`);
  }
  return `<g data-part="cuna">${out.join('')}</g>`;
}
function bocaChimenea() {
  const out = [];
  out.push(`<path class="hueco" d="${k.ring(DOMO.x, DOMO.y, DOMO.chim + 0.2, DOMO.H + 0.02, P, 20)}"/>`, L(k.ring(DOMO.x, DOMO.y, DOMO.chim + 0.2, DOMO.H + 0.02, P, 20), { tone: 'mid' }));
  return `<g data-part="boca">${out.join('')}<g data-part="llamas"></g></g>`;
}
// la escalera apoyada en la carbonera, por el lado de +x
function escalera() {
  const out = [], aL = VIS - 1.05, zt = 11.5, rt = rDomo(zt) + 0.5;
  const t = [DOMO.x + Math.cos(aL) * rt, DOMO.y + Math.sin(aL) * rt, zt], b = [DOMO.x + Math.cos(aL) * (DOMO.R + 8), DOMO.y + Math.sin(aL) * (DOMO.R + 8), 0];
  const d = [t[0] - b[0], t[1] - b[1], t[2] - b[2]], lat = [-d[1], d[0], 0], ll = Math.hypot(lat[0], lat[1]), o = [lat[0] / ll * 1.4, lat[1] / ll * 1.4, 0];
  const rails = porDepth([-1, 1], (s) => [b[0] + o[0] * s, b[1] + o[1] * s, 5]);
  out.push(prisma([b[0] + o[0] * rails[0], b[1] + o[1] * rails[0], 0], [t[0] + o[0] * rails[0], t[1] + o[1] * rails[0], t[2]], 0.3, 'madera'));
  for (let i = 1; i < 6; i++) { const f = i / 6, c = [b[0] + d[0] * f, b[1] + d[1] * f, b[2] + d[2] * f]; out.push(prisma([c[0] - o[0], c[1] - o[1], c[2]], [c[0] + o[0], c[1] + o[1], c[2]], 0.2, 'madera')); }
  out.push(prisma([b[0] + o[0] * rails[1], b[1] + o[1] * rails[1], 0], [t[0] + o[0] * rails[1], t[1] + o[1] * rails[1], t[2]], 0.3, 'madera'));
  return `<g data-part="escalera">${out.join('')}</g>`;
}
// la pala clavada en su montón de tierra
function pala() {
  const x = -12, y = -9, out = [];
  out.push(S(G.solidOf([[0, 4], [1.2, 2.8, true], [2.2, 1]], FZ(x, y), P), { tone: 'mid', className: 'tierra', crease: 'none' }));
  const a = [x + 0.4, y, 1.8], m = [x + 3.6, y - 3, 12];
  out.push(L(linea([a, m]), { tone: 'mid', className: 'mango' }), D([at(m), at(a)], { size: 0.55, tone: 'mid' }));
  return `<g data-part="pala">${out.join('')}</g>`;
}
// los sacos y el montón de carbón
function sacos() {
  const out = [];
  for (const [x, y] of porDepth(SACOS, ([x, y]) => [x, y, 0])) {
    out.push(S(G.solidOf([[0, 2.6], [1, 3, true], [4, 2.8, true], [5.2, 1.8, true], [5.6, 1.1]], FZ(x, y), P), { tone: 'mid', className: 'saco', crease: 'none' }));
    out.push(`<path class="carbon-in" d="${k.ring(x, y, 0.9, 5.62, P, 14)}"/>`, L(seam(x, y, 2.85, 4.6), { tone: 'lo' }));
  }
  const cx = 36, cy = -19, r = 5.5, h = 3;
  out.push(S(G.solidOf([[0, r], [h * 0.45, r * 0.7, true], [h, 0.8, true]], FZ(cx, cy), P), { tone: 'mid', className: 'carbon', crease: 'none' }));
  let tr = ''; for (let i = 0; i < 22; i++) { const a = VIS - 1.2 + R2x(i) * 2.4, d = 0.15 + R2y(i) * 0.8, z = h * Math.pow(1 - d, 1.25) * 0.98, q = at([cx + Math.cos(a) * r * d, cy + Math.sin(a) * r * d, z]); tr += `<circle class="trozo" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${(0.35 + R2x(i + 5) * 0.4).toFixed(2)}"/>`; }
  out.push(tr);
  return `<g data-part="sacos">${out.join('')}</g>`;
}

// ---------- la figura (de atrás adelante) ----------
const fondo = porDepth([...HAYAS.map((h) => ({ t: 'h', p: h })), { t: 'c', p: [CHABOLA.x, CHABOLA.y] }, { t: 't', p: [-70, -52] }, { t: 't', p: [10, -53] }], ({ p }) => [p[0], p[1], 0])
  .map(({ t, p }) => t === 'h' ? haya(p[0], p[1]) : t === 'c' ? chabola() : tocon(p[0], p[1])).join('');
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta de una carbonera en un claro de hayedo: la txondorra, un montón de leña de haya cubierto de hojas y tierra, abierta en cuña para ver la chimenea del centro y la leña de pie en dos pisos; los respiraderos, la boca de arriba y la escalera apoyada; la pala en su montón de tierra, la chabola de ramas del carbonero, la leñera, el tocón con el hacha, los sacos y el montón de carbón.',
  body: [
    tablero(), fondo, lenera(), hacha(),
    domo(), respiraderos(), cuna(), bocaChimenea(), escalera(), pala(), sacos(),
    `<g data-part="humo"></g>`,
  ],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, DOMO = ${JSON.stringify(DOMO)}, CUNA = ${JSON.stringify(CUNA)}, VIS = ${VIS};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L'), poly = (pts) => linea(pts) + 'Z';
const K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const rDomo = (z) => DOMO.R * Math.sqrt(Math.max(0, 1 - (z / DOMO.Hc) ** 2)), rDentro = (z) => Math.max(DOMO.chim, rDomo(z) - DOMO.tierra);
const enPlano = (a, r, z) => [DOMO.x + Math.cos(a) * r, DOMO.y + Math.sin(a) * r, z];
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = {}; for (const n of ['carbon-0', 'carbon-1', 'brillo-0', 'brillo-1', 'llamas', 'humo', 'lenera', 'hacha', 'cuna', 'boca', 'respiraderos', 'chabola', 'sacos', 'pala', 'escalera']) el[n] = $(n);
const domoEl = svgEl.querySelector('.tierra');
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
const R = (i) => (0.5 + i * 0.7548776662) % 1;
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0;
const tourAt = (t) => { const T = 3 * N + 2, f = (t % T) / T * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  // el fuego baja por la chimenea; detrás, la leña se vuelve carbón de arriba abajo
  const baja = sm((s - 3.0) / 1.4), zf = DOMO.H * (1 - baja), zc = DOMO.H * (1 - sm((s - 3.5) / 1.9)), vivo = sm((s - 3.0) / 0.2) * (1 - sm((s - 5.2) / 0.4));
  CUNA.forEach((a, i) => {
    el['brillo-' + i].innerHTML = vivo > 0.02 && zf < DOMO.H - 0.1 ? '<path class="resplandor" style="opacity:' + (0.55 + 0.45 * vivo * (0.8 + 0.2 * Math.sin(reloj * 9 + i))).toFixed(2) + '" d="' + poly([enPlano(a, 0.15, zf), enPlano(a, DOMO.chim - 0.15, zf), enPlano(a, DOMO.chim - 0.15, DOMO.H), enPlano(a, 0.15, DOMO.H)]) + '"/>' : '';
    let car = '';
    if (zc < DOMO.H - 0.2) { const pts = [enPlano(a, DOMO.chim, zc)]; for (let j = 0; j <= 24; j++) { const z = zc + j / 24 * (DOMO.H - zc); pts.push(enPlano(a, rDentro(z), z)); } car = '<path class="carbonizado" d="' + poly(pts) + '"/>'; }
    el['carbon-' + i].innerHTML = car;
  });
  // las llamas de la boca, mientras el fuego está arriba
  const arriba = sm((s - 3.0) / 0.2) * (1 - sm((s - 4.0) / 0.5));
  let ll = ''; if (arriba > 0.05) for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, B = at([DOMO.x + Math.cos(a) * 1.1, DOMO.y + Math.sin(a) * 1.1, DOMO.H]), h = arriba * (1.4 + 0.6 * Math.sin(reloj * 10 + i * 1.9)) * K, w = 0.55 * K; ll += '<path class="llama" d="M' + (B[0] - w).toFixed(1) + ' ' + B[1].toFixed(1) + 'Q' + B[0].toFixed(1) + ' ' + (B[1] - h * 1.6).toFixed(1) + ' ' + (B[0] + w).toFixed(1) + ' ' + B[1].toFixed(1) + 'Z"/>'; }
  el.llamas.innerHTML = ll;
  // el humo: blanco y espeso al principio, azulado y fino al final; también por los respiraderos
  const humo = sm((s - 3.0) / 0.3) * (1 - sm((s - 5.25) / 0.4)), azul = sm((s - 4.2) / 0.8);
  let hm = '';
  if (humo > 0.02) {
    for (let i = 0; i < 7; i++) { const f = (reloj * 0.2 + i / 7) % 1, q = at([DOMO.x + f * 7 + Math.sin(reloj * 0.8 + i) * 0.9, DOMO.y - f * 3, DOMO.H + 1 + f * 14]); hm += '<circle class="humo-b" style="--azul:' + azul.toFixed(2) + ';opacity:' + ((1 - f) * humo * (0.85 - 0.45 * azul)).toFixed(2) + '" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="' + ((1.4 + f * 3.6) * K * (0.75 - 0.25 * azul)).toFixed(2) + '"/>'; }
    if (s > 3.9) for (let v = 0; v < 4; v++) { const a = VIS - 1.35 + [0, 2, 6, 8][v] / 8 * 2.7, z0 = 1.6 + ([0, 2, 6, 8][v] % 2) * 2.2; for (let i = 0; i < 3; i++) { const f = (reloj * 0.35 + i / 3 + v * 0.27) % 1, p = enPlano(a, rDomo(z0) + 0.4 + f * 2, z0 + f * 6); const q = at(p); hm += '<circle class="humo-b" style="--azul:' + azul.toFixed(2) + ';opacity:' + ((1 - f) * humo * 0.5).toFixed(2) + '" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="' + ((0.6 + f * 1.6) * K * 0.6).toFixed(2) + '"/>'; } }
  }
  el.humo.innerHTML = hm;
  // lo que trabaja en cada paso
  ilumina([el.lenera, el.hacha], paso === 0); ilumina(el.cuna, paso === 1); ilumina([domoEl, el.pala], paso === 2); ilumina([el.boca, el.escalera], paso === 3); ilumina([el.respiraderos, el.chabola], paso === 4); ilumina(el.sacos, paso === 5);
  const extra = ['troncos de haya, cortados y apilados', 'la leña, de pie, alrededor de un hueco', 'hojas y tierra: que no entre el aire', 'se enciende por arriba, por la chimenea', 'días y noches; el humo dice cómo va', 'negro, ligero y frío, a los sacos'][paso];
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
stage.addEventListener('pointermove', (e) => { const b = svgEl.getBoundingClientRect(); steer(clamp((e.clientX - b.left) / b.width, 0, 1) * N); });
stage.addEventListener('pointerdown', (e) => { const b = svgEl.getBoundingClientRect(); steer(clamp((e.clientX - b.left) / b.width, 0, 1) * N); });
stage.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); steer(Math.floor(target) + 1.6); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); steer(Math.floor(target) - 0.4); } });
draw(0);
`;

const tonos = (pre, cls, [f, s0, s1, s2, s3, t]) => `${pre}.${cls}>.iso-fill{fill:${f}}${pre}.${cls}>.iso-top{fill:${t}}${pre}.${cls}[data-seamless]>.iso-top{stroke:${t}}` +
  [s0, s1, s2, s3].map((c, i) => `${pre}.${cls}>.iso-shade[data-shade="${i}"]{fill:${c}}${pre}.${cls}[data-seamless]>.iso-shade[data-shade="${i}"]{stroke:${c}}`).join('');
const COLOR = {
  dark: { tierra: ['#3a2c24', '#1e1612', '#261c16', '#2e221a', '#36281e', '#423024'], copa: ['#3c5a3e', '#203222', '#2a402c', '#334c35', '#3c583e', '#4a6a4c'], corteza: ['#4a4450', '#2a2630', '#34303a', '#3e3a44', '#48444e', '#56525c'],
    madera: ['#4a3628', '#2a1d16', '#35261c', '#403022', '#4c3a2a', '#5a4632'], ramas: ['#4a3a28', '#2a2016', '#35281c', '#403022', '#4c3a2a', '#5a4632'], saco: ['#5a4a34', '#34281c', '#3e3022', '#4a3a2a', '#564432', '#64503c'], carbon: ['#1a1620', '#0c0a10', '#121016', '#18141c', '#1e1a22', '#26202a'] },
  light: { tierra: ['#b89878', '#8a6a50', '#9a785c', '#aa8868', '#b89674', '#c8a888'], copa: ['#8ab27e', '#5e8656', '#6c9462', '#7aa26e', '#88b07c', '#9cc48e'], corteza: ['#b8b2c0', '#8a8494', '#9892a2', '#a6a0b0', '#b4aebe', '#c4bece'],
    madera: ['#8a6a50', '#5e4636', '#6c523e', '#7a5e48', '#886a52', '#9a7c62'], ramas: ['#a88a62', '#7a5e40', '#886a4a', '#987856', '#a88662', '#b89872'], saco: ['#d8c49c', '#a8946c', '#b8a47a', '#c8b488', '#d8c296', '#e8d4aa'], carbon: ['#4a4450', '#2a2630', '#34303a', '#3e3a44', '#48444e', '#56525c'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--hueco:#0d0718;--lena:#7a5236;--carbonizado:#121016;--tierra-c:#4a3426;--suelo-q:#241a16;--resplandor:#ff7a2a;--llama:#ffb03a;--humo:#d8d0e4;--humo-azul:#7a8ad8;--hojarasca:#5a3e2a;--carbon-in:#141018;--trozo:#0a080e;--hoja:#8a8aa0}
.iso[data-theme="light"]{--hueco:#8c7a86;--lena:#c8945e;--carbonizado:#3a3440;--tierra-c:#9a7454;--suelo-q:#7a6050;--resplandor:#ff6a1a;--llama:#ff8a1a;--humo:#c8c0d4;--humo-azul:#6a7ac8;--hojarasca:#c8a070;--carbon-in:#4a4450;--trozo:#2a2630;--hoja:#9a9aae}
.hueco{fill:var(--hueco)}.lena{fill:var(--lena)}.carbonizado{fill:var(--carbonizado);opacity:.92}.tierra-c{fill:var(--tierra-c)}.suelo-q{fill:var(--suelo-q)}.resplandor{fill:var(--resplandor)}.llama{fill:var(--llama);opacity:.9}
.humo-b{fill:color-mix(in srgb,var(--humo-azul) calc(var(--azul,0)*100%),var(--humo))}.hojarasca{fill:var(--hojarasca)}.carbon-in{fill:var(--carbon-in)}.trozo{fill:var(--trozo)}.hoja{fill:var(--hoja)}
.junta{stroke-width:.5}.mango{stroke-width:1.2;stroke-linecap:round}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line,[data-lit] .tb-edge{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 13',
  title: 'La carbonera',
  hint: 'Pasa el ratón: paso a paso',
  readout: '1 · La leña',
  keys: [
    { mark: 'lit', label: 'Lo que trabaja en cada paso: la leña, la chimenea, la tierra, la boca, los respiraderos y los sacos' },
    { mark: 'raised', label: 'La cuña abierta deja ver por dentro: la chimenea del centro y la leña de pie en dos pisos' },
    { mark: 'flat', label: 'Casi sin aire, la madera no arde: se tuesta y se vuelve carbón' },
  ],
  caption: 'En los hayedos de Aezkoa e Irati los carboneros convertían la leña en carbón en la carbonera, la txondorra. Alrededor de una chimenea se ponía la leña de pie, en varios pisos, y se tapaba con hojas y tierra para que casi no entrara aire. Se encendía por arriba y el fuego bajaba poco a poco: la madera no ardía, se tostaba. El carbonero la vigilaba días y noches desde su chabola, abría o tapaba los respiraderos según el color del humo —blanco y espeso al principio, azulado al final— y cerraba cualquier fuga con tierra. Al final quedaba el carbón vegetal, negro y ligero, que se llevaba en sacos a las ferrerías y a las cocinas.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="La carbonera, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="6">${svg}</div>`,
});

const html = k.pageHtml({ title: 'La carbonera', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('carbonera', html, theme);
