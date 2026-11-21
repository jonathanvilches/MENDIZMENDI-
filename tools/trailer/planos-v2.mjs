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
      // (los postes indicadores de la plaza, fuera: en la primera prueba tapaban el quiosco)
      for (const g of U.G._carteles || []) g.visible = false;
      // (el lado abierto de la plaza: la primera prueba salió pegada a una fachada, con un poste delante. De 36
      // direcciones, la que deja libre el sitio de la cámara, el camino hasta el quiosco y más plaza detrás)
      const libre = window.__colliders?.isFree || (() => true); let mejor = 0.9, nota = -1;
      for (let i = 0; i < 36; i++) {
        const a = i / 36 * Math.PI * 2, cx = Math.cos(a), cz = Math.sin(a); let n = 0, ok = true;
        for (let r = 5.5; r <= 13; r += 1.5) if (!libre(kio.x + cx * r, kio.z + cz * r, r > 10 ? 1.6 : 0.7)) { ok = false; break; }
        if (!ok) continue;
        for (let r = 14; r <= 26; r += 2) { if (!libre(kio.x + cx * r, kio.z + cz * r, 1.2)) break; n++; }
        if (n > nota) { nota = n; mejor = a; }
      }
      est.a0 = mejor - 0.27;
    },
    cuadro: (t, U, est) => {
      U.G.player.obj.visible = false;   // (el jugador se volvía a ver en medio del plano de la huida)
      // (una vuelta lenta alrededor del quiosco, bajando un poco: se ve el podio, la barandilla y el tejado de zinc)
      const c = est.c, k = U.ease(t / 3.2), a = est.a0 + k * 0.55, R = 13 - k * 2.5;
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
      // (hacia donde la plaza es más grande: hacia allí mira la cámara. Con el quiosco en su sitio real (21 nov) la media
      // de los bailarines apuntaba a una pared: ahora, de 72 direcciones, la que deja libre el sitio de la cámara (5,5 a 10 m)
      // y más plaza abierta por delante (el quiosco ocupa los 5 primeros); a igualdad, la más cercana a la media de los bailarines)
      const libre = window.__colliders?.isFree || (() => true), am = Math.atan2(mz, mx); let ab = am, nota = -1e9;
      for (let i = 0; i < 72; i++) {
        const a = i / 72 * Math.PI * 2, cx = Math.cos(a), cz = Math.sin(a); let ok = true, n = 0;
        for (let r = 5.5; r <= 10; r += 1.5) if (!libre(C.x + cx * r, C.z + cz * r, 0.8)) { ok = false; break; }
        if (!ok) continue;
        for (let r = 11; r <= 40; r += 2) { if (!libre(C.x + cx * r, C.z + cz * r, 1.4)) break; n++; }
        const v = n * 10 - Math.abs(Math.atan2(Math.sin(a - am), Math.cos(a - am)));
        if (v > nota) { nota = v; ab = a; }
      }
      const d = est.dir = { x: Math.cos(ab), z: Math.sin(ab) }, sx = d.z, sz = -d.x;
      est.c = U.v(C.x, U.suelo(C.x, C.z), C.z);
      // (la primera prueba entraba desde fuera y acababa metida en un momotxorro, viéndolos de espaldas: ahora la cámara
      // está entre el quiosco y la manada, mirando hacia fuera, y bailan de cara a ella. Un pasillo de 3 m delante de la
      // cámara, para que no se le meta ninguno encima: los que caen en él se apartan a los lados)
      for (const a of D.gente) {
        const ox = a.pos.x - C.x, oz = a.pos.z - C.z, al = ox * d.x + oz * d.z, pe = ox * sx + oz * sz;
        if (al > 3 && al < 11.5 && Math.abs(pe) < 1.5) {
          const np = (pe < 0 ? -1 : 1) * (1.5 + Math.random() * 0.8), x = C.x + d.x * al + sx * np, z = C.z + d.z * al + sz * np;
          a.sitio = { ...a.sitio, x, z }; a.pos.x = x; a.pos.z = z; a.heading = a.h0 = Math.atan2(C.x - x, C.z - z);
        }
      }
      G.player.place(C.x - d.x * 60, C.z - d.z * 60, 0); G.player.obj.visible = false;
      for (const g of G._carteles || []) g.visible = false;
      window.__ay.despeja(U, est.c, 30, D.gente); for (const w of [...(U.G.walkers || []), ...(U.G.actors || []).filter(a => a.pos && Math.hypot(a.pos.x - C.x, a.pos.z - C.z) < 35)]) if (!D.gente.includes(w)) { w.pos.x += 400; w.pos.z += 400; if (w.obj) { w.obj.visible = false; w.obj.position.set(w.pos.x, -50, w.pos.z); } w.wander = 0; w.walkSpeed = 0; }   // (y todos los vecinos que pasean, y los personajes de la plaza: Unai, el chaval de la misión de los momotxorros, se metía entre la manada) est.fog = [50, 700];
    },
    cuadro: (t, U, est) => {
      U.G.player.obj.visible = false;   // (el jugador se volvía a ver en medio del plano de la huida)
      // (bajita, junto al quiosco y de cara a la manada: la cámara retrocede despacio mientras saltan hacia ella, con las
      // casas y el cielo rojo detrás; se abre un poco de lado)
      const c = est.c, d = est.dir, k = U.ease(t / 4), R = 9.5 - k * 4, lat = (k - 0.5) * 1.6, sx = d.z, sz = -d.x;
      const p = U.v(c.x + d.x * R + sx * lat, c.y + 1.15 + k * 0.25, c.z + d.z * R + sz * lat);
      U.cam(p, U.v(p.x + d.x * 10, c.y + 2.1, p.z + d.z * 10), 50);
    },
  },
  manadaCenital: {
    pueblo: 'altsasu-alsasua', hora: 20.3, tiempo: 'clear', seg: 3.0, antes: 30,
    prep: (U, est) => {
      const G = U.G; G.manadaMomotxorros(); const D = G.desfileOn, C = D.C; est.D = D;
      for (const a of D.gente) { const s = a.sitio; a.oculto = false; a.obj.visible = true; a.pos.x = s.x; a.pos.z = s.z; a.state = 'idle'; a.target = null; a.path = null; a.enSitio = true; a.heading = a.h0 = Math.atan2(C.x - s.x, C.z - s.z); }
      D.t = 4; D.fase = 'baile'; D.baile = 4; D.mirado = -1e9;
      est.c = U.v(C.x, U.suelo(C.x, C.z), C.z);
      let mx = 0, mz = 0; for (const a of D.gente) { mx += a.sitio.x - C.x; mz += a.sitio.z - C.z; }
      // (la grúa sobre el lado abierto de la plaza: con la media de los bailarines, desde el quiosco nuevo pasaba por dentro
      // de un tejado. De 72 direcciones, la que deja libre el recorrido de la cámara, de 13 a 18 m del quiosco y 0,45 rad)
      const libre = window.__colliders?.isFree || (() => true), am = Math.atan2(mz, mx); let ab = am - 0.22, nota = -1e9;
      for (let i = 0; i < 72; i++) {
        const a = i / 72 * Math.PI * 2; let n = 0;
        for (let k = 0; k <= 4; k++) { const aa = a + k / 4 * 0.45; for (let r = 10; r <= 20; r += 2.5) if (libre(C.x + Math.cos(aa) * r, C.z + Math.sin(aa) * r, 2.5)) n++; }
        const v = n * 10 - Math.abs(Math.atan2(Math.sin(a - am), Math.cos(a - am)));
        if (v > nota) { nota = v; ab = a; }
      }
      est.a0 = ab;
      G.player.place(C.x + 60, C.z + 60, 0); G.player.obj.visible = false;
      for (const g of G._carteles || []) g.visible = false;
      window.__ay.despeja(U, est.c, 30, D.gente); for (const w of [...(U.G.walkers || []), ...(U.G.actors || []).filter(a => a.pos && Math.hypot(a.pos.x - C.x, a.pos.z - C.z) < 35)]) if (!D.gente.includes(w)) { w.pos.x += 400; w.pos.z += 400; if (w.obj) { w.obj.visible = false; w.obj.position.set(w.pos.x, -50, w.pos.z); } w.wander = 0; w.walkSpeed = 0; }   // (y todos los vecinos que pasean, y los personajes de la plaza: Unai, el chaval de la misión de los momotxorros, se metía entre la manada) est.fog = [60, 800];
    },
    cuadro: (t, U, est) => {
      U.G.player.obj.visible = false;   // (el jugador se volvía a ver en medio del plano de la huida)
      // (desde arriba, la grúa gira despacio y baja: la plaza entera llena, saltando en ola)
      // (oblicua, unos 40° hacia abajo: desde arriba del todo eran manchas; así se ve la plaza llena y quiénes son)
      const c = est.c, k = U.ease(t / 3), a = (est.a0 ?? -0.6) + k * 0.45, R = 17 - k * 3;
      U.cam(U.v(c.x + Math.cos(a) * R, c.y + 15 - k * 4, c.z + Math.sin(a) * R), U.v(c.x, c.y + 1, c.z), 50);
    },
  },
  manadaHuyen: {
    pueblo: 'altsasu-alsasua', hora: 20.3, tiempo: 'clear', seg: 3.0, antes: 4,   // (con 36 ya habían pasado todos al empezar)
    prep: (U, est) => {
      const G = U.G; G.manadaMomotxorros(); const D = G.desfileOn, C = D.C; est.D = D;
      for (const a of D.gente) { const s = a.sitio; a.oculto = false; a.obj.visible = true; a.pos.x = s.x; a.pos.z = s.z; a.state = 'idle'; a.target = null; a.path = null; a.enSitio = true; a.heading = a.h0 = Math.atan2(C.x - s.x, C.z - s.z); }
      D.t = 10; D.fase = 'baile'; D.baile = 4; D.mirado = -1e9;
      G.vanseMomotxorros(D);
      est.c = U.v(C.x, U.suelo(C.x, C.z), C.z);
      // (la primera prueba miraba a una pared y salían diminutos: ahora la cámara se pone en el lado abierto de la plaza,
      // el de la plaza grande y sin casas, de cara al quiosco; los de ese lado corren hacia ella y la pasan)
      // (la segunda prueba miraba a un lado por el que no se iba nadie: ahora se cuenta hacia dónde corre cada uno, su
      // goal, y la cámara se pone en la calle por la que salen más, siempre que esté libre)
      const libre = window.__colliders?.isFree || (() => true); let mejor = 0, nota = -1, hueco = 8;
      const vaA = D.gente.filter((p) => p.goal).map((p) => Math.atan2(p.goal.z - C.z, p.goal.x - C.x));
      for (let i = 0; i < 72; i++) {
        const a = i / 72 * Math.PI * 2, cx = Math.cos(a), cz = Math.sin(a); let n = 0;
        for (let r = 6; r <= 22; r += 2) { if (!libre(C.x + cx * r, C.z + cz * r, 1.4)) break; n++; }
        const van = vaA.filter((g) => Math.abs(Math.atan2(Math.sin(g - a), Math.cos(g - a))) < 0.35).length;
        const v = n >= 4 ? van * 10 + n : n - 100; if (v > nota) { nota = v; mejor = a; hueco = 6 + (n - 1) * 2; }
      }
      est.a = mejor; est.R = Math.max(9, Math.min(17, hueco - 3));
      G.player.place(C.x - Math.cos(mejor) * 60, C.z - Math.sin(mejor) * 60, 0); G.player.obj.visible = false;
      for (const g of G._carteles || []) g.visible = false;
      window.__ay.despeja(U, est.c, 30, D.gente); for (const w of [...(U.G.walkers || []), ...(U.G.actors || []).filter(a => a.pos && Math.hypot(a.pos.x - C.x, a.pos.z - C.z) < 35)]) if (!D.gente.includes(w)) { w.pos.x += 400; w.pos.z += 400; if (w.obj) { w.obj.visible = false; w.obj.position.set(w.pos.x, -50, w.pos.z); } w.wander = 0; w.walkSpeed = 0; }   // (y todos los vecinos que pasean, y los personajes de la plaza: Unai, el chaval de la misión de los momotxorros, se metía entre la manada) est.fog = [50, 700];
    },
    cuadro: (t, U, est) => {
      U.G.player.obj.visible = false;   // (el jugador se volvía a ver en medio del plano de la huida)
      // (bajita, en la boca del lado abierto, de cara al quiosco: salen corriendo hacia la cámara y la pasan; retrocede)
      const c = est.c, k = U.ease(t / 3), a = est.a + (k - 0.5) * 0.12, R = est.R + k * 3;
      U.cam(U.v(c.x + Math.cos(a) * R, c.y + 1.0, c.z + Math.sin(a) * R), U.v(c.x, c.y + 1.7, c.z), 54);
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
