// Dibujos de los pasos de los oficios que se hacen con la barra de precisión o pulsando deprisa: lo que se ve avanza
// con cada golpe bueno (la muesca del tronco se hace más honda, la piedra queda cuadrada, la cesta sube, los aros
// bajan, el hierro se enfría…), así cada pulsación tiene un sentido. Lienzo de 480 × 200; p = avance (0…1),
// t = tiempo, hit = segundos desde el último golpe y ok = si fue bueno.
const W = 480, H = 200, TAU = Math.PI * 2;
const lin = (g, x0, y0, x1, y1, stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) gr.addColorStop(o, c); return gr; };
const rad = (g, x, y, r0, r1, stops) => { const gr = g.createRadialGradient(x, y, r0, x, y, r1); for (const [o, c] of stops) gr.addColorStop(o, c); return gr; };
const ell = (g, x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); };
const mix = (a, b, k) => a + (b - a) * k;
const rgb = (a, b, k) => `rgb(${a.map((v, i) => Math.round(mix(v, b[i], k))).join(',')})`;
function rnd(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// fondos
function meadow(g) {
  g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#9fd0f0'], [0.55, '#d9eef8'], [0.56, '#7fae4e'], [1, '#4f7d2e']]); g.fillRect(0, 0, W, H);
  g.fillStyle = '#5f8f3c'; for (let i = 0; i < 9; i++) { ell(g, i * 60 + 20, 112, 46, 14); g.fill(); }
  g.fillStyle = '#2f5a2a'; for (let i = 0; i < 7; i++) { const x = 30 + i * 72; g.beginPath(); g.moveTo(x, 110); g.lineTo(x + 16, 60 + (i % 3) * 8); g.lineTo(x + 32, 110); g.fill(); }
}
function workshop(g, warm = 0.3) {
  g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#6b4b33'], [0.7, '#4a3222'], [0.71, '#5d4a3a'], [1, '#3e3024']]); g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 2; for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 140); g.stroke(); }
  if (warm) { g.fillStyle = rad(g, 120, 90, 10, 260, [[0, `rgba(255,170,80,${warm})`], [1, 'rgba(255,170,80,0)']]); g.fillRect(0, 0, W, H); }
}
function chips(g, hit, x, y, col, n = 10, seed = 3) {
  if (hit > 0.5) return; const r = rnd(seed), k = hit / 0.5;
  g.fillStyle = col; g.globalAlpha = 1 - k;
  for (let i = 0; i < n; i++) { const a = -Math.PI * (0.15 + r() * 0.7), v = 60 + r() * 90; g.fillRect(x + Math.cos(a) * v * k, y + Math.sin(a) * v * k + 120 * k * k, 3 + r() * 3, 2 + r() * 2); }
  g.globalAlpha = 1;
}
function puff(g, hit, x, y, col = 'rgba(255,255,255,0.8)', s = 1) {
  if (hit > 1.2) return; const k = hit / 1.2;
  g.fillStyle = col.replace(/[\d.]+\)$/, `${(1 - k) * 0.8})`);
  for (let i = 0; i < 4; i++) { ell(g, x + (i - 1.5) * 14 * s + Math.sin(i * 2 + k * 3) * 6, y - k * 60 * s - i * 6, (10 + k * 22) * s, (8 + k * 16) * s); g.fill(); }
}

// ---------------------------------------------------------------- el tronco (aizkolari)
function chop(g, p, t, hit, ok, side) {
  meadow(g);
  const y = 140, r = 34, x0 = 60, x1 = 420, cx = 240;
  const d1 = side ? 1 : p, d2 = side ? p : 0, apart = side && p >= 1 ? 1 : 0;   // hondura de cada lado (0…1 → hasta la mitad)
  const half = (a, b, dx) => {
    g.save(); g.translate(dx, 0);
    g.fillStyle = lin(g, 0, y - r, 0, y + r, [[0, '#a7764a'], [0.5, '#8a5a32'], [1, '#5e3b1f']]);
    g.fillRect(a, y - r, b - a, r * 2);
    g.strokeStyle = 'rgba(40,20,8,0.35)'; g.lineWidth = 1.5;
    for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(a, y - r + 8 + k * 13); g.bezierCurveTo(a + (b - a) * 0.3, y - r + 4 + k * 13, a + (b - a) * 0.7, y - r + 12 + k * 13, b, y - r + 8 + k * 13); g.stroke(); }
    g.restore();
  };
  ell(g, cx, y + r + 4, 200, 8); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
  half(x0, cx, -apart * 26); half(cx, x1, apart * 26);
  // la muesca en V: arriba (primer lado) y abajo (al dar la vuelta)
  g.fillStyle = '#e9cf9b';
  if (!apart) {
    if (d1 > 0) { const dd = d1 * r; g.beginPath(); g.moveTo(cx - dd * 0.9, y - r); g.lineTo(cx, y - r + dd); g.lineTo(cx + dd * 0.9, y - r); g.fill(); }
    if (d2 > 0) { const dd = d2 * r; g.beginPath(); g.moveTo(cx - dd * 0.9, y + r); g.lineTo(cx, y + r - dd); g.lineTo(cx + dd * 0.9, y + r); g.fill(); }
  }
  // testa con los anillos
  ell(g, x1 + apart * 26, y, 12, r); g.fillStyle = '#d8b07a'; g.fill(); g.strokeStyle = '#a67c48'; g.lineWidth = 1.2;
  for (let k = 1; k < 5; k++) { ell(g, x1 + apart * 26, y, 12 * k / 5, r * k / 5); g.stroke(); }
  // el hacha
  const sw = hit < 0.25 ? hit / 0.25 : 1, ang = mix(0.2, -1.2, sw), hx = cx + 6, hy = y - r - 4 - (side ? 0 : d1 * 4);
  g.save(); g.translate(hx + 60, hy - 46); g.rotate(ang);
  g.strokeStyle = '#7a4a22'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-58, 40); g.stroke();
  g.fillStyle = lin(g, -70, 30, -50, 60, [[0, '#d8dde2'], [1, '#7c848c']]); g.beginPath(); g.moveTo(-50, 30); g.lineTo(-76, 38); g.lineTo(-70, 62); g.lineTo(-56, 48); g.closePath(); g.fill();
  g.restore();
  if (ok) chips(g, hit, cx, y - r * (side ? -0.6 : 0.6), '#f0d8a8', 12, 7);
}

// ---------------------------------------------------------------- el sillar (cantero)
function stone(g, p, t, hit, ok, stage) {
  workshop(g, 0);
  g.fillStyle = '#6e5a46'; g.fillRect(0, 150, W, 50);
  const cx = 240, cy = 104, w = 150, h = 84, r = rnd(11), N = 28;
  const k = stage ? 1 : p, sm = stage ? p : 0;   // desbastado y luego alisado
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = i / N * TAU, ca = Math.cos(a), sa = Math.sin(a), s = 1 / Math.max(Math.abs(ca) / (w / 2), Math.abs(sa) / (h / 2));   // al rectángulo
    const rough = 1.18 + (r() - 0.5) * 0.5, R = mix(rough, 1, k);
    pts.push([cx + ca * s * R, cy + sa * s * R * 1.05]);
  }
  g.fillStyle = 'rgba(0,0,0,0.3)'; ell(g, cx, 152, 100, 9); g.fill();
  g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
  g.fillStyle = lin(g, cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, [[0, '#e4d2ae'], [1, '#b89e74']]); g.fill();
  g.strokeStyle = 'rgba(70,50,30,0.5)'; g.lineWidth = 2; g.stroke();
  // marcas: golpes del pico (desbaste) o líneas finas del cincel (alisado)
  const r2 = rnd(5);
  g.save(); g.clip();
  if (!stage || sm < 1) { g.fillStyle = 'rgba(90,70,45,0.35)'; for (let i = 0; i < 26 * (1 - sm); i++) { ell(g, cx - w / 2 + r2() * w, cy - h / 2 + r2() * h, 4, 2.5, r2() * 3); g.fill(); } }
  if (stage) { g.strokeStyle = 'rgba(110,90,60,0.35)'; g.lineWidth = 1; for (let i = 0; i < 40 * sm; i++) { const x = cx - w / 2 + (i % 20) * (w / 20) + 3, y = cy - h / 2 + (i < 20 ? 6 : h / 2 + 6); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y + h / 2 - 12); g.stroke(); } }
  g.restore();
  // la escuadra al final
  if (stage && p >= 1) { g.strokeStyle = '#c0c6cc'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx + w / 2 + 6, cy - h / 2 - 6); g.lineTo(cx + w / 2 + 6, cy + h / 2 + 4); g.lineTo(cx + w / 2 - 40, cy + h / 2 + 4); g.stroke(); }
  // la herramienta
  const sw = hit < 0.22 ? hit / 0.22 : 1;
  g.save(); g.translate(cx + w / 2 + 40, cy - h / 2 - 10); g.rotate(mix(-0.25, -0.9, sw));
  g.strokeStyle = '#7a4a22'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-10, 60); g.stroke();
  g.fillStyle = '#8e969e'; g.fillRect(-36, -6, 52, 12);
  g.restore();
  if (ok) chips(g, hit, cx + w / 2 - 6, cy - h / 2 + 10, '#efe2c4', 12, 9);
}

// ---------------------------------------------------------------- la cesta (cestero)
function basket(g, p) {
  workshop(g, 0.15);
  const cx = 240, by = 172, bw = 170, top = 60, rows = Math.round(p * 10);
  const xAt = (y) => mix(bw / 2, bw / 2 + 26, (by - y) / (by - top));
  g.fillStyle = 'rgba(0,0,0,0.3)'; ell(g, cx, by + 4, bw / 2 + 10, 8); g.fill();
  // las varas (estacas)
  g.strokeStyle = '#b98c52'; g.lineWidth = 4; g.lineCap = 'round';
  for (let i = 0; i <= 10; i++) { const f = i / 10 * 2 - 1; g.beginPath(); g.moveTo(cx + f * bw / 2, by); g.lineTo(cx + f * (bw / 2 + 26), top - 6); g.stroke(); }
  // filas tejidas, de abajo arriba
  const rh = (by - top) / 10;
  for (let j = 0; j < rows; j++) {
    const y = by - j * rh - rh / 2, xw = xAt(y);
    for (let i = 0; i < 10; i++) {
      const a = cx - xw + i * (xw * 2 / 10), over = (i + j) % 2 === 0;
      g.fillStyle = lin(g, 0, y - rh / 2, 0, y + rh / 2, over ? [[0, '#e3b87a'], [1, '#a9773e']] : [[0, '#c69a5e'], [1, '#8a5f2e']]);
      g.beginPath(); g.roundRect ? g.roundRect(a, y - rh / 2 + 1, xw * 2 / 10, rh - 2, 5) : g.rect(a, y - rh / 2 + 1, xw * 2 / 10, rh - 2); g.fill();
    }
  }
  if (rows >= 10) { g.strokeStyle = '#7d5428'; g.lineWidth = 8; ell(g, cx, top - 2, bw / 2 + 28, 9); g.stroke(); }
}

// ---------------------------------------------------------------- hilar (huso y rueca)
function spin(g, p, t) {
  workshop(g, 0.35);
  const sx = 330, sy = 70;
  // rueca con la lana que se va gastando
  g.strokeStyle = '#7a5230'; g.lineWidth = 6; g.beginPath(); g.moveTo(110, 190); g.lineTo(130, 40); g.stroke();
  g.fillStyle = '#f4efe2'; const wr = mix(40, 14, p); ell(g, 130, 52, wr, wr * 0.8); g.fill(); ell(g, 118, 64, wr * 0.7, wr * 0.6); g.fill();
  // el hilo de la rueca al huso
  g.strokeStyle = '#e8e0cc'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(130 + wr * 0.6, 60); g.quadraticCurveTo(240, 50 + Math.sin(t * 6) * 4, sx, sy); g.stroke();
  // el huso que gira, con el ovillo que crece
  g.save(); g.translate(sx, sy);
  g.strokeStyle = '#8e6236'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 110); g.stroke();
  const yr = mix(4, 26, p);
  g.fillStyle = lin(g, -yr, 0, yr, 0, [[0, '#cfc6b0'], [0.5, '#fbf7ec'], [1, '#bcb39c']]); ell(g, 0, 58, yr, mix(10, 34, p)); g.fill();
  g.strokeStyle = 'rgba(140,130,110,0.6)'; g.lineWidth = 1; const ph = (t * 8) % 1;
  for (let i = 0; i < 6; i++) { const yy = 58 - mix(10, 34, p) + ((i + ph) / 6) * mix(20, 68, p); g.beginPath(); g.moveTo(-yr, yy); g.lineTo(yr, yy + 4); g.stroke(); }
  g.fillStyle = '#6b4424'; ell(g, 0, 98, 12, 5); g.fill();
  g.restore();
}

// ---------------------------------------------------------------- el horno de leña (pan)
function oven(g, p, t, hit, ok) {
  g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#7a6a5a'], [1, '#4c4036']]); g.fillRect(0, 0, W, H);
  g.fillStyle = '#9a8a76'; for (let y = 0; y < H; y += 22) for (let x = (y / 22) % 2 ? -20 : 0; x < W; x += 44) { g.fillStyle = (x + y) % 3 ? '#968570' : '#8a7a66'; g.fillRect(x + 2, y + 2, 40, 18); }
  const cx = 240, cy = 150, rw = 120, rh = 90;
  g.fillStyle = '#2a1a10'; g.beginPath(); g.moveTo(cx - rw, cy); g.lineTo(cx - rw, cy - rh * 0.4); g.ellipse(cx, cy - rh * 0.4, rw, rh * 0.6, 0, Math.PI, 0); g.lineTo(cx + rw, cy); g.closePath(); g.fill();
  g.fillStyle = rad(g, cx, cy - 20, 10, 140, [[0, 'rgba(255,170,60,0.85)'], [0.6, 'rgba(200,80,20,0.35)'], [1, 'rgba(0,0,0,0)']]); g.fill();
  // brasas al fondo
  for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(255,${120 + (i * 37 % 100)},40,${0.6 + 0.4 * Math.sin(t * 5 + i)})`; ell(g, cx - 90 + i * 13, cy - 8, 5, 3); g.fill(); }
  // panes dentro
  const n = Math.min(4, Math.floor(p * 4 + 1e-6));
  for (let i = 0; i < n; i++) { const x = cx - 75 + i * 50, y = cy - 26; g.fillStyle = lin(g, 0, y - 14, 0, y + 10, [[0, '#e6b26a'], [1, '#9b5e26']]); ell(g, x, y, 22, 13); g.fill(); g.strokeStyle = 'rgba(80,40,10,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 10, y - 4); g.lineTo(x + 10, y - 7); g.stroke(); }
  // la pala que mete el pan
  const k = hit < 0.5 ? hit / 0.5 : 1, px = mix(cx - 20, W + 40, k * k);
  g.strokeStyle = '#8a5a32'; g.lineWidth = 7; g.beginPath(); g.moveTo(px, cy - 20); g.lineTo(px + 260, cy + 20); g.stroke();
  g.fillStyle = '#b07a44'; ell(g, px - 4, cy - 22, 28, 9); g.fill();
  g.fillStyle = '#5e5248'; g.fillRect(cx - rw - 14, cy, rw * 2 + 28, 16);
}

// ---------------------------------------------------------------- amasar (artesa)
function knead(g, p, t, hit) {
  workshop(g, 0.2);
  g.fillStyle = lin(g, 0, 120, 0, 190, [[0, '#9a6a3a'], [1, '#5e3b1f']]); g.beginPath(); g.moveTo(70, 120); g.lineTo(410, 120); g.lineTo(380, 190); g.lineTo(100, 190); g.closePath(); g.fill();
  g.fillStyle = '#3e2614'; g.fillRect(80, 118, 320, 8);
  g.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 40; i++) { ell(g, 120 + (i * 53 % 240), 112 + (i * 17 % 10), 4, 1.5); g.fill(); }
  // la masa: grumosa al principio, lisa y redonda al final
  const r = rnd(4), N = 26, sq = hit < 0.25 ? 1 - hit / 0.25 : 0;
  // contorno suave (curvas por los puntos medios): grumos redondeados, no picos
  const P = []; for (let i = 0; i < N; i++) { const a = i / N * TAU, rr = 1 + (r() - 0.5) * 0.36 * (1 - p); P.push([240 + Math.cos(a) * 80 * rr * (1 + sq * 0.12), 104 + Math.sin(a) * 40 * rr * (1 - sq * 0.15)]); }
  g.beginPath(); const m0 = [(P[N - 1][0] + P[0][0]) / 2, (P[N - 1][1] + P[0][1]) / 2]; g.moveTo(m0[0], m0[1]);
  for (let i = 0; i < N; i++) { const a = P[i], b = P[(i + 1) % N]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
  g.closePath(); g.fillStyle = lin(g, 0, 64, 0, 144, [[0, '#fff6e2'], [1, '#e2cfa6']]); g.fill();
  g.strokeStyle = 'rgba(160,130,90,0.4)'; g.lineWidth = 1.5; g.stroke();
  if (p < 0.9) { g.fillStyle = 'rgba(240,235,220,0.9)'; for (let i = 0; i < 12 * (1 - p); i++) { ell(g, 190 + r() * 100, 90 + r() * 28, 6, 3); g.fill(); } }   // harina sin mezclar
  if (hit < 0.4) puff(g, hit * 2, 240, 70, 'rgba(255,255,255,0.7)', 0.6);
}

// ---------------------------------------------------------------- la barrica y sus aros (tonelero)
function hoops(g, p, t, hit, ok) {
  workshop(g, 0.1);
  const cx = 240, top = 22, bot = 182, mid = (top + bot) / 2, wT = 70, wM = 92;
  const xAt = (y) => { const k = 1 - ((y - mid) / (mid - top)) ** 2; return mix(wT, wM, k); };
  g.fillStyle = 'rgba(0,0,0,0.3)'; ell(g, cx, bot + 4, wT + 10, 6); g.fill();
  g.beginPath(); for (let y = top; y <= bot; y += 4) g.lineTo(cx - xAt(y), y); for (let y = bot; y >= top; y -= 4) g.lineTo(cx + xAt(y), y); g.closePath();
  g.fillStyle = lin(g, cx - wM, 0, cx + wM, 0, [[0, '#5e3b1f'], [0.35, '#a9743f'], [0.6, '#b98450'], [1, '#5a381c']]); g.fill();
  g.strokeStyle = 'rgba(40,22,8,0.45)'; g.lineWidth = 1.5;
  for (let i = -4; i <= 4; i++) { g.beginPath(); for (let y = top; y <= bot; y += 6) g.lineTo(cx + xAt(y) * i / 4.6, y); g.stroke(); }
  // aros: empiezan flojos (arriba) y bajan a su sitio con los golpes
  const goal = [44, 70, 134, 160];
  goal.forEach((gy, i) => { const y = mix(i < 2 ? top + 4 : mid + 6, gy, i < 2 ? p : Math.min(1, p * 1.3)), x = xAt(y) + 2; g.strokeStyle = '#3c3f44'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx - x, y); g.lineTo(cx + x, y); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - x, y - 2); g.lineTo(cx + x, y - 2); g.stroke(); });
  // martillo y botador
  const sw = hit < 0.22 ? hit / 0.22 : 1, hy = mix(top + 10, top - 14, sw);
  g.fillStyle = '#8e969e'; g.fillRect(cx + 40, hy + 18, 10, 26);
  g.save(); g.translate(cx + 46, hy + 8); g.rotate(mix(0, -0.5, sw)); g.fillStyle = '#6a6f75'; g.fillRect(-18, -8, 36, 14); g.strokeStyle = '#7a4a22'; g.lineWidth = 6; g.beginPath(); g.moveTo(10, -2); g.lineTo(70, -30); g.stroke(); g.restore();
  if (ok && hit < 0.3) { g.fillStyle = '#ffe38a'; for (let i = 0; i < 6; i++) { ell(g, cx + 46 + Math.cos(i) * 20 * (hit / 0.3 + 0.3), hy + 46 + Math.sin(i) * 8, 2, 2); g.fill(); } }
}

// ---------------------------------------------------------------- al agua (herrero)
function quench(g, p, t, hit, ok) {
  workshop(g, 0.25);
  g.fillStyle = lin(g, 0, 120, 0, 190, [[0, '#7a5a3a'], [1, '#4a3420']]); g.fillRect(120, 120, 240, 70);
  g.fillStyle = lin(g, 0, 124, 0, 150, [[0, '#6f9fc0'], [1, '#2f5a78']]); g.fillRect(126, 124, 228, 26);
  // la herradura: al rojo al principio, oscura y dura al final
  const dip = hit < 0.6 ? Math.sin(hit / 0.6 * Math.PI) : 0, y = mix(70, 118, dip), x = 240;
  const col = rgb([255, 150, 40], [70, 70, 76], p);
  g.strokeStyle = col; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, 26, Math.PI * 0.1, Math.PI * 0.9, true); g.stroke();
  if (p < 0.8) { g.strokeStyle = `rgba(255,200,80,${0.5 * (1 - p)})`; g.lineWidth = 20; g.beginPath(); g.arc(x, y, 26, Math.PI * 0.1, Math.PI * 0.9, true); g.stroke(); }
  // tenazas
  g.strokeStyle = '#4a4e54'; g.lineWidth = 6; g.beginPath(); g.moveTo(x + 24, y + 6); g.lineTo(x + 150, y - 50); g.moveTo(x + 28, y + 12); g.lineTo(x + 156, y - 40); g.stroke();
  if (ok) puff(g, hit, x, 118, 'rgba(240,244,248,0.85)', 1.2);
}

// ---------------------------------------------------------------- las palomeras de Etxalar
function doves(g, p, t, hit, ok, net) {
  g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#a8c8e0'], [1, '#e8d8b8']]); g.fillRect(0, 0, W, H);
  g.fillStyle = '#6f8a4a'; g.beginPath(); g.moveTo(0, 150); g.lineTo(160, 112); g.lineTo(240, 132); g.lineTo(330, 110); g.lineTo(W, 150); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  g.fillStyle = '#3f5a2c'; for (let i = 0; i < 6; i++) { const x = 20 + i * 90; g.fillRect(x + 10, 120, 6, 50); ell(g, x + 13, 112, 22, 30); g.fill(); }
  // redes en el collado
  if (net) { const drop = Math.min(1, p * 1.2); g.strokeStyle = 'rgba(60,50,40,0.55)'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { const x0 = 150 + i * 70, top = mix(40, 92, drop); for (let k = 0; k <= 8; k++) { g.beginPath(); g.moveTo(x0 + k * 7, top); g.lineTo(x0 + k * 7, 150); g.stroke(); } for (let yy = top; yy <= 150; yy += 8) { g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 + 56, yy); g.stroke(); } } }
  // el bando: alto al principio; con la paleta bajan a ras del suelo; en la red, las que caen
  const n = 12, r = rnd(8), caught = net ? Math.floor(p * 6) : 0;
  for (let i = 0; i < n; i++) {
    const ph = (t * 0.25 + r()) % 1, low = net ? 1 : p;
    let x = mix(-30, W + 30, ph), y = mix(30 + r() * 30, 104 + r() * 20, low) + Math.sin(t * 4 + i) * 3;
    if (i < caught) { x = 160 + (i % 3) * 70 + 20 + r() * 20; y = 130 + r() * 14; }
    const f = Math.sin(t * 14 + i * 2) * 5;
    g.strokeStyle = '#4a4e58'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x - 9, y - f); g.quadraticCurveTo(x - 4, y - 3, x, y); g.quadraticCurveTo(x + 4, y - 3, x + 9, y - f); g.stroke();
    g.fillStyle = '#7a808c'; ell(g, x, y + 1, 4, 2.5); g.fill();
  }
  // la paleta blanca lanzada
  if (!net && hit < 0.8) { const k = hit / 0.8, x = mix(60, 300, k), y = 40 + Math.sin(k * Math.PI) * -20 + k * 40; g.save(); g.translate(x, y); g.rotate(k * 9); g.fillStyle = '#ffffff'; g.fillRect(-12, -5, 24, 10); g.restore(); }
}

// ---------------------------------------------------------------- levantar la piedra (harrijasotzaile)
function lift(g, p, t, hit) {
  meadow(g);
  g.fillStyle = '#c9b48a'; g.fillRect(0, 168, W, 32);
  const cx = 240, ground = 168, chest = 96, shoulder = 62;
  const y = p < 0.6 ? mix(ground - 22, chest, p / 0.6) : mix(chest, shoulder, (p - 0.6) / 0.4);
  // marcas de altura
  g.font = '800 13px Nunito, sans-serif'; g.fillStyle = 'rgba(20,20,30,0.75)'; g.textAlign = 'left';
  [['Hombro', shoulder], ['Pecho', chest], ['Suelo', ground - 22]].forEach(([s, yy]) => { g.fillText(s, 352, yy + 4); g.strokeStyle = 'rgba(20,20,30,0.35)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(300, yy); g.lineTo(346, yy); g.stroke(); g.setLineDash([]); });
  // el levantador (silueta) con la faja
  const bend = 1 - p, hipY = 128 + bend * 14, shY = mix(78, 60, p) + bend * 26;
  g.strokeStyle = '#2c3a58'; g.lineCap = 'round'; g.lineWidth = 14; g.beginPath(); g.moveTo(cx - 12, ground); g.lineTo(cx - 8 - bend * 10, hipY + 18); g.lineTo(cx - 6, hipY); g.moveTo(cx + 12, ground); g.lineTo(cx + 8 + bend * 10, hipY + 18); g.lineTo(cx + 6, hipY); g.stroke();
  g.strokeStyle = '#f4f1ea'; g.lineWidth = 22; g.beginPath(); g.moveTo(cx, hipY); g.lineTo(cx - bend * 8, shY); g.stroke();
  g.strokeStyle = '#d63a3a'; g.lineWidth = 22; g.beginPath(); g.moveTo(cx, hipY - 4); g.lineTo(cx, hipY - 12); g.stroke();
  g.fillStyle = '#e9b98f'; ell(g, cx - bend * 8, shY - 18, 11, 12); g.fill();
  // la piedra cilíndrica y los brazos que la abrazan
  const sx = cx + 26 + p * 10, sy = y - p * 4;   // al final, sobre el hombro (al lado de la cabeza)
  g.fillStyle = lin(g, sx - 30, 0, sx + 30, 0, [[0, '#6c6c70'], [0.5, '#a8a8ac'], [1, '#5a5a5e']]); g.fillRect(sx - 28, sy - 22, 56, 44); ell(g, sx, sy - 22, 28, 7); g.fillStyle = '#b8b8bc'; g.fill();
  g.strokeStyle = '#e9b98f'; g.lineWidth = 8; g.beginPath(); g.moveTo(cx - bend * 8, shY + 6); g.lineTo(sx - 20, sy + 4); g.moveTo(cx - bend * 8 + 4, shY + 10); g.lineTo(sx + 16, sy + 14); g.stroke();
  if (hit < 0.2) { g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(sx + 36, sy - 10 + i * 10); g.lineTo(sx + 48, sy - 12 + i * 10); g.stroke(); } }
}

// ---------------------------------------------------------------- tapar la carbonera (carbonero)
function mound(g, p, t, hit) {
  g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#58704e'], [1, '#2e3f2a']]); g.fillRect(0, 0, W, H);
  g.fillStyle = '#26361f'; for (let i = 0; i < 8; i++) { g.fillRect(20 + i * 60, 0, 12, 140); }
  g.fillStyle = '#4a3a2a'; g.fillRect(0, 160, W, 40);
  const cx = 240, by = 170, rw = 150, rh = 110;
  g.fillStyle = lin(g, 0, by - rh, 0, by, [[0, '#6a5a44'], [1, '#3e3426']]); g.beginPath(); g.ellipse(cx, by, rw, rh, 0, Math.PI, 0); g.fill();
  // humo de arriba (el bueno: blanco y despacio)
  puff(g, (t * 0.5) % 1.2, cx, by - rh, 'rgba(230,230,225,0.6)', 0.9);
  // las fugas con llama: van quedando tapadas
  const holes = [[-90, -40], [70, -60], [-40, -84], [110, -24], [20, -30], [-120, -14]], open = Math.ceil((1 - p) * holes.length - 1e-6);
  holes.forEach(([dx, dy], i) => {
    const x = cx + dx, y = by + dy;
    if (i < open) { g.fillStyle = '#1a120a'; ell(g, x, y, 9, 6); g.fill(); const fl = 10 + Math.sin(t * 18 + i) * 4; g.fillStyle = lin(g, 0, y - fl - 8, 0, y, [[0, 'rgba(255,220,90,0.2)'], [0.4, '#ffb347'], [1, '#e8501e']]); g.beginPath(); g.moveTo(x - 7, y); g.quadraticCurveTo(x, y - fl * 2.2, x + 7, y); g.fill(); }
    else { g.fillStyle = '#5a4630'; ell(g, x, y - 2, 14, 8); g.fill(); }
  });
  if (hit < 0.3) { g.fillStyle = '#6a5038'; const k = hit / 0.3; for (let i = 0; i < 8; i++) { ell(g, cx + 160 - k * 40 + i * 4, by - 50 - Math.sin(k * Math.PI) * 30 + i * 2, 3, 3); g.fill(); } }
}

// ---------------------------------------------------------------- la herradura en el yunque (herrero)
function anvil(g, p, t, hit, ok) {
  workshop(g, 0.45);
  const cx = 240, ay = 132;
  g.fillStyle = lin(g, 0, ay - 20, 0, ay + 20, [[0, '#6a7078'], [1, '#33373c']]);
  g.beginPath(); g.moveTo(cx - 110, ay - 18); g.lineTo(cx + 70, ay - 18); g.quadraticCurveTo(cx + 130, ay - 16, cx + 140, ay - 4); g.lineTo(cx + 70, ay + 4); g.lineTo(cx + 40, ay + 4); g.lineTo(cx + 50, ay + 50); g.lineTo(cx - 90, ay + 50); g.lineTo(cx - 80, ay + 4); g.lineTo(cx - 110, ay + 4); g.closePath(); g.fill();
  // el hierro: barra recta que se curva en herradura con los golpes
  const k = p, col = 'rgb(255,' + Math.round(140 + 60 * Math.sin(t * 6) * 0.2) + ',50)';
  g.strokeStyle = col; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath();
  for (let i = 0; i <= 24; i++) { const s = i / 24 * 2 - 1, straightX = cx + s * 60, a = s * Math.PI * 0.72, bentX = cx + Math.sin(a) * 26, bentY = ay - 40 - Math.cos(a) * 24; const x = mix(straightX, bentX, k), y = mix(ay - 24, bentY, k); i ? g.lineTo(x, y) : g.moveTo(x, y); }   // abierta hacia abajo, como una U
  g.stroke();
  const sw = hit < 0.2 ? hit / 0.2 : 1;
  g.save(); g.translate(cx + 20, ay - 40 - (1 - sw) * -6); g.rotate(mix(0.1, -0.7, sw)); g.fillStyle = '#4a4e54'; g.fillRect(-16, -10, 32, 18); g.strokeStyle = '#7a4a22'; g.lineWidth = 6; g.beginPath(); g.moveTo(10, 0); g.lineTo(90, -20); g.stroke(); g.restore();
  if (ok && hit < 0.35) { g.fillStyle = '#ffd36a'; const r = rnd(2), q = hit / 0.35; for (let i = 0; i < 14; i++) { const a = -Math.PI * r(), v = 30 + r() * 60; g.fillRect(cx + 10 + Math.cos(a) * v * q, ay - 30 + Math.sin(a) * v * q, 3, 3); } }
}

// ---------------------------------------------------------------- la suela de la alpargata (alpargatero)
function sole(g, p) {
  workshop(g, 0.15);
  const cx = 240, cy = 104, rx = 160, ry = 54;
  g.fillStyle = 'rgba(0,0,0,0.3)'; ell(g, cx + 4, cy + 8, rx, ry); g.fill();
  g.fillStyle = '#d8c08a'; ell(g, cx, cy, rx, ry); g.fill();
  g.strokeStyle = 'rgba(150,120,70,0.6)'; g.lineWidth = 3; for (let k = 1; k < 8; k++) { ell(g, cx, cy, rx * k / 8, ry * k / 8); g.stroke(); }
  const n = Math.round(p * 22);
  g.strokeStyle = '#3a2a1a'; g.lineWidth = 3; g.lineCap = 'round';
  for (let i = 0; i < n; i++) { const a = i / 22 * TAU - Math.PI / 2, x = cx + Math.cos(a) * (rx - 8), y = cy + Math.sin(a) * (ry - 6), nx = Math.cos(a), ny = Math.sin(a); g.beginPath(); g.moveTo(x - nx * 8, y - ny * 6); g.lineTo(x + nx * 4, y + ny * 3); g.stroke(); }
}

const ARTS = {
  chop: (g, p, t, h, o) => chop(g, p, t, h, o, 0), chop2: (g, p, t, h, o) => chop(g, p, t, h, o, 1),
  stone: (g, p, t, h, o) => stone(g, p, t, h, o, 0), ashlar: (g, p, t, h, o) => stone(g, p, t, h, o, 1),
  basket, spin, oven, knead, hoops, quench, lift, mound, anvil, sole,
  dove: (g, p, t, h, o) => doves(g, p, t, h, o, false), net: (g, p, t, h, o) => doves(g, p, t, h, o, true),
};

/** Dibujo de un paso: { canvas, draw(p, hit, ok) } o null si no hay dibujo para ese paso. */
export function tradeArt(id) {
  const fn = ARTS[id]; if (!fn) return null;
  const c = document.createElement('canvas'); c.width = W; c.height = H; c.className = 'mg-art';
  const g = c.getContext('2d'), t0 = performance.now();
  return { canvas: c, draw(p, hit = 9, ok = true) { try { fn(g, Math.max(0, Math.min(1, p)), (performance.now() - t0) / 1000, hit, ok); } catch (e) { /* un dibujo que falla no para el juego */ } } };
}
export const TRADE_ARTS = Object.keys(ARTS);
