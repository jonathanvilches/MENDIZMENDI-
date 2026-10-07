// Público en 3D de verdad para las gradas y los balcones (El Sadar, la plaza de toros, la Estafeta): los mismos cuerpos
// personajes nuevos (Meshy, versión ligera) vestidos como en las láminas (Osasuna, San Fermín, el pastor), quietos o celebrando, cocinados una sola vez
// en mallas fijas (la pose aplicada a los vértices y el color de su textura pasado a cada vértice) y dibujados por
// instancias: una llamada de dibujo por figura y pose. Solo los espectadores cercanos a la cámara son 3D; los lejanos
// siguen en lámina (de lejos no se distinguen y cuestan casi nada). Cada espectador es la misma figura de cerca y de lejos.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GlbChar, loadMeshy, MESHY_GAIT } from './glbChar.js';
import { crowdMesh, figure, FIGS, sitPose } from './crowdSprites.js';
import { QUALITY } from '../util/quality.js';
import { crowdProps } from './crowdProps.js';

const baked = new Map();   // conjunto → promesa de [figura][pose] geometrías
// con un poco de su propio color como luz propia (como los personajes de Meshy): a contraluz no se quedan oscuros y
// casan con las láminas, que no reciben luz
const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 });
MAT.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor.rgb * 0.38;'); };
MAT.customProgramCacheKey = () => 'crowd3d-fill';

// píxeles de una textura (de la imagen o del lienzo recoloreado), para leer el color bajo cada vértice
const pixCache = new WeakMap();
function pixels(tex) {
  if (pixCache.has(tex)) return pixCache.get(tex);
  const img = tex.image, w = Math.min(256, img.width), h = Math.min(256, img.height);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  const p = { w, h, d: g.getImageData(0, 0, w, h).data, flipY: tex.flipY };
  c.width = c.height = 1; pixCache.set(tex, p); return p;
}
const _c = new THREE.Color(), _v = new THREE.Vector3(), _n = new THREE.Vector3(), _sk = new THREE.Matrix4(), _bm = new THREE.Matrix4(), _nm = new THREE.Matrix3();

// una malla (con piel o rígida) ya posada → geometría con posición, normal y color, en el espacio del personaje
function bakeMesh(o) {
  const geo = o.geometry, P = geo.attributes.position, N = geo.attributes.normal, UV = geo.attributes.uv, COL = geo.attributes.color;
  const n = P.count, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const mat = [].concat(o.material)[0], map = mat.map?.image ? pixels(mat.map) : null, mc = mat.color || new THREE.Color(1, 1, 1);
  const skin = o.isSkinnedMesh, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
  if (skin) o.skeleton.update();
  const bones = skin ? o.skeleton.boneMatrices : null;
  for (let i = 0; i < n; i++) {
    _v.fromBufferAttribute(P, i); N ? _n.fromBufferAttribute(N, i) : _n.set(0, 1, 0);
    if (skin) {
      // como el sombreador: bindMatrixInverse · Σ peso · hueso · bindMatrix
      _sk.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      for (let k = 0; k < 4; k++) {
        const w = SW.getComponent(i, k); if (!w) continue;
        _bm.fromArray(bones, SI.getComponent(i, k) * 16);
        for (let e = 0; e < 16; e++) _sk.elements[e] += _bm.elements[e] * w;
      }
      _sk.multiply(o.bindMatrix).premultiply(o.bindMatrixInverse);
      _v.applyMatrix4(_sk); _n.applyMatrix3(_nm.setFromMatrix4(_sk));
    }
    _v.applyMatrix4(o.matrixWorld); _n.applyMatrix3(_nm.getNormalMatrix(o.matrixWorld)).normalize();
    pos[i * 3] = _v.x; pos[i * 3 + 1] = _v.y; pos[i * 3 + 2] = _v.z;
    nor[i * 3] = _n.x; nor[i * 3 + 1] = _n.y; nor[i * 3 + 2] = _n.z;
    if (COL) _c.fromBufferAttribute(COL, i);
    else if (map && UV) {
      const u = UV.getX(i), v = UV.getY(i), x = Math.min(map.w - 1, Math.max(0, Math.floor((u - Math.floor(u)) * map.w)));
      const yy = map.flipY ? 1 - (v - Math.floor(v)) : v - Math.floor(v), y = Math.min(map.h - 1, Math.max(0, Math.floor(yy * map.h))), q = (y * map.w + x) * 4;
      _c.setRGB(map.d[q] / 255, map.d[q + 1] / 255, map.d[q + 2] / 255, THREE.SRGBColorSpace);
    } else _c.setRGB(1, 1, 1);
    _c.multiply(mc);
    col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (UV) g.setAttribute('uv', UV.clone());
  g.setIndex(geo.index ? geo.index.clone() : [...Array(n).keys()]);
  return g;
}
// con textura (el público del frontón, todo en 3D): la piel, la cara y la ropa con el mismo detalle que los jugadores,
// y la misma luz propia que los personajes de Meshy. Una por figura (cada una trae su textura)
const texMats = new Map();
function texMat(map) {
  if (!map) return MAT;
  if (!texMats.has(map)) { const m = new THREE.MeshStandardMaterial({ map, roughness: 0.82, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.38 }); texMats.set(map, m); }
  return texMats.get(map);
}
const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };

// las figuras de un conjunto, cada una quieta (pose 0) y celebrando (pose 1), como en las láminas
function bakeSet(set, sit) {
  const key = set + (sit ? ':sit' : '');
  if (baked.has(key)) return baked.get(key);
  const pr = (async () => {
    const out = [];
    for (let f = 0; f < FIGS; f++) {
      const gl = await loadMeshy(figure(set, f).meshy, true), poses = [];
      for (let r = 0; r < 2; r++) {
        const c = new GlbChar(gl, MESHY_GAIT);
        c.root.scale.setScalar(gl.userData.fit || 1);
        if (r === 1) c.playOnce?.('Celebrate', 1); c.update(r === 1 ? 0.45 : 0.3);
        if (r === 0 && sit) sitPose(c.root);
        c.root.rotation.y = (f % 3 - 1) * 0.12; c.root.updateMatrixWorld(true);
        const parts = []; let map = null; c.root.traverse(o => { if (o.isMesh && !o.userData.outline && shown(o)) { parts.push(bakeMesh(o)); map ||= [].concat(o.material)[0].map || null; } });
        const g = mergeGeometries(parts); parts.forEach(p => p.dispose()); g.computeBoundingSphere(); g.userData.map = map;
        poses.push(g); c.dispose();
      }
      out.push(poses);
      await new Promise(r => setTimeout(r));   // sin bloquear la pantalla mientras se cocinan
    }
    return out;
  })();
  baked.set(key, pr); return pr;
}

/**
 * Público: spots = [[x, y, z, ry], …] (y = pies). Devuelve un grupo con .tick(t, ánimo, zFoco, cámara) y .cheer(on),
 * igual que las láminas: de cerca, figuras 3D (que saltan, saludan y celebran); de lejos, láminas.
 */
export function crowd3d(spots, set = 'futbol', height = 1.45, { sit = false, all3d = false } = {}) {
  const n = spots.length, figs = new Uint8Array(n);
  for (let i = 0; i < n; i++) figs[i] = Math.floor(Math.random() * FIGS);
  const group = new THREE.Group(), sprites = crowdMesh(spots, set, height, figs, sit);
  group.add(sprites);
  // banderas, bufandas y pañuelos de la afición
  let props = null; try { props = crowdProps(spots, set, height, { sit }); group.add(props); } catch (e) { console.warn('afición', e); }
  // la ola (en el estadio): cada cierto rato da la vuelta a la grada; quien está en la cresta se levanta y alza los brazos
  const olaOn = set === 'futbol'; let olaA = -99;
  // (los personajes nuevos tienen más detalle: en el móvil, menos en 3D a la vez)
  // (all3d: todos en 3D con su textura y sin láminas; quien llama limita cuántos son)
  const Q = QUALITY, K = all3d ? n : Q === 'low' ? 18 : Q === 'mid' ? 40 : 80, R = all3d ? 1e4 : Q === 'low' ? 13 : Q === 'mid' ? 20 : 28;
  if (all3d) sprites.visible = false;
  const TT = sprites.geometry.attributes.aTint.array, tc = new THREE.Color();   // (de cerca, el mismo tono que en la lámina)
  const A = sprites.geometry.attributes.aAnim.array, C = sprites.geometry.attributes.aCell.array, IM = sprites.instanceMatrix, orig = IM.array.slice();
  const near = new Int32Array(K); let nNear = 0, meshes = null, cheer = 0, pick = 0;
  const hide = new Uint8Array(n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s3 = new THREE.Vector3();
  const rot = new Float32Array(n), sc = new Float32Array(n);
  for (let i = 0; i < n; i++) { rot[i] = spots[i][3] + (Math.random() - 0.5) * 0.3; sc[i] = (0.92 + Math.random() * 0.16) * height / 1.5; }
  bakeSet(set, sit).then(G => {
    meshes = G.map(poses => poses.map(g => { const im = new THREE.InstancedMesh(g, all3d ? texMat(g.userData.map) : MAT, K); im.setColorAt(0, new THREE.Color(1, 1, 1)); im.count = 0; im.frustumCulled = false; group.add(im); return im; }));
  }).catch(err => console.warn('público 3D', err));
  const cam = new THREE.Vector3(), frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sph = new THREE.Sphere(new THREE.Vector3(), 1.2);
  // elige los K espectadores más cercanos a la cámara (dentro de R) que se ven, para dibujarlos en 3D (los que quedan
  // detrás de la cámara o fuera de la imagen no cuentan: siguen como lámina, que no se dibuja si no se ve)
  function choose(camera) {
    camera.getWorldPosition(cam); camera.updateMatrixWorld();
    frustum.setFromProjectionMatrix(pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const cand = [];
    for (let i = 0; i < n; i++) {
      const s = spots[i], d = (s[0] - cam.x) ** 2 + (s[1] - cam.y) ** 2 * 0.5 + (s[2] - cam.z) ** 2; if (d >= R * R) continue;
      sph.center.set(s[0], s[1] + 0.7, s[2]); if (frustum.intersectsSphere(sph)) cand.push([d, i]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    const keep = new Uint8Array(n); nNear = Math.min(K, cand.length);
    for (let k = 0; k < nNear; k++) { near[k] = cand[k][1]; keep[cand[k][1]] = 1; }
    let dirty = false;
    for (let i = 0; i < n; i++) if (keep[i] !== hide[i]) {
      hide[i] = keep[i]; dirty = true;
      if (keep[i]) IM.array.fill(0, i * 16, i * 16 + 16); else IM.array.set(orig.subarray(i * 16, i * 16 + 16), i * 16);
    }
    if (dirty) IM.needsUpdate = true;
  }
  group.tick = (t, excite = 1, focus = 0, camera = null) => {
    // la ola: cada 50 s, si el partido está tranquilo, 14 s dando vuelta y media a la grada
    const ot = t % 50; olaA = olaOn && t > 20 && ot < 14 && excite < 0.7 ? ot / 14 * Math.PI * 3 - Math.PI : -99;
    sprites.tick(t, excite, focus, olaA);
    props?.tick(t, excite);
    if (!meshes || !camera) return;
    if ((pick -= 1) <= 0) { pick = 12; choose(camera); }   // cada 12 fotogramas
    for (const fig of meshes) for (const im of fig) im.count = 0;
    for (let k = 0; k < nNear; k++) {
      const i = near[k], s = spots[i];
      // como las láminas: el ánimo crece cerca del foco; unos saltan y otros saludan alternando la pose
      const ex = excite * (0.35 + 0.65 * Math.exp(-Math.abs(s[2] - focus) / 14));
      let ola = 0; if (olaA > -50) { const d = ((Math.atan2(s[2], s[0]) - olaA) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; ola = Math.exp(-d * d / 0.05); }
      const wave = (A[i * 3 + 2] && ex > 0.15 && Math.sin(t * 7 + A[i * 3 + 1]) >= 0) || ola > 0.3 ? 1 : 0;
      const pose = Math.max((C[i * 2 + 1] + cheer) % 2, wave), im = meshes[figs[i] % meshes.length][pose];
      const jump = A[i * 3] * ex * Math.abs(Math.sin(t * 5.5 + A[i * 3 + 1])) + ola * 0.5;
      m4.compose(v.set(s[0], s[1] + jump, s[2]), q.setFromEuler(e.set(0, rot[i], 0)), s3.setScalar(sc[i]));
      if (all3d) { const l = 0.9 + 0.1 * Math.abs(Math.sin(i * 12.9898)); tc.setRGB(l, l, l); } else tc.setRGB(TT[i * 3], TT[i * 3 + 1], TT[i * 3 + 2]);
      im.setColorAt(im.count, tc); im.setMatrixAt(im.count++, m4);
    }
    for (const fig of meshes) for (const im of fig) if (im.count) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
  };
  group.cheer = (on) => { cheer = on ? 1 : 0; sprites.cheer(on); props?.cheer(on); };
  group.dispose = () => { sprites.geometry.dispose(); sprites.material.dispose(); props?.dispose(); for (const fig of meshes || []) for (const im of fig) im.dispose(); };
  return group;
}
