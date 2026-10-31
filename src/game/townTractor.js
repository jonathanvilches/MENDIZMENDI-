// Cosechas de verdad, con tractor o con cosechadora, para dar su valor a quien trabaja el campo. Antes cada cosecha era
// recoger ocho brillos andando, o pasar con el tractor por unas cajas sueltas: muy corto y sin sentido. Ahora:
// · el trigo se siega con la cosechadora en un campo de trigo de verdad, pasada a pasada; cuando la tolva se llena se
//   descarga en el remolque del tractor, que espera en la linde; segado el campo, se lleva el grano con el tractor a la
//   cooperativa, siguiendo las flechas del camino, y se pesa en la báscula;
// · la huerta, la viña, el olivar y los frutales: los temporeros cogen a mano y van dejando las cajas llenas en los
//   surcos; con el tractor se recogen despacio (deprisa se caen) y se llevan a la conservera, la bodega, la almazara,
//   la sidrería o el almacén, también por el camino y a la báscula.
// Quien encargó la cosecha espera en el destino y, pesada la carga, se habla con él. La conducción, en conducir.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Vehiculo } from './conducir.js';
import { Actor } from '../actors/people.js';
import { CROP } from '../data/campo.js';
import { PLACES, PATHS, fieldInfo, riverInfo } from '../world/layout.js';
import { terrainHeight } from '../world/heightfield.js';
import { isFree, addBox, addCircle } from '../world/colliders.js';
import { findPath } from '../world/nav.js';
import { paintedPart as part } from '../world/builder.js';

// cada cosecha: cómo se hace (cosechadora o temporeros), en qué campos (tipos de fieldInfo), adónde se lleva, el color
// de lo que va en las cajas y lo que cuenta quien la encarga
const RECETAS = {
  trigo: { modo: 'cosechadora', campos: [2], destino: 'cooperativa', explica: 'En julio, con la espiga seca y dorada, se siega con la cosechadora: corta, trilla y guarda el grano en la tolva. Cuando se llena, se descarga en el remolque del tractor, que espera en la linde.' },
  piquillo: { campos: [7, 3], destino: 'conservera', color: '#c8221c', explica: 'El pimiento del piquillo se coge a mano, uno a uno, entre septiembre y noviembre. Los temporeros van dejando las cajas en los surcos; tú las recoges con el tractor y las llevas a la conservera, donde se asan a la llama.' },
  tomate: { campos: [7, 3], destino: 'conservera', color: '#d8352a', explica: 'Los temporeros cogen los tomates maduros y llenan las cajas. Recógelas con el tractor, despacio para que no se caigan, y llévalas a la conservera.' },
  esparrago: { campos: [7, 3], destino: 'conservera', color: '#ece6c8', explica: 'El espárrago blanco se corta al amanecer, antes de que asome y le dé el sol. Recoge las cajas con el tractor y llévalas a la conservera enseguida, que se estropea.' },
  alcachofa: { campos: [7, 3], destino: 'conservera', color: '#6f9a4a', explica: 'La alcachofa de Tudela se corta a mano con un cuchillo. Recoge las cajas de los temporeros y llévalas a la conservera.' },
  cardo: { campos: [7, 3], destino: 'conservera', color: '#b9c9a8', explica: 'El cardo se ata y se tapa para que blanquee; ahora se corta. Recoge las cajas y llévalas a la conservera.' },
  pocha: { campos: [7, 3], destino: 'conservera', color: '#efe6c8', explica: 'Las vainas de pocha se cogen tiernas, en septiembre. Recoge las cajas con el tractor y llévalas a la conservera.' },
  patata: { campos: [3, 7], destino: 'almacen', color: '#a8794a', explica: 'La patata de siembra se saca de la tierra y se mete en cajas. Recógelas con el tractor y llévalas al almacén.' },
  uva: { campos: [5], destino: 'bodega', color: '#4a1f4a', explica: 'En la vendimia los temporeros cortan los racimos con tijera y llenan las cajas. Recógelas con el tractor y llévalas a la bodega, donde se pesan y se mide su azúcar.' },
  olivo: { campos: [6], destino: 'almazara', color: '#3f4a22', saco: true, explica: 'Las aceitunas se varean sobre redes y se meten en sacos. Recoge los sacos con el tractor y llévalos a la almazara: allí se hace el aceite.' },
  almendra: { campos: [6, 8], destino: 'cooperativa', color: '#b88a5a', saco: true, explica: 'Las almendras se varean y se recogen en sacos. Recógelos con el tractor y llévalos a la cooperativa.' },
  manzana: { campos: [8, 0], destino: 'sidreria', color: '#c83a2a', explica: 'Las manzanas de sidra se recogen del suelo y se meten en cajas. Recógelas con el tractor y llévalas a la sidrería.' },
};
const DESTINOS = {
  cooperativa: { nombre: 'la cooperativa', cartel: 'COOPERATIVA', props: 'silos' },
  conservera: { nombre: 'la conservera', cartel: 'CONSERVERA', props: 'palets' },
  bodega: { nombre: 'la bodega', cartel: 'BODEGA', props: 'barricas' },
  almazara: { nombre: 'la almazara', cartel: 'ALMAZARA', props: 'tinajas' },
  sidreria: { nombre: 'la sidrería', cartel: 'SAGARDOTEGIA', props: 'barricas' },
  almacen: { nombre: 'el almacén', cartel: 'ALMACÉN', props: 'palets' },
};
const TEMPOREROS = [{ shirt: '#d9a03a', pants: '#4a5b3a', hat: 'straw' }, { shirt: '#3f6aa8', pants: '#3a3a42', hat: 'straw', female: true, ponytail: true, hair: '#2a1a12' },
  { shirt: '#b8442e', pants: '#5a4a3a', hat: 'straw' }, { shirt: '#6a8a4a', pants: '#3a3a42', female: true, bun: true, hair: '#4a2a1a' }];
const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
const ANILLO = new THREE.RingGeometry(1.15, 1.4, 32).rotateX(-Math.PI / 2);
// las plazas de las cajas en el remolque (en el tractor, que mira a +z: el remolque va detrás, en z = −3,9)
const PLAZAS = [];
for (let capa = 0; capa < 2; capa++) for (const z of [-1.15, -0.4, 0.35, 1.1]) for (const x of [-0.45, 0.45]) PLAZAS.push([x, 1.22 + capa * 0.44, -3.9 + z]);
const RAPIDO = 3.5;   // (m/s: más deprisa, las cajas no se pueden cargar)

// una caja de madera con su cosecha encima, o un saco
function caja(color, saco) {
  if (saco) { const m = new THREE.Mesh(mergeGeometries([part(new THREE.CylinderGeometry(0.28, 0.32, 0.6, 10), '#a88a5a', 0, 0.3, 0), part(new THREE.CylinderGeometry(0.18, 0.28, 0.12, 10), '#9a7c4e', 0, 0.66, 0), part(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 6), '#6a5434', 0, 0.75, 0)]), MAT); m.castShadow = true; return m; }
  const P = [part(new THREE.BoxGeometry(0.8, 0.06, 0.55), '#8a5a32', 0, 0.03, 0)];
  for (const s of [-1, 1]) { P.push(part(new THREE.BoxGeometry(0.8, 0.34, 0.05), '#b07a45', 0, 0.2, s * 0.25)); P.push(part(new THREE.BoxGeometry(0.05, 0.34, 0.55), '#a06c3a', s * 0.38, 0.2, 0)); }
  for (let i = 0; i < 8; i++) P.push(part(new THREE.IcosahedronGeometry(0.1, 0), color, -0.27 + (i % 4) * 0.18, 0.38 + (i % 2) * 0.03, i < 4 ? -0.1 : 0.1));
  const m = new THREE.Mesh(mergeGeometries(P), MAT); m.castShadow = true; return m;
}
// el trigo en pie: un bloque de espigas de 5 × 5 m (dibujadas en su textura), uno por casilla del campo
let TRIGO = null;
function trigoGeo() {
  if (TRIGO) return TRIGO;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#b8913a'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) { const px = Math.random() * 128; x.strokeStyle = Math.random() < 0.5 ? '#d9b75a' : '#9c7a2e'; x.lineWidth = 1 + Math.random(); x.beginPath(); x.moveTo(px, 128); x.lineTo(px + (Math.random() - 0.5) * 6, 18 + Math.random() * 20); x.stroke(); }
  for (let i = 0; i < 180; i++) { x.fillStyle = Math.random() < 0.5 ? '#e8cc72' : '#c9a24a'; x.beginPath(); x.ellipse(Math.random() * 128, Math.random() * 40, 1.6, 4, 0, 0, Math.PI * 2); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const g = new THREE.BoxGeometry(5, 1, 5); g.translate(0, 0.5, 0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i));
  return (TRIGO = { g, m: new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }) });
}
// las matas de la huerta, en hileras: hojas y algún fruto del color de la cosecha
function mataGeo(color) {
  return mergeGeometries([part(new THREE.IcosahedronGeometry(0.32, 0), '#4f7a2e', 0, 0.26, 0), part(new THREE.IcosahedronGeometry(0.24, 0), '#5f8f36', 0.18, 0.34, 0.1), part(new THREE.IcosahedronGeometry(0.22, 0), '#466e28', -0.16, 0.3, -0.12),
    part(new THREE.IcosahedronGeometry(0.08, 0), color, 0.22, 0.22, 0.2), part(new THREE.IcosahedronGeometry(0.08, 0), color, -0.2, 0.2, 0.18), part(new THREE.IcosahedronGeometry(0.08, 0), color, 0.05, 0.4, -0.25)]);
}
// el edificio de destino, mirando a +z (al camino): nave con su tejado y su cartel, puerta grande, la báscula delante con
// su caseta y, según lo que se lleva, silos, palés, barricas o tinajas
function edificio(D) {
  const P = [], claro = '#e6dfcf', gris = '#8a9098', metal = '#c4c8cc';
  P.push(part(new THREE.BoxGeometry(16, 0.4, 10), '#a8a294', 0, 0.2, -6));
  P.push(part(new THREE.BoxGeometry(16, 5.6, 10), claro, 0, 3.2, -6));
  for (const s of [-1, 1]) P.push(part(new THREE.BoxGeometry(16.6, 0.22, 5.7), gris, 0, 6.85, -6 + s * 2.6, s * 0.3, 0, 0));
  P.push(part(new THREE.BoxGeometry(0.3, 1.6, 10), claro, -8.0, 6.4, -6)); P.push(part(new THREE.BoxGeometry(0.3, 1.6, 10), claro, 8.0, 6.4, -6));
  P.push(part(new THREE.BoxGeometry(5.2, 4.4, 0.12), '#6b7a86', -3, 2.4, -0.95));
  for (let i = 0; i < 8; i++) P.push(part(new THREE.BoxGeometry(5.2, 0.04, 0.14), '#5a6874', -3, 0.5 + i * 0.55, -0.92));
  for (let i = 0; i < 3; i++) P.push(part(new THREE.BoxGeometry(1.6, 0.8, 0.08), '#5a7a90', 2.5 + i * 2, 4.4, -0.96));
  // báscula: la plataforma de pesar, con su borde amarillo y negro, y la caseta del pesador
  P.push(part(new THREE.BoxGeometry(3.8, 0.16, 9.5), '#6e7378', 0, 0.08, 6));
  for (let i = 0; i < 10; i++) for (const s of [-1, 1]) P.push(part(new THREE.BoxGeometry(0.12, 0.17, 0.48), i % 2 ? '#1e1e20' : '#f2c230', s * 1.95, 0.09, 1.5 + i * 0.95));
  P.push(part(new THREE.BoxGeometry(2.4, 2.5, 2.4), '#d9d4c4', 4.2, 1.25, 3.2)); P.push(part(new THREE.BoxGeometry(2.6, 0.18, 2.6), gris, 4.2, 2.6, 3.2)); P.push(part(new THREE.BoxGeometry(0.06, 0.9, 1.4), '#5a7a90', 2.98, 1.6, 3.2));
  if (D.props === 'silos') for (let i = 0; i < 3; i++) { const x = -11 - i * 0.2, z = -2 - i * 4.6; P.push(part(new THREE.CylinderGeometry(2.1, 2.1, 10, 16), metal, x, 5, z)); P.push(part(new THREE.ConeGeometry(2.2, 1.6, 16), gris, x, 10.8, z)); for (let k = 0; k < 4; k++) P.push(part(new THREE.TorusGeometry(2.12, 0.04, 4, 20), '#9aa0a6', x, 1.5 + k * 2.4, z, Math.PI / 2)); }
  if (D.props === 'palets') for (let i = 0; i < 6; i++) { const x = -7 + (i % 3) * 1.4, z = 1.2 + Math.floor(i / 3) * 1.4; P.push(part(new THREE.BoxGeometry(1.2, 0.14, 1.2), '#b07a45', x, 0.07, z)); P.push(part(new THREE.BoxGeometry(1.1, 0.9, 1.1), i % 2 ? '#c8b89a' : '#d6c8aa', x, 0.6, z)); }
  if (D.props === 'barricas') for (let i = 0; i < 6; i++) { const x = -7 + (i % 3) * 1.3, z = 1 + Math.floor(i / 3) * 1.1; P.push(part(new THREE.CylinderGeometry(0.5, 0.5, 1.0, 12), '#7a4a26', x, 0.5, z, 0, 0, Math.PI / 2)); for (const d of [-0.32, 0.32]) P.push(part(new THREE.TorusGeometry(0.505, 0.03, 4, 14), '#3a3a3e', x + d, 0.5, z, 0, Math.PI / 2, 0)); }
  if (D.props === 'tinajas') for (let i = 0; i < 4; i++) { const x = -7.4 + i * 1.5; P.push(part(new THREE.SphereGeometry(0.6, 12, 8), '#b0663a', x, 0.7, 1.4)); P.push(part(new THREE.CylinderGeometry(0.3, 0.35, 0.3, 12), '#9a5630', x, 1.35, 1.4)); }
  const g = new THREE.Group(), m = new THREE.Mesh(mergeGeometries(P), MAT); m.castShadow = true; m.receiveShadow = true; g.add(m);
  // el cartel, encima de la puerta
  const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d');
  x.fillStyle = '#1f3a5a'; x.fillRect(0, 0, 512, 96); x.strokeStyle = '#f2c230'; x.lineWidth = 6; x.strokeRect(6, 6, 500, 84);
  x.fillStyle = '#ffffff'; x.font = '900 58px "MZ Display", "MZ Texto", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(D.cartel, 256, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.3), new THREE.MeshBasicMaterial({ map: t })); s.position.set(3.5, 5.4, -0.9); g.add(s);
  return g;
}
// la flecha del camino, pintada en el suelo
const FLECHA = (() => { const s = new THREE.Shape(); s.moveTo(-0.45, -1.1); s.lineTo(0.45, -1.1); s.lineTo(0.45, 0.2); s.lineTo(1.0, 0.2); s.lineTo(0, 1.25); s.lineTo(-1.0, 0.2); s.lineTo(-0.45, 0.2); s.closePath(); const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); g.scale(1, 1, -1); return g; })();
const FLECHA_MAT = new THREE.MeshBasicMaterial({ color: '#ffd34a', transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide });

export class PuebloTractor {
  /** ¿Esta cosecha va con vehículo? (todas las que tienen receta) */
  conVehiculo(m) { return RECETAS[m?.crop] ? (RECETAS[m.crop].modo === 'cosechadora' ? 'cosechadora' : 'tractor') : null; }
  recetaCosecha(m) { return RECETAS[m?.crop] || null; }
  destinoCosecha(m) { return DESTINOS[RECETAS[m?.crop]?.destino] || null; }
  /** Un campo del cultivo cerca de los campos del pueblo: su centro (lejos de las lindes) y el ángulo de sus hileras */
  // (se prefiere un campo grande, con el centro lejos de las lindes, aunque esté algo más lejos: en uno pequeño no cabía
  // la cosecha y la cosechadora no tenía qué segar)
  buscaCampo(tipos) {
    const c0 = PLACES.fields || PLACES.market || PLACES.plaza; let best = null, bd = 1e9;
    for (let z = -300; z <= 300; z += 8) for (let x = -300; x <= 300; x += 8) {
      const f = fieldInfo(x, z); if (f.mask < 0.9 || f.edge < 12 || !tipos.includes(f.type)) continue;
      const d = Math.hypot(x - c0.x, z - c0.z) - Math.min(f.edge, 30) * 6; if (d < bd && isFree(x, z, 6)) { bd = d; best = { x, z, ang: f.ang || 0, tipo: f.type }; }
    }
    return best || { x: c0.x, z: c0.z, ang: 0 };
  }
  /** Adónde se lleva: junto a un camino de las afueras, a unos 230 m del campo, con sitio para la nave y la báscula */
  buscaDestino(campo) {
    const pl = PLACES.plaza || campo; let best = null, bs = 1e9;
    for (const P of PATHS || []) {
      const pts = (P.pts || []).map(p => Array.isArray(p) ? { x: p[0], z: p[1] } : p);
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], L = Math.hypot(b.x - a.x, b.z - a.z); if (!(L >= 1)) continue;
        for (let t = 0; t < L; t += 10) {
          const x = a.x + (b.x - a.x) * t / L, z = a.z + (b.z - a.z) * t / L, d = Math.hypot(x - campo.x, z - campo.z);
          if (d < 160 || d > 330 || Math.hypot(x - pl.x, z - pl.z) < 90 || Math.pow(x ** 4 + z ** 4, 0.25) > 380) continue;
          const nx = -(b.z - a.z) / L, nz = (b.x - a.x) / L;
          for (const s of [1, -1]) {
            const cx = x + nx * 15 * s, cz = z + nz * 15 * s;
            if (!isFree(cx, cz, 10) || riverInfo(cx, cz).edge < 12) continue;
            const h = [[0, 0], [8, 0], [-8, 0], [0, 8], [0, -8]].map(([u, v]) => terrainHeight(cx + u, cz + v)); if (Math.max(...h) - Math.min(...h) > 2.5) continue;
            const sc = Math.abs(d - 230); if (sc < bs) { bs = sc; best = { x: cx, z: cz, rot: Math.atan2(-nx * s, -nz * s), road: { x, z } }; }
          }
        }
      }
    }
    if (best) return best;
    // (sin camino que sirva: hacia fuera del pueblo, en el primer sitio libre)
    const a = Math.atan2(campo.x - pl.x, campo.z - pl.z), p = this.spot({ x: campo.x + Math.sin(a) * 200, z: campo.z + Math.cos(a) * 200 }, 30, true, 12);
    return { x: p.x, z: p.z, rot: a + Math.PI, road: { x: p.x - Math.sin(a) * 15, z: p.z - Math.cos(a) * 15 } };
  }
  startCosecha(M) {
    const R = RECETAS[M.m.crop], host = M.host.name, D = DESTINOS[R.destino];
    const campo = this.buscaCampo(R.campos), ca = Math.cos(campo.ang), sa = Math.sin(campo.ang);
    // (en el campo: u a lo ancho de las hileras, v a lo largo; el ángulo es el de las hileras de fieldInfo)
    const enCampo = (u, v) => ({ x: campo.x + u * ca - v * sa, z: campo.z + u * sa + v * ca });
    const C = M.cos = { R, D, campo, enCampo, fase: 'campo', vehs: [], cajas: [], vuelan: [], tempo: [], flechas: [], avisoT: 0 };
    M.step = 1; M.count = 0;
    const ang = Math.atan2(-sa, ca);   // (hacia dónde van las hileras, como rumbo de un vehículo)
    if (R.modo === 'cosechadora') {
      const T = trigoGeo(), celdas = [];
      // (las casillas de trigo, solo dentro del mismo campo de cereal y donde no hay nada: árboles, máquinas, muros)
      for (let i = 0; i < 9; i++) for (let j = 0; j < 7; j++) { const p = enCampo((i - 4) * 4.6, (j - 3) * 4.6), f = fieldInfo(p.x, p.z); if (f.mask > 0.5 && f.type === 2 && f.edge > 2 && isFree(p.x, p.z, 2)) celdas.push(p); }
      const im = C.trigo = new THREE.InstancedMesh(T.g, T.m, Math.max(1, celdas.length)); im.castShadow = true; im.receiveShadow = true; im.count = celdas.length;
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang), mx = new THREE.Matrix4();
      C.celdas = celdas.map((p, k) => { const h = 0.85 + Math.random() * 0.15, y = terrainHeight(p.x, p.z) - 0.05; mx.compose(new THREE.Vector3(p.x, y, p.z), q, new THREE.Vector3(1, h, 1)); im.setMatrixAt(k, mx); return { ...p, y, h, q, corte: null }; });
      im.instanceMatrix.needsUpdate = true; this.scene.add(im);
      M.need = Math.max(1, Math.ceil(celdas.length * 0.9)); C.tolva = 0; C.tolvaMax = Math.max(4, Math.ceil(M.need / 2.2)); C.remolque = 0;
      const sc = this.spot(enCampo(-28, -12), 8, true, 4), st = this.spot(enCampo(28, 18), 8, true, 4);
      C.cos = new Vehiculo(this, 'cosechadora', sc.x, sc.z, ang); C.trac = new Vehiculo(this, 'tractor', st.x, st.z, ang + Math.PI);
      C.vehs.push(C.cos, C.trac);
      C.granoT = this.granoEn(C.cos, 2.2, 0.8, 2.4, 0, 3.3, -1.3); C.granoR = this.granoEn(C.trac, 1.84, 0.62, 3.1, 0, 1.0, -3.9);
      M.steps = () => ['Habla con ' + host, `Siega el trigo con la cosechadora (${Math.round(Math.min(1, M.count / M.need) * 100)} %) y descarga la tolva en el remolque`, `Sube al tractor y lleva el grano a ${D.nombre}, siguiendo las flechas del camino`, `Pésalo en la báscula y habla con ${host}`];
    } else {
      // las matas en sus hileras (en la viña, el olivar y los frutales ya están las cepas y los árboles del campo)
      if (R.campos[0] === 7 || R.campos[0] === 3) {
        const g = mataGeo(R.color), pos = [];
        for (let r = 0; r < 7; r++) for (let k = 0; k < 26; k++) { const p = enCampo((r - 3) * 2.2, (k - 12.5) * 1.6); if (isFree(p.x, p.z, 0.6)) pos.push(p); }
        const im = C.matas = new THREE.InstancedMesh(g, MAT, Math.max(1, pos.length)), mx = new THREE.Matrix4(), q = new THREE.Quaternion(); im.count = pos.length;
        pos.forEach((p, k) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * 6.28); const s = 0.8 + Math.random() * 0.4; mx.compose(new THREE.Vector3(p.x, terrainHeight(p.x, p.z), p.z), q, new THREE.Vector3(s, s, s)); im.setMatrixAt(k, mx); });
        im.instanceMatrix.needsUpdate = true; im.castShadow = true; this.scene.add(im);
      }
      // los temporeros, cada uno al principio de su hilera
      M.need = Math.max(12, M.m.n || 0); C.porSoltar = M.need;
      for (let i = 0; i < 4; i++) {
        const u = (i - 1.5) * 4.4, s = this.spot(enCampo(u, -18), 3, true, 1.5);
        const a = new Actor({ id: 'temporero' + i, name: ['Temporero', 'Temporera', 'Temporero', 'Temporera'][i], x: s.x, z: s.z, heading: ang, look: TEMPOREROS[i], walkSpeed: 0.55, ghost: true }, this.scene);   // (no frenan el tractor: se apartan, más abajo)
        a.pos.y = terrainHeight(s.x, s.z); a.info = 'temporero'; this.walkers.push(a);
        C.tempo.push({ a, u, v: -18, t: 3 + i * 2.2 });
      }
      const st = this.spot(enCampo(-14, -26), 8, true, 4);
      C.trac = new Vehiculo(this, 'tractor', st.x, st.z, ang); C.vehs.push(C.trac);
      M.steps = () => ['Habla con ' + host, `Sube al tractor y recoge despacio ${R.saco ? 'los sacos' : 'las cajas'} de los temporeros (${M.count}/${M.need})`, `Lleva el remolque a ${D.nombre}, siguiendo las flechas del camino`, `Pésalo en la báscula y habla con ${host}`];
    }
    this.ui.toast(this.stepText(M), M.icon, 3600);
  }
  // el grano dentro de la tolva o del remolque: una capa dorada que crece de abajo arriba
  granoEn(V, w, h, d, x, y, z) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: '#d9b44a', roughness: 0.95 }));
    g.userData.base = { y, h }; g.position.set(x, y, z); g.scale.y = 0.02; g.visible = false; V.obj.add(g); return g;
  }
  llena(g, k) { k = Math.max(0, Math.min(1, k)); g.visible = k > 0.01; g.scale.y = Math.max(0.02, k); g.position.y = g.userData.base.y - g.userData.base.h / 2 + g.userData.base.h * g.scale.y / 2; }
  /** La carga va camino del destino: la ruta con sus flechas, el edificio con su báscula y quien la encargó, allí */
  aLaCarretera(M) {
    const C = M.cos; if (C.dest) return;
    C.fase = 'transporte'; M.step = 2;
    const d = C.dest = this.buscaDestino(C.campo), obj = C.edif = edificio(C.D);
    obj.position.set(d.x, terrainHeight(d.x, d.z), d.z); obj.rotation.y = d.rot; this.scene.add(obj); obj.updateMatrixWorld(true);
    (this.edificiosCosecha ||= []).push(obj);
    const W = (x, z) => new THREE.Vector3(x, 0, z).applyMatrix4(obj.matrixWorld);
    { const n = W(0, -6); addBox(n.x, n.z, 16, 10, d.rot); }
    if (C.D.props === 'silos') for (let i = 0; i < 3; i++) { const s = W(-11 - i * 0.2, -2 - i * 4.6); addCircle(s.x, s.z, 2.2); }
    C.bascula = W(0, 6); C.descarga = W(-5, 1.5);
    // quien la encargó espera junto a la báscula
    const h = W(4.2, 6), H = M.host; H.pos.set(h.x, terrainHeight(h.x, h.z), h.z); H.home = { x: h.x, z: h.z }; H.goal = null; H.state = 'idle';
    // las flechas del camino: por donde se anda (los caminos y calles), cada 18 m, hasta la báscula
    const V = C.trac, ruta = (() => { try { return findPath(V.x, V.z, d.road.x, d.road.z, 120000) || []; } catch (e) { return []; } })();
    const pts = [{ x: V.x, z: V.z }, ...ruta, { x: d.road.x, z: d.road.z }, { x: C.bascula.x, z: C.bascula.z }];
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], L = Math.hypot(b.x - a.x, b.z - a.z); if (L < 0.5) continue;
      for (let t = 18 - acc; t < L; t += 18) {
        const x = a.x + (b.x - a.x) * t / L, z = a.z + (b.z - a.z) * t / L;
        const f = new THREE.Mesh(FLECHA, FLECHA_MAT); f.position.set(x, terrainHeight(x, z) + 0.12, z); f.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); f.renderOrder = 2; this.scene.add(f);
        C.flechas.push({ x, z, obj: f, pasada: false });
      }
      acc = (acc + L) % 18;
    }
    this.sound?.magic?.();
    this.ui.toast(C.R.modo === 'cosechadora' ? `¡Campo segado! Sube al tractor y lleva el grano a ${C.D.nombre}` : `¡Remolque lleno! Llévalo a ${C.D.nombre}`, 'check', 4200);
  }
  /** Lo que se puede hacer con los vehículos: subir, si estás cerca de uno; bajar, si vas en él */
  tractorAcciones(list, ok) {
    const P = this.player;
    if (P.vehiculo) { list.push({ kind: 'bajar', x: P.pos.x, z: P.pos.z, r: 99, label: P.vehiculo.T.bajar }); return; }
    for (const M of this.missions) if (M.cos && !M.done) for (const V of M.cos.vehs) if (ok(V.x, V.z)) list.push({ kind: 'subir', V, x: V.x, z: V.z, r: V.T.r + 2.6, label: V.T.subir });
  }
  /** Adónde lleva la flecha de la misión en cada momento */
  tractorDestino(M) {
    const C = M.cos; if (!C || M.done) return null;
    const P = this.player, yendo = P.vehiculo, cerca = (L) => { let b = null, bd = 1e9; for (const k of L) { const d = Math.hypot(k.x - P.pos.x, k.z - P.pos.z); if (d < bd) { bd = d; b = k; } } return b; };
    if (C.fase === 'campo') {
      if (C.R.modo === 'cosechadora') {
        if (yendo !== C.cos) return { x: C.cos.x, z: C.cos.z, h: 5 };
        if (C.tolva >= C.tolvaMax || (M.count >= M.need && C.tolva > 0)) return { x: C.trac.x, z: C.trac.z, h: 3.5 };
        const k = cerca(C.celdas.filter(c => c.corte == null)); return k ? { x: k.x, z: k.z, h: 1.4 } : null;
      }
      if (yendo !== C.trac) return { x: C.trac.x, z: C.trac.z, h: 3.5 };
      const k = cerca(C.cajas.filter(c => !c.hecho)) || cerca(C.tempo.map(t => t.a.pos)); return k ? { x: k.x, z: k.z, h: 1.4 } : null;
    }
    if (C.fase === 'transporte') {
      if (yendo !== C.trac) return { x: C.trac.x, z: C.trac.z, h: 3.5 };
      const f = C.flechas.find(f => !f.pasada); return f ? { x: f.x, z: f.z, h: 0.4 } : { x: C.bascula.x, z: C.bascula.z, h: 0.4 };
    }
    return null;
  }
  tractorTick(dt) {
    if (window.__prisaCosecha) dt *= window.__prisaCosecha;   // (las pruebas, en un navegador que pinta una imagen por segundo)
    for (const M of this.missions) {
      const C = M.cos; if (!C || M.done) continue;
      const P = this.player, yendo = P.vehiculo, t = this.elapsed;
      C.avisoT -= dt;
      if (C.fase === 'campo' && C.R.modo === 'cosechadora') this.tickCosechadora(M, dt, yendo === C.cos);
      else if (C.fase === 'campo') this.tickTemporeros(M, dt, yendo === C.trac);
      // las cajas en el suelo laten; las que vuelan van en arco a su plaza del remolque, que se mueve con el tractor
      for (const k of C.cajas) if (!k.hecho) k.ring.material.opacity = 0.4 + Math.sin(t * 4 + k.x) * 0.25;
      for (const f of C.vuelan) {
        f.t += dt / 0.55; const u = Math.max(0, Math.min(1, f.t)), to = f.al ? f.al : C.trac.local(...PLAZAS[f.plaza % PLAZAS.length]);
        f.k.obj.position.lerpVectors(f.de, to, u); f.k.obj.position.y += Math.sin(u * Math.PI) * 2.2; f.k.obj.rotation.y += dt * 6;
        if (u >= 1) { f.fin = true; if (f.al) { f.k.obj.rotation.set(0, Math.random() * 6, 0); } else { C.trac.obj.add(f.k.obj); f.k.obj.position.set(...PLAZAS[f.plaza % PLAZAS.length]); f.k.obj.rotation.set(0, 0, 0); } }
      }
      C.vuelan = C.vuelan.filter(f => !f.fin);
      if (C.fase === 'transporte') {
        for (const f of C.flechas) { if (!f.pasada && Math.hypot(f.x - P.pos.x, f.z - P.pos.z) < 9) f.pasada = true; f.obj.visible = !f.pasada; }
        FLECHA_MAT.opacity = 0.6 + Math.sin(t * 5) * 0.25;
        // en la báscula, parado: se pesa
        const V = C.trac, cola = V.local(0, 0, -3.9);
        if (yendo === V && Math.min(Math.hypot(V.x - C.bascula.x, V.z - C.bascula.z), Math.hypot(cola.x - C.bascula.x, cola.z - C.bascula.z)) < 3.6) {
          if (Math.abs(V.speed) < 0.6) { C.pesa = (C.pesa || 0) + dt; if (C.pesa > 0.2 && !C.pesando) { C.pesando = true; this.ui.toast('En la báscula: pesando…', 'check', 2200); } }
          else if (C.avisoT <= 0) { C.avisoT = 3; this.ui.toast('Para el tractor en la báscula', 'check', 2000); }
          if (C.pesa > 2.4) this.descarga(M);
        } else C.pesa = 0;
      }
      if (C.fase === 'descarga') {
        C.descT -= dt;
        if (C.granoR?.visible) this.llena(C.granoR, Math.max(0, C.descT / 2.5));
        if (C.descT <= 0 && !C.pesado) { C.pesado = true; M.step = 3; if (this.player.vehiculo) this.player.vehiculo.baja(); this.talk?.(M.host); }
      }
    }
  }
  tickCosechadora(M, dt, yendo) {
    const C = M.cos, V = C.cos;
    if (yendo) {
      V.obj.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(V.obj.matrixWorld).invert(), q = new THREE.Vector3();
      for (const k of C.celdas) {
        if (k.corte != null) continue;
        q.set(k.x, V.y, k.z).applyMatrix4(inv);
        // (el cabezal, de 5,4 m, delante: siega la casilla que pasa por debajo; con la tolva llena, no)
        if (Math.abs(q.x) < 3.4 && Math.abs(q.z - 3.9) < 2.8) {
          if (C.tolva >= C.tolvaMax) { if (C.avisoT <= 0) { C.avisoT = 3.5; this.ui.toast('¡Tolva llena! Descárgala en el remolque del tractor', 'check', 3000); } break; }
          k.corte = 0; C.tolva++; M.count++; this.llena(C.granoT, C.tolva / C.tolvaMax);
          this.particles?.emit({ x: k.x, y: k.y + 1, z: k.z }, { n: 26, color: ['#e2bf55', '#cfa93e', '#f2e2a0'], speed: 2.6, size: 0.22, life: 1.1, spread: 3 });
          this.sound?.ui?.('coin'); if (M.count % 3 === 0 || M.count >= M.need) this.ui.toast(this.stepText(M), M.icon, 1400);
        }
      }
      // descargar: la cosechadora junto al remolque, parada
      if (C.tolva > 0 && Math.hypot(V.x - C.trac.x, V.z - C.trac.z) < 9 && Math.abs(V.speed) < 1.2) {
        C.descargando = (C.descargando || 0) + dt;
        if ((C.chorro = (C.chorro || 0) - dt) <= 0) { C.chorro = 0.08; const p = C.trac.local(0, 2.3, -3.9 + (Math.random() - 0.5) * 2); this.particles?.emit({ x: p.x, y: p.y, z: p.z }, { n: 4, color: ['#e2bf55', '#d9b44a'], speed: 0.4, size: 0.18, life: 0.6, gravity: 8, spread: 0.6, up: -0.3 }); }
        if (C.descargando > 0.6) { C.descargando = 0; C.tolva--; C.remolque++; this.llena(C.granoT, C.tolva / C.tolvaMax); this.llena(C.granoR, C.remolque / Math.max(1, M.need)); if (C.tolva === 0) this.ui.toast('Tolva descargada en el remolque', 'check', 2000); }
      } else C.descargando = 0;
    }
    // las espigas segadas bajan a rastrojo
    let mover = false; const mx = new THREE.Matrix4();
    C.celdas.forEach((k, i) => { if (k.corte != null && k.corte < 1) { k.corte = Math.min(1, k.corte + dt / 0.4); mx.compose(new THREE.Vector3(k.x, k.y, k.z), k.q, new THREE.Vector3(1, k.h * (1 - k.corte * 0.88), 1)); C.trigo.setMatrixAt(i, mx); mover = true; } });
    if (mover) C.trigo.instanceMatrix.needsUpdate = true;
    if (M.count >= M.need && C.tolva === 0 && C.remolque > 0) this.aLaCarretera(M);
  }
  tickTemporeros(M, dt, yendo) {
    const C = M.cos, V = C.trac;
    // cada temporero va avanzando por su hilera y deja una caja llena cada pocos segundos, hasta las que hacen falta
    for (const T of C.tempo) {
      T.t -= dt;
      if (T.t <= 0 && C.porSoltar > 0) {
        T.t = 7 + Math.random() * 4; C.porSoltar--;
        const a = this.rnd() * 6.28, s = this.spot({ x: T.a.pos.x + Math.cos(a) * 1.2, z: T.a.pos.z + Math.sin(a) * 1.2 }, 2, true, 1);
        const obj = caja(C.R.color, C.R.saco); obj.position.set(s.x, terrainHeight(s.x, s.z), s.z); obj.rotation.y = this.rnd() * 6.28; this.scene.add(obj);
        const ring = new THREE.Mesh(ANILLO, new THREE.MeshBasicMaterial({ color: '#ffe36a', transparent: true, opacity: 0.6, depthWrite: false })); ring.position.set(s.x, terrainHeight(s.x, s.z) + 0.06, s.z); this.scene.add(ring);
        C.cajas.push({ x: s.x, z: s.z, obj, ring, hecho: false });
        T.v = Math.min(18, T.v + 3.2); T.a.goTo(C.enCampo(T.u, T.v));
      }
    }
    // (cuando se acerca el tractor, el temporero se aparta a un lado de su paso y luego vuelve a su hilera)
    for (const T of C.tempo) {
      const a = T.a, dx = a.pos.x - V.x, dz = a.pos.z - V.z, d = Math.hypot(dx, dz);
      if (d < 4.2 && !T.aparta) { const s = Math.sign(dx * Math.cos(V.heading) - dz * Math.sin(V.heading)) || 1; T.aparta = 3; a.goTo({ x: a.pos.x + Math.cos(V.heading) * 3.2 * s, z: a.pos.z - Math.sin(V.heading) * 3.2 * s, run: true }); }
      if (T.aparta && (T.aparta -= dt) <= 0) { T.aparta = 0; a.goTo(C.enCampo(T.u, T.v)); }
    }
    if (!yendo) return;
    V.obj.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(V.obj.matrixWorld).invert(), q = new THREE.Vector3();
    for (const k of C.cajas) {
      if (k.hecho) continue;
      q.set(k.x, V.y, k.z).applyMatrix4(inv);
      if (Math.hypot(q.x, q.z - 0.2) < 2.7 || Math.hypot(q.x, q.z + 3.9) < 2.7) {
        if (Math.abs(V.speed) > RAPIDO) { if (C.avisoT <= 0) { C.avisoT = 3; this.ui.toast('¡Más despacio! Así no se pueden cargar', M.icon, 2200); } continue; }
        k.hecho = true; k.ring.parent?.remove(k.ring); k.ring.material.dispose();
        C.vuelan.push({ k, t: 0, de: k.obj.position.clone(), plaza: M.count });
        this.particles?.emit({ x: k.x, y: terrainHeight(k.x, k.z) + 0.5, z: k.z }, { n: 14, color: ['#ffe38a', C.R.color], speed: 2, size: 0.25, life: 0.8 });
        this.sound?.ui?.('coin'); M.count++; this.ui.toast(this.stepText(M), M.icon, 1400);
      }
    }
    if (M.count >= M.need) this.aLaCarretera(M);
  }
  // en la báscula: el peso de verdad y la descarga (las cajas, a los palés de la puerta; el grano, al foso)
  descarga(M) {
    const C = M.cos; if (C.fase !== 'transporte') return;
    C.fase = 'descarga'; C.descT = 2.5;
    const kg = C.R.modo === 'cosechadora' ? M.count * 640 : M.count * (C.R.saco ? 45 : 18);
    this.sound?.magic?.(); this.ui.toast(`Báscula: ${kg.toLocaleString('es-ES')} kg`, 'check', 3600);
    if (C.R.modo !== 'cosechadora') for (const k of C.cajas) if (k.hecho && k.obj.parent === C.trac.obj) {
      const de = k.obj.getWorldPosition(new THREE.Vector3()); C.trac.obj.remove(k.obj); this.scene.add(k.obj); k.obj.position.copy(de);
      C.vuelan.push({ k, t: -Math.random() * 0.6, de, al: new THREE.Vector3(C.descarga.x + (Math.random() - 0.5) * 3, terrainHeight(C.descarga.x, C.descarga.z), C.descarga.z + (Math.random() - 0.5) * 2) });
    }
  }
  /** Se acaba la cosecha (o se va del pueblo): fuera vehículos, trigo, matas, cajas, temporeros y flechas. La nave del
   *  destino se queda mientras se esté en el pueblo (tiene sus paredes) */
  quitaTractor(M) {
    const C = M?.cos; if (!C) return;
    for (const k of C.cajas) { k.obj.parent?.remove(k.obj); k.obj.geometry?.dispose(); if (k.ring.parent) { k.ring.parent.remove(k.ring); k.ring.material.dispose(); } }
    for (const T of C.tempo) { T.a.obj.parent?.remove(T.a.obj); const i = this.walkers.indexOf(T.a); if (i >= 0) this.walkers.splice(i, 1); }
    for (const f of C.flechas) f.obj.parent?.remove(f.obj);
    for (const o of [C.trigo, C.matas]) if (o) { o.parent?.remove(o); o.dispose?.(); }
    if (C.matas) C.matas.geometry.dispose();
    for (const g of [C.granoT, C.granoR]) if (g) { g.geometry.dispose(); g.material.dispose(); }
    for (const V of C.vehs) V.dispose();
    M.cos = null;
  }
}
