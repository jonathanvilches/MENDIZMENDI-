// La pelota en casa en primera persona: la cámara en los ojos de tu pelotari, mirando al frontis, y delante sus brazos,
// que hacen lo que hacen los tuyos. Salen de los puntos del cuerpo que ve la cámara del aparato (MediaPipe, en
// camaraCuerpo.js: hombros, codos, muñecas y manos). La imagen es plana: la profundidad se saca de lo que mide cada hueso
// (un brazo estirado hacia la pantalla apenas se ve largo en la imagen, así que va hacia delante) y, para saber si va
// hacia delante o hacia atrás, de lo que dice el detector, muy suavizado.
// Los brazos llevan la manga corta de la camiseta (azul o colorada), la piel y los tacos de la pelota a mano: los dedos
// vendados con esparadrapo blanco y la muñeca con su vuelta. Si la cámara no te ve, la guardia y el golpe del pelotari.
// Lo usa pelota/match.js (con la cámara, la vista en primera persona; se cambia en el menú del partido o con la V).
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// medidas de una persona (m): el ancho de hombros con el que se pasa de la imagen a metros, y lo que mide cada hueso
const HOMBROS = 0.38, BRAZO = 0.29, ANTEBRAZO = 0.265;
// dónde van los hombros respecto a los ojos (x a la derecha, y arriba, z hacia atrás: la cámara mira hacia -z). Algo más
// altos que los de verdad y con los brazos inclinados hacia delante (INCLINA), como en los juegos en primera persona: si
// no, las manos en guardia quedan por debajo de la imagen (de verdad, para vértelas hay que bajar la vista)
const HOMBRO = { R: [0.18, -0.15, 0.05], L: [-0.18, -0.15, 0.05] }, INCLINA = 0.8;
// los puntos de MediaPipe de cada brazo (sin espejo: el R de la pantalla es tu brazo derecho)
const PUNTOS = { R: { s: 12, e: 14, w: 16, i: 20, p: 18 }, L: { s: 11, e: 13, w: 15, i: 19, p: 17 } };
const PIEL = '#eebc96', VENDA = '#f4f0e6';

export class PrimeraPersona {
  constructor(THREE, camera, { camiseta = '#2f56c8' } = {}) {
    this.T = THREE; this.cam = camera; this.on = false;
    const T = THREE, mat = (color, r = 0.72) => new T.MeshStandardMaterial({ color, roughness: r, metalness: 0 });
    this.mats = [mat(PIEL, 0.6), mat(camiseta, 0.8), mat(VENDA, 0.85)];
    const [mPiel, mCam, mVenda] = this.mats;
    this.group = new T.Group(); this.group.name = 'primera-persona'; this.group.visible = false;
    const V3 = () => new T.Vector3();
    this.v = { cE: V3(), cW: V3(), gE: V3(), gW: V3(), h: V3(), X: V3(), x: V3(), z: V3(), d: V3(), up: new T.Vector3(0, 1, 0), ejeX: new T.Vector3(1, 0, 0), m: new T.Matrix4() };
    // (un hueso: una cápsula que nace en el origen y crece hacia +y, más gruesa arriba y estrecha abajo, con su bulto)
    const hueso = (r0, r1, len, bulto = 0) => {
      const g = new T.CapsuleGeometry(r0, len, 6, 14), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i), t = clamp((y + len / 2) / len, 0, 1), f = (r0 + (r1 - r0) * t + bulto * Math.sin(Math.PI * clamp(t * 1.3, 0, 1))) / r0;
        p.setXYZ(i, p.getX(i) * f, y + len / 2, p.getZ(i) * f);
      }
      g.computeVertexNormals(); return g;
    };
    const malla = (geo, m) => { const o = new T.Mesh(geo, m); o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; return o; };
    this.brazos = {};
    for (const lado of ['R', 'L']) {
      const s = lado === 'R' ? 1 : -1, B = { lado };
      // brazo: la piel, con la manga corta de la camiseta encima (con su dobladillo)
      B.brazo = new T.Group();
      B.brazo.add(malla(hueso(0.05, 0.043, BRAZO, 0.006), mPiel));
      const manga = malla(new T.CylinderGeometry(0.058, 0.062, 0.13, 18, 1, false).translate(0, 0.05, 0), mCam);
      const dobla = malla(new T.TorusGeometry(0.061, 0.005, 6, 18).rotateX(Math.PI / 2).translate(0, 0.114, 0), mCam);
      B.brazo.add(manga, dobla);
      // antebrazo: más ancho junto al codo y estrecho en la muñeca
      B.ante = new T.Group(); B.ante.add(malla(hueso(0.044, 0.031, ANTEBRAZO, 0.006), mPiel));
      // la mano, con los tacos: palma vendada, cuatro dedos con su esparadrapo (las yemas, de piel), el pulgar y la vuelta
      // de venda en la muñeca. La palma mira hacia +z de la mano y el pulgar queda hacia fuera (+x en la derecha)
      B.mano = new T.Group();
      const palma = malla(new T.BoxGeometry(0.082, 0.088, 0.03, 2, 2, 1), mVenda); palma.position.set(0, 0.05, 0); B.mano.add(palma);
      const ruta = malla(new T.TorusGeometry(0.03, 0.008, 6, 16).rotateX(Math.PI / 2), mVenda); ruta.scale.set(1, 1, 0.8); ruta.position.y = -0.004; B.mano.add(ruta);
      B.dedos = [];
      [[-0.03, 0.05, 0.016], [-0.01, 0.056, 0.017], [0.01, 0.054, 0.017], [0.029, 0.045, 0.015]].forEach(([x, len, r]) => {
        const d = new T.Group(); d.position.set(x * s * -1, 0.094, 0.002);
        d.add(malla(new T.CapsuleGeometry(r * 0.72, len, 4, 8).translate(0, len / 2, 0), mVenda));
        const yema = malla(new T.SphereGeometry(r * 0.7, 8, 6), mPiel); yema.position.y = len + r * 0.25; d.add(yema);
        d.rotation.x = 0.22; d.rotation.z = x * s * 0.6; B.mano.add(d); B.dedos.push(d);
      });
      const pulgar = new T.Group(); pulgar.position.set(0.043 * s, 0.03, 0.012);
      pulgar.add(malla(new T.CapsuleGeometry(0.012, 0.046, 4, 8).translate(0, 0.023, 0), mVenda));
      pulgar.rotation.set(0.55, 0, -0.45 * s); B.mano.add(pulgar);
      B.mano.scale.setScalar(1.15);   // (con los tacos, la mano abulta algo más)
      this.group.add(B.brazo, B.ante, B.mano);
      // dónde está cada articulación ahora (suavizado), y cuánto manda tu cuerpo frente a la guardia del pelotari
      B.S = new T.Vector3(...HOMBRO[lado]);  B.E = new T.Vector3(); B.W = new T.Vector3(); B.X = new T.Vector3(-1, 0, 0); B.k = 0; B.ini = false;
      this.brazos[lado] = B;
    }
    this.vista = { pos: new T.Vector3(), mira: new T.Vector3(), ini: false };
  }
  enciende(scene) {
    if (!this.group.parent && scene) scene.add(this.group);
    this.on = true; this.group.visible = true; this.vista.ini = false;
    this.near0 = this.cam.near; this.cam.near = 0.06; this.cam.updateProjectionMatrix();
  }
  apaga() {
    this.on = false; this.group.visible = false;
    if (this.near0) { this.cam.near = this.near0; this.cam.updateProjectionMatrix(); }
  }
  dispose() { this.apaga(); this.group.parent?.remove(this.group); this.group.traverse(o => o.geometry?.dispose()); for (const m of this.mats) m.dispose(); }

  /** La cámara en tus ojos y los brazos delante. ojo: dónde están tus ojos (en el mundo); mira: hacia dónde miras;
   *  cuerpo: el de camaraCuerpo.js (o null); st: el estado de tu pelotari (para la guardia y el golpe sin cámara) */
  update(dt, { ojo, mira, cuerpo, st, fov = 62 }) {
    const V = this.vista, cam = this.cam, k = 1 - Math.exp(-dt * 9), kp = 1 - Math.exp(-dt * 14);
    if (!V.ini) { V.pos.copy(ojo); V.mira.copy(mira); V.ini = true; }
    V.pos.lerp(ojo, kp); V.mira.lerp(mira, k);
    cam.position.copy(V.pos); cam.lookAt(V.mira);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();
    this.group.position.copy(cam.position); this.group.quaternion.copy(cam.quaternion);
    const L = cuerpo?.visto ? cuerpo.lms : null, sw = cuerpo?.sw || 0;
    for (const lado of ['R', 'L']) this.brazo(this.brazos[lado], dt, L, sw, cuerpo, st);
  }

  // un brazo: de tu cuerpo si se ve; si no, la guardia del pelotari (y su golpe)
  brazo(B, dt, L, sw, C, st) {
    const v = this.v, s = B.lado === 'R' ? 1 : -1, P = PUNTOS[B.lado];
    let cuerpo = false, palma = false;
    const vis = (i) => (L && L[i] ? L[i].visibility ?? 1 : 0);
    if (L && sw > 8 && vis(P.s) > 0.5 && vis(P.e) > 0.3 && vis(P.w) > 0.25) {
      const vw = C.vw || 640, vh = C.vh || 480, m = HOMBROS / sw;
      const px = (i) => [(1 - L[i].x) * vw, L[i].y * vh, (L[i].z || 0) * vw];
      // (un hueso de la imagen a la cámara: lo de lado y arriba, tal cual; lo de delante, lo que le falta para medir lo que
      // mide, hacia delante salvo que el detector diga claramente que va hacia atrás)
      const lift = (a, b, len, out) => {
        let dx = (b[0] - a[0]) * m, dy = -(b[1] - a[1]) * m; const dzr = (b[2] - a[2]) * m, pl = Math.hypot(dx, dy);
        if (pl > len) { dx *= len / pl; dy *= len / pl; }
        const resto = Math.sqrt(Math.max(0, len * len - dx * dx - dy * dy)), delante = Math.tanh((0.04 - dzr) / 0.07);
        return out.set(dx, dy, -resto * delante);
      };
      const S = px(P.s), e = px(P.e), w = px(P.w);
      v.cE.copy(lift(S, e, BRAZO, v.h));
      v.cW.copy(v.cE).add(lift(e, w, ANTEBRAZO, v.h));
      cuerpo = true;
      // (hacia dónde mira la palma: la línea del meñique al índice que da el detector, si las ve; en las dos manos, con la
      // palma hacia delante, va hacia la izquierda de la pantalla)
      if (vis(P.i) > 0.4 && vis(P.p) > 0.4) { const a = px(P.i), b = px(P.p); v.X.set((a[0] - b[0]) * s, -(a[1] - b[1]) * s, (a[2] - b[2]) * s * 0.3); palma = v.X.lengthSq() > 1; if (palma) v.X.normalize().applyAxisAngle(v.ejeX, INCLINA); }
      B.k = Math.min(1, B.k + dt * 5);
    } else B.k = Math.max(0, B.k - dt * 3);
    // la guardia del pelotari: los codos abajo y algo fuera, las manos delante a la altura del pecho; al armar, la mano
    // atrás y arriba; al golpear, el brazo de ese lado cruza por delante
    // (todo desde el hombro, como está el cuerpo; al final se pasa a la vista)
    const gE = v.gE.set(0.08 * s, -0.93, -0.36).normalize().multiplyScalar(BRAZO);
    const gW = v.gW.set(-0.2 * s, 0.32, -0.93).normalize().multiplyScalar(ANTEBRAZO).add(gE);
    if (st && B.k < 1) {
      const suyo = (st.golpe || 'Hit').endsWith('L') ? 'L' : 'R', arma = (st.arma || 'Hit').endsWith('L') ? 'L' : 'R';
      if (arma === B.lado && st.wind > 0.05 && !(st.swing >= 0)) { const w = clamp(st.wind, 0, 1) * 0.8; gE.lerp(v.h.set(0.24 * s, -0.17, 0.05), w); gW.lerp(v.h.set(0.44 * s, 0.05, 0.12), w); }
      if (suyo === B.lado && st.swing >= 0) {
        // (el golpe: de atrás y fuera, por delante, y acaba cruzado al otro lado)
        const u = clamp(st.swing, 0, 1), a = -1.2 + u * 2.6, g = st.golpe || '', alto = g.startsWith('High') ? 0.35 : g.startsWith('Low') ? -0.25 : 0.05;
        gE.set(Math.cos(a) * 0.2 * s, -0.2 + alto * 0.5, -0.12 - Math.sin(Math.max(0, a)) * 0.1);
        gW.set(Math.cos(a + 0.25) * 0.42 * s - u * 0.14 * s, -0.12 + alto, -0.16 - Math.sin(clamp(a + 0.9, 0, Math.PI)) * 0.36);
      }
    }
    if (cuerpo) { gE.lerp(v.cE, B.k); gW.lerp(v.cW, B.k); }
    // (rápido, para que el golpe se vea con su velocidad, pero sin temblar: el detector da 15 a 30 imágenes por segundo)
    const a = B.ini ? 1 - Math.exp(-dt / 0.035) : 1; B.ini = true;
    // (del cuerpo a la vista: inclinado hacia delante desde el hombro)
    gE.applyAxisAngle(v.ejeX, INCLINA).add(B.S); gW.applyAxisAngle(v.ejeX, INCLINA).add(B.S);
    B.E.lerp(gE, a); B.W.lerp(gW, a);
    // (los huesos con su largo de verdad: el codo y la muñeca a su distancia, por si el suavizado los ha acercado)
    B.E.sub(B.S).setLength(BRAZO).add(B.S); B.W.sub(B.E).setLength(ANTEBRAZO).add(B.E);
    this.pon(B.brazo, B.S, B.E); this.pon(B.ante, B.E, B.W);
    // (la mano que se va atrás, junto a la cara, no se ve: asomaría en una esquina, enorme, como una mancha)
    B.ante.visible = B.mano.visible = B.W.z < -0.08;
    // la mano: sigue al antebrazo, con la palma hacia donde diga el detector (o hacia delante)
    const dir = v.d.copy(B.W).sub(B.E).normalize();
    if (palma) B.X.lerp(v.X, 1 - Math.exp(-dt / 0.06)); else B.X.lerp(v.h.set(-1, 0.1, 0), 1 - Math.exp(-dt / 0.2));
    const x = v.x.copy(B.X).addScaledVector(dir, -B.X.dot(dir));
    if (x.lengthSq() < 1e-4) return;
    x.normalize(); const z = v.z.crossVectors(x, dir);
    v.m.makeBasis(x, dir, z); B.mano.quaternion.setFromRotationMatrix(v.m); B.mano.position.copy(B.W);
    // (los dedos se cierran un poco al golpear: la mano firme)
    const fuerte = C?.gesto?.k === (B.lado === 'R' ? 16 : 15) ? 0.5 : 0.22;
    for (const d of B.dedos) d.rotation.x += (fuerte - d.rotation.x) * Math.min(1, dt * 12);
  }
  // coloca un hueso (que crece hacia +y) de a hasta b
  pon(o, a, b) { const d = this.v.h.copy(b).sub(a), n = d.length(); if (n < 1e-5) return; o.position.copy(a); o.quaternion.setFromUnitVectors(this.v.up, d.divideScalar(n)); }
}
