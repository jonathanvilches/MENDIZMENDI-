// Piezas comunes de arquitectura urbana, hechas para el juego: edificios entre medianeras (con o sin soportales),
// balcones de forja, escaparates, ventanas góticas, balaustradas, estatuas, banderas y letreros pintados.
// Los letreros comparten un único atlas de textura y se dibujan en una sola malla.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, gable, colored, M, MM } from './builder.js';

export const toW = (x, z, ry, lx, lz) => ({ x: x + lx * Math.cos(ry) + lz * Math.sin(ry), z: z - lx * Math.sin(ry) + lz * Math.cos(ry) });
export const FONT_SERIF = 'Georgia, "Times New Roman", serif';
export const FONT_ROUND = '"Lilita One", Nunito, "Arial Black", sans-serif';
export const FONT_SANS = '"Trebuchet MS", Nunito, Arial, sans-serif';

// ---------- Letreros ----------
export class Signs {
  constructor(size = 2048) {
    const c = this.canvas = document.createElement('canvas'); c.width = c.height = size;
    this.S = size; this.g = c.getContext('2d'); this.x = 0; this.y = 0; this.sh = 0; this.geos = [];
  }
  // T: matriz del letrero (mira a +z); w×h en metros; draw(g, W, H) pinta en su casilla (unos 128 px por metro)
  add(T, w, h, draw, { both = false, ppm = 128 } = {}) {
    let W = Math.round(Math.min(this.S, Math.max(192, w * ppm))), Hp = Math.round(W * h / w);
    if (Hp > 384) { Hp = 384; W = Math.max(48, Math.round(Hp * w / h)); }
    if (this.x + W > this.S) { this.y += this.sh + 8; this.x = 0; this.sh = 0; }
    if (this.y + Hp > this.S) { console.warn('letreros: atlas lleno'); return; }
    const x0 = this.x, y0 = this.y; this.x += W + 8; this.sh = Math.max(this.sh, Hp);
    const g = this.g; g.save(); g.beginPath(); g.rect(x0, y0, W, Hp); g.clip(); g.translate(x0, y0); draw(g, W, Hp); g.restore();
    const mk = (flip) => {
      const p = new THREE.PlaneGeometry(w, h), uv = p.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (x0 + uv.getX(i) * W) / this.S, 1 - (y0 + (1 - uv.getY(i)) * Hp) / this.S);
      if (flip) p.rotateY(Math.PI);
      p.applyMatrix4(T); this.geos.push(p.toNonIndexed());
    };
    mk(false); if (both) mk(true);
  }
  build(parent) {
    if (!this.geos.length) return null;
    const t = new THREE.CanvasTexture(this.canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const m = new THREE.Mesh(mergeGeometries(this.geos), new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix(); m.name = 'signs'; parent.add(m);
    this.geos = [];
    return m;
  }
}
export function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
export function fitText(g, text, x, y, maxW, size, font = FONT_SERIF, weight = 'bold') {
  let fs = size; g.font = `${weight} ${fs}px ${font}`;
  const tw = g.measureText(text).width; if (tw > maxW) { fs *= maxW / tw; g.font = `${weight} ${fs}px ${font}`; }
  g.fillText(text, x, y);
}
// placa de calle esmaltada, en castellano y euskera
export function plaque(lines, { bg = '#f5f2ea', fg = '#233f7c', border = '#233f7c' } = {}) {
  return (g, W, H) => {
    g.fillStyle = border; roundRect(g, 0, 0, W, H, 22); g.fill();
    g.fillStyle = bg; roundRect(g, 10, 10, W - 20, H - 20, 14); g.fill();
    g.strokeStyle = border; g.lineWidth = 3; roundRect(g, 20, 20, W - 40, H - 40, 8); g.stroke();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((l, i) => fitText(g, l, W / 2, 20 + (H - 40) * (i + 0.5) / lines.length, W - 70, (H - 40) / lines.length * 0.6, FONT_SERIF));
  };
}
// rótulo de tienda: tabla pintada con letras
export function shopSign(text, bg, fg = '#fbf4e2') {
  return (g, W, H) => {
    g.fillStyle = bg; roundRect(g, 0, 0, W, H, 16); g.fill();
    g.strokeStyle = fg; g.lineWidth = 5; roundRect(g, 12, 12, W - 24, H - 24, 10); g.stroke();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitText(g, text, W / 2, H / 2 + 2, W - 60, H * 0.52, FONT_SANS);
  };
}
// letras sueltas (doradas o pintadas) sobre fondo transparente
export function letters(text, color, { font = FONT_SERIF, weight = 'bold', shadow = 'rgba(0,0,0,.35)', size = 0.72 } = {}) {
  return (g, W, H) => {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (shadow) { g.fillStyle = shadow; fitText(g, text, W / 2 + 3, H / 2 + 4, W - 20, H * size, font, weight); }
    g.fillStyle = color; fitText(g, text, W / 2, H / 2, W - 20, H * size, font, weight);
  };
}

// ---------- Piezas de fachada (plano local: fachada en z = 0 mirando a +z) ----------
// balcón de forja: losa de piedra, barandilla calada y pasamanos
export function balcony(B, T, x, y, bw, dep = 0.6) {
  B.add('ashlar', box(bw, 0.13, dep, 1), MM(T, M(x, y, dep / 2)));
  const front = new THREE.PlaneGeometry(bw, 0.95); { const uv = front.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * bw / 0.9); }
  B.add('railing', front, MM(T, M(x, y + 0.54, dep - 0.03)));
  for (const s of [-1, 1]) {
    const side = new THREE.PlaneGeometry(dep, 0.95); { const uv = side.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * dep / 0.9); }
    B.add('railing', side, MM(T, M(x + s * (bw / 2 - 0.02), y + 0.54, dep / 2, Math.PI / 2)));
  }
  B.add('iron', box(bw + 0.04, 0.05, 0.07), MM(T, M(x, y + 1.02, dep - 0.03)));
}
// puerta-ventana con marco de piedra y contraventanas opcionales
export function winDoor(B, T, x, y, ww, wh, shutter, frame = 'ashlar') {
  B.add('glass', box(ww, wh, 0.02), MM(T, M(x, y + wh / 2, 0.03)));
  B.add('paint', colored(box(0.06, wh, 0.05), '#efe9dc'), MM(T, M(x, y + wh / 2, 0.05)));
  B.add('paint', colored(box(ww, 0.06, 0.05), '#efe9dc'), MM(T, M(x, y + wh * 0.72, 0.05)));
  B.add(frame, box(ww + 0.4, 0.24, 0.16, 1), MM(T, M(x, y + wh + 0.12, 0.07)));
  for (const s of [-1, 1]) B.add(frame, box(0.17, wh, 0.12, 1), MM(T, M(x + s * (ww / 2 + 0.085), y + wh / 2, 0.06)));
  if (shutter) for (const s of [-1, 1]) B.add('paint', colored(box(ww / 2, wh, 0.05), shutter), MM(T, M(x + s * (ww * 0.75 + 0.2), y + wh / 2, 0.06)));
}
// escaparate con puerta: carpintería pintada, cristal y zócalo de piedra
export function shopFront(B, T, sw, sh, color, door = true) {
  const c = (g) => colored(g, color);
  B.add('ashlar', box(sw, 0.55, 0.14, 1), MM(T, M(0, 0.27, 0.05)));
  B.add('glass', box(sw - 0.3, sh - 0.8, 0.02), MM(T, M(door ? -0.45 : 0, 0.55 + (sh - 0.8) / 2, 0.03)));
  for (const s of [-1, 1]) B.add('paint', c(box(0.16, sh, 0.12)), MM(T, M(s * (sw / 2 - 0.08), sh / 2, 0.06)));
  B.add('paint', c(box(sw, 0.3, 0.14)), MM(T, M(0, sh - 0.1, 0.07)));
  if (door) { B.add('paint', c(box(0.95, sh - 0.35, 0.06)), MM(T, M(sw / 2 - 0.65, (sh - 0.35) / 2, 0.04))); B.add('gold', box(0.05, 0.3, 0.05), MM(T, M(sw / 2 - 0.95, sh * 0.45, 0.09))); }
}
// ventana gótica apuntada (hueco extruido)
export function pointedPanel(w, h, depth) {
  const s = new THREE.Shape(), hs = Math.max(0.01, h - w * 0.866);
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, hs);
  s.absarc(-w / 2, hs, w, 0, Math.PI / 3, false);
  s.absarc(w / 2, hs, w, Math.PI * 2 / 3, Math.PI, false);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
}
// muro con un hueco en arco (apuntado o de medio punto) que llega al suelo: puertas de claustros, murallas, plazas
export function archedWall(w, h, ow, oh, depth, pointed = false) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(-ow / 2, 0);
  if (pointed) { const hs = oh - ow * 0.866; s.lineTo(-ow / 2, hs); s.absarc(ow / 2, hs, ow, Math.PI, Math.PI * 2 / 3, true); s.absarc(-ow / 2, hs, ow, Math.PI / 3, 0, true); }
  else { const hs = oh - ow / 2; s.lineTo(-ow / 2, hs); s.absarc(0, hs, ow / 2, Math.PI, 0, true); }
  s.lineTo(ow / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -depth / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.2, uv.getY(i) / 2.2);
  return g;
}
// balaustrada: pasamanos, zócalo y balaustres torneados
export function balustrade(B, T, len, h = 1, step = 0.42) {
  B.add('ashlar', box(len, 0.16, 0.5, 1), MM(T, M(0, 0.08, 0)));
  B.add('ashlar', box(len, 0.16, 0.55, 1), MM(T, M(0, h - 0.08, 0)));
  const n = Math.floor(len / step);
  for (let i = 0; i < n; i++) B.add('ashlar', new THREE.CylinderGeometry(0.08, 0.13, h - 0.3, 6), MM(T, M(-len / 2 + (i + 0.5) * len / n, h / 2, 0)));
}
// estatua de piedra sencilla (figura con túnica), altura h
export function statue(B, T, h = 2.2, mat = 'ashlar', arm = 1) {
  B.add(mat, new THREE.CylinderGeometry(0.22 * h / 2.2, 0.36 * h / 2.2, h * 0.68, 8), MM(T, M(0, h * 0.34, 0)));
  B.add(mat, new THREE.SphereGeometry(0.19 * h / 2.2, 8, 6), MM(T, M(0, h * 0.78, 0)));
  B.add(mat, box(0.12 * h / 2.2, h * 0.34, 0.12 * h / 2.2), MM(T, M(0.3 * h / 2.2 * arm, h * 0.62, 0.08, 0, -0.5, arm * 0.5)));
  B.add(mat, box(0.55 * h / 2.2, 0.14, 0.5 * h / 2.2), MM(T, M(0, 0.07, 0)));
}
// mástil con bandera de Navarra (roja con el escudo dorado de cadenas), ondeando en quietud
export function navarraFlag(B, T, len = 2.4) {
  B.add('iron', new THREE.CylinderGeometry(0.04, 0.05, len + 0.8, 6), MM(T, M(0, (len + 0.8) / 2, 0)));
  B.add('gold', new THREE.SphereGeometry(0.08, 8, 6), MM(T, M(0, len + 0.85, 0)));
  const g = new THREE.PlaneGeometry(len * 0.8, len * 0.55, 8, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) + len * 0.4) * 2.4) * 0.1);
  g.translate(len * 0.4, 0, 0); g.computeVertexNormals();
  const flag = colored(g, '#b3202a');
  B.add('paint', flag, MM(T, M(0.05, len + 0.4 - len * 0.275, 0)));
  B.add('paint', colored(new THREE.CircleGeometry(len * 0.1, 10), '#e0b43a'), MM(T, M(0.05 + len * 0.4, len + 0.4 - len * 0.275, 0.13)));
  B.add('paint', colored(new THREE.CircleGeometry(len * 0.1, 10), '#e0b43a'), MM(T, M(0.05 + len * 0.4, len + 0.4 - len * 0.275, -0.13, Math.PI)));
}

// ---------- Edificio de vecinos entre medianeras ----------
// Fachada en z = 0 mirando a +z; ocupa x ∈ [−w/2, w/2] y z ∈ [−d, 0].
// o: { w, d, h, wall, arcade, floors, shutter, longBalcony, shops, shopColor, eaves, attic, frame }
export function cityBlock(B, T, o, rnd = Math.random) {
  const { w, d, h } = o, wall = o.wall || 'plasterCream', frame = o.frame || 'ashlar';
  const gh = o.arcade ? 4.8 : 4.1, ad = o.arcade ? 3.6 : 0;
  const floors = o.floors || Math.max(2, Math.round((h - gh) / 3.1)), fh = (h - gh) / floors;
  const F = (m) => MM(T, m);
  B.add(wall, box(w, h - gh, d, 2.6), F(M(0, gh + (h - gh) / 2, -d / 2)));
  B.add('ashlar', box(w, gh + 3, d - ad, 2.2), F(M(0, gh / 2 - 1.5, -ad - (d - ad) / 2)));
  B.add(frame, box(w + 0.02, 0.32, 0.26, 1.5), F(M(0, gh + 0.1, 0.08)));
  const bays = Math.max(1, Math.round(w / 3.4));
  if (o.arcade) {
    for (let i = 0; i <= bays; i++) {
      const x = -w / 2 + i * w / bays + (i === 0 ? 0.36 : i === bays ? -0.36 : 0);
      B.add('ashlar', box(0.72, gh - 0.8, 0.72, 1.2), F(M(x, (gh - 0.8) / 2, -0.4)));
      B.add('ashlar', box(0.98, 0.22, 0.98, 1), F(M(x, gh - 0.9, -0.4)));
      B.add('ashlar', box(0.92, 0.26, 0.92, 1), F(M(x, 0.13, -0.4)));
    }
    B.add('ashlar', box(w, 0.8, 0.8, 1.5), F(M(0, gh - 0.4, -0.4)));
    for (let i = 0; i < bays; i++) shopFront(B, MM(T, M(-w / 2 + (i + 0.5) * w / bays, 0, -ad)), w / bays - 1.1, gh - 1.3, o.shopColor || '#5b3a26', i % 2 === 0);
  } else if (o.shops !== false) {
    for (let i = 0; i < bays; i++) {
      const x = -w / 2 + (i + 0.5) * w / bays;
      if (i % 2 === 1 || bays === 1 && rnd() < 0.3) { // portal de vecinos
        B.add('woodDark', box(1.3, 2.7, 0.08), F(M(x, 1.35, 0.02)));
        B.add(frame, box(1.8, 0.3, 0.2, 1), F(M(x, 2.85, 0.08)));
        for (const s of [-1, 1]) B.add(frame, box(0.25, 2.7, 0.18, 1), F(M(x + s * 0.78, 1.35, 0.07)));
      } else shopFront(B, MM(T, M(x, 0, 0)), Math.min(3.1, w / bays - 0.5), 3.1, o.shopColor || '#5b3a26', true);
    }
  }
  const cols = Math.max(1, Math.round(w / 2.7));
  for (let f = 0; f < floors; f++) {
    const y0 = gh + f * fh, top = f === floors - 1 && o.attic;
    if (f > 0) B.add(frame, box(w + 0.02, 0.15, 0.12, 1), F(M(0, y0 - 0.02, 0.05)));
    const wh = Math.min(2.35, fh - 0.7) * (top ? 0.62 : 1), ww = top ? 0.8 : 1.05;
    const long = f === 0 && o.longBalcony;
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + (c + 0.5) * w / cols;
      winDoor(B, T, x, y0 + 0.12 + (top ? 0.5 : 0), ww, wh, o.shutter && !top ? o.shutter : null, frame);
      if (!top && !long) balcony(B, T, x, y0 + 0.06, ww + 0.6, f === 0 ? 0.72 : 0.5);
    }
    if (long) balcony(B, T, 0, y0 + 0.06, w - 0.9, 0.85);
  }
  // alero de madera y tejado a dos aguas con la cumbrera paralela a la fachada
  B.add(o.eaves || 'woodDark', box(w + 0.02, 0.24, 1.0), F(M(0, h + 0.06, 0.32)));
  for (let i = 0; i < Math.floor(w / 0.6); i++) B.add(o.eaves || 'woodDark', box(0.1, 0.12, 0.8), F(M(-w / 2 + 0.3 + i * 0.6, h - 0.1, 0.35)));
  const rise = d * 0.17, a = Math.atan2(rise, d / 2), L1 = Math.hypot(d / 2, rise) + 0.9, L2 = Math.hypot(d / 2, rise) + 0.2;
  B.add('tile', box(w + 0.04, 0.18, L1, 2), F(M(0, h + 0.3 + rise - L1 / 2 * Math.sin(a), -d / 2 + L1 / 2 * Math.cos(a), 0, a)));
  B.add('tile', box(w + 0.04, 0.18, L2, 2), F(M(0, h + 0.3 + rise - L2 / 2 * Math.sin(a), -d / 2 - L2 / 2 * Math.cos(a), 0, -a)));
  for (const s of [-1, 1]) B.add(wall, gable(d, rise + 0.2, 0.3), F(M(s * (w / 2 - 0.15), h + 0.1, -d / 2, Math.PI / 2)));
  if (rnd() < 0.5) { const cx = (rnd() - 0.5) * w * 0.5; B.add('brick', box(0.7, 1.6, 0.7, 1.2), F(M(cx, h + rise * 0.7 + 0.6, -d * 0.6))); }
  return { gh, ad };
}
