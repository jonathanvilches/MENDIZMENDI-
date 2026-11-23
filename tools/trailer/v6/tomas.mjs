// Las tomas del tráiler v6 (23 nov 2026). El autor, del v5: «No me gusta nada de nada», y luego: «La voz me gusta. Quiero
// más ritmo». Así que: 60 s, la voz de Salva, cortes de un compás (1,89 s) o de medio (0,95 s) al golpe de la música épica
// del juego, nada de interfaz (sin botones, cuadros de diálogo ni menús: T.limpio en v5/juego.mjs) y los planos más
// vistosos, muchos con la cámara en movimiento (un dron que vuela, gira o acompaña). Encima, tres frases cortas y el logo.
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
  J.orbita = (C, o) => J.dron((t) => {
    const k = Math.min(1, t / o.seg), a = o.a0 + (o.a1 - o.a0) * k, r = o.r0 + (o.r1 - o.r0) * k;
    const x = C.x + Math.cos(a) * r, z = C.z + Math.sin(a) * r, y0 = C.y ?? J.suelo(C.x, C.z);
    const y = Math.max(J.suelo(x, z) + 2.5, y0 + o.y0 + (o.y1 - o.y0) * k);
    return { pos: [x, y, z], look: [C.x, y0 + (o.mira ?? 2), C.z] };
  });
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

export const TOMAS = {
  // ---------- el principio: Navarra en el mapa y el Pirineo que sube como una isla ----------
  isla: { url: '?skipintro=1&q=high', seg: 4.2, antes: 4, espera: 12000, limpio: true, listo: MAPA,
    guion: [[0, (p) => p.evaluate(() => window.__mapa3d.comarca('pirineo'))]] },
  // ---------- Otsagabia: el dron que sube desde la calle mientras el explorador corre hacia la plaza ----------
  llegada: de5('llegada', { seg: 2.2 }),
  // ---------- la sombra de Teodosio en la cueva de Aralar, con niebla («…guarda una historia») ----------
  leyenda: de5('leyenda', { seg: 3.2 }),
  // ---------- el golpe de la música: la manada de momotxorros en la plaza de Altsasu, rojos y echando chispas ----------
  momo: {
    url: '?town=altsasu-alsasua&q=high&skipintro=1&weather=clear&t=20.2', seg: 3.2, antes: 84, limpio: true,
    prep: () => {
      const J = window.__j, G = J.G, P = G.player; J.limpia(); const PL = window.__layout.PLACES.plaza;
      P.place(PL.x + 3, PL.z + 3, 0); P.obj.visible = true; J.teclas([]);
      G.manadaMomotxorros();
      const T = window.__townB?.TOWN || {}, k = (T.landmarks || []).find(l => l.kind === 'kiosk' || l.kind === 'nogal'), C = k ? { x: k.x, z: k.z } : { x: PL.x, z: PL.z };
      // (cerca y bajo, girando alrededor del kiosco entre los que bailan; a los 2 s, el segundo trozo, desde más arriba)
      J.dron((t) => {
        const y0 = J.suelo(C.x, C.z), alto = t < 2 ? 0 : 1, a = (alto ? 2.2 : 0.4) + t * 0.32, r = alto ? 17 : 10.5;
        return { pos: [C.x + Math.cos(a) * r, y0 + (alto ? 9 : 2.6), C.z + Math.sin(a) * r], look: [C.x, y0 + (alto ? 0.5 : 1.6), C.z] };
      });
    },
  },
  // ---------- a caballo, a galope por el prado: de lado, acompañándole, y luego de frente, desde abajo ----------
  caballo: {
    url: `?${OT}&weather=clear&t=17.4`, seg: 4.0, antes: 20, limpio: true,
    prep: () => {
      const J = window.__j, G = J.G, P = G.player; J.limpia(); J.corre(null, 45); J.teclas([]);
      const M = G.creaMontura?.(); if (!M?.A) throw new Error('sin montura');
      M.x = P.pos.x; M.z = P.pos.z; M.heading = P.heading; M.A.pos.set(P.pos.x, P.pos.y, P.pos.z); M.A.heading = P.heading; M.A.sync?.();
      M.sube(P); J.rt.follow.yaw = P.heading + Math.PI; J.rt.follow.snap?.(P); J.teclas(['w', 'shift']);
      J.dron((t) => {
        const h = P.heading, fx = Math.sin(h), fz = Math.cos(h), sx = fz, sz = -fx, y = P.pos.y;
        if (t < 2) return { pos: [P.pos.x + sx * 6.5 + fx * (0.5 - t * 0.6), y + 1.9, P.pos.z + sz * 6.5 + fz * (0.5 - t * 0.6)], look: [P.pos.x + fx * 1.5, y + 1.5, P.pos.z + fz * 1.5] };
        const d = 7.5 - (t - 2) * 0.8;
        return { pos: [P.pos.x + fx * d + sx * 1.6, y + 0.8, P.pos.z + fz * d + sz * 1.6], look: [P.pos.x, y + 1.9, P.pos.z] };
      });
    },
  },
  // ---------- «Cada vecino te pide ayuda…»: los vecinos de cerca, hablando (sin el cuadro de la charla) ----------
  maite: de5('maite', { seg: 2.0, antes: 30,
    prep: () => { const J = window.__j, a = J.G.npcs.maite; J.limpia(); J.hacia(a, 2.6); J.charla(a, { habla: 0.05, frases: ['¡Kaixo! Soy Maite. ¡Ongi etorri a Otsagabia!'] }); } }),
  kike: de5('kike', { seg: 2.0 }),
  joxemari: de5('joxemari', { seg: 1.05 }),
  // («el pastoreo, el carnaval, las leyendas»)
  pastoreo: de5('pastoreo', { seg: 1.05 }),
  // (los joaldunak de Ituren, de frente y desde abajo, con la cámara que va hacia atrás delante de la comparsa)
  carnaval: de5('carnaval', { seg: 2.2,
    prep: () => {
      const J = window.__j, G = J.G; J.limpia(); const M = (G.missions || []).find(m => m.type === 'carnival'); if (!M) throw new Error('sin carnaval');
      M.count = M.need; G.desfileCarnaval(M, window.__layout.PLACES.plaza);
      J.dron((t) => {
        const g = (G.desfileOn?.gente || []).filter(a => a.obj?.visible !== false), a = g[Math.min(2, g.length - 1)];
        if (!a) { const p = J.G.player.pos; return { pos: [p.x + 6, p.y + 3, p.z + 6], look: [p.x, p.y + 1, p.z] }; }
        const h = a.heading ?? 0, fx = Math.sin(h), fz = Math.cos(h), d = 4.6 - t * 0.35, y = J.suelo(a.pos.x, a.pos.z);
        return { pos: [a.pos.x + fx * d + fz * 1.4, y + 1.05, a.pos.z + fz * d - fx * 1.4], look: [a.pos.x, y + 1.7, a.pos.z] };
      });
    } }),
  // (la lamia peinándose junto a la poza: el dron se le acerca despacio)
  lamia: de5('lamia', { seg: 2.2, antes: 30,
    prep: () => {
      const J = window.__j, a = J.G.npcs.lamia; if (!a) throw new Error('sin lamia'); J.limpia(); J.hacia(a, 7); J.teclas([]);
      const P = J.G.player, dx = P.pos.x - a.pos.x, dz = P.pos.z - a.pos.z, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
      P.obj.visible = false;
      J.dron((t) => { const y = J.suelo(a.pos.x, a.pos.z), d = 5.2 - t * 0.7, s = 0.25 + t * 0.12; return { pos: [a.pos.x + (ux * Math.cos(s) - uz * Math.sin(s)) * d, y + 1.7, a.pos.z + (uz * Math.cos(s) + ux * Math.sin(s)) * d], look: [a.pos.x, y + 1.25, a.pos.z] }; });
    } }),
  // (el Basajaun en el bosque con niebla, enorme, desde abajo, girando a su alrededor)
  basajaun: de5('basajaun', { seg: 3.0, antes: 30,
    prep: () => {
      const J = window.__j, a = J.G.npcs.basajaun; if (!a) throw new Error('sin basajaun'); J.limpia(); J.hacia(a, 6); J.teclas([]);
      J.G.player.obj.visible = false;
      J.dron((t) => { const y = J.suelo(a.pos.x, a.pos.z), h = (a.heading ?? 0) + 0.5 + t * 0.22, d = 4.4; return { pos: [a.pos.x + Math.sin(h) * d, y + 0.9, a.pos.z + Math.cos(h) * d], look: [a.pos.x, y + 2.3, a.pos.z] }; });
    } }),
  // ---------- la almadía por el Esca de Burgui, hacia el puente medieval ----------
  almadia: {
    url: '?town=burgui-burgi&q=high&skipintro=1&weather=clear&t=11', seg: 3.0, antes: 40, limpio: true,
    listo: (p) => p.waitForFunction(() => window.__game?.mode === 'play' && window.__rt?.active, null, { timeout: 600000 }),
    prep: async () => {
      const J = window.__j, G = J.G; J.limpia(); window.__autoWin = true;
      const mod = await import('/src/game/almadia.js'), M = G.missions.find(m => m.type === 'race' && m.m.kind === 'almadia');
      mod.jugarAlmadia(G, M, async () => { });
      for (let i = 0; i < 40 && !G.almadia; i++) { window.__paso(0.05); }
      const A = G.almadia; if (!A) throw new Error('sin almadía');
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
  irati: de5('irati', { seg: 1.05 }),
  danza: de5('danza', { seg: 3.05 }),
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
  // ---------- «Explora 38 pueblos»: cuatro pueblos desde el aire ----------
  olite: pueblo('olite', { a0: 0.05, a1: 0.11 }),
  bardenas: pueblo('bardenas-reales', { hora: 17.6, a0: 0.3, a1: 0.36, r0: 60, r1: 52, y0: 30, y1: 26 }),
  isaba: pueblo('isaba-izaba', { a0: 0.55, a1: 0.61 }),
  puente: pueblo('puente-la-reina', { a0: 0.2, a1: 0.27, r0: 34, r1: 28, y0: 14, y1: 11 }),
  // ---------- el último plano antes del logo: Otsagabia al atardecer ----------
  atardecer: pueblo('otsagabia-ochagavia', { seg: 2.0, hora: 19.3, a0: 0.15, a1: 0.24, r0: 40, r1: 30, y0: 16, y1: 22 }),
  // ---------- debajo del logo: la isla del Pirineo ya arriba, con la cámara girando despacio ----------
  final: { url: '?skipintro=1&q=high', seg: 7.0, antes: 72, espera: 12000, limpio: true, listo: MAPA,
    prep: () => { window.__mapa3d.comarca('pirineo'); } },
};

// el montaje: [segundo del tráiler, toma, desde qué segundo de la toma]; cada corte dura hasta el siguiente
export const CORTES = [
  // la intro (4 compases): la isla, el dron de Otsagabia y la leyenda en el silencio de antes del golpe
  [0, 'isla', 0.35], [b(-2), 'llegada', 0.15], [b(-1), 'leyenda', 0],
  // el golpe: los momotxorros y el caballo
  [b(0), 'momo', 0], [b(1), 'caballo', 0],
  // «Cada vecino te pide ayuda, y cada misión te enseña algo: el pastoreo, el carnaval, las leyendas»
  [b(2), 'maite', 0], [b(3), 'kike', 0], [b(4), 'joxemari', 0], [b(4.5), 'pastoreo', 0], [b(5), 'carnaval', 0], [b(5.5), 'lamia', 0],
  // «¡Oooh! Una personita en mi bosque…» y la almadía
  [b(6), 'basajaun', 0], [b(7), 'almadia', 0],
  // «La naturaleza y la cultura, contadas jugando»
  [b(8), 'bosque', 1.6], [b(8.5), 'irati', 0], [b(9), 'danza', 0],
  // la pelota y «¡Eres un txapeldun, un campeón!»
  [b(10), 'partido', 0], [b(11), 'partido', 2.4], [b(12), 'cere', 0], [b(13), 'cere', 2.0],
  [b(14), 'rio', 0], [b(15), 'isla2', 0],
  // EXPLORA 38 PUEBLOS
  [b(16), 'olite', 0], [b(16.5), 'bardenas', 0], [b(17), 'isaba', 0], [b(17.5), 'puente', 0],
  // DESCUBRE SUS LEYENDAS
  [b(18), 'lamia', 1.2], [b(18.5), 'basajaun', 2.0], [b(19), 'leyenda', 2.1], [b(19.5), 'momo', 2.15],
  // VIVE SUS TRADICIONES
  [b(20), 'carnaval', 1.2], [b(20.5), 'danza', 2.05], [b(21), 'almadia', 2.0], [b(21.5), 'partido', 4.6],
  // los dos últimos y el logo
  [b(22), 'caballo', 2.0], [b(23), 'atardecer', 0], [b(24), 'final', 0],
];
// los rótulos: [desde, hasta, imagen] (v6/rotulos.mjs)
export const ROTULOS = [[b(16) + 0.1, b(18) - 0.12, 'explora'], [b(18) + 0.1, b(20) - 0.12, 'descubre'], [b(20) + 0.1, b(22) - 0.12, 'vive'], [b(24) + 0.35, DURA, 'logo']];
