// La pelota en casa en primera persona: la cámara en los ojos de tu pelotari y, delante, sus brazos y sus manos (las de
// tu pelotari de verdad: su camiseta, su piel y sus tacos), que hacen lo que hacen los tuyos.
//  - Los brazos: una copia de tu pelotari (SkeletonUtils.clone) con la cabeza y las piernas encogidas hasta no verse, y
//    sus huesos del hombro, el codo y la muñeca movidos con lo que ve la cámara del aparato (MediaPipe, camaraCuerpo.js).
//    La imagen es plana: la profundidad se saca de lo que mide cada hueso (un brazo estirado hacia la pantalla apenas se
//    ve largo en la imagen, así que va hacia delante) y, para saber si va hacia delante o hacia atrás, de lo que dice el
//    detector, muy suavizado. Si la cámara no te ve, la guardia y el golpe del pelotari. Si tu pelotari no tiene esqueleto
//    (no ha cargado su modelo), unos brazos hechos aquí con su camiseta, la piel y los tacos.
//  - La cámara, muy viva, porque el juego va deprisa: sigue a la pelota con la mirada (adelantándose a su vuelo), gira
//    rápido y sin temblar (un muelle amortiguado), se inclina al moverte de lado, se balancea al correr, se tuerce con el
//    cuerpo al armar y al golpear, da un golpe seco con cada pelotazo tuyo y se abre con la velocidad.
// Lo usa pelota/match.js (con la cámara, la vista en primera persona; se cambia en el menú del partido o con la V).
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const envuelve = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// medidas de una persona (m), para los brazos hechos aquí; con tu pelotari, las suyas
const HOMBROS = 0.38, BRAZO = 0.29, ANTEBRAZO = 0.265;
// dónde van los hombros respecto a los ojos (x a la derecha, y arriba, z hacia atrás: la cámara mira hacia -z). Algo más
// altos que los de verdad y con los brazos inclinados hacia delante (INCLINA), como en los juegos en primera persona: si
// no, las manos en guardia quedan por debajo de la imagen (de verdad, para vértelas hay que bajar la vista)
const HOMBRO_Y = -0.15, HOMBRO_Z = -0.02, INCLINA = 0.8;
// la mano, mientras está delante del cuerpo, nunca más abajo que esto (en la imagen: la mitad de lo que hay del centro al
// borde de abajo): así, en guardia, a la altura de la cintura, se sigue viendo, como en los juegos en primera persona
const BAJO = 0.5;
// los puntos de MediaPipe de cada brazo (sin espejo: el R de la pantalla es tu brazo derecho)
const PUNTOS = { R: { s: 12, e: 14, w: 16, i: 20, p: 18 }, L: { s: 11, e: 13, w: 15, i: 19, p: 17 } };
// los huesos de cada brazo de tu pelotari (esqueleto de Mixamo: mixamorig:RightArm…)
const HUESOS = { R: [/RightArm$/, /RightForeArm$/, /RightHand$/], L: [/LeftArm$/, /LeftForeArm$/, /LeftHand$/] };
// hacia dónde mira la palma de cada mano de tu pelotari, en los ejes de su hueso (en Mixamo, la mano crece hacia +y)
const PALMA = { R: [0, 0, -1], L: [0, 0, -1] };
const PIEL = '#eebc96', VENDA = '#f4f0e6';

export class PrimeraPersona {
  constructor(THREE, camera, { camiseta = '#2f56c8', avatar = null } = {}) {
    this.T = THREE; this.cam = camera; this.on = false;
    const T = THREE, V3 = () => new T.Vector3();
    this.group = new T.Group(); this.group.name = 'primera-persona'; this.group.visible = false;
    this.v = { cE: V3(), cW: V3(), gE: V3(), gW: V3(), h: V3(), X: V3(), x: V3(), z: V3(), d: V3(), p: V3(), c: V3(), w: V3(), up: new T.Vector3(0, 1, 0), ejeX: new T.Vector3(1, 0, 0), m: new T.Matrix4(), q: new T.Quaternion(), q2: new T.Quaternion(), e: new T.Euler(0, 0, 0, 'YXZ') };
    this.mats = [];
    this.brazos = {};
    for (const lado of ['R', 'L']) this.brazos[lado] = { lado, S: new T.Vector3((lado === 'R' ? 1 : -1) * HOMBROS / 2, HOMBRO_Y, HOMBRO_Z), E: V3(), W: V3(), X: new T.Vector3(-1, 0, 0), k: 0, ini: false, lenA: BRAZO, lenF: ANTEBRAZO };
    // los brazos: los de tu pelotari si se puede; si no, los hechos aquí
    this.suyo = false;
    try { this.suyo = !!avatar && this.montaSuyo(avatar); } catch (e) { console.warn('primera persona: el pelotari', e); this.suyo = false; }
    if (!this.suyo) this.montaPropios(camiseta);
    // la cámara: hacia dónde mira (con su muelle), la inclinación, el campo de visión y los golpes
    this.c = { ini: false, pos: V3(), yaw: 0, pitch: 0, vy: 0, vp: 0, roll: 0, vr: 0, fov: 64, vf: 0, kick: 0, sac: 0, paso: 0, giro: 0, t: 0 };
  }

  // ---------- los brazos de tu pelotari ----------
  montaSuyo(avatar) {
    const T = this.T;
    let fuente = null; avatar.traverse(o => { if (!fuente && o.isSkinnedMesh) fuente = o; });
    if (!fuente) return false;
    let raiz = fuente; while (raiz.parent && raiz.parent !== avatar) raiz = raiz.parent;
    // (al copiar, three copia también los datos propios de cada pieza, y el pelotari del juego guarda en ellos su
    // animación, que se apunta a sí misma: se apartan mientras se copia y se devuelven)
    const datos = []; raiz.traverse(o => { datos.push([o, o.userData]); o.userData = {}; });
    let copia; try { copia = SkeletonUtils.clone(raiz); } finally { for (const [o, d] of datos) o.userData = d; }
    copia.visible = true;
    const huesos = [], pieles = [];
    copia.traverse(o => { if (o.isBone) huesos.push(o); if (o.isSkinnedMesh) pieles.push(o); if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false; o.visible = true; } });
    const busca = (re) => huesos.find(b => re.test(b.name));
    const B = {};
    for (const lado of ['R', 'L']) { const [a, f, h] = HUESOS[lado].map(busca); if (!a || !f || !h) return false; B[lado] = { a, f, h }; }
    // (la postura de partida es la de tu pelotari al copiarlo: de pie, esperando; el resto del cuerpo se queda así)
    // la cabeza y las piernas, encogidas hasta no verse (con lo que lleven encima: el pelo, la txapela)
    for (const b of huesos) if (/Head$/.test(b.name) || /UpLeg$/.test(b.name)) b.scale.setScalar(0.001);
    // colocada en la vista: de cara hacia donde miras (-z), con los hombros donde van
    // (algo más pequeño que de verdad: las manos de los pelotaris, con los tacos, son grandes y delante de los ojos lo
    // tapaban todo)
    const soporte = this.soporte = new T.Group(); soporte.rotation.y = Math.PI; soporte.scale.setScalar(0.76); soporte.add(copia);
    this.group.position.set(0, 0, 0); this.group.quaternion.identity(); this.group.scale.set(1, 1, 1);
    this.group.add(soporte); this.group.updateMatrixWorld(true);
    const sR = B.R.a.getWorldPosition(new T.Vector3()), sL = B.L.a.getWorldPosition(new T.Vector3()), mid = sR.clone().add(sL).multiplyScalar(0.5);
    soporte.position.set(-mid.x, HOMBRO_Y - mid.y, HOMBRO_Z - mid.z); this.group.updateMatrixWorld(true);
    for (const lado of ['R', 'L']) {
      const A = this.brazos[lado], H = B[lado];
      A.hueso = H; A.S.copy(H.a.getWorldPosition(new T.Vector3()));
      const e = H.f.getWorldPosition(new T.Vector3()), w = H.h.getWorldPosition(new T.Vector3());
      A.lenA = A.S.distanceTo(e); A.lenF = e.distanceTo(w);
      for (const b of [H.a, H.f, H.h]) b.userData.q0 = b.quaternion.clone();
      A.palma = new T.Vector3(...PALMA[lado]);
    }
    this.copia = copia;
    return true;
  }
  // un hueso apuntando a donde toca: desde su postura de partida, el giro más corto que lleva a su hijo hasta el objetivo
  apunta(hueso, hijo, objetivo) {
    const T = this.T, a = this.ap ||= { p: new T.Vector3(), c: new T.Vector3(), o: new T.Vector3(), q: new T.Quaternion(), q2: new T.Quaternion() };
    a.o.copy(objetivo);
    hueso.quaternion.copy(hueso.userData.q0); hueso.updateMatrixWorld(true);
    const p = hueso.getWorldPosition(a.p), cur = hijo.getWorldPosition(a.c).sub(p).normalize(), quiero = a.o.sub(p).normalize();
    a.q.setFromUnitVectors(cur, quiero).multiply(hueso.getWorldQuaternion(a.q2));
    hueso.quaternion.copy(hueso.parent.getWorldQuaternion(a.q2).invert().multiply(a.q)); hueso.updateMatrixWorld(true);
  }
  /** dónde está la mano de un lado (R, L), en el mundo: para poner ahí la pelota al sacar */
  mano(lado, out) {
    const B = this.brazos[lado];
    if (B.W.z > -0.06 || (this.c.vis || 0) < 0.6) return null;   // (la mano atrás, junto a la cara, no se ve: la pelota, donde la ponga el juego)
    if (this.suyo) { B.hueso.h.getWorldPosition(out); return out.add(this.v.h.copy(B.W).sub(B.E).normalize().transformDirection(this.group.matrixWorld).multiplyScalar(B.lenF * 0.45)); }
    return this.group.localToWorld(out.copy(B.W).add(this.v.h.copy(B.W).sub(B.E).setLength(0.06)));
  }

  // ---------- los brazos hechos aquí (si tu pelotari no tiene esqueleto) ----------
  montaPropios(camiseta) {
    const T = this.T, mat = (color, r = 0.72) => new T.MeshStandardMaterial({ color, roughness: r, metalness: 0 });
    this.mats = [mat(PIEL, 0.6), mat(camiseta, 0.8), mat(VENDA, 0.85)];
    const [mPiel, mCam, mVenda] = this.mats;
    const hueso = (r0, r1, len, bulto = 0) => {
      const g = new T.CapsuleGeometry(r0, len, 6, 14), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = clamp((y + len / 2) / len, 0, 1), f = (r0 + (r1 - r0) * t + bulto * Math.sin(Math.PI * clamp(t * 1.3, 0, 1))) / r0; p.setXYZ(i, p.getX(i) * f, y + len / 2, p.getZ(i) * f); }
      g.computeVertexNormals(); return g;
    };
    const malla = (geo, m) => { const o = new T.Mesh(geo, m); o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; return o; };
    for (const lado of ['R', 'L']) {
      const s = lado === 'R' ? 1 : -1, B = this.brazos[lado];
      B.brazo = new T.Group(); B.brazo.add(malla(hueso(0.05, 0.043, BRAZO, 0.006), mPiel));
      B.brazo.add(malla(new T.CylinderGeometry(0.058, 0.062, 0.13, 18, 1, false).translate(0, 0.05, 0), mCam), malla(new T.TorusGeometry(0.061, 0.005, 6, 18).rotateX(Math.PI / 2).translate(0, 0.114, 0), mCam));
      B.ante = new T.Group(); B.ante.add(malla(hueso(0.044, 0.031, ANTEBRAZO, 0.006), mPiel));
      B.mano = new T.Group();
      const palma = malla(new T.BoxGeometry(0.082, 0.088, 0.03, 2, 2, 1), mVenda); palma.position.set(0, 0.05, 0); B.mano.add(palma);
      const vuelta = malla(new T.TorusGeometry(0.03, 0.008, 6, 16).rotateX(Math.PI / 2), mVenda); vuelta.scale.set(1, 1, 0.8); vuelta.position.y = -0.004; B.mano.add(vuelta);
      [[-0.03, 0.05, 0.016], [-0.01, 0.056, 0.017], [0.01, 0.054, 0.017], [0.029, 0.045, 0.015]].forEach(([x, len, r]) => {
        const d = new T.Group(); d.position.set(-x * s, 0.094, 0.002);
        d.add(malla(new T.CapsuleGeometry(r * 0.72, len, 4, 8).translate(0, len / 2, 0), mVenda));
        const yema = malla(new T.SphereGeometry(r * 0.7, 8, 6), mPiel); yema.position.y = len + r * 0.25; d.add(yema);
        d.rotation.x = 0.22; d.rotation.z = x * s * 0.6; B.mano.add(d);
      });
      const pulgar = new T.Group(); pulgar.position.set(0.043 * s, 0.03, 0.012); pulgar.add(malla(new T.CapsuleGeometry(0.012, 0.046, 4, 8).translate(0, 0.023, 0), mVenda)); pulgar.rotation.set(0.55, 0, -0.45 * s); B.mano.add(pulgar);
      B.mano.scale.setScalar(1.15);
      this.group.add(B.brazo, B.ante, B.mano);
    }
  }

  enciende(scene) {
    if (!this.group.parent && scene) scene.add(this.group);
    this.on = true; this.group.visible = false; this.c.ini = false; this.c.vis = 0; this.c.ver = 0;
    this.near0 = this.cam.near; this.cam.near = 0.06; this.cam.updateProjectionMatrix();
  }
  apaga() {
    this.on = false; this.group.visible = false;
    if (this.near0) { this.cam.near = this.near0; this.cam.updateProjectionMatrix(); }
  }
  dispose() {
    this.apaga(); this.group.parent?.remove(this.group);
    // (la copia de tu pelotari comparte geometría y material con el de verdad: no se tiran; los brazos hechos aquí, sí)
    if (!this.suyo) this.group.traverse(o => o.geometry?.dispose());
    for (const m of this.mats) m.dispose();
  }
  /** un golpe tuyo: la cámara da un golpe seco (f, de 0 a 1, la fuerza) */
  golpe(f = 0.6) { const c = this.c; c.kick = Math.max(c.kick, clamp(f, 0.25, 1)); c.sac = Math.max(c.sac, 0.05 + f * 0.09); }
  /** algo que suena cerca (la pelota en la pared, el golpe del rival): un temblor pequeño */
  impacto(f = 0.3) { this.c.sac = Math.max(this.c.sac, clamp(f, 0, 1) * 0.05); }

  /** Cada imagen: ojo (dónde están tus ojos, en el mundo), mira (adónde mirar), vel (lo deprisa que te mueves, m/s), lado
   *  (lo que te mueves de lado, -1 a 1), fov (el de base), cuerpo (camaraCuerpo.js o null) y st (el estado de tu pelotari) */
  update(dt, { ojo, mira, vel = 0, lado = 0, fov = 64, cuerpo, st, saca = false }) {
    dt = Math.min(dt, 0.05);
    const c = this.c, cam = this.cam, v = this.v, T = this.T;
    // adónde mira: un muelle amortiguado (rápido y sin pasarse ni temblar)
    const d = v.d.copy(mira).sub(ojo); const n = d.length() || 1; d.divideScalar(n);
    const yawT = Math.atan2(-d.x, -d.z), pitchT = Math.asin(clamp(d.y, -0.95, 0.95));
    if (!c.ini) { c.yaw = yawT; c.pitch = pitchT; c.vy = c.vp = 0; c.pos.copy(ojo); c.fov = fov; c.roll = 0; c.ini = true; }
    const w = 15, dy = envuelve(yawT - c.yaw), dpch = pitchT - c.pitch;
    // (con tope de velocidad: rápido como una cabeza que sigue la pelota, sin latigazos cuando pasa pegada a ti)
    c.vy = clamp(c.vy + (w * w * dy - 2 * w * c.vy) * dt, -6, 6); c.yaw += c.vy * dt;
    c.vp = clamp(c.vp + (w * w * dpch - 2 * w * c.vp) * dt, -5, 5); c.pitch = clamp(c.pitch + c.vp * dt, -0.45, 0.4);
    // el cuerpo se tuerce al armar (hacia el brazo que arma) y, al golpear, el giro se suelta hacia el otro lado
    let giroT = 0;
    if (st) {
      const arma = (st.arma || 'Hit').endsWith('L') ? -1 : 1, golpeL = (st.golpe || 'Hit').endsWith('L') ? -1 : 1;
      if (st.swing >= 0) { const u = clamp(st.swing, 0, 1); giroT = golpeL * (-0.13 * (1 - u) + 0.1 * Math.sin(u * Math.PI)); }
      else giroT = -arma * 0.11 * clamp(st.wind || 0, 0, 1);
    }
    c.giro += (giroT - c.giro) * (1 - Math.exp(-dt * 12));
    // inclinarse al ir de lado; y el golpe seco del pelotazo, que se va enseguida
    const rollT = clamp(-lado * 0.04, -0.045, 0.045), wr = 9;
    c.vr += (wr * wr * (rollT - c.roll) - 2 * wr * c.vr) * dt; c.roll += c.vr * dt;
    c.kick = Math.max(0, c.kick - dt * 3.2); c.sac = Math.max(0, c.sac - dt * 0.9);
    // al correr, el paso: arriba y abajo, y un poco de lado
    const k = clamp(vel / 6, 0, 1); c.paso += dt * (4 + vel * 1.6); c.t += dt;
    const bob = Math.abs(Math.sin(c.paso)) * 0.025 * k - 0.012 * k, sway = Math.sin(c.paso) * 0.01 * k;
    c.pos.lerp(ojo, 1 - Math.exp(-dt / 0.025));
    // (el temblor: ruido suave, no a saltos de imagen en imagen)
    const sx = (Math.sin(c.t * 61) + Math.sin(c.t * 37.3)) * 0.5 * c.sac, sy = (Math.sin(c.t * 53.1 + 1) + Math.sin(c.t * 29.7)) * 0.5 * c.sac;
    const kk = c.kick * c.kick;
    v.e.set(c.pitch + kk * 0.05 + sy * 0.25, c.yaw + c.giro + sx * 0.25, c.roll + sx * 0.4, 'YXZ');
    cam.quaternion.setFromEuler(v.e);
    cam.position.copy(c.pos);
    v.h.set(sway + sx * 0.04, bob + sy * 0.04, kk * 0.05).applyQuaternion(cam.quaternion); cam.position.add(v.h);
    // el campo de visión: más abierto cuanto más deprisa; se cierra de golpe con el pelotazo
    const fovT = fov + k * 4 - kk * 4, wf = 12;
    c.vf += (wf * wf * (fovT - c.fov) - 2 * wf * c.vf) * dt; c.fov += c.vf * dt;
    if (Math.abs(cam.fov - c.fov) > 0.01) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();
    // los brazos van con la cámara (sin el temblor ni el paso: así no bailan delante de los ojos)
    // las manos, solo en el golpe: suben desde abajo al empezar (tu gesto ante la cámara o el golpe de tu pelotari) y
    // se van al acabar; y al sacar, mientras tienes la pelota en la mano. El resto del tiempo, la cancha despejada
    const pegando = (st && st.swing >= 0) || !!cuerpo?.gesto || (cuerpo && (cuerpo.tPrev || 0) - (cuerpo.ultGolpe ?? -9) < 0.5);
    c.ver = pegando || saca ? 0.35 : Math.max(0, (c.ver || 0) - dt);
    const verT = c.ver > 0 ? 1 : 0; c.vis = (c.vis || 0) + (verT - (c.vis || 0)) * (1 - Math.exp(-dt * (verT ? 20 : 8)));
    const baja = 1 - c.vis * c.vis * (3 - 2 * c.vis);
    this.group.visible = c.vis > 0.02;
    this.group.position.copy(c.pos).add(v.h.set(0, -0.42 * baja, 0.06 * baja).applyQuaternion(cam.quaternion)); this.group.quaternion.copy(cam.quaternion);
    this.group.updateMatrixWorld(true);
    const L = cuerpo?.visto ? cuerpo.lms : null, sw = cuerpo?.sw || 0;
    for (const s of ['R', 'L']) this.brazo(this.brazos[s], dt, L, sw, cuerpo, st);
  }

  // un brazo: de tu cuerpo si se ve; si no, la guardia del pelotari (y su golpe)
  brazo(B, dt, L, sw, C, st) {
    const v = this.v, s = B.lado === 'R' ? 1 : -1, P = PUNTOS[B.lado], LA = B.lenA, LF = B.lenF;
    let cuerpo = false, palma = false;
    const vis = (i) => (L && L[i] ? L[i].visibility ?? 1 : 0);
    if (L && sw > 8 && vis(P.s) > 0.5 && vis(P.e) > 0.3 && vis(P.w) > 0.25) {
      const vw = C.vw || 640, vh = C.vh || 480, m = HOMBROS / sw;
      const px = (i) => [(1 - L[i].x) * vw, L[i].y * vh, (L[i].z || 0) * vw];
      // (un hueso de la imagen a la vista: lo de lado y arriba, tal cual; lo de delante, lo que le falta para medir lo que
      // mide, hacia delante salvo que el detector diga claramente que va hacia atrás. En proporción a tu brazo: los de tu
      // pelotari pueden ser más cortos que los tuyos)
      const lift = (a, b, len, real, out) => {
        let dx = (b[0] - a[0]) * m * len / real, dy = -(b[1] - a[1]) * m * len / real; const dzr = (b[2] - a[2]) * m, pl = Math.hypot(dx, dy);
        if (pl > len) { dx *= len / pl; dy *= len / pl; }
        const resto = Math.sqrt(Math.max(0, len * len - dx * dx - dy * dy)), delante = Math.tanh((0.04 - dzr) / 0.07);
        return out.set(dx, dy, -resto * delante);
      };
      const S = px(P.s), e = px(P.e), w = px(P.w);
      v.cE.copy(lift(S, e, LA, BRAZO, v.h));
      v.cW.copy(v.cE).add(lift(e, w, LF, ANTEBRAZO, v.h));
      cuerpo = true;
      if (vis(P.i) > 0.4 && vis(P.p) > 0.4) { const a = px(P.i), b = px(P.p); v.X.set((a[0] - b[0]) * s, -(a[1] - b[1]) * s, (a[2] - b[2]) * s * 0.3); palma = v.X.lengthSq() > 1; if (palma) v.X.normalize().applyAxisAngle(v.ejeX, INCLINA); }
      B.k = Math.min(1, B.k + dt * 5);
    } else B.k = Math.max(0, B.k - dt * 3);
    // la guardia del pelotari (desde el hombro, como está el cuerpo): los codos abajo, las manos delante; al armar, la mano
    // atrás y arriba; al golpear, el brazo de ese lado cruza por delante
    const gE = v.gE.set(0.08 * s, -0.93, -0.36).normalize().multiplyScalar(LA);
    const gW = v.gW.set(-0.2 * s, 0.32, -0.93).normalize().multiplyScalar(LF).add(gE);
    if (st && B.k < 1) {
      const suyo = (st.golpe || 'Hit').endsWith('L') ? 'L' : 'R', arma = (st.arma || 'Hit').endsWith('L') ? 'L' : 'R', esc = (LA + LF) / (BRAZO + ANTEBRAZO);
      if (arma === B.lado && st.wind > 0.05 && !(st.swing >= 0)) { const w = clamp(st.wind, 0, 1) * 0.8; gE.lerp(v.h.set(0.24 * s, -0.17, 0.05).multiplyScalar(esc), w); gW.lerp(v.h.set(0.44 * s, 0.05, 0.12).multiplyScalar(esc), w); }
      if (suyo === B.lado && st.swing >= 0) {
        const u = clamp(st.swing, 0, 1), a = -1.2 + u * 2.6, g = st.golpe || '', alto = g.startsWith('High') ? 0.35 : g.startsWith('Low') ? -0.25 : 0.05;
        gE.set(Math.cos(a) * 0.2 * s, -0.2 + alto * 0.5, -0.12 - Math.sin(Math.max(0, a)) * 0.1).multiplyScalar(esc);
        gW.set(Math.cos(a + 0.25) * 0.42 * s - u * 0.14 * s, -0.12 + alto, -0.16 - Math.sin(clamp(a + 0.9, 0, Math.PI)) * 0.36).multiplyScalar(esc);
      }
    }
    if (cuerpo) { gE.lerp(v.cE, B.k); gW.lerp(v.cW, B.k); }
    // (del cuerpo a la vista: inclinado hacia delante desde el hombro)
    gE.applyAxisAngle(v.ejeX, INCLINA).add(B.S); gW.applyAxisAngle(v.ejeX, INCLINA).add(B.S);
    // (la mano delante del cuerpo, a la vista: si queda más abajo, se sube; el codo, donde le toque para llegar)
    if (gW.z < -0.12) gW.y = Math.max(gW.y, -BAJO * -gW.z);
    this.ik(B.S, gE, gW, LA, LF);
    // (rápido, para que el golpe se vea con su velocidad, pero sin temblar: el detector da 15 a 30 imágenes por segundo)
    const a = B.ini ? 1 - Math.exp(-dt / 0.035) : 1; B.ini = true;
    B.E.lerp(gE, a); B.W.lerp(gW, a);
    this.ik(B.S, B.E, B.W, LA, LF);
    if (!palma) B.X.lerp(v.h.set(-1, 0.1, 0), 1 - Math.exp(-dt / 0.2)); else B.X.lerp(v.X, 1 - Math.exp(-dt / 0.06));
    if (this.suyo) {
      // los huesos de tu pelotari: el brazo hacia el codo y el antebrazo hacia la muñeca (todo en el mundo)
      const H = B.hueso, G = this.group;
      this.apunta(H.a, H.f, G.localToWorld(v.p.copy(B.E)));
      this.apunta(H.f, H.h, G.localToWorld(v.p.copy(B.W)));
      // y la mano, hacia donde mire la palma: se gira el antebrazo sobre sí mismo (la palma de la postura de partida mira
      // hacia abajo; se busca que mire hacia delante, o hacia donde diga el detector)
      const eje = v.d.copy(B.W).sub(B.E).normalize().transformDirection(G.matrixWorld);
      const quiero = v.x.copy(B.X).cross(v.c.copy(B.W).sub(B.E).normalize()).transformDirection(G.matrixWorld);
      const ahora = v.z.copy(B.palma).applyQuaternion(H.h.getWorldQuaternion(v.q2));
      const pr = (u) => u.addScaledVector(eje, -u.dot(eje));
      pr(quiero); pr(ahora);
      if (quiero.lengthSq() > 1e-4 && ahora.lengthSq() > 1e-4) {
        quiero.normalize(); ahora.normalize();
        const ang = Math.atan2(v.w.copy(ahora).cross(quiero).dot(eje), ahora.dot(quiero));
        v.q.setFromAxisAngle(eje, ang).multiply(H.f.getWorldQuaternion(v.q2));
        H.f.quaternion.copy(H.f.parent.getWorldQuaternion(v.q2).invert().multiply(v.q)); H.f.updateMatrixWorld(true);
      }
      // (la mano que se va atrás, junto a la cara, no se ve: asomaría en una esquina, enorme)
      H.h.scale.setScalar(B.W.z < -0.06 ? 1 : 0.001);
      return;
    }
    // los brazos hechos aquí
    this.pon(B.brazo, B.S, B.E); this.pon(B.ante, B.E, B.W);
    B.ante.visible = B.mano.visible = B.W.z < -0.08;
    const dir = v.d.copy(B.W).sub(B.E).normalize(), x = v.x.copy(B.X).addScaledVector(dir, -B.X.dot(dir));
    if (x.lengthSq() < 1e-4) return;
    x.normalize(); const z = v.z.crossVectors(x, dir);
    v.m.makeBasis(x, dir, z); B.mano.quaternion.setFromRotationMatrix(v.m); B.mano.position.copy(B.W);
  }
  // dos huesos (hombro, codo, muñeca) con su largo: la muñeca donde se pueda llegar y el codo hacia donde ya iba
  ik(S, E, W, LA, LF) {
    const v = this.v, d = v.c.copy(W).sub(S), n = clamp(d.length(), Math.abs(LA - LF) + 0.01, LA + LF - 0.002);
    d.normalize(); W.copy(S).addScaledVector(d, n);
    const a = (LA * LA - LF * LF + n * n) / (2 * n), h = Math.sqrt(Math.max(0, LA * LA - a * a));
    const polo = v.p.copy(E).sub(S); polo.addScaledVector(d, -polo.dot(d));
    if (polo.lengthSq() < 1e-6) polo.set(0, -1, 0.3).addScaledVector(d, -d.y);
    polo.normalize(); E.copy(S).addScaledVector(d, a).addScaledVector(polo, h);
  }
  pon(o, a, b) { const d = this.v.h.copy(b).sub(a), n = d.length(); if (n < 1e-5) return; o.position.copy(a); o.quaternion.setFromUnitVectors(this.v.up, d.divideScalar(n)); }
}
