// La isla flotante: lo que lleva la comarca elegida en el mapa del inicio cuando sube y se separa de Navarra, como en las
// imágenes que pasó el autor el 13 de noviembre de 2026 (una isla de hierba y montes en el aire, con la roca colgando por
// debajo y una cascada que cae por el borde). La panza de roca, con la hierba y la tierra que asoman bajo el borde, sus
// estratos, el musgo y varias puntas colgando; raíces; las cascadas donde sus ríos llegan al borde; unas piedras que
// flotan alrededor y otras que se sueltan al despegarse. Se hace la primera vez que se elige la comarca (mapa3d.js).
import * as THREE from 'three';

const rnd = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const lerp = (a, b, k) => a + (b - a) * k;
const C = (h) => new THREE.Color(h);
const HIERBA = C('#86a84c'), TIERRA = C('#946c46'), ROCA1 = C('#a8957b'), ROCA2 = C('#c2ae92'), ROCA3 = C('#8c7b66'), HONDO = C('#6a5e51'), MUSGO = C('#6c8c44');   // (claros: el mapa es de noche y oscuros se perdían)

/** El contorno, con N puntos repartidos por igual a lo largo del borde. */
function reparte(P, N) {
  const L = [0]; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; L.push(L[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const tot = L[P.length], out = []; let j = 0;
  for (let k = 0; k < N; k++) { const s = tot * k / N; while (L[j + 1] < s) j++; const a = P[j], b = P[(j + 1) % P.length], f = (s - L[j]) / ((L[j + 1] - L[j]) || 1); out.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f)]); }
  return out;
}

/** La isla de una comarca. P: su contorno (en unidades del mapa); alto(x, z): la altura del relieve sin el grosor;
 *  salidas: [x, z, k] donde sus ríos llegan al borde (k: 1 río grande, 3 pequeño); geos y mats, para soltarlo todo. */
export function hazIsla({ id, P, grosor, alto, salidas = [], geos, mats, scene }) {
  let seed = 7; for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const R = rnd(seed), N = 150, Q = reparte(P, N);
  let cx = 0, cz = 0; for (const [x, z] of Q) { cx += x / N; cz += z / N; }
  let rMed = 0, rMax = 0; for (const [x, z] of Q) { const r = Math.hypot(x - cx, z - cz); rMed += r / N; rMax = Math.max(rMax, r); }
  const D = 0.85 * rMed;   // (lo hondo de la panza: casi la mitad de lo ancho, como en las imágenes del autor)
  // (las puntas que cuelgan: unas pocas, a su ángulo y con su largo)
  const puntas = Array.from({ length: 4 + ((R() * 3) | 0) }, () => ({ a: R() * Math.PI * 2, w: 0.25 + R() * 0.35, h: 0.25 + R() * 0.45 }));
  const cuelga = (a) => puntas.reduce((s, p) => { const d = Math.atan2(Math.sin(a - p.a), Math.cos(a - p.a)); return s + p.h * Math.exp(-(d * d) / (2 * p.w * p.w)); }, 0);
  // los anillos: cuánto se estrecha hacia el centro, lo hondo (en parte de D) y cuánto se redondea (al principio, la
  // forma de la comarca; abajo, casi un círculo, para que la roca no se pise a sí misma en las comarcas con entrantes)
  const ANI = [[1, 0, 0], [0.99, 0.03, 0], [0.95, 0.08, 0.04], [0.87, 0.16, 0.1], [0.76, 0.26, 0.2], [0.63, 0.37, 0.32], [0.49, 0.49, 0.45], [0.35, 0.61, 0.58], [0.22, 0.73, 0.72], [0.1, 0.85, 0.86]];
  const pos = [], col = [], c = new THREE.Color();
  ANI.forEach(([e, h, m], k) => Q.forEach(([x, z]) => {
    const dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz) || 1, a = Math.atan2(dz, dx);
    const ru = 1 + (k ? 0.07 * Math.sin(a * 5 + k * 1.7 + seed) + 0.045 * Math.sin(a * 13 + k * 2.9) + 0.03 * (R() - 0.5) : 0);
    const bx = lerp(dx, dx / r * rMed, m) * e * ru, bz = lerp(dz, dz / r * rMed, m) * e * ru;
    const y = k ? -D * (h * (1 + cuelga(a) * h ** 1.4) + 0.05 * h * (R() - 0.5)) : 0;
    pos.push(cx + bx, y, cz + bz);
    // (el color, por lo hondo: hierba y tierra bajo el borde, la roca a capas y más oscura abajo, con manchas de musgo)
    const f = -y / D, capa = Math.sin(-y * 9 + Math.sin(a * 3) * 0.6);
    if (f < 0.025) c.copy(HIERBA); else if (f < 0.11) c.copy(TIERRA).lerp(HIERBA, Math.max(0, 0.06 - f) * 8);
    else c.copy(capa > 0.35 ? ROCA2 : capa < -0.35 ? ROCA3 : ROCA1).lerp(HONDO, Math.min(1, Math.max(0, (f - 0.5) / 0.6)));
    if (f > 0.1 && f < 0.42 && R() < 0.13) c.lerp(MUSGO, 0.65);
    c.multiplyScalar(0.86 + R() * 0.24); col.push(c.r, c.g, c.b);
  }));
  // (las puntas de abajo: el centro, y bajo cada punta, su pico)
  const base = pos.length / 3;
  pos.push(cx, -D * 0.98, cz); c.copy(HONDO).multiplyScalar(0.85); col.push(c.r, c.g, c.b);
  const idx = [], L = (ANI.length - 1) * N;
  for (let k = 0; k + 1 < ANI.length; k++) for (let i = 0; i < N; i++) { const a = k * N + i, b = k * N + (i + 1) % N; idx.push(a, b + N, b, a, a + N, b + N); }
  for (let i = 0; i < N; i++) idx.push(L + i, base, L + (i + 1) % N);
  for (const p of puntas) {   // (cada punta, un cono de roca que cuelga bajo su anillo de abajo)
    const i0 = Math.round(((p.a / (Math.PI * 2)) % 1 + 1) % 1 * N) % N, k = ANI.length - 3, v = k * N + i0, vx = pos[v * 3], vy = pos[v * 3 + 1], vz = pos[v * 3 + 2];
    const tx = lerp(vx, cx, 0.35), tz = lerp(vz, cz, 0.35), ty = vy - D * (0.25 + p.h * 0.5), ti = pos.length / 3;
    pos.push(tx, ty, tz); c.copy(HONDO); col.push(c.r, c.g, c.b);
    for (const d of [-2, -1, 0, 1, 2]) { const a = k * N + (i0 + d + N) % N, b = k * N + (i0 + d + 1 + N) % N; idx.push(a, b, ti); }
  }
  // (con su luz pintada, cara a cara: la panza está siempre a la sombra del sol del mapa y con las luces de la escena salía
  // casi negra. Cada cara, con su color y la luz que le da de lado y de frente, como la roca en las imágenes del autor)
  const g0 = new THREE.BufferGeometry(); g0.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g0.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g0.setIndex(idx);
  const g = g0.toNonIndexed(); g0.dispose();
  { const P2 = g.attributes.position, C2 = g.attributes.color, a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), n = new THREE.Vector3(), LUZ = new THREE.Vector3(-0.55, 0.25, 0.8).normalize();
    for (let i = 0; i < P2.count; i += 3) {
      a.fromBufferAttribute(P2, i); b.fromBufferAttribute(P2, i + 1); d.fromBufferAttribute(P2, i + 2); n.subVectors(b, a).cross(d.sub(a)).normalize();
      if (n.x * (a.x - cx) + n.z * (a.z - cz) < 0) n.negate();   // (hacia fuera)
      const k = 0.62 + 0.55 * Math.max(0, n.dot(LUZ));
      for (let j = 0; j < 3; j++) C2.setXYZ(i + j, C2.getX(i + j) * k, C2.getY(i + j) * k, C2.getZ(i + j) * k);
    } }
  geos.push(g);
  const rocaM = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false, fog: true }); mats.push(rocaM);
  const grupo = new THREE.Group(); grupo.name = 'isla-' + id; grupo.visible = false; scene.add(grupo);
  grupo.add(new THREE.Mesh(g, rocaM));
  // las raíces que cuelgan bajo el borde: hilos oscuros que bajan haciendo eses
  { const lp = [];
    for (let n = 0; n < 46; n++) {
      const i = (R() * N) | 0, k = 1 + ((R() * 2) | 0), v = (k * N + i) * 3; let x = pos[v], y = pos[v + 1], z = pos[v + 2];
      const len = D * (0.12 + R() * 0.32), pasos = 6, fx = (x - cx) / rMed, fz = (z - cz) / rMed, ph = R() * 6;
      for (let s = 0; s < pasos; s++) { const nx = x + fx * 0.04 + Math.sin(ph + s * 1.3) * 0.05, ny = y - len / pasos, nz = z + fz * 0.04 + Math.cos(ph + s * 1.1) * 0.05; lp.push(x, y, z, nx, ny, nz); x = nx; y = ny; z = nz; }
    }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); geos.push(lg);
    const lm = new THREE.LineBasicMaterial({ color: '#3b2a1c', transparent: true, opacity: 0.85 }); mats.push(lm);
    grupo.add(new THREE.LineSegments(lg, lm)); }

  // las cascadas: donde sus ríos llegan al borde (los más grandes primero, y no dos juntas); si no tiene ríos, en lo más
  // bajo del borde. Una cinta de agua que cae por fuera, se abre un poco y se pierde en el aire, con su nube de espuma
  const sitios = [];
  for (const [x, z, kk] of [...salidas].sort((a, b) => a[2] - b[2])) { if (sitios.length >= 3) break; if (sitios.every(s => Math.hypot(s[0] - x, s[1] - z) > rMed * 0.6)) sitios.push([x, z, kk]); }
  if (!sitios.length) { let best = null; for (const [x, z] of Q) { const h = alto(x, z); if (!best || h < best[2]) best = [x, z, h]; } sitios.push([best[0], best[1], 2]); }
  const aguaM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uT: { value: 0 }, uK: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT, uK; varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float x = vUv.x, y = vUv.y, borde = smoothstep(0.0, 0.22, x) * smoothstep(1.0, 0.78, x);
        float hilos = 0.55 + 0.45 * sin(x * 31.0 + sin(y * 9.0) * 0.8) * sin(x * 13.0 - 1.3);
        float baja = fract(y * 3.0 - uT * 1.6 + h(vec2(floor(x * 18.0), 1.0)) * 0.7);
        float a = borde * (0.55 + 0.45 * hilos) * (0.75 + 0.25 * baja) * smoothstep(1.0, 0.55, y) * uK;
        gl_FragColor = vec4(mix(vec3(0.78, 0.9, 1.0), vec3(1.0), baja * 0.6), a * 0.92);
      }` }); mats.push(aguaM);
  const espumaT = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(cv); return t; })();
  const espumaM = new THREE.SpriteMaterial({ map: espumaT, transparent: true, depthWrite: false, opacity: 0 }); mats.push(espumaM); geos.push({ dispose: () => espumaT.dispose() });
  const cascadas = sitios.map(([x, z, kk]) => {
    const dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz) || 1, nx = dx / r, nz = dz / r, w = (kk === 1 ? 0.75 : kk === 2 ? 0.55 : 0.4) * Math.max(1, rMed / 9);   // (más ancha en las comarcas grandes: si no, de lejos era un hilo)
    // (la cinta, de 0 a −1 de alto: luego se estira a lo que cae; se aparta del borde al caer, como el agua de verdad)
    const S = 14, p = [], uv = [], ix = [];
    for (let s = 0; s <= S; s++) { const f = s / S, o = 0.06 + 0.55 * Math.sqrt(f), ww = w * (1 + f * 0.9);
      for (const side of [-1, 1]) { p.push(x + nx * o - nz * ww / 2 * side, -f, z + nz * o + nx * ww / 2 * side); uv.push(side < 0 ? 0 : 1, f); }
      if (s) { const v = s * 2; ix.push(v - 2, v - 1, v, v - 1, v + 1, v); } }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); cg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); cg.setIndex(ix); geos.push(cg);
    const m = new THREE.Mesh(cg, aguaM); m.renderOrder = 3; m.frustumCulled = false; scene.add(m); m.visible = false;
    const sp = new THREE.Sprite(espumaM); sp.visible = false; scene.add(sp);
    return { m, sp, top: grosor + alto(x, z), x: x + nx * 0.6, z: z + nz * 0.6, w };
  });

  // las piedras que flotan alrededor, y las que se sueltan del borde al despegarse
  const piedraG = new THREE.DodecahedronGeometry(1, 0); geos.push(piedraG);
  const flota = Array.from({ length: 12 }, () => ({ a: R() * Math.PI * 2, r: rMed * (0.75 + R() * 0.55), y: -D * (0.15 + R() * 0.75), s: 0.08 + R() * 0.2, w: (R() < 0.5 ? -1 : 1) * (0.05 + R() * 0.08), ph: R() * 6, rot: R() * 6 }));
  const caen = Array.from({ length: 18 }, () => ({ v: 0, t: 9, x: 0, y: 0, z: 0, vx: 0, vz: 0, s: 0.05 + R() * 0.12 }));
  const piedraM = new THREE.MeshLambertMaterial({ color: '#8f7f69', emissive: '#4a3e31', flatShading: true }); mats.push(piedraM);   // (sin colores por vértice: con los de la roca salían negras)
  const piedras = new THREE.InstancedMesh(piedraG, piedraM, flota.length + caen.length); piedras.frustumCulled = false; piedras.visible = false; scene.add(piedras);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  let antes = 0;

  return {
    D, rMed, alto: D + 0.9,   // (lo que sube: lo hondo de la panza y casi un metro más, para que la punta no toque Navarra)
    /** py: la altura de la comarca; sy: lo que se estira su relieve; k: cuánto está fuera, de 0 a 1; t, dt: el tiempo */
    update(py, sy, k, t, dt) {
      const on = k > 0.004; grupo.visible = piedras.visible = on;
      // (al soltarse, unas piedras caen del borde)
      if (k > 0.03 && antes <= 0.03) for (const p of caen) { const [x, z] = Q[(R() * N) | 0], dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz) || 1; Object.assign(p, { t: R() * 0.35, x, z, y: py - 0.05, vx: dx / r * (0.4 + R() * 0.6), vz: dz / r * (0.4 + R() * 0.6), v: 0.5 + R() * 0.6 }); }
      antes = k;
      for (const c2 of cascadas) { c2.m.visible = c2.sp.visible = on; }
      if (!on) return;
      grupo.position.y = py; grupo.scale.y = Math.max(0.001, k);   // (la panza sale al subir: tira de ella desde el suelo)
      const caida = (D * k + 2.2);
      aguaM.uniforms.uT.value = t; aguaM.uniforms.uK.value = Math.min(1, Math.max(0, (k - 0.55) / 0.35));
      for (const c2 of cascadas) {
        const top = py + c2.top * sy; c2.m.position.y = top; c2.m.scale.y = top - py + caida;
        c2.sp.position.set(c2.x, py - caida * 0.82, c2.z); const sc = c2.w * 3.2; c2.sp.scale.set(sc, sc * 0.7, 1);
      }
      espumaM.opacity = 0.55 * aguaM.uniforms.uK.value;
      let n = 0;
      for (const p of flota) {
        const a = p.a + t * p.w, y = py + p.y * k + Math.sin(t * 0.9 + p.ph) * 0.12, sc = p.s * Math.min(1, k * 1.4);
        e.set(p.rot + t * 0.2, p.rot * 2 + t * 0.13, 0); q.setFromEuler(e);
        piedras.setMatrixAt(n++, m4.compose(v3.set(cx + Math.cos(a) * p.r, y, cz + Math.sin(a) * p.r), q, s3.set(sc, sc * 0.8, sc)));
      }
      for (const p of caen) {
        p.t += dt; const vivo = p.t > 0 && p.t < 1.8;
        if (vivo) { p.x += p.vx * dt; p.z += p.vz * dt; p.v -= 9 * dt; p.y += p.v * dt; }
        const sc = vivo ? p.s * (1 - p.t / 1.8) : 0.0001; q.identity();
        piedras.setMatrixAt(n++, m4.compose(v3.set(p.x, p.y, p.z), q, s3.setScalar(sc)));
      }
      piedras.instanceMatrix.needsUpdate = true;
    },
    dispose() { scene.remove(grupo, piedras); for (const c2 of cascadas) scene.remove(c2.m, c2.sp); },
  };
}
