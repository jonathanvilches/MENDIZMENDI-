// Minifiguras de bloques de construcción: jugador, vecinos y personajes de la tradición navarra.
// Cada figura usa un atlas propio (estampados de torso, piernas y texturas de pelo, lana, paja,
// madera, metal) y una textura de cara con tres expresiones (abierta, parpadeo, hablando).
// Las piezas de cada articulación se fusionan en una sola malla: ~9 llamadas de dibujo por figura.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// ---------- Medidas (unidades de pieza; la figura mide 1,68 y se escala a ~1,62 m) ----------
const D = {
  legTop: 0.56, legW: 0.3, legD: 0.3, footH: 0.12, footD: 0.4,
  hipH: 0.12, hipW: 0.64,
  torsoH: 0.52, torsoWb: 0.66, torsoWt: 0.5, torsoDb: 0.32, torsoDt: 0.28,
  neckH: 0.04, headH: 0.4, headR: 0.2, studH: 0.06,
};
const S = 1.62 / 1.68;

// ---------- Utilidades ----------
const rand = (s) => { let x = s | 0 || 1; return () => ((x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); };
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function shade(hex, k) { const c = new THREE.Color(hex); if (k > 0) c.lerp(new THREE.Color('#ffffff'), k); else c.lerp(new THREE.Color('#000000'), -k); return '#' + c.getHexString(); }
function mix(a, b, t) { return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString(); }

// Zonas del atlas (coordenadas normalizadas del lienzo, origen arriba-izquierda)
const R = {
  front: [0, 0, 0.5, 0.5], back: [0.5, 0, 0.5, 0.5],
  legL: [0, 0.5, 0.25, 0.25], legR: [0.25, 0.5, 0.25, 0.25],
  hair: [0.5, 0.5, 0.25, 0.25], fur: [0.75, 0.5, 0.25, 0.25],
  white: [0, 0.75, 0.25, 0.25], knit: [0.25, 0.75, 0.125, 0.125], straw: [0.375, 0.75, 0.125, 0.125],
  wood: [0.25, 0.875, 0.125, 0.125], metal: [0.375, 0.875, 0.125, 0.125],
  leather: [0.5, 0.75, 0.125, 0.125], sole: [0.625, 0.75, 0.125, 0.125], cloth: [0.5, 0.875, 0.25, 0.125],
  sleeveL: [0.75, 0.75, 0.125, 0.25], sleeveR: [0.875, 0.75, 0.125, 0.25],
};
const uvOf = (r) => [r[0], 1 - r[1] - r[3], r[0] + r[2], 1 - r[1]]; // [u0,v0,u1,v1]

// Recoloca las UV 0..1 de una geometría dentro de una zona del atlas (margen para evitar sangrado)
function toRect(g, rect, pad = 0.004) {
  const [u0, v0, u1, v1] = uvOf(rect);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + pad + (u1 - u0 - 2 * pad) * uv.getX(i), v0 + pad + (v1 - v0 - 2 * pad) * uv.getY(i));
  return g;
}
// Asigna por cara (según la normal dominante) una zona del atlas y un color
function perFace(g, fn) {
  const n = g.attributes.normal, uv = g.attributes.uv, pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    const face = az >= ax && az >= ay ? (nz > 0 ? 'front' : 'back') : ay >= ax ? (ny > 0 ? 'top' : 'bottom') : (nx > 0 ? 'left' : 'right');
    const { rect, color } = fn(face);
    const [u0, v0, u1, v1] = uvOf(rect), p = 0.004;
    uv.setXY(i, u0 + p + (u1 - u0 - 2 * p) * uv.getX(i), v0 + p + (v1 - v0 - 2 * p) * uv.getY(i));
    c.set(color); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function paint(g, color, rect = R.white) {
  if (rect === R.white) { const [u0, v0, u1, v1] = uvOf(rect); const uv = g.attributes.uv || new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2); for (let i = 0; i < uv.count; i++) uv.setXY(i, (u0 + u1) / 2, (v0 + v1) / 2); g.setAttribute('uv', uv); }
  else toRect(g, rect);
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
const TMP = new THREE.Matrix4(), EU = new THREE.Euler(), QU = new THREE.Quaternion(), V1 = new THREE.Vector3(), V2 = new THREE.Vector3();
function place(g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  EU.set(rx, ry, rz); QU.setFromEuler(EU);
  g.applyMatrix4(TMP.compose(V1.set(x, y, z), QU, V2.set(sx, sy, sz)));
  return g;
}
function rbox(w, h, d, r = 0.03, seg = 2) { return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)); }
function clean(g) {
  g = g.index ? g.toNonIndexed() : g;
  for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(a)) g.deleteAttribute(a);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return g;
}
// Acumulador de piezas por articulación
class Part {
  constructor() { this.list = []; }
  add(g) { this.list.push(clean(g)); return g; }
  mesh(mat) {
    if (!this.list.length) return null;
    const m = new THREE.Mesh(mergeGeometries(this.list, false), mat);
    m.castShadow = true; m.receiveShadow = true;
    this.list = [];
    return m;
  }
}

// ---------- Texturas de detalle (en gris, se multiplican por el color de la pieza) ----------
function detailPatches(g, W) {
  const px = (r) => [r[0] * W, r[1] * W, r[2] * W, r[3] * W];
  // blanco liso
  let [x, y, w, h] = px(R.white); g.fillStyle = '#fff'; g.fillRect(x, y, w, h);
  const rnd = rand(7);
  // pelo: mechones
  [x, y, w, h] = px(R.hair); g.fillStyle = '#f2f2f2'; g.fillRect(x, y, w, h);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (let i = 0; i < 140; i++) {
    const sx = x + rnd() * w, sy = y + rnd() * h * 0.3 - h * 0.1, len = h * (0.5 + rnd() * 0.7);
    g.strokeStyle = `rgba(0,0,0,${0.08 + rnd() * 0.14})`; g.lineWidth = 0.6 + rnd() * 1.6;
    g.beginPath(); g.moveTo(sx, sy); g.bezierCurveTo(sx + (rnd() - 0.5) * w * 0.2, sy + len * 0.3, sx + (rnd() - 0.5) * w * 0.2, sy + len * 0.7, sx + (rnd() - 0.5) * w * 0.1, sy + len); g.stroke();
  }
  for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; const sx = x + rnd() * w, sy = y + rnd() * h; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + (rnd() - 0.5) * 4, sy + h * 0.2); g.stroke(); }
  g.restore();
  // pelo de oveja (zamarra)
  [x, y, w, h] = px(R.fur); g.fillStyle = '#d8d8d8'; g.fillRect(x, y, w, h);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (let i = 0; i < 260; i++) {
    const cx = x + rnd() * w, cy = y + rnd() * h, r = w * (0.02 + rnd() * 0.035);
    g.strokeStyle = `rgba(0,0,0,${0.12 + rnd() * 0.15})`; g.lineWidth = 1.2;
    g.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.3})`;
    g.beginPath(); g.arc(cx, cy, r, rnd() * 6, rnd() * 6 + 4.5); g.fill(); g.stroke();
  }
  g.restore();
  // punto de lana (txapela, medias)
  [x, y, w, h] = px(R.knit); g.fillStyle = '#e6e6e6'; g.fillRect(x, y, w, h);
  for (let j = 0; j < 12; j++) for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(0,0,0,${0.06 + ((i + j) % 2) * 0.05})`; g.beginPath(); g.ellipse(x + (i + 0.5) * w / 12, y + (j + 0.5) * h / 12, w / 30, h / 20, 0.5, 0, 7); g.fill(); }
  // paja trenzada
  [x, y, w, h] = px(R.straw); g.fillStyle = '#eee'; g.fillRect(x, y, w, h);
  for (let j = 0; j < 10; j++) { g.fillStyle = j % 2 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.4)'; g.fillRect(x, y + j * h / 10, w, h / 20); for (let i = 0; i < 8; i++) { g.strokeStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.moveTo(x + i * w / 8 + (j % 2) * w / 16, y + j * h / 10); g.lineTo(x + i * w / 8 + (j % 2) * w / 16, y + (j + 1) * h / 10); g.stroke(); } }
  // madera
  [x, y, w, h] = px(R.wood); g.fillStyle = '#e8e8e8'; g.fillRect(x, y, w, h);
  for (let i = 0; i < 22; i++) { g.strokeStyle = `rgba(0,0,0,${0.08 + rnd() * 0.15})`; g.lineWidth = 1 + rnd() * 2; const xx = x + rnd() * w; g.beginPath(); g.moveTo(xx, y); g.bezierCurveTo(xx + 4, y + h * 0.3, xx - 4, y + h * 0.6, xx + 2, y + h); g.stroke(); }
  // metal cepillado
  [x, y, w, h] = px(R.metal); const mg = g.createLinearGradient(x, y, x + w, y + h); mg.addColorStop(0, '#ffffff'); mg.addColorStop(0.5, '#b8b8b8'); mg.addColorStop(1, '#f0f0f0'); g.fillStyle = mg; g.fillRect(x, y, w, h);
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.3})`; g.fillRect(x, y + rnd() * h, w, 1); }
  // cuero
  [x, y, w, h] = px(R.leather); g.fillStyle = '#e4e4e4'; g.fillRect(x, y, w, h);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.12})`; g.fillRect(x + rnd() * w, y + rnd() * h, 2, 2); }
  g.strokeStyle = 'rgba(0,0,0,.3)'; g.setLineDash([3, 3]); g.strokeRect(x + 4, y + 4, w - 8, h - 8); g.setLineDash([]);
  // suela de esparto (alpargata)
  [x, y, w, h] = px(R.sole); g.fillStyle = '#f0f0f0'; g.fillRect(x, y, w, h);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.moveTo(x + i * w / 6, y + j * h / 8); g.lineTo(x + (i + 0.5) * w / 6, y + (j + 1) * h / 8); g.lineTo(x + (i + 1) * w / 6, y + j * h / 8); g.stroke(); }
  // tela (lienzo)
  [x, y, w, h] = px(R.cloth); g.fillStyle = '#f0f0f0'; g.fillRect(x, y, w, h);
  for (let i = 0; i < w; i += 3) { g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(x + i, y, 1, h); }
  for (let j = 0; j < h; j += 3) { g.fillStyle = 'rgba(0,0,0,.04)'; g.fillRect(x, y + j, w, 1); }
}

// Textura de tejido sobre una zona ya pintada
function weave(g, x, y, w, h, a = 0.05, seed = 3) {
  const rnd = rand(seed);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (let i = 0; i < w; i += 2) { g.fillStyle = `rgba(0,0,0,${a * (0.4 + rnd() * 0.6)})`; g.fillRect(x + i, y, 1, h); }
  for (let j = 0; j < h; j += 2) { g.fillStyle = `rgba(255,255,255,${a * 0.8 * rnd()})`; g.fillRect(x, y + j, w, 1); }
  g.restore();
}
function shadeBox(g, x, y, w, h, top = 0.12, bottom = 0.18, sides = 0.12) {
  let gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, `rgba(255,255,255,${top})`); gr.addColorStop(0.35, 'rgba(255,255,255,0)'); gr.addColorStop(0.75, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${bottom})`);
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, `rgba(0,0,0,${sides})`); gr.addColorStop(0.15, 'rgba(0,0,0,0)'); gr.addColorStop(0.85, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${sides})`);
  g.fillStyle = gr; g.fillRect(x, y, w, h);
}
function buttons(g, x, y0, y1, n, r, col = '#f7f1e2') {
  for (let i = 0; i < n; i++) {
    const y = y0 + (y1 - y0) * i / Math.max(1, n - 1);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(x + r * 0.2, y + r * 0.25, r, 0, 7); g.fill();
    g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(x - r * 0.3, y, r * 0.18, 0, 7); g.arc(x + r * 0.3, y, r * 0.18, 0, 7); g.fill();
  }
}
function outline(g, lw) { g.lineWidth = lw; g.strokeStyle = 'rgba(20,14,10,.55)'; g.stroke(); }

// ---------- Estampado del torso (delante y detrás) ----------
function paintTorso(g, x, y, s, L, back) {
  // s = lado del cuadrado; el trapecio se estrecha arriba: zona útil superior ~0.76 del ancho
  const u = (v) => x + v * s, w = (v) => y + v * s;
  const base = L.shirt;
  g.fillStyle = base; g.fillRect(x, y, s, s);
  // estampados de la camisa
  if (L.pattern === 'check') {
    const c2 = L.pattern2 || shade(base, -0.35);
    for (let i = 0; i < 12; i++) { g.fillStyle = c2 + '66'; g.fillRect(u(i / 12), y, s / 30, s); g.fillRect(x, w(i / 12), s, s / 30); }
    for (let i = 0; i < 12; i++) { g.fillStyle = c2 + '33'; g.fillRect(u(i / 12 + 0.04), y, s / 14, s); g.fillRect(x, w(i / 12 + 0.04), s, s / 14); }
  } else if (L.pattern === 'stripes') {
    for (let i = 0; i < 10; i++) { g.fillStyle = (L.pattern2 || shade(base, -0.3)); g.fillRect(x, w(i / 10), s, s / 22); }
  } else if (L.pattern === 'dots') {
    g.fillStyle = L.pattern2 || '#ffffff'; for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(u((i + (j % 2) * 0.5) / 9), w(j / 9), s * 0.012, 0, 7); g.fill(); }
  }
  weave(g, x, y, s, s, 0.05, back ? 11 : 5);
  const pr = L.print || '';
  const ink = 'rgba(25,18,12,.6)';

  // ----- estampados especiales completos -----
  if (pr === 'bishop') {
    // alba blanca, capa roja con franja dorada bordada
    g.fillStyle = '#f5efe0'; g.fillRect(u(0.35), y, s * 0.3, s);
    g.fillStyle = L.shirt; g.beginPath(); g.moveTo(x, y); g.lineTo(u(0.36), y); g.lineTo(u(0.3), w(1)); g.lineTo(x, w(1)); g.fill();
    g.beginPath(); g.moveTo(u(1), y); g.lineTo(u(0.64), y); g.lineTo(u(0.7), w(1)); g.lineTo(u(1), w(1)); g.fill();
    for (const sd of [-1, 1]) {
      g.fillStyle = '#e8c34a'; g.beginPath(); g.moveTo(u(0.5 + sd * 0.14), y); g.lineTo(u(0.5 + sd * 0.24), y); g.lineTo(u(0.5 + sd * 0.26), w(1)); g.lineTo(u(0.5 + sd * 0.17), w(1)); g.fill();
      g.fillStyle = '#b8862a'; for (let i = 0; i < 6; i++) { const cx = u(0.5 + sd * (0.19 + i * 0.003)), cy = w(0.1 + i * 0.16); g.fillRect(cx - s * 0.012, cy - s * 0.04, s * 0.024, s * 0.08); g.fillRect(cx - s * 0.035, cy - s * 0.012, s * 0.07, s * 0.024); }
    }
    if (!back) { g.fillStyle = '#e8c34a'; g.beginPath(); g.arc(u(0.5), w(0.32), s * 0.05, 0, 7); g.fill(); g.fillStyle = '#b8232a'; g.fillRect(u(0.49), w(0.27), s * 0.02, s * 0.1); g.fillRect(u(0.46), w(0.3), s * 0.08, s * 0.02); }
    else { g.fillStyle = '#e8c34a'; g.beginPath(); g.moveTo(u(0.3), y); g.lineTo(u(0.7), y); g.lineTo(u(0.5), w(0.35)); g.fill(); g.fillStyle = '#b8862a'; g.beginPath(); g.arc(u(0.5), w(0.14), s * 0.05, 0, 7); g.fill(); }
  }
  if (pr === 'sheet') {
    // momotxorro: sábana blanca manchada de sangre
    g.fillStyle = '#f2eee6'; g.fillRect(x, y, s, s); weave(g, x, y, s, s, 0.06, 9);
    const rnd = rand(back ? 21 : 12);
    for (let i = 0; i < 14; i++) {
      const cx = u(rnd()), cy = w(rnd() * 0.9), r = s * (0.02 + rnd() * 0.05);
      g.fillStyle = `rgba(${150 + rnd() * 40},20,26,${0.7 + rnd() * 0.3})`;
      g.beginPath(); g.ellipse(cx, cy, r, r * 0.8, rnd() * 3, 0, 7); g.fill();
      g.fillRect(cx - r * 0.15, cy, r * 0.3, r * (1 + rnd() * 3));
    }
    g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = s * 0.006; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(u(0.1 + i * 0.2), y); g.quadraticCurveTo(u(0.15 + i * 0.2), w(0.5), u(0.08 + i * 0.2), w(1)); g.stroke(); }
  }
  if (pr === 'coat') {
    // casaca verde del siglo XVIII con botones dorados y chorrera de encaje
    g.fillStyle = L.shirt; g.fillRect(x, y, s, s); weave(g, x, y, s, s, 0.06, 4);
    if (!back) {
      g.fillStyle = '#f4efe0'; g.beginPath(); g.moveTo(u(0.36), y); g.lineTo(u(0.64), y); g.lineTo(u(0.58), w(1)); g.lineTo(u(0.42), w(1)); g.fill();
      g.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(u(0.5), w(0.06 + i * 0.07), s * 0.07 - i * s * 0.008, s * 0.03, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1; g.stroke(); }
      g.fillStyle = '#d6b44a'; g.fillRect(u(0.32), y, s * 0.04, s); g.fillRect(u(0.64), y, s * 0.04, s);
      buttons(g, u(0.27), w(0.2), w(0.85), 5, s * 0.022, '#e8c34a'); buttons(g, u(0.73), w(0.2), w(0.85), 5, s * 0.022, '#e8c34a');
      g.strokeStyle = '#d6b44a'; g.lineWidth = s * 0.012; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(u(0.5 + sd * 0.12), w(0.9)); g.lineTo(u(0.5 + sd * 0.4), w(0.9)); g.stroke(); }
    } else { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(u(0.495), w(0.55), s * 0.01, s * 0.45); buttons(g, u(0.44), w(0.6), w(0.6), 1, s * 0.02, '#e8c34a'); buttons(g, u(0.56), w(0.6), w(0.6), 1, s * 0.02, '#e8c34a'); }
  }
  if (pr === 'rojilla') {
    // camiseta roja con cuello y ribetes azul marino, escudo propio y dorsal
    g.fillStyle = L.shirt; g.fillRect(x, y, s, s); weave(g, x, y, s, s, 0.05, 6);
    g.fillStyle = '#1c2a4a'; for (let i = 0; i < 8; i++) g.fillRect(u(0.05 + i * 0.13), y, s * 0.012, s);
    if (!back) {
      g.fillStyle = '#1c2a4a'; g.beginPath(); g.moveTo(u(0.34), y); g.lineTo(u(0.5), w(0.16)); g.lineTo(u(0.66), y); g.lineTo(u(0.6), y); g.lineTo(u(0.5), w(0.1)); g.lineTo(u(0.4), y); g.fill();
      // escudo: cadenas de Navarra estilizadas
      const cx = u(0.33), cy = w(0.3), r = s * 0.075;
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(cx - r, cy - r); g.lineTo(cx + r, cy - r); g.lineTo(cx + r, cy + r * 0.2); g.quadraticCurveTo(cx + r, cy + r * 1.2, cx, cy + r * 1.4); g.quadraticCurveTo(cx - r, cy + r * 1.2, cx - r, cy + r * 0.2); g.closePath(); g.fill(); outline(g, s * 0.006);
      g.strokeStyle = '#d4002a'; g.lineWidth = s * 0.01; g.beginPath(); g.moveTo(cx - r * 0.7, cy - r * 0.6); g.lineTo(cx + r * 0.7, cy + r * 0.8); g.moveTo(cx + r * 0.7, cy - r * 0.6); g.lineTo(cx - r * 0.7, cy + r * 0.8); g.moveTo(cx, cy - r * 0.8); g.lineTo(cx, cy + r); g.stroke();
      g.fillStyle = '#e8c34a'; g.beginPath(); g.arc(cx, cy + r * 0.1, r * 0.22, 0, 7); g.fill();
      g.fillStyle = '#ffffff'; g.font = `900 ${s * 0.06}px Nunito, sans-serif`; g.textAlign = 'center'; g.fillText('NAVARRA', u(0.5), w(0.72));
    } else { g.fillStyle = '#ffffff'; g.font = `900 ${s * 0.36}px Nunito, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = s * 0.02; g.strokeStyle = '#1c2a4a'; g.strokeText(L.number || '9', u(0.5), w(0.52)); g.fillText(L.number || '9', u(0.5), w(0.52)); g.font = `900 ${s * 0.07}px Nunito, sans-serif`; g.fillText((L.nameTag || 'ROJILLA').toUpperCase(), u(0.5), w(0.2)); }
  }
  if (pr === 'singlet') {
    // camiseta de tirantes: se ven hombros
    g.fillStyle = L.skin; g.fillRect(x, y, u(0.24) - x, s * 0.35); g.fillRect(u(0.76), y, s * 0.24, s * 0.35);
    g.fillStyle = L.shirt; g.beginPath(); g.moveTo(u(0.24), y); g.lineTo(u(0.34), y); g.quadraticCurveTo(u(0.5), w(back ? 0.1 : 0.26), u(0.66), y); g.lineTo(u(0.76), y); g.lineTo(u(0.76), w(0.3)); g.lineTo(u(1), w(0.36)); g.lineTo(u(1), w(1)); g.lineTo(x, w(1)); g.lineTo(x, w(0.36)); g.lineTo(u(0.24), w(0.3)); g.fill();
    g.fillStyle = L.skin; g.beginPath(); g.moveTo(u(0.34), y); g.quadraticCurveTo(u(0.5), w(back ? 0.1 : 0.26), u(0.66), y); g.fill();
    if (!back) { g.strokeStyle = shade(L.skin, -0.25); g.lineWidth = s * 0.006; g.beginPath(); g.moveTo(u(0.44), w(0.02)); g.lineTo(u(0.42), w(0.07)); g.moveTo(u(0.56), w(0.02)); g.lineTo(u(0.58), w(0.07)); g.stroke(); }
  }
  if (pr === 'blouse') {
    // blusa con corpiño (traje de las mujeres) y cordones
    g.fillStyle = L.bodice || '#2b2630'; g.beginPath(); g.moveTo(u(0.14), w(0.22)); g.lineTo(u(0.86), w(0.22)); g.lineTo(u(0.92), w(1)); g.lineTo(u(0.08), w(1)); g.fill();
    weave(g, u(0.1), w(0.22), s * 0.8, s * 0.78, 0.07, 8);
    if (!back) {
      g.fillStyle = L.shirt; g.beginPath(); g.moveTo(u(0.4), w(0.22)); g.lineTo(u(0.6), w(0.22)); g.lineTo(u(0.54), w(0.75)); g.lineTo(u(0.46), w(0.75)); g.fill();
      g.strokeStyle = L.lace || '#e8c34a'; g.lineWidth = s * 0.008; g.beginPath(); for (let i = 0; i < 6; i++) { const yy = w(0.28 + i * 0.08); g.moveTo(u(0.42 + i * 0.006), yy); g.lineTo(u(0.58 - i * 0.006), yy + s * 0.05); g.moveTo(u(0.58 - i * 0.006), yy); g.lineTo(u(0.42 + i * 0.006), yy + s * 0.05); } g.stroke();
      // puntilla del escote
      g.fillStyle = '#ffffff'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(u(0.3 + i * 0.05), w(0.05 + Math.abs(i - 4) * -0.005 + 0.02), s * 0.02, 0, 7); g.fill(); }
    }
  }
  if (pr === 'shawl') {
    // toquilla cruzada con flecos
    g.fillStyle = L.shawl || '#3b2a3a';
    g.beginPath(); g.moveTo(x, y); g.lineTo(u(1), y); g.lineTo(u(1), w(0.35)); g.lineTo(u(0.5), w(back ? 0.9 : 0.68)); g.lineTo(x, w(0.35)); g.fill();
    weave(g, x, y, s, s * 0.9, 0.07, 17);
    g.strokeStyle = L.shawl2 || '#c9a94a'; g.lineWidth = s * 0.012; g.beginPath(); g.moveTo(x, w(0.33)); g.lineTo(u(0.5), w(back ? 0.87 : 0.65)); g.lineTo(u(1), w(0.33)); g.stroke();
    g.strokeStyle = L.shawl || '#3b2a3a'; g.lineWidth = s * 0.006; for (let i = 0; i < 26; i++) { const t = i / 25, px = x + t * s, py = w(0.35) + (1 - Math.abs(t - 0.5) * 2) * (back ? 0.55 : 0.33) * s; g.beginPath(); g.moveTo(px, py); g.lineTo(px + s * 0.005, py + s * 0.06); g.stroke(); }
    if (!back) { g.fillStyle = '#e8c34a'; g.beginPath(); g.arc(u(0.5), w(0.2), s * 0.028, 0, 7); g.fill(); }
  }
  if (pr === 'jersey') {
    // camiseta de pelotari con número en la espalda
    if (back) { g.fillStyle = L.sash || '#d42f2f'; g.font = `900 ${s * 0.3}px Nunito, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(L.number || '1', u(0.5), w(0.45)); }
  }
  if (pr === 'overalls') {
    g.fillStyle = L.overalls || '#3b5a8a'; g.fillRect(u(0.22), w(0.28), s * 0.56, s * 0.72); g.fillRect(u(0.24), y, s * 0.1, s * 0.3); g.fillRect(u(0.66), y, s * 0.1, s * 0.3);
    weave(g, u(0.22), y, s * 0.56, s, 0.08, 23);
    if (!back) { buttons(g, u(0.29), w(0.3), w(0.3), 1, s * 0.022, '#d6b44a'); buttons(g, u(0.71), w(0.3), w(0.3), 1, s * 0.022, '#d6b44a'); g.strokeStyle = 'rgba(255,255,255,.35)'; g.setLineDash([s * 0.012, s * 0.012]); g.lineWidth = s * 0.004; g.strokeRect(u(0.36), w(0.42), s * 0.28, s * 0.2); g.setLineDash([]); }
  }

  // ----- capas genéricas -----
  // cuello / escote
  if (!['sheet', 'coat', 'rojilla', 'singlet', 'bishop', 'shawl', 'blouse'].includes(pr)) {
    if (!back) {
      if (L.collar !== 'round') {
        g.fillStyle = shade(base, 0.12);
        for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(u(0.5), w(0.1)); g.lineTo(u(0.5 + sd * 0.17), y); g.lineTo(u(0.5 + sd * 0.26), y); g.lineTo(u(0.5 + sd * 0.14), w(0.16)); g.closePath(); g.fill(); outline(g, s * 0.004); }
        g.fillStyle = L.skin; g.beginPath(); g.moveTo(u(0.4), y); g.lineTo(u(0.6), y); g.lineTo(u(0.5), w(0.1)); g.fill();
        if (L.placket !== false) { g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = s * 0.005; g.beginPath(); g.moveTo(u(0.5), w(0.1)); g.lineTo(u(0.5), w(1)); g.stroke(); buttons(g, u(0.52), w(0.2), w(0.8), 4, s * 0.013, shade(base, 0.25)); }
      } else { g.fillStyle = shade(base, -0.2); g.beginPath(); g.ellipse(u(0.5), y, s * 0.12, s * 0.07, 0, 0, Math.PI); g.fill(); g.fillStyle = L.skin; g.beginPath(); g.ellipse(u(0.5), y, s * 0.1, s * 0.055, 0, 0, Math.PI); g.fill(); }
    } else { g.fillStyle = shade(base, 0.1); g.fillRect(u(0.3), y, s * 0.4, s * 0.05); g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = s * 0.005; g.beginPath(); g.moveTo(u(0.2), w(0.2)); g.quadraticCurveTo(u(0.5), w(0.25), u(0.8), w(0.2)); g.stroke(); }
  }
  // chaleco
  if (L.vest) {
    g.fillStyle = L.vest;
    if (!back) {
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(u(0.5 + sd * 0.5), y); g.lineTo(u(0.5 + sd * 0.2), y); g.lineTo(u(0.5 + sd * 0.04), w(0.5)); g.lineTo(u(0.5 + sd * 0.04), w(1)); g.lineTo(u(0.5 + sd * 0.5), w(1)); g.fill(); }
      weave(g, x, y, s * 0.46, s, 0.07, 31); weave(g, u(0.54), y, s * 0.46, s, 0.07, 32);
      g.strokeStyle = shade(L.vest, 0.25); g.lineWidth = s * 0.008; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(u(0.5 + sd * 0.2), y); g.lineTo(u(0.5 + sd * 0.04), w(0.5)); g.lineTo(u(0.5 + sd * 0.04), w(1)); g.stroke(); }
      buttons(g, u(0.43), w(0.58), w(0.9), 3, s * 0.016, L.vestButtons || '#c9a94a');
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = s * 0.006; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(u(0.5 + sd * 0.14), w(0.62)); g.lineTo(u(0.5 + sd * 0.3), w(0.6)); g.stroke(); }
      if (L.watch) { g.strokeStyle = '#e8c34a'; g.lineWidth = s * 0.006; g.beginPath(); g.moveTo(u(0.36), w(0.63)); g.quadraticCurveTo(u(0.3), w(0.72), u(0.22), w(0.64)); g.stroke(); }
    } else { g.fillRect(x, y, s, s); weave(g, x, y, s, s, 0.07, 33); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(u(0.3), w(0.78), s * 0.4, s * 0.05); buttons(g, u(0.5), w(0.805), w(0.805), 1, s * 0.012, '#c9a94a'); }
  }
  // delantal
  if (L.apron) {
    if (!back) {
      g.fillStyle = L.apron; g.beginPath(); g.moveTo(u(0.3), w(0.22)); g.lineTo(u(0.7), w(0.22)); g.lineTo(u(0.74), w(0.55)); g.lineTo(u(0.9), w(0.62)); g.lineTo(u(0.92), w(1)); g.lineTo(u(0.08), w(1)); g.lineTo(u(0.1), w(0.62)); g.lineTo(u(0.26), w(0.55)); g.fill();
      weave(g, u(0.08), w(0.2), s * 0.84, s * 0.8, 0.06, 41);
      g.strokeStyle = L.apron; g.lineWidth = s * 0.02; g.beginPath(); g.moveTo(u(0.32), w(0.22)); g.lineTo(u(0.22), y); g.moveTo(u(0.68), w(0.22)); g.lineTo(u(0.78), y); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = s * 0.005; g.strokeRect(u(0.38), w(0.32), s * 0.24, s * 0.14);
      if (L.apronPrint === 'flour') { g.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(u(0.2 + (i * 37 % 60) / 100), w(0.6 + (i * 13 % 30) / 100), s * 0.015, 0, 7); g.fill(); } }
    } else { g.strokeStyle = L.apron; g.lineWidth = s * 0.02; g.beginPath(); g.moveTo(u(0.2), y); g.lineTo(u(0.62), w(0.62)); g.moveTo(u(0.8), y); g.lineTo(u(0.38), w(0.62)); g.stroke(); g.fillStyle = L.apron; g.beginPath(); g.ellipse(u(0.5), w(0.64), s * 0.05, s * 0.03, 0, 0, 7); g.fill(); }
  }
  // correa del zurrón
  if (L.strap) {
    g.strokeStyle = L.strap; g.lineWidth = s * 0.06; g.beginPath(); if (!back) { g.moveTo(u(0.78), y); g.lineTo(u(0.15), w(1)); } else { g.moveTo(u(0.22), y); g.lineTo(u(0.85), w(1)); } g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = s * 0.004; g.setLineDash([s * 0.012, s * 0.01]); g.stroke(); g.setLineDash([]);
  }
  // cintas cruzadas de danzante
  if (L.ribbons) {
    const cols = Array.isArray(L.ribbons) ? L.ribbons : ['#e03c3c', '#f2c230', '#3a8fd6', '#3ca05a', '#b34fc4'];
    cols.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = s * 0.03; g.beginPath(); g.moveTo(u(0.1 + i * 0.03), y); g.lineTo(u(0.8 + i * 0.03), w(0.85)); g.stroke(); g.beginPath(); g.moveTo(u(0.9 - i * 0.03), y); g.lineTo(u(0.2 - i * 0.03), w(0.85)); g.stroke(); });
    if (!back) { g.fillStyle = '#e8c34a'; g.beginPath(); g.arc(u(0.5), w(0.45), s * 0.04, 0, 7); g.fill(); }
  }
  // zamarra (piel de oveja sobre los hombros)
  if (L.fur && pr !== 'sheet') {
    g.fillStyle = L.fur; g.beginPath(); g.moveTo(x, y); g.lineTo(u(1), y); g.lineTo(u(1), w(0.55)); g.quadraticCurveTo(u(0.5), w(back ? 0.9 : 0.4), x, w(0.55)); g.fill();
    const rnd = rand(back ? 61 : 60);
    for (let i = 0; i < 90; i++) { const cx = u(rnd()), cy = w(rnd() * 0.55); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = s * 0.005; g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(cx, cy, s * (0.015 + rnd() * 0.02), rnd() * 6, rnd() * 6 + 4); g.fill(); g.stroke(); }
  } else if (L.fur && pr === 'sheet') {
    g.fillStyle = L.fur; g.beginPath(); g.moveTo(x, y); g.lineTo(u(1), y); g.lineTo(u(1), w(0.22)); g.quadraticCurveTo(u(0.5), w(0.36), x, w(0.22)); g.fill();
    const rnd = rand(62); for (let i = 0; i < 40; i++) { const cx = u(rnd()), cy = w(rnd() * 0.24); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = s * 0.005; g.beginPath(); g.arc(cx, cy, s * 0.02, rnd() * 6, rnd() * 6 + 4); g.stroke(); }
  }
  // pañuelo al cuello
  if (L.scarf) {
    g.fillStyle = L.scarf;
    if (!back) {
      g.beginPath(); g.moveTo(u(0.22), y); g.lineTo(u(0.78), y); g.lineTo(u(0.5), w(0.24)); g.fill();
      g.beginPath(); g.ellipse(u(0.5), w(0.2), s * 0.05, s * 0.04, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(u(0.47), w(0.22)); g.lineTo(u(0.4), w(0.42)); g.lineTo(u(0.47), w(0.4)); g.fill();
      g.beginPath(); g.moveTo(u(0.53), w(0.22)); g.lineTo(u(0.6), w(0.44)); g.lineTo(u(0.54), w(0.41)); g.fill();
      g.strokeStyle = shade(L.scarf, -0.3); g.lineWidth = s * 0.004; g.beginPath(); g.moveTo(u(0.3), w(0.03)); g.lineTo(u(0.5), w(0.2)); g.lineTo(u(0.7), w(0.03)); g.stroke();
      if (L.scarfDots) { g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(u(0.32 + (i % 4) * 0.12), w(0.03 + Math.floor(i / 4) * 0.07), s * 0.008, 0, 7); g.fill(); } }
    } else { g.beginPath(); g.moveTo(u(0.2), y); g.lineTo(u(0.8), y); g.lineTo(u(0.5), w(0.34)); g.fill(); g.strokeStyle = shade(L.scarf, -0.3); g.lineWidth = s * 0.004; g.stroke(); }
  }
  // faja (cinturón de tela enrollado)
  if (L.sash) {
    const y0 = w(0.8);
    g.fillStyle = L.sash; g.fillRect(x, y0, s, s * 0.2);
    weave(g, x, y0, s, s * 0.2, 0.08, 51);
    g.strokeStyle = shade(L.sash, -0.35); g.lineWidth = s * 0.006;
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x, y0 + i * s * 0.05); g.bezierCurveTo(u(0.3), y0 + i * s * 0.05 + s * 0.01, u(0.7), y0 + i * s * 0.05 - s * 0.01, u(1), y0 + i * s * 0.05); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, y0, s, s * 0.012);
    if (!back) { g.fillStyle = shade(L.sash, -0.15); g.beginPath(); g.ellipse(u(0.2), y0 + s * 0.1, s * 0.05, s * 0.07, 0.3, 0, 7); g.fill(); outline(g, s * 0.004); }
  } else if (L.belt) {
    g.fillStyle = L.belt; g.fillRect(x, w(0.9), s, s * 0.08); if (!back) { g.strokeStyle = '#d6b44a'; g.lineWidth = s * 0.012; g.strokeRect(u(0.44), w(0.905), s * 0.12, s * 0.07); }
  }
  if (L.badge && !back) { g.fillStyle = L.badge; g.beginPath(); g.arc(u(0.7), w(0.35), s * 0.04, 0, 7); g.fill(); outline(g, s * 0.004); }
  if (L.medal && !back) { g.strokeStyle = '#1c7a4a'; g.lineWidth = s * 0.012; g.beginPath(); g.moveTo(u(0.4), y); g.lineTo(u(0.5), w(0.36)); g.lineTo(u(0.6), y); g.stroke(); g.fillStyle = '#e8c34a'; g.beginPath(); g.arc(u(0.5), w(0.4), s * 0.04, 0, 7); g.fill(); outline(g, s * 0.004); }
  // luz y volumen
  shadeBox(g, x, y, s, s, 0.14, 0.2, 0.16);
  // pliegues de tela
  g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = s * 0.01;
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(u(0.5 + sd * 0.3), w(0.45)); g.quadraticCurveTo(u(0.5 + sd * 0.26), w(0.6), u(0.5 + sd * 0.32), w(0.75)); g.stroke(); }
}

// ---------- Estampado de las piernas (frente de cada pierna) ----------
function paintLeg(g, x, y, w, h, L, side) {
  g.fillStyle = L.pants; g.fillRect(x, y, w, h);
  weave(g, x, y, w, h, 0.07, side < 0 ? 71 : 72);
  if (L.pantsStripe) { g.fillStyle = L.pantsStripe; g.fillRect(side < 0 ? x : x + w * 0.88, y, w * 0.12, h); }
  // medias / calcetines (con canalé)
  if (L.socks) {
    const y0 = y + h * (L.longSocks ? 0.35 : 0.62);
    g.fillStyle = L.socks; g.fillRect(x, y0, w, y + h - y0);
    for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(x + i * w / 10, y0, w / 26, y + h - y0); }
    g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x, y0, w, h * 0.02);
  }
  // cintas de alpargata cruzadas sobre la media
  if (L.laces) {
    g.strokeStyle = L.laces; g.lineWidth = w * 0.035;
    for (let i = 0; i < 3; i++) { const yy = y + h * (0.66 + i * 0.1); g.beginPath(); g.moveTo(x + w * 0.05, yy); g.lineTo(x + w * 0.95, yy + h * 0.08); g.moveTo(x + w * 0.95, yy); g.lineTo(x + w * 0.05, yy + h * 0.08); g.stroke(); }
  }
  // cabos de la faja que cuelgan en el lado izquierdo, con flecos
  if (L.sash && side < 0 && !L.skirt) {
    g.fillStyle = L.sash; g.beginPath(); g.moveTo(x + w * 0.1, y); g.lineTo(x + w * 0.5, y); g.lineTo(x + w * 0.46, y + h * 0.42); g.lineTo(x + w * 0.14, y + h * 0.4); g.fill();
    g.strokeStyle = L.sash; g.lineWidth = w * 0.02; for (let i = 0; i < 7; i++) { const xx = x + w * (0.15 + i * 0.045); g.beginPath(); g.moveTo(xx, y + h * 0.4); g.lineTo(xx, y + h * 0.48); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x + w * 0.3, y, w * 0.02, h * 0.4);
  }
  if (L.kneePatch) { g.fillStyle = shade(L.pants, -0.2); g.fillRect(x + w * 0.25, y + h * 0.45, w * 0.5, h * 0.15); g.strokeStyle = 'rgba(255,255,255,.3)'; g.setLineDash([3, 3]); g.strokeRect(x + w * 0.25, y + h * 0.45, w * 0.5, h * 0.15); g.setLineDash([]); }
  // costura y pliegue de rodilla
  g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = w * 0.02; g.beginPath(); g.moveTo(side < 0 ? x + w * 0.96 : x + w * 0.04, y); g.lineTo(side < 0 ? x + w * 0.96 : x + w * 0.04, y + h); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.1)'; g.beginPath(); g.moveTo(x + w * 0.3, y + h * 0.5); g.quadraticCurveTo(x + w * 0.5, y + h * 0.54, x + w * 0.7, y + h * 0.5); g.stroke();
  shadeBox(g, x, y, w, h, 0.1, 0.12, 0.12);
}

function paintSleeve(g, x, y, w, h, L) {
  g.fillStyle = L.sleeves || L.shirt; g.fillRect(x, y, w, h);
  if (L.pattern === 'check') { const c2 = L.pattern2 || shade(L.shirt, -0.35); for (let i = 0; i < 6; i++) { g.fillStyle = c2 + '66'; g.fillRect(x + i * w / 6, y, w / 16, h); g.fillRect(x, y + i * h / 10, w, h / 30); } }
  if (L.pattern === 'stripes') for (let i = 0; i < 8; i++) { g.fillStyle = L.pattern2 || shade(L.shirt, -0.3); g.fillRect(x, y + i * h / 8, w, h / 40); }
  weave(g, x, y, w, h, 0.06, 81);
  if (L.print === 'rojilla') { g.fillStyle = '#1c2a4a'; g.fillRect(x, y + h * 0.9, w, h * 0.1); }
  if (L.print === 'coat') { g.fillStyle = '#d6b44a'; g.fillRect(x, y + h * 0.82, w, h * 0.12); }
  if (L.ribbons) { g.fillStyle = '#e03c3c'; g.fillRect(x, y + h * 0.3, w, h * 0.05); }
  // puño
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, y + h * 0.92, w, h * 0.08);
  g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = w * 0.03; g.beginPath(); g.moveTo(x + w * 0.2, y + h * 0.45); g.quadraticCurveTo(x + w * 0.5, y + h * 0.5, x + w * 0.8, y + h * 0.43); g.stroke();
}

// ---------- Cara (tres expresiones) ----------
// Cara impresa sobre el cilindro de la cabeza: u = 0,5 delante; v = altura.
const HEAD_C = 2 * Math.PI * D.headR;
function paintFace(L, W, frame) {
  const H = Math.round(W * D.headH / HEAD_C);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const k = W / HEAD_C;                        // píxeles por unidad
  const X = (a) => W / 2 + a * k, Y = (hy) => H - hy * k, sz = (v) => v * k;
  g.fillStyle = L.skin; g.fillRect(0, 0, W, H);
  // leve volumen: más oscuro hacia los lados y abajo
  let gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(0,0,0,.14)'); gr.addColorStop(0.32, 'rgba(0,0,0,0)'); gr.addColorStop(0.68, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.14)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,255,255,.08)'); gr.addColorStop(1, 'rgba(0,0,0,.08)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const ink = '#1a120d', lip = '#8a2f2c';
  const mood = L.face || 'smile';
  const eyeY = 0.225, eyeX = 0.062;
  if (L.facePaint === 'soot') { g.fillStyle = 'rgba(25,20,18,.8)'; g.beginPath(); g.ellipse(X(0), Y(0.2), sz(0.14), sz(0.13), 0, 0, 7); g.fill(); }
  if (L.facePaint === 'rosy') { g.fillStyle = 'rgba(210,60,60,.45)'; for (const s of [-1, 1]) { g.beginPath(); g.arc(X(s * 0.1), Y(0.15), sz(0.03), 0, 7); g.fill(); } }
  // arrugas (mayores)
  if (L.old) { g.strokeStyle = 'rgba(80,40,20,.35)'; g.lineWidth = sz(0.004); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X(s * 0.095), Y(0.235)); g.lineTo(X(s * 0.11), Y(0.225)); g.moveTo(X(s * 0.095), Y(0.22)); g.lineTo(X(s * 0.11), Y(0.215)); g.moveTo(X(s * 0.055), Y(0.12)); g.quadraticCurveTo(X(s * 0.07), Y(0.14), X(s * 0.065), Y(0.17)); g.stroke(); } g.beginPath(); g.moveTo(X(-0.04), Y(0.31)); g.lineTo(X(0.04), Y(0.31)); g.moveTo(X(-0.03), Y(0.325)); g.lineTo(X(0.03), Y(0.325)); g.stroke(); }
  // mejillas
  if (L.cheeks !== false) { g.fillStyle = 'rgba(232,110,100,.28)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(X(s * 0.1), Y(0.15), sz(0.028), sz(0.018), 0, 0, 7); g.fill(); } }
  if (L.freckles) { g.fillStyle = 'rgba(140,70,35,.55)'; for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(X(s * (0.07 + (i % 3) * 0.014)), Y(0.175 - Math.floor(i / 3) * 0.012 + (i % 2) * 0.005), sz(0.0035), 0, 7); g.fill(); } }
  // ojos
  const blink = frame === 'blink';
  for (const s of [-1, 1]) {
    const ex = X(s * eyeX), ey = Y(eyeY);
    if (blink) { g.strokeStyle = ink; g.lineWidth = sz(0.008); g.lineCap = 'round'; g.beginPath(); g.moveTo(ex - sz(0.02), ey); g.quadraticCurveTo(ex, ey + sz(0.012), ex + sz(0.02), ey); g.stroke(); continue; }
    if (mood === 'angry') {
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(ex, ey, sz(0.026), sz(0.02), 0, 0, 7); g.fill();
      g.fillStyle = ink; g.beginPath(); g.arc(ex - s * sz(0.004), ey + sz(0.002), sz(0.013), 0, 7); g.fill();
    } else {
      g.fillStyle = ink; g.beginPath(); g.ellipse(ex, ey, sz(0.014), sz(0.02), 0, 0, 7); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ex - sz(0.004), ey - sz(0.007), sz(0.005), 0, 7); g.fill();
      g.beginPath(); g.arc(ex + sz(0.005), ey + sz(0.007), sz(0.0022), 0, 7); g.fill();
    }
    if (L.lashes) { g.strokeStyle = ink; g.lineWidth = sz(0.005); g.lineCap = 'round'; g.beginPath(); g.moveTo(ex + s * sz(0.012), ey - sz(0.014)); g.lineTo(ex + s * sz(0.026), ey - sz(0.024)); g.moveTo(ex + s * sz(0.015), ey - sz(0.006)); g.lineTo(ex + s * sz(0.03), ey - sz(0.01)); g.stroke(); }
  }
  // cejas
  g.strokeStyle = L.brows || shade(L.hair || '#3b2418', -0.2); g.lineCap = 'round'; g.lineWidth = sz(L.lashes ? 0.008 : 0.012);
  for (const s of [-1, 1]) {
    g.beginPath();
    if (mood === 'angry') { g.moveTo(X(s * 0.03), Y(0.262)); g.lineTo(X(s * 0.095), Y(0.285)); }
    else if (mood === 'brave') { g.moveTo(X(s * 0.035), Y(0.262)); g.quadraticCurveTo(X(s * 0.065), Y(0.276), X(s * 0.095), Y(0.272)); }
    else if (mood === 'worried') { g.moveTo(X(s * 0.035), Y(0.28)); g.quadraticCurveTo(X(s * 0.065), Y(0.276), X(s * 0.09), Y(0.262)); }
    else { g.moveTo(X(s * 0.035), Y(0.268)); g.quadraticCurveTo(X(s * 0.062), Y(0.286), X(s * 0.092), Y(0.27)); }
    g.stroke();
  }
  // nariz sugerida
  if (L.nose !== false) { g.strokeStyle = 'rgba(110,50,30,.35)'; g.lineWidth = sz(0.005); g.beginPath(); g.moveTo(X(-0.012), Y(0.165)); g.quadraticCurveTo(X(0), Y(0.158), X(0.012), Y(0.165)); g.stroke(); }
  // barba (antes de la boca)
  if (L.beard) {
    g.fillStyle = L.beard;
    g.beginPath(); g.moveTo(X(-0.13), Y(0.2)); g.quadraticCurveTo(X(-0.13), Y(0.02), X(0), Y(0.0)); g.quadraticCurveTo(X(0.13), Y(0.02), X(0.13), Y(0.2)); g.lineTo(X(0.1), Y(0.19)); g.quadraticCurveTo(X(0.06), Y(0.11), X(0), Y(0.105)); g.quadraticCurveTo(X(-0.06), Y(0.11), X(-0.1), Y(0.19)); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = sz(0.003); for (let i = 0; i < 18; i++) { const a = -0.11 + i * 0.013; g.beginPath(); g.moveTo(X(a), Y(0.1 - Math.abs(a) * 0.3)); g.lineTo(X(a * 1.05), Y(0.04 + Math.abs(a) * 0.4)); g.stroke(); }
  } else if (L.stubble) { const rn = rand(99); g.fillStyle = 'rgba(40,30,25,.35)'; for (let i = 0; i < 160; i++) { const a = (rn() - 0.5) * 0.2, b = 0.03 + rn() * 0.1; if (Math.abs(a) < 0.06 && b > 0.1) continue; if ((a / 0.1) ** 2 + ((b - 0.07) / 0.07) ** 2 > 1) continue; g.fillRect(X(a), Y(b), sz(0.003), sz(0.003)); } }
  // boca
  const talk = frame === 'talk';
  const my = 0.115;
  if (talk) {
    g.fillStyle = '#5a1a18'; g.beginPath(); g.ellipse(X(0), Y(my), sz(0.03), sz(0.024), 0, 0, 7); g.fill();
    g.fillStyle = '#d9575a'; g.beginPath(); g.ellipse(X(0), Y(my - 0.012), sz(0.018), sz(0.009), 0, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.fillRect(X(-0.018), Y(my + 0.02), sz(0.036), sz(0.008));
  } else if (mood === 'angry') {
    g.strokeStyle = ink; g.lineWidth = sz(0.009); g.beginPath(); g.moveTo(X(-0.045), Y(my - 0.01)); g.quadraticCurveTo(X(0), Y(my + 0.015), X(0.045), Y(my - 0.01)); g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(X(-0.03), Y(my + 0.004), sz(0.06), sz(0.01));
  } else if (mood === 'happy') {
    g.fillStyle = '#5a1a18'; g.beginPath(); g.moveTo(X(-0.052), Y(my + 0.012)); g.quadraticCurveTo(X(0), Y(my - 0.07), X(0.052), Y(my + 0.012)); g.closePath(); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(X(-0.046), Y(my + 0.01)); g.lineTo(X(0.046), Y(my + 0.01)); g.lineTo(X(0.04), Y(my - 0.005)); g.lineTo(X(-0.04), Y(my - 0.005)); g.fill();
    g.fillStyle = '#d9575a'; g.beginPath(); g.ellipse(X(0), Y(my - 0.03), sz(0.022), sz(0.01), 0, 0, 7); g.fill();
  } else if (mood === 'brave') {
    g.strokeStyle = ink; g.lineWidth = sz(0.009); g.lineCap = 'round'; g.beginPath(); g.moveTo(X(-0.04), Y(my + 0.004)); g.quadraticCurveTo(X(0.01), Y(my - 0.025), X(0.05), Y(my + 0.018)); g.stroke();
  } else if (mood === 'worried') {
    g.strokeStyle = ink; g.lineWidth = sz(0.008); g.beginPath(); g.moveTo(X(-0.03), Y(my - 0.01)); g.quadraticCurveTo(X(0), Y(my + 0.005), X(0.03), Y(my - 0.01)); g.stroke();
  } else {
    g.strokeStyle = ink; g.lineWidth = sz(0.009); g.lineCap = 'round'; g.beginPath(); g.moveTo(X(-0.045), Y(my + 0.012)); g.quadraticCurveTo(X(0), Y(my - 0.035), X(0.045), Y(my + 0.012)); g.stroke();
    if (L.lipstick) { g.strokeStyle = L.lipstick; g.lineWidth = sz(0.006); g.stroke(); }
  }
  // bigote
  if (L.moustache) {
    g.fillStyle = L.moustache;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X(0), Y(0.15)); g.bezierCurveTo(X(s * 0.03), Y(0.162), X(s * 0.06), Y(0.15), X(s * 0.075), Y(L.moustacheCurl ? 0.162 : 0.128)); g.bezierCurveTo(X(s * 0.05), Y(0.132), X(s * 0.02), Y(0.138), X(0), Y(0.135)); g.fill(); }
  }
  // gafas
  if (L.glasses) { g.strokeStyle = L.glasses; g.lineWidth = sz(0.006); for (const s of [-1, 1]) { g.beginPath(); g.arc(X(s * eyeX), Y(eyeY), sz(0.032), 0, 7); g.stroke(); } g.beginPath(); g.moveTo(X(-0.03), Y(eyeY + 0.005)); g.lineTo(X(0.03), Y(eyeY + 0.005)); g.stroke(); }
  // parte trasera: pelo/nuca pintados si no hay casco
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---------- Geometrías base ----------
function headGeo(r, h) {
  // cilindro con cantos redondeados (torno); v = altura normalizada
  const pts = [], e = r * 0.2;
  pts.push(new THREE.Vector2(0.0001, 0));
  for (let i = 0; i <= 4; i++) { const a = -Math.PI / 2 + (i / 4) * Math.PI / 2; pts.push(new THREE.Vector2(r - e + Math.cos(a) * e, e + Math.sin(a) * e)); }
  for (let i = 0; i <= 4; i++) { const a = (i / 4) * Math.PI / 2; pts.push(new THREE.Vector2(r - e + Math.cos(a) * e, h - e + Math.sin(a) * e)); }
  pts.push(new THREE.Vector2(0.0001, h));
  const g = new THREE.LatheGeometry(pts, 32, -Math.PI, Math.PI * 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setY(i, Math.min(1, Math.max(0, p.getY(i) / h)));
  return g;
}
function trapezoidGeo(wb, wt, h, db, dt) {
  const g = rbox(1, h, 1, 0.05, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) + h / 2) / h;
    p.setX(i, p.getX(i) * (wb + (wt - wb) * t));
    p.setZ(i, p.getZ(i) * (db + (dt - db) * t));
  }
  g.computeVertexNormals();
  return g;
}

// ---------- Construcción de la figura ----------
const faceCache = new Map(), atlasCache = new Map();
export function buildMinifig(look, opts = {}) {
  const L = { skin: '#f1c7a5', shirt: '#e8e0cc', pants: '#3b3a40', hair: '#3b2418', ...look };
  L.shoes ||= shade(L.pants, -0.35);
  const hi = !!opts.hero;
  const k = (L.height ? L.height / 1.62 : 1) * S;
  const B = L.build || 1;
  const key = JSON.stringify(L) + (hi ? 'H' : '');

  // atlas del cuerpo
  let atlas = atlasCache.get(key);
  if (!atlas) {
    const W = hi ? 1024 : 512;
    const c = document.createElement('canvas'); c.width = c.height = W;
    const g = c.getContext('2d');
    detailPatches(g, W);
    const px = (r) => r.map(v => v * W);
    let [x, y, s] = px(R.front); paintTorso(g, x, y, s, L, false);
    [x, y, s] = px(R.back); paintTorso(g, x, y, s, L, true);
    let r = px(R.legL); paintLeg(g, r[0], r[1], r[2], r[3], L, -1);
    r = px(R.legR); paintLeg(g, r[0], r[1], r[2], r[3], L, 1);
    r = px(R.sleeveL); paintSleeve(g, r[0], r[1], r[2], r[3], L);
    r = px(R.sleeveR); paintSleeve(g, r[0], r[1], r[2], r[3], L);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    atlas = new THREE.MeshStandardMaterial({ map: t, vertexColors: true, roughness: 0.42, metalness: 0 });
    atlasCache.set(key, atlas);
  }
  const fkey = ['skin', 'hair', 'face', 'beard', 'moustache', 'moustacheCurl', 'freckles', 'lashes', 'glasses', 'old', 'cheeks', 'brows', 'stubble', 'facePaint', 'lipstick', 'nose'].map(n => L[n]).join('|') + (hi ? 'H' : '');
  let faces = faceCache.get(fkey);
  if (!faces) {
    const W = hi ? 1024 : 512;
    faces = { open: paintFace(L, W, 'open'), blink: paintFace(L, W, 'blink'), talk: paintFace(L, W, 'talk') };
    faceCache.set(fkey, faces);
  }
  const faceMat = new THREE.MeshStandardMaterial({ map: faces.open, roughness: 0.38 });

  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);          // sube y baja al andar
  const hips = new THREE.Group(); hips.position.y = D.legTop * k; body.add(hips);
  const J = { body, hips };
  const P = () => new Part();

  // --- piernas ---
  const legW = D.legW * B, gap = 0.02;
  const hipsP = P();
  hipsP.add(paint(place(rbox(D.hipW * B * k, D.hipH * k, D.legD * k, 0.02 * k), 0, D.hipH / 2 * k - 0.02 * k, 0), L.pants));
  // pasador de cadera
  hipsP.add(paint(place(new THREE.CylinderGeometry(0.06 * k, 0.06 * k, D.hipW * B * k + 0.02 * k, 12), 0, 0, 0, 0, 0, Math.PI / 2), shade(L.pants, -0.15)));
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(s * (legW / 2 + gap / 2) * k, 0, 0); hips.add(leg);
    const lp = P();
    const lh = D.legTop - D.footH - 0.02;
    lp.add(perFace(place(rbox(legW * k, lh * k, D.legD * k, 0.025 * k), 0, -(lh / 2 + 0.02) * k, -0.01 * k),
      (f) => f === 'front' ? { rect: s < 0 ? R.legL : R.legR, color: '#ffffff' } : { rect: R.cloth, color: L.pants }));
    // pie (sobresale hacia delante, como en las piezas reales)
    const foot = perFace(place(rbox(legW * k, D.footH * k, D.footD * k, 0.03 * k), 0, -(D.legTop - D.footH / 2) * k, 0.04 * k),
      (f) => f === 'bottom' ? { rect: L.espadrille ? R.sole : R.white, color: L.espadrille ? '#d9c79a' : shade(L.shoes, -0.2) } : { rect: R.leather, color: L.shoes });
    lp.add(foot);
    if (L.espadrille) lp.add(paint(place(rbox(legW * 1.04 * k, 0.035 * k, D.footD * 1.02 * k, 0.012 * k), 0, -(D.legTop - 0.02) * k, 0.04 * k), '#d9c79a', R.sole));
    if (L.boots) lp.add(paint(place(rbox(legW * 1.04 * k, 0.2 * k, D.legD * 1.04 * k, 0.02 * k), 0, -(D.legTop - D.footH - 0.08) * k, -0.01 * k), L.shoes, R.leather));
    const m = lp.mesh(atlas); leg.add(m);
    J[s < 0 ? 'legL' : 'legR'] = leg;
    J[s < 0 ? 'kneeL' : 'kneeR'] = new THREE.Object3D();
  }
  if (L.skirt) {
    const sk = new THREE.CylinderGeometry(0.34 * B * k, 0.46 * B * k, 0.44 * k, 20, 3, true);
    const pp = sk.attributes.position; for (let i = 0; i < pp.count; i++) { const a = Math.atan2(pp.getZ(i), pp.getX(i)); if (pp.getY(i) < 0) { pp.setX(i, pp.getX(i) + Math.cos(a) * Math.sin(a * 8) * 0.012 * k); pp.setZ(i, pp.getZ(i) * 0.82 + Math.sin(a) * Math.sin(a * 8) * 0.012 * k); } else pp.setZ(i, pp.getZ(i) * 0.75); }
    sk.computeVertexNormals();
    hipsP.add(paint(place(sk, 0, -0.14 * k, 0), L.skirt, R.cloth));
    if (L.skirtBand) hipsP.add(paint(place(new THREE.CylinderGeometry(0.455 * B * k, 0.462 * B * k, 0.05 * k, 20, 1, true, 0, Math.PI * 2), 0, -0.33 * k, 0, 0, 0, 0, 1, 1, 0.82), L.skirtBand));
  }
  if (L.bells) {
    // cencerros de joaldun a la espalda
    for (const bx of [-0.14, 0.14]) hipsP.add(paint(place(new THREE.CylinderGeometry(0.08 * k, 0.12 * k, 0.24 * k, 10), bx * k, 0.02 * k, -0.24 * k, 0.15), '#8a7a58', R.metal));
  }
  const hm = hipsP.mesh(atlas); hips.add(hm);

  // --- torso ---
  const torso = new THREE.Group(); torso.position.y = D.hipH * k; hips.add(torso); J.torso = torso;
  const tp = P();
  const sideCol = L.vest || (L.print === 'sheet' ? '#f2eee6' : L.print === 'bishop' ? L.shirt : L.shirt);
  tp.add(perFace(place(trapezoidGeo(D.torsoWb * B * k, D.torsoWt * B * k, D.torsoH * k, D.torsoDb * k, D.torsoDt * k), 0, D.torsoH / 2 * k, 0),
    (f) => f === 'front' ? { rect: R.front, color: '#ffffff' } : f === 'back' ? { rect: R.back, color: '#ffffff' } : f === 'top' ? { rect: R.white, color: L.fur || sideCol } : { rect: R.cloth, color: sideCol }));
  if (L.fur) {
    // zamarra: volumen de piel sobre los hombros
    const f = new THREE.SphereGeometry(0.36 * k, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42);
    tp.add(paint(place(f, 0, D.torsoH * 0.62 * k, 0, 0, 0, 0, 1.05 * B, 0.7, 0.62), L.fur, R.fur));
  }
  if (L.cape) {
    const cp = trapezoidGeo(0.6 * k, 0.5 * k, 0.95 * k, 0.03 * k, 0.03 * k);
    tp.add(paint(place(cp, 0, 0.05 * k, -0.19 * k, 0.1), L.cape, R.cloth));
  }
  if (L.bag) tp.add(paint(place(rbox(0.22 * k, 0.2 * k, 0.08 * k, 0.03 * k), -0.34 * k, 0.02 * k, 0.02 * k, 0, 0, 0.1), L.bag, R.leather));
  if (L.bell && !L.bells) { const bl = new THREE.Group(); bl.position.set(0, 0.2 * k, -0.2 * k); torso.add(bl); const bp = P(); bp.add(paint(new THREE.CylinderGeometry(0.1 * k, 0.16 * k, 0.28 * k, 12), '#8a7a58', R.metal)); bl.add(bp.mesh(atlas)); J.bell = bl; }
  // cuello
  tp.add(paint(place(new THREE.CylinderGeometry(0.1 * k, 0.1 * k, D.neckH * k + 0.02 * k, 14), 0, (D.torsoH + D.neckH / 2) * k, 0), L.skin));
  torso.add(tp.mesh(atlas));

  // --- brazos ---
  const shY = D.torsoH * 0.82, shX = D.torsoWt * B / 2 + 0.035;
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * shX * k, shY * k, 0); torso.add(sh);
    const ap = P();
    const sleeve = L.sleeves || (L.print === 'sheet' ? '#f2eee6' : L.shirt);
    // hombro redondeado y brazo algo abierto, con el antebrazo hacia delante
    ap.add(paint(place(new THREE.SphereGeometry(0.1 * k, 14, 10), s * 0.02 * k, -0.02 * k, 0, 0, 0, 0, 1, 1, 1.05), L.fur && !L.shortSleeves ? L.fur : sleeve, L.fur ? R.fur : R.white));
    const upper = perFace(place(rbox(0.16 * k, 0.26 * k, 0.18 * k, 0.06 * k), s * 0.04 * k, -0.13 * k, 0, 0, 0, s * 0.12),
      (f) => f === 'top' || f === 'bottom' ? { rect: R.white, color: sleeve } : { rect: s < 0 ? R.sleeveL : R.sleeveR, color: '#ffffff' });
    ap.add(upper);
    const lower = rbox(0.145 * k, 0.2 * k, 0.16 * k, 0.05 * k);
    ap.add(L.shortSleeves ? paint(place(lower, s * 0.065 * k, -0.3 * k, 0.05 * k, -0.55, 0, s * 0.08), L.skin) :
      perFace(place(lower, s * 0.065 * k, -0.3 * k, 0.05 * k, -0.55, 0, s * 0.08), (f) => f === 'top' || f === 'bottom' ? { rect: R.white, color: sleeve } : { rect: s < 0 ? R.sleeveL : R.sleeveR, color: '#ffffff' }));
    if (L.shortSleeves) ap.add(paint(place(new THREE.CylinderGeometry(0.085 * k, 0.085 * k, 0.05 * k, 12), s * 0.05 * k, -0.22 * k, 0.01 * k, 0, 0, s * 0.12), sleeve));
    else ap.add(paint(place(new THREE.CylinderGeometry(0.08 * k, 0.08 * k, 0.04 * k, 12), s * 0.07 * k, -0.37 * k, 0.12 * k, -0.55, 0, s * 0.08), shade(sleeve, -0.12)));
    sh.add(ap.mesh(atlas));
    // muñeca y mano en C
    const el = new THREE.Group(); el.position.set(s * 0.075 * k, -0.4 * k, 0.15 * k); el.rotation.x = -0.55; sh.add(el);
    const hp = P();
    const handC = L.gloves || L.skin;
    hp.add(paint(place(new THREE.CylinderGeometry(0.045 * k, 0.05 * k, 0.07 * k, 10), 0, 0.01 * k, 0), handC));
    const hand = new THREE.TorusGeometry(0.068 * k, 0.034 * k, 8, 14, Math.PI * 1.45);
    hp.add(paint(place(hand, 0, -0.075 * k, 0.01 * k, 0, Math.PI / 2 - s * 0.55, -Math.PI * 0.62), handC));
    el.add(hp.mesh(atlas));
    J[s < 0 ? 'armL' : 'armR'] = sh; J[s < 0 ? 'elbowL' : 'elbowR'] = el;
  }

  // --- cabeza ---
  const neck = new THREE.Group(); neck.position.y = (D.torsoH + D.neckH) * k; torso.add(neck);
  const head = new THREE.Group(); neck.add(head); J.head = head;
  const big = L.bigHead ? 1.8 : 1;
  const hr = D.headR * k * big, hh = D.headH * k * big;
  const hmesh = new THREE.Mesh(headGeo(hr, hh), faceMat); hmesh.castShadow = true; head.add(hmesh);
  J.face = { mat: faceMat, tex: faces, t: 0 };
  const hp = P();
  // tetón superior
  if (!L.hat && !L.txapela && !L.helmet && (L.hairStyle === 'bald' || !L.hair)) hp.add(paint(place(new THREE.CylinderGeometry(hr * 0.6, hr * 0.62, D.studH * k, 20), 0, hh + D.studH / 2 * k, 0), L.skin));
  // pelo
  const hairC = L.hair, hs = L.hairStyle || 'short';
  const hatOn = !!(L.hat || L.txapela || L.helmet);
  if (hairC && hs !== 'bald') {
    const H2 = (g) => paint(g, hairC, R.hair);
    // casquete (cubre la parte de arriba y la nuca; flequillo delante)
    const cap = new THREE.SphereGeometry(hr * 1.07, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5);
    hp.add(H2(place(cap, 0, hh * 0.74, -0.01 * k, 0, 0, 0, 1, hatOn ? 0.6 : 0.95, 1.02)));
    // nuca: media caña por detrás
    const back = new THREE.CylinderGeometry(hr * 1.07, hr * 1.1, hh * 0.5, 24, 1, false, Math.PI * 0.55, Math.PI * 0.9);
    hp.add(H2(place(back, 0, hh * 0.5, 0)));
    // patillas
    for (const s of [-1, 1]) hp.add(H2(place(rbox(0.035 * k, hh * 0.22, 0.07 * k, 0.012 * k), s * hr * 1.02, hh * 0.62, -0.03 * k)));
    if (!hatOn) {
      // flequillo en mechones
      const nF = hs === 'spiky' ? 7 : 5;
      for (let i = 0; i < nF; i++) {
        const a = (i / (nF - 1) - 0.5) * 1.5;
        const g = hs === 'spiky' ? new THREE.ConeGeometry(0.05 * k, 0.16 * k, 6) : new THREE.SphereGeometry(0.075 * k, 10, 8);
        hp.add(H2(place(g, Math.sin(a) * hr * 0.98, hh * (hs === 'spiky' ? 1.05 : 0.9), Math.cos(a) * hr * 0.9 - 0.02 * k, hs === 'spiky' ? -0.7 : 0.3, 0, -Math.sin(a) * 0.5, 1, hs === 'spiky' ? 1 : 0.6, hs === 'spiky' ? 1 : 0.7)));
      }
      if (hs === 'spiky') for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; hp.add(H2(place(new THREE.ConeGeometry(0.06 * k, 0.18 * k, 6), Math.sin(a) * hr * 0.6, hh * 1.12, Math.cos(a) * hr * 0.6 - 0.02 * k, Math.cos(a) * 0.7, 0, -Math.sin(a) * 0.7))); }
      if (hs === 'curly') for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? 0.55 : 0.85; hp.add(H2(place(new THREE.SphereGeometry(0.085 * k, 10, 8), Math.sin(a) * hr * rr, hh * (1.04 + (i % 3) * 0.02), Math.cos(a) * hr * rr - 0.01 * k))); }
    }
    if (hs === 'bun') hp.add(H2(place(new THREE.SphereGeometry(0.1 * k, 14, 10), 0, hh * 1.0, -hr * 0.85)));
    if (hs === 'ponytail') { hp.add(H2(place(new THREE.CapsuleGeometry(0.065 * k, 0.28 * k, 4, 10), 0, hh * 0.45, -hr * 1.2, 0.3))); hp.add(paint(place(new THREE.TorusGeometry(0.06 * k, 0.02 * k, 6, 12), 0, hh * 0.72, -hr * 1.08, Math.PI / 2 + 0.3), L.hairTie || '#d42f2f')); }
    if (hs === 'long') { const lg = rbox(hr * 2.1, hh * 1.05, 0.12 * k, 0.05 * k); hp.add(H2(place(lg, 0, hh * 0.28, -hr * 0.82))); for (const s of [-1, 1]) hp.add(H2(place(rbox(0.07 * k, hh * 0.8, 0.12 * k, 0.03 * k), s * hr * 1.0, hh * 0.3, -0.02 * k))); }
    if (hs === 'braids') for (const s of [-1, 1]) { for (let i = 0; i < 4; i++) hp.add(H2(place(new THREE.SphereGeometry(0.05 * k, 10, 8), s * hr * 1.0, hh * (0.45 - i * 0.16), -0.05 * k, 0, 0, 0, 1, 1.3, 1))); hp.add(paint(place(new THREE.SphereGeometry(0.03 * k, 8, 6), s * hr * 1.0, hh * -0.15, -0.05 * k), L.hairTie || '#d42f2f')); }
  }
  const HT = (g, c, rect = R.white) => hp.add(paint(g, c, rect));
  const top = hh;
  if (L.headband) HT(place(new THREE.CylinderGeometry(hr * 1.1, hr * 1.1, 0.06 * k, 24, 1, true), 0, hh * 0.8, 0), L.headband, R.cloth);
  if (L.kerchief) { HT(place(new THREE.SphereGeometry(hr * 1.14, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), 0, hh * 0.6, -0.01 * k), L.kerchief, R.cloth); HT(place(new THREE.ConeGeometry(0.1 * k, 0.16 * k, 4), 0, hh * 0.5, -hr * 1.1, -0.6), L.kerchief, R.cloth); }
  if (L.txapela) {
    // txapela: boina ancha, ligeramente ladeada, con el txertena (rabito)
    const tx = new THREE.SphereGeometry(hr * 1.36, 28, 12);
    HT(place(tx, 0.025 * k, top - 0.01 * k, -0.01 * k, 0, 0, -0.1, 1, 0.3, 1), L.txapela, R.knit);
    HT(place(new THREE.CylinderGeometry(hr * 1.04, hr * 1.06, 0.07 * k, 28, 1, true), 0, top - 0.05 * k, 0), shade(L.txapela, -0.15), R.knit);
    HT(place(new THREE.CylinderGeometry(0.012 * k, 0.006 * k, 0.07 * k, 6), 0.03 * k, top + hr * 0.42, 0), L.txapela);
  }
  const hc = L.hatColor || '#c23b3b';
  if (L.hat === 'straw') { HT(place(new THREE.CylinderGeometry(hr * 2.1, hr * 2.15, 0.03 * k, 32), 0, top - 0.02 * k, 0), '#e2c46a', R.straw); HT(place(new THREE.CylinderGeometry(hr * 1.05, hr * 1.12, 0.16 * k, 24), 0, top + 0.06 * k, 0), '#e2c46a', R.straw); HT(place(new THREE.CylinderGeometry(hr * 1.13, hr * 1.13, 0.04 * k, 24, 1, true), 0, top + 0.01 * k, 0), L.hatBand || '#2b2630'); }
  if (L.hat === 'mitre') {
    const m = new THREE.ConeGeometry(hr * 1.05, 0.55 * k, 4, 1); m.rotateY(Math.PI / 4);
    HT(place(m, 0, top + 0.26 * k, 0, 0, 0, 0, 1, 1, 0.62), '#f4efe0', R.cloth);
    HT(place(rbox(0.05 * k, 0.48 * k, hr * 1.35, 0.01 * k), 0, top + 0.2 * k, 0), '#e8c34a', R.metal);
    HT(place(rbox(hr * 2.2, 0.05 * k, hr * 1.35, 0.01 * k), 0, top + 0.02 * k, 0), '#e8c34a', R.metal);
    HT(place(new THREE.SphereGeometry(0.035 * k, 8, 6), 0, top + 0.12 * k, hr * 0.72), '#b8232a');
  }
  if (L.hat === 'bicorne') { const b = new THREE.CylinderGeometry(hr * 1.9, hr * 1.9, 0.09 * k, 3, 1); HT(place(b, 0, hh * 1.02, 0, 0, Math.PI / 2, 0, 1.1, 1, 0.45), '#1a1a1a', R.cloth); HT(place(new THREE.SphereGeometry(hr * 0.92, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, hh * 0.95, 0), '#1a1a1a', R.cloth); HT(place(new THREE.SphereGeometry(0.07 * k, 10, 8), hr * 0.45, hh * 1.14, hr * 0.5), '#c0392b'); HT(place(new THREE.TorusGeometry(hr * 1.4, 0.015 * k, 5, 3), 0, hh * 1.06, 0, Math.PI / 2, 0, 0, 1.1, 0.45, 1), '#d6b44a'); }
  if (L.hat === 'cone') { HT(place(new THREE.ConeGeometry(hr * 1.15, 0.75 * k, 16), 0, top + 0.37 * k, 0), hc, R.cloth); for (let i = 0; i < 8; i++) HT(place(rbox(0.035 * k, 0.55 * k, 0.01 * k, 0.004 * k), Math.sin(i * 0.8) * 0.1 * k, top + 0.25 * k, Math.cos(i * 0.8) * 0.1 * k - 0.06 * k, 0.35), ['#e03c3c', '#f2c230', '#3a8fd6', '#3ca05a'][i % 4]); HT(place(new THREE.SphereGeometry(0.06 * k, 8, 6), 0, top + 0.76 * k, 0), '#f2c230'); }
  if (L.hat === 'mask') { HT(place(new THREE.CylinderGeometry(hr * 1.06, hr * 1.06, hh * 0.9, 24, 1, true, -Math.PI * 0.35, Math.PI * 0.7), 0, hh * 0.5, 0), L.maskColor || '#f1e7d6'); HT(place(new THREE.ConeGeometry(hr * 1.15, 0.5 * k, 14), 0, top + 0.25 * k, 0), hc, R.cloth); }
  if (L.hat === 'basket') {
    // cesto (momotxorro): cesta invertida con cuernos
    HT(place(new THREE.CylinderGeometry(hr * 1.15, hr * 1.35, 0.3 * k, 18, 2, true), 0, top + 0.05 * k, 0), '#b08650', R.straw);
    HT(place(new THREE.CircleGeometry(hr * 1.15, 18), 0, top + 0.2 * k, 0, -Math.PI / 2), '#b08650', R.straw);
  }
  if (L.hat === 'wool') { HT(place(new THREE.SphereGeometry(hr * 1.15, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), 0, hh * 0.72, 0), hc, R.knit); HT(place(new THREE.SphereGeometry(0.07 * k, 10, 8), 0, hh * 1.33, 0), '#ffffff', R.knit); }
  if (L.hat === 'crown' || L.crown) { const cr = new THREE.CylinderGeometry(hr * 1.02, hr * 1.02, 0.12 * k, 8, 1, true); HT(place(cr, 0, top + 0.04 * k, 0), '#e8c34a', R.metal); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; HT(place(new THREE.ConeGeometry(0.03 * k, 0.08 * k, 4), Math.sin(a) * hr, top + 0.14 * k, Math.cos(a) * hr), '#e8c34a', R.metal); } }
  if (L.horns) for (const s of [-1, 1]) { const hg = new THREE.ConeGeometry(0.06 * k, 0.5 * k, 10, 4); const hpp = hg.attributes.position; for (let i = 0; i < hpp.count; i++) { const yy = hpp.getY(i) / (0.5 * k) + 0.5; hpp.setX(i, hpp.getX(i) + yy * yy * 0.12 * k); } hg.computeVertexNormals(); HT(place(hg, s * hr * 1.1, top + 0.18 * k + (L.hat === 'basket' ? 0.18 * k : 0), 0, 0, s < 0 ? Math.PI : 0, -s * 0.7), '#efe4c6'); }
  if (L.helmet) HT(place(new THREE.SphereGeometry(hr * 1.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0, hh * 0.72, 0), L.helmet, R.metal);
  if (L.hood) { HT(place(new THREE.SphereGeometry(hr * 1.25, 20, 12, Math.PI * 0.2, Math.PI * 1.6, 0, Math.PI * 0.7), 0, hh * 0.55, -0.01 * k, 0, Math.PI, 0), L.hood, R.cloth); }
  const hmm = hp.mesh(atlas); if (hmm) head.add(hmm);
  // parpadeo y boca: compatibilidad con código antiguo
  J.mouth = new THREE.Object3D(); head.add(J.mouth);
  J.lids = new THREE.Object3D(); J.lids.visible = false; head.add(J.lids);

  // --- accesorios en las manos ---
  const RH = J.elbowR, LH = J.elbowL;
  const acc = (parent, fn) => { const p = P(); fn(p); const m = p.mesh(atlas); m.rotation.x = 0.55; parent.add(m); return m; };
  const woodC = '#8a5a32', metalC = '#b7bcc2';
  if (L.staff) { acc(RH, p => { p.add(paint(place(new THREE.CylinderGeometry(0.028 * k, 0.03 * k, 1.5 * k, 8), 0, 0.02 * k, 0), woodC, R.wood)); if (L.staff === 'crook') p.add(paint(place(new THREE.TorusGeometry(0.09 * k, 0.028 * k, 6, 14, Math.PI * 1.2), 0.09 * k, 0.76 * k, 0), woodC, R.wood)); }); J.staff = true; }
  if (L.crozier) { acc(RH, p => { p.add(paint(place(new THREE.CylinderGeometry(0.028 * k, 0.028 * k, 1.8 * k, 8), 0, 0.25 * k, 0), '#e8c34a', R.metal)); p.add(paint(place(new THREE.TorusGeometry(0.12 * k, 0.028 * k, 6, 16, Math.PI * 1.5), 0.12 * k, 1.15 * k, 0), '#e8c34a', R.metal)); }); J.staff = true; }
  if (L.axe) { const ax = new THREE.Group(); ax.position.set(0, -0.07 * k, 0); RH.add(ax); acc(ax, p => { p.add(paint(place(new THREE.CylinderGeometry(0.028 * k, 0.03 * k, 0.9 * k, 8), 0, 0.3 * k, 0), woodC, R.wood)); const blade = new THREE.Shape(); blade.moveTo(0, -0.08 * k); blade.lineTo(0.2 * k, -0.14 * k); blade.quadraticCurveTo(0.24 * k, 0, 0.2 * k, 0.14 * k); blade.lineTo(0, 0.08 * k); blade.closePath(); const bg = new THREE.ExtrudeGeometry(blade, { depth: 0.03 * k, bevelEnabled: false }); bg.translate(0, 0, -0.015 * k); p.add(paint(place(bg, 0.02 * k, 0.66 * k, 0), metalC, R.metal)); }); J.tool = ax; }
  if (L.fork) { acc(RH, p => { p.add(paint(place(new THREE.CylinderGeometry(0.025 * k, 0.025 * k, 1.5 * k, 8), 0, 0.2 * k, 0), woodC, R.wood)); for (const x of [-0.07, 0, 0.07]) p.add(paint(place(new THREE.CylinderGeometry(0.012 * k, 0.006 * k, 0.28 * k, 5), x * k, 1.06 * k, 0), metalC, R.metal)); p.add(paint(place(rbox(0.18 * k, 0.03 * k, 0.03 * k, 0.01 * k), 0, 0.93 * k, 0), metalC, R.metal)); }); }
  if (L.ball) acc(LH, p => p.add(paint(place(new THREE.SphereGeometry(0.1 * k, 16, 12), 0, -0.1 * k, 0.02 * k), L.ball, R.leather)));
  if (L.bladder) acc(RH, p => { p.add(paint(place(new THREE.CylinderGeometry(0.02 * k, 0.02 * k, 0.6 * k, 6), 0, 0.2 * k, 0), woodC, R.wood)); p.add(paint(place(new THREE.SphereGeometry(0.15 * k, 14, 10), 0, 0.56 * k, 0, 0, 0, 0, 1, 1.2, 1), '#e8d9a0', R.leather)); });
  if (L.basket) acc(LH, p => { p.add(paint(place(new THREE.CylinderGeometry(0.17 * k, 0.12 * k, 0.18 * k, 14, 1, true), 0, -0.2 * k, 0.02 * k), '#b08650', R.straw)); p.add(paint(place(new THREE.TorusGeometry(0.14 * k, 0.015 * k, 5, 14, Math.PI), 0, -0.12 * k, 0.02 * k), '#8a6a3a', R.wood)); if (L.basketFill) p.add(paint(place(new THREE.SphereGeometry(0.14 * k, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0, -0.14 * k, 0.02 * k, 0, 0, 0, 1, 0.4, 1), L.basketFill)); });
  if (L.comb) acc(RH, p => p.add(paint(place(rbox(0.16 * k, 0.05 * k, 0.02 * k, 0.008 * k), 0, -0.08 * k, 0.03 * k), '#ffd24a', R.metal)));
  if (L.castanets) for (const e of [RH, LH]) acc(e, p => p.add(paint(place(new THREE.SphereGeometry(0.05 * k, 10, 8), 0, -0.08 * k, 0.03 * k, 0, 0, 0, 1, 0.5, 1), '#5a3a1e', R.wood)));
  if (L.glove) acc(RH, p => { const cs = new THREE.SphereGeometry(0.1 * k, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.8); p.add(paint(place(cs, 0, -0.1 * k, 0.03 * k, Math.PI * 0.5, 0, 0, 0.9, 1.6, 0.9), L.glove, R.leather)); });
  if (L.stick) acc(RH, p => p.add(paint(place(new THREE.CylinderGeometry(0.02 * k, 0.02 * k, 0.7 * k, 6), 0, 0.2 * k, 0), L.stick, R.wood)));
  if (L.handkerchief) acc(RH, p => p.add(paint(place(rbox(0.2 * k, 0.2 * k, 0.01 * k, 0.004 * k), 0, 0.08 * k, 0.03 * k, 0, 0, 0.4), L.handkerchief, R.cloth)));
  if (L.hammer) acc(RH, p => { p.add(paint(place(new THREE.CylinderGeometry(0.025 * k, 0.025 * k, 0.5 * k, 8), 0, 0.15 * k, 0), woodC, R.wood)); p.add(paint(place(rbox(0.1 * k, 0.1 * k, 0.22 * k, 0.01 * k), 0, 0.4 * k, 0), '#5d6066', R.metal)); });

  root.userData.J = J;
  root.userData.H = (D.legTop + D.hipH + D.torsoH + D.neckH + D.headH * big) * k + (hatOn ? 0.12 : 0);
  root.userData.look = L;
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return root;
}

// ---------- Animación compartida (jugador y vecinos) ----------
// Paso de péndulo invertido: con piernas rígidas la cadera baja al abrir el compás.
export class MinifigAnimator {
  constructor(root) {
    this.root = root; this.J = root.userData.J;
    this.L = root.userData.look || {};
    this.t = Math.random() * 10; this.phase = 0; this.walk = 0; this.run = 0; this.air = 0; this.lean = 0;
    this.blinkT = 1 + Math.random() * 3; this.talkT = 0; this.faceNow = 'open';
    this.headYaw = 0; this.headPitch = 0;
    this.legLen = D.legTop * (this.L.height ? this.L.height / 1.62 : 1) * S;
    this.act = 0; this.actKind = null; this.actDur = 0.5;
  }
  setFace(f) { if (this.faceNow === f) return; this.faceNow = f; const F = this.J.face; F.mat.map = F.tex[f]; }
  // s: { speed, grounded, turnRate, talking, wave, cheer, dance, lookYaw, lookPitch, staff, bent, carry }
  update(dt, s) {
    const J = this.J; this.t += dt;
    const speed = s.speed || 0;
    const moving = speed > 0.12;
    const tw = Math.min(1, speed / 1.0), tr = Math.max(0, Math.min(1, (speed - 3.6) / 2.4));
    this.walk += (tw - this.walk) * (1 - Math.exp(-10 * dt));
    this.run += (tr - this.run) * (1 - Math.exp(-6 * dt));
    this.air += (((s.grounded ?? true) ? 0 : 1) - this.air) * (1 - Math.exp(-14 * dt));
    const A = 0.42 + 0.36 * this.run;              // amplitud de zancada (rad)
    const L = this.legLen;
    // frecuencia ajustada a la velocidad para que los pies no patinen
    const cycleLen = 4 * L * Math.sin(A);
    const w = moving ? Math.min(2 * Math.PI * 3.3, speed * 2 * Math.PI / cycleLen) : 0;
    this.phase += w * dt;
    if (!moving) { // lleva el paso a la posición de reposo más cercana
      const target = Math.round(this.phase / Math.PI) * Math.PI;
      this.phase += (target - this.phase) * (1 - Math.exp(-8 * dt));
    }
    const ph = this.phase, sn = Math.sin(ph);
    const amp = A * this.walk;
    const th = sn * amp;
    // piernas
    let legL = th, legR = -th;
    // brazos (opuestos a las piernas); al correr se cierran y suben
    let armLx = -th * (1.0 + 0.4 * this.run) - this.run * 0.25, armRx = th * (1.0 + 0.4 * this.run) - this.run * 0.25;
    let armLz = -0.04 - this.walk * 0.04, armRz = 0.04 + this.walk * 0.04;
    // cuerpo: bajada por péndulo, rebote al correr, balanceo lateral
    let bodyY = -L * (1 - Math.cos(th)) + this.run * Math.abs(Math.cos(ph)) * 0.07;
    let bodyRoll = Math.sin(ph) * 0.045 * this.walk * (1 - this.run * 0.5);
    let hipsYaw = Math.sin(ph) * 0.12 * this.walk;
    let torsoYaw = -hipsYaw * 0.8, torsoPitch = 0.04 * this.walk + 0.16 * this.run;
    let headPitch = -torsoPitch * 0.7, headRoll = -bodyRoll * 0.8;
    // reposo: respiración, pequeños cambios de peso y mirada
    const idle = 1 - this.walk;
    torsoPitch += idle * Math.sin(this.t * 1.9) * 0.018;
    armLz -= idle * (0.05 + Math.sin(this.t * 1.9) * 0.02); armRz += idle * (0.05 + Math.sin(this.t * 1.9) * 0.02);
    const shift = Math.sin(this.t * 0.37) > 0.6 ? 1 : 0;
    bodyRoll += idle * shift * 0.03;
    legL += idle * shift * -0.05; legR += idle * shift * 0.03;
    let headYaw = idle * Math.sin(this.t * 0.45) * 0.25 + (s.lookYaw || 0);
    headPitch += s.lookPitch || 0;
    // en el aire
    if (this.air > 0.01) {
      const a = this.air;
      legL = legL * (1 - a) + a * -0.65; legR = legR * (1 - a) + a * 0.4;
      armLx = armLx * (1 - a) + a * -2.3; armRx = armRx * (1 - a) + a * -2.1;
      armLz -= a * 0.4; armRz += a * 0.4;
      bodyY *= (1 - a);
    }
    if (s.bent) { torsoPitch += s.bent; headPitch -= s.bent * 0.6; }
    // hablar: boca y gestos
    if (s.talking > 0) {
      this.talkT += dt;
      armRx = -0.5 + Math.sin(this.t * 3.1) * 0.35; armRz = 0.25 + Math.sin(this.t * 2.3) * 0.1;
      armLx = -0.2 + Math.sin(this.t * 2.2 + 1) * 0.2;
      headRoll += Math.sin(this.t * 2.2) * 0.06; headPitch += Math.sin(this.t * 3.7) * 0.04;
    }
    if (s.carry) { armLx = -0.9; armRx = -0.9; armLz = 0.25; armRz = -0.25; }
    if (s.wave > 0) { armRz = 2.5 + Math.sin(this.t * 12) * 0.35; armRx = -0.1; }
    if (s.cheer > 0) {
      armLx = -2.9 - Math.sin(this.t * 12) * 0.25; armRx = -2.9 + Math.sin(this.t * 12) * 0.25; armLz = -0.3; armRz = 0.3;
      bodyY = Math.abs(Math.sin(this.t * 9)) * 0.22; legL = -0.25 * Math.abs(Math.sin(this.t * 9)); legR = -legL;
    }
    if (s.dance) {
      const b = this.t * s.dance;
      armLz = -2.1 + Math.sin(b) * 0.4; armRz = 2.1 + Math.sin(b + 1) * 0.4; armLx = armRx = 0;
      legL = Math.max(0, Math.sin(b)) * -0.7; legR = Math.max(0, -Math.sin(b)) * -0.7;
      bodyY = Math.abs(Math.sin(b)) * 0.16; bodyRoll = Math.sin(b) * 0.08; headRoll = -bodyRoll;
    }
    if (this.act > 0) {
      this.act -= dt;
      const p = 1 - Math.max(0, this.act) / this.actDur; // 0→1
      const K = this.actKind;
      if (K === 'chop' || K === 'hammer') { const sw = p < 0.5 ? -2.8 * (p / 0.5) : -2.8 + 3.2 * Math.min(1, (p - 0.5) / 0.15); armRx = sw; armLx = sw; armLz = 0.25; armRz = -0.25; torsoPitch += p > 0.5 ? 0.25 : -0.1; }
      else if (K === 'lift') { const up = Math.sin(Math.min(1, p) * Math.PI); armRx = armLx = -1.2 - 1.8 * up; bodyY = -0.1 + up * 0.08; legL = -0.25; legR = 0.25; torsoPitch += 0.3 * (1 - up); }
      else if (K === 'pick') { const d = Math.sin(Math.min(1, p) * Math.PI); torsoPitch += 0.8 * d; armRx = armLx = -0.8 - 0.6 * d; bodyY = -0.08 * d; headPitch -= 0.3 * d; }
      else if (K === 'throw') { armRx = p < 0.4 ? 0.8 * (p / 0.4) : 0.8 - 3.4 * Math.min(1, (p - 0.4) / 0.2); torsoYaw += 0.3 * Math.sin(p * Math.PI); }
      else if (K === 'look') { armRx = armLx = -1.6; armRz = -0.4; armLz = 0.4; headPitch -= 0.1; }
      else if (K === 'point') { armRx = -1.5; armRz = 0.1; }
      else if (K === 'pray') { armRx = armLx = -1.1; armRz = -0.4; armLz = 0.4; headPitch += 0.25; }
      else if (K === 'kick') { legR = -1.2 * Math.sin(p * Math.PI); armLx = 0.6 * Math.sin(p * Math.PI); }
    }
    if (s.staff || J.staff) { armRx = Math.max(-0.8, Math.min(armRx, -0.15)); armRz = 0.05; }
    // giro: inclinación hacia dentro de la curva
    this.lean += (Math.max(-0.2, Math.min(0.2, -(s.turnRate || 0) * speed * 0.025)) - this.lean) * (1 - Math.exp(-6 * dt));
    // aplicar
    J.legL.rotation.x = legL; J.legR.rotation.x = legR;
    J.armL.rotation.x = armLx; J.armR.rotation.x = armRx;
    J.armL.rotation.z = armLz; J.armR.rotation.z = armRz;
    J.elbowL.rotation.y = -Math.sin(ph) * 0.3 * this.walk; J.elbowR.rotation.y = Math.sin(ph) * 0.3 * this.walk;
    J.body.position.y = bodyY;
    J.body.rotation.z = bodyRoll + this.lean;
    J.hips.rotation.y = hipsYaw;
    J.torso.rotation.set(torsoPitch, torsoYaw, 0);
    this.headYaw += (Math.max(-1.1, Math.min(1.1, headYaw)) - this.headYaw) * (1 - Math.exp(-6 * dt));
    J.head.rotation.set(headPitch, this.headYaw, headRoll);
    if (J.bell) J.bell.rotation.z = Math.sin(ph * 2) * 0.35 * this.walk;
    // cara: parpadeo y habla
    this.blinkT -= dt;
    if (this.blinkT < -0.12) this.blinkT = 2 + Math.random() * 3.5;
    let f = this.blinkT < 0 ? 'blink' : 'open';
    if (s.talking > 0 && f === 'open') f = (Math.sin(this.t * 17) + Math.sin(this.t * 11)) > 0.3 ? 'talk' : 'open';
    this.setFace(f);
  }
  doAct(kind, t = 0.5) { this.actKind = kind; this.act = t; this.actDur = t; }
}

// ---------- Trajes de los nueve personajes jugables ----------
export const COSTUMES = {
  aizkolari: { skin: '#e6b48f', hair: '#3b2418', hairStyle: 'short', shirt: '#f4f1ea', pants: '#f4f1ea', sash: '#d42f2f', shoes: '#f0ead8', espadrille: true, socks: '#f4f1ea', laces: '#1d1d24', axe: true, face: 'brave', stubble: true, txapela: '#1d1d24' },
  harrijasotzaile: { skin: '#d9a57f', hair: '#2a1a12', hairStyle: 'short', beard: '#2a1a12', headband: '#d42f2f', shirt: '#1d1d24', print: 'singlet', shortSleeves: true, sleeves: '#1d1d24', pants: '#f4f1ea', sash: '#1d1d24', shoes: '#4a2f1c', build: 1.14, face: 'brave' },
  momotxorro: { skin: '#e2b08a', hair: '#1a1a1a', beard: '#1a1a1a', shirt: '#f2eee6', print: 'sheet', pants: '#2b3a6b', shoes: '#4a2f1c', fur: '#7a5a34', horns: true, hat: 'basket', fork: true, face: 'angry', facePaint: 'soot', bells: true },
  'san-fermin': { skin: '#efc8a8', hair: '#6b4a2e', hairStyle: 'short', shirt: '#b8232a', print: 'bishop', pants: '#f4efe0', skirt: '#f4efe0', cape: '#8f1a20', hat: 'mitre', crozier: true, shoes: '#b8232a', face: 'smile', old: true, beard: '#8a7a6a', gloves: '#f4efe0' },
  pelotari: { skin: '#eac1a0', hair: '#2a1a12', hairStyle: 'ponytail', lashes: true, shirt: '#f4f1ea', print: 'jersey', number: '7', pants: '#f4f1ea', sash: '#d42f2f', shoes: '#f4f1ea', glove: '#8a5a32', face: 'brave', collar: 'round', placket: false },
  sanferminero: { skin: '#eac1a0', hair: '#3b2418', hairStyle: 'spiky', shirt: '#f4f1ea', pants: '#f4f1ea', sash: '#d42f2f', scarf: '#d42f2f', shoes: '#f4f1ea', espadrille: true, laces: '#d42f2f', face: 'happy', freckles: true, handkerchief: '#d42f2f' },
  rojilla: { skin: '#d9a57f', hair: '#2a1a12', hairStyle: 'curly', lashes: true, shirt: '#d4002a', print: 'rojilla', number: '10', pants: '#1c2a4a', socks: '#d4002a', longSocks: true, shoes: '#1d1d24', ball: '#ffffff', face: 'happy' },
  caravinagre: { skin: '#eab89a', hair: '#dcd7cf', hairStyle: 'short', shirt: '#2f6b3a', print: 'coat', pants: '#f4f1ea', socks: '#f4f1ea', longSocks: true, shoes: '#1a1a1a', hat: 'bicorne', bigHead: true, bladder: true, face: 'angry', moustache: '#dcd7cf', moustacheCurl: true },
  'pastor-navarro': { skin: '#dba882', hair: '#2a1a12', beard: '#3a2a1a', txapela: '#1d1d24', shirt: '#efe9dc', pattern: 'check', pattern2: '#6a7a8a', vest: '#3a2a22', scarf: '#c0392b', scarfDots: true, pants: '#4a3f36', kneePatch: true, shoes: '#4a2f1c', boots: true, staff: 'crook', strap: '#6a4a2a', bag: '#8a6a3a', face: 'smile', old: true },
};

// Convierte el "look" antiguo de los vecinos al estilo de bloques (con detalle añadido)
export function lookToMinifig(l) {
  const hairStyle = l.hairStyle || (l.bun ? 'bun' : l.braids ? 'braids' : l.longHair ? 'long' : l.messy ? 'spiky' : l.bald ? 'bald' : l.ponytail ? 'ponytail' : 'short');
  const hat = ['mask', 'straw', 'cone', 'wool', 'crown', 'basket', 'mitre', 'bicorne'].includes(l.hat) ? l.hat : null;
  const female = !!(l.skirt || l.bun || l.braids || l.longHair || l.female);
  return {
    ...l,
    skin: l.skin || '#f1c7a5', hair: l.hair, hairStyle, shirt: l.shirt || '#e8e0cc', sleeves: l.sleeves, pants: l.pants || (l.skirt ? '#2b2630' : '#3b3a40'), skirt: l.skirt,
    shoes: l.shoes, socks: l.socks, vest: l.vest, sash: l.sash, scarf: l.scarf, apron: l.apron, txapela: l.txapela, hat, hatColor: l.hatColor, kerchief: l.kerchief,
    beard: l.beard, moustache: l.moustache, fur: l.fur, staff: l.staff, basket: l.basket, comb: l.comb, bell: l.bell, castanets: l.castanets,
    ribbons: l.ribbons, crown: l.crown, shortSleeves: l.shortSleeves, gloves: l.gloves, height: l.height ? Math.max(1.25, l.height * 0.95) : undefined, build: l.build,
    face: l.face || (l.fur ? 'angry' : undefined), horns: l.horns, lashes: female, print: l.print || (female && !l.apron && !l.vest ? 'blouse' : undefined), bodice: l.bodice,
    pattern: l.pattern, pattern2: l.pattern2, old: l.old || (l.hair && /#(9|a|b|c|d|e)[0-9a-f]{5}/i.test(l.hair) && !l.child), glasses: l.glasses, strap: l.strap, bag: l.bag,
    espadrille: l.espadrille, laces: l.laces, boots: l.boots, hammer: l.hammer, stick: l.stick, freckles: l.freckles, stubble: l.stubble, shawl: l.shawl, bells: l.bells, facePaint: l.facePaint,
  };
}

// ---------- Rig del jugador (misma interfaz que el antiguo protagonista) ----------
export class MinifigRig {
  constructor(look) {
    this.obj = new THREE.Group();
    this.inner = buildMinifig(look, { hero: true });
    this.obj.add(this.inner);
    this.J = this.inner.userData.J;
    this.anim = new MinifigAnimator(this.inner);
    this.wave = 0; this.cheer = 0; this.talking = 0;
  }
  update(dt, speed, grounded, turnRate) {
    if (this.wave > 0) this.wave -= dt;
    if (this.cheer > 0) this.cheer -= dt;
    if (this.talking > 0) this.talking -= dt;
    this.anim.update(dt, { speed, grounded, turnRate, wave: this.wave, cheer: this.cheer, talking: this.talking, carry: this.carry });
  }
  doWave() { this.wave = 1.2; }
  doCheer() { this.cheer = 2; }
  doAct(kind, t = 0.5) { this.anim.doAct(kind, t); }
}
