// Vista desde el mirador con los prismáticos: un paisaje propio donde los montes de verdad están en su dirección real,
// con su forma (pirámide de roca, macizo con cortados, cresta de varias cimas o loma redondeada), su altura aparente y
// sus colores (bosque abajo, pastos, roca en las pendientes, nieve arriba en los altos), con una textura de detalle y
// la bruma de la distancia. Delante, colinas y valles. Pocos montes, pero bien hechos.
import * as THREE from 'three';

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// ruido de valor 2D suave y fBm (sumas de octavas); «ridged» para crestas afiladas
function makeNoise(seed) {
  const r = mulberry(seed), P = new Uint8Array(512), G = new Float32Array(256);
  for (let i = 0; i < 256; i++) { P[i] = i; G[i] = r(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const v = (x, y) => G[P[(P[x & 255] + y) & 255]];
  const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1); return (a + (b - a) * u) * (1 - w) + (c + (d - c) * u) * w; };
  const fbm = (x, y, o = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * n(x * f, y * f); f *= 2.03; a *= 0.5; } return s; };
  const ridged = (x, y, o = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { const k = 1 - Math.abs(n(x * f, y * f) * 2 - 1); s += a * k * k; f *= 2.1; a *= 0.5; } return s; };
  return { n, fbm, ridged };
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

// textura de detalle (gris, se multiplica por el color): grano de roca, estratos y matas
function detailTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), r = mulberry(5);
  g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 7000; i++) { const v = 175 + r() * 80 | 0; g.fillStyle = `rgba(${v},${v},${v},0.45)`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2.5, 1 + r() * 1.5); }
  g.strokeStyle = 'rgba(110,110,110,0.12)'; g.lineWidth = 1;
  for (let y = 6; y < 256; y += 9 + r() * 10) { g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 3 + (r() - 0.5) * 2); g.stroke(); }   // estratos
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; return t;
}

// el terreno visto con los prismáticos: parcelas de cultivo o de prado (según lo montañoso que sea) con surcos y lindes
// de setos, y el bosque con copas; se calcula en cada píxel, así que no depende de lo fina que sea la malla. Se funde
// con el color de la malla a lo lejos
function groundShader(mat, rough) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uRough = { value: rough };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aFld; varying float vFld; varying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFld = aFld; vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uRough; varying float vFld; varying vec3 vWP;
float gh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(gh(i), gh(i + vec2(1, 0)), f.x), mix(gh(i + vec2(0, 1)), gh(i + vec2(1, 1)), f.x), f.y); }
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec2 P = vWP.xz; float dist = length(vWP - cameraPosition);
  // bloques de parcelas irregulares (celdas de Voronoi de unos 600 m), cada uno con su orientación, y caminos de
  // tierra en sus bordes
  vec2 g0 = floor(P / 600.0), rid = g0; float d1 = 1e9, d2 = 1e9;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = g0 + vec2(x, y), c = (g + 0.15 + 0.7 * vec2(gh(g), gh(g + 9.1))) * 600.0; float d = length(P - c);
    if (d < d1) { d2 = d1; d1 = d; rid = g; } else if (d < d2) d2 = d;
  }
  float reg = gh(rid + 0.5), track = 1.0 - smoothstep(2.5, 5.0, (d2 - d1) * 0.5);
  float an = reg * 3.1416; vec2 q = mat2(cos(an), -sin(an), sin(an), cos(an)) * P;
  vec2 sz = vec2(55.0 + reg * 60.0, 34.0 + gh(rid + 3.0) * 34.0);
  vec2 cid = floor(q / sz), f = fract(q / sz); float hc = gh(cid + reg * 17.0);
  // cultivos en el llano (cereal, verde, barbecho, girasol), prados de distintos verdes en la montaña
  vec3 low = hc < 0.3 ? vec3(0.78, 0.68, 0.38) : hc < 0.52 ? vec3(0.45, 0.58, 0.26) : hc < 0.66 ? vec3(0.56, 0.44, 0.30) : hc < 0.82 ? vec3(0.55, 0.64, 0.32) : vec3(0.70, 0.66, 0.36);
  vec3 mtn = hc < 0.35 ? vec3(0.42, 0.56, 0.26) : hc < 0.6 ? vec3(0.50, 0.62, 0.30) : hc < 0.8 ? vec3(0.36, 0.50, 0.24) : vec3(0.62, 0.66, 0.36);
  vec3 crop = mix(low, mtn, smoothstep(0.35, 0.8, uRough)); crop = lin(mix(crop, vec3(dot(crop, vec3(0.3, 0.59, 0.11))), 0.22));
  float rows = 0.92 + 0.08 * sin((hc > 0.5 ? q.x : q.y) * 2.4);
  float edge = min(min(f.x, 1.0 - f.x) * sz.x, min(f.y, 1.0 - f.y) * sz.y);
  float hedge = (1.0 - smoothstep(1.0, 3.2, edge + gn(P / 3.0) * 1.5)) * step(0.3, gh(cid + 5.0));
  vec3 fc = crop * rows * (0.86 + 0.28 * gn(P / 11.0));
  fc = mix(fc, lin(vec3(0.20, 0.30, 0.14)), hedge * 0.85);
  fc = mix(fc, lin(vec3(0.66, 0.60, 0.48)), track * 0.9);
  float m = clamp(vFld, 0.0, 1.0) * smoothstep(5200.0, 1500.0, dist);
  diffuseColor.rgb = mix(diffuseColor.rgb, fc * 1.05, m * 0.8);
  // bosque: copas de árboles (manchas claras y oscuras de unos metros)
  float can = mix(gn(P / 22.0), gn(P / 6.0) * 0.6 + gn(P / 2.3) * 0.4, smoothstep(2200.0, 700.0, dist));
  diffuseColor.rgb *= mix(1.0, 0.68 + 0.6 * can, (1.0 - clamp(vFld, 0.0, 1.0)) * smoothstep(5000.0, 900.0, dist) * 0.85);
}`);
  };
}

// roca de los montes: en las paredes empinadas, estratos horizontales y grietas verticales según la altura real (la
// textura de detalle se estiraba en los cortados como una cortina)
function rockShader(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWP; varying vec3 vWN;
float rh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(rh(i), rh(i + vec2(1, 0)), f.x), mix(rh(i + vec2(0, 1)), rh(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec3 c = diffuseColor.rgb; float mx = max(c.r, max(c.g, c.b)), sat = (mx - min(c.r, min(c.g, c.b))) / max(mx, 1e-3);
  float steep = smoothstep(0.35, 0.75, 1.0 - abs(vWN.y)) * (1.0 - smoothstep(0.18, 0.4, sat));   // solo la roca gris empinada
  float along = vWP.x * 0.7 + vWP.z * 0.7, w = rn(vec2(along * 0.02, vWP.y * 0.01)) * 6.0;
  float strata = 0.5 + 0.5 * sin(vWP.y * 0.55 + w);
  float crack = smoothstep(0.72, 0.9, rn(vec2(along * 0.12, vWP.y * 0.012)));
  float k = mix(1.0, (0.8 + 0.28 * strata) * (1.0 - crack * 0.45) * (0.85 + 0.3 * rn(vec2(along * 0.05, vWP.y * 0.08))), steep);
  diffuseColor.rgb *= k;
}`);
  };
}

const C = (h) => new THREE.Color(h);
const PAL = {
  forest: C('#2c4527'), forest2: C('#3a5a2e'), meadow: C('#7d9450'), meadowDry: C('#9a9a5a'),
  rockGrey: C('#7f7b74'), rockLime: C('#a8a294'), rockDark: C('#5e5a55'), snow: C('#f3f5f8'), far: C('#7d8fa6'), field: C('#a3a05c'), field2: C('#6f8a3e'),
};

/** Forma de un monte: la que dice su descripción (muralla caliza, loma herbosa, cima afilada, sierra…) y, si no dice
 * nada, según su altura (siempre la misma para el mismo monte). Muy lejos se ve la cordillera entera. */
function typeOf(m) {
  const h = hash(m.id || m.name), t = (m.intro || '').toLowerCase();
  if (m.km > 40 && m.altitude >= 1400) return 'sierra';
  if (/afilad|puntiag|pala final|silueta|rocosa y solitaria/.test(t)) return 'pico';
  if (/muralla|caliza|escarpe|meseta|macizo|proa/.test(t)) return 'macizo';
  if (/loma|redondead|suave|amplia y verde|herbos|cima amplia/.test(t)) return 'loma';
  if (/sierra|línea de cumbre|cresta|peñas/.test(t)) return 'cresta';
  if (m.altitude >= 2000) return 'pico';
  if (m.altitude >= 1250) return ['macizo', 'cresta', 'pico'][h % 3];
  return h % 2 ? 'loma' : 'cresta';
}

export class Panorama {
  /**
   * @param {Array} montes [{ id, name, altitude, km, bearing }]
   * @param {object} o { quality, sun: THREE.Vector3 (dirección), zenith, horizon (THREE.Color), seed, night }
   */
  constructor(montes, o = {}) {
    this.o = o; this.montes = montes;
    const S = this.scene = new THREE.Scene(), low = o.quality === 'low';
    this.camera = new THREE.PerspectiveCamera(10, innerWidth / innerHeight, 1, 14000);
    this.eye = new THREE.Vector3(0, 70, 0);
    this.owned = [];
    // colores del cielo (si llegan casi blancos o vacíos, los de un día claro)
    const ok = (c) => c && (c.r + c.g + c.b) < 2.7;
    const hor = (ok(o.horizon) ? o.horizon : C('#cfe2f2')).clone(), zen = (ok(o.zenith) ? o.zenith : C('#6fa6dc')).clone();
    // cielo: degradado del horizonte al cénit
    const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uHor: { value: hor }, uZen: { value: zen } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uHor, uZen; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y, 0.0, 1.0); gl_FragColor = vec4(mix(uHor, uZen, pow(h, 0.55)), 1.0);\n#include <colorspace_fragment>\n}' });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(12000, 32, 16), skyMat); S.add(sky); this.owned.push(sky.geometry, skyMat);
    S.fog = new THREE.Fog(hor.clone().lerp(C('#ffffff'), 0.15), 350, 10000);   // perspectiva aérea: lo lejano azulea y se aclara
    S.add(new THREE.HemisphereLight(zen.clone().lerp(C('#ffffff'), 0.5), C('#6a7a50'), 1.5));
    const sun = new THREE.DirectionalLight('#fff1dc', 2.2); sun.position.copy((o.sun || new THREE.Vector3(0.4, 0.7, -0.3)).clone().normalize().multiplyScalar(1000)); S.add(sun);
    this.detail = detailTexture(); this.owned.push(this.detail);
    // los montes de verdad
    // relieve general del terreno (antes de los montes, que se asientan sobre él)
    this.gnz = makeNoise(7);
    this.rough = Math.min(1, Math.max(0.25, (montes.reduce((a, m) => a + m.altitude, 0) / Math.max(1, montes.length) - 600) / 1100));
    this.Hm = montes.reduce((a, m) => Math.max(a, this.place(m).H), 80);
    this.peaks = montes.map((m, i) => this.buildPeak(m, i, low ? 96 : 140));
    // el terreno de delante: colinas, bosques y campos, más bajo cerca del mirador (que está en alto)
    this.buildGround(low ? 110 : 150);
  }
  // distancia en la escena (comprimida) y altura aparente: la real, suavizada en los muy cercanos (si no, uno solo
  // llenaría el visor) y un poco realzada en los lejanos para que se lean
  place(m) {
    const ds = Math.min(5200, 900 + m.km * 60), rel = Math.max(260, m.altitude - 480);
    const real = Math.atan(rel / (m.km * 1000)), d3 = 3 * Math.PI / 180;
    const ang = Math.max(2.3 * Math.PI / 180, real < d3 ? real * 1.35 : d3 * 1.35 + (real - d3) * 0.45);   // los muy lejanos, legibles
    const b = m.bearing * Math.PI / 180;
    return { ds, H: ds * Math.tan(ang), x: Math.sin(b) * ds, z: -Math.cos(b) * ds, b };
  }
  // altura a la que se asienta un monte: la media del terreno alrededor de su centro (un poco hundido, para que las
  // colinas de delante tapen el arranque como pasa de verdad)
  seat(pl) {
    let s = 0, n = 0;
    for (let k = 0; k < 9; k++) { const a = k / 8 * Math.PI * 2, r = k ? pl.H * 1.1 : 0, x = pl.x + Math.cos(a) * r, z = pl.z + Math.sin(a) * r; s += this.terrain(x, z, Math.hypot(x, z)); n++; }
    return Math.max(-20, s / n * 0.85);
  }
  // altura (0…1 dentro, negativa fuera de la falda, continua) de cada forma en coordenadas locales u (de lado) y v (de
  // frente): una máscara con la silueta general por un relieve de crestas con el dominio deformado (aristas,
  // antecimas y barrancos)
  shape(type, u, v, nz, sd) {
    const wu = u + 0.22 * (nz.fbm(u * 1.3 + sd, v * 1.3, 3) - 0.5), wv = v + 0.22 * (nz.fbm(u * 1.3, v * 1.3 + sd, 3) - 0.5);
    const D = nz.ridged(wu * 1.9 + sd, wv * 1.9 + 7, 5);   // 0…~0,9: aristas y barrancos
    // la base no es una elipse: lóbulos y entrantes según la dirección
    const th = Math.atan2(wv, wu), lobe = 1 + 0.32 * (nz.fbm(Math.cos(th) * 1.6 + sd, Math.sin(th) * 1.6 + 3, 3) - 0.5);
    // contrafuertes: costillas que bajan de la cima con barrancos entre ellas (más marcados a media ladera)
    const spur = (r) => 1 + 0.28 * (nz.ridged(Math.cos(th) * 2.2 + sd * 0.7, Math.sin(th) * 2.2 + r * 1.4, 3) - 0.45) * Math.sin(Math.PI * Math.min(1, r));
    if (type === 'sierra') {
      // cordillera lejana: una línea larga de cumbres dentadas y la principal destacando en medio
      const L = 0.7, ex = Math.max(0, Math.abs(wu) - L) / (1.05 - L), d = Math.hypot(ex, Math.abs(wv) * 1.6) / lobe;
      if (d >= 1) return -(d - 1) * 0.8;
      const prof = Math.max(Math.exp(-Math.abs(wu) * 4.5) * (0.92 + 0.08 * Math.cos(wu * 40)), (0.3 + 0.4 * nz.ridged(wu * 3.4 + sd, 1.7, 4)) * smooth(1.05, 0.5, Math.abs(wu)));
      return Math.pow(1 - d, 1.35) * prof * (0.62 + 0.55 * nz.ridged(wu * 5 + sd, wv * 5 + 2, 4));
    }
    if (type === 'cresta') {
      // cresta: cápsula alargada que se afila en los extremos; perfil con varias cimas
      const L = 0.5, ex = Math.max(0, Math.abs(wu) - L) / (1.05 - L), half = 0.82 - 0.18 * Math.abs(wu);
      const d = Math.hypot(ex, Math.abs(wv) * 1.25 / half) / lobe;
      if (d >= 1) return -(d - 1) * 0.8;
      const prof = 0.62 + 0.38 * Math.max(Math.exp(-((wu - 0.05) ** 2) * 8), 0.82 * Math.exp(-((wu + 0.5) ** 2) * 12), 0.88 * Math.exp(-((wu - 0.55) ** 2) * 11));
      return Math.pow(1 - d, 1.55) * prof * (0.62 + 0.62 * D) * spur(d);
    }
    const r = Math.hypot(wu - (type === 'pico' ? 0.08 : 0), wv * 1.12) / lobe;
    if (r >= 1) return -(r - 1) * 0.9;
    if (type === 'pico') {
      // pirámide de laderas cóncavas (empinada arriba, tendida abajo) con aristas, y la punta
      return Math.pow(1 - r, 1.38) * (0.62 + 0.62 * D) * spur(r) + Math.exp(-r * r * 16) * 0.05;
    }
    if (type === 'macizo') {
      // sierra caliza: falda tendida, una banda de cortados y arriba una meseta ondulada con la cima a un lado
      // los cortados no son un anillo regular: cambian de altura y de sitio alrededor, y en algunos lados no hay
      const ca = nz.fbm(Math.cos(th) * 2.4 + sd + 5, Math.sin(th) * 2.4, 3), c0 = 0.62 + (ca - 0.5) * 0.3;
      const apron = 0.46 * Math.pow(1 - r, 1.3), cliff = (0.25 + 0.5 * smooth(0.3, 0.6, ca)) * smooth(c0 + 0.13, c0 - 0.06, r), top = Math.exp(-((wu - 0.22) ** 2 + wv * wv) * 10) * 0.18;
      return (apron + cliff * (0.85 + 0.25 * nz.fbm(wu * 3 + sd, wv * 3, 4)) + 0.22 * D * smooth(0.2, 0.8, r) + top * smooth(1, 0.4, r)) * spur(r);
    }
    // loma: monte redondeado de laderas largas con barrancos y lomos, y alguna cima secundaria
    // (cima redonda, laderas altas convexas y pie cóncavo; la cumbre un poco a un lado y una antecima)
    const rl = Math.hypot(wu - 0.12, wv * 1.12) / lobe, sub = Math.exp(-((wu + 0.42) ** 2 + (wv - 0.15) ** 2) * 10) * 0.3;
    if (rl >= 1) return -(rl - 1) * 0.9;
    return (Math.pow(1 - Math.pow(rl, 1.5), 2) * (0.8 + 0.2 * nz.fbm(wu * 4 + sd, wv * 4, 4) + 0.28 * D * smooth(0.1, 0.6, rl)) + sub * (1 - rl)) * (1 + (spur(rl) - 1) * 1.3);
  }
  buildPeak(m, i, N) {
    const type = typeOf(m), sd = (hash(m.id || m.name) % 997) / 31, nz = makeNoise(31 + hash(m.id || m.name) % 1000), fine = makeNoise(77);
    const pl = this.place(m), base = this.seat(pl), H = pl.H, spread = { pico: 3.0, macizo: 4.6, cresta: 4.4, loma: 5.2, sierra: 9 }[type], W = H * spread, D = W * 0.7;
    const geo = new THREE.PlaneGeometry(W * 1.6, D * 1.6, N, Math.round(N * 0.8)); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, cnt = pos.count, col = new Float32Array(cnt * 3), hs = new Float32Array(cnt);
    const alt = m.altitude, tree = { pico: 0.34, cresta: 0.38, macizo: 0.42, loma: 0.62, sierra: 0.3 }[type] * Math.min(1.3, 1500 / Math.max(900, alt)) + 0.05;
    const snowLine = type === 'sierra' ? (alt >= 2200 ? 0.84 : 9) : alt >= 1950 ? 0.7 : alt >= 1700 ? 0.86 : 9;
    let hmax = 1e-6;
    for (let k = 0; k < cnt; k++) {
      const u = pos.getX(k) / (W / 2), v = pos.getZ(k) / (D / 2);
      let h = this.shape(type, u, v, nz, sd);
      if (h > 0) h += (fine.fbm(u * 9 + i * 7, v * 9, 4) - 0.5) * 0.03 * Math.min(1, h * 6);   // grano fino del relieve
      hs[k] = h; hmax = Math.max(hmax, h);
    }
    for (let k = 0; k < cnt; k++) { if (hs[k] > 0) hs[k] /= hmax; pos.setY(k, hs[k] * H - 12); }
    geo.computeVertexNormals();
    const nor = geo.attributes.normal, c = new THREE.Color(), haze = new THREE.Color().copy(this.scene.fog.color), hk = Math.min(0.22, 0.04 + m.km / 300), far = smooth(14, 70, m.km) * 0.45;
    for (let k = 0; k < cnt; k++) {
      const f = hs[k], slope = 1 - nor.getY(k), u = pos.getX(k) / (W / 2), v = pos.getZ(k) / (D / 2), j = nz.fbm(u * 6 + 2, v * 6, 3), q = fine.n(u * 30, v * 30);
      const rock = type === 'macizo' ? PAL.rockLime : j > 0.5 ? PAL.rockGrey : PAL.rockDark;
      // bosque abajo con claros, pastos arriba (más secos cuanto más alto), roca en lo empinado, nieve en lo alto
      const edge = tree + (j - 0.5) * 0.16;
      const glade = smooth(0.58, 0.66, nz.fbm(u * 4 + 9, v * 4 + 3, 3)) * smooth(0.15, 0.3, f);   // claros y prados entre el bosque
      if (f < edge) c.copy(PAL.forest).lerp(PAL.forest2, q * 0.7 + j * 0.3).lerp(PAL.meadow, Math.max(smooth(edge - 0.06, edge, f) * 0.6, glade * 0.75));
      else c.copy(PAL.meadow).lerp(PAL.meadowDry, Math.min(1, (f - edge) * 1.6));
      const steep = smooth(0.42, 0.66, slope + (type === 'pico' ? Math.max(0, f - 0.55) * 0.5 : 0) + (j - 0.5) * 0.12);
      c.lerp(rock, steep * (type === 'loma' ? 0.4 : 1));
      if (f > snowLine + (0.5 - j) * 0.14 && slope < 0.7) c.lerp(PAL.snow, smooth(snowLine, snowLine + 0.08, f) * (slope < 0.4 ? 1 : 0.65));
      c.multiplyScalar(0.92 + q * 0.16);
      c.lerp(PAL.far, far * 0.42 * (1 - Math.min(1, Math.max(0, f - snowLine + 0.1)) * 0.6));   // la lejanía azulea (menos la nieve)
      c.lerp(haze, hk * (1 - Math.min(1, Math.max(0, f)) * 0.4));   // bruma de la distancia, más en la base
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * W * 1.6 / 28, uv.getY(k) * D * 1.6 / 28);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: this.detail, roughness: 1, metalness: 0 }); rockShader(mat);
    const mesh = new THREE.Mesh(geo, mat); mesh.position.set(pl.x, base, pl.z); mesh.rotation.y = Math.atan2(pl.x, pl.z) + Math.PI;   // de cara al mirador
    this.scene.add(mesh); this.owned.push(geo, mat);
    let top = 0; for (let k = 1; k < cnt; k++) if (hs[k] > hs[top]) top = k;
    const sp = new THREE.Vector3(pos.getX(top), pos.getY(top), pos.getZ(top)).applyMatrix4(new THREE.Matrix4().compose(mesh.position, mesh.quaternion, new THREE.Vector3(1, 1, 1)));
    return { m, mesh, summit: sp, H, ds: pl.ds, type, b: pl.b, base, aw: Math.atan(W * 0.5 / pl.ds) };
  }
  // altura del terreno sin los montes: colinas suaves cerca (el mirador está en alto), más relieve lejos y sierras en el
  // horizonte
  terrain(x, z, R) {
    const nz = this.gnz, rough = this.rough;
    let h = (nz.fbm(x / 700, z / 700, 5) - 0.45) * 120 * smooth(120, 1600, R) - 20;
    h += nz.ridged(x / 2200 + 4, z / 2200, 5) * this.Hm * 0.55 * rough * smooth(1800, 6000, R);
    h += nz.ridged(x / 3400 + 11, z / 3400 + 5, 5) * R * 0.05 * (0.45 + 0.55 * rough) * smooth(3500, 8500, R);
    return h;
  }
  // terreno: en anillos alrededor del mirador (fino cerca, grueso lejos); campos y setos cerca, colinas y bosques a
  // media distancia, estribaciones que suben hacia cada monte y una línea de sierras al fondo
  buildGround(N) {
    const RINGS = N, SEG = Math.round(N * 1.8), R0 = 25, R1 = 11000, k = Math.pow(R1 / R0, 1 / (RINGS - 1));
    const pos = new Float32Array(RINGS * SEG * 3), col = new Float32Array(RINGS * SEG * 3), fl = new Float32Array(RINGS * SEG), idx = [];
    const nz = this.gnz, c = new THREE.Color(), peaks = this.peaks, rough = this.rough;
    for (let i = 0; i < RINGS; i++) {
      const R = R0 * Math.pow(k, i);
      for (let j = 0; j < SEG; j++) {
        const a = j / SEG * Math.PI * 2, x = Math.sin(a) * R, z = -Math.cos(a) * R;
        // colinas suaves cerca (el mirador está en alto), más relieve lejos y sierras en el horizonte
        let h = this.terrain(x, z, R);
        // estribaciones: el terreno sube hacia cada monte
        let near = 0;
        for (const p of peaks) { const dx = x - p.mesh.position.x, dz = z - p.mesh.position.z, w = p.H * 3.2, d = Math.hypot(dx, dz) / w; if (d < 1.4) { const f = (1 - d / 1.4) ** 2; h = Math.max(h, p.base + f * p.H * (0.1 + 0.34 * nz.ridged(x / 260 + 3, z / 260, 4)) - 10); near = Math.max(near, f); } }
        h = Math.min(h, 45 + R * 0.04);
        // nada tapa los montes: delante de cada uno el terreno abre un valle (queda por debajo de la línea que va del
        // mirador a su base) y detrás las sierras no asoman por encima de su cumbre
        for (const p of peaks) {
          let da = Math.abs(a - p.b) % (Math.PI * 2); if (da > Math.PI) da = Math.PI * 2 - da;
          const wgt = smooth(p.aw * 2.4, p.aw * 1.0, da); if (wgt <= 0) continue;
          const t = R / p.ds, ey = this.eye.y;
          // por encima del límite no se corta en seco: se aplasta (conserva el relieve, más bajo)
          const cap = t < 0.9 ? ey + t * (p.base + p.H * 0.14 - ey) - 4 : t > 1.4 ? ey + t * (p.base + p.H * 0.62 - ey) : Infinity;
          if (h > cap) h = h + (cap + (h - cap) * 0.22 - h) * wgt;
        }
        const v = (i * SEG + j) * 3; pos[v] = x; pos[v + 1] = h; pos[v + 2] = z;
        // colores: campos (verdes y de cereal) con setos cerca, bosques y prados más lejos, más bosque junto a los montes
        const fld = nz.n(x / 90 + 3, z / 90), hedge = Math.abs(Math.sin(x / 47 + nz.n(x / 200, z / 200) * 3)) < 0.06 || Math.abs(Math.sin(z / 53)) < 0.05;
        const j2 = nz.fbm(x / 420 + 9, z / 420, 4) + near * 0.25;
        c.copy(PAL.field2).lerp(PAL.meadow, smooth(0.35, 0.5, fld)).lerp(PAL.field, smooth(0.6, 0.72, fld));
        if (R < 2500 && hedge) c.lerp(PAL.forest2, 0.6);
        c.lerp(PAL.forest2, smooth(0.52, 0.62, j2)).lerp(PAL.forest, smooth(0.62, 0.75, j2) * nz.n(x / 60, z / 60));
        c.multiplyScalar(0.94 + nz.n(x / 25, z / 25) * 0.14);
        col[v] = c.r; col[v + 1] = c.g; col[v + 2] = c.b;
        // dónde hay parcelas (campos y prados con lindes): en lo llano, fuera del bosque y lejos de los montes
        fl[i * SEG + j] = (1 - smooth(0.5, 0.6, j2)) * (1 - Math.min(1, near * 1.6));
      }
    }
    for (let i = 0; i < RINGS - 1; i++) for (let j = 0; j < SEG; j++) { const a = i * SEG + j, b = i * SEG + (j + 1) % SEG, c2 = (i + 1) * SEG + j, d = (i + 1) * SEG + (j + 1) % SEG; idx.push(a, b, c2, b, d, c2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
    const uv = new Float32Array(RINGS * SEG * 2); for (let q = 0; q < RINGS * SEG; q++) { uv[q * 2] = pos[q * 3] / 40; uv[q * 2 + 1] = pos[q * 3 + 2] / 40; }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.computeVertexNormals();
    geo.setAttribute('aFld', new THREE.BufferAttribute(fl, 1));
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: this.detail, roughness: 1 });
    groundShader(mat, rough);
    const m = new THREE.Mesh(geo, mat); this.scene.add(m); this.owned.push(geo, mat);
  }
  /** Mira con el ángulo de los prismáticos (yaw como en el juego: dirección (sin yaw, cos yaw)). */
  look(yaw, pitch, fov) {
    const c = this.camera, e = this.eye;
    c.fov = fov; c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix();
    c.position.copy(e); c.lookAt(e.x + Math.sin(yaw) * Math.cos(pitch), e.y + Math.sin(pitch), e.z + Math.cos(yaw) * Math.cos(pitch));
  }
  dispose() { for (const o of this.owned) o.dispose(); }
}
