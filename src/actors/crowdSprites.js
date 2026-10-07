// Público de las gradas (El Sadar, la plaza de toros, balcones): miles de espectadores no caben como personajes 3D
// animados, así que se dibujan una vez los personajes nuevos (los de Meshy, versión ligera: con la camiseta de Osasuna,
// de blanco y rojo de San Fermín, el pastor…), quietos y celebrando, de frente y de espaldas, en una lámina; cada
// espectador es un plano que muestra uno de ellos (de espaldas cuando la cámara lo ve por detrás). Todo el público es
// una sola llamada de dibujo.
import * as THREE from 'three';
import { GlbChar, loadMeshy, MESHY_GAIT } from './glbChar.js';
import { offscreen, offscreenCanvas } from '../util/offscreen.js';

const CW = 96, CH = 144;   // tamaño de cada dibujo en la lámina
// conjuntos de público: qué personaje es cada figura
export const SETS = {
  futbol: ['osasuna', 'osasuna', 'sanfermin', 'osasuna', 'pastor', 'osasuna', 'pelotari', 'osasuna_fuera'],
  // (en el frontón, vecinos: de fiesta, del pueblo y de calle; sin pelotaris en la grada, que se confundían con los que juegan)
  pelota: ['sanfermin', 'pastor', 'osasuna', 'sanfermin', 'osasuna_fuera', 'pastor', 'sanfermin', 'osasuna'],
  toros: ['sanfermin', 'sanfermin', 'pastor', 'sanfermin', 'sanfermin', 'pastor', 'sanfermin', 'pelotari'],
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
  // huesos KayKit (upperleg.l…) o de Mixamo (los personajes nuevos: LeftUpLeg…)
  const B = {}; root.traverse(o => { if (o.isBone) B[o.name.replace(/[.:]/g, '').replace(/^mixamorig/, '')] = o; });
  const S = { l: 'Left', r: 'Right' }, up = (s) => B['upperleg' + s] || B[S[s] + 'UpLeg'], lo = (s) => B['lowerleg' + s] || B[S[s] + 'Leg'], arm = (s) => B['upperarm' + s] || B[S[s] + 'Arm'];
  root.updateMatrixWorld(true);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), thigh = up('l') && lo('l') ? up('l').getWorldPosition(a).distanceTo(lo('l').getWorldPosition(b)) : 0.2;
  for (const sd of ['l', 'r']) {
    if (up(sd)) bend(root, up(sd), -Math.PI / 2 + (sd === 'l' ? 0.06 : -0.04));
    if (lo(sd)) bend(root, lo(sd), Math.PI / 2 - 0.08);
  }
  // la cadera baja lo que mide el muslo (en el mundo, y se pasa al espacio de su padre)
  const hips = B.hips || B.Hips;
  if (hips) { hips.getWorldPosition(a); a.y -= thigh * 0.95; hips.position.copy(hips.parent.worldToLocal(a)); }
  // brazos sobre las piernas
  for (const sd of ['l', 'r']) if (arm(sd)) bend(root, arm(sd), -0.35);
  root.updateMatrixWorld(true);
}
export const FIGS = 8;
/** Personaje (Meshy) de la figura i de un conjunto de público. */
export const figure = (set, i) => { const outs = SETS[set] || SETS.futbol; return { meshy: outs[i % outs.length] }; };

/** Lámina de público: { tex, cols, rows } con N personajes quietos (fila de arriba) y celebrando (abajo). */
export function crowdAtlas(set = 'futbol', sit = false) {
  const key = set + (sit ? ':sit' : '');
  if (cache.has(key)) return cache.get(key);
  const p = (async () => {
    const N = FIGS, cols = N, rows = 4;   // de frente (quieto, celebrando) y de espaldas (quieto, celebrando)
    const atlas = document.createElement('canvas'); atlas.width = CW * cols; atlas.height = CH * rows;
    const g = atlas.getContext('2d');
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#fff6e8', '#5a5060', 2.2));
    const sun = new THREE.DirectionalLight('#ffffff', 2.2); sun.position.set(1.5, 3, 4); scene.add(sun);
    const cam = new THREE.PerspectiveCamera(24, CW / CH, 0.1, 30); cam.position.set(0, 0.95, 5.2); cam.lookAt(0, 0.78, 0);
    for (let i = 0; i < N; i++) {
      const gl = await loadMeshy(figure(set, i).meshy, true);
      for (let r = 0; r < rows; r++) {
        const c = new GlbChar(gl, MESHY_GAIT), cheer = r % 2 === 1;
        c.root.scale.setScalar(gl.userData.fit || 1);
        // filas 0 y 2: quieto (sentado en la grada) mirando al campo; filas 1 y 3: celebrando (brazos arriba); las dos
        // de abajo, de espaldas (las que se ven desde detrás de la grada)
        if (cheer) c.playOnce?.('Celebrate', 1); c.update(cheer ? 0.45 : 0.3);
        if (!cheer && sit) sitPose(c.root);
        c.root.rotation.y = (i % 3 - 1) * 0.12 + (r >= 2 ? Math.PI : 0);
        scene.add(c.root);
        const R = offscreen(CW, CH, THREE.NeutralToneMapping); R.setClearColor(0x000000, 0); R.clear(); R.render(scene, cam);
        g.drawImage(offscreenCanvas(), i * CW, r * CH);
        scene.remove(c.root); c.dispose();
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
  const tint = new Float32Array(spots.length * 3);
  for (let i = 0; i < spots.length; i++) { const k = 0.78 + Math.random() * 0.27, w = (Math.random() - 0.5) * 0.08; tint[i * 3] = k * (1 + w); tint[i * 3 + 1] = k; tint[i * 3 + 2] = k * (1 - w); }
  const U = { uCols: { value: 1 }, uRows: { value: 2 }, uCheer: { value: 0 }, uTime: { value: 0 }, uExcite: { value: 0 }, uFocus: { value: 0 }, uWave: { value: -99 } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    // el ánimo crece cerca del foco; quien salta sube y baja, quien saluda alterna los brazos arriba y abajo
    // por detrás (la lámina vista desde atrás) se dibuja la misma figura de espaldas, dos filas más abajo
    // (cada espectador con su tono: unos más a la sombra o con ropa más oscura, otros más claros; antes eran copias)
    sh.fragmentShader = 'uniform float uRows;\nvarying vec3 vTint;\n' + sh.fragmentShader.replace('#include <map_fragment>',
      '#ifdef USE_MAP\n  vec2 cuv = vMapUv; if (!gl_FrontFacing) cuv.y -= 2.0 / uRows;\n  diffuseColor *= texture2D(map, cuv);\n#endif\n  diffuseColor.rgb *= vTint;');
    sh.vertexShader = 'attribute vec2 aCell;\nattribute vec3 aAnim;\nattribute vec3 aTint;\nvarying vec3 vTint;\nuniform float uCols, uRows, uCheer, uTime, uExcite, uFocus, uWave;\n' + sh.vertexShader.replace('#include <uv_vertex>',
      '#include <uv_vertex>\n  vTint = aTint;\n  float ex = uExcite * (0.35 + 0.65 * exp(-abs(instanceMatrix[3].z - uFocus) / 14.0));\n  float wv = aAnim.z * step(0.15, ex) * step(0.0, sin(uTime * 7.0 + aAnim.y));\n  float ola = uWave > -50.0 ? exp(-pow(mod(atan(instanceMatrix[3].z, instanceMatrix[3].x) - uWave + 9.42478, 6.28318) - 3.14159, 2.0) / 0.05) : 0.0;\n  wv = max(wv, step(0.3, ola));\n#ifdef USE_MAP\n  float row = max(mod(aCell.y + uCheer, 2.0), wv);\n  vMapUv = vec2((uv.x + aCell.x) / uCols, (uv.y + (uRows - 1.0 - row)) / uRows);\n#endif')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed.y += aAnim.x * ex * abs(sin(uTime * 5.5 + aAnim.y)) + ola * 0.5;');
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
  geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3));
  im.visible = false; im.frustumCulled = false;
  crowdAtlas(set, sit).then(A => { mat.map = A.tex; U.uCols.value = A.cols; U.uRows.value = A.rows; mat.needsUpdate = true; im.visible = true; for (let i = 0; i < spots.length; i++) cell[i * 2] = figs ? figs[i] % A.n : Math.floor(Math.random() * A.n); geo.attributes.aCell.needsUpdate = true; })
    .catch(err => console.warn('público', err));
  im.cheer = (on) => { U.uCheer.value = on ? 1 : 0; };
  im.tick = (t, excite = 1, focus = 0, wave = -99) => { U.uTime.value = t; U.uExcite.value = excite; U.uFocus.value = focus; U.uWave.value = wave; };
  return im;
}
