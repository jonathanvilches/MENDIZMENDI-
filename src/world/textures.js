// Texturas procedurales (color + relieve -> normal map), todas enlosables
import * as THREE from 'three';
import { mulberry32 } from '../util/math.js';
import { noise2 } from '../util/noise.js';

function canvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }

// Dibuja una forma repitiéndola en los bordes para que la textura se enlose
function wrapDraw(size, x, y, r, fn) {
  for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
    const X = x + dx, Y = y + dy;
    if (X + r < 0 || X - r > size || Y + r < 0 || Y - r > size) continue;
    fn(X, Y);
  }
}

function normalFromHeight(hc, strength = 2) {
  const s = hc.width, g = hc.getContext('2d');
  const src = g.getImageData(0, 0, s, s).data;
  const out = canvas(s), og = out.getContext('2d'), img = og.createImageData(s, s), d = img.data;
  const hAt = (x, y) => src[(((y + s) % s) * s + ((x + s) % s)) * 4] / 255;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const dx = (hAt(x + 1, y) - hAt(x - 1, y)) * strength;
    const dy = (hAt(x, y + 1) - hAt(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1);
    const k = (y * s + x) * 4;
    d[k] = (-dx / l * 0.5 + 0.5) * 255; d[k + 1] = (dy / l * 0.5 + 0.5) * 255; d[k + 2] = (1 / l * 0.5 + 0.5) * 255; d[k + 3] = 255;
  }
  og.putImageData(img, 0, 0);
  return out;
}

function toTex(c, srgb = true, repeat = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

function grain(g, s, amount, rnd, scale = 1) {
  const img = g.getImageData(0, 0, s, s), d = img.data;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const k = (y * s + x) * 4;
    const n = (noise2(x / (9 * scale), y / (9 * scale)) * 0.6 + noise2(x / (3 * scale), y / (3 * scale)) * 0.4) * amount + (rnd() - 0.5) * amount * 0.6;
    d[k] = Math.max(0, Math.min(255, d[k] * (1 + n)));
    d[k + 1] = Math.max(0, Math.min(255, d[k + 1] * (1 + n)));
    d[k + 2] = Math.max(0, Math.min(255, d[k + 2] * (1 + n)));
  }
  g.putImageData(img, 0, 0);
}

const hsl = (h, s, l) => `hsl(${h},${s}%,${l}%)`;

// ---- Piedra de mampostería pirenaica ----
function masonry(size, opt) {
  const rnd = mulberry32(opt.seed || 3);
  const col = canvas(size), hc = canvas(size);
  const g = col.getContext('2d'), h = hc.getContext('2d');
  g.fillStyle = opt.mortar; g.fillRect(0, 0, size, size);
  h.fillStyle = '#202020'; h.fillRect(0, 0, size, size);
  const rows = opt.rows;
  const rh = size / rows;
  for (let r = 0; r < rows; r++) {
    let x = rnd() * 20;
    while (x < size + 10) {
      const w = rh * (1.1 + rnd() * 1.4);
      const y = r * rh + rh / 2 + (rnd() - 0.5) * rh * 0.15;
      const hue = opt.hue + (rnd() - 0.5) * opt.hueVar, sat = opt.sat + (rnd() - 0.5) * 10, lig = opt.light + (rnd() - 0.5) * opt.lightVar;
      const cx = x + w / 2, rx = w / 2 - 1.5 - rnd() * 1.5, ry = rh / 2 - 1.5 - rnd() * 1.5;
      wrapDraw(size, cx, y, w, (X, Y) => {
        g.fillStyle = hsl(hue, sat, lig);
        roundedBlob(g, X, Y, rx, ry, rnd, 0.35);
        const grd = h.createRadialGradient(X, Y - ry * 0.2, 1, X, Y, Math.max(rx, ry));
        grd.addColorStop(0, '#f0f0f0'); grd.addColorStop(0.7, '#b8b8b8'); grd.addColorStop(1, '#505050');
        h.fillStyle = grd; roundedBlob(h, X, Y, rx, ry, rnd, 0.35);
      });
      x += w;
    }
  }
  grain(g, size, 0.22, rnd, 0.8);
  return { map: toTex(col), normalMap: toTex(normalFromHeight(hc, 3.5), false) };
}
function roundedBlob(g, x, y, rx, ry, rnd, rr) {
  g.beginPath();
  const r = Math.min(rx, ry) * rr;
  g.moveTo(x - rx + r, y - ry);
  g.lineTo(x + rx - r, y - ry); g.quadraticCurveTo(x + rx, y - ry, x + rx, y - ry + r);
  g.lineTo(x + rx, y + ry - r); g.quadraticCurveTo(x + rx, y + ry, x + rx - r, y + ry);
  g.lineTo(x - rx + r, y + ry); g.quadraticCurveTo(x - rx, y + ry, x - rx, y + ry - r);
  g.lineTo(x - rx, y - ry + r); g.quadraticCurveTo(x - rx, y - ry, x - rx + r, y - ry);
  g.fill();
}

// ---- Revoco (enlucido) ----
function plaster(size, base, seed) {
  const rnd = mulberry32(seed);
  const col = canvas(size), hc = canvas(size);
  const g = col.getContext('2d'), h = hc.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  h.fillStyle = '#808080'; h.fillRect(0, 0, size, size);
  // manchas y zonas donde asoma la piedra
  for (let i = 0; i < 40; i++) {
    const x = rnd() * size, y = rnd() * size, r = 8 + rnd() * 30;
    wrapDraw(size, x, y, r, (X, Y) => { g.fillStyle = `rgba(120,105,85,${0.03 + rnd() * 0.05})`; g.beginPath(); g.ellipse(X, Y, r, r * 0.7, rnd() * 3, 0, 7); g.fill(); });
  }
  grain(g, size, 0.07, rnd, 1.5);
  const img = h.getImageData(0, 0, size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const v = 128 + noise2(x / 4, y / 4) * 30 + noise2(x / 1.5, y / 1.5) * 18; const k = (y * size + x) * 4; d[k] = d[k + 1] = d[k + 2] = v; }
  h.putImageData(img, 0, 0);
  return { map: toTex(col), normalMap: toTex(normalFromHeight(hc, 1.2), false) };
}

// ---- Tejas / losas ----
function roofTiles(size, opt) {
  const rnd = mulberry32(opt.seed || 9);
  const col = canvas(size), hc = canvas(size);
  const g = col.getContext('2d'), h = hc.getContext('2d');
  const rows = opt.rows, rh = size / rows;
  g.fillStyle = opt.dark; g.fillRect(0, 0, size, size);
  h.fillStyle = '#000'; h.fillRect(0, 0, size, size);
  for (let r = 0; r < rows; r++) {
    const cols = opt.cols, cw = size / cols;
    for (let c = 0; c < cols + 1; c++) {
      const x = c * cw + (r % 2) * cw / 2 + (rnd() - 0.5) * cw * 0.1;
      const y = r * rh;
      const l = opt.light + (rnd() - 0.5) * opt.lightVar, hue = opt.hue + (rnd() - 0.5) * opt.hueVar;
      wrapDraw(size, x, y + rh / 2, cw, (X, Y) => {
        const top = Y - rh / 2;
        const grd = g.createLinearGradient(0, top, 0, top + rh);
        grd.addColorStop(0, hsl(hue, opt.sat, l - 8)); grd.addColorStop(1, hsl(hue, opt.sat, l + 4));
        g.fillStyle = grd;
        g.beginPath();
        if (opt.round) { g.moveTo(X - cw / 2 + 1, top); g.lineTo(X + cw / 2 - 1, top); g.lineTo(X + cw / 2 - 1, top + rh * 0.8); g.quadraticCurveTo(X, top + rh * 1.15, X - cw / 2 + 1, top + rh * 0.8); }
        else { g.moveTo(X - cw / 2 + 1, top); g.lineTo(X + cw / 2 - 1, top); g.lineTo(X + cw / 2 - 2, top + rh - 1); g.lineTo(X - cw / 2 + 2, top + rh - 1); }
        g.closePath(); g.fill();
        const hg = h.createLinearGradient(0, top, 0, top + rh);
        hg.addColorStop(0, '#303030'); hg.addColorStop(1, '#f0f0f0');
        h.fillStyle = hg; h.fill(new Path2D()); h.beginPath();
        h.rect(X - cw / 2 + 1, top, cw - 2, rh - 1); h.fill();
      });
    }
  }
  grain(g, size, 0.15, rnd, 0.7);
  return { map: toTex(col), normalMap: toTex(normalFromHeight(hc, 4), false) };
}

// ---- Madera ----
function wood(size, base, seed) {
  const rnd = mulberry32(seed);
  const col = canvas(size), hc = canvas(size);
  const g = col.getContext('2d'), h = hc.getContext('2d');
  const planks = 6, pw = size / planks;
  for (let p = 0; p < planks; p++) {
    const l = (rnd() - 0.5) * 10;
    g.fillStyle = `hsl(${base[0] + (rnd() - 0.5) * 6},${base[1]}%,${base[2] + l}%)`;
    g.fillRect(p * pw, 0, pw, size);
    h.fillStyle = '#c0c0c0'; h.fillRect(p * pw + 1, 0, pw - 2, size);
    h.fillStyle = '#303030'; h.fillRect(p * pw, 0, 1.5, size);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(p * pw, 0, 1.5, size);
  }
  const img = g.getImageData(0, 0, size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const k = (y * size + x) * 4;
    const n = Math.sin(x * 0.9 + noise2(x / 20, y / 60) * 6) * 0.08 + noise2(x / 3, y / 40) * 0.08;
    d[k] *= 1 + n; d[k + 1] *= 1 + n; d[k + 2] *= 1 + n;
  }
  g.putImageData(img, 0, 0);
  return { map: toTex(col), normalMap: toTex(normalFromHeight(hc, 2), false) };
}

// ---- Suelos para el terreno ----
function cobbles(size) {
  const rnd = mulberry32(21);
  const col = canvas(size), hc = canvas(size);
  const g = col.getContext('2d'), h = hc.getContext('2d');
  g.fillStyle = '#6d665b'; g.fillRect(0, 0, size, size);
  h.fillStyle = '#101010'; h.fillRect(0, 0, size, size);
  // Poisson-ish
  const pts = [];
  for (let t = 0; t < 2400 && pts.length < 150; t++) {
    const x = rnd() * size, y = rnd() * size;
    let ok = true;
    for (const p of pts) { let dx = Math.abs(p[0] - x), dy = Math.abs(p[1] - y); dx = Math.min(dx, size - dx); dy = Math.min(dy, size - dy); if (dx * dx + dy * dy < 17 * 17) { ok = false; break; } }
    if (ok) pts.push([x, y]);
  }
  for (const [x, y] of pts) {
    const r = 8 + rnd() * 3, l = 48 + rnd() * 18, hue = 30 + rnd() * 15;
    wrapDraw(size, x, y, r + 2, (X, Y) => {
      g.fillStyle = hsl(hue, 10 + rnd() * 8, l); roundedBlob(g, X, Y, r, r * (0.8 + rnd() * 0.2), rnd, 0.9);
      const grd = h.createRadialGradient(X - 2, Y - 2, 1, X, Y, r);
      grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#404040');
      h.fillStyle = grd; roundedBlob(h, X, Y, r, r * 0.9, rnd, 0.9);
    });
  }
  grain(g, size, 0.18, rnd, 0.6);
  return { map: toTex(col), normalMap: toTex(normalFromHeight(hc, 3), false) };
}

function groundDetail(size) {
  // canal R: ruido grande, G: ruido fino, B: guijarros para tierra
  const rnd = mulberry32(5);
  const c = canvas(size), g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data;
  const per = (x, y, f) => {
    // ruido periódico
    const a = (x / size) * Math.PI * 2, b = (y / size) * Math.PI * 2;
    return noise2(Math.cos(a) * f + 10, Math.sin(a) * f + Math.cos(b) * f * 0.9 + 3) * 0.5 + noise2(Math.sin(b) * f - 7, Math.cos(b) * f + Math.sin(a) * f * 0.7) * 0.5;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const k = (y * size + x) * 4;
    d[k] = 128 + per(x, y, 1.2) * 120;
    d[k + 1] = 128 + per(x, y, 6) * 110 + (rnd() - 0.5) * 40;
    d[k + 2] = 0; d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // guijarros
  for (let i = 0; i < 380; i++) {
    const x = rnd() * size, y = rnd() * size, r = 1 + rnd() * 3.5;
    wrapDraw(size, x, y, r, (X, Y) => { g.fillStyle = `rgba(0,0,${150 + rnd() * 100},1)`; g.globalCompositeOperation = 'lighter'; g.beginPath(); g.ellipse(X, Y, r, r * 0.8, rnd() * 3, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over'; });
  }
  return toTex(c, false);
}


// ---- Suelo de hierba (vista cenital) ----
// R: briznas (luminancia), G: manchas de trébol, B: florecillas
function grassGround(size) {
  const rnd = mulberry32(17);
  const layer = () => { const c = canvas(size), g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, size, size); return [c, g]; };
  const [cr, gr] = layer(), [cg, gg] = layer(), [cb, gb] = layer();
  gr.fillStyle = 'rgb(96,96,96)'; gr.fillRect(0, 0, size, size);
  const k = size / 512;
  // briznas: trazos cortos en todas direcciones, oscuros abajo y claros arriba
  gr.lineCap = 'round';
  for (let i = 0; i < 9000 * k * k; i++) {
    const x = rnd() * size, y = rnd() * size, a = rnd() * Math.PI * 2, L = (3 + rnd() * 7) * k, v = 40 + rnd() * 215;
    wrapDraw(size, x, y, L, (X, Y) => { gr.strokeStyle = `rgb(${v | 0},${v | 0},${v | 0})`; gr.lineWidth = (0.8 + rnd() * 1.1) * k; gr.beginPath(); gr.moveTo(X, Y); gr.lineTo(X + Math.cos(a) * L, Y + Math.sin(a) * L); gr.stroke(); });
  }
  // tréboles: grupos de tres hojitas
  for (let i = 0; i < 70 * k * k; i++) {
    const x = rnd() * size, y = rnd() * size, n = 3 + (rnd() * 6 | 0);
    for (let j = 0; j < n; j++) {
      const X0 = x + (rnd() - 0.5) * 26 * k, Y0 = y + (rnd() - 0.5) * 26 * k, r = (2.2 + rnd() * 1.6) * k;
      wrapDraw(size, X0, Y0, r * 3, (X, Y) => { gg.fillStyle = `rgb(0,${170 + rnd() * 85 | 0},0)`; for (let l = 0; l < 3; l++) { const a = l * 2.1 + rnd(); gg.beginPath(); gg.arc(X + Math.cos(a) * r, Y + Math.sin(a) * r, r, 0, 7); gg.fill(); } });
    }
  }
  // florecillas: puntitos con centro
  for (let i = 0; i < 90 * k * k; i++) {
    const x = rnd() * size, y = rnd() * size, r = (1.6 + rnd() * 1.6) * k;
    wrapDraw(size, x, y, r * 2, (X, Y) => { gb.fillStyle = 'rgb(0,0,255)'; for (let l = 0; l < 5; l++) { const a = l * 1.2566; gb.beginPath(); gb.arc(X + Math.cos(a) * r * 0.8, Y + Math.sin(a) * r * 0.8, r * 0.62, 0, 7); gb.fill(); } gb.fillStyle = 'rgb(0,0,140)'; gb.beginPath(); gb.arc(X, Y, r * 0.45, 0, 7); gb.fill(); });
  }
  const out = canvas(size), og = out.getContext('2d'), img = og.createImageData(size, size), d = img.data;
  const R = gr.getImageData(0, 0, size, size).data, G = gg.getImageData(0, 0, size, size).data, B = gb.getImageData(0, 0, size, size).data;
  for (let i = 0; i < size * size; i++) { d[i * 4] = R[i * 4]; d[i * 4 + 1] = G[i * 4 + 1]; d[i * 4 + 2] = B[i * 4 + 2]; d[i * 4 + 3] = 255; }
  og.putImageData(img, 0, 0);
  return toTex(out, false);
}

// ---- Roca de montaña: estratos, grietas y líquenes ----
// R: luminancia de la roca, G: líquenes, B: oclusión de grietas
function rockFace(size) {
  const rnd = mulberry32(23);
  const per = (x, y, f) => { const a = (x / size) * Math.PI * 2, b = (y / size) * Math.PI * 2; return noise2(Math.cos(a) * f + 10, Math.sin(a) * f + Math.cos(b) * f * 0.9 + 3) * 0.5 + noise2(Math.sin(b) * f - 7, Math.cos(b) * f + Math.sin(a) * f * 0.7) * 0.5; };
  const c = canvas(size), g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const k = (y * size + x) * 4;
    const warp = per(x, y, 1.5) * 18;
    // estratos: bandas horizontales onduladas de distinto grosor
    const band = Math.sin(((y + warp) / size) * Math.PI * 2 * 7) * 0.5 + Math.sin(((y + warp * 1.7) / size) * Math.PI * 2 * 17) * 0.25;
    const n = per(x, y, 3) * 0.45 + per(x, y, 9) * 0.25 + (rnd() - 0.5) * 0.12;
    d[k] = Math.max(0, Math.min(255, 140 + n * 150 + band * 38));
    d[k + 1] = Math.max(0, Math.min(255, (per(x + 40, y, 4) - 0.25) * 600));
    d[k + 2] = 255; d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // grietas: trazos quebrados, sobre todo verticales, que oscurecen R y B
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < 26; i++) {
    let x = rnd() * size, y = rnd() * size; const steps = 6 + (rnd() * 10 | 0), w = 1 + rnd() * 2.2;
    const pts = [[x, y]]; for (let j = 0; j < steps; j++) { x += (rnd() - 0.5) * 22; y += 8 + rnd() * 16; pts.push([x, y]); }
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      g.strokeStyle = 'rgba(20,0,40,0.85)'; g.lineWidth = w; g.beginPath(); pts.forEach(([px, py], j) => j ? g.lineTo(px + dx, py + dy) : g.moveTo(px + dx, py + dy)); g.stroke();
    }
  }
  // juntas horizontales entre estratos
  for (let i = 0; i < 9; i++) {
    const y0 = rnd() * size; g.strokeStyle = 'rgba(30,0,60,0.6)'; g.lineWidth = 1 + rnd() * 1.5;
    for (const dy of [-size, 0, size]) { g.beginPath(); for (let x = 0; x <= size; x += 8) { const y = y0 + dy + Math.sin(x / size * Math.PI * 4 + i) * 6; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  }
  return toTex(c, false);
}

// ---- Ladrillo de la Ribera ----
function bricks(size) {
  const rnd = mulberry32(31);
  const col = canvas(size), hc = canvas(size);
  const g = col.getContext('2d'), h = hc.getContext('2d');
  g.fillStyle = '#c9b49a'; g.fillRect(0, 0, size, size);
  h.fillStyle = '#303030'; h.fillRect(0, 0, size, size);
  const rows = 16, rh = size / rows, bw = size / 5;
  for (let r = 0; r < rows; r++) for (let c = -1; c < 6; c++) {
    const x = c * bw + (r % 2) * bw / 2, y = r * rh;
    const l = 40 + rnd() * 12, hue = 12 + rnd() * 10;
    g.fillStyle = hsl(hue, 45 + rnd() * 10, l); g.fillRect(x + 1.5, y + 1.5, bw - 3, rh - 3);
    h.fillStyle = '#d0d0d0'; h.fillRect(x + 1.5, y + 1.5, bw - 3, rh - 3);
  }
  grain(g, size, 0.16, rnd, 0.6);
  return { map: toTex(col), normalMap: toTex(normalFromHeight(hc, 2.5), false) };
}

export const TEX = {};
export function buildTextures(quality = 'high') {
  const S = quality === 'low' ? 256 : 512;
  TEX.stoneWall = masonry(S, { seed: 3, rows: 9, mortar: '#8d8375', hue: 36, hueVar: 16, sat: 14, light: 62, lightVar: 18 });
  TEX.stoneDark = masonry(S, { seed: 7, rows: 8, mortar: '#6f685f', hue: 30, hueVar: 14, sat: 9, light: 50, lightVar: 16 });
  TEX.ashlar = masonry(S, { seed: 11, rows: 7, mortar: '#9d9281', hue: 38, hueVar: 8, sat: 20, light: 68, lightVar: 10 });
  TEX.plasterWhite = plaster(S, '#ede6d8', 1);
  TEX.plasterCream = plaster(S, '#e6d4b4', 2);
  TEX.roofSlate = roofTiles(S, { seed: 4, rows: 16, cols: 8, dark: '#1f2126', hue: 220, hueVar: 12, sat: 8, light: 30, lightVar: 10 });
  TEX.roofTile = roofTiles(S, { seed: 5, rows: 14, cols: 9, dark: '#3d1d14', hue: 12, hueVar: 10, sat: 45, light: 38, lightVar: 12, round: true });
  TEX.wood = wood(S / 2, [25, 42, 30], 8);
  TEX.woodDark = wood(S / 2, [20, 35, 20], 12);
  TEX.cobble = cobbles(S);
  TEX.brick = bricks(S);
  TEX.plasterOcher = plaster(S, '#e3c48f', 3);
  TEX.plasterRose = plaster(S, '#e6b9a0', 4);
  TEX.plasterBlue = plaster(S, '#c9d6de', 5);
  TEX.detail = groundDetail(S);
  TEX.grass = grassGround(S);
  TEX.rock = rockFace(S);
  return TEX;
}
