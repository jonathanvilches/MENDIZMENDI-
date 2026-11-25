// Las nubes de los pueblos: cúmulos sueltos que pasan despacio con el viento por encima del pueblo y de los montes de
// alrededor. Lo pidió el autor el 25 de noviembre de 2026: «añadir nubes en los pueblos, darle más vida». El cielo ya
// tenía sus nubes pintadas en la cúpula (sky.js), planas y lejos; estas tienen volumen y se ven pasar.
// Cada nube (de 110 a 520 m de ancho, a 240-380 m sobre el jugador) es un montón de copos (de 4 a 10) repartidos en una cúpula, grandes abajo y en medio, pequeños arriba y en los
// bordes, como las del mapa del inicio (hub/mapa3dNubes.js, de donde sale la forma del copo): cada copo es una bruma
// blanda deshilachada por un ruido que se repite, más clara arriba y hacia el sol, y gris azulada en la base.
// La luz es la del cielo del pueblo: blancas a mediodía, doradas y malvas al atardecer, gris oscuro con tormenta y, de
// noche, apenas un gris azulado con el borde que da a la luna. Lejos se funden con la bruma del horizonte.
// Corren con el viento del pueblo (viento.js), más deprisa con las rachas. Todas en una sola llamada de dibujo; no escriben profundidad pero la leen (los montes y las casas pasan por delante).
//   const n = new NubesPueblo(scene, quality) · n.update(elapsed, focus, camPos, luz) · n.dispose()
import * as THREE from 'three';
import { VIENTO } from './viento.js';

const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const CAMPO = 2600;            // (el lado del cuadrado por el que pasan, centrado en el jugador)
const CORREN = 6;              // (lo que corren con brisa normal, en metros por segundo; más con las rachas)

// (el ruido de los copos: dos capas de ruido de valores en cuatro octavas, que se repite sin costura)
function ruidoTex() {
  let s = 77; const R = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const n = 128, d = new Uint8Array(n * n * 4);
  for (let canal = 0; canal < 2; canal++) {
    const capas = [4, 8, 16, 32].map(p => { const g = new Float32Array(p * p); for (let i = 0; i < g.length; i++) g[i] = R(); return { p, g }; });
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let v = 0, amp = 0.5;
      for (const { p, g } of capas) { const fx = x / n * p, fy = y / n * p, x0 = Math.floor(fx), y0 = Math.floor(fy); let tx = fx - x0, ty = fy - y0; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        const a = g[(y0 % p) * p + x0 % p], b = g[(y0 % p) * p + (x0 + 1) % p], c = g[((y0 + 1) % p) * p + x0 % p], e = g[((y0 + 1) % p) * p + (x0 + 1) % p];
        v += amp * ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + e * tx) * ty); amp *= 0.5; }
      d[(y * n + x) * 4 + canal] = Math.round(Math.min(1, v / 0.9375) * 255);
    }
    for (let i = 0; i < n * n; i++) d[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}

const VS = `attribute vec3 aPos; attribute vec4 aDat; uniform float uFogNear, uFogFar; varying vec2 vP; varying float vOp, vAlt, vSem, vNiebla;
void main() {
  vec4 mv = viewMatrix * vec4(aPos, 1.0); mv.xy += position.xy * aDat.x * vec2(1.9, 1.35);   // (algo tendidas, como las de verdad)
  gl_Position = projectionMatrix * mv;
  vP = position.xy * 2.0; vOp = aDat.y; vAlt = aDat.z; vSem = aDat.w; vNiebla = smoothstep(uFogNear, uFogFar, -mv.z);
}`;
const FS = `uniform sampler2D uRuido; uniform vec3 uSolV, uFog, uLuz, uSombra; varying vec2 vP; varying float vOp, vAlt, vSem, vNiebla;
void main() {
  vec2 n2 = texture2D(uRuido, vP * 0.33 + vSem * vec2(7.31, 3.17)).rg, n3 = texture2D(uRuido, vP * 0.86 + vSem * vec2(1.7, 9.2)).rg;
  float r = length(vP) + (n2.r - 0.5) * 0.62 + (n3.g - 0.5) * 0.32;
  float a = 1.0 - smoothstep(0.12, 1.0, r); a = a * (2.0 - a) * (1.0 - smoothstep(0.72, 0.98, length(vP)));   // (y siempre a cero antes del borde del cuadrado: si no, se veía su canto recto)
  a *= (0.6 + 0.4 * smoothstep(0.25, 0.75, n3.r)) * vOp; if (a < 0.01) discard;
  float arriba = smoothstep(-0.95, 0.55, vP.y + (n2.g - 0.5) * 0.6), sol = dot(normalize(vec3(vP * 0.55, 0.85)), uSolV) * 0.5 + 0.5;
  float l = (arriba * 0.65 + sol * 0.35) * mix(0.75, 1.0, vAlt);
  vec3 c = mix(uSombra, uLuz, smoothstep(0.1, 0.85, l)) * (0.95 + 0.07 * n3.r);
  a *= 1.0 - vNiebla * 0.85;
  gl_FragColor = linearToOutputTexel(vec4(mix(c, uFog, vNiebla), a));
}`;

export class NubesPueblo {
  constructor(scene, quality = 'high') {
    this.scene = scene;
    let s = 20261125; const R = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const low = quality === 'low', n = low ? 12 : quality === 'mid' ? 16 : 20, copos = low ? 7 : 10;
    // (de tamaños muy distintos: jirones pequeños, medianas y alguna grande; casi la mitad, copos sueltos en una mancha
    // ancha y baja; las demás, un cúmulo con su base plana y su cima redonda)
    const nube = (w, suelta, k) => { const l = w * (suelta ? 0.8 + R() * 0.6 : 0.62 + R() * 0.3), h = w * (suelta ? 0.1 + R() * 0.08 : 0.32 + R() * 0.16), C = [];
      for (let i = 0; i < k; i++) {
        if (suelta) { const a = R() * Math.PI * 2, rr = Math.sqrt(R()), sz = w * (0.26 + 0.2 * R());
          C.push({ dx: Math.cos(a) * rr * w * 0.8, dz: Math.sin(a) * rr * l * 0.8, dy: R() * h + sz * 0.16, s: sz, alt: 0.3 + 0.5 * R(), sem: R(), o: 0.55 + 0.4 * R() }); continue; }
        const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * (i < 3 ? 0.55 : 1), cima = 1 - rr * rr, ey = i < 3 ? R() * 0.2 : R() * cima;
        const sz = w * (0.3 + 0.18 * cima + 0.08 * R()) * (i < 3 ? 1.12 : 1 - 0.35 * ey);
        C.push({ dx: Math.cos(a) * rr * w * 0.5, dz: Math.sin(a) * rr * l * 0.5, dy: ey * h + sz * 0.16, s: sz, alt: Math.min(1, 0.18 + ey * 0.9 + 0.12 * cima), sem: R(), o: rr > 0.7 ? 0.62 + 0.3 * R() : 0.9 + 0.1 * R() });
      }
      return { w, l, C }; };
    this.N = [];
    for (let i = 0; i < n; i++) {
      const r = R(), w = r < 0.35 ? 110 + R() * 90 : r < 0.8 ? 200 + R() * 140 : 340 + R() * 180, suelta = R() < 0.3;
      const k = Math.max(4, Math.round(copos * (suelta ? 0.4 + 0.4 * Math.min(1, w / 400) : 0.45 + 0.55 * Math.min(1, (w - 110) / 380))));
      // (cada una con su umbral: con el cielo despejado salen solo las de umbral bajo; con más nubes, más)
      this.N.push({ ...nube(w, suelta, k), x: (R() - 0.5) * CAMPO, z: (R() - 0.5) * CAMPO, y: 240 + R() * 140, op: (suelta ? 0.62 : 0.85) + R() * 0.12, umbral: (i + R() * 0.8) / n });
    }
    const total = this.N.reduce((a, q) => a + q.C.length, 0);
    const g = this.geo = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
    this.aPos = new Float32Array(total * 3); this.aDat = new Float32Array(total * 4);
    g.setAttribute('aPos', new THREE.InstancedBufferAttribute(this.aPos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aDat', new THREE.InstancedBufferAttribute(this.aDat, 4).setUsage(THREE.DynamicDrawUsage));
    this.tex = ruidoTex();
    this.solMundo = new THREE.Vector3(0, 1, 0);
    const U = this.U = { uRuido: { value: this.tex }, uSolV: { value: new THREE.Vector3(0, 1, 0) }, uFog: { value: new THREE.Color('#cfe8fb') }, uFogNear: { value: 500 }, uFogFar: { value: 1400 },
      uLuz: { value: new THREE.Color('#ffffff') }, uSombra: { value: new THREE.Color('#c3cddb') } };
    this.mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: U, vertexShader: VS, fragmentShader: FS });
    const m = this.mesh = new THREE.Mesh(g, this.mat); m.name = 'nubes-pueblo'; m.frustumCulled = false; m.renderOrder = 4;
    // (la dirección del sol, en la vista de la cámara que dibuja: cada copo mira siempre a la cámara)
    m.onBeforeRender = (r, sc, cam) => { U.uSolV.value.copy(this.solMundo).transformDirection(cam.matrixWorldInverse); };
    scene.add(m);
    this.P = Array.from({ length: total }, () => ({ x: 0, y: 0, z: 0, s: 0, op: 0, alt: 0, sem: 0, d: 0 })); this.vis = [];
  }
  /** elapsed: el tiempo; focus: el jugador; cam: dónde está la cámara; luz: { sol (dirección), solCol, zen, hor, fog
   *  (color de la bruma), fogNear, fogFar, noche (0-1), tormenta (0-1), cubre (cuánto cielo cubren, 0-1), dentro (a
   *  cubierto: sin nubes) } */
  update(elapsed, focus, cam, luz) {
    const U = this.U, m = this.mesh;
    if (luz.dentro) { m.visible = false; return; }
    this.solMundo.copy(luz.sol);
    // la luz: blancas con el sol alto; con el sol bajo, del color del sol; de noche, gris azulado oscuro; con tormenta,
    // gris pizarra. La sombra de la base, del color del cielo de arriba, más oscura
    const noche = luz.noche, torm = luz.tormenta || 0, bajo = 1 - suave(0.05, 0.4, luz.sol.y);
    U.uLuz.value.setRGB(1, 1, 1).lerp(luz.solCol, 0.35 + 0.45 * bajo).lerp(_c1.set('#3d4a66'), noche * 0.9).lerp(_c2.set('#8a919c'), torm * 0.8);
    U.uSombra.value.copy(luz.zen).multiplyScalar(0.7).lerp(_c3.set('#e9eef5'), 0.6 * (1 - noche)).lerp(_c1.set('#1d2436'), noche * 0.92).lerp(_c2.set('#4a505a'), torm * 0.85);
    U.uFog.value.copy(luz.fog); U.uFogNear.value = luz.fogNear * 2.2; U.uFogFar.value = Math.max(luz.fogNear * 2.6, luz.fogFar * 0.9);
    const cubre = Math.min(1, (luz.cubre ?? 0.5) * 1.15 + torm * 0.6), opN = 1 - noche * 0.35;
    // (corren con el viento del pueblo, world/viento.js: en su dirección, la de los árboles y el humo, y más deprisa con
    // las rachas y el temporal; lo recorrido se va sumando, para que al cambiar la fuerza no den saltos)
    const dt = Math.min(0.1, Math.max(0, elapsed - (this.t0 ?? elapsed))); this.t0 = elapsed;
    const v = CORREN * (0.5 + 0.5 * VIENTO.fuerza) * dt, D = VIENTO.uDir.value; this.ox = (this.ox || 0) + D.x * v; this.oz = (this.oz || 0) + D.y * v;
    const env = (x, c) => ((x - c + CAMPO / 2) % CAMPO + CAMPO) % CAMPO - CAMPO / 2 + c, vis = this.vis, P = this.P;
    vis.length = 0; let k = 0;
    for (const q of this.N) {
      // (cuántas: según lo nublado que esté el cielo de la comarca; las que sobran se deshacen despacio, no de golpe)
      const quiere = suave(q.umbral - 0.12, q.umbral + 0.05, cubre);
      if (quiere < 0.02) continue;
      // (pasan con el viento y, al salir por un lado del cuadrado, entran por el otro, lejos y ya fundidas en la bruma)
      const x = env(q.x + this.ox, focus.x), z = env(q.z + this.oz, focus.z);
      let op = q.op * quiere * opN * suave(0.5, 0.36, Math.max(Math.abs(x - focus.x), Math.abs(z - focus.z)) / CAMPO);
      if (op < 0.02) continue;
      const y = (focus.y || 0) + q.y;
      for (const c of q.C) { const p = P[k++]; p.x = x + c.dx; p.y = y + c.dy; p.z = z + c.dz; p.s = c.s; p.op = op * c.o; p.alt = c.alt; p.sem = c.sem; p.d = (p.x - cam.x) ** 2 + (p.y - cam.y) ** 2 + (p.z - cam.z) ** 2; vis.push(p); }
    }
    // (de lejos a cerca, para que se mezclen bien unos con otros)
    vis.sort((a, b) => b.d - a.d);
    const aPos = this.aPos, aDat = this.aDat;
    for (let i = 0; i < vis.length; i++) { const p = vis[i]; aPos[i * 3] = p.x; aPos[i * 3 + 1] = p.y; aPos[i * 3 + 2] = p.z; aDat[i * 4] = p.s; aDat[i * 4 + 1] = p.op; aDat[i * 4 + 2] = p.alt; aDat[i * 4 + 3] = p.sem; }
    this.geo.instanceCount = vis.length; m.visible = vis.length > 0;
    this.geo.attributes.aPos.needsUpdate = this.geo.attributes.aDat.needsUpdate = true;
  }
  dispose() { this.scene.remove(this.mesh); this.geo.dispose(); this.mat.dispose(); this.tex.dispose(); }
}
const _c1 = new THREE.Color(), _c2 = new THREE.Color(), _c3 = new THREE.Color();
