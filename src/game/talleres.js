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

// El cobertizo de los talleres de pueblo: suelo de losas, muro de piedra al fondo y tejado de teja sobre dos postes,
// abierto por delante y por los lados para que la cámara vea dentro. Devuelve dónde está el muro (zm)
function cobertizo(O) {
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
  return { zm };
}

// La herrería de Lesaka: muro de piedra al fondo con la fragua y su campana, el fuelle de cuero, el yunque sobre su
// tronco, la pila de piedra para templar, la pared de herramientas, el banco con su tornillo, el montón de carbón, las
// barras de hierro y la piedra de afilar. Tejado de teja sobre dos postes y el muro: abierto por delante y por los lados.
function herreria(O, T) {
  const { zm } = cobertizo(O);

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

// El horno del pueblo de Artajona: el horno de leña con su bóveda de barro y la boca donde arde el fuego, la leña y los
// sarmientos, la artesa donde se amasa (y la masa que crece tapada con un paño), el cuenco de la levadura madre, la pala
// de madera, la mesa con las hogazas marcadas con la señal de cada casa (crudas y, al acabar, doradas), los sacos de
// harina y la estantería con los panes. Mismo cobertizo que la herrería.
function hornoPan(O, T) {
  const { zm } = cobertizo(O);
  // el horno: la base de piedra, la bóveda de barro encalado, la boca con el fuego dentro y su chimenea
  const HX = -1.55, HZ = -1.75, HB = 0.95;
  O.box(2.3, HB, 2.1, texturas().mMuro(1.6, 0.8), HX, HB / 2, HZ);
  O.box(2.4, 0.08, 2.2, '#7d7468', HX, HB + 0.04, HZ);
  O.put(new THREE.SphereGeometry(1.0, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), '#c49a6c', HX, HB + 0.06, HZ - 0.05, { sy: 0.78 });
  O.put(new THREE.TorusGeometry(1.0, 0.05, 6, 28), '#a57c52', HX, HB + 0.08, HZ - 0.05, { rx: Math.PI / 2 });
  O.box(0.34, 0.9, 0.34, '#b08a62', HX + 0.35, HB + 0.95, HZ - 0.65);
  // la boca: un arco de piedra y dentro, el fuego (brasas que laten)
  const BZ = HZ + 0.98;
  const arco = new THREE.Shape(); arco.moveTo(-0.32, 0); arco.lineTo(-0.32, 0.22); arco.absarc(0, 0.22, 0.32, Math.PI, 0, true); arco.lineTo(0.32, 0); arco.closePath();
  const fuego = new THREE.MeshStandardMaterial({ color: '#2a1208', emissive: new THREE.Color('#ff6a1a'), emissiveIntensity: 1, roughness: 1 });
  const boca = new THREE.Mesh(new THREE.ShapeGeometry(arco, 10), fuego); O.suelta(boca, HX, HB + 0.07, BZ + 0.012); boca.castShadow = false;
  O.box(0.86, 0.1, 0.14, '#857c70', HX, HB + 0.66, BZ - 0.02);   // (el dintel)
  for (const s of [-1, 1]) O.box(0.12, 0.6, 0.14, '#857c70', HX + s * 0.43, HB + 0.36, BZ - 0.02);
  O.box(0.6, 0.62, 0.04, HIERRO, HX + 0.85, HB / 2 + 0.31, BZ + 0.15, { m: HIERRO_O, ry: -0.5 });   // (la puerta de hierro, apoyada)
  O.colBox(HX, HZ, 2.4, 2.2);
  // la leña y los sarmientos, a la izquierda
  const LX = -3.25, LZ = -0.35;
  for (let f = 0; f < 4; f++) for (let k = 0; k < 6 - f; k++) O.cyl(0.07, 0.07, 1.0, 7, k % 2 ? '#7a5636' : '#8a6444', LX - 0.25 + k * 0.15 + f * 0.075, 0.08 + f * 0.13, LZ, { rx: Math.PI / 2 });
  for (let k = 0; k < 9; k++) O.cyl(0.012, 0.012, 0.9, 4, '#6a4a2a', LX + 0.1 + (k % 3) * 0.05, 0.62 + Math.floor(k / 3) * 0.04, LZ + 0.75, { rz: 1.2 + (k % 4) * 0.2, ry: k });   // (sarmientos)
  O.colBox(LX, LZ + 0.2, 0.9, 1.3);
  // la artesa sobre sus patas, con la masa (que aparece al amasar y crece tapada con un paño)
  const AX = 0.85, AZ = -0.15, AY = 0.78;
  O.box(1.5, 0.06, 0.62, MADERA2, AX, AY - 0.15, AZ);
  for (const s of [-1, 1]) { O.box(1.5, 0.32, 0.05, MADERA2, AX, AY, AZ + s * 0.29, { rx: s * 0.18 }); O.box(0.05, 0.32, 0.6, MADERA2, AX + s * 0.73, AY, AZ); }
  for (const dx of [-0.6, 0.6]) for (const dz of [-0.22, 0.22]) O.box(0.07, AY - 0.18, 0.07, MADERA, AX + dx, (AY - 0.18) / 2, AZ + dz);
  O.box(1.2, 0.04, 0.4, '#efe6d2', AX, AY - 0.1, AZ);   // (la harina del fondo)
  const masaM = mat('#ead7ad', { roughness: 0.95 });
  const masa = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 10), masaM); masa.scale.set(1.3, 0.55, 1); O.suelta(masa, AX, AY - 0.02, AZ); masa.visible = false;
  const pano = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#d8c9b0', { side: THREE.DoubleSide })); pano.scale.set(1.35, 0.5, 1.05); O.suelta(pano, AX, AY - 0.06, AZ); pano.visible = false;
  O.colBox(AX, AZ, 1.6, 0.7);
  // la levadura madre: el cuenco de barro con su masa, en la mesita junto al muro
  const VX = 2.35, VZ = -2.25;
  O.box(0.8, 0.05, 0.55, MADERA2, VX, 0.78, VZ); for (const dx of [-0.32, 0.32]) for (const dz of [-0.2, 0.2]) O.box(0.05, 0.76, 0.05, MADERA, VX + dx, 0.38, VZ + dz);
  O.cyl(0.17, 0.11, 0.14, 14, '#a8653e', VX - 0.1, 0.88, VZ); O.put(new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#e3cfa2', VX - 0.1, 0.94, VZ, { sy: 0.5 });
  O.cyl(0.06, 0.07, 0.16, 10, '#c9bda8', VX + 0.22, 0.89, VZ + 0.05);   // (el tarro de la sal)
  O.colBox(VX, VZ, 0.85, 0.6);
  // la pala del horno, apoyada en el muro con la hoja arriba (a la altura de los ojos), y el rastrillo de las brasas
  O.cyl(0.022, 0.022, 1.8, 6, '#a8794d', -0.2, 0.88, zm + 0.52, { rx: -0.2 });
  O.box(0.36, 0.44, 0.03, '#d4ad78', -0.2, 1.87, zm + 0.32, { rx: -0.2 });
  O.cyl(0.015, 0.015, 1.9, 5, MADERA, 0.06, 0.97, zm + 0.4, { rx: -0.22 }); O.box(0.26, 0.05, 0.05, HIERRO, 0.06, 0.07, zm + 0.62, { m: HIERRO_O });
  // la mesa con las hogazas marcadas (cada casa con su señal) y, al acabar, las cocidas
  const MX = 2.75, MZ = 0.95;
  O.box(0.8, 0.06, 1.5, MADERA2, MX, 0.82, MZ); for (const dx of [-0.32, 0.32]) for (const dz of [-0.65, 0.65]) O.box(0.07, 0.79, 0.07, MADERA, MX + dx, 0.4, MZ + dz);
  O.box(0.7, 0.012, 1.4, '#efe9dc', MX, 0.856, MZ);   // (el paño)
  const crudo = mat('#e6d2a5', { roughness: 0.95 }), cocido = mat('#b4733a', { roughness: 0.8 });
  const panes = [];
  for (let k = 0; k < 6; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 8), crudo); p.scale.set(1, 0.5, 1); O.suelta(p, MX + (k % 2 ? 0.17 : -0.17), 0.92, MZ - 0.5 + Math.floor(k / 2) * 0.5); panes.push(p);
    const marca = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.006, 0.02), mat('#8a6a44')); marca.position.y = 0.15; marca.rotation.y = k * 0.7; p.add(marca); }
  O.colBox(MX, MZ, 0.85, 1.55);
  // los sacos de harina y la estantería con los panes de la semana
  for (const [x, z, r] of [[3.2, -1.2, 0.26], [3.35, -0.6, 0.24], [2.95, -0.85, 0.22]]) { O.cyl(r, r * 1.08, 0.75, 12, '#d9ccb0', x, 0.38, z); O.put(new THREE.SphereGeometry(r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#d2c4a6', x, 0.75, z, { sy: 0.4 }); }
  O.col(3.15, -0.9, 0.55);
  const EX = 0.95, EZ = zm + 0.4;
  for (const y of [0.35, 0.95, 1.55]) O.box(1.5, 0.04, 0.4, MADERA2, EX, y, EZ);
  for (const s of [-1, 1]) O.box(0.05, 1.7, 0.4, MADERA, EX + s * 0.74, 0.85, EZ);
  for (let k = 0; k < 8; k++) { const y = k < 4 ? 0.43 : 1.03; O.put(new THREE.SphereGeometry(0.13, 12, 8), cocido, EX - 0.5 + (k % 4) * 0.33, y, EZ, { sy: 0.55 }); }
  O.colBox(EX, EZ, 1.55, 0.45);

  // lo que se mueve: el fuego que late, la masa que crece, los panes que se doran
  let crece = 0, dorado = 0;
  T.anima = (dt, t) => {
    const vivo = T.activo === 'horno' || T.fuerza > 0;
    fuego.emissiveIntensity = (vivo ? 1.5 : 1) * (0.8 + 0.2 * Math.sin(t * 7) * Math.sin(t * 4.1));
    if (T.masa) { masa.visible = true; crece = Math.min(1, crece + dt * (T.crece ? 0.35 : 0)); const s = 1 + crece * 0.45; masa.scale.set(1.3 * s, 0.55 * s * (1 + crece * 0.2), s); pano.visible = T.crece; pano.scale.set(1.35 * s, 0.5 * s * 1.15, 1.05 * s); }
    if (T.cocido && dorado < 1) { dorado = Math.min(1, dorado + dt * 0.6); if (dorado > 0.5) for (const p of panes) p.material = cocido; }
    if (vivo && (T.chispaT = (T.chispaT || 0) - dt) <= 0) { T.chispaT = 0.25 + Math.random() * 0.3; T.fx?.chispa?.(HX + (Math.random() - 0.5) * 0.4, HB + 0.25, BZ + 0.05); }
  };
  T.efecto = (paso, fx) => {
    if (paso === 'artesa') { if (!T.masa) T.masa = true; else T.crece = true; fx.harina?.(AX, AY + 0.1, AZ); }
    if (paso === 'horno') { T.cocido = true; fx.chispas(HX, HB + 0.3, BZ + 0.1); }
  };
  return {
    taller: { foco: [-0.2, 0.85, -0.9], cam: [1.7, 3.1, 8.6] },
    aprendiz: { de: [-1.5, 2.1] },
    maestro: { de: [0.85, -0.85] },
    artesa: { foco: [AX, AY, AZ], cam: [1.55, 1.8, 2.15], de: [AX, AZ - 0.7] },
    levadura: { foco: [VX - 0.05, 0.9, VZ], cam: [2.0, 1.55, -0.7] },
    horno: { foco: [HX, HB + 0.35, HZ + 0.4], cam: [0.45, 1.75, 1.6], de: [HX - 0.65, BZ + 1.1] },   // (a la izquierda de la boca, por delante: se llega en línea recta desde la artesa)
    pala: { foco: [-0.18, 1.45, zm + 0.42], abs: true, cam: [0.0, 1.6, -0.55] },
  };
}

// La cantería de Puente la Reina: la piedra de la cantera amontonada contra el muro y, delante, las tres piedras para elegir
// (una buena, una bonita pero partida y un canto de río), el banco del cantero con el bloque que pasa de bruto a desbastado
// y a sillar liso (y, al final, con la marca que elijas), la escuadra, el compás, la plomada y la plantilla colgados del
// muro, el cincel y la maza en el banco, el pico, los sillares acabados con las marcas de otros canteros y un arco a medio
// hacer sobre su cimbra de madera, como los del puente, con la clave en el suelo esperando. Mismo cobertizo que la herrería.
function canteria(O, T) {
  const { zm } = cobertizo(O);
  const PIEDRA = '#dcc39a', PIEDRA2 = '#c9ad83', DOVELA = '#e0cca6', MARCA = '#5b5144';
  const mMarca = mat(MARCA, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  // una piedra en bruto: una caja con los vértices movidos (los que coinciden se mueven igual, para que no se abra) y la
  // cara de abajo plana, para que asiente
  const bruta = (w, h, d, amp, seed, seg = 3) => {
    const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg), p = g.attributes.position;
    const q = (v) => Math.round(v * 1e4) / 1e4, fr = (v) => v - Math.floor(v);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), hh = Math.sin(q(x) * 12.9898 + q(y) * 78.233 + q(z) * 37.719 + seed * 7.13) * 43758.5453;
      p.setXYZ(i, x + amp * (fr(hh) - 0.5), y <= -h / 2 + 1e-4 ? y : y + amp * (fr(hh * 1.37) - 0.5), z + amp * (fr(hh * 2.11) - 0.5));
    }
    const n = g.toNonIndexed(); g.dispose(); n.computeVertexNormals(); return n;
  };
  // la piedra labrada: grano fino, las huellas del trinchante y la arista de cada cara algo más oscura
  const labrada = (() => {
    if (MATS.has('labrada')) return MATS.get('labrada');
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), r = rnd0(41);
    g.fillStyle = '#e2cfa8'; g.fillRect(0, 0, S, S);
    for (let k = 0; k < 900; k++) { const v = 186 + r() * 54 | 0; g.fillStyle = `rgba(${v},${v - 14},${v - 44},0.55)`; g.fillRect(r() * S, r() * S, 1.6, 1.6); }
    g.strokeStyle = 'rgba(118,102,78,0.3)'; g.lineWidth = 1;
    for (let k = 0; k < 70; k++) { const x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 5, y + 7); g.stroke(); }
    g.strokeStyle = 'rgba(96,84,64,0.5)'; g.lineWidth = 4; g.strokeRect(2, 2, S - 4, S - 4);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 }); MATS.set('labrada', m); return m;
  })();
  // las marcas de cantero (estrella, flecha, llave y cruz), grabadas: una forma oscura pegada a la cara de la piedra
  const marcaGeo = (tipo, s) => {
    const rect = (x0, y0, x1, y1) => { const r = new THREE.Shape(); r.moveTo(x0, y0); r.lineTo(x1, y0); r.lineTo(x1, y1); r.lineTo(x0, y1); r.closePath(); return r; };
    if (tipo === 0) { const sh = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? s * 0.42 : s; if (k) sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); else sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } sh.closePath(); return new THREE.ShapeGeometry(sh); }
    if (tipo === 1) { const w = s * 0.16, sh = new THREE.Shape(); sh.moveTo(-w, -s); sh.lineTo(w, -s); sh.lineTo(w, s * 0.25); sh.lineTo(s * 0.5, s * 0.25); sh.lineTo(0, s); sh.lineTo(-s * 0.5, s * 0.25); sh.lineTo(-w, s * 0.25); sh.closePath(); return new THREE.ShapeGeometry(sh); }
    if (tipo === 2) {
      const aro = new THREE.Shape(); aro.absarc(0, s * 0.55, s * 0.42, 0, Math.PI * 2, false);
      const ojo = new THREE.Path(); ojo.absarc(0, s * 0.55, s * 0.2, 0, Math.PI * 2, true); aro.holes.push(ojo);
      return new THREE.ShapeGeometry([aro, rect(-s * 0.1, -s, s * 0.1, s * 0.16), rect(s * 0.1, -s, s * 0.42, -s * 0.8), rect(s * 0.1, -s * 0.62, s * 0.32, -s * 0.44)]);
    }
    const w = s * 0.15; return new THREE.ShapeGeometry([rect(-w, -s, w, s), rect(-s * 0.7, s * 0.2 - w, s * 0.7, s * 0.2 + w)]);
  };

  // la piedra de la cantera, amontonada contra el muro de la izquierda
  let sd = 30;
  for (const [x, z, w, h, d, y0] of [[-3.25, -2.3, 0.8, 0.5, 0.6, 0], [-2.45, -2.25, 0.7, 0.45, 0.62, 0], [-1.75, -2.3, 0.62, 0.52, 0.55, 0], [-3.2, -1.65, 0.7, 0.42, 0.55, 0], [-2.5, -1.7, 0.6, 0.38, 0.5, 0],
    [-2.95, -2.3, 0.72, 0.42, 0.55, 0.5], [-2.15, -2.25, 0.66, 0.4, 0.55, 0.46], [-2.6, -2.25, 0.55, 0.36, 0.5, 0.88]]) {
    O.put(bruta(w, h, d, 0.06, sd++, 2), sd % 2 ? PIEDRA : PIEDRA2, x, y0 + h / 2, z);
  }
  O.colBox(-2.5, -2.0, 2.4, 1.1);
  // las tres piedras para elegir: la buena, la bonita pero partida y el canto de río
  const LX = -2.15, LZ = -0.55;
  const gBuena = bruta(0.64, 0.42, 0.46, 0.06, 3, 2);
  const buena = new THREE.Mesh(gBuena, mat(PIEDRA)); O.suelta(buena, LX - 0.78, 0.21, LZ);
  for (const s of [-1, 1]) O.put(bruta(0.29, 0.42, 0.46, 0.04, 7 + s, 2), '#e3b98a', LX + s * 0.17, 0.21, LZ, { rz: s * 0.06 });   // (las dos mitades, separadas por la grieta)
  O.put(new THREE.SphereGeometry(0.27, 18, 12), mat('#9ca2a0', { roughness: 0.45 }), LX + 0.8, 0.165, LZ, { sx: 1.1, sy: 0.62, sz: 0.85 });
  O.colBox(LX, LZ, 2.2, 0.6);
  // el pico, apoyado en el montón
  const PX = -1.25, PZ = -1.4;
  O.cyl(0.022, 0.026, 0.95, 7, MADERA2, PX, 0.45, PZ, { rx: -0.33 });
  { const ty = 0.45 + 0.47 * Math.cos(0.33), tz = PZ - 0.47 * Math.sin(0.33);
    for (const s of [-1, 1]) O.put(new THREE.CylinderGeometry(0, 0.034, 0.3, 6), HIERRO, PX + s * 0.15, ty, tz, { rz: -s * Math.PI / 2, m: HIERRO_O });
    O.box(0.08, 0.08, 0.08, HIERRO, PX, ty, tz, { m: HIERRO_O }); }

  // el banco del cantero: dos piedras de pata y un tablón grueso; encima, el bloque (bruto, desbastado o sillar)
  const BX = 0.35, BZ = 0.1, BY = 0.65;
  for (const s of [-1, 1]) O.put(bruta(0.32, 0.55, 0.62, 0.03, 10 + s), PIEDRA2, BX + s * 0.42, 0.275, BZ);
  O.box(1.3, 0.1, 0.72, MADERA, BX, 0.6, BZ);
  O.colBox(BX, BZ, 1.35, 0.75);
  const bloqueB = new THREE.Mesh(gBuena, mat(PIEDRA)); O.suelta(bloqueB, BX - 0.05, BY + 0.21, BZ); bloqueB.visible = false;
  const bloqueD = new THREE.Mesh(bruta(0.62, 0.38, 0.44, 0.022, 22), mat(PIEDRA)); O.suelta(bloqueD, BX - 0.05, BY + 0.19, BZ); bloqueD.visible = false;
  const sillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.36, 0.42), labrada); O.suelta(sillar, BX - 0.05, BY + 0.18, BZ); sillar.visible = false;
  const marcas = [0, 1, 2].map(t => { const m = new THREE.Mesh(marcaGeo(t, 0.085), mMarca); m.position.z = 0.211; m.visible = false; sillar.add(m); return m; });
  // el cincel y la maza, en la punta del tablón
  const ACERO = '#8d949b';
  O.cyl(0.017, 0.017, 0.27, 8, ACERO, BX + 0.52, BY + 0.018, BZ + 0.2, { rz: Math.PI / 2, m: HIERRO_O });
  O.box(0.05, 0.01, 0.04, ACERO, BX + 0.365, BY + 0.018, BZ + 0.2, { m: HIERRO_O });   // (el filo)
  O.cyl(0.024, 0.02, 0.03, 8, '#6f757b', BX + 0.67, BY + 0.018, BZ + 0.2, { rz: Math.PI / 2, m: HIERRO_O });   // (la cabeza, chafada de los golpes)
  O.box(0.16, 0.095, 0.095, '#70767d', BX + 0.36, BY + 0.048, BZ - 0.12, { m: HIERRO_O });
  O.cyl(0.018, 0.02, 0.3, 8, '#b48a5c', BX + 0.59, BY + 0.03, BZ - 0.12, { rz: Math.PI / 2 });
  // las lascas que saltan al tallar, por el suelo alrededor del banco
  { const r = rnd0(77); for (let k = 0; k < 34; k++) { const a = r() * Math.PI * 2, d = 0.75 + r() * 0.7, x = BX + Math.cos(a) * d, z = BZ + Math.sin(a) * d * 0.8, s = 0.03 + r() * 0.05;
    O.box(s, s * 0.4, s * 0.8, r() > 0.5 ? PIEDRA : '#ddd2ba', x, 0.05, z, { ry: r() * 3 }); } }
  // el cubo de agua para mojar la piedra
  O.cyl(0.16, 0.13, 0.3, 12, MADERA2, BX - 0.95, 0.15, BZ + 0.4); O.cyl(0.145, 0.145, 0.01, 12, mat('#5f7f8a', { roughness: 0.2 }), BX - 0.95, 0.27, BZ + 0.4);
  O.col(BX - 0.95, BZ + 0.4, 0.2);

  // la escuadra, el compás, la plomada y la plantilla, colgados del muro en su tabla
  const RX = -0.55, RZ = zm + 0.29, RY = 1.5;
  O.box(1.5, 0.9, 0.04, '#a87b52', RX, RY, RZ, { abs: true });
  const fz = RZ + 0.03;
  O.box(0.035, 0.5, 0.012, HIERRO, RX - 0.5, RY - 0.02, fz, { abs: true, m: HIERRO_O }); O.box(0.32, 0.035, 0.012, HIERRO, RX - 0.36, RY - 0.255, fz, { abs: true, m: HIERRO_O });   // (la escuadra)
  for (const ph of [-0.2, 0.2]) O.box(0.022, 0.42, 0.012, HIERRO, RX - 0.08 + Math.sin(ph) * 0.21, RY + 0.22 - Math.cos(ph) * 0.21, fz, { abs: true, rz: ph, m: HIERRO_O });   // (el compás)
  O.cyl(0.025, 0.025, 0.02, 10, HIERRO, RX - 0.08, RY + 0.22, fz, { abs: true, rx: Math.PI / 2, m: HIERRO_O });
  { const pl = new THREE.Shape(); pl.moveTo(-0.17, -0.12); pl.lineTo(0.17, -0.12); pl.lineTo(0.17, 0.02); pl.absarc(0, 0.02, 0.17, 0, Math.PI, false); pl.closePath();
    const hueco = new THREE.Path(); hueco.absarc(0, 0.02, 0.1, 0, Math.PI, false); hueco.closePath(); pl.holes.push(hueco);
    O.put(new THREE.ShapeGeometry(pl, 12), mat('#c9a477', { side: THREE.DoubleSide }), RX + 0.52, RY - 0.12, fz, { abs: true }); }   // (la plantilla del arco)
  for (const x of [RX - 0.5, RX - 0.08, RX + 0.25, RX + 0.52]) O.cyl(0.012, 0.012, 0.05, 6, MADERA, x, RY + 0.36, RZ + 0.04, { abs: true, rx: Math.PI / 2 });   // (las clavijas)
  const plomada = new THREE.Group();
  { const hilo = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.46, 0.005), mat('#e8dfc8')); hilo.position.y = -0.23; plomada.add(hilo);
    const pesa = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0, 0.09, 10), mat('#b08d3a', { metalness: 0.7, roughness: 0.35 })); pesa.position.y = -0.5; plomada.add(pesa); }
  O.suelta(plomada, RX + 0.25, RY + 0.36, RZ + 0.05, { abs: true });

  // el arco a medio hacer: dos pilas de sillares, la cimbra de madera y las dovelas encima; la clave, en el suelo
  const AX = 2.55, AZ = -2.2, YS = 0.9, R1 = 0.575, R2 = 0.835, N = 9;
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) O.box(0.45, 0.296, 0.42, labrada, AX + s * 0.8, 0.15 + k * 0.3, AZ);
  const dovela = (k) => {
    const g = 0.012, a0 = Math.PI - k * Math.PI / N - g, a1 = Math.PI - (k + 1) * Math.PI / N + g, sh = new THREE.Shape();
    sh.moveTo(R1 * Math.cos(a0), R1 * Math.sin(a0)); sh.lineTo(R2 * Math.cos(a0), R2 * Math.sin(a0)); sh.absarc(0, 0, R2, a0, a1, true);
    sh.lineTo(R1 * Math.cos(a1), R1 * Math.sin(a1)); sh.absarc(0, 0, R1, a1, a0, false);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.42, bevelEnabled: false, curveSegments: 3 }); geo.translate(0, 0, -0.21); return geo;
  };
  for (let k = 0; k < N; k++) if (k !== 4) O.put(dovela(k), DOVELA, AX, YS, AZ, { abs: false });
  O.put(dovela(4), DOVELA, AX + 0.15, -R1 * Math.cos(Math.PI / (2 * N)) + 0.005, AZ + 0.85, { ry: 0.35 });   // (la clave, esperando)
  { const ci = new THREE.Shape(); ci.absarc(0, 0, 0.57, 0, Math.PI, false); ci.lineTo(-0.5, 0); ci.absarc(0, 0, 0.5, Math.PI, 0, true); ci.closePath();
    const geo = new THREE.ExtrudeGeometry(ci, { depth: 0.36, bevelEnabled: false, curveSegments: 16 }); geo.translate(0, 0, -0.18); O.put(geo, MADERA2, AX, YS, AZ); }
  for (const [dx, h] of [[-0.3, YS + 0.4], [0, YS + 0.5], [0.3, YS + 0.4]]) O.box(0.07, h, 0.07, VIGA, AX + dx, h / 2, AZ);
  for (const dz of [-0.16, 0.16]) O.box(1.14, 0.07, 0.05, VIGA, AX, YS - 0.04, AZ + dz);
  O.colBox(AX, AZ, 2.1, 0.6); O.col(AX + 0.15, AZ + 0.85, 0.25);

  // los sillares acabados, con las marcas de otros canteros, sobre su palé
  const SX = 2.75, SZ = 1.0;
  O.box(1.15, 0.08, 0.86, MADERA, SX, 0.04, SZ);
  for (const [x, z, y, t] of [[-0.27, -0.2, 0, -1], [0.27, -0.2, 0, -1], [-0.27, 0.2, 0, 3], [0.27, 0.2, 0, 1], [0, 0.2, 1, 0]]) {
    const yy = 0.08 + 0.15 + y * 0.302;
    O.box(0.5, 0.3, 0.36, labrada, SX + x, yy, SZ + z);
    if (t >= 0) O.put(marcaGeo(t, 0.065), mMarca, SX + x, yy, SZ + z + 0.182);
  }
  O.colBox(SX, SZ, 1.2, 0.9);

  // lo que se mueve: la plomada, que se balancea un poco
  T.anima = (dt, t) => { plomada.rotation.z = 0.05 * Math.sin(t * 2.1); };
  // el bloque, según por dónde va el trabajo: 0 nada en el banco, 1 en bruto, 2 desbastado, 3 sillar
  let fase = 0;
  const pon = (f) => { fase = f; buena.visible = f === 0; bloqueB.visible = f === 1; bloqueD.visible = f === 2; sillar.visible = f >= 3; };
  T.efecto = (paso, fx, r) => {
    if (paso === 'bloques') { pon(1); fx.polvo?.(BX - 0.05, BY + 0.25, BZ); }
    if (paso === 'banco') { pon(Math.min(3, Math.max(fase, 1) + 1)); fx.polvo?.(BX - 0.05, BY + 0.3, BZ + 0.1); fx.lascas?.(BX - 0.05, BY + 0.3, BZ + 0.15); }
    if (paso === 'marca') { pon(3); const k = r && r.pick >= 0 ? r.pick % 3 : 0; marcas.forEach((m, i) => { m.visible = i === k; }); fx.polvo?.(BX - 0.05, BY + 0.2, BZ + 0.25); }
  };
  return {
    taller: { foco: [-0.2, 0.85, -0.9], cam: [1.7, 3.1, 8.6] },
    aprendiz: { de: [-2.4, 2.3] },
    maestro: { de: [BX - 0.3, BZ - 0.85] },
    escuadra: { foco: [RX - 0.2, RY - 0.05, RZ], abs: true, cam: [RX + 0.25, 1.55, RZ + 1.75] },
    cincel: { foco: [BX + 0.5, 0.95, BZ + 0.1], cam: [BX + 1.15, 1.25, BZ + 1.25] },
    maza: { foco: [BX + 0.45, 0.95, BZ - 0.1], cam: [BX + 1.45, 1.3, BZ + 0.75] },
    pico: { foco: [PX, 0.55, PZ - 0.1], cam: [PX + 0.85, 1.2, PZ + 0.4], de: [0.9, -1.2] },   // (desde el lado del banco, de espaldas al maestro)
    bloques: { foco: [LX, 0.3, LZ], cam: [LX, 1.5, LZ + 1.55], de: [LX - 0.1, LZ - 0.75] },
    banco: { foco: [BX - 0.05, 0.85, BZ], cam: [BX + 1.0, 1.65, BZ + 1.9], de: [BX - 0.05, BZ - 0.8] },
    marca: { foco: [BX - 0.05, BY + 0.18, BZ + 0.21], cam: [BX + 0.3, 1.15, BZ + 1.1] },
  };
}

// La tonelería de Viana: las duelas de roble apiladas en castillo y de pie contra el muro, los aros de hierro colgados de
// sus clavijas, el fuego en su brasero con una barrica en rosa encima (las duelas abiertas por arriba, calentándose para
// doblarse, con su humo), la barrica del trabajo con el aro que baja a golpes y la cierra, el mazo y el asentador, las
// virutas por el suelo y las barricas acabadas en su pirámide sobre calzos. Mismo cobertizo que la herrería.
function toneleria(O, T) {
  const { zm } = cobertizo(O);
  // la madera de las duelas: tablas de roble una junto a otra (rayas a lo largo) con su veta
  const duelas = (() => {
    if (MATS.has('duelas')) return MATS.get('duelas');
    const W = 256, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), r = rnd0(53);
    const N = 22;
    for (let k = 0; k < N; k++) { const t = 120 + r() * 30 | 0; g.fillStyle = `rgb(${t + 36},${t},${t - 34})`; g.fillRect(k * W / N, 0, W / N + 1, H); }
    g.strokeStyle = 'rgba(70,45,25,0.25)'; g.lineWidth = 1;
    for (let k = 0; k < 160; k++) { const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 2, y + 10 + r() * 20); g.stroke(); }
    g.fillStyle = 'rgba(40,24,12,0.7)'; for (let k = 0; k < N; k++) g.fillRect(k * W / N, 0, 1.2, H);
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, side: THREE.DoubleSide }); MATS.set('duelas', m); return m;
  })();
  const tapaM = mat('#8f6440', { roughness: 0.8 });
  const AROM = mat('#3b3d40', { metalness: 0.55, roughness: 0.5 });
  // el perfil de una barrica (cerrada: barriga en medio) o en rosa (abierta por arriba como una flor)
  const H = 0.95, NP = 12;
  const perfil = (rosa) => Array.from({ length: NP + 1 }, (_, i) => {
    const t = i / NP, y = t * H, panza = 0.27 + 0.06 * Math.sin(Math.PI * t);
    return new THREE.Vector2(rosa ? (t < 0.45 ? panza : panza + (t - 0.45) ** 1.6 * 0.42) : panza, y);
  });
  const barrica = (rosa) => new THREE.LatheGeometry(perfil(rosa), 28);
  const aro = (r, y) => { const g = new THREE.TorusGeometry(r + 0.008, 0.012, 5, 30); g.rotateX(Math.PI / 2); g.translate(0, y, 0); return g; };
  const radio = (rosa, t) => perfil(rosa)[Math.round(t * NP)].x;
  // una barrica acabada, en pie o tumbada (dentro de un grupo o fija en la obra)
  const acabada = (x, y, z, o = {}) => {
    const geos = [barrica(false), ...[0.06, 0.26, 0.74, 0.94].map(t => aro(radio(false, t), t * H))];
    const tapa = new THREE.CircleGeometry(0.265, 24); tapa.rotateX(-Math.PI / 2); tapa.translate(0, H - 0.02, 0);
    const fondo = new THREE.CircleGeometry(0.265, 24); fondo.rotateX(Math.PI / 2); fondo.translate(0, 0.02, 0);
    const yy = y + O.gy(x, z);
    for (const [g, M] of [...geos.slice(1).map(g => [g, AROM]), [geos[0], duelas], [tapa, tapaM], [fondo, tapaM]]) { if (o.rz) g.rotateZ(o.rz); g.translate(x, yy, z); O.put(g, M, 0, 0, 0, { abs: true }); }
  };

  // las duelas: apiladas en castillo (capas cruzadas) a la izquierda y unas cuantas de pie contra el muro
  const DX = -2.85, DZ = -1.55;
  for (let f = 0; f < 26; f++) for (let k = 0; k < 6; k++) {
    const a = f % 2 === 0, off = (k - 2.5) * 0.15;
    O.box(a ? 0.92 : 0.07, 0.024, a ? 0.07 : 0.92, (k + f) % 3 ? '#a8784b' : '#93653d', DX + (a ? 0 : off), 0.013 + f * 0.038, DZ + (a ? off : 0));
  }
  O.colBox(DX, DZ, 1.05, 1.05);
  for (let k = 0; k < 9; k++) O.box(0.09, 0.95, 0.025, k % 2 ? '#a8784b' : '#96683f', -2.2 + k * 0.11, 0.47, zm + 0.36, { rx: -0.16, rz: (k - 4) * 0.012 });
  // los aros de hierro, colgados del muro en sus clavijas
  const RX = 1.25, RY = 1.55, RZ = zm + 0.3;
  O.box(2.3, 0.85, 0.04, '#a87b52', RX + 0.02, RY - 0.25, RZ - 0.005, { abs: true });
  O.box(2.42, 0.07, 0.06, MADERA, RX + 0.02, RY + 0.17, RZ + 0.005, { abs: true });
  for (let k = 0; k < 4; k++) { const r = 0.24 + k * 0.025, x = RX - 0.75 + k * 0.5;
    const g = new THREE.TorusGeometry(r, 0.012, 5, 30); O.put(g, AROM, x, RY - r + 0.05, RZ + 0.04, { abs: true });
    O.cyl(0.016, 0.016, 0.1, 6, MADERA, x, RY + 0.05, RZ + 0.05, { abs: true, rx: Math.PI / 2 }); }

  // el fuego: el brasero de hierro con las brasas y, encima, una barrica en rosa calentándose
  const FX = -1.25, FZ = -0.85;
  O.put(new THREE.CylinderGeometry(0.2, 0.17, 0.26, 12, 1, true), mat('#2a2a2c', { side: THREE.DoubleSide, metalness: 0.4, roughness: 0.6 }), FX, 0.13, FZ);
  const fuego = new THREE.MeshStandardMaterial({ color: '#2a1208', emissive: new THREE.Color('#ff6a1a'), emissiveIntensity: 1.2, roughness: 1 });
  { const geos = [], r = rnd0(91); for (let k = 0; k < 14; k++) { const g = new THREE.DodecahedronGeometry(0.04 + r() * 0.03, 0); g.translate((r() - 0.5) * 0.26, 0.24 + r() * 0.05, (r() - 0.5) * 0.26); geos.push(g); }
    const brasas = new THREE.Mesh(mergeGeometries(geos), fuego); O.suelta(brasas, FX, 0, FZ); brasas.castShadow = false; }
  const YR = 0.46;   // (la rosa, en alto sobre su trípode, para que se vean las llamas)
  { const g = barrica(true); g.translate(0, YR, 0); O.put(g, duelas, FX, 0, FZ);
    for (const t of [0.06, 0.26]) O.put(aro(radio(true, t), YR + t * H), AROM, FX, 0, FZ);
    for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.4; O.cyl(0.012, 0.012, YR + 0.02, 5, HIERRO, FX + Math.cos(a) * 0.3, (YR + 0.02) / 2, FZ + Math.sin(a) * 0.3, { m: HIERRO_O }); } }
  const llamas = [];
  for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.05 + (k % 3) * 0.012, 0.26, 6), new THREE.MeshBasicMaterial({ color: k % 2 ? '#ffb347' : '#ff7a1f', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    const a = k * 1.05; O.suelta(m, FX + Math.cos(a) * 0.08, 0.36, FZ + Math.sin(a) * 0.08); m.castShadow = false; m.userData.f = k * 1.7; llamas.push(m); }
  O.col(FX, FZ, 0.45);

  // la barrica del trabajo: en rosa al empezar; con el aro, se cierra
  const BX = 0.85, BZ = 0.05;
  const gA = barrica(true), gB = barrica(false), pA = gA.attributes.position.array.slice(), pB = gB.attributes.position.array;
  const trabajo = new THREE.Mesh(gA, duelas); O.suelta(trabajo, BX, 0, BZ);
  for (const t of [0.06, 0.26]) { const m = new THREE.Mesh(aro(radio(false, t), t * H), AROM); trabajo.add(m); }
  // (el aro de arriba: al empezar, holgado y alto, donde la rosa ya es ancha; al cerrar, baja a su sitio)
  const Y0 = H * 10 / NP, S0 = radio(true, 10 / NP) / radio(false, 0.74);
  const aroAlto = new THREE.Mesh(aro(radio(false, 0.74), 0), AROM); aroAlto.position.y = Y0; aroAlto.scale.set(S0, 1, S0); trabajo.add(aroAlto);
  O.col(BX, BZ, 0.45);
  // el mazo y el asentador, en el tajo de al lado
  O.cyl(0.2, 0.22, 0.5, 12, '#7a5636', BX + 0.75, 0.25, BZ - 0.3); O.cyl(0.19, 0.19, 0.012, 12, '#a07a52', BX + 0.75, 0.505, BZ - 0.3);
  O.box(0.16, 0.08, 0.08, '#6a4a30', BX + 0.7, 0.55, BZ - 0.3);
  O.cyl(0.016, 0.018, 0.32, 7, '#b48a5c', BX + 0.7, 0.55, BZ - 0.12, { rx: Math.PI / 2 });
  O.box(0.04, 0.03, 0.2, '#70767d', BX + 0.86, 0.525, BZ - 0.32, { m: HIERRO_O });   // (el asentador de los aros)
  O.col(BX + 0.75, BZ - 0.3, 0.25);
  // las virutas
  { const r = rnd0(17); for (let k = 0; k < 40; k++) { const a = r() * Math.PI * 2, d = 0.5 + r() * 0.9, x = BX - 0.4 + Math.cos(a) * d, z = BZ + Math.sin(a) * d * 0.7;
    const g = new THREE.TorusGeometry(0.03 + r() * 0.02, 0.006, 3, 8, Math.PI * (1 + r())); O.put(g, r() > 0.5 ? '#d9b583' : '#c9a06e', x, 0.045, z, { rx: Math.PI / 2 + (r() - 0.5), ry: r() * 6 }); } }

  // las barricas acabadas, tumbadas en su pirámide sobre calzos
  const SX = 2.6, SZ = 0.95;
  for (const dx of [-0.3, 0.3]) O.box(0.09, 0.07, 1.35, MADERA, SX + dx, 0.035, SZ);
  for (const dz of [-0.34, 0.34]) acabada(SX + H / 2, 0.4, SZ + dz, { rz: Math.PI / 2 });
  acabada(SX + H / 2, 0.4 + 0.57, SZ, { rz: Math.PI / 2 });
  O.colBox(SX, SZ, 1.05, 1.4);
  // y una de pie, junto al muro, con su tapa
  acabada(2.75, 0, -2.25);
  O.col(2.75, -2.25, 0.4);

  // lo que se mueve: el fuego, el humo, y la barrica que se cierra con el aro
  let cierra = 0;
  T.anima = (dt, t) => {
    fuego.emissiveIntensity = 1.0 + 0.35 * Math.sin(t * 7) * Math.sin(t * 3.3);
    for (const m of llamas) { const s = 0.75 + 0.35 * Math.abs(Math.sin(t * 9 + m.userData.f)) * (0.7 + 0.3 * Math.sin(t * 3.1 + m.userData.f)); m.scale.set(1, s, 1); m.position.y = O.gy(FX, FZ) + 0.26 + 0.13 * s; }
    if ((T.humoT = (T.humoT || 0) - dt) <= 0) { T.humoT = 0.5 + Math.random() * 0.4; T.fx?.humo?.(FX, YR + H + 0.1, FZ); if (Math.random() < 0.5) T.fx?.chispa?.(FX + (Math.random() - 0.5) * 0.2, 0.35, FZ); }
    if (T.cerrada && cierra < 1) {
      cierra = Math.min(1, cierra + dt * 0.8); const e = cierra * cierra * (3 - 2 * cierra), p = gA.attributes.position;
      for (let i = 0; i < p.array.length; i++) p.array[i] = pA[i] + (pB[i] - pA[i]) * e;
      p.needsUpdate = true; gA.computeVertexNormals();
      aroAlto.position.y = Y0 + (H * 0.74 - Y0) * e; const sc = S0 + (1 - S0) * e; aroAlto.scale.set(sc, 1, sc);
    }
  };
  T.efecto = (paso, fx) => {
    if (paso === 'proceso') fx.humo?.(FX, YR + H + 0.1, FZ);
    if (paso === 'barrica') { T.cerrada = true; fx.chispas?.(BX, H * 0.78, BZ + 0.25); }
  };
  return {
    taller: { foco: [-0.2, 0.85, -0.9], cam: [1.7, 3.1, 8.6] },
    aprendiz: { de: [-2.4, 2.3] },
    maestro: { de: [BX + 0.1, BZ - 0.75] },
    duelas: { foco: [DX + 0.15, 0.55, DZ - 0.1], cam: [DX - 0.15, 1.55, DZ + 1.75] },
    aros: { foco: [RX, RY - 0.2, RZ], abs: true, cam: [RX + 0.2, 1.55, RZ + 1.9] },
    fuego: { foco: [FX, 0.6, FZ], cam: [FX + 1.15, 1.25, FZ + 1.5], de: [FX - 0.75, FZ - 0.45] },
    proceso: { foco: [-0.4, 0.6, -0.6], cam: [0.6, 2.0, 3.0] },
    barrica: { foco: [BX, 0.7, BZ], cam: [BX + 0.9, 1.45, BZ + 1.6], de: [BX + 0.1, BZ - 0.75] },
  };
}

// La cestería de Elizondo: los haces de varas de castaño y avellano contra el muro, la tina con las varas a remojo para
// que se ablanden, el tajo con el cuchillo abriendo una vara en tiras, las tiras colgadas a secar en su vara, la cesta del
// trabajo en el suelo (el fondo y las costillas; al tejer, sube vuelta a vuelta hasta el borde), el mazo, el taburete, y las
// cestas acabadas: el otarre con sus asas, el saski alto y una xistera de pelota colgada en el muro. Mismo cobertizo.
function cesteria(O, T) {
  const { zm } = cobertizo(O);
  // el tejido de la cesta: tiras que pasan por encima y por debajo (un damero alargado con su sombra)
  const mimbre = (() => {
    if (MATS.has('mimbre')) return MATS.get('mimbre');
    const W = 128, H = 64, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = '#7a5a36'; g.fillRect(0, 0, W, H);
    const fx = 8, fy = 6;
    for (let j = 0; j < fy; j++) for (let i = 0; i < fx; i++) {
      const x = i * W / fx, y = j * H / fy, w = W / fx, h = H / fy, arriba = (i + j) % 2 === 0;
      const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, arriba ? '#d9b27a' : '#b48a56'); gr.addColorStop(0.5, arriba ? '#e6c48e' : '#c49a64'); gr.addColorStop(1, arriba ? '#b88c58' : '#9a7244');
      g.fillStyle = gr; g.fillRect(x + 0.5, y + 0.8, w - 1, h - 1.6);
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.DoubleSide }); MATS.set('mimbre', m); return m;
  })();
  const VARA = '#8a6a48', VARA2 = '#a07c52', TIRA = '#d4b07a';
  // una cesta redonda (lathe) con su borde; r0 abajo, r1 arriba, h alto, rep: cuántas veces se repite el tejido alrededor
  const cesta = (r0, r1, h, rep = 6) => {
    const pts = [new THREE.Vector2(0.001, 0), new THREE.Vector2(r0, 0)]; for (let k = 1; k <= 6; k++) { const t = k / 6; pts.push(new THREE.Vector2(r0 + (r1 - r0) * t + Math.sin(Math.PI * t) * 0.015, h * t)); }
    const g = new THREE.LatheGeometry(pts, 26); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * rep, uv.getY(i) * h / 0.12); return g;
  };
  const borde = (r, y) => { const g = new THREE.TorusGeometry(r, 0.018, 6, 30); g.rotateX(Math.PI / 2); g.translate(0, y, 0); return g; };

  // los haces de varas, de pie contra el muro de la izquierda, atados con su mimbre
  for (const [x, n] of [[-3.25, 30], [-2.75, 26], [-2.3, 22]]) {
    const r = rnd0(n);
    for (let k = 0; k < n; k++) { const a = r() * Math.PI * 2, d = r() * 0.13, h = 1.6 + r() * 0.5; O.cyl(0.012, 0.014, h, 4, k % 3 ? VARA : VARA2, x + Math.cos(a) * d, h / 2, zm + 0.42 + Math.sin(a) * d * 0.7, { rx: -0.08 + (r() - 0.5) * 0.06, rz: (r() - 0.5) * 0.08 }); }
    O.put(borde(0.15, 0), '#5a4028', x, 0.6, zm + 0.42); O.put(borde(0.15, 0), '#5a4028', x, 1.2, zm + 0.4);
  }
  O.colBox(-2.8, zm + 0.45, 1.5, 0.45);
  // la tina de remojo: media cuba de madera con agua y varas dentro
  const WX = -2.55, WZ = -0.9;
  O.cyl(0.42, 0.36, 0.5, 18, '#7a5636', WX, 0.25, WZ); O.cyl(0.39, 0.39, 0.01, 18, mat('#4f6e78', { roughness: 0.15, metalness: 0.1 }), WX, 0.44, WZ);
  for (const y of [0.08, 0.42]) O.put(borde(0.395 + y * 0.12, 0), '#3b3d40', WX, y, WZ, { m: HIERRO_O });
  { const r = rnd0(5); for (let k = 0; k < 9; k++) O.cyl(0.011, 0.011, 1.3, 4, VARA, WX + (r() - 0.5) * 0.4, 0.75, WZ + (r() - 0.5) * 0.3, { rz: 0.9 + r() * 0.3, ry: r() * 0.6 }); }
  O.col(WX, WZ, 0.45);
  // el tajo con el cuchillo abriendo una vara, y las tiras ya abiertas al lado
  const KX = -1.1, KZ = 0.15;
  O.cyl(0.2, 0.23, 0.55, 12, '#6e4e32', KX, 0.275, KZ); O.cyl(0.19, 0.19, 0.012, 12, '#a07a52', KX, 0.556, KZ);
  O.cyl(0.012, 0.012, 1.0, 4, VARA2, KX + 0.05, 0.6, KZ, { rz: Math.PI / 2 - 0.12 });
  O.box(0.16, 0.035, 0.006, '#9aa0a6', KX - 0.02, 0.625, KZ + 0.01, { rz: -0.12, m: HIERRO_O });   // (la hoja)
  O.cyl(0.016, 0.016, 0.11, 7, '#4a3020', KX - 0.15, 0.645, KZ + 0.01, { rz: Math.PI / 2 - 0.12 });   // (el mango)
  for (let k = 0; k < 5; k++) O.box(0.9, 0.004, 0.018, TIRA, KX + 0.05, 0.565 + k * 0.004, KZ - 0.08 + k * 0.03, { ry: (k - 2) * 0.05 });
  O.col(KX, KZ, 0.25);
  // las tiras colgadas a secar de una vara entre dos clavijas
  const SX = -0.95, SY = 1.75, SZ = zm + 0.36;
  O.cyl(0.015, 0.015, 1.3, 6, VARA, SX, SY, SZ, { abs: true, rz: Math.PI / 2 });
  for (const s of [-1, 1]) O.cyl(0.012, 0.012, 0.12, 6, MADERA, SX + s * 0.62, SY, SZ - 0.06, { abs: true, rx: Math.PI / 2 });
  { const r = rnd0(12); for (let k = 0; k < 22; k++) { const x = SX - 0.55 + k * 0.052, h = 0.6 + r() * 0.35; O.box(0.016, h, 0.003, k % 2 ? TIRA : '#c9a36c', x, SY - h / 2 + 0.01, SZ + 0.015, { abs: true, rz: (r() - 0.5) * 0.04 }); } }

  // la cesta del trabajo, en el suelo: el fondo y las costillas ya puestos; el tejido sube vuelta a vuelta
  const CX = 0.75, CZ = 0.15, CH = 0.42, CR0 = 0.24, CR1 = 0.32, NV = 8;
  const trabajo = new THREE.Group(); O.suelta(trabajo, CX, 0, CZ);
  const vueltas = [];
  for (let k = 0; k < NV; k++) {
    const y0 = k * CH / NV, y1 = (k + 1) * CH / NV, ra = CR0 + (CR1 - CR0) * y0 / CH, rb = CR0 + (CR1 - CR0) * y1 / CH;
    const g = new THREE.LatheGeometry([new THREE.Vector2(ra, y0), new THREE.Vector2(rb, y1)], 26); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 7, (uv.getY(i) + k) * 0.5);
    const m = new THREE.Mesh(g, mimbre); m.visible = k < 2; trabajo.add(m); vueltas.push(m);
  }
  { const fondo = new THREE.Mesh(new THREE.CircleGeometry(CR0, 26), mimbre); fondo.rotation.x = -Math.PI / 2; fondo.position.y = 0.005; trabajo.add(fondo); }
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, c = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.007, CH + 0.12, 4), mat(VARA2)); const r = (CR0 + CR1) / 2 + 0.004; c.position.set(Math.cos(a) * r, (CH + 0.12) / 2, Math.sin(a) * r); c.rotation.z = -Math.cos(a) * 0.19; c.rotation.x = Math.sin(a) * 0.19; trabajo.add(c); }
  const remate = new THREE.Mesh(borde(CR1 + 0.004, CH), mat('#c49a64')); remate.visible = false; trabajo.add(remate);
  O.col(CX, CZ, 0.4);
  // el taburete del cestero y el mazo de apretar
  O.cyl(0.17, 0.17, 0.05, 12, MADERA2, CX - 0.05, 0.38, CZ - 0.62); for (let k = 0; k < 3; k++) { const a = k * 2.1; O.cyl(0.018, 0.02, 0.37, 5, MADERA, CX - 0.05 + Math.cos(a) * 0.11, 0.18, CZ - 0.62 + Math.sin(a) * 0.11, { rz: Math.cos(a) * 0.12, rx: -Math.sin(a) * 0.12 }); }
  O.box(0.17, 0.1, 0.1, '#8a6040', CX + 0.55, 0.05, CZ + 0.25, { ry: 0.4 }); O.cyl(0.018, 0.02, 0.34, 7, '#b48a5c', CX + 0.62, 0.05, CZ + 0.42, { rx: Math.PI / 2, ry: 0.4 });
  // las cestas acabadas: el otarre con sus asas, el saski alto, y la xistera colgada en el muro
  const AX = 2.55, AZ = 0.85;
  O.put(cesta(0.26, 0.36, 0.3, 7), mimbre, AX - 0.35, 0, AZ); O.put(borde(0.365, 0.3), '#b48a56', AX - 0.35, 0, AZ);
  for (const s of [-1, 1]) { const a = new THREE.TorusGeometry(0.1, 0.014, 5, 12, Math.PI); O.put(a, '#b48a56', AX - 0.35 + s * 0.36, 0.3, AZ, { ry: Math.PI / 2 }); }
  O.put(cesta(0.17, 0.22, 0.55, 5), mimbre, AX + 0.45, 0, AZ - 0.15); O.put(borde(0.225, 0.55), '#b48a56', AX + 0.45, 0, AZ - 0.15);
  O.put(cesta(0.12, 0.16, 0.22, 4), mimbre, AX + 0.3, 0, AZ + 0.4); O.put(borde(0.165, 0.22), '#b48a56', AX + 0.3, 0, AZ + 0.4);
  O.colBox(AX, AZ, 1.4, 1.0);
  const XX = 1.9, XY = 1.45, XZ = zm + 0.33;
  { // (la xistera: la cesta larga y curva de la pelota, con su guante de cuero, colgada de una clavija)
    const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(new THREE.Vector2(0.03 + Math.sin(Math.PI * Math.min(1, t * 1.15)) * 0.085, t * 0.62)); }
    const g = new THREE.LatheGeometry(pts, 14, -Math.PI / 2, Math.PI); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 5);
    g.scale(1, 1, 0.45); O.put(g, mimbre, XX, XY - 0.55, XZ + 0.03, { abs: true, rz: 0.12 });
    O.box(0.11, 0.14, 0.07, '#6a4024', XX - 0.06, XY - 0.58, XZ + 0.05, { abs: true, rz: 0.12 });
    O.cyl(0.012, 0.012, 0.08, 6, MADERA, XX + 0.02, XY + 0.1, XZ, { abs: true, rx: Math.PI / 2 });
  }

  // lo que se mueve: la cesta, que sube vuelta a vuelta al tejer
  let tejido = 2;
  T.anima = (dt) => {
    if (T.tejer && tejido < NV + 1) { tejido = Math.min(NV + 1, tejido + dt * 3.2); vueltas.forEach((v, k) => { v.visible = k < Math.floor(tejido); }); remate.visible = tejido >= NV + 1; }
  };
  T.efecto = (paso, fx) => {
    if (paso === 'proceso') fx.vapor?.(WX, 0.55, WZ);
    if (paso === 'cesta') { T.tejer = true; fx.harina?.(CX, CH * 0.6, CZ + 0.2); }
  };
  return {
    taller: { foco: [-0.2, 0.85, -0.9], cam: [1.7, 3.1, 8.6] },
    aprendiz: { de: [-2.4, 2.3] },
    maestro: { de: [CX - 0.05, CZ - 0.75] },
    cuchillo: { foco: [KX - 0.05, 0.6, KZ], cam: [KX + 0.75, 1.3, KZ + 1.05], de: [KX - 0.1, KZ - 0.7] },
    tiras: { foco: [SX, SY - 0.35, SZ], abs: true, cam: [SX + 0.35, 1.55, SZ + 1.9] },
    mazo: { foco: [CX + 0.55, 0.15, CZ + 0.3], cam: [CX + 1.05, 1.0, CZ + 1.05] },
    proceso: { foco: [-0.9, 0.5, -0.4], cam: [0.3, 1.9, 2.6] },
    cesta: { foco: [CX, 0.35, CZ], cam: [CX + 0.8, 1.35, CZ + 1.4], de: [CX - 0.05, CZ - 0.75] },
  };
}

// Lo que tiene cada oficio con taller: cómo se monta, su tamaño (de -w/2 a w/2 y de z0 a z1) y en qué puesto se explica
// cada herramienta y cada paso (en el orden de data/oficios.js). Los demás oficios siguen con su banco de siempre.
// vista: el pasillo (x0, x1, z0, z1) que tiene que estar libre para el plano del taller entero, delante
export const TALLERES = {
  herrero: { monta: herreria, w: 8.4, z0: -3.5, z1: 3.6, vista: [-0.6, 3.8, 3.6, 9.4], herramientas: ['fragua', 'fuelle', 'yunque', 'martillo', 'tenazas'], pasos: ['tenazas', 'fragua', 'pila'], lamina: { intro: 0, herramientas: [1, 2, 4, 4, 3], pasos: [3, 2, 5] } },
  panadero: { monta: hornoPan, w: 8.4, z0: -3.5, z1: 3.6, vista: [-0.6, 3.8, 3.6, 9.4], herramientas: ['artesa', 'levadura', 'horno', 'pala'], pasos: ['artesa', 'artesa', 'horno'], lamina: { intro: 2, herramientas: [0, 1, 2, 4], pasos: [0, 1, 4] } },
  cantero: { monta: canteria, w: 8.4, z0: -3.5, z1: 3.6, vista: [-0.6, 3.8, 3.6, 9.4], herramientas: ['escuadra', 'cincel', 'maza', 'pico'], pasos: ['bloques', 'banco', 'banco', 'marca'], lamina: { intro: 5, herramientas: [3, 2, 2, 1], pasos: [0, 1, 2, 4] } },
  tonelero: { monta: toneleria, w: 8.4, z0: -3.5, z1: 3.6, vista: [-0.6, 3.8, 3.6, 9.4], herramientas: ['duelas', 'aros', 'fuego'], pasos: ['proceso', 'barrica'], lamina: { intro: 0, herramientas: [1, 3, 2], pasos: [1, 3] } },
  cestero: { monta: cesteria, w: 8.4, z0: -3.5, z1: 3.6, vista: [-0.6, 3.8, 3.6, 9.4], herramientas: ['cuchillo', 'tiras', 'mazo'], pasos: ['proceso', 'cesta'], lamina: { intro: 0, herramientas: [2, 3, 4], pasos: [0, 4] } },
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
  T.herramientas = D.herramientas; T.pasos = D.pasos; T.lamina = D.lamina || null;
  // el aro que señala en el suelo el puesto del que se habla
  const aro = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 40), new THREE.MeshBasicMaterial({ color: '#ffd75a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  aro.rotation.x = -Math.PI / 2; aro.visible = false; aro.renderOrder = 2;
  T.aro = aro;   // (va en la escena, no en el grupo: se coloca en coordenadas del mundo)
  const fx = {
    harina: (lx, ly, lz) => particles?.emit(T.mundo(lx, ly + O.gy(lx, lz), lz), { n: 18, color: ['#ffffff', '#f3ead8'], speed: 0.9, size: 0.22, life: 0.9, gravity: 0.6, spread: 0.3, drag: 1.5 }),
    chispa: (lx, ly, lz) => particles?.emit(T.mundo(lx, ly + O.gy(lx, lz), lz), { n: 1, color: ['#ffb34a', '#ffe38a'], speed: 0.5, size: 0.07, life: 1.1, gravity: -0.8, spread: 0.05 }),
    chispas: (lx, ly, lz) => particles?.emit(T.mundo(lx, ly + O.gy(lx, lz), lz), { n: 26, color: ['#ffd27a', '#ff8a2a', '#fff2c0'], speed: 3.2, size: 0.12, life: 0.7, gravity: 6, spread: 0.1 }),
    polvo: (lx, ly, lz) => particles?.emit(T.mundo(lx, ly + O.gy(lx, lz), lz), { n: 22, color: ['#efe7d6', '#d6cab0', '#c2b597'], speed: 1.3, size: 0.2, life: 1.0, gravity: 1.2, spread: 0.25, drag: 1.6 }),
    humo: (lx, ly, lz) => particles?.emit(T.mundo(lx, ly + O.gy(lx, lz), lz), { n: 3, color: ['#3c3834', '#4a4541', '#35312e'], speed: 0.25, size: 0.42, life: 2.2, gravity: -0.5, spread: 0.16, drag: 0.8 }),   // (oscuro: las partículas suman luz)
    lascas: (lx, ly, lz) => particles?.emit(T.mundo(lx, ly + O.gy(lx, lz), lz), { n: 12, color: ['#d8ccb2', '#b9aa8b'], speed: 2.8, size: 0.07, life: 0.7, gravity: 8, spread: 0.12 }),
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
  // un paso hecho (r: lo que devolvió su minijuego, p. ej. la marca elegida); T.hecho cuenta los que ya se ven en el taller
  T.hecho = 0;
  T.paso = (id, r) => { T.hecho++; T.efecto?.(id, fx, r); };
  return T;
}
