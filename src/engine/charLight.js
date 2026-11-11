// Luz propia (relleno) de personajes, animales y plantas. De día les da un poco de su propio color para que no se vean
// siempre en sombra (la cámara va detrás y el sol suele darles de frente). Esa luz sigue a la del cielo: al atardecer
// baja y se vuelve anaranjada, de noche es tenue y azulada como la luna (manda la luz de verdad) y junto a una farola se
// calienta. Solo cuenta mientras se dibuja el pueblo: los menús, los retratos y las escenas propias (el fútbol, la
// pelota, el encierro, los minijuegos) lo ven neutro, como siempre.
import * as THREE from 'three';

/** Uniforme compartido por los sombreadores (personajes, animales, flora): color por el que se multiplica su relleno. */
const CHAR_FILL = { value: new THREE.Color(1, 1, 1) };
const MATS = new Set(), WHITE = new THREE.Color(1, 1, 1), tmp = new THREE.Color();

/** Material que se rellena con su color emisivo (personajes de Meshy, ojos pintados): k = cuánto a pleno día. */
export function fillMaterial(m, k) { m.userData.fillK = k; MATS.add(m); m.emissive.copy(CHAR_FILL.value).multiplyScalar(k); pintado(m); }

// ---------- Pintura: el sombreado de gouache de personajes y animales ----------
// En el pueblo, la luz del sol sobre un personaje no se funde de claro a oscuro como en una foto: cae en cuatro tonos
// (sombra, penumbra, media tinta y luz) con el paso suave, como pintado a pincel, y el perfil del lado del sol se
// enciende con su color (luz de borde: cálida al atardecer, plateada con la luna). La sombra no es negra: la colorea la
// luz del cielo, que no se toca. Fuera del pueblo (menús, retratos, fútbol, pelota, minijuegos) vale 0 y todo se ve
// como siempre: cada escena tiene sus luces.
const PINTURA = { value: 0 };
const PINTA_DECL = '\nuniform float uPintura;';
const PINTA = `
#if NUM_DIR_LIGHTS > 0
  if (uPintura > 0.0) {
    float pNL = dot(geometryNormal, directionalLights[0].direction), pS = max(pNL, 0.0);
    float pQ = 0.5 * smoothstep(0.0, 0.14, pS) + 0.3 * smoothstep(0.4, 0.54, pS) + 0.2 * smoothstep(0.78, 0.9, pS);
    reflectedLight.directDiffuse *= mix(1.0, pQ / max(pS, 0.06), uPintura);
    float pF = 1.0 - saturate(dot(geometryNormal, geometryViewDir));
    reflectedLight.directDiffuse += directionalLights[0].color * diffuseColor.rgb * (pF * pF * pF * smoothstep(-0.25, 0.5, pNL) * 0.16 * uPintura);
  }
#endif`;
/** Añade la pintura a un sombreador (en onBeforeCompile, después de lo demás). Vale para los materiales con luces
 *  (estándar, Lambert, Phong); en otro, no hace nada. */
export function pintura(sh) {
  if (sh.uniforms.uPintura || !sh.fragmentShader.includes('#include <lights_fragment_end>')) return;
  sh.uniforms.uPintura = PINTURA;
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>' + PINTA_DECL).replace('#include <lights_fragment_end>', '#include <lights_fragment_end>' + PINTA);
}
/** Un material sin sombreador propio (los personajes de Meshy, sus trajes y su pelo): se le pone la pintura. */
function pintado(m) {
  if (m.userData.pintado || !m.isMeshStandardMaterial) return; m.userData.pintado = true;
  const antes = m.onBeforeCompile;
  m.onBeforeCompile = function (sh, r) { antes?.call(this, sh, r); pintura(sh); };
  const clave = m.customProgramCacheKey?.bind(m); m.customProgramCacheKey = () => (clave ? clave() : '') + '|pintura';
}

// ---------- La textura de los personajes de Meshy, sin mezclar sus piezas ----------
// Meshy reparte la textura en unas dos mil piezas muy pequeñas (la mitad, de unos 10 × 10 px en la de 2048), pegadas a
// otras de otro color, y la tarjeta las mezclaba de dos maneras (en el partido, de lejos, el pelo moteado de claro y la
// camiseta desteñida con motas blancas; noviembre de 2026):
//  · con el suavizado de bordes (MSAA, el del móvil), los píxeles del borde de cada triángulo leían la textura un poco
//    fuera de él, en la pieza de al lado: puntitos claros en fila. La UV se lee en el centro de lo que cubre el triángulo
//    (centroid);
//  · de lejos, los niveles de detalle menores de la textura juntan las piezas vecinas. No se baja de 512 px: más lejos se
//    lee algo granulada, pero cada pieza con su color.
// (Antes, un sesgo de -0,7 en la lectura que no llegaba a ponerse: buscaba un texto que aún no estaba en el sombreador)
const CENTROID = (s) => s.replace(/varying vec2 v(Map|EmissiveMap)Uv;/g, 'centroid varying vec2 v$1Uv;');
const MZ_TEX = `
vec4 mzTex(sampler2D s, vec2 uv) {
  vec2 sz = vec2(textureSize(s, 0)), dx = dFdx(uv), dy = dFdy(uv);
  float l = 0.5 * log2(max(max(dot(dx * sz, dx * sz), dot(dy * sz, dy * sz)), 1e-8)), lmax = max(0., log2(sz.x) - 9.);
  float k = exp2(min(0., lmax - l));
  return textureGrad(s, uv, dx * k, dy * k);
}`;
const NITIDO = new WeakSet();   // (y no userData: las copias de un material, que lo copian, se quedan sin el sombreador)
/** Lee la textura de un personaje de Meshy sin mezclar sus piezas. Va después de los tintes que buscan los trozos de
 *  la textura del sombreador (#include <map_fragment> y <emissivemap_fragment>); los que van detrás encuentran la
 *  lectura como mzTex(…). Hay que volver a ponerlo en cada copia del material. Devuelve el material. */
export function sharpMap(m) {
  if (!m.map || NITIDO.has(m)) return m; NITIDO.add(m);
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = function (sh, r) { prev?.call(this, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <uv_pars_vertex>', CENTROID(THREE.ShaderChunk.uv_pars_vertex));
    sh.fragmentShader = sh.fragmentShader.replace('#include <uv_pars_fragment>', CENTROID(THREE.ShaderChunk.uv_pars_fragment))
      .replace('#include <common>', '#include <common>' + MZ_TEX)
      .replace('#include <map_fragment>', THREE.ShaderChunk.map_fragment).replace('#include <emissivemap_fragment>', THREE.ShaderChunk.emissivemap_fragment)
      .replace('texture2D( map, vMapUv )', 'mzTex( map, vMapUv )').replace('texture2D( emissiveMap, vEmissiveMapUv )', 'mzTex( emissiveMap, vEmissiveMapUv )');
  };
  const key = m.customProgramCacheKey?.bind(m); m.customProgramCacheKey = () => (key ? key() : '') + '|nitido';
  m.needsUpdate = true;
  return m;
}

// ---------- Contorno: la línea fina que recorta al personaje del jugador ----------
// Una segunda piel del mismo modelo, un poco más gorda y vuelta del revés (solo se ven sus caras de atrás), de color
// tinta: asoma por el borde como una línea de dibujo. Sigue al esqueleto, así que se mueve con él. Cuesta dibujar el
// personaje dos veces: solo para el jugador y solo en calidad media y alta.
const TINTA = new THREE.Color('#2b1d1a');
let CONT_MAT = null;
function contMat() {
  if (CONT_MAT) return CONT_MAT;
  CONT_MAT = new THREE.MeshBasicMaterial({ color: TINTA, side: THREE.BackSide });
  CONT_MAT.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aGrosor;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * aGrosor;'); };
  return CONT_MAT;
}
/** Pone contorno a las mallas de un personaje (grosor en metros del mundo). Devuelve las mallas añadidas. */
export function contorno(root, grosor = 0.008) {
  const out = []; root.updateMatrixWorld(true);
  // cuánto mide una unidad de la geometría en el mundo: con esqueleto, la escala de la malla no lo dice (los huesos
  // llevan la suya), así que se compara lo que mide el personaje de verdad con lo que mide su malla mayor sin colocar
  let rGeo = 0; root.traverse(o => { if (o.isMesh && o.geometry?.attributes?.position) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); rGeo = Math.max(rGeo, o.geometry.boundingSphere.radius); } });
  const caja = new THREE.Box3().setFromObject(root), rMundo = caja.isEmpty() ? 0 : caja.getSize(new THREE.Vector3()).length() / 2;
  if (!(rGeo > 0) || !(rMundo > 0)) return [];
  const g = grosor * rGeo / rMundo;
  root.traverse(o => {
    // (las piezas pequeñas pegadas al cuerpo, como los ojos pintados, no llevan línea: quedaría un cerco)
    if (!o.isMesh || o.userData.esContorno || o.userData.contorno || !o.geometry?.attributes?.normal || o.material?.transparent || o.geometry.attributes.position.count < 400) return;
    // (el grosor va en la geometría, que cada modelo tiene su escala; una geometría propia que comparte los datos)
    const geo = new THREE.BufferGeometry(); geo.index = o.geometry.index; for (const k of ['position', 'normal', 'skinIndex', 'skinWeight']) if (o.geometry.attributes[k]) geo.setAttribute(k, o.geometry.attributes[k]);
    geo.setAttribute('aGrosor', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count).fill(g), 1)); geo.boundingSphere = o.geometry.boundingSphere; geo.boundingBox = o.geometry.boundingBox;
    const c = o.isSkinnedMesh ? new THREE.SkinnedMesh(geo, contMat()) : new THREE.Mesh(geo, contMat());
    if (o.isSkinnedMesh) c.bind(o.skeleton, o.bindMatrix);
    c.frustumCulled = o.frustumCulled; c.userData.esContorno = true; c.name = 'contorno';   // (hija de su malla: va con ella y se esconde con ella)
    o.userData.contorno = c; out.push([o, c]);
  });
  for (const [o, c] of out) o.add(c);
  return out.map(x => x[1]);
}

/** Pone el relleno antes de dibujar el pueblo (con null, el neutro de siempre). */
export function applyCharFill(c) {
  CHAR_FILL.value.copy(c || WHITE); PINTURA.value = c ? 1 : 0;
  for (const m of MATS) m.emissive.copy(CHAR_FILL.value).multiplyScalar(m.userData.fillK);
}

// A mediodía el cielo más la mitad del sol (lo que llega de lado) suman unos 2,2: ahí el relleno vale 1
const DAY = 2.2;
/** Relleno según la luz del cielo (hemisferio y sol o luna); de noche, algo menos, para que se lean la luna y las
 *  sombras. Nunca más que a pleno día. */
export function skyFill(out, hemi, sun, night) {
  out.copy(hemi.color).multiplyScalar(hemi.intensity).add(tmp.copy(sun.color).multiplyScalar(sun.intensity * 0.5)).multiplyScalar((1 - 0.4 * night) / DAY);
  const m = Math.max(out.r, out.g, out.b); if (m > 1) out.multiplyScalar(1 / m);
  return out;
}
const LAMP = new THREE.Color('#ffb866');
/** Una farola cerca (k de 0 a 1): el relleno se calienta con su luz. */
export function lampFill(out, k) { if (k > 0.001) out.add(tmp.copy(LAMP).multiplyScalar(0.7 * k)); return out; }

/** Trozo de sombreador: declara el uniforme (va tras #include <common> del fragmento). */
export const FILL_DECL = '\nuniform vec3 uCharFill;';
/** Añade el uniforme a un sombreador en onBeforeCompile. */
export const useFill = (sh) => { sh.uniforms.uCharFill = CHAR_FILL; };
