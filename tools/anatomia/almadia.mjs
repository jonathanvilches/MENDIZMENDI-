// Lámina isométrica interactiva de la almadía de Burgui (skill Anatomy, 21 de noviembre de 2026; el autor: «ilustraciones
// técnicas en 3D isométricas interactivas sobre algunas de las misiones para explicar mejor»).
// Una maqueta de museo sobre su tablero: un tramo del Esca con sus orillas de sillería, la presa de Burgui con el portillo
// (el paso abierto entre dos cajeros por donde baja la almadía) y la almadía de tres tramos de nueve troncos atados con
// ramas de avellano, con un remo en la proa y otro en la popa. Al bajar por el portillo cada tramo se inclina por su
// cuenta y la almadía se dobla por las ataduras: es lo que cuenta la misión («Ataban los troncos con ramas de avellano.
// Por eso la almadía se dobla en las curvas»; «Cada presa tenía un portillo: un paso abierto para las almadías»).
// Las medidas son las del juego (game/almadia.js: tramos de 7 m, 9 troncos, 3,4 m de ancho, 0,45 m entre tramos;
// world/presas.js: 1,1 m de salto, portillo de 5,4 m).
// Uso: node tools/anatomia/almadia.mjs [--light]  →  entrega/anatomia/almadia(-light).html (y public/anatomia, para el juego)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, KIT, COLORES, enJuego, MARCA_JUEGO, escribe } from './comun.mjs';
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import * as T from '../../.claude/skills/anatomy/kit/tube.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 330;

// ---------- el modelo (metros → unidades: 6 por metro) ----------
const MOD = {
  M: 6, TRAMO: 42, HUECO: 2.7, ANCHO: 20.4, N: 9, R: 1.133,
  Z_UP: 8, SALTO: 6.6, X0: -14, X1: 22, FLOTA: 0.55,
  PROA: [0, 1.5, 3, 4.5, 6, 4.5, 3, 1.5, 0],         // (los troncos de en medio, más largos: la proa en punta)
  COLA: [0.4, -0.3, 0.2, -0.5, 0.1, 0.5, -0.2, 0.3, -0.4],   // (los troncos no son iguales: medio palmo arriba o abajo)
  GROSOR: [0.97, 1.03, 0.95, 1.02, 1.04, 0.98, 1.01, 0.96, 1.0],
  BARROTES: [3.5, 38.5], RB: 0.7,
};
// el agua por el eje del río: arriba a 8, en el portillo baja 1,1 m por una curva suave, abajo a 1,4
const zw = (x, m = MOD) => x <= m.X0 ? m.Z_UP : x >= m.X1 ? m.Z_UP - m.SALTO : m.Z_UP - m.SALTO + m.SALTO * (1 + Math.cos(Math.PI * (x - m.X0) / (m.X1 - m.X0))) / 2;
// dónde está cada tramo: la proa en xp; cada tramo, rígido y de 7 m, apoya sus dos extremos en el agua
function poses(xp, m = MOD) {
  const out = []; let front = xp;
  for (let i = 0; i < 3; i++) {
    let th = 0;
    for (let n = 0; n < 4; n++) { const xb = front - m.TRAMO * Math.cos(th); th = Math.asin(Math.max(-1, Math.min(1, (zw(xb, m) - zw(front, m)) / m.TRAMO))); }
    const xb = front - m.TRAMO * Math.cos(th);
    out.push({ xb, zb: zw(xb, m) + m.FLOTA, th, front });
    front = xb - m.HUECO;
  }
  return out;
}

// ---------- un tramo, inclinado th hacia delante (en su sitio: el centro de su popa en el origen) ----------
// tipo: 'proa' (troncos en punta y el remo de proa), 'medio' o 'popa' (el remo de popa). K: el kit (iso, solidSvg, lineSvg,
// dotsSvg); Gx: lathe; Tx: tubos. Se usa aquí y en la página (la misma función, en texto), así lo que se mueve es lo dibujado.
function tramoSvg(K, Gx, Tx, P, m, tipo, th) {
  const c = Math.cos(th), s = Math.sin(th), d = [c, 0, -s], n = [s, 0, c];
  const at = (u, y, h) => [d[0] * u + n[0] * h, y, d[2] * u + n[2] * h];
  const V = Gx.viewOf(P), out = [];
  // los troncos: de atrás adelante (según se ven), cada uno un tubo con su grosor y su largo
  const logs = [];
  for (let i = 0; i < m.N; i++) {
    const y = (i - (m.N - 1) / 2) * 2 * m.R, r = m.R * m.GROSOR[i], a = m.COLA[i] * 0.6, b = m.TRAMO + (tipo === 'proa' ? m.PROA[i] : 0) - m.COLA[(i + 3) % m.N] * 0.5;
    logs.push({ y, r, p: [at(a, y, 0), at(b, y, 0)] });
  }
  logs.sort((A, B) => Gx.dot3(A.p[0], V) - Gx.dot3(B.p[0], V));
  for (const L of logs) for (const pc of Tx.tubePieces(L.p, L.r, P, { maxLength: 200 })) out.push(Tx.tubeSvg(pc, { tone: 'mid' }));
  // los barrotes, cruzados encima, y en cada cruce la atadura de avellano: dos vueltas alrededor del barrote
  for (const u of m.BARROTES) {
    const o = at(u, -m.ANCHO / 2 - 0.6, m.R + m.RB), F = Gx.frameOf(o, [0, 1, 0], d, n);
    out.push(K.solidSvg(Gx.disc(0, m.ANCHO + 1.2, m.RB, F, P), { tone: 'mid', className: 'barrote' }));
    let arcs = '';
    for (const L of logs) for (const e of [-0.32, 0.32]) arcs += Gx.arcOf(F, L.y + m.ANCHO / 2 + 0.6 + e, m.RB + 0.18, P);
    out.push(K.lineSvg(arcs, { tone: 'hi', className: 'verga' }));
  }
  // el remo: en la proa, de un tolete sobre el barrote de delante; en la popa, sobre el de detrás
  if (tipo === 'proa' || tipo === 'popa') {
    const proa = tipo === 'proa', u0 = proa ? m.BARROTES[1] : m.BARROTES[0], y0 = 0;
    const base = at(u0, y0, m.R + 2 * m.RB), Fp = Gx.frameAlong(base, n);
    out.push(K.solidSvg(Gx.disc(0, 2.6, 0.5, Fp, P), { tone: 'mid' }));            // el tolete
    out.push(K.solidSvg(Gx.disc(0, 0.5, 1.15, Fp, P), { tone: 'mid' }));           // su arandela de madera
    const piv = at(u0, y0, m.R + 2 * m.RB + 2.3), sg = proa ? 1 : -1;
    const mango = at(u0 - sg * 13, y0 + 1.2, m.R + 6.2), punta = at(u0 + sg * 21, y0 - 1.6, -m.FLOTA + 0.15);
    const ruta = [mango, piv, punta];
    for (const pc of Tx.tubePieces(ruta, 0.42, P, { maxLength: 200 })) out.push(Tx.tubeSvg(pc, { tone: 'hi' }));
    // la pala, al final del remo, tocando el agua
    const dir = Gx.unit3(Gx.sub3(punta, piv)), Fb = Gx.frameOf(punta, dir, Gx.unit3(Gx.cross3(dir, [0, 0, 1])), Gx.unit3(Gx.cross3(Gx.unit3(Gx.cross3(dir, [0, 0, 1])), dir)));
    out.push(K.solidSvg(Gx.prismOf(Fb, [[-1.5, -0.18], [1.5, -0.18], [1.5, 0.18], [-1.5, 0.18]], -5.5, 0.4, P), { tone: 'hi' }));
  }
  return out.join('');
}

// ---------- la cámara ----------
const PLATE = { x: -170, y: -70, w: 346, d: 144, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -16, 0), [-150, 0, 20], [150, 0, 14]], WIDTH, HEIGHT, { pad: 12, azimuth: 64, elevation: 38 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const poly = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L') + 'Z';
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L');

const { Z_UP, SALTO, X0, X1 } = MOD, Z_DN = Z_UP - SALTO;
const RIO = { y0: -47, y1: 47 }, PORT = 16.2, CAJ = 4.8, CREST = { x0: -11, x1: -6, z: 9.4 }, GLACIS_X = 18;

function tablero() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -16, 12, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -16, 1.6, P, 28), { tone: 'lo' }));
    out.push(S(k.cylinder(x, y, 5.4, -14.4, 4.4, P, 28), { tone: 'mid' }));
  }
  out.push(S(k.slabOf(PLATE, -10, 10, P, 8, 1.6), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 4), 0, P), { tone: 'lo' }));
  const tornillos = k.corners(PLATE, 9);
  out.push(L(tornillos.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join(''), { tone: 'lo' }));
  out.push(D(tornillos.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // la regla de la orilla: una marca por metro y una larga cada cinco
  const regla = { x: -156, y: 63, w: 246, d: 6, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, MOD.M, 5, regla.y + 0.6, 0.6, [1.8, 3.4], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 3, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 3, 0.6])], { size: 0.45 }));
  // la placa
  const placa = { x: 100, y: 62, w: 56, d: 8, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.2), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 6, placa.y + 4.6], 0.8, P, 'x'), 'ESCA · BURGUI', { size: 2.6, tone: 'mid' }));
  out.push(L(k.lineOnTop([placa.x + 34, placa.y + 3], [placa.x + 51, placa.y + 3], 0.8, P) + k.lineOnTop([placa.x + 34, placa.y + 5.2], [placa.x + 46, placa.y + 5.2], 0.8, P), { tone: 'lo', free: true }));
  out.push(D([at([placa.x + 2.4, placa.y + 4, 0.8]), at([placa.x + placa.w - 2.4, placa.y + 4, 0.8])], { size: 0.4 }));
  return out.join('');
}

// la orilla de piedra: sillería con sus hiladas y la albardilla de encima
function orilla(y, d) {
  const plan = { x: -166, y, w: 334, d, r: 3 };
  const hiladas = L([3.6, 7.2].map((z) => k.sideSeam(plan, z, P, 6)).join(''), { tone: 'faint' });
  return S(k.slabOf(plan, 0, 10, P, 6, 0.8), { tone: 'mid', inner: hiladas }) + L(k.planOutline(k.insetPlan(plan, 2.4), 10, P, 6), { tone: 'faint' });
}

// el lecho, el agua de arriba y la de abajo
function rio() {
  const out = [];
  out.push(S(k.slabOf({ x: -166, y: RIO.y0, w: 334, d: RIO.y1 - RIO.y0, r: 1 }, 0, 0.4, P, 3), { tone: 'lo', flat: true }));
  // el agua de arriba: hasta la presa (y en el portillo, hasta donde empieza a bajar)
  out.push(`<path class="agua" d="${poly([[-166, RIO.y0, Z_UP], [CREST.x0, RIO.y0, Z_UP], [CREST.x0, -PORT - CAJ, Z_UP], [X0, -PORT - CAJ, Z_UP], [X0, PORT + CAJ, Z_UP], [CREST.x0, PORT + CAJ, Z_UP], [CREST.x0, RIO.y1, Z_UP], [-166, RIO.y1, Z_UP]])}"/>`);
  // corrientes: líneas de agua que van de la orilla de arriba del tablero a la presa o al portillo
  let cor = '';
  for (const y of [-38, -27, 27, 38]) cor += linea([[-166, y, Z_UP], [CREST.x0, y, Z_UP]]);
  for (const y of [-9, 0, 9]) cor += linea([[-166, y, Z_UP], [X0, y, Z_UP]]);
  out.push(L(cor, { tone: 'faint', className: 'corriente' }));
  // (el borde del agua donde se corta la maqueta, arriba y abajo: ahí empiezan y acaban las corrientes)
  out.push(L(linea([[-166, RIO.y0, Z_UP], [-166, RIO.y1, Z_UP]]) + linea([[168, RIO.y0, Z_DN], [168, RIO.y1, Z_DN]]), { tone: 'lo' }));
  // el agua de abajo, desde el pie del glacis
  out.push(`<path class="agua agua-abajo" d="${poly([[GLACIS_X, RIO.y0, Z_DN], [168, RIO.y0, Z_DN], [168, RIO.y1, Z_DN], [GLACIS_X, RIO.y1, Z_DN], [GLACIS_X, PORT + CAJ, Z_DN], [X1, PORT + CAJ, Z_DN], [X1, -PORT - CAJ, Z_DN], [GLACIS_X, -PORT - CAJ, Z_DN]])}"/>`);
  let abajo = '';
  for (const y of [-40, -30, 30, 40]) abajo += linea([[GLACIS_X, y, Z_DN], [168, y, Z_DN]]);
  for (const y of [-12, -4, 4, 12]) abajo += linea([[X1, y, Z_DN], [168, y, Z_DN]]);
  out.push(L(abajo, { tone: 'faint', className: 'corriente' }));
  return out.join('');
}

// la presa: la coronación de sillería y el glacis que baja al agua, a los dos lados del portillo
function presa(lado) {
  const out = [], y0 = lado < 0 ? RIO.y0 : PORT + CAJ, y1 = lado < 0 ? -PORT - CAJ : RIO.y1;
  const F = G.frameOf([0, y0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(S(G.prismOf(F, [[CREST.x1, 0], [GLACIS_X, 0], [GLACIS_X, 0.6], [CREST.x1, CREST.z - 0.4]], 0, y1 - y0, P), { tone: 'mid' }));
  // el agua que resbala por el glacis: rayas del borde de la coronación al pie
  let esp = '';
  for (let y = y0 + 3; y < y1 - 1; y += 4.4) esp += linea([[CREST.x1, y, CREST.z - 0.4], [GLACIS_X, y, 0.6]]);
  out.push(L(esp, { tone: 'faint' }));
  const plan = { x: CREST.x0, y: y0, w: CREST.x1 - CREST.x0, d: y1 - y0, r: 0.6 };
  let juntas = '';
  for (let y = y0 + 5.2; y < y1 - 1; y += 5.2) juntas += k.lineOnTop([CREST.x0, y], [CREST.x1, y], CREST.z, P);
  out.push(S(k.slabOf(plan, 0, CREST.z, P, 3, 0.4), { tone: 'hi', crease: 'lo' }), L(juntas, { tone: 'mid' }));
  return out.join('');
}

// el portillo: el suelo del paso, el agua que baja por él y los dos cajeros de sillar
function cajero(lado) {
  const y = lado < 0 ? -PORT - CAJ : PORT, plan = { x: X0, y, w: X1 - X0, d: CAJ, r: 0.8 };
  let juntas = '';
  for (let x = X0 + 4.5; x < X1 - 1; x += 4.5) juntas += k.lineOnTop([x, y], [x, y + CAJ], 10.4, P);
  const hiladas = L([3.4, 6.9].map((z) => k.sideSeam(plan, z, P, 3)).join(''), { tone: 'faint' });
  return S(k.slabOf(plan, 0, 10.4, P, 3, 0.5), { tone: 'mid', inner: hiladas }) + L(juntas, { tone: 'lo' });
}
function portillo() {
  const out = [];
  const F = G.frameOf([0, -PORT, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(S(G.prismOf(F, [[X0, 0], [X1, 0], [X1, 0.4], [X0, 2.8]], 0, 2 * PORT, P), { tone: 'lo' }));
  // el agua del portillo: la superficie curva, en tiras, y las corrientes que bajan por ella
  const xs = []; for (let i = 0; i <= 24; i++) xs.push(X0 + (X1 - X0) * i / 24);
  const top = xs.map((x) => [x, -PORT, zw(x)]), bot = xs.map((x) => [x, PORT, zw(x)]).reverse();
  out.push(`<path class="agua agua-baja" d="${poly([...top, ...bot])}"/>`);
  let cor = '';
  for (const y of [-12, -6, 0, 6, 12]) cor += linea(xs.map((x) => [x, y, zw(x)]));
  out.push(L(cor, { tone: 'lo', className: 'corriente' }));
  return out.join('');
}

// las peñas del río, de abajo, que la almadía tiene que esquivar
function peña(x, y, r, h, seed) {
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const ring = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + rnd() * 0.3, rr = r * (0.75 + rnd() * 0.4); ring.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8]); }
  return S(k.extrude(ring, Z_DN - 0.6, h, P, { bevel: 0.6 }), { tone: 'mid' });
}

// ---------- la almadía: tres tramos y sus ataduras entre tramo y tramo ----------
const TIPOS = ['proa', 'medio', 'popa'];
const XP0 = 92;   // (la pose de partida: el segundo tramo, en el portillo)
const pose0 = poses(XP0);
const tramoG = (i, p, lit) => `<g data-part="tramo${i}"${lit ? ' data-lit' : ''} transform="${k.translateAlong(P, [p.xb, 0, p.zb])}">${tramoSvg(k, G, T, P, MOD, TIPOS[i], p.th)}</g>`;

const enPortillo = (ps) => ps.findIndex((p) => p.front > X0 && p.xb < X1);
const lit0 = enPortillo(pose0);
// el orden: la orilla de detrás, el río, la presa y el cajero de detrás, la almadía, el cajero de delante, la orilla de delante
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta de la almadía de Burgui: un tramo del río Esca con la presa y su portillo, el paso abierto por donde baja la almadía. La almadía tiene tres tramos de nueve troncos de pino de 7 metros, atados con ramas de avellano, con un remo en la proa y otro en la popa. Al pasar por el portillo cada tramo se inclina por su cuenta y la almadía se dobla por sus ataduras.',
  body: [
    tablero(),
    orilla(-62, 15),
    rio(),
    presa(-1),
    cajero(-1),
    portillo(),
    peña(64, -30, 4.2, 4.6, 11), peña(118, 31, 3.6, 4, 23), peña(146, -21, 3.2, 3.6, 37),
    '<g data-part="almadia">', pose0.map((p, i) => tramoG(i, p, i === lit0)).reverse().join(''), '<path data-part="ataduras" class="iso-line" data-tone="hi" style="stroke-width:1.1" d=""/>', '</g>',
    `<g data-part="delante">${presa(1)}${cajero(1)}</g>`,
    orilla(47, 15),
  ],
});

// ---------- lo que se mueve en la página ----------
const sinExport = (f) => readFileSync(join(KIT, f), 'utf8').replace(/^import .*$/gm, '').replace(/^export /gm, '');
const NOMBRES_G = ['frameOf', 'frameAlong', 'disc', 'arcOf', 'prismOf', 'viewOf', 'dot3', 'unit3', 'sub3', 'cross3', 'add3', 'mul3', 'len3', 'lerp3', 'pathLength', 'resample', 'cut', 'pointAlong', 'tangentAlong', 'fillet', 'stepsFor', 'scaleOf', 'lightOf', 'toneOf', 'bandOf', 'hullOf', 'runsOf', 'curveRuns', 'fadeOf'];
const live = MARCA_JUEGO + `
const G = (() => { ${sinExport('lathe.mjs')}; return { ${NOMBRES_G.join(', ')} }; })();
const TB = (() => { ${sinExport('tube.mjs')}; return { tubePieces, tubeSvg }; })();
const P = ${JSON.stringify(P)}, MOD = ${JSON.stringify(MOD)}, TIPOS = ${JSON.stringify(TIPOS)};
const zw = ${zw.toString()};
const poses = ${poses.toString()};
const tramoSvg = ${tramoSvg.toString()};
const K = { iso, solidSvg, lineSvg, dotsSvg };
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg');
const grupos = [0, 1, 2].map((i) => svgEl.querySelector('[data-part="tramo' + i + '"]'));
const ataduras = svgEl.querySelector('[data-part="ataduras"]'), delante = svgEl.querySelector('[data-part="delante"]'), almadia = svgEl.querySelector('[data-part="almadia"]');
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const CACHE = new Map(), PASO = 0.25 * Math.PI / 180;
const dibujo = (tipo, th) => { const q = Math.round(th / PASO), key = tipo + q; let s = CACHE.get(key); if (!s) { s = tramoSvg(K, G, TB, P, MOD, tipo, q * PASO); CACHE.set(key, s); } return s; };
const REACH = [-12, 166];
let xp = ${XP0}, target = xp, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, antes = [];
// (la vuelta sola: baja con la corriente, se para un momento abajo y vuelve arriba deslizándose)
const tourAt = (t) => { const T = 26, f = (t % T) / T; return f < 0.72 ? REACH[0] + (REACH[1] - REACH[0]) * (f / 0.72) : f < 0.8 ? REACH[1] : REACH[1] - (REACH[1] - REACH[0]) * (0.5 - 0.5 * Math.cos(Math.PI * (f - 0.8) / 0.2)); };
function draw() {
  const ps = poses(xp), lit = ps.findIndex((p) => p.front > MOD.X0 && p.xb < MOD.X1);
  ps.forEach((p, i) => {
    const g = grupos[i], q = Math.round(p.th / PASO);
    if (antes[i] !== q) { g.innerHTML = dibujo(TIPOS[i], p.th); antes[i] = q; }
    g.setAttribute('transform', translateAlong(P, [p.xb, 0, p.zb]));
    if ((i === lit) !== g.hasAttribute('data-lit')) g.toggleAttribute('data-lit', i === lit);
  });
  // las ataduras entre tramos: dos ramas de avellano de la popa de uno a la proa del siguiente, en los troncos 2 y 6
  let d = '';
  for (let i = 0; i < 2; i++) {
    const a = ps[i], b = ps[i + 1];
    for (const y of [-2 * 2 * MOD.R, 2 * 2 * MOD.R]) {
      const p0 = [a.xb + 0.6, y, a.zb + MOD.R * 0.6], p1 = [b.xb + MOD.TRAMO * Math.cos(b.th) - 0.6, y, b.zb - MOD.TRAMO * Math.sin(b.th) + MOD.R * 0.6];
      const s0 = iso(p0, P), s1 = iso(p1, P);
      d += 'M' + s0[0].toFixed(1) + ' ' + s0[1].toFixed(1) + 'L' + s1[0].toFixed(1) + ' ' + s1[1].toFixed(1);
    }
  }
  ataduras.setAttribute('d', d);
  // (cuando un tramo ya ha pasado el portillo, va por delante del cajero de delante)
  ps.forEach((p, i) => { const g = grupos[i], fuera = p.xb > MOD.X1 + 2; if (fuera && g.parentNode !== svgEl) svgEl.insertBefore(g, delante.nextSibling); else if (!fuera && g.parentNode !== almadia) almadia.insertBefore(g, ataduras); });
  const caida = lit < 0 ? 0 : (Math.sin(ps[lit].th) * MOD.TRAMO) / MOD.M;
  const where = lit < 0 ? (xp < MOD.X0 + 4 ? 'llegando a la presa' : 'pasada la presa') : 'tramo ' + (lit + 1) + ' de 3 en el portillo';
  const text = where + ' · inclinado ' + caida.toFixed(1).replace('.', ',') + ' m';
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute('aria-valuetext', text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
  if (touring) { clock += dt; target = tourAt(clock); }
  xp = still.matches ? target : xp + (target - xp) * (1 - Math.exp(-dt / 0.35));
  if (Math.abs(target - xp) < 0.02) xp = target;
  draw();
  frame = visible && (touring || xp !== target) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (to) => { touring = false; target = clamp(to, REACH[0], REACH[1]); clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 4000); run(); };
new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: '120px 0px' }).observe(stage);
stage.addEventListener('pointermove', (e) => { const b = svgEl.getBoundingClientRect(); steer(REACH[0] + clamp((e.clientX - b.left) / b.width, 0, 1) * (REACH[1] - REACH[0])); });
stage.addEventListener('keydown', (e) => { const st = (REACH[1] - REACH[0]) / 12; if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); steer(target + st); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); steer(target - st); } });
draw();
`;

// ---------- los colores del juego (morados, rosa y dorado) y el agua ----------
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--agua:#2c3274;--agua-baja:#3d4392;--agua-abajo:#1d2156}
.iso[data-theme="light"]{--agua:#d3d9f5;--agua-baja:#bcc5ef;--agua-abajo:#c4cbec}
.agua{fill:var(--agua);stroke:none}.agua-baja{fill:var(--agua-baja)}.agua-abajo{fill:var(--agua-abajo)}
.corriente{stroke-dasharray:2 6;animation:corre 1.6s linear infinite}
@keyframes corre{to{stroke-dashoffset:-8}}
@media (prefers-reduced-motion:reduce){.corriente{animation:none}}
[data-lit] .tb-edge,[data-lit] .barrote>.iso-edge{stroke:var(--anatomy-lit)}
[data-lit] .tb-shine{fill:var(--anatomy-lit-top)}
[data-lit] .verga{stroke:var(--anatomy-lit)}
`;

const body = k.plateHtml({
  fig: 'Lámina 1',
  title: 'La almadía en el portillo',
  hint: 'Pasa el ratón: baja por el río',
  readout: 'tramo 2 de 3 en el portillo',
  keys: [
    { mark: 'lit', label: 'El tramo que pasa por el portillo: se inclina por su cuenta y la almadía se dobla por las ataduras' },
    { mark: 'raised', label: 'Tres tramos de nueve troncos de pino de 7 m, atados con ramas de avellano retorcidas' },
    { mark: 'flat', label: 'La presa de Burgui: 1,1 m de salto y un portillo de 5,4 m entre dos cajeros de sillar' },
  ],
  caption: 'Los almadieros ataban los troncos en tramos con ramas de avellano y unían unos tramos detrás de otros: así la almadía se doblaba en las curvas y al saltar las presas. Cada presa tenía un portillo, un paso abierto para las almadías, y había que entrar justo por él, con un remo en la proa y otro en la popa. La última almadía de trabajo bajó en 1952.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="La almadía: las flechas la bajan o la suben por el río" aria-valuemin="0" aria-valuemax="100">${svg}</div>`,
});

const html = k.pageHtml({ title: 'La almadía en el portillo', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('almadia', html, theme);
