// Público en 3D de verdad para las gradas y los balcones (El Sadar, la plaza de toros, la Estafeta): los mismos cuerpos
// personajes nuevos (Meshy, versión ligera) vestidos como en las láminas (Osasuna, San Fermín, el pastor), quietos o celebrando, cocinados una sola vez
// en mallas fijas (la pose aplicada a los vértices y el color de su textura pasado a cada vértice) y dibujados por
// instancias: una llamada de dibujo por figura y pose. Solo los espectadores cercanos a la cámara son 3D; los lejanos
// siguen en lámina (de lejos no se distinguen y cuestan casi nada). Cada espectador es la misma figura de cerca y de lejos.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GlbChar, loadMeshy, MESHY_GAIT, sharpMap } from './glbChar.js';
import { crowdMesh, figure, nFigs, sitPose } from './crowdSprites.js';
import { loadChica, hasChica } from './chicas.js';
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
const PUNTOS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
const _c = new THREE.Color(), _v = new THREE.Vector3(), _n = new THREE.Vector3(), _sk = new THREE.Matrix4(), _bm = new THREE.Matrix4(), _nm = new THREE.Matrix3();

// una malla (con piel o rígida) ya posada → geometría con posición, normal y color, en el espacio del personaje
// (otra: la textura que se usa en vez de la suya, la del polo azul)
function bakeMesh(o, otra = null) {
  const geo = o.geometry, P = geo.attributes.position, N = geo.attributes.normal, UV = geo.attributes.uv, COL = geo.attributes.color;
  const n = P.count, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const mat = [].concat(o.material)[0], tx = otra || mat.map, map = tx?.image ? pixels(tx) : null, mc = mat.color || new THREE.Color(1, 1, 1);
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
      const yy = map.flipY ? 1 - (v - Math.floor(v)) : v - Math.floor(v), y = Math.min(map.h - 1, Math.max(0, Math.floor(yy * map.h)));
      // (la media de cinco puntos alrededor, no uno solo: las texturas de Meshy van a parches y el público salía a manchas)
      let r = 0, gg = 0, bb = 0;
      for (const [ox, oy] of PUNTOS) { const q = (Math.min(map.h - 1, Math.max(0, y + oy)) * map.w + Math.min(map.w - 1, Math.max(0, x + ox))) * 4; r += map.d[q]; gg += map.d[q + 1]; bb += map.d[q + 2]; }
      _c.setRGB(r / 1275, gg / 1275, bb / 1275, THREE.SRGBColorSpace);
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
// el polo azul: la misma figura con el polo colorado pasado al azul del otro bando. Solo lo colorado del tronco (los
// triángulos entre la cadera y el cuello, pintados en el espacio de la textura): las texturas de Meshy van a parches y
// un rojo suelto puede ser los labios o las botas. Conserva la luz y la sombra de la tela. Una vez por textura
const azules = new WeakMap();
function camisetaAzul(o, map, root) {
  if (azules.has(map)) return azules.get(map);
  const img = map.image, w = img?.width, h = img?.height; if (!w || !h) return null;
  let hips = null, neck = null; root.traverse(b => { if (!b.isBone) return; if (!hips && /hips$/i.test(b.name)) hips = b; if (!neck && /neck$/i.test(b.name)) neck = b; });
  const g = bakeMesh(o), P = g.attributes.position.array, I = g.index.array, U = o.geometry.attributes.uv; if (!U) { g.dispose(); return null; }
  let y0 = Infinity, y1 = -Infinity; for (let i = 1; i < P.length; i += 3) { y0 = Math.min(y0, P[i]); y1 = Math.max(y1, P[i]); }
  const H = y1 - y0, v = new THREE.Vector3();
  const ya = hips ? hips.getWorldPosition(v).y - 0.12 * H : y0 + 0.36 * H, yb = neck ? neck.getWorldPosition(v).y + 0.02 * H : y0 + 0.74 * H;
  const mk = document.createElement('canvas'); mk.width = w; mk.height = h; const m = mk.getContext('2d', { willReadFrequently: true });
  const X = (i) => (U.getX(i) - Math.floor(U.getX(i))) * w, Y = (i) => { const t = U.getY(i) - Math.floor(U.getY(i)); return (map.flipY ? 1 - t : t) * h; };
  const dentro = (i) => P[i * 3 + 1] >= ya && P[i * 3 + 1] <= yb;
  m.fillStyle = m.strokeStyle = '#fff'; m.lineWidth = 2; m.lineJoin = 'round'; m.beginPath();
  for (let t = 0; t < I.length; t += 3) { const a = I[t], b = I[t + 1], c = I[t + 2]; if (!dentro(a) || !dentro(b) || !dentro(c)) continue; m.moveTo(X(a), Y(a)); m.lineTo(X(b), Y(b)); m.lineTo(X(c), Y(c)); m.closePath(); }
  m.fill(); m.stroke();
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0, w, h);
  const D = cx.getImageData(0, 0, w, h), d = D.data, M = m.getImageData(0, 0, w, h).data;
  for (let i = 0; i < d.length; i += 4) {
    if (M[i + 3] < 128) continue;
    const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), dl = mx - mn;
    if (r !== mx || mx < 0.18 || dl / mx < 0.42) continue;   // (colorado: manda el rojo y con color)
    const hue = 60 * (gg - b) / dl; if (hue > 28 || hue < -25) continue;
    // (al azul: tono 218, la misma saturación y algo menos de brillo, que el azul a igual valor se ve más claro)
    const S = Math.min(1, dl / mx * 0.95), V = mx * 0.9, hh = 218 / 60, k = Math.floor(hh), f = hh - k, p0 = V * (1 - S), q0 = V * (1 - S * f), t0 = V * (1 - S * (1 - f));
    const [R, G2, B] = [[V, t0, p0], [q0, V, p0], [p0, V, t0], [p0, q0, V], [t0, p0, V], [V, p0, q0]][k % 6];
    d[i] = R * 255; d[i + 1] = G2 * 255; d[i + 2] = B * 255;
  }
  cx.putImageData(D, 0, 0); mk.width = mk.height = 1; g.dispose();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = map.colorSpace; t.flipY = map.flipY; t.wrapS = map.wrapS; t.wrapT = map.wrapT;
  t.minFilter = map.minFilter; t.magFilter = map.magFilter; t.anisotropy = map.anisotropy; t.channel = map.channel;
  azules.set(map, t); return t;
}
const mapDe = (o) => [].concat(o.material)[0]?.map || null;
// con textura (el público del frontón, todo en 3D): la piel, la cara y la ropa con el mismo detalle que los jugadores,
// y la misma luz propia que los personajes de Meshy. Una por figura (cada una trae su textura)
const texMats = new Map();
function texMat(map) {
  if (!map) return MAT;
  if (!texMats.has(map)) { const m = new THREE.MeshStandardMaterial({ map, roughness: 0.82, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.38 }); sharpMap(m); texMats.set(map, m); }
  return texMats.get(map);
}
const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };

// la misma figura para lejos (el Labrit lleno): los vértices que caen en la misma celda de una rejilla de «cell» metros se
// juntan en uno, en su punto medio y con el color medio (sin textura: de lejos, el color de cada parte basta y no se
// emborrona en las costuras), y se van los triángulos que se quedan sin área. Con «corte», también los que quedan del todo
// por debajo de esa altura: sentados en una grada llena, las espinillas y los pies los tapa la fila de delante
function lejos(g, cell, corte = -1) {
  const P = g.attributes.position.array, N = g.attributes.normal.array, C = g.attributes.color.array, I = g.index.array, n = P.length / 3;
  const id = new Uint32Array(n), celdas = new Map(); let m = 0;
  for (let i = 0; i < n; i++) {
    const k = `${Math.floor(P[i * 3] / cell)},${Math.floor(P[i * 3 + 1] / cell)},${Math.floor(P[i * 3 + 2] / cell)}`;
    let r = celdas.get(k); if (r === undefined) celdas.set(k, r = m++); id[i] = r;
  }
  const pos = new Float32Array(m * 3), nor = new Float32Array(m * 3), col = new Float32Array(m * 3), cnt = new Float32Array(m);
  for (let i = 0; i < n; i++) { const r = id[i]; cnt[r]++; for (let a = 0; a < 3; a++) { pos[r * 3 + a] += P[i * 3 + a]; nor[r * 3 + a] += N[i * 3 + a]; col[r * 3 + a] += C[i * 3 + a]; } }
  for (let r = 0; r < m; r++) { const k = 1 / cnt[r], l = Math.hypot(nor[r * 3], nor[r * 3 + 1], nor[r * 3 + 2]) || 1; for (let a = 0; a < 3; a++) { pos[r * 3 + a] *= k; col[r * 3 + a] *= k; nor[r * 3 + a] /= l; } }
  const out = [];
  for (let t = 0; t < I.length; t += 3) {
    const a = id[I[t]], b = id[I[t + 1]], c = id[I[t + 2]];
    if (a !== b && b !== c && a !== c && Math.max(pos[a * 3 + 1], pos[b * 3 + 1], pos[c * 3 + 1]) >= corte) out.push(a, b, c);
  }
  const h = new THREE.BufferGeometry();
  h.setAttribute('position', new THREE.BufferAttribute(pos, 3)); h.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); h.setAttribute('color', new THREE.BufferAttribute(col, 3));
  h.setIndex(m < 65536 ? new THREE.Uint16BufferAttribute(out, 1) : new THREE.Uint32BufferAttribute(out, 1)); h.computeBoundingSphere();
  return h;
}

// retratos para el público de en medio y del fondo de la grada (como en los juegos de deportes): cada figura, en cada pose,
// se dibuja una sola vez con su textura de verdad, vista desde VISTAS ángulos (de un lado al otro, por delante), en una
// textura; en la grada cada espectador es un rectángulo que mira a la cámara con el retrato del ángulo desde el que se le
// ve. Dos triángulos por espectador. Las figuras simplificadas no podían llevar la textura (la de Meshy va troceada en
// miles de piezas y, al quitar triángulos, se mezclaban) y salían con manchas de color, como a medio cargar
const VISTAS = 7, PASO = Math.PI / 6;   // (de -90° a 90°, de 30 en 30)
const retratosHechos = new Map();
function retratos(G, key, ch) {
  const R3 = typeof window !== 'undefined' && window.__renderer; if (!R3) return null;
  if (retratosHechos.has(key)) return retratosHechos.get(key);
  const pr = (async () => {
    // (el mismo rectángulo para todas: lo que ocupa la más ancha y la más alta, con los brazos en alto)
    let R = 0, H = 0;
    for (const poses of G) for (const g of poses) { const P = g.attributes.position.array; for (let i = 0; i < P.length; i += 3) { R = Math.max(R, Math.hypot(P[i], P[i + 2])); H = Math.max(H, P[i + 1]); } }
    R += 0.03; H += 0.03;
    const cw = Math.max(8, Math.round(ch * 2 * R / H)), filas = G.length * 2;
    const atlas = new THREE.WebGLRenderTarget(cw * VISTAS, ch * filas, { colorSpace: THREE.SRGBColorSpace, depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
    // (cada retrato, primero en una pequeña con suavizado de bordes, y de ahí a su sitio)
    const celda = new THREE.WebGLRenderTarget(cw, ch, { colorSpace: THREE.SRGBColorSpace, samples: 4 });
    // (su color, con un poco de volumen: más claro de frente y arriba, algo más oscuro en los costados; la luz del sitio
    // la pone luego el material del retrato, igual que a los de cerca)
    const pinta = (map) => new THREE.ShaderMaterial({ vertexColors: true, blending: THREE.NoBlending, uniforms: { map: { value: map }, conMapa: { value: map ? 1 : 0 } },
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vC; void main() { vUv = uv; vN = normalize(normalMatrix * normal); vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D map; uniform float conMapa; varying vec2 vUv; varying vec3 vN; varying vec3 vC; void main() { vec3 a = conMapa > 0.5 ? texture2D(map, vUv).rgb * vC : vC; float s = 0.78 + 0.3 * max(dot(normalize(vN), normalize(vec3(0.25, 0.55, 1.0))), 0.0); gl_FragColor = vec4(a * s, 1.0); }' });
    const escena = new THREE.Scene(), cam = new THREE.OrthographicCamera(-R, R, H / 2, -H / 2, 0.1, 60);
    const copia = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: celda.texture, transparent: true, blending: THREE.NoBlending, depthTest: false, depthWrite: false }));
    const escenaCopia = new THREE.Scene(), camCopia = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); escenaCopia.add(copia);
    // (una figura y pose por imagen, y entre una y otra se deja dibujar al juego: en el iPhone, subir todas las texturas
    // de golpe hacía perder la imagen)
    const paso = (fn) => { const antes = { rt: R3.getRenderTarget(), auto: R3.autoClear, alpha: R3.getClearAlpha(), color: R3.getClearColor(new THREE.Color()) };
      try { R3.setClearColor(0x000000, 0); fn(); } finally { atlas.scissorTest = false; R3.setRenderTarget(antes.rt); R3.autoClear = antes.auto; R3.setClearColor(antes.color, antes.alpha); } };
    const espera = () => new Promise(r => setTimeout(r, 30));
    try {
      paso(() => { R3.setRenderTarget(atlas); R3.clear(); });
      for (let f = 0; f < G.length; f++) for (let p = 0; p < G[f].length; p++) {
        await espera();
        const g = G[f][p], mt = pinta(g.userData.map || null), mc = pinta(null);
        // (el color de los vértices de la parte con textura viene de la textura: ahí solo cuenta la textura)
        if (g.userData.map) mt.vertexShader = mt.vertexShader.replace('vC = color;', 'vC = vec3(1.0);');
        const malla = new THREE.Mesh(g, g.groups.length ? [mt, mc] : mt); malla.frustumCulled = false; escena.add(malla);
        try {
          paso(() => { for (let j = 0; j < VISTAS; j++) {
            const th = (j - (VISTAS - 1) / 2) * PASO;
            cam.position.set(Math.sin(th) * 20, H / 2, Math.cos(th) * 20); cam.lookAt(0, H / 2, 0); cam.updateMatrixWorld();
            R3.autoClear = true; R3.setRenderTarget(celda); R3.render(escena, cam);
            R3.autoClear = false; atlas.viewport.set(j * cw, (f * 2 + p) * ch, cw, ch); atlas.scissor.copy(atlas.viewport); atlas.scissorTest = true;
            R3.setRenderTarget(atlas); R3.render(escenaCopia, camCopia);
          } });
        } finally { escena.remove(malla); mt.dispose(); mc.dispose(); }
      }
    } finally {
      atlas.viewport.set(0, 0, atlas.width, atlas.height); atlas.scissor.copy(atlas.viewport);
      celda.dispose(); copia.geometry.dispose(); copia.material.dispose();
    }
    // (se guarda para los partidos siguientes: al salir del pueblo no se borra con lo demás, runtime.unload)
    atlas.texture.userData.shared = true;
    return { tex: atlas.texture, R, H, filas, rt: atlas };
  })();
  // (si falla, se vuelve a intentar en el partido siguiente)
  retratosHechos.set(key, pr); pr.catch(() => retratosHechos.delete(key));
  return pr;
}
// el material del retrato: el de los de cerca (su textura, su luz propia, la luz del sitio), en un rectángulo que gira para
// mirar a la cámara, con el retrato del ángulo desde el que se ve al espectador. Uno por figura y pose (la fila)
function retratoMat(A, fila) {
  const m = new THREE.MeshStandardMaterial({ map: A.tex, roughness: 0.82, emissive: 0xffffff, emissiveMap: A.tex, emissiveIntensity: 0.38, alphaTest: 0.4, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFila = { value: fila }; sh.uniforms.uFilas = { value: A.filas };
    sh.vertexShader = 'uniform float uFila, uFilas;\n' + sh.vertexShader
      .replace('#include <uv_vertex>', `#include <uv_vertex>
  vec3 bbP = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
  vec3 bbF = normalize(mat3(modelMatrix) * instanceMatrix[2].xyz), bbX = normalize(mat3(modelMatrix) * instanceMatrix[0].xyz);
  float bbS = length(instanceMatrix[0].xyz) * length(modelMatrix[0].xyz);
  vec3 bbD = cameraPosition - bbP; bbD.y = 0.0; bbD = length(bbD) > 1e-4 ? normalize(bbD) : bbF;
  float bbT = atan(dot(bbD, bbX), dot(bbD, bbF));
  float bbJ = clamp(floor(bbT / ${PASO.toFixed(6)} + ${((VISTAS - 1) / 2).toFixed(1)} + 0.5), 0.0, ${(VISTAS - 1).toFixed(1)});
  vec2 bbUv = vec2((uv.x + bbJ) / ${VISTAS.toFixed(1)}, (uv.y + uFila) / uFilas);
  vec3 bbW = bbP + vec3(bbD.z, 0.0, -bbD.x) * position.x * bbS + vec3(0.0, position.y * bbS, 0.0);
  #ifdef USE_MAP
  vMapUv = bbUv;
  #endif
  #ifdef USE_EMISSIVEMAP
  vEmissiveMapUv = bbUv;
  #endif`)
      .replace('#include <defaultnormal_vertex>', 'vec3 transformedNormal = normalize(mat3(viewMatrix) * bbD);')
      .replace('#include <project_vertex>', 'vec4 mvPosition = viewMatrix * vec4(bbW, 1.0);\n  gl_Position = projectionMatrix * mvPosition;')
      .replace('#include <worldpos_vertex>', 'vec4 worldPosition = vec4(bbW, 1.0);');
    // (los bordes del retrato se mezclan con el fondo transparente al alejarse: se recupera su color)
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <map_fragment>', '#ifdef USE_MAP\n  vec4 sampledDiffuseColor = texture2D(map, vMapUv); sampledDiffuseColor.rgb /= max(sampledDiffuseColor.a, 0.004); diffuseColor *= sampledDiffuseColor;\n#endif')
      .replace('#include <emissivemap_fragment>', '#ifdef USE_EMISSIVEMAP\n  vec4 emissiveColor = texture2D(emissiveMap, vEmissiveMapUv); totalEmissiveRadiance *= emissiveColor.rgb / max(emissiveColor.a, 0.004);\n#endif');
  };
  m.customProgramCacheKey = () => 'crowd3d-retrato';
  return m;
}

// las figuras de un conjunto, cada una quieta (pose 0) y celebrando (pose 1), como en las láminas. Sentadas, con
// arriba = true, celebran sin levantarse, con los brazos en alto (en las gradas de escalones, de pie se metían en el de detrás)
function bakeSet(set, sit, arriba = false) {
  const key = set + (sit ? ':sit' : '') + (sit && arriba ? ':arriba' : '');
  if (baked.has(key)) return baked.get(key);
  const pr = (async () => {
    const out = [];
    for (let f = 0; f < nFigs(set); f++) {
      const fig = figure(set, f), poses = [];
      const gl = fig.chica && hasChica(fig.meshy, 'coleta', true) ? await loadChica(fig.meshy, 'coleta', true) : await loadMeshy(fig.meshy, true);
      let azul = null;
      for (let r = 0; r < 2; r++) {
        const c = new GlbChar(gl, MESHY_GAIT);
        c.root.scale.setScalar(gl.userData.fit || 1);
        const sentada = sit && arriba;   // (celebra sentada: la misma postura de quieta, con los brazos arriba)
        if (r === 1 && !sentada) c.playOnce?.('Celebrate', 1); c.update(r === 1 && !sentada ? 0.45 : 0.3);
        if (sit && (r === 0 || sentada)) sitPose(c.root, { brazosArriba: r === 1 });
        c.root.rotation.y = (f % 3 - 1) * 0.12; c.root.updateMatrixWorld(true);
        // (la textura de la figura: la del cuerpo, la malla más grande con textura. El pelo de las chicas trae la suya, gris,
        // con el color en el material: va aparte, con el color pasado a sus vértices, en un segundo grupo de la misma malla)
        const ms = []; c.root.traverse(o => { if (o.isMesh && !o.userData.outline && !/Pestanas/.test(o.name) && shown(o)) ms.push(o); });
        let body = null; for (const o of ms) if (mapDe(o) && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o;
        const map = body ? mapDe(body) : null;
        if (fig.camiseta === 'azul' && map && !azul) azul = camisetaAzul(body, map, c.root);
        const tex = [], col = [];
        for (const o of ms) (mapDe(o) === map ? tex : col).push(bakeMesh(o, mapDe(o) === map ? azul : null));
        for (const p of [...tex, ...col]) if (!p.attributes.uv) p.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(p.attributes.position.count * 2), 2));
        const gt = tex.length ? mergeGeometries(tex) : null, gc = col.length ? mergeGeometries(col) : null;
        const g = (gt && gc && mergeGeometries([gt, gc], true)) || gt || gc;
        [...tex, ...col].forEach(p => p.dispose()); if (g !== gt) gt?.dispose(); if (g !== gc) gc?.dispose();
        g.computeBoundingSphere(); g.userData.map = azul || map; g.userData.pelo = !!(gt && gc && g !== gt && g !== gc);
        poses.push(g); c.dispose();
      }
      poses.camiseta = fig.camiseta || null;
      out.push(poses);
      await new Promise(r => setTimeout(r));   // sin bloquear la pantalla mientras se cocinan
    }
    return out;
  })();
  baked.set(key, pr); return pr;
}

/** Prepara antes de tiempo las figuras del público y sus retratos (fronton.js, mientras se cargan los pelotaris): el
 *  público esperaba a tenerlos para salir y, en el móvil, la presentación del partido recorría unos 5 s la grada vacía
 *  (noviembre de 2026). Es lo mismo que hace crowd3d al empezar, y se guarda: crowd3d lo encuentra hecho. */
export function preparaPublico(set = 'aficion', sit = false) {
  const Q = QUALITY;
  return bakeSet(set, sit).then(G => retratos(G, set + (sit ? ':sit' : ''), Q === 'low' ? 160 : Q === 'mid' ? 192 : 224)).catch(e => console.warn('público', e));
}
/**
 * Público: spots = [[x, y, z, ry], …] (y = pies). Devuelve un grupo con .tick(t, ánimo, zFoco, cámara) y .cheer(on),
 * igual que las láminas: de cerca, figuras 3D (que saltan, saludan y celebran); de lejos, láminas.
 */
export function crowd3d(spots, set = 'futbol', height = 1.45, { sit = false, all3d = false, arriba = false, quietos = false, kc = null } = {}) {
  const n = spots.length, figs = new Uint8Array(n);
  for (let i = 0; i < n; i++) figs[i] = Math.floor(Math.random() * nFigs(set));
  const group = new THREE.Group(), sprites = crowdMesh(spots, set, height, figs, sit, { lamina: !all3d });
  group.add(sprites);
  // banderas, bufandas y pañuelos de la afición
  // (la afición de pelota, sin pañuelos: van a la altura del sentado y, con la gente levantándose y sentándose, quedaban
  // en el aire delante del que se ponía de pie)
  let props = null; if (set !== 'aficion') try { props = crowdProps(spots, set, height, { sit }); group.add(props); } catch (e) { console.warn('afición', e); }
  // la ola (en el estadio): cada cierto rato da la vuelta a la grada; quien está en la cresta se levanta y alza los brazos
  const olaOn = set === 'futbol'; let olaA = -99;
  // (los personajes nuevos tienen más detalle: en el móvil, menos en 3D a la vez)
  // (all3d: todos en 3D con su textura y sin láminas; quien llama limita cuántos son)
  const Q = QUALITY, K = all3d ? n : Q === 'low' ? 18 : Q === 'mid' ? 40 : 80, R = all3d ? 1e4 : Q === 'low' ? 13 : Q === 'mid' ? 20 : 28;
  if (all3d) sprites.visible = false;
  const TT = sprites.geometry.attributes.aTint.array, tc = new THREE.Color();   // (de cerca, el mismo tono que en la lámina)
  const A = sprites.geometry.attributes.aAnim.array, C = sprites.geometry.attributes.aCell.array, IM = sprites.instanceMatrix, orig = IM.array.slice();
  // (con todos en 3D, según lo cerca que estén de la cámara: los KC más cercanos, con la figura entera; el resto, con su
  // retrato (retratos). Si no se pueden dibujar los retratos, como antes: los KM siguientes, con la de lejos fina, y el
  // resto, al fondo de la grada, con la de lejos gruesa. En un Labrit lleno, unos 2.800 espectadores: con todos enteros
  // eran 2,3 millones de triángulos)
  // (kc: cuántos con la figura entera, si quien llama quiere menos: en el partido de pelota del móvil)
  const KC = all3d ? Math.max(1, kc ?? (Q === 'low' ? 16 : Q === 'mid' ? 40 : 100)) : K; let KM = Q === 'low' ? 120 : Q === 'mid' ? 300 : 600;
  // (la de lejos fina, con celdas de 6,5 cm en el móvil: con 8 se veían bultos de colores sin brazos ni cara, «sin
  // rellenar», en las filas de en medio de la grada del partido)
  const C1 = Q === 'low' ? 0.065 : Q === 'mid' ? 0.06 : 0.05, C2 = Q === 'low' ? 0.1 : Q === 'mid' ? 0.09 : 0.08;   // (más gruesa, las figuras se rompen)
  const near = new Int32Array(K); let nNear = 0, meshes = null, cheer = 0, pick = 0;
  const hide = new Uint8Array(n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s3 = new THREE.Vector3();
  const rot = new Float32Array(n), sc = new Float32Array(n);
  for (let i = 0; i < n; i++) { rot[i] = spots[i][3] + (Math.random() - 0.5) * 0.3; sc[i] = (0.92 + Math.random() * 0.16) * height / 1.5; }
  // (sentados que se levantan a celebrar y se vuelven a sentar, cada uno a su tiempo: en cada tanto, casi todos los de la
  // camiseta del que lo gana y alguno del otro; al salir los pelotaris, muchos de los dos)
  const lev = sit && !arriba && !quietos, dly = new Float32Array(n), dur = new Float32Array(n), rnd = new Float32Array(n);
  for (let i = 0; i < n; i++) { dly[i] = 0.08 + Math.random() * 0.7; dur[i] = 0.75 + Math.random() * 0.5; rnd[i] = Math.random(); }
  let cheerAt = null, cheerPend = false, cheerLado = null, cheerLen = 1.6, camis = [], quietoAntes = false;
  const inst = (g, k, tex = all3d) => { const im = new THREE.InstancedMesh(g, !tex ? MAT : g.userData.pelo ? [texMat(g.userData.map), MAT] : texMat(g.userData.map), k); im.setColorAt(0, new THREE.Color(1, 1, 1)); im.count = 0; im.visible = false; im.frustumCulled = false; group.add(im); return im; };
  let mid = null, far = null, capas = [], retrato = false;
  // (listo: cuando ya están las figuras en 3D; el partido espera a subir sus texturas antes de enseñar al público)
  group.listo = bakeSet(set, sit, arriba).then(async G => {
    meshes = G.map(poses => poses.map(g => inst(g, Math.min(K, KC))));
    // (todos en 3D: los de en medio y los del fondo, con su retrato; si no se puede, como antes, con la figura simplificada)
    let A = null; if (all3d && K > KC) try { A = await retratos(G, set + (sit ? ':sit' : '') + (arriba ? ':arriba' : ''), Q === 'low' ? 160 : Q === 'mid' ? 192 : 224); } catch (e) { console.warn('retratos', e); }
    if (A) {
      const geo = new THREE.PlaneGeometry(2 * A.R, A.H); geo.translate(0, A.H / 2, 0);
      mid = G.map((poses, f) => poses.map((g, p) => { const im = new THREE.InstancedMesh(geo, retratoMat(A, f * 2 + p), K - KC); im.setColorAt(0, new THREE.Color(1, 1, 1)); im.count = 0; im.visible = false; im.frustumCulled = false; group.add(im); return im; }));
      KM = K - KC; retrato = true;
    } else {
      if (K > KC) mid = G.map(poses => poses.map(g => inst(g.userData.lejos1 ||= lejos(g, C1), Math.min(K - KC, KM), false)));
      // (con tope: con la grada llena eran 2.800 figuras de 800 triángulos)
      if (K > KC + KM) far = G.map(poses => poses.map(g => inst(g.userData.lejos2 ||= lejos(g, C2, sit ? 0.3 : -1), Math.min(K - KC - KM, Q === 'low' ? 280 : Q === 'mid' ? 600 : 1200), false)));
    }
    capas = [meshes, mid, far].filter(Boolean); camis = G.map(p => p.camiseta);
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
    const keep = new Uint8Array(n), antes = nNear; nNear = Math.min(K, cand.length);
    let otros = antes !== nNear;
    for (let k = 0; k < nNear; k++) { if (near[k] !== cand[k][1]) otros = true; near[k] = cand[k][1]; keep[cand[k][1]] = 1; }
    let dirty = false;
    for (let i = 0; i < n; i++) if (keep[i] !== hide[i]) {
      hide[i] = keep[i]; dirty = true;
      if (keep[i]) IM.array.fill(0, i * 16, i * 16 + 16); else IM.array.set(orig.subarray(i * 16, i * 16 + 16), i * 16);
    }
    if (dirty) IM.needsUpdate = true;
    return otros;   // (si han cambiado los que se dibujan en 3D)
  }
  let cheerAntes = -1;
  group.tick = (t, excite = 1, focus = 0, camera = null) => {
    // la ola: cada 50 s, si el partido está tranquilo, 14 s dando vuelta y media a la grada
    const ot = t % 50; olaA = olaOn && t > 20 && ot < 14 && excite < 0.7 ? ot / 14 * Math.PI * 3 - Math.PI : -99;
    sprites.tick(t, excite, focus, olaA);
    props?.tick(t, excite);
    if (!meshes || !camera) return;
    let otros = false; if ((pick -= 1) <= 0) { pick = 12; otros = choose(camera); }   // cada 12 fotogramas
    // (sentados y tranquilos, o quietos, nadie se mueve: si no ha cambiado quién se ve ni el ánimo, se quedan como estaban
    // y no se vuelven a mandar a la tarjeta gráfica. En un Labrit lleno, eso es casi todo el partido)
    if (cheerPend) { cheerAt = t; cheerPend = false; }
    if (cheerAt != null && t - cheerAt > cheerLen * 1.3 + 1) cheerAt = null;
    const quieto = lev && cheerAt == null && excite <= 0.15;   // (todos sentados y tranquilos)
    if ((quietos || (sit && arriba && excite <= 0.15 && olaA < -50) || (quieto && quietoAntes)) && !otros && cheer === cheerAntes) return;
    cheerAntes = cheer; quietoAntes = quieto;
    for (const c of capas) for (const fig of c) for (const im of fig) im.count = 0;
    for (let k = 0; k < nNear; k++) {
      const i = near[k], s = spots[i];
      // como las láminas: el ánimo crece cerca del foco; unos saltan y otros saludan alternando la pose
      const ex = excite * (0.35 + 0.65 * Math.exp(-Math.abs(s[2] - focus) / 14));
      let ola = 0; if (olaA > -50) { const d = ((Math.atan2(s[2], s[0]) - olaA) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; ola = Math.exp(-d * d / 0.05); }
      const wave = (A[i * 3 + 2] && ex > 0.15 && Math.sin(t * 7 + A[i * 3 + 1]) >= 0) || ola > 0.3 ? 1 : 0;
      let pose = 0;
      if (lev) { if (cheerAt != null) { const dt = t - cheerAt, mio = camis[figs[i] % camis.length], va = cheerLado && mio ? (mio === cheerLado ? rnd[i] < 0.9 : rnd[i] < 0.1) : rnd[i] < 0.65; pose = va && dt > dly[i] && dt < dly[i] + cheerLen * dur[i] ? 1 : 0; } }
      else if (!quietos) pose = Math.max((C[i * 2 + 1] + cheer) % 2, wave);
      const im = (k < KC || !mid ? meshes : k < KC + KM || !far ? mid : far)[figs[i] % meshes.length][pose];
      if (im.count >= im.instanceMatrix.count) continue;   // (sin retratos, la figura de lejos tiene tope: los que pasan, sin dibujar)
      const jump = quietos || (sit && arriba) ? 0 : lev ? (pose ? A[i * 3] * 0.5 * ex * Math.abs(Math.sin(t * 5.5 + A[i * 3 + 1])) : 0) : A[i * 3] * ex * Math.abs(Math.sin(t * 5.5 + A[i * 3 + 1])) + ola * 0.5;   // (los que celebran sentados no saltan)
      // (el que se levanta a celebrar, de pie delante de su asiento: en el sitio del sentado quedaba dentro de él)
      const sube = sit && !arriba && pose === 1 ? 0.3 : 0;
      m4.compose(v.set(s[0] + Math.sin(rot[i]) * sube, s[1] + jump, s[2] + Math.cos(rot[i]) * sube), q.setFromEuler(e.set(0, rot[i], 0)), s3.setScalar(sc[i]));
      if (all3d) { const l = 0.9 + 0.1 * Math.abs(Math.sin(i * 12.9898)); tc.setRGB(l, l, l); } else tc.setRGB(TT[i * 3], TT[i * 3 + 1], TT[i * 3 + 2]);
      im.setColorAt(im.count, tc); im.setMatrixAt(im.count++, m4);
    }
    // (las vacías, escondidas: si no, three.js prepara igual su material y sube a la tarjeta la textura de cada figura,
    // aunque no se dibuje nadie con ella)
    for (const c of capas) for (const fig of c) for (const im of fig) { im.visible = im.count > 0; if (im.count) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; } }
  };
  // (lado: la camiseta del que gana el tanto, 'azul' o 'rojo'; len: cuánto dura, en segundos)
  group.cheer = (on, lado = null, len = 1.6) => { cheer = on ? 1 : 0; if (on) { cheerPend = true; cheerLado = lado; cheerLen = len; } sprites.cheer(on); props?.cheer(on); };
  group.dispose = () => { sprites.geometry.dispose(); sprites.material.dispose(); props?.dispose(); for (const c of capas) for (const fig of c) for (const im of fig) { im.dispose(); if (c === mid && retrato) { im.material.dispose(); im.geometry.dispose(); } } };
  return group;
}
