// Lo que lleva la afición en la grada: banderas en su mástil que ondean (más cuanto más ánimo), bufandas que se
// levantan sobre la cabeza en los cánticos y al celebrar, y pañuelos en el frontón y en la plaza. Todo por instancias
// (tres llamadas de dibujo para todo el público) y movido en el sombreador: el procesador no hace nada por fotograma.
//   crowdProps(spots, set, height, { sit }) → grupo con .tick(t, ánimo, cámara) y .cheer(on)
import * as THREE from 'three';

const PAL = {
  futbol: ['#c8102e', '#c8102e', '#c8102e', '#1b2a5c', '#f4f1ea'],
  pelota: ['#f4f1ea', '#c8102e', '#f4f1ea', '#2f7d4a'],
  toros: ['#c8102e', '#f4f1ea', '#c8102e'],
};
// la bufanda: franjas y flecos (sin letras ni escudos)
function scarfTex(set) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 32; const g = c.getContext('2d');
  const cols = set === 'futbol' ? ['#c8102e', '#f4f1ea', '#1b2a5c'] : set === 'pelota' ? ['#f4f1ea', '#c8102e', '#2f7d4a'] : ['#c8102e', '#f4f1ea', '#c8102e'];
  g.fillStyle = cols[0]; g.fillRect(0, 0, 256, 32);
  for (let x = 16; x < 240; x += 48) { g.fillStyle = cols[1]; g.fillRect(x, 0, 18, 32); g.fillStyle = cols[2]; g.fillRect(x + 6, 0, 6, 32); }
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, 256, 3); g.fillRect(0, 29, 256, 3);
  for (let y = 2; y < 30; y += 4) { g.fillStyle = cols[1]; g.fillRect(0, y, 8, 2); g.fillRect(248, y, 8, 2); }   // flecos
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function crowdProps(spots, set = 'futbol', height = 1.45, { sit = false } = {}) {
  const group = new THREE.Group(), pal = PAL[set] || PAL.futbol, k = height / 1.45;
  const U = { uTime: { value: 0 }, uEx: { value: 0.3 }, uRaise: { value: 0 } };
  const handY = (sit ? 0.98 : 1.28) * k;   // la mano levantada sobre los pies (sentado o de pie)
  const flagI = [], scarfI = [];
  // a quién le toca: unos con bandera (en el fútbol), otros con bufanda o pañuelo (nunca los dos)
  for (let i = 0; i < spots.length; i++) { const r = Math.random(); if (r < (set === 'futbol' ? 0.045 : 0.0)) flagI.push(i); else if (r < (set === 'futbol' ? 0.16 : 0.12)) scarfI.push(i); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  const place = (im, list, dy) => { list.forEach((i, n) => { const [x, y, z, ry] = spots[i]; im.setMatrixAt(n, m4.compose(v.set(x, y + dy, z), q.setFromEuler(e.set(0, ry + (Math.random() - 0.5) * 0.4, 0)), s)); }); im.instanceMatrix.needsUpdate = true; };
  // el movimiento: todo se balancea desde la mano; la tela ondea más lejos del mástil; las bufandas suben al animar
  const wave = (sh, cloth, raise) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'uniform float uTime, uEx, uRaise;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  float ph = instanceMatrix[3].x * 0.73 + instanceMatrix[3].z * 0.37;
  ${raise ? `float up = clamp(uRaise + step(0.85, sin(uTime * 0.23 + ph * 0.05)) * 0.8, 0.0, 1.0);
  transformed.y += mix(-${(0.42 * k).toFixed(3)}, 0.0, up) + sin(uTime * 6.0 + ph) * 0.03 * up;
  transformed.x += sin(uTime * 2.6 + ph) * 0.08 * up;
  transformed.z += sin(uTime * 3.0 + position.x * 4.0 + ph) * 0.05 * up;` : `float hgt = max(0.0, position.y);
  transformed.x += sin(uTime * (1.6 + uEx * 1.8) + ph) * (0.18 + uEx * 0.35) * hgt / 1.6;
  ${cloth ? `float kx = clamp(position.x / 1.0, 0.0, 1.0);
  transformed.z += sin(uTime * (5.0 + uEx * 5.0) - position.x * 7.0 + ph) * (0.06 + 0.1 * uEx) * kx;
  transformed.y += sin(uTime * 4.0 - position.x * 5.0 + ph) * 0.025 * kx;
  vFold = 0.82 + 0.18 * cos(uTime * (5.0 + uEx * 5.0) - position.x * 7.0 + ph) * kx;` : ''}`}`);
    if (cloth) { sh.vertexShader = 'varying float vFold;\n' + sh.vertexShader.replace('void main() {', 'void main() {\n  vFold = 1.0;'); sh.fragmentShader = 'varying float vFold;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= vFold;'); }
  };
  if (flagI.length) {
    // mástil y bandera en una sola malla (el mástil apenas se tiñe: color oscuro en sus vértices)
    const pole = new THREE.CylinderGeometry(0.016, 0.018, 1.9, 5).translate(0, 0.95, 0);
    const cloth = new THREE.PlaneGeometry(1.0, 0.64, 12, 4).translate(0.5, 1.56, 0);
    const paint = (g, c) => { const a = new Float32Array(g.attributes.position.count * 3).fill(c); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); };
    paint(pole, 0.35); paint(cloth, 1);
    const geo = mergeTwo(pole, cloth);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => wave(sh, true, false); mat.customProgramCacheKey = () => 'crowdFlag';
    const im = new THREE.InstancedMesh(geo, mat, flagI.length); place(im, flagI, handY - 0.15);
    flagI.forEach((_, n) => im.setColorAt(n, new THREE.Color(pal[(Math.random() * pal.length) | 0])));
    im.frustumCulled = false; group.add(im);
  }
  if (scarfI.length) {
    // bufanda (o pañuelo en el frontón y la plaza) entre las dos manos, sobre la cabeza
    const scarf = set === 'futbol', geo = scarf ? new THREE.PlaneGeometry(1.0 * k, 0.15 * k, 10, 1) : new THREE.PlaneGeometry(0.34 * k, 0.3 * k, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ map: scarf ? scarfTex(set) : null, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => wave(sh, false, true); mat.customProgramCacheKey = () => 'crowdScarf';
    const im = new THREE.InstancedMesh(geo, mat, scarfI.length); place(im, scarfI, handY + 0.12 * k);
    if (!scarf) scarfI.forEach((_, n) => im.setColorAt(n, new THREE.Color(pal[(Math.random() * pal.length) | 0])));
    im.frustumCulled = false; group.add(im);
  }
  let cheer = 0, raise = 0;
  group.tick = (t, excite = 0.3) => { U.uTime.value = t; U.uEx.value += (Math.min(1, excite) - U.uEx.value) * 0.05; raise += ((cheer || excite > 0.75 ? 1 : 0) - raise) * 0.08; U.uRaise.value = raise; };
  group.cheer = (on) => { cheer = on ? 1 : 0; };
  group.dispose = () => group.children.forEach(o => { o.geometry.dispose(); o.material.map?.dispose(); o.material.dispose(); });
  return group;
}
function mergeTwo(a, b) {
  const g = new THREE.BufferGeometry(), at = ['position', 'normal', 'color'];
  for (const n of at) { const A = a.attributes[n].array, B = b.attributes[n].array, o = new Float32Array(A.length + B.length); o.set(A); o.set(B, A.length); g.setAttribute(n, new THREE.BufferAttribute(o, 3)); }
  const na = a.attributes.position.count, ia = a.index.array, ib = b.index.array, idx = new Uint32Array(ia.length + ib.length); idx.set(ia); for (let i = 0; i < ib.length; i++) idx[ia.length + i] = ib[i] + na;
  g.setIndex(new THREE.BufferAttribute(idx, 1)); a.dispose(); b.dispose(); return g;
}
