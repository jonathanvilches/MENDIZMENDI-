// Público de las gradas (El Sadar, la plaza de toros, balcones): miles de espectadores no caben como personajes 3D
// animados, así que se dibujan una vez los personajes reales (cuerpos KayKit con camisetas de Osasuna, de blanco
// y rojo de San Fermín o con trajes de las comarcas), quietos y celebrando, en una lámina; cada espectador es un
// plano que muestra uno de ellos. Todo el público es una sola llamada de dibujo.
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GlbChar, loadKayKit } from './glbChar.js';
import { applyOutfit } from './outfits.js';
import { offscreen, offscreenCanvas } from '../util/offscreen.js';

const CW = 96, CH = 144;   // tamaño de cada dibujo en la lámina
export const BASES = ['Ranger', 'Rogue', 'Knight', 'Barbarian', 'Mage', 'Rogue_Hooded'];
// conjuntos de público: cada uno con sus trajes (se repiten sobre los seis cuerpos)
export const SETS = {
  futbol: ['osasuna', 'osasuna', 'osasuna', 'sanfermin', 'osasuna', 'casero'],
  toros: ['sanfermin', 'sanfermin', 'dantzari', 'sanfermin', 'casero', 'pastor'],
};
const cache = new Map();
// sentado en la grada: los muslos hacia delante y las espinillas hacia abajo, con la cadera bajada lo que mide el muslo
// (los ejes son los del personaje: se pasan al espacio de cada hueso con la pose del momento)
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _ax = new THREE.Vector3(), _X = new THREE.Vector3(1, 0, 0);
function bend(root, bone, angle) {
  _qa.identity(); for (let b = bone; b && b !== root; b = b.parent) _qa.premultiply(b.quaternion);
  bone.quaternion.multiply(_qb.setFromAxisAngle(_ax.copy(_X).applyQuaternion(_qa.invert()), angle));
}
export function sitPose(root) {
  const B = {}; root.traverse(o => { if (o.isBone) B[o.name.replace(/\./g, '')] = o; });
  const thigh = B.lowerlegl?.position.y || 0.227;
  for (const sd of ['l', 'r']) {
    if (B['upperleg' + sd]) bend(root, B['upperleg' + sd], -Math.PI / 2 + (sd === 'l' ? 0.06 : -0.04));
    if (B['lowerleg' + sd]) bend(root, B['lowerleg' + sd], Math.PI / 2 - 0.08);
  }
  if (B.hips) B.hips.position.y -= thigh * 0.95;
  // brazos sobre las piernas
  for (const sd of ['l', 'r']) if (B['upperarm' + sd]) bend(root, B['upperarm' + sd], -0.35);
  root.updateMatrixWorld(true);
}
export const FIGS = BASES.length * 2;
/** Cuerpo y traje de la figura i de un conjunto de público. */
export const figure = (set, i) => { const outs = SETS[set] || SETS.futbol; return { base: BASES[i % BASES.length], outfit: outs[(i + (i >= BASES.length ? 2 : 0)) % outs.length] }; };

/** Lámina de público: { tex, cols, rows } con N personajes quietos (fila de arriba) y celebrando (abajo). */
export function crowdAtlas(set = 'futbol', sit = false) {
  const key = set + (sit ? ':sit' : '');
  if (cache.has(key)) return cache.get(key);
  const p = (async () => {
    const N = FIGS, cols = N, rows = 2;
    const atlas = document.createElement('canvas'); atlas.width = CW * cols; atlas.height = CH * rows;
    const g = atlas.getContext('2d');
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#fff6e8', '#5a5060', 2.2));
    const sun = new THREE.DirectionalLight('#ffffff', 2.2); sun.position.set(1.5, 3, 4); scene.add(sun);
    const cam = new THREE.PerspectiveCamera(24, CW / CH, 0.1, 30); cam.position.set(0, 0.95, 5.2); cam.lookAt(0, 0.78, 0);
    for (let i = 0; i < N; i++) {
      const { base, outfit } = figure(set, i);
      const gl = await loadKayKit(base);
      for (let r = 0; r < rows; r++) {
        const src = { scene: SkeletonUtils.clone(gl.scene), animations: gl.animations, userData: gl.userData };
        applyOutfit(src.scene, base, outfit);
        const c = new GlbChar(src, {});
        c.root.scale.setScalar(gl.userData.fit || 1);
        // fila 0: de pie mirando al campo; fila 1: celebrando (brazos arriba)
        if (r === 1) c.playOnce?.('Celebrate', 1); c.update(r === 1 ? 0.45 : 0.3);
        if (r === 0 && sit) sitPose(c.root);
        c.root.rotation.y = (i % 3 - 1) * 0.12;
        scene.add(c.root);
        const R = offscreen(CW, CH, THREE.NeutralToneMapping); R.setClearColor(0x000000, 0); R.clear(); R.render(scene, cam);
        g.drawImage(offscreenCanvas(), i * CW, r * CH);
        scene.remove(c.root);
      }
    }
    const tex = new THREE.CanvasTexture(atlas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return { tex, cols, rows, n: N };
  })();
  cache.set(key, p); return p;
}

/**
 * Malla de público: un plano por espectador, orientado hacia `ry`. spots = [[x, y, z, ry], …] (y = pies).
 * Devuelve el InstancedMesh (vacío hasta que la lámina esté lista) con .cheer(on) para que celebren y
 * .tick(t, ánimo, zFoco) para que salten y saluden con la mano (más cuanto más cerca de zFoco, p. ej. los toros).
 */
export function crowdMesh(spots, set = 'futbol', height = 1.45, figs = null, sit = false) {
  const geo = new THREE.PlaneGeometry(height * CW / CH, height); geo.translate(0, height / 2, 0);
  const cell = new Float32Array(spots.length * 2);
  const mat = new THREE.MeshBasicMaterial({ transparent: false, alphaTest: 0.5, side: THREE.DoubleSide });
  const anim = new Float32Array(spots.length * 3);   // salto (alto), fase y si saluda (agitando la mano)
  const U = { uCols: { value: 1 }, uRows: { value: 2 }, uCheer: { value: 0 }, uTime: { value: 0 }, uExcite: { value: 0 }, uFocus: { value: 0 } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    // el ánimo crece cerca del foco; quien salta sube y baja, quien saluda alterna los brazos arriba y abajo
    sh.vertexShader = 'attribute vec2 aCell;\nattribute vec3 aAnim;\nuniform float uCols, uRows, uCheer, uTime, uExcite, uFocus;\n' + sh.vertexShader.replace('#include <uv_vertex>',
      '#include <uv_vertex>\n  float ex = uExcite * (0.35 + 0.65 * exp(-abs(instanceMatrix[3].z - uFocus) / 14.0));\n  float wv = aAnim.z * step(0.15, ex) * step(0.0, sin(uTime * 7.0 + aAnim.y));\n#ifdef USE_MAP\n  float row = mod(aCell.y + uCheer + wv, 2.0);\n  vMapUv = vec2((uv.x + aCell.x) / uCols, (uv.y + (uRows - 1.0 - row)) / uRows);\n#endif')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed.y += aAnim.x * ex * abs(sin(uTime * 5.5 + aAnim.y));');
  };
  mat.customProgramCacheKey = () => 'crowdSprite';
  const im = new THREE.InstancedMesh(geo, mat, spots.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  spots.forEach(([x, y, z, ry], i) => {
    const k = 0.9 + Math.random() * 0.2;
    im.setMatrixAt(i, m.compose(v.set(x, y, z), q.setFromEuler(e.set(0, ry + (Math.random() - 0.5) * 0.3, 0)), s.set(k, k, k)));
    cell[i * 2] = Math.floor(Math.random() * 12); cell[i * 2 + 1] = Math.random() < 0.15 ? 1 : 0;   // algunos ya celebran
    const r = Math.random(); anim[i * 3] = r < 0.3 ? 0.18 + Math.random() * 0.14 : 0; anim[i * 3 + 1] = Math.random() * 6.3; anim[i * 3 + 2] = r > 0.55 ? 1 : 0;
  });
  geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cell, 2));
  geo.setAttribute('aAnim', new THREE.InstancedBufferAttribute(anim, 3));
  im.visible = false; im.frustumCulled = false;
  crowdAtlas(set, sit).then(A => { mat.map = A.tex; U.uCols.value = A.cols; U.uRows.value = A.rows; mat.needsUpdate = true; im.visible = true; for (let i = 0; i < spots.length; i++) cell[i * 2] = figs ? figs[i] % A.n : Math.floor(Math.random() * A.n); geo.attributes.aCell.needsUpdate = true; })
    .catch(err => console.warn('público', err));
  im.cheer = (on) => { U.uCheer.value = on ? 1 : 0; };
  im.tick = (t, excite = 1, focus = 0) => { U.uTime.value = t; U.uExcite.value = excite; U.uFocus.value = focus; };
  return im;
}
