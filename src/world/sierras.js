// El relieve de alrededor de cada pueblo, de verdad, hasta 48 km (src/data/sierras, tools/relieve/sierras.mjs): una malla
// polar de alturas reales (40 anillos de 1,4 a 48 km, cada grado) que empieza en el borde del relieve del pueblo (1,5 km)
// y sigue hacia fuera. Lo de más lejos se acerca (a 48 km, unos 5,5 km en el juego) y baja en la misma proporción, así que
// desde la plaza cada sierra se ve en su sitio y con su ángulo de verdad: Urbasa encima de Altsasu, el Moncayo desde
// Tudela, Ezkaba sobre Pamplona, Larra y la Mesa de los Tres Reyes desde Isaba. Más allá de 48 km, la silueta de las
// sierras lejanas. Con la luz del sol y del cielo del momento (las laderas a la sombra, más oscuras), su color según la
// altitud, la pendiente y la comarca (bosque, pasto, campos, caliza, el yeso de las Bardenas y, por encima de 2150 m,
// nieve) y, encima, el aire de en medio: lo lejano, más claro y más azul.
import * as THREE from 'three';
import { fbm, ridged } from '../util/noise.js';
import { alturaLejos } from './terrain.js';

const DATA = import.meta.glob('../data/sierras/*.js', { import: 'default' });
const listas = new Map();

/** Abre los datos de un pueblo (una vez); promesa que no falla nunca: { h0, r (km), H[j][360] (m), fa[360] (°), fh[360] (m) } o null */
export function cargarSierras(id) {
  if (listas.has(id)) return Promise.resolve(listas.get(id));
  const f = DATA[`../data/sierras/${id}.js`]; if (!f) return Promise.resolve(null);
  return (async () => {
    try {
      if (typeof DecompressionStream === 'undefined') return null;
      const o = await f(), bin = Uint8Array.from(atob(o.d), c => c.charCodeAt(0));
      const st = new Blob([bin]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      const b = new Uint8Array(await new Response(st).arrayBuffer());
      let p = 0; const next = () => { let v = 0, s = 0, c; do { c = b[p++]; v += (c & 127) * 2 ** s; s += 7; } while (c & 128); return v % 2 ? -(v + 1) / 2 : v / 2; };
      const J = o.r.length, H = [];
      for (let j = 0; j < J; j++) { const a = new Float32Array(360); let v = 0; for (let i = 0; i < 360; i++) { v += next(); a[i] = (j ? H[j - 1][i] / o.u : 0) + v; } for (let i = 0; i < 360; i++) a[i] *= o.u; H.push(a); }
      const fila = (u) => { const a = new Float32Array(360); let v = 0; for (let i = 0; i < 360; i++) { v += next(); a[i] = v * u; } return a; };
      const S = { h0: o.h0, r: o.r, H, fa: fila(0.05), fh: fila(10) };
      listas.set(id, S); return S;
    } catch (e) { console.warn('sierras', e); listas.set(id, null); return null; }
  })();
}
/** Los datos ya abiertos de un pueblo (o null) */
export const sierrasDe = (id) => listas.get(id) || null;

const C = (h) => new THREE.Color(h);
const CURV = (1 - 0.13) / (2 * 6371000);   // (la curvatura de la Tierra con la refracción del aire, por metro²)
// el color del suelo según la comarca y la altitud: [hasta qué cota (m), monte, bosque]
const PAL = {
  // Bidasoa, Baztan, Larraun y Sakana: prados y helechales, hayedos y robledales; arriba, la caliza de Aralar y Urbasa
  atlantic: [[650, '#6aa043', '#2f5e28'], [1050, '#86a24a', '#2d5426'], [1350, '#a2a675', '#3a5a2c'], [9e9, '#b9b6a8', '#4a5e36']],
  // Pirineo: prados de fondo de valle, hayedos y abetales, pinar, pastos de altura y la caliza clara de Larra
  pyrenean: [[1100, '#76a147', '#28502a'], [1650, '#8fa552', '#2c4c2a'], [2100, '#bdb7a8', '#53603e'], [9e9, '#c9c4b8', '#6a6a5c']],
  // Navarra media: campos de cereal y viñas en el llano, carrascal y pinar en los cerros, la caliza de Urbasa, Andía y Leire
  central: [[600, '#b4a466', '#5d6a38'], [900, '#98975a', '#4c5e32'], [1200, '#8e9a5c', '#3f5a2e'], [9e9, '#b8b2a0', '#56603e']],
  // Ribera: regadío y cereal en la vega, el yeso y las arcillas de las Bardenas; el Moncayo con su bosque y su pedregal
  ribera: [[420, '#b9a86c', '#6f7a44'], [700, '#ccb07c', '#8e8a58'], [1600, '#8e9358', '#3f5634'], [9e9, '#aea89c', '#6c6a5e']],
};
PAL.city = PAL.central;
const NIEVE = C('#f3f6fa'), ROCA = C('#a7a296'), ROCA2 = C('#8c877c'), CAMPOS = ['#c9b56a', '#a9b25a', '#d4be7c', '#8fa64c', '#b89a62'].map(C);
function suelo(fam, h, out) {
  const P = PAL[fam] || PAL.central;
  let i = 0; while (i < P.length - 1 && h > P[i][0]) i++;
  const a = P[i], n = P[i + 1], k = n ? Math.max(0, Math.min(1, (h - (a[0] - 120)) / 120)) : 0;
  out[0].set(a[1]); out[1].set(a[2]);
  if (k > 0) { out[0].lerp(C(n[1]), k); out[1].lerp(C(n[2]), k); }
}

const G = 1000, BORDE = 1500, LEJOS = 6200;
export class Sierras {
  /** S: cargarSierras(); fam: la familia del pueblo; ojo: altura de los ojos en la plaza, en el juego (m) */
  constructor(scene, S, fam, ojo, quality = 'high') {
    const J = S.r.length, PASO = quality === 'low' ? 2 : 1, n = 360 / PASO, H = S.H;
    const pos = [], nor = [], col = [], dis = [], idx = [];
    const tmp = [new THREE.Color(), new THREE.Color()], c = new THREE.Color();
    const at = (j, b) => H[Math.max(0, Math.min(J - 1, j))][((b % 360) + 360) % 360];
    for (let ci = 0; ci < n; ci++) {
      const b = ci * PASO, br = b * Math.PI / 180, sb = Math.sin(br), cb = Math.cos(br);
      const r0 = BORDE / Math.max(Math.abs(sb), Math.abs(cb));   // (el borde del relieve del pueblo en este rumbo)
      // (primer vértice: un poco por dentro del borde y por debajo, para coser con el anillo de lejos sin rendijas)
      const e = r0 - 20;
      pos.push(sb * e, alturaLejos(sb * e, -cb * e) - 2, -cb * e); nor.push(0, 1, 0); dis.push(e / 1000);
      suelo(fam, S.h0 + 0, tmp); col.push(tmp[0].r, tmp[0].g, tmp[0].b);
      for (let j = 0; j < J; j++) {
        const r = S.r[j] * 1000, h = H[j][b];
        let g, y;
        if (r <= r0 + 40) { g = e; y = alturaLejos(sb * e, -cb * e) - 2; }
        else { g = r0 + G * Math.log(1 + (r - r0) / G); y = ojo + (h - S.h0 - r * r * CURV) * g / r; }
        pos.push(sb * g, y, -cb * g); dis.push(r / 1000);
        // la pendiente de verdad: hacia fuera y de lado (este, norte), y la normal en los ejes del juego (norte = -z)
        const dr = (S.r[Math.min(J - 1, j + 1)] - S.r[Math.max(0, j - 1)]) * 1000;
        const gr = (at(j + 1, b) - at(j - 1, b)) / dr, gs = (at(j, b + 1) - at(j, b - 1)) / (2 * r * Math.PI / 180);
        const ge = gr * sb + gs * cb, gn = gr * cb - gs * sb, L = Math.hypot(ge, 1, gn);
        nor.push(-ge / L, 1 / L, gn / L);
        const pend = Math.hypot(ge, gn);
        // el color: el de la comarca a esa altitud; a manchas, el bosque; en el llano, los campos; en lo empinado, la roca
        suelo(fam, h, tmp);
        const ruido = fbm(b / 6.5 + j * 0.37, j * 0.61, 3) * 0.5 + 0.5;
        const bosque = Math.min(1, Math.max(0, (ruido - (fam === 'atlantic' || fam === 'pyrenean' ? 0.36 : 0.55)) * 4)) * (1 - Math.min(1, Math.max(0, (pend - 0.9) * 2)));
        c.copy(tmp[0]).lerp(tmp[1], bosque * (h > 1900 ? 0.2 : 0.85));
        if ((fam === 'central' || fam === 'ribera' || fam === 'city') && pend < 0.1 && h < 750 && r < 14000) {   // (los campos, solo cerca: lejos, a franjas claras, parecían un mar)
          const k = Math.abs(Math.floor(b / 1.7) * 7 + Math.floor(Math.log(r) * 9) * 13) % CAMPOS.length;
          c.lerp(CAMPOS[k], 0.55 * (1 - pend * 8));
        }
        c.lerp(ruido > 0.5 ? ROCA : ROCA2, Math.min(1, Math.max(0, (pend - 0.75) * 2.2)) * (fam === 'atlantic' && h < 900 ? 0.4 : 0.9));
        if (h > 2150 + (ruido - 0.5) * 120 && pend < 1.1) c.lerp(NIEVE, Math.min(1, (h - 2150) / 90));
        col.push(c.r, c.g, c.b);
      }
    }
    const V = J + 1;
    for (let ci = 0; ci < n; ci++) {
      const a = ci * V, b = ((ci + 1) % n) * V;
      for (let j = 0; j < V - 1; j++) idx.push(a + j, b + j, a + j + 1, b + j, b + j + 1, a + j + 1);   // (de cara hacia arriba y hacia el pueblo)
    }
    // más allá de 48 km: la silueta de las sierras lejanas (la Demanda desde Viana, el Pirineo francés desde Isaba)
    const v0 = pos.length / 3, m = 360 / PASO;
    for (let ci = 0; ci < m; ci++) {
      const b = ci * PASO, br = b * Math.PI / 180, sb = Math.sin(br), cb = Math.cos(br);
      const t = S.fa[b] + (ridged(b / 2.3, 4.1, 3) - 0.45) * 0.12, A = S.fh[b];
      suelo(fam, A, tmp); c.copy(tmp[0]).lerp(tmp[1], 0.5); if (A > 2150) c.lerp(NIEVE, 0.7);
      for (const tt of [t, -3]) { pos.push(sb * LEJOS, ojo + Math.tan(tt * Math.PI / 180) * LEJOS, -cb * LEJOS); nor.push(-sb * 0.3, 0.95, cb * 0.3); col.push(c.r, c.g, c.b); dis.push(85); }
    }
    for (let ci = 0; ci < m; ci++) { const a = v0 + ci * 2, b = v0 + ((ci + 1) % m) * 2; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aR', new THREE.Float32BufferAttribute(dis, 1));
    g.setIndex(idx);
    g.computeBoundingSphere();
    this.uniforms = {
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uSky: { value: new THREE.Color() }, uGnd: { value: new THREE.Color() },
      uHaze: { value: new THREE.Color('#cfe8fb') }, uFog0: { value: 0.4 }, uVis: { value: 55 },
    };
    // (luz como la del terreno: el sol en las laderas que le dan la cara y el cielo desde arriba; con el mismo tono y, al
    // final, el aire: en el borde del pueblo, tanto como la niebla de ahí; más lejos, más)
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexColors: true, fog: false,
      vertexShader: 'attribute float aR; varying vec3 vCol; varying vec3 vN; varying float vR; void main(){ vCol = color; vN = normal; vR = aR; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 uSunDir, uSunCol, uSky, uGnd, uHaze; uniform float uFog0, uVis; varying vec3 vCol; varying vec3 vN; varying float vR;
void main(){
  vec3 n = normalize(vN);
  vec3 luz = uSunCol * max(dot(n, uSunDir), 0.0) + mix(uGnd, uSky, n.y * 0.5 + 0.5);
  gl_FragColor = vec4(vCol * luz * 0.31831, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  float aire = uFog0 + (1.0 - uFog0) * (1.0 - exp(-max(vR - 1.5, 0.0) / uVis));
  // (el aire de lejos, algo más oscuro y azul que el cielo del horizonte: las sierras lejanas se recortan contra él)
  vec3 bruma = mix(uHaze, uHaze * vec3(0.78, 0.84, 0.92), smoothstep(1.5, 9.0, vR));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, bruma, clamp(aire, 0.0, 0.7));   // (nunca del todo: la llanura del fondo no se vuelve un mar blanco)
}`,
    });
    this.mesh = new THREE.Mesh(g, mat); this.mesh.name = 'sierras'; this.mesh.frustumCulled = false; this.mesh.matrixAutoUpdate = false;
    scene.add(this.mesh);
  }
  /** cada imagen: la luz del sol (o de la luna) y del cielo, la bruma del color de la niebla y cuánta hay en el borde */
  update(sky) {
    if (!sky?.sun) return;
    const U = this.uniforms, s = sky.sun;
    U.uSunDir.value.copy(s.position).sub(s.target.position).normalize();
    U.uSunCol.value.copy(s.color).multiplyScalar(s.intensity);
    U.uSky.value.copy(sky.hemi.color).multiplyScalar(sky.hemi.intensity); U.uGnd.value.copy(sky.hemi.groundColor).multiplyScalar(sky.hemi.intensity);
    const f = sky.fog; U.uHaze.value.copy(f.color);
    U.uFog0.value = Math.max(0, Math.min(1, (1700 - f.near) / Math.max(1, f.far - f.near)));
  }
}
