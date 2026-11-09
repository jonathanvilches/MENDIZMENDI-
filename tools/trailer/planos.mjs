// Los planos del tráiler (tools/trailer/rodar.mjs los rueda). Cada uno: el pueblo, la hora, el tiempo, el avatar, cuántos
// segundos dura y dos funciones que corren dentro de la página del juego:
//   prep(U, est): prepara la escena (coloca al personaje, saca criaturas…). U: THREE, G (el juego), rt, H (relieve),
//     ease, lerp, v(x,y,z), suelo(x,z), teclas([...]), cam(pos, mira, fov). est: lo que el plano quiera recordar
//   cuadro(t, U, est): en cada fotograma, con t en segundos desde el principio del plano, coloca la cámara (y lo demás)
//   est.lento: el mundo a cámara lenta (0,3 = al 30 %), sin frenar la cámara
export const FPS = 24;

export const PLANOS = {
  // 0-4,6 s: amanecer con niebla sobre el valle, a vista de dron, avanzando despacio hacia el pueblo
  amanecer: {
    pueblo: 'erronkari-roncal', hora: 6.75, tiempo: 'clear', seg: 4.6,
    prep: (U, est) => {
      const pl = window.__layout.PLACES.plaza;
      est.c = U.v(pl.x, U.suelo(pl.x, pl.z), pl.z);
      U.G.player.place(pl.x + 4, pl.z + 4, 0);
      est.fog = [30, 520]; est.fogColor = '#e9d7c4';
      est.brumas = U.bruma(est.c, 170, 26, '#f4e8da', 1, 9, 0.38);
    },
    cuadro: (t, U, est) => {
      const k = U.ease(t / 4.6), c = est.c;
      const pos = U.v(c.x - 150 + 40 * k, c.y + 62 - 14 * k, c.z - 160 + 46 * k);
      U.cam(pos, U.v(c.x + 10, c.y + 4, c.z + 10), 48);
    },
  },
  // 4,6-8 s: el pastor sube el monte entre sus ovejas, con la cámara baja detrás
  pastor: {
    pueblo: 'erronkari-roncal', hora: 6.95, tiempo: 'clear', seg: 3.4, antes: 24,
    prep: (U, est) => {
      const F = U.rt.fauna, fl = (F?.flock || []).filter(a => a.pos);
      const c = fl.length ? fl.reduce((s, a) => s.add(U.v(a.pos.x, 0, a.pos.z)), U.v(0, 0, 0)).multiplyScalar(1 / fl.length) : U.v(0, 0, 0);
      // un sitio seco junto al rebaño, con la cuesta hacia arriba y seca durante 14 m
      let best = null;
      for (let r = 4; r <= 26 && !best; r += 2) for (let i = 0; i < 24; i++) {
        const a = i / 24 * Math.PI * 2, x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r; if (!U.seco(x, z)) continue;
        for (let j = 0; j < 16; j++) {
          const b = j / 16 * Math.PI * 2, dx = Math.cos(b), dz = Math.sin(b); let ok = true;
          for (let s = 2; s <= 14; s += 2) if (!U.seco(x + dx * s, z + dz * s)) ok = false;
          const sube = U.suelo(x + dx * 12, z + dz * 12) - U.suelo(x, z);
          if (ok && sube > 1.2 && (!best || sube > best.sube)) best = { x, z, dx, dz, sube };
        }
      }
      best ||= { x: c.x, z: c.z, dx: 1, dz: 0, sube: 0 };
      est.dir = U.v(best.dx, 0, best.dz);
      U.G.player.place(best.x, best.z, Math.atan2(best.dx, best.dz));
      // las ovejas, delante y a los lados de su camino
      fl.forEach((a, i) => { const f = 3 + (i % 5) * 1.6, s = ((i % 3) - 1) * (1.6 + (i % 4) * 0.5); a.pos.x = best.x + best.dx * f - best.dz * s; a.pos.z = best.z + best.dz * f + best.dx * s; if (a.obj) a.obj.position.set(a.pos.x, U.suelo(a.pos.x, a.pos.z), a.pos.z); });
      U.rt.follow.yaw = Math.atan2(best.dx, best.dz) + Math.PI;
      U.teclas(['w']);
      est.fog = [20, 420]; est.fogColor = '#ecd9c4';
      est.brumas = U.bruma(U.v(best.x, 0, best.z), 90, 14, '#f6ebde', 3, 12, 0.3);
    },
    cuadro: (t, U, est) => {
      const P = U.G.player.pos, d = est.dir, s = U.v(-d.z, 0, d.x), k = t / 3.4;
      U.rt.follow.yaw = Math.atan2(d.x, d.z) + Math.PI;
      const pos = U.v(P.x - d.x * (3.8 - k * 0.6) + s.x * (1.1 - k * 0.7), P.y + 1.05 + k * 0.25, P.z - d.z * (3.8 - k * 0.6) + s.z * (1.1 - k * 0.7));
      U.cam(pos, U.v(P.x + d.x * 5, P.y + 1.6, P.z + d.z * 5), 44);
    },
  },

  // ---------- 8-18 s: la noche en la selva de Irati ----------
  // ojos que brillan entre los árboles, la cámara entrando despacio
  ojos: {
    pueblo: 'selva-irati', hora: 23.4, tiempo: 'niebla', seg: 2.5,
    prep: (U, est) => {
      const P = U.G.player.pos; est.o = U.v(P.x, U.suelo(P.x, P.z), P.z); U.G.player.obj.visible = false;
      est.ojos = [];
      const pares = [[-3.4, 13, 1.5, '#ffe7a0'], [4.0, 17, 2.4, '#b6ff9a'], [-6.4, 22, 1.1, '#ffd27a'], [1.4, 26, 2.9, '#9ff3ff'], [7.2, 29, 1.7, '#ffe7a0'], [-1.8, 33, 2.2, '#ff9a5a']];
      pares.forEach(([sx, f, h, c], k) => { const x = est.o.x + sx, z = est.o.z + f, y = U.suelo(x, z) + h; for (const e of [-0.13, 0.13]) { const s = U.brillo(c, 0.34); s.position.set(x + e, y, z); s.userData.k = k; s.material.opacity = 0; est.ojos.push(s); } });
      est.fog = [2, 62]; est.fogColor = '#151a36';
      est.brumas = U.bruma(U.v(est.o.x, 0, est.o.z + 18), 16, 12, '#6f7ca8', 0, 2.2, 0.3, 0.12);
    },
    cuadro: (t, U, est) => {
      const o = est.o, k = t / 2.5;
      U.cam(U.v(o.x + 0.3, o.y + 1.45, o.z - 2 + k * 4.5), U.v(o.x, o.y + 1.7, o.z + 22), 42);
      for (const s of est.ojos) { const t0 = 0.15 + s.userData.k * 0.36, on = Math.max(0, Math.min(1, (t - t0) * 4)), parpadeo = Math.sin(t * 2.6 + s.userData.k * 1.7) > 0.96 ? 0.05 : 1; s.material.opacity = on * parpadeo; }
    },
  },
  // Basajaun se forma entre la niebla, enorme, con su aura; la cámara baja, mirándolo desde abajo
  basajaun: {
    pueblo: 'selva-irati', hora: 23.4, tiempo: 'niebla', seg: 1.9, antes: 4,
    prep: (U, est) => {
      const P = U.G.player.pos; est.o = U.v(P.x, U.suelo(P.x, P.z), P.z); U.G.player.obj.visible = false;
      est.a = U.criatura('basajaun', est.o.x, est.o.z + 7, '#b6ff9a', 'Basajaun'); est.a.heading = Math.PI;
      est.fog = [2, 55]; est.fogColor = '#151a36';
      est.brumas = U.bruma(U.v(est.o.x, 0, est.o.z + 7), 5, 10, '#8aa0c8', 0, 1.6, 0.35, 0.09);
    },
    cuadro: (t, U, est) => {
      const a = est.a.pos, k = U.ease(t / 1.9);
      U.cam(U.v(a.x + 1.4 - k * 0.8, a.y + 0.5 + k * 0.3, a.z - 6.4 + k * 1.8), U.v(a.x, a.y + 2.3, a.z), 40);
    },
  },
  lamia: {
    pueblo: 'selva-irati', hora: 23.4, tiempo: 'niebla', seg: 1.5, antes: 4,
    prep: (U, est) => {
      const P = U.G.player.pos; est.o = U.v(P.x, U.suelo(P.x, P.z), P.z); U.G.player.obj.visible = false;
      est.a = U.criatura('lamia', est.o.x + 2, est.o.z + 6, '#9ff3ff', 'Lamia'); est.a.heading = Math.PI + 0.4;
      est.fog = [2, 55]; est.fogColor = '#13203a';
      est.brumas = U.bruma(U.v(est.o.x + 2, 0, est.o.z + 6), 5, 10, '#86b8d0', 0, 1.4, 0.35, 0.09);
    },
    cuadro: (t, U, est) => {
      const a = est.a.pos, k = U.ease(t / 1.5), ang = -0.5 + k * 0.5;
      U.cam(U.v(a.x + Math.sin(ang) * 4.6, a.y + 1.2, a.z - Math.cos(ang) * 4.6), U.v(a.x, a.y + 1.8, a.z), 40);
    },
  },
  momotxorro: {
    pueblo: 'selva-irati', hora: 23.4, tiempo: 'niebla', seg: 1.5, antes: 4,
    prep: (U, est) => {
      const P = U.G.player.pos; est.o = U.v(P.x, U.suelo(P.x, P.z), P.z); U.G.player.obj.visible = false;
      est.a = U.criatura('momotxorro', est.o.x - 1, est.o.z + 5, '#ff8a4a', 'Momotxorro'); est.a.heading = Math.PI - 0.3;
      est.fog = [2, 55]; est.fogColor = '#22172e';
      est.brumas = U.bruma(U.v(est.o.x - 1, 0, est.o.z + 5), 5, 10, '#b08a9a', 0, 1.4, 0.35, 0.09);
    },
    cuadro: (t, U, est) => {
      const a = est.a.pos, k = U.ease(t / 1.5);
      U.cam(U.v(a.x - 0.4, a.y + 0.6 + k * 0.5, a.z - 3.6 + k * 1.1), U.v(a.x, a.y + 1.5, a.z), 44);
    },
  },
  // el pastor corre, salta (a cámara lenta) y el Basajaun detrás, entre la niebla
  huida: {
    pueblo: 'selva-irati', hora: 23.4, tiempo: 'niebla', seg: 2.7, antes: 4,
    prep: (U, est) => {
      const P = U.G.player.pos; U.G.player.place(P.x, P.z, 0); U.rt.follow.yaw = Math.PI;
      U.teclas(['w', 'shift']);
      est.a = U.criatura('basajaun', P.x + 2.0, P.z + 8.5, '#b6ff9a', 'Basajaun'); est.a.heading = Math.PI;
      est.fog = [2, 55]; est.fogColor = '#151a36';
    },
    cuadro: (t, U, est) => {
      const P = U.G.player.pos; U.rt.follow.yaw = Math.PI;
      if (t > 0.85 && !est.salto) { est.salto = true; U.G.input.press(' '); }
      est.lento = t > 0.95 && t < 1.95 ? 0.3 : 1;
      U.cam(U.v(P.x + 4.2, P.y + 1.05, P.z - 2.4), U.v(P.x + 0.3, P.y + 1.35, P.z + 1.8), 46);
    },
    despues: (t, U, est) => {
      const a = est.a, P = U.G.player.pos, tx = P.x + 2.0, tz = P.z + 6.8;
      a.pos.x += (tx - a.pos.x) * 0.2; a.pos.z += (tz - a.pos.z) * 0.2; a.heading = Math.PI; a.speed = U.G.player.speed;
      a.obj.position.set(a.pos.x, U.suelo(a.pos.x, a.pos.z), a.pos.z); a.obj.rotation.y = Math.PI;
    },
  },
  // ---------- 18-35 s: el montaje ----------
  plaza: {
    pueblo: 'lesaka', hora: 9.8, seg: 1.5,
    prep: (U, est) => { const pl = window.__layout.PLACES.plaza; est.c = U.v(pl.x, U.suelo(pl.x, pl.z), pl.z); U.G.player.place(pl.x + 3, pl.z + 2, 0.5); est.fog = [90, 1100]; },
    cuadro: (t, U, est) => { const c = est.c, k = t / 1.5; U.cam(U.v(c.x - 32 + 20 * k, c.y + 22 - 3 * k, c.z - 34 + 6 * k), U.v(c.x + 4, c.y + 2, c.z + 2), 50); },
  },
  fauna: {
    pueblo: 'lesaka', hora: 9.6, seg: 1.0, antes: 24,
    prep: (U, est) => {
      const A = (U.rt.fauna?.animals || []).filter(a => (a.kind === 'pottoka' || a.kind === 'cow') && a.pos);
      est.a = A.find(a => a.kind === 'pottoka') || A[0]; const p = est.a.pos;
      U.G.player.place(p.x + 25, p.z + 25, 0); est.fog = [90, 1100];
    },
    cuadro: (t, U, est) => { const a = est.a.pos, y = U.suelo(a.x, a.z); U.cam(U.v(a.x + 4.4 - t * 1.4, y + 1.0, a.z + 3.4), U.v(a.x, y + 0.9, a.z), 38); },
  },
  // la flora: el hayedo de Irati de día, la cámara avanzando despacio entre los troncos y los helechos
  flores: {
    pueblo: 'selva-irati', hora: 10.4, tiempo: 'clear', seg: 1.0, antes: 16,
    prep: (U, est) => { const P = U.G.player.pos; est.o = U.v(P.x, U.suelo(P.x, P.z), P.z); U.G.player.obj.visible = false; est.fog = [40, 700]; },
    cuadro: (t, U, est) => { const o = est.o, z = o.z + t * 1.2, y = U.suelo(o.x, z); U.cam(U.v(o.x + 0.4, y + 0.9, z), U.v(o.x - 1.5, y + 3.2, z + 14), 50); },
  },
  // el golpe de la pelota contra el frontis, a cámara lenta (un partido de campeonato en Tafalla)
  pelota: {
    campeonato: 'tafalla', seg: 2.0, antes: 0,
    prep: (U, est) => {
      const m = U.G.pelotaMatch, g = m.game; est.g = g; est.grp = m.court.group;
      // (adelante el partido, sin dibujar, hasta justo después de un golpe: la pelota sale hacia el frontis)
      for (let i = 0; i < 9000; i++) { U.rt.step(1 / 30, U.G, U.G.input); const B = g.ball; if (g.phase === 'rally' && B.v.z < -6 && B.p.z > 12 && B.p.z < 17) break; }
    },
    cuadro: () => { },
    despues: (t, U, est) => {
      const B = est.g.ball.p, w = est.grp.localToWorld(U.v(B.x, B.y, B.z));
      est.lento = B.z < 3.2 && est.g.ball.v.z < 0 || (B.z < 4.5 && est.g.ball.v.z > 0) ? 0.22 : 1;
      const c = est.grp.localToWorld(U.v(Math.min(4.5, B.x + 3.6), 1.1 + Math.min(B.y, 4) * 0.35, Math.max(2.2, B.z + 4.2)));
      U.cam(c, w, 42);
    },
  },
  mercado: {
    pueblo: 'erronkari-roncal', hora: 10.6, seg: 1.5,
    prep: (U, est) => { const T = U.G.tienda; est.p = U.v(T.pos.x, T.y, T.pos.z); est.ry = T.ry; U.G.player.place(T.pos.x + Math.sin(T.ry) * 7 + 3, T.pos.z + Math.cos(T.ry) * 7, 0); },
    cuadro: (t, U, est) => { const o = est.p, f = U.v(Math.sin(est.ry), 0, Math.cos(est.ry)), s = U.v(f.z, 0, -f.x), k = t / 1.5; U.cam(U.v(o.x + f.x * 4.6 + s.x * (1.6 - 2.6 * k), o.y + 1.55, o.z + f.z * 4.6 + s.z * (1.6 - 2.6 * k)), U.v(o.x, o.y + 1.6, o.z), 44); },
  },
  // la subida al clímax: el dron se lanza sobre el pueblo, cada vez más deprisa
  subida: {
    pueblo: 'lesaka', hora: 18.2, seg: 3.0,
    prep: (U, est) => { const pl = window.__layout.PLACES.plaza; est.c = U.v(pl.x, U.suelo(pl.x, pl.z), pl.z); U.G.player.place(pl.x + 3, pl.z + 2, 0); est.fog = [90, 1100]; },
    cuadro: (t, U, est) => { const c = est.c, k = Math.pow(t / 3, 2), x = c.x + 120 - 150 * k, z = c.z + 92 - 116 * k, y = c.y + 30 + 14 * k; U.cam(U.v(x, y, z), U.v(x - 150, c.y + 6, z - 116), 50 + 14 * k); },
  },
  // ---------- 35-48 s: Olite y Javier al atardecer ----------
  olite: {
    pueblo: 'olite', hora: 18.3, seg: 5.0,
    prep: (U, est) => { const L = window.__layout.PLACES.landmarks || [], lm = L.find(l => l.kind === 'castle') || window.__layout.PLACES.plaza; est.c = U.v(lm.x, U.suelo(lm.x, lm.z), lm.z); U.G.player.place(lm.x + 40, lm.z + 40, 0); est.fog = [140, 1600]; },
    cuadro: (t, U, est) => { const c = est.c, a = -0.7 + t / 5 * 0.6, R = 100 - t * 4; U.cam(U.v(c.x + Math.cos(a) * R * 0.72, c.y + 34 - t * 2, c.z + Math.sin(a) * R * 0.72), U.v(c.x, c.y + 8, c.z), 44); },
  },
  javier: {
    pueblo: 'javier', hora: 18.4, seg: 4.0,
    prep: (U, est) => { const L = window.__layout.PLACES.landmarks || [], lm = L.find(l => l.kind === 'castle') || window.__layout.PLACES.plaza; est.c = U.v(lm.x, U.suelo(lm.x, lm.z), lm.z); U.G.player.place(lm.x + 40, lm.z + 40, 0); est.fog = [140, 1600]; },
    cuadro: (t, U, est) => { const c = est.c, k = U.ease(t / 4), a = 2.3 + k * 0.25; U.cam(U.v(c.x + Math.cos(a) * (62 - 22 * k), c.y + 26 - 10 * k, c.z + Math.sin(a) * (62 - 22 * k)), U.v(c.x, c.y + 8, c.z), 44); },
  },
  // el castillo desde el suelo, como si lo mirases con el móvil en la mano (fondo de la realidad aumentada)
  javierSuelo: {
    pueblo: 'javier', hora: 18.4, seg: 4.0,
    prep: (U, est) => {
      const L = window.__layout.PLACES.landmarks || [], lm = L.find(l => l.kind === 'castle') || window.__layout.PLACES.plaza; est.c = U.v(lm.x, U.suelo(lm.x, lm.z), lm.z);
      const ray = new U.THREE.Raycaster(), objs = []; let best = null;
      U.rt.scene.traverseVisible(o => { if ((o.isMesh || o.isInstancedMesh) && !o.isSprite) objs.push(o); });
      for (const R of [42, 50, 36, 60]) for (let i = 0; i < 32 && !best; i++) {
        const a = Math.PI + (i % 2 ? 1 : -1) * Math.floor((i + 1) / 2) * 0.2, x = lm.x + Math.cos(a) * R, z = lm.z + Math.sin(a) * R; if (!U.seco(x, z)) continue;
        const o = U.v(x, U.suelo(x, z) + 1.6, z), d = U.v(lm.x, U.suelo(lm.x, lm.z) + 7, lm.z).sub(o), L = d.length(); d.normalize();
        ray.set(o, d); ray.far = L; let cerca = Infinity;
        // (objeto a objeto: alguno, como los de partículas, no se deja atravesar con el rayo)
        for (const ob of objs) { try { const h = ray.intersectObject(ob, false)[0]; if (h && h.distance < cerca) cerca = h.distance; } catch (e) { } }
        if (cerca > L - 16) best = { x, z, h: U.suelo(x, z), a };
      }
      est.b = best || { x: lm.x + 34, z: lm.z, h: U.suelo(lm.x + 34, lm.z), a: 0 }; U.G.player.place(est.b.x, est.b.z, 0); U.G.player.obj.visible = false; est.fog = [140, 1600];
    },
    cuadro: (t, U, est) => { const b = est.b, c = est.c; U.cam(U.v(b.x + Math.sin(t * 0.9) * 0.15, b.h + 1.6 + Math.sin(t * 1.3) * 0.05, b.z), U.v(c.x, c.y + 7, c.z), 50); },
  },
  // ---------- 48-55 s: la gente del pueblo ----------
  vecinos: {
    pueblo: 'lesaka', hora: 18.5, seg: 3.5, antes: 30,
    prep: (U, est) => {
      const pl = window.__layout.PLACES.plaza; est.c = U.v(pl.x, U.suelo(pl.x, pl.z), pl.z); U.G.player.place(pl.x + 1, pl.z + 1, 0.6);
      (U.G.walkers || []).slice(0, 16).forEach((w, i) => { const a = i / 16 * 6.283, r = 3 + (i % 4) * 2.4, x = pl.x + Math.cos(a) * r, z = pl.z + Math.sin(a) * r; if (!w.pos) return; w.pos.x = x; w.pos.z = z; w.obj?.position.set(x, U.suelo(x, z), z); });
      est.fog = [90, 1100];
    },
    cuadro: (t, U, est) => { const c = est.c, k = t / 3.5; U.cam(U.v(c.x - 10 + 6 * k, c.y + 1.7, c.z - 9 + 2 * k), U.v(c.x + 2, c.y + 1.3, c.z + 2), 42); },
  },
  // el público de la grada celebrando el tanto
  publico: {
    campeonato: 'tafalla', seg: 3.5, antes: 0,
    prep: (U, est) => {
      const C = U.G.pelotaMatch.court, S = (C.ocupados || C.standSpots || []);
      let sx = 0, sy = 0, sz = 0; for (const q of S) { sx += q[0]; sy += q[1]; sz += q[2]; } const n = Math.max(1, S.length);
      est.s = C.group.localToWorld(U.v(sx / n, sy / n, sz / n)); est.grp = C.group;
      est.pub = null; U.rt.scene.traverse(o => { if (!est.pub && o.tick && o.children?.some(c => c.isInstancedMesh)) est.pub = o; });
    },
    cuadro: () => { },
    despues: (t, U, est) => {
      const s = est.s, g = est.grp, cam = g.localToWorld(g.worldToLocal(s.clone()).add(U.v(-5.5, 1.6, -3 + t * 0.5)));
      U.cam(cam, U.v(s.x, s.y + 0.6, s.z), 40);
      est.pub?.tick?.(t, 1, s.z, U.rt.camera);
    },
  },
  // ---------- 55-60 s: el pastor mira al horizonte (y luego, el logo encima) ----------
  horizonte: {
    pueblo: 'erronkari-roncal', hora: 18.9, seg: 5.0, antes: 6,
    prep: (U, est) => {
      const pl = window.__layout.PLACES.plaza; let best = null;
      for (let r = 60; r <= 240; r += 20) for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283, x = pl.x + Math.cos(a) * r, z = pl.z + Math.sin(a) * r; if (!U.seco(x, z)) continue; const h = U.suelo(x, z); if (!best || h > best.h) best = { x, z, h, a }; }
      est.b = best; est.d = U.v(-Math.cos(best.a), 0, -Math.sin(best.a));
      U.G.player.place(best.x, best.z, Math.atan2(est.d.x, est.d.z)); U.teclas([]); est.fog = [70, 1000];
    },
    cuadro: (t, U, est) => { const P = U.G.player.pos, d = est.d, s = U.v(-d.z, 0, d.x), k = U.ease(t / 5); U.cam(U.v(P.x - d.x * (3 + 2.6 * k) + s.x * 0.7, P.y + 1.5 + 1.8 * k, P.z - d.z * (3 + 2.6 * k) + s.z * 0.7), U.v(P.x + d.x * 40, P.y - 4 + 2 * k, P.z + d.z * 40), 48); },
  },
};
