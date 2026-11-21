// Lámina isométrica interactiva de la sidra (skill Anatomy, 21 de noviembre de 2026; para la cosecha de manzanas de
// Irurtzun: «Con las manzanas se hace sidra y compota»). Una maqueta de sagardotegi sobre su tablero: la caja de
// manzanas, la trituradora con su tolva y su manivela, el cubo de la pulpa, el dolare (la prensa de viga: la viga gira
// sobre su eje entre dos pies derechos, el husillo la baja y acaba levantando la piedra, que cuelga y aprieta la torta de
// pulpa), la pila donde cae el mosto, la manguera hasta la kupela, la kupela tumbada en sus calzos con sus aros y su
// txotx, el vaso y las botellas.
// Lo que es verdad: la torta se aplasta lo que baja la viga sobre los tacos (la viga toca el primero por su canto); de
// 100 kilos de manzana salen unos 65 litros de mosto; fermenta en la kupela todo el invierno hasta unos 6 grados; de
// enero a abril se abre el txotx y el chorro cae al vaso desde lejos, en parábola, para que la sidra se airee.
// Uso: node tools/anatomia/sidra.mjs [--light]  →  entrega/anatomia/sidra(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import * as T from '../../.claude/skills/anatomy/kit/tube.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 340;

// ---------- el modelo (centímetros de la maqueta) ----------
// el dolare: la viga gira en XP,PZ; su ángulo PHI va de TH (la punta arriba, la pulpa suelta) a 0 (horizontal, apretada)
const VIGA = { XP: -124, PZ: 34, HH: 4.5, HW: 4, YB: -30, d0: -4, d1: 104, TH: 14 * Math.PI / 180, NB: 14 };
const POSTE = { x: -124, ys: [-39, -21], a: 5, h: 46 };
const CAMA = { x: -114, y: -44, w: 42, d: 28, h: 8 };               // la cama de piedra donde va la torta
const TORTA = { x: -106, y: -41, w: 26, d: 22 };                     // la torta de pulpa (su alto, vivo)
const TABLA = 2.4, TACO = { h: 5, w: 6, xs: [-102, -90] };           // la tabla y los dos tacos de encima
const HUS = { x: -30, r: 2, largo: 61 };                             // el husillo, de la piedra para arriba
const PIEDRA = { r: 10, h: 11, alza: 4 };
const PILA = { x: -101, y: -10, w: 16, d: 10, h: 6.5 };             // la pila de piedra (el mosto, vivo)
const KUP = { x0: 6, x1: 62, y: -24, z: 25.2 };                     // la kupela tumbada a lo largo de x
const PERFIL_K = [[0, 16.8], [2.5, 17.6], [10, 18.4], [28, 18.9], [46, 18.4], [53.5, 17.6], [56, 16.8]];
const TXOTX = { z: KUP.z - 11 };
const VASO = { x: 92, y: KUP.y, h: 8.5, r0: 2.0, r1: 2.9 };
const TRIT = { x: -110, y: 18, w: 22, d: 16, pata: 10, h: 12 };     // la trituradora
const CUBO = { x: -78, y: 28, r: 6.5, h: 9 };
const CAJA = { x: -142, y: 20, w: 22, d: 16, h: 9 };
const BOT = { x: 104, y: 32, n: 4, paso: 8.6 };
const MESA = { x: 132, y: 2, h: 24 };                               // la kupela de pie que hace de mesa
const PASOS = ['Recoger la manzana', 'Triturar', 'Prensar en el dolare', 'Fermentar en la kupela', '¡Txotx!', 'Embotellar'];

// ---------- la cámara ----------
const PLATE = { x: -150, y: -52, w: 300, d: 106, r: 7 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [HUS.x, VIGA.YB, HUS.largo + PIEDRA.h + PIEDRA.alza + 1], [-128, VIGA.YB, 50]], WIDTH, HEIGHT, { pad: 10, azimuth: 64, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const FZ = (x, y, z = 0) => G.frameAlong([x, y, z], [0, 0, 1]);
const porDep = (pts) => [...pts].sort((a, b) => dep([a[0], a[1], a[2] || 0]) - dep([b[0], b[1], b[2] || 0]));
const circulo = (cx, cy, r, z, n = 36) => Array.from({ length: n }, (_, i) => { const a = i / n * 2 * Math.PI; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]; });

// ---------- el tablero ----------
function tablero() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -14, 12, P)}"/>`];
  for (const [x, y] of porDep(k.corners(PLATE, 20))) {
    out.push(S(k.cylinder(x, y, 6.4, -14, 1.6, P, 28), { tone: 'lo' }));
    out.push(S(k.cylinder(x, y, 5, -12.4, 4.4, P, 28), { tone: 'mid' }));
  }
  out.push(S(k.slabOf(PLATE, -8, 8, P, 8, 1.6), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 4), 0, P), { tone: 'lo' }));
  const tornillos = k.corners(PLATE, 8.5);
  out.push(L(tornillos.map(([x, y]) => k.ring(x, y, 1.8, 0, P, 16)).join(''), { tone: 'lo' }));
  out.push(D(tornillos.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const regla = { x: -64, y: 43, w: 120, d: 5.5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.05, 0.6, [1.8, regla.d - 0.1], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  const placa = { x: -140, y: 41.5, w: 60, d: 7.5, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 5, placa.y + 4.4], 0.8, P, 'x'), 'SAGARDOA · IRURTZUN', { size: 2.4, tone: 'mid' }));
  out.push(D([at([placa.x + 2.2, placa.y + 3.75, 0.8]), at([placa.x + placa.w - 2.2, placa.y + 3.75, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- el dolare ----------
// un pie derecho: el poste con su zapata y la clavija de la viga
function poste(y) {
  const { x, a, h } = POSTE, out = [];
  out.push(S(k.slabOf({ x: x - a / 2 - 1.5, y: y - a / 2 - 1.5, w: a + 3, d: a + 3, r: 0.4 }, 0, 2.4, P, 2, 0.3), { tone: 'lo' }));
  out.push(S(k.slabOf({ x: x - a / 2, y: y - a / 2, w: a, d: a, r: 0.3 }, 2.4, h - 2.4, P, 2, 0.4), { tone: 'mid', className: 'madera' }));
  out.push(L(k.sideSeam({ x: x - a / 2, y: y - a / 2, w: a, d: a, r: 0.3 }, 12, P, 2), { tone: 'lo' }));
  return out.join('');
}
function cama() {
  const { x, y, w, d, h } = CAMA, out = [];
  out.push(S(k.slabOf({ x, y, w, d, r: 1 }, 0, h, P, 3, 0.6), { tone: 'mid', className: 'piedra' }));
  out.push(L(k.planOutline(k.insetPlan({ x, y, w, d, r: 1 }, 2), h, P, 3), { tone: 'lo' }));   // (el reborde)
  out.push(L(k.sideSeam({ x, y, w, d, r: 1 }, 3.5, P, 3), { tone: 'lo' }));
  // el pico por donde cae el mosto a la pila: un canal en cuesta hacia delante
  const px = TORTA.x + TORTA.w / 2;
  out.push(S(G.prismOf(G.frameOf([px - 1.6, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]), [[y + d - 0.5, h - 1.4], [PILA.y + 2.6, h - 2.2], [PILA.y + 2.6, h - 0.8], [y + d - 0.5, h]], 0, 3.2, P), { tone: 'mid', className: 'piedra' }));
  return out.join('');
}
// la viga en el ángulo phi (prismas del kit; en la página solo se elige cuál se ve)
const enViga = (phi, d, e) => [VIGA.XP + d * Math.cos(phi) - e * Math.sin(phi), VIGA.PZ + d * Math.sin(phi) + e * Math.cos(phi)];
const dHusillo = (phi) => (HUS.x - VIGA.XP - VIGA.HH * Math.sin(phi)) / Math.cos(phi);
function viga(phi) {
  const { HH, HW, YB, d0, d1 } = VIGA, out = [];
  const F = G.frameOf([0, YB, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const caja = (da, db, ea, eb) => [enViga(phi, da, ea), enViga(phi, db, ea), enViga(phi, db, eb), enViga(phi, da, eb)];
  out.push(S(G.prismOf(F, caja(d0, d1, -HH, HH), -HW, HW, P), { tone: 'hi', className: 'madera' }));
  // la veta: dos rayas de punta a punta en la cara de delante
  const yF = YB + HW + 0.02;
  out.push(L([-1.6, 1.4].map((e) => { const a = enViga(phi, d0, e), b = enViga(phi, d1, e); return linea([[a[0], yF, a[1]], [b[0], yF, b[1]]]); }).join(''), { tone: 'lo' }));
  // los dos flejes de hierro y la tuerca del husillo encima
  for (const dd of [6, 70]) out.push(S(G.prismOf(F, caja(dd, dd + 2.2, -HH - 0.35, HH + 0.35), -HW - 0.35, HW + 0.35, P), { tone: 'mid', className: 'hierro' }));
  const ds = dHusillo(phi);
  out.push(S(G.prismOf(F, caja(ds - 5, ds + 5, HH, HH + 4), -5, 5, P), { tone: 'mid', className: 'madera' }));
  return out.join('');
}
// la cruceta de encima de los postes
function cruceta() {
  const { x, ys, a, h } = POSTE;
  return S(k.slabOf({ x: x - a / 2 - 0.5, y: ys[0] - a / 2 - 0.5, w: a + 1, d: ys[1] - ys[0] + a + 1, r: 0.4 }, h, 3.6, P, 2, 0.4), { tone: 'mid', className: 'madera' });
}

// ---------- la pila del mosto (con el mosto vivo, recortado a su boca) ----------
function pila() {
  const { x, y, w, d, h } = PILA, out = [], b = 1.4;
  out.push(S(k.slabOf({ x, y, w, d, r: 0.8 }, 0, h, P, 3, 0.5), { tone: 'mid', className: 'piedra' }));
  const boca = poly([[x + b, y + b, h], [x + w - b, y + b, h], [x + w - b, y + d - b, h], [x + b, y + d - b, h]]);
  out.push(`<clipPath id="boca-pila"><path d="${boca}"/></clipPath><path class="interior" d="${boca}"/><g clip-path="url(#boca-pila)"><path data-part="mosto" class="mosto" d=""/></g>`);
  out.push(L(boca, { tone: 'mid' }));
  return out.join('');
}

// ---------- un aro de hierro ceñido a un cuerpo torneado: solo la mitad que se ve, de s0 a s1 (un sólido torneado
// pintaría su tapa entera encima del cuerpo) ----------
function aro(F, s0, s1, r0, r1) {
  const V = G.viewOf(P), phi = Math.atan2(G.dot3(F.v, V), G.dot3(F.u, V)), n = 24;
  const lado = (s, r, de, a) => Array.from({ length: n + 1 }, (_, i) => G.pointOf(F, s, r, de + (a - de) * i / n));
  const pts = [...lado(s0, r0, phi - Math.PI / 2, phi + Math.PI / 2), ...lado(s1, r1, phi + Math.PI / 2, phi - Math.PI / 2)];
  return `<path class="aro-banda" d="${poly(pts)}"/>` + L(linea(lado(s0, r0, phi - Math.PI / 2, phi + Math.PI / 2)) + linea(lado(s1, r1, phi - Math.PI / 2, phi + Math.PI / 2)), { tone: 'mid' });
}

// ---------- la kupela ----------
const FK = G.frameAlong([KUP.x0, KUP.y, KUP.z], [1, 0, 0]);
const rK = (s) => { for (let i = 1; i < PERFIL_K.length; i++) { const [s0, r0] = PERFIL_K[i - 1], [s1, r1] = PERFIL_K[i]; if (s <= s1) return r0 + (r1 - r0) * (s - s0) / (s1 - s0); } return PERFIL_K.at(-1)[1]; };
function kupela() {
  const out = [], L1 = KUP.x1 - KUP.x0;
  // los dos calzos, con su cuña
  for (const cx of [KUP.x0 + 6, KUP.x1 - 14]) {
    out.push(S(k.slabOf({ x: cx, y: KUP.y - 17, w: 8, d: 34, r: 0.6 }, 0, 6.5, P, 2, 0.4), { tone: 'lo', className: 'madera' }));
    out.push(L(k.sideSeam({ x: cx, y: KUP.y - 17, w: 8, d: 34, r: 0.6 }, 2.4, P, 2), { tone: 'faint' }));
  }
  // el cuerpo de duelas (torneado) y los aros de hierro
  out.push(S(G.solidOf(PERFIL_K, FK, P), { tone: 'hi', className: 'kupela madera' }));
  const AROS = [[3.2, 5.6], [18, 20], [36, 38], [50.4, 52.8]];
  for (const [a, b] of AROS) out.push(aro(FK, a, b, rK(a) + 0.36, rK(b) + 0.36));
  // las juntas de las duelas, de aro a aro
  const tramos = [[5.6, 18], [20, 36], [38, 50.4]];
  out.push(L(tramos.map(([a, b]) => G.ribsOf(FK, a, b, rK(a), 26, P, { r1: rK(b), phase: 0.06 })).join(''), { tone: 'lo' }));
  // la tapa: el jable (el canto de la tapa metida) y las juntas de sus tablas, de borde a borde
  const xs = KUP.x1 + 0.02, rT = 15.6;
  const tapa = Array.from({ length: 48 }, (_, i) => { const a = i / 48 * 2 * Math.PI; return [xs, KUP.y + Math.cos(a) * rT, KUP.z + Math.sin(a) * rT]; });
  out.push(L(poly(tapa), { tone: 'lo' }));
  let juntas = '';
  for (const dy of [-10, -5, 0, 5, 10]) { const hz = Math.sqrt(rT * rT - dy * dy); juntas += linea([[xs, KUP.y + dy, KUP.z - hz], [xs, KUP.y + dy, KUP.z + hz]]); }
  out.push(L(juntas, { tone: 'faint' }));
  // el número de la kupela y su clavo
  out.push(D([at([xs, KUP.y, KUP.z + 9])], { size: 0.6, tone: 'hi' }));
  // el agujero del txotx (debajo del palito) y el palito, que se quita al abrirlo
  const FT = G.frameAlong([xs, KUP.y, TXOTX.z], [1, 0, 0]);
  out.push(`<path class="interior" d="${poly(Array.from({ length: 16 }, (_, i) => { const a = i / 16 * 2 * Math.PI; return [xs, KUP.y + Math.cos(a) * 0.9, TXOTX.z + Math.sin(a) * 0.9]; }))}"/>`);
  out.push(`<g data-part="palito">${S(G.disc(0, 3.2, 0.75, FT, P), { tone: 'hi', className: 'madera' })}</g>`);
  // el tapón de arriba (por donde entra el mosto y sale la espuma)
  const bx = KUP.x0 + 28, bz = KUP.z + rK(28);
  out.push(S(k.cylinder(bx, KUP.y, 1.7, bz - 0.6, 1.8, P, 18), { tone: 'mid', className: 'madera' }));
  return out.join('');
}

// ---------- la manguera: de la pila, por el suelo, hasta el tapón de la kupela ----------
const TAPON = [KUP.x0 + 28, KUP.y, KUP.z + rK(28) + 1.2];
const RUTA = G.fillet([[PILA.x + PILA.w - 3, PILA.y + 5, 3], [PILA.x + PILA.w + 1, PILA.y + 5, PILA.h + 1.6], [PILA.x + PILA.w + 6, -2, 1.1], [-4, -2, 1.1], [2, -2, 6], [2, -2, 38], [14, -13, 46.5], [TAPON[0] - 3, TAPON[1] + 1, TAPON[2] + 3], TAPON], 4);
const tubo = (ruta, r, cls) => T.tubePieces(ruta, r, P, { maxLength: 400 }).map((pc) => T.tubeSvg(pc, { tone: 'mid', className: cls })).join('');

// ---------- el vaso (encima del chorro y la sidra, que son vivos) ----------
function vaso() {
  const F = FZ(VASO.x, VASO.y);
  return `<g data-part="vaso">${S(G.solidOf([[0, VASO.r0], [VASO.h, VASO.r1]], F, P), { tone: 'hi', className: 'vaso' })}${L(k.ring(VASO.x, VASO.y, VASO.r1, VASO.h, P, 28), { tone: 'hi' })}</g>`;
}

// ---------- la trituradora, el cubo y la caja ----------
function trituradora() {
  const out = [], { x, y, w, d, pata, h } = TRIT;
  for (const [px, py] of porDep([[x + 2, y + 2], [x + w - 4, y + 2], [x + 2, y + d - 4], [x + w - 4, y + d - 4]]))
    out.push(S(k.slabOf({ x: px, y: py, w: 2.4, d: 2.4, r: 0.3 }, 0, pata, P, 2), { tone: 'mid', className: 'madera' }));
  out.push(S(k.slabOf({ x, y, w, d, r: 1 }, pata, h, P, 3, 0.5), { tone: 'hi', className: 'maquina madera' }));
  out.push(L(k.sideSeam({ x, y, w, d, r: 1 }, pata + h / 2, P, 3), { tone: 'lo' }));
  out.push(D([[x + 1.6, y + d, pata + 1.6], [x + w - 1.6, y + d, pata + 1.6], [x + 1.6, y + d, pata + h - 1.6], [x + w - 1.6, y + d, pata + h - 1.6]].map(at), { size: 0.45 }));
  // la tolva, con su boca
  const tx = x + w / 2, ty = y + d / 2, zt = pata + h;
  out.push(S(G.solidOf([[zt, 4], [zt + 2, 4], [zt + 10, 10]], FZ(tx, ty), P), { tone: 'mid', className: 'tolva madera' }));
  out.push(`<path class="interior" d="${poly(circulo(tx, ty, 9.3, zt + 10))}"/>`);
  out.push(`<g data-part="en-tolva">${porDep([[tx - 3, ty - 1, zt + 7.6], [tx + 2.6, ty + 2, zt + 7.8], [tx + 0.4, ty - 3.6, zt + 7.4]]).map((c, i) => S(G.sphereOf(c, 2.2, P), { tone: 'mid', className: i % 2 ? 'manzana-v' : 'manzana-r' })).join('')}</g>`);
  out.push(L(k.ring(tx, ty, 9.3, zt + 10, P, 36), { tone: 'hi' }));
  // el canalón de la pulpa hacia el cubo
  out.push(S(G.prismOf(G.frameOf([0, CUBO.y - 3, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]), [[x + w - 0.5, pata + 3.6], [CUBO.x - 3, CUBO.h + 2.4], [CUBO.x - 3, CUBO.h + 1.2], [x + w - 0.5, pata + 2.4]], 0, 6, P), { tone: 'mid', className: 'madera' }));
  // el buje de la manivela en la cara de delante
  out.push(S(G.disc(0, 1.4, 2.2, G.frameAlong([x + w / 2, y + d, pata + h / 2], [0, 1, 0]), P), { tone: 'mid', className: 'hierro' }));
  return out.join('');
}
function cubo() {
  const { x, y, r, h } = CUBO, out = [];
  out.push(S(k.cylinder(x, y, r, 0, h, P, 32), { tone: 'mid', className: 'madera' }));
  out.push(L([2.6, h - 2.4].map((z) => G.arcOf(FZ(x, y), z, r + 0.02, P)).join(''), { tone: 'lo' }));
  const boca = poly(circulo(x, y, r - 0.9, h));
  out.push(`<clipPath id="boca-cubo"><path d="${boca}"/></clipPath><path class="interior" d="${boca}"/><g clip-path="url(#boca-cubo)"><path data-part="pulpa" class="pulpa" d=""/></g>`);
  out.push(L(boca, { tone: 'mid' }));
  return out.join('');
}
function caja() {
  const out = [], { x, y, w, d, h } = CAJA;
  out.push(S(k.slabOf({ x, y, w, d, r: 0.6 }, 0, h, P, 2, 0.3), { tone: 'mid', className: 'caja madera' }));
  out.push(L([3, 6].map((z) => k.sideSeam({ x, y, w, d, r: 0.6 }, z, P, 2)).join(''), { tone: 'lo' }));
  const man = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) man.push([x + 3.2 + i * 5.2, y + 3.2 + j * 4.8, h + 2.2, (i + j) % 3 === 0 ? 'v' : 'r']);
  man.push([x + 6, y + 5.6, h + 5.6, 'r'], [x + 12.4, y + 8, h + 5.8, 'v'], [x + 9, y + 11, h + 5.4, 'r']);
  return out.join('') + `<g data-part="manzanas">${porDep(man).map((c) => S(G.sphereOf(c.slice(0, 3), 2.3, P), { tone: 'mid', className: 'manzana-' + c[3] })).join('')}${D(man.map((c) => at([c[0], c[1], c[2] + 2.3])), { size: 0.35, tone: 'lo' })}</g>`;
}

// ---------- la mesa: una kupela pequeña de pie, con dos vasos vacíos encima ----------
function mesa() {
  const { x, y, h } = MESA, F = FZ(x, y), out = [];
  const perfil = [[0, 8.4], [3, 9.1], [h / 2, 9.7], [h - 3, 9.1], [h, 8.4]], rM = (z) => z < 3 ? 8.4 + 0.7 * z / 3 : z < h / 2 ? 9.1 + 0.6 * (z - 3) / (h / 2 - 3) : z < h - 3 ? 9.7 - 0.6 * (z - h / 2) / (h / 2 - 3) : 9.1 - 0.7 * (z - h + 3) / 3;
  out.push(S(G.solidOf(perfil, F, P), { tone: 'hi', className: 'madera' }));
  for (const [a, b] of [[1.6, 3.4], [h - 3.4, h - 1.6]]) out.push(aro(F, a, b, rM(a) + 0.3, rM(b) + 0.3));
  out.push(L(G.ribsOf(F, 3.4, h - 3.4, rM(3.4), 20, P, { r1: rM(h - 3.4), phase: 0.04 }), { tone: 'lo' }));
  out.push(L(k.ring(x, y, 7.4, h + 0.02, P, 36), { tone: 'lo' }));
  for (const [gx, gy] of porDep([[x - 3, y - 2.4], [x + 2.6, y + 2]])) {
    const FG = FZ(gx, gy, h);
    out.push(S(G.solidOf([[0, 1.5], [6, 2.1]], FG, P), { tone: 'hi', className: 'vaso' }));
    out.push(L(k.ring(gx, gy, 2.1, h + 6, P, 24), { tone: 'hi' }));
  }
  return out.join('');
}

// ---------- las botellas ----------
function botellas() {
  const out = [], base = { x: BOT.x - 6, y: BOT.y - 6, w: BOT.n * BOT.paso + 3, d: 12, r: 0.8 };
  out.push(S(k.slabOf(base, 0, 2.4, P, 2, 0.3), { tone: 'lo', className: 'madera' }));
  const perfil = [[2.4, 3.2], [13.5, 3.2], [16, 1.2], [21, 1.05], [22.2, 1.3]];
  for (const [x, y] of porDep(Array.from({ length: BOT.n }, (_, i) => [BOT.x + i * BOT.paso, BOT.y]))) {
    const F = FZ(x, y);
    out.push(S(G.solidOf(perfil, F, P), { tone: 'hi', className: 'botella' }));
    out.push(L(G.arcOf(F, 7.5, 3.22, P) + G.arcOf(F, 11.5, 3.22, P), { tone: 'lo' }));
  }
  return `<g data-part="botellas">${out.join('')}</g>`;
}

// ---------- la figura ----------
const vigas = Array.from({ length: VIGA.NB + 1 }, (_, i) => `<g data-viga="${i}"${i ? ' style="display:none"' : ''}>${viga(VIGA.TH * (1 - i / VIGA.NB))}</g>`).join('');
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta de una sidrería: la caja de manzanas, la trituradora con su tolva y su manivela, el cubo de la pulpa, el dolare (una prensa de viga con su husillo y su piedra) que aplasta la torta de pulpa, la pila donde cae el mosto, la manguera hasta la kupela tumbada con sus aros y su txotx, el chorro que cae al vaso y las botellas. Paso a paso se ilumina la pieza que trabaja.',
  body: [
    tablero(),
    `<g data-part="poste-atras">${poste(POSTE.ys[0])}</g>`,
    cama(),
    `<g data-part="torta"></g>`,
    `<g data-part="abajo"></g>`,                       // la piedra, el husillo de abajo y su barra (vivos)
    `<g data-part="vigas">${vigas}</g>`,
    `<g data-part="arriba"></g>`,                      // el husillo de encima de la tuerca (vivo)
    `<g data-part="poste-delante">${poste(POSTE.ys[1])}</g>`,
    cruceta(),
    D([at([POSTE.x, POSTE.ys[1] + POSTE.a / 2, VIGA.PZ]), at([POSTE.x, POSTE.ys[0] - POSTE.a / 2, VIGA.PZ])], { size: 0.7, tone: 'hi' }),
    pila(),
    `<path data-part="gotas" class="iso-line chorro" data-tone="hi" d=""/>`,
    `<g data-part="kupela">${kupela()}</g>`,
    `<g data-part="espuma"></g>`,
    `<g data-part="manguera">${tubo(RUTA, 1.0, 'tubo')}<path data-part="flujo" class="iso-line flujo" data-tone="hi" d="${linea(G.resample(RUTA, 1.5))}"/></g>`,
    `<path data-part="chorro" class="chorro-txotx" d=""/>`,
    `<g data-part="sidra"></g>`,
    vaso(),
    `<g data-part="trituradora">${trituradora()}</g>`,
    `<path data-part="manivela" class="iso-line" data-tone="hi" style="stroke-width:1.3;stroke-linecap:round" d=""/><g class="iso-dots" data-tone="hi"><circle data-part="pomo" r="1.1" cx="0" cy="0"/></g>`,
    cubo(),
    caja(),
    mesa(),
    botellas(),
  ],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, V = ${JSON.stringify(VIGA)}, HUS = ${JSON.stringify(HUS)}, PIE = ${JSON.stringify(PIEDRA)}, TO = ${JSON.stringify(TORTA)}, TB = ${TABLA}, TA = ${JSON.stringify(TACO)};
const CA = ${JSON.stringify(CAMA)}, PI = ${JSON.stringify(PILA)}, KUP = ${JSON.stringify(KUP)}, TX = ${JSON.stringify(TXOTX)}, VA = ${JSON.stringify(VASO)}, TR = ${JSON.stringify(TRIT)}, CU = ${JSON.stringify(CUBO)}, TAPON = ${JSON.stringify(TAPON)};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), f1 = (v) => v.toFixed(1), linea = (pts) => 'M' + pts.map((p) => { const q = at(p); return f1(q[0]) + ' ' + f1(q[1]); }).join('L'), poly = (pts) => linea(pts) + 'Z';
const K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = {}; for (const n of ['torta', 'abajo', 'arriba', 'vigas', 'mosto', 'gotas', 'kupela', 'espuma', 'manguera', 'flujo', 'chorro', 'sidra', 'vaso', 'trituradora', 'manivela', 'pomo', 'pulpa', 'manzanas', 'en-tolva', 'botellas', 'palito']) el[n] = $(n);
const vigas = [...el.vigas.querySelectorAll('[data-viga]')];
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
const caja = (x, y, w, d, z, h, cls, tone) => solidSvg(slabOf({ x, y, w, d, r: 0.5 }, z, h, P, 2, 0.3), { tone: tone || 'mid', className: cls });
const circulo = (cx, cy, r, z, n) => Array.from({ length: n || 32 }, (_, i) => { const a = i / (n || 32) * 2 * Math.PI; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]; });
// (hacia quien mira, en el suelo: la mitad de delante de la rosca del husillo)
const vx = depthOf([1, 0, 0], P) - depthOf([0, 0, 0], P), vy = depthOf([0, 1, 0], P) - depthOf([0, 0, 0], P), VAng = Math.atan2(vy, vx);
const enViga = (phi, d, e) => [V.XP + d * Math.cos(phi) - e * Math.sin(phi), V.PZ + d * Math.sin(phi) + e * Math.cos(phi)];
const dHus = (phi) => (HUS.x - V.XP - V.HH * Math.sin(phi)) / Math.cos(phi);
function husillo(z0, z1) {
  if (z1 - z0 < 0.2) return '';
  let o = solidSvg(cylinder(HUS.x, V.YB, HUS.r, z0, z1 - z0, P, 20), { tone: 'mid', className: 'hierro' }), r = '';
  const paso = 1.7, a0 = VAng - Math.PI / 2;
  for (let z = z0 + 0.3; z + paso / 2 < z1; z += paso) { const pts = []; for (let i = 0; i <= 10; i++) { const a = a0 + i / 10 * Math.PI; pts.push([HUS.x + Math.cos(a) * (HUS.r + 0.02), V.YB + Math.sin(a) * (HUS.r + 0.02), z + i / 10 * paso / 2]); } r += linea(pts); }
  return o + '<path class="iso-line" data-tone="lo" d="' + r + '"/>';
}
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0, giroBarra = 0, vigaVista = 0;
const tourAt = (t) => { const T2 = 3.2 * N + 2, f = (t % T2) / T2 * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s)), f = s - paso;
  // ---- la trituradora: la manivela gira y la pulpa llena el cubo; al prensar, el cubo se vacía en la cama ----
  const tritura = paso === 1, ang = tritura ? reloj * 4.2 : 0.9;
  const cx = TR.x + TR.w / 2, cy = TR.y + TR.d + 1.4, cz = TR.pata + TR.h / 2, pm = [cx + Math.cos(ang) * 5, cy, cz + Math.sin(ang) * 5], pz = [pm[0], pm[1] + 3, pm[2]];
  el.manivela.setAttribute('d', linea([[cx, cy - 1.4, cz], [cx, cy, cz], pm, pz])); const qp = at(pz); el.pomo.setAttribute('cx', f1(qp[0])); el.pomo.setAttribute('cy', f1(qp[1]));
  el['en-tolva'].style.opacity = tritura ? (1 - sm(f / 0.8)).toFixed(2) : '0';
  const pulpa = s < 1 ? 0 : s < 2 ? sm((s - 1) / 0.9) : 1 - sm((s - 2) / 0.15);
  el.pulpa.setAttribute('d', pulpa > 0.01 ? poly(circulo(CU.x, CU.y, CU.r - 0.9, 0.8 + pulpa * (CU.h - 2.2), 32)) : '');
  // ---- el dolare: la torta llega a la cama, la viga baja de TH a 0 y la piedra se levanta ----
  const llega = sm((s - 2) / 0.15), phi = s < 2.15 ? V.TH : V.TH * (1 - sm((s - 2.15) / 0.6)), alza = sm((s - 2.75) / 0.2) * PIE.alza;
  const iv = Math.round((1 - phi / V.TH) * V.NB);
  if (iv !== vigaVista) { vigas[vigaVista].style.display = 'none'; vigas[iv].style.display = ''; vigaVista = iv; }
  const ph = V.TH * (1 - iv / V.NB);                       // (el ángulo de la viga que se ve)
  const contacto = enViga(ph, TA.xs[0] - V.XP, -V.HH)[1], h0 = contacto - CA.h - TB - TA.h, h = h0 * llega;
  let o = '';
  if (h > 0.2) {
    o += caja(TO.x, TO.y, TO.w, TO.d, CA.h, h, 'pulpa-torta');
    o += caja(TO.x - 1, TO.y - 1, TO.w + 2, TO.d + 2, CA.h + h, TB, 'madera');
    for (const tx of TA.xs) o += caja(tx, TO.y - 1, TA.w, TO.d + 2, CA.h + h + TB, TA.h, 'madera');
  }
  el.torta.innerHTML = o;
  // la piedra, el ojal, el husillo de abajo y la barra que lo gira
  const zp = alza, ztop = zp + PIE.h, ds = dHus(ph), zbot = V.PZ + ds * Math.sin(ph) - V.HH * Math.cos(ph);
  const prensa = s > 2.15 && s < 2.95; if (prensa) giroBarra += dt * 1.7;
  let ab = solidSvg(cylinder(HUS.x, V.YB, PIE.r, zp, PIE.h, P, 36, 0.6), { tone: 'mid', className: 'piedra-viva' }) + solidSvg(cylinder(HUS.x, V.YB, 3, ztop, 1.4, P, 18), { tone: 'mid', className: 'hierro' });
  ab += husillo(ztop + 1.4, zbot + 3);
  const zb = ztop + 5, bx = Math.cos(giroBarra) * 11, by = Math.sin(giroBarra) * 11;
  ab += '<path class="iso-line" data-tone="hi" style="stroke-width:' + f1(1.1 * K) + ';stroke-linecap:round" d="' + linea([[HUS.x - bx, V.YB - by, zb], [HUS.x + bx, V.YB + by, zb]]) + '"/>';
  ab += '<g class="iso-dots" data-tone="hi">' + [[HUS.x - bx, V.YB - by, zb], [HUS.x + bx, V.YB + by, zb]].map((p) => { const q = at(p); return '<circle r="' + f1(0.7 * K) + '" cx="' + f1(q[0]) + '" cy="' + f1(q[1]) + '"/>'; }).join('') + '</g>';
  el.abajo.innerHTML = ab;
  const znut = V.PZ + ds * Math.sin(ph) + (V.HH + 4) * Math.cos(ph);
  el.arriba.innerHTML = husillo(znut, ztop + 1.4 + HUS.largo);
  // ---- el mosto: gotea mientras se prensa y llena la pila; al fermentar pasa por la manguera a la kupela ----
  const nivel = s < 2.15 ? 0 : s < 3 ? sm((s - 2.15) / 0.8) : 1 - sm((s - 3) / 0.4) * 0.88;
  const b = 1.4, zl = 0.6 + nivel * (PI.h - 2);
  el.mosto.setAttribute('d', nivel > 0.01 ? poly([[PI.x + b, PI.y + b, zl], [PI.x + PI.w - b, PI.y + b, zl], [PI.x + PI.w - b, PI.y + PI.d - b, zl], [PI.x + b, PI.y + PI.d - b, zl]]) : '');
  const gotea = prensa || (s > 2.05 && s < 2.98), gx = TO.x + TO.w / 2, gy = PI.y + 2.6;
  el.gotas.setAttribute('d', gotea ? linea([[gx, gy, CA.h - 2.0], [gx, gy, zl]]) : '');
  el.flujo.style.opacity = s >= 3 && s < 3.42 ? '1' : '0';
  // ---- la espuma que sale por el tapón mientras fermenta ----
  let es = '';
  if (paso === 3 && f > 0.35) for (let i = 0; i < 6; i++) { const g = (reloj * 0.5 + i / 6) % 1, p = at([TAPON[0] + Math.sin(i * 2.1) * 1.2, TAPON[1] + Math.cos(i * 1.7) * 0.8, TAPON[2] + 0.6 + g * 7]); es += '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="' + f1((0.45 + g * 0.35) * K) + '" class="burbuja" style="opacity:' + (1 - g).toFixed(2) + '"/>'; }
  el.espuma.innerHTML = es;
  // ---- ¡txotx!: se quita el palito y el chorro cae en parábola al vaso, que se llena ----
  const abierto = paso === 4 && f > 0.08 && f < 0.94, x0 = KUP.x1 + 0.4, z0 = TX.z, xt = VA.x - VA.r1 + 0.9, zt = VA.h - 1.2;
  el.palito.style.opacity = abierto ? '0' : '1';
  if (abierto) { const pts = []; for (let i = 0; i <= 18; i++) { const u = i / 18, x = x0 + (xt - x0) * u; pts.push([x, KUP.y, z0 - (z0 - zt) * u * u]); } el.chorro.setAttribute('d', linea(pts)); el.chorro.style.strokeWidth = f1(0.9 * K); }
  else el.chorro.setAttribute('d', '');
  const lleno = paso < 4 ? 0 : paso === 4 ? sm((f - 0.15) / 0.75) * 0.8 : 0.8;
  el.sidra.innerHTML = lleno > 0.02 ? solidSvg(cylinder(VA.x, VA.y, VA.r0 + 0.25, 0.5, lleno * (VA.h - 0.8), P, 22), { tone: 'mid', className: 'sidra' }) : '';
  // ---- lo que trabaja en cada paso ----
  ilumina(el.manzanas, paso === 0); ilumina([el.trituradora, el.manivela, el.pulpa], paso === 1);
  ilumina([el.vigas, el.abajo, el.arriba, el.torta], paso === 2); ilumina([el.kupela, el.manguera], paso === 3);
  ilumina([el.vaso, el.palito], paso === 4); ilumina(el.botellas, paso === 5);
  const extra = ['ácidas y dulces, de septiembre a noviembre', 'la manzana, hecha pulpa', 'de 100 kg de manzana, unos 65 litros de mosto', 'todo el invierno: el azúcar se vuelve alcohol, unos 6 grados', 'de enero a abril, el chorro desde lejos para que se airee', 'sidra natural'][paso];
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
stage.addEventListener('pointermove', (e) => { const r = svgEl.getBoundingClientRect(); steer(clamp((e.clientX - r.left) / r.width, 0, 1) * N); });
stage.addEventListener('pointerdown', (e) => { const r = svgEl.getBoundingClientRect(); steer(clamp((e.clientX - r.left) / r.width, 0, 1) * N); });
stage.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); steer(Math.floor(target) + 1.6); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); steer(Math.floor(target) - 0.4); } });
window.__pasoSidra = (v) => { touring = false; target = s = clamp(v, 0, N - 0.001); draw(0); };
draw(0);
`;

// los colores de los materiales: relleno, las cuatro sombras y la cara de arriba (como en las otras láminas)
const tonos = (pre, cls, [f, s0, s1, s2, s3, t]) => `${pre}.${cls}>.iso-fill{fill:${f}}${pre}.${cls}>.iso-top{fill:${t}}${pre}.${cls}[data-seamless]>.iso-top{stroke:${t}}` +
  [s0, s1, s2, s3].map((c, i) => `${pre}.${cls}>.iso-shade[data-shade="${i}"]{fill:${c}}${pre}.${cls}[data-seamless]>.iso-shade[data-shade="${i}"]{stroke:${c}}`).join('');
const COLOR = {
  dark: { madera: ['#4a3628', '#2a1d16', '#35261c', '#403022', '#4c3a2a', '#5a4632'], hierro: ['#5c5a6a', '#2e2c38', '#3a3846', '#464454', '#525062', '#6e6c7e'],
    piedra: ['#5a5266', '#2e2838', '#3a3346', '#463e54', '#524962', '#6a6078'], 'piedra-viva': ['#5a5266', '#2e2838', '#3a3346', '#463e54', '#524962', '#6a6078'],
    'manzana-r': ['#b8404e', '#5e1e26', '#74262f', '#8a2e38', '#a03642', '#d4606c'], 'manzana-v': ['#a4b040', '#525a1c', '#646e24', '#76822c', '#889634', '#c0cc5a'],
    'pulpa-torta': ['#b08a48', '#5e4622', '#70542a', '#826232', '#94703a', '#c8a460'], sidra: ['#d8b04a', '#806420', '#987828', '#ae8a32', '#c49c3c', '#ecc860'],
    botella: ['#2c5a44', '#122a20', '#183628', '#1e4230', '#244e3a', '#3a7258'] },
  light: { madera: ['#8a6a50', '#5e4636', '#6c523e', '#7a5e48', '#886a52', '#9a7c62'], hierro: ['#9c9aaa', '#6e6c7c', '#7c7a8a', '#8a8898', '#9896a6', '#b2b0c0'],
    piedra: ['#a49aae', '#766c82', '#857b91', '#948aa0', '#a399af', '#bcb2c6'], 'piedra-viva': ['#a49aae', '#766c82', '#857b91', '#948aa0', '#a399af', '#bcb2c6'],
    'manzana-r': ['#d65a66', '#a03040', '#b03c4a', '#c04856', '#d05462', '#ec7a84'], 'manzana-v': ['#b8c450', '#88922a', '#96a034', '#a4ae3e', '#b2bc48', '#d0da70'],
    'pulpa-torta': ['#d4ae6a', '#a07c40', '#b08a4c', '#c09858', '#d0a664', '#e8c486'], sidra: ['#e8c25a', '#b08a2a', '#c09836', '#d0a642', '#e0b44e', '#f6d676'],
    botella: ['#4f8a6c', '#2a5a44', '#34684e', '#3e7658', '#488462', '#6aa686'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + colores + `
.iso{--interior:#0d0718;--pulpa:#c9a25a;--mosto:#e3bf5a}
.iso[data-theme="light"]{--interior:#e2dcee;--pulpa:#d9b878;--mosto:#e8c867}
.interior{fill:var(--interior)}
.aro-banda{fill:#3e3c4a}.iso[data-theme="light"] .aro-banda{fill:#8a8898}
.pulpa{fill:var(--pulpa)}
.mosto{fill:var(--mosto)}
.vaso>.iso-fill,.vaso>.iso-top,.vaso>.iso-shade{fill-opacity:.3;stroke-opacity:.3}
.chorro{stroke:var(--mosto)!important;stroke-dasharray:1.2 1.6;animation:corre .4s linear infinite}
.chorro-txotx{fill:none;stroke:var(--mosto);stroke-linecap:round;stroke-dasharray:3 1.4;animation:corre .3s linear infinite}
.flujo{stroke-dasharray:1.4 2;animation:corre .45s linear infinite;stroke-width:1}
.burbuja{fill:#fff}
@keyframes corre{to{stroke-dashoffset:-3.4}}
@media (prefers-reduced-motion:reduce){.flujo,.chorro,.chorro-txotx{animation:none}}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .tb-edge{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
`;

const body = k.plateHtml({
  fig: 'Lámina 25',
  title: 'Cómo se hace la sidra',
  hint: 'Pasa el ratón: paso a paso',
  readout: '1 · Recoger la manzana',
  keys: [
    { mark: 'lit', label: 'La pieza que trabaja: la caja, la trituradora, el dolare, la kupela, el vaso y las botellas' },
    { mark: 'raised', label: 'El dolare: el husillo baja la viga, que aprieta la torta, y al final levanta la piedra' },
    { mark: 'flat', label: '¡Txotx!: se quita el palito de la kupela y el chorro cae al vaso desde lejos' },
  ],
  caption: 'En los caseríos se recogen manzanas ácidas y dulces de septiembre a noviembre. Se trituran y la pulpa se aprieta en el dolare, una prensa de viga: el husillo baja la viga sobre la torta y al final levanta la piedra, que cuelga y sigue apretando. De 100 kilos de manzana salen unos 65 litros de mosto, que fermenta en las kupelas todo el invierno hasta tener unos 6 grados. De enero a abril se abre el txotx: el chorro cae al vaso desde lejos para que la sidra se airee.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="La sidra, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="6">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Cómo se hace la sidra', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('sidra', html, theme);
