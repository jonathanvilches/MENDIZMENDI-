// La presentación de los pelotaris con los focos, como en las finales de verdad: en el Navarra Arena se apagan las luces
// para recibir a los finalistas (primero sale el colorado y después el azul) y en el Bizkaia el frontón se queda en
// penumbra y dos haces de luz buscan a cada pelotari. Aquí: el frontón se oscurece, la grada enciende las linternas de
// los móviles, un haz busca al colorado por la cancha y se queda con él (su nombre abajo), otro al azul, y de golpe se
// encienden todas las luces con el aplauso. Sin luces nuevas en la escena (en el móvil rehacen todos los sombreadores):
// la oscuridad es la exposición de la imagen y los haces, conos y círculos que brillan por sí solos.
import { COURT } from './rules.js';

// (los tiempos: a oscuras en 0,6 s; el colorado, buscado hasta 2,3 y con su nombre hasta 3,6; el azul, de 3,0 a 4,7 y
// con su nombre hasta 5,9; las luces, de golpe a los 5,9; se acaba a los 7)
const DUR = 7, LUZ = 5.9, T0 = [0.6, 3.0], BUSCA = 1.7;
const sstep = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
// textura de un degradado: vertical para el cono (fuerte arriba, en el foco) o radial para el círculo del suelo
function grad(T, radial) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = radial ? g.createRadialGradient(32, 32, 0, 32, 32, 32) : g.createLinearGradient(0, 0, 0, 64);
  if (radial) { gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(0.55, 'rgba(255,244,220,.55)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); }
  else { gr.addColorStop(0, 'rgba(255,250,235,.95)'); gr.addColorStop(1, 'rgba(255,245,225,.18)'); }
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new T.CanvasTexture(c); if ('colorSpace' in t) t.colorSpace = T.SRGBColorSpace; return t;
}

export class Focos {
  /** court: el frontón; who: { rojo: {x, z}, azul: {x, z} } (en la cancha, getters vivos); exposure(v): la luz de la imagen
   *  (null, la de siempre); spots: los sitios del público (para las linternas). */
  constructor(T, court, o) {
    this.T = T; this.C = court; this.o = o; this.t = 0; this.done = false;
    const g = this.g = new T.Group(); g.name = 'presentacion'; court.group.add(g);
    const top = court.labrit ? 11.2 : court.hall ? 12.2 : COURT.FRONT_H + 2.5;
    this.src = [new T.Vector3(-2.5, top, COURT.L * 0.42), new T.Vector3(3.5, top, COURT.L * 0.62)];
    const cono = new T.MeshBasicMaterial({ map: grad(T, false), color: '#fff6e4', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false });
    const disco = new T.MeshBasicMaterial({ map: grad(T, true), color: '#fff6e4', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
    this.mats = [cono, disco];
    // (el cono, de punta en el origen y abierto hacia −y, de 1 m: se estira hasta el suelo)
    const cg = new T.CylinderGeometry(0.12, 1.25, 1, 28, 1, true).translate(0, -0.5, 0);
    this.beams = this.src.map(() => { const b = new T.Mesh(cg, cono.clone()); b.renderOrder = 8; b.frustumCulled = false; g.add(b);
      const p = new T.Mesh(new T.CircleGeometry(1.35, 32).rotateX(-Math.PI / 2), disco.clone()); p.position.y = 0.03; p.renderOrder = 7; g.add(p);
      return { b, p, at: new T.Vector3(), on: 0 }; });
    // las linternas de los móviles en la grada: puntos que se encienden y parpadean
    const S = (o.spots || []).filter((_, i) => i % 2 === 0).slice(0, 220);
    if (S.length) {
      const pos = new Float32Array(S.length * 3), col = new Float32Array(S.length * 3);
      S.forEach(([x, y, z], i) => { pos.set([x - 0.15, y + 1.15, z], i * 3); });
      const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pos, 3)); pg.setAttribute('color', new T.BufferAttribute(col, 3));
      this.ph = new T.Points(pg, new T.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
      this.ph.frustumCulled = false; this.phase = S.map(() => Math.random() * 6.28); this.phOn = S.map(() => Math.random() < 0.55); g.add(this.ph);
    }
    // lo que brilla solo (las luces del pabellón, los focos): apagado mientras dura
    this.apagar = []; court.group.traverse(m => { if (m.isMesh && /^luces/.test(m.name || '')) { this.apagar.push([m, m.visible]); m.visible = false; } });
    this.floodK = court._lk ?? 0; court.setLights?.(0);
  }
  // por dónde va el haz k a los t segundos: barre la cancha buscando y, al final, se queda en su pelotari
  target(k, t, P) {
    const t0 = T0[k], t1 = t0 + BUSCA, e = sstep(t0, t1, t);
    const sx = Math.sin(t * (2.1 + k)) * 3.6, sz = COURT.L * 0.5 + Math.cos(t * (1.4 + k * 0.7)) * 9;
    return [sx + (P.x - sx) * e, sz + (P.z - sz) * e, t > t1];
  }
  /** Un paso: devuelve true mientras dura. call(name) avisa del momento de cada uno ('rojo', 'azul', 'luz'). */
  step(dt, P, call) {
    if (this.done) return false;
    const t = this.t += dt, o = this.o;
    // la imagen: se apaga en medio segundo, a oscuras hasta que vuelve la luz de golpe y, al final, como estaba
    const dark = t < 0.6 ? t / 0.6 : t < LUZ ? 1 : Math.max(0, 1 - (t - LUZ) / 0.25);
    o.exposure?.(1.05 - dark * 0.92);
    ['rojo', 'azul'].forEach((side, k) => {
      const B = this.beams[k], [x, z, fijo] = this.target(k, t, P[side]);
      const want = t > T0[k] - 0.05 && t < LUZ + 0.05 ? 1 : 0; B.on += (want - B.on) * Math.min(1, dt * 6);
      B.at.set(x, 0, z); const s = this.src[k], d = this._d ||= new this.T.Vector3(), down = this._dn ||= new this.T.Vector3(0, -1, 0);
      d.subVectors(B.at, s); const L = d.length();
      B.b.position.copy(s); B.b.quaternion.setFromUnitVectors(down, d.normalize()); B.b.scale.set(1, L, 1);
      B.b.material.opacity = 0.22 * B.on; B.p.position.set(x, 0.03, z); B.p.material.opacity = 0.85 * B.on;
      if (fijo && !B.dicho) { B.dicho = true; call(side); }
    });
    if (this.ph) {
      const c = this.ph.geometry.attributes.color, a = Math.min(1, t / 0.8) * (t < LUZ ? 1 : Math.max(0, 1 - (t - LUZ) / 0.4));
      for (let i = 0; i < this.phase.length; i++) { const v = this.phOn[i] ? a * (0.55 + 0.45 * Math.sin(t * 3 + this.phase[i])) : 0; c.array[i * 3] = v; c.array[i * 3 + 1] = v * 0.97; c.array[i * 3 + 2] = v * 0.9; }
      c.needsUpdate = true;
    }
    if (t > LUZ && !this.luz) { this.luz = true; for (const [m, v] of this.apagar) m.visible = v; this.C.setLights?.(1); call('luz'); }
    if (t > DUR) { this.end(); return false; }
    return true;
  }
  // la cámara: desde lo alto del fondo, mirando a la cancha; se acerca a cada pelotari cuando su haz se queda con él
  cam(P) {
    const t = this.t, base = [[3.5, 8.5, COURT.L + 6], [0, 1.5, COURT.L * 0.45]], out = [[...base[0]], [...base[1]]];
    // (cada uno: la cámara llega cuando su haz se queda con él y se aparta antes de que busquen al otro)
    for (const [F, w] of [[P.rojo, sstep(T0[0] + BUSCA - 0.3, T0[0] + BUSCA + 0.3, t) * (1 - sstep(T0[1] - 0.2, T0[1] + 0.4, t))], [P.azul, sstep(T0[1] + BUSCA - 0.3, T0[1] + BUSCA + 0.3, t) * (1 - sstep(LUZ - 0.1, LUZ + 0.5, t))]]) {
      if (!w) continue;
      const cp = [F.x + 2.2, 2.6, F.z + 5.5], cl = [F.x, 1.3, F.z];
      for (let i = 0; i < 3; i++) { out[0][i] += (cp[i] - base[0][i]) * w; out[1][i] += (cl[i] - base[1][i]) * w; }
    }
    return out;
  }
  end() {
    if (this.done) return; this.done = true;
    this.o.exposure?.(null);
    for (const [m, v] of this.apagar) m.visible = v; this.C.setLights?.(this.floodK);
    this.g.parent?.remove(this.g);
    this.g.traverse(m => { m.geometry?.dispose(); if (m.material) { m.material.map?.dispose(); m.material.dispose(); } });
    for (const m of this.mats) { m.map?.dispose(); m.dispose(); }
  }
}
