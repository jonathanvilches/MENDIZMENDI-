// Física del balón (sin gráficos): gravedad, resistencia del aire ∝ v², efecto Magnus, botes con restitución y
// rozamiento, rodadura, postes y larguero (esfera contra cilindro), red que retiene el balón por dentro y lo para por
// fuera, y la valla alrededor del campo. Cada paso se divide en tramos de 5 cm como mucho (colisión continua: a
// 30 m/s el balón no atraviesa un poste ni la red).
import { FIELD as F, PHYS as K } from './rules.js';

const R = K.R;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Ball {
  constructor() {
    this.p = { x: 0, y: R, z: 0 }; this.v = { x: 0, y: 0, z: 0 }; this.w = { x: 0, y: 0, z: 0 };
    this.prev = { x: 0, y: R, z: 0 }; this.held = null;
  }
  set(x, z, y = R) { Object.assign(this.p, { x, y, z }); Object.assign(this.prev, this.p); this.stop(); }
  stop() { Object.assign(this.v, { x: 0, y: 0, z: 0 }); Object.assign(this.w, { x: 0, y: 0, z: 0 }); }
  kick(vx, vy, vz, spin = 0) { Object.assign(this.v, { x: vx, y: vy, z: vz }); Object.assign(this.w, { x: 0, y: spin, z: 0 }); }
  get speed() { return Math.hypot(this.v.x, this.v.y, this.v.z); }
  get hspeed() { return Math.hypot(this.v.x, this.v.z); }
  get grounded() { return this.p.y <= R + 0.02 && Math.abs(this.v.y) < 0.3; }

  /** Un paso de h segundos; los golpes (poste, larguero, red, valla, bote) se añaden a ev. */
  step(h, ev = []) {
    Object.assign(this.prev, this.p);
    if (this.held) return ev;   // en las manos del portero: lo mueve el juego
    const n = Math.max(1, Math.ceil(this.speed * h / 0.05)), dt = h / n;
    for (let i = 0; i < n; i++) this.sub(dt, ev);
    return ev;
  }
  sub(dt, ev) {
    const p = this.p, v = this.v, w = this.w, ox = p.x, oy = p.y, oz = p.z;
    if (p.y > R + 1e-3 || v.y > 0.01) {
      // en el aire: gravedad, aire y Magnus k·(ω × v), limitado a 6 m/s²
      const s = Math.hypot(v.x, v.y, v.z);
      let mx = K.magnus * (w.y * v.z - w.z * v.y), my = K.magnus * (w.z * v.x - w.x * v.z), mz = K.magnus * (w.x * v.y - w.y * v.x);
      const ml = Math.hypot(mx, my, mz); if (ml > K.magnusMax) { const k = K.magnusMax / ml; mx *= k; my *= k; mz *= k; }
      v.x += (-K.drag * s * v.x + mx) * dt; v.y += (-K.g - K.drag * s * v.y + my) * dt; v.z += (-K.drag * s * v.z + mz) * dt;
      const wd = Math.exp(-0.25 * dt); w.x *= wd; w.y *= wd; w.z *= wd;
    } else {
      // rodando: deceleración de 1,5 m/s² más el aire; el efecto se pierde enseguida contra el césped
      const s = Math.hypot(v.x, v.z);
      if (s > 0) { const ns = Math.max(0, s - (K.roll + K.drag * s * s) * dt); v.x *= ns / s; v.z *= ns / s; }
      v.y = 0; p.y = R; const wd = Math.exp(-5 * dt); w.x *= wd; w.y *= wd; w.z *= wd;
    }
    p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;
    // bote: restitución 0,55 y rozamiento tangencial 0,85
    if (p.y < R) {
      p.y = R;
      if (v.y < -0.9) { ev.push({ t: 'bounce', s: -v.y }); v.y = -v.y * K.rest; v.x *= K.tan; v.z *= K.tan; } else v.y = 0;
    }
    if (Math.abs(p.x) > F.HL - 0.8 || Math.abs(ox) > F.HL - 0.8) for (const s of [-1, 1]) this.goal(s, ox, oy, oz, ev);
    // vallas de publicidad alrededor del campo, a 5 m de las líneas
    const BX = F.HL + F.margin - R, BZ = F.HW + F.margin - R;
    if (Math.abs(p.x) > BX) { p.x = Math.sign(p.x) * BX; if (v.x * p.x > 0) { ev.push({ t: 'board', s: Math.abs(v.x) }); v.x = -v.x * K.board; v.z *= 0.8; } }
    if (Math.abs(p.z) > BZ) { p.z = Math.sign(p.z) * BZ; if (v.z * p.z > 0) { ev.push({ t: 'board', s: Math.abs(v.z) }); v.z = -v.z * K.board; v.x *= 0.8; } }
  }
  // portería del lado s (−1 o 1): postes, larguero y red
  goal(s, ox, oy, oz, ev) {
    const p = this.p, v = this.v, gx = s * F.HL, hw = F.goalW / 2, pr = F.postR, H = F.goalH, D = F.goalD;
    for (const pz of [-hw - pr, hw + pr]) this.capsule(gx, 0, pz, gx, H + pr, pz, pr, ev, 'post');
    this.capsule(gx, H + pr, -hw - pr, gx, H + pr, hw + pr, pr, ev, 'bar');
    // red: dentro de la portería (detrás de la línea, entre los postes y bajo el larguero) absorbe el 85 % y retiene el
    // balón; por fuera (lateral, techo o fondo) lo para y lo devuelve: un balón que entra por fuera de la red no es gol
    const back = gx + s * D, depthO = s * (ox - gx), depth = s * (p.x - gx);
    const absorb = () => { const k = 1 - K.net; v.x *= k; v.y *= k; v.z *= k; };
    // fondo
    if (Math.abs(p.z) < hw + R && p.y < H + R) {
      if (depthO < D && depth > D - R && Math.abs(oz) < hw + 0.02 && oy < H + 0.02) { p.x = back - s * R; absorb(); if (v.x * s > 0) v.x = 0; ev.push({ t: 'net', s: 1, side: s }); }
      else if (depthO >= D && depth < D + R) { p.x = back + s * R; v.x = -v.x * 0.25; v.y *= 0.6; v.z *= 0.6; ev.push({ t: 'netOut', side: s }); }
    }
    // laterales
    if (depth > 0 && depth < D + R && p.y < H + R) for (const sz of [-1, 1]) {
      const zo = sz * oz, zn = sz * p.z;
      if (zo < hw && zn > hw - R && depthO > -R) { p.z = sz * (hw - R); absorb(); ev.push({ t: 'net', s: 0.6, side: s }); }
      else if (zo >= hw && zn < hw + R) { p.z = sz * (hw + R); v.z = -v.z * 0.25; v.x *= 0.6; ev.push({ t: 'netOut', side: s }); }
    }
    // techo
    if (depth > 0 && depth < D + R && Math.abs(p.z) < hw + R) {
      if (oy < H && p.y > H - R && depthO > -R) { p.y = H - R; absorb(); if (v.y > 0) v.y = 0; ev.push({ t: 'net', s: 0.6, side: s }); }
      else if (oy >= H && p.y < H + R) { p.y = H + R; v.y = Math.abs(v.y) * 0.3; v.x *= 0.7; v.z *= 0.7; ev.push({ t: 'netOut', side: s }); }
    }
  }
  // esfera contra cilindro (poste o larguero, del segmento a→b y radio r) con restitución 0,7
  capsule(ax, ay, az, bx, by, bz, r, ev, kind) {
    const p = this.p, v = this.v, ex = bx - ax, ey = by - ay, ez = bz - az, l2 = ex * ex + ey * ey + ez * ez;
    const t = clamp(((p.x - ax) * ex + (p.y - ay) * ey + (p.z - az) * ez) / l2, 0, 1);
    const dx = p.x - (ax + ex * t), dy = p.y - (ay + ey * t), dz = p.z - (az + ez * t), d = Math.hypot(dx, dy, dz), m = R + r;
    if (d >= m || d < 1e-6) return;
    const nx = dx / d, ny = dy / d, nz = dz / d;
    p.x += nx * (m - d); p.y += ny * (m - d); p.z += nz * (m - d);
    const vn = v.x * nx + v.y * ny + v.z * nz;
    if (vn < 0) {
      v.x -= (1 + K.postRest) * vn * nx; v.y -= (1 + K.postRest) * vn * ny; v.z -= (1 + K.postRest) * vn * nz;
      if (-vn > 1.5) ev.push({ t: kind, s: -vn });
    }
  }
}

/** Posición del balón dentro de t segundos rodando por el suelo (para las intercepciones de la IA). */
export function rollAhead(b, t) {
  if (!b.grounded) {
    // en el aire: vuelo sin aire hasta que cae, luego rueda
    const tf = Math.max(0, (b.v.y + Math.sqrt(Math.max(0, b.v.y * b.v.y + 2 * K.g * (b.p.y - R)))) / K.g);
    if (t <= tf) return { x: b.p.x + b.v.x * t, z: b.p.z + b.v.z * t, y: b.p.y + b.v.y * t - 0.5 * K.g * t * t };
    const g = { x: b.p.x + b.v.x * tf, z: b.p.z + b.v.z * tf }, s = b.hspeed * K.tan;
    return roll(g.x, g.z, b.v.x, b.v.z, s, t - tf);
  }
  return roll(b.p.x, b.p.z, b.v.x, b.v.z, b.hspeed, t);
}
function roll(x, z, vx, vz, s, t) {
  if (s < 1e-3) return { x, z, y: R };
  const d = K.roll + 0.6, ts = Math.min(t, s / d), dist = s * ts - 0.5 * d * ts * ts, ux = vx / Math.hypot(vx, vz), uz = vz / Math.hypot(vx, vz);
  return { x: x + ux * dist, z: z + uz * dist, y: R };
}
