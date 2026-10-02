// Texturas dibujadas para el encierro: adoquín de granito de la Estafeta, sillería del zócalo, ladrillo de la plaza,
// madera del vallado y las puertas, y revoco de las fachadas. Cada una lleva su mapa de relieve (normal) y de
// rugosidad, calculados a partir de un mapa de alturas dibujado a la vez que el color.
import * as THREE from 'three';

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// lienzo de color + lienzo de alturas (gris) + lienzo de rugosidad (gris), del mismo tamaño
function layers(n) {
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = n; return [c, c.getContext('2d', { willReadFrequently: true })]; };
  const [cc, cg] = mk(), [hc, hg] = mk(), [rc, rg] = mk();
  return { n, cc, cg, hc, hg, rc, rg };
}
// mapa de normales desde las alturas (diferencias centrales, con repetición en los bordes)
function normalFrom(hc, strength) {
  const n = hc.width, src = hc.getContext('2d').getImageData(0, 0, n, n).data;
  const out = document.createElement('canvas'); out.width = out.height = n; const og = out.getContext('2d'), img = og.createImageData(n, n), d = img.data;
  const H = (x, y) => src[(((y + n) % n) * n + ((x + n) % n)) * 4] / 255;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * n + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  og.putImageData(img, 0, 0); return out;
}
function finish(L, strength, repeat) {
  const wrap = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (repeat) t.repeat.set(...repeat); return t; };
  return { map: wrap(L.cc, true), normalMap: wrap(normalFrom(L.hc, strength)), roughnessMap: wrap(L.rc) };
}
// motas y vetas que dan grano a cualquier superficie
function grain(g, n, r, count, alpha, light = 255, dark = 0) {
  for (let i = 0; i < count; i++) { const v = r() < 0.5 ? dark : light; g.fillStyle = `rgba(${v},${v},${v},${alpha * r()})`; const s = 0.6 + r() * 1.8; g.fillRect(r() * n, r() * n, s, s); }
}
// forma con bordes gastados: polígono redondeado y algo irregular
function stonePath(g, x, y, w, h, r, rad) {
  const k = 10, pts = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < k; j++) {
    const t = j / k, j2 = (r() - 0.5) * rad * 0.5;
    if (i === 0) pts.push([x + rad + t * (w - 2 * rad), y + j2]);
    if (i === 1) pts.push([x + w + j2, y + rad + t * (h - 2 * rad)]);
    if (i === 2) pts.push([x + w - rad - t * (w - 2 * rad), y + h + j2]);
    if (i === 3) pts.push([x + j2, y + h - rad - t * (h - 2 * rad)]);
  }
  g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath();
}

/** Adoquín de granito gris de la Estafeta: hileras de piedras rectangulares atravesadas, juntas de arena oscura,
 *  piedras abombadas y pulidas por el paso de la gente (más brillantes en el centro). Un tile = 1,6 m. */
export function cobbleSet(repeat) {
  const L = layers(1024), { n, cg, hg, rg } = L, r = rng(31);
  cg.fillStyle = '#4b4741'; cg.fillRect(0, 0, n, n);
  hg.fillStyle = '#000'; hg.fillRect(0, 0, n, n);
  rg.fillStyle = '#f4f4f4'; rg.fillRect(0, 0, n, n);
  grain(cg, n, r, 9000, 0.25, 120, 30);
  const rows = 14, rh = n / rows;
  for (let row = 0; row < rows; row++) {
    let x = -r() * 60;
    while (x < n) {
      const w = 70 + r() * 55, y = row * rh, gap = 6 + r() * 3;
      for (const ox of [0, x + w > n ? -n : null].filter(v => v !== null)) {
        const X = x + ox + gap / 2, Y = y + gap / 2, W = w - gap, Hh = rh - gap;
        // color: granito gris con matiz (azulado, ocre o rosado) y algo de suciedad
        const base = 112 + r() * 46, tint = r(), cr = base + (tint < 0.3 ? 8 : tint < 0.5 ? -4 : 0), cgc = base + (tint < 0.3 ? 2 : 0), cb = base + (tint < 0.5 && tint >= 0.3 ? 10 : -6);
        stonePath(cg, X, Y, W, Hh, r, 9); cg.fillStyle = `rgb(${cr | 0},${cgc | 0},${cb | 0})`; cg.fill();
        cg.save(); stonePath(cg, X, Y, W, Hh, r, 9); cg.clip();
        grain(cg, n, r, 260, 0.5, 225, 40);                                  // cristales del granito
        const sh = cg.createLinearGradient(0, Y, 0, Y + Hh); sh.addColorStop(0, 'rgba(255,255,255,0.10)'); sh.addColorStop(1, 'rgba(0,0,0,0.18)'); cg.fillStyle = sh; cg.fillRect(X, Y, W, Hh);
        cg.restore();
        // altura: abombada, más alta en el centro de la piedra
        const hgd = hg.createRadialGradient(X + W / 2, Y + Hh / 2, 2, X + W / 2, Y + Hh / 2, Math.max(W, Hh) * 0.62);
        const top = 175 + r() * 60; hgd.addColorStop(0, `rgb(${top},${top},${top})`); hgd.addColorStop(1, 'rgb(70,70,70)');
        stonePath(hg, X, Y, W, Hh, r, 9); hg.fillStyle = hgd; hg.fill();
        // rugosidad: la cara de la piedra pulida por el paso (más lisa), las juntas ásperas
        const rv = 120 + r() * 60 | 0; stonePath(rg, X, Y, W, Hh, r, 9); rg.fillStyle = `rgb(${rv},${rv},${rv})`; rg.fill();
      }
      x += w;
    }
  }
  // desconchones y manchas de los años (y de alguna noche de fiestas)
  for (let i = 0; i < 40; i++) { const x = r() * n, y = r() * n, rr = 6 + r() * 30, gr = cg.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(40,34,28,${0.08 + r() * 0.12})`); gr.addColorStop(1, 'rgba(40,34,28,0)'); cg.fillStyle = gr; cg.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  return finish(L, 6, repeat);
}

/** Adoquín de hormigón gris del callejón de la plaza: piezas que encajan entre sí, con los cantos en zigzag, a
 *  matajunta, en grises distintos y con manchas. Un tile = 1,8 m (piezas de unos 22 × 11 cm). */
export function paverSet(repeat) {
  const L = layers(1024), { n, cg, hg, rg } = L, r = rng(53);
  cg.fillStyle = '#4e4d4a'; cg.fillRect(0, 0, n, n); hg.fillStyle = '#000'; hg.fillRect(0, 0, n, n); rg.fillStyle = '#f0f0f0'; rg.fillRect(0, 0, n, n);
  const PW = 128, PH = 64, A = 7, rows = n / PH;                 // pieza de 128 × 64 px; los cantos largos ondulan
  const wave = (x) => A * Math.sin(x / PW * Math.PI * 4);        // el canto largo compartido por dos hileras (encajan)
  const zig = (y, x0) => { const t = ((y % PH) + PH) % PH / PH; return x0 + (t < 0.5 ? t : 1 - t) * 2 * 10 - 5; };   // canto corto en zigzag
  const piece = (g, x0, y0) => {
    g.beginPath();
    for (let x = x0; x <= x0 + PW; x += 4) g.lineTo(x, y0 + wave(x));
    for (let y = y0; y <= y0 + PH; y += 4) g.lineTo(zig(y, x0 + PW), y);
    for (let x = x0 + PW; x >= x0; x -= 4) g.lineTo(x, y0 + PH + wave(x));
    for (let y = y0 + PH; y >= y0; y -= 4) g.lineTo(zig(y, x0), y);
    g.closePath();
  };
  for (let row = -1; row <= rows; row++) {
    const off = row % 2 ? PW / 2 : 0;
    for (let x = -PW + off; x < n + PW; x += PW) {
      const y = row * PH, base = 96 + r() * 40, warm = (r() - 0.5) * 8;
      for (const [dx, dy] of [[0, 0], [-n, 0], [n, 0], [0, -n], [0, n]]) {
        cg.save(); cg.translate(dx, dy);
        piece(cg, x, y); cg.fillStyle = `rgb(${base + warm | 0},${base | 0},${base - warm * 0.5 + 3 | 0})`; cg.fill();
        cg.lineWidth = 4; cg.strokeStyle = 'rgba(40,40,38,0.9)'; cg.stroke();
        hg.save(); hg.translate(dx, dy); piece(hg, x, y); const hv = 170 + r() * 50 | 0; hg.fillStyle = `rgb(${hv},${hv},${hv})`; hg.fill(); hg.lineWidth = 6; hg.strokeStyle = '#2a2a2a'; hg.stroke(); hg.restore();
        rg.save(); rg.translate(dx, dy); piece(rg, x, y); const rv = 170 + r() * 50 | 0; rg.fillStyle = `rgb(${rv},${rv},${rv})`; rg.fill(); rg.restore();
        cg.restore();
      }
    }
  }
  grain(cg, n, r, 16000, 0.22, 200, 40);   // árido del hormigón
  for (let i = 0; i < 26; i++) { const x = r() * n, y = r() * n, rr = 20 + r() * 70, gr = cg.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(30,28,26,${0.1 + r() * 0.12})`); gr.addColorStop(1, 'rgba(30,28,26,0)'); cg.fillStyle = gr; cg.fillRect(x - rr, y - rr, rr * 2, rr * 2); }   // manchas
  return finish(L, 5, repeat);
}

/** Letrero pintado en una tabla del vallado («RESERVADO PRENSA»), en blanco a plantilla. */
export function stencilTex(text = 'RESERVADO PRENSA') {
  const [c, g] = canvas(1024, 96);
  g.clearRect(0, 0, 1024, 96); g.fillStyle = 'rgba(245,242,232,0.92)'; g.font = '900 64px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 512, 52);
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; for (let i = 0; i < 260; i++) g.fillRect(Math.random() * 1024, Math.random() * 96, 2 + Math.random() * 6, 2 + Math.random() * 3);   // pintura gastada
  const t = tex(c); return t;
}
/** La banda roja sobre la entrada del callejón a la plaza, con el nombre en euskera y castellano. */
export function bandTex() {
  const [c, g] = canvas(1024, 256);
  g.fillStyle = '#b3201b'; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.06})`; g.fillRect(Math.random() * 1024, Math.random() * 256, 2, 2); }
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 236, 1024, 20); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, 1024, 8);
  g.fillStyle = '#f6f1e6'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 54px Georgia, serif';
  g.fillText('ZEZEN PLAZA · PLAZA DE TOROS', 512, 92);
  g.font = 'italic 600 34px Georgia, serif'; g.fillText('Iruña · Pamplona', 512, 168);
  return tex(c);
}
/** Carteles de la fachada junto a la entrada (visitas, horarios), blancos con cabecera roja o azul. */
export function boardTex(kind = 0) {
  const [c, g] = canvas(256, 384);
  g.fillStyle = kind ? '#1f2c4a' : '#f4f1ea'; g.fillRect(0, 0, 256, 384);
  g.fillStyle = kind ? '#c8a24a' : '#b3201b'; g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#ffffff'; g.font = '800 26px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(kind ? 'VISITA GUIADA' : 'ZEZEN PLAZA', 128, 34);
  g.fillStyle = kind ? '#e8e4da' : '#3a3530'; g.font = '600 18px Arial, sans-serif'; g.textAlign = 'left';
  for (let i = 0; i < 9; i++) g.fillRect(24, 96 + i * 28, 140 + (i * 37 % 70), 8);
  if (!kind) { g.fillStyle = '#b3201b'; g.fillRect(24, 350, 208, 10); }
  return tex(c);
}

/** Sillería de piedra arenisca (zócalos y esquinas): sillares grandes, juntas de mortero claro. Tile = 2,2 m. */
export function ashlarSet() {
  const L = layers(512), { n, cg, hg, rg } = L, r = rng(7);
  cg.fillStyle = '#b8ad98'; cg.fillRect(0, 0, n, n); hg.fillStyle = '#404040'; hg.fillRect(0, 0, n, n); rg.fillStyle = '#ececec'; rg.fillRect(0, 0, n, n);
  const rows = 4, rh = n / rows;
  for (let row = 0; row < rows; row++) {
    let x = (row % 2) * -90;
    while (x < n) {
      const w = 140 + r() * 60, gap = 5;
      for (const ox of [0, x + w > n ? -n : null].filter(v => v !== null)) {
        const X = x + ox + gap / 2, Y = row * rh + gap / 2, W = w - gap, Hh = rh - gap, v = 150 + r() * 40;
        stonePath(cg, X, Y, W, Hh, r, 5); cg.fillStyle = `rgb(${v + 14 | 0},${v + 4 | 0},${v - 14 | 0})`; cg.fill();
        cg.save(); stonePath(cg, X, Y, W, Hh, r, 5); cg.clip(); grain(cg, n, r, 600, 0.35, 230, 70);
        for (let k = 0; k < 3; k++) { const yy = Y + r() * Hh; cg.strokeStyle = 'rgba(90,75,60,0.15)'; cg.lineWidth = 1 + r() * 2; cg.beginPath(); cg.moveTo(X, yy); cg.bezierCurveTo(X + W * 0.3, yy + 6, X + W * 0.6, yy - 6, X + W, yy + 3); cg.stroke(); }   // estratos
        cg.restore();
        const hv = 160 + r() * 50 | 0; stonePath(hg, X, Y, W, Hh, r, 5); hg.fillStyle = `rgb(${hv},${hv},${hv})`; hg.fill();
        stonePath(rg, X, Y, W, Hh, r, 5); rg.fillStyle = 'rgb(210,210,210)'; rg.fill();
      }
      x += w;
    }
  }
  return finish(L, 3);
}

/** Ladrillo macizo rojizo de la plaza de toros, con llagas de mortero. Tile = 2,2 m. */
export function brickSet() {
  const L = layers(512), { n, cg, hg, rg } = L, r = rng(13);
  cg.fillStyle = '#d8ccb6'; cg.fillRect(0, 0, n, n); hg.fillStyle = '#303030'; hg.fillRect(0, 0, n, n); rg.fillStyle = '#f0f0f0'; rg.fillRect(0, 0, n, n);
  const rows = 32, rh = n / rows, bw = n / 8;
  for (let row = 0; row < rows; row++) for (let k = -1; k < 9; k++) {
    const X = k * bw + (row % 2) * bw / 2 + 2, Y = row * rh + 2, W = bw - 4, Hh = rh - 4, v = r();
    const c = v < 0.15 ? [120, 52, 36] : v < 0.4 ? [176, 84, 56] : [158, 74, 50];
    cg.fillStyle = `rgb(${c[0] + r() * 20 | 0},${c[1] + r() * 12 | 0},${c[2] + r() * 10 | 0})`; cg.fillRect(X, Y, W, Hh);
    const hv = 190 + r() * 40 | 0; hg.fillStyle = `rgb(${hv},${hv},${hv})`; hg.fillRect(X, Y, W, Hh);
    rg.fillStyle = 'rgb(205,205,205)'; rg.fillRect(X, Y, W, Hh);
  }
  grain(cg, n, r, 5000, 0.25, 220, 40);
  return finish(L, 3);
}

/** Tablas de madera (vallado del encierro, puertas, contraventanas): vetas y nudos. Tile = 2,2 m. */
export function woodSet() {
  const L = layers(512), { n, cg, hg, rg } = L, r = rng(19);
  cg.fillStyle = '#9a7a52'; cg.fillRect(0, 0, n, n); hg.fillStyle = '#808080'; hg.fillRect(0, 0, n, n); rg.fillStyle = '#c8c8c8'; rg.fillRect(0, 0, n, n);
  const planks = 6, ph = n / planks;
  for (let p = 0; p < planks; p++) {
    const v = 0.85 + r() * 0.3; cg.fillStyle = `rgb(${154 * v | 0},${118 * v | 0},${80 * v | 0})`; cg.fillRect(0, p * ph, n, ph);
    for (let k = 0; k < 26; k++) {   // vetas a lo largo
      const y = p * ph + r() * ph, a = 0.08 + r() * 0.14; cg.strokeStyle = `rgba(60,38,20,${a})`; cg.lineWidth = 0.6 + r() * 1.8;
      cg.beginPath(); cg.moveTo(0, y); for (let x = 0; x <= n; x += 32) cg.lineTo(x, y + Math.sin(x * 0.02 + k) * 2.5); cg.stroke();
      hg.strokeStyle = 'rgba(40,40,40,0.25)'; hg.lineWidth = 1; hg.beginPath(); hg.moveTo(0, y); for (let x = 0; x <= n; x += 32) hg.lineTo(x, y + Math.sin(x * 0.02 + k) * 2.5); hg.stroke();
    }
    if (r() < 0.7) { const x = r() * n, y = p * ph + ph * (0.3 + r() * 0.4); cg.fillStyle = 'rgba(70,42,22,0.6)'; cg.beginPath(); cg.ellipse(x, y, 7 + r() * 6, 4 + r() * 3, 0, 0, 7); cg.fill(); }
    cg.fillStyle = 'rgba(30,18,10,0.7)'; cg.fillRect(0, p * ph, n, 3); hg.fillStyle = '#000'; hg.fillRect(0, p * ph, n, 4);   // junta entre tablas
  }
  return finish(L, 3);
}

/** Revoco de fachada (se tiñe con el color de cada casa): grumos, manchas de humedad bajo los balcones,
 *  desconchones con la piedra asomando. Tile = 2,2 m. */
export function plasterSet() {
  const L = layers(512), { n, cg, hg, rg } = L, r = rng(5);
  cg.fillStyle = '#f2f0ea'; cg.fillRect(0, 0, n, n); hg.fillStyle = '#808080'; hg.fillRect(0, 0, n, n); rg.fillStyle = '#e8e8e8'; rg.fillRect(0, 0, n, n);
  grain(cg, n, r, 14000, 0.22, 255, 150); grain(hg, n, r, 16000, 0.5, 200, 60);
  for (let i = 0; i < 16; i++) { const x = r() * n, y = r() * n, rr = 20 + r() * 60, gr = cg.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(150,135,115,0.16)'); gr.addColorStop(1, 'rgba(150,135,115,0)'); cg.fillStyle = gr; cg.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  for (let i = 0; i < 10; i++) {   // chorretones de humedad
    const x = r() * n, y = r() * n * 0.6, h = 40 + r() * 120, gr = cg.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, 'rgba(110,100,85,0.18)'); gr.addColorStop(1, 'rgba(110,100,85,0)'); cg.fillStyle = gr; cg.fillRect(x, y, 4 + r() * 10, h);
  }
  for (let i = 0; i < 2; i++) {   // desconchones: asoma la piedra
    const x = r() * n, y = r() * n, w = 10 + r() * 18, h = 6 + r() * 12;
    stonePath(cg, x, y, w, h, r, 4); cg.fillStyle = 'rgba(150,130,108,0.9)'; cg.fill();
    stonePath(hg, x, y, w, h, r, 4); hg.fillStyle = '#303030'; hg.fill();
  }
  return finish(L, 2);
}

// ---------- piezas de fachada con su propio dibujo (cada una ocupa toda la textura) ----------
const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };

/** Ventana de balcón: marco blanco, seis cristales que reflejan el cielo y, a veces, visillos. */
export function windowTex(variant = 0) {
  const [c, g] = canvas(128, 256), r = rng(40 + variant);
  g.fillStyle = '#f1ece0'; g.fillRect(0, 0, 128, 256);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
    const x = 12 + col * 54, y = 12 + row * 80, w = 50, h = 74;
    const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#9fc0d8'); gr.addColorStop(0.45, '#4a6378'); gr.addColorStop(1, '#22303c'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.moveTo(x + w * 0.2, y); g.lineTo(x + w * 0.45, y); g.lineTo(x, y + h * 0.5); g.lineTo(x, y + h * 0.25); g.fill();   // brillo
  }
  if (variant % 3 !== 2) {   // visillos de encaje
    g.fillStyle = variant % 3 ? 'rgba(250,246,236,0.75)' : 'rgba(222,70,60,0.55)';
    for (const side of [0, 1]) { g.beginPath(); const x0 = side ? 116 : 12; g.moveTo(x0, 12); g.quadraticCurveTo(64, 100 + r() * 40, x0, 244); g.lineTo(x0, 12); g.fill(); }
  }
  g.strokeStyle = '#d8d0bd'; g.lineWidth = 3; g.strokeRect(4, 4, 120, 248);
  return tex(c);
}
/** Barandilla de hierro forjado del balcón (con transparencia). */
export function railingTex() {
  const [c, g] = canvas(256, 128);
  g.clearRect(0, 0, 256, 128); g.strokeStyle = '#1c1a18'; g.fillStyle = '#1c1a18';
  g.lineWidth = 7; g.strokeRect(4, 6, 248, 118);
  g.lineWidth = 3; for (let x = 16; x < 250; x += 14) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x, 120); g.stroke(); }
  g.lineWidth = 2.5; for (let x = 23; x < 244; x += 28) { g.beginPath(); g.ellipse(x, 64, 7, 16, 0, 0, 7); g.stroke(); }   // volutas
  g.fillRect(4, 20, 248, 4);
  const t = tex(c); return t;
}
/** Bajos de las casas: portal de madera, bar, pastelería, tienda de recuerdos o alpargatería (nombres inventados), y
 *  los comercios cerrados como en cualquier mañana de encierro: persiana metálica bajada o tablas de protección. */
export const SHOPS = ['portal', 'bar', 'pasteleria', 'recuerdos', 'alpargatas', 'portal2', 'persiana', 'tablas'];
export function shopTex(kind) {
  const [c, g] = canvas(256, 320), r = rng(kind.length * 7 + 3);
  if (kind === 'persiana') {
    // persiana metálica enrollable: lamas onduladas con brillo, guías laterales, cajón arriba y cerrojo abajo
    g.fillStyle = '#8c9196'; g.fillRect(0, 0, 256, 320);
    for (let y = 30; y < 316; y += 9) { const gr = g.createLinearGradient(0, y, 0, y + 9); gr.addColorStop(0, '#b8bdc2'); gr.addColorStop(0.45, '#8e9398'); gr.addColorStop(0.55, '#6e7378'); gr.addColorStop(1, '#a2a7ac'); g.fillStyle = gr; g.fillRect(8, y, 240, 9); }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '60,50,40' : '255,255,255'},${0.05 + r() * 0.08})`; g.fillRect(8 + r() * 240, 30 + r() * 286, 1 + r() * 3, 1); }   // óxido y roces
    g.fillStyle = 'rgba(90,60,40,0.18)'; g.fillRect(8, 280, 240, 36);   // suciedad abajo
    g.fillStyle = '#5a5f64'; g.fillRect(0, 0, 256, 30); g.fillStyle = '#74797e'; g.fillRect(0, 26, 256, 4);   // cajón
    g.fillStyle = '#4a4e52'; g.fillRect(0, 30, 8, 290); g.fillRect(248, 30, 8, 290);   // guías
    g.fillStyle = '#3a3d40'; g.fillRect(118, 300, 20, 12); g.fillStyle = '#c9a24a'; g.fillRect(124, 303, 8, 6);   // cerrojo
    return tex(c);
  }
  if (kind === 'tablas') {
    // tablas de madera clavadas delante del escaparate para proteger el cristal durante el encierro
    g.fillStyle = '#3a2a1e'; g.fillRect(0, 0, 256, 320);
    for (let y = 6, i = 0; y < 318; y += 38, i++) {
      const col = ['#a0794a', '#8f6a40', '#b08654', '#977048'][i % 4]; g.fillStyle = col; g.fillRect(4, y, 248, 33);
      g.strokeStyle = 'rgba(60,35,15,0.35)'; g.lineWidth = 1; for (let k = 0; k < 9; k++) { const yy = y + 3 + r() * 27; g.beginPath(); g.moveTo(4, yy); g.bezierCurveTo(80, yy + (r() - 0.5) * 6, 170, yy + (r() - 0.5) * 6, 252, yy + (r() - 0.5) * 4); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(4, y + 31, 248, 2);
      g.fillStyle = '#2a2622'; for (const x of [22, 128, 234]) { g.beginPath(); g.arc(x, y + 16, 2.5, 0, 7); g.fill(); }   // clavos
    }
    g.fillStyle = '#6a4a2e'; g.fillRect(20, 0, 26, 320); g.fillRect(210, 0, 26, 320);   // listones verticales
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(46, 0, 3, 320); g.fillRect(236, 0, 3, 320);
    return tex(c);
  }
  // marco de piedra
  g.fillStyle = '#b9ad96'; g.fillRect(0, 0, 256, 320);
  for (let i = 0; i < 1200; i++) { const v = 140 + r() * 80 | 0; g.fillStyle = `rgba(${v},${v - 6},${v - 18},0.35)`; g.fillRect(r() * 256, r() * 320, 2, 2); }
  const wood = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + w * k / 4, y); g.lineTo(x + w * k / 4, y + h); g.stroke(); } g.strokeStyle = 'rgba(255,255,255,0.08)'; for (let k = 0; k < 30; k++) { const xx = x + r() * w; g.beginPath(); g.moveTo(xx, y); g.lineTo(xx + (r() - 0.5) * 4, y + h); g.stroke(); } };
  const glass = (x, y, w, h) => { const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#a8c4d6'); gr.addColorStop(0.5, '#3e5466'); gr.addColorStop(1, '#1e2a34'); g.fillStyle = gr; g.fillRect(x, y, w, h); };
  const sign = (text, bg, fg) => { g.fillStyle = bg; g.fillRect(14, 14, 228, 50); g.strokeStyle = '#d8b25a'; g.lineWidth = 3; g.strokeRect(18, 18, 220, 42); g.fillStyle = fg; g.font = '900 30px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 41); };
  if (kind === 'portal' || kind === 'portal2') {
    // portal de madera con arco de medio punto y llamador
    g.fillStyle = '#2a1a10'; g.beginPath(); g.moveTo(40, 320); g.lineTo(40, 110); g.arc(128, 110, 88, Math.PI, 0); g.lineTo(216, 320); g.fill();
    g.save(); g.beginPath(); g.moveTo(48, 320); g.lineTo(48, 112); g.arc(128, 112, 80, Math.PI, 0); g.lineTo(208, 320); g.clip();
    wood(48, 30, 160, 290, kind === 'portal' ? '#6a3e22' : '#3e5a3a'); g.restore();
    g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(100, 210, 6, 0, 7); g.fill(); g.beginPath(); g.arc(156, 210, 6, 0, 7); g.fill();
    g.strokeStyle = '#8a7a62'; g.lineWidth = 4; for (let a = 0; a < 9; a++) { const t = Math.PI + a * Math.PI / 8; g.beginPath(); g.moveTo(128 + Math.cos(t) * 88, 110 + Math.sin(t) * 88); g.lineTo(128 + Math.cos(t) * 104, 110 + Math.sin(t) * 104); g.stroke(); }   // dovelas
  } else {
    const T = { bar: ['BAR TXOKO', '#7a1c1c', '#f4e6c8'], pasteleria: ['PASTELERÍA', '#2e4a3a', '#f4e6c8'], recuerdos: ['SAN FERMÍN', '#d42f2f', '#ffffff'], alpargatas: ['ALPARGATAS', '#2a2a44', '#f4e6c8'] }[kind];
    sign(...T);
    wood(20, 74, 216, 246, '#5a3420');
    glass(34, 88, 110, 150); glass(156, 88, 66, 232);   // escaparate y puerta acristalada
    if (kind === 'bar') { for (let i = 0; i < 6; i++) { g.fillStyle = ['#7a3a1a', '#3a6a2a', '#c9a24a'][i % 3]; g.fillRect(44 + i * 16, 190, 10, 40); } g.fillStyle = '#e8d6a8'; g.fillRect(40, 228, 98, 8); }
    if (kind === 'pasteleria') { for (let i = 0; i < 5; i++) { g.fillStyle = ['#e8b070', '#f4e0c0', '#8a4a2a'][i % 3]; g.beginPath(); g.ellipse(52 + i * 20, 220, 9, 6, 0, 0, 7); g.fill(); } }
    if (kind === 'recuerdos') { for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#d42f2f' : '#ffffff'; g.beginPath(); g.moveTo(44 + i * 24, 100); g.lineTo(64 + i * 24, 100); g.lineTo(54 + i * 24, 130); g.fill(); } }
    if (kind === 'alpargatas') { for (let i = 0; i < 4; i++) { g.fillStyle = '#efe6d0'; g.beginPath(); g.ellipse(56 + i * 24, 214, 10, 5, 0, 0, 7); g.fill(); g.strokeStyle = '#d42f2f'; g.lineWidth = 2; g.beginPath(); g.moveTo(48 + i * 24, 214); g.lineTo(52 + i * 24, 196); g.stroke(); } }
    g.fillStyle = '#c9a24a'; g.fillRect(212, 200, 5, 26);
  }
  return tex(c);
}
/** Placa de la calle, bilingüe como en Pamplona. */
export function plaqueTex() {
  const [c, g] = canvas(256, 128);
  g.fillStyle = '#f4efe2'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#1e3a6a'; g.lineWidth = 6; g.strokeRect(6, 6, 244, 116);
  g.fillStyle = '#1e3a6a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 18px Georgia, serif'; g.fillText('CALLE', 128, 30);
  g.font = '900 38px Georgia, serif'; g.fillText('ESTAFETA', 128, 66);
  g.font = 'italic 700 18px Georgia, serif'; g.fillText('KALEA', 128, 100);
  return tex(c);
}

/** Arena (albero) del ruedo: ocre, con marcas del rastrillo y las rayas de picar blancas. */
export function sandTex() {
  const [c, g] = canvas(1024, 1024), r = rng(77);
  g.fillStyle = '#c9965a'; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 30000; i++) { const v = r(); g.fillStyle = v < 0.5 ? `rgba(240,200,140,${0.25 * r()})` : `rgba(120,80,40,${0.25 * r()})`; g.fillRect(r() * 1024, r() * 1024, 1 + r() * 2, 1 + r() * 2); }
  g.strokeStyle = 'rgba(150,105,60,0.22)'; g.lineWidth = 2;
  for (let k = 0; k < 60; k++) { g.beginPath(); g.arc(512, 512, 40 + k * 8 + r() * 3, 0, 7); g.stroke(); }   // rastrillo en círculos
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 5;
  for (const rr of [330, 400]) { g.setLineDash([22, 14]); g.beginPath(); g.arc(512, 512, rr, 0, 7); g.stroke(); }   // rayas de picar
  g.setLineDash([]);
  for (let i = 0; i < 25; i++) { const x = r() * 1024, y = r() * 1024, rr = 20 + r() * 50, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(110,70,35,0.25)'); gr.addColorStop(1, 'rgba(110,70,35,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }   // huellas
  const t = tex(c); return t;
}
/** Arco de la galería de la plaza (con transparencia en el hueco). */
export function archTex() {
  const [c, g] = canvas(128, 256);
  g.fillStyle = '#efe6d2'; g.fillRect(0, 0, 128, 256);
  g.fillStyle = '#d8ccb4'; for (let y = 0; y < 256; y += 24) g.fillRect(0, y, 128, 2);
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(22, 256); g.lineTo(22, 90); g.arc(64, 90, 42, Math.PI, 0); g.lineTo(106, 256); g.fill();
  g.globalCompositeOperation = 'source-over'; g.strokeStyle = '#b8ab92'; g.lineWidth = 6; g.beginPath(); g.moveTo(22, 256); g.lineTo(22, 90); g.arc(64, 90, 42, Math.PI, 0); g.lineTo(106, 256); g.stroke();
  return tex(c);
}
/** Banderines de fiestas (rojo, blanco y verde) y bandera de Navarra. */
export function flagNavarraTex() {
  const [c, g] = canvas(256, 160);
  g.fillStyle = '#c8102e'; g.fillRect(0, 0, 256, 160);
  g.strokeStyle = '#e8c04a'; g.lineWidth = 6; g.beginPath(); g.arc(128, 86, 42, 0, 7); g.stroke();
  g.lineWidth = 4; for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; g.beginPath(); g.moveTo(128, 86); g.lineTo(128 + Math.cos(t) * 40, 86 + Math.sin(t) * 40); g.stroke(); }   // cadenas
  g.fillStyle = '#4ca04a'; g.beginPath(); g.arc(128, 86, 8, 0, 7); g.fill();
  g.fillStyle = '#e8c04a'; g.beginPath(); g.moveTo(104, 40); g.lineTo(110, 22); g.lineTo(120, 34); g.lineTo(128, 18); g.lineTo(136, 34); g.lineTo(146, 22); g.lineTo(152, 40); g.fill();   // corona
  return tex(c);
}
