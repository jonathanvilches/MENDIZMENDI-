// Lámina isométrica interactiva «Cómo se hace el pan» (skill Anatomy, 21 de noviembre de 2026; el autor: «explicaciones
// técnicas con Anatomy de oficios antiguos, de procesos de elaboración de productos artesanales de Navarra»). El horno de
// leña del pueblo, en maqueta y abierto en cuña para verlo por dentro: la bóveda de ladrillo con su corte (ladrillo
// refractario, barro con paja y piedra), la solera, la embocadura con la boca en arco, la puerta de hierro y un termómetro en
// el poyo que marca lo que pasa dentro. Alrededor: la pila de leña, la artesa donde se amasa (con el saco de harina, el
// cántaro y la masa madre), el tablero donde la masa reposa y crece bajo la manta, la pala, el hurgón y el escobón, y la
// rejilla donde se enfría el pan. Al recorrerla, paso a paso, se ilumina lo que trabaja: amasar, reposar, calentar el horno
// hasta que la bóveda blanquea, sacar las brasas y limpiar, marcar y meter los panes con la pala, y cocer con la puerta
// cerrada. Es la que se abre al acabar el taller de la panadera (data/oficios.js) y en el material didáctico.
// Uso: node tools/anatomia/pan.mjs [--light]  →  entrega/anatomia/pan(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 320;

// ---------- el modelo (centímetros de la maqueta) ----------
// el horno: bóveda de 11,5 de radio y 10 de alto por fuera (9,2 y 7,8 por dentro), sobre un poyo de 5, con la solera de
// 0,6 (baldosa sobre arena); cortado por delante en y = -25,4 para verlo por dentro. La boca mira a +x, en una embocadura
// de piedra con arco de medio punto.
const HORNO = { cx: -26, cy: -30, z0: 5, R: 11.5, H: 10, Ri: 9.2, Hi: 7.8, solera: 0.6, yc: -25.4 };
const POYO = { x: -40, y: -44, w: 32, d: 28, r: 1.2 };
const FACHADA = { x0: -16.4, x1: -14.4, y0: -37, y1: -25.4, z1: 13.8 };
const BOCA = { y0: -33, y1: -27, arranque: 8.1, clave: 11.1 };   // el arco: de y0 a y1, arranca en z 8,1 y cierra en 11,1 (el umbral, a ras de la solera)
const TERMO = { x: -24, y: -16, z: 2.6, r: 2 };
const LENA = { x: -53, y: -46 };
const ARTESA = { x: 4, y: -54, w: 18, d: 9, z0: 7, h: 4 };
const TABLERO = { x: -2, y: -34, w: 32, d: 8, z: 4.6, h: 0.9 };
const REJILLA = { x: 12, y: -16, w: 28, d: 10, z: 3.6 };
const PASOS = ['Amasar', 'Reposar', 'Calentar', 'Limpiar', 'Meter', 'Cocer'];
const PUESTOS = [[13, -49.5, 11], [14, -30, 7], [-27, -30, 7], [-36, -14, 4], [-12, -30, 6], [26, -11, 5]];

// ---------- la cámara ----------
const PLATE = { x: -64, y: -56, w: 108, d: 56, r: 7 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [HORNO.cx, HORNO.cy, HORNO.z0 + HORNO.H + 1], [ARTESA.x, ARTESA.y, 14], [LENA.x, LENA.y, 8]], WIDTH, HEIGHT, { pad: 8, azimuth: 66, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(2)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const FZ = (x, y, z = 0) => G.frameAlong([x, y, z], [0, 0, 1]);
const FY = (x, y, z) => G.frameAlong([x, y, z], [0, 1, 0]);
const porDepth = (lista, f) => [...lista].sort((a, b) => dep(f(a)) - dep(f(b)));
const V = G.viewOf(P), LZ = G.lightOf(P), VA = Math.atan2(V[1], V[0]);
const caja = (x0, x1, y0, y1, z0, h, cls, bevel = 0.2) => S(k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: 0.2 }, z0, h, P, 2, bevel), { tone: 'mid', className: cls });
const pata = (x, y, z0, z1, r = 0.5, cls = 'madera') => S(k.cylinder(x, y, r, z0, z1 - z0, P, 12), { tone: 'mid', className: cls });
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const nivel = (b, n) => Math.max(0, Math.min(n - 1, Math.floor((b + 0.35) / 1.25 * n)));

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
  const regla = { x: -58, y: -10, w: 22, d: 5.5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.05, 0.6, [1.8, regla.d - 0.1], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.8, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.8, 0.6])], { size: 0.45 }));
  const placa = { x: -24, y: -10.5, w: 30, d: 7.5, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 6.2, placa.y + 4.4], 0.8, P, 'x'), 'OGIA · LABEA', { size: 2.4, tone: 'mid' }));
  out.push(D([at([placa.x + 2.2, placa.y + 3.75, 0.8]), at([placa.x + placa.w - 2.2, placa.y + 3.75, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- la leña: troncos de haya apilados, con sus estacas ----------
function lena() {
  const { x, y } = LENA, out = [], largo = 10, r = 1.25;
  const troncos = [];
  for (let fila = 0; fila < 3; fila++) for (let j = 0; j < 4 - fila; j++) troncos.push([x - 3.9 + fila * 1.3 + j * 2.6, y, r + fila * 2.2]);
  for (const sx of [x - 5.6, x + 5.6]) out.push(pata(sx, y + largo - 1.2, 0, 7.4, 0.35, 'madera'));
  for (const [tx, ty, tz] of porDepth(troncos, (q) => [q[0], q[1] + largo, q[2]])) {
    const F = FY(tx, ty, tz);
    out.push(S(G.solidOf([[0, r], [largo, r]], F, P), { tone: 'mid', className: 'tronco' }));
    out.push(L(G.circleOf(F, largo, r * 0.62, P) + G.circleOf(F, largo, r * 0.28, P), { tone: 'lo' }));
  }
  for (const sx of [x - 5.6, x + 5.6]) out.push(pata(sx, y - 0.6, 0, 7.4, 0.35, 'madera'));
  return `<g data-part="lena">${out.join('')}</g>`;
}

// ---------- la artesa, con la masa viva dentro; el saco de harina, la masa madre y el cántaro ----------
function artesa() {
  const a = ARTESA, out = [], zt = a.z0 + a.h, ins = 1, zf = zt - 3;
  for (const [px, py] of porDepth([[a.x + 1.5, a.y + 1.5], [a.x + a.w - 1.5, a.y + 1.5], [a.x + 1.5, a.y + a.d - 1.5], [a.x + a.w - 1.5, a.y + a.d - 1.5]], ([q, r]) => [q, r, 0])) {
    out.push(pata(px, py, 0, a.z0, 0.55));
    if (py > a.y + 2) out.push(caja(a.x + 2, a.x + a.w - 2, py - 0.35, py + 0.35, 2, 0.7, 'madera', 0.1));
  }
  out.push(caja(a.x, a.x + a.w, a.y, a.y + a.d, a.z0, a.h, 'madera'));
  // el hueco: la boca oscura, la pared de atrás y la de la izquierda por dentro
  const x0 = a.x + ins, x1 = a.x + a.w - ins, y0 = a.y + ins, y1 = a.y + a.d - ins;
  const boca = [[x0, y0, zt], [x1, y0, zt], [x1, y1, zt], [x0, y1, zt]];
  out.push(`<clipPath id="pan-artesa"><path d="${poly(boca)}"/></clipPath>`);
  out.push(`<path class="hueco-artesa" d="${poly(boca)}"/>`);
  out.push(`<g clip-path="url(#pan-artesa)"><path class="artesa-dentro" d="${poly([[x0, y0, zt], [x1, y0, zt], [x1, y0, zf], [x0, y0, zf]])}"/><path class="artesa-dentro2" d="${poly([[x0, y0, zt], [x0, y1, zt], [x0, y1, zf], [x0, y0, zf]])}"/><g data-part="masa"></g></g>`);
  out.push(L(poly(boca), { tone: 'lo' }));
  // la rasqueta, apoyada en el canto de delante
  out.push(caja(a.x + a.w - 6, a.x + a.w - 3, a.y + a.d - 0.9, a.y + a.d - 0.2, zt, 0.25, 'hierro', 0.05));
  out.push(caja(a.x + a.w - 5.6, a.x + a.w - 3.4, a.y + a.d - 0.8, a.y + a.d - 0.3, zt + 0.25, 0.7, 'madera', 0.08));
  return `<g data-part="artesa">${out.join('')}</g>`;
}
function despensa() {
  const out = [];
  // el saco de harina, abierto, con la harina a la vista y el cordel
  const FS = FZ(29, -50, 0);
  out.push(S(G.solidOf([[0, 2.8], [0.5, 3.3, true], [3, 3.5, true], [5.6, 3.1, true], [6.8, 2.1, true], [7.3, 1.7], [7.9, 2.3], [8.3, 2.5]], FS, P), { tone: 'mid', className: 'saco', crease: 'none' }));
  out.push(`<path class="harina" d="${poly(Array.from({ length: 32 }, (_, i) => { const t = i / 32 * Math.PI * 2; return [29 + Math.cos(t) * 2.3, -50 + Math.sin(t) * 2.3, 8.3]; }))}"/>`);
  out.push(L(G.circleOf(FS, 7.3, 1.75, P), { tone: 'hi' }));
  // la masa madre, en un cuenco de barro
  const FC = FZ(27, -40.5, 0);
  out.push(S(G.solidOf([[0, 1.4], [0.3, 1.8, true], [1.9, 2.7]], FC, P), { tone: 'mid', className: 'barro', crease: 'none' }));
  out.push(`<path class="masa-madre" d="${poly(Array.from({ length: 28 }, (_, i) => { const t = i / 28 * Math.PI * 2; return [27 + Math.cos(t) * 2.35, -40.5 + Math.sin(t) * 2.35, 1.75]; }))}"/>`);
  out.push(D([[26.2, -40.9], [27.6, -40], [27.1, -41.4]].map(([x, y]) => at([x, y, 1.76])), { size: 0.3, tone: 'lo' }));
  // el cántaro del agua, con su asa
  const FK = FZ(37, -47, 0);
  out.push(S(G.solidOf([[0, 1.5], [0.4, 2.1, true], [3, 2.9, true], [5.4, 2.0, true], [6.5, 1.0], [7.4, 1.15], [7.7, 1.45]], FK, P), { tone: 'mid', className: 'barro', crease: 'none' }));
  out.push(`<path class="asa-cantaro" d="${linea([[39.4, -47, 4.6], [40.5, -47, 5.4], [40.4, -47, 6.6], [38.1, -47, 7.2]])}"/>`);
  return `<g data-part="despensa">${out.join('')}</g>`;
}

// ---------- el horno ----------
// cortado por un plano vertical (y = yc) un poco por delante del centro: se ve media bóveda por dentro y su sección
const Hn = HORNO, rad = Math.PI / 180, YC = Hn.yc, ZF = Hn.z0 + Hn.solera;
// un punto de la bóveda: ángulo th (grados) y altura relativa a ∈ [0, π/2] desde la clave (a = 0) al suelo (a = π/2)
const sup = (th, a, R, H) => [Hn.cx + R * Math.cos(th * rad) * Math.sin(a), Hn.cy + R * Math.sin(th * rad) * Math.sin(a), Hn.z0 + H * Math.cos(a)];
const normal = (th, a) => { const n = [Math.cos(th * rad) * Math.sin(a) / Hn.R, Math.sin(th * rad) * Math.sin(a) / Hn.R, Math.cos(a) / Hn.H]; const l = Math.hypot(...n); return n.map((v) => v / l); };
// recorta un polígono por el plano del corte (se queda lo de detrás, y ≤ YC)
const recorta = (pts) => { const out = []; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length], dp = p[1] <= YC, dq = q[1] <= YC; if (dp) out.push(p); if (dp !== dq) { const t = (YC - p[1]) / (q[1] - p[1]); out.push([p[0] + (q[0] - p[0]) * t, YC, p[2] + (q[2] - p[2]) * t]); } } return out; };
const NG = 96, NB = 12;
const gajos = [];
for (let i = 0; i < NG; i++) for (let j = 0; j < NB; j++) {
  const t0 = 360 * i / NG, t1 = 360 * (i + 1) / NG, a0 = j / NB * Math.PI / 2, a1 = (j + 1) / NB * Math.PI / 2;
  const tm = (t0 + t1) / 2, am = (a0 + a1) / 2, n = normal(tm, am), vis = dot3(n, V);
  gajos.push({ t0, t1, a0, a1, tm, am, n, vis });
}
const quad = (g, R, H) => recorta([sup(g.t0, g.a0, R, H), sup(g.t1, g.a0, R, H), sup(g.t1, g.a1, R, H), sup(g.t0, g.a1, R, H)]);
// las hiladas: tramos de un anillo de la bóveda que se ven (por fuera o por dentro) y están detrás del corte
function hiladas(alturas, R, H, ve) {
  let d = '';
  for (const zz of alturas) {
    const a = Math.acos(Math.min(1, zz / H)); let tramo = [];
    const corta = () => { if (tramo.length > 1) d += linea(tramo); tramo = []; };
    for (let th = 0; th <= 720; th += 0.5) { const p = sup(th, a, R, H); if (p[1] <= YC && ve(th, a)) tramo.push(p); else corta(); if (th >= 360 && !tramo.length) break; }
    corta();
  }
  return d;
}
function poyo() {
  const p = POYO, out = [];
  out.push(S(k.slabOf(p, 0, Hn.z0, P, 4, 0.5), { tone: 'mid', className: 'piedra' }));
  // las hiladas de piedra en la cara de delante (+y) y en la de la derecha (+x)
  let hil = '';
  for (const z of [1.7, 3.4]) { const esq = []; for (let j = 0; j <= 8; j++) { const t = Math.PI / 2 * (1 - j / 8); esq.push([p.x + p.w - p.r + Math.cos(t) * p.r, p.y + p.d - p.r + Math.sin(t) * p.r, z]); } hil += linea([[p.x + 0.6, p.y + p.d, z], ...esq, [p.x + p.w, p.y + 0.6, z]]); }
  let jun = '';
  for (let f = 0; f < 3; f++) {
    const z0 = f * 1.7, z1 = Math.min(Hn.z0 - 0.4, z0 + 1.7);
    for (let x = p.x + 2.4 + (f % 2) * 2.2; x < p.x + p.w - 1; x += 4.4) if (Math.abs(x - TERMO.x) > TERMO.r + 1.2) jun += linea([[x, p.y + p.d, f ? z0 : 0.4], [x, p.y + p.d, z1]]);
    for (let y = p.y + p.d - 2.6 - (f % 2) * 2.2; y > p.y + 1; y -= 4.4) jun += linea([[p.x + p.w, y, f ? z0 : 0.4], [p.x + p.w, y, z1]]);
  }
  out.push(L(hil + jun, { tone: 'lo' }));
  // el termómetro, en la cara de delante
  const { x, y, z, r } = TERMO, F = FY(x, y, z);
  out.push(S(G.solidOf([[0, r + 0.45], [0.55, r + 0.45], [0.75, r + 0.2]], F, P), { tone: 'mid', className: 'hierro' }));
  const esfera = Array.from({ length: 36 }, (_, i) => { const t = i / 36 * Math.PI * 2; return [x + Math.cos(t) * r, y + 0.76, z + Math.sin(t) * r]; });
  out.push(`<path class="esfera" d="${poly(esfera)}"/>`);
  const tick = (T, l) => { const al = (-135 + T / 350 * 270) * rad; return linea([[x + Math.sin(al) * (r - l), y + 0.77, z + Math.cos(al) * (r - l)], [x + Math.sin(al) * (r - 0.18), y + 0.77, z + Math.cos(al) * (r - 0.18)]]); };
  let men = '', may = '';
  for (let T = 0; T <= 350; T += 25) (T % 50 ? (men += tick(T, 0.45)) : (may += tick(T, 0.75)));
  out.push(L(men, { tone: 'lo' }), L(may, { tone: 'mid' }));
  // la franja del pan (de 200 a 300 grados), en el canto de la esfera
  const arco = []; for (let T = 200; T <= 300; T += 5) { const al = (-135 + T / 350 * 270) * rad; arco.push([x + Math.sin(al) * (r - 0.1), y + 0.78, z + Math.cos(al) * (r - 0.1)]); }
  out.push(`<path class="franja-pan" d="${linea(arco)}"/>`);
  out.push(L(poly(esfera), { tone: 'mid' }));
  out.push(k.faceTextSvg(k.sideMatrix([x - 0.55, y + 0.78], z - 0.7, P, 'left'), '°C', { size: 0.75, tone: 'mid' }));
  out.push(D([[x - r - 0.25, z], [x + r + 0.25, z]].map(([px, pz]) => at([px, y + 0.56, pz])), { size: 0.3, tone: 'mid' }));
  return `<g data-part="poyo">${out.join('')}</g><g data-part="aguja"></g>`;
}
function solera() {
  // la solera: baldosas de barro sobre un lecho de arena, cortadas por delante
  const out = [], R = Hn.Ri, d = YC - Hn.cy, w = Math.sqrt(R * R - d * d);
  const circ = recorta(Array.from({ length: 96 }, (_, i) => { const t = i / 96 * Math.PI * 2; return [Hn.cx + Math.cos(t) * R, Hn.cy + Math.sin(t) * R, ZF]; }));
  out.push(`<path class="arena" d="${poly([[Hn.cx - w, YC, Hn.z0], [Hn.cx + w, YC, Hn.z0], [Hn.cx + w, YC, ZF - 0.22], [Hn.cx - w, YC, ZF - 0.22]])}"/>`);
  out.push(`<path class="baldosa-canto" d="${poly([[Hn.cx - w, YC, ZF - 0.22], [Hn.cx + w, YC, ZF - 0.22], [Hn.cx + w, YC, ZF], [Hn.cx - w, YC, ZF]])}"/>`);
  out.push(`<path class="solera" d="${poly(circ)}"/>`);
  let bal = '';
  for (let x = Hn.cx - R + 2.3; x < Hn.cx + R - 0.4; x += 2.3) { const h = Math.sqrt(R * R - (x - Hn.cx) ** 2); bal += linea([[x, Hn.cy - h, ZF], [x, Math.min(YC, Hn.cy + h), ZF]]); }
  for (let y = Hn.cy - R + 2.3; y < YC - 0.2; y += 2.3) { const h = Math.sqrt(R * R - (y - Hn.cy) ** 2); bal += linea([[Hn.cx - h, y, ZF], [Hn.cx + h, y, ZF]]); }
  let cantos = ''; for (let x = Hn.cx - R + 2.3; x < Hn.cx + w - 0.2; x += 2.3) if (x > Hn.cx - w + 0.2) cantos += linea([[x, YC, ZF - 0.22], [x, YC, ZF]]);
  out.push(L(bal + cantos, { tone: 'faint' }));
  out.push(L(poly(circ), { tone: 'lo' }));
  out.push(L(poly([[Hn.cx - w, YC, Hn.z0], [Hn.cx + w, YC, Hn.z0], [Hn.cx + w, YC, ZF], [Hn.cx - w, YC, ZF]]) + linea([[Hn.cx - w, YC, ZF - 0.22], [Hn.cx + w, YC, ZF - 0.22]]), { tone: 'lo' }));
  return `<g data-part="solera">${out.join('')}</g>`;
}
function bovedaDentro() {
  const out = [];
  // los gajos que miran hacia atrás: se les ve la cara de dentro, por el corte
  const dentro = gajos.filter((g) => g.vis <= 0).map((g) => ({ g, q: quad(g, Hn.Ri, Hn.Hi) })).filter((o) => o.q.length > 2).sort((a, b) => dep(sup(a.g.tm, a.g.am, Hn.Ri, Hn.Hi)) - dep(sup(b.g.tm, b.g.am, Hn.Ri, Hn.Hi)));
  for (const { g, q } of dentro) out.push(`<path class="bi bi${nivel(dot3(g.n.map((v) => -v), LZ), 4)}" d="${poly(q)}"/>`);
  // las hiladas de ladrillo por dentro y sus juntas, a tresbolillo
  const ve = (th, a) => dot3(normal(th, a), V) < -0.004;
  const alturas = [1.1, 2.2, 3.3, 4.4, 5.4, 6.3, 7.0];
  out.push(`<path class="iso-line juntas" d="${hiladas(alturas, Hn.Ri - 0.02, Hn.Hi - 0.02, ve)}"/>`);
  let jun = '';
  for (let f = 0; f < alturas.length; f++) {
    const z0 = f ? alturas[f - 1] : Hn.solera, z1 = alturas[f], a0 = Math.acos(z0 / Hn.Hi), a1 = Math.acos(z1 / Hn.Hi), paso = 13 + f * 3;
    for (let th = (f % 2) * paso / 2; th < 360; th += paso) { const p0 = sup(th, a0, Hn.Ri - 0.02, Hn.Hi - 0.02), p1 = sup(th, a1, Hn.Ri - 0.02, Hn.Hi - 0.02); if (p0[1] <= YC - 0.3 && p1[1] <= YC - 0.3 && ve(th, a0) && ve(th, a1)) jun += linea([p0, p1]); }
  }
  out.push(`<path class="iso-line juntas" d="${jun}"/>`);
  return `<g data-part="boveda-dentro">${out.join('')}</g>`;
}
function bovedaFuera() {
  const out = [];
  const fuera = gajos.filter((g) => g.vis > 0).map((g) => ({ g, q: quad(g, Hn.R, Hn.H) })).filter((o) => o.q.length > 2).sort((a, b) => dep(sup(a.g.tm, a.g.am, Hn.R, Hn.H)) - dep(sup(b.g.tm, b.g.am, Hn.R, Hn.H)));
  for (const { g, q } of fuera) out.push(`<path class="bf bf${nivel(dot3(g.n, LZ), 6)}" d="${poly(q)}"/>`);
  // las hiladas de piedra por fuera, solo donde se ve la cara de fuera
  out.push(L(hiladas([1.6, 3.2, 4.8, 6.3, 7.7, 8.9], Hn.R + 0.02, Hn.H + 0.02, (th, a) => dot3(normal(th, a), V) > 0.004), { tone: 'lo' }));
  // el contorno: donde la bóveda deja de mirar a la cámara (detrás del corte)
  const lado = (sg) => { const pts = []; for (let j = 0; j <= 120; j++) { const a = Math.PI / 2 * (1 - j / 120), cot = Math.cos(a) / Math.max(1e-6, Math.sin(a)), q = -(Hn.R / Hn.H) * cot * V[2] / Math.hypot(V[0], V[1]); if (q < -1) break; const p = sup(VA / rad + sg * Math.acos(q) / rad, a, Hn.R, Hn.H); if (p[1] <= YC) pts.push(p); } return pts; };
  out.push(L(linea(lado(-1).concat(lado(1).reverse())), { tone: 'mid' }));
  return `<g data-part="boveda-fuera">${out.join('')}</g>`;
}
function cortes() {
  // la sección de la bóveda en el plano del corte: ladrillo refractario, barro con paja y piedra
  const out = [], d = YC - Hn.cy, k1 = Math.sqrt(1 - d * d / (Hn.R * Hn.R)), k2 = Math.sqrt(1 - d * d / (Hn.Ri * Hn.Ri));
  const arco = (f) => { const R = Hn.Ri * k2 + (Hn.R * k1 - Hn.Ri * k2) * f, H = Hn.Hi * k2 + (Hn.H * k1 - Hn.Hi * k2) * f, pts = []; for (let j = 0; j <= 48; j++) { const b = j / 48 * Math.PI; pts.push([Hn.cx + Math.cos(b) * R, YC, Hn.z0 + Math.sin(b) * H]); } return pts; };
  const capas = [[0, 0.36, 'corte-ladrillo'], [0.36, 0.72, 'corte-barro'], [0.72, 1, 'corte-piedra']];
  for (const [f0, f1, cls] of capas) out.push(`<path class="${cls}" d="${poly(arco(f1).concat(arco(f0).reverse()))}"/>`);
  // las juntas de los ladrillos (radiales, en la capa de dentro) y las piedras de fuera
  let jun = '';
  const a0 = arco(0), a1 = arco(0.36), a2 = arco(0.72), a3 = arco(1);
  for (let j = 2; j < 48; j += 3) jun += linea([a0[j], a1[j]]);
  for (let j = 4; j < 46; j += 6) jun += linea([a2[j], a3[j]]);
  out.push(L(jun + linea(a1) + linea(a2), { tone: 'lo' }));
  // la paja del barro: motas
  const motas = []; for (let j = 3; j < 46; j += 2.5) { const i = Math.round(j), f = 0.45 + 0.18 * ((i * 7) % 3) / 2; const R = Hn.Ri * k2 + (Hn.R * k1 - Hn.Ri * k2) * f, H = Hn.Hi * k2 + (Hn.H * k1 - Hn.Hi * k2) * f, b = i / 48 * Math.PI; motas.push(at([Hn.cx + Math.cos(b) * R, YC, Hn.z0 + Math.sin(b) * H])); }
  out.push(D(motas, { size: 0.28, tone: 'mid' }));
  out.push(L(poly(a3.concat([...a0].reverse())), { tone: 'mid' }));
  return `<g data-part="cortes">${out.join('')}</g>`;
}
// el arco de la boca, en el plano x de la cara de la embocadura
const arcoBoca = (x, dy = 0) => { const r = (BOCA.y1 - BOCA.y0) / 2 + dy, yc = (BOCA.y0 + BOCA.y1) / 2, pts = [[x, yc - r, dy ? Hn.z0 : ZF]]; for (let j = 0; j <= 20; j++) { const b = Math.PI - j / 20 * Math.PI; pts.push([x, yc + Math.cos(b) * r, BOCA.arranque + Math.sin(b) * r]); } pts.push([x, yc + r, dy ? Hn.z0 : ZF]); return pts; };
function fachada() {
  const f = FACHADA, out = [];
  out.push(S(k.slabOf({ x: f.x0, y: f.y0, w: f.x1 - f.x0, d: f.y1 - f.y0, r: 0.2 }, Hn.z0, f.z1 - Hn.z0, P, 2, 0.25), { tone: 'mid', className: 'piedra' }));
  out.push(S(k.slabOf({ x: f.x0 - 0.4, y: f.y0 - 0.5, w: f.x1 - f.x0 + 0.8, d: f.y1 - f.y0 + 1, r: 0.2 }, f.z1, 0.8, P, 2, 0.2), { tone: 'mid', className: 'piedra' }));
  // la boca: se ve el túnel por dentro (el suelo y la pared del fondo) y lo que pasa a través
  const x = f.x1 + 0.01, hueco = arcoBoca(x);
  out.push(`<clipPath id="pan-boca"><path d="${poly(hueco)}"/></clipPath>`);
  out.push(`<g clip-path="url(#pan-boca)"><path class="boca" d="${poly(hueco)}"/><path class="tunel" d="${poly([[x, BOCA.y0, ZF], [x - 4.6, BOCA.y0, ZF], [x - 4.6, BOCA.y1, ZF], [x, BOCA.y1, ZF]])}"/><path class="tunel2" d="${poly([[x, BOCA.y0, ZF], [x - 4.6, BOCA.y0, ZF], [x - 4.6, BOCA.y0, BOCA.arranque], [x, BOCA.y0, BOCA.arranque]])}"/><g data-part="en-boca"></g></g>`);
  // las dovelas del arco y las hiladas de la cara
  const fuera = arcoBoca(x, 1.1), dentro = arcoBoca(x);
  out.push(`<path class="dovelas" d="${poly(fuera.slice(1, -1).concat(dentro.slice(1, -1).reverse()))}"/>`);
  let jun = '';
  for (let j = 0; j <= 20; j += 2.5) { const i = Math.round(j) + 1; jun += linea([dentro[i], fuera[i]]); }
  const r0 = (BOCA.y1 - BOCA.y0) / 2;
  for (const yy of [BOCA.y0 - 1.1, BOCA.y1 + 1.1]) jun += linea([[x, yy, Hn.z0 + 0.05], [x, yy, BOCA.arranque]]);
  for (const z of [6.8, 9.0, 11.0, 12.7]) {
    const tramos = [];
    if (z < BOCA.arranque) tramos.push([f.y0, BOCA.y0 - 1.1], [BOCA.y1 + 1.1, f.y1]);
    else { const dz = z - BOCA.arranque, w = dz < r0 + 1.1 ? Math.sqrt((r0 + 1.1) ** 2 - dz * dz) : 0; if (w > 0) tramos.push([f.y0, (BOCA.y0 + BOCA.y1) / 2 - w], [(BOCA.y0 + BOCA.y1) / 2 + w, f.y1]); else tramos.push([f.y0, f.y1]); }
    for (const [a, b] of tramos) if (b - a > 0.4) jun += linea([[x, a, z], [x, b, z]]);
  }
  out.push(L(jun, { tone: 'lo' }));
  out.push(L(poly(fuera.slice(1, -1).concat(dentro.slice(1, -1).reverse())), { tone: 'mid' }));
  return `<g data-part="fachada">${out.join('')}</g>`;
}
function horno() {
  return `<g data-part="horno">${poyo()}${solera()}${bovedaDentro()}<g data-part="dentro"></g>${bovedaFuera()}${cortes()}${fachada()}</g><g data-part="humo"></g>`;
}

// ---------- el escobón, apoyado en el poyo (el hurgón y la pala, vivos) ----------
function escobon() {
  const pie = [-35.6, -12.4, 0.9], arriba = [-35.9, -19.6, 10.4], out = [];
  out.push(`<path class="iso-line palo" data-tone="mid" d="${linea([pie, arriba])}"/>`);
  // la cabeza: un manojo de trapos mojados atado al palo
  const tiras = []; for (let i = 0; i < 7; i++) { const a = -0.9 + i * 0.3; tiras.push([[pie[0], pie[1] + 0.3, pie[2] + 0.5], [pie[0] + Math.sin(a) * 1.7, pie[1] + 0.9 + Math.cos(a) * 0.4, 0.05]]); }
  out.push(`<path class="iso-line trapo" data-tone="hi" d="${tiras.map(linea).join('')}"/>`);
  out.push(D(tiras.map((t) => at(t[1])), { size: 0.32, tone: 'hi' }));
  out.push(D([at([pie[0], pie[1] + 0.3, pie[2] + 0.5]), at(arriba)], { size: 0.45, tone: 'mid' }));
  return `<g data-part="escobon">${out.join('')}</g>`;
}

// ---------- el tablero donde reposa la masa (los panes y la manta, vivos) ----------
function mesa() {
  const t = TABLERO, out = [];
  for (const cx of [t.x + 4, t.x + t.w - 4]) {
    for (const py of [t.y + 1, t.y + t.d - 1]) if (py < t.y + 2) out.push(pata(cx, py, 0, t.z, 0.45));
    out.push(caja(cx - 0.5, cx + 0.5, t.y + 0.4, t.y + t.d - 0.4, t.z - 0.7, 0.7, 'madera', 0.1));
  }
  for (const cx of [t.x + 4, t.x + t.w - 4]) out.push(pata(cx, t.y + t.d - 1, 0, t.z - 0.7, 0.45));
  out.push(caja(t.x, t.x + t.w, t.y, t.y + t.d, t.z, t.h, 'madera'));
  let vetas = ''; for (const yy of [t.y + 2.7, t.y + 5.3]) vetas += linea([[t.x + 0.12, yy, t.z + t.h], [t.x + t.w - 0.12, yy, t.z + t.h]]);
  out.push(L(vetas, { tone: 'faint' }));
  // la pintadera: el sello de madera con la señal de la casa
  const zt = t.z + t.h;
  out.push(S(G.solidOf([[0, 1.1], [0.5, 1.1], [0.7, 0.4], [2.1, 0.4], [2.5, 0.6]], FZ(t.x + t.w - 1.8, t.y + 1.8, zt), P), { tone: 'mid', className: 'madera' }));
  return `<g data-part="mesa">${out.join('')}</g><g data-part="panes-mesa"></g><g data-part="manta"></g>`;
}

// ---------- la rejilla donde se enfría el pan ----------
function rejilla() {
  const r = REJILLA, out = [], esq = [[r.x + 1, r.y + 1], [r.x + r.w - 1, r.y + 1], [r.x + 1, r.y + r.d - 1], [r.x + r.w - 1, r.y + r.d - 1]];
  for (const [px, py] of porDepth(esq, ([q, w]) => [q, w, 0])) out.push(pata(px, py, 0, r.z, 0.45));
  for (const yy of [r.y + 0.4, r.y + r.d - 1.2]) out.push(caja(r.x, r.x + r.w, yy, yy + 0.8, r.z - 0.6, 0.6, 'madera', 0.1));
  for (let i = 0; i < 5; i++) { const yy = r.y + 0.3 + i * 2; out.push(caja(r.x + 0.4, r.x + r.w - 0.4, yy, yy + 1.2, r.z, 0.5, 'madera', 0.1)); }
  return `<g data-part="rejilla">${out.join('')}</g><g data-part="panes-rejilla"></g>`;
}

// ---------- la figura ----------
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta del horno de leña del pueblo, abierto en cuña para ver dentro: la bóveda de ladrillo, barro y piedra, la solera, la boca en arco con su puerta de hierro y un termómetro; la pila de leña, la artesa con la masa, el saco de harina, la masa madre y el cántaro, el tablero donde crecen los panes bajo la manta, la pala, el hurgón, el escobón y la rejilla donde se enfría el pan.',
  body: [tablero(), lena(), artesa(), despensa(), horno(), escobon(), '<g data-part="hurgon"></g>', '<g data-part="puerta"></g>', mesa(), rejilla(), '<g data-part="pala"></g>'],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const ZF = ${HORNO.z0 + HORNO.solera}, P = ${JSON.stringify(P)}, Hn = ${JSON.stringify(HORNO)}, BOCA = ${JSON.stringify(BOCA)}, FACHADA = ${JSON.stringify(FACHADA)}, TERMO = ${JSON.stringify(TERMO)}, ARTESA = ${JSON.stringify(ARTESA)}, TABLERO = ${JSON.stringify(TABLERO)}, REJILLA = ${JSON.stringify(REJILLA)}, POYO = ${JSON.stringify(POYO)}, PUESTOS = ${JSON.stringify(PUESTOS)};
const V = ${JSON.stringify(V)}, LZ = ${JSON.stringify(LZ)};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), f1 = (v) => v.toFixed(1), linea = (pts) => 'M' + pts.map((p) => { const q = at(p); return f1(q[0]) + ' ' + f1(q[1]); }).join('L'), poly = (pts) => linea(pts) + 'Z';
const K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = {}; for (const n of ['lena', 'artesa', 'masa', 'despensa', 'horno', 'poyo', 'aguja', 'solera', 'boveda-dentro', 'dentro', 'boveda-fuera', 'fachada', 'en-boca', 'humo', 'escobon', 'hurgon', 'puerta', 'mesa', 'panes-mesa', 'manta', 'rejilla', 'panes-rejilla', 'pala']) el[n] = $(n);
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }, mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0;
const tourAt = (t) => { const T = 3 * N + 2, f = (t % T) / T * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
// ---- el modelo: la temperatura del horno (°C) y lo que hace cada pan ----
const temp = (s) => s < 2 ? 20 : s < 3 ? 20 + 280 * sm((s - 2) / 0.85) : s < 4 ? 300 - 40 * sm((s - 3) / 0.9) : s < 5 ? 260 - 10 * sm((s - 4) / 0.9) : 250 - 50 * sm((s - 5) / 0.6);
const M = [FACHADA.x1 + 0.6, (BOCA.y0 + BOCA.y1) / 2, ZF + 0.12];              // la boca, por fuera, a ras de la solera
const BM = [FACHADA.x1 - 1.5, M[1], ZF + 0.12];                                  // el punto del túnel por donde pasa el palo
const MESA = [0, 1, 2, 3].map((i) => [TABLERO.x + 7 + i * 6.2, TABLERO.y + TABLERO.d / 2, TABLERO.z + TABLERO.h]);
const DENTRO = [[-30.2, -33.6], [-30.2, -29.2], [-24, -34], [-23.6, -29.4]].map(([x, y]) => [x, y, ZF + 0.02]);
const FRIO = [0, 1, 2, 3].map((i) => [REJILLA.x + 4.5 + i * 6.4, REJILLA.y + REJILLA.d / 2, REJILLA.z + 0.5]);
const REPOSO_PALA = [-10.4, M[1], Hn.z0 + 0.12];
const arcoTray = (a, b, t, alto) => { const p = mix(a, b, t); p[2] += Math.sin(t * Math.PI) * alto; return p; };
// la pala: dónde va la hoja en cada momento, y si lleva un pan (índice) encima
function pala(s) {
  if (s >= 4.15 && s < 4.95) { const i = Math.min(3, Math.floor((s - 4.15) / 0.2)), f = (s - 4.15 - i * 0.2) / 0.2;
    if (f < 0.2) return { b: mix(i ? M : REPOSO_PALA, MESA[i], sm(f / 0.2)), lleva: -1 };
    if (f < 0.5) return { b: arcoTray(MESA[i], M, sm((f - 0.2) / 0.3), 1.2), lleva: i };
    if (f < 0.8) return { b: mix(M, DENTRO[i], sm((f - 0.5) / 0.3)), lleva: i };
    return { b: mix(DENTRO[i], i === 3 ? REPOSO_PALA : M, sm((f - 0.8) / 0.2)), lleva: -1 }; }
  if (s >= 5.58 && s < 5.98) { const i = Math.min(3, Math.floor((s - 5.58) / 0.1)), f = (s - 5.58 - i * 0.1) / 0.1;
    if (f < 0.25) return { b: mix(i ? FRIO[i - 1].map((v, j) => j === 2 ? v : v) : REPOSO_PALA, DENTRO[i], sm(f / 0.25)), lleva: -1 };
    if (f < 0.55) return { b: mix(DENTRO[i], M, sm((f - 0.25) / 0.3)), lleva: i };
    return { b: arcoTray(M, FRIO[i], sm((f - 0.55) / 0.45), 2.5), lleva: i }; }
  if (s >= 5.98) return { b: mix(FRIO[3], REPOSO_PALA, sm((s - 5.98) / 0.02)), lleva: -1 };
  return { b: REPOSO_PALA, lleva: -1 };
}
function pan(i, s) {
  const crece = 1 + sm((s - 1.3) / 0.6) * 0.75, sale = sm((s - 1.05) / 0.3), cocido = sm((s - 5.08) / 0.42), marca = sm((s - 4.0) / 0.15);
  const pa = pala(s);
  let donde, p;
  if (s < 4.15 + i * 0.2 + 0.04) { donde = 'mesa'; p = MESA[i]; }
  else if (s < 5.58 + i * 0.1 + 0.025) { donde = pa.lleva === i ? 'pala' : 'horno'; p = pa.lleva === i ? pa.b : DENTRO[i]; }
  else { donde = pa.lleva === i ? 'pala' : 'rejilla'; p = pa.lleva === i ? pa.b : FRIO[i]; }
  if (donde === 'pala') p = [p[0], p[1], p[2] + 0.18];
  const horno = sm((s - 4.3 - i * 0.2) / 0.5) * 0.1;
  return { donde, p, r: 2.25 * (0.6 + 0.4 * sale) * (1 + (crece - 1) * 0.3), h: 1.3 * sale * crece * (1 + horno), cocido, marca, vivo: sale > 0.01 };
}
// un pan: la envolvente de su media esfera aplastada, el brillo del lado de la luz y la señal de su casa
const casco = (pts) => { pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
const path2 = (pts) => 'M' + pts.map((q) => f1(q[0]) + ' ' + f1(q[1])).join('L') + 'Z';
function cupula(c, rx, ry, rz, filtro) { const pts = []; for (let j = 0; j <= 6; j++) { const a = j / 6 * Math.PI / 2; for (let i = 0; i < 24; i++) { const t = i / 24 * Math.PI * 2, n = [Math.cos(t) * Math.sin(a) / rx, Math.sin(t) * Math.sin(a) / ry, Math.cos(a) / rz]; if (filtro && !filtro(n)) continue; pts.push(at([c[0] + rx * Math.cos(t) * Math.sin(a), c[1] + ry * Math.sin(t) * Math.sin(a), c[2] + rz * Math.cos(a)])); } } return pts.length > 2 ? path2(casco(pts)) : ''; }
const SENAL = [[[-0.55, -0.55, 0.55, 0.55], [-0.55, 0.55, 0.55, -0.55]], [[-0.6, -0.35, 0.6, -0.35], [-0.6, 0.05, 0.6, 0.05], [-0.6, 0.45, 0.6, 0.45]], [[0, -0.65, 0, 0.65], [-0.65, 0, 0.65, 0]], [[-0.6, -0.5, 0.6, 0.5]]];
function hogaza(q, i) {
  if (!q.vivo) return '';
  const c = q.p, br = (n) => { const l = Math.hypot(...n); return (n[0] * LZ[0] + n[1] * LZ[1] + n[2] * LZ[2]) / l > 0.72; };
  let o = '<g class="hogaza" style="--cocido:' + q.cocido.toFixed(2) + '"><path class="pan-cuerpo" d="' + cupula(c, q.r, q.r, q.h) + '"/><path class="pan-brillo" d="' + cupula(c, q.r * 0.98, q.r * 0.98, q.h * 0.98, br) + '"/>';
  if (q.marca > 0.02) { let d = ''; for (const [u0, v0, u1, v1] of SENAL[i]) { const seg = []; for (let k = 0; k <= 6; k++) { const u = (u0 + (u1 - u0) * k / 6) * q.r * 0.7, v = (v0 + (v1 - v0) * k / 6) * q.r * 0.7, rr = Math.min(0.98, Math.hypot(u, v) / q.r); seg.push([c[0] + u, c[1] + v, c[2] + q.h * Math.sqrt(1 - rr * rr) + 0.02]); } d += linea(seg); } o += '<path class="pan-greña" style="opacity:' + q.marca.toFixed(2) + '" d="' + d + '"/>'; }
  return o + '</g>';
}
// la pala: la hoja (un tablero fino y redondeado) y el palo, que pasa por la boca cuando está dentro
function palaSvg(b, cls) {
  const dentro = b[0] < FACHADA.x0 + 0.2, dir = dentro ? (() => { const d = [BM[0] - b[0], BM[1] - b[1], BM[2] + 0.5 - b[2]]; const l = Math.hypot(...d); return d.map((v) => v / l); })() : [1, 0, 0.045];
  const lado = [-dir[1], dir[0], 0], lh = Math.hypot(lado[0], lado[1]) || 1, u = [lado[0] / lh, lado[1] / lh, 0];
  const hoja = []; for (let k = 0; k <= 12; k++) { const t = -Math.PI / 2 + k / 12 * Math.PI; hoja.push([b[0] - dir[0] * Math.cos(t) * 2.2 + u[0] * Math.sin(t) * 2.4, b[1] - dir[1] * Math.cos(t) * 2.2 + u[1] * Math.sin(t) * 2.4, b[2] - dir[2] * Math.cos(t) * 2.2]); }
  hoja.push([b[0] + dir[0] * 1.6 + u[0] * 1.4, b[1] + dir[1] * 1.6 + u[1] * 1.4, b[2] + dir[2] * 1.6], [b[0] + dir[0] * 2.4 + u[0] * 0.3, b[1] + dir[1] * 2.4 + u[1] * 0.3, b[2] + dir[2] * 2.4], [b[0] + dir[0] * 2.4 - u[0] * 0.3, b[1] + dir[1] * 2.4 - u[1] * 0.3, b[2] + dir[2] * 2.4], [b[0] + dir[0] * 1.6 - u[0] * 1.4, b[1] + dir[1] * 1.6 - u[1] * 1.4, b[2] + dir[2] * 1.6]);
  const p0 = [b[0] + dir[0] * 2.4, b[1] + dir[1] * 2.4, b[2] + dir[2] * 2.4], p1 = [b[0] + dir[0] * 19, b[1] + dir[1] * 19, b[2] + dir[2] * 19 + (dentro ? 0 : 0)];
  const pomo = '<g class="iso-dots" data-tone="mid"><circle r=".6" cx="' + f1(at(p1)[0]) + '" cy="' + f1(at(p1)[1]) + '"/></g>';
  return { hoja: '<path class="pala-hoja ' + cls + '" d="' + poly(hoja) + '"/>', palo: '<path class="iso-line palo ' + cls + '" data-tone="mid" d="' + linea([p0, p1]) + '"/>' + pomo, punta: p1, cuello: p0 };
}
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s)), T = temp(s);
  // la bóveda: negra de hollín en frío; con el fuego se pone naranja, y a 300 grados blanquea
  const fuego = s > 2.05 && s < 3.15 ? sm((s - 2.05) / 0.3) * (1 - sm((s - 2.85) / 0.3)) : 0, brasa = s > 2.6 && s < 3.9 ? sm((s - 2.6) / 0.3) * (1 - sm((s - 3.15) / 0.65)) : 0;
  el.horno.style.setProperty('--blanco', sm((T - 225) / 70).toFixed(2));
  el.horno.style.setProperty('--fuego', Math.max(fuego, brasa * 0.6).toFixed(2));
  // el termómetro
  const al = (-135 + clamp(T, 0, 350) / 350 * 270) * Math.PI / 180, cen = [TERMO.x, TERMO.y + 0.8, TERMO.z], pun = [cen[0] + Math.sin(al) * (TERMO.r - 0.35), cen[1], cen[2] + Math.cos(al) * (TERMO.r - 0.35)], col = [cen[0] - Math.sin(al) * 0.5, cen[1], cen[2] - Math.cos(al) * 0.5];
  el.aguja.innerHTML = '<path class="iso-line aguja" data-tone="hi" d="' + linea([cen, pun]) + '"/><g class="iso-dots" data-tone="hi"><circle r=".42" cx="' + f1(at(cen)[0]) + '" cy="' + f1(at(cen)[1]) + '"/></g>';
  // la masa en la artesa: se amasa (se aplasta y se estira) y luego se reparte en panes
  const queda = 1 - sm((s - 1.0) / 0.3);
  if (queda > 0.01) { const am = paso === 0 ? Math.sin(reloj * 5) : 0, c = [ARTESA.x + 9, ARTESA.y + 4.5, ARTESA.z0 + ARTESA.h - 3]; const rx = 5.6 * (1 + 0.1 * am) * (0.4 + 0.6 * queda), ry = 2.8 * (0.4 + 0.6 * queda), rz = 2.5 * (1 - 0.22 * am) * queda;
    let pl = ''; for (const f of [-0.35, 0.1, 0.5]) { const seg = []; for (let k = 0; k <= 8; k++) { const t = -0.9 + k / 8 * 1.8, u = (f + Math.sin(t) * 0.18) * rx, v = Math.sin(t) * ry * 0.8, rr = Math.min(0.97, Math.hypot(u / rx, v / ry)); seg.push([c[0] + u, c[1] + v, c[2] + rz * Math.sqrt(1 - rr * rr) + 0.02]); } pl += linea(seg); }
    el.masa.innerHTML = '<g class="hogaza" style="--cocido:0"><path class="pan-cuerpo" d="' + cupula(c, rx, ry, rz) + '"/><path class="pan-greña" d="' + pl + '"/></g>'; }
  else el.masa.innerHTML = '';
  // los panes
  const panes = [0, 1, 2, 3].map((i) => pan(i, s)), pa = pala(s);
  const de = (w) => panes.map((q, i) => [q, i]).filter(([q]) => q.donde === w).sort((a, b) => depthOf(a[0].p, P) - depthOf(b[0].p, P)).map(([q, i]) => hogaza(q, i)).join('');
  el['panes-mesa'].innerHTML = de('mesa'); el['panes-rejilla'].innerHTML = de('rejilla');
  // la manta: tapa los panes mientras crecen (y mientras se calienta el horno)
  const manta = sm((s - 1.15) / 0.15) * (1 - sm((s - 3.95) / 0.1));
  if (manta > 0.01) { const zb = TABLERO.z + TABLERO.h, y0 = TABLERO.y + 0.5, y1 = TABLERO.y + TABLERO.d - 0.5, xs = [], zs = [];
    for (let x = MESA[0][0] - 3.4; x <= MESA[3][0] + 3.4 + 1e-6; x += 0.4) { let z = zb + 0.25; for (const q of panes) if (q.donde === 'mesa') { const dx = (x - q.p[0]) / (q.r + 0.35); if (Math.abs(dx) < 1) z = Math.max(z, zb + (q.h + 0.25) * Math.sqrt(1 - dx * dx)); } xs.push(x); zs.push(z); }
    let top = '', cara = [];
    for (let j = 0; j < xs.length - 1; j++) { const sl = (zs[j + 1] - zs[j]) / 0.4, b = (-sl * LZ[0] + LZ[2]) / Math.hypot(sl, 1), nv = Math.max(0, Math.min(3, Math.floor((b + 0.2) * 3))); top += '<path class="manta m' + nv + '" d="' + poly([[xs[j], y0, zs[j]], [xs[j + 1], y0, zs[j + 1]], [xs[j + 1], y1, zs[j + 1]], [xs[j], y1, zs[j]]]) + '"/>'; }
    for (let j = 0; j < xs.length; j++) cara.push([xs[j], y1, zs[j]]);
    const frente = cara.concat([[xs[xs.length - 1], y1 + 0.15, zb], [xs[0], y1 + 0.15, zb]]);
    el.manta.innerHTML = '<g style="opacity:' + manta.toFixed(2) + '">' + top + '<path class="manta-cara" d="' + poly(frente) + '"/><path class="iso-line" data-tone="lo" d="' + linea(cara) + '"/></g>'; }
  else el.manta.innerHTML = '';
  // dentro del horno: la leña y las llamas, las brasas, los panes que se cuecen
  let dentro = '';
  const lena = s > 1.9 && s < 3.2 ? 1 - sm((s - 2.75) / 0.4) : 0;
  if (lena > 0.01) { const c = [Hn.cx - 0.8, Hn.cy - 1.2, ZF + 0.7]; for (const [a, l] of [[0.25, 6.4], [-0.5, 6], [1.3, 5.4]]) { const d = [Math.cos(a) * l / 2, Math.sin(a) * l / 2]; dentro += '<path class="leño" style="opacity:' + lena.toFixed(2) + '" stroke-width="' + f1(1.25 * K) + '" d="' + linea([[c[0] - d[0], c[1] - d[1], c[2]], [c[0] + d[0], c[1] + d[1], c[2] + 0.4]]) + '"/>'; } }
  const nb = Math.round(16 * Math.max(brasa, s >= 3 && s < 3.95 ? 1 - sm((s - 3.15) / 0.65) : 0));
  if (nb > 0) { const arrastre = sm((s - 3.15) / 0.65); let b = ''; for (let i = 0; i < nb; i++) { const a = i * 2.4, r = 0.6 + (i % 4) * 1.15, x = Hn.cx - 0.8 + Math.cos(a) * r + arrastre * 6 * (i % 3) / 2, y = Hn.cy - 1.2 + Math.sin(a) * r * 0.8, q = at([x, y, ZF + 0.2]); b += '<circle cx="' + f1(q[0]) + '" cy="' + f1(q[1]) + '" r="' + (0.5 + (i % 3) * 0.22 + 0.15 * Math.sin(reloj * 6 + i)).toFixed(2) + '"/>'; } dentro += '<g class="brasas">' + b + '</g>'; }
  if (fuego > 0.02) for (let j = 0; j < 7; j++) { const a = j * 0.9 + 0.3, rr = j ? 1.6 + (j % 2) : 0, q = at([Hn.cx - 0.8 + Math.cos(a) * rr, Hn.cy - 1.2 + Math.sin(a) * rr * 0.8, ZF + 1]), h = (2.6 + 1.2 * Math.sin(reloj * 9 + j * 2.1)) * fuego * K * (j ? 0.8 : 1.3), w = (0.6 + 0.2 * (j % 2)) * K; dentro += '<path class="llama" d="M' + f1(q[0] - w) + ' ' + f1(q[1]) + 'Q' + f1(q[0] - w) + ' ' + f1(q[1] - h * 0.55) + ' ' + f1(q[0]) + ' ' + f1(q[1] - h) + 'Q' + f1(q[0] + w) + ' ' + f1(q[1] - h * 0.55) + ' ' + f1(q[0] + w) + ' ' + f1(q[1]) + 'Z"/>'; }
  dentro += de('horno');
  // la pala y el hurgón: lo que está dentro del horno se dibuja con el horno; lo de fuera, encima
  let fuera = '', boca = '', hur = '';
  const pv = palaSvg(pa.b, 'pala'), carga = pa.lleva >= 0 ? hogaza(panes[pa.lleva], pa.lleva) : '';
  if (pa.b[0] < FACHADA.x0 + 0.2) { dentro += pv.hoja + carga + pv.palo; boca += pv.palo; fuera += '<path class="iso-line palo" data-tone="mid" d="' + linea([[FACHADA.x1 + 0.05, pv.cuello[1] + (pv.punta[1] - pv.cuello[1]) * ((FACHADA.x1 + 0.05 - pv.cuello[0]) / (pv.punta[0] - pv.cuello[0])), pv.cuello[2] + (pv.punta[2] - pv.cuello[2]) * ((FACHADA.x1 + 0.05 - pv.cuello[0]) / (pv.punta[0] - pv.cuello[0]))], pv.punta]) + '"/><g class="iso-dots" data-tone="mid"><circle r=".6" cx="' + f1(at(pv.punta)[0]) + '" cy="' + f1(at(pv.punta)[1]) + '"/></g>'; }
  else fuera += pv.hoja + pv.palo + carga;
  // el hurgón: saca las brasas hacia la boca, adelante y atrás
  const hg = s >= 3.0 && s < 3.95 ? (s < 3.12 ? sm((s - 3.0) / 0.12) : s < 3.82 ? 1 : 1 - sm((s - 3.82) / 0.12)) : 0;
  const REPOSO_H = [[-33.4, -12.2, 0.4], [-33.8, -19.4, 10.6]];
  const vaiven = 0.5 - 0.5 * Math.cos((s - 3.12) / 0.7 * Math.PI * 6), cabezaDentro = [Hn.cx - 6 + vaiven * 9, Hn.cy - 1.2 + Math.sin(reloj * 1.3) * 1.5, ZF + 0.35];
  const dirH = (() => { const d = [BM[0] - cabezaDentro[0], BM[1] - cabezaDentro[1], BM[2] + 0.5 - cabezaDentro[2]]; const l = Math.hypot(...d); return d.map((v) => v / l); })();
  const cab = mix(REPOSO_H[0], cabezaDentro, hg), punta = mix(REPOSO_H[1], [cabezaDentro[0] + dirH[0] * 20, cabezaDentro[1] + dirH[1] * 20, cabezaDentro[2] + dirH[2] * 20], hg);
  const d2 = [punta[0] - cab[0], punta[1] - cab[1], punta[2] - cab[2]], l2 = Math.hypot(...d2), u2 = [-d2[1] / l2, d2[0] / l2, 0];
  const e1 = [cab[0] + u2[0] * 1.5, cab[1] + u2[1] * 1.5, cab[2]], e2 = [cab[0] - u2[0] * 1.5, cab[1] - u2[1] * 1.5, cab[2]];
  const travesano = '<path class="iso-line hurgon-cabeza" data-tone="hi" d="' + linea([e1, e2]) + '"/><g class="iso-dots" data-tone="hi">' + [e1, e2].map((q) => { const a = at(q); return '<circle r=".55" cx="' + f1(a[0]) + '" cy="' + f1(a[1]) + '"/>'; }).join('') + '</g>', palo = '<path class="iso-line palo" data-tone="mid" d="' + linea([cab, punta]) + '"/>';
  if (hg > 0.5) { dentro += travesano + palo; boca += palo; const t = (FACHADA.x1 + 0.05 - cab[0]) / (punta[0] - cab[0]); hur = '<path class="iso-line palo" data-tone="mid" d="' + linea([mix(cab, punta, clamp(t, 0, 1)), punta]) + '"/>'; }
  else hur = palo + travesano + '<g class="iso-dots" data-tone="mid"><circle r=".45" cx="' + f1(at(punta)[0]) + '" cy="' + f1(at(punta)[1]) + '"/></g>';
  el.dentro.innerHTML = dentro; el['en-boca'].innerHTML = boca; el.pala.innerHTML = fuera; el.hurgon.innerHTML = hur;
  // el humo: sale por la boca mientras arde la leña
  let humo = ''; const hm = Math.max(fuego, brasa * 0.35);
  if (hm > 0.02) for (let k = 0; k < 6; k++) { const f = (reloj * 0.3 + k / 6) % 1, q = at([FACHADA.x1 + 0.8 + f * 4, (BOCA.y0 + BOCA.y1) / 2 + Math.sin(reloj + k) * 0.8 * f, BOCA.clave + 0.4 + f * 9]); humo += '<ellipse class="humo" cx="' + f1(q[0]) + '" cy="' + f1(q[1]) + '" rx="' + f1((1 + f * 1.8) * K) + '" ry="' + f1((0.7 + f * 1.2) * K) + '" style="opacity:' + (hm * 0.5 * (1 - f)).toFixed(2) + '"/>'; }
  el.humo.innerHTML = humo;
  // la puerta de hierro: apoyada en el poyo; para cocer, tapa la boca
  const cierra = sm((s - 5.0) / 0.1) * (1 - sm((s - 5.5) / 0.08));
  const n0 = [0, 1, 0], n1 = [1, 0, 0], ang = cierra * Math.PI / 2, nrm = [Math.sin(ang), Math.cos(ang), 0], ej = [Math.cos(ang), -Math.sin(ang), 0];
  const base = mix([-12.6, POYO.y + POYO.d + 0.35, 0.1], [FACHADA.x1 + 0.25, (BOCA.y0 + BOCA.y1) / 2, ZF], cierra), incl = (1 - cierra) * 0.16;
  const rP = (BOCA.y1 - BOCA.y0) / 2 + 0.3, alto = BOCA.arranque - ZF + 0.1;
  const pto = (u, v, off) => [base[0] + ej[0] * u + nrm[0] * (off - v * incl), base[1] + ej[1] * u + nrm[1] * (off - v * incl), base[2] + v];
  const silueta = (off) => { const pts = [pto(-rP, 0, off)]; for (let j = 0; j <= 16; j++) { const b = Math.PI - j / 16 * Math.PI; pts.push(pto(Math.cos(b) * rP, alto + Math.sin(b) * rP, off)); } pts.push(pto(rP, 0, off)); return pts; };
  const tras = silueta(-0.35), cara = silueta(0);
  let canto = ''; for (let j = 0; j < cara.length - 1; j++) canto += poly([tras[j], tras[j + 1], cara[j + 1], cara[j]]);
  const asa = [pto(-1.1, alto + 0.6, 0.05), pto(-1.1, alto + 0.6, 0.75), pto(1.1, alto + 0.6, 0.75), pto(1.1, alto + 0.6, 0.05)];
  el.puerta.innerHTML = '<path class="puerta-canto" d="' + canto + '"/><path class="puerta" d="' + poly(cara) + '"/><path class="iso-line" data-tone="lo" d="' + poly(silueta(0.02).map((p, j, a) => p)) + '"/><path class="iso-line asa" data-tone="hi" d="' + linea(asa) + '"/><g class="iso-dots" data-tone="mid">' + [pto(-rP + 0.6, 0.6, 0.03), pto(rP - 0.6, 0.6, 0.03), pto(0, alto + rP - 0.6, 0.03)].map((q) => { const a = at(q); return '<circle r=".35" cx="' + f1(a[0]) + '" cy="' + f1(a[1]) + '"/>'; }).join('') + '</g>';
  // lo que trabaja en cada paso
  ilumina([el.artesa, el.despensa], paso === 0); ilumina([el.mesa, el.manta, el['panes-mesa']], paso === 1); ilumina([el.lena, el.dentro], paso === 2); ilumina([el.escobon, el.hurgon, el.solera], paso === 3); ilumina([el.pala, el.fachada], paso === 4); ilumina([el.puerta, el.poyo, el.aguja, el['panes-rejilla']], paso === 5);
  const extra = ['harina, agua, sal y masa madre', 'tapada, crece hasta el doble', 'hasta que la bóveda blanquea', 'fuera brasas; la solera, limpia', 'cada pan con su señal, a la pala', 'puerta cerrada: una hora'][paso];
  const text = (paso + 1) + ' · ' + PASOS[paso] + ' · ' + Math.round(T / 5) * 5 + ' °C · ' + extra;
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
const puesto = (e) => { const m = svgEl.getScreenCTM(); if (!m) return 0; const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); let best = 0, bd = Infinity; PUESTOS.forEach((p, i) => { const a = at(p), d = Math.hypot(a[0] - q.x, a[1] - q.y); if (d < bd) { bd = d; best = i; } }); return best + 0.5; };
stage.addEventListener('pointermove', (e) => steer(puesto(e)));
stage.addEventListener('pointerdown', (e) => steer(puesto(e)));
stage.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); steer(Math.floor(target) + 1.6); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); steer(Math.floor(target) - 0.4); } });
window.__pasoPan = (v) => { touring = false; target = s = v; draw(0); };
draw(0);
`;

const tonos = (pre, cls, [f, s0, s1, s2, s3, t]) => `${pre}.${cls}>.iso-fill{fill:${f}}${pre}.${cls}>.iso-top{fill:${t}}${pre}.${cls}[data-seamless]>.iso-top{stroke:${t}}` +
  [s0, s1, s2, s3].map((c, i) => `${pre}.${cls}>.iso-shade[data-shade="${i}"]{fill:${c}}${pre}.${cls}[data-seamless]>.iso-shade[data-shade="${i}"]{stroke:${c}}`).join('');
const COLOR = {
  dark: { madera: ['#4a3628', '#2a1d16', '#35261c', '#403022', '#4c3a2a', '#5a4632'], tronco: ['#5a4030', '#33241a', '#403024', '#4c3a2c', '#5a4636', '#8a6a4a'],
    hierro: ['#3a3642', '#1c1a22', '#26232c', '#302d36', '#3a3742', '#4a4652'], piedra: ['#4e4458', '#2a2432', '#342d3e', '#3e3648', '#4a4154', '#5c5266'],
    saco: ['#6e6250', '#40382c', '#4e4436', '#5c5040', '#6a5e4c', '#7c705c'], barro: ['#7a4a34', '#462a1e', '#563426', '#663e2c', '#764834', '#8a5a40'] },
  light: { madera: ['#8a6a50', '#5e4636', '#6c523e', '#7a5e48', '#886a52', '#9a7c62'], tronco: ['#9a7656', '#6a4e38', '#7a5c42', '#8a6a4c', '#9a7856', '#d8b88e'],
    hierro: ['#7a7684', '#4e4a58', '#5c5866', '#6a6674', '#787482', '#8c8896'], piedra: ['#b4aabc', '#867c90', '#958b9f', '#a49aae', '#b3a9bd', '#c8bed2'],
    saco: ['#d8ccb4', '#a89c84', '#b8ac94', '#c8bca4', '#d8ccb4', '#e8dcc4'], barro: ['#c8805c', '#985436', '#a86242', '#b8704e', '#c87e5a', '#d8906a'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
// la bóveda: seis tonos por fuera (piedra) y cuatro por dentro (ladrillo), sin juntas entre gajos
const BF = { dark: ['#2a2432', '#322b3c', '#3a3246', '#433a50', '#4d435a', '#584d66'], light: ['#8a8094', '#988ea2', '#a69cb0', '#b4aabe', '#c2b8cc', '#d0c6da'] };
const BI = { dark: ['#5a3024', '#6c3a2a', '#7e4430', '#904e36'], light: ['#a8644c', '#b87256', '#c88060', '#d88e6a'] };
const bov = (pre, th) => BF[th].map((c, i) => `${pre}.bf${i}{fill:${c};stroke:${c}}`).join('') + BI[th].map((c, i) => `${pre}.bi${i}{--b:${c}}`).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + bov('', 'dark') + bov('.iso[data-theme="light"] ', 'light') + `
.iso{--hollin:#0e0a0c;--calor:#fff4e0;--naranja:#ff7a2a;--masa:#e8d6b0;--masa-l:#f6ead0;--dorado:#b8742e;--dorado-l:#e0a050;--greña:#7a5a3a;--llama:#ffb347;--llama2:#ff6a2a;--humo:#cfc4d8;--brasa:#ff7a3a;--hueco:#0d0718;--manta:#6e3a3c;--manta2:#5a2e32;--manta3:#804846;--manta4:#925652;--harina:#efe6d4;--masa-madre:#d8c49a;--esfera:#e6ddf0;--franja:#ff7ac8;--solera:#3a2a2a;--c-ladrillo:#8a4a34;--c-barro:#8a6e46;--c-piedra:#5a5066;--arena:#6e5e46;--dovelas:#5c5266;--tunel:#1a1016;--tunel2:#24161c;--puerta:#2c2a34;--puerta-c:#1c1a22;--artesa-dentro:#2a1d16;--artesa-dentro2:#35261c;--artesa-suelo:#22170f}
.iso[data-theme="light"]{--hollin:#2a2226;--calor:#fff8ec;--masa:#f2e2c0;--masa-l:#fff4dc;--dorado:#c07a32;--dorado-l:#e8aa58;--greña:#8a6a4a;--humo:#8a7aa8;--brasa:#e8622a;--hueco:#8c7a86;--manta:#c8847a;--manta2:#b8746c;--manta3:#d8948a;--manta4:#e6a49a;--harina:#fffaf0;--masa-madre:#e8d4aa;--esfera:#fcfaff;--franja:#d6338f;--solera:#8a6a62;--c-ladrillo:#c87a5a;--c-barro:#d4b07a;--c-piedra:#b4aabc;--arena:#d8c49a;--dovelas:#b4aabc;--tunel:#6a5458;--tunel2:#7a6468;--puerta:#4e4a58;--puerta-c:#3a3644;--artesa-dentro:#5e4636;--artesa-dentro2:#6c523e;--artesa-suelo:#4e3a2c}
.bi{fill:color-mix(in srgb,var(--naranja) calc(var(--fuego,0) * 38%),color-mix(in srgb,var(--calor) calc(var(--blanco,0) * 62%),color-mix(in srgb,var(--hollin) calc((1 - var(--blanco,0)) * 48%),var(--b))));stroke:color-mix(in srgb,var(--naranja) calc(var(--fuego,0) * 38%),color-mix(in srgb,var(--calor) calc(var(--blanco,0) * 62%),color-mix(in srgb,var(--hollin) calc((1 - var(--blanco,0)) * 48%),var(--b))));stroke-width:.3}
.solera{fill:color-mix(in srgb,var(--naranja) calc(var(--fuego,0) * 30%),color-mix(in srgb,var(--calor) calc(var(--blanco,0) * 35%),var(--solera)))}
.corte-ladrillo{fill:var(--c-ladrillo)}.corte-barro{fill:var(--c-barro)}.corte-piedra{fill:var(--c-piedra)}.arena{fill:var(--arena)}.baldosa-canto{fill:var(--c-ladrillo)}.juntas{fill:none;stroke:color-mix(in srgb,var(--hollin) 55%,var(--b,#5a3428));stroke-width:.3}.dovelas{fill:var(--dovelas)}.boca{fill:color-mix(in srgb,var(--naranja) calc(var(--fuego,0) * 70%),var(--tunel))}.tunel{fill:var(--tunel2)}.tunel2{fill:var(--tunel)}
.hogaza .pan-cuerpo{fill:color-mix(in srgb,var(--dorado) calc(var(--cocido) * 100%),var(--masa));stroke:var(--anatomy-lo);stroke-width:.35}
.hogaza .pan-brillo{fill:color-mix(in srgb,var(--dorado-l) calc(var(--cocido) * 100%),var(--masa-l))}
.pan-greña{fill:none;stroke:var(--greña);stroke-width:.55;stroke-linecap:round}
.leño{fill:none;stroke:#5a3a26;stroke-linecap:round}
.llama{fill:var(--llama);stroke:var(--llama2);stroke-width:.5;mix-blend-mode:screen}.humo{fill:var(--humo)}.brasas circle{fill:var(--brasa)}
.manta{stroke-width:.25;stroke-linejoin:round}.m0{fill:var(--manta2);stroke:var(--manta2)}.m1{fill:var(--manta);stroke:var(--manta)}.m2{fill:var(--manta3);stroke:var(--manta3)}.m3{fill:var(--manta4);stroke:var(--manta4)}.manta-cara{fill:var(--manta2);stroke:var(--anatomy-lo);stroke-width:.3}
.harina{fill:var(--harina);stroke:var(--anatomy-mid);stroke-width:.3}.masa-madre{fill:var(--masa-madre);stroke:var(--anatomy-mid);stroke-width:.3}
.esfera{fill:var(--esfera)}.franja-pan{fill:none;stroke:var(--franja);stroke-width:.7;stroke-linecap:round}
.hueco-artesa{fill:var(--artesa-suelo)}.artesa-dentro{fill:var(--artesa-dentro)}.artesa-dentro2{fill:var(--artesa-dentro2)}
.puerta{fill:var(--puerta);stroke:var(--anatomy-mid);stroke-width:.35}.puerta-canto{fill:var(--puerta-c);stroke:var(--puerta-c);stroke-width:.2}
.pala-hoja{fill:#8c6a46;stroke:var(--anatomy-mid);stroke-width:.35}.iso[data-theme="light"] .pala-hoja{fill:#dcb080}
.palo{stroke-width:1;stroke-linecap:round}.trapo{stroke-width:.7;stroke-linecap:round}.hurgon-cabeza{stroke-width:1.2;stroke-linecap:round}.asa{fill:none;stroke-width:.6;stroke-linecap:round}.asa-cantaro{fill:none;stroke:#764834;stroke-width:1.1;stroke-linecap:round}.iso[data-theme="light"] .asa-cantaro{stroke:#b8704e}.aguja{stroke-width:.55;stroke-linecap:round}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line,[data-lit] .tb-edge,[data-lit] .pan-cuerpo,[data-lit] .pala-hoja,[data-lit] .puerta,[data-lit] .dovelas,[data-lit] .manta-cara{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 16',
  title: 'Cómo se hace el pan',
  hint: 'Pasa el ratón por cada pieza',
  readout: '1 · Amasar · 20 °C',
  keys: [
    { mark: 'lit', label: 'Lo que trabaja en cada paso: la artesa, la masa que crece, el fuego, la limpieza, la pala y la puerta' },
    { mark: 'raised', label: 'El pan se cuece sin fuego: con el calor que guardan el ladrillo, el barro y la piedra de la bóveda' },
    { mark: 'flat', label: 'La levadura de la masa madre hace burbujas de gas: por eso el pan sale esponjoso' },
  ],
  caption: 'Antes, cada familia amasaba su pan una vez por semana y lo cocía en el horno de leña del pueblo. En la artesa se amasa harina, agua y sal con un trozo de masa guardado de la vez anterior, la masa madre. Está llena de levaduras, seres vivos diminutos que hacen burbujas de gas: por eso la masa, tapada con una manta, crece hasta el doble. Mientras, la leña arde dentro del horno. La bóveda, de ladrillo, barro con paja y piedra, guarda el calor; cuando pasa de negra de hollín a blanca, el horno está a unos 300 grados. Entonces se sacan las brasas con el hurgón, se limpia la solera con un escobón mojado y, con la pala, se meten los panes, cada uno con la señal de su casa. Se cierra la puerta y el pan se cuece con el calor que guardan las paredes, sin fuego: en una hora sale dorado. Las hogazas grandes aguantaban toda la semana.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Cómo se hace el pan, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="6">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Cómo se hace el pan', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('pan', html, theme);
