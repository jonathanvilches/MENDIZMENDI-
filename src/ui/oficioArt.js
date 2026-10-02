// Dibujos de los minijuegos de los oficios (lienzo de 480 × 360): la cuadra con la vaca y el cubo, la oveja latxa y
// las tijeras de esquilar, la fragua con el yunque, la viña o la huerta y la suela de la alpargata. Con volumen
// (degradados), luz y detalle; los fondos se pintan una sola vez.
export const W = 480, H = 360;
const TAU = Math.PI * 2;
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function paintOnce(draw, seed = 1) { const c = document.createElement('canvas'); c.width = W; c.height = H; draw(c.getContext('2d'), mulberry(seed)); return c; }
const lin = (g, x0, y0, x1, y1, stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) gr.addColorStop(o, c); return gr; };
const rad = (g, x, y, r0, r1, stops, fx = x, fy = y) => { const gr = g.createRadialGradient(fx, fy, r0, x, y, r1); for (const [o, c] of stops) gr.addColorStop(o, c); return gr; };
const ell = (g, x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); };
function blob(g, x, y, rx, ry, r, n = 9) { g.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * TAU, k = 0.78 + r() * 0.36; const px = x + Math.cos(a) * rx * k, py = y + Math.sin(a) * ry * k; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.fill(); }
// tablas de madera (verticales u horizontales) con vetas y clavos
function planks(g, r, x, y, w, h, n, cols, vertical = true) {
  const s = (vertical ? w : h) / n;
  for (let i = 0; i < n; i++) {
    const c = cols[i % cols.length], px = vertical ? x + i * s : x, py = vertical ? y : y + i * s, pw = vertical ? s : w, ph = vertical ? h : s;
    g.fillStyle = vertical ? lin(g, px, 0, px + pw, 0, [[0, shade(c, -0.12)], [0.5, c], [1, shade(c, -0.18)]]) : lin(g, 0, py, 0, py + ph, [[0, shade(c, 0.06)], [1, shade(c, -0.15)]]);
    g.fillRect(px, py, pw, ph);
    g.strokeStyle = 'rgba(40,24,10,0.22)'; g.lineWidth = 1;
    for (let k = 0; k < 6; k++) { g.beginPath(); if (vertical) { const xx = px + 4 + r() * (pw - 8); g.moveTo(xx, py); g.bezierCurveTo(xx + (r() - 0.5) * 8, py + ph * 0.3, xx + (r() - 0.5) * 8, py + ph * 0.6, xx + (r() - 0.5) * 6, py + ph); } else { const yy = py + 3 + r() * (ph - 6); g.moveTo(px, yy); g.bezierCurveTo(px + pw * 0.3, yy + (r() - 0.5) * 5, px + pw * 0.6, yy + (r() - 0.5) * 5, px + pw, yy + (r() - 0.5) * 4); } g.stroke(); }
    g.fillStyle = 'rgba(20,12,4,0.55)'; vertical ? g.fillRect(px + pw - 1.5, py, 1.5, ph) : g.fillRect(px, py + ph - 1.5, pw, 1.5);
  }
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function label(g, text, x, y, align = 'left') {
  g.font = '800 17px Nunito, sans-serif'; g.textAlign = align; g.textBaseline = 'middle';
  const w = g.measureText(text).width + 20, x0 = align === 'left' ? x - 10 : x - w / 2;
  g.fillStyle = 'rgba(16,10,30,0.72)'; g.beginPath(); g.roundRect?.(x0, y - 14, w, 28, 10); if (!g.roundRect) g.rect(x0, y - 14, w, 28); g.fill();
  g.fillStyle = '#ffffff'; g.fillText(text, x, y + 1);
}

// ---------------------------------------------------------------- ordeñar
export const milkBG = () => paintOnce((g, r) => {
  planks(g, r, 0, 0, W, 300, 9, ['#8a603a', '#7e5733', '#936842'], true);
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, W, 300);
  g.fillStyle = lin(g, 0, 288, 0, H, [[0, '#c7a457'], [1, '#9d7c37']]); g.fillRect(0, 288, W, 72);
  g.lineWidth = 1.3; for (let i = 0; i < 320; i++) { const x = r() * W, y = 290 + r() * 70, a = (r() - 0.5) * 1.3; g.strokeStyle = r() < 0.5 ? 'rgba(245,220,150,0.7)' : 'rgba(120,90,40,0.5)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 16, y + Math.sin(a) * 5); g.stroke(); }
}, 3);
export function drawMilk(g, bg, s) {
  g.drawImage(bg, 0, 0);
  const r = mulberry(11), sh = s.shake;
  g.save(); g.translate(sh, 0);
  // patas traseras a los lados, blancas con alguna mancha, y pezuñas
  for (const x of [26, 394]) { g.fillStyle = lin(g, x, 0, x + 62, 0, [[0, '#d9d0c2'], [0.5, '#f6f1e8'], [1, '#d4cabc']]); g.beginPath(); g.roundRect?.(x, 20, 62, 268, 20); if (!g.roundRect) g.rect(x, 20, 62, 268); g.fill(); g.fillStyle = '#2b2520'; g.beginPath(); g.roundRect?.(x + 4, 268, 54, 26, 8); if (!g.roundRect) g.rect(x + 4, 268, 54, 26); g.fill(); }
  g.fillStyle = '#2a221c'; blob(g, 58, 120, 26, 40, r); blob(g, 420, 80, 24, 34, r);
  // vientre de la vaca (frisona: blanca con manchas negras)
  ell(g, 240, -36, 292, 140); g.fillStyle = rad(g, 240, -70, 30, 300, [[0, '#fdfbf6'], [0.72, '#efe8dc'], [1, '#c9bfae']]); g.fill();
  g.save(); ell(g, 240, -36, 292, 140); g.clip(); g.fillStyle = '#251d18'; blob(g, 110, 30, 78, 44, r); blob(g, 372, 18, 86, 50, r); blob(g, 250, -16, 46, 32, r);
  g.fillStyle = 'rgba(0,0,0,0.18)'; ell(g, 240, 96, 300, 26); g.fill(); g.restore();
  // ubre con sus venas
  ell(g, 240, 114, 98, 62); g.fillStyle = rad(g, 240, 128, 10, 104, [[0, '#ffd9d4'], [0.55, '#f2b3ae'], [1, '#cf8783']], 220, 96); g.fill();
  g.strokeStyle = 'rgba(180,96,96,0.35)'; g.lineWidth = 1.6; for (const [a, b, c] of [[170, 100, 205], [300, 96, 270], [215, 140, 250]]) { g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo((a + c) / 2, b + 22, c, b + 30); g.stroke(); }
  // tetillas: se aprietan y se acortan al ordeñar; la mano las rodea
  for (const [k, x] of [['L', 206], ['R', 274]]) {
    const q = s.squeeze[k], len = 40 - q * 9, wd = 13 - q * 3;
    g.fillStyle = lin(g, x - wd, 0, x + wd, 0, [[0, '#d9918d'], [0.45, '#f3b8b3'], [1, '#c98480']]);
    g.beginPath(); g.moveTo(x - wd, 158); g.lineTo(x - wd * 0.8, 158 + len); g.quadraticCurveTo(x, 166 + len + wd * 0.5, x + wd * 0.8, 158 + len); g.lineTo(x + wd, 158); g.closePath(); g.fill();
    if (q > 0.05) {
      // mano: palma y dedos cerrados alrededor de la tetilla
      g.fillStyle = lin(g, x - 26, 0, x + 26, 0, [[0, '#d8a07a'], [0.5, '#f1c49c'], [1, '#c98e66']]);
      g.beginPath(); g.roundRect?.(x - 24 + q * 4, 160, 48 - q * 8, 30, 12); if (!g.roundRect) g.rect(x - 24, 160, 48, 30); g.fill();
      g.strokeStyle = 'rgba(120,70,40,0.5)'; g.lineWidth = 1.5; for (let f = 0; f < 3; f++) { g.beginPath(); g.moveTo(x - 18 + f * 12 + q * 2, 166); g.lineTo(x - 18 + f * 12 + q * 2, 186); g.stroke(); }
      // chorro de leche
      if (q > 0.3) { g.strokeStyle = `rgba(255,255,252,${q})`; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, 160 + len + 6); g.quadraticCurveTo(x + (x < 240 ? 10 : -10), 240, 240 + (x - 240) * 0.4, s.surf); g.stroke(); }
    }
  }
  for (const d of s.drops) { g.fillStyle = '#ffffff'; ell(g, d.x, d.y, 3.5, 6); g.fill(); }
  g.restore();
  // cubo de madera con aros de hierro y la leche con espuma
  const top = 256, bot = 350, L0 = 160, R0 = 320, L1 = 176, R1 = 304;
  g.fillStyle = 'rgba(0,0,0,0.25)'; ell(g, 240, bot + 2, 76, 9); g.fill();
  for (let i = 0; i < 7; i++) {
    const a = i / 7, b = (i + 1) / 7, xa0 = L0 + (R0 - L0) * a, xb0 = L0 + (R0 - L0) * b, xa1 = L1 + (R1 - L1) * a, xb1 = L1 + (R1 - L1) * b;
    g.fillStyle = lin(g, xa0, 0, xb0, 0, [[0, i % 2 ? '#7e5230' : '#8c5c36'], [1, i % 2 ? '#6a4427' : '#7a5030']]);
    g.beginPath(); g.moveTo(xa0, top); g.lineTo(xb0, top); g.lineTo(xb1, bot); g.lineTo(xa1, bot); g.closePath(); g.fill();
  }
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(L0, top, 8, bot - top); g.fillRect(R0 - 14, top, 14, bot - top);
  // interior y leche
  ell(g, 240, top, 80, 12); g.fillStyle = '#3a2618'; g.fill();
  const lvl = Math.min(1, s.milk / 100), surf = s.surf = top + 2 + (1 - lvl) * 60;
  if (lvl > 0.01) { g.save(); ell(g, 240, top, 78, 11); g.clip(); g.fillStyle = '#fbfaf3'; g.fillRect(150, surf - 6, 180, 80); g.restore();
    const fw = 74 - (1 - lvl) * 8; ell(g, 240, Math.max(top, surf), fw, 9); g.fillStyle = rad(g, 240, surf, 4, fw, [[0, '#ffffff'], [1, '#ece6d6']]); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 14; i++) { const a = r() * TAU, rr = r() * fw * 0.85; g.beginPath(); g.arc(240 + Math.cos(a) * rr, Math.max(top, surf) + Math.sin(a) * 6, 1.5 + r() * 2.5, 0, TAU); g.fill(); } }
  for (const y of [272, 330]) { const t = (y - top) / (bot - top), xl = L0 + (L1 - L0) * t, xr = R0 + (R1 - R0) * t; g.fillStyle = lin(g, 0, y - 4, 0, y + 5, [[0, '#9aa0a6'], [0.4, '#5a6066'], [1, '#3a3e42']]); g.fillRect(xl - 1, y - 4, xr - xl + 2, 9); }
  g.fillStyle = 'rgba(255,255,255,0.25)'; ell(g, 240, top, 80, 12); g.lineWidth = 3; g.strokeStyle = '#5a3a22'; g.stroke();
  label(g, `${Math.min(100, s.milk).toFixed(0)} %`, 240, 236, 'center');
}

// ---------------------------------------------------------------- esquilar
export const shearBG = () => paintOnce((g, r) => {
  planks(g, r, 0, 0, W, 250, 8, ['#a67c52', '#9a7048', '#b0855a'], true);
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, W, 250);
  planks(g, r, 0, 250, W, 110, 5, ['#8a6440', '#7f5b39', '#946b45'], false);
  g.fillStyle = 'rgba(255,240,200,0.12)'; for (let i = 0; i < 40; i++) { ell(g, r() * W, 260 + r() * 95, 8 + r() * 14, 2 + r() * 3); g.fill(); }   // restos de lana en el suelo
}, 5);
export function drawShear(g, bg, s) {
  g.drawImage(bg, 0, 0);
  const r = mulberry(4), hd = s.head;
  g.fillStyle = 'rgba(0,0,0,0.25)'; ell(g, 222, 318, 150, 14); g.fill();
  // patas con pezuñas
  for (const [x, k] of [[142, 0], [182, 1], [268, 0], [304, 1]]) { g.fillStyle = lin(g, x, 0, x + 15, 0, [[0, '#1e1916'], [0.5, '#3a322c'], [1, '#1e1916']]); g.fillRect(x, 228, 15, 84 - k * 4); g.fillStyle = '#100c0a'; g.fillRect(x - 1, 304 - k * 4, 17, 10); }
  // piel esquilada (rosada, con pliegues)
  ell(g, 220, 175, 124, 78); g.fillStyle = rad(g, 210, 150, 10, 140, [[0, '#f8dfd2'], [0.7, '#eccab9'], [1, '#d5a894']]); g.fill();
  g.strokeStyle = 'rgba(190,140,120,0.45)'; g.lineWidth = 1.5; for (let i = 0; i < 7; i++) { g.beginPath(); const y = 130 + i * 14; g.moveTo(130, y); g.quadraticCurveTo(220, y + 8, 320, y - 2); g.stroke(); }
  // cabeza de oveja latxa (negra) con orejas y ojo
  g.save(); g.translate(hd.x, hd.y); g.rotate(-0.3);
  g.fillStyle = '#16110e'; ell(g, -20, -26, 10, 18, -0.6); g.fill(); ell(g, 12, -24, 9, 16, 0.5); g.fill();
  ell(g, 0, 0, 38, 27); g.fillStyle = rad(g, -8, -8, 2, 40, [[0, '#3a302a'], [1, '#120e0b']]); g.fill();
  ell(g, 26, 6, 14, 12); g.fillStyle = '#1a1411'; g.fill();
  g.fillStyle = '#e8e2d0'; g.beginPath(); g.arc(8, -7, 5, 0, TAU); g.fill(); g.fillStyle = '#1a120c'; g.beginPath(); g.arc(9, -7, 2.8, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(10, -8.5, 1.1, 0, TAU); g.fill();
  g.fillStyle = '#5a4a40'; g.beginPath(); g.arc(34, 8, 2, 0, TAU); g.fill();
  g.restore();
  // vellón: mechones con volumen (luz arriba a la izquierda) y rizos
  for (const w of s.wool) if (w.on) {
    ell(g, w.x, w.y, 14, 13); g.fillStyle = rad(g, w.x, w.y, 1, 15, [[0, '#fbf6ea'], [0.6, '#ece2cb'], [1, '#c9bb9c']], w.x - 5, w.y - 5); g.fill();
    g.strokeStyle = 'rgba(150,130,95,0.45)'; g.lineWidth = 1.2; g.beginPath(); g.arc(w.x + 2, w.y + 2, 5, 0.3, 3.6); g.stroke();
  }
  for (const f of s.tufts) { g.globalAlpha = Math.max(0, f.life); ell(g, f.x, f.y, 9, 6, f.a); g.fillStyle = '#efe5cf'; g.fill(); g.globalAlpha = 1; }
  if (s.warn > 0) { g.strokeStyle = 'rgba(230,50,40,0.85)'; g.lineWidth = 4; g.beginPath(); g.arc(hd.x, hd.y, hd.r + 6, 0, TAU); g.stroke(); }
  // tijeras de esquilar: dos hojas unidas por el muelle en U
  const p = s.ptr;
  if (p) {
    g.save(); g.translate(p.x, p.y); g.rotate(-0.6);
    const open = 0.18 + 0.14 * Math.abs(Math.sin(s.t * 14) * (s.down ? 1 : 0));
    g.strokeStyle = '#4a4e54'; g.lineWidth = 5; g.beginPath(); g.moveTo(8, -6); g.quadraticCurveTo(46, -18, 52, 0); g.quadraticCurveTo(46, 18, 8, 6); g.stroke();   // muelle
    for (const sg of [-1, 1]) { g.save(); g.rotate(sg * open); g.fillStyle = lin(g, -36, 0, 8, 0, [[0, '#e8ecf0'], [0.6, '#aab2ba'], [1, '#7a828a']]); g.beginPath(); g.moveTo(8, sg * 4); g.lineTo(-38, sg * 1); g.lineTo(-30, sg * 9); g.lineTo(8, sg * 10); g.closePath(); g.fill(); g.restore(); }
    g.restore();
  }
  label(g, `Lana cortada: ${Math.round(s.cut * 100)} %`, 18, 26);
}

// ---------------------------------------------------------------- la fragua
export const forgeBG = () => paintOnce((g, r) => {
  // pared de piedra oscura de la herrería
  g.fillStyle = '#2a221e'; g.fillRect(0, 0, W, H);
  for (let y = 0; y < 300; y += 26) for (let x = (y / 26) % 2 ? -20 : 0; x < W; x += 52) { const v = 52 + r() * 22 | 0; g.fillStyle = `rgb(${v},${v - 6},${v - 10})`; g.beginPath(); g.roundRect?.(x + 2, y + 2, 48, 22, 4); if (!g.roundRect) g.rect(x + 2, y + 2, 48, 22); g.fill(); }
  g.fillStyle = lin(g, 0, 0, 0, H, [[0, 'rgba(0,0,0,0.55)'], [0.6, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0.6)']]); g.fillRect(0, 0, W, H);
  // suelo de tierra
  g.fillStyle = lin(g, 0, 300, 0, H, [[0, '#3a2c22'], [1, '#241a14']]); g.fillRect(0, 296, W, 64);
  // la fragua: obra de ladrillo con campana
  g.fillStyle = '#5a3426'; g.fillRect(14, 150, 150, 120); g.fillStyle = '#4a2a1e'; for (let y = 152; y < 270; y += 14) for (let x = (y / 14) % 2 ? 14 : 22; x < 164; x += 20) g.fillRect(x, y, 18, 12);
  g.fillStyle = '#3a2f2a'; g.beginPath(); g.moveTo(4, 150); g.lineTo(174, 150); g.lineTo(140, 40); g.lineTo(38, 40); g.closePath(); g.fill();
  g.fillStyle = '#2a2220'; g.fillRect(70, 0, 38, 42);
}, 7);
export function drawForge(g, bg, s) {
  g.drawImage(bg, 0, 0);
  const r = mulberry(Math.floor(s.t * 12)), heat = s.heat;
  // brasas que laten con el aire del fuelle
  const glow = 0.35 + heat * 0.55;
  ell(g, 89, 150, 110, 70); g.fillStyle = rad(g, 89, 150, 4, 110, [[0, `rgba(255,${150 + heat * 80 | 0},60,${glow})`], [1, 'rgba(255,90,20,0)']]); g.fill();
  for (let i = 0; i < 26; i++) { const x = 30 + (i * 37) % 118, y = 138 + ((i * 13) % 20), k = 0.5 + r() * 0.5; g.fillStyle = `rgb(${200 + 55 * k * heat | 0},${60 + 120 * k * heat | 0},${20 + 30 * k | 0})`; ell(g, x, y, 9, 6); g.fill(); }
  // fuelle (se encoge al soplar)
  const b = s.blowT; g.fillStyle = '#5a3a24'; g.beginPath(); g.moveTo(30, 300); g.lineTo(110, 290 - b * 10); g.lineTo(110, 312 + b * 6); g.closePath(); g.fill();
  g.strokeStyle = '#3a2416'; g.lineWidth = 2; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(30 + k * 20, 298 - k * 2.5 + b * k); g.lineTo(30 + k * 20, 302 + k * 2.5 - b * k); g.stroke(); }
  // yunque: cara, pico, cintura y pie
  g.fillStyle = 'rgba(0,0,0,0.4)'; ell(g, 300, 312, 96, 10); g.fill();
  const anv = lin(g, 0, 214, 0, 312, [[0, '#7a7e86'], [0.12, '#4a4e56'], [1, '#26282c']]);
  g.fillStyle = anv; g.beginPath();
  g.moveTo(222, 214); g.lineTo(372, 214); g.quadraticCurveTo(420, 216, 446, 226); g.quadraticCurveTo(410, 240, 372, 242);
  g.lineTo(340, 246); g.quadraticCurveTo(326, 262, 330, 282); g.lineTo(356, 300); g.lineTo(356, 312); g.lineTo(244, 312); g.lineTo(244, 300); g.lineTo(270, 282); g.quadraticCurveTo(274, 262, 260, 246); g.lineTo(222, 242); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(222, 214, 150, 3);
  // el hierro (herradura) con su color según el calor
  const c = heat < 0.3 ? [70, 66, 66] : heat < 0.55 ? [150 + heat * 60 | 0, 40, 30] : heat < 0.95 ? [255, 110 + (heat - 0.55) * 250 | 0, 30] : [255, 250, 230];
  const bend = Math.min(1, s.hits / s.need);
  g.save(); g.shadowColor = `rgba(${c},0.9)`; g.shadowBlur = heat > 0.4 ? 18 * heat : 0;
  g.strokeStyle = `rgb(${c})`; g.lineWidth = 15; g.lineCap = 'round';
  g.beginPath(); g.arc(300, 196, 46, Math.PI * (1.05 - bend * 0.45), Math.PI * (1.95 + bend * 0.45), false); g.stroke(); g.restore();
  // martillo que baja al golpear y chispas
  const hy = s.flash > 0 ? 150 + (1 - s.flash) * 20 : 96;
  g.save(); g.translate(330, hy); g.rotate(s.flash > 0 ? 0.15 : -0.5);
  g.fillStyle = lin(g, 0, -40, 0, 40, [[0, '#a07850'], [1, '#6a4a2c']]); g.fillRect(-4, -70, 8, 80);
  g.fillStyle = lin(g, -22, 0, 22, 0, [[0, '#3a3c42'], [0.5, '#6a6e76'], [1, '#2a2c30']]); g.fillRect(-22, 6, 44, 22); g.restore();
  for (const p of s.sparks) { g.fillStyle = `rgba(255,${200 + p.l * 55 | 0},120,${p.l})`; g.fillRect(p.x, p.y, 3, 3); }
  // termómetro del hierro: frío · al rojo (golpear) · se quema
  const X0 = 20, BW = 440, Y = 326;
  g.fillStyle = '#1a1416'; g.fillRect(X0 - 2, Y - 2, BW + 4, 22);
  g.fillStyle = lin(g, X0, 0, X0 + BW, 0, [[0, '#3a3a40'], [0.3, '#5a2a20'], [0.55, '#a83a1c'], [0.56, '#ff8a2a'], [0.94, '#ffc04a'], [0.95, '#fff4dc'], [1, '#ffffff']]); g.fillRect(X0, Y, BW, 18);
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.strokeRect(X0 + BW * 0.55, Y - 1, BW * 0.4, 20);
  const mx = X0 + BW * Math.min(1, heat / 1.05); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(mx, Y - 3); g.lineTo(mx - 7, Y - 13); g.lineTo(mx + 7, Y - 13); g.closePath(); g.fill(); g.fillRect(mx - 1.5, Y - 3, 3, 24);
  g.font = '800 13px Nunito, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ddd'; g.fillText('frío', 70, Y - 8); g.fillText('al rojo: ¡golpea!', X0 + BW * 0.75, Y - 8);
  label(g, `Golpes: ${s.hits} / ${s.need}`, 240, 24, 'center');
}

// ---------------------------------------------------------------- vendimia y huerta
export const pickBG = (kind) => paintOnce((g, r) => {
  g.fillStyle = lin(g, 0, 0, 0, 120, [[0, '#9ccdf0'], [1, '#e4f0f4']]); g.fillRect(0, 0, W, 120);
  g.fillStyle = '#8fae68'; g.beginPath(); g.moveTo(0, 96); for (let x = 0; x <= W; x += 20) g.lineTo(x, 78 + Math.sin(x * 0.02) * 10 + Math.sin(x * 0.07) * 4); g.lineTo(W, 130); g.lineTo(0, 130); g.closePath(); g.fill();
  g.fillStyle = kind === 'uva' ? lin(g, 0, 110, 0, H, [[0, '#c9a46a'], [1, '#9c7a46']]) : lin(g, 0, 110, 0, H, [[0, '#8a6a42'], [1, '#6a4e30']]); g.fillRect(0, 110, W, H);
  for (let i = 0; i < 500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,240,200,0.18)' : 'rgba(60,40,20,0.2)'; g.fillRect(r() * W, 110 + r() * 250, 2, 2); }
}, kind.length);
const leaf = (g, x, y, s, rot, col) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col;
  g.beginPath(); g.moveTo(0, 0); for (let k = 0; k <= 5; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.55, rr = s * (k % 2 ? 0.75 : 1); g.quadraticCurveTo(Math.cos(a - 0.3) * rr * 0.7, Math.sin(a - 0.3) * rr * 0.7, Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(-Math.PI / 2 + k * 0.8) * s * 0.8, Math.sin(-Math.PI / 2 + k * 0.8) * s * 0.8); g.stroke(); }
  g.restore();
};
export function drawRow(g, y, kind) {
  // cepas: poste, alambre, sarmientos y hojas
  g.strokeStyle = '#5a3a22'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, y - 18); g.lineTo(W, y - 18); g.stroke();
  for (let x = 30; x < W; x += 140) { g.fillStyle = '#6a4a2c'; g.fillRect(x - 4, y - 30, 8, 64); }
  const r = mulberry(y);
  for (let x = 14; x < W; x += 26) { const c = kind === 'uva' ? (r() < 0.5 ? '#4f7a2e' : '#5e8a36') : (r() < 0.5 ? '#3c6e28' : '#4a7c30'); leaf(g, x + r() * 8, y + r() * 10 - 6, 18 + r() * 6, (r() - 0.5) * 1.2, c); }
}
export function drawCrop(g, kind, x, y, ripe) {
  if (kind === 'uva') {
    g.strokeStyle = '#6a4a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x, y - 18); g.stroke();
    const base = ripe ? ['#3a1a40', '#5a2a5e'] : ['#7aa040', '#a8c860'];
    for (const [dx, dy] of [[0, -16], [-9, -12], [9, -12], [-13, -2], [0, -4], [13, -2], [-8, 7], [8, 7], [0, 16], [-4, 24], [4, 24]]) {
      ell(g, x + dx, y + dy, 7, 7); g.fillStyle = rad(g, x + dx, y + dy, 1, 8, [[0, base[1]], [1, base[0]]], x + dx - 2.5, y + dy - 2.5); g.fill();
      g.fillStyle = ripe ? 'rgba(200,190,230,0.45)' : 'rgba(255,255,220,0.5)'; g.beginPath(); g.arc(x + dx - 2.5, y + dy - 2.5, 1.6, 0, TAU); g.fill();
    }
  } else if (kind === 'pimiento') {
    g.fillStyle = lin(g, x - 12, 0, x + 12, 0, ripe ? [[0, '#8a1610'], [0.4, '#e2392c'], [1, '#9a1a12']] : [[0, '#2e5a1a'], [0.4, '#5a9a34'], [1, '#2e5a1a']]);
    g.beginPath(); g.moveTo(x - 11, y - 12); g.quadraticCurveTo(x - 14, y + 12, x + 1, y + 28); g.quadraticCurveTo(x + 14, y + 8, x + 11, y - 12); g.quadraticCurveTo(x, y - 18, x - 11, y - 12); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; ell(g, x - 4, y - 2, 2.5, 9, 0.2); g.fill(); g.fillStyle = '#3a6a22'; g.fillRect(x - 2, y - 24, 4, 10);
  } else {
    g.fillStyle = ripe ? '#4a6e38' : '#7a5a8a';
    for (let row = 0; row < 4; row++) for (let k = -2; k <= 2; k++) { const px = x + k * 6 * (1 - row * 0.15), py = y + 14 - row * 9; g.beginPath(); g.moveTo(px - 6, py); g.quadraticCurveTo(px, py - (ripe ? 12 : 18), px + 6, py); g.closePath(); g.fill(); }
    if (!ripe) { g.fillStyle = '#9a6ab0'; ell(g, x, y - 18, 8, 5); g.fill(); }
  }
}

// ---------------------------------------------------------------- coser la suela
export const stitchBG = () => paintOnce((g, r) => {
  planks(g, r, 0, 0, W, H, 6, ['#9c7246', '#8e663e', '#a87c4e'], false);
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, W, H);
  // suela de yute: trenza en espiral
  g.save(); g.translate(240, 180);
  ell(g, 0, 0, 96, 160); g.fillStyle = lin(g, -96, 0, 96, 0, [[0, '#b08c54'], [0.5, '#d4b47a'], [1, '#a88450']]); g.fill();
  g.lineWidth = 2;
  for (let k = 0; k < 13; k++) {
    const rx = 92 - k * 7, ry = 156 - k * 12; if (rx < 8) break;
    for (let i = 0; i < 70; i++) { const a = i / 70 * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry, dx = -Math.sin(a), dy = Math.cos(a) * ry / rx; g.strokeStyle = (i + k) % 2 ? 'rgba(120,90,50,0.6)' : 'rgba(240,215,160,0.5)'; g.beginPath(); g.moveTo(x - dx * 3 - 2, y - dy * 3); g.lineTo(x + dx * 3 + 2, y + dy * 3); g.stroke(); }
  }
  g.strokeStyle = 'rgba(80,55,30,0.6)'; g.lineWidth = 3; ell(g, 0, 0, 96, 160); g.stroke();
  g.restore();
}, 9);
export function drawStitch(g, bg, s) {
  g.drawImage(bg, 0, 0);
  const P = s.pts, k = s.k;
  // puntadas hechas: hilo rojo con su cruce
  g.strokeStyle = '#a4221a'; g.lineWidth = 3.5; g.lineCap = 'round';
  g.beginPath(); for (let i = 0; i < k; i++) { const p = P[i]; i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); } g.stroke();
  for (let i = 0; i < k; i++) { const p = P[i]; g.strokeStyle = '#7a1610'; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x - 5, p.y - 5); g.lineTo(p.x + 5, p.y + 5); g.stroke(); }
  // agujeros de las puntadas y la que brilla
  P.forEach((p, i) => {
    if (i < k) return;
    if (i === k) { ell(g, p.x, p.y, 15, 15); g.fillStyle = rad(g, p.x, p.y, 2, 16, [[0, 'rgba(255,240,140,1)'], [0.5, `rgba(255,${200 + Math.sin(s.t * 8) * 55 | 0},60,0.9)`], [1, 'rgba(255,200,60,0)']]); g.fill(); }
    g.fillStyle = '#4a3420'; ell(g, p.x, p.y, 4, 4); g.fill();
  });
  // aguja con el hilo hasta la última puntada
  const n = P[Math.min(k, P.length - 1)], prev = k ? P[k - 1] : { x: 240, y: 360 };
  g.strokeStyle = 'rgba(164,34,26,0.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(prev.x, prev.y); g.quadraticCurveTo((prev.x + n.x) / 2 + 30, (prev.y + n.y) / 2 + 20, n.x + 22, n.y - 30); g.stroke();
  g.save(); g.translate(n.x + 22, n.y - 30); g.rotate(-0.8); g.fillStyle = lin(g, -4, 0, 4, 0, [[0, '#9aa2aa'], [0.5, '#f0f4f8'], [1, '#8a929a']]); g.beginPath(); g.moveTo(-3, -34); g.lineTo(3, -34); g.lineTo(1, 6); g.lineTo(0, 12); g.lineTo(-1, 6); g.closePath(); g.fill(); g.restore();
  label(g, `Puntadas: ${k} / ${P.length}`, 18, 26);
}
