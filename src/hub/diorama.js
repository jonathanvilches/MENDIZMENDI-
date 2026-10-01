// Diorama 3D de cada comarca para el centro de mando: un pueblo de verdad (las mismas casas e iglesia
// que en la partida), prados con hierba que se mueve, árboles, montes, nubes, ovejas y pájaros.
// Se usa en vivo (portada con el personaje) y como foto fija para fondos y pantallas de carga.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildTextures, TEX } from '../world/textures.js';
import { makeMaterials, Builder, M } from '../world/builder.js';
import { buildHouse } from '../world/houses.js';
import { church } from '../world/monuments.js';
import { lamp } from '../world/village.js';
import { houseStyle } from '../world/townBuilder.js';
import { TREE_MAKERS } from '../world/nature.js';
import { quadruped, SPECIES } from '../actors/animals.js';
import { buildAnimal, preloadAnimals } from '../actors/animalGlb.js';
import { TONES } from '../ui/art.js';
import { fbm } from '../util/noise.js';
import { mulberry32, smoothstep, clamp } from '../util/math.js';
import COMARCAS from '../data/comarcas.json';
import { LEVELS } from '../data/levels.js';
import { getImg, putImg, enqueue } from '../util/store.js';
import { offscreen, offscreenCanvas } from '../util/offscreen.js';

const FAM = {};
for (const l of LEVELS) FAM[l.comarca] ||= l.family;
const CHURCH = { atlantic: 'gothic', pyrenean: 'romanesque', central: 'baroque', ribera: 'baroque', city: 'cathedral' };
const TREES = {
  atlantic: ['oak', 'chestnut', 'beech', 'oak'], green: ['beech', 'oak', 'fir', 'beech'], alpine: ['fir', 'fir', 'beech', 'pine'],
  basin: ['oak', 'poplar', 'oak', 'apple'], drygreen: ['oak', 'pine', 'oak', 'bush'], transition: ['oak', 'olive', 'pine', 'poplar'],
  mediterranean: ['olive', 'pine', 'olive', 'poplar'], ribera: ['poplar', 'olive', 'pine', 'olive'],
};
const PEAKS = { alpine: 170, green: 95, atlantic: 70, drygreen: 60, basin: 55, transition: 45, mediterranean: 35, ribera: 22 };

export const PLAZA = new THREE.Vector3(0, 0, -52);
const lin = (hex) => new THREE.Color(hex);

// relieve: llano en el pueblo y alrededor del personaje, colinas y montes lejos
function heightFn(tone, seed) {
  const amp = PEAKS[tone] ?? 60, mesa = tone === 'ribera';
  return (x, z) => {
    const r = Math.hypot(x, z - PLAZA.z * 0.6);
    const near = fbm(x / 40 + seed, z / 40, 3) * 0.9;
    const hill = smoothstep(55, 170, r) * (14 + 16 * fbm(x / 90 + seed, z / 90 + 4, 3));
    let far = smoothstep(150, 420, r) * amp * (0.55 + 0.6 * Math.abs(fbm(x / 170 + seed * 2, z / 170 - 3, 4)));
    if (mesa) far = Math.min(far, amp * 0.8) * (fbm(x / 60, z / 60, 2) > -0.1 ? 1 : 0.6);
    // delante de la cámara el suelo baja un poco para que se vea el pueblo
    const front = smoothstep(10, 60, z) * -2;
    return near + hill + far + front;
  };
}

// textura de pradera: motas de luz y sombra que multiplican el color del suelo
let SPK = null;
function speckle() {
  if (SPK) return SPK;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), r = mulberry32(9);
  g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) { const v = 150 + r() * 105 | 0; g.fillStyle = `rgb(${v * 0.92 | 0},${v},${v * 0.8 | 0})`; const x = r() * 256, y = r() * 256; g.fillRect(x, y, 1 + r() * 2.5, 1 + r() * 4); }
  for (let i = 0; i < 90; i++) { const x = r() * 256, y = r() * 256, rr = 8 + r() * 26, gr = g.createRadialGradient(x, y, 0, x, y, rr); const v = r() < 0.5 ? '255,255,235' : '120,130,100'; gr.addColorStop(0, `rgba(${v},0.22)`); gr.addColorStop(1, `rgba(${v},0)`); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  SPK = new THREE.CanvasTexture(c); SPK.wrapS = SPK.wrapT = THREE.RepeatWrapping; SPK.colorSpace = THREE.SRGBColorSpace; SPK.anisotropy = 8;
  return SPK;
}
// malla polar: densa cerca del centro y amplia hasta el horizonte
function ground(hf, T, rnd) {
  const rings = 110, segs = 160, pos = [], col = [], uv = [], idx = [];
  const cx = 0, cz = -20;
  const hills = T.hills.map(lin), snow = T.peak ? lin(T.peak) : null, rock = lin('#8d8579');
  for (let i = 0; i <= rings; i++) {
    const r = i === 0 ? 0 : 1.2 * Math.pow(1.058, i) - 1.2 + i * 0.35;
    for (let j = 0; j < segs; j++) {
      const a = j / segs * Math.PI * 2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, y = hf(x, z);
      pos.push(x, y, z); uv.push(x / 7, z / 7);
      const k = clamp((y - 2) / 60, 0, 1), n = fbm(x / 25, z / 25, 2) * 0.5 + 0.5;
      const c = hills[3].clone().lerp(hills[2], clamp(n * 0.8 + k, 0, 1)).lerp(hills[1], smoothstep(0.35, 1, k));
      const slope = Math.abs(hf(x + 2, z) - y) + Math.abs(hf(x, z + 2) - y);
      c.lerp(rock, smoothstep(1.4, 3.2, slope) * smoothstep(20, 60, y) * 0.85);
      if (snow && y > (PEAKS.alpine * 0.7)) c.lerp(snow, smoothstep(PEAKS.alpine * 0.7, PEAKS.alpine * 0.95, y + n * 20));
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
    const a = i * segs + j, b = i * segs + (j + 1) % segs, c = (i + 1) * segs + j, d = (i + 1) * segs + (j + 1) % segs;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ map: speckle(), vertexColors: true, roughness: 0.95, metalness: 0 });
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true;
  return mesh;
}

// camino empedrado desde el personaje hasta la plaza
function path(hf) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.6, 0, 12), new THREE.Vector3(0.2, 0, 2), new THREE.Vector3(-1.4, 0, -9), new THREE.Vector3(1.2, 0, -24), new THREE.Vector3(-0.6, 0, -38), new THREE.Vector3(0, 0, PLAZA.z + 4)]);
  const N = 90, W = 1.15, pos = [], uv = [], idx = [];
  let acc = 0, prev = null;
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = curve.getPointAt(t), tg = curve.getTangentAt(t);
    if (prev) acc += p.distanceTo(prev); prev = p;
    const nx = -tg.z, nz = tg.x, w = W * (1 + smoothstep(0.75, 1, t) * 0.8);
    for (const s of [-1, 1]) { const x = p.x + nx * w * s, z = p.z + nz * w * s; pos.push(x, hf(x, z) + 0.035, z); uv.push((s + 1) * w / 1.3, acc / 1.3); }
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ map: TEX.cobble.map, normalMap: TEX.cobble.normalMap, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true;
  // plaza
  const pg = new THREE.CircleGeometry(11, 40); pg.rotateX(-Math.PI / 2);
  const puv = pg.attributes.uv; for (let i = 0; i < puv.count; i++) puv.setXY(i, puv.getX(i) * 16, puv.getY(i) * 16);
  const plaza = new THREE.Mesh(pg, m); plaza.position.set(PLAZA.x, hf(PLAZA.x, PLAZA.z) + 0.04, PLAZA.z); plaza.receiveShadow = true;
  const grp = new THREE.Group(); grp.add(mesh, plaza);
  grp.userData.curve = curve;
  return grp;
}

// hierba viva: briznas curvas con degradado y viento
const WIND = { value: 0 };
function grass(hf, curve, tone, rnd, count) {
  const BH = 0.24, blade = new THREE.PlaneGeometry(0.03, BH, 1, 4); blade.translate(0, BH / 2, 0);
  const p = blade.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / BH; p.setX(i, p.getX(i) * (1 - y * 0.85)); p.setZ(i, y * y * 0.07); }
  blade.computeVertexNormals();
  const T = TONES[tone] || TONES.atlantic, base = lin(T.hills[3]).multiplyScalar(0.55), tip = lin(T.hills[3]).lerp(lin('#e8f0a0'), 0.35);
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = WIND; sh.uniforms.uBase = { value: base }; sh.uniforms.uTip = { value: tip };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT; varying float vH;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vH = position.y / 0.24;
        vec3 ip = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
        float w = sin(uT * 1.8 + ip.x * 0.35 + ip.z * 0.22) * 0.6 + sin(uT * 3.1 + ip.x * 0.9) * 0.25;
        transformed.x += w * vH * vH * 0.05; transformed.z += w * vH * vH * 0.03;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uBase, uTip; varying float vH;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( mix(uBase, uTip, smoothstep(0.0, 1.0, vH)), opacity );');
  };
  m.customProgramCacheKey = () => 'dgrass';
  const inst = new THREE.InstancedMesh(blade, m, count);
  const pts = curve.getSpacedPoints(80), o = new THREE.Object3D(), c = new THREE.Color();
  let n = 0;
  for (let k = 0; k < count * 4 && n < count; k++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 16, x = Math.cos(a) * r * 1.3, z = 3 + Math.sin(a) * r - 6;
    let dp = 1e9; for (const q of pts) dp = Math.min(dp, Math.hypot(q.x - x, q.z - z));
    if (dp < 1.9) continue;
    o.position.set(x, hf(x, z), z); o.rotation.set(0, rnd() * 6.28, (rnd() - 0.5) * 0.3);
    o.scale.setScalar(0.6 + rnd() * 0.7 * smoothstep(1.9, 4, dp)); o.updateMatrix();
    inst.setMatrixAt(n, o.matrix); inst.setColorAt(n, c.setHSL(0.25, 0.3, 0.85 + rnd() * 0.3)); n++;
  }
  inst.count = n; inst.receiveShadow = true;
  // flores
  const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.045, 1), new THREE.MeshStandardMaterial({ roughness: 0.6 }), 160);
  const FC = ['#ffffff', '#ffd23f', '#ff8cb0', '#b99cff', '#ffffff'];
  let f = 0;
  for (let k = 0; k < 800 && f < 160; k++) {
    const a = rnd() * Math.PI * 2, r = 2 + Math.sqrt(rnd()) * 14, x = Math.cos(a) * r * 1.3, z = -3 + Math.sin(a) * r;
    let dp = 1e9; for (const q of pts) dp = Math.min(dp, Math.hypot(q.x - x, q.z - z));
    if (dp < 2.2) continue;
    o.position.set(x, hf(x, z) + 0.16 + rnd() * 0.08, z); o.rotation.set(0, 0, 0); o.scale.set(1, 0.55, 1); o.updateMatrix();
    fl.setMatrixAt(f, o.matrix); fl.setColorAt(f, c.set(FC[f % FC.length])); f++;
  }
  fl.count = f;
  const g = new THREE.Group(); g.add(inst, fl); return g;
}

function sky(T) {
  const top = lin(T.sky[0]), hor = lin(T.sky[1]);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: top }, uHor: { value: hor }, uSun: { value: new THREE.Vector3(0.55, 0.32, -0.77).normalize() }, uSunC: { value: lin(T.sun) } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 uTop, uHor, uSun, uSunC; varying vec3 vD;
      void main(){ float h = clamp(vD.y, 0.0, 1.0); vec3 c = mix(uHor, uTop, pow(h, 0.55));
        float s = max(dot(normalize(vD), uSun), 0.0); c += uSunC * (pow(s, 600.0) * 1.6 + pow(s, 12.0) * 0.28);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), m);
}

function clouds(rnd) {
  const parts = [];
  for (let c = 0; c < 9; c++) {
    const a = -Math.PI / 2 + (rnd() - 0.5) * 2.4, r = 380 + rnd() * 300, cx = Math.cos(a) * r, cz = Math.sin(a) * r, cy = 110 + rnd() * 90, s = 14 + rnd() * 14;
    for (let i = 0; i < 7; i++) {
      const g = new THREE.IcosahedronGeometry(s * (0.55 + rnd() * 0.5), 2);
      g.scale(1.3, 0.75, 1); g.translate(cx + (i - 3) * s * 0.7, cy + rnd() * s * 0.35, cz + (rnd() - 0.5) * s * 0.5);
      parts.push(g);
    }
  }
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#e8eeff', emissiveIntensity: 0.55, roughness: 1, fog: false });
  return new THREE.Mesh(mergeGeometries(parts), m);
}

function trees(hf, tone, rnd, curve) {
  const kinds = TREES[tone] || TREES.atlantic, geos = {};
  const pts = curve.getSpacedPoints(60), mats = new Map();
  const place = (x, z, s, kind) => {
    let dp = 1e9; for (const q of pts) dp = Math.min(dp, Math.hypot(q.x - x, q.z - z));
    if (dp < 5 || Math.hypot(x - PLAZA.x, z - PLAZA.z) < 34) return;
    const g = (geos[kind] ||= TREE_MAKERS[kind](rnd, 1)).clone();
    g.applyMatrix4(M(x, hf(x, z) - 0.2, z, rnd() * 6.28, 0, 0, s, s, s));
    (mats.get(kind) || mats.set(kind, []).get(kind)).push(g);
  };
  // arboleda a los lados del pueblo y del camino
  for (let i = 0; i < 70; i++) { const side = i % 2 ? 1 : -1, x = side * (16 + rnd() * 70), z = -8 - rnd() * 110; place(x, z, 0.8 + rnd() * 0.5, kinds[i % kinds.length]); }
  // bosques en las colinas
  for (let i = 0; i < 260; i++) { const a = -Math.PI / 2 + (rnd() - 0.5) * 3.4, r = 80 + rnd() * 230, x = Math.cos(a) * r, z = Math.sin(a) * r - 20; if (fbm(x / 60, z / 60, 2) < -0.05) continue; place(x, z, 1 + rnd() * 0.6, kinds[(i >> 1) % kinds.length]); }
  // un par de árboles cerca del personaje, a los lados
  place(-7.5, -2.5, 0.75, kinds[0]); place(8.5, -6, 0.9, kinds[1]);
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, map: TEX.foliage || null, alphaTest: TEX.foliage ? 0.45 : 0, side: THREE.DoubleSide });
  for (const list of mats.values()) { const mesh = new THREE.Mesh(mergeGeometries(list), m); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); }
  return g;
}

function village(fam, rnd) {
  const mats = makeMaterials(), B = new Builder(mats), g = new THREE.Group();
  const spots = [[-16, -40, 0.55], [15, -38, -0.5], [-27, -54, 0.9], [27, -52, -0.9], [-13, -66, 0.2], [16, -70, -0.15], [-38, -34, 1.1], [39, -33, -1.1], [-32, -78, 0.5], [33, -82, -0.4], [-50, -60, 1], [52, -64, -1]];
  for (const [x, z, ry] of spots) {
    const st = houseStyle(fam, rnd);
    const w = (st.wide ? 10 : 8) + rnd() * 3, d = 8 + rnd() * 2.5, h = st.h[0] + rnd() * (st.h[1] - st.h[0]);
    const face = Math.atan2(PLAZA.x - x, PLAZA.z - z) * 0.3 + ry * 0.7;
    buildHouse(B, M(x, -0.1, z, face), { balconyW: Math.min(w - 2, 3 + rnd() * 2.5), cornice: rnd() < 0.4, arch: rnd() < 0.3, ...st, w, d, h }, rnd);
  }
  church(B, 2, -92, 0.12, CHURCH[fam] || 'gothic', fam);
  for (const [x, z] of [[-2.8, -22], [3.2, -36], [-7, PLAZA.z + 2], [7, PLAZA.z + 2]]) lamp(B, x, z);
  B.build(g, { shadows: true });
  return g;
}

function sheep(hf, rnd) {
  const g = new THREE.Group(), list = [];
  for (const [x, z, ry] of [[5.2, -5.5, -0.6], [7.4, -8.2, 0.9], [-6.2, -9.5, 2.2], [9.5, -3.5, -1.8]]) {
    // oveja animada de la fauna del juego (si ya está cargada); si no, la procedural
    const A = buildAnimal('sheep'), q = A ? { root: A.root } : quadruped(SPECIES.sheep, rnd);
    q.A = A; q.root.position.set(x, hf(x, z), z); q.root.rotation.y = ry; q.root.scale.setScalar(0.9 + rnd() * 0.2);
    q.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.add(q.root); list.push({ q, ph: rnd() * 6 });
  }
  g.userData.list = list;
  return g;
}

function birds(rnd) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.7, 0, 0.2, 0, 0, -0.1, 0, 0.05, 0.25, 0.7, 0, 0.2, 0, 0.05, 0.25, 0, 0, -0.1], 3));
  geo.computeVertexNormals();
  const m = new THREE.MeshBasicMaterial({ color: '#2a2530', side: THREE.DoubleSide });
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(geo, m); b.userData = { r: 30 + rnd() * 25, h: 26 + rnd() * 12, sp: 0.12 + rnd() * 0.08, ph: rnd() * 6, s: 1.2 + rnd() * 0.6 }; b.scale.setScalar(b.userData.s); g.add(b); }
  return g;
}

// Escena completa de una comarca. Devuelve { scene, update(dt), sun, hf }
export function buildDiorama(comarcaId, { live = true } = {}) {
  buildTextures('high');
  const c = COMARCAS.find(x => x.id === comarcaId) || COMARCAS[0];
  const tone = c.tone || 'atlantic', T = TONES[tone] || TONES.atlantic, fam = FAM[c.id] || 'atlantic';
  const seed = [...c.id].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const rnd = mulberry32(seed * 97 + 5), hf = heightFn(tone, (seed % 17) * 3.1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(lin(T.sky[1]).lerp(lin(T.sky[0]), 0.35), 180, 900);
  scene.add(sky(T));
  const hemi = new THREE.HemisphereLight(lin(T.sky[0]).lerp(lin('#ffffff'), 0.4), lin(T.hills[2]).multiplyScalar(0.7), 1.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(lin(T.sun).lerp(lin('#ffd9a8'), 0.5), 3.1);
  sun.position.set(22, 30, -18); sun.target.position.set(0, 0, -4); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 120 });
  const fill = new THREE.DirectionalLight('#b8d4ff', 0.7); fill.position.set(-10, 8, 20); scene.add(fill);
  scene.add(ground(hf, T, rnd));
  const p = path(hf); scene.add(p);
  scene.add(village(fam, rnd));
  scene.add(trees(hf, tone, rnd, p.userData.curve));
  scene.add(clouds(rnd));
  let flock = null, herd = null, grassG = null;
  if (live) {
    grassG = grass(hf, p.userData.curve, tone, rnd, 22000); scene.add(grassG);
    herd = sheep(hf, rnd); scene.add(herd);
    // en cuanto llegan los modelos animados, se cambia el rebaño
    if (!herd.userData.list[0]?.q.A) preloadAnimals().then(() => { const n = sheep(hf, mulberry32(7)); if (!n.userData.list[0]?.q.A) return; scene.remove(herd); herd = n; scene.add(herd); });
    flock = birds(rnd); scene.add(flock);
  } else {
    grassG = grass(hf, p.userData.curve, tone, rnd, 5000); scene.add(grassG);
  }
  let t = 0;
  const update = (dt) => {
    t += dt; WIND.value = t;
    if (herd) for (const { q, ph } of herd.userData.list) { if (q.A) { q.A.update(dt, { graze: Math.sin(t * 0.15 + ph) > -0.4, alt: true }); continue; } if (q.head) q.head.rotation.x = 0.35 + Math.sin(t * 0.9 + ph) * 0.25; }
    if (flock) for (const b of flock.children) { const u = b.userData, a = t * u.sp + u.ph; b.position.set(Math.cos(a) * u.r, u.h + Math.sin(t * 0.7 + u.ph) * 2, -45 + Math.sin(a) * u.r * 0.6); b.rotation.y = -a; b.rotation.z = Math.sin(t * 9 + u.ph) * 0.5; }
  };
  return { scene, update, sun, hf, tone, T };
}

// Foto fija de la comarca (fondos, fichas y pantalla de carga). Generarla cuesta (monta el
// diorama entero), así que se hace en segundo plano, de una en una, y se guarda en IndexedDB:
// mientras tanto se devuelve un degradado con los colores de la comarca que luego se sustituye.
function renderShot(comarcaId, w, h) {
  const SR = offscreen(w, h);
  const D = buildDiorama(comarcaId, { live: false });
  SR.setClearColor(D.scene.fog.color, 1);
  D.update(0.5);
  const cam = new THREE.PerspectiveCamera(w > h ? 34 : 50, w / h, 0.3, 3000);
  cam.position.set(4, 6.5, 16); cam.lookAt(-1, 7, -60);
  SR.render(D.scene, cam);
  const url = offscreenCanvas().toDataURL('image/jpeg', 0.84);
  D.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  return url;
}
const holders = new Map();
function placeholder(comarcaId, key) {
  if (holders.has(key)) return holders.get(key);
  const c = COMARCAS.find(x => x.id === comarcaId) || COMARCAS[0];
  const col = (c.color || '#8A2BE2').replace('#', '%23');
  // el comentario con la clave hace única la cadena, para poder encontrarla y cambiarla después
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><!--mm-${key}--><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="%2387c7ef"/><stop offset=".45" stop-color="%23cfe8f5"/><stop offset=".7" stop-color="${col}"/><stop offset="1" stop-color="%232a1a40"/></linearGradient></defs><rect width="16" height="9" fill="url%28%23g%29"/></svg>`;
  const u = 'data:image/svg+xml,' + svg.replace(/"/g, '%22').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/ /g, '%20');
  holders.set(key, u);
  return u;
}
// cambia el degradado provisional por la foto en todos los sitios donde se haya usado
function swapIn(ph, url) {
  for (const e of document.querySelectorAll('[style]')) {
    const st = e.getAttribute('style');
    if (st.includes(ph)) e.setAttribute('style', st.split(ph).join(url));
  }
}
const waiting = new Map();     // clave → avisos pendientes (cada llamada guarda el suyo)
export function dioramaShot(comarcaId, w = 1280, h = 720, { front = false, onReady } = {}) {
  if (w > 960) { h = Math.round(h * 960 / w); w = 960; }
  const key = comarcaId + w + 'x' + h;
  const hit = getImg('d:' + key);
  if (hit) { onReady?.(hit); return hit; }
  const ph = placeholder(comarcaId, key);
  if (onReady) { if (!waiting.has(key)) waiting.set(key, []); waiting.get(key).push(onReady); }
  enqueue('d:' + key, () => {
    let url = getImg('d:' + key);
    if (!url) { try { url = renderShot(comarcaId, w, h); } catch (e) { console.warn('foto de comarca', e); return; } putImg('d:' + key, url); }
    swapIn(ph, url);
    for (const f of waiting.get(key) || []) f(url);
    waiting.delete(key);
  }, front);
  return ph;
}
