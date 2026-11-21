// Lámina isométrica interactiva del pimiento del piquillo de Lodosa (skill Anatomy, 21 de noviembre de 2026; el autor:
// «la elaboración de diferentes alimentos [...] todo lo que tenga que ver con Navarra»). Una conservera en maqueta, sobre su
// tablero: la mata con sus pimientos colgando y el cajón de la recogida; la tolva que llena el horno de llama, un bombo de
// varillas que gira sobre cuatro rodillos encima de una fila de quemadores de gas (la llama directa tuesta la piel); la
// mesa de pelado, sin grifo (se pela a mano y sin agua, para que no pierda sabor), con la bandeja, el cuenco de las pieles
// y el platillo del rabo y las pepitas; la cerradora que cierra la lata con los pimientos enteros, el autoclave que la
// esteriliza y las latas con su contraetiqueta numerada. Al recorrerlo se ve paso a paso y se ilumina la pieza que trabaja.
// La misma secuencia que el producto del piquillo (data/procesos.js, piquillo).
// Uso: node tools/anatomia/piquillo.mjs [--light]  →  entrega/anatomia/piquillo(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import * as T from '../../.claude/skills/anatomy/kit/tube.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 235;

// ---------- el modelo (centímetros de la maqueta) ----------
const DR = { x0: -80, x1: -34, y: -20, z: 30, R: 11, rin: 8.4, rb: 10.2, n: 12 };   // el bombo del horno: un tambor de varillas
const LD = DR.x1 - DR.x0;
const QUEM = { z: 12, x0: DR.x0 + 5, x1: DR.x1 - 5, n: 8 };                          // la fila de quemadores de gas
const ROD = { r: 1.6, ang: 0.74 };                                                    // los rodillos, a ±42° bajo el bombo
const TOLVA = { x: DR.x0 - 13, y: DR.y + 3, z0: 38, z1: 47, arriba: 6.5, abajo: 2 };
const CAJA = { x: -126, y: -44, w: 24, d: 18, h: 10 };
const MESA = { x: -22, y: -42, w: 46, d: 32, z: 15, e: 1.4 };
const ZM = MESA.z + MESA.e;
const BANCO = { x: 30, y: -42, w: 36, d: 30, z: 9, e: 1.2 };
const ZB = BANCO.z + BANCO.e;
const CERR = { x: 56, y: -24, zb: ZB + 2, r: 5.2, h: 3.2 };                           // la cerradora y la lata que cierra
const AUTO = { x: 84, y0: -46, y1: -16, z: 15, r: 11 };
const PL = { x: -114, y: -6 };                                                        // la mata, en su maceta
const PASOS = ['La recogida', 'Asado a la llama', 'Pelado a mano', 'Sin corazón', 'En la lata', 'Esterilizado'];

// ---------- la cámara ----------
const PLATE = { x: -134, y: -52, w: 256, d: 60, r: 7 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [TOLVA.x, TOLVA.y, TOLVA.z1 + 2], [AUTO.x, AUTO.y1 - 5, AUTO.z + AUTO.r + 9], [CERR.x, CERR.y - 7, 37], [PL.x, PL.y, 31]], WIDTH, HEIGHT, { pad: 10, azimuth: 76, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const FZ = (x, y, z = 0) => G.frameAlong([x, y, z], [0, 0, 1]);
const porDepth = (lista, f) => [...lista].sort((a, b) => dep(f(a)) - dep(f(b)));
const unit = (v) => { const l = Math.hypot(...v); return v.map((c) => c / l); };
const mas = (a, b, t = 1) => a.map((v, i) => v + b[i] * t);
// la mitad de un círculo que mira hacia quien mira (la cara de una lata, una etiqueta)
const VIS = Math.atan2(dep([0, 1, 0]) - dep([0, 0, 0]), dep([1, 0, 0]) - dep([0, 0, 0]));
const arcoDelante = (x, y, r, z, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = VIS - Math.PI / 2 + i / n * Math.PI; return [x + Math.cos(t) * r, y + Math.sin(t) * r, z]; });
const banda = (x, y, r, z0, z1) => poly([...arcoDelante(x, y, r, z0), ...arcoDelante(x, y, r, z1).reverse()]);

// ---------- el pimiento: un cono redondeado acabado en pico, con su rabo ----------
const PERFIL = [[0, 0.95], [0.35, 1.45, true], [1.1, 1.62, true], [2.6, 1.38, true], [4.1, 0.92, true], [5.3, 0.45, true], [6, 0.1]];   // (true: nudo suave, sombreado continuo)
function pimiento(base, dir, { esc = 1, cls = 'piq', rabo = true, aplana = 1 } = {}) {
  dir = unit(dir);
  const F = G.frameAlong(base, dir), prof = PERFIL.map(([s, r, b]) => [s * esc, r * esc * aplana, b]);
  // (20 lados bastan a este tamaño; el sombreado continuo solo en los grandes, que en los pequeños pesa mucho y no se nota)
  const cuerpo = S(G.solidOf(prof, F, P, { steps: 20, smooth: esc >= 1 }), { tone: 'mid', crease: 'none', className: cls });
  if (!rabo) return cuerpo;
  const Fr = G.frameAlong(base, dir.map((v) => -v));
  const r = S(G.solidOf([[0, 0.5 * esc], [0.4 * esc, 0.42 * esc], [1.4 * esc, 0.26 * esc]], Fr, P, { steps: 10 }), { tone: 'mid', crease: 'none', className: 'rabo' });
  return dep(mas(base, dir)) > dep(base) ? r + cuerpo : cuerpo + r;   // (el rabo, detrás o delante del cuerpo según hacia dónde apunte)
}

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
  const regla = { x: -100, y: -3, w: 96, d: 5.5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.6, 0.6, [1.6, 3], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.8, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.8, 0.6])], { size: 0.45 }));
  const placa = { x: 6, y: -4, w: 72, d: 7.5, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 5, placa.y + 4.4], 0.8, P, 'x'), 'PIQUILLO DE LODOSA', { size: 2.4, tone: 'mid' }));
  out.push(D([at([placa.x + 2.2, placa.y + 3.75, 0.8]), at([placa.x + placa.w - 2.2, placa.y + 3.75, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- la mata del pimiento, en su maceta ----------
function mata() {
  const { x, y } = PL, out = [];
  out.push(S(G.solidOf([[0, 3.6], [0.8, 3.9], [6.4, 5], [7.4, 5.4]], FZ(x, y), P), { tone: 'lo', className: 'maceta' }));
  out.push(L(G.arcOf(FZ(x, y), 5.6, 4.85, P), { tone: 'faint' }));
  out.push(`<path class="tierra" d="${k.ring(x, y, 4.7, 7.2, P, 32)}"/>`, L(k.ring(x, y, 4.7, 7.2, P, 32), { tone: 'mid' }));
  // el tallo y las ramas; acaban en el rabo de cada pimiento o en una hoja
  const base = [x, y, 7.2], cruz = [x, y, 17], copa = [x + 0.6, y - 0.4, 27];
  const ramas = [[[x - 6, y + 2, 21], [x - 7.4, y + 3, 19.5]], [[x + 6, y - 1.5, 22], [x + 7.2, y - 2, 20.6]], [[x - 3, y - 5, 25], [x - 3.6, y - 6, 23.8]], [[x + 3.4, y + 4.4, 24], [x + 4, y + 5.4, 22.6]]];
  let tallo = linea([base, cruz, copa]);
  for (const [m, e] of ramas) tallo += linea([cruz, m, e]);
  out.push(L(tallo, { tone: 'mid', className: 'tallo' }), D([at(base)], { size: 0.6, tone: 'mid' }));
  // las hojas, de atrás adelante, y los pimientos colgando de cada rama
  const hojas = [[[x - 2, y - 2, 19], [-1, -0.6, 0.35]], [[x + 2, y + 1, 18.5], [1, 0.3, 0.3]], [[x - 4, y + 1.5, 23], [-0.8, 0.8, 0.4]], [[x + 3.5, y - 1, 24], [0.7, -0.7, 0.45]], [[x, y - 2.4, 26], [0.1, -1, 0.5]], [[x + 1, y + 1.6, 27.2], [0.4, 1, 0.6]], [[x - 5, y - 2, 20.5], [-1, -0.2, 0.1]], [[x + 5, y + 2.4, 20.8], [0.8, 0.8, 0.15]]];
  const piezas = [];
  for (const [p, d] of hojas) {
    const u = unit(d), n = unit([-u[1], u[0], 0]), pts = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(mas(mas(p, u, t * 5), n, Math.sin(Math.PI * t) * 1.15)); }
    for (let i = 9; i > 0; i--) { const t = i / 10; pts.push(mas(mas(p, u, t * 5), n, -Math.sin(Math.PI * t) * 1.15)); }
    piezas.push([dep(mas(p, u, 2.5)), `<path class="hoja" d="${poly(pts)}"/>` + L(poly(pts), { tone: 'mid' }) + L(linea([p, mas(p, u, 4.7)]), { tone: 'faint' })]);
  }
  for (const [, e] of ramas) piezas.push([dep(e), pimiento(e, [0.12, 0.08, -1], { esc: 0.95 })]);
  out.push(piezas.sort((a, b) => a[0] - b[0]).map((p) => p[1]).join(''));
  return `<g data-part="planta">${out.join('')}</g>`;
}

// ---------- el cajón de la recogida, de listones ----------
function cajon() {
  const { x, y, w, d, h } = CAJA, out = [], e = 1.2;
  const lados = (cual) => {
    const r = [];
    for (const [z0, z1] of [[0.8, 4.2], [5.6, h - 0.8]]) {
      if (cual === 'atras') r.push(S(k.slabOf({ x, y, w, d: e, r: 0.2 }, z0, z1 - z0, P, 1), { tone: 'lo', className: 'madera' }), S(k.slabOf({ x, y, w: e, d, r: 0.2 }, z0, z1 - z0, P, 1), { tone: 'lo', className: 'madera' }));
      else r.push(S(k.slabOf({ x: x + w - e, y, w: e, d, r: 0.2 }, z0, z1 - z0, P, 1), { tone: 'mid', className: 'madera' }), S(k.slabOf({ x, y: y + d - e, w, d: e, r: 0.2 }, z0, z1 - z0, P, 1), { tone: 'mid', className: 'madera' }));
    }
    return r.join('');
  };
  out.push(S(k.slabOf({ x, y, w, d, r: 0.3 }, 0, 0.8, P, 2), { tone: 'lo', className: 'madera' }));
  for (const [px, py] of porDepth([[x, y], [x + w - 1.6, y], [x, y + d - 1.6]], ([a, b]) => [a, b, 0])) out.push(S(k.slabOf({ x: px, y: py, w: 1.6, d: 1.6, r: 0.2 }, 0, h, P, 1), { tone: 'mid', className: 'madera' }));
  out.push(lados('atras'));
  // los pimientos, recién cogidos (rojos, con su rabo verde)
  const pims = [];
  for (let i = 0; i < 14; i++) {
    const u = (i * 0.618 + 0.11) % 1, v = (i * 0.383 + 0.27) % 1, a = i * 2.39;
    pims.push([[x + 4 + u * (w - 8), y + 4 + v * (d - 8), 7.4 + (i % 3) * 0.8], [Math.cos(a), Math.sin(a), 0.12 * ((i % 2) * 2 - 1)]]);
  }
  out.push(porDepth(pims, ([b]) => b).map(([b, dd]) => pimiento(b, dd, { esc: 0.9 })).join(''));
  out.push(lados('delante'));
  out.push(S(k.slabOf({ x: x + w - 1.6, y: y + d - 1.6, w: 1.6, d: 1.6, r: 0.2 }, 0, h, P, 1), { tone: 'mid', className: 'madera' }));
  return `<g data-part="cajon">${out.join('')}</g>`;
}

// ---------- la bombona y la manguera, el motor y la correa ----------
const BOMB = { x: -58, y: -44 };
const MANG = [[BOMB.x + 3.2, BOMB.y, 17.5], [BOMB.x + 7, BOMB.y, 17.5], [BOMB.x + 9, BOMB.y + 6, 12.6], [BOMB.x + 9, DR.y - 1.3, 12.2]];
function gas() {
  const F = FZ(BOMB.x, BOMB.y), out = [];
  out.push(S(G.solidOf([[0, 4.6], [0.6, 5], [14, 5], [16.6, 4.2], [18.2, 2.4], [19, 1.2]], F, P), { tone: 'mid', className: 'bombona' }));
  out.push(L(G.arcOf(F, 3, 5, P) + G.arcOf(F, 12, 5, P), { tone: 'lo' }));
  out.push(S(k.cylinder(BOMB.x, BOMB.y, 0.9, 19, 2.2, P, 16), { tone: 'mid' }));
  out.push(S(k.slabOf({ x: BOMB.x - 0.6, y: BOMB.y - 1.2, w: 4.6, d: 2.4, r: 0.4 }, 16.4, 2.2, P, 1), { tone: 'mid' }));   // el regulador
  out.push(D([at([BOMB.x, BOMB.y, 21.4])], { size: 0.9, tone: 'mid' }));
  out.push(T.tubePieces(G.fillet(MANG, 3), 0.75, P, { maxLength: 400 }).map((pc) => T.tubeSvg(pc, { tone: 'mid', className: 'manguera' })).join(''));
  return out.join('');
}
const RODX0 = DR.x0 + 1.2, MOT = { x: DR.x0 - 5, y: DR.y - 22, z: 5 }, RP = { x: DR.x0 - 5, y: DR.y - Math.sin(ROD.ang) * (DR.R + 1 + ROD.r), z: DR.z - Math.cos(ROD.ang) * (DR.R + 1 + ROD.r) };
function motor() {
  const out = [];
  out.push(S(k.slabOf({ x: MOT.x + 0.9, y: MOT.y - 4, w: 8, d: 8, r: 0.6 }, 0, 9, P, 2, 0.4), { tone: 'lo', className: 'motor' }));
  out.push(L([2.5, 4.5, 6.5].map((z) => k.sideSeam({ x: MOT.x + 0.9, y: MOT.y - 4, w: 8, d: 8, r: 0.6 }, z, P, 2)).join(''), { tone: 'faint' }));
  // la correa, en el plano del eje del rodillo: de la polea del motor a la del rodillo de atrás
  const Fm = G.frameAlong([MOT.x - 0.6, MOT.y, MOT.z], [1, 0, 0]), Fr = G.frameAlong([RP.x - 0.6, RP.y, RP.z], [1, 0, 0]);
  const c1 = [MOT.y, MOT.z], c2 = [RP.y, RP.z], r1 = 1.8, r2 = 3.2, dy = c2[0] - c1[0], dz = c2[1] - c1[1], d = Math.hypot(dy, dz);
  const base = Math.atan2(dz, dy), off = Math.acos((r2 - r1) / d), xs = MOT.x;   // (la correa, en el plano medio de las dos poleas)
  let correa = '';
  for (const sg of [1, -1]) { const a = base + sg * off; correa += linea([[xs, c1[0] - Math.cos(a) * r1, c1[1] - Math.sin(a) * r1], [xs, c2[0] - Math.cos(a) * r2, c2[1] - Math.sin(a) * r2]]); }
  out.push(L(correa, { tone: 'mid', className: 'correa' }));
  out.push(S(G.disc(0, 1.2, 1.8, Fm, P), { tone: 'mid' }));   // (las poleas, encima de la correa: la tapan donde la abrazan)
  out.push(S(G.solidOf([[0, 0.55], [RODX0 - RP.x - 2.8, 0.55]], G.frameAlong([RP.x + 0.6, RP.y, RP.z], [1, 0, 0]), P), { tone: 'mid' }));   // el eje, hasta el rodillo
  out.push(S(G.disc(0, 1.2, 3.2, Fr, P), { tone: 'mid', className: 'polea' }));
  out.push(L(G.spokesOf(Fr, 1.2, 0.8, 2.6, 5, P), { tone: 'lo' }), D([at([RP.x + 0.6, RP.y, RP.z])], { size: 0.6, tone: 'mid' }));
  return `<g data-part="motor">${out.join('')}</g>`;
}

// ---------- los rodillos y sus pies ----------
function rodillo(x, lado) {
  const y = DR.y + lado * Math.sin(ROD.ang) * (DR.R + 1 + ROD.r), z = DR.z - Math.cos(ROD.ang) * (DR.R + 1 + ROD.r), out = [];
  out.push(S(k.slabOf({ x: x - 2.2, y: y - 2, w: 4.4, d: 4, r: 0.4 }, 0, z - 1.2, P, 2, 0.3), { tone: 'lo' }));
  out.push(S(k.slabOf({ x: x - 3, y: y - 2.6, w: 6, d: 5.2, r: 0.4 }, 0, 1.4, P, 2), { tone: 'mid' }));
  out.push(D([at([x - 2.2, y + 2, 1.4]), at([x + 2.2, y + 2, 1.4])], { size: 0.45, tone: 'mid' }));
  out.push(S(G.solidOf([[0, ROD.r], [4.4, ROD.r]], G.frameAlong([x - 2.2, y, z], [1, 0, 0]), P), { tone: 'mid', className: 'rodillo' }));
  return out.join('');
}

// ---------- la tolva que llena el horno ----------
const BAJADA = [[TOLVA.x + 1, TOLVA.y, TOLVA.z0 - 0.6], [DR.x0 + 4, DR.y + 3, DR.z - 4.6]];
function tolva() {
  const out = [], { x, y, z0, z1, arriba: a, abajo: b } = TOLVA;
  for (const [px, py] of porDepth([[x - 5, y - 5], [x + 5, y - 5], [x - 5, y + 5], [x + 5, y + 5]], ([p, q]) => [p, q, 0])) out.push(S(k.cylinder(px, py, 0.8, 0, z0, P, 12), { tone: 'mid' }));
  out.push(S(k.slabOf({ x: x - 6, y: y - 6, w: 12, d: 12, r: 0.4 }, z0 - 1.2, 1.2, P, 2), { tone: 'mid' }));
  // la bajada: una canaleta de chapa hasta la boca del bombo
  out.push(canaleta(BAJADA[0], BAJADA[1], 2.2, 1.4));
  const sup = [[-a, -a], [a, -a], [a, a], [-a, a]], inf = [[-b, -b], [b, -b], [b, b], [-b, b]], caras = [];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; caras.push([[x + inf[i][0], y + inf[i][1], z0], [x + inf[j][0], y + inf[j][1], z0], [x + sup[j][0], y + sup[j][1], z1], [x + sup[i][0], y + sup[i][1], z1]]); }
  const orden = caras.map((c) => ({ c, d: dep(c.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4, s[2] + p[2] / 4], [0, 0, 0])) })).sort((m, n) => m.d - n.d);
  out.push(orden.slice(0, 2).map(({ c }) => `<path class="chapa dentro" d="${poly(c)}"/>` + L(poly(c), { tone: 'mid' })).join(''));
  // los pimientos que asoman por arriba
  out.push(porDepth([[x - 2.6, y - 1.4], [x + 1.8, y - 2.4], [x - 0.6, y + 2.2], [x + 2.6, y + 1.6]], ([p, q]) => [p, q, 0]).map(([p, q], i) => pimiento([p, q, z1 - 1.6], [Math.cos(i * 1.9), Math.sin(i * 1.9), 0.25], { esc: 0.8 })).join(''));
  out.push(orden.slice(2).map(({ c }) => `<path class="chapa" d="${poly(c)}"/>` + L(poly(c), { tone: 'mid' })).join(''));
  return `<g data-part="tolva">${out.join('')}</g>`;
}
// una canaleta en U (el fondo y dos alas), de a a b
function canaleta(a, b, w, h) {
  const d = unit([b[0] - a[0], b[1] - a[1], b[2] - a[2]]), n = unit([-d[1], d[0], 0]), up = [0, 0, h];
  const fondo = [mas(a, n, -w), mas(b, n, -w), mas(b, n, w), mas(a, n, w)];
  const alaI = [mas(a, n, -w), mas(b, n, -w), mas(mas(b, n, -w - 0.6), up), mas(mas(a, n, -w - 0.6), up)];
  const alaD = [mas(a, n, w), mas(b, n, w), mas(mas(b, n, w + 0.6), up), mas(mas(a, n, w + 0.6), up)];
  const caras = [alaI, fondo, alaD].map((c) => [dep(c.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4, s[2] + p[2] / 4], [0, 0, 0])), c]).sort((p, q) => p[0] - q[0]);
  return caras.map(([, c], i) => `<path class="chapa${i === 0 ? ' dentro' : ''}" d="${poly(c)}"/>` + L(poly(c), { tone: 'mid' })).join('');
}

// ---------- el quemador: el tubo de gas con sus boquillas ----------
function quemador() {
  const out = [], y = DR.y, z = QUEM.z;
  for (const x of [QUEM.x0 + 2, QUEM.x1 - 2]) out.push(S(k.slabOf({ x: x - 1.2, y: y - 1.2, w: 2.4, d: 2.4, r: 0.3 }, 0, z - 1, P, 1), { tone: 'lo' }));
  out.push(S(G.solidOf([[0, 1.05], [QUEM.x1 - QUEM.x0, 1.05]], G.frameAlong([QUEM.x0, y, z], [1, 0, 0]), P), { tone: 'mid', className: 'tubo-gas' }));
  const jets = Array.from({ length: QUEM.n }, (_, i) => QUEM.x0 + 2.5 + i * (QUEM.x1 - QUEM.x0 - 5) / (QUEM.n - 1));
  out.push(jets.map((x) => S(k.cylinder(x, y, 0.55, z + 0.7, 0.7, P, 10), { tone: 'mid' })).join(''));
  // la llave del gas, en la punta del tubo
  out.push(S(k.cylinder(QUEM.x0 - 1.2, y, 0.9, z - 0.9, 1.8, P, 12), { tone: 'mid' }), D([at([QUEM.x0 - 1.2, y, z + 1.5])], { size: 0.8, tone: 'mid' }));
  return `<g data-part="quemador">${out.join('')}</g>`;
}

// ---------- el bombo (vivo: gira): aros, varillas y los pimientos que ruedan dentro ----------
const ptB = (s, r, t) => [DR.x0 + s, DR.y + r * Math.cos(t), DR.z + r * Math.sin(t)];
const T0 = Math.atan2(dep([0, 0, 1]) - dep([0, 0, 0]), dep([0, 1, 0]) - dep([0, 0, 0]));   // el ángulo que más mira a quien mira
function aroMitad(s, rIn, rOut, atras) {
  const c = atras ? T0 + Math.PI : T0, fuera = [], dentro = [];
  for (let i = 0; i <= 24; i++) { const t = c - Math.PI / 2 + i / 24 * Math.PI; fuera.push(ptB(s, rOut, t)); dentro.push(ptB(s, rIn, t)); }
  const d = poly([...fuera, ...dentro.reverse()]);
  return `<path class="aro" d="${d}"/>` + L(d, { tone: 'mid' });
}
const AROS = [[0.5, DR.rin, DR.R + 1], [LD / 2, DR.rb - 0.6, DR.rb + 0.6], [LD - 0.5, DR.rin, DR.R + 1]];
const arosAtras = AROS.map(([s, a, b]) => aroMitad(s, a, b, true)).join('');
const arosDelante = AROS.map(([s, a, b]) => aroMitad(s, a, b, false)).join('');

// ---------- la canaleta de salida y la mesa de pelado ----------
const SALIDA = [[DR.x1 - 2, DR.y - 1.5, DR.z - DR.rin + 1.2], [MESA.x + 7, MESA.y + 10, ZM + 2.6]];
const BANDEJA = { x: MESA.x + 2, y: MESA.y + 4, w: 13, d: 12, r: 0.6 };
const PB = [MESA.x + 23, MESA.y + 15, ZM + 1.7], PD = unit([1, 0.32, 0]), PESC = 1.25;   // el pimiento que se pela
const CUENCO = { x: MESA.x + 21, y: MESA.y + 27 }, PLATO = { x: MESA.x + 37, y: MESA.y + 26 };
function mesa() {
  const out = [], m = { x: MESA.x, y: MESA.y, w: MESA.w, d: MESA.d, r: 0.8 };
  for (const [px, py] of porDepth([[m.x + 1.5, m.y + 1.5], [m.x + m.w - 3.5, m.y + 1.5], [m.x + 1.5, m.y + m.d - 3.5], [m.x + m.w - 3.5, m.y + m.d - 3.5]], ([a, b]) => [a, b, 0])) out.push(S(k.slabOf({ x: px, y: py, w: 2, d: 2, r: 0.3 }, 0, MESA.z, P, 1), { tone: 'mid', className: 'acero' }));
  out.push(S(k.slabOf({ x: m.x + 2, y: m.y + 2, w: m.w - 4, d: m.d - 4, r: 0.5 }, 4, 0.8, P, 2), { tone: 'lo', className: 'acero' }));   // la balda de abajo
  out.push(S(k.slabOf(m, MESA.z, MESA.e, P, 3, 0.4), { tone: 'mid', className: 'acero' }));
  out.push(L(k.planOutline(k.insetPlan(m, 1.6), ZM, P), { tone: 'faint' }));
  return out.join('');
}
function bandeja() {
  const b = BANDEJA, out = [];
  out.push(S(k.slabOf(b, ZM, 1.6, P, 2, 0.3), { tone: 'mid', className: 'acero' }));
  out.push(`<path class="hueco" d="${poly([[b.x + 1, b.y + 1, ZM + 1.6], [b.x + b.w - 1, b.y + 1, ZM + 1.6], [b.x + b.w - 1, b.y + b.d - 1, ZM + 1.6], [b.x + 1, b.y + b.d - 1, ZM + 1.6]])}"/>`);
  out.push(L(poly([[b.x + 1, b.y + 1, ZM + 1.6], [b.x + b.w - 1, b.y + 1, ZM + 1.6], [b.x + b.w - 1, b.y + b.d - 1, ZM + 1.6], [b.x + 1, b.y + b.d - 1, ZM + 1.6]]), { tone: 'mid' }));
  out.push(porDepth([[b.x + 3.2, b.y + 3, 0.4], [b.x + 7.4, b.y + 7.6, 2.3], [b.x + 3.4, b.y + 8.4, -0.5]], ([p, q]) => [p, q, ZM]).map(([p, q, a]) => pimiento([p, q, ZM + 2.2], [Math.cos(a), Math.sin(a), 0], { esc: 0.95, cls: 'tostado', rabo: false })).join(''));
  return `<g data-part="bandeja">${out.join('')}</g>`;
}
// el pimiento que se pela: la carne debajo y la piel tostada encima, recortada por donde va el pelado (viva)
function pelando() {
  const prof = PERFIL.map(([s, r, b]) => [s * PESC, r * PESC, b]), F = G.frameAlong(PB, PD);
  const carne = S(G.solidOf(prof, F, P), { tone: 'mid', crease: 'none', className: 'pelado' });
  const piel = S(G.solidOf(prof.map(([s, r, b]) => [s, r * 1.04, b]), F, P), { tone: 'mid', crease: 'none', className: 'tostado' });
  // el rabo con el corazón de pepitas (vivo: sale entero en el paso 4); va detrás del cuerpo, que apunta hacia quien mira
  const Fr = G.frameAlong(PB, PD.map((v) => -v));
  const rabo = `<g data-part="rabo">${S(G.sphereOf(mas(PB, PD, 1.3), 1.05, P), { tone: 'mid', className: 'corazon' })}${S(G.solidOf([[0, 0.62], [0.5, 0.52], [1.8, 0.32]], Fr, P), { tone: 'mid', className: 'rabo' })}</g>`;
  return `<g data-part="pelando">${rabo}${carne}<clipPath id="piel-clip"><path data-part="piel-clip" d=""/></clipPath><g clip-path="url(#piel-clip)">${piel}</g><g data-part="tiras"></g></g>`;
}
function fila() {
  const out = [];
  for (let i = 0; i < 4; i++) out.push(`<g data-part="fila-${i}" style="display:none">${pimiento([MESA.x + 31 + i * 3.6, MESA.y + 3.5, ZM + 1.4], [0.25, 1, 0], { esc: 0.95, cls: 'pelado', rabo: false, aplana: 0.8 })}</g>`);
  return out.join('');
}
function cuenco() {
  const { x, y } = CUENCO, F = FZ(x, y, ZM), out = [];
  out.push(S(G.solidOf([[0, 2.6], [0.8, 3.6], [2.4, 4.4], [3, 4.6]], F, P), { tone: 'mid', className: 'loza' }));
  out.push(`<path class="hueco" d="${k.ring(x, y, 4.1, ZM + 3, P, 32)}"/>`, L(k.ring(x, y, 4.1, ZM + 3, P, 32), { tone: 'mid' }));
  out.push(`<path data-part="pieles" class="pieles" d=""/>`);
  return `<g data-part="cuenco">${out.join('')}</g>`;
}
const SEMILLAS = Array.from({ length: 14 }, (_, i) => { const a = i * 2.4, r = 0.4 + (i % 5) * 0.42; return [PLATO.x + Math.cos(a) * r, PLATO.y + Math.sin(a) * r * 0.9, ZM + 1.1]; });
function platillo() {
  const { x, y } = PLATO, out = [];
  out.push(S(G.solidOf([[0, 2.2], [0.6, 3.2], [1, 3.6]], FZ(x, y, ZM), P), { tone: 'mid', className: 'loza' }));
  out.push(L(k.ring(x, y, 3.1, ZM + 1, P, 28), { tone: 'mid' }));
  out.push(`<g class="iso-dots" data-tone="mid">${SEMILLAS.map((p, i) => { const q = at(p); return `<circle data-part="sem-${i}" class="pepita" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r=".55" style="display:none"/>`; }).join('')}</g>`);
  return `<g data-part="platillo">${out.join('')}</g>`;
}
function cuchillo() {
  const a = [MESA.x + 41, MESA.y + 9, ZM + 0.5], d = unit([0.35, 1, 0]), cuello = mas(a, d, 6), pomo = mas(a, d, 10.5);
  return `<g data-part="cuchillo">${L(linea([a, cuello]), { tone: 'mid', className: 'hoja-cuchillo' })}${L(linea([cuello, pomo]), { tone: 'mid', className: 'mango' })}${D([at(a), at(cuello), at(mas(cuello, d, 1.6)), at(mas(cuello, d, 3.2)), at(pomo)], { size: 0.5, tone: 'mid' })}</g>`;
}

// ---------- el banco de las latas y la cerradora ----------
function lata(x, y, z, r, h, { tapa = true, cls = 'lata' } = {}) {
  const out = [S(k.cylinder(x, y, r, z, h, P, 40, 0.3), { tone: 'mid', className: cls })];
  out.push(L(k.pathOf(arcoDelante(x, y, r, z + 0.5).map(at)) + k.pathOf(arcoDelante(x, y, r, z + h - 0.5).map(at)), { tone: 'lo' }));
  if (tapa) out.push(L(k.ring(x, y, r - 0.6, z + h, P, 32) + k.ring(x, y, r - 1.6, z + h, P, 32), { tone: 'lo' }));
  return out.join('');
}
function banco() {
  const out = [], b = { x: BANCO.x, y: BANCO.y, w: BANCO.w, d: BANCO.d, r: 0.6 };
  for (const [px, py] of porDepth([[b.x + 1.5, b.y + 1.5], [b.x + b.w - 3.5, b.y + 1.5], [b.x + 1.5, b.y + b.d - 3.5], [b.x + b.w - 3.5, b.y + b.d - 3.5]], ([p, q]) => [p, q, 0])) out.push(S(k.slabOf({ x: px, y: py, w: 2, d: 2, r: 0.3 }, 0, BANCO.z, P, 1), { tone: 'mid', className: 'madera' }));
  out.push(S(k.slabOf(b, BANCO.z, BANCO.e, P, 3, 0.3), { tone: 'mid', className: 'madera' }));
  out.push(L([b.x + 10.5, b.x + 21, b.x + 31.5].map((xx) => linea([[xx, b.y + 0.3, ZB], [xx, b.y + b.d - 0.3, ZB]])).join(''), { tone: 'faint' }));
  // las latas vacías, apiladas, y las tapas
  out.push(lata(b.x + 7, b.y + 8, ZB, 5.2, 3.2, { tapa: false }) + lata(b.x + 7, b.y + 8, ZB + 3.2, 5.2, 3.2, { tapa: false }) + lata(b.x + 7, b.y + 8, ZB + 6.4, 5.2, 3.2, { tapa: false }));
  out.push(`<path class="hueco" d="${k.ring(b.x + 7, b.y + 8, 4.7, ZB + 9.6, P, 32)}"/>`, L(k.ring(b.x + 7, b.y + 8, 4.7, ZB + 9.6, P, 32), { tone: 'mid' }));
  for (let i = 0; i < 4; i++) out.push(S(k.cylinder(b.x + 8, b.y + 21, 5.6, ZB + i * 0.7, 0.7, P, 40), { tone: 'mid', className: 'lata' }));
  out.push(L(k.ring(b.x + 8, b.y + 21, 4.6, ZB + 2.8, P, 32), { tone: 'lo' }));
  return out.join('');
}
const ZH0 = CERR.zb + CERR.h + 7;                                    // el cabezal arriba; baja hasta la boca de la lata
function cerradora() {
  const { x, y, zb, r, h } = CERR, out = [];
  out.push(S(k.slabOf({ x: x - 8, y: y - 11, w: 16, d: 17, r: 0.8 }, ZB, 2, P, 2, 0.4), { tone: 'lo', className: 'maquina' }));
  out.push(D([[x - 6.5, y - 9.5], [x + 6.5, y - 9.5], [x - 6.5, y + 4.5], [x + 6.5, y + 4.5]].map(([p, q]) => at([p, q, zb])), { size: 0.45, tone: 'mid' }));
  out.push(S(k.cylinder(x, y - 8, 1.7, zb, 34 - zb, P, 20), { tone: 'mid', className: 'maquina' }));
  out.push(`<path data-part="vastago" class="iso-line" data-tone="mid" style="stroke-width:1.1" d=""/>`);
  out.push(S(k.slabOf({ x: x - 2.4, y: y - 10.2, w: 4.8, d: 11, r: 0.6 }, 32, 2.6, P, 2, 0.3), { tone: 'mid', className: 'maquina' }));
  // la lata que se cierra: los pimientos enteros, uno a uno, dentro de su boca
  out.push(`<g data-part="lata">${lata(x, y, zb, r, h, { tapa: false })}<path class="hueco" d="${k.ring(x, y, r - 0.5, zb + h, P, 32)}"/>`);
  out.push(`<clipPath id="boca-lata"><path d="${k.ring(x, y, r - 0.5, zb + h, P, 32)}"/></clipPath><g clip-path="url(#boca-lata)">`);
  const enLata = [];
  for (let i = 0; i < 5; i++) { const a = -2.2 + i * 1.05; enLata.push([i, [x - Math.cos(a) * 3.6, y - Math.sin(a) * 3.6, zb + h - 1.1], [Math.cos(a), Math.sin(a), 0]]); }
  out.push(enLata.map(([i, b, d]) => `<g data-part="enlata-${i}" style="display:none">${pimiento(b, d, { esc: 0.72, cls: 'pelado', rabo: false, aplana: 0.6 })}</g>`).join(''));
  out.push(`</g>${L(k.ring(x, y, r - 0.5, zb + h, P, 32), { tone: 'mid' })}<g data-part="tapa-lata" style="display:none">${S(k.cylinder(x, y, r + 0.15, zb + h, 0.5, P, 40), { tone: 'mid', className: 'lata' })}${L(k.ring(x, y, r - 0.8, zb + h + 0.5, P, 32) + k.ring(x, y, r - 1.8, zb + h + 0.5, P, 32), { tone: 'lo' })}</g></g>`);
  // el cabezal (vivo: baja), con la tapa debajo, y la palanca
  out.push(`<g data-part="cabezal"><g data-part="tapa-cab">${S(k.cylinder(x, y, r + 0.15, ZH0 - 0.5, 0.5, P, 40), { tone: 'mid', className: 'lata' })}</g>${S(k.cylinder(x, y, r - 0.6, ZH0, 1.4, P, 32), { tone: 'mid', className: 'maquina' })}${S(k.cylinder(x, y, 3.2, ZH0 + 1.4, 3.4, P, 24), { tone: 'mid', className: 'maquina' })}${L(k.pathOf(arcoDelante(x, y, 3.2, ZH0 + 3.1).map(at)), { tone: 'lo' })}</g>`);
  out.push(`<g data-part="palanca"><path data-part="palanca-l" class="iso-line" data-tone="mid" style="stroke-width:1.2" d=""/><g class="iso-dots" data-tone="mid"><circle data-part="eje-pal" r="0.7"/><circle data-part="pomo-pal" r="1.3"/></g></g>`);
  return `<g data-part="cerradora">${out.join('')}</g>`;
}

// ---------- el autoclave ----------
const LA = AUTO.y1 - AUTO.y0, FA = G.frameAlong([AUTO.x, AUTO.y0, AUTO.z], [0, 1, 0]);
const MAN = { x: AUTO.x - 4, y: AUTO.y1 - 6, z: AUTO.z + AUTO.r + 5.6, r: 3.4 };   // el manómetro, mirando hacia delante
function autoclave() {
  const out = [], { x, y0, y1, z, r } = AUTO;
  for (const yy of [y0 + 5, y1 - 7]) out.push(S(k.slabOf({ x: x - 8, y: yy, w: 16, d: 3, r: 0.3 }, 0, z - r + 3, P, 1), { tone: 'lo', className: 'maquina' }));
  out.push(S(G.solidOf([[0, 3], [0.8, 6.4], [2, 8.8], [3.6, 10.3], [5.4, r], [LA - 1.4, r]], FA, P), { tone: 'mid', className: 'autoclave' }));
  out.push(L(G.arcOf(FA, 12, r, P) + G.arcOf(FA, 20, r, P), { tone: 'lo' }));
  out.push(S(G.ringBand(LA - 1.4, LA, r - 1, r + 1.4, FA, P), { tone: 'mid', className: 'autoclave' }));
  out.push(S(G.disc(LA, LA + 1.6, r + 0.6, FA, P), { tone: 'mid', className: 'puerta' }));
  out.push(D(G.dotsOf(FA, LA + 1.6, r - 0.4, 14, P, { all: true }), { size: 0.5, tone: 'mid' }));
  // el volante de cierre en el centro de la puerta
  out.push(S(G.disc(LA + 1.6, LA + 2.4, 1.6, FA, P), { tone: 'mid' }));
  const Fv = G.frameAlong([x, y1 + 3.4, z], [0, 1, 0]);
  out.push(L(G.circleOf(Fv, 0, 5, P), { tone: 'mid', className: 'volante' }), L(G.spokesOf(Fv, 0, 1.4, 5, 4, P, { phase: 0.4 }), { tone: 'mid' }));
  // la bisagra, a un lado
  out.push(S(k.cylinder(x + r + 1.6, y1 + 0.4, 0.9, z - 4, 8, P, 12), { tone: 'mid' }));
  // la válvula de arriba (por donde sale el vapor) y el manómetro
  out.push(S(k.cylinder(x + 3, y0 + 9, 0.9, z + r - 0.6, 3.4, P, 12), { tone: 'mid' }), S(k.cylinder(x + 3, y0 + 9, 1.5, z + r + 2.8, 0.9, P, 16), { tone: 'mid' }));
  out.push(`<g data-part="vapor"></g>`);
  out.push(S(k.cylinder(MAN.x, MAN.y, 0.6, z + r - 0.4, MAN.z - z - r + 0.4 - MAN.r + 0.6, P, 10), { tone: 'mid' }));
  const Fm = G.frameAlong([MAN.x, MAN.y - 1, MAN.z], [0, 1, 0]);
  out.push(S(G.disc(0, 1.4, MAN.r, Fm, P), { tone: 'mid', className: 'manometro' }));
  const yc = MAN.y + 0.45, pt = (t, rr) => [MAN.x + Math.cos(t) * rr, yc, MAN.z + Math.sin(t) * rr];
  let marcas = ''; for (let i = 0; i <= 8; i++) { const t = Math.PI * 1.2 - i / 8 * Math.PI * 1.4; marcas += linea([pt(t, MAN.r - 0.45), pt(t, MAN.r - (i % 4 === 0 ? 1.5 : 1))]); }
  out.push(L(marcas, { tone: 'mid' }));
  out.push(`<path data-part="aguja" class="aguja" d=""/>`, D([at([MAN.x, yc, MAN.z])], { size: 0.55, tone: 'mid' }));
  return `<g data-part="autoclave">${out.join('')}</g>`;
}

// ---------- las latas acabadas, con su etiqueta y la contraetiqueta numerada ----------
function latasHechas() {
  const out = [], hecha = (x, y, z) => {
    const r = 6, h = 3.6;
    return lata(x, y, z, r, h) + `<path class="etiqueta" d="${banda(x, y, r + 0.05, z + 0.8, z + h - 0.8)}"/>` + L(k.pathOf(arcoDelante(x, y, r + 0.05, z + 0.8).map(at)) + k.pathOf(arcoDelante(x, y, r + 0.05, z + h - 0.8).map(at)), { tone: 'mid' }) + L(k.pathOf(arcoDelante(x, y, r + 0.05, z + h / 2, 24).map(at).slice(6, 19)), { tone: 'faint', free: true });
  };
  out.push(hecha(110, -14, 0), hecha(104, -3, 0), hecha(104, -3, 3.6));
  // la contraetiqueta numerada, pegada en la tapa de arriba
  const c = { x: 99.4, y: -5.2, w: 9.2, d: 4.4, r: 0.4 };
  out.push(S(k.slabOf(c, 7.2, 0.2, P, 2), { tone: 'mid', className: 'papel' }));
  out.push(k.faceTextSvg(k.topMatrix([c.x + 0.9, c.y + 2.5], 7.4, P, 'x'), 'Nº 0427', { size: 1.4, tone: 'mid' }));
  return `<g data-part="latas">${out.join('')}</g>`;
}

// ---------- la figura ----------
const RODS = [[DR.x0 + 1.2, -1], [DR.x1 - 1.2, -1], [DR.x0 + 1.2, 1], [DR.x1 - 1.2, 1]];
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta de una conservera de pimientos del piquillo: la mata y el cajón de la recogida; la tolva que llena el horno, un bombo de varillas que gira sobre rodillos encima de una fila de quemadores de gas; la mesa de pelado sin grifo, con la bandeja de los pimientos asados, el pimiento que se pela, el cuenco de las pieles y el platillo del rabo y las pepitas; la cerradora que cierra la lata con los pimientos enteros, el autoclave que la esteriliza y las latas acabadas con su contraetiqueta numerada.',
  body: [
    tablero(),
    gas(), motor(),
    cajon(), tolva(),
    RODS.filter(([, l]) => l < 0).map(([x, l]) => rodillo(x, l)).join(''),
    quemador(),
    `<g data-part="llamas"></g>`,
    `<g data-part="horno"></g>`,
    RODS.filter(([, l]) => l > 0).map(([x, l]) => rodillo(x, l)).join(''),
    `<g data-part="salida">${canaleta(SALIDA[0], SALIDA[1], 2.4, 1.4)}</g><g data-part="rodando"></g>`,
    mesa(), bandeja(), fila(), pelando(), cuenco(), platillo(), cuchillo(), `<g data-part="caen"></g>`,
    banco(), cerradora(),
    autoclave(),
    mata(),
    latasHechas(),
  ],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, DR = ${JSON.stringify(DR)}, LD = ${LD}, QUEM = ${JSON.stringify(QUEM)}, T0 = ${T0};
const AROS_A = ${JSON.stringify(arosAtras)}, AROS_D = ${JSON.stringify(arosDelante)}, SALIDA = ${JSON.stringify(SALIDA)};
const PB = ${JSON.stringify(PB)}, PD = ${JSON.stringify(PD)}, PESC = ${PESC}, CUENCO = ${JSON.stringify(CUENCO)}, PLATO = ${JSON.stringify(PLATO)}, ZM = ${ZM};
const CERR = ${JSON.stringify(CERR)}, ZH0 = ${ZH0}, MAN = ${JSON.stringify(MAN)}, AUTO = ${JSON.stringify(AUTO)};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L'), poly = (pts) => linea(pts) + 'Z';
const dep = (p) => depthOf(p, P), K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = { horno: $('horno'), llamas: $('llamas'), rodando: $('rodando'), pielClip: $('piel-clip'), tiras: $('tiras'), pieles: $('pieles'), rabo: $('rabo'), caen: $('caen'),
  cabezal: $('cabezal'), tapaCab: $('tapa-cab'), tapaLata: $('tapa-lata'), vastago: $('vastago'), palanca: $('palanca-l'), ejePal: $('eje-pal'), pomoPal: $('pomo-pal'), aguja: $('aguja'), vapor: $('vapor'),
  planta: $('planta'), cajon: $('cajon'), tolva: $('tolva'), quemador: $('quemador'), salida: $('salida'), pelando: $('pelando'), cuenco: $('cuenco'), platillo: $('platillo'), cuchillo: $('cuchillo'),
  lata: $('lata'), cerradora: $('cerradora'), autoclave: $('autoclave'), latas: $('latas') };
const fila = [0, 1, 2, 3].map((i) => $('fila-' + i)), enlata = [0, 1, 2, 3, 4].map((i) => $('enlata-' + i)), sem = Array.from({ length: 14 }, (_, i) => $('sem-' + i));
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
const muestra = (n, on) => { const v = on ? '' : 'none'; if (n && n.style.display !== v) n.style.display = v; };
const ptB = (s, r, t) => [DR.x0 + s, DR.y + r * Math.cos(t), DR.z + r * Math.sin(t)];
const mas = (a, b, t = 1) => a.map((v, i) => v + b[i] * t);
// un pimiento visto de lado (para los que ruedan): base, punta y radio
function pq(b3, t3, r) {
  const B = at(b3), Tt = at(t3); let dx = Tt[0] - B[0], dy = Tt[1] - B[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  const nx = -dy, ny = dx, w = r * K, p = (u, v) => [B[0] + dx * l * u + nx * w * v, B[1] + dy * l * u + ny * w * v];
  const pts = [p(-0.06, 0), p(-0.03, 0.72), p(0.08, 1), p(0.35, 0.88), p(0.65, 0.55), p(0.88, 0.22), p(1, 0), p(0.88, -0.22), p(0.65, -0.55), p(0.35, -0.88), p(0.08, -1), p(-0.03, -0.72)];
  return 'M' + pts.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'Z';
}
const pimRueda = (b, t, r, tueste) => { const d = pq(b, t, r); return '<path class="pq-rojo" d="' + d + '"/><path class="pq-tost" style="opacity:' + tueste.toFixed(2) + '" d="' + d + '"/><path class="iso-line" data-tone="mid" d="' + d + '"/>'; };
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0, giro = 0, vel = 0, avance = 0;
const tourAt = (t) => { const T = 2.8 * N + 2, f = (t % T) / T * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  // el horno: la llama se enciende, el bombo gira y los pimientos lo cruzan rodando, del rojo al tostado
  const fuego = sm((s - 0.85) / 0.35) * (1 - sm((s - 2.15) / 0.4)) * 0.85 + 0.15;
  vel += ((s > 0.9 && s < 2.3 ? 1.6 : 0) - vel) * (1 - Math.exp(-dt / 0.7)); giro += vel * dt; avance += vel * dt * 0.07;
  let ll = '';
  for (let j = 0; j < QUEM.n; j++) {
    const x = QUEM.x0 + 2.5 + j * (QUEM.x1 - QUEM.x0 - 5) / (QUEM.n - 1), h = (fuego > 0.2 ? 5.2 : 1.4) * fuego * (0.8 + 0.2 * Math.sin(reloj * 13 + j * 1.7)) + 0.6;
    const B = at([x, DR.y, QUEM.z + 1.3]), Tt = at([x, DR.y, QUEM.z + 1.3 + h]), w = 0.95 * K, wi = 0.5 * K, sx = Math.sin(reloj * 9 + j) * 0.4;
    ll += '<path class="llama" d="M' + (B[0] - w).toFixed(1) + ' ' + B[1].toFixed(1) + 'Q' + (B[0] - w * 1.1).toFixed(1) + ' ' + ((B[1] + Tt[1]) / 2).toFixed(1) + ' ' + (Tt[0] + sx).toFixed(1) + ' ' + Tt[1].toFixed(1) + 'Q' + (B[0] + w * 1.1).toFixed(1) + ' ' + ((B[1] + Tt[1]) / 2).toFixed(1) + ' ' + (B[0] + w).toFixed(1) + ' ' + B[1].toFixed(1) + 'Z"/>';
    ll += '<path class="llama-in" d="M' + (B[0] - wi).toFixed(1) + ' ' + B[1].toFixed(1) + 'Q' + (B[0] - wi).toFixed(1) + ' ' + ((B[1] * 2 + Tt[1]) / 3).toFixed(1) + ' ' + (B[0] + sx * 0.5).toFixed(1) + ' ' + ((B[1] + Tt[1] * 2) / 3).toFixed(1) + 'Q' + (B[0] + wi).toFixed(1) + ' ' + ((B[1] * 2 + Tt[1]) / 3).toFixed(1) + ' ' + (B[0] + wi).toFixed(1) + ' ' + B[1].toFixed(1) + 'Z"/>';
  }
  el.llamas.innerHTML = ll;
  const flujo = sm((s - 0.9) / 0.3) * (1 - sm((s - 2.2) / 0.5));
  const atras = [], delante = [], pims = [];
  for (let i = 0; i < DR.n; i++) {
    const t = giro + i / DR.n * Math.PI * 2, a = ptB(0.5, DR.rb, t), b = ptB(LD - 0.5, DR.rb, t);
    const html = '<path class="iso-line varilla" data-tone="mid" d="' + linea([a, b]) + '"/>', pa = at(a), pb = at(b);
    const dots = '<g class="iso-dots" data-tone="mid"><circle cx="' + pa[0].toFixed(1) + '" cy="' + pa[1].toFixed(1) + '" r=".55"/><circle cx="' + pb[0].toFixed(1) + '" cy="' + pb[1].toFixed(1) + '" r=".55"/></g>';
    (Math.cos(t - T0) < 0 ? atras : delante).push([dep(ptB(LD / 2, DR.rb, t)), html + dots]);
  }
  const NP = 9;
  for (let i = 0; i < NP; i++) {
    if (i / NP >= flujo) continue;
    const u = (avance + i / NP) % 1, sp = 3 + u * (LD - 6), phi = -Math.PI / 2 + 0.4 + 0.45 * Math.sin(giro * 0.9 + i * 2.3);
    const c = ptB(sp, DR.rin - 2.6, phi), a = giro * 1.1 + i * 1.7, bq = giro * 0.7 + i;
    const d = [Math.cos(a) * 0.9, Math.sin(a) * 0.6 * Math.cos(bq), Math.sin(bq) * 0.45], l = Math.hypot(...d), dd = d.map((v) => v / l * 2.6);
    pims.push([dep(c), pimRueda(mas(c, dd, -1), mas(c, dd), 1.35, Math.min(1, u * 1.3))]);
  }
  atras.sort((p, q) => p[0] - q[0]); delante.sort((p, q) => p[0] - q[0]); pims.sort((p, q) => p[0] - q[0]);
  el.horno.innerHTML = AROS_A + atras.map((b) => b[1]).join('') + pims.map((p) => p[1]).join('') + delante.map((f) => f[1]).join('') + AROS_D;
  // los que bajan por la canaleta a la bandeja
  let rod = '';
  if (flujo > 0.3) for (let i = 0; i < 2; i++) {
    const f = (reloj * 0.55 + i / 2) % 1, c = SALIDA[0].map((v, j) => v + (SALIDA[1][j] - v) * f + (j === 2 ? 1.3 : 0)), d = SALIDA[1].map((v, j) => (v - SALIDA[0][j]));
    const l = Math.hypot(...d), dd = d.map((v) => v / l * 2.4); rod += pimRueda(mas(c, dd, -1), mas(c, dd), 1.25, 1);
  }
  el.rodando.innerHTML = rod;
  // el pelado: la piel se va de la punta al rabo, las tiras caen al cuenco y salen los pimientos limpios
  const pel = sm((s - 2.1) / 0.75), B = at(PB), Tt = at(mas(PB, PD, 6 * PESC)), fr = 1 - pel;
  const C = [B[0] + (Tt[0] - B[0]) * fr, B[1] + (Tt[1] - B[1]) * fr]; let ux = Tt[0] - B[0], uy = Tt[1] - B[1]; const ul = Math.hypot(ux, uy); ux /= ul; uy /= ul;
  const nx = -uy * 40, ny = ux * 40, bx = -ux * 40, by = -uy * 40;
  el.pielClip.setAttribute('d', 'M' + [[C[0] + nx, C[1] + ny], [C[0] + nx + bx, C[1] + ny + by], [C[0] - nx + bx, C[1] - ny + by], [C[0] - nx, C[1] - ny]].map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'Z');
  let tiras = '';
  if (pel > 0.03 && pel < 0.97) for (const sg of [1, -1]) { const w = 1.5 * K * PESC * (0.6 + 0.4 * fr), x0 = C[0] + (-uy) * w * sg, y0 = C[1] + ux * w * sg, x1 = x0 + ux * 3.4 - uy * sg * 2.2, y1 = y0 + uy * 3.4 + ux * sg * 2.2 + 1.2; tiras += '<path class="tira" d="M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + 'Q' + (x1 + ux * 1.2).toFixed(1) + ' ' + (y1 - 1.4).toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'L' + (x1 - ux * 1.4).toFixed(1) + ' ' + (y1 - uy * 1.4).toFixed(1) + 'Q' + (x0 + ux * 0.6).toFixed(1) + ' ' + (y0 + 0.6).toFixed(1) + ' ' + (x0 - ux * 1.2).toFixed(1) + ' ' + (y0 - uy * 1.2).toFixed(1) + 'Z"/>'; }
  el.tiras.innerHTML = tiras;
  const nivel = sm((s - 2.15) / 0.85), hz = ZM + 0.9 + nivel * 1.8, hr = 2.8 + nivel * 1;
  el.pieles.setAttribute('d', nivel > 0.02 ? poly(Array.from({ length: 24 }, (_, i) => { const t = i / 24 * Math.PI * 2; return [CUENCO.x + Math.cos(t) * hr, CUENCO.y + Math.sin(t) * hr, hz]; })) : '');
  fila.forEach((g, i) => muestra(g, s > 2.35 + i * 0.16));
  // sin corazón: el rabo sale tirando del corazón de pepitas, que caen al platillo
  const tira = sm((s - 3.05) / 0.45), arco = Math.sin(Math.PI * tira);
  const destino = at([PLATO.x - 2.6, PLATO.y - 2.2, ZM + 2]), desde = at(PB), mx = (destino[0] - desde[0]) * tira, my = (destino[1] - desde[1]) * tira - arco * 9;
  el.rabo.setAttribute('transform', tira > 0.001 ? 'translate(' + mx.toFixed(2) + ' ' + my.toFixed(2) + ')' : '');
  const caidas = clamp((s - 3.35) / 0.5, 0, 1); let cae = '';
  if (caidas > 0 && caidas < 1) for (let i = 0; i < 5; i++) { const f = (reloj * 1.6 + i / 5) % 1, p = at([PLATO.x + Math.cos(i * 1.3) * 0.8, PLATO.y + Math.sin(i * 1.3) * 0.8, ZM + 4.2 - 3 * f]); cae += '<circle class="pepita" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r=".55"/>'; }
  el.caen.innerHTML = cae;
  sem.forEach((c, i) => muestra(c, s > 3.4 + i * 0.035));
  // en la lata: los pimientos entran enteros, uno a uno; el cabezal baja con la tapa y la cierra
  enlata.forEach((g, i) => muestra(g, s > 4.08 + i * 0.1));
  const baja = sm((s - 4.62) / 0.22) * (1 - sm((s - 4.95) / 0.3)), cerrada = s > 4.86;
  const dz = -(ZH0 - 0.5 - (CERR.zb + CERR.h)) * baja, sdz = at([0, 0, dz])[1] - at([0, 0, 0])[1];
  el.cabezal.setAttribute('transform', baja > 0.001 ? 'translate(0 ' + sdz.toFixed(2) + ')' : '');
  muestra(el.tapaCab, !cerrada || baja > 0.6); muestra(el.tapaLata, cerrada && baja <= 0.6);
  el.vastago.setAttribute('d', linea([[CERR.x, CERR.y, 32.4], [CERR.x, CERR.y, ZH0 + 4.6 + dz]]));
  const eje = [CERR.x + 1.8, CERR.y - 8, 27], ang = 0.5 - baja * 1.1, pomo = [eje[0] + 0.2, eje[1] + Math.cos(ang) * 8, eje[2] + Math.sin(ang) * 8];
  el.palanca.setAttribute('d', linea([eje, pomo]));
  const pe = at(eje), pp = at(pomo); el.ejePal.setAttribute('cx', pe[0].toFixed(1)); el.ejePal.setAttribute('cy', pe[1].toFixed(1)); el.pomoPal.setAttribute('cx', pp[0].toFixed(1)); el.pomoPal.setAttribute('cy', pp[1].toFixed(1));
  // esterilizado: el manómetro sube y la válvula suelta vapor
  const pres = sm((s - 5.08) / 0.6), ta = Math.PI * 1.2 - pres * Math.PI * 1.05, yc = MAN.y + 0.5;
  const punta = [MAN.x + Math.cos(ta) * (MAN.r - 0.7), yc, MAN.z + Math.sin(ta) * (MAN.r - 0.7)], lado = [Math.cos(ta + Math.PI / 2) * 0.3, 0, Math.sin(ta + Math.PI / 2) * 0.3];
  el.aguja.setAttribute('d', poly([mas([MAN.x, yc, MAN.z], lado), punta, mas([MAN.x, yc, MAN.z], lado, -1), [MAN.x - Math.cos(ta) * 0.8, yc, MAN.z - Math.sin(ta) * 0.8]]));
  let vap = '';
  if (pres > 0.3) for (let i = 0; i < 3; i++) { const f = (reloj * 0.45 + i / 3) % 1, c = at([AUTO.x + 3 + Math.sin(reloj + i * 2) * 1.2 * f, AUTO.y0 + 9, AUTO.z + AUTO.r + 4.2 + f * 11]), r = (1.1 + f * 2.4) * K * 0.5; vap += '<ellipse class="vapor" style="opacity:' + ((1 - f) * 0.55 * pres).toFixed(2) + '" cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" rx="' + (r * 1.3).toFixed(1) + '" ry="' + r.toFixed(1) + '"/>'; }
  el.vapor.innerHTML = vap;
  // lo que trabaja en cada paso
  ilumina([el.planta, el.cajon], paso === 0); ilumina([el.horno, el.quemador, el.tolva, el.salida], paso === 1); ilumina([el.pelando, el.cuenco], paso === 2);
  ilumina([el.platillo, el.cuchillo, el.rabo], paso === 3); ilumina([el.lata, el.cerradora], paso === 4); ilumina([el.autoclave, el.latas], paso === 5);
  const extra = ['a mano, de septiembre a noviembre', 'la llama tuesta la piel', 'sin agua: no pierde sabor', 'fuera el rabo y las pepitas', 'enteros, uno a uno', 'contraetiqueta numerada'][paso];
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

// los colores de lo que tiene color (el pimiento, el rabo, la hoja, la etiqueta): relleno, cuatro sombras y la cara de arriba
const tonos = (pre, cls, [f, s0, s1, s2, s3, t]) => `${pre}.${cls}>.iso-fill{fill:${f}}${pre}.${cls}>.iso-top{fill:${t}}${pre}.${cls}[data-seamless]>.iso-top{stroke:${t}}` +
  [s0, s1, s2, s3].map((c, i) => `${pre}.${cls}>.iso-shade[data-shade="${i}"]{fill:${c}}${pre}.${cls}[data-seamless]>.iso-shade[data-shade="${i}"]{stroke:${c}}`).join('');
const COLOR = {
  dark: { piq: ['#b8282f', '#6e1620', '#8c1d26', '#a8242c', '#c42e33', '#dc3d3a'], pelado: ['#d23a35', '#86202a', '#a8282e', '#c43532', '#dc4a3e', '#f06450'], tostado: ['#3a1c1e', '#1e0d10', '#2a1416', '#3a1c1e', '#4a2624', '#5c302c'],
    rabo: ['#4c6e30', '#2a401c', '#344e22', '#3f5c28', '#4c6e30', '#5e8a3c'], corazon: ['#d9c58a', '#8a7a4a', '#a8945a', '#c2ad6c', '#d9c58a', '#ecdca4'] },
  light: { piq: ['#d4343a', '#9a2028', '#b0262e', '#c42e34', '#d8383c', '#ea4c46'], pelado: ['#e2453c', '#ac2a2e', '#c23432', '#d63e38', '#e64e42', '#f4664e'], tostado: ['#5a3430', '#38201e', '#462824', '#54302c', '#623a34', '#74463e'],
    rabo: ['#6e9a44', '#4c7030', '#588038', '#64903e', '#6e9a44', '#84b052'], corazon: ['#e6d49a', '#b4a26a', '#c8b67c', '#d8c68a', '#e6d49a', '#f4e6b6'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--piq:#c42e33;--tost:#3a1c1e;--hoja:#3f6b34;--llama:#ff8a2a;--llama-in:#ffd27a;--hueco:#0d0718;--madera:#3a2440;--chapa:#2a1d44;--chapa-in:#1c1330;--aro:#2a1d44;--tierra:#3a2620;--pieles:#2a1416;--pepita:#e0c98a;--vapor:#d8cdea;--etiqueta:#c42e33;--papel:#efe6d2}
.iso[data-theme="light"]{--piq:#d8383c;--tost:#54302c;--hoja:#6e9e52;--llama:#ff8a2a;--llama-in:#ffc94a;--hueco:#8c7a86;--madera:#e7d9cf;--chapa:#f1edf7;--chapa-in:#ddd6ea;--aro:#f1edf7;--tierra:#a07a62;--pieles:#54302c;--pepita:#c9a24a;--vapor:#8a7aa8;--etiqueta:#d8383c;--papel:#fffdf4}
.hueco{fill:var(--hueco)}.hoja{fill:var(--hoja)}.tierra{fill:var(--tierra)}.chapa{fill:var(--chapa)}.chapa.dentro{fill:var(--chapa-in)}.aro{fill:var(--aro)}
.llama{fill:var(--llama);opacity:.9}.llama-in{fill:var(--llama-in)}.pieles{fill:var(--pieles)}.tira{fill:var(--tost)}.pepita{fill:var(--pepita)}
.pq-rojo{fill:var(--piq)}.pq-tost{fill:var(--tost)}.vapor{fill:var(--vapor)}.etiqueta{fill:var(--etiqueta)}.aguja{fill:var(--anatomy-lit)}
.varilla{stroke-width:1.15}.tallo{stroke-width:1}.correa{stroke-width:.9}.mango{stroke-width:2.4;stroke-linecap:round}.hoja-cuchillo{stroke-width:1.1;stroke-linecap:round}.volante{stroke-width:.9}
.madera>.iso-fill,.madera>.iso-top{fill:var(--madera)}.papel>.iso-top,.papel>.iso-fill{fill:var(--papel)}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line,[data-lit] .tb-edge{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 6',
  title: 'Cómo se hace el piquillo',
  hint: 'Pasa el ratón: paso a paso',
  readout: '1 · La recogida',
  keys: [
    { mark: 'lit', label: 'La pieza que trabaja en cada paso: la mata y el cajón, el horno, la mesa de pelado, la lata y el autoclave' },
    { mark: 'raised', label: 'El bombo gira sobre sus rodillos encima de la llama: el pimiento rueda y se asa por todos lados' },
    { mark: 'flat', label: 'En la mesa de pelado no hay grifo: el piquillo se pela a mano y sin agua' },
  ],
  caption: 'El pimiento del piquillo de Lodosa es pequeño, rojo y acabado en pico, y tiene Denominación de Origen. Se recoge a mano, uno a uno, de septiembre a noviembre. En la conservera se asa a la llama directa, que tuesta la piel y la despega; después se pela a mano y sin agua, para que no pierda sabor, y se le quitan el rabo, el corazón y las pepitas. Se mete entero en la lata, se cierra y se esteriliza con calor. Cada lata lleva la contraetiqueta numerada de la Denominación.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="El piquillo, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="6">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Cómo se hace el piquillo', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('piquillo', html, theme);
