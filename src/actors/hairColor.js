// Pelo de otro color para los personajes de Meshy (vecinos, futbolistas y pelotaris rivales): todos traen el pelo
// castaño oscuro pintado en su textura y se tiñe en el material, sobre el sombreador que ya tenga (ropa, equipación).
// El pelo se reconoce por su color (castaño: más rojo que azul y oscuro) y por dónde está en la pose de reposo: en la
// cabeza y fuera de la cara. La cara (ojos, nariz y boca) es la franja de delante bajo las cejas: así el iris, las
// pestañas y la boca, que también son castaños, no cambian. Medido en las texturas con tools/pelo/zonas.mjs (la hoja de
// prueba, tools/pelo/ver.mjs): en los seis modelos los ojos quedan entre el 76 y el 82 % de la altura y a menos del 9 %
// del centro; las cejas, justo encima.
// El tono se conserva: cada píxel toma el color nuevo con su brillo respecto al brillo típico del pelo de ese modelo
// (algo más contrastado, para que el rubio y el canoso no queden planos); con pelo claro, las cejas un poco más oscuras.
import * as THREE from 'three';
import { fillMaterial, sharpMap } from '../engine/charLight.js';

// brillo típico del pelo pintado de cada modelo (luma en sRGB, la mediana de los píxeles de pelo); el pastor lleva
// boina negra: en él, lo casi negro y lo que queda por encima del ala (91 % de la altura) es boina y no pelo
const REF = { sanfermin: 0.056, pastor: -0.115, osasuna: 0.119, osasuna_fuera: 0.112, osasuna_juez: 0.119, pelotari: 0.08, pelotari_rojo: 0.087 };

/** Colores de pelo con sus nombres (los vecinos sin color propio y los jugadores toman uno de aquí), como se ven en
 *  el juego. */
export const HAIR_COLORS = { negro: '#171312', castano: '#553321', castanoClaro: '#8a5a34', cobrizo: '#793018', pelirrojo: '#b0491e', rubioOscuro: '#aa844d', rubio: '#eabc67', canoso: '#968f87', blanco: '#dbd6cb' };
// el color se da como se quiere ver y se pasa al de la textura: la luz del juego (sol, cielo y el relleno de los
// personajes) aclara mucho los oscuros (el castaño oscuro de siempre es casi negro en la textura) y poco los claros
function albedo(color) {
  const c = new THREE.Color(color), K = 2 + 1.8 * (1 - (0.3 * c.r + 0.59 * c.g + 0.11 * c.b));   // (Color guarda lineal)
  return [c.r, c.g, c.b].map(v => Math.pow(v / K, 1 / 2.2));
}
// reparto de los jóvenes y adultos (más morenos y castaños, algún rubio y pocos pelirrojos); null: el suyo de siempre
const POOL = [null, null, null, 'negro', 'negro', 'negro', 'castano', 'castano', 'castano', 'castanoClaro', 'castanoClaro', 'rubioOscuro', 'rubio', 'cobrizo', 'pelirrojo'];
/** Un color de pelo fijo para un número (el dorsal, el nombre): siempre el mismo para el mismo personaje. */
export function hairFor(seed) {
  const k = POOL[(Math.imul(seed, 2654435761) >>> 0) % 997 % POOL.length];
  return k ? HAIR_COLORS[k] : null;
}
/** Número de un texto (para hairFor con un nombre). */
export const seedOf = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

const GLSL = `uniform vec3 uHairC; uniform vec2 uHairK; uniform vec2 uHairB; varying vec3 vHairP;
vec3 noHair(vec3 lin){
  vec3 c = pow(max(lin, vec3(0.)), vec3(0.4545)), p = vHairP;
  float mx = max(c.r, max(c.g, c.b)), l = dot(c, vec3(0.3, 0.59, 0.11)), w = smoothstep(0.16, 0.3, (c.r - c.b) / max(c.r, 0.004)) * step(c.b, c.g + 0.03);
  // lo casi negro (el fondo de los surcos y las juntas de la textura) también es pelo, salvo con boina
  w = uHairK.x > 0. ? max(w, 1. - smoothstep(0.025, 0.04, mx)) : w * smoothstep(0.3, 0.42, l / -uHairK.x) * (1. - smoothstep(0.89, 0.91, p.y));
  // (el pelo de algunos pelotaris no es castaño, y se mide en su textura (medirPelo): uHairB.x, claro, pelirrojo o rubio,
  // vivo de color a diferencia de la piel y amarillo o anaranjado a diferencia del colorete de las mejillas; uHairB.y,
  // negro, oscuro sin más)
  float sat = (mx - min(c.r, min(c.g, c.b))) / max(mx, 0.004);
  float wB = uHairB.x * step(0.42, sat) * step(0.12 * mx, c.g - c.b) * step(0.3, (c.r - c.b) / max(c.r, 0.004));
  float wN = uHairB.y * (1. - smoothstep(0.24, 0.32, mx));
  float k = smoothstep(0.665, 0.69, p.y) * max(w * (1. - smoothstep(0.36, 0.5, mx)), max(wB, wN));
  float fr = smoothstep(0.02, 0.045, p.z), ax = abs(p.x);
  k *= 1. - fr * (1. - smoothstep(0.088, 0.098, ax)) * (1. - smoothstep(0.815, 0.826, p.y));
  if (k <= 0.) return lin;
  // (sin bajar del 70 %: las juntas de la textura y el fondo de los surcos, casi negros, eran rayas oscuras en el pelo claro;
  // sin pasar del 120 %: los brillos, a pleno sol, se quemaban a blanco)
  vec3 o = uHairC * pow(clamp(l / abs(uHairK.x), 0.7, 1.2), 1.5);
  o *= 1. - uHairK.y * fr * (1. - smoothstep(0.09, 0.1, ax)) * (1. - smoothstep(0.86, 0.875, p.y));
  return mix(lin, pow(clamp(o, 0., 1.), vec3(2.2)), k);
}`;
// (la lectura del brillo propio: tal cual o, con sharpMap delante, mzTex)
const EMI = /vec4 emissiveColor = (?:texture2D|mzTex)\( emissiveMap, vEmissiveMapUv \);/;

// EL PELO QUE NO ES CASTAÑO (19 de noviembre de 2026: el autor quiere poder cambiar el color de pelo de su pelotari, y de
// los 22 unos lo traen pelirrojo o rubio, más claro que lo que se tomaba por pelo, y otros negro, sin el rojizo del
// castaño). En la cabeza y fuera de la cara, como en el sombreador, se cuentan los píxeles de pelo claro (vivos de color y
// anaranjados o amarillos: no la piel ni el colorete) y los oscuros: si los claros son al menos una cuarta parte, el pelo
// es claro; si no, y los oscuros son al menos dos de cada cinco y casi ninguno castaño, es negro. Una vez por textura.
// Devuelve { ref, modo } (ref: el brillo típico, la mediana de los suyos, algo rebajada en el claro para que el color
// nuevo luzca como en los castaños; modo: 1 claro, 2 negro) o null (castaño, como el de los demás)
const _claros = new WeakMap();
function medirPelo(img, geo, flipY = false) {
  if (!img || !(img.width > 0)) return null;
  if (_claros.has(img)) return _claros.get(img);
  let r = null;
  try {
    const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, N, N);
    const D = x.getImageData(0, 0, N, N).data, P = geo.attributes.position, UV = geo.attributes.uv; if (!UV) throw new Error('sin uv');
    if (!geo.boundingBox) geo.computeBoundingBox();
    const b = geo.boundingBox, H = Math.max(1e-3, b.max.y - b.min.y), cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
    let n = 0, cast = 0; const ls = [], os = [];
    for (let i = 0; i < P.count; i++) {
      const py = (P.getY(i) - b.min.y) / H; if (py < 0.7) continue;
      const px = (P.getX(i) - cx) / H, pz = (P.getZ(i) - cz) / H; if (pz > 0.02 && Math.abs(px) < 0.1 && py < 0.83) continue;   // (la cara)
      const u = UV.getX(i), v = flipY ? 1 - UV.getY(i) : UV.getY(i), o = (Math.min(N - 1, Math.max(0, Math.floor(v * N))) * N + Math.min(N - 1, Math.max(0, Math.floor(u * N)))) * 4;
      const R = D[o] / 255, G = D[o + 1] / 255, B = D[o + 2] / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = 0.3 * R + 0.59 * G + 0.11 * B; n++;
      if (mx > 0.45 && (mx - mn) / mx > 0.42 && G - B > 0.12 * mx && (R - B) / R > 0.3) ls.push(l);
      else if (mx < 0.28) { os.push(l); if ((R - B) / Math.max(R, 0.004) > 0.3 && B <= G + 0.03 && mx > 0.06) cast++; }
    }
    const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
    if (n > 40 && ls.length > n * 0.25) r = { ref: med(ls) * 0.8, modo: 1 };
    else if (n > 40 && os.length > n * 0.4 && cast < os.length * 0.3) r = { ref: Math.max(0.02, med(os)), modo: 2 };
  } catch (e) { r = null; }
  _claros.set(img, r); return r;
}
/** Tiñe el pelo de un material (que ya sea propio de este personaje: no se clona). geo: la geometría de la malla. */
export function hairMaterial(m, geo, model, color) {
  if (!color || !m.map) return m;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const b = geo.boundingBox, H = Math.max(1e-3, b.max.y - b.min.y);
  const a = albedo(color), lit = Math.max(...a);
  // (los 22 pelotaris de las cartas no traen todos el castaño oscuro de los demás: su pelo se mide en su textura)
  const claro = /^pelotari_(?!rojo$)/.test(model) ? medirPelo(m.map.image, geo, m.map.flipY) : null;
  // (el brillo típico del pelo pintado: el del modelo o, en las chicas, el de su castaño de debajo del pelo, chicas.js)
  const U = { uHairC: { value: new THREE.Vector3(...a) }, uHairK: { value: new THREE.Vector2(claro?.ref || m.userData.hairRef || REF[model] || 0.09, 0.6 * lit) }, uHairB: { value: new THREE.Vector2(claro?.modo === 1 ? 1 : 0, claro?.modo === 2 ? 1 : 0) },
    uHairBox: { value: new THREE.Vector4(b.min.y, H, (b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2) } };
  const prev = m.onBeforeCompile, key = m.customProgramCacheKey;
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r); Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform vec4 uHairBox; varying vec3 vHairP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHairP = vec3(position.x - uHairBox.z, position.y - uHairBox.x, position.z - uHairBox.w) / uHairBox.y;');
    // (el brillo propio sale de la misma textura: también se tiñe, o el castaño volvería por encima)
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GLSL)
      // (después de la textura y de lo que ya tiña la ropa: el pelo pelirrojo no puede tomarse por el pañuelo rojo)
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = noHair(diffuseColor.rgb);')
      .replace('#include <emissivemap_fragment>', THREE.ShaderChunk.emissivemap_fragment).replace(EMI, (l) => l + '\n emissiveColor.rgb = noHair(emissiveColor.rgb);');
  };
  m.customProgramCacheKey = () => (key ? key.call(m) : '') + '+pelo';
  m.needsUpdate = true;
  return m;
}
// ---- el pelo de las chicas (src/actors/chicas.js): mallas aparte con una textura gris cálida de mechones; el color lo
// pone el material, multiplicando ----
// (media de esa textura en lineal: tools/blender/chicas/texpelo.py)
const PELO_MEDIA = [0.528, 0.449, 0.377];
/** El brillo propio de los personajes de Meshy en el pelo de una chica, con su color ya teñido (la textura es gris). */
export function peloEmisivo(m) {
  fillMaterial(m, 0.3);
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = emissive * diffuseColor.rgb;'); };
  m.customProgramCacheKey = () => 'chica-pelo';
  return m;
}
/** Pone el color de pelo (como se ve en el juego) en el material de las mallas del pelo de una chica. */
export function peloMaterial(m, color) {
  const a = albedo(color).map(v => Math.pow(v, 2.2));
  m.color.setRGB(a[0] / PELO_MEDIA[0], a[1] / PELO_MEDIA[1], a[2] / PELO_MEDIA[2]);
  return m;
}
/** Tiñe el pelo de un personaje: el pintado en su textura y, si es una chica, sus mallas de pelo. Con materiales propios
 *  (los clones de un modelo los comparten). */
export function hairTint(root, model, color) {
  if (color) root.traverse(o => {
    if (o.userData.peloColor) { o.material = peloMaterial(peloEmisivo(o.material.clone()), color); o.material.userData.own = true; return; }
    if (o.userData.pelo || !o.isSkinnedMesh || !o.material?.map) return;
    const m = o.material.clone(); m.userData.own = true; if (o.material.userData.fillK != null) fillMaterial(m, o.material.userData.fillK);
    o.material = hairMaterial(sharpMap(m), o.geometry, model, color);   // (own: GlbChar.dispose lo suelta con el personaje)
  });
}

// ---- el pelo de los vecinos de Meshy (actors/npcGlb.js): su máscara va en el alfa de su textura (tools/vecinos-pelo.mjs)
// y el tono de cada píxel se conserva respecto al brillo típico del pelo de ese modelo (peloVecinos.json) ----
const GLSL_V = `uniform vec3 uPeloC; uniform float uPeloRef;
vec3 conPelo(vec3 c, float a){
  if (a < 0.03) return c;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 o = uPeloC * clamp(pow(l / uPeloRef, 0.85), 0.4, 1.9);
  return mix(c, o, smoothstep(0.03, 0.7, a));
}`;
/** Tiñe el pelo de un vecino de Meshy (m: material ya propio de este vecino; rgb: el color nuevo, en lineal, tal como
 *  está pintado en la textura de otro vecino; ref: brillo típico de su propio pelo, en lineal). */
export function peloVecino(m, rgb, ref) {
  if (!rgb || !m.map) return m;
  const U = { uPeloC: { value: new THREE.Vector3(...rgb) }, uPeloRef: { value: Math.max(0.004, ref || 0.05) } };
  const prev = m.onBeforeCompile, key = m.customProgramCacheKey;
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r); Object.assign(sh.uniforms, U);
    // (la máscara es el alfa de la textura, de 1 sin pelo a 0,5 todo pelo: se lee justo después de pintarla y se deja la
    // opacidad como estaba)
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GLSL_V)
      .replace('#include <color_fragment>', 'float mzPelo = clamp((1.0 - diffuseColor.a) * 2.0, 0.0, 1.0); diffuseColor.a = opacity;\n#include <color_fragment>\n diffuseColor.rgb = conPelo(diffuseColor.rgb, mzPelo);')
      .replace('#include <emissivemap_fragment>', THREE.ShaderChunk.emissivemap_fragment).replace(EMI, (l) => l + '\n emissiveColor.rgb = conPelo(emissiveColor.rgb, clamp((1.0 - emissiveColor.a) * 2.0, 0.0, 1.0));');
  };
  m.customProgramCacheKey = () => (key ? key.call(m) : '') + '+peloV';
  m.needsUpdate = true;
  return m;
}
