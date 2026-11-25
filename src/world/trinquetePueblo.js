// El trinquete del pueblo, el edificio, por fuera: en Elizondo, el trinquete Antxitonea, y en Lekunberri, el suyo. En los
// dos va sobre su edificio de los datos, el que se llama «Trinkete…» (src/levels/townReal.js, trinqueteTraza). Es el
// edificio que se ve desde la calle, no la cancha: la cancha es la del campeonato (src/pelota/court.js, buildTrinquete).
// - Lekunberri: nave alta de revoco azul verdoso con un gran pelotari pintado en la fachada, con un xare, una pala y la
//   pelota, el rótulo azul «TRINKETEA» y, al lado, un anexo bajo de chapa gris (como en la foto que pasó el autor). El
//   mural es un dibujo del juego, no el de verdad, y en el rótulo no va ningún escudo.
// - Elizondo: una casa grande de piedra y revoco blanco, con tejado de teja, esquinales de sillar y su rótulo.
// La traza (dónde, hacia dónde y de qué tamaño) sale de trinqueteTraza, que se calcula al colocar los monumentos.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, gable, colored, M, MM } from './builder.js';
import { terrainHeight } from './heightfield.js';
import { addBox } from './colliders.js';
import { freeCanvasOnUpload } from '../util/freeCanvas.js';
import { clamp } from '../util/math.js';
// (el mural de Lekunberri, pintado en Higgsfield, GPT Image: el pelotari de blanco con la faja roja, el xare, la pala y las
// pelotas, sobre la pared azul verdosa, que se quita para que asome el revoco de la nave; 672 × 288 con transparencia. El
// autor: «apóyate en Higgsfield para las imágenes». Mientras llega, o si no llega, el dibujo de mural())
import MURAL from '../assets/murales/trinquete-lekunberri.webp?url';

const LOOK = {
  lekunberri: { pared: null, paredColor: '#3f8d94', zocalo: 'stoneDark', tejado: 'zinc', puerta: '#1f56a6', mural: true, anexo: true, ventanas: 'banda',
    rotulo: { fondo: '#1f56a6', letra: '#ffffff', sub: 'Lekunberriko Udala' } },
  elizondo: { pared: 'plaster', zocalo: 'ashlar', tejado: 'tile', puerta: '#5a3a24', mural: false, anexo: false, ventanas: 'sueltas', esquinas: true,
    rotulo: { fondo: '#1f4d3a', letra: '#f4ecd8', sub: 'Antxitonea' } },
};

/** Dónde va el trinquete y cómo: sobre el edificio b de los datos (si lo hay), con la fachada hacia la plaza. La nave mide lo
 *  que un trinquete de verdad (de 26 a 36 m de largo y de 14 a 18 de ancho); si el edificio de los datos es mucho más ancho
 *  (Lekunberri: el trinquete y lo de al lado), queda sitio para el anexo. */
export function trinqueteTraza(o, b, plaza) {
  const largo = b ? clamp(Math.max(b.w, b.d) + 4, 26, 36) : 32, ancho = b ? clamp(Math.min(b.w, b.d), 14, 18) : 16;
  const anexo = b && Math.min(b.w, b.d) > ancho + 8 ? 12 : 0;
  // (la nave a lo largo del lado largo del edificio; b.ry gira como Three, con b.w a lo largo de su eje x)
  let ry = b ? (b.w >= b.d ? b.ry + Math.PI / 2 : b.ry) : Math.atan2(plaza.x - o.x, plaza.z - o.z);
  if (b && Math.sin(ry) * (plaza.x - o.x) + Math.cos(ry) * (plaza.z - o.z) < 0) ry += Math.PI;
  return { x: o.x, z: o.z, ry, w: ancho + anexo, d: largo, ancho, largo, anexo };
}
/** ¿Pisa el trinquete la casa c? (las que pisa no se levantan) */
export function trinqueteToca(t, c) {
  const dx = c.x - t.x, dz = c.z - t.z, co = Math.cos(t.ry), si = Math.sin(t.ry);
  const lx = dx * co - dz * si, lz = dx * si + dz * co, r = Math.min(c.w, c.d) * 0.4;
  return Math.abs(lx) < t.w / 2 + r && Math.abs(lz) < t.d / 2 + r;
}

/** ¿Está la casa c delante de la fachada, a menos de L metros? (para elegir hacia dónde mira y dejarle sitio delante) */
export function trinqueteFrente(t, c, L) {
  const dx = c.x - t.x, dz = c.z - t.z, co = Math.cos(t.ry), si = Math.sin(t.ry);
  const lx = dx * co - dz * si + t.anexo / 2, lz = dx * si + dz * co, r = Math.max(c.w, c.d) * 0.5;
  return Math.abs(lx) < t.ancho / 2 + 3 + r && lz > t.largo / 2 - r && lz < t.largo / 2 + L + r;
}
/** Un punto delante de la fachada, a d metros. */
export const trinqueteDelante = (t, d) => {
  const co = Math.cos(t.ry), si = Math.sin(t.ry), lx = -t.anexo / 2, lz = t.largo / 2 + d;
  return { x: t.x + lx * co + lz * si, z: t.z - lx * si + lz * co };
};

// ---------- El mural y el rótulo, en un solo lienzo ----------
const BLANCO = '#f6f4ee', PERFIL = '#1d4a52', ROJO = '#c8222a', HIERRO = '#2b2c30';   // (canalones, bajantes y tiradores: pintados, sin otro material más que dibujar)
function mural(g, W, H) {
  const u = H / 10, y0 = H * 0.96, x0 = W * 0.24;
  g.lineCap = 'round'; g.lineJoin = 'round';
  // (un trazo blanco con su perfil oscuro, como pintado a brocha sobre la pared)
  const trazo = (pts, w, col = BLANCO) => {
    for (const [c, ww] of [[PERFIL, w + u * 0.28], [col, w]]) {
      g.strokeStyle = c; g.lineWidth = ww; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.stroke();
    }
  };
  const P = (dx, dy) => [x0 + dx * u, y0 - dy * u];
  // el aro detrás del pelotari, abierto por abajo
  g.strokeStyle = BLANCO; g.lineWidth = u * 0.22; g.beginPath(); g.arc(x0 + u * 0.2, y0 - u * 5.2, u * 4.6, Math.PI * 0.82, Math.PI * 2.18); g.stroke();
  // el pelotari, de blanco y con la faja roja, a punto de dar a la pelota con la derecha
  trazo([P(-0.1, 4.5), P(-1.3, 2.3), P(-2.1, 0.2)], u * 0.95);                 // la pierna de atrás
  trazo([P(0.2, 4.5), P(1.4, 2.4), P(2.3, 0.2)], u * 0.95);                   // la de delante, flexionada
  trazo([P(0.05, 4.6), P(-0.35, 7.3)], u * 1.7);                              // el cuerpo
  g.strokeStyle = ROJO; g.lineWidth = u * 0.62; g.beginPath(); g.moveTo(...P(-0.85, 4.75)); g.lineTo(...P(0.95, 4.95)); g.stroke();   // la faja
  trazo([P(-0.3, 7.1), P(-1.9, 7.7), P(-1.6, 9.2)], u * 0.62);                // el brazo que va a dar, atrás y arriba
  trazo([P(-0.2, 7.0), P(1.3, 6.5), P(2.3, 7.4)], u * 0.6);                   // el otro, adelante
  g.fillStyle = PERFIL; g.beginPath(); g.arc(...P(-0.15, 8.35), u * 0.78, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e2b48c'; g.beginPath(); g.arc(...P(-0.15, 8.35), u * 0.64, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2a1d14'; g.beginPath(); g.arc(...P(-0.25, 8.55), u * 0.64, Math.PI * 1.02, Math.PI * 1.98); g.fill();
  // la pelota en el aire y su estela de trazos
  g.strokeStyle = BLANCO; g.lineWidth = u * 0.14; g.setLineDash([u * 0.4, u * 0.35]); g.beginPath(); g.moveTo(...P(-1.2, 9.4)); g.quadraticCurveTo(...P(0.6, 10.2), ...P(2.0, 9.1)); g.stroke(); g.setLineDash([]);
  const pelota = (x, y, r) => { g.fillStyle = PERFIL; g.beginPath(); g.arc(x, y, r + u * 0.12, 0, 7); g.fill(); g.fillStyle = BLANCO; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.strokeStyle = ROJO; g.lineWidth = u * 0.07; g.beginPath(); g.arc(x - r * 0.9, y, r * 0.75, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(x + r * 0.9, y, r * 0.75, Math.PI - 0.9, Math.PI + 0.9); g.stroke(); };
  pelota(...P(2.4, 8.9), u * 0.42);
  // a la derecha, un xare y una pala cruzados y otra pelota
  const cx = W * 0.68, cy = H * 0.52;
  g.save(); g.translate(cx, cy); g.rotate(-0.42);
  g.strokeStyle = PERFIL; g.lineWidth = u * 0.62; g.beginPath(); g.moveTo(0, u * 1.4); g.lineTo(0, u * 4.2); g.stroke();
  g.strokeStyle = '#6b4a2e'; g.lineWidth = u * 0.36; g.beginPath(); g.moveTo(0, u * 1.4); g.lineTo(0, u * 4.2); g.stroke();
  g.save(); g.beginPath(); g.ellipse(0, -u * 0.6, u * 1.3, u * 2.0, 0, 0, Math.PI * 2); g.clip();
  g.strokeStyle = BLANCO; g.lineWidth = Math.max(2, u * 0.07);
  for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(i * u * 0.3, -u * 3); g.lineTo(i * u * 0.3, u * 2); g.stroke(); g.beginPath(); g.moveTo(-u * 2, -u * 0.6 + i * u * 0.36); g.lineTo(u * 2, -u * 0.6 + i * u * 0.36); g.stroke(); }
  g.restore();
  g.strokeStyle = PERFIL; g.lineWidth = u * 0.5; g.beginPath(); g.ellipse(0, -u * 0.6, u * 1.3, u * 2.0, 0, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#b07a45'; g.lineWidth = u * 0.28; g.stroke();
  g.restore();
  g.save(); g.translate(cx + u * 0.4, cy); g.rotate(0.42);
  const pala = new Path2D(); pala.moveTo(-u * 0.22, u * 4.3); pala.lineTo(-u * 0.22, u * 1.6); pala.lineTo(-u * 0.75, u * 0.9); pala.lineTo(-u * 0.75, -u * 2.0);
  pala.arc(0, -u * 2.0, u * 0.75, Math.PI, 0); pala.lineTo(u * 0.75, u * 0.9); pala.lineTo(u * 0.22, u * 1.6); pala.lineTo(u * 0.22, u * 4.3); pala.closePath();
  g.strokeStyle = PERFIL; g.lineWidth = u * 0.3; g.stroke(pala); g.fillStyle = '#c99a5f'; g.fill(pala);
  g.fillStyle = '#2a2a2e'; g.fillRect(-u * 0.24, u * 2.9, u * 0.48, u * 1.4);
  g.restore();
  pelota(W * 0.86, H * 0.74, u * 0.5);
}
function rotulo(R) {
  return (g, W, H) => {
    const r = H * 0.12;
    const rr = (x, y, w, h, q) => { g.beginPath(); g.moveTo(x + q, y); g.arcTo(x + w, y, x + w, y + h, q); g.arcTo(x + w, y + h, x, y + h, q); g.arcTo(x, y + h, x, y, q); g.arcTo(x, y, x + w, y, q); g.closePath(); };
    g.fillStyle = R.fondo; rr(0, 0, W, H, r); g.fill();
    g.strokeStyle = R.letra; g.lineWidth = H * 0.035; rr(H * 0.08, H * 0.08, W - H * 0.16, H - H * 0.16, r * 0.6); g.stroke();
    g.fillStyle = R.letra; g.textAlign = 'center'; g.textBaseline = 'middle';
    const F = '"Trebuchet MS", Nunito, Arial, sans-serif';
    const ajusta = (t, y, size, peso) => { let fs = size; g.font = `${peso} ${fs}px ${F}`; const tw = g.measureText(t).width; if (tw > W * 0.84) { fs *= W * 0.84 / tw; g.font = `${peso} ${fs}px ${F}`; } g.fillText(t, W / 2, y); };
    ajusta('TRINKETEA', H * (R.sub ? 0.42 : 0.52), H * 0.46, 800);
    if (R.sub) ajusta(R.sub, H * 0.76, H * 0.17, 600);
  };
}
// (un rectángulo del lienzo en un plano de w × h metros que mira a +z)
function plano(w, h, x0, y0, pw, ph, CW, CH) {
  const p = new THREE.PlaneGeometry(w, h), uv = p.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (x0 + uv.getX(i) * pw) / CW, 1 - (y0 + (1 - uv.getY(i)) * ph) / CH);
  return p;
}

// la chapa grecada del anexo: un pliegue cada 20 cm (luz, canto en sombra, valle) y algún chorreón de óxido; el lienzo
// es un metro de chapa y se repite (la caja lleva las uv en metros). Una sola para todo el juego.
let _chapa = null;
function chapaGris() {
  if (_chapa) return _chapa;
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = '#8e959c'; g.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 25.6) {
    const gr = g.createLinearGradient(x, 0, x + 25.6, 0);
    gr.addColorStop(0, '#a3aab1'); gr.addColorStop(0.35, '#b4bbc2'); gr.addColorStop(0.5, '#7d848b'); gr.addColorStop(0.62, '#6c737a'); gr.addColorStop(1, '#949ba2');
    g.fillStyle = gr; g.fillRect(x, 0, 25.6, 128);
  }
  for (let k = 0; k < 5; k++) { const x = 8 + k * 25.6 + (k * 37 % 11); const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(120,80,50,0.18)'); gr.addColorStop(1, 'rgba(120,80,50,0)'); g.fillStyle = gr; g.fillRect(x, 0, 3 + (k % 2) * 2, 60 + k * 13); }
  const t = freeCanvasOnUpload(new THREE.CanvasTexture(cv)); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return (_chapa = new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0.25 }));
}

/** Levanta el trinquete del monumento lm (con su traza, lm.tq). Devuelve el sitio de delante de la fachada. */
export function trinqueteEdificio(B, group, mats, lm, def) {
  const t = lm.tq || trinqueteTraza(lm, null, { x: 0, z: 0 });
  const L = LOOK[def.id] || LOOK.elizondo;
  const y = terrainHeight(t.x, t.z), T = M(t.x, y, t.z, t.ry);
  const W = t.ancho, D = t.largo, H = 10, sube = 2.4, cx = -t.anexo / 2;
  const at = (x, yy, z, ry = 0, rx = 0, rz = 0) => MM(T, M(cx + x, yy, z, ry, rx, rz));
  const propias = [];   // (las paredes de color propio: una malla aparte con el revoco del juego teñido)
  const pared = (geo, m) => { if (L.pared) B.add(L.pared, geo, m); else propias.push(geo.applyMatrix4(m).toNonIndexed()); };
  // la nave: zócalo, paredes (metidas 2 m en el suelo por si cae en cuesta), hastiales y tejado a dos aguas
  B.add(L.zocalo, box(W + 0.24, 3.2, D + 0.24), at(0, -0.6, 0));
  pared(box(W, H + 2, D), at(0, (H - 2) / 2, 0));
  for (const s of [1, -1]) pared(gable(W, sube, 0.3), at(0, H, s * (D / 2 - 0.15)));
  const a = Math.atan2(sube, W / 2), vuelo = 0.7, Ls = Math.hypot(W / 2, sube) + vuelo;
  for (const s of [1, -1]) {
    const xe = s * (W / 2 + vuelo * Math.cos(a)), ye = H - vuelo * Math.sin(a);
    B.add(L.tejado, box(Ls, 0.2, D + 0.8), at(xe / 2, (H + sube + ye) / 2 + 0.1, 0, 0, 0, -s * a));
    B.add('paint', colored(box(0.16, 0.16, D + 0.8), HIERRO), at(s * (W / 2 + vuelo - 0.05), ye - 0.12, 0));                      // el canalón
    for (const e of [1, -1]) B.add('paint', colored(new THREE.CylinderGeometry(0.07, 0.07, ye, 6), HIERRO), at(s * (W / 2 + 0.12), ye / 2, e * (D / 2 - 0.35)));   // las bajantes
  }
  B.add(L.tejado, box(0.4, 0.24, D + 0.8), at(0, H + sube + 0.14, 0));                                               // la cumbrera
  // la luz de arriba, a lo largo de los dos costados: una banda corrida (Lekunberri) o ventanas sueltas con su marco
  for (const s of [1, -1]) {
    if (L.ventanas === 'banda') { B.add('glass', box(0.08, 1.3, D - 4), at(s * (W / 2 + 0.03), H - 2.1, 0)); B.add('paint', colored(box(0.12, 0.14, D - 3.8), HIERRO), at(s * (W / 2 + 0.06), H - 1.38, 0)); }
    else for (let i = 0, n = Math.floor((D - 4) / 3.6); i < n; i++) {
      const z = -D / 2 + 2 + (i + 0.5) * (D - 4) / n;
      B.add('ashlar', box(0.14, 2.0, 1.5), at(s * (W / 2 + 0.03), H - 2.4, z)); B.add('glass', box(0.1, 1.6, 1.1), at(s * (W / 2 + 0.07), H - 2.4, z));
    }
  }
  if (L.esquinas) for (const sx of [1, -1]) for (const sz of [1, -1]) for (let k = 0; k < 9; k++) B.add('ashlar', box(0.6, 0.55, 0.6), at(sx * (W / 2 - 0.26), 1.3 + k * 1.0, sz * (D / 2 - 0.26)));
  // la fachada: el portón con su marco, el rótulo encima y, en Lekunberri, el pelotari pintado
  const zf = D / 2;
  // (el marco, por delante del zócalo, que asoma 12 cm: si no, sus caras de delante coincidían y parpadeaban)
  B.add('paint', colored(box(4.2, 3.5, 0.2), L.mural ? '#e9edf0' : '#d8cfbd'), at(0, 1.75, zf + 0.06));
  B.add('paint', colored(box(3.6, 3.1, 0.16), L.puerta), at(0, 1.55, zf + 0.12));
  B.add('paint', colored(box(0.06, 3.0, 0.05), HIERRO), at(0, 1.55, zf + 0.22));
  if (!L.mural) for (const s of [1, -1]) { B.add('ashlar', box(1.7, 2.6, 0.18), at(s * W * 0.28, 6.4, zf + 0.03)); B.add('glass', box(1.2, 2.1, 0.12), at(s * W * 0.28, 6.4, zf + 0.08)); }
  // el anexo de chapa gris, bajo y a un costado, hacia atrás
  if (t.anexo) {
    const A = t.anexo, Da = Math.round(D * 0.62), hA = 6.5, xa = W / 2 + A / 2, za = -D / 2 + Da / 2;
    const chapa = new THREE.Mesh(box(A, hA + 2, Da, 1).applyMatrix4(at(xa, (hA - 2) / 2, za)), chapaGris());
    chapa.castShadow = chapa.receiveShadow = true; chapa.matrixAutoUpdate = false; chapa.name = 'trinquete-anexo'; group.add(chapa);
    B.add('zinc', box(A + 0.6, 0.2, Da + 0.6), at(xa, hA + 0.1, za, 0, 0, 0.04));
    B.add('paint', colored(box(0.1, 0.16, Da), HIERRO), at(W / 2 + A + 0.05, hA - 0.5, za));
    B.add('glass', box(0.08, 1.0, Da - 3), at(W / 2 + A + 0.03, hA - 1.6, za));
    B.add('paint', colored(box(0.14, 2.4, 1.2), '#2d3236'), at(W / 2 + A + 0.06, 1.2, za + Da / 2 - 2.4));
    const c = Math.cos(t.ry), s = Math.sin(t.ry), lx = cx + xa, lz = za;
    addBox(t.x + lx * c + lz * s, t.z - lx * s + lz * c, A + 0.3, Da + 0.3, t.ry, { solidView: true });
  }
  if (propias.length) {
    const m = new THREE.Mesh(mergeGeometries(propias), new THREE.MeshStandardMaterial({ color: L.paredColor, map: mats.plaster?.map || null, normalMap: mats.plaster?.normalMap || null, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.9 }));
    m.castShadow = m.receiveShadow = true; m.matrixAutoUpdate = false; m.name = 'trinquete-paredes'; group.add(m);
  }
  // el lienzo: el mural arriba (768 × 288) y el rótulo debajo (384 × 96); en Lekunberri, 1,6 MB en la tarjeta gráfica
  const MW = 768, MH = 288, RW = 384, RH = 96;
  const CW = L.mural ? MW : RW, CH = L.mural ? MH + RH : RH, cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  const g = cv.getContext('2d');
  if (L.mural) { g.save(); g.beginPath(); g.rect(0, 0, MW, MH); g.clip(); mural(g, MW, MH); g.restore(); }
  g.save(); g.translate(0, CH - RH); g.beginPath(); g.rect(0, 0, RW, RH); g.clip(); rotulo(L.rotulo)(g, RW, RH); g.restore();
  const tx = freeCanvasOnUpload(new THREE.CanvasTexture(cv)); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  if (L.mural) {
    const img = new Image(); img.decoding = 'async';
    img.onload = () => {
      const c2 = document.createElement('canvas'); c2.width = CW; c2.height = CH; const g2 = c2.getContext('2d');
      const k = Math.min(MW / img.width, MH / img.height), w = img.width * k, h = img.height * k;
      g2.drawImage(img, (MW - w) / 2, (MH - h) / 2, w, h);
      g2.save(); g2.translate(0, CH - RH); g2.beginPath(); g2.rect(0, 0, RW, RH); g2.clip(); rotulo(L.rotulo)(g2, RW, RH); g2.restore();
      tx.image = c2; freeCanvasOnUpload(tx); tx.needsUpdate = true;
    };
    img.src = MURAL;
  }
  const geos = [plano(5.2, 1.3, 0, CH - RH, RW, RH, CW, CH).applyMatrix4(at(0, 4.15, zf + 0.05))];
  if (L.mural) geos.push(plano(13.3, 5.0, 0, 0, MW, MH, CW, CH).applyMatrix4(at(0, 7.3, zf + 0.03)));
  const lam = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ map: tx, alphaTest: 0.5, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  lam.receiveShadow = true; lam.matrixAutoUpdate = false; lam.name = 'trinquete-mural'; group.add(lam);
  // el choque de la nave y el sitio de delante de la fachada
  const c = Math.cos(t.ry), s = Math.sin(t.ry);
  addBox(t.x + cx * c, t.z - cx * s, W + 0.4, D + 0.4, t.ry, { solidView: true });
  return trinqueteDelante(t, 4);
}
