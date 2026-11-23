// Las tomas del tráiler v11 (23 nov 2026). El autor, del v10: «Prefiero que el tráiler dure más, pero que se vean
// realmente y que cuente la historia del explorador. Llega a Navarra y debe cumplir diferentes misiones, pero que se vea el
// juego como tal. Imágenes y pantallas reales del juego, de conversaciones, de ejecución de misiones, de la mochila, de la
// compra de productos locales, de la explicación de la elaboración de un producto local, de animales, de tractores, de
// agricultura […]. Que se vea realmente cómo funciona el juego, cómo se juega.»
// · Todas con la interfaz del juego a la vista (sin «limpio»): el marcador, el minimapa, la barra de misiones, las charlas,
//   las tarjetas, la tienda, la mochila, el visor de láminas y el juego de ordenar los pasos.
// · El explorador vestido de San Fermín (16 s de espera antes de grabar, con el pueblo ya entero: YO).
// · Lo que se mueve (correr, el rebaño, el tractor, la pelota, la danza), a 24 por segundo; las charlas y las pantallas, a
//   12 (el montaje repite cada imagen, sin inventar las de en medio: las inventadas eran los parpadeos del v7).
// Se ruedan con la grabadora del v5: TOMAS=tools/trailer/v11/tomas.mjs node tools/trailer/v5/juego.mjs <tomas> <carpeta>
import { AYUDA as AYUDA8, TOMAS as T8 } from '../v8/tomas.mjs';
import { TOMAS as T5 } from '../v5/tomas.mjs';
// (las ayudas del v8, pero con la flecha amarilla y el haz del objetivo a la vista: en el v6 se quitaron por ser interfaz,
// y aquí la interfaz es lo que se quiere enseñar; el v6 les puso un «update» propio que las escondía, y sin él vuelve el
// del juego)
const FLECHA = () => { const B = window.__rt?.beacon; if (B && Object.prototype.hasOwnProperty.call(B, 'update')) delete B.update; };
export const AYUDA = new Function(`(${AYUDA8.toString()})(); (${FLECHA.toString()})();`);
// la cámara que sigue a un vehículo desde un lado (la del v8): f delante (−, detrás), s al lado, y de alto; con el marcador
// del juego a la vista (el dron lo esconde y aquí se vuelve a poner)
const sigue = (o) => `(V) => { J.dron((t) => {
  const h = V.heading, fx = Math.sin(h), fz = Math.cos(h), sx = fz, sz = -fx, x0 = V.x, z0 = V.z;
  const f = ${o.f0} + t * ${o.fv}, s = ${o.s0} + t * ${o.sv}, x = x0 + fx * f + sx * s, z = z0 + fz * f + sz * s, y0 = J.suelo(x0, z0);
  return { pos: [x, Math.max(J.suelo(x, z) + ${o.ymin ?? 1.9}, y0 + ${o.y}), z], look: [x0 + fx * ${o.lf ?? 1.5}, y0 + ${o.ly ?? 1.1}, z0 + fz * ${o.lf ?? 1.5}] };
}); J.G.ui.hudVisible?.(true); }`;

const YO = { espera: 16000 };
const OT = 'town=otsagabia-ochagavia&q=high&skipintro=1';
const URL = (town, h = 11.5, extra = '') => `?town=${town}&q=high&skipintro=1&weather=clear&t=${h}${extra}`;
const MAPA = (p) => p.waitForFunction(() => window.__mapa3d?.ren && window.__mapa3d.calentado?.(), null, { timeout: 300000 }).catch(() => { });
// (las de 12 por segundo, con sus pasos de antes; las de 24, con el doble, que van de 1/24 s)
const A12 = (t, o = {}) => ({ ...YO, ...t, fps: 12, ...o });
const A24 = (t, o = {}) => ({ ...YO, ...t, fps: 24, antes: (t.antes ?? 24) * 2, ...o });
const tecla = (k) => (p) => p.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), k);
const clic = (sel) => (p) => p.evaluate((s) => document.querySelector(s)?.click(), sel);
// (el visor de láminas sin la ayuda de «toca para acercarte», y mudo: la voz del narrador va en la mezcla; con el audio de
// la página que no acaba nunca, cada paso se queda con su subtítulo hasta el siguiente, como en el v5)
const MUDO = `const st = document.createElement('style'); st.textContent = '.lt-ayuda{display:none!important}'; document.head.appendChild(st); window.Audio = function () { return { play: () => Promise.resolve(), pause() {}, volume: 1, addEventListener() {}, removeEventListener() {} }; };`;

export const TOMAS = {
  // ---------- 1 · LA LLEGADA: el mapa de Navarra, el Pirineo que sube y el explorador que entra en Otsagabia ----------
  // el mapa del inicio tal cual se ve al jugar (la barra de arriba, las comarcas abajo): se elige el Pirineo y sube
  mapa: { ...YO, url: '?skipintro=1&q=high', seg: 6.5, fps: 24, antes: 16, espera: 12000, listo: MAPA,
    guion: [[1.4, (p) => p.evaluate(() => window.__mapa3d.comarca('pirineo'))]] },
  // y se elige Otsagabia: el dron del mapa vuela hasta el pueblo
  vuelo: { ...YO, url: '?skipintro=1&q=high', seg: 6.5, fps: 24, antes: 16, espera: 12000, listo: MAPA,
    guion: [[0.2, (p) => p.evaluate(() => window.__mapa3d.ir('otsagabia-ochagavia'))]] },
  // corre por la calle hacia la plaza, con la cámara del juego detrás y todo el marcador
  llega: A24({ url: `?${OT}&weather=clear&t=10.4`, seg: 4.5, antes: 30,
    prep: () => { const J = window.__j; J.limpia(); J.corre(window.__layout?.PLACES?.plaza, 34, { solo: true, snap: true, margen: 6 }); } }),

  // ---------- 2 · LOS VECINOS: Maite le pide ayuda (las ocho cintas), el cuaderno, Joxemari y su rebaño ----------
  maite: A12(T5.maite, { seg: 18.2, usa: [[0.3, 17.1]], tapa: '.mg-overlay' }),
  cuaderno: A12(T5.cuaderno, { seg: 3.0 }),
  joxemari: A12({ url: `?${OT}&weather=clear&t=9.6`, seg: 10.4, antes: 30,
    prep: () => {
      // (de cara a Joxemari: desde detrás del explorador, él le tapaba; J.cara pone la cámara donde tendría la cabeza el
      // explorador, un poco a un lado, y se vuelve a poner el marcador, que el dron esconde)
      const J = window.__j, a = J.G.npcs?.joxemari; if (!a) throw new Error('sin joxemari'); J.limpia(); a.frozen = true; a.state = 'idle'; J.hacia(a, 2.4); J.teclas([]);
      J.cara(a, { d: 2.5, s: 0.7 }); J.G.ui.hudVisible?.(true);
      J.charla(a, { habla: 0.1, para: 9, pasa: [5.5], frases: ['Egun on, gazte. Soy Joxemari, el pastor. Este es mi perro, Txuri.', '¡Qué desastre! Seis de mis ovejas latxas se han escapado del redil y andan desperdigadas por el monte.'] });
    } }),
  pastoreo: A24(T5.pastoreo, { seg: 5.5 }),

  // ---------- 3 · LOS PRODUCTOS: en Isaba, el queso Roncal de la quesera Arantxa, la tienda y la mochila ----------
  // la charla de la misión, como al llegar a ella: lo que te cuenta y la tarjeta de «¿Qué es?»
  arantxa: A12({ url: URL('isaba-izaba', 11.2), seg: 9.0, antes: 30, usa: [[0, 7.7]], tapa: '.mg-overlay',
    prep: () => {
      const J = window.__j, G = J.G; J.limpia();
      const M = (G.missions || []).find(m => m.m?.id === 'roncal'), a = M?.host; if (!a) throw new Error('sin arantxa');
      a.cancelPath?.(); a.goal = null; a.path = []; a.target = null; a.state = 'idle'; a.frozen = true;
      M.step = 0; J.hacia(a, 2.6); J.teclas([]); G.player.frozen = true; a.say?.(60);
      G.player.heading = Math.atan2(a.pos.x - G.player.pos.x, a.pos.z - G.player.pos.z);
      window.__antes = () => { };
      G.dialog(M, a);
    },
    guion: [[3.6, tecla('e')], [7.4, clic('.ix-foot button.btn')]] }),
  // y luego, con la leche ya recogida: «Ahora hagamos el queso paso a paso», la tarjeta de cómo se hace, la lámina que se
  // mueve con dos pasos, el juego de ordenar los pasos y «¡Misión cumplida!» (todo como en el juego, una cosa detrás de otra;
  // sin la tarjeta de «Antes y ahora», que alarga sin enseñar nada nuevo)
  roncal: A12({ url: URL('isaba-izaba', 11.2), seg: 27.0, antes: 30, usa: [[0.7, 5.5], [6.3, 16.8], [18.3, 22.3], [23.6, 27.0]], tapa: '.lt-ov, .mg-overlay',
    prep: eval(`() => {
      const J = window.__j, G = J.G; J.limpia(); ${MUDO}
      const M = (G.missions || []).find(m => m.m?.id === 'roncal'), a = M?.host; if (!a) throw new Error('sin arantxa');
      a.cancelPath?.(); a.goal = null; a.path = []; a.target = null; a.state = 'idle'; a.frozen = true;
      M.state = 'active'; M.count = M.need; M.step = 2; J.hacia(a, 2.6); J.teclas([]); G.player.frozen = true; a.say?.(60);
      G.player.heading = Math.atan2(a.pos.x - G.player.pos.x, a.pos.z - G.player.pos.z);
      const ex = G.explain.bind(G); G.explain = (X, t, part, ...r) => part === 'then' ? Promise.resolve() : ex(X, t, part, ...r);
      G.dialog(M, a);
    }`),
    guion: [
      [2.4, tecla('e')],                                   // «Cómo se hace»
      [5.6, clic('.ix-foot button.btn')],                  // «Verlo paso a paso»: la lámina
      [6.6, clic('.lt-pasos button[data-i="2"]')], [11.4, clic('.lt-pasos button[data-i="6"]')],
      [16.8, clic('.lt-sigue')],                           // «¡Vamos!»: «Ordena los pasos»
      [18.3, tecla('e')],                                  // el juego de ordenar
      [19.2, clic('.mg-overlay .opt[data-i="0"]')], [19.8, clic('.mg-overlay .opt[data-i="1"]')], [20.4, clic('.mg-overlay .opt[data-i="2"]')], [21.0, clic('.mg-overlay .opt[data-i="3"]')],
      [23.6, tecla('e')],                                  // «¡Así se hace…!» y la misión cumplida
    ] }),
  // la tienda del pueblo: el producto estrella (el queso Roncal), comprarlo con los txanponak y la pestaña de comprar
  tienda: A12({ url: URL('isaba-izaba', 11.6), seg: 7.0, antes: 30, usa: [[0.2, 7.0]], tapa: '.mg-overlay',
    prep: () => {
      const J = window.__j, G = J.G; J.limpia(); const T = G.tienda; if (!T) throw new Error('sin tienda');
      const I = T.interactable(), h = T.ry + Math.PI; G.player.place(I.x + Math.sin(T.ry) * 1.6, I.z + Math.cos(T.ry) * 1.6, h); G.player.obj.visible = true;
      J.rt.follow.yaw = h + Math.PI; J.rt.follow.snap?.(G.player); G.P.coins = 26;
    },
    guion: [[0.3, (p) => p.evaluate(() => { window.__game.tienda.open(); })], [3.0, clic('.mg-overlay.shop .shop-star [data-buy]')], [5.0, clic('.mg-overlay.shop [data-tab="buy"]')]] }),
  // la mochila: el agua, la comida comprada y ganada, el equipo del explorador
  mochila: A12({ url: URL('isaba-izaba', 11.6), seg: 4.0, antes: 30, usa: [[0.4, 4.0]], tapa: '.mg-overlay',
    prep: () => {
      const J = window.__j, G = J.G, P = G.P; J.limpia(); J.corre(null, 12, { anda: true }); J.teclas([]);
      for (const g of ['mochila', 'cantimplora', 'prismaticos', 'cuaderno', 'brujula']) if (!P.gear.includes(g)) P.gear.push(g);
      P.bag.agua = 3; for (const [k, n] of [['queso', 2], ['pan', 1], ['manzana', 3], ['txistorra', 1], ['cuajada', 1]]) P.bag.food[k] = n;
    },
    guion: [[0.3, (p) => p.evaluate(() => { window.__game.mochila.open(); })]] }),

  // ---------- 4 · EL CAMPO: la vendimia con el tractor y la cosechadora en el trigo, con la cámara del juego ----------
  // (en Estella, el piquillo: el campo con sus matas y los temporeros cogiendo; desde detrás, en la vendimia de Viana solo se
  // veía tierra)
  tractor: A24({ url: URL('estella', 11.5), seg: 5.0, antes: 75,
    prep: eval(`() => {
      const J = window.__j, G = J.G, P = G.player; J.limpia();
      const M = (G.missions || []).find(m => m.type === 'harvest' && m.m.crop === 'piquillo'); if (!M) throw new Error('sin cosecha');
      G.startCosecha(M); const C = M.cos; if (!C?.trac) throw new Error('sin tractor');
      const V = C.trac; P.place(V.x, V.z, V.heading); V.sube(P); J.teclas([]);
      let k = 0; window.__antes = () => { if (++k === 120) J.teclas(['w']); };
      (${sigue({ f0: 6, fv: -1.4, s0: -6.5, sv: 0.5, y: 2.2, lf: 0, ly: 1.2 })})(V);
    }`) }),
  cosechadora: A24({ url: URL('artajona', 11.5), seg: 4.5, antes: 30,
    prep: eval(`() => {
      const J = window.__j, G = J.G, P = G.player; J.limpia();
      const M = (G.missions || []).find(m => m.type === 'harvest' && m.m.crop === 'trigo'); if (!M) throw new Error('sin trigo');
      G.startCosecha(M); const C = M.cos; if (!C?.cos) throw new Error('sin cosechadora');
      const ca = Math.cos(C.campo.ang), sa = Math.sin(C.campo.ang), cols = {};
      for (const k of C.celdas) { const dx = k.x - C.campo.x, dz = k.z - C.campo.z, u = Math.round((dx * ca + dz * sa) / 4.6), v = -dx * sa + dz * ca; (cols[u] ||= []).push(v); }
      const [uc, vs] = Object.entries(cols).sort((p, q) => q[1].length - p[1].length)[0], p0 = C.enCampo(+uc * 4.6, Math.min(...vs) - 8);
      const V = C.cos; V.x = p0.x; V.z = p0.z; V.heading = Math.atan2(-sa, ca); V.place(0);
      P.place(V.x, V.z, V.heading); V.sube(P); J.teclas(['w']);
      (${sigue({ f0: 7, fv: -2.2, s0: 12, sv: -1.4, y: 8.5, lf: 1, ly: 1.2 })})(V);
    }`) }),

  // ---------- 5 · LAS TRADICIONES Y EL FINAL: la pelota, el Bobo con las ocho cintas y la danza de Muskilda ----------
  pelota: { ...T8.pelota, limpio: false, seg: 5.0 },
  bobo: A12(T5.bobo, { seg: 4.2 }),
  danza: A24(T5.danza, { seg: 10.2 }),
  // el logo: el mapa del juego (sin interfaz) que se va a negro
  final: { ...T8.final },
};

// ---------- el montaje (v11/montaje.mjs) y el sonido (v11/mezcla-v11.py) ----------
// La música: la del juego en los pueblos (musica-juego) mientras se cuenta la historia y, en «Trabaja el campo», la épica
// del autor (musica-torneos) con su golpe en el primer plano del campo; 8 compases después, un empalme a su compás 24
// (los dos, principio de frase) para que su final de verdad, el compás 32, caiga en el logo.
export const BEAT = 0.4737, BAR = BEAT * 4, DROP = 22.98;
const C = 1.7;                                   // (lo que dura un capítulo: el rótulo sobre negro)
export const T_GOLPE = 98.3;                     // (el golpe de la épica: el tractor)
export const T_LOGO = T_GOLPE + 16 * BAR;        // (su compás 32 tras el empalme: el logo)
export const DURA = T_LOGO + 5.6;
// [segundo del tráiler, toma, desde qué segundo de la toma, velocidad]; cada corte dura hasta el siguiente. Las que
// empiezan por «#» son los capítulos: negro con su rótulo (v11/rotulos.mjs)
export const CORTES = [
  // 1 · UN EXPLORADOR LLEGA A NAVARRA: el mapa, se elige el Pirineo y sube; el dron hasta Otsagabia; corre por la calle
  [0, '#c1'], [C, 'mapa', 0.2], [7.9, 'vOts', 0.4], [13.9, 'llega', 0],
  // 2 · LOS VECINOS TE PIDEN AYUDA: Maite (las ocho cintas, la cinta roja), el cuaderno, Joxemari y su rebaño
  [18.4, '#c2'], [18.4 + C, 'maite', 0.4], [36.7, 'cuaderno', 0], [39.5, 'joxemari', 0], [49.7, 'pastoreo', 0],
  // 3 · EN CADA PUEBLO, UNA MISIÓN: el queso Roncal en Isaba (la charla, cómo se hace, la lámina con el narrador, ordenar
  // los pasos, misión cumplida), la tienda y la mochila
  [55.2, '#c3'], [55.2 + C, 'arantxa', 0], [64.5, 'roncal', 0.8], [69.1, 'roncal', 6.4], [79.4, 'roncal', 18.4], [83.2, 'roncal', 23.7],
  [86.4, 'tienda', 0.3], [93.1, 'mochila', 0.5],
  // 4 · TRABAJA EL CAMPO: el tractor de la vendimia y la cosechadora (el golpe de la música)
  [T_GOLPE - C, '#c4'], [T_GOLPE, 'tractor', 0], [T_GOLPE + 5.0, 'cosechadora', 0],
  // 5 · VIVE SUS TRADICIONES: la pelota, el Bobo con las ocho cintas y la danza de Muskilda; el logo
  [T_GOLPE + 9.5, '#c5'], [T_GOLPE + 9.5 + C, 'pelota', 0], [T_GOLPE + 16.2, 'bobo', 0], [T_GOLPE + 20.4, 'danza', 0],
  [T_LOGO, 'final', 0],
];
export const ROTULOS = [['c1', 0, C], ['c2', 18.4, 18.4 + C], ['c3', 55.2, 55.2 + C], ['c4', T_GOLPE - C, T_GOLPE], ['c5', T_GOLPE + 9.5, T_GOLPE + 9.5 + C], ['logo', T_LOGO + 0.35, DURA]];
// las voces, ya grabadas (las de Otsagabia, las de Salva y las del narrador de las láminas): [archivo, segundo, desde, hasta]
export const VOCES = [
  ['v3:salva-tierra.mp3', 2.0, 0, 99],                       // Hay una tierra donde cada pueblo guarda una historia
  ['ot:narra-01.mp3', 13.6, 0, 99],                          // Desde aquí ves Otsagabia entera…
  ['ot:maite-00.mp3', 18.4 + C + 1.05, 0, 3.6],              // ¡Kaixo! Soy Maite. ¡Ongi etorri a Otsagabia!
  ['ot:maite-02.mp3', 18.4 + C + 4.5, 0, 99],                // Mañana es la fiesta de Muskilda… ¡pero se han perdido por todo el valle!
  ['ot:maite-06.mp3', 18.4 + C + 13.2, 0, 2.62],             // Aquí tienes la primera cinta, la roja.
  ['v3:salva-vecinos.mp3', 36.9, 0, 3.76],                   // Cada vecino te pide ayuda, y cada misión te enseña algo
  ['ot:joxemari-00.mp3', 39.5 + 0.15, 0, 99],                // Egun on, gazte. Soy Joxemari, el pastor. Este es mi perro, Txuri.
  ['ot:joxemari-01.mp3', 39.5 + 5.6, 0, 99],                 // ¡Qué desastre! Seis de mis ovejas latxas se han escapado…
  ['lam:queso-2.mp3', 69.1 + 0.2, 0, 99],                    // (el narrador de la lámina del queso: dos pasos)
  ['lam:queso-6.mp3', 69.1 + 5.0, 0, 99],
  ['v3:salva-naturaleza.mp3', T_GOLPE + 0.6, 0, 99],          // La naturaleza y la cultura, contadas jugando
  ['ot:bobo-02.mp3', T_GOLPE + 16.2 + 0.1, 0, 99],            // ¡Las ocho cintas! ¡Los danzantes ya pueden ponerse sus trajes!
  ['v3:salva-herrizherri.mp3', T_LOGO + 0.35, 0, 99],
  ['v3:salva-navarra.mp3', T_LOGO + 1.75, 0, 99],            // Navarra, pueblo a pueblo
];
// los sonidos de la interfaz y de lo que se ve: [archivo, segundo, volumen, desde, cuánto]
export const EFECTOS = [
  ['ui-carta.mp3', 18.4 + C + 13.05, 0.5],                   // la tarjeta de la cinta roja
  ['ui-abre.mp3', 36.7 + 0.05, 0.4],                         // el cuaderno
  ['cencerro-2.mp3', 49.7, 0.3, 0, 5.5], ['ambiente-ovejas.mp3', 49.7, 0.35, 0, 5.5],
  ['ui-carta.mp3', 55.2 + C + 3.7, 0.4],                     // «¿Qué es?»
  ['ui-carta.mp3', 64.5 + 1.6, 0.4],                         // «Cómo se hace»
  ['ui-click.mp3', 79.4 + 0.8, 0.5], ['ui-moneda.mp3', 79.4 + 0.85, 0.35], ['ui-moneda.mp3', 79.4 + 1.45, 0.35], ['ui-moneda.mp3', 79.4 + 2.05, 0.35], ['ui-moneda.mp3', 79.4 + 2.65, 0.35],
  ['ui-fanfarria.mp3', 83.2 + 0.05, 0.5],                    // ¡Misión cumplida!
  ['ui-abre.mp3', 86.4 + 0.05, 0.4], ['ui-moneda.mp3', 86.4 + 2.7, 0.5],   // la tienda: comprar el queso
  ['ui-abre.mp3', 93.1 + 0.0, 0.4],                          // la mochila
  ['publico-grada.mp3', T_GOLPE + 9.5 + C, 0.3, 3.0, 5.0],
];
