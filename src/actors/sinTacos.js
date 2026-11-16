// Las manos del pelotari sin tacos ni vendas, para jugar con herramienta (el autor, 16 de noviembre de 2026: «si la mano
// lleva herramienta, no lleva tacos en las manos»). Los pelotaris de Meshy traen las manos vendadas, con los tacos, y las
// vendas no son piezas aparte: son la propia malla de la mano, pintada de beis. Así que no se quitan; se pintan de piel.
// En el sombreador, solo en las manos y las muñecas (aTaco, un atributo de la malla) y solo lo que tiene color de venda
// (beis: bastante más verde que azul y no mucho más rojo que verde, en sRGB; la piel es rosada, la ropa blanca no
// tiene ese tono amarillo), toma el color de la piel del propio modelo, con su brillo para que no quede plana.
// El color de la piel sale de su textura: los píxeles rosados de las yemas de los dedos, que asoman de las vendas.
import * as THREE from 'three';

const GLSL = `uniform float uSinTacos; uniform vec3 uPiel; varying float vTaco;
vec3 sinTaco(vec3 lin){
  if (uSinTacos < 0.5 || vTaco < 0.01) return lin;
  vec3 c = pow(max(lin, vec3(0.0)), vec3(1.0 / 2.2));
  float k = smoothstep(0.07, 0.13, c.g - c.b) * (1.0 - smoothstep(0.14, 0.2, c.r - c.g)) * vTaco;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 o = uPiel * clamp(pow(l / 0.74, 0.8), 0.55, 1.25);
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

/** Pinta de piel (on) o deja como venían (off) las vendas y los tacos de las manos de un personaje (su GlbChar). Los
 *  materiales que toca pasan a ser suyos (se clonan si los compartía con otros). */
export function sinTacos(ch, on) {
  const root = ch?.root; if (!root) return;
  root.traverse(o => {
    if (!o.isSkinnedMesh || !o.skeleton || !o.material?.map || o.userData.pelo) return;
    if (!o.material.userData.sinTacos) {
      if (!on) return;
      mascara(o);
      let m = o.material; if (!m.userData.own) { m = m.clone(); m.userData.own = true; o.material = m; }
      const U = { uSinTacos: { value: 0 }, uPiel: { value: pielDe(o, m.map) } };
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
    }
    o.material.userData.sinTacos.uSinTacos.value = on ? 1 : 0;
  });
}
