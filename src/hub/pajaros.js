// Pájaros sobre el mapa del inicio (mapa3d.js): con un sitio elegido, sobre él. En los pueblos y ciudades, cigüeñas y
// milanos que planean en círculos sobre sus tejados; en los espacios naturales (Irati, Urbasa, Bértiz…), buitres leonados
// y milanos, más altos y en círculos más anchos, a la escala de su cámara, que va mucho más lejos. Aletean de vez en
// cuando y dejan su sombra en el suelo. En la vista de toda Navarra y en la de una comarca, ninguno (antes cruzaban
// bandadas también por ahí, y no gustaba). Una sola malla repetida para todos (un solo dibujo), con el aleteo en el
// sombreador; en el procesador solo se mueve cada pájaro, una decena.
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
 * o: { scene, lento, suelo(x, z) → la altura del suelo en el mundo, pueblo() → { X, Z, f, natural } del sitio elegido o null;
 * f: la escala, la distancia de su cámara en proporción a la de un pueblo }.
 * Devuelve { update(dt, t, v, activo), estrena(), dispose }. v: la vista del mapa ({ x, z, d, hy }). estrena: los pinta una vez,
 * invisibles, para que la tarjeta gráfica se prepare antes de que hagan falta.
 */
export function hacePajaros(o) {
  const CIG = o.lento ? [5] : [6, 4], total = CIG.reduce((a, b) => a + b, 0);
  const g = pajaroG(), fase = new Float32Array(total * 3);
  const T = { value: 0 };
  // (sin niebla: con la del mapa, salían grises y desvaídos)
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
  // sobre el pueblo: cigüeñas, blancas con las puntas negras, y milanos, pardos; planeando en círculo y aleteando a ratos
  // (algo más grandes que de verdad, como las casas, que van exageradas en alto: si no, ni se veían)
  CIG.forEach((k, i) => {
    const milano = i === 1, b = { milano, r: 0.035 + i * 0.03, w: (i ? -1 : 1) * (0.22 + i * 0.05), h: 0.045 + i * 0.02, s: milano ? 0.0038 : 0.0045, aves: [] };
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
  let kPueblo = 0, centro = null, natural = null, estreno = false;
  // (pintarlos una vez sin que se vean, todos a escala cero, cuando lo pida el mapa al tocar una comarca o un pueblo: la
  // primera vez que la tarjeta gráfica los pinta tiene que prepararse, y era justo al llegar al primer pueblo, al aparecer
  // los pájaros, a media bajada; el parón más largo del vuelo)
  const aCero = () => { for (let i = 0; i < total; i++) im.setMatrixAt(i, cero); for (let i = 0; i < nS; i++) sombras.setMatrixAt(i, cero); im.instanceMatrix.needsUpdate = sombras.instanceMatrix.needsUpdate = true; };
  aCero(); im.visible = sombras.visible = false;
  // (los colores, según el sitio: cigüeñas blancas sobre los pueblos, buitres pardos claros sobre el monte; milanos en los dos)
  const viste = (nat) => { natural = nat; for (const b of bandadas) for (const a of b.aves) im.setColorAt(a.i, b.milano ? col.setRGB(0.07, 0.045, 0.03) : nat ? col.setRGB(0.36, 0.26, 0.16) : col.setRGB(0.95, 0.93, 0.88)); im.instanceColor.needsUpdate = true; };
  const pon = (i, x, y, z, rumbo, alabeo, s) => { eu.set(0, rumbo, alabeo); q.setFromEuler(eu); im.setMatrixAt(i, s > 1e-6 ? M4.compose(e3.set(x, y, z), q, sc.set(s, s, s)) : cero); };

  function update(dt, t, v, activo) {
    T.value = t;
    // (con un pueblo elegido y la cámara cerca de él; al alejarse o cerrarlo, se van poco a poco)
    const pue = activo ? o.pueblo() : null;
    // (al cambiar de clase de sitio, de pueblo a monte o al revés, primero se van las de antes y luego vienen las nuevas,
    // con su color y su escala: si no, las cigüeñas que se iban crecían de golpe hasta el tamaño de los buitres)
    if (pue && !!pue.natural !== natural && kPueblo < 0.05) viste(!!pue.natural);
    if (pue && !!pue.natural === natural) centro = pue;
    const f = centro?.f || 1;
    // (llegan despacio y se van deprisa: al volver a toda Navarra se quedaban unos segundos encima, enormes en la vista general)
    const quiere = pue && !!pue.natural === natural && v.d < 2.6 * pue.f ? 1 : 0;
    kPueblo += (quiere - kPueblo) * (1 - Math.exp(-dt * (quiere ? 2 : 7)));
    if (!quiere && v.d > 6 * (centro?.f || 1)) kPueblo = 0;
    // (sin pueblo, nada que mover ni que dibujar; salvo el estreno, una imagen, invisible)
    if (kPueblo < 0.01 || !centro) { if (estreno) { estreno = false; aCero(); im.visible = sombras.visible = true; smat.opacity = 0.26; return; } im.visible = sombras.visible = false; return; }
    estreno = false;
    const suelo0 = o.suelo(centro.X, centro.Z) ?? v.hy;
    for (const b of bandadas) {
      // (los buitres, más altos y en círculos más anchos; los milanos del monte, algo por debajo)
      const fb = f * (natural && !b.milano ? 1.25 : 1), y0 = suelo0 + b.h * fb, s = b.s * fb * kPueblo;
      for (const a of b.aves) {
        a.a += b.w * dt * (1 + a.dr * 4);
        const r = (b.r + a.dr + Math.sin(t * 0.3 + a.f) * 0.008) * fb, x = centro.X + Math.cos(a.a) * r, z = centro.Z + Math.sin(a.a) * r;
        // (el rumbo, la tangente del círculo; y ladeada hacia dentro, como al virar)
        const rumbo = Math.atan2(-Math.sin(a.a) * Math.sign(b.w), Math.cos(a.a) * Math.sign(b.w));
        const y = y0 + (a.dh + Math.sin(t * 0.5 + a.f) * 0.004) * fb;
        pon(a.i, x, y, z, rumbo, -Math.sign(b.w) * 0.35, s);
        const sx = x + (y - suelo0) * SOL[0], sz2 = z + (y - suelo0) * SOL[1], gy = o.suelo(sx, sz2) ?? suelo0;
        eu.set(0, rumbo, 0); q.setFromEuler(eu); sombras.setMatrixAt(a.sm, M4.compose(e3.set(sx, gy + 0.0004, sz2), q, sc.set(s * 0.8, 1, s * 0.45)));
      }
    }
    im.instanceMatrix.needsUpdate = true; sombras.instanceMatrix.needsUpdate = true;
    im.visible = sombras.visible = true; smat.opacity = 0.26 * kPueblo;
  }
  return { update, estrena() { estreno = true; }, dispose() { im.removeFromParent(); sombras.removeFromParent(); g.dispose(); m.dispose(); sg.dispose(); smat.dispose(); } };
}
