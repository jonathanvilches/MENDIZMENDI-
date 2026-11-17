// Los planos del tráiler para inversores (entrega/trailer/guion-trailer.md), que rueda tools/trailer/rodar.mjs con
// PLANOS=./planos-inversores.mjs. Mismo formato que planos.mjs: el pueblo, la hora, el tiempo, cuánto dura y lo que pasa.
// Salen los seis seres de Meshy (17 de noviembre de 2026): el Bobo y el Zarratrako en Otsagabia, el joaldun en Ituren, el
// momotxorro en Altsasu, y la lamia y el Basajaun en Otsagabia; con Maite, Joxemari y sus ovejas y el pueblo desde el aire.
export const FPS = 24;

// Las ayudas de los planos: van a la página como texto (rodar.mjs, AYUDA) porque cada plano se ejecuta allí, lejos de este
// archivo, y no ve lo que hay fuera de su propia función. En los planos, window.__ay
export const AYUDA = () => {
  // (la cámara delante de un personaje, un poco de lado, mirándole a la cara: d, a cuánto; lado, hacia dónde se abre; alto,
  // la altura de los ojos de quien mira; mira, la altura a la que se le mira; giro, cuánto da la vuelta en el plano)
  const frente = (U, a, t, seg, o = {}) => {
    // (el rumbo se fija la primera vez: el personaje gira hacia la cámara, a.mira, y si no la cámara le seguiría el giro)
    if (a.__h0 == null) a.__h0 = o.h ?? a.heading ?? a.obj?.rotation.y ?? 0;
    const p = a.pos, y = U.suelo(p.x, p.z), h = a.__h0 + (o.giro || 0) * (t / seg - 0.5);
    const fx = Math.sin(h), fz = Math.cos(h), sx = fz, sz = -fx, d = (o.d ?? 3.4) - (o.acerca || 0) * U.ease(t / seg), l = o.lado ?? 0.9;
    const cx = p.x + fx * d + sx * l, cz = p.z + fz * d + sz * l;
    U.cam(U.v(cx, y + (o.alto ?? 1.5), cz), U.v(p.x, y + (o.mira ?? 1.45), p.z), o.fov ?? 40);
    // (y de cara a ella en cada fotograma: las figuras del carnaval y los seres de leyenda giraban solos; vuelta, para la
    // figura que tiene el frente al revés)
    const want = Math.atan2(cx - p.x, cz - p.z); a.mira = { x: cx, z: cz }; a.heading = want; a.dance = 0;
    if (a.obj) a.obj.rotation.y = want + (o.vuelta || 0);
  };
  // (el personaje quieto y de cara a donde se le mira, con su animación de estar; si estaba escondido, a la vista)
  const posa = (U, a, x, z, h) => {
    if (!a) return null;
    if (x != null) { a.setPos ? a.setPos(x, z, h ?? a.heading ?? 0) : (a.pos.x = x, a.pos.z = z); }
    if (h != null) a.heading = h;
    a.hidden = false; if (a.obj) { a.obj.visible = true; a.obj.position.set(a.pos.x, U.suelo(a.pos.x, a.pos.z), a.pos.z); a.obj.rotation.y = a.heading ?? 0; }
    a.wander = 0; a.walkSpeed = 0; a.target = null; a.path = null; a.frozen = true;
    return a;
  };
  // (las figuras del carnaval del pueblo: su misión, como al jugar; la primera, delante de la plaza)
  const carnaval = (U, est) => {
    const M = (U.G.missions || []).find(m => m.type === 'carnival'); if (!M) return null;
    U.G.startCarnival(M); const f = (U.G.folk || []).filter(a => a.fm === M);
    const pl = window.__layout.PLACES.plaza;
    f.forEach((a, i) => { const ang = i * 1.2, r = 5 + i * 2.2; posa(U, a, pl.x + Math.cos(ang) * r, pl.z + Math.sin(ang) * r, Math.PI + ang); });
    est.folk = f; return f[0] || null;
  };
  // (fuera del plano los vecinos que pasean y los demás personajes que estén a menos de r metros, salvo los que se dejan:
  // si no, se cruzaban delante de la cámara)
  const despeja = (U, p, r = 16, deja = []) => {
    const lejos = (a) => a && a.pos && Math.hypot(a.pos.x - p.x, a.pos.z - p.z) < r && !deja.includes(a);
    for (const w of [...(U.G.walkers || []), ...Object.values(U.G.npcs || {})]) if (lejos(w)) { w.pos.x += 400; w.pos.z += 400; if (w.obj) { w.obj.visible = false; w.obj.position.set(w.pos.x, -50, w.pos.z); } w.wander = 0; w.walkSpeed = 0; }
  };
  window.__ay = { frente, posa, carnaval, despeja };
};

export const PLANOS = {
  // ---------- 12-20 s: Otsagabia desde el aire, con su río y sus casas ----------
  otsaVuelo: {
    pueblo: 'otsagabia-ochagavia', hora: 11.2, tiempo: 'clear', seg: 4.0, antes: 24,
    prep: (U, est) => { const pl = window.__layout.PLACES.plaza; est.c = U.v(pl.x, U.suelo(pl.x, pl.z), pl.z); U.G.player.place(pl.x + 3, pl.z + 3, 0.4); est.fog = [120, 1400]; },
    cuadro: (t, U, est) => {
      const c = est.c, k = U.ease(t / 4), a = -2.2 + k * 0.7, R = 120 - 40 * k;
      U.cam(U.v(c.x + Math.cos(a) * R, c.y + 52 - 18 * k, c.z + Math.sin(a) * R), U.v(c.x, c.y + 4, c.z), 46);
    },
  },
  // ---------- 20-30 s: cada vecino te pide ayuda ----------
  maite: {
    pueblo: 'otsagabia-ochagavia', hora: 10.8, tiempo: 'clear', seg: 2.4, antes: 24,
    prep: (U, est) => { est.a = window.__ay.posa(U, U.G.npcs?.maite); const p = est.a.pos; U.G.player.place(p.x + 2.2, p.z + 2.2, 0); U.G.player.obj.visible = false; window.__ay.despeja(U, est.a.pos, 14, [est.a]); est.fog = [90, 1100]; },
    cuadro: (t, U, est) => window.__ay.frente(U, est.a, t, 2.4, { d: 3.0, acerca: 0.6, lado: -1.3, mira: 1.55, giro: -0.25 }),
  },
  joxemari: {
    pueblo: 'otsagabia-ochagavia', hora: 9.6, tiempo: 'clear', seg: 2.4, antes: 30,
    prep: (U, est) => {
      est.a = window.__ay.posa(U, U.G.npcs?.joxemari); const p = est.a.pos;
      // (sus ovejas alrededor, como en su misión)
      const fl = (U.rt.fauna?.flock || []).filter(o => o.pos).slice(0, 14);
      fl.forEach((o, i) => { const ang = 0.6 + i * 0.42, r = 2.6 + (i % 4) * 1.5, x = p.x + Math.cos(ang) * r, z = p.z + Math.sin(ang) * r; o.pos.x = x; o.pos.z = z; o.obj?.position.set(x, U.suelo(x, z), z); });
      U.G.player.place(p.x + 20, p.z + 20, 0); U.G.player.obj.visible = false; window.__ay.despeja(U, p, 14, [est.a]); est.fog = [90, 1100];
    },
    cuadro: (t, U, est) => window.__ay.frente(U, est.a, t, 2.4, { d: 6.5, lado: 3.5, alto: 2.2, mira: 1.1, giro: 0.4, fov: 44 }),
  },
  bobo: {
    pueblo: 'otsagabia-ochagavia', hora: 11.6, tiempo: 'clear', seg: 2.2, antes: 24,
    prep: (U, est) => { est.a = window.__ay.posa(U, U.G.npcs?.bobo); const p = est.a.pos; U.G.player.place(p.x + 9, p.z + 9, 0); U.G.player.obj.visible = false; window.__ay.despeja(U, est.a.pos, 14, [est.a, ...(est.folk || [])]); est.fog = [90, 1100]; },
    cuadro: (t, U, est) => window.__ay.frente(U, est.a, t, 2.2, { d: 3.6, acerca: 0.8, lado: -0.9, alto: 1.3, mira: 1.5, giro: -0.3 }),
  },
  zarratrako: {
    pueblo: 'otsagabia-ochagavia', hora: 12.2, tiempo: 'clear', seg: 2.2, antes: 24,
    prep: (U, est) => {
      const pl = window.__layout.PLACES.plaza;
      est.a = window.__ay.posa(U, U.G.npcs?.zarratrako, pl.x + 6, pl.z - 4, Math.PI * 0.8); U.G.player.place(pl.x - 12, pl.z + 10, 0); U.G.player.obj.visible = false; window.__ay.despeja(U, est.a.pos, 14, [est.a, ...(est.folk || [])]); est.fog = [90, 1100];
    },
    cuadro: (t, U, est) => window.__ay.frente(U, est.a, t, 2.2, { d: 3.8, acerca: 0.7, lado: 1.2, alto: 1.35, mira: 1.55, giro: 0.35, h: Math.PI * 1.8, vuelta: Math.PI }),
  },
  joaldun: {
    pueblo: 'ituren', hora: 11.0, tiempo: 'clear', seg: 2.6, antes: 24,
    prep: (U, est) => { est.a = window.__ay.carnaval(U, est); const p = est.a.pos; U.G.player.place(p.x + 14, p.z + 14, 0); U.G.player.obj.visible = false; window.__ay.despeja(U, est.a.pos, 14, [est.a, ...(est.folk || [])]); est.fog = [90, 1100]; },
    cuadro: (t, U, est) => window.__ay.frente(U, est.a, t, 2.6, { d: 4.2, acerca: 1.0, lado: 1.0, alto: 1.25, mira: 1.7, giro: 0.3 }),
  },
  momotxorro: {
    pueblo: 'altsasu-alsasua', hora: 21.6, tiempo: 'clear', seg: 2.6, antes: 24,
    // (de noche los momotxorros huyen del jugador; aquí se dan por encontrados para que se queden en la plaza)
    prep: (U, est) => { est.a = window.__ay.carnaval(U, est); for (const f of est.folk || []) { f.found = true; f.chase?.dispose?.(); f.chase = null; } const p = est.a.pos; U.G.player.place(p.x + 14, p.z + 14, 0); U.G.player.obj.visible = false; window.__ay.despeja(U, est.a.pos, 14, [est.a, ...(est.folk || [])]); est.fog = [40, 600]; },
    cuadro: (t, U, est) => window.__ay.frente(U, est.a, t, 2.6, { d: 4.4, acerca: 1.2, lado: -1.0, alto: 1.1, mira: 1.6, giro: -0.3, fov: 42 }),
  },
  // ---------- 30-36 s: las leyendas y la naturaleza ----------
  basajaun: {
    pueblo: 'otsagabia-ochagavia', hora: 19.2, tiempo: 'niebla', seg: 2.4, antes: 24,
    prep: (U, est) => { est.a = window.__ay.posa(U, U.G.npcs?.basajaun); const p = est.a.pos; U.G.player.place(p.x + 10, p.z + 10, 0); U.G.player.obj.visible = false; window.__ay.despeja(U, est.a.pos, 14, [est.a, ...(est.folk || [])]); est.fog = [8, 160]; },
    cuadro: (t, U, est) => window.__ay.frente(U, est.a, t, 2.4, { d: 5.0, acerca: 1.2, lado: 1.2, alto: 0.7, mira: 2.1, giro: 0.25, fov: 42 }),
  },
  lamia: {
    pueblo: 'otsagabia-ochagavia', hora: 18.6, tiempo: 'clear', seg: 2.4, antes: 24,
    prep: (U, est) => { est.a = window.__ay.posa(U, U.G.npcs?.lamia); const p = est.a.pos; U.G.player.place(p.x + 10, p.z + 10, 0); U.G.player.obj.visible = false; window.__ay.despeja(U, est.a.pos, 14, [est.a, ...(est.folk || [])]); est.fog = [60, 900]; },
    cuadro: (t, U, est) => window.__ay.frente(U, est.a, t, 2.4, { d: 3.6, acerca: 0.6, lado: -1.3, alto: 1.4, mira: 1.5, giro: -0.45 }),
  },
  // ---------- 36-50 s: la pelota en el Labrit, con público ----------
  pelotaLabrit: {
    campeonato: 'labrit', seg: 3.0, antes: 0,
    prep: (U, est) => {
      const m = U.G.pelotaMatch, g = m.game; est.g = g; est.grp = m.court.group;
      for (let i = 0; i < 9000; i++) { U.rt.step(1 / 30, U.G, U.G.input); const B = g.ball; if (g.phase === 'rally' && B.v.z < -6 && B.p.z > 12 && B.p.z < 17) break; }
    },
    cuadro: () => { },
    despues: (t, U, est) => {
      const B = est.g.ball.p, w = est.grp.localToWorld(U.v(B.x, B.y, B.z));
      est.lento = B.z < 3.2 && est.g.ball.v.z < 0 || (B.z < 4.5 && est.g.ball.v.z > 0) ? 0.3 : 1;
      const c = est.grp.localToWorld(U.v(Math.min(4.5, B.x + 4.2), 1.3 + Math.min(B.y, 4) * 0.35, Math.max(3, B.z + 5.5)));
      U.cam(c, w, 44);
    },
  },
};
