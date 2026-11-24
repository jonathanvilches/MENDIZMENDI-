// (lo usa tools/exportar-pueblo.mjs dentro de la página del juego, servido por Vite: la escena de three.js a un .glb)
// Los materiales propios del juego (ShaderMaterial: el suelo, el agua, los tejados pintados…) no existen en glTF: se
// cambian, solo para exportar, por uno estándar con su color y su textura principal si la tienen. El cielo, las nubes, la
// lluvia y las partículas no se exportan: en otro motor se hacen con lo suyo.
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const color = (m) => { const u = m.uniforms || {}; for (const k of ['diffuse', 'uColor', 'uColorA', 'color', 'uTint', 'uBase']) { const v = u[k]?.value; if (v?.isColor) return v; } return new THREE.Color(0x9a9a8a); };
const mapa = (m) => { const u = m.uniforms || {}; for (const k of ['map', 'uMap', 'tMap', 'uTex', 'uOrto']) { const v = u[k]?.value; if (v?.isTexture && v.image) return v; } return null; };
const FUERA = /cielo|sky|nube|cloud|lluvia|rain|nieve|snow|part[ií]cula|particle|polvo|humo|smoke|chispa|spark/i;
const esFuera = (o) => o.isPoints || o.isSprite || o.isLine || FUERA.test(o.name || '') || (o.isInstancedMesh && !(o.count > 0)) ||
  (o.isMesh && [].concat(o.material).some(m => (m?.isShaderMaterial && m.side === THREE.BackSide) || FUERA.test(m?.name || '')));

export async function escenaAGlb(scene) {
  const cambios = [], ocultos = [];
  const attrs = [], matrices = [];
  scene.traverse((o) => {
    if (o.visible && esFuera(o)) { o.visible = false; ocultos.push(o); return; }
    // (las normales del juego van en 4 bytes por vértice, para la tarjeta del iPhone; glTF las quiere en 3 números)
    const g = o.geometry, nr = g?.attributes?.normal;
    if (nr && (nr.itemSize !== 3 || !(nr.array instanceof Float32Array)) && nr.array) { const f = new Float32Array(nr.count * 3), v = new THREE.Vector3();
      for (let i = 0; i < nr.count; i++) { v.fromBufferAttribute(nr, i).normalize(); f.set([v.x, v.y, v.z], i * 3); }
      attrs.push([g, nr]); g.setAttribute('normal', new THREE.BufferAttribute(f, 3)); }
    // (los ejemplares escondidos con escala cero: glTF guarda posición, giro y escala, y de una escala cero sale un giro
    // imposible que al abrirlo deja todo en NaN; se guardan diminutos en su sitio)
    if (o.isInstancedMesh && o.instanceMatrix?.array) { const a = o.instanceMatrix.array, copia = a.slice(), m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Vector3();
      let toca = false; for (let i = 0; i < o.count; i++) { m.fromArray(a, i * 16); m.decompose(p, q, e);
        if (!(Math.abs(e.x * e.y * e.z) > 1e-12) || !Number.isFinite(q.x + q.y + q.z + q.w)) { m.compose(p.set(Number.isFinite(p.x) ? p.x : 0, Number.isFinite(p.y) ? p.y : 0, Number.isFinite(p.z) ? p.z : 0), q.identity(), e.setScalar(1e-4)); m.toArray(a, i * 16); toca = true; } }
      if (toca) matrices.push([o, copia]); }
    if (!o.material) return;
    const lista = Array.isArray(o.material) ? o.material : [o.material];
    const nuevos = lista.map((m) => (m?.isShaderMaterial || m?.isRawShaderMaterial) ? new THREE.MeshStandardMaterial({ name: (m.name || m.type) + ' (sombreador del juego)', color: color(m), map: mapa(m), side: m.side, transparent: m.transparent }) : m);
    if (nuevos.some((m, i) => m !== lista[i])) { cambios.push([o, o.material]); o.material = Array.isArray(o.material) ? nuevos : nuevos[0]; }
  });
  try {
    const glb = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: true, maxTextureSize: 2048 });
    return new Uint8Array(glb);
  } finally {
    for (const [o, m] of cambios) o.material = m;
    for (const o of ocultos) o.visible = true;
    for (const [g, nr] of attrs) g.setAttribute('normal', nr);
    for (const [o, copia] of matrices) o.instanceMatrix.array.set(copia);
  }
}

// (y se comprueba que se puede volver a abrir: cuántas mallas y triángulos trae y lo que mide)
export async function compruebaGlb(bytes) {
  const g = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  let mallas = 0, tris = 0; const mats = new Set();
  g.scene.traverse(o => { if (!o.isMesh) return; mallas++; const ix = o.geometry.index; tris += (ix ? ix.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); [].concat(o.material).forEach(m => mats.add(m.name || m.type)); });
  const s = new THREE.Box3().setFromObject(g.scene).getSize(new THREE.Vector3());
  return { mallas, triangulos: Math.round(tris), materiales: mats.size, medidas: s.toArray().map(Math.round) };
}
