// Personajes de estilo aventura de dibujos animados (cabeza grande, ojos expresivos, cuerpo redondeado,
// manos y zapatos grandes), con sombreado de dibujo (cel shading) y contorno.
// Diseños originales de MENDIMENDIZ. Mantiene la interfaz del sistema anterior:
// buildMinifig(look) → Group con userData.J (articulaciones), userData.H, userData.look;
// MinifigAnimator (paso con rodillas y codos), MinifigRig (jugador), COSTUMES y lookToMinifig.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CAST } from '../data/cast.js';

// ---------- Materiales compartidos ----------
function toonRamp() {
  const d = new Uint8Array([125, 125, 125, 255, 185, 185, 185, 255, 230, 230, 230, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}
const RAMP = toonRamp();
// Material de los personajes: sombreado suave de estilo consola (sin contorno), con la textura
// del tejido en espacio del objeto y un acabado distinto según el tipo de superficie (aTex):
// piel cálida y algo translúcida, tela aterciopelada, pelo con brillo, cuero y botones brillantes.
function fabric(mat, k) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTex;\nvarying vec3 vOP; varying float vTex;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position; vTex = aTex;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vOP; varying float vTex;
float th(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float tn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(th(i), th(i + vec3(1,0,0)), f.x), mix(th(i + vec3(0,1,0)), th(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(th(i + vec3(0,0,1)), th(i + vec3(1,0,1)), f.x), mix(th(i + vec3(0,1,1)), th(i + vec3(1,1,1)), f.x), f.y), f.z); }
// relieve sin textura: altura procedural → normal perturbada con derivadas de pantalla
vec3 bumpN(vec3 sp, vec3 n, float h, float k) {
  vec3 sx = dFdx(sp), sy = dFdy(sp), r1 = cross(sy, n), r2 = cross(n, sx);
  float det = dot(sx, r1); vec3 grad = sign(det) * (dFdx(h) * k * r1 + dFdy(h) * k * r2);
  return normalize(abs(det) * n - grad);
}
float surfH(vec3 p, float t) {
  if (t > 0.5 && t < 1.5) return tn(p * 55.0) * 0.7 + tn(p * 130.0) * 0.3;                    // tela
  if (t > 1.5 && t < 2.5) return tn(vec3(p.x * 60.0, p.y * 7.0, p.z * 60.0));                  // mechones
  if (t > 2.5 && t < 3.5) return tn(p * 45.0);                                                  // lana
  if (t > 3.5 && t < 4.5) { float c = tn(p * 80.0); return c * c; }                             // cuero granulado
  return 0.0;
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      if (vTex > 0.5 && vTex < 4.5) normal = bumpN(-vViewPosition, normal, surfH(vOP, vTex), vTex < 1.5 ? 0.0012 : vTex < 2.5 ? 0.0016 : vTex < 3.5 ? 0.003 : 0.0015);`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      {
        float t = 1.0;
        if (vTex > 0.5 && vTex < 1.5) { // tela: trama fina
          float a = sin(vOP.x * 420.0 + vOP.y * 420.0) * sin(vOP.x * 420.0 - vOP.y * 420.0 + vOP.z * 420.0);
          t = 0.97 + 0.03 * a + 0.05 * (tn(vOP * 40.0) - 0.5);
        } else if (vTex > 1.5 && vTex < 2.5) { // pelo: mechones
          t = 0.84 + 0.24 * tn(vec3(vOP.x * 150.0, vOP.y * 16.0, vOP.z * 150.0));
        } else if (vTex > 2.5 && vTex < 3.5) { // lana / paja
          t = 0.8 + 0.28 * smoothstep(0.3, 0.7, tn(vOP * 55.0));
        } else if (vTex > 3.5 && vTex < 4.5) { // madera / cuero
          t = 0.9 + 0.12 * tn(vec3(vOP.x * 20.0, vOP.y * 160.0, vOP.z * 20.0));
        }
        diffuseColor.rgb *= mix(1.0, t, ${k.toFixed(2)});
      }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = vTex < 0.5 ? 0.5 : vTex < 1.5 ? 0.86 : vTex < 2.5 ? 0.4 : vTex < 3.5 ? 0.95 : vTex < 4.5 ? 0.32 : 0.2;`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
      metalnessFactor = vTex > 4.5 ? 0.45 : 0.0;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        vec3 nn = normalize(normal), vv = normalize(vViewPosition);
        float fr = pow(1.0 - clamp(dot(nn, vv), 0.0, 1.0), 2.5);
        totalEmissiveRadiance += diffuseColor.rgb * (vTex < 0.5 ? 0.08 : 0.2);              // luz de rebote: nada queda negro
        if (vTex < 0.5) totalEmissiveRadiance += diffuseColor.rgb * vec3(0.16, 0.06, 0.03) * (0.35 + fr); // piel translúcida (poca, para que se lean los volúmenes)
        else if (vTex < 1.5 || (vTex > 2.5 && vTex < 3.5)) totalEmissiveRadiance += mix(diffuseColor.rgb, vec3(1.0), 0.35) * fr * 0.34; // terciopelo
        else if (vTex < 2.5) { float ring = smoothstep(0.3, 0.45, nn.y) * (1.0 - smoothstep(0.55, 0.72, nn.y)); vec3 hl = max(diffuseColor.rgb, vec3(0.1, 0.07, 0.05)); totalEmissiveRadiance += (hl * 0.18 + vec3(0.02)) * ring + hl * 0.4 + mix(hl, vec3(0.7, 0.6, 0.5), 0.4) * fr * 0.35; }
        else totalEmissiveRadiance += vec3(1.0, 0.97, 0.92) * fr * 0.22;                   // brillo de cuero y metal
      }`);
  };
  return mat;
}
const TOON = fabric(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0 }), 1);
const OUTLINE = new THREE.MeshBasicMaterial({ color: '#2a1a14', side: THREE.BackSide });
OUTLINE.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normal * 0.008;'); };
const EYE = new THREE.MeshBasicMaterial({ vertexColors: true });

// ---------- Geometría ----------
const TX = { skin: 0, cloth: 1, hair: 2, wool: 3, wood: 4, metal: 5 };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function mtx(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) { _e.set(rx, ry, rz); _q.setFromEuler(_e); return _m.clone().compose(_v.set(x, y, z), _q, _s.set(sx, sy, sz)); }
function prep(g, color, tex = 0, m) {
  g = g.index ? g.toNonIndexed() : g.clone();
  if (m) g.applyMatrix4(m);
  for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a);
  const n = g.attributes.position.count, col = new Float32Array(n * 3), tx = new Float32Array(n).fill(tex);
  if (typeof color === 'function') {
    // color pintado según la posición (colorete de las mejillas, etc.)
    const p = g.attributes.position, c = new THREE.Color();
    for (let i = 0; i < n; i++) { color(p.getX(i), p.getY(i), p.getZ(i), c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  } else { const c = new THREE.Color(color); for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; } }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aTex', new THREE.BufferAttribute(tx, 1));
  return g;
}
class Part {
  constructor() { this.list = []; }
  add(geo, color, tex, m) { this.list.push(prep(geo, color, tex, m)); return this; }
  build(parent, outline = true, mat = TOON) {
    if (!this.list.length) return null;
    const g = mergeGeometries(this.list, false); this.list = [];
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  }
}
const SPH = (r, w = 24, h = 18, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const CAP = (r, len, seg = 16) => new THREE.CapsuleGeometry(r, len, 6, seg);
// cápsula que se estrecha (r0 arriba, r1 abajo): muslos, pantorrillas y brazos con forma
function TCAP(r0, r1, len, seg = 18) {
  const pts = [], n = 6;
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r1, -len / 2 + Math.sin(a) * r1)); }
  for (let i = 1; i < 6; i++) { const t = i / 6, r = r1 + (r0 - r1) * (t * t * (3 - 2 * t)); pts.push(new THREE.Vector2(r * (1 + 0.05 * Math.sin(Math.PI * t)), -len / 2 + t * len)); }
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(0.0005, Math.cos(a) * r0), len / 2 + Math.sin(a) * r0)); }
  return new THREE.LatheGeometry(pts, seg);
}
// Tronco en forma de pera (torno)
// Cabeza de una pieza: mofletes redondos abajo, frente amplia
// Mechón de pelo: tubo que sigue una curva y se afila hacia la punta
function strandGeo(pts, r0, r1, seg = 14, rad = 8) {
  const path = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(path, seg, 1, rad, false), p = g.attributes.position;
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, c = path.getPointAt(t), r = (r0 + (r1 - r0) * t) * (t > 0.85 ? 0.35 + 0.65 * (1 - t) / 0.15 : 1);
    for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; p.setXYZ(k, c.x + (p.getX(k) - c.x) * r, c.y + (p.getY(k) - c.y) * r, c.z + (p.getZ(k) - c.z) * r); }
  }
  g.computeVertexNormals(); return g;
}
// relieve de la cara (pómulos y barbilla) en coordenadas relativas al radio
function faceSculpt(nx, ny) {
  const g = (cx, cy2, sx, sy) => Math.exp(-(((nx - cx) / sx) ** 2) - (((ny - cy2) / sy) ** 2));
  const pair = (cx, cy2, sx, sy) => g(cx, cy2, sx, sy) + g(-cx, cy2, sx, sy);
  // mejillas llenas y pómulos altos, barbilla redonda que asoma hacia delante y un arco suave sobre los ojos
  const cheek = pair(0.44, -0.24, 0.24, 0.2), bone = pair(0.5, 0.02, 0.16, 0.1);
  const chin = g(0, -0.74, 0.26, 0.16), brow = g(0, 0.36, 0.5, 0.1) * (1 - g(0, 0.36, 0.1, 0.2) * 0.6);
  const socket = pair(0.27, 0.12, 0.15, 0.13);       // cuencas de los ojos
  const bridge = g(0, 0.04, 0.07, 0.16);             // puente de la nariz
  const muzzle = g(0, -0.45, 0.32, 0.16);            // zona de la boca un poco adelantada
  const philtrum = g(0, -0.34, 0.035, 0.06);         // surco bajo la nariz
  const lipFold = g(0, -0.62, 0.16, 0.04);           // hoyito entre el labio y la barbilla
  const forehead = g(0, 0.62, 0.5, 0.2);
  const temple = pair(0.8, 0.36, 0.18, 0.18);        // sienes algo hundidas
  return {
    cheek: cheek + bone * 0.5, chin, temple,
    k: 1 + 0.1 * cheek + 0.04 * bone + 0.12 * chin + 0.03 * brow - 0.05 * socket + 0.035 * bridge + 0.05 * muzzle - 0.012 * philtrum - 0.015 * lipFold + 0.03 * forehead,
  };
}
const JAW = 0.09;          // ensanche de la cara a la altura de los mofletes
function eggGeo(R) {
  const g = new THREE.SphereGeometry(R, 96, 72), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const t = y / R;
    const w = 1 + JAW * Math.exp(-(((t + 0.36) / 0.46) ** 2)) - 0.04 * Math.max(0, t) ** 2;
    x *= w * 1.02; z *= w * 0.96; y *= 0.94;
    if (z > 0 && t < -0.1) z *= 1 + 0.05 * Math.min(1, (-t - 0.1) * 3);
    // escultura de la cara: pómulos, barbilla y un poco de mandíbula (sólo en la parte delantera)
    if (z > 0) {
      const f = faceSculpt(x / R, y / R);
      x *= (1 + 0.06 * f.cheek) * (1 - 0.04 * f.temple); z *= f.k; y -= 0.035 * R * f.chin;
    }
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}
function torsoGeo(rb, rt, h, belly = 1) {
  const pts = [new THREE.Vector2(0.001, 0)];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, y = t * h;
    const waist = 1 - 0.09 * Math.exp(-(((t - 0.38) / 0.16) ** 2)) / belly, chest = 1 + 0.06 * Math.exp(-(((t - 0.72) / 0.14) ** 2));
    const r = (rb + (rt - rb) * t) * (1 + 0.1 * (belly - 1) * Math.sin(Math.PI * Math.min(1, t * 1.4))) * waist * chest * (t > 0.85 ? Math.sqrt(1 - ((t - 0.85) / 0.15) ** 2 * 0.55) : 1);
    pts.push(new THREE.Vector2(Math.max(0.01, r), y));
  }
  pts.push(new THREE.Vector2(0.001, h));
  return new THREE.LatheGeometry(pts, 32);
}

// Pelo esculpido de una sola pieza: una capa que envuelve el cráneo con volumen, mechones en
// relieve y un nacimiento del pelo dibujado (flequillo en mechones, patillas, sobre las orejas y
// nuca). Donde no hay pelo la capa se mete bajo la piel, así el borde queda redondeado y limpio.
const HAIR = {
  short: { fringe: 0.6, side: 0.34, back: -0.42, thick: 0.14, locks: 3, amp: 0.08, sweep: 0.07 },
  spiky: { fringe: 0.62, side: 0.36, back: -0.38, thick: 0.12, locks: 6, amp: 0.16, sweep: 0 },
  curly: { fringe: 0.58, side: 0.26, back: -0.5, thick: 0.2, locks: 7, amp: 0.1, sweep: 0, bumpy: true },
  ponytail: { fringe: 0.6, side: 0.3, back: -0.35, thick: 0.12, locks: 3, amp: 0.07, sweep: 0.08, part: true },
  bun: { fringe: 0.6, side: 0.3, back: -0.35, thick: 0.12, locks: 3, amp: 0.07, sweep: 0.08, part: true },
  braids: { fringe: 0.58, side: 0.26, back: -0.45, thick: 0.1, locks: 5, amp: 0.1, sweep: 0, part: true },
  long: { fringe: 0.56, side: 0.1, back: -0.6, thick: 0.13, locks: 5, amp: 0.1, sweep: 0.12, part: true },
};
const HOOD = { fringe: 0.72, side: -0.95, back: -1, thick: 0.12, locks: 1, amp: 0, sweep: 0, hood: true };
const smooth01 = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function hairGeo(R, st, hat) {
  const g = new THREE.SphereGeometry(R, 160, 110), p = g.attributes.position;
  const thick = hat ? Math.min(st.thick, 0.05) : st.thick, amp = hat ? st.amp * 0.35 : st.amp;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / R, y = p.getY(i) / R, z = p.getZ(i) / R;
    const az = Math.atan2(x, z), a = Math.abs(az);
    // altura del nacimiento del pelo según el ángulo: frente → sienes → sobre la oreja → nuca
    let hl;
    if (a < 1.0) {
      const k = st.part ? Math.abs(az) : az;                       // raya al medio o peinado a un lado
      hl = st.fringe + st.sweep * k - amp * (0.5 + 0.5 * Math.cos(az * st.locks * 2 + (st.part ? Math.PI : 0.6)));
      hl = hl + (st.side + 0.1 - hl) * smooth01(0.6, 1.15, a);
    } else if (a < 1.75) {
      // patilla por delante de la oreja y el pelo rodeándola por arriba
      const burn = Math.exp(-(((a - 1.2) / 0.12) ** 2));
      hl = st.side + 0.1 * (1 - smooth01(1.0, 1.45, a)) - burn * (st.side - 0.12) * 0.8;
    } else {
      // nuca rematada en mechones, no en línea recta
      hl = st.side + (st.back - st.side) * smooth01(1.75, 2.35, a) - 0.04 * smooth01(2.1, 2.5, a) * (0.5 + 0.5 * Math.cos(az * 7));
    }
    if (st.hood) hl = st.fringe + (st.side - st.fringe) * smooth01(0.8, 1.3, a);
    const d = y - hl;
    let r = 0.9 + 0.135 * smooth01(-0.06, 0.02, d) + thick * smooth01(0, 0.28, d);
    if (d > 0) {
      // volumen arriba y mechones en relieve que salen de la coronilla
      const crown = Math.max(0, y);
      const ridge = st.hood ? 0 : st.bumpy ? 0.5 + 0.5 * Math.sin(az * 9) * Math.sin(y * 14) : 0.5 + 0.5 * Math.cos(az * 11 + y * 2);
      r += thick * (0.3 * crown + 0.14 * ridge * smooth01(0, 0.2, d) * (1 - 0.7 * crown * crown));
    }
    // misma forma de huevo que la cabeza
    const t = y * r, w = 1 + JAW * Math.exp(-(((t + 0.36) / 0.46) ** 2)) - 0.04 * Math.max(0, t) ** 2;
    p.setXYZ(i, x * r * R * w * 1.02, y * r * R * 0.94, z * r * R * w * 0.96);
  }
  g.computeVertexNormals();
  return g;
}
// ---------- Personaje ----------
export function buildMinifig(look, opts = {}) {
  const L = { skin: '#f3c9a4', shirt: '#e8e0cc', pants: '#3b3a48', hair: '#4a2c1c', eyes: '#3a2a1a', ...look };
  L.shoes ||= '#6b3f24';
  const child = L.child || (L.height && L.height < 1.45);
  const k = (L.height ? L.height / 1.55 : 1) * (child ? 1.08 : 1);
  const BODY = { slim: [0.9, 0.92, 0.85], round: [1.12, 1.0, 1.3], athletic: [1.0, 1.08, 0.9] }[L.body || 'slim'];
  const B = (L.build || 1) * BODY[0];
  const headS = (L.bigHead ? 1.7 : 1) * (child ? 1.1 : 1.0);
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const hipY = 0.38 * k;
  const hips = new THREE.Group(); hips.position.y = hipY; body.add(hips);
  const J = { body, hips };
  const skin = L.skin, sleeve = L.sleeves || (L.print === 'sheet' ? '#f2eee6' : L.shirt);

  // --- piernas (muslo, rodilla, pantorrilla, zapato grande) ---
  const legX = 0.118 * B * k, thigh = 0.15 * k, shin = 0.13 * k;
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(s * legX, 0, 0); hips.add(leg);
    const P = new Part();
    P.add(TCAP(0.115 * k * B, 0.1 * k * B, thigh * 0.6), L.pants, TX.cloth, mtx(0, -thigh / 2, 0));
    if (L.shorts) P.add(CAP(0.066 * k, thigh * 0.3), skin, TX.skin, mtx(0, -thigh * 0.85, 0));
    P.build(leg);
    const knee = new THREE.Group(); knee.position.y = -thigh; leg.add(knee);
    const Q = new Part();
    const shinC = L.shorts ? skin : L.pants;
    Q.add(TCAP(0.098 * k * B, 0.085 * k * B, shin * 0.55), shinC, L.shorts ? TX.skin : TX.cloth, mtx(0, -shin / 2, 0));
    if (L.socks) Q.add(new THREE.CylinderGeometry(0.072 * k * B, 0.068 * k * B, shin * (L.longSocks ? 0.8 : 0.45), 14), L.socks, TX.cloth, mtx(0, -shin * (L.longSocks ? 0.55 : 0.75), 0));
    if (L.laces) for (let i = 0; i < 3; i++) Q.add(new THREE.TorusGeometry(0.071 * k * B, 0.009 * k, 5, 14), L.laces, TX.cloth, mtx(0, -shin * (0.62 + i * 0.12), 0, Math.PI / 2 + (i % 2 ? 0.35 : -0.35)));
    if (L.boots) Q.add(new THREE.CylinderGeometry(0.085 * k * B, 0.08 * k * B, shin * 0.55, 14), L.shoes, TX.wood, mtx(0, -shin * 0.72, 0));
    if (L.kneePatch) Q.add(SPH(0.04 * k), new THREE.Color(L.pants).multiplyScalar(0.75), TX.cloth, mtx(0, -0.01 * k, 0.06 * k, 0, 0, 0, 1, 1, 0.4));
    // zapato: grande y redondeado, con suela
    Q.add(SPH(0.13 * k * Math.max(1, B), 24, 16), L.shoes, L.espadrille ? TX.cloth : TX.wood, mtx(0, -shin - 0.035 * k, 0.06 * k, -0.08, 0, 0, 1, 0.78, 1.45));
    Q.add(SPH(0.07 * k * B, 16, 12), L.shoes, L.espadrille ? TX.cloth : TX.wood, mtx(0, -shin - 0.005 * k, -0.01 * k, 0, 0, 0, 1.25, 1, 1.1));
    Q.add(new THREE.CylinderGeometry(0.138 * k * B, 0.134 * k * B, 0.034 * k, 20), L.espadrille ? '#d9c79a' : new THREE.Color(L.shoes).multiplyScalar(0.55), L.espadrille ? TX.wool : TX.wood, mtx(0, -shin - 0.105 * k, 0.055 * k, 0, 0, 0, 1, 1, 1.5));
    Q.build(knee);
    J[s < 0 ? 'legL' : 'legR'] = leg; J[s < 0 ? 'kneeL' : 'kneeR'] = knee;
  }

  // --- cadera, torso y ropa ---
  const HP = new Part();
  HP.add(SPH(0.205 * k * B), L.pants, TX.cloth, mtx(0, 0.03 * k, 0, 0, 0, 0, 1.1, 0.82, 0.95));
  if (L.skirt) {
    const sk = new THREE.CylinderGeometry(0.17 * k * B, 0.3 * k * B, 0.34 * k, 24, 2, true);
    const p = sk.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); if (p.getY(i) < 0) { p.setX(i, p.getX(i) * (1 + 0.06 * Math.sin(a * 9))); p.setZ(i, p.getZ(i) * (1 + 0.06 * Math.sin(a * 9))); } }
    sk.computeVertexNormals();
    HP.add(sk, L.skirt, TX.cloth, mtx(0, -0.1 * k, 0));
    if (L.skirtBand) HP.add(new THREE.CylinderGeometry(0.3 * k * B, 0.305 * k * B, 0.035 * k, 24, 1, true), L.skirtBand, TX.cloth, mtx(0, -0.25 * k, 0));
  }
  if (L.bells) for (const bx of [-0.09, 0.09]) HP.add(new THREE.CylinderGeometry(0.05 * k, 0.085 * k, 0.16 * k, 12), '#8a7a58', TX.metal, mtx(bx * k, 0.02 * k, -0.19 * k, 0.2));
  HP.build(hips);

  const torso = new THREE.Group(); torso.position.y = 0.04 * k; hips.add(torso); J.torso = torso;
  const TH = 0.33 * k, rb = 0.212 * k * B, rt = 0.182 * k * B * BODY[1];
  const T = new Part();
  const torsoC = L.print === 'sheet' ? '#f2eee6' : L.print === 'bishop' ? '#f5efe0' : L.shirt;
  T.add(torsoGeo(rb, rt, TH, BODY[2] * (L.build > 1.1 ? 1.3 : 1)), torsoC, TX.cloth, mtx(0, 0, 0, 0, 0, 0, 1, 1, 0.9));
  const Z = (r) => r * 0.9;
  if (L.print === 'singlet') for (const s of [-1, 1]) T.add(SPH(0.07 * k), skin, TX.skin, mtx(s * 0.12 * k * B, TH * 0.88, 0, 0, 0, 0, 1, 0.6, 0.8));
  if (L.vest) {
    const v = new THREE.LatheGeometry([...Array(13)].map((_, i) => { const t = i / 12; return new THREE.Vector2((rb + (rt - rb) * t) * (1 + 0.1 * (B > 1.1 ? 1.4 : 1) * Math.sin(Math.PI * Math.min(1, t * 1.4))) + 0.014 * k, t * TH * 0.92); }), 32, Math.PI * 0.16, Math.PI * 1.68);
    T.add(v, L.vest, TX.cloth, mtx(0, 0.01 * k, 0, 0, 0, 0, 1, 1, 0.88));
    for (let i = 0; i < 3; i++) T.add(SPH(0.013 * k), L.vestButtons || '#d9b34a', TX.metal, mtx(-0.05 * k, TH * (0.3 + i * 0.17), Z(rb) + 0.02 * k));
  }
  if (L.print === 'coat') {
    const c = new THREE.LatheGeometry([...Array(10)].map((_, i) => { const t = i / 9; return new THREE.Vector2(rb * (1.05 + 0.25 * (1 - t) ** 2) + 0.01, -0.22 * k + t * (TH + 0.2 * k)); }), 22, Math.PI * 0.1, Math.PI * 1.8);
    T.add(c, L.shirt, TX.cloth, mtx(0, 0, 0, 0, 0, 0, 1, 1, 0.9));
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) T.add(SPH(0.014 * k), '#e8c34a', TX.metal, mtx(s * 0.06 * k, TH * (0.2 + i * 0.18), Z(rb) + 0.03 * k));
    T.add(SPH(0.05 * k), '#ffffff', TX.cloth, mtx(0, TH * 0.82, Z(rt) + 0.01 * k, 0, 0, 0, 1, 1.4, 0.6));
  }
  if (L.print === 'bishop') {
    T.add(new THREE.CylinderGeometry(rt * 1.1, rb * 1.9, TH * 1.25, 22, 1, true, Math.PI * 0.12, Math.PI * 1.76), L.shirt, TX.cloth, mtx(0, TH * 0.4, 0, 0, 0, 0, 1, 1, 0.9));
    for (const s of [-1, 1]) T.add(new THREE.BoxGeometry(0.04 * k, TH * 1.2, 0.01 * k), '#e8c34a', TX.metal, mtx(s * 0.07 * k, TH * 0.42, Z(rb) + 0.05 * k, 0, 0, s * 0.18));
    T.add(new THREE.TorusGeometry(0.035 * k, 0.01 * k, 6, 12), '#e8c34a', TX.metal, mtx(0, TH * 0.7, Z(rt) + 0.02 * k));
  }
  if (L.print === 'sheet') for (let i = 0; i < 16; i++) { const a = i * 2.4, y = TH * (0.15 + (i * 0.37) % 0.7); T.add(SPH(0.022 * k * (0.8 + (i % 3) * 0.3)), '#b3242a', TX.cloth, mtx(Math.sin(a) * rb * 0.98, y, Math.cos(a) * Z(rb) * 0.98, 0, a, 0, 1, 1.3, 0.25)); }
  if (L.print === 'rojilla') { T.add(new THREE.TorusGeometry(0.075 * k, 0.014 * k, 6, 16), '#1c2a4a', TX.cloth, mtx(0, TH * 0.98, 0, Math.PI / 2)); T.add(new THREE.CylinderGeometry(0.03 * k, 0.03 * k, 0.01 * k, 12), '#ffffff', TX.cloth, mtx(-0.06 * k, TH * 0.66, Z(rt) + 0.012 * k, Math.PI / 2)); for (let i = -3; i <= 3; i++) T.add(new THREE.BoxGeometry(0.008 * k, TH * 0.9, 0.004 * k), '#1c2a4a', TX.cloth, mtx(i * 0.04 * k, TH * 0.45, Z(rb) + 0.006 * k)); }
  if (L.print === 'blouse' || L.bodice) { const bd = L.bodice || '#2b2630'; T.add(new THREE.CylinderGeometry(rb * 1.12, rb * 1.1, TH * 0.55, 32, 1, true), bd, TX.cloth, mtx(0, TH * 0.3, 0, 0, 0, 0, 1, 1, 0.92)); for (let i = 0; i < 4; i++) T.add(new THREE.BoxGeometry(0.06 * k, 0.008 * k, 0.006 * k), L.lace || '#e8c34a', TX.metal, mtx(0, TH * (0.1 + i * 0.12), rb * 1.12 * 0.92 + 0.004 * k, 0, 0, (i % 2 ? 0.5 : -0.5))); T.add(new THREE.TorusGeometry(0.085 * k, 0.012 * k, 5, 18), '#ffffff', TX.cloth, mtx(0, TH * 0.96, 0, Math.PI / 2)); }
  if (L.print === 'shawl' || L.shawl) T.add(new THREE.ConeGeometry(rt * 1.6, TH * 0.75, 22, 1, true), L.shawl || '#3b2a3a', TX.wool, mtx(0, TH * 0.72, 0, 0, 0, 0, 1, 1, 0.9));
  if (L.print === 'overalls' || L.overalls) { const o = L.overalls || '#3b5a8a'; T.add(new THREE.CylinderGeometry(rb * 1.12, rb * 1.08, TH * 0.4, 32, 1, true), o, TX.cloth, mtx(0, TH * 0.2, 0, 0, 0, 0, 1, 1, 0.92)); T.add(new THREE.BoxGeometry(0.14 * k, TH * 0.35, 0.02 * k), o, TX.cloth, mtx(0, TH * 0.5, Z(rb) * 1.08 + 0.005 * k)); for (const s of [-1, 1]) T.add(new THREE.BoxGeometry(0.03 * k, TH * 0.5, 0.012 * k), o, TX.cloth, mtx(s * 0.06 * k, TH * 0.72, Z(rt) + 0.005 * k)); }
  if (L.apron) { T.add(new THREE.CylinderGeometry(rb * 1.08, rb * 1.3, TH * 0.95, 16, 1, true, -0.9, 1.8), L.apron, TX.cloth, mtx(0, TH * 0.28, 0, 0, 0, 0, 1, 1, 0.9)); T.add(new THREE.TorusGeometry(rb * 1.02, 0.008 * k, 5, 24), L.apron, TX.cloth, mtx(0, TH * 0.4, 0, Math.PI / 2, 0, 0, 1, 0.86, 1)); }
  if (L.sash) {
    T.add(new THREE.CylinderGeometry(rb * 1.08, rb * 1.1, 0.075 * k, 22, 1, true), L.sash, TX.cloth, mtx(0, 0.02 * k, 0, 0, 0, 0, 1, 1, 0.9));
    T.add(new THREE.BoxGeometry(0.045 * k, 0.16 * k, 0.012 * k), L.sash, TX.cloth, mtx(-0.1 * k, -0.07 * k, Z(rb) * 0.95, 0.1, 0, 0.12));
    T.add(new THREE.BoxGeometry(0.04 * k, 0.13 * k, 0.012 * k), L.sash, TX.cloth, mtx(-0.06 * k, -0.06 * k, Z(rb) * 0.97, 0.1, 0, -0.06));
    T.add(SPH(0.03 * k), L.sash, TX.cloth, mtx(-0.08 * k, 0.02 * k, Z(rb) + 0.01 * k, 0, 0, 0, 1.2, 1, 0.6));
  } else if (L.belt) { T.add(new THREE.CylinderGeometry(rb * 1.05, rb * 1.06, 0.035 * k, 22, 1, true), L.belt, TX.wood, mtx(0, 0.03 * k, 0, 0, 0, 0, 1, 1, 0.9)); T.add(new THREE.BoxGeometry(0.04 * k, 0.035 * k, 0.01 * k), '#d6b44a', TX.metal, mtx(0, 0.03 * k, Z(rb) + 0.01 * k)); }
  if (L.strap) T.add(new THREE.TorusGeometry(rb * 1.1, 0.013 * k, 5, 26), L.strap, TX.wood, mtx(0, TH * 0.5, 0, 0, 0, 0.75, 1.05, 1.5, 0.9));
  if (L.bag) T.add(new THREE.BoxGeometry(0.1 * k, 0.09 * k, 0.05 * k), L.bag, TX.wood, mtx(-rb * 1.05, 0.06 * k, 0.03 * k, 0, 0, 0.1));
  if (L.ribbons) { const cols = Array.isArray(L.ribbons) ? L.ribbons : ['#e03c3c', '#f2c230', '#3a8fd6', '#3ca05a']; cols.forEach((c, i) => { for (const d of [1, -1]) T.add(new THREE.TorusGeometry(rb * 1.08, 0.009 * k, 4, 26), c, TX.cloth, mtx(0, TH * (0.35 + i * 0.07), 0, 0, 0, d * (0.6 - i * 0.02), 1, 1.45, 0.9)); }); }
  if (L.fur) T.add(new THREE.SphereGeometry(rt * 1.45, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), L.fur, TX.wool, mtx(0, TH * 0.72, 0, 0, 0, 0, 1.05, 0.8, 0.95));
  if (L.shaggy) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z), sc = new THREE.Color(L.shaggy);
    for (let i = 0; i < 30; i++) {
      const a = i / 30 * Math.PI * 2 + (i % 2) * 0.1, r0 = (rt + rb) * 0.55, sa = Math.sin(a), ca = Math.cos(a), len = 0.45 * k + ((i * 17) % 7) * 0.03 * k;
      T.add(strandGeo([V(sa * r0 * 0.55, TH * 1.08, ca * r0 * 0.5), V(sa * r0 * 1.2, TH * 0.9, ca * r0 * 0.95), V(sa * r0 * 1.35, TH * 0.4, ca * r0 * 1.1), V(sa * r0 * 1.45, 0, ca * r0 * 1.2), V(sa * r0 * 1.5, -len, ca * r0 * 1.25)], 0.045 * k, 0.018 * k, 8, 6), sc.clone().multiplyScalar(0.85 + (i % 3) * 0.1), TX.hair);
    }
  }
  if (L.cape) T.add(new THREE.CylinderGeometry(rt * 1.2, rb * 1.8, TH * 1.5, 18, 1, true, Math.PI * 0.7, Math.PI * 0.6), L.cape, TX.cloth, mtx(0, TH * 0.25, -0.02 * k));
  if (L.scarf) {
    T.add(new THREE.TorusGeometry(0.07 * k, 0.024 * k, 8, 16), L.scarf, TX.cloth, mtx(0, TH * 0.97, 0, Math.PI / 2));
    T.add(new THREE.ConeGeometry(0.07 * k, 0.13 * k, 3), L.scarf, TX.cloth, mtx(0, TH * 0.8, Z(rt) + 0.01 * k, 0, 0, Math.PI, 1, 1, 0.3));
  }
  if (L.medal) T.add(new THREE.CylinderGeometry(0.025 * k, 0.025 * k, 0.008 * k, 14), '#e8c34a', TX.metal, mtx(0.05 * k, TH * 0.6, Z(rt) + 0.012 * k, Math.PI / 2));
  if (!L.vest && !L.print && L.placket !== false && !L.apron && !L.fur) for (let i = 0; i < 3; i++) T.add(SPH(0.015 * k, 14, 10), "#f7f1e2", TX.metal, mtx(0, TH * (0.35 + i * 0.17), Z(rb) + 0.01 * k, 0, 0, 0, 1, 1, 0.6));
  if ((!L.print || L.print === 'jersey' || L.print === 'rojilla') && !L.fur && !L.scarf) for (const sd of [-1, 1]) T.add(new THREE.ConeGeometry(0.045 * k, 0.09 * k, 3), L.print === 'rojilla' ? '#1c2a4a' : new THREE.Color(L.shirt).lerp(new THREE.Color('#ffffff'), 0.25), TX.cloth, mtx(sd * 0.04 * k, TH * 0.95, Z(rt) * 0.75, -1.2, 0, sd * 2.6, 1, 1, 0.35));
  // cuello visible con la nuez suave y el arranque del trapecio
  T.add(TCAP(0.075 * k, 0.085 * k, 0.02 * k, 18), skin, TX.skin, mtx(0, TH + 0.012 * k, -0.004 * k));
  T.build(torso);
  if (L.bell && !L.bells) { const bl = new THREE.Group(); bl.position.set(0, TH * 0.5, -rb); torso.add(bl); new Part().add(new THREE.CylinderGeometry(0.06 * k, 0.1 * k, 0.18 * k, 12), '#8a7a58', TX.metal).build(bl); J.bell = bl; }

  // --- brazos: hombro, codo y mano grande ---
  const shY = TH * 0.86, shX = rt * 1.05 + 0.02 * k, upper = 0.15 * k * (child ? 0.92 : 1), fore = 0.13 * k * (child ? 0.92 : 1);
  const bare = L.shortSleeves || L.print === 'singlet';
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * shX, shY, 0); torso.add(sh);
    const A = new Part();
    A.add(SPH(0.09 * k * B), L.fur || (L.print === 'singlet' ? skin : sleeve), L.fur ? TX.wool : L.print === 'singlet' ? TX.skin : TX.cloth, mtx(0, 0, 0));
    A.add(TCAP(0.085 * k * B * BODY[1], 0.075 * k * B, upper * 0.55), bare ? skin : sleeve, bare ? TX.skin : TX.cloth, mtx(0, -upper / 2, 0));
    if (L.shortSleeves && L.print !== 'singlet') A.add(new THREE.CylinderGeometry(0.066 * k * B, 0.064 * k * B, upper * 0.35, 12), sleeve, TX.cloth, mtx(0, -upper * 0.15, 0));
    A.build(sh);
    const el = new THREE.Group(); el.position.y = -upper; sh.add(el);
    const F = new Part();
    F.add(TCAP(0.075 * k * B, 0.065 * k * B, fore * 0.55), bare ? skin : sleeve, bare ? TX.skin : TX.cloth, mtx(0, -fore / 2, 0));
    if (!bare) F.add(new THREE.CylinderGeometry(0.056 * k * B, 0.05 * k * B, 0.034 * k, 18), L.print === 'coat' ? '#d6b44a' : new THREE.Color(sleeve).multiplyScalar(0.85), TX.cloth, mtx(0, -fore + 0.01 * k, 0));
    F.build(el);
    const hand = new THREE.Group(); hand.position.y = -fore - 0.035 * k; el.add(hand);
    const Hn = new Part(), hc = L.gloves || skin;
    const hT = L.gloves ? TX.cloth : TX.skin;
    // mano: palma, cuatro dedos algo curvados y pulgar enfrentado
    const hk = k * 1.3 * Math.max(0.95, B);
    Hn.add(SPH(0.052 * hk, 20, 14), hc, hT, mtx(0, -0.03 * hk, 0.004 * hk, 0, 0, 0, 1.05, 1.1, 0.62));
    for (let f = 0; f < 4; f++) {
      const x = (f - 1.5) * 0.024 * hk, len = [0.05, 0.058, 0.055, 0.044][f] * hk;
      Hn.add(CAP(0.0125 * hk, len * 0.55, 8), hc, hT, mtx(x * 1.05, -0.074 * hk - len * 0.28, 0.008 * hk, 0.18, 0, (f - 1.5) * -0.06));
      Hn.add(CAP(0.011 * hk, len * 0.4, 8), hc, hT, mtx(x * 1.1, -0.074 * hk - len * 0.72, 0.02 * hk, 0.55, 0, (f - 1.5) * -0.07));
    }
    Hn.add(CAP(0.015 * hk, 0.03 * hk, 8), hc, hT, mtx(-s * 0.045 * hk, -0.035 * hk, 0.024 * hk, 0.4, 0, s * 0.75));
    Hn.add(CAP(0.013 * hk, 0.022 * hk, 8), hc, hT, mtx(-s * 0.058 * hk, -0.062 * hk, 0.036 * hk, 0.7, 0, s * 0.35));
    Hn.build(hand);
    J[s < 0 ? 'armL' : 'armR'] = sh; J[s < 0 ? 'elbowL' : 'elbowR'] = el; J[s < 0 ? 'handL' : 'handR'] = hand;
  }

  // --- cabeza grande y ojos expresivos ---
  const neck = new THREE.Group(); neck.position.y = TH + 0.03 * k; torso.add(neck);
  const head = new THREE.Group(); neck.add(head); J.head = head;
  const R = 0.27 * k * headS, cy = R * 0.9;
  // profundidad de la superficie de la cara en (x, y relativo al centro)
  const fz = (x, y) => { const t = y / (0.94 * R); const w = 1 + JAW * Math.exp(-(((t + 0.36) / 0.46) ** 2)) - 0.04 * Math.max(0, t) ** 2; const xs = x / (w * 1.02); let z = Math.sqrt(Math.max(0, R * R - xs * xs - (t * R) ** 2)) * w * 0.96; if (t < -0.1) z *= 1 + 0.05 * Math.min(1, (-t - 0.1) * 3); return z * faceSculpt(x / R, y / (R * 0.94) * 0.94).k; };
  const Hd = new Part();
  const skinC = new THREE.Color(skin), blushC = skinC.clone().lerp(new THREE.Color('#f07a78'), 0.5);
  const blushOn = L.cheeks !== false;
  Hd.add(eggGeo(R), (x, y, z, c) => {
    c.copy(skinC); if (!blushOn || z <= 0) return;
    const nx = Math.abs(x) / R, ny = (y - cy) / R, w = Math.exp(-(((nx - 0.5) / 0.17) ** 2) - (((ny + 0.27) / 0.12) ** 2));
    c.lerp(blushC, 0.8 * w);
  }, TX.skin, mtx(0, cy, 0));
  // orejas: pabellón con hélice, concha interior más rosada y lóbulo
  const earC = new THREE.Color(skin).lerp(new THREE.Color('#e88a78'), 0.28);
  for (const s of [-1, 1]) {
    const em = mtx(s * R * 1.01, cy - R * 0.02, -R * 0.04, 0, s * 0.35, 0, 1.3, 1.3, 1.3);
    Hd.add(SPH(R * 0.2, 18, 14), skin, TX.skin, em.clone().multiply(mtx(0, 0, 0, 0, 0, 0, 0.42, 1, 0.8)));
    Hd.add(new THREE.TorusGeometry(R * 0.15, R * 0.045, 8, 20, Math.PI * 1.55), skin, TX.skin, em.clone().multiply(mtx(s * R * 0.05, R * 0.02, 0, 0, s * Math.PI / 2, Math.PI * 0.62, 1, 1.18, 1)));
    Hd.add(SPH(R * 0.1, 12, 10), earC, TX.skin, em.clone().multiply(mtx(s * R * 0.075, 0, R * 0.01, 0, 0, 0, 0.35, 1, 0.7)));
    Hd.add(SPH(R * 0.07, 12, 10), skin, TX.skin, em.clone().multiply(mtx(s * R * 0.03, -R * 0.17, R * 0.02, 0, 0, 0, 0.6, 0.9, 0.7)));
  }
  const noseR = R * (L.bigNose ? 0.22 : child ? 0.12 : 0.145);
  const noseC = new THREE.Color(skin).lerp(new THREE.Color('#f0a080'), 0.22);
  // tabique suave entre los ojos, punta redonda y aletas
  Hd.add(SPH(noseR, 24, 18), noseC, TX.skin, mtx(0, cy - R * 0.12, fz(0, -R * 0.12) + noseR * 0.4, -0.25, 0, 0, 1.0, 0.95, 1.12));
  Hd.add(SPH(noseR * 0.62, 16, 12), skin, TX.skin, mtx(0, cy - R * 0.01, fz(0, -R * 0.01) + noseR * 0.05, -0.5, 0, 0, 0.85, 1.4, 0.8));
  for (const s of [-1, 1]) Hd.add(SPH(noseR * 0.5, 12, 10), noseC, TX.skin, mtx(s * noseR * 0.78, cy - R * 0.15, fz(noseR * 0.8, -R * 0.15) + noseR * 0.16, 0, 0, 0, 1, 0.8, 0.8));
  if (L.freckles) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) Hd.add(SPH(R * 0.013, 6, 4), '#c98a60', TX.skin, mtx(s * R * (0.35 + i * 0.08), cy - R * (0.1 + (i % 2) * 0.05), fz(R * (0.35 + i * 0.08), -R * (0.1 + (i % 2) * 0.05)) - R * 0.004, 0, s * 0.4, 0, 1, 1, 0.3));
  if (L.facePaint === 'soot') Hd.add(SPH(R * 1.004, 22, 14, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.45), '#2a2220', TX.skin, mtx(0, cy, 0, 0, 0, 0, 1, 0.98, 0.95));
  if (L.beard) Hd.add(SPH(R * 0.78, 18, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), L.beard, TX.hair, mtx(0, cy - R * 0.1, R * 0.16, 0, 0, 0, 1.12, 1.15, 1));
  else if (L.stubble) Hd.add(SPH(R * 0.74, 16, 10, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), new THREE.Color(skin).lerp(new THREE.Color('#6a5040'), 0.14), TX.skin, mtx(0, cy - R * 0.15, R * 0.2, 0, 0, 0, 1.08, 1, 1));
  if (L.moustache) for (const s of [-1, 1]) Hd.add(CAP(R * 0.07, R * 0.18, 8), L.moustache, TX.hair, mtx(s * R * 0.14, cy - R * 0.27, fz(R * 0.14, -R * 0.27) + R * 0.03, 0, 0, s * (L.moustacheCurl ? 1.2 : 1.45)));
  if (L.old) for (const s of [-1, 1]) Hd.add(new THREE.TorusGeometry(R * 0.08, R * 0.012, 4, 10, Math.PI), new THREE.Color(skin).multiplyScalar(0.8), TX.skin, mtx(s * R * 0.52, cy + R * 0.1, R * 0.82, 0, s * 0.5, s * 0.5));
  if (L.glasses) for (const s of [-1, 1]) Hd.add(new THREE.TorusGeometry(R * 0.2, R * 0.025, 6, 16), L.glasses, TX.metal, mtx(s * R * 0.3, cy + R * 0.12, R * 0.97, 0, s * 0.3, 0));
  const brow = L.brows || new THREE.Color(L.hair || '#3b2418').multiplyScalar(0.8);
  const mood = L.face || 'smile';
  const browTilt = mood === 'angry' ? 0.45 : mood === 'worried' ? -0.35 : mood === 'brave' ? 0.18 : -0.05;
  const bS = L.browStyle || 'thick';
  // cejas: una pieza por lado, articulada para las expresiones (subir, bajar, inclinar)
  J.brows = [];
  for (const s of [-1, 1]) {
    const up = (mood === 'smirk' && s > 0 ? R * 0.06 : 0) - (mood === 'angry' ? R * 0.05 : 0);
    const g = new THREE.Group(); head.add(g); J.brows.push(g);
    if (bS === 'arched') { g.position.set(s * R * 0.3, cy + R * 0.33 + up, fz(R * 0.3, R * 0.44) + R * 0.02); new Part().add(new THREE.TorusGeometry(R * 0.16, R * 0.042, 8, 16, Math.PI * 0.62), brow, TX.hair, mtx(0, 0, 0, 0, s * 0.35, Math.PI * 0.19 - s * browTilt * 0.5)).build(g, false); }
    else { g.position.set(s * R * 0.31, cy + R * 0.43 + up, fz(R * 0.3, R * 0.44) + R * 0.025); new Part().add(TCAP(R * (bS === 'fine' ? 0.045 : 0.07), R * (bS === 'fine' ? 0.022 : 0.034), R * 0.22, 10), brow, TX.hair, mtx(0, 0, 0, 0, s * 0.35, s * (Math.PI / 2 + browTilt) + s * 0.08)).build(g, false); }
    g.userData.y0 = g.position.y; g.userData.s = s;
  }
  Hd.build(head);
  // ojos: blanco, iris de color, pupila y brillo
  const eyes = new THREE.Group(); eyes.position.set(0, cy + R * 0.14, 0); head.add(eyes); J.eyes = eyes;
  const E = new Part();
  const eyeW = R * (child ? 0.19 : 0.17), eyeH = R * (child ? 0.32 : 0.29), eyeX = R * 0.27;
  J.iris = []; root.userData.face = { eyeW, eyeH, R };
  for (const s of [-1, 1]) {
    const ey = R * 0.14, dz = (fz(eyeX + R * 0.02, ey) - fz(eyeX - R * 0.02, ey)) / (R * 0.04), yaw = s * Math.atan(-dz) * 0.8, zz = fz(eyeX, ey) - R * 0.035;
    E.add(SPH(1, 18, 14), '#ffffff', 0, mtx(s * eyeX, 0, zz, 0, yaw, 0, eyeW, eyeH, R * 0.06));
    const IR = new Part(), ig = new THREE.Group(); eyes.add(ig); J.iris.push(ig);
    IR.add(SPH(1, 18, 12), L.eyes, 0, mtx(s * eyeX * 0.97, -eyeH * 0.06, zz + R * 0.044, 0, yaw, 0, eyeW * 0.74, eyeH * 0.76, R * 0.02));
    IR.add(SPH(1, 12, 8), new THREE.Color(L.eyes).lerp(new THREE.Color('#ffffff'), 0.35), 0, mtx(s * eyeX * 0.97, -eyeH * 0.26, zz + R * 0.05, 0, yaw, 0, eyeW * 0.45, eyeH * 0.3, R * 0.018));
    IR.add(SPH(1, 14, 10), '#0e0806', 0, mtx(s * eyeX * 0.97, -eyeH * 0.02, zz + R * 0.052, 0, yaw, 0, eyeW * 0.4, eyeH * 0.46, R * 0.02));
    IR.add(SPH(1, 10, 8), '#ffffff', 0, mtx(s * eyeX * 0.93 - eyeW * 0.18, eyeH * 0.2, zz + R * 0.062, 0, yaw, 0, eyeW * 0.25, eyeW * 0.3, R * 0.016));
    IR.add(SPH(1, 8, 6), '#ffffff', 0, mtx(s * eyeX * 0.99 + eyeW * 0.2, -eyeH * 0.3, zz + R * 0.06, 0, yaw, 0, eyeW * 0.11, eyeW * 0.11, R * 0.016));
    IR.build(ig, false, EYE);
    const lidT = mood === 'angry' ? s * -0.35 : mood === 'worried' ? s * 0.3 : 0;
    E.add(new THREE.TorusGeometry(1, 0.13, 6, 18, Math.PI * 0.85), '#2a1a12', 0, mtx(s * eyeX, eyeH * 0.02, zz + R * 0.02, 0, yaw, Math.PI * 0.075 + lidT, eyeW * 1.02, eyeH * 0.98, R * 0.1));
    if (L.lashes) E.add(new THREE.BoxGeometry(eyeW * 0.5, eyeH * 0.12, R * 0.02), '#1a120d', 0, mtx(s * (eyeX + eyeW * 0.7), eyeH * 0.8, zz * 0.93, 0, yaw, s * -0.6));
    // pliegue del párpado: un arco de piel algo más oscura que da profundidad a la mirada
    E.add(new THREE.TorusGeometry(1, 0.05, 6, 20, Math.PI * 0.7), new THREE.Color(skin).multiplyScalar(0.82), 0, mtx(s * eyeX, eyeH * 0.14, zz + R * 0.015, 0, yaw, Math.PI * 0.15, eyeW * 1.2, eyeH * 1.12, R * 0.08));
  }
  E.build(eyes, false, EYE);
  if (L.lids === 'half') { const HL = new Part(); for (const s of [-1, 1]) { const ey = R * 0.14, dz = (fz(eyeX + R * 0.02, ey) - fz(eyeX - R * 0.02, ey)) / (R * 0.04), yaw = s * Math.atan(-dz) * 0.8, zz = fz(eyeX, ey) - R * 0.035; HL.add(SPH(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), skin, TX.skin, mtx(s * eyeX, eyeH * 0.02, zz + R * 0.03, 0, yaw, 0, eyeW * 1.14, eyeH * 1.06, R * 0.11)); HL.add(new THREE.TorusGeometry(1, 0.09, 6, 18, Math.PI * 0.8), '#2a1a12', 0, mtx(s * eyeX, eyeH * 0.36, zz + R * 0.09, 0, yaw, Math.PI * 0.1, eyeW * 1.02, eyeH * 0.3, R * 0.05)); } HL.build(eyes, false); }
  const lids = new THREE.Group(); lids.position.copy(eyes.position); head.add(lids); J.lids = lids; lids.visible = false;
  const Ld = new Part();
  for (const s of [-1, 1]) { const ey = R * 0.14, dz = (fz(eyeX + R * 0.02, ey) - fz(eyeX - R * 0.02, ey)) / (R * 0.04), yaw = s * Math.atan(-dz) * 0.8, zz = fz(eyeX, ey) - R * 0.035; Ld.add(SPH(1, 14, 10), skin, TX.skin, mtx(s * eyeX, 0, zz + R * 0.02, 0, yaw, 0, eyeW * 1.12, eyeH * 1.08, R * 0.09)); Ld.add(CAP(R * 0.028, eyeW * 1.3, 6), '#3a2418', TX.skin, mtx(s * eyeX, -eyeH * 0.1, zz + R * 0.1, 0, yaw, Math.PI / 2)); }
  Ld.build(lids, false);
  // boca
  const mouth = new THREE.Group(); mouth.position.set(0, cy - R * 0.44, fz(0, -R * 0.44) + R * 0.005); head.add(mouth); J.mouth = mouth;
  const Mo = new Part();
  const smile = mood === 'angry' || mood === 'worried' ? -1 : 1;
  const mw = R * (mood === 'grin' ? 0.3 : mood === 'happy' ? 0.24 : 0.2);
  if (mood === 'happy' || mood === 'grin') {
    Mo.add(SPH(mw * 1.08, 24, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#5a1a1c', TX.skin, mtx(0, 0.006, 0, 0, 0, 0, 1, 0.82, 0.16));
    Mo.add(SPH(1, 20, 10), '#fbf7f0', TX.skin, mtx(0, -mw * 0.1, mw * 0.02, 0, 0, 0, mw * 0.72, mw * 0.15, mw * 0.12));
    Mo.add(SPH(mw * 0.5, 16, 10), '#e0505a', TX.skin, mtx(0, -mw * 0.6, mw * 0.03, 0, 0, 0, 1.1, 0.5, 0.2));
    // labios: el de arriba recto y el de abajo siguiendo la curva de la boca
    const lip = new THREE.Color(skin).lerp(new THREE.Color('#d0605a'), 0.4);
    Mo.add(CAP(R * 0.028, mw * 1.9, 8), lip, TX.skin, mtx(0, mw * 0.02, mw * 0.03, 0, 0, Math.PI / 2, 1, 1, 0.8));
    Mo.add(new THREE.TorusGeometry(mw * 1.08, R * 0.03, 8, 28, Math.PI), lip, TX.skin, mtx(0, 0.006, 0, 0, 0, Math.PI, 1, 0.82, 0.3));
  }
  else if (mood === 'smirk') { Mo.add(new THREE.TorusGeometry(mw, R * 0.04, 8, 18, Math.PI * 0.6), '#6a2420', TX.skin, mtx(R * 0.03, mw * 0.5, 0, 0, 0, Math.PI * 1.15 + 0.35, 1, 0.65, 0.5)); Mo.add(SPH(R * 0.035, 8, 6), '#b06a58', TX.skin, mtx(mw * 0.95, mw * 0.25, 0)); }
  else Mo.add(new THREE.TorusGeometry(mw, R * (L.lashes ? 0.045 : 0.035), 6, 16, Math.PI * 0.8), L.lashes ? '#c0404a' : '#6a2420', TX.skin, mtx(0, smile > 0 ? mw * 0.55 : -mw * 0.6, 0, 0, 0, smile > 0 ? Math.PI * 1.1 : Math.PI * 0.1, 1, 0.7, 0.5));
  Mo.build(mouth, false);
  const talk = new THREE.Group(); talk.position.copy(mouth.position); head.add(talk); talk.visible = false; J.talk = talk;
  // bocas de las expresiones: sonrisa abierta, «O» de sorpresa y boca triste
  const lipC = new THREE.Color(skin).lerp(new THREE.Color('#d0605a'), 0.4);
  const mk = (fill) => { const g = new THREE.Group(); g.position.copy(mouth.position); g.visible = false; head.add(g); const P = new Part(); fill(P); P.build(g, false); return g; };
  const sw = R * 0.24;
  J.mSmile = mk(P => {
    P.add(SPH(sw * 1.08, 24, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#5a1a1c', TX.skin, mtx(0, 0.006, 0, 0, 0, 0, 1, 0.82, 0.16));
    P.add(SPH(1, 20, 10), '#fbf7f0', TX.skin, mtx(0, -sw * 0.1, sw * 0.02, 0, 0, 0, sw * 0.72, sw * 0.15, sw * 0.12));
    P.add(SPH(sw * 0.5, 16, 10), '#e0505a', TX.skin, mtx(0, -sw * 0.6, sw * 0.03, 0, 0, 0, 1.1, 0.5, 0.2));
    P.add(CAP(R * 0.028, sw * 1.9, 8), lipC, TX.skin, mtx(0, sw * 0.02, sw * 0.03, 0, 0, Math.PI / 2, 1, 1, 0.8));
    P.add(new THREE.TorusGeometry(sw * 1.08, R * 0.03, 8, 28, Math.PI), lipC, TX.skin, mtx(0, 0.006, 0, 0, 0, Math.PI, 1, 0.82, 0.3));
  });
  J.mO = mk(P => {
    P.add(SPH(1, 18, 12), '#4a1618', TX.skin, mtx(0, -R * 0.03, 0, 0, 0, 0, R * 0.085, R * 0.11, R * 0.03));
    P.add(new THREE.TorusGeometry(1, 0.28, 8, 22), lipC, TX.skin, mtx(0, -R * 0.03, R * 0.005, 0, 0, 0, R * 0.095, R * 0.12, R * 0.08));
  });
  J.mSad = mk(P => P.add(new THREE.TorusGeometry(R * 0.17, R * 0.035, 6, 16, Math.PI * 0.8), '#6a2420', TX.skin, mtx(0, -R * 0.1, 0, 0, 0, Math.PI * 0.1, 1, 0.7, 0.5)));
  new Part().add(SPH(R * 0.13, 14, 10), '#5a1a18', TX.skin, mtx(0, 0, 0, 0, 0, 0, 1.2, 1, 0.35)).add(SPH(R * 0.07, 10, 6), '#e0606a', TX.skin, mtx(0, -R * 0.05, R * 0.02, 0, 0, 0, 1.3, 0.6, 0.3)).build(talk, false);

  // --- pelo y sombreros ---
  const hatOn = !!(L.hat || L.txapela || L.helmet || L.hood || L.kerchief);
  const H = new Part(), HS = new Part();   // HS: pelo suelto que se balancea al andar
  const hc = L.hair, hs = L.hairStyle || 'short';
  const top = cy + R * 0.98;
  if (hc && hs !== 'bald' && L.hat !== 'mask') {
    H.add(hairGeo(R, HAIR[hs] || HAIR.short, hatOn), hc, TX.hair, mtx(0, cy, 0));
    if (!hatOn) {
      if (hs === 'spiky') for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; H.add(new THREE.ConeGeometry(R * 0.18, R * 0.42, 7), hc, TX.hair, mtx(Math.sin(a) * R * 0.5, top + R * 0.02, Math.cos(a) * R * 0.55 - R * 0.05, Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9)); }
      if (hs === 'curly') for (let i = 0; i < 18; i++) { const a = i * 2.4, rr = 0.35 + (i % 3) * 0.25; H.add(SPH(R * 0.17, 12, 10), hc, TX.hair, mtx(Math.sin(a) * R * rr, top - R * 0.1 - (i % 3) * R * 0.08, Math.cos(a) * R * rr - R * 0.05)); }
    }
    if (hs === 'bun' && !hatOn) H.add(SPH(R * 0.34), hc, TX.hair, mtx(0, top - R * 0.05, -R * 0.55));
    if (hs === 'ponytail') {
      // coleta: mechón grueso y redondo que cae con una curva desde el coletero
      const V = (x, y, z) => new THREE.Vector3(x, y, z);
      HS.add(strandGeo([V(0, cy + R * 0.4, -R * 1.02), V(0, cy + R * 0.2, -R * 1.32), V(R * 0.03, cy - R * 0.35, -R * 1.38), V(R * 0.1, cy - R * 0.9, -R * 1.2)], R * 0.2, R * 0.13, 18, 12), hc, TX.hair);
      for (const sd of [-1, 1]) HS.add(strandGeo([V(sd * R * 0.06, cy + R * 0.35, -R * 1.1), V(sd * R * 0.14, cy + R * 0.05, -R * 1.34), V(sd * R * 0.2, cy - R * 0.55, -R * 1.25)], R * 0.1, R * 0.06, 12, 8), hc, TX.hair);
      H.add(new THREE.TorusGeometry(R * 0.17, R * 0.065, 8, 14), L.hairTie || '#e03c3c', TX.cloth, mtx(0, cy + R * 0.38, -R * 1.1, Math.PI / 2 + 0.42));
      for (const sd of [-1, 1]) H.add(SPH(R * 0.1, 10, 8), L.hairTie || '#e03c3c', TX.cloth, mtx(sd * R * 0.14, cy + R * 0.46, -R * 1.12, 0, 0, 0, 1.2, 0.8, 0.6));
    }
    if (hs === 'long' && !L.hood) {
      // melena en mechones gruesos que caen desde la coronilla hasta los hombros
      const V = (x, y, z) => new THREE.Vector3(x, y, z);
      for (let i = 0; i < 13; i++) {
        const a = Math.PI * (0.62 + i / 12 * 0.76) * (i % 2 ? 1 : 1) , sa = Math.sin(a), ca = Math.cos(a), len = (L.hairLen || 1.25) + ((i * 37) % 5) * 0.06;
        const flare = 1.08 + ((i * 13) % 3) * 0.04;
        HS.add(strandGeo([V(sa * R * 0.55, cy + R * 0.9, ca * R * 0.55), V(sa * R * 1.02, cy + R * 0.3, ca * R * 1.0), V(sa * R * 1.05, cy - R * 0.4, ca * R * 1.02), V(sa * R * flare, cy - R * len, ca * R * flare * 0.98)], R * 0.2, R * 0.13), hc, TX.hair);
      }
    }
    if (hs === 'braids') for (const s of [-1, 1]) { for (let i = 0; i < 4; i++) HS.add(SPH(R * 0.15), hc, TX.hair, mtx(s * R * 0.85, cy - R * (0.35 + i * 0.26), -R * 0.1, 0, 0, 0, 1, 1.25, 1)); HS.add(SPH(R * 0.08), L.hairTie || '#e03c3c', TX.cloth, mtx(s * R * 0.85, cy - R * 1.4, -R * 0.1)); }
  }
  if (L.headband) H.add(new THREE.TorusGeometry(R * 1.02, R * 0.07, 6, 26), L.headband, TX.cloth, mtx(0, cy + R * 0.5, -R * 0.05, Math.PI / 2 - 0.2));
  if (L.kerchief) { H.add(new THREE.SphereGeometry(R * 1.1, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), L.kerchief, TX.cloth, mtx(0, cy + R * 0.02, -R * 0.05)); H.add(new THREE.ConeGeometry(R * 0.25, R * 0.4, 4), L.kerchief, TX.cloth, mtx(0, cy - R * 0.2, -R * 1.05, -0.5)); }
  if (L.txapela) { H.add(SPH(R * 1.17, 30, 14), L.txapela, TX.wool, mtx(R * 0.06, top - R * 0.2, -R * 0.04, -0.08, 0, -0.14, 1, 0.34, 1)); H.add(new THREE.TorusGeometry(R * 0.99, R * 0.055, 8, 30), new THREE.Color(L.txapela).multiplyScalar(0.7), TX.wool, mtx(0, top - R * 0.33, -R * 0.02, Math.PI / 2 - 0.08, 0, 0)); H.add(new THREE.CylinderGeometry(R * 0.03, R * 0.015, R * 0.2, 6), L.txapela, TX.wool, mtx(R * 0.05, top + R * 0.12, 0)); }
  const hatC = L.hatColor || '#c23b3b';
  if (L.hat === 'straw') { H.add(new THREE.CylinderGeometry(R * 1.8, R * 1.85, R * 0.08, 36), '#e2c46a', TX.wool, mtx(0, top - R * 0.36, 0, -0.06)); H.add(new THREE.CylinderGeometry(R * 0.98, R * 1.06, R * 0.5, 28), '#e2c46a', TX.wool, mtx(0, top - R * 0.1, 0)); H.add(new THREE.CylinderGeometry(R * 1.07, R * 1.07, R * 0.12, 28, 1, true), L.hatBand || '#2b2630', TX.cloth, mtx(0, top - R * 0.26, 0)); }
  if (L.hat === 'mitre') { const m = new THREE.ConeGeometry(R * 1.0, R * 1.8, 4); m.rotateY(Math.PI / 4); H.add(m, '#f4efe0', TX.cloth, mtx(0, top + R * 0.7, 0, 0, 0, 0, 1, 1, 0.62)); H.add(new THREE.BoxGeometry(R * 0.14, R * 1.5, R * 1.3), '#e8c34a', TX.metal, mtx(0, top + R * 0.55, 0)); H.add(new THREE.CylinderGeometry(R * 1.02, R * 1.02, R * 0.16, 24), '#e8c34a', TX.metal, mtx(0, top - R * 0.1, 0, 0, 0, 0, 1, 1, 0.9)); }
  if (L.hat === 'bicorne') { H.add(new THREE.CylinderGeometry(R * 1.7, R * 1.7, R * 0.2, 3), '#1a1a1a', TX.cloth, mtx(0, top, 0, 0, Math.PI / 2, 0, 1.15, 1, 0.45)); H.add(SPH(R * 0.95, 18, 10), '#1a1a1a', TX.cloth, mtx(0, top - R * 0.2, 0, 0, 0, 0, 1, 0.6, 1)); H.add(SPH(R * 0.16), '#c0392b', TX.cloth, mtx(R * 0.45, top + R * 0.3, R * 0.45)); }
  if (L.hat === 'cone') { H.add(new THREE.ConeGeometry(R * 1.05, R * 2.3, 20), hatC, TX.cloth, mtx(0, top + R * 0.95, 0)); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; H.add(new THREE.BoxGeometry(R * 0.12, R * 1.6, R * 0.02), ['#e03c3c', '#f2c230', '#3a8fd6', '#3ca05a'][i % 4], TX.cloth, mtx(Math.sin(a) * R * 0.5, top + R * 0.6, Math.cos(a) * R * 0.5 - R * 0.1, 0.35 * Math.cos(a), a, 0)); } H.add(SPH(R * 0.18), '#f2c230', TX.wool, mtx(0, top + R * 2.1, 0)); }
  if (L.hat === 'mask') { H.add(SPH(R * 1.05, 22, 16, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.12, Math.PI * 0.62), L.maskColor || '#f1e7d6', TX.skin, mtx(0, cy, 0)); H.add(new THREE.ConeGeometry(R * 1.1, R * 1.6, 16), hatC, TX.cloth, mtx(0, top + R * 0.6, 0)); }
  if (L.hat === 'basket') { H.add(new THREE.CylinderGeometry(R * 1.1, R * 1.3, R * 0.9, 18, 2, true), '#b08650', TX.wool, mtx(0, top + R * 0.2, 0)); H.add(new THREE.CircleGeometry(R * 1.1, 18), '#b08650', TX.wool, mtx(0, top + R * 0.65, 0, -Math.PI / 2)); }
  if (L.hat === 'wool') { H.add(new THREE.SphereGeometry(R * 1.1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), hatC, TX.wool, mtx(0, cy + R * 0.12, 0)); H.add(new THREE.TorusGeometry(R * 0.98, R * 0.1, 8, 28), hatC, TX.wool, mtx(0, cy + R * 0.46, 0, Math.PI / 2)); H.add(SPH(R * 0.2), '#ffffff', TX.wool, mtx(0, top + R * 0.2, 0)); }
  if (L.hat === 'crown' || L.crown) { H.add(new THREE.CylinderGeometry(R * 0.9, R * 0.85, R * 0.3, 8, 1, true), '#e8c34a', TX.metal, mtx(0, top + R * 0.05, 0)); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; H.add(new THREE.ConeGeometry(R * 0.1, R * 0.25, 4), '#e8c34a', TX.metal, mtx(Math.sin(a) * R * 0.88, top + R * 0.3, Math.cos(a) * R * 0.88)); } }
  if (L.helmet) H.add(new THREE.SphereGeometry(R * 1.12, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), L.helmet, TX.metal, mtx(0, cy + R * 0.1, 0));
  if (L.hood) {
    H.add(hairGeo(R * 1.02, HOOD, false), L.hood, TX.cloth, mtx(0, cy, -R * 0.02));
  }
  if (L.horns) for (const s of [-1, 1]) { const g = new THREE.ConeGeometry(R * 0.16, R * 1.5, 10, 5); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const t = p.getY(i) / (R * 1.5) + 0.5; p.setX(i, p.getX(i) + t * t * R * 0.4); } g.computeVertexNormals(); H.add(g, '#efe4c6', TX.wood, mtx(s * R * (L.hat === 'basket' ? 1.25 : 1.0), top + (L.hat === 'basket' ? R * 0.55 : R * 0.3), 0, 0, s < 0 ? Math.PI : 0, -s * 0.6)); }
  // momotxorro: la cara tapada con un pañuelo blanco de puntilla que cae bajo la cesta
  if (L.veil) { H.add(new THREE.SphereGeometry(R * 1.12, 28, 16, -Math.PI * 0.05, Math.PI * 1.1, Math.PI * 0.18, Math.PI * 0.62), L.veil, TX.cloth, mtx(0, cy - R * 0.05, 0)); for (let i = 0; i < 14; i++) { const a = -Math.PI * 0.5 + i / 13 * Math.PI; H.add(SPH(R * 0.07, 6, 5), L.veil, TX.cloth, mtx(Math.sin(a) * R * 0.95, cy - R * 1.02, Math.cos(a) * R * 0.95)); } }
  H.build(head);
  if (HS.list.length) {
    const sw = new THREE.Group(), pv = new THREE.Vector3(0, cy + R * 0.3, -R * 0.7); sw.position.copy(pv); head.add(sw);
    const m = HS.build(sw); m.position.copy(pv).multiplyScalar(-1); J.hairSway = sw;
  }

  // --- objetos en las manos ---
  const acc = (s, fn) => { const g = new THREE.Group(); J[s < 0 ? 'handL' : 'handR'].add(g); const P = new Part(); fn(P); P.build(g); return g; };
  const woodC = '#8a5a32', metC = '#b7bcc2';
  if (L.staff) { acc(1, P => { P.add(new THREE.CylinderGeometry(0.02 * k, 0.022 * k, 1.35 * k, 8), woodC, TX.wood, mtx(0, 0.2 * k, 0)); if (L.staff === 'crook') P.add(new THREE.TorusGeometry(0.07 * k, 0.02 * k, 6, 12, Math.PI * 1.2), woodC, TX.wood, mtx(0.07 * k, 0.87 * k, 0)); }); J.staff = true; }
  if (L.crozier) { acc(1, P => { P.add(new THREE.CylinderGeometry(0.02 * k, 0.02 * k, 1.5 * k, 8), '#e8c34a', TX.metal, mtx(0, 0.35 * k, 0)); P.add(new THREE.TorusGeometry(0.09 * k, 0.02 * k, 6, 14, Math.PI * 1.5), '#e8c34a', TX.metal, mtx(0.09 * k, 1.12 * k, 0)); }); J.staff = true; }
  if (L.axe) J.tool = acc(1, P => { P.add(new THREE.CylinderGeometry(0.02 * k, 0.022 * k, 0.7 * k, 8), woodC, TX.wood, mtx(0, 0.22 * k, 0.02 * k)); const b = new THREE.Shape(); b.moveTo(0, -0.06 * k); b.lineTo(0.16 * k, -0.11 * k); b.quadraticCurveTo(0.2 * k, 0, 0.16 * k, 0.11 * k); b.lineTo(0, 0.06 * k); b.closePath(); const g = new THREE.ExtrudeGeometry(b, { depth: 0.025 * k, bevelEnabled: false }); g.translate(0, 0, -0.012 * k); P.add(g, metC, TX.metal, mtx(0.015 * k, 0.5 * k, 0.02 * k)); });
  if (L.fork) acc(1, P => { P.add(new THREE.CylinderGeometry(0.018 * k, 0.018 * k, 1.35 * k, 8), woodC, TX.wood, mtx(0, 0.3 * k, 0)); for (const x of [-0.05, 0, 0.05]) P.add(new THREE.CylinderGeometry(0.009 * k, 0.005 * k, 0.22 * k, 5), metC, TX.metal, mtx(x * k, 1.07 * k, 0)); P.add(new THREE.BoxGeometry(0.13 * k, 0.025 * k, 0.025 * k), metC, TX.metal, mtx(0, 0.96 * k, 0)); });
  if (L.ball) acc(-1, P => P.add(SPH(0.075 * k), L.ball, TX.wood, mtx(0, -0.06 * k, 0.05 * k)));
  if (L.bladder) acc(1, P => { P.add(new THREE.CylinderGeometry(0.015 * k, 0.015 * k, 0.5 * k, 6), woodC, TX.wood, mtx(0, 0.18 * k, 0)); P.add(SPH(0.11 * k), '#e8d9a0', TX.wood, mtx(0, 0.48 * k, 0, 0, 0, 0, 1, 1.2, 1)); });
  if (L.basket) acc(-1, P => { P.add(new THREE.CylinderGeometry(0.13 * k, 0.09 * k, 0.14 * k, 14, 1, true), '#b08650', TX.wool, mtx(0, -0.12 * k, 0.03 * k)); P.add(new THREE.TorusGeometry(0.1 * k, 0.012 * k, 5, 12, Math.PI), '#8a6a3a', TX.wood, mtx(0, -0.06 * k, 0.03 * k)); if (L.basketFill) P.add(SPH(0.11 * k, 12, 6), L.basketFill, TX.skin, mtx(0, -0.07 * k, 0.03 * k, 0, 0, 0, 1, 0.35, 1)); });
  if (L.comb) acc(1, P => P.add(new THREE.BoxGeometry(0.12 * k, 0.04 * k, 0.012 * k), '#ffd24a', TX.metal, mtx(0, 0.02 * k, 0.05 * k)));
  if (L.castanets) for (const s of [-1, 1]) acc(s, P => P.add(SPH(0.035 * k), '#5a3a1e', TX.wood, mtx(0, -0.03 * k, 0.05 * k, 0, 0, 0, 1, 0.5, 1)));
  if (L.glove) acc(1, P => P.add(new THREE.SphereGeometry(0.085 * k, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.75), L.glove, TX.wood, mtx(0, -0.04 * k, 0.03 * k, Math.PI * 0.5, 0, 0, 0.9, 1.6, 0.9)));
  if (L.stick) acc(1, P => P.add(new THREE.CylinderGeometry(0.015 * k, 0.015 * k, 0.6 * k, 6), L.stick, TX.wood, mtx(0, 0.18 * k, 0)));
  if (L.handkerchief) acc(1, P => P.add(new THREE.BoxGeometry(0.16 * k, 0.16 * k, 0.008 * k), L.handkerchief, TX.cloth, mtx(0, 0.08 * k, 0.03 * k, 0, 0, 0.4)));
  if (L.hammer) acc(1, P => { P.add(new THREE.CylinderGeometry(0.018 * k, 0.018 * k, 0.4 * k, 8), woodC, TX.wood, mtx(0, 0.15 * k, 0)); P.add(new THREE.BoxGeometry(0.08 * k, 0.08 * k, 0.18 * k), '#5d6066', TX.metal, mtx(0, 0.36 * k, 0)); });

  root.userData.J = J;
  root.userData.H = hipY + 0.04 * k + TH + 0.03 * k + cy + R + (hatOn || L.hat ? 0.12 * k : 0.05 * k);
  root.userData.look = L;
  root.userData.headR = R; root.userData.headCy = cy;
  root.userData.legLen = thigh + shin + 0.12 * k;
  root.traverse(o => { if (o.isMesh && !o.userData.outline) { o.castShadow = true; o.receiveShadow = true; } });
  return root;
}
// Contorno visible solo cerca de la cámara (ahorra llamadas de dibujo)
export function setOutlines(root, on) { if (root.userData.outlineOn === on) return; root.userData.outlineOn = on; root.traverse(o => { if (o.userData.outline) o.visible = on; }); }

// ---------- Animación: andar con rodillas y codos, saltar, hablar y gestos ----------
// Poses de reposo con personalidad (brazo izquierdo; el derecho se refleja)
const POSES = {
  hips: { ax: 0.12, ay: 1.35, az: -0.72, el: -1.65 },            // brazos en jarras
  hip1: { ax: 0.12, ay: 1.35, az: -0.72, el: -1.65, one: true },  // una mano en la cadera
  behind: { ax: 0.32, ay: 2.3, az: -0.1, el: -1.25 },             // manos a la espalda
  shy: { ax: -0.32, ay: 1.1, az: -0.06, el: -1.15 },              // manos juntas delante
  crossed: { ax: -0.55, ay: 1.08, az: -0.22, el: -2.0 },          // brazos cruzados
  proud: { ax: 0.12, ay: 1.35, az: -0.72, el: -1.65, proud: true },
};
export class MinifigAnimator {
  constructor(root) {
    this.root = root; this.J = root.userData.J; this.L = root.userData.look || {};
    this.t = Math.random() * 10; this.phase = 0; this.walk = 0; this.run = 0; this.air = 0; this.lean = 0; this.land = 0; this.wasAir = 0;
    this.blinkT = 1 + Math.random() * 3; this.headYaw = 0;
    this.expr = null; this.exprT = 0; this.lookT = 0.5 + Math.random() * 2; this.look = new THREE.Vector2(); this.lookTo = new THREE.Vector2(); this.brow = { up: 0, inner: 0, one: 0 };
    this.legLen = root.userData.legLen || 0.5;
    this.act = 0; this.actKind = null; this.actDur = 0.5;
    this.pose = POSES[this.L.pose] || null;
    for (const a of [this.J.armL, this.J.armR]) a.rotation.order = 'ZYX';
  }
  update(dt, s) {
    dt = Math.max(0, Math.min(dt, 0.1)) || 0; // el primer fotograma puede llegar con tiempo negativo
    const J = this.J; this.t += dt;
    const speed = s.speed || 0, moving = speed > 0.12;
    this.walk += (Math.min(1, speed / 1.0) - this.walk) * (1 - Math.exp(-10 * dt));
    this.run += (Math.max(0, Math.min(1, (speed - 3.6) / 2.4)) - this.run) * (1 - Math.exp(-6 * dt));
    const grounded = s.grounded ?? true;
    this.air += ((grounded ? 0 : 1) - this.air) * (1 - Math.exp(-14 * dt));
    if (grounded && this.wasAir > 0.5) this.land = 1;
    this.wasAir = this.air; this.land = Math.max(0, this.land - dt * 5);
    const A = 0.5 + 0.35 * this.run, cycle = 4 * this.legLen * Math.sin(A) * 0.95;
    const w = moving ? Math.min(2 * Math.PI * 3.4, speed * 2 * Math.PI / cycle) : 0;
    this.phase += w * dt;
    if (!moving) this.phase += (Math.round(this.phase / Math.PI) * Math.PI - this.phase) * (1 - Math.exp(-8 * dt));
    const ph = this.phase, sn = Math.sin(ph), cs = Math.cos(ph), wk = this.walk;
    const th = sn * A * wk;
    let legL = -th, legR = th;
    let kneeL = Math.max(0, -cs) * (0.9 + 0.6 * this.run) * wk + 0.08 * wk, kneeR = Math.max(0, cs) * (0.9 + 0.6 * this.run) * wk + 0.08 * wk;
    let armLx = th * (0.9 + 0.3 * this.run), armRx = -th * (0.9 + 0.3 * this.run);
    let armLz = -0.12 - 0.05 * wk, armRz = 0.12 + 0.05 * wk;
    let elbL = -0.25 - 0.25 * wk - 1.0 * this.run, elbR = elbL;
    let bodyY = Math.abs(cs) * 0.035 * wk * (1 + this.run) - 0.02 * wk;
    let roll = sn * 0.05 * wk * (1 - this.run * 0.5), hipYaw = sn * 0.14 * wk;
    let torsoYaw = -hipYaw * 0.7, torsoPitch = 0.06 * wk + 0.22 * this.run;
    let headPitch = -torsoPitch * 0.6, headRoll = -roll * 0.6;
    const idle = 1 - wk, br = Math.sin(this.t * 2.1);
    torsoPitch += idle * br * 0.02; bodyY += idle * br * 0.004;
    armLz -= idle * (0.05 + br * 0.02); armRz += idle * (0.05 + br * 0.02);
    const shift = Math.sin(this.t * 0.4);
    roll += idle * shift * 0.025; kneeL += idle * Math.max(0, shift) * 0.12; kneeR += idle * Math.max(0, -shift) * 0.12;
    let headYaw = idle * Math.sin(this.t * 0.45) * 0.3 + (s.lookYaw || 0);
    headPitch += s.lookPitch || 0;
    if (this.air > 0.01) {
      const a = this.air;
      legL = legL * (1 - a) - a * 0.8; legR = legR * (1 - a) + a * 0.25; kneeL = kneeL * (1 - a) + a * 1.4; kneeR = kneeR * (1 - a) + a * 0.5;
      armLx = armLx * (1 - a) - a * 2.6; armRx = armRx * (1 - a) - a * 0.6; armLz -= a * 0.3; armRz += a * 0.9; elbL -= a * 0.2;
      bodyY *= 1 - a;
    }
    if (s.bent) { torsoPitch += s.bent; headPitch -= s.bent * 0.6; kneeL += s.bent * 0.5; kneeR += s.bent * 0.5; }
    // pose de reposo y postura propias de cada personaje (se funden con el paso al andar)
    let armLy = 0, armRy = 0, stance = 0;
    const P = this.pose, wI = idle * (1 - Math.min(1, this.air * 3));
    if (P && !(s.talking > 0) && !(s.wave > 0) && !(s.cheer > 0) && !s.dance && !s.carry && !(this.act > 0)) {
      armLx += (P.ax - armLx) * wI; armLz += (P.az - armLz) * wI; elbL += (P.el - elbL) * wI; armLy = P.ay * wI;
      if (!P.one) { armRx += (P.ax - armRx) * wI; armRz += (-P.az - armRz) * wI; elbR += (P.el - elbR) * wI; armRy = -P.ay * wI; }
      if (P.proud) { torsoPitch -= 0.08 * wI; headPitch -= 0.1 * wI; }
    }
    stance = 0.065 * wI; headRoll += (this.L.tilt || 0) * wI;
    if (s.talking > 0) { armRx = -0.6 + Math.sin(this.t * 3.1) * 0.35; armRz = 0.3 + Math.sin(this.t * 2.3) * 0.1; elbR = -1.0 + Math.sin(this.t * 4) * 0.3; armLx = -0.2 + Math.sin(this.t * 2.2 + 1) * 0.2; elbL = -0.6; headRoll += Math.sin(this.t * 2.2) * 0.07; headPitch += Math.sin(this.t * 3.7) * 0.05; }
    if (s.carry) { armLx = armRx = -1.0; armLz = 0.2; armRz = -0.2; elbL = elbR = -0.9; }
    if (s.wave > 0) { const sw = -0.3 + Math.sin(this.t * 11) * 0.32; if (J.staff) { armLz = -2.55; armLx = -0.42; armLy = 0; elbL = sw; } else { armRz = 2.55; armRx = -0.42; armRy = 0; elbR = sw; } headRoll -= 0.06; headYaw += 0.1; roll += 0.03; }
    if (s.cheer > 0) { const b = Math.abs(Math.sin(this.t * 9)); armLx = armRx = -3.0; armLz = -0.35; armRz = 0.35; elbL = elbR = -0.2 - Math.sin(this.t * 12) * 0.2; bodyY = b * 0.22; kneeL = kneeR = (1 - b) * 0.6; legL = legR = -(1 - b) * 0.3; }
    if (s.dance) { const b = this.t * s.dance; armLz = -2.2 + Math.sin(b) * 0.4; armRz = 2.2 + Math.sin(b + 1) * 0.4; armLx = armRx = 0; elbL = elbR = -0.4; legL = Math.max(0, Math.sin(b)) * -0.8; kneeL = Math.max(0, Math.sin(b)) * 1.3; legR = Math.max(0, -Math.sin(b)) * -0.8; kneeR = Math.max(0, -Math.sin(b)) * 1.3; bodyY = Math.abs(Math.sin(b)) * 0.14; roll = Math.sin(b) * 0.1; headRoll = -roll; }
    if (this.act > 0) {
      this.act -= dt;
      const p = 1 - Math.max(0, this.act) / this.actDur, K = this.actKind;
      if (K === 'chop' || K === 'hammer') { const swg = p < 0.5 ? -2.8 * (p / 0.5) : -2.8 + 3.3 * Math.min(1, (p - 0.5) / 0.15); armRx = armLx = swg; armLz = 0.3; armRz = -0.3; elbL = elbR = -0.3; torsoPitch += p > 0.5 ? 0.3 : -0.12; kneeL = kneeR = 0.3; }
      else if (K === 'lift') { const up = Math.sin(Math.min(1, p) * Math.PI); armRx = armLx = -1.4 - 1.6 * up; elbL = elbR = -0.4 * (1 - up); kneeL = kneeR = 1.1 * (1 - up); legL = legR = -0.5 * (1 - up); bodyY = -0.12 * (1 - up); torsoPitch += 0.3 * (1 - up); }
      else if (K === 'pick') { const d = Math.sin(Math.min(1, p) * Math.PI); torsoPitch += 0.7 * d; kneeL = kneeR = 0.9 * d; legL = legR = -0.5 * d; armRx = armLx = -0.9 - 0.4 * d; bodyY = -0.1 * d; headPitch -= 0.3 * d; }
      else if (K === 'throw' || K === 'hit') { armRx = p < 0.4 ? 0.9 * (p / 0.4) : 0.9 - 3.6 * Math.min(1, (p - 0.4) / 0.2); torsoYaw += 0.4 * Math.sin(p * Math.PI); }
      else if (K === 'point') { armRx = -1.5; armRz = 0.1; elbR = 0; }
      else if (K === 'pray') { armRx = armLx = -1.0; armRz = -0.45; armLz = 0.45; elbL = elbR = -1.2; headPitch += 0.25; }
      else if (K === 'kick') { legR = -1.3 * Math.sin(p * Math.PI); kneeR = 0.3; armLx = 0.6 * Math.sin(p * Math.PI); }
    }
    if (s.staff || J.staff) { armRx = Math.max(-0.7, Math.min(armRx, -0.2)); armRz = 0.12; elbR = -0.9; }
    this.lean += (Math.max(-0.2, Math.min(0.2, -(s.turnRate || 0) * speed * 0.025)) - this.lean) * (1 - Math.exp(-6 * dt));
    J.legL.rotation.x = legL; J.legR.rotation.x = legR; J.legL.rotation.z = -stance; J.legR.rotation.z = stance;
    J.kneeL.rotation.x = kneeL; J.kneeR.rotation.x = kneeR;
    J.armL.rotation.set(armLx, armLy, armLz); J.armR.rotation.set(armRx, armRy, armRz);
    J.elbowL.rotation.x = elbL; J.elbowR.rotation.x = elbR;
    const kneeDrop = this.legLen * 0.25 * (1 - Math.cos(Math.max(kneeL, kneeR) * 0.5)) * (this.air > 0.5 ? 0 : 1);
    J.body.position.y = bodyY - kneeDrop;
    J.body.rotation.z = roll + this.lean;
    J.hips.rotation.y = hipYaw;
    J.torso.rotation.set(torsoPitch, torsoYaw, J.torso.rotation.z);
    const sq = this.land * 0.12;
    J.body.scale.set(1 + sq * 0.6, 1 - sq + this.air * 0.04, 1 + sq * 0.6);
    this.headYaw += (Math.max(-1.1, Math.min(1.1, headYaw)) - this.headYaw) * (1 - Math.exp(-6 * dt));
    J.head.rotation.set(headPitch, this.headYaw, headRoll);
    if (J.bell) J.bell.rotation.z = Math.sin(ph * 2) * 0.35 * wk;
    // respiración en reposo y pelo suelto que se balancea con el paso
    const breath = Math.sin(this.t * 1.7) * 0.012 * (1 - wk * 0.6);
    J.torso.scale.set(1 + breath * 0.6, 1 + breath * 0.4, 1 + breath);
    if (J.hairSway) { this.hsw = (this.hsw || 0) + ((Math.sin(ph * 2) * 0.12 * wk + (s.turnRate || 0) * -0.05) - (this.hsw || 0)) * (1 - Math.exp(-8 * dt)); J.hairSway.rotation.set(0.05 * wk + Math.abs(this.hsw) * 0.4, 0, this.hsw); }
    this.blinkT -= dt;
    if (this.blinkT < -0.12) this.blinkT = 2 + Math.random() * 3.5;
    const blink = this.blinkT < 0;
    J.lids.visible = blink; J.eyes.visible = !blink;
    const talking = s.talking > 0 && (Math.sin(this.t * 17) + Math.sin(this.t * 11)) > 0.2;
    if (talking) J.talk.scale.y = 0.7 + Math.abs(Math.sin(this.t * 14)) * 0.5;
    if (J.iris) this.face(dt, s, talking); else { J.talk.visible = talking; J.mouth.visible = !talking; }
  }
  doAct(kind, t = 0.5) { this.actKind = kind; this.act = t; this.actDur = t; }
  // expresión durante un rato: 'happy' | 'surprised' | 'sad' | 'angry' | 'thinking'
  setExpr(name, dur = 2) { this.expr = name; this.exprT = dur; this.lookT = 0; }
  face(dt, s, talkingNow) {
    const J = this.J, F = this.root.userData.face;
    if (!F || !J.iris) return;
    if (this.exprT > 0 && (this.exprT -= dt) <= 0) this.expr = null;
    const ex = this.expr || (s.cheer > 0 ? 'happy' : null);
    // mirada: vistazos rápidos cada poco (a veces al frente), hacia arriba al pensar
    if ((this.lookT -= dt) <= 0) {
      this.lookT = 0.7 + Math.random() * 2.4;
      if (ex === 'thinking') this.lookTo.set(0.7, 0.9);
      else if (ex === 'surprised' || Math.random() < 0.45) this.lookTo.set(0, 0);
      else this.lookTo.set((Math.random() - 0.5) * 1.8, (Math.random() - 0.5) * 1.0);
    }
    this.look.lerp(this.lookTo, 1 - Math.exp(-22 * dt));
    for (const g of J.iris) g.position.set(this.look.x * F.eyeW * 0.2, this.look.y * F.eyeH * 0.14, 0);
    // cejas
    const B = { happy: [0.035, 0, 0], surprised: [0.09, 0.08, 0], sad: [0.02, 0.45, 0], angry: [-0.035, -0.55, 0], thinking: [0.01, 0, 0.07] }[ex] || [0, 0, 0];
    const talkUp = talkingNow ? Math.abs(Math.sin(this.t * 6)) * 0.02 : 0;
    const k = 1 - Math.exp(-12 * dt), b = this.brow;
    b.up += (B[0] + talkUp - b.up) * k; b.inner += (B[1] - b.inner) * k; b.one += (B[2] - b.one) * k;
    for (const g of J.brows || []) { const sd = g.userData.s; g.position.y = g.userData.y0 + (b.up + (sd > 0 ? b.one : -b.one * 0.2)) * F.R; g.rotation.z = -sd * b.inner; }
    // ojos algo más abiertos con la sorpresa
    const es = ex === 'surprised' ? 1.1 : ex === 'angry' ? 0.94 : 1;
    J.eyes.scale.y += (es - J.eyes.scale.y) * k;
    // boca según la expresión (hablar tiene prioridad)
    const m = talkingNow ? J.talk : ex === 'surprised' ? J.mO : ex === 'happy' ? J.mSmile : ex === 'sad' || ex === 'angry' ? J.mSad : J.mouth;
    for (const g of [J.mouth, J.talk, J.mSmile, J.mO, J.mSad]) if (g) g.visible = g === m;
  }
}

// ---------- Los nueve personajes jugables ----------
export const COSTUMES = {
  aizkolari: { skin: '#e6b48f', hair: '#3b2418', hairStyle: 'short', shirt: '#f4f1ea', pants: '#f4f1ea', sash: '#d42f2f', shoes: '#efe6d0', espadrille: true, socks: '#f4f1ea', laces: '#1d1d24', axe: true, face: 'brave', stubble: true, txapela: '#1d1d24', build: 1.1 },
  harrijasotzaile: { skin: '#d9a57f', hair: '#2a1a12', hairStyle: 'short', beard: '#2a1a12', headband: '#d42f2f', shirt: '#1d1d24', print: 'singlet', shortSleeves: true, pants: '#f4f1ea', sash: '#1d1d24', shoes: '#4a2f1c', build: 1.25, face: 'brave', bigNose: true },
  // momotxorro de Altsasu: cuernos, cesta, pañuelo de puntilla, camisa blanca manchada de rojo, piel de oveja y horca
  momotxorro: { skin: '#e2b08a', hair: '#1a1a1a', shirt: '#f2eee6', print: 'sheet', pants: '#ece6da', shoes: '#4a2f1c', fur: '#7a5a34', horns: true, hat: 'basket', veil: '#f4efe4', fork: true, face: 'angry', bells: true, height: 2.45, build: 1.2 },
  'san-fermin': { skin: '#efc8a8', hair: '#6b4a2e', shirt: '#b8232a', print: 'bishop', pants: '#f4efe0', skirt: '#f4efe0', hat: 'mitre', crozier: true, shoes: '#b8232a', face: 'smile', old: true, beard: '#b8aea0', gloves: '#f4efe0' },
  pelotari: { skin: '#eac1a0', hair: '#2a1a12', hairStyle: 'ponytail', lashes: true, shirt: '#f4f1ea', pants: '#f4f1ea', sash: '#d42f2f', shoes: '#f4f1ea', glove: '#8a5a32', face: 'brave', placket: false, eyes: '#3a6a3a' },
  sanferminero: { skin: '#f3c9a4', hair: '#5a321c', hairStyle: 'spiky', shirt: '#f4f1ea', pants: '#f4f1ea', sash: '#d42f2f', scarf: '#d42f2f', shoes: '#efe6d0', espadrille: true, laces: '#d42f2f', face: 'happy', freckles: true, child: true, height: 1.4, eyes: '#4a2a1a' },
  rojilla: { skin: '#d9a57f', hair: '#2a1a12', hairStyle: 'curly', lashes: true, shirt: '#d4002a', print: 'rojilla', pants: '#1c2a4a', shorts: true, socks: '#d4002a', longSocks: true, shoes: '#1d1d24', ball: '#ffffff', face: 'happy' },
  caravinagre: { skin: '#eab89a', hair: '#dcd7cf', hairStyle: 'short', shirt: '#2f6b3a', print: 'coat', pants: '#f4f1ea', socks: '#f4f1ea', longSocks: true, shoes: '#1a1a1a', hat: 'bicorne', bigHead: true, bladder: true, face: 'angry', moustache: '#dcd7cf', moustacheCurl: true, bigNose: true },
  'pastor-navarro': { skin: '#dba882', hair: '#6a6a6a', beard: '#8a8a88', txapela: '#1d1d24', shirt: '#efe9dc', vest: '#3a2a22', scarf: '#c0392b', pants: '#4a3f36', kneePatch: true, shoes: '#4a2f1c', boots: true, staff: 'crook', strap: '#6a4a2a', bag: '#8a6a3a', face: 'smile', old: true, bigNose: true },
};

// La cuadrilla de exploradores (personajes jugables)
for (const c of CAST) COSTUMES[c.id] = c.look;

// Convierte el aspecto antiguo de los vecinos al nuevo
export function lookToMinifig(l) {
  const hairStyle = l.hairStyle || (l.bun ? 'bun' : l.braids ? 'braids' : l.longHair ? 'long' : l.messy ? 'spiky' : l.bald ? 'bald' : l.ponytail ? 'ponytail' : 'short');
  const female = !!(l.skirt || l.bun || l.braids || l.longHair || l.female);
  const hsh = [...JSON.stringify(l)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return {
    pose: l.pose ?? ['behind', 'hips', null, 'crossed', 'hip1', 'shy'][hsh % 6],
    body: l.body ?? (l.old || l.build > 1.1 ? 'round' : ['slim', 'athletic', 'slim'][hsh % 3]),
    tilt: l.tilt ?? ((hsh >> 3) % 5 - 2) * 0.04,
    browStyle: l.browStyle ?? (female ? 'arched' : ['thick', 'thick', 'fine'][hsh % 3]),
    lids: l.lids ?? ((hsh >> 5) % 4 === 0 ? 'half' : undefined),
    ...l, hairStyle, lashes: l.lashes ?? female,
    pants: l.pants || (l.skirt ? '#2b2630' : '#3b3a48'),
    face: l.face || (l.fur ? 'angry' : ['smile', 'happy', 'smirk', 'grin', 'smile'][(hsh >> 2) % 5]),
    child: l.child || (l.height && l.height < 1.45),
    print: l.print || (female && !l.apron && !l.vest && !l.pattern ? 'blouse' : undefined),
    height: l.height ? Math.max(1.2, l.height * 0.95) : undefined,
    bigNose: l.bigNose ?? (!female && !!(l.old || l.moustache)),
  };
}

// ---------- Jugador ----------
export class MinifigRig {
  constructor(look) {
    this.obj = new THREE.Group();
    this.inner = buildMinifig(look, { hero: true });
    this.obj.add(this.inner);
    this.J = this.inner.userData.J;
    this.anim = new MinifigAnimator(this.inner);
    this.wave = 0; this.cheer = 0; this.talking = 0;
  }
  update(dt, speed, grounded, turnRate) {
    if (this.wave > 0) this.wave -= dt;
    if (this.cheer > 0) this.cheer -= dt;
    if (this.talking > 0) this.talking -= dt;
    this.anim.update(dt, { speed, grounded, turnRate, wave: this.wave, cheer: this.cheer, talking: this.talking, carry: this.carry });
  }
  doWave() { this.wave = 1.2; }
  doCheer() { this.cheer = 2; this.anim.setExpr('happy', 2.6); }
  setExpr(name, dur) { this.anim.setExpr(name, dur); }
  doAct(kind, t = 0.5) { this.anim.doAct(kind, t); }
}

// Materiales y utilidades compartidas con los animales
export const TOON_MAT = TOON, OUTLINE_MAT = OUTLINE, TEXKIND = TX;
export { mtx, prep };
