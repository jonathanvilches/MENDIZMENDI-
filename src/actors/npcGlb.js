// Vecinos con la misma estructura que el personaje principal: el modelo de Blender (versión ligera _lod),
// su esqueleto y sus animaciones, con la ropa, la piel y el pelo de cada vecino. Las texturas se recolorean una vez
// por combinación de colores y se comparten; la geometría es la del modelo (un solo juego para todo el pueblo).
import * as THREE from 'three';
import { fillMaterial } from '../engine/charLight.js';
import { GlbChar, loadKayKit, loadMeshy, hasMeshy, MESHY_GAIT, MESHY_NAMES } from './glbChar.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { applyOutfit, regionalOutfit, MYTHS, resetOutfitTextures, dressMeshy } from './outfits.js';

// colores con los que se pintaron los modelos en Blender (build_protagonista.py / build_nerea.py)
const BASE = {
  boy: {
    body: { shirt: [[236, 226, 200], [226, 218, 198]], vest: [[96, 112, 62], [112, 128, 74]], trim: [[64, 76, 42], [70, 84, 46]], red: [[200, 34, 42], [196, 30, 40], [160, 46, 40]],
      pants: [[136, 110, 76], [118, 94, 62], [110, 86, 56], [86, 66, 42]], boots: [[126, 80, 44], [92, 58, 32], [150, 100, 60]], skin: [[241, 196, 160]] },
    face: { skin: [[241, 196, 160], [236, 150, 140]], hair: [[96, 60, 36]], brow: [[45, 28, 20]] },
  },
  girl: {
    body: { shirt: [[242, 234, 214], [232, 226, 210]], vest: [[58, 96, 140], [76, 116, 162]], trim: [[36, 62, 98]], red: [[132, 84, 204], [120, 72, 190]],
      pants: [[62, 76, 106], [52, 64, 92], [40, 50, 74]], boots: [[126, 80, 44], [92, 58, 32], [150, 100, 60]], skin: [[241, 196, 160]] },
    face: { skin: [[241, 196, 160], [236, 150, 140]], hair: [[170, 92, 42]], brow: [[120, 62, 30]] },
  },
};
const GLTF = {};
let ready = false;
/** Carga los cuerpos de los vecinos (KayKit). Se llama antes de montar el pueblo; si no cargan, los vecinos salen
 *  con la figura sencilla de reserva. */
export async function preloadNpcs() {
  // los vecinos son los personajes nuevos (Meshy, versión ligera); los cuerpos KayKit quedan solo para los seres de
  // leyenda y los trajes de carnaval (cuernos, pieles, cencerros, máscaras), que los nuevos no tienen
  const meshy = Promise.all(MESHY_NAMES.map(n => loadMeshy(n, true).then(g => { MESHY_LOD_NPC[n] = g; }))).then(() => { meshyReady = true; }).catch(e => console.warn('vecinos Meshy', e));
  const kk = Promise.all(KK_BASES.map(n => loadKayKit(n).then(g => { KKG[n] = g; }))).then(() => { kkReady = true; }).catch(e => console.warn('vecinos KayKit', e));
  await Promise.all([meshy, kk]);
  return meshyReady || kkReady;
}
const MESHY_LOD_NPC = {}; let meshyReady = false;
// trajes que solo existen en los cuerpos antiguos (carnaval, leyendas): esos vecinos siguen con ellos
const COSTUME = (L) => !!(L.myth || L.fur || L.shaggy || L.horns || L.bells || L.bell || L.crown || L.ribbons || L.base || L.outfit || ['cone', 'mask', 'bicorne', 'mitre', 'basket'].includes(L.hat));
const hashOf = (L) => JSON.stringify(L).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;
/** Qué personaje nuevo hace de este vecino según su aspecto: boina, chaleco o mayor → el pastor; de blanco con faja o
 *  pañuelo rojo → el sanferminero; los demás, repartidos (sobre todo esos dos, alguno con la camiseta de Osasuna o de
 *  pelotari). */
export function meshyFor(L = {}) {
  if (L.meshy && MESHY_NAMES.includes(L.meshy)) return L.meshy;
  const white = /^#(f|e[89a-f])/i.test(L.shirt || '');
  if (L.txapela || L.old) return 'pastor';
  if ((L.sash || L.scarf || L.handkerchief) && white) return 'sanfermin';
  const pool = ['sanfermin', 'pastor', 'sanfermin', 'pelotari', 'pastor', 'osasuna', 'sanfermin', 'osasuna_fuera', 'pastor', 'pelotari_rojo'].filter(n => MESHY_NAMES.includes(n));
  return pool[hashOf(L) % pool.length];
}
/** Personajes propios de Meshy que hacen de vecinos (el pastor): solo en los pueblos donde salen. */
export function preloadNpcMeshy(names) {
  return Promise.all(names.filter(n => hasMeshy(n) && !MESHY_NPC[n]).map(n => loadMeshy(n).then(g => { MESHY_NPC[n] = g; }).catch(e => console.warn('vecino', n, e))));
}
const MESHY_NPC = {};
// vecino con un personaje de Meshy: su modelo con sus clips, con la misma forma de animarse que los demás
function buildNpcMeshy(L) {
  const name = meshyFor(L), g = MESHY_LOD_NPC[name] || MESHY_NPC[name];
  const char = new GlbChar(g, MESHY_GAIT);   // zancada real (sin patinar)
  hairTint(char.root, L);
  // su altura: niños más bajos, el resto con un poco de variedad (todos con la misma figura nueva)
  const H = L.height || (L.child ? 1.22 : 1.5 + (hashOf(L) % 7) * 0.02), k = H / 1.6;
  char.root.scale.setScalar((g.userData.fit || 1) * k);
  const female = !!(L.female || L.skirt || L.ponytail || L.bun || L.braids || L.longHair || L.lashes);
  // (el nombre se conserva: sex dice cómo se llama, aunque de momento todos los cuerpos nuevos sean de chico)
  const obj = new THREE.Group(); obj.add(char.root); obj.userData.glbNpc = true; obj.userData.sex = female ? 'girl' : 'boy'; obj.userData.H = H; obj.userData.look = L; obj.userData.meshy = name;
  const anim = {
    t: 0, setExpr() {},
    update(dt, s) {
      if (s.wave > 0 && !char.oneShot && s.speed < 0.5) char.playOnce('Wave', Math.min(2.4, s.wave + 0.8));
      else if ((s.cheer > 0 || s.dance || s.clap > 0) && !char.oneShot) char.playOnce('Celebrate', 1.2);
      char.setTalking?.(s.talking > 0); char.setSpeed(s.speed); char.update(dt);
    },
  };
  return { obj, char, anim };
}
// Pelo de cada vecino: los personajes de Meshy llevan el pelo pintado en su textura (castaño oscuro en todos), así que
// se tiñe en el material con el color del «look» (rubio, castaño claro, pelirrojo, canoso…). El pelo se reconoce por su
// color en la textura (castaño muy oscuro y rojizo: mucho más rojo que verde y casi sin azul) y solo en la cabeza
// (atributo por vértice calculado una vez por modelo): la boina negra, los ojos y el pañuelo rojo no cambian
const HAIR_K = (geo) => {
  if (geo.attributes.aHead) return;
  const P = geo.attributes.position, n = P.count, a = new Float32Array(n); let top = -1e9;
  for (let i = 0; i < n; i++) top = Math.max(top, P.getY(i));
  for (let i = 0; i < n; i++) a[i] = THREE.MathUtils.smoothstep(P.getY(i), top - 0.6, top - 0.5);   // (el modelo mide 2 unidades)
  geo.setAttribute('aHead', new THREE.BufferAttribute(a, 1));
};
function hairTint(root, L) {
  const hair = L.hair || (L.old ? '#d6d0c6' : null); if (!hair) return;
  const col = new THREE.Color(hair);
  root.traverse(o => {
    if (!o.isSkinnedMesh || !o.material?.map) return;
    HAIR_K(o.geometry);
    const m = o.material.clone(); if (o.material.userData.fillK != null) fillMaterial(m, o.material.userData.fillK);
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uHair = { value: col };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aHead; varying float vHead;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHead = aHead;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uHair; varying float vHead;')
        .replace('#include <map_fragment>', `#include <map_fragment>
{
  vec3 c = diffuseColor.rgb; float l = dot(c, vec3(0.3, 0.59, 0.11));
  // pelo: oscuro, con más rojo que verde y poco azul (la boina negra y los ojos son grises o negros puros: no se
  // tiñen; el pañuelo rojo es mucho más claro). Se mira el texel tal cual: las islas del pelo en el atlas son
  // pequeñas y desenfocar mezcla con la piel de al lado
  float h = vHead * smoothstep(1.3, 1.8, c.r / max(c.g, 0.002)) * (1.0 - smoothstep(0.4, 0.55, c.b / max(c.r, 0.002))) * (1.0 - smoothstep(0.09, 0.14, l));
  diffuseColor.rgb = mix(c, uHair * clamp(l / 0.009, 0.35, 1.5), h);
}`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = emissive * diffuseColor.rgb;');
    };
    m.customProgramCacheKey = () => 'meshy-hair';
    o.material = m;
  });
}
// Vecino con traje (carnaval, dantzaris, seres de leyenda) con el cuerpo de los personajes nuevos: el de Meshy que mejor
// le va (de blanco, el sanferminero; los seres del monte, el pastor), a su altura (los gigantes, gigantes) y con las
// prendas del traje cosidas a sus huesos: gorros, cencerros, pieles, cintas, máscaras, melenas, barbas…
function buildNpcMeshyCostume(L) {
  const M = L.myth && MYTHS[L.myth], female = M ? M.female : !!(L.female || L.skirt || L.ponytail || L.bun || L.braids || L.longHair || L.lashes);
  const white = /^#(f|e[89a-f])/i.test(L.shirt || '');
  const n = buildNpcMeshy({ ...L, meshy: M || !white ? 'pastor' : 'sanfermin', height: M ? M.height : L.height });
  const O = M ? M.outfit : lookOutfit(L, female);
  if (O && typeof O === 'object') {
    const D = { ...O }; delete D.beret; delete D.scarf; delete D.sash;   // eso ya lo llevan los personajes nuevos
    n.char.root.updateMatrixWorld(true); dressMeshy(n.char.root, D);
  }
  n.obj.userData.look = L; n.obj.userData.sex = female ? 'girl' : 'boy';
  return n;
}
const KK_BASES = ['Ranger', 'Rogue', 'Knight', 'Barbarian', 'Mage', 'Rogue_Hooded'];
const KKG = {}; let kkReady = false;
const KK_SEX = { boy: ['Ranger', 'Knight', 'Ranger'], girl: ['Rogue', 'Mage', 'Rogue_Hooded'], old: ['Barbarian'] };
// todas las piezas con piel (cuerpo, cabeza, brazos, piernas) en una sola malla: una llamada de dibujo por vecino
function mergeSkinned(root) {
  const sk = []; root.traverse(o => { if (o.isSkinnedMesh && o.visible) sk.push(o); });
  // al clonar, cada pieza recibe su propio esqueleto (con los mismos huesos): se comparan los huesos, no el objeto
  const sameBones = (m) => m.skeleton === sk[0].skeleton || (m.skeleton.bones.length === sk[0].skeleton.bones.length && m.skeleton.bones.every((b, i) => b === sk[0].skeleton.bones[i]));
  if (sk.length < 2 || sk.some(m => !sameBones(m) || !m.bindMatrix.equals(sk[0].bindMatrix) || m.parent !== sk[0].parent || m.material.map !== sk[0].material.map)) return;
  const geos = sk.map(m => {
    const src = m.geometry, n = src.attributes.position.count, out = new THREE.BufferGeometry();
    const f32 = (name, k) => { const a = src.attributes[name], arr = new Float32Array(n * k); for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) arr[i * k + j] = a.getComponent(i, j); return new THREE.BufferAttribute(arr, k); };
    for (const [nm, k] of [['position', 3], ['normal', 3], ['uv', 2], ['skinWeight', 4]]) out.setAttribute(nm, f32(nm, k));
    const si = src.attributes.skinIndex, sia = new Uint16Array(n * 4); for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) sia[i * 4 + j] = si.getComponent(i, j);
    out.setAttribute('skinIndex', new THREE.BufferAttribute(sia, 4)); if (src.index) out.setIndex(Array.from(src.index.array));
    return out;
  });
  const merged = mergeGeometries(geos); if (!merged) return;
  const mesh = new THREE.SkinnedMesh(merged, sk[0].material); mesh.name = 'Body'; mesh.position.copy(sk[0].position); mesh.quaternion.copy(sk[0].quaternion); mesh.scale.copy(sk[0].scale);
  sk[0].parent.add(mesh); mesh.bind(sk[0].skeleton, sk[0].bindMatrix);
  for (const m of sk) m.removeFromParent();
}
// plantilla por cuerpo y traje (se comparte entre vecinos iguales)
const KKT = new Map();
function kkTemplate(base, outfit) {
  const key = base + '|' + JSON.stringify(outfit);
  if (!KKT.has(key)) {
    const g = KKG[base], sc = SkeletonUtils.clone(g.scene);
    applyOutfit(sc, base, outfit);
    const gone = []; sc.traverse(o => { if (o.isMesh && o.visible === false) gone.push(o); }); gone.forEach(o => o.removeFromParent());
    mergeSkinned(sc);
    KKT.set(key, { scene: sc, animations: g.animations, userData: { ...g.userData } });
  }
  return KKT.get(key);
}
// traje del vecino a partir de su «look» (o el de su comarca si lo pide)
function lookOutfit(L, female) {
  // pelo y piel de cada vecino (antes todos salían con el pelo castaño del modelo), también con el traje de su comarca
  const hair = L.hair || (L.old ? '#d6d0c6' : undefined);
  if (L.region) { const R = regionalOutfit(L.region, female, () => ((L.seed = ((L.seed || 7) * 9301 + 49297) % 233280) / 233280)); R.hair = hair; if (L.skin) R.skin = L.skin; return R; }
  const O = { id: undefined, shirt: L.shirt || '#e8e0cc', pants: L.skirt && !female ? L.skirt : (L.pants || L.skirt || '#3b3a40'), shoes: L.shoes || (L.espadrille ? '#efe6d0' : '#4a2f1c'), accent: L.vest || L.sash || L.pants || '#3b3a40' };
  O.hair = hair; if (L.skin) O.skin = L.skin;
  if (L.txapela) O.beret = L.txapela; if (L.scarf) O.scarf = L.scarf; if (L.sash) O.sash = L.sash;
  if (female && L.skirt) { O.skirt = L.skirt; if (L.apron) O.apron = L.apron; }
  if (!female && L.apron) O.sash = O.sash || L.apron;
  // trajes de carnaval y de fiesta: lo que lleven en la cabeza, cencerros, cintas, pieles, cuernos…
  if (L.pattern2) O.accent = L.pattern2;
  if (L.fur || L.shaggy) { O.fur = L.fur || L.shaggy; O.furLen = 0.55; }
  const hc = L.hatColor || L.shirt || '#3a3530';
  if (L.hat === 'cone') { O.cone = hc; if (L.ribbons) O.ribbons = ['#e03c3c', '#f2c230', '#3a8fd6', '#3ca05a']; }
  else if (L.hat === 'mask') { O.mask = hc; O.maskFace = L.maskColor || '#f1e7d6'; }
  else if (L.hat === 'basket') O.basketHat = '#b08650';
  else if (L.hat === 'bicorne') O.bicorne = L.hatColor || '#1d1d24';
  else if (L.hat === 'mitre') O.mitre = L.hatColor || '#f4efe0';
  else if (L.hat === 'straw') O.straw = L.hatColor || '#e2c27a';
  else if (L.hat === 'wool') O.wool = L.hatColor || '#c8222a';
  if (L.crown) O.crown = true;
  if (L.horns) O.horns = true;
  if (L.bells || L.bell) O.bells = true;
  if (L.ribbons && L.hat !== 'cone') O.ribbonsBody = ['#e03c3c', '#f2c230', '#3a8fd6', '#3ca05a', '#b34fc4'];
  if (L.handkerchief && !O.scarf) O.scarf = L.handkerchief;
  return O;
}
export function buildNpcKK(L) {
  const M = L.myth && MYTHS[L.myth];   // ser de leyenda: su cuerpo, su traje y su altura de gigante
  const female = M ? M.female : !!(L.female || L.skirt || L.ponytail || L.bun || L.braids || L.longHair || L.lashes);
  const h = (JSON.stringify(L).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7) >>> 0);
  const list = L.old && !female ? KK_SEX.old : KK_SEX[female ? 'girl' : 'boy'], base = M ? M.base : L.base && KKG[L.base] ? L.base : list[h % list.length];   // base: el cuerpo del avatar del jugador (fútbol, encierro)
  const gltf = kkTemplate(base, L.outfit || (M ? M.outfit : lookOutfit(L, female)));   // outfit: traje ya hecho (tu personaje)
  const char = new GlbChar(gltf, { walkAt: 0.2, runAt: 4.6, gait: (v, n) => n === 'Run' ? Math.pow(Math.max(0.3, v) / 3.0, 0.85) : Math.pow(Math.max(0.2, v) / 1.35, 0.8) });
  const H = M ? M.height : L.height || (L.child ? 1.2 : 1.5);
  const k = (gltf.userData.fit || 1) * (M ? H / 1.5 : THREE.MathUtils.clamp(H / 1.5, 0.7, H > 1.9 ? 1.7 : 1.15));   // gigantes de carnaval, más altos
  char.root.scale.setScalar(k);
  const obj = new THREE.Group(); obj.add(char.root); obj.userData.glbNpc = true; obj.userData.sex = female ? 'girl' : 'boy'; obj.userData.H = H; obj.userData.look = L;   // el retrato de los diálogos sale de su aspecto
  const anim = {
    t: 0, setExpr() {},
    update(dt, s) {
      if (s.wave > 0 && !char.oneShot && s.speed < 0.5) char.playOnce('Wave', Math.min(1.4, s.wave));
      else if ((s.cheer > 0 || s.dance || s.clap > 0) && !char.oneShot) char.playOnce('Celebrate', 1.2);
      char.setTalking?.(s.talking > 0); char.setSpeed(s.speed); char.update(dt);
    },
  };
  return { obj, char, anim };
}
export const npcsReady = () => ready || kkReady || meshyReady;

// colores en sRGB (como están pintadas las texturas); getHex devuelve sRGB aunque Three trabaje en lineal
const hex = (c) => { const h = new THREE.Color(c).getHex(); return [(h >> 16) & 255, (h >> 8) & 255, h & 255]; };
const shade = (c, k) => c.map(v => Math.max(0, Math.min(255, Math.round(v * k))));

// recolorea la imagen: cada píxel busca el color base más parecido (admitiendo luz y sombra) y se le suma
// la diferencia hacia el color nuevo, así se conservan el grano, las costuras y el sombreado pintados
function recolor(img, size, pairs) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, size, size);
  const d = g.getImageData(0, 0, size, size), a = d.data, n = pairs.length;
  const B = pairs.map(p => p[0]), T = pairs.map(p => p[1]), BB = B.map(b => b[0] * b[0] + b[1] * b[1] + b[2] * b[2]);
  for (let i = 0; i < a.length; i += 4) {
    const r = a[i], gg = a[i + 1], bl = a[i + 2];
    if (r + gg + bl < 30) continue;
    let best = -1, bd = 1e9, bs = 1;
    for (let k = 0; k < n; k++) {
      const b = B[k], s = Math.min(1.35, Math.max(0.6, (r * b[0] + gg * b[1] + bl * b[2]) / BB[k]));
      const dr = r - b[0] * s, dg = gg - b[1] * s, db = bl - b[2] * s, dd = dr * dr + dg * dg + db * db;
      if (dd < bd) { bd = dd; best = k; bs = s; }
    }
    if (best < 0 || bd > 2200) continue;
    const b = B[best], t = T[best];
    if (b === t) continue;
    a[i] = Math.max(0, Math.min(255, r + (t[0] - b[0]) * bs));
    a[i + 1] = Math.max(0, Math.min(255, gg + (t[1] - b[1]) * bs));
    a[i + 2] = Math.max(0, Math.min(255, bl + (t[2] - b[2]) * bs));
  }
  g.putImageData(d, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.anisotropy = 4;
  return tex;
}

// colores del vecino a partir de su «look» (el mismo formato que usaban las figuras antiguas)
function palette(look, sex) {
  const L = look || {};
  const skin = hex(L.skin || '#f1c4a0');
  const hair = hex(L.hair || (L.old ? '#d6d0c6' : '#3a2418'));
  const shirt = hex(L.shirt || '#e8e0cc');
  const vest = hex(L.vest || L.apron && L.shirt || L.shirt || '#5a6a3a');
  const pants = hex(L.skirt || L.pants || '#3b3a40');
  const boots = hex(L.shoes || (L.espadrille ? '#efe6d0' : '#4a2f1c'));
  const sashC = L.sash || L.scarf; const red = sashC ? hex(sashC) : shade(pants, 0.8);
  const socks = hex(L.socks || L.pants || L.skirt || '#e8e0cc');
  return { skin, hair, shirt, vest, pants, boots, red, socks, brow: shade(hair, L.old ? 0.75 : 0.55), scarf: !!L.scarf };
}
const texCache = new Map();
/** Al salir de un pueblo: se sueltan las texturas de sus vecinos (cada pueblo tiene los suyos). */
export function resetNpcCache() { for (const v of texCache.values()) { v.body.dispose(); v.face.dispose(); v.body.image.width = v.face.image.width = 1; } texCache.clear(); KKT.clear(); resetOutfitTextures(); }
function variantTextures(sex, P, srcBody, srcFace) {
  const q = (c) => c.map(v => v >> 3).join('.');
  const key = sex + '|' + [P.skin, P.hair, P.shirt, P.vest, P.pants, P.boots, P.red, P.socks].map(q).join('|');
  if (texCache.has(key)) return texCache.get(key);
  const Bs = BASE[sex];
  const map = (list, to, k = 1) => list.map((b, i) => [b, i === 0 ? to : shade(to, k * (b[0] + b[1] + b[2]) / (list[0][0] + list[0][1] + list[0][2]))]);
  const body = [
    ...map(Bs.body.shirt.slice(0, 1), P.shirt), [Bs.body.shirt[1], P.socks],
    ...map(Bs.body.vest, P.vest), ...map(Bs.body.trim, shade(P.vest, 0.68)),
    ...map(Bs.body.red, P.red), ...map(Bs.body.pants, P.pants), ...map(Bs.body.boots, P.boots), [Bs.body.skin[0], P.skin],
  ];
  const face = [[Bs.face.skin[0], P.skin], [Bs.face.skin[1], shade(P.skin, 0.95).map((v, i) => i === 0 ? Math.min(255, v + 10) : v)], [Bs.face.hair[0], P.hair], [Bs.face.brow[0], P.brow]];
  const v = { body: recolor(srcBody, 512, body), face: recolor(srcFace, 256, face) };
  texCache.set(key, v);
  return v;
}

// sombreros y bastón: piezas sencillas sujetas a los huesos (posición medida sobre el propio modelo)
const PROP_MAT = new Map();
const pmat2 = (c) => { const k = c + '|2'; if (!PROP_MAT.has(k)) PROP_MAT.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide })); return PROP_MAT.get(k); };
const pmat = (c) => { if (!PROP_MAT.has(c)) PROP_MAT.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 })); return PROP_MAT.get(c); };
const GEO = {
  txapela: new THREE.CylinderGeometry(0.135, 0.118, 0.045, 24), txtip: new THREE.CylinderGeometry(0.006, 0.006, 0.028, 6),
  brim: new THREE.CylinderGeometry(0.2, 0.2, 0.012, 24), crown: new THREE.CylinderGeometry(0.1, 0.11, 0.09, 18),
  staff: new THREE.CylinderGeometry(0.016, 0.02, 1.45, 7), wool: new THREE.SphereGeometry(0.12, 14, 10),
  bun: new THREE.SphereGeometry(0.055, 12, 9),
  tail: new THREE.CapsuleGeometry(0.034, 0.17, 4, 10), braid: new THREE.CapsuleGeometry(0.022, 0.2, 4, 8), mane: new THREE.CapsuleGeometry(0.1, 0.12, 4, 14),
  skirt: new THREE.CylinderGeometry(1, 1.55, 1, 20, 1, true), apron: new THREE.BoxGeometry(1, 1, 0.012),
};
const headFit = new WeakMap();
function fitHead(char, gltf) {
  if (headFit.has(gltf)) return headFit.get(gltf);
  char.root.updateMatrixWorld(true);
  const box = new THREE.Box3(), v = new THREE.Vector3();
  for (const n of ['Hair.001', 'Hair', 'Head.001', 'Head']) {
    const m = char.meshes[n]; if (!m || !m.isSkinnedMesh) continue;
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 3) { m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld); box.expandByPoint(v); }
  }
  const head = char.bones.Head, inv = head.matrixWorld.clone().invert();
  const top = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
  const r = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
  const fit = { top, r, inv, back: box.min.z, bottom: box.min.y };
  headFit.set(gltf, fit);
  return fit;
}
// cadera: altura del hueso y anchura del cuerpo a esa altura (para colgar la falda y el delantal)
const hipFit = new WeakMap();
function fitHips(char, gltf) {
  if (hipFit.has(gltf)) return hipFit.get(gltf);
  const hips = char.bones.Hips, body = char.meshes['Body.001'] || char.meshes.Body; if (!hips || !body?.isSkinnedMesh) return null;
  char.root.updateMatrixWorld(true);
  const hp = new THREE.Vector3().setFromMatrixPosition(hips.matrixWorld), v = new THREE.Vector3();
  let rx = 0, rz = 0, zf = -1, minY = 9; const pos = body.geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 2) { body.getVertexPosition(i, v); v.applyMatrix4(body.matrixWorld); if (Math.abs(v.y - hp.y) < 0.05) { rx = Math.max(rx, Math.abs(v.x - hp.x)); rz = Math.max(rz, Math.abs(v.z - hp.z)); zf = Math.max(zf, v.z); } if (v.y < minY) minY = v.y; }
  const f = { hp, rx, rz, zf, inv: hips.matrixWorld.clone().invert() };
  hipFit.set(gltf, f); return f;
}
function addProps(char, gltf, L) {
  const head = char.bones.Head; if (!head) return;
  const F = fitHead(char, gltf);
  const put = (mesh, wx, wy, wz, rx = 0, rz = 0) => {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(wx, wy, wz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(1, 1, 1));
    mesh.matrixAutoUpdate = false; mesh.matrix.copy(F.inv).multiply(m); mesh.castShadow = true; head.add(mesh);
  };
  const s = F.r / 0.13;
  if (L.txapela) {
    const t = new THREE.Mesh(GEO.txapela, pmat(L.txapela)); t.scale.set(s, 1, s);
    put(t, F.top.x - 0.01, F.top.y - 0.012, F.top.z - 0.01, 0, 0.14); t.matrix.multiply(new THREE.Matrix4().makeScale(s, 1, s));
    const tip = new THREE.Mesh(GEO.txtip, pmat(L.txapela)); put(tip, F.top.x, F.top.y + 0.02, F.top.z);
  } else if (L.hat === 'straw' || L.hat === 'wool') {
    const c = L.hat === 'straw' ? '#d9b66a' : (L.hatColor || '#8a5ad6');
    if (L.hat === 'straw') { const b = new THREE.Mesh(GEO.brim, pmat(c)); put(b, F.top.x, F.top.y - 0.045, F.top.z); b.matrix.multiply(new THREE.Matrix4().makeScale(s, 1, s)); }
    const cr = new THREE.Mesh(L.hat === 'straw' ? GEO.crown : GEO.wool, pmat(c)); put(cr, F.top.x, F.top.y - (L.hat === 'straw' ? 0.005 : 0.05), F.top.z); cr.matrix.multiply(new THREE.Matrix4().makeScale(s, L.hat === 'wool' ? 0.8 : 1, s));
  }
  const hc = L.hair || (L.old ? '#d6d0c6' : '#3a2418');
  const girl = L.female || L.skirt || L.ponytail || L.bun || L.braids || L.longHair;
  if (L.bun) { const b = new THREE.Mesh(GEO.bun, pmat(hc)); b.scale.setScalar(s); put(b, F.top.x, F.top.y - 0.07 * s, F.back + 0.012); }
  else if (L.braids) for (const k of [-1, 1]) { const b = new THREE.Mesh(GEO.braid, pmat(hc)); put(b, F.top.x + k * F.r * 0.75, F.top.y - 0.24 * s, F.back + 0.06, 0.25, -k * 0.12); }
  else if (L.longHair) { const b = new THREE.Mesh(GEO.mane, pmat(hc)); put(b, F.top.x, F.top.y - 0.2 * s, F.back + 0.035, 0.12); b.matrix.multiply(new THREE.Matrix4().makeScale(s * 1.1, 1, 0.45)); }
  else if (girl) { const b = new THREE.Mesh(GEO.tail, pmat(hc)); put(b, F.top.x, F.top.y - 0.16 * s, F.back - 0.03, 0.45); }
  // falda y delantal colgados de la cadera
  const H = (L.skirt || L.apron) && fitHips(char, gltf);
  if (H) {
    const put2 = (mesh, wx, wy, wz, sx, sy, sz, rx = 0) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(wx, wy, wz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), new THREE.Vector3(sx, sy, sz)); mesh.matrixAutoUpdate = false; mesh.matrix.copy(H.inv).multiply(m); mesh.castShadow = true; char.bones.Hips.add(mesh); };
    const len = H.hp.y * 0.42;
    if (L.skirt) { const sk = new THREE.Mesh(GEO.skirt, pmat2(L.skirt)); put2(sk, H.hp.x, H.hp.y + 0.02 - len / 2, H.hp.z, H.rx * 1.08, len, H.rz * 1.15); }
    if (L.apron) { const ap = new THREE.Mesh(GEO.apron, pmat(L.apron)); put2(ap, H.hp.x, H.hp.y - len * 0.45, H.zf + (L.skirt ? H.rz * 0.25 : 0.015), H.rx * 1.3, len * 0.95, 1, -0.08); }
  }
  const hand = char.bones.Socket_Hand_R || char.bones.RightHand;
  if (L.staff && hand) {
    char.root.updateMatrixWorld(true);
    const hp = new THREE.Vector3().setFromMatrixPosition(hand.matrixWorld), inv = hand.matrixWorld.clone().invert();
    const st = new THREE.Mesh(GEO.staff, pmat('#6b4a2a')); st.castShadow = true;
    st.matrixAutoUpdate = false; st.matrix.copy(inv).multiply(new THREE.Matrix4().makeTranslation(hp.x + 0.02, hp.y - 0.2, hp.z + 0.04)); hand.add(st);
  }
}

const EXPR = {
  happy: ['Happy', 'Normal'], surprised: ['Surprised', 'Normal'], scared: ['Scared', 'Worried'], worried: ['Normal', 'Worried'],
  sad: ['Tired', 'Worried'], tired: ['Tired', 'Worried'], angry: ['Normal', 'Angry'], thinking: ['Normal', 'Worried'], neutral: ['Normal', 'Normal'],
};

/** Vecino: devuelve { obj, char, anim } con la misma interfaz que usaba la figura antigua (anim.update / setExpr). */
export function buildNpc(look = {}) {
  const L = look;
  if (meshyReady && !COSTUME(L)) try { return buildNpcMeshy(L); } catch (e) { console.warn('vecino Meshy', e); }
  if (meshyReady && COSTUME(L)) try { return buildNpcMeshyCostume(L); } catch (e) { console.warn('vecino Meshy con traje', e); }
  if (L.meshy && MESHY_NPC[L.meshy]) try { return buildNpcMeshy(L); } catch (e) { console.warn('vecino Meshy', e); }
  if (kkReady && !L.classic) try { return buildNpcKK(L); } catch (e) { console.warn('vecino KayKit', e); }
  if (!GLTF.boy) return null;   // sin cuerpo: la figura de reserva
  const sex = L.female || L.skirt || L.ponytail || L.bun || L.braids || L.longHair || L.lashes ? 'girl' : 'boy';
  const gltf = GLTF[sex] || GLTF.boy;
  const char = new GlbChar(gltf, { outline: 0.006, walkAt: 0.2, runAt: 4.6, gait: (v, n) => n === 'Run' ? Math.pow(Math.max(0.3, v) / 3.2, 0.85) : Math.pow(Math.max(0.2, v) / 1.5, 0.8) });
  const P = palette(L, sex);
  // texturas recoloreadas (compartidas entre vecinos con los mismos colores)
  let srcBody = null, srcFace = null;
  char.root.traverse(o => { if (!o.isMesh || !o.material?.map) return; const nm = o.material.name || ''; if (/Body/.test(nm)) srcBody = o.material; else if (/Face/.test(nm)) srcFace = o.material; });
  if (srcBody && srcFace) {
    const T = variantTextures(sex, P, srcBody.map.image, srcFace.map.image);
    const mb = srcBody.clone(); mb.map = T.body; const mf = srcFace.clone(); mf.map = T.face;
    char.root.traverse(o => { if (!o.isMesh || o.userData.outline) return; if (o.material === srcBody) o.material = mb; else if (o.material === srcFace) o.material = mf; });
  }
  // pañuelo al cuello solo si lo lleva
  if (!P.scarf) for (const n of ['Acc_Scarf.001', 'Acc_Scarf', 'Acc_Scarf_Outline', 'Acc_Scarf.001_Outline']) if (char.meshes[n]) char.meshes[n].visible = false;
  char.root.traverse(o => { if (o.name.startsWith('Acc_Scarf') && o.userData.outline && !P.scarf) o.visible = false; });
  // altura: el modelo mide 1,68 m; niños más bajos, mayores algo encorvados
  const H = L.height || (L.child ? 1.36 : 1.72);
  const k = THREE.MathUtils.clamp(H / 1.68 * (L.old ? 0.98 : 1), 0.72, 1.12) * (L.build && L.build > 1.1 ? 1.03 : 1);
  char.root.scale.setScalar(k);
  addProps(char, gltf, L);
  const obj = new THREE.Group(); obj.add(char.root); obj.userData.glbNpc = true; obj.userData.sex = gltf === GLTF.girl ? 'girl' : 'boy'; obj.userData.H = H * k;
  // marca las mallas de contorno como «outline» (las enciende/apaga setOutlines según la distancia)
  obj.traverse(o => { if (o.name.endsWith('_Outline')) o.userData.outline = true; });
  const anim = {
    t: 0,
    setExpr(name, dur = 2) { const e = EXPR[name] || EXPR.neutral; char.holdFace(e[0], e[1], dur); },
    update(dt, s) {
      if (s.wave > 0 && !char.oneShot && s.speed < 0.5) char.playOnce('Wave', Math.min(1.4, s.wave));
      else if ((s.cheer > 0 || s.dance || s.clap > 0) && !char.oneShot) char.playOnce('Celebrate', 1.2);
      char.setTalking(s.talking > 0);
      char.setSpeed(s.speed);
      char.headYaw = THREE.MathUtils.lerp(char.headYaw || 0, (s.lookYaw || 0) * 0.6, Math.min(1, dt * 6));
      if (L.old) char.root.rotation.x = 0.06;
      char.update(dt);
    },
  };
  return { obj, char, anim };
}
