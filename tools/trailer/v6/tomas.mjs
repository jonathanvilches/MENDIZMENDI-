// Las tomas del tráiler v6 (23 nov 2026). El autor, del v5: «No me gusta nada de nada», y luego: «La voz me gusta. Quiero
// más ritmo». Así que: 60 s, la voz de Salva, cortes de un compás (1,89 s) o de medio (0,95 s) al golpe de la música épica
// del juego, nada de interfaz (sin botones, cuadros de diálogo ni menús: T.limpio en v5/juego.mjs) y los planos más
// vistosos, muchos con la cámara en movimiento (un dron que vuela, gira o acompaña). Encima, tres frases cortas y el logo.
// Y luego (23 nov): «hay muchos fallos de iluminación, de contraste, de legibilidad, falta de ritmo, imágenes del juego
// corriendo, andando en caballo, pero mucho más ágil»: todo a horas con buena luz (nada de noche, niebla ni atardecer), más
// carreras y galopes con la cámara al lado, delante o detrás del explorador, y esos trozos un poco acelerados (CORTES, vel).
// Se ruedan con la grabadora del v5: TOMAS=tools/trailer/v6/tomas.mjs node tools/trailer/v5/juego.mjs <toma[,toma…]> <carpeta>
// CORTES dice qué trozo de qué toma va en cada segundo del tráiler (v6/montaje.mjs); la música y las voces, v6/mezcla-v6.py.
import { AYUDA as AYUDA5, TOMAS as T5 } from '../v5/tomas.mjs';

// el compás de la canción (musica-torneos: 126,7 golpes por minuto) y el golpe de la música, a los 4 compases
export const BEAT = 0.4737, BAR = BEAT * 4, T0 = 4 * BAR, DURA = 60;
export const b = (k) => +(T0 + k * BAR).toFixed(3);

// las ayudas del v5 y, además, un dron que gira alrededor de un sitio (de un ángulo a otro, acercándose o alejándose, y
// subiendo o bajando), a velocidad fija para que en un corte corto se note el movimiento desde el primer fotograma
const EXTRA = () => {
  const J = window.__j; if (!J) return;
  // (la flecha amarilla y el haz del objetivo también son interfaz, aunque estén en el 3D: fuera en todas las tomas)
  const B = window.__rt?.beacon;
  if (B && !B.__limpio) { B.__limpio = true; const u = B.update.bind(B); B.update = (e, p, h, dt) => { u(e, p, true, dt); B.beam.visible = false; B.arrow.visible = false; }; }
  // un vecino que habla de cara: la cámara donde tendría la cabeza el explorador (que no se ve), un poco a un lado, y el
  // vecino mirándole; o.ly, la altura de la cara (los niños, más bajos). Desde detrás del explorador, él le tapaba la cara
  J.cara = (a, o = {}) => {
    const P = J.G.player;
    J.dron((t) => {
      P.obj.visible = false;
      const dx = P.pos.x - a.pos.x, dz = P.pos.z - a.pos.z, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, d = (o.d ?? 2.3) - t * 0.15, sd = o.s ?? 0.55, y = J.suelo(a.pos.x, a.pos.z);
      return { pos: [a.pos.x + ux * d - uz * sd, y + (o.y ?? 1.55), a.pos.z + uz * d + ux * sd], look: [a.pos.x, y + (o.ly ?? 1.45), a.pos.z] };
    });
  };
  J.orbita = (C, o) => J.dron((t) => {
    const k = Math.min(1, t / o.seg), a = o.a0 + (o.a1 - o.a0) * k, r = o.r0 + (o.r1 - o.r0) * k;
    const x = C.x + Math.cos(a) * r, z = C.z + Math.sin(a) * r, y0 = C.y ?? J.suelo(C.x, C.z);
    // (y siempre a buena altura sobre el suelo que tiene debajo: en un pueblo en cuesta, como Isaba, las casas de arriba
    // le quedaban a la altura y el dron se metía en una)
    const alto = o.y0 + (o.y1 - o.y0) * k, y = Math.max(J.suelo(x, z) + alto * 0.85, y0 + alto);
    return { pos: [x, y, z], look: [C.x, y0 + (o.mira ?? 2), C.z] };
  });
  // una cámara que acompaña al jugador (corriendo o a caballo): o(t) => { f, s, y, lf, ly }: delante (f), al lado (s) y
  // arriba (y) de él según hacia dónde va, mirando a un punto lf metros por delante y ly de alto
  J.pegada = (o) => J.dron((t) => {
    const P = J.G.player, h = P.heading, fx = Math.sin(h), fz = Math.cos(h), sx = fz, sz = -fx, q = o(t), y = P.pos.y;
    const x = P.pos.x + fx * q.f + sx * q.s, z = P.pos.z + fz * q.f + sz * q.s;
    return { pos: [x, Math.max(J.suelo(x, z) + 0.45, y + q.y), z], look: [P.pos.x + fx * (q.lf || 0), y + (q.ly ?? 1.2), P.pos.z + fz * (q.lf || 0)] };
  });
  // a caballo: el caballo debajo del jugador, ya en su sitio y a galope
  J.galope = () => {
    // (el juego busca un hueco libre de 1,6 m a un lado del jugador para dejar el caballo; en una calle estrecha no lo hay y
    // no lo crea: aquí se crea sin mirar, que enseguida se pone debajo del jugador)
    // (en Otsagabia el caballo es del juego, G.creaMontura; en los demás pueblos es de la aventura, G.av.montura, y ya
    // está junto a la entrada desde que se llega; si no lo hay, cambiaMontura lo crea)
    const G = J.G, P = G.player; let M;
    if (G.creaMontura) { const lib = G.libreEn; G.sinMontura = false; G.libreEn = () => true; try { M = G.creaMontura(); } finally { G.libreEn = lib; } }
    else { M = G.av?.montura; if (!M) { G.cambiaMontura?.('burguete'); M = G.av?.montura; } }
    if (!M?.A) throw new Error('sin montura');
    M.x = P.pos.x; M.z = P.pos.z; M.heading = P.heading; M.A.pos.set(P.pos.x, P.pos.y, P.pos.z); M.A.heading = P.heading; M.A.sync?.();
    M.sube(P); J.rt.follow.yaw = P.heading + Math.PI; J.rt.follow.snap?.(P); J.teclas(['w', 'shift']);
  };
  // (el centro de un pueblo para el dron: su puente famoso, su palacio o castillo, o la plaza)
  J.centro = () => {
    const L = window.__layout, T = window.__townB?.TOWN || {}, f = L?.MOD?.real?.puentes?.find(p => p.famoso)?.famoso;
    if (f?.ojo) return { x: f.ojo.x, z: f.ojo.z };
    const lm = (T.landmarks || []).find(l => /palace|castle|palacio|castillo/.test(l.kind || ''));
    if (lm) return { x: lm.x, z: lm.z };
    const p = L?.PLACES?.plaza || J.G.player.pos; return { x: p.x, z: p.z };
  };
};
export const AYUDA = new Function(`(${AYUDA5.toString()})(); (${EXTRA.toString()})();`);

const OT = 'town=otsagabia-ochagavia&q=high&skipintro=1';
const MAPA = (p) => p.waitForFunction(() => window.__mapa3d?.ren && window.__mapa3d.calentado?.(), null, { timeout: 300000 }).catch(() => { });
// una toma del v5, limpia y con otra duración
const de5 = (n, o) => ({ ...T5[n], limpio: true, ...o });
// un dron sobre un pueblo: gira alrededor de su centro (o.a0 → o.a1, en vueltas) a r metros y a y metros de alto
const pueblo = (town, o = {}) => ({
  url: `?town=${town}&q=high&skipintro=1&weather=clear&t=${o.hora ?? 11.5}`, seg: o.seg ?? 1.05, antes: 30, limpio: true,
  prep: eval(`() => { const J = window.__j; J.limpia(); const C = J.centro(); J.orbita(C, ${JSON.stringify({ seg: o.seg ?? 1.05, a0: (o.a0 ?? 0.1) * 6.283, a1: (o.a1 ?? 0.16) * 6.283, r0: o.r0 ?? 42, r1: o.r1 ?? 36, y0: o.y0 ?? 24, y1: o.y1 ?? 21, mira: 3 })}); }`),
});

// ---------- tercera vuelta (el autor, 23 nov: «falta toda la parte de oficios y mujeres y personajes y leyendas») ----------
// un oficio en su taller (game/talleres.js): el maestro (o la maestra) en su puesto, trabajando, con el fuego vivo, y la
// cámara que entra del plano del taller entero hacia el puesto. o.puesto: el puesto; o.act: el gesto del maestro; o.fx: las
// partículas que saltan en el puesto a cada golpe; o.hechos: los pasos ya hechos que se ven (la herradura al rojo…)
const FX = {
  chispas: { n: 26, color: ['#ffd27a', '#ff8a2a', '#fff2c0'], speed: 3.2, size: 0.12, life: 0.7, gravity: 6, spread: 0.1 },
  harina: { n: 18, color: ['#ffffff', '#f3ead8'], speed: 0.9, size: 0.22, life: 0.9, gravity: 0.6, spread: 0.3, drag: 1.5 },
  lascas: { n: 12, color: ['#d8ccb2', '#b9aa8b'], speed: 2.8, size: 0.07, life: 0.7, gravity: 8, spread: 0.12 },
  brasas: { n: 6, color: ['#ffb34a', '#ffe38a'], speed: 0.7, size: 0.08, life: 1.1, gravity: -0.8, spread: 0.15 },
};
const oficio = (town, o) => ({
  url: `?town=${town}&q=high&skipintro=1&weather=clear&t=${o.hora ?? 11.5}`, seg: o.seg ?? 2.2, antes: 30, limpio: true,
  prep: eval(`() => {
    const J = window.__j, G = J.G, P = G.player; J.limpia();
    const M = (G.missions || []).find(m => m.type === 'trade' && m.taller${o.kind ? ` && m.m.kind === '${o.kind}'` : ''}); if (!M) throw new Error('sin taller');
    const T = M.taller, h = M.host, p = T.puestos['${o.puesto}'] || T.puestos.taller, f = p.foco, de = p.de || T.puestos.maestro.de;
    const ap = T.puestos.aprendiz?.de || de; P.place(ap.x, ap.z, 0); P.frozen = true; J.teclas([]); P.obj.visible = false;
    if (h) { h.cancelPath?.(); h.goal = null; h.path = []; h.target = null; h.state = 'idle'; h.setPos(de.x, de.z, Math.atan2(f.x - de.x, f.z - de.z)); h.frozen = true; h.ignorePlayer = true; h.mira = f; }
    for (const id of ${JSON.stringify(o.hechos || [])}) T.paso(id);
    T.fuerza = 1; T.activo = '${o.puesto}';
    const fx = ${JSON.stringify(FX[o.fx] || null)}; let golpe = 0;
    window.__antes = () => { P.obj.visible = false; T.fuerza = 1; };
    window.__cada = (t) => { P.obj.visible = false; T.fuerza = 1; if (t >= golpe) { golpe = t + ${o.ritmo ?? 0.55}; ${o.act ? `h?.rig?.doAct?.('${o.act}', 0.45);` : ''} if (fx) G.particles?.emit({ x: f.x, y: f.y + ${o.fy ?? 0.1}, z: f.z }, fx); } };
    const A = T.puestos.taller.cam, B = p.cam || A, FA = T.puestos.taller.foco, k0 = ${o.k0 ?? 0.45}, k1 = ${o.k1 ?? 0.85};
    J.dron((t) => {
      const k = k0 + (k1 - k0) * Math.min(1, t / ${o.seg ?? 2.2}), m = Math.min(1, 0.6 + k * 0.5);
      return { pos: [A.x + (B.x - A.x) * k, A.y + (B.y - A.y) * k, A.z + (B.z - A.z) * k], look: [FA.x + (f.x - FA.x) * m, FA.y + (f.y - FA.y) * m + ${o.ly ?? 0.25}, FA.z + (f.z - FA.z) * m] };
    });
  }`),
});
// una vecina (o un vecino) de un pueblo, la de una misión: de cara, hablando, sin el cuadro de la charla
const vecina = (town, sel, frase, o = {}) => ({
  url: `?town=${town}&q=high&skipintro=1&weather=clear&t=${o.hora ?? 11.5}`, seg: o.seg ?? 1.3, antes: 30, limpio: true,
  prep: eval(`() => {
    const J = window.__j, G = J.G; J.limpia();
    const M = (G.missions || []).find(m => ${sel}), a = M?.host; if (!a) throw new Error('sin vecina');
    a.cancelPath?.(); a.goal = null; a.path = []; a.target = null; a.state = 'idle'; a.frozen = true;
    J.hacia(a, 2.6); J.teclas([]); J.charla(a, { habla: 0.05, para: 9, frases: [${JSON.stringify(frase)}] }); J.cara(a, ${JSON.stringify(o.cara || {})});
  }`),
});
// una criatura de leyenda (sorgina, Roldán…), aparecida ya junto a su guarida y de día, con la cámara que gira desde abajo
// (el juego la saca de noche, tras seguir las pistas; aquí se llama a la aparición sin el relevo de la persecución)
const criatura = (town, who, o = {}) => ({
  url: `?town=${town}&q=high&skipintro=1&weather=clear&t=${o.hora ?? 12}`, seg: o.seg ?? 2.2, antes: 36, limpio: true,
  prep: eval(`() => {
    const J = window.__j, G = J.G, P = G.player; J.limpia();
    const M = (G.missions || []).find(m => m.type === 'legend' && m.m.who === '${who}'); if (!M) throw new Error('sin leyenda');
    const T = window.__townB?.TOWN || {}, PL = window.__layout.PLACES, lm = (k) => (T.landmarks || []).find(l => l.kind === k), L = M.leg || {};
    const lp = L.lair === 'cave' ? (lm('cave')?.spot || PL.forest) : L.lair === 'river' ? (lm('bridge')?.spot || PL.riverSpot || PL.forest) : (PL.forest || PL.plaza);
    M.lair = G.spot(lp, 6);
    const st = window.setTimeout; window.setTimeout = () => 0; try { G.showCreature(M); } finally { window.setTimeout = st; }
    const a = M.creature; if (!a) throw new Error('sin criatura'); a.frozen = true; a.appear = 1;
    P.place(a.pos.x + 9, a.pos.z + 9, 0); P.frozen = true; J.teclas([]); P.obj.visible = false;
    window.__antes = () => { P.obj.visible = false; };
    const H = a.obj.userData.H || 2.4, h0 = (a.heading ?? 0) + ${o.a ?? 0.3};
    J.dron((t) => {
      P.obj.visible = false;
      const y = J.suelo(a.pos.x, a.pos.z), h = h0 + t * ${o.giro ?? 0.2}, d = H * ${o.d ?? 1.7} - t * 0.25;
      return { pos: [a.pos.x + Math.sin(h) * d, y + H * ${o.y ?? 0.35}, a.pos.z + Math.cos(h) * d], look: [a.pos.x, y + H * ${o.ly ?? 0.6}, a.pos.z] };
    });
  }`),
});

export const TOMAS = {
  // ---------- el principio: Navarra en el mapa y el Pirineo que sube como una isla ----------
  isla: { url: '?skipintro=1&q=high', seg: 4.2, antes: 4, espera: 12000, limpio: true, listo: MAPA,
    guion: [[0, (p) => p.evaluate(() => window.__mapa3d.comarca('pirineo'))]] },
  // ---------- Otsagabia: el dron que sube desde la calle mientras el explorador corre hacia la plaza ----------
  llegada: de5('llegada', { seg: 2.2 }),
  // ---------- el golpe de la música: la manada de momotxorros en la plaza de Altsasu, rojos y echando chispas ----------
  momo: {
    url: '?town=altsasu-alsasua&q=high&skipintro=1&weather=clear&t=13', seg: 4.0, antes: 84, limpio: true,
    prep: () => {
      const J = window.__j, G = J.G, P = G.player; J.limpia(); const PL = window.__layout.PLACES.plaza;
      P.place(PL.x + 3, PL.z + 3, 0); P.obj.visible = true; J.teclas([]);
      G.manadaMomotxorros();
      const T = window.__townB?.TOWN || {}, k = (T.landmarks || []).find(l => l.kind === 'kiosk' || l.kind === 'nogal'), C = k ? { x: k.x, z: k.z } : { x: PL.x, z: PL.z };
      // (girando alrededor del kiosco por encima de los que bailan, a 3,6 m, sobre los postes y carteles de la plaza; a los
      // 2 s, el segundo trozo: desde arriba, dentro de la plaza, mirando la manada. A 2,6 m tapaba un poste indicador y, a
      // 17 m del kiosco, la cámara quedaba detrás de las casas. A mediodía: por la tarde, con el rojo de la fiesta, oscura)
      const R = Math.min(10, (PL.r || 14) * 0.6);
      // (el giro bajo, hacia el otro lado: hacia 0,8 rad lo cruzaba otro poste indicador. Y el rojo de la fiesta, a menos de
      // la mitad: a tope, el velo y el tinte dejaban la plaza oscura y turbia; así se nota la fiesta y se ve la manada)
      // (el juego rehace el tinte en cada fotograma y lo aplica después de mover la cámara: se rebaja aquí, al 40 %, con el
      // velo de los bordes)
      const menosRojo = () => { const T = G.tinte, D = G.desfileOn; if (T && !T.__m) { T.__m = 1; T.k *= 0.4; T.parpadeo *= 0.4; } if (D?.velo) D.velo.style.opacity = (D.k * 0.4).toFixed(2); };
      window.__antes = menosRojo;
      J.dron((t) => {
        menosRojo();
        const y0 = J.suelo(C.x, C.z), alto = t < 2 ? 0 : 1, a = alto ? 2.2 + t * 0.3 : 0.4 - t * 0.3, r = alto ? R : 8;
        return { pos: [C.x + Math.cos(a) * r, y0 + (alto ? 14 : 3.6), C.z + Math.sin(a) * r], look: [C.x, y0 + (alto ? 0 : 1.0), C.z] };
      });
    },
  },
  // ---------- a caballo, a galope por el prado: de lado, acompañándole, y luego de frente, desde abajo ----------
  caballo: {
    url: `?${OT}&weather=clear&t=15.6`, seg: 4.4, antes: 20, limpio: true,
    prep: () => {
      const J = window.__j, P = J.G.player; J.limpia(); J.corre(null, 55); J.teclas([]); J.galope();
      J.dron((t) => {
        const h = P.heading, fx = Math.sin(h), fz = Math.cos(h), sx = fz, sz = -fx, y = P.pos.y;
        if (t < 2) return { pos: [P.pos.x + sx * 6.5 + fx * (0.5 - t * 0.6), y + 1.9, P.pos.z + sz * 6.5 + fz * (0.5 - t * 0.6)], look: [P.pos.x + fx * 1.5, y + 1.5, P.pos.z + fz * 1.5] };
        const d = 5.8 - (t - 2) * 0.6;
        return { pos: [P.pos.x + fx * d + sx * 1.4, y + 0.7, P.pos.z + fz * d + sz * 1.4], look: [P.pos.x, y + 1.9, P.pos.z] };
      });
    },
  },
  // ---------- «Cada vecino te pide ayuda…»: los vecinos de cerca, hablando (sin el cuadro de la charla) ----------
  maite: de5('maite', { seg: 2.0, antes: 30, url: `?${OT}&weather=clear&t=11.2`,
    // (el cartel «OTSAGABIA / Ochagavía» que hay junto al crucero, fuera del plano: desde cualquier lado sus postes y su
    // tabla oscura se metían, detrás de ella, en medio o pegados a la cámara, y los postes no se pueden esconder)
    prep: () => {
      const J = window.__j, a = J.G.npcs.maite, d = (o) => Math.hypot(o.position.x - a.pos.x, o.position.z - a.pos.z);
      const S = J.G.scene.children.filter(c => c.isGroup && c.children.length === 3 && c.children[1]?.material?.map?.isCanvasTexture).sort((p, q) => d(p) - d(q))[0];
      // (Maite, quieta y a unos 9 m del cartel, en un sitio despejado; la cámara entre ella y el cartel, que queda a la
      // espalda de la cámara)
      if (S) {
        S.visible = false; const dx = a.pos.x - S.position.x, dz = a.pos.z - S.position.z, L = Math.hypot(dx, dz) || 1;
        for (const k of [9, 10.5, 7.5, 12]) { const x = S.position.x + dx / L * k, z = S.position.z + dz / L * k; if (J.ok(x, z, 1)) { a.setPos(x, z, a.heading ?? 0); break; } }
        a.frozen = true;
      }
      J.limpia(); J.hacia(a, 2.6, S ? { h: Math.atan2(S.position.x - a.pos.x, S.position.z - a.pos.z) } : {});
      J.charla(a, { habla: 0.05, frases: ['¡Kaixo! Soy Maite. ¡Ongi etorri a Otsagabia!'] }); J.cara(a);
    } }),
  kike: de5('kike', { seg: 1.05, url: `?${OT}&weather=clear&t=12.4`, antes: 30,
    prep: () => { const J = window.__j, a = J.G.npcs.kike; if (!a) throw new Error('sin kike'); J.limpia(); a.frozen = true; a.state = 'idle'; J.hacia(a, 2.4); J.teclas([]); J.charla(a, { habla: 0.05, para: 9, frases: ['¡Aupa! Soy Kike. ¿Juegas a pelota?'] }); J.cara(a, { d: 1.9, y: 1.15, ly: 1.0 }); } }),
  // («el pastoreo, el carnaval, las leyendas»)
  pastoreo: de5('pastoreo', { seg: 1.05, url: `?${OT}&weather=clear&t=10.8` }),
  // (los joaldunak de Ituren, de frente y desde abajo, con la cámara que va hacia atrás delante de la comparsa)
  carnaval: de5('carnaval', { seg: 2.2,
    prep: () => {
      const J = window.__j, G = J.G; J.limpia(); const M = (G.missions || []).find(m => m.type === 'carnival'); if (!M) throw new Error('sin carnaval');
      // (el jugador, en la plaza y sin verse: la comparsa solo se ve y se mueve cerca de él; a la entrada del pueblo no salía)
      const pl = window.__layout.PLACES.plaza, P = G.player; P.place(pl.x + 5, pl.z + 5, 0); J.teclas([]); window.__antes = () => { P.obj.visible = false; };
      M.count = M.need; G.desfileCarnaval(M, pl);
      J.dron((t) => {
        P.obj.visible = false;
        const g = G.desfileOn?.gente || [], a = g[Math.min(2, g.length - 1)];
        if (!a) { const p = J.G.player.pos; return { pos: [p.x + 6, p.y + 3, p.z + 6], look: [p.x, p.y + 1, p.z] }; }
        const h = a.heading ?? 0, fx = Math.sin(h), fz = Math.cos(h), d = 4.6 - t * 0.35, y = J.suelo(a.pos.x, a.pos.z);
        return { pos: [a.pos.x + fx * d + fz * 1.4, y + 1.05, a.pos.z + fz * d - fx * 1.4], look: [a.pos.x, y + 1.7, a.pos.z] };
      });
    } }),
  // (la lamia peinándose junto a la poza: el dron se le acerca despacio)
  lamia: de5('lamia', { seg: 2.2, antes: 30, url: `?${OT}&weather=clear&t=12.6`,
    prep: () => {
      const J = window.__j, a = J.G.npcs.lamia; if (!a) throw new Error('sin lamia'); J.limpia(); J.hacia(a, 7); J.teclas([]);
      // (delante de ella, hacia donde mira, para que se le vea la cara: desde donde estaba el jugador salía de lado o de espaldas)
      J.G.player.obj.visible = false;
      J.dron((t) => { J.G.player.obj.visible = false; const y = J.suelo(a.pos.x, a.pos.z), h = (a.heading ?? 0) + 0.35 + t * 0.1, d = 4.6 - t * 0.6; return { pos: [a.pos.x + Math.sin(h) * d, y + 1.55, a.pos.z + Math.cos(h) * d], look: [a.pos.x, y + 1.3, a.pos.z] }; });
    } }),
  // (el Basajaun en el bosque, enorme, desde abajo, girando a su alrededor)
  basajaun: de5('basajaun', { seg: 3.0, antes: 30, url: `?${OT}&weather=clear&t=13.2`,
    prep: () => {
      const J = window.__j, a = J.G.npcs.basajaun; if (!a) throw new Error('sin basajaun'); J.limpia(); J.hacia(a, 6); J.teclas([]);
      J.G.player.obj.visible = false;
      J.dron((t) => { const y = J.suelo(a.pos.x, a.pos.z), h = (a.heading ?? 0) + 0.5 + t * 0.22, d = 4.4; return { pos: [a.pos.x + Math.sin(h) * d, y + 0.9, a.pos.z + Math.cos(h) * d], look: [a.pos.x, y + 2.3, a.pos.z] }; });
    } }),
  // ---------- la almadía por el Esca de Burgui, hacia el puente medieval ----------
  almadia: {
    url: '?town=burgui-burgi&q=high&skipintro=1&weather=clear&t=11', seg: 3.0, antes: 40, limpio: true,
    // (la bajada se monta en la carga, a tiempo real: el juego la prepara con cargas y esperas que, con el reloj de la
    // grabación ya parado, no acababan nunca)
    listo: async (p) => {
      await p.waitForFunction(() => window.__game?.mode === 'play' && window.__rt?.active, null, { timeout: 600000 });
      await p.evaluate(async () => {
        const G = window.__game; window.__autoWin = true;
        const mod = await import('/src/game/almadia.js'), M = G.missions.find(m => m.type === 'race' && m.m.kind === 'almadia');
        mod.jugarAlmadia(G, M, async () => { });
      });
      await p.waitForFunction(() => window.__game?.almadia, null, { timeout: 180000 });
    },
    prep: () => {
      const J = window.__j, G = J.G, A = G.almadia; if (!A) throw new Error('sin almadía');
      if (A.flechas?.P) for (const f of A.flechas.P) if (f?.visible != null) f.visible = false;
      const flechas = G.scene.getObjectByName('flechas de la almadía'); if (flechas) flechas.visible = false;
      // (a unos 70 m del puente; el piloto la lleva por el ojo del puente y lejos de las peñas, a buen ritmo)
      A.s = Math.max(A.s, A.sPuente - 70); A.huella = [];
      const orig = A.update.bind(A);
      const meta = () => { const sb = A.s; if (A.fam && Math.abs(sb - A.sPuente) < 50) return A.uOjo; let u = 0; for (const o of A.obst) { if (o.s < sb - 22 || o.s > sb + 34) continue; u = o.u > 0 ? Math.min(u, o.u - o.r - 2.8) : Math.max(u, o.u + o.r + 2.8); } return u; };
      A.update = (dt, input, P) => { const e = meta() - A.u; orig(dt * 1.8, { move: { x: Math.max(-1, Math.min(1, e * 0.9 - A.vu * 0.3)) * A.derecha(), y: 0.6 }, consume() { } }, P); };
    },
  },
  // ---------- «La naturaleza y la cultura, contadas jugando» ----------
  bosque: de5('bosque', { seg: 2.65 }),
  // (los dantzaris de Muskilda de cerca y a su altura, girando alrededor del corro; la cámara del juego, de lejos y alta,
  // los dejaba diminutos con medio plano de campo arado. Del lado que el juego escoge sin copas de árboles delante)
  danza: de5('danza', { seg: 3.05,
    prep: () => {
      const J = window.__j, G = J.G; J.limpia();
      import('/src/game/content.js').then(m => { G.state.ribbons = m.RIBBONS.map(r => r.id); G.refreshHUD?.(); });
      G.startDance();
      const pulsa = () => {
        G.player.obj.visible = false;   // (el explorador, que baila delante, tapaba con la cabeza el principio del giro)
        const d = G.dn; if (!d) return; const teclas = ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'];
        for (const s of d.seq) if (!s.__p && s.t <= d.t + 1 / 24 && s.t > d.t - 0.2) { s.__p = 1; window.dispatchEvent(new KeyboardEvent('keydown', { key: teclas[s.lane], bubbles: true })); }
      };
      window.__antes = pulsa; window.__cada = pulsa;
      // (el juego pone uno de los bancos de la explanada entre las dos filas de dantzaris; va en los lotes comunes de madera
      // y hierro, que además sueltan su copia de los vértices al subirlos a la tarjeta, así que se recorta: una caja de seis
      // planos de corte alrededor del banco en esos dos materiales, también en su sombra. Mover el corro no sirve: al norte
      // y al oeste el suelo es campo arado, y desde la puerta de la ermita se ve el campo detrás)
      const D = G.dancers.filter(d => d.visible !== false), n = D.length || 1;
      const C = { x: D.reduce((s, d) => s + d.pos.x, 0) / n, z: D.reduce((s, d) => s + d.pos.z, 0) / n }, cp = G.follow.cinematic?.pos;
      import('/src/world/village.js').then(({ VILLAGE }) => {
        const b = (VILLAGE.benches || []).filter(b => Math.hypot(b.x - C.x, b.z - C.z) < 4)[0]; if (!b) return;
        const pl = (x, y, z, c) => ({ normal: { x, y, z }, constant: c }), R = 1.3;
        const cortes = [pl(-1, 0, 0, b.x - R), pl(1, 0, 0, -(b.x + R)), pl(0, -1, 0, b.y - 0.6), pl(0, 1, 0, -(b.y + 1.4)), pl(0, 0, -1, b.z - R), pl(0, 0, 1, -(b.z + R))];
        const mats = new Set(); G.scene.traverse(o => { if (o.isMesh && /^(iron|wood)\|/.test(o.name)) mats.add(o.material); });
        for (const m of mats) { m.clippingPlanes = cortes; m.clipIntersection = true; m.needsUpdate = true; }
        J.rt.renderer.localClippingEnabled = true;
      });
      const a0 = cp ? Math.atan2(cp.z - C.z, cp.x - C.x) : 0;
      J.orbita(C, { seg: 3.05, a0: a0 - 0.45, a1: a0 + 0.45, r0: 7.5, r1: 6, y0: 1.9, y1: 2.4, mira: 1.1 });
    } }),
  // ---------- la pelota: un partido en el Labrit y la txapela ----------
  partido: de5('partido', { seg: 6.0 }),
  // (la entrega: la txapela que baja a la cabeza del campeón y, en el segundo trozo, la copa arriba con el confeti dorado;
  // a 24 por segundo, que la ceremonia no avanza más de 0,05 s por imagen)
  cere: {
    url: '?town=lumbier&q=high&weather=clear&skipintro=1', seg: 3.95, fps: 24, antes: 4, espera: 0, limpio: true,
    listo: async (p) => {
      await p.waitForFunction(() => window.__game?.mode === 'play' && window.__rt?.active, null, { timeout: 600000 });
      await p.evaluate(() => { window.__ceremonia = true; const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host, { camp: { titulo: 'Campeonato Manomanista', donde: 'Navarra' } }); });
      await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 300000 });
      await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click());
      await p.waitForFunction(() => ['serveWait', 'servePrep', 'rally'].includes(window.__game.pelotaMatch?.game?.phase), null, { timeout: 300000 });
      await p.evaluate(() => { const M = window.__game.pelotaMatch; M.o.camp = { titulo: 'Campeonato Manomanista', donde: 'Navarra' }; M.game.score.you = 9; M.game.score.rival = 6; M.cerePend = { win: true, score: { you: 9, rival: 6 } }; M.ceremonia(); });
      await p.waitForFunction(() => (window.__game.pelotaMatch?.cere?.t ?? -1) >= 0, null, { timeout: 300000 });
    },
    prep: () => { const c = window.__game.pelotaMatch?.cere; if (c) c.t = 2.62; },
    guion: [[2.0, (p) => p.evaluate(() => { const c = window.__game.pelotaMatch?.cere; if (c) c.t = 6.3; })]],
  },
  // ---------- el dron alto sobre Otsagabia y el río, y otra comarca que sube en el mapa ----------
  rio: pueblo('otsagabia-ochagavia', { seg: 2.0, hora: 10.6, a0: 0.62, a1: 0.7, r0: 58, r1: 48, y0: 34, y1: 28 }),
  isla2: { url: '?skipintro=1&q=high', seg: 2.2, antes: 4, espera: 12000, limpio: true, listo: MAPA,
    guion: [[0, (p) => p.evaluate(() => window.__mapa3d.comarca('bidasoa'))]] },
  // ---------- el explorador corriendo y a caballo, con la cámara pegada ----------
  // (Otsagabia: corre por la calle hacia la plaza, que pasa por el puente; de frente y desde abajo y, en el segundo trozo,
  // desde detrás y algo arriba: de lado, el pretil del puente lo tapaba)
  correcalle: {
    url: `?${OT}&weather=clear&t=11`, seg: 3.6, antes: 24, limpio: true,
    prep: () => {
      const J = window.__j; J.limpia(); J.corre(window.__layout.PLACES.plaza, 40, { solo: true, snap: true, margen: 4 });
      J.pegada((t) => t < 2.3 ? { f: 4.6, s: 0.9, y: 0.75, lf: 0, ly: 1.15 } : { f: -4.2, s: 1.4, y: 2.4, lf: 8, ly: 1.0 });
    },
  },
  // (Isaba, con el Pirineo detrás: de lado, un poco por detrás)
  correisaba: {
    url: '?town=isaba-izaba&q=high&skipintro=1&weather=clear&t=11.4', seg: 2.5, antes: 24, limpio: true,
    prep: () => { const J = window.__j; J.limpia(); J.corre(null, 40, { solo: true, snap: true }); J.pegada((t) => ({ f: -1.2 + t * 0.5, s: -4.6, y: 1.4, lf: 2, ly: 1.3 })); },
  },
  // (la selva de Irati: detrás y abajo, con los troncos pasando)
  correirati: {
    url: '?town=selva-irati&q=high&skipintro=1&weather=clear&t=12.2', seg: 1.2, antes: 24, limpio: true,
    prep: () => { const J = window.__j; J.limpia(); J.corre(window.__layout.PLACES.forest, 28, { snap: true }); J.pegada(() => ({ f: -3.4, s: 0.7, y: 1.0, lf: 6, ly: 1.3 })); },
  },
  // (las Bardenas: de lado, con las rocas del suelo pasando por delante y los cabezos detrás)
  correbardenas: {
    url: '?town=bardenas-reales&q=high&skipintro=1&weather=clear&t=11.8', seg: 2.5, antes: 24, limpio: true,
    prep: () => { const J = window.__j; J.limpia(); J.corre(null, 45, { snap: true }); J.pegada((t) => ({ f: 1.2 - t * 0.5, s: 6, y: 1.8, lf: 1, ly: 1.0 })); },
  },
  // (a caballo por el prado de Isaba: de frente y desde abajo; en el segundo trozo, desde detrás y arriba)
  caballo2: {
    url: '?town=isaba-izaba&q=high&skipintro=1&weather=clear&t=12', seg: 2.5, antes: 20, limpio: true,
    prep: () => {
      const J = window.__j; J.limpia(); J.corre(null, 55); J.teclas([]); J.galope();
      J.pegada((t) => t < 1.25 ? { f: 7.2 - t * 0.8, s: 1.8, y: 0.8, lf: 0, ly: 1.9 } : { f: -6, s: -1.5, y: 3.2, lf: 8, ly: 1.2 });
    },
  },
  // ---------- «Explora 38 pueblos»: pueblos desde el aire ----------
  olite: pueblo('olite', { a0: 0.05, a1: 0.11 }),
  // (mucho más alto y lejos, fuera del pueblo: a 30 m y a 80 m de su centro el dron aún iba encima de las casas y el
  // plano eran tejados de cerca; Isaba es grande y en cuesta)
  isaba: pueblo('isaba-izaba', { a0: 0.55, a1: 0.6, r0: 150, r1: 135, y0: 80, y1: 72 }),
  puente: pueblo('puente-la-reina', { a0: 0.2, a1: 0.27, r0: 34, r1: 28, y0: 14, y1: 11 }),
  // ---------- debajo del logo: la isla del Pirineo ya arriba, con la cámara girando despacio ----------
  // ---------- tercera vuelta: oficios, mujeres, personajes y leyendas ----------
  // los talleres: el herrero de Lesaka en el yunque, con la fragua viva y chispas a cada martillazo; Pili, la panadera de
  // Artajona, en la boca del horno; el tonelero de Viana junto al fuego de las barricas
  herrero: oficio('lesaka', { kind: 'herrero', puesto: 'yunque', act: 'hammer', fx: 'chispas', hechos: ['tenazas', 'fragua'], fy: 0.05 }),
  panadera: oficio('artajona', { kind: 'panadero', puesto: 'horno', act: 'pick', fx: 'brasas', ritmo: 0.7 }),
  tonelero: oficio('viana', { kind: 'tonelero', puesto: 'fuego', act: 'hammer', fx: 'brasas', ritmo: 0.6 }),
  // las vecinas que dan las misiones: Itziar en Otsagabia, Maialen la aizkolari de Leitza, la amona Felisa, hilandera de
  // Roncal, la amona Graxi, que cuenta la noche de las sorginak de Zugarramurdi, y Nerea, la guarda del río de Lesaka
  itziar: de5('itziar', { seg: 1.3, antes: 30, url: `?${OT}&weather=clear&t=11.6`,
    prep: () => { const J = window.__j, a = J.G.npcs.itziar; if (!a) throw new Error('sin itziar'); a.frozen = true; J.limpia(); J.hacia(a, 2.6); J.teclas([]); J.charla(a, { habla: 0.05, para: 9, frases: ['¿Sabes que en Otsagabia hay palacios con escudos de piedra?'] }); J.cara(a); } }),
  maialen: vecina('leitza', "m.type === 'trade' && m.m.kind === 'aizkolari'", '¡Kaixo! Soy Maialen, aizkolari.'),
  felisa: vecina('erronkari-roncal', "m.type === 'trade' && m.m.kind === 'hilandera'", 'De la oveja al ovillo, como hacía mi amona.'),
  graxi: vecina('zugarramurdi', "m.type === 'legend' && m.m.who === 'sorgina'", 'En la noche de San Juan, las sorginak bailan en la cueva…'),
  nerea: vecina('lesaka', "m.m.id === 'salmon'", 'El salmón vuelve río arriba. ¡Cuidemos el agua!'),
  // las leyendas que faltaban: la sorgina junto a la cueva de Zugarramurdi y la sombra de Roldán en Orreaga
  sorgina: criatura('zugarramurdi', 'sorgina'),
  roldan: criatura('orreaga-roncesvalles', 'roldan', { hora: 17.5 }),
  // la exploradora: corriendo por Roncal, de frente y desde abajo, y a galope por el valle de Larraun
  correA: {
    url: '?town=erronkari-roncal&q=high&skipintro=1&weather=clear&t=11.5', seg: 2.5, antes: 24, limpio: true, avatar: 'exploradora',
    prep: () => { const J = window.__j; J.limpia(); J.corre(null, 40, { solo: true, snap: true }); J.pegada((t) => ({ f: 4.4 - t * 0.3, s: 0.8, y: 0.75, lf: 0, ly: 1.15 })); },
  },
  galopeA: {
    url: '?town=lekunberri&q=high&skipintro=1&weather=clear&t=11', seg: 2.5, antes: 20, limpio: true, avatar: 'exploradora',
    prep: () => {
      const J = window.__j; J.limpia(); J.corre(null, 55); J.teclas([]); J.galope();
      J.pegada((t) => ({ f: 1.5 - t * 0.9, s: 5.2, y: 1.6, lf: 1.5, ly: 1.5 }));
    },
  },
  final: { url: '?skipintro=1&q=high', seg: 7.0, antes: 72, espera: 12000, limpio: true, listo: MAPA,
    prep: () => { window.__mapa3d.comarca('pirineo'); } },
};

// el montaje: [segundo del tráiler, toma, desde qué segundo de la toma]; cada corte dura hasta el siguiente
export const CORTES = [
  // [segundo del tráiler, toma, desde qué segundo de la toma, velocidad (1 si no se dice)]
  // (cada trozo empieza lo bastante pronto para no quedarse sin imágenes al final: si no, la última se repetía y el plano
  // se paraba justo antes del corte)
  // la intro (4 compases): la isla, el dron de Otsagabia y el explorador que echa a correr en el silencio de antes del golpe
  [0, 'isla', 0.27], [b(-2), 'llegada', 0.15], [b(-1), 'correcalle', 0, 1.2],
  // el golpe: los momotxorros y el caballo
  [b(0), 'momo', 0], [b(1), 'caballo', 0, 1.2],
  // «Cada vecino te pide ayuda, y cada misión te enseña algo: el pastoreo, el carnaval, las leyendas»
  [b(2), 'maite', 0], [b(3), 'correcalle', 2.32, 1.2], [b(3.5), 'kike', 0], [b(4), 'caballo2', 0, 1.2],
  [b(4.5), 'pastoreo', 0], [b(5), 'carnaval', 0], [b(5.5), 'lamia', 0],
  // «¡Oooh! Una personita en mi bosque…», la almadía y la carrera por las Bardenas
  [b(6), 'basajaun', 0], [b(7), 'almadia', 0], [b(7.5), 'correbardenas', 0, 1.2],
  // «La naturaleza y la cultura, contadas jugando»
  [b(8), 'bosque', 1.6], [b(8.5), 'correirati', 0, 1.1], [b(9), 'danza', 0],
  // la pelota y «¡Eres un txapeldun, un campeón!» (el partido, desde que el pelotari echa a andar: antes está 0,7 s quieto)
  [b(10), 'partido', 0.75], [b(11), 'partido', 2.7], [b(12), 'cere', 0], [b(13), 'cere', 2.0],
  [b(14), 'rio', 0], [b(14.5), 'correisaba', 0, 1.2], [b(15), 'isla2', 0],
  // EXPLORA 38 PUEBLOS
  [b(16), 'olite', 0], [b(16.5), 'correbardenas', 1.25, 1.2], [b(17), 'isaba', 0], [b(17.5), 'puente', 0],
  // DESCUBRE SUS LEYENDAS (la cueva de Aralar se quitó: de día no se ve la sombra de Teodosio y de noche sale oscura)
  [b(18), 'lamia', 1.07], [b(18.5), 'basajaun', 1.92], [b(19), 'momo', 2.0],
  // VIVE SUS TRADICIONES
  [b(20), 'carnaval', 1.07], [b(20.5), 'danza', 2.0], [b(21), 'almadia', 1.92], [b(21.5), 'partido', 4.6],
  // los últimos, a galope y corriendo, y el logo
  [b(22), 'caballo2', 1.25, 1.2], [b(22.5), 'correisaba', 1.25, 1.2], [b(23), 'caballo', 2.0, 1.2], [b(24), 'final', 0, 0.985],
];
// los rótulos: [desde, hasta, imagen] (v6/rotulos.mjs)
export const ROTULOS = [[b(16) + 0.1, b(18) - 0.12, 'explora'], [b(18) + 0.1, b(20) - 0.12, 'descubre'], [b(20) + 0.1, b(22) - 0.12, 'vive'], [b(24) + 0.35, DURA, 'logo']];
