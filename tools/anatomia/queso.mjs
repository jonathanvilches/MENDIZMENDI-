// Lámina isométrica interactiva del queso de oveja (Idiazabal y Roncal), skill Anatomy, 21 de noviembre de 2026. El
// autor: «explicaciones técnicas en 3D [...] la elaboración de diferentes alimentos [...] del queso».
// Una maqueta de quesería de pastor sobre su tablero: la cuba de cuajar con su termómetro de esfera, la lira (el arpa de
// alambres que corta la cuajada) corriendo por sus raíles con un husillo y una manivela, el grifo del suero y su cubo, la
// prensa de palanca con su piedra sobre dos moldes, la tina de salmuera y el estante de curar. Al recorrerla se ve paso a
// paso cómo se hace, y en cada paso se ilumina la pieza que trabaja (la misma secuencia que la misión: data/procesos.js).
// Los números: leche cruda de oveja latxa (Idiazabal) o rasa y latxa (Roncal) templada a unos 30 °C; cuaja en media hora
// larga; la cuajada se corta en granos como de arroz, se desuera, se moldea y se prensa unas horas, pasa uno o dos días en
// salmuera y se cura al menos 2 meses (Idiazabal) o 4 (Roncal, la primera Denominación de Origen de España, en 1981).
// Uso: node tools/anatomia/queso.mjs [--light]  →  entrega/anatomia/queso(-light).html (y public/anatomia, para el juego)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { KIT, COLORES, enJuego, MARCA_JUEGO, escribe, PUENTE } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 340;

// ---------- el modelo (centímetros de la maqueta) ----------
const CUBA = { x0: -110, x1: -30, y0: -23, y1: 23, pata: 20, fondo: 2, alto: 26, pared: 2 };
CUBA.zb = CUBA.pata + CUBA.fondo; CUBA.zr = CUBA.zb + CUBA.alto;       // (el fondo por dentro y el borde)
const LECHE = { z: CUBA.zr - 6, zDes: CUBA.zr - 11 };                    // (la leche; la cuajada ya desuerada)
const LIRA = { xa: CUBA.x0 + 6, xb: CUBA.x1 - 6, zc: CUBA.zr + 1.5, hilos: 7 };
const TERMO = { x: -52, z: 33, r: 6.2, y: CUBA.y1, t0: 12, t1: 30, a0: Math.PI * 1.25, a1: -Math.PI * 0.25, tMax: 40 };
const GRIFO = { x: -40, z: CUBA.pata + 4.5, y: CUBA.y1 };
const CUBO = { x: -40, y: 36, r: 7.5, h: 12 };
const PRENSA = { piv: [8, 0, 27], yA: 10, yB: 40, largo: 98, contacto: 42, arriba: 0.16, moldes: [26, 58], ym: 25, rm: 10, hm: 12 };
const TINA = { x: 30, y: -28, r: 15, h: 14 };
const ESTANTE = { x0: 72, x1: 132, y0: -48, y1: -20, baldas: [15, 33], alto: 47 };
const PASOS = [
  'Templar la leche', 'Cuajar', 'Cortar la cuajada', 'Desuerar', 'Moldear y prensar', 'Salar', 'Curar',
];
const N = PASOS.length;

// ---------- la cámara ----------
const PLATE = { x: -146, y: -62, w: 292, d: 124, r: 7 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [-110, -23, 54], [132, -48, 50], [104, 25, 40]], WIDTH, HEIGHT, { pad: 10, azimuth: 64, elevation: 32 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const elipse = (cx, cy, r, z, n = 36) => poly(Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * 2 * Math.PI) * r, cy + Math.sin(i / n * 2 * Math.PI) * r, z]));

// ---------- el tablero ----------
function tablero() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -14, 12, P)}"/>`];
  for (const [x, y] of [...k.corners(PLATE, 20)].sort((a, b) => dep([a[0], a[1], 0]) - dep([b[0], b[1], 0]))) {
    out.push(S(k.cylinder(x, y, 6.4, -14, 1.6, P, 28), { tone: 'lo' }));
    out.push(S(k.cylinder(x, y, 5, -12.4, 4.4, P, 28), { tone: 'mid' }));
  }
  out.push(S(k.slabOf(PLATE, -8, 8, P, 8, 1.6), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 4), 0, P), { tone: 'lo' }));
  const tornillos = k.corners(PLATE, 8.5);
  out.push(L(tornillos.map(([x, y]) => k.ring(x, y, 1.8, 0, P, 16)).join(''), { tone: 'lo' }));
  out.push(D(tornillos.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // la regla de delante: una marca cada 2 cm y una larga cada 10
  const regla = { x: -132, y: 50, w: 190, d: 5.5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.6, 0.6, [1.6, 3], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.8, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.8, 0.6])], { size: 0.45 }));
  // la placa grabada
  const placa = { x: 76, y: 49, w: 56, d: 7.5, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 5, placa.y + 4.4], 0.8, P, 'x'), 'IDIAZABAL · RONCAL', { size: 2.4, tone: 'mid' }));
  out.push(D([at([placa.x + 2.2, placa.y + 3.75, 0.8]), at([placa.x + placa.w - 2.2, placa.y + 3.75, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- la cuba de cuajar ----------
const C = CUBA, pw = C.pared;
const paredes = {
  atras: { x: C.x0, y: C.y0, w: C.x1 - C.x0, d: pw, r: 0.4 },
  delante: { x: C.x0, y: C.y1 - pw, w: C.x1 - C.x0, d: pw, r: 0.4 },
  izq: { x: C.x0, y: C.y0 + pw, w: pw, d: C.y1 - C.y0 - 2 * pw, r: 0.2 },
  der: { x: C.x1 - pw, y: C.y0 + pw, w: pw, d: C.y1 - C.y0 - 2 * pw, r: 0.2 },
};
// (qué lado se ve: el de la pared lateral más cerca de quien mira)
const derCerca = dep([C.x1, 0, 30]) > dep([C.x0, 0, 30]);
const pared = (k_, lit) => S(k.slabOf(paredes[k_], C.zb, C.alto, P, 2, 0.3), { tone: 'hi', crease: 'lo', className: 'pared' + (lit ? ' lit' : '') });
function cubaDetras() {
  const out = [];
  // las patas (las de detrás primero), el fondo y las paredes de detrás
  const patas = [[C.x0 + 3, C.y0 + 3], [C.x1 - 3, C.y0 + 3], [C.x0 + 3, C.y1 - 3], [C.x1 - 3, C.y1 - 3]].sort((a, b) => dep([a[0], a[1], 0]) - dep([b[0], b[1], 0]));
  for (const [x, y] of patas) {
    out.push(S(k.cylinder(x, y, 2.4, 0, 1, P, 20), { tone: 'lo' }));
    out.push(S(k.slabOf({ x: x - 1.6, y: y - 1.6, w: 3.2, d: 3.2, r: 0.4 }, 1, C.pata - 1, P, 2), { tone: 'mid' }));
  }
  // el quemador de debajo: el pie, el anillo y las llamas (vivas, se iluminan al templar la leche)
  const qx = (C.x0 + C.x1) / 2, qy = 7;
  out.push(S(k.cylinder(qx, qy, 4.6, 0, 3, P, 24), { tone: 'lo' }));
  out.push(S(k.cylinder(qx, qy, 9, 3, 2.4, P, 36, 0.4), { tone: 'mid', className: 'quemador' }));
  out.push(D(Array.from({ length: 12 }, (_, i) => { const a = i / 12 * 2 * Math.PI; return at([qx + Math.cos(a) * 7.2, qy + Math.sin(a) * 7.2, 5.4]); }), { size: 0.35, tone: 'lo' }));
  let llamas = '';
  for (let i = 0; i < 12; i++) { const a = (i + 0.5) / 12 * 2 * Math.PI, x = qx + Math.cos(a) * 7.2, y = qy + Math.sin(a) * 7.2; if (dep([x, y, 6]) < dep([qx, qy, 6]) - 0.5) continue; llamas += linea([[x, y, 5.6], [x, y, 8.6]]); }
  out.push(`<g data-part="fuego"><path class="iso-line llama" data-tone="mid" d="${llamas}"/></g>`);
  out.push(S(k.slabOf({ x: C.x0, y: C.y0, w: C.x1 - C.x0, d: C.y1 - C.y0, r: 0.6 }, C.pata, C.fondo, P, 3, 0.3), { tone: 'mid' }));
  out.push(pared('atras'), pared(derCerca ? 'izq' : 'der'));
  return out.join('');
}
// el interior: la leche (o la cuajada), sus cortes y la lira
const IN = { x0: C.x0 + pw, x1: C.x1 - pw, y0: C.y0 + pw, y1: C.y1 - pw };
const lecheD = (z) => poly([[IN.x0, IN.y0, z], [IN.x1, IN.y0, z], [IN.x1, IN.y1, z], [IN.x0, IN.y1, z]]);
// (las paredes de dentro que se ven por encima de la leche: la de detrás y la del lado lejano)
const dentroD = (z) => poly([[IN.x0, IN.y0, z], [IN.x1, IN.y0, z], [IN.x1, IN.y0, C.zr], [IN.x0, IN.y0, C.zr]]) + (derCerca
  ? poly([[IN.x0, IN.y0, z], [IN.x0, IN.y1, z], [IN.x0, IN.y1, C.zr], [IN.x0, IN.y0, C.zr]])
  : poly([[IN.x1, IN.y0, z], [IN.x1, IN.y1, z], [IN.x1, IN.y1, C.zr], [IN.x1, IN.y0, C.zr]]));
// la lira: un bastidor colgado del carro con siete alambres verticales; se dibuja en la x de partida y se traslada
const liraHilos = (z) => {
  let d = '';
  for (let i = 0; i < LIRA.hilos; i++) { const y = IN.y0 + 3 + i * (IN.y1 - IN.y0 - 6) / (LIRA.hilos - 1); d += linea([[LIRA.xa, y, LIRA.zc], [LIRA.xa, y, z]]); }
  return d + linea([[LIRA.xa, IN.y0 + 3, z], [LIRA.xa, IN.y1 - 3, z]]);
};
function cubaDelante() {
  const out = [pared(derCerca ? 'der' : 'izq'), pared('delante')];
  // los raíles sobre las paredes largas, con sus topes, y el husillo por delante con sus dos soportes
  for (const y of [C.y0, C.y1 - pw]) {
    out.push(S(k.slabOf({ x: C.x0 + 2, y, w: C.x1 - C.x0 - 4, d: pw, r: 0.3 }, C.zr, 1.4, P, 2), { tone: 'mid' }));
    for (const x of [C.x0 + 3, C.x1 - 5]) out.push(S(k.slabOf({ x, y: y - 0.3, w: 2, d: pw + 0.6, r: 0.3 }, C.zr + 1.4, 1.6, P, 2), { tone: 'lo' }));
  }
  // el termómetro de esfera en la pared de delante: el bisel, la esfera, las marcas de 0 a 40 °C y la aguja (viva)
  const Ft = G.frameAlong([TERMO.x, TERMO.y, TERMO.z], [0, 1, 0]);
  out.push(S(G.disc(0, 1.4, TERMO.r + 1, Ft, P), { tone: 'mid', className: 'termo-bisel' }));
  out.push(S(G.disc(1.4, 1.9, TERMO.r, Ft, P), { tone: 'hi', className: 'termo' }));
  let mn = '', mj = '';
  for (let t = 0; t <= TERMO.tMax; t += 2) {
    const a = TERMO.a0 + (TERMO.a1 - TERMO.a0) * t / TERMO.tMax, r1 = TERMO.r - (t % 10 ? 1 : 1.8), yy = TERMO.y + 1.95;
    const s = linea([[TERMO.x + Math.cos(a) * (TERMO.r - 0.5), yy, TERMO.z + Math.sin(a) * (TERMO.r - 0.5)], [TERMO.x + Math.cos(a) * r1, yy, TERMO.z + Math.sin(a) * r1]]);
    if (t % 10) mn += s; else mj += s;
  }
  out.push(L(mn, { tone: 'lo' }), L(mj, { tone: 'mid' }));
  // (la marca de 30 °C, la de cuajar, en rosa)
  const a30 = TERMO.a0 + (TERMO.a1 - TERMO.a0) * 30 / TERMO.tMax;
  out.push(D([at([TERMO.x + Math.cos(a30) * (TERMO.r + 0.4), TERMO.y + 1.95, TERMO.z + Math.sin(a30) * (TERMO.r + 0.4)])], { size: 0.55, tone: 'hi' }));
  out.push(`<path data-part="aguja" class="iso-line aguja" data-tone="hi" style="stroke-width:1.2" d=""/>`);
  out.push(D([at([TERMO.x, TERMO.y + 2, TERMO.z])], { size: 0.7, tone: 'hi' }));
  // el grifo del suero: el cuerpo, el caño hacia abajo y la palanca (viva)
  const Fg = G.frameAlong([GRIFO.x, GRIFO.y, GRIFO.z], [0, 1, 0]);
  out.push(S(G.disc(0, 1.2, 2.4, Fg, P), { tone: 'mid' }));
  out.push(S(G.disc(1.2, 5, 1.5, Fg, P), { tone: 'mid', className: 'grifo' }));
  const Fc = G.frameAlong([GRIFO.x, GRIFO.y + 4.2, GRIFO.z], [0, 0, -1]);
  out.push(S(G.disc(0, 3.4, 1.1, Fc, P), { tone: 'mid', className: 'grifo' }));
  out.push(`<path data-part="palanca" class="iso-line" data-tone="hi" style="stroke-width:1.6;stroke-linecap:round" d=""/>`);
  // la placa de la cuba, con sus dos remaches
  const px = -96, pz = 28;
  out.push(S(G.prismOf(G.frameOf([px, C.y1, pz], [0, 1, 0], [1, 0, 0], [0, 0, 1]), [[0, 0], [22, 0], [22, 6], [0, 6]], 0, 0.5, P), { tone: 'mid' }));
  out.push(k.faceTextSvg(k.sideMatrix([px + 6, C.y1 + 0.55], pz + 4.4, P, 'left'), '200 L', { size: 2.8, tone: 'hi' }));
  out.push(D([at([px + 1.4, C.y1 + 0.55, pz + 3]), at([px + 20.6, C.y1 + 0.55, pz + 3])], { size: 0.4 }));
  return out.join('');
}
// el frasco de cuajo, junto a la cuba (se ilumina al cuajar)
function cuajo() {
  const x = -124, y = 33, out = [];
  out.push(S(k.cylinder(x, y, 3.4, 0, 9, P, 28, 0.5), { tone: 'hi', className: 'frasco' }));
  const Ff = G.frameAlong([x, y, 0], [0, 0, 1]);
  out.push(L(G.arcOf(Ff, 3.4, 3.42, P) + G.arcOf(Ff, 6.6, 3.42, P), { tone: 'lo' }));
  out.push(S(k.cylinder(x, y, 1.5, 9, 2.6, P, 20), { tone: 'mid', className: 'frasco' }));
  out.push(S(k.cylinder(x, y, 1.9, 11.6, 1.6, P, 20, 0.3), { tone: 'lo', className: 'frasco' }));
  return `<g data-part="cuajo">${out.join('')}</g>`;
}
// el husillo y la manivela (fijos) y el carro con su tuerca (vivo, se traslada)
function husillo() {
  const out = [], y = C.y1 + 2.4, z = C.zr + 2.2;
  const Fh = G.frameAlong([C.x0 + 1, y, z], [1, 0, 0]);
  for (const x of [C.x0 + 1, C.x1 - 3]) out.push(S(k.slabOf({ x, y: C.y1 - 0.4, w: 2, d: 4, r: 0.3 }, C.zr, 4.4, P, 2), { tone: 'lo' }));
  out.push(S(G.disc(0, C.x1 - C.x0 + 2, 0.7, Fh, P), { tone: 'mid' }));
  // (las vueltas del husillo, como roscas)
  let rosca = ''; for (let s = 3; s < C.x1 - C.x0 - 2; s += 1.6) rosca += G.arcOf(Fh, s, 0.72, P);
  out.push(L(rosca, { tone: 'lo' }));
  // la manivela al final: el disco, el brazo y el pomo moleteado
  const Fm = G.frameAlong([C.x1 + 3, y, z], [1, 0, 0]);
  out.push(S(G.disc(0, 1.6, 3.4, Fm, P), { tone: 'mid', className: 'manivela' }));
  out.push(L(linea([[C.x1 + 4.7, y, z], [C.x1 + 4.7, y, z + 6]]), { tone: 'hi' }), D([at([C.x1 + 4.7, y, z])], { size: 0.55, tone: 'hi' }));
  out.push(S(k.cylinder(C.x1 + 5.4, y, 1.1, z + 5.2, 3.6, P, 16), { tone: 'hi', className: 'manivela' }));
  return out.join('');
}
function carro() {
  // el carro: una barra sobre los dos raíles, con la tuerca del husillo delante
  const out = [], x = LIRA.xa;
  out.push(S(k.slabOf({ x: x - 2.5, y: C.y0 - 0.5, w: 5, d: C.y1 - C.y0 + 1, r: 0.5 }, C.zr + 1.4, 2.4, P, 2, 0.3), { tone: 'hi', className: 'carro' }));
  out.push(S(k.slabOf({ x: x - 2.2, y: C.y1 + 0.4, w: 4.4, d: 4, r: 0.6 }, C.zr + 0.4, 3.6, P, 2, 0.3), { tone: 'mid', className: 'carro' }));
  out.push(D([at([x - 1.4, C.y0 + 1, C.zr + 3.8]), at([x + 1.4, C.y0 + 1, C.zr + 3.8]), at([x - 1.4, C.y1 - 1, C.zr + 3.8]), at([x + 1.4, C.y1 - 1, C.zr + 3.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- el cubo del suero ----------
const nivelCubo = (f) => 1.2 + f * (CUBO.h - 3.5);
function cubo() {
  const out = [];
  out.push(S(k.cylinder(CUBO.x, CUBO.y, CUBO.r, 0, CUBO.h, P, 36, 0.4), { tone: 'mid', className: 'cubo' }));
  // (por dentro: la boca oscura y, recortado por ella, el suero que va subiendo)
  out.push(`<clipPath id="boca-cubo"><path d="${elipse(CUBO.x, CUBO.y, CUBO.r - 0.8, CUBO.h)}"/></clipPath>`);
  out.push(`<path class="interior" d="${elipse(CUBO.x, CUBO.y, CUBO.r - 0.8, CUBO.h)}"/>`);
  out.push(`<path data-part="suero-cubo" class="suero" clip-path="url(#boca-cubo)" d=""/>`);
  out.push(L(k.ring(CUBO.x, CUBO.y, CUBO.r - 0.8, CUBO.h, P, 36), { tone: 'hi' }));
  // el asa
  out.push(L(linea(Array.from({ length: 13 }, (_, i) => { const a = Math.PI * i / 12; return [CUBO.x + Math.cos(a) * CUBO.r, CUBO.y, CUBO.h + Math.sin(a) * 5]; })), { tone: 'mid' }));
  return out.join('');
}

// ---------- la prensa de palanca ----------
const PR = PRENSA;
function prensaBase() {
  const out = [];
  // la bandeja con su canal y su caño, los dos moldes con sus aros y sus agujeros, y el poste de la palanca
  const band = { x: 14, y: PR.yA + 2, w: 82, d: PR.yB - PR.yA - 4, r: 1.6 };
  out.push(S(k.slabOf(band, 0, 3, P, 4, 0.5), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(band, 2.4), 3, P, 4), { tone: 'lo' }));
  out.push(S(k.slabOf({ x: 95, y: PR.ym - 1.2, w: 5, d: 2.4, r: 0.4 }, 0.6, 1.6, P, 2), { tone: 'lo' }));
  const poste = { x: PR.piv[0] - 3, y: PR.ym - 4, w: 6, d: 8, r: 0.6 };
  out.push(S(k.slabOf({ x: poste.x - 2, y: poste.y - 2, w: 10, d: 12, r: 0.8 }, 0, 2.2, P, 3), { tone: 'lo' }));
  out.push(S(k.slabOf(poste, 2.2, PR.piv[2] + 3 - 2.2, P, 2, 0.4), { tone: 'mid' }));
  out.push(L(k.sideSeam(poste, 14, P, 2), { tone: 'faint' }));
  return out.join('');
}
function moldes() {
  const out = [];
  for (const x of PR.moldes) {
    const F = G.frameAlong([x, PR.ym, 3], [0, 0, 1]);
    out.push(S(k.cylinder(x, PR.ym, PR.rm, 3, PR.hm, P, 40, 0.3), { tone: 'hi', className: 'molde' }));
    out.push(L(G.ribsOf(F, 3.8, PR.hm - 0.8, PR.rm, 22, P), { tone: 'lo' }));
    out.push(L([3.8, PR.hm - 0.8].map((s) => G.arcOf(F, s, PR.rm + 0.05, P)).join(''), { tone: 'mid' }));
  }
  return out.join('');
}
// el tablero que aprieta los moldes y el taco donde apoya la palanca (vivos: bajan un poco al prensar)
function prensaTabla() {
  const out = [], z = 3 + PR.hm;
  out.push(S(k.slabOf({ x: PR.moldes[0] - 12, y: PR.ym - 11, w: PR.moldes[1] - PR.moldes[0] + 24, d: 22, r: 1 }, z, 2.6, P, 3, 0.4), { tone: 'mid', className: 'tabla' }));
  out.push(S(k.slabOf({ x: PR.contacto - 4, y: PR.ym - 3, w: 8, d: 6, r: 0.6 }, z + 2.6, PR.piv[2] - 1.5 - z - 2.6, P, 2, 0.3), { tone: 'mid', className: 'tabla' }));
  return out.join('');
}
// la palanca, girada th alrededor del perno (en la página se rehace con la misma función)
function palancaSvg(Gx, K, P, PR, th) {
  const c = Math.cos(th), s = Math.sin(th);
  const F = Gx.frameOf([PR.piv[0], PR.ym - 2, PR.piv[2]], [0, 1, 0], [c, 0, s], [-s, 0, c]);
  return K.solidSvg(Gx.prismOf(F, [[-5, -1.5], [PR.largo, -1.5], [PR.largo, 1.5], [-5, 1.5]], 0, 4, P), { tone: 'hi', className: 'palanca' });
}
function perno() {
  const F = G.frameAlong([PR.piv[0], PR.ym - 4.6, PR.piv[2]], [0, 1, 0]);
  return S(G.disc(0, 9.2, 1, F, P), { tone: 'mid' }) + D([at([PR.piv[0], PR.ym + 4.6, PR.piv[2]])], { size: 0.5, tone: 'hi' });
}
// la piedra que cuelga del extremo, dibujada en el origen (se traslada adonde esté el extremo)
function piedra() {
  const ring = [[-5, -4], [-1, -5.5], [4.5, -4], [5.5, 0.5], [3.5, 4.5], [-2, 5], [-5.5, 1.5]].map(([x, y]) => [x, y]);
  return S(k.extrude(ring, -16, 9, P, { bevel: 1.4 }), { tone: 'mid', className: 'piedra' });
}

// ---------- la tina de salmuera ----------
function tina() {
  const out = [];
  out.push(S(k.cylinder(TINA.x, TINA.y, TINA.r, 0, TINA.h, P, 44, 0.5), { tone: 'mid', className: 'tina' }));
  const Ft = G.frameAlong([TINA.x, TINA.y, 0], [0, 0, 1]);
  out.push(L([4.5, 9.5].map((z) => G.arcOf(Ft, z, TINA.r + 0.05, P)).join(''), { tone: 'lo' }));
  out.push(`<clipPath id="boca-tina"><path d="${elipse(TINA.x, TINA.y, TINA.r - 1, TINA.h)}"/></clipPath>`);
  out.push(`<path class="interior" d="${elipse(TINA.x, TINA.y, TINA.r - 1, TINA.h)}"/>`);
  out.push(`<path class="salmuera" clip-path="url(#boca-tina)" d="${elipse(TINA.x, TINA.y + 1.2, TINA.r - 1, TINA.h - 3.2)}"/>`);
  out.push(L(k.ring(TINA.x, TINA.y, TINA.r - 1, TINA.h, P, 44), { tone: 'hi' }));
  return out.join('');
}
// el queso que flota en la salmuera (vivo: se mece)
const quesoFlota = () => S(k.cylinder(TINA.x - 2, TINA.y + 2, 6.5, TINA.h - 4.6, 3, P, 32, 0.6), { tone: 'hi', className: 'queso' });

// ---------- el estante de curar ----------
const E = ESTANTE;
const queso = (x, y, z, r = 7, h = 7) => {
  const F = G.frameAlong([x, y, z], [0, 0, 1]);
  return S(k.cylinder(x, y, r, z, h, P, 32, 0.9), { tone: 'hi', className: 'queso' }) + L(G.arcOf(F, h * 0.5, r + 0.05, P), { tone: 'faint' });
};
function estante(parte) {
  const out = [], postes = [[E.x0, E.y0], [E.x1 - 3, E.y0], [E.x0, E.y1 - 3], [E.x1 - 3, E.y1 - 3]];
  const lejos = postes.filter(([x, y]) => y < 0 && (derCerca ? x < 100 : x > 100) || y === E.y0);
  const cerca = postes.filter((p) => !lejos.includes(p));
  const poste = ([x, y]) => S(k.slabOf({ x, y, w: 3, d: 3, r: 0.3 }, 0, E.alto, P, 2), { tone: 'mid' });
  if (parte === 'detras') return lejos.map(poste).join('');
  if (parte === 'delante') return cerca.map(poste).join('');
  for (const z of E.baldas) {
    out.push(S(k.slabOf({ x: E.x0 - 1, y: E.y0 - 1, w: E.x1 - E.x0 + 2, d: E.y1 - E.y0 + 2, r: 0.6 }, z - 1.8, 1.8, P, 2), { tone: 'mid' }));
    // (las tablillas de la balda, de pino: por ellas respira el queso)
    let t = ''; for (let y = E.y0 + 3; y < E.y1; y += 4) t += k.lineOnTop([E.x0 - 1, y], [E.x1 + 1, y], z, P);
    out.push(L(t, { tone: 'faint' }));
    const q = [[E.x0 + 12, E.y0 + 14], [E.x0 + 30, E.y0 + 13], [E.x0 + 48, E.y0 + 14]].sort((a, b) => dep([a[0], a[1], z]) - dep([b[0], b[1], z]));
    out.push(`<g data-part="curan">${q.map(([x, y]) => queso(x, y, z)).join('')}</g>`);
  }
  return out.join('');
}

// ---------- la figura ----------
const TH_ARRIBA = PR.arriba;
const extremo = (th) => [PR.piv[0] + Math.cos(th) * PR.largo, PR.ym, PR.piv[2] + Math.sin(th) * PR.largo];
const e0 = extremo(TH_ARRIBA);
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta de una quesería de pastor: la cuba de cuajar con su termómetro, la lira que corta la cuajada sobre sus raíles, el grifo del suero con su cubo, la prensa de palanca con su piedra sobre dos moldes, la tina de salmuera y el estante donde se cura el queso. Paso a paso se ilumina la pieza que trabaja.',
  body: [
    tablero(),
    `<g data-part="estante">${estante('detras')}${estante('baldas')}${estante('delante')}</g>`,
    `<g data-part="tina">${tina()}<g data-part="flota">${quesoFlota()}</g></g>`,
    cubaDetras(),
    `<path data-part="dentro" class="interior" d="${dentroD(LECHE.z)}"/>`,
    `<path data-part="leche" class="leche" d="${lecheD(LECHE.z)}"/>`,
    `<path data-part="cortes" class="iso-line" data-tone="mid" style="stroke-width:.5" d=""/>`,
    `<g data-part="lira"><path class="iso-line hilos" data-tone="hi" style="stroke-width:.5" d="${liraHilos(LECHE.z)}"/></g>`,
    cubaDelante(),
    husillo(),
    `<g data-part="carro">${carro()}</g>`,
    cuajo(),
    `<path data-part="chorro" class="iso-line chorro" data-tone="hi" style="stroke-width:1.1" d="${linea([[GRIFO.x, GRIFO.y + 4.2, GRIFO.z - 3.6], [GRIFO.x, GRIFO.y + 4.2, CUBO.h + 1]])}"/>`,
    `<g data-part="cubo">${cubo()}</g>`,
    `<g data-part="prensa">${prensaBase()}${moldes()}<g data-part="tabla">${prensaTabla()}</g><path data-part="cuerda" class="iso-line" data-tone="mid" d=""/><g data-part="palanca">${palancaSvg(G, k, P, PR, TH_ARRIBA)}</g>${perno()}<g data-part="piedra" transform="${k.translateAlong(P, e0)}">${piedra()}</g></g>`,
  ],
});

// ---------- lo que se mueve en la página ----------
const sinExport = (f) => readFileSync(join(KIT, f), 'utf8').replace(/^import .*$/gm, '').replace(/^export /gm, '');
const NOMBRES_G = ['frameOf', 'frameAlong', 'disc', 'arcOf', 'prismOf', 'viewOf', 'dot3', 'unit3', 'sub3', 'cross3', 'add3', 'mul3', 'len3', 'lerp3', 'scaleOf', 'lightOf', 'toneOf', 'bandOf', 'hullOf', 'runsOf', 'curveRuns', 'fadeOf', 'stepsFor', 'pathLength', 'resample', 'cut', 'pointAlong', 'tangentAlong', 'fillet'];
const live = MARCA_JUEGO + `
const G = (() => { ${sinExport('lathe.mjs')}; return { ${NOMBRES_G.join(', ')} }; })();
const P = ${JSON.stringify(P)}, C = ${JSON.stringify(CUBA)}, LECHE = ${JSON.stringify(LECHE)}, LIRA = ${JSON.stringify(LIRA)}, TERMO = ${JSON.stringify(TERMO)};
const GRIFO = ${JSON.stringify(GRIFO)}, CUBO = ${JSON.stringify(CUBO)}, PR = ${JSON.stringify(PRENSA)}, TINA = ${JSON.stringify(TINA)}, IN = ${JSON.stringify(IN)};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length, DER = ${derCerca};
const palancaSvg = ${palancaSvg.toString()};
const K = { iso, solidSvg, lineSvg, dotsSvg };
const at = (p) => iso(p, P), linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L'), poly = (pts) => linea(pts) + 'Z';
const elipse = (cx, cy, r, z, n = 36) => poly(Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * 2 * Math.PI) * r, cy + Math.sin(i / n * 2 * Math.PI) * r, z]));
const lecheD = (z) => poly([[IN.x0, IN.y0, z], [IN.x1, IN.y0, z], [IN.x1, IN.y1, z], [IN.x0, IN.y1, z]]);
const dentroD = (z) => poly([[IN.x0, IN.y0, z], [IN.x1, IN.y0, z], [IN.x1, IN.y0, C.zr], [IN.x0, IN.y0, C.zr]]) + (DER
  ? poly([[IN.x0, IN.y0, z], [IN.x0, IN.y1, z], [IN.x0, IN.y1, C.zr], [IN.x0, IN.y0, C.zr]])
  : poly([[IN.x1, IN.y0, z], [IN.x1, IN.y1, z], [IN.x1, IN.y1, C.zr], [IN.x1, IN.y0, C.zr]]));
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = { aguja: $('aguja'), leche: $('leche'), dentro: $('dentro'), cortes: $('cortes'), lira: $('lira'), carro: $('carro'), hilos: $('lira').firstElementChild,
  palanca: $('palanca'), piedra: $('piedra'), cuerda: $('cuerda'), tabla: $('tabla'), chorro: $('chorro'), cubo: $('suero-cubo'), flota: $('flota'),
  estante: $('estante'), tina: $('tina'), prensa: $('prensa'), cuboG: $('cubo'), fuego: $('fuego'), cuajo: $('cuajo') };
const pared = [...svgEl.querySelectorAll('.pared')], termo = [...svgEl.querySelectorAll('.termo, .termo-bisel')], grifo = [...svgEl.querySelectorAll('.grifo')];
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
const CACHE = new Map(), PASO_A = 0.2 * Math.PI / 180;
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, thAntes = null, txt = '';
// (la vuelta sola: un paso cada 2,6 s, parándose en cada uno)
const tourAt = (t) => { const T = 2.6 * N + 2, f = (t % T) / T * (N + 0.77); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
function draw() {
  const paso = Math.min(N - 1, Math.floor(s)), f = s - paso;
  // 1 · el termómetro sube de 12 a 30 °C mientras se templa; luego se queda en 30
  const temp = TERMO.t0 + (TERMO.t1 - TERMO.t0) * sm(s), a = TERMO.a0 + (TERMO.a1 - TERMO.a0) * temp / TERMO.tMax, yy = TERMO.y + 2.05;
  el.aguja.setAttribute('d', linea([[TERMO.x, yy, TERMO.z], [TERMO.x + Math.cos(a) * (TERMO.r - 1.1), yy, TERMO.z + Math.sin(a) * (TERMO.r - 1.1)]]));
  // 2 · la leche cuaja (cambia de color); 3 · la lira corre y deja la cuajada en granos; 4 · baja al irse el suero
  const cuaja = sm((s - 1) / 0.9), xl = LIRA.xa + (LIRA.xb - LIRA.xa) * sm((s - 2) / 0.95), des = sm((s - 3) / 0.9), z = LECHE.z + (LECHE.zDes - LECHE.z) * des;
  el.leche.setAttribute('d', lecheD(z)); el.dentro.setAttribute('d', dentroD(z));
  el.leche.style.setProperty('--cuaja', cuaja.toFixed(3));
  el.leche.classList.toggle('cuajada', cuaja > 0.5);
  let cortes = '';
  if (s > 2) { const x1 = Math.min(xl, IN.x1); for (let x = IN.x0 + 4; x < x1; x += 4) cortes += linea([[x, IN.y0, z], [x, IN.y1, z]]); for (let y = IN.y0 + 4; y < IN.y1; y += 4) cortes += linea([[IN.x0, y, z], [x1, y, z]]); }
  el.cortes.setAttribute('d', cortes);
  const dx = xl - LIRA.xa, tr = translateAlong(P, [dx, 0, 0]);
  el.lira.setAttribute('transform', tr); el.carro.setAttribute('transform', tr);
  el.hilos.setAttribute('d', (() => { let d = ''; for (let i = 0; i < LIRA.hilos; i++) { const y = IN.y0 + 3 + i * (IN.y1 - IN.y0 - 6) / (LIRA.hilos - 1); d += linea([[LIRA.xa, y, LIRA.zc], [LIRA.xa, y, z]]); } return d + linea([[LIRA.xa, IN.y0 + 3, z], [LIRA.xa, IN.y1 - 3, z]]); })());
  // el grifo: la palanca gira al abrir; corre el chorro y el cubo se llena
  const abre = paso === 3 ? sm(f / 0.25) * (1 - sm((f - 0.8) / 0.2)) : 0, ga = Math.PI / 2 - abre * Math.PI / 2;
  const gx = GRIFO.x, gy = GRIFO.y + 5.4, gz = GRIFO.z;
  el.palanca = el.palanca; svgEl.querySelector('[data-part="palanca"].iso-line, path[data-part="palanca"]')?.setAttribute('d', linea([[gx, gy, gz], [gx + Math.cos(ga) * 5, gy, gz + Math.sin(ga) * 5]]));
  el.chorro.style.opacity = abre.toFixed(2);
  const lleno = des;
  el.cubo.setAttribute('d', elipse(CUBO.x, CUBO.y + 0.8, CUBO.r - 0.8, 1.2 + lleno * (CUBO.h - 3.5)));
  el.cubo.style.opacity = lleno > 0.02 ? 1 : 0;
  // 5 · la palanca baja hasta el taco y la piedra aprieta; la tabla baja un poco
  const baja = sm((s - 4) / 0.8), th = PR.arriba * (1 - baja), q = Math.round(th / PASO_A);
  if (q !== thAntes) { let svg = CACHE.get(q); if (!svg) { svg = palancaSvg(G, K, P, PR, q * PASO_A); CACHE.set(q, svg); } el.palanca.innerHTML = svg; thAntes = q; }
  const ex = [PR.piv[0] + Math.cos(th) * PR.largo, PR.ym, PR.piv[2] + Math.sin(th) * PR.largo];
  el.piedra.setAttribute('transform', translateAlong(P, ex));
  el.cuerda.setAttribute('d', linea([[ex[0] - 1, ex[1], ex[2] - 1.5], [ex[0], ex[1], ex[2] - 7]]));
  el.tabla.setAttribute('transform', translateAlong(P, [0, 0, -0.9 * baja]));
  // 6 · el queso se mece en la salmuera
  const mece = paso === 5 ? Math.sin(f * Math.PI * 4) * 0.5 : 0;
  el.flota.setAttribute('transform', translateAlong(P, [0, 0, mece]));
  // lo que trabaja en cada paso, iluminado
  ilumina([...termo, el.fuego], paso === 0); ilumina([el.leche, el.cuajo], paso === 1); ilumina([el.lira, el.carro], paso === 2); ilumina([...grifo, el.cuboG], paso === 3);
  ilumina(el.prensa, paso === 4); ilumina(el.tina, paso === 5); ilumina(el.estante, paso === 6);
  // la lectura
  const extra = [Math.round(temp) + ' °C', Math.round(5 + 30 * sm(f)) + ' min a 30 °C', 'granos como de arroz', 'sale el suero', 'unas horas', '1 a 2 días', Math.max(0, Math.round(4 * sm(f / 0.8))) + (Math.round(4 * sm(f / 0.8)) === 1 ? ' mes' : ' meses') + ' · Idiazabal 2, Roncal 4'][paso];
  const text = (paso + 1) + ' · ' + PASOS[paso] + ' · ' + extra;
  if (text !== txt) { readout.textContent = text; stage.setAttribute('aria-valuetext', text); txt = text; }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
  if (touring) { clock += dt; target = tourAt(clock); }
  s = still.matches ? target : s + (target - s) * (1 - Math.exp(-dt / 0.3));
  if (Math.abs(target - s) < 0.002) s = target;
  draw();
  frame = visible && (touring || s !== target) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (to) => { touring = false; target = clamp(to, 0, N - 0.001); clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 5000); run(); };
new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: '120px 0px' }).observe(stage);
stage.addEventListener('pointermove', (e) => { const b = svgEl.getBoundingClientRect(); steer(clamp((e.clientX - b.left) / b.width, 0, 1) * N); });
stage.addEventListener('pointerdown', (e) => { const b = svgEl.getBoundingClientRect(); steer(clamp((e.clientX - b.left) / b.width, 0, 1) * N); });
stage.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); steer(Math.floor(target) + 1.6); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); steer(Math.floor(target) - 0.4); } });
draw();
${PUENTE}
`;

// ---------- colores propios: la leche, la cuajada, el suero, la salmuera ----------
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--leche:#efe6d6;--cuajada:#f2d98a;--suero:#d9d18a;--salmuera:#5560a8;--interior:#0d0718}
.iso[data-theme="light"]{--leche:#fffdf6;--cuajada:#f6e3a0;--suero:#ece49a;--salmuera:#c9d0f2;--interior:#e2dcee}
.leche{fill:var(--leche);transition:fill .5s}.leche.cuajada{fill:var(--cuajada)}
.leche[data-lit]{fill:var(--cuajada);filter:drop-shadow(0 0 3px var(--anatomy-lit))}
.suero{fill:var(--suero)}.salmuera{fill:var(--salmuera)}.interior{fill:var(--interior)}
.llama{opacity:.35;transition:opacity .4s}[data-lit] .llama{opacity:1;stroke:var(--anatomy-lit);animation:llama .35s ease-in-out infinite alternate}
@keyframes llama{to{opacity:.55}}
.chorro{stroke-dasharray:1.6 2.2;animation:corre .5s linear infinite;transition:opacity .2s}
@keyframes corre{to{stroke-dashoffset:-3.8}}
@media (prefers-reduced-motion:reduce){.chorro,[data-lit] .llama{animation:none}}
[data-lit]>.iso-edge,[data-lit] .iso-edge,[data-lit].hilos,[data-lit] .hilos{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
`;

const body = k.plateHtml({
  fig: 'Lámina 2',
  title: 'Cómo se hace el queso',
  hint: 'Pasa el ratón: paso a paso',
  readout: '1 · Templar la leche · 12 °C',
  keys: [
    { mark: 'lit', label: 'La pieza que trabaja en cada paso: termómetro, cuba, lira, grifo, prensa, salmuera y estante' },
    { mark: 'raised', label: 'Leche cruda de oveja latxa (Idiazabal) o rasa y latxa (Roncal), templada a unos 30 °C' },
    { mark: 'flat', label: 'Curación: al menos 2 meses el Idiazabal y 4 el Roncal' },
  ],
  caption: 'Se templa la leche cruda de oveja y se le echa cuajo; en media hora larga cuaja. La lira corta la cuajada en granos como de arroz para que suelte el suero, que sale por el grifo. La cuajada se mete en moldes y se prensa unas horas, se sala uno o dos días en salmuera y se cura en el estante, dándole la vuelta, al menos 2 meses (Idiazabal) o 4 (Roncal, la primera Denominación de Origen de España, de 1981).',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="El queso, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="7">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Cómo se hace el queso', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('queso', html, theme);
