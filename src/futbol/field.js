// Escena del campo de fútbol 11 (todo sale de rules.js): césped de 105 × 68 m con franjas de corte y las líneas
// reglamentarias de 12 cm hechas de geometría (nítidas de cerca y de lejos sin una textura enorme), porterías de
// 7,32 × 2,44 m con red que se mueve al recibir el balón, vallas de publicidad con rótulos propios (sin marcas) y el
// estadio:
//   · El Sadar tras la reforma de 2021: una sola grada continua y muy pendiente por los cuatro lados, pegada al césped
//     y con las esquinas cerradas (asientos rojos, escaleras y respaldos), cubierta continua de celosía que vuela sobre
//     las gradas hasta casi las líneas y da sombra al campo, el anillo rojo del borde de la cubierta y, por fuera, la
//     base rectangular de chapa plegada roja y azul (según desde dónde se mire se ve de un color o del otro).
//   · El campo de un pueblo: muro de piedra, un graderío sencillo, árboles y casas.
// Devuelve la escena y unas pocas funciones para animarla.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FIELD as F, VENUES } from './rules.js';

const GW = F.L + 2 * F.margin, GH = F.W + 2 * F.margin;   // suelo de hierba: el campo y su margen hasta las vallas
// color de vértice: el de la paleta (sRGB) pasado al espacio lineal en que trabaja el sombreador
const lin = (hex) => new THREE.Color(hex).toArray();
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function canvasTex(w, h, draw, { repeat = false, alpha = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (alpha) t.premultiplyAlpha = false;
  return t;
}

// ---------------------------------------------------------------- césped
// una baldosa de dos franjas de corte (5,25 m cada una: veinte franjas de portería a portería) con el grano de la hierba;
// se repite por todo el suelo
const STRIPE = F.L / 20;
function grassTexture(V, px) {
  const t = canvasTex(px, px, (g, W, H) => {
    const [g1, g2] = V.grass;
    g.fillStyle = g1; g.fillRect(0, 0, W / 2, H); g.fillStyle = g2; g.fillRect(W / 2, 0, W / 2, H);
    const rnd = mulberry(3), n = W * H / 3;
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = rnd() * H, l = rnd();
      g.fillStyle = l < 0.5 ? `rgba(18,52,18,${0.06 + rnd() * 0.1})` : `rgba(190,230,150,${0.04 + rnd() * 0.07})`;
      g.fillRect(x, y, 1, 1 + rnd() * 2);
    }
  }, { repeat: true });
  t.repeat.set(GW / (2 * STRIPE), GH / (2 * STRIPE));
  // que el cambio de franja caiga justo en la línea de medio campo
  t.offset.x = -(((GW / 2) / (2 * STRIPE)) % 1);
  return t;
}
// manchas suaves de desgaste (áreas de meta, punto de penalti y centro) y un poco de variación de color, por vértice
function pitchGeometry() {
  const g = new THREE.PlaneGeometry(GW, GH, 92, 64); g.rotateX(-Math.PI / 2);
  const P = g.attributes.position, col = new Float32Array(P.count * 3), rnd = mulberry(17);
  const wear = [[0, 0, 7, 0.06], ...[-1, 1].flatMap(s => [[s * (F.HL - 3), 0, 5, 0.12], [s * (F.HL - F.spot), 0, 2.5, 0.08], [s * (F.HL - 14), 0, 9, 0.04]])];
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i);
    let k = 1 + (rnd() - 0.5) * 0.05, y = 0;
    for (const [wx, wz, r, a] of wear) { const d = Math.hypot((x - wx) / r, (z - wz) / (r * 1.3)); if (d < 1) { const w = (1 - d * d) * a; k -= w * 0.25; y += w; } }
    col[i * 3] = k + y * 0.9; col[i * 3 + 1] = k + y * 0.25; col[i * 3 + 2] = k - y * 0.3;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// ---------------------------------------------------------------- líneas (geometría)
// rectángulos y arcos de 12 cm, un poco por encima del césped; las rectas largas, en tramos de 2 m (para que la sombra de
// la cubierta las oscurezca igual que al césped)
function linesGeometry() {
  const pos = [], w = F.line, y = 0.012;
  const quad = (ax, az, bx, bz, cx, cz, dx, dz) => pos.push(ax, y, az, bx, y, bz, cx, y, cz, ax, y, az, cx, y, cz, dx, y, dz);
  const seg = (x0, z0, x1, z1) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / 2)), ux = (x1 - x0) / L, uz = (z1 - z0) / L, nx = -uz * w / 2, nz = ux * w / 2;
    for (let i = 0; i < n; i++) {
      const a = i / n, b = (i + 1) / n, ax = x0 + (x1 - x0) * a, az = z0 + (z1 - z0) * a, bx = x0 + (x1 - x0) * b, bz = z0 + (z1 - z0) * b;
      quad(ax - nx, az - nz, bx - nx, bz - nz, bx + nx, bz + nz, ax + nx, az + nz);
    }
  };
  const arc = (cx, cz, r, a0, a1, n = Math.max(6, Math.ceil(Math.abs(a1 - a0) * r / 0.8))) => {
    for (let i = 0; i < n; i++) {
      const t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n, ri = r - w / 2, ro = r + w / 2;
      quad(cx + Math.cos(t0) * ri, cz + Math.sin(t0) * ri, cx + Math.cos(t1) * ri, cz + Math.sin(t1) * ri, cx + Math.cos(t1) * ro, cz + Math.sin(t1) * ro, cx + Math.cos(t0) * ro, cz + Math.sin(t0) * ro);
    }
  };
  const dot = (cx, cz, r) => { const n = 14; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2; pos.push(cx, y, cz, cx + Math.cos(b) * r, y, cz + Math.sin(b) * r, cx + Math.cos(a) * r, y, cz + Math.sin(a) * r); } };
  const HL = F.HL, HW = F.HW, e = w / 2;
  seg(-HL - e, -HW, HL + e, -HW); seg(-HL - e, HW, HL + e, HW);     // bandas
  seg(-HL, -HW, -HL, HW); seg(HL, -HW, HL, HW);                     // líneas de meta
  seg(0, -HW, 0, HW);                                               // medio campo
  arc(0, 0, F.circle, 0, Math.PI * 2, 72); dot(0, 0, 0.12);
  const aw = F.areaW / 2, bw = F.boxW / 2, c = Math.acos((F.area - F.spot) / F.arc);
  for (const s of [-1, 1]) {
    const gx = s * HL, ax = s * (HL - F.area), bx = s * (HL - F.box);
    seg(ax, -aw - e, ax, aw + e); seg(gx, -aw, ax, -aw); seg(gx, aw, ax, aw);   // área de penalti
    seg(bx, -bw - e, bx, bw + e); seg(gx, -bw, bx, -bw); seg(gx, bw, bx, bw);   // área de meta
    dot(s * (HL - F.spot), 0, 0.12);
    // semicírculo del área: la parte del círculo de 9,15 m alrededor del punto que queda fuera del área
    if (s > 0) arc(HL - F.spot, 0, F.arc, Math.PI - (Math.PI - c), Math.PI + (Math.PI - c), 28); else arc(-HL + F.spot, 0, F.arc, -(Math.PI - c), Math.PI - c, 28);
    // córners (cuarto de círculo de 1 m hacia dentro) y las marcas de 9,15 m por fuera del campo
    for (const sz of [-1, 1]) {
      const am = Math.atan2(-sz, -s); arc(gx, sz * HW, F.corner, am - Math.PI / 4, am + Math.PI / 4, 8);
      seg(gx + s * 0.15, sz * (HW - F.corner - F.wall), gx + s * 0.45, sz * (HW - F.corner - F.wall));
      seg(s * (HL - F.corner - F.wall), sz * (HW + 0.15), s * (HL - F.corner - F.wall), sz * (HW + 0.45));
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const n = new Float32Array(pos.length); for (let i = 1; i < n.length; i += 3) n[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  return g;
}

// red: malla blanca de 12 cm con fondo transparente (recorte por alfa: sin problemas de orden al dibujar)
function netTexture() {
  return canvasTex(64, 64, (g) => {
    g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(0, 2); g.lineTo(64, 2); g.moveTo(2, 0); g.lineTo(2, 64); g.stroke();
  }, { repeat: true, alpha: true });
}
// balón: blanco con paneles de color
export function ballTexture() {
  const t = canvasTex(512, 256, (g) => {
    g.fillStyle = '#f7f7f4'; g.fillRect(0, 0, 512, 256);
    const pent = (cx, cy, r, col) => { g.fillStyle = col; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.fill(); };
    for (let y = 0; y < 4; y++) for (let x = 0; x < 7; x++) pent(x * 76 + (y % 2) * 38 + 18, y * 64 + 32, 19, (x + y) % 3 === 0 ? '#c41f2c' : '#1a1f3a');
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; for (let y = 0; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  });
  t.anisotropy = 4; return t;
}
// rótulo de las vallas (textos propios del juego)
function boardTexture(lines, bg, fg) {
  const t = canvasTex(1024, 64, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 1024, 64);
    g.font = '900 38px Nunito, Arial, sans-serif'; g.textBaseline = 'middle'; g.fillStyle = fg;
    let x = 24; for (const l of lines) { g.fillText(l, x, 34); x += g.measureText(l).width + 60; }
  });
  t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

// ---------------------------------------------------------------- sombra de la cubierta
// La cubierta de El Sadar cubre las gradas y llega casi a las líneas: con sol, deja en sombra una franja del campo y casi
// toda la grada. Se calcula en el sombreador (sin mapa de sombras): desde cada punto se sigue el rayo hacia el sol hasta
// la altura de la cubierta y, si cae dentro del anillo, la luz del sol no llega
const ROOF_GLSL = `
uniform vec3 uSunDir; uniform vec4 uRoofIn; uniform vec4 uRoofOut; varying vec3 vRoofW;
float roofSdf(vec2 p, vec3 R) { vec2 q = abs(p) - (R.xy - R.z); return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - R.z; }
float roofLight() {
  float t = (uRoofIn.w - vRoofW.y) / max(uSunDir.y, 0.05); if (t <= 0.0) return 1.0;
  vec2 q = vRoofW.xz + uSunDir.xz * t;
  float k = smoothstep(-0.9, 0.9, roofSdf(q, uRoofIn.xyz)) * (1.0 - smoothstep(-0.9, 0.9, roofSdf(q, uRoofOut.xyz)));
  return 1.0 - k * 0.62;
}
`;
export function roofShade(mat, U) {
  const prev = mat.onBeforeCompile, key = mat.customProgramCacheKey?.bind(mat);
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vRoofW;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      vec4 roofW = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        roofW = instanceMatrix * roofW;
      #endif
      vRoofW = (modelMatrix * roofW).xyz;`);
    sh.fragmentShader = ROOF_GLSL + sh.fragmentShader.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n float roofK = roofLight(); reflectedLight.directDiffuse *= roofK; reflectedLight.directSpecular *= roofK;');
  };
  mat.customProgramCacheKey = () => (key ? key() : '') + '|roof';
  mat.needsUpdate = true;
  return mat;
}

// ---------------------------------------------------------------- el estadio
// rectángulo de esquinas redondeadas (semilargo a, semiancho b, radio r) en puntos con su normal hacia fuera; todos los
// recorridos del mismo tamaño de tramos se corresponden punto a punto (para unir filas, cubierta y fachada)
const NX = 12, NZ = 8, NC = 8;
function rr(a, b, r, nx = NX, nz = NZ, nc = NC) {
  const P = [], ax = a - r, bz = b - r;
  for (let i = 0; i < nz; i++) P.push([a, -bz + 2 * bz * i / nz, 1, 0]);
  for (let i = 0; i < nc; i++) { const t = i / nc * Math.PI / 2; P.push([ax + r * Math.cos(t), bz + r * Math.sin(t), Math.cos(t), Math.sin(t)]); }
  for (let i = 0; i < nx; i++) P.push([ax - 2 * ax * i / nx, b, 0, 1]);
  for (let i = 0; i < nc; i++) { const t = Math.PI / 2 + i / nc * Math.PI / 2; P.push([-ax + r * Math.cos(t), bz + r * Math.sin(t), Math.cos(t), Math.sin(t)]); }
  for (let i = 0; i < nz; i++) P.push([-a, bz - 2 * bz * i / nz, -1, 0]);
  for (let i = 0; i < nc; i++) { const t = Math.PI + i / nc * Math.PI / 2; P.push([-ax + r * Math.cos(t), -bz + r * Math.sin(t), Math.cos(t), Math.sin(t)]); }
  for (let i = 0; i < nx; i++) P.push([-ax + 2 * ax * i / nx, -b, 0, -1]);
  for (let i = 0; i < nc; i++) { const t = Math.PI * 1.5 + i / nc * Math.PI / 2; P.push([ax + r * Math.cos(t), -bz + r * Math.sin(t), Math.cos(t), Math.sin(t)]); }
  return P;
}
// geometría por caras planas (normal de cada cuadrilátero hacia donde se pide), con uv y color
class Geo {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; }
  quad(a, b, c, d, want, uv = [0, 0, 1, 0, 1, 1, 0, 1], col = null) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    let V = [a, b, c, d], T = [[uv[0], uv[1]], [uv[2], uv[3]], [uv[4], uv[5]], [uv[6], uv[7]]];
    if (nx * want[0] + ny * want[1] + nz * want[2] < 0) { V = [a, d, c, b]; T = [T[0], T[3], T[2], T[1]]; nx = -nx; ny = -ny; nz = -nz; }
    for (const k of [0, 1, 2, 0, 2, 3]) { this.p.push(...V[k]); this.n.push(nx, ny, nz); this.uv.push(...T[k]); if (col) this.c.push(...col); }
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); if (this.c.length) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere(); return g;
  }
}
// grada: escalón de hormigón con el asiento rojo pintado en la huella (abajo, la contrahuella de hormigón)
function stepTexture(seat, seatAlt) {
  return canvasTex(64, 128, (g, W, H) => {
    // contrahuella (v 0…0,25 → abajo del lienzo)
    g.fillStyle = '#8d8f8c'; g.fillRect(0, H * 0.75, W, H * 0.25);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, H * 0.75, W, 3);
    // huella con el asiento (cubeta) hacia el fondo
    g.fillStyle = '#a3a5a1'; g.fillRect(0, 0, W, H * 0.75);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, W, 4);
    const sx = W * 0.07, sw = W * 0.86, sy = H * 0.08, sh = H * 0.34;
    const gr = g.createLinearGradient(0, sy, 0, sy + sh); gr.addColorStop(0, seatAlt); gr.addColorStop(1, seat);
    g.fillStyle = gr; g.beginPath(); g.roundRect(sx, sy, sw, sh, 6); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(sx + 4, sy + sh * 0.55, sw - 8, 3);
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(W * 0.46, sy + sh, W * 0.08, H * 0.12);   // pata
  }, { repeat: true });
}
// respaldos de los asientos (recortados por alfa, con hueco entre uno y otro)
function seatBackTexture(seat) {
  return canvasTex(64, 32, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#e2525a'); gr.addColorStop(0.35, seat); gr.addColorStop(1, '#6d121a');
    g.fillStyle = gr; g.beginPath(); g.roundRect(W * 0.07, 1, W * 0.86, H - 2, [8, 8, 3, 3]); g.fill();
  }, { repeat: true, alpha: true });
}
// celosía de la cubierta: triángulos de vigas blancas sobre paneles grises
function latticeTexture() {
  return canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#c9ced4'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; g.fillRect(Math.random() * W, Math.random() * H, 20, 20); }
    g.strokeStyle = '#f7f8f9'; g.lineWidth = 6; const s = W / 2, h = s * Math.sqrt(3) / 2;
    g.beginPath();
    for (let y = -H; y <= 2 * H; y += h) { g.moveTo(-W, y); g.lineTo(2 * W, y); }
    for (let x = -2 * W; x <= 2 * W; x += s) { g.moveTo(x, -H); g.lineTo(x + 3 * H / Math.sqrt(3), 2 * H); g.moveTo(x, -H); g.lineTo(x - 3 * H / Math.sqrt(3), 2 * H); }
    g.stroke();
    g.strokeStyle = 'rgba(60,66,74,.35)'; g.lineWidth = 2; g.stroke();
  }, { repeat: true });
}
// fachada: paneles gris claro con aletas blancas verticales y juntas; abajo, la planta de accesos acristalada con
// puertas rojas y azules (la baldosa mide 4,8 m de ancho y toda la altura de la fachada, 21 m)
function facadeTexture() {
  return canvasTex(256, 512, (g, W, H) => {
    const ppm = H / 21, glass = 4.4 * ppm;
    g.fillStyle = '#cfd3d7'; g.fillRect(0, 0, W, H - glass);
    for (let x = 0; x < W; x += 1.2 * ppm) { g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(x, 0, 0.16 * ppm, H - glass); g.fillStyle = 'rgba(40,45,52,.22)'; g.fillRect(x + 0.16 * ppm, 0, 0.1 * ppm, H - glass); }
    for (const y of [5.2, 10.4, 15.6]) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, H - y * ppm, W, 0.18 * ppm); }
    g.fillStyle = '#e9ecef'; g.fillRect(0, H - glass - 0.35 * ppm, W, 0.35 * ppm);
    g.fillStyle = '#1f2a35'; g.fillRect(0, H - glass, W, glass);
    for (let x = 0; x < W; x += 1.2 * ppm) { g.fillStyle = '#6b7c8b'; g.fillRect(x, H - glass, 0.08 * ppm, glass); }
    g.fillStyle = '#c41f2c'; g.fillRect(0.4 * ppm, H - 3.0 * ppm, 1.6 * ppm, 3.0 * ppm);
    g.fillStyle = '#1d3b8a'; g.fillRect(2.6 * ppm, H - 3.0 * ppm, 1.6 * ppm, 3.0 * ppm);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, H - glass + 0.2 * ppm, W, 0.1 * ppm);
  }, { repeat: true });
}
// videomarcador: nombre del campo y el resultado (se repinta con cada gol)
function scoreboard(names) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 208; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const draw = (a = 0, b = 0) => {
    g.fillStyle = '#05070b'; g.fillRect(0, 0, 512, 208);
    g.fillStyle = '#c41f2c'; g.fillRect(0, 0, 512, 52);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.font = '900 34px Nunito, Arial, sans-serif'; g.fillText('EL SADAR · IRUÑA', 256, 28);
    g.font = '900 40px Nunito, Arial, sans-serif'; g.fillStyle = '#ffffff'; g.fillText(names[0], 128, 120); g.fillText(names[1], 384, 120);
    g.font = '900 72px Nunito, Arial, sans-serif'; g.fillStyle = '#f2c230'; g.fillText(`${a} - ${b}`, 256, 120);
    g.fillStyle = '#9fe0ff'; g.font = '800 28px Nunito, Arial, sans-serif'; g.fillText('AUPA!', 256, 182);
    tex.needsUpdate = true;
  };
  draw(); return { tex, draw };
}

export function buildField(venueId = 'sadar', { quality = 'high', crowd = null, names = ['OSA', 'VIS'] } = {}) {
  const V = VENUES[venueId] || VENUES.sadar, S = new THREE.Scene(), stadium = V.env === 'estadio';
  const owned = { geo: [], mat: [], tex: [] };
  const own = (o) => { if (o.isTexture) owned.tex.push(o); else if (o.isMaterial) owned.mat.push(o); else if (o.isBufferGeometry) owned.geo.push(o); return o; };
  const add = (geo, mat, { shadow = false, receive = false } = {}) => { const m = new THREE.Mesh(own(geo), mat); m.castShadow = shadow; m.receiveShadow = receive; m.matrixAutoUpdate = false; m.updateMatrix(); S.add(m); return m; };
  const low = quality === 'low';
  // cielo y luz
  const skyT = own(canvasTex(2, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, V.sky[0]); gr.addColorStop(1, V.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, 2, 256); }));
  S.background = skyT;
  S.fog = new THREE.Fog(V.sky[1], 160, 520);
  S.add(new THREE.HemisphereLight('#eef6ff', '#4e6a3c', 1.25));
  const sun = new THREE.DirectionalLight('#fff3dc', 2.3), SUN = new THREE.Vector3(-18, 34, 22).normalize();
  sun.position.copy(SUN).multiplyScalar(60);
  // el mapa de sombras sigue al juego (los jugadores y el balón); la sombra de la cubierta va aparte, en el sombreador
  if (!low) { sun.castShadow = true; const n = quality === 'high' ? 2048 : 1024; sun.shadow.mapSize.set(n, n); Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 26, bottom: -26, near: 10, far: 130 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; }
  S.add(sun, sun.target);
  // sombra de la cubierta: anillo interior y exterior (semilargo, semiancho, radio, altura media)
  const ROOF_IN = [F.HL + 2.5, F.HW + 2.5, 8], ROOF_OUT = [F.HL + 37.5, F.HW + 36, 36];
  const U = { uSunDir: { value: SUN }, uRoofIn: { value: new THREE.Vector4(...ROOF_IN, stadium ? 25.8 : -100) }, uRoofOut: { value: new THREE.Vector4(...ROOF_OUT, 0) } };
  const shade = (m) => stadium ? roofShade(m, U) : m;

  // suelo: el campo con su margen hasta las vallas y alrededor
  const gt = own(grassTexture(V, low ? 256 : 512));
  add(pitchGeometry(), own(shade(new THREE.MeshStandardMaterial({ map: gt, vertexColors: true, roughness: 0.95, metalness: 0 }))), { receive: true });
  add(linesGeometry(), own(shade(new THREE.MeshStandardMaterial({ color: '#f4f6f2', roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))), { receive: true });
  const apron = add(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), own(new THREE.MeshStandardMaterial({ color: stadium ? '#767a74' : '#6f8a4a', roughness: 1 })), { receive: true });
  apron.position.y = -0.03; apron.updateMatrix();
  if (stadium) {
    // pista de hierba artificial más oscura entre las vallas y la grada
    const ring = new THREE.Shape(), hole = new THREE.Path();
    ring.moveTo(-F.HL - 9, -F.HW - 8); ring.lineTo(F.HL + 9, -F.HW - 8); ring.lineTo(F.HL + 9, F.HW + 8); ring.lineTo(-F.HL - 9, F.HW + 8);
    hole.moveTo(-GW / 2, -GH / 2); hole.lineTo(-GW / 2, GH / 2); hole.lineTo(GW / 2, GH / 2); hole.lineTo(GW / 2, -GH / 2); ring.holes.push(hole);
    const m = add(new THREE.ShapeGeometry(ring).rotateX(Math.PI / 2), own(shade(new THREE.MeshStandardMaterial({ color: '#2f6a33', roughness: 1, side: THREE.DoubleSide }))), { receive: true });
    m.position.y = -0.005; m.updateMatrix();
  }

  // porterías: postes y larguero blancos de 12 cm, soportes traseros y red de 2 m de fondo
  const white = own(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.1 }));
  const frameMat = own(new THREE.MeshStandardMaterial({ color: '#cfd2d4', roughness: 0.5 }));
  const netT = own(netTexture()), nets = [];
  const hw = F.goalW / 2 + F.postR, H = F.goalH + F.postR, D = F.goalD;
  const netMat = (w, h) => { const t = own(netT.clone()); t.needsUpdate = true; t.repeat.set(w / 0.12, h / 0.12); return own(new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.9, color: '#ffffff' })); };
  const post = own(new THREE.CylinderGeometry(F.postR, F.postR, H + F.postR, 16)), barG = own(new THREE.CylinderGeometry(F.postR, F.postR, 2 * hw + 2 * F.postR, 16));
  const thin = (len) => own(new THREE.CylinderGeometry(0.025, 0.025, len, 8));
  for (const s of [-1, 1]) {
    const gx = s * F.HL, g = new THREE.Group();
    for (const z of [-hw, hw]) { const m = new THREE.Mesh(post, white); m.position.set(gx, (H + F.postR) / 2, z); m.castShadow = !low; g.add(m); }
    const bar = new THREE.Mesh(barG, white); bar.rotation.x = Math.PI / 2; bar.position.set(gx, H, 0); bar.castShadow = !low; g.add(bar);
    for (const z of [-hw, hw]) { const m = new THREE.Mesh(thin(D), frameMat); m.rotation.z = Math.PI / 2; m.position.set(gx + s * D / 2, 0.02, z); g.add(m); const u = new THREE.Mesh(thin(D), frameMat); u.rotation.z = Math.PI / 2; u.position.set(gx + s * D / 2, H, z); g.add(u); }
    const bb = new THREE.Mesh(thin(2 * hw), frameMat); bb.rotation.x = Math.PI / 2; bb.position.set(gx + s * D, 0.02, 0); g.add(bb);
    const bt = new THREE.Mesh(thin(2 * hw), frameMat); bt.rotation.x = Math.PI / 2; bt.position.set(gx + s * D, H, 0); g.add(bt);
    for (const z of [-hw, hw]) { const m = new THREE.Mesh(thin(H), frameMat); m.position.set(gx + s * D, H / 2, z); g.add(m); }
    // red: fondo (que se abomba), laterales y techo
    const backG = own(new THREE.PlaneGeometry(2 * hw, H, 24, 10)), back = new THREE.Mesh(backG, netMat(2 * hw, H)); back.rotation.y = Math.PI / 2; back.position.set(gx + s * D, H / 2, 0); g.add(back);
    const base = backG.attributes.position.array.slice();
    for (const z of [-hw, hw]) { const m = new THREE.Mesh(own(new THREE.PlaneGeometry(D, H)), netMat(D, H)); m.position.set(gx + s * D / 2, H / 2, z); g.add(m); }
    const top = new THREE.Mesh(own(new THREE.PlaneGeometry(D, 2 * hw)), netMat(D, 2 * hw)); top.rotation.x = -Math.PI / 2; top.position.set(gx + s * D / 2, H, 0); g.add(top);
    S.add(g); nets.push({ s, back, base, hits: [] });
  }

  // vallas de publicidad a 5 m de las líneas, con rótulos propios (con hueco para los banquillos)
  const BH = 0.9, bx = F.HL + F.margin, bz = F.HW + F.margin;
  const boardLines = stadium ? ['MENDIMENDIZ', 'IRUÑA · PAMPLONA', 'NAFARROA', 'AUPA!', 'GORRITXOAK'] : ['MENDIMENDIZ', 'HERRIKO TALDEA', 'AUPA!', 'NAFARROA'];
  const bT1 = own(boardTexture(boardLines, '#c41f2c', '#ffffff')), bT2 = own(boardTexture(boardLines.slice().reverse(), '#16224a', '#ffffff'));
  const boardBack = own(new THREE.MeshStandardMaterial({ color: '#2a2a30', roughness: 0.8 }));
  const board = (len, x, z, ry, tex) => {
    const t = own(tex.clone()); t.needsUpdate = true; t.repeat.set(len / 16, 1);
    const m = add(new THREE.BoxGeometry(len, BH, 0.12), [frameMat, frameMat, frameMat, frameMat, own(shade(new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.25 }))), boardBack], { receive: true });
    m.position.set(x, BH / 2, z); m.rotation.y = ry; m.updateMatrix();
  };
  const benches = [];
  if (stadium) {
    // en la banda de la tribuna (z > 0) las vallas dejan sitio a los dos banquillos
    board(2 * bx, 0, -bz - 0.06, 0, bT1);
    board(bx - 17, -(bx + 17) / 2, bz + 0.06, Math.PI, bT2); board(bx - 17, (bx + 17) / 2, bz + 0.06, Math.PI, bT2); board(22, 0, bz + 0.06, Math.PI, bT2);
    board(2 * bz, -bx - 0.06, 0, Math.PI / 2, bT2); board(2 * bz, bx + 0.06, 0, -Math.PI / 2, bT1);
    for (const s of [-1, 1]) benches.push(s * 14);
  }

  // gradas y estadio
  const seats = [], spots = [];
  let people = null, board3 = null;
  if (stadium) {
    const ST = { x0: F.HL + 8, z0: F.HW + 7, r0: 10, rows: 30, run: 0.8, rise: 0.42, base: 1.1 };
    const N = 2 * (NX + NZ) + 4 * NC;
    // escaleras: en los laterales cada 17 m, en los fondos cada 15,5 m y una en el centro de cada esquina
    const AISLE = new Set(), aisle = (i) => AISLE.add(((i % N) + N) % N);
    const sideStart = [0, NZ + NC, NZ + NC + NX + NC, 2 * NZ + NX + 3 * NC];   // primer punto de cada lado: x+, z+, x−, z−
    for (const k of [2, 4, 6]) { aisle(sideStart[0] + k); aisle(sideStart[2] + k); }
    for (const k of [2, 4, 6, 8, 10]) { aisle(sideStart[1] + k); aisle(sideStart[3] + k); }
    for (let c = 0; c < 4; c++) aisle([NZ, NZ + NC + NX, 2 * NZ + 2 * NC + NX, 2 * NZ + 3 * NC + 2 * NX][c] + NC / 2);
    const AW = 0.65, STAIR_RISE = lin('#9d9e9b'), STAIR_TREAD = lin('#c9cac6');   // media anchura y color de la escalera
    const stepT = own(stepTexture(V.seat, V.seatAlt)), backT = own(seatBackTexture(V.seat));
    const bowl = new Geo(), backs = new Geo(), stairs = new Geo();
    const len = (P, i) => { const j = (i + 1) % N; return Math.hypot(P[j][0] - P[i][0], P[j][1] - P[i][1]); };
    const lerp = (P, i, t, d = 0) => { const j = (i + 1) % N; return [P[i][0] + (P[j][0] - P[i][0]) * t, P[i][1] + (P[j][1] - P[i][1]) * t]; };
    const fill = low ? 0.42 : quality === 'mid' ? 0.62 : 0.8, rnd = mulberry(29);
    // muro delantero (de 1,1 m, con la barandilla) entre el césped y la primera fila
    { const P = rr(ST.x0, ST.z0, ST.r0); for (let i = 0; i < N; i++) { const j = (i + 1) % N; bowl.quad([P[i][0], 0, P[i][1]], [P[j][0], 0, P[j][1]], [P[j][0], ST.base, P[j][1]], [P[i][0], ST.base, P[i][1]], [-P[i][2], 0, -P[i][3]], [0, 0, 1, 0, 1, 0.2, 0, 0.2]); } }
    for (let k = 0; k < ST.rows; k++) {
      const dF = k * ST.run, dB = dF + ST.run, y0 = ST.base + k * ST.rise, y1 = y0 + ST.rise;
      const PF = rr(ST.x0 + dF, ST.z0 + dF, ST.r0 + dF), PB = rr(ST.x0 + dB, ST.z0 + dB, ST.r0 + dB), PS = rr(ST.x0 + dF + 0.68, ST.z0 + dF + 0.68, ST.r0 + dF + 0.68);
      let sF = 0, sB = 0, sS = 0;
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N, lF = len(PF, i), lB = len(PB, i), lS = len(PS, i), n = [-PF[i][2], 0, -PF[i][3]];
        // contrahuella y huella con el asiento pintado
        bowl.quad([PF[i][0], y0, PF[i][1]], [PF[j][0], y0, PF[j][1]], [PF[j][0], y1, PF[j][1]], [PF[i][0], y1, PF[i][1]], n, [sF / 0.5, 0, (sF + lF) / 0.5, 0, (sF + lF) / 0.5, 0.25, sF / 0.5, 0.25]);
        bowl.quad([PF[i][0], y1, PF[i][1]], [PF[j][0], y1, PF[j][1]], [PB[j][0], y1, PB[j][1]], [PB[i][0], y1, PB[i][1]], [0, 1, 0], [sF / 0.5, 0.25, (sF + lF) / 0.5, 0.25, (sB + lB) / 0.5, 1, sB / 0.5, 1]);
        // respaldos, sin pasar por las escaleras
        let t0 = AISLE.has(i) ? Math.min(0.5, AW / lS) : 0, t1 = AISLE.has(j) ? 1 - Math.min(0.5, AW / lS) : 1;
        if (t1 > t0) {
          const a = lerp(PS, i, t0), b = lerp(PS, i, t1), u0 = (sS + lS * t0) / 0.5, u1 = (sS + lS * t1) / 0.5;
          backs.quad([a[0], y1 + 0.3, a[1]], [b[0], y1 + 0.3, b[1]], [b[0], y1 + 0.8, b[1]], [a[0], y1 + 0.8, a[1]], n, [u0, 0, u1, 0, u1, 1, u0, 1]);
          // público: un sitio por asiento, con los pies en la huella y mirando al campo
          const L = lS * (t1 - t0), nSeat = Math.floor(L / 0.5);
          for (let q = 0; q < nSeat; q++) {
            if (rnd() > fill) continue;
            const t = t0 + (t1 - t0) * (q + 0.5) / nSeat, f = lerp(PF, i, t), bk = lerp(PB, i, t);
            spots.push([f[0] + (bk[0] - f[0]) * 0.32, y1 + 0.02, f[1] + (bk[1] - f[1]) * 0.32, Math.atan2(-PF[i][2], -PF[i][3])]);
          }
        }
        sF += lF; sB += lB; sS += lS;
      }
      // escaleras: dos peldaños por fila, de hormigón claro con el borde marcado
      for (const i of AISLE) {
        const ip = (i - 1 + N) % N, tx = PF[(i + 1) % N][0] - PF[ip][0], tz = PF[(i + 1) % N][1] - PF[ip][1], tl = Math.hypot(tx, tz) || 1, ux = tx / tl * AW, uz = tz / tl * AW;
        const nx = PF[i][2], nz = PF[i][3], fx = PF[i][0], fz = PF[i][1];
        for (const [d0, d1, ya, yb] of [[0, 0.4, y0, y0 + ST.rise / 2], [0.4, 0.8, y0 + ST.rise / 2, y1]]) {
          const A = [fx + nx * d0 - ux, fz + nz * d0 - uz], B = [fx + nx * d0 + ux, fz + nz * d0 + uz], C = [fx + nx * d1 + ux * (1 + d1 * 0.02), fz + nz * d1 + uz], Dd = [fx + nx * d1 - ux, fz + nz * d1 - uz];
          stairs.quad([A[0], ya + 0.01, A[1]], [B[0], ya + 0.01, B[1]], [B[0], yb + 0.012, B[1]], [A[0], yb + 0.012, A[1]], [-nx, 0, -nz], undefined, STAIR_RISE);
          stairs.quad([A[0], yb + 0.012, A[1]], [B[0], yb + 0.012, B[1]], [C[0], yb + 0.012, C[1]], [Dd[0], yb + 0.012, Dd[1]], [0, 1, 0], undefined, STAIR_TREAD);
        }
      }
    }
    // muro del fondo de la grada, hasta la cubierta (con una franja de cristal: los palcos y el pasillo de arriba)
    const yTop = ST.base + ST.rows * ST.rise, dTop = ST.rows * ST.run;
    { const P = rr(ST.x0 + dTop, ST.z0 + dTop, ST.r0 + dTop); for (let i = 0; i < N; i++) { const j = (i + 1) % N; bowl.quad([P[i][0], yTop, P[i][1]], [P[j][0], yTop, P[j][1]], [P[j][0], 26, P[j][1]], [P[i][0], 26, P[i][1]], [-P[i][2], 0, -P[i][3]], [0, 0.0, 1, 0.0, 1, 0.05, 0, 0.05]); } }
    const bowlMat = own(shade(new THREE.MeshStandardMaterial({ map: stepT, roughness: 0.85 })));
    add(bowl.build(), bowlMat, { receive: !low });
    add(backs.build(), own(shade(new THREE.MeshStandardMaterial({ map: backT, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55 }))));
    add(stairs.build(), own(shade(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }))));
    // franja de cristal oscuro a lo alto del muro del fondo (palcos y pasillo)
    { const g = new Geo(), P = rr(ST.x0 + dTop - 0.05, ST.z0 + dTop - 0.05, ST.r0 + dTop - 0.05); for (let i = 0; i < N; i++) { const j = (i + 1) % N; g.quad([P[i][0], yTop + 1.2, P[i][1]], [P[j][0], yTop + 1.2, P[j][1]], [P[j][0], yTop + 3.6, P[j][1]], [P[i][0], yTop + 3.6, P[i][1]], [-P[i][2], 0, -P[i][3]]); }
      add(g.build(), own(new THREE.MeshStandardMaterial({ color: '#1c2a36', roughness: 0.15, metalness: 0.6, emissive: '#2b3c4c', emissiveIntensity: 0.4 }))); }

    // cubierta continua (como en las fotos): por arriba roja con una banda blanca ancha alrededor del hueco y OSASUNA en
    // los fondos; baja hacia fuera. Por debajo, celosía de vigas: la banda de dentro es translúcida (clara) y la de fuera,
    // más oscura. Borde interior blanco con los focos y borde exterior rojo
    const RI = rr(...ROOF_IN), RM = rr(F.HL + 14, F.HW + 13.5, 18), RO = rr(...ROOF_OUT), yIn = 27, yMid = 25.6, yOut = 22.8, TH = 0.5;
    const top = new Geo(), under = [new Geo(), new Geo()], rim = new Geo(), lamps = new Geo(), WHITE_R = lin('#e9e9e6'), RED_R = lin('#c01d2a');
    let s = 0, sm = 0;
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N, l = len(RI, i), l2 = len(RM, i);
      top.quad([RI[i][0], yIn + TH, RI[i][1]], [RI[j][0], yIn + TH, RI[j][1]], [RM[j][0], yMid + TH, RM[j][1]], [RM[i][0], yMid + TH, RM[i][1]], [0, 1, 0], undefined, WHITE_R);
      top.quad([RM[i][0], yMid + TH, RM[i][1]], [RM[j][0], yMid + TH, RM[j][1]], [RO[j][0], yOut + TH, RO[j][1]], [RO[i][0], yOut + TH, RO[i][1]], [0, 1, 0], undefined, RED_R);
      under[0].quad([RI[i][0], yIn, RI[i][1]], [RI[j][0], yIn, RI[j][1]], [RM[j][0], yMid, RM[j][1]], [RM[i][0], yMid, RM[i][1]], [0, -1, 0], [s / 7, 0, (s + l) / 7, 0, (sm + l2) / 7, 12 / 7, sm / 7, 12 / 7]);
      under[1].quad([RM[i][0], yMid, RM[i][1]], [RM[j][0], yMid, RM[j][1]], [RO[j][0], yOut, RO[j][1]], [RO[i][0], yOut, RO[i][1]], [0, -1, 0], [sm / 7, 0, (sm + l2) / 7, 0, (sm + l2) / 7, 21 / 7, sm / 7, 21 / 7]);
      rim.quad([RI[i][0], yIn - 1.3, RI[i][1]], [RI[j][0], yIn - 1.3, RI[j][1]], [RI[j][0], yIn + TH, RI[j][1]], [RI[i][0], yIn + TH, RI[i][1]], [-RI[i][2], 0, -RI[i][3]], undefined, WHITE_R);
      rim.quad([RO[i][0], yOut - 2.2, RO[i][1]], [RO[j][0], yOut - 2.2, RO[j][1]], [RO[j][0], yOut + TH, RO[j][1]], [RO[i][0], yOut + TH, RO[i][1]], [RO[i][2], 0, RO[i][3]], undefined, RED_R);
      // focos: una línea de luces bajo el borde interior
      const nl = Math.max(1, Math.floor(l / 4.5));
      for (let q = 0; q < nl; q++) { const p = lerp(RI, i, (q + 0.5) / nl), nx = RI[i][2], nz = RI[i][3], tx = -nz * 0.6, tz = nx * 0.6;
        lamps.quad([p[0] - tx + nx * 0.4, yIn - 1.4, p[1] - tz + nz * 0.4], [p[0] + tx + nx * 0.4, yIn - 1.4, p[1] + tz + nz * 0.4], [p[0] + tx + nx * 1.4, yIn - 1.4, p[1] + tz + nz * 1.4], [p[0] - tx + nx * 1.4, yIn - 1.4, p[1] - tz + nz * 1.4], [0, -1, 0]); }
      s += l; sm += l2;
    }
    const latT = own(latticeTexture());
    add(top.build(), own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.1 })));
    add(under[0].build(), own(new THREE.MeshStandardMaterial({ map: latT, roughness: 0.7, emissive: '#e9eef3', emissiveMap: latT, emissiveIntensity: 0.75 })));
    add(under[1].build(), own(new THREE.MeshStandardMaterial({ map: latT, roughness: 0.75, color: '#9aa1a9', emissive: '#7d858e', emissiveMap: latT, emissiveIntensity: 0.25 })));
    add(rim.build(), own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide })));
    add(lamps.build(), own(new THREE.MeshBasicMaterial({ color: '#fffbea' })));
    // OSASUNA en blanco sobre la parte roja de la cubierta, en los dos fondos (como en las fotos aéreas)
    const osaT = own(canvasTex(1024, 160, (g, W, Hh) => { g.font = '900 140px Nunito, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.fillText('OSASUNA', W / 2, Hh / 2 + 8); }, { alpha: true }));
    const osaM = own(new THREE.MeshStandardMaterial({ map: osaT, alphaTest: 0.5, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
    for (const s2 of [-1, 1]) {
      const fr = 0.45, xa = ROOF_OUT[0] - (ROOF_OUT[0] - (F.HL + 14)) * (1 - fr), ya = yOut + (yMid - yOut) * (1 - fr) + TH + 0.06, sl = Math.atan2(yMid - yOut, ROOF_OUT[0] - (F.HL + 14));
      // ejes del rótulo: a lo largo del fondo, hacia el hueco subiendo por la cubierta y la normal hacia arriba y afuera
      const u = new THREE.Vector3(0, 0, -s2), v = new THREE.Vector3(-s2 * Math.cos(sl), Math.sin(sl), 0), nrm = new THREE.Vector3().crossVectors(u, v);
      const m = add(new THREE.PlaneGeometry(46, 7.2), osaM);
      m.matrix.makeBasis(u, v, nrm).setPosition(s2 * xa, ya, 0); m.matrixWorldNeedsUpdate = true;
    }
    // fachada: base de paneles gris claro con aletas blancas, la planta baja acristalada con los accesos rojos y azules,
    // un poco metida bajo el vuelo de la cubierta; CA OSASUNA en letras grises en un lateral
    const FA = [F.HL + 34, F.HW + 32.5, 32], FP = rr(...FA), facT = own(facadeTexture()), fac = new Geo();
    { let u = 0; for (let i = 0; i < N; i++) { const j = (i + 1) % N, l = len(FP, i); fac.quad([FP[i][0], 0, FP[i][1]], [FP[j][0], 0, FP[j][1]], [FP[j][0], 21, FP[j][1]], [FP[i][0], 21, FP[i][1]], [FP[i][2], 0, FP[i][3]], [u / 4.8, 0, (u + l) / 4.8, 0, (u + l) / 4.8, 1, u / 4.8, 1]); u += l; } }
    add(fac.build(), own(new THREE.MeshStandardMaterial({ map: facT, roughness: 0.6, metalness: 0.12 })), { receive: !low });
    // tapa entre la fachada y el fondo de la grada, bajo la cubierta (para que no se vea el hueco)
    { const g = new Geo(), A = rr(ST.x0 + dTop, ST.z0 + dTop, ST.r0 + dTop); for (let i = 0; i < N; i++) { const j = (i + 1) % N; g.quad([A[i][0], 21, A[i][1]], [A[j][0], 21, A[j][1]], [FP[j][0], 21, FP[j][1]], [FP[i][0], 21, FP[i][1]], [0, 1, 0], undefined, lin('#5c6067')); }
      add(g.build(), own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }))); }
    const nameT = own(canvasTex(1024, 128, (g, W, Hh) => { g.font = '900 104px Nunito, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#6a7079'; g.fillText('CA OSASUNA', W / 2, Hh / 2 + 6); }, { alpha: true }));
    { const m = add(new THREE.PlaneGeometry(44, 5.5), own(new THREE.MeshStandardMaterial({ map: nameT, alphaTest: 0.5, roughness: 0.5 }))); m.position.set(12, 8.5, -(FA[1] + 0.06)); m.rotation.y = Math.PI; m.updateMatrix(); }
    // vallas LED azules delante de la primera fila
    { const ledT = own(boardTexture(['AUPA GORRITXOAK', 'IRUÑA', 'MENDIMENDIZ', 'NAFARROA'], '#14295e', '#ffffff')), g = new Geo(), P = rr(ST.x0 - 0.06, ST.z0 - 0.06, ST.r0 - 0.06); let u = 0;
      for (let i = 0; i < N; i++) { const j = (i + 1) % N, l = len(P, i); g.quad([P[i][0], 0.2, P[i][1]], [P[j][0], 0.2, P[j][1]], [P[j][0], 1.0, P[j][1]], [P[i][0], 1.0, P[i][1]], [-P[i][2], 0, -P[i][3]], [u / 16, 0, (u + l) / 16, 0, (u + l) / 16, 1, u / 16, 1]); u += l; }
      add(g.build(), own(new THREE.MeshStandardMaterial({ map: ledT, roughness: 0.4, emissive: '#ffffff', emissiveMap: ledT, emissiveIntensity: 0.55 }))); }
    // dos videomarcadores en esquinas opuestas, encima de la grada
    board3 = scoreboard(names); own(board3.tex);
    const sbM = own(new THREE.MeshBasicMaterial({ map: board3.tex })), sbBack = own(new THREE.MeshStandardMaterial({ color: '#15181d', roughness: 0.7 }));
    for (const s2 of [-1, 1]) {
      const a = Math.atan2(s2 * (ST.z0 + 20), s2 * (ST.x0 + 20)), cx = Math.cos(a) * 92, cz = Math.sin(a) * 66, g = new THREE.Group();
      g.position.set(cx * 0.82, 18.4, cz * 0.82); g.lookAt(0, 9, 0);
      const fr = new THREE.Mesh(own(new THREE.BoxGeometry(13.4, 5.9, 0.6)), sbBack); g.add(fr);
      const sc = new THREE.Mesh(own(new THREE.PlaneGeometry(12.6, 5.12)), sbM); sc.position.z = 0.31; g.add(sc);
      S.add(g);
    }
    // banquillos delante de la tribuna, a los lados del túnel de vestuarios
    const benchM = own(new THREE.MeshStandardMaterial({ color: '#1f2328', roughness: 0.6 })), glassM = own(new THREE.MeshStandardMaterial({ color: '#9fb4c4', transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false })), redM = own(new THREE.MeshStandardMaterial({ color: '#c41f2c', roughness: 0.5 }));
    for (const x of benches) {
      const g = new THREE.Group(); g.position.set(x, 0, F.HW + 4.2);
      const seatB = new THREE.Mesh(own(new THREE.BoxGeometry(9, 0.5, 1.1)), redM); seatB.position.set(0, 0.25, 0.4); g.add(seatB);
      const backB = new THREE.Mesh(own(new THREE.BoxGeometry(9, 1.6, 0.12)), benchM); backB.position.set(0, 0.8, 1.0); g.add(backB);
      const roofB = new THREE.Mesh(own(new THREE.BoxGeometry(9.4, 0.08, 2.0)), glassM); roofB.position.set(0, 2.25, 0.3); roofB.rotation.x = -0.12; g.add(roofB);
      for (const sx of [-1, 1]) { const side = new THREE.Mesh(own(new THREE.BoxGeometry(0.06, 2.1, 1.9)), glassM); side.position.set(sx * 4.7, 1.1, 0.3); g.add(side); }
      S.add(g);
    }
    // alrededores: la explanada, unos árboles y bloques de viviendas (Pamplona) para la llegada de la cámara
    const rnd2 = mulberry(5), trees = [], crowns = [], blocks = [], tops = [];
    for (let i = 0; i < 70; i++) {
      const a = rnd2() * Math.PI * 2, r = 112 + rnd2() * 50, x = Math.cos(a) * r * 1.15, z = Math.sin(a) * r;
      const h = 4 + rnd2() * 3; trees.push(new THREE.CylinderGeometry(0.25, 0.35, h, 6).translate(x, h / 2, z)); crowns.push(new THREE.IcosahedronGeometry(2.4 + rnd2() * 1.5, 1).translate(x, h + 1.6, z));
    }
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * Math.PI * 2 + rnd2() * 0.1, r = 205 + rnd2() * 70, x = Math.cos(a) * r * 1.2, z = Math.sin(a) * r, w = 18 + rnd2() * 16, h = 14 + rnd2() * 22, d = 12 + rnd2() * 6;
      blocks.push(new THREE.BoxGeometry(w, h, d).rotateY(-a).translate(x, h / 2, z)); tops.push(new THREE.BoxGeometry(w + 0.6, 0.8, d + 0.6).rotateY(-a).translate(x, h + 0.4, z));
    }
    add(mergeGeometries(trees), own(new THREE.MeshStandardMaterial({ color: '#5a4030', roughness: 1 })));
    add(mergeGeometries(crowns), own(new THREE.MeshStandardMaterial({ color: '#3e6a2e', roughness: 1, flatShading: true })));
    add(mergeGeometries(blocks), own(new THREE.MeshStandardMaterial({ color: '#d8cdb8', roughness: 0.95 })));
    add(mergeGeometries(tops), own(new THREE.MeshStandardMaterial({ color: '#8c5a46', roughness: 0.9 })));
    trees.concat(crowns, blocks, tops).forEach(g => g.dispose());
  } else {
    // pueblo: muro de piedra junto a las vallas, un graderío sencillo en una banda, árboles y casas detrás
    const stoneMat = own(new THREE.MeshStandardMaterial({ color: '#a59a86', roughness: 0.95 }));
    const wallG = [];
    for (const [len, x, z, ry] of [[2 * bx + 0.8, 0, -bz - 0.3, 0], [2 * bx + 0.8, 0, bz + 0.3, 0], [2 * bz, -bx - 0.3, 0, Math.PI / 2], [2 * bz, bx + 0.3, 0, Math.PI / 2]]) {
      const g = new THREE.BoxGeometry(len, 1.1, 0.5); g.translate(0, 0.55, 0); g.rotateY(ry); g.translate(x, 0, z); wallG.push(g);
    }
    add(mergeGeometries(wallG), stoneMat, { receive: true }); wallG.forEach(g => g.dispose());
    // graderío: escalones de piedra con bancos de madera y público
    const steps = [], len = 40;
    for (let k = 0; k < 7; k++) {
      const d = bz + 1.4 + k * 0.8 + 0.4, y = 0.2 + (k + 1) * 0.42;
      steps.push(new THREE.BoxGeometry(len, y, 0.8).translate(0, y / 2, d));
      for (let x = -len / 2 + 0.35; x < len / 2 - 0.2; x += 0.55) seats.push([x, y, d - 0.1, Math.PI, k]);
    }
    add(mergeGeometries(steps), stoneMat, { receive: true }); steps.forEach(g => g.dispose());
    const rnd = mulberry(29);
    for (const [x, y, z, ry] of seats) if (rnd() < (low ? 0.42 : 0.62)) spots.push([x, y + 0.02, z, ry]);
    const rnd3 = mulberry(11), trees = [], crowns = [], houses = [], roofsH = [];
    for (let i = 0; i < 60; i++) {
      const a = rnd3() * Math.PI * 2, rx = bx + 10 + rnd3() * 22, rz = bz + 10 + rnd3() * 18, x = Math.cos(a) * rx, z = Math.sin(a) * rz;
      const h = 3 + rnd3() * 3; trees.push(new THREE.CylinderGeometry(0.18, 0.26, h, 6).translate(x, h / 2, z));
      crowns.push(new THREE.IcosahedronGeometry(1.8 + rnd3() * 1.4, 1).translate(x, h + 1.2, z));
    }
    for (let i = 0; i < 12; i++) {
      const x = -bx + 6 + i * (2 * bx - 12) / 11 + rnd3() * 3, z = -bz - 16 - rnd3() * 6, w = 7 + rnd3() * 3, h = 6 + rnd3() * 4;
      houses.push(new THREE.BoxGeometry(w, h, 7).translate(x, h / 2, z));
      const r = new THREE.ConeGeometry(w * 0.75, 2.4, 4); r.rotateY(Math.PI / 4); r.translate(x, h + 1.2, z); roofsH.push(r);
    }
    add(mergeGeometries(trees), own(new THREE.MeshStandardMaterial({ color: '#5a4030', roughness: 1 })));
    add(mergeGeometries(crowns), own(new THREE.MeshStandardMaterial({ color: '#3e6a2e', roughness: 1, flatShading: true })));
    add(mergeGeometries(houses), own(new THREE.MeshStandardMaterial({ color: '#e8dcc4', roughness: 0.95 })));
    add(mergeGeometries(roofsH), own(new THREE.MeshStandardMaterial({ color: '#a4482e', roughness: 0.9, flatShading: true })));
    trees.concat(crowns, houses, roofsH).forEach(g => g.dispose());
  }
  if (crowd && spots.length) { try { people = crowd(spots); if (people) S.add(people); } catch (e) { console.warn('público del fútbol', e); } }

  // la red se abomba donde entra el balón y vuelve oscilando
  function netHit(side, z, y, strength = 1) { const n = nets.find(n => n.s === side); if (n) n.hits.push({ z, y, a: Math.min(0.5, 0.12 + strength * 0.03), t: 0 }); }
  function tick(dt, t, camera, excite = 0.3, focus = 0) {
    for (const n of nets) {
      if (!n.hits.length && !n.dirty) continue;
      const pos = n.back.geometry.attributes.position, arr = pos.array; arr.set(n.base);
      n.hits = n.hits.filter(h => (h.t += dt) < 1.4);
      for (let i = 0; i < arr.length; i += 3) {
        // plano girado: x local = −z del mundo (lado), y local = altura
        const lz = -arr[i], ly = arr[i + 1] + H / 2; let d = 0;
        for (const h of n.hits) { const w = Math.exp(-((lz - h.z) ** 2 + (ly - h.y) ** 2) / 0.35); d += h.a * w * Math.exp(-h.t * 3.2) * Math.cos(h.t * 11); }
        arr[i + 2] = n.base[i + 2] + d * n.s;
      }
      pos.needsUpdate = true; n.dirty = n.hits.length > 0;
    }
    people?.tick?.(t, excite, focus, camera);
  }
  // el mapa de sombras va con el juego: se centra donde mira la cámara (redondeado a su resolución para que no tiemble)
  const tgt = new THREE.Vector3();
  function follow(x, z) {
    const step = 64 / (sun.shadow?.mapSize?.x || 1024);
    tgt.set(Math.round(x / step) * step, 0, Math.round(z / step) * step);
    sun.target.position.copy(tgt); sun.position.copy(SUN).multiplyScalar(60).add(tgt); sun.target.updateMatrixWorld();
  }
  function cheer(on) { people?.cheer?.(on); }
  function setScore(a, b) { board3?.draw(a, b); }
  function dispose() {
    S.traverse(o => { if (o.isInstancedMesh) o.dispose?.(); });
    for (const g of owned.geo) g.dispose(); for (const m of owned.mat) m.dispose(); for (const t of owned.tex) t.dispose();
    people?.dispose?.();
  }
  return { scene: S, sun, venue: V, netHit, tick, follow, cheer, setScore, dispose, spots, roof: stadium ? U : null };
}
