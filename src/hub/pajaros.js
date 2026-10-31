// Pájaros sobre el mapa del inicio (mapa3d.js): bandadas que cruzan el cielo de Navarra, en uve o sueltas, batiendo las
// alas, y, muy cerca de un pueblo (en su maqueta), cigüeñas que planean en círculos sobre los tejados y aletean de vez en
// cuando. Una sola malla repetida para todos (un solo dibujo), con el aleteo en el sombreador; en el procesador solo se
// mueve cada pájaro, unas decenas.
// Las bandadas van ancladas al mundo (al arrastrar el mapa no se las lleva la cámara), pero su tamaño, su altura y su
// velocidad van con la distancia de la cámara: así se ven siempre del mismo tamaño en pantalla, como pájaros que pasan
// entre la cámara y el suelo. Cuando una se aleja de la vista, vuelve a entrar por el otro lado.
import * as THREE from 'three';

// (la silueta, mirando a +z, con la envergadura de -1 a 1: cuerpo, cola abierta y dos alas de dos tramos; «ala» vale 0 en
// el cuerpo, 0,5 en el codo y 1 en la punta, y es lo que se dobla al batir)
function pajaroG() {
  const N = [0, 0, 0.45], LF = [-0.07, 0, 0.1], RF = [0.07, 0, 0.1], LB = [-0.06, 0, -0.2], RB = [0.06, 0, -0.2], TL = [-0.16, 0, -0.55], TR = [0.16, 0, -0.55];
  const tri = [[N, RF, LF], [LF, RF, RB], [LF, RB, LB], [LB, RB, TR], [LB, TR, TL]], ala = [];
  for (let k = 0; k < tri.length * 3; k++) ala.push(0);
  for (const s of [1, -1]) {
    const F = [0.07 * s, 0, 0.1], B = [0.06 * s, 0, -0.2], EF = [0.48 * s, 0, 0.05], EB = [0.46 * s, 0, -0.16], P = [1 * s, 0, -0.22];
    tri.push([F, EF, EB], [F, EB, B], [EF, P, EB]); ala.push(0, 0.5, 0.5, 0, 0.5, 0, 0.5, 1, 0.5);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tri.flat(2), 3));
  g.setAttribute('ala', new THREE.Float32BufferAttribute(ala, 1));
  return g;
}

/**
 * o: { scene, lento, suelo(x, z) → la altura del suelo en el mundo, pueblo() → { X, Z } del pueblo con maqueta o null }.
 * Devuelve { update(dt, t, v, activo), dispose }. v: la vista del mapa ({ x, z, d, hy }).
 */
export function hacePajaros(o) {
  const MAPA = o.lento ? [7, 6] : [9, 7, 5], CIG = o.lento ? [5] : [6, 4];
  const total = MAPA.reduce((a, b) => a + b, 0) + CIG.reduce((a, b) => a + b, 0);
  const g = pajaroG(), aves = [], fase = new Float32Array(total * 3);
  const T = { value: 0 };
  // (sin niebla: con la del mapa, las bandadas salían grises y desvaídas)
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, toneMapped: false, fog: false });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = T;
    // (aAve: fase, ritmo y fuerza del aleteo; con fuerza negativa, planea y solo aletea a ratos, como las cigüeñas)
    sh.vertexShader = 'attribute float ala; attribute vec3 aAve; uniform float uT; varying float vTinte;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
float fuerza = aAve.z < 0.0 ? -aAve.z * smoothstep(0.55, 0.95, sin(uT * 0.33 + aAve.x * 2.7)) + 0.06 : aAve.z;
float bate = sin(uT * aAve.y + aAve.x);
transformed.y += ala * (0.35 + 0.35 * ala) * bate * fuerza;
transformed.x *= 1.0 - 0.14 * ala * abs(bate) * fuerza;
vTinte = mix(1.0, 0.3, smoothstep(0.62, 0.95, ala)) * (1.0 - 0.22 * ala * max(0.0, bate) * fuerza);`);
    sh.fragmentShader = 'varying float vTinte;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= vTinte;');
  };
  m.customProgramCacheKey = () => 'mapa-pajaros';
  const im = new THREE.InstancedMesh(g, m, total); im.frustumCulled = false; im.raycast = () => {}; im.renderOrder = 3;
  const col = new THREE.Color();
  let n = 0, nS = 0, semilla = 11;
  const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  const bandadas = [];
  // las bandadas del cielo: oscuras, de aleteo rápido; una en uve y las demás sueltas
  MAPA.forEach((k, i) => {
    const b = { modo: 'mapa', uve: i === 0, ang: azar() * 6.283, x: 0, z: 0, nueva: true, aves: [] };
    for (let j = 0; j < k; j++) {
      const lado = j % 2 ? 1 : -1, fila = Math.ceil(j / 2);
      b.aves.push({ i: n, ox: b.uve ? lado * fila * 0.9 : (azar() - 0.5) * 5, oz: b.uve ? -fila * 0.8 : (azar() - 0.5) * 5, oy: (azar() - 0.5) * 0.8, f: azar() * 6.283 });
      fase.set([azar() * 6.283, 9 + azar() * 4, 0.75], n * 3); im.setColorAt(n, col.setRGB(0.045, 0.04, 0.05)); n++;
    }
    bandadas.push(b);
  });
  // sobre el pueblo: cigüeñas, blancas con las puntas negras, y milanos, pardos; planeando en círculo y aleteando a ratos
  // (algo más grandes que de verdad, como las casas, que van exageradas en alto: si no, ni se veían)
  CIG.forEach((k, i) => {
    const milano = i === 1, b = { modo: 'pueblo', r: 0.035 + i * 0.03, w: (i ? -1 : 1) * (0.22 + i * 0.05), h: 0.045 + i * 0.02, s: milano ? 0.0038 : 0.0045, aves: [] };
    for (let j = 0; j < k; j++) {
      b.aves.push({ i: n, sm: nS++, a: j / k * 6.283 + azar() * 0.6, dr: (azar() - 0.5) * 0.03, dh: (azar() - 0.5) * 0.012, f: azar() * 6.283 });
      fase.set([azar() * 6.283, milano ? 6 + azar() : 4.5 + azar(), milano ? -0.6 : -0.9], n * 3);
      im.setColorAt(n, milano ? col.setRGB(0.07, 0.045, 0.03) : col.setRGB(0.95, 0.93, 0.88)); n++;
    }
    bandadas.push(b);
  });
  g.setAttribute('aAve', new THREE.InstancedBufferAttribute(fase, 3));
  o.scene.add(im);
  // (y la sombra de cada ave del pueblo en el suelo, hacia donde no da el sol: así se ven también sobre el verde claro y se
  // nota que vuelan por encima de los tejados)
  const sg = new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2), smat = new THREE.MeshBasicMaterial({ color: 0x14101c, transparent: true, opacity: 0.26, depthWrite: false, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
  const sombras = new THREE.InstancedMesh(sg, smat, Math.max(1, nS)); sombras.frustumCulled = false; sombras.raycast = () => {}; sombras.renderOrder = 2; o.scene.add(sombras);
  // (la sombra se corre hacia donde marca el sol del mapa, mapa3d.js, pero menos de lo que tocaría: con el sol tan bajo
  // caía a más de 100 m del ave y no se las relacionaba)
  const SOL = [50 / 38 * 0.3, 22 / 38 * 0.3];
  const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Vector3(), sc = new THREE.Vector3(), eu = new THREE.Euler(0, 0, 0, 'YXZ'), cero = new THREE.Matrix4().makeScale(0, 0, 0);
  let kMapa = 0, kPueblo = 0, centro = null;
  const pon = (i, x, y, z, rumbo, alabeo, s) => { eu.set(0, rumbo, alabeo); q.setFromEuler(eu); im.setMatrixAt(i, s > 1e-6 ? M4.compose(e3.set(x, y, z), q, sc.set(s, s, s)) : cero); };

  function update(dt, t, v, activo) {
    T.value = t;
    // (las del cielo, en la vista de una comarca o de Navarra; las cigüeñas, en la maqueta de un pueblo)
    const pue = activo ? o.pueblo() : null;
    if (pue) centro = pue;
    kMapa += ((activo && v.d > 3.5 && v.d < 95 ? 1 : 0) - kMapa) * (1 - Math.exp(-dt * 2));
    kPueblo += ((pue && v.d < 2.6 ? 1 : 0) - kPueblo) * (1 - Math.exp(-dt * 2));
    // (R: lo que se ve alrededor del centro de la vista, más o menos; una bandada entra por un borde, cruza y sale)
    const D = v.d, R = D * 0.85, sz = D * 0.0075 * kMapa;
    for (const b of bandadas) {
      if (b.modo === 'mapa') {
        if (kMapa < 0.01) { for (const a of b.aves) im.setMatrixAt(a.i, cero); b.nueva = true; continue; }
        // (entra por un lado de la vista y la cruza; si se sale, o si se ha acercado o alejado mucho la cámara, vuelve a entrar)
        const dx = Math.sin(b.ang), dz = Math.cos(b.ang);
        if (b.nueva || Math.hypot(b.x - v.x, b.z - v.z) > R * 1.3 || Math.abs(Math.log((b.d0 || D) / D)) > 0.7) {
          // (la primera vez, o tras acercarse o alejarse mucho, ya dentro de la vista; luego, desde fuera, por detrás de su rumbo)
          const dentro = b.nueva || Math.abs(Math.log((b.d0 || D) / D)) > 0.7, lat = (azar() - 0.5) * R * 0.9, atras = dentro ? azar() * 1.4 - 0.7 : 1.2;
          b.ang += (azar() - 0.5) * 1.2; b.x = v.x - Math.sin(b.ang) * R * atras + Math.cos(b.ang) * lat; b.z = v.z - Math.cos(b.ang) * R * atras - Math.sin(b.ang) * lat;
          b.nueva = false; b.d0 = D;
        }
        const vel = D * 0.055, giro = Math.sin(t * 0.21 + b.ang * 3) * 0.12;
        b.ang += giro * dt; b.x += dx * vel * dt; b.z += dz * vel * dt;
        const y0 = (o.suelo(b.x, b.z) ?? v.hy) + D * 0.28, ca = Math.cos(b.ang), sa = Math.sin(b.ang);
        for (const a of b.aves) {
          const ox = a.ox + Math.sin(t * 0.7 + a.f) * 0.25, oz = a.oz + Math.cos(t * 0.53 + a.f) * 0.25, s = sz * 6;
          pon(a.i, b.x + (ox * ca + oz * sa) * sz * 6, y0 + (a.oy + Math.sin(t * 1.1 + a.f) * 0.15) * sz * 6, b.z + (-ox * sa + oz * ca) * sz * 6, b.ang, -giro * 2.5, s * 0.5);
        }
      } else {
        if (kPueblo < 0.01 || !centro) { for (const a of b.aves) { im.setMatrixAt(a.i, cero); sombras.setMatrixAt(a.sm, cero); } continue; }
        const suelo0 = o.suelo(centro.X, centro.Z) ?? v.hy, y0 = suelo0 + b.h, s = b.s * kPueblo;
        for (const a of b.aves) {
          a.a += b.w * dt * (1 + a.dr * 4);
          const r = b.r + a.dr + Math.sin(t * 0.3 + a.f) * 0.008, x = centro.X + Math.cos(a.a) * r, z = centro.Z + Math.sin(a.a) * r;
          // (el rumbo, la tangente del círculo; y ladeada hacia dentro, como al virar)
          const rumbo = Math.atan2(-Math.sin(a.a) * Math.sign(b.w), Math.cos(a.a) * Math.sign(b.w));
          const y = y0 + a.dh + Math.sin(t * 0.5 + a.f) * 0.004;
          pon(a.i, x, y, z, rumbo, -Math.sign(b.w) * 0.35, s);
          const sx = x + (y - suelo0) * SOL[0], sz2 = z + (y - suelo0) * SOL[1], gy = o.suelo(sx, sz2) ?? suelo0;
          eu.set(0, rumbo, 0); q.setFromEuler(eu); sombras.setMatrixAt(a.sm, M4.compose(e3.set(sx, gy + 0.0004, sz2), q, sc.set(s * 0.8, 1, s * 0.45)));
        }
      }
    }
    im.instanceMatrix.needsUpdate = true; sombras.instanceMatrix.needsUpdate = true;
    im.visible = kMapa > 0.01 || kPueblo > 0.01; sombras.visible = kPueblo > 0.01; smat.opacity = 0.26 * kPueblo;
  }
  return { update, dispose() { im.removeFromParent(); sombras.removeFromParent(); g.dispose(); m.dispose(); sg.dispose(); smat.dispose(); } };
}
