// Ropa propia de cada vecino sobre los personajes de Meshy: el mismo modelo (pastor, sanferminero, pelotari o futbolista)
// con la camisa, el pantalón, el chaleco y el pañuelo del color de su «look», el pelo de su color (hairColor.js) y,
// encima, las prendas que le tocan (falda y melena, barba, delantal, makila). Así el sabio, la tendera y los vecinos
// son personas distintas y no copias del protagonista.
// Cada zona de la ropa se reconoce en el sombreador por su color en la textura y por su altura en el cuerpo (en la
// pose de reposo): tools/tmp/uvdump.mjs y el estudio de colores por franjas de altura de cada modelo. El sombreado
// pintado se conserva: el color nuevo toma el brillo del original.
import * as THREE from 'three';
import { fillMaterial, sharpMap } from '../engine/charLight.js';
import { hairMaterial, peloMaterial, peloEmisivo } from './hairColor.js';

const HSV = `
vec3 noHsv(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)); vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); return vec3(abs(q.z+(q.w-q.y)/(6.*d+1e-10)),d/(q.x+1e-10),q.x); }
vec3 noRgb(vec3 c){ vec3 p=abs(fract(c.xxx+vec3(1.,2./3.,1./3.))*6.-3.); return c.z*mix(vec3(1.),clamp(p-1.,0.,1.),c.y); }
// el color nuevo (HSV) con el brillo del píxel original respecto al brillo típico de esa prenda
vec3 noTone(vec4 t, float v, float ref){ return noRgb(vec3(t.x, t.y, clamp(t.z * v / ref, 0., 1.))); }
`;
// zonas de cada modelo: h, s, v del píxel (en sRGB) e y, su altura (0 los pies, 1 lo alto de la cabeza)
const ZONES = {
  pastor: `
    bool white = s < 0.16 && v > 0.45, red = (h < 0.05 || h > 0.9) && s > 0.5;
    if (y > 0.36 && y < 0.66 && white && uShirt.w > 0.) return noTone(uShirt, v, 0.76);
    if (y > 0.36 && y < 0.64 && red && v < 0.45 && uVest.w > 0.) return noTone(uVest, v, 0.26);
    if (y > 0.55 && y < 0.71 && red && v >= 0.45 && uAcc.w > 0.) return noTone(uAcc, v, 0.7);
    if (y > 0.16 && y < 0.37 && v < 0.34 && s > 0.35 && uPants.w > 0.) return noTone(uPants, v, 0.22);`,
  sanfermin: `
    bool white = s < 0.16 && v > 0.45, red = (h < 0.05 || h > 0.93) && s > 0.6 && v > 0.35;
    if (y > 0.36 && y < 0.67 && white && uShirt.w > 0.) return noTone(uShirt, v, 0.76);
    if (y > 0.075 && y <= 0.36 && white && uPants.w > 0.) return noTone(uPants, v, 0.76);
    if (y < 0.7 && red && uAcc.w > 0.) return noTone(uAcc, v, 0.76);`,
  pelotari: `
    bool white = s < 0.16 && v > 0.45, blue = h > 0.5 && h < 0.72 && s > 0.4;
    if (y > 0.36 && y < 0.7 && blue && uShirt.w > 0.) return noTone(uShirt, v, 0.65);
    if (y > 0.07 && y <= 0.36 && white && uPants.w > 0.) return noTone(uPants, v, 0.76);`,
  osasuna: `
    bool red = (h < 0.05 || h > 0.93) && s > 0.6 && v > 0.35, navy = h > 0.55 && h < 0.78 && s > 0.3 && v < 0.45;
    if (y > 0.36 && y < 0.66 && red && uShirt.w > 0.) return noTone(uShirt, v, 0.78);
    if (y > 0.12 && y < 0.42 && navy && uPants.w > 0.) return noTone(uPants, v, 0.24);`,
};
// LA EQUIPACIÓN QUE ELIGE EL JUGADOR PARA SU PELOTARI (pelota/kit.js; el autor, 18 de noviembre de 2026: «una de las
// personalizaciones son las zapatillas, las muñequeras y la faja o fajín»). Sin tocar los modelos: como la camiseta, se
// pinta en el sombreador, y cada pieza se reconoce por dónde cae en el cuerpo en la pose de reposo (vNoP), medido en el
// esqueleto de cada modelo (kitMedidas), porque los 22 están ajustados a su caja y no miden lo mismo (un moño sube la
// caja y todo lo demás queda más abajo):
//   - la faja: una banda a la altura de la cintura, entre la cadera y el primer hueso de la espalda, solo en el tronco
//     (los brazos, que en la pose de reposo caen a esa altura, quedan fuera por su distancia al eje)
//   - las muñequeras: un tramo del antebrazo pegado a la muñeca, a cada lado
//   - las zapatillas: lo claro por debajo del tobillo (la suela y los cordones, más oscuros, se quedan como están)
// La faja y las muñequeras van de color liso (la luz de la escena ya les da volumen), algo más oscuras donde el dibujo
// lo era; las zapatillas conservan su sombreado pintado.
const KIT = `
    if (uSash.w > 0. && abs(y - uPwaist.x) < uPwaist.y && abs(vNoP.x) < uPwaist.z) return uSash.rgb * (0.8 + 0.2 * v);
    if (uWrist.w > 0. && (noBanda(vNoP, uPwL, uPeL) || noBanda(vNoP, uPwR, uPeR))) return uWrist.rgb * (0.86 + 0.14 * v);
    if (uShoes.w > 0. && y < uPfoot && s < 0.24 && v > 0.42) return noTone(uShoes, v, 0.9);`;
// el futbolista de blanco (la segunda equipación): camiseta blanca y pantalón oscuro
ZONES.osasuna_fuera = `
    bool white = s < 0.16 && v > 0.45, dark = v < 0.45 && (s > 0.3 || v < 0.2);
    if (y > 0.43 && y < 0.66 && white && uShirt.w > 0.) return noTone(uShirt, v, 0.76);   // (más abajo, las manos claras)
    if (y > 0.12 && y < 0.42 && dark && uPants.w > 0.) return noTone(uPants, v, 0.24);`;
ZONES.pelotari_rojo = ZONES.pelotari;
// (los de siempre, uno por nombre de la plantilla: la misma ropa; de colorado, su camiseta azul teñida, como la pelotari)
// (su camiseta baja algo más que la del pelotari y, con moño o coleta alta, queda más abajo en la altura total: con la
// franja del pelotari se quedaba una tira azul en el bajo)
for (const n of ['inigo', 'unai', 'mikel', 'aitor', 'inaki', 'ander', 'xabier', 'jokin', 'ekaitz', 'julen', 'asier', 'oihana', 'garazi', 'maialen', 'amaia', 'irati', 'nahia', 'nerea', 'leire', 'ane', 'miren', 'uxue']) ZONES['pelotari_' + n] = `
    bool blue = h > 0.5 && h < 0.72 && s > 0.4;
    ${KIT}
    if (y > 0.2 && y < 0.72 && blue && uShirt.w > 0.) return noTone(uShirt, v, 0.65);`;
// el juez (el futbolista, todo de negro): también el rojo de los bordes y de las sombras, el de las medias y las
// zapatillas. Con solo el rojo vivo de la camiseta quedaban motas rojas sobre el negro y las zapatillas rojas. El rojo
// apagado, solo si es oscuro: la piel, del mismo tono pero clara, no se toca; la cara queda por encima
// En la cabeza, la textura trae también motas de rojo vivo en el pelo y en el cuello que el tinte del pelo no cogía (no
// son castañas): pasan al castaño del pelo pintado y el tinte del pelo (hairColor.js, que va después) les da su color
ZONES.osasuna_juez = `
    bool red = (h < 0.045 || h > 0.9) && ((s > 0.6 && v > 0.15) || (s > 0.28 && v < 0.6)), navy = h > 0.55 && h < 0.8 && s > 0.2 && v < 0.5;
    if (y < 0.66 && red && uShirt.w > 0.) return noTone(uShirt, v, 0.78);
    if (y >= 0.66 && red) return vec3(0.17, 0.11, 0.08) * clamp(v / 0.7, 0.5, 1.2);
    if (y > 0.1 && y < 0.42 && navy && uPants.w > 0.) return noTone(uPants, v, 0.24);`;

// color del «look» → HSV (w = 1: se cambia; sin color, w = 0 y la prenda queda como está)
const hsv = (c) => { if (!c) return new THREE.Vector4(0, 0, 0, 0); const o = new THREE.Color(c); const r = o.r, g = o.g, b = o.b;   // (getHex/r,g,b en lineal: se pasan a sRGB)
  const s = (x) => Math.pow(Math.max(0, x), 1 / 2.2), R = s(r), G = s(g), B = s(b), mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
  let h = 0; if (d > 1e-5) h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4; h = ((h / 6) % 1 + 1) % 1;
  return new THREE.Vector4(h, mx > 0 ? d / mx : 0, mx, 1); };

// (color liso, en sRGB, con w = 1 si se pone)
const liso = (c) => { if (!c) return new THREE.Vector4(0, 0, 0, 0); const o = new THREE.Color(c), g = (x) => Math.pow(Math.max(0, x), 1 / 2.2); return new THREE.Vector4(g(o.r), g(o.g), g(o.b), 1); };
// dónde caen la cintura, las muñecas y los tobillos de un modelo, en su pose de reposo y en las unidades de su malla
function kitMedidas(o, bb) {
  const sk = o.skeleton, H = Math.max(1e-3, bb.max.y - bb.min.y), M = new THREE.Matrix4();
  const de = (re) => { const i = sk.bones.findIndex(b => re.test(b.name)); return i < 0 ? null : new THREE.Vector3().setFromMatrixPosition(M.copy(sk.boneInverses[i]).invert()); };
  const yn = (v) => (v.y - bb.min.y) / H;
  const cad = de(/Hips$/), esp = de(/Spine$/), pie = de(/LeftFoot$/), mus = de(/LeftUpLeg$/), mL = de(/LeftHand$/), cL = de(/LeftForeArm$/), mR = de(/RightHand$/), cR = de(/RightForeArm$/);
  if (!cad || !esp || !pie || !mus || !mL || !cL || !mR || !cR) return null;
  return { uPwaist: new THREE.Vector3(yn(cad) + (yn(esp) - yn(cad)) * 0.62, 0.026, Math.abs(mus.x) * 2), uPfoot: yn(pie) * 0.86, uPwL: mL, uPeL: cL, uPwR: mR, uPeR: cR };
}
/** Tiñe la ropa y el pelo de un vecino de Meshy. model: nombre del modelo; O: { shirt, pants, vest, acc, hair } y, en los
 *  pelotaris de siempre, la equipación: { shoes, wrist, sash }. Devuelve sus colores (uShirt, uShoes…) para cambiarlos
 *  luego sin rehacer el material (ponKitColores). */
export function outfitTint(root, model, O) {
  const Z = ZONES[model]; if (!Z) return;
  const U = { uShirt: hsv(O.shirt), uPants: hsv(O.pants), uVest: hsv(O.vest), uAcc: hsv(O.acc), uShoes: hsv(O.shoes), uWrist: liso(O.wrist), uSash: liso(O.sash) };
  const conKit = /^pelotari_.+/.test(model) && model !== 'pelotari_rojo';
  root.traverse(o => {
    // (el pelo de las chicas va en sus propias mallas: solo toma su color)
    if (o.userData.peloColor) { if (O.hair) { o.material = peloMaterial(peloEmisivo(o.material.clone()), O.hair); o.material.userData.own = true; } return; }
    if (o.userData.pelo || !o.isSkinnedMesh || !o.material?.map) return;
    const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox, kit = new THREE.Vector2(bb.min.y, Math.max(1e-3, bb.max.y - bb.min.y));
    const m = o.material.clone(); if (o.material.userData.fillK != null) fillMaterial(m, o.material.userData.fillK);
    // (sin esqueleto reconocible, la equipación no se pone: las medidas, fuera del cuerpo)
    const K = (conKit && kitMedidas(o, bb)) || { uPwaist: new THREE.Vector3(-9, 0, 0), uPfoot: -9, uPwL: new THREE.Vector3(99, 99, 99), uPeL: new THREE.Vector3(99, 98, 99), uPwR: new THREE.Vector3(99, 99, 99), uPeR: new THREE.Vector3(99, 98, 99) };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, Object.fromEntries(Object.entries(U).map(([k, v]) => [k, { value: v }])), { uKitY: { value: kit } }, Object.fromEntries(Object.entries(K).map(([k, v]) => [k, { value: v }])));
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vNoY; varying vec3 vNoP; uniform vec2 uKitY;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvNoY = (position.y - uKitY.x) / uKitY.y; vNoP = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec4 uShirt, uPants, uVest, uAcc, uShoes, uWrist, uSash; uniform vec3 uPwaist, uPwL, uPeL, uPwR, uPeR; uniform float uPfoot; varying float vNoY; varying vec3 vNoP;
// (¿cae el punto en la muñequera? un tramo del antebrazo, de la muñeca w hacia el codo e, y cerca de su eje)
bool noBanda(vec3 p, vec3 w, vec3 e){ vec3 d = e - w; float L = length(d); d /= L; vec3 q = p - w; float t = dot(q, d); return t > 0.03 * L && t < 0.44 * L && length(q - d * t) < 0.52 * L; }
${HSV}
vec3 noOutfit(vec3 lin){
  vec3 cs = pow(max(lin, vec3(0.)), vec3(0.4545)); vec3 q = noHsv(cs); float h = q.x, s = q.y, v = q.z, y = vNoY;
  ${Z}
  return cs;
}`).replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = pow(noOutfit(diffuseColor.rgb), vec3(2.2));')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = emissive * diffuseColor.rgb;');
    };
    m.customProgramCacheKey = () => 'npc-outfit-' + model;
    o.material = hairMaterial(sharpMap(m), g, model, O.hair);   // la textura sin mezclar sus piezas y el pelo, con su tinte (hairColor.js)
  });
  return U;
}
/** Cambia la equipación de un pelotari ya teñido (U: lo que devolvió outfitTint), sin rehacer nada */
export function ponKitColores(U, O = {}) { if (!U) return; U.uShoes.copy(hsv(O.shoes)); U.uWrist.copy(liso(O.wrist)); U.uSash.copy(liso(O.sash)); }

/** Proporciones de adulto (la cabeza algo menor que la del protagonista, que es un niño) y de persona mayor. */
export function adultBody(char, L) {
  if (L.child) return null;
  let head = null; char.root.traverse(o => { if (o.isBone && /Head$/.test(o.name) && !head) head = o; });
  if (!head || head.userData.cabK) return null;   // (con las proporciones de glbChar.js, CABEZA, ya tiene la suya)
  const k = L.old ? 0.9 : 0.87;
  return () => { head.scale.setScalar(k); };
}
