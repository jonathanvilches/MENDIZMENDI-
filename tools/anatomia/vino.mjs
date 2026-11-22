// Lámina isométrica interactiva del vino rosado de Navarra (skill Anatomy, 21 de noviembre de 2026; el autor: «la
// elaboración de diferentes alimentos [...] del vino»). Una maqueta de bodega cooperativa sobre su tablero: la caja de
// vendimia con la garnacha, la despalilladora-estrujadora con su tolva y su sinfín (y el raspón que sale aparte), el
// depósito de maceración con su tubo de nivel, la válvula del sangrado, el depósito de fermentación con su camisa de frío y
// su termómetro, y las botellas. Al recorrerla se ve paso a paso, y en cada paso se ilumina la pieza que trabaja: el color
// del mosto en el tubo de nivel va del amarillo pálido al rosa mientras macera con la piel; al sangrar, el mosto rosado pasa
// al otro depósito, donde fermenta con burbujas a unos 16 °C. La misma secuencia que la misión «El viaje de la uva»
// (data/procesos.js, wine): se vendimia, se separa el raspón, se estruja la uva y el mosto fermenta.
// Uso: node tools/anatomia/vino.mjs [--light]  →  entrega/anatomia/vino(-light).html (y public/anatomia, para el juego)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import * as T from '../../.claude/skills/anatomy/kit/tube.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { KIT, COLORES, enJuego, MARCA_JUEGO, escribe, PUENTE } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 340;

// ---------- el modelo (centímetros de la maqueta) ----------
const TQ1 = { x: -28, y: -14, R: 15, z0: 12, z1: 58, cono: 7 };   // depósito de maceración
const TQ2 = { x: 46, y: -14, R: 15, z0: 12, z1: 58, cono: 7 };    // depósito de fermentación
const DES = { x: -96, y: 4, w: 34, d: 18, pata: 10, h: 15 };     // despalilladora-estrujadora
const CAJA = { x: -132, y: 24, w: 24, d: 15, h: 9 };
const BOT = { x: 96, y: 26, n: 5, paso: 8.6 };
const PASOS = ['Vendimiar', 'Despalillar y estrujar', 'Macerar con la piel', 'Sangrar', 'Fermentar', 'Embotellar'];
const COL = { palido: [233, 214, 150], rosa: [255, 105, 150] };

// ---------- la cámara ----------
const PLATE = { x: -150, y: -58, w: 300, d: 120, r: 7 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [TQ1.x, TQ1.y, TQ1.z1 + TQ1.cono + 4], [TQ2.x, TQ2.y, TQ2.z1 + TQ2.cono + 4]], WIDTH, HEIGHT, { pad: 10, azimuth: 64, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
// (hacia dónde está quien mira, en el suelo: ahí van el tubo de nivel y la válvula de cada depósito)
const vx = dep([1, 0, 0]) - dep([0, 0, 0]), vy = dep([0, 1, 0]) - dep([0, 0, 0]), VA = Math.atan2(vy, vx);
const FZ = (x, y, z = 0) => G.frameAlong([x, y, z], [0, 0, 1]);

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
  const regla = { x: -136, y: 48, w: 190, d: 5.5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.6, 0.6, [1.6, 3], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.8, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.8, 0.6])], { size: 0.45 }));
  const placa = { x: 76, y: 47, w: 60, d: 7.5, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 5, placa.y + 4.4], 0.8, P, 'x'), 'GARNACHA · ROSADO', { size: 2.4, tone: 'mid' }));
  out.push(D([at([placa.x + 2.2, placa.y + 3.75, 0.8]), at([placa.x + placa.w - 2.2, placa.y + 3.75, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- un depósito de acero: patas, cuerpo, cono, boca de hombre, aros y el tubo de nivel (con su líquido, vivo) ----------
function deposito(Q, id, camisa) {
  const out = [];
  // las tres patas, las de detrás primero
  const patas = [0, 1, 2].map((i) => VA + Math.PI + (i - 1) * 2.1).map((a) => [Q.x + Math.cos(a) * (Q.R - 3), Q.y + Math.sin(a) * (Q.R - 3)]).sort((a, b) => dep([a[0], a[1], 0]) - dep([b[0], b[1], 0]));
  for (const [x, y] of patas) { out.push(S(k.cylinder(x, y, 2.4, 0, 1, P, 18), { tone: 'lo' })); out.push(S(k.cylinder(x, y, 1.2, 1, Q.z0, P, 14), { tone: 'mid' })); }
  // el cuerpo (con el fondo en cono hacia abajo) y la tapa en cono con su boca
  const F = FZ(Q.x, Q.y);
  out.push(S(G.solidOf([[Q.z0 - 3, 3], [Q.z0, Q.R], [Q.z1, Q.R], [Q.z1 + Q.cono, 4.2], [Q.z1 + Q.cono, 4.2]], F, P), { tone: 'hi', className: 'tanque' }));
  out.push(S(G.solidOf([[Q.z1 + Q.cono, 4.2], [Q.z1 + Q.cono + 2.4, 4.2]], F, P), { tone: 'mid' }));
  // los aros de las soldaduras y, en el de fermentación, la camisa de frío con su tubo en espiral
  out.push(L([Q.z0 + 12, Q.z0 + 24, Q.z1 - 6].map((s) => G.arcOf(F, s, Q.R + 0.05, P)).join(''), { tone: 'lo' }));
  if (camisa) {
    out.push(`<g data-part="camisa">${S(G.solidOf([[Q.z1 - 18, Q.R + 0.9], [Q.z1 - 8, Q.R + 0.9]], F, P), { tone: 'mid', className: 'camisa' })}${L([Q.z1 - 15.5, Q.z1 - 13, Q.z1 - 10.5].map((s) => G.arcOf(F, s, Q.R + 0.95, P)).join(''), { tone: 'lo' })}</g>`);
  }
  // la placa con el número del depósito, hacia quien mira
  const pa = VA - 0.55, px = Q.x + Math.cos(pa) * (Q.R + 0.1), py = Q.y + Math.sin(pa) * (Q.R + 0.1);
  out.push(D([at([px, py, Q.z0 + 30])], { size: 0.6, tone: 'hi' }));
  return out.join('');
}
// el tubo de nivel: dos codos al depósito y el tubo de vidrio con el mosto (su altura y su color, vivos)
const NIVEL = (Q) => { const a = VA + 0.62; return { x: Q.x + Math.cos(a) * (Q.R + 2.6), y: Q.y + Math.sin(a) * (Q.R + 2.6), a, z0: Q.z0 + 3, z1: Q.z1 - 3 }; };
function tuboNivel(Q, id) {
  const N = NIVEL(Q), out = [];
  for (const z of [N.z0, N.z1]) {
    const F = G.frameAlong([Q.x + Math.cos(N.a) * (Q.R - 0.5), Q.y + Math.sin(N.a) * (Q.R - 0.5), z], [Math.cos(N.a), Math.sin(N.a), 0]);
    out.push(S(G.disc(0, 3.6, 0.9, F, P), { tone: 'mid' }));
  }
  // el vidrio: una banda vertical de cara a quien mira; dentro, el mosto
  const ux = -Math.sin(VA), uy = Math.cos(VA), w = 0.9;
  const vidrio = poly([[N.x - ux * w, N.y - uy * w, N.z0], [N.x + ux * w, N.y + uy * w, N.z0], [N.x + ux * w, N.y + uy * w, N.z1], [N.x - ux * w, N.y - uy * w, N.z1]]);
  out.push(`<path class="vidrio" d="${vidrio}"/>`);
  out.push(`<path data-part="mosto-${id}" class="mosto" d=""/>`);
  out.push(`<g data-part="burbujas-${id}"></g>`);
  out.push(L(vidrio, { tone: 'mid' }));
  return out.join('');
}
// la válvula del sangrado en el depósito 1, hacia quien mira, con su palanca (viva)
const VAL = { a: VA - 0.15, z: TQ1.z0 + 2 };
VAL.x = TQ1.x + Math.cos(VAL.a) * TQ1.R; VAL.y = TQ1.y + Math.sin(VAL.a) * TQ1.R;
function valvula() {
  const F = G.frameAlong([VAL.x, VAL.y, VAL.z], [Math.cos(VAL.a), Math.sin(VAL.a), 0]);
  return `<g data-part="valvula">${S(G.disc(0, 3.2, 1.4, F, P), { tone: 'mid' })}${S(G.disc(3.2, 5.2, 2.2, F, P), { tone: 'mid', className: 'valv' })}<path data-part="palanca" class="iso-line" data-tone="hi" style="stroke-width:1.5;stroke-linecap:round" d=""/><g class="iso-dots" data-tone="hi"><circle data-part="pomo" cx="0" cy="0" r="1.1"/></g></g>`;
}
// el termómetro del depósito de fermentación
const TER = { a: VA + 0.05, z: TQ2.z0 + 18, r: 4 };
function termometro() {
  const nx = Math.cos(TER.a), ny = Math.sin(TER.a), x = TQ2.x + nx * (TQ2.R + 0.1), y = TQ2.y + ny * (TQ2.R + 0.1);
  const F = G.frameAlong([x, y, TER.z], [nx, ny, 0]);
  const ux = -ny, uy = nx;
  let mn = '';
  for (let i = 0; i <= 10; i++) { const a = Math.PI * 1.25 - i * Math.PI * 0.15, r1 = TER.r - (i % 5 ? 0.9 : 1.5), f = (r) => [x + nx * 1.65 + ux * Math.cos(a) * r, y + ny * 1.65 + uy * Math.cos(a) * r, TER.z + Math.sin(a) * r]; mn += linea([f(TER.r - 0.4), f(r1)]); }
  return `<g data-part="termo">${S(G.disc(0, 1.2, TER.r + 0.8, F, P), { tone: 'mid' })}${S(G.disc(1.2, 1.6, TER.r, F, P), { tone: 'hi', className: 'termo' })}${L(mn, { tone: 'lo' })}<path data-part="aguja" class="iso-line" data-tone="hi" style="stroke-width:1" d=""/>${D([at([x + nx * 1.7, y + ny * 1.7, TER.z])], { size: 0.5, tone: 'hi' })}</g>`;
}

// ---------- los tubos: de la estrujadora al depósito 1 y del sangrado al depósito 2 ----------
const salidaDes = [DES.x + DES.w + 1, DES.y + DES.d / 2, DES.pata + DES.h - 4];
const RUTA1 = G.fillet([salidaDes, [DES.x + DES.w + 8, DES.y + DES.d / 2, DES.pata + DES.h - 4], [TQ1.x - 6, DES.y + DES.d / 2 - 4, TQ1.z1 + 10], [TQ1.x - 2, TQ1.y, TQ1.z1 + TQ1.cono + 3]], 5);
const finVal = [VAL.x + Math.cos(VAL.a) * 5.2, VAL.y + Math.sin(VAL.a) * 5.2, VAL.z];
const ent2 = (() => { const a = VA + Math.PI * 0.85; return [TQ2.x + Math.cos(a) * TQ2.R, TQ2.y + Math.sin(a) * TQ2.R, TQ2.z0 + 2]; })();
const RUTA2 = G.fillet([finVal, [finVal[0] + 4, finVal[1] + 6, 4], [ent2[0] - 6, ent2[1] + 10, 4], [ent2[0], ent2[1], ent2[2]]], 4);
const tubo = (ruta, r, cls) => T.tubePieces(ruta, r, P, { maxLength: 400 }).map((pc) => T.tubeSvg(pc, { tone: 'mid', className: cls })).join('');

// ---------- la despalilladora-estrujadora ----------
function despalilladora() {
  const out = [], { x, y, w, d, pata, h } = DES;
  for (const [px, py] of [[x + 2, y + 2], [x + w - 4, y + 2], [x + 2, y + d - 4], [x + w - 4, y + d - 4]].sort((a, b) => dep([a[0], a[1], 0]) - dep([b[0], b[1], 0])))
    out.push(S(k.slabOf({ x: px, y: py, w: 2.4, d: 2.4, r: 0.3 }, 0, pata, P, 2), { tone: 'mid' }));
  out.push(S(k.slabOf({ x, y, w, d, r: 1 }, pata, h, P, 3, 0.5), { tone: 'hi', className: 'maquina' }));
  // la ventana de la tapa, con el sinfín que separa el raspón (vivo: gira)
  const vent = { x: x + 4, y: y + 3, w: w - 8, d: d - 6 }, zt = pata + h;
  out.push(`<path class="interior" d="${poly([[vent.x, vent.y, zt], [vent.x + vent.w, vent.y, zt], [vent.x + vent.w, vent.y + vent.d, zt], [vent.x, vent.y + vent.d, zt]])}"/>`);
  // (el sinfín, bajo la ventana: un eje con su hélice, que acaba en los dos cojinetes de las paredes)
  const sz = zt - 2.6, sr = 1.9, sc = k.coil(vent.x + 1.2, vent.x + vent.w - 1.2, [y + d / 2, sz], sr, 9, 'x', P);
  // (recortado a la ventana: lo de debajo del canto lo tapa la pared de la máquina)
  const ventP = poly([[vent.x, vent.y, zt], [vent.x + vent.w, vent.y, zt], [vent.x + vent.w, vent.y + vent.d, zt], [vent.x, vent.y + vent.d, zt]]);
  out.push(`<clipPath id="ventana-des"><path d="${ventP}"/></clipPath><g clip-path="url(#ventana-des)">`);
  out.push(L(linea([[vent.x, y + d / 2, sz], [vent.x + vent.w, y + d / 2, sz]]), { tone: 'lo' }));
  out.push(`<path data-part="sinfin" class="iso-line sinfin" data-tone="mid" d="${sc.back}${sc.front}"/>`);
  out.push(D([at([vent.x + 1.2, y + d / 2 + sr, sz]), at([vent.x + vent.w - 1.2, y + d / 2 + sr, sz]), at([vent.x, y + d / 2, sz]), at([vent.x + vent.w, y + d / 2, sz])], { size: 0.5, tone: 'mid' }));
  out.push('</g>');
  out.push(L(poly([[vent.x, vent.y, zt], [vent.x + vent.w, vent.y, zt], [vent.x + vent.w, vent.y + vent.d, zt], [vent.x, vent.y + vent.d, zt]]), { tone: 'mid' }));
  // la tolva: un embudo encima, por donde entra la uva
  out.push(S(G.solidOf([[zt, 4], [zt + 3, 4], [zt + 11, 12]], FZ(x + 9, y + d / 2), P), { tone: 'mid', className: 'tolva' }));
  out.push(`<path class="interior" d="${(() => { const n = 36, pts = []; for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI; pts.push([x + 9 + Math.cos(a) * 11.2, y + d / 2 + Math.sin(a) * 11.2, zt + 11]); } return poly(pts); })()}"/>`);
  out.push(L(k.ring(x + 9, y + d / 2, 11.2, zt + 11, P, 36), { tone: 'hi' }));
  // el motor del costado y su placa
  out.push(S(G.disc(0, 6, 3.2, G.frameAlong([x - 6, y + d / 2, pata + 6], [1, 0, 0]), P), { tone: 'mid' }));
  out.push(L(G.ribsOf(G.frameAlong([x - 6, y + d / 2, pata + 6], [1, 0, 0]), 1, 5, 3.2, 16, P), { tone: 'lo' }));
  // el canalón del raspón hacia delante y su cajón
  const cx = x + w - 10, cy = y + d;
  out.push(S(G.prismOf(G.frameOf([cx, cy, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]), [[0, pata + 3], [8, 3], [8, 1.5], [0, pata + 1.5]], 0, 5, P), { tone: 'mid' }));
  const cajon = { x: cx - 2, y: cy + 8, w: 10, d: 9, r: 0.5 };
  out.push(S(k.slabOf(cajon, 0, 5, P, 2, 0.3), { tone: 'lo', className: 'cajon' }));
  let raspon = ''; for (let i = 0; i < 9; i++) { const a = i * 1.7, px = cajon.x + 2 + (i % 4) * 2, py = cajon.y + 2 + Math.floor(i / 4) * 2.4; raspon += linea([[px, py, 5.2], [px + Math.cos(a) * 1.8, py + Math.sin(a) * 1.2, 5.6]]); }
  out.push(`<path data-part="raspon" class="iso-line" data-tone="mid" d="${raspon}"/>`);
  return out.join('');
}

// ---------- la caja de vendimia con la uva ----------
function caja() {
  const out = [], { x, y, w, d, h } = CAJA;
  out.push(S(k.slabOf({ x, y, w, d, r: 0.6 }, 0, h, P, 2, 0.3), { tone: 'mid', className: 'caja' }));
  out.push(L([3, 6].map((z) => k.sideSeam({ x, y, w, d, r: 0.6 }, z, P, 2)).join(''), { tone: 'lo' }));
  // los racimos: bayas en montón
  const bayas = [];
  for (let i = 0; i < 26; i++) { const u = (i * 0.618) % 1, v = (i * 0.382 + 0.1) % 1; bayas.push([x + 2.5 + u * (w - 5), y + 2.5 + v * (d - 5), h + 0.8 + ((i * 7) % 5) * 0.35]); }
  bayas.sort((a, b) => dep(a) - dep(b));
  out.push(`<g data-part="uva">${bayas.map((b) => S(G.sphereOf(b, 1.25, P), { tone: 'mid', className: 'baya' })).join('')}</g>`);
  return out.join('');
}

// ---------- las botellas ----------
function botellas() {
  const out = [], base = { x: BOT.x - 6, y: BOT.y - 6, w: BOT.n * BOT.paso + 3, d: 12, r: 0.8 };
  out.push(S(k.slabOf(base, 0, 2.4, P, 2, 0.3), { tone: 'lo' }));
  const lista = Array.from({ length: BOT.n }, (_, i) => [BOT.x + i * BOT.paso, BOT.y]).sort((a, b) => dep([a[0], a[1], 0]) - dep([b[0], b[1], 0]));
  const perfil = [[2.4, 3.3], [13, 3.3], [15.5, 1.2], [20, 1.05], [21.2, 1.3]];
  for (const [x, y] of lista) {
    const F = FZ(x, y);
    out.push(S(G.solidOf(perfil, F, P), { tone: 'hi', className: 'botella' }));
    out.push(L(G.arcOf(F, 8, 3.32, P) + G.arcOf(F, 11.5, 3.32, P), { tone: 'lo' }));
  }
  return `<g data-part="botellas">${out.join('')}</g>`;
}

// ---------- la figura ----------
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta de una bodega cooperativa: la caja de vendimia con la uva garnacha, la despalilladora-estrujadora con su tolva y su sinfín, el depósito de maceración con su tubo de nivel y la válvula del sangrado, el depósito de fermentación con su camisa de frío y su termómetro, y las botellas de rosado. Paso a paso se ilumina la pieza que trabaja y el color del mosto pasa del amarillo pálido al rosa.',
  body: [
    tablero(),
    `<g data-part="tq1">${deposito(TQ1, 1, false)}</g>`, tuboNivel(TQ1, 1),
    `<g data-part="tq2">${deposito(TQ2, 2, true)}</g>`, tuboNivel(TQ2, 2), termometro(),
    `<g data-part="tubo1">${tubo(RUTA1, 1.3, 'tubo')}</g>`,
    despalilladora(),
    `<g data-part="tubo2">${tubo(RUTA2, 1.3, 'tubo')}<path data-part="flujo" class="iso-line flujo" data-tone="hi" d="${linea(G.resample(RUTA2, 1.5))}"/></g>`,
    valvula(),
    caja(),
    botellas(),
  ],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, VA = ${VA}, TQ1 = ${JSON.stringify(TQ1)}, TQ2 = ${JSON.stringify(TQ2)}, VAL = ${JSON.stringify(VAL)}, TER = ${JSON.stringify(TER)};
const N1 = ${JSON.stringify(NIVEL(TQ1))}, N2 = ${JSON.stringify(NIVEL(TQ2))}, PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length, COL = ${JSON.stringify(COL)};
const at = (p) => iso(p, P), linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L'), poly = (pts) => linea(pts) + 'Z';
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = { m1: $('mosto-1'), m2: $('mosto-2'), b2: $('burbujas-2'), palanca: $('palanca'), pomo: $('pomo'), flujo: $('flujo'), aguja: $('aguja'), sinfin: $('sinfin'),
  uva: $('uva'), tq1: $('tq1'), tq2: $('tq2'), valvula: $('valvula'), camisa: $('camisa'), termo: $('termo'), botellas: $('botellas'), raspon: $('raspon'), tubo2: $('tubo2') };
const maquina = [...svgEl.querySelectorAll('.maquina, .tolva')];
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const mezcla = (f) => 'rgb(' + COL.palido.map((c, i) => Math.round(c + (COL.rosa[i] - c) * f)).join(',') + ')';
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
const ux = -Math.sin(VA), uy = Math.cos(VA), W = 0.75;
const banda = (Nv, f) => { const z = Nv.z0 + (Nv.z1 - Nv.z0) * f; return f <= 0.001 ? '' : poly([[Nv.x - ux * W, Nv.y - uy * W, Nv.z0], [Nv.x + ux * W, Nv.y + uy * W, Nv.z0], [Nv.x + ux * W, Nv.y + uy * W, z], [Nv.x - ux * W, Nv.y - uy * W, z]]); };
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0;
const tourAt = (t) => { const T = 2.8 * N + 2, f = (t % T) / T * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s)), f = s - paso;
  // el depósito 1 se llena al estrujar; el color va del pálido al rosa al macerar; al sangrar baja, y sube el 2
  const lleno1 = sm((s - 1) / 0.9) * (1 - sm((s - 3) / 0.9) * 0.88), color = sm((s - 2) / 0.95), lleno2 = sm((s - 3) / 0.9) * 0.82;
  el.m1.setAttribute('d', banda(N1, lleno1 * 0.92)); el.m1.style.fill = mezcla(color);
  el.m2.setAttribute('d', banda(N2, lleno2)); el.m2.style.fill = mezcla(1);
  // las burbujas de la fermentación, subiendo por el tubo de nivel
  let bb = '';
  if (paso === 4) for (let i = 0; i < 7; i++) { const g = ((reloj * 0.35 + i / 7) % 1), z = N2.z0 + (N2.z1 - N2.z0) * lleno2 * g, o = Math.sin(i * 2.3) * 0.35; const p = at([N2.x + ux * o, N2.y + uy * o, z]); bb += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r=".55" class="burbuja"/>'; }
  el.b2.innerHTML = bb;
  // la válvula del sangrado: la palanca gira y corre el mosto por el tubo
  const abre = paso === 3 ? sm(f / 0.2) * (1 - sm((f - 0.85) / 0.15)) : 0, ga = Math.PI / 2 * (1 - abre);
  const nx = Math.cos(VAL.a), ny = Math.sin(VAL.a), cx = VAL.x + nx * 4.2, cy = VAL.y + ny * 4.2;
  const pc = [cx - ny * Math.cos(ga) * 5, cy + nx * Math.cos(ga) * 5, VAL.z + 2.2 + Math.sin(ga) * 5], pp = at(pc);
  el.palanca.setAttribute('d', linea([[cx, cy, VAL.z + 2.2], pc]));
  el.pomo.setAttribute('cx', pp[0].toFixed(1)); el.pomo.setAttribute('cy', pp[1].toFixed(1));   // (el pomo de la palanca: su punta no queda en el aire)
  el.flujo.style.opacity = abre.toFixed(2);
  // el termómetro: 16 °C al fermentar (si no, la bodega a 22)
  const t = paso >= 4 ? 16 : 22, a = Math.PI * 1.25 - (t / 40) * Math.PI * 1.5, tnx = Math.cos(TER.a), tny = Math.sin(TER.a), x = TQ2.x + tnx * (TQ2.R + 1.8), y = TQ2.y + tny * (TQ2.R + 1.8);
  el.aguja.setAttribute('d', linea([[x, y, TER.z], [x - tny * Math.cos(a) * (TER.r - 1), y + tnx * Math.cos(a) * (TER.r - 1), TER.z + Math.sin(a) * (TER.r - 1)]]));
  // lo que trabaja en cada paso
  ilumina(el.uva, paso === 0); ilumina([...maquina, el.sinfin, el.raspon], paso === 1); ilumina(el.tq1, paso === 2); ilumina([el.valvula, el.tubo2], paso === 3);
  ilumina([el.tq2, el.camisa, el.termo], paso === 4); ilumina(el.botellas, paso === 5);
  el.sinfin.classList.toggle('gira', paso === 1);
  const extra = ['garnacha, de septiembre a octubre', 'fuera el raspón', 'unas horas: la piel da el color', 'el mosto rosado, a otro depósito', 'a unos 16 °C, unas dos semanas', 'rosado de Navarra'][paso];
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
${PUENTE}
`;

const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--vidrio:#2a1c46;--interior:#0d0718;--baya:#5b2d6e}
.iso[data-theme="light"]{--vidrio:#efe9f7;--interior:#e2dcee;--baya:#8e5aa6}
.vidrio{fill:var(--vidrio)}.interior{fill:var(--interior)}.mosto{transition:fill .3s}
.burbuja{fill:#fff;opacity:.85}
.baya .iso-top,.baya .iso-fill{fill:var(--baya)}
.flujo{stroke-dasharray:1.4 2;animation:corre .45s linear infinite;stroke-width:1.1}
.sinfin.gira{stroke-dasharray:2 1.2;animation:corre .5s linear infinite}
@keyframes corre{to{stroke-dashoffset:-3.4}}
@media (prefers-reduced-motion:reduce){.flujo,.sinfin.gira{animation:none}}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .tb-edge{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
`;

const body = k.plateHtml({
  fig: 'Lámina 3',
  title: 'Cómo se hace el rosado',
  hint: 'Pasa el ratón: paso a paso',
  readout: '1 · Vendimiar · garnacha',
  keys: [
    { mark: 'lit', label: 'La pieza que trabaja en cada paso: caja, estrujadora, depósitos, válvula y botellas' },
    { mark: 'raised', label: 'El tubo de nivel: el mosto pasa del amarillo pálido al rosa mientras macera con la piel' },
    { mark: 'flat', label: 'Sangrado: el mosto rosado se separa de la piel y fermenta aparte, a unos 16 °C' },
  ],
  caption: 'Navarra es famosa por su rosado de garnacha. Se vendimia, la despalilladora separa el raspón y estruja la uva, y el mosto macera unas horas con la piel, que le da el color. Entonces se sangra: el mosto rosado se separa de la piel y fermenta aparte, a unos 16 °C, unas dos semanas, mientras las levaduras convierten el azúcar en alcohol. Después se embotella.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="El rosado, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="6">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Cómo se hace el rosado', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('vino', html, theme);
