// Láminas de naturalista para las fichas de flora: cada planta dibujada a mano alzada (en un canvas 2D) a partir de su
// descripción («m» en src/data/flora.js): la forma de la copa, la corteza, el color de las hojas en dos tonos, la flor,
// el fruto. Estilo de acuarela sobre papel: manchas que se solapan con luz desde arriba a la izquierda, sombra suave en
// el suelo y matas de hierba. Sustituye en las fichas al retrato del modelo 3D, que en tan poco tamaño se veía tosco.
//   floraIllustration(id, w, h) → dataURL (se guarda: cada lámina se dibuja una vez)
import { FLORA } from '../data/flora.js';

const CACHE = new Map();
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// mezcla de dos colores (#rrggbb) y aclarar u oscurecer
const hex = (c) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const shade = (c, k) => mix(c, k > 0 ? '#ffffff' : '#000000', Math.abs(k));
const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };

function paper(g, W, H, r) {
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#f6f1e2'); bg.addColorStop(1, '#ece2c8'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // grano del papel
  for (let i = 0; i < W * H / 260; i++) { g.fillStyle = `rgba(120,96,60,${0.025 + r() * 0.03})`; g.fillRect(r() * W, r() * H, 1 + r() * 1.5, 1 + r() * 1.5); }
  const v = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.45, Math.max(W, H) * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(90,70,40,.18)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
}
// el suelo (sombra y matas de hierba) no se dibuja con la planta: se apunta dónde va y se pinta después, ya encuadrado,
// con su propio azar para que la planta salga igual en las dos pasadas
let GROUND = null;
function ground(g, cx, gy, w, r, tint = '#7a9a4a') { GROUND = { cx, gy, w, tint }; }
function drawGround(g, cx, gy, w, r, tint) {
  const s = g.createRadialGradient(cx, gy, 2, cx, gy, w); s.addColorStop(0, 'rgba(60,50,30,.35)'); s.addColorStop(1, 'rgba(60,50,30,0)');
  g.save(); g.translate(cx, gy); g.scale(1, 0.18); g.beginPath(); g.arc(0, 0, w, 0, Math.PI * 2); g.restore(); g.fillStyle = s; g.fill();
  for (let i = 0; i < 54; i++) { const x = cx + (r() - 0.5) * w * 2.1, h = 4 + r() * 12, lean = (r() - 0.5) * 6; g.strokeStyle = rgba(shade(tint, (r() - 0.5) * 0.4), 0.75); g.lineWidth = 1 + r(); g.beginPath(); g.moveTo(x, gy + (r() - 0.5) * 6); g.quadraticCurveTo(x + lean * 0.4, gy - h * 0.6, x + lean, gy - h); g.stroke(); }
}
// una mancha de follaje: contorno curvo e irregular (no un polígono), luz arriba-izquierda, un trazo de tinta muy suave
// y hojitas que asoman por el borde iluminado
function blob(g, x, y, rad, col, r, alpha = 1) {
  const gr = g.createRadialGradient(x - rad * 0.35, y - rad * 0.4, rad * 0.1, x, y, rad * 1.05);
  gr.addColorStop(0, rgba(shade(col, 0.28), alpha)); gr.addColorStop(0.6, rgba(col, alpha)); gr.addColorStop(1, rgba(shade(col, -0.28), alpha));
  const n = 11, P = []; for (let i = 0; i < n; i++) { const a = (i + r() * 0.4) / n * Math.PI * 2, rr = rad * (0.8 + r() * 0.32); P.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.9]); }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  g.beginPath(); let m0 = mid(P[n - 1], P[0]); g.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const q = P[i], m = mid(q, P[(i + 1) % n]); g.quadraticCurveTo(q[0], q[1], m[0], m[1]); }
  g.closePath(); g.fillStyle = gr; g.fill();
  g.strokeStyle = rgba(shade(col, -0.5), 0.16 * alpha); g.lineWidth = 1; g.stroke();
  for (let k = 0; k < 5; k++) { const a = -Math.PI * (0.25 + r() * 0.7), ex = x + Math.cos(a) * rad * 0.95, ey = y + Math.sin(a) * rad * 0.86;
    g.fillStyle = rgba(shade(col, 0.2 + r() * 0.12), alpha); g.beginPath(); g.ellipse(ex, ey, rad * 0.16, rad * 0.07, a + (r() - 0.5) * 0.8, 0, Math.PI * 2); g.fill(); }
}
// matas de hoja menuda (tomillo, romero, ontina, espliego): una cúpula suave y cientos de hojitas en trazo corto
function fineMound(g, cx, base, w, h, c1, c2, r, n = 420, upright = false) {
  // el hueco de sombra de dentro de la mata, sin borde (las hojitas de encima hacen el contorno)
  g.save(); g.translate(cx, base); g.scale(w / 2, h); const gr = g.createRadialGradient(0, -0.2, 0, 0, -0.2, 1);
  gr.addColorStop(0, rgba(shade(c1, -0.45), 0.95)); gr.addColorStop(0.65, rgba(shade(c1, -0.35), 0.75)); gr.addColorStop(1, rgba(shade(c1, -0.3), 0));
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, Math.PI, 0); g.closePath(); g.fill(); g.restore();
  if (upright) for (let i = 0; i < 18; i++) { const t = (i / 17 - 0.5); branch(g, cx + t * w * 0.2, base, cx + t * w * 0.85, base - h * (0.75 + r() * 0.3), 1.6, rgba(shade(c1, -0.4), 0.8)); }
  for (let i = 0; i < n * 2.6; i++) { const a = Math.PI + r() * Math.PI, d = Math.pow(r(), 0.4) * 1.04, x = cx + Math.cos(a) * d * w / 2, y = base + Math.sin(a) * d * h;
    const lit = Math.max(0, Math.min(1, 0.55 - (x - cx) / w * 0.6 - (y - base + h / 2) / h * 0.5)), ang = upright ? -Math.PI / 2 + (x - cx) / w * 1.4 + (r() - 0.5) * 0.9 : a + (r() - 0.5) * 1.4;
    g.strokeStyle = rgba(mix(shade(c1, -0.3), shade(c2, 0.15), Math.min(1, lit * 1.1 + r() * 0.3)), 0.95); g.lineWidth = 2 + r() * 1.4; g.lineCap = 'round';
    const L = 5 + r() * 7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * L, y + Math.sin(ang) * L); g.stroke(); }
}
function leafDabs(g, x, y, rad, col, r, n = 14) {
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = r() * rad, lx = x + Math.cos(a) * d, ly = y + Math.sin(a) * d * 0.9;
    g.fillStyle = rgba(shade(col, (r() - 0.3) * 0.5), 0.55); g.beginPath(); g.ellipse(lx, ly, 2 + r() * 3, 1.2 + r() * 1.6, r() * Math.PI, 0, Math.PI * 2); g.fill(); }
}
function trunk(g, x0, y0, x1, y1, w0, w1, col, r, twist = 0) {
  const mx = (x0 + x1) / 2 + twist * 18, my = (y0 + y1) / 2;
  const gr = g.createLinearGradient(x0 - w0, 0, x0 + w0, 0); gr.addColorStop(0, shade(col, 0.22)); gr.addColorStop(0.55, col); gr.addColorStop(1, shade(col, -0.35));
  g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - w0, y0); g.quadraticCurveTo(mx - (w0 + w1) / 2, my, x1 - w1, y1); g.lineTo(x1 + w1, y1); g.quadraticCurveTo(mx + (w0 + w1) / 2, my, x0 + w0, y0); g.closePath(); g.fill();
  // raíces y corteza
  g.fillStyle = shade(col, -0.15); g.beginPath(); g.moveTo(x0 - w0 * 1.7, y0); g.quadraticCurveTo(x0 - w0, y0 - 8, x0 - w0 * 0.6, y0 - 16); g.lineTo(x0 + w0 * 0.6, y0 - 16); g.quadraticCurveTo(x0 + w0, y0 - 8, x0 + w0 * 1.7, y0); g.closePath(); g.fill();
  g.strokeStyle = rgba(shade(col, -0.45), 0.5); g.lineWidth = 1;
  for (let i = 0; i < 9; i++) { const t = r(), yy = y0 + (y1 - y0) * t, xx = x0 + (x1 - x0) * t + (r() - 0.5) * w0; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + (r() - 0.5) * 2, yy - 8 - r() * 14); g.stroke(); }
}
function branch(g, x0, y0, x1, y1, w, col) { g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + (y1 - y0) * 0.1, (y0 + y1) / 2, x1, y1); g.stroke(); }

// ------------------------------------------------------------------ árboles
function tree(g, W, H, m, r) {
  const gy = H * 0.9, cx = W * 0.5, scale = Math.min((H * 0.8) / Math.max(m.h, 6), (W * 0.82) / Math.max(m.cw || 8, 4));
  const cw = (m.cw || 8) * scale, chh = (m.ch || 7) * scale, top = gy - m.h * scale, crownY = top + chh / 2;
  const tw = Math.max(5, (m.tr || 0.3) * scale * 0.9);
  ground(g, cx, gy, Math.max(cw * 0.6, 60), r);
  const c1 = m.c1, c2 = m.c2, bark = m.trunk || '#6a5a48';
  const crown = m.crown;
  // tronco y ramas (se ven a través de las copas abiertas)
  if (m.stems) { for (let i = 0; i < m.stems; i++) { const a = (i / (m.stems - 1) - 0.5) * 0.9; branch(g, cx + (i - m.stems / 2) * 4, gy, cx + Math.sin(a) * cw * 0.4, crownY + chh * 0.1, 4, shade(bark, -0.1)); } }
  else if (crown === 'umbrella') {
    trunk(g, cx, gy, cx + (m.twist ? 14 : 4), top + chh * 0.55, tw, tw * 0.55, m.top ? mix(bark, m.top, 0.5) : bark, r, m.twist ? 0.6 : 0);
    for (const s of [-1, 1]) for (let k = 0; k < 2; k++) branch(g, cx + 4, top + chh * (0.9 + k * 0.4), cx + s * cw * (0.25 + k * 0.12), top + chh * 0.35, Math.max(2, tw * 0.45), mix(bark, m.top || bark, 0.5));
  } else trunk(g, cx, gy, cx + (m.twist ? 10 : 0), crownY + chh * 0.15, tw, tw * 0.45, bark, r, m.twist ? 1 : 0);
  if (!m.stems && !['tiers', 'pinecone', 'column', 'umbrella'].includes(crown)) for (const s of [-1, 1]) branch(g, cx, crownY + chh * 0.3, cx + s * cw * 0.28, crownY - chh * 0.05, Math.max(2, tw * 0.45), shade(bark, -0.1));
  // copa: el contorno según la forma y manchas de follaje dentro, de atrás (oscuras) a delante (claras)
  const inside = (u, v) => {   // u, v en −1..1 respecto al centro de la copa
    switch (crown) {
      case 'column': return u * u + v * v < 1;
      case 'pinecone': return Math.abs(u) < (1 - (v + 1) / 2 * 0.0) * (0.25 + (v + 1) * 0.38) && v > -1;
      case 'umbrella': return u * u + (v * 2.2) * (v * 2.2) < 1;
      case 'irregular': return u * u + v * v < 1 - 0.18 * Math.sin(u * 7 + v * 3);
      case 'willow': return u * u + v * v < 1;
      default: return u * u + v * v < 1;
    }
  };
  if (crown === 'tiers') {
    // abeto: pisos de ramas en triángulo, de abajo arriba, cada uno más estrecho
    trunk(g, cx, gy, cx, top + 10, tw, 2, bark, r);
    const n = 9; for (let i = 0; i < n; i++) { const t = i / (n - 1), y = gy - chh * 0.1 - t * (chh * 0.95), hw = cw * 0.5 * (1 - t * 0.85), th = chh / n * 1.6;
      const gr = g.createLinearGradient(cx - hw, 0, cx + hw, 0); gr.addColorStop(0, shade(c2, 0.05)); gr.addColorStop(0.5, c1); gr.addColorStop(1, shade(c1, -0.35));
      g.fillStyle = gr; g.beginPath(); g.moveTo(cx - hw, y); for (let k = 0; k <= 8; k++) g.lineTo(cx - hw + (2 * hw) * k / 8, y + (k % 2 ? 6 : 0)); g.lineTo(cx, y - th); g.closePath(); g.fill(); }
    return;
  }
  const n = crown === 'airy' ? 34 : crown === 'dense' ? 70 : crown === 'column' ? 70 : 55, rad = crown === 'column' ? cw * 0.26 : Math.min(cw, chh) * (crown === 'airy' ? 0.16 : 0.2);
  const pts = []; for (let i = 0; i < n * 4 && pts.length < n; i++) { const u = r() * 2 - 1, v = r() * 2 - 1; if (inside(u, v)) pts.push([u, v]); }
  pts.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) < 0 ? 1 : -1);   // de abajo-derecha (sombra) a arriba-izquierda (luz)
  for (const [u, v] of pts) { const light = Math.max(0, Math.min(1, 0.5 - u * 0.35 - v * 0.4)), col = mix(shade(c1, -0.12), c2, light * 0.85);
    const x = cx + u * cw / 2, y = crownY + v * chh / 2; blob(g, x, y, rad * (0.75 + r() * 0.5), col, r, crown === 'airy' ? 0.85 : 1); leafDabs(g, x, y, rad, c2, r, 8); }
  if (crown === 'willow') for (let i = 0; i < 26; i++) { const x = cx + (r() - 0.5) * cw * 0.95, y = crownY + (r() - 0.2) * chh * 0.3; g.strokeStyle = rgba(mix(c1, c2, r()), 0.8); g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4, y + chh * 0.3, x + (r() - 0.5) * 8, y + chh * (0.45 + r() * 0.25)); g.stroke(); }
  if (m.fruit) for (let i = 0; i < 16; i++) { const p = pts[Math.floor(r() * pts.length)]; if (!p) break; const x = cx + p[0] * cw / 2 * 0.9, y = crownY + p[1] * chh / 2 * 0.9; g.fillStyle = m.fruit; g.beginPath(); g.arc(x, y, 2.8 + r() * 1.6, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(x - 1, y - 1, 1, 0, Math.PI * 2); g.fill(); }
}

// ------------------------------------------------------------------ arbustos
function shrub(g, W, H, m, r) {
  const gy = H * 0.86, cx = W * 0.5, scale = Math.min((H * 0.66) / Math.max(m.h, 0.4), (W * 0.78) / Math.max(m.w, 0.4)), w = m.w * scale, h = m.h * scale;
  ground(g, cx, gy, Math.max(w * 0.6, 60), r);
  const c1 = m.c1, c2 = m.c2, form = m.form;
  if (form === 'lavender') {
    for (let i = 0; i < 30; i++) { const a = -Math.PI / 2 + (i / 29 - 0.5) * 1.0 + (r() - 0.5) * 0.15, L = h * (0.65 + r() * 0.3), x0 = cx + (r() - 0.5) * w * 0.25, y0 = gy - h * 0.25, x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L;
      g.strokeStyle = shade(c1, -0.05); g.lineWidth = 1.3; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 6, x1, y1); g.stroke();
      for (let k = 0; k < 9; k++) { const f = k / 8, sx = x1 - Math.cos(a) * k * 3.2, sy = y1 - Math.sin(a) * k * 3.2, s2 = 3.4 - f * 0.8; g.fillStyle = shade(m.bloom, (r() - 0.5) * 0.3 - f * 0.15); g.beginPath(); g.ellipse(sx + (k % 2 ? 1.4 : -1.4), sy, s2, s2 * 0.7, a, 0, Math.PI * 2); g.fill(); } }
    fineMound(g, cx, gy, w * 0.9, h * 0.42, c1, c2, r, 420, true);
    return;
  }
  if (form === 'feather') {   // tamariz: plumeros rosados
    for (let i = 0; i < 6; i++) branch(g, cx + (i - 3) * 3, gy, cx + (i - 2.5) * w * 0.16, gy - h * 0.8, 3, '#7a4a3a');
    for (let i = 0; i < 40; i++) { const x = cx + (r() - 0.5) * w * 0.95, y = gy - h * (0.35 + r() * 0.6); blob(g, x, y, w * 0.08, mix(c1, c2, r()), r, 0.8); }
    for (let i = 0; i < (m.bloomN || 120) / 2; i++) { const x = cx + (r() - 0.5) * w * 0.9, y = gy - h * (0.45 + r() * 0.55); g.fillStyle = rgba(m.bloom, 0.7); g.beginPath(); g.ellipse(x, y, 2.5, 6, (r() - 0.5), 0, Math.PI * 2); g.fill(); }
    return;
  }
  // hoja menuda: tomillo, ontina, siempreviva (cojín) y romero (erguido)
  const fine = form === 'cushion' || (form === 'upright' && (m.bloomS || 1) < 0.03);
  if (fine) {
    fineMound(g, cx, gy, w, form === 'cushion' ? h * 1.05 : h, c1, c2, r, form === 'cushion' ? 520 : 640, form === 'upright');
    if (m.bloom) for (let i = 0; i < Math.min(90, (m.bloomN || 80) * 0.8); i++) { const a = Math.PI * (1.08 + r() * 0.84), d = 0.55 + r() * 0.45, x = cx + Math.cos(a) * d * w / 2, y = gy + Math.sin(a) * d * h * (form === 'cushion' ? 1.05 : 1), rr = form === 'upright' ? 3.4 : 4.2;
      g.fillStyle = shade(m.bloom, (r() - 0.5) * 0.25); g.beginPath(); for (let k = 0; k < 5; k++) { const b = k / 5 * Math.PI * 2; g.moveTo(x, y); g.ellipse(x + Math.cos(b) * rr * 0.6, y + Math.sin(b) * rr * 0.6, rr * 0.6, rr * 0.42, b, 0, Math.PI * 2); } g.fill();
      g.fillStyle = shade(m.bloom, -0.35); g.beginPath(); g.arc(x, y, 0.9, 0, Math.PI * 2); g.fill(); }
    return;
  }
  // silueta: forma general y manchas dentro
  const inside = (u, v) => form === 'cone' ? Math.abs(u) < (v + 1) / 2 * 0.95 + 0.05 : form === 'upright' ? u * u / 0.7 + v * v < 1 : form === 'cushion' ? u * u + (v * 1.4) ** 2 < 1 && v > -0.75 : u * u + v * v < 1 && v > -0.85;
  const cy = gy - h / 2, n = form === 'cushion' ? 40 : 60, rad = Math.min(w, h) * (form === 'cushion' ? 0.14 : 0.17);
  if (form === 'upright') for (let i = 0; i < 5; i++) branch(g, cx + (i - 2) * 3, gy, cx + (i - 2) * w * 0.1, cy, 3, '#5a4632');
  const pts = []; for (let i = 0; i < n * 4 && pts.length < n; i++) { const u = r() * 2 - 1, v = r() * 2 - 1; if (inside(u, v)) pts.push([u, v]); }
  pts.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) < 0 ? 1 : -1);
  for (const [u, v] of pts) { const light = Math.max(0, Math.min(1, 0.5 - u * 0.35 - v * 0.4)), x = cx + u * w / 2, y = cy + v * h / 2;
    blob(g, x, y, rad * (0.7 + r() * 0.5), mix(shade(c1, -0.1), c2, light * 0.8), r); leafDabs(g, x, y, rad, c2, r, 6); }
  if (form === 'spiky') for (let i = 0; i < 70; i++) { const u = r() * 2 - 1, v = r() * 2 - 1; if (!inside(u, v)) continue; const x = cx + u * w / 2, y = cy + v * h / 2, a = r() * Math.PI * 2; g.strokeStyle = rgba(shade(c1, -0.35), 0.7); g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); g.stroke(); }
  if (m.gloss) for (let i = 0; i < 30; i++) { const p = pts[Math.floor(r() * pts.length)]; g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(cx + p[0] * w / 2, cy + p[1] * h / 2, 3, 1.4, -0.5, 0, Math.PI * 2); g.fill(); }
  const dots = (col, N, s) => { for (let i = 0; i < N; i++) { const u = r() * 2 - 1, v = r() * 2 - 1; if (!inside(u * 1.02, v * 1.02) || u + v > 0.9) continue; const x = cx + u * w / 2, y = cy + v * h / 2, rr = Math.max(2, s * scale * 0.9);
    g.fillStyle = shade(col, (r() - 0.5) * 0.2); g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; g.ellipse(x + Math.cos(a) * rr * 0.55, y + Math.sin(a) * rr * 0.55, rr * 0.55, rr * 0.4, a, 0, Math.PI * 2); } g.fill();
    g.fillStyle = shade(col, -0.3); g.beginPath(); g.arc(x, y, rr * 0.25, 0, Math.PI * 2); g.fill(); } };
  if (m.bloom) dots(m.bloom, Math.min(70, (m.bloomN || 80) / 2.4), Math.max(m.bloomS || 0.04, 0.035));
  if (m.berry) for (let i = 0; i < Math.min(40, m.berryN || 40); i++) { const u = r() * 2 - 1, v = r() * 2 - 1; if (!inside(u, v)) continue; const x = cx + u * w / 2, y = cy + v * h / 2; g.fillStyle = m.berry; g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(x - 1, y - 1.2, 1, 0, Math.PI * 2); g.fill(); }
}

// ------------------------------------------------------------------ helecho
function fern(g, W, H, m, r) {
  const gy = H * 0.88, cx = W * 0.5; ground(g, cx, gy, 110, r);
  for (let f = 0; f < 9; f++) { const a = -Math.PI / 2 + (f / 8 - 0.5) * 2.2, L = H * (0.55 + r() * 0.2), bend = (f / 8 - 0.5) * 0.9;
    const pt = (t) => { const ang = a + bend * t * t; return [cx + Math.cos(a) * L * t * 0.4 + Math.sin(bend * t) * L * 0.5 * t * Math.sign(Math.cos(a) || 1) * 0 + Math.cos(ang) * L * t * 0.6, gy + Math.sin(ang) * L * t]; };
    g.strokeStyle = shade(m.c1, -0.2); g.lineWidth = 2; g.beginPath(); for (let k = 0; k <= 20; k++) { const [x, y] = pt(k / 20); g[k ? 'lineTo' : 'moveTo'](x, y); } g.stroke();
    for (let k = 2; k < 20; k++) { const t = k / 20, [x, y] = pt(t), [x2, y2] = pt(Math.min(1, t + 0.05)), ang = Math.atan2(y2 - y, x2 - x), len = 18 * (1 - t) + 3;
      for (const s of [-1, 1]) { g.fillStyle = mix(m.c1, m.c2, r() * 0.7 + t * 0.3); g.beginPath(); g.ellipse(x + Math.cos(ang + s * 1.3) * len * 0.5, y + Math.sin(ang + s * 1.3) * len * 0.5, len * 0.55, 2.6, ang + s * 1.3, 0, Math.PI * 2); g.fill(); } } }
}

// ------------------------------------------------------------------ flores
function petalsAround(g, x, y, n, len, wid, col, center, rot = 0, r = Math.random) {
  for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI * 2, px = x + Math.cos(a) * len * 0.55, py = y + Math.sin(a) * len * 0.55;
    const gr = g.createRadialGradient(x, y, 1, px, py, len); gr.addColorStop(0, shade(col, -0.12)); gr.addColorStop(1, shade(col, 0.15)); g.fillStyle = gr;
    g.beginPath(); g.ellipse(px, py, len * 0.55, wid, a, 0, Math.PI * 2); g.fill(); g.strokeStyle = rgba(shade(col, -0.35), 0.35); g.lineWidth = 0.8; g.stroke(); }
  if (center) { g.fillStyle = center; g.beginPath(); g.arc(x, y, Math.max(2.5, len * 0.28), 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x + (r() - 0.5) * len * 0.3, y + (r() - 0.5) * len * 0.3, 0.9, 0, Math.PI * 2); g.fill(); } }
}
function stemLeaf(g, x, y, ang, len, col) { const gr = g.createLinearGradient(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len); gr.addColorStop(0, shade(col, -0.15)); gr.addColorStop(1, shade(col, 0.15)); g.fillStyle = gr; g.beginPath(); g.ellipse(x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2, len / 2, len * 0.16, ang, 0, Math.PI * 2); g.fill(); g.strokeStyle = rgba(shade(col, -0.3), 0.6); g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * len * 0.9, y + Math.sin(ang) * len * 0.9); g.stroke(); }
function flower(g, W, H, m, r) {
  const gy = H * 0.88, cx = W * 0.5, form = m.form, leaf = m.leaf || '#4a7a34', P = m.petal, C = m.center;
  ground(g, cx, gy, 130, r, leaf);
  if (form === 'ground-star') {   // eguzkilore: roseta de hojas espinosas pegada al suelo y la gran flor plateada
    const y = gy - 22; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.save(); g.translate(cx, y); g.scale(1, 0.42); stemLeaf(g, 0, 0, a, 150, shade(leaf, (i % 2 ? -0.1 : 0.05))); g.restore(); }
    g.save(); g.translate(cx, y - 6); g.scale(1, 0.62); petalsAround(g, 0, 0, 30, 92, 8, P, null, 0, r); petalsAround(g, 0, 0, 22, 68, 7, shade(P, -0.08), null, 0.1, r);
    g.fillStyle = C; g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.fill(); for (let k = 0; k < 80; k++) { g.fillStyle = rgba(shade(C, (r() - 0.5) * 0.5), 0.9); g.beginPath(); g.arc((r() - 0.5) * 70, (r() - 0.5) * 70, 2, 0, Math.PI * 2); g.fill(); } g.restore();
    return;
  }
  const stems = Math.min(form === 'spike-bells' || form === 'thistle' || form === 'turban' ? 3 : 5, Math.max(2, m.n || 3));
  const tall = Math.min(H * 0.72, Math.max(H * 0.32, (m.stem || 0.3) * H * 1.2)), headR = form === 'daisy' ? 26 : form === 'cup' ? 24 : form === 'star' ? 28 : 22;
  // hojas de la base
  for (let i = 0; i < 9; i++) stemLeaf(g, cx + (r() - 0.5) * 40, gy - 2, -Math.PI / 2 + (r() - 0.5) * 2.4, 34 + r() * 30, shade(leaf, (r() - 0.5) * 0.2));
  for (let s = 0; s < stems; s++) {
    const t = stems > 1 ? s / (stems - 1) - 0.5 : 0, x0 = cx + t * 50, top = gy - tall * (0.75 + r() * 0.3), x1 = x0 + t * 70 + (r() - 0.5) * 20;
    g.strokeStyle = shade(leaf, -0.1); g.lineWidth = form === 'thistle' || form === 'spike-bells' ? 4 : 2.6; g.beginPath(); g.moveTo(x0, gy); g.quadraticCurveTo(x0 + t * 20, (gy + top) / 2, x1, top); g.stroke();
    if (tall > 90) stemLeaf(g, x0 + t * 10, gy - tall * 0.3, -Math.PI / 2 + (t < 0 ? -0.9 : 0.9), 30, leaf);
    switch (form) {
      case 'cup': case 'rosette': { const n = m.petals || 5; petalsAround(g, x1, top, n, headR * (form === 'rosette' ? 0.9 : 1), headR * 0.38 * (n <= 4 ? 1.5 : 1), P, C, r() * 1.5, r);
        if (m.stripes) for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; g.strokeStyle = rgba(shade(P, -0.4), 0.6); g.lineWidth = 1; g.beginPath(); g.moveTo(x1, top); g.lineTo(x1 + Math.cos(a) * headR * 0.8, top + Math.sin(a) * headR * 0.8); g.stroke(); }
        if (m.heart) { g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(x1, top + 3, 3, 0, Math.PI * 2); g.fill(); }
        break; }
      case 'daisy': petalsAround(g, x1, top, m.petals || 20, headR, 3.6, P, C, 0, r); break;
      case 'star': petalsAround(g, x1, top, m.petals || 8, headR, 6, P, C, 0.2, r); for (let k = 0; k < 30; k++) { g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(x1 + (r() - 0.5) * headR * 1.6, top + (r() - 0.5) * headR * 1.6, 1.2, 0, Math.PI * 2); g.fill(); } break;
      case 'bells': for (let k = 0; k < 5; k++) { const bx = x1 + 10 + k * 3, by = top + k * 15; g.strokeStyle = shade(leaf, -0.1); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x1 + k * 2, top + k * 15 - 6); g.lineTo(bx, by - 2); g.stroke();
        const gr = g.createLinearGradient(bx - 8, 0, bx + 8, 0); gr.addColorStop(0, shade(P, 0.2)); gr.addColorStop(1, shade(P, -0.25)); g.fillStyle = gr; g.beginPath(); g.moveTo(bx - 4, by); g.quadraticCurveTo(bx - 9, by + 14, bx - 10, by + 17); g.lineTo(bx + 10, by + 17); g.quadraticCurveTo(bx + 9, by + 14, bx + 4, by); g.closePath(); g.fill(); } break;
      case 'spike-bells': for (let k = 0; k < 11; k++) { const by = top + k * 13, bx = x1 + (k % 2 ? 6 : -2);
        const gr = g.createLinearGradient(bx - 9, 0, bx + 9, 0); gr.addColorStop(0, shade(P, 0.15)); gr.addColorStop(1, shade(P, -0.3)); g.fillStyle = gr; g.beginPath(); g.ellipse(bx + 6, by + 6, 11 - k * 0.4, 6.5 - k * 0.2, 0.5, 0, Math.PI * 2); g.fill(); g.fillStyle = rgba(C, 0.85); g.beginPath(); g.arc(bx + 12, by + 8, 2, 0, Math.PI * 2); g.fill(); } break;
      case 'trumpet': petalsAround(g, x1, top, 6, headR, headR * 0.36, P, null, 0.3, r); { const gr = g.createRadialGradient(x1, top, 2, x1, top, 12); gr.addColorStop(0, shade(C, -0.25)); gr.addColorStop(1, C); g.fillStyle = gr; g.beginPath(); g.arc(x1, top, 11, 0, Math.PI * 2); g.fill(); g.strokeStyle = shade(C, -0.3); g.lineWidth = 2; g.stroke(); } break;
      case 'trumpet-big': { const gr = g.createLinearGradient(x1 - 16, 0, x1 + 16, 0); gr.addColorStop(0, shade(P, 0.25)); gr.addColorStop(1, shade(P, -0.3)); g.fillStyle = gr; g.beginPath(); g.moveTo(x1 - 6, top + 26); g.quadraticCurveTo(x1 - 16, top, x1 - 18, top - 14); g.lineTo(x1 + 18, top - 14); g.quadraticCurveTo(x1 + 16, top, x1 + 6, top + 26); g.closePath(); g.fill();
        for (let k = 0; k < 5; k++) { const a = -Math.PI + k / 4 * Math.PI; g.fillStyle = shade(P, 0.1); g.beginPath(); g.ellipse(x1 + Math.cos(a) * 14, top - 14 + Math.sin(a) * 4, 6, 3.5, a, 0, Math.PI * 2); g.fill(); } break; }
      case 'orchid': for (let k = 0; k < 4; k++) { const by = top + k * 24; petalsAround(g, x1, by, 3, 16, 6, P, null, -Math.PI / 2, r); g.fillStyle = C; g.beginPath(); g.ellipse(x1, by + 6, 6, 9, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e8c860'; g.fillRect(x1 - 4, by + 4, 8, 2); } break;
      case 'turban': for (let k = 0; k < 3; k++) { const bx = x1 + (k - 1) * 18, by = top + 10 + k * 8; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.fillStyle = shade(P, (i % 2 ? -0.1 : 0.1)); g.beginPath(); g.ellipse(bx + Math.cos(a) * 8, by - 4 + Math.sin(a) * 3, 9, 3.6, a - 0.6, 0, Math.PI * 2); g.fill(); } g.fillStyle = C; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(bx + (i - 2) * 3, by + 8, 1.6, 0, Math.PI * 2); g.fill(); } } break;
      case 'thistle': { g.save(); g.translate(x1, top); g.scale(1.6, 1.6); g.translate(-x1, -top); g.fillStyle = C; g.beginPath(); g.ellipse(x1, top + 10, 14, 13, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = shade(C, -0.3); for (let k = 0; k < 14; k++) { const a = Math.PI * 0.2 + k / 13 * Math.PI * 0.6; g.beginPath(); g.moveTo(x1 + Math.cos(a) * 13, top + 10 + Math.sin(a) * 12); g.lineTo(x1 + Math.cos(a) * 20, top + 10 + Math.sin(a) * 18); g.stroke(); }
        for (let k = 0; k < 40; k++) { const a = -Math.PI + r() * Math.PI, L = 10 + r() * 12; g.strokeStyle = shade(P, (r() - 0.5) * 0.3); g.lineWidth = 2; g.beginPath(); g.moveTo(x1 + Math.cos(a) * 6, top + 2); g.lineTo(x1 + Math.cos(a) * L * 0.9, top + 2 + Math.sin(a) * L); g.stroke(); } g.restore(); break; }
      default: petalsAround(g, x1, top, 5, headR, headR * 0.36, P, C, 0, r);
    }
  }
}

function plant(g, w, h, m, r) { if (m.t === 'tree') tree(g, w, h, m, r); else if (m.t === 'shrub') shrub(g, w, h, m, r); else if (m.t === 'fern') fern(g, w, h, m, r); else flower(g, w, h, m, r); }

/** Lámina ilustrada de la planta (dataURL). Se dibuja dos veces: la primera, en un lienzo grande y transparente, para
 *  medir lo que ocupa; la segunda, ya encuadrada (centrada, con aire arriba y el pie sobre el suelo), sobre el papel. */
export function floraIllustration(id, w = 520, h = 440) {
  const k = id + ':' + w + 'x' + h; if (CACHE.has(k)) return CACHE.get(k);
  const F = FLORA[id]; if (!F?.m) return '';
  const m = F.m, seed = hash(id);
  let bx = 0, by = 0, bw = w, bh = h, G = null;
  try {
    const t = document.createElement('canvas'); t.width = w * 2; t.height = h * 2; const tg = t.getContext('2d', { willReadFrequently: true });
    tg.translate(w / 2, h / 2); GROUND = null; plant(tg, w, h, m, rng(seed)); G = GROUND;
    const d = tg.getImageData(0, 0, t.width, t.height).data; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < t.height; y += 2) for (let x = 0; x < t.width; x += 2) if (d[(y * t.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 > x0) { bx = x0 - w / 2; by = y0 - h / 2; bw = x1 - x0; bh = y1 - y0; }
  } catch (e) { console.warn('lámina', id, e); }
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  paper(g, w, h, rng(seed ^ 0x9e37));
  // encuadre: el pie a un 89 % del alto, la planta cabe en el 80 % del alto y el 86 % del ancho (sin agrandarla más de 1,9 veces)
  const footY = G ? G.gy : by + bh, s = Math.min((h * 0.8) / Math.max(1, footY - by), (w * 0.86) / Math.max(1, bw), 1.9);
  const tx = w / 2 - s * (bx + bw / 2), ty = h * 0.89 - s * footY;
  if (G) drawGround(g, tx + s * G.cx, ty + s * G.gy, Math.max(70, Math.min(w * 0.4, s * G.w)), rng(seed ^ 0x51ed), G.tint);
  try { g.setTransform(s, 0, 0, s, tx, ty); GROUND = null; plant(g, w, h, m, rng(seed)); } catch (e) { console.warn('lámina', id, e); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  const url = c.toDataURL('image/jpeg', 0.88); CACHE.set(k, url); return url;
}
