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
import { fillMaterial } from '../engine/charLight.js';

// brillo típico del pelo pintado de cada modelo (luma en sRGB, la mediana de los píxeles de pelo); el pastor lleva
// boina negra: en él, lo casi negro y lo que queda por encima del ala (91 % de la altura) es boina y no pelo
const REF = { sanfermin: 0.056, pastor: -0.115, osasuna: 0.119, osasuna_fuera: 0.112, pelotari: 0.08, pelotari_rojo: 0.087 };

/** Colores de pelo con sus nombres (los vecinos sin color propio y los jugadores toman uno de aquí), como se ven en
 *  el juego. */
export const HAIR_COLORS = { negro: '#171312', castano: '#553321', castanoClaro: '#8a5a34', cobrizo: '#793018', pelirrojo: '#b0491e', rubioOscuro: '#aa844d', rubio: '#eabc67', canoso: '#968f87', blanco: '#dbd6cb' };
// el color se da como se quiere ver y se pasa al de la textura: la luz del juego (sol, cielo y el relleno de los
// personajes) aclara mucho los oscuros (el castaño oscuro de siempre es casi negro en la textura) y poco los claros
function albedo(color) {
  const c = new THREE.Color(color), K = 2 + 1.8 * (1 - (0.3 * c.r + 0.59 * c.g + 0.11 * c.b));   // (Color guarda lineal)
  return [c.r, c.g, c.b].map(v => Math.pow(v / K, 1 / 2.2));
}
/** El color de material para lo que lleve el mismo pelo encima (la melena, el moño): así se ve igual que el teñido. */
export const hairShade = (color) => '#' + albedo(color).map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
// reparto de los jóvenes y adultos (más morenos y castaños, algún rubio y pocos pelirrojos); null: el suyo de siempre
const POOL = [null, null, null, 'negro', 'negro', 'negro', 'castano', 'castano', 'castano', 'castanoClaro', 'castanoClaro', 'rubioOscuro', 'rubio', 'cobrizo', 'pelirrojo'];
/** Un color de pelo fijo para un número (el dorsal, el nombre): siempre el mismo para el mismo personaje. */
export function hairFor(seed) {
  const k = POOL[(Math.imul(seed, 2654435761) >>> 0) % 997 % POOL.length];
  return k ? HAIR_COLORS[k] : null;
}
/** Número de un texto (para hairFor con un nombre). */
export const seedOf = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

const GLSL = `uniform vec3 uHairC; uniform vec2 uHairK; varying vec3 vHairP;
vec3 noHair(vec3 lin){
  vec3 c = pow(max(lin, vec3(0.)), vec3(0.4545)), p = vHairP;
  float mx = max(c.r, max(c.g, c.b)), l = dot(c, vec3(0.3, 0.59, 0.11)), w = smoothstep(0.16, 0.3, (c.r - c.b) / max(c.r, 0.004)) * step(c.b, c.g + 0.03);
  // lo casi negro (el fondo de los surcos y las juntas de la textura) también es pelo, salvo con boina
  w = uHairK.x > 0. ? max(w, 1. - smoothstep(0.025, 0.04, mx)) : w * smoothstep(0.3, 0.42, l / -uHairK.x) * (1. - smoothstep(0.89, 0.91, p.y));
  float k = smoothstep(0.665, 0.69, p.y) * w * (1. - smoothstep(0.36, 0.5, mx));
  float fr = smoothstep(0.02, 0.045, p.z), ax = abs(p.x);
  k *= 1. - fr * (1. - smoothstep(0.088, 0.098, ax)) * (1. - smoothstep(0.815, 0.826, p.y));
  if (k <= 0.) return lin;
  // (sin bajar del 70 %: las juntas de la textura y el fondo de los surcos, casi negros, eran rayas oscuras en el pelo claro;
  // sin pasar del 120 %: los brillos, a pleno sol, se quemaban a blanco)
  vec3 o = uHairC * pow(clamp(l / abs(uHairK.x), 0.7, 1.2), 1.5);
  o *= 1. - uHairK.y * fr * (1. - smoothstep(0.09, 0.1, ax)) * (1. - smoothstep(0.86, 0.875, p.y));
  return mix(lin, pow(clamp(o, 0., 1.), vec3(2.2)), k);
}`;
const EMI = 'vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );';

/** Tiñe el pelo de un material (que ya sea propio de este personaje: no se clona). geo: la geometría de la malla. */
export function hairMaterial(m, geo, model, color) {
  if (!color || !m.map) return m;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const b = geo.boundingBox, H = Math.max(1e-3, b.max.y - b.min.y);
  const a = albedo(color), lit = Math.max(...a);
  const U = { uHairC: { value: new THREE.Vector3(...a) }, uHairK: { value: new THREE.Vector2(REF[model] || 0.09, 0.6 * lit) },
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
      .replace('#include <emissivemap_fragment>', THREE.ShaderChunk.emissivemap_fragment).replace(EMI, EMI + '\n emissiveColor.rgb = noHair(emissiveColor.rgb);');
  };
  m.customProgramCacheKey = () => (key ? key.call(m) : '') + '+pelo';
  m.needsUpdate = true;
  return m;
}
/** Tiñe el pelo de todas las mallas de un personaje, con materiales propios (los clones de un modelo los comparten). */
export function hairTint(root, model, color) {
  if (color) root.traverse(o => { if (o.isSkinnedMesh && o.material?.map) {
    const m = o.material.clone(); m.userData.own = true; if (o.material.userData.fillK != null) fillMaterial(m, o.material.userData.fillK);
    o.material = hairMaterial(m, o.geometry, model, color);   // (own: GlbChar.dispose lo suelta con el personaje)
  } });
}
