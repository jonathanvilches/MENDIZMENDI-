// Las tomas nuevas del tráiler v16, todas a 24 imágenes por segundo. El autor, del v15: «estás duplicando muchas escenas
// teniendo un montón de información»; «imágenes limpias ya con todo el entorno creado» (sin los valles que se van formando
// en el vuelo del mapa); «paseos por las calles, con los vecinos andando, las plazas del pueblo»; «que se vean más los
// momotxorros, los joaldunak»; «que el explorador no se choque con nada»; y «toda la identidad visual de los partidos de
// pelota: la selección de pelotari, los campeonatos, cómo están distribuidos… no está expresado en el tráiler».
import { TOMAS as T6 } from '../v6/tomas.mjs';
import { AYUDA } from '../v8/tomas.mjs';
export { AYUDA };

const URL = (town, h = 11.5, w = 'clear') => `?town=${town}&q=high&skipintro=1&weather=${w}&t=${h}`;
const PUEBLO = { fps: 24, antes: 48, espera: 16000, limpio: true };

// ---------- la pelota: el menú de los campeonatos, «Elige tu pelotari», el cuadro del campeonato, el partido y la txapela.
// Todo lo que se carga (el frontón, las cartas, las fotos) se carga antes de parar el reloj, con el reloj de verdad, y lo
// que se graba es solo el movimiento: el anillo que gira, la entrada del cuadro, el partido y la entrega de la txapela ----------
const aPelota = async (p) => {
  await p.waitForFunction(() => window.__hub && document.querySelector('[data-sport="pelota"]'), null, { timeout: 2400000 });
  await p.waitForTimeout(3000);
  await p.evaluate(() => document.querySelector('[data-sport="pelota"]').click());
  await p.waitForFunction(() => document.querySelector('.lg-root:not(.out) .c3-port[data-a]'), null, { timeout: 2400000 });
  await p.waitForTimeout(8000);
};
const titulo = () => (document.querySelector('.lg-root:not(.out) h1, .lg-root:not(.out) h2, .lg-root:not(.out) .pt-titulo')?.textContent || '');
const aElige = async (p) => {
  await aPelota(p);
  await p.evaluate(() => document.querySelector('.lg-root:not(.out) .c3-port[data-a="torneo"]').click());
  await p.waitForFunction(`/Elige tu pelotari/i.test((${titulo})())`, null, { timeout: 1200000 });
  await p.waitForTimeout(8000);
};
const gira = (lado = 'der') => (p) => p.evaluate((l) => document.querySelector(`.lg-root:not(.out) .c3-flecha.${l}`)?.click(), lado);
const UI = { fps: 24, antes: 4, espera: 1500, limpio: false, url: '?screen=sports&q=high' };

export const TOMAS = {
  // el anillo de los campeonatos (Manomanista, Parejas, 4½, Trinquete, Pelotaris…), girando
  pCamp: { ...UI, seg: 3.6, listo: aPelota, guion: [[0.3, gira()], [1.3, gira()], [2.3, gira()]] },
  // «Elige tu pelotari»: las cartas girando y, al final, «Jugar»: entra el cuadro del campeonato con el VS
  pElige: { ...UI, seg: 6.0, listo: aElige,
    guion: [[0.3, gira()], [1.2, gira()], [2.1, gira('izq')], [3.4, (p) => p.evaluate(() => document.querySelector('.lg-root:not(.out) .c3-jugar')?.click())]] },
  // el partido del campeonato (con el marcador, el público y los pelotaris nuevos; la entrega de la txapela en el podio
  // ya no está en el juego: el autor, 28 nov 2026, «elimina la ceremonia»)
  pFinal: { ...UI, seg: 11.0, antes: 2, usa: [[0, 4.4], [4.9, 11.0]],
    listo: async (p) => {
      await aElige(p);
      await p.evaluate(() => document.querySelector('.lg-root:not(.out) .c3-jugar')?.click());
      await p.waitForSelector('.lg-root:not(.out) [data-a="play"]', { timeout: 1200000 }); await p.waitForTimeout(3000);
      await p.evaluate(() => document.querySelector('.lg-root:not(.out) [data-a="play"]').click());
      const g0 = Date.now();
      while (Date.now() - g0 < 2400000) {
        const f = await p.evaluate(() => { const g = window.__game?.pelotaMatch?.game, q = (s) => document.querySelector(s);
          const bt = q('.pel-toss-go') || q('[data-pel-go]') || q('.ep-pant [data-a="ok"]') || q('.lg-root .c3-jugar') || q('.lg-root .lg-btn.go');
          if (!g?.phase || g.phase === 'intro') bt?.click(); return g?.phase || ''; });
        if (/^(serveWait|servePrep|rally)/.test(f)) break; await p.waitForTimeout(1500);
      }
      await p.evaluate(async () => { const M = window.__game.pelotaMatch; M.game.autoplay = true; const h = M.hud; if (h?.teclas) { h.teclas(false); h.teclas = () => {}; } });
      await p.waitForTimeout(8000);
    },
    guion: [] },

  // ---------- los joaldunak de Ituren: la comparsa por las calles (la fiesta de la misión del carnaval, game/townLeyendas.js),
  // de frente, a la altura de los ojos, y desde arriba ----------
  joaldun1: { ...PUEBLO, url: URL('ituren', 11.5), seg: 3.6, antes: 120,
    prep: () => {
      const J = window.__j, G = J.G, P = G.player, L = window.__layout?.PLACES || {}, T = window.__townB?.TOWN || window.__layout?.TOWN || {};
      J.limpia(); P.obj.visible = false; window.__antes = () => { P.obj.visible = false; };
      // (la comparsa solo anda y se ve a menos de 100 m del explorador, que llega por las afueras: él, invisible, en la plaza)
      { const Q = L.plaza || P.pos; P.place(Q.x + 2, Q.z + 2, 0); J.teclas([]); }
      const M = G.missions.find(m => (m.m?.type || m.type) === 'carnival'); G.desfileCarnaval(M, null);
      const D = G.desfileOn, PL = L.plaza || P.pos, ig = T.church?.door || T.church || { x: PL.x + 10, z: PL.z };
      let dx = ig.x - PL.x, dz = ig.z - PL.z; const n = Math.hypot(dx, dz) || 1; dx /= n; dz /= n;
      const cen = () => { let x = 0, z = 0; for (const a of D.gente) { x += a.pos.x; z += a.pos.z; } return { x: x / D.gente.length, z: z / D.gente.length }; };
      let s = null;
      J.dron((t) => { const c = cen(); s = s ? { x: s.x + (c.x - s.x) * 0.15, z: s.z + (c.z - s.z) * 0.15 } : c;
        // (de lado, a 8 m, viéndolos pasar de perfil: de frente, a la altura de los ojos, un poste indicador de la plaza
        // tapaba media imagen)
        const x = s.x - dz * 8 + dx * (1.5 - t * 0.8), z = s.z + dx * 8 + dz * (1.5 - t * 0.8), y0 = J.suelo(s.x, s.z);
        return { pos: [x, Math.max(J.suelo(x, z) + 1.8, y0 + 2.4), z], look: [s.x, y0 + 1.2, s.z] }; });
    } },
  joaldun2: { ...PUEBLO, url: URL('ituren', 11.5), seg: 3.6, antes: 84,
    prep: () => {
      const J = window.__j, G = J.G, P = G.player, L = window.__layout?.PLACES || {}, T = window.__townB?.TOWN || window.__layout?.TOWN || {};
      J.limpia(); P.obj.visible = false; window.__antes = () => { P.obj.visible = false; };
      // (la comparsa solo anda y se ve a menos de 100 m del explorador, que llega por las afueras: él, invisible, en la plaza)
      { const Q = L.plaza || P.pos; P.place(Q.x + 2, Q.z + 2, 0); J.teclas([]); }
      const M = G.missions.find(m => (m.m?.type || m.type) === 'carnival'); G.desfileCarnaval(M, null);
      const D = G.desfileOn, PL = L.plaza || P.pos, ig = T.church?.door || T.church || { x: PL.x + 10, z: PL.z };
      let dx = ig.x - PL.x, dz = ig.z - PL.z; const n = Math.hypot(dx, dz) || 1; dx /= n; dz /= n;
      const cen = () => { let x = 0, z = 0; for (const a of D.gente) { x += a.pos.x; z += a.pos.z; } return { x: x / D.gente.length, z: z / D.gente.length }; };
      let s = null;
      J.dron((t) => { const c = cen(); s = s ? { x: s.x + (c.x - s.x) * 0.15, z: s.z + (c.z - s.z) * 0.15 } : c;
        const lado = -4 + t * 2.2, x = s.x - dx * 8 - dz * lado, z = s.z - dz * 8 + dx * lado, y0 = J.suelo(s.x, s.z);
        return { pos: [x, y0 + 8.5 - t * 0.6, z], look: [s.x + dx * 3, y0 + 0.8, s.z + dz * 3] }; });
    } },

  // ---------- los momotxorros de Altsasu, más cerca: la cámara baja, entre la manada que baila alrededor del kiosco ----------
  momoCerca: { ...T6.momo, fps: 24, antes: 168, seg: 3.6, espera: 16000,
    prep: () => {
      const J = window.__j, G = J.G, P = G.player; J.limpia(); const PL = window.__layout.PLACES.plaza;
      P.place(PL.x + 3, PL.z + 3, 0); P.obj.visible = true; J.teclas([]);
      G.manadaMomotxorros();
      const T = window.__townB?.TOWN || {}, k = (T.landmarks || []).find(l => l.kind === 'kiosk' || l.kind === 'nogal'), C = k ? { x: k.x, z: k.z } : { x: PL.x, z: PL.z };
      const menosRojo = () => { const T = G.tinte, D = G.desfileOn; if (T && !T.__m) { T.__m = 1; T.k *= 0.4; T.parpadeo *= 0.4; } if (D?.velo) D.velo.style.opacity = (D.k * 0.4).toFixed(2); };
      window.__antes = menosRojo;
      J.dron((t) => { menosRojo(); const y0 = J.suelo(C.x, C.z), a = 2.7 + t * 0.2, r = 7.6 - t * 0.25;
        return { pos: [C.x + Math.cos(a) * r, y0 + 2.3, C.z + Math.sin(a) * r], look: [C.x, y0 + 1.3, C.z] }; });
    } },

  // ---------- paseos por las calles con los vecinos y las plazas ----------
  // Otsagabia: el explorador anda (no corre) por una calle hacia la plaza, por un camino libre (nadie delante ni nada con
  // lo que chocar), con los vecinos paseando alrededor; la cámara detrás, al otro lado y algo más alta que la del corredor
  paseoOts: { ...PUEBLO, url: URL('otsagabia-ochagavia', 10.6), seg: 3.6,
    prep: () => { const J = window.__j, L = window.__layout?.PLACES || {}; J.limpia();
      J.corre(L.plaza, 30, { anda: true, solo: true, snap: true, margen: 6 });
      J.pegada(() => ({ f: -4.0, s: -1.5, y: 2.1, lf: 8, ly: 1.2 })); } },
  // (en Otsagabia el camino libre hacia la plaza pasaba por el mismo puente que la entrada y el corredor: otra vez la misma
  // escena; el paseo, por la calle de Viana, con su gente)
  paseoViana: { ...PUEBLO, url: URL('viana', 10.8), seg: 3.6,
    prep: () => { const J = window.__j, L = window.__layout?.PLACES || {}; J.limpia();
      J.corre(L.plaza, 32, { anda: true, solo: true, snap: true, margen: 6 });
      J.pegada(() => ({ f: -4.0, s: -1.5, y: 2.1, lf: 8, ly: 1.2 })); } },
  // la plaza de Otsagabia con su gente: el dron gira despacio por encima mientras el explorador la cruza andando
  plazaOts: { ...PUEBLO, url: URL('otsagabia-ochagavia', 12.2), seg: 3.6,
    prep: () => { const J = window.__j, L = window.__layout?.PLACES || {}, PL = L.plaza; J.limpia();
      J.corre(PL, 13, { anda: true, solo: true, snap: true, margen: 2 });
      const R = Math.min(12, (PL.r || 14) * 0.8);
      J.orbita({ x: PL.x, z: PL.z }, { seg: 3.6, a0: 0.6, a1: 1.15, r0: R, r1: R * 0.85, y0: 6.5, y1: 5, mira: 1.2 }); } },
  // la Plaza del Castillo de Pamplona, con el kiosco y la gente
  plazaPamplona: { ...PUEBLO, url: URL('pamplona', 12.4), seg: 3.6,
    prep: () => { const J = window.__j, G = J.G, P = G.player, L = window.__layout?.PLACES || {}, T = window.__townB?.TOWN || {};
      J.limpia(); P.obj.visible = false; window.__antes = () => { P.obj.visible = false; };
      const k = (T.landmarks || []).find(l => l.kind === 'kiosk'), C = k ? { x: k.x, z: k.z } : { x: L.plaza.x, z: L.plaza.z };
      J.orbita(C, { seg: 3.6, a0: 3.4, a1: 3.95, r0: 17, r1: 14, y0: 7.5, y1: 5.5, mira: 2.2 }); } },
  // el castillo de Olite, en dron
  oliteDron: { ...PUEBLO, url: URL('olite', 11.0), seg: 3.6,
    prep: () => { const J = window.__j, P = J.G.player; J.limpia(); P.obj.visible = false; window.__antes = () => { P.obj.visible = false; };
      J.orbita(J.centro(), { seg: 3.6, a0: 0.1, a1: 0.95, r0: 38, r1: 28, y0: 15, y1: 10, mira: 7 }); } },
};
