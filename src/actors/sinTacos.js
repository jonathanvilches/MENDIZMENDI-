// Las manos del pelotari sin tacos ni vendas, para jugar con herramienta (el autor, 16 de noviembre de 2026: «si la mano
// lleva herramienta, no lleva tacos en las manos»). Los pelotaris de Meshy traen las manos vendadas, con los tacos, y las
// vendas no son piezas aparte: son la propia malla de la mano, pintada de beis. Así que no se quitan; se pintan de piel.
// En el sombreador, solo en las manos y las muñecas (aTaco, un atributo de la malla) y solo lo que tiene color de venda
// (beis: bastante más verde que azul y no mucho más rojo que verde, en sRGB; la piel es rosada, la ropa blanca no
// tiene ese tono amarillo), toma el color de la piel del propio modelo, con su brillo para que no quede plana.
// El color de la piel sale de su textura: los píxeles rosados de las yemas de los dedos, que asoman de las vendas.
import * as THREE from 'three';

// (y de color: los tacos y las vendas, del color que elijas en la equipación, pelota/kit.js; uTacoCol, con w = 1 si se
// pone. Con herramienta manda la piel: no hay tacos)
// (la venda y los tacos se separan de la piel por el tono: en las texturas de los 22 la piel de las manos cae entre 10 y 20
// grados, rosada, y la venda y los tacos entre 30 y 50, dorados, beis claro o más oscuro, sin nada entre medias; medido
// en los texeles de las manos de cada modelo. Antes solo valía el beis claro y los tacos dorados quedaban sin pintar, a
// manchas. El borde, suave en 22-28 grados: limpio y sin dientes. El color, el elegido casi liso: el dibujo de la venda
// solo lo aclara u oscurece un poco, sin rayas negras)
// (y no encima de la muñequera de la equipación, que pinta antes actors/npcOutfit.js y deja kitMun a 1: es amarilla o beis
// y se tomaba por venda. Más allá del final de la venda, kitCorte a 1: con los tacos de color, la venda se corta en línea
// recta y lo de más allá, los dientes de su borde, toma el color de la piel)
const GLSL = `uniform float uSinTacos; uniform vec3 uPiel; uniform vec4 uTacoCol; varying float vTaco;
#ifndef KIT_MUN
#define KIT_MUN
float kitMun = 0.0;
float kitCorte = 0.0;
#endif
vec3 sinTaco(vec3 lin){
  if ((uSinTacos < 0.5 && uTacoCol.w < 0.5) || vTaco < 0.01 || kitMun > 0.5) return lin;
  vec3 c = pow(max(lin, vec3(0.0)), vec3(1.0 / 2.2));
  float mx = max(c.r, max(c.g, c.b)), d = mx - min(c.r, min(c.g, c.b));
  float h = (mx == c.r ? (c.g - c.b) / max(d, 1e-4) : mx == c.g ? 2.0 + (c.b - c.r) / max(d, 1e-4) : 4.0 + (c.r - c.g) / max(d, 1e-4)) * 60.0;
  h = mod(h + 360.0, 360.0);
  float k = smoothstep(22.0, 28.0, h) * (1.0 - smoothstep(62.0, 70.0, h)) * smoothstep(0.08, 0.14, d / max(mx, 1e-4)) * vTaco;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 o = uSinTacos > 0.5 || kitCorte > 0.5 ? uPiel * clamp(pow(l / 0.74, 0.8), 0.55, 1.25) : uTacoCol.rgb * clamp(pow(l / 0.72, 0.5), 0.78, 1.06);
  return mix(lin, pow(clamp(o, 0.0, 1.0), vec3(2.2)), k);
}`;
const EMI = /vec4 emissiveColor = (?:texture2D|mzTex)\( emissiveMap, vEmissiveMapUv \);/;

// (la máscara de las manos: los puntos que mueven la mano o sus dedos y, en el antebrazo, los que quedan cerca de la
// muñeca, donde acaba la venda; en la pose de reposo, una vez por geometría)
function mascara(mesh) {
  const g = mesh.geometry; if (g.attributes.aTaco) return g.attributes.aTaco;
  const P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, bs = mesh.skeleton.bones, n = P.count;
  const a = new Float32Array(n), v = new THREE.Vector3(), M = new THREE.Matrix4();
  for (const lado of ['Right', 'Left']) {
    const hi = bs.findIndex(b => new RegExp(lado + 'Hand$').test(b.name)); if (hi < 0) continue;
    const sub = new Set(); bs.forEach((b, i) => { for (let x = b; x; x = x.parent) if (x === bs[hi]) { sub.add(i); break; } });
    const W = new THREE.Vector3().setFromMatrixPosition(M.copy(mesh.skeleton.boneInverses[hi]).invert());   // (la muñeca)
    const wh = new Float32Array(n); let largo = 0;
    for (let i = 0; i < n; i++) {
      let w = 0; for (let k = 0; k < 4; k++) if (sub.has(SI.getComponent(i, k))) w += SW.getComponent(i, k);
      wh[i] = w; if (w > 0.5) largo = Math.max(largo, v.fromBufferAttribute(P, i).applyMatrix4(mesh.bindMatrix).distanceTo(W));
    }
    if (!largo) continue;
    for (let i = 0; i < n; i++) {
      if (wh[i] > 0.15) { a[i] = 1; continue; }
      const d = v.fromBufferAttribute(P, i).applyMatrix4(mesh.bindMatrix).distanceTo(W) / largo;
      if (d < 0.75) a[i] = Math.max(a[i], 1 - Math.max(0, (d - 0.55) / 0.2));
    }
  }
  g.setAttribute('aTaco', new THREE.BufferAttribute(a, 1));
  return g.attributes.aTaco;
}
// (el color de la piel, en sRGB: la media de los píxeles rosados bajo los puntos de las manos; si no se puede leer la
// textura, uno rosado claro)
const PIELES = new WeakMap();
function pielDe(mesh, map) {
  if (PIELES.has(map)) return PIELES.get(map);
  let out = new THREE.Vector3(0.93, 0.68, 0.6);
  try {
    const img = map.image, W = img?.width, H = img?.height, uv = mesh.geometry.attributes.uv, A = mesh.geometry.attributes.aTaco;
    if (W && H && uv && A) {
      const cv = document.createElement('canvas'); cv.width = Math.min(512, W); cv.height = Math.round(cv.width * H / W);
      const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0, cv.width, cv.height);
      const px = cx.getImageData(0, 0, cv.width, cv.height).data; let r = 0, g = 0, b = 0, k = 0;
      for (let i = 0; i < uv.count; i += 3) {
        if (A.getX(i) < 0.99) continue;
        let u = uv.getX(i), w = uv.getY(i); if (map.flipY) w = 1 - w;
        const x = Math.min(cv.width - 1, Math.max(0, Math.floor((u - Math.floor(u)) * cv.width))), y = Math.min(cv.height - 1, Math.max(0, Math.floor((w - Math.floor(w)) * cv.height)));
        const o = (y * cv.width + x) * 4, R = px[o] / 255, G = px[o + 1] / 255, B = px[o + 2] / 255;
        if (R - G > 0.14 && G - B < 0.12 && R > 0.45) { r += R; g += G; b += B; k++; }
      }
      if (k > 20) out = new THREE.Vector3(r / k, g / k, b / k);
    }
  } catch (e) { /* textura sin leer: el de siempre */ }
  PIELES.set(map, out);
  return out;
}

// (el material de las manos, preparado una vez: su máscara, sus colores y el sombreador; devuelve sus uniformes)
function prepara(o) {
  if (o.material.userData.sinTacos) return o.material.userData.sinTacos;
  mascara(o);
  // (si el material es compartido, una copia suya; con lo que ya llevara pintado en el sombreador, que clone() no lo copia)
  let m = o.material; if (!m.userData.own) { const de = m; m = de.clone(); if (Object.hasOwn(de, 'onBeforeCompile')) m.onBeforeCompile = de.onBeforeCompile; if (Object.hasOwn(de, 'customProgramCacheKey')) m.customProgramCacheKey = de.customProgramCacheKey; m.userData.own = true; o.material = m; }
  const U = { uSinTacos: { value: 0 }, uPiel: { value: pielDe(o, m.map) }, uTacoCol: { value: new THREE.Vector4(0, 0, 0, 0) } };
  const prev = m.onBeforeCompile, key = m.customProgramCacheKey;
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r); Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTaco; varying float vTaco;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTaco = aTaco;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GLSL)
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = sinTaco(diffuseColor.rgb);')
      .replace('#include <emissivemap_fragment>', THREE.ShaderChunk.emissivemap_fragment).replace(EMI, (l) => l + '\n emissiveColor.rgb = sinTaco(emissiveColor.rgb);');
  };
  m.customProgramCacheKey = () => (key ? key.call(m) : '') + '+sinTacos';
  m.userData.sinTacos = U; m.needsUpdate = true;
  return U;
}
const manos = (ch, fn) => { ch?.root?.traverse(o => { if (o.isSkinnedMesh && o.skeleton && o.material?.map && !o.userData.pelo) fn(o); }); };
/** Pinta de piel (on) o deja como venían (off) las vendas y los tacos de las manos de un personaje (su GlbChar). Los
 *  materiales que toca pasan a ser suyos (se clonan si los compartía con otros). */
export function sinTacos(ch, on) {
  manos(ch, (o) => { if (!o.material.userData.sinTacos && !on) return; prepara(o).uSinTacos.value = on ? 1 : 0; });
}
/** Los tacos y las vendas de las manos, del color dado ('#rrggbb'); sin color, como venían. */
export function tacosColor(ch, color) {
  const c = color ? new THREE.Color(color) : null, g = (x) => Math.pow(Math.max(0, x), 1 / 2.2);
  manos(ch, (o) => { if (!o.material.userData.sinTacos && !c) return; const u = prepara(o).uTacoCol.value; if (c) u.set(g(c.r), g(c.g), g(c.b), 1); else u.set(0, 0, 0, 0); });
}
