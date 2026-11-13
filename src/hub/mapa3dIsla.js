// La isla flotante: lo que lleva la comarca elegida en el mapa del inicio cuando sube y se separa de Navarra, como en las
// imágenes que pasó el autor el 13 de noviembre de 2026: una tierra que flota en un cielo azul con nubes, con una capa gruesa
// de césped en el canto y debajo una roca caliza clara, con estrías verticales, que se va cerrando hasta una punta roma (con
// poca tierra: el autor la quería menos honda). Debajo, el hueco que deja en Navarra es el cráter de donde se arrancó: paredes
// de tierra y roca oscura y un lago en el fondo, donde cae el agua de los ríos por el borde de la isla y por el del hueco; y
// se desprenden piedras y polvo sin parar. Las texturas de la roca y del césped, de Higgsfield (src/assets/isla). Se hace la
// primera vez que se elige la comarca (mapa3d.js).
import * as THREE from 'three';
import ROCA from '../assets/isla/roca.webp?url';
import CESPED from '../assets/isla/cesped.webp?url';

const rnd = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const lerp = (a, b, k) => a + (b - a) * k;
const C = (h) => new THREE.Color(h);
const TIERRA = C('#5a4130'), CALIZA = C('#ffffff'), HONDO = C('#bdb6ab');
// (el cielo: azul intenso arriba y claro junto al horizonte, como en las imágenes del autor)
export const CIELO_ARRIBA = C('#2f80d0'), CIELO_HORIZONTE = C('#bcdcf3');
const LUZ = new THREE.Vector3(-0.6, 0.35, 0.72).normalize();   // (de la izquierda, por delante y algo alta, con contraste)

/** Las texturas de la isla, una vez por mapa: la roca, repetible, y la tira de césped con su tierra (con transparencia). */
export function texturasIsla(aniso = 4) {
  const L = new THREE.TextureLoader(), t = (u, rep) => { const x = L.load(u); x.colorSpace = THREE.SRGBColorSpace; x.wrapS = THREE.RepeatWrapping; x.wrapT = rep ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; x.anisotropy = aniso; return x; };
  const roca = t(ROCA, true), cesped = t(CESPED, false);
  return { roca, cesped, dispose() { roca.dispose(); cesped.dispose(); } };
}

/** El contorno, con N puntos repartidos por igual a lo largo del borde. */
function reparte(P, N) {
  const L = [0]; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; L.push(L[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const tot = L[P.length], out = []; let j = 0;
  for (let k = 0; k < N; k++) { const s = tot * k / N; while (L[j + 1] < s) j++; const a = P[j], b = P[(j + 1) % P.length], f = (s - L[j]) / ((L[j + 1] - L[j]) || 1); out.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f)]); }
  return out;
}
// (la luz pintada en cada cara: la roca va siempre a la sombra del sol del mapa y con las luces de la escena salía casi negra)
function pintaLuz(g, haciaFuera, cx, cz, base, fuerza) {
  const P2 = g.attributes.position, C2 = g.attributes.color, a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < P2.count; i += 3) {
    a.fromBufferAttribute(P2, i); b.fromBufferAttribute(P2, i + 1); d.fromBufferAttribute(P2, i + 2); n.subVectors(b, a).cross(d.sub(a)).normalize();
    const fuera = n.x * (a.x - cx) + n.z * (a.z - cz); if (haciaFuera ? fuera < 0 : fuera > 0) n.negate();
    const k = base + fuerza * Math.max(0, n.dot(LUZ));
    for (let j = 0; j < 3; j++) C2.setXYZ(i + j, C2.getX(i + j) * k, C2.getY(i + j) * k, C2.getZ(i + j) * k);
  }
}

/** La isla de una comarca. P: su contorno (en unidades del mapa); alto(x, z): la altura del relieve sin el grosor;
 *  salen y entran: [x, z, k] donde sus ríos salen de ella o le llegan por el borde (k: 1 río grande, 3 pequeño);
 *  fuera(x, z): la altura del mapa de alrededor en un punto (la de la comarca vecina, o el suelo); tex: texturasIsla();
 *  geos y mats, para soltarlo todo. */
export function hazIsla({ id, P, grosor, alto, salen = [], entran = [], fuera = () => 0, tex, geos, mats, scene }) {
  let seed = 7; for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const R = rnd(seed), N = 300, Q = reparte(P, N), N1 = N + 1;
  let cx = 0, cz = 0; for (const [x, z] of Q) { cx += x / N; cz += z / N; }
  let rMed = 0, rMax = 0; for (const [x, z] of Q) { const r = Math.hypot(x - cx, z - cz); rMed += r / N; rMax = Math.max(rMax, r); }
  // (lo largo del borde hasta cada punto: la textura va por metros de borde, y las estrías, también)
  const LQ = [0]; for (let i = 1; i <= N; i++) LQ.push(LQ[i - 1] + Math.hypot(Q[i % N][0] - Q[i - 1][0], Q[i % N][1] - Q[i - 1][1]));
  const TEX = 2.4;   // (lo que mide la textura de la roca en el mapa)
  const D = 0.4 * rMed;   // (lo hondo de la panza: el autor la quería menos honda; la primera, 0,85, y luego 0,62, eran mucha tierra)
  // (unas pocas puntas, cortas: la panza cuelga algo más donde caen)
  const puntas = Array.from({ length: 2 + ((R() * 2) | 0) }, () => ({ a: R() * Math.PI * 2, w: 0.3 + R() * 0.3, h: 0.1 + R() * 0.18 }));
  const cuelga = (a) => puntas.reduce((s, p) => { const d = Math.atan2(Math.sin(a - p.a), Math.cos(a - p.a)); return s + p.h * Math.exp(-(d * d) / (2 * p.w * p.w)); }, 0);
  // los anillos de la panza, como la roca de las imágenes: casi recta al principio, luego se cierra hasta una punta roma.
  // [lo que se estrecha, lo hondo (en parte de D), cuánto se redondea hacia un círculo]
  const ANI = [[1, 0, 0], [1, 0.05, 0], [0.985, 0.13, 0.03], [0.955, 0.25, 0.08], [0.9, 0.38, 0.16], [0.8, 0.52, 0.28], [0.66, 0.66, 0.42], [0.49, 0.79, 0.58], [0.3, 0.9, 0.74], [0.12, 0.98, 0.88]];
  // (las estrías: surcos verticales cada medio metro largo del mapa, que se tuercen un poco al bajar, y bultos más grandes)
  const estria = (s, k) => { const ss = s + 0.12 * Math.sin(k * 1.7 + s * 0.6), g = 0.5 + 0.5 * Math.sin(ss * 13.4 + 1.3 * Math.sin(ss * 0.9)); return 0.09 * g * g + 0.14 * Math.sin(s * 2.7 + k * 0.45 + seed); };
  const pos = [], col = [], uv = [], c = new THREE.Color();
  ANI.forEach(([e, h, m], k) => { for (let i = 0; i <= N; i++) {
    const [x, z] = Q[i % N], dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz) || 1, a = Math.atan2(dz, dx);
    const bx = lerp(dx, dx / r * rMed, m) * e, bz = lerp(dz, dz / r * rMed, m) * e;
    const ex = k ? estria(LQ[i], k) * (1 - h * 0.6) * Math.min(1, rMed / 7) : 0;
    const y = k ? -D * (h * (1 + cuelga(a) * h ** 1.4) + 0.03 * h * Math.sin(LQ[i] * 3.1 + k)) : 0;
    pos.push(cx + bx + dx / r * ex, y, cz + bz + dz / r * ex); uv.push(LQ[i] / TEX, -y / TEX);
    // (arriba, la tierra bajo el césped; luego la caliza, que pone su color la textura, algo más oscura hacia la punta)
    const f = -y / D;
    if (f < 0.04) c.copy(TIERRA); else c.copy(CALIZA).lerp(HONDO, Math.min(1, Math.max(0, (f - 0.35) / 0.6)));
    c.multiplyScalar(0.92 + R() * 0.12); col.push(c.r, c.g, c.b);
  } });
  const base = pos.length / 3; pos.push(cx, -D * 0.99, cz); uv.push(0, D / TEX); c.copy(HONDO); col.push(c.r, c.g, c.b);
  const idx = [], L = (ANI.length - 1) * N1;
  for (let k = 0; k + 1 < ANI.length; k++) for (let i = 0; i < N; i++) { const a = k * N1 + i, b = a + 1; idx.push(a, b + N1, b, a, a + N1, b + N1); }
  for (let i = 0; i < N; i++) idx.push(L + i, base, L + i + 1);
  const g0 = new THREE.BufferGeometry(); g0.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g0.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g0.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g0.setIndex(idx);
  const g = g0.toNonIndexed(); g0.dispose(); pintaLuz(g, true, cx, cz, 0.42, 0.78); geos.push(g);
  const rocaM = new THREE.MeshBasicMaterial({ map: tex.roca, vertexColors: true, side: THREE.DoubleSide, toneMapped: false, fog: true }); mats.push(rocaM);
  const grupo = new THREE.Group(); grupo.name = 'isla-' + id; grupo.visible = false; scene.add(grupo);
  grupo.add(new THREE.Mesh(g, rocaM));
  // (unas raíces finas que asoman bajo el césped)
  { const lp = [];
    for (let n = 0; n < 40; n++) {
      const i = (R() * N) | 0, v = (N1 + i) * 3; let x = pos[v], y = pos[v + 1], z = pos[v + 2];
      const len = D * (0.05 + R() * 0.12), pasos = 4, fx = (x - cx) / rMed, fz = (z - cz) / rMed, ph = R() * 6;
      for (let s = 0; s < pasos; s++) { const nx = x + fx * 0.03 + Math.sin(ph + s * 1.3) * 0.03, ny = y - len / pasos, nz = z + fz * 0.03 + Math.cos(ph + s * 1.1) * 0.03; lp.push(x, y, z, nx, ny, nz); x = nx; y = ny; z = nz; }
    }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); geos.push(lg);
    const lm = new THREE.LineBasicMaterial({ color: '#3b2a1c', transparent: true, opacity: 0.7 }); mats.push(lm);
    grupo.add(new THREE.LineSegments(lg, lm)); }

  // ---------- el canto: el césped que asoma sobre el borde, su tierra y la caliza, tapando la pared de la comarca ----------
  const dentro = (x, z) => { let s = false; for (let i = 0, j = N - 1; i < N; j = i++) { const a = Q[i], b = Q[j]; if ((a[1] > z) !== (b[1] > z) && x < a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1])) s = !s; } return s; };
  const NOR = Q.map((q, i) => { const a = Q[(i + N - 2) % N], b = Q[(i + 2) % N]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    let nx = tz, nz = -tx; if (dentro(q[0] + nx * 0.08, q[1] + nz * 0.08)) { nx = -nx; nz = -nz; } return [nx, nz, tx, tz]; });
  const H0 = Q.map(([x, z]) => grosor + alto(x, z));
  // (la panza no empieza en la base de la comarca sino algo por debajo de lo más bajo de su orilla: la pared de debajo, que con
  // la exageración del relieve era muy alta, se queda en el canto de césped y algo de roca; la de la comarca se esconde)
  const B = Math.min(...H0) - grosor * 0.15;
  // (filas: las puntas de la hierba por encima del borde, el pie de la hierba, el fondo de la tierra y, en la caliza, otra
  // vez el fondo de la tierra y el pie de la pared, bajo la comarca)
  const FILAS = [[0.2, 0.11, 0, 0], [-0.06, 0.09, 0.55, 0], [-0.5, 0.06, 1, 0], [-0.5, 0.06, 0, 1], [null, 0.04, 0, 1]];   // (el césped, grueso, como en las imágenes)
  const cantoPos = new Float32Array(FILAS.length * N1 * 3), cantoUv = [], cantoZ = [], cantoLuz = [], cantoIx = [];
  FILAS.forEach(([, , v, zona]) => { for (let i = 0; i <= N; i++) { const [nx, nz] = NOR[i % N]; cantoUv.push(LQ[i] / (zona ? TEX : 2.6), v); cantoZ.push(zona); cantoLuz.push(0.5 + 0.7 * Math.max(0, nx * LUZ.x + nz * LUZ.z)); } });
  for (const f of [0, 1, 3]) for (let i = 0; i < N; i++) { const a = f * N1 + i, b = a + 1; cantoIx.push(a, a + N1, b, b, a + N1, b + N1); }
  const cantoG = new THREE.BufferGeometry(); cantoG.setAttribute('position', new THREE.BufferAttribute(cantoPos, 3)); cantoG.setAttribute('uv', new THREE.Float32BufferAttribute(cantoUv, 2));
  cantoG.setAttribute('aZona', new THREE.Float32BufferAttribute(cantoZ, 1)); cantoG.setAttribute('aLuz', new THREE.Float32BufferAttribute(cantoLuz, 1)); cantoG.setIndex(cantoIx); geos.push(cantoG);
  const cantoM = new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { uRoca: { value: tex.roca }, uCesped: { value: tex.cesped } },
    vertexShader: 'attribute float aZona, aLuz; varying vec2 vUv; varying float vZ, vL, vRv; void main() { vUv = uv; vZ = aZona; vL = aLuz; vRv = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D uRoca, uCesped; varying vec2 vUv; varying float vZ, vL, vRv;
      void main() {
        vec4 t;
        if (vZ < 0.5) { t = texture2D(uCesped, vUv); if (t.a < 0.5) discard; t.rgb *= 1.15; }
        else t = vec4(texture2D(uRoca, vec2(vUv.x, -vRv / 2.4)).rgb, 1.0);
        gl_FragColor = linearToOutputTexel(vec4(t.rgb * vL, 1.0));
      }` }); mats.push(cantoM);
  const canto = new THREE.Mesh(cantoG, cantoM); canto.frustumCulled = false; canto.visible = false; scene.add(canto);
  let cantoSy = -1;
  const ponCanto = (sy) => { cantoSy = sy;
    FILAS.forEach(([dy, o], f) => { for (let i = 0; i <= N; i++) { const q = Q[i % N], [nx, nz] = NOR[i % N], v = (f * N1 + i) * 3, y = dy == null ? B * sy - 0.04 : Math.max(B * sy, H0[i % N] * sy + dy);
      cantoPos[v] = q[0] + nx * o; cantoPos[v + 1] = y; cantoPos[v + 2] = q[1] + nz * o; } });
    cantoG.attributes.position.needsUpdate = true; };

  // ---------- el hueco: el cráter de donde se arrancó la tierra ----------
  // Se ve solo por la boca del hueco (el búfer de plantilla, stencil): primero se marca la boca donde se ve (lo de delante,
  // la isla o una comarca vecina, la tapa); luego, en la boca, se borra la profundidad, y lo de dentro (las paredes de tierra,
  // el lago del fondo, el agua y las piedras que caen) se pinta con la suya. Debajo no hay cielo: es el molde de la tierra
  // arrancada, de paredes casi rectas de tierra y roca oscura que se cierran abajo, y en el fondo se junta el agua de los ríos
  // que caen por el borde (13 de noviembre de 2026: «pon un poco de lógica geográfica», pidió el autor).
  const CR = [[1, 0], [0.996, 0.1], [0.986, 0.3], [0.968, 0.5], [0.935, 0.66], [0.86, 0.8], [0.72, 0.9], [0.45, 0.97], [0.2, 1]];
  const DC = Math.max(1.8, rMed * 0.32), LAGO = -DC * 0.9, TIEMPO = { value: 0 };
  const eCr = (f) => { for (let k = 1; k < CR.length; k++) if (CR[k][1] >= f) { const [e0, h0] = CR[k - 1], [e1, h1] = CR[k]; return lerp(e0, e1, (f - h0) / (h1 - h0)); } return CR[CR.length - 1][0]; };
  const PLANT = { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp };
  const boca = (() => { const pos2 = [], ix = []; for (const [x, z] of P) pos2.push(x, 0.003, z);
    for (const t of THREE.ShapeUtils.triangulateShape(P.map(([x, z]) => new THREE.Vector2(x, z)), [])) ix.push(t[0], t[2], t[1]);
    const gb = new THREE.BufferGeometry(); gb.setAttribute('position', new THREE.Float32BufferAttribute(pos2, 3)); gb.setIndex(ix); geos.push(gb); return gb; })();
  const marcaM = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, side: THREE.DoubleSide, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp }); mats.push(marcaM);
  const borraM = new THREE.ShaderMaterial({ colorWrite: false, depthWrite: true, depthFunc: THREE.AlwaysDepth, transparent: true, side: THREE.DoubleSide, ...PLANT,
    vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w * 0.99999; }', fragmentShader: 'void main() { gl_FragColor = vec4(0.0); }' }); mats.push(borraM);
  const marca = new THREE.Mesh(boca, marcaM), borra = new THREE.Mesh(boca, borraM); marca.renderOrder = -0.95; borra.renderOrder = -0.9;
  const sima = new THREE.Group(); sima.name = 'sima-' + id; sima.visible = false; scene.add(sima); sima.add(marca, borra);
  // (las paredes y el fondo: tierra arriba, bajo la hierba de la orilla, y luego roca cada vez más oscura, a capas, rota)
  { const pp = [], cc = [], uu = [], ix = [], c2 = new THREE.Color(), SUELO = C('#4a3526'), ROCA_A = C('#7a6853'), ROCA_B = C('#2d231b');
    CR.forEach(([e, h], k) => { for (let i = 0; i <= N; i++) { const [x, z] = Q[i % N], dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz) || 1;
      const jag = k && k < CR.length - 1 ? 0.05 * Math.sin(LQ[i] * 7.3 + k * 1.9) + 0.035 * (R() - 0.5) : 0;
      const y = -h * DC * (1 + (k ? 0.035 * Math.sin(LQ[i] * 2.3 + k) : 0));
      pp.push(cx + dx * e + dx / r * jag, y, cz + dz * e + dz / r * jag); uu.push(LQ[i] / TEX, -y / TEX);
      if (h < 0.07) c2.copy(SUELO); else c2.copy(ROCA_A).lerp(ROCA_B, Math.min(1, h * 1.15)).multiplyScalar(0.82 + 0.28 * (0.5 + 0.5 * Math.sin(-y * 8.5 + Math.sin(LQ[i] * 0.7))));
      c2.multiplyScalar(0.9 + R() * 0.15); cc.push(c2.r, c2.g, c2.b); } });
    const L2 = (CR.length - 1) * N1, fondoI = pp.length / 3; pp.push(cx, -DC, cz); uu.push(0, DC / TEX); c2.copy(ROCA_B).multiplyScalar(0.8); cc.push(c2.r, c2.g, c2.b);
    for (let k = 0; k + 1 < CR.length; k++) for (let i = 0; i < N; i++) { const a = k * N1 + i, b = a + 1; ix.push(a, b, b + N1, a, b + N1, a + N1); }
    for (let i = 0; i < N; i++) ix.push(L2 + i, L2 + i + 1, fondoI);
    const w0 = new THREE.BufferGeometry(); w0.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); w0.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3)); w0.setAttribute('uv', new THREE.Float32BufferAttribute(uu, 2)); w0.setIndex(ix);
    const gp = w0.toNonIndexed(); w0.dispose(); pintaLuz(gp, false, cx, cz, 0.5, 0.65); geos.push(gp);
    const pm = new THREE.MeshBasicMaterial({ map: tex.roca, vertexColors: true, side: THREE.DoubleSide, toneMapped: false, transparent: true, ...PLANT }); mats.push(pm);
    const pared = new THREE.Mesh(gp, pm); pared.renderOrder = -0.8; sima.add(pared); }
  // (el lago del fondo, donde cae el agua: verde oscuro, con ondas y algún brillo)
  { const e = eCr(0.9) + 0.03, p3 = [], i3 = [], RQ = Q.map(([x, z]) => new THREE.Vector2(cx + (x - cx) * e, cz + (z - cz) * e));
    for (const v of RQ) p3.push(v.x, LAGO, v.y); for (const t of THREE.ShapeUtils.triangulateShape(RQ, [])) i3.push(t[0], t[2], t[1]);
    const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.Float32BufferAttribute(p3, 3)); gl.setIndex(i3); geos.push(gl);
    const lm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, ...PLANT, uniforms: { uT: TIEMPO },
      vertexShader: 'varying vec2 vP; varying vec3 vW; void main() { vP = position.xz; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uT; varying vec2 vP; varying vec3 vW;
        void main() { vec2 p = vP;
          float w = 0.5 * sin(dot(p, vec2(5.3, 2.1)) + uT * 1.6 + sin(p.y * 1.3) * 1.4) + 0.32 * sin(dot(p, vec2(-3.4, 6.1)) - uT * 1.25 + sin(p.x * 1.1) * 1.2)
                  + 0.18 * sin(dot(p, vec2(9.7, -7.9)) + uT * 2.3);
          float f = pow(1.0 - clamp(normalize(cameraPosition - vW).y, 0.0, 1.0), 3.0);
          vec3 c = mix(vec3(0.045, 0.09, 0.085), vec3(0.11, 0.18, 0.17), 0.5 + 0.35 * w);
          c = mix(c, vec3(0.42, 0.5, 0.56), f * 0.45) + vec3(0.6, 0.66, 0.68) * pow(max(w, 0.0), 8.0) * 0.18;
          gl_FragColor = vec4(c, 0.95); }` }); mats.push(lm);
    const lago = new THREE.Mesh(gl, lm); lago.renderOrder = -0.78; sima.add(lago); }

  // ---------- el agua que cae al vacío ----------
  // Donde un río sale de la comarca, cae por el borde de la isla; donde un río de Navarra entraba en ella, ahora se tira por
  // el borde del hueco al cielo de abajo. Columnas de agua (un corte de ocho lados, para que se vean desde cualquier lado, y
  // que de canto se desvanecen) que se abren al caer y se deshacen en bruma antes de las nubes. Si no le sale ningún río, un
  // manantial en lo más bajo de su orilla.
  const cerca = ([x, z]) => { let b = 0, bd = 1e9; for (let i = 0; i < N; i++) { const d = (Q[i][0] - x) ** 2 + (Q[i][1] - z) ** 2; if (d < bd) { bd = d; b = i; } } return b; };
  const elige = (L2, max) => { const out = []; for (const s of [...L2].sort((a, b) => a[2] - b[2])) { if (out.length >= max) break; const i = cerca(s); if (out.every(o => Math.hypot(Q[o.i][0] - Q[i][0], Q[o.i][1] - Q[i][1]) > rMed * 0.32)) out.push({ i, k: s[2] }); } return out; };
  const caidas = [];
  const anchoDe = (k) => (k === 1 ? 0.8 : k === 2 ? 0.58 : 0.42) * Math.max(1, rMed / 9);
  for (const s of elige(salen, 4)) caidas.push({ ...s, isla: true, w: anchoDe(s.k) });
  if (!caidas.length) { let b = 0, bh = 1e9; for (let i = 0; i < N; i++) { const h = alto(Q[i][0], Q[i][1]); if (h < bh) { bh = h; b = i; } } caidas.push({ i: b, k: 2, isla: true, w: anchoDe(2) }); }
  for (const s of elige(entran, 4)) caidas.push({ ...s, isla: false, w: anchoDe(s.k) * 0.85 });
  caidas.forEach((c3, n) => { const [x, z] = Q[c3.i], [nx, nz, tx, tz] = NOR[c3.i]; Object.assign(c3, { x, z, nx, nz, tx, tz, h0: H0[c3.i], fase: n * 1.7 + R() * 3, xo: x + nx * 0.3, zo: z + nz * 0.3 }); });
  const SEG = 30, LAD = 8, VC = (SEG + 1) * (LAD + 1);
  const aguaG = new THREE.BufferGeometry();
  const aPos = new Float32Array(caidas.length * VC * 3), aF = new Float32Array(caidas.length * VC * 4), aN = new Float32Array(caidas.length * VC * 2), aIx = [];
  caidas.forEach((_, n) => { const b = n * VC; for (let s = 0; s < SEG; s++) for (let j = 0; j < LAD; j++) { const a = b + s * (LAD + 1) + j, c4 = a + LAD + 1; aIx.push(a, c4, a + 1, a + 1, c4, c4 + 1); } });
  aguaG.setAttribute('position', new THREE.BufferAttribute(aPos, 3).setUsage(THREE.DynamicDrawUsage)); aguaG.setAttribute('aF', new THREE.BufferAttribute(aF, 4).setUsage(THREE.DynamicDrawUsage)); aguaG.setAttribute('aN', new THREE.BufferAttribute(aN, 2).setUsage(THREE.DynamicDrawUsage)); aguaG.setIndex(aIx); geos.push(aguaG);
  const AGUA = { uT: TIEMPO, uKI: { value: 0 }, uKB: { value: 0 } };
  const aguaVS = 'attribute vec4 aF; attribute vec2 aN; varying vec4 vF; varying vec3 vW, vN; varying float vY; void main() { vF = aF; vN = vec3(aN.x, 0.0, aN.y); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }';
  const aguaFS = (abajo) => `uniform float uT, uKI, uKB; varying vec4 vF; varying vec3 vW, vN; varying float vY;
    float h(float x) { return fract(sin(x * 127.1) * 43758.5453); }
    void main() {
      if (${abajo ? 'vY > 0.0' : 'vY < 0.0'}) discard;
      float u = vF.x, fall = vF.y, f = fall / max(vF.z, 0.001), col = floor(u * 32.0);
      float s1 = fract(fall * 0.5 - uT * 1.7 + h(col) * 3.0), s2 = fract(fall * 1.3 - uT * 2.6 + h(col + 7.0) * 5.0);
      float hilo = 0.62 + 0.38 * sin(u * 6.2832 * 9.0 + h(col) * 6.0);
      float a = (0.24 + 0.36 * smoothstep(0.6, 1.0, s1) + 0.24 * smoothstep(0.78, 1.0, s2)) * hilo;
      a = max(a, (1.0 - smoothstep(0.0, 0.18, fall)) * 0.8);
      vec3 V = normalize(cameraPosition - vW), Vh = normalize(vec3(V.x, 0.0, V.z) + 1e-4);
      a *= smoothstep(0.08, 0.75, abs(dot(normalize(vN + 1e-4), Vh)));
      a *= 1.0 - smoothstep(0.5, 1.0, f);
      vec3 c = mix(vec3(0.74, 0.88, 1.0), vec3(1.0), smoothstep(0.55, 1.0, max(s1, s2)) * 0.85);
      gl_FragColor = vec4(c, a * (vF.w > 0.5 ? uKB : uKI));
    }`;
  const aguaM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: AGUA, vertexShader: aguaVS, fragmentShader: aguaFS(false) }); mats.push(aguaM);
  const aguaAM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: AGUA, vertexShader: aguaVS, fragmentShader: aguaFS(true), ...PLANT }); mats.push(aguaAM);
  const agua = new THREE.Mesh(aguaG, aguaM), aguaA = new THREE.Mesh(aguaG, aguaAM); agua.renderOrder = 3; aguaA.renderOrder = -0.65; agua.frustumCulled = aguaA.frustumCulled = false;
  scene.add(agua); sima.add(aguaA); agua.visible = false;

  // ---------- rocío, bruma y polvo: puntos blandos (dos pasadas, como el agua: en el aire y dentro del hueco) ----------
  const NR = 26, NB2 = 6, NP = 44, NT = caidas.length * (NR + NB2) + NP;
  const pPos = new Float32Array(NT * 3), pS = new Float32Array(NT), pC = new Float32Array(NT * 4);
  const ptoG = new THREE.BufferGeometry(); ptoG.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage)); ptoG.setAttribute('aS', new THREE.BufferAttribute(pS, 1).setUsage(THREE.DynamicDrawUsage)); ptoG.setAttribute('aC', new THREE.BufferAttribute(pC, 4).setUsage(THREE.DynamicDrawUsage)); geos.push(ptoG);
  const PTO = { uEsc: { value: 600 } };
  const ptoVS = 'attribute float aS; attribute vec4 aC; uniform float uEsc; varying vec4 vC; varying float vY; void main() { vC = aC; vec4 w = modelMatrix * vec4(position, 1.0); vY = w.y; vec4 mv = viewMatrix * w; gl_Position = projectionMatrix * mv; gl_PointSize = aC.a > 0.003 ? clamp(aS * uEsc / max(0.1, -mv.z), 1.0, 256.0) : 0.0; }';
  const ptoFS = (abajo) => `varying vec4 vC; varying float vY; void main() { if (${abajo ? 'vY > 0.0' : 'vY < 0.0'}) discard; float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d) * vC.a; if (a < 0.004) discard; gl_FragColor = vec4(vC.rgb, a); }`;
  const ptoM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: PTO, vertexShader: ptoVS, fragmentShader: ptoFS(false) }), ptoAM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: PTO, vertexShader: ptoVS, fragmentShader: ptoFS(true), ...PLANT }); mats.push(ptoM, ptoAM);
  const pto = new THREE.Points(ptoG, ptoM), ptoA = new THREE.Points(ptoG, ptoAM); pto.renderOrder = 4; ptoA.renderOrder = -0.6; pto.frustumCulled = ptoA.frustumCulled = false; scene.add(pto); sima.add(ptoA); pto.visible = false;
  const fasesR = Float32Array.from({ length: caidas.length * NR }, () => R()), ladoR = Float32Array.from({ length: caidas.length * NR * 2 }, () => R() - 0.5);
  const polvo = Array.from({ length: NP }, () => ({ t: 9, x: 0, y: 0, z: 0, s: 0.3, vy: 0 }));
  let polvoN = 0;
  const echaPolvo = (x, y, z, s) => { const p = polvo[polvoN++ % NP]; Object.assign(p, { t: 0, x, y, z, s, vy: 0.15 + R() * 0.25 }); };

  // ---------- piedras: las que flotan alrededor y las que se desprenden, de la isla y del borde del hueco ----------
  const piedraG = new THREE.DodecahedronGeometry(1, 0); geos.push(piedraG);
  const flota = Array.from({ length: 12 }, () => ({ a: R() * Math.PI * 2, r: rMed * (0.8 + R() * 0.5), y: -D * (0.1 + R() * 0.7), s: 0.08 + R() * 0.2, w: (R() < 0.5 ? -1 : 1) * (0.05 + R() * 0.08), ph: R() * 6, rot: R() * 6 }));
  const NC = 90, caen = Array.from({ length: NC }, () => ({ vivo: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 0.1, rx: 0, ry: 0, wr: 1 }));
  let caeN = 0;
  const suelta = (x, y, z, vx, vy, vz, s) => { const p = caen[caeN++ % NC]; Object.assign(p, { vivo: true, x, y, z, vx, vy, vz, s, rx: R() * 6, ry: R() * 6, wr: 1 + R() * 3 }); };
  const piedraM = new THREE.MeshLambertMaterial({ color: '#c9bfae', emissive: '#6b6052', flatShading: true }); mats.push(piedraM);   // (caliza, como la roca)
  const piedraAM = new THREE.MeshLambertMaterial({ color: '#c9bfae', emissive: '#6b6052', flatShading: true, transparent: true, ...PLANT }); mats.push(piedraAM);
  const piedras = new THREE.InstancedMesh(piedraG, piedraM, flota.length + NC), piedrasA = new THREE.InstancedMesh(piedraG, piedraAM, NC);
  piedras.frustumCulled = piedrasA.frustumCulled = false; piedras.visible = false; piedrasA.renderOrder = -0.75; scene.add(piedras); sima.add(piedrasA);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  // (de dónde se desprende una piedra: de la panza de la isla, de un anillo cualquiera, o del borde del hueco, por dentro)
  const deLaIsla = (py, k) => { const kk = 2 + ((R() * 6) | 0), i = (R() * N) | 0, v = (kk * N1 + i) * 3; return [pos[v], py + pos[v + 1] * k, pos[v + 2], NOR[i]]; };
  let antes = 0, reloj = 0;

  return {
    D, rMed, alto: 0.62 * rMed + 0.9, base: B,   // (lo que sube: como antes, aunque la panza sea menos honda, para que se separe mucho)
    /** py: la altura de la comarca; sy: lo que se estira su relieve; k: cuánto está fuera, de 0 a 1; t, dt: el tiempo;
     *  esc: los píxeles que ocupa una unidad a una unidad de la cámara (para el tamaño del rocío y el polvo); cam: la cámara */
    update(py, sy, k, t, dt, esc = 600, cam = null) {
      const on = k > 0.004; grupo.visible = piedras.visible = sima.visible = agua.visible = pto.visible = canto.visible = on;
      if (!on) { antes = k; for (const p of caen) p.vivo = false; for (const p of polvo) p.t = 9; return; }
      const py0 = py; py = py + B * sy;   // (de aquí abajo, py es donde empieza la panza; py0, la base de la comarca)
      TIEMPO.value = t; PTO.uEsc.value = esc;
      if (Math.abs(sy - cantoSy) > 0.002) ponCanto(sy);
      canto.position.y = py0;
      // (al soltarse: un derrumbe por todo el borde, de la isla y del hueco, con su polvo)
      if (k > 0.03 && antes <= 0.03) for (let n = 0; n < 46; n++) {
        const i = (R() * N) | 0, [x, z] = Q[i], [nx, nz] = NOR[i], s = 0.05 + R() * (n < 8 ? 0.28 : 0.13);
        if (n % 2) suelta(x + nx * 0.05, py - 0.05, z + nz * 0.05, nx * (0.3 + R() * 0.7), 0.3 + R() * 0.6, nz * (0.3 + R() * 0.7), s);
        else { const y0 = fuera(x + nx * 0.3, z + nz * 0.3); suelta(x - nx * 0.08, y0, z - nz * 0.08, -nx * (0.05 + R() * 0.25), R() * 0.3, -nz * (0.05 + R() * 0.25), s); if (n % 6 === 0) echaPolvo(x, y0 - 0.2, z, 0.9 + R() * 0.8); }
        if (n % 5 === 0) echaPolvo(x, py - 0.2, z, 0.8 + R() * 0.9);
      }
      antes = k;
      // (y luego, sin parar, unas pocas cada segundo; de vez en cuando, con polvo)
      reloj -= dt;
      if (k > 0.35 && reloj <= 0) { reloj = 0.12 + R() * 0.35;
        if (R() < 0.6) { const [x, y, z, [nx, nz]] = deLaIsla(py, k); suelta(x, y, z, nx * R() * 0.25, -R() * 0.2, nz * R() * 0.25, 0.04 + R() * 0.12); if (R() < 0.18) echaPolvo(x, y, z, 0.5 + R() * 0.6); }
        else { const i = (R() * N) | 0, [x, z] = Q[i], [nx, nz] = NOR[i], y0 = fuera(x + nx * 0.3, z + nz * 0.3); suelta(x - nx * 0.06, y0 - 0.05, z - nz * 0.06, -nx * R() * 0.15, 0, -nz * R() * 0.15, 0.03 + R() * 0.1); if (R() < 0.12) echaPolvo(x, y0 - 0.1, z, 0.5 + R() * 0.5); }
      }
      grupo.position.y = py; grupo.scale.y = Math.max(0.001, k);   // (la panza sale al subir: tira de ella desde el suelo)
      // el agua
      AGUA.uKI.value = Math.min(1, Math.max(0, (k - 0.55) / 0.35)); AGUA.uKB.value = Math.min(1, Math.max(0, (k - 0.2) / 0.4));
      const fondo = LAGO;
      caidas.forEach((c3, n) => {
        const top = c3.isla ? py0 + c3.h0 * sy : fuera(c3.xo, c3.zo), L2 = Math.max(0.5, top - fondo); c3.top = top; c3.L = L2;
        const b = n * VC;
        for (let s = 0; s <= SEG; s++) {
          const f = (s / SEG) ** 1.15, y = top - L2 * f, cae = top - y;
          // (lo que se aparta del borde: la de la isla, por fuera del canto y luego bajo la panza, que se mete; la del hueco,
          // del canto de la vecina hacia dentro)
          const off = c3.isla ? 0.1 - 0.25 * Math.min(1, Math.max(0, (py - y) / (D * k * 0.14 + 0.05))) : 0.12 - 0.24 * Math.min(1, cae / 0.2);
          const ww = c3.w * (c3.isla ? 1 + 0.9 * f ** 0.7 : 0.9 + 0.7 * f ** 0.8), mece = Math.sin(t * 0.7 + f * 3 + c3.fase) * 0.05 * f;
          // (bajo la orilla, por la pared del cráter, que se va cerrando, hasta el lago)
          let ox = c3.x + c3.nx * off + c3.tx * mece, oz = c3.z + c3.nz * off + c3.tz * mece;
          if (y < 0) { const e = eCr(Math.min(1, -y / DC)), rx = c3.x - cx, rz = c3.z - cz, rr = Math.hypot(rx, rz) || 1; ox = cx + rx * e - rx / rr * 0.16 + c3.tx * mece; oz = cz + rz * e - rz / rr * 0.16 + c3.tz * mece; }
          for (let j = 0; j <= LAD; j++) { const th = j / LAD * Math.PI * 2, ct = Math.cos(th) * ww / 2, st = Math.sin(th) * ww * 0.26, vi = b + s * (LAD + 1) + j;
            aPos[vi * 3] = ox + c3.tx * ct + c3.nx * st; aPos[vi * 3 + 1] = y; aPos[vi * 3 + 2] = oz + c3.tz * ct + c3.nz * st;
            aF[vi * 4] = j / LAD; aF[vi * 4 + 1] = cae; aF[vi * 4 + 2] = L2; aF[vi * 4 + 3] = c3.isla ? 0 : 1;
            aN[vi * 2] = c3.tx * Math.cos(th) + c3.nx * Math.sin(th); aN[vi * 2 + 1] = c3.tz * Math.cos(th) + c3.nz * Math.sin(th); }
        }
      });
      aguaG.attributes.position.needsUpdate = aguaG.attributes.aF.needsUpdate = aguaG.attributes.aN.needsUpdate = true;
      // el rocío que baja con cada columna y la bruma de abajo, que se junta con las nubes
      let pi = 0;
      caidas.forEach((c3, n) => {
        const kk = c3.isla ? AGUA.uKI.value : AGUA.uKB.value;
        for (let r = 0; r < NR; r++) { const id2 = n * NR + r, u = (t * (0.11 + fasesR[id2] * 0.07) + fasesR[id2]) % 1, y = c3.top - c3.L * u * 0.92;
          const ab = c3.w * (0.4 + u * 1.6), sx = ladoR[id2 * 2] * ab, sz2 = ladoR[id2 * 2 + 1] * ab * 0.6 + u * 0.35, de = c3.isla ? 0 : -0.1;
          pPos[pi * 3] = c3.x + c3.tx * sx + c3.nx * (sz2 + de); pPos[pi * 3 + 1] = y; pPos[pi * 3 + 2] = c3.z + c3.tz * sx + c3.nz * (sz2 + de);
          pS[pi] = c3.w * (0.5 + u * 2.4); pC[pi * 4] = 0.92; pC[pi * 4 + 1] = 0.96; pC[pi * 4 + 2] = 1; pC[pi * 4 + 3] = kk * 0.32 * Math.sin(Math.PI * Math.min(1, u * 1.25)) * (1 - u * 0.5); pi++; }
        for (let r = 0; r < NB2; r++) { const a = r / NB2 * Math.PI * 2 + t * 0.05 + c3.fase, rr = c3.w * 1.6;
          pPos[pi * 3] = c3.x - c3.nx * 0.4 + Math.cos(a) * rr; pPos[pi * 3 + 1] = LAGO + 0.25 + Math.sin(t * 0.4 + r) * 0.08; pPos[pi * 3 + 2] = c3.z - c3.nz * 0.4 + Math.sin(a) * rr;
          pS[pi] = c3.w * 6; pC[pi * 4] = 0.95; pC[pi * 4 + 1] = 0.97; pC[pi * 4 + 2] = 1; pC[pi * 4 + 3] = kk * 0.35; pi++; }
      });
      for (const p of polvo) {
        if (p.t < 2.2) { p.t += dt; p.y += p.vy * dt; }
        const f = Math.min(1, p.t / 2.2); pPos[pi * 3] = p.x; pPos[pi * 3 + 1] = p.y; pPos[pi * 3 + 2] = p.z;
        pS[pi] = p.s * (0.6 + f * 1.8); pC[pi * 4] = 0.86; pC[pi * 4 + 1] = 0.82; pC[pi * 4 + 2] = 0.74; pC[pi * 4 + 3] = p.t < 2.2 ? 0.42 * (1 - f) * Math.min(1, p.t * 6) : 0; pi++;
      }
      ptoG.attributes.position.needsUpdate = ptoG.attributes.aS.needsUpdate = ptoG.attributes.aC.needsUpdate = true;
      // las piedras
      let n = 0, na = 0;
      for (const p of flota) {
        const a = p.a + t * p.w, y = py + p.y * k + Math.sin(t * 0.9 + p.ph) * 0.12, sc = p.s * Math.min(1, k * 1.4);
        e.set(p.rot + t * 0.2, p.rot * 2 + t * 0.13, 0); q.setFromEuler(e);
        piedras.setMatrixAt(n++, m4.compose(v3.set(cx + Math.cos(a) * p.r, y, cz + Math.sin(a) * p.r), q, s3.set(sc, sc * 0.8, sc)));
      }
      for (const p of caen) {
        if (!p.vivo) continue;
        p.vy -= 5.5 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 1 - dt * 0.3; p.vz *= 1 - dt * 0.3;
        if (p.y < LAGO + 0.08) { p.vivo = false; if (dentro(p.x, p.z) && p.s > 0.07) echaPolvo(p.x, LAGO + 0.15, p.z, 0.35 + p.s * 2); continue; }   // (llegan al fondo del cráter: salpican)
        const enHueco = dentro(p.x, p.z);
        if (!enHueco && p.y < fuera(p.x, p.z)) { p.vivo = false; continue; }   // (fuera del hueco, al llegar al suelo, se queda)
        const sc = p.s;
        e.set(p.rx + t * p.wr, p.ry + t * p.wr * 0.7, 0); q.setFromEuler(e); m4.compose(v3.set(p.x, p.y, p.z), q, s3.set(sc, sc * 0.8, sc));
        if (p.y > 0.02 || !enHueco) piedras.setMatrixAt(n++, m4); else piedrasA.setMatrixAt(na++, m4);
      }
      piedras.count = n; piedrasA.count = na;
      piedras.instanceMatrix.needsUpdate = true; piedrasA.instanceMatrix.needsUpdate = true;
    },
    dispose() { scene.remove(grupo, piedras, sima, agua, pto, canto); },
  };
}

/** El cielo azul con nubes pequeñas, como el de las imágenes del autor: una esfera alrededor de la cámara (BackSide) con su
 *  degradado (azul intenso lejos del horizonte, claro junto a él) y cúmulos blancos sueltos. uK: cuánto se ve sobre uFondo
 *  (el color de siempre del mapa). Lo usan la isla, por el hueco, y el mapa, de fondo mientras hay una isla en el aire. */
export function cieloShader() {
  return {
    uniforms: { uK: { value: 0 }, uT: { value: 0 }, uFondo: { value: C('#101626') }, uArriba: { value: CIELO_ARRIBA }, uHorizonte: { value: CIELO_HORIZONTE } },
    vertexShader: 'varying vec3 vD; void main() { vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uK, uT; uniform vec3 uFondo, uArriba, uHorizonte; varying vec3 vD;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        vec3 d = normalize(vD); float e = abs(d.y);
        vec3 c = mix(uHorizonte, uArriba, smoothstep(0.02, 0.75, e));
        // (cúmulos sueltos: manchas de ruido por encima de un umbral alto, en el cielo cerca del horizonte)
        vec2 q = vec2(atan(d.z, d.x) * 5.0 + uT * 0.004, e * 14.0);
        float v = n(q) * 0.55 + n(q * 2.3 + 3.7) * 0.3 + n(q * 5.1 + 1.3) * 0.15;
        float nube = smoothstep(0.66, 0.78, v) * (1.0 - smoothstep(0.12, 0.42, e)) * smoothstep(0.0, 0.04, e);
        c = mix(c, mix(vec3(0.86, 0.9, 0.96), vec3(1.0), smoothstep(0.7, 0.9, v)), nube * 0.95);
        gl_FragColor = linearToOutputTexel(vec4(mix(uFondo, c, uK), 1.0));
      }` };
}
