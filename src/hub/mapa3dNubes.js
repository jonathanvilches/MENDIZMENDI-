// Las nubes del mapa del inicio: cúmulos sueltos que flotan sobre la península, por encima de los montes y de la isla de la
// comarca elegida, y pasan despacio. Cuando la cámara se acerca, las de en medio se apartan hacia fuera y se deshacen, y
// queda alguna suelta; al alejarse vuelven. Sobre Navarra, vista entera, casi no hay, para que se lea el mapa.
// Lo pidió el autor el 13 de noviembre de 2026: «nubes que se van apartando conforme la cámara se va acercando y alguna
// residual se queda», y con perspectiva y textura, «no manchas blancas al uso».
// Cada nube es una imagen de un cúmulo de verdad, con su bulto, su sombra por debajo y sus bordes deshilachados (cuatro
// distintos en una hoja con transparencia, de Higgsfield: src/assets/isla/nubes.webp), puesta en su sitio en el espacio y
// siempre de cara a la cámara: las de cerca se ven grandes y las de lejos pequeñas, se tapan unas a otras y se mueven
// distinto al mover la cámara. No escriben profundidad, pero la leen: los montes que las pasan asoman por delante.
import * as THREE from 'three';
import NUBES from '../assets/isla/nubes.webp?url';

const rnd = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const CAMPO = 340, VIENTO = [0.1, 0.035];   // (el lado del cuadrado por el que pasan, y lo que corren por segundo)

const VS = `attribute vec3 aPos; attribute vec4 aDat; uniform float uFar; varying vec2 vUv; varying float vOp, vNiebla;
void main() {
  vec4 mv = viewMatrix * vec4(aPos, 1.0); mv.xy += position.xy * aDat.xy;
  gl_Position = projectionMatrix * mv;
  float col = mod(aDat.z, 2.0), fila = floor(aDat.z * 0.5); vec2 u = mix(vec2(0.012), vec2(0.988), uv);
  vUv = vec2((u.x + col) * 0.5, (u.y + 1.0 - fila) * 0.5); vOp = aDat.w; vNiebla = 0.55 * smoothstep(uFar * 0.45, uFar * 1.3, -mv.z);
}`;
const FS = `uniform sampler2D uMap; uniform vec3 uBruma; varying vec2 vUv; varying float vOp, vNiebla;
void main() { vec4 t = texture2D(uMap, vUv); float a = t.a * vOp; if (a < 0.008) discard;
  gl_FragColor = linearToOutputTexel(vec4(mix(t.rgb * 1.06, uBruma, vNiebla), a)); }`;

/** Las nubes. n: cuántas; nav: el centro de Navarra ({ x, z }); geos y mats, para soltarlo todo. */
export function hazNubes({ scene, geos, mats, n = 64, nav = { x: 0, z: 0 }, aniso = 4 }) {
  const R = rnd(20261113), tex = new THREE.TextureLoader().load(NUBES); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = aniso; mats.push(tex);
  // (cada una: dónde nace, a qué altura, su tamaño, cuál de las cuatro es y si va del revés; unas pocas, de las que se quedan)
  const N = [];
  while (N.length < n) {
    const x = (R() - 0.5) * CAMPO, z = (R() - 0.5) * CAMPO, w = 16 + R() * 24, queda = R() < 0.22;
    N.push({ x, z, y: 17.5 + R() * 5, w: w * (R() < 0.5 ? -1 : 1), h: Math.min(15, Math.abs(w) * (0.56 + R() * 0.12)), c: (R() * 4) | 0, queda, op: 0.82 + R() * 0.18 });
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
  const aPos = new Float32Array(n * 3), aDat = new Float32Array(n * 4);
  g.setAttribute('aPos', new THREE.InstancedBufferAttribute(aPos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aDat', new THREE.InstancedBufferAttribute(aDat, 4).setUsage(THREE.DynamicDrawUsage));
  g.instanceCount = n; geos.push(g);
  const U = { uMap: { value: tex }, uBruma: { value: new THREE.Color('#b4d2ec') }, uFar: { value: 200 } };
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: U, vertexShader: VS, fragmentShader: FS }); mats.push(m);
  const malla = new THREE.Mesh(g, m); malla.name = 'nubes'; malla.frustumCulled = false; malla.renderOrder = 5; scene.add(malla);
  const P = N.map(() => ({ x: 0, y: 0, z: 0, w: 0, h: 0, c: 0, op: 0, d: 0 })), env = (x, c) => ((x - c + CAMPO / 2) % CAMPO + CAMPO) % CAMPO - CAMPO / 2 + c;
  let abre = 0;
  return {
    /** t, dt: el tiempo; v: la vista de la cámara ({ x, z, d }); cam: la cámara; far: hasta dónde llega la niebla; bruma:
     *  el color de lo lejano */
    update(t, dt, v, cam, far, bruma) {
      // (cuánto se han apartado: nada con Navarra entera a la vista, del todo ya cerca de una comarca; con algo de retraso,
      // para que se las vea irse)
      const quiere = 1 - Math.min(1, Math.max(0, (v.d - 42) / 70)); abre += (quiere - abre) * (1 - Math.exp(-dt * 1.4));
      const rv = Math.max(16, v.d * 0.85), cp = cam.position; U.uFar.value = far; U.uBruma.value.copy(bruma);
      N.forEach((q, i) => { const p = P[i];
        // (pasan con el viento, y al salir por un lado del campo entran por el otro, lejos de la cámara)
        let x = env(q.x + t * VIENTO[0], nav.x), z = env(q.z + t * VIENTO[1], nav.z), op = q.op;
        op *= suave(0.5, 0.42, Math.max(Math.abs(x - nav.x), Math.abs(z - nav.z)) / CAMPO);
        // (con Navarra entera a la vista, encima de ella solo las que se quedan, y a medias)
        const dn = Math.hypot(x - nav.x, z - nav.z); op *= 1 - (1 - abre) * (1 - suave(28, 50, dn)) * (q.queda ? 0.45 : 1);
        // (al acercarse la cámara, las de en medio se corren hacia fuera y se deshacen; las que se quedan, a medias)
        const dx = x - v.x, dz = z - v.z, d = Math.hypot(dx, dz) || 1, corre = abre * 20 * Math.exp(-d / (rv * 1.2));
        x += dx / d * corre; z += dz / d * corre;
        op *= 1 - abre * (1 - suave(rv * 0.55, rv * 1.3, d)) * (q.queda ? 0.5 : 1);
        // (y ninguna delante de la cámara)
        const dc = Math.hypot(x - cp.x, q.y - cp.y, z - cp.z); op *= suave(7, 24, dc);
        p.x = x; p.y = q.y; p.z = z; p.w = q.w; p.h = q.h; p.c = q.c; p.op = op; p.d = dc; });
      // (de lejos a cerca, para que se mezclen bien unas con otras)
      const orden = P.slice().sort((a, b) => b.d - a.d); let k = 0;
      for (const p of orden) { if (p.op < 0.01) continue; aPos[k * 3] = p.x; aPos[k * 3 + 1] = p.y; aPos[k * 3 + 2] = p.z; aDat[k * 4] = p.w; aDat[k * 4 + 1] = p.h; aDat[k * 4 + 2] = p.c; aDat[k * 4 + 3] = p.op; k++; }
      g.instanceCount = k; malla.visible = k > 0; g.attributes.aPos.needsUpdate = g.attributes.aDat.needsUpdate = true;
    },
  };
}
