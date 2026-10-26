// El mapa 3D de Navarra del inicio: las comarcas con su relieve de verdad (sierras, valles y ríos), cada una en su color y
// separada de las demás, con todos los pueblos del juego señalados encima, y una cámara para recorrerlo. Las comarcas por
// descubrir salen apagadas y bajas; a medida que sellas sus pueblos se encienden y crecen, hasta brillar del todo: así se
// ve lo que falta para conquistar Navarra. Se mueve como en un juego: arrastrar (o WASD y las flechas) para ir adelante,
// atrás y a los lados, la rueda o el pellizco para acercarse, el botón derecho (o Q y E, o girar con dos dedos) para
// rotar, y los botones de la esquina.
// Al tocar una comarca, la cámara vuela hasta ella; al tocar un pueblo, también, y se abre su ficha.
// Usa el renderizador del menú (src/hub/stage.js: un solo contexto WebGL para todo el menú) y se para solo en cuanto su
// caja sale de la página o deja de verse. Los nombres van en HTML encima del lienzo, nítidos a cualquier tamaño.
import * as THREE from 'three';
import { hubRenderer, rendererVivo } from './stage.js';
import { escala } from '../util/tele.js';
import { esc } from '../util/html.js';
import { mapaXY } from '../util/geo.js';
import { REAL_IDS, loadReal } from '../data/reales/index.js';
import { MAPA_RELIEVE, MAPA_ALTURAS } from '../data/mapa-relieve.js';
import SOMBRA from '../assets/relieve/sombra.webp?url';
import { webUrl } from '../web/hd.js';
import { haceMaqueta } from './maqueta.js';

// (las coordenadas son las del mapa de comarcas de comarcas.json, viewBox 10 10 725 780: se centran y se pasan a metros
// del mundo 3D, con el norte hacia el fondo)
const CX = 372, CY = 400, S = 0.1;
const W = (sx, sy) => [(sx - CX) * S, (sy - CY) * S];

// el contorno de cada comarca viene en escalones (de una rejilla): se simplifica y se suaviza para que el borde en 3D sea limpio
function puntos(path) {
  const n = path.match(/-?\d+(\.\d+)?/g).map(Number), P = [];
  for (let i = 0; i + 1 < n.length; i += 2) P.push([n[i], n[i + 1]]);
  return P;
}
function simplifica(P, eps) {
  if (P.length < 4) return P;
  const d = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9; return Math.abs(dx * (a[1] - p[1]) - (a[0] - p[0]) * dy) / L; };
  const rec = (a, b, out) => { let m = 0, k = -1; for (let i = a + 1; i < b; i++) { const v = d(P[i], P[a], P[b]); if (v > m) { m = v; k = i; } } if (m > eps) { rec(a, k, out); rec(k, b, out); } else out.push(P[a]); };
  const out = []; rec(0, P.length - 1, out); return out;
}
const chaikin = (P) => P.flatMap((p, i) => { const q = P[(i + 1) % P.length]; return [[p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]]; });
function contorno(path) {
  let P = puntos(path); if (P.length > 2 && P[0][0] === P.at(-1)[0] && P[0][1] === P.at(-1)[1]) P.pop();
  P = chaikin(chaikin(simplifica(P, 1.1)));
  let cx = 0, cy = 0; for (const [x, y] of P) { cx += x; cy += y; } cx /= P.length; cy /= P.length;
  // (un poco encogida hacia su centro: entre comarca y comarca queda una raya oscura que las separa)
  const k = 0.982; return { P: P.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]), cx, cy };
}

const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const mezcla = (a, b, t) => a + (b - a) * t;
// (las paredes de cada comarca, violeta oscuro con un toque de su color)
const PARED = new THREE.Color('#1d1240'), BLANCO = new THREE.Color('#ffffff');
// (un dibujo en un lienzo, como textura)
function lienzo(w, h, pinta) { const c = document.createElement('canvas'); c.width = w; c.height = h; pinta(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
// la nube de la niebla: varias bolas blandas juntas
const nubeTex = () => lienzo(128, 128, (g) => { for (const [x, y, r, a] of [[64, 70, 46, 0.55], [40, 72, 30, 0.5], [88, 74, 32, 0.5], [58, 52, 30, 0.45], [80, 56, 26, 0.4]]) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); } });
// la chincheta de cada pueblo: blanca por descubrir, fucsia empezado, dorada sellado (con su estrella)
const PIN = { '': ['#f4efff', '#b9a8ee'], go: ['#ff8fd3', '#ff2bd6'], ok: ['#ffe28a', '#ffae1f'] };
const pinTex = (k) => lienzo(64, 84, (g) => {
  const [c1, c2] = PIN[k], gr = g.createLinearGradient(0, 4, 0, 60); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  g.shadowColor = c2; g.shadowBlur = 8;
  g.beginPath(); g.arc(32, 30, 24, Math.PI * 0.82, Math.PI * 2.18); g.lineTo(32, 80); g.closePath(); g.fillStyle = gr; g.fill();
  g.shadowBlur = 0; g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.95)'; g.stroke();
  g.fillStyle = '#ffffff';
  if (k === 'ok') { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 6 : 13; g.lineTo(32 + Math.cos(a) * rr, 30 + Math.sin(a) * rr); } g.closePath(); g.fill(); }
  else { g.beginPath(); g.arc(32, 30, 9, 0, Math.PI * 2); g.fill(); if (k === '') { g.fillStyle = '#b9a8ee'; g.beginPath(); g.arc(32, 30, 4, 0, Math.PI * 2); g.fill(); } }
});
const brilloTex = () => lienzo(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
// (la cinta de un río: clara en el centro y difuminada a los lados)
const rioTex = () => lienzo(4, 64, (g) => { const gr = g.createLinearGradient(0, 0, 0, 64); for (const [k, a] of [[0, 0], [0.22, 0.25], [0.36, 1], [0.64, 1], [0.78, 0.25], [1, 0]]) gr.addColorStop(k, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, 4, 64); });
const hazTex = () => lienzo(4, 128, (g) => { const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 128); });
// ---------- el relieve ----------
// El de verdad (src/data/mapa-relieve.js: SRTM y GMTED2010, una altura cada 600 m), exagerado unas cinco veces para
// que las sierras se lean desde arriba; el detalle de cada ladera lo pone el sombreado fino (EU-DEM de Copernicus)
const GROSOR = 0.6, EXA = 0.0026;
let ALTS = null;
function hacerRelieve() {
  const R = MAPA_RELIEVE, nx = R.nx;
  // (de cada fila viene solo el tramo que toca Navarra; lo demás, a cero)
  if (!ALTS) { const d = Uint8Array.from(atob(MAPA_ALTURAS), c => c.charCodeAt(0)), F = R.filas; ALTS = new Uint8Array(nx * R.ny); for (let j = 0, o = 0; j < R.ny; o += F[j * 2 + 1], j++) ALTS.set(d.subarray(o, o + F[j * 2 + 1]), j * nx + F[j * 2]); }
  // (los embalses: junto a su orilla, el relieve no pasa del nivel del agua)
  const L = R.lagos.flatMap(l => l.b.map((tr, n) => { const P = []; for (let k = 0; k + 1 < tr.length; k += 2) P.push(W(tr[k], tr[k + 1]));
    return { P, h: l.h[n] * EXA, x0: Math.min(...P.map(p => p[0])), x1: Math.max(...P.map(p => p[0])), z0: Math.min(...P.map(p => p[1])), z1: Math.max(...P.map(p => p[1])) }; }));
  // (de metros del mundo a la rejilla, y la altura de los cuatro puntos de alrededor, mezclada)
  return (x, z) => {
    const gx = Math.max(0, Math.min(nx - 1.001, (x / S + CX - R.x0) / R.paso)), gz = Math.max(0, Math.min(R.ny - 1.001, (z / S + CY - R.y0) / R.paso));
    const i = gx | 0, j = gz | 0, fx = gx - i, fz = gz - j, k = j * nx + i;
    const h = ((ALTS[k] * (1 - fx) + ALTS[k + 1] * fx) * (1 - fz) + (ALTS[k + nx] * (1 - fx) + ALTS[k + nx + 1] * fx) * fz) * R.u * EXA;
    for (const l of L) if (h > l.h && x >= l.x0 && x <= l.x1 && z >= l.z0 && z <= l.z1 && enPoligono(l.P, x, z)) return l.h;
    return h;
  };
}
// (el trozo del contorno que cae dentro de un cuadrado: recortado lado a lado, Sutherland-Hodgman)
function recorte(P, x0, z0, x1, z1) {
  let R = P;
  for (const [dentro, corta] of [[(p) => p[0] >= x0, (a, b) => [x0, a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0])]], [(p) => p[0] <= x1, (a, b) => [x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0])]],
    [(p) => p[1] >= z0, (a, b) => [a[0] + (b[0] - a[0]) * (z0 - a[1]) / (b[1] - a[1]), z0]], [(p) => p[1] <= z1, (a, b) => [a[0] + (b[0] - a[0]) * (z1 - a[1]) / (b[1] - a[1]), z1]]]) {
    const S = R; R = []; if (!S.length) break;
    for (let i = 0; i < S.length; i++) { const a = S[(i + S.length - 1) % S.length], b = S[i], ia = dentro(a), ib = dentro(b);
      if (ib) { if (!ia) R.push(corta(a, b)); R.push(b); } else if (ia) R.push(corta(a, b)); }
  }
  return R;
}
// cada comarca, una losa con su relieve: la cara de arriba, una rejilla de cuadrados (los del borde, recortados por el
// contorno) con la altura de cada punto, que comparten vértices para que la luz caiga suave sobre los montes; y las
// paredes, del suelo a esa altura. Grupos: 0 arriba, 1 paredes
function losa(P, alto, paso) {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const nx = Math.ceil((x1 - x0) / paso), nz = Math.ceil((z1 - z0) / paso), fila = nx + 1;
  // (qué esquinas de la rejilla caen dentro del contorno: fila a fila, entre los puntos donde la cortan los lados)
  const inn = new Uint8Array(fila * (nz + 1)), cortes = [];
  for (let j = 0; j <= nz; j++) {
    const z = z0 + j * paso; cortes.length = 0;
    for (let a = 0, b = P.length - 1; a < P.length; b = a++) { const pa = P[a], pb = P[b]; if ((pa[1] > z) !== (pb[1] > z)) cortes.push(pa[0] + (pb[0] - pa[0]) * (z - pa[1]) / (pb[1] - pa[1])); }
    cortes.sort((u, w) => u - w);
    for (let k = 0; k + 1 < cortes.length; k += 2) for (let i = Math.max(0, Math.ceil((cortes[k] - x0) / paso)), i1 = Math.min(nx, Math.floor((cortes[k + 1] - x0) / paso)); i <= i1; i++) inn[j * fila + i] = 1;
  }
  // (los vértices: los de la rejilla, por su número; los del borde recortado, por su sitio; así los comparten los cuadrados)
  const pos = [], nodo = new Int32Array(fila * (nz + 1)).fill(-1), clave = new Map(), idx = [];
  const nuevo = (x, z) => { pos.push(x, 0, z); return pos.length / 3 - 1; };
  const nd = (i, j) => { const k = j * fila + i; return nodo[k] >= 0 ? nodo[k] : (nodo[k] = nuevo(x0 + i * paso, z0 + j * paso)); };
  const vid = ([x, z]) => {
    const fi = (x - x0) / paso, fj = (z - z0) / paso, i = Math.round(fi), j = Math.round(fj);
    if (Math.abs(fi - i) < 1e-6 && Math.abs(fj - j) < 1e-6) return nd(i, j);
    const k = Math.round(x * 512) + ',' + Math.round(z * 512); let v = clave.get(k); if (v == null) clave.set(k, v = nuevo(x, z)); return v;
  };
  // (los cuadrados que tienen algún vértice del contorno dentro: esos se recortan aunque sus esquinas caigan dentro)
  const conBorde = new Set(P.map(([x, z]) => Math.floor((x - x0) / paso) + Math.floor((z - z0) / paso) * fila));
  const tri = (a, b, c) => { const ux = b[0] - a[0], uz = b[1] - a[1], wx = c[0] - a[0], wz = c[1] - a[1], cr = uz * wx - ux * wz; if (Math.abs(cr) < 1e-7) return; cr > 0 ? idx.push(vid(a), vid(b), vid(c)) : idx.push(vid(a), vid(c), vid(b)); };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const n = j * fila + i, dentro = inn[n] + inn[n + 1] + inn[n + fila + 1] + inn[n + fila], borde = conBorde.has(n);
    if (dentro === 4 && !borde) { const a = nd(i, j), b = nd(i + 1, j), c = nd(i + 1, j + 1), d = nd(i, j + 1); idx.push(a, c, b, a, d, c); continue; }
    if (!dentro && !borde) continue;
    const ax = x0 + i * paso, az = z0 + j * paso, R = recorte(P, ax, az, ax + paso, az + paso); if (R.length < 3) continue;
    for (const t of THREE.ShapeUtils.triangulateShape(R.map(([x, z]) => new THREE.Vector2(x, z)), [])) tri(R[t[0]], R[t[1]], R[t[2]]);
  }
  let hmax = 0; const nV = pos.length / 3;
  for (let v = 0; v < pos.length; v += 3) { const h = alto(pos[v], pos[v + 2]); hmax = Math.max(hmax, h); pos[v + 1] = GROSOR + h; }
  const nTop = idx.length;
  for (let i = 0; i < P.length; i++) {
    const j = (i + 1) % P.length, [ax, az] = P[i], [bx, bz] = P[j], ha = GROSOR + alto(ax, az), hb = GROSOR + alto(bx, bz), k = pos.length / 3;
    pos.push(ax, 0, az, bx, 0, bz, bx, hb, bz, ax, ha, az);
    idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.addGroup(0, nTop, 0); g.addGroup(nTop, idx.length - nTop, 1); g.computeVertexNormals(); g.computeBoundingBox();
  // (la sombra de cada ladera, con una luz del noroeste y la pendiente algo más marcada: la que se ve mientras llega la
  // imagen del sombreado fino, y si no llega)
  const nor = g.attributes.normal.array, col = new Float32Array(pos.length).fill(1);
  for (let v = 0; v < nV; v++) {
    const ny = Math.max(0.05, nor[v * 3 + 1]), dx = -nor[v * 3] / ny * 2.6, dz = -nor[v * 3 + 2] / ny * 2.6, luz = Math.max(0, (0.6 * dx + 0.62 + 0.5 * dz) / Math.hypot(dx, 1, dz));
    col[v * 3] = col[v * 3 + 1] = col[v * 3 + 2] = 0.45 + 0.88 * luz;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return { g, hmax, malla: { x0, z0, paso } };
}
// ---------- el color del relieve, como en los mapas físicos ----------
// La altura da el color (verde en los valles, ocre y pardo en las sierras, gris y blanco en las cumbres) y la imagen del
// sombreado fino (tools/relieve/mapa-relieve.py: cada ladera según su pendiente, con luz del noroeste) le pone la luz y
// las sombras de cada barranco. Las cuentas van en sRGB, como en un mapa impreso. Las comarcas por descubrir, algo
// apagadas y hacia el malva; uBrillo, lo que se aclara al pasar por encima o al elegirla. De cerca, encima, el relieve
// fino de la comarca (uDet, unos 28 m, ya pintado igual), que entra poco a poco (uDetK).
const PALETA = [[0, '#3e8c3a'], [250, '#5ca03e'], [450, '#80ac4e'], [650, '#aab266'], [850, '#b8a070'], [1100, '#a07e5a'], [1400, '#846852'], [1700, '#8c8078'], [2000, '#cdc8c6'], [2400, '#f5f4f4']];
// (el relieve fino de cada comarca: en la web, sus imágenes, a 28 m y a 56 m para el móvil; en el archivo único, las de
// la web publicada, si se llega a ella: src/web/hd.js)
const porId = (g) => Object.fromEntries(Object.entries(g).map(([p, f]) => [p.split('/').pop().replace('.webp', ''), f]));
const DET_FULL = porId(import.meta.glob('@relieve-full/*.webp', { query: '?url', import: 'default' })), DET_MEDIO = porId(import.meta.glob('@relieve-medio/*.webp', { query: '?url', import: 'default' }));
const urlDetalle = async (id, fino) => { const f = (fino ? DET_FULL[id] : DET_MEDIO[id]) || DET_FULL[id] || DET_MEDIO[id]; return f ? f() : webUrl('relieve', id, fino ? 2 : 1); };
const srgb = (hex) => new THREE.Color(hex).getRGB(new THREE.Color(), THREE.SRGBColorSpace);
const RELIEVE_VS = `varying vec2 vXZ; varying float vH, vSom;
#include <fog_pars_vertex>
void main() { vXZ = position.xz; vH = position.y; vSom = color.r; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const RELIEVE_FS = `uniform sampler2D uSombra, uDet, uP0, uP1, uP2, uP3; uniform vec4 uRect, uDetRect, uPR[4], uHueco; uniform float uPK[4], uCerca, uDetK, uListo, uGrosor, uExa, uGris, uTintK, uBrillo; uniform vec3 uTinte, uPal[${PALETA.length}]; uniform float uCota[${PALETA.length}];
varying vec2 vXZ; varying float vH, vSom;
#include <fog_pars_fragment>
// (un pueblo pintado encima, si el punto cae en su recuadro)
vec4 pue(sampler2D t, vec4 r, float k, vec2 sv) { vec2 u = (sv - r.xy) / r.zw; if (k <= 0.0 || u.x < 0.0 || u.y < 0.0 || u.x > 1.0 || u.y > 1.0) return vec4(0.0); vec4 p = texture2D(t, u); return vec4(p.rgb, p.a * k); }
// (el grano fino de cerca: ruido de valores en dos octavas, en unidades del mapa)
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ruido(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
void main() {
  if (uHueco.w > 0.5 && distance(vXZ, uHueco.xy) < uHueco.z) discard;   // (donde está la maqueta de un pueblo)
  float m = max(0.0, (vH - uGrosor) / uExa);
  vec3 c = uPal[0];
  for (int i = 1; i < ${PALETA.length}; i++) c = mix(c, uPal[i], clamp((m - uCota[i - 1]) / (uCota[i] - uCota[i - 1]), 0.0, 1.0));
  vec2 sv = vXZ / ${S.toFixed(1)} + vec2(${CX.toFixed(1)}, ${CY.toFixed(1)});
  float s = mix(vSom * 0.95, texture2D(uSombra, (sv - uRect.xy) / uRect.zw).r * 1.7, uListo);
  c = c * s + 0.35 * pow(clamp((s - 0.3) / 1.05, 0.0, 1.0), 8.0);
  c = mix(c, texture2D(uDet, (sv - uDetRect.xy) / uDetRect.zw).rgb, uDetK);
  if (uCerca > 0.0) c *= 1.0 + (ruido(sv * 18.0) * 0.6 + ruido(sv * 55.0) * 0.4 - 0.5) * 0.14 * uCerca;
  vec4 p = pue(uP0, uPR[0], uPK[0], sv); c = mix(c, p.rgb, p.a);
  p = pue(uP1, uPR[1], uPK[1], sv); c = mix(c, p.rgb, p.a);
  p = pue(uP2, uPR[2], uPK[2], sv); c = mix(c, p.rgb, p.a);
  p = pue(uP3, uPR[3], uPK[3], sv); c = mix(c, p.rgb, p.a);
  c = mix(c, vec3(dot(c, vec3(0.299, 0.587, 0.114))) * vec3(0.95, 0.92, 1.1), uGris);
  gl_FragColor = vec4(mix(c, uTinte, uTintK) * uBrillo, 1.0);
#include <fog_fragment>
}`;
// (el relieve de la maqueta de un pueblo: pasa poco a poco de la altura de la comarca, position.y, a la del pueblo, hd)
const PARCHE_VS = RELIEVE_VS.replace('varying vec2 vXZ;', 'attribute float hd; uniform float uMaqK; varying vec2 vXZ;')
  .replace('vH = position.y;', 'vec3 q = vec3(position.x, mix(position.y, hd, uMaqK), position.z); vH = q.y;').replace('vec4(position, 1.0)', 'vec4(q, 1.0)');
const enPoligono = (P, x, z) => { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inn = !inn; } return inn; };

/**
 * host: la caja donde va el mapa. o: { comarcas: [{ id, name, color, path, pct, done }], towns: [{ id, name, comarca,
 * sx, sy, state: ''|'go'|'ok', bosque, here }], onTown(id), onSelect(comarcaId|null), hueco(), tapa, icono(nombre) }.
 * hueco: los píxeles que tapa lo de encima ({ t: arriba, r: a la derecha, b: abajo }): Navarra se encaja y lo elegido
 * se centra en lo que queda libre. tapa: un selector de lo de encima (el saludo, los botones…), para que ningún nombre quede debajo.
 * Devuelve { select(id), vista(), dispose() }.
 */
export function mapa3d(host, o) {
  let r; try { r = hubRenderer(); } catch (e) { return null; }   // (sin WebGL: quien llama pone el mapa plano)
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x14062e, 90, 190);
  const cam = new THREE.PerspectiveCamera(42, 1, 0.5, 400);
  // (la luz, baja y del noroeste, como en los mapas de relieve: las laderas de sombra marcan las sierras)
  scene.add(new THREE.HemisphereLight(0xe6dcff, 0x241046, 1.15));
  const sol = new THREE.DirectionalLight(0xffffff, 2.4); sol.position.set(-50, 38, -22); scene.add(sol);
  const mats = [], geos = [];
  const M = (o2) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05, toneMapped: false, ...o2 }); mats.push(m); return m; };

  // el suelo: un disco morado oscuro con una rejilla tenue y un halo debajo de Navarra
  const tc = document.createElement('canvas'); tc.width = tc.height = 512; const tg = tc.getContext('2d');
  const gr = tg.createRadialGradient(256, 256, 0, 256, 256, 256); gr.addColorStop(0, '#3a1580'); gr.addColorStop(0.45, '#1d0a45'); gr.addColorStop(1, '#0d0420');
  tg.fillStyle = gr; tg.fillRect(0, 0, 512, 512);
  tg.strokeStyle = 'rgba(190,150,255,.10)'; tg.lineWidth = 1; for (let i = 0; i <= 512; i += 16) { tg.beginPath(); tg.moveTo(i, 0); tg.lineTo(i, 512); tg.moveTo(0, i); tg.lineTo(512, i); tg.stroke(); }
  const suelo = new THREE.CanvasTexture(tc); suelo.colorSpace = THREE.SRGBColorSpace;
  const sg = new THREE.CircleGeometry(150, 64); geos.push(sg);
  const base = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: suelo, toneMapped: false })); mats.push(base.material); base.material.map.dispose = suelo.dispose.bind(suelo);
  base.rotation.x = -Math.PI / 2; scene.add(base);

  // el sombreado fino, compartido por todas las comarcas (mientras llega, el de cada vértice)
  const R = MAPA_RELIEVE.sombra, LISTO = { value: 0 };
  const sombra = new THREE.TextureLoader().load(SOMBRA, () => { LISTO.value = 1; });
  sombra.flipY = false; sombra.colorSpace = THREE.NoColorSpace; sombra.anisotropy = 4;
  const UNI = { uSombra: { value: sombra }, uListo: LISTO, uRect: { value: new THREE.Vector4(R.x0 - R.paso / 2, R.y0 - R.paso / 2, R.w * R.paso, R.h * R.paso) },
    uGrosor: { value: GROSOR }, uExa: { value: EXA }, uPal: { value: PALETA.map(([, h]) => srgb(h)) }, uCota: { value: PALETA.map(([m]) => m) } };
  const nada = new THREE.DataTexture(new Uint8Array([128, 140, 90, 255]), 1, 1); nada.needsUpdate = true;
  const CERCA = { value: 0 };   // (lo cerca que está la cámara, de 0 a 1: el grano fino del terreno)
  const relieveM = (c, vivo) => { const d = MAPA_RELIEVE.detalle[c.id], m = new THREE.ShaderMaterial({ vertexShader: RELIEVE_VS, fragmentShader: RELIEVE_FS, vertexColors: true, fog: true,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...UNI, uDet: { value: nada }, uDetK: { value: 0 }, uCerca: CERCA,
      uP0: { value: nada }, uP1: { value: nada }, uP2: { value: nada }, uP3: { value: nada }, uPR: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 1, 1)) }, uPK: { value: [0, 0, 0, 0] }, uDetRect: { value: d ? new THREE.Vector4(d.x0, d.y0, d.w * d.paso, d.h * d.paso) : new THREE.Vector4(0, 0, 1, 1) }, uGris: { value: vivo ? 0 : 0.22 }, uTinte: { value: srgb(vivo ? c.color : '#8f7fd0') }, uTintK: { value: vivo ? 0.08 : 0.1 }, uBrillo: { value: 1 }, uHueco: { value: new THREE.Vector4(0, 0, 0, 0) } } });
    mats.push(m); return m; };

  // las comarcas
  const LENTO = matchMedia?.('(pointer: coarse)').matches;   // (en el móvil, 30 imágenes por segundo y el relieve algo menos fino)
  const alto = hacerRelieve();
  const C = o.comarcas.map((c, i) => {
    const { P, cx, cy } = contorno(c.path);
    const Pw = P.map(([x, y]) => W(x, y)), { g, hmax, malla } = losa(Pw, alto, LENTO ? 0.42 : 0.3); geos.push(g);
    // (empezada, con los colores del mapa y un toque del suyo; sin descubrir, apagada y hacia el malva, bajo la niebla)
    const vivo = c.pct > 0 || c.done, top = relieveM(c, vivo);
    const side = M({ color: PARED.clone().lerp(new THREE.Color(c.color), vivo ? 0.28 : 0.16), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, [top, side]); mesh.userData.c = c.id;
    // (lo que se levanta la comarca con sus sellos)
    const alzado = 0.35 * c.pct + (c.done ? 0.35 : 0);
    mesh.scale.y = 0.01; scene.add(mesh);
    // (el borde de arriba, una línea clara del color de la comarca, por encima del relieve)
    const lg = new THREE.BufferGeometry().setFromPoints(Pw.map(([X, Z]) => new THREE.Vector3(X, GROSOR + alto(X, Z) + 0.05, Z))); geos.push(lg);
    const linea = new THREE.LineLoop(lg, new THREE.LineBasicMaterial({ color: new THREE.Color(c.color).lerp(BLANCO, 0.4), transparent: true, opacity: vivo ? 1 : 0.85, toneMapped: false })); mats.push(linea.material);
    scene.add(linea);
    const [X, Z] = W(cx, cy);
    const lab = document.createElement('div'); lab.className = 'm3-cl' + (c.done ? ' ok' : vivo ? ' go' : ' lk'); lab.style.setProperty('--c', c.color);
    lab.innerHTML = `${!vivo && o.icono ? `<i>${o.icono('lock')}</i>` : c.done && o.icono ? `<i>${o.icono('stamp')}</i>` : ''}<b>${esc(c.name)}</b>`;
    return { ...c, vivo, Pw, hmax, malla, hc: GROSOR + alto(X, Z), mesh, top, linea, alzado, lift: 0, fondo: 0, gris: top.uniforms.uGris.value, lineaOp: vivo ? 1 : 0.85, X, Z, lab, d: 0.25 + i * 0.07 };
  });
  const byId = new Map(C.map(c => [c.id, c]));
  // (la altura de la cara de arriba de una comarca en un punto, la de su rejilla de triángulos y no la de los datos: en
  // los valles estrechos se apartan, y los ríos y las casas, con la de los datos, quedaban bajo el monte)
  const sobre = (c, x, z) => {
    const { x0, z0, paso } = c.malla, gx = (x - x0) / paso, gz = (z - z0) / paso, i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
    const H = (a, b) => alto(x0 + a * paso, z0 + b * paso), ha = H(i, j), hc = H(i + 1, j + 1);
    if (fx > fz) { const hb = H(i + 1, j); return ha + fx * (hb - ha) + fz * (hc - hb); }
    const hd = H(i, j + 1); return ha + fz * (hd - ha) + fx * (hc - hd);
  };
  // (la comarca de un punto; antes que ninguna, la del punto anterior, que casi siempre es la misma)
  const en = (c, x, z) => { const b = c.mesh.geometry.boundingBox; return x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z && enPoligono(c.Pw, x, z); };
  const deQuien = (x, z, antes) => antes && en(antes, x, z) ? antes : C.find(c => c !== antes && en(c, x, z));

  // los ríos: una cinta de luz azul sobre el relieve, cortada por comarcas (cada trozo va con la suya cuando se levanta)
  const rioM = new THREE.MeshBasicMaterial({ map: rioTex(), color: 0x7cd0ff, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }); mats.push(rioM);
  const ANCHO = [0, 0.42, 0.32, 0.24], cintas = new Map();
  const cinta = (c, Q, w) => {
    let a = cintas.get(c); if (!a) cintas.set(c, a = { p: [], uv: [], i: [], lado: [] });
    const b = a.p.length / 3;
    for (let k = 0; k < Q.length; k++) {
      const p = Q[Math.max(0, k - 1)], n = Q[Math.min(Q.length - 1, k + 1)], L = Math.hypot(n[0] - p[0], n[1] - p[1]) || 1;
      const [x, z] = Q[k], ox = -(n[1] - p[1]) / L * w / 2, oz = (n[0] - p[0]) / L * w / 2;
      // (cada lado, en el centro y con lo que se aparta de él: el ancho, y su altura, cambian con la distancia de la cámara)
      const yc = GROSOR + sobre(c, x, z) + 0.05, yl = sobre(c, x + ox, z + oz) - sobre(c, x, z), yr = sobre(c, x - ox, z - oz) - sobre(c, x, z);
      a.p.push(x, yc, z, x, yc, z); a.lado.push(ox, yl, oz, -ox, yr, -oz); a.uv.push(k * 0.1, 0, k * 0.1, 1);
      if (k) { const v = b + k * 2; a.i.push(v - 2, v, v - 1, v - 1, v, v + 1); }
    }
  };
  for (const rio of MAPA_RELIEVE.rios) for (const tr of rio.p) {
    // (el trazo, redondeado: sin los picos de la línea simplificada, que de cerca se veían en zigzag; y con un punto cada
    // décimo de unidad, para que se pegue al relieve)
    let P = []; for (let i = 0; i + 1 < tr.length; i += 2) P.push(W(tr[i], tr[i + 1]));
    for (let it = 0; it < 3 && P.length > 2; it++) { const S = [P[0]]; for (let i = 0; i + 1 < P.length; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1]; S.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]); } S.push(P.at(-1)); P = S; }
    const Q = [];
    for (let i = 0; i + 1 < P.length; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.1)); for (let k = 0; k < n; k++) Q.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]); }
    Q.push(P.at(-1));
    let tramo = [], de = null;
    for (const q of Q) { const c = deQuien(q[0], q[1], de); if (c !== de) { if (de && tramo.length > 1) cinta(de, tramo, ANCHO[rio.k]); tramo = []; de = c; } if (c) tramo.push(q); }
    if (de && tramo.length > 1) cinta(de, tramo, ANCHO[rio.k]);
  }
  // los embalses: una lámina de agua a su nivel (el relieve, alrededor, no pasa de él)
  const lagoM = new THREE.MeshBasicMaterial({ color: 0x5ab8f0, transparent: true, opacity: 0.92, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }); mats.push(lagoM);
  for (const lago of MAPA_RELIEVE.lagos) lago.p.forEach((tr, n) => {
    const P = []; for (let i = 0; i + 1 < tr.length; i += 2) P.push(W(tr[i], tr[i + 1]));
    let mx = 0, mz = 0; for (const [x, z] of P) { mx += x / P.length; mz += z / P.length; }
    const c = deQuien(mx, mz); if (!c) return;
    const pos = P.flatMap(([x, z]) => [x, GROSOR + lago.h[n] * EXA + 0.04, z]), idx = [];
    for (const [a, b, d] of THREE.ShapeUtils.triangulateShape(P.map(([x, z]) => new THREE.Vector2(x, z)), [])) { const cr = (P[b][1] - P[a][1]) * (P[d][0] - P[a][0]) - (P[b][0] - P[a][0]) * (P[d][1] - P[a][1]); cr > 0 ? idx.push(a, b, d) : idx.push(a, d, b); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); geos.push(g);
    const m = new THREE.Mesh(g, lagoM); m.renderOrder = 1; m.userData.lago = true; c.mesh.add(m);
  });
  // (cada comarca, con su copia de los materiales del agua: se apaga con ella cuando pasa al fondo)
  // (el ancho de los ríos, según la distancia: de lejos, bien visibles; de cerca, más o menos el de verdad)
  const ANCHO_RIO = { value: 1 };
  // (y donde está la maqueta de un pueblo, el río no se pinta: allí va el suyo, pintado en el suelo)
  const anchoRio = (m, hueco) => { m.onBeforeCompile = (sh) => { sh.uniforms.uAncho = ANCHO_RIO; sh.uniforms.uHueco = hueco;
    sh.vertexShader = 'attribute vec3 lado; uniform float uAncho; varying vec2 vHx;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += lado * uAncho; vHx = transformed.xz;');
    sh.fragmentShader = 'uniform vec4 uHueco; varying vec2 vHx;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n  if (uHueco.w > 0.5 && distance(vHx, uHueco.xy) < uHueco.z) discard;'); }; m.customProgramCacheKey = () => 'rio-ancho'; };
  for (const c of C) { c.rioM = rioM.clone(); anchoRio(c.rioM, c.top.uniforms.uHueco); c.lagoM = lagoM.clone(); mats.push(c.rioM, c.lagoM); for (const m of c.mesh.children) if (m.userData.lago) m.material = c.lagoM; }
  for (const [c, a] of cintas) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a.p, 3)); g.setAttribute('lado', new THREE.Float32BufferAttribute(a.lado, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(a.uv, 2)); g.setIndex(a.i); geos.push(g); const m = new THREE.Mesh(g, c.rioM); m.renderOrder = 1; c.mesh.add(m); }
  // los nombres de las sierras, de los ríos y de los embalses, como en los mapas (por debajo de los de las comarcas y los
  // pueblos: si no caben, se esconden)
  const N = [...MAPA_RELIEVE.sierras.map(x => ({ n: x.n, k: 0, xy: [x.x, x.y] })), ...MAPA_RELIEVE.rios.filter(x => x.k < 3).map(x => ({ n: x.n, k: x.k, xy: x.l })),
    ...MAPA_RELIEVE.lagos.filter(x => x.k).map(x => ({ n: x.n, k: 3, xy: x.l }))].map(({ n, k, xy }) => {
    const [X, Z] = W(...xy), lab = document.createElement('div'); lab.className = k ? 'm3-rl' : 'm3-sl'; lab.textContent = n; lab.hidden = true;
    return { lab, k, X, Z, h: GROSOR + alto(X, Z) + (k ? 0.25 : 0.6), c: deQuien(X, Z) };
  });
  // (lo que ocupa Navarra: sus esquinas, para encajarla en la pantalla)
  const caja = new THREE.Box3(); for (const c of C) { c.mesh.geometry.computeBoundingBox(); caja.union(c.mesh.geometry.boundingBox); }
  caja.max.y = GROSOR + Math.max(...C.map(c => c.hmax + c.alzado)) + 0.5;
  const esquinas = []; for (const x of [caja.min.x, caja.max.x]) for (const y of [0, caja.max.y]) for (const z of [caja.min.z, caja.max.z]) esquinas.push(new THREE.Vector3(x, y, z));
  const centro = caja.getCenter(new THREE.Vector3());

  // la niebla: nubes que flotan sobre las comarcas por descubrir y se van abriendo con cada sello (sobre las empezadas,
  // apenas un velo; sobre las completas, nada)
  const nt = nubeTex(), nubes = [];
  let semilla = 7; const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  for (const c of C) {
    if (c.done) continue;
    const bb = c.mesh.geometry.boundingBox, area = (bb.max.x - bb.min.x) * (bb.max.z - bb.min.z), n = Math.max(2, Math.min(7, Math.round(area / 55)));
    const fuerza = c.vivo ? 0.22 * (1 - c.pct) : 0.42;
    for (let k = 0, intentos = 0; k < n && intentos < 60; intentos++) {
      const x = bb.min.x + azar() * (bb.max.x - bb.min.x), z = bb.min.z + azar() * (bb.max.z - bb.min.z); if (!enPoligono(c.Pw, x, z)) continue; k++;
      const m = new THREE.SpriteMaterial({ map: nt, color: 0xd9ccff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }); mats.push(m);
      const sp = new THREE.Sprite(m), s0 = 7 + azar() * 6; sp.scale.set(s0 * 1.4, s0, 1); sp.position.set(x, GROSOR + c.hmax + 1.4 + azar() * 1.4, z); scene.add(sp);
      nubes.push({ sp, m, c, x, z, fuerza, ph: azar() * 6.28, v: 0 });
    }
  }
  // el halo: una luz violeta en el suelo, debajo de Navarra, que respira (como una mesa de holograma)
  const haloM = new THREE.MeshBasicMaterial({ map: brilloTex(), color: 0x8a3cff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }); mats.push(haloM);
  const haloG = new THREE.PlaneGeometry(1, 1); geos.push(haloG);
  const halo = new THREE.Mesh(haloG, haloM); halo.rotation.x = -Math.PI / 2; halo.position.set(centro.x, 0.03, centro.z); halo.scale.set((caja.max.x - caja.min.x) * 2.1, (caja.max.z - caja.min.z) * 2.1, 1); scene.add(halo);
  // los destellos: chispas de luz que suben despacio sobre Navarra
  const NCH = 150, chPos = new Float32Array(NCH * 3), chV = [];
  for (let i = 0; i < NCH; i++) { chPos[i * 3] = caja.min.x + Math.random() * (caja.max.x - caja.min.x); chPos[i * 3 + 1] = 1 + Math.random() * 12; chPos[i * 3 + 2] = caja.min.z + Math.random() * (caja.max.z - caja.min.z); chV.push(0.3 + Math.random() * 0.7, Math.random() * 6.28); }
  const chG = new THREE.BufferGeometry(); chG.setAttribute('position', new THREE.BufferAttribute(chPos, 3)); geos.push(chG);
  const chM = new THREE.PointsMaterial({ size: 0.55, map: brilloTex(), color: 0xf0c8ff, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }); mats.push(chM);
  const chispas = new THREE.Points(chG, chM); chispas.frustumCulled = false; scene.add(chispas);

  // los pueblos: una chincheta de luz que mira siempre a la cámara (blanca por descubrir, fucsia empezado, dorada sellado) y,
  // en el pueblo donde estás, un haz de luz que se ve desde toda Navarra
  const PMAT = {}; for (const k of ['', 'go', 'ok']) { PMAT[k] = new THREE.SpriteMaterial({ map: pinTex(k), transparent: true, depthWrite: false, toneMapped: false }); mats.push(PMAT[k]); }
  const ringG = new THREE.RingGeometry(0.75, 0.95, 32), hazG = new THREE.CylinderGeometry(0.16, 0.3, 12, 20, 1, true); geos.push(ringG, hazG);
  const ringM = new THREE.MeshBasicMaterial({ color: 0xff7ac8, transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }); mats.push(ringM);
  const hazM = new THREE.MeshBasicMaterial({ color: 0xff2bd6, alphaMap: hazTex(), transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }); mats.push(hazM);
  const T = o.towns.filter(t => byId.has(t.comarca)).map((t, i) => {
    const [X, Z] = W(t.sx, t.sy), g = new THREE.Group();
    const pin = new THREE.Sprite(PMAT[t.state] || PMAT['']); pin.center.set(0.5, 0); pin.scale.set(1.3, 1.7, 1);
    const bola = new THREE.Object3D(); bola.position.y = 1.4;   // (la cabeza de la chincheta: lo que se toca)
    g.add(pin, bola); g.position.set(X, 0, Z); g.scale.setScalar(0.01); scene.add(g);
    let ring = null, haz = null; if (t.here) { ring = new THREE.Mesh(ringG, ringM); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring); haz = new THREE.Mesh(hazG, hazM); haz.position.set(X, 6, Z); haz.scale.y = 0.01; scene.add(haz); }
    const lab = document.createElement('div'); lab.className = 'm3-tl' + (t.state ? ' ' + t.state : '') + (t.here ? ' here' : ''); lab.innerHTML = `<span>${esc(t.name)}</span>`;
    return { ...t, k: 1, g, pin, bola, ring, haz, hs: GROSOR + alto(X, Z), c: byId.get(t.comarca), lab, X, Z, ph: i * 0.7 };
  });
  const tById = new Map(T.map(t => [t.id, t]));
  const TR = T.filter(t => REAL_IDS.includes(t.id));   // (los que tienen su trazado de verdad: a esos se puede uno acercar mucho más)

  // la capa de los nombres y los controles
  const capa = document.createElement('div'); capa.className = 'm3-capa';
  for (const c of C) capa.append(c.lab); for (const t of T) capa.append(t.lab); for (const x of N) capa.append(x.lab);
  const cv = r.domElement; cv.className = 'm3-cv'; cv.tabIndex = 0; cv.setAttribute('aria-label', 'Mapa 3D de Navarra: arrastra para moverte y toca una comarca o un pueblo');
  host.prepend(cv); host.append(capa);

  // ---------- la cámara: un punto del mapa al que mira, la distancia, el giro y la inclinación ----------
  // (la vista de toda Navarra: la distancia a la que cabe entera en lo que queda libre, más inclinada en las pantallas
  // anchas, para que se vea la profundidad, y más desde arriba en el móvil de pie)
  // (al entrar a jugar, lo de encima se va y la vista es toda la pantalla)
  let entrada = null;
  const huecoAhora = () => entrada ? {} : o.hueco?.() || {};
  const libre = () => { const w = host.clientWidth || 1, h = host.clientHeight || 1, hu = huecoAhora(); return { w: Math.max(80, w - (hu.r || 0)), h: Math.max(80, h - (hu.t || 0) - (hu.b || 0)), W: w, H: h }; };
  const camPos = (s, out = new THREE.Vector3()) => out.set(s.x + Math.sin(s.yaw) * Math.cos(s.pitch) * s.d, Math.sin(s.pitch) * s.d + (s.hy || 0), s.z + Math.cos(s.yaw) * Math.cos(s.pitch) * s.d);
  // (se prueba a qué distancia caben todas las esquinas de Navarra en el hueco libre, con la misma cámara)
  // (fb: cuánto de lo de abajo cuenta: con toda Navarra, puede pasar por debajo de la fila de comarcas, que es translúcida)
  const prueba = new THREE.PerspectiveCamera(cam.fov, 1, 0.5, 2000), pq = new THREE.Vector3();
  function encaja(pts, x, z, pitch, fb) {
    const L = libre(), hu = huecoAhora();
    prueba.aspect = L.W / L.H; prueba.setViewOffset(L.W, L.H, (hu.r || 0) / 2, ((hu.b || 0) - (hu.t || 0)) / 2, L.W, L.H);
    const s = { x, z, yaw: 0, pitch, d: 0, hy: 0.8 }, m = 0.025;
    const cabe = (d) => { s.d = d; camPos(s, prueba.position); prueba.lookAt(x, s.hy, z); prueba.updateMatrixWorld(); prueba.updateProjectionMatrix();
      return pts.every(e => { pq.copy(e).project(prueba); const px = (pq.x + 1) / 2 * L.W, py = (1 - pq.y) / 2 * L.H;
        return pq.z < 1 && px > L.W * m && px < L.W - (hu.r || 0) - L.W * m && py > (hu.t || 0) + L.H * m && py < L.H - (hu.b || 0) * fb - L.H * m * fb; }); };
    let a = 8, b = 400; for (let i = 0; i < 18; i++) { const c = (a + b) / 2; if (cabe(c)) b = c; else a = c; }
    return b;
  }
  function casa() {
    const L = libre(), pitch = L.w / L.h < 1.05 ? 1.02 : L.w / L.h < 1.6 ? 0.82 : 0.7;
    return { x: centro.x, z: centro.z, d: encaja(esquinas, centro.x, centro.z, pitch, 0.35), yaw: 0, pitch };
  }
  // (una comarca: sus esquinas, con lo que sube al elegirla)
  for (const c of C) { const bb = c.mesh.geometry.boundingBox.clone(); bb.max.y = GROSOR + c.hmax + c.alzado + 1.1; c.esq = []; for (const x of [bb.min.x, bb.max.x]) for (const y of [0, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) c.esq.push(new THREE.Vector3(x, y, z)); c.mid = bb.getCenter(new THREE.Vector3()); }
  let DMAX = 150;
  const v = { x: 0, z: 4, d: 132, yaw: 0, pitch: 1.18, hy: 0.8 }, goal = casa();
  let bajoC = null;   // (la comarca que queda debajo del punto al que mira la cámara)
  let vuelo = null;   // (un vuelo animado hasta un sitio: { de, a, t0, dur })
  const volar = (a, dur = 0.9) => { vuelo = { de: { ...v }, a: { ...v, ...a }, t: 0, dur }; Object.assign(goal, vuelo.a); };
  const lim = () => { goal.x = Math.max(-42, Math.min(42, goal.x)); goal.z = Math.max(-44, Math.min(44, goal.z)); goal.d = Math.max(TR.some(t => Math.hypot(t.X - goal.x, t.Z - goal.z) < 0.6) ? 0.22 : 1.4, Math.min(DMAX, goal.d)); goal.pitch = Math.max(0.45, Math.min(1.35, goal.pitch));
    if (goal.d < 3) goal.pitch = Math.min(goal.pitch, 0.62 + 0.11 * goal.d); };   // (muy cerca, más de lado: así se ve la maqueta en pie)
  // (el comienzo: desde muy alto, la cámara baja y se inclina mientras las comarcas crecen una tras otra)
  Object.assign(v, { d: goal.d * 1.45, pitch: 1.25 }); DMAX = Math.max(150, goal.d * 1.35);
  vuelo = { de: { ...v }, a: { ...goal }, t: 0, dur: 1.8 };

  // ---------- tocar y arrastrar ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.5);
  const aNdc = (e) => { const b = cv.getBoundingClientRect(); ndc.set((e.clientX - b.left) / b.width * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); return ndc; };
  const enSuelo = (e) => { ray.setFromCamera(aNdc(e), cam); return ray.ray.intersectPlane(plano, new THREE.Vector3()); };
  // (qué hay debajo del dedo: el pueblo cuya chincheta o cuyo nombre queda más cerca en la pantalla y, si no, la comarca)
  const bw = new THREE.Vector3();
  function quien(e) {
    const b = cv.getBoundingClientRect(), k = b.width / (sz.w || 1) || 1, mx = (e.clientX - b.left) / k, my = (e.clientY - b.top) / k;
    let best = null, bd = (e.pointerType === 'mouse' ? 22 : 30);
    for (const t of T) {
      if (t.g.scale.x < 0.3) continue;
      t.bola.getWorldPosition(bw).project(cam); if (bw.z > 1) continue;
      const px = (bw.x + 1) / 2 * sz.w, py = (1 - bw.y) / 2 * sz.h, dd = Math.hypot(px - mx, py - my);
      if (dd < bd) { bd = dd; best = t; }
      if (!t.lab.hidden && t.lab._w) { const ly = t.lab._y ?? py; if (Math.abs(mx - t.lab._x) < t.lab._w / 2 && my < ly && my > ly - t.lab._h) { best = t; bd = 0; } }
    }
    if (best) return { t: best.id };
    ray.setFromCamera(aNdc(e), cam);
    const hc = ray.intersectObjects(C.map(c => c.mesh), false)[0]; if (hc) return { c: hc.object.userData.c };
    return null;
  }
  let hover = null, sel = null;
  const ptrs = new Map(); let arr = null, gesto = null;
  const usado = () => host.classList.add('m3-usado');   // (la ayuda de los controles se va en cuanto se usan)
  const onDown = (e) => {
    if (entrada) return;
    usado(); cv.focus({ preventScroll: true }); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { cv.setPointerCapture(e.pointerId); } catch (x) { }
    vuelo = null; plano.constant = -v.hy;
    if (ptrs.size === 1) arr = { x: e.clientX, y: e.clientY, p: enSuelo(e), rot: e.button === 2 || e.ctrlKey, yaw: goal.yaw, pitch: goal.pitch, movido: false };
    else { arr = null; const [a, b] = [...ptrs.values()]; gesto = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), d0: goal.d, yaw0: goal.yaw }; }
  };
  const onMove = (e) => {
    if (!ptrs.has(e.pointerId)) { if (e.pointerType === 'mouse') { const q = quien(e); const h = q?.t ? 't:' + q.t : q?.c ? 'c:' + q.c : null; if (h !== hover) { hover = h; cv.style.cursor = h ? 'pointer' : 'grab'; } } return; }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesto && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      goal.d = gesto.d0 * gesto.d / Math.max(20, d); goal.yaw = gesto.yaw0 - (ang - gesto.ang); lim(); return;
    }
    if (!arr) return;
    if (Math.hypot(e.clientX - arr.x, e.clientY - arr.y) > 6) arr.movido = true;
    if (!arr.movido) return;
    cv.style.cursor = 'grabbing';
    if (arr.rot) { const b = cv.getBoundingClientRect(); goal.yaw = arr.yaw - (e.clientX - arr.x) / b.width * 3.2; goal.pitch = arr.pitch + (e.clientY - arr.y) / b.height * 1.6; lim(); return; }
    // (arrastrar agarra el mapa: el punto que tocaste se queda bajo el dedo)
    const p = enSuelo(e); if (p && arr.p) { goal.x += arr.p.x - p.x; goal.z += arr.p.z - p.z; v.x = goal.x; v.z = goal.z; lim(); }
  };
  const onUp = (e) => {
    const era = arr; ptrs.delete(e.pointerId); if (ptrs.size < 2) gesto = null;
    if (!ptrs.size) arr = null; cv.style.cursor = hover ? 'pointer' : 'grab';
    if (e.type !== 'pointerup' || !era || era.movido || era.rot) return;
    const q = quien(e);
    if (q?.t) irPueblo(q.t);
    else if (q?.c) select(q.c);
    else select(null);
  };
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp); cv.addEventListener('pointerleave', () => { if (!ptrs.size) hover = null; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  // (la rueda del ratón acerca y aleja; en el panel táctil del portátil, deslizar con dos dedos mueve el mapa, como en
  // los mapas de verdad, y pellizcar acerca: el deslizar llega con desplazamiento a los lados o en fracciones, la rueda no)
  cv.addEventListener('wheel', (e) => {
    e.preventDefault(); if (entrada) return; usado(); vuelo = null;
    if (!e.ctrlKey && e.deltaMode === 0 && (e.deltaX !== 0 || !Number.isInteger(e.deltaY))) {
      const k = goal.d * 0.0016, fx = -Math.sin(goal.yaw), fz = -Math.cos(goal.yaw);
      goal.x += (-fz * e.deltaX - fx * e.deltaY) * k; goal.z += (fx * e.deltaX - fz * e.deltaY) * k; lim(); return;
    }
    goal.d *= Math.exp(Math.max(-80, Math.min(80, e.deltaY)) * (e.ctrlKey ? 0.01 : 0.0022)); lim();
  }, { passive: false });
  // (Safari en el iPhone: que el pellizco mueva el mapa y no amplíe la página)
  for (const ev of ['gesturestart', 'gesturechange']) cv.addEventListener(ev, (e) => e.preventDefault());

  // teclado: siempre que el mapa esté a la vista, aunque se acabe de tocar otra cosa (una comarca de la fila de abajo, el
  // panel): antes solo con el ratón encima, y al elegir una comarca abajo las flechas ya no movían nada. No mientras se
  // escribe ni con una ficha abierta encima
  const keys = new Set();
  const MOV = { w: 'f', arrowup: 'f', s: 'b', arrowdown: 'b', a: 'l', arrowleft: 'l', d: 'r', arrowright: 'r', q: 'ql', e: 'qr', '+': 'in', '=': 'in', '-': 'out' };
  const kd = (e) => { const k = MOV[e.key.toLowerCase()];
    if (!k || e.ctrlKey || e.metaKey || e.altKey || !visible || document.hidden || e.target.closest?.('input,textarea,select,[contenteditable="true"]') || document.querySelector('.sheet, .onb, [role="dialog"]:not([hidden])')) return;
    e.preventDefault(); usado(); vuelo = null; keys.add(k); };
  const ku = (e) => { const k = MOV[e.key.toLowerCase()]; if (k) keys.delete(k); };
  addEventListener('keydown', kd); addEventListener('keyup', ku); addEventListener('blur', () => keys.clear());

  // los botones de la esquina (mientras se mantienen pulsados)
  const pad = document.createElement('div'); pad.className = 'm3-pad';
  // (solo acercar, alejar y ver toda Navarra: moverse y girar ya van con el dedo, el ratón y el teclado)
  const B = [['in', 'Acercar', 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z'], ['home', 'Ver toda Navarra', 'M4 11l8-7 8 7v9h-5v-6H9v6H4z'], ['out', 'Alejar', 'M5 11h14v2H5z']];
  pad.innerHTML = B.map(([k, t, d]) => `<button type="button" class="m3-b b-${k}" data-k="${k}" aria-label="${t}" title="${t}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg></button>`).join('');
  host.append(pad);
  pad.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-k]'); if (!b) return; e.preventDefault(); usado(); vuelo = null; if (b.dataset.k === 'home') { vista(); return; } keys.add(b.dataset.k); try { b.setPointerCapture(e.pointerId); } catch (x) { } const fin = () => { keys.delete(b.dataset.k); b.removeEventListener('pointerup', fin); b.removeEventListener('pointercancel', fin); }; b.addEventListener('pointerup', fin); b.addEventListener('pointercancel', fin); });

  // (un pueblo: si su comarca no estaba elegida, primero la comarca entera; si ya lo estaba, o desde el buscador, de cerca,
  // con su núcleo y lo de alrededor)
  function irPueblo(id, directo = false) {
    const t = tById.get(id); if (!t) return;
    if (sel !== t.comarca && !directo) select(t.comarca);
    else { if (sel !== t.comarca) select(t.comarca, false);
      const R = 1.1, pts = []; for (const dx of [-R, R]) for (const dz of [-R, R]) pts.push(new THREE.Vector3(t.X + dx, 0, t.Z + dz), new THREE.Vector3(t.X + dx, 2, t.Z + dz));
      volar({ x: t.X, z: t.Z, d: Math.max(5, encaja(pts, t.X, t.Z, 0.95, 1)), yaw: 0, pitch: 0.95 }, 1.2); }
    o.onTown?.(id);
  }
  // (toda Navarra, desde arriba)
  function vista() { select(null); volar(casa(), 1.1); }
  // ---------- elegir una comarca: vuela hasta ella y se levanta ----------
  function select(id, fly = true) {
    const c = id && byId.get(id);
    sel = c ? c.id : null;
    host.classList.toggle('con-sel', !!c);
    for (const x of C) x.lab.classList.toggle('sel', x.id === sel);
    o.onSelect?.(sel);   // (antes de volar: el panel que se abre cambia el hueco donde se encaja)
    if (c && fly) volar({ x: c.mid.x, z: c.mid.z, d: Math.max(22, encaja(c.esq, c.mid.x, c.mid.z, 0.95, 1)), yaw: 0, pitch: 0.95 });
  }

  // ---------- el relieve fino ----------
  // El de las comarcas que se ven de cerca (la elegida primero y, al acercarse, las de alrededor), unas pocas a la vez: en
  // el móvil, dos y a 56 m; en el ordenador, cuatro y a 28 m. Al llegar entra poco a poco sobre el de siempre, y la que
  // hace más que no se ve se suelta. Si no llega (en el archivo único, sin conexión), se vuelve a probar a los 15 s. Se
  // piden de una en una y solo con la cámara quieta, y la imagen se descomprime aparte (createImageBitmap): al moverse
  // por el mapa no hay tirones
  const MAXD = LENTO ? 2 : 4, carga = new THREE.TextureLoader().setCrossOrigin('anonymous'), det = new Map(), aniso = Math.min(8, r.capabilities.getMaxAnisotropy());
  const textura = (u) => (typeof createImageBitmap === 'function' ? fetch(u, { credentials: 'omit' }).then(x => x.ok ? x.blob() : Promise.reject())
    .then(b => createImageBitmap(b, { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' })).then(im => new THREE.Texture(im)) : Promise.reject())
    .catch(() => new Promise((ok, mal) => carga.load(u, ok, undefined, mal)));
  const suelta = (tx) => { tx.dispose(); tx.image?.close?.(); };
  let detT = -1e9, pidiendo = 0;
  const lejosDe = (c) => Math.hypot(c.mid.x - v.x, c.mid.z - v.z);
  function detalles(now, quieto) {
    if (now - detT < 400 || !quieto) return; detT = now;
    const cerca = v.d < 80 ? C.filter(c => MAPA_RELIEVE.detalle[c.id] && lejosDe(c) < v.d * 0.6 + 14).sort((a, b) => lejosDe(a) - lejosDe(b)) : [];
    if (sel) { const i = cerca.findIndex(c => c.id === sel); if (i >= 0) cerca.splice(i, 1); if (MAPA_RELIEVE.detalle[sel]) cerca.unshift(byId.get(sel)); }
    const quiere = new Set(cerca.slice(0, MAXD).map(c => c.id));
    for (const id of quiere) {
      let e = det.get(id); if (e?.fallo && now > e.fallo) { det.delete(id); e = null; }
      if (e) { e.t = now; continue; }
      if (pidiendo) continue;
      det.set(id, e = { t: now, tex: null, fallo: 0 }); pidiendo++;
      urlDetalle(id, !LENTO).then(u => u ? textura(u) : Promise.reject()).then(tx => {
        pidiendo--; if (!vivo || det.get(id) !== e) { suelta(tx); return; }
        tx.flipY = false; tx.colorSpace = THREE.NoColorSpace; tx.anisotropy = aniso; tx.needsUpdate = true;
        e.tex = tx; byId.get(id).top.uniforms.uDet.value = tx;
      }).catch(() => { pidiendo = Math.max(0, pidiendo - 1); e.fallo = performance.now() + 15000; });
    }
    // (las que sobran, primero las que hace más que no se ven)
    const sobran = [...det].filter(([id, e]) => !quiere.has(id) && e.tex).sort((a, b) => a[1].t - b[1].t);
    let n = [...det.values()].filter(e => e.tex).length;
    for (const [id, e] of sobran) { if (n <= MAXD + 1) break; const u = byId.get(id).top.uniforms; u.uDet.value = nada; u.uDetK.value = 0; suelta(e.tex); det.delete(id); n--; }
  }

  // ---------- los núcleos de los pueblos, al acercarse ----------
  // Solo los pueblos del juego, con su trazado de verdad (src/data/reales: casas, calles, ríos y plazas de OpenStreetMap):
  // al acercarse, su núcleo pintado sobre el relieve (las calles, las plazas, el agua y los tejados con su sombra) y, más
  // cerca aún, cada casa en pie. Los de alrededor, de uno en uno y con la cámara quieta; los lejanos se sueltan
  const REALES = new Set(REAL_IDS), MU = 1 / 2076;   // (metros → unidades del mundo: una unidad son 2.076 m)
  const NUC_LEJOS = 26, NUC_CERCA = 16, CASAS_D = 10;
  const nuc = new Map(), cajaG = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0); geos.push(cajaG);
  let nucT = -1e9, nucPide = 0;
  // (el color de cada tejado: teja o pizarra en las casas, chapa gris en naves y fábricas, piedra en iglesias y torres)
  const tono = (b, pizarra) => { const v = ((b.x * 7 + b.z * 13) % 9 + 9) % 9 / 9;
    return b.k === 'industrial' || b.k === 'shed' ? [0.58, 0.06, 0.6 + v * 0.1] : b.k === 'church' || b.k === 'tower' ? [0.09, 0.18, 0.56 + v * 0.06]
      : pizarra ? [0.06, 0.08, 0.32 + v * 0.1] : [0.04 + v * 0.02, 0.5, 0.48 + v * 0.08]; };
  // (el núcleo pintado: un lienzo de un metro y medio por píxel, tres en el móvil, y el doble de fino en la maqueta; los
  // campos, huertas y parques, las calles y los ríos con su ancho de verdad, los puentes, la cancha de los frontones y
  // los tejados, de teja en casi toda Navarra y de pizarra en el Pirineo; hacia el borde se funde con el relieve)
  const USO = { cultivo: 'rgba(222, 204, 140, .55)', huerta: 'rgba(118, 168, 84, .6)', prado: 'rgba(140, 192, 98, .45)', vina: 'rgba(160, 150, 92, .55)', frutales: 'rgba(122, 165, 86, .55)',
    cesped: 'rgba(134, 192, 106, .6)', parque: 'rgba(110, 170, 92, .65)', deporte: 'rgba(104, 168, 96, .65)', juegos: 'rgba(206, 192, 160, .7)', escuela: 'rgba(214, 200, 170, .6)',
    cementerio: 'rgba(154, 165, 138, .65)', industria: 'rgba(185, 180, 172, .5)', plaza: 'rgba(230, 220, 203, .9)' };
  function pintaNucleo(D, R, pizarra, N = LENTO ? 512 : 1024, velo = true) {
    // (el de la maqueta, en el procesador y no en la tarjeta gráfica: son muchos trazos, y en ella se encolaban y paraban el mapa)
    const k = N / (2 * R), c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d', velo ? undefined : { willReadFrequently: true });
    const P = (x, z) => [(x + R) * k, (z + R) * k];
    const linea = (pts, w, color) => { if (pts.length < 2) return; g.beginPath(); pts.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.lineWidth = Math.max(1, w * k); g.strokeStyle = color; g.lineCap = g.lineJoin = 'round'; g.stroke(); };
    const area = (pts, color) => { if (pts.length < 3) return; g.beginPath(); pts.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.fillStyle = color; g.fill(); };
    const casa = (b, dx, dz, color) => { g.save(); const [a, bb] = P(b.x + dx, b.z + dz); g.translate(a, bb); g.rotate(-b.ry); g.fillStyle = color; g.fillRect(-b.w * k / 2, -b.d * k / 2, b.w * k, b.d * k); g.restore(); };
    // (un velo claro bajo lo edificado, que de lejos se lee como el núcleo)
    if (velo) { g.filter = `blur(${Math.round(N / 50)}px)`; for (const b of D.casas) casa(b, 0, 0, 'rgba(246, 236, 214, .5)'); g.filter = 'none'; }
    for (const u of D.usos || []) if (USO[u.k]) area(u.pts, USO[u.k]);
    // (en la maqueta, la textura de cada campo: surcos en los cereales, hileras en viñas y frutales, bancales en las
    // huertas, las pasadas del corte en los prados y las rayas de los campos de deporte; cada uno con su dirección)
    // (cada textura, un dibujo pequeño que se repite, girado a la dirección de cada campo: un solo relleno por campo)
    const rayas = new Map(), raya = (paso, ancho, color) => { const key = paso + ancho + color; let pt = rayas.get(key);
      if (!pt) { const t = document.createElement('canvas'), pp = Math.max(2, Math.round(paso * k)); t.width = pp; t.height = 2; const tg = t.getContext('2d'); tg.fillStyle = color; tg.fillRect(0, 0, Math.max(1, Math.round(ancho * k)), 2); rayas.set(key, pt = g.createPattern(t, 'repeat')); }
      return pt; };
    if (!velo) for (const u of D.usos || []) {
      const s0 = Math.abs(Math.sin(u.pts[0][0] * 12.9898 + u.pts[0][1] * 78.233)) % 1, ang = s0 * 180;
      const hileras = (paso, ancho, color) => { const pt = raya(paso, ancho, color); pt.setTransform(new DOMMatrix().rotateSelf(ang)); area(u.pts, pt); };
      if (u.k === 'cultivo') { area(u.pts, ['rgba(222, 196, 112, .45)', 'rgba(150, 176, 92, .4)', 'rgba(168, 128, 86, .4)'][Math.floor(s0 * 2.99)]); hileras(2.4, 0.7, 'rgba(90, 70, 40, .18)'); }
      else if (u.k === 'vina') hileras(2.6, 1, 'rgba(70, 92, 40, .5)');
      else if (u.k === 'huerta') { hileras(3.6, 1.6, 'rgba(56, 120, 48, .35)'); hileras(3.6, 0.5, 'rgba(120, 90, 60, .3)'); }
      else if (u.k === 'frutales') hileras(7, 2.2, 'rgba(80, 112, 52, .25)');
      else if (u.k === 'prado') hileras(6, 3, 'rgba(255, 255, 255, .06)');
      else if (u.k === 'deporte') { g.beginPath(); u.pts.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.lineWidth = Math.max(1, 0.8 * k); g.strokeStyle = 'rgba(255, 255, 255, .7)'; g.stroke(); }
    }
    for (const p of D.lugares.plazas || []) area(p.pts, 'rgba(236, 226, 206, .9)');
    // (los anchos de los datos son la mitad: de la orilla al centro)
    for (const r of D.rios) linea(r.pts, Math.max(4, 2 * (r.w || 2)), '#5ab8f0');
    for (const b of D.balsas || []) area(b.pts, '#5ab8f0');
    for (const b of D.piscinas || []) area(b.pts, '#7fd6f6');
    for (const s of D.calles) linea(s.pts, 2 * (s.w || 2) + 1.5, s.t === 'trail' ? 'rgba(150, 128, 96, .35)' : 'rgba(120, 104, 90, .55)');
    for (const s of D.calles) linea(s.pts, 2 * (s.w || 2), s.t === 'trail' ? 'rgba(214, 198, 166, .85)' : '#e7dfd0');
    for (const s of D.puentes || []) { linea(s.pts, 2 * (s.w || 2) + 2, 'rgba(90, 76, 62, .6)'); linea(s.pts, 2 * (s.w || 2), '#d6c8ae'); }
    for (const b of D.casas) casa(b, 3, 4, 'rgba(40, 24, 18, .35)');   // (la sombra, hacia el sureste)
    for (const b of D.casas) { const [h, sa, l] = b.k === 'fronton' ? [0.38, 0.3, 0.5] : tono(b, pizarra); casa(b, 0, 0, `hsl(${h * 360}, ${sa * 100}%, ${l * 92}%)`); }
    g.globalCompositeOperation = 'destination-in';
    const fin = g.createRadialGradient(N / 2, N / 2, N * 0.4, N / 2, N / 2, N / 2); fin.addColorStop(0, '#000'); fin.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = fin; g.fillRect(0, 0, N, N); g.globalCompositeOperation = 'source-over';
    const t = new THREE.CanvasTexture(c); t.anisotropy = aniso; t.flipY = false; t.colorSpace = THREE.NoColorSpace; return t;
  }
  // (el núcleo de un pueblo: su lienzo va pintado en el propio relieve de su comarca, en uno de sus cuatro huecos, y así
  // queda pegado al terreno; las casas en pie, una caja por casa con su altura algo exagerada, como el relieve)
  function haceNucleo(t, D) {
    const [cx, cy] = mapaXY(D.lat, D.lon), [X0, Z0] = W(cx, cy); let R = 120;
    for (const b of D.casas) R = Math.max(R, Math.hypot(b.x, b.z) + Math.max(b.w, b.d) / 2);
    for (const s of D.calles) for (const [x, z] of s.pts) R = Math.max(R, Math.hypot(x, z));
    R = Math.min(700, R + 20);
    const pizarra = t.comarca === 'pirineo', tex = pintaNucleo(D, R, pizarra), Rs = R / 207.6;
    const cm2 = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    const casas = new THREE.InstancedMesh(cajaG, cm2, D.casas.length), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
    D.casas.forEach((b, i) => { const x = X0 + b.x * MU, z = Z0 + b.z * MU;
      M4.compose(e3.set(x, GROSOR + sobre(t.c, x, z) - 0.004, z), q.setFromAxisAngle(up, b.ry), sc.set(b.w * MU, (b.h || 7) * MU * 2.5, b.d * MU)); casas.setMatrixAt(i, M4);
      casas.setColorAt(i, col.setHSL(...tono(b, pizarra))); });
    casas.visible = false; t.c.mesh.add(casas);
    return { tex, rect: [cx - Rs, cy - Rs, 2 * Rs, 2 * Rs], casas, c: t.c, X: t.X, Z: t.Z, slot: -1, op: 0, op2: 0, t, D, X0, Z0, R, pizarra };
  }
  // (un hueco libre en el relieve de su comarca; si no lo hay, se deja el del pueblo más lejos de la vista)
  function ponNucleo(e) {
    const c = e.c; c.pue ||= [null, null, null, null];
    let i = c.pue.indexOf(null);
    if (i < 0) { const lejos = (x) => Math.hypot(x.X - v.x, x.Z - v.z); i = c.pue.reduce((m, x, k) => lejos(x) > lejos(c.pue[m]) ? k : m, 0); if (lejos(c.pue[i]) <= lejos(e)) return false; quitaNucleo(c.pue[i]); }
    const u = c.top.uniforms; c.pue[i] = e; e.slot = i; u['uP' + i].value = e.tex; u.uPR.value[i].set(...e.rect); u.uPK.value[i] = 0;
    return true;
  }
  function nucleos(now, quieto) {
    if (now - nucT < 500 || !quieto && !entrada) return; nucT = now;
    // (al entrar a jugar, solo el del pueblo: lo demás, después)
    const quiere = entrada ? (entrada.real ? [entrada.t] : []) : v.d > NUC_LEJOS + 4 ? [] : T.filter(t => REALES.has(t.id) && (!sel || sel === t.comarca) && Math.hypot(t.X - v.x, t.Z - v.z) < v.d * 0.55 + 2)
      .sort((a, b) => Math.hypot(a.X - v.x, a.Z - v.z) - Math.hypot(b.X - v.x, b.Z - v.z)).slice(0, 6);
    for (const t of quiere) {
      const e = nuc.get(t.id); if (e) { e.t = now; continue; } if (nucPide) continue;
      const nuevo = { t: now }; nuc.set(t.id, nuevo); nucPide++;
      loadReal(t.id).then(D => { nucPide--; if (!vivo || nuc.get(t.id) !== nuevo || !D?.casas) return;
        Object.assign(nuevo, haceNucleo(t, D)); if (!ponNucleo(nuevo)) { quitaNucleo(nuevo); nuc.delete(t.id); } }).catch(() => { nucPide = Math.max(0, nucPide - 1); });
    }
    // (si hay más de ocho, se sueltan los que hace más que no se ven)
    const viejos = [...nuc].filter(([id]) => !quiere.some(t => t.id === id)).sort((a, b) => a[1].t - b[1].t);
    while (nuc.size > 8 && viejos.length) { const [id, e] = viejos.shift(); quitaNucleo(e); nuc.delete(id); }
  }
  function quitaNucleo(e) {
    if (maq?.e === e) quitaMaqueta();
    if (e.slot >= 0) { const u = e.c.top.uniforms; u['uP' + e.slot].value = nada; u.uPK.value[e.slot] = 0; e.c.pue[e.slot] = null; e.slot = -1; }
    e.tex?.dispose(); e.tex = null;
    if (e.casas) { e.casas.removeFromParent(); e.casas.material.dispose(); e.casas.dispose(); e.casas = null; }
    for (const [id, x] of nuc) if (x === e) nuc.delete(id);
  }

  // ---------- la maqueta: muy cerca de un pueblo, su relieve de verdad, sus casas en pie con tejado y sus árboles ----------
  // (una a la vez, la del pueblo del centro de la vista; se hace por pasos con la cámara quieta; entra subiendo el relieve
  // del pueblo y luego las casas, y se va al revés al alejarse: src/hub/maqueta.js)
  const MAQ_D = 3.2, MAQ_K = 1.6;   // (la distancia a la que se levanta, y lo que se exageran en alto casas y árboles: como el relieve de cerca)
  let maq = null, calentado = false;
  // (los dos programas de la maqueta, compilados de antemano al acercarse, para que al levantarla no se pare el mapa)
  function calienta() {
    calentado = true;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 0, 1], 3)); g.setAttribute('hd', new THREE.Float32BufferAttribute([0, 0, 0], 1)); g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(9).fill(1), 3));
    const pm = new THREE.ShaderMaterial({ vertexShader: PARCHE_VS, fragmentShader: RELIEVE_FS, vertexColors: true, fog: true, uniforms: { ...C[0].top.uniforms, uHueco: { value: new THREE.Vector4() }, uMaqK: { value: 0 } } });
    const res = {}, pasos = haceMaqueta({ id: 'x', alt0: 0, dem: { step: 20, n: 2, h: [0, 0, 0, 0] }, casas: [], calles: [], rios: [] }, { X0: 0, Z0: 0, MU, EXA, GROSOR, R: 10, sobre: () => 0, P: [[-1, -1], [1, -1], [1, 1], [-1, 1]], lento: true, K: 1, alzado: { value: 1 } }, res);
    while (!pasos.next().done);
    const caja = new THREE.BoxGeometry(); caja.setAttribute('aOff', new THREE.InstancedBufferAttribute(new Float32Array(1), 1));
    const im = new THREE.InstancedMesh(caja, res.mat, 1); im.setColorAt(0, new THREE.Color());
    const grupo = new THREE.Group(); grupo.add(new THREE.Mesh(g, pm), im);
    geos.push(g, caja, res.geo); mats.push(pm, res.mat);
    r.compileAsync(grupo, cam, scene).catch(() => { });
  }
  function maqueta(dt, quieto) {
    if (!calentado && v.d < 8) calienta();
    const quiere = entrada ? (maq?.e.t === entrada.t ? maq.e : null) : v.d < MAQ_D ? [...nuc.values()].filter(e => e.D && e.slot >= 0 && Math.hypot(e.X0 - v.x, e.Z0 - v.z) < e.R * MU * 0.8)
      .sort((a, b) => Math.hypot(a.X0 - v.x, a.Z0 - v.z) - Math.hypot(b.X0 - v.x, b.Z0 - v.z))[0] : null;
    if (!maq) {
      if (quiere && quieto) maq = { e: quiere, k: { value: 0 }, alz: { value: 1 }, op: 0, res: {}, pasos: null, tex: null, malla: null };
      return;
    }
    const m = maq, e = m.e, c = e.c, sigue = quiere === e;
    if (!m.malla) {   // (aún haciéndose: un paso por imagen, con la cámara quieta; si ya no se quiere, se deja)
      if (!sigue) { quitaMaqueta(); return; }
      if (!quieto) return;
      if (!m.tex) { m.tex = pintaNucleo(e.D, e.R, e.pizarra, LENTO ? 1024 : 2048, false); return; }
      if (!m.pasos) m.pasos = haceMaqueta(e.D, { X0: e.X0, Z0: e.Z0, MU, EXA, GROSOR, R: e.R, sobre: (X, Z) => sobre(c, X, Z), P: c.Pw, comarca: c.id, lento: LENTO, K: MAQ_K, alzado: m.alz }, m.res);
      if (!m.hecha) { m.hecha = m.pasos.next().done; return; }
      // (la sombra de cada árbol en el suelo pintado, hacia el sureste; y la imagen, a la tarjeta gráfica en su propia imagen)
      if (!m.subida) { m.subida = true; const g = m.tex.image.getContext('2d', { willReadFrequently: true }), N = m.tex.image.width, k = N / (2 * e.R); g.fillStyle = 'rgba(28, 40, 18, .3)'; g.beginPath();
        for (const [x, z, rr] of m.res.sombras) { const a = (x + e.R + rr * 0.9) * k, b = (z + e.R + rr * 1.2) * k; g.moveTo(a + rr * 1.1 * k, b); g.ellipse(a, b, rr * 1.1 * k, rr * 0.8 * k, 0.5, 0, 6.2832); }
        g.fill(); m.tex.needsUpdate = true; r.initTexture(m.tex); return; }
      const u = c.top.uniforms, pm = new THREE.ShaderMaterial({ vertexShader: PARCHE_VS, fragmentShader: RELIEVE_FS, vertexColors: true, fog: true, uniforms: { ...u, uHueco: { value: new THREE.Vector4(0, 0, 0, 0) }, uMaqK: m.k } });
      m.malla = new THREE.Mesh(m.res.geo, pm); c.mesh.add(m.malla); c.mesh.add(m.res.casas);
      u.uHueco.value.set(e.X0, e.Z0, e.R * MU * 0.97, 1); if (e.slot >= 0) u['uP' + e.slot].value = m.tex;
      m.labs = m.res.monumentos.map(x => { const lab = document.createElement('div'); lab.className = 'm3-ml'; lab.textContent = x.n; lab.hidden = true; capa.append(lab); return { ...x, lab }; });
      return;
    }
    // (el relieve del pueblo sube; luego, las casas)
    m.k.value += ((sigue ? 1 : 0) - m.k.value) * (1 - Math.exp(-dt * 3));
    m.op += ((sigue && m.k.value > 0.85 ? 1 : 0) - m.op) * (1 - Math.exp(-dt * 4));
    m.res.mat.opacity = m.op; m.res.casas.visible = m.op > 0.01; m.alz.value = 1 / Math.max(0.05, c.sy);
    if (!sigue && m.k.value < 0.01 && m.op < 0.01) quitaMaqueta();
  }
  function quitaMaqueta() {
    const m = maq; if (!m) return; maq = null;
    const e = m.e, u = e.c.top.uniforms;
    if (m.malla) { m.malla.removeFromParent(); m.malla.material.dispose(); u.uHueco.value.set(0, 0, 0, 0); if (e.slot >= 0 && e.tex) u['uP' + e.slot].value = e.tex; }
    m.res.geo?.dispose();
    if (m.res.casas) { m.res.casas.removeFromParent(); for (const x of m.res.casas.children) x.geometry.dispose(); m.res.mat.dispose(); }
    m.tex?.dispose(); for (const x of m.labs || []) x.lab.remove();
  }
  // (la altura del suelo en un punto de una comarca, con la de la maqueta donde la hay)
  const pisoEn = (c, X, Z) => { const h = GROSOR + alto(X, Z); if (!maq?.malla || maq.e.c !== c || Math.hypot(X - maq.e.X0, Z - maq.e.Z0) > maq.e.R * MU) return h; return h + (maq.res.alto(X, Z) - h) * maq.k.value; };

  // ---------- entrar a jugar: un zoom rápido. Lo de encima se va, la cámara se lanza hasta el pueblo girando un poco y la
  // pantalla se funde; entonces empieza la partida (devuelve una promesa; null si no hay vuelo: sin movimiento) ----------
  function entrar(id) {
    const t = tById.get(id);
    if (!t || !vivo || !host.isConnected || !cv.offsetParent || matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
    return new Promise((fin) => {
      if (sel !== t.comarca) select(t.comarca, false);
      host.classList.add('m3-entra'); keys.clear(); ptrs.clear(); arr = null; gesto = null; hover = null;
      entrada = { t, fin, t0: performance.now(), fase: 0, real: TR.includes(t) };
      const lejos = Math.hypot(v.x - t.X, v.z - t.Z) > 1 || v.d > 10; entrada.fase = lejos ? 0 : 1;
      if (lejos) volar({ x: t.X, z: t.Z, d: Math.min(Math.max(v.d, 3), 8), yaw: v.yaw, pitch: Math.min(v.pitch, 0.85) }, 0.6); else vuelo = null;
    });
  }
  function sigueEntrada(now) {
    const en = entrada; if (!en) return;
    if (en.fase === 1 && !en.va) { en.va = true; volar({ x: en.t.X, z: en.t.Z, d: en.real ? 0.2 : 1.2, yaw: v.yaw + 0.3, pitch: 0.55 }, 1.0); }
    else if (en.fase === 0 && !vuelo) en.fase = 1;
    else if (en.fase === 1 && (!vuelo || vuelo.t > 0.7)) { en.fase = 2; en.t2 = now; host.classList.add('m3-negro'); }
    else if ((en.fase === 2 && now - en.t2 > 320) || now - en.t0 > 4000) {
      entrada = null; en.fin(); setTimeout(() => host.classList.remove('m3-entra', 'm3-negro'), 4000);
    }
  }

  if (import.meta.env.DEV) window.__mapa3d = { det, nuc, v, goal, maqueta: () => maq };   // (para las pruebas en el servidor de desarrollo)

  // ---------- el bucle: solo mientras se ve ----------
  let vivo = true, visible = true, t0 = performance.now(), last = t0, raf = 0;
  const io = new IntersectionObserver((en) => { visible = en[0]?.isIntersecting ?? true; if (visible && !raf) raf = requestAnimationFrame(frame); }, { threshold: 0.02 }); io.observe(host);
  const sz = { w: 0, h: 0, z: 0 }, off = { x: 0, y: 0 };
  const pv = new THREE.Vector3();
  function frame(now) {
    raf = 0;
    if (!vivo) return;
    if (!host.isConnected || !rendererVivo(r)) { dispose(); return; }
    if (!visible || document.hidden) return;
    raf = requestAnimationFrame(frame);
    // (en el móvil, y en el ordenador mientras nada se mueve, 30 imágenes por segundo: las chinchetas que flotan no
    // necesitan más, y así el resto del menú va más suelto)
    const quieto = !keys.size && !vuelo && !ptrs.size && Math.abs(goal.d - v.d) < 0.05 * v.d && Math.abs(goal.x - v.x) + Math.abs(goal.z - v.z) < 0.05;
    if ((LENTO || quieto) && now - last < 30) return;
    // (el tiempo de cada imagen, nunca hacia atrás: la marca del navegador puede ser anterior a la de al crear el mapa, y un
    // paso negativo hacía que la cámara se disparara)
    // (al entrar a jugar, al ritmo del reloj aunque vaya a tirones)
    const dt = Math.max(0, Math.min(entrada ? 0.1 : 0.05, (now - last) / 1000)); last = Math.max(last, now); const t = Math.max(0, now - t0) / 1000;
    // tamaño del lienzo
    const w = host.clientWidth, h = host.clientHeight, z = escala();
    if (w !== sz.w || h !== sz.h || z !== sz.z) { const antes = sz.w; Object.assign(sz, { w, h, z }); if (antes && !sel && !host.classList.contains('m3-usado')) Object.assign(goal, casa()); r.setPixelRatio(Math.min(2, (devicePixelRatio || 1) * z)); r.setSize(w, h, false); cv.style.width = w + 'px'; cv.style.height = h + 'px'; cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); }
    // movimiento con las teclas y los botones
    if (keys.size && !entrada) {
      const sp = goal.d * 0.9 * dt, fx = -Math.sin(goal.yaw), fz = -Math.cos(goal.yaw);
      if (keys.has('f')) { goal.x += fx * sp; goal.z += fz * sp; } if (keys.has('b')) { goal.x -= fx * sp; goal.z -= fz * sp; }
      if (keys.has('l')) { goal.x += fz * sp; goal.z -= fx * sp; } if (keys.has('r')) { goal.x -= fz * sp; goal.z += fx * sp; }
      if (keys.has('ql')) goal.yaw += dt * 1.4; if (keys.has('qr')) goal.yaw -= dt * 1.4;
      if (keys.has('in')) goal.d *= Math.exp(-dt * 1.6); if (keys.has('out')) goal.d *= Math.exp(dt * 1.6);
      lim();
    }
    if (vuelo) {
      vuelo.t += dt / vuelo.dur; const k = ease(Math.min(1, vuelo.t));
      for (const q of ['x', 'z', 'd', 'yaw', 'pitch']) v[q] = mezcla(vuelo.de[q], vuelo.a[q], k);
      if (vuelo.t >= 1) vuelo = null;
    } else { const k = 1 - Math.exp(-dt * 9); for (const q of ['x', 'z', 'd', 'yaw', 'pitch']) v[q] += (goal[q] - v[q]) * k; }
    // (con el panel abierto, el centro de la vista se corre a lo que queda libre, poco a poco)
    const hu = huecoAhora(), kk = 1 - Math.exp(-dt * 8);
    off.x += ((hu.r || 0) / 2 - off.x) * kk; off.y += (((hu.b || 0) - (hu.t || 0)) / 2 - off.y) * kk;
    if (Math.abs(off.x) > 0.5 || Math.abs(off.y) > 0.5) cam.setViewOffset(w, h, off.x, off.y, w, h); else if (cam.view?.enabled) cam.clearViewOffset();
    // (de cerca, la cámara mira a la altura del suelo que tiene debajo: con una altura fija, el pueblo quedaba por encima del
    // centro, bajo la cabecera; de lejos, a la de siempre, con la que se calcula la vista de toda Navarra)
    const bajo = deQuien(v.x, v.z, bajoC); if (bajo) bajoC = bajo;
    const kh = Math.min(1, Math.max(0, (40 - v.d) / 24)), hs = bajo?.sy ? pisoEn(bajo, v.x, v.z) * bajo.sy + bajo.py : 0.8;
    v.hy += (0.8 + (hs - 0.8) * kh - v.hy) * (1 - Math.exp(-dt * 4));
    camPos(v, cam.position); cam.lookAt(v.x, v.hy, v.z);
    scene.fog.near = Math.max(4, v.d * 0.95); scene.fog.far = Math.max(10, v.d * 2.2); cam.near = Math.min(0.5, v.d * 0.2); cam.far = v.d * 2.6 + 60; cam.updateProjectionMatrix();
    // las comarcas: crecen al empezar (una tras otra), se levantan al pasar por encima o al elegirlas; y su relieve fino
    detalles(now, quieto);
    // (la altura, exagerada cinco veces de lejos para que se lean las sierras, y menos al acercarse, donde con tanta
    // exageración los montes parecían agujas; y de muy cerca, el grano fino del terreno)
    // (y aún menos en la maqueta de un pueblo, donde ya casi es la de verdad)
    const exa = v.d >= 4 ? 0.45 + 0.55 * Math.min(1, Math.max(0, (v.d - 8) / 32)) : 0.3 + 0.15 * Math.min(1, Math.max(0, (v.d - 1.5) / 2.5));
    CERCA.value = Math.min(1, Math.max(0, (14 - v.d) / 8)); ANCHO_RIO.value = Math.min(1, Math.max(0.12, v.d / 40));
    for (const c of C) {
      const nace = ease(Math.max(0, Math.min(1, (t - c.d) / 0.7)));
      const quiere = (hover === 'c:' + c.id ? 0.45 : 0) + (sel === c.id ? 0.9 : 0);
      c.lift += (quiere - c.lift) * (1 - Math.exp(-dt * 10));
      // (con otra elegida, pasa al fondo: más baja, oscura y casi gris, y su agua y su borde casi no se ven)
      c.fondo += ((sel && sel !== c.id ? 1 : 0) - c.fondo) * (1 - Math.exp(-dt * 6));
      // (crece del suelo al empezar; se levanta con sus sellos, al pasar por encima y al elegirla)
      c.sy = Math.max(0.01, nace) * exa; c.py = (c.alzado + c.lift - 0.35 * c.fondo) * nace;
      c.mesh.scale.y = c.sy; c.mesh.position.y = c.py; c.linea.scale.y = c.sy; c.linea.position.y = c.py;
      const u = c.top.uniforms; u.uGris.value = c.gris + (0.7 - c.gris) * c.fondo;
      u.uBrillo.value = ((c.vivo ? 1 : 0.9) + c.lift * 0.16 + (c.done ? Math.sin(t * 2 + c.d * 9) * 0.03 : 0)) * (1 - 0.55 * c.fondo);
      c.rioM.opacity = 1 - 0.8 * c.fondo; c.lagoM.opacity = 0.92 * (1 - 0.7 * c.fondo); c.linea.material.opacity = c.lineaOp * (1 - 0.8 * c.fondo);
      const dk = c.top.uniforms.uDetK; dk.value += ((det.get(c.id)?.tex ? 1 : 0) - dk.value) * (1 - Math.exp(-dt * 4));
    }
    // (las chinchetas, algo más grandes de lejos para que se vean desde toda Navarra y pequeñas de cerca, para que no tapen el
    // pueblo; flotan un poco)
    const lejos = v.d < 1.4 ? 0.035 * (v.d / 1.4) ** 1.5 : Math.max(0.035, Math.min(1.7, v.d / 45));
    for (const x of T) {
      const nace = ease(Math.max(0, Math.min(1, (t - 0.9 - x.c.d * 0.6) / 0.5)));
      // (con una comarca elegida, solo quedan las suyas: las demás se encogen hasta desaparecer)
      x.k += ((sel && sel !== x.comarca ? 0 : 1) - x.k) * (1 - Math.exp(-dt * 8));
      const big = hover === 't:' + x.id ? 1.35 : 1;
      x.g.position.y = (maq?.malla && maq.e.t === x ? pisoEn(x.c, x.X, x.Z) : x.hs) * x.c.sy + x.c.py + 0.04 * Math.min(1, v.d / 4); x.g.scale.setScalar(Math.max(0.01, nace * big * lejos * x.k));
      const bob = Math.sin(t * 2.2 + x.ph) * 0.12; x.pin.position.y = bob; x.bola.position.y = 1.4 + bob;
      if (x.ring) { const p = (t * 0.8) % 1; x.ring.scale.setScalar(1 + p * 1.8); ringM.opacity = 0.9 * (1 - p); }
      if (x.haz) { const kh = Math.min(1, lejos); x.haz.scale.set(kh, Math.max(0.01, nace * kh), kh); x.haz.position.y = x.g.position.y + 6 * nace * kh; hazM.opacity = (0.4 + Math.sin(t * 2.4) * 0.12) * nace * x.k; }
    }
    // los núcleos: el pintado entra al acercarse y las casas en pie, ya muy cerca
    nucleos(now, quieto); maqueta(dt, quieto); sigueEntrada(now);
    const kN = Math.min(1, Math.max(0, (NUC_LEJOS - v.d) / (NUC_LEJOS - NUC_CERCA))), kC = v.d < CASAS_D ? 1 : 0;
    for (const e of nuc.values()) {
      if (!(e.slot >= 0)) continue; const f = 1 - 0.85 * e.c.fondo;   // (en una comarca al fondo, casi no se ve)
      e.op += (kN * f - e.op) * (1 - Math.exp(-dt * 5)); e.c.top.uniforms.uPK.value[e.slot] = e.op;
      e.op2 += ((maq?.e === e && maq.malla ? 0 : kC) * f - e.op2) * (1 - Math.exp(-dt * 5)); e.casas.material.opacity = e.op2; e.casas.visible = e.op2 > 0.01;
    }
    // la niebla: aparece tras las comarcas, se mece despacio y se abre sobre la comarca elegida y al acercarse
    const cercaN = v.d < 40 ? 0.4 : v.d < 60 ? 0.7 : 1;
    for (const n of nubes) {
      const quiere = n.fuerza * Math.min(1, Math.max(0, (t - 1.2) / 1.2)) * (sel === n.c.id ? 0.15 : 1) * cercaN;
      n.v += (quiere - n.v) * (1 - Math.exp(-dt * 3)); n.m.opacity = n.v;
      n.sp.position.x = n.x + Math.sin(t * 0.13 + n.ph) * 1.4; n.sp.position.z = n.z + Math.cos(t * 0.09 + n.ph) * 0.8;
    }
    // las chispas: suben despacio, se mecen y vuelven a empezar abajo
    for (let i = 0; i < NCH; i++) { let y = chPos[i * 3 + 1] + chV[i * 2] * dt * 0.8; if (y > 13) y = 1; chPos[i * 3 + 1] = y; chPos[i * 3] += Math.sin(t * 0.7 + chV[i * 2 + 1]) * dt * 0.25; }
    chG.attributes.position.needsUpdate = true; chM.opacity = 0.85 * Math.min(1, t / 2);
    haloM.opacity = (0.5 + Math.sin(t * 0.9) * 0.08) * Math.min(1, t / 1.5);
    r.setClearColor(0x0d0420, 1);
    r.render(scene, cam);
    // los nombres encima, sin pisarse nunca ni quedar debajo de lo de encima: primero el pueblo donde estás y el que señalas;
    // de cerca, los pueblos antes que las comarcas; de lejos, al revés. El que no cabe, se esconde. Con una comarca
    // elegida, solo los suyos; sin elegir, de lejos solo las comarcas (y el pueblo donde estás), y al acercarse, lo demás
    if (now - tapas.t > 400) medirTapas(now);
    const cerca = v.d < 46, ocupado = tapas.r.slice(), lista = [];
    for (const x of T) { const on = sel ? sel === x.comarca || hover === 't:' + x.id : cerca || x.here || hover === 't:' + x.id;
      lista.push([x.here || hover === 't:' + x.id ? 0 : cerca || sel === x.comarca ? 1 : 3, x.lab, x.X, x.g.position.y + 2.1 * x.g.scale.y, x.Z, on]); }
    for (const c of C) lista.push([sel === c.id && cerca ? 4 : 2, c.lab, c.X, c.hc * c.sy + c.py + 1.4, c.Z, !sel || sel === c.id]);
    for (const x of N) lista.push([x.k ? 5 + x.k : 5, x.lab, x.X, x.c ? x.h * x.c.sy + x.c.py : x.h, x.Z, sel ? x.c?.id === sel : v.d < 55]);
    if (maq?.labs) { const c = maq.e.c, on = v.d < 1.3 && maq.op > 0.6; for (const x of maq.labs) lista.push([9, x.lab, x.X, pisoEn(c, x.X, x.Z) * c.sy + c.py + 30 * MU, x.Z, on]); }
    lista.sort((a, b) => a[0] - b[0]);
    for (const [, el, x, y, z, on] of lista) etiqueta(el, x, y, z, on, ocupado);
  }
  // (lo de encima, medido de vez en cuando, en píxeles del mapa)
  const tapas = { t: -1e9, r: [] };
  function medirTapas(now) {
    tapas.t = now; tapas.r = []; if (!o.tapa) return;
    const b = host.getBoundingClientRect(), k = escala() || 1;
    for (const e of host.querySelectorAll(o.tapa)) { if (e.hidden || !e.offsetParent) continue; const r = e.getBoundingClientRect(); if (!r.width) continue;
      tapas.r.push([(r.left - b.left) / k, (r.top - b.top) / k, (r.right - b.left) / k, (r.bottom - b.top) / k]); }
  }
  function etiqueta(el, x, y, z, on, ocupado) {
    pv.set(x, y, z).project(cam);
    let ok = on && pv.z < 1 && Math.abs(pv.x) < 1.1 && Math.abs(pv.y) < 1.1;
    const px = (pv.x + 1) / 2 * sz.w, py = (1 - pv.y) / 2 * sz.h;
    if (ok) {
      if (!el._w) { if (el.hidden) el.hidden = false; el._w = el.offsetWidth; el._h = el.offsetHeight; }
      const R = [px - el._w / 2 - 3, py - el._h - 3, px + el._w / 2 + 3, py + 1];
      if (R[0] < 0 || R[2] > sz.w || R[1] < 0 || R[3] > sz.h || ocupado.some(q => R[0] < q[2] && q[0] < R[2] && R[1] < q[3] && q[1] < R[3])) ok = false;
      else ocupado.push(R);
    }
    if (!ok) { if (!el.hidden) el.hidden = true; return; }
    if (el.hidden) el.hidden = false;
    el._x = px; el._y = py; el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -100%)`;
  }
  // (los tamaños de los nombres, otra vez cuando llega la letra)
  document.fonts?.ready.then(() => { for (const e of capa.children) e._w = 0; });
  raf = requestAnimationFrame(frame);

  function dispose() {
    if (!vivo) return; vivo = false; cancelAnimationFrame(raf); io.disconnect();
    removeEventListener('keydown', kd); removeEventListener('keyup', ku);
    for (const g of geos) g.dispose(); for (const m of mats) { m.map?.dispose(); m.alphaMap?.dispose(); m.dispose(); } sombra.dispose(); nada.dispose(); for (const e of det.values()) if (e.tex) suelta(e.tex); quitaMaqueta(); for (const e of [...nuc.values()]) quitaNucleo(e);
    cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onUp);
    if (cv.parentNode === host) cv.remove(); capa.remove(); pad.remove();
  }
  return { select, vista, dispose, volar: (id) => irPueblo(id, true), entrar };
}
