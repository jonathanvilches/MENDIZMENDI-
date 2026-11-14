// Las nubes del mapa del inicio: cúmulos sueltos que flotan sobre la península, por encima de los montes y de la isla de la
// comarca elegida, y pasan despacio. Cuando la cámara se acerca, las de en medio se apartan hacia fuera y se deshacen, y
// queda alguna suelta; al alejarse vuelven. Sobre Navarra, vista entera, casi no hay, para que se lea el mapa.
// Lo pidió el autor el 13 de noviembre de 2026: «nubes que se van apartando conforme la cámara se va acercando y alguna
// residual se queda», con perspectiva y textura, «no manchas blancas al uso». Y el 14: «no son en 3D, se ven planas».
// Cada nube tiene volumen: es un montón de copos (de 7 a 13) repartidos en una cúpula, grandes abajo y en medio, pequeños
// arriba y en los bordes, cada uno en su sitio del espacio. Al mover la cámara, los copos se mueven unos respecto de otros,
// y la nube se ve desde arriba, de lado o desde abajo como lo que es. Cada copo es una bola con la luz del sol del mapa: el
// lado que le da, blanco; el otro y la base, en sombra azulada; con el borde deshilachado y bultos pequeños, de un ruido
// que se repite. No escriben profundidad, pero la leen: los montes que las pasan asoman por delante.
// Y dan sombra: una mancha suave en el suelo de alrededor, corrida hacia donde no da el sol.
import * as THREE from 'three';

const rnd = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const CAMPO = 340, VIENTO = [0.1, 0.035];   // (el lado del cuadrado por el que pasan, y lo que corren por segundo)

// (el ruido de los copos: dos capas de ruido de valores en cuatro octavas, que se repite sin costura, hecho una vez)
function ruidoTex() {
  const n = 128, d = new Uint8Array(n * n * 4), R = rnd(77);
  for (let canal = 0; canal < 2; canal++) {
    const capas = [4, 8, 16, 32].map(p => { const g = new Float32Array(p * p); for (let i = 0; i < g.length; i++) g[i] = R(); return { p, g }; });
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let v = 0, amp = 0.5;
      for (const { p, g } of capas) { const fx = x / n * p, fy = y / n * p, x0 = Math.floor(fx), y0 = Math.floor(fy); let tx = fx - x0, ty = fy - y0; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        const a = g[(y0 % p) * p + x0 % p], b = g[(y0 % p) * p + (x0 + 1) % p], c = g[((y0 + 1) % p) * p + x0 % p], e = g[((y0 + 1) % p) * p + (x0 + 1) % p];
        v += amp * ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + e * tx) * ty); amp *= 0.5; }
      d[(y * n + x) * 4 + canal] = Math.round(Math.min(1, v / 0.9375) * 255);
    }
  }
  const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
}

const VS = `attribute vec3 aPos; attribute vec4 aDat; uniform float uFar; varying vec2 vP; varying float vOp, vAlt, vSem, vNiebla;
void main() {
  vec4 mv = viewMatrix * vec4(aPos, 1.0); mv.xy += position.xy * aDat.x;
  gl_Position = projectionMatrix * mv;
  vP = position.xy * 2.0; vOp = aDat.y; vAlt = aDat.z; vSem = aDat.w; vNiebla = 0.5 * smoothstep(uFar * 0.45, uFar * 1.3, -mv.z);
}`;
const FS = `uniform sampler2D uRuido; uniform vec3 uSolV, uBruma, uLuz, uSombra; varying vec2 vP; varying float vOp, vAlt, vSem, vNiebla;
void main() {
  vec2 n2 = texture2D(uRuido, vP * 0.27 + vSem * vec2(7.31, 3.17)).rg, n3 = texture2D(uRuido, vP * 0.71 + vSem * vec2(1.7, 9.2)).rg;
  // (el borde, deshilachado: unos copos se deshacen antes que otros)
  float r = length(vP) + (n2.r - 0.5) * 0.52 + (n3.g - 0.5) * 0.24;
  float a = (1.0 - smoothstep(0.66, 0.9, r)) * vOp; if (a < 0.012) discard;
  // (el bulto: el copo es una bola, con bultos pequeños; la luz del sol le da de un lado, y su base queda en sombra)
  vec2 g = vP * 0.92 + (n2 - 0.5) * 0.75 + (n3 - 0.5) * 0.3; float z = sqrt(max(0.0, 1.0 - min(1.0, dot(g, g))));
  vec3 n = normalize(vec3(g, z + 0.22));
  float l = (dot(n, uSolV) * 0.5 + 0.5) * mix(0.66, 1.0, vAlt);
  vec3 c = mix(uSombra, uLuz, smoothstep(0.3, 0.7, l)) * (0.9 + 0.2 * n3.r);
  gl_FragColor = linearToOutputTexel(vec4(mix(c, uBruma, vNiebla), a));
}`;
// (la sombra en el suelo: una mancha suave)
const VS_S = `attribute vec3 aPos; attribute vec3 aDat; varying vec2 vP; varying float vOp;
void main() { vP = position.xy * 2.0; vOp = aDat.z; gl_Position = projectionMatrix * viewMatrix * vec4(aPos + vec3(position.x * aDat.x, 0.0, position.y * aDat.y), 1.0); }`;
const FS_S = `varying vec2 vP; varying float vOp;
void main() { float a = (1.0 - smoothstep(0.15, 1.0, length(vP))) * vOp; if (a < 0.004) discard; gl_FragColor = vec4(0.02, 0.035, 0.07, a); }`;

/** Las nubes. n: cuántas; copos: cuántos copos lleva cada una, como mucho; nav: el centro de Navarra ({ x, z }); sol: hacia
 *  dónde está el sol; geos y mats, para soltarlo todo. */
export function hazNubes({ scene, geos, mats, n = 56, copos = 12, nav = { x: 0, z: 0 }, sol = new THREE.Vector3(-50, 38, -22) }) {
  const R = rnd(20261114), tex = ruidoTex(); mats.push(tex);
  const SOL = sol.clone().normalize(), solV = new THREE.Vector3();
  // (cada una: dónde nace, a qué altura, su tamaño y sus copos; unas pocas, de las que se quedan)
  const N = [];
  while (N.length < n) {
    const w = 11 + R() * 15, l = w * (0.62 + R() * 0.3), h = w * (0.3 + R() * 0.14), k = Math.max(5, Math.round(copos * (0.6 + 0.4 * (w - 11) / 15))), C = [];
    for (let i = 0; i < k; i++) {
      // (una cúpula: alta en medio, baja en los bordes; los primeros copos, la base, grandes y abajo)
      const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * (i < 3 ? 0.55 : 1), cima = 1 - rr * rr, ey = i < 3 ? R() * 0.2 : R() * cima;
      const s = w * (0.27 + 0.19 * cima + 0.08 * R()) * (i < 3 ? 1.12 : 1 - 0.38 * ey);
      C.push({ dx: Math.cos(a) * rr * w * 0.4, dz: Math.sin(a) * rr * l * 0.4, dy: ey * h + s * 0.16, s, alt: Math.min(1, 0.18 + ey * 0.9 + 0.12 * cima), sem: R() });
    }
    N.push({ x: (R() - 0.5) * CAMPO, z: (R() - 0.5) * CAMPO, y: 17 + R() * 5.5, w, l, queda: R() < 0.22, op: 0.86 + R() * 0.14, C, vx: 0, vz: 0, vo: 0 });
  }
  const total = N.reduce((s, q) => s + q.C.length, 0);
  const cuad = () => { const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]); geos.push(g); return g; };
  const g = cuad(), aPos = new Float32Array(total * 3), aDat = new Float32Array(total * 4);
  g.setAttribute('aPos', new THREE.InstancedBufferAttribute(aPos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aDat', new THREE.InstancedBufferAttribute(aDat, 4).setUsage(THREE.DynamicDrawUsage));
  const U = { uRuido: { value: tex }, uBruma: { value: new THREE.Color('#a8d2f7') }, uFar: { value: 200 }, uSolV: { value: solV }, uLuz: { value: new THREE.Color('#ffffff') }, uSombra: { value: new THREE.Color('#9fb2cf') } };
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: U, vertexShader: VS, fragmentShader: FS }); mats.push(m);
  const malla = new THREE.Mesh(g, m); malla.name = 'nubes'; malla.frustumCulled = false; malla.renderOrder = 5; scene.add(malla);
  // (las sombras: una por nube, a ras del suelo de alrededor)
  const gs = cuad(), sPos = new Float32Array(n * 3), sDat = new Float32Array(n * 3);
  gs.setAttribute('aPos', new THREE.InstancedBufferAttribute(sPos, 3).setUsage(THREE.DynamicDrawUsage)); gs.setAttribute('aDat', new THREE.InstancedBufferAttribute(sDat, 3).setUsage(THREE.DynamicDrawUsage));
  const ms = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexShader: VS_S, fragmentShader: FS_S, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }); mats.push(ms);
  const sombras = new THREE.Mesh(gs, ms); sombras.name = 'sombras de las nubes'; sombras.frustumCulled = false; sombras.renderOrder = -1; scene.add(sombras);
  const P = Array.from({ length: total }, () => ({ x: 0, y: 0, z: 0, s: 0, op: 0, alt: 0, sem: 0, d: 0 })), vis = [];
  const env = (x, c) => ((x - c + CAMPO / 2) % CAMPO + CAMPO) % CAMPO - CAMPO / 2 + c, SX = -SOL.x / SOL.y, SZ = -SOL.z / SOL.y;
  let abre = 0;
  return {
    /** t, dt: el tiempo; v: la vista de la cámara ({ x, z, d }); cam: la cámara; far: hasta dónde llega la niebla; bruma:
     *  el color de lo lejano */
    update(t, dt, v, cam, far, bruma) {
      // (cuánto se han apartado: nada con Navarra entera a la vista, del todo ya cerca de una comarca; con algo de retraso,
      // para que se las vea irse)
      const quiere = 1 - Math.min(1, Math.max(0, (v.d - 42) / 70)); abre += (quiere - abre) * (1 - Math.exp(-dt * 1.4));
      const rv = Math.max(16, v.d * 0.85), cp = cam.position; U.uFar.value = far; U.uBruma.value.copy(bruma);
      solV.copy(SOL).transformDirection(cam.matrixWorldInverse);
      vis.length = 0; let k = 0, ks = 0;
      for (const q of N) {
        // (pasan con el viento, y al salir por un lado del campo entran por el otro, lejos de la cámara)
        let x = env(q.x + t * VIENTO[0], nav.x), z = env(q.z + t * VIENTO[1], nav.z), op = q.op;
        op *= suave(0.5, 0.42, Math.max(Math.abs(x - nav.x), Math.abs(z - nav.z)) / CAMPO);
        // (con Navarra entera a la vista, encima de ella solo las que se quedan, y a medias)
        const dn = Math.hypot(x - nav.x, z - nav.z); op *= 1 - (1 - abre) * (1 - suave(40, 64, dn)) * (q.queda ? 0.45 : 1);
        // (al acercarse la cámara, las de en medio se corren hacia fuera y se deshacen; las que se quedan, a medias)
        const dx = x - v.x, dz = z - v.z, d = Math.hypot(dx, dz) || 1, corre = abre * 20 * Math.exp(-d / (rv * 1.2));
        x += dx / d * corre; z += dz / d * corre;
        op *= 1 - abre * (1 - suave(rv * 0.55, rv * 1.3, d)) * (q.queda ? 0.5 : 1);
        // (y ninguna delante de la cámara)
        op *= suave(9, 28, Math.hypot(x - cp.x, q.y - cp.y, z - cp.z));
        if (op < 0.02) continue;
        for (const c of q.C) { const p = P[k++]; p.x = x + c.dx; p.y = q.y + c.dy; p.z = z + c.dz; p.s = c.s; p.op = op; p.alt = c.alt; p.sem = c.sem; p.d = (p.x - cp.x) ** 2 + (p.y - cp.y) ** 2 + (p.z - cp.z) ** 2; vis.push(p); }
        sPos[ks * 3] = x + SX * q.y; sPos[ks * 3 + 1] = 0.03; sPos[ks * 3 + 2] = z + SZ * q.y; sDat[ks * 3] = q.w * 1.25; sDat[ks * 3 + 1] = q.l * 1.25; sDat[ks * 3 + 2] = op * 0.42; ks++;
      }
      // (de lejos a cerca, para que se mezclen bien unos con otros)
      vis.sort((a, b) => b.d - a.d);
      for (let i = 0; i < vis.length; i++) { const p = vis[i]; aPos[i * 3] = p.x; aPos[i * 3 + 1] = p.y; aPos[i * 3 + 2] = p.z; aDat[i * 4] = p.s; aDat[i * 4 + 1] = p.op; aDat[i * 4 + 2] = p.alt; aDat[i * 4 + 3] = p.sem; }
      g.instanceCount = vis.length; malla.visible = vis.length > 0; g.attributes.aPos.needsUpdate = g.attributes.aDat.needsUpdate = true;
      gs.instanceCount = ks; sombras.visible = ks > 0; gs.attributes.aPos.needsUpdate = gs.attributes.aDat.needsUpdate = true;
    },
  };
}
