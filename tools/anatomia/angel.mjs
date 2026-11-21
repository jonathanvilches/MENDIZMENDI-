// Lámina isométrica interactiva «La Bajada del Ángel» (skill Anatomy, 21 de noviembre de 2026; el autor: «explicaciones
// técnicas con Anatomy [...] todo esto quiero que poco a poco lo vayas aplicando y lo vayas metiendo en el juego y en las
// misiones»). La plaza de los Fueros de Tudela en maqueta, el Domingo de Resurrección: las casas con sus arcos, el kiosco
// en medio y la gente alrededor; la maroma tendida de lado a lado de la plaza entre dos balcones, con la polea de la que
// cuelga el ángel y la cuerda de tiro que manejan los vecinos desde el balcón; abajo, en su peana, la Virgen con el velo
// negro de luto. El ángel baja por la maroma, le quita el velo, dice sus versos (suenan las campanas y vuelan las
// palomas) y lo suben otra vez al balcón. Al recorrerla, paso a paso, se ilumina lo que trabaja. Es la que se abre en la
// misión de la Bajada del Ángel (data/levels.js, Tudela) y en el material didáctico.
// Uso: node tools/anatomia/angel.mjs [--light]  →  entrega/anatomia/angel(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 310;

// ---------- el modelo (unidades de la maqueta; x a lo ancho, y hacia delante, z arriba) ----------
const PLAZA = { x0: -62, x1: 50, y0: -60, y1: -6 };
const CASAS = [                                                   // las fachadas con arcos: detrás (a lo largo de x) y a la izquierda (a lo largo de y)
  { x0: -62, x1: -30, y0: -60, y1: -52, h: 24 }, { x0: -30, x1: 4, y0: -60, y1: -52, h: 21 }, { x0: 4, x1: 50, y0: -60, y1: -52, h: 23 },
  { x0: -62, x1: -54, y0: -52, y1: -30, h: 22 }];
const BALCON_A = [-52.2, -40, 18], BALCON_B = [40, -22, 15];        // los dos extremos de la maroma
const POSTE_B = { x: 40, y: -22 };                                  // el mástil del otro lado
const KIOSCO = { x: 14, y: -43, r: 6.5, h: 9 };
const VIRGEN = { x: -24, y: -33.5 };                                  // la peana, bajo la maroma
const PASOS = ['La maroma', 'Baja el ángel', 'El velo', 'Los versos', 'Sube'];

// la maroma: una catenaria aproximada (parábola) entre los dos balcones, con su flecha
const FLECHA = 4.2;
const MAROMA = (t) => [BALCON_A[0] + (BALCON_B[0] - BALCON_A[0]) * t, BALCON_A[1] + (BALCON_B[1] - BALCON_A[1]) * t, BALCON_A[2] + (BALCON_B[2] - BALCON_A[2]) * t - 4 * FLECHA * t * (1 - t)];
// el punto de la maroma que queda encima de la Virgen (el más cercano en planta)
let T_V = 0, mejor = 1e9; for (let i = 0; i <= 400; i++) { const t = i / 400, p = MAROMA(t), d = Math.hypot(p[0] - VIRGEN.x, p[1] - VIRGEN.y); if (d < mejor) { mejor = d; T_V = t; } }
const PUESTOS = [[...MAROMA(0.7)], [...MAROMA(T_V * 0.5)], [VIRGEN.x, VIRGEN.y, 8], [VIRGEN.x + 4, VIRGEN.y, 14], [...BALCON_A]];

// ---------- la cámara ----------
const PLATE = { x: -70, y: -66, w: 124, d: 64, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [-62, -60, 26], [BALCON_B[0], BALCON_B[1], 22]], WIDTH, HEIGHT, { pad: 8, azimuth: 60, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(2)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const porDepth = (lista, f) => [...lista].sort((a, b) => dep(f(a)) - dep(f(b)));
const R2x = (i) => (0.5 + i * 0.7548776662) % 1, R2y = (i) => (0.5 + i * 0.5698402910) % 1;
const FZ = (x, y, z = 0) => G.frameAlong([x, y, z], [0, 0, 1]);
const caja = (x0, x1, y0, y1, z0, h, cls, bevel = 0.2, r = 0.2) => S(k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, h, P, 2, bevel), { tone: 'mid', className: cls });

// ---------- el tablero: el suelo de la plaza ----------
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
  // las losas de la plaza
  let lo = ''; for (let x = -50; x < 50; x += 8) lo += linea([[x, -50, 0], [x, -8, 0]]);
  for (let y = -46; y < -6; y += 8) lo += linea([[-52, y, 0], [48, y, 0]]);
  out.push(`<path class="losa" d="${lo}"/>`);
  const regla = { x: -62, y: -12, w: 26, d: 5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.05, 0.6, [1.8, regla.d - 0.1], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.5, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.5, 0.6])], { size: 0.45 }));
  const pl = { x: 10, y: -12, w: 36, d: 5.6, r: 1.2 };
  out.push(S(k.slabOf(pl, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(pl, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([pl.x + 4.6, pl.y + 3.5], 0.8, P, 'x'), 'AINGERUAREN JAITSIERA', { size: 2.3, tone: 'mid' }));
  out.push(D([at([pl.x + 2.2, pl.y + 2.8, 0.8]), at([pl.x + pl.w - 2.2, pl.y + 2.8, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- las casas de la plaza: fachada, arcos en los bajos, ventanas y el tejado ----------
function casas() {
  const out = [];
  for (const c of porDepth(CASAS, (q) => [(q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, 0])) {
    out.push(caja(c.x0, c.x1, c.y0, c.y1, 0, c.h, 'fachada', 0.3, 0.3));
    out.push(caja(c.x0 - 0.6, c.x1 + 0.6, c.y0 - 0.6, c.y1 + 0.6, c.h, 1.2, 'alero', 0.2, 0.2));
    // la cara que mira a la plaza: la de delante (y1) en las de detrás, la de la derecha (x1) en la de la izquierda
    const largoX = c.x1 - c.x0 > c.y1 - c.y0, n = Math.max(2, Math.round((largoX ? c.x1 - c.x0 : c.y1 - c.y0) / 6));
    let arcos = '', ven = '';
    for (let i = 0; i < n; i++) {
      const u0 = (i + 0.18) / n, u1 = (i + 0.82) / n, um = (u0 + u1) / 2;
      const P2 = (u, z) => largoX ? [c.x0 + (c.x1 - c.x0) * u, c.y1 + 0.03, z] : [c.x1 + 0.03, c.y0 + (c.y1 - c.y0) * u, z];
      const arco = [P2(u0, 0), P2(u0, 4.2)]; for (let j = 1; j < 8; j++) { const a = Math.PI - j / 8 * Math.PI; arco.push(P2(um + Math.cos(a) * (u1 - u0) / 2, 4.2 + Math.sin(a) * 1.8)); } arco.push(P2(u1, 4.2), P2(u1, 0));
      arcos += poly(arco);
      const hw = (u1 - u0) * 0.24; for (const zf of [9, 14.5].concat(c.h > 22 ? [19.5] : [])) ven += poly([P2(um - hw, zf), P2(um + hw, zf), P2(um + hw, zf + 2.8), P2(um - hw, zf + 2.8)]);
    }
    out.push(`<path class="arco" d="${arcos}"/>`, `<path class="ventana" d="${ven}"/>`);
  }
  return `<g data-part="casas">${out.join('')}</g>`;
}
// el balcón de salida (con su barandilla) y el mástil del otro lado, con sus tornos
function balcon() {
  const [x, y, z] = BALCON_A, out = [];
  out.push(caja(-54, -50.6, y - 4, y + 4, z - 0.6, 0.8, 'piedra', 0.2));
  let b = ''; for (let i = 0; i <= 8; i++) b += linea([[-50.6, y - 4 + i, z + 0.2], [-50.6, y - 4 + i, z + 2.4]]);
  out.push(L(b + linea([[-50.6, y - 4, z + 2.4], [-50.6, y + 4, z + 2.4]]), { tone: 'mid', className: 'baranda' }));
  out.push(D([at([-50.6, y - 4, z + 2.4]), at([-50.6, y + 4, z + 2.4])], { size: 0.35, tone: 'mid' }));
  // el torno de la cuerda de tiro, en el balcón
  out.push(S(G.solidOf([[0, 0.9], [2.4, 0.9]], G.frameAlong([-52.6, y + 0.6, z + 1.1], [0, 1, 0]), P), { tone: 'mid', className: 'madera' }));
  return `<g data-part="balcon">${out.join('')}</g>`;
}
function mastil() {
  const { x, y } = POSTE_B, out = [];
  out.push(caja(x - 1.6, x + 1.6, y - 1.6, y + 1.6, 0, 1.2, 'piedra', 0.2));
  out.push(S(G.solidOf([[0, 0.7], [BALCON_B[2] + 1.5, 0.5]], FZ(x, y, 1.2), P), { tone: 'mid', className: 'madera' }));
  // los vientos del mástil
  out.push(L(linea([[x, y, BALCON_B[2]], [x + 6, y + 8, 0]]) + linea([[x, y, BALCON_B[2]], [x + 7, y - 6, 0]]), { tone: 'lo' }));
  out.push(D([at([x + 6, y + 8, 0]), at([x + 7, y - 6, 0])], { size: 0.45, tone: 'mid' }));
  return `<g data-part="mastil">${out.join('')}</g>`;
}
// el kiosco de la plaza
function kiosco() {
  const { x, y, r, h } = KIOSCO, out = [];
  out.push(S(k.cylinder(x, y, r, 0, 1.6, P, 8), { tone: 'mid', className: 'piedra' }));
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; if (dep([x + Math.cos(a) * r, y + Math.sin(a) * r, 0]) < dep([x, y, 0])) out.push(S(k.cylinder(x + Math.cos(a) * (r - 0.8), y + Math.sin(a) * (r - 0.8), 0.32, 1.6, h - 1.6, P, 8), { tone: 'mid', className: 'hierro' })); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; if (dep([x + Math.cos(a) * r, y + Math.sin(a) * r, 0]) >= dep([x, y, 0])) out.push(S(k.cylinder(x + Math.cos(a) * (r - 0.8), y + Math.sin(a) * (r - 0.8), 0.32, 1.6, h - 1.6, P, 8), { tone: 'mid', className: 'hierro' })); }
  out.push(S(G.solidOf([[0, r + 0.8], [0.4, r + 0.9], [3.6, 0.6], [4.4, 0.2]], FZ(x, y, h), P), { tone: 'mid', className: 'tejado', crease: 'none' }));
  return `<g data-part="kiosco">${out.join('')}</g>`;
}
// la peana de la Virgen (la Virgen y el velo, vivos)
function peana() {
  const { x, y } = VIRGEN;
  return `<g data-part="peana">${caja(x - 3.2, x + 3.2, y - 3.2, y + 3.2, 0, 2.4, 'madera', 0.3, 0.6)}${caja(x - 2.4, x + 2.4, y - 2.4, y + 2.4, 2.4, 1.0, 'dorado', 0.2, 0.5)}</g>`;
}
function virgen() {
  const { x, y } = VIRGEN;
  const manto = S(G.solidOf([[0, 1.9], [0.6, 1.8, true], [4.6, 1.1, true], [5.8, 0.6]], FZ(x, y, 3.4), P), { tone: 'mid', className: 'manto', crease: 'none' });
  const cabeza = S(G.sphereOf([x, y, 9.9], 0.8, P), { tone: 'mid', className: 'cara-v' });
  const corona = S(G.solidOf([[0, 0.6], [0.7, 0.9]], FZ(x, y, 10.5), P), { tone: 'mid', className: 'dorado', crease: 'none' });
  return manto + cabeza + corona;
}
// la gente en la plaza: cabezas y hombros
function gente() {
  const pts = []; for (let i = 0; i < 70; i++) { const x = -48 + R2x(i * 3) * 92, y = -48 + R2y(i * 3) * 31; if (Math.hypot(x - KIOSCO.x, y - KIOSCO.y) < KIOSCO.r + 2.5 || Math.hypot(x - VIRGEN.x, y - VIRGEN.y) < 7 || Math.hypot(x - POSTE_B.x, y - POSTE_B.y) < 6) continue; pts.push([x, y]); }
  return `<g data-part="gente">${porDepth(pts, ([q, w]) => [q, w, 0]).map(([x, y], i) => { const c = ['g0', 'g1', 'g2', 'g3'][i % 4]; return S(G.solidOf([[0, 0.8], [2.6, 0.7, true], [3.2, 0.3]], FZ(x, y), P), { tone: 'mid', className: c, crease: 'none' }) + S(G.sphereOf([x, y, 3.7], 0.55, P), { tone: 'mid', className: 'cara-g' }); }).join('')}</g>`;
}

// ---------- la figura: lo de pie, por profundidad ----------
const items = [
  { d: dep([KIOSCO.x, KIOSCO.y, 0]), svg: kiosco() },
  { d: dep([VIRGEN.x, VIRGEN.y, 0]), svg: peana() + `<g data-part="virgen">${virgen()}</g><g data-part="velo"></g>` },
  { d: dep([POSTE_B.x, POSTE_B.y, 0]), svg: mastil() },
].sort((a, b) => a.d - b.d).map((o) => o.svg);
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta de la plaza de los Fueros de Tudela el Domingo de Resurrección: las casas con sus arcos, el kiosco y la gente; la maroma tendida de lado a lado entre el balcón y el mástil, con la polea de la que cuelga el ángel y la cuerda de tiro que manejan desde el balcón; y la Virgen en su peana, con el velo negro de luto que el ángel le quita.',
  body: [tablero(), casas(), balcon(), gente(), ...items, '<g data-part="maroma"></g>', '<g data-part="angel"></g>', '<g data-part="fiesta"></g>'],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, A = ${JSON.stringify(BALCON_A)}, B = ${JSON.stringify(BALCON_B)}, FLECHA = ${FLECHA}, TV = ${T_V}, V = ${JSON.stringify(VIRGEN)}, PUESTOS = ${JSON.stringify(PUESTOS)};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), f2 = (v) => v.toFixed(2), linea = (pts) => 'M' + pts.map((p) => { const q = at(p); return f2(q[0]) + ' ' + f2(q[1]); }).join('L'), poly = (pts) => linea(pts) + 'Z';
const K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = {}; for (const n of ['casas', 'balcon', 'mastil', 'maroma', 'angel', 'virgen', 'velo', 'fiesta', 'gente', 'peana']) el[n] = $(n);
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }, mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0;
const tourAt = (t) => { const T2 = 3.2 * N + 2, f = (t % T2) / T2 * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
// la maroma se comba un poco más con el peso del ángel donde está
const maroma = (t, ta) => { const p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t - 4 * FLECHA * t * (1 - t)]; const d = Math.abs(t - ta); p[2] -= 1.4 * Math.max(0, 1 - d / 0.35); return p; };
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  // dónde va el ángel en la maroma: arriba (0) → encima de la Virgen (TV) → arriba
  const ta = s < 1 ? 0.02 : s < 2 ? 0.02 + sm((s - 1.05) / 0.85) * (TV - 0.02) : s < 4 ? TV : TV - sm((s - 4.05) / 0.85) * (TV - 0.02);
  // la maroma, la polea y las dos cuerdas: la de la polea al ángel y la de tiro, que vuelve al torno del balcón
  let pm = []; for (let i = 0; i <= 40; i++) pm.push(maroma(i / 40, ta));
  const po = maroma(ta, ta), baja = s >= 2 && s < 4 ? 2.4 * sm((s - 2.0) / 0.3) * (1 - sm((s - 3.8) / 0.2)) : 0, cuelga = 4.6 + baja;
  const torno = [-52.6, A[1] + 1.8, A[2] + 1.1];
  let o = '<path class="maroma" stroke-width="' + f2(0.5 * K) + '" d="' + linea(pm) + '"/>';
  o += '<path class="tiro" d="' + linea([torno, mix(torno, po, 0.5).map((v, i) => i === 2 ? v - 1.6 : v), [po[0], po[1], po[2] - 0.3]]) + '"/>';
  o += '<g class="iso-dots" data-tone="mid">' + [A, B].map((p) => '<circle r=".55" cx="' + f2(at(p)[0]) + '" cy="' + f2(at(p)[1]) + '"/>').join('') + '</g>';
  const qp = at(po); o += '<circle class="polea" cx="' + f2(qp[0]) + '" cy="' + f2(qp[1]) + '" r="' + f2(0.75 * K) + '"/><circle class="eje" cx="' + f2(qp[0]) + '" cy="' + f2(qp[1]) + '" r="' + f2(0.22 * K) + '"/>';
  o += '<path class="tiro" d="' + linea([po, [po[0], po[1], po[2] - cuelga + 2.2]]) + '"/>';
  el.maroma.innerHTML = o;
  // el ángel: túnica blanca, alas que se abren, la cara; en el paso 3 el brazo tira del velo
  { const c = [po[0], po[1], po[2] - cuelga], ala = 0.6 + 0.4 * Math.sin(reloj * 3) * (s > 1 && s < 2 ? 1 : 0.3), q = at(c), qc = at([c[0], c[1], c[2] + 2.6]);
    const w = 1.2 * K, h = 2.6 * K; let a = '';
    for (const sx of [-1, 1]) a += '<path class="ala" d="M' + f2(q[0]) + ' ' + f2(qc[1] + 0.6 * K) + 'Q' + f2(q[0] + sx * 3.2 * K * ala) + ' ' + f2(qc[1] - 1.6 * K) + ' ' + f2(q[0] + sx * 2.4 * K * ala) + ' ' + f2(q[1] + 0.4 * K) + 'Z"/>';
    a += '<path class="tunica" d="M' + f2(q[0] - w) + ' ' + f2(q[1] + 0.2 * K) + 'L' + f2(q[0] - 0.5 * K) + ' ' + f2(qc[1] + 0.4 * K) + 'L' + f2(q[0] + 0.5 * K) + ' ' + f2(qc[1] + 0.4 * K) + 'L' + f2(q[0] + w) + ' ' + f2(q[1] + 0.2 * K) + 'Z"/>';
    a += '<circle class="cara" cx="' + f2(qc[0]) + '" cy="' + f2(qc[1]) + '" r="' + f2(0.7 * K) + '"/><ellipse class="aureola" cx="' + f2(qc[0]) + '" cy="' + f2(qc[1] - 0.9 * K) + '" rx="' + f2(0.9 * K) + '" ry="' + f2(0.3 * K) + '"/>';
    const tira = s >= 2.1 && s < 3.2 ? sm((s - 2.1) / 0.3) : 0; if (tira > 0) { const m = at([c[0] + 0.6, c[1] + 0.4, c[2] - 1.6 * tira]); a += '<path class="brazo-a" d="M' + f2(q[0] + 0.3 * K) + ' ' + f2(qc[1] + 1.0 * K) + 'L' + f2(m[0]) + ' ' + f2(m[1]) + '"/>'; }
    el.angel.innerHTML = a; }
  // el velo negro: tapa a la Virgen; en el paso 3 el ángel lo levanta y se lo lleva
  { const quita = sm((s - 2.3) / 0.6), x = V.x, y = V.y; let ve = '';
    if (quita < 1) { const z0 = 3.4 + quita * 8, z1 = 11.6 + quita * 6, r0 = 2.3 * (1 - quita * 0.5), pts = []; for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + i / 16 * Math.PI * 2; pts.push([x + Math.cos(a) * r0, y + Math.sin(a) * r0, z0 + Math.sin(i * 1.7) * 0.2]); }
      const cima = [x, y, z1]; ve = '<g style="opacity:' + f2(1 - quita * 0.6) + '">'; for (let i = 0; i < 16; i++) { const tri = [pts[i], pts[i + 1], cima]; if (depthOf(mix(pts[i], pts[i + 1], 0.5), P) > depthOf([x, y, z0], P) - 0.5) ve += '<path class="velo" d="' + poly(tri) + '"/>'; } ve += '</g>'; }
    el.velo.innerHTML = ve; }
  // la fiesta: palomas que salen y las ondas de las campanas
  let fi = ''; if (s > 2.7 && s < 4.4) { const op = sm((s - 2.7) / 0.2) * (1 - sm((s - 4.1) / 0.3)); for (let i = 0; i < 12; i++) { const f = (reloj * 0.35 + i / 12) % 1, p = [V.x + Math.cos(i * 2.1) * f * 24, V.y + Math.sin(i * 2.1) * f * 14, 12 + f * 20], q = at(p), w = 1.1 * K, h = 0.6 * K * Math.abs(Math.sin(reloj * 9 + i)); fi += 'M' + f2(q[0] - w) + ' ' + f2(q[1] - h) + 'Q' + f2(q[0]) + ' ' + f2(q[1] + 0.3) + ' ' + f2(q[0] + w) + ' ' + f2(q[1] - h); }
    let on = ''; for (let j = 0; j < 3; j++) { const f = (reloj * 0.6 + j / 3) % 1, c = at([-30, -56, 26]), r = (2 + f * 9) * K; on += '<path class="onda-c" style="opacity:' + f2((1 - f) * op) + '" d="M' + f2(c[0] - r) + ' ' + f2(c[1]) + 'A' + f2(r) + ' ' + f2(r * 0.55) + ' 0 0 1 ' + f2(c[0] + r) + ' ' + f2(c[1]) + '"/>'; }
    el.fiesta.innerHTML = '<g style="opacity:' + f2(op) + '"><path class="paloma" d="' + fi + '"/>' + on + '</g>'; } else el.fiesta.innerHTML = '';
  ilumina([el.maroma, el.balcon, el.mastil], paso === 0 || paso === 4); ilumina([el.angel], paso === 1 || paso === 4); ilumina([el.virgen, el.peana], paso === 2 || paso === 3);
  const extra = ['de lado a lado de la plaza, entre el balcón y el mástil', 'la polea rueda por la maroma; desde el balcón sueltan la cuerda', 'el ángel le quita a la Virgen el velo negro de luto', 'dice sus versos: suenan las campanas y vuelan las palomas', 'tiran de la cuerda y el ángel vuelve al balcón'][paso];
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
window.__pasoAngel = (v) => { touring = false; target = s = v; draw(0); };
draw(0);
`;

const tonos = (pre, cls, [f, s0, s1, s2, s3, t]) => `${pre}.${cls}>.iso-fill{fill:${f}}${pre}.${cls}>.iso-top{fill:${t}}${pre}.${cls}[data-seamless]>.iso-top{stroke:${t}}` +
  [s0, s1, s2, s3].map((c, i) => `${pre}.${cls}>.iso-shade[data-shade="${i}"]{fill:${c}}${pre}.${cls}[data-seamless]>.iso-shade[data-shade="${i}"]{stroke:${c}}`).join('');
const COLOR = {
  dark: { fachada: ['#6a5a4e', '#3a3028', '#463a30', '#524438', '#5e4e42', '#7a6858'], alero: ['#5a3a2a', '#321e14', '#3c2418', '#462a1c', '#503020', '#6a4230'],
    piedra: ['#5a5266', '#2e2838', '#3a3346', '#463e54', '#524962', '#6a6078'], madera: ['#4a3628', '#2a1d16', '#35261c', '#403022', '#4c3a2a', '#5a4632'],
    hierro: ['#5c5a6a', '#2e2c38', '#3a3846', '#464454', '#525062', '#6e6c7e'], tejado: ['#3e5a5a', '#1e3030', '#263a3a', '#2e4646', '#365252', '#4a6a6a'],
    dorado: ['#a8842a', '#5e4614', '#70541a', '#826220', '#947026', '#c8a040'], manto: ['#3a4a9a', '#1c2450', '#242e60', '#2c3870', '#344280', '#4a5cb0'],
    'cara-v': ['#e0b090', '#8a6a52', '#a07a60', '#b88c6e', '#cc9e7e', '#f0c4a4'], 'cara-g': ['#d8a888', '#86664e', '#9a785c', '#b08a6a', '#c49a7a', '#e8bc9c'],
    g0: ['#8a3a4a', '#4a1e26', '#5a242e', '#6a2a36', '#7a303e', '#a04a5a'], g1: ['#3a6a5a', '#1e3a30', '#244638', '#2a5242', '#305e4c', '#4a7e6a'],
    g2: ['#6a5a8a', '#3a3050', '#463a60', '#524470', '#5e4e80', '#7a6aa0'], g3: ['#8a7040', '#4e3e22', '#5e4a28', '#6e5630', '#7e6238', '#a08450'] },
  light: { fachada: ['#d8c4ae', '#a89482', '#b8a490', '#c8b49e', '#d8c2ac', '#ecdac4'], alero: ['#b07a5a', '#80523a', '#905e44', '#a06a4e', '#b07658', '#c8906e'],
    piedra: ['#a49aae', '#766c82', '#857b91', '#948aa0', '#a399af', '#bcb2c6'], madera: ['#8a6a50', '#5e4636', '#6c523e', '#7a5e48', '#886a52', '#9a7c62'],
    hierro: ['#9c9aaa', '#6e6c7c', '#7c7a8a', '#8a8898', '#9896a6', '#b2b0c0'], tejado: ['#7aa8a8', '#4e7a7a', '#5a8888', '#689696', '#76a4a4', '#94c0c0'],
    dorado: ['#e0b850', '#b08a2a', '#c09836', '#d0a642', '#e0b44e', '#f4d070'], manto: ['#6a7ad8', '#4050a8', '#4c5cb8', '#5868c8', '#6474d6', '#8494ec'],
    'cara-v': ['#e8bc9c', '#b08a6e', '#c09a7c', '#d0aa8a', '#e0b898', '#f6d0b4'], 'cara-g': ['#e0b494', '#a88a6e', '#b8987a', '#c8a686', '#d8b492', '#ecc8a8'],
    g0: ['#d06a7a', '#a0404e', '#b04c5a', '#c05866', '#d06472', '#e8828e'], g1: ['#6aa890', '#407a64', '#4c8870', '#58967c', '#64a488', '#84c0a6'],
    g2: ['#9a8ac8', '#6a5a98', '#7666a6', '#8272b4', '#8e7ec2', '#ac9cdc'], g3: ['#c8a060', '#987434', '#a88040', '#b88c4c', '#c89858', '#e0b476'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--losa:#2a1d44;--arco:#120a20;--ventana:#ffd36a;--maroma:#c8a878;--tiro:#e0c89a;--polea:#8a8698;--ala:#ecdcff;--tunica:#ffffff;--cara:#f0c4a4;--aureola:#ffd36a;--velo:#0a0612;--paloma:#ecdcff;--onda:#ffd36a}
.iso[data-theme="light"]{--losa:#e2dcee;--arco:#4a3a48;--ventana:#d69a10;--maroma:#8a6a40;--tiro:#a88058;--polea:#6e6c7c;--ala:#ffffff;--tunica:#ffffff;--cara:#e0b090;--aureola:#d69a10;--velo:#1a1022;--paloma:#5a6080;--onda:#d69a10}
.losa{fill:none;stroke:var(--losa);stroke-width:.35}.arco{fill:var(--arco);stroke:var(--anatomy-lo);stroke-width:.25}.ventana{fill:var(--ventana);opacity:.85}
.maroma{fill:none;stroke:var(--maroma);stroke-linecap:round}.tiro{fill:none;stroke:var(--tiro);stroke-width:.4;stroke-linecap:round}
.polea{fill:var(--polea);stroke:var(--anatomy-lo);stroke-width:.3}.eje{fill:var(--anatomy-lo)}
.ala{fill:var(--ala);stroke:var(--anatomy-mid);stroke-width:.3;opacity:.92}.tunica{fill:var(--tunica);stroke:var(--anatomy-mid);stroke-width:.3}.cara{fill:var(--cara);stroke:var(--anatomy-lo);stroke-width:.3}
.aureola{fill:none;stroke:var(--aureola);stroke-width:.5}.brazo-a{fill:none;stroke:var(--cara);stroke-width:.8;stroke-linecap:round}
.velo{fill:var(--velo);stroke:var(--velo);stroke-width:.2;stroke-linejoin:round}.paloma{fill:none;stroke:var(--paloma);stroke-width:.5;stroke-linecap:round}.onda-c{fill:none;stroke:var(--onda);stroke-width:.6}
.baranda{stroke-width:.45}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
[data-part="maroma"][data-lit] .maroma{stroke:var(--anatomy-lit)}
[data-part="angel"][data-lit] .tunica,[data-part="angel"][data-lit] .ala{stroke:var(--anatomy-lit);stroke-width:.6}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 24',
  title: 'La Bajada del Ángel',
  hint: 'Pasa el ratón por cada pieza',
  readout: '1 · La maroma · de lado a lado de la plaza, entre el balcón y el mástil',
  keys: [
    { mark: 'lit', label: 'Lo que trabaja en cada paso: la maroma, el ángel y la Virgen' },
    { mark: 'raised', label: 'La polea rueda por la maroma y la cuerda de tiro la frena' },
    { mark: 'flat', label: 'El velo negro de luto: al quitarlo, la fiesta pasa de la tristeza a la alegría' },
  ],
  caption: 'Cada Domingo de Resurrección, en la plaza de los Fueros de Tudela, se celebra la Bajada del Ángel, una tradición de hace siglos. De lado a lado de la plaza se tiende una maroma, una cuerda gruesa y muy tensa. De ella cuelga, con una polea, un niño vestido de ángel. Desde el balcón, los vecinos sueltan poco a poco la cuerda de tiro y el ángel baja rodando por la maroma hasta quedar encima de la Virgen, que espera en su peana cubierta con un velo negro de luto. El ángel le quita el velo, dice unos versos, suenan las campanas y vuelan las palomas: la fiesta pasa de la tristeza a la alegría. Después tiran de la cuerda y el ángel vuelve a subir al balcón. Antes, las cuerdas y las poleas se manejaban solo a mano; hoy el ángel lleva arnés y medidas de seguridad, pero la ceremonia es la misma y la plaza se llena de gente.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="La Bajada del Ángel, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="5">${svg}</div>`,
});

const html = k.pageHtml({ title: 'La Bajada del Ángel', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('angel', html, theme);
