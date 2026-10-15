// Las chicas: el personaje de Meshy de chico con la cabeza rehecha en Blender (tools/blender/chicas: el cráneo liso sin
// el pelo de chico, la frente despejada, las cejas finas, las pestañas pintadas, la nariz más pequeña, los labios) y su
// pelo modelado aparte (la coleta, con su goma). No se guarda otro modelo entero: se monta en el juego encima del chico
// ya cargado (tools/chicas/parche.mjs prepara lo que cambia):
//   - la malla: los vértices que cambian de sitio, de normal o de UV, y unos pocos nuevos (una esquina con otra UV)
//   - la textura: la del chico con lo repintado encima (el castaño de debajo del pelo, la frente, las cejas, las pestañas)
//   - el pelo: sus mallas, cosidas al esqueleto del chico, más los huesos de la coleta (Hair_*), que glbChar.js mueve
//     como muelles al andar y correr
// El resultado se usa como cualquier otro personaje de Meshy (new GlbChar(…)): las mismas animaciones y la misma escala.
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { loadMeshy, loadChar, sharpMap } from './glbChar.js';
import { fillMaterial } from '../engine/charLight.js';
import { peloEmisivo } from './hairColor.js';

const urls = (g) => Object.fromEntries(Object.entries(g).map(([p, u]) => [p.split('/').pop(), u]));
// Solo las que salen en el juego: de cerca, la futbolista (fútbol) y la pelotari (frontón), a la resolución de los modelos
// completos (@chicas en vite.config.js); ligera, la sanferminera (vecinas, corredoras del encierro y trajes).
// tools/chicas prepara las tres de las dos maneras; las que no se usan no van en el juego
const FULL = urls(import.meta.glob('@chicas/{osasuna,pelotari,sanfermin}.{parche,webp}', { eager: true, query: '?url', import: 'default' }));
const LOD = urls(import.meta.glob('../assets/chicas/lod/sanfermin.{parche,webp}', { eager: true, query: '?url', import: 'default' }));
const PELO = urls(import.meta.glob('../assets/chicas/pelo/{osasuna-coleta,pelotari-coleta,sanfermin-coleta,sanfermin-coleta-lod}.glb', { eager: true, query: '?url', import: 'default' }));
/** ¿Hay chica para este modelo de Meshy con este peinado (null: sin peinado), completa o ligera? */
export const hasChica = (name, peinado = 'coleta', lod = false) => !!((lod ? LOD : FULL)[name + '.parche'] && (!peinado || PELO[`${name}-${peinado}${lod ? '-lod' : ''}.glb`]));

// ---- el parche: tiras comprimidas con el códec de vértices de meshopt (el mismo que ya descomprime los modelos) ----
async function leerParche(url) {
  const b = new Uint8Array(await (await fetch(url)).arrayBuffer()), dv = new DataView(b.buffer, b.byteOffset);
  if (dv.getUint32(0, true) !== 0x32434843) throw new Error('parche de chica no válido');
  const jl = dv.getUint32(4, true), cab = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + jl)));
  await MeshoptDecoder.ready;
  let at = 8 + jl;
  const t = cab.tiras.map(([len, n, s, f]) => {
    const out = new Uint8Array(n * s);
    if (n) MeshoptDecoder.decodeVertexBuffer(out, n, s, b.subarray(at, at + len), f || undefined);
    at += len + ((4 - len % 4) % 4); return out;
  });
  const u32 = (a) => new Uint32Array(a.buffer, a.byteOffset, a.byteLength / 4);
  return { ...cab, idx: u32(t[0]), src: u32(t[1]), uvi: u32(t[2]), pos: new Int16Array(t[3].buffer), nor: new Int8Array(t[4].buffer), uv: new Uint16Array(t[5].buffer), esq: u32(t[6]) };
}

// ---- la malla de la chica: la del chico (sin tocarla: la comparten los chicos) con el parche puesto ----
function aplicar(geo, P) {
  const A = geo.attributes, n0 = A.position.count, n = n0 + P.nuevos;
  if (P.verts !== n0) throw new Error(`el parche es para ${P.verts} vértices y el modelo tiene ${n0}`);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n0; i++) {
    pos[i * 3] = A.position.getX(i); pos[i * 3 + 1] = A.position.getY(i); pos[i * 3 + 2] = A.position.getZ(i);
    nor[i * 3] = A.normal.getX(i); nor[i * 3 + 1] = A.normal.getY(i); nor[i * 3 + 2] = A.normal.getZ(i);
    uv[i * 2] = A.uv.getX(i); uv[i * 2 + 1] = A.uv.getY(i);
    si[i * 4] = A.skinIndex.getX(i); si[i * 4 + 1] = A.skinIndex.getY(i); si[i * 4 + 2] = A.skinIndex.getZ(i); si[i * 4 + 3] = A.skinIndex.getW(i);
    sw[i * 4] = A.skinWeight.getX(i); sw[i * 4 + 1] = A.skinWeight.getY(i); sw[i * 4 + 2] = A.skinWeight.getZ(i); sw[i * 4 + 3] = A.skinWeight.getW(i);
  }
  const Q = 1 / 32767, put = (v, j) => {
    for (let c = 0; c < 3; c++) pos[v * 3 + c] = P.pos[j * 4 + c] * Q;
    const x = P.nor[j * 4], y = P.nor[j * 4 + 1], z = P.nor[j * 4 + 2], l = Math.hypot(x, y, z) || 1;
    nor[v * 3] = x / l; nor[v * 3 + 1] = y / l; nor[v * 3 + 2] = z / l;
  };
  for (let j = 0; j < P.cambian; j++) put(P.idx[j], j);
  for (let j = 0; j < P.conUV; j++) { const v = P.uvi[j]; uv[v * 2] = P.uv[j * 2] / 65535; uv[v * 2 + 1] = P.uv[j * 2 + 1] / 65535; }
  // (los nuevos: la piel, del vértice del que salen)
  for (let j = 0; j < P.nuevos; j++) {
    const v = n0 + j, s = P.src[j]; put(v, P.cambian + j);
    uv[v * 2] = P.uv[(P.conUV + j) * 2] / 65535; uv[v * 2 + 1] = P.uv[(P.conUV + j) * 2 + 1] / 65535;
    for (let c = 0; c < 4; c++) { si[v * 4 + c] = si[s * 4 + c]; sw[v * 4 + c] = sw[s * 4 + c]; }
  }
  const I0 = geo.index.array, I = n > 65535 ? new Uint32Array(I0.length) : new (I0.constructor)(I0.length); I.set(I0);
  for (let j = 0; j < P.esquinas; j++) I[P.esq[j * 2]] = n0 + P.esq[j * 2 + 1];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4)); g.setIndex(new THREE.BufferAttribute(I, 1));
  // (la caja, la del chico: la ropa y el pelo se reconocen por su altura en ella: npcOutfit.js, hairColor.js)
  if (!geo.boundingBox) geo.computeBoundingBox(); if (!geo.boundingSphere) geo.computeBoundingSphere();
  g.boundingBox = geo.boundingBox.clone(); g.boundingSphere = geo.boundingSphere.clone();
  return g;
}

// ---- la textura: la del chico y, encima, lo repintado ----
function imagen(url) {
  return new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = url; });
}
function textura(map, detalle) {
  const img = map.image, W = img.width, H = img.height, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); if (!g) return map;
  // (la capa va a la resolución de la textura de esa versión; en el móvil la textura se reduce y la capa con ella)
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, W, H); g.drawImage(detalle, 0, 0, W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = map.colorSpace; t.flipY = map.flipY; t.wrapS = map.wrapS; t.wrapT = map.wrapT; t.anisotropy = map.anisotropy || 8;
  t.minFilter = map.minFilter; t.magFilter = map.magFilter; t.generateMipmaps = map.generateMipmaps;
  return t;
}

// ---- el pelo: sus huesos nuevos colgados de los del chico y sus mallas atadas a ese esqueleto ----
function coser(scene, pelo) {
  const nodos = {}; scene.traverse(o => { if (o.name && !nodos[o.name]) nodos[o.name] = o; });
  pelo.updateMatrixWorld(true);
  pelo.traverse(o => {
    if (!o.isBone || nodos[o.name]) return;
    const b = new THREE.Bone(); b.name = o.name; b.position.copy(o.position); b.quaternion.copy(o.quaternion); b.scale.copy(o.scale);
    (nodos[o.parent.name] || scene).add(b); nodos[o.name] = b;
  });
  const mallas = []; pelo.traverse(o => { if (o.isSkinnedMesh) mallas.push(o); });
  for (const o of mallas) {
    const m = new THREE.SkinnedMesh(o.geometry, o.material.clone());
    m.name = o.name; m.position.copy(o.position); m.quaternion.copy(o.quaternion); m.scale.copy(o.scale);
    m.userData.pelo = true; m.frustumCulled = false;
    (nodos[o.parent.name] || scene).add(m);
    m.bind(new THREE.Skeleton(o.skeleton.bones.map(b => nodos[b.name]), o.skeleton.boneInverses.map(x => x.clone())), o.bindMatrix.clone());
    const mat = m.material;
    // (la luz de relleno de los personajes de Meshy, también en el pelo: si no, quedaba más oscuro que la cara. Con su
    // color ya teñido: la textura del pelo es gris y el color lo pone el material: hairColor.js)
    if (mat.emissive && !/Pestanas/.test(m.name)) peloEmisivo(mat);
    // (el pelo de verdad, que toma el color de cada una; la goma y las pestañas, no)
    if (!/Pestanas|Lazo/.test(m.name)) m.userData.peloColor = true;
    if (/Pestanas/.test(m.name)) { mat.side = THREE.DoubleSide; mat.transparent = false; mat.alphaTest = 0.4; mat.depthWrite = true; m.castShadow = false; m.userData.noShadow = true; }
    mat.userData.own = true;
  }
}

const cache = new Map();
/** Chica de un modelo de Meshy (el que haga de ella: futbolista, pelotari, sanferminera…) con su peinado (sin peinado,
 *  null: la cabeza lisa, para los trajes que traen su propio pelo o tocado; las pestañas van pintadas en la cara). Como
 *  loadMeshy: { scene, animations, userData: { fit, meshy, chica } }. lod: la versión ligera, para multitudes. */
export function loadChica(name, peinado = 'coleta', lod = false) {
  const key = `${name}:${peinado}:${lod ? 'lod' : ''}`;
  if (!cache.has(key)) cache.set(key, (async () => {
    const S = lod ? LOD : FULL, pelo = peinado && PELO[`${name}-${peinado}${lod ? '-lod' : ''}.glb`];
    if (!S[name + '.parche'] || (peinado && !pelo)) throw new Error(`no hay chica ${name} ${peinado || ''}${lod ? ' ligera' : ''}`);
    const [base, P, det, gp] = await Promise.all([loadMeshy(name, lod), leerParche(S[name + '.parche']), imagen(S[name + '.webp']), pelo ? loadChar(pelo) : null]);
    const scene = SkeletonUtils.clone(base.scene);
    let body = null; scene.traverse(o => { if (!body && o.isSkinnedMesh && o.material?.map) body = o; });
    body.geometry = aplicar(body.geometry, P);
    // (hairRef: el brillo de su castaño de debajo del pelo, en sRGB —0,306 · 0,196 · 0,129, textura.py—: al teñirla de
    // otro color, toma el color tal cual, como las mallas del pelo; con el del chico, mucho más oscuro, salía más clara)
    const m0 = body.material, m = m0.clone(); delete m.userData.sharp; m.userData.hairRef = 0.222;
    m.map = textura(m0.map, det); if (m0.emissiveMap) m.emissiveMap = m.map;
    if (m0.userData.fillK != null) fillMaterial(m, m0.userData.fillK);
    sharpMap(m); body.material = m;
    if (gp) coser(scene, gp.scene);
    return { scene, animations: base.animations, userData: { ...base.userData, chica: peinado, base: name } };
  })());
  return cache.get(key);
}
