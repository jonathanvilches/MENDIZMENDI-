// (lo usan tools/exportar-pueblo.mjs y tools/exportar-mapa.mjs dentro de la página del juego, servido por Vite: la escena de
// three.js a un .glb, en la máxima calidad del juego)
// - Los materiales propios del juego (ShaderMaterial: el suelo, el agua, los tejados pintados…) no existen en glTF: se
//   cambian, solo para exportar, por uno estándar con su color y su textura principal; y su sombreador (el código GLSL) se
//   guarda aparte, con un identificador que el material lleva en sus «extras» (sombreador: id), para rehacerlo en Shader
//   Graph o HLSL. Los estándar que el juego retoca (onBeforeCompile) llevan igual el suyo (sombreadorExtra: id).
// - Las piezas de detalle de las casas (ventanas, marcos, macetas…), todas, y no las fachadas sencillas de lejos.
// - El cielo, las nubes, la lluvia y las partículas no se exportan: en otro motor se hacen con lo suyo.
// - Mientras se exporta, el juego se para (requestAnimationFrame retenido): así nada cambia a medias.
// - Lo que three.js escribe y glTF no admite (el validador de Khronos lo da por error) se arregla al final: ajusta-glb.js.
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ajustaGlb } from './ajusta-glb.js';

const color = (m) => { const u = m.uniforms || {}; for (const k of ['diffuse', 'uColor', 'uColorA', 'color', 'uTint', 'uBase', 'uCol', 'colA', 'uShallow', 'uAgua', 'uWater', 'uDeep']) { const v = u[k]?.value; if (v?.isColor) return v; } return new THREE.Color(0x9a9a8a); };
const mapa = (m) => { const u = m.uniforms || {}; for (const k of ['map', 'uMap', 'tMap', 'uTex', 'uOrto', 'tex', 'uTextura']) { const v = u[k]?.value; if (v?.isTexture && v.image) return v; } return null; };
const FUERA = /cielo|sky|nube|cloud|lluvia|rain|nieve|snow|part[ií]cula|particle|polvo|humo|smoke|chispa|spark/i;
const esFuera = (o) => o.isPoints || o.isSprite || o.isLine || FUERA.test(o.name || '') || (o.isInstancedMesh && !(o.count > 0)) ||
  (o.isMesh && [].concat(o.material).some(m => (m?.isShaderMaterial && m.side === THREE.BackSide) || FUERA.test(m?.name || '')));
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); };
const valores = (u) => { const o = {}; for (const [k, v] of Object.entries(u || {})) { const x = v?.value;
  if (typeof x === 'number' || typeof x === 'boolean') o[k] = x; else if (x?.isColor) o[k] = '#' + x.getHexString();
  else if (x?.isVector2 || x?.isVector3 || x?.isVector4) o[k] = x.toArray().map(n => +n.toFixed(4)); else if (x?.isTexture) o[k] = 'textura' + (x.name ? ': ' + x.name : ''); } return o; };
const LIB = { MeshStandardMaterial: 'standard', MeshPhysicalMaterial: 'physical', MeshLambertMaterial: 'lambert', MeshPhongMaterial: 'phong', MeshBasicMaterial: 'basic', MeshToonMaterial: 'toon', MeshMatcapMaterial: 'matcap' };

/** Antes de exportar (unos segundos antes, para que el juego lo aplique): todo a la distancia de detalle máxima. */
export function maxDetalle(rt) {
  if (!rt) return;
  if (rt.nature) { rt.nature.lodDist = 1e6; rt.nature.rockFar = 1e6; }
  if (rt.terrain) rt.terrain.lodDist = 1e6;
  if (rt.fauna) rt.fauna.visDist = 1e6;
  rt.lighten = () => { }; rt.acortaVista = () => { };
}

export async function escenaAGlb(scene, { maxTex = 4096, renderer = null } = {}) {
  const cambios = [], ocultos = [], vistos = [], attrs = [], matrices = [], datos = [];
  const SH = new Map(), apunta = (e) => { const x = SH.get(e.id); if (x) x.usos++; else SH.set(e.id, { ...e, usos: 1 }); return e.id; };
  // (el juego, parado mientras tanto)
  const W = window, raf = W.requestAnimationFrame, retenidos = []; W.requestAnimationFrame = (f) => { retenidos.push(f); return 0; };
  const raices = [].concat(scene);
  for (const raiz of raices) raiz.traverse((o) => {
    if (o.visible && esFuera(o)) { o.visible = false; ocultos.push(o); return; }
    // (piezas de detalle de las manzanas, src/world/builder.js: «material|celda|nivel»; 1 y 2 de cerca, 3 la fachada de lejos)
    const t = o.isMesh && /\|-?\d+,-?\d+\|([0-3])$/.exec(o.name || '');
    if (t) { const quiere = t[1] !== '3'; if (o.visible !== quiere) { vistos.push([o, o.visible]); o.visible = quiere; } }
    // (las normales del juego van en 4 bytes por vértice, para la tarjeta del iPhone; glTF las quiere en 3 números)
    const g = o.geometry, nr = g?.attributes?.normal;
    if (nr && (nr.itemSize !== 3 || !(nr.array instanceof Float32Array)) && nr.array) { const f = new Float32Array(nr.count * 3), v = new THREE.Vector3();
      for (let i = 0; i < nr.count; i++) { v.fromBufferAttribute(nr, i).normalize(); f.set([v.x, v.y, v.z], i * 3); }
      attrs.push([g, 'normal', nr]); g.setAttribute('normal', new THREE.BufferAttribute(f, 3)); }
    // (el relieve fino del mapa del inicio lo sube el sombreador, src/hub/mapa3dSombreadores.js RELIEVE_VS: aquí se mete en la malla)
    const fino = g?.attributes?.aFino, kF = [].concat(o.material || [])[0]?.uniforms?.uFinoK?.value;
    if (fino?.array && g.attributes.position?.array && typeof kF === 'number' && kF) { const ps = g.attributes.position, np = ps.clone();
      for (let i = 0; i < np.count; i++) np.setY(i, np.getY(i) + fino.getX(i) * kF); attrs.push([g, 'position', ps]); g.setAttribute('position', np); }
    // (los ejemplares escondidos con escala cero: glTF guarda posición, giro y escala, y de una escala cero sale un giro
    // imposible que al abrirlo deja todo en NaN; se guardan diminutos en su sitio)
    if (o.isInstancedMesh && o.instanceMatrix?.array) { const a = o.instanceMatrix.array, copia = a.slice(), m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Vector3();
      let toca = false; for (let i = 0; i < o.count; i++) { m.fromArray(a, i * 16); m.decompose(p, q, e);
        if (!(Math.abs(e.x * e.y * e.z) > 1e-12) || !Number.isFinite(q.x + q.y + q.z + q.w)) { m.compose(p.set(Number.isFinite(p.x) ? p.x : 0, Number.isFinite(p.y) ? p.y : 0, Number.isFinite(p.z) ? p.z : 0), q.identity(), e.setScalar(1e-4)); m.toArray(a, i * 16); toca = true; } }
      if (toca) matrices.push([o, copia]); }
    if (!o.material) return;
    const lista = Array.isArray(o.material) ? o.material : [o.material];
    const nuevos = lista.map((m) => {
      if (!m) return m;
      if (m.isShaderMaterial || m.isRawShaderMaterial) {
        const id = apunta({ id: hash(m.vertexShader + m.fragmentShader), nombre: m.name || '', tipo: m.type, vertexShader: m.vertexShader, fragmentShader: m.fragmentShader, defines: m.defines, uniformes: valores(m.uniforms) });
        const s = new THREE.MeshStandardMaterial({ name: (m.name || m.type) + ' (sombreador ' + id + ')', color: color(m), map: mapa(m), side: m.side, transparent: m.transparent, vertexColors: !!m.vertexColors });
        s.userData = { sombreador: id, tipo: m.type, uniformes: valores(m.uniforms) }; return s;
      }
      // (los estándar retocados por el juego: su código, tal como queda tras el retoque, con los trozos de three.js sin desplegar)
      if (LIB[m.type] && m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile && !m.userData?.sombreadorExtra) {
        try { const L = THREE.ShaderLib[LIB[m.type]], sh = { vertexShader: L.vertexShader, fragmentShader: L.fragmentShader, uniforms: THREE.UniformsUtils.clone(L.uniforms), defines: { ...(m.defines || {}) } };
          m.onBeforeCompile(sh, renderer);
          if (sh.vertexShader !== L.vertexShader || sh.fragmentShader !== L.fragmentShader) {
            const id = apunta({ id: hash(sh.vertexShader + sh.fragmentShader), nombre: m.name || '', tipo: m.type + ' + onBeforeCompile', base: LIB[m.type], vertexShader: sh.vertexShader, fragmentShader: sh.fragmentShader, defines: sh.defines, uniformes: valores(sh.uniforms) });
            datos.push([m, m.userData]); m.userData = { ...(m.userData || {}), sombreadorExtra: id };
          } } catch (e) { }
      }
      return m;
    });
    if (nuevos.some((m, i) => m !== lista[i])) { cambios.push([o, o.material]); o.material = Array.isArray(o.material) ? nuevos : nuevos[0]; }
  });
  try {
    const glb = await new GLTFExporter().parseAsync(raices.length === 1 ? raices[0] : raices, { binary: true, onlyVisible: true, maxTextureSize: maxTex });
    return { glb: ajustaGlb(new Uint8Array(glb)).glb, sombreadores: [...SH.values()] };
  } finally {
    for (const [o, m] of cambios) o.material = m;
    for (const o of ocultos) o.visible = true;
    for (const [o, v] of vistos) o.visible = v;
    for (const [g, k, a] of attrs) g.setAttribute(k, a);
    for (const [o, copia] of matrices) o.instanceMatrix.array.set(copia);
    for (const [m, u] of datos) m.userData = u;
    W.requestAnimationFrame = raf; for (const f of retenidos) raf.call(W, f);
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
