// Los planos nuevos del tráiler v2 («espectacular, muy gaming y cinematográfico», 21 de noviembre de 2026), que rueda
// tools/trailer/rodar.mjs con PLANOS=./planos-v2.mjs. Mismo formato que planos.mjs y las mismas ayudas que
// planos-inversores.mjs (window.__ay): la manada de momotxorros llenando la plaza roja de Altsasu, su Foru Plaza de día con
// el quiosco y la escultura, y la pelotari en el Labrit. La isla que se eleva la rueda rodar-mapa.mjs.
export { FPS, AYUDA } from './planos-inversores.mjs';

export const PLANOS = {
  // ---------- Altsasu: la Foru Plaza de día, el quiosco sobre su podio y el tronco del nogal tallado ----------
  foruPlaza: {
    pueblo: 'altsasu-alsasua', hora: 11.4, tiempo: 'clear', seg: 3.2, antes: 24,
    prep: (U, est) => {
      const kio = (window.__townB?.landmarks || []).find(l => l.kind === 'kiosk') || window.__layout.PLACES.plaza; est.esc = (window.__townB?.landmarks || []).find(l => l.kind === 'escultura');
      est.c = U.v(kio.x, U.suelo(kio.x, kio.z), kio.z);
      U.G.player.place(kio.x + 30, kio.z + 30, 0); U.G.player.obj.visible = false;
      window.__ay.despeja(U, est.c, 20); est.fog = [90, 1100];
    },
    cuadro: (t, U, est) => {
      // (una vuelta lenta alrededor del quiosco, bajando un poco: se ve el podio, la barandilla y el tejado de zinc)
      const c = est.c, k = U.ease(t / 3.2), a = 0.9 + k * 0.55, R = 13 - k * 2.5;
      U.cam(U.v(c.x + Math.cos(a) * R, c.y + 4.2 - k * 1.6, c.z + Math.sin(a) * R), U.v(c.x, c.y + 2.2, c.z), 46);
    },
  },
  // ---------- la manada: los momotxorros llenan la plaza bailando, con chispas y el aire rojo ----------
  // (la misión se da por acabada: salen ya en su sitio de la plaza, bailando; así no hay que esperar a que lleguen)
  manadaBaile: {
    pueblo: 'altsasu-alsasua', hora: 20.3, tiempo: 'clear', seg: 4.0, antes: 30,
    prep: (U, est) => {
      const G = U.G; G.manadaMomotxorros(); const D = G.desfileOn, C = D.C; est.D = D;
      let mx = 0, mz = 0;
      for (const a of D.gente) {
        const s = a.sitio; a.oculto = false; a.obj.visible = true; a.pos.x = s.x; a.pos.z = s.z; a.state = 'idle'; a.target = null; a.path = null; a.goal = null;
        a.enSitio = true; a.heading = a.h0 = Math.atan2(C.x - s.x, C.z - s.z); mx += s.x - C.x; mz += s.z - C.z;
      }
      D.t = 4; D.fase = 'baile'; D.baile = 4; D.mirado = -1e9;
      // (hacia donde la plaza es más grande: por ahí entra la cámara, entre los que bailan)
      const l = Math.hypot(mx, mz) || 1; est.dir = { x: mx / l, z: mz / l };
      est.c = U.v(C.x, U.suelo(C.x, C.z), C.z);
      G.player.place(C.x - est.dir.x * 60, C.z - est.dir.z * 60, 0); G.player.obj.visible = false;
      window.__ay.despeja(U, est.c, 30, D.gente); est.fog = [50, 700];
    },
    cuadro: (t, U, est) => {
      // (a la altura de los ojos, la cámara avanza entre los momotxorros hacia el quiosco, abriéndose un poco de lado)
      const c = est.c, d = est.dir, k = U.ease(t / 4), R = 17 - k * 8.5, lat = (k - 0.5) * 3.5, sx = d.z, sz = -d.x;
      U.cam(U.v(c.x + d.x * R + sx * lat, c.y + 1.55 - k * 0.3, c.z + d.z * R + sz * lat), U.v(c.x, c.y + 1.9, c.z), 48);
    },
  },
  manadaCenital: {
    pueblo: 'altsasu-alsasua', hora: 20.3, tiempo: 'clear', seg: 3.0, antes: 30,
    prep: (U, est) => {
      const G = U.G; G.manadaMomotxorros(); const D = G.desfileOn, C = D.C; est.D = D;
      for (const a of D.gente) { const s = a.sitio; a.oculto = false; a.obj.visible = true; a.pos.x = s.x; a.pos.z = s.z; a.state = 'idle'; a.target = null; a.path = null; a.enSitio = true; a.heading = a.h0 = Math.atan2(C.x - s.x, C.z - s.z); }
      D.t = 4; D.fase = 'baile'; D.baile = 4; D.mirado = -1e9;
      est.c = U.v(C.x, U.suelo(C.x, C.z), C.z);
      G.player.place(C.x + 60, C.z + 60, 0); G.player.obj.visible = false;
      window.__ay.despeja(U, est.c, 30, D.gente); est.fog = [60, 800];
    },
    cuadro: (t, U, est) => {
      // (desde arriba, la grúa gira despacio y baja: la plaza entera llena, saltando en ola)
      const c = est.c, k = U.ease(t / 3), a = -0.6 + k * 0.5, R = 11 - k * 2;
      U.cam(U.v(c.x + Math.cos(a) * R, c.y + 24 - k * 6, c.z + Math.sin(a) * R), U.v(c.x, c.y, c.z), 50);
    },
  },
  manadaHuyen: {
    pueblo: 'altsasu-alsasua', hora: 20.3, tiempo: 'clear', seg: 3.0, antes: 36,
    prep: (U, est) => {
      const G = U.G; G.manadaMomotxorros(); const D = G.desfileOn, C = D.C; est.D = D;
      for (const a of D.gente) { const s = a.sitio; a.oculto = false; a.obj.visible = true; a.pos.x = s.x; a.pos.z = s.z; a.state = 'idle'; a.target = null; a.path = null; a.enSitio = true; a.heading = a.h0 = Math.atan2(C.x - s.x, C.z - s.z); }
      D.t = 10; D.fase = 'baile'; D.baile = 4; D.mirado = -1e9;
      G.vanseMomotxorros(D);
      est.c = U.v(C.x, U.suelo(C.x, C.z), C.z);
      G.player.place(C.x + 60, C.z + 60, 0); G.player.obj.visible = false;
      window.__ay.despeja(U, est.c, 30, D.gente); est.fog = [50, 700];
    },
    cuadro: (t, U, est) => {
      // (a ras de suelo, en el borde de la plaza: salen corriendo hacia las calles, por delante de la cámara)
      const c = est.c, k = U.ease(t / 3), a = 2.2 + k * 0.25, R = 12 + k * 2;
      U.cam(U.v(c.x + Math.cos(a) * R, c.y + 0.9, c.z + Math.sin(a) * R), U.v(c.x, c.y + 1.6, c.z), 52);
    },
  },
  // ---------- la pelotari en el Labrit (pelotari: con quién juegas, del anillo «Elige tu pelotari») ----------
  // de cara a ella, entre ella y el frontis: la pelota vuelve de la pared y pasa junto a la cámara antes de su golpe
  pelotari: {
    campeonato: 'labrit', pelotari: 'Nerea', seg: 3.2, antes: 0,
    prep: async (U, est) => {
      const m = U.G.pelotaMatch, g = m.game; est.g = g; est.grp = m.court.group; est.yo = m.o.you.obj;
      for (let i = 0; i < 9000; i++) { U.rt.step(1 / 30, U.G, U.G.input); if (g.phase === 'rally' && i > 60) break; }
    },
    cuadro: () => { },
    despues: (t, U, est) => {
      const p = est.grp.worldToLocal(est.yo.getWorldPosition(U.v(0, 0, 0)));
      const quiere = U.v(p.x + 2.3, 1.3, p.z - 4.4), mira = U.v(p.x, 1.15, p.z);
      est.cp = est.cp ? est.cp.lerp(quiere, 0.12) : quiere; est.cm = est.cm ? est.cm.lerp(mira, 0.18) : mira;
      U.cam(est.grp.localToWorld(est.cp.clone()), est.grp.localToWorld(est.cm.clone()), 40);
    },
  },
  // por detrás de ella, baja, como se juega: la carrera, el golpe y la pelota que va al frontis
  pelotariAtras: {
    campeonato: 'labrit', pelotari: 'Nerea', seg: 3.2, antes: 0,
    prep: async (U, est) => {
      const m = U.G.pelotaMatch, g = m.game; est.g = g; est.grp = m.court.group; est.yo = m.o.you.obj;
      for (let i = 0; i < 9000; i++) { U.rt.step(1 / 30, U.G, U.G.input); if (g.phase === 'rally' && i > 200) break; }
    },
    cuadro: () => { },
    despues: (t, U, est) => {
      const p = est.grp.worldToLocal(est.yo.getWorldPosition(U.v(0, 0, 0)));
      const quiere = U.v(p.x + 1.4, 1.7, p.z + 4.2), mira = U.v(p.x * 0.6, 1.3, p.z - 6);
      est.cp = est.cp ? est.cp.lerp(quiere, 0.1) : quiere; est.cm = est.cm ? est.cm.lerp(mira, 0.14) : mira;
      U.cam(est.grp.localToWorld(est.cp.clone()), est.grp.localToWorld(est.cm.clone()), 50);
    },
  },
};
