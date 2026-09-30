// Texturas procedurales (color + relieve -> normal map), todas enlosables
import * as THREE from 'three';
import { mulberry32 } from '../util/math.js';
import { noise2 } from '../util/noise.js';

// willReadFrequently: el lienzo vive en memoria normal, así leer sus píxeles (grano, relieve) no
// obliga a traerlos de la tarjeta gráfica, que es muy lento
function canvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d', { willReadFrequently: true }); return c; }

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
  // empedrado en hileras: piedras redondeadas de tamaños y tonos variados, juntas oscuras con arena
  const rnd = mulberry32(21);
  const col = canvas(size), hc = canvas(size);
  const g = col.getContext('2d'), h = hc.getContext('2d');
  g.fillStyle = '#5a5046'; g.fillRect(0, 0, size, size);
  h.fillStyle = '#0c0c0c'; h.fillRect(0, 0, size, size);
  const rows = 14, rh = size / rows;
  for (let rI = 0; rI < rows; rI++) {
    let x = (rI % 2) * rh * 0.5 + rnd() * rh * 0.3;
    const y0 = rI * rh;
    while (x < size + rh) {
      const w = rh * (0.85 + rnd() * 0.6), hh = rh * (0.8 + rnd() * 0.12);
      const cx = x + w / 2, cy = y0 + rh / 2 + (rnd() - 0.5) * rh * 0.08;
      const hue = 28 + rnd() * 22, sat = 6 + rnd() * 12, l = 42 + rnd() * 24;
      wrapDraw(size, cx, cy, w, (X, Y) => {
        g.fillStyle = hsl(hue, sat, l); roundedBlob(g, X, Y, w * 0.46, hh * 0.44, rnd, 0.95);
        g.fillStyle = `rgba(255,248,235,${0.08 + rnd() * 0.08})`; roundedBlob(g, X - w * 0.08, Y - hh * 0.1, w * 0.26, hh * 0.2, rnd, 0.9);
        const grd = h.createRadialGradient(X - w * 0.06, Y - hh * 0.08, 1, X, Y, Math.max(w, hh) * 0.5);
        grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.7, '#a0a0a0'); grd.addColorStop(1, '#303030');
        h.fillStyle = grd; roundedBlob(h, X, Y, w * 0.46, hh * 0.44, rnd, 0.95);
      });
      x += w + rh * 0.08;
    }
  }
  grain(g, size, 0.22, rnd, 0.5);
  return { map: toTex(col), normalMap: toTex(normalFromHeight(hc, 4), false) };
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

// ---- Roca de montaña: bloques fracturados, estratos, grietas y líquenes ----
// R: luminancia de la roca, G: líquenes, B: oclusión de grietas. Devuelve también el mapa de relieve (normal).
function rockFace(size) {
  const rnd = mulberry32(23);
  const per = (x, y, f) => { const a = (x / size) * Math.PI * 2, b = (y / size) * Math.PI * 2; return noise2(Math.cos(a) * f + 10, Math.sin(a) * f + Math.cos(b) * f * 0.9 + 3) * 0.5 + noise2(Math.sin(b) * f - 7, Math.cos(b) * f + Math.sin(a) * f * 0.7) * 0.5; };
  // bloques: celdas de Voronoi enlosables (una semilla por casilla, algo más anchas que altas, como la caliza)
  const G = 4, cw = size / G, seeds = [];
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) seeds.push([(i + 0.15 + rnd() * 0.7) * cw, (j + 0.15 + rnd() * 0.7) * cw, rnd(), rnd()]);
  const cell = (x, y) => {
    const ci = Math.floor(x / cw), cj = Math.floor(y / cw);
    let d1 = 1e9, d2 = 1e9, id = null;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const i = ci + di, j = cj + dj, si = ((i % G) + G) % G, sj = ((j % G) + G) % G, sd = seeds[sj * G + si];
      const sx = sd[0] + (i - si) * cw, sy = sd[1] + (j - sj) * cw;
      const dx = (x - sx) * 0.8, dy = (y - sy) * 1.25, d = dx * dx + dy * dy;
      if (d < d1) { d2 = d1; d1 = d; id = sd; } else if (d < d2) d2 = d;
    }
    return { e: Math.sqrt(d2) - Math.sqrt(d1), c: Math.sqrt(d1) / cw, id };
  };
  const c = canvas(size), g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data;
  const hc = canvas(size), hg = hc.getContext('2d'), himg = hg.createImageData(size, size), hd = himg.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const k = (y * size + x) * 4;
    const warp = per(x, y, 1.5) * 18;
    const cl = cell(x + warp * 0.5, y + warp * 0.3);
    // estratos: bandas horizontales onduladas de distinto grosor
    const band = Math.sin(((y + warp) / size) * Math.PI * 2 * 7) * 0.5 + Math.sin(((y + warp * 1.7) / size) * Math.PI * 2 * 17) * 0.25;
    const n = per(x, y, 3) * 0.45 + per(x, y, 9) * 0.25 + per(x, y, 24) * 0.12 + (rnd() - 0.5) * 0.1;
    const edge = Math.min(1, cl.e / 3.5);                     // 0 en la junta entre bloques (fina)
    const shade = (cl.id[2] - 0.5) * 0.34;                    // cada bloque con su tono
    const lum = 140 + n * 135 + band * 26 + shade * 120 - (1 - edge) * 45;
    d[k] = Math.max(0, Math.min(255, lum));
    d[k + 1] = Math.max(0, Math.min(255, (per(x + 40, y, 4) - 0.2) * 520 + (cl.id[3] > 0.7 ? 60 : 0)));
    d[k + 2] = Math.max(0, Math.min(255, 120 + edge * 135)); d[k + 3] = 255;
    // relieve: cada bloque abombado, juntas hundidas y grano fino
    const dome = 1 - Math.min(1, cl.c * 0.9);
    const hv = 110 + dome * 80 * (0.5 + cl.id[2] * 0.7) + n * 75 + band * 16 - (1 - edge) * 70;
    hd[k] = hd[k + 1] = hd[k + 2] = Math.max(0, Math.min(255, hv)); hd[k + 3] = 255;
  }
  g.putImageData(img, 0, 0); hg.putImageData(himg, 0, 0);
  // grietas: trazos quebrados, sobre todo verticales, que oscurecen R y B (y hunden el relieve)
  g.lineCap = 'round'; g.lineJoin = 'round'; hg.lineCap = 'round'; hg.lineJoin = 'round';
  for (let i = 0; i < 16; i++) {
    let x = rnd() * size, y = rnd() * size; const steps = 6 + (rnd() * 10 | 0), w = 0.8 + rnd() * 1.6;
    const pts = [[x, y]]; for (let j = 0; j < steps; j++) { x += (rnd() - 0.5) * 22; y += 8 + rnd() * 16; pts.push([x, y]); }
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      g.strokeStyle = 'rgba(20,0,40,0.85)'; g.lineWidth = w; g.beginPath(); pts.forEach(([px, py], j) => j ? g.lineTo(px + dx, py + dy) : g.moveTo(px + dx, py + dy)); g.stroke();
      hg.strokeStyle = 'rgba(10,10,10,0.9)'; hg.lineWidth = w * 1.4; hg.beginPath(); pts.forEach(([px, py], j) => j ? hg.lineTo(px + dx, py + dy) : hg.moveTo(px + dx, py + dy)); hg.stroke();
    }
  }
  // juntas horizontales entre estratos
  for (let i = 0; i < 9; i++) {
    const y0 = rnd() * size; g.strokeStyle = 'rgba(30,0,60,0.6)'; g.lineWidth = 1 + rnd() * 1.5; hg.strokeStyle = 'rgba(20,20,20,0.7)'; hg.lineWidth = 2 + rnd() * 1.5;
    for (const dy of [-size, 0, size]) for (const q of [g, hg]) { q.beginPath(); for (let x = 0; x <= size; x += 8) { const y = y0 + dy + Math.sin(x / size * Math.PI * 4 + i) * 6; x ? q.lineTo(x, y) : q.moveTo(x, y); } q.stroke(); }
  }
  return { map: toTex(c, false), normalMap: toTex(normalFromHeight(hc, 7), false) };
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

// ---- Follaje (atlas con transparencia) ----
// Cuadrante sup. izq.: racimo de hojas anchas · inf. izq.: hojas más menudas · sup. dcha.: rama de abeto con agujas
// inf. dcha.: blanco opaco (troncos y núcleos de las copas). Tonos claros casi grises: el verde lo da el color de cada vértice.
function foliageAtlas(size) {
  const rnd = mulberry32(41);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), H = size / 2;
  g.clearRect(0, 0, size, size);
  g.fillStyle = '#ffffff'; g.fillRect(H, H, H, H);
  const leaf = (x, y, L, W, a, l) => {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = `hsl(${78 + rnd() * 30},${22 + rnd() * 18}%,${l}%)`;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(W * 0.9, L * 0.35, 0, L); g.quadraticCurveTo(-W * 0.9, L * 0.35, 0, 0); g.fill();
    g.strokeStyle = `hsla(90,20%,${l - 22}%,.55)`; g.lineWidth = Math.max(0.8, W * 0.08); g.beginPath(); g.moveTo(0, L * 0.05); g.lineTo(0, L * 0.9); g.stroke();
    g.restore();
  };
  // racimos de hojas: más densos en el centro, hojas que apuntan hacia fuera; las de dentro más oscuras
  const cluster = (ox, oy, n, L0, W0) => {
    const cx = ox + H / 2, cy = oy + H / 2, R = H * 0.44;
    g.save(); g.beginPath(); g.rect(ox, oy, H, H); g.clip();
    // ramitas
    g.strokeStyle = 'rgba(95,80,60,1)'; g.lineWidth = size / 320;
    for (let i = 0; i < 6; i++) { const a = rnd() * 6.28; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R * 0.8, cy + Math.sin(a) * R * 0.8); g.stroke(); }
    for (let i = 0; i < n; i++) {
      const rr = Math.sqrt(rnd()) * R, a = rnd() * 6.28, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      const L = (L0 + rnd() * L0 * 0.6) * (1 - rr / R * 0.25), W = W0 * (0.8 + rnd() * 0.5);
      leaf(x, y, L, W, a - Math.PI / 2 + (rnd() - 0.5) * 1.2, 52 + (rr / R) * 30 + rnd() * 14);
    }
    g.restore();
  };
  cluster(0, 0, 90, size * 0.06, size * 0.03);
  cluster(0, H, 150, size * 0.042, size * 0.021);
  // rama de abeto: eje con agujas a ambos lados, que se acortan hacia la punta
  {
    const ox = H, oy = 0, x0 = ox + H * 0.5, y0 = oy + H * 0.97, y1 = oy + H * 0.05;
    g.save(); g.beginPath(); g.rect(ox, oy, H, H); g.clip();
    const twig = (bx, by, ex, ey, len, dens) => {
      // cuerpo de la rama: masa de agujas más oscura detrás, para que se lea de lejos
      const ang0 = Math.atan2(ey - by, ex - bx), Lb = Math.hypot(ex - bx, ey - by);
      g.save(); g.translate((bx + ex) / 2, (by + ey) / 2); g.rotate(ang0); g.fillStyle = 'hsl(110,22%,50%)';
      g.beginPath(); g.ellipse(0, 0, Lb / 2 + len * 0.3, len * 0.72, 0, 0, 7); g.fill(); g.restore();
      g.strokeStyle = 'rgba(110,95,70,1)'; g.lineWidth = size / 200; g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke();
      const n = Math.round(Math.hypot(ex - bx, ey - by) / size * 260 * dens);
      for (let i = 0; i < n; i++) {
        const t = i / n, x = bx + (ex - bx) * t, y = by + (ey - by) * t, L = len * (1 - t * 0.55) * (0.8 + rnd() * 0.4), ang = Math.atan2(ey - by, ex - bx);
        for (const sd of [-1, 1]) {
          const a = ang + sd * (0.9 + rnd() * 0.35);
          g.strokeStyle = `hsl(${95 + rnd() * 20},${18 + rnd() * 14}%,${60 + rnd() * 32}%)`; g.lineWidth = size / 150 + rnd() * size / 300;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
        }
      }
    };
    twig(x0, y0, x0, y1, H * 0.2, 1.1);
    for (let k = 0; k < 7; k++) { const t = 0.12 + k * 0.11, y = y0 + (y1 - y0) * t, sd = k % 2 ? 1 : -1; twig(x0, y, x0 + sd * H * (0.32 - t * 0.2), y - H * 0.12, H * 0.11, 1.2); }
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
// Zonas del atlas de follaje en UV (u0, v0, u1, v1) y el punto opaco para troncos
export const FOLIAGE = { leafA: [0, 0.5, 0.5, 1], leafB: [0, 0, 0.5, 0.5], needle: [0.5, 0.5, 1, 1], solid: [0.8, 0.2] };

export const TEX = {};
export function buildTextures(quality = 'high') {
  const S = quality === 'low' ? 256 : 512;
  if (TEX._S === S) return TEX;
  TEX._S = S;
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
  { const r = rockFace(S); TEX.rock = r.map; TEX.rockN = r.normalMap; }
  TEX.foliage = foliageAtlas(S);
  return TEX;
}
