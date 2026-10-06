// Ropa propia de cada vecino sobre los personajes de Meshy: el mismo modelo (pastor, sanferminero, pelotari o futbolista)
// con la camisa, el pantalón, el chaleco y el pañuelo del color de su «look», el pelo de su color y, encima, las
// prendas que le tocan (falda y melena, barba, delantal, makila). Así el sabio, la tendera y los vecinos son personas
// distintas y no copias del protagonista.
// Cada zona de la ropa se reconoce en el sombreador por su color en la textura y por su altura en el cuerpo (en la
// pose de reposo): tools/tmp/uvdump.mjs y el estudio de colores por franjas de altura de cada modelo. El sombreado
// pintado se conserva: el color nuevo toma el brillo del original.
import * as THREE from 'three';
import { fillMaterial } from '../engine/charLight.js';

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
// el futbolista de blanco (la segunda equipación): camiseta blanca y pantalón oscuro
ZONES.osasuna_fuera = `
    bool white = s < 0.16 && v > 0.45, dark = v < 0.45 && (s > 0.3 || v < 0.2);
    if (y > 0.43 && y < 0.66 && white && uShirt.w > 0.) return noTone(uShirt, v, 0.76);   // (más abajo, las manos claras)
    if (y > 0.12 && y < 0.42 && dark && uPants.w > 0.) return noTone(uPants, v, 0.24);`;
ZONES.pelotari_rojo = ZONES.pelotari;

// color del «look» → HSV (w = 1: se cambia; sin color, w = 0 y la prenda queda como está)
const hsv = (c) => { if (!c) return new THREE.Vector4(0, 0, 0, 0); const o = new THREE.Color(c); const r = o.r, g = o.g, b = o.b;   // (getHex/r,g,b en lineal: se pasan a sRGB)
  const s = (x) => Math.pow(Math.max(0, x), 1 / 2.2), R = s(r), G = s(g), B = s(b), mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
  let h = 0; if (d > 1e-5) h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4; h = ((h / 6) % 1 + 1) % 1;
  return new THREE.Vector4(h, mx > 0 ? d / mx : 0, mx, 1); };

/** Tiñe la ropa y el pelo de un vecino de Meshy. model: nombre del modelo; O: { shirt, pants, vest, acc, hair }. */
export function outfitTint(root, model, O) {
  const Z = ZONES[model]; if (!Z) return;
  const U = { uShirt: hsv(O.shirt), uPants: hsv(O.pants), uVest: hsv(O.vest), uAcc: hsv(O.acc), uHair: new THREE.Color(O.hair || '#000'), uHairOn: O.hair ? 1 : 0 };
  root.traverse(o => {
    if (!o.isSkinnedMesh || !o.material?.map) return;
    const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox, kit = new THREE.Vector2(bb.min.y, Math.max(1e-3, bb.max.y - bb.min.y));
    const m = o.material.clone(); if (o.material.userData.fillK != null) fillMaterial(m, o.material.userData.fillK);
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, Object.fromEntries(Object.entries(U).map(([k, v]) => [k, { value: v }])), { uKitY: { value: kit } });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vNoY; uniform vec2 uKitY;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvNoY = (position.y - uKitY.x) / uKitY.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec4 uShirt, uPants, uVest, uAcc; uniform vec3 uHair; uniform float uHairOn; varying float vNoY;
${HSV}
vec3 noOutfit(vec3 lin){
  vec3 cs = pow(max(lin, vec3(0.)), vec3(0.4545)); vec3 q = noHsv(cs); float h = q.x, s = q.y, v = q.z, y = vNoY;
  // pelo: castaño oscuro y rojizo (más rojo que verde, poco azul) en la cabeza; la boina negra y los ojos no
  if (uHairOn > 0.5 && y > 0.68 && cs.r > cs.g * 1.25 && cs.b < cs.r * 0.6 && v < 0.4) { vec3 t = pow(uHair, vec3(0.4545)); return t * clamp(v / 0.2, 0.35, 1.6); }
  ${Z}
  return cs;
}`).replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = pow(noOutfit(diffuseColor.rgb), vec3(2.2));')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = emissive * diffuseColor.rgb;');
    };
    m.customProgramCacheKey = () => 'npc-outfit-' + model;
    o.material = m;
  });
}

/** Proporciones de adulto (la cabeza algo menor que la del protagonista, que es un niño) y de persona mayor. */
export function adultBody(char, L) {
  if (L.child) return null;
  let head = null; char.root.traverse(o => { if (o.isBone && /Head$/.test(o.name) && !head) head = o; });
  if (!head) return null;
  const k = L.old ? 0.9 : 0.87;
  return () => { head.scale.setScalar(k); };
}
