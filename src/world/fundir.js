// Juntar mallas quietas en una por material: cada malla suelta es una llamada de dibujo, y en el iPhone el pueblo no
// puede pasar de ~520 por imagen (tools/presupuesto-pueblo.mjs). Se ve igual: mismas formas, mismos materiales, mismo
// sitio; solo cambia que la gráfica las pinta de una vez.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Junta en una malla por material las mallas de `raiz` que no se mueven por separado. Se quedan sueltas: las que tienen
 * nombre (alguien las puede buscar), hijas propias, varios materiales, están escondidas, son transparentes, tienen huesos
 * o instancias, o un material retocado a mano (onBeforeCompile). Y las de `saltar` (con todo lo que cuelga de ellas).
 * Con cruzaGrupos: false no entra en los grupos hijos (lo que gira aparte, como las ruedas de la bici). Las nuevas van en
 * `raiz`, con sus formas ya puestas en su sitio. Devuelve las geometrías nuevas (para tirarlas con el modelo).
 */
export function fundeQuietas(raiz, { saltar = null, cruzaGrupos = true } = {}) {
  raiz.updateMatrixWorld(true);
  const inv = raiz.matrixWorld.clone().invert(), cubos = new Map();
  const visita = (o) => {
    for (const c of o.children) {
      if (!c.visible || saltar?.has(c)) continue;
      if (c.isMesh) {
        if (apta(c)) {
          const k = clave(c); let L = cubos.get(k); if (!L) cubos.set(k, L = []); L.push(c);
        }
        visita(c);   // (lo que cuelga de una malla se mueve con ella)
      } else if (cruzaGrupos && !c.isLight && !c.isCamera) visita(c);
    }
  };
  visita(raiz);
  const nuevas = [];
  for (const L of cubos.values()) {
    if (L.length < 2) continue;   // (una sola, tal cual: así no cambia nada en las que no ganan)
    const geos = L.map(m => { const g = m.geometry.clone(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)); return g; });
    const geo = mergeGeometries(geos); for (const g of geos) g.dispose();
    if (!geo) continue;
    const a = L[0], m = new THREE.Mesh(geo, a.material);
    m.castShadow = a.castShadow; m.receiveShadow = a.receiveShadow; m.renderOrder = a.renderOrder; m.frustumCulled = a.frustumCulled;
    geo.computeBoundingSphere(); raiz.add(m); nuevas.push(geo);
    for (const x of L) x.parent?.remove(x);
  }
  return nuevas;
}

function apta(m) {
  if (m.name || m.children.length || m.isSkinnedMesh || m.isInstancedMesh || m.isSprite || Array.isArray(m.material)) return false;
  const mat = m.material, g = m.geometry;
  if (!mat || mat.transparent || Object.prototype.hasOwnProperty.call(mat, 'onBeforeCompile') || m.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return false;
  if (!g?.attributes?.position || !(g.attributes.position.array instanceof Float32Array) || Object.keys(g.morphAttributes || {}).length) return false;
  for (const a of Object.values(g.attributes)) if (a.isInterleavedBufferAttribute) return false;
  return true;
}

// (solo se juntan las que comparten material, sombras, orden y los mismos atributos, del mismo tipo)
function clave(m) {
  const g = m.geometry, at = Object.keys(g.attributes).sort().map(k => { const a = g.attributes[k]; return `${k}${a.itemSize}${a.normalized ? 'n' : ''}${a.array.constructor.name}`; }).join(',');
  return `${m.material.uuid}|${at}|${g.index ? 'i' : ''}|${m.castShadow}${m.receiveShadow}|${m.renderOrder}|${m.frustumCulled}`;
}

/** Todo lo que un objeto guarda en sus campos (mallas, grupos y listas de ellos), con lo que cuelga: lo que su código
 *  mueve, esconde o cambia luego, y por eso no se puede juntar */
export function referenciadas(obj, raiz) {
  const S = new Set(), mete = (o) => { if (o?.isObject3D && o !== raiz) o.traverse(x => S.add(x)); };
  for (const v of Object.values(obj)) { if (Array.isArray(v)) v.forEach(mete); else mete(v); }
  return S;
}
