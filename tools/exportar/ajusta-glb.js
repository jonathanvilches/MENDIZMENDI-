// (lo usa glb-en-pagina.js al final de cada exportación, en la página; también vale en Node, para arreglar un .glb ya sacado)
// Lo que GLTFExporter de three.js escribe y glTF no admite, y el validador de Khronos da como error:
// 1. Factores de los materiales fuera de 0..1: el juego sube alguno por encima para que brille (un color a 1,3); se recortan.
// 2. Colores de vértice (COLOR_0) un poco por encima de 1, del sombreado del relieve; se recortan, y su mínimo y máximo.
// 3. Los datos de cada ejemplar (fase, largo… de las raíces de las islas) los escribe como si fueran de cada vértice, con
//    otra cuenta: se pasan a la extensión de ejemplares (EXT_mesh_gpu_instancing), que es donde van.
// 4. Materiales con textura en mallas sin coordenadas de textura (el relieve del mapa: su sombreador pinta la ortofoto por
//    la posición): esas mallas llevan una copia del material sin textura, que lo dice en sus «extras».
// Si no hay nada que arreglar, devuelve los mismos bytes.
const JSON_CHUNK = 0x4E4F534A, BIN_CHUNK = 0x004E4942, FLOAT = 5126;
const clamp = (x) => Math.min(1, Math.max(0, x));
const TEXTURAS = ['baseColorTexture', 'metallicRoughnessTexture'], TEXTURAS_MAT = ['normalTexture', 'occlusionTexture', 'emissiveTexture'];

export function ajustaGlb(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), lj = dv.getUint32(12, true);
  if (dv.getUint32(16, true) !== JSON_CHUNK) return { glb: u8, arreglos: {} };
  const json = JSON.parse(new TextDecoder().decode(u8.subarray(20, 20 + lj)));
  const resto = u8.slice(20 + lj), arreglos = {}, suma = (k) => { arreglos[k] = (arreglos[k] || 0) + 1; };
  // (el trozo binario, para tocar los colores en su sitio)
  const rv = new DataView(resto.buffer, resto.byteOffset, resto.byteLength), binIni = rv.byteLength >= 8 && rv.getUint32(4, true) === BIN_CHUNK ? 8 : -1;

  // 1. Factores de los materiales
  const fija = (o, k) => { if (!o || o[k] == null) return; const v = o[k], w = Array.isArray(v) ? v.map(clamp) : clamp(v);
    if (Array.isArray(v) ? w.some((x, i) => x !== v[i]) : w !== v) { o[k] = w; suma('factores'); } };
  for (const m of json.materials || []) { const p = m.pbrMetallicRoughness; fija(p, 'baseColorFactor'); fija(p, 'metallicFactor'); fija(p, 'roughnessFactor'); fija(m, 'emissiveFactor'); fija(m.occlusionTexture, 'strength'); }

  // 2. Colores de vértice
  const hechos = new Set();
  for (const me of json.meshes || []) for (const pr of me.primitives) {
    const ia = pr.attributes?.COLOR_0; if (ia == null || hechos.has(ia)) continue; hechos.add(ia);
    const a = json.accessors[ia]; if (a.componentType !== FLOAT || a.bufferView == null || binIni < 0) continue;
    if (a.max && a.min && a.max.every(x => x <= 1) && a.min.every(x => x >= 0)) continue;
    const bv = json.bufferViews[a.bufferView], n = a.type === 'VEC4' ? 4 : 3, paso = bv.byteStride || n * 4;
    const ini = binIni + (bv.byteOffset || 0) + (a.byteOffset || 0);
    for (let i = 0; i < a.count; i++) for (let c = 0; c < n; c++) { const o = ini + i * paso + c * 4, x = rv.getFloat32(o, true); if (x > 1 || x < 0) rv.setFloat32(o, clamp(x), true); }
    if (a.max) a.max = a.max.map(clamp); if (a.min) a.min = a.min.map(clamp);
    suma('colores');
  }

  // 3. Datos de cada ejemplar
  for (const no of json.nodes || []) {
    const ext = no.extensions?.EXT_mesh_gpu_instancing, me = json.meshes?.[no.mesh]; if (!ext || !me) continue;
    const cuenta = json.accessors[Object.values(ext.attributes)[0]]?.count;
    for (const pr of me.primitives) {
      const nv = json.accessors[pr.attributes.POSITION]?.count;
      for (const [k, ia] of Object.entries(pr.attributes)) {
        const c = json.accessors[ia].count; if (c === nv || c !== cuenta || !k.startsWith('_')) continue;
        ext.attributes[k] = ia; delete pr.attributes[k]; suma('ejemplares');
      }
    }
  }
  // (y si queda alguno con otra cuenta, sin ejemplares donde ponerlo, fuera)
  for (const me of json.meshes || []) for (const pr of me.primitives) {
    const nv = json.accessors[pr.attributes.POSITION]?.count;
    for (const [k, ia] of Object.entries(pr.attributes)) if (json.accessors[ia].count !== nv) { delete pr.attributes[k]; suma('atributosFuera'); }
  }

  // 4. Texturas en mallas sin coordenadas de textura
  const sinUV = new Map();
  for (const me of json.meshes || []) for (const pr of me.primitives) {
    const m = json.materials?.[pr.material]; if (!m) continue;
    const usa = (t) => t && (t.texCoord || 0) === 0;
    const tiene = TEXTURAS.some(k => usa(m.pbrMetallicRoughness?.[k])) || TEXTURAS_MAT.some(k => usa(m[k]));
    if (!tiene || pr.attributes.TEXCOORD_0 != null) continue;
    if (!sinUV.has(pr.material)) {
      const c = JSON.parse(JSON.stringify(m)); for (const k of TEXTURAS) if (c.pbrMetallicRoughness) delete c.pbrMetallicRoughness[k]; for (const k of TEXTURAS_MAT) delete c[k];
      c.name = (m.name || 'material') + ' (sin textura)';
      c.extras = { ...(c.extras || {}), texturaSinUV: 'el sombreador del juego la pinta por la posición (ver su sombreador)' };
      json.materials.push(c); sinUV.set(pr.material, json.materials.length - 1);
    }
    pr.material = sinUV.get(pr.material); suma('texturasSinUV');
  }

  if (!Object.keys(arreglos).length) return { glb: u8, arreglos };
  const t = new TextEncoder().encode(JSON.stringify(json)), pad = (4 - t.length % 4) % 4;
  const out = new Uint8Array(20 + t.length + pad + resto.length), o = new DataView(out.buffer);
  out.set(u8.subarray(0, 12)); o.setUint32(8, out.length, true); o.setUint32(12, t.length + pad, true); o.setUint32(16, JSON_CHUNK, true);
  out.set(t, 20); out.fill(0x20, 20 + t.length, 20 + t.length + pad); out.set(resto, 20 + t.length + pad);
  return { glb: out, arreglos };
}
