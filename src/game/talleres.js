// Talleres de los oficios: la zona de trabajo de cada oficio en el pueblo, con sus puestos (la fragua, el fuelle, el
// yunque, la pila…), para explicar el oficio paso a paso delante de lo que se usaba, con la cámara en cada puesto.
// El autor, 21 de noviembre de 2026: «Vete ampliando las zonas de elaboración de los oficios y explicándolos paso a paso,
// que sea más visual». Antes, cada oficio tenía un banco diminuto (items.js, makeWorkbench) y todo se contaba en fichas.
//
// Cada taller se monta en coordenadas propias: x a lo ancho, z hacia el frente (lo abierto, por donde se entra y desde
// donde mira la cámara), y la altura sobre el suelo de cada punto, que el suelo del pueblo no es llano. Lo que no se mueve
// se junta en una malla por material (pocas llamadas de dibujo, como la feria); lo que se mueve (las brasas, el fuelle, la
// herradura que se pone al rojo) va suelto. Cada puesto dice dónde mira la cámara, desde dónde, y dónde se pone el maestro.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { groundHeight, waterLevelAt } from '../world/heightfield.js';
import { pathQuery, plazaMask } from '../world/layout.js';
import { alcanzable } from '../world/acceso.js';
import { addBox, addCircle, rectFree } from '../world/colliders.js';
import { clearTrees, clearBushes, clearGrass } from '../world/nature.js';

const MATS = new Map();
const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!MATS.has(k)) MATS.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o })); return MATS.get(k); };
const rnd0 = (s) => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;

// ---------- texturas pintadas una vez (losas del suelo y piedra del muro) ----------
let TEX = null;
function texturas() {
  if (TEX) return TEX;
  const pinta = (S, fondo, filas, tono, semilla) => {
    const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), r = rnd0(semilla);
    g.fillStyle = fondo; g.fillRect(0, 0, S, S);
    const hs = Array.from({ length: filas }, () => 0.75 + r() * 0.5), sum = hs.reduce((a, b) => a + b, 0);
    let y = 0;
    for (const h0 of hs) {
      const h = h0 / sum * S; let x = -r() * S * 0.2;
      while (x < S) {
        const w = S * (0.16 + r() * 0.2), t = tono[0] + r() * tono[1];
        for (const dx of [0, -S, S]) {   // (repetida a los lados: la textura se puede poner en mosaico sin costura)
          g.fillStyle = `rgb(${t + 14 | 0},${t + 6 | 0},${t - 8 | 0})`; g.beginPath(); g.roundRect(x + dx + 2, y + 2, w - 4, h - 4, 5); g.fill();
          g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x + dx + 4, y + 3, w - 9, 2);   // (el canto de arriba, más claro)
          g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(x + dx + 4, y + h - 6, w - 9, 2);
          for (let k = 0; k < 9; k++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.06)'; g.fillRect(x + dx + 4 + r() * (w - 10), y + 4 + r() * (h - 10), 2 + r() * 4, 1 + r() * 3); }
        }
        x += w;
      }
      y += h;
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  };
  const losas = pinta(256, '#4e463d', 4, [104, 38], 11), muro = pinta(256, '#5a5248', 6, [112, 46], 23);
  TEX = { losas, muro, mLosas: new THREE.MeshStandardMaterial({ map: losas, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    mMuro: (rx, ry) => { const k = 'muro' + rx + 'x' + ry; if (!MATS.has(k)) { const t = muro.clone(); t.repeat.set(rx, ry); t.needsUpdate = true; MATS.set(k, new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 })); } return MATS.get(k); } };
  return TEX;
}

// ---------- la obra: piezas en las coordenadas del taller ----------
class Obra {
  constructor(cx, cz, ry) {
    this.cx = cx; this.cz = cz; this.ry = ry; this.c = Math.cos(ry); this.s = Math.sin(ry); this.g0 = groundHeight(cx, cz);
    this.group = new THREE.Group(); this.group.position.set(cx, this.g0, cz); this.group.rotation.y = ry; this.group.name = 'taller';
    this.cubos = new Map(); this.cols = [];
  }
  w(x, z) { return [this.cx + x * this.c + z * this.s, this.cz - x * this.s + z * this.c]; }
  gy(x, z) { const [a, b] = this.w(x, z); return groundHeight(a, b) - this.g0; }
  // lo más bajo del suelo bajo unos puntos (para que un muro o un poste no queden colgando en una cuesta)
  bajo(pts) { return Math.min(...pts.map(([x, z]) => this.gy(x, z))); }
  // una pieza fija: geo en su sitio, a «y» sobre el suelo de (x, z) o, con abs, a «y» sobre el suelo del centro del taller
  put(geo, m, x, y, z, o = {}) {
    if (o.sx || o.sy || o.sz) geo.scale(o.sx || 1, o.sy || 1, o.sz || 1);
    if (o.rz) geo.rotateZ(o.rz); if (o.rx) geo.rotateX(o.rx); if (o.ry) geo.rotateY(o.ry);
    geo.translate(x, y + (o.abs ? 0 : this.gy(x, z)), z);
    const M = typeof m === 'string' ? mat(m, o.m) : m;
    if (!this.cubos.has(M)) this.cubos.set(M, []);
    this.cubos.get(M).push(geo);
    return geo;
  }
  box(w, h, d, m, x, y, z, o) { return this.put(new THREE.BoxGeometry(w, h, d), m, x, y, z, o); }
  cyl(rt, rb, h, seg, m, x, y, z, o) { return this.put(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, o); }
  // una pieza que se mueve: va suelta, en un grupo propio a «y» sobre el suelo de (x, z)
  suelta(obj, x, y, z, o = {}) { obj.position.set(x, y + (o.abs ? 0 : this.gy(x, z)), z); obj.castShadow = true; this.group.add(obj); return obj; }
  col(x, z, r) { const [a, b] = this.w(x, z); this.cols.push(addCircle(a, b, r)); }
  colBox(x, z, w, d) { const [a, b] = this.w(x, z); this.cols.push(addBox(a, b, w, d, this.ry)); }
  // el suelo de losas, pegado al terreno punto a punto (se pisa el terreno de siempre: no hay escalón)
  suelo(W, D, x0 = 0, z0 = 0) {
    const nx = Math.ceil(W / 0.6), nz = Math.ceil(D / 0.6), g = new THREE.PlaneGeometry(W, D, nx, nz); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + x0, z = p.getZ(i) + z0; p.setXYZ(i, x, this.gy(x, z) + 0.035, z); uv.setXY(i, x / 2.2, z / 2.2); }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, texturas().mLosas); m.receiveShadow = true; this.group.add(m); return m;
  }
  cierra() {
    for (const [M, geos] of this.cubos) {
      // (todas con índice o todas sin él: las de lágrima y las piedras de carbón no lo traen, las cajas sí)
      const mixtas = geos.some(x => x.index) && geos.some(x => !x.index);
      const g = mergeGeometries(mixtas ? geos.map(x => x.index ? x.toNonIndexed() : x) : geos, false); geos.forEach(x => x.dispose());
      if (!g) continue;
      const m = new THREE.Mesh(g, M); m.castShadow = true; m.receiveShadow = true; this.group.add(m);
    }
    this.cubos.clear();
  }
}

// ---------- colores ----------
const MADERA = '#6e4b30', MADERA2 = '#8a6040', VIGA = '#5a3b26', HIERRO = '#2f3236', TEJA = '#9c4f36', TEJA2 = '#b05c3e', CAL = '#d9cfbd', CARBON = '#1d1b1a';
const HIERRO_O = { metalness: 0.6, roughness: 0.45 };

// La herrería de Lesaka: muro de piedra al fondo con la fragua y su campana, el fuelle de cuero, el yunque sobre su
// tronco, la pila de piedra para templar, la pared de herramientas, el banco con su tornillo, el montón de carbón, las
// barras de hierro y la piedra de afilar. Tejado de teja sobre dos postes y el muro: abierto por delante y por los lados.
function herreria(O, T) {
  O.suelo(7.6, 6.2, 0, -0.05);
  // muro del fondo y tejado
  const zm = -2.95, yb = O.bajo([[-3.8, zm], [0, zm], [3.8, zm]]) - 0.25;
  O.box(7.8, 3.6 - yb, 0.5, texturas().mMuro(4, 2), 0, (3.6 + yb) / 2, zm, { abs: true });
  O.box(8.0, 0.12, 0.62, '#7d7468', 0, 3.62, zm, { abs: true });
  const zf = 3.05, yf = 2.72, yt = 3.62, L = Math.hypot(zf - zm, yt - yf), a = Math.atan2(yt - yf, zf - zm), zc = (zf + zm) / 2, yc = (yt + yf) / 2;
  O.box(8.1, 0.1, L + 0.5, VIGA, 0, yc + 0.02, zc + 0.12, { abs: true, rx: a });
  for (let k = 0; k < 9; k++) { const t = (k + 0.5) / 9 - 0.5, zz = zc + 0.12 + t * (L + 0.4) * Math.cos(a), yy = yc + 0.1 - t * (L + 0.4) * Math.sin(a); O.box(8.15, 0.07, (L + 0.4) / 9 * 0.92, k % 2 ? TEJA : TEJA2, 0, yy, zz, { abs: true, rx: a }); }
  for (const x of [-3.7, -2.2, -0.75, 0.75, 2.2, 3.7]) O.box(0.12, 0.16, L + 0.3, VIGA, x, yc - 0.1, zc + 0.05, { abs: true, rx: a });   // (los cabrios, vistos desde abajo)
  O.box(7.7, 0.22, 0.22, VIGA, 0, yf - 0.12, zf - 0.1, { abs: true });   // (la viga de delante)
  for (const x of [-3.62, 3.62]) { const g = O.gy(x, zf - 0.1); O.box(0.22, yf - 0.2 - g + 0.1, 0.22, VIGA, x, (yf - 0.2 + g - 0.1) / 2, zf - 0.1, { abs: true }); O.box(0.34, 0.12, 0.34, '#8d8478', x, 0.06, zf - 0.1); O.col(x, zf - 0.1, 0.2); }
  O.colBox(0, zm, 7.8, 0.5);

  // la fragua: el hogar de piedra, la cama de carbón con las brasas, la campana y la chimenea que sale por el tejado
  const FX = -1.45, FZ = -2.05;
  O.box(1.6, 0.82, 1.3, texturas().mMuro(1.4, 0.8), FX, 0.41, FZ);
  O.box(1.7, 0.08, 1.4, '#7d7468', FX, 0.84, FZ);
  O.box(1.1, 0.05, 0.8, '#2a2524', FX, 0.89, FZ);
  for (const [dx, dz, w, d] of [[0, 0.42, 1.2, 0.08], [0, -0.42, 1.2, 0.08], [0.6, 0, 0.08, 0.92], [-0.6, 0, 0.08, 0.92]]) O.box(w, 0.1, d, '#6d655b', FX + dx, 0.93, FZ + dz);
  O.put(new THREE.CylinderGeometry(0.34, 0.98, 1.0, 4, 1), '#9d9283', FX, 2.3, FZ - 0.05, { ry: Math.PI / 4, abs: true });
  O.put(new THREE.CylinderGeometry(0.99, 0.99, 0.08, 4, 1), '#3a3330', FX, 1.79, FZ - 0.05, { ry: Math.PI / 4, abs: true });   // (el borde de la campana, negro de hollín)
  O.box(0.62, 2.2, 0.62, '#9d9283', FX, 3.85, FZ - 0.28, { abs: true });
  O.box(0.8, 0.1, 0.8, '#7d7468', FX, 4.98, FZ - 0.28, { abs: true });
  O.box(0.58, 0.04, 0.12, '#3a3533', FX, 1.82, FZ + 0.45, { abs: true });   // (el canto de la campana)
  O.colBox(FX, FZ, 1.7, 1.4);
  const brasas = new THREE.MeshStandardMaterial({ color: '#3a1a10', emissive: new THREE.Color('#ff5a1a'), emissiveIntensity: 1, roughness: 0.9 });
  // (las brasas: unas al rojo, que laten, y otras negras de carbón entre ellas; antes, una masa naranja lisa)
  const r = rnd0(5);
  { const rojas = [];   // (las rojas, en una sola malla con su material que late; las negras, con el resto de lo fijo)
    for (let k = 0; k < 22; k++) { const g = new THREE.DodecahedronGeometry(0.055 + r() * 0.05, 0); g.rotateX(r() * 3); g.rotateY(r() * 3); const x = FX + (r() - 0.5) * 0.95, z = FZ + (r() - 0.5) * 0.65, y = 0.92 + r() * 0.04;
      if (k % 3 === 2) O.put(g, mat(CARBON, { roughness: 1 }), x, y, z); else { g.translate(x, y + O.gy(x, z), z); rojas.push(g); } }
    const m = new THREE.Mesh(mergeGeometries(rojas), brasas); rojas.forEach(g => g.dispose()); O.group.add(m); }
  // la barra de hierro metida en el fuego, con la punta al rojo
  O.box(0.03, 0.03, 0.9, HIERRO, FX + 0.25, 0.97, FZ + 0.5, { m: HIERRO_O, rx: -0.08 });
  const punta = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.18), brasas); O.suelta(punta, FX + 0.25, 0.95, FZ + 0.02);

  // el fuelle: dos tablas en forma de lágrima con el cuero en medio y la boca de hierro metida en el costado del hogar; la
  // tabla de arriba sube y baja con su palo (se tira de él desde el extremo ancho)
  const BX = FX - 0.82, BY = 0.86, BZ = FZ;
  const lagrima = (L, W) => { const sh = new THREE.Shape(); sh.moveTo(0, -W * 0.16); sh.lineTo(-L * 0.55, -W / 2); sh.absarc(-L + W / 2, 0, W / 2, -Math.PI / 2, Math.PI / 2, true); sh.lineTo(-L * 0.55, W / 2); sh.lineTo(0, W * 0.16); sh.closePath(); return sh; };
  const tabla = (L, W, h) => { const g = new THREE.ExtrudeGeometry(lagrima(L, W), { depth: h, bevelEnabled: false, curveSegments: 10 }); g.rotateX(Math.PI / 2); g.translate(0, h, 0); return g; };   // (plana: el grueso hacia arriba)
  O.put(tabla(1.25, 0.74, 0.05), MADERA2, BX, BY - 0.05, BZ);   // (la tabla de abajo)
  for (const dx of [-1.0, -0.3]) for (const dz of [-0.24, 0.24]) O.box(0.07, BY - 0.05, 0.07, MADERA, BX + dx, (BY - 0.05) / 2, BZ + dz);
  O.box(0.8, 0.06, 0.06, MADERA, BX - 0.65, 0.3, BZ - 0.24); O.box(0.8, 0.06, 0.06, MADERA, BX - 0.65, 0.3, BZ + 0.24);
  O.put(new THREE.ConeGeometry(0.06, 0.26, 8), HIERRO, BX + 0.08, BY + 0.05, BZ, { rz: -Math.PI / 2, m: HIERRO_O });
  const fuelle = new THREE.Group(); O.suelta(fuelle, BX, BY + 0.02, BZ);
  const tapa = new THREE.Mesh(tabla(1.25, 0.74, 0.05), mat(MADERA2)); tapa.castShadow = true; fuelle.add(tapa);
  const asa = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), mat(MADERA)); asa.position.set(-1.12, 0.5, 0); fuelle.add(asa);
  const asa2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 8), mat(MADERA)); asa2.rotation.x = Math.PI / 2; asa2.position.set(-1.12, 0.95, 0); fuelle.add(asa2);
  for (const dz of [-0.2, 0.2]) { const cl = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.012, 0.03), mat(HIERRO, HIERRO_O)); cl.position.set(-0.55, 0.056, dz); fuelle.add(cl); }   // (los herrajes de la tapa)
  const cueroG = new THREE.ExtrudeGeometry(lagrima(1.18, 0.68), { depth: 1, bevelEnabled: false, curveSegments: 10 }); cueroG.rotateX(-Math.PI / 2);
  const cuero = new THREE.Mesh(cueroG, mat('#4a2e1e', { roughness: 0.7 })); cuero.position.set(BX - 0.03, BY - 0.01 + O.gy(BX, BZ), BZ); cuero.castShadow = true; O.group.add(cuero);
  const cueroY = Float32Array.from(cueroG.attributes.position.array);
  O.colBox(BX - 0.55, BZ, 1.3, 0.8);

  // el yunque sobre su tronco, con la herradura (que se pone al rojo), el martillo y las tenazas apoyadas
  const YX = 0.25, YZ = 0.3;
  O.cyl(0.36, 0.42, 0.5, 12, '#7a5536', YX, 0.25, YZ); O.cyl(0.355, 0.355, 0.012, 12, '#c49a6a', YX, 0.506, YZ);
  O.box(0.4, 0.12, 0.3, HIERRO, YX, 0.57, YZ, { m: HIERRO_O }); O.box(0.22, 0.16, 0.18, HIERRO, YX, 0.71, YZ, { m: HIERRO_O });
  O.box(0.62, 0.11, 0.21, HIERRO, YX, 0.84, YZ, { m: HIERRO_O }); O.box(0.12, 0.08, 0.15, HIERRO, YX - 0.36, 0.85, YZ, { m: HIERRO_O });
  O.put(new THREE.ConeGeometry(0.1, 0.38, 10), HIERRO, YX + 0.5, 0.85, YZ, { rz: -Math.PI / 2, m: HIERRO_O, sx: 0.8 });
  const caliente = new THREE.MeshStandardMaterial({ color: '#3b3d41', metalness: 0.5, roughness: 0.5, emissive: new THREE.Color('#ff6a1a'), emissiveIntensity: 0 });
  const herradura = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.017, 6, 16, Math.PI * 1.45), caliente); herradura.rotation.x = -Math.PI / 2; herradura.rotation.z = Math.PI * 0.27;
  O.suelta(herradura, YX + 0.06, 0.912, YZ);
  O.box(0.13, 0.06, 0.06, HIERRO, YX - 0.15, 0.925, YZ - 0.04, { m: HIERRO_O }); O.cyl(0.016, 0.018, 0.36, 6, MADERA2, YX - 0.15, 0.925, YZ + 0.16, { rx: Math.PI / 2, abs: false });
  for (const s of [-1, 1]) O.box(0.022, 0.62, 0.022, HIERRO, YX - 0.3 + s * 0.03, 0.31, YZ + 0.4, { rz: 0.18 + s * 0.06, rx: -0.12, m: HIERRO_O });
  O.col(YX, YZ, 0.45);

  // la pila de piedra con agua para templar, y un cubo
  const PX = 2.35, PZ = 1.05;
  O.box(1.3, 0.1, 0.62, '#857c70', PX, 0.05, PZ);
  for (const s of [-1, 1]) { O.box(1.3, 0.6, 0.09, texturas().mMuro(1.2, 0.5), PX, 0.3, PZ + s * 0.265); O.box(0.09, 0.6, 0.45, texturas().mMuro(0.4, 0.5), PX + s * 0.605, 0.3, PZ); }
  O.box(1.12, 0.02, 0.44, mat('#2f5d6c', { roughness: 0.12, metalness: 0.15 }), PX, 0.5, PZ);
  O.cyl(0.17, 0.14, 0.3, 12, MADERA2, PX + 0.95, 0.15, PZ + 0.45); for (const y of [0.06, 0.24]) O.put(new THREE.TorusGeometry(0.16 - y * 0.08, 0.012, 4, 14), HIERRO, PX + 0.95, y, PZ + 0.45, { rx: Math.PI / 2 });
  O.colBox(PX, PZ, 1.35, 0.68); O.col(PX + 0.95, PZ + 0.45, 0.2);

  // la pared de herramientas: tenazas, martillos y herraduras colgados de sus clavos
  const HX = 1.55, HZ = zm + 0.29, HY = 1.55;
  O.box(2.3, 1.05, 0.05, '#a87b52', HX, HY, HZ, { abs: true }); O.box(2.42, 0.08, 0.07, MADERA, HX, HY + 0.56, HZ + 0.01, { abs: true }); O.box(2.42, 0.08, 0.07, MADERA, HX, HY - 0.56, HZ + 0.01, { abs: true });
  for (let k = 0; k < 3; k++) for (const s of [-1, 1]) O.box(0.024, 0.52, 0.02, HIERRO, HX - 0.82 + k * 0.17 + s * 0.022, HY - 0.06, HZ + 0.04, { abs: true, rz: s * 0.09, m: HIERRO_O });
  for (let k = 0; k < 3; k++) { O.box(0.03, 0.36, 0.03, MADERA2, HX - 0.2 + k * 0.2, HY - 0.08, HZ + 0.05, { abs: true }); O.box(0.14 - k * 0.02, 0.055, 0.055, HIERRO, HX - 0.2 + k * 0.2, HY + 0.12, HZ + 0.06, { abs: true, m: HIERRO_O }); }
  for (let k = 0; k < 4; k++) O.put(new THREE.TorusGeometry(0.075, 0.016, 6, 14, Math.PI * 1.45), HIERRO, HX + 0.5 + (k % 2) * 0.24, HY + (k < 2 ? 0.22 : -0.17), HZ + 0.04, { abs: true, rz: Math.PI * 0.77, m: HIERRO_O });
  for (let k = 0; k < 8; k++) O.cyl(0.008, 0.008, 0.05, 4, '#1a1a1a', HX - 0.9 + k * 0.26, HY + 0.33, HZ + 0.04, { abs: true, rx: Math.PI / 2 });

  // el banco con el tornillo, a la derecha
  const KX = 3.05, KZ = -1.35;
  O.box(0.7, 0.07, 1.5, MADERA2, KX, 0.86, KZ); for (const dx of [-0.28, 0.28]) for (const dz of [-0.65, 0.65]) O.box(0.08, 0.82, 0.08, MADERA, KX + dx, 0.41, KZ + dz);
  O.box(0.55, 0.05, 1.3, MADERA, KX, 0.25, KZ);
  O.box(0.2, 0.14, 0.12, HIERRO, KX - 0.25, 0.97, KZ + 0.5, { m: HIERRO_O }); O.box(0.04, 0.16, 0.14, HIERRO, KX - 0.37, 0.98, KZ + 0.5, { m: HIERRO_O }); O.cyl(0.012, 0.012, 0.3, 5, HIERRO, KX - 0.45, 0.96, KZ + 0.5, { rz: Math.PI / 2, m: HIERRO_O });
  for (let k = 0; k < 3; k++) O.put(new THREE.TorusGeometry(0.07, 0.016, 6, 14, Math.PI * 1.45), HIERRO, KX + 0.1 - k * 0.04, 0.91, KZ - 0.35 + k * 0.2, { rx: -Math.PI / 2, m: HIERRO_O });
  O.colBox(KX, KZ, 0.75, 1.55);

  // el carbón: el montón junto a la fragua y su cajón
  O.put(new THREE.ConeGeometry(0.55, 0.42, 9), mat(CARBON, { roughness: 1 }), 0.0, 0.2, -2.3);
  O.box(0.55, 0.36, 0.42, MADERA, 0.98, 0.18, -2.4); O.box(0.5, 0.05, 0.37, CARBON, 0.98, 0.34, -2.4);
  O.col(0.3, -2.35, 0.7);
  // las barras de hierro apoyadas en el muro
  for (let k = 0; k < 6; k++) O.cyl(0.016, 0.016, 1.9, 5, '#4a4d52', 2.95 + k * 0.08, 0.95, zm + 0.42, { rx: -0.13, m: HIERRO_O });
  // la piedra de afilar en su caballete, delante a la izquierda
  const AX = -2.85, AZ = 1.55;
  O.cyl(0.33, 0.33, 0.11, 18, '#a39a8a', AX, 0.68, AZ, { rz: Math.PI / 2 });
  for (const s of [-1, 1]) O.box(0.06, 0.66, 0.5, MADERA, AX + s * 0.12, 0.33, AZ); O.box(0.5, 0.2, 0.3, MADERA2, AX, 0.18, AZ);
  O.cyl(0.015, 0.015, 0.5, 5, HIERRO, AX, 0.68, AZ, { rz: Math.PI / 2, m: HIERRO_O }); O.cyl(0.02, 0.02, 0.16, 5, MADERA2, AX - 0.25, 0.6, AZ, {});
  O.col(AX, AZ, 0.4);

  // lo que se mueve: las brasas que laten (más con el fuelle), el fuelle que sopla, la herradura al rojo
  let soplo = 0, calor = 0.75, fase = 0;
  T.anima = (dt, t) => {
    const sopla = T.activo === 'fuelle' || T.activo === 'fragua' || T.fuerza > 0;
    soplo += ((sopla ? 1 : 0) - soplo) * Math.min(1, dt * 3);
    fase += dt * (1.3 + soplo * 0.6);
    const ab = soplo * (0.5 + 0.5 * Math.sin(fase * 3.2));   // (lo que abre el fuelle: 0 cerrado, 1 abierto)
    const ang = 0.05 + ab * 0.22; fuelle.rotation.z = -ang;
    const p = cueroG.attributes.position; for (let i = 0; i < p.count; i++) if (cueroY[i * 3 + 1] > 0.5) p.setY(i, 0.05 + (-cueroY[i * 3]) * Math.tan(ang)); p.needsUpdate = true;
    calor += ((0.75 + soplo * (1 - ab) * 0.9) - calor) * Math.min(1, dt * 4);
    brasas.emissiveIntensity = calor * (0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3));
    // (con el fuelle, alguna chispa que sube de las brasas)
    if (soplo > 0.3 && (T.chispaT = (T.chispaT || 0) - dt) <= 0) { T.chispaT = 0.18 + Math.random() * 0.25; T.fx?.chispa?.(FX + (Math.random() - 0.5) * 0.7, 1.0, FZ + (Math.random() - 0.5) * 0.4); }
    caliente.emissiveIntensity += ((T.herradura || 0) * 1.6 - caliente.emissiveIntensity) * Math.min(1, dt * (T.herradura ? 3 : 0.8));
    caliente.color.setRGB(0.23 + caliente.emissiveIntensity * 0.25, 0.24, 0.26);
  };
  T.efecto = (paso, fx) => {
    if (paso === 'yunque' || paso === 'fragua') { T.herradura = 1; fx.chispas(YX + 0.1, 0.95, YZ); }
    if (paso === 'pila') { T.herradura = 0; fx.vapor(PX, 0.55, PZ); }
  };
  T.herradura = 0;
  return {
    taller: { foco: [-0.2, 0.85, -0.9], cam: [1.7, 3.1, 8.6] },
    aprendiz: { de: [-1.35, 1.75] },   // (donde se pone el explorador, a un lado, mirando)
    maestro: { de: [1.1, -0.6] },   // (donde espera el herrero al entrar)
    fragua: { foco: [FX + 0.1, 0.95, FZ], cam: [0.55, 1.85, 0.55], de: [FX - 0.6, FZ + 0.95] },
    fuelle: { foco: [BX - 0.5, 0.95, BZ], cam: [-0.9, 1.65, 0.45], de: [BX - 1.25, BZ + 0.45] },
    yunque: { foco: [YX, 0.85, YZ], cam: [1.75, 1.75, 2.75], de: [YX, YZ - 0.75] },
    martillo: { foco: [YX - 0.05, 1.0, YZ], cam: [1.2, 1.6, 2.05], de: [YX, YZ - 0.75] },
    tenazas: { foco: [HX - 0.35, HY - 0.05, HZ], abs: true, cam: [1.25, 1.65, -0.35] },
    pila: { foco: [PX, 0.55, PZ], cam: [3.15, 1.7, 3.35], de: [PX - 0.2, PZ - 0.7] },
  };
}

// Lo que tiene cada oficio con taller: cómo se monta, su tamaño (de -w/2 a w/2 y de z0 a z1) y en qué puesto se explica
// cada herramienta y cada paso (en el orden de data/oficios.js). Los demás oficios siguen con su banco de siempre.
// vista: el pasillo (x0, x1, z0, z1) que tiene que estar libre para el plano del taller entero, delante
export const TALLERES = {
  herrero: { monta: herreria, w: 8.4, z0: -3.5, z1: 3.6, vista: [-0.6, 3.8, 3.6, 9.4], herramientas: ['fragua', 'fuelle', 'yunque', 'martillo', 'tenazas'], pasos: ['tenazas', 'fragua', 'pila'] },
};

// Un sitio para el taller cerca del vecino que lo enseña: despejado (sin casas ni muros; los árboles y las matas se
// quitan), casi llano, fuera del agua, fuera de las calles y de la plaza (no puede cortar el paso: su muro mide 8 m) y
// mirando hacia el vecino, que es por donde se llega; con sitio delante para el plano del taller entero y la entrada a
// la que se puede llegar andando. La primera vez salió en medio de la plaza de Lesaka, junto a la fuente
export function sitioTaller(kind, host, ok) {
  const D = TALLERES[kind]; if (!D) return null;
  const hw = D.w / 2, [vx0, vx1, vz0, vz1] = D.vista;
  const fuera = (wx, wz) => { const q = pathQuery(wx, wz); return plazaMask(wx, wz) < 0.3 && !(q.w >= 0.8 && q.d < q.w + 0.5); };
  for (let r = 6; r <= 64; r += 1.5) for (let k = 0; k < 20; k++) {
    const a = k / 20 * Math.PI * 2 + r * 0.61, x = host.x + Math.cos(a) * r, z = host.z + Math.sin(a) * r;
    const ry = Math.atan2(host.x - x, host.z - z), c = Math.cos(ry), s = Math.sin(ry), W = (u, v) => [x + u * c + v * s, z - u * s + v * c];
    if (!rectFree(x, z, ry, -hw, hw, D.z0, D.z1 + 1.2, 0.25, true) || !rectFree(x, z, ry, vx0, vx1, vz0, vz1, 0, true)) continue;
    let lo = 1e9, hi = -1e9, mal = false;
    for (const u of [-hw, -hw / 2, 0, hw / 2, hw]) for (const v of [D.z0, D.z0 / 2, 0, D.z1 / 2, D.z1]) {
      const [wx, wz] = W(u, v), g = groundHeight(wx, wz); lo = Math.min(lo, g); hi = Math.max(hi, g);
      if (waterLevelAt(wx, wz) > g - 0.2 || !fuera(wx, wz)) { mal = true; break; }
    }
    if (mal || hi - lo > 0.75) continue;
    if (ok && !ok(x, z)) continue;
    const [ex, ez] = W(0, D.z1 + 0.8); if (!alcanzable(ex, ez)) continue;
    return { x, z, ry };
  }
  return null;
}

// Monta el taller en (x, z) mirando hacia ry. fx: { chispas(x, y, z), vapor(x, y, z) } en coordenadas del taller (los
// convierte quien lo llama, con T.mundo). Devuelve el taller: su grupo, sus puestos y lo que hay que animar.
export function makeTaller(kind, x, z, ry, particles) {
  const D = TALLERES[kind]; if (!D) return null;
  const O = new Obra(x, z, ry);
  { const [a, b] = O.w(0, D.z0); clearTrees(a, b, D.w, D.z1 - D.z0, ry); clearBushes(a, b, D.w, D.z1 - D.z0, ry); clearGrass(a, b, D.w - 0.6, D.z1 - D.z0 - 0.4, ry); }   // (sin hierba ni flores entre las losas)
  const T = { kind, x, z, ry, group: O.group, activo: null, fuerza: 0, anima: null, efecto: null };
  const st = D.monta(O, T);
  O.cierra();
  T.mundo = (lx, ly, lz) => { const [a, b] = O.w(lx, lz); return new THREE.Vector3(a, O.g0 + ly, b); };
  T.suelo = (lx, lz) => { const [a, b] = O.w(lx, lz); return new THREE.Vector3(a, groundHeight(a, b), b); };
  // cada puesto, en el mundo: adónde mira la cámara (foco, a la altura del suelo de ese punto), desde dónde (cam) y dónde
  // se pone el maestro (de), mirando al foco
  T.puestos = {};
  for (const [id, p] of Object.entries(st)) {
    const f = p.foco ? T.mundo(p.foco[0], p.foco[1] + (p.abs ? 0 : O.gy(p.foco[0], p.foco[2])), p.foco[2]) : null;
    const cpos = p.cam ? T.mundo(p.cam[0], p.cam[1] + O.gy(p.cam[0], p.cam[2]), p.cam[2]) : null;
    T.puestos[id] = { foco: f, cam: cpos, de: p.de ? T.suelo(p.de[0], p.de[1]) : null };
  }
  T.herramientas = D.herramientas; T.pasos = D.pasos;
  // el aro que señala en el suelo el puesto del que se habla
  const aro = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 40), new THREE.MeshBasicMaterial({ color: '#ffd75a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  aro.rotation.x = -Math.PI / 2; aro.visible = false; aro.renderOrder = 2;
  T.aro = aro;   // (va en la escena, no en el grupo: se coloca en coordenadas del mundo)
  const fx = {
    chispa: (lx, ly, lz) => particles?.emit(T.mundo(lx, ly + O.gy(lx, lz), lz), { n: 1, color: ['#ffb34a', '#ffe38a'], speed: 0.5, size: 0.07, life: 1.1, gravity: -0.8, spread: 0.05 }),
    chispas: (lx, ly, lz) => particles?.emit(T.mundo(lx, ly + O.gy(lx, lz), lz), { n: 26, color: ['#ffd27a', '#ff8a2a', '#fff2c0'], speed: 3.2, size: 0.12, life: 0.7, gravity: 6, spread: 0.1 }),
    vapor: (lx, ly, lz) => { const p = T.mundo(lx, ly + O.gy(lx, lz), lz); for (let k = 0; k < 3; k++) setTimeout(() => particles?.emit(p, { n: 16, color: ['#e8eef2', '#ffffff', '#c9d4da'], speed: 0.7, size: 0.55, life: 1.6, gravity: -1.2, spread: 0.5, drag: 1.2 }), k * 220); },
  };
  T.fx = fx;
  // señala un puesto (o nada): el aro baja hasta su suelo y late
  T.señala = (id) => {
    T.activo = id || null;
    const p = id && T.puestos[id]; aro.visible = !!p;
    if (p) { aro.position.set(p.foco.x, groundHeight(p.foco.x, p.foco.z) + 0.06, p.foco.z); aro.userData.t = 0; }
  };
  T.update = (dt, t) => {
    T.anima?.(dt, t);
    if (aro.visible) { aro.userData.t += dt; aro.material.opacity = Math.min(1, aro.userData.t * 3) * (0.45 + 0.3 * Math.sin(t * 4)); const s = 1 + 0.06 * Math.sin(t * 4); aro.scale.set(s, s, s); }
  };
  T.paso = (id) => T.efecto?.(id, fx);
  return T;
}
