// Trajes de carnaval y de leyenda de Navarra sobre los personajes de Meshy, hechos como los de verdad. Cada prenda sigue
// lo que cuentan las fuentes (el Museo del Traje y el Museo Etnológico de Navarra para los joaldunak de Ituren, las
// crónicas del carnaval de Altsasu para los momotxorros, las de Aoiz para los cascabobos…; ver cada traje abajo).
// · Lo ceñido (pellizas de lana, la piel del momotxorro, la sábana, los calzones, el pelo de Basajaun) sale del propio
//   cuerpo del personaje: sus triángulos, un poco hinchados hacia fuera, con los mismos huesos y pesos. Así se mueve
//   con él al andar sin que nada lo atraviese.
// · Las faldas y enaguas van en campana desde la cadera y, hacia el bajo, siguen a cada pierna: al dar el paso, la
//   pierna lleva la tela consigo en vez de salir por ella.
// · Los complementos rígidos (ttuntturro, joareak, cesta con cuernos, sarde, isipu, cabezudos…) se cuelgan de su hueso.
// · Las texturas (lana rizada, puntilla, mimbre, crin, plumas, manchas, rayas…) se pintan en un lienzo al vuelo: no
//   ocupan imágenes en el juego.
import * as THREE from 'three';
import { fillMaterial } from '../engine/charLight.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const { Vector2: V2, Vector3: V3 } = THREE;
const TAU = Math.PI * 2, clamp = THREE.MathUtils.clamp, sstep = THREE.MathUtils.smoothstep, lerp = THREE.MathUtils.lerp;
// azar con semilla: cada textura y cada prenda salen siempre iguales
const rng = (a) => () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
// ruido suave en 3D (para que la lana y el pelo no sean una superficie lisa)
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function noise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t, h = (i, j, k) => hash(ix + i, iy + j, iz + k);
  return L(L(L(h(0, 0, 0), h(1, 0, 0), u), L(h(0, 1, 0), h(1, 1, 0), u), v), L(L(h(0, 0, 1), h(1, 0, 1), u), L(h(0, 1, 1), h(1, 1, 1), u), v), w);
}
const css = (c, k = 1) => { const o = new THREE.Color(c); return '#' + o.multiplyScalar(k).getHexString(); };

// ---------- texturas pintadas ----------
const TEX = {};
function lienzo(key, w, h, draw, srgb = true) {
  if (TEX[key]) return TEX[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); let s = 7; for (const ch of key) s = s * 31 + ch.charCodeAt(0) | 0; draw(g, w, h, rng(s));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return (TEX[key] = t);
}
// dibuja f(dx, dy) también al otro lado de los bordes: la textura se repite sin costuras
const tile = (w, h, x, y, r, f) => { for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) if (x + dx > -r && x + dx < w + r && y + dy > -r && y + dy < h + r) f(x + dx, y + dy); };
// lana rizada de oveja o cabra (pellizas, la piel del momotxorro): rizos claros sobre fondo en sombra
const lana = (base, rizo = 1) => lienzo('lana' + base + rizo, 256, 256, (g, w, h, R) => {
  g.fillStyle = css(base, 0.5); g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    const x = R() * w, y = R() * h, r = (2.5 + R() * 5) * rizo, a = R() * TAU, k = 0.62 + R() * 0.5;
    tile(w, h, x, y, r + 3, (px, py) => {
      g.lineCap = 'round';
      g.strokeStyle = css(base, k * 0.55); g.lineWidth = 3; g.beginPath(); g.arc(px + 0.8, py + 1.2, r, a, a + 4.2); g.stroke();
      g.strokeStyle = css(base, Math.min(1.12, k)); g.lineWidth = 1.7; g.beginPath(); g.arc(px, py, r, a, a + 4); g.stroke();
    });
  }
});
// pelo largo y lacio (Basajaun, la crin del frontil, el isipu): mechones verticales; alfa: puntas desiguales abajo
const crin = (base, alfa = true) => lienzo('crin' + base + alfa, 128, 256, (g, w, h, R) => {
  if (!alfa) { g.fillStyle = css(base, 0.6); g.fillRect(0, 0, w, h); }
  for (let i = 0; i < 420; i++) {
    const x = R() * w, len = alfa ? h * (0.72 + R() * 0.28) : h, k = 0.55 + R() * 0.6, cw = 0.7 + R() * 1.4;
    g.strokeStyle = css(base, k); g.lineWidth = cw; g.beginPath(); g.moveTo(x, -2);
    g.bezierCurveTo(x + (R() - 0.5) * 8, len * 0.3, x + (R() - 0.5) * 10, len * 0.7, x + (R() - 0.5) * 6, len); g.stroke();
  }
});
// puntilla de algodón (el bajo de las enaguas de los joaldunak): tela arriba, ondas y calados abajo; con transparencia
const puntilla = () => lienzo('puntilla', 256, 64, (g, w, h) => {
  g.fillStyle = '#fbfaf5'; g.fillRect(0, 0, w, h * 0.42);
  const n = 8, sw = w / n;
  for (let i = 0; i < n; i++) {
    const cx = sw * (i + 0.5); g.beginPath(); g.arc(cx, h * 0.42, sw * 0.5, 0, Math.PI); g.fill();
    g.save(); g.globalCompositeOperation = 'destination-out';
    for (const [dx, dy, r] of [[0, 0.62, 0.17], [-0.24, 0.5, 0.08], [0.24, 0.5, 0.08], [0, 0.85, 0.07]]) { g.beginPath(); g.arc(cx + dx * sw, h * dy, r * sw, 0, TAU); g.fill(); }
    g.restore();
    g.fillStyle = '#fbfaf5'; g.beginPath(); g.arc(cx, h * 0.62, sw * 0.06, 0, TAU); g.fill();
  }
  g.save(); g.globalCompositeOperation = 'destination-out';
  for (let x = 4; x < w; x += 8) { g.beginPath(); g.arc(x, h * 0.3, 1.6, 0, TAU); g.fill(); }
  g.restore();
});
// mimbre de la cesta del momotxorro: hiladas que pasan por delante y por detrás de las varillas
const mimbre = () => lienzo('mimbre', 256, 256, (g, w, h, R) => {
  g.fillStyle = '#5a3c1c'; g.fillRect(0, 0, w, h);
  const cols = 16, rows = 20, cw = w / cols, rh = h / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = i * cw, y = j * rh, front = (i + j) % 2 === 0, k = 0.85 + R() * 0.3;
    const gr = g.createLinearGradient(0, y, 0, y + rh); gr.addColorStop(0, css('#c8994f', k * 0.75)); gr.addColorStop(0.5, css('#d8ad62', k)); gr.addColorStop(1, css('#a8783a', k * 0.7));
    g.fillStyle = gr; g.beginPath(); g.ellipse(x + cw / 2, y + rh / 2, cw * (front ? 0.62 : 0.5), rh * 0.42, 0, 0, TAU); g.fill();
  }
  for (let i = 0; i < cols; i++) { g.fillStyle = 'rgba(40,24,10,.45)'; g.fillRect(i * cw - 1, 0, 2, h); }
});
// sábana blanca manchada de sangre (momotxorro): lino con su trama y manchas que chorrean hacia abajo
const sabana = () => lienzo('sabana', 256, 512, (g, w, h, R) => {
  g.fillStyle = '#efeadf'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(120,110,95,${0.04 + R() * 0.05})`; g.fillRect(0, y, w, 1); }
  for (let i = 0; i < 26; i++) {
    const x = R() * w, y = h * (0.15 + R() * 0.8), r = 6 + R() * 26, a = 0.55 + R() * 0.4;
    tile(w, h, x, y, r * 2, (px, py) => {
      const gr = g.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(120,8,10,${a})`); gr.addColorStop(0.7, `rgba(150,20,18,${a * 0.7})`); gr.addColorStop(1, 'rgba(150,20,18,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(px, py, r * (0.8 + R() * 0.5), r, R(), 0, TAU); g.fill();
      for (let k = 0; k < 3; k++) { const dx = px + (R() - 0.5) * r, l = r * (1 + R() * 3); g.strokeStyle = `rgba(110,6,8,${a * 0.8})`; g.lineWidth = 1.5 + R() * 2.5; g.beginPath(); g.moveTo(dx, py); g.lineTo(dx + (R() - 0.5) * 3, py + l); g.stroke(); }
    });
  }
});
// rayas verticales de colores (los calzones de los cascabobos)
const rayas = (cols) => lienzo('rayas' + cols.join(), 256, 64, (g, w, h) => {
  const sw = w / cols.length; cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * sw, 0, sw + 1, h); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(i * sw, 0, 2, h); });
});
// cuadros (camisas de los iraskos)
const cuadros = (a, b) => lienzo('cuadros' + a + b, 128, 128, (g, w, h) => {
  g.fillStyle = a; g.fillRect(0, 0, w, h); g.fillStyle = css(b, 1); g.globalAlpha = 0.55;
  for (let i = 0; i < 4; i++) { g.fillRect(i * 32, 0, 14, h); g.fillRect(0, i * 32, w, 14); } g.globalAlpha = 1;
});
// pañuelo de colores con lunares (el de la cabeza de los zipoteros)
const lunares = (a, b) => lienzo('lunares' + a + b, 128, 128, (g, w, h) => {
  g.fillStyle = a; g.fillRect(0, 0, w, h); g.fillStyle = b;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.beginPath(); g.arc(x * 32 + (y % 2) * 16 + 8, y * 32 + 8, 5, 0, TAU); g.fill(); }
});
// pluma de faisán (en lo alto del ttuntturro): cañón y barbas con barras oscuras; con transparencia
const pluma = () => lienzo('pluma', 64, 256, (g, w, h) => {
  for (let y = 4; y < h - 2; y += 2) {
    const t = y / h, half = w * 0.46 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - t * 0.35), bar = Math.sin(y * 0.22) > 0.55;
    g.strokeStyle = bar ? '#2a1a10' : css('#b8763a', 0.8 + 0.3 * (1 - t)); g.lineWidth = 2;
    g.beginPath(); g.moveTo(w / 2 - half, y + 5); g.lineTo(w / 2, y); g.lineTo(w / 2 + half, y + 5); g.stroke();
  }
  g.strokeStyle = '#e8d8b0'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
});
// cobre de los cencerros, con su pátina
const cobre = () => lienzo('cobre', 128, 128, (g, w, h, R) => {
  g.fillStyle = '#b36b36'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { const x = R() * w, y = R() * h, r = 1 + R() * 7; g.fillStyle = R() < 0.3 ? 'rgba(60,40,20,.35)' : R() < 0.5 ? 'rgba(220,150,90,.3)' : 'rgba(90,120,90,.18)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
});
// cara pintada de los cabezudos y caretas: piel, mejillas, cejas, ojos y boca; fondo transparente fuera de la cara
function caraPintada(key, o) {
  return lienzo('cara' + key, 256, 256, (g, w, h) => {
    g.fillStyle = o.piel; g.fillRect(0, 0, w, h);
    const cx = w / 2, ey = h * (o.ojosY || 0.44);
    for (const s of [-1, 1]) {
      const gr = g.createRadialGradient(cx + s * w * 0.22, h * 0.62, 2, cx + s * w * 0.22, h * 0.62, w * 0.12); gr.addColorStop(0, o.mejilla || 'rgba(220,60,60,.55)'); gr.addColorStop(1, 'rgba(220,60,60,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(cx + s * w * 0.22, h * 0.62, w * 0.12, 0, TAU); g.fill();
      if (o.unOjo && s > 0) continue;
      const ex = o.unOjo ? cx : cx + s * w * 0.15, er = w * (o.unOjo ? 0.11 : 0.065);
      g.fillStyle = '#fbf8f0'; g.beginPath(); g.ellipse(ex, ey, er * 1.25, er, 0, 0, TAU); g.fill();
      g.fillStyle = o.iris || '#4a2a14'; g.beginPath(); g.arc(ex + s * er * 0.1, ey + er * 0.08, er * 0.62, 0, TAU); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(ex + s * er * 0.1, ey + er * 0.08, er * 0.3, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex - er * 0.2, ey - er * 0.25, er * 0.14, 0, TAU); g.fill();
      g.strokeStyle = '#2a1a10'; g.lineWidth = 3; g.beginPath(); g.ellipse(ex, ey, er * 1.25, er, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      // cejas: fruncidas si es un enfadado
      g.strokeStyle = o.cejas || '#2a1a10'; g.lineWidth = w * 0.035; g.lineCap = 'round'; g.beginPath();
      const by = ey - er * 1.9, fr = o.enfado ? 1 : -0.3;
      if (o.unOjo) { g.moveTo(ex - er * 1.6, by + er * 0.4 * fr); g.quadraticCurveTo(ex, by - er * 0.6, ex + er * 1.6, by + er * 0.4 * fr); }
      else { g.moveTo(ex - s * er * 1.6, by - er * 0.3); g.lineTo(ex + s * er * 1.1, by + er * 0.55 * fr); }
      g.stroke();
    }
    // boca
    g.strokeStyle = '#5a1414'; g.lineWidth = w * 0.025; g.beginPath();
    const my = h * 0.74; if (o.enfado) { g.moveTo(cx - w * 0.12, my + 6); g.quadraticCurveTo(cx, my - 8, cx + w * 0.12, my + 6); } else { g.moveTo(cx - w * 0.12, my - 4); g.quadraticCurveTo(cx, my + 12, cx + w * 0.12, my - 4); }
    g.stroke();
  });
}

// Lo que va sobre la cara (caretas, antifaz, el trapo de los zipoteros) se pinta en una proyección de frente: u por x,
// v por la altura, centrada en la cara. Medido en los modelos: los ojos quedan en u = 0,5 ± 0,21 y v = 0,546; la nariz
// hacia v = 0,40, la boca en v = 0,27 y la barbilla en v = 0,07
const CARA = (x, y) => [0.5 + x / 0.26, 0.5 + (y - 0.775) / 0.26];
const OJO_U = 0.2115, OJO_V = 0.546;
// (sin repetirse: lo que queda fuera es el borde, transparente o de tela)
const fija = (t) => { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true; return t; };
const ojos = (g, w, h, rx, ry) => { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(w * (0.5 + s * OJO_U), h * (1 - OJO_V), w * rx, h * ry, 0, 0, TAU); g.fill(); } g.restore(); };
// careta de cartón pintada: de la frente a la barbilla, con relieve pintado, mejillas, cejas, boca y los agujeros de los
// ojos (por ellos se ven los del personaje)
function careta(key, o) {
  return fija(lienzo('careta' + key, 256, 256, (g, w, h, R) => {
    const X = (u) => u * w, Y = (v) => (1 - v) * h;
    g.save(); g.beginPath(); g.ellipse(X(0.5), Y(0.47), w * 0.47, h * 0.44, 0, 0, TAU); g.clip();
    g.fillStyle = o.piel; g.fillRect(0, 0, w, h);
    const sh = g.createRadialGradient(X(0.5), Y(0.55), w * 0.12, X(0.5), Y(0.47), w * 0.5); sh.addColorStop(0, 'rgba(255,255,255,.12)'); sh.addColorStop(0.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(40,20,10,.45)');
    g.fillStyle = sh; g.fillRect(0, 0, w, h);
    // el cartón: grano y alguna grieta de la pintura
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '60,30,20'},${0.03 + R() * 0.05})`; g.fillRect(R() * w, R() * h, 2, 2); }
    for (const s of [-1, 1]) {
      const gr = g.createRadialGradient(X(0.5 + s * 0.27), Y(0.33), 2, X(0.5 + s * 0.27), Y(0.33), w * 0.13); gr.addColorStop(0, o.mejilla || 'rgba(215,70,60,.55)'); gr.addColorStop(1, 'rgba(215,70,60,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      // cerco oscuro de los ojos y las cejas (fruncidas si es fiero)
      g.strokeStyle = 'rgba(30,15,10,.85)'; g.lineWidth = w * 0.022; g.beginPath(); g.ellipse(X(0.5 + s * OJO_U), Y(OJO_V), w * 0.085, h * 0.055, 0, 0, TAU); g.stroke();
      g.strokeStyle = o.cejas || '#2a1a10'; g.lineWidth = w * 0.045; g.lineCap = 'round'; g.beginPath();
      const fr = o.enfado ? 1 : -0.4; g.moveTo(X(0.5 + s * 0.33), Y(OJO_V + 0.12 - 0.02 * fr)); g.quadraticCurveTo(X(0.5 + s * 0.2), Y(OJO_V + 0.16), X(0.5 + s * 0.08), Y(OJO_V + 0.1 - 0.05 * fr)); g.stroke();
    }
    // la nariz: sombra a un lado y brillo en el caballete
    g.fillStyle = 'rgba(60,25,15,.25)'; g.beginPath(); g.ellipse(X(0.53), Y(0.41), w * 0.05, h * 0.1, 0.1, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(X(0.49), Y(0.46), w * 0.018, h * 0.08, 0, 0, TAU); g.fill();
    // la boca
    g.strokeStyle = o.boca || '#6a1414'; g.lineWidth = w * 0.03; g.lineCap = 'round'; g.beginPath();
    if (o.enfado) { g.moveTo(X(0.36), Y(0.24)); g.quadraticCurveTo(X(0.5), Y(0.31), X(0.64), Y(0.24)); } else { g.moveTo(X(0.36), Y(0.29)); g.quadraticCurveTo(X(0.5), Y(0.2), X(0.64), Y(0.29)); }
    g.stroke();
    if (o.bigote) { g.fillStyle = o.bigote; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X(0.5), Y(0.33)); g.quadraticCurveTo(X(0.5 + s * 0.2), Y(0.36), X(0.5 + s * 0.3), Y(0.27)); g.quadraticCurveTo(X(0.5 + s * 0.16), Y(0.3), X(0.5), Y(0.3)); g.fill(); } }
    g.restore();
    ojos(g, w, h, 0.062, 0.036);
  }));
}
// antifaz negro de tela con los agujeros de los ojos
const antifazTex = () => fija(lienzo('antifaz', 256, 256, (g, w, h) => {
  const X = (u) => u * w, Y = (v) => (1 - v) * h;
  g.fillStyle = '#141416'; g.beginPath();
  g.moveTo(X(0.04), Y(OJO_V + 0.04));
  g.bezierCurveTo(X(0.08), Y(OJO_V + 0.16), X(0.36), Y(OJO_V + 0.15), X(0.5), Y(OJO_V + 0.09));
  g.bezierCurveTo(X(0.64), Y(OJO_V + 0.15), X(0.92), Y(OJO_V + 0.16), X(0.96), Y(OJO_V + 0.04));
  g.bezierCurveTo(X(0.92), Y(OJO_V - 0.12), X(0.66), Y(OJO_V - 0.12), X(0.56), Y(OJO_V - 0.06));
  g.quadraticCurveTo(X(0.5), Y(OJO_V - 0.02), X(0.44), Y(OJO_V - 0.06));
  g.bezierCurveTo(X(0.34), Y(OJO_V - 0.12), X(0.08), Y(OJO_V - 0.12), X(0.04), Y(OJO_V + 0.04)); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; g.stroke();
  ojos(g, w, h, 0.07, 0.042);
}));
// el cordón del antifaz por detrás de la cabeza: una franja estrecha en medio de la textura
const cordon = () => lienzo('cordon', 16, 64, (g, w, h) => { g.fillStyle = '#141416'; g.fillRect(0, h * 0.42, w, h * 0.16); });
// trapo de lino que tapa la cara de los zipoteros, con dos agujeros para ver
const trapoCara = () => fija(lienzo('trapoCara', 256, 256, (g, w, h, R) => {
  g.fillStyle = '#d6cbb2'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(90,80,60,${0.06 + R() * 0.07})`; g.fillRect(0, y, w, 1); }
  for (let x = 0; x < w; x += 3) { g.fillStyle = `rgba(255,250,235,${0.03 + R() * 0.05})`; g.fillRect(x, 0, 1, h); }
  for (let i = 0; i < 6; i++) { const x = R() * w, y = R() * h, r = 8 + R() * 18; g.fillStyle = 'rgba(120,96,60,.14)'; g.beginPath(); g.ellipse(x, y, r, r * 0.7, R(), 0, TAU); g.fill(); }
  // pliegues que caen desde la frente
  for (let i = 0; i < 9; i++) { const x = (i + 0.5) / 9 * w + (R() - 0.5) * 10, gr = g.createLinearGradient(x - 8, 0, x + 8, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(70,55,35,.14)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - 8, h * 0.05, 16, h); }
  // los agujeros, con el borde deshilachado
  g.strokeStyle = 'rgba(90,70,45,.7)'; g.lineWidth = 3; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(w * (0.5 + s * OJO_U), h * (1 - OJO_V), w * 0.074, h * 0.048, 0, 0, TAU); g.stroke(); }
  ojos(g, w, h, 0.066, 0.04);
}));
// el saco de la cabeza de los iraskos, con dos agujeros para ver
const sacoCara = () => fija(lienzo('sacoCara', 256, 256, (g, w, h, R) => {
  g.fillStyle = '#5a4428'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) { const k = 0.85 + R() * 0.35; g.fillStyle = css(((x + y) / 3) % 2 ? '#b0905c' : '#a2824e', k); g.fillRect(x + 0.4, y + 0.4, 2.4, 2.4); }
  g.strokeStyle = 'rgba(60,40,20,.8)'; g.lineWidth = 3; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(w * (0.5 + s * OJO_U), h * (1 - OJO_V), w * 0.072, h * 0.05, 0, 0, TAU); g.stroke(); }
  ojos(g, w, h, 0.064, 0.042);
}));
// tela tejida de un color (capuchas, faldas, capas): sarga, algún hilo desigual y el tinte no del todo parejo
const tejido = (c) => lienzo('tejido' + c, 256, 256, (g, w, h, R) => {
  g.fillStyle = c; g.fillRect(0, 0, w, h);
  // sarga: diagonales finas de hilo en sombra y en luz (cada 4 píxeles: casa al repetirse)
  g.lineWidth = 1.2;
  for (let d = 0; d < w + h; d += 4) { g.strokeStyle = `rgba(0,0,0,${0.08 + R() * 0.05})`; g.beginPath(); g.moveTo(d - h, h); g.lineTo(d, 0); g.stroke(); }
  g.lineWidth = 0.8;
  for (let d = 2; d < w + h; d += 4) { g.strokeStyle = `rgba(255,255,255,${0.035 + R() * 0.03})`; g.beginPath(); g.moveTo(d - h, h); g.lineTo(d, 0); g.stroke(); }
  // hilos de trama más gruesos o más claros aquí y allá, como sale del telar
  for (let i = 0; i < 46; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,255,255'},${0.025 + R() * 0.04})`; g.fillRect(0, R() * h, w, 0.7 + R() * 1.1); }
  // y el tinte desigual, en manchas suaves sin borde
  for (let i = 0; i < 16; i++) { const x = R() * w, y = R() * h, r = 24 + R() * 44, a = 0.035 + R() * 0.04; tile(w, h, x, y, r, (px, py) => { const gr = g.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(px - r, py - r, r * 2, r * 2); }); }
});
// arpillera de saco (iraskos): trama gruesa de yute con hilos desiguales
const arpillera = () => lienzo('arpillera', 128, 128, (g, w, h, R) => {
  g.fillStyle = '#6a5232'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) { const k = 0.85 + R() * 0.35; g.fillStyle = css(((x + y) / 4) % 2 ? '#b0905c' : '#a2824e', k); g.fillRect(x + 0.5, y + 0.5, 3.2, 3.2); }
  for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(50,35,20,${0.15 + R() * 0.2})`; R() < 0.5 ? g.fillRect(0, R() * h, w, 1.5) : g.fillRect(R() * w, 0, 1.5, h); }
});
// mechones de lana que cuelgan (el borde de las pieles): ondas con las puntas desiguales; con transparencia (la raíz,
// abajo en el lienzo: arriba en la campana, que empieza su v en lo alto)
const mechones = (base) => lienzo('mechones' + base, 256, 64, (g, w, h, R) => {
  for (let i = 0; i < 150; i++) {
    const x = R() * w, len = h * (0.45 + R() * 0.55), k = 0.6 + R() * 0.5, cw = 3 + R() * 4;
    tile(w, h, x, h / 2, cw * 3, (px) => { g.strokeStyle = css(base, k); g.lineWidth = cw; g.lineCap = 'round'; g.beginPath(); g.moveTo(px, h + 2); g.bezierCurveTo(px + 5, h - len * 0.35, px - 5, h - len * 0.7, px + (R() - 0.5) * 6, h - len); g.stroke();
      g.strokeStyle = css(base, k * 0.6); g.lineWidth = 1; g.beginPath(); g.moveTo(px + cw * 0.3, h); g.bezierCurveTo(px + 5 + cw * 0.3, h - len * 0.35, px - 5, h - len * 0.7, px, h - len * 0.95); g.stroke(); });
  }
});

// ---------- materiales ----------
// (con la luz de relleno de los personajes: a contraluz no se quedan grises; de noche se apaga como la de ellos)
// (el color liso va también en un lienzo: el relleno multiplica su mapa, y sin él saldría blanco)
const liso = (c) => lienzo('liso' + c, 4, 4, (g) => { g.fillStyle = c; g.fillRect(0, 0, 4, 4); });
// la misma textura repetida rx × ry veces (una copia: la imagen se comparte)
const rep = (t, rx, ry = rx) => { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
// Relieve de la tela: un mapa de normales sacado de una altura alt(x, y) en un lienzo que se repite (la luz marca así la
// trama, los pliegues que caen y las arrugas donde la tela se recoge)
function relieve(key, w, h, alt, fuerza = 2.2) {
  return lienzo('relieve' + key, w, h, (g, W, Hh, R) => {
    const A = new Float32Array(W * Hh); for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) A[y * W + x] = alt(x, y, R);
    const img = g.createImageData(W, Hh), d = img.data;
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      const dx = A[y * W + (x + 1) % W] - A[y * W + (x - 1 + W) % W], dy = A[((y + 1) % Hh) * W + x] - A[((y - 1 + Hh) % Hh) * W + x];
      let nx = -dx * fuerza, ny = dy * fuerza, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const k = (y * W + x) * 4; d[k] = (nx * 0.5 + 0.5) * 255; d[k + 1] = (ny * 0.5 + 0.5) * 255; d[k + 2] = (nz * 0.5 + 0.5) * 255; d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, false);
}
const RELIEVES = {
  // trama del tejido: hilos que pasan por encima y por debajo
  trama: () => relieve('trama', 64, 64, (x, y) => { const a = Math.sin(x / 64 * TAU * 16), b = Math.sin(y / 64 * TAU * 16); return ((Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? a : b) * 0.35; }, 3),
  // pliegues que caen (a lo largo de v) y algo de trama
  pliegues: () => relieve('pliegues', 256, 128, (x, y, R) => { let h = 0; for (const [k, a, ph] of [[3, 1, 0.3], [5, 0.6, 1.7], [8, 0.35, 4.1], [13, 0.18, 2.2]]) h += a * Math.sin(x / 256 * TAU * k + ph + Math.sin(y / 128 * TAU) * 0.6); return h * 3 + Math.sin(x * 0.8) * Math.sin(y * 0.8) * 0.05; }, 1.6),
  // arrugas de través (donde la tela se recoge: rodillas, codos, cintura), que se cortan y se cruzan
  arrugas: () => relieve('arrugas', 256, 256, (x, y) => { let h = 0; for (const [k, a, ph, sk] of [[6, 1, 0.5, 0.35], [9, 0.6, 2.1, -0.5], [14, 0.35, 1.2, 0.8]]) h += a * Math.max(0, Math.sin(y / 256 * TAU * k + ph + Math.sin(x / 256 * TAU * 2) * sk * 3)) ** 2; return h * 4; }, 1.5),
  // trama gruesa de saco
  saco: () => relieve('saco', 64, 64, (x, y) => (Math.sin(x / 64 * TAU * 16) + Math.sin(y / 64 * TAU * 16)) * 0.6, 2.5),
};
function tela(opt) {
  if (!opt.map && opt.color && !opt.vertexColors) opt = { ...opt, map: liso(opt.color), color: '#ffffff' };
  // (el relieve: trama por defecto en la tela que no transparenta; o el que se pida: pliegues, arrugas, saco)
  const { relieve: rl = opt.alphaTest || opt.bumpMap ? false : 'trama', relieveRep = null, ...o2 } = opt; opt = o2;
  if (rl && RELIEVES[rl]) {
    const r = opt.map?.repeat || new V2(1, 1), k = rl === 'trama' ? 6 : rl === 'saco' ? 4 : 1, rr = relieveRep || [r.x * k, r.y * k];
    const ns = rl === 'trama' ? 0.45 : rl === 'arrugas' ? 0.55 : 0.85; opt = { ...opt, normalMap: rep(RELIEVES[rl](), rr[0], rr[1]), normalScale: new V2(ns, ns) };
  }
  const m = new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0, side: THREE.DoubleSide, ...opt });
  if (m.map && !m.vertexColors) { m.emissiveMap = m.map; fillMaterial(m, 0.28); }
  return m;
}
// (sin mapa de entorno en el juego, el metal puro sale negro: medio metálico, con el relleno de los personajes)
const metal = (opt) => { const m = new THREE.MeshStandardMaterial({ metalness: 0.45, roughness: 0.4, ...opt }); if (!m.map) { m.map = liso('#' + m.color.getHexString(THREE.SRGBColorSpace)); m.color.set('#ffffff'); } m.emissiveMap = m.map; fillMaterial(m, 0.22); return m; };

// ---------- el cuerpo en reposo (por geometría: lo comparten todos los vecinos del mismo modelo) ----------
const BODY = new WeakMap();
function cuerpo(mesh) {
  const geo = mesh.geometry; if (BODY.has(geo)) return BODY.get(geo);
  const P = geo.attributes.position, N = geo.attributes.normal, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight, n = P.count;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const bb = geo.boundingBox, H = bb.max.y - bb.min.y, y0 = bb.min.y;
  // los vértices repetidos en las costuras de la textura se juntan: si no, al hinchar la prenda se abría por ellas
  const key = new Map(), rep = new Int32Array(n), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), k = (Math.round(x * 4000) + 4096) * 67108864 + (Math.round(y * 4000) + 4096) * 8192 + Math.round(z * 4000) + 4096;
    let r = key.get(k); if (r === undefined) { r = i; key.set(k, i); } rep[i] = r;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    nor[r * 3] += N.getX(i); nor[r * 3 + 1] += N.getY(i); nor[r * 3 + 2] += N.getZ(i);
  }
  for (let i = 0; i < n; i++) { const r = rep[i]; if (r !== i) continue; const l = Math.hypot(nor[r * 3], nor[r * 3 + 1], nor[r * 3 + 2]) || 1; nor[r * 3] /= l; nor[r * 3 + 1] /= l; nor[r * 3 + 2] /= l; }
  // la zona de cada vértice según su hueso principal: cabeza, brazo, pierna o tronco
  const names = mesh.skeleton.bones.map(b => b.name.replace(/^mixamorig:?/, ''));
  const zone = new Uint8Array(n);   // 0 tronco, 1 cabeza, 2 brazo, 3 pierna, 4 mano o pie
  for (let i = 0; i < n; i++) {
    let best = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = SW.getComponent(i, k); if (w > bw) { bw = w; best = SI.getComponent(i, k); } }
    const nm = names[best] || '';
    zone[i] = /Hand|Foot|Toe/.test(nm) ? 4 : /Head|Neck|headfront/.test(nm) ? 1 : /Arm|Shoulder/.test(nm) ? 2 : /Leg/.test(nm) ? 3 : 0;
  }
  const B = { geo, H, y0, rep, pos, nor, zone, names, idx: geo.index.array, n };
  BODY.set(geo, B); return B;
}
// posición de cada hueso en reposo, en el espacio de la malla
const bonePos = (mesh, name) => {
  const i = mesh.skeleton.bones.findIndex(b => b.name.replace(/^mixamorig:?/, '') === name); if (i < 0) return null;
  // (con bindMatrix: bindMatrixInverse es la inversa de la matriz de la malla en el mundo, que se rehace en cada fotograma)
  const m = new THREE.Matrix4().copy(mesh.skeleton.boneInverses[i]).invert().premultiply(new THREE.Matrix4().copy(mesh.bindMatrix).invert());
  return { i, p: new V3().setFromMatrixPosition(m) };
};

// Prenda ceñida: los triángulos del cuerpo que pide sel(x, y, z, zona) —x, y, z en fracción de la altura, y desde los
// pies— hinchados hacia fuera grosor(x, y, z) (también en fracción de la altura). Con los mismos huesos que el cuerpo.
// uvY: la textura da la vuelta al cuerpo y se repite uvY veces por altura; o una función (x, y, z) → [u, v] (las caretas).
// forma(p, n): cambia el sitio y la normal de cada punto ya hinchado (en fracción de la altura), para lo que no sigue el
// cuerpo al pie de la letra (la capucha, que no copia los mechones del pelo de debajo)
// sel puede decir sí o no, o dar un número (positivo dentro, negativo fuera, en fracción de la altura): los triángulos que
// cruzan el borde se recortan justo por él, y el borde de la prenda queda limpio, sin dientes de sierra. grosor recibe
// también ese número (f), para engrosar el dobladillo junto al borde
function ceñida(mesh, sel, grosor, mat, uvY = 1, forma = null) {
  const B = cuerpo(mesh), { pos, nor, rep, zone, H, y0, idx } = B, SI = B.geo.attributes.skinIndex, SW = B.geo.attributes.skinWeight;
  const val = new Float32Array(B.n).fill(NaN);
  const f = (i) => { if (Number.isNaN(val[i])) { const r = rep[i], v = sel(pos[r * 3] / H, (pos[r * 3 + 1] - y0) / H, pos[r * 3 + 2] / H, zone[i]); val[i] = v === true ? 1 : v === false || v == null ? -1 : v; } return val[i]; };
  // cada punto de la prenda: un vértice del cuerpo o uno entre dos (i, j, t), recortado en el borde
  const pts = [];
  for (let t = 0; t < idx.length; t += 3) {
    const v = [idx[t], idx[t + 1], idx[t + 2]], fv = v.map(f);
    if (fv[0] < 0 && fv[1] < 0 && fv[2] < 0) continue;
    if (fv[0] >= 0 && fv[1] >= 0 && fv[2] >= 0) { pts.push([[v[0], v[0], 0], [v[1], v[1], 0], [v[2], v[2], 0]]); continue; }
    const poly = [];
    for (let k = 0; k < 3; k++) {
      const a = v[k], b = v[(k + 1) % 3], fa = fv[k], fb = fv[(k + 1) % 3];
      if (fa >= 0) poly.push([a, a, 0]);
      if ((fa >= 0) !== (fb >= 0)) poly.push([a, b, fa / (fa - fb)]);
    }
    for (let k = 1; k + 1 < poly.length; k++) pts.push([poly[0], poly[k], poly[k + 1]]);
  }
  const m = pts.length * 3, P = new Float32Array(m * 3), Nn = new Float32Array(m * 3), U = new Float32Array(m * 2), S = new Uint16Array(m * 4), W = new Float32Array(m * 4);
  const F = new Float32Array(m * 3), libre = forma ? new Float32Array(m) : null, clave = forma ? new Array(m) : null;
  const pa = new V3(), pb = new V3(), na = new V3(), nb = new V3(), bw = new Map();
  let k = 0;
  for (const tri of pts) {
    for (const [a, b, t] of tri) {
      const ra = rep[a], rb = rep[b];
      pa.set(pos[ra * 3], pos[ra * 3 + 1], pos[ra * 3 + 2]).lerp(pb.set(pos[rb * 3], pos[rb * 3 + 1], pos[rb * 3 + 2]), t);
      na.set(nor[ra * 3], nor[ra * 3 + 1], nor[ra * 3 + 2]).lerp(nb.set(nor[rb * 3], nor[rb * 3 + 1], nor[rb * 3 + 2]), t).normalize();
      const x = pa.x / H, y = (pa.y - y0) / H, z = pa.z / H, fv = a === b ? f(a) : 0, d = grosor(x, y, z, fv) * H;
      P[k * 3] = pa.x + na.x * d; P[k * 3 + 1] = pa.y + na.y * d; P[k * 3 + 2] = pa.z + na.z * d; Nn.set([na.x, na.y, na.z], k * 3); F.set([x, y, z], k * 3);
      if (forma) {
        const q = new V3(P[k * 3] / H, (P[k * 3 + 1] - y0) / H, P[k * 3 + 2] / H), nq = na.clone(); libre[k] = forma(q, nq) ?? 0;
        P.set([q.x * H, y0 + q.y * H, q.z * H], k * 3); Nn.set(nq.normalize().toArray(), k * 3);
        // (el mismo punto en los triángulos de al lado, para alisar entre ellos)
        clave[k] = a === b ? ra : ra < rb ? ra + ':' + rb + ':' + t.toFixed(4) : rb + ':' + ra + ':' + (1 - t).toFixed(4);
      }
      // (los huesos de los dos vértices, con su peso repartido: los cuatro que más pesan)
      bw.clear();
      for (const [vi, wt] of [[a, 1 - t], [b, t]]) if (wt > 0) for (let c = 0; c < 4; c++) { const w = SW.getComponent(vi, c) * wt; if (w > 0) { const s = SI.getComponent(vi, c); bw.set(s, (bw.get(s) || 0) + w); } }
      const top = [...bw.entries()].sort((p, q) => q[1] - p[1]).slice(0, 4), sum = top.reduce((s, e) => s + e[1], 0) || 1;
      for (let c = 0; c < 4; c++) { S[k * 4 + c] = top[c] ? top[c][0] : 0; W[k * 4 + c] = top[c] ? top[c][1] / sum : 0; }
      k++;
    }
  }
  if (forma) alisar(P, Nn, libre, clave, m);
  for (let t = 0; t < m; t += 3) {
    const us = [];
    for (let j = t; j < t + 3; j++) {
      // (con forma, la textura va por donde queda la prenda: los mechones de punta de debajo, llevados todos al mismo
      // sitio, se pisaban con texturas distintas y salían manchas)
      const ux = forma ? P[j * 3] / H : F[j * 3], uy = forma ? (P[j * 3 + 1] - y0) / H : F[j * 3 + 1], uz = forma ? P[j * 3 + 2] / H : F[j * 3 + 2];
      if (typeof uvY === 'function') { const [u, vv] = uvY(ux, uy, uz); us.push(u); U[j * 2 + 1] = vv; } else { us.push(Math.atan2(ux, uz) / TAU + 0.5); U[j * 2 + 1] = uy * uvY; }
    }
    // (la costura de atrás: que el triángulo no recorra toda la textura de un lado al otro)
    if (Math.max(...us) - Math.min(...us) > 0.5) for (let j = 0; j < 3; j++) if (us[j] < 0.5) us[j] += 1;
    for (let j = 0; j < 3; j++) U[(t + j) * 2] = us[j];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(S, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(W, 4));
  return piel(mesh, g, mat);
}
// Alisa lo que la forma deja libre (libre: de 0, quieto, a 1; el borde de una capucha junto a la cara, que copiaba los
// mechones de debajo): cada punto se acerca a la media de sus vecinos, unas cuantas veces, y su normal sale de la
// superficie ya lisa. Los triángulos que quedan del revés al llevar el pelo de punta al cráneo se aplastan: con dos
// caras, pintaban manchas de luz al revés
function alisar(P, N, libre, clave, m) {
  const id = new Map(), u = new Int32Array(m); let n = 0;
  for (let i = 0; i < m; i++) { let v = id.get(clave[i]); if (v === undefined) { v = n++; id.set(clave[i], v); } u[i] = v; }
  const X = new Float32Array(n * 3), L = new Float32Array(n), vec = Array.from({ length: n }, () => new Set());
  for (let i = 0; i < m; i++) { X.set(P.subarray(i * 3, i * 3 + 3), u[i] * 3); L[u[i]] = Math.max(L[u[i]], libre[i]); }
  for (let t = 0; t < m; t += 3) for (let j = 0; j < 3; j++) { const a = u[t + j], b = u[t + (j + 1) % 3]; if (a !== b) { vec[a].add(b); vec[b].add(a); } }
  const Y = new Float32Array(n * 3);
  for (let it = 0; it < 10; it++) {
    Y.set(X);
    for (let v = 0; v < n; v++) { if (L[v] <= 0 || !vec[v].size) continue; let sx = 0, sy = 0, sz = 0; for (const w of vec[v]) { sx += X[w * 3]; sy += X[w * 3 + 1]; sz += X[w * 3 + 2]; } const c = vec[v].size, k = 0.5 * L[v];
      Y[v * 3] = lerp(X[v * 3], sx / c, k); Y[v * 3 + 1] = lerp(X[v * 3 + 1], sy / c, k); Y[v * 3 + 2] = lerp(X[v * 3 + 2], sz / c, k); }
    X.set(Y);
  }
  // normales de la superficie alisada (por área), para los puntos libres
  const A = new Float32Array(n * 3), e1 = new V3(), e2 = new V3(), c = new V3(), o = new V3();
  for (let t = 0; t < m; t += 3) {
    const a = u[t], b = u[t + 1], d = u[t + 2];
    e1.set(X[b * 3] - X[a * 3], X[b * 3 + 1] - X[a * 3 + 1], X[b * 3 + 2] - X[a * 3 + 2]); e2.set(X[d * 3] - X[a * 3], X[d * 3 + 1] - X[a * 3 + 1], X[d * 3 + 2] - X[a * 3 + 2]); c.crossVectors(e1, e2);
    o.set(N[t * 3] + N[t * 3 + 3] + N[t * 3 + 6], N[t * 3 + 1] + N[t * 3 + 4] + N[t * 3 + 7], N[t * 3 + 2] + N[t * 3 + 5] + N[t * 3 + 8]);
    if (c.dot(o) < 0) { for (let j = 0; j < 3; j++) u[t + j] = -1 - a; continue; }   // (del revés: fuera)
    for (const v of [a, b, d]) { A[v * 3] += c.x; A[v * 3 + 1] += c.y; A[v * 3 + 2] += c.z; }
  }
  for (let i = 0; i < m; i++) {
    const v = u[i] < 0 ? -1 - u[i] : u[i]; P.set(X.subarray(v * 3, v * 3 + 3), i * 3);
    if (u[i] < 0 || L[v] <= 0) continue;
    o.set(A[v * 3], A[v * 3 + 1], A[v * 3 + 2]); if (o.lengthSq() < 1e-20) continue; o.normalize(); c.set(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]).lerp(o, Math.min(1, L[v] * 2)).normalize(); N.set([c.x, c.y, c.z], i * 3);
  }
}
// una malla nueva con el esqueleto del cuerpo, junto a él
function piel(mesh, g, mat) {
  const s = new THREE.SkinnedMesh(g, mat); s.position.copy(mesh.position); s.quaternion.copy(mesh.quaternion); s.scale.copy(mesh.scale);
  s.bind(mesh.skeleton, mesh.bindMatrix); s.castShadow = true; s.frustumCulled = false; s.userData.traje = true;
  mesh.parent.add(s); return s;
}
// Falda en campana (perfil: [radio, altura] de la cintura al bajo, en fracción de la altura) con pliegues; arriba va con
// la cadera y hacia el bajo se reparte entre la cadera y cada muslo
// (hueso: la cuelga entera de otro hueso, sin repartirla entre las piernas: las esclavinas y los chales, del pecho)
// (rango: las alturas [arriba, abajo] con las que crecen los pliegues, si no son las del perfil: el ribete del bajo
// lleva los mismos pliegues que su falda)
function campana(mesh, perfil, mat, { pliegues = 14, hondo = 0.035, seg = 40, ovalo = 0.82, vuelo = 0.75, hueco = 0, centro = 0, hueso = 'Hips', rango = null } = {}) {
  // (el perfil, en tramos de 0,03 como mucho: cada anillo se ajusta al cuerpo, y entre dos lejanos el talón o la rodilla
  // asomaban por la recta)
  perfil = perfil.flatMap(([r, y], i) => { if (!i) return [[r, y]]; const [r0, y1] = perfil[i - 1], n = Math.max(1, Math.ceil(Math.abs(y1 - y) / 0.03 - 1e-9)); return Array.from({ length: n }, (_, k) => [lerp(r0, r, (k + 1) / n), lerp(y1, y, (k + 1) / n)]); });
  const B = cuerpo(mesh), H = B.H, y0 = B.y0, hip = bonePos(mesh, hueso), L = bonePos(mesh, 'LeftUpLeg'), R = bonePos(mesh, 'RightUpLeg'), LL = bonePos(mesh, 'LeftLeg'), RL = bonePos(mesh, 'RightLeg');
  const rodilla = LL ? (LL.p.y - y0) / H : 0.25;
  // (hueco: lo que queda abierto, en radianes, por delante o hacia centro: los faldones de una casaca, la sábana por detrás)
  const g = new THREE.LatheGeometry(perfil.map(([r, y]) => new V2(r * H, y0 + y * H)), seg, centro + hueco / 2, TAU - hueco), p = g.attributes.position, n = p.count;
  const S = new Uint16Array(n * 4), W = new Float32Array(n * 4), [top, bot] = rango || [perfil[0][1], perfil[perfil.length - 1][1]], np = perfil.length, zonasC = hueso === 'Hips' ? [0, 3] : [0, 1, 2];
  const hc = bonePos(mesh, 'Hips') || hip, cx = hc ? hc.p.x : 0, cz = hc ? hc.p.z : 0, lx = L ? Math.sign(L.p.x - cx) : 1;
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i), t = clamp((top - (y - y0) / H) / (top - bot), 0, 1), a = Math.atan2(x, z);
    const f = 1 + hondo * (0.25 + t) * Math.sin(a * pliegues + (i % 3) * 0.0);
    // (arriba, pegada al cuerpo en cada ángulo: sin huecos en la cintura ni en el cuello; más abajo, nunca por dentro de él)
    // (y abajo, también los pies: el talón asomaba por detrás de las faldas largas)
    const yy = (y - y0) / H, j = i % np, cuerpoR = Math.max(radio(mesh, yy, a, zonasC, 1, 1), hueso === 'Hips' && yy < 0.1 ? radio(mesh, yy, a, [4], 2, 2) : 0) * H;
    let X = cx + x * f, Z = cz + z * f * ovalo, rr = Math.hypot(X, Z);
    const quiere = j === 0 ? cuerpoR + 0.004 * H : Math.max(rr, cuerpoR + (j === 1 ? 0.007 : 0.005) * H);
    if (j === 0 || rr < quiere) { const k = quiere / Math.max(rr, 1e-6); X *= k; Z *= k; }
    p.setXYZ(i, X, y, Z);
    // peso de cada pierna: más cuanto más abajo y más de su lado
    // (en medio, delante y detrás, menos con las piernas: repartido entre las dos, el bajo se metía entre ellas y asomaba
    // lo de debajo)
    const side = clamp((x * lx) / (Math.hypot(x, z) + 1e-6) * 0.5 + 0.5, 0, 1), w = hueso === 'Hips' ? vuelo * t * t * (0.5 + 0.5 * Math.abs(side - 0.5) * 2) : 0;
    // (por debajo de la rodilla, el lado que más pesa va también con la espinilla: con las rodillas algo dobladas, la
    // falda iba con el muslo hacia delante y el talón, que se queda atrás, asomaba por detrás)
    const k = LL && RL ? 0.75 * clamp((rodilla - yy) / rodilla, 0, 1) : 0, M = side >= 0.5, sm = M ? side : 1 - side;
    S.set([hip ? hip.i : 0, (M ? L : R)?.i ?? 0, (M ? R : L)?.i ?? 0, k ? (M ? LL : RL).i : 0], i * 4); W.set([1 - w, w * sm * (1 - k), w * (1 - sm), w * sm * k], i * 4);
  }
  g.computeVertexNormals(); g.setAttribute('skinIndex', new THREE.BufferAttribute(S, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(W, 4));
  return piel(mesh, g, mat);
}
// el contorno del cuerpo (radio en fracción de la altura) a una altura y, sin brazos
function contorno(mesh, y, dy = 0.015) {
  const B = cuerpo(mesh); let r = 0;
  for (let i = 0; i < B.n; i++) { const yy = (B.pos[i * 3 + 1] - B.y0) / B.H; if (Math.abs(yy - y) < dy && B.zone[i] !== 2 && B.zone[i] !== 4) r = Math.max(r, Math.hypot(B.pos[i * 3], B.pos[i * 3 + 2] * 1.25) / B.H); }
  return r || 0.1;
}

// ---------- piezas rígidas (colgadas de un hueso) ----------
// cinta: una tira a lo largo de unos puntos, de ancho w, que se curva un poco al caer
function tira(pts, w, nrm) {
  const n = pts.length, P = new Float32Array(n * 6), U = new Float32Array(n * 4), I = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], tg = new V3().subVectors(b, a).normalize(), side = new V3().crossVectors(tg, nrm(i / (n - 1))).normalize().multiplyScalar(w / 2);
    P.set([pts[i].x - side.x, pts[i].y - side.y, pts[i].z - side.z, pts[i].x + side.x, pts[i].y + side.y, pts[i].z + side.z], i * 6); U.set([0, i / (n - 1), 1, i / (n - 1)], i * 4);
    if (i) I.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals();
  return g;
}
// tubo que adelgaza (cuernos, dientes del sarde, mechones): radios r0 → r1 a lo largo de una curva
function tubo(curve, r0, r1, seg = 16, rad = 8) {
  const g = new THREE.TubeGeometry(curve, seg, 1, rad, false), p = g.attributes.position, pts = curve.getSpacedPoints(seg);
  for (let i = 0; i <= seg; i++) for (let j = 0; j <= rad; j++) {
    const k = i * (rad + 1) + j, c = pts[i], r = lerp(r0, r1, i / seg);
    p.setXYZ(k, c.x + (p.getX(k) - c.x) * r, c.y + (p.getY(k) - c.y) * r, c.z + (p.getZ(k) - c.z) * r);
  }
  g.computeVertexNormals(); return g;
}
const curva = (...p) => new THREE.CatmullRomCurve3(p.map(a => new V3(...a)));
// junta en una malla las piezas de un mismo material (cintas, plumas, crines): una sola llamada de dibujo
function junta(meshes) {
  const gs = meshes.map(o => { o.updateMatrix(); const g = o.geometry.clone().applyMatrix4(o.matrix); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]); return g; });
  return new THREE.Mesh(mergeGeometries(gs), meshes[0].material);
}
// paleta de colores lisos en una tira: cada cinta toma su color con su u (todas las cintas, una sola malla)
const paleta = (cols) => { const t = lienzo('paleta' + cols.join(), cols.length * 4, 4, (g) => cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * 4, 0, 4, 4); })); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; };

// Ttuntturro: gorro cónico de unos 50 cm, cubierto de cintas de colores que cuelgan desde la punta, con una tira de
// puntilla abajo y coronado de plumas (Museo Etnológico de Navarra: «aproximadamente de medio metro de altura, con cintas
// de colores y coronado con plumas de ave»; el Museo del Traje: plumas de faisán)
function ttuntturro(r, alto, cintas, base = '#f4efe2') {
  const g = new THREE.Group();
  const cono = new THREE.Mesh(new THREE.LatheGeometry([new V2(0.001, alto), new V2(r * 0.32, alto * 0.62), new V2(r * 0.72, alto * 0.24), new V2(r, 0)], 28), tela({ color: base }));
  g.add(cono);
  const borde = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.06, alto * 0.12, 32, 1, true), tela({ map: puntilla(), alphaTest: 0.5, transparent: false }));
  borde.material.map.repeat.set(4, 1); borde.position.y = -alto * 0.03; g.add(borde);
  const N = cintas.length * 3, R = rng(N * 31), tiras = [], cm = tela({ map: paleta(cintas), roughness: 0.45 });
  for (let i = 0; i < N; i++) {
    // (por delante las cintas llegan al ala y no tapan la cara; a los lados, a los hombros; por detrás, a la espalda)
    const a = i / N * TAU + R() * 0.1, sa = Math.sin(a), ca = Math.cos(a), pts = [];
    const largo = ca > 0.35 ? 1 : 1.1 + R() * 0.25 + 0.5 * sstep(-ca, -0.35, 0.9), seg = Math.round(14 * largo);
    for (let s = 0; s <= seg; s++) {
      const t = s / seg * largo, onCone = t <= 1;
      // por la superficie del cono hasta el ala y, de ahí, colgando con un poco de vuelo
      const yy = onCone ? alto * (1 - t) : -alto * (t - 1) * 1.1, rr = onCone ? r * Math.pow(t, 0.9) * 1.04 : r * 1.05 + (t - 1) * alto * 0.18;
      pts.push(new V3(sa * rr + Math.sin(t * 7 + i) * 0.004 * alto, yy, ca * rr));
    }
    const tg = tira(pts, r * 0.2, () => new V3(sa, 0.25, ca)), uv = tg.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setX(k, ((i % cintas.length) + 0.5) / cintas.length);
    tiras.push(new THREE.Mesh(tg, cm));
  }
  g.add(junta(tiras));
  const pm = tela({ map: pluma(), alphaTest: 0.4, roughness: 0.7 }), plumas = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU, f = new THREE.Mesh(new THREE.PlaneGeometry(alto * 0.16, alto * 0.62, 1, 6), pm);
    const p = f.geometry.attributes.position; for (let k = 0; k < p.count; k++) { const yy = p.getY(k) / (alto * 0.62) + 0.5; p.setZ(k, -yy * yy * alto * 0.22); }
    f.geometry.translate(0, alto * 0.31, 0); f.rotation.set(-0.35 - (i % 2) * 0.2, a, 0, 'YXZ'); f.position.y = alto * 0.96; plumas.push(f);
  }
  g.add(junta(plumas));
  return g;
}
// cencerro grande de cobre (joare): de boca ancha, ovalado, con su asa y el badajo dentro
function cencerro(h) {
  const g = new THREE.Group(), cuerpo = new THREE.LatheGeometry([new V2(0.001, h), new V2(h * 0.22, h * 0.98), new V2(h * 0.3, h * 0.82), new V2(h * 0.34, h * 0.4), new V2(h * 0.4, h * 0.06), new V2(h * 0.43, 0), new V2(h * 0.38, 0.002)], 20);
  cuerpo.scale(1, 1, 0.72); cuerpo.translate(0, -h, 0);
  g.add(new THREE.Mesh(cuerpo, metal({ map: cobre(), color: '#ffffff', side: THREE.DoubleSide })));
  const asa = new THREE.Mesh(new THREE.TorusGeometry(h * 0.14, h * 0.035, 6, 14, Math.PI), metal({ color: '#5a3a1e', roughness: 0.6 })); asa.position.y = -h * 0.02; g.add(asa);
  const badajo = new THREE.Mesh(new THREE.SphereGeometry(h * 0.09, 8, 6), metal({ color: '#3a2a1a' })); badajo.position.y = -h * 0.92; g.add(badajo);
  return g;
}
// isipu: hisopo de crin de caballo con su mango (en la mano derecha del joaldun)
function isipu(l) {
  const g = new THREE.Group(), mango = new THREE.Mesh(new THREE.CylinderGeometry(l * 0.025, l * 0.03, l * 0.4, 8), tela({ color: '#6a4424' })); mango.position.y = l * 0.2; g.add(mango);
  const cm = tela({ map: crin('#d8cfc0'), alphaTest: 0.45 });
  for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(l * 0.18, l * 0.7), cm); p.position.y = -l * 0.3; p.rotation.y = i / 5 * Math.PI; g.add(p); }
  return g;
}
// sarde: horca de madera de tres dientes, con las puntas manchadas
function sarde(l) {
  const g = new THREE.Group(), madera = tela({ color: '#7a5634' });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(l * 0.014, l * 0.016, l, 8), madera));
  const cruz = new THREE.Mesh(new THREE.CylinderGeometry(l * 0.013, l * 0.013, l * 0.2, 6), madera); cruz.rotation.z = Math.PI / 2; cruz.position.y = l * 0.5; g.add(cruz);
  for (const s of [-1, 0, 1]) g.add(new THREE.Mesh(tubo(curva([s * l * 0.09, l * 0.5, 0], [s * l * 0.1, l * 0.62, l * 0.01], [s * l * 0.1, l * 0.78, l * 0.04]), l * 0.012, l * 0.004, 8, 6), s ? madera : tela({ color: '#6a1a14' })));
  return g;
}
// cuerno de vaca: sale hacia el lado, se curva hacia arriba y adelante; marfil con la punta oscura
function cuerno(l, s) {
  const g = tubo(curva([0, 0, 0], [s * l * 0.45, l * 0.12, 0.02 * l], [s * l * 0.75, l * 0.45, l * 0.12], [s * l * 0.78, l * 0.8, l * 0.25]), l * 0.11, l * 0.015, 18, 10);
  const c = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < g.attributes.position.count; i++) { const t = Math.floor(i / 11) / 18, k = t > 0.75 ? 0.35 : 1 - t * 0.2; c.set([0.93 * k, 0.88 * k, 0.76 * k], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return new THREE.Mesh(g, tela({ color: '#ffffff', vertexColors: true, roughness: 0.5 }));
}
// sombrero de picos (de dos, el del coronel Lagunero): copa baja y ala ancha levantada en picos, con el galón dorado
// cosido por todo el borde del ala
function picos(r, n, color, galon = '#d8b04a') {
  const alza = (a, d) => d > r * 0.7 ? (d - r * 0.7) * (Math.pow(Math.abs(Math.cos(a * n / 2)), 4) * 0.7 + 0.25) * 1.4 : 0;
  const g = new THREE.LatheGeometry([new V2(0.001, r * 0.64), new V2(r * 0.45, r * 0.63), new V2(r * 0.58, r * 0.58), new V2(r * 0.62, r * 0.2), new V2(r * 1.25, 0.002 * r), new V2(r * 1.3, r * 0.04)], 48), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) + alza(Math.atan2(x, z), Math.hypot(x, z))); }
  g.computeVertexNormals();
  const s = new THREE.Group(); s.add(new THREE.Mesh(g, tela({ color, roughness: 0.7 })));
  const pts = []; for (let i = 0; i < 96; i++) { const a = i / 96 * TAU, d = r * 1.29; pts.push(new V3(Math.sin(a) * d, r * 0.035 + alza(a, d), Math.cos(a) * d)); }
  s.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, r * 0.028, 5, true), metal({ color: galon, roughness: 0.4 })));
  return s;
}
// Cabezudo (la cabeza grande de cartón piedra del coronel Lagunero, o la cabeza de un solo ojo de Tartalo): la
// cara pintada en su lienzo, nariz, orejas, pelo y bigote; tapa la cabeza del personaje, que se encoge dentro
function cabezudo(r, o) {
  const g = new THREE.Group(), piel = tela({ color: o.piel, roughness: 0.6 });
  const cara = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), [piel, tela({ map: caraPintada(o.id, o), roughness: 0.55 })]);
  // (la mitad de delante con la cara pintada: un grupo de caras de la esfera con su material)
  const geo = cara.geometry, idx = geo.index.array, uv = geo.attributes.uv; geo.clearGroups(); let a = 0, b = 0; const F = [], Bk = [];
  for (let t = 0; t < idx.length; t += 3) { const u = (uv.getX(idx[t]) + uv.getX(idx[t + 1]) + uv.getX(idx[t + 2])) / 3; (u > 0.13 && u < 0.37 ? F : Bk).push(idx[t], idx[t + 1], idx[t + 2]); }
  geo.setIndex([...Bk, ...F]); a = Bk.length; b = F.length; geo.addGroup(0, a, 0); geo.addGroup(a, b, 1);
  // (la cara mira hacia +z: la franja de u entre 0,13 y 0,37 de la esfera; se le pone su propia proyección plana)
  const p = geo.attributes.position; for (const i of F) uv.setXY(i, 0.5 + p.getX(i) / (r * 1.5), 0.5 + p.getY(i) / (r * 1.5));
  cara.scale.set(1, o.alto || 1.12, 1); g.add(cara);
  const nariz = new THREE.Mesh(new THREE.SphereGeometry(r * (o.nariz || 0.2), 14, 10), piel); nariz.scale.set(0.8, 1, 1.2); nariz.position.set(0, -r * 0.05, r * 0.98); g.add(nariz);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 10, 8), piel); e.scale.set(0.4, 1, 0.7); e.position.set(s * r * 0.98, 0, 0); g.add(e); }
  if (o.pelo) { const pe = new THREE.Mesh(new THREE.SphereGeometry(r * 1.03, 28, 16, 0, TAU, 0, Math.PI * (o.peloHasta || 0.52)), tela({ map: crin(o.pelo, false) })); pe.rotation.x = o.peloGiro ?? -0.25; pe.scale.y = o.alto || 1.12; g.add(pe); }
  if (o.bigote) for (const s of [-1, 1]) g.add(new THREE.Mesh(tubo(curva([0, -r * 0.28, r * 1.02], [s * r * 0.3, -r * 0.32, r * 0.92], [s * r * 0.48, -r * 0.18, r * 0.75], [s * r * 0.42, -r * 0.05, r * 0.72]), r * 0.07, r * 0.02, 12, 6), tela({ color: o.bigote })));
  return g;
}

// ---------- la ropa de cada traje ----------
// Todo se mide en el espacio del modelo en reposo: x, y, z en fracción de su altura, con los pies en y = 0 (la cintura
// queda hacia el 0,43, los hombros hacia el 0,64, los ojos en el 0,787 y lo alto de la cabeza en el 1). Cada traje lleva
// model (el personaje de Meshy de base), ropa (los colores de su ropa pintada, con outfitTint) y vestir(V)
const blanca = () => tela({ color: '#f6f3ea', roughness: 0.92 });
// ¿en la elipse de la careta? (en la proyección de la cara; k > 1, algo más grande)
const enCara = (x, y, z, k = 1) => { const [a, b] = CARA(x, y); return z > 0.03 && ((a - 0.5) / (0.47 * k)) ** 2 + ((b - 0.47) / (0.44 * k)) ** 2 < 1; };
// lo que queda fuera de la abertura de la cara (el óvalo k, hasta la altura alto), con signo y en fracción de la altura:
// para ceñida, que recorta por él un borde liso (con sí o no, el borde seguía los triángulos del flequillo)
const sinCara = (x, y, z, k = 1, alto = 0.842) => { const [a, b] = CARA(x, y), q = Math.hypot((a - 0.5) / (0.47 * k), (b - 0.47) / (0.44 * k)); return Math.max((q - 1) * 0.11 * k, y - alto, 0.03 - z); };
// la careta por la frente: lo que sobresale del cráneo es el flequillo de debajo y se lleva a él, y la franja de la
// frente se alisa (el borde de arriba copiaba los mechones); la nariz y la boca, como son
function frenteLisa(extra) {
  const E = { c: CRANEO.c, r: CRANEO.r.clone().addScalar(extra) };
  return (p, n) => {
    const d = new V3().subVectors(p, E.c).divide(E.r), s = d.length();
    if (s > 1) { const k = sstep(p.y, 0.8, 0.83); p.lerp(d.clone().divideScalar(s).multiply(E.r).add(E.c), k); n.lerp(d.clone().divide(E.r).normalize(), k); }
    return sstep(p.y, 0.815, 0.835);
  };
}
// careta de cartón pintada sobre la cara (sigue su forma: nariz, pómulos, barbilla; por los agujeros se ven los ojos) y
// capucha de tela de su color ceñida al resto de la cabeza y al cuello
function caretaYCapucha(V, color, cara) {
  const m = V.mesh;
  // (con su esclavina por los hombros, hasta el pecho: así se ve que es una capucha)
  const tc = tela({ map: rep(tejido(color), 3, 3) });
  ceñida(m, (x, y, z, zn) => zn === 1 ? Math.min(y - 0.6, sinCara(x, y, z, 0.86)) : -1, (x, y, z) => 0.017 + 0.003 * noise(x * 30, y * 30, z * 30), tc, 3, ajustada(m, 0.014, 0.8));
  ceñida(m, (x, y, z, zn) => zn === 1 ? -sinCara(x, y, z, 1.1, 0.858) : -1, () => 0.015, tela({ map: careta(cara.id, cara), alphaTest: 0.5, roughness: 0.6 }), CARA, frenteLisa(0.01));
  // la esclavina de la capucha, por los hombros hasta el pecho
  campana(m, [[0.08, 0.648], [0.15, 0.61], [0.205, 0.555], [0.21, 0.54]], tc, { pliegues: 10, hondo: 0.04, hueso: 'Spine2', ovalo: 0.78 });
}
// El cuerpo en una rejilla polar (alturas de 0,005 y ángulos de 5°, desde el eje del cuerpo): en cada casilla, lo más
// alejado del eje. Una vez por modelo y zonas; luego cada consulta es inmediata
const POLAR_Y = 210, POLAR_A = 72;
function polar(mesh, zonas) {
  const B = cuerpo(mesh), key = 'polar' + zonas.join(); B.cache ??= {}; if (B.cache[key]) return B.cache[key];
  const G = new Float32Array(POLAR_Y * POLAR_A);
  for (let i = 0; i < B.n; i++) {
    if (!zonas.includes(B.zone[i])) continue;
    const x = B.pos[i * 3] / B.H, y = (B.pos[i * 3 + 1] - B.y0) / B.H, z = B.pos[i * 3 + 2] / B.H;
    const iy = Math.min(POLAR_Y - 1, Math.max(0, Math.floor(y / 0.005))), ia = ((Math.floor((Math.atan2(x, z) / TAU + 1) * POLAR_A) % POLAR_A) + POLAR_A) % POLAR_A, r = Math.hypot(x, z);
    if (r > G[iy * POLAR_A + ia]) G[iy * POLAR_A + ia] = r;
  }
  return (B.cache[key] = G);
}
// el radio del cuerpo a una altura y en una dirección (a: ángulo desde delante; en fracción de la altura): lo más alejado
// en las casillas de alrededor (dy y da casillas a cada lado), para que lo que cae rozándolo no lo atraviese
function radio(mesh, y, a, zonas = [0, 1], dy = 3, da = 2) {
  const G = polar(mesh, zonas), iy = Math.floor(y / 0.005), ia = Math.floor((a / TAU + 1) * POLAR_A); let r = 0;
  for (let e = -dy; e <= dy; e++) { const yy = iy + e; if (yy < 0 || yy >= POLAR_Y) continue; for (let d = -da; d <= da; d++) r = Math.max(r, G[yy * POLAR_A + (((ia + d) % POLAR_A) + POLAR_A) % POLAR_A]); }
  return r || 0.08;
}
// Mechones y barbas con piel: tiras que bajan rozando el cuerpo, de un ángulo a desde la altura y0 a la y1; arriba van con
// la cabeza y, al bajar, con el pecho o la espalda (al andar no se despegan ni lo atraviesan)
function cortina(mesh, tiras, mat) {
  const B = cuerpo(mesh), H = B.H, y0 = B.y0, idx = {}; mesh.skeleton.bones.forEach((b, i) => { idx[b.name.replace(/^mixamorig:?/, '')] = i; });
  const pesos = (y) => { const t = clamp((y - 0.62) / 0.12, 0, 1); return [[idx.Head ?? 0, t], [idx.Spine2 ?? 0, 1 - t]]; };
  const P = [], U = [], S = [], W = [], I = []; let base = 0, apl = mesh.userData.aplanado;
  tiras.forEach(({ a, y0: ya, y1: yb, ancho, sep = 0.018, n = 10, u0 = 0, zonas = [0, 1], vuelo = 0 }) => {
    const sa = Math.sin(a), ca = Math.cos(a), cx = Math.cos(a), cz = -Math.sin(a);   // (lo ancho de la tira va de lado)
    for (let k = 0; k <= n; k++) {
      // (con el pelo de debajo aplastado, por la cabeza bajan rozando el cráneo y no por las puntas que ya no están)
      const t = k / n, y = lerp(ya, yb, t), rc = apl && y > 0.68 ? rCraneo(y, a, 0.012) : 0, w = ancho * (1 - 0.35 * t) / 2;
      const r = (rc ? Math.min(radio(mesh, y, a, zonas), rc) : radio(mesh, y, a, zonas)) + sep + vuelo * t * t;
      for (const s of [-1, 1]) { P.push((sa * r + s * cx * w) * H, y0 + y * H, (ca * r + s * cz * w) * H); U.push(u0 + (s + 1) * 0.25, 1 - t); const pw = pesos(y); S.push(pw[0][0], pw[1][0], 0, 0); W.push(pw[0][1], pw[1][1], 0, 0); }
      if (k) I.push(base + k * 2 - 2, base + k * 2 - 1, base + k * 2, base + k * 2 - 1, base + k * 2 + 1, base + k * 2);
    }
    base += (n + 1) * 2;
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals();
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(S, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(W, 4));
  return piel(mesh, g, mat);
}
// melena: tiras alrededor de la parte de atrás de la cabeza, de los ángulos a0 a a1 (π: la nuca), hasta la altura fin
const melena = (mesh, mat, { a0 = Math.PI * 0.62, a1 = Math.PI * 1.38, n = 13, desde = 0.9, fin = 0.45, ancho = 0.06, lados = true } = {}) => {
  const T = []; for (let i = 0; i < n; i++) { const a = lerp(a0, a1, i / (n - 1)); T.push({ a, y0: desde, y1: fin + 0.03 * Math.sin(i * 2.3), ancho, u0: (i % 4) * 0.12, zonas: [0, 1] }); }
  // (a los lados, hasta los hombros: más largo caería sobre los brazos)
  if (lados) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) T.push({ a: Math.PI / 2 * s + s * i * 0.18, y0: desde - 0.02, y1: 0.66, ancho: ancho * 0.9, u0: i * 0.2, zonas: [1] });
  return cortina(mesh, T, mat);
};
// La forma lisa de una capucha o un saco: la cabeza (con el pelo) envuelta en un elipsoide; hacia el cuello y hacia el
// borde de la cara vuelve a ceñirse al cuerpo
// (E: un elipsoide { c, r } dado, el del cráneo para el pelo recogido; sin él, el que envuelve la cabeza con su pelo)
function lisa(mesh, E = null, bajo = [0.66, 0.74], borde = [0.72, 1.15]) {
  const B = cuerpo(mesh), lo = new V3(1, 1, 1), hi = new V3(-1, -1, -1), v = new V3();
  // (el ancho y el fondo, del cráneo con el pelo: de la frente para arriba; sin la nariz, que no abombe la capucha)
  let y0 = 1, y1 = 0;
  for (let i = 0; i < B.n; i++) if (B.zone[i] === 1) { v.set(B.pos[i * 3] / B.H, (B.pos[i * 3 + 1] - B.y0) / B.H, B.pos[i * 3 + 2] / B.H); if (v.y > 0.68) { y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); } if (v.y > 0.8) { lo.min(v); hi.max(v); } }
  lo.y = y0; hi.y = y1;
  const c = E ? E.c.clone() : new V3().addVectors(lo, hi).multiplyScalar(0.5), R = E ? E.r.clone() : new V3().subVectors(hi, lo).multiplyScalar(0.54).addScalar(0.006);
  if (!E) { c.y = Math.min(c.y, 0.83); R.y = Math.max(R.y, hi.y - c.y + 0.008); }
  return (p, n) => {
    const d = new V3().subVectors(p, c).divide(R), s = d.length(); if (s < 1e-4) return;
    const e = d.clone().divideScalar(s).multiply(R).add(c), en = d.clone().divide(R).normalize();
    // (a pleno elipsoide arriba y detrás; abajo, hacia el cuello, y junto a la cara, lo que pida el cuerpo)
    const [a, b] = CARA(p.x, p.y), cara = p.z > 0 && p.y < 0.85 ? 1 - sstep(((a - 0.5) / 0.47) ** 2 + ((b - 0.47) / 0.44) ** 2, borde[0], borde[1]) : 0;
    const k = sstep(p.y, bajo[0], bajo[1]) * (1 - cara);
    // (con el cráneo: lo que sobresale de él es pelo de punta y se lleva a él también junto a la cara; si no, el borde
    // de la capucha copiaba el flequillo en dientes)
    // (en la cara, solo de las cejas para arriba: la nariz y la barbilla también sobresalen del cráneo y no son pelo)
    const pelo = Math.max(1 - cara, sstep(p.y, 0.815, 0.835)), fuera = E && s > 1 ? sstep(p.y, 0.72, 0.76) * pelo : 0;
    if (fuera > 0) { p.lerp(e, Math.max(k, fuera)); n.lerp(en, Math.max(k, fuera * sstep(s, 1, 1.03))); }
    else { p.lerp(e, k); n.lerp(en, k); }
    return (1 - Math.max(k, fuera)) * pelo;   // (lo que sigue al cuerpo fuera de la cara: ceñida lo alisa; la nariz no)
  };
}
// Ajustada a la cabeza: el pelo de chico se aplasta contra el cráneo (en el sombreador) y la capucha, la toca o el
// pañuelo van pegados a él, a extra de distancia (en fracción de la altura). Entera sobre el cráneo hasta la nuca: a
// medias, un mechón de punta asomaba por debajo como una astilla
// (frente: ver aplanarPelo; con capucha o trapo, 0,8)
function ajustada(m, extra = 0.012, frente = 0.855) {
  if (!m.userData.aplanado) { aplanarPelo(m, CRANEO, frente); m.userData.aplanado = true; }
  return lisa(m, { c: CRANEO.c, r: CRANEO.r.clone().addScalar(extra) }, [0.63, 0.68], [0.9, 1.0]);
}
// cesta de mimbre puesta del revés en la cabeza, con cuernos de vaca a los lados (momotxorros, iraskos); el origen,
// en el centro de la boca de la cesta
function cestaCuernos(r, cuernos = 1.15) {
  const g = new THREE.Group(), mi = tela({ map: rep(mimbre(), 3, 1) });
  g.add(new THREE.Mesh(new THREE.LatheGeometry([new V2(r * 0.82, r * 0.86), new V2(r * 0.97, r * 0.55), new V2(r * 1.03, r * 0.1), new V2(r * 1.06, 0)], 32), mi));
  const tapa = new THREE.Mesh(new THREE.CircleGeometry(r * 0.82, 24), mi); tapa.rotation.x = -Math.PI / 2; tapa.position.y = r * 0.86; g.add(tapa);
  const ag = new THREE.TorusGeometry(r * 1.06, r * 0.045, 6, 36); ag.rotateX(Math.PI / 2); g.add(new THREE.Mesh(ag, tela({ color: '#7a5226' })));
  for (const s of [-1, 1]) { const c = cuerno(r * cuernos, s); c.position.set(s * r * 0.9, r * 0.42, r * 0.05); g.add(c); }
  return g;
}
// abarcas (joaldunak, momotxorros): la abarca de cuero en el pie, la pierna envuelta en lana blanca hasta media
// pantorrilla y las correas negras cruzadas por encima (en la proyección de cada pierna: u alrededor de ella)
const cuero = (c) => lienzo('cuero' + c, 128, 128, (g, w, h, R) => {
  g.fillStyle = c; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,230,200'},${0.04 + R() * 0.06})`; g.beginPath(); g.arc(R() * w, R() * h, 0.6 + R() * 1.6, 0, TAU); g.fill(); }
  g.strokeStyle = 'rgba(240,220,180,.55)'; g.lineWidth = 1.2; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(0, h * 0.82); g.lineTo(w, h * 0.82); g.stroke();
});
const correas = (c) => lienzo('correas' + c, 128, 128, (g, w, h) => {
  g.strokeStyle = c; g.lineWidth = 7; g.lineCap = 'round';
  for (let k = -1; k <= 1; k++) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w * (0.5 + k) - s * w * 0.5, 0); g.lineTo(w * (0.5 + k) + s * w * 0.5, h); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; for (let k = -1; k <= 1; k++) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w * (0.5 + k) - s * w * 0.5 - 2, 0); g.lineTo(w * (0.5 + k) + s * w * 0.5 - 2, h); g.stroke(); }
});
// lo que se ve de los pies bajo una falda larga (zapatos de cuero o los pies de pato de la lamia), sobre las zapatillas
// del modelo
const escamas = (c) => lienzo('escamas' + c, 128, 128, (g, w, h) => {
  g.fillStyle = c; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h + 8; y += 8) for (let x = 0; x < w + 8; x += 8) { const cx = x + ((y / 8) % 2) * 4; g.strokeStyle = 'rgba(90,40,0,.45)'; g.lineWidth = 1.2; g.beginPath(); g.arc(cx, y, 4.2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); g.strokeStyle = 'rgba(255,240,200,.25)'; g.lineWidth = 0.8; g.beginPath(); g.arc(cx, y - 1.2, 3.2, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke(); }
});
// (hasta el tobillo, como un botín: con la pierna atrás, el tobillo asomaba bajo el bajo de la falda)
function zapatos(V, mat) {
  ceñida(V.mesh, (x, y, z, zn) => zn === 4 || (zn === 3 && y < 0.11) ? 0.105 - y : -1, (x, y, z, f) => 0.005 + 0.004 * (1 - sstep(f, 0, 0.006)), mat, 8);
}
function abarcas(V, { calcetin = '#efe9dc', correa = '#17140f', abarca = '#5a3a22', hasta = 0.2 } = {}) {
  const m = V.mesh, B = cuerpo(m);
  // (el eje de cada pierna, por la pantorrilla)
  const ejes = [-1, 1].map(s => { let sx = 0, sz = 0, n = 0; for (let i = 0; i < B.n; i++) { if (B.zone[i] !== 3) continue; const x = B.pos[i * 3] / B.H, y = (B.pos[i * 3 + 1] - B.y0) / B.H; if (Math.sign(x) === s && y > 0.1 && y < 0.14) { sx += x; sz += B.pos[i * 3 + 2] / B.H; n++; } } return n ? [sx / n, sz / n] : [s * 0.05, 0]; });
  const pierna = (x, y, z) => { const e = ejes[x < 0 ? 0 : 1]; return [Math.atan2(x - e[0], z - e[1]) / TAU + 0.5, y / 0.06]; };
  const lan = lana(calcetin, 0.6);
  ceñida(m, (x, y, z, zn) => (zn === 3 || zn === 4) ? Math.min(y - 0.045, hasta - y) : -1, (x, y, z, f) => 0.006 + 0.004 * (1 - sstep(f, 0, 0.008)), tela({ map: rep(lan, 2, 2), bumpMap: rep(lan, 2, 2), bumpScale: 1, roughness: 1 }), pierna);
  ceñida(m, (x, y, z, zn) => (zn === 3 || zn === 4) ? Math.min(y - 0.05, hasta - 0.02 - y) : -1, () => 0.011, tela({ map: correas(correa), alphaTest: 0.5, roughness: 0.6 }), pierna);
  ceñida(m, (x, y, z, zn) => zn === 4 || (zn === 3 && y < 0.07) ? 0.075 - y : -1, (x, y, z, f) => 0.005 + 0.004 * (1 - sstep(f, 0, 0.006)), tela({ map: rep(cuero(abarca), 2, 1), roughness: 0.65, relieve: false }), pierna);
}
const PLUMAS = ['#d42f2f', '#f2c230', '#2f7fd6', '#3aa05a', '#e86aa8', '#f08a2a', '#ffffff'];
/** Los trajes: id → { model, ropa, vestir(V) }. */
export const TRAJES = {
  // Joaldun de Ituren (Museo del Traje, «Traje de los joaldunak de Ituren»; Museo Etnológico de Navarra; prensa del
  // carnaval): pantalón azul marino, camisa de lino blanca, enaguas con doble volante de puntilla, pieles de oveja de pelo
  // largo a la cintura y en los hombros, pañuelo al cuello (rojo en Ituren), ttuntturro de medio metro con cintas de
  // colores y plumas, isipu de crin de caballo en la mano derecha y dos grandes cencerros de cobre (joareak) atados a la
  // cintura con una soga, a la espalda
  joaldun: {
    model: 'sanfermin', ropa: { shirt: '#f4f1e8', pants: '#1c2440', acc: '#c8102e' },
    vestir(V) {
      const { mesh: m, P, u } = V, w = contorno(m, 0.43);
      campana(m, [[w * 1.02, 0.445], [w * 1.22, 0.36], [w * 1.4, 0.26], [w * 1.48, 0.215]], blanca(), { pliegues: 18, hondo: 0.05 });
      const enc = tela({ map: rep(puntilla(), 7, 1), alphaTest: 0.5 });
      campana(m, [[w * 1.46, 0.228], [w * 1.6, 0.18], [w * 1.64, 0.165]], enc, { pliegues: 22, hondo: 0.07 });
      campana(m, [[w * 1.58, 0.188], [w * 1.72, 0.14], [w * 1.76, 0.125]], enc, { pliegues: 24, hondo: 0.08 });
      // las pieles: a la cintura, con los mechones de lana colgando del borde, y por los hombros
      const lt = lana('#efe8d8'), lan = tela({ map: rep(lt, 5, 3), bumpMap: rep(lt, 5, 3), bumpScale: 2, roughness: 1 });
      campana(m, [[w * 1.16, 0.478], [w * 1.42, 0.41], [w * 1.6, 0.335], [w * 1.57, 0.315]], lan, { pliegues: 9, hondo: 0.1, vuelo: 0.5 });
      campana(m, [[w * 1.58, 0.325], [w * 1.63, 0.275], [w * 1.62, 0.262]], tela({ map: rep(mechones('#efe8d8'), 7, 1), alphaTest: 0.45, roughness: 1 }), { pliegues: 9, hondo: 0.1, vuelo: 0.55 });
      ceñida(m, (x, y, z, zn) => (zn === 0 || zn === 2) && y > 0.53 && y < 0.66 && Math.abs(x) < 0.17, (x, y, z) => 0.012 + 0.02 * noise(x * 60, y * 60, z * 60), lan, 3);
      const sg = new THREE.TorusGeometry(u(w * 1.43), u(0.006), 6, 40); sg.rotateX(Math.PI / 2); sg.scale(1, 1, 0.84);
      const soga = new THREE.Mesh(sg, tela({ color: '#cbb48a' })); soga.position.copy(P(0, 0.44, 0.005)); V.put(soga, 'Hips');
      for (const s of [-1, 1]) {
        const c = cencerro(u(0.135)), g = new THREE.Group(); g.add(c); g.position.copy(P(s * 0.065, 0.44, -w * 1.2)); V.put(g, 'Hips');
        V.tick((t, v) => { const k = Math.min(1, v / 1.5); c.rotation.x = 0.28 + Math.sin(t * 9 + s) * 0.2 * k; c.rotation.z = s * 0.12 + Math.sin(t * 9 + s * 1.4) * 0.12 * k; });
      }
      const h = ttuntturro(u(0.158), u(0.34), PLUMAS); h.position.copy(P(0, 0.915, -0.01)); V.put(h, 'Head');
      V.hold(isipu(u(0.34)), 'RightHand');
      abarcas(V, { hasta: 0.17 });
    },
  },
  // Momotxorro de Altsasu (crónicas del carnaval de Altsasu): cesta en la cabeza de la que salen cuernos de vaca, entre
  // ellos el frontil (ipuruko) del que cuelgan crines que tapan la cara; piel de oveja (narru) a la espalda sujeta con un
  // cinturón del que penden dos cencerros; delante, una sábana manchada de sangre; pantalón azul, camisa blanca y el sarde
  // (horca) en la mano
  momotxorro: {
    model: 'sanfermin', ropa: { shirt: '#efe9dc', pants: '#2c4a7a', acc: '#efe9dc' },
    vestir(V) {
      const { mesh: m, P, u } = V, w = contorno(m, 0.43);
      // la sábana, por delante del pecho a las rodillas (por detrás, abierta)
      const sb = tela({ map: sabana(), roughness: 0.95, relieve: 'pliegues' });
      ceñida(m, (x, y, z, zn) => zn === 0 && z > -0.005 && y > 0.425 && y < 0.625 && Math.abs(x) < 0.15, () => 0.016, sb, (x, y) => [0.5 + x * 1.6, y * 1.6]);
      campana(m, [[w * 1.04, 0.45], [w * 1.22, 0.34], [w * 1.36, 0.21]], sb, { pliegues: 7, hondo: 0.035, hueco: Math.PI * 1.1, centro: Math.PI, vuelo: 0.6 });
      // la piel de oveja a la espalda, con su borde de mechones
      const lt = lana('#5c4632', 1.25), narru = tela({ map: rep(lt, 4, 3), bumpMap: rep(lt, 4, 3), bumpScale: 2.5, roughness: 1 });
      ceñida(m, (x, y, z, zn) => (zn === 0 || zn === 2) && z < 0.025 && y > 0.37 && y < 0.665 && Math.abs(x) < 0.19, (x, y, z) => 0.02 + 0.03 * noise(x * 50, y * 50, z * 50), narru, 3);
      campana(m, [[w * 1.3, 0.392], [w * 1.37, 0.335], [w * 1.36, 0.32]], tela({ map: rep(mechones('#5c4632'), 5, 1), alphaTest: 0.45, roughness: 1 }), { pliegues: 7, hondo: 0.08, hueco: Math.PI * 1.15, vuelo: 0.5 });
      const cg = new THREE.TorusGeometry(u(w * 1.3), u(0.009), 4, 40); cg.rotateX(Math.PI / 2); cg.scale(1, 1, 0.85);
      const cint = new THREE.Mesh(cg, tela({ color: '#3a2414', roughness: 0.6 })); cint.position.copy(P(0, 0.435, 0.005)); V.put(cint, 'Hips');
      for (const s of [-1, 1]) { const c = cencerro(u(0.1)), g = new THREE.Group(); g.add(c); g.position.copy(P(s * 0.07, 0.43, -w * 1.15)); V.put(g, 'Hips'); V.tick((t, v) => { c.rotation.x = 0.25 + Math.sin(t * 8 + s) * 0.22 * Math.min(1, v / 1.5); }); }
      // la cabeza: cesta con cuernos, frontil con tachuelas y crines espesas hasta el pecho (dos capas, abriéndose abajo)
      const r = u(0.19), g = cestaCuernos(r);
      const fr = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.07, r * 1.07, r * 0.42, 20, 1, true, -0.55, 1.1), tela({ color: '#3e2412', roughness: 0.55 })); fr.position.y = r * 0.24; g.add(fr);
      for (let i = 0; i < 5; i++) { const a = (i / 4 - 0.5) * 0.9, d = new THREE.Mesh(new THREE.SphereGeometry(r * 0.045, 8, 6), metal({ color: '#d8b04a' })); d.position.set(Math.sin(a) * r * 1.09, r * 0.24, Math.cos(a) * r * 1.09); g.add(d); }
      const cr = tela({ map: crin('#16110d'), alphaTest: 0.45 }), pl = [];
      for (const [n, rr, sp, lz] of [[16, 1.09, 2.5, 0.36], [10, 1.02, 2.0, 0.3]]) for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * sp, len = u(lz) * (0.85 + 0.06 * ((i * 7) % 5)), pg = new THREE.PlaneGeometry(r * 0.5, len, 1, 5), pp = pg.attributes.position;
        for (let k = 0; k < pp.count; k++) { const d = (len / 2 - pp.getY(k)) / len; pp.setZ(k, d * d * u(0.05)); }
        pg.translate(0, -len / 2, 0); const p = new THREE.Mesh(pg, cr); p.position.set(Math.sin(a) * r * rr, r * 0.08, Math.cos(a) * r * rr); p.rotation.y = a; pl.push(p);
      }
      g.add(junta(pl));
      g.position.copy(P(0, 0.86, 0)); V.put(g, 'Head');
      V.hold(sarde(u(0.95)), 'RightHand');
      abarcas(V, { calcetin: '#e8e2d4', hasta: 0.16 });
    },
  },
  // Cascabobos de Aoiz (programa del carnaval de Aoiz): calzones a rayas de colores, camisa blanca suelta, ttuntturro con
  // cintas y antifaz para no ser reconocidos
  cascabobo: {
    model: 'sanfermin', ropa: { shirt: '#f6f2e8', acc: '#f6f2e8' },
    vestir(V) {
      const { mesh: m, P, u } = V;
      ceñida(m, (x, y, z, zn) => (zn === 3 || zn === 0) ? Math.min(y - 0.17, 0.43 - y) : -1, (x, y, z, f) => 0.009 + 0.006 * (1 - sstep(f, 0, 0.012)), tela({ map: rep(rayas(['#d42f2f', '#f2c230', '#2f6fd0', '#3aa05a', '#f08a2a', '#7a3ab0']), 5, 1), relieve: 'arrugas', relieveRep: [5, 2] }), 1);
      const h = ttuntturro(u(0.15), u(0.27), ['#d42f2f', '#f2c230', '#2f7fd6', '#3aa05a', '#ffffff'], '#d42f2f'); h.position.copy(P(0, 0.915, -0.01)); V.put(h, 'Head');
      // el antifaz sobre los ojos, con su cordón por detrás
      ceñida(m, (x, y, z, zn) => zn === 1 && z > 0.02 && y > 0.735 && y < 0.85, () => 0.008, tela({ map: antifazTex(), alphaTest: 0.5, roughness: 0.7 }), CARA);
      ceñida(m, (x, y, z, zn) => zn === 1 && z < 0.06 && y > 0.765 && y < 0.81, () => 0.008, tela({ map: cordon(), alphaTest: 0.5 }), (x, y) => [0.5, (y - 0.765) / 0.045]);
    },
  },
  // Zipoteros de Vidángoz (programa del carnaval de Vidángoz): ropa vieja, la cara tapada con un trozo de tela y, en las
  // manos, el cesto para los huevos y el gerren (asador) para la carne, todo bajo un pañuelo de colores
  zipotero: {
    model: 'sanfermin', ropa: { shirt: '#a89878', pants: '#5a4a38', acc: '#7a2a2a' },
    vestir(V) {
      const { mesh: m, P, u } = V;
      // la camisa vieja, con remiendos
      ceñida(m, (x, y, z, zn) => (zn === 0 || zn === 2) ? Math.min(y - 0.41, 0.665 - y) : -1, (x, y, z, f) => 0.009 + 0.005 * (1 - sstep(f, 0, 0.01)), tela({ map: rep(remiendos('#a89878'), 2, 1), roughness: 0.95, relieve: 'arrugas', relieveRep: [2, 2] }), 1);
      // el trapo que tapa la cara, con dos agujeros para ver
      ceñida(m, (x, y, z, zn) => zn === 1 ? Math.min(z + 0.035, y - 0.64, 0.9 - y) : -1, (x, y, z) => 0.008 + 0.005 * noise(x * 30, y * 30, z * 30), tela({ map: trapoCara(), alphaTest: 0.5, roughness: 0.95 }), CARA, ajustada(m, 0.009, 0.8));
      // el pañuelo de colores atado a la cabeza, con el nudo en la nuca
      const pa = panuelo('#24418c', '#f2c230', '#c8202a');
      ceñida(m, (x, y, z, zn) => zn === 1 ? Math.max(y - 0.872, Math.min(-0.035 - z, y - 0.74)) : -1, (x, y, z) => 0.017 + 0.006 * noise(x * 30, y * 30, z * 30), tela({ map: rep(pa, 3, 2) }), 2, ajustada(m, 0.016));
      const nudo = new THREE.Group(), pn = tela({ map: pa });
      nudo.add(new THREE.Mesh(new THREE.SphereGeometry(u(0.024), 10, 8), pn));
      for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(u(0.032), u(0.1), 4, 1, true), pn); c.rotation.set(Math.PI - 0.35, 0, s * 0.45); c.position.set(s * u(0.02), -u(0.045), -u(0.01)); c.scale.z = 0.3; nudo.add(c); }
      nudo.position.copy(P(0, 0.755, -0.198)); V.put(nudo, 'Head');
      V.hold(cesto(u(0.17), pa), 'LeftHand');
      V.hold(gerren(u(0.62)), 'RightHand');
    },
  },
  // El coronel Lagunero de Tafalla (el muñeco grotesco que se cuelga en la plaza y se quema el martes de carnaval):
  // cabezudo con bicornio y bigotes, casaca azul con faldones y charreteras, calzón blanco y faja roja
  lagunero: {
    model: 'pastor', ropa: { shirt: '#f4f1e8', vest: '#22305a', pants: '#f1ede2', acc: '#c8102e' },
    vestir(V) {
      const { mesh: m, P, u } = V, w = contorno(m, 0.43), r = u(0.24);
      campana(m, [[w * 1.08, 0.445], [w * 1.25, 0.39], [w * 1.4, 0.3]], tela({ color: '#22305a' }), { pliegues: 6, hondo: 0.03, hueco: 1.5, vuelo: 0.4 });
      const c = cabezudo(r, { id: 'lagunero', piel: '#f0c6a0', enfado: true, nariz: 0.24, bigote: '#2a1a12', pelo: '#dcd7cf' });
      const t = picos(r * 0.95, 2, '#141418'); t.position.y = r * 0.93; c.add(t);
      V.hideHead(); c.position.copy(P(0, 0.62 + 0.24 * 1.12 * 0.95, 0.005)); V.put(c, 'Neck');
      for (const s of [-1, 1]) {
        const ch = new THREE.Group(), oro = metal({ color: '#d8b04a', roughness: 0.4 });
        ch.add(new THREE.Mesh(new THREE.CylinderGeometry(u(0.05), u(0.055), u(0.012), 16), oro));
        const fl = []; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, f = new THREE.Mesh(new THREE.CylinderGeometry(u(0.004), u(0.004), u(0.04), 4), oro); f.position.set(Math.sin(a) * u(0.05), -u(0.02), Math.cos(a) * u(0.05)); fl.push(f); }
        ch.add(junta(fl)); ch.rotation.z = s * 0.35; ch.position.copy(P(s * 0.13, 0.655, 0)); V.put(ch, 'Spine2');
      }
    },
  },
  // Oridos e iraskos de Lumbier (así salen en el juego: «con sacos y cestas con cuernos»): metidos en sacos de
  // arpillera, la cabeza también, con dos agujeros para ver; la cesta con cuernos encima, una soga de cinturón y el cencerro
  irasko: {
    model: 'sanfermin', ropa: { shirt: '#8a7350', pants: '#5a4630', acc: '#8a7350' },
    vestir(V) {
      const { mesh: m, P, u } = V, w = contorno(m, 0.43), sa = tela({ map: rep(arpillera(), 6, 6), roughness: 1, relieve: 'saco', relieveRep: [10, 10] });
      ceñida(m, (x, y, z, zn) => (zn === 0 || zn === 2) && y > 0.42 && y < 0.64, (x, y, z) => 0.012 + 0.004 * noise(x * 40, y * 40, z * 40), sa, 4);
      campana(m, [[w * 1.06, 0.45], [w * 1.3, 0.33], [w * 1.44, 0.235]], sa, { pliegues: 8, hondo: 0.06, vuelo: 0.7 });
      // el saco de la cabeza: por delante con los agujeros, por detrás liso; atado al cuello con una cuerda
      const L = ajustada(m, 0.016, 0.8);
      ceñida(m, (x, y, z, zn) => zn === 1 ? Math.min(y - 0.6, z) : -1, (x, y, z) => 0.016 + 0.006 * noise(x * 30, y * 30, z * 30), tela({ map: sacoCara(), alphaTest: 0.5, roughness: 1 }), CARA, L);
      ceñida(m, (x, y, z, zn) => zn === 1 ? Math.min(y - 0.6, 0.02 - z) : -1, (x, y, z) => 0.014 + 0.006 * noise(x * 30, y * 30, z * 30), sa, 4, L);
      const cu = tela({ color: '#a88a58', roughness: 0.9 });
      for (const [y, rr] of [[0.636, 0.085], [0.44, w * 1.12]]) { const tg = new THREE.TorusGeometry(u(rr), u(0.007), 5, 32); tg.rotateX(Math.PI / 2); tg.scale(1, 1, 0.85); const t = new THREE.Mesh(tg, cu); t.position.copy(P(0, y, 0.005)); V.put(t, y > 0.6 ? 'Neck' : 'Hips'); }
      const g = cestaCuernos(u(0.2), 1.0); g.position.copy(P(0, 0.87, 0)); V.put(g, 'Head');
      const c = cencerro(u(0.09)), b = new THREE.Group(); b.add(c); b.position.copy(P(0, 0.43, -w * 1.15)); V.put(b, 'Hips'); V.tick((t, v) => { c.rotation.x = 0.25 + Math.sin(t * 8) * 0.22 * Math.min(1, v / 1.5); });
    },
  },
  // Palokis de Estella (así salen en el juego: «elevan telas con un aro y parecen gigantes»): un aro en lo alto de un palo,
  // con la tela cayendo en pliegues hasta las rodillas, la cara pintada y el gorro de cintas
  paloki: {
    model: 'pastor', ropa: { shirt: '#b34fc4', pants: '#f4f1ea' },
    vestir(V) {
      const { P, u } = V, g = new THREE.Group(), R = u(0.22), top = 1.34, alto = u(top - 0.24);
      const lat = new THREE.LatheGeometry([new V2(R * 0.92, 0), new V2(R, -alto * 0.1), new V2(R * 1.18, -alto * 0.55), new V2(R * 1.36, -alto)], 48), p = lat.attributes.position;
      for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getX(i), p.getZ(i)), d = -p.getY(i) / alto, f = 1 + (0.03 + 0.09 * d) * Math.sin(a * 14); p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); }
      lat.computeVertexNormals(); g.add(new THREE.Mesh(lat, tela({ map: rep(telaPaloki('#8e3aa0', '#f2c230', '#d42f2f'), 6, 1) })));
      const ag = new THREE.TorusGeometry(R * 0.93, R * 0.04, 6, 30); ag.rotateX(Math.PI / 2); g.add(new THREE.Mesh(ag, tela({ color: '#7a5634' })));
      g.add(ttuntturro(R * 0.92, R * 2, ['#d42f2f', '#f2c230', '#2f7fd6', '#3aa05a', '#ffffff'], '#f2c230'));
      const cara = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.02, R * 1.03, R * 1.1, 20, 1, true, -0.7, 1.4), tela({ map: caraPintada('paloki', { piel: '#f2d8b8' }) })); cara.position.y = -R * 0.75; g.add(cara);
      g.position.copy(P(0, top, 0)); V.put(g, 'Spine2');
    },
  },
  // Comparsa de la Novenera (caretas y ropa a rayas del carnaval rural)
  'comparsa-mendigorria': {
    model: 'sanfermin', ropa: { shirt: '#3a8fd6', pants: '#d42f2f', acc: '#f4f1ea' },
    vestir(V) {
      ceñida(V.mesh, (x, y, z, zn) => (zn === 0 || zn === 2) && y > 0.4 && y < 0.64, () => 0.011, tela({ map: rep(rayas(['#3a8fd6', '#f4f1ea']), 10, 1) }), 1);
      caretaYCapucha(V, '#2a6fb8', { id: 'comparsa', piel: '#f1e2c8', mejilla: 'rgba(210,80,70,.5)' });
    },
  },
  // Miel Otxin de Lantz (el bandido del carnaval, muñeco grande relleno de paja: careta fiera con bigote y gorro cónico
  // muy alto de cintas)
  'miel-otxin': {
    model: 'sanfermin', ropa: { shirt: '#d42f2f', pants: '#f2c230', acc: '#2a2a2a' },
    vestir(V) {
      const { P, u } = V;
      caretaYCapucha(V, '#2a1a10', { id: 'otxin', piel: '#e8c8a0', enfado: true, mejilla: 'rgba(150,30,30,.5)', bigote: '#1a120c', cejas: '#1a120c' });
      const h = ttuntturro(u(0.17), u(0.55), PLUMAS, '#2f6fd0'); h.position.copy(P(0, 0.93, -0.01)); V.put(h, 'Head');
    },
  },
  // ---- seres de la mitología de Navarra (las leyendas del juego, de noche): mayores que una persona ----
  // Lamia (las de los ríos de la montaña navarra, como la de Xorroxin): mujer hermosa de larga melena dorada que se peina
  // con un peine de oro a la orilla del agua, y con pies de pato que asoman bajo la falda
  lamia: {
    model: 'sanfermin', female: true, ropa: { shirt: '#d6ece6', pants: '#3a8a7a', acc: '#3a8a7a' },
    vestir(V) {
      const { mesh: m, P, u } = V, w = contorno(m, 0.43);
      // (hasta el tobillo, con el ribete dorado por fuera del bajo y sus mismos pliegues; debajo, los pies de pato)
      campana(m, [[w * 1.02, 0.45], [w * 1.25, 0.33], [w * 1.5, 0.17], [w * 1.66, 0.08]], tela({ map: rep(tejido('#3f8f86'), 6, 4), relieve: 'pliegues', relieveRep: [3, 1] }), { pliegues: 16, hondo: 0.05, vuelo: 0.85 });
      campana(m, [[w * 1.6 * 1.03, 0.11], [w * 1.66 * 1.03, 0.078]], tela({ color: '#d8b04a', roughness: 0.5 }), { pliegues: 16, hondo: 0.05, vuelo: 0.85, rango: [0.45, 0.08] });
      zapatos(V, tela({ map: escamas('#e89a2a'), roughness: 0.55, relieve: false }));
      ceñida(m, (x, y, z, zn) => zn === 0 ? Math.min(y - 0.432, 0.462 - y) : -1, (x, y, z, f) => 0.012 + 0.004 * (1 - sstep(f, 0, 0.006)), tela({ color: '#1f5c55', roughness: 0.6 }), 1);
      ceñida(m, (x, y, z, zn) => zn === 0 && y > 0.43 && y < 0.6, () => 0.011, tela({ map: corpino('#2c7268', '#e8d8a8') }), 1 / 0.17);
      gorroPelo(V, '#e8c34a');
      melena(m, tela({ map: crin('#e8c34a'), alphaTest: 0.45, roughness: 0.6 }), { fin: 0.4, ancho: 0.07 });
      V.hold(peine(u(0.07)), 'RightHand');
      for (const s of [-1, 1]) { const p = pato(u(0.1)); p.position.copy(P(s * 0.06, 0.004, 0.06)); V.put(p, s > 0 ? 'LeftFoot' : 'RightFoot'); }
    },
  },
  // Basajaun, el señor del bosque: gigante cubierto de pelo largo de los pies a la cabeza, con melena y barba, que guarda
  // los rebaños y lleva un bastón de rama
  basajaun: {
    model: 'pastor', ropa: { shirt: '#5a3e26', vest: '#4a3420', pants: '#4a3420' },
    vestir(V) {
      const { mesh: m, u } = V, w = contorno(m, 0.43), base = '#5a3e26';
      const pel = crin(base, false), pm = tela({ map: rep(pel, 6, 3), bumpMap: rep(pel, 6, 3), bumpScale: 3, roughness: 1 });
      ceñida(m, (x, y, z, zn) => (zn === 0 || zn === 2 || zn === 3) && y > 0.07 && y < 0.65, (x, y, z) => 0.016 + 0.03 * noise(x * 40, y * 40, z * 40), pm, 3);
      // el pelo cae en capas: de los hombros, de la cintura, de las caderas y de las rodillas
      const me = tela({ map: rep(mechones(base), 7, 1), alphaTest: 0.45, roughness: 1 });
      campana(m, [[0.09, 0.645], [0.19, 0.59], [0.215, 0.53], [0.215, 0.51]], me, { pliegues: 9, hondo: 0.08, hueso: 'Spine2' });
      for (const [y, k] of [[0.47, 1.45], [0.33, 1.5]]) campana(m, [[w * k, y], [w * (k + 0.06), y - 0.07], [w * (k + 0.05), y - 0.09]], me, { pliegues: 9, hondo: 0.1, vuelo: 0.7 });
      gorroPelo(V, '#4e3420', false);   // (Basajaun, con todo su pelo)
      const cr = tela({ map: crin('#4e3420'), alphaTest: 0.45, roughness: 0.8 });
      melena(m, cr, { fin: 0.46, ancho: 0.075 });
      // la barba, desde la barbilla hasta el pecho
      const T = []; for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 1.3; T.push({ a, y0: 0.705, y1: 0.5 + 0.03 * Math.cos(i * 1.7), ancho: 0.05, sep: 0.012, u0: (i % 3) * 0.2, zonas: [0, 1], vuelo: 0.01 }); }
      cortina(m, T, cr);
      V.hold(rama(u(1.05)), 'RightHand');
    },
  },
  // Sorgina (las brujas de Zugarramurdi): mujer mayor de negro, con toca en la cabeza, chal de lana por los hombros, falda
  // larga, el pelo blanco que asoma por detrás y su escoba de brezo
  sorgina: {
    model: 'sanfermin', female: true, ropa: { shirt: '#3d3350', pants: '#2a2440', acc: '#2a2440' },
    vestir(V) {
      const { mesh: m, u } = V, w = contorno(m, 0.43), tn = tejido('#2a2440');
      // (hasta el tobillo; debajo, zapatos negros de cuero)
      campana(m, [[w * 1.02, 0.45], [w * 1.22, 0.33], [w * 1.42, 0.17], [w * 1.54, 0.08]], tela({ map: rep(tn, 6, 4), relieve: 'pliegues', relieveRep: [3, 1] }), { pliegues: 14, hondo: 0.05, vuelo: 0.85 });
      zapatos(V, tela({ map: rep(cuero('#1c1814'), 2, 1), roughness: 0.55, relieve: false }));
      ceñida(m, (x, y, z, zn) => zn === 0 ? Math.min(y - 0.432, 0.462 - y) : -1, (x, y, z, f) => 0.012 + 0.004 * (1 - sstep(f, 0, 0.006)), tela({ color: '#16121e', roughness: 0.6 }), 1);
      // el delantal, por delante
      campana(m, [[w * 1.06, 0.445], [w * 1.28, 0.3], [w * 1.42, 0.16]], tela({ map: rep(tejido('#4a4058'), 3, 3) }), { pliegues: 6, hondo: 0.03, hueco: Math.PI * 1.25, centro: Math.PI, vuelo: 0.6 });
      const chal = tela({ map: rep(tejido('#3d3350'), 4, 3) });
      campana(m, [[0.085, 0.645], [0.17, 0.6], [0.215, 0.53], [0.2, 0.47]], chal, { pliegues: 10, hondo: 0.05, hueso: 'Spine2' });
      campana(m, [[0.2, 0.48], [0.205, 0.44], [0.2, 0.43]], tela({ map: rep(mechones('#3d3350'), 8, 1), alphaTest: 0.45 }), { pliegues: 10, hondo: 0.05, hueso: 'Spine2' });
      // la toca: liso por la cabeza, dejando la cara al aire; el pelo blanco asoma por la nuca
      ceñida(m, (x, y, z, zn) => zn === 1 ? Math.min(y - 0.7, sinCara(x, y, z, 0.86, 0.848)) : -1, (x, y, z) => 0.016 + 0.003 * noise(x * 30, y * 30, z * 30), tela({ map: rep(tn, 3, 3) }), 3, ajustada(m, 0.013, 0.8));
      melena(m, tela({ map: crin('#dcd7cf'), alphaTest: 0.45, roughness: 0.8 }), { desde: 0.76, fin: 0.6, n: 9, a0: Math.PI * 0.7, a1: Math.PI * 1.3, lados: false });
      V.hold(escoba(u(1)), 'RightHand');
    },
  },
  // Tartalo: el gigante de un solo ojo, pastor que vive en las cuevas del monte: cabeza enorme de un ojo, zamarra de piel de
  // oveja, soga de cinturón y un garrote
  tartalo: {
    model: 'pastor', ropa: { shirt: '#6b4a2e', vest: '#8a6a4a', pants: '#4a3a2a' },
    vestir(V) {
      const { mesh: m, P, u } = V, w = contorno(m, 0.43), r = u(0.24);
      const lt = lana('#d2c4a4'), lan = tela({ map: rep(lt, 5, 3), bumpMap: rep(lt, 5, 3), bumpScale: 2, roughness: 1 });
      ceñida(m, (x, y, z, zn) => (zn === 0 || zn === 2) && y > 0.42 && y < 0.64 && Math.abs(x) < 0.19, (x, y, z) => 0.015 + 0.025 * noise(x * 50, y * 50, z * 50), lan, 3);
      campana(m, [[w * 1.15, 0.46], [w * 1.4, 0.33], [w * 1.55, 0.25]], lan, { pliegues: 8, hondo: 0.1, vuelo: 0.7 });
      campana(m, [[w * 1.53, 0.262], [w * 1.58, 0.21], [w * 1.56, 0.2]], tela({ map: rep(mechones('#d2c4a4'), 6, 1), alphaTest: 0.45, roughness: 1 }), { pliegues: 8, hondo: 0.1, vuelo: 0.75 });
      const sg = new THREE.TorusGeometry(u(w * 1.3), u(0.008), 6, 40); sg.rotateX(Math.PI / 2); sg.scale(1, 1, 0.84);
      const soga = new THREE.Mesh(sg, tela({ color: '#8a6a40' })); soga.position.copy(P(0, 0.44, 0.005)); V.put(soga, 'Hips');
      const c = cabezudo(r, { id: 'tartalo', piel: '#c9a27a', unOjo: true, ojosY: 0.3, iris: '#6a3a14', enfado: true, nariz: 0.2, pelo: '#3b2418', peloHasta: 0.47, peloGiro: -0.62, mejilla: 'rgba(150,60,40,.45)' });
      V.hideHead(); c.position.copy(P(0, 0.62 + 0.24 * 1.12 * 0.95, 0.005)); V.put(c, 'Neck');
      V.hold(rama(u(0.9), 1.6), 'RightHand');
    },
  },
  // Roldán, el caballero de Roncesvalles (en el juego, su sombra que vaga de noche): cota de malla, sobreveste con cenefa,
  // capa, yelmo de nasal y la espada
  roldan: {
    model: 'sanfermin', ropa: { shirt: '#aab6d8', pants: '#8a96b8', acc: '#aab6d8' },
    vestir(V) {
      const { mesh: m, P, u } = V, w = contorno(m, 0.43);
      const ma = metal({ map: rep(malla(), 10, 8), color: '#ffffff', metalness: 0.35, roughness: 0.5, side: THREE.DoubleSide });
      ceñida(m, (x, y, z, zn) => (zn === 0 || zn === 2 || zn === 3) && y > 0.12 && y < 0.655, () => 0.01, ma, 6);
      ceñida(m, (x, y, z, zn) => zn === 1 ? Math.min(y - 0.62, sinCara(x, y, z, 0.86, 0.845)) : -1, () => 0.014, ma, 6, ajustada(m, 0.012, 0.8));
      const sv = tela({ map: rep(cenefa('#d9dff0', '#c9a43a'), 4, 1) });
      ceñida(m, (x, y, z, zn) => zn === 0 && y > 0.44 && y < 0.64, () => 0.02, sv, 1);
      campana(m, [[w * 1.15, 0.45], [w * 1.32, 0.33], [w * 1.42, 0.24]], sv, { pliegues: 8, hondo: 0.04, vuelo: 0.75 });
      campana(m, [[0.09, 0.645], [0.2, 0.6], [0.23, 0.45], [0.24, 0.3]], tela({ map: rep(tejido('#3a4a7a'), 4, 4) }), { pliegues: 9, hondo: 0.05, hueso: 'Spine2', hueco: 2.3 });
      const y = yelmo(u); y.position.copy(P(0, 0.836, -0.022)); V.put(y, 'Head');
      V.hold(espada(u(0.62)), 'RightHand');
    },
  },
};
// el nacimiento del pelo: redondeado, más alto en medio de la frente y bajando por las sienes hasta las patillas
const frentePelo = (x, y, z) => sinCara(x, y, z, 1, 0.866);
// pelo de la cabeza: liso sobre el cráneo, de la frente para arriba y por detrás, sin tapar la cara
function gorroPelo(V, color, pegado = true) {
  ceñida(V.mesh, (x, y, z, zn) => zn === 1 ? Math.min(y - 0.7, frentePelo(x, y, z)) : -1, (x, y, z) => 0.012 + 0.004 * noise(x * 40, y * 40, z * 40), tela({ map: rep(peloTex(color), 4, 1), roughness: 0.5 }), 2, pegado ? ajustada(V.mesh, 0.01) : lisa(V.mesh));
}
// corpiño con el lazo cruzado por delante (u = 0,5)
const corpino = (base, lazo) => lienzo('corpino' + base + lazo, 256, 64, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(w * 0.47, 0, w * 0.06, h);
  g.strokeStyle = lazo; g.lineWidth = 2.5; g.beginPath(); g.moveTo(w * 0.47, 4); g.lineTo(w * 0.53, h / 2); g.lineTo(w * 0.47, h - 4); g.moveTo(w * 0.53, 4); g.lineTo(w * 0.47, h / 2); g.lineTo(w * 0.53, h - 4); g.stroke();
  g.fillStyle = lazo; for (const y of [4, h / 2, h - 4]) for (const x of [0.465, 0.535]) { g.beginPath(); g.arc(w * x, y, 2.4, 0, TAU); g.fill(); }
});
// cota de malla: anillas de hierro
const malla = () => lienzo('malla', 64, 64, (g, w, h) => {
  g.fillStyle = '#2a2e36'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const cx = x * 8 + (y % 2) * 4 + 4, cy = y * 8 + 4; g.strokeStyle = '#9aa4b4'; g.lineWidth = 1.6; g.beginPath(); g.arc(cx, cy, 3.4, 0, TAU); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 0.8; g.beginPath(); g.arc(cx - 0.6, cy - 0.6, 3, 3.6, 5.2); g.stroke(); }
});
// tela con cenefa abajo (la sobreveste)
const cenefa = (base, borde) => lienzo('cenefa' + base + borde, 64, 128, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h); g.fillStyle = borde; g.fillRect(0, h * 0.86, w, h * 0.1); g.fillStyle = css(borde, 0.7); g.fillRect(0, h * 0.84, w, 2);
});
// peine de oro de la lamia (el origen, en el mango)
function peine(l) {
  const g = new THREE.Group(), oro = metal({ color: '#e2b84a', roughness: 0.3 });
  const lomo = new THREE.Mesh(new THREE.BoxGeometry(l, l * 0.28, l * 0.06), oro); lomo.position.y = l * 0.2; g.add(lomo);
  const d = []; for (let i = 0; i < 11; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(l * 0.04, l * 0.4, l * 0.04), oro); t.position.set((i / 10 - 0.5) * l * 0.9, l * 0.2 + l * 0.32, 0); d.push(t); }
  g.add(junta(d)); return g;
}
// pie de pato: tres dedos unidos por la membrana, en el suelo y mirando hacia delante (+z)
function pato(l) {
  const sh = new THREE.Shape(); sh.moveTo(-l * 0.18, 0);
  for (const [x, z] of [[-l * 0.5, l * 0.85], [-l * 0.22, l * 0.72], [0, l], [l * 0.22, l * 0.72], [l * 0.5, l * 0.85], [l * 0.18, 0]]) sh.lineTo(x, z);
  const g = new THREE.ExtrudeGeometry(sh, { depth: l * 0.06, bevelEnabled: true, bevelSize: l * 0.03, bevelThickness: l * 0.02, bevelSegments: 2 }); g.rotateX(Math.PI / 2); g.translate(0, l * 0.07, -l * 0.25);
  return new THREE.Mesh(g, tela({ color: '#e89a2a', roughness: 0.55 }));
}
// bastón de rama con nudos (Basajaun) o garrote (k: lo que engorda arriba)
function rama(l, k = 1) {
  const R = rng(Math.round(l * 1000)), pts = []; for (let i = 0; i <= 6; i++) pts.push([(R() - 0.5) * l * 0.05, -l * 0.25 + i / 6 * l, (R() - 0.5) * l * 0.05]);
  const g = new THREE.Group(); g.add(new THREE.Mesh(tubo(curva(...pts), l * 0.022, l * 0.022 * k, 20, 7), tela({ color: '#5a3e24', roughness: 0.95 })));
  return g;
}
// escoba de brezo: palo y el haz de ramitas atado (el origen, en la mano; el haz, abajo)
function escoba(l) {
  const g = new THREE.Group(), pa = new THREE.Mesh(new THREE.CylinderGeometry(l * 0.014, l * 0.016, l, 7), tela({ color: '#7a5634' })); pa.position.y = l * 0.12; g.add(pa);
  const hz = new THREE.Mesh(new THREE.ConeGeometry(l * 0.1, l * 0.36, 12, 1, true), tela({ map: rep(crin('#6a5030', false), 2, 1), roughness: 1 })); hz.position.y = -l * 0.52; g.add(hz);
  const at = new THREE.Mesh(new THREE.CylinderGeometry(l * 0.03, l * 0.03, l * 0.03, 10), tela({ color: '#3a2a1a' })); at.position.y = -l * 0.36; g.add(at);
  return g;
}
// yelmo cónico de nasal (el origen, a la altura de las cejas)
function yelmo(u) {
  // yelmo normando, cónico, a la medida del cráneo con la cofia de malla (elíptico: más fondo que ancho), con el borde
  // justo encima de las cejas y el nasal hasta la punta de la nariz (en fracción de la altura; el origen, en el borde)
  const g = new THREE.Group(), hi = metal({ color: '#9aa4b8', roughness: 0.35 }), rx = 0.172, rz = 0.185;
  const lg = new THREE.LatheGeometry([[1.0, 0], [1.0, 0.02], [0.93, 0.05], [0.8, 0.1], [0.57, 0.14], [0.3, 0.172], [0.001, 0.2]].map(([r, y]) => new V2(u(r * rx), u(y))), 32);
  lg.scale(1, 1, rz / rx); lg.computeVertexNormals(); g.add(new THREE.Mesh(lg, hi));
  // (el refuerzo del borde y la cresta de delante atrás)
  const ba = new THREE.Mesh(new THREE.TorusGeometry(u(rx * 1.01), u(0.006), 6, 32), hi); ba.rotation.x = Math.PI / 2; ba.scale.set(1, rz / rx, 1); ba.position.y = u(0.008); g.add(ba);
  const na = new THREE.Mesh(new THREE.BoxGeometry(u(0.024), u(0.07), u(0.01)), hi); na.position.set(0, -u(0.025), u(rz + 0.004)); na.rotation.x = -0.12; g.add(na);
  return g;
}
// espada (Durandal) con la punta hacia abajo: la mano en el puño
function espada(l) {
  const g = new THREE.Group(), ac = metal({ color: '#c8d0dc', roughness: 0.25 }), oro = metal({ color: '#c9a43a', roughness: 0.35 });
  const hoja = new THREE.Mesh(new THREE.BoxGeometry(l * 0.06, l * 0.78, l * 0.012), ac); hoja.position.y = -l * 0.45; g.add(hoja);
  const cruz = new THREE.Mesh(new THREE.BoxGeometry(l * 0.24, l * 0.025, l * 0.03), oro); cruz.position.y = -l * 0.05; g.add(cruz);
  const pu = new THREE.Mesh(new THREE.CylinderGeometry(l * 0.018, l * 0.018, l * 0.12, 6), tela({ color: '#3a2414' })); pu.position.y = l * 0.02; g.add(pu);
  const po = new THREE.Mesh(new THREE.SphereGeometry(l * 0.03, 8, 6), oro); po.position.y = l * 0.09; g.add(po);
  return g;
}
// la tela de los palokis: de un color, con los pliegues sombreados y una cenefa de dos colores y florecillas abajo (la v
// de la campana empieza arriba: la cenefa va arriba en el lienzo)
const telaPaloki = (base, a, b) => lienzo('paloki' + base + a + b, 128, 256, (g, w, h, R) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(0,0,0,.18)'); gr.addColorStop(0.5, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(0,0,0,.18)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = a; g.fillRect(0, h * 0.04, w, h * 0.07); g.fillStyle = b; g.fillRect(0, h * 0.11, w, h * 0.02); g.fillRect(0, h * 0.02, w, h * 0.015);
  for (let i = 0; i < 4; i++) { const cx = (i + 0.5) * w / 4, cy = h * 0.17; g.fillStyle = a; for (let k = 0; k < 5; k++) { const t = k / 5 * TAU; g.beginPath(); g.arc(cx + Math.cos(t) * 4, cy + Math.sin(t) * 4, 3, 0, TAU); g.fill(); } g.fillStyle = b; g.beginPath(); g.arc(cx, cy, 2.2, 0, TAU); g.fill(); }
});
// pañuelo de colores: fondo con florecillas y su cenefa
const panuelo = (base, flor, borde) => lienzo('panuelo' + base + flor + borde, 128, 128, (g, w, h, R) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  g.strokeStyle = borde; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10); g.strokeStyle = flor; g.lineWidth = 1.5; g.strokeRect(10, 10, w - 20, h - 20);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const cx = 22 + x * 28 + (y % 2) * 10, cy = 22 + y * 28;
    g.fillStyle = y % 2 ? '#f6f0e0' : flor; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; g.beginPath(); g.arc(cx + Math.cos(a) * 3.6, cy + Math.sin(a) * 3.6, 2.6, 0, TAU); g.fill(); }
    g.fillStyle = borde; g.beginPath(); g.arc(cx, cy, 1.8, 0, TAU); g.fill();
  }
});
// ropa vieja con remiendos cosidos de otras telas
const remiendos = (base) => lienzo('remiendos' + base, 256, 256, (g, w, h, R) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(60,50,40,${0.04 + R() * 0.05})`; g.fillRect(0, y, w, 1); }
  const telas = ['#7a6a52', '#8a5a3a', '#5a5f6a', '#9a8a62', '#6a4a3a'];
  for (let i = 0; i < 7; i++) {
    const x = R() * w, y = R() * h, pw = 22 + R() * 34, ph = 18 + R() * 30, a = (R() - 0.5) * 0.4;
    tile(w, h, x, y, Math.max(pw, ph), (px, py) => {
      g.save(); g.translate(px, py); g.rotate(a); g.fillStyle = telas[i % telas.length]; g.fillRect(-pw / 2, -ph / 2, pw, ph);
      g.strokeStyle = 'rgba(230,220,190,.8)'; g.lineWidth = 1.2; g.setLineDash([3, 3]); g.strokeRect(-pw / 2 + 3, -ph / 2 + 3, pw - 6, ph - 6); g.restore();
    });
  }
});
// cesto de mimbre de los huevos, con su asa y tapado con un pañuelo (el origen, en lo alto del asa: cuelga de la mano)
function cesto(r, pa) {
  const g = new THREE.Group(), mi = tela({ map: rep(mimbre(), 2, 1) }), hb = r * 1.05;
  const cu = new THREE.Mesh(new THREE.LatheGeometry([new V2(r * 0.62, 0), new V2(r * 0.8, r * 0.08), new V2(r * 0.95, r * 0.4), new V2(r, r * 0.7), new V2(r * 1.04, r * 0.72)], 24), mi);
  cu.position.y = -hb - r * 0.72; g.add(cu);
  const fondo = new THREE.Mesh(new THREE.CircleGeometry(r * 0.62, 20), mi); fondo.rotation.x = Math.PI / 2; fondo.position.y = cu.position.y + 0.001; g.add(fondo);
  const asa = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, r * 0.06, 6, 20, Math.PI), tela({ color: '#8a6234' })); asa.position.y = -hb + 0.002; asa.scale.y = hb / (r * 0.98); g.add(asa);
  // el pañuelo por encima, un poco abombado y con las puntas caídas
  const pg = new THREE.PlaneGeometry(r * 2.3, r * 2.3, 10, 10), pp = pg.attributes.position;
  for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), d = Math.hypot(x, y) / r; pp.setZ(i, d < 1 ? r * 0.12 * (1 - d * d) : -r * 0.5 * (d - 1) * (d - 1) * 1.6); }
  pg.computeVertexNormals(); pg.rotateX(-Math.PI / 2); pg.rotateY(0.6);
  const pm = new THREE.Mesh(pg, tela({ map: pa })); pm.position.y = -hb - r * 0.02; g.add(pm);
  return g;
}
// gerren: asador de hierro largo, con su anilla para colgarlo
function gerren(l) {
  const g = new THREE.Group(), hi = metal({ color: '#3a3836', roughness: 0.55 });
  const v = new THREE.Mesh(new THREE.CylinderGeometry(l * 0.009, l * 0.009, l, 6), hi); v.position.y = l * 0.2; g.add(v);
  const pu = new THREE.Mesh(new THREE.ConeGeometry(l * 0.012, l * 0.06, 6), hi); pu.position.y = l * 0.73; g.add(pu);
  const an = new THREE.Mesh(new THREE.TorusGeometry(l * 0.035, l * 0.007, 6, 14), hi); an.position.y = -l * 0.33; g.add(an);
  return g;
}

// El personaje listo para coserle piezas: su malla, sus huesos y cómo colgar de ellos lo hecho en la pose de reposo
function contexto(char) {
  const root = char.root; let mesh = null; root.traverse(o => { if (!mesh && o.isSkinnedMesh && o.material?.map) mesh = o; });
  if (!mesh) return null;
  char.setSpeed?.(0); char.update?.(0.05); root.updateMatrixWorld(true); mesh.skeleton.update();
  const B = cuerpo(mesh), H = B.H, y0 = B.y0, bones = {}; mesh.skeleton.bones.forEach((b, i) => { bones[b.name.replace(/^mixamorig:?/, '')] = [b, i]; });
  const ticks = [], t0 = Math.random() * 10, M = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(), ps = new V3();
  // de la pose de reposo a la de ahora para lo que va con un hueso: lo mismo que hace la piel con sus vértices
  const toWorld = (bone) => { const [b, i] = bones[bone] || bones.Hips; return M.multiplyMatrices(b.matrixWorld, mesh.skeleton.boneInverses[i]).multiply(mesh.bindMatrix); };
  const hang = (obj, bone) => { const [b] = bones[bone] || bones.Hips; const w = new THREE.Group(); root.add(w); w.updateMatrixWorld(true); w.add(obj);
    w.matrix.copy(new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(M)); w.matrix.decompose(w.position, w.quaternion, w.scale); w.updateMatrixWorld(true); b.attach(w);
    obj.traverse(o => { if (o.isMesh) { o.castShadow = o.userData.sombra ?? true; o.userData.traje = true; } }); };
  const V = {
    mesh, H, u: (f) => f * H, P: (x, y, z) => new V3(x * H, y0 + y * H, z * H),
    // pieza hecha en el espacio del modelo en reposo: va con su hueso tal como está ahora
    put(obj, bone) { toWorld(bone); hang(obj, bone); },
    // herramienta en la mano, de pie (vertical ahora, con la mano donde esté; la pieza tiene su agarre en el origen)
    hold(obj, bone) {
      if (!bones[bone]) return; toWorld(bone); M.decompose(ps, q, sc); const [b] = bones[bone], hp = new V3().setFromMatrixPosition(b.matrixWorld);
      M.compose(hp, new THREE.Quaternion(), sc); hang(obj, bone);
    },
    tick(f) { ticks.push(f); },
    // los cabezudos: la cabeza del personaje se encoge dentro de la de cartón
    hideHead() { bones.Head?.[0].scale.setScalar(0.001); },
    update(dt, speed = 0) { V.t = (V.t ?? t0) + dt; for (const f of ticks) f(V.t, speed); },
  };
  return V;
}
/** Viste a un personaje de Meshy (ya a su tamaño, en su pose de reposo del juego) con un traje de TRAJES. Devuelve
 *  { update(dt, velocidad) } para lo que se mueve (cencerros) o null si no hay traje. char: su GlbChar. */
export function vestirTraje(char, id) {
  const T = TRAJES[id], V = T && contexto(char); if (!V) return null;
  T.vestir(V);
  return { update: V.update };
}

// ---------- rasgos y peinado de chica (los personajes de Meshy son todos chicos) ----------
// El borde de arriba de cada ojo, medido en la textura de cada modelo (tools/pelo/parpados.mjs): x, y, z en fracción
// de la altura, del lagrimal a la sien
const PARPADOS = {"osasuna":[[[-0.086,0.811,0.081],[-0.081,0.811,0.085],[-0.076,0.807,0.091],[-0.071,0.813,0.093],[-0.067,0.81,0.096],[-0.061,0.807,0.098],[-0.057,0.807,0.099],[-0.052,0.804,0.103],[-0.047,0.804,0.105],[-0.042,0.804,0.106],[-0.038,0.801,0.107],[-0.033,0.797,0.109],[-0.028,0.791,0.11]],[[0.042,0.799,0.106],[0.045,0.804,0.105],[0.049,0.81,0.107],[0.052,0.808,0.101],[0.056,0.813,0.098],[0.059,0.816,0.099],[0.063,0.815,0.096],[0.067,0.814,0.095],[0.07,0.813,0.093],[0.074,0.811,0.091],[0.077,0.807,0.088],[0.081,0.801,0.086],[0.084,0.799,0.082]]],"osasuna_fuera":[[[-0.093,0.768,0.076],[-0.087,0.775,0.085],[-0.082,0.781,0.088],[-0.077,0.787,0.092],[-0.071,0.792,0.096],[-0.066,0.795,0.1],[-0.06,0.797,0.1],[-0.055,0.799,0.106],[-0.049,0.798,0.108],[-0.044,0.798,0.11],[-0.039,0.795,0.113],[-0.033,0.793,0.115],[-0.028,0.789,0.119]],[[0.026,0.79,0.121],[0.032,0.792,0.116],[0.038,0.795,0.113],[0.043,0.798,0.11],[0.049,0.8,0.108],[0.055,0.799,0.105],[0.061,0.797,0.102],[0.066,0.795,0.1],[0.071,0.789,0.095],[0.077,0.782,0.09],[0.083,0.782,0.088],[0.089,0.77,0.083],[0.094,0.763,0.073]]],"sanfermin":[[[-0.084,0.806,0.087],[-0.079,0.806,0.093],[-0.074,0.804,0.1],[-0.069,0.805,0.1],[-0.065,0.805,0.108],[-0.06,0.805,0.106],[-0.055,0.803,0.11],[-0.051,0.809,0.109],[-0.046,0.804,0.113],[-0.042,0.804,0.113],[-0.037,0.809,0.115],[-0.032,0.809,0.116],[-0.027,0.81,0.117]],[[0.028,0.791,0.116],[0.033,0.798,0.115],[0.037,0.81,0.115],[0.042,0.804,0.113],[0.046,0.814,0.113],[0.051,0.815,0.111],[0.056,0.815,0.108],[0.061,0.814,0.106],[0.065,0.813,0.103],[0.07,0.803,0.1],[0.074,0.807,0.097],[0.079,0.799,0.092],[0.084,0.791,0.087]]],"pelotari":[[[-0.087,0.787,0.095],[-0.082,0.792,0.102],[-0.077,0.787,0.102],[-0.073,0.803,0.104],[-0.068,0.804,0.108],[-0.064,0.807,0.11],[-0.058,0.81,0.111],[-0.054,0.796,0.112],[-0.049,0.801,0.111],[-0.045,0.807,0.115],[-0.04,0.804,0.116],[-0.035,0.799,0.117],[-0.031,0.787,0.115]],[[0.028,0.792,0.117],[0.033,0.797,0.116],[0.038,0.801,0.117],[0.042,0.805,0.115],[0.047,0.807,0.114],[0.052,0.808,0.112],[0.057,0.808,0.111],[0.061,0.808,0.11],[0.067,0.807,0.109],[0.071,0.803,0.106],[0.076,0.801,0.105],[0.081,0.796,0.102],[0.086,0.79,0.093]]],"pelotari_rojo":[[[-0.083,0.817,0.087],[-0.078,0.814,0.091],[-0.073,0.811,0.097],[-0.068,0.807,0.097],[-0.064,0.809,0.1],[-0.059,0.808,0.101],[-0.055,0.808,0.111],[-0.05,0.804,0.109],[-0.045,0.815,0.106],[-0.041,0.813,0.107],[-0.036,0.81,0.11],[-0.031,0.815,0.113],[-0.026,0.817,0.117]],[[0.026,0.771,0.116],[0.031,0.784,0.112],[0.036,0.801,0.111],[0.041,0.805,0.113],[0.045,0.815,0.106],[0.05,0.815,0.103],[0.055,0.816,0.103],[0.059,0.817,0.11],[0.064,0.815,0.099],[0.068,0.813,0.097],[0.073,0.801,0.094],[0.078,0.794,0.092],[0.083,0.782,0.089]]],"pastor":[[[-0.061,0.791,0.118],[-0.058,0.795,0.118],[-0.056,0.794,0.119],[-0.054,0.809,0.115],[-0.052,0.809,0.116],[-0.049,0.809,0.116],[-0.047,0.809,0.118],[-0.045,0.804,0.117],[-0.042,0.804,0.117],[-0.04,0.807,0.12],[-0.038,0.798,0.119],[-0.035,0.8,0.12],[-0.033,0.791,0.12]],[[0.026,0.771,0.118],[0.03,0.782,0.119],[0.035,0.791,0.12],[0.039,0.791,0.12],[0.044,0.814,0.12],[0.049,0.814,0.118],[0.053,0.798,0.117],[0.058,0.814,-1000000000],[0.062,0.811,0.115],[0.067,0.801,0.108],[0.071,0.806,0.108],[0.076,0.801,0.104],[0.081,0.791,0.1]]]};
// El cráneo sin el pelo (en fracción de la altura): el pelo de chico, mucho y de punta, se aplasta contra él en el
// sombreador y encima va el pelo recogido, pegado a la cabeza
const CRANEO = { c: new V3(0, 0.8, -0.022), r: new V3(0.152, 0.183, 0.163) };
// lo que hay del eje del cuerpo al cráneo (más extra) a una altura y en una dirección (como radio)
function rCraneo(y, a, extra = 0) {
  const { c, r } = CRANEO, f = 1 - ((y - c.y) / (r.y + extra)) ** 2; if (f <= 0) return 0;
  const ax = (r.x + extra) * Math.sqrt(f), az = (r.z + extra) * Math.sqrt(f), sa = Math.sin(a), ca = Math.cos(a);
  const A = (sa / ax) ** 2 + (ca / az) ** 2, B = -2 * ca * c.z / az ** 2, C = (c.z / az) ** 2 - 1;
  return (-B + Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A);
}
// Aplasta el pelo de la malla del cuerpo contra el cráneo (en el sombreador, antes de la piel: sigue andando igual)
// (frente: hasta qué altura se respeta la cara; con capucha, solo los ojos, la nariz y la boca: el flequillo también se
// aplasta y no asoma entre la capucha y la careta)
function aplanarPelo(mesh, E = CRANEO, frente = 0.855) {
  const B = cuerpo(mesh), U = { uAplC: { value: E.c }, uAplR: { value: E.r }, uAplHY: { value: new V3(B.H, B.y0, frente) } };
  for (const m of [].concat(mesh.material)) {
    const prev = m.onBeforeCompile, key = m.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => {
      prev?.call(m, sh, r); Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform vec3 uAplC, uAplR, uAplHY;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
{ vec3 hp = vec3(transformed.x, transformed.y - uAplHY.y, transformed.z) / uAplHY.x;
  // (fuera la cara: delante, bajo la frente; y el cuello, que no se toca)
  float w = smoothstep(0.65, 0.71, hp.y) * (1. - smoothstep(0.0, 0.04, hp.z) * (1. - smoothstep(uAplHY.z - 0.015, uAplHY.z + 0.015, hp.y)) * (1. - smoothstep(0.11, 0.135, abs(hp.x))));
  // (y los ojos con sus párpados, siempre: con la frente baja de las capuchas, el rabillo se estiraba hacia la sien)
  w *= 1. - smoothstep(0.03, 0.05, hp.z) * (1. - smoothstep(0.1, 0.112, abs(hp.x))) * smoothstep(0.765, 0.775, hp.y) * (1. - smoothstep(0.822, 0.832, hp.y));
  vec3 d = (hp - uAplC) / uAplR; float s = length(d);
  if (s > 1. && w > 0.) { hp = mix(hp, uAplC + d / s * uAplR, w); transformed = vec3(hp.x, hp.y, hp.z) * uAplHY.x + vec3(0., uAplHY.y, 0.); } }`);
    };
    m.customProgramCacheKey = () => (key ? key.call(m) : '') + '+aplanar';
    m.needsUpdate = true;
  }
}
// pelo liso de verdad: mechones finos de varios tonos a lo largo (v), las raíces algo más oscuras y una franja de brillo
// de través, donde la luz se refleja en el pelo peinado
const peloTex = (base) => lienzo('pelo' + base, 256, 256, (g, w, h, R) => {
  g.fillStyle = css(base, 0.75); g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    const x = R() * w, k = 0.6 + R() * 0.75, cw = 0.6 + R() * 1.6, y0 = R() * h * 0.2;
    tile(w, h, x, h / 2, 6, (px) => { g.strokeStyle = css(base, k); g.globalAlpha = 0.5 + R() * 0.5; g.lineWidth = cw; g.beginPath(); g.moveTo(px, y0 - 2); g.bezierCurveTo(px + (R() - 0.5) * 6, h * 0.4, px + (R() - 0.5) * 6, h * 0.7, px + (R() - 0.5) * 4, h + 2); g.stroke(); });
  }
  g.globalAlpha = 1;
  const sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(255,240,220,0)'); sh.addColorStop(0.38, 'rgba(255,240,220,0)'); sh.addColorStop(0.5, 'rgba(255,240,220,.28)'); sh.addColorStop(0.62, 'rgba(255,240,220,0)'); sh.addColorStop(1, 'rgba(0,0,0,.18)');
  g.fillStyle = sh; g.fillRect(0, 0, w, h);
  // (y algún mechón suelto más claro, que coge la luz)
  for (let i = 0; i < 40; i++) { const x = R() * w; g.strokeStyle = css(base, 1.5); g.globalAlpha = 0.25; g.lineWidth = 1; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (R() - 0.5) * 8, h); g.stroke(); }
  g.globalAlpha = 1;
});
// pestañas: tiras de trazos finos que nacen del párpado y se curvan hacia arriba y hacia fuera, más largas hacia la sien
const pestanasTex = () => lienzo('pestanas', 256, 64, (g, w, h, R) => {
  for (let i = 0; i < 70; i++) {
    const t = i / 69, x = 4 + t * (w - 8), len = h * (0.55 + 0.45 * t) * (0.8 + R() * 0.25), lean = 10 + 22 * t;
    g.strokeStyle = `rgba(22,14,10,${0.85 + R() * 0.15})`; g.lineWidth = 2.2 - t * 0.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + lean * 0.2, h - len * 0.6, x + lean, h - len); g.stroke();
  }
  g.fillStyle = 'rgba(22,14,10,.95)'; g.fillRect(0, h - 5, w, 5);
});
function pestanas(V, model) {
  const ojos = PARPADOS[model] || PARPADOS.osasuna, Pz = [], Uv = [], I = []; let base = 0;
  const C = new V3(0, 0.79, -0.03), up = new V3(0, 1, 0);
  for (const ojo of ojos) {
    // (del lagrimal a la sien, con la altura suavizada: la medida va píxel a píxel)
    const pts = [...ojo].sort((a, b) => Math.abs(a[0]) - Math.abs(b[0])).map(p => new V3(...p)), n = pts.length;
    const sm = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; return new V3(p.x, (a.y + 2 * p.y + b.y) / 4, p.z); });
    sm.forEach((p, i) => {
      const t = i / (n - 1), nor = new V3().subVectors(p, C).normalize(), side = new V3(Math.sign(p.x), 0, 0);
      const dir = nor.clone().multiplyScalar(0.6).addScaledVector(up, 0.85).addScaledVector(side, 0.3 + 0.4 * t).normalize();
      const b = p.clone().addScaledVector(nor, 0.0012).addScaledVector(up, -0.0015), tip = b.clone().addScaledVector(dir, 0.006 + 0.012 * Math.pow(t, 1.2));
      for (const q of [b, tip]) Pz.push(q.x * V.H, V.P(0, q.y, 0).y, q.z * V.H);
      Uv.push(t, 0, t, 1);
      if (i) I.push(base + i * 2 - 2, base + i * 2 - 1, base + i * 2, base + i * 2 - 1, base + i * 2 + 1, base + i * 2);
    });
    base += n * 2;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(Pz, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(Uv, 2)); g.setIndex(I); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: pestanasTex(), alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.6, color: '#ffffff' }));
  m.userData.sombra = false; V.put(m, 'Head');
}
// tubo de grosor variable (radio r(t) a lo largo de la curva) con la textura a lo largo: la coleta
function tuboPerfil(curve, r, seg = 20, rad = 10) {
  const g = new THREE.TubeGeometry(curve, seg, 1, rad, false), p = g.attributes.position, uv = g.attributes.uv, pts = curve.getSpacedPoints(seg);
  for (let i = 0; i <= seg; i++) for (let j = 0; j <= rad; j++) {
    const k = i * (rad + 1) + j, c = pts[i], f = r(i / seg);
    p.setXYZ(k, c.x + (p.getX(k) - c.x) * f, c.y + (p.getY(k) - c.y) * f, c.z + (p.getZ(k) - c.z) * f);
    uv.setXY(k, j / rad, 1 - i / seg);   // (los mechones, a lo largo)
  }
  g.computeVertexNormals(); return g;
}
/** Rasgos de chica para un personaje de Meshy: el pelo recogido en una coleta (de su color: pelo, como se ve en el
 *  juego) y pestañas sobre los párpados. lazo: el color de la goma. Devuelve { update(dt, velocidad) } (la coleta se
 *  mueve al correr). */
export function chica(char, model, { pelo = '#3a2418', lazo = '#16161a', albedo = (c) => c } = {}) {
  const V = contexto(char); if (!V) return null;
  const { mesh: m, P, u } = V, E = CRANEO, col = albedo(pelo);
  aplanarPelo(m, E);
  // el pelo recogido: liso sobre el cráneo, de la frente y las sienes hacia atrás; los mechones van hacia la coleta
  const T = new V3(0, 0.875, -0.17), A = new V3(0, 0.76, 0.2).sub(T).normalize(), Yp = new V3(0, 1, 0).addScaledVector(A, -A.y).normalize(), X = new V3().crossVectors(Yp, A);
  const uvPelo = (x, y, z) => { const d = new V3(x, y, z).sub(T); return [Math.atan2(d.dot(X), d.dot(Yp)) / TAU + 0.5, d.length() / 0.3]; };
  const Ec = { c: E.c, r: E.r.clone().addScalar(0.006) };
  // (entero sobre el elipsoide: un mechón de chico a medio llevar asomaba como una astilla al correr; solo junto a la
  // frente sigue un poco a la cara, para que no quede un borde de casco)
  const sobre = (pp, nn) => {
    const d = new V3().subVectors(pp, Ec.c).divide(Ec.r), s = d.length(); if (s < 1e-4) return;
    const e = d.clone().divideScalar(s).multiply(Ec.r).add(Ec.c), en = d.clone().divide(Ec.r).normalize();
    const fr = pp.z > 0.02 ? (1 - sstep(pp.y, 0.86, 0.9)) * (1 - sstep(Math.abs(pp.x), 0.1, 0.14)) * 0.5 : 0;
    pp.lerp(e, 1 - fr); nn.lerp(en, 1 - fr);
    return fr;
  };
  ceñida(m, (x, y, z, zn) => zn === 1 ? Math.min(y - 0.7, frentePelo(x, y, z)) : -1, (x, y, z) => 0.004 + 0.002 * noise(x * 60, y * 60, z * 60),
    tela({ map: rep(peloTex(col), 9, 1), roughness: 0.45 }), uvPelo, sobre);
  // la coleta: de la goma, un poco hacia atrás y luego cayendo; gruesa en medio y fina en la punta
  const cur = curva([0, 0, 0], [0, -u(0.02), -u(0.045)], [0, -u(0.085), -u(0.07)], [0, -u(0.16), -u(0.06)], [0, -u(0.215), -u(0.04)]);
  const perfil = (t) => u(t < 0.15 ? lerp(0.021, 0.03, t / 0.15) : t < 0.45 ? lerp(0.03, 0.033, (t - 0.15) / 0.3) : lerp(0.033, 0.004, Math.pow((t - 0.45) / 0.55, 1.3)));
  const cola = new THREE.Mesh(tuboPerfil(cur, perfil), tela({ map: rep(peloTex(col), 3, 1), roughness: 0.45 }));
  const tg = cur.getTangentAt(0), goma = new THREE.Mesh(new THREE.TorusGeometry(u(0.022), u(0.0065), 6, 18), tela({ color: lazo, roughness: 0.5 }));
  goma.quaternion.setFromUnitVectors(new V3(0, 0, 1), tg); goma.position.copy(tg).multiplyScalar(u(0.004));
  const piv = new THREE.Group(); piv.add(cola, goma);
  const pT = E.c.clone().add(new V3().subVectors(T, E.c).divide(E.r).normalize().multiply(Ec.r));   // (la goma, sobre el pelo)
  piv.position.copy(P(pT.x, pT.y, pT.z)); V.put(piv, 'Head');
  // al correr se levanta hacia atrás y bota con cada zancada; parada, apenas se mece
  V.tick((t, v) => { const k = Math.min(1, v / 5); cola.rotation.x = -0.35 * k + Math.sin(t * 9) * 0.12 * k + Math.sin(t * 1.3) * 0.03; cola.rotation.z = Math.sin(t * 4.5) * 0.16 * k + Math.sin(t * 0.9) * 0.025; });
  pestanas(V, model);
  return { update: V.update };
}
