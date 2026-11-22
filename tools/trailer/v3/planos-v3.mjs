// Los planos del tráiler v3 rodados con el motor del juego tal y como está hoy (22 de noviembre de 2026; el autor: «Pero
// aprovecha imágenes del juego. Reales como el zelda»): Otsagabia con sus vecinos de Meshy, su río y su bosque, los demás
// pueblos y la pelota. Los rueda tools/trailer/rodar.mjs con PLANOS=./v3/planos-v3.mjs (mismo formato que planos.mjs:
// el pueblo, la hora, el tiempo, cuánto dura y lo que hace la cámara) y los usa montaje-v3.js como 'p:<plano>'.
// Uso: PLANOS=./v3/planos-v3.mjs node tools/trailer/rodar.mjs <plano[,plano…]> <carpeta> [prueba]
import { PLANOS as P1 } from '../planos.mjs';
import { AYUDA as AYUDA0 } from '../planos-inversores.mjs';
// (las ayudas de planos-inversores y dos más; van a la página como texto, así que se componen como texto: anda, el
// explorador andando hacia la cámara; y en frente, enc: el vecino a un lado del encuadre —metros, + a la izquierda, − a
// la derecha— para dejar sitio a su carta en el otro lado)
export const AYUDA = eval(`() => {
  (${AYUDA0.toString()})();
  const f0 = window.__ay.frente;
  window.__ay.frente = (U, a, t, seg, o = {}) => {
    f0(U, a, t, seg, o);
    if (!o.enc) return;
    const c = U.rt.camera, p = a.pos, y = U.suelo(p.x, p.z), dx = p.x - c.position.x, dz = p.z - c.position.z, L = Math.hypot(dx, dz) || 1;
    const sx = -dz / L, sz = dx / L;   // (a la derecha de la pantalla)
    c.lookAt(p.x + sx * o.enc, y + (o.mira ?? 1.45), p.z + sz * o.enc);
  };
  window.__ay.anda = (U, est, x, z, dx, dz) => {
    const P = U.G.player; P.place(x, z, Math.atan2(dx, dz)); P.obj.visible = true;
    est.dir = U.v(dx, 0, dz); U.rt.follow.yaw = Math.atan2(dx, dz) + Math.PI; U.teclas(['w']);
  };
}`);
export const FPS = 24;
const OT = 'otsagabia-ochagavia';

// (vuelo de dron corto sobre un pueblo, para el montaje de los doce pueblos a medio compás: hacia su monumento —castillo,
// puente, murallas, palacio— o hacia la plaza; v, el movimiento: 0 gira, 1 avanza, 2 de lado. Las funciones se escriben
// con los valores ya dentro porque rodar.mjs las lleva a la página como texto)
const dron = (pueblo, hora, v, a0) => ({
  pueblo, hora, tiempo: 'clear', seg: 1.4, fps: 12, antes: 24,
  prep: eval(`(U, est) => {
    const L = window.__layout, pl = L.PLACES.plaza, lms = L.PLACES.landmarks || [];
    const orden = ['castle', 'bridge', 'walls', 'towerhouse', 'palace', 'kiosk'];
    let lm = null; for (const k of orden) { lm = lms.find(l => l.kind === k); if (lm) break; }
    if (lm && lm.kind === 'bridge' && (L.BRIDGES || []).length) { const B = L.BRIDGES.slice().sort((a, b) => (b.xb - b.xa) - (a.xb - a.xa))[0]; lm = { x: (B.xa + B.xb) / 2, z: B.z }; }
    lm ||= pl; est.c = U.v(lm.x, U.suelo(lm.x, lm.z), lm.z);
    U.G.player.place(lm.x + 40, lm.z + 40, 0); U.G.player.obj.visible = false; est.fog = [160, 1700];
  }`),
  cuadro: eval(`(t, U, est) => {
    const c = est.c, k = U.ease(t / 1.4), a0 = ${a0};
    if (${v} === 0) { const a = a0 + k * 0.32, R = 92 - 14 * k; U.cam(U.v(c.x + Math.cos(a) * R, c.y + 40 - 8 * k, c.z + Math.sin(a) * R), U.v(c.x, c.y + 6, c.z), 46); }
    else if (${v} === 1) { const R = 118 - 40 * k; U.cam(U.v(c.x + Math.cos(a0) * R, c.y + 44 - 14 * k, c.z + Math.sin(a0) * R), U.v(c.x, c.y + 5, c.z), 46); }
    else { const sx = -Math.sin(a0), sz = Math.cos(a0), d = (k - 0.5) * 34; U.cam(U.v(c.x + Math.cos(a0) * 84 + sx * d, c.y + 32, c.z + Math.sin(a0) * 84 + sz * d), U.v(c.x + sx * d * 0.4, c.y + 6, c.z + sz * d * 0.4), 46); }
  }`),
});

export const PLANOS = {
  // ---------- los doce pueblos (montaje a medio compás) ----------
  dOlite: dron('olite', 18.3, 0, -0.7), dIsaba: dron('isaba-izaba', 11.0, 1, 2.2), dPamplona: dron('pamplona', 11.4, 2, 0.6),
  dPuente: dron('puente-la-reina', 17.8, 0, 1.9), dJavier: dron('javier', 18.4, 1, 2.3), dTudela: dron('tudela', 12.0, 2, -1.2),
  dLumbier: dron('lumbier', 10.6, 0, 0.4), dViana: dron('viana', 17.6, 1, -2.4), dOrreaga: dron('orreaga-roncesvalles', 10.2, 2, 1.1),
  dEstella: dron('estella', 11.8, 0, 2.8), dUjue: dron('ujue', 18.6, 1, 0.9), dElizondo: dron('elizondo', 11.2, 2, -0.4),

  // ---------- Nico: «Desde aquí ves Otsagabia entera» — el dron baja girando sobre el pueblo ----------
  otVuelo: {
    pueblo: OT, hora: 17.4, tiempo: 'clear', seg: 6.0, fps: 12, antes: 30,
    prep: (U, est) => { const pl = window.__layout.PLACES.plaza; est.c = U.v(pl.x, U.suelo(pl.x, pl.z), pl.z); U.G.player.place(pl.x + 3, pl.z + 3, 0.4); U.G.player.obj.visible = false; est.fog = [160, 1600]; },
    cuadro: (t, U, est) => {
      const c = est.c, k = U.ease(t / 6), a = -2.4 + k * 0.8, R = 175 - 60 * k;
      U.cam(U.v(c.x + Math.cos(a) * R, c.y + 72 - 30 * k, c.z + Math.sin(a) * R), U.v(c.x, c.y + 8 - 4 * k, c.z), 44);
    },
  },
  // ---------- «casas de piedra a los dos lados del río Anduña» — la cámara baja por el río hacia el puente ----------
  otRio: {
    pueblo: OT, hora: 10.4, tiempo: 'clear', seg: 3.8, fps: 12, antes: 30,
    prep: (U, est) => {
      const L = window.__layout, pl = L.PLACES.plaza, B = (L.BRIDGES || []).slice().sort((a, b) => Math.abs(a.z - pl.z) - Math.abs(b.z - pl.z))[0];
      est.bz = B ? B.z : pl.z; est.bx = B ? (B.xa + B.xb) / 2 : L.rx(pl.z);
      U.G.player.place(pl.x + 3, pl.z + 3, 0.4); U.G.player.obj.visible = false; window.__ay.despeja(U, U.v(est.bx, 0, est.bz), 10); est.fog = [120, 1300];
    },
    cuadro: (t, U, est) => {
      const L = window.__layout, k = U.ease(t / 3.8), z = est.bz + 34 - 20 * k, x = L.rx(z), y = Math.max(U.suelo(x, z), window.__hf.waterLevelAt(x, z));
      U.cam(U.v(x + 1.2, y + 3.4 - 0.8 * k, z), U.v(est.bx, y + 3.2, est.bz - 6), 48);
    },
  },
  // ---------- el explorador llega a la plaza ----------
  otExplora: {
    pueblo: OT, hora: 10.2, tiempo: 'clear', seg: 4.0, antes: 30,
    prep: (U, est) => {
      const pl = window.__layout.PLACES.plaza; let best = null;
      // (un sitio seco a 16 m de la plaza desde el que se llega andando derecho, sin agua por medio)
      for (let i = 0; i < 32; i++) {
        const a = i / 32 * 6.283, x = pl.x + Math.cos(a) * 25, z = pl.z + Math.sin(a) * 25; let ok = U.seco(x, z);
        for (let s = 2; s <= 14 && ok; s += 2) ok = U.seco(x - Math.cos(a) * s, z - Math.sin(a) * s);
        if (ok && (!best || Math.abs(U.suelo(x, z) - U.suelo(pl.x, pl.z)) < best.dh)) best = { x, z, a, dh: Math.abs(U.suelo(x, z) - U.suelo(pl.x, pl.z)) };
      }
      best ||= { x: pl.x + 25, z: pl.z, a: 0 };
      window.__ay.anda(U, est, best.x, best.z, -Math.cos(best.a), -Math.sin(best.a));
      window.__ay.despeja(U, U.G.player.pos, 7, []); est.fog = [120, 1300];
    },
    cuadro: (t, U, est) => {
      const P = U.G.player.pos, d = est.dir, s = U.v(-d.z, 0, d.x), k = t / 4;
      U.rt.follow.yaw = Math.atan2(d.x, d.z) + Math.PI;
      U.cam(U.v(P.x + d.x * (4.6 - k * 0.8) + s.x * 1.4, P.y + 1.3 + k * 0.3, P.z + d.z * (4.6 - k * 0.8) + s.z * 1.4), U.v(P.x, P.y + 1.25, P.z), 42);
    },
  },
  // ---------- Maite: «¡Kaixo! Soy Maite» y la fiesta de Muskilda ----------
  otMaite: {
    pueblo: OT, hora: 10.8, tiempo: 'clear', seg: 4.2, fps: 12, antes: 30,
    prep: (U, est) => { est.a = window.__ay.posa(U, U.G.npcs?.maite); const p = est.a.pos; U.G.player.place(p.x + 2.2, p.z + 2.2, 0); U.G.player.obj.visible = false; window.__ay.despeja(U, p, 14, [est.a]); est.fog = [120, 1300]; },
    cuadro: (t, U, est) => window.__ay.frente(U, est.a, t, 4.2, { d: 3.4, acerca: 0.9, lado: -1.4, mira: 1.3, giro: -0.3, enc: -0.95 }),
  },
  // ---------- «se han perdido por todo el valle» — el dron se lanza sobre el valle al atardecer ----------
  otValle: {
    pueblo: OT, hora: 18.7, tiempo: 'clear', seg: 3.0, fps: 12, antes: 30,
    prep: (U, est) => { const pl = window.__layout.PLACES.plaza; est.c = U.v(pl.x, U.suelo(pl.x, pl.z), pl.z); U.G.player.place(pl.x + 3, pl.z + 2, 0); U.G.player.obj.visible = false; est.fog = [160, 1600]; },
    cuadro: (t, U, est) => { const c = est.c, k = Math.pow(t / 3, 1.6), x = c.x - 140 + 170 * k, z = c.z - 110 + 130 * k, y = c.y + 46 - 12 * k; U.cam(U.v(x, y, z), U.v(x + 170, c.y + 2, z + 130), 52 + 10 * k); },
  },
  // ---------- los vecinos ----------
  otItziar: {
    pueblo: OT, hora: 10.6, tiempo: 'clear', seg: 4.0, fps: 12, antes: 30,
    prep: (U, est) => { est.a = window.__ay.posa(U, U.G.npcs?.itziar); const p = est.a.pos; U.G.player.place(p.x + 9, p.z + 9, 0); U.G.player.obj.visible = false; window.__ay.despeja(U, p, 14, [est.a]); est.fog = [120, 1300]; },
    cuadro: (t, U, est) => window.__ay.frente(U, est.a, t, 4.0, { d: 3.2, acerca: 0.7, lado: 1.3, alto: 1.35, mira: 1.15, giro: 0.3, enc: 0.85 }),
  },
  otJoxemari: {
    pueblo: OT, hora: 9.6, tiempo: 'clear', seg: 4.0, fps: 12, antes: 36,
    prep: (U, est) => {
      est.a = window.__ay.posa(U, U.G.npcs?.joxemari); const p = est.a.pos;
      const fl = (U.rt.fauna?.flock || []).filter(o => o.pos).slice(0, 16);
      fl.forEach((o, i) => { const ang = 0.5 + i * 0.4, r = 2.6 + (i % 4) * 1.5, x = p.x + Math.cos(ang) * r, z = p.z + Math.sin(ang) * r; o.pos.x = x; o.pos.z = z; o.obj?.position.set(x, U.suelo(x, z), z); });
      U.G.player.place(p.x + 20, p.z + 20, 0); U.G.player.obj.visible = false; window.__ay.despeja(U, p, 14, [est.a]); est.fog = [120, 1300];
    },
    cuadro: (t, U, est) => window.__ay.frente(U, est.a, t, 4.0, { d: 6.5, acerca: 1.6, lado: 3.4, alto: 2.0, mira: 1.0, giro: 0.4, fov: 44, enc: -2.0 }),
  },
  otKike: {
    pueblo: OT, hora: 11.4, tiempo: 'clear', seg: 4.0, fps: 12, antes: 30,
    prep: (U, est) => { est.a = window.__ay.posa(U, U.G.npcs?.kike); const p = est.a.pos; U.G.player.place(p.x + 9, p.z + 9, 0); U.G.player.obj.visible = false; window.__ay.despeja(U, p, 14, [est.a]); est.fog = [120, 1300]; },
    cuadro: (t, U, est) => window.__ay.frente(U, est.a, t, 4.0, { d: 4.2, acerca: 1.0, lado: -1.8, alto: 1.2, mira: 1.0, giro: -0.35, fov: 44, enc: 1.2 }),
  },
  otJoseba: {
    pueblo: OT, hora: 10.0, tiempo: 'clear', seg: 4.0, fps: 12, antes: 30,
    prep: (U, est) => { est.a = window.__ay.posa(U, U.G.npcs?.inaki); const p = est.a.pos; U.G.player.place(p.x + 9, p.z + 9, 0); U.G.player.obj.visible = false; window.__ay.despeja(U, p, 14, [est.a]); est.fog = [60, 900]; },
    cuadro: (t, U, est) => window.__ay.frente(U, est.a, t, 4.0, { d: 3.8, acerca: 0.8, lado: 1.4, alto: 1.5, mira: 1.4, giro: 0.3, enc: -1.05 }),
  },
  otLamia: {
    pueblo: OT, hora: 17.4, tiempo: 'clear', seg: 4.0, fps: 12, antes: 30,
    prep: (U, est) => { est.a = window.__ay.posa(U, U.G.npcs?.lamia); const p = est.a.pos; U.G.player.place(p.x + 10, p.z + 10, 0); U.G.player.obj.visible = false; window.__ay.despeja(U, p, 14, [est.a]); est.fog = [80, 1000]; },
    cuadro: (t, U, est) => window.__ay.frente(U, est.a, t, 4.0, { d: 4.4, acerca: 0.9, lado: -1.6, alto: 1.4, mira: 1.2, giro: -0.4, enc: 1.05, h: -Math.PI / 2 }),
  },
  otBasajaun: {
    pueblo: OT, hora: 19.2, tiempo: 'niebla', seg: 5.5, fps: 12, antes: 30,
    prep: (U, est) => { est.a = window.__ay.posa(U, U.G.npcs?.basajaun); const p = est.a.pos; U.G.player.place(p.x + 10, p.z + 10, 0); U.G.player.obj.visible = false; window.__ay.despeja(U, p, 14, [est.a]); est.fog = [8, 170]; },
    cuadro: (t, U, est) => window.__ay.frente(U, est.a, t, 5.5, { d: 6.0, acerca: 2.0, lado: 1.3, alto: 0.7, mira: 1.9, giro: 0.3, fov: 42, enc: -1.6 }),
  },
  otBobo: {
    pueblo: OT, hora: 11.6, tiempo: 'clear', seg: 4.0, fps: 12, antes: 30,
    prep: (U, est) => { est.a = window.__ay.posa(U, U.G.npcs?.bobo); const p = est.a.pos; U.G.player.place(p.x + 9, p.z + 9, 0); U.G.player.obj.visible = false; window.__ay.despeja(U, p, 14, [est.a]); est.fog = [120, 1300]; },
    cuadro: (t, U, est) => window.__ay.frente(U, est.a, t, 4.0, { d: 3.8, acerca: 0.9, lado: -1.0, alto: 1.25, mira: 1.3, giro: -0.35, enc: 1.0 }),
  },
  // ---------- «¡pero el bosque es de verdad!» — el hayedo de Irati, la cámara entre los troncos ----------
  irati: {
    pueblo: 'selva-irati', hora: 10.6, tiempo: 'clear', seg: 4.0, fps: 12, antes: 24,
    prep: (U, est) => { const P = U.G.player.pos; est.o = U.v(P.x, U.suelo(P.x, P.z), P.z); U.G.player.obj.visible = false; est.fog = [40, 700]; },
    cuadro: (t, U, est) => { const o = est.o, z = o.z + t * 1.3, y = U.suelo(o.x, z); U.cam(U.v(o.x + 0.4, y + 1.1 + t * 0.15, z), U.v(o.x - 1.5, y + 3.6, z + 14), 50); },
  },
  // ---------- los demás pueblos, como están hoy ----------
  olite: { ...P1.olite, seg: 4.0 },
  javier: { ...P1.javier, seg: 4.0 },
  vecinos: { ...P1.vecinos, seg: 3.0 },
  horizonte: { ...P1.horizonte, seg: 3.2, fps: 12 },
  subida: { ...P1.subida },
  publico: { ...P1.publico, seg: 2.6, fps: 12 },
  // la herrería de Lesaka, el taller de un oficio: la cámara entra despacio hacia el yunque
  herreria: {
    pueblo: 'lesaka', hora: 10.4, tiempo: 'clear', seg: 0.3, fps: 12, antes: 30,
    prep: (U, est) => {
      const M = (U.G.missions || []).find(m => m.type === 'trade' && m.taller); est.T = M?.taller;
      const q = est.T?.puestos?.yunque || est.T?.puestos?.taller; est.q = q;
      if (M?.host && est.T?.puestos?.maestro?.de) { const d = est.T.puestos.maestro.de; window.__ay.posa(U, M.host, d.x, d.z, Math.atan2(q.foco.x - d.x, q.foco.z - d.z)); }
      U.G.player.place(q.cam.x + 30, q.cam.z + 30, 0); U.G.player.obj.visible = false; est.fog = [90, 1100];
      if (est.T) est.T.fuerza = 1;
    },
    cuadro: (t, U, est) => { const q = est.q, T = est.T?.puestos?.taller, k = U.ease(t / 3.5), A = T?.cam || q.cam; U.cam(U.v(U.lerp(A.x, q.cam.x, k), U.lerp(A.y, q.cam.y, k), U.lerp(A.z, q.cam.z, k)), q.foco, 46); },
  },
};
