// Lámina isométrica interactiva del espárrago blanco de Navarra (skill Anatomy, 21 de noviembre de 2026; el autor: «la
// elaboración de diferentes alimentos [...] la recogida del espárrago»). Una maqueta de huerta sobre su tablero: el
// caballón cortado a lo largo, con el plástico negro encima, las garras con sus raíces y los turiones blancos creciendo a
// oscuras dentro de la tierra; la gubia, la paleta, la caja de recogida, la balsa de agua fría con su termómetro, el
// calibrador y las latas. Al recorrerla se ve paso a paso, y en cada paso se ilumina la pieza que trabaja: el turión crece
// hasta agrietar la tierra, la gubia baja a su lado y lo corta junto a la garra, sale entero, el hoyo se rellena, y el
// espárrago se enfría en agua, se clasifica por grosor y se envasa.
// Uso: node tools/anatomia/esparrago.mjs [--light]  →  entrega/anatomia/esparrago(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe, PUENTE } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 340;

// ---------- el modelo (centímetros de la maqueta) ----------
// el caballón va a lo largo de x; se ha quitado la mitad de delante (y > YC) y se ve el corte, el plano y = YC
const CAB = { x0: -118, x1: -4, yc: -18, H: 34, alto: 9, base: 24 };   // alto: medio ancho arriba; base: medio ancho abajo
const ZB = 7.6;                                                        // donde nace el turión, encima de la garra
const GARRAS = [-104, -78, -52, -26];                                  // la segunda es la del turión que se corta
const XS = GARRAS[1];
const CAJA = { x: -116, y: 8, w: 30, d: 16, h: 8 };
const BALSA = { x: 10, y: -44, w: 44, d: 28, h: 20 };
const CALI = { x: 56, y: 4, w: 28, d: 12 };
const LATAS = { x: 84, y: 26, n: 4, paso: 11, r: 4.4, h: 10 };
const PALETA = { x: -44, y: 24 };
const GUBIA = { tip: [-88, 36, 0.9], dir: [1, 0, 0], hoja: 26, mango: 14 };   // en reposo, tumbada en el tablero
const PASOS = ['El caballón', 'Asoma la punta', 'Cortar con la gubia', 'Tapar el hoyo', 'Enfriar', 'Envasar'];

// ---------- la cámara ----------
const PLATE = { x: -130, y: -50, w: 260, d: 104, r: 7 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [CAB.x0, CAB.yc, CAB.H + 6], [XS + 30, CAB.yc, CAB.H + 31]], WIDTH, HEIGHT, { pad: 10, azimuth: 64, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const corte = (x, z) => [x, CAB.yc, z];                  // un punto del corte del caballón
const FZ = (x, y, z = 0) => G.frameAlong([x, y, z], [0, 0, 1]);
const FX = (x, y, z) => G.frameAlong([x, y, z], [1, 0, 0]);

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
  const regla = { x: -116, y: 42, w: 160, d: 5.5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.6, 0.6, [1.6, 3], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.8, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.8, 0.6])], { size: 0.45 }));
  const placa = { x: 54, y: 41, w: 66, d: 7.5, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 5, placa.y + 4.4], 0.8, P, 'x'), 'ESPÁRRAGO DE NAVARRA', { size: 2.4, tone: 'mid' }));
  out.push(D([at([placa.x + 2.2, placa.y + 3.75, 0.8]), at([placa.x + placa.w - 2.2, placa.y + 3.75, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- el caballón: la mitad de atrás, con su plástico negro, y el corte con lo que hay dentro ----------
const turionPts = (x, top, ancho = 1.2, z0 = ZB) => [corte(x - ancho, z0), corte(x - ancho, top - 3), corte(x - ancho * 0.7, top - 1.1), corte(x, top), corte(x + ancho * 0.7, top - 1.1), corte(x + ancho, top - 3), corte(x + ancho, z0)];
function caballon() {
  const out = [], { x0, x1, yc, H, alto, base } = CAB, Lg = x1 - x0;
  const F = G.frameOf([x0, yc, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  out.push(`<g data-part="caballon">${S(G.prismOf(F, [[0, 0], [0, H], [-alto, H], [-base, 0]], 0, Lg, P), { tone: 'mid', className: 'monte' })}`);
  // el plástico negro por encima, que da calor y oscuridad (por eso el espárrago sale blanco)
  out.push(S(G.prismOf(F, [[0, H], [0, H + 0.7], [-alto - 0.3, H + 0.7], [-base - 0.4, 0.2], [-base, 0], [-alto, H]], 1.5, Lg - 1.5, P), { tone: 'lo', className: 'plastico' }) + '</g>');
  // el corte: la tierra, sus vetas y sus piedrecitas
  const cara = [corte(x0, 0), corte(x1, 0), corte(x1, H), corte(x0, H)];
  out.push(`<path class="tierra" d="${poly(cara)}"/>`);
  let vetas = '';
  for (const [z, a, fase] of [[4.5, 0.5, 0], [11, 0.7, 1.3], [17.5, 0.6, 2.1], [22.5, 0.45, 0.4]]) {
    const pts = []; for (let x = x0; x <= x1 + 0.01; x += 3) pts.push(corte(Math.min(x, x1), z + Math.sin(x * 0.11 + fase) * a));
    pts[pts.length - 1] = corte(x1, pts[pts.length - 1][2]); vetas += linea(pts);
  }
  out.push(L(vetas, { tone: 'faint' }));
  const piedras = []; for (let i = 0; i < 46; i++) { const u = (i * 0.618 + 0.07) % 1, v = (i * 0.414 + 0.21) % 1; piedras.push(at(corte(x0 + 2 + u * (Lg - 4), 1 + v * (H - 3)))); }
  out.push(D(piedras, { size: 0.35, tone: 'lo' }));
  // las garras (la planta que vive años bajo tierra), con sus raíces carnosas
  for (const gx of GARRAS) {
    const cuerpo = []; for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; cuerpo.push(corte(gx + Math.cos(a) * 4.8, 6 + Math.sin(a) * 1.8)); }
    out.push(`<path class="garra" d="${poly(cuerpo)}"/>`, L(poly(cuerpo), { tone: 'mid' }));
    let raices = ''; const puntas = [];
    for (let j = 0; j < 7; j++) {
      const a = Math.PI * (1.08 + j * 0.14), r0x = gx + Math.cos(a) * 4.2, r0z = 6 + Math.sin(a) * 1.6;
      const llega = 3.5 + (j % 3) * 1.4, ex = r0x + Math.cos(a) * llega * 1.6, ez = Math.max(0, r0z + Math.sin(a) * llega);
      raices += linea([corte(r0x, r0z), corte((r0x + ex) / 2 + 0.6, (r0z + ez) / 2), corte(ex, ez)]);
      if (ez > 0.05) puntas.push(at(corte(ex, ez)));
    }
    out.push(L(raices, { tone: 'lo' }), D(puntas, { size: 0.4, tone: 'lo' }));
  }
  // los turiones que no se cortan ahora: uno creciendo, uno a punto de salir y el tocón de uno ya cortado
  for (const [gx, top] of [[GARRAS[0], 19], [GARRAS[2], 32]]) out.push(`<path class="turion" d="${poly(turionPts(gx, top))}"/>`, L(poly(turionPts(gx, top)), { tone: 'hi' }));
  const toc = [corte(GARRAS[3] - 1.2, ZB), corte(GARRAS[3] - 1.2, ZB + 2.6), corte(GARRAS[3] + 1.2, ZB + 2.6), corte(GARRAS[3] + 1.2, ZB)];
  out.push(`<path class="turion" d="${poly(toc)}"/>`, L(poly(toc), { tone: 'mid' }));
  // el turión de la garra de la gubia (vivo), su hoyo (vivo) y la grieta de la superficie (viva)
  out.push(`<path data-part="hoyo" class="hueco" d=""/>`);
  out.push(`<g data-part="turion"><path data-part="turion-f" class="turion" d=""/><path data-part="turion-l" class="iso-line" data-tone="hi" d=""/></g>`);
  out.push(L(poly(cara), { tone: 'mid' }));
  out.push(`<path data-part="grieta" class="iso-line" data-tone="mid" d="${linea([corte(XS - 5, H), corte(XS + 5, H)])}"/>`);
  return out.join('');
}

// ---------- la caja de recogida, con los espárragos tumbados (y el que se acaba de cortar, vivo) ----------
const espTumbado = (x, y, z, largo, cls = 'esparrago') => S(G.solidOf([[0, 0.5], [0.5, 1.05], [largo - 2.4, 1.05], [largo - 1, 0.8], [largo, 0.25]], FX(x, y, z), P), { tone: 'hi', className: cls });
function caja() {
  const out = [], { x, y, w, d, h } = CAJA;
  out.push(S(k.slabOf({ x, y, w, d, r: 0.6 }, 0, h, P, 2, 0.3), { tone: 'mid', className: 'caja' }));
  out.push(L([2.7, 5.4].map((z) => k.sideSeam({ x, y, w, d, r: 0.6 }, z, P, 2)).join(''), { tone: 'lo' }));
  const filas = [];
  for (let i = 0; i < 6; i++) filas.push([x + 3 + (i % 2) * 1.5, y + 2.6 + i * 2.2, h + 1.1 + (i % 2) * 0.3]);
  filas.sort((a, b) => dep(a) - dep(b));
  out.push(filas.map(([px, py, pz]) => espTumbado(px, py, pz, 22)).join(''));
  out.push(`<g data-part="cosechado" style="opacity:0">${espTumbado(x + 4, y + d - 1.4, h + 1.6, 22)}</g>`);
  return `<g data-part="caja">${out.join('')}</g>`;
}

// ---------- la paleta para tapar el hoyo ----------
function paleta() {
  const { x, y } = PALETA, out = [];
  out.push(S(k.slabOf({ x, y, w: 11, d: 7, r: 2.4 }, 0, 0.5, P, 4), { tone: 'mid', className: 'paleta' }));
  out.push(S(G.solidOf([[0, 0.5], [1.5, 0.9], [8, 1.1], [8.6, 0.6]], FX(x + 11, y + 3.5, 1.1), P), { tone: 'mid' }));
  out.push(D([at([x + 11.4, y + 3.5, 0.5])], { size: 0.45, tone: 'lo' }));
  return `<g data-part="paleta">${out.join('')}</g>`;
}

// ---------- la balsa de agua fría, con su termómetro ----------
const TER = { x: BALSA.x + BALSA.w - 10, y: BALSA.y + BALSA.d, z: 10, r: 4 };
function balsa() {
  const out = [], { x, y, w, d, h } = BALSA;
  out.push(S(k.slabOf({ x, y, w, d, r: 1.4 }, 0, h, P, 4, 0.6), { tone: 'mid', className: 'balsa' }));
  out.push(L([6, 13].map((z) => k.sideSeam({ x, y, w, d, r: 1.4 }, z, P, 4)).join(''), { tone: 'lo' }));
  const ag = { x: x + 3, y: y + 3, w: w - 6, d: d - 6 };
  const agua = [[ag.x, ag.y, h], [ag.x + ag.w, ag.y, h], [ag.x + ag.w, ag.y + ag.d, h], [ag.x, ag.y + ag.d, h]];
  out.push(`<path class="agua" d="${poly(agua)}"/>`);
  out.push(`<g data-part="ondas"></g>`);
  const flotan = []; for (let i = 0; i < 5; i++) flotan.push([ag.x + 4 + (i % 2) * 6, ag.y + 3 + i * 4.4, h + 0.2]);
  flotan.sort((a, b) => dep(a) - dep(b));
  out.push(flotan.map(([px, py, pz]) => espTumbado(px, py, pz, 20)).join(''));
  out.push(L(poly(agua), { tone: 'mid' }));
  // el termómetro de esfera en la cara de delante
  const F = G.frameAlong([TER.x, TER.y, TER.z], [0, 1, 0]);
  let mn = '';
  for (let i = 0; i <= 10; i++) { const a = Math.PI * 1.25 - i * Math.PI * 0.15, r1 = TER.r - (i % 5 ? 0.9 : 1.5), f = (r) => [TER.x + Math.cos(a) * r, TER.y + 1.65, TER.z + Math.sin(a) * r]; mn += linea([f(TER.r - 0.4), f(r1)]); }
  out.push(`<g data-part="termo">${S(G.disc(0, 1.2, TER.r + 0.8, F, P), { tone: 'mid' })}${S(G.disc(1.2, 1.6, TER.r, F, P), { tone: 'hi', className: 'termo' })}${L(mn, { tone: 'lo' })}<path data-part="aguja" class="iso-line" data-tone="hi" style="stroke-width:1" d=""/>${D([at([TER.x, TER.y + 1.7, TER.z])], { size: 0.5, tone: 'hi' })}</g>`);
  return `<g data-part="balsa">${out.join('')}</g>`;
}

// ---------- el calibrador: una regleta con agujeros de cada grosor ----------
function calibrador() {
  const { x, y, w, d } = CALI, out = [];
  out.push(S(k.slabOf({ x, y, w, d, r: 1 }, 0, 1.6, P, 3, 0.3), { tone: 'mid', className: 'cali' }));
  const radios = [1.0, 1.4, 1.8, 2.3];
  radios.forEach((r, i) => { const cx = x + 4.5 + i * 6.2, cy = y + d / 2; out.push(`<path class="hueco" d="${k.ring(cx, cy, r, 1.6, P, 24)}"/>`, L(k.ring(cx, cy, r, 1.6, P, 24), { tone: 'mid' })); });
  out.push(D([at([x + 1.6, y + 1.6, 1.6]), at([x + w - 1.6, y + 1.6, 1.6]), at([x + 1.6, y + d - 1.6, 1.6]), at([x + w - 1.6, y + d - 1.6, 1.6])], { size: 0.4 }));
  return `<g data-part="cali">${out.join('')}</g>`;
}

// ---------- las latas de conserva ----------
function latas() {
  const out = [], base = { x: LATAS.x - 6.5, y: LATAS.y - 6.5, w: LATAS.n * LATAS.paso + 2, d: 13, r: 0.8 };
  out.push(S(k.slabOf(base, 0, 1.6, P, 2, 0.3), { tone: 'lo' }));
  const lista = Array.from({ length: LATAS.n }, (_, i) => [LATAS.x + i * LATAS.paso, LATAS.y]).sort((a, b) => dep([a[0], a[1], 0]) - dep([b[0], b[1], 0]));
  for (const [x, y] of lista) {
    const F = FZ(x, y, 1.6);
    out.push(S(G.solidOf([[0, LATAS.r - 0.3], [0.6, LATAS.r], [LATAS.h - 0.6, LATAS.r], [LATAS.h, LATAS.r - 0.3]], F, P), { tone: 'hi', className: 'lata' }));
    out.push(L(G.arcOf(F, 2.6, LATAS.r + 0.02, P) + G.arcOf(F, LATAS.h - 2.6, LATAS.r + 0.02, P), { tone: 'lo' }));
    out.push(L(k.ring(x, y, LATAS.r - 1.1, 1.6 + LATAS.h, P, 28), { tone: 'lo' }));
  }
  return `<g data-part="latas">${out.join('')}</g>`;
}

// ---------- la gubia (viva: se dibuja en la página) ----------
const gubiaSvg = `<g data-part="gubia"><path data-part="hoja" class="iso-line" data-tone="mid" style="stroke-width:1.1;stroke-linecap:round" d=""/><path data-part="mango" class="iso-line gubia-mango" data-tone="mid" style="stroke-width:2.6;stroke-linecap:round" d=""/><g class="iso-dots" data-tone="mid"><circle data-part="punta" r="0.7"/><circle data-part="pomo" r="1.3"/></g></g>`;

// ---------- la figura ----------
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta de una huerta de espárrago blanco: el caballón de tierra cortado a lo largo, con el plástico negro encima, las garras con sus raíces y los turiones blancos creciendo a oscuras; la gubia y la paleta, la caja de recogida, la balsa de agua fría con su termómetro, el calibrador de grosores y las latas de conserva. Paso a paso, el turión agrieta la tierra, la gubia lo corta junto a la garra, se tapa el hoyo y el espárrago se enfría, se clasifica y se envasa.',
  body: [tablero(), balsa(), caballon(), calibrador(), caja(), paleta(), latas(), gubiaSvg],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, CAB = ${JSON.stringify(CAB)}, ZB = ${ZB}, XS = ${XS}, BALSA = ${JSON.stringify(BALSA)}, TER = ${JSON.stringify(TER)}, GUBIA = ${JSON.stringify(GUBIA)};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L'), poly = (pts) => linea(pts) + 'Z';
const corte = (x, z) => [x, CAB.yc, z];
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = { tf: $('turion-f'), tl: $('turion-l'), turion: $('turion'), hoyo: $('hoyo'), grieta: $('grieta'), hoja: $('hoja'), mango: $('mango'), punta: $('punta'), pomo: $('pomo'),
  gubia: $('gubia'), caballon: $('caballon'), cosechado: $('cosechado'), caja: $('caja'), paleta: $('paleta'), balsa: $('balsa'), ondas: $('ondas'), aguja: $('aguja'), cali: $('cali'), latas: $('latas') };
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t, lerp3 = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
const turionPts = (x, top, z0, ancho = 1.2) => [corte(x - ancho, z0), corte(x - ancho, top - 3), corte(x - ancho * 0.7, top - 1.1), corte(x, top), corte(x + ancho * 0.7, top - 1.1), corte(x + ancho, top - 3), corte(x + ancho, z0)];
// (la gubia: su punta y hacia dónde apunta el mango; tumbada, lista encima del caballón, clavada junto al turión)
const POSES = { reposo: { tip: GUBIA.tip, dir: GUBIA.dir }, lista: { tip: [XS + 2.4, CAB.yc + 0.4, CAB.H + 1.5], dir: [0.7, 0, 0.71] }, dentro: { tip: [XS + 1.7, CAB.yc + 0.4, ZB + 0.6], dir: [0.1, 0, 1] } };
const pose = (a, b, t) => { const d = lerp3(a.dir, b.dir, t), n = Math.hypot(...d); return { tip: lerp3(a.tip, b.tip, t), dir: d.map((v) => v / n) }; };
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0;
const tourAt = (t) => { const T = 2.8 * N + 2, f = (t % T) / T * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s)), H = CAB.H;
  // el turión crece hasta agrietar la tierra; luego sale entero hacia arriba y se va a la caja
  const largo = lerp(H - 11 - ZB, H + 1.4 - ZB, sm((s - 0.85) / 0.8)), sale = sm((s - 2.82) / 0.22);
  const top = ZB + largo + sale * 26, z0 = ZB + 0.2 + sale * 26;
  const tp = poly(turionPts(XS, top, z0));
  el.tf.setAttribute('d', tp); el.tl.setAttribute('d', tp); el.turion.style.opacity = (1 - sale).toFixed(2);
  // la grieta: la tierra se levanta encima de la punta (y se alisa al tapar)
  const g = sm((s - 1.3) / 0.45) * (1 - sm((s - 3.35) / 0.5));
  el.grieta.setAttribute('d', linea([corte(XS - 5, H), corte(XS - 2, H + 0.9 * g), corte(XS - 0.4, H + 1.6 * g), corte(XS + 0.5, H + 0.5 * g), corte(XS + 1.4, H + 1.3 * g), corte(XS + 5, H)]));
  // el hoyo que deja: se ve al sacarlo y se rellena desde abajo con la paleta
  const hv = sm((s - 2.86) / 0.12), fondo = lerp(ZB, H, sm((s - 3.2) / 0.62));
  el.hoyo.setAttribute('d', hv > 0.01 && fondo < H - 0.05 ? poly([corte(XS - 1.7, fondo), corte(XS + 1.7, fondo), corte(XS + 1.9, H), corte(XS - 1.9, H)]) : '');
  el.hoyo.style.opacity = hv.toFixed(2);
  el.cosechado.style.opacity = sm((s - 2.95) / 0.2).toFixed(2);
  // la gubia: de tumbada a lista, baja junto al turión, corta y vuelve a su sitio
  let q;
  if (s < 2.05 || s >= 3.35) q = POSES.reposo;
  else if (s < 2.35) q = pose(POSES.reposo, POSES.lista, sm((s - 2.05) / 0.3));
  else if (s < 2.7) q = pose(POSES.lista, POSES.dentro, sm((s - 2.35) / 0.35));
  else if (s < 2.85) q = POSES.dentro;
  else if (s < 3.05) q = pose(POSES.dentro, POSES.lista, sm((s - 2.85) / 0.2));
  else q = pose(POSES.lista, POSES.reposo, sm((s - 3.05) / 0.3));
  const fin = (l) => q.tip.map((v, i) => v + q.dir[i] * l), cuello = fin(GUBIA.hoja), pomo = fin(GUBIA.hoja + GUBIA.mango);
  el.hoja.setAttribute('d', linea([q.tip, cuello])); el.mango.setAttribute('d', linea([cuello, pomo]));
  const a = at(q.tip), b = at(pomo); el.punta.setAttribute('cx', a[0].toFixed(1)); el.punta.setAttribute('cy', a[1].toFixed(1)); el.pomo.setAttribute('cx', b[0].toFixed(1)); el.pomo.setAttribute('cy', b[1].toFixed(1));
  // la balsa: ondas en el agua al enfriar, y el termómetro a 2 °C (si no, el agua del pozo, a 14)
  let on = '';
  if (paso === 4) for (let i = 0; i < 3; i++) { const f = (reloj * 0.4 + i / 3) % 1, r = 1 + f * 7, cx = BALSA.x + 14 + i * 7, cy = BALSA.y + 9 + i * 5, pts = []; for (let j = 0; j < 24; j++) { const t = j / 24 * Math.PI * 2; pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r * 0.8, BALSA.h + 0.1]); } on += '<path class="onda" style="opacity:' + (1 - f).toFixed(2) + '" d="' + poly(pts) + '"/>'; }
  el.ondas.innerHTML = on;
  const t = paso >= 4 ? 2 : 14, an = Math.PI * 1.25 - (t / 20) * Math.PI * 1.5;
  el.aguja.setAttribute('d', linea([[TER.x, TER.y + 1.8, TER.z], [TER.x + Math.cos(an) * (TER.r - 1), TER.y + 1.8, TER.z + Math.sin(an) * (TER.r - 1)]]));
  // lo que trabaja en cada paso
  ilumina(el.caballon, paso === 0); ilumina(el.turion, paso === 1); ilumina(el.grieta, paso === 1 || paso === 3); ilumina(el.gubia, paso === 2); ilumina(el.paleta, paso === 3);
  ilumina([el.caja, el.balsa], paso === 4); ilumina([el.cali, el.latas], paso === 5);
  const extra = ['crece a oscuras: sale blanco', 'agrieta la tierra al amanecer', 'a unos 22 cm, sin tocar la garra', 'que el siguiente salga blanco', 'en agua fría, el mismo día', 'pelado, por grosores, en lata'][paso];
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
.iso{--tierra:#2b1a22;--garra:#4a2c3a;--turion:#efe6f6;--hueco:#0d0718;--agua:#1f2a52;--onda:#9fb4ff}
.iso[data-theme="light"]{--tierra:#d9c7bd;--garra:#b48f8a;--turion:#ffffff;--hueco:#8c7a86;--agua:#cfe0f7;--onda:#4b6fd1}
.tierra{fill:var(--tierra)}.garra{fill:var(--garra)}.turion{fill:var(--turion)}.hueco{fill:var(--hueco)}.agua{fill:var(--agua)}
.onda{fill:none;stroke:var(--onda);stroke-width:.5}
.esparrago .iso-top,.esparrago .iso-fill{fill:var(--turion)}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line,[data-lit] .tb-edge{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
`;

const body = k.plateHtml({
  fig: 'Lámina 4',
  title: 'Cómo se recoge el espárrago',
  hint: 'Pasa el ratón: paso a paso',
  readout: '1 · El caballón',
  keys: [
    { mark: 'lit', label: 'La pieza que trabaja en cada paso: caballón, turión, gubia, paleta, balsa y latas' },
    { mark: 'raised', label: 'El corte del caballón: las garras con sus raíces y los turiones blancos, a oscuras bajo la tierra' },
    { mark: 'flat', label: 'La gubia baja junto al turión y lo corta a unos 22 cm, sin tocar la garra' },
  ],
  caption: 'El espárrago blanco de Navarra crece dentro de un caballón de tierra, a oscuras, y por eso es blanco. Se recoge en primavera, a primera hora: cuando la punta agrieta la tierra, se clava la gubia junto a él y se corta a unos 22 cm, sin dañar la garra, que seguirá echando turiones. Se tapa el hoyo para que el siguiente salga blanco. Ese mismo día se enfría en agua fría; luego se pela, se clasifica por grosor, se cuece y se envasa.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="El espárrago, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="6">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Cómo se recoge el espárrago', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('esparrago', html, theme);
