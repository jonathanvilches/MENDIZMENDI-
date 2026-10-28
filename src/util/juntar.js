// Junta las piezas quietas de un grupo que comparten material en una sola malla: una llamada de dibujo por material en
// vez de una por pieza (y por cara, en las cajas con un material en cada cara). Solo las mallas normales, visibles, sin
// nombre, sin hijas y opacas, en el grupo y en sus grupos sueltos; nunca las de deja (lo que luego se mueve, se esconde o
// cambia).
// Se llama al construir, antes de dibujar nada: las geometrías sueltas no llegan a la tarjeta gráfica.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// (lo que un objeto guarda en sus campos, menos el grupo entero, raiz: esas piezas y lo que cuelga de ellas se quedan como están)
export function guardadas(obj, raiz) {
  const s = new Set();
  const mete = (o) => o?.isObject3D && o !== raiz && o.traverse(x => s.add(x));
  for (const v of Object.values(obj)) { if (Array.isArray(v)) v.forEach(mete); else mete(v); }
  return s;
}

export function juntaQuietas(group, deja = new Set(), propios = new Set()) {
  const cubos = new Map(), quitar = [];
  // (y dentro de cada grupo suelto: los tejados y las casas de alrededor, en su sitio)
  for (const c of group.children) if (c.isGroup && !deja.has(c)) juntaQuietas(c, deja, propios);
  for (const m of group.children) {
    if (!m.isMesh || m.isInstancedMesh || m.isSkinnedMesh || !m.visible || m.name || m.children.length || m.renderOrder || deja.has(m)) continue;
    if (Object.keys(m.userData).length || Object.values(m.geometry.attributes).some(a => a.isInterleavedBufferAttribute) || m.geometry.morphAttributes.position) continue;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    if (mats.some(x => !x || x.transparent || x.alphaTest > 0 || x.side !== THREE.FrontSide)) continue;
    m.updateMatrix();
    const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix);
    const firma = Object.keys(g.attributes).sort().join(',');
    const trozos = Array.isArray(m.material) && g.groups.length ? g.groups.map(gr => [m.material[gr.materialIndex], gr.start, Math.min(gr.count, g.attributes.position.count - gr.start)]) : [[mats[0], 0, g.attributes.position.count]];
    for (const [mat, a, n] of trozos) {
      if (!mat || !n) continue;
      const k = igual(mat, propios) + '|' + m.castShadow + m.receiveShadow + '|' + firma;
      let c = cubos.get(k); if (!c) cubos.set(k, c = { mat, cast: m.castShadow, rec: m.receiveShadow, geos: [] });
      c.geos.push(trozo(g, a, n));
    }
    quitar.push(m);
  }
  for (const m of quitar) group.remove(m);
  for (const c of cubos.values()) {
    const geo = mergeGeometries(c.geos);
    if (!geo) continue;
    const m = new THREE.Mesh(geo, c.mat); m.castShadow = c.cast; m.receiveShadow = c.rec; m.matrixAutoUpdate = false;
    group.add(m);
  }
  return quitar.length;
}

// (dos materiales hechos con lo mismo cuentan como uno: así se juntan también las piezas de cada uno. Los de propios, los
// que luego cambian solos, y los que retocan su sombreador, van siempre aparte)
const SOLO = THREE.Material.prototype.onBeforeCompile;
function igual(m, propios) {
  if (propios.has(m) || m.onBeforeCompile !== SOLO || Object.keys(m.userData).length) return m.uuid;
  const t = (x) => x ? x.uuid : '', c = (x) => x ? x.getHexString() : '';
  return [m.type, c(m.color), c(m.emissive), m.emissiveIntensity, m.roughness, m.metalness, t(m.map), t(m.normalMap), t(m.roughnessMap),
    t(m.emissiveMap), t(m.aoMap), t(m.alphaMap), t(m.bumpMap), m.vertexColors, m.flatShading, m.opacity, m.fog, m.toneMapped,
    m.depthWrite, m.depthTest, m.polygonOffset, m.polygonOffsetFactor, m.envMapIntensity].join(',');
}
// (un tramo de vértices seguidos de una geometría sin índice, ya colocada)
function trozo(g, a, n) {
  const out = new THREE.BufferGeometry();
  for (const [k, at] of Object.entries(g.attributes)) out.setAttribute(k, new THREE.BufferAttribute(at.array.slice(a * at.itemSize, (a + n) * at.itemSize), at.itemSize, at.normalized));
  return out;
}
